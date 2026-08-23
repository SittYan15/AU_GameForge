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
        expiresAt
    };
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
    if (!socket.connected || !player || socket.data.explorationCompleted !== true || socket.data.inRlgl || socket.data.dynamicMission) return;

    const mission = chooseMission(socket, player);
    const expiresAt = Date.now() + mission.durationMs;

    socket.data.dynamicMission = {
        id: mission.id,
        mission,
        player,
        expiresAt
    };
    socket.data.dynamicMissionLastId = mission.id;

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

export async function checkDynamicMissionProgress(io, socket, player) {
    const state = socket.data.dynamicMission;
    if (!state || !player || socket.data.inRlgl || socket.data.dynamicMissionCompleting) return;

    if (Date.now() > state.expiresAt) {
        expireMission(io, socket, state.id);
        return;
    }

    if (!isMissionReached(player.position, state.mission)) return;

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

    if (rewardSaved) void broadcastLeaderboard(io);

    scheduleDynamicMission(io, socket, player, {
        minDelayMs: NEXT_DELAY_MIN_MS,
        maxDelayMs: NEXT_DELAY_MAX_MS
    });
}

export function cancelDynamicMissionForMinigame(socket) {
    clearAssignmentTimer(socket);

    if (socket.data.dynamicMission) {
        socket.emit("mission:cancelled", { reason: "minigame" });
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
