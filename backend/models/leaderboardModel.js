import pool from "../config/db.js";

const DEFAULT_LEADERBOARD_LIMIT = 5;
const MAX_LEADERBOARD_LIMIT = 10;

export async function getTopPlayers(limit = DEFAULT_LEADERBOARD_LIMIT) {
    const safeLimit = Number.isSafeInteger(limit)
        ? Math.min(Math.max(limit, 1), MAX_LEADERBOARD_LIMIT)
        : DEFAULT_LEADERBOARD_LIMIT;

    const result = await pool.query(
        `SELECT account_type AS "accountType",
                player_name AS "playerName",
                points
         FROM (
             SELECT
                 'user'::text AS account_type,
                 player_name,
                 points
             FROM users

             UNION ALL

             SELECT
                 'guest'::text AS account_type,
                 player_name,
                 points
             FROM guest_users
             WHERE converted_to_user_id IS NULL
         ) AS leaderboard
         WHERE points > 0
         ORDER BY points DESC, LOWER(player_name) ASC
         LIMIT $1`,
        [safeLimit]
    );

    return result.rows;
}