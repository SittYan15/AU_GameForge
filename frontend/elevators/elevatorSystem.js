import * as BABYLON from "@babylonjs/core";

// frontend/elevators/elevatorSystem.js

function isFiniteVector(value) {
    return (
        value &&
        Number.isFinite(value.x) &&
        Number.isFinite(value.y) &&
        Number.isFinite(value.z)
    );
}

function normalizeZone(zone) {
    if (
        !zone ||
        !isFiniteVector(zone.center) ||
        !isFiniteVector(zone.size)
    ) {
        return null;
    }

    return {
        center: {
            x: zone.center.x,
            y: zone.center.y,
            z: zone.center.z
        },

        size: {
            x: Math.max(0.1, Math.abs(zone.size.x)),
            y: Math.max(0.1, Math.abs(zone.size.y)),
            z: Math.max(0.1, Math.abs(zone.size.z))
        }
    };
}

function pointInsideZone(position, zone) {
    const halfX = zone.size.x / 2;
    const halfY = zone.size.y / 2;
    const halfZ = zone.size.z / 2;

    return (
        Math.abs(position.x - zone.center.x) <= halfX &&
        Math.abs(position.y - zone.center.y) <= halfY &&
        Math.abs(position.z - zone.center.z) <= halfZ
    );
}

function wait(ms) {
    return new Promise((resolve) => {
        window.setTimeout(resolve, ms);
    });
}

function createStyles() {
    if (document.getElementById("auElevatorStyles")) {
        return;
    }

    const style =
        document.createElement("style");

    style.id =
        "auElevatorStyles";

    style.textContent = `
        #auElevatorPanel {
            position: fixed;
            top: 50%;
            right: 18px;
            z-index: 1450;
            width: min(290px, calc(100vw - 36px));
            transform: translateY(-50%);
            box-sizing: border-box;
            padding: 14px;
            border: 1px solid rgba(255,255,255,.15);
            border-radius: 16px;
            background:
                linear-gradient(
                    155deg,
                    rgba(28,31,38,.96),
                    rgba(13,15,19,.96)
                );
            color: #fff;
            box-shadow: 0 16px 42px rgba(0,0,0,.42);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            pointer-events: auto;
        }

        #auElevatorPanel[hidden] {
            display: none !important;
        }

        #auElevatorName {
            margin: 0 0 3px;
            color: #fff;
            font-size: 15px;
            font-weight: 900;
        }

        #auElevatorCurrent {
            margin-bottom: 11px;
            color: #aeb7c2;
            font-size: 11px;
            line-height: 1.35;
        }

        #auElevatorFloors {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 8px;
        }

        .au-elevator-floor {
            min-height: 44px;
            border: 1px solid rgba(255,255,255,.15);
            border-radius: 10px;
            background: rgba(255,255,255,.07);
            color: #fff;
            font: 900 13px/1 system-ui, sans-serif;
            cursor: pointer;
            transition:
                transform .14s ease,
                background .14s ease,
                border-color .14s ease;
        }

        .au-elevator-floor:hover:not(:disabled) {
            transform: translateY(-1px);
            border-color: rgba(105,240,192,.55);
            background: rgba(105,240,192,.12);
        }

        .au-elevator-floor:active:not(:disabled) {
            transform: scale(.97);
        }

        .au-elevator-floor:disabled {
            cursor: default;
            border-color: rgba(105,240,192,.34);
            background: rgba(105,240,192,.16);
            color: #69f0c0;
        }

        #auElevatorHint {
            margin-top: 10px;
            color: #8f98a5;
            font-size: 10px;
            line-height: 1.35;
        }

        #auElevatorFade {
            position: fixed;
            inset: 0;
            z-index: 5000;
            opacity: 0;
            background: #000;
            pointer-events: none;
            transition: opacity 180ms ease;
        }

        #auElevatorFade.active {
            opacity: 1;
            pointer-events: auto;
        }

        #auElevatorFadeMessage {
            position: absolute;
            left: 50%;
            bottom: max(42px, calc(24px + env(safe-area-inset-bottom)));
            transform: translateX(-50%);
            max-width: calc(100vw - 32px);
            color: rgba(255,255,255,.88);
            font: 800 13px/1.4 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            letter-spacing: .02em;
            text-align: center;
            white-space: nowrap;
        }

        @media (max-width: 900px) {
            #auElevatorPanel {
                top: auto;
                right: 50%;
                bottom: calc(90px + env(safe-area-inset-bottom));
                width: min(330px, calc(100vw - 24px));
                transform: translateX(50%);
                padding: 12px;
                border-radius: 14px;
            }

            #auElevatorFloors {
                grid-template-columns: repeat(4, minmax(0, 1fr));
                gap: 7px;
            }

            .au-elevator-floor {
                min-height: 42px;
                font-size: 12px;
            }
        }

        @media (max-width: 520px) {
            #auElevatorFloors {
                grid-template-columns: repeat(3, minmax(0, 1fr));
            }
        }

        @media (max-width: 900px) and (max-height: 500px) and (orientation: landscape) {
            #auElevatorPanel {
                right: 14px;
                bottom: 12px;
                width: min(300px, 42vw);
                transform: none;
            }

            #auElevatorFloors {
                grid-template-columns: repeat(4, minmax(0, 1fr));
            }

            .au-elevator-floor {
                min-height: 36px;
            }
        }
    `;

    document.head.appendChild(style);
}

function createUi() {
    createStyles();

    const panel =
        document.createElement("section");

    panel.id =
        "auElevatorPanel";

    panel.hidden =
        true;

    panel.setAttribute(
        "aria-label",
        "Elevator floor selection"
    );

    const name =
        document.createElement("div");

    name.id =
        "auElevatorName";

    const current =
        document.createElement("div");

    current.id =
        "auElevatorCurrent";

    const floors =
        document.createElement("div");

    floors.id =
        "auElevatorFloors";

    const hint =
        document.createElement("div");

    hint.id =
        "auElevatorHint";

    hint.textContent =
        "Choose a floor.";

    panel.append(
        name,
        current,
        floors,
        hint
    );

    document.body.appendChild(panel);

    const fade =
        document.createElement("div");

    fade.id =
        "auElevatorFade";

    fade.setAttribute(
        "aria-hidden",
        "true"
    );

    const fadeMessage =
        document.createElement(
            "div"
        );

    fadeMessage.id =
        "auElevatorFadeMessage";

    fade.appendChild(
        fadeMessage
    );

    document.body.appendChild(fade);

    return {
        panel,
        name,
        current,
        floors,
        hint,
        fade,
        fadeMessage
    };
}

function createDebugZone(scene, zone, elevatorId, floorId) {
    const mesh =
        BABYLON.MeshBuilder.CreateBox(
            `elevator_debug_${elevatorId}_${floorId}`,
            {
                width: zone.size.x,
                height: zone.size.y,
                depth: zone.size.z
            },
            scene
        );

    mesh.position.copyFromFloats(
        zone.center.x,
        zone.center.y,
        zone.center.z
    );

    mesh.isPickable =
        false;

    mesh.checkCollisions =
        false;

    const material =
        new BABYLON.StandardMaterial(
            `elevator_debug_mat_${elevatorId}_${floorId}`,
            scene
        );

    material.diffuseColor =
        new BABYLON.Color3(
            0.1,
            0.85,
            0.95
        );

    material.emissiveColor =
        new BABYLON.Color3(
            0.0,
            0.2,
            0.25
        );

    material.alpha =
        0.18;

    mesh.material =
        material;

    return mesh;
}

export function createElevatorSystem(
    scene,
    player,
    elevatorDefinitions = [],
    {
        debug = false
    } = {}
) {
    const ui =
        createUi();

    const elevators =
        [];

    const debugMeshes =
        [];

    let activeEntrance =
        null;

    let minigameActive =
        false;

    let teleporting =
        false;

    let suppressUntilExit =
        false;

    const validDefinitions =
        Array.isArray(
            elevatorDefinitions
        )
            ? elevatorDefinitions
            : [];

    for (
        const elevator of
        validDefinitions
    ) {
        if (
            !elevator ||
            elevator.enabled === false ||
            typeof elevator.id !== "string" ||
            !Array.isArray(elevator.floors)
        ) {
            continue;
        }

        const floors =
            [];

        for (
            const floor of
            elevator.floors
        ) {
            const zone =
                normalizeZone(
                    floor?.zone
                );

            if (
                !floor ||
                typeof floor.id !== "string" ||
                !zone ||
                !isFiniteVector(
                    floor.target
                )
            ) {
                console.warn(
                    "Elevator floor ignored because its config is invalid:",
                    elevator.id,
                    floor
                );

                continue;
            }

            const normalizedFloor = {
                id:
                    floor.id,

                label:
                    String(
                        floor.label ??
                        floor.id
                    ),

                title:
                    String(
                        floor.title ??
                        `Floor ${floor.label ?? floor.id}`
                    ),

                zone,

                target: {
                    x:
                        floor.target.x,
                    y:
                        floor.target.y,
                    z:
                        floor.target.z
                }
            };

            floors.push(
                normalizedFloor
            );

            if (debug) {
                debugMeshes.push(
                    createDebugZone(
                        scene,
                        zone,
                        elevator.id,
                        floor.id
                    )
                );
            }
        }

        if (
            floors.length <
            2
        ) {
            console.warn(
                `Elevator "${elevator.id}" needs at least 2 valid floors.`
            );

            continue;
        }

        elevators.push({
            id:
                elevator.id,

            name:
                String(
                    elevator.name ??
                    "Elevator"
                ),

            floors
        });
    }

    function closePanel() {
        ui.panel.hidden =
            true;

        activeEntrance =
            null;
    }

    function renderPanel(
        entrance
    ) {
        const {
            elevator,
            currentFloor
        } =
            entrance;

        ui.name.textContent =
            `🛗 ${elevator.name}`;

        ui.current.textContent =
            `Current floor: ${currentFloor.title}`;

        ui.floors.replaceChildren();

        for (
            const floor of
            elevator.floors
        ) {
            const button =
                document.createElement(
                    "button"
                );

            button.type =
                "button";

            button.className =
                "au-elevator-floor";

            button.textContent =
                floor.label;

            button.title =
                floor.title;

            button.disabled =
                floor.id ===
                currentFloor.id;

            button.setAttribute(
                "aria-label",
                floor.id ===
                    currentFloor.id
                    ? `${floor.title}, current floor`
                    : `Go to ${floor.title}`
            );

            button.addEventListener(
                "click",
                () => {
                    if (
                        button.disabled ||
                        teleporting
                    ) {
                        return;
                    }

                    void teleportToFloor(
                        elevator,
                        floor
                    );
                }
            );

            ui.floors.appendChild(
                button
            );
        }

        ui.panel.hidden =
            false;
    }

    async function teleportToFloor(
        elevator,
        floor
    ) {
        if (
            teleporting ||
            minigameActive
        ) {
            return;
        }

        teleporting =
            true;

        const originEntrance =
            activeEntrance;

        const previousLock =
            Boolean(
                player.isLocked
            );

        let destinationLease =
            null;

        player.isLocked =
            true;

        document.exitPointerLock?.();

        ui.panel.hidden =
            true;

        ui.fadeMessage.textContent =
            `Loading ${floor.title}...`;

        ui.fade.classList.add(
            "active"
        );

        await wait(
            220
        );

        try {
            const chunkManager =
                scene.metadata
                    ?.chunkManager;

            if (
                chunkManager
                    ?.preparePosition
            ) {
                destinationLease =
                    await chunkManager
                        .preparePosition(
                            floor.target,
                            {
                                timeoutMs:
                                    10_000
                            }
                        );
            }

            // Let Babylon render the newly added containers so world matrices,
            // walkable-ground rays, and collision data are valid before the
            // player capsule is moved.
            await new Promise(
                requestAnimationFrame
            );

            await new Promise(
                requestAnimationFrame
            );

            ui.fadeMessage.textContent =
                `Arriving at ${floor.title}...`;

            if (
                typeof player.setGroundedPosition ===
                "function"
            ) {
                player.setGroundedPosition(
                    floor.target,
                    `elevator-${elevator.id}-${floor.id}`
                );
            } else {
                player.position.copyFromFloats(
                    floor.target.x,
                    floor.target.y,
                    floor.target.z
                );
            }

            // Give the destination chunk two more rendered frames while pinned
            // before normal streaming is allowed to manage it again.
            await new Promise(
                requestAnimationFrame
            );

            await new Promise(
                requestAnimationFrame
            );

            ui.fadeMessage.textContent =
                "";

            ui.fade.classList.remove(
                "active"
            );

            await wait(
                280
            );

            destinationLease
                ?.release?.();

            destinationLease =
                null;

            player.isLocked =
                previousLock;

            teleporting =
                false;

            // Do not immediately reopen the destination elevator menu.
            // The player must step out and re-enter.
            suppressUntilExit =
                true;

            activeEntrance =
                null;
        } catch (error) {
            console.error(
                "[Elevator] Destination floor could not be prepared:",
                error
            );

            destinationLease
                ?.release?.();

            destinationLease =
                null;

            ui.fadeMessage.textContent =
                "Floor could not be loaded. Staying on the current floor.";

            await wait(
                700
            );

            ui.fade.classList.remove(
                "active"
            );

            await wait(
                280
            );

            ui.fadeMessage.textContent =
                "";

            player.isLocked =
                previousLock;

            teleporting =
                false;

            suppressUntilExit =
                false;

            if (
                originEntrance
            ) {
                activeEntrance =
                    originEntrance;

                renderPanel(
                    originEntrance
                );

                ui.hint.textContent =
                    "Could not load that floor. Please try again.";
            }
        }
    }

    function findEntrance() {
        for (
            const elevator of
            elevators
        ) {
            for (
                const floor of
                elevator.floors
            ) {
                if (
                    pointInsideZone(
                        player.position,
                        floor.zone
                    )
                ) {
                    return {
                        key:
                            `${elevator.id}:${floor.id}`,

                        elevator,

                        currentFloor:
                            floor
                    };
                }
            }
        }

        return null;
    }

    const observer =
        scene.onBeforeRenderObservable.add(
            () => {
                if (
                    minigameActive ||
                    teleporting ||
                    scene.metadata
                        ?.carRaceActive
                ) {
                    if (
                        !ui.panel.hidden
                    ) {
                        closePanel();
                    }

                    return;
                }

                const entrance =
                    findEntrance();

                if (!entrance) {
                    if (
                        suppressUntilExit
                    ) {
                        suppressUntilExit =
                            false;
                    }

                    if (
                        !ui.panel.hidden
                    ) {
                        closePanel();
                    }

                    return;
                }

                if (
                    suppressUntilExit
                ) {
                    return;
                }

                if (
                    activeEntrance
                        ?.key ===
                    entrance.key
                ) {
                    return;
                }

                activeEntrance =
                    entrance;

                renderPanel(
                    entrance
                );
            }
        );

    const onMinigameState =
        (event) => {
            minigameActive =
                event.detail
                    ?.active ===
                true;

            if (
                minigameActive
            ) {
                closePanel();
            }
        };

    window.addEventListener(
        "au:minigame-state",
        onMinigameState
    );

    scene.metadata =
        scene.metadata ||
        {};

    scene.metadata.elevatorSystem = {
        elevators,

        printPlayerPosition() {
            const p =
                player.position;

            const position = {
                x:
                    Number(
                        p.x.toFixed(2)
                    ),

                y:
                    Number(
                        p.y.toFixed(2)
                    ),

                z:
                    Number(
                        p.z.toFixed(2)
                    )
            };

            console.log(
                "[Elevator position]",
                position
            );

            return position;
        },

        getConfiguredElevators() {
            return elevators;
        }
    };

    window.auElevatorSystem =
        scene.metadata.elevatorSystem;

    return {
        elevators,

        dispose() {
            scene
                .onBeforeRenderObservable
                .remove(
                    observer
                );

            window.removeEventListener(
                "au:minigame-state",
                onMinigameState
            );

            debugMeshes.forEach(
                (mesh) =>
                    mesh.dispose()
            );

            ui.panel.remove();
            ui.fade.remove();

            if (
                window.auElevatorSystem ===
                scene.metadata
                    ?.elevatorSystem
            ) {
                delete window
                    .auElevatorSystem;
            }

            if (
                scene.metadata
                    ?.elevatorSystem
            ) {
                delete scene.metadata
                    .elevatorSystem;
            }
        }
    };
}
