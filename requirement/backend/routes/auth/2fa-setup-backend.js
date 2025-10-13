const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const crypto = require("crypto");
const bcrypt = require("bcrypt");


const TTL_MS = 5 * 60 * 1000; //5min

async function twoFASetup(fastify) {

	fastify.post('/2fa/setup', { preHandler: [fastify.authenticate] }, async (req, reply) => {
	const user = req.user; // { id, name }
	//Génère un secret base32

	const issuer = 'Transcendance';
	const label = user.name || user.username || `user-${user.id}`;
	const secret = speakeasy.generateSecret({
		name: `${issuer} (${label})`,
		length: 20, // 20 bytes -> 32 chars base32 env.
		issuer,
	});
	
	const tempSecrets = fastify.twoFATempSecrets;
	tempSecrets.set(user.id, { secret_base32: secret.base32, exp: Date.now() + TTL_MS });
	const qr_png_data_url = await QRCode.toDataURL(secret.otpauth_url);

	return {
		success: true,
		otpauth_url: secret.otpauth_url,
		qr_png_data_url,
		expires_in_sec: Math.floor(TTL_MS / 1000),
		};

	});
}

async function verifyTwoFASetup(fastify) {
	fastify.post('/2fa/verify-setup', { preHandler: [fastify.authenticate] }, async (req, reply) => {
		const userId = req.user.id;
		const { otp } = req.body || {};
		if (!otp) {return reply.code(400).send({ error: 'otp requis' }); }

		const tempSecrets = fastify.twoFATempSecrets;
		if (!tempSecrets) return reply.code(500).send({ error: 'cache 2FA indisponible' });

		const entry = tempSecrets.get(userId);
		if (!entry) return reply.code(400).send({ error: 'setup 2FA introuvable ou expiré, recommencez' });
		if (entry.exp < Date.now()) {
			tempSecrets.delete(userId);
			return reply.code(400).send({ error: 'setup 2FA expiré, recommencez' });
		}
		entry.attempts = (entry.attempts || 0) + 1;
			if (entry.attempts > 5) {
			tempSecrets.delete(userId);
			return reply.code(429).send({ error: 'trop d’essais, recommencez le setup' });
		}
		const secret_base32 = entry.secret_base32;

		const ok = speakeasy.totp.verify({
			secret: secret_base32,
			encoding: 'base32',
			token: otp,
			window: 1, // tolérance env 30s
		});
		if (!ok) return reply.code(400).send({ error: 'OTP invalide' });

		// CHIFFRER puis STOCKER
		const enc = fastify.encrypt(secret_base32);
		fastify.db.prepare(`
			UPDATE users
				SET twofa_secret = ?, twofa_enabled = 1
			WHERE id = ?
		`).run(enc, userId);

		tempSecrets.delete(userId);
		fastify.db.prepare(`INSERT INTO auth_logs (user_id, event) VALUES (?, '2fa_setup_verified')`).run(userId);

		// --- GENERER CODES DE RECUPERATION ---
		const N = 8; // nombre de codes
		const codesPlain = [];
		const insertStmt = fastify.db.prepare('INSERT INTO recovery_codes (user_id, code_hash, used) VALUES (?, ?, 0)');
		for (let i = 0; i < N; i++) {
			// code lisible humain, ex: 'ABCD-EFGH-1234'
			const raw = crypto.randomBytes(6).toString('base64').replace(/\W/g, '').slice(0,10);
			const code = raw.match(/.{1,4}/g).join('-'); // ex: 'abcd-ef12-34'
			const hash = await bcrypt.hash(code, 10);
			insertStmt.run(userId, hash);
			codesPlain.push(code);
		}

		// return success + the recovery codes (plaintext) once (client must store them)
		return { success: true, recovery_codes: codesPlain };
	});
}

module.exports = {twoFASetup, verifyTwoFASetup};