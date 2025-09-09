const path = require('path');
const fs = require('fs'); //filesystem
const { prepare } = require('../database/database');

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
    fastify.post("/set-default-avatar", async (req, reply) => {
        const { avatar } = req.body;
        const allowed = ["Astro.jpg", "Croco.jpg"];

        if (!allowed.includes(avatar))
            return (reply.code(400).send({ error: "Invalid default avatar" }));
        db.prepare("UPDATE users SET avatar = ? WHERE id = ?").run(avatar, req.user.id);
        return { success: true, avatar };
    });

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
}

module.exports = avatar;