import { findGuestById } from "../models/guestModel.js";
import { getUserProfile } from "../models/googleAccountModel.js";
import { createAccessToken, createGuestAccessToken } from "../middleware/authToken.js";
import { publicUser, setActiveSessionExpiration, updateUserProfile } from "../models/userModel.js";
import { ALLOWED_AVATARS } from "../config/guestProfile.js";
import { completeNewPlayerTutorial } from "../models/tutorialModel.js";

export async function getProfile(req, res, next) {
    try {
        if (req.session.accountType === "user") {
            const profile = await getUserProfile(req.session.userId);
            if (!profile) return res.status(404).json({ error: "User profile not found." });
            await setActiveSessionExpiration(
                profile.userId,
                req.session.sessionId,
                new Date(Date.now() + 8 * 60 * 60 * 1000)
            );
            // The HTTP-only session cookie restores the browser session. Issue a
            // fresh short-lived token for the authenticated Socket.IO connection.
            return res.status(200).json({ ...profile, token: createAccessToken(profile.userId, req.session.sessionId) });
        }

        const guest = await findGuestById(req.session.guestId);
        if (!guest || guest.convertedToUserId) {
            return res.status(404).json({ error: "Guest profile not found." });
        }
        return res.status(200).json({
            accountType: "guest",
            userId: null,
            guestId: guest.id,
            guestCode: guest.guestCode,
            playerName: guest.playerName,
            email: null,
            profilePictureUrl: null,
            points: guest.points,
            avatarKey: guest.avatarKey,
            bio: guest.bio,
            tutorialCompleted: guest.tutorialCompleted,
            token: createGuestAccessToken(guest.id)
        });
    } catch (error) {
        return next(error);
    }
}

export async function updateProfile(req, res, next) {
    try {
        const allowedFields = new Set(["playerName", "avatar", "bio"]);
        const suppliedFields = Object.keys(req.body || {});
        if (suppliedFields.some((field) => !allowedFields.has(field))) {
            return res.status(400).json({ error: "Only playerName, avatar, and bio can be updated." });
        }

        const playerName = typeof req.body?.playerName === "string" ? req.body.playerName.trim() : "";
        const avatarKey = typeof req.body?.avatar === "string" ? req.body.avatar : "";
        const bio = typeof req.body?.bio === "string" ? req.body.bio.trim() : "";
        if (playerName.length < 3 || playerName.length > 24
            || !/^[\p{L}\p{N} _-]+$/u.test(playerName)) {
            return res.status(400).json({
                error: "Player name must be 3–24 characters using letters, numbers, spaces, underscores, or hyphens."
            });
        }
        if (!ALLOWED_AVATARS.includes(avatarKey)) {
            return res.status(400).json({ error: "Invalid avatar selection." });
        }
        if (bio.length > 160 || /[<>]/.test(bio)) {
            return res.status(400).json({ error: "Bio must be plain text with at most 160 characters." });
        }

        const user = await updateUserProfile(req.session.userId, playerName, avatarKey, bio);
        if (!user) return res.status(404).json({ error: "User profile not found." });
        return res.status(200).json({
            ...publicUser(user),
            accountType: "user",
            accountProvider: user.googleSub ? "google" : "password",
            userId: user.id
        });
    } catch (error) {
        return next(error);
    }
}


export async function completeTutorial(req, res, next) {
    try {
        const completed =
            await completeNewPlayerTutorial(
                req.session
            );

        if (!completed) {
            return res.status(404).json({
                error: "Active player account not found."
            });
        }

        return res.status(200).json({
            tutorialCompleted: true
        });
    } catch (error) {
        return next(error);
    }
}
