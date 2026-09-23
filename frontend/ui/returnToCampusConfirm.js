// frontend/ui/returnToCampusConfirm.js

function ensureStyle() {
    if (document.getElementById("returnToCampusConfirmStyle")) {
        return;
    }

    const style = document.createElement("style");
    style.id = "returnToCampusConfirmStyle";
    style.textContent = `
        #returnToCampusConfirmOverlay {
            position: fixed;
            inset: 0;
            z-index: 5000;
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

        #returnToCampusConfirmCard {
            width: min(420px, calc(100vw - 28px));
            box-sizing: border-box;
            padding: 22px;
            border: 1px solid rgba(255,255,255,.16);
            border-radius: 16px;
            background: linear-gradient(155deg, rgba(28, 31, 38, .98), rgba(13, 15, 19, .98));
            color: #fff;
            box-shadow: 0 24px 70px rgba(0,0,0,.52);
        }

        #returnToCampusConfirmCard h2 {
            margin: 0 0 10px;
            font-size: 20px;
            line-height: 1.2;
        }

        #returnToCampusConfirmCard p {
            margin: 0 0 20px;
            color: #cbd1d9;
            font-size: 14px;
            line-height: 1.5;
        }

        #returnToCampusConfirmActions {
            display: flex;
            justify-content: flex-end;
            gap: 10px;
        }

        #returnToCampusConfirmActions button {
            padding: 10px 16px;
            border-radius: 10px;
            font-size: 14px;
            font-weight: 700;
            cursor: pointer;
            border: 1px solid rgba(255,255,255,.22);
        }

        #returnToCampusConfirmCancel {
            background: rgba(255,255,255,.08);
            color: #fff;
        }

        #returnToCampusConfirmAccept {
            background: #d9463f;
            color: #fff;
            border-color: transparent;
        }
    `;
    document.head.appendChild(style);
}

// Shows a confirmation dialog before leaving a game and returning to Campus.
// Calls onConfirm() only if the player confirms; does nothing on cancel.
export function confirmReturnToCampus(onConfirm) {
    ensureStyle();

    const existing = document.getElementById("returnToCampusConfirmOverlay");
    if (existing) {
        existing.remove();
    }

    const overlay = document.createElement("div");
    overlay.id = "returnToCampusConfirmOverlay";

    const card = document.createElement("div");
    card.id = "returnToCampusConfirmCard";

    const heading = document.createElement("h2");
    heading.textContent = "Return to Campus?";

    const message = document.createElement("p");
    message.textContent = "Are you sure you want to leave the game and return to Campus?";

    const actions = document.createElement("div");
    actions.id = "returnToCampusConfirmActions";

    const cancelBtn = document.createElement("button");
    cancelBtn.id = "returnToCampusConfirmCancel";
    cancelBtn.type = "button";
    cancelBtn.textContent = "Cancel";

    const acceptBtn = document.createElement("button");
    acceptBtn.id = "returnToCampusConfirmAccept";
    acceptBtn.type = "button";
    acceptBtn.textContent = "Return to Campus";

    function close() {
        overlay.remove();
    }

    cancelBtn.addEventListener("click", close);
    overlay.addEventListener("click", (event) => {
        if (event.target === overlay) close();
    });
    acceptBtn.addEventListener("click", () => {
        close();
        onConfirm();
    });

    actions.append(cancelBtn, acceptBtn);
    card.append(heading, message, actions);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
}
