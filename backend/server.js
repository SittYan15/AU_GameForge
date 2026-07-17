import { createServer } from 'http';
import { WebSocketServer } from 'ws';

const PORT = process.env.PORT || 3000;

// 1. Create a standard HTTP server to handle wake-up pings
const server = createServer((req, res) => {
    // When the uptime bot hits /ping, reply with "pong"
    if (req.url === '/ping') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('pong');
        return;
    }
    // Default fallback response
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Multiplayer server is alive!');
});

// 2. Attach your WebSocket server to this HTTP server
const wss = new WebSocketServer({ server });
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

// 3. Start the combined server
server.listen(PORT, () => {
    console.log(`Multiplayer backend running on port ${PORT}`);
});