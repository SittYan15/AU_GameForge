// frontend/ui/chat.js
const chatState = {
    socket: null,
    messages: [],
    isOpen: false
};

const chatMessagesEl =
    document.getElementById(
        "chatMessages"
    );

const chatInputEl =
    document.getElementById(
        "chatInput"
    );

const chatFormEl =
    document.getElementById(
        "chatForm"
    );

const chatPanelEl =
    document.getElementById(
        "chatPanel"
    );

const chatToggleEl =
    document.getElementById(
        "chatToggle"
    );

let outsideClickBound =
    false;

let escapeBound =
    false;

const chatPreviewTimers =
    new Map();

const chatPreviewEl =
    document.createElement(
        "div"
    );

chatPreviewEl.id =
    "chatMessagePreview";

Object.assign(
    chatPreviewEl.style,
    {
        position: "fixed",
        zIndex: "1002",
        display: "none",
        flexDirection: "column",
        gap: "8px",
        maxWidth:
            "min(360px, calc(100vw - 20px))",
        pointerEvents: "none"
    }
);

document.body.appendChild(
    chatPreviewEl
);

function hideChatPreview() {
    chatPreviewTimers.forEach(
        (timer) => {
            window.clearTimeout(
                timer
            );
        }
    );

    chatPreviewTimers.clear();

    chatPreviewEl.replaceChildren();

    chatPreviewEl.style.display =
        "none";
}

function createChatPreview(
    message
) {
    const preview =
        document.createElement(
            "div"
        );

    Object.assign(
        preview.style,
        {
            padding: "8px 11px",
            border:
                "1px solid rgba(255,255,255,.15)",
            borderRadius: "12px",
            background:
                "rgba(20,20,20,.90)",
            color: "#ffffff",
            fontFamily:
                "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            fontSize: "12px",
            lineHeight: "1.35",
            boxShadow:
                "0 5px 16px rgba(0,0,0,.32)",
            backdropFilter:
                "blur(10px)",
            WebkitBackdropFilter:
                "blur(10px)",
            opacity: "1",
            transition: "opacity 160ms ease"
        }
    );

    const sender =
        document.createElement(
            "strong"
        );

    sender.textContent =
        String(
            message.sender ||
            "Player"
        );

    const text =
        document.createElement(
            "div"
        );

    text.textContent =
        `${String(message.text || "")}`;

    preview.appendChild(sender);
    preview.appendChild(text);

    return preview;
}

function positionChatPreview() {
    if (!chatToggleEl) {
        return;
    }

    const rect =
        chatToggleEl.getBoundingClientRect();

    chatPreviewEl.style.left =
        `${Math.max(10, rect.left)}px`;

    chatPreviewEl.style.bottom =
        `${Math.max(
            10,
            window.innerHeight -
            rect.top +
            8
        )}px`;
}

function showChatPreview(
    message
) {
    if (
        chatState.isOpen ||
        !message ||
        !message.senderSocketId ||
        message.isOwnMessage
    ) {
        return;
    }

    const preview =
        createChatPreview(
            message
        );

    positionChatPreview();

    chatPreviewEl.style.display =
        "flex";

    chatPreviewEl.appendChild(
        preview
    );

    const timer =
        window.setTimeout(
            () => {
                preview.style.opacity =
                    "0";

                window.setTimeout(
                    () => {
                        preview.remove();
                        chatPreviewTimers.delete(
                            preview
                        );

                        if (!chatPreviewEl.childElementCount) {
                            chatPreviewEl.style.display =
                                "none";
                        }
                    },
                    160
                );
            },
            5000
        );

    chatPreviewTimers.set(
        preview,
        timer
    );
}

window.addEventListener(
    "resize",
    () => {
        if (
            chatPreviewEl.childElementCount
        ) {
            positionChatPreview();
        }
    }
);

export function renderChatMessages() {
    if (!chatMessagesEl) {
        return;
    }

    const visibleMessages =
        chatState.messages.slice(
            -50
        );

    chatMessagesEl.innerHTML =
        "";

    visibleMessages.forEach(
        (message) => {
            const row =
                document.createElement(
                    "div"
                );

            row.className =
                "chatMessage";

            const meta =
                document.createElement(
                    "div"
                );

            meta.className =
                "chatMeta";

            meta.textContent =
                `${message.sender} • ${new Date(
                    message.timestamp
                ).toLocaleTimeString(
                    [],
                    {
                        hour:
                            "2-digit",
                        minute:
                            "2-digit"
                    }
                )}`;

            const text =
                document.createElement(
                    "div"
                );

            text.textContent =
                message.text;

            row.appendChild(
                meta
            );

            row.appendChild(
                text
            );

            chatMessagesEl
                .appendChild(
                    row
                );
        }
    );

    chatMessagesEl.scrollTop =
        chatMessagesEl.scrollHeight;
}

export function addChatMessage(
    message
) {
    chatState.messages.push(
        message
    );

    if (
        chatState.messages.length >
        50
    ) {
        chatState.messages.shift();
    }

    renderChatMessages();

    showChatPreview(
        message
    );
}

export function setChatOpen(
    open
) {
    const nextOpen =
        Boolean(open);

    chatState.isOpen =
        nextOpen;

    if (nextOpen) {
        hideChatPreview();
    }

    if (chatPanelEl) {
        chatPanelEl.classList.toggle(
            "open",
            nextOpen
        );
    }

    if (chatToggleEl) {
        chatToggleEl.setAttribute(
            "aria-expanded",
            String(nextOpen)
        );

        chatToggleEl.setAttribute(
            "aria-controls",
            "chatPanel"
        );

        chatToggleEl.textContent =
            nextOpen
                ? "✕ Close"
                : "💬 Chat";
    }

    if (
        nextOpen &&
        chatInputEl
    ) {
        window.setTimeout(
            () =>
                chatInputEl.focus(),
            50
        );
    }
}

function handleOutsideChatClick(
    event
) {
    if (!chatState.isOpen) {
        return;
    }

    const target =
        event.target;

    if (
        chatPanelEl
            ?.contains(
                target
            ) ||
        chatToggleEl
            ?.contains(
                target
            )
    ) {
        return;
    }

    setChatOpen(
        false
    );
}

function handleChatEscape(
    event
) {
    if (
        event.key ===
        "Escape" &&
        chatState.isOpen
    ) {
        setChatOpen(
            false
        );
    }
}

export function setupChat(
    multiplayerInstance
) {
    if (
        !chatMessagesEl ||
        !chatInputEl ||
        !chatFormEl
    ) {
        return;
    }

    if (chatToggleEl) {
        chatToggleEl.addEventListener(
            "click",
            (event) => {
                event.stopPropagation();

                setChatOpen(
                    !chatState.isOpen
                );
            }
        );
    }

    if (!outsideClickBound) {
        document.addEventListener(
            "click",
            handleOutsideChatClick
        );

        outsideClickBound =
            true;
    }

    if (!escapeBound) {
        document.addEventListener(
            "keydown",
            handleChatEscape
        );

        escapeBound =
            true;
    }

    chatFormEl.addEventListener(
        "submit",
        (event) => {
            event.preventDefault();

            const text =
                chatInputEl
                    .value
                    .trim();

            if (!text) {
                return;
            }

            if (
                multiplayerInstance
            ) {
                multiplayerInstance
                    .sendChat(
                        text
                    );

                chatInputEl.value =
                    "";
            }
        }
    );

    setChatOpen(
        false
    );
}
