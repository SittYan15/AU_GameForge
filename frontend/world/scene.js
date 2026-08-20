// world/scene.js
import * as BABYLON from "@babylonjs/core";
import { createPlayer } from "../player.js";
import { createNPC } from "../npc.js";
import { createCar } from "../car.js";
import { markWalkableGround } from "../grounding.js";
import { createRlglSignal } from "./rlglSignal.js";
import { createRlglArenaTimer } from "./rlglArenaTimer.js";

export async function createMainScene(engine, canvas, BaseUrl, inputMapRef, animationCallback) {
    const scene = new BABYLON.Scene(engine);

    // World Setup
    scene.gravity = new BABYLON.Vector3(0, -0.05, 0);
    scene.collisionsEnabled = true;

    const light = new BABYLON.HemisphericLight("ambientLight", new BABYLON.Vector3(0, 1, 0), scene);
    light.intensity = 0.3;

    const envTexture = BABYLON.CubeTexture.CreateFromPrefilteredData("./e_noon_puresky_2k.env", scene);
    scene.environmentTexture = envTexture;
    scene.createDefaultSkybox(envTexture, true, 1500);

    // camera setup
    const camera = new BABYLON.ArcRotateCamera("thirdPersonCamera", Math.PI / 2, Math.PI / 3, 6, BABYLON.Vector3.Zero(), scene);
    camera.attachControl(canvas, true);
    camera.minZ = 0.05;

    try {
        const result = await BABYLON.SceneLoader.ImportMeshAsync("", BaseUrl, "au_campus_v2.0.0.glb", scene);
        result.meshes.forEach((mesh) => {
            if (mesh.isVisible && mesh.name !== "__root__") {
                mesh.checkCollisions = true;
                markWalkableGround(mesh);
            }
        });
    } catch (error) {
        console.error("Exterior map error:", error);
    }

    const player = await createPlayer(scene, camera, inputMapRef, animationCallback);

    const headNode = new BABYLON.TransformNode("headNode", scene);
    headNode.parent = player;
    headNode.position = new BABYLON.Vector3(0, 0.8, 0.2);

    const routeOne = [
        new BABYLON.Vector3(-60.15, 1.53, 50.57),
        new BABYLON.Vector3(-64.33, 1.53, -61.37),
        new BABYLON.Vector3(-67.37, 1.53, 4.34)
    ];
    createNPC(scene, "TourGuide", new BABYLON.Vector3(-66.45, 1.53, 16.32), routeOne);

    const routeTwo = [
        new BABYLON.Vector3(-67.41, 1.53, 1.48),
        new BABYLON.Vector3(-50.60, 1.53, -47.27),
        new BABYLON.Vector3(-68.89, 1.53, 63.22)
    ];
    createNPC(scene, "LostStudent", new BABYLON.Vector3(-66.58, 1.53, -6.79), routeTwo);

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
    createCar(scene, "BlueCruiser", carRoute, player);

    // ==========================================
    // RED LIGHT, GREEN LIGHT ARENA
    // Campus location measured from the real map.
    //
    // Players run from +X toward -X.
    // ==========================================
    const RLGL_CENTER_X = -663.00;
    const RLGL_CENTER_Z = -116.79;
    const RLGL_GROUND_Y = -0.27;

    const RLGL_LENGTH = 142.00;
    const RLGL_WIDTH = 56;

    const RLGL_START_WALL_X = -590;
    const RLGL_FINISH_LINE_X = -731.5;
    const RLGL_FINISH_TRIGGER_X = -729.5;

    // Keep the existing campus portal as the minigame entrance.
    const portal = BABYLON.MeshBuilder.CreateCylinder(
        "rlgl_portal",
        {
            diameter: 4,
            height: 0.2
        },
        scene
    );

    portal.position =
        new BABYLON.Vector3(
            -114.79,
            0.00,
            -0.09
        );

    const portalMat =
        new BABYLON.StandardMaterial(
            "portalMat",
            scene
        );

    portalMat.emissiveColor =
        new BABYLON.Color3(
            0,
            1,
            1
        );

    portal.material = portalMat;

    // Thin overlay so the campus surface is still visible.
    const arenaFloor =
        BABYLON.MeshBuilder.CreateGround(
            "rlgl_floor",
            {
                width: RLGL_LENGTH,
                height: RLGL_WIDTH
            },
            scene
        );

    arenaFloor.position =
        new BABYLON.Vector3(
            RLGL_CENTER_X,
            RLGL_GROUND_Y,
            RLGL_CENTER_Z
        );

    arenaFloor.checkCollisions = true;
    markWalkableGround(arenaFloor);

    const arenaMat =
        new BABYLON.StandardMaterial(
            "rlglArenaMaterial",
            scene
        );

    arenaMat.diffuseColor =
        new BABYLON.Color3(
            0.12,
            0.12,
            0.12
        );

    arenaMat.emissiveColor =
        new BABYLON.Color3(
            0.02,
            0.02,
            0.02
        );

    arenaMat.alpha = 0.28;

    arenaFloor.material = arenaMat;

    // Finish line stretches along Z because race direction is -X.
    const finishLine =
        BABYLON.MeshBuilder.CreateBox(
            "finishLine",
            {
                width: 4,
                height: 0.20,
                depth: RLGL_WIDTH
            },
            scene
        );

    finishLine.position =
        new BABYLON.Vector3(
            RLGL_FINISH_LINE_X,
            RLGL_GROUND_Y + 0.10,
            RLGL_CENTER_Z
        );

    finishLine.checkCollisions = false;

    const finishMat =
        new BABYLON.StandardMaterial(
            "finishMat",
            scene
        );

    finishMat.emissiveColor =
        new BABYLON.Color3(
            1,
            0.8,
            0
        );

    finishLine.material = finishMat;

    // Starting wall separates waiting/spectator area from active field.
    const startingWall =
        BABYLON.MeshBuilder.CreateBox(
            "rlgl_starting_wall",
            {
                width: 1,
                height: 10,
                depth: RLGL_WIDTH
            },
            scene
        );

    startingWall.position =
        new BABYLON.Vector3(
            RLGL_START_WALL_X,
            RLGL_GROUND_Y + 5,
            RLGL_CENTER_Z
        );

    const wallMat =
        new BABYLON.StandardMaterial(
            "wallMat",
            scene
        );

    wallMat.alpha = 0.45;

    wallMat.emissiveColor =
        new BABYLON.Color3(
            1,
            0,
            0
        );

    startingWall.material = wallMat;
    startingWall.checkCollisions = true;

    const rlglArenaTimer =
        createRlglArenaTimer(scene);

    scene.metadata =
        scene.metadata || {};

    scene.metadata.rlglArenaTimer =
        rlglArenaTimer;

    const rlglSignal =
        createRlglSignal(scene);

    scene.metadata.rlglSignal =
        rlglSignal;

    // Temporary side walls used only while an RLGL round is ACTIVE.
    const createRlglSideWall = (
        name,
        zPosition
    ) => {
        const wall =
            BABYLON.MeshBuilder.CreateBox(
                name,
                {
                    width: 144,
                    height: 8,
                    depth: 1.2
                },
                scene
            );

        wall.position =
            new BABYLON.Vector3(
                -663.0,
                3.73,
                zPosition
            );

        wall.isPickable = false;
        wall.checkCollisions = false;
        wall.setEnabled(false);

        const wallMaterial =
            new BABYLON.StandardMaterial(
                `${name}_mat`,
                scene
            );

        wallMaterial.diffuseColor =
            new BABYLON.Color3(
                0.75,
                0.12,
                0.12
            );

        wallMaterial.emissiveColor =
            new BABYLON.Color3(
                0.18,
                0.02,
                0.02
            );

        wallMaterial.alpha = 0.38;

        wall.material = wallMaterial;

        return wall;
    };

    const rlglNorthWall =
        createRlglSideWall(
            "rlgl_side_wall_north",
            -145.4
        );

    const rlglSouthWall =
        createRlglSideWall(
            "rlgl_side_wall_south",
            -88.2
        );

    scene.metadata.rlglActiveWalls = {
        walls: [
            rlglNorthWall,
            rlglSouthWall
        ],

        setActive(active) {
            this.walls.forEach(
                (wall) => {
                    wall.setEnabled(active);
                    wall.checkCollisions = active;
                }
            );
        }
    };

    let insideRlgl = false;
    let portalCooldownUntil = 0;
    let lastFinishRequestAt = 0;

    scene.onBeforeRenderObservable.add(() => {
        const now = performance.now();
        const multiplayer = window.multiplayerInstance;

        if (!insideRlgl
            && now >= portalCooldownUntil
            && BABYLON.Vector3.Distance(player.position, portal.position) < 2) {
            if (multiplayer?.joinRlgl()) {
                insideRlgl = true;
                player.isLocked = true;
                player.isEliminated = false;
                player.hasFinished = false;
                lastFinishRequestAt = 0;
            }
        }

        if (insideRlgl
            && !player.isEliminated
            && !player.hasFinished
            && player.position.x <= RLGL_FINISH_TRIGGER_X
            && now - lastFinishRequestAt >= 1000) {
            if (multiplayer?.finishRlgl()) lastFinishRequestAt = now;
        }
    });

    // ==========================================
    // DEBUG: COORDINATE HELPER (Shift + Click)
    // ==========================================
    scene.onPointerObservable.add((pointerInfo) => {
        if (
            pointerInfo.type === BABYLON.PointerEventTypes.POINTERDOWN
            && pointerInfo.event.shiftKey
            && pointerInfo.pickInfo.hit
        ) {
            const point = pointerInfo.pickInfo.pickedPoint;
            console.log(`new BABYLON.Vector3(${point.x.toFixed(2)}, ${point.y.toFixed(2)}, ${point.z.toFixed(2)})`);

            const marker = BABYLON.MeshBuilder.CreateSphere("debugMarker", { diameter: 1 }, scene);
            marker.position = point;

            const mat = new BABYLON.StandardMaterial("markerMat", scene);
            mat.emissiveColor = new BABYLON.Color3(1, 0, 0);
            mat.wireframe = true;
            marker.material = mat;
            marker.checkCollisions = false;
            marker.isPickable = false;
        }
    });

    window.exitRlgl = () => {
        insideRlgl = false;
        portalCooldownUntil = performance.now() + 1500;
        lastFinishRequestAt = 0;
        player.isEliminated = false;
        player.hasFinished = false;
        player.isLocked = true;

        const multiplayer = window.multiplayerInstance;
        const serverWillTeleport = multiplayer?.leaveRlgl() || false;

        // If networking is unavailable, return locally. On a connected socket the
        // server owns the teleport so remote clients see the same position.
        if (!serverWillTeleport) {
            player.setGroundedPosition(new BABYLON.Vector3(-10, 10, 15), "rlgl-offline-return");
            player.isLocked = false;
        }
    };

    return { scene, camera, player, headNode };
}
