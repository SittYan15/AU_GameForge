import { verifyGoogleCredential } from "../config/googleAuth.js";
import crypto from "node:crypto";
import { createAccessToken } from "../middleware/authToken.js";
import { establishSession } from "../middleware/sessionAuth.js";
import { createOrFindGoogleUser, upgradeGuestToGoogle } from "../models/googleAccountModel.js";
import { claimActiveSession, clearActiveSession, findUserById, setActiveSessionExpiration } from "../models/userModel.js";
import { disconnectUserSession } from "../socket/multiplayerSocket.js";

async function beginUserSession(req, profile) {
    const currentUser = await findUserById(profile.userId);
    const existingSessionIsCurrent = req.session?.accountType === "user"
        && req.session.userId === profile.userId
        && req.session.sessionId === currentUser?.activeSessionId
        && currentUser.activeSessionExpiresAt
        && new Date(currentUser.activeSessionExpiresAt) > new Date();
    if (existingSessionIsCurrent) {
        return { ...profile, token: createAccessToken(profile.userId, req.session.sessionId) };
    }

    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);
    if (!(await claimActiveSession(profile.userId, sessionId, expiresAt))) {
        const error = new Error(
            "This account is already logged in on another browser or device. Please log out from the existing session before logging in here."
        );
        error.status = 409;
        throw error;
    }
    try {
        await establishSession(req, { accountType: "user", userId: profile.userId, sessionId });
    } catch (error) {
        await clearActiveSession(profile.userId, sessionId);
        throw error;
    }
    return { ...profile, token: createAccessToken(profile.userId, sessionId) };
}

export async function googleLogin(req, res, next) {
    try {
        const googleProfile = await verifyGoogleCredential(req.body?.credential);
        const profile = await createOrFindGoogleUser(googleProfile);
        return res.status(200).json(await beginUserSession(req, profile));
    } catch (error) {
        if (error.status) return res.status(error.status).json({ error: error.message });
        return next(error);
    }
}

export async function upgradeGuest(req, res, next) {
    try {
        const googleProfile = await verifyGoogleCredential(req.body?.credential);
        const result = await upgradeGuestToGoogle(
            googleProfile,
            req.session.guestId,
            req.body?.mergeConfirmed === true
        );
        return res.status(200).json({ ...await beginUserSession(req, result.profile), merged: result.merged });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ error: error.message, ...error.details });
        return next(error);
    }
}

export async function logout(req, res, next) {
    try {
        if (req.session?.accountType === "user") {
            const cleared = await clearActiveSession(req.session.userId, req.session.sessionId);
            if (cleared) disconnectUserSession(req.session.userId, req.session.sessionId);
        }
    } catch (error) {
        return next(error);
    }
    req.session.destroy((error) => {
        if (error) return next(error);
        res.clearCookie("au_gameforge_session");
        return res.status(200).json({ message: "Logged out." });
    });
}

export async function heartbeat(req, res, next) {
    try {
        if (req.session.accountType === "user") {
            await setActiveSessionExpiration(
                req.session.userId,
                req.session.sessionId,
                // This short startup lease is renewed every second until the
                // multiplayer socket connects. If the tab closes while the
                // game is loading, the account is released automatically.
                new Date(Date.now() + 5000)
            );
        }
        return res.status(204).end();
    } catch (error) {
        return next(error);
    }
}
