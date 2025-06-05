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

// Helper functions
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

function handlePlayerTimeout(gameState, player) {
  gameState.status = 'finished';
  const winner = player.color === 'black' ? 'white' : 'black';
  gameState.winner = winner;
  
  // Set the game result with timeout notation
  const result = winner === 'black' ? 'B+T' : 'W+T';
  gameState.result = result;
  
  // Create timeout message based on game type
  const timeoutMessage = player.color === 'black' 
    ? 'Black ran out of time - White wins (W+T)' 
    : 'White ran out of time - Black wins (B+T)';
  
  // Add details about the time control based on game type
  let timeoutDetails;
  if (gameState.gameType === 'blitz') {
    timeoutDetails = `${player.color} exceeded time limit of ${gameState.timePerMove} seconds per move in Blitz game`;
  } else if (player.isInByoYomi) {
    timeoutDetails = `${player.color} used all ${gameState.timeControl.byoYomiPeriods} byo-yomi periods`;
  } else {
    timeoutDetails = `${player.color} exceeded main time limit of ${gameState.timeControl.timeControl} minutes`;
  }
  
  log(`Game ${gameState.id}: ${timeoutMessage} - ${timeoutDetails}`);
  
  // Broadcast timeout and game end with detailed information
  io.to(gameState.id).emit('playerTimeout', {
    gameId: gameState.id,
    playerId: player.id,
    color: player.color,
    winner: winner,
    result: result,
    message: timeoutMessage,
    details: timeoutDetails,
    isInByoYomi: player.isInByoYomi
  });
  
  // Add a chat message about the timeout
  io.to(gameState.id).emit('chatMessage', {
    id: Date.now().toString(),
    playerId: 'system',
    username: 'System',
    message: `${timeoutMessage}. ${timeoutDetails}.`,
    timestamp: Date.now(),
    isSystem: true
  });
  
  broadcastGameUpdate(gameState.id, gameState);
}

// Socket.IO event handlers
io.on('connection', (socket) => {
  log(`New client connected: ${socket.id}`);

  // Create a new game
  socket.on('createGame', async ({ gameState, playerId }) => {
    log(`Creating game: ${gameState.id}, Code: ${gameState.code}`);
    
    // Check for color preference if provided
    if (gameState.colorPreference) {
      log(`Owner requested color preference: ${gameState.colorPreference}`);
      
      // Find the owner player
      const ownerPlayer = gameState.players.find(p => p.id === playerId);
      
      if (ownerPlayer) {
        if (gameState.colorPreference === 'black') {
          ownerPlayer.color = 'black';
        } else if (gameState.colorPreference === 'white') {
          ownerPlayer.color = 'white';
        }
        // If 'random', keep the default assignment
      }
    }
    
    // Initialize time control settings
    if (gameState.timeControl) {
      log(`Setting up time control: Main time: ${gameState.timeControl.timeControl} minutes, ` +
          `Byoyomi: ${gameState.timeControl.byoYomiPeriods} periods of ${gameState.timeControl.byoYomiTime} seconds`);
      
      gameState.lastMoveTime = Date.now();
      
      // Initialize time remaining for each player with full time control
      gameState.players.forEach(player => {
        // Convert minutes to seconds for main time
        player.timeRemaining = gameState.timeControl.timeControl * 60;
        
        // Initialize byo-yomi state
        if (gameState.timeControl.byoYomiPeriods > 0) {
          player.byoYomiPeriodsLeft = gameState.timeControl.byoYomiPeriods;
          player.byoYomiTimeLeft = gameState.timeControl.byoYomiTime;
          player.isInByoYomi = false; // Start in main time
        }
        
        log(`Initialized time for player ${player.id}: ${player.timeRemaining} seconds main time, ` +
            `${player.byoYomiPeriodsLeft || 0} byoyomi periods of ${player.byoYomiTimeLeft || 0} seconds`);
      });
    }
    
    // Initialize blitz game settings if applicable
    if (gameState.gameType === 'blitz') {
      const timePerMove = gameState.timePerMove || GAME_CONFIGURATIONS.blitz.defaultTimePerMove;
      log(`Setting up blitz game with ${timePerMove} seconds per move`);
      
      gameState.timePerMove = timePerMove;
      gameState.lastMoveTime = Date.now();
      
      // Initialize time remaining for each player with time per move
      gameState.players.forEach(player => {
        player.timeRemaining = timePerMove;
        log(`Initialized blitz time for player ${player.id}: ${timePerMove} seconds per move`);
      });
    }
    
    // Store the game state in Redis
    await gameManager.setGame(gameState.id, gameState);
    
    // Join the socket to the game's room
    socket.join(gameState.id);
    await gameManager.setSocketGame(socket.id, gameState.id);
    
    log(`Player ${playerId} created and joined game ${gameState.id}`);
    
    // Use the new broadcast function
    broadcastGameUpdate(gameState.id, gameState);
  });

  // Join an existing game
  socket.on('joinGame', async ({ gameId, playerId, username, isReconnect }) => {
    log(`Player ${playerId} (${username}) joining game ${gameId}`);
    
    // Add socket to the game's room
    socket.join(gameId);
    await gameManager.setSocketGame(socket.id, gameId);
    
    // Get the current game state from Redis
    const gameState = await gameManager.getGame(gameId);
    
    if (gameState) {
      // If this is a reconnect, ensure we keep the player's existing time
      if (isReconnect) {
        // Find the existing player in the game state
        const existingPlayer = gameState.players.find(p => p.id === playerId);
        
        if (existingPlayer) {
          log(`Reconnect: Preserving time for player ${playerId}: ${existingPlayer.timeRemaining} seconds remaining`);
          // Send the current game state with preserved time remaining to the reconnecting client
          socket.emit('gameState', gameState);
          
          // Also send an immediate time update to refresh the UI
          gameState.players.forEach(player => {
            socket.emit('timeUpdate', {
              gameId,
              playerId: player.id,
              color: player.color,
              timeRemaining: player.timeRemaining
            });
          });
        } else {
          log(`Warning: Reconnecting player ${playerId} not found in game ${gameId}`);
          socket.emit('gameState', gameState);
        }
      } else {
        // Handle new player joining (not a reconnect)
        // Find the player in the game state
        const playerIndex = gameState.players.findIndex(p => p.id === playerId);
        
        if (playerIndex === -1) {
          // Determine color for new player
          let newPlayerColor = 'white'; // Default second player is white
          
          // Check if the owner had a color preference
          const ownerPlayer = gameState.players[0];
          if (ownerPlayer && ownerPlayer.color) {
            // Assign opposite color to second player
            newPlayerColor = ownerPlayer.color === 'black' ? 'white' : 'black';
          }
          
          // Add new player with the determined color
          const newPlayer = {
            id: playerId,
            username,
            color: newPlayerColor,
            isInByoYomi: false // Start in main time
          };
          
          // Initialize time settings based on game type
          if (gameState.gameType === 'blitz') {
            // For blitz games, each player gets the time per move
            const timePerMove = gameState.timePerMove || GAME_CONFIGURATIONS.blitz.defaultTimePerMove;
            newPlayer.timeRemaining = timePerMove;
            log(`Initialized blitz time for joining player ${playerId}: ${timePerMove} seconds per move`);
          } else {
            // For standard games, use time control settings
            newPlayer.timeRemaining = gameState.timeControl ? gameState.timeControl.timeControl * 60 : 0;
            newPlayer.byoYomiPeriodsLeft = gameState.timeControl?.byoYomiPeriods || 0;
            newPlayer.byoYomiTimeLeft = gameState.timeControl?.byoYomiTime || 30;
            log(`Initialized standard time for joining player ${playerId}: ${newPlayer.timeRemaining} seconds main time, ` +
                `${newPlayer.byoYomiPeriodsLeft} byoyomi periods of ${newPlayer.byoYomiTimeLeft} seconds`);
          }
          
          gameState.players.push(newPlayer);
          
          // If we now have 2 players, set status to playing
          if (gameState.players.length >= 2) {
            log(`Game ${gameId} now has 2 players, changing status to playing`);
            gameState.status = 'playing';
            
            // For blitz games, don't start the timer until first move
            if (gameState.gameType === 'blitz') {
              // Set lastMoveTime to null so timer doesn't start until first move
              gameState.lastMoveTime = null;
              log(`Blitz game timer will start on first move`);
            } else {
              // For standard games, start timer immediately
              gameState.lastMoveTime = Date.now();
            }
            
            // Keep the current turn as is for handicap games (should be 'white')
            // Only set to 'black' for non-handicap games
            if (gameState.gameType !== 'handicap') {
              gameState.currentTurn = 'black';
            } else {
              log(`This is a handicap game. Current turn remains: ${gameState.currentTurn}`);
              log(`Handicap stones on board: ${gameState.board.stones.filter(s => s.color === 'black').length}`);
            }
            
            log(`Game's currentTurn is set to: ${gameState.currentTurn}`);
            // Debug log to show which player has which color
            gameState.players.forEach(player => {
              log(`Player ${player.username} is ${player.color}`);
            });
          }
        }
        
        // Update stored game state in Redis
        await gameManager.setGame(gameId, gameState);
        
        // Notify other players in the room
        socket.to(gameId).emit('playerJoined', {
          gameId,
          playerId,
          username
        });
        
        // Use the new broadcast function for game updates
        broadcastGameUpdate(gameId, gameState);
      }
      
      // Send join acknowledgment
      socket.emit('joinedGame', { 
        success: true, 
        gameId, 
        playerId,
        numPlayers: gameState.players.length,
        status: gameState.status,
        currentTurn: gameState.currentTurn // Send current turn info explicitly
      });
      
      log(`Game ${gameId} now has ${gameState.players.length} players, status: ${gameState.status}, currentTurn: ${gameState.currentTurn}`);
    } else {
      log(`Game ${gameId} not found in Redis`);
      socket.emit('error', `Game ${gameId} not found`);
    }
  });

  // Handle disconnection
  socket.on('disconnect', async () => {
    log(`Client disconnected: ${socket.id}`);
    
    // Check if this socket was in a game
    const gameId = await gameManager.getSocketGame(socket.id);
    if (gameId) {
      socket.to(gameId).emit('playerDisconnected', {
        gameId,
        socketId: socket.id
      });
      
      // Clean up socket to game mapping
      await gameManager.deleteSocketGame(socket.id);
      
      // If no more clients in the game, remove it after a timeout
      setTimeout(async () => {
        const room = io.sockets.adapter.rooms.get(gameId);
        if (!room || room.size === 0) {
          log(`Removing inactive game ${gameId}`);
          await gameManager.deleteGame(gameId);
        }
      }, 5 * 60 * 1000); // 5 minutes timeout
    }
  });

  // Handle a move
  socket.on('makeMove', async ({ gameId, position, color, playerId }) => {
    const gameState = await gameManager.getGame(gameId);
    if (gameState) {
      // For blitz games, start timer on first move if not already started
      if (gameState.gameType === 'blitz' && !gameState.lastMoveTime) {
        gameState.lastMoveTime = Date.now();
        log(`🏃 BLITZ TIMER STARTED - First move made, timer now active`);
      }
        
      // Enhanced move tracking with detailed timing information
      const movingPlayer = gameState.players.find(p => p.color === color);
      if (movingPlayer) {
        // Calculate actual time spent on this move
        const timeSpentOnMove = calculateMoveTime(gameState);
        const moveTimeDisplay = formatMoveTimeDisplay(timeSpentOnMove);
        
        log(`🎯 MOVE TRACKED - Player ${playerId} made move at (${position.x}, ${position.y}) in game ${gameId} - Time spent: ${moveTimeDisplay} (${movingPlayer.isInByoYomi ? 'Byo-yomi' : 'Main'})`);
        log(`🕐 MOVE TIMING - Player ${color}: Main=${movingPlayer.timeRemaining}s, InByoYomi=${movingPlayer.isInByoYomi}, ByoYomiLeft=${movingPlayer.byoYomiTimeLeft}s, Periods=${movingPlayer.byoYomiPeriodsLeft}`);
      } else {
        log(`Player ${playerId} made move at (${position.x}, ${position.y}) in game ${gameId}`);
      }
    
      // Validate move - check if position is already occupied
      const isOccupied = gameState.board.stones.some(
        stone => stone.position.x === position.x && stone.position.y === position.y
      );
      
      if (isOccupied) {
        log(`Invalid move: Position (${position.x}, ${position.y}) is already occupied`);
        socket.emit('invalidMove', {
          gameId,
          position,
          reason: 'Position already occupied'
        });
        return;
      }
      
      // Add the new stone
      const updatedStones = [...gameState.board.stones, { position, color }];
      
      // Handle capturing stones and KO rules
      const capturedStones = captureDeadStones(gameState, updatedStones, position, color);
      
      // Update board with captured stones removed
      gameState.board.stones = capturedStones.remainingStones;
      
      // Store move information
      gameState.lastMove = position;
      gameState.lastMoveColor = color;
      gameState.lastMovePlayerId = playerId;
      gameState.lastMoveCapturedCount = capturedStones.capturedCount;
      
      // Handle KO position
      if (capturedStones.koPosition) {
        gameState.koPosition = capturedStones.koPosition;
        log(`KO rule in effect at position (${capturedStones.koPosition.x}, ${capturedStones.koPosition.y})`);
      } else {
        gameState.koPosition = null;
      }
      
      // Reset move time for next player
      gameState.lastMoveTime = Date.now();
      
      // For blitz games, set the new player's timer
      if (gameState.gameType === 'blitz' && gameState.timePerMove) {
        const nextPlayer = gameState.players.find(p => p.color === gameState.currentTurn);
        if (nextPlayer) {
          nextPlayer.timeRemaining = gameState.timePerMove;
          log(`Set blitz timer for next player ${nextPlayer.id} (${nextPlayer.color}) to ${gameState.timePerMove} seconds`);
          
          // Send immediate time update for the next player
          io.to(gameId).emit('timeUpdate', {
            gameId,
            playerId: nextPlayer.id,
            color: nextPlayer.color,
            timeRemaining: nextPlayer.timeRemaining
          });
        }
      }
      
      // Update captured stones count
      if (!gameState.capturedStones) {
        gameState.capturedStones = { black: 0, white: 0 };
      }
      if (capturedStones.capturedCount > 0) {
        gameState.capturedStones[color] += capturedStones.capturedCount;
      }
      
      // Change turn immediately - no delay needed since byo-yomi reset events are sent immediately
      gameState.currentTurn = color === 'black' ? 'white' : 'black';
      broadcastGameUpdate(gameId, gameState);
    }
  });

  // Timer tick event to update remaining time with improved synchronization
  socket.on('timerTick', async ({ gameId }) => {
    const gameState = await gameManager.getGame(gameId);
    
    if (gameState && gameState.status === 'playing') {
      const now = Date.now();
      
      // Send server timestamp with every update for synchronization
      const serverTimestamp = now;
      
      // Update time for current player if there's active timing
      const currentPlayer = gameState.players.find(p => p.color === gameState.currentTurn);
      
      if (currentPlayer && gameState.lastMoveTime) {
        const elapsedTime = Math.floor((now - gameState.lastMoveTime) / 1000);
        
        // Calculate accurate current time state without modifying stored values
        let currentTimeRemaining = currentPlayer.timeRemaining;
        let currentByoYomiTime = currentPlayer.byoYomiTimeLeft;
        let currentByoYomiPeriods = currentPlayer.byoYomiPeriodsLeft;
        let currentIsInByoYomi = currentPlayer.isInByoYomi;
        
        // Handle time deduction based on game type
        if (gameState.gameType === 'blitz') {
          // For blitz games, each move has its own timer
          currentTimeRemaining = Math.max(0, gameState.timePerMove - elapsedTime);
          
          // Check for timeout in blitz mode
          if (currentTimeRemaining === 0) {
            log(`⏰ BLITZ TIMEOUT - Player ${currentPlayer.id} (${currentPlayer.color}) exceeded ${gameState.timePerMove}s time limit`);
            handlePlayerTimeout(gameState, currentPlayer);
            return;
          }
        } else {
          // Standard game with main time + byo-yomi
          if (!currentIsInByoYomi) {
            // Still in main time
            currentTimeRemaining = Math.max(0, currentPlayer.timeRemaining - elapsedTime);
            
            if (currentTimeRemaining === 0 && currentByoYomiPeriods > 0) {
              // Transition to byo-yomi
              currentIsInByoYomi = true;
              currentByoYomiTime = gameState.timeControl.byoYomiTime;
              log(`⏰ BYO-YOMI START - Player ${currentPlayer.id} (${currentPlayer.color}) entering byo-yomi with ${currentByoYomiPeriods} periods`);
            } else if (currentTimeRemaining === 0 && currentByoYomiPeriods === 0) {
              // No byo-yomi available, player times out
              log(`⏰ TIMEOUT - Player ${currentPlayer.id} (${currentPlayer.color}) ran out of main time with no byo-yomi periods`);
              handlePlayerTimeout(gameState, currentPlayer);
              return;
            }
          } else {
            // In byo-yomi period
            currentByoYomiTime = Math.max(0, currentPlayer.byoYomiTimeLeft - elapsedTime);
            
            if (currentByoYomiTime === 0) {
              currentByoYomiPeriods--;
              
              if (currentByoYomiPeriods > 0) {
                // Reset byo-yomi time for next period
                currentByoYomiTime = gameState.timeControl.byoYomiTime;
                log(`⏰ BYO-YOMI PERIOD USED - Player ${currentPlayer.id} (${currentPlayer.color}) has ${currentByoYomiPeriods} periods remaining`);
              } else {
                // All byo-yomi periods used, player times out
                log(`⏰ TIMEOUT - Player ${currentPlayer.id} (${currentPlayer.color}) used all byo-yomi periods`);
                handlePlayerTimeout(gameState, currentPlayer);
                return;
              }
            }
          }
        }
        
        // Send time update to all clients
        const timeUpdate = {
          gameId,
          playerId: currentPlayer.id,
          color: currentPlayer.color,
          timeRemaining: currentTimeRemaining,
          byoYomiTimeLeft: currentByoYomiTime,
          byoYomiPeriodsLeft: currentByoYomiPeriods,
          isInByoYomi: currentIsInByoYomi,
          serverTimestamp,
          elapsedTime
        };
        
        io.to(gameId).emit('timeUpdate', timeUpdate);
      }
    }
  });

  // Handle player leaving
  socket.on('leaveGame', async ({ gameId, playerId }) => {
    log(`Player ${playerId} leaving game ${gameId}`);
    
    // Get the game state to find player username
    const gameState = await gameManager.getGame(gameId);
    let username = 'A player'; // Default fallback
    
    if (gameState) {
      const leavingPlayer = gameState.players.find(p => p.id === playerId);
      if (leavingPlayer && leavingPlayer.username) {
        username = leavingPlayer.username;
      }
    }
    
    // Leave the socket room
    socket.leave(gameId);
    await gameManager.deleteSocketGame(socket.id);
    
    // Notify other players with username included
    socket.to(gameId).emit('playerLeft', {
      gameId,
      playerId,
      username
    });
    
    // Check if there are any players left in the game room
    const room = io.sockets.adapter.rooms.get(gameId);
    const clientsCount = room ? room.size : 0;
    
    log(`Game ${gameId} has ${clientsCount} clients remaining after player left`);
    
    // If no players left in the room, remove the game immediately
    if (!room || clientsCount === 0) {
      log(`No players remaining in game ${gameId}, removing it immediately`);
      await gameManager.deleteGame(gameId);
    }
  });

  // Handle game state sync request
  socket.on('requestSync', async ({ gameId, playerId }) => {
    log(`Player ${playerId} requested sync for game ${gameId}`);
    
    const gameState = await gameManager.getGame(gameId);
    if (gameState) {
      log(`Sending sync data for game ${gameId}`);
      socket.emit('syncGameState', gameState);
      
      // Also broadcast to all other clients to ensure everyone is in sync
      socket.to(gameId).emit('syncRequest', { gameId, playerId });
    } else {
      log(`Game ${gameId} not found for sync request`);
      socket.emit('error', `Game ${gameId} not found`);
    }
  });

  // Handle game end after scoring
  socket.on('gameEnded', async ({ gameId, score, winner, territory }) => {
    log(`Game ${gameId} has ended. Winner: ${winner}`);
    
    // Update the game state if it exists in Redis
    const gameState = await gameManager.getGame(gameId);
    if (gameState) {
      // Update game status to finished
      gameState.status = 'finished';
      gameState.score = score;
      gameState.winner = winner;
      gameState.territory = territory;
      
      // Store updated game state
      await gameManager.setGame(gameId, gameState);
      
      // Broadcast the game end to ALL clients in the room
      io.to(gameId).emit('gameFinished', {
        gameId,
        score,
        winner,
        territory
      });
      log(`Broadcasting game end to all clients in room ${gameId}`);
      
      // Use the new broadcast function for move updates
      broadcastGameUpdate(gameId, gameState);
      
      // Also broadcast the full game state
      io.to(gameId).emit('gameState', gameState);
      log(`Broadcasting final game state to all clients in room ${gameId}`);
    }
  });

  // Handle cancel scoring phase
  socket.on('cancelScoring', async ({ gameId }) => {
    log(`Canceling scoring phase for game ${gameId}`);
    
    // Update the game state if it exists in Redis
    const gameState = await gameManager.getGame(gameId);
    if (gameState) {
      // Only allow cancellation if in scoring mode
      if (gameState.status !== 'scoring') {
        log(`Cannot cancel scoring: game ${gameId} not in scoring mode`);
        socket.emit('error', 'Cannot cancel scoring: game not in scoring mode');
        return;
      }
      
      // Return to playing state
      gameState.status = 'playing';
      gameState.deadStones = []; // Clear dead stones
      gameState.territory = undefined; // Clear territory visualization
      
      // Store updated game state
      await gameManager.setGame(gameId, gameState);
      
      // Use the new broadcast function for move updates
      broadcastGameUpdate(gameId, gameState);
      
      // Broadcast the cancel to ALL clients in the room
      io.to(gameId).emit('scoringCanceled', {
        gameId
      });
      log(`Broadcasting scoring cancellation to all clients in room ${gameId}`);
      
      // Also broadcast the full game state
      io.to(gameId).emit('gameState', gameState);
      log(`Broadcasting updated game state to all clients in room ${gameId}`);
    }
  });

  // Handle player resignation
  socket.on('resignGame', async ({ gameId, playerId, color }) => {
    log(`Player ${playerId} (${color}) resigned from game ${gameId}`);
    
    // Update the game state if it exists in Redis
    const gameState = await gameManager.getGame(gameId);
    if (gameState) {
      // Set game as finished with the opponent as winner
      gameState.status = 'finished';
      const winner = color === 'black' ? 'white' : 'black';
      gameState.winner = winner;
      
      // Set the game result with resignation notation
      const result = winner === 'black' ? 'B+R' : 'W+R';
      gameState.result = result;
      
      // Create resignation message
      const resignationMessage = color === 'black' 
        ? 'Black resigned - White win (W+R)' 
        : 'White resigned - Black win (B+R)';
      
      log(`Game ${gameState.id}: ${resignationMessage}`);
      
      // Store updated game state
      await gameManager.setGame(gameId, gameState);
      
      // Use the new broadcast function for move updates
      broadcastGameUpdate(gameId, gameState);
      
      // Broadcast the resignation to ALL clients in the room
      io.to(gameId).emit('playerResigned', {
        gameId,
        playerId,
        color,
        winner: gameState.winner,
        result: result,
        message: resignationMessage
      });
      log(`Broadcasting resignation to all clients in room ${gameId}`);
      
      // Also broadcast the full game state
      io.to(gameId).emit('gameState', gameState);
      log(`Broadcasting updated game state to all clients in room ${gameId}`);
    }
  });

  // Handle chat messages
  socket.on('chatMessage', async ({ gameId, playerId, username, message }) => {
    log(`Chat message from ${username} (${playerId}) in game ${gameId}: ${message}`);
    
    // Get the current game state
    const gameState = await gameManager.getGame(gameId);
    
    if (gameState) {
      // Broadcast the message to all clients in the game room
      io.to(gameId).emit('chatMessage', {
        id: Date.now().toString(),
        playerId,
        username,
        message,
        timestamp: Date.now()
      });
      
      log(`Broadcasting chat message to all clients in room ${gameId}`);
    }
  });

  // Handle undo request
  socket.on('requestUndo', async ({ gameId, playerId, moveIndex }) => {
    log(`Player ${playerId} requested undo to move ${moveIndex} in game ${gameId}`);
    
    const gameState = await gameManager.getGame(gameId);
    if (gameState) {
      // Add undo request to game state
      gameState.undoRequest = {
        requestedBy: playerId,
        moveIndex
      };
      
      // Store updated game state
      await gameManager.setGame(gameId, gameState);
      
      // Use the new broadcast function for move updates
      broadcastGameUpdate(gameId, gameState);
    }
  });

  // Handle undo response
  socket.on('respondUndo', async ({ gameId, playerId, accepted, moveIndex }) => {
    log(`Player ${playerId} ${accepted ? 'accepted' : 'declined'} undo request for move ${moveIndex} in game ${gameId}`);
    
    const gameState = await gameManager.getGame(gameId);
    if (gameState && gameState.undoRequest) {
      if (accepted) {
        // Implement undo logic here
        // This would require storing move history and reverting the board state
        log(`Undo accepted - reverting to move ${moveIndex}`);
        // For now, just clear the undo request
        gameState.undoRequest = null;
      } else {
        // Undo declined
        log(`Undo declined by player ${playerId}`);
        gameState.undoRequest = null;
      }
      
      // Store updated game state
      await gameManager.setGame(gameId, gameState);
      
      // Broadcast undo response
      io.to(gameId).emit('undoResponse', {
        gameId,
        playerId,
        accepted,
        moveIndex
      });
      
      // Use the new broadcast function for updates
      broadcastGameUpdate(gameId, gameState);
    }
  });

  // Handle play again request
  socket.on('playAgainRequest', async ({ gameId, fromPlayerId, fromUsername, toPlayerId }) => {
    log(`Player ${fromPlayerId} (${fromUsername}) requested play again in game ${gameId} to player ${toPlayerId}`);
    
    const gameState = await gameManager.getGame(gameId);
    if (gameState) {
      // Send to all sockets in the game room, the client will filter by player ID
      io.to(gameId).emit('playAgainRequest', {
        gameId,
        fromPlayerId,
        fromUsername,
        toPlayerId
      });
      
      log(`Play again request sent from ${fromUsername} to player ${toPlayerId} in game ${gameId}`);
    } else {
      log(`Play again request failed: Game ${gameId} not found`);
      socket.emit('error', `Game ${gameId} not found`);
    }
  });

  // Handle play again response
  socket.on('playAgainResponse', async ({ gameId, fromPlayerId, toPlayerId, accepted }) => {
    log(`Player ${toPlayerId} ${accepted ? 'accepted' : 'declined'} play again request from ${fromPlayerId} in game ${gameId}`);
    
    const gameState = await gameManager.getGame(gameId);
    if (gameState) {
      if (accepted) {
        // Create a new game with the same players
        const newGameId = uuidv4();
        const newGameCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        // Create new game state based on original
        const newGameState = {
          id: newGameId,
          code: newGameCode,
          status: 'waiting',
          board: {
            size: gameState.board.size,
            stones: []
          },
          players: gameState.players.map(player => ({
            ...player,
            // Reset time for new game
            timeRemaining: gameState.timeControl ? gameState.timeControl.timeControl * 60 : 0,
            byoYomiPeriodsLeft: gameState.timeControl?.byoYomiPeriods || 0,
            byoYomiTimeLeft: gameState.timeControl?.byoYomiTime || 30,
            isInByoYomi: false
          })),
          currentTurn: 'black',
          gameType: gameState.gameType,
          timeControl: gameState.timeControl,
          timePerMove: gameState.timePerMove,
          lastMoveTime: null,
          capturedStones: { black: 0, white: 0 }
        };
        
        // Store new game in Redis
        await gameManager.setGame(newGameId, newGameState);
        
        // Move both players to the new game
        const gameRoomSockets = await io.in(gameId).fetchSockets();
        for (const socket of gameRoomSockets) {
          const socketId = socket.id;
          const oldGameId = await gameManager.getSocketGame(socketId);
          if (oldGameId === gameId) {
            socket.leave(gameId);
            socket.join(newGameId);
            await gameManager.setSocketGame(socketId, newGameId);
          }
        }
        
        log(`Created new game ${newGameId} (${newGameCode}) for play again request`);
        
        // Broadcast the new game to both players with a slight delay to ensure socket rooms are updated
        setTimeout(() => {
          io.to(newGameId).emit('playAgainResponse', {
            accepted: true,
            gameId: newGameId,
            newGameState: newGameState
          });
          
          // Also emit the game state
          broadcastGameUpdate(newGameId, newGameState);
        }, 100);
        
      } else {
        // Request was declined
        io.to(gameId).emit('playAgainResponse', {
          accepted: false,
          gameId: gameId
        });
        log(`Play again request declined in game ${gameId}`);
      }
    } else {
      log(`Play again response failed: Game ${gameId} not found`);
      socket.emit('error', `Game ${gameId} not found`);
    }
  });
});

// Route to check server status
app.get('/', (req, res) => {
  res.send('Socket server is running (Clustered)');
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  log(`Socket server listening on port ${PORT}`);
});

// Export for testing
module.exports = { app, server, io }; 