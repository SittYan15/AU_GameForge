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

    await Promise.race([
        navigator.serviceWorker.ready,

        new Promise((resolve) =>
            window.setTimeout(
                resolve,
                3000
            )
        )
    ]);

    await waitForServiceWorkerController(
        3000
    );

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

export async function prepareGlbBrowserCache() {
    if (setupPromise) {
        return setupPromise;
    }

    setupPromise = (async () => {
        if (
            !("serviceWorker" in navigator) ||
            !("caches" in window)
        ) {
            console.warn(
                "[GLB Cache] Browser does not support caching."
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

        // Always enable GLB browser caching.
        localStorage.setItem(
            CACHE_PREFERENCE_KEY,
            "enabled"
        );

        postToServiceWorker(
            registration,
            {
                type: "AU_SET_GLB_CACHE_ENABLED",
                enabled: true
            }
        );

        let persistent = false;

        try {
            persistent =
                await requestPersistentStorage();
        } catch (error) {
            console.warn(
                "[GLB Cache] Persistent storage request failed:",
                error
            );
        }

        console.log(
            "[GLB Cache]",
            {
                enabled: true,
                persistent
            }
        );

        return {
            supported: true,
            enabled: true,
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
