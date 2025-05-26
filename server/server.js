const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

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

// Store active games in memory
const activeGames = new Map();
// Map socket IDs to game IDs for quick lookup
const socketToGame = new Map();
// Debug flag
const DEBUG = true;

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
    
    // Also emit a specific byoyomi reset event for more reliable updating
    const movingPlayer = gameState.players.find(p => p.color === gameState.lastMoveColor);
    if (movingPlayer && movingPlayer.isInByoYomi) {
      io.to(gameId).emit('byoYomiReset', {
        gameId,
        color: gameState.lastMoveColor,
        byoYomiTimeLeft: movingPlayer.byoYomiTimeLeft,
        byoYomiPeriodsLeft: movingPlayer.byoYomiPeriodsLeft
      });
    }
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

// Improved timer handling function
function handlePlayerTimeout(gameState, player) {
  gameState.status = 'finished';
  const winner = player.color === 'black' ? 'white' : 'black';
  gameState.winner = winner;
  
  // Set the game result with timeout notation
  const result = winner === 'black' ? 'B+T' : 'W+T';
  gameState.result = result;
  
  // Create timeout message
  const timeoutMessage = player.color === 'black' 
    ? 'Black ran out of time - White wins (W+T)' 
    : 'White ran out of time - Black wins (B+T)';
  
  // Add details about the time control
  let timeoutDetails = player.isInByoYomi
    ? `${player.color} used all ${gameState.timeControl.byoYomiPeriods} byo-yomi periods`
    : `${player.color} exceeded main time limit of ${gameState.timeControl.timeControl} minutes`;
  
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
  socket.on('createGame', ({ gameState, playerId }) => {
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
    
    // Store the game state
    activeGames.set(gameState.id, gameState);
    
    // Join the socket to the game's room
    socket.join(gameState.id);
    socketToGame.set(socket.id, gameState.id);
    
    log(`Player ${playerId} created and joined game ${gameState.id}`);
    
    // Use the new broadcast function
    broadcastGameUpdate(gameState.id, gameState);
  });

  // Join an existing game
  socket.on('joinGame', ({ gameId, playerId, username, isReconnect }) => {
    log(`Player ${playerId} (${username}) joining game ${gameId}`);
    
    // Add socket to the game's room
    socket.join(gameId);
    socketToGame.set(socket.id, gameId);
    
    // Get the current game state
    const gameState = activeGames.get(gameId);
    
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
          gameState.players.push({
            id: playerId,
            username,
            color: newPlayerColor,
            timeRemaining: gameState.timeControl ? gameState.timeControl.timeControl * 60 : 0, // Initialize with full time control in seconds
            // Initialize byo-yomi state for new player
            byoYomiPeriodsLeft: gameState.timeControl?.byoYomiPeriods || 0,
            byoYomiTimeLeft: gameState.timeControl?.byoYomiTime || 30,
            isInByoYomi: false // Start in main time
          });
          
          // If we now have 2 players, set status to playing
          if (gameState.players.length >= 2) {
            log(`Game ${gameId} now has 2 players, changing status to playing`);
            gameState.status = 'playing';
            gameState.lastMoveTime = Date.now(); // Initialize move timer
            
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
        if (movingPlayer.isInByoYomi) {
          // In byo-yomi mode - check if time exceeded the period
          if (timeSpentOnMove <= movingPlayer.byoYomiTimeLeft) {
            // Move made within byo-yomi time - RESET the byo-yomi period
            movingPlayer.byoYomiTimeLeft = gameState.timeControl.byoYomiTime;
            log(`🔄 BYO-YOMI RESET - Player ${movingPlayer.color} made move in ${timeSpentOnMove}s (within ${movingPlayer.byoYomiTimeLeft}s limit), period reset to ${gameState.timeControl.byoYomiTime}s`);
          } else {
            // Time exceeded - consume a period
            if (movingPlayer.byoYomiPeriodsLeft > 1) {
              movingPlayer.byoYomiPeriodsLeft -= 1;
              movingPlayer.byoYomiTimeLeft = gameState.timeControl.byoYomiTime;
              log(`⏳ BYO-YOMI PERIOD USED - Player ${movingPlayer.color} exceeded time (${timeSpentOnMove}s), used one period, ${movingPlayer.byoYomiPeriodsLeft} periods remaining`);
            } else {
              // No more periods - player times out
              log(`💀 TIMEOUT - Player ${movingPlayer.color} exceeded final byo-yomi period (${timeSpentOnMove}s > ${movingPlayer.byoYomiTimeLeft}s)`);
              handlePlayerTimeout(gameState, movingPlayer);
              return; // Exit early, game is over
            }
          }
        } else {
          // In main time, deduct from main time
          const newMainTime = Math.max(0, movingPlayer.timeRemaining - timeSpentOnMove);
          movingPlayer.timeRemaining = newMainTime;
          log(`⏰ TIME DEDUCTED - Player ${movingPlayer.color} spent ${timeSpentOnMove}s from main time, ${newMainTime}s remaining`);
          
          // Check if main time expired and player should enter byo-yomi
          if (newMainTime <= 0 && gameState.timeControl && gameState.timeControl.byoYomiPeriods > 0) {
            movingPlayer.isInByoYomi = true;
            movingPlayer.byoYomiPeriodsLeft = gameState.timeControl.byoYomiPeriods;
            movingPlayer.byoYomiTimeLeft = gameState.timeControl.byoYomiTime;
            log(`🚨 ENTERING BYO-YOMI: Player ${movingPlayer.color} entered byo-yomi with ${gameState.timeControl.byoYomiPeriods} periods`);
          } else if (newMainTime <= 0) {
            // No byo-yomi available - player times out
            log(`💀 TIMEOUT - Player ${movingPlayer.color} exceeded main time with no byo-yomi available`);
            handlePlayerTimeout(gameState, movingPlayer);
            return; // Exit early, game is over
          }
        }
      }
      
      // Reset timer for the next move
      gameState.lastMoveTime = Date.now();
      
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
      
      // CRITICAL FIX: Handle turn change with proper timing for byo-yomi reset
      const needsByoYomiDelay = movingPlayer && movingPlayer.isInByoYomi && 
                               gameState.timeControl && gameState.timeControl.byoYomiPeriods > 0;
      
      if (needsByoYomiDelay) {
        // Add delay before changing turn to allow client to process byo-yomi reset
        setTimeout(() => {
          gameState.currentTurn = color === 'black' ? 'white' : 'black';
          broadcastGameUpdate(gameId, gameState);
        }, 150); // 150ms delay to ensure client processes reset
      } else {
        // No byo-yomi reset needed, change turn immediately
        gameState.currentTurn = color === 'black' ? 'white' : 'black';
        broadcastGameUpdate(gameId, gameState);
      }
    }
  });

  // Timer tick event to update remaining time (now only for display sync)
  socket.on('timerTick', ({ gameId }) => {
    log(`⏱️ TIMER TICK received for game ${gameId}`);
    const gameState = activeGames.get(gameId);
    
    // Only send current time state for display sync, don't deduct time here
    // Time deduction now happens when moves are actually made
    if (gameState && gameState.status === 'playing') {
      // Send current time state to all players for display synchronization
      gameState.players.forEach(player => {
        io.to(gameId).emit('timeUpdate', {
          gameId,
          playerId: player.id,
          color: player.color,
          timeRemaining: player.timeRemaining,
          byoYomiPeriodsLeft: player.byoYomiPeriodsLeft,
          byoYomiTimeLeft: player.byoYomiTimeLeft,
          isInByoYomi: player.isInByoYomi
        });
      });
      
      // Periodic full state sync
      const now = Date.now();
      const lastSync = gameState.lastFullStateSync || 0;
      if (now - lastSync >= 5000) { // Sync every 5 seconds
        gameState.lastFullStateSync = now;
        broadcastGameUpdate(gameId, gameState);
      }
      
      return; // Exit early, don't run the old timer logic
    }
    
    // Keep the old logic for blitz games or as fallback
    if (gameState && gameState.status === 'playing' && 
        ((gameState.timePerMove && gameState.timePerMove > 0) || 
         (gameState.timeControl && gameState.timeControl.timeControl > 0)) && 
        gameState.lastMoveTime) {
      const now = Date.now();
      const elapsedTime = Math.floor((now - gameState.lastMoveTime) / 1000);
      log(`⏰ TIMER CALCULATION - Elapsed: ${elapsedTime}s, LastMove: ${new Date(gameState.lastMoveTime).toISOString()}, Now: ${new Date(now).toISOString()}`);
      
      // CRITICAL FIX: Don't reset lastMoveTime on every tick - only reset it when we actually update the time
      // gameState.lastMoveTime = now; // This was causing the bug!
      
      // Update time for current player only
      const currentPlayer = gameState.players.find(p => p.color === gameState.currentTurn);
      if (currentPlayer) {
        log(`⏰ BEFORE UPDATE - Player ${currentPlayer.color}: Main=${currentPlayer.timeRemaining}s, InByoYomi=${currentPlayer.isInByoYomi}`);
      }
      if (currentPlayer && currentPlayer.timeRemaining !== undefined) {
        
        // Handle blitz game timing
        if (gameState.gameType === 'blitz' && gameState.timePerMove) {
          // For blitz games, count down time per move
          const remainingTime = Math.max(0, currentPlayer.timeRemaining - elapsedTime);
          currentPlayer.timeRemaining = remainingTime;
          gameState.lastMoveTime = now; // Reset timer after updating
          
          // Send time updates for both players
          gameState.players.forEach(player => {
            io.to(gameId).emit('timeUpdate', {
              gameId,
              playerId: player.id,
              color: player.color,
              timeRemaining: player.color === gameState.currentTurn ? 
                remainingTime : player.timeRemaining
            });
          });
          
          // Check for time per move timeout
          if (remainingTime <= 0) {
            log(`Player ${currentPlayer.id} (${currentPlayer.color}) ran out of time in blitz mode`);
            handlePlayerTimeout(gameState, currentPlayer);
          }
        }
        // Handle byo-yomi timing
        else if (currentPlayer.isInByoYomi && gameState.timeControl.byoYomiPeriods > 0) {
          // Player is in byo-yomi, count down byo-yomi time
          const newByoYomiTime = Math.max(0, currentPlayer.byoYomiTimeLeft - elapsedTime);
          currentPlayer.byoYomiTimeLeft = newByoYomiTime;
          gameState.lastMoveTime = now; // Reset timer after updating
          
          // Send time updates for both players
          gameState.players.forEach(player => {
            io.to(gameId).emit('timeUpdate', {
              gameId,
              playerId: player.id,
              color: player.color,
              timeRemaining: player.timeRemaining,
              byoYomiPeriodsLeft: player.byoYomiPeriodsLeft,
              byoYomiTimeLeft: player.color === gameState.currentTurn ? newByoYomiTime : player.byoYomiTimeLeft,
              isInByoYomi: player.isInByoYomi
            });
          });
          
          // Check if byo-yomi period expired
          if (newByoYomiTime <= 0) {
            const periodsLeft = (currentPlayer.byoYomiPeriodsLeft || 0) - 1;
            
            if (periodsLeft > 0) {
              // Start next byo-yomi period
              currentPlayer.byoYomiPeriodsLeft = periodsLeft;
              currentPlayer.byoYomiTimeLeft = gameState.timeControl.byoYomiTime;
              
              log(`⏳ BYO-YOMI PERIOD USED: Player ${currentPlayer.id} (${currentPlayer.color}) used one byo-yomi period. ${periodsLeft} periods remaining.`);
              
              // Broadcast byo-yomi period used
              io.to(gameId).emit('byoYomiPeriodUsed', {
                gameId,
                playerId: currentPlayer.id,
                color: currentPlayer.color,
                periodsLeft: periodsLeft
              });
            } else {
              // No more byo-yomi periods, player times out
              log(`Player ${currentPlayer.id} (${currentPlayer.color}) ran out of byo-yomi periods`);
              handlePlayerTimeout(gameState, currentPlayer);
            }
          }
        } else {
          // Player is in main time, count down main time
          const remainingTime = Math.max(0, currentPlayer.timeRemaining - elapsedTime);
          currentPlayer.timeRemaining = remainingTime;
          gameState.lastMoveTime = now; // Reset timer after updating
          log(`⏰ MAIN TIME UPDATE - Player ${currentPlayer.color}: ${remainingTime}s remaining (elapsed: ${elapsedTime}s)`);
          
          // Send time updates for both players
          gameState.players.forEach(player => {
            io.to(gameId).emit('timeUpdate', {
              gameId,
              playerId: player.id,
              color: player.color,
              timeRemaining: player.color === gameState.currentTurn ? 
                remainingTime : player.timeRemaining,
              byoYomiPeriodsLeft: player.byoYomiPeriodsLeft,
              byoYomiTimeLeft: player.byoYomiTimeLeft,
              isInByoYomi: player.isInByoYomi
            });
          });
          
          // Check for main time timeout
          if (remainingTime <= 0) {
            // Check if player has byo-yomi periods available
            if (gameState.timeControl && gameState.timeControl.byoYomiPeriods > 0) {
              // Switch to byo-yomi
              currentPlayer.isInByoYomi = true;
              currentPlayer.byoYomiPeriodsLeft = gameState.timeControl.byoYomiPeriods;
              currentPlayer.byoYomiTimeLeft = gameState.timeControl.byoYomiTime;
              
              log(`🚨 ENTERING BYO-YOMI: Player ${currentPlayer.id} (${currentPlayer.color}) entered byo-yomi with ${gameState.timeControl.byoYomiPeriods} periods of ${gameState.timeControl.byoYomiTime}s each`);
              
              // Broadcast byo-yomi start
              io.to(gameId).emit('byoYomiStarted', {
                gameId,
                playerId: currentPlayer.id,
                color: currentPlayer.color,
                periodsLeft: gameState.timeControl.byoYomiPeriods,
                timePerPeriod: gameState.timeControl.byoYomiTime
              });
            } else {
              // No byo-yomi available, player times out
              log(`⏰ TIMEOUT: Player ${currentPlayer.id} (${currentPlayer.color}) has no byo-yomi periods available`);
              handlePlayerTimeout(gameState, currentPlayer);
            }
          }
        }
      }
      
      // Periodic full state sync and timer status logging
      const lastSync = gameState.lastFullStateSync || 0;
      if (now - lastSync >= 5000) { // Sync every 5 seconds
        gameState.lastFullStateSync = now;
        
        // Log current timer status for debugging
        const currentPlayerForLog = gameState.players.find(p => p.color === gameState.currentTurn);
        if (currentPlayerForLog) {
          log(`⏰ TIMER STATUS - ${currentPlayerForLog.color}: Main=${currentPlayerForLog.timeRemaining}s, InByoYomi=${currentPlayerForLog.isInByoYomi}, ByoYomiLeft=${currentPlayerForLog.byoYomiTimeLeft}s, Periods=${currentPlayerForLog.byoYomiPeriodsLeft}`);
        }
        
        broadcastGameUpdate(gameId, gameState);
      }
    }
  });

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
          if (passingPlayerForTime.isInByoYomi) {
            // In byo-yomi mode - check if time exceeded the period
            if (timeSpentOnPass <= passingPlayerForTime.byoYomiTimeLeft) {
              // Pass made within byo-yomi time - RESET the byo-yomi period
              passingPlayerForTime.byoYomiTimeLeft = gameState.timeControl.byoYomiTime;
              log(`🔄 BYO-YOMI RESET (PASS) - Player ${passingPlayerForTime.color} passed in ${timeSpentOnPass}s (within ${passingPlayerForTime.byoYomiTimeLeft}s limit), period reset to ${gameState.timeControl.byoYomiTime}s`);
            } else {
              // Time exceeded - consume a period
              if (passingPlayerForTime.byoYomiPeriodsLeft > 1) {
                passingPlayerForTime.byoYomiPeriodsLeft -= 1;
                passingPlayerForTime.byoYomiTimeLeft = gameState.timeControl.byoYomiTime;
                log(`⏳ BYO-YOMI PERIOD USED (PASS) - Player ${passingPlayerForTime.color} exceeded time (${timeSpentOnPass}s), used one period, ${passingPlayerForTime.byoYomiPeriodsLeft} periods remaining`);
              } else {
                // No more periods - player times out
                log(`💀 TIMEOUT (PASS) - Player ${passingPlayerForTime.color} exceeded final byo-yomi period (${timeSpentOnPass}s > ${passingPlayerForTime.byoYomiTimeLeft}s)`);
                handlePlayerTimeout(gameState, passingPlayerForTime);
                return; // Exit early, game is over
              }
            }
          } else {
            // In main time, deduct from main time
            const newMainTime = Math.max(0, passingPlayerForTime.timeRemaining - timeSpentOnPass);
            passingPlayerForTime.timeRemaining = newMainTime;
            log(`⏰ TIME DEDUCTED (PASS) - Player ${passingPlayerForTime.color} spent ${timeSpentOnPass}s from main time, ${newMainTime}s remaining`);
            
            // Check if main time expired and player should enter byo-yomi
            if (newMainTime <= 0 && gameState.timeControl && gameState.timeControl.byoYomiPeriods > 0) {
              passingPlayerForTime.isInByoYomi = true;
              passingPlayerForTime.byoYomiPeriodsLeft = gameState.timeControl.byoYomiPeriods;
              passingPlayerForTime.byoYomiTimeLeft = gameState.timeControl.byoYomiTime;
              log(`🚨 ENTERING BYO-YOMI (PASS): Player ${passingPlayerForTime.color} entered byo-yomi with ${gameState.timeControl.byoYomiPeriods} periods`);
            } else if (newMainTime <= 0) {
              // No byo-yomi available - player times out
              log(`💀 TIMEOUT (PASS) - Player ${passingPlayerForTime.color} exceeded main time with no byo-yomi available`);
              handlePlayerTimeout(gameState, passingPlayerForTime);
              return; // Exit early, game is over
            }
          }
        }
      
      // Reset timer for the next move
      gameState.lastMoveTime = Date.now();
      
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
          
          log(`Game ${gameId} has transitioned to scoring phase after two consecutive passes.`);
        }
      }
      
      // If client explicitly signals this is an end game move, ensure scoring state
      if (endGame) {
        gameState.status = 'scoring';
        gameState.deadStones = gameState.deadStones || []; // Ensure deadStones array exists
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

  // Handle player leaving
  socket.on('leaveGame', ({ gameId, playerId }) => {
    log(`Player ${playerId} leaving game ${gameId}`);
    
    // Leave the socket room
    socket.leave(gameId);
    socketToGame.delete(socket.id);
    
    // Notify other players
    socket.to(gameId).emit('playerLeft', {
      gameId,
      playerId
    });
    
    // Check if there are any players left in the game room
    const room = io.sockets.adapter.rooms.get(gameId);
    const clientsCount = room ? room.size : 0;
    
    log(`Game ${gameId} has ${clientsCount} clients remaining after player left`);
    
    // If no players left in the room, remove the game immediately
    if (!room || clientsCount === 0) {
      log(`No players remaining in game ${gameId}, removing it immediately`);
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
      // Add undo request to game state
      gameState.undoRequest = {
        requestedBy: playerId,
        moveIndex
      };
      
      // Store updated game state
      activeGames.set(gameId, gameState);
      
      // Use the new broadcast function for move updates
      broadcastGameUpdate(gameId, gameState);
    }
  });

  // Handle undo response
  socket.on('respondToUndoRequest', ({ gameId, playerId, accepted, moveIndex }) => {
    log(`Player ${playerId} ${accepted ? 'accepted' : 'rejected'} undo request in game ${gameId}`);
    
    const gameState = activeGames.get(gameId);
    if (gameState) {
      if (accepted) {
        // Revert to the requested move index
        const historyToKeep = gameState.history.slice(0, moveIndex);
        
        // Reset board state
        let stones = [];
        
        // Add handicap stones first if any
        if (historyToKeep.length === 0 && gameState.currentTurn === 'white' && 
            gameState.board.stones.some(s => s.color === 'black')) {
          stones = gameState.board.stones.filter(s => s.color === 'black');
        } else {
          // Replay history to create the board state
          let currentTurn = 'black';
          
          historyToKeep.forEach(move => {
            if (!move.pass) {
              stones.push({
                position: move,
                color: currentTurn
              });
              currentTurn = currentTurn === 'black' ? 'white' : 'black';
            } else {
              currentTurn = currentTurn === 'black' ? 'white' : 'black';
            }
          });
        }
        
        // Calculate next turn
        const nextTurn = historyToKeep.length === 0 ? 
          (gameState.board.stones.some(s => s.color === 'black') ? 'white' : 'black') :
          (historyToKeep.length % 2 === 0 ? 'black' : 'white');
        
        // Update game state
        gameState.board.stones = stones;
        gameState.currentTurn = nextTurn;
        gameState.history = historyToKeep;
      }
      
      // Clear the undo request
      gameState.undoRequest = undefined;
      
      // Store updated game state
      activeGames.set(gameId, gameState);
      
      // Use the new broadcast function for move updates
      broadcastGameUpdate(gameId, gameState);
    }
  });
});

// Route to check server status
app.get('/', (req, res) => {
  res.send('Socket server is running');
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  log(`Socket server listening on port ${PORT}`);
});

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