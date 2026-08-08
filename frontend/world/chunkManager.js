// world/chunkManager.js
import * as BABYLON from "@babylonjs/core";
import { markWalkableGround } from "../grounding.js";

const buildingsConfig = [
    {
        name: "CL_Building",
        filename: "I_CL_v1.0.0.glb",
        center: new BABYLON.Vector3(0, 0, 0),
        size: new BABYLON.Vector3(40, 5, 40),

        renderMargin: 5,
        horizontalLoad: 15,
        horizontalDispose: 30,
        verticalLoad: 5,
        verticalDispose: 15,

        container: null,
        status: "UNLOADED"
    },
    {
        name: "SGSR_Building",
        filename: "I_SGSR_v1.0.0.glb",
        center: new BABYLON.Vector3(50, 0, -25),
        size: new BABYLON.Vector3(40, 5, 40),

        renderMargin: 5,
        horizontalLoad: 15,
        horizontalDispose: 30,
        verticalLoad: 5,
        verticalDispose: 15,

        container: null,
        status: "UNLOADED"
    },
    // SM Building
    {
        name: "SM_Building_Floor_1",
        filename: "I_MSM_L1_v1.0.0.glb",
        center: new BABYLON.Vector3(-80, 1.8, 0),
        size: new BABYLON.Vector3(22, 5, 189.9),

        renderMargin: 5,
        horizontalLoad: 15,
        horizontalDispose: 30,
        verticalLoad: 5,
        verticalDispose: 15,

        container: null,
        status: "UNLOADED"
    },
    {
        name: "SM_Building_Floor_2",
        filename: "I_MSM_L1_v2.0.0.glb",
        center: new BABYLON.Vector3(50, 5, -25),
        size: new BABYLON.Vector3(40, 10, 40),

        renderMargin: 5,
        horizontalLoad: 15,
        horizontalDispose: 30,
        verticalLoad: 5,
        verticalDispose: 15,

        container: null,
        status: "UNLOADED"
    },
    {
        name: "SM_Building_Floor_3",
        filename: "I_MSM_L1_v2.0.0.glb",
        center: new BABYLON.Vector3(50, 10, -25),
        size: new BABYLON.Vector3(40, 15, 40),

        renderMargin: 5,
        horizontalLoad: 15,
        horizontalDispose: 30,
        verticalLoad: 5,
        verticalDispose: 15,

        container: null,
        status: "UNLOADED"
    },
    {
        name: "SM_Building_Junction_Both",
        filename: "I_MSM_JunctionBoth_v1.0.0.glb",
        center: new BABYLON.Vector3(-80, 10, 0),
        size: new BABYLON.Vector3(24, 20, 189.9),

        renderMargin: 5,
        horizontalLoad: 15,
        horizontalDispose: 30,
        verticalLoad: 5,
        verticalDispose: 15,

        container: null,
        status: "UNLOADED"
    }
];

function isPointInBox(point, center, size, horizontalMargin = 0, verticalMargin = 0) {
    const halfX = (size.x / 2) + horizontalMargin;
    const halfZ = (size.z / 2) + horizontalMargin;
    const halfY = (size.y / 2) + verticalMargin; // Use the strict vertical margin here

    return (
        point.x >= center.x - halfX && point.x <= center.x + halfX &&
        point.z >= center.z - halfZ && point.z <= center.z + halfZ &&
        point.y >= center.y - halfY && point.y <= center.y + halfY
    );
}

export function initChunkManager(scene, player, BaseUrl) {
    scene.onBeforeRenderObservable.add(() => {
        if (!player) return;
        buildingsConfig.forEach(chunk => {
            // Pass the horizontal and vertical margins separately
            const isInsideRenderBox = isPointInBox(player.position, chunk.center, chunk.size, chunk.renderMargin, chunk.renderMargin);

            const isInsideLoadBox = isPointInBox(player.position, chunk.center, chunk.size,
                chunk.horizontalLoad, chunk.verticalLoad);

            const isInsideDisposeBox = isPointInBox(player.position, chunk.center, chunk.size,
                chunk.horizontalDispose, chunk.verticalDispose);

            // 1. DISPOSE
            if (!isInsideDisposeBox && chunk.status !== "UNLOADED") {
                if (chunk.status === "IN_RAM" || chunk.status === "IN_SCENE") {
                    chunk.container.dispose();
                    chunk.container = null;
                }
                chunk.status = "UNLOADED";
                console.log(`Purged ${chunk.name} from RAM`);
                return;
            }

            // 2. LOAD
            if (isInsideLoadBox && chunk.status === "UNLOADED") {
                chunk.status = "LOADING";

                BABYLON.SceneLoader.LoadAssetContainerAsync(BaseUrl, chunk.filename, scene)
                    .then(container => {
                        if (chunk.status === "UNLOADED") {
                            container.dispose();
                        } else {
                            container.meshes.forEach((mesh) => {
                                if (mesh.isVisible && mesh.name !== "__root__") {
                                    mesh.checkCollisions = true;
                                    markWalkableGround(mesh);
                                }
                            });

                            chunk.container = container;
                            chunk.status = "IN_RAM";
                            console.log(`${chunk.name} is ready in RAM`);
                        }
                    }).catch(err => {
                        console.error(`Failed to load ${chunk.name}:`, err);
                        chunk.status = "UNLOADED";
                    });
            }

            // 3. RENDER
            if (isInsideRenderBox && chunk.status === "IN_RAM") {
                chunk.container.addAllToScene();
                chunk.status = "IN_SCENE";
                console.log(`Rendered ${chunk.name}`);
            }

            // 4. HIDE
            if (!isInsideRenderBox && isInsideDisposeBox && chunk.status === "IN_SCENE") {
                chunk.container.removeAllFromScene();
                chunk.status = "IN_RAM";
                console.log(`Hid ${chunk.name}`);
            }
        });
    });
}