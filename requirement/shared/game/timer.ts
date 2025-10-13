// timer.ts - Countdown timer component for game states

export class GameTimer {
  private callback: () => void;
  private countdown: number = 3;
  private intervalId: number | null = null;
  private isActive: boolean = false;
  private onStart?: () => void; // Callback when timer starts
  private onStop?: () => void;  // Callback when timer stops
  private isPointTimer: boolean = false; // Flag to indicate if this is a point timer

  constructor(onComplete: () => void, onStart?: () => void, onStop?: () => void, isPointTimer: boolean = false) {
    this.callback = onComplete;
    this.onStart = onStart;
    this.onStop = onStop;
    this.isPointTimer = isPointTimer;
  }

  /**
   * Start the 3-2-1 countdown timer
   * @param duration - How long to show each number (default: 1000ms)
   */
  start(duration: number = 1000): void {
    if (this.isActive) {
      this.stop();
    }

    this.isActive = true;
    this.countdown = 3;

    // Call onStart callback
    if (this.onStart) {
      this.onStart();
    }

    // Update button visibility when timer starts
    if (typeof window !== 'undefined' && (window as any).updateSettingsButtonVisibility) {
      (window as any).updateSettingsButtonVisibility();
    }

    this.intervalId = window.setInterval(() => {
      this.countdown--;
      
      if (this.countdown <= 0) {
        this.stop();
        this.callback();
      }
    }, duration);
  }

  /**
   * Stop the timer
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isActive = false;

    // Call onStop callback only if not a point timer
    if (this.onStop && !this.isPointTimer) {
      this.onStop();
    }

    // Update button visibility when timer stops
    if (typeof window !== 'undefined' && (window as any).updateSettingsButtonVisibility) {
      (window as any).updateSettingsButtonVisibility();
    }
  }

  /**
   * Check if timer is currently active
   */
  isRunning(): boolean {
    return this.isActive;
  }

  /**
   * Get current countdown number (3, 2, 1, or 0)
   */
  getCurrentCount(): number {
    return this.countdown;
  }

  /**
   * Render the timer on canvas
   */
  render(p: any, gameArea: { x: number; y: number; width: number; height: number }): void {
    if (!this.isActive) return;

    // Semi-transparent overlay
    p.fill(0, 0, 0, 150);
    p.noStroke();
    p.rect(gameArea.x, gameArea.y, gameArea.width, gameArea.height);

    // Countdown number with shadow effect
    p.textAlign(p.CENTER, p.CENTER);
    p.textSize(150);
    p.textStyle('bold');
    
    const centerX = gameArea.x + gameArea.width / 2;
    const centerY = gameArea.y + gameArea.height / 2;
    
    // Shadow
    p.fill(0, 0, 0, 200);
    p.text(this.countdown.toString(), centerX + 3, centerY + 3);
    
    // Main text with color based on countdown
    if (this.countdown === 3) {
      p.fill(255, 100, 100); // Red
    } else if (this.countdown === 2) {
      p.fill(255, 200, 100); // Orange
    } else {
      p.fill(100, 255, 100); // Green
    }
    p.text(this.countdown.toString(), centerX, centerY);
  }
}

// Global timer instance
let gameTimer: GameTimer | null = null;

/**
 * Get or create the global game timer
 */
export function getGameTimer(onComplete: () => void, onStart?: () => void, onStop?: () => void, isPointTimer: boolean = false): GameTimer {
  if (!gameTimer) {
    gameTimer = new GameTimer(onComplete, onStart, onStop, isPointTimer);
  } else {
    // Update callback
    gameTimer = new GameTimer(onComplete, onStart, onStop, isPointTimer);
  }
  return gameTimer;
}

/**
 * Get the current global timer (for rendering)
 */
export function getCurrentTimer(): GameTimer | null {
  return gameTimer;
}

/**
 * Clear the global timer
 */
export function clearGameTimer(): void {
  if (gameTimer) {
    gameTimer.stop();
    gameTimer = null;
  }
}
