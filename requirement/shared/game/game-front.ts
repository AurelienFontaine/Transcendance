import p5 from "p5";
import { sketch } from "./sketch";
import { PongGame } from "./game-back";
import { apiBase } from "../../src/utils";

import type {
  GameState,
  InputMessage,
  PauseMessage,
  StartMessage,
  ResetMessage,
  StateMessage,
} from "./types";

// Import UI helpers
import { getStartBtn, getPauseBtn, getRestartBtn, getSettingsBtn, wireSettingsPanel, wireSettingsPanelOnline } from "./game-ui-helpers";
// Import WebSocket helpers
import { wsBase } from "./game-websocket";
// Import local game helpers
import { createLocalGame, updateLocalGameState } from "./game-local";

// --- Debug box globale --- 
const DBG = (window as any).__PONGDBG || ((window as any).__PONGDBG = {
  renderCalls: 0,
  p5Creates: 0,
  p5Removes: 0,
  wsCreates: 0,
  wsCloses: 0,
  localLoops: 0,
  lastPlayers: 0,
  lastPaused: true,
});


type ClientMessage =
  | InputMessage
  | PauseMessage
  | StartMessage
  | ResetMessage
  | StateMessage;

let latestState: GameState | null = null;
let playerIndex = -1;
let isPaused = false;
let mode: "local" | "online" | "menu" = "menu";
let ws: WebSocket | null = null;

let localGame: PongGame | null = null;
let localLoop: number | undefined;

let p5Instance: p5 | null = null;

// 🔧 vitesse choisie via le slider (0..100). Sert de source de vérité.
let currentSpeedPercent = 50;
let quickReported = false; // used only for Quick Play (startLocalGame)

let wasRunningBeforeSettings = false; // mémorise l’état avant ouverture du panneau

// ---------------- UI helpers ----------------
// (moved to game-ui-helpers.ts)

// Monte le panneau Settings (slider + couleurs). Idempotent.
// (moved to game-ui-helpers.ts)
function wireSettingsPanelOriginal() {
  const panel      = document.getElementById("settingsPanel")!;
  const slider     = document.getElementById("speedSlider") as HTMLInputElement | null;
  const speedValue = document.getElementById("speedValue");

  if (!panel || !slider || !speedValue) return;

  // init depuis l'état mémorisé
  slider.value = String(currentSpeedPercent);
  speedValue.textContent = `${currentSpeedPercent}%`;

  // MAJ en direct + applique à la partie en cours
  slider.oninput = () => {
    const p = Math.max(0, Math.min(100, Math.round(Number(slider.value) || 0)));
    currentSpeedPercent = p;
    speedValue.textContent = `${p}%`;
    if (localGame) localGame.setSpeedPercent(p);
  };

  // Bouton Apply : n'applique que les couleurs + ferme le panneau
  const applyBtn = document.getElementById("applySettings") as HTMLButtonElement | null;
  if (applyBtn) {
    const fresh = applyBtn.cloneNode(true) as HTMLButtonElement;
    applyBtn.replaceWith(fresh);
    fresh.onclick = () => {
      const ballColor   = (document.getElementById("ballColor") as HTMLInputElement).value;
      const paddleColor = (document.getElementById("paddleColor") as HTMLInputElement).value;
      if (localGame) {
        localGame.setColors(ballColor, paddleColor);
        latestState = {
          ...localGame.state,
          ballColor: localGame.ballColor,
          paddleColor: localGame.paddleColor,
        };
      }
      panel.style.display = "none";
    };
  }

  // Bouton d’ouverture/fermeture
  const btn = getSettingsBtn();
  if (btn) {
    const freshBtn = btn.cloneNode(true) as HTMLButtonElement;
    btn.replaceWith(freshBtn);
    freshBtn.onclick = () => {
      const show = panel.style.display !== "block";
      panel.style.display = show ? "block" : "none";
    };
  }
}

// ---------------- p5 helpers ----------------
function pauseSketch()   { if (p5Instance) p5Instance.noLoop(); }
function resumeSketch()  { if (p5Instance) p5Instance.loop(); }
function updateCanvasVisibility(visible: boolean) {
  const app = document.getElementById("gameApp")!;
  app.style.display = visible ? "block" : "none";
}

function updateSettingsButtonVisibility() {
  const settingsBtn = getSettingsBtn();
  if (settingsBtn) {
    // Show settings button when:
    // 1. Game is paused, OR
    // 2. Game hasn't started yet (local game only)
    const shouldShow = isPaused || (mode === "local" && localGame && !localGame.Started);
    settingsBtn.style.display = shouldShow ? "block" : "none";
  }
}

function removeEventListeners() {
  // Liste des boutons à réinitialiser
  const buttons = ["pauseBtn", "restartBtn", "startBtn", "settingsBtn", "applySettings"];
  for (const id of buttons) {
    const el = document.getElementById(id);
    if (el) {
      const clone = el.cloneNode(true) as HTMLElement;
      el.replaceWith(clone);
    }
  }

  // Cache aussi le panneau de settings
  const settingsPanel = document.getElementById("settingsPanel");
  if (settingsPanel) settingsPanel.style.display = "none";

  // ⚠️ IMPORTANT : stoppe les boucles de jeu
  if (localLoop) {
    clearInterval(localLoop);
    localLoop = undefined;
  }

  // cancelAnimationFrame(animationFrameId); // si tu as un RAF
  // animationFrameId = 0;
  // Coupe la websocket s’il y en a une
  if (ws) {
    ws.close();
    ws = null;
  }
}


export function cleanupGame() {
  console.log("🧹 cleanupGame: removing p5Instance =", !!p5Instance);

  pauseSketch();
  if (localLoop) { clearInterval(localLoop); localLoop = undefined; }
  localGame = null;

  if (ws) { ws.close(); ws = null; }

  playerIndex = -1;
  isPaused = false;
  latestState = null;

  removeEventListeners();

  // 🔹 Supprimer l'instance p5 si elle existe
  if (p5Instance) {
    p5Instance.remove();
    p5Instance = null;
  }
  const canvasRoot = document.getElementById("gameApp");
  if (canvasRoot) {
    canvasRoot.querySelectorAll("canvas").forEach(c => c.remove());
  }

  // 🔹 Masquer les boutons
  ["startBtn", "pauseBtn", "restartBtn", "settingsBtn"].forEach(id => {
    const el = document.getElementById(id) as HTMLElement | null;
    if (el) el.style.display = "none";
  });

  const settingsPanel = document.getElementById("settingsPanel");
  if (settingsPanel) settingsPanel.style.display = "none";

  const container = document.getElementById("gamecontainer");
  if (container) container.style.display = "none";
}


// ---------------- ONLINE ----------------

// wsBase function moved to game-websocket.ts

// wireSettingsPanelOnline moved to game-ui-helpers.ts

// ---------------- ONLINE ----------------
export function startOnlineGame() {
  mode = "online";

  const pause = getPauseBtn();
  const restart = getRestartBtn();

  // Get user token for authentication
  const token = localStorage.getItem("token");
  const userId = localStorage.getItem("id");
  
  if (!token || !userId) {
    alert("Vous devez être connecté pour jouer en ligne.");
    return;
  }

  // Connect with authentication
  const wsUrl = `${wsBase()}?token=${encodeURIComponent(token)}&userId=${encodeURIComponent(userId)}`;
  console.log("[WebSocket] Connecting to:", wsUrl);
  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log("[WebSocket] Connection opened successfully");
  };

  ws.onerror = (error) => {
    console.error("[WebSocket] Connection error:", error);
  };

  ws.onclose = (event) => {
    console.log("[WebSocket] Connection closed:", event.code, event.reason);
  };

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);

    if (msg.type === "player") {
      playerIndex = msg.playerIndex;
      console.log(`Assigné à la room ${msg.roomId} en tant que Player ${msg.playerIndex}`);
    }
    else if (msg.type === "error" && ws != null) {
      alert(msg.message || "Connexion refusée : toutes les salles sont pleines.");
      ws.close();
      ws = null;
      
      // Clean up game state and redirect to main play page
      cleanupGame();
      
      // Navigate back to the main play page using the proper navigation system
      if (typeof window !== 'undefined' && window.history) {
        // Reset the play view state
        localStorage.setItem("playView", "root");
        
        // Navigate back to the main play page (not the game-online sub-page)
        window.history.pushState({ page: 'root' }, '', '/play');
        
        // Trigger a custom event to notify the main app to re-render
        window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'root' } }));
        
        // Force a page refresh to ensure clean state
        setTimeout(() => {
          window.location.reload();
        }, 100);
      }
      
      return;
    }
    else if (msg.type === "state") {
      // Preserve local color changes when updating from server
      const currentColors = latestState ? {
        ballColor: latestState.ballColor,
        paddleColor: latestState.paddleColor
      } : {};
      
      latestState = {
        ...msg.state,
        ...currentColors
      };
      isPaused = msg.paused;
      if (pause) pause.textContent = isPaused ? "Play" : "Pause";
      updateSettingsButtonVisibility();
      const pauseBtn = getPauseBtn();

      if (msg.players < 2) {
        // désactive totalement le bouton Play/Pause
        if (pauseBtn) {
          pauseBtn.disabled = true;
          pauseBtn.style.pointerEvents = "none";
        }
      } else {
        // quand 2 joueurs → réactiver
        if (pauseBtn) {
          pauseBtn.disabled = false;
          pauseBtn.style.pointerEvents = "auto";
        }
      }
      const startBtn = getStartBtn();

      // LOGS de debug
      console.log("[STATE] players=", msg.players, "paused=", msg.paused);
      console.log("[STATE] before: startBtn.disabled=", startBtn.disabled, "onclick=", !!startBtn.onclick);

      if (msg.players < 2) {
        // Pas assez de joueurs → bouton visible mais inactif (message d’attente)
        startBtn.style.display = "inline-block";
        startBtn.disabled = true;
        startBtn.textContent = "Waiting for player 2...";
        startBtn.onclick = null;                       // ← aucun handler
        startBtn.style.pointerEvents = "none";         // ← ceinture et bretelles
      } else if (msg.paused) {
        // 2 joueurs et partie en pause → Start activable
        startBtn.style.display = "inline-block";
        startBtn.disabled = false;
        startBtn.textContent = "Start";
        startBtn.style.pointerEvents = "auto";

        // IMPORTANT: recâblage propre (on écrase tout handler précédent)
        startBtn.onclick = () => {
          // Garde-fou côté client : revalide avant d’envoyer
          if (msg.players >= 2 && ws?.readyState === WebSocket.OPEN) {
            console.log("[START] send 'start'");
            ws.send(JSON.stringify({ type: "start" }));
            startBtn.disabled = true;
            startBtn.style.display = "none";
          } else {
            console.warn("[START] blocked at click-time: players<2 or ws not open");
          }
        };
      } else {
        // Partie en cours → Start caché
        startBtn.style.display = "none";
        startBtn.disabled = true;
        startBtn.onclick = null;
        startBtn.style.pointerEvents = "none";
      }

      console.log("[STATE] after: startBtn.disabled=", startBtn.disabled, "onclick=", !!startBtn.onclick, "display=", startBtn.style.display);
    }

  };

  ws.onopen = () => {
    const startBtn = getStartBtn();
    startBtn.style.display = "inline-block";
    startBtn.disabled = true;
    startBtn.onclick = null; 

    restart?.addEventListener("click", () => {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "reset" }));
      }
    });

    pause?.addEventListener("click", () => {
      if (ws?.readyState !== WebSocket.OPEN) return;
      isPaused = !isPaused;
      ws.send(JSON.stringify({ type: "pause" }));
      if (pause) pause.textContent = isPaused ? "Play" : "Pause";
      updateSettingsButtonVisibility();
    });

    startBtn.onclick = () => {
      if (ws?.readyState === WebSocket.OPEN && !startBtn.disabled) {
        ws.send(JSON.stringify({ type: "start" }));
        startBtn.disabled = true;
        startBtn.style.display = "none";
      }
    };
  };

  ws.onclose = () => {
    getStartBtn().style.display = "none";
    if (pause) pause.textContent = "Pause";
  };

      // Wire settings panel for online game (with delay to ensure DOM is ready)
      setTimeout(() => {
        console.log("[Settings] Wiring online settings panel after delay");
        wireSettingsPanelOnline(ws, currentSpeedPercent, (newState) => { 
          console.log("🔧 UPDATING latestState FROM:", latestState, "TO:", newState);
          latestState = newState; 
        });
      }, 100);
}


// ---------------- LOCAL (partie simple) ----------------
export function startLocalGame() {
  console.log("🚀 startLocalGame() called");
  mode = "local";
  localGame = createLocalGame(currentSpeedPercent);
  quickReported = false;

  latestState = {
    ...localGame.state,
    ballColor: localGame.ballColor,
    paddleColor: localGame.paddleColor
  };

  // Create sketch for local game
  const canvasRoot = document.getElementById("gameApp");
  if (canvasRoot) {
    // Clean up any existing sketch first
    if (p5Instance) { 
      console.log("🧹 CLEANING UP OLD SKETCH");
      p5Instance.remove(); 
      p5Instance = null; 
    }
    
    // Remove old canvas elements
    canvasRoot.querySelectorAll("canvas").forEach(c => {
      console.log("🧹 REMOVING OLD CANVAS");
      c.remove();
    });
    
    console.log("🎨 CREATING SKETCH FOR LOCAL GAME");
    p5Instance = new p5(sketch(() => {
      console.log("🎯 SKETCH GETSTATE CALLED:", { ballColor: latestState?.ballColor, paddleColor: latestState?.paddleColor });
      return latestState;
    }), canvasRoot);
    console.log("🎨 SKETCH CREATED, calling resumeSketch()");
    resumeSketch();
    console.log("🎨 resumeSketch() called");
  }

  getStartBtn().style.display = "block";
  getStartBtn().disabled = false;

  getStartBtn().onclick = () => {
    if (localGame) {
      localGame.resetBall();
      localGame.Started = true;
      isPaused = false;
      getStartBtn().disabled = true;
      getStartBtn().style.display = "none";
      updateSettingsButtonVisibility(); // Hide settings button when game starts
    }
  };

  const pause = getPauseBtn();
  pause?.addEventListener("click", () => {
    if (!localGame || localGame.GameOver) return;
    if (!localGame.Started && !isPaused) return;

    isPaused = !isPaused;
    localGame.Started = !isPaused;
    if (pause) pause.textContent = isPaused ? "Play" : "Pause";
    updateSettingsButtonVisibility();
  });

  const restart = getRestartBtn();
  restart?.addEventListener("click", () => {
    localGame = new PongGame();
    localGame.setSpeedPercent(currentSpeedPercent);
    quickReported = false;
    latestState = localGame.state;
    localGame.resetBall();

    isPaused = true;
    localGame.Started = false;
    localGame.GameOver = false;
    if (pause) pause.textContent = "Play";

    getStartBtn().disabled = false;
    getStartBtn().style.display = "block";
    updateSettingsButtonVisibility();
  });

  // --- Boucle de jeu ---
  function loopStart() {
    localLoop = window.setInterval(() => {
      if (localGame) {
        latestState = updateLocalGameState(localGame, isPaused);
        console.log("🔄 LOCAL LOOP STATE:", { ballColor: latestState.ballColor, paddleColor: latestState.paddleColor });

        if (localGame.GameOver && !quickReported) {
          quickReported = true;
          const s1 = localGame.state.score.p1 ?? 0;
          const s2 = localGame.state.score.p2 ?? 0;
          const token = localStorage.getItem('token');

          if (token) {
            fetch(`${apiBase()}/game/quick-result`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({ s1, s2 }),
            }).catch(e => console.warn('Quick Play save failed:', e));
          }
        }
      }
    }, 1000 / 60);
  }

  loopStart();
}


// ---------------- SPA nav inside game container ----------------
function navigateTo(page: "menu" | "game-local" | "game-online") {
  history.pushState({ page }, "", `#${page}`);
  renderPage(page);
}

export function __forceRender(page: "game-local" | "game-online" | "menu") {
  cleanupGame();
  const currentPage = history.state?.page;
  if (currentPage !== page) {
    history.replaceState({ page }, "", `#${page}`);
  }
  renderPage(page);
}

function renderPage(page: string) {
  console.log("🎨 Creating new p5Instance, current =", p5Instance);
  console.log(`[RP] enter renderPage(${page}) #${++DBG.renderCalls}`, new Error().stack?.split('\n').slice(0,3).join('\n'));
  const menu = document.getElementById("menu")!;
  const gameContainer = document.getElementById("gamecontainer")!;
  switch (page) {
    case "menu":
      cleanupGame();
      mode = "menu";
      menu.style.display = "block";
      gameContainer.style.display = "none";
      getStartBtn().style.display = "none";
      getPauseBtn().style.display = "none";
      getRestartBtn().style.display = "none";
      getSettingsBtn().style.display = "none";
      updateCanvasVisibility(false);
      pauseSketch();
      break;

    case "game-local":
  cleanupGame();
  menu.style.display = "none";
  gameContainer.style.display = "block";

  const canvas = document.getElementById("gameApp");
  if (canvas) {
    // Supprimer d’anciens canvas + instance p5
    canvas.querySelectorAll("canvas").forEach(c => c.remove());
    if (p5Instance) { p5Instance.remove(); p5Instance = null; }

    // ⚡ Correction : startLocalGame() will create the sketch
    startLocalGame();

    // Settings panel dispo + relié
  getStartBtn().style.display    = "block";
  getPauseBtn().style.display    = "block";
  getRestartBtn().style.display  = "block";
  getSettingsBtn().style.display = "none"; // Will be updated by updateSettingsButtonVisibility()
  updateCanvasVisibility(true);
  updateSettingsButtonVisibility(); // Show settings button initially for local game
    // Wire settings panel for local game (with delay to ensure DOM is ready)
    setTimeout(() => {
      console.log("[Settings] Wiring local settings panel after delay");
      wireSettingsPanel(currentSpeedPercent, localGame, (state) => { latestState = state; });
    }, 100);
  } else {
    console.error("❌ canvas #app not found!");
  }
  break;


  case "game-online":
    cleanupGame();
    menu.style.display = "none";
    gameContainer.style.display = "block";

    const canvasOnline = document.getElementById("gameApp");
    if (canvasOnline) {
      // Supprime d'anciens canvas
      canvasOnline.querySelectorAll("canvas").forEach(c => c.remove());

      // Initialize with default state for online game
      if (!latestState) {
        latestState = {
          ball: { x: 400, y: 300, vx: 5, vy: 5 },
          paddles: { p1: 300, p2: 300 },
          score: { p1: 0, p2: 0 },
          ballColor: "#FFFFFF",
          paddleColor: "#FFFFFF"
        };
      }

      p5Instance = new p5(sketch(() => {
        console.log("🌐 ONLINE SKETCH GETSTATE CALLED:", { ballColor: latestState?.ballColor, paddleColor: latestState?.paddleColor });
        return latestState;
      }), canvasOnline);
      resumeSketch();
      console.log("[Online Game] About to call startOnlineGame()");
      startOnlineGame();
      console.log("[Online Game] startOnlineGame() called");

      // Boutons (online tu peux afficher Start/Pause/Restart/Settings aussi)
  getStartBtn().style.display    = "block";
  getPauseBtn().style.display    = "block";
  getRestartBtn().style.display  = "block";
  getSettingsBtn().style.display = "none"; // Hidden initially, shown only when paused

  // Settings panel will be wired by startOnlineGame() after WebSocket connection
    } else {
      console.error("❌ canvas #app not found!");
    }
    break;
  }
}

// Init (pour l'ancien menu interne si utilisé)
// window.addEventListener("DOMContentLoaded", () => {
//   const localBtn = document.getElementById("localBtn") as HTMLButtonElement | null;
//   const onlineBtn = document.getElementById("onlineBtn") as HTMLButtonElement | null;
//   const page = history.state?.page || "menu";

//   renderPage(page);

//   localBtn?.addEventListener("click", () => navigateTo("game-local"));
//   onlineBtn?.addEventListener("click", () => navigateTo("game-online"));
// });

// window.addEventListener("popstate", () => {
//   const page = history.state?.page || "menu";
//   renderPage(page);
// });

// ---------------- Tournoi: scène unique + jeu auto ----------------
export function showBoardForTournament() {
  const menu = document.getElementById("menu")!;
  const gameContainer = document.getElementById("gamecontainer")!;

  cleanupGame();

  // retire tous les canvases précédents
  const canvasRoot = document.getElementById("gameApp")!;
  canvasRoot.querySelectorAll("canvas").forEach(c => c.remove());

  menu.style.display = "none";
  gameContainer.style.display = "block";

  if (p5Instance) { p5Instance.remove(); p5Instance = null; }
  console.log("🎨 CREATING SKETCH FOR LOCAL GAME");
  p5Instance = new p5(sketch(() => {
    console.log("🎯 SKETCH GETSTATE CALLED:", { ballColor: latestState?.ballColor, paddleColor: latestState?.paddleColor });
    return latestState;
  }), canvasRoot);
  console.log("🎨 SKETCH CREATED, calling resumeSketch()");
  resumeSketch();
  console.log("🎨 resumeSketch() called");

  getStartBtn().style.display    = "block";   // caché au démarrage du match
  getPauseBtn().style.display    = "block";
  getRestartBtn().style.display  = "block";
  getSettingsBtn().style.display = "none"; // Will be updated by updateSettingsButtonVisibility()
  updateCanvasVisibility(true);
  updateSettingsButtonVisibility(); // Show settings button initially for local game

  // Wire settings panel for local game (with delay to ensure DOM is ready)
  setTimeout(() => {
    console.log("[Settings] Wiring local settings panel after delay");
    wireSettingsPanel(currentSpeedPercent, localGame, (state) => { latestState = state; });
  }, 100);
}

/**
 * Lance un match local p1 vs p2 et appelle onEnd({ p1, p2, s1, s2 }) à la fin.
 * IMPORTANT: ne crée PAS de nouveau canvas. Le canvas doit être monté par showBoardForTournament().
 */
export function startLocalMatch(
  p1: string,
  p2: string,
  onEnd: (res: { p1: string; p2: string; s1: number; s2: number }) => void
) {
  // Nettoie une éventuelle boucle
  if (localLoop) { clearInterval(localLoop); localLoop = undefined; }

  mode = "local";
  isPaused = false;

  const startFreshGame = () => {
    localGame = new PongGame();
    localGame.setSpeedPercent(currentSpeedPercent); // <— applique la vitesse courante
    localGame.GameOver = false;
    localGame.Started  = false; // Don't start automatically, wait for user to click Start
    latestState = {
      ...localGame.state,
      ballColor: localGame.ballColor,
      paddleColor: localGame.paddleColor,
    };
  };

  startFreshGame();

  // Start: visible en tournoi (l'utilisateur doit cliquer pour démarrer)
  const startBtn = getStartBtn();
  startBtn.style.display = "block";
  startBtn.disabled = false;
  startBtn.textContent = "Start";
  startBtn.onclick = () => {
    if (localGame) {
      localGame.resetBall();
      localGame.Started = true;
      isPaused = false;
      startBtn.disabled = true;
      startBtn.style.display = "none";
      updateSettingsButtonVisibility(); // Hide settings button when game starts
    }
  };

  // Pause (listeners propres)
  {
    const oldPause = getPauseBtn();
    const pauseBtn = oldPause.cloneNode(true) as HTMLButtonElement;
    oldPause.replaceWith(pauseBtn);
    pauseBtn.textContent = "Pause";
    pauseBtn.onclick = () => {
      if (!localGame || localGame.GameOver) return;
      isPaused = !isPaused;
      localGame.Started = !isPaused;
      pauseBtn.textContent = isPaused ? "Play" : "Pause";
      updateSettingsButtonVisibility();
    };
  }

  // Restart (conserve currentSpeedPercent)
  {
    const oldRestart = getRestartBtn();
    const restartBtn = oldRestart.cloneNode(true) as HTMLButtonElement;
    oldRestart.replaceWith(restartBtn);
    restartBtn.onclick = () => {
      if (localLoop) { clearInterval(localLoop); localLoop = undefined; }
      isPaused = false;
      startFreshGame(); // <- recrée le jeu + setSpeedPercent
      loopStart();
      updateSettingsButtonVisibility();
    };
  }

  // Boucle de jeu
  const loopStart = () => {
    localLoop = window.setInterval(() => {
      if (!localGame) return;

      if (!isPaused) localGame.update();

      latestState = {
        ...localGame.state,
        ballColor: localGame.ballColor,
        paddleColor: localGame.paddleColor,
      };

      if (localGame.GameOver) {
        const s1 = localGame.state.score.p1 ?? 0;
        const s2 = localGame.state.score.p2 ?? 0;

        clearInterval(localLoop!);
        localLoop = undefined;

        onEnd({ p1, p2, s1, s2 });
      }
    }, 1000 / 60);
  };

  loopStart();
}

// === Clavier (idempotent: on enlève d'abord d'éventuels anciens handlers) ===
(function wireKeyboard() {
  // Pour éviter doublons : on supprime puis ré-attache
  const anyDoc = document as any;
  if (anyDoc.__pongKeydown) document.removeEventListener('keydown', anyDoc.__pongKeydown);
  if (anyDoc.__pongKeyup)   document.removeEventListener('keyup',   anyDoc.__pongKeyup);

  const isTextInputFocused = () => {
    const el = document.activeElement as HTMLElement | null;
    if (!el) return false;
    const tag = el.tagName.toLowerCase();
    return tag === 'input' || tag === 'textarea' || el.isContentEditable;
  };

  const onKeyDown = (e: KeyboardEvent) => {
    // Si on tape dans un champ (ex: le slider/couleurs), on ne touche pas aux paddles
    if (isTextInputFocused()) return;

    if (mode === "online" && ws?.readyState === WebSocket.OPEN) {
      if (e.key === "ArrowUp")   ws.send(JSON.stringify({ type: "input", direction: "up" }));
      if (e.key === "ArrowDown") ws.send(JSON.stringify({ type: "input", direction: "down" }));
      return;
    }

    if (mode === "local" && localGame) {
      // Joueur 1
      if (e.key === "w" || e.key === "W") localGame.p1Dir = "up";   // AZERTY friendly (Z/W)
      if (e.key === "s" || e.key === "S") localGame.p1Dir = "down";
      // Joueur 2
      if (e.key === "ArrowUp")   localGame.p2Dir = "up";
      if (e.key === "ArrowDown") localGame.p2Dir = "down";
    }
  };

  const onKeyUp = (e: KeyboardEvent) => {
    if (isTextInputFocused()) return;

    if (mode === "online" && ws?.readyState === WebSocket.OPEN) {
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        ws.send(JSON.stringify({ type: "input", direction: "stop" }));
      }
      return;
    }

    if (mode === "local" && localGame) {
      if (e.key === "w" || e.key === "W" || e.key === "s" || e.key === "S") {
        localGame.p1Dir = "stop";
      }
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        localGame.p2Dir = "stop";
      }
    }
  };

  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup',   onKeyUp);

  anyDoc.__pongKeydown = onKeyDown;
  anyDoc.__pongKeyup   = onKeyUp;
})();
