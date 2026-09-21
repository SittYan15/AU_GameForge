// frontend/world/animatedFlag.js
// v5: Procedural single-cloth Thai flag, no generated pole.
//
// This avoids the broken GLB cloth/morph offset problem and creates exactly
// one visible flag mesh. Render-distance support is kept.

import * as BABYLON from "@babylonjs/core";

function createThaiFlagTexture(scene, name) {
    const texture =
        new BABYLON.DynamicTexture(
            `${name}_texture`,
            {
                width: 1024,
                height: 512
            },
            scene,
            false
        );

    texture.hasAlpha = false;

    const ctx = texture.getContext();
    const width = 1024;
    const height = 512;

    // Thai flag stripe ratio: red:white:blue:white:red = 1:1:2:1:1
    const total = 6;
    const red = "#A51931";
    const white = "#F4F5F8";
    const blue = "#2D2A4A";

    ctx.fillStyle = red;
    ctx.fillRect(0, 0, width, height / total);

    ctx.fillStyle = white;
    ctx.fillRect(0, height / total, width, height / total);

    ctx.fillStyle = blue;
    ctx.fillRect(0, (height * 2) / total, width, (height * 2) / total);

    ctx.fillStyle = white;
    ctx.fillRect(0, (height * 4) / total, width, height / total);

    ctx.fillStyle = red;
    ctx.fillRect(0, (height * 5) / total, width, height / total);

    texture.update(true);

    return texture;
}

function createFlagClothMesh(scene, name, width, height, segmentsX, segmentsY) {
    const mesh = new BABYLON.Mesh(`${name}_cloth`, scene);

    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];

    for (let yIndex = 0; yIndex <= segmentsY; yIndex += 1) {
        const v = yIndex / segmentsY;
        const localY = height * (0.5 - v);

        for (let xIndex = 0; xIndex <= segmentsX; xIndex += 1) {
            const u = xIndex / segmentsX;

            // Anchor the hoist edge at local x = 0 and let the flag extend left.
            // This makes the flag easy to place without a pole.
            const localX = -u * width;

            positions.push(localX, localY, 0);
            normals.push(0, 0, 1);
            uvs.push(u, v);
        }
    }

    for (let yIndex = 0; yIndex < segmentsY; yIndex += 1) {
        for (let xIndex = 0; xIndex < segmentsX; xIndex += 1) {
            const row = segmentsX + 1;
            const a = yIndex * row + xIndex;
            const b = a + 1;
            const c = a + row;
            const d = c + 1;

            indices.push(a, b, c);
            indices.push(b, d, c);
        }
    }

    const vertexData = new BABYLON.VertexData();
    vertexData.positions = positions;
    vertexData.normals = normals;
    vertexData.uvs = uvs;
    vertexData.indices = indices;
    vertexData.applyToMesh(mesh, true);

    return {
        mesh,
        positions,
        segmentsX,
        segmentsY,
        width,
        height
    };
}

export async function createAnimatedThaiFlag(
    scene,
    player,
    options = {}
) {
    const config = {
        name: options.name || "thai_flag",

        position:
            options.position ||
            new BABYLON.Vector3(
                -207.57,
                4.2,
                0
            ),

        rotation:
            options.rotation ||
            new BABYLON.Vector3(
                0,
                0,
                0
            ),

        scaling:
            options.scaling ||
            new BABYLON.Vector3(
                1,
                1,
                1
            ),

        flagWidth:
            options.flagWidth ?? 2.6,

        flagHeight:
            options.flagHeight ?? 1.55,

        segmentsX:
            options.segmentsX ?? 36,

        segmentsY:
            options.segmentsY ?? 10,

        waveAmplitude:
            options.waveAmplitude ?? 0.08,

        waveFrequency:
            options.waveFrequency ?? 1.8,

        waveSpeed:
            options.waveSpeed ?? 1.6,

        renderDistance:
            options.renderDistance ?? 260,

        checkIntervalMs:
            options.checkIntervalMs ?? 250,

        debug:
            options.debug ?? false
    };

    const root =
        new BABYLON.TransformNode(
            `${config.name}_root`,
            scene
        );

    root.position.copyFrom(config.position);
    root.rotation.copyFrom(config.rotation);
    root.scaling.copyFrom(config.scaling);

    const flagTexture =
        createThaiFlagTexture(
            scene,
            config.name
        );

    const clothMaterial =
        new BABYLON.StandardMaterial(
            `${config.name}_cloth_material`,
            scene
        );

    clothMaterial.diffuseTexture = flagTexture;
    clothMaterial.emissiveTexture = flagTexture;
    clothMaterial.disableLighting = true;
    clothMaterial.backFaceCulling = false;
    clothMaterial.specularColor = BABYLON.Color3.Black();

    const cloth =
        createFlagClothMesh(
            scene,
            config.name,
            config.flagWidth,
            config.flagHeight,
            config.segmentsX,
            config.segmentsY
        );

    cloth.mesh.parent = root;
    cloth.mesh.material = clothMaterial;
    cloth.mesh.isPickable = false;
    cloth.mesh.checkCollisions = false;

    let debugBeacon = null;

    if (config.debug) {
        cloth.mesh.showBoundingBox = true;

        debugBeacon =
            BABYLON.MeshBuilder.CreateSphere(
                `${config.name}_debug_beacon`,
                {
                    diameter: 0.16,
                    segments: 12
                },
                scene
            );

        debugBeacon.parent = root;
        debugBeacon.position = new BABYLON.Vector3(0, 0.95, 0);

        const debugMaterial =
            new BABYLON.StandardMaterial(
                `${config.name}_debug_material`,
                scene
            );

        debugMaterial.emissiveColor =
            new BABYLON.Color3(1, 0, 0);

        debugBeacon.material = debugMaterial;
        debugBeacon.isPickable = false;
        debugBeacon.checkCollisions = false;
    }

    let visibleByDistance = true;
    let elapsed = 0;
    let time = 0;

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
        if (visibleByDistance === enabled) {
            return;
        }

        visibleByDistance = enabled;
        root.setEnabled(enabled);
    };

    const observer =
        scene.onBeforeRenderObservable.add(() => {
            elapsed += scene.getEngine().getDeltaTime();

            if (elapsed >= config.checkIntervalMs) {
                elapsed = 0;

                const targetPosition = getTargetPosition();

                if (targetPosition) {
                    const distanceSquared =
                        BABYLON.Vector3.DistanceSquared(
                            targetPosition,
                            root.getAbsolutePosition()
                        );

                    setFlagEnabled(
                        distanceSquared <=
                            config.renderDistance *
                            config.renderDistance
                    );
                }
            }

            if (!visibleByDistance) {
                return;
            }

            time +=
                scene.getEngine().getDeltaTime() *
                0.001 *
                config.waveSpeed;

            const row = config.segmentsX + 1;

            for (let yIndex = 0; yIndex <= config.segmentsY; yIndex += 1) {
                for (let xIndex = 0; xIndex <= config.segmentsX; xIndex += 1) {
                    const u = xIndex / config.segmentsX;
                    const index = (yIndex * row + xIndex) * 3;

                    // The hoist edge is stable, and the free edge waves more.
                    const edgeFalloff = u * u;
                    const wave =
                        Math.sin(
                            time +
                            u * Math.PI * 2 * config.waveFrequency
                        ) *
                        config.waveAmplitude *
                        edgeFalloff;

                    cloth.positions[index + 2] = wave;
                }
            }

            cloth.mesh.updateVerticesData(
                BABYLON.VertexBuffer.PositionKind,
                cloth.positions,
                false,
                false
            );
        });

    const dispose = () => {
        scene.onBeforeRenderObservable.remove(observer);
        debugBeacon?.dispose();
        cloth.mesh.dispose();
        flagTexture.dispose();
        clothMaterial.dispose();
        root.dispose();
    };

    return {
        root,
        cloth: cloth.mesh,
        meshes: [cloth.mesh],
        animationGroups: [],
        dispose,
        setRenderDistance(distance) {
            config.renderDistance = distance;
        },
        setPosition(position) {
            root.position.copyFrom(position);
        }
    };
}
