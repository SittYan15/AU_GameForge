import { verifyGoogleCredential } from "../config/googleAuth.js";
import crypto from "node:crypto";
import { createAccessToken } from "../middleware/authToken.js";
import { establishSession } from "../middleware/sessionAuth.js";
import { createOrFindGoogleUser, upgradeGuestToGoogle } from "../models/googleAccountModel.js";
import { clearActiveSession, findUserById, replaceActiveSession, setActiveSessionExpiration } from "../models/userModel.js";
import { disconnectUserSession } from "../socket/multiplayerSocket.js";

async function destroyRequestSession(req) {
    await new Promise((resolve) => {
        if (!req.session) {
            resolve();
            return;
        }

        req.session.destroy(() => resolve());
    });
}

async function beginUserSession(req, profile) {
    const currentUser = await findUserById(profile.userId);

    if (!currentUser) {
        const error = new Error("Account not found.");
        error.status = 404;
        throw error;
    }

    const existingSessionIsCurrent =
        req.session?.accountType === "user"
        && req.session.userId === profile.userId
        && req.session.sessionId === currentUser.activeSessionId
        && currentUser.activeSessionExpiresAt
        && new Date(currentUser.activeSessionExpiresAt) > new Date();

    if (existingSessionIsCurrent) {
        return {
            ...profile,
            token: createAccessToken(profile.userId, req.session.sessionId)
        };
    }

    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);

    await establishSession(req, {
        accountType: "user",
        userId: profile.userId,
        sessionId
    });

    let replacement;

    try {
        replacement = await replaceActiveSession(
            profile.userId,
            sessionId,
            expiresAt
        );

        if (!replacement) {
            const error = new Error("Account not found.");
            error.status = 404;
            throw error;
        }
    } catch (error) {
        await destroyRequestSession(req);
        throw error;
    }

    const previousSessionId = replacement.previousSessionId;

    if (previousSessionId && previousSessionId !== sessionId) {
        disconnectUserSession(
            profile.userId,
            previousSessionId,
            {
                notifyReplacement: true
            }
        );
    }

    return {
        ...profile,
        token: createAccessToken(profile.userId, sessionId)
    };
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
    const { accountType, userId, sessionId } = req.session;
    try {
        if (accountType === "user") {
            const cleared = await clearActiveSession(userId, sessionId);
            if (!cleared) {
                return res.status(401).json({ error: "This login session is no longer active. Please log in again." });
            }
            disconnectUserSession(userId, sessionId);
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
