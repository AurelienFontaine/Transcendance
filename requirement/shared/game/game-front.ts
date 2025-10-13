import p5 from "p5";
import { sketch } from "./sketch";
import { PongGame } from "./game-back";
import { apiBase } from "../../src/utils";
import { getGameTimer, clearGameTimer, getCurrentTimer } from "./timer";

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

// --- Helper functions for translated button texts ---
function getPlayText(): string {
  return (window as any).t ? `▶️ ${(window as any).t('play.playBtn')}` : "▶️ Play";
}

function getPauseText(): string {
  return (window as any).t ? `⏸️ ${(window as any).t('play.pauseBtn')}` : "⏸️ Pause";
}

function getWaitingForPlayerText(): string {
  return (window as any).t ? (window as any).t('play.waitingForPlayer') : "Waiting for Player...";
}

function getWaitingForPlayer2Text(): string {
  return (window as any).t ? (window as any).t('play.waitingForPlayer2') : "Waiting for player 2...";
}

function getWaitingText(): string {
  return (window as any).t ? (window as any).t('play.waiting') : "Waiting...";
}

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

// Helper functions for Tailwind class management
function showElement(el: HTMLElement) {
  el.classList.remove('hidden', '!hidden');
  el.classList.add('!block');
}

function hideElement(el: HTMLElement) {
  el.classList.remove('!block', 'block');
  el.classList.add('hidden');
}

function enableButton(btn: HTMLButtonElement) {
  btn.disabled = false;
  btn.classList.remove('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
  btn.classList.add('opacity-100', 'cursor-pointer', 'pointer-events-auto');
}

function disableButton(btn: HTMLButtonElement) {
  btn.disabled = true;
  btn.classList.remove('opacity-100', 'cursor-pointer', 'pointer-events-auto');
  btn.classList.add('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
}

// Expose localGame globally for settings
declare global {
  interface Window {
    localGame: PongGame | null;
    updateLatestState: () => void;
  }
}
let localLoop: number | undefined;

let p5Instance: p5 | null = null;

// 🔧 vitesse choisie via le slider (0..100). Sert de source de vérité.
let currentSpeedPercent = 50;
let quickReported = false; // used only for Quick Play (startLocalGame)
let hasBeenStarted = false; // Track if the game has been started at least once

let wasRunningBeforeSettings = false; // mémorise l'état avant ouverture du panneau

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
      hideElement(panel);
    };
  }

  // Bouton d’ouverture/fermeture
  const btn = getSettingsBtn();
  if (btn) {
    const freshBtn = btn.cloneNode(true) as HTMLButtonElement;
    btn.replaceWith(freshBtn);
    freshBtn.onclick = () => {
      const show = panel.classList.contains('hidden');
      if (show) {
        showElement(panel);
      } else {
        hideElement(panel);
      }
    };
  }
}

// ---------------- p5 helpers ----------------
function pauseSketch()   { if (p5Instance) p5Instance.noLoop(); }
function resumeSketch()  { if (p5Instance) p5Instance.loop(); }
function updateCanvasVisibility(visible: boolean) {
  const app = document.getElementById("gameApp")!;
  if (visible) {
    showElement(app);
  } else {
    hideElement(app);
  }
}

function updateSettingsButtonVisibility() {
  const settingsBtn = getSettingsBtn();
  const restartBtn = getRestartBtn();
  const pauseBtn = getPauseBtn();
  
  const timer = getCurrentTimer();
  const isTimerActive = timer && timer.isRunning();
  
  if (settingsBtn) {
    // Show settings button when:
    // 1. Game is paused, OR
    // 2. Game hasn't started yet (local game only)
    // BUT NOT during timer countdown
    // AND NOT when game is running (Started = true AND not paused)
    const isGameRunning = localGame && localGame.Started && !isPaused && !localGame.GameOver;
    const shouldShow = (isPaused || (mode === "local" && localGame && !localGame.Started)) && !isTimerActive && !isGameRunning;
    if (shouldShow) {
      showElement(settingsBtn);
    } else {
      hideElement(settingsBtn);
    }
    settingsBtn.disabled = isTimerActive;
  }
  
  if (restartBtn) {
    // Restart button is always visible but disabled during timer
    restartBtn.disabled = isTimerActive;
  }
  
  if (pauseBtn) {
    // Pause/Play button is disabled during timer for better UX
    if (isTimerActive) {
      disableButton(pauseBtn);
    } else {
      enableButton(pauseBtn);
    }
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
  if (settingsPanel) hideElement(settingsPanel);

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


/**
 * Update the latest state with current game properties
 */
export function updateLatestState(): void {
  if (localGame && latestState) {
    latestState = {
      ...localGame.state,
      ballColor: localGame.ballColor,
      paddleColor: localGame.paddleColor,
      paddleHeight: localGame.paddleHeight,
      ball: {
        ...localGame.state.ball,
        radius: localGame.getBallRadius()
      }
    };
    console.log("🔄 Updated latestState with new sizes:", {
      ballRadius: latestState.ball.radius,
      paddleHeight: latestState.paddleHeight
    });
  }
}

export function cleanupGame() {
  pauseSketch();
  if (localLoop) { clearInterval(localLoop); localLoop = undefined; }
  localGame = null;

  if (ws) { ws.close(); ws = null; }

  playerIndex = -1;
  isPaused = false;
  latestState = null;
  quickReported = false; // Reset quick play report flag
  currentSpeedPercent = 50; // Reset speed to default
  hasBeenStarted = false; // Reset start flag

  // Clear any active timer (countdown timer between points or at start)
  clearGameTimer();

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
    if (el) hideElement(el);
  });

  const settingsPanel = document.getElementById("settingsPanel");
  if (settingsPanel) hideElement(settingsPanel);

  const container = document.getElementById("gamecontainer");
  if (container) hideElement(container);
}


// ---------------- ONLINE ----------------

// wsBase function moved to game-websocket.ts

// wireSettingsPanelOnline moved to game-ui-helpers.ts

// ---------------- ONLINE ----------------
export async function startOnlineGame() {
  mode = "online";

  const pause = getPauseBtn();
  const restart = getRestartBtn();

  // Variable pour suivre si le jeu a déjà été démarré au moins une fois
  let gameHasStarted = false;

  // Wait a bit for authentication to be properly set up
  await new Promise(resolve => setTimeout(resolve, 100));

  // Get user token for authentication
  const token = localStorage.getItem("token");
  const userId = localStorage.getItem("id");
  
  // Determine authentication data
  let authToken = token;
  let authUserId = userId;
  
  if (!token || !userId) {
    // Temporarily use dummy values for testing
    authToken = "dummy-token-for-testing";
    authUserId = Math.random().toString(36).substr(2, 9);
  }

  // Create WebSocket connection with determined auth data
  const wsUrl = `${wsBase()}?token=${encodeURIComponent(authToken)}&userId=${encodeURIComponent(authUserId)}`;
  
  try {
    ws = new WebSocket(wsUrl);
  } catch (error) {
    console.error("[WebSocket] Failed to create WebSocket:", error);
    alert("Failed to connect to game server");
    return;
  }

  ws.onopen = () => {
    const startBtn = getStartBtn();
    showElement(startBtn);
    startBtn.disabled = true;
    startBtn.textContent = getWaitingForPlayer2Text();
    startBtn.onclick = null;
  };

  ws.onerror = (error) => {
    console.error("[WebSocket] Connection error:", error);
    const startBtn = getStartBtn();
    showElement(startBtn);
    startBtn.disabled = true;
    startBtn.textContent = "Connection Error - Check SSL";
    
    // Show detailed error to user with better instructions
    const hostname = window.location.hostname;
    const instructions = `
🎮 Online Game Setup Required

To enable secure multiplayer gaming, please:

1. Open a new tab and visit: https://${hostname}:3010
2. Accept the SSL security warning (click "Advanced" → "Accept Risk")
3. You'll see a confirmation page
4. Close that tab and refresh this page
5. Try the online game again

This is required for secure WebSocket connections (wss://) as mandated by the project requirements.
    `.trim();
    
    alert(instructions);
  };

  ws.onclose = (event) => {
    const startBtn = getStartBtn();
    hideElement(startBtn);
    if (pause) pause.textContent = getPauseText();
  };

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);

    if (msg.type === "player") {
      playerIndex = msg.playerIndex;
    }
    else if (msg.type === "game_paused") {
      // Update the pause button to show "Play" since game is paused
      const pause = getPauseBtn();
      if (pause) {
        pause.textContent = getPlayText();
        showElement(pause);
        // Disable the button if we don't have 2 players
        if (msg.reason === 'player_disconnected') {
          pause.disabled = true;
          pause.textContent = getWaitingForPlayerText();
        } else {
          pause.disabled = false;
        }
      }
      
      // Hide the start button since game is paused, not stopped
      const startBtn = getStartBtn();
      if (startBtn) {
        hideElement(startBtn);
      }
    }
    // Message players_ready supprimé - le bouton Start est géré par la logique d'état
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
      // Preserve local color and size changes when updating from server
      const currentSettings = latestState ? {
        ballColor: latestState.ballColor,
        paddleColor: latestState.paddleColor,
        ball: latestState.ball ? {
          ...msg.state.ball,
          radius: latestState.ball.radius
        } : msg.state.ball,
        paddleHeight: latestState.paddleHeight
      } : {};
      
      latestState = {
        ...msg.state,
        ...currentSettings,
        isPlayer1Current: playerIndex === 0,
        isPlayer2Current: playerIndex === 1
      };
      isPaused = msg.paused;
      if (pause) pause.textContent = isPaused ? getPlayText() : getPauseText();
      updateSettingsButtonVisibility();
      const pauseBtn = getPauseBtn();

      if (msg.players < 2) {
        // désactive totalement le bouton Play/Pause
        if (pauseBtn) {
          pauseBtn.disabled = true;
          pauseBtn.classList.add('pointer-events-none');
        }
      } else {
        // quand 2 joueurs → réactiver
        if (pauseBtn) {
          pauseBtn.disabled = false;
          pauseBtn.classList.remove('pointer-events-none');
        }
      }
      const startBtn = getStartBtn();

      if (startBtn) {
        if (msg.players < 2) {
          // Pas assez de joueurs → bouton visible mais inactif (message d'attente)
          showElement(startBtn);
          startBtn.disabled = true;
          startBtn.textContent = getWaitingForPlayer2Text();
          startBtn.onclick = null;
          startBtn.classList.add('pointer-events-none');
        } else if (msg.players === 2 && msg.paused && !gameHasStarted) {
          // 2 joueurs connectés et jeu en pause ET jeu pas encore démarré → bouton Start activé
          showElement(startBtn);
          startBtn.disabled = false;
          startBtn.textContent = "Start Game";
          startBtn.classList.remove('pointer-events-none');
          startBtn.onclick = () => {
            // Marquer que le jeu a commencé
            gameHasStarted = true;
            
            // Envoyer au serveur pour qu'il notifie tous les clients
            ws.send(JSON.stringify({ type: 'startTimer' }));
          };
        } else if (msg.paused) {
        // 2 joueurs et partie en pause → Mais le bouton Start/Resume ne doit PAS s'afficher
        // pendant le jeu, seulement avant le début. Le bouton Pause/Play gère la pause.
        hideElement(startBtn);
        startBtn.disabled = true;
        startBtn.onclick = null;
      } else {
        // Partie en cours → Start caché
        hideElement(startBtn);
        startBtn.disabled = true;
        startBtn.onclick = null;
        startBtn.classList.add('pointer-events-none');
      }
      }
    }
    else if (msg.type === "gameStarting") {
      // Marquer que le jeu a commencé pour tous les joueurs
      gameHasStarted = true;
      hasBeenStarted = true; // Also mark for pause button control
      
      // Clear any existing timer
      clearGameTimer();
      
      // Hide start button for all players
      const startBtn = getStartBtn();
      if (startBtn) {
        hideElement(startBtn);
      }
      
      // Enable Play/Pause button for online mode
      const pauseBtn = getPauseBtn();
      if (pauseBtn) {
        pauseBtn.disabled = false;
        enableButton(pauseBtn);
      }
      
      // Start countdown timer
      const timer = getGameTimer(
        () => {
          // Timer completed - start the game
          ws.send(JSON.stringify({ type: 'start' }));
          if (startBtn) {
            startBtn.disabled = true;
            hideElement(startBtn);
          }
        },
        () => {
          // Timer starts - nothing to do (button already hidden)
        }
        // No onStop callback - we don't want to do anything when initial timer stops
      );
      
      timer.start(1000); // 1 second per countdown
    }
    else if (msg.type === "gameReset") {
      // Remettre le jeu en état initial pour tous les joueurs
      gameHasStarted = false;
      hasBeenStarted = false; // Also reset for pause button control
      
      // Disable Play/Pause button for online mode
      const pauseBtn = getPauseBtn();
      if (pauseBtn) {
        pauseBtn.disabled = true;
        disableButton(pauseBtn);
        pauseBtn.textContent = getPauseText();
      }
      
      // Annuler le timer en cours si actif
      clearGameTimer();
    }
    else if (msg.type === "pointScored") {
      // Check if game will be over after this point (only when someone reaches 5)
      const willBeGameOver = (msg.score.p1 >= 5 || msg.score.p2 >= 5);
      
      if (!willBeGameOver) {
        // Only start timer if game is not ending
        clearGameTimer();
        const timer = getGameTimer(
          () => {
            // Timer completed - signal server to resume game
            if (ws?.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'timerCompleted' }));
            }
          },
          () => {
            // Timer starts - nothing to do (game continues automatically)
          },
          () => {
            // Timer stops - nothing to do
          },
          true // isPointTimer
        );
        
        timer.start(1000); // 1 second per countdown
      }
    }

  };

  ws.onopen = () => {
    const startBtn = getStartBtn();
    showElement(startBtn);
    startBtn.disabled = true;
    startBtn.textContent = getWaitingForPlayer2Text();
    startBtn.onclick = null; 

    // Set up restart button
    if (restart) {
      restart.onclick = () => {
        // Annuler le timer en cours si actif
        const timer = getCurrentTimer();
        if (timer && timer.isRunning()) {
          clearGameTimer();
        }
        
        // Remettre le jeu en état initial
        gameHasStarted = false;
        
        if (ws?.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "reset" }));
        }
      };
    }

    // Set up pause button
    if (pause) {
      pause.onclick = () => {
        // Ne rien faire si le jeu n'a jamais été démarré
        if (!hasBeenStarted) return;
        
        // Ne pas permettre de pause/play pendant le timer
        const timer = getCurrentTimer();
        if (timer && timer.isRunning()) {
          return;
        }
        
        if (ws?.readyState !== WebSocket.OPEN) return;
        isPaused = !isPaused;
        ws.send(JSON.stringify({ type: "pause" }));
        pause.textContent = isPaused ? getPlayText() : getPauseText();
        updateSettingsButtonVisibility();
      };
    }
  };

  ws.onclose = () => {
    // hideElement(getStartBtn());
	const startBtn = getStartBtn();
    if (startBtn) hideElement(startBtn);
    if (pause) pause.textContent = getPauseText();
  };

      // Wire settings panel for online game (with delay to ensure DOM is ready)
      setTimeout(() => {
        if (ws) {
          wireSettingsPanelOnline(ws, currentSpeedPercent, (newState) => { 
            latestState = newState; 
          }, (window as any).t);
        }
      }, 100);
}


// ---------------- LOCAL (partie simple) ----------------
export function startLocalGame() {
  mode = "local";
  localGame = createLocalGame(currentSpeedPercent);
  window.localGame = localGame; // Expose globally for settings
  window.updateLatestState = updateLatestState; // Expose update function globally
  quickReported = false;
  
    // Set up point scored callback for timer
    localGame.onPointScored = () => {
      if (localGame && !localGame.GameOver) {
        // Check if game will be over after this point (only when someone reaches 5)
        const willBeGameOver = (localGame.state.score.p1 >= 5 || localGame.state.score.p2 >= 5);
        
        if (!willBeGameOver) {
          // Only start timer if game is not ending
          localGame.Started = false;
          clearGameTimer();
          const timer = getGameTimer(
            () => {
              // Timer completed - resume the game
              localGame.Started = true;
              updateSettingsButtonVisibility(); // Hide settings button when game resumes
            },
            () => {
              // Timer starts - hide settings button immediately
              updateSettingsButtonVisibility();
            },
            () => {
              // Timer stops - don't show start button during game
            },
            true // This is a point timer, don't call onStop callback
          );
          timer.start(1000); // 1 second per countdown
        }
      }
    };

  latestState = {
    ...localGame.state,
    ballColor: localGame.ballColor,
    paddleColor: localGame.paddleColor,
    player1Name: "Player 1",
    player2Name: "Player 2",
    player1Controls: "W/S",
    player2Controls: "O/L",
    isPlayer1Current: true,
    isPlayer2Current: true,
    paddleHeight: localGame.paddleHeight,
    gameOver: localGame.GameOver,
    ball: {
      ...localGame.state.ball,
      radius: localGame.getBallRadius()
    }
  };

  // Create sketch for local game
  const canvasRoot = document.getElementById("gameApp");
  if (canvasRoot) {
    // Clean up any existing sketch first
    if (p5Instance) { 
      p5Instance.remove(); 
      p5Instance = null; 
    }
    
    // Remove old canvas elements
    canvasRoot.querySelectorAll("canvas").forEach(c => {
      c.remove();
    });
    
    p5Instance = new p5(sketch(() => {
      return latestState;
    }), canvasRoot);
    resumeSketch();
  }

  showElement(getStartBtn());
  getStartBtn().disabled = false;

  getStartBtn().onclick = () => {
    if (localGame) {
      // Close settings panel if open before starting
      const settingsPanel = document.getElementById("settingsPanel");
      if (settingsPanel) {
        hideElement(settingsPanel);
      }
      
      // Clear any existing timer
      clearGameTimer();
      
      // Mark game as started
      hasBeenStarted = true;
      
      // Enable Play/Pause button
      const pauseBtn = getPauseBtn();
      if (pauseBtn) {
        pauseBtn.textContent = getPauseText(); // Reset text to "Pause"
        pauseBtn.disabled = false;
        enableButton(pauseBtn);
      }
      
      // Start countdown timer
      const timer = getGameTimer(
        () => {
          // Timer completed - start the game
          if (localGame) {
            localGame.resetBall();
            localGame.Started = true;
            isPaused = false;
            getStartBtn().disabled = true;
            hideElement(getStartBtn());
            updateSettingsButtonVisibility(); // Hide settings button when game starts
          }
        },
        () => {
          // Timer starts - hide start button and settings button
          hideElement(getStartBtn());
          updateSettingsButtonVisibility();
        }
        // No onStop callback - we don't want to do anything when initial timer stops
      );
      
      timer.start(1000); // 1 second per countdown
    }
  };

  const pause = getPauseBtn();
  
  // Disable Play/Pause button initially until game is started
  if (pause) {
    pause.textContent = getPauseText(); // Reset text to "Pause"
    pause.disabled = true;
    disableButton(pause);
  }
  
  pause?.addEventListener("click", () => {
    if (!localGame || localGame.GameOver) return;
    
    // Ne rien faire si le jeu n'a jamais été démarré
    if (!hasBeenStarted) return;

    if (isPaused) {
      // Close settings panel if open before resuming
      const settingsPanel = document.getElementById("settingsPanel");
      if (settingsPanel) {
        hideElement(settingsPanel);
      }
      
      // Resuming from pause - start countdown timer
      clearGameTimer();
      const timer = getGameTimer(() => {
        // Timer completed - resume the game
        if (localGame) {
          isPaused = false;
          localGame.Started = true;
          if (pause) pause.textContent = getPauseText();
          updateSettingsButtonVisibility();
        }
      }, () => {
        // Timer starts - hide settings button immediately
        updateSettingsButtonVisibility();
      });
      timer.start(1000); // 1 second per countdown
    } else if (localGame.Started) {
      // Pausing the game
      isPaused = true;
      localGame.Started = false;
      if (pause) pause.textContent = getPlayText();
      updateSettingsButtonVisibility();
    }
  });

  const restart = getRestartBtn();
  restart?.addEventListener("click", () => {
    // Close settings panel if open
    const settingsPanel = document.getElementById("settingsPanel");
    if (settingsPanel) {
      hideElement(settingsPanel);
    }
    
    // Annuler le timer en cours si actif
    const timer = getCurrentTimer();
    if (timer && timer.isRunning()) {
      clearGameTimer();
    }
    
    // Préserver les paramètres actuels depuis l'interface
    const ballColor = (document.getElementById("ballColor") as HTMLInputElement)?.value || "#FFFFFF";
    const paddleColor = (document.getElementById("paddleColor") as HTMLInputElement)?.value || "#FFFFFF";
    const ballSize = (document.getElementById("ballSize") as HTMLSelectElement)?.value || "normal";
    const paddleSize = (document.getElementById("paddleSize") as HTMLSelectElement)?.value || "normal";
    
    localGame = new PongGame();
    localGame.setSpeedPercent(currentSpeedPercent);
    
  // Expose globally for settings
  window.localGame = localGame;
  window.updateLatestState = updateLatestState;
  window.updateSettingsButtonVisibility = updateSettingsButtonVisibility;
    window.updateSettingsButtonVisibility = updateSettingsButtonVisibility;
    
    // Appliquer les paramètres préservés
    localGame.setColors(ballColor, paddleColor);
    localGame.setBallSize(ballSize as 'small' | 'normal' | 'large');
    localGame.setPaddleSize(paddleSize as 'small' | 'normal' | 'large');
    
    quickReported = false;
    isPaused = false; // Reset pause state after restart
    hasBeenStarted = false; // Reset start flag after restart
    
    // Reset pause button text to "Pause" and disable it
    if (pause) {
      pause.textContent = getPauseText();
      pause.disabled = true;
      disableButton(pause);
    }
    
    // Show Start button after restart
    const startBtn = getStartBtn();
    if (startBtn) {
      showElement(startBtn);
      startBtn.disabled = false;
      startBtn.textContent = "Start Game";
    }
    
    latestState = {
      ...localGame.state,
      ballColor: localGame.ballColor,
      paddleColor: localGame.paddleColor,
      paddleHeight: localGame.paddleHeight,
      gameOver: localGame.GameOver,
      ball: {
        ...localGame.state.ball,
        radius: localGame.getBallRadius()
      }
    };
    localGame.resetBall();

    // Set up point scored callback for timer (same as in startLocalGame)
    localGame.onPointScored = () => {
      if (localGame && !localGame.GameOver) {
        // Check if game will be over after this point (only when someone reaches 5)
        const willBeGameOver = (localGame.state.score.p1 >= 5 || localGame.state.score.p2 >= 5);
        
        if (!willBeGameOver) {
          // Only start timer if game is not ending
          localGame.Started = false;
          clearGameTimer();
          const timer = getGameTimer(
            () => {
              // Timer completed - resume the game
              localGame.Started = true;
              updateSettingsButtonVisibility(); // Hide settings button when game resumes
            },
            () => {
              // Timer starts - hide settings button immediately
              updateSettingsButtonVisibility();
            },
            () => {
              // Timer stops - don't show start button during game
            },
            true // This is a point timer, don't call onStop callback
          );
          timer.start(1000); // 1 second per countdown
        }
      }
    };

    isPaused = true;
    localGame.Started = false;
    localGame.GameOver = false;
    if (pause) pause.textContent = getPlayText();

    getStartBtn().disabled = false;
    showElement(getStartBtn());
    updateSettingsButtonVisibility();
    
    // Réinitialiser le panneau de paramètres avec la nouvelle instance du jeu
    wireSettingsPanel(currentSpeedPercent, localGame, (state) => { latestState = state; }, (speed) => { currentSpeedPercent = speed; }, (window as any).t);
  });

  // --- Boucle de jeu ---
  function loopStart() {
    localLoop = window.setInterval(() => {
      if (localGame) {
        latestState = {
          ...updateLocalGameState(localGame, isPaused),
          player1Name: "Player 1",
          player2Name: "Player 2",
          player1Controls: "W/S",
          player2Controls: "O/L",
          isPlayer1Current: true,
          isPlayer2Current: true,
          gameOver: localGame.GameOver
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
  const menu = document.getElementById("menu")!;
  const gameContainer = document.getElementById("gamecontainer")!;
  switch (page) {
    case "menu":
      cleanupGame();
      mode = "menu";
      showElement(menu);
      hideElement(gameContainer);
      hideElement(getStartBtn());
      hideElement(getPauseBtn());
      hideElement(getRestartBtn());
      hideElement(getSettingsBtn());
      updateCanvasVisibility(false);
      pauseSketch();
      break;

    case "game-local":
  cleanupGame();
  hideElement(menu);
  showElement(gameContainer);

  const canvas = document.getElementById("gameApp");
  if (canvas) {
    // Supprimer d’anciens canvas + instance p5
    canvas.querySelectorAll("canvas").forEach(c => c.remove());
    if (p5Instance) { p5Instance.remove(); p5Instance = null; }

    // ⚡ Correction : startLocalGame() will create the sketch
    startLocalGame();

    // Settings panel dispo + relié
  showElement(getStartBtn());
  showElement(getPauseBtn());
  showElement(getRestartBtn());
  hideElement(getSettingsBtn()); // Will be updated by updateSettingsButtonVisibility()
  updateCanvasVisibility(true);
  updateSettingsButtonVisibility(); // Show settings button initially for local game
    // Wire settings panel for local game (with delay to ensure DOM is ready)
    setTimeout(() => {
      wireSettingsPanel(currentSpeedPercent, localGame, (state) => { latestState = state; }, (speed) => { currentSpeedPercent = speed; }, (window as any).t);
    }, 100);
  } else {
    console.error("❌ canvas #app not found!");
  }
  break;


  case "game-online":
    cleanupGame();
    hideElement(menu);
    showElement(gameContainer);

    const canvasOnline = document.getElementById("gameApp");
    if (canvasOnline) {
      // Supprime d'anciens canvas
      canvasOnline.querySelectorAll("canvas").forEach(c => c.remove());

      // Initialize with default state for online game
      latestState = {
        ball: { x: 400, y: 300 },
        paddles: { p1: 300, p2: 300 },
        score: { p1: 0, p2: 0 },
        ballColor: "#FFFFFF",
        paddleColor: "#FFFFFF",
        player1Name: "Player 1",
        player2Name: "Player 2",
        player1Controls: "W/S",
        player2Controls: "W/S",
        isPlayer1Current: false,
        isPlayer2Current: false
      };

      p5Instance = new p5(sketch(() => {
        return latestState;
      }), canvasOnline);
      resumeSketch();
      startOnlineGame().catch((error) => {
        console.error("[Online Game] startOnlineGame() failed:", error);
      });

      // Boutons (online tu peux afficher Start/Pause/Restart/Settings aussi)
  hideElement(getStartBtn()); // Hidden initially, shown after WebSocket connection
  showElement(getPauseBtn());
  showElement(getRestartBtn());
  hideElement(getSettingsBtn()); // Hidden initially, shown only when paused
  
  // Disable Play/Pause button initially for online mode
  const onlinePauseBtn = getPauseBtn();
  if (onlinePauseBtn) {
    onlinePauseBtn.disabled = true;
    disableButton(onlinePauseBtn);
  }

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

  hideElement(menu);
  showElement(gameContainer);

  // Initialize a temporary game for settings to work before match starts
  mode = "local";
  localGame = new PongGame();
  localGame.Started = false;
  localGame.GameOver = false;
  isPaused = true; // Consider it paused until match starts
  
  // Expose globally for settings
  window.localGame = localGame;
  window.updateLatestState = updateLatestState;
  window.updateSettingsButtonVisibility = updateSettingsButtonVisibility;
  
  latestState = {
    ...localGame.state,
    ballColor: localGame.ballColor,
    paddleColor: localGame.paddleColor,
    player1Name: getWaitingText(),
    player2Name: getWaitingText(),
    player1Controls: "W/S",
    player2Controls: "O/L",
    isPlayer1Current: true,
    isPlayer2Current: true,
    paddleHeight: localGame.paddleHeight,
    gameOver: false,
    ball: {
      ...localGame.state.ball,
      radius: localGame.getBallRadius()
    }
  };

  if (p5Instance) { p5Instance.remove(); p5Instance = null; }
  p5Instance = new p5(sketch(() => {
    return latestState;
  }), canvasRoot);
  resumeSketch();

  showElement(getStartBtn());   // caché au démarrage du match
  showElement(getPauseBtn());
  showElement(getRestartBtn());
  hideElement(getSettingsBtn()); // Will be updated by updateSettingsButtonVisibility()
  updateCanvasVisibility(true);
  updateSettingsButtonVisibility(); // Show settings button initially for local game

  // Wire settings panel for local game (with delay to ensure DOM is ready)
  setTimeout(() => {
    wireSettingsPanel(currentSpeedPercent, localGame, (state) => { latestState = state; }, (speed) => { currentSpeedPercent = speed; }, (window as any).t);
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
    
  // Expose globally for settings
  window.localGame = localGame;
  window.updateLatestState = updateLatestState;
  window.updateSettingsButtonVisibility = updateSettingsButtonVisibility;
    
    // Set up point scored callback for timer
    localGame.onPointScored = () => {
      if (localGame && !localGame.GameOver) {
        // Check if game will be over after this point (only when someone reaches 5)
        const willBeGameOver = (localGame.state.score.p1 >= 5 || localGame.state.score.p2 >= 5);
        
        if (!willBeGameOver) {
          // Only start timer if game is not ending
          localGame.Started = false;
          clearGameTimer();
          const timer = getGameTimer(
            () => {
              // Timer completed - resume the game
              localGame.Started = true;
              updateSettingsButtonVisibility(); // Hide settings button when game resumes
            },
            () => {
              // Timer starts - hide settings button immediately
              updateSettingsButtonVisibility();
            },
            () => {
              // Timer stops - don't show start button during game
            },
            true // This is a point timer, don't call onStop callback
          );
          timer.start(1000); // 1 second per countdown
        }
      }
    };
    latestState = {
      ...localGame.state,
      ballColor: localGame.ballColor,
      paddleColor: localGame.paddleColor,
      player1Name: p1,
      player2Name: p2,
      player1Controls: "W/S",
      player2Controls: "O/L",
      isPlayer1Current: true,
      isPlayer2Current: true,
      gameOver: localGame.GameOver
    };
  };

  startFreshGame();

  // Réactiver les boutons pour le nouveau match
  const pauseBtn = getPauseBtn();
  const restartBtn = getRestartBtn();
  
  if (pauseBtn) {
    pauseBtn.disabled = false;
    enableButton(pauseBtn);
    pauseBtn.textContent = getPauseText();
  }
  
  if (restartBtn) {
    restartBtn.disabled = false;
    enableButton(restartBtn);
  }

  // Start: visible en tournoi (l'utilisateur doit cliquer pour démarrer)
  const startBtn = getStartBtn();
  showElement(startBtn);
  startBtn.disabled = false;
  startBtn.textContent = "Start";
  
  // Disable Play/Pause button initially
  if (pauseBtn) {
    pauseBtn.disabled = true;
    disableButton(pauseBtn);
  }
  
  startBtn.onclick = () => {
    if (localGame) {
      // Close settings panel if open before starting
      const settingsPanel = document.getElementById("settingsPanel");
      if (settingsPanel) {
        hideElement(settingsPanel);
      }
      
      // Clear any existing timer
      clearGameTimer();
      
      // Mark game as started
      hasBeenStarted = true;
      
      // Enable Play/Pause button
      if (pauseBtn) {
        pauseBtn.disabled = false;
        enableButton(pauseBtn);
      }
      
      // Start countdown timer
      const timer = getGameTimer(
        () => {
          // Timer completed - start the game
          if (localGame) {
            localGame.resetBall();
            localGame.Started = true;
            isPaused = false;
            startBtn.disabled = true;
            hideElement(startBtn);
            updateSettingsButtonVisibility(); // Hide settings button when game starts
          }
        },
        () => {
          // Timer starts - hide start button
          hideElement(startBtn);
        }
        // No onStop callback - we don't want to do anything when initial timer stops
      );
      
      timer.start(1000); // 1 second per countdown
    }
  };

  // Pause (listeners propres)
  {
    const oldPause = getPauseBtn();
    const pauseBtn = oldPause.cloneNode(true) as HTMLButtonElement;
    oldPause.replaceWith(pauseBtn);
    pauseBtn.textContent = getPauseText();
    pauseBtn.onclick = () => {
      if (!localGame || localGame.GameOver) return;
      
      // Ne rien faire si le jeu n'a jamais été démarré
      if (!hasBeenStarted) return;
      
      if (isPaused) {
        // Close settings panel if open before resuming
        const settingsPanel = document.getElementById("settingsPanel");
        if (settingsPanel) {
          hideElement(settingsPanel);
        }
        
        // Resuming from pause - start countdown timer
        clearGameTimer();
        const timer = getGameTimer(() => {
          // Timer completed - resume the game
          if (localGame) {
            isPaused = false;
            localGame.Started = true;
            pauseBtn.textContent = getPauseText();
            updateSettingsButtonVisibility();
          }
        }, () => {
          // Timer starts - hide settings button immediately
          updateSettingsButtonVisibility();
        });
        timer.start(1000); // 1 second per countdown
      } else if (localGame.Started) {
        // Pausing the game
        isPaused = true;
        localGame.Started = false;
        pauseBtn.textContent = getPlayText();
        updateSettingsButtonVisibility();
      }
    };
  }

  // Restart (conserve currentSpeedPercent)
  {
    const oldRestart = getRestartBtn();
    const restartBtn = oldRestart.cloneNode(true) as HTMLButtonElement;
    oldRestart.replaceWith(restartBtn);
    restartBtn.onclick = () => {
      // Close settings panel if open
      const settingsPanel = document.getElementById("settingsPanel");
      if (settingsPanel) {
        hideElement(settingsPanel);
      }
      
      // Annuler le timer en cours si actif
      const timer = getCurrentTimer();
      if (timer && timer.isRunning()) {
        clearGameTimer();
      }
      
      if (localLoop) { clearInterval(localLoop); localLoop = undefined; }
      isPaused = false;
      hasBeenStarted = false; // Reset start flag after restart
      
      // Reset pause button and disable it
      if (pauseBtn) {
        pauseBtn.textContent = getPauseText();
        pauseBtn.disabled = true;
        disableButton(pauseBtn);
      }
      
      // Show Start button after restart
      if (startBtn) {
        showElement(startBtn);
        startBtn.disabled = false;
        startBtn.textContent = "Start";
      }
      
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
        player1Name: p1,
        player2Name: p2,
        player1Controls: "W/S",
        player2Controls: "O/L",
        isPlayer1Current: true,
        isPlayer2Current: true,
        gameOver: localGame.GameOver
      };

      if (localGame.GameOver) {
        const s1 = localGame.state.score.p1 ?? 0;
        const s2 = localGame.state.score.p2 ?? 0;

        clearInterval(localLoop!);
        localLoop = undefined;

        // Disable Play and Restart buttons when game is over in tournament mode
        const pauseBtn = getPauseBtn();
        const restartBtn = getRestartBtn();
        const startBtn = getStartBtn();
        
        if (pauseBtn) {
          pauseBtn.disabled = true;
          pauseBtn.classList.add('opacity-50');
          pauseBtn.classList.add('pointer-events-none');
        }
        
        if (restartBtn) {
          restartBtn.disabled = true;
          disableButton(restartBtn);
        }
        
        if (startBtn) {
          startBtn.disabled = true;
          hideElement(startBtn);
        }

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
      if (e.key === "w" || e.key === "W") ws.send(JSON.stringify({ type: "input", direction: "up" }));
      if (e.key === "s" || e.key === "S") ws.send(JSON.stringify({ type: "input", direction: "down" }));
      return;
    }

    if (mode === "local" && localGame) {
      // Joueur 1
      if (e.key === "w" || e.key === "W") localGame.p1Dir = "up";   
      if (e.key === "s" || e.key === "S") localGame.p1Dir = "down";
      // Joueur 2 - nouvelles touches O/L
      if (e.key === "o" || e.key === "O") localGame.p2Dir = "up";
      if (e.key === "l" || e.key === "L") localGame.p2Dir = "down";
    }
  };

  const onKeyUp = (e: KeyboardEvent) => {
    if (isTextInputFocused()) return;

    if (mode === "online" && ws?.readyState === WebSocket.OPEN) {
      if (e.key === "w" || e.key === "W" || e.key === "s" || e.key === "S") {
        ws.send(JSON.stringify({ type: "input", direction: "stop" }));
      }
      return;
    }

    if (mode === "local" && localGame) {
      if (e.key === "w" || e.key === "W" || e.key === "s" || e.key === "S") {
        localGame.p1Dir = "stop";
      }
      if (e.key === "o" || e.key === "O" || e.key === "l" || e.key === "L") {
        localGame.p2Dir = "stop";
      }
    }
  };

  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup',   onKeyUp);

  anyDoc.__pongKeydown = onKeyDown;
  anyDoc.__pongKeyup   = onKeyUp;
})();