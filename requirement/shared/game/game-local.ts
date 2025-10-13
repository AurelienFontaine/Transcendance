// game-local.ts - Local game helper functions
import { PongGame } from "./game-back";

export function createLocalGame(currentSpeedPercent: number): PongGame {
  const localGame = new PongGame();
  localGame.setSpeedPercent(currentSpeedPercent);
  return localGame;
}

export function updateLocalGameState(localGame: PongGame, isPaused: boolean) {
  if (!isPaused) localGame.update();
  return {
    ...localGame.state,
    ballColor: localGame.ballColor,
    paddleColor: localGame.paddleColor,
    paddleHeight: localGame.paddleHeight,
    gameOver: localGame.GameOver,
    ball: {
      ...localGame.state.ball,
      radius: localGame.getBallRadius()
    }
  };
}
