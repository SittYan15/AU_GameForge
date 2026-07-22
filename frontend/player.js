// player.js
import * as BABYLON from "@babylonjs/core";
import {
    calculateCharacterGrounding,
    CHARACTER_SCALE,
    groundNetworkPosition,
    markNonGround
} from "./grounding.js";

export const createPlayer = async (scene, camera, inputMap, onAnimationChanged = () => {}) => {
    const player = BABYLON.MeshBuilder.CreateCapsule("player", { radius: 0.3, height: 2 }, scene);
    player.position = new BABYLON.Vector3(-100, 10, 0);
    player.checkCollisions = true;
    player.ellipsoid = new BABYLON.Vector3(0.3, 1, 0.3);
    player.ellipsoidOffset = new BABYLON.Vector3(0, 0, 0);
    player.stepOffset = 0.5; // This helps the player "step" over tiny floor inaccuracies
    markNonGround(player, "local-player");
    
    // ==========================================
    // DEBUG: SHOW COLLIDER
    // ==========================================
    player.isVisible = false; // Change this from false to true!

    const wireMat = new BABYLON.StandardMaterial("wireMat", scene);
    wireMat.wireframe = true;
    wireMat.emissiveColor = new BABYLON.Color3(1, 0, 0); // Bright Red
    player.material = wireMat;
    // ==========================================

    camera.lockedTarget = player;

    let characterMesh = null;
    let idleAnim, walkAnim, runAnim, currentAnim;

    const transitionTo = (newAnim) => {
        if (!newAnim || currentAnim === newAnim) return;
        if (currentAnim) currentAnim.stop();
        newAnim.start(true, 1.0, newAnim.from, newAnim.to, false);
        currentAnim = newAnim;
        const animationName = newAnim === runAnim ? "run" : newAnim === walkAnim ? "walk" : "idle";
        player.networkAnimation = animationName;
        onAnimationChanged(animationName);
    };

    const charResult = await BABYLON.SceneLoader.ImportMeshAsync("", "./", "BoyAnimV2.4.glb", scene);
    charResult.animationGroups.forEach(anim => anim.stop());

    charResult.meshes.forEach((mesh) => {
        if (mesh.material) {
            mesh.material.transparencyMode = BABYLON.PBRMaterial.PBRMATERIAL_OPAQUE;
            mesh.material.backFaceCulling = true;
        }
    });

    characterMesh = charResult.meshes[0];
    characterMesh.parent = player;
    characterMesh.position = new BABYLON.Vector3(0, 0, 0);
    characterMesh.rotation = new BABYLON.Vector3(0, Math.PI, 0);
    characterMesh.scaling = new BABYLON.Vector3(CHARACTER_SCALE, CHARACTER_SCALE, CHARACTER_SCALE);
    markNonGround(characterMesh, "local-player");

    player.characterGrounding = calculateCharacterGrounding(player, [characterMesh]);
    player.position.copyFrom(groundNetworkPosition(scene, player.position, "local-spawn", "local"));
    player.setGroundedPosition = (position, source = "local-network-spawn") => {
        player.position.copyFrom(groundNetworkPosition(scene, position, source, "local"));
    };

    // ---> EXPOSE MESH: So main.js can hide the body in First-Person Mode
    player.characterMesh = characterMesh;

    idleAnim = charResult.animationGroups.find(a => a.name.includes("idle"));
    walkAnim = charResult.animationGroups.find(a => a.name.includes("walk"));
    runAnim = charResult.animationGroups.find(a => a.name.includes("run"));

    if (idleAnim) {
        idleAnim.start(true, 1.0, idleAnim.from, idleAnim.to, false);
        currentAnim = idleAnim;
    }

    player.networkAnimation = "idle";
    player.getNetworkState = () => ({
        position: {
            x: player.position.x,
            y: player.position.y,
            z: player.position.z
        },
        rotation: {
            x: characterMesh?.rotation.x || 0,
            y: characterMesh?.rotation.y || 0,
            z: characterMesh?.rotation.z || 0
        },
        animation: player.networkAnimation
    });

    const walkSpeed = 0.10;
    const runSpeed = 0.20;

    // ---> JUMP VARIABLES
    let verticalVelocity = 0;
    const jumpForce = 0.3; // How high you jump
    const gravity = scene.gravity.y; // Grabs the -0.15 from main.js

    scene.onBeforeRenderObservable.add(() => {
        let velocity = BABYLON.Vector3.Zero();
        let isMoving = false;
        let isRunning = inputMap["shift"];

        let deltaTime = scene.getAnimationRatio();
        let speed = (isRunning ? runSpeed : walkSpeed) * deltaTime;

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

        // ==========================================
        // JUMP AND GRAVITY PHYSICS
        // ==========================================
        // 1. Shoot a tiny ray down from the capsule's center to check the ground
        let ray = new BABYLON.Ray(player.position, new BABYLON.Vector3(0, -1, 0), 1.5);
        let hit = scene.pickWithRay(ray, (mesh) => mesh.checkCollisions && mesh.name !== "player");

        if (hit.hit) {
            // We are touching the ground
            verticalVelocity = -0.15; // Tiny downward force to stick to ramps

            // If Spacebar is pressed, apply jump force!
            if (inputMap[" "]) {
                verticalVelocity = jumpForce;
            }
        } else {
            // We are in the air, slowly pull down with gravity
            verticalVelocity += gravity * deltaTime;
        }

        // Apply the vertical math to our actual movement velocity
        velocity.y = verticalVelocity;
        player.moveWithCollisions(velocity);

        if (characterMesh && isMoving) {
            let targetAngle = Math.atan2(velocity.x, velocity.z);
            characterMesh.rotation.y = targetAngle;
        }

        // Only play ground animations if we are actually touching the ground
        if (characterMesh && hit.hit) {
            if (!isMoving) transitionTo(idleAnim);
            else if (isMoving && !isRunning) transitionTo(walkAnim);
            else if (isMoving && isRunning) transitionTo(runAnim);
        }

        // ==========================================
        // BOUNDARY CHECK & TELEPORT
        // ==========================================
        if (player.position.y <= -500) {
            // Instantly move the player back to the original spawn coordinates
            player.setGroundedPosition(new BABYLON.Vector3(-100, 30, 0), "local-respawn");
            verticalVelocity = 0;
        }
    });

    return player;
};
