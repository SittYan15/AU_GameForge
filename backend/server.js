import "dotenv/config";
import express from "express";
import cors from "cors";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { createServer } from "node:http";
import { Server } from "socket.io";
import guestRoutes from "./routes/guestRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import errorHandler from "./middleware/errorHandler.js";
import { requireTrustedOrigin } from "./middleware/sessionAuth.js";
import pool from "./config/db.js";
import registerMultiplayerSocket from "./socket/multiplayerSocket.js";

const PORT = Number(process.env.PORT) || 3000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";
const allowedOrigins = CLIENT_ORIGIN.split(",").map((origin) => origin.trim());
const PgSession = connectPgSimple(session);

const app = express();
if (process.env.NODE_ENV === "production") app.set("trust proxy", 1);
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: "10kb" }));
const sessionMiddleware = session({
    store: new PgSession({ pool, createTableIfMissing: true }),
    name: "au_gameforge_session",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 8 * 60 * 60 * 1000
    }
});
app.use(sessionMiddleware);
app.use("/api", requireTrustedOrigin(allowedOrigins));

app.get("/ping", (_req, res) => res.type("text").send("pong"));
app.get("/", (_req, res) => res.type("text").send("AU GameForge multiplayer server is alive!"));
app.use("/api/auth", authRoutes);
app.use("/api/guests", guestRoutes);
app.use("/api/users", userRoutes);
app.use("/api/profile", profileRoutes);
app.use(errorHandler);

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: allowedOrigins,
        credentials: true,
        methods: ["GET", "POST", "PATCH"]
    }
});

io.engine.use(sessionMiddleware);
registerMultiplayerSocket(io);

httpServer.listen(PORT, () => {
    console.log(`AU GameForge backend running on port ${PORT}`);
});
