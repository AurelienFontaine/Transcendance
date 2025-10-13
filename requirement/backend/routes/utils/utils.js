async function utils(fastify, options) {
	fastify.get('/', async (request, reply) => {
		return {message: 'Backend is running!'}
	})
	
	fastify.get('/ping', async (request, reply) => {
		return {message: 'pong'}
	})

}

module.exports = utils;