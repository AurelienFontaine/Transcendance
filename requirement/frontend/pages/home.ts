import { Page } from '../src/router';
import { t } from '../handlers/language';

export class HomePage implements Page {
	render(): string {
		return `
		<div class="min-h-screen bg-base-100">


			<!-- Hero Section -->
			<section class="bg-primary text-base-content py-20 px-4">
				<div class="max-w-4xl mx-auto text-center">
					<h1 class="text-6xl md:text-7xl font-extrabold mb-6">
						<span class="text-4xl md:text-5xl block">${t('home.hero.welcome')}</span>
						<span class="text-accent">${t('home.hero.pongGame')}</span>
					</h1>
					<p class="text-xl md:text-2xl mb-8 text-black max-w-3xl mx-auto">
						${t('home.hero.description')}
					</p>
				</div>
			</section>

			<!-- How It's Built Section -->
			<section class="py-20 px-4 bg-base-200">
				<div class="max-w-7xl mx-auto">
					<div class="text-center mb-16">
						<h2 class="text-2xl font-bold text-primary mb-4">${t('home.howBuilt.title')}</h2>
						<h3 class="text-4xl font-bold text-base-content">${t('home.howBuilt.subtitle')}</h3>
					</div>

					<div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
						<!-- Server with Docker -->
						<div class="bg-base-100 rounded-lg shadow-lg p-6">
							<h4 class="text-xl font-bold text-base-content mb-4">${t('home.howBuilt.serverDocker.title')}</h4>
							<p class="text-base-content mb-6">
								${t('home.howBuilt.serverDocker.description')}
							</p>
							<div class="bg-base-300 rounded-lg p-4 text-sm h-80 flex flex-col">
								<div class="flex space-x-2 mb-3">
									<button class="px-3 py-1 bg-base-content/20 rounded text-base-content text-xs">Dockerfile</button>
									<button class="px-3 py-1 bg-primary rounded text-base-content text-xs">docker-compose.yml</button>
								</div>
								<pre class="text-success text-xs overflow-x-auto flex-1 text-left"><code>version: '3.8'
services:
  api:
    container_name: api_server
    image: pong-api:latest
    build:
      context: ./server
      dockerfile: Dockerfile
    ports:
      - "4000:4000"
    environment:
      - NODE_ENV=production
      - API_KEY=\${API_SECRET}
  web:
    container_name: web_client
    image: pong-web:latest
    build: ./client
    ports:
      - "443:443"
    depends_on:
      - api</code></pre>
							</div>
						</div>

						<!-- WebSocket Real-time -->
						<div class="bg-base-100 rounded-lg shadow-lg p-6">
							<h4 class="text-xl font-bold text-base-content mb-4">${t('home.howBuilt.websocket.title')}</h4>
							<p class="text-base-content mb-6">
								${t('home.howBuilt.websocket.description')}
							</p>
							<div class="bg-base-300 rounded-lg p-4 text-sm h-80 flex flex-col">
								<div class="flex space-x-2 mb-3">
									<button class="px-3 py-1 bg-base-content/20 rounded text-base-content text-xs">server.ts</button>
									<button class="px-3 py-1 bg-primary rounded text-base-content text-xs">client.ts</button>
								</div>
								<pre class="text-success text-xs overflow-x-auto flex-1 text-left"><code>const server = new WebSocketServer({ port: 8080 });

server.on('connection', (socket) => {
  console.log('New player connected');
  
  socket.on('message', (msg) => {
    const data = JSON.parse(msg);
    if (data.action === 'update') {
      broadcastToAll({
        type: 'state',
        playerId: data.id,
        coords: data.coords
      });
    }
  });
  
  socket.on('disconnect', () => {
    handlePlayerLeave(socket);
  });
});</code></pre>
							</div>
						</div>

						<!-- Database Management -->
						<div class="bg-base-100 rounded-lg shadow-lg p-6">
							<h4 class="text-xl font-bold text-base-content mb-4">${t('home.howBuilt.database.title')}</h4>
							<p class="text-base-content mb-6">
								${t('home.howBuilt.database.description')}
							</p>
							<div class="bg-base-300 rounded-lg p-4 text-sm h-80 flex flex-col">
								<div class="flex space-x-2 mb-3">
									<button class="px-3 py-1 bg-base-content/20 rounded text-base-content text-xs">database.js</button>
									<button class="px-3 py-1 bg-primary rounded text-base-content text-xs">schema.sql</button>
								</div>
								<pre class="text-success text-xs overflow-x-auto flex-1 text-left"><code>const sqlite3 = require('better-sqlite3');
const database = new sqlite3('pong.db');

database.exec(\\\`
  CREATE TABLE IF NOT EXISTS players (
    player_id INTEGER PRIMARY KEY AUTOINCREMENT,
    nickname TEXT NOT NULL UNIQUE,
    hashed_pwd TEXT NOT NULL,
    email_address TEXT UNIQUE,
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS matches (
    match_id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_one INTEGER,
    player_two INTEGER,
    final_score TEXT,
    match_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(player_one) REFERENCES players(player_id),
    FOREIGN KEY(player_two) REFERENCES players(player_id)
  );
\\\`);

database.pragma('journal_mode = WAL');</code></pre>
							</div>
						</div>

						<!-- Game Development -->
						<div class="bg-base-100 rounded-lg shadow-lg p-6">
							<h4 class="text-xl font-bold text-base-content mb-4">${t('home.howBuilt.gameDev.title')}</h4>
							<p class="text-base-content mb-6">
								${t('home.howBuilt.gameDev.description')}
							</p>
							<div class="bg-base-300 rounded-lg p-4 text-sm h-80 flex flex-col">
								<div class="flex space-x-2 mb-3">
									<button class="px-3 py-1 bg-base-content/20 rounded text-base-content text-xs">game.ts</button>
									<button class="px-3 py-1 bg-primary rounded text-base-content text-xs">physics.ts</button>
								</div>
								<pre class="text-success text-xs overflow-x-auto flex-1 text-left"><code>class GameEngine {
  tick() {
    this.sphere.posX += this.sphere.velX;
    this.sphere.posY += this.sphere.velY;
    
    if (this.sphere.posY <= 0 || 
        this.sphere.posY >= this.canvas.height) {
      this.sphere.velY = -this.sphere.velY;
    }
    
    this.detectHit();
    this.calculatePoints();
  }
  
  detectHit() {
    // Collision detection with paddles
  }
}</code></pre>
							</div>
						</div>

						<!-- Tailwind CSS Only -->
						<div class="bg-base-100 rounded-lg shadow-lg p-6">
							<h4 class="text-xl font-bold text-base-content mb-4">${t('home.howBuilt.tailwind.title')}</h4>
							<p class="text-base-content mb-6">
								${t('home.howBuilt.tailwind.description')}
							</p>
							<div class="bg-base-300 rounded-lg p-4 text-sm h-80 flex flex-col">
								<div class="flex space-x-2 mb-3">
									<button class="px-3 py-1 bg-base-content/20 rounded text-base-content text-xs">tailwind.config.js</button>
									<button class="px-3 py-1 bg-primary rounded text-base-content text-xs">index.html</button>
								</div>
								<pre class="text-success text-xs overflow-x-auto flex-1 text-left"><code>&lt;section class="hero bg-gradient-to-br from-blue-600 to-purple-700"&gt;
  &lt;div class="hero-content text-center text-white"&gt;
    &lt;div class="max-w-md"&gt;
      &lt;h1 class="text-5xl font-bold mb-4"&gt;
        Classic Arcade Game
      &lt;/h1&gt;
      &lt;p class="py-6"&gt;
        Experience retro gaming with modern technology
      &lt;/p&gt;
      &lt;div class="flex gap-4 justify-center"&gt;
        &lt;button class="btn btn-primary"&gt;Start Game&lt;/button&gt;
        &lt;button class="btn btn-ghost"&gt;View Scores&lt;/button&gt;
      &lt;/div&gt;
    &lt;/div&gt;
  &lt;/div&gt;
&lt;/section&gt;</code></pre>
							</div>
						</div>

						<!-- Security & 2FA -->
						<div class="bg-base-100 rounded-lg shadow-lg p-6">
							<h4 class="text-xl font-bold text-base-content mb-4">${t('home.howBuilt.security.title')}</h4>
							<p class="text-base-content mb-6">
								${t('home.howBuilt.security.description')}
							</p>
							<div class="bg-base-300 rounded-lg p-4 text-sm h-80 flex flex-col">
								<div class="flex space-x-2 mb-3">
									<button class="px-3 py-1 bg-base-content/20 rounded text-base-content text-xs">auth.js</button>
									<button class="px-3 py-1 bg-primary rounded text-base-content text-xs">2fa.js</button>
								</div>
								<pre class="text-success text-xs overflow-x-auto flex-1 text-left"><code>const authenticator = require('speakeasy');
const qr = require('qrcode');

const secretKey = authenticator.generateSecret({
  name: 'GameApp',
  issuer: 'ArcadePortal'
});

const qrImage = await qr.toDataURL(secretKey.otpauth_url);

const isValid = authenticator.totp.verify({
  secret: secretKey.base32,
  encoding: 'base32',
  token: inputCode,
  window: 2
});</code></pre>
							</div>
						</div>
					</div>
				</div>
			</section>

			<!-- Our Team Section -->
			<section class="py-20 px-4 bg-primary text-base-content">
				<div class="max-w-7xl mx-auto">
					<div class="grid md:grid-cols-2 gap-12 items-center">
						<div>
							<h2 class="text-5xl font-bold mb-6">${t('home.team.title')}</h2>
							<p class="text-xl text-base-content mb-8">
								${t('home.team.description')}
							</p>
						</div>
						<div class="grid grid-cols-2 gap-6">
							<div class="text-center">
								<h3 class="text-accent text-lg font-semibold mb-2">
									<a href="https://github.com/Kwro91" target="_blank" class="hover:text-accent transition-colors">besalort</a>
								</h3>
								<p class="text-base-content">${t('home.team.roles.backDev')}</p>
							</div>
							<div class="text-center">
								<h3 class="text-accent text-lg font-semibold mb-2">
									<a href="https://github.com/AurelienFontaine" target="_blank" class="hover:text-accent transition-colors">afontain</a>
								</h3>
								<p class="text-base-content">${t('home.team.roles.gameDev')}</p>
							</div>
							<div class="text-center">
								<h3 class="text-accent text-lg font-semibold mb-2">
									<a href="https://github.com/BuyuC" target="_blank" class="hover:text-accent transition-colors">cbuyurha</a>
								</h3>
								<p class="text-base-content">${t('home.team.roles.security')}</p>
							</div>
							<div class="text-center">
								<h3 class="text-accent text-lg font-semibold mb-2">
									<a href="https://github.com/popyplane" target="_blank" class="hover:text-accent transition-colors">bvieilhe</a>
								</h3>
								<p class="text-base-content">${t('home.team.roles.uiDesign')}</p>
							</div>
						</div>
					</div>
				</div>
			</section>

			<!-- Technologies Section -->
			<section class="py-20 px-4 bg-gray-50">
				<div class="max-w-7xl mx-auto">
					<h2 class="text-4xl font-bold text-base-content mb-12 text-center">${t('home.technologies.title')}</h2>

					<!-- Frontend and Backend Accordions -->
					<div class="flex flex-col lg:flex-row gap-6">
						<!-- Frontend Accordion -->
				<div class="collapse collapse-arrow border border-base-300 bg-base-200 rounded-lg flex-1">
					<input id="frontend" type="checkbox" class="peer" />
					<div class="collapse-title text-xl font-bold text-center">
								${t('home.technologies.frontend')}
							</div>
							<div class="collapse-content mt-2">
								<div class="space-y-2">
									<p><span class="font-semibold">${t('home.technologies.language')}</span> Typescript, HTML, CSS</p>
									<p><span class="font-semibold">${t('home.technologies.framework')}</span> <a href="https://tailwindcss.com/" target="_blank" class="link link-primary">Tailwind CSS</a></p>
									<p><span class="font-semibold">${t('home.technologies.server')}</span> <a href="https://nginx.org/" target="_blank" class="link link-primary">Nginx</a></p>
					</div>

							<h3 class="text-lg font-semibold mt-4 mb-2">${t('home.technologies.libraries')}</h3>
							<ul class="divide-y divide-base-300">
								<li class="py-1 flex justify-between"><span>${t('home.technologies.lib.apiRequests')}</span> <a href="https://axios-http.com/docs/intro" target="_blank" class="link link-secondary">Axios</a></li>
								<li class="py-1 flex justify-between"><span>${t('home.technologies.lib.socket')}</span> <a href="https://github.com/websockets/ws" target="_blank" class="link link-secondary">ws</a></li>
								<li class="py-1 flex justify-between"><span>${t('home.technologies.lib.dynamicDrawing')}</span> <a href="https://p5js.org/reference/" target="_blank" class="link link-secondary">P5.js</a></li>
								<li class="py-1 flex justify-between"><span>${t('home.technologies.lib.browserCompatibility')}</span> <a href="https://postcss.org/" target="_blank" class="link link-secondary">autoprefixer</a></li>
								<li class="py-1 flex justify-between"><span>${t('home.technologies.lib.secureConnection')}</span> <a href="https://nodejs.org/api/https.html" target="_blank" class="link link-secondary">https</a></li>
								<li class="py-1 flex justify-between"><span>${t('home.technologies.lib.readFiles')}</span> <a href="https://stackoverflow.com/questions/43048113/use-fs-in-typescript" target="_blank" class="link link-secondary">fs</a></li>
								<li class="py-1 flex justify-between"><span>${t('home.technologies.lib.dateManagement')}</span> <a href="https://date-fns.org/docs/Getting-Started" target="_blank" class="link link-secondary">date-fns</a></li>
								<li class="py-1 flex justify-between"><span>${t('home.technologies.lib.dataVisualization')}</span> <a href="https://www.chartjs.org/" target="_blank" class="link link-secondary">Chart.js</a></li>
								<li class="py-1 flex justify-between"><span>${t('home.technologies.lib.themeComponents')}</span> <a href="https://daisyui.com/" target="_blank" class="link link-secondary">DaisyUI</a></li>
						</ul>
					</div>
				</div>

				<!-- Backend Accordion -->
				<div class="collapse collapse-arrow border border-base-300 bg-base-200 rounded-lg flex-1">
					<input id="backend" type="checkbox" class="peer" />
					<div class="collapse-title text-xl font-bold text-center">
						${t('home.technologies.backend')}
					</div>
					<div class="collapse-content mt-2">
						<div class="space-y-2">
							<p><span class="font-semibold">${t('home.technologies.language')}</span> <a href="https://nodejs.org/en" target="_blank" class="link link-primary">NodeJS</a></p>
							<p><span class="font-semibold">${t('home.technologies.framework')}</span> <a href="https://fastify.dev/" target="_blank" class="link link-primary">Fastify</a></p>
						</div>

					<h3 class="text-lg font-semibold mt-4 mb-2">${t('home.technologies.libraries')}</h3>
						<ul class="divide-y divide-base-300">
						<li class="py-1 flex justify-between"><span>${t('home.technologies.lib.database')}</span> <a href="https://www.w3resource.com/sqlite/snippets/better-sqlite3-library.php" target="_blank" class="link link-secondary">better-sqlite3</a></li>
						<li class="py-1 flex justify-between"><span>${t('home.technologies.lib.requestsCORS')}</span> <a href="https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS" target="_blank" class="link link-secondary">cors</a></li>
						<li class="py-1 flex justify-between"><span>${t('home.technologies.lib.fileReading')}</span> <a href="https://nodejs.org/api/fs.html" target="_blank" class="link link-secondary">fs</a></li>
						<li class="py-1 flex justify-between"><span>${t('home.technologies.lib.pathManagement')}</span> <a href="https://nodejs.org/api/path.html" target="_blank" class="link link-secondary">path</a></li>
						<li class="py-1 flex justify-between"><span>${t('home.technologies.lib.fileUpload')}</span> <a href="https://axios-http.com/docs/multipart" target="_blank" class="link link-secondary">multipart</a></li>
						<li class="py-1 flex justify-between"><span>${t('home.technologies.lib.randomPasswordGeneration')}</span> <a href="https://nodejs.org/api/crypto.html" target="_blank" class="link link-secondary">crypto</a></li>
						<li class="py-1 flex justify-between"><span>${t('home.technologies.lib.passwordHashing')}</span> <a href="https://www.geeksforgeeks.org/node-js/npm-bcrypt/" target="_blank" class="link link-secondary">bcrypt</a></li>
						<li class="py-1 flex justify-between"><span>${t('home.technologies.lib.dataFlow')}</span> <a href="https://nodejs.org/api/stream.html" target="_blank" class="link link-secondary">stream/promises</a></li>
						<li class="py-1 flex justify-between"><span>${t('home.technologies.lib.jsonRequests')}</span> <a href="https://axios-http.com/docs/intro" target="_blank" class="link link-secondary">axios</a></li>
						<li class="py-1 flex justify-between"><span>${t('home.technologies.lib.sockets')}</span> <a href="https://www.w3schools.com/nodejs/nodejs_websockets.asp" target="_blank" class="link link-secondary">ws</a></li>
						<li class="py-1 flex justify-between"><span>${t('home.technologies.lib.qrCodeGeneration')}</span> <a href="https://www.npmjs.com/package/qrcode" target="_blank" class="link link-secondary">qrcode</a></li>
						<li class="py-1 flex justify-between"><span>${t('home.technologies.lib.codes2FA')}</span> <a href="https://dev.to/candie_code/set-up-2fa-in-nodejs-with-speakeasy-3389" target="_blank" class="link link-secondary">speakeasy</a></li>
						</ul>
					</div>
				</div>
					</div>
						</div>
			</section>

			<!-- Footer -->
			<footer class="bg-primary text-base-content py-8 px-4">
				<div class="max-w-4xl mx-auto text-center">
					<p class="text-sm text-base-content">${t('home.footer.copyright')}</p>
				</div>
			</footer>
		</div>
		`;
	}

	mount(): void {}

	unmount(): void {}
}
