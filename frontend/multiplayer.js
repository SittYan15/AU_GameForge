import * as BABYLON from "@babylonjs/core";
import { AdvancedDynamicTexture, Rectangle, TextBlock } from "@babylonjs/gui/2D";
import { io } from "socket.io-client";
import {
    calculateCharacterGrounding,
    CHARACTER_SCALE,
    groundNetworkPosition,
    markNonGround,
    PLAYER_NAME_TAG_HEIGHT
} from "./grounding.js";
import { createRlglEffects } from "./effects/rlglEffects.js";

export const remotePlayers = new Map();

export const NAME_FULL_VISIBILITY_DISTANCE = 50;
export const NAME_MAX_VISIBILITY_DISTANCE = 80;

const NAME_LABEL_PLANE_WIDTH = 0.62;
const NAME_LABEL_PLANE_HEIGHT = 0.14;
const NAME_LABEL_CLOSE_CAMERA_DISTANCE = 4;
const NAME_LABEL_MIN_CLOSE_SCALE = 0.45;
const NAME_LABEL_MIN_DISTANCE_SCALE = 0.7;

const hostname = window.location.hostname;

const isLocalNetwork =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.startsWith("192.168.") ||
    hostname.startsWith("10.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname);

const SERVER_URL = (
    isLocalNetwork
        ? `${window.location.protocol}//${hostname}:3001`
        : import.meta.env.VITE_SERVER_URL ||
        "https://au-gameforge-backend.onrender.com"
).replace(/\/$/, "");

console.log("Backend URL:", SERVER_URL);

const STORAGE_KEY = "guestCode";
const TAB_AUTH_KEY = "auGameForgeTabAuthenticated";
const LEADERBOARD_REFRESH_MS = 15_000;

export function hasTabAuthentication() {
    return sessionStorage.getItem(TAB_AUTH_KEY) === "true";
}

export function markTabAuthenticated() {
    sessionStorage.setItem(TAB_AUTH_KEY, "true");
}

export function clearTabAuthentication() {
    sessionStorage.removeItem(TAB_AUTH_KEY);
}

const leaderboardPanel = document.createElement("section");
leaderboardPanel.id = "topPlayersStatus";
leaderboardPanel.className = "game-ui";
leaderboardPanel.hidden = true;
leaderboardPanel.setAttribute("aria-label", "Top players by points");
Object.assign(leaderboardPanel.style, {
    position: "absolute",
    top: "68px",
    left: "15px",
    zIndex: "999",
    width: "240px",
    maxWidth: "calc(100vw - 30px)",
    boxSizing: "border-box",
    padding: "10px 12px",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: "10px",
    background: "rgba(25,27,31,0.92)",
    color: "white",
    fontFamily: "sans-serif",
    boxShadow: "0 4px 12px rgba(0,0,0,0.30)",
    backdropFilter: "blur(8px)",
    pointerEvents: "none"
});

const leaderboardTitle = document.createElement("div");
leaderboardTitle.textContent = "🏆 Top Players";
Object.assign(leaderboardTitle.style, {
    marginBottom: "7px",
    fontSize: "13px",
    fontWeight: "800",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    color: "#f7d774"
});
leaderboardPanel.appendChild(leaderboardTitle);

const leaderboardList = document.createElement("div");
leaderboardList.setAttribute("aria-live", "polite");
leaderboardPanel.appendChild(leaderboardList);
document.body.appendChild(leaderboardPanel);

function renderLeaderboard(players = [], currentPlayerName = "") {
    leaderboardList.replaceChildren();

    if (!Array.isArray(players) || players.length === 0) {
        const empty = document.createElement("div");
        empty.textContent = "No scores yet";
        Object.assign(empty.style, { color: "#aeb4bf", fontSize: "12px", padding: "2px 0" });
        leaderboardList.appendChild(empty);
        return;
    }

    const medals = ["🥇", "🥈", "🥉"];
    players.slice(0, 5).forEach((player, index) => {
        const row = document.createElement("div");
        const isCurrentPlayer = player.playerName === currentPlayerName;
        Object.assign(row.style, {
            display: "grid",
            gridTemplateColumns: "26px minmax(0,1fr) auto",
            alignItems: "center",
            gap: "6px",
            minHeight: "24px",
            padding: "2px 0",
            fontSize: "12px",
            fontWeight: isCurrentPlayer ? "800" : "600",
            color: isCurrentPlayer ? "#69f0c0" : "#f2f4f7"
        });

        const rank = document.createElement("span");
        rank.textContent = medals[index] || `#${index + 1}`;
        rank.style.textAlign = "center";

        const name = document.createElement("span");
        name.textContent = player.playerName || "Player";
        Object.assign(name.style, { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" });

        const points = document.createElement("span");
        const score = Number.isFinite(player.points) ? player.points : 0;
        points.textContent = `${score.toLocaleString()} pts`;
        Object.assign(points.style, { color: "#c7ccd4", fontVariantNumeric: "tabular-nums" });

        row.append(rank, name, points);
        leaderboardList.appendChild(row);
    });
}

const rlglUi = document.createElement("div");
rlglUi.style.position = "absolute";
rlglUi.style.top = "10%";
rlglUi.style.left = "50%";
rlglUi.style.transform = "translateX(-50%)";
rlglUi.style.fontSize = "clamp(32px, 5vw, 64px)";
rlglUi.style.fontWeight = "bold";
rlglUi.style.textAlign = "center";
rlglUi.style.textShadow = "4px 4px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000";
rlglUi.style.zIndex = "1000";
rlglUi.style.pointerEvents = "none";
rlglUi.style.display = "none";
document.body.appendChild(rlglUi);

const rlglTimerUi = document.createElement("div");
rlglTimerUi.style.position = "absolute";
rlglTimerUi.style.top = "18%";
rlglTimerUi.style.left = "50%";
rlglTimerUi.style.transform = "translateX(-50%)";
rlglTimerUi.style.fontSize = "clamp(18px, 2.5vw, 28px)";
rlglTimerUi.style.fontWeight = "700";
rlglTimerUi.style.color = "white";
rlglTimerUi.style.textShadow = "2px 2px 0 #000";
rlglTimerUi.style.zIndex = "1000";
rlglTimerUi.style.pointerEvents = "none";
rlglTimerUi.style.display = "none";
document.body.appendChild(rlglTimerUi);

const rlglQuitBtn = document.createElement("button");
rlglQuitBtn.textContent = "Return to Campus";
rlglQuitBtn.style.position = "absolute";
rlglQuitBtn.style.top = "24%";
rlglQuitBtn.style.left = "50%";
rlglQuitBtn.style.transform = "translateX(-50%)";
rlglQuitBtn.style.padding = "12px 24px";
rlglQuitBtn.style.fontSize = "20px";
rlglQuitBtn.style.fontWeight = "bold";
rlglQuitBtn.style.cursor = "pointer";
rlglQuitBtn.style.display = "none";
rlglQuitBtn.style.zIndex = "1001";
rlglQuitBtn.style.pointerEvents = "auto";
document.body.appendChild(rlglQuitBtn);

// ------------------------------------------------------------
// RLGL responsive waiting-rules panel + quit-button layout
// ------------------------------------------------------------
rlglQuitBtn.id = "rlglQuitBtn";

// Desktop / laptop: keep the button in the top-right corner,
// away from the center of the game view.
Object.assign(
    rlglQuitBtn.style,
    {
        position: "fixed",
        top: "16px",
        right: "16px",
        bottom: "auto",
        left: "auto",
        transform: "none",
        padding: "10px 16px",
        fontSize: "clamp(14px, 1.3vw, 18px)",
        borderRadius: "10px",
        border: "1px solid rgba(255,255,255,0.22)",
        background: "rgba(18,20,24,0.90)",
        color: "#ffffff",
        boxShadow: "0 4px 16px rgba(0,0,0,0.35)"
    }
);

const rlglResponsiveStyle =
    document.createElement("style");

rlglResponsiveStyle.textContent = `
    #rlglRulesPanel {
        scrollbar-width: thin;
    }

    @media (max-width: 700px) {
        #rlglQuitBtn {
            top: auto !important;
            right: 12px !important;
            bottom: calc(12px + env(safe-area-inset-bottom)) !important;
            left: auto !important;
            transform: none !important;
            padding: 10px 14px !important;
            font-size: 14px !important;
            max-width: 46vw !important;
        }

        #rlglRulesPanel {
            left: 10px !important;
            right: 10px !important;
            bottom: calc(68px + env(safe-area-inset-bottom)) !important;
            width: auto !important;
            max-height: 38vh !important;
            padding: 10px 12px !important;
            font-size: 12px !important;
        }

        #rlglRulesPanel .rlgl-rules-title {
            font-size: 15px !important;
        }
    }
`;

document.head.appendChild(
    rlglResponsiveStyle
);

const rlglRulesPanel =
    document.createElement("aside");

rlglRulesPanel.id =
    "rlglRulesPanel";

rlglRulesPanel.setAttribute(
    "aria-label",
    "Red Light Green Light rules and tips"
);

Object.assign(
    rlglRulesPanel.style,
    {
        position: "fixed",
        left: "16px",
        bottom: "18px",
        zIndex: "1000",
        width: "min(340px, calc(100vw - 32px))",
        maxHeight: "46vh",
        overflowY: "auto",
        boxSizing: "border-box",
        padding: "12px 14px",
        border: "1px solid rgba(255,255,255,0.18)",
        borderRadius: "12px",
        background: "rgba(15,17,21,0.88)",
        color: "#f5f7fa",
        fontFamily: "system-ui, sans-serif",
        fontSize: "13px",
        lineHeight: "1.4",
        boxShadow: "0 6px 20px rgba(0,0,0,0.36)",
        backdropFilter: "blur(8px)",
        pointerEvents: "none",
        display: "none"
    }
);

const rlglRulesTitle =
    document.createElement("div");

rlglRulesTitle.className =
    "rlgl-rules-title";

rlglRulesTitle.textContent =
    "🚦 Red Light, Green Light";

Object.assign(
    rlglRulesTitle.style,
    {
        fontSize: "17px",
        fontWeight: "800",
        marginBottom: "7px",
        color: "#ffffff"
    }
);

const rlglRulesBody =
    document.createElement("div");

rlglRulesBody.innerHTML = `
    <div style="font-weight:800;color:#ffd166;margin-bottom:4px;">Rules</div>
    <div>🟢 <b>Green:</b> move or sprint toward the finish.</div>
    <div>🔴 <b>Red:</b> stop completely — moving can eliminate you.</div>
    <div>🏁 Cross the finish line to survive and earn the reward.</div>
    <div>🚧 Stay inside the playground; leaving the legal area eliminates you.</div>

    <div style="font-weight:800;color:#7ee787;margin:8px 0 4px;">Tips</div>
    <div>• Release movement immediately when the lamp turns red.</div>
    <div>• Sprint during green to cover more distance.</div>
    <div>• Staying near the center of the lane gives you more room.</div>
    <div>• Watch the traffic lamp and the 3D timer together.</div>
`;

rlglRulesPanel.append(
    rlglRulesTitle,
    rlglRulesBody
);

document.body.appendChild(
    rlglRulesPanel
);

function setRlglRulesVisible(visible) {
    rlglRulesPanel.style.display =
        visible
            ? "block"
            : "none";
}

function setRlglMessage(text, color = "#ffffff", emphasized = false) {
    rlglUi.textContent = text;
    rlglUi.style.color = color;
    rlglUi.style.display = text ? "block" : "none";
    rlglUi.style.transition = emphasized ? "transform 0.25s ease" : "none";
    rlglUi.style.transform = emphasized
        ? "translateX(-50%) scale(1.12)"
        : "translateX(-50%)";
}

function clearRlglUi() {
    setRlglRulesVisible(false);
    setRlglMessage("");
    rlglTimerUi.textContent = "";
    rlglTimerUi.style.display = "none";
    rlglQuitBtn.style.display = "none";
}

rlglQuitBtn.addEventListener("click", () => {
    rlglQuitBtn.style.display = "none";
    if (window.exitRlgl) window.exitRlgl();
});

async function request(path, options = {}) {
    const response = await fetch(`${SERVER_URL}${path}`, {
        ...options,
        credentials: "include",
        headers: { "Content-Type": "application/json", ...options.headers }
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
        if (response.status === 401 && body.code === "SESSION_REPLACED") {
            window.dispatchEvent(new CustomEvent("auth:session-replaced", {
                detail: { message: body.error }
            }));
        }
        const error = new Error(body.error || `Request failed (${response.status}).`);
        error.status = response.status;
        Object.entries(body).forEach(([key, value]) => {
            if (key !== "error") error[key] = value;
        });
        throw error;
    }
    return body;
}

export async function getLeaderboard() {
    return request("/api/users/leaderboard");
}

export async function googleLogin(credential) {
    const session = await request("/api/auth/google", {
        method: "POST",
        body: JSON.stringify({ credential })
    });
    markTabAuthenticated();
    return session;
}

export async function upgradeGuestWithGoogle(credential, mergeConfirmed = false) {
    return request("/api/auth/google/upgrade-guest", {
        method: "POST",
        body: JSON.stringify({ credential, mergeConfirmed })
    });
}

export async function getProfile(options = {}) {
    return request("/api/profile", options);
}

export async function restoreSession() {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10000);
    try {
        const profile = await getProfile({ signal: controller.signal });
        return {
            ...profile,
            token: profile.accountType === "user" ? profile.token : undefined
        };
    } catch (error) {
        if (error.name === "AbortError") {
            throw new Error("Session restoration timed out. Please check your connection and try again.");
        }
        throw error;
    } finally {
        clearTimeout(timeout);
    }
}

export async function logoutSession() {
    const response = await request("/api/auth/logout", { method: "POST" });
    clearTabAuthentication();
    return response;
}

export async function keepSessionAlive() {
    return request("/api/auth/heartbeat", { method: "POST" });
}

export function clearSavedGuest() {
    localStorage.removeItem(STORAGE_KEY);
}

export async function createGuest() {
    const guest = await request("/api/guests", { method: "POST" });
    localStorage.setItem(STORAGE_KEY, guest.guestCode);
    markTabAuthenticated();
    return toGuestSession(guest);
}

export async function restoreGuest(guestCode) {
    const normalizedCode = String(guestCode || "").trim().toUpperCase();
    const guest = await request("/api/guests/restore", {
        method: "POST",
        body: JSON.stringify({ guestCode: normalizedCode })
    });
    localStorage.setItem(STORAGE_KEY, guest.guestCode);
    markTabAuthenticated();
    return toGuestSession(guest);
}

function toGuestSession(guest) {
    return {
        accountType: "guest",
        userId: null,
        guestId: guest.id,
        guestCode: guest.guestCode,
        playerName: guest.playerName,
        points: guest.points,
        avatarKey: guest.avatarKey || "default_avatar",
        bio: guest.bio || ""
    };
}

export async function loginUser(username, password) {
    const user = await request("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username: String(username || "").trim(), password })
    });
    markTabAuthenticated();
    return {
        accountType: "user",
        userId: user.id,
        guestId: null,
        guestCode: null,
        playerName: user.playerName,
        points: user.points,
        avatarKey: user.avatarKey || "default_avatar",
        bio: user.bio || "",
        email: user.email || null,
        profilePictureUrl: user.profilePictureUrl || null,
        token: user.token
    };
}

export async function signupUser(username, password) {
    const user = await request("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({ username: String(username || "").trim(), password })
    });
    markTabAuthenticated();
    return {
        accountType: "user",
        userId: user.id,
        guestId: null,
        guestCode: null,
        playerName: user.playerName,
        points: user.points,
        avatarKey: user.avatarKey || "default_avatar",
        bio: user.bio || "",
        email: user.email || null,
        profilePictureUrl: user.profilePictureUrl || null,
        token: user.token
    };
}

export async function upgradeGuestWithPassword(username, password) {
    const user = await request("/api/auth/signup-guest", {
        method: "POST",
        body: JSON.stringify({ username: String(username || "").trim(), password })
    });
    markTabAuthenticated();
    return {
        accountType: "user",
        accountProvider: "password",
        userId: user.id,
        guestId: null,
        guestCode: null,
        playerName: user.playerName,
        points: user.points,
        avatarKey: user.avatarKey || "default_avatar",
        bio: user.bio || "",
        email: user.email || null,
        profilePictureUrl: user.profilePictureUrl || null,
        token: user.token
    };
}

export async function updateGuestProfile(profile) {
    return request("/api/guests/profile", {
        method: "PATCH",
        body: JSON.stringify({
            playerName: profile.playerName,
            avatarKey: profile.avatarKey,
            bio: profile.bio
        })
    });
}

function animationByName(animationGroups, name) {
    return animationGroups.find((group) => group.name.toLowerCase().includes(name));
}

function normalizeAngle(angle) {
    return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function isVector3(value) {
    return value && [value.x, value.y, value.z].every(Number.isFinite);
}

export async function createMultiplayer(scene, localPlayer, session, handlers = {}) {
    const assetContainer = await BABYLON.SceneLoader.LoadAssetContainerAsync("./", "BoyAnimV2.4.glb", scene);
    const rlglEffects = createRlglEffects(scene);
    const rlglSignal = scene.metadata?.rlglSignal ?? null;
    const rlglArenaTimer =
        scene.metadata?.rlglArenaTimer
        ?? null;

    const rlglActiveWalls =
        scene.metadata?.rlglActiveWalls
        ?? null;

    const rlglTestKeyHandler = async (event) => {

        if (
            event.key !== "7" &&
            event.key !== "8" &&
            event.key !== "9"
        ) {
            return;
        }

        await unlockAudio();

        console.log(
            "Audio state:",
            BABYLON.Engine.audioEngine
                ?.audioContext?.state
        );

        if (event.key === "7") {

            console.log("🟢 GREEN TEST");

            rlglEffects.greenLight();
        }

        if (event.key === "8") {

            console.log("🔴 RED TEST");

            rlglEffects.redLight();
        }

        if (event.key === "9") {

            console.log("💥 EXPLOSION TEST");

            rlglEffects.explosion(
                localPlayer.position.clone()
            );
        }
    };

    document.addEventListener(
        "keydown",
        rlglTestKeyHandler
    );
    assetContainer.materials.forEach((material) => {
        material.transparencyMode = BABYLON.PBRMaterial.PBRMATERIAL_OPAQUE;
        material.backFaceCulling = true;
        material.alpha = 1;
    });
    const notifyPlayerCount = () => handlers.onPlayerCountChanged?.(remotePlayers.size + 1);

    const createNameTag = (linkedMesh, playerName, id, worldHeight = 0.85, headBinding = null) => {
        const plane = BABYLON.MeshBuilder.CreatePlane(`nameTagPlane_${id}`, {
            width: NAME_LABEL_PLANE_WIDTH,
            height: NAME_LABEL_PLANE_HEIGHT
        }, scene);
        plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
        plane.isPickable = false;
        plane.checkCollisions = false;
        plane.renderingGroupId = 2;
        markNonGround(plane, "name-label");

        const texture = AdvancedDynamicTexture.CreateForMesh(plane, 512, 128, false);

        const updatePosition = () => {
            if (headBinding?.bone && headBinding.mesh) {
                plane.position.copyFrom(headBinding.bone.getAbsolutePosition(headBinding.mesh));
                plane.position.y += 0.12;
            } else {
                plane.position.copyFrom(linkedMesh.getAbsolutePosition());
                plane.position.y += worldHeight;
            }
        };
        updatePosition();

        const container = new Rectangle(`nameTagContainer_${id}`);
        container.width = 1;
        container.height = 1;
        container.cornerRadius = 18;
        container.thickness = 4;
        container.color = "rgba(255, 255, 255, 0.8)";
        container.background = "rgba(10, 10, 10, 0.78)";
        container.isPointerBlocker = false;

        const textBlock = new TextBlock(`nameTagText_${id}`, playerName);
        textBlock.color = "white";
        textBlock.fontFamily = "Arial, sans-serif";
        textBlock.fontSize = 46;
        textBlock.fontWeight = "600";
        textBlock.textWrapping = false;
        textBlock.isPointerBlocker = false;
        container.addControl(textBlock);
        texture.addControl(container);

        return {
            plane,
            texture,
            container,
            textBlock,
            updatePosition,
            setVisibility(opacity) {
                const clampedOpacity = BABYLON.Scalar.Clamp(opacity, 0, 1);
                plane.setEnabled(clampedOpacity > 0);
                container.alpha = clampedOpacity;
            },
            setScale(scale) {
                const cappedScale = BABYLON.Scalar.Clamp(scale, NAME_LABEL_MIN_CLOSE_SCALE, 1);
                plane.scaling.setAll(cappedScale);
            },
            dispose() {
                texture.removeControl(container);
                container.dispose();
                texture.dispose();
                plane.dispose(false, true);
            }
        };
    };

    const playRemoteAnimation = (remotePlayer, animationName) => {
        if (remotePlayer.currentAnimation === animationName) return;
        const nextAnimation = animationByName(remotePlayer.animationGroups, animationName);
        if (!nextAnimation) return;
        remotePlayer.animationGroups.forEach((group) => group.stop());
        nextAnimation.start(true, 1, nextAnimation.from, nextAnimation.to, false);
        remotePlayer.currentAnimation = animationName;
    };

    const createRemotePlayer = (data, source = "new-player") => {
        if (!data || data.socketId === socket.id || remotePlayers.has(data.socketId)) return;

        const instance = assetContainer.instantiateModelsToScene(
            (name) => `remote_${data.socketId}_${name}`,
            false,
            { doNotInstantiate: true }
        );
        const rootMesh = new BABYLON.TransformNode(`remotePlayer_${data.socketId}`, scene);
        markNonGround(rootMesh, "remote-player");
        instance.rootNodes.forEach((node) => {
            node.parent = rootMesh;
            node.scaling.scaleInPlace(CHARACTER_SCALE);
            markNonGround(node, "remote-player");
        });
        rootMesh.position.copyFrom(groundNetworkPosition(scene, data.position, source, data.socketId));
        rootMesh.rotation.copyFromFloats(data.rotation.x, data.rotation.y, data.rotation.z);
        const characterGrounding = calculateCharacterGrounding(rootMesh, instance.rootNodes);
        const characterMeshes = instance.rootNodes.flatMap((node) => {
            const meshes = node.getChildMeshes?.(false) || [];
            return node.getTotalVertices?.() > 0 ? [node, ...meshes] : meshes;
        });
        const headBinding = characterMeshes.map((mesh) => {
            const bones = mesh.skeleton?.bones || [];
            const bone = bones.find((candidate) => candidate.name.includes("HeadTop_End"))
                || bones.find((candidate) => candidate.name.endsWith(":Head"));
            return bone ? { bone, mesh } : null;
        }).find(Boolean);

        instance.animationGroups.forEach((group) => group.stop());
        const remotePlayer = {
            socketId: data.socketId,
            rootMesh,
            targetPosition: rootMesh.position.clone(),
            targetRotation: rootMesh.rotation.clone(),
            animationGroups: instance.animationGroups,
            currentAnimation: null,
            characterGrounding,
            playerName: data.playerName,
            avatarKey: data.avatarKey || "default_avatar",
            nameTag: createNameTag(
                rootMesh,
                data.playerName,
                data.socketId,
                PLAYER_NAME_TAG_HEIGHT,
                headBinding
            )
        };
        remotePlayers.set(data.socketId, remotePlayer);
        playRemoteAnimation(remotePlayer, data.animation || "idle");
        notifyPlayerCount();
    };

    const removeRemotePlayer = (socketId) => {
        const remotePlayer = remotePlayers.get(socketId);
        if (!remotePlayer) return;
        remotePlayer.nameTag.dispose();
        remotePlayer.animationGroups.forEach((group) => group.dispose());
        remotePlayer.rootMesh.dispose(false, false);
        remotePlayers.delete(socketId);
        notifyPlayerCount();
    };

    let multiplayerJoined = false;
    let clientInRlgl = false;
    let rlglRole = "none";
    let rlglPhase = "IDLE";
    let rlglRoundEndsAt = null;
    let lastTimerSecond = null;
    let leaderboardRefreshInterval = null;

    const updateLeaderboard = (players) => renderLeaderboard(players, session.playerName);
    const refreshLeaderboard = async () => {
        try {
            updateLeaderboard(await getLeaderboard());
        } catch (error) {
            console.warn("Could not refresh leaderboard:", error.message);
        }
    };

    const socket = io(SERVER_URL, {
        transports: ["websocket", "polling"],
        auth: {
            token: session.accountType === "user" ? session.token : undefined,
            gameTabId: session.gameTabId
        }
    });

    socket.on("connect", () => {
        const state = localPlayer.getNetworkState();
        socket.emit("player:join", {
            accountType: session.accountType,
            userId: session.userId,
            guestId: session.guestId,
            guestCode: session.guestCode,
            playerName: session.playerName,
            position: state.position,
            rotation: state.rotation
        });
        socket.emit("player:animation", state.animation);
        handlers.onConnectionChanged?.(true);
        notifyPlayerCount();
        void refreshLeaderboard();
        if (!leaderboardRefreshInterval) {
            leaderboardRefreshInterval = window.setInterval(refreshLeaderboard, LEADERBOARD_REFRESH_MS);
        }
    });

    socket.on("disconnect", () => {
        rlglActiveWalls?.setActive(false);
        multiplayerJoined = false;
        [...remotePlayers.keys()].forEach(removeRemotePlayer);
        handlers.onConnectionChanged?.(false);
        handlers.onPlayerCountChanged?.(0);
        if (clientInRlgl) {
            localPlayer.isLocked = true;
            setRlglMessage("Reconnecting...", "#ffcc66");
        }
    });

    socket.on("connect_error", (error) => handlers.onError?.(error));
    socket.on("player:joinError", (message) => handlers.onError?.(new Error(message)));
    socket.on("auth:sessionReplaced", ({ message } = {}) => {
        window.dispatchEvent(new CustomEvent("auth:session-replaced", {
            detail: { message }
        }));
        socket.disconnect();
    });
    socket.on("game:duplicateTab", () => {
        window.dispatchEvent(new Event("game:duplicate-tab"));
        socket.disconnect();
    });
    socket.on("player:spawned", (position) => {
        if (!isVector3(position)) return;
        multiplayerJoined = true;
        localPlayer.setGroundedPosition(position, "server-spawn");
        if (clientInRlgl && socket.connected) socket.emit("rlgl:join");
    });
    socket.on("players:current", (players) => {
        players.forEach((player) => createRemotePlayer(player, "initial-player"));
        notifyPlayerCount();
    });
    socket.on("player:joined", (player) => createRemotePlayer(player, "new-player"));
    socket.on("player:moved", ({ socketId, position, rotation }) => {
        const remotePlayer = remotePlayers.get(socketId);
        if (!remotePlayer || !isVector3(position) || !isVector3(rotation)) return;
        remotePlayer.targetPosition.copyFrom(groundNetworkPosition(scene, position, "movement-update", socketId));
        remotePlayer.targetRotation.copyFromFloats(rotation.x, rotation.y, rotation.z);
    });
    socket.on("player:animationChanged", ({ socketId, animation }) => {
        const remotePlayer = remotePlayers.get(socketId);
        if (remotePlayer) playRemoteAnimation(remotePlayer, animation);
    });
    socket.on("player:left", removeRemotePlayer);
    socket.on("player:identityChanged", ({ socketId, playerName }) => {
        if (socketId === socket.id) return;
        const remotePlayer = remotePlayers.get(socketId);
        if (remotePlayer) {
            remotePlayer.playerName = playerName;
            remotePlayer.nameTag.textBlock.text = playerName;
        }
    });
    socket.on("player:profileUpdated", ({ socketId, playerName, avatarKey }) => {
        if (socketId === socket.id) return;
        const remotePlayer = remotePlayers.get(socketId);
        if (!remotePlayer) return;
        remotePlayer.playerName = playerName;
        remotePlayer.avatarKey = avatarKey;
        remotePlayer.nameTag.textBlock.text = playerName;
    });
    socket.on("chat:history", (messages) => handlers.onChatHistory?.(messages));
    socket.on("chat:message", (message) => handlers.onChatMessage?.(message));
    socket.on("leaderboard:updated", updateLeaderboard);

    socket.on("rlgl:error", (message) => {
        handlers.onError?.(new Error(message));
        localPlayer.isLocked = false;
        setRlglMessage(message, "#ff6666");
        rlglQuitBtn.style.display = "block";
    });

    socket.on("rlgl:teleport", ({ position, reason } = {}) => {
        if (!isVector3(position)) return;
        localPlayer.setGroundedPosition(position, `rlgl-${reason || "teleport"}`);
        if (reason === "join" || reason === "lobby-reset" || reason === "round-start") {
            clientInRlgl = true;
        }
    });

    socket.on("rlgl:correction", (position) => {
        if (!isVector3(position)) return;
        localPlayer.setGroundedPosition(position, "rlgl-server-correction");
    });

    socket.on("rlgl:role", (role) => {
        rlglRole = role;
        if (rlglPhase === "ACTIVE" && role === "spectator") {
            localPlayer.isLocked = false;
            setRlglMessage("Spectating Round...", "#aaaaaa");
            rlglQuitBtn.style.display = "block";
        }
    });

    socket.on(
        "rlgl:lobby_countdown",
        (count) => {

            rlglSignal?.setCountdown(count);

            // Don't show countdown in the
            // RED/GREEN screen message.
            setRlglMessage("");

            if (count <= 5) {
                rlglEffects.countdown();
            }
        }
    );

    socket.on("rlgl:phase", (phase) => {
        rlglPhase = phase;
        const wall = scene.getMeshByName("rlgl_starting_wall");
        if (wall) {
            wall.checkCollisions = true;
            wall.isVisible = true;
        }

        if (phase === "LOBBY") {
            setRlglRulesVisible(true);
            rlglArenaTimer?.setNeutral?.();
            rlglActiveWalls?.setActive(false);
            rlglRole = "waiting";
            rlglSignal?.setWaiting();
            rlglArenaTimer?.hide();
            rlglRoundEndsAt = null;
            lastTimerSecond = null;
            localPlayer.isEliminated = false;
            localPlayer.hasFinished = false;
            localPlayer.isLocked = false;
            setRlglMessage("Waiting for next round...", "#ffffff");
            rlglTimerUi.style.display = "none";
            rlglQuitBtn.style.display = "block";
        } else if (phase === "ACTIVE") {
            setRlglRulesVisible(false);
            rlglActiveWalls?.setActive(true);
            rlglQuitBtn.style.display = rlglRole === "spectator" ? "block" : "none";
            if (rlglRole === "spectator") {
                localPlayer.isLocked = false;
                setRlglMessage("Spectating Round...", "#aaaaaa");
            }
        } else if (phase === "FINISHED") {
            setRlglRulesVisible(false);
            rlglArenaTimer?.setNeutral?.();
            rlglActiveWalls?.setActive(false);
            rlglSignal?.setFinished();
            rlglArenaTimer?.hide();
            rlglRoundEndsAt = null;
            lastTimerSecond = null;
            localPlayer.isLocked = true;
            rlglTimerUi.style.display = "none";
            const resultText = localPlayer.hasFinished
                ? "Round Over — You survived!"
                : localPlayer.isEliminated
                    ? "Round Over — Eliminated"
                    : "Round Over!";
            setRlglMessage(resultText, "#ffffff");
            rlglQuitBtn.style.display = "block";
        }
    });

    socket.on(
        "rlgl:round_started",
        ({ endsAt } = {}) => {

            rlglRoundEndsAt =
                Number.isFinite(endsAt)
                    ? endsAt
                    : null;

            lastTimerSecond = null;

            // Never use old 2D timer.
            rlglTimerUi.style.display =
                "none";

            if (rlglRoundEndsAt) {

                const secondsLeft =
                    Math.max(
                        0,
                        Math.ceil(
                            (
                                rlglRoundEndsAt -
                                Date.now()
                            ) / 1000
                        )
                    );

                rlglArenaTimer?.setTime(
                    secondsLeft
                );

                rlglArenaTimer?.show();
            }
        }
    );

    socket.on(
        "rlgl:state",
        (isRedLight) => {
            rlglArenaTimer?.setSignalState?.(
                isRedLight
            );

            if (isRedLight) {

                // Existing audio / VFX
                rlglEffects.redLight();

                // Turn on physical RED mesh
                rlglSignal?.setRedLight();

            } else {

                rlglEffects.greenLight();

                // Turn on physical GREEN mesh
                rlglSignal?.setGreenLight();
            }

            if (
                localPlayer.isEliminated ||
                localPlayer.hasFinished
            ) {
                return;
            }

            if (rlglRole !== "player") {

                // Spectator is a personal state,
                // so screen UI is okay here.
                setRlglMessage(
                    "Spectating Round...",
                    "#aaaaaa"
                );

                return;
            }

            // Keep player controllable.
            // Server detects illegal movement
            // during Red Light.
            localPlayer.isLocked = false;

            // IMPORTANT:
            // Do not display RED/GREEN on screen.
            setRlglMessage("");
        }
    );

    socket.on(
        "rlgl:eliminated",
        ({ reason } = {}) => {

            localPlayer.isLocked = true;
            localPlayer.isEliminated = true;

            rlglEffects.eliminated();

            setRlglMessage(
                "💥 ELIMINATED!",
                "#ff3333",
                true
            );

            rlglQuitBtn.style.display =
                "block";
        }
    );

    socket.on(
        "rlgl:player_eliminated",
        ({
            socketId,
            position
        }) => {

            let explosionPosition = null;

            // Server position is preferred.
            if (isVector3(position)) {
                explosionPosition =
                    new BABYLON.Vector3(
                        position.x,
                        position.y,
                        position.z
                    );
            }

            // Fallback to the rendered character.
            if (!explosionPosition) {

                if (socketId === socket.id) {
                    explosionPosition =
                        localPlayer.position.clone();
                } else {

                    const remotePlayer =
                        remotePlayers.get(socketId);

                    if (remotePlayer) {
                        explosionPosition =
                            remotePlayer.rootMesh
                                .position.clone();
                    }
                }
            }

            if (explosionPosition) {
                rlglEffects.explosion(
                    explosionPosition
                );
            }
        }
    );

    socket.on(
        "rlgl:winner",
        (result) => {

            localPlayer.isLocked = true;
            localPlayer.hasFinished = true;

            rlglEffects.winner();

            const points =
                result?.pointsEarned ?? 0;

            setRlglMessage(
                `🎉 SURVIVED! +${points} POINTS 🎉`,
                "#FFD700",
                true
            );

            rlglQuitBtn.style.display =
                "block";
        }
    );

    socket.on("rlgl:left", () => {
        rlglActiveWalls?.setActive(false);
        rlglArenaTimer?.hide();
        clientInRlgl = false;
        rlglRole = "none";
        rlglPhase = "IDLE";

        rlglSignal?.setIdle();

        rlglRoundEndsAt = null;
        lastTimerSecond = null;
        localPlayer.isEliminated = false;
        localPlayer.hasFinished = false;
        localPlayer.isLocked = false;
        clearRlglUi();
    });

    let lastSentAt = 0;
    let lastPosition = null;
    let lastRotation = null;
    scene.onBeforeRenderObservable.add(() => {
        const smoothing = 1 - Math.exp(-12 * scene.getEngine().getDeltaTime() / 1000);
        remotePlayers.forEach((remotePlayer) => {
            remotePlayer.rootMesh.position = BABYLON.Vector3.Lerp(
                remotePlayer.rootMesh.position,
                remotePlayer.targetPosition,
                smoothing
            );
            remotePlayer.rootMesh.rotation.x = BABYLON.Scalar.Lerp(remotePlayer.rootMesh.rotation.x, remotePlayer.targetRotation.x, smoothing);
            remotePlayer.rootMesh.rotation.z = BABYLON.Scalar.Lerp(remotePlayer.rootMesh.rotation.z, remotePlayer.targetRotation.z, smoothing);
            const yDifference = normalizeAngle(remotePlayer.targetRotation.y - remotePlayer.rootMesh.rotation.y);
            remotePlayer.rootMesh.rotation.y = normalizeAngle(remotePlayer.rootMesh.rotation.y + yDifference * smoothing);
            remotePlayer.nameTag.updatePosition();
            const playerDistance = BABYLON.Vector3.Distance(localPlayer.position, remotePlayer.rootMesh.position);
            const opacity = playerDistance <= NAME_FULL_VISIBILITY_DISTANCE
                ? 1
                : playerDistance >= NAME_MAX_VISIBILITY_DISTANCE
                    ? 0
                    : (NAME_MAX_VISIBILITY_DISTANCE - playerDistance)
                    / (NAME_MAX_VISIBILITY_DISTANCE - NAME_FULL_VISIBILITY_DISTANCE);
            remotePlayer.nameTag.setVisibility(opacity);
            const cameraDistance = scene.activeCamera
                ? BABYLON.Vector3.Distance(scene.activeCamera.globalPosition, remotePlayer.nameTag.plane.position)
                : NAME_LABEL_CLOSE_CAMERA_DISTANCE;
            const closeCameraScale = BABYLON.Scalar.Clamp(
                cameraDistance / NAME_LABEL_CLOSE_CAMERA_DISTANCE,
                NAME_LABEL_MIN_CLOSE_SCALE,
                1
            );
            const distanceScale = BABYLON.Scalar.Clamp(
                1 - playerDistance / (NAME_MAX_VISIBILITY_DISTANCE * 2),
                NAME_LABEL_MIN_DISTANCE_SCALE,
                1
            );
            remotePlayer.nameTag.setScale(Math.min(closeCameraScale, distanceScale));
        });

        if (
            clientInRlgl &&
            rlglPhase === "ACTIVE" &&
            rlglRoundEndsAt
        ) {
            const secondsLeft =
                Math.max(
                    0,
                    Math.ceil(
                        (
                            rlglRoundEndsAt -
                            Date.now()
                        ) / 1000
                    )
                );

            if (
                secondsLeft !==
                lastTimerSecond
            ) {

                // Update all four physical timers.
                rlglArenaTimer?.setTime(
                    secondsLeft
                );

                rlglArenaTimer?.show();

                // Old HUD timer stays hidden.
                rlglTimerUi.style.display =
                    "none";

                lastTimerSecond =
                    secondsLeft;
            }
        }

        const now = performance.now();
        if (!socket.connected || now - lastSentAt < 1000 / 15) return;
        const state = localPlayer.getNetworkState();
        const position = new BABYLON.Vector3(state.position.x, state.position.y, state.position.z);
        const rotation = new BABYLON.Vector3(state.rotation.x, state.rotation.y, state.rotation.z);
        const changed = !lastPosition || !lastRotation
            || BABYLON.Vector3.DistanceSquared(position, lastPosition) > 0.000001
            || BABYLON.Vector3.DistanceSquared(rotation, lastRotation) > 0.000001;
        if (!changed) return;
        socket.emit("player:move", { position: state.position, rotation: state.rotation });
        lastPosition = position;
        lastRotation = rotation;
        lastSentAt = now;
    });

    return {
        socket,
        joinRlgl() {
            if (!socket.connected || !multiplayerJoined) return false;
            clientInRlgl = true;
            localPlayer.isLocked = true;
            setRlglMessage("Entering Red Light, Green Light...", "#ffffff");
            socket.emit("rlgl:join");
            return true;
        },
        finishRlgl() {
            if (!socket.connected || !clientInRlgl) return false;
            socket.emit("rlgl:finish");
            return true;
        },
        leaveRlgl() {
            const wasConnected = socket.connected;
            clientInRlgl = false;
            rlglRole = "none";
            rlglRoundEndsAt = null;
            if (wasConnected) socket.emit("rlgl:leave");
            return wasConnected;
        },
        sendAnimation(animation) {
            if (socket.connected) socket.emit("player:animation", animation);
        },
        sendChat(text) {
            if (socket.connected) socket.emit("chat:message", { text });
        },
        updateIdentity() {
            if (socket.connected) socket.emit("player:identityUpdate");
        },
        updateProfile(profile) {
            if (socket.connected) {
                socket.emit("player:profileUpdate", {
                    playerName: profile.playerName,
                    avatarKey: profile.avatarKey
                });
            }
        },
        dispose() {

            rlglEffects.dispose();

            [...remotePlayers.keys()]
                .forEach(removeRemotePlayer);

            assetContainer.dispose();
            socket.disconnect();
        }
    };
}
