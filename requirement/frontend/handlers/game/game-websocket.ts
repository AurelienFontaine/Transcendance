// game-websocket.ts - WebSocket helper functions
export function wsBase() {
  // Utiliser wss:// pour les connexions sécurisées
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const hostname = window.location.hostname;
  // Utiliser le port 3010 pour le serveur de jeu
  const port = '3010';
  return `${protocol}//${hostname}:${port}`;
}