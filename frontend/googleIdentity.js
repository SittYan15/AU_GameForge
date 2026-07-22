const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
let initialized = false;
let activeCredentialHandler = null;

function waitForGoogleIdentity() {
    return new Promise((resolve, reject) => {
        if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.startsWith("your_")) {
            reject(new Error("Google Sign-In is not configured."));
            return;
        }
        const startedAt = Date.now();
        const timer = setInterval(() => {
            if (window.google?.accounts?.id) {
                clearInterval(timer);
                resolve(window.google.accounts.id);
            } else if (Date.now() - startedAt > 10000) {
                clearInterval(timer);
                reject(new Error("Google Sign-In could not be loaded."));
            }
        }, 100);
    });
}

export async function renderGoogleButton(element, onCredential, text = "continue_with") {
    if (!element) return;
    const googleIdentity = await waitForGoogleIdentity();
    if (!initialized) {
        googleIdentity.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback(response) {
                if (response?.credential) activeCredentialHandler?.(response.credential);
            },
            auto_select: false,
            cancel_on_tap_outside: true
        });
        initialized = true;
    }

    element.innerHTML = "";
    element.addEventListener("pointerdown", () => { activeCredentialHandler = onCredential; });
    element.addEventListener("keydown", () => { activeCredentialHandler = onCredential; });
    googleIdentity.renderButton(element, {
        type: "standard",
        theme: "outline",
        size: "large",
        text,
        shape: "rectangular",
        width: Math.min(element.clientWidth || 320, 360)
    });
}

export function disableGoogleAutoSelect() {
    window.google?.accounts?.id?.disableAutoSelect();
}
