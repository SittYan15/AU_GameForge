// core/engine.js
import * as BABYLON from "@babylonjs/core";

import "@babylonjs/core/Audio/audioEngine";
import "@babylonjs/core/Audio/audioSceneComponent";

import { CustomLoadingScreen } from "./loadingScreen.js";

export function initEngine(canvasId) {
    const canvas = document.getElementById(canvasId);

    const engine = new BABYLON.Engine(
        canvas,
        true,
        {
            audioEngine: true
        }
    );

    engine.loadingScreen =
        new CustomLoadingScreen();

    window.addEventListener(
        "resize",
        () => engine.resize()
    );

    return {
        engine,
        canvas
    };
}