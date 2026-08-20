import * as BABYLON from "@babylonjs/core";
import * as GUI from "@babylonjs/gui";

export function createRlglSignal(scene) {
    const root = new BABYLON.TransformNode("rlglSignalRoot", scene);

    // Put it at the front of the RLGL field.
    // Adjust position if needed.
    root.position = new BABYLON.Vector3(500, 12, 544);
    root.rotation.y = Math.PI; // face players

    // -----------------------------------
    // SUPPORT / POLE
    // -----------------------------------
    const pole = BABYLON.MeshBuilder.CreateCylinder(
        "rlglSignalPole",
        { height: 8, diameter: 0.4 },
        scene
    );
    pole.parent = root;
    pole.position.y = -2;

    const poleMat = new BABYLON.StandardMaterial("rlglPoleMat", scene);
    poleMat.diffuseColor = new BABYLON.Color3(0.25, 0.25, 0.25);
    pole.material = poleMat;

    // -----------------------------------
    // SIGN BOARD
    // -----------------------------------
    const signBoard = BABYLON.MeshBuilder.CreatePlane(
        "rlglSignBoard",
        { width: 8, height: 3.2 },
        scene
    );
    signBoard.parent = root;
    signBoard.position.y = 2;
    signBoard.isPickable = false;

    const signMat = new BABYLON.StandardMaterial("rlglSignMat", scene);
    signMat.diffuseColor = new BABYLON.Color3(0.08, 0.08, 0.08);
    signMat.emissiveColor = new BABYLON.Color3(0.08, 0.08, 0.08);
    signBoard.material = signMat;

    const signTexture = GUI.AdvancedDynamicTexture.CreateForMesh(
        signBoard,
        1024,
        512,
        false
    );

    const bg = new GUI.Rectangle();
    bg.thickness = 8;
    bg.cornerRadius = 24;
    bg.color = "white";
    bg.background = "#111111";
    signTexture.addControl(bg);

    const titleText = new GUI.TextBlock();
    titleText.text = "WAITING";
    titleText.color = "white";
    titleText.fontSize = 120;
    titleText.fontStyle = "bold";
    titleText.top = "-20px";
    bg.addControl(titleText);

    const subText = new GUI.TextBlock();
    subText.text = "Join the game";
    subText.color = "#dddddd";
    subText.fontSize = 48;
    subText.top = "120px";
    bg.addControl(subText);

    // -----------------------------------
    // DOLL HEAD
    // -----------------------------------
    const headRoot = new BABYLON.TransformNode("rlglHeadRoot", scene);
    headRoot.parent = root;
    headRoot.position.y = 5;

    const head = BABYLON.MeshBuilder.CreateSphere(
        "rlglDollHead",
        { diameter: 1.8 },
        scene
    );
    head.parent = headRoot;

    const headMat = new BABYLON.StandardMaterial("rlglHeadMat", scene);
    headMat.diffuseColor = new BABYLON.Color3(0.95, 0.85, 0.75);
    head.material = headMat;

    // Eyes
    const leftEye = BABYLON.MeshBuilder.CreateSphere(
        "rlglLeftEye",
        { diameter: 0.22 },
        scene
    );
    leftEye.parent = headRoot;
    leftEye.position = new BABYLON.Vector3(-0.32, 0.12, -0.82);

    const rightEye = BABYLON.MeshBuilder.CreateSphere(
        "rlglRightEye",
        { diameter: 0.22 },
        scene
    );
    rightEye.parent = headRoot;
    rightEye.position = new BABYLON.Vector3(0.32, 0.12, -0.82);

    const eyeMat = new BABYLON.StandardMaterial("rlglEyeMat", scene);
    eyeMat.disableLighting = true;
    eyeMat.emissiveColor = new BABYLON.Color3(0.15, 0.15, 0.15);
    eyeMat.diffuseColor = new BABYLON.Color3(0.05, 0.05, 0.05);

    leftEye.material = eyeMat;
    rightEye.material = eyeMat;

    const eyeLight = new BABYLON.PointLight(
        "rlglEyeLight",
        root.position.add(new BABYLON.Vector3(0, 5, -1)),
        scene
    );
    eyeLight.intensity = 0;
    eyeLight.range = 18;

    function animateHeadFacingPlayers(facePlayers) {
        const targetY = facePlayers ? Math.PI : 0;

        BABYLON.Animation.CreateAndStartAnimation(
            "rlglHeadTurn",
            headRoot,
            "rotation.y",
            30,
            18,
            headRoot.rotation.y,
            targetY,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );
    }

    function setVisuals({
        title,
        subtitle,
        bgColor,
        borderColor,
        emissiveColor,
        eyeColor,
        eyeIntensity,
        facePlayers
    }) {
        titleText.text = title;
        subText.text = subtitle;

        bg.background = bgColor;
        bg.color = borderColor;

        signMat.emissiveColor = emissiveColor;

        eyeMat.emissiveColor = eyeColor;
        eyeLight.diffuse = eyeColor;
        eyeLight.intensity = eyeIntensity;

        animateHeadFacingPlayers(facePlayers);
    }

    function setWaiting() {
        setVisuals({
            title: "WAITING",
            subtitle: "Get ready",
            bgColor: "#1f2937",
            borderColor: "white",
            emissiveColor: new BABYLON.Color3(0.12, 0.12, 0.18),
            eyeColor: new BABYLON.Color3(0.2, 0.2, 0.25),
            eyeIntensity: 0.8,
            facePlayers: false
        });
    }

    function setCountdown(count) {
        setVisuals({
            title: String(count),
            subtitle: "Round starting",
            bgColor: "#7c5a00",
            borderColor: "#fff2b3",
            emissiveColor: new BABYLON.Color3(0.25, 0.18, 0.03),
            eyeColor: new BABYLON.Color3(0.9, 0.7, 0.1),
            eyeIntensity: 2.5,
            facePlayers: false
        });
    }

    function setGreenLight() {
        setVisuals({
            title: "GREEN LIGHT",
            subtitle: "RUN!",
            bgColor: "#0f5f2d",
            borderColor: "#d8ffe6",
            emissiveColor: new BABYLON.Color3(0.0, 0.45, 0.15),
            eyeColor: new BABYLON.Color3(0.1, 1.0, 0.25),
            eyeIntensity: 3.5,
            facePlayers: false
        });
    }

    function setRedLight() {
        setVisuals({
            title: "RED LIGHT",
            subtitle: "STOP!",
            bgColor: "#7a1414",
            borderColor: "#ffd6d6",
            emissiveColor: new BABYLON.Color3(0.45, 0.03, 0.03),
            eyeColor: new BABYLON.Color3(1.0, 0.1, 0.1),
            eyeIntensity: 4,
            facePlayers: true
        });
    }

    function setFinished() {
        setVisuals({
            title: "ROUND OVER",
            subtitle: "Wait for next round",
            bgColor: "#2c2c2c",
            borderColor: "#eeeeee",
            emissiveColor: new BABYLON.Color3(0.18, 0.18, 0.18),
            eyeColor: new BABYLON.Color3(0.3, 0.3, 0.3),
            eyeIntensity: 1,
            facePlayers: true
        });
    }

    setWaiting();

    return {
        root,
        setWaiting,
        setCountdown,
        setGreenLight,
        setRedLight,
        setFinished,
        dispose() {
            eyeLight.dispose();
            signTexture.dispose();
            signBoard.dispose();
            pole.dispose();
            leftEye.dispose();
            rightEye.dispose();
            head.dispose();
            headMat.dispose();
            eyeMat.dispose();
            signMat.dispose();
            poleMat.dispose();
            headRoot.dispose();
            root.dispose();
        }
    };
}