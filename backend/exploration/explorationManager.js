// backend/exploration/explorationManager.js
import { getTopPlayers } from "../models/leaderboardModel.js";
import { completeExplorationAndReward, getExplorationProgress, markExplorationVisit } from "../models/explorationModel.js";
import { CAMPUS_EXPLORATION_LOCATIONS, EXPLORATION_REWARD_POINTS } from "./explorationDefinitions.js";

function reached(position, location) {
    return Math.hypot(position.x - location.position.x, position.z - location.position.z) <= location.horizontalRadius
        && Math.abs(position.y - location.position.y) <= location.verticalTolerance;
}

function publicState(visitedIds, completed) {
    const visited = new Set(visitedIds);
    return {
        completed,
        rewardPoints: EXPLORATION_REWARD_POINTS,
        visitedCount: visited.size,
        totalCount: CAMPUS_EXPLORATION_LOCATIONS.length,
        locations: CAMPUS_EXPLORATION_LOCATIONS.map((location) => ({
            id: location.id,
            title: location.title,
            visited: visited.has(location.id)
        }))
    };
}

export async function initializeCampusExploration(socket, player) {
    const progress = await getExplorationProgress(player);
    socket.data.explorationVisitedIds = new Set(progress.visitedIds);
    socket.data.explorationCompleted = Boolean(progress.completed);
    socket.emit("exploration:state", publicState(progress.visitedIds, progress.completed));
    return { completed: Boolean(progress.completed) };
}

export async function checkCampusExplorationProgress(io, socket, player) {
    if (!player || socket.data.inRlgl || socket.data.explorationCompleted || socket.data.explorationChecking) {
        return { completedNow: false };
    }
    socket.data.explorationChecking = true;
    try {
        const visited = socket.data.explorationVisitedIds instanceof Set
            ? socket.data.explorationVisitedIds
            : new Set();
        socket.data.explorationVisitedIds = visited;

        for (const location of CAMPUS_EXPLORATION_LOCATIONS) {
            if (visited.has(location.id) || !reached(player.position, location)) continue;
            await markExplorationVisit(player, location.id);
            visited.add(location.id);
            socket.emit("exploration:visited", {
                id: location.id, title: location.title,
                visitedCount: visited.size, totalCount: CAMPUS_EXPLORATION_LOCATIONS.length
            });
            socket.emit("exploration:state", publicState([...visited], false));
            break;
        }

        if (visited.size < CAMPUS_EXPLORATION_LOCATIONS.length) return { completedNow: false };

        const reward = await completeExplorationAndReward(player, EXPLORATION_REWARD_POINTS);
        socket.data.explorationCompleted = true;
        socket.emit("exploration:state", publicState([...visited], true));
        socket.emit("exploration:completed", {
            pointsEarned: reward.newlyCompleted ? EXPLORATION_REWARD_POINTS : 0,
            rewardSaved: reward.newlyCompleted,
            totalPoints: reward.totalPoints,
            dynamicMissionsUnlocked: true
        });
        if (reward.newlyCompleted) {
            try { io.emit("leaderboard:updated", await getTopPlayers(5)); }
            catch (error) { console.error("Could not refresh leaderboard after exploration:", error.message); }
        }
        return { completedNow: true };
    } finally {
        socket.data.explorationChecking = false;
    }
}
