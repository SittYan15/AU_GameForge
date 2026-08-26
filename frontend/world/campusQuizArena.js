// frontend/world/campusQuizArena.js

import * as BABYLON from "@babylonjs/core";
import { markNonGround, markWalkableGround } from "../grounding.js";

const ARENA = Object.freeze({
    x: 165.56,
    y: -0.30,
    z: -48.58
});

const FLOOR_IDS = ["A", "B", "C", "D"];
// campus-quiz-orientation-fix-v2.2
// Player approaches from +Z and looks toward the wall at -Z.
// Reverse X placement so the visible order is A, B, C, D from left to right.
const FLOOR_X_OFFSETS = [18, 6, -6, -18];
const FLOOR_SIZE = 11;
const FALL_DISTANCE = 18;

function wrapLines(context, text, maxWidth, maxLines = 4) {
    const words = String(text || "").split(/\s+/).filter(Boolean);
    const lines = [];
    let current = "";

    for (const word of words) {
        const candidate = current ? `${current} ${word}` : word;

        if (context.measureText(candidate).width <= maxWidth) {
            current = candidate;
            continue;
        }

        if (current) lines.push(current);
        current = word;

        if (lines.length >= maxLines - 1) break;
    }

    if (current && lines.length < maxLines) lines.push(current);

    if (words.length && lines.length === maxLines) {
        const used = lines.join(" ").split(/\s+/).length;
        if (used < words.length) {
            let last = lines[lines.length - 1];
            while (last.length > 3 && context.measureText(`${last}…`).width > maxWidth) {
                last = last.slice(0, -1);
            }
            lines[lines.length - 1] = `${last}…`;
        }
    }

    return lines;
}

function drawCenteredLines(context, lines, centerX, startY, lineHeight) {
    lines.forEach((line, index) => {
        context.fillText(line, centerX, startY + index * lineHeight);
    });
}

function animateFloor(scene, root, fromY, toY, durationMs) {
    const start = performance.now();

    const observer = scene.onBeforeRenderObservable.add(() => {
        const t = Math.min(1, (performance.now() - start) / durationMs);
        const eased = t * t * (3 - 2 * t);
        root.position.y = BABYLON.Scalar.Lerp(fromY, toY, eased);

        if (t >= 1) {
            scene.onBeforeRenderObservable.remove(observer);
        }
    });
}

export function createCampusQuizArena(scene) {
    const root = new BABYLON.TransformNode("campusQuizArenaRoot", scene);
    markNonGround(root, "quiz-arena-root");

    const darkMaterial = new BABYLON.StandardMaterial("campusQuizArenaDark", scene);
    darkMaterial.diffuseColor = new BABYLON.Color3(0.055, 0.065, 0.085);
    darkMaterial.emissiveColor = new BABYLON.Color3(0.01, 0.012, 0.02);

    const safeMaterial = new BABYLON.StandardMaterial("campusQuizSafeMaterial", scene);
    safeMaterial.diffuseColor = new BABYLON.Color3(0.10, 0.16, 0.22);
    safeMaterial.emissiveColor = new BABYLON.Color3(0.025, 0.05, 0.08);

    const safePlatform = BABYLON.MeshBuilder.CreateBox(
        "campus_quiz_safe_platform",
        {
            width: 54,
            height: 0.6,
            depth: 9
        },
        scene
    );
    safePlatform.position.copyFromFloats(ARENA.x, ARENA.y, ARENA.z + 16);
    safePlatform.material = safeMaterial;
    safePlatform.checkCollisions = true;
    safePlatform.isPickable = true;
    markWalkableGround(safePlatform);

    const backWall = BABYLON.MeshBuilder.CreateBox(
        "campus_quiz_question_wall",
        {
            width: 54,
            height: 15,
            depth: 0.8
        },
        scene
    );
    backWall.position.copyFromFloats(ARENA.x, ARENA.y + 7.2, ARENA.z - 10.5);
    backWall.material = darkMaterial;
    backWall.checkCollisions = true;
    backWall.isPickable = true;
    markNonGround(backWall, "quiz-wall");

    const screenTexture = new BABYLON.DynamicTexture(
        "campusQuizQuestionScreenTexture",
        { width: 2048, height: 768 },
        scene,
        false
    );
    screenTexture.hasAlpha = false;
    screenTexture.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
    screenTexture.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;

    const screenMaterial = new BABYLON.StandardMaterial("campusQuizQuestionScreenMaterial", scene);
    screenMaterial.diffuseTexture = screenTexture;
    screenMaterial.emissiveTexture = screenTexture;
    screenMaterial.diffuseColor = BABYLON.Color3.White();
    screenMaterial.emissiveColor = BABYLON.Color3.White();
    screenMaterial.specularColor = BABYLON.Color3.Black();
    screenMaterial.disableLighting = true;

    // campus-quiz-screen-fix-v2.1
    // The quiz board must be visible from either side. Depending on imported
    // world transforms/camera approach direction, a single-sided Babylon plane
    // can otherwise disappear because of back-face culling.
    screenMaterial.backFaceCulling = false;

    // v2.5: this is a real world-space screen, not a HUD overlay.
    // Keep normal depth testing/writing enabled so buildings and walls
    // correctly hide it when they are between the camera and the screen.
    screenMaterial.disableDepthWrite = false;
    screenMaterial.needDepthPrePass = true;

    const screen = BABYLON.MeshBuilder.CreatePlane(
        "campus_quiz_question_screen",
        {
            width: 51.5,
            height: 12.5,
            sideOrientation: BABYLON.Mesh.DOUBLESIDE
        },
        scene
    );

    // Pull the display slightly forward from the physical wall to eliminate
    // z-fighting with the wall surface.
    screen.position.copyFromFloats(ARENA.x, ARENA.y + 7.3, ARENA.z - 9.88);

    // campus-quiz-mirror-rotation-fix-v2.3
    // Face the FRONT of the screen toward players standing on the answer side.
    // This removes the mirrored wall text while keeping the screen double-sided.
    screen.rotation.y = Math.PI;

    screen.material = screenMaterial;
    screen.isPickable = false;
    screen.checkCollisions = false;
    screen.visibility = 1;
    screen.setEnabled(true);
    screen.alwaysSelectAsActiveMesh = true;
    // v2.5: use the same rendering group as the campus geometry.
    // Group 2 caused the board to render over/through other buildings.
    screen.renderingGroupId = 0;
    markNonGround(screen, "quiz-screen");

    const floorPalette = [
        new BABYLON.Color3(0.10, 0.42, 0.85),
        new BABYLON.Color3(0.10, 0.66, 0.38),
        new BABYLON.Color3(0.90, 0.50, 0.10),
        new BABYLON.Color3(0.55, 0.24, 0.85)
    ];

    const floors = new Map();

    FLOOR_IDS.forEach((id, index) => {
        const floorRoot = new BABYLON.TransformNode(`campusQuizFloorRoot_${id}`, scene);
        floorRoot.position.copyFromFloats(
            ARENA.x + FLOOR_X_OFFSETS[index],
            ARENA.y,
            ARENA.z
        );

        // Rotate the entire answer floor, including its A/B/C/D label and
        // option text, 180 degrees without changing the floor's world position.
        floorRoot.rotation.y = Math.PI;

        const material = new BABYLON.StandardMaterial(`campusQuizFloorMaterial_${id}`, scene);
        material.diffuseColor = floorPalette[index];
        material.emissiveColor = floorPalette[index].scale(0.18);

        const platform = BABYLON.MeshBuilder.CreateBox(
            `campus_quiz_floor_${id}`,
            {
                width: FLOOR_SIZE,
                height: 0.6,
                depth: FLOOR_SIZE
            },
            scene
        );
        platform.parent = floorRoot;
        platform.material = material;
        platform.checkCollisions = true;
        platform.isPickable = true;
        markWalkableGround(platform);

        const labelTexture = new BABYLON.DynamicTexture(
            `campusQuizFloorLabelTexture_${id}`,
            { width: 1024, height: 1024 },
            scene,
            false
        );
        labelTexture.hasAlpha = false;

        const labelMaterial = new BABYLON.StandardMaterial(`campusQuizFloorLabelMaterial_${id}`, scene);
        labelMaterial.diffuseTexture = labelTexture;
        labelMaterial.emissiveTexture = labelTexture;
        labelMaterial.disableLighting = true;

        const label = BABYLON.MeshBuilder.CreateGround(
            `campus_quiz_floor_label_${id}`,
            {
                width: FLOOR_SIZE - 0.4,
                height: FLOOR_SIZE - 0.4
            },
            scene
        );
        label.parent = floorRoot;
        label.position.y = 0.31;
        label.material = labelMaterial;
        label.checkCollisions = false;
        label.isPickable = false;
        markNonGround(label, "quiz-answer-label");

        floors.set(id, {
            id,
            root: floorRoot,
            platform,
            material,
            labelTexture,
            labelMaterial,
            label,
            baseColor: floorPalette[index],
            optionText: ""
        });
    });

    const sideWallMaterial = new BABYLON.StandardMaterial("campusQuizSideWallMaterial", scene);
    sideWallMaterial.diffuseColor = new BABYLON.Color3(0.10, 0.12, 0.17);
    sideWallMaterial.alpha = 0.55;

    [-27.5, 27.5].forEach((offset, index) => {
        const wall = BABYLON.MeshBuilder.CreateBox(
            `campus_quiz_side_wall_${index}`,
            {
                width: 0.8,
                height: 5,
                depth: 39
            },
            scene
        );
        wall.position.copyFromFloats(ARENA.x + offset, ARENA.y + 2.2, ARENA.z + 5);
        wall.material = sideWallMaterial;
        wall.checkCollisions = true;
        markNonGround(wall, "quiz-boundary");
    });

    let currentQuestion = null;
    let timerObserver = null;
    let lastTimerTenth = null;
    let playerStatus = [];
    let leaderboardRows = [];

    function drawQuestionOptionBox(
        context,
        option,
        x,
        y,
        width,
        height,
        color
    ) {
        const floorId =
            String(option?.floorId || "?");

        const answerText =
            String(option?.text || "");

        context.fillStyle =
            "rgba(16, 22, 34, 0.97)";

        context.fillRect(
            x,
            y,
            width,
            height
        );

        context.strokeStyle =
            color;

        context.lineWidth =
            6;

        context.strokeRect(
            x,
            y,
            width,
            height
        );

        // Top color band and option letter.
        context.fillStyle =
            color;

        context.fillRect(
            x,
            y,
            width,
            54
        );

        context.textAlign =
            "center";

        context.textBaseline =
            "middle";

        context.fillStyle =
            "#ffffff";

        context.font =
            "bold 34px Arial";

        context.fillText(
            floorId,
            x + width / 2,
            y + 27
        );

        // Answer text inside the column card.
        context.fillStyle =
            "#ffffff";

        context.font =
            "bold 27px Arial";

        const lines =
            wrapLines(
                context,
                answerText,
                width - 34,
                4
            );

        const lineHeight =
            31;

        const totalHeight =
            Math.max(
                lineHeight,
                lines.length * lineHeight
            );

        const firstY =
            y + 88 +
            (height - 102) / 2 -
            totalHeight / 2 +
            lineHeight / 2;

        lines.forEach(
            (line, index) => {
                context.fillText(
                    line,
                    x + width / 2,
                    firstY +
                        index * lineHeight
                );
            }
        );
    }

    function drawScreen(mode, extra = {}) {
        const context = screenTexture.getContext();
        context.save();
        context.fillStyle = "#0b101a";
        context.fillRect(0, 0, 2048, 768);

        context.textAlign = "left";
        context.textBaseline = "middle";
        context.fillStyle = "#b79cff";
        context.font = "bold 56px Arial";
        context.fillText("CAMPUS QUIZ SURVIVAL", 90, 72);

        if (mode === "waiting") {
            context.textAlign = "center";
            context.fillStyle = "#ffffff";
            context.font = "bold 92px Arial";
            context.fillText(`NEXT ROUND IN ${extra.count ?? "..."}`, 1024, 265);
            context.font = "bold 46px Arial";
            context.fillStyle = "#d6dded";
            context.fillText("3 lives • Stand on the correct answer floor • Wrong floors will fall", 1024, 390);
        } else if (mode === "question" && currentQuestion) {
            const remainingMs =
                Math.max(
                    0,
                    (currentQuestion.deadline ?? Date.now()) -
                        Date.now()
                );

            context.textAlign =
                "right";

            context.fillStyle =
                remainingMs <= 3000
                    ? "#ff6b6b"
                    : "#ffd166";

            context.font =
                "bold 72px Arial";

            context.fillText(
                ((remainingMs / 1000).toFixed(1)) + "s",
                1950,
                82
            );

            context.textAlign =
                "left";

            context.fillStyle =
                "#93a4c3";

            context.font =
                "bold 34px Arial";

            context.fillText(
                (currentQuestion.category || "Campus") +
                    "  •  Question " +
                    currentQuestion.questionNumber +
                    "/" +
                    currentQuestion.totalQuestions,
                90,
                145
            );

            context.fillStyle =
                "#ffffff";

            context.font =
                "bold 56px Arial";

            context.textAlign =
                "center";

            const questionLines =
                wrapLines(
                    context,
                    currentQuestion.question,
                    1810,
                    3
                );

            drawCenteredLines(
                context,
                questionLines,
                1024,
                220,
                64
            );

            const optionColors = {
                A: "#2f7fe8",
                B: "#2cb869",
                C: "#ef7b21",
                D: "#8b48e8"
            };

            const optionsByFloor =
                new Map(
                    (currentQuestion.options || [])
                        .map(
                            (option) => [
                                option.floorId,
                                option
                            ]
                        )
                );

            // v2.7.2:
            // Show A/B/C/D as four vertical columns in one single row.
            const boxWidth =
                430;

            const boxHeight =
                218;

            const gap =
                28;

            const totalWidth =
                boxWidth * 4 +
                gap * 3;

            const startX =
                Math.round(
                    (2048 - totalWidth) / 2
                );

            const boxY =
                430;

            ["A", "B", "C", "D"].forEach(
                (floorId, index) => {
                    drawQuestionOptionBox(
                        context,
                        optionsByFloor.get(floorId),
                        startX + index * (boxWidth + gap),
                        boxY,
                        boxWidth,
                        boxHeight,
                        optionColors[floorId]
                    );
                }
            );

            context.textAlign =
                "center";

            context.fillStyle =
                "#ffd166";

            context.font =
                "bold 28px Arial";

            context.fillText(
                "READ THE WALL • RUN TO THE MATCHING A, B, C OR D FLOOR",
                1024,
                700
            );
        } else if (mode === "reveal") {
            context.textAlign = "center";
            context.fillStyle = "#7ee787";
            context.font = "bold 100px Arial";
            context.fillText(`CORRECT FLOOR: ${extra.correctFloorId ?? "?"}`, 1024, 260);
            context.fillStyle = "#ffffff";
            context.font = "bold 44px Arial";
            const lines = wrapLines(context, extra.explanation || "", 1780, 4);
            drawCenteredLines(context, lines, 1024, 390, 60);
        } else if (mode === "finished") {
            context.textAlign = "center";
            context.fillStyle = "#ffd166";
            context.font = "bold 105px Arial";
            context.fillText("ROUND OVER", 1024, 245);
            context.fillStyle = "#ffffff";
            context.font = "bold 48px Arial";
            context.fillText("Survivors earn campus points • New round starts soon", 1024, 385);
        } else {
            context.textAlign = "center";
            context.fillStyle = "#ffffff";
            context.font = "bold 86px Arial";
            context.fillText("ENTER THE PURPLE PORTAL TO PLAY", 1024, 285);
            context.fillStyle = "#d6dded";
            context.font = "bold 44px Arial";
            context.fillText("Read the answers on the wall, then stand on A, B, C or D", 1024, 410);
        }

        // Current-round survival status at the bottom-left.
        if (playerStatus.length > 0 && mode !== "question") {
            context.textAlign = "left";
            context.font = "bold 28px Arial";
            context.fillStyle = "#93a4c3";
            const summary = playerStatus
                .filter((player) => player.participating)
                .slice(0, 6)
                .map((player) => `${player.playerName}: ${"♥".repeat(Math.max(0, player.lives))}`)
                .join("   ");
            context.fillText(summary, 90, 720);
        }

        context.restore();
        screenTexture.update(true);

        // Keep the physical question display active even when Babylon's
        // frustum/active-mesh optimization changes around the arena.
        screen.setEnabled(true);
        screen.visibility = 1;
    }

    function drawFloorLabel(
        floor,
        optionText = "",
        state = "normal"
    ) {
        const context =
            floor.labelTexture.getContext();

        const base =
            floor.baseColor;

        const rgb = {
            r: Math.round(base.r * 255),
            g: Math.round(base.g * 255),
            b: Math.round(base.b * 255)
        };

        context.save();

        context.fillStyle =
            state === "wrong"
                ? "#55151a"
                : state === "correct"
                    ? "#123f24"
                    : `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;

        context.fillRect(
            0,
            0,
            1024,
            1024
        );

        // v2.7.1:
        // The floor is only the physical answer TARGET.
        // Full answer text is displayed on the giant question screen.
        context.textAlign =
            "center";

        context.textBaseline =
            "middle";

        context.fillStyle =
            "#ffffff";

        context.font =
            "bold 420px Arial";

        context.fillText(
            floor.id,
            512,
            455
        );

        context.font =
            "bold 68px Arial";

        context.fillStyle =
            "rgba(255,255,255,0.90)";

        context.fillText(
            "STAND HERE",
            512,
            790
        );

        context.restore();

        floor.labelTexture.update(true);
    }

    function stopTimerObserver() {
        if (timerObserver) {
            scene.onBeforeRenderObservable.remove(timerObserver);
            timerObserver = null;
        }
        lastTimerTenth = null;
    }

    function resetFloors() {
        for (const floor of floors.values()) {
            floor.root.position.y = ARENA.y;
            floor.platform.checkCollisions = true;
            floor.platform.setEnabled(true);
            floor.label.setEnabled(true);
            drawFloorLabel(floor, floor.optionText, "normal");
        }
    }

    function setQuestion(data = {}) {
        stopTimerObserver();
        resetFloors();
        currentQuestion = data;

        const optionsByFloor = new Map(
            (data.options || []).map((option) => [option.floorId, option.text])
        );

        for (const floor of floors.values()) {
            floor.optionText = optionsByFloor.get(floor.id) || "";
            drawFloorLabel(floor, floor.optionText, "normal");
        }

        drawScreen("question");

        timerObserver = scene.onBeforeRenderObservable.add(() => {
            const remaining = Math.max(0, (currentQuestion?.deadline ?? Date.now()) - Date.now());
            const tenth = Math.ceil(remaining / 100);

            if (tenth !== lastTimerTenth) {
                drawScreen("question");
                lastTimerTenth = tenth;
            }
        });
    }

    function reveal(data = {}) {
        stopTimerObserver();

        for (const floor of floors.values()) {
            if (floor.id === data.correctFloorId) {
                drawFloorLabel(floor, floor.optionText, "correct");
                continue;
            }

            drawFloorLabel(floor, floor.optionText, "wrong");
            floor.platform.checkCollisions = false;
            animateFloor(
                scene,
                floor.root,
                floor.root.position.y,
                ARENA.y - FALL_DISTANCE,
                750
            );
        }

        drawScreen("reveal", data);
    }

    function setWaiting(count) {
        stopTimerObserver();
        currentQuestion = null;
        resetFloors();
        drawScreen("waiting", { count });
    }

    function setFinished() {
        stopTimerObserver();
        currentQuestion = null;
        resetFloors();
        drawScreen("finished");
    }

    function setIdle() {
        stopTimerObserver();
        currentQuestion = null;
        resetFloors();
        drawScreen("idle");
    }

    function setPlayerStatus(rows = []) {
        playerStatus = Array.isArray(rows) ? rows : [];
    }

    function setLeaderboard(rows = []) {
        leaderboardRows = Array.isArray(rows) ? rows : [];
        // Kept for future side-board expansion. The authoritative leaderboard
        // still arrives from the server and is retained here.
        void leaderboardRows;
    }

    FLOOR_IDS.forEach((id) => drawFloorLabel(floors.get(id), "WAITING"));
    setIdle();

    return {
        root,
        setQuestion,
        reveal,
        setWaiting,
        setFinished,
        setIdle,
        resetFloors,
        setPlayerStatus,
        setLeaderboard,
        dispose() {
            stopTimerObserver();
            root.dispose(false, true);
            safePlatform.dispose(false, true);
            backWall.dispose(false, true);
            screen.dispose(false, true);
            screenTexture.dispose();
            screenMaterial.dispose();
            darkMaterial.dispose();
            safeMaterial.dispose();
            sideWallMaterial.dispose();

            for (const floor of floors.values()) {
                floor.labelTexture.dispose();
                floor.labelMaterial.dispose();
                floor.material.dispose();
                floor.root.dispose(false, true);
            }
        }
    };
}
