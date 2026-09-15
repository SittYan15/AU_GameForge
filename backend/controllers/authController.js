import bcrypt from "bcrypt";
import crypto from "node:crypto";
import { createAccessToken } from "../middleware/authToken.js";
import { clearActiveSession, createUser, findUserByUsername, publicUser, replaceActiveSession, upgradeGuestToPasswordUser } from "../models/userModel.js";
import { establishSession } from "../middleware/sessionAuth.js";
import { disconnectUserSession } from "../socket/multiplayerSocket.js";

const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,50}$/;

function credentials(body) {
    return {
        username: typeof body?.username === "string" ? body.username.trim() : "",
        password: typeof body?.password === "string" ? body.password : ""
    };
}

async function destroyRequestSession(req) {
    await new Promise((resolve) => {
        if (!req.session) {
            resolve();
            return;
        }

        req.session.destroy(() => resolve());
    });
}

async function beginUserSession(req, user) {
    const existingSessionIsCurrent =
        req.session?.accountType === "user"
        && req.session.userId === user.id
        && req.session.sessionId === user.activeSessionId
        && user.activeSessionExpiresAt
        && new Date(user.activeSessionExpiresAt) > new Date();

    if (existingSessionIsCurrent) {
        return {
            ...publicUser(user),
            token: createAccessToken(user.id, req.session.sessionId)
        };
    }

    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);

    // Create/save the new browser session first. If this fails, the current
    // active session remains untouched.
    await establishSession(req, {
        accountType: "user",
        userId: user.id,
        sessionId
    });

    let replacement;

    try {
        replacement = await replaceActiveSession(
            user.id,
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
            user.id,
            previousSessionId,
            {
                notifyReplacement: true
            }
        );
    }

    return {
        ...publicUser(user),
        token: createAccessToken(user.id, sessionId)
    };
}


export async function login(req, res, next) {
    try {
        const { username, password } = credentials(req.body);
        if (!username || username.length > 50 || !password || password.length > 200) {
            return res.status(400).json({ error: "Username and password are required." });
        }

        const user = await findUserByUsername(username);
        if (!user) return res.status(404).json({ error: "Account not found." });
        if (!(await bcrypt.compare(password, user.passwordHash))) {
            return res.status(401).json({ error: "Invalid username or password." });
        }
        return res.status(200).json(await beginUserSession(req, user));
    } catch (error) {
        if (error.status) return res.status(error.status).json({ error: error.message });
        return next(error);
    }
}

export async function signup(req, res, next) {
    try {
        const { username, password } = credentials(req.body);
        if (!USERNAME_PATTERN.test(username)) {
            return res.status(400).json({ error: "Username must be 3–50 letters, numbers, or underscores." });
        }
        if (password.length < 8 || password.length > 72) {
            return res.status(400).json({ error: "Password must be between 8 and 72 characters." });
        }
        if (await findUserByUsername(username)) {
            return res.status(409).json({ error: "Username is already taken." });
        }

        const passwordHash = await bcrypt.hash(password, 12);
        const user = await createUser(username, passwordHash, username);
        return res.status(201).json(await beginUserSession(req, user));
    } catch (error) {
        if (error.status) return res.status(error.status).json({ error: error.message });
        if (error.code === "23505") return res.status(409).json({ error: "Username is already taken." });
        return next(error);
    }
}

export async function signupGuest(req, res, next) {
    try {
        const { username, password } = credentials(req.body);
        if (!USERNAME_PATTERN.test(username)) {
            return res.status(400).json({ error: "Username must be 3–50 letters, numbers, or underscores." });
        }
        if (password.length < 8 || password.length > 72) {
            return res.status(400).json({ error: "Password must be between 8 and 72 characters." });
        }

        const passwordHash = await bcrypt.hash(password, 12);
        const user = await upgradeGuestToPasswordUser(req.session.guestId, username, passwordHash);
        return res.status(201).json(await beginUserSession(req, user));
    } catch (error) {
        if (error.code === "23505") return res.status(409).json({ error: "Username is already taken." });
        if (error.status) return res.status(error.status).json({ error: error.message });
        return next(error);
    }
}
