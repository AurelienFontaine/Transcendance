// requirement/frontend/pages/play.ts
import { Tournament } from "../handlers/game/tournament";
import { __forceRender as forceGameRender, startLocalMatch, showBoardForTournament} from "../handlers/game/game-front";

let tournament: Tournament | null = null;

export function renderPlay() {
  return `
    <div class="min-h-screen flex flex-col items-center justify-start bg-gray-900 text-white py-10">

      <!-- === Section 1 : choix du mode === -->
      <section id="modeChoice" class="w-full max-w-3xl mb-8 text-center">
        <h2 class="mb-3">Choisissez un mode de jeu</h2>
        <div class="flex gap-3 justify-center">
          <button id="localBtn"  class="bg-gray-700 px-4 py-2 rounded">2 joueurs sur 1 PC</button>
          <button id="onlineBtn" class="bg-gray-700 px-4 py-2 rounded">2 joueurs en ligne</button>
        </div>
      </section>

      <!-- === Section 2 : sous-menu local === -->
      <section id="localSubmenu" class="w-full max-w-3xl mb-8 text-center hidden">
        <h3 class="mb-3">Local</h3>
        <div class="flex gap-3 justify-center">
          <button id="quickPlayBtn"  class="bg-gray-700 px-4 py-2 rounded">Partie rapide</button>
          <button id="tournamentBtn" class="bg-gray-700 px-4 py-2 rounded">Tournoi</button>
          <button id="backToModeBtn" class="bg-gray-700 px-4 py-2 rounded">Retour</button>
        </div>
      </section>

      <!-- === Section 3 : panneau tournoi (caché par défaut) === -->
      <section id="tournamentPanel" class="w-full max-w-3xl mb-10 p-4 rounded-lg bg-[#1f2937] hidden">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-xl font-semibold">Tournoi Round-Robin (local)</h2>
          <button id="closeTournamentBtn" class="bg-gray-700 px-3 py-1 rounded">Fermer</button>
        </div>

        <div id="registration" class="flex gap-2 items-center mb-3">
          <input id="aliasInput" placeholder="Entrer un alias joueur" class="text-black px-2 py-1 rounded"/>
          <button id="addPlayerBtn"   class="bg-green-600 px-3 py-1 rounded">Ajouter joueur</button>
          <button id="startTournamentBtn" class="bg-blue-600  px-3 py-1 rounded">Lancer le tournoi</button>
          <button id="resetTournamentBtn" class="bg-gray-600 px-3 py-1 rounded">Réinitialiser</button>
        </div>

        <div id="playerList" class="mb-3 text-sm text-gray-300"></div>
        <div id="matchInfo"  class="mb-3"></div>
        <div id="standings"  class="mt-4"></div>
      </section>

      <!-- === Section 4 : zone du jeu (canvas + boutons) === -->
      <section class="flex flex-col gap-4 items-center w-full max-w-3xl">
        <!-- Stub required by game-front.ts (renderPage toggles #menu / #gamecontainer) -->
        <div id="menu" style="display:none"></div>
        <div id="gamecontainer" style="display:none; width: 1000px; height: 1000px;">
          <div id="app">
            <button id="startBtn"    style="display:none; top:100px; right:180px; z-index:10;">Start</button>
            <button id="pauseBtn"    style="display:none; top:10px;  left:10px;   z-index:10;">Pause</button>
            <button id="restartBtn"  style="display:none; top:10px;  right:180px; z-index:10;">Restart</button>
            <button id="settingsBtn" style="display:none; top:10px;  right:25px;  z-index:10;">Settings</button>
          </div>

          <div id="settingsPanel" style="display:none; position:absolute; top:40px; right:10px; background:#153bbb; padding:0.5rem; width:220px; font-size:0.9rem; border-radius:8px; box-shadow:0 4px 10px rgba(0,0,0,0.3); color:white;">
            <label class="block mb-2">Vitesse :
              <div class="flex items-center gap-2">
                <input id="speedSlider" type="range" min="1" max="100" value="50" />
                <span id="speedValue" class="inline-block w-12 text-right">50%</span>
              </div>
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

/** Idempotent: appelé par main.ts après render() quand path === '/play' */
export function setupPlayPage() {
  // --- helpers d’affichage
  const $ = (id: string) => document.getElementById(id)!;
  const show = (el: HTMLElement) => el.classList.remove("hidden");
  const hide = (el: HTMLElement) => el.classList.add("hidden");

  const modeChoice      = $("modeChoice");
  const localSubmenu    = $("localSubmenu");
  const tournamentPanel = $("tournamentPanel");

  // État tournoi
  const players: string[] = [];
  let currentMatch: { p1: string; p2: string } | null = null;

  const token = localStorage.getItem('token');
  const rawName = localStorage.getItem('username');
  const loggedName = token && rawName ? rawName.trim() : null; // <— ignore si pas de token

  if (loggedName && !players.includes(loggedName)) {
    players.push(loggedName);
  }

  // ========== Navigation (Local / Online / Sous-menu) ==========
  $("localBtn").onclick = () => {
    hide(modeChoice);
    show(localSubmenu);
    hide(tournamentPanel);
  };

  $("backToModeBtn").onclick = () => {
    show(modeChoice);
    hide(localSubmenu);
    hide(tournamentPanel);
  };

  $("onlineBtn").onclick = () => {
    // on laisse le routeur interne du jeu gérer le mode en ligne
    forceGameRender("game-online");
  };

  $("quickPlayBtn").onclick = () => {
    // cache les menus, lance le jeu local immédiatement
    hide(modeChoice);
    show(localSubmenu); // on garde le sous-menu visible si tu veux pouvoir revenir facilement
    hide(tournamentPanel);
    forceGameRender("game-local"); // crée/affiche un seul canvas et démarre le local
  };

  $("tournamentBtn").onclick = () => {
    hide(modeChoice);
    show(localSubmenu);
    show(tournamentPanel);
  };

  $("closeTournamentBtn").onclick = () => {
    // ne casse pas le tournoi en cours, ferme juste le panneau
    hide(tournamentPanel);
  };

  // ========== Logique tournoi ==========
  const aliasInput   = $("aliasInput") as HTMLInputElement;
  const playerList   = $("playerList");
  const matchInfo    = $("matchInfo");
  const standingsEl  = $("standings");

 const refreshPlayers = () => {
    const ln = loggedName; // capture
    const others = ln ? players.filter(p => p !== ln) : [...players];

    let html = '';
    if (ln) {
      html += `<div>Inscrit (connecté) : <strong>${ln}</strong></div>`;
    }
    if (others.length) {
      html += `<div class="mt-1 text-sm text-gray-300"><strong>Autres joueurs :</strong> ${others.join(', ')}</div>`;
    }
    if (!html) {
      html = `<em>Aucun joueur inscrit</em>`;
    }
    playerList.innerHTML = html;
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

  function showNextMatch() {
    if (!tournament) return;
    const m = tournament.nextMatch();
    currentMatch = m || null;

    if (!m) {
      matchInfo.innerHTML = `<h3 class="text-green-400">🎉 Tournoi terminé</h3>`;
      renderStandings();
      return;
    }

    matchInfo.innerHTML = `
      <div class="flex items-center gap-3">
        <h3 class="text-lg">Prochain match: <strong>${m.p1}</strong> vs <strong>${m.p2}</strong></h3>
        <button id="launchMatchBtn" class="bg-amber-600 px-3 py-1 rounded">Jouer ce match</button>
      </div>
    `;

    const launchBtn = document.getElementById("launchMatchBtn") as HTMLButtonElement | null;
    if (launchBtn) {
      launchBtn.onclick = () => {
        launchBtn.disabled = true;
        // Monte la scène locale (un seul canvas)
        
          showBoardForTournament();
        // Démarre le match et enregistre le score automatiquement à la fin
        startLocalMatch(m.p1, m.p2, ({ s1, s2 }) => {
          tournament!.reportResult(m.p1, m.p2, s1, s2);
          const token = localStorage.getItem('token');
          //Verif du token
          if (token) {
            fetch('http://localhost:3000/game/result', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({ p1Name: m.p1, p2Name: m.p2, s1, s2 })
            }).catch(e => console.warn('Enregistrement du match échoué:', e));
          }
          renderStandings();
          showNextMatch();
        });
      };
    }
  }

  $("addPlayerBtn").onclick = () => {
    const alias = aliasInput.value.trim();
    if (!alias) return;

    // Bloque l'ajout si c'est l'alias du user connecté déjà auto-inscrit
    if (loggedName && alias === loggedName) {
      alert("Cet alias correspond déjà à l'utilisateur connecté.");
      return;
    }

    // Bloque les doublons (autres joueurs)
    if (players.includes(alias)) {
      alert("Alias déjà utilisé.");
      return;
    }

    players.push(alias);
    aliasInput.value = "";
    refreshPlayers();
  };

  $("startTournamentBtn").onclick = () => {
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

  $("resetTournamentBtn").onclick = () => {
    // Vide tout
    players.splice(0, players.length);
    tournament = null;
    currentMatch = null;

    matchInfo.innerHTML = "";
    standingsEl.innerHTML = "";

    // Réinscrit automatiquement l'utilisateur connecté s'il existe
    if (loggedName) players.push(loggedName);

    refreshPlayers();
  };

  // init
  refreshPlayers();
}
