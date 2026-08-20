import * as BABYLON from "@babylonjs/core";

function createDigit(
    scene,
    parent,
    name,
    xOffset,
    material
) {
    const root =
        new BABYLON.TransformNode(
            `${name}_root`,
            scene
        );

    root.parent = parent;
    root.position.x = xOffset;

    const definitions = {
        A: { position: [0, 2.4, 0], scaling: [2.0, 0.28, 0.22] },
        B: { position: [1.8, 1.2, 0], scaling: [0.28, 1.2, 0.22] },
        C: { position: [1.8, -1.2, 0], scaling: [0.28, 1.2, 0.22] },
        D: { position: [0, -2.4, 0], scaling: [2.0, 0.28, 0.22] },
        E: { position: [-1.8, -1.2, 0], scaling: [0.28, 1.2, 0.22] },
        F: { position: [-1.8, 1.2, 0], scaling: [0.28, 1.2, 0.22] },
        G: { position: [0, 0, 0], scaling: [2.0, 0.28, 0.22] }
    };

    const digitMap = {
        0: ["A", "B", "C", "D", "E", "F"],
        1: ["B", "C"],
        2: ["A", "B", "G", "E", "D"],
        3: ["A", "B", "C", "D", "G"],
        4: ["F", "G", "B", "C"],
        5: ["A", "F", "G", "C", "D"],
        6: ["A", "F", "E", "D", "C", "G"],
        7: ["A", "B", "C"],
        8: ["A", "B", "C", "D", "E", "F", "G"],
        9: ["A", "B", "C", "D", "F", "G"]
    };

    const segments = {};

    Object.entries(definitions)
        .forEach(
            ([segmentName, config]) => {
                const segment =
                    BABYLON.MeshBuilder.CreateBox(
                        `${name}_${segmentName}`,
                        {
                            width: 1,
                            height: 1,
                            depth: 1
                        },
                        scene
                    );

                segment.parent = root;

                segment.position =
                    new BABYLON.Vector3(
                        ...config.position
                    );

                segment.scaling =
                    new BABYLON.Vector3(
                        ...config.scaling
                    );

                segment.material = material;
                segment.isPickable = false;
                segment.checkCollisions = false;

                segments[segmentName] =
                    segment;
            }
        );

    function setNumber(number) {
        const active =
            digitMap[number] || [];

        Object.entries(segments)
            .forEach(
                ([segmentName, segment]) => {
                    segment.setEnabled(
                        active.includes(
                            segmentName
                        )
                    );
                }
            );
    }

    return {
        root,
        setNumber
    };
}


function createTimerDisplay(
    scene,
    name,
    position,
    rotationY,
    material,
    scale = 1.45
) {
    const root =
        new BABYLON.TransformNode(
            `${name}_root`,
            scene
        );

    root.position.copyFrom(position);
    root.rotation.y = rotationY;

    const tens =
        createDigit(
            scene,
            root,
            `${name}_tens`,
            -2.5,
            material
        );

    const ones =
        createDigit(
            scene,
            root,
            `${name}_ones`,
            2.5,
            material
        );

    root.scaling.setAll(scale);

    function setTime(seconds) {
        const safeSeconds =
            BABYLON.Scalar.Clamp(
                Math.ceil(
                    Number(seconds) || 0
                ),
                0,
                99
            );

        tens.setNumber(
            Math.floor(
                safeSeconds / 10
            )
        );

        ones.setNumber(
            safeSeconds % 10
        );
    }

    return {
        root,
        setTime
    };
}


export function createRlglArenaTimer(scene) {
    const timerMaterial =
        new BABYLON.StandardMaterial(
            "rlglArenaTimerMaterial",
            scene
        );

    timerMaterial.disableLighting = true;

    timerMaterial.diffuseColor =
        new BABYLON.Color3(
            1,
            0.25,
            0.02
        );

    timerMaterial.emissiveColor =
        new BABYLON.Color3(
            1,
            0.12,
            0.01
        );
    const TIMER_NEUTRAL_DIFFUSE =
        new BABYLON.Color3(
            1,
            0.25,
            0.02
        );

    const TIMER_NEUTRAL_EMISSIVE =
        new BABYLON.Color3(
            1,
            0.12,
            0.01
        );

    const TIMER_GREEN_DIFFUSE =
        new BABYLON.Color3(
            0.05,
            1,
            0.15
        );

    const TIMER_GREEN_EMISSIVE =
        new BABYLON.Color3(
            0.02,
            0.80,
            0.08
        );

    const TIMER_RED_DIFFUSE =
        new BABYLON.Color3(
            1,
            0.05,
            0.05
        );

    const TIMER_RED_EMISSIVE =
        new BABYLON.Color3(
            0.88,
            0.01,
            0.01
        );

    function applyTimerColor(
        diffuse,
        emissive
    ) {
        timerMaterial.diffuseColor
            .copyFrom(diffuse);

        timerMaterial.emissiveColor
            .copyFrom(emissive);
    }

    function setSignalState(
        isRedLight
    ) {
        if (isRedLight) {
            applyTimerColor(
                TIMER_RED_DIFFUSE,
                TIMER_RED_EMISSIVE
            );

            return;
        }

        applyTimerColor(
            TIMER_GREEN_DIFFUSE,
            TIMER_GREEN_EMISSIVE
        );
    }

    function setNeutral() {
        applyTimerColor(
            TIMER_NEUTRAL_DIFFUSE,
            TIMER_NEUTRAL_EMISSIVE
        );
    }

    setNeutral();


    const centerZ = -116.79;

    const start =
        createTimerDisplay(
            scene,
            "rlglTimerStart",
            new BABYLON.Vector3(
                -593.0,
                9.0,
                centerZ
            ),
            Math.PI / 2,
            timerMaterial,
            1.5
        );

    const finish =
        createTimerDisplay(
            scene,
            "rlglTimerFinish",
            new BABYLON.Vector3(
                -730.0,
                20.0,
                centerZ
            ),
            -Math.PI / 2,
            timerMaterial,
            1.5
        );

    const northA =
        createTimerDisplay(
            scene,
            "rlglTimerNorthA",
            new BABYLON.Vector3(
                -628.0,
                7.5,
                -143.5
            ),
            Math.PI,
            timerMaterial
        );

    const northB =
        createTimerDisplay(
            scene,
            "rlglTimerNorthB",
            new BABYLON.Vector3(
                -690.0,
                7.5,
                -143.5
            ),
            Math.PI,
            timerMaterial
        );

    const southA =
        createTimerDisplay(
            scene,
            "rlglTimerSouthA",
            new BABYLON.Vector3(
                -628.0,
                7.5,
                -90.1
            ),
            0,
            timerMaterial
        );

    const southB =
        createTimerDisplay(
            scene,
            "rlglTimerSouthB",
            new BABYLON.Vector3(
                -690.0,
                7.5,
                -90.1
            ),
            0,
            timerMaterial
        );

    const displays = [
        start,
        finish,
        northA,
        northB,
        southA,
        southB
    ];

    function setTime(seconds) {
        displays.forEach(
            (display) => {
                display.setTime(seconds);
            }
        );
    }

    function show() {
        displays.forEach(
            (display) => {
                display.root.setEnabled(true);
            }
        );
    }

    function hide() {
        displays.forEach(
            (display) => {
                display.root.setEnabled(false);
            }
        );
    }

    hide();

    return {
        setTime,
        show,
        hide,
        setSignalState,
        setNeutral,

        dispose() {
            displays.forEach(
                (display) => {
                    display.root.dispose();
                }
            );

            timerMaterial.dispose();
        }
    };
}
