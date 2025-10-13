const path = require('path');
const fs = require('fs'); //filesystem
const { prepare } = require('../database/database');
const { pipeline } = require('stream/promises'); //fonction pipeline NATIF NODEJS qui gere les flux et return une promise -> ca gere les flux et return des erreurs. Une promise c'est un objet javascript qui represente une valeur pas encore dispo mais qui le sera dans le futur (utiles pour les operations asynchrones) On a 3 etapes : pending(en cours), fullfield(valide), rejected

async function avatar(fastify, options) { // fonction multi route a exporter
    // Afficher une image
    const db = fastify.db;
    fastify.get("/images/:filename", async (req, reply) => { // Route publique pour que le front puisse afficher les images

        const safeFilename = path.basename(req.params.filename); // Extrait le nom du fichier du path total pour eviter les chemins malveillants
        const filePath = path.join(__dirname, "..", "..", "data", "imgs", safeFilename);
        if (!fs.existsSync(filePath)) //on check que le file existe avant de l'envoyer en memoire
            return (reply.code(404).send({ error: "File not found" }));
        return (reply.type("image/jpg").send(fs.createReadStream(filePath)));
    });

    // Lister les images dans le fichier 'imgs'
    fastify.get("/images", async (req, reply) => {
        const dirPath = path.join(__dirname, "data", "imgs");
        const files = fs.readdirSync(dirPath);
        return { files };
    });

    // Upload un avatar
    fastify.post("/upload-avatar", async (req, reply) => {
        const data = await req.file();
        if (!data)
            return (reply.code(400).send({ error: "No file uploaded" }));
        const uploadDir = path.join(__dirname, "data", "imgs", "imported");
        if (!fstat.existSync(uploadDir))
            fs.mkdir(uploadDir, { recursive: true });
        const ext = path.extname(data.filename) || ".jpg";
        const filename = `${Date.now()}${ext}`;
        const filePath = path.join(uploadDir, filename);
        await fs.promises.writeFile(filePath, await data.toBuffer());

        // Stocker la reference de l'upload
        db.prepare("UPDATE users SET avatar = ? WHERE id = ?").run(filename, req.user.id);
        return { success: true, filename };
    });

    // Mettre un avatar par defaut

    fastify.put("/setDefaultAvatar", {
        preHandler: [fastify.authenticate],
        schema: {
            body: {
                type: 'object',
                required: ['avatar'],
                properties: {
                    avatar: { type: 'string', minLength: 4 }
                }
            },
            response: {
                200: {
                    type: 'object',
                properties: { success: { type: 'boolean' } }
                },
                400: {  //Erreur auto fastify
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
        const { avatar } = request.body;
        console.log('setDefaultAvatar: Body recu: ', request.body);
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
        if (!user)
            return (reply.status(401).send({ error: 'User not found' }));
        try {
            const update = db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run(avatar, userId)
            return { success: true }
        } catch (err) {
            console.error(err);
            return (reply.status(400).send({ error: err.message }));
        }
    });

	fastify.post("/uploadAvatar", {
		preHandler: [fastify.authenticate],
		schema: {
            response: {
                200: {
                    type: 'object',
					properties: {
						success: { type: 'boolean' },
						avatarUrl: { type: 'string' }
					}
                },
                400: {  //Erreur auto fastify
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

		// Recuperation du fichier envoye
		const data = await request.file({limits: {fileSize: 5 * 1024 *1024}}); //limite les images a 5 Mo
		if (!data)
			return (reply.status(400).send({ error: "No file uploaded or file too large (5Mo max)" }));

		const allowedMimes = ["image/jpeg", "image/png", "image/jpg"]; //Verif du type du fichier (application/pdf est un exemple ou /image/png)
		if (!allowedMimes.includes(data.mimetype))
			return (reply.status(400).send({ error: "Invalid file type (image/jpg, image/png, image/jpeg only)" }));

		const allowedExt = [".jpeg", ".png", ".jpg"]; //Verif de l'extension du fichier
		const extension = path.extname(data.filename).toLowerCase();
		if (!allowedExt.includes(extension))
			return (reply.status(400).send({ error: "Invalid file extension (only .png .jpg .jpeg) "}));

		// On renomme le fichier au nom de l'user pour eviter les doublons
		const newFilename = `avatar_${userId}${extension}`; //l'image sera maintenant avatar_idUser.extension -> avatar_1.png / avatar_1.jpg
		// Securiser le path du nouveau fichier
		const filePath = path.join(__dirname, "..", "..", "data", "imgs", newFilename); //chemin cible
		const safePath = path.resolve(filePath); //normer le chemin -> par exemple /app/routes/user_management/../../../etc/password devient /etc/password
		const baseDir = path.resolve(path.join(__dirname, "..", "..", "data", "imgs")); //-> /app/routes/user_management/../../data/imgs devient /app/data/imgs
		if (!safePath.startsWith(baseDir)) //On check que le fichier est bien dans le bon dossier
			return (reply.status(400).send({ error: "Invalid file path" }));
		
		await pipeline(data.file, fs.createWriteStream(filePath, { mode: 0o644 })); //creer un fichier (non executable) et redirige le flux data.file dans ce dernier (pump copie, createWriteStream creer le fichier)
		await fs.promises.chmod(filePath, 0o644); //forcer chmod pour Owner ReadWrite ; Group Read ; Other Read
		const db = fastify.db;
		db.prepare("UPDATE users SET avatar = ? WHERE id = ?").run(newFilename, userId);
		return { success: true, avatar: newFilename };
	});
}

module.exports = avatar;