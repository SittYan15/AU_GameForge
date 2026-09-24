// frontend/quiz/quizClient.js

import { confirmReturnToCampus } from "../ui/returnToCampusConfirm.js";

const quizClients = new WeakMap();

export function createCampusQuizClient(
    scene,
    localPlayer,
    socket
) {
    if (quizClients.has(socket)) return quizClients.get(socket);

    let active = false;
    let joinPending = false;
    let role = "none";
    let phase = "IDLE";
    let lives = 3;
    let wrongCount = 0;
    let score = 0;
    let correctCount = 0;
    let totalQuestions = 10;
    let currentQuestionNumber = 0;
    let currentRoundId = null;
    let currentQuestionId = null;
    let lastResultQuestionNumber = 0;
    let finishedRoundId = null;
    let messageTimer = null;
    let replayPending = false;

    const arena = scene.metadata?.campusQuizArena ?? null;

    function setCampusQuizMinigameState(active) {
        window.dispatchEvent(
            new CustomEvent(
                "au:minigame-state",
                {
                    detail: {
                        active: Boolean(active),
                        type: "campus-quiz"
                    }
                }
            )
        );
    }

    const cameraMode =
        () =>
            scene.metadata
                ?.cameraModeController
                ?? null;

    const enterFixedCamera =
        () => {
            cameraMode()
                ?.enterCampusQuizFixedCamera?.();
        };

    const restoreFpsCamera =
        () => {
            cameraMode()
                ?.exitCampusQuizFixedCamera?.();
        };

    const style = document.createElement("style");
    style.textContent = `
        body.au-campus-quiz-active #playerCountStatus,
        body.au-campus-quiz-active #topPlayersStatus {
            display: none !important;
        }

        #campusQuizSurvivalHud {
            position: fixed;
            top: 16px;
            left: 16px;
            right: auto;
            z-index: 1200;
            width: max-content;
            max-width: calc(100vw - 32px);
            box-sizing: border-box;
            padding: 11px 13px;
            border-radius: 12px;
            border: 1px solid transparent;
            background: transparent;
            color: #fff;
            font-family: system-ui, sans-serif;
            box-shadow: none;
            backdrop-filter: none;
            text-shadow: -1px -1px 0 rgba(0,0,0,.95), 1px -1px 0 rgba(0,0,0,.95), -1px 1px 0 rgba(0,0,0,.95), 1px 1px 0 rgba(0,0,0,.95), 0 2px 4px rgba(0,0,0,.9);
            text-shadow: 0 2px 4px rgba(0,0,0,.88);
            pointer-events: none;
            display: none;
        }

        .campusQuizStatRow {
            display: grid;
            grid-template-columns: max-content max-content;
            align-items: center;
            justify-content: start;
            column-gap: 5px;
            min-width: 0;
            width: max-content;
            padding: 0;
            line-height: 1.25;
        }

        .campusQuizStatRow strong {
            color: #ffffff;
            font-variant-numeric: tabular-nums;
        }

        #campusQuizSurvivalMessage,
        #campusQuizResult {
            position: fixed;
            top: auto;
            left: 50%;
            bottom: 72px;
            transform: translateX(-50%);
            z-index: 1300;
            max-width: min(520px, calc(100vw - 24px));
            box-sizing: border-box;
            padding: 12px 18px;
            border-radius: 12px;
            background: rgba(10,12,18,.94);
            color: #fff;
            font-family: system-ui, sans-serif;
            font-size: clamp(16px, 2.2vw, 24px);
            font-weight: 900;
            text-align: center;
            white-space: pre-line;
            box-shadow: 0 8px 28px rgba(0,0,0,.42);
            pointer-events: none;
            display: none;
        }

        #campusQuizResult {
            top: 50%;
            bottom: auto;
            transform: translate(-50%, -50%);
            width: min(360px, calc(100vw - 24px));
            max-height: calc(100dvh - 80px);
            overflow-y: auto;
            pointer-events: auto;
        }

        #campusQuizPlayAgain {
            display: block;
            width: 100%;
            margin-top: 16px;
            padding: 10px 15px;
            border-radius: 10px;
            border: 1px solid rgba(255,255,255,.22);
            background: #6d43b5;
            color: white;
            font: 700 16px system-ui, sans-serif;
            cursor: pointer;
        }

        #campusQuizReturnButton {
            position: fixed;
            top: auto;
            right: auto;
            bottom: 16px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 1301;
            padding: 10px 15px;
            border-radius: 10px;
            border: 1px solid rgba(255,255,255,.22);
            background: rgba(18,20,24,.92);
            color: white;
            font: 700 14px system-ui, sans-serif;
            cursor: pointer;
            display: none;
        }

        @media (max-width: 700px) {
            #campusQuizSurvivalHud {
                top: max(10px, env(safe-area-inset-top));
                left: max(10px, env(safe-area-inset-left));
                right: auto;
                width: min(245px, calc(100vw - 20px));
                padding: 9px 10px;
            }

            #campusQuizReturnButton {
                top: auto;
                right: auto;
                bottom: calc(12px + env(safe-area-inset-bottom));
                left: 50%;
                transform: translateX(-50%);
            }
        }

        /* SURVIVAL_QUIZ_ELIMINATED_UI_V1 */
        #campusQuizEliminatedNotice {
            position: fixed;
            top: 50%;
            left: 50%;
            z-index: 1298;
            width: min(390px, calc(100vw - 28px));
            box-sizing: border-box;
            padding: 20px 22px 18px;
            transform: translate(-50%, -50%);
            border: 1px solid rgba(255,95,95,.42);
            border-radius: 16px;
            background: rgba(12,14,20,.90);
            color: #fff;
            font-family: system-ui, sans-serif;
            text-align: center;
            box-shadow:
                0 16px 54px rgba(0,0,0,.44),
                0 0 30px rgba(255,70,70,.10);
            backdrop-filter: blur(4px);
            -webkit-backdrop-filter: blur(4px);
            pointer-events: none;
        }

        #campusQuizEliminatedNotice[hidden] {
            display: none !important;
        }

        #campusQuizEliminatedIcon {
            font-size: 38px;
            line-height: 1;
        }

        #campusQuizEliminatedTitle {
            margin-top: 7px;
            color: #ff7878;
            font-size: clamp(23px, 3vw, 31px);
            font-weight: 1000;
            letter-spacing: .05em;
            line-height: 1.05;
        }

        #campusQuizEliminatedHearts {
            margin-top: 9px;
            color: #ff4d4d;
            font-size: 21px;
            letter-spacing: .08em;
        }

        #campusQuizEliminatedText {
            margin-top: 10px;
            color: rgba(255,255,255,.82);
            font-size: 13px;
            font-weight: 700;
            line-height: 1.45;
        }

        #campusQuizEliminatedStatus {
            margin-top: 11px;
            padding: 7px 10px;
            border-radius: 9px;
            background: rgba(255,255,255,.055);
            color: #ffd166;
            font-size: 11px;
            font-weight: 900;
            letter-spacing: .025em;
        }

        @media (max-width: 700px) {
            #campusQuizEliminatedNotice {
                width: min(320px, calc(100vw - 20px));
                padding: 16px 15px 14px;
                border-radius: 14px;
            }

            #campusQuizEliminatedIcon {
                font-size: 32px;
            }

            #campusQuizEliminatedText {
                font-size: 11px;
            }

            #campusQuizEliminatedStatus {
                font-size: 10px;
            }
        }

    `;
    document.head.appendChild(style);

    const hud = document.createElement("aside");
    hud.id = "campusQuizSurvivalHud";

    const title = document.createElement("div");
    title.textContent = "";
    title.style.display = "none";
    Object.assign(title.style, {
        color: "#c4a7ff",
        fontSize: "12px",
        fontWeight: "900",
        letterSpacing: ".08em",
        marginBottom: "5px"
    });

    // Keep the existing child positions used by mobileHudLayout.js.
    const hearts = document.createElement("div");
    Object.assign(hearts.style, {
        fontSize: "23px",
        marginBottom: "4px"
    });

    const status = document.createElement("div");
    Object.assign(status.style, {
        fontSize: "12px",
        fontWeight: "800",
        color: "#d8dde5"
    });

    hud.append(title, hearts, status);
    document.body.appendChild(hud);

    const message = document.createElement("div");
    message.id = "campusQuizSurvivalMessage";
    document.body.appendChild(message);

    // SURVIVAL_QUIZ_ELIMINATED_UI_V1
    const eliminatedNotice =
        document.createElement(
            "section"
        );

    eliminatedNotice.id =
        "campusQuizEliminatedNotice";

    eliminatedNotice.hidden =
        true;

    eliminatedNotice.setAttribute(
        "aria-live",
        "assertive"
    );

    eliminatedNotice.innerHTML = `
        <div id="campusQuizEliminatedIcon">💀</div>
        <div id="campusQuizEliminatedTitle">ELIMINATED</div>
        <div id="campusQuizEliminatedHearts">♡ ♡ ♡</div>
        <div id="campusQuizEliminatedText">
            You used all 3 hearts.<br>
            You cannot move because your quiz run is over.
        </div>
        <div id="campusQuizEliminatedStatus">
            SPECTATING • WAIT FOR THE NEXT ROUND
        </div>
    `;

    document.body.appendChild(
        eliminatedNotice
    );

    const showEliminatedNotice =
        () => {
            eliminatedNotice.hidden =
                false;
        };

    const hideEliminatedNotice =
        () => {
            eliminatedNotice.hidden =
                true;
        };

    const returnButton = document.createElement("button");
    returnButton.id = "campusQuizReturnButton";
    returnButton.textContent = "Return to Campus";
    document.body.appendChild(returnButton);

    const resultPanel = document.createElement("section");
    resultPanel.id = "campusQuizResult";
    resultPanel.setAttribute("aria-label", "Quiz result");
    resultPanel.setAttribute("aria-live", "polite");
    const resultSummary = document.createElement("div");
    const playAgainButton = document.createElement("button");
    playAgainButton.id = "campusQuizPlayAgain";
    playAgainButton.textContent = "Play Again";
    resultPanel.append(resultSummary, playAgainButton);
    document.body.appendChild(resultPanel);
    playAgainButton.addEventListener("click", () => {
        if (!active || !socket.connected || replayPending || finishedRoundId === null) return;
        replayPending = true;
        playAgainButton.disabled = true;
        socket.emit("campusQuiz:playAgain", { roundId: finishedRoundId });
    });

    function updateHud() {
        hearts.textContent = `${"♥".repeat(Math.max(0, lives))}${"♡".repeat(Math.max(0, 3 - lives))}`;
        hearts.style.color = lives > 1 ? "#ff6b81" : "#ff3b30";
        const questionValue =
            currentQuestionNumber > 0
                ? `${currentQuestionNumber} / ${totalQuestions}`
                : `0 / ${totalQuestions}`;

        status.innerHTML = `
            <div class="campusQuizStatRow"><span>Question</span><strong>${questionValue}</strong></div>
            <div class="campusQuizStatRow"><span>Score</span><strong>${score.toLocaleString()} / 100</strong></div>
            <div class="campusQuizStatRow"><span>Correct</span><strong>${correctCount}</strong></div>
            <div class="campusQuizStatRow"><span>Wrong</span><strong>${wrongCount}</strong></div>
        `;
    }

    function showMessage(text, color = "#ffffff", duration = 2400) {
        if (messageTimer) window.clearTimeout(messageTimer);

        message.textContent = text;
        message.style.color = color;
        message.style.display = "block";

        messageTimer = window.setTimeout(() => {
            message.style.display = "none";
        }, duration);
    }

    function setActiveUi(value) {
        const isActive =
            Boolean(value);

        document.body.classList.toggle(
            "au-campus-quiz-active",
            isActive
        );

        setCampusQuizMinigameState(
            isActive
        );

        if (!isActive) {
            window.clearTimeout(messageTimer);
            message.style.display = "none";
            resultPanel.style.display = "none";
            hideEliminatedNotice();
        }

        hud.style.display =
            isActive
                ? "block"
                : "none";

        returnButton.style.display =
            isActive
                ? "block"
                : "none";
    }

    const onStarted = (data = {}) => {
        if (active) return;

        hideEliminatedNotice();
        resultPanel.style.display = "none";
        joinPending = false;
        active = true;
        role = "waiting";
        phase = data.phase || "LOBBY";
        lives = Number(data.startingLives) || 3;
        wrongCount = 0;
        totalQuestions = Number(data.questionsPerRound) || 10;
        currentRoundId = data.roundId ?? null;
        currentQuestionId = null;
        lastResultQuestionNumber = 0;
        finishedRoundId = null;
        replayPending = false;
        score = 0;
        correctCount = 0;
        currentQuestionNumber = 0;
        setActiveUi(true);

        // Campus Quiz uses a fixed arena camera instead of FPS.
        enterFixedCamera();

        localPlayer.isLocked = false;
        arena?.setLeaderboard?.(data.leaderboard || []);
        updateHud();
        document.exitPointerLock?.();
    };

    const onRole = (nextRole) => {
        role = nextRole || "none";

        if (role === "spectator") {
            localPlayer.isLocked = true;
            showMessage("Round already started — spectating until the next round", "#c7ccd4", 3200);
        }

        updateHud();
    };

    const onPhase = (nextPhase) => {
        phase = nextPhase || "IDLE";

        if (phase === "LOBBY") {
            hideEliminatedNotice();

            replayPending = false;
            playAgainButton.disabled = false;
            resultPanel.style.display = "none";
            score = 0;
            correctCount = 0;
            wrongCount = 0;
            currentQuestionNumber = 0;
            currentQuestionId = null;
            lastResultQuestionNumber = 0;
            finishedRoundId = null;
            window.clearTimeout(messageTimer);
            message.style.display = "none";
            localPlayer.isLocked = false;
        }

        if (phase === "FINISHED") {
            arena?.setFinished?.();
        }

        updateHud();
    };

    const onLobbyCountdown = (count) => {
        arena?.setWaiting?.(count);
        currentQuestionNumber = 0;
        updateHud();
    };

    const onRoundStarted = (data = {}) => {
        if (currentRoundId !== null && data.roundId <= currentRoundId) return;

        hideEliminatedNotice();
        currentRoundId = data.roundId;
        currentQuestionId = null;
        currentQuestionNumber = 0;
        lastResultQuestionNumber = 0;
        finishedRoundId = null;
        role = "player";
        lives = Number(data.startingLives) || 3;
        wrongCount = 0;
        totalQuestions = Number(data.totalQuestions) || totalQuestions;
        score = 0;
        correctCount = 0;
        localPlayer.isLocked = false;
        showMessage(`Survive ${totalQuestions} questions — ${lives} lives`, "#ffd166", 2600);
        updateHud();
    };

    const onQuestion = (data = {}) => {
        if (data.roundId !== currentRoundId || data.id === currentQuestionId ||
            Number(data.questionNumber) < currentQuestionNumber) return;
        currentQuestionId = data.id;
        currentQuestionNumber = Number(data.questionNumber) || currentQuestionNumber;
        totalQuestions = Number(data.totalQuestions) || totalQuestions;
        arena?.setQuestion?.(data);

        if (role === "player" && lives > 0) {
            localPlayer.isLocked = false;
        }

        updateHud();
    };

    const onReveal = (data = {}) => {
        if (data.roundId !== currentRoundId || data.questionId !== currentQuestionId) return;
        arena?.reveal?.(data);
    };

    const onLifeResult = (data = {}) => {
        if (data.roundId !== currentRoundId || data.questionId !== currentQuestionId ||
            Number(data.questionNumber) <= lastResultQuestionNumber) return;
        lastResultQuestionNumber = Number(data.questionNumber);
        lives = Math.max(0, Number(data.livesRemaining) || 0);
        wrongCount = Number(data.wrongCount) || 0;
        score = Number(data.score) || 0;
        correctCount = Number(data.correctCount) || 0;

        if (data.correct) {
            showMessage("✓ CORRECT — your floor survives!", "#7ee787", 2100);
        } else if (data.eliminated) {
            showMessage("💀 OUT OF HEARTS", "#ff6b6b", 2200);

            showEliminatedNotice();
        } else if (!data.selectedFloorId) {
            showMessage(`No answer floor selected — life lost (${lives} left)`, "#ff9b71", 2600);
        } else {
            showMessage(`Wrong floor — life lost (${lives} left)`, "#ff6b6b", 2600);
        }

        updateHud();
    };

    const onRoundStatus = (rows) => {
        arena?.setPlayerStatus?.(rows || []);
    };

    const onTeleport = ({ position, reason } = {}) => {
        if (!position || ![position.x, position.y, position.z].every(Number.isFinite)) return;

        localPlayer.setGroundedPosition(position, `campus-quiz-${reason || "teleport"}`);

        if (reason === "eliminated" || reason === "spectator") {
            localPlayer.isLocked = true;

            if (
                reason ===
                "eliminated"
            ) {
                showEliminatedNotice();
            }
        } else if (reason === "leave") {
            localPlayer.isLocked = false;
        } else {
            localPlayer.isLocked = false;
        }
    };

    const onFinished = (data = {}) => {
        if (data.roundId !== currentRoundId || finishedRoundId === data.roundId) return;

        hideEliminatedNotice();
        finishedRoundId = data.roundId;
        score = Number(data.score) || 0;
        correctCount = Number(data.correctCount) || 0;
        wrongCount = Number(data.wrongCount) || 0;
        totalQuestions = Number(data.totalQuestions) || totalQuestions;
        arena?.setLeaderboard?.(data.leaderboard || []);
        arena?.setPlayerStatus?.(data.standings || []);
        arena?.setFinished?.();
        localPlayer.isLocked = true;

        window.clearTimeout(messageTimer);
        message.style.display = "none";
        const ranking = data.playerCount > 1 && data.rank
            ? `\nRank: ${data.rank} of ${data.playerCount}` : "";
        const saveStatus = data.rewardSaved === false
            ? "\nPoints could not be saved." : "";
        resultSummary.textContent = data.participated
            ? `Correct: ${correctCount} / ${totalQuestions}\nFinal Score: ${score} / 100${ranking}${saveStatus}`
            : "Round complete. Play Again to join the next quiz.";
        replayPending = false;
        playAgainButton.disabled = false;
        resultPanel.style.display = "block";

        updateHud();
    };

    const onLeaderboard = (rows) => {
        arena?.setLeaderboard?.(rows || []);
    };

    const onError = (text) => {
        joinPending = false;
        active = false;
        role = "none";
        phase = "IDLE";
        localPlayer.isLocked = false;
        restoreFpsCamera();
        setActiveUi(false);
        arena?.setIdle?.();
        console.warn("Campus Quiz:", text);
    };

    const onLeft = () => {
        hideEliminatedNotice();

        joinPending = false;
        active = false;
        role = "none";
        phase = "IDLE";
        lives = 3;
        wrongCount = 0;
        currentRoundId = null;
        currentQuestionId = null;
        lastResultQuestionNumber = 0;
        finishedRoundId = null;
        replayPending = false;
        score = 0;
        correctCount = 0;
        currentQuestionNumber = 0;
        localPlayer.isLocked = false;
        restoreFpsCamera();
        setActiveUi(false);
        arena?.setIdle?.();
        updateHud();
    };

    const onDisconnect = () => {
        onLeft();
    };

    socket.on("campusQuiz:started", onStarted);
    socket.on("campusQuiz:role", onRole);
    socket.on("campusQuiz:phase", onPhase);
    socket.on("campusQuiz:lobbyCountdown", onLobbyCountdown);
    socket.on("campusQuiz:roundStarted", onRoundStarted);
    socket.on("campusQuiz:question", onQuestion);
    socket.on("campusQuiz:reveal", onReveal);
    socket.on("campusQuiz:lifeResult", onLifeResult);
    socket.on("campusQuiz:roundStatus", onRoundStatus);
    socket.on("campusQuiz:teleport", onTeleport);
    socket.on("campusQuiz:finished", onFinished);
    socket.on("campusQuiz:leaderboard", onLeaderboard);
    socket.on("campusQuiz:error", onError);
    socket.on("campusQuiz:left", onLeft);
    socket.on("disconnect", onDisconnect);

    returnButton.addEventListener("click", () => {
        confirmReturnToCampus(() => {
            if (active && socket.connected) socket.emit("campusQuiz:leave");
        });
    });

    const client = {
        requestStart() {
            if (!socket.connected || active || joinPending) return false;
            joinPending = true;
            socket.emit("campusQuiz:join");
            return true;
        },

        requestLeaderboard() {
            if (socket.connected) socket.emit("campusQuiz:leaderboardRequest");
        },

        isActive() {
            return active || joinPending;
        },

        dispose() {
            quizClients.delete(socket);
            if (messageTimer) window.clearTimeout(messageTimer);

            document.body.classList.remove(
                "au-campus-quiz-active"
            );

            setCampusQuizMinigameState(false);

            restoreFpsCamera();

            socket.off("campusQuiz:started", onStarted);
            socket.off("campusQuiz:role", onRole);
            socket.off("campusQuiz:phase", onPhase);
            socket.off("campusQuiz:lobbyCountdown", onLobbyCountdown);
            socket.off("campusQuiz:roundStarted", onRoundStarted);
            socket.off("campusQuiz:question", onQuestion);
            socket.off("campusQuiz:reveal", onReveal);
            socket.off("campusQuiz:lifeResult", onLifeResult);
            socket.off("campusQuiz:roundStatus", onRoundStatus);
            socket.off("campusQuiz:teleport", onTeleport);
            socket.off("campusQuiz:finished", onFinished);
            socket.off("campusQuiz:leaderboard", onLeaderboard);
            socket.off("campusQuiz:error", onError);
            socket.off("campusQuiz:left", onLeft);
            socket.off("disconnect", onDisconnect);

            hud.remove();
            message.remove();
            eliminatedNotice.remove();
            resultPanel.remove();
            returnButton.remove();
            style.remove();
        }
    };
    quizClients.set(socket, client);
    return client;
}
