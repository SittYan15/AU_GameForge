import { verifyAccessToken } from "../middleware/authToken.js";
import { getConvertedUserForGuest } from "../models/googleAccountModel.js";
import { findGuestById, addGuestPoints } from "../models/guestModel.js";
import { findUserById, addUserPoints } from "../models/userModel.js";

const players = new Map();
const chatHistory = [];
const MAX_CHAT_HISTORY = 50;
const MAX_PLAYER_NAME_LENGTH = 50;
const MAX_SPEED_UNITS_PER_SECOND = 30;
const MOVEMENT_TOLERANCE = 3;
const MIN_SPAWN_SEPARATION = 3;
const VALID_ANIMATIONS = new Set(["idle", "walk", "run"]);
const rlglState = { phase: "IDLE", isRedLight: false };
let rlglTimer = null;
let roundTimer = null;

function startLobby(io) {
    if (rlglState.phase === "LOBBY") return;
    rlglState.phase = "LOBBY";
    rlglState.isRedLight = false;
    clearTimeout(rlglTimer);

    // Tell clients the wall is DOWN and round is starting soon
    io.to("rlgl_minigame").emit("rlgl:phase", "LOBBY");

    let count = 15; // 15 seconds to enter the arena
    const countdownInterval = setInterval(() => {
        if (count > 0) {
            io.to("rlgl_minigame").emit("rlgl:lobby_countdown", count);
            count--;
        } else {
            clearInterval(countdownInterval);
            startGame(io);
        }
    }, 1000);
}

function startGame(io) {
    rlglState.phase = "ACTIVE";
    rlglState.isRedLight = false;

    let activePlayerCount = 0;

    // Evaluate who is playing vs spectating
    io.in("rlgl_minigame").fetchSockets().then(sockets => {
        sockets.forEach(socket => {
            const player = players.get(socket.id);
            if (player) {
                if (player.position.z >= 498) {
                    socket.data.isPlaying = true;
                    socket.data.isEliminated = false;
                    socket.data.hasFinished = false;
                    activePlayerCount++;
                } else {
                    socket.data.isPlaying = false;
                }
            }
        });

        // If no one actually crossed the start line, end the round immediately
        if (activePlayerCount === 0) {
            endRound(io);
            return;
        }

        io.to("rlgl_minigame").emit("rlgl:phase", "ACTIVE");
        io.to("rlgl_minigame").emit("rlgl:state", false); // Start on Green Light

        rlglTimer = setTimeout(() => toggleLight(io), Math.random() * 2000 + 2000);

        // Maximum round time: 60 seconds
        roundTimer = setTimeout(() => endRound(io), 60000);
    });
}

function toggleLight(io) {
    if (rlglState.phase !== "ACTIVE") return;
    rlglState.isRedLight = !rlglState.isRedLight;
    io.to("rlgl_minigame").emit("rlgl:state", rlglState.isRedLight);

    const delay = rlglState.isRedLight
        ? Math.random() * 2000 + 3000
        : Math.random() * 2000 + 2000;
    rlglTimer = setTimeout(() => toggleLight(io), delay);
}

function checkRoundStatus(io) {
    if (rlglState.phase !== "ACTIVE") return;

    io.in("rlgl_minigame").fetchSockets().then(sockets => {
        // Check if any active player is still alive and hasn't finished
        const stillPlaying = sockets.some(s =>
            s.data.isPlaying && !s.data.isEliminated && !s.data.hasFinished
        );

        if (!stillPlaying) {
            endRound(io);
        }
    });
}

function endRound(io) {
    if (rlglState.phase === "FINISHED") return;
    rlglState.phase = "FINISHED";

    clearTimeout(rlglTimer);
    clearTimeout(roundTimer);

    io.to("rlgl_minigame").emit("rlgl:phase", "FINISHED");

    // Wait 5 seconds to show the results, then restart the lobby
    setTimeout(() => startLobby(io), 5000);
}

function startRlglLoop(io) {
    if (rlglState.active) return;
    rlglState.active = true;

    const toggleLight = () => {
        rlglState.isRedLight = !rlglState.isRedLight;
        io.to("rlgl_minigame").emit("rlgl:state", rlglState.isRedLight);

        // Randomize timing: 2-4s for Green, 3-5s for Red
        const delay = rlglState.isRedLight
            ? Math.random() * 2000 + 3000
            : Math.random() * 2000 + 2000;
        setTimeout(toggleLight, delay);
    };
    toggleLight();
}

function startRlglCountdown(io) {
    if (rlglState.active || rlglState.countingDown) return;
    rlglState.countingDown = true;

    let count = 3;
    const countdownInterval = setInterval(() => {
        if (count > 0) {
            io.to("rlgl_minigame").emit("rlgl:countdown", count);
            count--;
        } else {
            clearInterval(countdownInterval);
            rlglState.countingDown = false;
            rlglState.active = true;
            rlglState.isRedLight = false; // Always start on Green

            io.to("rlgl_minigame").emit("rlgl:state", false);

            // Queue up the first light toggle
            setTimeout(() => toggleLight(io), Math.random() * 2000 + 2000);
        }
    }, 1000);
}

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

            if (
                socket.data.inRlgl &&
                rlglState.phase === "ACTIVE" &&
                socket.data.isPlaying &&
                rlglState.isRedLight &&
                !socket.data.isEliminated &&
                !socket.data.hasFinished
            ) {
                const moveDist = horizontalDistance(player.position, payload.position);
                if (moveDist > 0.05) {
                    socket.data.isEliminated = true;
                    socket.emit("rlgl:eliminated");
                    checkRoundStatus(io);

                    // Optional: Check if round should end early if all active players are dead/finished
                }
            }

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

        // Game: Red Light, Green Light (RLGL) Implementation
        // 1. Join the Minigame
        socket.on("rlgl:join", (spawnPos) => {
            socket.join("rlgl_minigame");
            socket.data.inRlgl = true;
            socket.data.isPlaying = false; // Default to waiting

            const player = players.get(socket.id);
            if (player && isVector3(spawnPos)) player.position = spawnPos;

            // Start the lobby if the room was empty
            if (rlglState.phase === "IDLE") {
                startLobby(io);
            } else {
                // Send current phase to late joiners
                socket.emit("rlgl:phase", rlglState.phase);
            }
        });

        // 3. Finish Line Validation
        socket.on("rlgl:finish", async () => {
            const player = players.get(socket.id);

            if (!player || !socket.data.inRlgl || !socket.data.isPlaying || socket.data.isEliminated || socket.data.hasFinished) return;

            // Anti-Cheat: Verify they are actually past the finish line (Z >= 538 gives a tiny margin of error)
            if (player.position.z >= 538) {
                socket.data.hasFinished = true;
                const REWARD_POINTS = 50; // The amount of points for surviving

                try {
                    // Award points based on account type
                    if (player.accountType === "user") {
                        await addUserPoints(player.userId, REWARD_POINTS);
                    } else if (player.accountType === "guest") {
                        await addGuestPoints(player.guestCode, REWARD_POINTS);
                    }
                } catch (error) {
                    console.error("Failed to add points:", error.message);
                }

                // Notify the specific player they won
                socket.emit("rlgl:winner", REWARD_POINTS);
                checkRoundStatus(io);

                // Broadcast an announcement to the entire minigame room
                io.to("rlgl_minigame").emit("chat:message", {
                    id: `${Date.now()}-server`,
                    sender: "SERVER",
                    text: `${player.playerName} survived and earned ${REWARD_POINTS} points!`,
                    timestamp: Date.now()
                });
            }
        });

        socket.on("rlgl:leave", () => {
            socket.leave("rlgl_minigame");
            socket.data.inRlgl = false;
            socket.data.isEliminated = false;
            socket.data.hasFinished = false;
        });
    });
}

export { players };
