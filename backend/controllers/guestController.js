import { addGuestPoints, createGuest, findGuestByCode, updateGuestProfile } from "../models/guestModel.js";
import { establishSession } from "../middleware/sessionAuth.js";
import { ALLOWED_AVATARS } from "../config/guestProfile.js";

const GUEST_CODE_PATTERN = /^AU-[A-Z0-9]{6}$/;

function normalizeGuestCode(value) {
    return typeof value === "string" ? value.trim().toUpperCase() : "";
}

function validateGuestCode(value) {
    const guestCode = normalizeGuestCode(value);
    if (!GUEST_CODE_PATTERN.test(guestCode)) {
        const error = new Error("Guest code must use the format AU-XXXXXX.");
        error.status = 400;
        throw error;
    }
    return guestCode;
}

export async function createGuestAccount(req, res, next) {
    try {
        const guest = await createGuest();
        await establishSession(req, { accountType: "guest", guestId: guest.id });
        res.status(201).json(guest);
    } catch (error) {
        next(error);
    }
}

export async function restoreGuestAccount(req, res, next) {
    try {
        const guest = await findGuestByCode(validateGuestCode(req.body?.guestCode));
        if (!guest) return res.status(404).json({ error: "Guest Code not found." });
        if (guest.convertedToUserId) return res.status(409).json({ error: "This guest was converted to a registered account." });
        await establishSession(req, { accountType: "guest", guestId: guest.id });
        return res.status(200).json(guest);
    } catch (error) {
        return next(error);
    }
}

export async function getGuestAccount(req, res, next) {
    try {
        const guest = await findGuestByCode(validateGuestCode(req.params.guestCode));
        if (!guest) return res.status(404).json({ error: "Guest Code not found." });
        return res.status(200).json(guest);
    } catch (error) {
        return next(error);
    }
}

export async function updateGuestPoints(req, res, next) {
    try {
        const guestCode = validateGuestCode(req.params.guestCode);
        const pointsToAdd = req.body?.pointsToAdd;
        if (!Number.isSafeInteger(pointsToAdd) || pointsToAdd <= 0 || pointsToAdd > 100000) {
            return res.status(400).json({ error: "pointsToAdd must be a positive integer up to 100000." });
        }

        const guest = await addGuestPoints(guestCode, pointsToAdd);
        if (!guest) return res.status(404).json({ error: "Guest Code not found." });
        return res.status(200).json(guest);
    } catch (error) {
        return next(error);
    }
}

export async function updateCurrentGuestProfile(req, res, next) {
    try {
        const playerName = typeof req.body?.playerName === "string" ? req.body.playerName.trim() : "";
        const avatarKey = typeof req.body?.avatarKey === "string" ? req.body.avatarKey : "";
        const bio = typeof req.body?.bio === "string" ? req.body.bio.trim() : "";

        if (playerName.length < 3 || playerName.length > 24
            || !/^[\p{L}\p{N} _-]+$/u.test(playerName)) {
            return res.status(400).json({
                error: "Player name must be 3–24 characters using letters, numbers, spaces, underscores, or hyphens."
            });
        }
        if (bio.length > 160 || /[<>]/.test(bio)) {
            return res.status(400).json({ error: "Bio must be plain text with at most 160 characters." });
        }
        if (!ALLOWED_AVATARS.includes(avatarKey)) {
            return res.status(400).json({ error: "Invalid avatar selection." });
        }

        const guest = await updateGuestProfile(req.session.guestId, playerName, avatarKey, bio);
        if (!guest) return res.status(404).json({ error: "Active guest profile not found." });
        return res.status(200).json({
            accountType: "guest",
            guestCode: guest.guestCode,
            playerName: guest.playerName,
            avatarKey: guest.avatarKey,
            bio: guest.bio,
            points: guest.points
        });
    } catch (error) {
        return next(error);
    }
}
