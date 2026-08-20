import * as BABYLON from "@babylonjs/core";

function makeMaterial(scene, name, diffuse, emissive = BABYLON.Color3.Black()) {
    const material = new BABYLON.StandardMaterial(name, scene);
    material.diffuseColor = diffuse;
    material.emissiveColor = emissive;
    material.specularColor = new BABYLON.Color3(0.15, 0.15, 0.15);
    return material;
}

function createSevenSegmentDisplay(scene, parent) {
    const root = new BABYLON.TransformNode(
        "rlglCountdownDisplay",
        scene
    );

    root.parent = parent;

    root.position = new BABYLON.Vector3(
        -6.2,
        9.2,
        -0.8
    );

    const material =
        new BABYLON.StandardMaterial(
            "rlglCountdownMaterial",
            scene
        );

    material.disableLighting = true;

    material.diffuseColor =
        new BABYLON.Color3(
            1,
            0.45,
            0.02
        );

    material.emissiveColor =
        new BABYLON.Color3(
            1,
            0.25,
            0
        );

    const segmentDefinitions = {
        A: {
            position: [0, 2.4, 0],
            scale: [2.0, 0.32, 0.28]
        },
        B: {
            position: [1.8, 1.2, 0],
            scale: [0.32, 1.25, 0.28]
        },
        C: {
            position: [1.8, -1.2, 0],
            scale: [0.32, 1.25, 0.28]
        },
        D: {
            position: [0, -2.4, 0],
            scale: [2.0, 0.32, 0.28]
        },
        E: {
            position: [-1.8, -1.2, 0],
            scale: [0.32, 1.25, 0.28]
        },
        F: {
            position: [-1.8, 1.2, 0],
            scale: [0.32, 1.25, 0.28]
        },
        G: {
            position: [0, 0, 0],
            scale: [2.0, 0.32, 0.28]
        }
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

    function createDigit(name, x) {
        const digitRoot =
            new BABYLON.TransformNode(
                name,
                scene
            );

        digitRoot.parent = root;
        digitRoot.position.x = x;

        const segments = {};

        Object.entries(
            segmentDefinitions
        ).forEach(
            ([segmentName, definition]) => {
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

                segment.parent = digitRoot;

                segment.position =
                    new BABYLON.Vector3(
                        ...definition.position
                    );

                segment.scaling =
                    new BABYLON.Vector3(
                        ...definition.scale
                    );

                segment.material =
                    material;

                segment.isPickable = false;
                segment.checkCollisions = false;

                segments[segmentName] =
                    segment;
            }
        );

        return {
            setNumber(number) {
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
        };
    }

    const tens =
        createDigit(
            "rlglCountdownTens",
            -2.35
        );

    const ones =
        createDigit(
            "rlglCountdownOnes",
            2.35
        );

    function setNumber(number) {
        const safeNumber =
            BABYLON.Scalar.Clamp(
                Math.ceil(
                    Number(number) || 0
                ),
                0,
                99
            );

        tens.setNumber(
            Math.floor(
                safeNumber / 10
            )
        );

        ones.setNumber(
            safeNumber % 10
        );

        root.setEnabled(true);
    }

    function hide() {
        root.setEnabled(false);
    }

    hide();

    return {
        root,
        setNumber,
        hide
    };
}

export function createRlglSignal(scene) {
    const root = new BABYLON.TransformNode("rlglSignalRoot", scene);

    // Current arena runs from about Z=498 -> Z=540.
    // Put the physical signal just beyond the finish line.
    root.position = new BABYLON.Vector3(
        -734.2,
        -0.27,
        -116.79
    );

    // Face the players standing toward lower Z.
    root.rotation.y = -Math.PI / 2;

    // ------------------------------------------------------------
    // POLE
    // ------------------------------------------------------------
    const pole = BABYLON.MeshBuilder.CreateCylinder(
        "rlglSignalPole",
        {
            height: 10,
            diameter: 0.65,
            tessellation: 20
        },
        scene
    );

    pole.parent = root;
    pole.position.y = 5;
    pole.isPickable = false;
    pole.checkCollisions = false;

    const poleMaterial = makeMaterial(
        scene,
        "rlglSignalPoleMaterial",
        new BABYLON.Color3(0.12, 0.12, 0.14)
    );

    pole.material = poleMaterial;

    // ------------------------------------------------------------
    // TRAFFIC-LIGHT HOUSING
    // ------------------------------------------------------------
    const housing = BABYLON.MeshBuilder.CreateBox(
        "rlglSignalHousing",
        {
            width: 4.8,
            height: 8.5,
            depth: 1.7
        },
        scene
    );

    housing.parent = root;
    housing.position.y = 9.2;
    housing.isPickable = false;
    housing.checkCollisions = false;

    const housingMaterial = makeMaterial(
        scene,
        "rlglSignalHousingMaterial",
        new BABYLON.Color3(0.025, 0.025, 0.03)
    );

    housing.material = housingMaterial;

    // ------------------------------------------------------------
    // LIGHT BACKPLATES
    // ------------------------------------------------------------
    const redBackplate = BABYLON.MeshBuilder.CreateCylinder(
        "rlglRedBackplate",
        {
            height: 0.45,
            diameter: 3.25,
            tessellation: 40
        },
        scene
    );

    redBackplate.parent = root;
    redBackplate.position = new BABYLON.Vector3(0, 11.1, -0.9);
    redBackplate.rotation.x = Math.PI / 2;
    redBackplate.isPickable = false;
    redBackplate.checkCollisions = false;

    const greenBackplate = BABYLON.MeshBuilder.CreateCylinder(
        "rlglGreenBackplate",
        {
            height: 0.45,
            diameter: 3.25,
            tessellation: 40
        },
        scene
    );

    greenBackplate.parent = root;
    greenBackplate.position = new BABYLON.Vector3(0, 7.35, -0.9);
    greenBackplate.rotation.x = Math.PI / 2;
    greenBackplate.isPickable = false;
    greenBackplate.checkCollisions = false;

    const backplateMaterial = makeMaterial(
        scene,
        "rlglBackplateMaterial",
        new BABYLON.Color3(0.01, 0.01, 0.012)
    );

    redBackplate.material = backplateMaterial;
    greenBackplate.material = backplateMaterial;

    // ------------------------------------------------------------
    // ACTUAL RED / GREEN BULB MESHES
    // ------------------------------------------------------------
    const redLamp = BABYLON.MeshBuilder.CreateSphere(
        "rlglRedLamp",
        {
            diameter: 2.65,
            segments: 28
        },
        scene
    );

    redLamp.parent = root;
    redLamp.position = new BABYLON.Vector3(0, 11.1, -1.22);
    redLamp.scaling.z = 0.42;
    redLamp.isPickable = false;
    redLamp.checkCollisions = false;

    const greenLamp = BABYLON.MeshBuilder.CreateSphere(
        "rlglGreenLamp",
        {
            diameter: 2.65,
            segments: 28
        },
        scene
    );

    greenLamp.parent = root;
    greenLamp.position = new BABYLON.Vector3(0, 7.35, -1.22);
    greenLamp.scaling.z = 0.42;
    greenLamp.isPickable = false;
    greenLamp.checkCollisions = false;

    const redMaterial = makeMaterial(
        scene,
        "rlglRedLampMaterial",
        new BABYLON.Color3(0.15, 0.01, 0.01)
    );

    redMaterial.disableLighting = true;

    const greenMaterial = makeMaterial(
        scene,
        "rlglGreenLampMaterial",
        new BABYLON.Color3(0.01, 0.15, 0.02)
    );

    greenMaterial.disableLighting = true;

    redLamp.material = redMaterial;
    greenLamp.material = greenMaterial;

    // ------------------------------------------------------------
    // LIGHT SOURCES
    // ------------------------------------------------------------
    const redPointLight = new BABYLON.PointLight(
        "rlglRedPointLight",
        new BABYLON.Vector3(0, 11.1, -2.0),
        scene
    );

    redPointLight.parent = root;
    redPointLight.diffuse = new BABYLON.Color3(1, 0.02, 0.02);
    redPointLight.range = 28;
    redPointLight.intensity = 0;

    const greenPointLight = new BABYLON.PointLight(
        "rlglGreenPointLight",
        new BABYLON.Vector3(0, 7.35, -2.0),
        scene
    );

    greenPointLight.parent = root;
    greenPointLight.diffuse = new BABYLON.Color3(0.05, 1, 0.12);
    greenPointLight.range = 28;
    greenPointLight.intensity = 0;

    // ------------------------------------------------------------
    // OPTIONAL DOLL / SCANNER HEAD
    // ------------------------------------------------------------
    const headPivot = new BABYLON.TransformNode(
        "rlglSignalHeadPivot",
        scene
    );

    headPivot.parent = root;
    headPivot.position = new BABYLON.Vector3(0, 15.2, 0);

    const head = BABYLON.MeshBuilder.CreateSphere(
        "rlglSignalHead",
        {
            diameter: 2.8,
            segments: 24
        },
        scene
    );

    head.parent = headPivot;
    head.isPickable = false;
    head.checkCollisions = false;

    const headMaterial = makeMaterial(
        scene,
        "rlglSignalHeadMaterial",
        new BABYLON.Color3(0.78, 0.63, 0.52)
    );

    head.material = headMaterial;

    const leftEye = BABYLON.MeshBuilder.CreateSphere(
        "rlglSignalLeftEye",
        {
            diameter: 0.38,
            segments: 16
        },
        scene
    );

    leftEye.parent = headPivot;
    leftEye.position = new BABYLON.Vector3(-0.48, 0.15, -1.28);
    leftEye.isPickable = false;

    const rightEye = BABYLON.MeshBuilder.CreateSphere(
        "rlglSignalRightEye",
        {
            diameter: 0.38,
            segments: 16
        },
        scene
    );

    rightEye.parent = headPivot;
    rightEye.position = new BABYLON.Vector3(0.48, 0.15, -1.28);
    rightEye.isPickable = false;

    const eyeMaterial = makeMaterial(
        scene,
        "rlglSignalEyeMaterial",
        BABYLON.Color3.Black()
    );

    eyeMaterial.disableLighting = true;
    leftEye.material = eyeMaterial;
    rightEye.material = eyeMaterial;

    const countdownDisplay =
        createSevenSegmentDisplay(
            scene,
            root
        );


    const instructionGreen =
        BABYLON.MeshBuilder
            .CreateSphere(
                "rlglInstructionGreen",
                {
                    diameter: 1.2
                },
                scene
            );

    instructionGreen.parent = root;

    instructionGreen.position =
        new BABYLON.Vector3(
            -6,
            5,
            -1
        );

    instructionGreen.material =
        greenMaterial;

    instructionGreen.isPickable =
        false;


    const instructionRed =
        BABYLON.MeshBuilder
            .CreateSphere(
                "rlglInstructionRed",
                {
                    diameter: 1.2
                },
                scene
            );

    instructionRed.parent = root;

    instructionRed.position =
        new BABYLON.Vector3(
            -6,
            3,
            -1
        );

    instructionRed.material =
        redMaterial;

    instructionRed.isPickable =
        false;

    // These were the two small helper lights beside the traffic lamp.
    // The main red/green traffic bulbs remain.
    instructionGreen.dispose();
    instructionRed.dispose();

    // ------------------------------------------------------------
    // STATE
    // ------------------------------------------------------------
    const RED_ON = new BABYLON.Color3(1, 0.015, 0.015);
    const RED_OFF = new BABYLON.Color3(0.08, 0.002, 0.002);

    const GREEN_ON = new BABYLON.Color3(0.02, 1, 0.08);
    const GREEN_OFF = new BABYLON.Color3(0.002, 0.08, 0.008);

    const IDLE_EYE = new BABYLON.Color3(0.18, 0.18, 0.2);

    function animateHead(targetY) {
        scene.stopAnimation(headPivot);

        BABYLON.Animation.CreateAndStartAnimation(
            "rlglSignalHeadTurn",
            headPivot,
            "rotation.y",
            30,
            18,
            headPivot.rotation.y,
            targetY,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );
    }

    function setIdle() {
        countdownDisplay.hide();

        redMaterial.emissiveColor.copyFrom(RED_OFF);
        redMaterial.diffuseColor.copyFrom(RED_OFF);

        greenMaterial.emissiveColor.copyFrom(GREEN_OFF);
        greenMaterial.diffuseColor.copyFrom(GREEN_OFF);

        redPointLight.intensity = 0;
        greenPointLight.intensity = 0;

        eyeMaterial.emissiveColor.copyFrom(IDLE_EYE);

        animateHead(0);
    }

    function setWaiting() {
        countdownDisplay.hide();

        redMaterial.emissiveColor.copyFrom(
            RED_OFF
        );

        greenMaterial.emissiveColor.copyFrom(
            GREEN_OFF
        );

        redPointLight.intensity = 0;
        greenPointLight.intensity = 0;

        // Yellow/amber eyes = waiting.
        eyeMaterial.emissiveColor =
            new BABYLON.Color3(
                1,
                0.55,
                0.02
            );

        animateHead(0);
    }

    function setCountdown(count) {
        const safeCount =
            Math.max(
                0,
                Math.ceil(
                    Number(count) || 0
                )
            );

        // Big physical two-digit countdown mesh.
        countdownDisplay.setNumber(
            safeCount
        );

        redMaterial.diffuseColor.copyFrom(
            RED_OFF
        );

        greenMaterial.diffuseColor.copyFrom(
            GREEN_OFF
        );

        // Amber-ish blinking warning.
        const blink =
            safeCount % 2 === 1;

        redMaterial.emissiveColor.copyFrom(
            blink
                ? new BABYLON.Color3(
                    0.35,
                    0.08,
                    0
                )
                : RED_OFF
        );

        greenMaterial.emissiveColor.copyFrom(
            blink
                ? new BABYLON.Color3(
                    0.25,
                    0.18,
                    0
                )
                : GREEN_OFF
        );

        redPointLight.intensity =
            blink ? 0.6 : 0;

        greenPointLight.intensity =
            blink ? 0.6 : 0;
    }

    function setGreenLight() {
        countdownDisplay.hide();
        redMaterial.emissiveColor.copyFrom(RED_OFF);
        redMaterial.diffuseColor.copyFrom(RED_OFF);

        greenMaterial.emissiveColor.copyFrom(GREEN_ON);
        greenMaterial.diffuseColor.copyFrom(GREEN_ON.scale(0.65));

        redPointLight.intensity = 0;
        greenPointLight.intensity = 6;

        eyeMaterial.emissiveColor.copyFrom(GREEN_ON);

        // During green, doll looks away from the players.
        animateHead(Math.PI);
    }

    function setRedLight() {
        countdownDisplay.hide();
        redMaterial.emissiveColor.copyFrom(RED_ON);
        redMaterial.diffuseColor.copyFrom(RED_ON.scale(0.65));

        greenMaterial.emissiveColor.copyFrom(GREEN_OFF);
        greenMaterial.diffuseColor.copyFrom(GREEN_OFF);

        redPointLight.intensity = 7;
        greenPointLight.intensity = 0;

        eyeMaterial.emissiveColor.copyFrom(RED_ON);

        // During red, doll turns toward players.
        animateHead(0);
    }

    function setFinished() {
        countdownDisplay.hide();
        setIdle();
    }

    setIdle();

    return {
        root,
        redLamp,
        greenLamp,
        setIdle,
        setWaiting,
        setCountdown,
        setGreenLight,
        setRedLight,
        setFinished,

        dispose() {
            redPointLight.dispose();
            greenPointLight.dispose();

            headPivot.dispose();
            root.dispose();

            redMaterial.dispose();
            greenMaterial.dispose();
            poleMaterial.dispose();
            housingMaterial.dispose();
            backplateMaterial.dispose();
            headMaterial.dispose();
            eyeMaterial.dispose();
        }
    };
}
