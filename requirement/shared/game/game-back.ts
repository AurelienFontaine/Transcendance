import { GameState } from './types';

export class PongGame {
  width = 800;
  height = 600;
  paddleHeight = 100;
  paddleSpeed = 5;
  ballSpeed = 5;
  GameOver = false;
  Started = false;
  ballColor = "#FFFFFF";
  paddleColor = "#FFFFFF";

  state: GameState = {
    ball: { x: this.width / 2, y: this.height / 2 },
    paddles: { p1: this.height / 2, p2: this.height / 2 },
    score: { p1: 0, p2: 0 },
  
  };

  ballDir = { x: 1, y: 1 };
  p1Dir: 'up' | 'down' | 'stop' = 'stop';
  p2Dir: 'up' | 'down' | 'stop' = 'stop';

   setSpeed(level: "slow" | "medium" | "fast") {
    switch (level) {
      case "slow":
        this.ballSpeed = 5;
        this.paddleSpeed = 5;
        break;
      case "medium":
        this.ballSpeed = 7;
        this.paddleSpeed = 6;
        break;
      case "fast":
        this.ballSpeed = 10;
        this.paddleSpeed = 8;
        break;
    }
  }

  setColors(ballColor: string, paddleColor: string) {
    this.ballColor = ballColor;
    this.paddleColor = paddleColor;
  }

  update() {

    if (this.GameOver || !this.Started) return;

    // Move paddles
    if (this.p1Dir === 'up') this.state.paddles.p1 -= this.paddleSpeed;
    if (this.p1Dir === 'down') this.state.paddles.p1 += this.paddleSpeed;
    if (this.p2Dir === 'up') this.state.paddles.p2 -= this.paddleSpeed;
    if (this.p2Dir === 'down') this.state.paddles.p2 += this.paddleSpeed;
    // Limiter les paddles à l'écran
    this.state.paddles.p1 = Math.max(this.paddleHeight / 2, Math.min(this.height - this.paddleHeight / 2, this.state.paddles.p1));
    this.state.paddles.p2 = Math.max(this.paddleHeight / 2, Math.min(this.height - this.paddleHeight / 2, this.state.paddles.p2));

    // Move ball
    this.state.ball.x += this.ballSpeed * this.ballDir.x;
    this.state.ball.y += this.ballSpeed * this.ballDir.y;

    // Collision balle haut/bas ecran
    if (this.state.ball.y < 0 || this.state.ball.y > this.height) {
      this.ballDir.y *= -1;
    }

    // Collision balle avec raquettes
    if (this.state.ball.x < 30) {
    const dy = this.state.ball.y - this.state.paddles.p1;
    if (Math.abs(dy) < this.paddleHeight / 2) {
      const normalized = dy / (this.paddleHeight / 2); // entre -1 et +1 
      const maxBounceAngle = Math.PI / 4; // 45°
      const angle = normalized * maxBounceAngle;

      this.ballDir.x = Math.cos(angle);
      this.ballDir.y = Math.sin(angle);
    }
  }

   if (this.state.ball.x > this.width - 30) {
    const dy = this.state.ball.y - this.state.paddles.p2;
    if (Math.abs(dy) < this.paddleHeight / 2) {
      const normalized = dy / (this.paddleHeight / 2); // entre -1 et +1
      const maxBounceAngle = Math.PI / 4; // 45°
      const angle = normalized * maxBounceAngle;

      this.ballDir.x = -Math.cos(angle); // ⬅ vers la gauche
      this.ballDir.y = Math.sin(angle);
    }
  }

    // Score
    if (this.state.ball.x < 0) {
      this.state.score.p2 += 1;
      this.resetBall();
    } else if (this.state.ball.x > this.width) {
      this.state.score.p1 += 1;
      this.resetBall();
    }
    //Fin de partie
    if (this.state.score.p2 >= 5 || this.state.score.p1 >= 5){
      this.GameOver = true;
    }
  }

  
  resetBall() {
    this.state.ball = { x: this.width / 2, y: this.height / 2 };

    // Autoriser à nouveau le jeu si c'était terminé
    this.GameOver = false;

    // Angle aléatoire entre -45° et +45°
    const minAngle = (Math.PI / 180) * 15; 
    const maxAngle = (Math.PI / 180) * 45;
    const angle = (Math.random() * (maxAngle - minAngle) + minAngle) * (Math.random() < 0.5 ? -1 : 1);

    // Direction gauche ou droite aléatoire
    const direction = Math.random() < 0.5 ? -1 : 1;

    // Calcul du vecteur directionnel
    this.ballDir = {
      x: Math.cos(angle) * direction,
      y: Math.sin(angle)
    };
  }
}
