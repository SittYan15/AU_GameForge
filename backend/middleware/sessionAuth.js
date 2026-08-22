import { findUserById } from "../models/userModel.js";
import { SESSION_REPLACED_CODE } from "./authToken.js";

export async function requireSession(req, res, next) {
    if (!req.session?.accountType) {
        return res.status(401).json({ error: "An active player session is required." });
    }
    if (req.session.accountType !== "user") return next();
    try {
        const user = await findUserById(req.session.userId);
        if (user?.activeSessionId && user.activeSessionId === req.session.sessionId
            && user.activeSessionExpiresAt && new Date(user.activeSessionExpiresAt) > new Date()) return next();
        const response = {
            error: "Your account was logged in from another browser or device. Please log in again.",
            code: SESSION_REPLACED_CODE
        };
        return req.session.destroy((destroyError) => {
            if (destroyError) return next(destroyError);
            res.clearCookie("au_gameforge_session");
            return res.status(401).json(response);
        });
    } catch (error) {
        return next(error);
    }
}

export function requireGuestSession(req, res, next) {
    if (req.session?.accountType !== "guest" || !Number.isSafeInteger(req.session.guestId)) {
        return res.status(401).json({ error: "An active guest session is required." });
    }
    return next();
}

export function requireTrustedOrigin(allowedOrigins) {
    return (req, res, next) => {
        const origin = req.get("origin");
        if (origin && !allowedOrigins.includes(origin)) {
            return res.status(403).json({ error: "Untrusted request origin." });
        }
        return next();
    };
}

export function establishSession(req, identity) {
    return new Promise((resolve, reject) => {
        req.session.regenerate((error) => {
            if (error) return reject(error);
            Object.assign(req.session, identity);
            req.session.save((saveError) => saveError ? reject(saveError) : resolve());
        });
    });
}
