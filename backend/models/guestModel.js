import crypto from "node:crypto";
import pool from "../config/db.js";

const CODE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const MAX_CODE_ATTEMPTS = 10;

function generateGuestCode() {
    let suffix = "";
    for (let index = 0; index < 6; index += 1) {
        suffix += CODE_ALPHABET[crypto.randomInt(0, CODE_ALPHABET.length)];
    }
    return `AU-${suffix}`;
}

function generatePlayerName() {
    return `Guest${crypto.randomInt(1000, 10000)}`;
}

function toGuest(row) {
    if (!row) return null;
    return {
        id: row.id,
        guestCode: row.guest_code,
        playerName: row.player_name,
        avatarKey: row.avatar_key,
        bio: row.bio,
        points: row.points,
        convertedToUserId: row.converted_to_user_id || null,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

export async function createGuest() {
    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt += 1) {
        try {
            const result = await pool.query(
                `INSERT INTO guest_users (guest_code, player_name)
                 VALUES ($1, $2)
                 RETURNING id, guest_code, player_name, avatar_key, bio, points, created_at, updated_at`,
                [generateGuestCode(), generatePlayerName()]
            );
            return toGuest(result.rows[0]);
        } catch (error) {
            if (error.code !== "23505") throw error;
        }
    }

    const error = new Error("Unable to generate a unique guest code.");
    error.status = 409;
    throw error;
}

export async function findGuestByCode(guestCode) {
    const result = await pool.query(
        `SELECT id, guest_code, player_name, avatar_key, bio, points, converted_to_user_id, created_at, updated_at
         FROM guest_users
         WHERE guest_code = $1`,
        [guestCode]
    );
    return toGuest(result.rows[0]);
}

export async function findGuestById(guestId) {
    const result = await pool.query(
        `SELECT id, guest_code, player_name, avatar_key, bio, points, converted_to_user_id, created_at, updated_at
         FROM guest_users WHERE id = $1`,
        [guestId]
    );
    return toGuest(result.rows[0]);
}

export async function updateGuestProfile(guestId, playerName, avatarKey, bio) {
    const result = await pool.query(
        `UPDATE guest_users
         SET player_name = $1,
             avatar_key = $2,
             bio = $3,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4
           AND converted_to_user_id IS NULL
         RETURNING id, guest_code, player_name, avatar_key, bio, points,
                   converted_to_user_id, created_at, updated_at`,
        [playerName, avatarKey, bio, guestId]
    );
    return toGuest(result.rows[0]);
}

export async function addGuestPoints(guestCode, pointsToAdd) {
    const result = await pool.query(
        `UPDATE guest_users
         SET points = points + $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE guest_code = $2
         RETURNING id, guest_code, player_name, points, created_at, updated_at`,
        [pointsToAdd, guestCode]
    );
    return toGuest(result.rows[0]);
}
