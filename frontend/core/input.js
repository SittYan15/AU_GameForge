// core/input.js
import * as BABYLON from "@babylonjs/core";

export class InputController {
    // FIXED: Added sharedInputMap to the constructor arguments
    constructor(scene, camera, player, headNode, sharedInputMap, targetZoom = 6) {
        this.scene = scene;
        this.camera = camera;
        this.player = player;
        this.headNode = headNode;
        this.targetZoom = targetZoom;
        this.isFirstPerson = true;
        this.inputMap = sharedInputMap;

        this.setupKeyboard();
        this.setupMobile();

        this.scene.onPointerDown = (evt) => {
            // evt.button === 0 means "Left Mouse Click"
            if (evt.button === 0) {
                this.scene.getEngine().enterPointerlock();
            }
        };

        this.scene.onBeforeRenderObservable.add(() => {
            // Only do this in third-person mode
            if (this.player && !this.isFirstPerson) {
                // 1. Shoot a laser from the player's head towards the camera
                let headPosition = this.player.position.clone();
                headPosition.y += 1.5; // Lift the laser up to shoulder/head level

                let direction = this.camera.position.subtract(headPosition).normalize();
                let ray = new BABYLON.Ray(headPosition, direction, this.targetZoom);

                // 2. Check if the laser hits any walls on the map
                let hit = this.scene.pickWithRay(ray, (mesh) => {
                    return mesh.checkCollisions && mesh.isVisible && mesh.name !== "player" && !mesh.name.includes("_collider");
                });

                if (hit.hit) {
                    // Wall detected! Snap the camera tightly in front of the wall
                    this.camera.radius = hit.distance - 0.2;
                } else {
                    // No wall! Smoothly glide the camera back out to the player's desired zoom
                    this.camera.radius = BABYLON.Scalar.Lerp(this.camera.radius, this.targetZoom, 0.1);
                }
            }
        });
    }

    toggleCameraMode() {
        this.isFirstPerson = !this.isFirstPerson;
        if (this.isFirstPerson) {
            this.camera.lockedTarget = this.headNode;
            this.camera.lowerRadiusLimit = 0.01;
            this.camera.upperRadiusLimit = 0.01;
            this.camera.radius = 0.01;
            this.camera.upperBetaLimit = Math.PI - 0.1;
            if (this.player.characterMesh) this.player.characterMesh.setEnabled(false);
        } else {  
            this.camera.lockedTarget = this.player;
            this.camera.lowerRadiusLimit = 4;
            this.camera.upperRadiusLimit = 10;
            this.camera.radius = this.targetZoom;
            this.camera.upperBetaLimit = (Math.PI / 2) + 0.2;
            if (this.player.characterMesh) this.player.characterMesh.setEnabled(true);
        }
    }

    setupKeyboard() {
        this.scene.actionManager = new BABYLON.ActionManager(this.scene);
        this.scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyDownTrigger, (evt) => {
            this.inputMap[evt.sourceEvent.key.toLowerCase()] = true;
        }));
        this.scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyUpTrigger, (evt) => {
            let key = evt.sourceEvent.key.toLowerCase();
            this.inputMap[key] = false;
            // FIXED: Use "this.player" and "this.toggleCameraMode"
            if (key === "v" && this.player) {
                this.toggleCameraMode();
            }
        }));
    }

    setupMobile() {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || navigator.maxTouchPoints > 0;

        if (isMobile) {
            const mobileUI = document.getElementById("mobileController");
            if (mobileUI) mobileUI.style.display = "block";

            const bindTouchButton = (elementId, key) => {
                const el = document.getElementById(elementId);
                if (!el) return;

                el.addEventListener("touchstart", (e) => {
                    e.preventDefault();
                    this.inputMap[key] = true;

                    // FIXED: Use "this.player" and "this.toggleCameraMode"
                    if (key === "v" && this.player) {
                        this.toggleCameraMode();
                    }
                }, { passive: false });

                el.addEventListener("touchend", (e) => {
                    e.preventDefault();
                    this.inputMap[key] = false;
                }, { passive: false });
            };

            bindTouchButton("btn-jump", " ");
            bindTouchButton("btn-cam", "v");

            // --- PUBG STYLE DUAL-ZONE JOYSTICK ---

            const joystickZone = document.getElementById("joystick-zone");
            const joystickKnob = document.getElementById("joystick-knob");

            let joystickCenter = { x: 0, y: 0 };
            let joystickActive = false;
            let activeTouchId = null; 
            
            // Define our two zones
            const walkThreshold = 10; // Minimum distance to register a walk
            const runThreshold = 45;  // Distance required to trigger running
            const maxRadius = 60;     // Maximum visual distance the knob can be pulled

            if (joystickZone && joystickKnob) {
                const handleJoystickMove = (touch) => {
                    let dx = touch.clientX - joystickCenter.x;
                    let dy = touch.clientY - joystickCenter.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    // Cap the visual distance of the knob
                    let visualDx = dx;
                    let visualDy = dy;
                    if (distance > maxRadius) {
                        visualDx = (dx / distance) * maxRadius;
                        visualDy = (dy / distance) * maxRadius;
                    }

                    // Move the knob visually
                    joystickKnob.style.transform = `translate(calc(-50% + ${visualDx}px), calc(-50% + ${visualDy}px))`;

                    // 1. Basic Directional Walking (Inner Zone)
                    this.inputMap["w"] = dy < -walkThreshold; 
                    this.inputMap["s"] = dy > walkThreshold;  
                    this.inputMap["a"] = dx < -walkThreshold; 
                    this.inputMap["d"] = dx > walkThreshold;  

                    // 2. Sprinting (Outer Zone)
                    this.inputMap["shift"] = distance > runThreshold; 
                };

                joystickZone.addEventListener("touchstart", (e) => {
                    e.preventDefault();
                    if (joystickActive) return;

                    joystickActive = true;
                    const touch = e.changedTouches[0];
                    activeTouchId = touch.identifier;

                    // Calculate the fixed center of the joystick zone
                    const rect = joystickZone.getBoundingClientRect();
                    joystickCenter = {
                        x: rect.left + rect.width / 2,
                        y: rect.top + rect.height / 2
                    };

                    // Immediately calculate movement so the knob snaps to the finger
                    handleJoystickMove(touch);

                }, { passive: false });

                joystickZone.addEventListener("touchmove", (e) => {
                    if (!joystickActive) return;
                    e.preventDefault();
                    
                    for (let i = 0; i < e.changedTouches.length; i++) {
                        if (e.changedTouches[i].identifier === activeTouchId) {
                            handleJoystickMove(e.changedTouches[i]);
                            break;
                        }
                    }
                }, { passive: false });

                const resetJoystick = (e) => {
                    if (!joystickActive) return;
                    
                    if (e) {
                        let touchEnded = false;
                        for (let i = 0; i < e.changedTouches.length; i++) {
                            if (e.changedTouches[i].identifier === activeTouchId) {
                                touchEnded = true;
                                break;
                            }
                        }
                        if (!touchEnded) return;
                        e.preventDefault();
                    }

                    joystickActive = false;
                    activeTouchId = null;

                    // Snap the knob back to the center
                    joystickKnob.style.transform = `translate(-50%, -50%)`;

                    // Reset all inputs when thumb is lifted
                    this.inputMap["w"] = false;
                    this.inputMap["a"] = false;
                    this.inputMap["s"] = false;
                    this.inputMap["d"] = false;
                    this.inputMap["shift"] = false; // Reset running
                };

                joystickZone.addEventListener("touchend", resetJoystick, { passive: false });
                joystickZone.addEventListener("touchcancel", resetJoystick, { passive: false });
            }

            const fullscreenBtn = document.getElementById("btn-fullscreen");
            if (fullscreenBtn) {
                fullscreenBtn.addEventListener("touchstart", (e) => {
                    e.preventDefault();
                    this.toggleFullScreen();
                }, { passive: false });
            }
        }
    }

    toggleFullScreen() {
        const doc = window.document;
        const docEl = doc.documentElement;

        const requestFullScreen = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullScreen || docEl.msRequestFullscreen;
        const cancelFullScreen = doc.exitFullscreen || doc.mozCancelFullScreen || doc.webkitExitFullscreen || doc.msExitFullscreen;

        if (!doc.fullscreenElement && !doc.mozFullScreenElement && !doc.webkitFullscreenElement && !doc.msFullscreenElement) {
            if (requestFullScreen) {
                requestFullScreen.call(docEl);
            }
        } else {
            if (cancelFullScreen) {
                cancelFullScreen.call(doc);
            }
        }
    }
}