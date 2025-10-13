async function twoFAStop(fastify) {
	// Désactivation du 2FA pour l'utilisateur connecté
	fastify.post('/2fa/disable', { preHandler: [fastify.authenticate] }, async (req, reply) => {
		try {
		const userId = req.user.id;

		// 1) On désactive le flag et on supprime la clé chiffrée
		fastify.db
			.prepare(`UPDATE users SET twofa_enabled = 0, twofa_secret = NULL WHERE id = ?`)
			.run(userId);

		// 2) (facultatif) on nettoie un éventuel setup temporaire en cours
		const cache = fastify.twoFATempSecrets;
		if (cache && cache.has(userId)) cache.delete(userId);

		fastify.db.prepare('DELETE FROM recovery_codes WHERE user_id = ?').run(userId);

		// 3) logging
		fastify.db
			.prepare(`INSERT INTO auth_logs (user_id, event) VALUES (?, '2fa_disabled')`)
			.run(userId);

		return { success: true };
		} catch (err) {
		req.log.error(err);
		return reply.code(500).send({ error: 'failed_to_disable_2fa' });
		}
	});
}

module.exports = twoFAStop;
