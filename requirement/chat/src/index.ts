import WebSocket, { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 4000 });

wss.on('connection', (ws: WebSocket) => {
	console.log('🔌 Client connecté');

	ws.on('message', (data: string) => {
		console.log(`📨 Message reçu : ${data}`);

		// Broadcast à tous les clients sauf celui qui a envoyé
		wss.clients.forEach((client) => {
			if (client !== ws && client.readyState === WebSocket.OPEN) {
				client.send(data);
			}
		});
	});

	ws.on('close', () => {
		console.log('❌ Client déconnecté');
	});
});
