// backend/models/explorationModel.js
import pool from "../config/db.js";

function identity(player) {
    if (player.accountType === "user" && Number.isSafeInteger(player.userId)) return { type: "user", id: player.userId };
    if (player.accountType === "guest" && Number.isSafeInteger(player.guestId)) return { type: "guest", id: player.guestId };
    return null;
}

export async function getExplorationProgress(player) {
    const who = identity(player);
    if (!who) return { visitedIds: [], completed: false };
    const [visits, completion] = await Promise.all([
        pool.query(
            `SELECT location_id FROM campus_exploration_visits
             WHERE account_type = $1 AND account_id = $2`,
            [who.type, who.id]
        ),
        pool.query(
            `SELECT completed_at, reward_points FROM campus_exploration_completions
             WHERE account_type = $1 AND account_id = $2`,
            [who.type, who.id]
        )
    ]);
    return {
        visitedIds: visits.rows.map((row) => row.location_id),
        completed: completion.rowCount > 0,
        rewardPoints: completion.rows[0]?.reward_points ?? 0
    };
}

export async function markExplorationVisit(player, locationId) {
    const who = identity(player);
    if (!who) return false;
    const result = await pool.query(
        `INSERT INTO campus_exploration_visits (account_type, account_id, location_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (account_type, account_id, location_id) DO NOTHING
         RETURNING location_id`,
        [who.type, who.id, locationId]
    );
    return result.rowCount === 1;
}

export async function completeExplorationAndReward(player, rewardPoints) {
    const who = identity(player);
    if (!who) return { newlyCompleted: false, totalPoints: null };
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const completion = await client.query(
            `INSERT INTO campus_exploration_completions (account_type, account_id, reward_points)
             VALUES ($1, $2, $3)
             ON CONFLICT (account_type, account_id) DO NOTHING
             RETURNING completed_at`,
            [who.type, who.id, rewardPoints]
        );
        if (completion.rowCount !== 1) {
            await client.query("ROLLBACK");
            return { newlyCompleted: false, totalPoints: null };
        }
        const points = who.type === "user"
            ? await client.query(
                `UPDATE users SET points = points + $1, updated_at = CURRENT_TIMESTAMP
                 WHERE id = $2 RETURNING points`,
                [rewardPoints, who.id]
            )
            : await client.query(
                `UPDATE guest_users SET points = points + $1, updated_at = CURRENT_TIMESTAMP
                 WHERE id = $2 RETURNING points`,
                [rewardPoints, who.id]
            );
        if (points.rowCount !== 1) throw new Error("Exploration reward account not found.");
        await client.query("COMMIT");
        return { newlyCompleted: true, totalPoints: points.rows[0].points };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}
