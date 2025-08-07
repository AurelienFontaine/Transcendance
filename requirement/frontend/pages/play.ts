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

      <div class="flex flex-col gap-4 items-center">

        <div id="menu">
          <h2>Choisissez un mode de jeu</h2>
          <button id="localBtn">2 joueurs sur 1 PC</button>
          <button id="onlineBtn">2 joueurs en ligne</button>
        </div>
        <!-- Conteneur du jeu -->
        <div id="gamecontainer" style="display: none; width = 1000; height = 1000;">
          <div id="app">
            <button id="startBtn" style="display:none;  top: 100px; right: 180px; z-index: 10;">Start</button>
            <button id="pauseBtn" style="display:none;  top: 10px; left: 10px; z-index: 10;">Pause</button>
            <button id="restartBtn" style="display:none; top: 10px; right: 180px; z-index: 10;">Restart</button>
          </div>
          <button id="settingsBtn" style="display:none; top: 10px; right: 25px; z-index: 10;">Settings</button>
          <div id="settingsPanel" style="display:none; position:absolute; top:40px; right:10px; background:#153bbb; padding:0.5rem; width:220px; font-size:0.9rem; border-radius:8px; box-shadow: 0px 4px 10px rgba(0,0,0,0.3); color:white;">
            <label>Speed :
              <select id="speedSelect">
                <option value="slow">Slow</option>
                <option value="medium" selected>Medium</option>
                <option value="fast">FAAST</option>
              </select>
            </label>
            <br/>
            <label>Ball color :
              <input type="color" id="ballColor" value="#FFFFFF" />
            </label>
            <br/>
            <label>Paddles color :
              <input type="color" id="paddleColor" value="#FFFFFF" />
            </label>
            <br/>
            <button id="applySettings">Apply</button>
          </div>
        </div>
          <script type="module" src="../handlers/game-front.ts"></script>
      </div>
    </div>
  `;
}