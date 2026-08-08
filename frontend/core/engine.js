// core/engine.js
import * as BABYLON from "@babylonjs/core";
import { CustomLoadingScreen } from "./loadingScreen.js";

export function initEngine(canvasId) {
    const canvas = document.getElementById(canvasId);
    const engine = new BABYLON.Engine(canvas, true);
    engine.loadingScreen = new CustomLoadingScreen();
    
    window.addEventListener("resize", () => engine.resize());
    
    return { engine, canvas };
}