// backend/missions/missionManager.js

import { addGuestPoints } from "../models/guestModel.js";
import { addUserPoints } from "../models/userModel.js";
import { getTopPlayers } from "../models/leaderboardModel.js";
import { DYNAMIC_MISSIONS } from "./missionDefinitions.js";

const INITIAL_DELAY_MIN_MS = 15_000;
const INITIAL_DELAY_MAX_MS = 30_000;
const NEXT_DELAY_MIN_MS = 20_000;
const NEXT_DELAY_MAX_MS = 35_000;
const RETURN_FROM_MINIGAME_MIN_MS = 8_000;
const RETURN_FROM_MINIGAME_MAX_MS = 15_000;

const LOOK_SAMPLE_MAX_GAP_MS = 350;
const LOOK_SAMPLE_MIN_INTERVAL_MS = 60;

function randomDelay(minMs, maxMs) {
    return Math.floor(minMs + Math.random() * (maxMs - minMs + 1));
}

function clearAssignmentTimer(socket) {
    if (socket.data.dynamicMissionAssignmentTimer) {
        clearTimeout(socket.data.dynamicMissionAssignmentTimer);
        socket.data.dynamicMissionAssignmentTimer = null;
    }
}

function clearExpirationTimer(socket) {
    if (socket.data.dynamicMissionExpirationTimer) {
        clearTimeout(socket.data.dynamicMissionExpirationTimer);
        socket.data.dynamicMissionExpirationTimer = null;
    }
}

function clearActiveMission(socket) {
    clearExpirationTimer(socket);
    socket.data.dynamicMission = null;
    socket.data.dynamicMissionCompleting = false;
    socket.data.dynamicMissionLastLookSampleAt = 0;
}

function publicMission(mission, expiresAt) {
    return {
        id: mission.id,
        type: mission.type,
        title: mission.title,
        description: mission.description,
        position: { ...mission.position },
        horizontalRadius: mission.horizontalRadius,
        verticalTolerance: mission.verticalTolerance,
        rewardPoints: mission.rewardPoints,
        expiresAt,
        ...(mission.type === "look_at_target"
            ? {
                targetName: mission.targetName || mission.title,
                lookTarget: { ...mission.lookTarget },
                requiredLookMs: mission.requiredLookMs,
                lookAngleDegrees: mission.lookAngleDegrees,
                showMarker: mission.showMarker !== false,
                revealDistance: mission.revealDistance !== false
            }
            : {})
    };
}

function isFiniteVector(value) {
    return value
        && Number.isFinite(value.x)
        && Number.isFinite(value.y)
        && Number.isFinite(value.z);
}

function vectorDistance(a, b) {
    return Math.hypot(
        a.x - b.x,
        a.y - b.y,
        a.z - b.z
    );
}

function isMissionReached(playerPosition, mission) {
    const horizontalDistance = Math.hypot(
        playerPosition.x - mission.position.x,
        playerPosition.z - mission.position.z
    );
    const verticalDistance = Math.abs(playerPosition.y - mission.position.y);

    return horizontalDistance <= mission.horizontalRadius
        && verticalDistance <= mission.verticalTolerance;
}

function resetLookProgress(socket, state, {
    inRange = false,
    looking = false,
    emit = true
} = {}) {
    if (!state) return;

    const hadProgress = Boolean(
        state.lookStartedAt
        || state.lookLastValidAt
        || state.lookProgressMs
    );

    state.lookStartedAt = null;
    state.lookLastValidAt = null;
    state.lookProgressMs = 0;

    if (emit && (hadProgress || inRange)) {
        socket.emit("mission:lookProgress", {
            id: state.id,
            progressMs: 0,
            requiredMs: state.mission.requiredLookMs,
            inRange,
            looking
        });
    }
}

function chooseMission(socket, player) {
    let candidates = DYNAMIC_MISSIONS.filter((mission) =>
        mission.id !== socket.data.dynamicMissionLastId
        && !isMissionReached(player.position, mission)
    );

    if (candidates.length === 0) {
        candidates = DYNAMIC_MISSIONS.filter((mission) =>
            !isMissionReached(player.position, mission)
        );
    }

    if (candidates.length === 0) candidates = [...DYNAMIC_MISSIONS];

    return candidates[Math.floor(Math.random() * candidates.length)];
}

async function broadcastLeaderboard(io) {
    try {
        io.emit("leaderboard:updated", await getTopPlayers(5));
    } catch (error) {
        console.error("Could not refresh leaderboard after mission:", error.message);
    }
}

function expireMission(io, socket, missionId) {
    const state = socket.data.dynamicMission;
    if (!state || state.id !== missionId || socket.data.dynamicMissionCompleting) return;

    const expiredMission = state.mission;
    const player = state.player;
    clearActiveMission(socket);

    socket.emit("mission:expired", {
        id: expiredMission.id,
        title: expiredMission.title
    });

    scheduleDynamicMission(io, socket, player, {
        minDelayMs: NEXT_DELAY_MIN_MS,
        maxDelayMs: NEXT_DELAY_MAX_MS
    });
}

function assignMission(io, socket, player) {
    if (
        !socket.connected
        || !player
        || socket.data.explorationCompleted !== true
        || socket.data.inRlgl
        || socket.data.dynamicMission
    ) {
        return;
    }

    const mission = chooseMission(socket, player);
    const expiresAt = Date.now() + mission.durationMs;

    socket.data.dynamicMission = {
        id: mission.id,
        mission,
        player,
        expiresAt,
        lookStartedAt: null,
        lookLastValidAt: null,
        lookProgressMs: 0
    };

    socket.data.dynamicMissionLastId = mission.id;
    socket.data.dynamicMissionLastLookSampleAt = 0;

    socket.emit("mission:assigned", publicMission(mission, expiresAt));

    socket.data.dynamicMissionExpirationTimer = setTimeout(() => {
        expireMission(io, socket, mission.id);
    }, mission.durationMs);
}

export function scheduleDynamicMission(
    io,
    socket,
    player,
    { minDelayMs = INITIAL_DELAY_MIN_MS, maxDelayMs = INITIAL_DELAY_MAX_MS } = {}
) {
    if (!socket.connected || !player || socket.data.explorationCompleted !== true) return;

    clearAssignmentTimer(socket);
    if (socket.data.dynamicMission || socket.data.inRlgl) return;

    socket.data.dynamicMissionAssignmentTimer = setTimeout(() => {
        socket.data.dynamicMissionAssignmentTimer = null;
        if (!socket.connected || socket.data.inRlgl || socket.data.dynamicMission) return;
        assignMission(io, socket, player);
    }, randomDelay(minDelayMs, maxDelayMs));
}

async function completeDynamicMission(io, socket, player, state) {
    if (
        !state
        || !player
        || socket.data.dynamicMission !== state
        || socket.data.dynamicMissionCompleting
    ) {
        return;
    }

    socket.data.dynamicMissionCompleting = true;
    clearExpirationTimer(socket);

    let rewardSaved = false;
    let totalPoints = null;

    try {
        const account = player.accountType === "user"
            ? await addUserPoints(player.userId, state.mission.rewardPoints)
            : await addGuestPoints(player.guestCode, state.mission.rewardPoints);

        rewardSaved = Boolean(account);
        totalPoints = account?.points ?? null;
    } catch (error) {
        console.error("Failed to save dynamic mission reward:", error.message);
    }

    const completedMission = state.mission;
    clearActiveMission(socket);

    socket.emit("mission:completed", {
        id: completedMission.id,
        title: completedMission.title,
        pointsEarned: rewardSaved ? completedMission.rewardPoints : 0,
        rewardSaved,
        totalPoints
    });

    if (rewardSaved) {
        socket.emit("player:pointsUpdated", {
            points: totalPoints
        });

        void broadcastLeaderboard(io);
    }

    scheduleDynamicMission(io, socket, player, {
        minDelayMs: NEXT_DELAY_MIN_MS,
        maxDelayMs: NEXT_DELAY_MAX_MS
    });
}

export async function checkDynamicMissionProgress(io, socket, player) {
    const state = socket.data.dynamicMission;

    if (
        !state
        || !player
        || socket.data.inRlgl
        || socket.data.dynamicMissionCompleting
    ) {
        return;
    }

    if (Date.now() > state.expiresAt) {
        expireMission(io, socket, state.id);
        return;
    }

    if (state.mission.type === "look_at_target") {
        if (!isMissionReached(player.position, state.mission)) {
            resetLookProgress(socket, state, {
                inRange: false,
                looking: false,
                emit: true
            });
        }

        return;
    }

    if (!isMissionReached(player.position, state.mission)) return;

    await completeDynamicMission(
        io,
        socket,
        player,
        state
    );
}

export async function checkDynamicMissionLookProgress(
    io,
    socket,
    player,
    payload = {}
) {
    const state = socket.data.dynamicMission;

    if (
        !state
        || !player
        || state.mission.type !== "look_at_target"
        || socket.data.inRlgl
        || socket.data.dynamicMissionCompleting
    ) {
        return;
    }

    const now = Date.now();

    if (now > state.expiresAt) {
        expireMission(io, socket, state.id);
        return;
    }

    if (
        now - (socket.data.dynamicMissionLastLookSampleAt || 0)
        < LOOK_SAMPLE_MIN_INTERVAL_MS
    ) {
        return;
    }

    socket.data.dynamicMissionLastLookSampleAt = now;

    const inRange = isMissionReached(
        player.position,
        state.mission
    );

    if (!inRange) {
        resetLookProgress(socket, state, {
            inRange: false,
            looking: false,
            emit: true
        });
        return;
    }

    const origin = payload.origin;
    const direction = payload.direction;

    if (!isFiniteVector(origin) || !isFiniteVector(direction)) {
        resetLookProgress(socket, state, {
            inRange: true,
            looking: false,
            emit: true
        });
        return;
    }

    if (vectorDistance(origin, player.position) > 2.5) {
        resetLookProgress(socket, state, {
            inRange: true,
            looking: false,
            emit: true
        });
        return;
    }

    const directionLength = Math.hypot(
        direction.x,
        direction.y,
        direction.z
    );

    if (directionLength < 0.0001 || directionLength > 2) {
        resetLookProgress(socket, state, {
            inRange: true,
            looking: false,
            emit: true
        });
        return;
    }

    const forward = {
        x: direction.x / directionLength,
        y: direction.y / directionLength,
        z: direction.z / directionLength
    };

    const target = state.mission.lookTarget;
    const toTarget = {
        x: target.x - origin.x,
        y: target.y - origin.y,
        z: target.z - origin.z
    };

    const targetDistance = Math.hypot(
        toTarget.x,
        toTarget.y,
        toTarget.z
    );

    if (targetDistance < 0.001) {
        resetLookProgress(socket, state, {
            inRange: true,
            looking: false,
            emit: true
        });
        return;
    }

    toTarget.x /= targetDistance;
    toTarget.y /= targetDistance;
    toTarget.z /= targetDistance;

    const dot =
        forward.x * toTarget.x
        + forward.y * toTarget.y
        + forward.z * toTarget.z;

    const minimumDot = Math.cos(
        state.mission.lookAngleDegrees
        * Math.PI
        / 180
    );

    if (dot < minimumDot) {
        resetLookProgress(socket, state, {
            inRange: true,
            looking: false,
            emit: true
        });
        return;
    }

    if (
        !state.lookStartedAt
        || !state.lookLastValidAt
        || now - state.lookLastValidAt > LOOK_SAMPLE_MAX_GAP_MS
    ) {
        state.lookStartedAt = now;
    }

    state.lookLastValidAt = now;
    state.lookProgressMs = Math.max(
        0,
        now - state.lookStartedAt
    );

    socket.emit("mission:lookProgress", {
        id: state.id,
        progressMs: Math.min(
            state.lookProgressMs,
            state.mission.requiredLookMs
        ),
        requiredMs: state.mission.requiredLookMs,
        inRange: true,
        looking: true
    });

    if (state.lookProgressMs < state.mission.requiredLookMs) {
        return;
    }

    await completeDynamicMission(
        io,
        socket,
        player,
        state
    );
}

export function registerDynamicMissionSocket(
    io,
    socket,
    getPlayer
) {
    socket.on(
        "mission:lookSample",
        (payload = {}) => {
            const player = getPlayer?.();

            void checkDynamicMissionLookProgress(
                io,
                socket,
                player,
                payload
            ).catch((error) => {
                console.error(
                    "Dynamic mission look check failed:",
                    error.message
                );
            });
        }
    );
}

export function cancelDynamicMissionForMinigame(socket) {
    clearAssignmentTimer(socket);

    if (socket.data.dynamicMission) {
        socket.emit("mission:cancelled", {
            reason: "minigame"
        });
    }

    clearActiveMission(socket);
}

export function resumeDynamicMissionsAfterMinigame(io, socket, player) {
    if (!socket.connected || !player) return;

    scheduleDynamicMission(io, socket, player, {
        minDelayMs: RETURN_FROM_MINIGAME_MIN_MS,
        maxDelayMs: RETURN_FROM_MINIGAME_MAX_MS
    });
}

export function stopDynamicMissions(socket) {
    clearAssignmentTimer(socket);
    clearActiveMission(socket);
}
