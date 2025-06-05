const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const Redis = require('ioredis');
const { createAdapter } = require('@socket.io/redis-adapter');

const app = express();
app.use(cors());

// Redis configuration for clustering
const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: 0,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true
};

// Initialize Redis clients
const pubClient = new Redis(REDIS_CONFIG);
const subClient = pubClient.duplicate();

// Redis connection handling
pubClient.on('connect', () => {
  console.log(`📡 Redis Publisher connected (Worker ${process.pid})`);
});

subClient.on('connect', () => {
  console.log(`📡 Redis Subscriber connected (Worker ${process.pid})`);
});

pubClient.on('error', (err) => {
  console.error('❌ Redis Publisher error:', err.message);
});

subClient.on('error', (err) => {
  console.error('❌ Redis Subscriber error:', err.message);
});

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 30000,
  maxHttpBufferSize: 1e8
});

// Set up Redis adapter for Socket.IO clustering
io.adapter(createAdapter(pubClient, subClient));

// Game state management with Redis
class GameStateManager {
  constructor() {
    this.redis = new Redis(REDIS_CONFIG);
    this.GAME_PREFIX = 'game:';
    this.SOCKET_PREFIX = 'socket:';
    this.GAME_TTL = 24 * 60 * 60; // 24 hours TTL
  }

  async setGame(gameId, gameState) {
    try {
      await this.redis.setex(
        `${this.GAME_PREFIX}${gameId}`, 
        this.GAME_TTL, 
        JSON.stringify(gameState)
      );
    } catch (err) {
      console.error('Redis setGame error:', err);
    }
  }

  async getGame(gameId) {
    try {
      const data = await this.redis.get(`${this.GAME_PREFIX}${gameId}`);
      return data ? JSON.parse(data) : null;
    } catch (err) {
      console.error('Redis getGame error:', err);
      return null;
    }
  }

  async deleteGame(gameId) {
    try {
      await this.redis.del(`${this.GAME_PREFIX}${gameId}`);
    } catch (err) {
      console.error('Redis deleteGame error:', err);
    }
  }

  async setSocketGame(socketId, gameId) {
    try {
      await this.redis.setex(
        `${this.SOCKET_PREFIX}${socketId}`, 
        this.GAME_TTL, 
        gameId
      );
    } catch (err) {
      console.error('Redis setSocketGame error:', err);
    }
  }

  async getSocketGame(socketId) {
    try {
      return await this.redis.get(`${this.SOCKET_PREFIX}${socketId}`);
    } catch (err) {
      console.error('Redis getSocketGame error:', err);
      return null;
    }
  }

  async deleteSocketGame(socketId) {
    try {
      await this.redis.del(`${this.SOCKET_PREFIX}${socketId}`);
    } catch (err) {
      console.error('Redis deleteSocketGame error:', err);
    }
  }

  async getAllGames() {
    try {
      const keys = await this.redis.keys(`${this.GAME_PREFIX}*`);
      const games = {};
      
      if (keys.length > 0) {
        const values = await this.redis.mget(keys);
        keys.forEach((key, index) => {
          if (values[index]) {
            const gameId = key.replace(this.GAME_PREFIX, '');
            games[gameId] = JSON.parse(values[index]);
          }
        });
      }
      
      return games;
    } catch (err) {
      console.error('Redis getAllGames error:', err);
      return {};
    }
  }
}

const gameManager = new GameStateManager();

// Debug flag
const DEBUG = true;

// Game configurations
const GAME_CONFIGURATIONS = {
  standard: {
    name: 'Standard',
    description: 'Traditional Go with main time + byo-yomi periods'
  },
  blitz: {
    name: 'Blitz',
    description: 'Fast-paced games with time per move limit',
    defaultTimePerMove: 30
  }
};

function log(message) {
  if (DEBUG) {
    console.log(`[Worker ${process.pid}] [${new Date().toISOString()}] ${message}`);
  }
}

// Helper functions (keeping existing ones)
function formatTimeDisplay(player) {
  if (player.isInByoYomi) {
    const minutes = Math.floor(player.byoYomiTimeLeft / 60);
    const seconds = player.byoYomiTimeLeft % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}s (BY-${player.byoYomiPeriodsLeft})`;
  } else {
    const minutes = Math.floor(player.timeRemaining / 60);
    const seconds = player.timeRemaining % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}s (Main)`;
  }
}

function calculateMoveTime(gameState) {
  if (!gameState.lastMoveTime) {
    return 0;
  }
  return Math.floor((Date.now() - gameState.lastMoveTime) / 1000);
}

function formatMoveTimeDisplay(timeSpentSeconds) {
  const minutes = Math.floor(timeSpentSeconds / 60);
  const seconds = timeSpentSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}s`;
}

async function broadcastGameUpdate(gameId, gameState) {
  // Update Redis first
  await gameManager.setGame(gameId, gameState);
  
  // First send immediate move notification if there's a last move
  if (gameState.lastMove) {
    io.to(gameId).emit('moveMade', {
      position: gameState.lastMove,
      color: gameState.lastMoveColor,
      playerId: gameState.lastMovePlayerId,
      capturedCount: gameState.lastMoveCapturedCount || 0
    });
  }
  
  // Then broadcast full state update
  io.to(gameId).emit('gameState', gameState);
  
  if (gameState.koPosition) {
    log(`Broadcasting game update with KO position at (${gameState.koPosition.x}, ${gameState.koPosition.y})`);
  }
} 