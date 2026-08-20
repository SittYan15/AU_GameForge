// core/input.js
import * as BABYLON from "@babylonjs/core";

export class InputController {
    constructor(
        scene,
        camera,
        player,
        headNode,
        sharedInputMap
    ) {
        this.scene = scene;
        this.camera = camera;
        this.player = player;
        this.headNode = headNode;
        this.inputMap = sharedInputMap;

        // FPS-only mode.
        // No TPS raycasts, no TPS obstruction checks, no camera switching.
        this.applyFirstPersonMode();

        this.setupKeyboard();
        this.setupMobile();

        this.scene.onPointerDown = (evt) => {
            if (
                evt.button === 0 &&
                !this.isMobileDevice()
            ) {
                this.scene
                    .getEngine()
                    .enterPointerlock();
            }
        };
    }

    applyFirstPersonMode() {
        this.camera.lockedTarget =
            this.headNode;

        // Keep the ArcRotateCamera effectively at the player's head.
        this.camera.lowerRadiusLimit = 0.01;
        this.camera.upperRadiusLimit = 0.01;
        this.camera.radius = 0.01;

        // Allow looking almost fully up/down.
        this.camera.lowerBetaLimit = 0.05;
        this.camera.upperBetaLimit =
            Math.PI - 0.05;

        // No panning in FPS.
        this.camera.panningSensibility = 0;

        // Slight smoothing.
        this.camera.inertia = 0.6;

        const pointerInput =
            this.camera.inputs
                ?.attached
                ?.pointers;

        if (pointerInput) {
            pointerInput.angularSensibilityX = 1500;
            pointerInput.angularSensibilityY = 1500;

            if (
                "panningSensibility" in
                pointerInput
            ) {
                pointerInput.panningSensibility = 0;
            }
        }

        // Hide the local character mesh in FPS.
        if (this.player.characterMesh) {
            this.player.characterMesh.setEnabled(
                false
            );
        }
    }

    setupKeyboard() {
        this.scene.actionManager =
            new BABYLON.ActionManager(
                this.scene
            );

        this.scene.actionManager
            .registerAction(
                new BABYLON.ExecuteCodeAction(
                    BABYLON.ActionManager
                        .OnKeyDownTrigger,
                    (evt) => {
                        const key =
                            evt.sourceEvent
                                .key
                                .toLowerCase();

                        this.inputMap[key] =
                            true;
                    }
                )
            );

        this.scene.actionManager
            .registerAction(
                new BABYLON.ExecuteCodeAction(
                    BABYLON.ActionManager
                        .OnKeyUpTrigger,
                    (evt) => {
                        const key =
                            evt.sourceEvent
                                .key
                                .toLowerCase();

                        this.inputMap[key] =
                            false;

                        // V intentionally does nothing.
                        // TPS camera switching has been removed.
                    }
                )
            );
    }

    setupMobile() {
        if (!this.isMobileDevice()) {
            return;
        }

        const mobileUI =
            document.getElementById(
                "mobileController"
            );

        if (mobileUI) {
            mobileUI.style.display =
                "block";
        }

        // Hide the camera-switch button because FPS is the only camera mode.
        const cameraButton =
            document.getElementById(
                "btn-cam"
            );

        if (cameraButton) {
            cameraButton.style.display =
                "none";
        }

        const bindTouchButton = (
            elementId,
            key
        ) => {
            const el =
                document.getElementById(
                    elementId
                );

            if (!el) {
                return;
            }

            el.addEventListener(
                "touchstart",
                (e) => {
                    e.preventDefault();

                    this.inputMap[key] =
                        true;
                },
                {
                    passive: false
                }
            );

            el.addEventListener(
                "touchend",
                (e) => {
                    e.preventDefault();

                    this.inputMap[key] =
                        false;
                },
                {
                    passive: false
                }
            );
        };

        bindTouchButton(
            "btn-jump",
            " "
        );

        const joystickZone =
            document.getElementById(
                "joystick-zone"
            );

        const joystickKnob =
            document.getElementById(
                "joystick-knob"
            );

        let joystickCenter = {
            x: 0,
            y: 0
        };

        let joystickActive = false;
        let activeTouchId = null;

        const walkThreshold = 10;
        const runThreshold = 45;
        const maxRadius = 60;

        if (
            joystickZone &&
            joystickKnob
        ) {
            const handleJoystickMove = (
                touch
            ) => {
                const dx =
                    touch.clientX -
                    joystickCenter.x;

                const dy =
                    touch.clientY -
                    joystickCenter.y;

                const distance =
                    Math.sqrt(
                        dx * dx +
                        dy * dy
                    );

                let visualDx = dx;
                let visualDy = dy;

                if (
                    distance >
                    maxRadius
                ) {
                    visualDx =
                        (
                            dx /
                            distance
                        ) *
                        maxRadius;

                    visualDy =
                        (
                            dy /
                            distance
                        ) *
                        maxRadius;
                }

                joystickKnob.style.transform =
                    `translate(calc(-50% + ${visualDx}px), calc(-50% + ${visualDy}px))`;

                this.inputMap["w"] =
                    dy <
                    -walkThreshold;

                this.inputMap["s"] =
                    dy >
                    walkThreshold;

                this.inputMap["a"] =
                    dx <
                    -walkThreshold;

                this.inputMap["d"] =
                    dx >
                    walkThreshold;

                this.inputMap["shift"] =
                    distance >
                    runThreshold;
            };

            joystickZone.addEventListener(
                "touchstart",
                (e) => {
                    e.preventDefault();

                    if (
                        joystickActive
                    ) {
                        return;
                    }

                    joystickActive = true;

                    const touch =
                        e.changedTouches[0];

                    activeTouchId =
                        touch.identifier;

                    const rect =
                        joystickZone
                            .getBoundingClientRect();

                    joystickCenter = {
                        x:
                            rect.left +
                            rect.width /
                            2,
                        y:
                            rect.top +
                            rect.height /
                            2
                    };

                    handleJoystickMove(
                        touch
                    );
                },
                {
                    passive: false
                }
            );

            joystickZone.addEventListener(
                "touchmove",
                (e) => {
                    if (
                        !joystickActive
                    ) {
                        return;
                    }

                    e.preventDefault();

                    for (
                        let i = 0;
                        i <
                        e.changedTouches
                            .length;
                        i += 1
                    ) {
                        if (
                            e.changedTouches[i]
                                .identifier ===
                            activeTouchId
                        ) {
                            handleJoystickMove(
                                e.changedTouches[i]
                            );

                            break;
                        }
                    }
                },
                {
                    passive: false
                }
            );

            const resetJoystick = (
                e
            ) => {
                if (
                    !joystickActive
                ) {
                    return;
                }

                if (e) {
                    let touchEnded =
                        false;

                    for (
                        let i = 0;
                        i <
                        e.changedTouches
                            .length;
                        i += 1
                    ) {
                        if (
                            e.changedTouches[i]
                                .identifier ===
                            activeTouchId
                        ) {
                            touchEnded =
                                true;

                            break;
                        }
                    }

                    if (
                        !touchEnded
                    ) {
                        return;
                    }

                    e.preventDefault();
                }

                joystickActive = false;
                activeTouchId = null;

                joystickKnob.style.transform =
                    "translate(-50%, -50%)";

                this.inputMap["w"] = false;
                this.inputMap["a"] = false;
                this.inputMap["s"] = false;
                this.inputMap["d"] = false;
                this.inputMap["shift"] = false;
            };

            joystickZone.addEventListener(
                "touchend",
                resetJoystick,
                {
                    passive: false
                }
            );

            joystickZone.addEventListener(
                "touchcancel",
                resetJoystick,
                {
                    passive: false
                }
            );
        }

        const fullscreenBtn =
            document.getElementById(
                "btn-fullscreen"
            );

        if (fullscreenBtn) {
            fullscreenBtn
                .addEventListener(
                    "touchstart",
                    (e) => {
                        e.preventDefault();

                        this.toggleFullScreen();
                    },
                    {
                        passive: false
                    }
                );
        }
    }

    isMobileDevice() {
        return (
            /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
                .test(
                    navigator.userAgent
                ) ||
            navigator.maxTouchPoints >
                0
        );
    }

    toggleFullScreen() {
        const doc =
            window.document;

        const docEl =
            doc.documentElement;

        const requestFullScreen =
            docEl.requestFullscreen ||
            docEl.mozRequestFullScreen ||
            docEl.webkitRequestFullScreen ||
            docEl.msRequestFullscreen;

        const cancelFullScreen =
            doc.exitFullscreen ||
            doc.mozCancelFullScreen ||
            doc.webkitExitFullscreen ||
            doc.msExitFullscreen;

        if (
            !doc.fullscreenElement &&
            !doc.mozFullScreenElement &&
            !doc.webkitFullscreenElement &&
            !doc.msFullscreenElement
        ) {
            if (
                requestFullScreen
            ) {
                requestFullScreen.call(
                    docEl
                );
            }
        } else if (
            cancelFullScreen
        ) {
            cancelFullScreen.call(
                doc
            );
        }
    }
}
