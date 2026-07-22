import jwt from "jsonwebtoken";

function jwtSecret() {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
        throw new Error("JWT_SECRET must contain at least 32 characters.");
    }
    return process.env.JWT_SECRET;
}

export function createAccessToken(userId) {
    return jwt.sign({ accountType: "user" }, jwtSecret(), {
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
        return { userId };
    } catch {
        return null;
    }
}

export function requireUser(req, res, next) {
    const authorization = req.get("authorization") || "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    const identity = verifyAccessToken(token);
    if (!identity) return res.status(401).json({ error: "Authentication required." });
    req.auth = identity;
    return next();
}
