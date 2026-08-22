import jwt from "jsonwebtoken";
import { findUserById } from "../models/userModel.js";

export const SESSION_REPLACED_CODE = "SESSION_REPLACED";

function jwtSecret() {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
        throw new Error("JWT_SECRET must contain at least 32 characters.");
    }
    return process.env.JWT_SECRET;
}

export function createAccessToken(userId, sessionId) {
    return jwt.sign({ accountType: "user", sessionId }, jwtSecret(), {
        subject: String(userId),
        expiresIn: "8h"
    });
}

export function verifyAccessToken(token) {
    if (typeof token !== "string" || !token) return null;
    try {
        const payload = jwt.verify(token, jwtSecret());
        const userId = Number(payload.sub);
        if (payload.accountType !== "user" || !Number.isSafeInteger(userId) || userId <= 0) return null;
        if (typeof payload.sessionId !== "string" || !payload.sessionId) return null;
        return { userId, sessionId: payload.sessionId };
    } catch {
        return null;
    }
}

export async function requireUser(req, res, next) {
    const authorization = req.get("authorization") || "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    const identity = verifyAccessToken(token);
    if (!identity) return res.status(401).json({ error: "Authentication required." });
    try {
        const user = await findUserById(identity.userId);
        if (!user) return res.status(401).json({ error: "User not found." });
        if (!user.activeSessionId || user.activeSessionId !== identity.sessionId
            || !user.activeSessionExpiresAt || new Date(user.activeSessionExpiresAt) <= new Date()) {
            return res.status(401).json({
                error: "Your account was logged in from another browser or device. Please log in again.",
                code: SESSION_REPLACED_CODE
            });
        }
        req.auth = identity;
        return next();
    } catch (error) {
        return next(error);
    }
}
