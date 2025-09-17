import WebSocket, { WebSocketServer } from 'ws';
import { PongGame } from './game/game-back';
import { ServerMessage } from './game/types';

const wss = new WebSocketServer({ port: 3010, host: '0.0.0.0' });
console.log('✅ Server listening on ws://0.0.0.0:3010');

interface Room {
  id: number;
  clients: WebSocket[];
  game: PongGame;
}

let rooms: Room[] = [];
let nextRoomId = 1;
const MAX_ROOMS = 4;

// --- Helpers ---
function broadcast(room: Room, msg: any) {
  const data = JSON.stringify(msg);
  room.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

function removeFromRoom(ws: WebSocket, room: Room) {
  room.clients = room.clients.filter(c => c !== ws);

  if (room.clients.length === 0) {
    rooms = rooms.filter(r => r !== room);
    console.log(`🗑️ Room ${room.id} supprimée`);
  } else {
    console.log(`Room ${room.id} en attente (${room.clients.length}/2)`);
  }
}

function assignToRoom(ws: WebSocket): { room: Room; playerIndex: number } | null {
  // Essayer une room avec <2 joueurs
  let room = rooms.find(r => r.clients.length < 2);

  if (!room) {
    // Si toutes les rooms sont créées et pleines → refus
    if (rooms.length >= MAX_ROOMS) {
      return null;
    }

    // Créer une nouvelle room
    room = {
      id: nextRoomId++,
      clients: [],
      game: new PongGame(),
    };
    rooms.push(room);
    console.log(`🆕 Nouvelle room créée: ${room.id}`);
  }

  room.clients.push(ws);
  const playerIndex = room.clients.length - 1;
  console.log(`🎮 Client ajouté à la room ${room.id} en tant que Player ${playerIndex + 1}`);

  return { room, playerIndex };
}

// --- Connexion ---
wss.on("connection", (ws) => {
  const result = assignToRoom(ws);

  if (!result) {
    // Refuser connexion car toutes les rooms sont pleines
    const msg = { type: 'error', message: 'Toutes les salles sont complètes. Veuillez attendre qu’une room se libère.' };
    ws.send(JSON.stringify(msg));
    ws.close();
    console.warn("⛔ Connexion refusée : toutes les rooms pleines.");
    return;
  }

  const { room, playerIndex } = result;

  // Informer le client de son rôle
  ws.send(JSON.stringify({ type: 'player', playerIndex, roomId: room.id }));

  ws.on("message", (msg) => {
    const data = JSON.parse(msg.toString()) as ServerMessage;

    if (data.type === 'input') {
      if (playerIndex === 0) room.game.p1Dir = data.direction;
      else if (playerIndex === 1) room.game.p2Dir = data.direction;

    } else if (data.type === 'reset') {
      console.log(`🔄 RESET room ${room.id}`);
      room.game = new PongGame();
    } else if (data.type === 'start') {
      if (room.clients.length < 2) {
        console.log(`⚠️ START ignoré: room ${room.id} n’a pas 2 joueurs`);
        return;
      }
      console.log(`▶️ START room ${room.id}`);
      room.game.resetBall();
      room.game.Started = true;
    } 
   
    else if (data.type === 'pause') {
      if (room.clients.length < 2) {
        console.log(`⚠️ PAUSE ignoré: room ${room.id} n’a pas 2 joueurs`);
        return;
      }
      console.log(`⏸️ PAUSE room ${room.id}`);
      room.game.Started = !room.game.Started;
    }
    else if (data.type === "settings:set") {
      if (typeof data.speedPercent === "number") {
        console.log(`🎚️ Room ${room.id} Speed -> ${data.speedPercent}`);
        room.game.setSpeedPercent(data.speedPercent);
      }
      if (typeof data.ballColor === "string") {
        room.game.ballColor = data.ballColor;
      }
      if (typeof data.paddleColor === "string") {
        room.game.paddleColor = data.paddleColor;
      }
    }
  });

  ws.on("close", () => {
    console.log(`❌ Player ${playerIndex + 1} quitté room ${room.id}`);
    removeFromRoom(ws, room);
  });
});

// --- Game loop ---
setInterval(() => {
  for (const room of rooms) {
    room.game.update();

    const state = {
      type: 'state',
      state: room.game.state,
      paused: !room.game.Started,
      players: room.clients.length,
      roomId: room.id,
    };

    broadcast(room, state);
  }
}, 1000 / 60);
