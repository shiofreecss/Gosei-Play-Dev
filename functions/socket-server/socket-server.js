const express = require('express');
const serverless = require('serverless-http');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

// Store active games in memory
const activeGames = new Map();
// Map socket IDs to game IDs for quick lookup
const socketToGame = new Map();
// Debug flag
const DEBUG = true;

// Simple logging function
function log(message) {
  if (DEBUG) {
    console.log(`[${new Date().toISOString()}] ${message}`);
  }
}

// Setup socket.io handlers
const setupSocketIO = (io) => {
  io.on('connection', (socket) => {
    log(`New client connected: ${socket.id}`);

    // Create a new game
    socket.on('createGame', ({ gameState, playerId }) => {
      log(`Creating game: ${gameState.id}, Code: ${gameState.code}`);
      
      // Store the game state
      activeGames.set(gameState.id, gameState);
      
      // Join the socket to the game's room
      socket.join(gameState.id);
      socketToGame.set(socket.id, gameState.id);
      
      log(`Player ${playerId} created and joined game ${gameState.id}`);
      
      // Send an acknowledgment back to the client
      socket.emit('gameCreated', { success: true, gameId: gameState.id });
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
        // If this is not a reconnect, update the game state
        if (!isReconnect) {
          // Find the player in the game state
          const playerIndex = gameState.players.findIndex(p => p.id === playerId);
          
          if (playerIndex === -1) {
            // Add new player if not found
            gameState.players.push({
              id: playerId,
              username,
              color: 'white' // Second player is white
            });
            
            // If we now have 2 players, set status to playing
            if (gameState.players.length >= 2) {
              log(`Game ${gameId} now has 2 players, changing status to playing`);
              gameState.status = 'playing';
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
          
          // Broadcast updated game state to ALL clients in the room
          io.to(gameId).emit('gameState', gameState);
          log(`Broadcasting updated game state to all clients in room ${gameId}`);
        } else {
          // Just send current game state to the reconnecting client
          socket.emit('gameState', gameState);
          log(`Sending game state to reconnecting player ${playerId}`);
        }
        
        // Send join acknowledgment
        socket.emit('joinedGame', { 
          success: true, 
          gameId, 
          playerId,
          numPlayers: gameState.players.length,
          status: gameState.status
        });
        
        // Send chat history if available
        if (gameState.chatMessages && gameState.chatMessages.length > 0) {
          log(`Sending ${gameState.chatMessages.length} chat messages to player ${playerId}`);
          socket.emit('chatHistory', {
            gameId,
            messages: gameState.chatMessages
          });
        }
        
        log(`Game ${gameId} now has ${gameState.players.length} players, status: ${gameState.status}`);
      } else {
        log(`Game ${gameId} not found in active games`);
        socket.emit('error', `Game ${gameId} not found`);
      }
    });

    // Handle a move
    socket.on('makeMove', ({ gameId, position, color, playerId }) => {
      log(`Player ${playerId} made move at (${position.x}, ${position.y}) in game ${gameId}`);
      
      // Update the game state if it exists in memory
      const gameState = activeGames.get(gameId);
      if (gameState) {
        // First, check if the move is valid (not occupied)
        const isOccupied = gameState.board.stones.some(
          stone => stone.position.x === position.x && stone.position.y === position.y
        );
        
        if (isOccupied) {
          log(`Invalid move - position already occupied`);
          socket.emit('error', 'Invalid move - position already occupied');
          return;
        }
        
        // Add the stone
        const updatedStones = [...gameState.board.stones, {
          position,
          color
        }];
        
        // Capture opponent stones that have no liberties
        const capturedStones = captureDeadStones(gameState, updatedStones, position, color);
        
        // Log capture info 
        if (capturedStones.capturedCount > 0) {
          log(`Captured ${capturedStones.capturedCount} stones from ${color === 'black' ? 'white' : 'black'}`);
        }
        
        // Update game state
        gameState.board.stones = capturedStones.remainingStones;
        gameState.currentTurn = color === 'black' ? 'white' : 'black';
        gameState.history.push(position);
        
        // Update captured stones count
        if (!gameState.capturedStones) {
          gameState.capturedStones = { black: 0, white: 0 };
        }
        
        // Capturing player gets the points
        if (capturedStones.capturedCount > 0) {
          gameState.capturedStones[color] += capturedStones.capturedCount;
          log(`Updated captured stones count. ${color} now has ${gameState.capturedStones[color]} captures`);
        }
        
        // Store updated game state
        activeGames.set(gameId, gameState);
        
        // Broadcast the move to ALL clients in the room IMMEDIATELY
        io.to(gameId).emit('moveMade', {
          gameId,
          position,
          color,
          playerId,
          capturedCount: capturedStones.capturedCount
        });
        log(`Broadcasting move to all clients in room ${gameId}`);
        
        // Also broadcast the full game state after a slight delay
        setTimeout(() => {
          io.to(gameId).emit('gameState', gameState);
          log(`Broadcasting full game state to all clients in room ${gameId}`);
        }, 200);
      }
    });

    // Handle a pass
    socket.on('passTurn', ({ gameId, color, playerId }) => {
      log(`Player ${playerId} passed their turn in game ${gameId}`);
      
      // Update the game state if it exists in memory
      const gameState = activeGames.get(gameId);
      if (gameState) {
        // Update turn
        gameState.currentTurn = color === 'black' ? 'white' : 'black';
        
        // Add pass to history
        gameState.history.push({ pass: true });
        
        // Check if this is the second consecutive pass (game end)
        const lastMove = gameState.history.length >= 2 ? gameState.history[gameState.history.length - 2] : null;
        
        if (lastMove && lastMove.pass) {
          log(`Second consecutive pass detected. Ending game ${gameId}`);
          gameState.status = 'finished';
        }
        
        // Store updated game state
        activeGames.set(gameId, gameState);
        
        // Broadcast updated game state to all clients in the room
        io.to(gameId).emit('gameState', gameState);
        
        // Also emit a specific "player passed" event
        io.to(gameId).emit('playerPassed', {
          gameId,
          playerId,
          color
        });
      }
    });

    // Handle chat messages
    socket.on('chatMessage', ({ gameId, playerId, username, message }) => {
      log(`Chat message from ${username} (${playerId}) in game ${gameId}: ${message}`);
      
      // Validate incoming message data
      if (!gameId || !playerId || !username || !message) {
        log(`Invalid chat message data received from ${socket.id}`);
        socket.emit('error', 'Invalid chat message: Missing required fields');
        return;
      }
      
      // Check if the game exists
      const gameState = activeGames.get(gameId);
      if (!gameState) {
        log(`Chat message for non-existent game ${gameId}`);
        socket.emit('error', `Cannot send chat: Game ${gameId} not found`);
        return;
      }
      
      // Check if user is part of this game
      const isPlayerInGame = gameState.players.some(p => p.id === playerId);
      if (!isPlayerInGame) {
        log(`Unauthorized chat message from ${playerId} who is not in game ${gameId}`);
        socket.emit('error', 'Cannot send chat: You are not a participant in this game');
        return;
      }
      
      // Create message object with timestamp
      const messageData = {
        gameId,
        playerId,
        username,
        message,
        timestamp: Date.now()
      };
      
      // Store chat messages with the game state (optional, limited to recent 50 messages)
      if (!gameState.chatMessages) {
        gameState.chatMessages = [];
      }
      gameState.chatMessages.push(messageData);
      
      // Limit stored chat history to 50 most recent messages
      if (gameState.chatMessages.length > 50) {
        gameState.chatMessages = gameState.chatMessages.slice(-50);
      }
      
      // Save updated game state
      activeGames.set(gameId, gameState);
      
      // Broadcast the message to all clients in the game room
      io.to(gameId).emit('chatMessageReceived', messageData);
      
      // Log success
      log(`Successfully broadcast chat message to all clients in room ${gameId}`);
    });

    // Player disconnection
    socket.on('disconnect', () => {
      log(`Client disconnected: ${socket.id}`);
      
      // Check if the disconnected socket was in a game
      const gameId = socketToGame.get(socket.id);
      if (gameId) {
        log(`Disconnected socket was in game ${gameId}`);
        
        // Clean up socket-to-game mapping
        socketToGame.delete(socket.id);
        
        // Get the game state
        const gameState = activeGames.get(gameId);
        if (gameState) {
          // Check if there are any players left in the game room
          const roomClients = io.sockets.adapter.rooms.get(gameId);
          const clientsCount = roomClients ? roomClients.size : 0;
          
          log(`Game ${gameId} has ${clientsCount} clients remaining`);
          
          if (clientsCount === 0) {
            // If all players have disconnected, keep the game temporarily (for reconnects)
            // We could set a timeout to eventually clean up the game
            setTimeout(() => {
              // Check again if the room is empty after the timeout
              const room = io.sockets.adapter.rooms.get(gameId);
              if (!room || room.size === 0) {
                log(`Game ${gameId} has been inactive for too long, removing it`);
                activeGames.delete(gameId);
              }
            }, 60 * 60 * 1000); // Keep game for 1 hour (adjust as needed)
          } else {
            // Notify remaining clients about the disconnection
            io.to(gameId).emit('playerDisconnected', { 
              gameId, 
              clientsRemaining: clientsCount
            });
          }
        }
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

    // Game ended
    socket.on('gameEnded', ({ gameId, score }) => {
      log(`Game ${gameId} ended with score: ${JSON.stringify(score)}`);
      
      const gameState = activeGames.get(gameId);
      if (gameState) {
        gameState.status = 'finished';
        gameState.score = score;
        
        // Store the final game state
        activeGames.set(gameId, gameState);
        
        // Broadcast to all clients in the room
        io.to(gameId).emit('gameState', gameState);
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
        
        // Optionally detect likely dead groups nearby
        const autoDetectDeadGroups = connectedGroup.length >= 3; // Only auto-detect for larger groups
        
        let allDeadPositions = [...connectedGroup];
        
        if (autoDetectDeadGroups) {
          // The color of the original group
          const groupColor = stoneAtPos.color;
          
          // Find other groups of the same color that might be dead
          const potentialDeadGroups = [];
          
          // Scan the board for stones of the same color
          gameState.board.stones.forEach(stone => {
            if (stone.color === groupColor) {
              // Skip stones that are already in our selected group
              const isInSelectedGroup = connectedGroup.some(
                pos => pos.x === stone.position.x && pos.y === stone.position.y
              );
              
              if (!isInSelectedGroup) {
                // Check if this stone is in a group with very few liberties (likely dead)
                const stoneGroup = getConnectedGroup(stone.position, gameState.board.stones, gameState.board.size);
                
                // Skip if we've already checked this group
                const alreadyChecked = potentialDeadGroups.some(group => 
                  group.some(pos => 
                    stoneGroup.some(groupPos => groupPos.x === pos.x && groupPos.y === pos.y)
                  )
                );
                
                if (!alreadyChecked) {
                  // Count liberties to check if the group is likely dead
                  const liberties = countLiberties(stoneGroup, gameState.board.stones, gameState.board.size);
                  
                  // Groups with 0-1 liberties are almost certainly dead
                  if (liberties <= 1) {
                    potentialDeadGroups.push(stoneGroup);
                  }
                }
              }
            }
          });
          
          // Add all detected dead group positions
          potentialDeadGroups.forEach(group => {
            allDeadPositions = [...allDeadPositions, ...group];
          });
          
          if (potentialDeadGroups.length > 0) {
            log(`Auto-detected ${potentialDeadGroups.length} additional dead groups`);
          }
        }
        
        // Count how many stones in the group are already marked as dead
        const alreadyMarkedCount = connectedGroup.filter(pos => 
          gameState.deadStones.some(dead => dead.x === pos.x && dead.y === pos.y)
        ).length;
        
        // If more than half are already marked, remove them all
        // Otherwise, add all stones in the group
        if (alreadyMarkedCount > connectedGroup.length / 2) {
          // Remove all stones in the group from dead stones
          gameState.deadStones = gameState.deadStones.filter(deadStone => 
            !allDeadPositions.some(groupPos => groupPos.x === deadStone.x && groupPos.y === deadStone.y)
          );
        } else {
          // Add all stones in the group to dead stones (avoiding duplicates)
          const newDeadStones = allDeadPositions.filter(groupPos => 
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
        
        // Broadcast updated game state to all clients in the room
        io.to(gameId).emit('gameState', gameState);
      }
    });
  });
};

// Helper functions copied from the original server
function getAdjacentPositions(position) {
  return [
    { x: position.x - 1, y: position.y },
    { x: position.x + 1, y: position.y },
    { x: position.x, y: position.y - 1 },
    { x: position.x, y: position.y + 1 }
  ];
}

function isWithinBounds(position, boardSize) {
  return position.x >= 0 && position.x < boardSize && position.y >= 0 && position.y < boardSize;
}

function findStoneAt(position, stones) {
  return stones.find(stone => 
    stone.position.x === position.x && stone.position.y === position.y
  );
}

function getConnectedGroup(position, stones, boardSize) {
  const targetStone = findStoneAt(position, stones);
  if (!targetStone) return [];
  
  const color = targetStone.color;
  const group = [];
  const visited = new Set();
  
  function visit(pos) {
    // Create a unique string key for the position
    const posKey = `${pos.x},${pos.y}`;
    
    // If we've already visited this position, return
    if (visited.has(posKey)) return;
    
    // Mark this position as visited
    visited.add(posKey);
    
    // Find the stone at this position
    const stone = findStoneAt(pos, stones);
    
    // If there's no stone or it's a different color, return
    if (!stone || stone.color !== color) return;
    
    // Add the position to our group
    group.push(pos);
    
    // Visit all adjacent positions
    const adjacent = getAdjacentPositions(pos);
    for (const adjPos of adjacent) {
      if (isWithinBounds(adjPos, boardSize)) {
        visit(adjPos);
      }
    }
  }
  
  // Start the recursive visit from the initial position
  visit(position);
  
  return group;
}

function isEmpty(position, stones) {
  return !stones.some(stone => 
    stone.position.x === position.x && stone.position.y === position.y
  );
}

function countLiberties(group, stones, boardSize) {
  const liberties = new Set();
  
  for (const stone of group) {
    const adjacentPositions = getAdjacentPositions(stone.position);
    
    for (const position of adjacentPositions) {
      // Check if position is within board boundaries
      if (!isWithinBounds(position, boardSize)) continue;
      
      // Check if position is empty (no stone)
      if (isEmpty(position, stones)) {
        // Add this liberty (using a string key for the Set)
        liberties.add(`${position.x},${position.y}`);
      }
    }
  }
  
  return liberties.size;
}

function captureDeadStones(gameState, updatedStones, lastMovePosition, playerColor) {
  const opponentColor = playerColor === 'black' ? 'white' : 'black';
  const boardSize = gameState.board.size;
  let capturedStones = [];
  let capturedCount = 0;
  
  // Check each adjacent position for opponent stones
  const adjacentPositions = getAdjacentPositions(lastMovePosition);
  
  for (const adjPos of adjacentPositions) {
    if (!isWithinBounds(adjPos, boardSize)) continue;
    
    const stoneAtPosition = findStoneAt(adjPos, updatedStones);
    
    // If there's an opponent's stone adjacent to our move
    if (stoneAtPosition && stoneAtPosition.color === opponentColor) {
      // Get the connected group of this stone
      const group = getConnectedGroup(adjPos, updatedStones, boardSize);
      
      // Count liberties of this group
      const liberties = countLiberties(group, updatedStones, boardSize);
      
      // If the group has no liberties, capture it
      if (liberties === 0) {
        // Mark these stones for removal
        capturedStones = [...capturedStones, ...group];
        capturedCount += group.length;
      }
    }
  }
  
  // Remove the captured stones from the board
  const remainingStones = updatedStones.filter(stone => {
    return !capturedStones.some(capturedStone => 
      capturedStone.position.x === stone.position.x && 
      capturedStone.position.y === stone.position.y
    );
  });
  
  return { remainingStones, capturedCount };
}

// Create an HTTP server and wrap with Express handler
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*", // Allow connections from any origin
    methods: ["GET", "POST"]
  }
});

// Set up Socket.IO with the server
setupSocketIO(io);

// For local development
if (process.env.NODE_ENV === 'development') {
  const PORT = process.env.PORT || 3001;
  server.listen(PORT, () => {
    console.log(`Socket.IO server running on port ${PORT}`);
  });
}

// Handle Lambda Events
module.exports.handler = async (event, context) => {
  // This route provides info for health checks
  app.get('/.netlify/functions/socket-server', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });
  
  // Return a Netlify serverless function response
  return serverless(app)(event, context);
}; 