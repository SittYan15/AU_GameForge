import * as BABYLON from "@babylonjs/core";
// CRITICAL: This import is required to parse .glb and .gltf files
import "@babylonjs/loaders/glTF"; 

const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

const createScene = async () => {
    const scene = new BABYLON.Scene(engine);

    // 1. Enable Global Gravity and Collisions
    scene.gravity = new BABYLON.Vector3(0, -0.15, 0); // Downward force
    scene.collisionsEnabled = true;

    // 2. Setup Lighting
    const light = new BABYLON.HemisphericLight("ambientLight", new BABYLON.Vector3(0, 1, 0), scene);
    light.intensity = 1.0;

    // 3. Setup the Player Camera (First-Person Movement)
    // Spawn the camera at X:0, Y:5, Z:0 (starting slightly in the air avoids falling through the floor)
    const camera = new BABYLON.UniversalCamera("playerCamera", new BABYLON.Vector3(0, 5, 0), scene);
    camera.attachControl(canvas, true);

    // Apply physics rules to the camera
    camera.applyGravity = true;
    camera.checkCollisions = true;

    // Define the player's physical size (Width, Height, Depth)
    camera.ellipsoid = new BABYLON.Vector3(1, 1, 1);
    
    // Movement settings
    camera.speed = 0.3; // Walking speed
    camera.angularSensibility = 4000; // Mouse look sensitivity

    // Map WASD keys for movement (Babylon defaults to Arrow Keys)
    camera.keysUp.push(87);    // W
    camera.keysDown.push(83);  // S
    camera.keysLeft.push(65);  // A
    camera.keysRight.push(68); // D

    // 4. Import the GLB Mesh
    try {
        // If your file is in the "public" folder of your Vite project, use "./"
        // If it is on Cloudflare R2, replace "./" with "https://your-r2-url.com/"
        const rootUrl = "./"; 
        const fileName = "MAV_au_campus_v0.4.1.glb";

        const result = await BABYLON.SceneLoader.ImportMeshAsync("", rootUrl, fileName, scene);

        // Loop through all pieces of the 3D model and make them solid
        result.meshes.forEach((mesh) => {
            mesh.checkCollisions = true;
        });

        console.log("Mesh loaded successfully and collisions are active!");

    } catch (error) {
        console.error("Error loading the GLB file:", error);
    }

    return scene;
};

// 5. Initialize the Scene and Start the Game Loop
createScene().then((scene) => {
    // Hide the default HTML loading text once the scene is ready
    engine.hideLoadingUI(); 

    engine.runRenderLoop(() => {
        scene.render();
    });
});

// 6. Handle Window Resizing
window.addEventListener("resize", () => {
    engine.resize();
});