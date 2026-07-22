import bcrypt from "bcrypt";
import { createAccessToken } from "../middleware/authToken.js";
import { createUser, findUserByUsername, publicUser, upgradeGuestToPasswordUser } from "../models/userModel.js";
import { establishSession } from "../middleware/sessionAuth.js";

const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,50}$/;

function credentials(body) {
    return {
        username: typeof body?.username === "string" ? body.username.trim() : "",
        password: typeof body?.password === "string" ? body.password : ""
    };
}

function authResponse(user) {
    return { ...publicUser(user), token: createAccessToken(user.id) };
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
        await establishSession(req, { accountType: "user", userId: user.id });
        return res.status(200).json(authResponse(user));
    } catch (error) {
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
        await establishSession(req, { accountType: "user", userId: user.id });
        return res.status(201).json(authResponse(user));
    } catch (error) {
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
        await establishSession(req, { accountType: "user", userId: user.id });
        return res.status(201).json(authResponse(user));
    } catch (error) {
        if (error.code === "23505") return res.status(409).json({ error: "Username is already taken." });
        if (error.status) return res.status(error.status).json({ error: error.message });
        return next(error);
    }
}
