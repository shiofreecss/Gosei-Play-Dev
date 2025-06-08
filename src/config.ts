// Configuration for environment-specific settings

// Get the current environment
const isDev = process.env.NODE_ENV === 'development';

// Get the server host for LAN support
const getServerHost = () => {
  // Allow environment variable to override server host for LAN play
  if (process.env.REACT_APP_SERVER_HOST) {
    return process.env.REACT_APP_SERVER_HOST;
  }
  
  // In development, check if we're accessing via LAN IP
  if (isDev && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    // If we're accessing the React app via LAN IP, assume server is on same host
    return window.location.hostname;
  }
  
  // Default to localhost for development
  return 'localhost';
};

// Socket server URL
export const SOCKET_URL = isDev 
  ? `http://${getServerHost()}:3001`
  : process.env.REACT_APP_SOCKET_URL || 'https://gosei-svr-01.beaver.foundation';

// API base URL
export const API_BASE_URL = isDev
  ? `http://${getServerHost()}:3001/api`
  : '/.netlify/functions/api';

// Game configuration
export const DEFAULT_BOARD_SIZE = 19;
export const DEFAULT_KOMI = 6.5; // Points added to white's score to balance first-move advantage

// Local storage keys
export const STORAGE_PREFIX = 'gosei-play';
export const PLAYER_ID_KEY = `${STORAGE_PREFIX}-player-id`;
export const GAME_HISTORY_KEY = `${STORAGE_PREFIX}-game-history`; 