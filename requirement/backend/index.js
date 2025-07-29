const Fastify = require('fastify');
const cors = require ('@fastify/cors');
const bcrypt = require('bcrypt'); //hashage de mdp robuste et bcp utilise + utilise un SALT automatiquement
const db = require('./database.js');
const { verify } = require('crypto');
const { read } = require('fs');

// backend/index.js
const fastify = Fastify({ logger: true})

db.exec('PRAGMA foreign_keys = ON');
async function start(){
    
    
    await fastify.register(require('@fastify/jwt'), {
        secret: 'secret tres secret'
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
    

    // Hashage PASSWORD

    const hashPassword = async (password) => {
        const saltRounds = 10;
        const hashed = await bcrypt.hash(password, saltRounds);
        return hashed;
    };

    // User creation

    fastify.post('/register', async (request, reply) => {
    const { name, email, password } = request.body;
    try {
        const password_hash = await hashPassword(password);
        const stmt = db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)');
        const info = stmt.run(name, email, password_hash);
        return { success: true, id: info.lastInsertRowid };
    } catch (err) {
        return reply.status(400).send({ error: err.message });
    }
    });

    // User login

    const checkPassword = async (password, hashPassword) => {
        return await bcrypt.compare(password, hashPassword);
    };

    fastify.post('/login', async (request, reply) => {
        const {name, password} = request.body;
        if (!name || !password) { return reply.status(400).send({ error: 'Nom et mot de passe requis' })}

        const user = db.prepare('SELECT * FROM users WHERE name = ?').get(name);

        if (!user) return reply.status(401).send({ error: 'Utilisateur non trouve'});

        const isValid = await checkPassword(password, user.password_hash);
        if (isValid) {
            const token = fastify.jwt.sign({ id: user.id, name: user.name});
            return { succes: true, message: 'Connexion reussie', token};
        } else {
            return reply.status(401).send({ error: 'Mot de passe incorrect'});
        }

        // Generer un token JWT pour l'authentification
    });

    // Authentification 
    
    fastify.decorate("authenticate", async function (request, reply) {
        try {
            request.user = await request.jwtVerify();
        } catch (err) {
            reply.send(err);
        }
    });
    
    fastify.get('/me', {
        preHandler: [fastify.authenticate]
    }, async (request, reply) => {
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