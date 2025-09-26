async function game(fastify, options) {
    const db = fastify.db;

    function slugifyName(name) {
        return String(name).trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    }

    function getOrCreateUserIdByName(name) {
        const u = db.prepare('SELECT id FROM users WHERE name = ?').get(name);
        if (u) 
            return (u.id);

        // crée un invité
        const slug = slugifyName(name) || `guest_${Date.now()}`;
        const email = `${slug}@guest.local`; // respecte contrainte UNIQUE
        const password_hash = 'GUEST';       // valeur placeholder

        try {
            const info = db.prepare(
            'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)'
            ).run(name, email, password_hash);
            return info.lastInsertRowid;
        } catch (e) {
            // email pour guest
            const email2 = `${slug}_${Date.now()}@guest.local`;
            const info = db.prepare(
            'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)'
            ).run(name, email2, password_hash);
            return info.lastInsertRowid;
        }
    }
    // // Enregistrer un match terminé
    // fastify.post('/game/result', {
    // preHandler: [fastify.authenticate],
    // schema: {
    //     body: {
    //     type: 'object',
    //     required: ['p1Name', 'p2Name', 's1', 's2'],
    //     properties: {
    //         p1Name: { type: 'string', minLength: 1 },
    //         p2Name: { type: 'string', minLength: 1 },
    //         s1: { type: 'integer', minimum: 0 },
    //         s2: { type: 'integer', minimum: 0 },
    //     }
    //     },
    //     response: {
    //     200: { //OK
    //         type: 'object',
    //         properties: {
    //         success: { type: 'boolean' },
    //         gameId: { type: 'number' },
    //         }
    //     }
    //     }
    // }
    // }, async (request, reply) => {
    // const { p1Name, p2Name, s1, s2 } = request.body;

    // const fp_id = getOrCreateUserIdByName(p1Name);
    // const sp_id = getOrCreateUserIdByName(p2Name);

    // const game_status = 1; //terminé
    // const info = db.prepare(`
    //     INSERT INTO games (fp_id, sp_id, fp_score, sp_score, game_status)
    //     VALUES (?, ?, ?, ?, ?)
    // `).run(fp_id, sp_id, s1, s2, game_status);

    // return { success: true, gameId: info.lastInsertRowid };
    // });


    // Enregistrer un match terminé
    fastify.post('/game/result', {
    preHandler: [fastify.authenticate],
    schema: {
        body: {
        type: 'object',
        required: ['p1Id', 'p2Id', 's1', 's2'],
        properties: {
            p1Id: { type: 'integer' },
            p2Id: { type: 'integer' },
            s1: { type: 'integer', minimum: 0 },
            s2: { type: 'integer', minimum: 0 },
        }
        },
        response: {
        200: {
            type: 'object',
            properties: {
            success: { type: 'boolean' },
            gameId: { type: 'number' },
            }
        }
        }
    }
    }, async (request, reply) => {
    const { p1Id, p2Id, s1, s2 } = request.body;

    const user1 = db.prepare('SELECT id FROM users WHERE id = ?').get(p1Id);
    const user2 = db.prepare('SELECT id FROM users WHERE id = ?').get(p2Id);

    if (!user1 || !user2) {
        return reply.status(400).send({ error: "Utilisateur introuvable" });
    }

    const game_status = 1; //terminé
    const info = db.prepare(`
        INSERT INTO games (fp_id, sp_id, fp_score, sp_score, game_status)
        VALUES (?, ?, ?, ?, ?)
    `).run(p1Id, p2Id, s1, s2, game_status);

    return { success: true, gameId: info.lastInsertRowid };
    });

    // Endpoint for game server to save results (no authentication required)
    fastify.post('/game/server-result', {
    schema: {
        body: {
        type: 'object',
        required: ['p1Id', 'p2Id', 's1', 's2'],
        properties: {
            p1Id: { type: 'integer' },
            p2Id: { type: 'integer' },
            s1: { type: 'integer', minimum: 0 },
            s2: { type: 'integer', minimum: 0 },
        }
        },
        response: {
        200: {
            type: 'object',
            properties: {
            success: { type: 'boolean' },
            gameId: { type: 'number' },
            }
        }
        }
    }
    }, async (request, reply) => {
    const { p1Id, p2Id, s1, s2 } = request.body;

    const user1 = db.prepare('SELECT id FROM users WHERE id = ?').get(p1Id);
    const user2 = db.prepare('SELECT id FROM users WHERE id = ?').get(p2Id);

    if (!user1 || !user2) {
        return reply.status(400).send({ error: "Utilisateur introuvable" });
    }

    const game_status = 1; //terminé
    const info = db.prepare(`
        INSERT INTO games (fp_id, sp_id, fp_score, sp_score, game_status)
        VALUES (?, ?, ?, ?, ?)
    `).run(p1Id, p2Id, s1, s2, game_status);

    return { success: true, gameId: info.lastInsertRowid };
    });

    // 🔒 LOOKUPS STRICTS USERS
    // =========================
    // Trouver un user par *name* (insensible à la casse) — pour ajouter au tournoi
    fastify.get('/users/by-name/:name', async (request, reply) => {
        const name = String(request.params.name || '').trim();
        const user = db.prepare(`
            SELECT id, name, username
            FROM users
            WHERE name = ? COLLATE NOCASE
        `).get(name);
        if (!user) return reply.status(404).send({ error: 'name not found' });
        return { id: user.id, name: user.name, username: user.username };
    });

     // Vérifier l’existence d’un *username* (insensible à la casse) — aide au message front
    fastify.get('/users/by-username/:username', async (request, reply) => {
        const { username } = request.params;
        const user = db.prepare(`
            SELECT id FROM users
            WHERE username = ? COLLATE NOCASE
        `).get(username);
        if (!user) return reply.status(404).send({ error: 'username not found' });
        return { ok: true, id: user.id };
    });


    // Enregistre une partie "Quick Play" : le user connecté est fp_id ET sp_id.
// Le front n'envoie que les scores, on n'invente pas de joueurs "Player1/Player2" côté BDD.
    fastify.post('/game/quick-result', {
    preHandler: [fastify.authenticate],
    schema: {
        body: {
        type: 'object',
        required: ['s1', 's2'],
        properties: {
            s1: { type: 'integer', minimum: 0 },
            s2: { type: 'integer', minimum: 0 },
        }
        },
        response: {
        200: {
            type: 'object',
            properties: {
            success: { type: 'boolean' },
            gameId: { type: 'number' },
            }
        }
        }
    }
    }, async (request, reply) => {
    const userId = request.user.id;
    const { s1, s2 } = request.body;
    const game_status = 1; // terminé

    const info = db.prepare(`
        INSERT INTO games (fp_id, sp_id, fp_score, sp_score, game_status)
        VALUES (?, ?, ?, ?, ?)
    `).run(userId, userId, s1, s2, game_status);

    return { success: true, gameId: info.lastInsertRowid };
    });

    // Stats simples pour un user par nom
fastify.get('/users/:name/stats', async (request, reply) => {
  const { name } = request.params;

  const user = db.prepare('SELECT id FROM users WHERE name = ?').get(name);
  if (!user) return reply.status(404).send({ error: 'Utilisateur introuvable' });

  const uid = user.id;

  // victoires
  const wins = db.prepare(`
    SELECT COUNT(*) AS c FROM games
    WHERE ((fp_id = ? AND fp_score > sp_score) OR (sp_id = ? AND sp_score > fp_score))
      AND fp_id != sp_id
  `).get(uid, uid).c;

  // défaites
  const losses = db.prepare(`
    SELECT COUNT(*) AS c FROM games
    WHERE ((fp_id = ? AND fp_score < sp_score) OR (sp_id = ? AND sp_score < fp_score))
      AND fp_id != sp_id
  `).get(uid, uid).c;

  const total = db.prepare(`
    SELECT COUNT(*) AS c FROM games
    WHERE (fp_id = ? OR sp_id = ?)
      AND fp_id != sp_id
  `).get(uid, uid).c;

  const winrate = total ? Math.round((wins / total) * 100) : 0;

  return { name, wins, losses, total, winrate };
});

// Enhanced statistics for a user by name
fastify.get('/users/:name/enhanced-stats', async (request, reply) => {
  const { name } = request.params;

  const user = db.prepare('SELECT id FROM users WHERE name = ?').get(name);
  if (!user) return reply.status(404).send({ error: 'Utilisateur introuvable' });

  const uid = user.id;

  // Basic stats
  const wins = db.prepare(`
    SELECT COUNT(*) AS c FROM games
    WHERE ((fp_id = ? AND fp_score > sp_score) OR (sp_id = ? AND sp_score > fp_score))
      AND fp_id != sp_id
  `).get(uid, uid).c;

  const losses = db.prepare(`
    SELECT COUNT(*) AS c FROM games
    WHERE ((fp_id = ? AND fp_score < sp_score) OR (sp_id = ? AND sp_score < fp_score))
      AND fp_id != sp_id
  `).get(uid, uid).c;

  const total = db.prepare(`
    SELECT COUNT(*) AS c FROM games
    WHERE (fp_id = ? OR sp_id = ?)
      AND fp_id != sp_id
  `).get(uid, uid).c;

  const winrate = total ? Math.round((wins / total) * 100) : 0;

  // Enhanced stats
  const allGames = db.prepare(`
    SELECT 
      CASE WHEN fp_id = ? THEN fp_score ELSE sp_score END as my_score,
      CASE WHEN fp_id = ? THEN sp_score ELSE fp_score END as opp_score,
      date,
      CASE WHEN (fp_id = ? AND fp_score > sp_score) OR (sp_id = ? AND sp_score > fp_score) THEN 1 ELSE 0 END as is_win
    FROM games 
    WHERE (fp_id = ? OR sp_id = ?) AND fp_id != sp_id
    ORDER BY datetime(date) DESC
  `).all(uid, uid, uid, uid, uid, uid);

  let totalPointsScored = 0;
  let totalPointsConceded = 0;
  let bestScore = 0;
  let worstScore = Infinity;
  let currentStreak = 0;
  let bestStreak = 0;
  let worstStreak = 0;
  let tempStreak = 0;

  allGames.forEach(game => {
    const myScore = game.my_score;
    const isWin = game.is_win;

    totalPointsScored += myScore;
    totalPointsConceded += game.opp_score;
    bestScore = Math.max(bestScore, myScore);
    worstScore = Math.min(worstScore, myScore);

    if (isWin) {
      tempStreak = tempStreak >= 0 ? tempStreak + 1 : 1;
    } else {
      tempStreak = tempStreak <= 0 ? tempStreak - 1 : -1;
    }

    if (tempStreak > 0) {
      bestStreak = Math.max(bestStreak, tempStreak);
    } else if (tempStreak < 0) {
      worstStreak = Math.min(worstStreak, tempStreak);
    }
  });

  currentStreak = tempStreak;
  const averageScore = total > 0 ? totalPointsScored / total : 0;
  const pointsRatio = totalPointsScored + totalPointsConceded > 0 ? 
    (totalPointsScored / (totalPointsScored + totalPointsConceded)) * 100 : 0;

  // Recent performance (last 10 games)
  const recentGames = allGames.slice(0, 10);
  const recentWins = recentGames.filter(g => g.is_win).length;
  const recentWinRate = recentGames.length > 0 ? (recentWins / recentGames.length) * 100 : 0;
  const recentAvgScore = recentGames.length > 0 ? 
    recentGames.reduce((sum, g) => sum + g.my_score, 0) / recentGames.length : 0;

  return {
    basic: { name, wins, losses, total, winrate },
    enhanced: {
      totalPointsScored,
      totalPointsConceded,
      pointsRatio: Math.round(pointsRatio * 100) / 100,
      averageScore: Math.round(averageScore * 100) / 100,
      bestScore,
      worstScore: worstScore === Infinity ? 0 : worstScore,
      currentStreak,
      bestStreak,
      worstStreak,
      recentWinRate: Math.round(recentWinRate * 100) / 100,
      recentAvgScore: Math.round(recentAvgScore * 100) / 100
    }
  };
});

// Historique de match d’un user par nom
    fastify.get('/users/:name/history', async (request, reply) => {
    const name = request.params.name;

    // Récupère l'utilisateur par son nom
    const user = db.prepare('SELECT id, name, username FROM users WHERE name = ?').get(name);
    if (!user) {
        return reply.status(404).send({ error: 'Utilisateur introuvable' });
    }

    // On récupère ses 50 derniers matchs (tu peux mettre LIMIT 10 si tu veux)
    const rows = db.prepare(`
        SELECT
        g.id,
        g.fp_id, g.sp_id,
        g.fp_score, g.sp_score,
        g.date,
        u1.name AS fp_name,
        u2.name AS sp_name
        FROM games g
        JOIN users u1 ON u1.id = g.fp_id
        JOIN users u2 ON u2.id = g.sp_id
        WHERE (g.fp_id = ? OR g.sp_id = ?) AND g.fp_id != g.sp_id
        ORDER BY datetime(g.date) DESC
        LIMIT 50
    `).all(user.id, user.id);

    const matches = rows.map((r) => {
        const meIsFirst = r.fp_id === user.id;
        const myScore   = meIsFirst ? r.fp_score : r.sp_score;
        const oppScore  = meIsFirst ? r.sp_score : r.fp_score;

        // Cas particulier Quick Play: self vs self
        let meLabel, oppLabel;
        if (r.fp_id === user.id && r.sp_id === user.id) {
        meLabel  = 'Player1';
        oppLabel = 'Player2';
        } else {
        meLabel  = user.username || user.name;
        oppLabel = meIsFirst ? r.sp_name : r.fp_name;
        }

        const result = myScore > oppScore ? 'W' : (myScore < oppScore ? 'L' : 'D');

        return {
        id: r.id,
        me: meLabel,
        opponent: oppLabel,
        myScore,
        oppScore,
        date: r.date,
        result, // 'W' ou 'L' (ou 'D' si jamais il y avait un nul)
        };
    });

    return { matches };
    });

    // Vérifier si un username existe
    fastify.get('/users/username/:username/exists', async (request, reply) => {
    const { username } = request.params;
    const user = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    return { exists: !!user };
    });


    // // Choper le name et afficher l'username
    // fastify.get('/users/:alias/display', async (request, reply) => {
    // const { alias } = request.params;
    // const user = db.prepare(`
    //     SELECT id, username, name 
    //     FROM users 
    //     WHERE lower (name) = lower(?)
    // `).get(alias);

    // if (!user) {
    //     return reply.status(404).send({ error: 'Utilisateur introuvable' });
    // }

    // return { id: user.id, name : user.name, display: user.username || user.name };
    // });

        // Choper le *name* et retourner l'alias d'affichage (username) — name-only (NOCASE)
    fastify.get('/users/:alias/display', async (request, reply) => {
        const alias = String(request.params.alias || '').trim();
        const user = db.prepare(`
            SELECT id, username, name
            FROM users
            WHERE name = ? COLLATE NOCASE
        `).get(alias);
        if (!user) {
            return reply.status(404).send({ error: 'Utilisateur introuvable' });
        }
        return { id: user.id, name: user.name, display: user.username || user.name };
    });

}

module.exports = game;