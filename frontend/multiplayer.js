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

export const remotePlayers = new Map();

export const NAME_FULL_VISIBILITY_DISTANCE = 50;
export const NAME_MAX_VISIBILITY_DISTANCE = 80;

const NAME_LABEL_PLANE_WIDTH = 0.62;
const NAME_LABEL_PLANE_HEIGHT = 0.14;
const NAME_LABEL_CLOSE_CAMERA_DISTANCE = 4;
const NAME_LABEL_MIN_CLOSE_SCALE = 0.45;
const NAME_LABEL_MIN_DISTANCE_SCALE = 0.7;

const SERVER_URL = (import.meta.env.VITE_SERVER_URL || (
    window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
        ? "http://localhost:3000"
        : "https://au-gameforge-backend.onrender.com"
)).replace(/\/$/, "");

const STORAGE_KEY = "guestCode";

async function request(path, options = {}) {
    const response = await fetch(`${SERVER_URL}${path}`, {
        ...options,
        credentials: "include",
        headers: { "Content-Type": "application/json", ...options.headers }
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
        const error = new Error(body.error || `Request failed (${response.status}).`);
        error.status = response.status;
        Object.entries(body).forEach(([key, value]) => {
            if (key !== "error") error[key] = value;
        });
        throw error;
    }
    return body;
}

export async function googleLogin(credential) {
    return request("/api/auth/google", {
        method: "POST",
        body: JSON.stringify({ credential })
    });
}

export async function upgradeGuestWithGoogle(credential, mergeConfirmed = false) {
    return request("/api/auth/google/upgrade-guest", {
        method: "POST",
        body: JSON.stringify({ credential, mergeConfirmed })
    });
}

export async function getProfile() {
    return request("/api/profile");
}

export async function logoutSession() {
    return request("/api/auth/logout", { method: "POST" });
}

export function clearSavedGuest() {
    localStorage.removeItem(STORAGE_KEY);
}

export async function createGuest() {
    const guest = await request("/api/guests", { method: "POST" });
    localStorage.setItem(STORAGE_KEY, guest.guestCode);
    return toGuestSession(guest);
}

export async function restoreGuest(guestCode) {
    const normalizedCode = String(guestCode || "").trim().toUpperCase();
    const guest = await request("/api/guests/restore", {
        method: "POST",
        body: JSON.stringify({ guestCode: normalizedCode })
    });
    localStorage.setItem(STORAGE_KEY, guest.guestCode);
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

export async function addPoints(guestCode, pointsToAdd) {
    return request(`/api/guests/${encodeURIComponent(guestCode)}/points`, {
        method: "PATCH",
        body: JSON.stringify({ pointsToAdd })
    });
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

export async function addUserPoints(userId, pointsToAdd, token) {
    return request(`/api/users/${encodeURIComponent(userId)}/points`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ pointsToAdd })
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

    const playRemoteAnimation = (remotePlayer, animationName) => {
        if (remotePlayer.currentAnimation === animationName) return;
        const nextAnimation = animationByName(remotePlayer.animationGroups, animationName);
        if (!nextAnimation) return;
        remotePlayer.animationGroups.forEach((group) => group.stop());
        nextAnimation.start(true, 1, nextAnimation.from, nextAnimation.to, false);
        remotePlayer.currentAnimation = animationName;
    };

    const removeRemotePlayer = (socketId) => {
        const remotePlayer = remotePlayers.get(socketId);
        if (!remotePlayer) return;
        remotePlayer.nameTag.dispose();
        remotePlayer.animationGroups.forEach((group) => group.dispose());
        // Remote instances share the asset container's materials and textures.
        // Disposing them with one player turns the remaining characters grey.
        remotePlayer.rootMesh.dispose(false, false);
        remotePlayers.delete(socketId);
        notifyPlayerCount();
    };

    const socket = io(SERVER_URL, {
        transports: ["websocket", "polling"],
        auth: { token: session.accountType === "user" ? session.token : undefined }
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
    });
    socket.on("disconnect", () => {
        [...remotePlayers.keys()].forEach(removeRemotePlayer);
        handlers.onConnectionChanged?.(false);
        handlers.onPlayerCountChanged?.(0);
    });
    socket.on("connect_error", (error) => handlers.onError?.(error));
    socket.on("player:joinError", (message) => handlers.onError?.(new Error(message)));
    socket.on("player:spawned", (position) => {
        if (!isVector3(position)) return;
        localPlayer.setGroundedPosition(position, "server-spawn");
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
            [...remotePlayers.keys()].forEach(removeRemotePlayer);
            assetContainer.dispose();
            socket.disconnect();
        }
    };
}
