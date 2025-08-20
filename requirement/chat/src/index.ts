// src/index.ts
import { WebSocketServer } from 'ws';

const PORT = 3001;
const wss = new WebSocketServer({ port: PORT });

console.log(`🚀 WebSocket chat server running on ws://localhost:${PORT}`);

wss.on('connection', (ws) => {
	console.log("✅ Client connecté");

	ws.on('message', (data) => {
		const message = data.toString();
		console.log("📨 Message reçu:", message);

		// Réémet le message à tous les clients connectés
		wss.clients.forEach((client) => {
			if (client.readyState === ws.OPEN) {
				client.send(message);
			}
		});
	});

	ws.on('close', () => {
		console.log("❌ Client déconnecté");
	});
});
