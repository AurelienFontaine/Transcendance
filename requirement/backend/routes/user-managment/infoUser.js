async function infoUser(fastify, options) {

    const db = fastify.db;

    // Recuperer les infos user
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

    // Changer l'username de l'user connecte
    fastify.put('/me/username', {
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

                const newToken = fastify.jwt.sign({id: userId, username: username });
                return { success: true, username, token: newToken };
            } catch (err) {
                return (reply.status(400).send({ error: err.message }));
            }
    });

    // Changer le mdp de l'user connecte
    fastify.put('/me/password', {
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
                
                const password_hash = await fastify.hashPassword(password);
                const stmt = db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(password_hash, userId);

                const newToken = fastify.jwt.sign({id: userId, username: username });
                return { success: true, username, token: newToken };
            } catch (err) {
                return (reply.status(400).send({ error: err.message }));
            }
    });

}

module.exports = infoUser;