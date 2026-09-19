// frontend/world/natureInstanceManager.js

import * as BABYLON from "@babylonjs/core";
import "@babylonjs/loaders/glTF";

import {
    NATURE_PLACEMENTS,
    NATURE_STREAMING
} from "./naturePlacements.js";

const NATURE_ASSETS = Object.freeze({
    treeTall: Object.freeze({
        label: "Tall Tree",
        rootUrl: "/nature/",
        filename: "TallTree.glb"
    }),

    treeBig: Object.freeze({
        label: "Big Tree",
        rootUrl: "/nature/",
        filename: "TreeBig.glb"
    }),

    treeMedium: Object.freeze({
        label: "Medium Tree",
        rootUrl: "/nature/",
        filename: "TreeMedium.glb"
    }),

    coconutSingle: Object.freeze({
        label: "Coconut Single",
        rootUrl: "/nature/",
        filename: "coconut_single.glb",
        cacheVersion: "coconut-single-v2"
    }),

    coconutDouble: Object.freeze({
        label: "Coconut Double",
        rootUrl: "/nature/",
        filename: "coconut_double.glb"
    }),

    bananaPlant: Object.freeze({
        label: "Banana Plant",
        rootUrl: "/nature/",
        filename: "banana_plant.glb"
    }),

    grassBig: Object.freeze({
        label: "Grass Big",
        rootUrl: "/nature/",
        filename: "grass_big.glb"
    }),

    grassSmall: Object.freeze({
        label: "Grass Small",
        rootUrl: "/nature/",
        filename: "grass_small.glb"
    }),

    // Existing asset already present in the current GitHub repository.
    bush: Object.freeze({
        label: "Bush",
        rootUrl: "/",
        filename: "Bush.glb"
    }),

    // No GLB needed. The source mesh is built once with Babylon.js,
    // then normal Babylon instances are created from it.
    stone: Object.freeze({
        label: "Low-poly Stone",
        procedural: true
    })
});

function finitePosition(value) {
    return (
        Array.isArray(value)
        && value.length >= 3
        && Number.isFinite(Number(value[0]))
        && Number.isFinite(Number(value[1]))
        && Number.isFinite(Number(value[2]))
    );
}

function normalizePlacement(raw, fallbackId) {
    if (
        !raw
        || !NATURE_ASSETS[raw.type]
        || !finitePosition(raw.position)
    ) {
        return null;
    }

    return {
        id:
            String(
                raw.id
                || fallbackId
            ),

        type:
            raw.type,

        position: [
            Number(raw.position[0]),
            Number(raw.position[1]),
            Number(raw.position[2])
        ],

        rotationY:
            Number.isFinite(
                Number(raw.rotationY)
            )
                ? Number(raw.rotationY)
                : 0,

        scale:
            Number.isFinite(
                Number(raw.scale)
            )
                ? Math.max(
                    0.05,
                    Number(raw.scale)
                )
                : 1
    };
}

function horizontalDistance(
    playerPosition,
    placement
) {
    const dx =
        playerPosition.x
        - placement.position[0];

    const dz =
        playerPosition.z
        - placement.position[2];

    return Math.hypot(
        dx,
        dz
    );
}

function makeStoneSource(scene) {
    const stone =
        BABYLON.MeshBuilder.CreateIcoSphere(
            "natureStoneSource",
            {
                radius:
                    0.68,
                subdivisions:
                    1,
                flat:
                    true
            },
            scene
        );

    // Make the source look more like a low-poly rock than a perfect sphere.
    stone.scaling.copyFromFloats(
        1.18,
        0.68,
        0.95
    );

    stone.rotation.copyFromFloats(
        0.13,
        0.22,
        -0.08
    );

    stone.bakeCurrentTransformIntoVertices();

    const positions =
        stone.getVerticesData(
            BABYLON.VertexBuffer.PositionKind
        );

    if (positions) {
        for (
            let index = 0;
            index < positions.length;
            index += 3
        ) {
            const x =
                positions[index];

            const y =
                positions[index + 1];

            const z =
                positions[index + 2];

            const irregular =
                1
                + 0.06
                * Math.sin(
                    x * 7.3
                    + y * 5.1
                    + z * 9.7
                );

            positions[index] *=
                irregular;

            positions[index + 1] *=
                0.96
                + 0.04
                * Math.cos(
                    x * 4.2
                    - z * 5.8
                );

            positions[index + 2] *=
                1
                + 0.05
                * Math.sin(
                    z * 6.4
                    - x * 3.2
                );
        }

        stone.updateVerticesData(
            BABYLON.VertexBuffer.PositionKind,
            positions
        );

        stone.refreshBoundingInfo();
    }

    const material =
        new BABYLON.StandardMaterial(
            "natureStoneMaterial",
            scene
        );

    material.diffuseColor =
        new BABYLON.Color3(
            0.48,
            0.48,
            0.48
        );

    material.emissiveColor =
        new BABYLON.Color3(
            0.018,
            0.018,
            0.018
        );

    material.specularColor =
        new BABYLON.Color3(
            0.06,
            0.06,
            0.06
        );

    stone.material =
        material;

    stone.isPickable =
        false;

    stone.checkCollisions =
        false;

    // Keep the source mesh outside the playable world.
    // Instances use its geometry/material but have their own transforms.
    stone.position.copyFromFloats(
        0,
        -10000,
        0
    );

    return {
        source:
            stone,
        material
    };
}

async function loadGlbTemplate(
    scene,
    definition,
    type
) {
    const sceneFilename =
        definition.cacheVersion
            ? `${definition.filename}?v=${encodeURIComponent(
                definition.cacheVersion
            )}`
            : definition.filename;

    const container =
        await BABYLON.SceneLoader
            .LoadAssetContainerAsync(
                definition.rootUrl,
                sceneFilename,
                scene,
                undefined,
                ".glb"
            );

    // Keep the GLB as an AssetContainer template. We can compute bounds
    // directly from its hierarchy without temporarily adding/removing it from
    // the scene. This preserves its imported materials/textures.
    const meshes =
        container.meshes.filter(
            (mesh) =>
                mesh?.getBoundingInfo
                && mesh.getTotalVertices?.() > 0
        );

    let minimum =
        new BABYLON.Vector3(
            Number.POSITIVE_INFINITY,
            Number.POSITIVE_INFINITY,
            Number.POSITIVE_INFINITY
        );

    let maximum =
        new BABYLON.Vector3(
            Number.NEGATIVE_INFINITY,
            Number.NEGATIVE_INFINITY,
            Number.NEGATIVE_INFINITY
        );

    for (
        const mesh of
        meshes
    ) {
        mesh.computeWorldMatrix(
            true
        );

        const box =
            mesh
                .getBoundingInfo()
                .boundingBox;

        minimum =
            BABYLON.Vector3.Minimize(
                minimum,
                box.minimumWorld
            );

        maximum =
            BABYLON.Vector3.Maximize(
                maximum,
                box.maximumWorld
            );
    }

    let anchor =
        BABYLON.Vector3.Zero();

    if (
        Number.isFinite(minimum.x)
        && Number.isFinite(maximum.x)
    ) {
        // Bottom-center anchor:
        // exact clicked Y becomes the bottom of the vegetation model.
        anchor =
            new BABYLON.Vector3(
                (
                    minimum.x
                    + maximum.x
                ) / 2,

                minimum.y,

                (
                    minimum.z
                    + maximum.z
                ) / 2
            );
    }

    console.log(
        `[Nature] Loaded ${type}`,
        {
            anchor:
                anchor.asArray(),
            size:
                maximum
                    .subtract(
                        minimum
                    )
                    .asArray()
        }
    );

    return {
        container,
        anchor
    };
}

export function initNatureInstanceManager(
    scene,
    player
) {
    const templates =
        new Map();

    const records =
        new Map();

    const activeEntries =
        new Map();

    const loadingEntries =
        new Set();

    const staticPlacements =
        NATURE_PLACEMENTS
            .map(
                (
                    placement,
                    index
                ) =>
                    normalizePlacement(
                        placement,
                        `nature_${index}`
                    )
            )
            .filter(
                Boolean
            );

    staticPlacements.forEach(
        (placement) => {
            records.set(
                placement.id,
                placement
            );
        }
    );

    const stoneTemplate =
        makeStoneSource(
            scene
        );

    templates.set(
        "stone",
        stoneTemplate
    );

    let disposed =
        false;

    let streamAccumulator =
        0;

    async function getTemplate(
        type
    ) {
        if (
            templates.has(
                type
            )
        ) {
            return templates.get(
                type
            );
        }

        const definition =
            NATURE_ASSETS[
                type
            ];

        if (
            !definition
            || definition.procedural
        ) {
            return null;
        }

        const promise =
            loadGlbTemplate(
                scene,
                definition,
                type
            );

        templates.set(
            type,
            promise
        );

        try {
            const template =
                await promise;

            templates.set(
                type,
                template
            );

            return template;
        } catch (error) {
            templates.delete(
                type
            );

            throw error;
        }
    }

    function configureInstantiatedMeshes(
        roots
    ) {
        roots.forEach(
            (root) => {
                root.isPickable =
                    false;

                const meshes =
                    root.getChildMeshes?.()
                    || [];

                meshes.forEach(
                    (mesh) => {
                        mesh.isPickable =
                            false;

                        mesh.checkCollisions =
                            false;

                        mesh.alwaysSelectAsActiveMesh =
                            false;

                        if (
                            mesh.getTotalVertices?.() >
                                0
                            && !mesh.material
                        ) {
                            console.warn(
                                "[Nature] Mesh has no material:",
                                mesh.name
                            );
                        }
                    }
                );
            }
        );
    }

    async function instantiateGlbPlacement(
        placement
    ) {
        const template =
            await getTemplate(
                placement.type
            );

        if (
            !template
            || !template.container
        ) {
            return null;
        }

        const entries =
            template.container
                .instantiateModelsToScene(
                    (sourceName) =>
                        `${placement.id}_${sourceName}`,

                    // Clone material objects into the live scene. Textures and
                    // geometry remain shared, but each instantiated hierarchy
                    // keeps its proper GLB materials instead of falling back
                    // to Babylon's gray default material.
                    true,

                    {
                        doNotInstantiate:
                            false
                    }
                );

        const placementRoot =
            new BABYLON.TransformNode(
                `naturePlacement_${placement.id}`,
                scene
            );

        placementRoot.position
            .copyFromFloats(
                placement.position[0],
                placement.position[1],
                placement.position[2]
            );

        placementRoot.rotation.y =
            placement.rotationY;

        placementRoot.scaling
            .setAll(
                placement.scale
            );

        const normalizationRoot =
            new BABYLON.TransformNode(
                `natureNormalization_${placement.id}`,
                scene
            );

        normalizationRoot.parent =
            placementRoot;

        normalizationRoot.position =
            template.anchor
                .scale(
                    -1
                );

        entries.rootNodes
            .forEach(
                (root) => {
                    root.parent =
                        normalizationRoot;
                }
            );

        configureInstantiatedMeshes(
            entries.rootNodes
        );

        return {
            root:
                placementRoot,

            dispose() {
                placementRoot.dispose(
                    false,
                    true
                );

                entries.animationGroups
                    ?.forEach(
                        (group) =>
                            group.dispose()
                    );

                entries.skeletons
                    ?.forEach(
                        (skeleton) =>
                            skeleton.dispose()
                    );
            }
        };
    }

    function instantiateStone(
        placement
    ) {
        const instance =
            stoneTemplate
                .source
                .createInstance(
                    `natureStone_${placement.id}`
                );

        instance.position
            .copyFromFloats(
                placement.position[0],
                placement.position[1] + 0.02,
                placement.position[2]
            );

        instance.rotation.y =
            placement.rotationY;

        instance.scaling
            .setAll(
                placement.scale
            );

        instance.isPickable =
            false;

        instance.checkCollisions =
            false;

        return {
            root:
                instance,

            dispose() {
                instance.dispose();
            }
        };
    }

    async function activatePlacement(
        placement,
        force = false
    ) {
        if (
            disposed
            || activeEntries.has(
                placement.id
            )
            || loadingEntries.has(
                placement.id
            )
        ) {
            return;
        }

        if (
            !force
            && horizontalDistance(
                player.position,
                placement
            ) >
                NATURE_STREAMING
                    .loadDistance
        ) {
            return;
        }

        loadingEntries.add(
            placement.id
        );

        try {
            const entry =
                placement.type ===
                    "stone"
                    ? instantiateStone(
                        placement
                    )
                    : await instantiateGlbPlacement(
                        placement
                    );

            if (!entry) {
                return;
            }

            if (
                disposed
                || !records.has(
                    placement.id
                )
            ) {
                entry.dispose();
                return;
            }

            const distance =
                horizontalDistance(
                    player.position,
                    placement
                );

            if (
                !force
                && distance >
                    NATURE_STREAMING
                        .unloadDistance
            ) {
                entry.dispose();
                return;
            }

            activeEntries.set(
                placement.id,
                entry
            );
        } catch (error) {
            console.warn(
                `[Nature] Could not instantiate ${placement.type}:`,
                error
            );
        } finally {
            loadingEntries.delete(
                placement.id
            );
        }
    }

    function deactivatePlacement(
        id
    ) {
        const active =
            activeEntries.get(
                id
            );

        if (!active) {
            return;
        }

        active.dispose();

        activeEntries.delete(
            id
        );
    }

    function updateStreaming() {
        if (
            disposed
            || !player
        ) {
            return;
        }

        records.forEach(
            (placement) => {
                const distance =
                    horizontalDistance(
                        player.position,
                        placement
                    );

                if (
                    activeEntries.has(
                        placement.id
                    )
                ) {
                    if (
                        distance >
                        NATURE_STREAMING
                            .unloadDistance
                    ) {
                        deactivatePlacement(
                            placement.id
                        );
                    }

                    return;
                }

                if (
                    distance <=
                    NATURE_STREAMING
                        .loadDistance
                ) {
                    void activatePlacement(
                        placement
                    );
                }
            }
        );
    }

    const streamObserver =
        scene
            .onBeforeRenderObservable
            .add(
                () => {
                    streamAccumulator +=
                        scene
                            .getEngine()
                            .getDeltaTime();

                    if (
                        streamAccumulator <
                        NATURE_STREAMING
                            .updateIntervalMs
                    ) {
                        return;
                    }

                    streamAccumulator =
                        0;

                    updateStreaming();
                }
            );

    updateStreaming();

    return {
        refresh() {
            updateStreaming();
        },

        getPlacements() {
            return [
                ...records.values()
            ].map(
                (placement) => ({
                    ...placement,
                    position: [
                        ...placement.position
                    ]
                })
            );
        },

        dispose() {
            disposed = true;

            scene
                .onBeforeRenderObservable
                .remove(
                    streamObserver
                );

            [
                ...activeEntries.keys()
            ].forEach(
                deactivatePlacement
            );

            templates.forEach(
                (template) => {
                    if (
                        template
                        && typeof template.then !== "function"
                    ) {
                        template.container?.dispose();
                    }
                }
            );

            stoneTemplate.source.dispose();
            stoneTemplate.material.dispose();

            records.clear();
            templates.clear();
        }
    };
}
