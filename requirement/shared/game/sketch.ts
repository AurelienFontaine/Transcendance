import p5 from 'p5';
import type { GameState } from './types';
import { getCurrentTimer } from './timer';

const CENTER = p5.prototype.CENTER;
const TOP = p5.prototype.TOP;

export function sketch(getState: () => GameState | null) {
  return (p: p5) => {
    const w = 1000; // Increased width
    const h = 700;  // Increased height
    const padding = 20;
    const gameArea = { x: padding, y: padding + 80, width: w - 2 * padding, height: h - 2 * padding - 80 - 80 }; // Extra space for control blocks


    p.setup = () => {
      (p as any).createCanvas(w, h);
    };


    // Helper function to create gradient background
    const drawGradientBackground = () => {
      for (let i = 0; i <= gameArea.height; i++) {
        const inter = p.map(i, 0, gameArea.height, 0, 1);
        const c = p.lerpColor(p.color(138, 43, 226), p.color(255, 20, 147), inter); // Violet to Pink
        p.stroke(c);
        p.line(gameArea.x, gameArea.y + i, gameArea.x + gameArea.width, gameArea.y + i);
      }
    };

    // Helper function to draw rounded rectangle
    const drawRoundedRect = (x: number, y: number, w: number, h: number, r: number) => {
      p.beginShape();
      p.vertex(x + r, y);
      p.vertex(x + w - r, y);
      p.quadraticVertex(x + w, y, x + w, y + r);
      p.vertex(x + w, y + h - r);
      p.quadraticVertex(x + w, y + h, x + w - r, y + h);
      p.vertex(x + r, y + h);
      p.quadraticVertex(x, y + h, x, y + h - r);
      p.vertex(x, y + r);
      p.quadraticVertex(x, y, x + r, y);
      p.endShape(p.CLOSE);
    };

    // Helper function to draw neon effect
    const drawNeonEffect = (x: number, y: number, size: number, color: p5.Color) => {
      // Outer glow
      p.strokeWeight(size * 0.3);
      p.stroke(color);
      p.fill(0, 0, 0, 0); // Transparent fill
      p.circle(x, y, size * 1.2);
      
      // Inner glow
      p.strokeWeight(size * 0.15);
      p.circle(x, y, size * 0.8);
      
      // Core
      p.noStroke();
      p.fill(color);
      p.circle(x, y, size * 0.6);
    };

    p.draw = () => {
      const state = getState();
      if (!state) return;


      // Dark background
      p.background(15, 23, 42); // Very dark blue background

      // Game area with gradient background
      p.noStroke();
      drawGradientBackground();

      // Game area border with neon effect
      p.strokeWeight(3);
      p.stroke(138, 43, 226); // Violet border
      p.noFill();
      drawRoundedRect(gameArea.x - 5, gameArea.y - 5, gameArea.width + 10, gameArea.height + 10, 15);

      // Center line (dotted)
      p.stroke(255, 255, 255, 180);
      p.strokeWeight(2);
      p.drawingContext.setLineDash([10, 10]);
      p.line(gameArea.x + gameArea.width / 2, gameArea.y, gameArea.x + gameArea.width / 2, gameArea.y + gameArea.height);
      p.drawingContext.setLineDash([]);

      // Scoreboard with gradient background
      const scoreboardWidth = 120;
      const scoreboardHeight = 50;
      const scoreboardX = (w - scoreboardWidth) / 2;
      const scoreboardY = 15;
      
      p.noStroke();
      for (let i = 0; i <= scoreboardHeight; i++) {
        const inter = p.map(i, 0, scoreboardHeight, 0, 1);
        const c = p.lerpColor(p.color(138, 43, 226), p.color(255, 20, 147), inter);
        p.stroke(c);
        p.line(scoreboardX, scoreboardY + i, scoreboardX + scoreboardWidth, scoreboardY + i);
      }
      
      // Scoreboard subtle border (optional - remove if not needed)
      // p.noFill();
      // p.stroke(255, 255, 255, 100);
      // p.strokeWeight(1);
      // drawRoundedRect(scoreboardX, scoreboardY, scoreboardWidth, scoreboardHeight, 10);

      // Score text with shadow effect
      p.fill(0, 0, 0, 100); // Shadow
      p.textSize(28);
      p.textAlign(CENTER, CENTER);
      p.textStyle(p.BOLD);
      p.text(`${state.score.p1} - ${state.score.p2}`, w / 2 + 2, scoreboardY + scoreboardHeight / 2 + 2);
      
      p.fill(255, 255, 255); // Main text
      p.text(`${state.score.p1} - ${state.score.p2}`, w / 2, scoreboardY + scoreboardHeight / 2);

      // Ball with neon effect
      const ballColor = p.color(state.ballColor ?? "#FFFFFF");
      // Correct ball positioning to use full game area - use original canvas dimensions for calculation
      const ballX = gameArea.x + (state.ball.x / 800) * gameArea.width; // Use original canvas width (800) for calculation
      const ballY = gameArea.y + (state.ball.y / 600) * gameArea.height; // Use original canvas height (600) for calculation
      const ballRadius = state.ball.radius ?? 12; // Use radius from state or default to 12
      drawNeonEffect(ballX, ballY, ballRadius, ballColor);

      // Paddles with neon effect
      const paddleColor = p.color(state.paddleColor ?? "#FFFFFF");
      const paddleWidth = 12;
      const paddleHeight = state.paddleHeight ?? 67; // Use height from state or default to 67
      
      // Player 1 paddle
      const p1X = gameArea.x + 10;
      const p1Y = gameArea.y + (state.paddles.p1 / 600) * gameArea.height - paddleHeight / 2; // Use original canvas height (600) for calculation

      // Player 2 paddle
      const p2X = gameArea.x + gameArea.width - 22;
      const p2Y = gameArea.y + (state.paddles.p2 / 600) * gameArea.height - paddleHeight / 2; // Use original canvas height (600) for calculation

      // Draw paddles with glow
      p.strokeWeight(4);
      p.stroke(paddleColor);
      p.fill(paddleColor);
      p.rect(p1X, p1Y, paddleWidth, paddleHeight, 8);
      p.rect(p2X, p2Y, paddleWidth, paddleHeight, 8);


      // Player indicators and controls below the canvas (like in the image)
      const controlsStartY = gameArea.y + gameArea.height + 30;
      const controlBlockHeight = 35;
      const controlBlockSpacing = 10;
      
      // Player 1 control block
      if (state.player1Name) {
        const isCurrentPlayer = state.isPlayer1Current || false;
        const p1BlockX = gameArea.x;
        const p1BlockY = controlsStartY;
        const p1BlockWidth = 120;
        
        // Background for player 1 block with gradient
        p.noStroke();
        for (let i = 0; i <= controlBlockHeight; i++) {
          const inter = p.map(i, 0, controlBlockHeight, 0, 1);
          const c = p.lerpColor(p.color(138, 43, 226), p.color(255, 20, 147), inter);
          p.stroke(c);
          p.line(p1BlockX, p1BlockY + i, p1BlockX + p1BlockWidth, p1BlockY + i);
        }
        
        // Border for player 1 block - removed for cleaner look
        // p.noFill();
        // p.stroke(255, 255, 255);
        // p.strokeWeight(2);
        // drawRoundedRect(p1BlockX, p1BlockY, p1BlockWidth, controlBlockHeight, 8);
        
        // Player 1 name and controls with shadow
        p.noStroke();
        
        // Player name with shadow
        p.fill(0, 0, 0, 80); // Shadow
        p.textSize(14);
        p.textAlign(p.CENTER, p.CENTER);
        p.textStyle(p.BOLD);
        p.text(state.player1Name, p1BlockX + p1BlockWidth / 2 + 1, p1BlockY + 12 + 1);
        
        p.fill(isCurrentPlayer ? "#00FF00" : "#FFFFFF"); // Main text
        p.text(state.player1Name, p1BlockX + p1BlockWidth / 2, p1BlockY + 12);
        
        // Controls with shadow
        p.fill(0, 0, 0, 80); // Shadow
        p.textSize(12);
        p.textStyle(p.NORMAL);
        p.text(state.player1Controls || "W/S", p1BlockX + p1BlockWidth / 2 + 1, p1BlockY + 25 + 1);
        
        p.fill(isCurrentPlayer ? "#00FF00" : "#CCCCCC"); // Main text
        p.text(state.player1Controls || "W/S", p1BlockX + p1BlockWidth / 2, p1BlockY + 25);
      }
      
      // Pause control block removed - pause is handled by UI buttons
      
      // Player 2 control block
      if (state.player2Name) {
        const isCurrentPlayer = state.isPlayer2Current || false;
        const p2BlockX = gameArea.x + gameArea.width - 120;
        const p2BlockY = controlsStartY;
        const p2BlockWidth = 120;
        
        // Background for player 2 block with gradient
        p.noStroke();
        for (let i = 0; i <= controlBlockHeight; i++) {
          const inter = p.map(i, 0, controlBlockHeight, 0, 1);
          const c = p.lerpColor(p.color(138, 43, 226), p.color(255, 20, 147), inter);
          p.stroke(c);
          p.line(p2BlockX, p2BlockY + i, p2BlockX + p2BlockWidth, p2BlockY + i);
        }
        
        // Border for player 2 block - removed for cleaner look
        // p.noFill();
        // p.stroke(255, 255, 255);
        // p.strokeWeight(2);
        // drawRoundedRect(p2BlockX, p2BlockY, p2BlockWidth, controlBlockHeight, 8);
        
        // Player 2 name and controls with shadow
        p.noStroke();
        
        // Player name with shadow
        p.fill(0, 0, 0, 80); // Shadow
        p.textSize(14);
        p.textAlign(p.CENTER, p.CENTER);
        p.textStyle(p.BOLD);
        p.text(state.player2Name, p2BlockX + p2BlockWidth / 2 + 1, p2BlockY + 12 + 1);
        
        p.fill(isCurrentPlayer ? "#00FF00" : "#FFFFFF"); // Main text
        p.text(state.player2Name, p2BlockX + p2BlockWidth / 2, p2BlockY + 12);
        
        // Controls with shadow
        p.fill(0, 0, 0, 80); // Shadow
        p.textSize(12);
        p.textStyle(p.NORMAL);
        p.text(state.player2Controls || "O/L", p2BlockX + p2BlockWidth / 2 + 1, p2BlockY + 25 + 1);
        
        p.fill(isCurrentPlayer ? "#00FF00" : "#CCCCCC"); // Main text
        p.text(state.player2Controls || "O/L", p2BlockX + p2BlockWidth / 2, p2BlockY + 25);
      }

      // Render timer overlay if active
      const timer = getCurrentTimer();
      if (timer && timer.isRunning()) {
        timer.render(p, gameArea);
      }

      // Render Game Over overlay if game is finished
      if (state.gameOver) {
        // Semi-transparent overlay
        p.fill(0, 0, 0, 200);
        p.noStroke();
        p.rect(gameArea.x, gameArea.y, gameArea.width, gameArea.height);

        // Get the correct translation for "Game Over"
        const gameOverText = (window as any).currentLanguage === 'es' ? 'FIN DEL JUEGO' :
                             (window as any).currentLanguage === 'fr' ? 'FIN DE PARTIE' :
                             'GAME OVER';

        // Game Over text with shadow effect
        p.textAlign(p.CENTER, p.CENTER);
        p.textSize(80);
        p.textStyle(p.BOLD);
        
        const centerX = gameArea.x + gameArea.width / 2;
        const centerY = gameArea.y + gameArea.height / 2;
        
        // Shadow
        p.fill(0, 0, 0, 255);
        p.text(gameOverText, centerX + 4, centerY + 4);
        
        // Main text with gradient-like effect (red to orange)
        p.fill(255, 50, 50); // Red
        p.text(gameOverText, centerX, centerY);
        
        // Winner text
        const winner = state.score.p1 > state.score.p2 ? state.player1Name : state.player2Name;
        p.textSize(40);
        p.textStyle(p.NORMAL);
        
        // Shadow for winner text
        p.fill(0, 0, 0, 200);
        p.text(`${winner} wins!`, centerX + 2, centerY + 80 + 2);
        
        // Main winner text
        p.fill(255, 215, 0); // Gold
        p.text(`${winner} wins!`, centerX, centerY + 80);
      }
    };
  };
}

