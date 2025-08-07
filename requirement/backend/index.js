const Fastify = require('fastify');
const cors = require ('@fastify/cors');
const bcrypt = require('bcrypt'); //hashage de mdp robuste et bcp utilise + utilise un SALT automatiquement
const db = require('./database.js');
const registerGoogleAuthRoutes = require('./google-auth');
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

	/* changement de mdp */
	/*cree une route POST cote backend a l'adresse /choose-password pour permettre a un user co de choisir son mdp
	route = pt d'entree du serveur web = adresse + methode http
	exemple: 
	GET / = recup une page
	POST /register = envoie des infos pour l'inscription
	DELETE /user/12 = supp user
	route POST = route qui n'accepte que les requete http de type POST, donc des requetes qui envoient des donnees
	requete POST = contient l'URL (/choose-password), les headers (format des donnees, infos tech), le body (donnees)("newPassword: "abc")
	ex: le frontend fait:
	fetch("http://localhost:3000/choose-password", {
	method: "POST",
	headers: {
		"Content-Type": "application/json",
		"Authorization": "Bearer ton_token"
	},
	body: JSON.stringify({ newPassword: "abc123" })
	});
	le serveur recoit le message ici en faisant "fastify.post('/choose-password'..."
	*/
	//fastify = objet serveur; .post = creer une route POST (pour envoyer des donnees);/choose-password = chemin de l'url (=cette route repond aux requetes http Post envoyees a http://localhost:3000/choose-password)
	/*fastify.post('/choose-password', { //si on fait un post a cet url depuis le front, le backen recoit la requete et execute la logique definie ici
		//preHandler = middleware (= code exec av fontion principale)
		preHandler: [fastify.authenticate], //verifie avant que le code se lance que l'user est bien authentifie avec JWT
		schema: { //valide automatiquement les donnees env par le client
			body: { //la requete doit
				type: 'object', //etre un objt json
				required: ['newPassword'], //contenir une propriete newPassword
				properties: { //cette derniere doit etre une string contenant au moins 3 caracteres
					newPassword: { type: 'string', minLength: 3 }
				}
			}
		} // si non respecte, fastify envoie une erreur automatiquement (400 bad request)
	}, async (request, reply) => { //fct executee si requete passe l'authentification et la validation
		//request = infos requete env par client; reply = objet de renvoi reponse
		//async = mot clef, permet utilisation "await" (= gere fct asynchrones comme hashage ou requetes en BDD(= elles sont asynchrones parce qu'elles prennent du temps et javascript ne les execute pas immediatement. await va attendre que la promesse soit faire))
		const userId = request.user.id; //fct fastify.authenticate recup id user
		const { newPassword } = request.body; //destructuring = const newPassword = request.body.newPassword;

		//cmd better-sqlite3, permet d'executer une requete SQL en lecture
		//ici cherche user dqns db avec id donne par token
		const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId); //verifie aussi que l'user est dans la db
		if (!user) return reply.status(404).send({ error: 'Utilisateur introuvable' }); //renvoie une erreur si user inexistant

		const newHash = await hashPassword(newPassword); //cryptage du mdp, await attend le retour de la fonction lente (asynchrone) pour aller a la ligne suivante. ne peut etre utilisee que dans une fct marquee "async"

		db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, userId);// requete sql maj mdp

		return { success: true, message: 'Mot de passe mis à jour' }; //return un msg de confirmation
	});*/




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