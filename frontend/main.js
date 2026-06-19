// app.js (or index.js, whatever your main file is named)
import * as BABYLON from "@babylonjs/core";
import "@babylonjs/loaders/glTF";

// ---> IMPORT YOUR NEW FILES HERE <---
import { createPlayer } from "./player.js";
import { createNPC } from "./npc.js";

const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

const createScene = async () => {
    const scene = new BABYLON.Scene(engine);

    // World Setup
    scene.gravity = new BABYLON.Vector3(0, -0.15, 0); 
    scene.collisionsEnabled = true;

    const light = new BABYLON.HemisphericLight("ambientLight", new BABYLON.Vector3(0, 1, 0), scene);
    light.intensity = 1.0;

    // Temporary target for camera before player loads
    const camera = new BABYLON.ArcRotateCamera("thirdPersonCamera", Math.PI / 2, Math.PI / 3, 6, BABYLON.Vector3.Zero(), scene);
    camera.attachControl(canvas, true);
    
    camera.lowerRadiusLimit = 2;
    camera.upperRadiusLimit = 15;
    camera.lowerBetaLimit = 0.1;
    camera.upperBetaLimit = (Math.PI / 2) * 0.95;

    // ==========================================
    // CAMERA ZOOM TRACKER
    // ==========================================
    let targetZoom = 6; // Default starting zoom

    scene.onPrePointerObservable.add((info) => {
        if (info.type === BABYLON.PointerEventTypes.POINTERWHEEL) {
            // Adjust the target zoom based on the scroll wheel
            targetZoom += (info.event.deltaY > 0 ? 0.5 : -0.5);
            // Clamp it so they can't zoom too far in or out
            targetZoom = Math.max(camera.lowerRadiusLimit, Math.min(camera.upperRadiusLimit, targetZoom));
        }
    });

    // Input Setup
    const inputMap = {};
    scene.actionManager = new BABYLON.ActionManager(scene);
    scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyDownTrigger, function (evt) {
        inputMap[evt.sourceEvent.key.toLowerCase()] = evt.sourceEvent.type === "keydown";
    }));
    scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyUpTrigger, function (evt) {
        inputMap[evt.sourceEvent.key.toLowerCase()] = evt.sourceEvent.type === "keydown";
    }));

    // ==========================================
    // POINTER LOCK (Hide Cursor)
    // ==========================================
    scene.onPointerDown = (evt) => {
        // evt.button === 0 means "Left Mouse Click"
        if (evt.button === 0) {
            engine.enterPointerlock();
        }
    };

    // Import the Campus Map
    try {
        const result = await BABYLON.SceneLoader.ImportMeshAsync("", "./", "au_campus_v0.6.glb", scene);
        result.meshes.forEach((mesh) => {
            if (mesh.isVisible && mesh.name !== "__root__") {
                mesh.checkCollisions = true;
            }
        });
    } catch (error) {
        console.error("Map error:", error);
    }

    // ==========================================
    // INITIALIZE YOUR ENTITIES HERE
    // ==========================================
    
    // 1. Spawn the Player
    const player = await createPlayer(scene, camera, inputMap);
    
    // ==========================================
    // PRO CAMERA COLLISION (Raycast)
    // ==========================================
    scene.onBeforeRenderObservable.add(() => {
        if (player) {
            // 1. Shoot a laser from the player's head towards the camera
            let headPosition = player.position.clone();
            headPosition.y += 1.5; // Lift the laser up to shoulder/head level
            
            let direction = camera.position.subtract(headPosition).normalize();
            let ray = new BABYLON.Ray(headPosition, direction, targetZoom);

            // 2. Check if the laser hits any walls on the map
            let hit = scene.pickWithRay(ray, (mesh) => {
                // Ignore the player, NPCs, and invisible triggers. Only hit solid map walls!
                return mesh.checkCollisions && mesh.isVisible && mesh.name !== "player" && !mesh.name.includes("_collider");
            });

            if (hit.hit) {
                // Wall detected! Snap the camera tightly in front of the wall
                camera.radius = hit.distance - 0.2; 
            } else {
                // No wall! Smoothly glide the camera back out to the player's desired zoom
                camera.radius = BABYLON.Scalar.Lerp(camera.radius, targetZoom, 0.1);
            }
        }
    });

    // 2. Define the route for NPC 1 (Campus Tour Guide)
    const routeOne = [
        new BABYLON.Vector3(-60.15, 1.53, 50.57),
        new BABYLON.Vector3(-64.33, 1.53, -61.37),
        new BABYLON.Vector3(-67.37, 1.53, 4.34)
    ];
    // Spawn NPC 1
    createNPC(scene, "TourGuide", new BABYLON.Vector3(-66.45, 1.53, 16.32), routeOne);

    // 3. Define the route for NPC 2 (Lost Student)
    const routeTwo = [
        new BABYLON.Vector3(-67.41, 1.53, 1.48),
        new BABYLON.Vector3(-50.60, 1.53, -47.27),
        new BABYLON.Vector3(-68.89, 1.53, 63.22)
    ];
    // Spawn NPC 2 in a totally different location!
    createNPC(scene, "LostStudent", new BABYLON.Vector3(-66.58, 1.53, -6.79), routeTwo);

    // ==========================================
    // WAYPOINT HELPER: Click to get coordinates
    // ==========================================
    // scene.onPointerDown = function (evt, pickResult) {
    //     // Only log if we actually clicked on a mesh (like the ground)
    //     if (pickResult.hit) {
    //         let p = pickResult.pickedPoint;
            
    //         // Format it exactly how the NPC array needs it
    //         console.log(`new BABYLON.Vector3(${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)}),`);
            
    //         // Optional: Spawn a tiny red sphere so you can visually see where you clicked!
    //         let marker = BABYLON.MeshBuilder.CreateSphere("marker", { diameter: 0.5 }, scene);
    //         marker.position = p;
    //         let mat = new BABYLON.StandardMaterial("redMat", scene);
    //         mat.diffuseColor = new BABYLON.Color3(1, 0, 0); // Red
    //         marker.material = mat;
    //     }
    // };

    return scene;
};

// Start Game Loop
createScene().then((scene) => {
    engine.hideLoadingUI();
    const fpsElement = document.getElementById("fpsCounter");
    engine.runRenderLoop(() => {
        scene.render();
        if (fpsElement) fpsElement.innerHTML = engine.getFps().toFixed(0) + " FPS";
    });
});

window.addEventListener("resize", () => engine.resize());