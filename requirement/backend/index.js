const Fastify = require('fastify');
const cors = require ('@fastify/cors');
const bcrypt = require('bcrypt'); //hashage de mdp robuste et bcp utilise + utilise un SALT automatiquement
const db = require('./database.js');
const friendsBackend = require('./routes/user-managment/friends-backend');
const registerGoogleAuthRoutes = require('./routes/auth/google-auth.js');
const jwt = require('@fastify/jwt');
const { verify } = require('crypto');
const { read } = require('fs');


// backend/index.js
const fastify = Fastify({ logger: true})
fastify.decorate('db', db);


db.exec('PRAGMA foreign_keys = ON');
async function start(){
	
	//enregistrement du plugin
	await fastify.register(require('@fastify/jwt'), { //ajouter le JSON WEB TOKEN
		secret: process.env.JWT_KEY || 'secureSafetyKey'
	});
 
	await fastify.register(cors, {
		origin: '*', //dev only (faut pas faire ca)
		// On voudrait mettre origin: ['https://site.com'] pour autoriser les requetes venant uniquement du site
	});
	

	// FONCTION GET de fastify (Comportement different en fonction du path)
	fastify.get('/', async (request, reply) => {
		return {message: 'Hello World from Fastify!'}
	})
	
	fastify.get('/ping', async (request, reply) => {
		return {message: 'pong'}
	})

	// Hashage PASSWORD

	const hashPassword = async (password) => {
		const saltRounds = 10;
		const hashed = await bcrypt.hash(password, saltRounds);
		return hashed;
	};
	
	//enregistre les routes OAuth externes (google), a mettre apres l'initialisation de hashPassword et av route /register, /login
	registerGoogleAuthRoutes(fastify, hashPassword);

    fastify.post('/register', {
        schema: {
            body: {
                type : 'object',
                required: ['name', 'email', 'password'],
                properties: {
                    name: { type: 'string', minLength: 3, maxLength: 30 },
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string', minLength: 3},
                },
            },
            response: {
                200: { //ca fonctionne
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        id: { type: 'number' },
                        token: { type: 'string' }, //se co apres le register
                        username: { type: 'string' }
                    },
                },
                400: { //erreur auto fastify (champ manquant ou invalide)
                    type: 'object',
                    properties: {
                        error: { type: 'string' },
                    },
                },
                409: { //erreur (409 = Conflict) qui indique un conflit logique (doublon utilisateur ici)
                    type: 'object',
                    properties: {
                        error: { type: 'string' },
                    },
                },
            }
        }
    },
        async (request, reply) => { //c'est toujours dans /register
            let { name, email, password } = request.body;
       // Normalisation de base (évite les "espaces fantômes" qui cassent les comparaisons)
            name  = String(name).trim();
            email = String(email).trim();
            const existUser = db.prepare(`
            SELECT id FROM users
            WHERE name = ? COLLATE NOCASE
                OR email = ?
            `).get(name, email);   
        // Check utilisateur deja cree
        if (existUser) {
            return reply.status(409).send({ error: 'Nom ou email deja utilise' });
        }
        // Creation user
        try {
            const password_hash = await hashPassword(password);
            // check de l'username deja existant
            let username = name;
            let username_tmp = username;
            let i = 1;
            while (db.prepare('SELECT id FROM users WHERE username = ?').get(username_tmp)) {
                username_tmp = `${username}${i}`;
                i++;
            }
            username = username_tmp;
            const stmt = db.prepare ('INSERT INTO users (name, email, password_hash, username) VALUES (?, ?, ?, ?)');
            const info = stmt.run(name, email, password_hash, username);

			const token = fastify.jwt.sign({
				id: info.lastInsertRowid,
				name,
                username,
			});

            return { success: true, id: info.lastInsertRowid, token, name, username};
        } catch (err) {
            return reply.status(400).send({ error: err.message });
        }
    });

	// User login

	const checkPassword = async (password, hashPassword) => {
		return await bcrypt.compare(password, hashPassword);
	};

    fastify.post('/login', {
        schema: {
            body: {
                type: 'object',
                required: ['name', 'password'],
                properties: {
                    name: { type: 'string', minLength: 3, maxLength: 30 },
                    password: { type: 'string', minLength: 3 }
                }
            },
            response: {
                200: { //ca fonctionne
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' },
                        token: { type: 'string' },
                        name: { type: 'string' },
                        username: { type: 'string'}
                    }
                },
                400: { //erreur auto (mdp trop court... c'est fastify qui gere)
                    type: 'object',
                    properties: {
                        error: { type: 'string' }
                    }
                },
                401: { //erreur (401 = Unauthorized) manuelle liee a la bdd
                    type: 'object',
                    properties: {
                        error: { type: 'string' }
                    }
                }
            }
        }
    }, async (request, reply) => { //toujours dans le /login
        const { name, password } = request.body;

		const user = db.prepare('SELECT * FROM users WHERE name = ?').get(name);
		if (!user) {
			return reply.status(401).send({ error: 'Utilisateur non trouve' });
		}
		const isValid = await checkPassword(password, user.password_hash);
		if (!isValid) {
			return reply.status(401).send({ error: 'Mot de passe incorrect' });
		}

        const token = fastify.jwt.sign({ id: user.id, name: user.name, username: user.username });
        return { success: true, message: 'Connexion reussie', token , id: user.id, name: user.name, username: user.username}; //200
    });


    // --- Helpers Users / Guests --- //
function slugifyName(name) {
    return String(name).trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    }

    /**
     * Retourne l'id du user existant par name, ou crée un "guest" si absent.
     * Les invités reçoivent un email technique unique et un hash "GUEST".
     */
    function getOrCreateUserIdByName(name) {
    const u = db.prepare('SELECT id FROM users WHERE name = ?').get(name);
    if (u) return u.id;

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

    // Authentification    
    fastify.decorate("authenticate", async function (request, reply) {
        try {
            request.user = await request.jwtVerify();
        } catch (err) {
            reply.send(err);
        }
    });
    
        // =========================
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
    WHERE (fp_id = ? AND fp_score > sp_score) OR (sp_id = ? AND sp_score > fp_score)
  `).get(uid, uid).c;

  // défaites
  const losses = db.prepare(`
    SELECT COUNT(*) AS c FROM games
    WHERE (fp_id = ? AND fp_score < sp_score) OR (sp_id = ? AND sp_score < fp_score)
  `).get(uid, uid).c;

  const total = db.prepare(`
    SELECT COUNT(*) AS c FROM games
    WHERE fp_id = ? OR sp_id = ?
  `).get(uid, uid).c;

  const winrate = total ? Math.round((wins / total) * 100) : 0;

  return { name, wins, losses, total, winrate };
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
        WHERE g.fp_id = ? OR g.sp_id = ?
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

	// Verifier le token JWT user et return un 401 si token invalide
	fastify.get('/me', {
		preHandler: [fastify.authenticate]
	}, async (request, reply) => {
		const userId = request.user.id;

		const user = db.prepare('SELECT id, name FROM users WHERE id = ?').get(userId);

		if (!user) {
			return reply.status(401).send({error: 'Utilisateur supprime ou inexistant.'});
		}
		return { user: request.user };
	});

	friendsBackend(fastify);


    fastify.put('/me/username', { //gerer le changement d'username
        preHandler: [fastify.authenticate],
        schema: {
            body: {
                type: 'object',
                required: ['username'],
                properties: {
                    username: { type: 'string', minLength: 3, maxLength: 30 }
                }
            },
            response: {
                200: { //OK
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        username: { type: 'string' },
                        token: {type: 'string' }
                    }
                },
                400: { //Erreur auto
                    type: 'object',
                    properties: { error: { type: 'string' } }
                },
                401: { //Erreur manuelle ou BDD
                    type: 'object',
                    properties: { error: { type: 'string' } }
                },
                409: { //Erreur conflit logique souvent doublon ou autre
                    type: 'object',
                    properties: { error: { type: 'string' } }
                }
            }
        } 
    }, async (request, reply) => {
            const userId = request.user.id;
            const { username } = request.body;

            const existing = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, userId); //cherche si un autre joueur utilise le pseudo avant de changer
            if (existing)
                return (reply.status(409).send({error: 'Username already used'}));

            try {
                const stmt = db.prepare('UPDATE users SET username = ? WHERE id = ?')
                stmt.run(username, userId);

                const user = db.prepare('SELECT name FROM users WHERE id = ?').get(userId);
                const newToken = fastify.jwt.sign({ id: userId, name: user.name, username });
                return { success: true, username, token: newToken };
            } catch (err) {
                return (reply.status(400).send({ error: err.message }));
            }
    });

    fastify.put('/me/password', { //gerer le changement de mdp
        preHandler: [fastify.authenticate],
        schema: {
            body: {
                type: 'object',
                required: ['password', 'confirmPassword'],
                properties: {
                    password: { type: 'string', minLength: 3 },
                    confirmPassword: { type: 'string', minLength: 3 }
                }
            },
            response: {
                200: { //OK
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        username: { type: 'string' },
                        token: {type: 'string' }
                    }
                },
                400: { //Erreur auto
                    type: 'object',
                    properties: { error: { type: 'string' } }
                },
                401: { //Erreur manuelle ou BDD
                    type: 'object',
                    properties: { error: { type: 'string' } }
                },
                409: { //Erreur conflit logique souvent doublon ou autre
                    type: 'object',
                    properties: { error: { type: 'string' } }
                }
            }
        } 
    }, async (request, reply) => {
            const { password, confirmPassword } = request.body;
            const userId = request.user.id;
            const username = request.user.username;
            try {
                // Verifier l'user et l'ancien mdp + hasher le nouveau mdp et le remplacer
                const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
                if (!user)
                    return (reply.status(401).send({ error: 'User not found' }));
                
                if (password != confirmPassword)
                    return (reply.status(401).send({ error: 'both password are not equal' }));
                
                const password_hash = await hashPassword(password);
                const stmt = db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(password_hash, userId);

                const newToken = fastify.jwt.sign({id: userId, username: username });
                return { success: true, username, token: newToken };
            } catch (err) {
                return (reply.status(400).send({ error: err.message }));
            }
    });

    //Demarrer le serveur
    
    try {
        await fastify.listen({ port: 3000, host: '0.0.0.0' });
        console.log('Server running at http://localhost:3000');
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
}

start();