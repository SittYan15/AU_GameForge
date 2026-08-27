// backend/racing/raceManager.js
import {
    addGuestPoints
} from "../models/guestModel.js";

import {
    getTopPlayers
} from "../models/leaderboardModel.js";

import {
    addUserPoints
} from "../models/userModel.js";

import {
    CAR_RACE_CHECKPOINT_RADIUS,
    CAR_RACE_CHECKPOINTS,
    CAR_RACE_DURATION_MS,
    CAR_RACE_FINISHER_POINTS,
    CAR_RACE_LOBBY_SECONDS,
    CAR_RACE_PORTAL,
    CAR_RACE_RESULTS_MS,
    CAR_RACE_RETURN_POSITION,
    CAR_RACE_REWARDS,
    CAR_RACE_ROOM,
    CAR_RACE_START,
    CAR_RACE_START_HEADING
} from "./raceDefinitions.js";

const socketHandlers =
    new Map();

const raceState = {
    phase: "IDLE",
    roundId: 0,
    startedAt: null,
    endsAt: null,
    results: []
};

let lobbyInterval = null;
let roundTimer = null;
let restartTimer = null;

function clearTimers() {
    clearInterval(lobbyInterval);
    clearTimeout(roundTimer);
    clearTimeout(restartTimer);

    lobbyInterval = null;
    roundTimer = null;
    restartTimer = null;
}

function getRaceSockets(io) {
    const ids =
        io.sockets.adapter.rooms
            .get(
                CAR_RACE_ROOM
            );

    if (!ids) {
        return [];
    }

    return [...ids]
        .map(
            (id) =>
                io.sockets.sockets
                    .get(id)
        )
        .filter(Boolean);
}

function playerFor(socket) {
    return socketHandlers
        .get(socket.id)
        ?.getPlayer?.() ??
        null;
}

function horizontalDistance(
    a,
    b
) {
    return Math.hypot(
        a.x - b.x,
        a.z - b.z
    );
}

function distanceToPortal(
    position
) {
    return Math.hypot(
        position.x -
            CAR_RACE_PORTAL.x,
        position.y -
            CAR_RACE_PORTAL.y,
        position.z -
            CAR_RACE_PORTAL.z
    );
}

function gridPosition(index) {
    const columns = 4;
    const column =
        index % columns;
    const row =
        Math.floor(
            index / columns
        );

    // Route begins westbound (-X), so extra rows sit behind
    // the first row toward +X.
    return {
        x:
            CAR_RACE_START.x +
            row * 4.5,

        y:
            CAR_RACE_START.y +
            0.35,

        z:
            CAR_RACE_START.z +
            (
                column -
                1.5
            ) *
                3.1
    };
}

function spectatorPosition(index) {
    return {
        x:
            CAR_RACE_START.x +
            13 +
            Math.floor(
                index / 5
            ) *
                2.2,

        y:
            CAR_RACE_START.y +
            0.5,

        z:
            CAR_RACE_START.z +
            (
                index % 5 -
                2
            ) *
                2.4
    };
}

function resetSocketForRound(
    socket
) {
    socket.data.carRaceParticipating =
        true;

    socket.data.carRaceFinished =
        false;

    socket.data.carRaceCheckpointIndex =
        0;

    socket.data.carRaceFinishPlace =
        null;
}

function setSocketSpectator(
    socket
) {
    socket.data.carRaceParticipating =
        false;

    socket.data.carRaceFinished =
        false;

    socket.data.carRaceCheckpointIndex =
        0;

    socket.data.carRaceFinishPlace =
        null;
}

function teleport(
    socket,
    position,
    reason
) {
    const player =
        playerFor(socket);

    if (!player) {
        return;
    }

    const handler =
        socketHandlers
            .get(socket.id)
            ?.onTeleport;

    if (handler) {
        handler(
            player,
            position,
            reason
        );

        return;
    }

    player.position = {
        ...position
    };

    socket.data.lastMoveAt =
        Date.now();

    socket.emit(
        "carRace:teleport",
        {
            position:
                player.position,
            reason
        }
    );
}

function emitVehicle(
    io,
    socket,
    player
) {
    // Global emit intentionally lets campus players see racers as cars too.
    io.emit(
        "carRace:vehicle",
        {
            socketId:
                socket.id,
            playerName:
                player.playerName,
            position:
                player.position,
            rotation:
                player.rotation
        }
    );
}

function emitAllVehicles(io) {
    getRaceSockets(io)
        .forEach(
            (socket) => {
                const player =
                    playerFor(
                        socket
                    );

                if (player) {
                    emitVehicle(
                        io,
                        socket,
                        player
                    );
                }
            }
        );
}

function publicResults() {
    return raceState.results
        .map(
            (result) => ({
                place:
                    result.place,
                socketId:
                    result.socketId,
                playerName:
                    result.playerName,
                durationMs:
                    result.durationMs,
                pointsEarned:
                    result.pointsEarned
            })
        );
}

async function broadcastLeaderboard(
    io
) {
    try {
        io.emit(
            "leaderboard:updated",
            await getTopPlayers(5)
        );
    } catch (error) {
        console.error(
            "Could not refresh leaderboard after Campus Road Race:",
            error.message
        );
    }
}

function setIdle() {
    clearTimers();

    raceState.phase =
        "IDLE";

    raceState.startedAt =
        null;

    raceState.endsAt =
        null;

    raceState.results =
        [];
}

function ensureStopsWhenEmpty(
    io
) {
    if (
        getRaceSockets(io)
            .length === 0
    ) {
        setIdle();
        return true;
    }

    return false;
}

function activeRacers(io) {
    return getRaceSockets(io)
        .filter(
            (socket) =>
                socket.data
                    .carRaceParticipating &&
                !socket.data
                    .carRaceFinished
        );
}

function finishRound(io) {
    if (
        raceState.phase ===
            "IDLE" ||
        raceState.phase ===
            "FINISHED"
    ) {
        return;
    }

    clearTimeout(roundTimer);
    roundTimer = null;

    raceState.phase =
        "FINISHED";

    raceState.endsAt =
        null;

    io.to(
        CAR_RACE_ROOM
    ).emit(
        "carRace:phase",
        "FINISHED"
    );

    io.to(
        CAR_RACE_ROOM
    ).emit(
        "carRace:roundFinished",
        {
            roundId:
                raceState.roundId,
            results:
                publicResults()
        }
    );

    if (
        ensureStopsWhenEmpty(
            io
        )
    ) {
        return;
    }

    restartTimer =
        setTimeout(
            () =>
                startLobby(io),
            CAR_RACE_RESULTS_MS
        );
}

async function finishPlayer(
    io,
    socket,
    player
) {
    if (
        socket.data
            .carRaceFinished
    ) {
        return;
    }

    socket.data.carRaceFinished =
        true;

    const place =
        raceState.results.length +
        1;

    socket.data.carRaceFinishPlace =
        place;

    const durationMs =
        Math.max(
            1,
            Date.now() -
                (
                    raceState.startedAt ??
                    Date.now()
                )
        );

    const reward =
        CAR_RACE_REWARDS[
            place - 1
        ] ??
        CAR_RACE_FINISHER_POINTS;

    // Reserve the finishing place immediately.
    const result = {
        place,
        socketId:
            socket.id,
        playerName:
            player.playerName,
        durationMs,
        pointsEarned: 0
    };

    raceState.results.push(
        result
    );

    let totalPoints = null;

    try {
        const account =
            player.accountType ===
            "user"
                ? await addUserPoints(
                    player.userId,
                    reward
                )
                : await addGuestPoints(
                    player.guestCode,
                    reward
                );

        if (account) {
            result.pointsEarned =
                reward;

            totalPoints =
                account.points;
        }
    } catch (error) {
        console.error(
            "Could not save Campus Road Race reward:",
            error.message
        );
    }

    socket.emit(
        "carRace:finished",
        {
            place,
            durationMs,
            pointsEarned:
                result.pointsEarned,
            totalPoints
        }
    );

    io.to(
        CAR_RACE_ROOM
    ).emit(
        "carRace:results",
        publicResults()
    );

    if (
        result.pointsEarned >
        0
    ) {
        void broadcastLeaderboard(
            io
        );
    }

    if (
        activeRacers(io)
            .length === 0
    ) {
        setTimeout(
            () =>
                finishRound(io),
            1600
        );
    }
}

function startRace(io) {
    if (
        raceState.phase !==
        "LOBBY"
    ) {
        return;
    }

    const sockets =
        getRaceSockets(io);

    if (
        sockets.length === 0
    ) {
        setIdle();
        return;
    }

    clearInterval(lobbyInterval);
    lobbyInterval = null;

    raceState.phase =
        "ACTIVE";

    raceState.roundId +=
        1;

    raceState.startedAt =
        Date.now();

    raceState.endsAt =
        Date.now() +
        CAR_RACE_DURATION_MS;

    raceState.results =
        [];

    sockets.forEach(
        (socket, index) => {
            resetSocketForRound(
                socket
            );

            teleport(
                socket,
                gridPosition(
                    index
                ),
                "round-start"
            );

            socket.emit(
                "carRace:role",
                "player"
            );
        }
    );

    io.to(
        CAR_RACE_ROOM
    ).emit(
        "carRace:phase",
        "ACTIVE"
    );

    io.to(
        CAR_RACE_ROOM
    ).emit(
        "carRace:roundStarted",
        {
            roundId:
                raceState.roundId,
            endsAt:
                raceState.endsAt,
            checkpointCount:
                CAR_RACE_CHECKPOINTS.length,
            startHeading:
                CAR_RACE_START_HEADING
        }
    );

    emitAllVehicles(io);

    roundTimer =
        setTimeout(
            () =>
                finishRound(io),
            CAR_RACE_DURATION_MS
        );
}

function startLobby(io) {
    const sockets =
        getRaceSockets(io);

    if (
        sockets.length === 0
    ) {
        setIdle();
        return;
    }

    clearTimers();

    raceState.phase =
        "LOBBY";

    raceState.startedAt =
        null;

    raceState.endsAt =
        null;

    raceState.results =
        [];

    sockets.forEach(
        (socket, index) => {
            resetSocketForRound(
                socket
            );

            teleport(
                socket,
                gridPosition(
                    index
                ),
                "lobby"
            );

            socket.emit(
                "carRace:role",
                "waiting"
            );
        }
    );

    io.to(
        CAR_RACE_ROOM
    ).emit(
        "carRace:phase",
        "LOBBY"
    );

    emitAllVehicles(io);

    let count =
        CAR_RACE_LOBBY_SECONDS;

    io.to(
        CAR_RACE_ROOM
    ).emit(
        "carRace:lobbyCountdown",
        count
    );

    lobbyInterval =
        setInterval(
            () => {
                count -= 1;

                if (
                    count > 0
                ) {
                    io.to(
                        CAR_RACE_ROOM
                    ).emit(
                        "carRace:lobbyCountdown",
                        count
                    );

                    return;
                }

                clearInterval(
                    lobbyInterval
                );

                lobbyInterval =
                    null;

                startRace(io);
            },
            1000
        );
}

function checkAfterLeave(io) {
    if (
        ensureStopsWhenEmpty(
            io
        )
    ) {
        return;
    }

    if (
        raceState.phase ===
            "ACTIVE" &&
        activeRacers(io)
            .length === 0
    ) {
        finishRound(io);
    }
}

export function checkCarRaceProgress(
    io,
    socket,
    player
) {
    if (
        !socket.data.inCarRace
    ) {
        return;
    }

    emitVehicle(
        io,
        socket,
        player
    );

    if (
        raceState.phase !==
            "ACTIVE" ||
        !socket.data
            .carRaceParticipating ||
        socket.data
            .carRaceFinished
    ) {
        return;
    }

    const checkpointIndex =
        socket.data
            .carRaceCheckpointIndex ??
        0;

    const checkpoint =
        CAR_RACE_CHECKPOINTS[
            checkpointIndex
        ];

    if (!checkpoint) {
        return;
    }

    if (
        horizontalDistance(
            player.position,
            checkpoint
        ) >
        CAR_RACE_CHECKPOINT_RADIUS
    ) {
        return;
    }

    const nextCheckpointIndex =
        checkpointIndex +
        1;

    socket.data
        .carRaceCheckpointIndex =
        nextCheckpointIndex;

    socket.emit(
        "carRace:checkpoint",
        {
            checkpointIndex,
            nextCheckpointIndex,
            totalCheckpoints:
                CAR_RACE_CHECKPOINTS.length
        }
    );

    if (
        nextCheckpointIndex >=
        CAR_RACE_CHECKPOINTS.length
    ) {
        void finishPlayer(
            io,
            socket,
            player
        );
    }
}

export function registerCarRaceSocket(
    io,
    socket,
    getPlayer,
    {
        onEnter,
        onExit,
        onTeleport
    } = {}
) {
    socketHandlers.set(
        socket.id,
        {
            getPlayer,
            onEnter,
            onExit,
            onTeleport
        }
    );

    socket.on(
        "carRace:join",
        async () => {
            const player =
                getPlayer();

            if (!player) {
                socket.emit(
                    "carRace:error",
                    "Join multiplayer before starting the Campus Road Race."
                );

                return;
            }

            if (
                socket.data.inRlgl
            ) {
                socket.emit(
                    "carRace:error",
                    "Leave Red Light, Green Light before starting the race."
                );

                return;
            }

            if (
                socket.data
                    .inCampusQuiz
            ) {
                socket.emit(
                    "carRace:error",
                    "Leave Campus Quiz before starting the race."
                );

                return;
            }

            if (
                socket.data
                    .inCarRace
            ) {
                return;
            }

            if (
                distanceToPortal(
                    player.position
                ) >
                CAR_RACE_PORTAL.radius
            ) {
                socket.emit(
                    "carRace:error",
                    "Move into the orange Campus Road Race portal to start."
                );

                return;
            }

            try {
                await onEnter?.(
                    player
                );
            } catch (error) {
                console.error(
                    "Could not pause campus activity for Campus Road Race:",
                    error.message
                );
            }

            await socket.join(
                CAR_RACE_ROOM
            );

            socket.data.inCarRace =
                true;

            socket.emit(
                "carRace:started",
                {
                    phase:
                        raceState.phase,
                    checkpointCount:
                        CAR_RACE_CHECKPOINTS.length,
                    rewardPoints:
                        CAR_RACE_REWARDS,
                    durationMs:
                        CAR_RACE_DURATION_MS
                }
            );

            if (
                raceState.phase ===
                "IDLE"
            ) {
                startLobby(io);
                return;
            }

            if (
                raceState.phase ===
                "LOBBY"
            ) {
                resetSocketForRound(
                    socket
                );

                teleport(
                    socket,
                    gridPosition(
                        getRaceSockets(io)
                            .length -
                            1
                    ),
                    "join-lobby"
                );

                socket.emit(
                    "carRace:role",
                    "waiting"
                );

                socket.emit(
                    "carRace:phase",
                    "LOBBY"
                );

                emitAllVehicles(io);
                return;
            }

            setSocketSpectator(
                socket
            );

            teleport(
                socket,
                spectatorPosition(
                    getRaceSockets(io)
                        .length -
                        1
                ),
                "spectator"
            );

            socket.emit(
                "carRace:role",
                "spectator"
            );

            socket.emit(
                "carRace:phase",
                raceState.phase
            );

            socket.emit(
                "carRace:results",
                publicResults()
            );

            emitAllVehicles(io);
        }
    );

    socket.on(
        "carRace:leave",
        async () => {
            if (
                !socket.data
                    .inCarRace
            ) {
                return;
            }

            const player =
                getPlayer();

            const wasActive =
                raceState.phase ===
                    "ACTIVE" &&
                socket.data
                    .carRaceParticipating &&
                !socket.data
                    .carRaceFinished;

            socket.data.inCarRace =
                false;

            socket.data
                .carRaceParticipating =
                false;

            await socket.leave(
                CAR_RACE_ROOM
            );

            io.emit(
                "carRace:vehicleLeft",
                {
                    socketId:
                        socket.id
                }
            );

            if (player) {
                teleport(
                    socket,
                    CAR_RACE_RETURN_POSITION,
                    "leave"
                );

                try {
                    await onExit?.(
                        player
                    );
                } catch (error) {
                    console.error(
                        "Could not resume campus activity after Campus Road Race:",
                        error.message
                    );
                }
            }

            socket.emit(
                "carRace:left"
            );

            if (wasActive) {
                checkAfterLeave(io);
            } else {
                ensureStopsWhenEmpty(io);
            }
        }
    );

    socket.on(
        "disconnect",
        () => {
            const wasInRace =
                Boolean(
                    socket.data
                        .inCarRace
                );

            const wasActive =
                wasInRace &&
                raceState.phase ===
                    "ACTIVE" &&
                socket.data
                    .carRaceParticipating &&
                !socket.data
                    .carRaceFinished;

            socketHandlers.delete(
                socket.id
            );

            if (wasInRace) {
                io.emit(
                    "carRace:vehicleLeft",
                    {
                        socketId:
                            socket.id
                    }
                );
            }

            setTimeout(
                () => {
                    if (wasActive) {
                        checkAfterLeave(io);
                    } else if (
                        wasInRace
                    ) {
                        ensureStopsWhenEmpty(io);
                    }
                },
                0
            );
        }
    );
}
