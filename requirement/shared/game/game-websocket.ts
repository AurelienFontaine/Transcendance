// game-websocket.ts - WebSocket helper functions
export function wsBase() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const hostname = window.location.hostname;
  return `${protocol}//${hostname}:3010`;
}