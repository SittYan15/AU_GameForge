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

    // 3. Create the Invisible Player Physics Collider
    // We keep the capsule for physics, but make it INVISIBLE so we only see the Blender boy
    const player = BABYLON.MeshBuilder.CreateCapsule("player", { radius: 0.5, height: 2 }, scene);
    player.position = new BABYLON.Vector3(-100, 5, 0); // Your custom spawn point
    player.checkCollisions = true;
    player.ellipsoid = new BABYLON.Vector3(0.5, 1, 0.5);
    player.ellipsoidOffset = new BABYLON.Vector3(0, 1, 0);
    player.isVisible = false; // <-- CRITICAL: This hides the capsule

    // 4. Setup the Third-Person Camera
    const camera = new BABYLON.ArcRotateCamera("thirdPersonCamera", Math.PI / 2, Math.PI / 3, 6, player.position, scene);
    camera.attachControl(canvas, true);
    camera.lockedTarget = player;
    camera.lowerRadiusLimit = 2;
    camera.upperRadiusLimit = 15;
    camera.lowerBetaLimit = 0.1;
    camera.upperBetaLimit = (Math.PI / 2) * 0.95;

    // 5. Setup Keyboard Movement Inputs
    const inputMap = {};
    scene.actionManager = new BABYLON.ActionManager(scene);
    scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyDownTrigger, function (evt) {
        inputMap[evt.sourceEvent.key.toLowerCase()] = evt.sourceEvent.type === "keydown";
    }));
    scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyUpTrigger, function (evt) {
        inputMap[evt.sourceEvent.key.toLowerCase()] = evt.sourceEvent.type === "keydown";
    }));

    // 6. Animation Variables & Smooth Transition Logic
    let characterMesh = null;
    let idleAnim = null;
    let walkAnim = null;
    let runAnim = null;
    let currentAnim = null;

    const transitionTo = (newAnim) => {
        if (!newAnim || currentAnim === newAnim) return;
        currentAnim.stop(); // Stop the old animation
        newAnim.start(true, 1.0, newAnim.from, newAnim.to, false); // Start the new one looping
        currentAnim = newAnim;
    };

    // 7. Import the Blender Character & Animations
    try {
        const charResult = await BABYLON.SceneLoader.ImportMeshAsync("", "./", "AuBoyAnimations.glb", scene);

        // ADD THIS LINE: Stop all overlapping animations from auto-playing!
        scene.animationGroups.forEach(anim => anim.stop());

        characterMesh = charResult.meshes[0];
        characterMesh.parent = player;
        characterMesh.position = new BABYLON.Vector3(0, 0, 0);
        characterMesh.rotation = new BABYLON.Vector3(0, Math.PI, 0);

        idleAnim = scene.getAnimationGroupByName("bidle");
        walkAnim = scene.getAnimationGroupByName("bwalk");
        runAnim = scene.getAnimationGroupByName("brun");

        if (idleAnim) {
            idleAnim.start(true, 1.0, idleAnim.from, idleAnim.to, false);
            currentAnim = idleAnim;
        }
    } catch (error) {
        console.error("Error loading the character:", error);
    }

    // 8. Import the Campus GLB Mesh
    try {
        const rootUrl = "./";
        const fileName = "LPC_au_campus_v0.6.1.glb"; // Your updated campus file

        const result = await BABYLON.SceneLoader.ImportMeshAsync("", rootUrl, fileName, scene);

        result.meshes.forEach((mesh) => {
            mesh.checkCollisions = true;
        });

        console.log("Mesh loaded successfully and collisions are active!");
    } catch (error) {
        console.error("Error loading the GLB file:", error);
    }

    // Player movement speed
    const walkSpeed = 0.15;
    const runSpeed = 0.3;

    // 9. Movement, Physics, and Animation Loop
    scene.onBeforeRenderObservable.add(() => {
        let velocity = BABYLON.Vector3.Zero();
        let isMoving = false;
        let isRunning = inputMap["shift"]; // Hold Shift to run

        let speed = isRunning ? runSpeed : walkSpeed;

        let forward = camera.getDirection(BABYLON.Vector3.Forward());
        forward.y = 0;
        forward.normalize();

        let right = camera.getDirection(BABYLON.Vector3.Right());
        right.y = 0;
        right.normalize();

        if (inputMap["w"]) { velocity.addInPlace(forward.scale(speed)); isMoving = true; }
        if (inputMap["s"]) { velocity.addInPlace(forward.scale(-speed)); isMoving = true; }
        if (inputMap["a"]) { velocity.addInPlace(right.scale(-speed)); isMoving = true; }
        if (inputMap["d"]) { velocity.addInPlace(right.scale(speed)); isMoving = true; }

        velocity.y = scene.gravity.y;
        player.moveWithCollisions(velocity);

        // Turn the character mesh to face the direction you are walking
        if (characterMesh && isMoving) {
            let targetAngle = Math.atan2(velocity.x, velocity.z);
            characterMesh.rotation.y = targetAngle;
        }

        // Switch animations based on movement state
        if (characterMesh) {
            if (!isMoving) {
                transitionTo(idleAnim);
            } else if (isMoving && !isRunning) {
                transitionTo(walkAnim);
            } else if (isMoving && isRunning) {
                transitionTo(runAnim);
            }
        }
    });

    return scene;
};

// 10. Initialize the Scene and Start the Game Loop
createScene().then((scene) => {
    engine.hideLoadingUI();

    const fpsElement = document.getElementById("fpsCounter");

    engine.runRenderLoop(() => {
        scene.render();

        if (fpsElement) {
            fpsElement.innerHTML = engine.getFps().toFixed(0) + " FPS";
        }
    });
});

window.addEventListener("resize", () => {
    engine.resize();
});