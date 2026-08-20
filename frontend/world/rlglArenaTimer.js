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

    /*
          A
        ─────
       F     B
       F     B
          G
        ─────
       E     C
       E     C
        ─────
          D
    */

    const definitions = {
        A: {
            position: [0, 2.4, 0],
            scaling: [2.0, 0.28, 0.22]
        },

        B: {
            position: [1.8, 1.2, 0],
            scaling: [0.28, 1.2, 0.22]
        },

        C: {
            position: [1.8, -1.2, 0],
            scaling: [0.28, 1.2, 0.22]
        },

        D: {
            position: [0, -2.4, 0],
            scaling: [2.0, 0.28, 0.22]
        },

        E: {
            position: [-1.8, -1.2, 0],
            scaling: [0.28, 1.2, 0.22]
        },

        F: {
            position: [-1.8, 1.2, 0],
            scaling: [0.28, 1.2, 0.22]
        },

        G: {
            position: [0, 0, 0],
            scaling: [2.0, 0.28, 0.22]
        }
    };

    const segments = {};

    Object.entries(definitions)
        .forEach(([segmentName, config]) => {

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
        });

    const digitMap = {
        0: ["A", "B", "C", "D", "E", "F"],

        1: ["B", "C"],

        2: [
            "A",
            "B",
            "G",
            "E",
            "D"
        ],

        3: [
            "A",
            "B",
            "C",
            "D",
            "G"
        ],

        4: [
            "F",
            "G",
            "B",
            "C"
        ],

        5: [
            "A",
            "F",
            "G",
            "C",
            "D"
        ],

        6: [
            "A",
            "F",
            "E",
            "D",
            "C",
            "G"
        ],

        7: [
            "A",
            "B",
            "C"
        ],

        8: [
            "A",
            "B",
            "C",
            "D",
            "E",
            "F",
            "G"
        ],

        9: [
            "A",
            "B",
            "C",
            "D",
            "F",
            "G"
        ]
    };

    function setNumber(number) {
        const activeSegments =
            digitMap[number] || [];

        Object.entries(segments)
            .forEach(
                ([segmentName, segment]) => {

                    segment.setEnabled(
                        activeSegments.includes(
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
    material
) {
    const root =
        new BABYLON.TransformNode(
            `${name}_root`,
            scene
        );

    root.position.copyFrom(position);
    root.rotation.y = rotationY;

    // Two physical digits.
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

    // Scale whole timer if needed.
    root.scaling.setAll(1.15);

    function setTime(seconds) {
        const safeSeconds =
            BABYLON.Scalar.Clamp(
                Math.ceil(seconds),
                0,
                99
            );

        const tensValue =
            Math.floor(
                safeSeconds / 10
            );

        const onesValue =
            safeSeconds % 10;

        tens.setNumber(tensValue);
        ones.setNumber(onesValue);
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

    // ==========================================
    // FOUR SIDES
    // ==========================================

    // Finish-line side.
    // Faces toward the center (-Z).
    const front =
        createTimerDisplay(
            scene,
            "rlglTimerFront",

            new BABYLON.Vector3(
                500,
                16,
                546
            ),

            0,

            timerMaterial
        );


    // Starting side.
    // Rotate 180° so it faces +Z.
    const back =
        createTimerDisplay(
            scene,
            "rlglTimerBack",

            new BABYLON.Vector3(
                500,
                16,
                454
            ),

            Math.PI,

            timerMaterial
        );


    // Left side.
    const left =
        createTimerDisplay(
            scene,
            "rlglTimerLeft",

            new BABYLON.Vector3(
                454,
                16,
                500
            ),

            -Math.PI / 2,

            timerMaterial
        );


    // Right side.
    const right =
        createTimerDisplay(
            scene,
            "rlglTimerRight",

            new BABYLON.Vector3(
                546,
                16,
                500
            ),

            Math.PI / 2,

            timerMaterial
        );


    const displays = [
        front,
        back,
        left,
        right
    ];


    function setTime(seconds) {
        displays.forEach(
            display => {
                display.setTime(seconds);
            }
        );
    }


    function show() {
        displays.forEach(
            display => {
                display.root.setEnabled(true);
            }
        );
    }


    function hide() {
        displays.forEach(
            display => {
                display.root.setEnabled(false);
            }
        );
    }


    // Initially hidden.
    hide();


    return {
        setTime,

        show,

        hide,

        dispose() {

            displays.forEach(
                display => {
                    display.root.dispose();
                }
            );

            timerMaterial.dispose();
        }
    };
}