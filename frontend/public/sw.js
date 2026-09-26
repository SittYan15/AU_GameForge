const GLB_CACHE_NAME = "au-gameforge-glb";
const SETTINGS_CACHE_NAME = "au-gameforge-glb-cache-settings";
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

async function prepareGlbResponse(request) {
    const enabled =
        await isGlbCacheEnabled();

    if (!enabled) {
        return {
            response:
                await fetch(request),
            cacheWrite:
                null
        };
    }

    const assetCache =
        await caches.open(
            GLB_CACHE_NAME
        );

    const cached =
        await assetCache.match(
            request
        );

    if (cached) {
        console.log(
            "[GLB Cache] Local hit:",
            request.url
        );

        return {
            response:
                cached,
            cacheWrite:
                null
        };
    }

    console.log(
        "[GLB Cache] Downloading and caching:",
        request.url
    );

    const response =
        await fetch(request);

    let cacheWrite =
        null;

    if (
        response.ok ||
        response.type === "opaque"
    ) {
        cacheWrite =
            assetCache
                .put(
                    request,
                    response.clone()
                )
                .then(() => {
                    console.log(
                        "[GLB Cache] Saved locally:",
                        request.url
                    );
                })
                .catch((error) => {
                    console.warn(
                        "[GLB Cache] Could not save:",
                        request.url,
                        error
                    );
                });
    }

    return {
        response,
        cacheWrite
    };
}

self.addEventListener(
    "fetch",
    (event) => {
        const request =
            event.request;

        if (!isCacheableGlbRequest(request)) {
            return;
        }

        if (request.headers.has("range")) {
            return;
        }

        const prepared =
            prepareGlbResponse(
                request
            );

        event.respondWith(
            prepared.then(
                ({ response }) =>
                    response
            )
        );

        event.waitUntil(
            prepared.then(
                ({ cacheWrite }) =>
                    cacheWrite ||
                    Promise.resolve()
            )
        );
    }
);
