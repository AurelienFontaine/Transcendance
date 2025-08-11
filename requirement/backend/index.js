const Fastify = require('fastify');
const cors = require ('@fastify/cors');
const bcrypt = require('bcrypt'); //hashage de mdp robuste et bcp utilise + utilise un SALT automatiquement
const db = require('./database.js');
const googleAuthBackend = require('./routes/auth/google-auth');
const choosePasswordBackend = require('./routes/auth/choose-password-backend');
const jwt = require('@fastify/jwt');
const { verify } = require('crypto');
const { read } = require('fs');


// backend/index.js
const fastify = Fastify({ logger: true})

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
	googleAuthBackend(fastify, hashPassword);

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

	// Authentification, middleware
	
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

	//routes/auth/choose-password-backend.js -> changer le mdp
	choosePasswordBackend(fastify, hashPassword);

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