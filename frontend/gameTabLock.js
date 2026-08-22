const LOCK_KEY = "auGameForgeActiveGameTab";
const TAB_ID_KEY = "auGameForgeGameTabId";
const CHANNEL_NAME = "au-gameforge-game";
const HEARTBEAT_MS = 2500;
const STALE_AFTER_MS = 8000;

const navigationType = performance.getEntriesByType?.("navigation")?.[0]?.type;
const previousTabId = sessionStorage.getItem(TAB_ID_KEY);
const tabId = navigationType === "reload" && previousTabId
    ? previousTabId
    : crypto.randomUUID();
sessionStorage.setItem(TAB_ID_KEY, tabId);

const channel = typeof BroadcastChannel === "function"
    ? new BroadcastChannel(CHANNEL_NAME)
    : null;
let ownedUserKey = null;
let pendingUserKey = null;
let heartbeatTimer = null;
const competingClaims = new Set();

function readLock() {
    try {
        return JSON.parse(localStorage.getItem(LOCK_KEY) || "null");
    } catch {
        return null;
    }
}

function removeLockIfOwnedOrStale(lock, userKey) {
    const isOwned = lock?.tabId === tabId;
    const isStale = lock?.userKey === userKey
        && (!Number.isFinite(lock.lastHeartbeat)
            || Date.now() - lock.lastHeartbeat >= STALE_AFTER_MS);
    if (!isOwned && !isStale) return false;
    try {
        if (readLock()?.tabId === lock?.tabId) localStorage.removeItem(LOCK_KEY);
    } catch { /* Browser coordination falls back to BroadcastChannel. */ }
    return true;
}

function isLive(lock, userKey) {
    return lock?.userKey === userKey
        && lock.tabId !== tabId
        && Number.isFinite(lock.lastHeartbeat)
        && Date.now() - lock.lastHeartbeat < STALE_AFTER_MS;
}

function writeHeartbeat() {
    if (!ownedUserKey) return;
    const current = readLock();
    if (current && current.tabId !== tabId && Date.now() - current.lastHeartbeat < STALE_AFTER_MS) return;
    try {
        localStorage.setItem(LOCK_KEY, JSON.stringify({
            tabId,
            userKey: ownedUserKey,
            lastHeartbeat: Date.now()
        }));
    } catch { /* BroadcastChannel still prevents live-tab collisions. */ }
}

channel?.addEventListener("message", ({ data }) => {
    if (!data || data.tabId === tabId) return;
    if (data.type === "CLAIM" && data.userKey) {
        if (pendingUserKey === data.userKey) competingClaims.add(data.tabId);
        if (ownedUserKey === data.userKey) {
            channel.postMessage({ type: "ACTIVE", tabId, userKey: ownedUserKey });
        }
    }
    if (data.type === "ACTIVE" && pendingUserKey === data.userKey) competingClaims.add(data.tabId);
});

export async function claimGameTab(session) {
    const userKey = session.accountType === "user"
        ? `user:${session.userId}`
        : `guest:${session.guestId}`;
    const current = readLock();
    removeLockIfOwnedOrStale(current, userKey);
    if (isLive(current, userKey)) return { allowed: false };

    competingClaims.clear();
    pendingUserKey = userKey;
    channel?.postMessage({ type: "CLAIM", tabId, userKey });
    await new Promise((resolve) => setTimeout(resolve, 220));
    const liveAfterCheck = readLock();
    removeLockIfOwnedOrStale(liveAfterCheck, userKey);
    if (isLive(liveAfterCheck, userKey)) {
        pendingUserKey = null;
        return { allowed: false };
    }

    // When tabs race from a cold start, all BroadcastChannel participants use
    // the same deterministic winner. The backend remains the final guard.
    const winner = [tabId, ...competingClaims].sort()[0];
    if (winner !== tabId) {
        pendingUserKey = null;
        return { allowed: false };
    }

    ownedUserKey = userKey;
    pendingUserKey = null;
    writeHeartbeat();
    heartbeatTimer = window.setInterval(writeHeartbeat, HEARTBEAT_MS);
    return { allowed: true, tabId };
}

export function releaseGameTab() {
    if (!ownedUserKey) return;
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    const current = readLock();
    try {
        if (current?.tabId === tabId) localStorage.removeItem(LOCK_KEY);
    } catch { /* Nothing else should be cleared. */ }
    channel?.postMessage({ type: "RELEASED", tabId, userKey: ownedUserKey });
    ownedUserKey = null;
}

window.addEventListener("pagehide", releaseGameTab);
window.addEventListener("beforeunload", releaseGameTab);
