import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 3000 });
const clients = new Set();
const chatHistory = [];
const MAX_CHAT_HISTORY = 50;

function broadcast(payload) {
    const message = JSON.stringify(payload);

    for (const client of clients) {
        if (client.readyState === 1) {
            client.send(message);
        }
    }
}

wss.on('connection', (ws) => {
    clients.add(ws);
    console.log('A player connected to the campus server!');

    if (chatHistory.length > 0) {
        ws.send(JSON.stringify({ type: 'chatHistory', messages: chatHistory }));
    }

    ws.on('message', (rawMessage) => {
        try {
            const data = JSON.parse(rawMessage.toString());

            if (data?.type === 'chatMessage') {
                const text = String(data.text || '').trim();
                const sender = String(data.sender || 'Player').trim() || 'Player';

                if (!text) return;

                const message = {
                    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
                    sender,
                    text,
                    timestamp: Date.now()
                };

                chatHistory.push(message);

                if (chatHistory.length > MAX_CHAT_HISTORY) {
                    chatHistory.shift();
                }

                broadcast({ type: 'chatMessage', message });
            }
        } catch (error) {
            console.error('Failed to process chat message:', error);
        }
    });

    ws.on('close', () => {
        clients.delete(ws);
        console.log('Player disconnected.');
    });
});

console.log('Multiplayer backend running on port 3000');