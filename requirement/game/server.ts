import WebSocket, { WebSocketServer } from 'ws';
import { PongGame } from './game/game-back';
import { ServerMessage } from './game/types';
import axios from 'axios';
import https from 'https';
import fs from 'fs';

// Configure axios to ignore SSL certificate validation for internal communication
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

// Set axios defaults for all requests
axios.defaults.httpsAgent = httpsAgent;
axios.defaults.timeout = 5000;

// Also set environment variable to ignore SSL
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

// Create HTTPS server with SSL certificates
const server = https.createServer({
  key: fs.readFileSync('./frontend/certs/key.pem'),
  cert: fs.readFileSync('./frontend/certs/cert.pem')
}, (req, res) => {
  res.writeHead(200, { 
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-cache'
  });
  res.end(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Game Server - SSL Certificate Accepted</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            margin: 0;
            padding: 40px 20px;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 40px;
            text-align: center;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            max-width: 500px;
        }
        h1 { margin-top: 0; font-size: 2.5em; }
        .status { 
            background: rgba(0, 255, 0, 0.2); 
            padding: 15px; 
            border-radius: 10px; 
            margin: 20px 0;
            border: 1px solid rgba(0, 255, 0, 0.3);
        }
        .instructions {
            background: rgba(255, 255, 255, 0.1);
            padding: 20px;
            border-radius: 10px;
            margin: 20px 0;
        }
        .close-btn {
            background: #ff6b6b;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
            margin-top: 20px;
        }
        .close-btn:hover { background: #ff5252; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎮 Game Server Ready</h1>
        <div class="status">
            <strong>✅ SSL Certificate Accepted Successfully</strong>
        </div>
        <div class="instructions">
            <p><strong>The secure WebSocket connection is now available.</strong></p>
            <p>You can now use the online multiplayer game features.</p>
            <p><em>Server running on: wss://localhost:3010</em></p>
        </div>
        <button class="close-btn" onclick="window.close()">Close This Tab</button>
        <p><small>This page confirms that your browser trusts the game server's SSL certificate.</small></p>
    </div>
</body>
</html>`);
});

// Create WebSocket server with HTTPS server
const wss = new WebSocketServer({ 
  server: server,
  host: '0.0.0.0'
});

// Start the server
server.listen(3010, '0.0.0.0', () => {
  console.log('✅ WebSocket Server listening on ws://0.0.0.0:3010');
  console.log('📋 Proxied through Nginx at wss://hostname:8443/game-ws');
});

interface Room {
  id: number;
  clients: (WebSocket | null)[]; // null represents empty slot
  game: PongGame;
  userIds: (string | null)[]; // Track user IDs for history saving, null for empty slots
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
function getActiveClientCount(room: Room): number {
  return room.clients.filter(c => c !== null).length;
}

function logServerState() {
  rooms.forEach(room => {
    const activeClients = getActiveClientCount(room);
    const activeUserIds = room.userIds.filter(id => id !== null).join(', ');
    console.log(`  Room ${room.id}: ${activeClients}/2 clients, userIds: [${activeUserIds}]`);
  });
}

async function saveGameResult(room: Room, p1Score: number, p2Score: number) {
  // Filter out null userIds
  const activeUserIds = room.userIds.filter(id => id !== null) as string[];
  
  if (activeUserIds.length !== 2) {
    console.warn(`⚠️ Cannot save game result: need 2 active players, got ${activeUserIds.length}`);
    return;
  }

  try {
    const response = await axios.post('https://backend_container:3000/game/server-result', {
      p1Id: parseInt(activeUserIds[0]),
      p2Id: parseInt(activeUserIds[1]),
      s1: p1Score,
      s2: p2Score,
    }, {
      httpsAgent: httpsAgent
    });
    
  } catch (error: any) {
    console.error(`❌ Failed to save game result for room ${room.id}:`, error.message);
  }
}
function broadcast(room: Room, msg: any) {
  room.clients.forEach((client, index) => {
    if (client && client.readyState === WebSocket.OPEN) {
      // Personnaliser le message pour chaque client
      const playerMessage = {
        ...msg,
        state: {
          ...msg.state,
          isPlayer1Current: index === 0,
          isPlayer2Current: index === 1
        }
      };
      client.send(JSON.stringify(playerMessage));
    }
  });
}

// Fonction pour envoyer l'état de la room à tous les clients
async function sendRoomState(room: Room) {
  let player1Name = "Player 1";
  let player2Name = "Player 2";

  // Récupérer les noms des joueurs
  if (room.userIds[0]) {
    try {
      const userResponse = await axios.get(`https://backend_container:3000/users/${room.userIds[0]}/info`, {
        httpsAgent: httpsAgent
      });
      if (userResponse.data && userResponse.data.name) {
        const displayResponse = await axios.get(`https://backend_container:3000/users/${userResponse.data.name}/display`, {
          httpsAgent: httpsAgent
        });
        if (displayResponse.data && displayResponse.data.display) {
          player1Name = displayResponse.data.display;
        }
      }
    } catch (error: any) {
      console.warn(`Failed to get name for user ${room.userIds[0]}:`, error.message);
    }
  }

  if (room.userIds[1]) {
    try {
      const userResponse = await axios.get(`https://backend_container:3000/users/${room.userIds[1]}/info`, {
        httpsAgent: httpsAgent
      });
      if (userResponse.data && userResponse.data.name) {
        const displayResponse = await axios.get(`https://backend_container:3000/users/${userResponse.data.name}/display`, {
          httpsAgent: httpsAgent
        });
        if (displayResponse.data && displayResponse.data.display) {
          player2Name = displayResponse.data.display;
        }
      }
    } catch (error: any) {
      console.warn(`Failed to get name for user ${room.userIds[1]}:`, error.message);
    }
  }

  const state = {
    type: 'state',
    state: {
      ...room.game.state,
      ballColor: room.game.ballColor,
      paddleColor: room.game.paddleColor,
      paddleHeight: room.game.paddleHeight,
      ball: {
        ...room.game.state.ball,
        radius: room.game.getBallRadius()
      },
      player1Name,
      player2Name,
      player1Controls: "W/S",
      player2Controls: "W/S",
      isPlayer1Current: false, // Will be set per client
      isPlayer2Current: false,  // Will be set per client
      gameOver: room.game.GameOver
    },
    paused: !room.game.Started,
    players: getActiveClientCount(room),
    roomId: room.id,
  };

  broadcast(room, state);
}

function removeFromRoom(ws: WebSocket, room: Room) {
  // Find and remove user from connectedUsers map
  let removedUserId: string | null = null;
  let removedPlayerIndex = -1;
  
  for (const [userId, user] of connectedUsers.entries()) {
    if (user.ws === ws) {
      connectedUsers.delete(userId);
      removedUserId = userId;
      break;
    }
  }

  // Find the player's index and set it to null instead of removing it
  for (let i = 0; i < room.clients.length; i++) {
    if (room.clients[i] === ws) {
      room.clients[i] = null;
      room.userIds[i] = null;
      removedPlayerIndex = i;
      break;
    }
  }

  // Count active clients (non-null)
  const activeClients = room.clients.filter(c => c !== null).length;

  if (activeClients === 0) {
    rooms = rooms.filter(r => r !== room);
  } else {
    // RESET GAME when someone disconnects - Always reset if less than 2 players
    
    // Reset the game if we have less than 2 players
    if (activeClients < 2) {
      room.game = new PongGame();
      
      // Broadcast gameReset to remaining players
      broadcast(room, { type: 'gameReset', roomId: room.id });
      
      // Notify remaining players that the game is paused
      room.clients.forEach(client => {
        if (client && client.readyState === WebSocket.OPEN) {
          const message = JSON.stringify({
            type: 'game_paused',
            reason: 'player_disconnected'
          });
          client.send(message);
        }
      });
    }
  }
}

function assignToRoom(ws: WebSocket, userId: string): { room: Room; playerIndex: number } | null {
  // Check if user is already connected
  if (connectedUsers.has(userId)) {
    return null;
  }

  // Find a room with available slots (null slots or less than 2 players)
  let room = rooms.find(r => {
    const activeCount = r.clients.filter(c => c !== null).length;
    return activeCount < 2;
  });

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
  }

  // Try to fill an empty slot first (to maintain player positions)
  let playerIndex = -1;
  
  // First, check if there's a null slot (disconnected player slot)
  for (let i = 0; i < room.clients.length; i++) {
    if (room.clients[i] === null) {
      room.clients[i] = ws;
      room.userIds[i] = userId;
      playerIndex = i;
      break;
    }
  }
  
  // If no null slot found, add to the end
  if (playerIndex === -1) {
    room.clients.push(ws);
    room.userIds.push(userId);
    playerIndex = room.clients.length - 1;
  }
  
  // Track the connected user
  connectedUsers.set(userId, { userId, ws, roomId: room.id });
  
  console.log(`🎮 Client ajouté à la room ${room.id} en tant que Player ${playerIndex + 1} (User: ${userId})`);
  logServerState();

  return { room, playerIndex };
}

// --- Connexion ---
wss.on("connection", (ws, req) => {
  // Parse URL parameters for authentication
  const url = new URL(req.url || '', `https://${req.headers.host}`);
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

  // TEMPORARY: Allow dummy authentication for testing
  if (token === 'dummy-token-for-testing') {
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

  // Send immediate state update so client doesn't have to wait for game loop
  const sendInitialState = async () => {
    // Get user names (simplified version of the game loop logic)
    let player1Name = "Player 1";
    let player2Name = "Player 2";
    
    if (room.userIds[0]) {
      try {
        const userResponse = await axios.get(`https://backend_container:3000/users/${room.userIds[0]}/info`, {
          httpsAgent: httpsAgent
        });
        if (userResponse.data && userResponse.data.name) {
          const displayResponse = await axios.get(`https://backend_container:3000/users/${userResponse.data.name}/display`, {
            httpsAgent: httpsAgent
          });
          if (displayResponse.data && displayResponse.data.display) {
            player1Name = displayResponse.data.display;
          }
        }
      } catch (error: any) {
        console.warn(`Failed to get name for user ${room.userIds[0]}:`, error.message);
      }
    }
    
    if (room.userIds[1]) {
      try {
        const userResponse = await axios.get(`https://backend_container:3000/users/${room.userIds[1]}/info`, {
          httpsAgent: httpsAgent
        });
        if (userResponse.data && userResponse.data.name) {
          const displayResponse = await axios.get(`https://backend_container:3000/users/${userResponse.data.name}/display`, {
            httpsAgent: httpsAgent
          });
          if (displayResponse.data && displayResponse.data.display) {
            player2Name = displayResponse.data.display;
          }
        }
      } catch (error: any) {
        console.warn(`Failed to get name for user ${room.userIds[1]}:`, error.message);
      }
    }

    const initialState = {
      type: 'state',
      state: {
        ...room.game.state,
        player1Name,
        player2Name,
        player1Controls: "W/S",
        player2Controls: "W/S",
        isPlayer1Current: false,
        isPlayer2Current: false,
        gameOver: room.game.GameOver
      },
      paused: !room.game.Started,
      players: getActiveClientCount(room),
      roomId: room.id,
    };

    ws.send(JSON.stringify(initialState));
  };

  // Send initial state after a short delay to ensure client is ready
  setTimeout(async () => {
    await sendInitialState();
    
    // Broadcast updated state to ALL clients in the room (including the new one)
    // This ensures everyone gets the updated player count
    const broadcastState = {
      type: 'state',
      state: {
        ...room.game.state,
        player1Name: "Player 1", // Will be updated by game loop
        player2Name: "Player 2", // Will be updated by game loop
        player1Controls: "W/S",
        player2Controls: "W/S",
        isPlayer1Current: false,
        isPlayer2Current: false,
        gameOver: room.game.GameOver
      },
      paused: !room.game.Started,
      players: getActiveClientCount(room),
      roomId: room.id,
    };
    
    broadcast(room, broadcastState);
    
    // Handle reconnection scenario - notify when 2 players are ready
    const activeClients = getActiveClientCount(room);
    if (activeClients === 2 && !room.game.Started) {
    } else if (activeClients < 2) {
    }
  }, 150);

  ws.on("message", (msg) => {
    const data = JSON.parse(msg.toString()) as ServerMessage;

    if (data.type === 'input') {
      if (playerIndex === 0) room.game.p1Dir = data.direction;
      else if (playerIndex === 1) room.game.p2Dir = data.direction;

    } else if (data.type === 'reset') {
      room.game = new PongGame();
      // Notifier tous les clients que le jeu a été reset
      broadcast(room, { type: 'gameReset', roomId: room.id });
    } else if (data.type === 'start') {
      if (getActiveClientCount(room) < 2) {
        return;
      }
      room.game.resetBall();
      room.game.Started = true;
    } else if (data.type === 'startTimer') {
      // Un joueur a cliqué sur Start Game - notifier tous les clients pour lancer le timer
      if (getActiveClientCount(room) < 2) {
        return;
      }
      broadcast(room, { type: 'gameStarting', roomId: room.id });
    } 
   
    else if (data.type === 'pause') {
      if (getActiveClientCount(room) < 2) {
        return;
      }
      room.game.Started = !room.game.Started;
    }
    else if (data.type === "settings:set") {
      if (typeof data.speedPercent === "number") {
        room.game.setSpeedPercent(data.speedPercent);
      }
      if (typeof data.ballColor === "string") {
        room.game.ballColor = data.ballColor;
      }
      if (typeof data.paddleColor === "string") {
        room.game.paddleColor = data.paddleColor;
      }
      // Note: Les paramètres de taille sont ignorés en mode online
      // pour éviter les désynchronisations entre joueurs
      
      // Envoyer immédiatement l'état mis à jour à tous les clients
      sendRoomState(room);
    }
    else if (data.type === "timerCompleted") {
      if (getActiveClientCount(room) === 2 && !room.game.GameOver) {
        room.game.Started = true;
        room.game.resetBall(); // Reset ball position for new serve
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
setInterval(async () => {
  for (const room of rooms) {
    // Only update the game if we have exactly 2 players AND the game is started
    const activeClients = getActiveClientCount(room);
    if (activeClients === 2 && room.game.Started) {
      const wasGameOver = room.game.GameOver;
      const oldScore = { p1: room.game.state.score.p1, p2: room.game.state.score.p2 };
      room.game.update();
      const newScore = { p1: room.game.state.score.p1, p2: room.game.state.score.p2 };

      // Check if a point was scored
      if (oldScore.p1 !== newScore.p1 || oldScore.p2 !== newScore.p2) {
        console.log(`🎯 Point scored in room ${room.id}: ${oldScore.p1}-${oldScore.p2} → ${newScore.p1}-${newScore.p2}`);
        
        // Pause the game after a point to wait for timer
        room.game.Started = false;
        console.log(`🎯 Game paused after point in room ${room.id} - waiting for timer completion`);
        
        // Send point scored event to all clients
        const pointScoredEvent = {
          type: 'pointScored',
          score: newScore,
          roomId: room.id
        };
        broadcast(room, pointScoredEvent);
      }

      // Check if game just ended
      if (!wasGameOver && room.game.GameOver && room.userIds.length === 2) {
        console.log(`🏁 Game ended in room ${room.id}: ${room.game.state.score.p1}-${room.game.state.score.p2}`);
        saveGameResult(room, room.game.state.score.p1, room.game.state.score.p2);
      }
    } else {
      // Game is paused - don't update the game logic
      console.log(`⏸️ Game paused in room ${room.id}: ${activeClients}/2 players, Started=${room.game.Started}`);
    }

    // Get real player names from database
    let player1Name = "Player 1";
    let player2Name = "Player 2";
    
    if (room.userIds[0]) {
      try {
        const userResponse = await axios.get(`https://backend_container:3000/users/${room.userIds[0]}/info`, {
          httpsAgent: httpsAgent
        });
        if (userResponse.data && userResponse.data.name) {
          const displayResponse = await axios.get(`https://backend_container:3000/users/${userResponse.data.name}/display`, {
            httpsAgent: httpsAgent
          });
          if (displayResponse.data && displayResponse.data.display) {
            player1Name = displayResponse.data.display;
          }
        }
      } catch (error: any) {
        console.warn(`Failed to get name for user ${room.userIds[0]}:`, error.message);
      }
    }
    
    if (room.userIds[1]) {
      try {
        const userResponse = await axios.get(`https://backend_container:3000/users/${room.userIds[1]}/info`, {
          httpsAgent: httpsAgent
        });
        if (userResponse.data && userResponse.data.name) {
          const displayResponse = await axios.get(`https://backend_container:3000/users/${userResponse.data.name}/display`, {
            httpsAgent: httpsAgent
          });
          if (displayResponse.data && displayResponse.data.display) {
            player2Name = displayResponse.data.display;
          }
        }
      } catch (error: any) {
        console.warn(`Failed to get name for user ${room.userIds[1]}:`, error.message);
      }
    }

    const state = {
      type: 'state',
      state: {
        ...room.game.state,
        ballColor: room.game.ballColor,
        paddleColor: room.game.paddleColor,
        paddleHeight: room.game.paddleHeight,
        ball: {
          ...room.game.state.ball,
          radius: room.game.getBallRadius()
        },
        player1Name,
        player2Name,
        player1Controls: "W/S",
        player2Controls: "W/S",
        isPlayer1Current: false, // Will be set per client
        isPlayer2Current: false,  // Will be set per client
        gameOver: room.game.GameOver
      },
      paused: !room.game.Started,
      players: getActiveClientCount(room),
      roomId: room.id,
    };

    broadcast(room, state);
  }
}, 1000 / 60);