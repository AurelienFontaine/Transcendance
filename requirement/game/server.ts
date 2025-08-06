import WebSocket, { WebSocketServer } from 'ws';
import { PongGame } from './game-back';
import { ServerMessage } from './frontend/src/types';

const wss = new WebSocketServer({ port: 3000, host: '0.0.0.0' });
console.log('✅ Server listening on ws://0.0.0.0:3000');

let game = new PongGame();
let clients: WebSocket[] = [];

wss.on('connection', (ws: WebSocket) => {
  if (clients.length >= 2) {
    ws.send(JSON.stringify({ type: 'error', message: 'Game full' }));
    ws.close();
    return;
  }

  const playerIndex = clients.length;
  clients.push(ws);

  ws.send(JSON.stringify({ type: 'player', playerIndex }));
  console.log(`Player ${playerIndex + 1} connected`);

  ws.on('message', (msg) => {
    const data = JSON.parse(msg.toString()) as ServerMessage;
    if (data.type === 'input') {
      if (playerIndex === 0) game.p1Dir = data.direction;
      else if (playerIndex === 1) game.p2Dir = data.direction;
    } else if(data.type === 'reset'){
      console.log('RESET THE GAME');
      game = new PongGame();
      game.resetBall();
      game.Started = false;
    } else if(data.type === 'start'){
      console.log('START THE GAME');
      game.resetBall();
      game.Started = true;
    }
     else if(data.type === 'pause'){
      console.log('PAUSE THE GAME');
      game.Started = !game.Started;
     }
  });

  ws.on('close', () => {
    clients = clients.filter(c => c !== ws);
    console.log(`Player ${playerIndex + 1} disconnected`);
  });
});

// Game loop
setInterval(() => {
  game.update();
  const state = JSON.stringify({ type: 'state', state: game.state, paused: !game.Started });
  for (const p of clients) {
    if (p && p.readyState === p.OPEN) {
      p.send(state);
    }
  }
}, 1000 / 60);
