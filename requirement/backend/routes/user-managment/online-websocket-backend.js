//export fct(plugin) que fastify appelle avec fastify.register(require('./.../online-websocket-backend.js'))
module.exports = async function (fastify, opts) {

	// Initialisation du serveur WS
	const wss = new (require('ws')).Server({ server: fastify.server, path: '/webs' });
	// Route WS : /webs?token=JWT
	wss.on('connection', (ws, req) => {				
		try {
			const url = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
			const token = url.searchParams.get('token');
			if (!token) { //verif token
				ws.close(4001, 'Missing token');
				return;
			}

			const payload = fastify.jwt.verify(token);
			const userId = payload?.id;
			if (!userId) { //verif validite token
				ws.close(4002, 'Invalid token payload');
				return;
			}

			//broadcaster sur plusieurs session ;)
			let socketSet = fastify.socketUsers.get(userId); //recuperation de tous les sockets deja ouvertes d'un user
			if (!socketSet) { //creation tableau en cas d'absence de socket 
				socketSet = new Set();
				fastify.socketUsers.set(userId, socketSet);
			}
			socketSet.add(ws);//ajout de la nouvelle ws

			//incrementation compteur a chaque nouv socket
			const prev = fastify.onlineUsers.get(userId) || 0;
			const next = prev + 1;
			fastify.onlineUsers.set(userId, next);

			//detecte la transition offline -> online
			if (prev === 0) broadcastPresence(userId, true);

			ws.on('message', (msg) => { // pour ecouter les msg client
			});

			ws.on('close', () => { //nettoyage fermeture de socket
				const userSockets = fastify.socketUsers.get(userId);
				if (userSockets) {
					userSockets.delete(ws);
					if (userSockets.size === 0) {fastify.socketUsers.delete(userId);}
				}

				const prevCount = fastify.onlineUsers.get(userId) ?? 1;
				const current = prevCount - 1;
				if (current <= 0) {
					fastify.onlineUsers.delete(userId);
					broadcastPresence(userId, false);
				} else {
					fastify.onlineUsers.set(userId, current);
				}

			});

			ws.on('error', (err) => {
				fastify.log.warn('WS socket error', err);
			});
		} catch (err) {
			try { ws.close(4003, 'Invalid token'); } catch(e) {}
			fastify.log.warn('WS connection rejected', err);
		}
	});

	//envoie les infos, user id et status de co a tous les autres sockets
	function broadcastPresence(userId, online) {
		//creation message json dans payload qui informe de la presence ou non d'un user
		const user = fastify.db.prepare('SELECT username FROM users WHERE id = ?').get(userId);
		const username = user?.username || `User${userId}`;

		const payload = JSON.stringify({
			type: 'status_change',
			userId,
			username,
			online
		});
		for (const sockets of fastify.socketUsers.values()) {
			//si la socket a qui c'est envoyé est toujours présente, envoie les infos
			for (const sock of sockets) {
				if (sock.readyState === 1) {
					try { sock.send(payload); } catch(e) {}
				}
			}
		}
	}
};
