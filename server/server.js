const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

// Import AI game manager (moved to top to fix initialization order)
const AIGameManager = require('./managers/ai-game-manager');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*", // Allow connections from any origin for development
    methods: ["GET", "POST"]
  },
  // Add these settings to fix disconnection issues
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 30000,
  maxHttpBufferSize: 1e8
});

// CRITICAL FIX: Redis adapter for Socket.IO load balancing
// This fixes the "game not found" issue when using multiple server instances
const setupRedisAdapter = async () => {
  try {
    // Always try to setup Redis adapter in production OR if Redis URL is provided
    // This ensures the fix works even if NODE_ENV isn't explicitly set to production
    if (process.env.REDIS_URL || process.env.NODE_ENV === 'production') {
      const { createAdapter } = require('@socket.io/redis-adapter');
      const { createClient } = require('redis');
      
      console.log('🔄 Setting up Redis adapter for Socket.IO scaling...');
      console.log('🔧 Environment: NODE_ENV=' + process.env.NODE_ENV + ', REDIS_URL=' + process.env.REDIS_URL);
      
      // Use REDIS_URL if provided, otherwise use localhost with password
      let redisConfig;
      if (process.env.REDIS_URL) {
        // Parse the REDIS_URL (e.g., redis://127.0.0.1:6379)
        redisConfig = {
          url: process.env.REDIS_URL
        };
        
        // Add password if provided separately
        if (process.env.REDIS_PASSWORD) {
          redisConfig.password = process.env.REDIS_PASSWORD;
        }
      } else {
        // Fallback to manual configuration
        redisConfig = {
          socket: {
            host: '127.0.0.1',
            port: 6379
          }
        };
        
        // Add password if provided
        if (process.env.REDIS_PASSWORD) {
          redisConfig.password = process.env.REDIS_PASSWORD;
        }
      }
      
      console.log('🔧 Redis config:', { ...redisConfig, password: redisConfig.password ? '[HIDDEN]' : 'none' });
      
      const pubClient = createClient(redisConfig);
      const subClient = pubClient.duplicate();
      
      // Add connection event handlers before connecting
      pubClient.on('connect', () => {
        console.log('✅ Redis PubClient connected');
      });
      
      subClient.on('connect', () => {
        console.log('✅ Redis SubClient connected');
      });
      
      pubClient.on('ready', () => {
        console.log('🚀 Redis PubClient ready');
      });
      
      subClient.on('ready', () => {
        console.log('🚀 Redis SubClient ready');
      });
      
      // Connect to Redis
      console.log('🔌 Connecting to Redis...');
      await pubClient.connect();
      await subClient.connect();
      
      // Set up the adapter
      const adapter = createAdapter(pubClient, subClient);
      io.adapter(adapter);
      
      console.log('✅ Redis adapter connected successfully - Socket.IO scaling enabled');
      console.log('🎯 Multiple server instances can now share game state');
      
      // Handle Redis connection errors gracefully
      pubClient.on('error', (err) => {
        console.error('❌ Redis Pub Client Error:', err);
        console.log('⚠️  Falling back to memory adapter for this instance');
      });
      
      subClient.on('error', (err) => {
        console.error('❌ Redis Sub Client Error:', err);
        console.log('⚠️  Falling back to memory adapter for this instance');
      });
      
      return { pubClient, subClient };
    } else {
      console.log('⚠️  Redis adapter not configured - using memory adapter (single instance mode)');
      console.log('💡 To enable Redis scaling, set REDIS_URL or NODE_ENV=production');
      return null;
    }
  } catch (error) {
    console.error('❌ Redis adapter setup failed:', error.message);
    console.error('❌ Stack trace:', error.stack);
    console.log('⚠️  Falling back to memory adapter - Socket.IO will work but may have scaling issues');
    console.log('🔧 Debug info - NODE_ENV:', process.env.NODE_ENV, 'REDIS_URL:', process.env.REDIS_URL);
    return null;
  }
};

// Initialize Redis adapter
setupRedisAdapter().catch(err => {
  console.error('Redis adapter initialization error:', err);
});

// Store active games in memory
const activeGames = new Map();
// Map socket IDs to game IDs for quick lookup
const socketToGame = new Map();
// Debug flag
const DEBUG = true;

// Import captcha validation utilities
const { validateGameCreation } = require('./utils/captcha');

// Initialize AI Game Manager
const aiGameManager = new AIGameManager();

// Game types and their default configurations
const GAME_CONFIGURATIONS = {
  standard: {
    name: 'Standard',
    description: 'Traditional Go with main time + byo-yomi periods'
  },
  blitz: {
    name: 'Blitz',
    description: 'Fast-paced games with time per move limit',
    defaultTimePerMove: 30 // Default 30 seconds per move
  }
};

// Simple logging function
function log(message) {
  if (DEBUG) {
    console.log(`[${new Date().toISOString()}] ${message}`);
  }
}

// Helper function to format time display consistently
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

// Helper function to calculate actual time spent on a move
function calculateMoveTime(gameState) {
  if (!gameState.lastMoveTime) {
    return 0;
  }
  return Math.floor((Date.now() - gameState.lastMoveTime) / 1000);
}

// Helper function to format move time display
function formatMoveTimeDisplay(timeSpentSeconds) {
  const minutes = Math.floor(timeSpentSeconds / 60);
  const seconds = timeSpentSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}s`;
}

// Improved broadcast function for better synchronization
function broadcastGameUpdate(gameId, gameState) {
  // First send immediate move notification if there's a last move
  if (gameState.lastMove) {
    io.to(gameId).emit('moveMade', {
      position: gameState.lastMove,
      color: gameState.lastMoveColor,
      playerId: gameState.lastMovePlayerId,
      capturedCount: gameState.lastMoveCapturedCount || 0
    });
  }
  
  // Make sure the KO position is properly included if it exists
  if (gameState.koPosition) {
    log(`Broadcasting game update with KO position at (${gameState.koPosition.x}, ${gameState.koPosition.y})`);
  }
  
  // Then broadcast full state update
  io.to(gameId).emit('gameState', gameState);
  
  // Store the game state
  activeGames.set(gameId, gameState);
}

function processUndo(gameState, moveIndex, gameId) {
  // Revert to the requested move index (keep all moves up to but not including moveIndex)
  const historyToKeep = gameState.history.slice(0, moveIndex);
  
  log(`Undo accepted: Keeping ${historyToKeep.length} moves out of ${gameState.history.length} total moves`);
  
  // Reset board state and replay from the beginning
  let stones = [];
  let currentTurn = 'black'; // Black always starts first
  let capturedStones = { black: 0, white: 0 };
  
  // ONLY add handicap stones if this is actually a handicap game AND we're going back to the beginning
  if (gameState.gameType === 'handicap' && gameState.handicap > 0 && historyToKeep.length === 0) {
    // Find handicap stones from the original board setup
    const handicapStones = getHandicapStones(gameState.board.size, gameState.handicap);
    stones = handicapStones;
    currentTurn = 'white'; // White plays first in handicap games
    log(`Added ${handicapStones.length} handicap stones for handicap game`);
  }
  
  // Replay each move in the history with proper capture logic
  historyToKeep.forEach((move, index) => {
    if (!move.pass) {
      // Extract position from move - handle both formats safely
      let position;
      if (move.position && typeof move.position === 'object' && typeof move.position.x === 'number' && typeof move.position.y === 'number') {
        // Server format: { position: { x, y }, ... }
        position = move.position;
      } else if (typeof move === 'object' && typeof move.x === 'number' && typeof move.y === 'number') {
        // Client format: { x, y }
        position = move;
      } else {
        log(`ERROR: Invalid move format during undo replay at index ${index}:`, move);
        return; // Skip this invalid move
      }
      
      // Validate position is within bounds
      if (position.x < 0 || position.x >= gameState.board.size || position.y < 0 || position.y >= gameState.board.size) {
        log(`ERROR: Invalid position during undo replay at index ${index}: (${position.x}, ${position.y})`);
        return; // Skip this invalid move
      }
      
      // Add the stone
      const newStone = {
        position: position,
        color: currentTurn
      };
      stones.push(newStone);
      
      // Apply capture logic (simplified version)
      const updatedStones = [...stones];
      const captureResult = captureDeadStones(
        { ...gameState, board: { ...gameState.board, stones: updatedStones } },
        updatedStones,
        newStone.position,
        currentTurn
      );
      
      stones = captureResult.remainingStones;
      
      // Update captured count
      capturedStones[currentTurn] += captureResult.capturedCount;
      
      log(`Replayed move ${index + 1}: ${currentTurn} at (${newStone.position.x}, ${newStone.position.y}), captured ${captureResult.capturedCount} stones`);
    }
    
    // Toggle turn for next move
    currentTurn = currentTurn === 'black' ? 'white' : 'black';
  });
  
  // Calculate the current turn after undo
  let nextTurn;
  if (gameState.gameType === 'handicap' && gameState.handicap > 0) {
    // In handicap games, white starts first, so:
    // historyToKeep.length = 0 -> white's turn
    // historyToKeep.length = 1 -> black's turn  
    // historyToKeep.length = 2 -> white's turn
    nextTurn = historyToKeep.length % 2 === 0 ? 'white' : 'black';
  } else {
    // In normal games, black starts first, so:
    // historyToKeep.length = 0 -> black's turn
    // historyToKeep.length = 1 -> white's turn
    // historyToKeep.length = 2 -> black's turn
    nextTurn = historyToKeep.length % 2 === 0 ? 'black' : 'white';
  }
  
  // Update game state
  gameState.board.stones = stones;
  gameState.currentTurn = nextTurn;
  gameState.history = historyToKeep;
  gameState.capturedStones = capturedStones;
  
  // Clear KO position since board state changed
  gameState.koPosition = undefined;
  
  // Clear the undo request (in case it was set)
  gameState.undoRequest = undefined;
  
  // Mark AI undo as used if this is an AI game
  const isAIGame = gameState.players.some(player => player.isAI);
  if (isAIGame) {
    gameState.aiUndoUsed = true;
    log(`AI undo used - no more undos allowed in this AI game`);
  }
  
  // Store updated game state
  activeGames.set(gameId, gameState);
  
  // Use the new broadcast function for move updates
  broadcastGameUpdate(gameId, gameState);
  
  log(`Undo completed: Board has ${stones.length} stones, next turn: ${nextTurn}`);
}

// Improved timer handling function
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

io.on('connection', (socket) => {
  log(`New client connected: ${socket.id}`);

  // Create a new game
  socket.on('createGame', ({ gameState, playerId, captcha, captchaAnswer, multiCaptcha, captchaAnswers, playerName }) => {
    log(`Creating game: ${gameState.id}, Code: ${gameState.code}`);
    
    // Get client IP for rate limiting
    const clientIP = socket.handshake.address || socket.conn.remoteAddress || 'unknown';
    
    // Validate captcha and rate limiting
    const validation = validateGameCreation({
      playerName: playerName || gameState.players[0]?.username,
      captcha,
      captchaAnswer,
      multiCaptcha,
      captchaAnswers
    }, clientIP);
    
    if (!validation.valid) {
      log(`Game creation validation failed: ${validation.error}`);
      socket.emit('gameCreationError', {
        error: validation.error,
        resetTime: validation.resetTime
      });
      return;
    }
    
    log(`Captcha validation passed for game creation`);
    
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
    
    // Store the game state
    activeGames.set(gameState.id, gameState);
    
    // Join the socket to the game's room
    socket.join(gameState.id);
    socketToGame.set(socket.id, gameState.id);
    
    log(`Player ${playerId} created and joined game ${gameState.id}`);
    
    // Check if this should be an AI game
    if (gameState.vsAI) {
      const humanPlayer = gameState.players.find(p => p.id === playerId);
      const aiLevel = gameState.aiLevel || 'normal';
      
      log(`🤖 Creating AI game with level: ${aiLevel}`);
      
      // Create AI player asynchronously
      aiGameManager.createAIGame(gameState, humanPlayer, aiLevel)
        .then((aiPlayer) => {
          log(`✅ AI player created: ${aiPlayer.username}`);
          
          // Set game status to playing since we now have 2 players (human + AI)
          gameState.status = 'playing';
          
          // Start the timer for standard games
          if (gameState.gameType !== 'blitz') {
            gameState.lastMoveTime = Date.now();
          }
          
          log(`Game ${gameState.id} status set to playing with AI opponent`);
          
          // Update the stored game state
          activeGames.set(gameState.id, gameState);
          
          // Broadcast updated game state with AI player
          broadcastGameUpdate(gameState.id, gameState);
          
          // If AI plays first (black), make first move
          if (aiPlayer.color === 'black') {
            setTimeout(() => {
              makeAIMove(gameState.id);
            }, 1000); // Small delay for better UX
          }
        })
        .catch((error) => {
          log(`❌ Failed to create AI player: ${error.message}`);
          socket.emit('gameCreationError', {
            error: 'Failed to create AI opponent. Please try again.'
          });
        });
    }
    
    // Use the new broadcast function
    broadcastGameUpdate(gameState.id, gameState);
  });

  // Join an existing game
  socket.on('joinGame', ({ gameId, playerId, username, isReconnect, asSpectator }) => {
    log(`Player ${playerId} (${username}) joining game ${gameId}${asSpectator ? ' as spectator' : ''}`);
    
    // Add socket to the game's room
    socket.join(gameId);
    socketToGame.set(socket.id, gameId);
    
    // Get the current game state
    const gameState = activeGames.get(gameId);
    
    if (gameState) {
      // Initialize spectators array if it doesn't exist
      if (!gameState.spectators) {
        gameState.spectators = [];
      }
      
      // If this is a reconnection or spectator joining
      if (isReconnect) {
        // Find the existing player in the game state (check both players and spectators)
        const existingPlayer = gameState.players.find(p => p.id === playerId);
        const existingSpectator = gameState.spectators.find(p => p.id === playerId);
        
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
          
          // Notify other players that this player has rejoined
          socket.to(gameId).emit('playerJoined', {
            gameId,
            playerId,
            username,
            isReconnect: true,
            isSpectator: false
          });
        } else if (existingSpectator) {
          log(`Spectator reconnect: ${playerId}`);
          socket.emit('gameState', gameState);
          
          // Spectators rejoin silently - no notifications
        } else {
          log(`Warning: Reconnecting player/spectator ${playerId} not found in game ${gameId}`);
          socket.emit('gameState', gameState);
        }
      } else if (asSpectator || gameState.players.length >= 2) {
        // Join as spectator if explicitly requested or if game already has 2 players
        const spectator = {
          id: playerId,
          username,
          color: null,
          isSpectator: true
        };
        
        // Check if spectator already exists
        const existingSpectatorIndex = gameState.spectators.findIndex(s => s.id === playerId);
        if (existingSpectatorIndex === -1) {
          gameState.spectators.push(spectator);
          log(`Added spectator ${username} to game ${gameId}`);
        }
        
        // Update stored game state
        activeGames.set(gameId, gameState);
        
        // Send acknowledgment
        socket.emit('joinedGame', { 
          success: true, 
          gameId, 
          playerId,
          isSpectator: true,
          numPlayers: gameState.players.length,
          numSpectators: gameState.spectators.length,
          status: gameState.status,
          currentTurn: gameState.currentTurn
        });
        
        // Spectators join silently - no notifications
        
        // Use the new broadcast function for game updates
        broadcastGameUpdate(gameId, gameState);
        
        log(`Game ${gameId} now has ${gameState.players.length} players and ${gameState.spectators.length} spectators`);
        return;
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
        
        // Update stored game state
        activeGames.set(gameId, gameState);
        
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
      log(`Game ${gameId} not found in active games`);
      socket.emit('error', `Game ${gameId} not found`);
    }
  });

  // Handle a move
  socket.on('makeMove', ({ gameId, position, color, playerId }) => {
    const gameState = activeGames.get(gameId);
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
        const currentTimeDisplay = formatTimeDisplay(movingPlayer);
        
        log(`🎯 MOVE TRACKED - Player ${playerId} made move at (${position.x}, ${position.y}) in game ${gameId} - Time spent: ${moveTimeDisplay} (${movingPlayer.isInByoYomi ? 'Byo-yomi' : 'Main'})`);
        log(`🕐 MOVE TIMING - Player ${color}: Main=${movingPlayer.timeRemaining}s, InByoYomi=${movingPlayer.isInByoYomi}, ByoYomiLeft=${movingPlayer.byoYomiTimeLeft}s, Periods=${movingPlayer.byoYomiPeriodsLeft}`);
      } else {
        log(`Player ${playerId} made move at (${position.x}, ${position.y}) in game ${gameId}`);
      }
    } else {
      log(`Player ${playerId} made move at (${position.x}, ${position.y}) in game ${gameId}`);
    }
    
    if (gameState) {
        
        // Validate move - check if position is already occupied
      const isOccupied = gameState.board.stones.some(
        stone => stone.position.x === position.x && stone.position.y === position.y
      );
      
      if (isOccupied) {
        log(`Invalid move - position already occupied`);
        socket.emit('error', 'Invalid move - position already occupied');
        return;
      }
      
      // Check for KO rule violation
      if (gameState.koPosition && 
          position.x === gameState.koPosition.x && 
          position.y === gameState.koPosition.y) {
        log(`Invalid move - KO rule violation at (${position.x}, ${position.y})`);
        socket.emit('error', 'Invalid move - KO rule violation');
        return;
      }
      
      // Track last move for immediate updates
      gameState.lastMove = position;
      gameState.lastMoveColor = color;
      gameState.lastMovePlayerId = playerId;
      
      // Add the stone
      const updatedStones = [...gameState.board.stones, {
        position,
        color
      }];
      
      // Capture opponent stones
      const capturedStones = captureDeadStones(gameState, updatedStones, position, color);
      gameState.lastMoveCapturedCount = capturedStones.capturedCount;
      
      // Update game state (but don't change turn yet if byo-yomi reset needed)
      gameState.board.stones = capturedStones.remainingStones;
      
      // Get moving player for history and time handling
      const movingPlayer = gameState.players.find(p => p.color === color);
      
      // Enhanced history tracking with timing information
      const timeSpentOnMove = calculateMoveTime(gameState);
      const moveHistoryEntry = {
        position: position,
        color: color,
        playerId: playerId,
        timestamp: Date.now(),
        timeSpentOnMove: timeSpentOnMove,
        timeSpentDisplay: formatMoveTimeDisplay(timeSpentOnMove),
        timeDisplay: movingPlayer ? formatTimeDisplay(movingPlayer) : 'Unknown',
        timeRemaining: movingPlayer ? movingPlayer.timeRemaining : 0,
        isInByoYomi: movingPlayer ? movingPlayer.isInByoYomi : false,
        byoYomiTimeLeft: movingPlayer ? movingPlayer.byoYomiTimeLeft : 0,
        byoYomiPeriodsLeft: movingPlayer ? movingPlayer.byoYomiPeriodsLeft : 0,
        capturedCount: capturedStones.capturedCount
      };
      
      gameState.history.push(moveHistoryEntry);
      
      // Set KO position if a single stone was captured
      // Clear existing KO position if we moved elsewhere
      if (capturedStones.koPosition) {
        gameState.koPosition = capturedStones.koPosition;
        log(`KO position updated to (${capturedStones.koPosition.x}, ${capturedStones.koPosition.y})`);
      } else if (gameState.koPosition) {
        log(`Clearing KO position as move was played elsewhere`);
        gameState.koPosition = undefined;
      }
      
      // Deduct time spent from player's remaining time
      if (movingPlayer && timeSpentOnMove > 0) {
        if (gameState.gameType === 'blitz') {
          // For blitz games, check if player exceeded time per move
          if (timeSpentOnMove > gameState.timePerMove) {
            log(`💀 BLITZ TIMEOUT - Player ${movingPlayer.color} spent ${timeSpentOnMove}s, exceeded time limit of ${gameState.timePerMove}s per move`);
            handlePlayerTimeout(gameState, movingPlayer);
            return; // Exit early, game is over
          } else {
            log(`⚡ BLITZ MOVE - Player ${movingPlayer.color} spent ${timeSpentOnMove}s (within ${gameState.timePerMove}s limit)`);
          }
          
          // Reset timer for next player to full timePerMove
          const nextPlayer = gameState.players.find(p => p.color === (movingPlayer.color === 'black' ? 'white' : 'black'));
          if (nextPlayer) {
            nextPlayer.timeRemaining = gameState.timePerMove;
            log(`⚡ BLITZ RESET - Next player ${nextPlayer.color} timer reset to ${gameState.timePerMove}s`);
            
            // Send immediate time update for the next player
            io.to(gameId).emit('timeUpdate', {
              gameId,
              playerId: nextPlayer.id,
              color: nextPlayer.color,
              timeRemaining: nextPlayer.timeRemaining,
              serverTimestamp: Date.now()
            });
          }
          
          // Reset timer for next move
          gameState.lastMoveTime = Date.now();
        } else {
          // Standard game time deduction logic (existing byo-yomi handling)
        let timerAlreadyReset = false; // Flag to track if we reset the timer during byo-yomi processing
        
        if (movingPlayer.isInByoYomi) {
          // Player is already in byo-yomi mode (3.1 and 3.2)
          if (timeSpentOnMove <= gameState.timeControl.byoYomiTime) {
            // 3.1: Move made within byo-yomi period - reset clock, keep same period count
            movingPlayer.byoYomiTimeLeft = gameState.timeControl.byoYomiTime;
            log(`🔄 BYO-YOMI RESET - Player ${movingPlayer.color} made move in ${timeSpentOnMove}s (within period), period reset to ${gameState.timeControl.byoYomiTime}s, periods remain: ${movingPlayer.byoYomiPeriodsLeft}`);
            
            // CRITICAL FIX: Emit byoYomiReset event IMMEDIATELY when reset happens
            io.to(gameId).emit('byoYomiReset', {
              gameId,
              color: movingPlayer.color,
              byoYomiTimeLeft: movingPlayer.byoYomiTimeLeft,
              byoYomiPeriodsLeft: movingPlayer.byoYomiPeriodsLeft
            });
            log(`📤 BYO-YOMI RESET EVENT SENT - Player ${movingPlayer.color}: ${movingPlayer.byoYomiTimeLeft}s, Periods=${movingPlayer.byoYomiPeriodsLeft}`);
            
            // CRITICAL: Reset the timer start time when byo-yomi resets
            gameState.lastMoveTime = Date.now();
            timerAlreadyReset = true;
          } else {
            // 3.2: Move exceeded byo-yomi period - calculate periods consumed
            const periodsConsumed = Math.floor(timeSpentOnMove / gameState.timeControl.byoYomiTime);
            const newPeriodsLeft = Math.max(0, movingPlayer.byoYomiPeriodsLeft - periodsConsumed);
            
            if (newPeriodsLeft > 0) {
              // Still have periods remaining
              movingPlayer.byoYomiPeriodsLeft = newPeriodsLeft;
              movingPlayer.byoYomiTimeLeft = gameState.timeControl.byoYomiTime;
              log(`⏳ BYO-YOMI PERIODS CONSUMED - Player ${movingPlayer.color} spent ${timeSpentOnMove}s, consumed ${periodsConsumed} periods, ${newPeriodsLeft} periods remaining`);
              
              // CRITICAL FIX: Also emit reset event when periods are consumed and reset
              io.to(gameId).emit('byoYomiReset', {
                gameId,
                color: movingPlayer.color,
                byoYomiTimeLeft: movingPlayer.byoYomiTimeLeft,
                byoYomiPeriodsLeft: movingPlayer.byoYomiPeriodsLeft
              });
              log(`📤 BYO-YOMI PERIODS CONSUMED EVENT SENT - Player ${movingPlayer.color}: ${movingPlayer.byoYomiTimeLeft}s, Periods=${movingPlayer.byoYomiPeriodsLeft}`);
              
              // CRITICAL: Reset the timer start time when periods are consumed and reset
              gameState.lastMoveTime = Date.now();
              timerAlreadyReset = true;
            } else {
              // No more periods - player times out
              log(`💀 TIMEOUT - Player ${movingPlayer.color} consumed all byo-yomi periods (spent ${timeSpentOnMove}s, consumed ${periodsConsumed} periods)`);
              handlePlayerTimeout(gameState, movingPlayer);
              return; // Exit early, game is over
            }
          }
        } else {
          // Player is in main time
          const newMainTime = Math.max(0, movingPlayer.timeRemaining - timeSpentOnMove);
          
          if (newMainTime > 0) {
            // Still in main time
            movingPlayer.timeRemaining = newMainTime;
            log(`⏰ TIME DEDUCTED - Player ${movingPlayer.color} spent ${timeSpentOnMove}s from main time, ${newMainTime}s remaining`);
          } else {
            // 2: First time entering byo-yomi - calculate periods consumed
            if (gameState.timeControl && gameState.timeControl.byoYomiPeriods > 0) {
              const timeOverage = timeSpentOnMove - movingPlayer.timeRemaining; // How much time exceeded main time
              const periodsConsumed = Math.floor(timeOverage / gameState.timeControl.byoYomiTime);
              const remainingPeriods = Math.max(0, gameState.timeControl.byoYomiPeriods - periodsConsumed);
              
              if (remainingPeriods > 0) {
                // Enter byo-yomi with calculated periods remaining
                movingPlayer.timeRemaining = 0;
                movingPlayer.isInByoYomi = true;
                movingPlayer.byoYomiPeriodsLeft = remainingPeriods;
                movingPlayer.byoYomiTimeLeft = gameState.timeControl.byoYomiTime;
                log(`🚨 ENTERING BYO-YOMI: Player ${movingPlayer.color} spent ${timeSpentOnMove}s (${timeOverage}s over main time), consumed ${periodsConsumed} periods, ${remainingPeriods} periods remaining`);
                
                // Emit byo-yomi reset event for entering byo-yomi
                io.to(gameId).emit('byoYomiReset', {
                  gameId,
                  color: movingPlayer.color,
                  byoYomiTimeLeft: movingPlayer.byoYomiTimeLeft,
                  byoYomiPeriodsLeft: movingPlayer.byoYomiPeriodsLeft
                });
                log(`📤 BYO-YOMI ENTERED EVENT SENT - Player ${movingPlayer.color}: ${movingPlayer.byoYomiTimeLeft}s, Periods=${movingPlayer.byoYomiPeriodsLeft}`);
                
                // CRITICAL: Reset the timer start time when entering byo-yomi
                gameState.lastMoveTime = Date.now();
                timerAlreadyReset = true;
              } else {
                // No periods left - player times out
                log(`💀 TIMEOUT - Player ${movingPlayer.color} exceeded main time and consumed all byo-yomi periods (spent ${timeSpentOnMove}s, overage ${timeOverage}s, consumed ${periodsConsumed} periods)`);
                handlePlayerTimeout(gameState, movingPlayer);
                return; // Exit early, game is over
              }
            } else {
              // No byo-yomi available - check if unlimited time before timing out
              const isUnlimitedTime = (gameState.timeControl?.timeControl || 0) === 0;
              if (!isUnlimitedTime) {
                log(`💀 TIMEOUT - Player ${movingPlayer.color} exceeded main time with no byo-yomi available (spent ${timeSpentOnMove}s, main time was ${movingPlayer.timeRemaining}s)`);
                handlePlayerTimeout(gameState, movingPlayer);
                return; // Exit early, game is over
              } else {
                log(`⏰ UNLIMITED TIME - Player ${movingPlayer.color} spending time but no timeout (unlimited time mode)`);
              }
            }
          }
        }
        
        // Reset timer for the next move (only if not already reset in byo-yomi logic above)
        if (!timerAlreadyReset) {
          gameState.lastMoveTime = Date.now();
          }
        }
      } else {
        // No time spent, just reset the timer for next move
        gameState.lastMoveTime = Date.now();
      }
      
      // Send time update after deducting time spent
      if (movingPlayer) {
        // For blitz games, reset timer for the player who just made a move
        if (gameState.gameType === 'blitz' && gameState.timePerMove) {
          movingPlayer.timeRemaining = gameState.timePerMove;
          log(`Reset blitz timer for player ${movingPlayer.id} (${color}) to ${gameState.timePerMove} seconds`);
        }
        
        // Send time update to all clients for this player
        io.to(gameId).emit('timeUpdate', {
          gameId,
          playerId: movingPlayer.id,
          color: movingPlayer.color,
          timeRemaining: movingPlayer.timeRemaining,
          byoYomiPeriodsLeft: movingPlayer.byoYomiPeriodsLeft,
          byoYomiTimeLeft: movingPlayer.byoYomiTimeLeft,
          isInByoYomi: movingPlayer.isInByoYomi
        });
        
        log(`📤 TIME UPDATE SENT - Player ${movingPlayer.color}: Main=${movingPlayer.timeRemaining}s, InByoYomi=${movingPlayer.isInByoYomi}, ByoYomiLeft=${movingPlayer.byoYomiTimeLeft}s, Periods=${movingPlayer.byoYomiPeriodsLeft}`);
      }
      
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
      
      // Check if AI should make a move after human move
      if (aiGameManager.isAIGame(gameState)) {
        aiGameManager.handleHumanMove(gameState, {
          color: color,
          position: position,
          playerId: playerId
        }).then(() => {
          // Make AI move if it's AI's turn
          if (aiGameManager.shouldAIMakeMove(gameState)) {
            setTimeout(() => {
              makeAIMove(gameId);
            }, 500); // Small delay for better UX
          }
        }).catch(error => {
          log(`❌ Error handling human move in AI game: ${error.message}`);
        });
      }
    }
  });

  // Timer tick event to update remaining time with improved synchronization
  socket.on('timerTick', ({ gameId }) => {
    const gameState = activeGames.get(gameId);
    
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
        
        if (currentPlayer.isInByoYomi && gameState.timeControl.byoYomiPeriods > 0) {
          currentByoYomiTime = Math.max(0, currentPlayer.byoYomiTimeLeft - elapsedTime);
          
          // Debug log for byo-yomi countdown
          if (elapsedTime > 0) {
            log(`⏱️  BYO-YOMI COUNTDOWN - Player ${currentPlayer.color}: ${currentPlayer.byoYomiTimeLeft}s - ${elapsedTime}s elapsed = ${currentByoYomiTime}s remaining`);
          }
          
          if (currentByoYomiTime <= 0 && currentByoYomiPeriods > 1) {
            const periodsToUse = Math.floor(Math.abs(currentByoYomiTime) / gameState.timeControl.byoYomiTime) + 1;
            currentByoYomiPeriods = Math.max(0, currentByoYomiPeriods - periodsToUse);
            currentByoYomiTime = gameState.timeControl.byoYomiTime;
            
            // CRITICAL: Auto-consume period when byo-yomi period expires
            if (currentByoYomiPeriods !== currentPlayer.byoYomiPeriodsLeft) {
              log(`🔥 AUTO-CONSUMING BYO-YOMI PERIOD: Player ${currentPlayer.color} period expired, consumed ${periodsToUse} periods, ${currentByoYomiPeriods} periods remaining`);
              
              // Update the stored player state
              currentPlayer.byoYomiPeriodsLeft = currentByoYomiPeriods;
              currentPlayer.byoYomiTimeLeft = gameState.timeControl.byoYomiTime;
              
              // Reset the timer reference to current time for accurate countdown
              gameState.lastMoveTime = now;
              
              // Emit byo-yomi reset event for period consumption
              io.to(gameId).emit('byoYomiReset', {
                gameId,
                color: currentPlayer.color,
                byoYomiTimeLeft: currentPlayer.byoYomiTimeLeft,
                byoYomiPeriodsLeft: currentPlayer.byoYomiPeriodsLeft
              });
              log(`📤 AUTO PERIOD CONSUMED EVENT SENT - Player ${currentPlayer.color}: ${currentPlayer.byoYomiTimeLeft}s, Periods=${currentPlayer.byoYomiPeriodsLeft}`);
              
              // Update calculated values to match stored state
              currentByoYomiTime = currentPlayer.byoYomiTimeLeft;
              currentByoYomiPeriods = currentPlayer.byoYomiPeriodsLeft;
            }
          } else if (currentByoYomiTime <= 0 && currentByoYomiPeriods <= 1) {
            currentByoYomiTime = 0;
            currentByoYomiPeriods = 0;
          }
        } else {
          currentTimeRemaining = Math.max(0, currentPlayer.timeRemaining - elapsedTime);
          
          // Debug log for main time countdown
          if (elapsedTime > 0 && !currentPlayer.isInByoYomi) {
            log(`⏰ MAIN TIME COUNTDOWN - Player ${currentPlayer.color}: ${currentPlayer.timeRemaining}s - ${elapsedTime}s elapsed = ${currentTimeRemaining}s remaining`);
          }
          
          // Check if should enter byo-yomi when main time expires
          if (currentTimeRemaining <= 0 && gameState.timeControl && gameState.timeControl.byoYomiPeriods > 0) {
            // Auto-enter byo-yomi mode
            const timeOverage = elapsedTime - currentPlayer.timeRemaining;
            const periodsConsumed = Math.floor(timeOverage / gameState.timeControl.byoYomiTime);
            const remainingPeriods = Math.max(0, gameState.timeControl.byoYomiPeriods - periodsConsumed);
            
            if (remainingPeriods > 0) {
              log(`🚨 TIMER-TICK AUTO-ENTERING BYO-YOMI: Player ${currentPlayer.color} main time expired, ${timeOverage}s overage, ${remainingPeriods} periods remaining`);
              
              // Update stored state to byo-yomi
              currentPlayer.timeRemaining = 0;
              currentPlayer.isInByoYomi = true;
              currentPlayer.byoYomiPeriodsLeft = remainingPeriods;
              currentPlayer.byoYomiTimeLeft = gameState.timeControl.byoYomiTime;
              gameState.lastMoveTime = now; // Reset timer reference
              
              // Update calculated values
              currentTimeRemaining = 0;
              currentIsInByoYomi = true;
              currentByoYomiPeriods = remainingPeriods;
              currentByoYomiTime = gameState.timeControl.byoYomiTime;
              
              // Emit byo-yomi reset event
              io.to(gameId).emit('byoYomiReset', {
                gameId,
                color: currentPlayer.color,
                byoYomiTimeLeft: currentPlayer.byoYomiTimeLeft,
                byoYomiPeriodsLeft: currentPlayer.byoYomiPeriodsLeft
              });
            } else {
              currentTimeRemaining = 0;
            }
          }
          
          // Check for timeout conditions based on game type
          if (gameState.gameType === 'blitz') {
            // Blitz game timeout: check if player exceeded time per move
            if (currentTimeRemaining <= 0) {
              log(`💀 BLITZ TIMEOUT DETECTED - Player ${currentPlayer.color} ran out of time (${gameState.timePerMove}s per move)`);
              handlePlayerTimeout(gameState, currentPlayer);
              return;
            }
            } else {
            // Standard game timeout: check byo-yomi and main time
            // Only timeout if main time was originally > 0 (not unlimited time)
            const isUnlimitedTime = (gameState.timeControl?.timeControl || 0) === 0;
            
            if (currentIsInByoYomi && currentByoYomiPeriods <= 0 && currentByoYomiTime <= 0) {
              log(`💀 STANDARD TIMEOUT DETECTED - Player ${currentPlayer.color} ran out of byo-yomi time`);
              handlePlayerTimeout(gameState, currentPlayer);
              return;
            } else if (!currentIsInByoYomi && currentTimeRemaining <= 0 && (gameState.timeControl?.byoYomiPeriods || 0) === 0 && !isUnlimitedTime) {
              log(`💀 STANDARD TIMEOUT DETECTED - Player ${currentPlayer.color} ran out of main time with no byo-yomi`);
              handlePlayerTimeout(gameState, currentPlayer);
              return;
            }
          }
        }
        
        // Send real-time time updates with server timestamp for all players
        gameState.players.forEach(player => {
          const isCurrentTurn = player.color === gameState.currentTurn;
          
          io.to(gameId).emit('timeUpdate', {
            gameId,
            playerId: player.id,
            color: player.color,
            timeRemaining: isCurrentTurn ? currentTimeRemaining : player.timeRemaining,
            byoYomiPeriodsLeft: isCurrentTurn ? currentByoYomiPeriods : player.byoYomiPeriodsLeft,
            byoYomiTimeLeft: isCurrentTurn ? currentByoYomiTime : player.byoYomiTimeLeft,
            isInByoYomi: isCurrentTurn ? currentIsInByoYomi : player.isInByoYomi,
            serverTimestamp: serverTimestamp,
            lastMoveTime: gameState.lastMoveTime
          });
        });
        
        // Reduced sync interval for better responsiveness
        const lastSync = gameState.lastFullStateSync || 0;
        if (now - lastSync >= 2000) { // Sync every 2 seconds instead of 5
          gameState.lastFullStateSync = now;
          broadcastGameUpdate(gameId, gameState);
        }
      } else {
        // No active timing, just send current state with timestamp
        gameState.players.forEach(player => {
          io.to(gameId).emit('timeUpdate', {
            gameId,
            playerId: player.id,
            color: player.color,
            timeRemaining: player.timeRemaining,
            byoYomiPeriodsLeft: player.byoYomiPeriodsLeft,
            byoYomiTimeLeft: player.byoYomiTimeLeft,
            isInByoYomi: player.isInByoYomi,
            serverTimestamp: serverTimestamp,
            lastMoveTime: gameState.lastMoveTime
          });
        });
      }
    }
  });

  // Add server-driven timer updates for active games
  setInterval(() => {
    // Send timer updates for all active games every 500ms
    activeGames.forEach((gameState, gameId) => {
      if (gameState.status === 'playing' && (gameState.timeControl || gameState.gameType === 'blitz')) {
        const currentPlayer = gameState.players.find(p => p.color === gameState.currentTurn);
        
        if (currentPlayer && gameState.lastMoveTime) {
          const now = Date.now();
          const elapsedMs = now - gameState.lastMoveTime;
          const elapsedSeconds = Math.floor(elapsedMs / 1000);
          
          if (gameState.gameType === 'blitz') {
            // For blitz games, decrease timeRemaining each second
            if (elapsedSeconds > 0) {
              const newTimeRemaining = Math.max(0, gameState.timePerMove - elapsedSeconds);
              currentPlayer.timeRemaining = newTimeRemaining;
                
              // Send time update to all players
              io.to(gameId).emit('timeUpdate', {
                  gameId,
                playerId: currentPlayer.id,
                  color: currentPlayer.color,
                timeRemaining: newTimeRemaining,
                serverTimestamp: now,
                lastMoveTime: gameState.lastMoveTime
              });
              
              // Check for blitz timeout
              if (newTimeRemaining <= 0) {
                log(`💀 SERVER BLITZ TIMEOUT DETECTED - Player ${currentPlayer.color} ran out of time (${gameState.timePerMove}s per move)`);
                handlePlayerTimeout(gameState, currentPlayer);
              }
            }
          } else {
            // Handle standard games with proper countdown calculation
            let calculatedTimeRemaining = currentPlayer.timeRemaining || 0;
            let calculatedIsInByoYomi = currentPlayer.isInByoYomi || false;
            let calculatedByoYomiPeriods = currentPlayer.byoYomiPeriodsLeft || 0;
            let calculatedByoYomiTime = currentPlayer.byoYomiTimeLeft || 0;
            
            // Calculate real-time countdown based on elapsed time
            if (calculatedIsInByoYomi && gameState.timeControl && gameState.timeControl.byoYomiPeriods > 0) {
              // Player is in byo-yomi mode - calculate remaining time in current period
              calculatedByoYomiTime = Math.max(0, (currentPlayer.byoYomiTimeLeft || 0) - elapsedSeconds);
              
              // If current period expired, auto-consume periods
              if (calculatedByoYomiTime <= 0 && calculatedByoYomiPeriods > 1) {
                const periodsToUse = Math.floor(Math.abs(calculatedByoYomiTime) / gameState.timeControl.byoYomiTime) + 1;
                calculatedByoYomiPeriods = Math.max(0, calculatedByoYomiPeriods - periodsToUse);
                
                if (calculatedByoYomiPeriods > 0) {
                  calculatedByoYomiTime = gameState.timeControl.byoYomiTime;
                  
                  // Update the stored player state when auto-consuming periods
                  if (calculatedByoYomiPeriods !== currentPlayer.byoYomiPeriodsLeft) {
                    log(`🔥 SERVER AUTO-CONSUMING BYO-YOMI PERIOD: Player ${currentPlayer.color} period expired, consumed ${periodsToUse} periods, ${calculatedByoYomiPeriods} periods remaining`);
                    
                    // Update stored state
                    currentPlayer.byoYomiPeriodsLeft = calculatedByoYomiPeriods;
                    currentPlayer.byoYomiTimeLeft = gameState.timeControl.byoYomiTime;
                    gameState.lastMoveTime = now; // Reset timer reference
                    
                    // Emit byo-yomi reset event
                    io.to(gameId).emit('byoYomiReset', {
                      gameId,
                      color: currentPlayer.color,
                      byoYomiTimeLeft: currentPlayer.byoYomiTimeLeft,
                      byoYomiPeriodsLeft: currentPlayer.byoYomiPeriodsLeft
                    });
                  }
                } else {
                  calculatedByoYomiTime = 0;
                  calculatedByoYomiPeriods = 0;
                }
              } else if (calculatedByoYomiTime <= 0 && calculatedByoYomiPeriods <= 1) {
                calculatedByoYomiTime = 0;
                calculatedByoYomiPeriods = 0;
              }
            } else if (!calculatedIsInByoYomi) {
              // Player is in main time - calculate remaining main time
              calculatedTimeRemaining = Math.max(0, (currentPlayer.timeRemaining || 0) - elapsedSeconds);
              
              // Check if should enter byo-yomi
              if (calculatedTimeRemaining <= 0 && gameState.timeControl && gameState.timeControl.byoYomiPeriods > 0) {
                // Auto-enter byo-yomi mode
                const timeOverage = elapsedSeconds - (currentPlayer.timeRemaining || 0);
                const periodsConsumed = Math.floor(timeOverage / gameState.timeControl.byoYomiTime);
                const remainingPeriods = Math.max(0, gameState.timeControl.byoYomiPeriods - periodsConsumed);
                
                if (remainingPeriods > 0) {
                  log(`🚨 SERVER AUTO-ENTERING BYO-YOMI: Player ${currentPlayer.color} main time expired, ${timeOverage}s overage, ${remainingPeriods} periods remaining`);
                  
                  // Update stored state to byo-yomi
                  currentPlayer.timeRemaining = 0;
                  currentPlayer.isInByoYomi = true;
                  currentPlayer.byoYomiPeriodsLeft = remainingPeriods;
                  currentPlayer.byoYomiTimeLeft = gameState.timeControl.byoYomiTime;
                  gameState.lastMoveTime = now; // Reset timer reference
                  
                  // Update calculated values
                  calculatedTimeRemaining = 0;
                  calculatedIsInByoYomi = true;
                  calculatedByoYomiPeriods = remainingPeriods;
                  calculatedByoYomiTime = gameState.timeControl.byoYomiTime;
                  
                  // Emit byo-yomi reset event
                  io.to(gameId).emit('byoYomiReset', {
                    gameId,
                    color: currentPlayer.color,
                    byoYomiTimeLeft: currentPlayer.byoYomiTimeLeft,
                    byoYomiPeriodsLeft: currentPlayer.byoYomiPeriodsLeft
                  });
                } else {
                  calculatedTimeRemaining = 0;
                }
              }
            }
            
            // Send real-time calculated time updates
            io.to(gameId).emit('timeUpdate', {
              gameId,
              playerId: currentPlayer.id,
              color: currentPlayer.color,
              timeRemaining: calculatedTimeRemaining,
              byoYomiPeriodsLeft: calculatedByoYomiPeriods,
              byoYomiTimeLeft: calculatedByoYomiTime,
              isInByoYomi: calculatedIsInByoYomi,
              serverTimestamp: now,
              lastMoveTime: gameState.lastMoveTime
            });
            
            // Check for standard timeout
            // Only timeout if main time was originally > 0 (not unlimited time)
            const isUnlimitedTime = (gameState.timeControl?.timeControl || 0) === 0;
            
            if (calculatedIsInByoYomi && calculatedByoYomiPeriods <= 0 && calculatedByoYomiTime <= 0) {
              log(`💀 SERVER STANDARD TIMEOUT DETECTED - Player ${currentPlayer.color} ran out of byo-yomi time`);
              handlePlayerTimeout(gameState, currentPlayer);
            } else if (!calculatedIsInByoYomi && calculatedTimeRemaining <= 0 && (gameState.timeControl?.byoYomiPeriods || 0) === 0 && !isUnlimitedTime) {
              log(`💀 SERVER STANDARD TIMEOUT DETECTED - Player ${currentPlayer.color} ran out of main time with no byo-yomi`);
              handlePlayerTimeout(gameState, currentPlayer);
            }
          }
        }
      }
    });
  }, 1000); // Update every second for better precision

  // Handle a pass
  socket.on('passTurn', ({ gameId, color, playerId, endGame }) => {
    const gameState = activeGames.get(gameId);
    if (gameState) {
      // Enhanced pass tracking with detailed timing information
      const passingPlayer = gameState.players.find(p => p.color === color);
      if (passingPlayer) {
        // Calculate actual time spent on this pass
        const timeSpentOnPass = calculateMoveTime(gameState);
        const passTimeDisplay = formatMoveTimeDisplay(timeSpentOnPass);
        const currentTimeDisplay = formatTimeDisplay(passingPlayer);
        
        log(`🎯 PASS TRACKED - Player ${playerId} passed their turn in game ${gameId} - Time spent: ${passTimeDisplay} (${passingPlayer.isInByoYomi ? 'Byo-yomi' : 'Main'})`);
      } else {
        log(`Player ${playerId} passed their turn in game ${gameId}`);
      }
    } else {
      log(`Player ${playerId} passed their turn in game ${gameId}`);
    }
    
    // Update the game state if it exists in memory
    if (gameState) {
      // Update turn
      gameState.currentTurn = color === 'black' ? 'white' : 'black';
      
      // Enhanced pass history tracking with timing information
      const playerForHistory = gameState.players.find(p => p.color === color);
      const timeSpentOnPass = calculateMoveTime(gameState);
      const passHistoryEntry = {
        pass: true,
        color: color,
        playerId: playerId,
        timestamp: Date.now(),
        timeSpentOnMove: timeSpentOnPass,
        timeSpentDisplay: formatMoveTimeDisplay(timeSpentOnPass),
        timeDisplay: playerForHistory ? formatTimeDisplay(playerForHistory) : 'Unknown',
        timeRemaining: playerForHistory ? playerForHistory.timeRemaining : 0,
        isInByoYomi: playerForHistory ? playerForHistory.isInByoYomi : false,
        byoYomiTimeLeft: playerForHistory ? playerForHistory.byoYomiTimeLeft : 0,
        byoYomiPeriodsLeft: playerForHistory ? playerForHistory.byoYomiPeriodsLeft : 0
      };
      
      gameState.history.push(passHistoryEntry);
      
      // Deduct time spent from player's remaining time for pass
      const passingPlayerForTime = gameState.players.find(p => p.color === color);
      if (passingPlayerForTime && timeSpentOnPass > 0) {
        let timerAlreadyReset = false; // Flag to track if we reset the timer during byo-yomi processing
        
        if (passingPlayerForTime.isInByoYomi) {
          // Player is already in byo-yomi mode (3.1 and 3.2)
          if (timeSpentOnPass <= gameState.timeControl.byoYomiTime) {
            // 3.1: Pass made within byo-yomi period - reset clock, keep same period count
            passingPlayerForTime.byoYomiTimeLeft = gameState.timeControl.byoYomiTime;
            log(`🔄 BYO-YOMI RESET (PASS) - Player ${passingPlayerForTime.color} passed in ${timeSpentOnPass}s (within period), period reset to ${gameState.timeControl.byoYomiTime}s, periods remain: ${passingPlayerForTime.byoYomiPeriodsLeft}`);
            
            // CRITICAL FIX: Emit byoYomiReset event IMMEDIATELY when reset happens on pass
            io.to(gameId).emit('byoYomiReset', {
              gameId,
              color: passingPlayerForTime.color,
              byoYomiTimeLeft: passingPlayerForTime.byoYomiTimeLeft,
              byoYomiPeriodsLeft: passingPlayerForTime.byoYomiPeriodsLeft
            });
            log(`📤 BYO-YOMI RESET EVENT SENT (PASS) - Player ${passingPlayerForTime.color}: ${passingPlayerForTime.byoYomiTimeLeft}s, Periods=${passingPlayerForTime.byoYomiPeriodsLeft}`);
            
            // CRITICAL: Reset the timer start time when byo-yomi resets on pass
            gameState.lastMoveTime = Date.now();
            timerAlreadyReset = true;
          } else {
            // 3.2: Pass exceeded byo-yomi period - calculate periods consumed
            const periodsConsumed = Math.floor(timeSpentOnPass / gameState.timeControl.byoYomiTime);
            const newPeriodsLeft = Math.max(0, passingPlayerForTime.byoYomiPeriodsLeft - periodsConsumed);
            
            if (newPeriodsLeft > 0) {
              // Still have periods remaining
              passingPlayerForTime.byoYomiPeriodsLeft = newPeriodsLeft;
              passingPlayerForTime.byoYomiTimeLeft = gameState.timeControl.byoYomiTime;
              log(`⏳ BYO-YOMI PERIODS CONSUMED (PASS) - Player ${passingPlayerForTime.color} spent ${timeSpentOnPass}s, consumed ${periodsConsumed} periods, ${newPeriodsLeft} periods remaining`);
              
              // CRITICAL FIX: Also emit reset event when periods are consumed and reset on pass
              io.to(gameId).emit('byoYomiReset', {
                gameId,
                color: passingPlayerForTime.color,
                byoYomiTimeLeft: passingPlayerForTime.byoYomiTimeLeft,
                byoYomiPeriodsLeft: passingPlayerForTime.byoYomiPeriodsLeft
              });
              log(`📤 BYO-YOMI PERIODS CONSUMED EVENT SENT (PASS) - Player ${passingPlayerForTime.color}: ${passingPlayerForTime.byoYomiTimeLeft}s, Periods=${passingPlayerForTime.byoYomiPeriodsLeft}`);
              
              // CRITICAL: Reset the timer start time when periods are consumed and reset on pass
              gameState.lastMoveTime = Date.now();
              timerAlreadyReset = true;
            } else {
              // No more periods - player times out
              log(`💀 TIMEOUT (PASS) - Player ${passingPlayerForTime.color} consumed all byo-yomi periods (spent ${timeSpentOnPass}s, consumed ${periodsConsumed} periods)`);
              handlePlayerTimeout(gameState, passingPlayerForTime);
              return; // Exit early, game is over
            }
          }
        } else {
          // Player is in main time
          const newMainTime = Math.max(0, passingPlayerForTime.timeRemaining - timeSpentOnPass);
          
          if (newMainTime > 0) {
            // Still in main time
            passingPlayerForTime.timeRemaining = newMainTime;
            log(`⏰ TIME DEDUCTED (PASS) - Player ${passingPlayerForTime.color} spent ${timeSpentOnPass}s from main time, ${newMainTime}s remaining`);
          } else {
            // 2: First time entering byo-yomi - calculate periods consumed
            if (gameState.timeControl && gameState.timeControl.byoYomiPeriods > 0) {
              const timeOverage = timeSpentOnPass - passingPlayerForTime.timeRemaining; // How much time exceeded main time
              const periodsConsumed = Math.floor(timeOverage / gameState.timeControl.byoYomiTime);
              const remainingPeriods = Math.max(0, gameState.timeControl.byoYomiPeriods - periodsConsumed);
              
              if (remainingPeriods > 0) {
                // Enter byo-yomi with calculated periods remaining
                passingPlayerForTime.timeRemaining = 0;
                passingPlayerForTime.isInByoYomi = true;
                passingPlayerForTime.byoYomiPeriodsLeft = remainingPeriods;
                passingPlayerForTime.byoYomiTimeLeft = gameState.timeControl.byoYomiTime;
                log(`🚨 ENTERING BYO-YOMI (PASS): Player ${passingPlayerForTime.color} spent ${timeSpentOnPass}s (${timeOverage}s over main time), consumed ${periodsConsumed} periods, ${remainingPeriods} periods remaining`);
                
                // Emit byo-yomi reset event for entering byo-yomi
                io.to(gameId).emit('byoYomiReset', {
                  gameId,
                  color: passingPlayerForTime.color,
                  byoYomiTimeLeft: passingPlayerForTime.byoYomiTimeLeft,
                  byoYomiPeriodsLeft: passingPlayerForTime.byoYomiPeriodsLeft
                });
                log(`📤 BYO-YOMI ENTERED EVENT SENT (PASS) - Player ${passingPlayerForTime.color}: ${passingPlayerForTime.byoYomiTimeLeft}s, Periods=${passingPlayerForTime.byoYomiPeriodsLeft}`);
                
                // CRITICAL: Reset the timer start time when entering byo-yomi on pass
                gameState.lastMoveTime = Date.now();
                timerAlreadyReset = true;
              } else {
                // No periods left - player times out
                log(`💀 TIMEOUT (PASS) - Player ${passingPlayerForTime.color} exceeded main time and consumed all byo-yomi periods (spent ${timeSpentOnPass}s, overage ${timeOverage}s, consumed ${periodsConsumed} periods)`);
                handlePlayerTimeout(gameState, passingPlayerForTime);
                return; // Exit early, game is over
              }
            } else {
              // No byo-yomi available - check if unlimited time before timing out
              const isUnlimitedTime = (gameState.timeControl?.timeControl || 0) === 0;
              if (!isUnlimitedTime) {
                log(`💀 TIMEOUT (PASS) - Player ${passingPlayerForTime.color} exceeded main time with no byo-yomi available (spent ${timeSpentOnPass}s, main time was ${passingPlayerForTime.timeRemaining}s)`);
                handlePlayerTimeout(gameState, passingPlayerForTime);
                return; // Exit early, game is over
              } else {
                log(`⏰ UNLIMITED TIME (PASS) - Player ${passingPlayerForTime.color} spending time but no timeout (unlimited time mode)`);
              }
            }
          }
        }
        
        // Reset timer for the next move (only if not already reset in byo-yomi logic above)
        if (!timerAlreadyReset) {
          gameState.lastMoveTime = Date.now();
        }
      } else {
        // No time spent, just reset the timer for next move
        gameState.lastMoveTime = Date.now();
      }
      
      // Send time update after deducting time spent on pass
      const passingPlayer = gameState.players.find(p => p.color === color);
      if (passingPlayer) {
        // For blitz games, reset timer for the player who just passed
        if (gameState.gameType === 'blitz' && gameState.timePerMove) {
          passingPlayer.timeRemaining = gameState.timePerMove;
          log(`Reset blitz timer for player ${passingPlayer.id} (${color}) to ${gameState.timePerMove} seconds`);
          
          // Also reset the next player's timer
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
        
        // Send time update to all clients for the passing player
        io.to(gameId).emit('timeUpdate', {
          gameId,
          playerId: passingPlayer.id,
          color: passingPlayer.color,
          timeRemaining: passingPlayer.timeRemaining,
          byoYomiPeriodsLeft: passingPlayer.byoYomiPeriodsLeft,
          byoYomiTimeLeft: passingPlayer.byoYomiTimeLeft,
          isInByoYomi: passingPlayer.isInByoYomi
        });
        
        log(`📤 TIME UPDATE SENT (PASS) - Player ${passingPlayer.color}: Main=${passingPlayer.timeRemaining}s, InByoYomi=${passingPlayer.isInByoYomi}, ByoYomiLeft=${passingPlayer.byoYomiTimeLeft}s, Periods=${passingPlayer.byoYomiPeriodsLeft}`);
      }
      
      // Check if this is the second consecutive pass (game end)
      const historyLength = gameState.history.length;
      if (historyLength >= 2) {
        const lastMove = gameState.history[historyLength - 1];
        const secondLastMove = gameState.history[historyLength - 2];
        
        if (lastMove.pass && secondLastMove.pass) {
          // Transition to scoring phase instead of finishing immediately
          gameState.status = 'scoring';
          gameState.deadStones = []; // Initialize empty dead stones array
          gameState.scoreConfirmation = { black: false, white: false }; // Initialize score confirmations
          
          log(`Game ${gameId} has transitioned to scoring phase after two consecutive passes.`);
        }
      }
      
      // If client explicitly signals this is an end game move, ensure scoring state
      if (endGame) {
        gameState.status = 'scoring';
        gameState.deadStones = gameState.deadStones || []; // Ensure deadStones array exists
        gameState.scoreConfirmation = gameState.scoreConfirmation || { black: false, white: false }; // Ensure score confirmation exists
        log(`Client signaled end game, ensuring scoring state for game ${gameId}`);
      }
      
      // Store updated game state
      activeGames.set(gameId, gameState);
      
      // Use the new broadcast function for move updates
      broadcastGameUpdate(gameId, gameState);
      
      // Also broadcast the full game state
      io.to(gameId).emit('gameState', gameState);
      log(`Broadcasting updated game state to all clients in room ${gameId}`);
      
      if (gameState.status === 'scoring') {
        log(`Broadcasting scoring phase start to all clients in room ${gameId}`);
        io.to(gameId).emit('scoringPhaseStarted', { gameId });
      }
    }
  });

  // Handle player/spectator leaving
  socket.on('leaveGame', ({ gameId, playerId }) => {
    log(`Player/Spectator ${playerId} leaving game ${gameId}`);
    
    // Get the game state to find player/spectator username
    const gameState = activeGames.get(gameId);
    let username = 'A player'; // Default fallback
    let isSpectator = false;
    
    if (gameState) {
      // Check if it's a player leaving
      const leavingPlayer = gameState.players.find(p => p.id === playerId);
      if (leavingPlayer && leavingPlayer.username) {
        username = leavingPlayer.username;
      } else {
        // Check if it's a spectator leaving
        const leavingSpectator = gameState.spectators?.find(s => s.id === playerId);
        if (leavingSpectator && leavingSpectator.username) {
          username = leavingSpectator.username;
          isSpectator = true;
          
          // Remove spectator from the list
          gameState.spectators = gameState.spectators.filter(s => s.id !== playerId);
          activeGames.set(gameId, gameState);
          
          log(`Spectator ${username} removed from game ${gameId}`);
        }
      }
    }
    
    // Leave the socket room
    socket.leave(gameId);
    socketToGame.delete(socket.id);
    
    // Notify other players/spectators with username included
    if (isSpectator) {
      // Spectators leave silently - no notifications
      // But we still need to broadcast the updated game state so spectator count updates
      broadcastGameUpdate(gameId, gameState);
    } else {
    socket.to(gameId).emit('playerLeft', {
      gameId,
      playerId,
      username
    });
    }
    
    // Check if there are any players left in the game room
    const room = io.sockets.adapter.rooms.get(gameId);
    const clientsCount = room ? room.size : 0;
    
    log(`Game ${gameId} has ${clientsCount} clients remaining after ${isSpectator ? 'spectator' : 'player'} left`);
    
    // If no players left in the room, remove the game immediately
    if (!room || clientsCount === 0) {
      log(`No players remaining in game ${gameId}, removing it immediately`);
      cleanupAIGame(gameId);
      activeGames.delete(gameId);
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    log(`Client disconnected: ${socket.id}`);
    
    // Check if this socket was in a game
    const gameId = socketToGame.get(socket.id);
    if (gameId) {
      socket.to(gameId).emit('playerDisconnected', {
        gameId,
        socketId: socket.id
      });
      
      // Clean up
      socketToGame.delete(socket.id);
      
      // If no more clients in the game, remove it after a timeout
      setTimeout(() => {
        const room = io.sockets.adapter.rooms.get(gameId);
        if (!room || room.size === 0) {
          log(`Removing inactive game ${gameId}`);
            cleanupAIGame(gameId);
          activeGames.delete(gameId);
        }
      }, 5 * 60 * 1000); // 5 minutes timeout
    }
  });

  // Handle game state sync request
  socket.on('requestSync', ({ gameId, playerId }) => {
    log(`Player ${playerId} requested sync for game ${gameId}`);
    
    const gameState = activeGames.get(gameId);
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

  // Handle score confirmation from players
  socket.on('confirmScore', ({ gameId, playerId, playerColor, confirmed }) => {
    log(`Player ${playerId} (${playerColor}) ${confirmed ? 'confirmed' : 'unconfirmed'} score for game ${gameId}`);
    
    const gameState = activeGames.get(gameId);
    if (gameState) {
      // Only allow confirmation in scoring mode
      if (gameState.status !== 'scoring') {
        log(`Cannot confirm score: game ${gameId} not in scoring mode`);
        socket.emit('error', 'Cannot confirm score: game not in scoring mode');
        return;
      }
      
      // Initialize score confirmation if it doesn't exist
      if (!gameState.scoreConfirmation) {
        gameState.scoreConfirmation = { black: false, white: false };
      }
      
      // Update the confirmation for this player
      gameState.scoreConfirmation[playerColor] = confirmed;
      
      // Check if this is an AI game and handle AI auto-acceptance
      const isAIGame = gameState.players.some(player => player.isAI);
      const confirmingPlayer = gameState.players.find(player => player.id === playerId);
      const isHumanConfirming = confirmingPlayer && !confirmingPlayer.isAI;
      
      if (isAIGame && isHumanConfirming && confirmed) {
        log(`🤖 AI game detected - human player confirmed score, AI will auto-accept`);
        
        // Find the AI player and auto-confirm for them
        const aiPlayer = gameState.players.find(player => player.isAI);
        if (aiPlayer) {
          const aiPlayerColor = aiPlayer.color;
          gameState.scoreConfirmation[aiPlayerColor] = true;
          log(`🤖 AI player (${aiPlayerColor}) automatically confirmed score`);
        }
      }
      
      log(`Score confirmations for game ${gameId}: Black: ${gameState.scoreConfirmation.black}, White: ${gameState.scoreConfirmation.white}`);
      
      // Store updated game state
      activeGames.set(gameId, gameState);
      
      // Broadcast the confirmation update to all clients
      io.to(gameId).emit('scoreConfirmationUpdate', {
        gameId,
        playerId,
        playerColor,
        confirmed,
        scoreConfirmation: gameState.scoreConfirmation
      });
      
      // Also broadcast the full game state
      io.to(gameId).emit('gameState', gameState);
      log(`Broadcasting score confirmation update to all clients in room ${gameId}`);
    }
  });

  // Handle game end after scoring
  socket.on('gameEnded', ({ gameId, score, winner, territory }) => {
    log(`Game ${gameId} has ended. Winner: ${winner}`);
    
    // Update the game state if it exists in memory
    const gameState = activeGames.get(gameId);
    if (gameState) {
      // Update game status to finished
      gameState.status = 'finished';
      gameState.score = score;
      gameState.winner = winner;
      gameState.territory = territory;
      
      // Store updated game state
      activeGames.set(gameId, gameState);
      
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
  socket.on('cancelScoring', ({ gameId }) => {
    log(`Canceling scoring phase for game ${gameId}`);
    
    // Update the game state if it exists in memory
    const gameState = activeGames.get(gameId);
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
      gameState.scoreConfirmation = undefined; // Clear score confirmations
      
      // Store updated game state
      activeGames.set(gameId, gameState);
      
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
  socket.on('resignGame', ({ gameId, playerId, color }) => {
    log(`Player ${playerId} (${color}) resigned from game ${gameId}`);
    
    // Update the game state if it exists in memory
    const gameState = activeGames.get(gameId);
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
      activeGames.set(gameId, gameState);
      
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
  socket.on('chatMessage', ({ gameId, playerId, username, message }) => {
    log(`Chat message from ${username} (${playerId}) in game ${gameId}: ${message}`);
    
    // Get the current game state
    const gameState = activeGames.get(gameId);
    
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
  socket.on('requestUndo', ({ gameId, playerId, moveIndex }) => {
    log(`Player ${playerId} requested undo to move ${moveIndex} in game ${gameId}`);
    
    const gameState = activeGames.get(gameId);
    if (gameState) {
      log(`Current game has ${gameState.history.length} moves, requesting to keep ${moveIndex} moves (removing ${gameState.history.length - moveIndex} moves)`);
      
      // Check if this is an AI game - if so, auto-accept the undo
      const isAIGame = gameState.players.some(player => player.isAI);
      const requestingPlayer = gameState.players.find(player => player.id === playerId);
      const isHumanRequestingUndo = requestingPlayer && !requestingPlayer.isAI;
      
      if (isAIGame && isHumanRequestingUndo) {
        log(`🤖 AI game detected - auto-accepting undo request from human player`);
        
        // Auto-process the undo immediately for AI games
        processUndo(gameState, moveIndex, gameId);
        
        // Sync AI engine state after undo
        if (aiGameManager && aiGameManager.isAIGame(gameState)) {
          setTimeout(async () => {
            try {
              await aiGameManager.syncGameState(gameState);
              log(`🔄 AI engine synced after undo`);
            } catch (error) {
              log(`❌ Failed to sync AI engine after undo: ${error.message}`);
            }
          }, 100);
        }
      } else {
        // Regular human vs human game - add undo request to game state
      gameState.undoRequest = {
        requestedBy: playerId,
        moveIndex
      };
      
      // Store updated game state
      activeGames.set(gameId, gameState);
      
      // Use the new broadcast function for move updates
      broadcastGameUpdate(gameId, gameState);
      }
    }
  });

  // Handle undo response
  socket.on('respondToUndoRequest', ({ gameId, playerId, accepted, moveIndex }) => {
    log(`Player ${playerId} ${accepted ? 'accepted' : 'rejected'} undo request in game ${gameId}`);
    
    const gameState = activeGames.get(gameId);
    if (gameState) {
      if (accepted) {
        processUndo(gameState, moveIndex, gameId);
      }
      
      // Clear the undo request
      gameState.undoRequest = undefined;
      
      // Store updated game state
      activeGames.set(gameId, gameState);
      
      // Use the new broadcast function for move updates
      broadcastGameUpdate(gameId, gameState);
    }
  });

  // Handle play again request
  socket.on('playAgainRequest', ({ gameId, fromPlayerId, fromUsername, toPlayerId }) => {
    log(`Player ${fromPlayerId} (${fromUsername}) requested play again in game ${gameId} to player ${toPlayerId}`);
    
    const gameState = activeGames.get(gameId);
    if (gameState) {
      // Check if this is an AI game
      const isAIGame = gameState.players.some(player => player.isAI);
      const targetPlayer = gameState.players.find(p => p.id === toPlayerId);
      const isTargetAI = targetPlayer && targetPlayer.isAI;
      
      log(`🔍 Play again debug: isAIGame=${isAIGame}, targetPlayer=${JSON.stringify(targetPlayer)}, isTargetAI=${isTargetAI}`);
      log(`🔍 All players: ${JSON.stringify(gameState.players.map(p => ({ id: p.id, username: p.username, isAI: p.isAI })))}`);
      
      if (isAIGame && isTargetAI) {
        // Auto-accept play again requests for AI games
        log(`🤖 AI game detected - auto-accepting play again request`);
        
        // Create a new game immediately (same logic as accepted response)
        const originalGame = gameState;
        const newGameId = uuidv4();
        const newGameCode = Math.random().toString(36).substr(2, 6).toUpperCase();
        
        // Create new game state with same settings but reset board
        const newGameState = {
          id: newGameId,
          code: newGameCode,
          players: originalGame.players.map(player => ({
            ...player,
            timeRemaining: originalGame.timeControl ? originalGame.timeControl.timeControl * 60 : undefined,
            byoYomiPeriodsLeft: originalGame.timeControl?.byoYomiPeriods || 0,
            byoYomiTimeLeft: originalGame.timeControl?.byoYomiTime || 30,
            isInByoYomi: false
          })),
          board: {
            size: originalGame.board.size,
            stones: []
          },
          currentTurn: 'black',
          status: 'playing',
          history: [],
          capturedStones: { black: 0, white: 0 },
          komi: originalGame.komi,
          scoringRule: originalGame.scoringRule,
          gameType: originalGame.gameType,
          handicap: originalGame.handicap || 0,
          timeControl: originalGame.timeControl,
          timePerMove: originalGame.timePerMove,
          lastMoveTime: Date.now(),
          createdAt: Date.now(),
          vsAI: originalGame.vsAI,
          aiLevel: originalGame.aiLevel,
          aiUndoUsed: false // Reset undo usage for new game
        };
        
        log(`🔍 New game state players: ${JSON.stringify(newGameState.players.map(p => ({ id: p.id, username: p.username, isAI: p.isAI })))}`);

        // Store the new game first
        activeGames.set(newGameId, newGameState);

        // Add handicap stones if it's a handicap game
        if (newGameState.gameType === 'handicap' && newGameState.handicap > 0) {
          const handicapStones = getHandicapStones(newGameState.board.size, newGameState.handicap);
          newGameState.board.stones = handicapStones;
          newGameState.currentTurn = 'white';
        }

        // Create AI engine for the new game (players are already copied over)
        if (aiGameManager && originalGame.vsAI) {
          const humanPlayer = newGameState.players.find(p => !p.isAI);
          const aiPlayer = newGameState.players.find(p => p.isAI);
          const aiLevel = originalGame.aiLevel || 'normal';
          
          if (humanPlayer && aiPlayer) {
            setTimeout(async () => {
              try {
                // Just recreate the AI engine, not the player (player already exists)
                const aiSettings = {
                  boardSize: newGameState.board.size,
                  maxVisits: 100,
                  maxTime: 3.0,
                  threads: 1
                };
                
                // Store AI engine mapping
                const KataGoCPUEngine = require('./engines/katago-cpu');
                const engine = new KataGoCPUEngine(aiSettings);
                aiGameManager.aiPlayers.set(newGameId, engine);
                aiGameManager.aiGames.add(newGameId);
                
                await engine.initialize();
                log(`✅ AI engine recreated for new game ${newGameId}`);
                
                // Update the stored game state
                const updatedGameState = activeGames.get(newGameId);
                if (updatedGameState) {
                  broadcastGameUpdate(newGameId, updatedGameState);
                }
              } catch (error) {
                log(`❌ Failed to recreate AI engine: ${error.message}`);
              }
            }, 100);
          }
        }
        
        // Move player to the new game room
        const gameRoom = io.sockets.adapter.rooms.get(gameId);
        if (gameRoom) {
          gameRoom.forEach(socketId => {
            const socket = io.sockets.sockets.get(socketId);
            if (socket) {
              socket.leave(gameId);
              socket.join(newGameId);
              socketToGame.set(socketId, newGameId);
            }
          });
        }
        
        log(`Created new AI game ${newGameId} (${newGameCode}) - auto-accepted play again`);
        
        // Broadcast the new game to the player
        setTimeout(() => {
          io.to(newGameId).emit('playAgainResponse', {
            accepted: true,
            gameId: newGameId,
            newGameState: newGameState
          });
          
          broadcastGameUpdate(newGameId, newGameState);
        }, 200);
        
      } else {
        // Regular human vs human game - send request for manual acceptance
      io.to(gameId).emit('playAgainRequest', {
        gameId,
        fromPlayerId,
        fromUsername,
        toPlayerId
      });
      
      log(`Play again request sent from ${fromUsername} to player ${toPlayerId} in game ${gameId}`);
      }
    } else {
      log(`Play again request failed: Game ${gameId} not found`);
      socket.emit('error', `Game ${gameId} not found`);
    }
  });

  // Handle play again response
  socket.on('playAgainResponse', ({ gameId, fromPlayerId, accepted }) => {
    log(`Player ${fromPlayerId} responded to play again request in game ${gameId}: ${accepted ? 'accepted' : 'declined'}`);
    
    const gameState = activeGames.get(gameId);
    if (gameState) {
      if (accepted) {
        // Create a new game with the same players and settings
        const originalGame = gameState;
        const newGameId = uuidv4(); // Use proper UUID instead of timestamp
        const newGameCode = Math.random().toString(36).substr(2, 6).toUpperCase();
        
        // Create new game state with same settings but reset board
        const newGameState = {
          id: newGameId,
          code: newGameCode,
          players: originalGame.players.map(player => ({
            ...player,
            timeRemaining: originalGame.timeControl ? originalGame.timeControl.timeControl * 60 : undefined,
            byoYomiPeriodsLeft: originalGame.timeControl?.byoYomiPeriods || 0,
            byoYomiTimeLeft: originalGame.timeControl?.byoYomiTime || 30,
            isInByoYomi: false
          })),
          board: {
            size: originalGame.board.size,
            stones: []
          },
          currentTurn: 'black',
          status: 'playing', // Start as playing since we have 2 players
          history: [],
          capturedStones: { black: 0, white: 0 },
          komi: originalGame.komi,
          scoringRule: originalGame.scoringRule,
          gameType: originalGame.gameType,
          handicap: originalGame.handicap || 0,
          timeControl: originalGame.timeControl,
          timePerMove: originalGame.timePerMove,
          lastMoveTime: Date.now(),
          createdAt: Date.now()
        };

        // Add handicap stones if it's a handicap game
        if (newGameState.gameType === 'handicap' && newGameState.handicap > 0) {
          // Add handicap stones based on board size and handicap count
          const handicapStones = getHandicapStones(newGameState.board.size, newGameState.handicap);
          newGameState.board.stones = handicapStones;
          newGameState.currentTurn = 'white'; // White plays first in handicap games
        }

        // Store the new game
        activeGames.set(newGameId, newGameState);
        
        // Move both players to the new game room and update socketToGame mapping
        const gameRoom = io.sockets.adapter.rooms.get(gameId);
        if (gameRoom) {
          gameRoom.forEach(socketId => {
            const socket = io.sockets.sockets.get(socketId);
            if (socket) {
              socket.leave(gameId);
              socket.join(newGameId);
              socketToGame.set(socketId, newGameId);
            }
          });
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

  // Get game state
  socket.on('getGameState', ({ gameId }) => {
    log(`Request for game state of game ${gameId}`);
    
    const gameState = activeGames.get(gameId);
    if (gameState) {
      socket.emit('gameState', gameState);
    } else {
      socket.emit('error', `Game ${gameId} not found`);
    }
  });

  // Handle toggle dead stone in scoring phase
  socket.on('toggleDeadStone', ({ gameId, position, playerId }) => {
    log(`Player ${playerId} toggled dead stone at (${position.x}, ${position.y}) in game ${gameId}`);
    
    const gameState = activeGames.get(gameId);
    if (gameState) {
      // Only allow toggling in scoring mode
      if (gameState.status !== 'scoring') {
        log(`Cannot toggle dead stone: game ${gameId} not in scoring mode`);
        socket.emit('error', 'Cannot toggle dead stone: game not in scoring mode');
        return;
      }
      
      // Initialize deadStones array if it doesn't exist
      if (!gameState.deadStones) {
        gameState.deadStones = [];
      }
      
      // Find the stone at the clicked position
      const stoneAtPos = findStoneAt(position, gameState.board.stones);
      if (!stoneAtPos) {
        log(`No stone found at position (${position.x}, ${position.y})`);
        socket.emit('error', 'Cannot toggle dead stone: no stone at position');
        return;
      }
      
      // Get the connected group of stones
      const connectedGroup = getConnectedGroup(position, gameState.board.stones, gameState.board.size);
      
      // Count how many stones in the group are already marked as dead
      const alreadyMarkedCount = connectedGroup.filter(pos => 
        gameState.deadStones.some(dead => dead.x === pos.x && dead.y === pos.y)
      ).length;
      
      // If more than half are already marked, remove them all
      // Otherwise, add all stones in the group
      if (alreadyMarkedCount > connectedGroup.length / 2) {
        // Remove all stones in the group from dead stones
        gameState.deadStones = gameState.deadStones.filter(deadStone => 
          !connectedGroup.some(groupPos => groupPos.x === deadStone.x && groupPos.y === deadStone.y)
        );
      } else {
        // Add all stones in the group to dead stones (avoiding duplicates)
        const newDeadStones = connectedGroup.filter(groupPos => 
          !gameState.deadStones.some(deadStone => deadStone.x === groupPos.x && deadStone.y === groupPos.y)
        );
        
        gameState.deadStones = [...gameState.deadStones, ...newDeadStones];
      }
      
      // Update stored game state
      activeGames.set(gameId, gameState);
      
      // Broadcast dead stone change to all clients
      io.to(gameId).emit('deadStoneToggled', {
        gameId,
        position,
        playerId,
        deadStones: gameState.deadStones
      });
      
      // Use the new broadcast function for move updates
      broadcastGameUpdate(gameId, gameState);
    }
  });

  // Handle sync dead stones request  
  socket.on('syncDeadStones', ({ gameId, playerId }) => {
    log(`Player ${playerId} requested dead stones sync for game ${gameId}`);
    
    const gameState = activeGames.get(gameId);
    if (gameState) {
      // Send current dead stones to the requesting client
      socket.emit('deadStonesSynced', {
        gameId,
        deadStones: gameState.deadStones || []
      });
      
      log(`Sent ${gameState.deadStones ? gameState.deadStones.length : 0} dead stones to player ${playerId}`);
    } else {
      log(`Game ${gameId} not found for dead stones sync request`);
      socket.emit('error', `Game ${gameId} not found`);
    }
  });

  // Handle game status changed
  socket.on('gameStatusChanged', ({ gameId, status }) => {
    log(`Game ${gameId} status changed to ${status}`);
    
    const gameState = activeGames.get(gameId);
    if (gameState) {
      gameState.status = status;
      activeGames.set(gameId, gameState);
      
      // Broadcast the status change to all clients
      io.to(gameId).emit('gameStatusChanged', {
        gameId,
        status
      });
      
      // Use the new broadcast function for move updates
      broadcastGameUpdate(gameId, gameState);
      
      log(`Broadcasting status change to all clients in room ${gameId}`);
    } else {
      log(`Game ${gameId} not found for status change`);
      socket.emit('error', `Game ${gameId} not found`);
    }
  });
});

// Helper function to apply time logic for AI players (same as human players)
function applyAITimeLogic(gameState, aiPlayer, thinkingTimeSeconds, io, gameId) {
  if (!aiPlayer || thinkingTimeSeconds <= 0) return;

  log(`🤖 TIME CALCULATION - AI ${aiPlayer.color}: Main=${aiPlayer.timeRemaining}s, InByoYomi=${aiPlayer.isInByoYomi}, Thinking=${thinkingTimeSeconds}s`);

  if (gameState.gameType === 'blitz') {
    // For blitz games, check if AI exceeded time per move
    if (thinkingTimeSeconds > gameState.timePerMove) {
      log(`💀 BLITZ TIMEOUT - AI ${aiPlayer.color} spent ${thinkingTimeSeconds}s, exceeded time limit of ${gameState.timePerMove}s per move`);
      handlePlayerTimeout(gameState, aiPlayer);
      return false; // Indicate timeout
    } else {
      log(`⚡ BLITZ MOVE - AI ${aiPlayer.color} spent ${thinkingTimeSeconds}s (within ${gameState.timePerMove}s limit)`);
    }
    
    // Reset AI timer for next move (if it's AI vs AI)
    aiPlayer.timeRemaining = gameState.timePerMove;
    return true;
  } else {
    // Standard game time deduction logic
    let timerAlreadyReset = false;
    
    if (aiPlayer.isInByoYomi) {
      // AI is already in byo-yomi mode
      if (thinkingTimeSeconds <= gameState.timeControl.byoYomiTime) {
        // Move made within byo-yomi period - reset clock, keep same period count
        aiPlayer.byoYomiTimeLeft = gameState.timeControl.byoYomiTime;
        log(`🔄 AI BYO-YOMI RESET - AI ${aiPlayer.color} thought for ${thinkingTimeSeconds}s (within period), period reset to ${gameState.timeControl.byoYomiTime}s, periods remain: ${aiPlayer.byoYomiPeriodsLeft}`);
        
        // Emit byoYomiReset event
        io.to(gameId).emit('byoYomiReset', {
          gameId,
          color: aiPlayer.color,
          byoYomiTimeLeft: aiPlayer.byoYomiTimeLeft,
          byoYomiPeriodsLeft: aiPlayer.byoYomiPeriodsLeft
        });
        log(`📤 AI BYO-YOMI RESET EVENT SENT - AI ${aiPlayer.color}: ${aiPlayer.byoYomiTimeLeft}s, Periods=${aiPlayer.byoYomiPeriodsLeft}`);
        
        timerAlreadyReset = true;
      } else {
        // Move exceeded byo-yomi period - calculate periods consumed
        const periodsConsumed = Math.floor(thinkingTimeSeconds / gameState.timeControl.byoYomiTime);
        const newPeriodsLeft = Math.max(0, aiPlayer.byoYomiPeriodsLeft - periodsConsumed);
        
        if (newPeriodsLeft > 0) {
          // Still have periods remaining
          aiPlayer.byoYomiPeriodsLeft = newPeriodsLeft;
          aiPlayer.byoYomiTimeLeft = gameState.timeControl.byoYomiTime;
          log(`⏳ AI BYO-YOMI PERIODS CONSUMED - AI ${aiPlayer.color} thought for ${thinkingTimeSeconds}s, consumed ${periodsConsumed} periods, ${newPeriodsLeft} periods remaining`);
          
          // Emit reset event when periods are consumed and reset
          io.to(gameId).emit('byoYomiReset', {
            gameId,
            color: aiPlayer.color,
            byoYomiTimeLeft: aiPlayer.byoYomiTimeLeft,
            byoYomiPeriodsLeft: aiPlayer.byoYomiPeriodsLeft
          });
          log(`📤 AI BYO-YOMI PERIODS CONSUMED EVENT SENT - AI ${aiPlayer.color}: ${aiPlayer.byoYomiTimeLeft}s, Periods=${aiPlayer.byoYomiPeriodsLeft}`);
          
          timerAlreadyReset = true;
        } else {
          // No more periods - AI times out
          log(`💀 TIMEOUT - AI ${aiPlayer.color} consumed all byo-yomi periods (thought for ${thinkingTimeSeconds}s, consumed ${periodsConsumed} periods)`);
          handlePlayerTimeout(gameState, aiPlayer);
          return false; // Indicate timeout
        }
      }
    } else {
      // AI is in main time
      const newMainTime = Math.max(0, aiPlayer.timeRemaining - thinkingTimeSeconds);
      
      if (newMainTime > 0) {
        // Still in main time
        aiPlayer.timeRemaining = newMainTime;
        log(`⏰ AI TIME DEDUCTED - AI ${aiPlayer.color} spent ${thinkingTimeSeconds}s from main time, ${newMainTime}s remaining`);
      } else {
        // First time entering byo-yomi - calculate periods consumed
        if (gameState.timeControl && gameState.timeControl.byoYomiPeriods > 0) {
          const timeOverage = thinkingTimeSeconds - aiPlayer.timeRemaining; // How much time exceeded main time
          const periodsConsumed = Math.floor(timeOverage / gameState.timeControl.byoYomiTime);
          const remainingPeriods = Math.max(0, gameState.timeControl.byoYomiPeriods - periodsConsumed);
          
          if (remainingPeriods > 0) {
            // Enter byo-yomi with calculated periods remaining
            aiPlayer.timeRemaining = 0;
            aiPlayer.isInByoYomi = true;
            aiPlayer.byoYomiPeriodsLeft = remainingPeriods;
            aiPlayer.byoYomiTimeLeft = gameState.timeControl.byoYomiTime;
            log(`🚨 AI ENTERING BYO-YOMI: AI ${aiPlayer.color} thought for ${thinkingTimeSeconds}s (${timeOverage}s over main time), consumed ${periodsConsumed} periods, ${remainingPeriods} periods remaining`);
            
            // Emit byo-yomi reset event for entering byo-yomi
            io.to(gameId).emit('byoYomiReset', {
              gameId,
              color: aiPlayer.color,
              byoYomiTimeLeft: aiPlayer.byoYomiTimeLeft,
              byoYomiPeriodsLeft: aiPlayer.byoYomiPeriodsLeft
            });
            log(`📤 AI BYO-YOMI ENTERED EVENT SENT - AI ${aiPlayer.color}: ${aiPlayer.byoYomiTimeLeft}s, Periods=${aiPlayer.byoYomiPeriodsLeft}`);
            
            timerAlreadyReset = true;
          } else {
            // No periods left - AI times out
            log(`💀 TIMEOUT - AI ${aiPlayer.color} exceeded main time and consumed all byo-yomi periods (thought for ${thinkingTimeSeconds}s, overage ${timeOverage}s, consumed ${periodsConsumed} periods)`);
            handlePlayerTimeout(gameState, aiPlayer);
            return false; // Indicate timeout
          }
        } else {
          // No byo-yomi available - check if unlimited time before timing out
          const isUnlimitedTime = (gameState.timeControl?.timeControl || 0) === 0;
          if (!isUnlimitedTime) {
            log(`💀 TIMEOUT - AI ${aiPlayer.color} exceeded main time with no byo-yomi available (thought for ${thinkingTimeSeconds}s, main time was ${aiPlayer.timeRemaining}s)`);
            handlePlayerTimeout(gameState, aiPlayer);
            return false; // Indicate timeout
          } else {
            log(`⏰ UNLIMITED TIME - AI ${aiPlayer.color} thinking time but no timeout (unlimited time mode)`);
          }
        }
      }
    }
    
    return true; // No timeout
  }
}

// AI Game Functions
async function makeAIMove(gameId) {
  try {
    const gameState = activeGames.get(gameId);
    if (!gameState) {
      log(`❌ Game ${gameId} not found for AI move`);
      return;
    }

    if (gameState.status !== 'playing') {
      log(`❌ Game ${gameId} not playing (status: ${gameState.status}), skipping AI move`);
      return;
    }

    if (!aiGameManager.shouldAIMakeMove(gameState)) {
      log(`❌ AI should not make move for game ${gameId}`);
      return;
    }

    const currentColor = gameState.currentTurn;
    log(`🤖 Making AI move for ${currentColor} in game ${gameId}`);

    const aiMoveResult = await aiGameManager.makeAIMove(gameState, currentColor);
    const aiPlayer = gameState.players.find(p => p.color === currentColor && p.isAI);
    
    if (!aiPlayer) {
      log(`❌ AI player not found for color ${currentColor}`);
      return;
    }

    // Apply time logic for AI move
    const thinkingTime = aiMoveResult.thinkingTime || 1;
    const timeoutOccurred = !applyAITimeLogic(gameState, aiPlayer, thinkingTime, io, gameId);
    
    if (timeoutOccurred) {
      log(`💀 AI ${currentColor} timed out, game ended`);
      return;
    }
    
    if (aiMoveResult.type === 'pass') {
      // Handle AI pass
      log(`🤖 AI (${currentColor}) decided to pass`);
      
      // Add pass to history with proper time tracking
      gameState.history.push({
        pass: true,
        color: currentColor,
        playerId: aiMoveResult.playerId,
        timestamp: Date.now(),
        timeSpentOnMove: thinkingTime,
        timeSpentDisplay: formatMoveTimeDisplay(thinkingTime),
        timeDisplay: formatTimeDisplay(aiPlayer),
        timeRemaining: aiPlayer.timeRemaining,
        isInByoYomi: aiPlayer.isInByoYomi,
        byoYomiTimeLeft: aiPlayer.byoYomiTimeLeft,
        byoYomiPeriodsLeft: aiPlayer.byoYomiPeriodsLeft
      });

      // Switch turn
      gameState.currentTurn = currentColor === 'black' ? 'white' : 'black';
      
      // Check for double pass (game end)
      const historyLength = gameState.history.length;
      if (historyLength >= 2) {
        const lastMove = gameState.history[historyLength - 1];
        const secondLastMove = gameState.history[historyLength - 2];
        
        if (lastMove.pass && secondLastMove.pass) {
          gameState.status = 'scoring';
          gameState.deadStones = [];
          gameState.scoreConfirmation = { black: false, white: false };
          log(`Game ${gameId} ended with double pass, entering scoring phase`);
        }
      }
      
      // Broadcast the pass
      io.to(gameId).emit('moveMade', {
        pass: true,
        color: currentColor,
        playerId: aiMoveResult.playerId
      });

    } else if (aiMoveResult.type === 'move') {
      // Handle AI move
      const { position } = aiMoveResult;
      log(`🤖 AI (${currentColor}) plays at (${position.x}, ${position.y})`);

      // Validate move
      const isOccupied = gameState.board.stones.some(
        stone => stone.position.x === position.x && stone.position.y === position.y
      );
      
      if (isOccupied) {
        log(`❌ AI generated invalid move - position occupied`);
        return;
      }

      // Check KO rule
      if (gameState.koPosition && 
          position.x === gameState.koPosition.x && 
          position.y === gameState.koPosition.y) {
        log(`❌ AI generated invalid move - KO violation`);
        return;
      }

      // Add the stone
      const updatedStones = [...gameState.board.stones, {
        position,
        color: currentColor
      }];

      // Capture opponent stones
      const capturedStones = captureDeadStones(gameState, updatedStones, position, currentColor);
      gameState.board.stones = capturedStones.remainingStones;

      // Track move
      gameState.lastMove = position;
      gameState.lastMoveColor = currentColor;
      gameState.lastMovePlayerId = aiMoveResult.playerId;
      gameState.lastMoveCapturedCount = capturedStones.capturedCount;

      // Add to history with proper time tracking
      gameState.history.push({
        position: position,
        color: currentColor,
        playerId: aiMoveResult.playerId,
        timestamp: Date.now(),
        timeSpentOnMove: thinkingTime,
        timeSpentDisplay: formatMoveTimeDisplay(thinkingTime),
        timeDisplay: formatTimeDisplay(aiPlayer),
        timeRemaining: aiPlayer.timeRemaining,
        isInByoYomi: aiPlayer.isInByoYomi,
        byoYomiTimeLeft: aiPlayer.byoYomiTimeLeft,
        byoYomiPeriodsLeft: aiPlayer.byoYomiPeriodsLeft,
        capturedCount: capturedStones.capturedCount
      });

      // Set KO position
      if (capturedStones.koPosition) {
        gameState.koPosition = capturedStones.koPosition;
      } else if (gameState.koPosition) {
        gameState.koPosition = undefined;
      }

      // Update captured stones count
      if (!gameState.capturedStones) {
        gameState.capturedStones = { black: 0, white: 0 };
      }
      if (capturedStones.capturedCount > 0) {
        gameState.capturedStones[currentColor] += capturedStones.capturedCount;
      }

      // Switch turn
      gameState.currentTurn = currentColor === 'black' ? 'white' : 'black';
      
      // Reset timer for next player's move (only for standard games, not blitz)
      if (gameState.gameType !== 'blitz') {
        gameState.lastMoveTime = Date.now();
      }
    }

    // Update stored game state
    activeGames.set(gameId, gameState);
    
    // Send time update for AI player
    io.to(gameId).emit('timeUpdate', {
      gameId,
      playerId: aiPlayer.id,
      color: aiPlayer.color,
      timeRemaining: aiPlayer.timeRemaining,
      isInByoYomi: aiPlayer.isInByoYomi,
      byoYomiTimeLeft: aiPlayer.byoYomiTimeLeft,
      byoYomiPeriodsLeft: aiPlayer.byoYomiPeriodsLeft,
      serverTimestamp: Date.now()
    });
    log(`📤 AI TIME UPDATE SENT - AI ${aiPlayer.color}: Main=${aiPlayer.timeRemaining}s, InByoYomi=${aiPlayer.isInByoYomi}, ByoYomiLeft=${aiPlayer.byoYomiTimeLeft}s, Periods=${aiPlayer.byoYomiPeriodsLeft}`);
    
    // Broadcast updated game state
    broadcastGameUpdate(gameId, gameState);
    
    log(`✅ AI move completed for game ${gameId}`);

  } catch (error) {
    log(`❌ Error making AI move for game ${gameId}: ${error.message}`);
    console.error(error);
  }
}

// Clean up AI games when they end
function cleanupAIGame(gameId) {
  if (aiGameManager.getActiveAIGames().includes(gameId)) {
    aiGameManager.cleanupGame(gameId);
    log(`🧹 Cleaned up AI game ${gameId}`);
  }
}

// Graceful shutdown handling
process.on('SIGINT', () => {
  console.log('🛑 Shutting down server...');
  aiGameManager.shutdown();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('🛑 Shutting down server...');
  aiGameManager.shutdown();
  process.exit(0);
});

// Route to check server status
app.get('/', (req, res) => {
  res.send('Socket server is running');
});

// Health check endpoint for monitoring
app.get('/health', (req, res) => {
  const healthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: {
      NODE_ENV: process.env.NODE_ENV || 'development',
      REDIS_URL: process.env.REDIS_URL ? 'configured' : 'not configured',
      REDIS_PASSWORD: process.env.REDIS_PASSWORD ? 'configured' : 'not configured'
    },
    activeGames: activeGames.size,
    connectedSockets: io.engine.clientsCount,
    memory: process.memoryUsage(),
    version: '1.0.8'
  };
  
  res.json(healthData);
});

// Debug endpoint to show Redis adapter status
app.get('/debug/redis', (req, res) => {
  const redisStatus = {
    adapterConfigured: !!io.of('/').adapter.constructor.name.includes('Redis'),
    adapterType: io.of('/').adapter.constructor.name,
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      REDIS_URL: process.env.REDIS_URL,
      REDIS_PASSWORD: process.env.REDIS_PASSWORD ? '[CONFIGURED]' : null
    },
    timestamp: new Date().toISOString()
  };
  
  res.json(redisStatus);
});

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';
server.listen(PORT, HOST, () => {
  log(`Socket server listening on ${HOST}:${PORT}`);
});

// Helper function to get handicap stone positions
function getHandicapStones(boardSize, handicap) {
  if (handicap < 2 || handicap > 9) return [];
  
  // Standard handicap stone positions for different board sizes
  const HANDICAP_POSITIONS = {
    21: [
      { x: 3, y: 3 },     // bottom left
      { x: 17, y: 17 },   // top right
      { x: 17, y: 3 },    // bottom right
      { x: 3, y: 17 },    // top left
      { x: 10, y: 10 },   // center
      { x: 10, y: 3 },    // bottom center
      { x: 10, y: 17 },   // top center
      { x: 3, y: 10 },    // left center
      { x: 17, y: 10 },   // right center
    ],
    19: [
      { x: 3, y: 3 },    // bottom left
      { x: 15, y: 15 },  // top right
      { x: 15, y: 3 },   // bottom right
      { x: 3, y: 15 },   // top left
      { x: 9, y: 9 },    // center
      { x: 9, y: 3 },    // bottom center
      { x: 9, y: 15 },   // top center
      { x: 3, y: 9 },    // left center
      { x: 15, y: 9 },   // right center
    ],
    15: [
      { x: 3, y: 3 },     // bottom left
      { x: 11, y: 11 },   // top right
      { x: 11, y: 3 },    // bottom right
      { x: 3, y: 11 },    // top left
      { x: 7, y: 7 },     // center
      { x: 7, y: 3 },     // bottom center
      { x: 7, y: 11 },    // top center
      { x: 3, y: 7 },     // left center
      { x: 11, y: 7 },    // right center
    ],
    13: [
      { x: 3, y: 3 },    // bottom left
      { x: 9, y: 9 },    // top right
      { x: 9, y: 3 },    // bottom right
      { x: 3, y: 9 },    // top left
      { x: 6, y: 6 },    // center
      { x: 6, y: 3 },    // bottom center
      { x: 6, y: 9 },    // top center
      { x: 3, y: 6 },    // left center
      { x: 9, y: 6 },    // right center
    ],
    9: [
      { x: 2, y: 2 },    // bottom left
      { x: 6, y: 6 },    // top right
      { x: 6, y: 2 },    // bottom right
      { x: 2, y: 6 },    // top left
      { x: 4, y: 4 },    // center
      { x: 4, y: 2 },    // bottom center
      { x: 4, y: 6 },    // top center
      { x: 2, y: 4 },    // left center
      { x: 6, y: 4 },    // right center
    ]
  };
  
  const positions = HANDICAP_POSITIONS[boardSize];
  if (!positions) return [];
  
  // Get the handicap positions (limit to requested handicap)
  const handicapPositions = positions.slice(0, handicap);
  
  // Create stones for each position
  return handicapPositions.map(position => ({
    position,
    color: 'black'
  }));
}

// Helper function to get adjacent positions
function getAdjacentPositions(position) {
  return [
    { x: position.x, y: position.y - 1 }, // up
    { x: position.x + 1, y: position.y }, // right
    { x: position.x, y: position.y + 1 }, // down
    { x: position.x - 1, y: position.y }, // left
  ];
}

// Check if a position is within the bounds of the board
function isWithinBounds(position, boardSize) {
  return position.x >= 0 && position.x < boardSize && position.y >= 0 && position.y < boardSize;
}

// Find stone at a position
function findStoneAt(position, stones) {
  return stones.find(
    stone => stone.position.x === position.x && stone.position.y === position.y
  );
}

// Get connected group of stones
function getConnectedGroup(position, stones, boardSize) {
  const stone = findStoneAt(position, stones);
  if (!stone) return [];
  
  const color = stone.color;
  const visited = new Set();
  const group = [];
  
  function visit(pos) {
    const key = `${pos.x},${pos.y}`;
    if (visited.has(key)) return;
    
    visited.add(key);
    
    const stoneAtPos = findStoneAt(pos, stones);
    if (!stoneAtPos || stoneAtPos.color !== color) return;
    
    group.push(pos);
    
    // Visit adjacent positions
    const adjacentPositions = getAdjacentPositions(pos).filter(p => 
      isWithinBounds(p, boardSize)
    );
    
    adjacentPositions.forEach(visit);
  }
  
  visit(position);
  return group;
}

// Check if a position is empty
function isEmpty(position, stones) {
  return !stones.some(
    stone => stone.position.x === position.x && stone.position.y === position.y
  );
}

// Count liberties for a group of stones
function countLiberties(group, stones, boardSize) {
  const liberties = new Set();
  
  group.forEach(position => {
    const adjacentPositions = getAdjacentPositions(position).filter(p => 
      isWithinBounds(p, boardSize)
    );
    
    adjacentPositions.forEach(adjPos => {
      if (isEmpty(adjPos, stones)) {
        liberties.add(`${adjPos.x},${adjPos.y}`);
      }
    });
  });
  
  return liberties.size;
}

// Capture stones that have no liberties after a move
function captureDeadStones(gameState, updatedStones, lastMovePosition, playerColor) {
  const boardSize = gameState.board.size;
  const oppositeColor = playerColor === 'black' ? 'white' : 'black';
  
  // Check all adjacent positions for opponent stones
  const adjacentPositions = getAdjacentPositions(lastMovePosition).filter(p => 
    isWithinBounds(p, boardSize)
  );
  
  let capturedCount = 0;
  let remainingStones = [...updatedStones];
  let koPosition = undefined;
  let capturedGroups = [];
  
  // Check each adjacent position for enemy groups that might be captured
  adjacentPositions.forEach(adjPos => {
    const stoneAtPos = findStoneAt(adjPos, remainingStones);
    
    // If there's an opponent's stone at this position
    if (stoneAtPos && stoneAtPos.color === oppositeColor) {
      // Get the entire connected group
      const group = getConnectedGroup(adjPos, remainingStones, boardSize);
      
      // Check if this group has any liberties
      const liberties = countLiberties(group, remainingStones, boardSize);
      
      // If the group has no liberties, remove all stones in the group
      if (liberties === 0) {
        // Track this group before removing
        capturedGroups.push([...group]);
        
        // Remove captured stones
        remainingStones = remainingStones.filter(stone => 
          !group.some(pos => pos.x === stone.position.x && pos.y === stone.position.y)
        );
        
        capturedCount += group.length;
        log(`Captured ${group.length} ${oppositeColor} stones`);
        
        // Check for KO: if we captured exactly one stone
        if (group.length === 1) {
          koPosition = group[0];
          log(`KO position set at (${koPosition.x}, ${koPosition.y})`);
        }
      }
    }
  });
  
  // Also check if the placed stone's group has liberties
  const newStoneGroup = getConnectedGroup(lastMovePosition, remainingStones, boardSize);
  const newStoneLiberties = countLiberties(newStoneGroup, remainingStones, boardSize);
  
  if (newStoneLiberties === 0) {
    log(`Suicide move detected!`);
    // In the server, we'll still allow the move even if it's suicide
    // Client-side validation should prevent this
  }
  
  return { remainingStones, capturedCount, koPosition };
} 