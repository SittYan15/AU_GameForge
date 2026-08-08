// app.js
import * as BABYLON from "@babylonjs/core";
import "@babylonjs/loaders/glTF";

// Core UI and Systems
import { initAuth } from "./ui/auth.js";
import { setupChat, addChatMessage } from "./ui/chat.js";
import { setupProfile } from "./ui/profile.js";
import { initEngine } from "./core/engine.js";
import { InputController } from "./core/input.js";

// World Systems
import { createMainScene } from "./world/scene.js";
import { initChunkManager } from "./world/chunkManager.js";
import { createMultiplayer } from "./multiplayer.js";

const { engine, canvas } = initEngine("renderCanvas");

// Between the two BaseUrl definitions, you can choose which one to use based on your deployment. The first one is a remote URL, while the second one is a local path.
const BaseUrl = "https://pub-1594e8b359fe4ef08605e86f19e11eeb.r2.dev/";
// const BaseUrl = "./au_campus/";

let multiplayer = null;
let currentSession = null;
let gameStarted = false;

async function startGame(session) {
    if (gameStarted) return;
    gameStarted = true;
    currentSession = session;

    document.getElementById("welcomeScreen").hidden = true;
    document.querySelectorAll(".game-ui").forEach(el => el.hidden = false);

    engine.resize();
    engine.displayLoadingUI();

    try {
        // Connect the reference map so the player movement script can read it
        const inputMapRef = {};
        const { scene, camera, player, headNode } = await createMainScene(engine, canvas, BaseUrl, inputMapRef, (animation) => multiplayer?.sendAnimation(animation));

        // Pass inputMapRef directly into the controller
        const inputController = new InputController(scene, camera, player, headNode, inputMapRef);

        initChunkManager(scene, player, BaseUrl);

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
            await setupProfile(session, multiplayer);
            setupChat(multiplayer);
        } catch (error) {
            console.error("Multiplayer initialization failed:", error);
        }

        engine.hideLoadingUI();

        // Start Game Loop
        const fpsElement = document.getElementById("fpsCounter");
        engine.runRenderLoop(() => {
            scene.render();
            if (fpsElement) fpsElement.innerHTML = engine.getFps().toFixed(0) + " FPS";
        });

    } catch (error) {
        gameStarted = false;
        engine.hideLoadingUI();
        document.getElementById("welcomeScreen").hidden = false;
        document.querySelectorAll(".game-ui").forEach(el => el.hidden = true);
        console.error(`Could not load the game: ${error.message}`);
    }
}

// Boot the application by initializing the auth listeners and passing the start function
initAuth(startGame);