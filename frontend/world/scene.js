// world/scene.js
import * as BABYLON from "@babylonjs/core";
import { createPlayer } from "../player.js";
import { createNPC } from "../npc.js";
import { createCar } from "../car.js";
import { markWalkableGround } from "../grounding.js";

export async function createMainScene(engine, canvas, BaseUrl, inputMapRef, animationCallback) {
    const scene = new BABYLON.Scene(engine);

    // World Setup
    scene.gravity = new BABYLON.Vector3(0, -0.05, 0);
    scene.collisionsEnabled = true;

    const light = new BABYLON.HemisphericLight("ambientLight", new BABYLON.Vector3(0, 1, 0), scene);
    light.intensity = 0.5;

    const envTexture = BABYLON.CubeTexture.CreateFromPrefilteredData("./e_noon_puresky_2k.env", scene);
    scene.environmentTexture = envTexture;
    const skybox = scene.createDefaultSkybox(envTexture, true, 1500);

    // camera setup
    const camera = new BABYLON.ArcRotateCamera("thirdPersonCamera", Math.PI / 2, Math.PI / 3, 6, BABYLON.Vector3.Zero(), scene);
    camera.attachControl(canvas, true);
    camera.minZ = 0.05;

    try {
        const result = await BABYLON.SceneLoader.ImportMeshAsync("", BaseUrl, "au_campus_exterior_v1.0.0.glb", scene);
        result.meshes.forEach((mesh) => {
            if (mesh.isVisible && mesh.name !== "__root__") {
                mesh.checkCollisions = true;
                markWalkableGround(mesh);
            }
        });
    } catch (error) {
        console.error("Exterior map error:", error);
    }

    const player = await createPlayer(scene, camera, inputMapRef, animationCallback);

    const headNode = new BABYLON.TransformNode("headNode", scene);
    headNode.parent = player;
    headNode.position = new BABYLON.Vector3(0, 0.8, 0.2);

    // ... NPC routes, and Car spawning here ...

    const routeOne = [
        new BABYLON.Vector3(-60.15, 1.53, 50.57),
        new BABYLON.Vector3(-64.33, 1.53, -61.37),
        new BABYLON.Vector3(-67.37, 1.53, 4.34)
    ];
    // Spawn NPC 1
    createNPC(scene, "TourGuide", new BABYLON.Vector3(-66.45, 1.53, 16.32), routeOne);

    const routeTwo = [
        new BABYLON.Vector3(-67.41, 1.53, 1.48),
        new BABYLON.Vector3(-50.60, 1.53, -47.27),
        new BABYLON.Vector3(-68.89, 1.53, 63.22)
    ];
    // Spawn NPC 2
    createNPC(scene, "LostStudent", new BABYLON.Vector3(-66.58, 1.53, -6.79), routeTwo);

    // ==========================================
    // SPAWN TRAFFIC
    // ==========================================
    const carRoute = [
        new BABYLON.Vector3(-123.99, -0.00, -6.33),
        new BABYLON.Vector3(-406.43, -0.00, -4.86),
        new BABYLON.Vector3(-438.58, 2.63, -3.86),
        new BABYLON.Vector3(-473.45, -0.01, -4.41),
        new BABYLON.Vector3(-487.27, -0.02, -7.19),
        new BABYLON.Vector3(-487.88, -0.02, -68.70),
        new BABYLON.Vector3(-526.67, -0.02, -80.68),
        new BABYLON.Vector3(-723.18, -0.02, -79.98),
        new BABYLON.Vector3(-724.72, -0.02, 79.47),
        new BABYLON.Vector3(-494.83, -0.02, 78.75),
        new BABYLON.Vector3(-489.07, -0.02, 5.86),
        new BABYLON.Vector3(-466.02, 0.17, 4.42),
        new BABYLON.Vector3(-442.86, 2.73, 3.24),
        new BABYLON.Vector3(-401.93, 0.00, 5.78),
        new BABYLON.Vector3(-128.06, 0.00, 6.91)
    ];

    createCar(scene, "BlueCruiser", carRoute, player);

    return { scene, camera, player, headNode };
}