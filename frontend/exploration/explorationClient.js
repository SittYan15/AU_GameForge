import * as BABYLON from "@babylonjs/core";

// frontend/exploration/explorationClient.js
export function createExplorationClient(
    scene,
    socket
) {
    let state = null;
    let minigameActive = false;
    let panelOpen = false;

    // ------------------------------------------------------------
    // Campus Explorer world pointers
    // ------------------------------------------------------------
    const worldPointers = new Map();
    let pointerObserver = null;
    let pointerElapsed = 0;

    const POINTER_MAX_DISTANCE = 900;
    const POINTER_LABEL_DISTANCE = 220;

    const dock =
        document.createElement(
            "div"
        );

    dock.id =
        "campusExplorerDock";

    Object.assign(
        dock.style,
        {
            position: "fixed",
            top: "50%",
            right: "16px",
            left: "auto",
            transform:
                "translateY(-50%)",
            zIndex: "997",
            display: "none",
            flexDirection:
                "column",
            alignItems:
                "flex-end",
            gap: "8px",
            maxHeight: "72dvh",
            pointerEvents:
                "none"
        }
    );

    const toggleButton =
        document.createElement(
            "button"
        );

    toggleButton.id =
        "campusExplorerToggle";

    toggleButton.type =
        "button";

    toggleButton.setAttribute(
        "aria-expanded",
        "false"
    );

    toggleButton.setAttribute(
        "aria-controls",
        "campusExplorerPanel"
    );

    // The final visual design is controlled by the shared
    // #profileButton / #chatToggle / #campusExplorerToggle CSS.
    Object.assign(
        toggleButton.style,
        {
            pointerEvents:
                "auto",
            whiteSpace:
                "nowrap"
        }
    );

    const panel =
        document.createElement(
            "aside"
        );

    panel.id =
        "campusExplorerPanel";

    panel.setAttribute(
        "aria-label",
        "Campus Explorer progress"
    );

    Object.assign(
        panel.style,
        {
            position: "static",
            width: "260px",
            maxWidth:
                "min(60vw, calc(100vw - 32px))",
            maxHeight: "52dvh",
            overflowY: "auto",
            boxSizing:
                "border-box",
            pointerEvents:
                "auto",
            display: "none"
        }
    );

    dock.append(
        toggleButton,
        panel
    );

    document.body.appendChild(
        dock
    );

    const toast =
        document.createElement(
            "div"
        );

    Object.assign(
        toast.style,
        {
            position: "fixed",
            top: "12%",
            left: "50%",
            transform:
                "translateX(-50%)",
            zIndex: "1101",
            padding:
                "11px 16px",
            borderRadius:
                "11px",
            background:
                "rgba(12,14,17,0.94)",
            color: "white",
            fontFamily:
                "system-ui, sans-serif",
            fontWeight:
                "800",
            textAlign:
                "center",
            pointerEvents:
                "none",
            display:
                "none"
        }
    );

    document.body.appendChild(
        toast
    );

    function showToast(
        text,
        color = "#fff",
        ms = 2800
    ) {
        toast.textContent =
            text;

        toast.style.color =
            color;

        toast.style.display =
            "block";

        window.setTimeout(
            () => {
                toast.style.display =
                    "none";
            },
            ms
        );
    }

    function safePointerId(value) {
        return String(value || "location")
            .replace(
                /[^a-zA-Z0-9_-]/g,
                "_"
            );
    }


    function makePointerLabel(location) {
        const id =
            safePointerId(
                location.id
            );

        const texture =
            new BABYLON.DynamicTexture(
                `explorerPointerLabelTexture_${id}`,
                {
                    width:
                        420,
                    height:
                        80
                },
                scene,
                false
            );

        texture.hasAlpha =
            true;

        const context =
            texture
                .getContext();

        context.clearRect(
            0,
            0,
            420,
            80
        );

        context.fillStyle =
            "rgba(12, 16, 22, 0.86)";

        context.fillRect(
            8,
            8,
            404,
            64
        );

        context.strokeStyle =
            "rgba(255, 209, 102, 0.90)";

        context.lineWidth =
            3;

        context.strokeRect(
            8,
            8,
            404,
            64
        );

        context.fillStyle =
            "#ffffff";

        context.font =
            "bold 24px Arial";

        context.textAlign =
            "center";

        context.textBaseline =
            "middle";

        let labelText =
            String(
                location.title ||
                "Campus Location"
            );

        if (
            labelText.length >
            25
        ) {
            labelText =
                labelText.slice(
                    0,
                    22
                ) +
                "...";
        }

        context.fillText(
            labelText,
            210,
            40
        );

        texture.update(
            false
        );

        const material =
            new BABYLON.StandardMaterial(
                `explorerPointerLabelMaterial_${id}`,
                scene
            );

        material.disableLighting =
            true;

        material.diffuseTexture =
            texture;

        material.opacityTexture =
            texture;

        material.emissiveColor =
            BABYLON.Color3.White();

        material.backFaceCulling =
            false;

        const plane =
            BABYLON.MeshBuilder.CreatePlane(
                `explorerPointerLabel_${id}`,
                {
                    width:
                        3.8,
                    height:
                        0.72
                },
                scene
            );

        plane.material =
            material;

        plane.billboardMode =
            BABYLON.Mesh
                .BILLBOARDMODE_Y;

        plane.rotation.x =
            Math.PI;

        plane.isPickable =
            false;

        plane.checkCollisions =
            false;

        return {
            plane,
            material,
            texture
        };
    }


    function createWorldPointer(location) {
        const position =
            location?.position;

        if (
            !position ||
            ![
                position.x,
                position.y,
                position.z
            ].every(
                Number.isFinite
            )
        ) {
            return null;
        }

        const id =
            safePointerId(
                location.id
            );

        const root =
            new BABYLON.TransformNode(
                `explorerPointerRoot_${id}`,
                scene
            );

        root.position
            .copyFromFloats(
                position.x,
                position.y,
                position.z
            );

        const material =
            new BABYLON.StandardMaterial(
                `explorerPointerMaterial_${id}`,
                scene
            );

        material.disableLighting =
            true;

        material.emissiveColor =
            new BABYLON.Color3(
                1,
                0.70,
                0.12
            );

        material.diffuseColor =
            new BABYLON.Color3(
                1,
                0.70,
                0.12
            );

        material.alpha =
            0.92;

        const ring =
            BABYLON.MeshBuilder.CreateTorus(
                `explorerPointerRing_${id}`,
                {
                    diameter:
                        1.85,
                    thickness:
                        0.10,
                    tessellation:
                        24
                },
                scene
            );

        ring.parent =
            root;

        ring.position.y =
            0.12;

        ring.material =
            material;

        ring.isPickable =
            false;

        ring.checkCollisions =
            false;

        const stem =
            BABYLON.MeshBuilder.CreateCylinder(
                `explorerPointerStem_${id}`,
                {
                    height:
                        1.45,
                    diameter:
                        0.07,
                    tessellation:
                        8
                },
                scene
            );

        stem.parent =
            root;

        stem.position.y =
            2.15;

        stem.material =
            material;

        stem.isPickable =
            false;

        stem.checkCollisions =
            false;

        const arrow =
            BABYLON.MeshBuilder.CreateCylinder(
                `explorerPointerArrow_${id}`,
                {
                    height:
                        0.95,
                    diameterTop:
                        0,
                    diameterBottom:
                        0.56,
                    tessellation:
                        14
                },
                scene
            );

        arrow.parent =
            root;

        // Babylon's cone tip is +Y by default.
        // Flip it so the arrow points down at the Explorer destination.
        arrow.rotation.x =
            Math.PI;

        arrow.position.y =
            1.35;

        arrow.material =
            material;

        arrow.isPickable =
            false;

        arrow.checkCollisions =
            false;

        const orb =
            BABYLON.MeshBuilder.CreateSphere(
                `explorerPointerOrb_${id}`,
                {
                    diameter:
                        0.24,
                    segments:
                        8
                },
                scene
            );

        orb.parent =
            root;

        orb.position.y =
            2.95;

        orb.material =
            material;

        orb.isPickable =
            false;

        orb.checkCollisions =
            false;

        const label =
            makePointerLabel(
                location
            );

        label.plane.parent =
            root;

        label.plane.position.y =
            3.45;

        return {
            root,
            material,
            ring,
            stem,
            arrow,
            orb,
            labelPlane:
                label.plane,
            labelMaterial:
                label.material,
            labelTexture:
                label.texture,
            phase:
                Math.random() *
                Math.PI *
                2
        };
    }


    function destroyWorldPointer(id) {
        const pointer =
            worldPointers.get(
                id
            );

        if (!pointer) {
            return;
        }

        pointer.labelTexture
            ?.dispose();

        pointer.labelMaterial
            ?.dispose();

        pointer.material
            ?.dispose();

        pointer.root
            ?.dispose(
                false,
                true
            );

        worldPointers.delete(
            id
        );
    }


    function setPointersVisible(visible) {
        worldPointers.forEach(
            (pointer) => {
                pointer.root
                    ?.setEnabled(
                        Boolean(
                            visible
                        )
                    );
            }
        );
    }


    function ensurePointerObserver() {
        if (
            pointerObserver ||
            !scene
        ) {
            return;
        }

        pointerObserver =
            scene
                .onBeforeRenderObservable
                .add(
                    () => {
                        const dt =
                            Math.min(
                                0.05,
                                scene
                                    .getEngine()
                                    .getDeltaTime()
                                / 1000
                            );

                        pointerElapsed +=
                            dt;

                        const cameraPosition =
                            scene.activeCamera
                                ?.globalPosition;

                        worldPointers.forEach(
                            (
                                pointer
                            ) => {
                                if (
                                    !cameraPosition ||
                                    !pointer.root
                                        ?.isEnabled()
                                ) {
                                    return;
                                }

                                const dx =
                                    pointer.root
                                        .position
                                        .x -
                                    cameraPosition.x;

                                const dz =
                                    pointer.root
                                        .position
                                        .z -
                                    cameraPosition.z;

                                const distance =
                                    Math.hypot(
                                        dx,
                                        dz
                                    );

                                const withinRange =
                                    distance <=
                                    POINTER_MAX_DISTANCE;

                                pointer.root
                                    .setEnabled(
                                        withinRange
                                    );

                                if (!withinRange) {
                                    return;
                                }

                                pointer.arrow
                                    .position
                                    .y =
                                    1.35 +
                                    Math.sin(
                                        pointerElapsed *
                                            2.2 +
                                        pointer.phase
                                    ) *
                                        0.14;

                                pointer.orb
                                    .position
                                    .y =
                                    2.95 +
                                    Math.sin(
                                        pointerElapsed *
                                            2.2 +
                                        pointer.phase
                                    ) *
                                        0.08;

                                pointer.ring
                                    .rotation
                                    .y +=
                                    dt *
                                    0.65;

                                const scale =
                                    BABYLON.Scalar.Clamp(
                                        0.92 +
                                        distance /
                                            900,
                                        0.92,
                                        1.30
                                    );

                                pointer.root
                                    .scaling
                                    .setAll(
                                        scale
                                    );

                                pointer.labelPlane
                                    ?.setEnabled(
                                        distance <=
                                        POINTER_LABEL_DISTANCE
                                    );
                            }
                        );
                    }
                );
    }


    function syncWorldPointers() {
        if (
            !scene ||
            !state ||
            state.completed ===
                true ||
            minigameActive
        ) {
            setPointersVisible(
                false
            );

            return;
        }

        ensurePointerObserver();

        const locations =
            Array.isArray(
                state.locations
            )
                ? state.locations
                : [];

        const desiredIds =
            new Set();

        locations.forEach(
            (location) => {
                if (
                    location?.visited ||
                    !location?.id ||
                    !location?.position
                ) {
                    return;
                }

                desiredIds.add(
                    location.id
                );

                if (
                    worldPointers.has(
                        location.id
                    )
                ) {
                    worldPointers
                        .get(
                            location.id
                        )
                        ?.root
                        ?.setEnabled(
                            true
                        );

                    return;
                }

                const pointer =
                    createWorldPointer(
                        location
                    );

                if (pointer) {
                    worldPointers.set(
                        location.id,
                        pointer
                    );
                }
            }
        );

        [
            ...worldPointers.keys()
        ].forEach(
            (id) => {
                if (
                    !desiredIds.has(
                        id
                    )
                ) {
                    destroyWorldPointer(
                        id
                    );
                }
            }
        );
    }


    function disposePointerSystem() {
        [
            ...worldPointers.keys()
        ].forEach(
            destroyWorldPointer
        );

        if (
            pointerObserver
        ) {
            scene
                ?.onBeforeRenderObservable
                ?.remove(
                    pointerObserver
                );

            pointerObserver =
                null;
        }
    }


    function explorationIncomplete() {
        return (
            Boolean(state) &&
            state.completed !==
                true &&
            Number(
                state.totalCount
            ) >
                0
        );
    }

    function setPanelOpen(
        open
    ) {
        panelOpen =
            Boolean(open);

        toggleButton.setAttribute(
            "aria-expanded",
            String(
                panelOpen
            )
        );

        panel.style.display =
            panelOpen
                ? "block"
                : "none";
    }

    function render() {
        syncWorldPointers();

        if (
            !explorationIncomplete() ||
            minigameActive
        ) {
            dock.style.display =
                "none";

            setPanelOpen(
                false
            );

            return;
        }

        dock.style.display =
            "flex";

        toggleButton.textContent =
            `🧭 Explorer ${state.visitedCount}/${state.totalCount}`;

        if (!panelOpen) {
            panel.style.display =
                "none";

            return;
        }

        panel.style.display =
            "block";

        const rows =
            (
                state.locations ||
                []
            )
                .map(
                    (
                        location
                    ) =>
                        `<div class="campusExplorerRow" style="color:${location.visited ? '#7ee787' : '#f4f7fb'}"><span>${location.title}</span><span>${location.visited ? '✓' : '○'}</span></div>`
                )
                .join(
                    ""
                );

        panel.innerHTML = `
            <div class="campusExplorerTitle">🧭 Campus Explorer ${state.visitedCount}/${state.totalCount}</div>
            <div class="campusExplorerDescription">Visit every main area to unlock Dynamic Pop-Up Missions.</div>
            ${rows}
            <div class="campusExplorerReward">Reward: +${state.rewardPoints} points • Missions LOCKED</div>`;
    }

    const handleToggleClick =
        (event) => {
            event.stopPropagation();

            if (
                !explorationIncomplete() ||
                minigameActive
            ) {
                return;
            }

            setPanelOpen(
                !panelOpen
            );

            render();
        };

    const handleOutsideClick =
        (event) => {
            if (!panelOpen) {
                return;
            }

            if (
                dock.contains(
                    event.target
                )
            ) {
                return;
            }

            setPanelOpen(
                false
            );
        };

    const handleEscape =
        (event) => {
            if (
                event.key ===
                    "Escape" &&
                panelOpen
            ) {
                setPanelOpen(
                    false
                );
            }
        };

    toggleButton.addEventListener(
        "click",
        handleToggleClick
    );

    document.addEventListener(
        "click",
        handleOutsideClick
    );

    document.addEventListener(
        "keydown",
        handleEscape
    );

    const onMinigameState =
        (event) => {
            minigameActive =
                event.detail
                    ?.active ===
                true;

            if (
                minigameActive
            ) {
                setPanelOpen(
                    false
                );
            }

            render();
        };

    const onState =
        (next) => {
            state =
                next;

            if (
                state
                    ?.completed
            ) {
                setPanelOpen(
                    false
                );
            }

            render();
        };

    const onVisited =
        (data = {}) => {
            showToast(
                `✓ Discovered: ${data.title} (${data.visitedCount}/${data.totalCount})`,
                "#7ee787"
            );
        };

    const onCompleted =
        (data = {}) => {
            setPanelOpen(
                false
            );

            if (state) {
                state = {
                    ...state,
                    completed:
                        true,
                    visitedCount:
                        state.totalCount
                };
            }

            render();

            showToast(
                `🏆 CAMPUS EXPLORER COMPLETE +${data.pointsEarned || 0} POINTS — Dynamic Missions Unlocked!`,
                "#ffd166",
                4200
            );
        };

    window.addEventListener(
        "au:minigame-state",
        onMinigameState
    );

    socket.on(
        "exploration:state",
        onState
    );

    socket.on(
        "exploration:visited",
        onVisited
    );

    socket.on(
        "exploration:completed",
        onCompleted
    );

    return {
        dispose() {
            disposePointerSystem();

            window.removeEventListener(
                "au:minigame-state",
                onMinigameState
            );

            document.removeEventListener(
                "click",
                handleOutsideClick
            );

            document.removeEventListener(
                "keydown",
                handleEscape
            );

            toggleButton.removeEventListener(
                "click",
                handleToggleClick
            );

            socket.off(
                "exploration:state",
                onState
            );

            socket.off(
                "exploration:visited",
                onVisited
            );

            socket.off(
                "exploration:completed",
                onCompleted
            );

            dock.remove();
            toast.remove();
        }
    };
}
