// export function renderPlay() {
//   return `
//     <h1 class="text-3xl font-bold mb-4">Choose a Game Mode</h1>
//     <div class="flex flex-col gap-4 items-center">
//       <a href="/play/local" data-link class="w-40 text-center bg-green-500 px-4 py-2 rounded hover:bg-green-600">Local</a>
//       <a href="/play/online" data-link class="w-40 text-center bg-blue-500 px-4 py-2 rounded hover:bg-blue-600">Online</a>
//       <!-- <a href="/play/" data-link class="w-40 text-center bg-red-500 px-4 py-2 rounded hover:bg-red-600">Ranked Match</a>
//       -->
//     </div>
//   `;
// }

export function renderPlay() {
  return `
    <div class="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white">
      <h1 class="text-3xl font-bold mb-6">Choose a Game Mode</h1>

      <div class="flex flex-col gap-4 items-center">

        <div id="menu">
          <h2>Choisissez un mode de jeu</h2>
          <button id="localBtn">2 joueurs sur 1 PC</button>
          <button id="onlineBtn">2 joueurs en ligne</button>
        </div>
        <!-- Conteneur du jeu -->
        <div id="gamecontainer" style="display: none">
          <button id="pauseBtn" style="position: absolute; top: 10px; left: 10px; z-index: 10;">Pause</button>
          <button id="restartBtn" style="position: absolute; top: 10px; right: 180px; z-index: 10;">Rejouer</button>
        </div>
        <button id="settingsBtn" style="position: absolute; top: 10px; right: 25px; z-index: 10;">Paramètres du jeu</button>

        <div id="settingsPanel" style="display:none; position:absolute; top:40px; right:10px; background:#153bbb; padding:0.5rem; width:220px; font-size:0.9rem; border-radius:8px; box-shadow: 0px 4px 10px rgba(0,0,0,0.3); color:white;">
          <label>Vitesse :
            <select id="speedSelect">
              <option value="slow">Lent</option>
              <option value="medium" selected>Moyen</option>
              <option value="fast">Rapide</option>
            </select>
          </label>
          <br/>
          <label>Couleur balle :
            <input type="color" id="ballColor" value="#FFFFFF" />
          </label>
          <br/>
          <label>Couleur raquettes :
            <input type="color" id="paddleColor" value="#FFFFFF" />
          </label>
          <br/>
          <button id="applySettings">Appliquer</button>
        </div>
          <div id="app"></div>
          <script type="module" src="/src/main.ts"></script>

          <section id="pong">
            <iframe src="http://localhost:4000" width="800" height="600" style="border:none;"></iframe>
          </section>
      </div>
    </div>
  `;
}