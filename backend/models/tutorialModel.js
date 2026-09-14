import { readFile } from "node:fs/promises";
import pool from "../config/db.js";

export async function initializeNewPlayerTutorial() {
    const sql = await readFile(
        new URL(
            "../migrations/009_new_player_tutorial.sql",
            import.meta.url
        ),
        "utf8"
    );

    await pool.query(sql);
}

export async function completeNewPlayerTutorial(session) {
    if (session?.accountType === "user" && Number.isSafeInteger(session.userId)) {
        const result = await pool.query(
            `UPDATE users
             SET tutorial_completed = TRUE,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $1
             RETURNING tutorial_completed`,
            [session.userId]
        );

        return result.rows[0]?.tutorial_completed === true;
    }

    if (session?.accountType === "guest" && Number.isSafeInteger(session.guestId)) {
        const result = await pool.query(
            `UPDATE guest_users
             SET tutorial_completed = TRUE,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $1
               AND converted_to_user_id IS NULL
             RETURNING tutorial_completed`,
            [session.guestId]
        );

        return result.rows[0]?.tutorial_completed === true;
    }

    return false;
}
