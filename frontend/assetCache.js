const CACHE_PREFERENCE_KEY =
    "auGameForgeGlbCachePreference";

const CAMPUS_MAP_SIZE_MB = 180;

let setupPromise = null;

function waitForServiceWorkerController(
    timeoutMs = 5000
) {
    if (navigator.serviceWorker.controller) {
        return Promise.resolve(true);
    }

    return new Promise((resolve) => {
        let settled = false;

        const finish = (value) => {
            if (settled) return;
            settled = true;

            navigator.serviceWorker.removeEventListener(
                "controllerchange",
                handleControllerChange
            );

            window.clearTimeout(timer);
            resolve(value);
        };

        const handleControllerChange = () => {
            finish(
                Boolean(
                    navigator.serviceWorker.controller
                )
            );
        };

        const timer =
            window.setTimeout(
                () => finish(false),
                timeoutMs
            );

        navigator.serviceWorker.addEventListener(
            "controllerchange",
            handleControllerChange
        );
    });
}

async function registerAssetServiceWorker() {
    if (!("serviceWorker" in navigator)) {
        return null;
    }

    const registration =
        await navigator.serviceWorker.register(
            "/sw.js",
            {
                scope: "/"
            }
        );

    await navigator.serviceWorker.ready;

    // sw.js calls clients.claim() during activation, so a first-time
    // registration can take control without requiring the user to reload.
    await waitForServiceWorkerController();

    return registration;
}

function serviceWorkerTarget(registration) {
    return (
        navigator.serviceWorker.controller ||
        registration?.active ||
        registration?.waiting ||
        registration?.installing ||
        null
    );
}

function postToServiceWorker(
    registration,
    message
) {
    const target =
        serviceWorkerTarget(registration);

    if (!target) {
        return false;
    }

    target.postMessage(message);
    return true;
}

async function requestPersistentStorage() {
    if (!navigator.storage?.persist) {
        return false;
    }

    try {
        if (
            navigator.storage.persisted &&
            await navigator.storage.persisted()
        ) {
            return true;
        }

        return await navigator.storage.persist();
    } catch (error) {
        console.warn(
            "[GLB Cache] Persistent storage request failed:",
            error
        );

        return false;
    }
}

async function storageSummary() {
    if (!navigator.storage?.estimate) {
        return "";
    }

    try {
        const estimate =
            await navigator.storage.estimate();

        const quota =
            Number(estimate.quota) || 0;

        const usage =
            Number(estimate.usage) || 0;

        if (quota <= 0) {
            return "";
        }

        const freeMb =
            Math.max(
                0,
                quota - usage
            ) /
            1024 /
            1024;

        return (
            freeMb >= 1024
                ? `${(freeMb / 1024).toFixed(1)} GB browser storage currently available.`
                : `${freeMb.toFixed(0)} MB browser storage currently available.`
        );
    } catch {
        return "";
    }
}

async function askCachePreference() {
    const existing =
        document.getElementById(
            "glbCacheChoiceOverlay"
        );

    existing?.remove();

    const storageText =
        await storageSummary();

    return new Promise((resolve) => {
        const overlay =
            document.createElement("div");

        overlay.id =
            "glbCacheChoiceOverlay";

        Object.assign(
            overlay.style,
            {
                position: "fixed",
                inset: "0",
                zIndex: "200000",
                display: "grid",
                placeItems: "center",
                boxSizing: "border-box",
                padding: "20px",
                background:
                    "rgba(4,6,10,.78)",
                backdropFilter: "blur(10px)",
                fontFamily:
                    'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
            }
        );

        const card =
            document.createElement("div");

        Object.assign(
            card.style,
            {
                width: "min(500px, 100%)",
                boxSizing: "border-box",
                padding: "26px",
                border:
                    "1px solid rgba(255,255,255,.14)",
                borderRadius: "20px",
                background: "#11141a",
                color: "#fff",
                boxShadow:
                    "0 24px 70px rgba(0,0,0,.5)"
            }
        );

        const title =
            document.createElement("h2");

        title.textContent =
            "Save game assets on this device?";

        Object.assign(
            title.style,
            {
                margin: "0 0 10px",
                fontSize: "23px"
            }
        );

        const description =
            document.createElement("p");

        description.textContent =
            `The AU Campus map is about ${CAMPUS_MAP_SIZE_MB} MB. ` +
            "If you save it, refreshes and future logins can load it from this device instead of downloading it again. " +
            "Building GLB files will also be saved as you explore.";

        Object.assign(
            description.style,
            {
                margin: "0",
                color: "#c8ced8",
                fontSize: "14px",
                lineHeight: "1.55"
            }
        );

        const note =
            document.createElement("p");

        note.textContent =
            storageText
                ? `${storageText} Browsers may still remove stored website data when device storage is low.`
                : "Browsers may still remove stored website data when device storage is low.";

        Object.assign(
            note.style,
            {
                margin: "12px 0 0",
                color: "#929bab",
                fontSize: "12px",
                lineHeight: "1.45"
            }
        );

        const buttons =
            document.createElement("div");

        Object.assign(
            buttons.style,
            {
                display: "grid",
                gridTemplateColumns:
                    "1fr 1fr",
                gap: "10px",
                marginTop: "20px"
            }
        );

        const saveButton =
            document.createElement("button");

        saveButton.type = "button";
        saveButton.textContent =
            "Save for faster loading";

        const noButton =
            document.createElement("button");

        noButton.type = "button";
        noButton.textContent =
            "Don't save";

        [
            saveButton,
            noButton
        ].forEach((button) => {
            Object.assign(
                button.style,
                {
                    minHeight: "44px",
                    borderRadius: "11px",
                    border:
                        "1px solid rgba(255,255,255,.14)",
                    fontWeight: "800",
                    cursor: "pointer"
                }
            );
        });

        Object.assign(
            saveButton.style,
            {
                background: "#ef4444",
                color: "#fff"
            }
        );

        Object.assign(
            noButton.style,
            {
                background:
                    "rgba(255,255,255,.07)",
                color: "#fff"
            }
        );

        const finish = (enabled) => {
            overlay.remove();
            resolve(enabled);
        };

        saveButton.addEventListener(
            "click",
            () => finish(true),
            { once: true }
        );

        noButton.addEventListener(
            "click",
            () => finish(false),
            { once: true }
        );

        buttons.append(
            saveButton,
            noButton
        );

        card.append(
            title,
            description,
            note,
            buttons
        );

        overlay.appendChild(card);
        document.body.appendChild(overlay);
    });
}

export async function prepareGlbBrowserCache() {
    if (setupPromise) {
        return setupPromise;
    }

    setupPromise =
        (async () => {
            if (
                !("serviceWorker" in navigator) ||
                !("caches" in window)
            ) {
                console.warn(
                    "[GLB Cache] Browser does not support the required caching APIs."
                );

                return {
                    supported: false,
                    enabled: false,
                    persistent: false
                };
            }

            let registration = null;

            try {
                registration =
                    await registerAssetServiceWorker();
            } catch (error) {
                console.warn(
                    "[GLB Cache] Service worker registration failed:",
                    error
                );

                return {
                    supported: false,
                    enabled: false,
                    persistent: false
                };
            }

            let preference =
                localStorage.getItem(
                    CACHE_PREFERENCE_KEY
                );

            if (
                preference !== "enabled" &&
                preference !== "disabled"
            ) {
                const enabled =
                    await askCachePreference();

                preference =
                    enabled
                        ? "enabled"
                        : "disabled";

                localStorage.setItem(
                    CACHE_PREFERENCE_KEY,
                    preference
                );
            }

            const enabled =
                preference === "enabled";

            postToServiceWorker(
                registration,
                {
                    type:
                        "AU_SET_GLB_CACHE_ENABLED",
                    enabled
                }
            );

            let persistent = false;

            if (enabled) {
                persistent =
                    await requestPersistentStorage();
            }

            console.log(
                "[GLB Cache]",
                {
                    enabled,
                    persistent
                }
            );

            return {
                supported: true,
                enabled,
                persistent
            };
        })();

    return setupPromise;
}

export async function clearDownloadedGlbAssets() {
    if (!("serviceWorker" in navigator)) {
        return;
    }

    const registration =
        await navigator.serviceWorker.ready;

    postToServiceWorker(
        registration,
        {
            type: "AU_CLEAR_GLB_CACHE"
        }
    );
}

export async function setGlbBrowserCacheEnabled(
    enabled
) {
    localStorage.setItem(
        CACHE_PREFERENCE_KEY,
        enabled
            ? "enabled"
            : "disabled"
    );

    if (!("serviceWorker" in navigator)) {
        return;
    }

    const registration =
        await navigator.serviceWorker.ready;

    postToServiceWorker(
        registration,
        {
            type:
                "AU_SET_GLB_CACHE_ENABLED",
            enabled: Boolean(enabled)
        }
    );

    if (enabled) {
        await requestPersistentStorage();
    }
}
