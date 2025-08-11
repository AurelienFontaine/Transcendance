// routes/auth/choose-password-backend.js
const db = require('../../database.js');

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
	
	function choosePasswordBackend(fastify, hashPassword) {
		fastify.post('/choose-password', { //si on fait un post a cet url depuis le front, le backen recoit la requete et execute la logique definie ici
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

			//cryptage du mdp, await attend le retour de la fonction lente (asynchrone) pour aller a la ligne suivante. ne peut etre utilisee que dans une fct marquee "async"
			const newHash = await hashPassword(newPassword);

			// requete sql maj mdp
			db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, userId);

			//return un msg de confirmation
			return { success: true, message: 'Mot de passe mis à jour' };
		});
	}

module.exports = choosePasswordBackend;