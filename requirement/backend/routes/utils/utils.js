async function utils(fastify, options) {
	fastify.get('/', async (request, reply) => {
		return {message: 'Hello World from Fastify!'}
	})
	
	fastify.get('/ping', async (request, reply) => {
		return {message: 'pong'}
	})

}

module.exports = utils;