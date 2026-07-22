// app.js (or index.js, whatever your main file is named)
import * as BABYLON from "@babylonjs/core";
import "@babylonjs/loaders/glTF";

// ---> IMPORT YOUR NEW FILES HERE <---
import { createPlayer } from "./player.js";
import { createNPC } from "./npc.js";
import { createCar } from "./car.js";
import {
    clearSavedGuest,
    createGuest,
    createMultiplayer,
    getProfile,
    googleLogin,
    loginUser,
    logoutSession,
    restoreGuest,
    signupUser,
    updateGuestProfile,
    upgradeGuestWithPassword,
    upgradeGuestWithGoogle
} from "./multiplayer.js";
import { disableGoogleAutoSelect, renderGoogleButton } from "./googleIdentity.js";
import { markWalkableGround } from "./grounding.js";

const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);
let multiplayer = null;
let currentSession = null;
let gameStarted = false;

const chatState = {
    socket: null,
    messages: [],
    isOpen: false
};

const chatMessagesEl = document.getElementById("chatMessages");
const chatInputEl = document.getElementById("chatInput");
const chatFormEl = document.getElementById("chatForm");
const chatPanelEl = document.getElementById("chatPanel");
const chatToggleEl = document.getElementById("chatToggle");

function renderChatMessages() {
    if (!chatMessagesEl) return;

    const visibleMessages = chatState.messages.slice(-50);
    chatMessagesEl.innerHTML = "";

    visibleMessages.forEach((message) => {
        const row = document.createElement("div");
        row.className = "chatMessage";

        const meta = document.createElement("div");
        meta.className = "chatMeta";
        meta.textContent = `${message.sender} • ${new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

        const text = document.createElement("div");
        text.textContent = message.text;

        row.appendChild(meta);
        row.appendChild(text);
        chatMessagesEl.appendChild(row);
    });

    chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
}

function addChatMessage(message) {
    chatState.messages.push(message);

    if (chatState.messages.length > 50) {
        chatState.messages.shift();
    }

    renderChatMessages();
}

function setChatOpen(open) {
    chatState.isOpen = open;

    if (chatPanelEl) {
        chatPanelEl.classList.toggle("open", open);
    }

    if (chatToggleEl) {
        chatToggleEl.textContent = open ? "✕ Close" : "💬 Chat";
    }

    if (open && chatInputEl) {
        setTimeout(() => chatInputEl.focus(), 50);
    }
}

function setupChat() {
    if (!chatMessagesEl || !chatInputEl || !chatFormEl) return;

    if (chatToggleEl) {
        chatToggleEl.addEventListener("click", () => {
            setChatOpen(!chatState.isOpen);
        });
    }

    chatFormEl.addEventListener("submit", (event) => {
        event.preventDefault();

        const text = chatInputEl.value.trim();
        if (!text) return;

        if (multiplayer) {
            multiplayer.sendChat(text);
            chatInputEl.value = "";
        }
    });
}

setChatOpen(false);
setupChat();

const profileButton = document.getElementById("profileButton");
const profilePanel = document.getElementById("profilePanel");
const closeProfileButton = document.getElementById("closeProfileButton");

function setProfileOpen(open) {
    profilePanel?.classList.toggle("hidden", !open);
    profileButton?.setAttribute("aria-expanded", String(open));
}

profileButton?.addEventListener("click", (event) => {
    event.stopPropagation();
    setProfileOpen(profilePanel.classList.contains("hidden"));
});

closeProfileButton?.addEventListener("click", () => setProfileOpen(false));

document.addEventListener("click", (event) => {
    if (!profilePanel || profilePanel.classList.contains("hidden")) return;
    if (!profilePanel.contains(event.target) && !profileButton?.contains(event.target)) {
        setProfileOpen(false);
    }
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !profilePanel?.classList.contains("hidden")) {
        setProfileOpen(false);
    }
});

setProfileOpen(false);

const welcomeScreen = document.getElementById("welcomeScreen");
const welcomeChoices = document.getElementById("welcomeChoices");
const loginButton = document.getElementById("loginButton");
const signupButton = document.getElementById("signupButton");
const guestButton = document.getElementById("guestButton");
const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");
const loginBackButton = document.getElementById("loginBackButton");
const signupBackButton = document.getElementById("signupBackButton");
const createAccountButton = document.getElementById("createAccountButton");
const guestChoicePanel = document.getElementById("guestChoicePanel");
const guestChoiceQuestion = document.getElementById("guestChoiceQuestion");
const guestRestoreForm = document.getElementById("guestRestoreForm");
const hasGuestCodeButton = document.getElementById("hasGuestCodeButton");
const newGuestButton = document.getElementById("newGuestButton");
const invalidCodeActions = document.getElementById("invalidCodeActions");
const tryGuestCodeAgainButton = document.getElementById("tryGuestCodeAgainButton");
const createGuestAfterFailureButton = document.getElementById("createGuestAfterFailureButton");
const guestFlowBackButton = document.getElementById("guestFlowBackButton");
const authMessage = document.getElementById("authMessage");

async function handleGoogleWelcomeCredential(credential) {
    setAuthBusy(true, "Verifying Google account...");
    try {
        await startGame(await googleLogin(credential));
    } catch (error) {
        setAuthBusy(false, error.message);
    }
}

renderGoogleButton(document.getElementById("googleLoginButton"), handleGoogleWelcomeCredential, "signin_with")
    .catch((error) => console.info(error.message));
renderGoogleButton(document.getElementById("googleSignupButton"), handleGoogleWelcomeCredential, "signup_with")
    .catch((error) => console.info(error.message));

function setAuthBusy(busy, message = "") {
    loginButton.disabled = busy;
    signupButton.disabled = busy;
    guestButton.disabled = busy;
    loginForm.querySelector("button[type='submit']").disabled = busy;
    signupForm.querySelector("button[type='submit']").disabled = busy;
    guestChoicePanel.querySelectorAll("button").forEach((button) => { button.disabled = busy; });
    if (authMessage) authMessage.textContent = message;
}

function showAuthView(view) {
    welcomeChoices.hidden = true;
    loginForm.hidden = view !== "login";
    signupForm.hidden = view !== "signup";
    guestChoicePanel.hidden = true;
    createAccountButton.hidden = true;
    if (authMessage) authMessage.textContent = "";
    document.getElementById(view === "login" ? "loginUsername" : "signupUsername").focus();
}

function showWelcomeChoices() {
    loginForm.hidden = true;
    signupForm.hidden = true;
    guestChoicePanel.hidden = true;
    welcomeChoices.hidden = false;
    createAccountButton.hidden = true;
    if (authMessage) authMessage.textContent = "";
}

loginButton.addEventListener("click", () => showAuthView("login"));
signupButton.addEventListener("click", () => showAuthView("signup"));
createAccountButton.addEventListener("click", () => showAuthView("signup"));

loginBackButton.addEventListener("click", showWelcomeChoices);
signupBackButton.addEventListener("click", showWelcomeChoices);

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    setAuthBusy(true, "Signing in...");
    try {
        const session = await loginUser(
            document.getElementById("loginUsername").value,
            document.getElementById("loginPassword").value
        );
        await startGame(session);
    } catch (error) {
        setAuthBusy(false, error.message);
        createAccountButton.hidden = error.status !== 404;
    }
});

signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const username = document.getElementById("signupUsername").value;
    const password = document.getElementById("signupPassword").value;
    const confirmPassword = document.getElementById("signupConfirmPassword").value;
    if (!username.trim() || !password) {
        setAuthBusy(false, "Username and password are required.");
        return;
    }
    if (password !== confirmPassword) {
        setAuthBusy(false, "Passwords must match.");
        return;
    }

    setAuthBusy(true, "Creating your account...");
    try {
        await startGame(await signupUser(username, password));
    } catch (error) {
        setAuthBusy(false, error.message);
    }
});

guestButton.addEventListener("click", () => {
    welcomeChoices.hidden = true;
    loginForm.hidden = true;
    signupForm.hidden = true;
    guestChoicePanel.hidden = false;
    guestChoiceQuestion.hidden = false;
    guestRestoreForm.hidden = true;
    invalidCodeActions.hidden = true;
    if (authMessage) authMessage.textContent = "";
});

hasGuestCodeButton.addEventListener("click", () => {
    guestChoiceQuestion.hidden = true;
    guestRestoreForm.hidden = false;
    invalidCodeActions.hidden = true;
    document.getElementById("guestCodeInput").focus();
});

async function createNewGuestAndStart() {
    setAuthBusy(true, "Creating your new guest account...");
    try {
        await startGame(await createGuest());
    } catch (error) {
        setAuthBusy(false, error.message);
    }
}

newGuestButton.addEventListener("click", createNewGuestAndStart);
createGuestAfterFailureButton.addEventListener("click", createNewGuestAndStart);
guestFlowBackButton.addEventListener("click", showWelcomeChoices);

guestRestoreForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    setAuthBusy(true, "Restoring guest...");
    try {
        const code = document.getElementById("guestCodeInput").value.trim().toUpperCase();
        await startGame(await restoreGuest(code));
    } catch (error) {
        setAuthBusy(false, error.status === 404 ? "Guest Code not found." : error.message);
        invalidCodeActions.hidden = error.status !== 404;
    }
});

tryGuestCodeAgainButton.addEventListener("click", () => {
    document.getElementById("guestCodeInput").value = "";
    invalidCodeActions.hidden = true;
    if (authMessage) authMessage.textContent = "";
    document.getElementById("guestCodeInput").focus();
});

function renderProfilePanel(profile) {
    const picture = document.getElementById("profilePicture");
    const guestCode = document.getElementById("profileGuestCode");
    const email = document.getElementById("profileEmail");
    const upgrade = document.getElementById("guestUpgrade");
    const guestForm = document.getElementById("guestProfileForm");
    const exitButton = document.getElementById("sessionExitButton");
    const passwordSignupForm = document.getElementById("guestPasswordSignupForm");

    document.getElementById("guestInfo").textContent = profile.playerName;
    const accountLabel = profile.accountType === "guest"
        ? "Guest Account"
        : profile.accountProvider === "google" ? "Google Account" : "Registered User";
    document.getElementById("profileAccountType").textContent = accountLabel;
    document.getElementById("profilePoints").textContent = profile.points;
    guestCode.textContent = profile.accountType === "guest" ? profile.guestCode : "";
    guestCode.hidden = profile.accountType !== "guest";
    email.textContent = profile.accountType === "user" && profile.email ? `Email: ${profile.email}` : "";
    email.hidden = profile.accountType !== "user" || !profile.email;
    picture.style.display = profile.profilePictureUrl ? "block" : "none";
    if (profile.profilePictureUrl) picture.src = profile.profilePictureUrl;
    upgrade.hidden = profile.accountType !== "guest";
    passwordSignupForm.hidden = true;
    guestForm.hidden = profile.accountType !== "guest";
    if (profile.accountType === "guest") {
        document.getElementById("guestPlayerName").value = profile.playerName;
        document.getElementById("guestAvatarKey").value = profile.avatarKey || "default_avatar";
        document.getElementById("guestBio").value = profile.bio || "";
    }
    exitButton.textContent = profile.accountType === "guest" ? "Leave Guest Session" : "Logout";
}

async function setupProfile(session) {
    const profileMessage = document.getElementById("profileMessage");
    const exitButton = document.getElementById("sessionExitButton");
    const guestProfileForm = document.getElementById("guestProfileForm");
    const createAccountButton = document.getElementById("guestCreateAccountButton");
    const passwordSignupForm = document.getElementById("guestPasswordSignupForm");
    const cancelSignupButton = document.getElementById("cancelGuestSignupButton");
    try {
        const profile = await getProfile();
        currentSession = { ...session, ...profile, token: session.token };
    } catch {
        currentSession = session;
    }
    renderProfilePanel(currentSession);

    createAccountButton.addEventListener("click", () => {
        passwordSignupForm.hidden = false;
        createAccountButton.hidden = true;
        document.getElementById("guestSignupUsername").focus();
    });

    cancelSignupButton.addEventListener("click", () => {
        passwordSignupForm.hidden = true;
        createAccountButton.hidden = false;
        profileMessage.textContent = "";
    });

    passwordSignupForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const username = document.getElementById("guestSignupUsername").value;
        const password = document.getElementById("guestSignupPassword").value;
        const confirmation = document.getElementById("guestSignupConfirmPassword").value;
        if (password !== confirmation) {
            profileMessage.textContent = "Passwords must match.";
            return;
        }

        const submitButton = document.getElementById("submitGuestSignupButton");
        submitButton.disabled = true;
        profileMessage.textContent = "Creating your account...";
        try {
            currentSession = await upgradeGuestWithPassword(username, password);
            clearSavedGuest();
            multiplayer.updateIdentity();
            renderProfilePanel(currentSession);
            profileMessage.textContent = "Account created. Your guest progress is saved.";
        } catch (error) {
            profileMessage.textContent = error.message;
        } finally {
            submitButton.disabled = false;
        }
    });

    guestProfileForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (currentSession.accountType !== "guest") return;
        const saveButton = document.getElementById("saveGuestProfileButton");
        saveButton.disabled = true;
        profileMessage.textContent = "Saving profile...";
        try {
            const updated = await updateGuestProfile({
                playerName: document.getElementById("guestPlayerName").value,
                avatarKey: document.getElementById("guestAvatarKey").value,
                bio: document.getElementById("guestBio").value
            });
            currentSession = { ...currentSession, ...updated };
            renderProfilePanel(currentSession);
            multiplayer.updateProfile(currentSession);
            profileMessage.textContent = "Profile saved.";
        } catch (error) {
            profileMessage.textContent = error.message;
        } finally {
            saveButton.disabled = false;
        }
    });

    if (currentSession.accountType === "guest") {
        try {
            await renderGoogleButton(document.getElementById("googleUpgradeButton"), async (credential) => {
            profileMessage.textContent = "Verifying Google account...";
            try {
                let upgraded;
                try {
                    upgraded = await upgradeGuestWithGoogle(credential, false);
                } catch (error) {
                    if (!error.requiresMergeConfirmation) throw error;
                    const confirmed = window.confirm(
                        `This Google account already has ${error.registeredPoints} points. `
                        + `Your guest has ${error.guestPoints} points. Merge them for a total of ${error.finalPoints} points?`
                    );
                    if (!confirmed) {
                        profileMessage.textContent = "Guest progress was not merged.";
                        return;
                    }
                    upgraded = await upgradeGuestWithGoogle(credential, true);
                }

                currentSession = upgraded;
                clearSavedGuest();
                multiplayer.updateIdentity();
                renderProfilePanel(currentSession);
                profileMessage.textContent = "Progress saved to your Google account.";
            } catch (error) {
                profileMessage.textContent = error.message;
            }
            }, "continue_with");
        } catch (error) {
            document.getElementById("googleUpgradeDivider").hidden = true;
            document.getElementById("googleUpgradeButton").hidden = true;
        }
    }

    exitButton.addEventListener("click", async () => {
        exitButton.disabled = true;
        profileMessage.textContent = "Ending session...";
        try {
            await logoutSession();
            if (currentSession.accountType === "guest") clearSavedGuest();
            disableGoogleAutoSelect();
            multiplayer?.dispose();
            window.location.reload();
        } catch (error) {
            exitButton.disabled = false;
            profileMessage.textContent = error.message;
        }
    });
}

// ==========================================
// CUSTOM LOADING SCREEN OVERLAY
// ==========================================
class CustomLoadingScreen {
    constructor() {
        this.loadingUIText = "Loading AU Campus...";
        this.loadingUIBackgroundColor = "#111111"; // Dark background
    }

    displayLoadingUI() {
        // 1. Create the dark background overlay
        this.loadingDiv = document.createElement("div");
        this.loadingDiv.id = "customLoadingScreen";
        this.loadingDiv.style.position = "absolute";
        this.loadingDiv.style.top = "0";
        this.loadingDiv.style.left = "0";
        this.loadingDiv.style.width = "100%";
        this.loadingDiv.style.height = "100%";
        this.loadingDiv.style.backgroundColor = this.loadingUIBackgroundColor;
        this.loadingDiv.style.display = "flex";
        this.loadingDiv.style.flexDirection = "column";
        this.loadingDiv.style.alignItems = "center";
        this.loadingDiv.style.justifyContent = "center";
        this.loadingDiv.style.zIndex = "9999";
        this.loadingDiv.style.fontFamily = "sans-serif";
        this.loadingDiv.style.transition = "opacity 0.5s ease"; // Smooth fade out

        // 2. Create the loading text
        const text = document.createElement("div");
        text.innerHTML = this.loadingUIText;
        text.style.color = "white";
        text.style.fontSize = "24px";
        text.style.fontWeight = "bold";
        text.style.marginBottom = "20px";
        this.loadingDiv.appendChild(text);

        // 3. Create the empty progress bar container
        const barContainer = document.createElement("div");
        barContainer.style.width = "300px";
        barContainer.style.height = "12px";
        barContainer.style.backgroundColor = "#333";
        barContainer.style.borderRadius = "6px";
        barContainer.style.overflow = "hidden";

        // 4. Create the colored animated fill
        this.progressBar = document.createElement("div");
        this.progressBar.style.width = "0%";
        this.progressBar.style.height = "100%";
        this.progressBar.style.backgroundColor = "#E53935"; // A nice red color
        this.progressBar.style.transition = "width 0.2s ease-out";
        barContainer.appendChild(this.progressBar);

        // Attach everything to the screen
        this.loadingDiv.appendChild(barContainer);
        document.body.appendChild(this.loadingDiv);

        // 5. Simulate a smooth loading animation up to 90%
        this.progress = 0;
        this.loadingInterval = setInterval(() => {
            this.progress += (90 - this.progress) * 0.1; // Slows down as it approaches 90
            if (this.progressBar) {
                this.progressBar.style.width = this.progress + "%";
            }
        }, 100);
    }

    hideLoadingUI() {
        if (this.loadingDiv) {
            // Stop the simulation and snap the bar to 100%
            clearInterval(this.loadingInterval);
            this.progressBar.style.width = "100%";

            // Wait a fraction of a second so the user sees it hit 100%, then fade out
            setTimeout(() => {
                this.loadingDiv.style.opacity = "0";
                setTimeout(() => {
                    this.loadingDiv.remove();
                }, 500); // Matches the CSS transition time
            }, 300);
        }
    }
}

// ---> TELL THE ENGINE TO USE OUR NEW UI <---
engine.loadingScreen = new CustomLoadingScreen();

const createScene = async (session) => {
    const scene = new BABYLON.Scene(engine);

    // Cloudflare R2 Public URL
    const r2BaseUrl = "https://pub-1594e8b359fe4ef08605e86f19e11eeb.r2.dev/";
    // Local relative path for testing
    const localBaseUrl = "./au_campus/";

    // World Setup
    scene.gravity = new BABYLON.Vector3(0, -0.05, 0);
    scene.collisionsEnabled = true;

    const light = new BABYLON.HemisphericLight("ambientLight", new BABYLON.Vector3(0, 1, 0), scene);
    light.intensity = 0.5;

    // ==========================================
    // ADD HDRI SKYBOX AND LIGHTING
    // ==========================================
    const envTexture = BABYLON.CubeTexture.CreateFromPrefilteredData("./e_noon_puresky_2k.env", scene);
    scene.environmentTexture = envTexture;
    const skybox = scene.createDefaultSkybox(envTexture, true, 1500);

    // Temporary target for camera before player loads
    const camera = new BABYLON.ArcRotateCamera("thirdPersonCamera", Math.PI / 2, Math.PI / 3, 6, BABYLON.Vector3.Zero(), scene);
    camera.attachControl(canvas, true);

    // 1. FIX THE DISAPPEARING WALLS:
    // Lower the near-clipping plane so objects don't disappear when you get close
    camera.minZ = 0.05;

    camera.lowerRadiusLimit = 2;
    camera.upperRadiusLimit = 15;
    camera.lowerBetaLimit = 0.1;

    // 2. FIX LOOKING UP AT THE SKY:
    // Increase the beta limit from (Math.PI / 2) * 0.95 to nearly Math.PI
    // This allows the camera to drop low and point upwards
    camera.upperBetaLimit = (Math.PI / 2) + 0.1;

    // ==========================================
    // CAMERA ZOOM TRACKER
    // ==========================================
    let targetZoom = 6; // Default starting zoom
    let isFirstPerson = true; // Add this!

    scene.onPrePointerObservable.add((info) => {
        if (info.type === BABYLON.PointerEventTypes.POINTERWHEEL && !isFirstPerson) { // Only allow zooming in third-person mode
            // Adjust the target zoom based on the scroll wheel
            targetZoom += (info.event.deltaY > 0 ? 0.5 : -0.5);
            // Clamp it so they can't zoom too far in or out
            targetZoom = Math.max(camera.lowerRadiusLimit, Math.min(camera.upperRadiusLimit, targetZoom));
        }
    });

    // Input Setup
    const inputMap = {};
    scene.actionManager = new BABYLON.ActionManager(scene);
    scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyDownTrigger, function (evt) {
        inputMap[evt.sourceEvent.key.toLowerCase()] = evt.sourceEvent.type === "keydown";
    }));
    scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyUpTrigger, function (evt) {
        inputMap[evt.sourceEvent.key.toLowerCase()] = evt.sourceEvent.type === "keydown";
    }));
    scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyUpTrigger, function (evt) {
        let key = evt.sourceEvent.key.toLowerCase();
        inputMap[key] = evt.sourceEvent.type === "keydown"; // Needs to be false on KeyUp

        // ==========================================
        // CAMERA TOGGLE (V KEY)
        // ==========================================
        if (key === "v" && player) {
            isFirstPerson = !isFirstPerson;

            if (isFirstPerson) {
                // Switch to FPS
                camera.lockedTarget = headNode;
                camera.lowerRadiusLimit = 0.01;
                camera.upperRadiusLimit = 0.01;
                camera.radius = 0.01;

                // UNLOCK THE ANGLE: Allow full sky-viewing in First-Person
                camera.upperBetaLimit = Math.PI - 0.1;

                if (player.characterMesh) player.characterMesh.setEnabled(false);
            } else {
                // Switch back to TPS
                camera.lockedTarget = player;
                camera.lowerRadiusLimit = 2;
                camera.upperRadiusLimit = 15;
                camera.radius = targetZoom;

                // RE-LOCK THE ANGLE: Stop the camera from hitting the floor in Third-Person
                camera.upperBetaLimit = (Math.PI / 2) + 0.2;

                if (player.characterMesh) player.characterMesh.setEnabled(true);
            }
        }
    }));

    // ==========================================
    // MOBILE DETECTION & VIRTUAL CONTROLLER
    // ==========================================
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || navigator.maxTouchPoints > 0;

    if (isMobile) {
        const mobileUI = document.getElementById("mobileController");
        if (mobileUI) mobileUI.style.display = "block";

        const bindTouchButton = (elementId, key) => {
            const el = document.getElementById(elementId);
            if (!el) return;

            el.addEventListener("touchstart", (e) => {
                e.preventDefault();
                inputMap[key] = true;

                if (key === "v" && player) {
                    isFirstPerson = !isFirstPerson;
                    toggleCameraMode();
                }
            }, { passive: false });

            el.addEventListener("touchend", (e) => {
                e.preventDefault();
                inputMap[key] = false;
            }, { passive: false });
        };

        // Bind standard action buttons
        bindTouchButton("btn-jump", " ");
        bindTouchButton("btn-cam", "v");

        // ---> NEW: JOYSTICK LOGIC <---
        const joystickZone = document.getElementById("joystick-zone");
        const joystickKnob = document.getElementById("joystick-knob");

        let joystickCenter = { x: 0, y: 0 };
        let joystickActive = false;
        const maxRadius = 40; // Max pixels the knob can move from the center

        if (joystickZone && joystickKnob) {
            // Touch Start: Grab the center coordinates of the joystick base
            // Touch Start: Grab the center coordinates of the joystick base
            joystickZone.addEventListener("touchstart", (e) => {
                e.preventDefault();
                joystickActive = true;
                const rect = joystickZone.getBoundingClientRect();
                joystickCenter = {
                    x: rect.left + rect.width / 2,
                    y: rect.top + rect.height / 2
                };
                // FIXED: Use targetTouches to only track the finger on the joystick
                handleJoystickMove(e.targetTouches[0]);
            }, { passive: false });

            // Touch Move: Calculate distance from center and map to W/A/S/D
            joystickZone.addEventListener("touchmove", (e) => {
                if (!joystickActive) return;
                e.preventDefault();
                // FIXED: Use targetTouches to only track the finger on the joystick
                if (e.targetTouches.length > 0) {
                    handleJoystickMove(e.targetTouches[0]);
                }
            }, { passive: false });

            // Touch End: Snap back to center and stop movement
            const resetJoystick = (e) => {
                if (!joystickActive) return;
                if (e) e.preventDefault();
                joystickActive = false;

                // Reset UI
                joystickKnob.style.transform = `translate(-50%, -50%)`;

                // Reset Inputs
                inputMap["w"] = false;
                inputMap["a"] = false;
                inputMap["s"] = false;
                inputMap["d"] = false;
            };

            joystickZone.addEventListener("touchend", resetJoystick, { passive: false });
            joystickZone.addEventListener("touchcancel", resetJoystick, { passive: false });

            // Helper function to process the math
            function handleJoystickMove(touch) {
                let dx = touch.clientX - joystickCenter.x;
                let dy = touch.clientY - joystickCenter.y;

                // Calculate actual distance from center
                const distance = Math.sqrt(dx * dx + dy * dy);

                // Clamp the visual knob so it doesn't leave the base
                if (distance > maxRadius) {
                    dx = (dx / distance) * maxRadius;
                    dy = (dy / distance) * maxRadius;
                }

                // Move the knob physically on screen
                joystickKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;

                // Translate position into W/A/S/D inputs
                // We use a deadzone threshold of 15 pixels so tiny twitches don't move the player
                const threshold = 15;
                inputMap["w"] = dy < -threshold; // Pushing Up
                inputMap["s"] = dy > threshold;  // Pushing Down
                inputMap["a"] = dx < -threshold; // Pushing Left
                inputMap["d"] = dx > threshold;  // Pushing Right
            }
        }

        // Full Screen Logic
        const fullscreenBtn = document.getElementById("btn-fullscreen");
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener("touchstart", (e) => {
                e.preventDefault();
                toggleFullScreen();
            }, { passive: false });
        }
    }

    // ---> NEW: FULL SCREEN HELPER FUNCTION <---
    function toggleFullScreen() {
        const doc = window.document;
        const docEl = doc.documentElement;

        // Support for different browser prefixes
        const requestFullScreen = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullScreen || docEl.msRequestFullscreen;
        const cancelFullScreen = doc.exitFullscreen || doc.mozCancelFullScreen || doc.webkitExitFullscreen || doc.msExitFullscreen;

        // Check if we are already in fullscreen
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

    // ==========================================
    // POINTER LOCK (Hide Cursor)
    // ==========================================
    scene.onPointerDown = (evt) => {
        // evt.button === 0 means "Left Mouse Click"
        if (evt.button === 0) {
            engine.enterPointerlock();
        }
    };

    // Import the Campus Map
    try {
        // const result = await BABYLON.SceneLoader.ImportMeshAsync("", r2BaseUrl, "au_campus_v0.8.1.glb", scene);
        const result = await BABYLON.SceneLoader.ImportMeshAsync("", localBaseUrl, "au_campus_v0.8.1.glb", scene);
        result.meshes.forEach((mesh) => {
            if (mesh.isVisible && mesh.name !== "__root__") {
                mesh.checkCollisions = true;
                markWalkableGround(mesh);
            }
        });
    } catch (error) {
        console.error("Map error:", error);
    }

    // ==========================================
    // INITIALIZE YOUR ENTITIES HERE
    // ==========================================

    // 1. Spawn the Player
    const player = await createPlayer(scene, camera, inputMap, (animation) => {
        multiplayer?.sendAnimation(animation);
    });

    try {
        multiplayer = await createMultiplayer(scene, player, session, {
            onConnectionChanged(connected) {
                const status = document.getElementById("multiplayerStatus");
                if (status) status.textContent = connected ? "Online" : "Offline";
            },
            onPlayerCountChanged(count) {
                const countElement = document.getElementById("playerCountText");
                if (countElement) {
                    countElement.textContent = `AU Campus — ${count} ${count === 1 ? "player" : "players"}`;
                }
            },
            onError(error) {
                console.warn("Multiplayer connection unavailable:", error.message);
            },
            onChatHistory(messages) {
                chatState.messages = (messages || []).slice(-50);
                renderChatMessages();
            },
            onChatMessage: addChatMessage
        });
        await setupProfile(session);
    } catch (error) {
        console.error("Multiplayer initialization failed:", error);
        const status = document.getElementById("multiplayerStatus");
        if (status) status.textContent = "Offline";
    }

    // Create the First-Person head tracker attached to the player's position
    const headNode = new BABYLON.TransformNode("headNode", scene);
    headNode.parent = player;
    headNode.position = new BABYLON.Vector3(0, 0.8, 0.2); // Up at eye level, slightly forward

    // ---> FORCE FIRST PERSON MODE ON LOAD <---
    if (isFirstPerson) {
        camera.lockedTarget = headNode;
        camera.lowerRadiusLimit = 0.01;
        camera.upperRadiusLimit = 0.01;
        camera.radius = 0.01;
        camera.upperBetaLimit = Math.PI - 0.1;
        if (player.characterMesh) player.characterMesh.setEnabled(false);
    }

    // ==========================================
    // PRO CAMERA COLLISION (Raycast)
    // ==========================================
    scene.onBeforeRenderObservable.add(() => {
        if (player && !isFirstPerson) { // Only do this in third-person mode
            // 1. Shoot a laser from the player's head towards the camera
            let headPosition = player.position.clone();
            headPosition.y += 1.5; // Lift the laser up to shoulder/head level

            let direction = camera.position.subtract(headPosition).normalize();
            let ray = new BABYLON.Ray(headPosition, direction, targetZoom);

            // 2. Check if the laser hits any walls on the map
            let hit = scene.pickWithRay(ray, (mesh) => {
                // Ignore the player, NPCs, and invisible triggers. Only hit solid map walls!
                return mesh.checkCollisions && mesh.isVisible && mesh.name !== "player" && !mesh.name.includes("_collider");
            });

            if (hit.hit) {
                // Wall detected! Snap the camera tightly in front of the wall
                camera.radius = hit.distance - 0.2;
            } else {
                // No wall! Smoothly glide the camera back out to the player's desired zoom
                camera.radius = BABYLON.Scalar.Lerp(camera.radius, targetZoom, 0.1);
            }
        }
    });

    // 2. Define the route for NPC 1 (Campus Tour Guide)
    const routeOne = [
        new BABYLON.Vector3(-60.15, 1.53, 50.57),
        new BABYLON.Vector3(-64.33, 1.53, -61.37),
        new BABYLON.Vector3(-67.37, 1.53, 4.34)
    ];
    // Spawn NPC 1
    createNPC(scene, "TourGuide", new BABYLON.Vector3(-66.45, 1.53, 16.32), routeOne);

    // 3. Define the route for NPC 2 (Lost Student)
    const routeTwo = [
        new BABYLON.Vector3(-67.41, 1.53, 1.48),
        new BABYLON.Vector3(-50.60, 1.53, -47.27),
        new BABYLON.Vector3(-68.89, 1.53, 63.22)
    ];
    // Spawn NPC 2 in a totally different location!
    createNPC(scene, "LostStudent", new BABYLON.Vector3(-66.58, 1.53, -6.79), routeTwo);

    // ==========================================
    // SPAWN TRAFFIC
    // ==========================================
    // Define a square loop down the street
    const carRoute = [
        new BABYLON.Vector3(-123.99, -0.00, -6.33),
        new BABYLON.Vector3(-406.43, -0.00, -4.86),
        new BABYLON.Vector3(-438.58, 2.63, -3.86),
        new BABYLON.Vector3(-473.45, -0.01, -4.41),
        new BABYLON.Vector3(-487.27, -0.02, -7.19),
        new BABYLON.Vector3(-487.88, -0.02, -68.70),
        new BABYLON.Vector3(-526.67, -0.02, -80.68),
        new BABYLON.Vector3(-723.18, -0.02, -79.98),
        new BABYLON.Vector3(-724.72, -0.02, 79.47),
        new BABYLON.Vector3(-494.83, -0.02, 78.75),
        new BABYLON.Vector3(-489.07, -0.02, 5.86),
        new BABYLON.Vector3(-466.02, 0.17, 4.42),
        new BABYLON.Vector3(-442.86, 2.73, 3.24),
        new BABYLON.Vector3(-401.93, 0.00, 5.78),
        new BABYLON.Vector3(-128.06, 0.00, 6.91)
    ];

    // Spawn the car! Notice we are passing the `player` variable to it
    // so the car's raycast knows exactly what to look out for.
    createCar(scene, "BlueCruiser", carRoute, player);

    // ==========================================
    // WAYPOINT HELPER: Click to get coordinates
    // ==========================================
    // scene.onPointerDown = function (evt, pickResult) {
    //     // Only log if we actually clicked on a mesh (like the ground)
    //     if (pickResult.hit) {
    //         let p = pickResult.pickedPoint;

    //         // Format it exactly how the NPC array needs it
    //         console.log(`new BABYLON.Vector3(${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)}),`);

    //         // Optional: Spawn a tiny red sphere so you can visually see where you clicked!
    //         let marker = BABYLON.MeshBuilder.CreateSphere("marker", { diameter: 0.5 }, scene);
    //         marker.position = p;
    //         let mat = new BABYLON.StandardMaterial("redMat", scene);
    //         mat.diffuseColor = new BABYLON.Color3(1, 0, 0); // Red
    //         marker.material = mat;
    //     }
    // };

    return scene;
};

async function startGame(session) {
    if (gameStarted) return;
    gameStarted = true;
    currentSession = session;
    welcomeScreen.hidden = true;
    document.querySelectorAll(".game-ui").forEach((element) => { element.hidden = false; });
    engine.resize();
    engine.displayLoadingUI();

    try {
        const scene = await createScene(currentSession);
        engine.hideLoadingUI();
        const fpsElement = document.getElementById("fpsCounter");
        engine.runRenderLoop(() => {
            scene.render();
            if (fpsElement) fpsElement.innerHTML = engine.getFps().toFixed(0) + " FPS";
        });
    } catch (error) {
        gameStarted = false;
        engine.hideLoadingUI();
        welcomeScreen.hidden = false;
        document.querySelectorAll(".game-ui").forEach((element) => { element.hidden = true; });
        setAuthBusy(false, `Could not load the game: ${error.message}`);
        throw error;
    }
}

window.addEventListener("resize", () => engine.resize());
