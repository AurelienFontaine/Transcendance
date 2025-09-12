import WebSocket, { WebSocketServer } from 'ws';
import { PongGame } from './game/game-back';
import { ServerMessage } from './game/types';

const wss = new WebSocketServer({ port: 3010, host: '0.0.0.0' });
console.log('✅ Server listening on ws://0.0.0.0:3010');

let game = new PongGame();
let clients: WebSocket[] = [];

// Nouvelle connexion
wss.on("connection", (ws) => {
  if (clients.length >= 2) {
    ws.send(JSON.stringify({ type: 'error', message: 'Game full' }));
    ws.close();
    return;
  }

  const playerIndex = clients.length;
  clients.push(ws);

  ws.send(JSON.stringify({ type: 'player', playerIndex }));
  console.log(`🎮 Player ${playerIndex + 1} connected (total=${clients.length})`);

  ws.on("message", (msg) => {
    console.log("📩 Message brut reçu:", msg.toString());

    const data = JSON.parse(msg.toString()) as ServerMessage;

    if (data.type === 'input') {
      if (playerIndex === 0) game.p1Dir = data.direction;
      else if (playerIndex === 1) game.p2Dir = data.direction;
    } else if (data.type === 'reset') {
      console.log('🔄 RESET THE GAME');
      game = new PongGame();
      game.resetBall();
      game.Started = false;
    } else if (data.type === 'start') {
      console.log('▶️ START THE GAME');
      game.resetBall();
      game.Started = true;
    } else if (data.type === 'pause') {
      console.log('⏸️ TOGGLE PAUSE (avant=', game.Started, ')');
      game.Started = !game.Started;
    } else if (data.type === "settings:set") {
      if (typeof data.speedPercent === "number") {
        console.log("🎚️ Speed changed to", data.speedPercent);
        game.setSpeedPercent(data.speedPercent);
      }
      if (typeof data.ballColor === "string") {
        console.log("🎨 Ball color changed to", data.ballColor);
        game.ballColor = data.ballColor;
      }
      if (typeof data.paddleColor === "string") {
        console.log("🎨 Paddle color changed to", data.paddleColor);
        game.paddleColor = data.paddleColor;
      }
    }
  });

  ws.on("close", () => {
    clients = clients.filter(c => c !== ws);
    console.log(`❌ Player ${playerIndex + 1} disconnected (total=${clients.length})`);
  });
});

// Game loop
setInterval(() => {
  game.update();

  // Log résumé toutes les secondes
  const now = new Date();
  if (now.getSeconds() % 1 === 0 && now.getMilliseconds() < 20) {
    console.log("[STATE]", {
      started: game.Started,
      paused: !game.Started,
      players: clients.length,
      ball: game.state.ball,
      score: game.state.score
    });
  }

  const state = JSON.stringify({
    type: 'state',
    state: game.state,
    paused: !game.Started,
    players: clients.length
  });

  for (const p of clients) {
    if (p && p.readyState === p.OPEN) {
      p.send(state);
    }
  }
}, 1000 / 60);
