// ui/auth.js
import { loginUser, signupUser, createGuest, restoreGuest, googleLogin } from "../multiplayer.js";
import { renderGoogleButton } from "../googleIdentity.js";

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

export function initAuth(startGameCallback) {
    function setAuthBusy(busy, message = "") {
        loginButton.disabled = busy;
        signupButton.disabled = busy;
        guestButton.disabled = busy;
        loginForm.querySelector("button[type='submit']").disabled = busy;
        signupForm.querySelector("button[type='submit']").disabled = busy;
        guestChoicePanel.querySelectorAll("button").forEach((button) => { button.disabled = busy; });
        if (authMessage) authMessage.textContent = message;
    }

    // FIXED: Added the actual UI logic back in
    function showAuthView(view) {
        welcomeChoices.hidden = true;
        loginForm.hidden = view !== "login";
        signupForm.hidden = view !== "signup";
        guestChoicePanel.hidden = true;
        createAccountButton.hidden = true;
        if (authMessage) authMessage.textContent = "";
        document.getElementById(view === "login" ? "loginUsername" : "signupUsername").focus();
    }

    // FIXED: Added the actual UI logic back in
    function showWelcomeChoices() {
        loginForm.hidden = true;
        signupForm.hidden = true;
        guestChoicePanel.hidden = true;
        welcomeChoices.hidden = false;
        createAccountButton.hidden = true;
        if (authMessage) authMessage.textContent = "";
    }

    // FIXED: Brought back Google Auth logic
    async function handleGoogleWelcomeCredential(credential) {
        setAuthBusy(true, "Verifying Google account...");
        try {
            await startGameCallback(await googleLogin(credential));
        } catch (error) {
            setAuthBusy(false, error.message);
        }
    }

    renderGoogleButton(document.getElementById("googleLoginButton"), handleGoogleWelcomeCredential, "signin_with")
        .catch((error) => console.info(error.message));
    renderGoogleButton(document.getElementById("googleSignupButton"), handleGoogleWelcomeCredential, "signup_with")
        .catch((error) => console.info(error.message));

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
            // FIXED: Use the callback function
            await startGameCallback(session);
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
            // FIXED: Use the callback function
            await startGameCallback(await signupUser(username, password));
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
            // FIXED: Use the callback function
            await startGameCallback(await createGuest());
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
            // FIXED: Use the callback function
            await startGameCallback(await restoreGuest(code));
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
}