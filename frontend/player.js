// player.js
import * as BABYLON from "@babylonjs/core";
import {
    calculateCharacterGrounding,
    CHARACTER_SCALE,
    groundNetworkPosition,
    markNonGround
} from "./grounding.js";

export const createPlayer = async (
    scene,
    camera,
    inputMap,
    onAnimationChanged = () => { },
    loadingScreen = null
) => {
    const player = BABYLON.MeshBuilder.CreateCapsule("player", { radius: 0.3, height: 2 }, scene);
    player.position = new BABYLON.Vector3(-100, 10, 0);
    player.checkCollisions = true;
    player.ellipsoid = new BABYLON.Vector3(0.3, 1, 0.3);
    player.ellipsoidOffset = new BABYLON.Vector3(0, 0, 0);
    player.stepOffset = 0.5;
    markNonGround(player, "local-player");

    player.isLocked = false;
    player.isEliminated = false;
    player.hasFinished = false;

    player.isVisible = false;
    const wireMat = new BABYLON.StandardMaterial("wireMat", scene);
    wireMat.wireframe = true;
    wireMat.emissiveColor = new BABYLON.Color3(1, 0, 0);
    player.material = wireMat;

    const cameraTarget = new BABYLON.TransformNode("cameraTarget", scene);
    cameraTarget.parent = player;
    cameraTarget.position = new BABYLON.Vector3(0, 0.7, 0);
    camera.lockedTarget = cameraTarget;
    camera.angularSensibility = 1500;

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

    loadingScreen?.beginAsset?.(
        "Player Character",
        2,
        2
    );

    const charResult =
        await BABYLON.SceneLoader.ImportMeshAsync(
            "",
            "./",
            "BoyAnimV2.4.glb",
            scene,
            (event) => {
                loadingScreen?.updateAssetProgress?.(
                    event,
                    "Player Character"
                );
            }
        );

    loadingScreen?.completeAsset?.(
        "Player Character"
    );
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

    const walkSpeed = 0.06;
    const runSpeed = 0.16;
    let verticalVelocity = 0;
    const jumpForce = 0.25;
    const gravity = scene.gravity.y + 0.025;
    let lastJumpTime = 0;
    const jumpCooldown = 600;

    player.setGroundedPosition = (position, source = "local-network-spawn") => {
        player.position.copyFrom(groundNetworkPosition(scene, position, source, "local"));
        verticalVelocity = 0;
    };

    scene.onBeforeRenderObservable.add(() => {
        let velocity = BABYLON.Vector3.Zero();
        let isMoving = false;
        let isRunning = inputMap["shift"];

        const deltaTime = scene.getAnimationRatio();
        const speed = (isRunning ? runSpeed : walkSpeed) * deltaTime;

        const forward = camera.getDirection(BABYLON.Vector3.Forward());
        forward.y = 0;
        forward.normalize();

        const right = camera.getDirection(BABYLON.Vector3.Right());
        right.y = 0;
        right.normalize();

        if (inputMap["w"]) { velocity.addInPlace(forward.scale(speed)); isMoving = true; }
        if (inputMap["s"]) { velocity.addInPlace(forward.scale(-speed)); isMoving = true; }
        if (inputMap["a"]) { velocity.addInPlace(right.scale(-speed)); isMoving = true; }
        if (inputMap["d"]) { velocity.addInPlace(right.scale(speed)); isMoving = true; }

        if (player.isLocked) {
            velocity = BABYLON.Vector3.Zero();
            isMoving = false;
            isRunning = false;
        }

        const ray = new BABYLON.Ray(player.position, new BABYLON.Vector3(0, -1, 0), 1.5);
        const hit = scene.pickWithRay(ray, (mesh) =>
            mesh.metadata?.groundingRole === "walkable" && mesh.name !== "player"
        );

        if (hit.hit) {
            const currentTime = performance.now();

            if (verticalVelocity <= 0) verticalVelocity = -0.15;

            if (!player.isLocked
                && inputMap[" "]
                && (currentTime - lastJumpTime) > jumpCooldown) {
                verticalVelocity = jumpForce;
                lastJumpTime = currentTime;
            }
        } else {
            verticalVelocity += gravity * deltaTime;
        }

        velocity.y = verticalVelocity;
        player.moveWithCollisions(velocity);

        if (characterMesh && isMoving) {
            characterMesh.rotation.y = Math.atan2(velocity.x, velocity.z);
        }

        if (characterMesh && hit.hit) {
            if (!isMoving) transitionTo(idleAnim);
            else if (!isRunning) transitionTo(walkAnim);
            else transitionTo(runAnim);
        }

        if (player.position.y <= -500) {
            player.setGroundedPosition(new BABYLON.Vector3(-100, 30, 0), "local-respawn");
        }
    });

    return player;
};
