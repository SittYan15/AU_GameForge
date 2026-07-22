import pool from "../config/db.js";

const USER_COLUMNS = `id, username, player_name, points, email, google_sub,
                      profile_picture_url, avatar_key, bio, created_at, updated_at`;

function toProfile(row) {
    if (!row) return null;
    return {
        accountType: "user",
        accountProvider: row.google_sub ? "google" : "password",
        userId: row.id,
        guestId: null,
        guestCode: null,
        playerName: row.player_name,
        email: row.email,
        profilePictureUrl: row.profile_picture_url,
        points: row.points,
        avatarKey: row.avatar_key,
        bio: row.bio
    };
}

export async function findGoogleUser(googleSub) {
    const result = await pool.query(
        `SELECT ${USER_COLUMNS} FROM users WHERE google_sub = $1`,
        [googleSub]
    );
    return toProfile(result.rows[0]);
}

export async function createOrFindGoogleUser(googleProfile) {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        let result = await client.query(
            `SELECT ${USER_COLUMNS} FROM users
             WHERE google_sub = $1 OR email = $2
             FOR UPDATE`,
            [googleProfile.googleSub, googleProfile.email]
        );
        let row = result.rows[0];

        if (result.rows.length > 1) {
            const conflict = new Error("Google account identifiers match different users.");
            conflict.status = 409;
            throw conflict;
        }

        if (row && row.google_sub && row.google_sub !== googleProfile.googleSub) {
            const conflict = new Error("This email is linked to another Google account.");
            conflict.status = 409;
            throw conflict;
        }
        if (row) {
            result = await client.query(
                `UPDATE users
                 SET google_sub = COALESCE(google_sub, $1),
                     email = $2,
                     profile_picture_url = $3,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = $4
                 RETURNING ${USER_COLUMNS}`,
                [googleProfile.googleSub, googleProfile.email, googleProfile.profilePictureUrl, row.id]
            );
            row = result.rows[0];
        } else {
            result = await client.query(
                `INSERT INTO users (google_sub, email, player_name, profile_picture_url)
                 VALUES ($1, $2, $3, $4)
                 RETURNING ${USER_COLUMNS}`,
                [googleProfile.googleSub, googleProfile.email, googleProfile.playerName, googleProfile.profilePictureUrl]
            );
            row = result.rows[0];
        }
        await client.query("COMMIT");
        return toProfile(row);
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

export async function upgradeGuestToGoogle(googleProfile, guestId, mergeConfirmed) {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const guestResult = await client.query(
            `SELECT id, guest_code, player_name, points, avatar_key, bio, converted_to_user_id
             FROM guest_users WHERE id = $1 FOR UPDATE`,
            [guestId]
        );
        const guest = guestResult.rows[0];
        if (!guest) {
            const missing = new Error("Guest account not found.");
            missing.status = 404;
            throw missing;
        }
        if (guest.converted_to_user_id) {
            const converted = new Error("This guest progress has already been transferred.");
            converted.status = 409;
            throw converted;
        }

        let userResult = await client.query(
            `SELECT ${USER_COLUMNS} FROM users
             WHERE google_sub = $1 OR email = $2
             FOR UPDATE`,
            [googleProfile.googleSub, googleProfile.email]
        );
        let user = userResult.rows[0];
        const existingUser = Boolean(user);

        if (userResult.rows.length > 1) {
            const conflict = new Error("Google account identifiers match different users.");
            conflict.status = 409;
            throw conflict;
        }

        if (user && user.google_sub && user.google_sub !== googleProfile.googleSub) {
            const conflict = new Error("This email is linked to another Google account.");
            conflict.status = 409;
            throw conflict;
        }
        if (existingUser && !mergeConfirmed) {
            const confirmation = new Error("Confirm merging guest progress into the existing Google account.");
            confirmation.status = 409;
            confirmation.details = {
                requiresMergeConfirmation: true,
                registeredPoints: user.points,
                guestPoints: guest.points,
                finalPoints: user.points + guest.points
            };
            throw confirmation;
        }

        if (existingUser) {
            userResult = await client.query(
                `UPDATE users
                 SET google_sub = COALESCE(google_sub, $1), email = $2,
                     profile_picture_url = $3, player_name = $4,
                     avatar_key = $5, bio = $6, points = points + $7,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = $8
                 RETURNING ${USER_COLUMNS}`,
                [googleProfile.googleSub, googleProfile.email, googleProfile.profilePictureUrl,
                    guest.player_name, guest.avatar_key, guest.bio, guest.points, user.id]
            );
        } else {
            userResult = await client.query(
                `INSERT INTO users
                    (google_sub, email, player_name, profile_picture_url, points, avatar_key, bio)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 RETURNING ${USER_COLUMNS}`,
                [googleProfile.googleSub, googleProfile.email, guest.player_name,
                    googleProfile.profilePictureUrl, guest.points, guest.avatar_key, guest.bio]
            );
        }
        user = userResult.rows[0];

        const converted = await client.query(
            `UPDATE guest_users
             SET converted_to_user_id = $1, converted_at = CURRENT_TIMESTAMP,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $2 AND converted_to_user_id IS NULL
             RETURNING id`,
            [user.id, guest.id]
        );
        if (converted.rowCount !== 1) throw new Error("Guest conversion conflict.");

        await client.query("COMMIT");
        return { profile: toProfile(user), merged: existingUser };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

export async function getUserProfile(userId) {
    const result = await pool.query(
        `SELECT ${USER_COLUMNS} FROM users WHERE id = $1`,
        [userId]
    );
    return toProfile(result.rows[0]);
}

export async function getConvertedUserForGuest(guestId) {
    const result = await pool.query(
        `SELECT u.id, u.username, u.player_name, u.points, u.email, u.google_sub,
                u.profile_picture_url, u.avatar_key, u.bio, u.created_at, u.updated_at
         FROM guest_users g
         JOIN users u ON u.id = g.converted_to_user_id
         WHERE g.id = $1 AND g.converted_at IS NOT NULL`,
        [guestId]
    );
    return toProfile(result.rows[0]);
}
