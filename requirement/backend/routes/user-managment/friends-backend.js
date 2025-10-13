/** Instruction Node.js, permet d’esport une fct ou un obj dans un autre fichier (enregistre nouv routes dans fastify) */

module.exports = function (fastify) {

	function broadcastFriendshipChange(userId, targetId, action) {
		const user = fastify.db.prepare('SELECT username FROM users WHERE id = ?').get(userId);
		const target = fastify.db.prepare('SELECT username FROM users WHERE id = ?').get(targetId);

		const payload = JSON.stringify({
			type: "friendship_change",
			userId,
			username: user?.username,
			targetId,
			targetUsername: target?.username,
			action // "added" ou "removed"
		});

		// notifier les sockets du "target" + de "user"
		const targets = [userId, targetId];
		for (const t of targets) {
			const sockets = fastify.socketUsers.get(t);
			if (!sockets) continue;
			for (const sock of sockets) {
				if (sock.readyState === 1) {
					try { sock.send(payload); } catch(e) {}
				}
			}
		}

		fastify.log.info(`Broadcast friendship_change ${userId} -> ${targetId} (${action})`);
	}

	
	//cree route (ajout ami). preHandler: [fastify.authenticate] = appel du middleware av exec route
	fastify.post('/friends/add', { preHandler: [fastify.authenticate] }, async (request, reply) => {
		const userId = request.user.id; //id user connecté
		const { friendUsername } = request.body; //nom friend à ajouter

		//verifie validité du nom
		if (!friendUsername || typeof friendUsername !== 'string') {
			return reply.status(400).send({ error: "add friend not possible: Nom invalide." });
		}

		//cherche l'utilisateur correspondant au nom
		const friend = fastify.db.prepare('SELECT id FROM users WHERE username = ?').get(friendUsername);
		if (!friend) return reply.status(404).send({ error: "Utilisateur introuvable." });

		//verif si user s'ajoute lui-même
		if (userId === friend.id) {
			return reply.status(400).send({ error: "Vous ne pouvez pas vous ajouter vous-même en ami !" });
		}

		//prepare = requête sql sécurisée contre injection. SELECT 1 = vérifie si ligne existe déjà
		const already = fastify.db.prepare(`
			SELECT 1 FROM friends WHERE user_id = ? AND friend_id = ?
		`).get(userId, friend.id);

		//-> si already existe -> c’est déjà un ami
		if (already) {
			return reply.status(409).send({ error: "Cet utilisateur est déjà votre ami." });
		}

		try { //ajoute une ligne dans la table friends
			fastify.db.prepare(`
				INSERT INTO friends (user_id, friend_id) VALUES (?, ?)
			`).run(userId, friend.id);

			broadcastFriendshipChange(userId, friend.id, "added");
			return { success: true };
		} catch (err) {
			return reply.status(500).send({ error: "Erreur lors de l'ajout." });
		}
	});

	// Supprimer un ami (par nom)
	fastify.post('/friends/remove', { preHandler: [fastify.authenticate] }, async (request, reply) => {
		const userId = request.user.id;
		const { unFriendUsername } = request.body;

		// Vérifie la validité du nom
		if (!unFriendUsername || typeof unFriendUsername !== 'string') {
			return reply.status(400).send({ error: "unfriend not possible: Nom invalide." });
		}

		// Recherche l'ami dans la table users
		const friend = fastify.db.prepare('SELECT id FROM users WHERE username = ?').get(unFriendUsername);
		if (!friend) return reply.status(404).send({ error: "Utilisateur introuvable." });

		// Vérifie si la relation existe
		const exists = fastify.db.prepare(`
			SELECT 1 FROM friends WHERE user_id = ? AND friend_id = ?
		`).get(userId, friend.id);

		if (!exists) {
			return reply.status(404).send({ error: "Cet utilisateur n’est pas dans vos amis." });
		}

		try {
			fastify.db.prepare(`
				DELETE FROM friends WHERE user_id = ? AND friend_id = ?
			`).run(userId, friend.id);

			broadcastFriendshipChange(userId, friend.id, "removed");
			return { success: true, message: "Ami supprimé avec succès." };
		} catch (err) {
			return reply.status(500).send({ error: "Erreur lors de la suppression de l'ami." });
		}
	});

	//init route GET /friends, protégée, récupère liste friends
	fastify.get('/friends', { preHandler: [fastify.authenticate] }, async (request, reply) => {
		const userId = request.user.id;

		// INNER JOIN == combinaison tables users et friends. f.friend_id = u.id => relie id amis et utilisateurs
		// .all(userId) => récup toutes les lignes concernées par userId (tous les amis)
		const friends = fastify.db.prepare(`
			SELECT u.id, u.name, u.username, u.avatar
			FROM users u
			INNER JOIN friends f ON u.id = f.friend_id
			WHERE f.user_id = ?
		`).all(userId);

		friends.forEach(friend => {
			friend.online = fastify.onlineUsers.has(friend.id);
		});
		return { friends }; // retourne tableau  d’objets {id, name, username, avatar, online}
	});

	// Vérification d'amitié réciproque
	fastify.get('/friends/mutual', { preHandler: [fastify.authenticate] }, async (request, reply) => {
		const userId = request.user.id;
		const friendUsername = request.query?.username;
		if (!friendUsername || typeof friendUsername !== 'string') {
			return reply.status(400).send({ error: "Paramètre 'username' manquant ou invalide." });
		}

		const friend = fastify.db.prepare('SELECT id FROM users WHERE username = ?').get(friendUsername);
		if (!friend) return reply.status(404).send({ error: "Utilisateur introuvable." });

		const aToB = fastify.db.prepare(`
			SELECT 1 FROM friends WHERE user_id = ? AND friend_id = ?
		`).get(userId, friend.id);

		const bToA = fastify.db.prepare(`
			SELECT 1 FROM friends WHERE user_id = ? AND friend_id = ?
		`).get(friend.id, userId);

		return { mutual: !!(aToB && bToA) };
	});

};





/** exemple relations entre tab friends et tab users

 * 			tab friends
	| user_id	| friend_id |
	|-----------|-----------|
	| 1			| 2			|	alice ami bob
	| 2			| 1			|	bob ami alice
	| 1			| 3			|	alice ami charlie

 * 		tab users
	| id	| name		|
	|-------|-----------|
	| 1		| Alice		|
	| 2		| Bob		|
	| 3		| Charlie	|

*/
