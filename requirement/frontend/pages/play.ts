// export function renderPlay() {
//   return `
//     <div class="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white">

//       <div class="flex flex-col gap-4 items-center">

//         <div id="menu">
//           <h2>Choisissez un mode de jeu</h2>
//           <button id="localBtn">2 joueurs sur 1 PC</button>
//           <button id="onlineBtn">2 joueurs en ligne</button>
//         </div>
//         <!-- Conteneur du jeu -->
//         <div id="gamecontainer" style="display: none; width = 1000; height = 1000;">
//           <div id="app">
//             <button id="startBtn" style="display:none;  top: 100px; right: 180px; z-index: 10;">Start</button>
//             <button id="pauseBtn" style="display:none;  top: 10px; left: 10px; z-index: 10;">Pause</button>
//             <button id="restartBtn" style="display:none; top: 10px; right: 180px; z-index: 10;">Restart</button>
//             <button id="settingsBtn" style="display:none; top: 10px; right: 25px; z-index: 10;">Settings</button>
//           </div>
//             <div id="settingsPanel" style="display:none; position:absolute; top:40px; right:10px; background:#153bbb; padding:0.5rem; width:220px; font-size:0.9rem; border-radius:8px; box-shadow: 0px 4px 10px rgba(0,0,0,0.3); color:white;">
//             <label>Speed :
//               <select id="speedSelect">
//                 <option value="slow">Slow</option>
//                 <option value="medium" selected>Medium</option>
//                 <option value="fast">FAAST</option>
//               </select>
//             </label>
//             <br/>
//             <label>Ball color :
//               <input type="color" id="ballColor" value="#FFFFFF" />
//             </label>
//             <br/>
//             <label>Paddles color :
//               <input type="color" id="paddleColor" value="#FFFFFF" />
//             </label>
//             <br/>
//             <button id="applySettings">Apply</button>
//           </div>
//         </div>
//           <script type="module" src="../handlers/game-front.ts"></script>
//       </div>
//     </div>
//   `;
// }



// requirement/frontend/pages/play.ts
import { Tournament } from "../handlers/game/tournament";
import { __forceRender as forceGameRender } from "../handlers/game/game-front";

let tournament: Tournament | null = null;

export function renderPlay() {
  return `
    <div class="min-h-screen flex flex-col items-center justify-start bg-gray-900 text-white py-10">

      <!-- === Tournament panel === -->
      <section class="w-full max-w-3xl mb-10 p-4 rounded-lg bg-[#1f2937]">
        <h2 class="text-xl mb-3 font-semibold">Tournoi Round-Robin (local)</h2>

        <div id="registration" class="flex gap-2 items-center mb-3">
          <input id="aliasInput" placeholder="Entrer un alias joueur" class="text-black px-2 py-1 rounded"/>
          <button id="addPlayerBtn" class="bg-green-600 px-3 py-1 rounded">Ajouter joueur</button>
          <button id="startTournamentBtn" class="bg-blue-600 px-3 py-1 rounded">Lancer le tournoi</button>
          <button id="resetTournamentBtn" class="bg-gray-600 px-3 py-1 rounded">Réinitialiser</button>
        </div>

        <div id="playerList" class="mb-3 text-sm text-gray-300"></div>

        <div id="matchInfo" class="mb-3"></div>

        <!-- Saisie du score courant -->
        <div id="scoreEntry" class="hidden items-center gap-2 mb-3">
          <input id="scoreP1" type="number" min="0" value="0" class="w-16 text-black px-1 py-0.5 rounded"/>
          <span class="text-sm text-gray-300">–</span>
          <input id="scoreP2" type="number" min="0" value="0" class="w-16 text-black px-1 py-0.5 rounded"/>
          <button id="saveScoreBtn" class="bg-indigo-600 px-3 py-1 rounded">Enregistrer le score</button>
        </div>

        <div id="standings" class="mt-4"></div>
      </section>

      <!-- === Your existing Play UI === -->
      <section class="flex flex-col gap-4 items-center w-full max-w-3xl">
        <div id="menu">
          <h2>Choisissez un mode de jeu</h2>
          <button id="localBtn">2 joueurs sur 1 PC</button>
          <button id="onlineBtn">2 joueurs en ligne</button>
        </div>

        <!-- Conteneur du jeu -->
        <div id="gamecontainer" style="display: none; width: 1000px; height: 1000px;">
          <div id="app">
            <button id="startBtn"   style="display:none; top: 100px; right: 180px; z-index: 10;">Start</button>
            <button id="pauseBtn"   style="display:none; top: 10px;  left:  10px;  z-index: 10;">Pause</button>
            <button id="restartBtn" style="display:none; top: 10px;  right: 180px; z-index: 10;">Restart</button>
            <button id="settingsBtn"style="display:none; top: 10px;  right:  25px; z-index: 10;">Settings</button>
          </div>

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
      </section>
    </div>
  `;
}

/**
 * Appelé par main.ts après render() quand path === '/play'
 */
export function setupPlayPage() {
  // === DOM refs (Tournoi)
  const aliasInput   = document.getElementById("aliasInput") as HTMLInputElement;
  const addBtn       = document.getElementById("addPlayerBtn") as HTMLButtonElement;
  const startBtn     = document.getElementById("startTournamentBtn") as HTMLButtonElement;
  const resetBtn     = document.getElementById("resetTournamentBtn") as HTMLButtonElement;
  const playerList   = document.getElementById("playerList")!;
  const matchInfo    = document.getElementById("matchInfo")!;
  const scoreEntry   = document.getElementById("scoreEntry")!;
  const scoreP1Input = document.getElementById("scoreP1") as HTMLInputElement;
  const scoreP2Input = document.getElementById("scoreP2") as HTMLInputElement;
  const saveScoreBtn = document.getElementById("saveScoreBtn") as HTMLButtonElement;
  const standingsEl  = document.getElementById("standings")!;

  // === État
  const players: string[] = [];
  let currentMatch: { p1: string; p2: string } | null = null;

  // Helpers UI
  const refreshPlayers = () => {
    playerList.innerHTML = players.length
      ? `<strong>Joueurs inscrits:</strong> ${players.join(", ")}`
      : `<em>Aucun joueur inscrit</em>`;
  };

  const renderStandings = () => {
    if (!tournament) {
      standingsEl.innerHTML = "";
      return;
    }
    let html = `<h3 class="font-semibold mb-1">Classement</h3><ul class="list-disc ml-5">`;
    for (const { alias: name, points: pts } of tournament.getStandings()) {
      html += `<li>${name}: <strong>${pts}</strong> pts</li>`;
    }
    html += `</ul>`;
    standingsEl.innerHTML = html;
  };

  const showNextMatch = () => {
    if (!tournament) return;
    const m = tournament.nextMatch();
    currentMatch = m || null;

    if (!m) {
      matchInfo.innerHTML = `<h3 class="text-green-400">🎉 Tournoi terminé</h3>`;
      scoreEntry.classList.add("hidden");
      renderStandings();
      return;
    }

    matchInfo.innerHTML = `
      <div class="flex items-center gap-3">
        <h3 class="text-lg">Prochain match: <strong>${m.p1}</strong> vs <strong>${m.p2}</strong></h3>
        <button id="launchMatchBtn" class="bg-amber-600 px-3 py-1 rounded">Jouer ce match</button>
      </div>
    `;

    // Binder le bouton "Jouer ce match"
    const launchBtn = document.getElementById("launchMatchBtn") as HTMLButtonElement;
    if (launchBtn) {
      launchBtn.onclick = () => {
        // Affiche le container + canvas via votre moteur de jeu
        forceGameRender("game-local");
        // On affiche aussi la zone de saisie du score côté tournoi
        scoreP1Input.value = "0";
        scoreP2Input.value = "0";
        scoreEntry.classList.remove("hidden");
      };
    }
  };

  // === Listeners
  addBtn.onclick = () => {
    const alias = aliasInput.value.trim();
    if (!alias) return;
    if (players.includes(alias)) return alert("Alias déjà utilisé.");
    players.push(alias);
    aliasInput.value = "";
    refreshPlayers();
  };

  startBtn.onclick = () => {
    if (players.length < 2) {
      alert("Au moins 2 joueurs requis.");
      return;
    }
    tournament = new Tournament();
    players.forEach((p) => tournament!.addPlayer(p));
    tournament.generateMatches();
    renderStandings();
    showNextMatch();
  };

  resetBtn.onclick = () => {
    players.splice(0, players.length);
    tournament = null;
    currentMatch = null;
    refreshPlayers();
    matchInfo.innerHTML = "";
    standingsEl.innerHTML = "";
    scoreEntry.classList.add("hidden");
  };

  saveScoreBtn.onclick = () => {
    if (!tournament || !currentMatch) return;
    const s1 = Math.max(0, Number(scoreP1Input.value) | 0);
    const s2 = Math.max(0, Number(scoreP2Input.value) | 0);
    tournament.reportResult(currentMatch.p1, currentMatch.p2, s1, s2);
    renderStandings();
    scoreEntry.classList.add("hidden");
    showNextMatch();
  };

  // init UI
  refreshPlayers();
}
