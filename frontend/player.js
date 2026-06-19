// player.js
import * as BABYLON from "@babylonjs/core";

export const createPlayer = async (scene, camera, inputMap) => {
    const player = BABYLON.MeshBuilder.CreateCapsule("player", { radius: 0.5, height: 2 }, scene);
    player.position = new BABYLON.Vector3(-100, 10, 0); 
    player.checkCollisions = true;
    player.ellipsoid = new BABYLON.Vector3(0.5, 1, 0.5);
    player.ellipsoidOffset = new BABYLON.Vector3(0, 1, 0);
    player.isVisible = false; 

    // Lock the camera to the new player
    camera.lockedTarget = player;

    let characterMesh = null;
    let idleAnim, walkAnim, runAnim, currentAnim;

    const transitionTo = (newAnim) => {
        if (!newAnim || currentAnim === newAnim) return;
        if (currentAnim) currentAnim.stop(); 
        newAnim.start(true, 1.0, newAnim.from, newAnim.to, false); 
        currentAnim = newAnim;
    };

    // Import character...
    const charResult = await BABYLON.SceneLoader.ImportMeshAsync("", "./", "AuBoyAnimations.0.2.glb", scene);
    scene.animationGroups.forEach(anim => anim.stop());

    // Fix transparency
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
    characterMesh.scaling = new BABYLON.Vector3(1.8, 1.8, 1.8); 

    idleAnim = scene.getAnimationGroupByName("bidle");
    walkAnim = scene.getAnimationGroupByName("bwalk");
    runAnim = scene.getAnimationGroupByName("brun");

    if (idleAnim) {
        idleAnim.start(true, 1.0, idleAnim.from, idleAnim.to, false);
        currentAnim = idleAnim;
    }

    const walkSpeed = 0.12; 
    const runSpeed = 0.28; 

    // Player Movement Loop
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

        velocity.y = scene.gravity.y * deltaTime;
        player.moveWithCollisions(velocity);

        if (characterMesh && isMoving) {
            let targetAngle = Math.atan2(velocity.x, velocity.z);
            characterMesh.rotation.y = targetAngle; 
        }

        if (characterMesh) {
            if (!isMoving) transitionTo(idleAnim);
            else if (isMoving && !isRunning) transitionTo(walkAnim);
            else if (isMoving && isRunning) transitionTo(runAnim);
        }
    });

    return player;
};