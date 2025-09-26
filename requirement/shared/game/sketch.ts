import p5 from 'p5';
import type { GameState } from './types';

const CENTER = p5.prototype.CENTER;
const TOP = p5.prototype.TOP;

export function sketch(getState: () => GameState | null) {
  return (p: p5) => {
    const w = 800;
    const h = 600;

    p.setup = () => {
      (p as any).createCanvas(w, h);
    };

    p.draw = () => {
      const state = getState();
      if (!state) return;

      p.background(0);

      // Debug colors
      console.log("🎨 SKETCH COLORS:", { ballColor: state.ballColor, paddleColor: state.paddleColor });

      // Balle
      p.fill(state.ballColor ?? "#FFF");
      p.circle(state.ball.x, state.ball.y, 15);

      // Raquettes
      p.fill(state.paddleColor ?? "#FFF");
      (p as any).rect(10, state.paddles.p1 - 50, 10, 100);
      (p as any).rect(w - 20, state.paddles.p2 - 50, 10, 100);

      // Score
      p.fill("#FFF");
      p.textSize(32);
      p.textAlign(CENTER, TOP);
      (p as any).text(`${state.score.p1} : ${state.score.p2}`, w / 2, 20);

      // Player control indicators at the top
      if (state.player1Name || state.player2Name) {
        p.textSize(16);
        p.textAlign(p.CENTER, p.TOP);
        
        // Player 1 info (left side)
        if (state.player1Name) {
          const isCurrentPlayer = state.isPlayer1Current || false;
          p.fill(isCurrentPlayer ? "#00FF00" : "#FFF"); // Green for current player
          (p as any).text(state.player1Name, w * 0.25, 60);
          p.fill(isCurrentPlayer ? "#00FF00" : "#CCC");
          (p as any).text(state.player1Controls || "W/S", w * 0.25, 80);
        }
        
        // Player 2 info (right side)
        if (state.player2Name) {
          const isCurrentPlayer = state.isPlayer2Current || false;
          p.fill(isCurrentPlayer ? "#00FF00" : "#FFF"); // Green for current player
          (p as any).text(state.player2Name, w * 0.75, 60);
          p.fill(isCurrentPlayer ? "#00FF00" : "#CCC");
          (p as any).text(state.player2Controls || "↑/↓", w * 0.75, 80);
        }
      }
    };
  };
}

