// app.js (or index.js, whatever your main file is named)
import * as BABYLON from "@babylonjs/core";
import "@babylonjs/loaders/glTF";

// ---> IMPORT YOUR NEW FILES HERE <---
import { createPlayer } from "./player.js";
import { createNPC } from "./npc.js";
import { createCar } from "./car.js";

const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

// ==========================================
// CUSTOM LOADING SCREEN OVERLAY
// ==========================================
class CustomLoadingScreen {
    constructor() {
        this.loadingUIText = "Loading AU Campus..."; 
        this.loadingUIBackgroundColor = "#111111"; // Dark background
    }

    displayLoadingUI() {
        // 1. Create the dark background overlay
        this.loadingDiv = document.createElement("div");
        this.loadingDiv.id = "customLoadingScreen";
        this.loadingDiv.style.position = "absolute";
        this.loadingDiv.style.top = "0";
        this.loadingDiv.style.left = "0";
        this.loadingDiv.style.width = "100%";
        this.loadingDiv.style.height = "100%";
        this.loadingDiv.style.backgroundColor = this.loadingUIBackgroundColor;
        this.loadingDiv.style.display = "flex";
        this.loadingDiv.style.flexDirection = "column";
        this.loadingDiv.style.alignItems = "center";
        this.loadingDiv.style.justifyContent = "center";
        this.loadingDiv.style.zIndex = "9999";
        this.loadingDiv.style.fontFamily = "sans-serif";
        this.loadingDiv.style.transition = "opacity 0.5s ease"; // Smooth fade out

        // 2. Create the loading text
        const text = document.createElement("div");
        text.innerHTML = this.loadingUIText;
        text.style.color = "white";
        text.style.fontSize = "24px";
        text.style.fontWeight = "bold";
        text.style.marginBottom = "20px";
        this.loadingDiv.appendChild(text);

        // 3. Create the empty progress bar container
        const barContainer = document.createElement("div");
        barContainer.style.width = "300px";
        barContainer.style.height = "12px";
        barContainer.style.backgroundColor = "#333";
        barContainer.style.borderRadius = "6px";
        barContainer.style.overflow = "hidden";

        // 4. Create the colored animated fill
        this.progressBar = document.createElement("div");
        this.progressBar.style.width = "0%";
        this.progressBar.style.height = "100%";
        this.progressBar.style.backgroundColor = "#E53935"; // A nice red color
        this.progressBar.style.transition = "width 0.2s ease-out";
        barContainer.appendChild(this.progressBar);

        // Attach everything to the screen
        this.loadingDiv.appendChild(barContainer);
        document.body.appendChild(this.loadingDiv);

        // 5. Simulate a smooth loading animation up to 90%
        this.progress = 0;
        this.loadingInterval = setInterval(() => {
            this.progress += (90 - this.progress) * 0.1; // Slows down as it approaches 90
            if (this.progressBar) {
                this.progressBar.style.width = this.progress + "%";
            }
        }, 100);
    }

    hideLoadingUI() {
        if (this.loadingDiv) {
            // Stop the simulation and snap the bar to 100%
            clearInterval(this.loadingInterval);
            this.progressBar.style.width = "100%";
            
            // Wait a fraction of a second so the user sees it hit 100%, then fade out
            setTimeout(() => {
                this.loadingDiv.style.opacity = "0";
                setTimeout(() => {
                    this.loadingDiv.remove();
                }, 500); // Matches the CSS transition time
            }, 300); 
        }
    }
}

// ---> TELL THE ENGINE TO USE OUR NEW UI <---
engine.loadingScreen = new CustomLoadingScreen();
engine.displayLoadingUI();

const createScene = async () => {
    const scene = new BABYLON.Scene(engine);

    // Cloudflare R2 Public URL
    const r2BaseUrl = "https://pub-1594e8b359fe4ef08605e86f19e11eeb.r2.dev/";

    // World Setup
    scene.gravity = new BABYLON.Vector3(0, -0.05, 0);
    scene.collisionsEnabled = true;

    const light = new BABYLON.HemisphericLight("ambientLight", new BABYLON.Vector3(0, 1, 0), scene);
    light.intensity = 0.5;

    // ==========================================
    // ADD HDRI SKYBOX AND LIGHTING
    // ==========================================
    // 1. Load the HDRI/Environment texture
    // (Babylon prefers highly optimized .env files over raw .hdr files)
    const envTexture = BABYLON.CubeTexture.CreateFromPrefilteredData("./e_citrus_orchard_road_puresky_2k.env", scene);

    // 2. Tell the scene to use this texture to light your 3D models accurately
    scene.environmentTexture = envTexture;

    // 3. Create the visible Skybox using the helper
    const envHelper = scene.createDefaultEnvironment({
        createSkybox: true,
        skyboxSize: 1500,
        skyboxTexture: envTexture,
        createGround: false, // Ground is false because we have the map
        skyboxColor: new BABYLON.Color3(1, 1, 1) // THE FIX: Pure white prevents the texture from being tinted
    });

    // Temporary target for camera before player loads
    const camera = new BABYLON.ArcRotateCamera("thirdPersonCamera", Math.PI / 2, Math.PI / 3, 6, BABYLON.Vector3.Zero(), scene);
    camera.attachControl(canvas, true);

    // 1. FIX THE DISAPPEARING WALLS:
    // Lower the near-clipping plane so objects don't disappear when you get close
    camera.minZ = 0.05;

    camera.lowerRadiusLimit = 2;
    camera.upperRadiusLimit = 15;
    camera.lowerBetaLimit = 0.1;

    // 2. FIX LOOKING UP AT THE SKY:
    // Increase the beta limit from (Math.PI / 2) * 0.95 to nearly Math.PI
    // This allows the camera to drop low and point upwards
    camera.upperBetaLimit = (Math.PI / 2) + 0.1;

    // ==========================================
    // CAMERA ZOOM TRACKER
    // ==========================================
    let targetZoom = 6; // Default starting zoom
    let isFirstPerson = false; // Add this!

    scene.onPrePointerObservable.add((info) => {
        if (info.type === BABYLON.PointerEventTypes.POINTERWHEEL && !isFirstPerson) { // Only allow zooming in third-person mode
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
    scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyUpTrigger, function (evt) {
        let key = evt.sourceEvent.key.toLowerCase();
        inputMap[key] = evt.sourceEvent.type === "keydown"; // Needs to be false on KeyUp

        // ==========================================
        // CAMERA TOGGLE (V KEY)
        // ==========================================
        if (key === "v" && player) {
            isFirstPerson = !isFirstPerson;

            if (isFirstPerson) {
                // Switch to FPS
                camera.lockedTarget = headNode; 
                camera.lowerRadiusLimit = 0.01;
                camera.upperRadiusLimit = 0.01;
                camera.radius = 0.01;
                
                // UNLOCK THE ANGLE: Allow full sky-viewing in First-Person
                camera.upperBetaLimit = Math.PI - 0.1; 
                
                if (player.characterMesh) player.characterMesh.setEnabled(false);
            } else {
                // Switch back to TPS
                camera.lockedTarget = player; 
                camera.lowerRadiusLimit = 2;
                camera.upperRadiusLimit = 15;
                camera.radius = targetZoom; 
                
                // RE-LOCK THE ANGLE: Stop the camera from hitting the floor in Third-Person
                camera.upperBetaLimit = (Math.PI / 2) + 0.2; 
                
                if (player.characterMesh) player.characterMesh.setEnabled(true);
            }
        }
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
        const result = await BABYLON.SceneLoader.ImportMeshAsync("", r2BaseUrl, "au_campus_v0.7.3.glb", scene);
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

    // Create the First-Person head tracker attached to the player's position
    const headNode = new BABYLON.TransformNode("headNode", scene);
    headNode.parent = player;
    headNode.position = new BABYLON.Vector3(0, 0.8, 0.2); // Up at eye level, slightly forward

    // ==========================================
    // PRO CAMERA COLLISION (Raycast)
    // ==========================================
    scene.onBeforeRenderObservable.add(() => {
        if (player && !isFirstPerson) { // Only do this in third-person mode
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
    // SPAWN TRAFFIC
    // ==========================================
    // Define a square loop down the street
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

    // Spawn the car! Notice we are passing the `player` variable to it
    // so the car's raycast knows exactly what to look out for.
    createCar(scene, "BlueCruiser", carRoute, player);

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