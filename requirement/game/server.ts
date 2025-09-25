import WebSocket, { WebSocketServer } from 'ws';
import { PongGame } from './game/game-back';
import { ServerMessage } from './game/types';
import axios from 'axios';

const wss = new WebSocketServer({ port: 3010, host: '0.0.0.0' });
console.log('✅ Server listening on ws://0.0.0.0:3010');

interface Room {
  id: number;
  clients: WebSocket[];
  game: PongGame;
  userIds: string[]; // Track user IDs for history saving
}

interface ConnectedUser {
  userId: string;
  ws: WebSocket;
  roomId: number;
}

let rooms: Room[] = [];
let nextRoomId = 1;
const MAX_ROOMS = 4;
let connectedUsers: Map<string, ConnectedUser> = new Map(); // userId -> ConnectedUser

// --- Helpers ---
function logServerState() {
  console.log(`📊 Server State: ${rooms.length} rooms, ${connectedUsers.size} connected users`);
  rooms.forEach(room => {
    console.log(`  Room ${room.id}: ${room.clients.length}/2 clients, userIds: [${room.userIds.join(', ')}]`);
  });
}
async function saveGameResult(room: Room, p1Score: number, p2Score: number) {
  if (room.userIds.length !== 2) {
    console.log(`⚠️ Cannot save game result: room ${room.id} has ${room.userIds.length} users`);
    return;
  }

  try {
    const response = await axios.post('http://backend_container:3000/game/server-result', {
      p1Id: parseInt(room.userIds[0]),
      p2Id: parseInt(room.userIds[1]),
      s1: p1Score,
      s2: p2Score,
    });
    
    console.log(`✅ Game result saved for room ${room.id}: ${p1Score}-${p2Score} (Game ID: ${response.data.gameId})`);
  } catch (error: any) {
    console.error(`❌ Failed to save game result for room ${room.id}:`, error.message);
  }
}
function broadcast(room: Room, msg: any) {
  const data = JSON.stringify(msg);
  room.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

function removeFromRoom(ws: WebSocket, room: Room) {
  // Find and remove user from connectedUsers map
  let removedUserId: string | null = null;
  for (const [userId, user] of connectedUsers.entries()) {
    if (user.ws === ws) {
      connectedUsers.delete(userId);
      removedUserId = userId;
      console.log(`👤 User ${userId} removed from connected users`);
      break;
    }
  }

  room.clients = room.clients.filter(c => c !== ws);
  
  // Also remove the user ID from the room's userIds array
  if (removedUserId) {
    room.userIds = room.userIds.filter(id => id !== removedUserId);
    console.log(`👤 User ${removedUserId} removed from room ${room.id} userIds`);
  }

  if (room.clients.length === 0) {
    rooms = rooms.filter(r => r !== room);
    console.log(`🗑️ Room ${room.id} supprimée`);
  } else {
    console.log(`Room ${room.id} en attente (${room.clients.length}/2)`);
  }
}

function assignToRoom(ws: WebSocket, userId: string): { room: Room; playerIndex: number } | null {
  // Check if user is already connected
  if (connectedUsers.has(userId)) {
    console.log(`🚫 User ${userId} is already connected`);
    return null;
  }

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
      userIds: [],
    };
    rooms.push(room);
    console.log(`🆕 Nouvelle room créée: ${room.id}`);
  }

  room.clients.push(ws);
  room.userIds.push(userId);
  const playerIndex = room.clients.length - 1;
  
  // Track the connected user
  connectedUsers.set(userId, { userId, ws, roomId: room.id });
  
  console.log(`🎮 Client ajouté à la room ${room.id} en tant que Player ${playerIndex + 1} (User: ${userId})`);
  logServerState();

  return { room, playerIndex };
}

// --- Connexion ---
wss.on("connection", (ws, req) => {
  // Parse URL parameters for authentication
  const url = new URL(req.url || '', `http://${req.headers.host}`);
  const token = url.searchParams.get('token');
  const userId = url.searchParams.get('userId');

  // Validate authentication
  if (!token || !userId) {
    const msg = { type: 'error', message: 'Authentification requise pour jouer en ligne.' };
    ws.send(JSON.stringify(msg));
    ws.close();
    console.warn("⛔ Connexion refusée : authentification manquante.");
    return;
  }

  const result = assignToRoom(ws, userId);

  if (!result) {
    // Check if it's because user is already connected
    if (connectedUsers.has(userId)) {
      const msg = { type: 'error', message: 'Vous êtes déjà connecté dans une autre partie. Veuillez fermer l\'autre onglet.' };
      ws.send(JSON.stringify(msg));
      ws.close();
      console.warn(`⛔ Connexion refusée : utilisateur ${userId} déjà connecté.`);
      return;
    }
    
    // Refuser connexion car toutes les rooms sont pleines
    const msg = { type: 'error', message: 'Toutes les salles sont complètes. Veuillez attendre qu\'une room se libère.' };
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
        console.log(`⚠️ START ignoré: room ${room.id} n'a pas 2 joueurs`);
        return;
      }
      console.log(`▶️ START room ${room.id}`);
      room.game.resetBall();
      room.game.Started = true;
    } 
   
    else if (data.type === 'pause') {
      if (room.clients.length < 2) {
        console.log(`⚠️ PAUSE ignoré: room ${room.id} n'a pas 2 joueurs`);
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
    logServerState();
  });
});

// --- Game loop ---
setInterval(() => {
  for (const room of rooms) {
    const wasGameOver = room.game.GameOver;
    room.game.update();

    // Check if game just ended
    if (!wasGameOver && room.game.GameOver && room.userIds.length === 2) {
      console.log(`🏁 Game ended in room ${room.id}: ${room.game.state.score.p1}-${room.game.state.score.p2}`);
      saveGameResult(room, room.game.state.score.p1, room.game.state.score.p2);
    }

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