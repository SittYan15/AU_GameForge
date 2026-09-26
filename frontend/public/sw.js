const GLB_CACHE_NAME = "au-gameforge-glb-v2";
const SETTINGS_CACHE_NAME = "au-gameforge-glb-cache-settings-v1";
const PREF_URL = new URL(
    "/__au-gameforge-glb-cache-enabled__",
    self.location.origin
).href;

// Current R2 endpoint + future custom domain.
// Keep r2.dev active while the university network blocks sittyan.com.
const ALLOWED_ASSET_HOSTS = new Set([
    "pub-1594e8b359fe4ef08605e86f19e11eeb.r2.dev",
    "assets.sittyan.com"
]);

self.addEventListener("install", () => {
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(self.clients.claim());
});

function isCacheableGlbRequest(request) {
    if (request.method !== "GET") {
        return false;
    }

    const url = new URL(request.url);

    const isAllowedHost =
        ALLOWED_ASSET_HOSTS.has(url.hostname) ||
        url.hostname === "localhost" ||
        url.hostname === "127.0.0.1";

    return (
        isAllowedHost &&
        url.pathname.toLowerCase().endsWith(".glb")
    );
}

async function isGlbCacheEnabled() {
    const settingsCache =
        await caches.open(SETTINGS_CACHE_NAME);

    const stored =
        await settingsCache.match(PREF_URL);

    return Boolean(stored);
}

async function setGlbCacheEnabled(enabled) {
    const settingsCache =
        await caches.open(SETTINGS_CACHE_NAME);

    if (enabled) {
        await settingsCache.put(
            PREF_URL,
            new Response("enabled", {
                headers: {
                    "Content-Type": "text/plain",
                    "Cache-Control": "no-store"
                }
            })
        );
    } else {
        await settingsCache.delete(PREF_URL);
    }
}

async function clearGlbCache() {
    await caches.delete(GLB_CACHE_NAME);
}

self.addEventListener("message", (event) => {
    const message = event.data || {};

    if (message.type === "AU_SET_GLB_CACHE_ENABLED") {
        event.waitUntil(
            setGlbCacheEnabled(
                message.enabled === true
            )
        );
        return;
    }

    if (message.type === "AU_CLEAR_GLB_CACHE") {
        event.waitUntil(clearGlbCache());
    }
});

self.addEventListener("fetch", (event) => {
    const request = event.request;

    if (!isCacheableGlbRequest(request)) {
        return;
    }

    // Avoid returning a full cached object to an HTTP Range request.
    // Babylon normally requests these GLBs as full files, but this keeps
    // the worker safe if browser behavior changes.
    if (request.headers.has("range")) {
        return;
    }

    event.respondWith(
        (async () => {
            const enabled =
                await isGlbCacheEnabled();

            if (!enabled) {
                return fetch(request);
            }

            const assetCache =
                await caches.open(GLB_CACHE_NAME);

            const cached =
                await assetCache.match(request);

            if (cached) {
                console.log(
                    "[GLB Cache] Local hit:",
                    request.url
                );

                return cached;
            }

            console.log(
                "[GLB Cache] Downloading once:",
                request.url
            );

            const response =
                await fetch(request);

            // A CORS response is normally response.ok.
            // Opaque is accepted too so the cache remains usable if
            // the R2 CORS configuration changes.
            if (
                response.ok ||
                response.type === "opaque"
            ) {
                try {
                    await assetCache.put(
                        request,
                        response.clone()
                    );

                    console.log(
                        "[GLB Cache] Saved locally:",
                        request.url
                    );
                } catch (error) {
                    // Quota/storage failure must never prevent the game
                    // from receiving the successfully downloaded GLB.
                    console.warn(
                        "[GLB Cache] Could not save:",
                        request.url,
                        error
                    );
                }
            }

            return response;
        })()
    );
});
