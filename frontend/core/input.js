// core/input.js
import * as BABYLON from "@babylonjs/core";

// CAMERA_SENSITIVITY_INPUT_V1
const CAMERA_SENSITIVITY_STORAGE_KEY =
    "au_camera_sensitivity";

const CAMERA_SENSITIVITY_DEFAULT =
    5;

function clampCameraSensitivity(
    value
) {
    return Math.max(
        1,
        Math.min(
            10,
            Math.round(
                Number(value) ||
                CAMERA_SENSITIVITY_DEFAULT
            )
        )
    );
}

function readCameraSensitivity() {
    try {
        return clampCameraSensitivity(
            window.localStorage.getItem(
                CAMERA_SENSITIVITY_STORAGE_KEY
            )
        );
    } catch {
        return CAMERA_SENSITIVITY_DEFAULT;
    }
}

function cameraSensitivityToAngularSensibility(
    value
) {
    const level =
        clampCameraSensitivity(
            value
        );

    // Babylon uses an inverse scale:
    // smaller angularSensibility = faster camera movement.
    // Level 5 preserves the previous value of 1500.
    return Math.round(
        1500 *
        Math.pow(
            2,
            (
                CAMERA_SENSITIVITY_DEFAULT -
                level
            ) /
            4
        )
    );
}

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
        this.iosFullscreenActive = false;
        this.iosFullscreenCleanup = null;

        this.cameraSensitivity =
            readCameraSensitivity();

        this.cameraSensitivityChangeHandler =
            (event) => {
                this.cameraSensitivity =
                    clampCameraSensitivity(
                        event.detail?.value
                    );

                this.applyCameraSensitivity();
            };

        window.addEventListener(
            "au:camera-sensitivity-changed",
            this.cameraSensitivityChangeHandler
        );

        // Campus Quiz can temporarily switch the same ArcRotateCamera
        // from FPS into a locked arena overview and then restore FPS.
        this.isFixedCamera = false;
        this.fixedCameraSnapshot = null;


        this.scene.metadata =
            this.scene.metadata || {};

        this.scene.metadata.cameraModeController =
            this;

        // FPS-only mode.
        // No TPS raycasts, no TPS obstruction checks, no camera switching.
        this.applyFirstPersonMode();

        this.setupKeyboard();
        this.setupMobile();
        this.setupDesktopFullscreen();

        this.scene.onPointerDown = (evt) => {
            if (
                evt.button === 0 &&
                !this.isMobileDevice() &&
                !this.isFixedCamera
            ) {
                this.scene
                    .getEngine()
                    .enterPointerlock();
            }
        };
    }

    applyFirstPersonMode() {
        this.isFixedCamera = false;

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
            this.applyCameraSensitivity();

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



    applyCameraSensitivity() {
        const pointerInput =
            this.camera.inputs
                ?.attached
                ?.pointers;

        if (!pointerInput) {
            return;
        }

        const angularSensibility =
            cameraSensitivityToAngularSensibility(
                this.cameraSensitivity
            );

        pointerInput.angularSensibilityX =
            angularSensibility;

        pointerInput.angularSensibilityY =
            angularSensibility;
    }


    enterCampusQuizFixedCamera() {
        if (this.isFixedCamera) {
            return;
        }

        this.fixedCameraSnapshot = {
            alpha: this.camera.alpha,
            beta: this.camera.beta,
            radius: this.camera.radius,
            lowerRadiusLimit:
                this.camera.lowerRadiusLimit,
            upperRadiusLimit:
                this.camera.upperRadiusLimit,
            lowerBetaLimit:
                this.camera.lowerBetaLimit,
            upperBetaLimit:
                this.camera.upperBetaLimit,
            panningSensibility:
                this.camera.panningSensibility,
            inertia:
                this.camera.inertia
        };

        this.isFixedCamera = true;

        document.exitPointerLock?.();

        // Prevent mouse/touch from rotating the arena camera.
        this.camera.detachControl();

        // Fixed spectator-style view from the safe-platform side,
        // looking toward the answer floors and giant question wall.
        const fixedTarget =
            new BABYLON.Vector3(
                165.56,
                1.8,
                -50.2
            );

        this.camera.lockedTarget =
            fixedTarget;

        this.camera.alpha =
            Math.PI / 2;

        this.camera.beta =
            1.22;

        this.camera.lowerBetaLimit =
            1.22;

        this.camera.upperBetaLimit =
            1.22;

        // v3: bring the fixed Campus Quiz camera a little closer to the
        // question wall while keeping all four answer floors in view.
        this.camera.radius =
            32;

        this.camera.lowerRadiusLimit =
            32;

        this.camera.upperRadiusLimit =
            32;

        this.camera.panningSensibility =
            0;

        this.camera.inertia =
            0;

        // The player must be visible from the fixed camera.
        if (this.player.characterMesh) {
            this.player.characterMesh.setEnabled(
                true
            );
        }
    }

    exitCampusQuizFixedCamera() {
        if (!this.isFixedCamera) {
            return;
        }

        const snapshot =
            this.fixedCameraSnapshot;

        this.fixedCameraSnapshot =
            null;

        // Re-enter the normal FPS configuration.
        this.applyFirstPersonMode();

        if (snapshot) {
            this.camera.alpha =
                snapshot.alpha;

            this.camera.beta =
                snapshot.beta;
        }

        const canvas =
            this.scene
                .getEngine()
                .getRenderingCanvas();

        if (canvas) {
            this.camera.attachControl(
                canvas,
                true
            );
        }
    }


    setupDesktopFullscreen() {
        const button =
            document.getElementById(
                "desktopFullscreenButton"
            );

        if (!button) {
            return;
        }

        const updateLabel =
            () => {
                const active =
                    Boolean(
                        this.iosFullscreenActive ||
                        document.fullscreenElement ||
                        document.webkitFullscreenElement ||
                        document.mozFullScreenElement ||
                        document.msFullscreenElement
                    );

                button.textContent =
                    active
                        ? "🗗 Exit Full Screen"
                        : "⛶ Full Screen";

                button.setAttribute(
                    "aria-pressed",
                    active
                        ? "true"
                        : "false"
                );
            };

        button.addEventListener(
            "click",
            () => {
                this.toggleFullScreen();
            }
        );

        document.addEventListener(
            "fullscreenchange",
            updateLabel
        );

        document.addEventListener(
            "webkitfullscreenchange",
            updateLabel
        );

        document.addEventListener(
            "iosfullscreenchange",
            updateLabel
        );

        updateLabel();
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

    isIPhoneIOS() {
        return /iPhone|iPod/i.test(
            navigator.userAgent || ""
        );
    }

    enterIOSFullscreen() {
        if (this.iosFullscreenActive) {
            return;
        }

        const viewport =
            document.getElementById(
                "gameViewport"
            );

        if (!viewport) {
            return;
        }

        const root = document.documentElement;
        const body = document.body;
        const engine = this.scene.getEngine();
        const visualViewport =
            window.visualViewport;
        const previousViewportStyles = {
            height: viewport.style.getPropertyValue(
                "--ios-viewport-height"
            ),
            top: viewport.style.getPropertyValue(
                "--ios-viewport-offset-top"
            ),
            left: viewport.style.getPropertyValue(
                "--ios-viewport-offset-left"
            )
        };
        let resizeFrame = null;
        let orientationTimer = null;

        const resizeToAvailableViewport = () => {
            const height = Math.round(
                visualViewport?.height ||
                window.innerHeight
            );
            const offsetTop = Math.round(
                visualViewport?.offsetTop || 0
            );
            const offsetLeft = Math.round(
                visualViewport?.offsetLeft || 0
            );

            viewport.style.setProperty(
                "--ios-viewport-height",
                `${height}px`
            );
            viewport.style.setProperty(
                "--ios-viewport-offset-top",
                `${offsetTop}px`
            );
            viewport.style.setProperty(
                "--ios-viewport-offset-left",
                `${offsetLeft}px`
            );

            engine.resize();
        };

        const scheduleResize = () => {
            if (resizeFrame !== null) {
                window.cancelAnimationFrame(
                    resizeFrame
                );
            }

            resizeFrame =
                window.requestAnimationFrame(
                    () => {
                        resizeFrame = null;
                        resizeToAvailableViewport();
                    }
                );
        };

        const handleOrientationChange = () => {
            scheduleResize();
            window.clearTimeout(
                orientationTimer
            );
            orientationTimer =
                window.setTimeout(
                    scheduleResize,
                    250
                );
        };

        this.iosFullscreenActive = true;
        root.classList.add(
            "ios-fullscreen-mode"
        );
        body.classList.add(
            "ios-fullscreen-mode"
        );
        viewport.classList.add(
            "ios-fullscreen-mode"
        );

        window.addEventListener(
            "resize",
            scheduleResize
        );
        window.addEventListener(
            "orientationchange",
            handleOrientationChange
        );
        visualViewport?.addEventListener(
            "resize",
            scheduleResize
        );
        visualViewport?.addEventListener(
            "scroll",
            scheduleResize
        );

        this.iosFullscreenCleanup = () => {
            window.removeEventListener(
                "resize",
                scheduleResize
            );
            window.removeEventListener(
                "orientationchange",
                handleOrientationChange
            );
            visualViewport?.removeEventListener(
                "resize",
                scheduleResize
            );
            visualViewport?.removeEventListener(
                "scroll",
                scheduleResize
            );
            window.clearTimeout(
                orientationTimer
            );

            if (resizeFrame !== null) {
                window.cancelAnimationFrame(
                    resizeFrame
                );
            }

            root.classList.remove(
                "ios-fullscreen-mode"
            );
            body.classList.remove(
                "ios-fullscreen-mode"
            );
            viewport.classList.remove(
                "ios-fullscreen-mode"
            );

            const restoreProperty = (
                name,
                value
            ) => {
                if (value) {
                    viewport.style.setProperty(
                        name,
                        value
                    );
                } else {
                    viewport.style.removeProperty(
                        name
                    );
                }
            };

            restoreProperty(
                "--ios-viewport-height",
                previousViewportStyles.height
            );
            restoreProperty(
                "--ios-viewport-offset-top",
                previousViewportStyles.top
            );
            restoreProperty(
                "--ios-viewport-offset-left",
                previousViewportStyles.left
            );

            this.iosFullscreenActive = false;
            this.iosFullscreenCleanup = null;
            engine.resize();
            document.dispatchEvent(
                new Event(
                    "iosfullscreenchange"
                )
            );
        };

        resizeToAvailableViewport();
        document.dispatchEvent(
            new Event(
                "iosfullscreenchange"
            )
        );
    }

    exitIOSFullscreen() {
        this.iosFullscreenCleanup?.();
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

        const fullscreenElement =
            doc.fullscreenElement ||
            doc.mozFullScreenElement ||
            doc.webkitFullscreenElement ||
            doc.msFullscreenElement;

        if (this.iosFullscreenActive) {
            this.exitIOSFullscreen();
            return;
        }

        if (
            this.isIPhoneIOS() &&
            !fullscreenElement
        ) {
            const fullscreenEnabled =
                doc.fullscreenEnabled === true ||
                doc.webkitFullscreenEnabled === true;

            if (
                !requestFullScreen ||
                !fullscreenEnabled
            ) {
                this.enterIOSFullscreen();
                return;
            }

            try {
                const request =
                    requestFullScreen.call(
                        docEl
                    );

                Promise.resolve(request).then(
                    () => {
                        if (
                            !doc.fullscreenElement &&
                            !doc.webkitFullscreenElement
                        ) {
                            this.enterIOSFullscreen();
                        }
                    },
                    () => {
                        if (
                            !doc.fullscreenElement &&
                            !doc.webkitFullscreenElement
                        ) {
                            this.enterIOSFullscreen();
                        }
                    }
                );
            } catch {
                this.enterIOSFullscreen();
            }

            return;
        }

        if (
            !fullscreenElement
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
