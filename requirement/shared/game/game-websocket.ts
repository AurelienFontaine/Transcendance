// game-websocket.ts - WebSocket helper functions
export function wsBase() {
  // Utiliser wss:// pour les connexions sécurisées via Nginx proxy
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const hostname = window.location.hostname;
  const port = window.location.port;
  return `${protocol}//${hostname}:${port}/game-ws`;
}