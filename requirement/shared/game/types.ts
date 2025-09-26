export type InputMessage = {
  type: 'input';
  direction: 'up' | 'down' | 'stop';
};

export type ResetMessage = {
  type: 'reset';
};

export type StartMessage = {
  type: 'start';
};

export type PauseMessage = {
  type: 'pause';
};

export type StateMessage = {
  type: 'state';
  state: GameState;
  paused: boolean;
};

export type ServerMessage = InputMessage | ResetMessage | StartMessage | PauseMessage | StateMessage | SettingsMessage;

export type GameState = {
  ball: { x: number; y: number };
  paddles: { p1: number; p2: number };
  score: { p1: number; p2: number };
  ballColor?: string;
  paddleColor?: string;
  player1Name?: string;
  player2Name?: string;
  player1Controls?: string;
  player2Controls?: string;
  isPlayer1Current?: boolean;
  isPlayer2Current?: boolean;
};

export type SettingsMessage = {
  type: 'settings:set';
  speedPercent?: number;
  ballColor?: string;
  paddleColor?: string;
};

export type MatchResult = {
  p1: string;
  p2: string;
  s1: number;
  s2: number;
};

export type Standing = {
  name: string;
  played: number;
  wins: number;
  losses: number;
  points: number; 
};
