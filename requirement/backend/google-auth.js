//fichier concernant l'authentification OAuth2 avec google
const axios = require('axios');
const db = require('./database.js');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;


//fct ajoute les routes necessaires a l'auth google, prend 2 arg:
// - l'instance du serveur backend "fastify" pour declarer les routes
// - hashPassword: fct de hashage de mdp
function registerGoogleAuthRoutes(fastify, hashPassword) {

	// Redirection vers la page Google, declare la route /auth/google, ne renvoie pas de contenu html, redirige directement vers google
	fastify.get('/auth/google', async (request, reply) => {
		//
		const params = new URLSearchParams({ //API javascript construit des chaines de requetes url qutomqtiaue, encode tous les param en format url valide
			client_id: GOOGLE_CLIENT_ID, //identifiant unique de l'app
			redirect_uri: REDIRECT_URI, // url de redirection apres validation
			response_type: 'code', // demande d'un code d'autorisation (standard OAuth2)
			scope: 'profile email', // ce que l'on demande a google (profile et email)
			access_type: 'offline', // pour obtenir un "refresh token" (jeton plus durable une session peut durer plusieurs jours, meme si l'user est offline, le "access token" ne dure qu'1h, un peu overpowered ici vu que le site n'a pas pour objectif une longue connexion mais interessant a mettre en place)
			prompt: 'consent' // force a montrer l'ecrans de choix a chaque fois, renvois un refresh token si necessaire mais verifie que l'utilisateur consent toujours a la connexion
		}); //evite de concatener a la main

		//redireige vers la page de co google avec lq chaine de charactere params encodee par urlsearchparams
		reply.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
		//cette ligne genere une url complete sur le serveru d'auth de google et y ajoute les param encode.
		//on quitte ici notre site pour aller sur google
	});

	// get recoit le code envoye par google a echanger contre un access token, ce code n'est valide que quelque minutes et utilisable qu'une fois
	fastify.get('/auth/google/callback', async (request, reply) => {
		//si l'user ne veux plus utiliser l'authentification google
		if (request.query.error) {
			console.warn("Connexion refusée par l'utilisateur");
			return reply.redirect('http://localhost:8080/profile?error=access_denied');
		}
		const code = request.query.code; //recuperation du code envoye dans l'url par google
		//si le code n'est pas la, renvoie d'une erreur
		if (!code) return reply.status(400).send({ error: 'Code non fourni par Google' });

		try {
			//requete http post vers l'endpoint(adresse url vers laquelle on envoie la requete, ici point d'entree de l'api google) de google
			const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
				code, //code envoye
				client_id: GOOGLE_CLIENT_ID, //identifiant dans .env
				client_secret: GOOGLE_CLIENT_SECRET, //identifiant secret dans .env
				redirect_uri: REDIRECT_URI, //url de redirection
				grant_type: 'authorization_code' //precision que c'est un echange de code contre un token
			}); //ici on envoit les infos necessaire a google ainsi que son code pour pouvoir avoir acces aux information du user demande dans registerGoogleAuthRoutes
			//tokenResponse contient la reponse de google avec le token permettant d'acceder aux donnees

			//on extrait l'access_token des donnees renvoyees par google, on utilise pas le refresh token parce qu'il ne sera pas renvoye a chaque connexion.
			//le refresh token sert a obtenir un nouvel access token sans repasser par l'etape d'autorisation
			const { access_token } = tokenResponse.data; // methode de destructuring

			//envoi une requete get a un autre endpoint contenant les infos du user
			const userInfoResponse = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
				headers: {
					Authorization: `Bearer ${access_token}` //montre le jeton d'acces a google pour prouver qu'on a le droit d'acceder
				}
			});

			//destructure la reponse de google, elle contient les infos demandees, le nom de l'user, son adresse, son identifiant unique (Google Subject ID)
			//sub=subject identifier = identifiant unique donnee par google au user dans l'app/site (unique, stable, lie a l'app/site, non modifiable, ne depend pas du nom ou de l'adresse)
			//souvent utilise comme cle de ref
			const { name, email, sub } = userInfoResponse.data; //destructuring

			//interroge la base SQLite, verifie si l'user existe deja, si user = undefined, il faut le creer
			let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
			let firstTime = false;
			if (!user) { //si mail non existant dans db, on l'ajoute
				//utilisation du sub pour creer un mdp hashed, vu que l'user n'en a pas choisi un
				const dummyPassword = await hashPassword(sub);

				//requete SQL pour injecter le nouv user avec les infos de google dans la tab users
				const insert = db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)')
					.run(name, email, dummyPassword);

				//initialisation variable javascript user avec les infos du nouv utilisateur (but?: recup l'id et le reutiliser pour signe un token JWT)
				user = {
					id: insert.lastInsertRowid, //id auto-incremente cree par SQLite a l'insertion
					name,
					email
				};
				firstTime = true;
			}

			//creation/signature d'un JWT, contient l'id et le name du user, permet de l'identifier plus tard
			//prouve que l'user est bien authentifie, necessaire a chaque connexion
			const token = fastify.jwt.sign({ id: user.id, name: user.name, firstTime });

			//redirection vers le front port 8080, ajout du token et du nom pour que le front end le stock dans local storage
			//localStorage (=wone de stockage locale dans le nav, appartient au site, persistante si on ferme l'onglet ou rafraichis, on y accede en javascript)
			reply.redirect(`http://localhost:8080/profile?token=${token}&name=${encodeURIComponent(user.name)}&firstTime=${firstTime}`);
			//a securiser !!! -> il vaut mieux stocker dans des cookies httpOnly pour eviter les attaques XSS
		
		} catch (err) { //interception d'erreurs
			console.error(err.response?.data || err); //recupere une propriete pour l'erreur si il y en a, ou met un err brute dans le cas contraire
			// retourne une erreur en cas de probleme lors de l'authentification
			return reply.status(500).send({ error: 'Erreur durant le login Google' });
		}
	});
}

//exporte la fonction registerGoogleAuthRoutes, pour qu'elle soit utilisable dans un autre fichier
//(ce dernier doit contenir : const registerGoogleAuthRoutes = require('./authGoogle');)
module.exports = registerGoogleAuthRoutes;


/*note:
- securiser le stockage des token ailleurs que dans local storage
- ajouter un champ mdp pour que l'user renseigne lui meme son mdp
(optionnel) - voir pour le faire avec 42Auth et pas google
*/