const bcrypt = require('bcrypt'); //hashage de mdp robuste et bcp utilise + utilise un SALT automatiquement

async function auth(fastify, options) {
    const db = fastify.db;
    
    // Gerer l'inscription Utilisateur
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
        const { name, email, password } = request.body;
        // Check utilisateur deja cree
        const existUser = db.prepare('SELECT id FROM users WHERE name = ? OR email = ?').get(name, email);
        if (existUser) {
            return reply.status(409).send({ error: 'Nom ou email deja utilise' });
        }
        // Creation user
        try {
            const password_hash = await fastify.hashPassword(password);
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
				name: name,
			});

            return { success: true, id: info.lastInsertRowid, token, username};
        } catch (err) {
            return reply.status(400).send({ error: err.message });
        }
    });

    
    
    // Verifie si les MDP sont egaux
    const checkPassword = async (password, hashPassword) => {
        return await bcrypt.compare(password, hashPassword);
	};
    
    
    // Gerer la connexion Utilisateur
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
                        username: { type: 'string'},
						twofa_required: { type: 'boolean' },
    					twofa_token:    { type: 'string' }
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
        
		// 2FA actif
		if (user.twofa_enabled) {
			const twofa_token = fastify.jwt.sign(
				{ uid: user.id, stage: '2fa' },
				{ expiresIn: '5m' }
			);
			return {
				success: true,
				message: '2FA requise',
				twofa_required: true,
				twofa_token,
				username: user.username
			};
		}

        const token = fastify.jwt.sign({ id: user.id, name: user.name });

        console.log("Utilisateur connecté :", user.id, user.count); // debug http://localhost:3000/debug/online-users

		return { success: true, message: 'Connexion reussie', token , username: user.username}; //200
    });

	//mettre a jour la liste des utilisateurs connectés
	fastify.post('/logout', { preHandler: [fastify.authenticate] }, async (request, reply) => {
		console.log("Logout appelé avec user:", request.user);
		const userId = request.user.id;
		const count = fastify.onlineUsers.get(userId) || 0; //nbr session ouverte pqr user
		if (count <= 1) {
			fastify.onlineUsers.delete(userId); //derniere session = enleve le compteur
		}else {
			fastify.onlineUsers.set(userId, count - 1); //decremente compteur
		}
		return { success: true };
	});

}
    
module.exports = auth; 