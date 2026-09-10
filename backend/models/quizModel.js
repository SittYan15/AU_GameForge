// backend/models/quizModel.js

import pool from "../config/db.js";
import { readFile } from "node:fs/promises";

function getIdentity(player) {
    if (player?.accountType === "user" && Number.isSafeInteger(player.userId)) {
        return {
            accountType: "user",
            accountId: player.userId
        };
    }

    if (player?.accountType === "guest" && Number.isSafeInteger(player.guestId)) {
        return {
            accountType: "guest",
            accountId: player.guestId
        };
    }

    return null;
}

export async function saveCampusQuizResult(
    player,
    {
        score,
        correctCount,
        durationMs
    },
    executor = pool
) {
    const identity = getIdentity(player);

    if (!identity) return null;

    const result = await executor.query(
        `INSERT INTO campus_quiz_scores (
            account_type,
            account_id,
            player_name,
            best_score,
            best_correct,
            best_duration_ms,
            games_played,
            total_correct
         )
         VALUES ($1, $2, $3, $4, $5, $6, 1, $5)
         ON CONFLICT (account_type, account_id)
         DO UPDATE SET
            player_name = EXCLUDED.player_name,
            games_played = campus_quiz_scores.games_played + 1,
            total_correct = campus_quiz_scores.total_correct + EXCLUDED.total_correct,
            best_correct = CASE
                WHEN EXCLUDED.best_score > campus_quiz_scores.best_score
                    THEN EXCLUDED.best_correct
                WHEN EXCLUDED.best_score = campus_quiz_scores.best_score
                     AND EXCLUDED.best_correct > campus_quiz_scores.best_correct
                    THEN EXCLUDED.best_correct
                ELSE campus_quiz_scores.best_correct
            END,
            best_duration_ms = CASE
                WHEN EXCLUDED.best_score > campus_quiz_scores.best_score
                    THEN EXCLUDED.best_duration_ms
                WHEN EXCLUDED.best_score = campus_quiz_scores.best_score
                     AND EXCLUDED.best_correct > campus_quiz_scores.best_correct
                    THEN EXCLUDED.best_duration_ms
                WHEN EXCLUDED.best_score = campus_quiz_scores.best_score
                     AND EXCLUDED.best_correct = campus_quiz_scores.best_correct
                    THEN LEAST(campus_quiz_scores.best_duration_ms, EXCLUDED.best_duration_ms)
                ELSE campus_quiz_scores.best_duration_ms
            END,
            best_score = GREATEST(campus_quiz_scores.best_score, EXCLUDED.best_score),
            updated_at = CURRENT_TIMESTAMP
         RETURNING
            account_type,
            account_id,
            player_name,
            best_score,
            best_correct,
            best_duration_ms,
            games_played,
            total_correct,
            updated_at`,
        [
            identity.accountType,
            identity.accountId,
            player.playerName,
            score,
            correctCount,
            durationMs
        ]
    );

    return result.rows[0] ?? null;
}

// Applied on backend startup as well as included in schema.sql for new installs.
export async function initializeCampusQuizAwards() {
    const sql = await readFile(new URL("../migrations/008_campus_quiz_awards.sql", import.meta.url), "utf8");
    await pool.query(sql);
}

export async function awardCampusQuizResult(player, { roundKey, score, correctCount, durationMs }) {
    const identity = getIdentity(player);
    if (!identity || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(roundKey ?? "") ||
        !Number.isInteger(score) || score < 0 || score > 100 ||
        !Number.isInteger(correctCount) || correctCount < 0 || correctCount > 15 ||
        !Number.isSafeInteger(durationMs) || durationMs < 1) {
        throw new Error("Invalid Campus Quiz result.");
    }

    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        let accountType = identity.accountType;
        let accountId = identity.accountId;
        // Lock the guest row just as account conversion does. Credit either the
        // unconverted guest or the destination user, never an abandoned guest.
        if (accountType === "guest") {
            const guest = await client.query(
                "SELECT converted_to_user_id FROM guest_users WHERE id = $1 FOR UPDATE", [accountId]
            );
            if (!guest.rows[0]) throw new Error("Quiz guest account no longer exists.");
            if (guest.rows[0].converted_to_user_id) {
                accountType = "user";
                accountId = guest.rows[0].converted_to_user_id;
            }
        }

        const claim = await client.query(
            `INSERT INTO campus_quiz_awards (round_key, account_type, account_id, score, correct_count)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (round_key, account_type, account_id) DO NOTHING
             RETURNING score`,
            [roundKey, identity.accountType, identity.accountId, score, correctCount]
        );
        // Table choice is server-derived, never client-supplied.
        const table = accountType === "user" ? "users" : "guest_users";
        let account;
        if (claim.rowCount === 1) {
            account = await client.query(
                `UPDATE ${table} SET points = points + $1, updated_at = CURRENT_TIMESTAMP
                 WHERE id = $2 RETURNING points`, [score, accountId]
            );
            if (!account.rows[0]) throw new Error("Quiz account no longer exists.");
            await saveCampusQuizResult({
                ...player, accountType, userId: accountId, guestId: accountId
            }, { score, correctCount, durationMs }, client);
        } else {
            account = await client.query(`SELECT points FROM ${table} WHERE id = $1`, [accountId]);
        }
        await client.query("COMMIT");
        return { awarded: claim.rowCount === 1, totalPoints: account.rows[0]?.points ?? null };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

export async function getCampusQuizLeaderboard(limit = 10) {
    const safeLimit = Math.max(1, Math.min(25, Number(limit) || 10));

    const result = await pool.query(
        `SELECT
            player_name,
            best_score,
            best_correct,
            best_duration_ms,
            games_played
         FROM campus_quiz_scores
         WHERE best_score > 0
         ORDER BY
            best_score DESC,
            best_correct DESC,
            best_duration_ms ASC,
            updated_at ASC
         LIMIT $1`,
        [safeLimit]
    );

    return result.rows.map((row, index) => ({
        rank: index + 1,
        playerName: row.player_name,
        bestScore: row.best_score,
        bestCorrect: row.best_correct,
        bestDurationMs: row.best_duration_ms,
        gamesPlayed: row.games_played
    }));
}

export async function transferCampusQuizGuestProgress(
    guestId,
    userId,
    playerName
) {
    if (!Number.isSafeInteger(guestId) || !Number.isSafeInteger(userId)) return;

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        await client.query(
            `INSERT INTO campus_quiz_scores (
                account_type,
                account_id,
                player_name,
                best_score,
                best_correct,
                best_duration_ms,
                games_played,
                total_correct,
                updated_at
             )
             SELECT
                'user',
                $1,
                $3,
                best_score,
                best_correct,
                best_duration_ms,
                games_played,
                total_correct,
                CURRENT_TIMESTAMP
             FROM campus_quiz_scores
             WHERE account_type = 'guest'
               AND account_id = $2
             ON CONFLICT (account_type, account_id)
             DO UPDATE SET
                player_name = EXCLUDED.player_name,
                games_played = campus_quiz_scores.games_played + EXCLUDED.games_played,
                total_correct = campus_quiz_scores.total_correct + EXCLUDED.total_correct,
                best_correct = CASE
                    WHEN EXCLUDED.best_score > campus_quiz_scores.best_score
                        THEN EXCLUDED.best_correct
                    WHEN EXCLUDED.best_score = campus_quiz_scores.best_score
                         AND EXCLUDED.best_correct > campus_quiz_scores.best_correct
                        THEN EXCLUDED.best_correct
                    ELSE campus_quiz_scores.best_correct
                END,
                best_duration_ms = CASE
                    WHEN EXCLUDED.best_score > campus_quiz_scores.best_score
                        THEN EXCLUDED.best_duration_ms
                    WHEN EXCLUDED.best_score = campus_quiz_scores.best_score
                         AND EXCLUDED.best_correct > campus_quiz_scores.best_correct
                        THEN EXCLUDED.best_duration_ms
                    WHEN EXCLUDED.best_score = campus_quiz_scores.best_score
                         AND EXCLUDED.best_correct = campus_quiz_scores.best_correct
                        THEN LEAST(campus_quiz_scores.best_duration_ms, EXCLUDED.best_duration_ms)
                    ELSE campus_quiz_scores.best_duration_ms
                END,
                best_score = GREATEST(campus_quiz_scores.best_score, EXCLUDED.best_score),
                updated_at = CURRENT_TIMESTAMP`,
            [userId, guestId, playerName]
        );

        await client.query(
            `DELETE FROM campus_quiz_scores
             WHERE account_type = 'guest'
               AND account_id = $1`,
            [guestId]
        );

        await client.query("COMMIT");
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}
