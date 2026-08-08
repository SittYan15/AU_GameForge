// ui/profile.js
import { getProfile, upgradeGuestWithPassword, updateGuestProfile, upgradeGuestWithGoogle, clearSavedGuest, logoutSession } from "../multiplayer.js";
import { disableGoogleAutoSelect, renderGoogleButton } from "../googleIdentity.js";

const profileButton = document.getElementById("profileButton");
const profilePanel = document.getElementById("profilePanel");
const closeProfileButton = document.getElementById("closeProfileButton");

export function setProfileOpen(open) {
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

export function renderProfilePanel(profile) {
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

export async function setupProfile(session, multiplayerInstance) {
    let currentSession = session;
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
            multiplayerInstance.updateIdentity()
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
            multiplayerInstance.updateProfile(currentSession);
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