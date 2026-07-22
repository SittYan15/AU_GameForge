import { findGuestById } from "../models/guestModel.js";
import { findUserById } from "../models/userModel.js";
import { verifyAccessToken } from "../middleware/authToken.js";
import { getConvertedUserForGuest } from "../models/googleAccountModel.js";

const players = new Map();
const chatHistory = [];
const MAX_CHAT_HISTORY = 50;
const MAX_PLAYER_NAME_LENGTH = 50;
const MAX_SPEED_UNITS_PER_SECOND = 30;
const MOVEMENT_TOLERANCE = 3;
const MIN_SPAWN_SEPARATION = 3;
const VALID_ANIMATIONS = new Set(["idle", "walk", "run"]);

function isVector3(value) {
    return value && [value.x, value.y, value.z].every(Number.isFinite);
}

function publicPlayer(player) {
    return {
        socketId: player.socketId,
        accountType: player.accountType,
        playerName: player.playerName,
        avatarKey: player.avatarKey,
        position: player.position,
        rotation: player.rotation,
        animation: player.animation
    };
}

function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

function horizontalDistance(a, b) {
    return Math.hypot(a.x - b.x, a.z - b.z);
}

function findAvailableSpawn(requestedPosition) {
    const base = { ...requestedPosition };
    if ([...players.values()].every((player) => horizontalDistance(player.position, base) >= MIN_SPAWN_SEPARATION)) {
        return base;
    }

    for (let ring = 1; ring <= 10; ring += 1) {
        const radius = MIN_SPAWN_SEPARATION * ring;
        const spots = Math.max(8, ring * 8);
        for (let index = 0; index < spots; index += 1) {
            const angle = (index / spots) * Math.PI * 2;
            const candidate = {
                x: base.x + Math.cos(angle) * radius,
                y: base.y,
                z: base.z + Math.sin(angle) * radius
            };
            if ([...players.values()].every((player) => horizontalDistance(player.position, candidate) >= MIN_SPAWN_SEPARATION)) {
                return candidate;
            }
        }
    }

    return { x: base.x + MIN_SPAWN_SEPARATION * (players.size + 1), y: base.y, z: base.z };
}

export default function registerMultiplayerSocket(io) {
    io.on("connection", (socket) => {
        socket.data.lastMoveAt = Date.now();
        socket.emit("chat:history", chatHistory);

        socket.on("player:join", async (payload = {}) => {
            if (players.has(socket.id) || socket.data.joining) return;

            const accountType = payload.accountType;
            const guestSession = socket.request.session;
            const tokenIdentity = accountType === "user" ? verifyAccessToken(socket.handshake.auth?.token) : null;
            if (accountType !== "guest" && accountType !== "user") return;
            if (accountType === "guest"
                && (guestSession?.accountType !== "guest" || !Number.isSafeInteger(guestSession.guestId))) {
                socket.emit("player:joinError", "An authenticated guest session is required.");
                return;
            }
            if (accountType === "user" && !tokenIdentity) {
                socket.emit("player:joinError", "Authentication required.");
                return;
            }

            socket.data.joining = true;
            let account;
            try {
                account = accountType === "guest"
                    ? await findGuestById(guestSession.guestId)
                    : await findUserById(tokenIdentity.userId);
            } catch (error) {
                console.error("Could not verify multiplayer account:", error.message);
                socket.emit("player:joinError", "Guest verification is temporarily unavailable.");
                socket.data.joining = false;
                return;
            }
            socket.data.joining = false;
            if (!account || account.convertedToUserId || !socket.connected) {
                if (socket.connected) socket.emit("player:joinError", "Player account not found.");
                return;
            }

            const requestedPosition = isVector3(payload.position) ? payload.position : { x: -100, y: 10, z: 0 };
            const position = findAvailableSpawn(requestedPosition);
            const rotation = isVector3(payload.rotation) ? payload.rotation : { x: 0, y: 0, z: 0 };
            const player = {
                socketId: socket.id,
                accountType,
                userId: accountType === "user" ? account.id : null,
                guestId: accountType === "guest" ? account.id : null,
                guestCode: accountType === "guest" ? account.guestCode : null,
                playerName: account.playerName.slice(0, MAX_PLAYER_NAME_LENGTH),
                avatarKey: account.avatarKey || "default_avatar",
                position,
                rotation,
                animation: "idle"
            };

            socket.emit("players:current", [...players.values()].map(publicPlayer));
            players.set(socket.id, player);
            socket.emit("player:spawned", position);
            io.emit("player:joined", publicPlayer(player));
        });

        socket.on("player:move", (payload = {}) => {
            const player = players.get(socket.id);
            if (!player || !isVector3(payload.position) || !isVector3(payload.rotation)) return;

            const now = Date.now();
            const elapsedSeconds = Math.max((now - socket.data.lastMoveAt) / 1000, 1 / 60);
            const allowedDistance = MAX_SPEED_UNITS_PER_SECOND * elapsedSeconds + MOVEMENT_TOLERANCE;
            if (distance(player.position, payload.position) > allowedDistance) return;

            player.position = payload.position;
            player.rotation = payload.rotation;
            socket.data.lastMoveAt = now;
            io.emit("player:moved", {
                socketId: socket.id,
                position: player.position,
                rotation: player.rotation
            });
        });

        socket.on("player:animation", (animation) => {
            const player = players.get(socket.id);
            if (!player || !VALID_ANIMATIONS.has(animation) || player.animation === animation) return;
            player.animation = animation;
            io.emit("player:animationChanged", { socketId: socket.id, animation });
        });

        socket.on("player:identityUpdate", async () => {
            const player = players.get(socket.id);
            if (!player || player.accountType !== "guest" || !player.guestId) return;
            try {
                const profile = await getConvertedUserForGuest(player.guestId);
                if (!profile) return;
                player.accountType = "user";
                player.userId = profile.userId;
                player.guestId = null;
                player.guestCode = null;
                player.playerName = profile.playerName.slice(0, MAX_PLAYER_NAME_LENGTH);
                io.emit("player:identityChanged", {
                    socketId: socket.id,
                    accountType: player.accountType,
                    playerName: player.playerName
                });
            } catch (error) {
                console.error("Could not update multiplayer identity:", error.message);
            }
        });

        socket.on("player:profileUpdate", async () => {
            const player = players.get(socket.id);
            const guestSession = socket.request.session;
            if (!player || player.accountType !== "guest"
                || guestSession?.accountType !== "guest"
                || guestSession.guestId !== player.guestId) return;
            try {
                const guest = await findGuestById(player.guestId);
                if (!guest || guest.convertedToUserId) return;
                player.playerName = guest.playerName.slice(0, MAX_PLAYER_NAME_LENGTH);
                player.avatarKey = guest.avatarKey;
                io.emit("player:profileUpdated", {
                    socketId: socket.id,
                    playerName: player.playerName,
                    avatarKey: player.avatarKey
                });
            } catch (error) {
                console.error("Could not update multiplayer profile:", error.message);
            }
        });

        socket.on("chat:message", (payload = {}) => {
            const player = players.get(socket.id);
            const text = typeof payload.text === "string" ? payload.text.trim().slice(0, 160) : "";
            if (!player || !text) return;
            const message = {
                id: `${Date.now()}-${socket.id}`,
                sender: player.playerName,
                text,
                timestamp: Date.now()
            };
            chatHistory.push(message);
            if (chatHistory.length > MAX_CHAT_HISTORY) chatHistory.shift();
            io.emit("chat:message", message);
        });

        socket.on("disconnect", () => {
            if (!players.delete(socket.id)) return;
            io.emit("player:left", socket.id);
        });
    });
}

export { players };
