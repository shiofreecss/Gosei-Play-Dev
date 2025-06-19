import { Socket } from 'socket.io-client';

export type StoneColor = 'black' | 'white' | null;

export interface Position {
  x: number;
  y: number;
}

export interface Stone {
  position: Position;
  color: StoneColor;
}

export interface Board {
  size: number;
  stones: Stone[];
}

export interface Player {
  id: string;
  username: string;
  color: StoneColor;
  timeRemaining?: number; // Time remaining in seconds
  byoYomiPeriodsLeft?: number; // Number of byo-yomi periods remaining
  byoYomiTimeLeft?: number; // Time remaining in current byo-yomi period (seconds)
  isInByoYomi?: boolean; // Whether player is currently in byo-yomi
  isSpectator?: boolean; // Whether this is a spectator
  isAI?: boolean; // Whether this is an AI player
  aiLevel?: 'easy' | 'normal' | 'hard' | 'expert'; // AI difficulty level
}

// Update ScoringRule to include new rule types
export type ScoringRule = 'chinese' | 'japanese' | 'korean' | 'aga' | 'ing';

// Add GameType for different game modes
export type GameType = 'even' | 'handicap' | 'blitz' | 'teaching' | 'rengo';

export interface Territory {
  position: Position;
  owner: StoneColor;
}

// Add new type for color preference
export type ColorPreference = 'black' | 'white' | 'random';

export interface TimeControlOptions {
  timeControl: number; // minutes per player
  timePerMove?: number; // seconds per move
  byoYomiPeriods?: number; // number of byo-yomi periods
  byoYomiTime?: number; // seconds per byo-yomi period
  fischerTime?: number; // seconds added after each move
}

export interface GameOptions {
  boardSize: number;
  timeControlOptions: TimeControlOptions;
  // These direct time control properties are kept for backward compatibility
  // They are synchronized with timeControlOptions in the UI
  timeControl?: number; // minutes per player (direct property for backward compatibility)
  timePerMove?: number; // seconds per move (direct property for backward compatibility)
  handicap: number;
  scoringRule: ScoringRule;
  gameType?: GameType;
  colorPreference?: ColorPreference;
  isTeachingMode?: boolean;
  teamPlayers?: string[];
  playerName?: string; // Player name when creating a game
  // AI Game Options
  vsAI?: boolean; // Whether this is a game against AI
  aiLevel?: 'easy' | 'normal' | 'hard' | 'expert'; // AI difficulty level
}

export interface GameState {
  id: string;
  code: string;
  board: Board;
  players: Player[];
  spectators?: Player[]; // Array of spectating players
  currentTurn: StoneColor;
  capturedStones: {
    black: number;
    white: number;
  };
  history: GameMove[];
  status: 'waiting' | 'playing' | 'finished' | 'scoring';
  winner: StoneColor | null;
  result?: string; // Game result notation (e.g., B+T, W+T, B+R, W+R, B+5.5, etc.)
  deadStones?: Position[];
  territory?: Territory[];
  scoringRule: ScoringRule;
  gameType?: GameType;
  timeControl: Required<TimeControlOptions>;
  timePerMove?: number;
  lastMoveTime?: number;
  score?: {
    black: number;
    white: number;
    blackTerritory?: number;
    whiteTerritory?: number;
    blackStones?: number;
    whiteStones?: number;
    blackCaptures?: number;
    whiteCaptures?: number;
    deadBlackStones?: number;
    deadWhiteStones?: number;
    komi?: number;
  };
  undoRequest?: {
    requestedBy: string;
    moveIndex: number;
  };
  scoreConfirmation?: {
    black: boolean;
    white: boolean;
  };
  komi: number;
  handicap: number;
  socket?: Socket | null;
  koPosition?: Position;
  lastMove?: Position; // Position of the last move made for highlighting
  // AI Game Properties
  vsAI?: boolean; // Whether this is a game against AI
  aiLevel?: 'easy' | 'normal' | 'hard' | 'expert'; // AI difficulty level
  aiUndoUsed?: boolean; // Whether undo has been used in AI game (limit 1 per game)
}

export type GameMove = Position | { 
  pass: true;
  color?: StoneColor;
  playerId?: string;
  timestamp?: number;
  timeSpentOnMove?: number;
  timeSpentDisplay?: string;
  timeDisplay?: string;
  timeRemaining?: number;
  isInByoYomi?: boolean;
  byoYomiTimeLeft?: number;
  byoYomiPeriodsLeft?: number;
  isForced?: boolean; // For forced moves (like AI unresponsive)
}; 