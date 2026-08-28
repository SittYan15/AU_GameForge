// ui/chat.js
const chatState = { socket: null, messages: [], isOpen: false };
const chatMessagesEl = document.getElementById("chatMessages");
const chatInputEl = document.getElementById("chatInput");
const chatFormEl = document.getElementById("chatForm");
const chatPanelEl = document.getElementById("chatPanel");
const chatToggleEl = document.getElementById("chatToggle");

export function renderChatMessages() {
    if (!chatMessagesEl) return;
    const visibleMessages = chatState.messages.slice(-50);
    chatMessagesEl.innerHTML = "";
    visibleMessages.forEach((message) => {
        const row = document.createElement("div");
        row.className = "chatMessage";
        const meta = document.createElement("div");
        meta.className = "chatMeta";
        meta.textContent = `${message.sender} • ${new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        const text = document.createElement("div");
        text.textContent = message.text;
        row.appendChild(meta);
        row.appendChild(text);
        chatMessagesEl.appendChild(row);
    });
    chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
}

export function addChatMessage(message) {
    chatState.messages.push(message);
    if (chatState.messages.length > 50) chatState.messages.shift();
    renderChatMessages();
}

export function setChatOpen(open) {
    chatState.isOpen = open;
    if (chatPanelEl) chatPanelEl.classList.toggle("open", open);
    if (chatToggleEl) chatToggleEl.textContent = open ? "✕ Close" : "💬 Chat";
    if (open && chatInputEl) setTimeout(() => chatInputEl.focus(), 50);
}

export function setupChat(multiplayerInstance) {
    if (!chatMessagesEl || !chatInputEl || !chatFormEl) return;
    
    if (chatToggleEl) {
        chatToggleEl.addEventListener("click", () => setChatOpen(!chatState.isOpen));
    }
    
    chatFormEl.addEventListener("submit", (event) => {
        event.preventDefault();
        const text = chatInputEl.value.trim();
        if (!text) return;
        if (multiplayerInstance) {
            multiplayerInstance.sendChat(text);
            chatInputEl.value = "";
        }
    });
    setChatOpen(false);
}