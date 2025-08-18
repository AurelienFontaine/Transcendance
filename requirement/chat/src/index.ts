import Fastify from "fastify";

const PORT = Number(process.env.CHAT_PORT || 4000);
const HOST = "0.0.0.0";

async function main() {
	const app = Fastify({ logger: true });

	// Healthcheck minimal
	app.get("/health", async (_req, _rep) => {
		return { status: "ok" };
	});

	try {
		await app.listen({ host: HOST, port: PORT });
		app.log.info(`chat service listening on http://${HOST}:${PORT}`);
	} catch (err) {
		app.log.error(err);
		process.exit(1);
	}
}

main();
