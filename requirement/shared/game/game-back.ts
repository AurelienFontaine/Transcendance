import type { GameState } from './types';

export class PongGame {
  width = 800;
  height = 600;
  paddleHeight = 67; // 1.5x smaller than original (100/1.5 ≈ 67)

  // Vitesse interne (modifiables)
  paddleSpeed = 5;
  ballSpeed = 5;
  
  // Taille configurable (Petit/Normal/Grand)
  ballSize: 'small' | 'normal' | 'large' = 'normal';
  paddleSize: 'small' | 'normal' | 'large' = 'normal';

  GameOver = false;
  Started = false;
  ballColor = "#FFFFFF";
  paddleColor = "#FFFFFF";
  
  // Callback for when a point is scored
  onPointScored?: () => void;

  state: GameState = {
    ball:    { x: this.width / 2, y: this.height / 2, radius: this.getBallRadius() },
    paddles: { p1: this.height / 2, p2: this.height / 2 },
    score:   { p1: 0, p2: 0 },
  };

  ballDir = { x: 1, y: 1 };
  p1Dir: 'up' | 'down' | 'stop' = 'stop';
  p2Dir: 'up' | 'down' | 'stop' = 'stop';

  /** Compat: ancienne API (slow/medium/fast). */
  setSpeed(level: "slow" | "medium" | "fast") {
    switch (level) {
      case "slow":
        this.setSpeedPercent(0);
        break;
      case "medium":
        this.setSpeedPercent(50);
        break;
      case "fast":
        this.setSpeedPercent(100);
        break;
    }
  }

  /** Nouvelle API: curseur 0..100 → interpole les vitesses */
  setSpeedPercent(percent: number) {
    const p = Math.max(0, Math.min(100, Math.round(percent)));
    const ballMin = 3, ballMax = 10;
    const padMin  = 4, padMax  = 9;

    this.ballSpeed   = ballMin + (ballMax - ballMin) * (p / 100);
    this.paddleSpeed = padMin  + (padMax  - padMin ) * (p / 100);
  }

  setColors(ballColor: string, paddleColor: string) {
    this.ballColor = ballColor;
    this.paddleColor = paddleColor;
  }

  update() {
    if (this.GameOver || !this.Started) return;

    // Move paddles
    if (this.p1Dir === 'up')   this.state.paddles.p1 -= this.paddleSpeed;
    if (this.p1Dir === 'down') this.state.paddles.p1 += this.paddleSpeed;
    if (this.p2Dir === 'up')   this.state.paddles.p2 -= this.paddleSpeed;
    if (this.p2Dir === 'down') this.state.paddles.p2 += this.paddleSpeed;

    // Clamp paddles
    this.state.paddles.p1 = Math.max(this.paddleHeight / 2, Math.min(this.height - this.paddleHeight / 2, this.state.paddles.p1));
    this.state.paddles.p2 = Math.max(this.paddleHeight / 2, Math.min(this.height - this.paddleHeight / 2, this.state.paddles.p2));

    // Move ball
    this.state.ball.x += this.ballSpeed * this.ballDir.x;
    this.state.ball.y += this.ballSpeed * this.ballDir.y;

    // Bounce top/bottom
    if (this.state.ball.y < 0 || this.state.ball.y > this.height) {
      this.ballDir.y *= -1;
    }

    // Paddle collision (gauche)
    if (this.state.ball.x < 30) {
      const dy = this.state.ball.y - this.state.paddles.p1;
      if (Math.abs(dy) < this.paddleHeight / 2) {
        const normalized = dy / (this.paddleHeight / 2);
        const maxBounceAngle = Math.PI / 4; // 45°
        const angle = normalized * maxBounceAngle;
        this.ballDir.x = Math.cos(angle);
        this.ballDir.y = Math.sin(angle);
      }
    }

    // Paddle collision (droite)
    if (this.state.ball.x > this.width - 30) {
      const dy = this.state.ball.y - this.state.paddles.p2;
      if (Math.abs(dy) < this.paddleHeight / 2) {
        const normalized = dy / (this.paddleHeight / 2);
        const maxBounceAngle = Math.PI / 4; // 45°
        const angle = normalized * maxBounceAngle;
        this.ballDir.x = -Math.cos(angle);
        this.ballDir.y = Math.sin(angle);
      }
    }

    // Score
    if (this.state.ball.x < 0) {
      this.state.score.p2 += 1;
      this.resetBall();
      if (this.onPointScored) this.onPointScored();
    } else if (this.state.ball.x > this.width) {
      this.state.score.p1 += 1;
      this.resetBall();
      if (this.onPointScored) this.onPointScored();
    }

    // Fin de partie à 5
    if (this.state.score.p2 >= 5 || this.state.score.p1 >= 5){
      this.GameOver = true;
    }
  }

  resetBall() {
    this.state.ball = { x: this.width / 2, y: this.height / 2 };
    this.GameOver = false;

    // Angle aléatoire [-45°, +45°] (min 15°)
    const minAngle = (Math.PI / 180) * 15;
    const maxAngle = (Math.PI / 180) * 45;
    const angle = (Math.random() * (maxAngle - minAngle) + minAngle) * (Math.random() < 0.5 ? -1 : 1);
    const direction = Math.random() < 0.5 ? -1 : 1;

    this.ballDir = {
      x: Math.cos(angle) * direction,
      y: Math.sin(angle)
    };
  }

  /**
   * Configure la taille de la balle
   */
  setBallSize(size: 'small' | 'normal' | 'large') {
    this.ballSize = size;
    // Appliquer la taille à la balle actuelle
    const ballRadius = this.getBallRadius();
    this.state.ball.radius = ballRadius;
  }

  /**
   * Configure la taille des paddles
   */
  setPaddleSize(size: 'small' | 'normal' | 'large') {
    this.paddleSize = size;
    this.paddleHeight = this.getPaddleHeight();
  }

  /**
   * Retourne le rayon de la balle selon la taille configurée
   */
  getBallRadius(): number {
    switch (this.ballSize) {
      case 'small': return 8;
      case 'normal': return 12;
      case 'large': return 16;
      default: return 12;
    }
  }

  /**
   * Retourne la hauteur des paddles selon la taille configurée
   */
  getPaddleHeight(): number {
    switch (this.paddleSize) {
      case 'small': return 45; // ~67 * 0.67
      case 'normal': return 67; // Taille par défaut (1.5x plus petit que l'original)
      case 'large': return 90; // ~67 * 1.34
      default: return 67;
    }
  }
}