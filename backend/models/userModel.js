import pool from "../config/db.js";

function toUser(row) {
    if (!row) return null;
    return {
        id: row.id,
        username: row.username,
        passwordHash: row.password_hash,
        playerName: row.player_name,
        points: row.points,
        email: row.email,
        googleSub: row.google_sub,
        profilePictureUrl: row.profile_picture_url,
        avatarKey: row.avatar_key,
        bio: row.bio,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

export async function findUserByUsername(username) {
    const result = await pool.query(
        `SELECT id, username, password_hash, player_name, points, email, google_sub,
                profile_picture_url, avatar_key, bio, created_at, updated_at
         FROM users
         WHERE username = $1`,
        [username]
    );
    return toUser(result.rows[0]);
}

export async function createUser(username, passwordHash, playerName) {
    const result = await pool.query(
        `INSERT INTO users (username, password_hash, player_name)
         VALUES ($1, $2, $3)
         RETURNING id, username, player_name, points, email, google_sub,
                   profile_picture_url, avatar_key, bio, created_at, updated_at`,
        [username, passwordHash, playerName]
    );
    return toUser(result.rows[0]);
}

export async function upgradeGuestToPasswordUser(guestId, username, passwordHash) {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const guestResult = await client.query(
            `SELECT id, player_name, points, avatar_key, bio, converted_to_user_id
             FROM guest_users WHERE id = $1 FOR UPDATE`,
            [guestId]
        );
        const guest = guestResult.rows[0];
        if (!guest) {
            const error = new Error("Guest account not found.");
            error.status = 404;
            throw error;
        }
        if (guest.converted_to_user_id) {
            const error = new Error("This guest progress has already been transferred.");
            error.status = 409;
            throw error;
        }

        const existing = await client.query("SELECT id FROM users WHERE username = $1 FOR UPDATE", [username]);
        if (existing.rowCount) {
            const error = new Error("Username is already taken.");
            error.status = 409;
            throw error;
        }

        const userResult = await client.query(
            `INSERT INTO users (username, password_hash, player_name, points, avatar_key, bio)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id, username, password_hash, player_name, points, email, google_sub,
                       profile_picture_url, avatar_key, bio, created_at, updated_at`,
            [username, passwordHash, guest.player_name, guest.points, guest.avatar_key, guest.bio]
        );
        const user = toUser(userResult.rows[0]);

        const converted = await client.query(
            `UPDATE guest_users
             SET converted_to_user_id = $1, converted_at = CURRENT_TIMESTAMP,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $2 AND converted_to_user_id IS NULL`,
            [user.id, guest.id]
        );
        if (converted.rowCount !== 1) throw new Error("Guest conversion conflict.");

        await client.query("COMMIT");
        return user;
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

export async function findUserById(userId) {
    const result = await pool.query(
        `SELECT id, username, password_hash, player_name, points, email, google_sub,
                profile_picture_url, avatar_key, bio, created_at, updated_at
         FROM users
         WHERE id = $1`,
        [userId]
    );
    return toUser(result.rows[0]);
}

export async function addUserPoints(userId, pointsToAdd) {
    const result = await pool.query(
        `UPDATE users
         SET points = points + $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING id, username, player_name, points, email, google_sub,
                   profile_picture_url, avatar_key, bio, created_at, updated_at`,
        [pointsToAdd, userId]
    );
    return toUser(result.rows[0]);
}

export function publicUser(user) {
    if (!user) return null;
    const { passwordHash: _passwordHash, ...safeUser } = user;
    return safeUser;
}
