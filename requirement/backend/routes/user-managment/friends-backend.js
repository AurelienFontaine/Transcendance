/** Instruction Node.js, permet d’esport une fct ou un obj dans un autre fichier (enregistre nouv routes dans fastify) */

module.exports = function (fastify) {
	
	//cree route (ajout ami). preHandler: [fastify.authenticate] = appel du middleware av exec route
	fastify.post('/friends/add', { preHandler: [fastify.authenticate] }, async (request, reply) => {
		const userId = request.user.id; //id user connecté
		const { friendName } = request.body; //nom friend à ajouter

		//verifie validité du nom
		if (!friendName || typeof friendName !== 'string') {
			return reply.status(400).send({ error: "add friend not possible: Nom invalide." });
		}

		//cherche l'utilisateur correspondant au nom
		const friend = fastify.db.prepare('SELECT id FROM users WHERE name = ?').get(friendName);
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

			return { success: true };
		} catch (err) {
			console.error("❌ Erreur SQL lors de l'ajout d'ami :", err.message);
			console.error("Stack :", err.stack);
			return reply.status(500).send({ error: "Erreur lors de l'ajout." });
		}
	});

	// Supprimer un ami (par nom)
	fastify.post('/friends/remove', { preHandler: [fastify.authenticate] }, async (request, reply) => {
		const userId = request.user.id;
		const { unfriendName } = request.body;

		// Vérifie la validité du nom
		if (!unfriendName || typeof unfriendName !== 'string') {
			return reply.status(400).send({ error: "unfriend not possible: Nom invalide." });
		}

		// Recherche l'ami dans la table users
		const friend = fastify.db.prepare('SELECT id FROM users WHERE name = ?').get(unfriendName);
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

			return { success: true, message: "Ami supprimé avec succès." };
		} catch (err) {
			console.error("Erreur SQL suppression:", err);
			return reply.status(500).send({ error: "Erreur lors de la suppression de l'ami." });
		}
	});

	//init route GET /friends, protégée, récupère liste friends
	fastify.get('/friends', { preHandler: [fastify.authenticate] }, async (request, reply) => {
		const userId = request.user.id;

		// INNER JOIN == combinaison tables users et friends. f.friend_id = u.id => relie id amis et utilisateurs
		// .all(userId) => récup toutes les lignes concernées par userId (tous les amis)
		const friends = fastify.db.prepare(`
			SELECT u.id, u.name
			FROM users u
			INNER JOIN friends f ON u.id = f.friend_id
			WHERE f.user_id = ?
		`).all(userId);

		return { friends }; // retourne tableau d’objets {id, name}
	});
};


/** exemple relations entre tab friends et tab users

 * 			tab friends
	| user_id | friend_id |
	|---------|-----------|
	| 1       | 2         |	alice ami bob
	| 2       | 1         |	bob ami alice
	| 1       | 3         |	alice ami charlie

 * 		tab users
	| id | name    |
	|----|---------|
	| 1  | Alice   |
	| 2  | Bob     |
	| 3  | Charlie |

*/
