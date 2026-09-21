// frontend/world/animatedFlag.js

import * as BABYLON from "@babylonjs/core";
import "@babylonjs/loaders/glTF";

/**
 * Adds an animated Thai flag GLB with render-distance optimization.
 *
 * - Near player: flag is visible and animation plays.
 * - Far from player: flag is hidden and animation is paused.
 *
 * This avoids rendering/animating the flag when the player is far away.
 */
export async function createAnimatedThaiFlag(
    scene,
    player,
    options = {}
) {
    const config = {
        name: options.name || "thai_flag",
        rootUrl: options.rootUrl || "/flags/",
        fileName: options.fileName || "thaiflagV3.glb",

        // Change this position to where you want the flag on campus.
        position:
            options.position ||
            new BABYLON.Vector3(
                -10,
                1.8,
                15
            ),

        rotation:
            options.rotation ||
            new BABYLON.Vector3(
                0,
                Math.PI / 2,
                0
            ),

        scaling:
            options.scaling ||
            new BABYLON.Vector3(
                2.5,
                2.5,
                2.5
            ),

        renderDistance:
            options.renderDistance ?? 90,

        checkIntervalMs:
            options.checkIntervalMs ?? 250,

        animationSpeedRatio:
            options.animationSpeedRatio ?? 1.0,

        createPole:
            options.createPole ?? true,

        poleHeight:
            options.poleHeight ?? 6,

        poleRadius:
            options.poleRadius ?? 0.08
    };

    const root =
        new BABYLON.TransformNode(
            `${config.name}_root`,
            scene
        );

    root.position.copyFrom(
        config.position
    );

    root.rotation.copyFrom(
        config.rotation
    );

    root.scaling.copyFrom(
        config.scaling
    );

    const result =
        await BABYLON.SceneLoader.ImportMeshAsync(
            "",
            config.rootUrl,
            config.fileName,
            scene
        );

    const importedTopLevelMeshes =
        result.meshes.filter(
            (mesh) => !mesh.parent
        );

    importedTopLevelMeshes.forEach(
        (mesh) => {
            mesh.parent = root;
        }
    );

    result.meshes.forEach(
        (mesh) => {
            mesh.isPickable = false;
            mesh.checkCollisions = false;

            if (mesh.material) {
                mesh.material.backFaceCulling = false;
            }
        }
    );

    const animationGroups =
        result.animationGroups || [];

    animationGroups.forEach(
        (group) => {
            group.speedRatio =
                config.animationSpeedRatio;

            group.play(true);
        }
    );

    let pole = null;
    let poleBase = null;

    if (config.createPole) {
        pole =
            BABYLON.MeshBuilder.CreateCylinder(
                `${config.name}_pole`,
                {
                    height: config.poleHeight,
                    diameter:
                        config.poleRadius * 2,
                    tessellation: 16
                },
                scene
            );

        pole.parent = root;

        pole.position =
            new BABYLON.Vector3(
                -0.12,
                config.poleHeight / 2,
                0
            );

        pole.isPickable = false;
        pole.checkCollisions = false;

        const poleMaterial =
            new BABYLON.StandardMaterial(
                `${config.name}_pole_material`,
                scene
            );

        poleMaterial.diffuseColor =
            new BABYLON.Color3(
                0.65,
                0.65,
                0.65
            );

        poleMaterial.specularColor =
            new BABYLON.Color3(
                0.3,
                0.3,
                0.3
            );

        pole.material = poleMaterial;

        poleBase =
            BABYLON.MeshBuilder.CreateCylinder(
                `${config.name}_pole_base`,
                {
                    height: 0.18,
                    diameter: 0.65,
                    tessellation: 24
                },
                scene
            );

        poleBase.parent = root;

        poleBase.position =
            new BABYLON.Vector3(
                -0.12,
                0.09,
                0
            );

        poleBase.isPickable = false;
        poleBase.checkCollisions = false;
        poleBase.material = poleMaterial;
    }

    let isVisibleByDistance = true;
    let animationRunning = true;
    let elapsed = 0;

    const getTargetPosition = () => {
        if (
            player &&
            typeof player.getAbsolutePosition === "function"
        ) {
            return player.getAbsolutePosition();
        }

        if (player?.position) {
            return player.position;
        }

        return scene.activeCamera?.position;
    };

    const setFlagEnabled = (enabled) => {
        if (isVisibleByDistance === enabled) {
            return;
        }

        isVisibleByDistance = enabled;

        root.setEnabled(enabled);

        if (enabled) {
            if (!animationRunning) {
                animationGroups.forEach(
                    (group) => group.play(true)
                );

                animationRunning = true;
            }
        } else {
            if (animationRunning) {
                animationGroups.forEach(
                    (group) => group.pause()
                );

                animationRunning = false;
            }
        }
    };

    const observer =
        scene.onBeforeRenderObservable.add(
            () => {
                elapsed +=
                    scene
                        .getEngine()
                        .getDeltaTime();

                if (
                    elapsed <
                    config.checkIntervalMs
                ) {
                    return;
                }

                elapsed = 0;

                const targetPosition =
                    getTargetPosition();

                if (!targetPosition) {
                    return;
                }

                const distanceSquared =
                    BABYLON.Vector3.DistanceSquared(
                        targetPosition,
                        root.getAbsolutePosition()
                    );

                const renderDistanceSquared =
                    config.renderDistance *
                    config.renderDistance;

                setFlagEnabled(
                    distanceSquared <=
                        renderDistanceSquared
                );
            }
        );

    const dispose = () => {
        scene.onBeforeRenderObservable.remove(
            observer
        );

        animationGroups.forEach(
            (group) => group.stop()
        );

        result.meshes.forEach(
            (mesh) => {
                if (!mesh.isDisposed()) {
                    mesh.dispose();
                }
            }
        );

        pole?.dispose();
        poleBase?.dispose();
        root.dispose();
    };

    return {
        root,
        meshes: result.meshes,
        animationGroups,
        dispose,
        setRenderDistance(distance) {
            config.renderDistance = distance;
        },
        setPosition(position) {
            root.position.copyFrom(position);
        }
    };
}