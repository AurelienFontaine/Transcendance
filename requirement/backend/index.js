const Fastify = require('fastify');

const fs = require('fs'); //file System -> lire/ecrire des fichiers
const path = require('path'); //gerer proprement les chemins de fichiers (path.join gere automatiquement les path en fonction des os)
const { encrypt, decrypt } = require('./routes/auth/two-fa-encryption-backend.js');


const fastify = Fastify({
    logger: true,
    https: {
        key: fs.readFileSync(path.join(__dirname, 'certs/key.pem')),
        cert: fs.readFileSync(path.join(__dirname, 'certs/cert.pem'))
    }
}); //Utiliser serveur fastify en logs automatique auquel on va ajouter des routes des plugins etc

// Importer les plugins
const multipart = require('@fastify/multipart'); //pouvoir upload des fichiers (images, pdf...)
fastify.register(multipart);

const jwt = require('@fastify/jwt'); //Gerer les tokens de connexion ( JSON WEB TOKEN )
fastify.register(jwt, {
    secret: process.env.JWT_KEY || "TranscendanceSuperSecretKey"
});

const cors = require ('@fastify/cors'); //autoriser la SPA a appeler l'API (back)
fastify.register(cors, { //autorise les requetes venant de l'origine (c'est un tableau on pourra ajouter des liens)
    // origin : ["http://localhost:8080"]
    origin: '*'
});

//websocket pas un plugin
const webSocket = require ('ws');

// Importer les librairies
const axios = require('axios'); //requetes http depuis le front

const bcrypt = require('bcrypt'); //hashage mdp

const crypto = require('crypto'); //generation caracteres aleatoire

// Importer nos objets
const db = require('./routes/database/database.js'); //db est un objet donc decorate()
fastify.decorate('db', db);

const {onlineUsers, socketUsers} = require('./routes/user-managment/online-users-backend.js')
fastify.decorate('onlineUsers', onlineUsers);
fastify.decorate('socketUsers', socketUsers);

//a retirer utlise pour le debugage http://localhost:3000/debug/maps
fastify.get('/debug/maps', async () => {
  return {
    onlineUsers: Array.from(fastify.onlineUsers.entries()),
    socketUsers: Array.from(fastify.socketUsers.entries()).map(([id, sockets]) => [id, sockets.size])
  };
});

// Importer nos plugins(fonctions multi routes) fichiers perso 
const auth = require ('./routes/auth/authentification.js'); //fonction multi route donc register
fastify.register(auth);

const infoUser = require('./routes/user-managment/infoUser.js');
fastify.register(infoUser);

const avatar = require('./routes/user-managment/avatar.js'); //fonction multi route donc register
fastify.register(avatar);

const game = require('./routes/game/game.js');
fastify.register(game);

const utils = require('./routes/utils/utils.js');
fastify.register(utils);

const { twoFASetup, verifyTwoFASetup } = require('./routes/auth/2fa-setup-backend.js');
fastify.register(twoFASetup);
fastify.register(verifyTwoFASetup);
const twoFARecovery = require('./routes/auth/2fa-recovery-backend.js');
fastify.register(twoFARecovery);
const twoFAStop = require('./routes/auth/2fa-stop-backend.js');
fastify.register(twoFAStop);
const checkTwoFa = require('./routes/auth/2fa-check-backend.js');
fastify.register(checkTwoFa);

// Import de fonction simple
const registerGoogleAuthRoutes = require('./routes/auth/google-auth.js');
registerGoogleAuthRoutes(fastify);

const friendsBackend = require('./routes/user-managment/friends-backend');

const onlineWebsocketBackend = require('./routes/user-managment/online-websocket-backend.js');
fastify.register(onlineWebsocketBackend);

async function start(){
    
    db.exec('PRAGMA foreign_keys = ON'); //activer la lecture des cles etrangeres (ce qui permet de lier les tables entre elles)
   
    // On enregistre la fonction dans fastify pour pouvoir la reutiliser partout
    fastify.decorate("hashPassword", async function (password) { 
        const saltRounds = 10;
		const hashed = await bcrypt.hash(password, saltRounds);
		return (hashed);
    });

	fastify.decorate('encrypt', encrypt);
	fastify.decorate('decrypt', decrypt);
	fastify.decorate('twoFATempSecrets', new Map());


    // Hook d'authentification cherchant a verifier si un user est veritablement connecte et que son token est valide. 
    fastify.decorate("authenticate", async function (request, reply) {
        try {
            request.user = await request.jwtVerify();
        } catch (err) {
            reply.send(err);
        }
    });

    friendsBackend(fastify);

    //Demarrer le serveur
    try {
        const address = await fastify.listen({ port: 3000, host: '0.0.0.0' });
        console.log(`Server running at ${address}`); // la bonne ecriture est avec les ``
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
}

start();


// Tuto fastify :
// .get = recuperer des donnees -> lecture
// .post = creer qlq chose -> ecriture
// .put = mettre a jour
// .delete = supprimer

// .register = ajouter des plugins ou routes groupees (ex de plugin : une connexion avec une BDD / une lib externe ou meme un groupe de routes)
// .decorate = ajouter des fonctions/objets customs au serveur pour pouvoir les utiliser ensuite (pour connecter SQLITE a fastity par ex)
// .listen pour ecouter certains ports
// .addhook = effectuer une action avant ou apres la requete (ex un hook qui log dans la console / checker un token... ou meme proteger une route uniquement pour les gens connecte)
// Schema JSON = validation des requetes (voir plus bas) qui permet a fastify une auto gestion d'erreur basique.
// reply = code HTTP + reponse (+ de controle que return -> ex : reply.code(200).send({msg: "pong"});) C'est utile pour envoyer des code HTTP correct (200(OK) - 291(CREATED) - 404(NOT FOUND) - 500(ERROR) ...)


//  Plugins utilise dans le projet et leur utilite :
// cors : Autoriser la SPA a appeler l'API (back) -> par defaut les navigateurs bloquent ca
// bcrypt : hacher les MDP (SECURITE) pour ne pas stocker les mdp en clair.
// crypto : generer des cles hashs ou tokens aleatoire (ici on l'utilise dans google auth pour generer des mdp aleatoires)
// jwt : (JSON Web Token) sert a signer un token pour l'user quand il se connecte afin de pouvoir le verifier a chaque requete. (L'user le stocke en local, c'est sa carte d'ID si on veut)
// multipart : Gerer l'upload de fichiers (images, pdf, etc)
// axios :  faire des requetes HTTP depuis le backend vers un autre service / API ()