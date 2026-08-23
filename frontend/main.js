// app.js
import * as BABYLON from "@babylonjs/core";
import "@babylonjs/loaders/glTF";

// Core UI and Systems
import { initAuth } from "./ui/auth.js";
import { setupChat, addChatMessage } from "./ui/chat.js";
import { setupProfile } from "./ui/profile.js";
import "./ui/mobileHudLayout.js";
import { initEngine } from "./core/engine.js";
import { InputController } from "./core/input.js";

// World Systems
import { createMainScene } from "./world/scene.js";
import { initChunkManager } from "./world/chunkManager.js";
import { clearTabAuthentication, createMultiplayer, keepSessionAlive } from "./multiplayer.js";
import { claimGameTab, releaseGameTab } from "./gameTabLock.js";

const { engine, canvas } = initEngine("renderCanvas");

// const BaseUrl = "https://pub-1594e8b359fe4ef08605e86f19e11eeb.r2.dev/";
const BaseUrl = "./au_campus/";

let multiplayer = null;
let currentSession = null;
let gameStarted = false;
let handlingSessionReplacement = false;
let startupStage = "Idle";

function setStartupStage(stage) {
    startupStage = stage;
    console.log("[Startup]", stage);
}

window.addEventListener("auth:session-replaced", (event) => {
    if (handlingSessionReplacement) return;
    handlingSessionReplacement = true;
    const message = event.detail?.message ||
        "Your account was logged in from another browser or device. Please log in again.";
    sessionStorage.setItem("auGameForgeAuthMessage", message);
    multiplayer?.dispose();
    multiplayer = null;
    currentSession = null;
    clearTabAuthentication();
    releaseGameTab();
    window.location.reload();
});

function showGameAlreadyOpen() {
    multiplayer?.dispose();
    multiplayer = null;
    releaseGameTab();
    document.querySelectorAll(".game-ui").forEach((element) => { element.hidden = true; });
    document.getElementById("welcomeScreen").hidden = true;
    let screen = document.getElementById("gameAlreadyOpenScreen");
    if (!screen) {
        screen = document.createElement("section");
        screen.id = "gameAlreadyOpenScreen";
        screen.innerHTML = "<div><h1>Game Already Open</h1><p>This game is already running in another tab. Please return to the existing tab.</p></div>";
        document.body.appendChild(screen);
    }
    screen.hidden = false;
}

window.addEventListener("game:duplicate-tab", showGameAlreadyOpen);

async function startGame(session) {
    if (gameStarted) return;
    const tabClaim = await claimGameTab(session);
    if (!tabClaim.allowed) {
        showGameAlreadyOpen();
        return;
    }
    session = { ...session, gameTabId: tabClaim.tabId };
    gameStarted = true;
    currentSession = session;

    window.multiplayerInstance = multiplayer;

    document.getElementById("welcomeScreen").hidden = true;
    document.querySelectorAll(".game-ui").forEach(el => el.hidden = false);

    engine.resize();
    engine.displayLoadingUI();
    const startupHeartbeat = session.accountType === "user"
        ? window.setInterval(() => { void keepSessionAlive().catch(() => {}); }, 1000)
        : null;
    if (session.accountType === "user") void keepSessionAlive().catch(() => {});

    try {
        setStartupStage("Creating main scene");

        // Connect the reference map so the player movement script can read it
        const inputMapRef = {};
        const { scene, camera, player, headNode } = await createMainScene(
            engine,
            canvas,
            BaseUrl,
            inputMapRef,
            (animation) => multiplayer?.sendAnimation(animation),
            engine.loadingScreen
        );

        engine.loadingScreen?.setStatus?.(
            "Content download complete",
            "Connecting to multiplayer..."
        );

        setStartupStage("Creating input controller");

        // Pass inputMapRef directly into the controller
        const inputController = new InputController(scene, camera, player, headNode, inputMapRef);

        setStartupStage("Starting chunk manager");
        initChunkManager(scene, player, BaseUrl);

        setStartupStage("Initializing multiplayer");

        // Initialize Network Features
        try {
            multiplayer = await createMultiplayer(scene, player, session, {
                onConnectionChanged: (c) => {
                    const s = document.getElementById("multiplayerStatus");
                    if (s) s.textContent = c ? "Online" : "Offline";
                },
                onPlayerCountChanged: (count) => {
                    const el = document.getElementById("playerCountText");
                    if (el) el.textContent = `AU Campus — ${count} players`;
                },
                onError: (e) => console.warn(e),
                onChatHistory: (messages) => {/* Set chat history using UI func */ },
                onChatMessage: addChatMessage
            });
            if (startupHeartbeat) clearInterval(startupHeartbeat);
            window.multiplayerInstance = multiplayer;
            await setupProfile(session, multiplayer);
            setupChat(multiplayer);
        } catch (error) {
            if (startupHeartbeat) clearInterval(startupHeartbeat);
            console.error("Multiplayer initialization failed:", error);
        }

        setStartupStage("Starting render loop");
        engine.hideLoadingUI();

        // Start Game Loop
        const fpsElement = document.getElementById("fpsCounter");
        engine.runRenderLoop(() => {
            scene.render();
            if (fpsElement) fpsElement.innerHTML = engine.getFps().toFixed(0) + " FPS";
        });

    } catch (error) {
        if (startupHeartbeat) clearInterval(startupHeartbeat);
        releaseGameTab();
        gameStarted = false;
        engine.hideLoadingUI();
        document.getElementById("welcomeScreen").hidden = false;
        document.querySelectorAll(".game-ui").forEach(el => el.hidden = true);

        const originalMessage =
            error?.message ||
            String(error) ||
            "Unknown startup error";

        const startupError =
            new Error(
                `Game startup failed during "${startupStage}": ${originalMessage}`
            );

        startupError.cause = error;

        console.error(
            "[AU GameForge startup failure]",
            {
                stage: startupStage,
                originalError: error,
                userAgent: navigator.userAgent
            }
        );

        throw startupError;
    }
}

// Boot the application by initializing the auth listeners and passing the start function
initAuth(startGame);
