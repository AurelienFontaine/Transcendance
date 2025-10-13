const crypto = require("crypto");
const bcrypt = require("bcrypt");

async function twoFARecovery(fastify) {
  fastify.post("/2fa/recovery/regenerate", { preHandler: [fastify.authenticate] }, async (req, reply) => {
    const userId = req.user.id;

    // Supprimer anciens codes
    fastify.db.prepare(`DELETE FROM recovery_codes WHERE user_id = ?`).run(userId);

    // Générer 10 nouveaux
    const codes = [];
    const stmt = fastify.db.prepare(`INSERT INTO recovery_codes (user_id, code_hash) VALUES (?, ?)`);
    for (let i = 0; i < 10; i++) {
      const code = crypto.randomBytes(4).toString("hex"); // ex: 8 caractères
      const hash = bcrypt.hashSync(code, 10);
      stmt.run(userId, hash);
      codes.push(code);
    }

    fastify.db.prepare(`INSERT INTO auth_logs (user_id, event) VALUES (?, '2fa_recovery_regenerated')`).run(userId);

    return { success: true, recovery_codes: codes };
  });
}

module.exports = twoFARecovery;
