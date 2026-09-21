import * as BABYLON from "@babylonjs/core";
import {
    PROP_HUNT_ELEVATOR_HORIZONTAL_RADIUS,
    PROP_HUNT_ELEVATOR_VERTICAL_TOLERANCE,
    PROP_HUNT_ELEVATORS,
    PROP_HUNT_FLOOR_SURFACE_Y,
    PROP_HUNT_PLAYER_CENTER_OFFSET_Y,
    PROP_HUNT_PORTAL_POSITION,
    PROP_HUNT_PORTAL_TRIGGER_RADIUS,
    PROP_HUNT_PROP_ASSETS,
    PROP_HUNT_RESTRICTION_CORNERS,
    PROP_HUNT_RESTRICTION_BOUNDS
} from "./propHuntConfig.js";

const PROP_ASSET_ROOT = "/propHunt/props/";

const PROP_HUNT_AREAS = Object.freeze([
    Object.freeze({
        id: "VMES",
        minX: -249.75,
        maxX: -213.75,
        minY: -1.0,
        maxY: 46.5,
        minZ: 20.5,
        maxZ: 103.0
    }),
    Object.freeze({
        id: "VME",
        minX: -293.0,
        maxX: -257.0,
        minY: -1.0,
        maxY: 46.5,
        minZ: 20.5,
        maxZ: 103.0
    }),
    Object.freeze({
        id: "VME_MIDDLE",
        minX: -273.0,
        maxX: -232.0,
        minY: -1.0,
        maxY: 46.5,
        minZ: 48.0,
        maxZ: 130.0
    })
]);

// v1.5: the re-exported Prop Hunt meshes have been corrected in Blender and
// now share the same forward convention. Keep this explicit so any future
// asset set can be adjusted globally without touching networking logic.
const PROP_HUNT_VISUAL_YAW_OFFSET =
    0;

const PROP_HUNT_MAX_BULLETS =
    10;

function isFiniteVector(value) {
    return value && [value.x, value.y, value.z].every(Number.isFinite);
}

function wait(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function nextFrame() {
    return new Promise((resolve) => requestAnimationFrame(resolve));
}

function isMobileDevice() {
    return (
        navigator.maxTouchPoints > 0
        || window.matchMedia?.("(pointer: coarse)")?.matches === true
    );
}

function formatClock(ms) {
    const seconds = Math.max(0, Math.ceil(ms / 1000));
    const minutes = Math.floor(seconds / 60);
    const rest = String(seconds % 60).padStart(2, "0");
    return `${minutes}:${rest}`;
}

function horizontalDistance(a, b) {
    return Math.hypot(a.x - b.x, a.z - b.z);
}

function normalizeYaw(value) {
    if (!Number.isFinite(value)) {
        return 0;
    }

    const fullTurn =
        Math.PI * 2;

    let yaw =
        value %
        fullTurn;

    if (
        yaw >
        Math.PI
    ) {
        yaw -=
            fullTurn;
    }

    if (
        yaw <
        -Math.PI
    ) {
        yaw +=
            fullTurn;
    }

    return yaw;
}

function shortestYawDelta(from, to) {
    return normalizeYaw(
        to -
        from
    );
}

function yawDegrees(yaw) {
    const degrees =
        (
            yaw *
            180 /
            Math.PI
        ) %
        360;

    return Math.round(
        (
            degrees +
            360
        ) %
        360
    );
}

function floorCenterY(floorNumber) {
    const surface = PROP_HUNT_FLOOR_SURFACE_Y[floorNumber - 1];
    return Number.isFinite(surface)
        ? surface + PROP_HUNT_PLAYER_CENTER_OFFSET_Y
        : null;
}

function createStyles() {
    if (document.getElementById("propHuntStyles")) return;

    const style = document.createElement("style");
    style.id = "propHuntStyles";
    style.textContent = `
        #propHuntJoinPanel,
        #propHuntHud,
        #propHuntElevatorPanel,
        #propHuntReturnButton,
        #propHuntFireButton,
        #propHuntLoadingFade,
        #propHuntSeekerBlind,
        #propHuntPropHud,
        #propHuntCaughtOverlay {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        #propHuntJoinPanel {
            position: fixed;
            left: 50%;
            bottom: calc(28px + env(safe-area-inset-bottom));
            z-index: 1800;
            transform: translateX(-50%);
            min-width: 260px;
            max-width: calc(100vw - 28px);
            box-sizing: border-box;
            padding: 12px 14px;
            border: 1px solid rgba(255,255,255,.17);
            border-radius: 15px;
            background: rgba(14,16,21,.94);
            color: #fff;
            box-shadow: 0 14px 34px rgba(0,0,0,.42);
            backdrop-filter: blur(10px);
            text-align: center;
        }

        #propHuntJoinPanel[hidden],
        #propHuntHud[hidden],
        #propHuntElevatorPanel[hidden],
        #propHuntReturnButton[hidden],
        #propHuntFireButton[hidden],
        #propHuntLoadingFade[hidden],
        #propHuntSeekerBlind[hidden],
        #propHuntCrosshair[hidden],
        #propHuntAmmoHud[hidden],
        #propHuntPropHud[hidden],
        #propHuntCaughtOverlay[hidden] {
            display: none !important;
        }

        #propHuntJoinTitle {
            margin-bottom: 3px;
            font-size: 15px;
            font-weight: 900;
        }

        #propHuntJoinText {
            margin-bottom: 9px;
            color: #b9c0ca;
            font-size: 11px;
        }

        #propHuntJoinButton,
        #propHuntReturnButton,
        #propHuntFireButton,
        .prop-hunt-floor-button {
            border: 1px solid rgba(255,255,255,.18);
            border-radius: 999px;
            background: rgba(255,255,255,.09);
            color: #fff;
            font-weight: 900;
            cursor: pointer;
        }

        #propHuntJoinButton {
            min-height: 40px;
            padding: 0 18px;
            background: #8cf6c8;
            color: #07120e;
        }

        #propHuntJoinButton:disabled {
            cursor: wait;
            opacity: .68;
        }

        #propHuntHud {
            position: fixed;
            top: 14px;
            left: 50%;
            z-index: 1600;
            transform: translateX(-50%);
            min-width: 270px;
            max-width: min(520px, calc(100vw - 24px));
            box-sizing: border-box;
            padding: 10px 14px;
            border: 1px solid rgba(255,255,255,.12);
            border-radius: 14px;
            background: rgba(12,14,19,.82);
            color: #fff;
            backdrop-filter: blur(9px);
            box-shadow: 0 10px 30px rgba(0,0,0,.35);
            text-align: center;
            pointer-events: none;
        }

        #propHuntHudTitle {
            color: #8cf6c8;
            font-size: 13px;
            font-weight: 950;
            letter-spacing: .08em;
        }

        #propHuntHudPhase {
            margin-top: 2px;
            font-size: 22px;
            font-weight: 950;
            font-variant-numeric: tabular-nums;
        }

        #propHuntHudRole {
            margin-top: 3px;
            color: #d8dde5;
            font-size: 12px;
            font-weight: 800;
        }

        #propHuntHudStatus {
            margin-top: 2px;
            color: #aeb7c4;
            font-size: 11px;
            line-height: 1.35;
        }

        #propHuntTeamStats {
            margin-top: 6px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-height: 24px;
            padding: 0 11px;
            border: 1px solid rgba(140,246,200,.22);
            border-radius: 999px;
            background: rgba(140,246,200,.09);
            color: #8cf6c8;
            font-size: 10px;
            font-weight: 950;
            letter-spacing: .03em;
            font-variant-numeric: tabular-nums;
        }

        #propHuntCaughtOverlay {
            position: fixed;
            inset: 0;
            z-index: 5100;
            display: flex;
            align-items: center;
            justify-content: center;
            box-sizing: border-box;
            padding: 22px;
            background:
                radial-gradient(circle at center, rgba(128,220,255,.20), rgba(0,0,0,.72) 62%),
                rgba(4,7,12,.72);
            color: #fff;
            text-align: center;
            pointer-events: none;
            backdrop-filter: blur(5px);
            -webkit-backdrop-filter: blur(5px);
        }

        #propHuntCaughtCard {
            width: min(420px, calc(100vw - 34px));
            box-sizing: border-box;
            padding: 24px 20px;
            border: 1px solid rgba(180,235,255,.35);
            border-radius: 22px;
            background: rgba(8,13,21,.88);
            box-shadow: 0 20px 52px rgba(0,0,0,.48);
        }

        #propHuntCaughtTitle {
            color: #b8efff;
            font-size: clamp(30px, 7vw, 58px);
            font-weight: 1000;
            letter-spacing: .08em;
            text-shadow: 0 0 20px rgba(96,210,255,.55);
        }

        #propHuntCaughtText {
            margin-top: 9px;
            color: #e9f8ff;
            font-size: 13px;
            font-weight: 850;
            line-height: 1.45;
        }

        #propHuntReturnButton {
            position: fixed;
            left: 50%;
            bottom: calc(16px + env(safe-area-inset-bottom));
            z-index: 1800;
            transform: translateX(-50%);
            min-height: 40px;
            padding: 0 18px;
            background: rgba(15,17,22,.92);
        }

        #propHuntElevatorPanel {
            position: fixed;
            top: 50%;
            right: 16px;
            z-index: 1750;
            transform: translateY(-50%);
            width: 250px;
            box-sizing: border-box;
            padding: 12px;
            border: 1px solid rgba(255,255,255,.14);
            border-radius: 14px;
            background: rgba(13,15,20,.94);
            color: #fff;
            box-shadow: 0 14px 34px rgba(0,0,0,.38);
            backdrop-filter: blur(10px);
        }

        #propHuntElevatorTitle {
            margin-bottom: 8px;
            font-size: 13px;
            font-weight: 900;
        }

        #propHuntElevatorFloors {
            display: grid;
            grid-template-columns: repeat(4, minmax(0,1fr));
            gap: 6px;
        }

        .prop-hunt-floor-button {
            min-height: 38px;
            border-radius: 9px;
        }

        .prop-hunt-floor-button:disabled {
            cursor: default;
            color: #8cf6c8;
            background: rgba(140,246,200,.14);
        }

        #propHuntFireButton {
            position: fixed;
            right: max(18px, env(safe-area-inset-right));
            bottom: calc(98px + env(safe-area-inset-bottom));
            z-index: 1850;
            width: 78px;
            height: 78px;
            border-radius: 50%;
            background: rgba(190,45,45,.88);
            font-size: 13px;
            box-shadow: 0 8px 24px rgba(0,0,0,.38);
            touch-action: manipulation;
        }

        #propHuntCrosshair {
            position: fixed;
            top: 50%;
            left: 50%;
            z-index: 1700;
            width: 20px;
            height: 20px;
            transform: translate(-50%,-50%);
            pointer-events: none;
        }

        #propHuntCrosshair::before,
        #propHuntCrosshair::after {
            content: "";
            position: absolute;
            background: rgba(255,255,255,.95);
            box-shadow: 0 0 2px #000, 0 0 4px #000;
        }

        #propHuntCrosshair::before {
            width: 2px;
            height: 20px;
            left: 9px;
            top: 0;
        }

        #propHuntCrosshair::after {
            width: 20px;
            height: 2px;
            left: 0;
            top: 9px;
        }

        #propHuntAmmoHud {
            position: fixed;
            top: calc(50% + 28px);
            left: 50%;
            z-index: 1710;
            transform: translateX(-50%);
            min-width: 92px;
            padding: 6px 11px;
            border: 1px solid rgba(255,255,255,.14);
            border-radius: 999px;
            background: rgba(10,12,16,.74);
            color: #fff;
            font-size: 11px;
            font-weight: 950;
            letter-spacing: .06em;
            text-align: center;
            pointer-events: none;
            box-shadow: 0 4px 14px rgba(0,0,0,.28);
            font-variant-numeric: tabular-nums;
        }

        #propHuntAmmoHud.empty {
            border-color: rgba(255,95,95,.40);
            color: #ff8f8f;
        }

        #propHuntLoadingFade,
        #propHuntSeekerBlind {
            position: fixed;
            inset: 0;
            z-index: 5000;
            display: flex;
            align-items: center;
            justify-content: center;
            box-sizing: border-box;
            padding: 20px;
            background: #000;
            color: #fff;
            text-align: center;
        }

        #propHuntLoadingFade {
            opacity: 0;
            pointer-events: none;
            transition: opacity 180ms ease;
        }

        #propHuntLoadingFade.active {
            opacity: 1;
            pointer-events: auto;
        }

        #propHuntLoadingText {
            font-size: 15px;
            font-weight: 850;
        }

        #propHuntSeekerBlind {
            z-index: 4900;
            flex-direction: column;
        }

        #propHuntSeekerBlindTitle {
            font-size: clamp(28px, 6vw, 54px);
            font-weight: 950;
        }

        #propHuntSeekerBlindTimer {
            margin-top: 10px;
            color: #8cf6c8;
            font-size: clamp(24px, 5vw, 44px);
            font-weight: 950;
        }

        #propHuntSeekerBlindText {
            margin-top: 10px;
            color: #aeb7c4;
            font-size: 13px;
        }

        #propHuntPropHud {
            position: fixed;
            right: 16px;
            bottom: calc(78px + env(safe-area-inset-bottom));
            z-index: 1760;
            width: 220px;
            box-sizing: border-box;
            padding: 11px 12px;
            border: 1px solid rgba(255,255,255,.13);
            border-radius: 14px;
            background: rgba(12,14,19,.86);
            color: #fff;
            box-shadow: 0 10px 28px rgba(0,0,0,.32);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            text-align: center;
        }

        #propHuntPropHudTitle {
            color: #8cf6c8;
            font-size: 11px;
            font-weight: 950;
            letter-spacing: .07em;
        }

        #propHuntPropPreviewCanvas {
            display: block;
            width: 84px;
            height: 84px;
            margin: 2px auto 0;
            border-radius: 10px;
            background:
                radial-gradient(
                    circle,
                    rgba(255,255,255,.08),
                    rgba(255,255,255,.015) 68%,
                    transparent 72%
                );
            pointer-events: none;
        }

        #propHuntPropFacingValue {
            color: #cbd3dd;
            font-size: 11px;
            font-weight: 800;
            font-variant-numeric: tabular-nums;
        }

        #propHuntPropLockState {
            margin-top: 5px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-height: 24px;
            padding: 0 10px;
            border-radius: 999px;
            background: rgba(140,246,200,.10);
            color: #8cf6c8;
            font-size: 10px;
            font-weight: 950;
        }

        #propHuntPropLockState.locked {
            background: rgba(255,204,96,.12);
            color: #ffd26b;
        }

        #propHuntPropPcHint {
            margin-top: 7px;
            color: #9ea8b5;
            font-size: 9px;
            line-height: 1.45;
        }

        #propHuntPropMobileControls {
            display: none;
            grid-template-columns: 1fr;
            gap: 5px;
            margin-top: 8px;
        }

        .prop-hunt-orientation-button {
            min-height: 36px;
            padding: 0 5px;
            border: 1px solid rgba(255,255,255,.16);
            border-radius: 9px;
            background: rgba(255,255,255,.08);
            color: #fff;
            font: 900 10px/1 system-ui, sans-serif;
            cursor: pointer;
            touch-action: manipulation;
        }

        .prop-hunt-orientation-button.locked {
            border-color: rgba(255,210,107,.55);
            background: rgba(255,210,107,.13);
            color: #ffd26b;
        }

        @media (max-width: 700px) {
            #propHuntHud {
                top: 8px;
                min-width: 220px;
                padding: 8px 10px;
            }

            #propHuntHudPhase {
                font-size: 18px;
            }

            #propHuntElevatorPanel {
                top: auto;
                right: 50%;
                bottom: calc(88px + env(safe-area-inset-bottom));
                width: min(340px, calc(100vw - 22px));
                transform: translateX(50%);
            }

            #propHuntElevatorFloors {
                grid-template-columns: repeat(6, minmax(0,1fr));
            }

            .prop-hunt-floor-button {
                min-height: 34px;
                font-size: 11px;
            }

            #propHuntPropHud {
                top: 92px;
                right: max(8px, env(safe-area-inset-right));
                bottom: auto;
                width: min(210px, 52vw);
                padding: 8px;
            }

            #propHuntPropPreviewCanvas {
                width: 66px;
                height: 66px;
                margin-top: 0;
            }

            #propHuntPropPcHint {
                display: none;
            }

            #propHuntPropMobileControls {
                display: grid;
            }
        }



        /* Prop Hunt mobile compact facing HUD override. */
        @media (max-width: 700px) {
            #propHuntPropHud {
                top: 86px;
                right: max(6px, env(safe-area-inset-right));
                bottom: auto;
                width: 118px;
                padding: 4px 5px;
                border-color: transparent;
                background: transparent;
                box-shadow: none;
                backdrop-filter: none;
                -webkit-backdrop-filter: none;
                pointer-events: none;
            }

            #propHuntPropHudTitle {
                font-size: 8px;
                text-shadow: 0 1px 3px rgba(0,0,0,.78);
            }

            #propHuntPropPreviewCanvas {
                width: 54px;
                height: 54px;
                margin-top: 0;
                pointer-events: auto;
            }

            #propHuntPropFacingValue {
                font-size: 9px;
                text-shadow: 0 1px 3px rgba(0,0,0,.78);
            }

            #propHuntPropLockState {
                min-height: 18px;
                margin-top: 2px;
                padding: 0 6px;
                background: rgba(10,12,16,.38);
                font-size: 8px;
                pointer-events: none;
            }

            #propHuntPropMobileControls {
                display: none;
            }
        }
        @media (max-width: 420px) {
            #propHuntElevatorFloors {
                grid-template-columns: repeat(4, minmax(0,1fr));
            }
        }
    `;
    document.head.appendChild(style);
}

function createUi() {
    createStyles();

    const joinPanel = document.createElement("section");
    joinPanel.id = "propHuntJoinPanel";
    joinPanel.hidden = true;
    joinPanel.innerHTML = `
        <div id="propHuntJoinTitle">👀 Campus Prop Hunt</div>
        <div id="propHuntJoinText">VME + VMES • 11 floors • 5 minute rounds</div>
        <button id="propHuntJoinButton" type="button">Join Prop Hunt</button>
    `;

    const hud = document.createElement("section");
    hud.id = "propHuntHud";
    hud.hidden = true;
    hud.innerHTML = `
        <div id="propHuntHudTitle">👀 PROP HUNT: AU EDITION</div>
        <div id="propHuntHudPhase">WAITING</div>
        <div id="propHuntHudRole"></div>
        <div id="propHuntHudStatus"></div>
        <div id="propHuntTeamStats"></div>
    `;

    const elevator = document.createElement("section");
    elevator.id = "propHuntElevatorPanel";
    elevator.hidden = true;
    elevator.innerHTML = `
        <div id="propHuntElevatorTitle">🛗 Elevator</div>
        <div id="propHuntElevatorFloors"></div>
    `;

    const returnButton = document.createElement("button");
    returnButton.id = "propHuntReturnButton";
    returnButton.type = "button";
    returnButton.textContent = "Return to Campus";
    returnButton.hidden = true;

    const fireButton = document.createElement("button");
    fireButton.id = "propHuntFireButton";
    fireButton.type = "button";
    fireButton.textContent = "FIRE";
    fireButton.hidden = true;

    const crosshair = document.createElement("div");
    crosshair.id = "propHuntCrosshair";
    crosshair.hidden = true;

    const ammoHud =
        document.createElement(
            "div"
        );

    ammoHud.id =
        "propHuntAmmoHud";

    ammoHud.hidden =
        true;

    ammoHud.textContent =
        `AMMO ${PROP_HUNT_MAX_BULLETS} / ${PROP_HUNT_MAX_BULLETS}`;

    const propHud =
        document.createElement(
            "section"
        );

    propHud.id =
        "propHuntPropHud";

    propHud.hidden =
        true;

    propHud.innerHTML = `
        <div id="propHuntPropHudTitle">PROP FACING</div>
        <canvas
            id="propHuntPropPreviewCanvas"
            width="128"
            height="128"
            aria-label="Current prop facing preview"
        ></canvas>
        <div id="propHuntPropFacingValue">Facing 0°</div>
        <div id="propHuntPropLockState">FOLLOW VIEW</div>
        <div id="propHuntPropPcHint">
            Move mouse to face prop • F freeze/unfreeze
        </div>
        <div id="propHuntPropMobileControls">
            <button class="prop-hunt-orientation-button" data-prop-action="lock" type="button">FREEZE</button>
        </div>
    `;

    const loadingFade = document.createElement("div");
    loadingFade.id = "propHuntLoadingFade";
    loadingFade.hidden = true;
    loadingFade.innerHTML = `<div id="propHuntLoadingText">Loading...</div>`;

    const seekerBlind = document.createElement("section");
    seekerBlind.id = "propHuntSeekerBlind";
    seekerBlind.hidden = true;
    seekerBlind.innerHTML = `
        <div id="propHuntSeekerBlindTitle">HIDERS ARE HIDING</div>
        <div id="propHuntSeekerBlindTimer">1:00</div>
        <div id="propHuntSeekerBlindText">Wait here. Your hunt begins when the timer reaches zero.</div>
    `;

    const caughtOverlay = document.createElement("section");
    caughtOverlay.id = "propHuntCaughtOverlay";
    caughtOverlay.hidden = true;
    caughtOverlay.innerHTML = `
        <div id="propHuntCaughtCard">
            <div id="propHuntCaughtTitle">FOUND!</div>
            <div id="propHuntCaughtText">
                You are now a ghost. You can move around, but other players cannot see you.
            </div>
        </div>
    `;

    document.body.append(
        joinPanel,
        hud,
        elevator,
        returnButton,
        fireButton,
        crosshair,
        ammoHud,
        propHud,
        loadingFade,
        seekerBlind,
        caughtOverlay
    );

    return {
        joinPanel,
        joinButton: joinPanel.querySelector("#propHuntJoinButton"),
        joinText: joinPanel.querySelector("#propHuntJoinText"),
        hud,
        hudTitle: hud.querySelector("#propHuntHudTitle"),
        phase: hud.querySelector("#propHuntHudPhase"),
        role: hud.querySelector("#propHuntHudRole"),
        status: hud.querySelector("#propHuntHudStatus"),
        teamStats: hud.querySelector("#propHuntTeamStats"),
        elevator,
        elevatorTitle: elevator.querySelector("#propHuntElevatorTitle"),
        elevatorFloors: elevator.querySelector("#propHuntElevatorFloors"),
        returnButton,
        fireButton,
        crosshair,
        ammoHud,
        propHud,
        propPreviewCanvas: propHud.querySelector("#propHuntPropPreviewCanvas"),
        propFacingValue: propHud.querySelector("#propHuntPropFacingValue"),
        propLockState: propHud.querySelector("#propHuntPropLockState"),
        propMobileControls: propHud.querySelector("#propHuntPropMobileControls"),
        propLockButton: propHud.querySelector('[data-prop-action="lock"]'),
        loadingFade,
        loadingText: loadingFade.querySelector("#propHuntLoadingText"),
        seekerBlind,
        seekerBlindTimer: seekerBlind.querySelector("#propHuntSeekerBlindTimer"),
        caughtOverlay,
        caughtOverlayTitle: caughtOverlay.querySelector("#propHuntCaughtTitle"),
        caughtOverlayText: caughtOverlay.querySelector("#propHuntCaughtText")
    };
}


function createPropHuntBoundaryVisual(scene) {
    const bounds = PROP_HUNT_RESTRICTION_BOUNDS;

    const width =
        bounds.maxX - bounds.minX;

    const height =
        bounds.maxZ - bounds.minZ;

    const centerX =
        (bounds.minX + bounds.maxX) / 2;

    const centerZ =
        (bounds.minZ + bounds.maxZ) / 2;

    const plane =
        BABYLON.MeshBuilder.CreateGround(
            "prop_hunt_red_restriction_area",
            {
                width,
                height
            },
            scene
        );

    plane.position.x = centerX;
    plane.position.y = 0.06;
    plane.position.z = centerZ;

    plane.isPickable = false;

    const material =
        new BABYLON.StandardMaterial(
            "prop_hunt_red_restriction_area_mat",
            scene
        );

    material.diffuseColor =
        new BABYLON.Color3(
            1,
            0,
            0
        );

    material.emissiveColor =
        new BABYLON.Color3(
            0.85,
            0,
            0
        );

    material.alpha = 0.18;
    material.backFaceCulling = false;
    material.disableLighting = true;

    plane.material = material;
    plane.setEnabled(false);

    return {
        setVisible(visible) {
            plane.setEnabled(Boolean(visible));
        },
        dispose() {
            material.dispose();
            plane.dispose();
        }
    };
}

function createPortal(scene) {
    const root = new BABYLON.TransformNode("prop_hunt_portal_root", scene);
    root.position.copyFromFloats(
        PROP_HUNT_PORTAL_POSITION.x,
        PROP_HUNT_PORTAL_POSITION.y,
        PROP_HUNT_PORTAL_POSITION.z
    );

    const pad = BABYLON.MeshBuilder.CreateCylinder(
        "prop_hunt_portal_pad",
        { diameter: 5.6, height: 0.18, tessellation: 48 },
        scene
    );
    pad.parent = root;
    pad.position.y = 0.09;
    pad.isPickable = false;
    pad.checkCollisions = false;

    const padMat = new BABYLON.StandardMaterial("prop_hunt_portal_pad_mat", scene);
    padMat.diffuseColor = new BABYLON.Color3(0.10, 0.72, 0.46);
    padMat.emissiveColor = new BABYLON.Color3(0.04, 0.38, 0.24);
    padMat.alpha = 0.84;
    pad.material = padMat;

    const ring = BABYLON.MeshBuilder.CreateTorus(
        "prop_hunt_portal_ring",
        { diameter: 5.0, thickness: 0.28, tessellation: 48 },
        scene
    );
    ring.parent = root;
    ring.position.y = 2.4;
    ring.rotation.x = Math.PI / 2;
    ring.isPickable = false;
    ring.checkCollisions = false;

    const ringMat = new BABYLON.StandardMaterial("prop_hunt_portal_ring_mat", scene);
    ringMat.diffuseColor = new BABYLON.Color3(0.22, 0.95, 0.62);
    ringMat.emissiveColor = new BABYLON.Color3(0.12, 0.78, 0.48);
    ring.material = ringMat;

    const beacon = BABYLON.MeshBuilder.CreateSphere(
        "prop_hunt_portal_beacon",
        { diameter: 0.65, segments: 16 },
        scene
    );
    beacon.parent = root;
    beacon.position.y = 4.8;
    beacon.material = ringMat;
    beacon.isPickable = false;

    const texture = new BABYLON.DynamicTexture(
        "prop_hunt_portal_label_texture",
        { width: 1024, height: 256 },
        scene,
        false
    );
    texture.hasAlpha = true;
    const ctx = texture.getContext();
    ctx.clearRect(0, 0, 1024, 256);
    ctx.fillStyle = "rgba(12,14,18,.90)";
    ctx.fillRect(0, 0, 1024, 256);
    ctx.strokeStyle = "#68f0b8";
    ctx.lineWidth = 14;
    ctx.strokeRect(7, 7, 1010, 242);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 84px Arial";
    ctx.fillText("👀  CAMPUS PROP HUNT", 512, 128);
    texture.update(true);

    const labelMat = new BABYLON.StandardMaterial("prop_hunt_portal_label_mat", scene);
    labelMat.diffuseTexture = texture;
    labelMat.emissiveTexture = texture;
    labelMat.disableLighting = true;
    labelMat.backFaceCulling = false;

    const label = BABYLON.MeshBuilder.CreatePlane(
        "prop_hunt_portal_label",
        { width: 9.5, height: 2.3, sideOrientation: BABYLON.Mesh.DOUBLESIDE },
        scene
    );
    label.parent = root;
    label.position.y = 6.5;
    label.material = labelMat;
    label.billboardMode = BABYLON.Mesh.BILLBOARDMODE_Y;
    label.isPickable = false;

    const observer = scene.onBeforeRenderObservable.add(() => {
        ring.rotation.z += 0.012 * scene.getAnimationRatio();
        beacon.position.y = 4.8 + Math.sin(performance.now() * 0.0025) * 0.18;
    });

    return {
        root,
        dispose() {
            scene.onBeforeRenderObservable.remove(observer);
            root.dispose(false, true);
            texture.dispose();
            padMat.dispose();
            ringMat.dispose();
            labelMat.dispose();
        }
    };
}

function propMetricsFromContainer(
    container,
    propId
) {
    const config =
        PROP_HUNT_PROP_ASSETS[
            propId
        ];

    if (
        !container ||
        !config
    ) {
        return {
            width: 1,
            height: 1,
            depth: 1,
            maxDimension: 1
        };
    }

    const meshes =
        container.meshes
            .filter(
                (mesh) =>
                    mesh?.getBoundingInfo &&
                    mesh.getTotalVertices?.() >
                        0
            );

    const bounds =
        meshWorldBounds(
            meshes
        );

    const scale =
        Number(
            config.scale
        ) ||
        1;

    const width =
        Math.max(
            0.05,
            (
                bounds.max.x -
                bounds.min.x
            ) *
                scale
        );

    const height =
        Math.max(
            0.05,
            (
                bounds.max.y -
                bounds.min.y
            ) *
                scale
        );

    const depth =
        Math.max(
            0.05,
            (
                bounds.max.z -
                bounds.min.z
            ) *
                scale
        );

    return {
        width,
        height,
        depth,
        maxDimension:
            Math.max(
                width,
                height,
                depth
            )
    };
}


function createPropHudPreview(
    canvas
) {
    if (!canvas) {
        return {
            setProp() {},
            dispose() {}
        };
    }

    // Tiny preview-only engine. It does NOT run continuously. A frame is
    // rendered only when the prop or prop yaw changes.
    const engine =
        new BABYLON.Engine(
            canvas,
            true,
            {
                preserveDrawingBuffer:
                    true,
                stencil:
                    false,
                alpha:
                    true,
                premultipliedAlpha:
                    false
            },
            false
        );

    const previewScene =
        new BABYLON.Scene(
            engine
        );

    previewScene.clearColor =
        new BABYLON.Color4(
            0,
            0,
            0,
            0
        );

    const camera =
        new BABYLON.ArcRotateCamera(
            "propHuntHudPreviewCamera",
            -Math.PI / 2,
            1.08,
            2.65,
            BABYLON.Vector3.Zero(),
            previewScene
        );

    camera.minZ =
        0.01;

    const light =
        new BABYLON.HemisphericLight(
            "propHuntHudPreviewLight",
            new BABYLON.Vector3(
                0.4,
                1,
                -0.35
            ),
            previewScene
        );

    light.intensity =
        1.15;

    let currentPropId =
        null;

    let currentContainer =
        null;

    let previewRoot =
        null;

    let loadGeneration =
        0;

    let lastRenderedYaw =
        null;

    const clearCurrent =
        () => {
            previewRoot
                ?.dispose(
                    false,
                    true
                );

            previewRoot =
                null;

            currentContainer
                ?.dispose();

            currentContainer =
                null;

            currentPropId =
                null;
        };

    const loadProp =
        async (
            propId
        ) => {
            const config =
                PROP_HUNT_PROP_ASSETS[
                    propId
                ];

            if (!config) {
                clearCurrent();
                return;
            }

            const generation =
                ++loadGeneration;

            const container =
                await BABYLON.SceneLoader
                    .LoadAssetContainerAsync(
                        PROP_ASSET_ROOT,
                        config.filename,
                        previewScene
                    );

            if (
                generation !==
                loadGeneration
            ) {
                container.dispose();
                return;
            }

            clearCurrent();

            currentContainer =
                container;

            currentPropId =
                propId;

            container.addAllToScene();

            previewRoot =
                new BABYLON.TransformNode(
                    `propHuntHudPreviewRoot_${propId}`,
                    previewScene
                );

            container.rootNodes
                .forEach(
                    (node) => {
                        node.parent =
                            previewRoot;
                    }
                );

            const meshes =
                container.meshes
                    .filter(
                        (mesh) =>
                            mesh?.getBoundingInfo &&
                            mesh.getTotalVertices?.() >
                                0
                    );

            meshes.forEach(
                (mesh) => {
                    mesh.isPickable =
                        false;

                    mesh.checkCollisions =
                        false;
                }
            );

            const bounds =
                meshWorldBounds(
                    meshes
                );

            const center =
                bounds.min
                    .add(
                        bounds.max
                    )
                    .scale(
                        0.5
                    );

            const size =
                bounds.max
                    .subtract(
                        bounds.min
                    );

            const maxDimension =
                Math.max(
                    0.001,
                    size.x,
                    size.y,
                    size.z
                );

            const modelScale =
                1.35 /
                maxDimension;

            container.rootNodes
                .forEach(
                    (node) => {
                        node.position.subtractInPlace(
                            center
                        );
                    }
                );

            previewRoot.scaling
                .setAll(
                    modelScale
                );

            camera.target
                .copyFromFloats(
                    0,
                    0,
                    0
                );

            camera.radius =
                2.35;

            lastRenderedYaw =
                null;

            engine.resize();
        };

    return {
        async setProp(
            propId,
            yaw
        ) {
            if (!propId) {
                clearCurrent();
                previewScene.render();
                return;
            }

            if (
                propId !==
                currentPropId
            ) {
                try {
                    await loadProp(
                        propId
                    );
                } catch (error) {
                    console.warn(
                        "Could not load Prop Hunt HUD mesh preview:",
                        error
                    );

                    return;
                }
            }

            if (!previewRoot) {
                return;
            }

            const renderYaw =
                normalizeYaw(
                    yaw +
                    PROP_HUNT_VISUAL_YAW_OFFSET
                );

            if (
                lastRenderedYaw !==
                    null &&
                Math.abs(
                    shortestYawDelta(
                        lastRenderedYaw,
                        renderYaw
                    )
                ) <
                    0.005
            ) {
                return;
            }

            lastRenderedYaw =
                renderYaw;

            previewRoot.rotation.y =
                renderYaw;

            previewScene.render();
        },

        dispose() {
            loadGeneration +=
                1;

            clearCurrent();

            previewScene.dispose();
            engine.dispose();
        }
    };
}


function meshWorldBounds(meshes) {
    let min = new BABYLON.Vector3(
        Number.POSITIVE_INFINITY,
        Number.POSITIVE_INFINITY,
        Number.POSITIVE_INFINITY
    );
    let max = new BABYLON.Vector3(
        Number.NEGATIVE_INFINITY,
        Number.NEGATIVE_INFINITY,
        Number.NEGATIVE_INFINITY
    );

    meshes.forEach((mesh) => {
        if (!mesh.getBoundingInfo || mesh.getTotalVertices?.() <= 0) return;
        mesh.computeWorldMatrix(true);
        const box = mesh.getBoundingInfo().boundingBox;
        min = BABYLON.Vector3.Minimize(min, box.minimumWorld);
        max = BABYLON.Vector3.Maximize(max, box.maximumWorld);
    });

    if (!Number.isFinite(min.x) || !Number.isFinite(max.x)) {
        min = BABYLON.Vector3.Zero();
        max = BABYLON.Vector3.One();
    }

    return { min, max };
}

function instantiateNormalizedProp(scene, container, propId, targetSocketId) {
    const config = PROP_HUNT_PROP_ASSETS[propId];
    if (!config) return null;

    const instance = container.instantiateModelsToScene(
        (name) => `propHunt_${targetSocketId}_${propId}_${name}`,
        false,
        { doNotInstantiate: true }
    );

    const modelRoot = new BABYLON.TransformNode(
        `propHunt_model_${targetSocketId}_${propId}`,
        scene
    );

    instance.rootNodes.forEach((node) => {
        node.parent = modelRoot;
    });

    const meshes = instance.rootNodes.flatMap((node) => {
        const children = node.getChildMeshes?.(false) || [];
        return node.getTotalVertices?.() > 0 ? [node, ...children] : children;
    });

    const bounds = meshWorldBounds(meshes);
    const center = bounds.min.add(bounds.max).scale(0.5);

    const normalizer = new BABYLON.TransformNode(
        `propHunt_normalizer_${targetSocketId}_${propId}`,
        scene
    );
    modelRoot.parent = normalizer;
    normalizer.position.copyFromFloats(
        -center.x,
        -bounds.min.y,
        -center.z
    );

    const visual = new BABYLON.TransformNode(
        `propHunt_visual_${targetSocketId}_${propId}`,
        scene
    );
    normalizer.parent = visual;
    visual.scaling.setAll(config.scale || 1);

    meshes.forEach((mesh) => {
        mesh.checkCollisions = false;
        mesh.isPickable = true;
        mesh.metadata = {
            ...(mesh.metadata || {}),
            propHuntTargetSocketId: targetSocketId,
            propHuntPropId: propId
        };
    });

    instance.animationGroups.forEach((group) => group.stop());

    return {
        visual,
        instance,
        meshes,
        dispose() {
            instance.animationGroups.forEach((group) => group.dispose());
            visual.dispose(false, true);
        }
    };
}

const propHuntShotEffectPools =
    new WeakMap();

function getShotEffectPool(scene) {
    const existing =
        propHuntShotEffectPools
            .get(
                scene
            );

    if (existing) {
        return existing;
    }

    // ----------------------------------------------------------
    // Tracer: one updatable LinesMesh reused for every shot.
    // ----------------------------------------------------------
    const tracerPoints = [
        BABYLON.Vector3.Zero(),
        new BABYLON.Vector3(
            0,
            0,
            0.1
        )
    ];

    const tracer =
        BABYLON.MeshBuilder.CreateLines(
            "propHuntTracerPool",
            {
                points:
                    tracerPoints,
                updatable:
                    true
            },
            scene
        );

    tracer.color =
        new BABYLON.Color3(
            1,
            0.72,
            0.22
        );

    tracer.isPickable =
        false;

    tracer.renderingGroupId =
        2;

    tracer.setEnabled(
        false
    );

    // ----------------------------------------------------------
    // Impact: emissive low-poly flash.
    //
    // IMPORTANT:
    // v1/v1.1 created a new sphere, material, POINT LIGHT and a
    // per-shot render observer every time the Seeker fired.
    // The PointLight was especially expensive in a large campus
    // scene. v1.2 reuses one unlit mesh and has no dynamic light.
    // ----------------------------------------------------------
    const impact =
        BABYLON.MeshBuilder.CreateSphere(
            "propHuntImpactPool",
            {
                diameter:
                    0.18,
                segments:
                    5
            },
            scene
        );

    impact.isPickable =
        false;

    impact.checkCollisions =
        false;

    const impactMaterial =
        new BABYLON.StandardMaterial(
            "propHuntImpactPoolMaterial",
            scene
        );

    impactMaterial.disableLighting =
        true;

    impactMaterial.diffuseColor =
        new BABYLON.Color3(
            1,
            0.30,
            0.04
        );

    impactMaterial.emissiveColor =
        new BABYLON.Color3(
            1,
            0.23,
            0.02
        );

    impactMaterial.alpha =
        0;

    impact.material =
        impactMaterial;

    impact.setEnabled(
        false
    );

    // ----------------------------------------------------------
    // Muzzle: one reusable mesh/material.
    // ----------------------------------------------------------
    const muzzle =
        BABYLON.MeshBuilder.CreateSphere(
            "propHuntMuzzlePool",
            {
                diameter:
                    0.10,
                segments:
                    4
            },
            scene
        );

    muzzle.isPickable =
        false;

    muzzle.checkCollisions =
        false;

    const muzzleMaterial =
        new BABYLON.StandardMaterial(
            "propHuntMuzzlePoolMaterial",
            scene
        );

    muzzleMaterial.disableLighting =
        true;

    muzzleMaterial.diffuseColor =
        new BABYLON.Color3(
            1,
            0.75,
            0.18
        );

    muzzleMaterial.emissiveColor =
        new BABYLON.Color3(
            1,
            0.55,
            0.08
        );

    muzzle.material =
        muzzleMaterial;

    muzzle.setEnabled(
        false
    );

    const state = {
        tracer,
        tracerPoints,
        tracerEndsAt:
            0,

        impact,
        impactMaterial,
        impactStartedAt:
            0,
        impactEndsAt:
            0,

        muzzle,
        muzzleEndsAt:
            0,

        observer:
            null
    };

    state.observer =
        scene
            .onBeforeRenderObservable
            .add(
                () => {
                    const now =
                        performance.now();

                    if (
                        tracer.isEnabled() &&
                        now >=
                            state.tracerEndsAt
                    ) {
                        tracer.setEnabled(
                            false
                        );
                    }

                    if (
                        muzzle.isEnabled() &&
                        now >=
                            state.muzzleEndsAt
                    ) {
                        muzzle.setEnabled(
                            false
                        );
                    }

                    if (
                        impact.isEnabled()
                    ) {
                        const duration =
                            Math.max(
                                1,
                                state.impactEndsAt -
                                    state.impactStartedAt
                            );

                        const t =
                            BABYLON.Scalar.Clamp(
                                (
                                    now -
                                    state.impactStartedAt
                                ) /
                                    duration,
                                0,
                                1
                            );

                        impact.scaling.setAll(
                            1 +
                            t *
                                3.2
                        );

                        impactMaterial.alpha =
                            1 -
                            t;

                        if (
                            t >=
                            1
                        ) {
                            impact.setEnabled(
                                false
                            );

                            impactMaterial.alpha =
                                0;
                        }
                    }
                }
            );

    propHuntShotEffectPools.set(
        scene,
        state
    );

    return state;
}

function disposeShotEffectPool(scene) {
    const pool =
        propHuntShotEffectPools
            .get(
                scene
            );

    if (!pool) {
        return;
    }

    if (pool.observer) {
        scene
            .onBeforeRenderObservable
            .remove(
                pool.observer
            );
    }

    pool.tracer.dispose();
    pool.impact.dispose();
    pool.muzzle.dispose();

    pool.impactMaterial.dispose();
    pool.muzzle.material?.dispose?.();

    propHuntShotEffectPools.delete(
        scene
    );
}

function createImpactEffect(scene, point) {
    if (!isFiniteVector(point)) {
        return;
    }

    const pool =
        getShotEffectPool(
            scene
        );

    pool.impact.position
        .copyFromFloats(
            point.x,
            point.y,
            point.z
        );

    pool.impact.scaling
        .setAll(
            1
        );

    pool.impactMaterial.alpha =
        1;

    pool.impactStartedAt =
        performance.now();

    pool.impactEndsAt =
        pool.impactStartedAt +
        120;

    pool.impact.setEnabled(
        true
    );
}


// ============================================================
// Cached Web Audio gunshot.
//
// v1.1 generated and filled a new AudioBuffer on every shot.
// v1.2 builds one short gunshot sample once and reuses it.
// ============================================================
let propHuntGunAudioContext =
    null;

let propHuntGunAudioBuffer =
    null;

function ensureGunFireAudioBuffer(
    context
) {
    if (
        propHuntGunAudioBuffer
    ) {
        return propHuntGunAudioBuffer;
    }

    const duration =
        0.16;

    const length =
        Math.max(
            1,
            Math.floor(
                context.sampleRate *
                duration
            )
        );

    const buffer =
        context.createBuffer(
            1,
            length,
            context.sampleRate
        );

    const channel =
        buffer.getChannelData(
            0
        );

    for (
        let i = 0;
        i < length;
        i += 1
    ) {
        const time =
            i /
            context.sampleRate;

        const progress =
            i /
            length;

        const crack =
            (
                Math.random() *
                2 -
                1
            ) *
            Math.pow(
                1 -
                progress,
                4.0
            ) *
            0.42;

        const thump =
            Math.sin(
                2 *
                Math.PI *
                (
                    92 -
                    progress *
                    42
                ) *
                time
            ) *
            Math.pow(
                1 -
                progress,
                2.7
            ) *
            0.20;

        channel[i] =
            BABYLON.Scalar.Clamp(
                crack +
                thump,
                -1,
                1
            );
    }

    propHuntGunAudioBuffer =
        buffer;

    return buffer;
}

function playGunFireSound() {
    const AudioContextClass =
        window.AudioContext ||
        window.webkitAudioContext;

    if (!AudioContextClass) {
        return;
    }

    propHuntGunAudioContext ||=
        new AudioContextClass();

    const context =
        propHuntGunAudioContext;

    const play =
        () => {
            const source =
                context
                    .createBufferSource();

            source.buffer =
                ensureGunFireAudioBuffer(
                    context
                );

            const gain =
                context
                    .createGain();

            gain.gain.value =
                0.82;

            source.connect(
                gain
            );

            gain.connect(
                context.destination
            );

            source.onended =
                () => {
                    source.disconnect();
                    gain.disconnect();
                };

            source.start();
        };

    if (
        context.state ===
        "suspended"
    ) {
        void context
            .resume()
            .then(
                play
            )
            .catch(
                () => {}
            );

        return;
    }

    play();
}


function createTracer(scene, start, end) {
    if (
        !isFiniteVector(start) ||
        !isFiniteVector(end)
    ) {
        return;
    }

    const pool =
        getShotEffectPool(
            scene
        );

    pool.tracerPoints[0]
        .copyFromFloats(
            start.x,
            start.y,
            start.z
        );

    pool.tracerPoints[1]
        .copyFromFloats(
            end.x,
            end.y,
            end.z
        );

    BABYLON.MeshBuilder.CreateLines(
        null,
        {
            points:
                pool.tracerPoints,
            instance:
                pool.tracer
        }
    );

    pool.tracerEndsAt =
        performance.now() +
        55;

    pool.tracer.setEnabled(
        true
    );
}


function createMuzzleFlash(scene, camera) {
    if (!camera) {
        return;
    }

    const pool =
        getShotEffectPool(
            scene
        );

    const forward =
        camera
            .getForwardRay(
                1
            )
            .direction
            .normalize();

    const right =
        camera
            .getDirection(
                BABYLON.Vector3.Right()
            )
            .normalize();

    const up =
        camera
            .getDirection(
                BABYLON.Vector3.Up()
            )
            .normalize();

    pool.muzzle.position
        .copyFrom(
            camera.globalPosition
        )
        .addInPlace(
            forward.scale(
                1.05
            )
        )
        .addInPlace(
            right.scale(
                0.16
            )
        )
        .subtractInPlace(
            up.scale(
                0.14
            )
        );

    pool.muzzleEndsAt =
        performance.now() +
        45;

    pool.muzzle.setEnabled(
        true
    );
}


export function createPropHuntClient(
    scene,
    localPlayer,
    socket,
    {
        remotePlayers,
        setFullMinigameState = () => {}
    } = {}
) {
    const ui = createUi();
    const portal = createPortal(scene);
    const boundaryVisual = createPropHuntBoundaryVisual(scene);
const propHudPreview =
        createPropHudPreview(
            ui.propPreviewCanvas
        );

    const mobile = isMobileDevice();

    const propContainers = new Map();
    const propMetrics = new Map();
    const propVisuals = new Map();
    const participants = new Map();
    const pendingVisuals = new Set();

    let assetsPromise = null;
    let active = false;
    let role = "NONE";
    let localPropId = null;
    let phase = "IDLE";
    let phaseEndsAt = null;
    let lobbyCountdown = null;
    let caught = false;
    let currentElevator = null;
    let pendingElevator = null;
    let minigameBlockedByOther = false;
    let lastShotAt = 0;
    let bulletsRemaining = 0;
    let roundResultMessage = "";
    let roundIntroEndsAt = 0;
    let caughtOverlayTimer = null;

    let localPropYaw = 0;
    let localPropLocked = false;
    let lastOrientationSentAt = 0;
    let lastSentPropYaw = null;
    let lastSentPropLocked = null;
    let lastOrientationHudKey = "";

    let propViewTarget = null;
    let propViewActive = false;
    let propViewPropId = null;
    let propViewUpdateGeneration = 0;

    let disposed = false;

    const socketHandlers = [];

    function on(event, handler) {
        socket.on(event, handler);
        socketHandlers.push([event, handler]);
    }

    function setRemoteIsolation() {
        if (!remotePlayers) return;

        const participantIds = new Set(participants.keys());
        remotePlayers.forEach((remotePlayer, socketId) => {
            const participant = participants.get(socketId);

            const hiddenBecauseNotInRound = Boolean(
                active && !participantIds.has(socketId)
            );

            const hiddenBecauseGhost = Boolean(
                active
                && participant?.role === "HIDER"
                && participant?.caught
            );

            remotePlayer.hiddenByPropHuntIsolation = Boolean(
                hiddenBecauseNotInRound || hiddenBecauseGhost
            );

            remotePlayer.propHuntDisguised = Boolean(
                active
                && participant?.role === "HIDER"
                && !participant?.caught
                && participant?.propId
            );
        });
    }

    async function ensureAssetsLoaded() {
        if (assetsPromise) return assetsPromise;

        assetsPromise = (async () => {
            const entries = Object.entries(PROP_HUNT_PROP_ASSETS);
            await Promise.all(entries.map(async ([propId, config]) => {
                const container = await BABYLON.SceneLoader.LoadAssetContainerAsync(
                    PROP_ASSET_ROOT,
                    config.filename,
                    scene
                );

                propContainers.set(
                    propId,
                    container
                );

                propMetrics.set(
                    propId,
                    propMetricsFromContainer(
                        container,
                        propId
                    )
                );
            }));
        })();

        try {
            await assetsPromise;
        } catch (error) {
            assetsPromise = null;
            throw error;
        }
    }

    function destroyPropVisual(socketId) {
        const visual = propVisuals.get(socketId);
        if (!visual) return;
        visual.dispose();
        propVisuals.delete(socketId);
    }

    async function ensurePropVisual(socketId, propId) {
        // In the FPS control model the local Hider does not render their own
        // prop because the camera is physically inside the player's capsule.
        // The HUD provides facing/lock feedback instead.
        if (
            socketId ===
            socket.id
        ) {
            destroyPropVisual(
                socketId
            );

            return;
        }

        if (
            !remotePlayers?.has(socketId)
        ) {
            return;
        }

        if (propVisuals.get(socketId)?.propId === propId) return;
        if (pendingVisuals.has(socketId)) return;

        pendingVisuals.add(socketId);
        try {
            await ensureAssetsLoaded();
            destroyPropVisual(socketId);

            const container = propContainers.get(propId);
            if (!container) return;

            const created = instantiateNormalizedProp(
                scene,
                container,
                propId,
                socketId
            );
            if (!created) return;

            propVisuals.set(socketId, {
                ...created,
                propId
            });
        } catch (error) {
            console.error("Could not create Prop Hunt prop visual:", error);
        } finally {
            pendingVisuals.delete(socketId);
        }
    }

    function syncPropVisuals() {
        if (!active) {
            [...propVisuals.keys()].forEach(destroyPropVisual);
            setRemoteIsolation();
            return;
        }

        participants.forEach((participant, socketId) => {
            if (
                socketId ===
                socket.id
            ) {
                destroyPropVisual(
                    socketId
                );

                return;
            }

            const shouldShow =
                participant.role === "HIDER"
                && !participant.caught
                && Boolean(participant.propId);

            if (shouldShow) {
                void ensurePropVisual(socketId, participant.propId);
            } else {
                destroyPropVisual(socketId);
            }
        });

        [...propVisuals.keys()].forEach((socketId) => {
            const participant = participants.get(socketId);
            if (
                !participant
                || participant.role !== "HIDER"
                || participant.caught
            ) {
                destroyPropVisual(socketId);
            }
        });

        setRemoteIsolation();
    }

    function restoreNormalFpsView() {
        propViewUpdateGeneration +=
            1;

        if (!propViewActive) {
            return;
        }

        propViewActive =
            false;

        propViewPropId =
            null;

        scene.metadata
            ?.cameraModeController
            ?.applyFirstPersonMode
            ?.();
    }

    async function syncPropViewHeight() {
        const shouldUsePropHeight =
            Boolean(
                active &&
                role === "HIDER" &&
                !caught &&
                (
                    phase === "HIDING" ||
                    phase === "HUNT"
                ) &&
                localPropId
            );

        if (!shouldUsePropHeight) {
            restoreNormalFpsView();
            return;
        }

        if (
            propViewActive &&
            propViewPropId ===
                localPropId
        ) {
            return;
        }

        const generation =
            ++propViewUpdateGeneration;

        try {
            await ensureAssetsLoaded();
        } catch {
            return;
        }

        if (
            generation !==
                propViewUpdateGeneration ||
            !orientationActive() ||
            !localPropId
        ) {
            return;
        }

        const metrics =
            propMetrics.get(
                localPropId
            ) || {
                height:
                    1
            };

        // Derive view height from the actual normalized/scaled prop mesh.
        // This keeps small props low and tall props naturally higher.
        const eyeHeightAboveFloor =
            BABYLON.Scalar.Clamp(
                metrics.height *
                    0.72,
                0.52,
                1.58
            );

        if (!propViewTarget) {
            propViewTarget =
                new BABYLON.TransformNode(
                    "propHuntMeshHeightViewTarget",
                    scene
                );

            propViewTarget.parent =
                localPlayer;
        }

        propViewTarget.position
            .copyFromFloats(
                0,
                eyeHeightAboveFloor -
                    PROP_HUNT_PLAYER_CENTER_OFFSET_Y,
                0
            );

        const controller =
            scene.metadata
                ?.cameraModeController;

        controller
            ?.applyFirstPersonMode
            ?.();

        if (
            scene.activeCamera
        ) {
            scene.activeCamera.lockedTarget =
                propViewTarget;
        }

        propViewActive =
            true;

        propViewPropId =
            localPropId;
    }


    function updateAmmoUi() {
        const seekerHunting =
            Boolean(
                active &&
                role === "SEEKER" &&
                phase === "HUNT" &&
                !caught
            );

        ui.ammoHud.hidden =
            !seekerHunting;

        if (!seekerHunting) {
            ui.fireButton.disabled =
                false;

            return;
        }

        const safeBullets =
            Math.max(
                0,
                Math.min(
                    PROP_HUNT_MAX_BULLETS,
                    Number(
                        bulletsRemaining
                    ) ||
                    0
                )
            );

        ui.ammoHud.textContent =
            safeBullets >
                0
                ? `AMMO ${safeBullets} / ${PROP_HUNT_MAX_BULLETS}`
                : "OUT OF AMMO";

        ui.ammoHud.classList.toggle(
            "empty",
            safeBullets <=
                0
        );

        ui.fireButton.disabled =
            safeBullets <=
            0;

        ui.fireButton.textContent =
            safeBullets >
                0
                ? `FIRE • ${safeBullets}`
                : "EMPTY";
    }


    function hideCaughtOverlay() {
        if (caughtOverlayTimer) {
            window.clearTimeout(caughtOverlayTimer);
            caughtOverlayTimer = null;
        }

        ui.caughtOverlay.hidden = true;
    }

    function showCaughtOverlay() {
        if (caughtOverlayTimer) {
            window.clearTimeout(caughtOverlayTimer);
        }

        ui.caughtOverlayTitle.textContent = "FOUND!";
        ui.caughtOverlayText.textContent =
            "You are now a ghost. You can move around, but other players cannot see you.";

        ui.caughtOverlay.hidden = false;

        caughtOverlayTimer = window.setTimeout(
            () => {
                ui.caughtOverlay.hidden = true;
                caughtOverlayTimer = null;
            },
            2600
        );
    }

    function teamCounts() {
        const rows = [...participants.values()];

        const seekers = rows.filter((row) =>
            row.role === "SEEKER"
        ).length;

        const totalHiders = rows.filter((row) =>
            row.role === "HIDER"
        ).length;

        const activeHiders = rows.filter((row) =>
            row.role === "HIDER" && !row.caught
        ).length;

        const caughtHiders = Math.max(
            0,
            totalHiders - activeHiders
        );

        return {
            seekers,
            totalHiders,
            activeHiders,
            caughtHiders
        };
    }

    function updateRoleUi() {
        const label = caught && role === "HIDER"
            ? "ROLE: GHOST • FOUND HIDER"
            : role === "HIDER"
                ? `ROLE: HIDER • PROP: ${PROP_HUNT_PROP_ASSETS[localPropId]?.label || "Unknown"}`
                : role === "SEEKER"
                    ? "ROLE: FINDER"
                    : role === "SPECTATOR"
                        ? "ROLE: SPECTATOR"
                        : "WAITING FOR PLAYERS";
        ui.role.textContent = label;
    }

    function remainingHiders() {
        return teamCounts().activeHiders;
    }


    function compactTeamStatus() {
        const rows =
            [...participants.values()];

        const seekers =
            rows.filter(
                (row) =>
                    row?.role === "SEEKER"
            ).length;

        const hiderRows =
            rows.filter(
                (row) =>
                    row?.role === "HIDER"
            );

        const totalHiders =
            hiderRows.length;

        const caughtHiders =
            hiderRows.filter(
                (row) =>
                    Boolean(row?.caught)
            ).length;

        const activeHiders =
            Math.max(
                0,
                totalHiders - caughtHiders
            );

        if (
            seekers <= 0 &&
            totalHiders <= 0
        ) {
            return "Waiting for Prop Hunt players...";
        }

        return `Finders: ${seekers} • Hiders left: ${activeHiders}/${totalHiders} • Found: ${caughtHiders}`;
    }

    function orientationActive() {
        return Boolean(
            active &&
            role === "HIDER" &&
            !caught &&
            (
                phase === "HIDING" ||
                phase === "HUNT"
            )
        );
    }

    function updateOrientationHud() {
        const visible =
            orientationActive();

        ui.propHud.hidden =
            !visible;

        if (!visible) {
            lastOrientationHudKey =
                "";

            return;
        }

        const visualYaw =
            normalizeYaw(
                localPropYaw +
                PROP_HUNT_VISUAL_YAW_OFFSET
            );

        const degrees =
            yawDegrees(
                visualYaw
            );

        const hudKey =
            `${localPropId}:${degrees}:${localPropLocked}`;

        if (
            hudKey ===
            lastOrientationHudKey
        ) {
            return;
        }

        lastOrientationHudKey =
            hudKey;

        ui.propFacingValue.textContent =
            `Facing ${degrees}°`;

        void propHudPreview
            .setProp(
                localPropId,
                localPropYaw
            );

        ui.propLockState.textContent =
            localPropLocked
                ? "🔒 FROZEN"
                : "👁 FOLLOW VIEW";

        ui.propLockState.classList.toggle(
            "locked",
            localPropLocked
        );

        if (
            ui.propLockButton
        ) {
            ui.propLockButton.textContent =
                localPropLocked
                    ? "UNFREEZE"
                    : "FREEZE";

            ui.propLockButton.classList.toggle(
                "locked",
                localPropLocked
            );
        }

    }

    function sendPropOrientation(
        force = false
    ) {
        if (
            !orientationActive() ||
            !socket.connected
        ) {
            return;
        }

        const now =
            performance.now();

        if (
            !force &&
            now -
                lastOrientationSentAt <
                85
        ) {
            return;
        }

        const changedYaw =
            lastSentPropYaw ===
                null ||
            Math.abs(
                shortestYawDelta(
                    lastSentPropYaw,
                    localPropYaw
                )
            ) >
                0.025;

        const changedLock =
            lastSentPropLocked !==
            localPropLocked;

        if (
            !force &&
            !changedYaw &&
            !changedLock
        ) {
            return;
        }

        lastOrientationSentAt =
            now;

        lastSentPropYaw =
            localPropYaw;

        lastSentPropLocked =
            localPropLocked;

        socket.emit(
            "propHunt:propOrientation",
            {
                yaw:
                    localPropYaw,
                locked:
                    localPropLocked
            }
        );
    }

    function setLocalPropYaw(
        yaw,
        {
            forceSend = true
        } = {}
    ) {
        localPropYaw =
            normalizeYaw(
                yaw
            );

        updateOrientationHud();

        sendPropOrientation(
            forceSend
        );
    }

    function cameraFacingYaw() {
        const camera =
            scene.activeCamera;

        if (!camera) {
            return null;
        }

        const forward =
            camera.getDirection(
                BABYLON.Vector3.Forward()
            );

        forward.y =
            0;

        if (
            forward.lengthSquared() <
            0.0001
        ) {
            return null;
        }

        forward.normalize();

        return normalizeYaw(
            Math.atan2(
                forward.x,
                forward.z
            )
        );
    }

    function updatePropFacingFromCamera() {
        if (
            !orientationActive() ||
            localPropLocked
        ) {
            return;
        }

        const yaw =
            cameraFacingYaw();

        if (
            yaw ===
            null
        ) {
            return;
        }

        const delta =
            Math.abs(
                shortestYawDelta(
                    localPropYaw,
                    yaw
                )
            );

        // Avoid sending tiny mouse jitter.
        if (
            delta <
            0.01
        ) {
            return;
        }

        localPropYaw =
            yaw;

        updateOrientationHud();

        sendPropOrientation(
            false
        );
    }

    function togglePropLock() {
        if (
            !orientationActive()
        ) {
            return;
        }

        if (
            !localPropLocked
        ) {
            // Freeze exactly where the camera is facing at the moment F/Freeze
            // is pressed.
            const yaw =
                cameraFacingYaw();

            if (
                yaw !==
                null
            ) {
                localPropYaw =
                    yaw;
            }

            localPropLocked =
                true;
        } else {
            localPropLocked =
                false;

            // Immediately resume following the current camera direction.
            const yaw =
                cameraFacingYaw();

            if (
                yaw !==
                null
            ) {
                localPropYaw =
                    yaw;
            }
        }

        updateOrientationHud();

        sendPropOrientation(
            true
        );
    }

    function updatePhaseUi() {
        if (!active) return;

        if (ui.hudTitle) {
            const showRoundIntroTitle = Boolean(
                phase === "LOBBY"
                || phase === "FINISHED"
                || (
                    phase === "HIDING"
                    && Date.now() < roundIntroEndsAt
                )
            );

            ui.hudTitle.hidden = !showRoundIntroTitle;
        }

        updateOrientationHud();
        void syncPropViewHeight();

        let title = phase;
        let status = "";
        
        const counts = teamCounts();
        const compactTeamStatus =
            `Finders: ${counts.seekers} • Hiders left: ${counts.activeHiders}/${counts.totalHiders} • Found: ${counts.caughtHiders}`;

        if (ui.teamStats) {
            ui.teamStats.textContent = active
                ? compactTeamStatus
                : "";
        }

        if (phase === "LOBBY") {
            title = lobbyCountdown == null
                ? "LOBBY"
                : `LOBBY • ${lobbyCountdown}s`;
            status = "Minimum 3 players. Round starts when enough players are ready.";
        } else if (phase === "HIDING") {
            const time = phaseEndsAt ? formatClock(phaseEndsAt - Date.now()) : "1:00";
            title = `HIDING • ${time}`;
            status = role === "SEEKER"
                ? "Hiders are hiding. Your screen and movement are locked."
                : role === "HIDER"
                    ? "Hide anywhere in VME/VMES. Your prop follows the FPS camera direction. Press F to freeze it."
                    : "Live round in progress — spectating until the next lobby.";
        } else if (phase === "HUNT") {
            const time = phaseEndsAt ? formatClock(phaseEndsAt - Date.now()) : "4:00";
            title = `HUNT • ${time}`;
            status = role === "SEEKER"
                ? `Find the props! ${counts.activeHiders} hider(s) still need to be found.`
                : role === "HIDER"
                    ? caught
                        ? `Ghost mode. Hiders left: ${counts.activeHiders}/${counts.totalHiders}. You can move around invisibly.`
                        : `${counts.activeHiders} hider(s) remaining. Look to rotate the prop; freeze it when your hiding angle is right.`
                    : "Spectating this round.";
        } else if (phase === "FINISHED") {
            title = "ROUND OVER";
            status = roundResultMessage || "Results are being shown. The next lobby will start shortly.";
        }

        if (phase === "HIDING" || phase === "HUNT") {
            status = caught && role === "HIDER"
                ? `GHOST MODE • ${compactTeamStatus}`
                : compactTeamStatus;
        }

        ui.phase.textContent = title;
        ui.status.textContent = status;
        updateRoleUi();

        const seekerBlind = active && phase === "HIDING" && role === "SEEKER";
        ui.seekerBlind.hidden = !seekerBlind;
        if (seekerBlind) {
            ui.seekerBlindTimer.textContent = phaseEndsAt
                ? formatClock(phaseEndsAt - Date.now())
                : "1:00";
        }

        const seekerCanShoot =
            active &&
            phase === "HUNT" &&
            role === "SEEKER" &&
            !caught;

        ui.crosshair.hidden =
            !seekerCanShoot;

        ui.fireButton.hidden =
            !(
                seekerCanShoot &&
                mobile
            );

        updateAmmoUi();

        if (active) {
            localPlayer.isLocked = Boolean(
                role === "SPECTATOR"
                || (phase === "HIDING" && role === "SEEKER")
                || phase === "FINISHED"
            );
        }
    }

    function setActive(next) {
        active = Boolean(next);
        boundaryVisual?.setEnabled?.(active);
        ui.hud.hidden = !active;
        ui.returnButton.hidden = !active;
        ui.joinPanel.hidden = true;
        setFullMinigameState(active, "propHunt");
        boundaryVisual.setVisible(active);
        boundaryVisuals.root.setEnabled(active);

        // v1.3 always uses the normal FPS camera. If this browser had
        // Prop Hunt v1.1/v1.2 active before a hot reload, explicitly restore
        // FPS once and never enter TPS again.
        scene.metadata
            ?.cameraModeController
            ?.exitPropHuntThirdPerson
            ?.();

        if (!active) {
            restoreNormalFpsView();

            role = "NONE";
            localPropId = null;
            phase = "IDLE";
            phaseEndsAt = null;
            lobbyCountdown = null;
            caught = false;
            bulletsRemaining = 0;
            roundResultMessage = "";
            hideCaughtOverlay();

            localPropYaw = 0;
            localPropLocked = false;
            lastSentPropYaw = null;
            lastSentPropLocked = null;
            lastOrientationHudKey = "";

            localPlayer.isLocked = false;
            ui.seekerBlind.hidden = true;
            ui.crosshair.hidden = true;
            ui.fireButton.hidden = true;
            ui.elevator.hidden = true;
            ui.propHud.hidden = true;

            void propHudPreview
                .setProp(
                    null,
                    0
                );

            ui.ammoHud.hidden = true;
            participants.clear();
            syncPropVisuals();
        }
    }

    function portalDistance() {
        return BABYLON.Vector3.Distance(
            localPlayer.position,
            new BABYLON.Vector3(
                PROP_HUNT_PORTAL_POSITION.x,
                PROP_HUNT_PORTAL_POSITION.y + 1,
                PROP_HUNT_PORTAL_POSITION.z
            )
        );
    }

    function elevatorAtPlayer() {
        if (!active || role === "SPECTATOR") return null;
        if (phase !== "HIDING" && phase !== "HUNT") return null;
        if (phase === "HIDING" && role === "SEEKER") return null;

        for (const shaft of PROP_HUNT_ELEVATORS) {
            if (horizontalDistance(localPlayer.position, shaft) > PROP_HUNT_ELEVATOR_HORIZONTAL_RADIUS) {
                continue;
            }

            for (let floor = 1; floor <= PROP_HUNT_FLOOR_SURFACE_Y.length; floor += 1) {
                const y = floorCenterY(floor);
                if (
                    Number.isFinite(y)
                    && Math.abs(localPlayer.position.y - y) <= PROP_HUNT_ELEVATOR_VERTICAL_TOLERANCE
                ) {
                    return { shaft, floor };
                }
            }
        }
        return null;
    }

    function renderElevatorPanel(elevator) {
        if (!elevator || pendingElevator) {
            ui.elevator.hidden = true;
            return;
        }

        ui.elevatorTitle.textContent = `🛗 ${elevator.shaft.label} • Floor ${elevator.floor}`;
        ui.elevatorFloors.replaceChildren();

        for (let floor = 1; floor <= 11; floor += 1) {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "prop-hunt-floor-button";
            button.textContent = String(floor);
            button.disabled = floor === elevator.floor;
            button.addEventListener("click", () => {
                if (pendingElevator || button.disabled) return;
                socket.emit("propHunt:elevatorRequest", {
                    shaftId: elevator.shaft.id,
                    targetFloor: floor
                });
                ui.elevator.hidden = true;
            });
            ui.elevatorFloors.appendChild(button);
        }

        ui.elevator.hidden = false;
    }

    async function prepareElevatorTravel(payload) {
        if (
            !payload
            || typeof payload.requestId !== "string"
            || !isFiniteVector(payload.target)
        ) {
            return;
        }

        if (pendingElevator) return;

        pendingElevator = {
            requestId: payload.requestId,
            lease: null,
            previousLock: Boolean(localPlayer.isLocked)
        };

        scene.metadata = scene.metadata || {};
        scene.metadata.propHuntTeleportActive = true;
        localPlayer.isLocked = true;
        document.exitPointerLock?.();

        ui.loadingFade.hidden = false;
        ui.loadingText.textContent = `Loading Floor ${payload.targetFloor}...`;
        await nextFrame();
        ui.loadingFade.classList.add("active");
        await wait(200);

        try {
            const manager = scene.metadata?.chunkManager;
            if (manager?.preparePosition) {
                pendingElevator.lease = await manager.preparePosition(
                    payload.target,
                    {
                        timeoutMs: 10_000,
                        horizontalPadding: 0.75,
                        verticalPadding: 2.25
                    }
                );
            }

            await nextFrame();
            await nextFrame();

            ui.loadingText.textContent = `Arriving at Floor ${payload.targetFloor}...`;
            socket.emit("propHunt:elevatorReady", {
                requestId: payload.requestId
            });
        } catch (error) {
            console.error("Prop Hunt elevator preload failed:", error);
            socket.emit("propHunt:elevatorCancel", {
                requestId: payload.requestId
            });

            pendingElevator.lease?.release?.();
            pendingElevator = null;
            scene.metadata.propHuntTeleportActive = false;
            localPlayer.isLocked = false;
            ui.loadingText.textContent = "Floor could not be loaded. Staying here.";
            await wait(700);
            ui.loadingFade.classList.remove("active");
            await wait(200);
            ui.loadingFade.hidden = true;
        }
    }

    async function finishElevatorTravel(position) {
        if (!pendingElevator) return false;

        if (typeof localPlayer.setExactTeleportPosition === "function") {
            localPlayer.setExactTeleportPosition(position);
        } else {
            localPlayer.position.copyFromFloats(position.x, position.y, position.z);
        }

        await nextFrame();
        await nextFrame();

        pendingElevator.lease?.release?.();
        const previousLock = pendingElevator.previousLock;
        pendingElevator = null;
        scene.metadata.propHuntTeleportActive = false;
        localPlayer.isLocked = previousLock;

        ui.loadingFade.classList.remove("active");
        await wait(220);
        ui.loadingFade.hidden = true;
        updatePhaseUi();
        return true;
    }

    function showShot(origin, hitPoint, shooterSocketId) {
        createTracer(scene, origin, hitPoint);
        createImpactEffect(scene, hitPoint);

        if (shooterSocketId === socket.id) {
            createMuzzleFlash(
                scene,
                scene.activeCamera
            );
        }
    }

    function shoot() {
        if (
            !active ||
            role !== "SEEKER" ||
            phase !== "HUNT" ||
            caught ||
            bulletsRemaining <= 0
        ) {
            return;
        }

        const now = performance.now();
        if (now - lastShotAt < 300) return;
        lastShotAt = now;

        const camera = scene.activeCamera;
        if (!camera) return;

        const ray = camera.getForwardRay(55);
        const hit = scene.pickWithRay(ray, (mesh) => {
            if (!mesh?.isEnabled?.() || !mesh.isVisible || !mesh.isPickable) return false;
            if (mesh === localPlayer || mesh.isDescendantOf?.(localPlayer)) return false;
            return true;
        });

        const origin = camera.globalPosition.clone();
        const hitPoint = hit?.hit && hit.pickedPoint
            ? hit.pickedPoint.clone()
            : origin.add(ray.direction.scale(55));
        const targetSocketId = hit?.pickedMesh?.metadata?.propHuntTargetSocketId || null;

        playGunFireSound();
        showShot(origin, hitPoint, socket.id);

        socket.emit("propHunt:shoot", {
            targetSocketId,
            origin: { x: origin.x, y: origin.y, z: origin.z },
            direction: { x: ray.direction.x, y: ray.direction.y, z: ray.direction.z },
            hitPoint: { x: hitPoint.x, y: hitPoint.y, z: hitPoint.z }
        });
    }

    async function requestJoin() {
        if (active || minigameBlockedByOther || !socket.connected) return false;
        if (portalDistance() > PROP_HUNT_PORTAL_TRIGGER_RADIUS + 1.5) return false;

        ui.joinButton.disabled = true;
        ui.joinButton.textContent = "Loading assets...";
        ui.joinText.textContent = "Preparing Prop Hunt props...";

        try {
            await ensureAssetsLoaded();
            ui.joinButton.textContent = "Entering...";
            socket.emit("propHunt:join");
            return true;
        } catch (error) {
            console.error("Could not prepare Prop Hunt assets:", error);
            ui.joinButton.disabled = false;
            ui.joinButton.textContent = "Join Prop Hunt";
            ui.joinText.textContent = "Could not load Prop Hunt assets. Please try again.";
            return false;
        }
    }

    function leave() {
        if (!active || !socket.connected) return false;
        socket.emit("propHunt:leave");
        return true;
    }

    const minigameEventHandler = (event) => {
        const detail = event.detail || {};
        minigameBlockedByOther = Boolean(
            detail.active && detail.type !== "propHunt"
        );
    };
    window.addEventListener("au:minigame-state", minigameEventHandler);

    ui.joinButton.addEventListener("click", () => void requestJoin());
    ui.returnButton.addEventListener("click", leave);
    ui.fireButton.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        event.stopPropagation();
        shoot();
    });

    const propOrientationKeyHandler =
        (event) => {
            if (
                event.repeat ||
                !orientationActive()
            ) {
                return;
            }

            const tag =
                String(
                    event.target
                        ?.tagName ||
                    ""
                ).toLowerCase();

            if (
                tag ===
                    "input" ||
                tag ===
                    "textarea" ||
                tag ===
                    "select"
            ) {
                return;
            }

            const key =
                String(
                    event.key ||
                    ""
                ).toLowerCase();

            if (
                key !==
                "f"
            ) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();

            togglePropLock();
        };

    window.addEventListener(
        "keydown",
        propOrientationKeyHandler,
        true
    );


    const propPreviewToggleHandler =
        (event) => {
            if (!orientationActive()) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();

            togglePropLock();
        };

    const propMobileHandler =
        (event) => {
            const button =
                event.target
                    ?.closest?.(
                        "[data-prop-action]"
                    );

            if (
                !button ||
                !orientationActive()
            ) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();

            const action =
                button.dataset
                    .propAction;

            if (
                action ===
                "lock"
            ) {
                togglePropLock();
            }
        };

    ui.propMobileControls
        ?.addEventListener(
            "pointerdown",
            propMobileHandler
        );

    ui.propPreviewCanvas
        ?.addEventListener(
            "pointerdown",
            propPreviewToggleHandler
        );

    const canvas = scene.getEngine().getRenderingCanvas();
    const pointerHandler = (event) => {
        // Desktop only: left mouse click on the 3D canvas can shoot.
        // Mobile/tablet touch is handled only by the FIRE button, otherwise
        // every screen drag/tap for camera control shoots accidentally.
        if (mobile) return;
        if (event.pointerType && event.pointerType !== "mouse") return;
        if (event.button !== 0) return;
        if (event.target !== canvas) return;
        shoot();
    };
    canvas?.addEventListener("pointerdown", pointerHandler);

    on("propHunt:started", () => {
        setActive(true);
        ui.joinButton.disabled = false;
        ui.joinButton.textContent = "Join Prop Hunt";
        void ensureAssetsLoaded().catch((error) => console.error(error));
    });

    on(
        "propHunt:role",
        (
            {
                role:
                    nextRole,
                propId,
                propYaw,
                propLocked
            } = {}
        ) => {
            role =
                nextRole ||
                "SPECTATOR";

            localPropId =
                propId ||
                null;

            localPropYaw =
                normalizeYaw(
                    Number(propYaw) ||
                    0
                );

            localPropLocked =
                Boolean(
                    propLocked
                );

            lastSentPropYaw =
                null;

            lastSentPropLocked =
                null;

            caught =
                false;

            hideCaughtOverlay();

            if (
                role ===
                    "HIDER" &&
                !localPropLocked
            ) {
                const yaw =
                    cameraFacingYaw();

                if (
                    yaw !==
                    null
                ) {
                    localPropYaw =
                        yaw;
                }
            }

            updatePhaseUi();

            // Make sure the server and all clients have the same initial
            // orientation even if a participant snapshot arrived first.
            sendPropOrientation(
                true
            );
        }
    );

    on("propHunt:phase", (payload = {}) => {
        const previousPhase = phase;
        phase = payload.phase || "IDLE";

        if (phase === "HIDING" && previousPhase !== "HIDING") {
            roundIntroEndsAt = Date.now() + 5000;
        }

        if (phase === "LOBBY" || phase === "IDLE") {
            roundIntroEndsAt = 0;
        }

        phaseEndsAt = Number.isFinite(payload.endsAt) ? payload.endsAt : null;
        if (phase === "LOBBY") {
            caught = false;
            bulletsRemaining = 0;
            roundResultMessage = "";
        }
        updatePhaseUi();
    });

    on("propHunt:lobby", ({ countdown } = {}) => {
        lobbyCountdown = Number.isFinite(countdown) ? countdown : null;
        updatePhaseUi();
    });

    on(
        "propHunt:ammo",
        (
            {
                remaining,
                max
            } = {}
        ) => {
            const serverMax =
                Number(max);

            const serverRemaining =
                Number(remaining);

            if (
                Number.isFinite(
                    serverRemaining
                )
            ) {
                bulletsRemaining =
                    Math.max(
                        0,
                        Math.min(
                            Number.isFinite(
                                serverMax
                            )
                                ? serverMax
                                : PROP_HUNT_MAX_BULLETS,
                            Math.floor(
                                serverRemaining
                            )
                        )
                    );
            }

            updateAmmoUi();
        }
    );

    on("propHunt:participants", (rows = []) => {
        participants.clear();
        if (Array.isArray(rows)) {
            rows.forEach((row) => {
                if (row?.socketId) participants.set(row.socketId, row);
            });
        }
        syncPropVisuals();
        updatePhaseUi();
    });

    on(
        "propHunt:propOrientation",
        (
            {
                socketId,
                yaw,
                locked
            } = {}
        ) => {
            if (
                typeof socketId !==
                    "string" ||
                socketId ===
                    socket.id ||
                !Number.isFinite(
                    Number(yaw)
                )
            ) {
                return;
            }

            const participant =
                participants.get(
                    socketId
                );

            if (!participant) {
                return;
            }

            participant.propYaw =
                normalizeYaw(
                    Number(yaw)
                );

            participant.propLocked =
                Boolean(
                    locked
                );

            participants.set(
                socketId,
                participant
            );
        }
    );

    on("propHunt:teleport", async ({ position, reason } = {}) => {
        if (!isFiniteVector(position)) return;

        if (reason === "elevator" && pendingElevator) {
            await finishElevatorTravel(position);
            return;
        }

        if (typeof localPlayer.setGroundedPosition === "function") {
            localPlayer.setGroundedPosition(position, `prop-hunt-${reason || "teleport"}`);
        } else {
            localPlayer.position.copyFromFloats(position.x, position.y, position.z);
        }
    });

    on("propHunt:correction", (payload) => {
        const position =
            isFiniteVector(payload?.position)
                ? payload.position
                : payload;

        const reason =
            typeof payload?.reason === "string"
                ? payload.reason
                : "correction";

        if (!isFiniteVector(position)) return;

        if (
            reason === "out_of_bounds" &&
            typeof localPlayer.setGroundedPosition === "function"
        ) {
            localPlayer.setGroundedPosition(
                position,
                "prop-hunt-boundary"
            );
            return;
        }

        if (typeof localPlayer.setExactTeleportPosition === "function") {
            localPlayer.setExactTeleportPosition(position);
        } else {
            localPlayer.position.copyFromFloats(position.x, position.y, position.z);
        }
    });

    on("propHunt:elevatorAuthorized", (payload) => {
        void prepareElevatorTravel(payload);
    });

    on("propHunt:elevatorError", async (message) => {
        if (pendingElevator) {
            pendingElevator.lease?.release?.();
            pendingElevator = null;
        }
        scene.metadata.propHuntTeleportActive = false;
        localPlayer.isLocked = false;
        ui.loadingText.textContent = message || "Elevator failed. Please try again.";
        ui.loadingFade.classList.remove("active");
        await wait(300);
        ui.loadingFade.hidden = true;
        updatePhaseUi();
    });

    on("propHunt:shot", ({ shooterSocketId, origin, hitPoint } = {}) => {
        if (!isFiniteVector(origin) || !isFiniteVector(hitPoint)) return;
        if (shooterSocketId === socket.id) return;
        showShot(origin, hitPoint, shooterSocketId);
    });

    on("propHunt:playerCaught", ({ socketId, bySocketId, hitPoint } = {}) => {
        if (bySocketId !== socket.id && isFiniteVector(hitPoint)) {
            createImpactEffect(scene, hitPoint);
        }
        const participant = participants.get(socketId);
        if (participant) {
            participant.caught = true;
            participants.set(socketId, participant);
        }
        syncPropVisuals();
        updatePhaseUi();
    });

    on("propHunt:caught", () => {
        caught = true;
        localPlayer.isLocked = false;
        restoreNormalFpsView();
        showCaughtOverlay();
        updatePhaseUi();
    });

    on("propHunt:finished", ({ winner } = {}) => {
        phase = "FINISHED";
        phaseEndsAt = null;
        roundResultMessage = winner === "SEEKER"
            ? "The Seeker found every Hider."
            : "Time expired — surviving Hiders win!";
        updatePhaseUi();
    });

    on("propHunt:personalResult", ({ pointsEarned = 0 } = {}) => {
        const reward = Number(pointsEarned) || 0;
        roundResultMessage = `${roundResultMessage ? `${roundResultMessage} ` : ""}Reward: +${reward} Campus Points.`;
        updatePhaseUi();
    });

    on("propHunt:error", (message) => {
        ui.joinButton.disabled = false;
        ui.joinButton.textContent = "Join Prop Hunt";
        ui.joinText.textContent = message || "Could not join Prop Hunt.";
        if (!active) ui.joinPanel.hidden = false;
    });

    on("propHunt:left", () => {
        setActive(false);
    });

    on("disconnect", () => {
        if (active) setActive(false);
    });

    const observer = scene.onBeforeRenderObservable.add(() => {
        if (disposed) return;

        if (!active) {
            const nearPortal = !minigameBlockedByOther
                && socket.connected
                && portalDistance() <= PROP_HUNT_PORTAL_TRIGGER_RADIUS;
            ui.joinPanel.hidden = !nearPortal;
        } else {
            ui.joinPanel.hidden = true;
        }

        if (active) {
            setRemoteIsolation();
            updatePhaseUi();
            updatePropFacingFromCamera();

            const elevator = elevatorAtPlayer();
            const elevatorKey = elevator
                ? `${elevator.shaft.id}:${elevator.floor}`
                : null;
            const currentKey = currentElevator
                ? `${currentElevator.shaft.id}:${currentElevator.floor}`
                : null;

            if (elevatorKey !== currentKey) {
                currentElevator = elevator;
                renderElevatorPanel(elevator);
            }

            if (!elevator) {
                ui.elevator.hidden = true;
            }
        }

        participants.forEach((participant, socketId) => {
            if (socketId === socket.id) return;
            const remotePlayer = remotePlayers?.get(socketId);
            if (!remotePlayer) return;

            if (
                participant.role === "HIDER"
                && !participant.caught
                && participant.propId
                && !propVisuals.has(socketId)
            ) {
                void ensurePropVisual(socketId, participant.propId);
            }
        });

        propVisuals.forEach((propVisual, socketId) => {
            // Local Hiders use the facing HUD in FPS and do not render their
            // own prop model around the camera.
            if (
                socketId ===
                socket.id
            ) {
                destroyPropVisual(
                    socketId
                );

                return;
            }

            const remotePlayer =
                remotePlayers?.get(
                    socketId
                );

            const participant =
                participants.get(
                    socketId
                );

            if (
                !remotePlayer ||
                !participant
            ) {
                destroyPropVisual(
                    socketId
                );

                return;
            }

            propVisual.visual.position
                .copyFrom(
                    remotePlayer
                        .rootMesh
                        .position
                );

            propVisual.visual.position.y -=
                PROP_HUNT_PLAYER_CENTER_OFFSET_Y;

            const targetYaw =
                Number.isFinite(
                    Number(
                        participant
                            .propYaw
                    )
                )
                    ? normalizeYaw(
                        Number(
                            participant
                                .propYaw
                        ) +
                        PROP_HUNT_VISUAL_YAW_OFFSET
                    )
                    : normalizeYaw(
                        remotePlayer
                            .rootMesh
                            .rotation
                            .y +
                        PROP_HUNT_VISUAL_YAW_OFFSET
                    );

            propVisual.visual.rotation.y =
                normalizeYaw(
                    propVisual
                        .visual
                        .rotation
                        .y +
                    shortestYawDelta(
                        propVisual
                            .visual
                            .rotation
                            .y,
                        targetYaw
                    ) *
                        0.28
                );
        });
    });

    return {
        requestJoin,
        leave,
        isActive() {
            return active;
        },
        dispose() {
            disposed = true;
            scene.onBeforeRenderObservable.remove(observer);
            window.removeEventListener("au:minigame-state", minigameEventHandler);
            window.removeEventListener(
                "keydown",
                propOrientationKeyHandler,
                true
            );
            ui.propMobileControls?.removeEventListener(
                "pointerdown",
                propMobileHandler
            );
            ui.propPreviewCanvas?.removeEventListener(
                "pointerdown",
                propPreviewToggleHandler
            );
            canvas?.removeEventListener("pointerdown", pointerHandler);
            socketHandlers.forEach(([event, handler]) => socket.off(event, handler));
            socketHandlers.length = 0;

            if (active && socket.connected) {
                socket.emit("propHunt:leave");
            }

            pendingElevator?.lease?.release?.();
            if (scene.metadata) scene.metadata.propHuntTeleportActive = false;

            [...propVisuals.keys()].forEach(destroyPropVisual);
            restoreNormalFpsView();

            propViewTarget
                ?.dispose();

            propViewTarget =
                null;

            propHudPreview.dispose();

            propContainers.forEach((container) => container.dispose());
            propContainers.clear();
            propMetrics.clear();

            disposeShotEffectPool(
                scene
            );
boundaryVisual.dispose();
            portal.dispose();

            [
                ui.joinPanel,
                ui.hud,
                ui.elevator,
                ui.returnButton,
                ui.fireButton,
                ui.crosshair,
                ui.propHud,
                ui.loadingFade,
                ui.seekerBlind,
                ui.caughtOverlay
            ].forEach((element) => element.remove());
        }
    };
}
