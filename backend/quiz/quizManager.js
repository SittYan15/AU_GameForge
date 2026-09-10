// backend/quiz/quizManager.js

import { randomUUID } from "node:crypto";
import { getTopPlayers } from "../models/leaderboardModel.js";
import {
    getCampusQuizLeaderboard,
    awardCampusQuizResult,
    transferCampusQuizGuestProgress as transferQuizGuestProgress
} from "../models/quizModel.js";
import {
    CAMPUS_QUIZ_ARENA,
    CAMPUS_QUIZ_FLOORS,
    CAMPUS_QUIZ_LOBBY_SECONDS,
    CAMPUS_QUIZ_PORTAL,
    CAMPUS_QUIZ_QUESTION_TIME_MS,
    CAMPUS_QUIZ_QUESTIONS,
    CAMPUS_QUIZ_QUESTIONS_PER_ROUND,
    CAMPUS_QUIZ_REVEAL_TIME_MS,
    CAMPUS_QUIZ_RETURN_POSITION,
    CAMPUS_QUIZ_ROOM,
    CAMPUS_QUIZ_MAX_SCORE,
    CAMPUS_QUIZ_SPECTATOR_SPAWN,
    CAMPUS_QUIZ_STARTING_LIVES,
    CAMPUS_QUIZ_SURVIVOR_REWARD_POINTS,
    CAMPUS_QUIZ_WAITING_SPAWN
} from "./quizDefinitions.js";

const socketHandlers = new Map();

const quizState = {
    phase: "IDLE",
    roundId: 0,
    roundKey: null,
    resultsReady: false,
    questionIndex: -1,
    questionIds: [],
    currentQuestion: null,
    currentFloorMap: null,
    correctFloorId: null,
    currentPublicQuestion: null,
    questionDeadline: null,
    lobbyEndsAt: null,
    roundStartedAt: null
};

function selectQuestions(previousIds = []) {
    const shuffledIds = shuffle(CAMPUS_QUIZ_QUESTIONS.map(question => question.id));
    const selected = shuffledIds.slice(0, CAMPUS_QUIZ_QUESTIONS_PER_ROUND);
    const previous = new Set(previousIds);
    if (shuffledIds.length > selected.length && selected.every(id => previous.has(id))) {
        selected[Math.floor(Math.random() * selected.length)] = shuffledIds[selected.length];
    }
    return selected;
}

if (CAMPUS_QUIZ_QUESTIONS.length < CAMPUS_QUIZ_QUESTIONS_PER_ROUND ||
    new Set(CAMPUS_QUIZ_QUESTIONS.map(question => question.id)).size !== CAMPUS_QUIZ_QUESTIONS.length) {
    throw new Error("Campus Quiz needs at least 15 questions with unique IDs.");
}

let lobbyInterval = null;
let questionTimer = null;
let revealTimer = null;

function shuffle(values) {
    const copy = [...values];

    for (let index = copy.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
    }

    return copy;
}

function clearQuizTimers() {
    clearInterval(lobbyInterval);
    clearTimeout(questionTimer);
    clearTimeout(revealTimer);

    lobbyInterval = null;
    questionTimer = null;
    revealTimer = null;
}

function getQuizSockets(io) {
    const ids = io.sockets.adapter.rooms.get(CAMPUS_QUIZ_ROOM);
    if (!ids) return [];

    return [...ids]
        .map((id) => io.sockets.sockets.get(id))
        .filter(Boolean);
}

function handlersFor(socket) {
    return socketHandlers.get(socket.id) ?? null;
}

function playerFor(socket) {
    return handlersFor(socket)?.getPlayer?.() ?? null;
}

function distanceToPortal(position) {
    return Math.hypot(
        position.x - CAMPUS_QUIZ_PORTAL.x,
        position.y - CAMPUS_QUIZ_PORTAL.y,
        position.z - CAMPUS_QUIZ_PORTAL.z
    );
}

function floorAtPosition(position) {
    if (!position) return null;

    // Player must still be near the live answer-platform height when the
    // server locks the answer. Standing below the arena or on the safe pad
    // cannot count as an answer.
    if (
        position.y < CAMPUS_QUIZ_ARENA.y - 1.8 ||
        position.y > CAMPUS_QUIZ_ARENA.y + 4.0
    ) {
        return null;
    }

    return CAMPUS_QUIZ_FLOORS.find((floor) =>
        Math.abs(position.x - floor.x) <= floor.halfWidth &&
        Math.abs(position.z - floor.z) <= floor.halfDepth
    )?.id ?? null;
}

function quizSpawn(index) {
    const columns = 9;
    const column = index % columns;
    const row = Math.floor(index / columns);

    return {
        x: CAMPUS_QUIZ_WAITING_SPAWN.x + (column - 4) * 3.5,
        y: CAMPUS_QUIZ_WAITING_SPAWN.y,
        z: CAMPUS_QUIZ_WAITING_SPAWN.z + row * 2.4
    };
}

function spectatorSpawn(index) {
    return {
        x: CAMPUS_QUIZ_SPECTATOR_SPAWN.x + ((index % 9) - 4) * 3.5,
        y: CAMPUS_QUIZ_SPECTATOR_SPAWN.y,
        z: CAMPUS_QUIZ_SPECTATOR_SPAWN.z + Math.floor(index / 9) * 2.4
    };
}

function teleport(socket, position, reason) {
    const player = playerFor(socket);
    if (!player) return;

    const handler = handlersFor(socket)?.onTeleport;

    if (handler) {
        handler(player, position, reason);
        return;
    }

    // Fallback for older integration. The local player still receives the
    // authoritative teleport even if the caller did not provide a broadcaster.
    player.position = { ...position };
    socket.data.lastMoveAt = Date.now();
    socket.emit("campusQuiz:teleport", {
        position: player.position,
        reason
    });
}

function resetSocketForRound(socket) {
    socket.data.campusQuizParticipating = true;
    socket.data.campusQuizEliminated = false;
    socket.data.campusQuizLives = CAMPUS_QUIZ_STARTING_LIVES;
    socket.data.campusQuizCorrectCount = 0;
    socket.data.campusQuizScore = 0;
    socket.data.campusQuizWrongCount = 0;
    socket.data.campusQuizAnsweredQuestions = new Set();
    // Snapshot original identity so guest conversion cannot create a second award key.
    socket.data.campusQuizIdentity = { ...playerFor(socket) };
    socket.data.campusQuizFinalResult = null;
}

function setSocketSpectator(socket) {
    socket.data.campusQuizParticipating = false;
    socket.data.campusQuizEliminated = true;
    socket.data.campusQuizLives = 0;
}

function publicPlayerStatus(io) {
    return getQuizSockets(io).map((socket) => {
        const player = playerFor(socket);

        return {
            socketId: socket.id,
            playerName: player?.playerName ?? "Player",
            lives: socket.data.campusQuizLives ?? 0,
            score: socket.data.campusQuizScore ?? 0,
            correctCount: socket.data.campusQuizCorrectCount ?? 0,
            wrongCount: socket.data.campusQuizWrongCount ?? 0,
            participating: Boolean(socket.data.campusQuizParticipating),
            eliminated: Boolean(socket.data.campusQuizEliminated)
        };
    });
}

function emitRoundStatus(io) {
    io.to(CAMPUS_QUIZ_ROOM).emit(
        "campusQuiz:roundStatus",
        publicPlayerStatus(io)
    );
}

async function emitQuizLeaderboard(io) {
    try {
        const leaderboard = await getCampusQuizLeaderboard(10);
        io.emit("campusQuiz:leaderboard", leaderboard);
        return leaderboard;
    } catch (error) {
        console.error("Could not load Campus Quiz leaderboard:", error.message);
        return [];
    }
}

async function emitGlobalLeaderboard(io) {
    try {
        io.emit("leaderboard:updated", await getTopPlayers(5));
    } catch (error) {
        console.error("Could not refresh global leaderboard after Campus Quiz:", error.message);
    }
}

function buildPublicQuestion(question, state) {
    const shuffledOptions = shuffle(question.options);
    const floorIds = ["A", "B", "C", "D"];

    state.currentFloorMap = new Map(
        shuffledOptions.map((option, index) => [floorIds[index], option.id])
    );

    state.correctFloorId = [...state.currentFloorMap.entries()]
        .find(([, canonicalId]) => canonicalId === question.correctOptionId)?.[0] ?? null;

    return {
        roundId: state.roundId,
        id: question.id,
        category: question.category,
        question: question.question,
        options: shuffledOptions.map((option, index) => ({
            floorId: floorIds[index],
            text: option.text
        })),
        points: 0,
        maxScore: CAMPUS_QUIZ_MAX_SCORE,
        questionNumber: state.questionIndex + 1,
        totalQuestions: state.questionIds.length,
        deadline: state.questionDeadline
    };
}

function aliveParticipants(io) {
    return getQuizSockets(io).filter((socket) =>
        socket.data.campusQuizParticipating &&
        !socket.data.campusQuizEliminated
    );
}

function setIdle() {
    clearQuizTimers();

    quizState.phase = "IDLE";
    quizState.resultsReady = false;
    quizState.questionIndex = -1;
    quizState.questionIds = [];
    quizState.currentQuestion = null;
    quizState.currentFloorMap = null;
    quizState.correctFloorId = null;
    quizState.currentPublicQuestion = null;
    quizState.questionDeadline = null;
    quizState.lobbyEndsAt = null;
    quizState.roundStartedAt = null;
}

function ensureStopsWhenEmpty(io) {
    if (getQuizSockets(io).length === 0) {
        setIdle();
        return true;
    }

    return false;
}

async function finishRound(io) {
    if (quizState.phase === "FINISHED" || quizState.phase === "IDLE") return;
    const completed = quizState.phase === "REVEAL" &&
        quizState.questionIndex === CAMPUS_QUIZ_QUESTIONS_PER_ROUND - 1;
    clearTimeout(questionTimer);
    clearTimeout(revealTimer);
    questionTimer = null;
    revealTimer = null;
    quizState.phase = "FINISHED";
    quizState.questionDeadline = null;
    quizState.resultsReady = false;

    const roundId = quizState.roundId;
    const roundKey = quizState.roundKey;
    const totalQuestions = CAMPUS_QUIZ_QUESTIONS_PER_ROUND;
    for (const socket of getQuizSockets(io)) {
        socket.data.campusQuizScore = completed && socket.data.campusQuizParticipating &&
            !socket.data.campusQuizEliminated && socket.data.campusQuizLives > 0 &&
            socket.data.campusQuizCorrectCount === totalQuestions &&
            socket.data.campusQuizAnsweredQuestions?.size === totalQuestions
                ? CAMPUS_QUIZ_MAX_SCORE : 0;
    }
    const durationMs = Math.max(1, Date.now() - (quizState.roundStartedAt ?? Date.now()));
    const standings = publicPlayerStatus(io).filter(player => player.participating)
        .sort((a, b) => b.score - a.score);
    standings.forEach((player, index) => {
        player.rank = index > 0 && player.score === standings[index - 1].score
            ? standings[index - 1].rank : index + 1;
    });
    io.to(CAMPUS_QUIZ_ROOM).emit("campusQuiz:phase", "FINISHED");
    const results = await Promise.all(getQuizSockets(io).map(async socket => {
        const participated = Boolean(socket.data.campusQuizParticipating);
        const score = socket.data.campusQuizScore ?? 0;
        const correctCount = socket.data.campusQuizCorrectCount ?? 0;
        const wrongCount = socket.data.campusQuizWrongCount ?? 0;
        const eligible = score === CAMPUS_QUIZ_MAX_SCORE;
        let rewardSaved = !eligible;
        let totalPoints = null;
        if (eligible) {
            // A retry uses the same round UUID and original account identity.
            // The database claim and points update commit in one transaction.
            for (let attempt = 0; attempt < 2; attempt += 1) {
                try {
                    const award = await awardCampusQuizResult(socket.data.campusQuizIdentity, {
                        roundKey, score, correctCount, durationMs
                    });
                    totalPoints = award.totalPoints;
                    rewardSaved = true;
                    break;
                } catch (error) {
                    if (attempt === 1) console.error("Could not save Campus Quiz result:", error.message);
                }
            }
        }
        return { socket, payload: {
            roundId, participated, completed: eligible, score, correctCount, wrongCount,
            livesRemaining: socket.data.campusQuizLives,
            totalQuestions, maxScore: CAMPUS_QUIZ_MAX_SCORE,
            rank: standings.find(player => player.socketId === socket.id)?.rank ?? null,
            playerCount: standings.length, standings,
            pointsEarned: eligible && rewardSaved ? score : 0,
            rewardSaved, resultSaved: eligible && rewardSaved, totalPoints
        } };
    }));
    const leaderboard = await emitQuizLeaderboard(io);
    if (results.some(result => result.payload.resultSaved)) void emitGlobalLeaderboard(io);
    // A disconnected room may already have started another lobby while saving.
    if (quizState.roundId !== roundId || quizState.phase !== "FINISHED") return;
    quizState.resultsReady = true;
    for (const { socket, payload } of results) {
        if (Number.isSafeInteger(payload.totalPoints)) {
            socket.emit("player:pointsUpdated", { points: payload.totalPoints });
        }
        socket.data.campusQuizFinalResult = { ...payload, leaderboard };
        socket.emit("campusQuiz:finished", socket.data.campusQuizFinalResult);
    }
    // A spectator can enter while the original participants' results are saving.
    const recipients = new Set(results.map(result => result.socket.id));
    for (const socket of getQuizSockets(io)) {
        if (!recipients.has(socket.id)) socket.emit("campusQuiz:finished", {
            roundId, participated: false, totalQuestions, maxScore: CAMPUS_QUIZ_MAX_SCORE
        });
    }
    emitRoundStatus(io);
    ensureStopsWhenEmpty(io);
    // Stay on results until a player requests another shared round.
}

function sendQuestion(io) {
    if (quizState.phase !== "QUESTION") return;

    quizState.questionDeadline = Date.now() + CAMPUS_QUIZ_QUESTION_TIME_MS;
    const activeSockets = aliveParticipants(io);
    for (const socket of activeSockets) {
        const state = socket.data.campusQuizQuestions;
        state.questionIndex = socket.data.campusQuizAnsweredQuestions.size;
        state.roundId = quizState.roundId;
        state.questionDeadline = quizState.questionDeadline;
        state.currentQuestion = CAMPUS_QUIZ_QUESTIONS.find(q => q.id === state.questionIds[state.questionIndex]);
        state.currentPublicQuestion = buildPublicQuestion(state.currentQuestion, state);
        socket.emit("campusQuiz:question", state.currentPublicQuestion);
    }
    // Shared timer and spectator view follow the first active player only.
    const view = activeSockets[0]?.data.campusQuizQuestions;
    if (!view) { void finishRound(io); return; }
    quizState.currentQuestion = view.currentQuestion;
    quizState.currentPublicQuestion = view.currentPublicQuestion;
    const question = view.currentQuestion;
    for (const socket of getQuizSockets(io).filter(s => !s.data.campusQuizParticipating)) {
        socket.emit("campusQuiz:question", view.currentPublicQuestion);
    }

    clearTimeout(questionTimer);
    const roundId = quizState.roundId;
    const questionId = question.id;
    questionTimer = setTimeout(() => {
        evaluateQuestion(io, roundId, questionId);
    }, CAMPUS_QUIZ_QUESTION_TIME_MS + 40);
}

function prepareNextQuestion(io) {
    if (quizState.phase === "IDLE" || quizState.phase === "FINISHED") return;

    if (quizState.questionIndex + 1 >= quizState.questionIds.length) {
        void finishRound(io);
        return;
    }

    if (aliveParticipants(io).length === 0) {
        void finishRound(io);
        return;
    }

    quizState.questionIndex += 1;
    quizState.phase = "QUESTION";

    const activeSockets = aliveParticipants(io);
    activeSockets.forEach((socket, index) => {
        teleport(socket, quizSpawn(index), "next-question");
    });

    io.to(CAMPUS_QUIZ_ROOM).emit("campusQuiz:phase", "QUESTION");
    sendQuestion(io);
}

function evaluateQuestion(io, roundId = quizState.roundId, questionId = quizState.currentQuestion?.id) {
    if (quizState.phase !== "QUESTION" || quizState.roundId !== roundId ||
        quizState.currentQuestion?.id !== questionId) return;

    clearTimeout(questionTimer);
    questionTimer = null;

    const question = quizState.currentQuestion;
    const publicQuestion = quizState.currentPublicQuestion;

    if (!question || !publicQuestion) {
        void finishRound(io);
        return;
    }

    quizState.phase = "REVEAL";
    quizState.questionDeadline = null;

    const activeSockets = aliveParticipants(io);

    for (const socket of activeSockets) {
        const state = socket.data.campusQuizQuestions;
        const question = state.currentQuestion;
        const correctFloorId = state.correctFloorId;
        // Server-only ledger: repeated evaluations cannot award the same answer twice.
        const answered = socket.data.campusQuizAnsweredQuestions;
        if (answered.has(question.id)) continue;
        answered.add(question.id);
        const player = playerFor(socket);
        const selectedFloorId = floorAtPosition(player?.position);
        const correct = selectedFloorId === correctFloorId;

        if (correct) {
            socket.data.campusQuizCorrectCount += 1;
        } else {
            socket.data.campusQuizWrongCount += 1;
            socket.data.campusQuizLives = Math.max(
                0,
                (socket.data.campusQuizLives ?? CAMPUS_QUIZ_STARTING_LIVES) - 1
            );

            if (socket.data.campusQuizLives <= 0) {
                socket.data.campusQuizEliminated = true;
            }
        }

        socket.emit("campusQuiz:lifeResult", {
            roundId,
            questionNumber: state.questionIndex + 1,
            wrongCount: socket.data.campusQuizWrongCount,
            pointsEarned: 0,
            questionId: question.id,
            selectedFloorId,
            correctFloorId,
            correct,
            livesRemaining: socket.data.campusQuizLives,
            eliminated: socket.data.campusQuizEliminated,
            score: socket.data.campusQuizScore,
            correctCount: socket.data.campusQuizCorrectCount
        });
    }

    io.to(CAMPUS_QUIZ_ROOM).emit("campusQuiz:phase", "REVEAL");
    for (const socket of getQuizSockets(io)) {
        if (socket.data.campusQuizParticipating && !activeSockets.includes(socket)) continue;
        const state = socket.data.campusQuizParticipating
            ? socket.data.campusQuizQuestions
            : activeSockets[0]?.data.campusQuizQuestions;
        if (!state?.currentQuestion) continue;
        socket.emit("campusQuiz:reveal", {
            roundId,
            questionId: state.currentQuestion.id,
            correctFloorId: state.correctFloorId,
            wrongFloorIds: CAMPUS_QUIZ_FLOORS.map(f => f.id).filter(id => id !== state.correctFloorId),
            explanation: state.currentQuestion.explanation,
            revealEndsAt: Date.now() + CAMPUS_QUIZ_REVEAL_TIME_MS
        });
    }

    emitRoundStatus(io);

    clearTimeout(revealTimer);
    revealTimer = setTimeout(() => {
        if (quizState.phase !== "REVEAL" || quizState.roundId !== roundId ||
            quizState.currentQuestion?.id !== questionId) return;
        revealTimer = null;

        const roomSockets = getQuizSockets(io);
        let spectatorIndex = 0;

        for (const socket of roomSockets) {
            if (socket.data.campusQuizParticipating && socket.data.campusQuizEliminated) {
                teleport(socket, spectatorSpawn(spectatorIndex), "eliminated");
                spectatorIndex += 1;
            }
        }

        prepareNextQuestion(io);
    }, CAMPUS_QUIZ_REVEAL_TIME_MS);
}

function startRound(io) {
    if (quizState.phase !== "LOBBY") return;

    const sockets = getQuizSockets(io);

    if (sockets.length === 0) {
        setIdle();
        return;
    }

    clearInterval(lobbyInterval);
    lobbyInterval = null;

    quizState.roundId += 1;
    quizState.roundKey = randomUUID();
    quizState.resultsReady = false;
    quizState.phase = "QUESTION";
    quizState.questionIndex = 0;
    quizState.roundStartedAt = Date.now();
    quizState.lobbyEndsAt = null;
    sockets.forEach((socket, index) => {
        const questionIds = selectQuestions(socket.data.campusQuizQuestions?.questionIds);
        resetSocketForRound(socket);
        socket.data.campusQuizQuestions = { questionIds, questionIndex: 0 };
        if (index === 0) quizState.questionIds = [...questionIds];
        teleport(socket, quizSpawn(index), "round-start");
        socket.emit("campusQuiz:role", "player");
    });

    io.to(CAMPUS_QUIZ_ROOM).emit("campusQuiz:roundStarted", {
        roundId: quizState.roundId,
        totalQuestions: quizState.questionIds.length,
        startingLives: CAMPUS_QUIZ_STARTING_LIVES,
        survivorRewardPoints: CAMPUS_QUIZ_SURVIVOR_REWARD_POINTS
    });

    io.to(CAMPUS_QUIZ_ROOM).emit("campusQuiz:phase", "QUESTION");
    emitRoundStatus(io);
    sendQuestion(io);
}

function startLobby(io) {
    const sockets = getQuizSockets(io);

    if (sockets.length === 0) {
        setIdle();
        return;
    }

    clearQuizTimers();

    quizState.phase = "LOBBY";
    quizState.resultsReady = false;
    quizState.questionIndex = -1;
    quizState.questionIds = [];
    quizState.currentQuestion = null;
    quizState.currentFloorMap = null;
    quizState.correctFloorId = null;
    quizState.currentPublicQuestion = null;
    quizState.questionDeadline = null;
    quizState.roundStartedAt = null;
    quizState.lobbyEndsAt = Date.now() + CAMPUS_QUIZ_LOBBY_SECONDS * 1000;

    sockets.forEach((socket, index) => {
        resetSocketForRound(socket);
        teleport(socket, quizSpawn(index), "lobby");
        socket.emit("campusQuiz:role", "waiting");
    });

    io.to(CAMPUS_QUIZ_ROOM).emit("campusQuiz:phase", "LOBBY");
    emitRoundStatus(io);

    let count = CAMPUS_QUIZ_LOBBY_SECONDS;
    io.to(CAMPUS_QUIZ_ROOM).emit("campusQuiz:lobbyCountdown", count);

    lobbyInterval = setInterval(() => {
        count -= 1;

        if (count > 0) {
            io.to(CAMPUS_QUIZ_ROOM).emit("campusQuiz:lobbyCountdown", count);
            return;
        }

        clearInterval(lobbyInterval);
        lobbyInterval = null;
        startRound(io);
    }, 1000);
}

function checkRoundAfterPlayerLeft(io) {
    if (ensureStopsWhenEmpty(io)) return;

    if (
        (quizState.phase === "QUESTION" || quizState.phase === "REVEAL") &&
        aliveParticipants(io).length === 0
    ) {
        void finishRound(io);
    }
}

export function registerCampusQuizSocket(
    io,
    socket,
    getPlayer,
    {
        onEnter,
        onExit,
        onTeleport
    } = {}
) {
    const alreadyRegistered = socketHandlers.has(socket.id);
    socketHandlers.set(socket.id, {
        getPlayer,
        onEnter,
        onExit,
        onTeleport
    });

    if (alreadyRegistered) return;

    let joining = false;
    socket.on("campusQuiz:join", async () => {
        if (joining || socket.data.inCampusQuiz) return;
        joining = true;
        try {
            const player = playerFor(socket);

            if (!player) {
                socket.emit("campusQuiz:error", "Join multiplayer before starting Campus Quiz.");
                return;
            }

            if (socket.data.inRlgl) {
                socket.emit("campusQuiz:error", "Leave Red Light, Green Light before starting Campus Quiz.");
                return;
            }

            if (socket.data.inCarRace) {
                socket.emit("campusQuiz:error", "Leave the Campus Road Race before starting Campus Quiz.");
                return;
            }

            if (socket.data.inCampusQuiz) return;

            if (distanceToPortal(player.position) > CAMPUS_QUIZ_PORTAL.radius) {
                socket.emit("campusQuiz:error", "Move into the Campus Quiz portal to start.");
                return;
            }

            try {
                await handlersFor(socket)?.onEnter?.(player);
            } catch (error) {
                console.error("Could not pause campus activity for Campus Quiz:", error.message);
            }

            const leaderboard = await getCampusQuizLeaderboard(10).catch(() => []);
            if (!socket.connected) return;
            await socket.join(CAMPUS_QUIZ_ROOM);
            socket.data.inCampusQuiz = true;

            socket.emit("campusQuiz:started", {
                roundId: quizState.roundId,
                phase: quizState.phase,
                startingLives: CAMPUS_QUIZ_STARTING_LIVES,
                questionsPerRound: CAMPUS_QUIZ_QUESTIONS_PER_ROUND,
                questionTimeMs: CAMPUS_QUIZ_QUESTION_TIME_MS,
                survivorRewardPoints: CAMPUS_QUIZ_SURVIVOR_REWARD_POINTS,
                leaderboard
            });

            if (quizState.phase === "IDLE") {
                startLobby(io);
                return;
            }

            if (quizState.phase === "LOBBY") {
                resetSocketForRound(socket);
                teleport(socket, quizSpawn(getQuizSockets(io).length - 1), "join-lobby");
                socket.emit("campusQuiz:role", "waiting");
                socket.emit("campusQuiz:phase", "LOBBY");

                const secondsLeft = Math.max(
                    1,
                    Math.ceil(((quizState.lobbyEndsAt ?? Date.now()) - Date.now()) / 1000)
                );
                socket.emit("campusQuiz:lobbyCountdown", secondsLeft);
                emitRoundStatus(io);
                return;
            }

            // A player arriving during a live round watches until the next lobby.
            setSocketSpectator(socket);
            teleport(socket, spectatorSpawn(getQuizSockets(io).length - 1), "spectator");
            socket.emit("campusQuiz:role", "spectator");
            socket.emit("campusQuiz:phase", quizState.phase);

            if (quizState.currentPublicQuestion) {
                socket.emit("campusQuiz:question", quizState.currentPublicQuestion);
            }

            if (quizState.phase === "FINISHED" && quizState.resultsReady) {
                socket.emit("campusQuiz:finished", {
                    roundId: quizState.roundId, participated: false,
                    totalQuestions: CAMPUS_QUIZ_QUESTIONS_PER_ROUND, maxScore: CAMPUS_QUIZ_MAX_SCORE
                });
            }
            emitRoundStatus(io);
        } catch (error) {
            console.error("Could not join Campus Quiz:", error.message);
            socket.emit("campusQuiz:error", "Could not join Campus Quiz. Please try again.");
        } finally {
            joining = false;
        }
    });

    socket.on("campusQuiz:playAgain", ({ roundId } = {}) => {
        if (!socket.data.inCampusQuiz || quizState.phase !== "FINISHED" ||
            !quizState.resultsReady || roundId !== quizState.roundId) return;
        // Synchronous phase transition makes repeated clicks harmless.
        startLobby(io);
    });

    socket.on("campusQuiz:leaderboardRequest", async () => {
        socket.emit(
            "campusQuiz:leaderboard",
            await getCampusQuizLeaderboard(10).catch(() => [])
        );
    });

    socket.on("campusQuiz:leave", async () => {
        if (!socket.data.inCampusQuiz) return;

        const player = playerFor(socket);
        const wasParticipating = Boolean(socket.data.campusQuizParticipating);

        socket.data.inCampusQuiz = false;
        socket.data.campusQuizParticipating = false;
        socket.data.campusQuizEliminated = false;

        await socket.leave(CAMPUS_QUIZ_ROOM);

        if (player) {
            teleport(socket, CAMPUS_QUIZ_RETURN_POSITION, "leave");

            try {
                await handlersFor(socket)?.onExit?.(player);
            } catch (error) {
                console.error("Could not resume campus activity after Campus Quiz:", error.message);
            }
        }

        socket.emit("campusQuiz:left");

        if (wasParticipating) {
            checkRoundAfterPlayerLeft(io);
        } else {
            ensureStopsWhenEmpty(io);
        }
    });

    socket.on("disconnect", () => {
        const wasParticipating = Boolean(socket.data.campusQuizParticipating);
        socketHandlers.delete(socket.id);

        if (wasParticipating) {
            setTimeout(() => checkRoundAfterPlayerLeft(io), 0);
        } else {
            setTimeout(() => ensureStopsWhenEmpty(io), 0);
        }
    });
}

export async function transferCampusQuizGuestProgress(
    guestId,
    userId,
    playerName
) {
    return transferQuizGuestProgress(guestId, userId, playerName);
}
