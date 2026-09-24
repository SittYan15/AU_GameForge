// ui/profile.js
import { getProfile, upgradeGuestWithPassword, updateGuestProfile, updateUserProfile, upgradeGuestWithGoogle, clearSavedGuest, logoutSession } from "../multiplayer.js";
import { disableGoogleAutoSelect, renderGoogleButton } from "../googleIdentity.js";

const profileButton = document.getElementById("profileButton");
const profilePanel = document.getElementById("profilePanel");
const closeProfileButton = document.getElementById("closeProfileButton");

// PROFILE_CAMERA_SENSITIVITY_V1
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

function saveCameraSensitivity(
    value
) {
    const normalized =
        clampCameraSensitivity(
            value
        );

    try {
        window.localStorage.setItem(
            CAMERA_SENSITIVITY_STORAGE_KEY,
            String(
                normalized
            )
        );
    } catch {
        // Local storage can be blocked in private/restricted browsers.
    }

    window.dispatchEvent(
        new CustomEvent(
            "au:camera-sensitivity-changed",
            {
                detail: {
                    value:
                        normalized
                }
            }
        )
    );

    return normalized;
}

function ensureCameraSensitivityControl() {
    const form =
        document.getElementById(
            "profileEditForm"
        );

    if (!form) {
        return;
    }

    const existing =
        document.getElementById(
            "profileCameraSensitivity"
        );

    if (existing) {
        existing.value =
            String(
                readCameraSensitivity()
            );

        const valueLabel =
            document.getElementById(
                "profileCameraSensitivityValue"
            );

        if (valueLabel) {
            valueLabel.textContent =
                `${existing.value}/10`;
        }

        return;
    }

    if (
        !document.getElementById(
            "profileCameraSensitivityStyle"
        )
    ) {
        const style =
            document.createElement(
                "style"
            );

        style.id =
            "profileCameraSensitivityStyle";

        style.textContent = `
            #profileCameraSensitivitySetting {
                margin: 3px 0 5px;
                padding: 9px 10px;
                border: 1px solid rgba(255,255,255,.10);
                border-radius: 10px;
                background: rgba(255,255,255,.035);
            }

            #profileCameraSensitivitySetting .camera-sensitivity-heading {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
                margin-bottom: 6px;
            }

            #profileCameraSensitivitySetting label {
                margin: 0;
            }

            #profileCameraSensitivityValue {
                color: #69f0c0;
                font-size: 11px;
                font-weight: 900;
                white-space: nowrap;
            }

            #profileCameraSensitivity {
                width: 100%;
                margin: 0;
                padding: 0 !important;
                accent-color: #69f0c0;
                cursor: pointer;
            }

            #profileCameraSensitivitySetting .camera-sensitivity-scale {
                display: flex;
                justify-content: space-between;
                margin-top: 2px;
                color: #8f96a3;
                font-size: 9px;
                font-weight: 700;
            }
        `;

        document.head.appendChild(
            style
        );
    }

    const setting =
        document.createElement(
            "div"
        );

    setting.id =
        "profileCameraSensitivitySetting";

    const initialValue =
        readCameraSensitivity();

    setting.innerHTML = `
        <div class="camera-sensitivity-heading">
            <label for="profileCameraSensitivity">Camera Sensitivity</label>
            <span id="profileCameraSensitivityValue">${initialValue}/10</span>
        </div>
        <input
            id="profileCameraSensitivity"
            type="range"
            min="1"
            max="10"
            step="1"
            value="${initialValue}"
            aria-label="Camera movement sensitivity"
        />
        <div class="camera-sensitivity-scale">
            <span>Slow</span>
            <span>Fast</span>
        </div>
    `;

    const bioLabel =
        form.querySelector(
            'label[for="profileBio"]'
        );

    if (bioLabel) {
        bioLabel.before(
            setting
        );
    } else {
        form.appendChild(
            setting
        );
    }

    const slider =
        setting.querySelector(
            "#profileCameraSensitivity"
        );

    const valueLabel =
        setting.querySelector(
            "#profileCameraSensitivityValue"
        );

    slider?.addEventListener(
        "input",
        () => {
            const value =
                saveCameraSensitivity(
                    slider.value
                );

            slider.value =
                String(
                    value
                );

            if (valueLabel) {
                valueLabel.textContent =
                    `${value}/10`;
            }
        }
    );
}

export function updateProfilePoints(points) {
    if (!Number.isSafeInteger(points) || points < 0) return;
    const pointsElement = document.getElementById("profilePoints");
    if (pointsElement) pointsElement.textContent = points;
}

window.addEventListener("profile:points-updated", (event) => {
    updateProfilePoints(event.detail?.points);
});

function positionProfilePanel() {
    if (!profileButton || !profilePanel) return;
    const gap = 12;
    const edgeGap = 16;
    const rect = profileButton.getBoundingClientRect();
    const top = Math.round(rect.bottom + gap);

    profilePanel.style.top = `${top}px`;
    profilePanel.style.bottom = "auto";
    profilePanel.style.maxHeight = `${Math.max(160, window.innerHeight - top - edgeGap)}px`;

    if (window.innerWidth <= 600) {
        profilePanel.style.left = `${edgeGap}px`;
        profilePanel.style.right = `${edgeGap}px`;
        profilePanel.style.width = "auto";
        return;
    }

    profilePanel.style.left = "auto";
    profilePanel.style.right = `${Math.max(edgeGap, Math.round(window.innerWidth - rect.right))}px`;
    profilePanel.style.width = "";
}

export function setProfileOpen(open) {
    profilePanel?.classList.toggle("hidden", !open);
    profileButton?.setAttribute("aria-expanded", String(open));
    if (open) positionProfilePanel();
}

profileButton?.addEventListener("click", (event) => {
    event.stopPropagation();
    setProfileOpen(profilePanel.classList.contains("hidden"));
});

closeProfileButton?.addEventListener("click", () => setProfileOpen(false));

window.addEventListener("resize", () => {
    if (!profilePanel?.classList.contains("hidden")) positionProfilePanel();
});

window.addEventListener("orientationchange", () => {
    if (profilePanel?.classList.contains("hidden")) return;
    window.requestAnimationFrame(positionProfilePanel);
});

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

ensureCameraSensitivityControl();

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

export function renderProfilePanel(profile) {
    ensureCameraSensitivityControl();
    const picture = document.getElementById("profilePicture");
    const guestCode = document.getElementById("profileGuestCode");
    const email = document.getElementById("profileEmail");
    const upgrade = document.getElementById("guestUpgrade");
    const profileForm = document.getElementById("profileEditForm");
    const exitButton = document.getElementById("sessionExitButton");
    const passwordSignupForm = document.getElementById("guestPasswordSignupForm");

    const isGuest = profile.accountType === "guest";
    document.getElementById("guestInfo").textContent = isGuest
        ? profile.playerName
        : profile.username || profile.email || profile.playerName;
    const accountLabel = isGuest ? "Guest Account" : "Registered User";
    document.getElementById("profileAccountType").textContent = accountLabel;
    document.getElementById("profilePoints").textContent = profile.points;
    profilePanel?.classList.toggle("registered-profile", !isGuest);
    guestCode.textContent = isGuest ? profile.guestCode : "";
    guestCode.hidden = !isGuest;
    email.hidden = true;
    picture.style.display = "none";
    upgrade.hidden = !isGuest;
    passwordSignupForm.hidden = true;
    profileForm.hidden = false;
    document.getElementById("profilePlayerName").value = profile.playerName;
    document.getElementById("profileAvatarKey").value = profile.avatarKey || "default_avatar";
    document.getElementById("profileBio").value = profile.bio || "";
    exitButton.textContent = isGuest ? "Leave Guest Session" : "Logout";
}

export async function setupProfile(session, multiplayerInstance) {
    let currentSession = session;
    const profileMessage = document.getElementById("profileMessage");
    const exitButton = document.getElementById("sessionExitButton");
    const profileEditForm = document.getElementById("profileEditForm");
    const createAccountButton = document.getElementById("guestCreateAccountButton");
    const passwordSignupForm = document.getElementById("guestPasswordSignupForm");
    const cancelSignupButton = document.getElementById("cancelGuestSignupButton");
    try {
        const profile = await getProfile();
        Object.assign(session, profile, { token: session.token });
        currentSession = session;
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
            Object.assign(session, await upgradeGuestWithPassword(username, password));
            currentSession = session;
            clearSavedGuest();
            multiplayerInstance.updateIdentity()
            renderProfilePanel(currentSession);
            profileMessage.textContent = "Account created. Your guest progress is saved.";
        } catch (error) {
            profileMessage.textContent = error.message;
        } finally {
            submitButton.disabled = false;
        }
    });

    profileEditForm.onsubmit = async (event) => {
        event.preventDefault();
        const saveButton = document.getElementById("saveProfileButton");
        saveButton.disabled = true;
        profileMessage.textContent = "Saving profile...";
        try {
            const values = {
                playerName: document.getElementById("profilePlayerName").value,
                avatarKey: document.getElementById("profileAvatarKey").value,
                bio: document.getElementById("profileBio").value
            };
            const updated = currentSession.accountType === "guest"
                ? await updateGuestProfile(values)
                : await updateUserProfile(values, currentSession.token);
            Object.assign(currentSession, updated);
            renderProfilePanel(currentSession);
            multiplayerInstance.updateProfile(currentSession);
            profileMessage.textContent = "Profile saved successfully";
        } catch (error) {
            console.error("Profile update failed:", error);
            profileMessage.textContent = error.message;
        } finally {
            saveButton.disabled = false;
        }
    };

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

                    Object.assign(session, upgraded);
                    currentSession = session;
                    clearSavedGuest();
                    multiplayerInstance.updateIdentity();
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

    // Assign one handler because setupProfile can run again after an in-place
    // account upgrade. This cannot accumulate duplicate logout requests.
    exitButton.onclick = async () => {
        exitButton.disabled = true;
        profileMessage.textContent = "Ending session...";
        try {
            await logoutSession();
            if (currentSession.accountType === "guest") clearSavedGuest();
            disableGoogleAutoSelect();
            currentSession = null;
            setProfileOpen(false);
            window.dispatchEvent(new Event("auth:logged-out"));
        } catch (error) {
            console.error("Logout failed:", error);
            exitButton.disabled = false;
            profileMessage.textContent = `Logout failed: ${error.message}`;
        }
    };
}
