const speakeasy = require('speakeasy');
const bcrypt = require('bcrypt');

async function checkTwoFa(fastify) {
  fastify.post('/login/checkTwoFa', async (req, reply) => {
    const { twofa_token, otp, recovery_code } = req.body || {};
    if (!twofa_token || (!otp && !recovery_code)) {
      return reply.code(400).send({ error: 'missing params' });
    }

    let payload;
    try {
      payload = fastify.jwt.verify(twofa_token);
    } catch (e) {
      return reply.code(401).send({ error: '2fa token invalid/expired' });
    }

    if (payload.stage !== '2fa') {
      return reply.code(400).send({ error: 'wrong stage' });
    }

    const row = fastify.db
      .prepare('SELECT id, name, username, twofa_secret FROM users WHERE id = ?')
      .get(payload.uid);

    if (!row || !row.twofa_secret) {
      return reply.code(400).send({ error: '2FA non active pour cet utilisateur' });
    }

    if (otp) {
      let secret_base32;
      try {
        secret_base32 = fastify.decrypt(row.twofa_secret);
      } catch (e) {
        return reply.code(500).send({ error: 'decrypt error' });
      }

      const ok = speakeasy.totp.verify({
        secret: secret_base32,
        encoding: 'base32',
        token: otp,
        window: 1,
      });

      if (!ok) {
        fastify.db
          .prepare(`INSERT INTO auth_logs (user_id, event) VALUES (?, 'login_2fa_fail')`)
          .run(row.id);
        return reply.code(400).send({ error: 'OTP invalide' });
      }

      const token = fastify.jwt.sign({ id: row.id, name: row.name });
      fastify.db
        .prepare(`INSERT INTO auth_logs (user_id, event) VALUES (?, 'login_2fa_ok')`)
        .run(row.id);

      return { success: true, token, username: row.username, name: row.name };
    }

    if (recovery_code) {
      const rows = fastify.db
        .prepare('SELECT id, code_hash, used FROM recovery_codes WHERE user_id = ?')
        .all(row.id);

      let matched = null;
      for (const rc of rows) {
        const match = await bcrypt.compare(recovery_code, rc.code_hash);
        if (match) {
          matched = rc;
          break;
        }
      }

      if (!matched) {
        fastify.db
          .prepare(`INSERT INTO auth_logs (user_id, event) VALUES (?, 'login_recovery_fail')`)
          .run(row.id);
        return reply.code(400).send({ error: 'Recovery code invalide.' });
      }

      if (matched.used) {
        fastify.db
          .prepare(
            `INSERT INTO auth_logs (user_id, event, meta) VALUES (?, 'login_recovery_reused', ?)`
          )
          .run(row.id, `code_id=${matched.id}`);
        return reply.code(400).send({ error: 'Ce code de récupération a déjà été utilisé.' });
      }

      fastify.db.prepare('UPDATE recovery_codes SET used = 1 WHERE id = ?').run(matched.id);
      fastify.db
        .prepare(
          `INSERT INTO auth_logs (user_id, event, meta) VALUES (?, 'login_recovery_code_used', ?)`
        )
        .run(row.id, `code_id=${matched.id}`);
      fastify.db
        .prepare(`INSERT INTO auth_logs (user_id, event) VALUES (?, 'login_recovery_ok')`)
        .run(row.id);

      const token = fastify.jwt.sign({ id: row.id, name: row.name });
      return {
        success: true,
        token,
        username: row.username,
        name: row.name,
        recovery_used: true,
      };
    }

    return reply.code(400).send({ error: 'Paramètres invalides' });
  });
}

module.exports = checkTwoFa;
