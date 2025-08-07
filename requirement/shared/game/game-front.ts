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

const startBtn = document.createElement("button");
startBtn.id = "startBtn";
startBtn.innerText = "Lancer la partie";
startBtn.style.position = "absolute";
startBtn.style.top = "50%";
startBtn.style.left = "50%";
startBtn.style.transform = "translate(-50%, -50%)";
startBtn.style.padding = "1rem 2rem";
startBtn.style.fontSize = "1.2rem";
startBtn.style.display = "none";
document.body.appendChild(startBtn);

let p5Instance: p5 | null = null;

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

  startBtn.onclick = null;
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

  startBtn.style.display = "none";

  const pause = document.getElementById("pauseBtn") as HTMLButtonElement | null;
  if (pause) pause.textContent = "Pause";
}

//Bouton Parametres
document.getElementById("settingsBtn")?.addEventListener("click", () => {
  const panel = document.getElementById("settingsPanel");
  if (panel) panel.style.display = panel.style.display === "none" ? "block" : "none";
});

document.getElementById("applySettings")?.addEventListener("click", () => {
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
  //Ferme apres Appliquer
  const panel = document.getElementById("settingsPanel");
  if (panel) panel.style.display = "none";
});


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
    startBtn.style.display = "block";
    startBtn.disabled = false;

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

    startBtn.onclick = () => {
      console.log("🚀 Online: start game");
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "start" }));
        startBtn.disabled = true;
        startBtn.style.display = "none";
      }
    };
  };

  ws.onclose = () => {
    console.log("🔌 WebSocket CLOSED");
    startBtn.style.display = "none";
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

  startBtn.style.display = "block";
  startBtn.disabled = false;

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
  startBtn.onclick = () => {
    console.log("🚀 Local: start game");
    if (localGame) {
      localGame.resetBall();
      localGame.Started = true;
      startBtn.disabled = true;
      startBtn.style.display = "none";
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

    // startBtn.disabled = false;
    // startBtn.style.display = "block";

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
      startBtn.style.display = "none";
      updateCanvasVisibility(false);
      pauseSketch();
      break;

    case "game-local":
      cleanupGame();
      menu.style.display = "none";
      gameContainer.style.display = "block";
      updateCanvasVisibility(true);

      const canvas = document.getElementById("app");
      if (canvas) {
        console.log("OUIIIIIIIIIIIIIIIIIIIIIIII");
        p5Instance = new p5(sketch(() => latestState), canvas);
        resumeSketch();
        startLocalGame();
      } else {
        console.error("❌ canvas #app not found!");
      }
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
window.addEventListener("DOMContentLoaded", () => {
  const localBtn = document.getElementById("localBtn")!;
  const onlineBtn = document.getElementById("onlineBtn")!;
  const page = history.state?.page || "menu";

  renderPage(page);

  localBtn.addEventListener("click", () => navigateTo("game-local"));
  onlineBtn.addEventListener("click", () => navigateTo("game-online"));
});

window.addEventListener("popstate", () => {
  const page = history.state?.page || "menu";
  renderPage(page);
});
