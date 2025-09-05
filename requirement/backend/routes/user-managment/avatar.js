const path = require('path');
const fs = require('fs'); //filesystem

async function avatar(fastify, options) { // fonction multi route a exporter
    // Afficher une image

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
}

module.exports = avatar;