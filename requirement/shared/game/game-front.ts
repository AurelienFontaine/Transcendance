import p5 from "p5";
import { sketch } from "./sketch";
import { PongGame } from "./game-back";
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

let onMatchFinished: ((s1: number, s2: number) => void) | null = null;
let lastGameOver = false;
let localMatchOnceFired = false;

function getStartBtn() {
  return document.getElementById("startBtn") as HTMLButtonElement;
}

function getPauseBtn() {
  return document.getElementById("pauseBtn") as HTMLButtonElement;
}


function getRestartBtn() {
  return document.getElementById("restartBtn") as HTMLButtonElement;
}


function getSettingsBtn() {
  return document.getElementById("settingsBtn") as HTMLButtonElement;
}

let p5Instance: p5 | null = null;

export function showBoardForTournament() {
  // Monte #game-local sans démarrer de partie
  const menu = document.getElementById("menu")!;
  const gameContainer = document.getElementById("gamecontainer")!;

  cleanupGame();              // stoppe boucles/eventuels ws
  
  
  const canvasRoot = document.getElementById("app");
  if (canvasRoot) {
    // 🔒 Garantit un seul canvas
    canvasRoot.querySelectorAll("canvas").forEach(c => c.remove());
  }
    menu.style.display = "none";
    gameContainer.style.display = "block";

    if (p5Instance) {
      p5Instance.remove();
      p5Instance = null;
    }
    p5Instance = new p5(sketch(() => latestState), canvasRoot);
    resumeSketch();           // commence le draw() p5

  // on n’appelle PAS startLocalGame ici (le tournoi gère la partie)
  getStartBtn().style.display = "block";
  getPauseBtn().style.display = "block";
  getRestartBtn().style.display = "block";
  getSettingsBtn().style.display = "block";
  updateCanvasVisibility(true);
}

// 🔁 Reaffectation propre
function pauseSketch() {
  if (p5Instance) p5Instance.noLoop();
}
function resumeSketch() {
  if (p5Instance) p5Instance.loop();
}
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

  getStartBtn().onclick = null;
}

function cleanupGame() {
  console.log("🧹 cleanupGame()");
  pauseSketch();

  if (localLoop) {
    clearInterval(localLoop);
    localLoop = undefined;
  }

  localGame = null;

  if (ws) {
    ws.close();
    ws = null;
  }

  playerIndex = -1;
  isPaused = false;
  latestState = null;

  removeEventListeners();

  getStartBtn().style.display = "none";

  const pause = document.getElementById("pauseBtn") as HTMLButtonElement | null;
  if (pause) pause.textContent = "Pause";
}

// 🌐 Online mode
export function startOnlineGame() {
  console.log("🌐 startOnlineGame()");
  mode = "online";

  const pause = document.getElementById("pauseBtn") as HTMLButtonElement | null;
  const restart = document.getElementById("restartBtn") as HTMLButtonElement | null;

  ws = new WebSocket(`ws://game:3010`);

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === "player") {
      playerIndex = msg.playerIndex;
    } else if (msg.type === "state") {
      latestState = msg.state;
      isPaused = msg.paused;
      if (pause) pause.textContent = isPaused ? "Play" : "Pause";
    }
  };

  ws.onopen = () => {
    console.log("✅ WebSocket OPEN");
    getStartBtn().style.display = "block";
    getStartBtn().disabled = false;

    restart?.addEventListener("click", () => {
      console.log("🔁 Online: reset game");
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "reset" }));
      }
    });

    pause?.addEventListener("click", () => {
      console.log("⏯️ Online: toggle pause");
      if (ws?.readyState !== WebSocket.OPEN) return;
      isPaused = !isPaused;
      ws.send(JSON.stringify({ type: "pause" }));
      if (pause) pause.textContent = isPaused ? "Play" : "Pause";
    });

    getStartBtn().onclick = () => {
      console.log("🚀 Online: start game");
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "start" }));
        getStartBtn().disabled = true;
        getStartBtn().style.display = "none";
      }
    };
  };

  ws.onclose = () => {
    console.log("🔌 WebSocket CLOSED");
    getStartBtn().style.display = "none";
    if (pause) pause.textContent = "Pause";
  };
}

// 🖥️ Local mode
export function startLocalGame() {
  console.log("🖥️ startLocalGame()");
  mode = "local";
  localGame = new PongGame();
  latestState = {
  ...localGame.state,
  ballColor: localGame.ballColor,
  paddleColor: localGame.paddleColor
};
  console.log("🎯 initial latestState:", latestState);
  const pause = document.getElementById("pauseBtn") as HTMLButtonElement | null;
  const restart = document.getElementById("restartBtn") as HTMLButtonElement | null;

  getStartBtn().style.display = "block";
  getStartBtn().disabled = false;

  if (localLoop) clearInterval(localLoop);
  localLoop = window.setInterval(() => {
    if (localGame) {
      if (!isPaused) {
        localGame.update();
      }
      latestState = {
        ...localGame.state,
        ballColor: localGame.ballColor,
        paddleColor: localGame.paddleColor
      };
      console.log("🌀 updated state:", latestState);
    }
  }, 1000 / 60);
  getStartBtn().onclick = () => {
    console.log("🚀 Local: start game");
    if (localGame) {
      localGame.resetBall();
      localGame.Started = true;
      getStartBtn().disabled = true;
      getStartBtn().style.display = "none";
    }
  };

 pause?.addEventListener("click", () => {
  if (!localGame) return;

  if (localGame.GameOver) {
    console.log("🚫 Game is over, cannot toggle pause.");
    return;
  }

  // Si le jeu n’a jamais été démarré (par 'Lancer la partie'), on ne fait rien
  if (!localGame.Started && !isPaused) {
    console.log("🚫 Game not started yet, cannot pause.");
    return;
  }

  isPaused = !isPaused;

  if (isPaused) {
    localGame.Started = false;
    pause.textContent = "Play";
    console.log("⏸ Game paused");
  } else {
    localGame.Started = true;
    pause.textContent = "Pause";
    console.log("▶️ Game resumed");
  }
});


  restart?.addEventListener("click", () => {
    console.log("🔁 Local: reset game");
    localGame = new PongGame();
    latestState = localGame.state;
    localGame.resetBall();

    isPaused = true;
    localGame.Started = false;
    localGame.GameOver = false;
    if (pause) pause.textContent = "Play";  // 🔁 remet le texte correct

    getStartBtn().disabled = false;
    getStartBtn().style.display = "block";

   if (localLoop) clearInterval(localLoop);
    localLoop = window.setInterval(() => {
     if (localGame) {
      if (!isPaused) {
        localGame.update();
      }
      latestState = {
        ...localGame.state,
        ballColor: localGame.ballColor,
        paddleColor: localGame.paddleColor
        };
        console.log("🌀 updated state:", latestState);
     }
    }, 1000 / 60);
  });
}

// 🎮 Clavier
document.addEventListener("keydown", (e) => {
  if (mode === "online" && ws?.readyState === WebSocket.OPEN) {
    let msg: ClientMessage | null = null;
    if (e.key === "ArrowUp") msg = { type: "input", direction: "up" };
    else if (e.key === "ArrowDown") msg = { type: "input", direction: "down" };
    if (msg) ws.send(JSON.stringify(msg));
  }

  if (mode === "local" && localGame) {
    if (e.key === "w") localGame.p1Dir = "up";
    else if (e.key === "s") localGame.p1Dir = "down";
    else if (e.key === "ArrowUp") localGame.p2Dir = "up";
    else if (e.key === "ArrowDown") localGame.p2Dir = "down";
  }
});

document.addEventListener("keyup", (e) => {
  if (mode === "online" && ws?.readyState === WebSocket.OPEN) {
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      const msg: ClientMessage = { type: "input", direction: "stop" };
      ws.send(JSON.stringify(msg));
    }
  }

  if (mode === "local" && localGame) {
    if (e.key === "w" || e.key === "s") localGame.p1Dir = "stop";
    if (e.key === "ArrowUp" || e.key === "ArrowDown") localGame.p2Dir = "stop";
  }
});

// SPA
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
  console.log("📄 renderPage:", page);
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
        if (p5Instance) {
          p5Instance.remove();
          p5Instance = null;
        }

        p5Instance = new p5(sketch(() => latestState), canvas);
        resumeSketch();
        startLocalGame();
      } else {
        console.error("❌ canvas #app not found!");
      }
      const settingsBtn = document.getElementById("settingsBtn");
      const panel = document.getElementById("settingsPanel")!;
      const applyBtn = document.getElementById("applySettings");

      if (settingsBtn && panel) {
        settingsBtn.addEventListener("click", () => {
          const isVisible = panel.style.display === "block";
          panel.style.display = isVisible ? "none" : "block";
        });
      }

      if (applyBtn) {
      applyBtn.addEventListener("click", () => {
        const speed = (document.getElementById("speedSelect") as HTMLSelectElement).value as "slow" | "medium" | "fast";
        const ballColor = (document.getElementById("ballColor") as HTMLInputElement).value;
        const paddleColor = (document.getElementById("paddleColor") as HTMLInputElement).value;

        if (localGame) {
          localGame.setSpeed(speed);
          localGame.setColors(ballColor, paddleColor);
          latestState = {
            ...localGame.state,
            ballColor: localGame.ballColor,
            paddleColor: localGame.paddleColor
          };
        }

        panel.style.display = "none";
      });
      }
      getStartBtn().style.display = "block";
      getPauseBtn().style.display = "block";
      getRestartBtn().style.display = "block";
      getSettingsBtn().style.display = "block";
      updateCanvasVisibility(true);
      break;

    case "game-online":
      cleanupGame();
      menu.style.display = "none";
      gameContainer.style.display = "block";
      updateCanvasVisibility(true);
      resumeSketch();
      startOnlineGame();
      break;

    default:
      renderPage("menu");
  }
}

// Init
// window.addEventListener("DOMContentLoaded", () => {
//   const localBtn = document.getElementById("localBtn")!;
//   const onlineBtn = document.getElementById("onlineBtn")!;
//   const page = history.state?.page || "menu";

//   renderPage(page);

//   localBtn.addEventListener("click", () => navigateTo("game-local"));
//   onlineBtn.addEventListener("click", () => navigateTo("game-online"));
// });

// window.addEventListener("popstate", () => {
//   const page = history.state?.page || "menu";
//   renderPage(page);
// });


// ==== TOURNOI LOCAL ====

export function prepareLocalBoard() {
  const canvas = document.getElementById("app");
  if (canvas) {
    // évite doublons si un sketch existait déjà
    (window as any).__p5Instance?.remove?.();
    const instance = new p5(sketch(() => latestState), canvas);
    (window as any).__p5Instance = instance;
    p5Instance = instance;
    updateCanvasVisibility(true);
  }
}

function getScoresFromState(st: any): { s1: number; s2: number } {
  const sc = st?.score || {};
  // essaie p1/p2 puis left/right puis 0
  const s1 = (typeof sc.p1 === "number" ? sc.p1 : (typeof sc.left === "number" ? sc.left : 0)) | 0;
  const s2 = (typeof sc.p2 === "number" ? sc.p2 : (typeof sc.right === "number" ? sc.right : 0)) | 0;
  return { s1, s2 };
}

/**
 * Lance un match local p1 vs p2 et appelle onEnd({p1,p2,s1,s2}) quand le match se termine.
 */
  /**
 * Lance un match local p1 vs p2 et appelle onEnd({p1,p2,s1,s2}) quand le match se termine.
 * IMPORTANT: ne crée PAS de nouveau canvas. Le canvas est créé par forceGameRender("game-local").
 */
export function startLocalMatch(
  p1: string,
  p2: string,
  onEnd: (res: { p1: string; p2: string; s1: number; s2: number }) => void
) {
  // S’assurer qu’un canvas existe déjà (créé par forceGameRender)
  // const hasCanvas = !!document.querySelector("#app canvas");
  // if (!hasCanvas) {
  //   // on est prudent : si le canvas n’existe pas, on le crée via notre routeur interne
  //   __forceRender("game-local"); // <- cette fonction est déjà exportée dans le fichier
  // }
  if (localLoop) { clearInterval(localLoop); localLoop = undefined; }
  // Afficher les boutons (aucune création DOM ici)
  getStartBtn().style.display = "block";
  getPauseBtn().style.display  = "block";
  getRestartBtn().style.display= "block";
  getSettingsBtn().style.display= "block";

  // Nettoyer une éventuelle boucle en cours
  if (localLoop) {
    clearInterval(localLoop);
    localLoop = undefined;
  }

  // Préparer une nouvelle partie sans toucher au canvas/p5
  mode = "local";
  isPaused = false;
  localGame = new PongGame();

  latestState = {
    ...localGame.state,
    ballColor: localGame.ballColor,
    paddleColor: localGame.paddleColor,
  };

  // Démarrer immédiatement (ou laissez le bouton Start si vous préférez)
  localGame.resetBall();
  localGame.Started = true;

  // Boucle de jeu
  localLoop = window.setInterval(() => {
    if (!localGame) return;

    if (!isPaused) {
      localGame.update();
    }

    latestState = {
      ...localGame.state,
      ballColor: localGame.ballColor,
      paddleColor: localGame.paddleColor,
    };

    // Fin de match -> callback tournoi
    if (localGame.GameOver) {
      const s1 = localGame.state.score.p1 ?? 0;
      const s2 = localGame.state.score.p2 ?? 0;

      clearInterval(localLoop!);
      localLoop = undefined;

      // cacher Start pour ne pas relancer par accident
      getStartBtn().style.display = "none";

      onEnd({ p1, p2, s1, s2 });
    }
  }, 1000 / 60);
}
