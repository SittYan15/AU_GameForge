import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 3000 });

wss.on('connection', (ws) => {
    console.log('A player connected to the campus server!');
    
    ws.on('message', (message) => {
        console.log(`Received input: ${message}`);
    });

    ws.on('close', () => console.log('Player disconnected.'));
});

console.log('Multiplayer backend running on port 3000');