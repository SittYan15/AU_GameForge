import { randomUUID } from "node:crypto";
import { addGuestPoints } from "../models/guestModel.js";
import { addUserPoints } from "../models/userModel.js";
import { getTopPlayers } from "../models/leaderboardModel.js";
import {
    PROP_HUNT_AREAS,
    PROP_HUNT_ELEVATOR_HORIZONTAL_RADIUS,
    PROP_HUNT_ELEVATOR_VERTICAL_TOLERANCE,
    PROP_HUNT_ELEVATORS,
    PROP_HUNT_FIRE_COOLDOWN_MS,
    PROP_HUNT_FLOOR_SURFACE_Y,
    PROP_HUNT_HIDER_SURVIVE_POINTS,
    PROP_HUNT_HIDING_MS,
    PROP_HUNT_HUNT_MS,
    PROP_HUNT_LOBBY_POSITION,
    PROP_HUNT_LOBBY_SECONDS,
    PROP_HUNT_MAX_AIM_MISS_DISTANCE,
    PROP_HUNT_MAX_BULLETS,
    PROP_HUNT_MAX_HIT_POINT_DISTANCE,
    PROP_HUNT_MAX_SHOT_RANGE,
    PROP_HUNT_MIN_PLAYERS,
    PROP_HUNT_PARTICIPATION_POINTS,
    PROP_HUNT_PLAYER_CENTER_OFFSET_Y,
    PROP_HUNT_PORTAL,
    PROP_HUNT_PROP_IDS,
    PROP_HUNT_RESTRICTION_CORNERS,
    PROP_HUNT_RESTRICTION_MAX_Y,
    PROP_HUNT_RESTRICTION_MIN_Y,
    PROP_HUNT_RESULTS_MS,
    PROP_HUNT_RETURN_POSITION,
    PROP_HUNT_ROOM,
    PROP_HUNT_SEEKER_WIN_POINTS,
    PROP_HUNT_WRONG_SHOT_PENALTY_MS,
    PROP_HUNT_RESTRICTION_BOUNDS
} from "./propHuntDefinitions.js";

const socketHandlers = new Map();

const state = {
    phase: "IDLE",
    roundId: 0,
    phaseEndsAt: null,
    seekerSocketId: null,
    finishing: false,
    lobbyCount: PROP_HUNT_LOBBY_SECONDS
};

let lobbyInterval = null;
let phaseTimer = null;
let resultsTimer = null;

function clearTimers() {
    clearInterval(lobbyInterval);
    clearTimeout(phaseTimer);
    clearTimeout(resultsTimer);
    lobbyInterval = null;
    phaseTimer = null;
    resultsTimer = null;
}

function handlersFor(socket) {
    return socketHandlers.get(socket.id) || null;
}

function playerFor(socket) {
    return handlersFor(socket)?.getPlayer?.() || null;
}

function getRoomSockets(io) {
    const ids = io.sockets.adapter.rooms.get(PROP_HUNT_ROOM);
    if (!ids) return [];
    return [...ids]
        .map((id) => io.sockets.sockets.get(id))
        .filter(Boolean);
}

function finiteVector(value) {
    return value && [value.x, value.y, value.z].every(Number.isFinite);
}

function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

function horizontalDistance(a, b) {
    return Math.hypot(a.x - b.x, a.z - b.z);
}

function normalizePropYaw(value) {
    if (!Number.isFinite(value)) return 0;

    const fullTurn = Math.PI * 2;
    let yaw = value % fullTurn;

    if (yaw > Math.PI) yaw -= fullTurn;
    if (yaw < -Math.PI) yaw += fullTurn;

    return yaw;
}

function insideArea(position, area) {
    return position.x >= area.minX && position.x <= area.maxX
        && position.y >= area.minY && position.y <= area.maxY
        && position.z >= area.minZ && position.z <= area.maxZ;
}



// Prop Hunt polygon restriction helpers start
function clampNumber(value, min, max) {
    const number = Number(value);
    if (!Number.isFinite(number)) return min;
    return Math.max(min, Math.min(max, number));
}

function pointInsideRestrictionRect(position) {
    if (!finiteVector(position)) return false;

    return (
        position.x >= PROP_HUNT_RESTRICTION_BOUNDS.minX &&
        position.x <= PROP_HUNT_RESTRICTION_BOUNDS.maxX &&
        position.z >= PROP_HUNT_RESTRICTION_BOUNDS.minZ &&
        position.z <= PROP_HUNT_RESTRICTION_BOUNDS.maxZ &&
        position.y >= PROP_HUNT_RESTRICTION_BOUNDS.minY &&
        position.y <= PROP_HUNT_RESTRICTION_BOUNDS.maxY
    );
}

function nearestPropHuntPlayablePosition(currentPosition, requestedPosition) {
    const source = finiteVector(requestedPosition)
        ? requestedPosition
        : finiteVector(currentPosition)
            ? currentPosition
            : {
                x: (PROP_HUNT_RESTRICTION_BOUNDS.minX + PROP_HUNT_RESTRICTION_BOUNDS.maxX) / 2,
                y: 1.0,
                z: (PROP_HUNT_RESTRICTION_BOUNDS.minZ + PROP_HUNT_RESTRICTION_BOUNDS.maxZ) / 2
            };

    const margin = 0.18;

    return {
        x: clampNumber(
            source.x,
            PROP_HUNT_RESTRICTION_BOUNDS.minX + margin,
            PROP_HUNT_RESTRICTION_BOUNDS.maxX - margin
        ),
        y: clampNumber(
            source.y,
            PROP_HUNT_RESTRICTION_BOUNDS.minY,
            PROP_HUNT_RESTRICTION_BOUNDS.maxY
        ),
        z: clampNumber(
            source.z,
            PROP_HUNT_RESTRICTION_BOUNDS.minZ + margin,
            PROP_HUNT_RESTRICTION_BOUNDS.maxZ - margin
        )
    };
}

export function isInsidePropHuntArea(position) {
    if (!finiteVector(position)) return false;
    return pointInsideRestrictionRect(position);
}

function squaredDistance(a, b) {
    return (
        (a.x - b.x) ** 2 +
        (a.y - b.y) ** 2 +
        (a.z - b.z) ** 2
    );
}

function closestPropHuntPlayablePosition(position) {
    if (!finiteVector(position)) {
        return null;
    }

    let bestPosition =
        null;

    let bestDistance =
        Number.POSITIVE_INFINITY;

    for (const area of PROP_HUNT_AREAS) {
        const margin =
            0.22;

        const candidate = {
            x:
                clampNumber(
                    position.x,
                    area.minX + margin,
                    area.maxX - margin
                ),

            y:
                clampNumber(
                    position.y,
                    area.minY + margin,
                    area.maxY - margin
                ),

            z:
                clampNumber(
                    position.z,
                    area.minZ + margin,
                    area.maxZ - margin
                )
        };

        const candidateDistance =
            squaredDistance(
                position,
                candidate
            );

        if (candidateDistance < bestDistance) {
            bestDistance =
                candidateDistance;

            bestPosition =
                candidate;
        }
    }

    return bestPosition;
}

function distanceToPortal(position) {
    return distance(position, PROP_HUNT_PORTAL);
}

function publicParticipants(io) {
    return getRoomSockets(io).map((socket) => ({
        socketId: socket.id,
        role: socket.data.propHuntRole || "SPECTATOR",
        caught: Boolean(socket.data.propHuntCaught),
        propId: socket.data.propHuntPropId || null,
        propYaw: normalizePropYaw(socket.data.propHuntPropYaw),
        propLocked: Boolean(socket.data.propHuntPropLocked)
    }));
}

function emitParticipants(io) {
    io.to(PROP_HUNT_ROOM).emit(
        "propHunt:participants",
        publicParticipants(io)
    );
}

function emitPhase(io) {
    io.to(PROP_HUNT_ROOM).emit("propHunt:phase", {
        phase: state.phase,
        roundId: state.roundId,
        endsAt: state.phaseEndsAt
    });
}

function resetSocketForLobby(socket) {
    socket.data.propHuntRole = "WAITING";
    socket.data.propHuntCaught = false;
    socket.data.propHuntPropId = null;
    socket.data.propHuntPropYaw = 0;
    socket.data.propHuntPropLocked = false;
    socket.data.propHuntLastOrientationAt = 0;
    socket.data.propHuntNextShotAt = 0;
    socket.data.propHuntBulletsRemaining = 0;
    socket.data.propHuntElevatorRequest = null;
}

function setSpectator(socket) {
    socket.data.propHuntRole = "SPECTATOR";
    socket.data.propHuntCaught = true;
    socket.data.propHuntPropId = null;
    socket.data.propHuntPropYaw = 0;
    socket.data.propHuntPropLocked = false;
    socket.data.propHuntLastOrientationAt = 0;
    socket.data.propHuntNextShotAt = 0;
    socket.data.propHuntBulletsRemaining = 0;
    socket.data.propHuntElevatorRequest = null;
}

function clearPropHuntState(socket) {
    socket.data.inPropHunt = false;
    socket.data.propHuntRole = "NONE";
    socket.data.propHuntCaught = false;
    socket.data.propHuntPropId = null;
    socket.data.propHuntPropYaw = 0;
    socket.data.propHuntPropLocked = false;
    socket.data.propHuntLastOrientationAt = 0;
    socket.data.propHuntNextShotAt = 0;
    socket.data.propHuntBulletsRemaining = 0;
    socket.data.propHuntElevatorRequest = null;
}

function lobbySpawn(index) {
    const columns = 4;
    const col = index % columns;
    const row = Math.floor(index / columns);
    return {
        x: PROP_HUNT_LOBBY_POSITION.x + (col - 1.5) * 1.3,
        y: PROP_HUNT_LOBBY_POSITION.y,
        z: PROP_HUNT_LOBBY_POSITION.z + row * 1.3
    };
}

function teleport(socket, position, reason) {
    const player = playerFor(socket);
    if (!player || !finiteVector(position)) return;

    player.position = { ...position };
    socket.data.lastMoveAt = Date.now();

    try {
        handlersFor(socket)?.onTeleport?.(player, position, reason);
    } catch (error) {
        console.error("Prop Hunt teleport callback failed:", error.message);
    }

    socket.emit("propHunt:teleport", {
        position: { ...position },
        reason
    });
}

function randomProp() {
    return PROP_HUNT_PROP_IDS[
        Math.floor(Math.random() * PROP_HUNT_PROP_IDS.length)
    ];
}

function activeHiders(io) {
    return getRoomSockets(io).filter((socket) =>
        socket.data.propHuntRole === "HIDER"
        && !socket.data.propHuntCaught
    );
}

function seekerSocket(io) {
    if (!state.seekerSocketId) return null;
    return io.sockets.sockets.get(state.seekerSocketId) || null;
}

async function saveReward(socket, points) {
    if (!Number.isSafeInteger(points) || points <= 0) {
        return null;
    }

    const player = playerFor(socket);
    if (!player) return null;

    try {
        const account = player.accountType === "user"
            ? await addUserPoints(player.userId, points)
            : await addGuestPoints(player.guestCode, points);

        if (account) {
            socket.emit("player:pointsUpdated", {
                points: account.points
            });
        }

        return account;
    } catch (error) {
        console.error("Could not save Prop Hunt reward:", error.message);
        return null;
    }
}

async function broadcastLeaderboard(io) {
    try {
        io.emit("leaderboard:updated", await getTopPlayers(5));
    } catch (error) {
        console.error("Could not refresh leaderboard after Prop Hunt:", error.message);
    }
}

function setIdle() {
    clearTimers();
    state.phase = "IDLE";
    state.phaseEndsAt = null;
    state.seekerSocketId = null;
    state.finishing = false;
    state.lobbyCount = PROP_HUNT_LOBBY_SECONDS;
}

function ensureStopsWhenEmpty(io) {
    if (getRoomSockets(io).length > 0) return false;
    setIdle();
    return true;
}

async function finishRound(io, winner) {
    if (
        state.finishing
        || (state.phase !== "HIDING" && state.phase !== "HUNT")
    ) {
        return;
    }

    state.finishing = true;
    clearTimeout(phaseTimer);
    phaseTimer = null;
    state.phase = "FINISHED";
    state.phaseEndsAt = Date.now() + PROP_HUNT_RESULTS_MS;

    const sockets = getRoomSockets(io);
    const survivors = sockets
        .filter((socket) =>
            socket.data.propHuntRole === "HIDER"
            && !socket.data.propHuntCaught
        )
        .map((socket) => socket.id);

    emitPhase(io);
    io.to(PROP_HUNT_ROOM).emit("propHunt:finished", {
        winner,
        roundId: state.roundId,
        survivorSocketIds: survivors,
        endsAt: state.phaseEndsAt
    });

    let anyRewardSaved = false;

    await Promise.all(
        sockets.map(async (socket) => {
            const role = socket.data.propHuntRole;
            let points = 0;

            if (role === "SEEKER") {
                points = winner === "SEEKER"
                    ? PROP_HUNT_SEEKER_WIN_POINTS
                    : PROP_HUNT_PARTICIPATION_POINTS;
            } else if (role === "HIDER") {
                points = !socket.data.propHuntCaught && winner === "HIDERS"
                    ? PROP_HUNT_HIDER_SURVIVE_POINTS
                    : PROP_HUNT_PARTICIPATION_POINTS;
            }

            const account = await saveReward(socket, points);
            anyRewardSaved ||= Boolean(account);

            socket.emit("propHunt:personalResult", {
                winner,
                role,
                caught: Boolean(socket.data.propHuntCaught),
                pointsEarned: account ? points : 0,
                totalPoints: account?.points ?? null
            });
        })
    );

    if (anyRewardSaved) {
        await broadcastLeaderboard(io);
    }

    state.finishing = false;

    resultsTimer = setTimeout(() => {
        if (getRoomSockets(io).length === 0) {
            setIdle();
            return;
        }
        startLobby(io);
    }, PROP_HUNT_RESULTS_MS);
}

function checkRoundStatus(io) {
    if (state.phase !== "HUNT") return;

    const seeker = seekerSocket(io);
    if (!seeker || !seeker.connected) {
        void finishRound(io, "HIDERS");
        return;
    }

    if (activeHiders(io).length === 0) {
        void finishRound(io, "SEEKER");
    }
}

function startHunt(io) {
    if (state.phase !== "HIDING") return;

    const seeker = seekerSocket(io);
    if (!seeker || !seeker.connected) {
        void finishRound(io, "HIDERS");
        return;
    }

    state.phase = "HUNT";
    state.phaseEndsAt = Date.now() + PROP_HUNT_HUNT_MS;

    seeker.data.propHuntBulletsRemaining =
        PROP_HUNT_MAX_BULLETS;

    seeker.emit(
        "propHunt:ammo",
        {
            remaining:
                seeker.data.propHuntBulletsRemaining,
            max:
                PROP_HUNT_MAX_BULLETS
        }
    );

    emitPhase(io);

    phaseTimer = setTimeout(
        () => void finishRound(io, "HIDERS"),
        PROP_HUNT_HUNT_MS
    );

    checkRoundStatus(io);
}

function startHiding(io) {
    const sockets = getRoomSockets(io);
    if (sockets.length < PROP_HUNT_MIN_PLAYERS) {
        startLobby(io);
        return;
    }

    clearInterval(lobbyInterval);
    lobbyInterval = null;
    clearTimeout(phaseTimer);
    phaseTimer = null;
    clearTimeout(resultsTimer);
    resultsTimer = null;

    state.phase = "HIDING";
    state.roundId += 1;
    state.phaseEndsAt = Date.now() + PROP_HUNT_HIDING_MS;
    state.finishing = false;

    const seekerIndex = Math.floor(Math.random() * sockets.length);
    const seeker = sockets[seekerIndex];
    state.seekerSocketId = seeker.id;

    sockets.forEach((socket, index) => {
        socket.data.propHuntCaught = false;
        socket.data.propHuntNextShotAt = 0;
        socket.data.propHuntBulletsRemaining = 0;
        socket.data.propHuntElevatorRequest = null;

        if (socket.id === seeker.id) {
            socket.data.propHuntRole = "SEEKER";
            socket.data.propHuntPropId = null;
            socket.data.propHuntPropYaw = 0;
            socket.data.propHuntPropLocked = false;
        } else {
            socket.data.propHuntRole = "HIDER";
            socket.data.propHuntPropId = randomProp();

            const player =
                playerFor(socket);

            socket.data.propHuntPropYaw =
                normalizePropYaw(
                    Number(
                        player?.rotation?.y
                    ) || 0
                );

            socket.data.propHuntPropLocked =
                false;
        }

        socket.data.propHuntLastOrientationAt =
            0;

        teleport(socket, lobbySpawn(index), "round-start");
        socket.emit("propHunt:role", {
            role: socket.data.propHuntRole,
            propId: socket.data.propHuntPropId,
            propYaw: normalizePropYaw(socket.data.propHuntPropYaw),
            propLocked: Boolean(socket.data.propHuntPropLocked)
        });
    });

    emitParticipants(io);
    emitPhase(io);

    phaseTimer = setTimeout(
        () => startHunt(io),
        PROP_HUNT_HIDING_MS
    );
}

function emitLobbyState(io) {
    io.to(PROP_HUNT_ROOM).emit("propHunt:lobby", {
        countdown: state.lobbyCount,
        playerCount: getRoomSockets(io).length,
        minPlayers: PROP_HUNT_MIN_PLAYERS
    });
}

function startLobby(io) {
    const sockets = getRoomSockets(io);
    if (sockets.length === 0) {
        setIdle();
        return;
    }

    clearTimers();
    state.phase = "LOBBY";
    state.phaseEndsAt = null;
    state.seekerSocketId = null;
    state.finishing = false;
    state.lobbyCount = PROP_HUNT_LOBBY_SECONDS;

    sockets.forEach((socket, index) => {
        resetSocketForLobby(socket);
        teleport(socket, lobbySpawn(index), "lobby");
        socket.emit("propHunt:role", {
            role: "WAITING",
            propId: null
        });
    });

    emitParticipants(io);
    emitPhase(io);
    emitLobbyState(io);

    lobbyInterval = setInterval(() => {
        const currentSockets = getRoomSockets(io);

        if (currentSockets.length < PROP_HUNT_MIN_PLAYERS) {
            state.lobbyCount = PROP_HUNT_LOBBY_SECONDS;
            emitLobbyState(io);
            return;
        }

        state.lobbyCount -= 1;
        emitLobbyState(io);

        if (state.lobbyCount <= 0) {
            clearInterval(lobbyInterval);
            lobbyInterval = null;
            startHiding(io);
        }
    }, 1000);
}

function elevatorStopPosition(shaft, floorNumber) {
    const surfaceY = PROP_HUNT_FLOOR_SURFACE_Y[floorNumber - 1];
    if (!Number.isFinite(surfaceY)) return null;
    return {
        x: shaft.x,
        y: surfaceY + PROP_HUNT_PLAYER_CENTER_OFFSET_Y,
        z: shaft.z
    };
}

function currentElevatorFloor(position, shaft) {
    if (
        horizontalDistance(position, shaft) > PROP_HUNT_ELEVATOR_HORIZONTAL_RADIUS
    ) {
        return null;
    }

    for (let floor = 1; floor <= PROP_HUNT_FLOOR_SURFACE_Y.length; floor += 1) {
        const stop = elevatorStopPosition(shaft, floor);
        if (
            stop
            && Math.abs(position.y - stop.y) <= PROP_HUNT_ELEVATOR_VERTICAL_TOLERANCE
        ) {
            return floor;
        }
    }

    return null;
}

function normalizedDirection(direction) {
    if (!finiteVector(direction)) return null;
    const length = Math.hypot(direction.x, direction.y, direction.z);
    if (!Number.isFinite(length) || length < 0.0001) return null;
    return {
        x: direction.x / length,
        y: direction.y / length,
        z: direction.z / length
    };
}

function shotCanHitTarget(origin, direction, targetPosition, hitPoint) {
    const toTarget = {
        x: targetPosition.x - origin.x,
        y: targetPosition.y - origin.y,
        z: targetPosition.z - origin.z
    };

    const targetDistance = Math.hypot(toTarget.x, toTarget.y, toTarget.z);
    if (targetDistance > PROP_HUNT_MAX_SHOT_RANGE) return false;

    const projection =
        toTarget.x * direction.x
        + toTarget.y * direction.y
        + toTarget.z * direction.z;

    if (projection < 0 || projection > PROP_HUNT_MAX_SHOT_RANGE + 2) {
        return false;
    }

    const perpendicularSquared = Math.max(
        0,
        targetDistance * targetDistance - projection * projection
    );

    if (Math.sqrt(perpendicularSquared) > PROP_HUNT_MAX_AIM_MISS_DISTANCE) {
        return false;
    }

    if (
        finiteVector(hitPoint)
        && distance(hitPoint, targetPosition) > PROP_HUNT_MAX_HIT_POINT_DISTANCE
    ) {
        return false;
    }

    return true;
}

export function validatePropHuntMovement(socket, player, nextPosition) {
    if (!socket.data.inPropHunt) {
        return { ok: true };
    }

    if (!player || !finiteVector(nextPosition)) {
        return { ok: false, reason: "invalid_position" };
    }

    if (!isInsidePropHuntArea(nextPosition)) {
        return {
            ok: false,
            reason: "out_of_bounds",
            correction: nearestPropHuntPlayablePosition(player?.position, nextPosition)
        };
    }

    const role = socket.data.propHuntRole;

    // Spectators cannot move during an active Prop Hunt round.
    // Caught Hiders are allowed to move as invisible ghosts until the round ends.
    if (role === "SPECTATOR") {
        return { ok: false, reason: "spectator_locked" };
    }

    if (state.phase === "HIDING" && role === "SEEKER") {
        return { ok: false, reason: "seeker_waiting" };
    }

    if (state.phase === "FINISHED") {
        return { ok: false, reason: "round_finished" };
    }

    return { ok: true };
}

export function registerPropHuntSocket(
    io,
    socket,
    getPlayer,
    {
        onEnter,
        onExit,
        onTeleport
    } = {}
) {
    socketHandlers.set(socket.id, {
        getPlayer,
        onEnter,
        onExit,
        onTeleport
    });

    socket.on("propHunt:join", async () => {
        // A stale inPropHunt flag can survive an interrupted leave flow.
        // If the socket is no longer in the Prop Hunt room, repair it.
        if (
            socket.data.inPropHunt &&
            !socket.rooms.has(PROP_HUNT_ROOM)
        ) {
            console.warn(
                `[PropHunt] Repairing stale session state for ${socket.id}`
            );

            clearPropHuntState(
                socket
            );
        }

        // Never silently ignore a join request. The client must receive
        // either propHunt:started or propHunt:error.
        if (
            socket.data.inPropHunt
        ) {
            socket.emit(
                "propHunt:error",
                "You are already inside Prop Hunt."
            );

            return;
        }

        const player = getPlayer();
        if (!player) {
            socket.emit("propHunt:error", "Join multiplayer before entering Prop Hunt.");
            return;
        }

        if (socket.data.inRlgl || socket.data.inCampusQuiz || socket.data.inCarRace) {
            socket.emit("propHunt:error", "Leave the current minigame before entering Prop Hunt.");
            return;
        }

        if (distanceToPortal(player.position) > PROP_HUNT_PORTAL.radius) {
            socket.emit("propHunt:error", "Move into the Prop Hunt portal to join.");
            return;
        }

        try {
            await onEnter?.(player);
        } catch (error) {
            console.error("Could not pause campus activity for Prop Hunt:", error.message);
        }

        await socket.join(PROP_HUNT_ROOM);
        socket.data.inPropHunt = true;
        resetSocketForLobby(socket);

        socket.emit("propHunt:started", {
            phase: state.phase,
            roundId: state.roundId,
            minPlayers: PROP_HUNT_MIN_PLAYERS,
            hidingMs: PROP_HUNT_HIDING_MS,
            huntMs: PROP_HUNT_HUNT_MS,
            propIds: PROP_HUNT_PROP_IDS
        });

        if (state.phase === "IDLE") {
            startLobby(io);
            return;
        }

        if (state.phase === "LOBBY") {
            teleport(socket, lobbySpawn(getRoomSockets(io).length - 1), "join-lobby");
            socket.emit("propHunt:role", { role: "WAITING", propId: null });
            emitParticipants(io);
            emitPhase(io);
            emitLobbyState(io);
            return;
        }

        // Joining a live round means spectating until the next lobby.
        setSpectator(socket);
        teleport(socket, lobbySpawn(getRoomSockets(io).length - 1), "spectator");
        socket.emit("propHunt:role", { role: "SPECTATOR", propId: null });
        emitParticipants(io);
        emitPhase(io);
    });

    socket.on("propHunt:propOrientation", (payload = {}) => {
        if (!socket.data.inPropHunt) return;
        if (socket.data.propHuntRole !== "HIDER") return;
        if (socket.data.propHuntCaught) return;
        if (state.phase !== "HIDING" && state.phase !== "HUNT") return;

        const yaw =
            Number(payload.yaw);

        if (!Number.isFinite(yaw)) {
            return;
        }

        const now =
            Date.now();

        // The client normally sends at about 10-12 Hz. Keep a hard server
        // limit so orientation replication cannot become a spam path.
        if (
            now -
            (socket.data.propHuntLastOrientationAt || 0) <
            45
        ) {
            return;
        }

        socket.data.propHuntLastOrientationAt =
            now;

        socket.data.propHuntPropYaw =
            normalizePropYaw(
                yaw
            );

        socket.data.propHuntPropLocked =
            Boolean(
                payload.locked
            );

        socket
            .to(
                PROP_HUNT_ROOM
            )
            .emit(
                "propHunt:propOrientation",
                {
                    socketId:
                        socket.id,
                    yaw:
                        socket.data.propHuntPropYaw,
                    locked:
                        socket.data.propHuntPropLocked
                }
            );
    });

    socket.on("propHunt:elevatorRequest", ({ shaftId, targetFloor } = {}) => {
        if (!socket.data.inPropHunt) return;

        const player = getPlayer();
        if (!player) return;

        const role = socket.data.propHuntRole;
        const liveRole = role === "HIDER" || role === "SEEKER";
        const livePhase = state.phase === "HIDING" || state.phase === "HUNT";

        if (!liveRole || !livePhase || socket.data.propHuntCaught) return;
        if (state.phase === "HIDING" && role === "SEEKER") return;

        const shaft = PROP_HUNT_ELEVATORS.find((item) => item.id === shaftId);
        const floor = Number(targetFloor);
        if (!shaft || !Number.isInteger(floor) || floor < 1 || floor > 11) return;

        const sourceFloor = currentElevatorFloor(player.position, shaft);
        if (!sourceFloor || sourceFloor === floor) return;

        const target = elevatorStopPosition(shaft, floor);
        if (!target || !isInsidePropHuntArea(target)) return;

        const requestId = randomUUID();
        socket.data.propHuntElevatorRequest = {
            requestId,
            shaftId: shaft.id,
            sourceFloor,
            targetFloor: floor,
            target,
            expiresAt: Date.now() + 12_000
        };

        socket.emit("propHunt:elevatorAuthorized", {
            requestId,
            shaftId: shaft.id,
            sourceFloor,
            targetFloor: floor,
            target
        });
    });

    socket.on("propHunt:elevatorReady", ({ requestId } = {}) => {
        if (!socket.data.inPropHunt) return;
        const request = socket.data.propHuntElevatorRequest;
        if (!request || request.requestId !== requestId) return;

        if (Date.now() > request.expiresAt) {
            socket.data.propHuntElevatorRequest = null;
            socket.emit("propHunt:elevatorError", "Elevator loading timed out. Please try again.");
            return;
        }

        socket.data.propHuntElevatorRequest = null;
        teleport(socket, request.target, "elevator");
    });

    socket.on("propHunt:elevatorCancel", ({ requestId } = {}) => {
        const request = socket.data.propHuntElevatorRequest;
        if (request?.requestId === requestId) {
            socket.data.propHuntElevatorRequest = null;
        }
    });

    socket.on("propHunt:shoot", (payload = {}) => {
        if (
            !socket.data.inPropHunt ||
            state.phase !== "HUNT"
        ) {
            return;
        }

        if (
            socket.data.propHuntRole !==
                "SEEKER" ||
            socket.data.propHuntCaught
        ) {
            return;
        }

        const shooter =
            getPlayer();

        if (!shooter) {
            return;
        }

        const now =
            Date.now();

        if (
            now <
            (
                socket.data
                    .propHuntNextShotAt ||
                0
            )
        ) {
            return;
        }

        const origin =
            finiteVector(
                payload.origin
            )
                ? payload.origin
                : {
                    x:
                        shooter.position.x,
                    y:
                        shooter.position.y +
                        0.7,
                    z:
                        shooter.position.z
                };

        const direction =
            normalizedDirection(
                payload.direction
            );

        if (
            !direction ||
            distance(
                origin,
                shooter.position
            ) >
                2.5
        ) {
            return;
        }

        const claimedTarget =
            typeof payload.targetSocketId ===
                "string"
                ? io.sockets.sockets.get(
                    payload.targetSocketId
                )
                : null;

        let validTarget =
            null;

        if (
            claimedTarget &&
            claimedTarget.data.inPropHunt &&
            claimedTarget.data.propHuntRole ===
                "HIDER" &&
            !claimedTarget.data.propHuntCaught
        ) {
            const targetPlayer =
                playerFor(
                    claimedTarget
                );

            if (
                targetPlayer &&
                shotCanHitTarget(
                    origin,
                    direction,
                    targetPlayer.position,
                    payload.hitPoint
                )
            ) {
                validTarget =
                    claimedTarget;
            }
        }

        const shotCooldownMs =
            validTarget
                ? PROP_HUNT_FIRE_COOLDOWN_MS
                : PROP_HUNT_WRONG_SHOT_PENALTY_MS;

        socket.data.propHuntNextShotAt =
            now +
            shotCooldownMs;

        const fallbackHitPoint = {
            x:
                origin.x +
                direction.x *
                PROP_HUNT_MAX_SHOT_RANGE,
            y:
                origin.y +
                direction.y *
                PROP_HUNT_MAX_SHOT_RANGE,
            z:
                origin.z +
                direction.z *
                PROP_HUNT_MAX_SHOT_RANGE
        };

        let hitPoint =
            finiteVector(
                payload.hitPoint
            )
                ? payload.hitPoint
                : fallbackHitPoint;

        if (
            distance(
                origin,
                hitPoint
            ) >
            PROP_HUNT_MAX_SHOT_RANGE +
                2
        ) {
            hitPoint =
                fallbackHitPoint;
        }

        io.to(
            PROP_HUNT_ROOM
        ).emit(
            "propHunt:shot",
            {
                shooterSocketId:
                    socket.id,
                targetSocketId:
                    validTarget?.id ||
                    null,
                origin,
                hitPoint,
                cooldownMs:
                    shotCooldownMs
            }
        );

        if (!validTarget) {
            return;
        }

        validTarget.data.propHuntCaught =
            true;

        validTarget.data.propHuntElevatorRequest =
            null;

        io.to(
            PROP_HUNT_ROOM
        ).emit(
            "propHunt:playerCaught",
            {
                socketId:
                    validTarget.id,
                bySocketId:
                    socket.id,
                hitPoint
            }
        );

        validTarget.emit(
            "propHunt:caught",
            {
                bySocketId:
                    socket.id
            }
        );

        emitParticipants(
            io
        );

        setTimeout(
            () => {
                if (
                    !validTarget.connected ||
                    !validTarget.data.inPropHunt
                ) {
                    return;
                }

                teleport(
                    validTarget,
                    PROP_HUNT_LOBBY_POSITION,
                    "caught"
                );

                checkRoundStatus(
                    io
                );
            },
            250
        );
    });

    socket.on("propHunt:leave", async () => {
        if (!socket.data.inPropHunt) return;

        const role = socket.data.propHuntRole;
        const player = getPlayer();
        const wasLive = state.phase === "HIDING" || state.phase === "HUNT";
        const wasSeeker = role === "SEEKER";

        clearPropHuntState(
            socket
        );

        await socket.leave(
            PROP_HUNT_ROOM
        );

        if (player) {
            teleport(socket, PROP_HUNT_RETURN_POSITION, "leave");
            try {
                await onExit?.(player);
            } catch (error) {
                console.error("Could not resume campus activity after Prop Hunt:", error.message);
            }
        }

        socket.emit("propHunt:left");

        if (ensureStopsWhenEmpty(io)) return;

        if (wasLive && wasSeeker) {
            void finishRound(io, "HIDERS");
            return;
        }

        if (wasLive) {
            checkRoundStatus(io);
        } else if (state.phase === "LOBBY") {
            emitLobbyState(io);
            emitParticipants(io);
        }
    });

    socket.on("disconnect", () => {
        const wasInPropHunt = Boolean(socket.data.inPropHunt);
        const role = socket.data.propHuntRole;
        const wasLive = state.phase === "HIDING" || state.phase === "HUNT";
        socketHandlers.delete(socket.id);

        if (!wasInPropHunt) return;

        setTimeout(() => {
            if (ensureStopsWhenEmpty(io)) return;

            if (wasLive && role === "SEEKER") {
                void finishRound(io, "HIDERS");
                return;
            }

            if (wasLive) {
                checkRoundStatus(io);
            } else if (state.phase === "LOBBY") {
                emitLobbyState(io);
                emitParticipants(io);
            }
        }, 0);
    });
}
