const Fastify = require('fastify');
const cors = require ('@fastify/cors');
const db = require('./database.js')

// backend/index.js
const fastify = Fastify({ logger: true})

async function start(){
 
    fastify.register(cors, {
        origin: '*', //dev only (faut pas faire ca)
    });
    
    // def une route pour GET
    fastify.get('/', async (request, reply) => {
        return {message: 'Hello World from Fastify!'}
    })
    
    fastify.get('/ping', async (request, reply) => {
        return { pong: 'ok' }
    })
    

    fastify.post('/users', async (request, reply) => {
    const { name, email } = request.body;
    try {
        const stmt = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)');
        const info = stmt.run(name, email);
        return { success: true, id: info.lastInsertRowid };
    } catch (err) {
        return reply.status(400).send({ error: err.message });
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