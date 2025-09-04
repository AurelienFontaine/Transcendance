// requirement/frontend/pages/play.ts
import { Tournament } from "../handlers/game/tournament";
import { __forceRender as forceGameRender, startLocalMatch, showBoardForTournament } from "../handlers/game/game-front";

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

export function setupPlayPage() {
  const $ = (id: string) => document.getElementById(id)!;
  const show = (el: HTMLElement) => el.classList.remove("hidden");
  const hide = (el: HTMLElement) => el.classList.add("hidden");

  const modeChoice      = $("modeChoice");
  const localSubmenu    = $("localSubmenu");
  const tournamentPanel = $("tournamentPanel");

  const players: string[] = [];
  let currentMatch: { p1: string; p2: string } | null = null;

  // 🔑 Infos du joueur connecté
  const token = localStorage.getItem('token');
  const loggedName = localStorage.getItem('name');        // identifiant fixe
  const loggedUsername = localStorage.getItem('username'); // affichage préféré
  const displaySelf = loggedUsername || loggedName;

  if (token && displaySelf && !players.includes(displaySelf)) {
    players.push(displaySelf);
  }

  // Rafraîchit l’affichage des joueurs
  const refreshPlayers = () => {
    const others = displaySelf ? players.filter(p => p !== displaySelf) : [...players];

    let html = '';
    if (displaySelf) {
      html += `<div>Inscrit (connecté) : <strong>${displaySelf}</strong></div>`;
    }
    if (others.length) {
      html += `<div class="mt-1 text-sm text-gray-300"><strong>Autres joueurs :</strong> ${others.join(', ')}</div>`;
    }
    if (!html) {
      html = `<em>Aucun joueur inscrit</em>`;
    }
    $("playerList").innerHTML = html;
  };

  // Ajout joueur au tournoi
  $("addPlayerBtn").onclick = async () => {
  const alias = ($("aliasInput") as HTMLInputElement).value.trim();
  if (!alias) return;

  // ⛔ Empêche d’ajouter son propre compte (name ou username)
  if (alias === loggedName || alias === loggedUsername) {
    alert("Cet alias correspond déjà à l'utilisateur connecté.");
    return;
  }

  try {
    // Vérifie si l’alias est un `name` valide
    const res = await fetch(
      `http://localhost:3000/users/${encodeURIComponent(alias)}/display`
    );
    if (!res.ok) throw new Error("Utilisateur inexistant");

    const data = await res.json();
    const display = data.display;

    // ⛔ Empêche les doublons avec `display`
    if (players.includes(display)) {
      alert("Ce joueur est déjà inscrit au tournoi.");
      return;
    }

    players.push(display);
    ($("aliasInput") as HTMLInputElement).value = "";
    refreshPlayers();
  } catch (err) {
    alert("Ce joueur n'existe pas en base. Il doit d’abord se créer un compte.");
  }
};


  // Lancer le tournoi
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

  // Réinitialiser le tournoi
  $("resetTournamentBtn").onclick = () => {
    players.splice(0, players.length);
    tournament = null;
    currentMatch = null;

    $("matchInfo").innerHTML = "";
    $("standings").innerHTML = "";

    if (displaySelf) players.push(displaySelf);
    refreshPlayers();
  };

  // Affichage classement
  const renderStandings = () => {
    if (!tournament) {
      $("standings").innerHTML = "";
      return;
    }
    let html = `<h3 class="font-semibold mb-1">Classement</h3><ul class="list-disc ml-5">`;
    for (const { alias: name, points: pts } of tournament.getStandings()) {
      html += `<li>${name}: <strong>${pts}</strong> pts</li>`;
    }
    html += `</ul>`;
    $("standings").innerHTML = html;
  };

  // Match suivant
  function showNextMatch() {
    if (!tournament) return;
    const m = tournament.nextMatch();
    currentMatch = m || null;

    if (!m) {
      $("matchInfo").innerHTML = `<h3 class="text-green-400">🎉 Tournoi terminé</h3>`;
      renderStandings();
      return;
    }

    $("matchInfo").innerHTML = `
      <div class="flex items-center gap-3">
        <h3 class="text-lg">Prochain match: <strong>${m.p1}</strong> vs <strong>${m.p2}</strong></h3>
        <button id="launchMatchBtn" class="bg-amber-600 px-3 py-1 rounded">Jouer ce match</button>
      </div>
    `;

    const launchBtn = document.getElementById("launchMatchBtn") as HTMLButtonElement | null;
    if (launchBtn) {
      launchBtn.onclick = () => {
        launchBtn.disabled = true;
        showBoardForTournament();

        startLocalMatch(m.p1, m.p2, ({ s1, s2 }) => {
          tournament!.reportResult(m.p1, m.p2, s1, s2);
          const token = localStorage.getItem('token');

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

  // Navigation
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
  $("onlineBtn").onclick = () => forceGameRender("game-online");
  $("quickPlayBtn").onclick = () => {
    hide(modeChoice);
    show(localSubmenu);
    hide(tournamentPanel);
    forceGameRender("game-local");
  };
  $("tournamentBtn").onclick = () => {
    hide(modeChoice);
    show(localSubmenu);
    show(tournamentPanel);
  };
  $("closeTournamentBtn").onclick = () => hide(tournamentPanel);

  // Init
  refreshPlayers();
}
