// frontend/exploration/explorationClient.js
export function createExplorationClient(
    socket
) {
    let state = null;
    let minigameActive = false;
    let panelOpen = false;

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
