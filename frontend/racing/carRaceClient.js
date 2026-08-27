// frontend/racing/carRaceClient.js
import * as BABYLON from "@babylonjs/core";
import {
    createCarPhysicsController
} from "./carPhysicsController.js";
import {
    CAR_RACE_CHECKPOINTS,
    CAR_RACE_START_HEADING
} from "./carRaceDefinitions.js";

const MAX_FORWARD_SPEED = 24;
const MAX_REVERSE_SPEED = 6;
const ACCELERATION = 13;
const BRAKE_POWER = 22;
const COAST_DRAG = 5.5;
const STEER_RATE = 1.65;

function colorForId(id = "") {
    const palette = [
        new BABYLON.Color3(0.95, 0.18, 0.10),
        new BABYLON.Color3(0.10, 0.45, 0.95),
        new BABYLON.Color3(0.15, 0.78, 0.32),
        new BABYLON.Color3(0.95, 0.62, 0.08),
        new BABYLON.Color3(0.58, 0.24, 0.94),
        new BABYLON.Color3(0.04, 0.80, 0.82)
    ];

    let hash = 0;

    for (
        let index = 0;
        index < id.length;
        index += 1
    ) {
        hash =
            ((hash << 5) - hash) +
            id.charCodeAt(index);

        hash |= 0;
    }

    return palette[
        Math.abs(hash) %
        palette.length
    ];
}

function createCarVisual(
    scene,
    name,
    color
) {
    const root =
        new BABYLON.TransformNode(
            `${name}_root`,
            scene
        );

    const body =
        BABYLON.MeshBuilder.CreateBox(
            `${name}_body`,
            {
                width: 2.05,
                height: 0.72,
                depth: 4.15
            },
            scene
        );

    body.parent = root;
    body.position.y = 0.48;
    body.checkCollisions = false;
    body.isPickable = false;

    const bodyMaterial =
        new BABYLON.StandardMaterial(
            `${name}_body_material`,
            scene
        );

    bodyMaterial.diffuseColor =
        color;

    bodyMaterial.emissiveColor =
        color.scale(0.10);

    bodyMaterial.specularColor =
        new BABYLON.Color3(
            0.14,
            0.14,
            0.14
        );

    body.material =
        bodyMaterial;

    const cabin =
        BABYLON.MeshBuilder.CreateBox(
            `${name}_cabin`,
            {
                width: 1.55,
                height: 0.62,
                depth: 1.90
            },
            scene
        );

    cabin.parent = root;
    cabin.position.y = 1.05;
    cabin.position.z = 0.25;
    cabin.isPickable = false;
    cabin.checkCollisions = false;

    const glassMaterial =
        new BABYLON.StandardMaterial(
            `${name}_glass_material`,
            scene
        );

    glassMaterial.diffuseColor =
        new BABYLON.Color3(
            0.08,
            0.13,
            0.19
        );

    glassMaterial.emissiveColor =
        new BABYLON.Color3(
            0.015,
            0.02,
            0.03
        );

    cabin.material =
        glassMaterial;

    const wheelMaterial =
        new BABYLON.StandardMaterial(
            `${name}_wheel_material`,
            scene
        );

    wheelMaterial.diffuseColor =
        new BABYLON.Color3(
            0.025,
            0.025,
            0.025
        );

    [
        [-1.02, 0.18, 1.30],
        [1.02, 0.18, 1.30],
        [-1.02, 0.18, -1.30],
        [1.02, 0.18, -1.30]
    ].forEach(
        ([x, y, z], index) => {
            const wheel =
                BABYLON.MeshBuilder.CreateCylinder(
                    `${name}_wheel_${index}`,
                    {
                        diameter: 0.62,
                        height: 0.28,
                        tessellation: 18
                    },
                    scene
                );

            wheel.parent = root;

            wheel.position.copyFromFloats(
                x,
                y,
                z
            );

            wheel.rotation.z =
                Math.PI / 2;

            wheel.material =
                wheelMaterial;

            wheel.isPickable = false;
            wheel.checkCollisions = false;
        }
    );

    root.setEnabled(false);

    return {
        root,

        dispose() {
            root
                .getChildMeshes()
                .forEach(
                    (mesh) =>
                        mesh.dispose(
                            false,
                            true
                        )
                );

            root.dispose();
        }
    };
}

function createCheckpointMarker(scene) {
    const root =
        new BABYLON.TransformNode(
            "car_race_checkpoint_root",
            scene
        );

    const beam =
        BABYLON.MeshBuilder.CreateCylinder(
            "car_race_checkpoint_beam",
            {
                diameter: 2.8,
                height: 12,
                tessellation: 32
            },
            scene
        );

    beam.parent = root;
    beam.position.y = 6;
    beam.isPickable = false;
    beam.checkCollisions = false;

    const material =
        new BABYLON.StandardMaterial(
            "car_race_checkpoint_material",
            scene
        );

    material.diffuseColor =
        new BABYLON.Color3(
            1.0,
            0.45,
            0.03
        );

    material.emissiveColor =
        new BABYLON.Color3(
            1.0,
            0.65,
            0.05
        );

    material.alpha = 0.28;

    beam.material = material;

    const ring =
        BABYLON.MeshBuilder.CreateTorus(
            "car_race_checkpoint_ring",
            {
                diameter: 9.0,
                thickness: 0.45,
                tessellation: 48
            },
            scene
        );

    ring.parent = root;
    ring.position.y = 1.8;
    ring.material = material;
    ring.isPickable = false;
    ring.checkCollisions = false;

    root.setEnabled(false);

    return {
        root,

        setCheckpoint(index) {
            const checkpoint =
                CAR_RACE_CHECKPOINTS[index];

            if (!checkpoint) {
                root.setEnabled(false);
                return;
            }

            root.position.copyFromFloats(
                checkpoint.x,
                checkpoint.y,
                checkpoint.z
            );

            root.setEnabled(true);
        },

        dispose() {
            root
                .getChildMeshes()
                .forEach(
                    (mesh) =>
                        mesh.dispose(
                            false,
                            true
                        )
                );

            root.dispose();
        }
    };
}

export function createCarRaceClient(
    scene,
    localPlayer,
    socket,
    {
        setRemotePlayerRacing =
            () => {}
    } = {}
) {
    let active = false;
    let phase = "IDLE";
    let role = "none";
    let finished = false;
    let speed = 0;
    let heading =
        CAR_RACE_START_HEADING;
    let checkpointIndex = 0;

    let previousCamera = null;
    let raceCamera = null;

    let trafficCar = null;
    let trafficCarWasEnabled = true;

    const remoteCars =
        new Map();

    const localCar =
        createCarVisual(
            scene,
            "campus_race_local",
            new BABYLON.Color3(
                0.96,
                0.20,
                0.07
            )
        );

    const checkpointMarker =
        createCheckpointMarker(
            scene
        );

    const hud =
        document.createElement(
            "section"
        );

    hud.id =
        "carRaceHud";

    Object.assign(
        hud.style,
        {
            position: "fixed",
            top: "58px",
            left: "50%",
            transform:
                "translateX(-50%)",
            zIndex: "1055",
            minWidth: "290px",
            maxWidth:
                "calc(100vw - 30px)",
            padding: "9px 14px",
            boxSizing: "border-box",
            border:
                "1px solid rgba(255,255,255,.15)",
            borderRadius: "12px",
            background:
                "rgba(14,16,20,.92)",
            color: "#fff",
            fontFamily:
                "system-ui, sans-serif",
            textAlign: "center",
            boxShadow:
                "0 4px 18px rgba(0,0,0,.38)",
            pointerEvents: "none",
            display: "none"
        }
    );

    const title =
        document.createElement(
            "div"
        );

    title.textContent =
        "🏎️ AU CAMPUS ROAD RACE";

    Object.assign(
        title.style,
        {
            color: "#ff9347",
            fontSize: "11px",
            fontWeight: "900",
            letterSpacing: ".07em"
        }
    );

    const mainText =
        document.createElement(
            "div"
        );

    Object.assign(
        mainText.style,
        {
            marginTop: "2px",
            fontSize: "16px",
            fontWeight: "850"
        }
    );

    const subText =
        document.createElement(
            "div"
        );

    Object.assign(
        subText.style,
        {
            marginTop: "2px",
            color: "#c9ced7",
            fontSize: "11px"
        }
    );

    hud.append(
        title,
        mainText,
        subText
    );

    document.body.appendChild(
        hud
    );

    const leaveButton =
        document.createElement(
            "button"
        );

    leaveButton.id =
        "carRaceReturnButton";

    leaveButton.type =
        "button";

    leaveButton.textContent =
        "Return to Campus";

    Object.assign(
        leaveButton.style,
        {
            position: "fixed",
            top: "12px",
            right: "12px",
            zIndex: "1060",
            padding: "9px 12px",
            border:
                "1px solid rgba(255,255,255,.20)",
            borderRadius: "10px",
            background:
                "rgba(18,20,24,.93)",
            color: "#fff",
            fontSize: "13px",
            fontWeight: "800",
            cursor: "pointer",
            display: "none"
        }
    );

    document.body.appendChild(
        leaveButton
    );

    const inputMap =
        () =>
            scene.metadata
                ?.cameraModeController
                ?.inputMap ||
            {};

    const carPhysics =
        createCarPhysicsController(
            {
                scene,
                player:
                    localPlayer,
                getInputMap:
                    inputMap,
                startHeading:
                    CAR_RACE_START_HEADING
            }
        );

    const suspendInteriorStreaming =
        () => {
            scene.metadata
                ?.chunkManager
                ?.suspend?.(
                    {
                        purge: true
                    }
                );
        };

    const resumeInteriorStreaming =
        () => {
            scene.metadata
                ?.chunkManager
                ?.resume?.();
        };

    const setMinigameFocus =
        (value) => {
            window.dispatchEvent(
                new CustomEvent(
                    "au:minigame-state",
                    {
                        detail: {
                            active:
                                Boolean(
                                    value
                                ),
                            type:
                                "car-race"
                        }
                    }
                )
            );
        };

    const updateHud =
        (message = "") => {
            if (!active) {
                hud.style.display =
                    "none";

                return;
            }

            hud.style.display =
                "block";

            if (message) {
                mainText.textContent =
                    message;
            } else if (
                phase === "ACTIVE" &&
                role === "player"
            ) {
                mainText.textContent =
                    `Checkpoint ${Math.min(
                        checkpointIndex + 1,
                        CAR_RACE_CHECKPOINTS.length
                    )}/${CAR_RACE_CHECKPOINTS.length}`;
            } else if (
                role === "spectator"
            ) {
                mainText.textContent =
                    "Spectating current race";
            } else {
                mainText.textContent =
                    "Waiting for next race";
            }

            subText.textContent =
                phase === "ACTIVE" &&
                role === "player"
                    ? `${Math.round(
                        Math.abs(speed) *
                            3.6
                    )} km/h • Follow the orange checkpoint`
                    : "W/S accelerate & brake • A/D steer";
        };

    const placeLocalCar =
        () => {
            localCar.root.position
                .copyFrom(
                    localPlayer.position
                );

            localCar.root.position.y +=
                0.05;

            const visualState =
            carPhysics
                .getVisualState();

        localCar.root.rotation.x =
            visualState.pitch;

        localCar.root.rotation.y =
            heading;

        localCar.root.rotation.z =
            visualState.roll;
        };

    const hideTraffic =
        () => {
            trafficCar =
                scene.getMeshByName(
                    "BlueCruiser_collider"
                );

            if (!trafficCar) {
                return;
            }

            trafficCarWasEnabled =
                trafficCar.isEnabled();

            trafficCar.setEnabled(
                false
            );
        };

    const restoreTraffic =
        () => {
            if (!trafficCar) {
                return;
            }

            trafficCar.setEnabled(
                trafficCarWasEnabled
            );

            trafficCar = null;
        };

    const enterRaceCamera =
        () => {
            if (raceCamera) {
                return;
            }

            previousCamera =
                scene.activeCamera;

            previousCamera
                ?.detachControl?.();

            document.exitPointerLock?.();

            raceCamera =
                new BABYLON.FreeCamera(
                    "campusRoadRaceCamera",
                    localPlayer.position.add(
                        new BABYLON.Vector3(
                            0,
                            5,
                            10
                        )
                    ),
                    scene
                );

            raceCamera.minZ = 0.1;
            raceCamera.fov = 0.92;

            scene.activeCamera =
                raceCamera;
        };

    const exitRaceCamera =
        () => {
            if (!raceCamera) {
                return;
            }

            raceCamera.dispose();
            raceCamera = null;

            if (previousCamera) {
                scene.activeCamera =
                    previousCamera;

                const canvas =
                    scene
                        .getEngine()
                        .getRenderingCanvas();

                if (canvas) {
                    previousCamera
                        .attachControl(
                            canvas,
                            true
                        );
                }
            }

            previousCamera = null;
        };

    const updateRaceCamera =
        () => {
            if (!raceCamera) {
                return;
            }

            const forward =
                new BABYLON.Vector3(
                    Math.sin(heading),
                    0,
                    Math.cos(heading)
                );

            const desiredPosition =
                localPlayer.position
                    .subtract(
                        forward.scale(10.5)
                    )
                    .add(
                        new BABYLON.Vector3(
                            0,
                            4.7,
                            0
                        )
                    );

            const smoothing =
                1 -
                Math.exp(
                    -8 *
                        scene
                            .getEngine()
                            .getDeltaTime() /
                        1000
                );

            raceCamera.position =
                BABYLON.Vector3.Lerp(
                    raceCamera.position,
                    desiredPosition,
                    smoothing
                );

            raceCamera.setTarget(
                localPlayer.position
                    .add(
                        forward.scale(
                            5.5
                        )
                    )
                    .add(
                        new BABYLON.Vector3(
                            0,
                            1.1,
                            0
                        )
                    )
            );
        };

    const clearRemoteCars =
        () => {
            for (
                const [
                    socketId,
                    remote
                ] of remoteCars
            ) {
                setRemotePlayerRacing(
                    socketId,
                    false
                );

                remote.visual.dispose();
            }

            remoteCars.clear();
        };

    let jumpButtonDisplay =
        null;

    const activate =
        () => {
            if (active) {
                return;
            }

            active = true;
            finished = false;
            speed = 0;
            heading =
                CAR_RACE_START_HEADING;
            checkpointIndex = 0;

            carPhysics.reset(
                {
                    nextHeading:
                        heading
                }
            );

            carPhysics.setEnabled(
                false
            );

            // All I_*.glb interior building chunks are unnecessary on the
            // outdoor road-racing loop.
            suspendInteriorStreaming();

            setMinigameFocus(
                true
            );

            localPlayer.isLocked =
                true;

            localPlayer.characterMesh
                ?.setEnabled(
                    false
                );

            localCar.root.setEnabled(
                true
            );

            placeLocalCar();

            checkpointMarker
                .setCheckpoint(0);

            const jumpButton =
                document.getElementById(
                    "btn-jump"
                );

            if (jumpButton) {
                jumpButtonDisplay =
                    jumpButton.style.display;

                jumpButton.style.display =
                    "none";
            }

            hideTraffic();
            enterRaceCamera();

            leaveButton.style.display =
                "block";

            updateHud(
                "Joining race..."
            );
        };

    const deactivate =
        () => {
            if (!active) {
                return;
            }

            active = false;
            phase = "IDLE";
            role = "none";
            finished = false;
            speed = 0;

            carPhysics.setEnabled(
                false
            );

            resumeInteriorStreaming();

            setMinigameFocus(
                false
            );

            localCar.root.setEnabled(
                false
            );

            checkpointMarker
                .root
                .setEnabled(
                    false
                );

            restoreTraffic();
            exitRaceCamera();

            localPlayer.characterMesh
                ?.setEnabled(
                    false
                );

            localPlayer.isLocked =
                false;

            const jumpButton =
                document.getElementById(
                    "btn-jump"
                );

            if (jumpButton) {
                jumpButton.style.display =
                    jumpButtonDisplay ??
                    "";
            }

            jumpButtonDisplay =
                null;

            hud.style.display =
                "none";

            leaveButton.style.display =
                "none";
        };

    leaveButton.addEventListener(
        "click",
        () => {
            if (
                socket.connected &&
                active
            ) {
                socket.emit(
                    "carRace:leave"
                );
            } else {
                deactivate();
            }
        }
    );

    const onStarted =
        () => {
            activate();
        };

    const onTeleport =
        ({
            position,
            reason
        } = {}) => {
            if (
                !position ||
                ![
                    position.x,
                    position.y,
                    position.z
                ].every(
                    Number.isFinite
                )
            ) {
                return;
            }

            localPlayer
                .setGroundedPosition(
                    position,
                    `car-race-${reason || "teleport"}`
                );

            if (
                reason === "lobby" ||
                reason === "join-lobby" ||
                reason === "round-start"
            ) {
                speed = 0;
                heading =
                    CAR_RACE_START_HEADING;
                finished = false;

                carPhysics.reset(
                    {
                        nextHeading:
                            heading
                    }
                );
            }

            placeLocalCar();
        };

    const onRole =
        (nextRole) => {
            role =
                nextRole ||
                "none";

            localPlayer.isLocked =
                true;

            updateHud();
        };

    const onPhase =
        (nextPhase) => {
            phase =
                nextPhase ||
                "IDLE";

            if (
                phase === "LOBBY"
            ) {
                speed = 0;
                finished = false;
                checkpointIndex = 0;

                checkpointMarker
                    .setCheckpoint(0);

                updateHud(
                    "Waiting for race..."
                );
            } else if (
                phase === "ACTIVE"
            ) {
                updateHud();
            } else if (
                phase === "FINISHED"
            ) {
                speed = 0;

                updateHud(
                    "Race finished"
                );
            }
        };

    const onLobbyCountdown =
        (count) => {
            updateHud(
                `Race starts in ${count}`
            );
        };

    const onRoundStarted =
        (data = {}) => {
            phase = "ACTIVE";

            speed = 0;
            finished = false;

            heading =
                Number.isFinite(
                    data.startHeading
                )
                    ? data.startHeading
                    : CAR_RACE_START_HEADING;

            carPhysics.reset(
                {
                    nextHeading:
                        heading
                }
            );

            carPhysics.setEnabled(
                role === "player"
            );

            checkpointIndex = 0;

            checkpointMarker
                .setCheckpoint(0);

            updateHud(
                role === "spectator"
                    ? "Spectating current race"
                    : "GO!"
            );
        };

    const onCheckpoint =
        (data = {}) => {
            checkpointIndex =
                Number.isSafeInteger(
                    data.nextCheckpointIndex
                )
                    ? data.nextCheckpointIndex
                    : checkpointIndex + 1;

            checkpointMarker
                .setCheckpoint(
                    checkpointIndex
                );

            updateHud(
                checkpointIndex >=
                    CAR_RACE_CHECKPOINTS.length
                    ? "Finish!"
                    : `Checkpoint ${checkpointIndex}/${CAR_RACE_CHECKPOINTS.length}`
            );
        };

    const onFinish =
        (data = {}) => {
            finished = true;
            speed = 0;

            carPhysics.setEnabled(
                false
            );

            checkpointMarker
                .root
                .setEnabled(
                    false
                );

            updateHud(
                `Finished #${data.place ?? "?"} • +${data.pointsEarned || 0} pts`
            );
        };

    const onRoundFinished =
        (data = {}) => {
            speed = 0;
            phase = "FINISHED";

            const winner =
                data.results?.[0]
                    ?.playerName;

            updateHud(
                winner
                    ? `Winner: ${winner}`
                    : "Race finished"
            );
        };

    const onVehicle =
        (data = {}) => {
            if (
                data.socketId ===
                socket.id
            ) {
                return;
            }

            const position =
                data.position;

            if (
                !position ||
                ![
                    position.x,
                    position.y,
                    position.z
                ].every(
                    Number.isFinite
                )
            ) {
                return;
            }

            let remote =
                remoteCars.get(
                    data.socketId
                );

            if (!remote) {
                const visual =
                    createCarVisual(
                        scene,
                        `campus_race_remote_${data.socketId}`,
                        colorForId(
                            data.socketId
                        )
                    );

                visual.root.setEnabled(
                    true
                );

                remote = {
                    visual,
                    targetPosition:
                        new BABYLON.Vector3(
                            position.x,
                            position.y +
                                0.05,
                            position.z
                        ),
                    targetHeading:
                        Number.isFinite(
                            data.rotation?.y
                        )
                            ? data.rotation.y
                            : 0
                };

                remote.visual.root.position
                    .copyFrom(
                        remote.targetPosition
                    );

                remoteCars.set(
                    data.socketId,
                    remote
                );

                setRemotePlayerRacing(
                    data.socketId,
                    true
                );
            }

            remote.targetPosition
                .copyFromFloats(
                    position.x,
                    position.y + 0.05,
                    position.z
                );

            if (
                Number.isFinite(
                    data.rotation?.y
                )
            ) {
                remote.targetHeading =
                    data.rotation.y;
            }
        };

    const onVehicleLeft =
        (data = {}) => {
            const socketId =
                data.socketId;

            const remote =
                remoteCars.get(
                    socketId
                );

            if (remote) {
                remote.visual.dispose();

                remoteCars.delete(
                    socketId
                );
            }

            if (socketId) {
                setRemotePlayerRacing(
                    socketId,
                    false
                );
            }
        };

    const onLeft =
        () => {
            deactivate();
        };

    const onError =
        (message) => {
            updateHud(
                String(
                    message ||
                        "Could not start race."
                )
            );

            window.setTimeout(
                () => {
                    if (
                        phase === "IDLE"
                    ) {
                        deactivate();
                    }
                },
                2200
            );
        };

    socket.on(
        "carRace:started",
        onStarted
    );

    socket.on(
        "carRace:teleport",
        onTeleport
    );

    socket.on(
        "carRace:role",
        onRole
    );

    socket.on(
        "carRace:phase",
        onPhase
    );

    socket.on(
        "carRace:lobbyCountdown",
        onLobbyCountdown
    );

    socket.on(
        "carRace:roundStarted",
        onRoundStarted
    );

    socket.on(
        "carRace:checkpoint",
        onCheckpoint
    );

    socket.on(
        "carRace:finished",
        onFinish
    );

    socket.on(
        "carRace:roundFinished",
        onRoundFinished
    );

    socket.on(
        "carRace:vehicle",
        onVehicle
    );

    socket.on(
        "carRace:vehicleLeft",
        onVehicleLeft
    );

    socket.on(
        "carRace:left",
        onLeft
    );

    socket.on(
        "carRace:error",
        onError
    );

    scene.onBeforeRenderObservable.add(
        () => {
            remoteCars.forEach(
                (remote) => {
                    const smoothing =
                        1 -
                        Math.exp(
                            -12 *
                                scene
                                    .getEngine()
                                    .getDeltaTime() /
                                1000
                        );

                    remote.visual.root.position =
                        BABYLON.Vector3.Lerp(
                            remote.visual.root.position,
                            remote.targetPosition,
                            smoothing
                        );

                    const current =
                        remote.visual.root
                            .rotation.y;

                    const difference =
                        Math.atan2(
                            Math.sin(
                                remote.targetHeading -
                                    current
                            ),
                            Math.cos(
                                remote.targetHeading -
                                    current
                            )
                        );

                    remote.visual.root
                        .rotation.y =
                        current +
                        difference *
                            smoothing;
                }
            );

            if (!active) {
                return;
            }

            updateRaceCamera();

            if (
                phase !== "ACTIVE" ||
                role !== "player" ||
                finished
            ) {
                carPhysics.setEnabled(
                    false
                );

                placeLocalCar();
                return;
            }

            carPhysics.setEnabled(
                true
            );

            const physicsState =
                carPhysics.update(
                    Math.min(
                        0.05,
                        scene
                            .getEngine()
                            .getDeltaTime() /
                        1000
                    )
                );

            speed =
                physicsState.speed;

            heading =
                physicsState.heading;

            if (
                localPlayer.characterMesh
            ) {
                localPlayer.characterMesh
                    .rotation.y =
                    heading;
            }

            placeLocalCar();
            updateHud();
        }
    );

    return {
        requestStart() {
            if (
                !socket.connected
            ) {
                return false;
            }

            activate();

            socket.emit(
                "carRace:join"
            );

            return true;
        },

        dispose() {
            socket.off(
                "carRace:started",
                onStarted
            );

            socket.off(
                "carRace:teleport",
                onTeleport
            );

            socket.off(
                "carRace:role",
                onRole
            );

            socket.off(
                "carRace:phase",
                onPhase
            );

            socket.off(
                "carRace:lobbyCountdown",
                onLobbyCountdown
            );

            socket.off(
                "carRace:roundStarted",
                onRoundStarted
            );

            socket.off(
                "carRace:checkpoint",
                onCheckpoint
            );

            socket.off(
                "carRace:finished",
                onFinish
            );

            socket.off(
                "carRace:roundFinished",
                onRoundFinished
            );

            socket.off(
                "carRace:vehicle",
                onVehicle
            );

            socket.off(
                "carRace:vehicleLeft",
                onVehicleLeft
            );

            socket.off(
                "carRace:left",
                onLeft
            );

            socket.off(
                "carRace:error",
                onError
            );

            deactivate();
            clearRemoteCars();

            localCar.dispose();
            checkpointMarker.dispose();

            hud.remove();
            leaveButton.remove();
        }
    };
}
