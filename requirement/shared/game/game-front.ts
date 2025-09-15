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
function getStartBtn()   { return document.getElementById("startBtn")    as HTMLButtonElement; }
function getPauseBtn()   { return document.getElementById("pauseBtn")    as HTMLButtonElement; }
function getRestartBtn() { return document.getElementById("restartBtn")  as HTMLButtonElement; }
function getSettingsBtn(){ return document.getElementById("settingsBtn") as HTMLButtonElement; }

// Monte le panneau Settings (slider + couleurs). Idempotent.
function wireSettingsPanel() {
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
  const app = document.getElementById("app")!;
  app.style.display = visible ? "block" : "none";
}

function removeEventListeners() {
  const oldPause = document.getElementById("pauseBtn");
  if (oldPause) {
    const clone = oldPause.cloneNode(true) as HTMLButtonElement;
    oldPause.replaceWith(clone);
  }
  const oldRestart = document.getElementById("restartBtn");
  if (oldRestart) {
    const clone = oldRestart.cloneNode(true) as HTMLButtonElement;
    oldRestart.replaceWith(clone);
  }
  const start = getStartBtn();
  if (start) start.onclick = null;
}

function cleanupGame() {
  pauseSketch();
  if (localLoop) { clearInterval(localLoop); localLoop = undefined; }
  localGame = null;

  if (ws) { ws.close(); ws = null; }

  playerIndex = -1;
  isPaused = false;
  latestState = null;

  removeEventListeners();

  const start = getStartBtn();
  if (start) start.style.display = "none";
  const pause = document.getElementById("pauseBtn") as HTMLButtonElement | null;
  if (pause) pause.textContent = "Pause";
}

// ---------------- ONLINE ----------------

function wsBase() {
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  const host = window.location.hostname;  // ← ici ton 192.168.1.55
  return `${proto}://${host}:3010`;
}

function wireSettingsPanelOnline(ws: WebSocket) {
  const panel      = document.getElementById("settingsPanel")!;
  const slider     = document.getElementById("speedSlider") as HTMLInputElement | null;
  const speedValue = document.getElementById("speedValue");

  if (!panel || !slider || !speedValue) return;

  // init UI
  slider.value = String(currentSpeedPercent);
  speedValue.textContent = `${currentSpeedPercent}%`;

  // MAJ slider → envoi serveur
  slider.oninput = () => {
    const p = Math.max(0, Math.min(100, Math.round(Number(slider.value) || 0)));
    currentSpeedPercent = p;
    speedValue.textContent = `${p}%`;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "settings:set", speedPercent: p }));
    }
  };

  // Bouton Apply : couleurs + fermeture panneau
  const applyBtn = document.getElementById("applySettings") as HTMLButtonElement | null;
  if (applyBtn) {
    const fresh = applyBtn.cloneNode(true) as HTMLButtonElement;
    applyBtn.replaceWith(fresh);
    fresh.onclick = () => {
      const ballColor   = (document.getElementById("ballColor") as HTMLInputElement).value;
      const paddleColor = (document.getElementById("paddleColor") as HTMLInputElement).value;
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "settings:set", ballColor, paddleColor }));
      }
      panel.style.display = "none";
    };
  }

  // Bouton Settings pour ouvrir/fermer
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


export function startOnlineGame() {
  mode = "online";

  const pause = document.getElementById("pauseBtn") as HTMLButtonElement | null;
  const restart = document.getElementById("restartBtn") as HTMLButtonElement | null;

  ws = new WebSocket(wsBase());

 ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);

  if (msg.type === "player") {
    playerIndex = msg.playerIndex;
    console.log(`Assigné à la room ${msg.roomId} en tant que Player ${msg.playerIndex}`);
  }
  else if (msg.type === "error" && ws != null) {
    alert(msg.message || "Connexion refusée : toutes les salles sont pleines.");
    ws.close();
    return;
  }
  else if (msg.type === "state") {
    latestState = msg.state;
    isPaused = msg.paused;
    if (pause) pause.textContent = isPaused ? "Play" : "Pause";

    // --- Gestion dynamique du bouton Start ---
    const startBtn = document.getElementById("startBtn") as HTMLButtonElement;
    if (startBtn) {
      if (msg.players < 2) {
        startBtn.style.display = "inline-block";
        startBtn.disabled = true;
        startBtn.textContent = "Waiting for player 2...";
      } else if (msg.paused) {
        startBtn.style.display = "inline-block";
        startBtn.disabled = false;
        startBtn.textContent = "Start";
      } else {
        startBtn.style.display = "none";
      }
    }
  }
};


  ws.onopen = () => {
    getStartBtn().style.display = "block";
    getStartBtn().disabled = false;

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
    });

    getStartBtn().onclick = () => {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "start" }));
        getStartBtn().disabled = true;
        getStartBtn().style.display = "none";
      }
    };
  };

  ws.onclose = () => {
    getStartBtn().style.display = "none";
    if (pause) pause.textContent = "Pause";
  };
}

// ---------------- LOCAL (partie simple) ----------------
export function startLocalGame() {
  mode = "local";
  localGame = new PongGame();
  // applique la vitesse mémorisée
  localGame.setSpeedPercent(currentSpeedPercent);
  quickReported = false;

  latestState = {
    ...localGame.state,
    ballColor: localGame.ballColor,
    paddleColor: localGame.paddleColor
  };

  const pause = document.getElementById("pauseBtn") as HTMLButtonElement | null;
  const restart = document.getElementById("restartBtn") as HTMLButtonElement | null;

  getStartBtn().style.display = "block";
  getStartBtn().disabled = false;

  if (localLoop) clearInterval(localLoop);
  localLoop = window.setInterval(() => {
    if (localGame) {
      if (!isPaused) localGame.update();
      latestState = {
        ...localGame.state,
        ballColor: localGame.ballColor,
        paddleColor: localGame.paddleColor
      };

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
            body: JSON.stringify({
              s1,
              s2,
            }),
          }).catch(e => console.warn('Quick Play save failed:', e));
        }
      }
    }
  }, 1000 / 60);

  getStartBtn().onclick = () => {
    if (localGame) {
      localGame.resetBall();
      localGame.Started = true;
      getStartBtn().disabled = true;
      getStartBtn().style.display = "none";
    }
  };

  // Pause
  pause?.addEventListener("click", () => {
    if (!localGame) return;
    if (localGame.GameOver) return;
    if (!localGame.Started && !isPaused) return;

    isPaused = !isPaused;
    if (isPaused) {
      localGame.Started = false;
      pause.textContent = "Play";
    } else {
      localGame.Started = true;
      pause.textContent = "Pause";
    }
  });

  // Restart — conserve currentSpeedPercent
  restart?.addEventListener("click", () => {
    localGame = new PongGame();
    localGame.setSpeedPercent(currentSpeedPercent); // <—
    quickReported = false;
    latestState = localGame.state;
    localGame.resetBall();

    isPaused = true;
    localGame.Started = false;
    localGame.GameOver = false;
    if (pause) pause.textContent = "Play";

    getStartBtn().disabled = false;
    getStartBtn().style.display = "block";

    if (localLoop) clearInterval(localLoop);
    localLoop = window.setInterval(() => {
      if (localGame) {
        if (!isPaused) localGame.update();
        latestState = {
          ...localGame.state,
          ballColor: localGame.ballColor,
          paddleColor: localGame.paddleColor
        };
      }
    }, 1000 / 60);
  });
}

// ---------------- SPA nav inside game container ----------------
function navigateTo(page: "menu" | "game-local" | "game-online") {
  history.pushState({ page }, "", `#${page}`);
  renderPage(page);
}

export function __forceRender(page: "game-local" | "game-online" | "menu") {
  const currentPage = history.state?.page;
  if (currentPage !== page) {
    history.replaceState({ page }, "", `#${page}`);
  }
  renderPage(page);
}

function renderPage(page: string) {
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

      const canvas = document.getElementById("app");
      if (canvas) {
        canvas.querySelectorAll("canvas").forEach(c => c.remove());
        if (p5Instance) { p5Instance.remove(); p5Instance = null; }

        p5Instance = new p5(sketch(() => latestState), canvas);
        resumeSketch();
        startLocalGame();

        // Settings panel dispo + relié
        getStartBtn().style.display    = "block";
        getPauseBtn().style.display    = "block";
        getRestartBtn().style.display  = "block";
        getSettingsBtn().style.display = "block";
        updateCanvasVisibility(true);
        wireSettingsPanel();
      } else {
        console.error("❌ canvas #app not found!");
      }
      break;

    case "game-online":
    cleanupGame();
    menu.style.display = "none";
    gameContainer.style.display = "block";

    const canvasOnline = document.getElementById("app");
    if (canvasOnline) {
      // Supprime d’anciens canvas
      canvasOnline.querySelectorAll("canvas").forEach(c => c.remove());
      if (p5Instance) { p5Instance.remove(); p5Instance = null; }

      // ⚡ Lance p5 avec le state online
      p5Instance = new p5(sketch(() => latestState), canvasOnline);

      resumeSketch();
      startOnlineGame();

      // Boutons (online tu peux afficher Start/Pause/Restart/Settings aussi)
      getStartBtn().style.display    = "block";
      getPauseBtn().style.display    = "block";
      getRestartBtn().style.display  = "block";
      getSettingsBtn().style.display = "block";

      if (ws) wireSettingsPanelOnline(ws);
    // si tu as une variante online
    } else {
      console.error("❌ canvas #app not found!");
    }
    break;
  }
}

// Init (pour l'ancien menu interne si utilisé)
window.addEventListener("DOMContentLoaded", () => {
  const localBtn = document.getElementById("localBtn") as HTMLButtonElement | null;
  const onlineBtn = document.getElementById("onlineBtn") as HTMLButtonElement | null;
  const page = history.state?.page || "menu";

  renderPage(page);

  localBtn?.addEventListener("click", () => navigateTo("game-local"));
  onlineBtn?.addEventListener("click", () => navigateTo("game-online"));
});

window.addEventListener("popstate", () => {
  const page = history.state?.page || "menu";
  renderPage(page);
});

// ---------------- Tournoi: scène unique + jeu auto ----------------
export function showBoardForTournament() {
  const menu = document.getElementById("menu")!;
  const gameContainer = document.getElementById("gamecontainer")!;

  cleanupGame();

  // retire tous les canvases précédents
  const canvasRoot = document.getElementById("app")!;
  canvasRoot.querySelectorAll("canvas").forEach(c => c.remove());

  menu.style.display = "none";
  gameContainer.style.display = "block";

  if (p5Instance) { p5Instance.remove(); p5Instance = null; }
  p5Instance = new p5(sketch(() => latestState), canvasRoot);
  resumeSketch();

  getStartBtn().style.display    = "block";   // caché au démarrage du match
  getPauseBtn().style.display    = "block";
  getRestartBtn().style.display  = "block";
  getSettingsBtn().style.display = "block";
  updateCanvasVisibility(true);

  wireSettingsPanel();
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
    localGame.Started  = true;
    latestState = {
      ...localGame.state,
      ballColor: localGame.ballColor,
      paddleColor: localGame.paddleColor,
    };
  };

  startFreshGame();

  // Start: caché en tournoi (la partie démarre direct)
  const startBtn = getStartBtn();
  startBtn.style.display = "none";

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
