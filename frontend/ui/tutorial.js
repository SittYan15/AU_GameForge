// frontend/ui/tutorial.js

function isMobileDevice() {
    return (
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
            .test(navigator.userAgent) ||
        navigator.maxTouchPoints > 0 ||
        window.matchMedia?.("(pointer: coarse)")?.matches === true
    );
}

function createStyle() {
    if (document.getElementById("newPlayerTutorialStyle")) {
        return;
    }

    const style =
        document.createElement("style");

    style.id =
        "newPlayerTutorialStyle";

    style.textContent = `
        #newPlayerTutorial {
            position: fixed;
            inset: 0;
            z-index: 4000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 18px;
            box-sizing: border-box;
            background: rgba(5, 7, 10, .72);
            backdrop-filter: blur(7px);
            -webkit-backdrop-filter: blur(7px);
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        #newPlayerTutorialCard {
            width: min(680px, calc(100vw - 28px));
            max-height: min(760px, calc(100dvh - 28px));
            overflow-y: auto;
            box-sizing: border-box;
            padding: 24px;
            border: 1px solid rgba(255,255,255,.16);
            border-radius: 20px;
            background:
                linear-gradient(
                    155deg,
                    rgba(28, 31, 38, .98),
                    rgba(13, 15, 19, .98)
                );
            color: #fff;
            box-shadow: 0 24px 70px rgba(0,0,0,.52);
        }

        #newPlayerTutorial .tutorial-kicker {
            color: #69f0c0;
            font-size: 11px;
            font-weight: 900;
            letter-spacing: .14em;
            text-transform: uppercase;
        }

        #newPlayerTutorial h1 {
            margin: 6px 0 7px;
            font-size: clamp(26px, 5vw, 38px);
            line-height: 1.05;
        }

        #newPlayerTutorial .tutorial-intro {
            margin: 0 0 20px;
            color: #cbd1d9;
            font-size: 14px;
            line-height: 1.5;
        }

        #newPlayerTutorial .tutorial-device {
            display: inline-flex;
            align-items: center;
            gap: 7px;
            margin-bottom: 14px;
            padding: 6px 10px;
            border: 1px solid rgba(255,255,255,.12);
            border-radius: 999px;
            background: rgba(255,255,255,.06);
            color: #f4f7fb;
            font-size: 11px;
            font-weight: 800;
        }

        #newPlayerTutorial .tutorial-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
        }

        #newPlayerTutorial .tutorial-control {
            min-height: 112px;
            box-sizing: border-box;
            padding: 14px;
            border: 1px solid rgba(255,255,255,.10);
            border-radius: 14px;
            background: rgba(255,255,255,.055);
        }

        #newPlayerTutorial .tutorial-control.wide {
            grid-column: 1 / -1;
        }

        #newPlayerTutorial .tutorial-control-title {
            margin-bottom: 5px;
            color: #fff;
            font-size: 14px;
            font-weight: 900;
        }

        #newPlayerTutorial .tutorial-control-text {
            color: #bfc6cf;
            font-size: 12px;
            line-height: 1.45;
        }

        #newPlayerTutorial .key-row {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            margin: 2px 0 10px;
        }

        #newPlayerTutorial .key-stack {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 5px;
        }

        #newPlayerTutorial .keyboard-key {
            min-width: 34px;
            height: 34px;
            box-sizing: border-box;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 0 9px;
            border: 1px solid rgba(255,255,255,.25);
            border-bottom-width: 3px;
            border-radius: 7px;
            background: rgba(255,255,255,.10);
            color: #fff;
            font-size: 12px;
            font-weight: 900;
            box-shadow: inset 0 -2px 0 rgba(0,0,0,.22);
        }

        #newPlayerTutorial .mouse-visual {
            width: 38px;
            height: 52px;
            margin: 2px auto 10px;
            position: relative;
            border: 2px solid rgba(255,255,255,.75);
            border-radius: 20px;
        }

        #newPlayerTutorial .mouse-visual::before {
            content: "";
            position: absolute;
            top: 8px;
            left: 50%;
            width: 4px;
            height: 10px;
            transform: translateX(-50%);
            border-radius: 999px;
            background: #69f0c0;
        }

        #newPlayerTutorial .mobile-demo {
            min-height: 150px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            align-items: center;
            gap: 14px;
            margin-bottom: 12px;
            padding: 14px;
            border: 1px solid rgba(255,255,255,.10);
            border-radius: 15px;
            background:
                radial-gradient(circle at 20% 65%, rgba(105,240,192,.10), transparent 30%),
                rgba(255,255,255,.04);
        }

        #newPlayerTutorial .joystick-demo {
            width: 104px;
            height: 104px;
            position: relative;
            justify-self: center;
            border: 2px solid rgba(255,255,255,.24);
            border-radius: 50%;
            background: rgba(255,255,255,.06);
        }

        #newPlayerTutorial .joystick-demo::after {
            content: "";
            width: 45px;
            height: 45px;
            position: absolute;
            top: 17px;
            left: 43px;
            border-radius: 50%;
            background: rgba(105,240,192,.86);
            box-shadow: 0 0 20px rgba(105,240,192,.34);
        }

        #newPlayerTutorial .swipe-demo {
            min-height: 110px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            border-left: 1px solid rgba(255,255,255,.10);
            color: #fff;
            text-align: center;
        }

        #newPlayerTutorial .swipe-arrow {
            margin-bottom: 7px;
            font-size: 30px;
            letter-spacing: 3px;
        }

        #newPlayerTutorial .tutorial-note {
            margin-top: 12px;
            padding: 10px 12px;
            border-left: 3px solid #69f0c0;
            border-radius: 8px;
            background: rgba(105,240,192,.07);
            color: #cbd1d9;
            font-size: 11px;
            line-height: 1.45;
        }

        #newPlayerTutorialActions {
            display: flex;
            justify-content: flex-end;
            margin-top: 18px;
        }

        #newPlayerTutorialStart {
            min-height: 42px;
            padding: 0 18px;
            border: 1px solid rgba(255,255,255,.18);
            border-radius: 999px;
            background: #69f0c0;
            color: #07120e;
            font: 900 13px/1 system-ui, sans-serif;
            cursor: pointer;
            box-shadow: 0 6px 20px rgba(105,240,192,.18);
        }

        #newPlayerTutorialStart:disabled {
            cursor: wait;
            opacity: .72;
        }

        #newPlayerTutorialError {
            min-height: 18px;
            margin-top: 8px;
            color: #ff8f8f;
            font-size: 11px;
            text-align: right;
        }

        @media (max-width: 700px) {
            #newPlayerTutorial {
                padding:
                    max(10px, env(safe-area-inset-top))
                    max(10px, env(safe-area-inset-right))
                    max(10px, env(safe-area-inset-bottom))
                    max(10px, env(safe-area-inset-left));
            }

            #newPlayerTutorialCard {
                width: 100%;
                max-height: calc(100dvh - 20px);
                padding: 18px 16px;
                border-radius: 17px;
            }

            #newPlayerTutorial .tutorial-grid {
                grid-template-columns: 1fr;
            }

            #newPlayerTutorial .tutorial-control.wide {
                grid-column: auto;
            }

            #newPlayerTutorial .tutorial-control {
                min-height: 92px;
            }

            #newPlayerTutorial .mobile-demo {
                min-height: 126px;
            }

            #newPlayerTutorial .joystick-demo {
                width: 88px;
                height: 88px;
            }

            #newPlayerTutorial .joystick-demo::after {
                width: 39px;
                height: 39px;
                top: 14px;
                left: 37px;
            }

            #newPlayerTutorial .swipe-demo {
                min-height: 94px;
            }

            #newPlayerTutorialActions {
                justify-content: stretch;
            }

            #newPlayerTutorialStart {
                width: 100%;
            }
        }

        @media (max-height: 520px) and (orientation: landscape) {
            #newPlayerTutorialCard {
                max-height: calc(100dvh - 12px);
                padding: 14px 16px;
            }

            #newPlayerTutorial h1 {
                font-size: 24px;
            }

            #newPlayerTutorial .tutorial-intro {
                margin-bottom: 10px;
            }

            #newPlayerTutorial .tutorial-grid {
                grid-template-columns: repeat(2, minmax(0, 1fr));
            }

            #newPlayerTutorial .tutorial-control {
                min-height: 86px;
                padding: 10px;
            }

            #newPlayerTutorial .mobile-demo {
                min-height: 100px;
                margin-bottom: 8px;
                padding: 8px;
            }

            #newPlayerTutorial .joystick-demo {
                width: 72px;
                height: 72px;
            }

            #newPlayerTutorial .joystick-demo::after {
                width: 31px;
                height: 31px;
                top: 12px;
                left: 30px;
            }
        }
    `;

    document.head.appendChild(
        style
    );
}

function desktopContent() {
    return `
        <div class="tutorial-device">🖥️ PC CONTROLS</div>

        <div class="tutorial-grid">
            <div class="tutorial-control">
                <div class="key-stack">
                    <span class="keyboard-key">W</span>
                    <div class="key-row">
                        <span class="keyboard-key">A</span>
                        <span class="keyboard-key">S</span>
                        <span class="keyboard-key">D</span>
                    </div>
                </div>
                <div class="tutorial-control-title">Move</div>
                <div class="tutorial-control-text">
                    W forward, S backward, A left, D right.
                </div>
            </div>

            <div class="tutorial-control">
                <div class="mouse-visual"></div>
                <div class="tutorial-control-title">Look Around</div>
                <div class="tutorial-control-text">
                    Click the game screen, then move your mouse to look around.
                </div>
            </div>

            <div class="tutorial-control">
                <div class="key-row">
                    <span class="keyboard-key">SHIFT</span>
                </div>
                <div class="tutorial-control-title">Run</div>
                <div class="tutorial-control-text">
                    Hold Shift while moving to sprint.
                </div>
            </div>

            <div class="tutorial-control">
                <div class="key-row">
                    <span class="keyboard-key">SPACE</span>
                </div>
                <div class="tutorial-control-title">Jump</div>
                <div class="tutorial-control-text">
                    Press Space while standing on the ground.
                </div>
            </div>
        </div>

        <div class="tutorial-note">
            Tip: movement follows the direction you are looking. You can release
            the mouse with your browser's normal pointer-lock escape key.
        </div>
    `;
}

function mobileContent() {
    return `
        <div class="tutorial-device">📱 MOBILE CONTROLS</div>

        <div class="mobile-demo">
            <div>
                <div class="joystick-demo"></div>
                <div class="tutorial-control-title">Left Joystick</div>
                <div class="tutorial-control-text">
                    Drag the joystick to move. Push it farther from the center to run.
                </div>
            </div>

            <div class="swipe-demo">
                <div class="swipe-arrow">↔️ ↕️</div>
                <div class="tutorial-control-title">Swipe to Look</div>
                <div class="tutorial-control-text">
                    Drag the open game area with your finger to look around.
                </div>
            </div>
        </div>

        <div class="tutorial-grid">
            <div class="tutorial-control">
                <div class="key-row">
                    <span class="keyboard-key">JUMP</span>
                </div>
                <div class="tutorial-control-title">Jump</div>
                <div class="tutorial-control-text">
                    Tap the Jump button on the right side of the screen.
                </div>
            </div>

            <div class="tutorial-control">
                <div class="key-row">
                    <span class="keyboard-key">⛶</span>
                </div>
                <div class="tutorial-control-title">Full Screen</div>
                <div class="tutorial-control-text">
                    Use Full Screen for a larger play area when you want it.
                </div>
            </div>
        </div>

        <div class="tutorial-note">
            Tip: use your left thumb for movement and your right thumb to look
            around or tap Jump.
        </div>
    `;
}

export function showNewPlayerTutorial({
    player,
    onComplete
} = {}) {
    if (
        document.getElementById(
            "newPlayerTutorial"
        )
    ) {
        return;
    }

    createStyle();

    const wasLocked =
        Boolean(
            player?.isLocked
        );

    if (player) {
        player.isLocked =
            true;
    }

    document.exitPointerLock?.();

    const blockedKeys =
        new Set([
            "w",
            "a",
            "s",
            "d",
            "shift",
            " "
        ]);

    const blockMovementKeys =
        (event) => {
            const key =
                String(
                    event.key ||
                    ""
                ).toLowerCase();

            if (
                blockedKeys.has(
                    key
                )
            ) {
                event.preventDefault();
                event.stopImmediatePropagation();
            }
        };

    document.addEventListener(
        "keydown",
        blockMovementKeys,
        true
    );

    document.addEventListener(
        "keyup",
        blockMovementKeys,
        true
    );

    const overlay =
        document.createElement(
            "section"
        );

    overlay.id =
        "newPlayerTutorial";

    overlay.setAttribute(
        "role",
        "dialog"
    );

    overlay.setAttribute(
        "aria-modal",
        "true"
    );

    overlay.setAttribute(
        "aria-labelledby",
        "newPlayerTutorialTitle"
    );

    const card =
        document.createElement(
            "div"
        );

    card.id =
        "newPlayerTutorialCard";

    const mobile =
        isMobileDevice();

    card.innerHTML = `
        <div class="tutorial-kicker">New Player Guide</div>
        <h1 id="newPlayerTutorialTitle">How to move your player</h1>
        <p class="tutorial-intro">
            Welcome to AU GameForge. Learn the basic controls before you start
            exploring the campus.
        </p>

        ${mobile ? mobileContent() : desktopContent()}

        <div id="newPlayerTutorialActions">
            <button id="newPlayerTutorialStart" type="button">
                Start Exploring
            </button>
        </div>
        <div id="newPlayerTutorialError" aria-live="polite"></div>
    `;

    overlay.appendChild(
        card
    );

    document.body.appendChild(
        overlay
    );

    const startButton =
        document.getElementById(
            "newPlayerTutorialStart"
        );

    const errorText =
        document.getElementById(
            "newPlayerTutorialError"
        );

    startButton?.focus();

    startButton?.addEventListener(
        "click",
        async () => {
            startButton.disabled =
                true;

            startButton.textContent =
                "Saving...";

            if (errorText) {
                errorText.textContent =
                    "";
            }

            try {
                await onComplete?.();

                document.removeEventListener(
                    "keydown",
                    blockMovementKeys,
                    true
                );

                document.removeEventListener(
                    "keyup",
                    blockMovementKeys,
                    true
                );

                overlay.remove();

                if (player) {
                    player.isLocked =
                        wasLocked;
                }
            } catch (error) {
                startButton.disabled =
                    false;

                startButton.textContent =
                    "Start Exploring";

                if (errorText) {
                    errorText.textContent =
                        error?.message ||
                        "Could not save tutorial progress. Please try again.";
                }
            }
        }
    );
}
