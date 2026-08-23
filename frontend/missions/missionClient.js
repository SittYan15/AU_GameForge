// frontend/missions/missionClient.js

import * as BABYLON from "@babylonjs/core";

function formatTime(milliseconds) {
    const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

export function createMissionClient(scene, localPlayer, socket) {
    let activeMission = null;
    let markerRoot = null;
    let markerMaterial = null;
    let markerObserver = null;
    let statusTimer = null;
    let newMissionTimer = null;

    const style = document.createElement("style");
    style.textContent = `
        #dynamicMissionPanel {
            position: fixed;
            top: 70px;
            right: 16px;
            z-index: 998;
            width: min(320px, calc(100vw - 32px));
            box-sizing: border-box;
            padding: 12px 14px;
            border: 1px solid rgba(255,255,255,0.18);
            border-radius: 12px;
            background: rgba(18,20,24,0.90);
            color: #fff;
            font-family: system-ui, sans-serif;
            box-shadow: 0 6px 20px rgba(0,0,0,0.34);
            backdrop-filter: blur(8px);
            pointer-events: none;
            display: none;
            transform-origin: top right;
        }

        #dynamicMissionPanel.mission-new {
            animation: missionPop 360ms ease-out;
        }

        #dynamicMissionToast {
            position: fixed;
            top: 12%;
            left: 50%;
            transform: translateX(-50%);
            z-index: 1100;
            max-width: min(440px, calc(100vw - 24px));
            box-sizing: border-box;
            padding: 12px 18px;
            border-radius: 12px;
            background: rgba(12,14,17,0.94);
            color: white;
            font-family: system-ui, sans-serif;
            font-size: clamp(16px, 2vw, 22px);
            font-weight: 800;
            text-align: center;
            box-shadow: 0 8px 28px rgba(0,0,0,0.42);
            pointer-events: none;
            display: none;
        }

        @keyframes missionPop {
            0% { opacity: 0; transform: scale(0.84) translateY(-8px); }
            100% { opacity: 1; transform: scale(1) translateY(0); }
        }

        @media (max-width: 700px) {
            #dynamicMissionPanel {
                top: 58px;
                right: 10px;
                width: min(270px, calc(100vw - 20px));
                padding: 9px 11px;
                font-size: 12px;
            }

            #dynamicMissionToast {
                top: 9%;
                font-size: 15px;
                padding: 10px 14px;
            }
        }
    `;
    document.head.appendChild(style);

    const panel = document.createElement("aside");
    panel.id = "dynamicMissionPanel";
    panel.setAttribute("aria-label", "Active campus mission");

    const badge = document.createElement("div");
    Object.assign(badge.style, {
        color: "#ffd166",
        fontSize: "11px",
        fontWeight: "900",
        letterSpacing: "0.08em",
        marginBottom: "4px"
    });

    const title = document.createElement("div");
    Object.assign(title.style, {
        fontSize: "17px",
        fontWeight: "850",
        marginBottom: "4px"
    });

    const description = document.createElement("div");
    Object.assign(description.style, {
        color: "#d8dde5",
        fontSize: "12px",
        lineHeight: "1.35",
        marginBottom: "8px"
    });

    const details = document.createElement("div");
    Object.assign(details.style, {
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: "4px 10px",
        fontSize: "12px",
        fontWeight: "700"
    });

    const reward = document.createElement("span");
    reward.style.color = "#7ee787";

    const timer = document.createElement("span");
    timer.style.fontVariantNumeric = "tabular-nums";

    const distance = document.createElement("span");
    distance.style.color = "#b9c3d3";

    const floorHint = document.createElement("span");
    floorHint.style.textAlign = "right";

    details.append(reward, timer, distance, floorHint);
    panel.append(badge, title, description, details);
    document.body.appendChild(panel);

    const toast = document.createElement("div");
    toast.id = "dynamicMissionToast";
    document.body.appendChild(toast);

    function showToast(text, color) {
        toast.textContent = text;
        toast.style.color = color || "#ffffff";
        toast.style.display = "block";

        window.setTimeout(() => {
            toast.style.display = "none";
        }, 2800);
    }

    function clearMarker() {
        if (markerObserver) {
            scene.onBeforeRenderObservable.remove(markerObserver);
            markerObserver = null;
        }

        if (markerRoot) {
            markerRoot.dispose(false, true);
            markerRoot = null;
        }

        if (markerMaterial) {
            markerMaterial.dispose();
            markerMaterial = null;
        }
    }

    function createMarker(mission) {
        clearMarker();

        markerRoot = new BABYLON.TransformNode(
            `missionMarker_${mission.id}`,
            scene
        );

        markerRoot.position = new BABYLON.Vector3(
            mission.position.x,
            mission.position.y,
            mission.position.z
        );

        markerMaterial = new BABYLON.StandardMaterial(
            `missionMarkerMaterial_${mission.id}`,
            scene
        );
        markerMaterial.disableLighting = true;
        markerMaterial.emissiveColor = new BABYLON.Color3(1, 0.72, 0.08);
        markerMaterial.diffuseColor = new BABYLON.Color3(1, 0.72, 0.08);
        markerMaterial.alpha = 0.86;

        const ring = BABYLON.MeshBuilder.CreateTorus(
            `missionRing_${mission.id}`,
            { diameter: 2.4, thickness: 0.14, tessellation: 36 },
            scene
        );
        ring.parent = markerRoot;
        ring.position.y = 0.30;
        ring.material = markerMaterial;
        ring.isPickable = false;
        ring.checkCollisions = false;

        const beacon = BABYLON.MeshBuilder.CreateCylinder(
            `missionBeacon_${mission.id}`,
            {
                height: 3.0,
                diameterTop: 0.05,
                diameterBottom: 0.40,
                tessellation: 20
            },
            scene
        );
        beacon.parent = markerRoot;
        beacon.position.y = 1.8;
        beacon.material = markerMaterial;
        beacon.isPickable = false;
        beacon.checkCollisions = false;

        const orb = BABYLON.MeshBuilder.CreateSphere(
            `missionOrb_${mission.id}`,
            { diameter: 0.55, segments: 18 },
            scene
        );
        orb.parent = markerRoot;
        orb.position.y = 3.4;
        orb.material = markerMaterial;
        orb.isPickable = false;
        orb.checkCollisions = false;

        let elapsed = 0;

        markerObserver = scene.onBeforeRenderObservable.add(() => {
            if (!markerRoot) return;

            const dt = scene.getEngine().getDeltaTime() / 1000;
            elapsed += dt;
            markerRoot.rotation.y += dt * 0.8;
            orb.position.y = 3.4 + Math.sin(elapsed * 2.4) * 0.18;
        });
    }

    function clearMissionDisplay() {
        activeMission = null;
        panel.style.display = "none";
        clearMarker();

        if (statusTimer) {
            window.clearInterval(statusTimer);
            statusTimer = null;
        }

        if (newMissionTimer) {
            window.clearTimeout(newMissionTimer);
            newMissionTimer = null;
        }
    }

    function updateStatus() {
        if (!activeMission || !localPlayer) return;

        const now = Date.now();
        timer.textContent = `⏱ ${formatTime(activeMission.expiresAt - now)}`;

        const dx = localPlayer.position.x - activeMission.position.x;
        const dz = localPlayer.position.z - activeMission.position.z;
        const horizontalDistance = Math.hypot(dx, dz);
        const verticalDifference = activeMission.position.y - localPlayer.position.y;

        distance.textContent = `📍 ${Math.round(horizontalDistance)}m away`;

        if (Math.abs(verticalDifference) < 1.8) {
            floorHint.textContent = "Same level";
            floorHint.style.color = "#7ee787";
        } else if (verticalDifference > 0) {
            floorHint.textContent = `↑ ${Math.round(Math.abs(verticalDifference))}m`;
            floorHint.style.color = "#8cc8ff";
        } else {
            floorHint.textContent = `↓ ${Math.round(Math.abs(verticalDifference))}m`;
            floorHint.style.color = "#8cc8ff";
        }

        if (now >= activeMission.expiresAt) {
            timer.textContent = "⏱ 00:00";
        }
    }

    function onAssigned(mission) {
        clearMissionDisplay();
        activeMission = mission;

        badge.textContent = "NEW CAMPUS MISSION";
        title.textContent = mission.title;
        description.textContent = mission.description;
        reward.textContent = `⭐ +${mission.rewardPoints} points`;

        panel.style.display = "block";
        panel.classList.remove("mission-new");
        void panel.offsetWidth;
        panel.classList.add("mission-new");

        createMarker(mission);
        updateStatus();

        statusTimer = window.setInterval(updateStatus, 250);
        newMissionTimer = window.setTimeout(() => {
            badge.textContent = "ACTIVE MISSION";
        }, 4000);
    }

    function onCompleted(result = {}) {
        const points = Number(result.pointsEarned) || 0;
        clearMissionDisplay();

        showToast(
            result.rewardSaved
                ? `✓ MISSION COMPLETE  +${points} POINTS`
                : "✓ MISSION COMPLETE — reward could not be saved",
            result.rewardSaved ? "#7ee787" : "#ffcc66"
        );

        window.dispatchEvent(new CustomEvent("mission:completed", {
            detail: result
        }));
    }

    function onExpired() {
        clearMissionDisplay();
        showToast("MISSION EXPIRED", "#ff7b72");
    }

    function onCancelled({ reason } = {}) {
        clearMissionDisplay();

        if (reason === "minigame") {
            showToast(
                "Campus mission paused while playing a minigame",
                "#b9c3d3"
            );
        }
    }

    function onDisconnect() {
        clearMissionDisplay();
    }

    socket.on("mission:assigned", onAssigned);
    socket.on("mission:completed", onCompleted);
    socket.on("mission:expired", onExpired);
    socket.on("mission:cancelled", onCancelled);
    socket.on("disconnect", onDisconnect);

    return {
        dispose() {
            clearMissionDisplay();

            socket.off("mission:assigned", onAssigned);
            socket.off("mission:completed", onCompleted);
            socket.off("mission:expired", onExpired);
            socket.off("mission:cancelled", onCancelled);
            socket.off("disconnect", onDisconnect);

            panel.remove();
            toast.remove();
            style.remove();
        }
    };
}
