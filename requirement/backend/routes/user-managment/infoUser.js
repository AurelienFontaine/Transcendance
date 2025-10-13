async function infoUser(fastify, options) {

    const db = fastify.db;

    // Recuperer les infos user
    fastify.get('/me', {
        preHandler: [fastify.authenticate]
        }, async (request, reply) => {
            const userId = request.user.id;
    
            const user = db.prepare('SELECT id, name, username, email, avatar, win, game, twofa_enabled, language, text_size, color_ball, color_paddle, ball_speed, theme FROM users WHERE id = ?').get(userId);
            
            if (!user) {
                return reply.status(401).send({error: 'Utilisateur supprime ou inexistant.'});
            }
            return { user: request.user, userSQL : user }; //user = JWT donc uniquement les infos que contiennent le JWT alors que userSQL = tout ce que contient vraiment l'user dans la BDD
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
                
                const user = db.prepare('SELECT name FROM users WHERE id = ?').get(userId);
                const newToken = fastify.jwt.sign({ id: userId, name: user.name, username });
                // const newToken = fastify.jwt.sign({id: userId, username: username });
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

    // Update la size du texte d'un user -> 0=ss 1=s 2=m 3=l 4=xl
    fastify.put('/me/text_size', {
        preHandler: [fastify.authenticate],
        schema: {
            body: {
                type: 'object',
                required: ['text_size'],
                properties: {
                    text_size: { type: 'number', minimum: 0, maximum: 4 }
                }
            },
            response: {
                200: { //OK
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        text_size: { type: 'number' },
                    }
                },
                400: { //Erreur auto
                    type: 'object',
                    properties: { error: { type: 'string' } }
                },
                401: { //Erreur manuelle ou BDD
                    type: 'object',
                    properties: { error: { type: 'string' } }
                }
            }
        }
    }, async (request,reply) => {
        try {
            const userId = request.user.id;
            const { text_size } = request.body;

            const result = fastify.db.prepare('UPDATE users SET text_size = ? WHERE id = ?').run(text_size, userId);
            if (result.changes === 0)
                return (reply.status(404).send({ error: 'User not found' }));
            return (reply.send({ success: true, text_size }));
        } catch (err) {
            console.error(err);
            return (reply.status(500).send({ error: 'Error server while updating text size' }));
        }
    });


    // Update la langue d'un user
    fastify.put('/me/language', {
        preHandler: [fastify.authenticate],
        schema: {
            body: {
                type: 'object',
                required: ['language'],
                properties: {
                    language: { type: 'string', minLength: 2, enum: ['en', 'fr', 'es'] }
                }
            },
            response: {
                200: { //OK
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        language: { type: 'string' },
                    }
                },
                400: { //Erreur auto
                    type: 'object',
                    properties: { error: { type: 'string' } }
                },
                401: { //Erreur manuelle ou BDD
                    type: 'object',
                    properties: { error: { type: 'string' } }
                }
            }
        }
    }, async (request,reply) => {
        try {
            const userId = request.user.id;
            const { language } = request.body;

            const result = fastify.db.prepare('UPDATE users SET language = ? WHERE id = ?').run(language, userId);
            if (result.changes === 0)
                return (reply.status(404).send({ error: 'User not found' }));
            return (reply.send({ success: true, language }));
        } catch (err) {
            console.error(err);
            return (reply.status(500).send({ error: 'Error server while updating language' }));
        }
    });


    fastify.put('/me/theme', {
        preHandler: [fastify.authenticate],
        schema: {
            body: {
                type: 'object',
                required: ['theme'],
                properties: {
                    theme: { type: 'string', enum: ['light', 'dark', 'cupcake', 'default', 'contrast'] }
                }
            },
            response: {
                200: { //OK
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        theme: { type: 'string' },
                    }
                },
                400: { //Erreur auto
                    type: 'object',
                    properties: { error: { type: 'string' } }
                },
                401: { //Erreur manuelle ou BDD
                    type: 'object',
                    properties: { error: { type: 'string' } }
                }
            }
        }
    }, async (request,reply) => {
        try {
            const userId = request.user.id;
            const { theme } = request.body;
            const normalizedTheme = theme === 'default'
                ? 'light'
                : theme === 'contrast'
                    ? 'dark'
                    : theme;

            const result = fastify.db.prepare('UPDATE users SET theme = ? WHERE id = ?').run(normalizedTheme, userId);
            if (result.changes === 0)
                return (reply.status(404).send({ error: 'User not found' }));
            return (reply.send({ success: true, theme: normalizedTheme }));
        } catch (err) {
            console.error(err);
            return (reply.status(500).send({ error: 'Error server while updating theme' }));
        }
    });

    fastify.put('/me/color_ball', {
        preHandler: [fastify.authenticate],
        schema: {
            body: {
                type: 'object',
                required: ['color_ball'],
                properties: {
                    color_ball: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$'} //accepte que les format court d'hexadecimal
                }
            },
            response: {
                200: { //OK
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        color_ball: { type: 'string' },
                    }
                },
                400: { //Erreur auto
                    type: 'object',
                    properties: { error: { type: 'string' } }
                },
                401: { //Erreur manuelle ou BDD
                    type: 'object',
                    properties: { error: { type: 'string' } }
                }
            }
        }
    }, async (request,reply) => {
        try {
            const userId = request.user.id;
            const { color_ball } = request.body;

            const result = fastify.db.prepare('UPDATE users SET color_ball = ? WHERE id = ?').run(color_ball, userId);
            if (result.changes === 0)
                return (reply.status(404).send({ error: 'User not found' }));
            return (reply.send({ success: true, color_ball }));
        } catch (err) {
            console.error(err);
            return (reply.status(500).send({ error: 'Error server while updating color_ball' }));
        }
    });


    fastify.put('/me/color_paddle', {
        preHandler: [fastify.authenticate],
        schema: {
            body: {
                type: 'object',
                required: ['color_paddle'],
                properties: {
                    color_paddle: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$'} //accepte que les format court d'hexadecimal
                }
            },
            response: {
                200: { //OK
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        color_paddle: { type: 'string' },
                    }
                },
                400: { //Erreur auto
                    type: 'object',
                    properties: { error: { type: 'string' } }
                },
                401: { //Erreur manuelle ou BDD
                    type: 'object',
                    properties: { error: { type: 'string' } }
                }
            }
        }
    }, async (request,reply) => {
        try {
            const userId = request.user.id;
            const { color_paddle } = request.body;

            const result = fastify.db.prepare('UPDATE users SET color_paddle = ? WHERE id = ?').run(color_paddle, userId);
            if (result.changes === 0)
                return (reply.status(404).send({ error: 'User not found' }));
            return (reply.send({ success: true, color_paddle }));
        } catch (err) {
            console.error(err);
            return (reply.status(500).send({ error: 'Error server while updating color_paddle' }));
        }
    });


    fastify.put('/me/ball_speed', {
        preHandler: [fastify.authenticate],
        schema: {
            body: {
                type: 'object',
                required: ['ball_speed'],
                properties: {
                    ball_speed: { type: 'number', minimum: 3, maximum: 10 }
                }
            },
            response: {
                200: { //OK
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        ball_speed: { type: 'number' },
                    }
                },
                400: { //Erreur auto
                    type: 'object',
                    properties: { error: { type: 'string' } }
                },
                401: { //Erreur manuelle ou BDD
                    type: 'object',
                    properties: { error: { type: 'string' } }
                }
            }
        }
    }, async (request,reply) => {
        try {
            const userId = request.user.id;
            const { ball_speed } = request.body;

            const result = fastify.db.prepare('UPDATE users SET ball_speed = ? WHERE id = ?').run(ball_speed, userId);
            if (result.changes === 0)
                return (reply.status(404).send({ error: 'User not found' }));
            return (reply.send({ success: true, ball_speed }));
        } catch (err) {
            console.error(err);
            return (reply.status(500).send({ error: 'Error server while updating ball speed' }));
        }
    });
}

module.exports = infoUser;
