const Fastify = require('fastify');
const cors = require ('@fastify/cors');
const bcrypt = require('bcrypt'); //hashage de mdp robuste et bcp utilise + utilise un SALT automatiquement
const db = require('./database.js');
const jwt = require('@fastify/jwt');
const { verify } = require('crypto');
const { read } = require('fs');

// backend/index.js
const fastify = Fastify({ logger: true})

db.exec('PRAGMA foreign_keys = ON');
async function start(){
    
    
    await fastify.register(require('@fastify/jwt'), { //ajouter le JSON WEB TOKEN
        secret: process.env.JWT_KEY || 'secureSafetyKey'
    });
 
    fastify.register(cors, {
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

	//auth/google redirection connection google
	const GOOGLE_CLIENT_ID = '1026191592145-g38oau1j785vuvgjv2asagkinl72nq2a.apps.googleusercontent.com';
	const REDIRECT_URI = 'http://localhost:3000/auth/google/callback';

	fastify.get('/auth/google', async (request, reply) => {
		const params = new URLSearchParams({
			client_id: GOOGLE_CLIENT_ID,
			redirect_uri: REDIRECT_URI,
			response_type: 'code',
			scope: 'profile email',
			access_type: 'offline',
			prompt: 'consent'
		});

		reply.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
	});
	const axios = require('axios'); // npm install axios

	const GOOGLE_CLIENT_SECRET = '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';

	fastify.get('/auth/google/callback', async (request, reply) => {
		const code = request.query.code;
		if (!code) return reply.status(400).send({ error: 'Code non fourni par Google' });

		try {
			// 1. Échange du code contre un access_token
			const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
				code,
				client_id: GOOGLE_CLIENT_ID,
				client_secret: GOOGLE_CLIENT_SECRET,
				redirect_uri: REDIRECT_URI,
				grant_type: 'authorization_code'
			});

			const { access_token } = tokenResponse.data;

			// 2. Utilisation du token pour récupérer les infos du profil
			const userInfoResponse = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
				headers: {
					Authorization: `Bearer ${access_token}`
				}
			});

			const { name, email, sub } = userInfoResponse.data;

			// 3. Vérifie si l'utilisateur existe déjà
			let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

			if (!user) {
				// Création du compte avec un mot de passe vide ou généré
				const dummyPassword = await hashPassword(sub); // On hash un ID Google
				const insert = db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)')
					.run(name, email, dummyPassword);

				user = {
					id: insert.lastInsertRowid,
					name,
					email
				};
			}

			// 4. Générer un JWT
			const token = fastify.jwt.sign({ id: user.id, name: user.name });
			// 🔁 Tu peux rediriger vers le front avec le token dans l'URL, ou répondre en JSON :
			reply.redirect(`http://localhost:8080/profile?token=${token}&name=${encodeURIComponent(user.name)}`);
		} catch (err) {
			console.error(err.response?.data || err);
			return reply.status(500).send({ error: 'Erreur durant le login Google' });
		}
	});

    // Protection INJECTION SQL //



    // Hashage PASSWORD

    const hashPassword = async (password) => {
        const saltRounds = 10;
        const hashed = await bcrypt.hash(password, saltRounds);
        return hashed;
    };

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
            const password_hash = await hashPassword(password);
            const stmt = db.prepare ('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)');
            const info = stmt.run(name, email, password_hash);

            const token = fastify.jwt.sign({
                id: info.lastInsertRowid,
                name: name,
            });

            return { success: true, id: info.lastInsertRowid, token};
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
                        token: { type: 'string' }
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

        const token = fastify.jwt.sign({ id: user.id, name: user.name });
        return { success: true, message: 'Connexion reussie', token }; //200
    });





    // Authentification 
    
    fastify.decorate("authenticate", async function (request, reply) {
        try {
            request.user = await request.jwtVerify();
        } catch (err) {
            reply.send(err);
        }
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