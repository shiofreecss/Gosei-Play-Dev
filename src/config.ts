// Configuration for environment-specific settings

// Get the current environment
const isDev = process.env.NODE_ENV === 'development';

// Socket server URL
export const SOCKET_URL = isDev 
  ? 'http://localhost:3001' 
  : process.env.REACT_APP_SOCKET_URL || 'https://svr-01.gosei.xyz';

// API base URL
export const API_BASE_URL = isDev
  ? 'http://localhost:3001/api'
  : '/.netlify/functions/api';

// Game configuration
export const DEFAULT_BOARD_SIZE = 19;
export const DEFAULT_KOMI = 6.5; // Points added to white's score to balance first-move advantage

// Local storage keys
export const STORAGE_PREFIX = 'gosei-play';
export const PLAYER_ID_KEY = `${STORAGE_PREFIX}-player-id`;
export const GAME_HISTORY_KEY = `${STORAGE_PREFIX}-game-history`; 