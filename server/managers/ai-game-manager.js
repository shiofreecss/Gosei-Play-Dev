const KataGoCPUEngine = require('../engines/katago-cpu');
const { v4: uuidv4 } = require('uuid');

class AIGameManager {
  constructor() {
    this.aiPlayers = new Map(); // gameId -> AI engine instance
    this.aiGames = new Set(); // Track which games have AI players
    this.pendingAIMoves = new Map(); // gameId -> promise
    
    console.log('🤖 AI Game Manager initialized');
  }

  isAIGame(gameState) {
    return gameState.players.some(player => player.isAI);
  }

  hasAIPlayer(gameState, color) {
    return gameState.players.some(player => player.color === color && player.isAI);
  }

  getAIPlayer(gameState, color) {
    return gameState.players.find(player => player.color === color && player.isAI);
  }

  getHumanPlayer(gameState) {
    return gameState.players.find(player => !player.isAI);
  }

  async createAIGame(gameState, humanPlayer, aiLevel = 'normal') {
    try {
      console.log(`🤖 Creating AI game ${gameState.id} for human player ${humanPlayer.username}`);
      
      // Check board size compatibility
      if (gameState.board.size > 19) {
        throw new Error(`Board size ${gameState.board.size}x${gameState.board.size} not supported for AI games (maximum 19x19)`);
      }
      
      // Determine AI settings based on level and board size
      const aiSettings = this.getAISettings(aiLevel, gameState.board.size);
      console.log(`🎯 AI settings for ${gameState.board.size}x${gameState.board.size} ${aiLevel}: ${aiSettings.maxVisits} visits, ${aiSettings.maxTime}s time, ${aiSettings.threads} threads`);
      
      // Create AI player
      const aiPlayer = {
        id: `ai_${uuidv4()}`,
        username: `KataGo (${aiLevel})`,
        color: humanPlayer.color === 'black' ? 'white' : 'black',
        isAI: true,
        aiLevel: aiLevel,
        timeRemaining: gameState.timeControl ? gameState.timeControl.timeControl * 60 : 0,
        byoYomiPeriodsLeft: gameState.timeControl ? gameState.timeControl.byoYomiPeriods : 0,
        byoYomiTimeLeft: gameState.timeControl ? gameState.timeControl.byoYomiTime : 0,
        isInByoYomi: false
      };

      // Add AI player to the game
      gameState.players.push(aiPlayer);
      gameState.aiLevel = aiLevel;
      
      // Create KataGo engine instance
      const engine = new KataGoCPUEngine({
        boardSize: gameState.board.size,
        ...aiSettings
      });

      this.aiPlayers.set(gameState.id, engine);
      this.aiGames.add(gameState.id);

      // Initialize the engine
      await engine.initialize();
      
      console.log(`✅ AI game created: Human (${humanPlayer.color}) vs KataGo (${aiPlayer.color})`);
      return aiPlayer;
      
    } catch (error) {
      console.error(`❌ Failed to create AI game: ${error.message}`);
      throw error;
    }
  }

  getAISettings(aiLevel, boardSize = 9) {
    // Base settings for different difficulty levels
    const baseSettings = {
      'easy': {
        maxVisits: 50,
        maxTime: 1.0,
        threads: 1
      },
      'normal': {
        maxVisits: 100,
        maxTime: 3.0,
        threads: 1
      },
      'hard': {
        maxVisits: 200,
        maxTime: 5.0,
        threads: 2
      },
      'pro': {
        maxVisits: 400,
        maxTime: 8.0,
        threads: 2
      }
    };

    const settings = baseSettings[aiLevel] || baseSettings['normal'];
    
    // Adjust settings based on board size for performance
    const sizeMultiplier = this.getBoardSizeMultiplier(boardSize);
    
    return {
      maxVisits: Math.floor(settings.maxVisits * sizeMultiplier.visits),
      maxTime: settings.maxTime * sizeMultiplier.time,
      threads: settings.threads
    };
  }

  getBoardSizeMultiplier(boardSize) {
    // Performance multipliers for different board sizes
    // Larger boards need more time and visits for good play
    switch (boardSize) {
      case 9:
        return { visits: 1.0, time: 1.0 }; // Optimal performance
      case 13:
        return { visits: 0.8, time: 1.5 }; // Good performance
      case 15:
        return { visits: 0.7, time: 2.0 }; // Decent performance
      case 19:
        return { visits: 0.5, time: 3.0 }; // Slower but playable
      default:
        // For other sizes, interpolate based on area
        const area = boardSize * boardSize;
        const ratio = area / (9 * 9); // Compare to 9x9
        return { 
          visits: Math.max(0.3, 1.0 / Math.sqrt(ratio)), 
          time: Math.min(5.0, 1.0 + Math.log(ratio)) 
        };
    }
  }

  async syncGameState(gameState) {
    const engine = this.aiPlayers.get(gameState.id);
    if (!engine) return;

    try {
      // Clear the board and replay all moves
      await engine.clearBoard();
      
      // Replay all moves from history
      for (const move of gameState.history) {
        if (move.position) {
          await engine.playMove(move.color, move.position);
        }
      }
      
      console.log(`🔄 AI engine synced with game state (${gameState.history.length} moves)`);
    } catch (error) {
      console.error(`❌ Failed to sync AI engine: ${error.message}`);
    }
  }

  async makeAIMove(gameState, color) {
    const engine = this.aiPlayers.get(gameState.id);
    if (!engine) {
      throw new Error('AI engine not found for game');
    }

    // Prevent multiple simultaneous AI moves
    if (this.pendingAIMoves.has(gameState.id)) {
      console.log(`⏳ AI move already in progress for game ${gameState.id}`);
      return await this.pendingAIMoves.get(gameState.id);
    }

    const movePromise = this._generateAIMove(gameState, color, engine);
    this.pendingAIMoves.set(gameState.id, movePromise);

    try {
      const result = await movePromise;
      return result;
    } finally {
      this.pendingAIMoves.delete(gameState.id);
    }
  }

  async _generateAIMove(gameState, color, engine) {
    try {
      console.log(`🤖 AI (${color}) thinking...`);
      
      // Track AI thinking time
      const thinkingStartTime = Date.now();
      
      // Ensure engine is synced with current game state
      await this.syncGameState(gameState);
      
      // Generate the move
      const aiMove = await engine.generateMove(color);
      
      // Calculate actual thinking time
      const thinkingEndTime = Date.now();
      const thinkingTimeSeconds = Math.max(1, Math.floor((thinkingEndTime - thinkingStartTime) / 1000));
      
      if (!aiMove) {
        console.log(`🤖 AI (${color}) decided to pass`);
        return { type: 'pass', color, thinkingTime: thinkingTimeSeconds };
      }

      // Validate the move
      if (!this.isValidMove(gameState, aiMove)) {
        console.log(`⚠️  AI generated invalid move at (${aiMove.x}, ${aiMove.y}), trying again...`);
        console.log(`   Board size: ${gameState.board.size}, occupied positions: ${gameState.board.stones.length}`);
        console.log(`   KO position: ${gameState.koPosition ? `(${gameState.koPosition.x}, ${gameState.koPosition.y})` : 'none'}`);
        
        // Try one more time
        await this.syncGameState(gameState);
        const retryMove = await engine.generateMove(color);
        
        if (!retryMove || !this.isValidMove(gameState, retryMove)) {
          console.log(`🤖 AI (${color}) fallback to pass after retry failed`);
          return { 
            type: 'pass', 
            color,
            playerId: this.getAIPlayer(gameState, color).id,
            thinkingTime: thinkingTimeSeconds
          };
        }
        
        return {
          type: 'move',
          position: retryMove,
          color,
          playerId: this.getAIPlayer(gameState, color).id,
          thinkingTime: thinkingTimeSeconds
        };
      }

      console.log(`🎯 AI (${color}) generated move: (${aiMove.x}, ${aiMove.y}) in ${thinkingTimeSeconds}s`);
      
      return {
        type: 'move',
        position: aiMove,
        color,
        playerId: this.getAIPlayer(gameState, color).id,
        thinkingTime: thinkingTimeSeconds
      };
      
    } catch (error) {
      console.error(`❌ AI move generation failed: ${error.message}`);
      
      // Check if it's a board size mismatch error
      if (error.message.includes('board size mismatch')) {
        console.log(`🔧 Board size mismatch detected, forcing full engine reset...`);
        
        try {
          // Force a complete engine reset
          await engine.shutdown();
          await engine.initialize();
          await this.syncGameState(gameState);
          
          // Try one more time after reset
          const resetMove = await engine.generateMove(color);
          
          if (resetMove && this.isValidMove(gameState, resetMove)) {
            console.log(`✅ AI move successful after engine reset: (${resetMove.x}, ${resetMove.y})`);
            return {
              type: 'move',
              position: resetMove,
              color,
              playerId: this.getAIPlayer(gameState, color).id,
              thinkingTime: thinkingTimeSeconds
            };
          }
        } catch (resetError) {
          console.error(`❌ Engine reset failed: ${resetError.message}`);
        }
      }
      
      // Fallback to pass
      return { 
        type: 'pass', 
        color,
        playerId: this.getAIPlayer(gameState, color).id,
        thinkingTime: thinkingTimeSeconds || 1
      };
    }
  }

  isValidMove(gameState, position) {
    // Check if position is within bounds
    if (position.x < 0 || position.x >= gameState.board.size || 
        position.y < 0 || position.y >= gameState.board.size) {
      console.log(`   ❌ Out of bounds: (${position.x}, ${position.y}) for ${gameState.board.size}x${gameState.board.size} board`);
      return false;
    }

    // Check if position is already occupied
    const isOccupied = gameState.board.stones.some(
      stone => stone.position.x === position.x && stone.position.y === position.y
    );
    
    if (isOccupied) {
      console.log(`   ❌ Position occupied: (${position.x}, ${position.y})`);
      return false;
    }

    // Check for KO rule violation
    if (gameState.koPosition && 
        position.x === gameState.koPosition.x && 
        position.y === gameState.koPosition.y) {
      console.log(`   ❌ KO rule violation: (${position.x}, ${position.y})`);
      return false;
    }

    console.log(`   ✅ Valid move: (${position.x}, ${position.y})`);
    return true;
  }

  async handleHumanMove(gameState, moveData) {
    const engine = this.aiPlayers.get(gameState.id);
    if (!engine) return;

    try {
      // Update AI engine with the human move
      await engine.playMove(moveData.color, moveData.position);
      console.log(`🔄 AI engine updated with human move: ${moveData.color} (${moveData.position.x}, ${moveData.position.y})`);
    } catch (error) {
      console.error(`❌ Failed to update AI engine with human move: ${error.message}`);
      // Try to resync the entire game state
      await this.syncGameState(gameState);
    }
  }

  async getAIScore(gameState) {
    const engine = this.aiPlayers.get(gameState.id);
    if (!engine) return null;

    try {
      await this.syncGameState(gameState);
      const score = await engine.getScore();
      return score;
    } catch (error) {
      console.error(`❌ Failed to get AI score: ${error.message}`);
      return null;
    }
  }

  async cleanupGame(gameId) {
    const engine = this.aiPlayers.get(gameId);
    if (engine) {
      engine.shutdown();
      this.aiPlayers.delete(gameId);
    }
    
    this.aiGames.delete(gameId);
    this.pendingAIMoves.delete(gameId);
    
    console.log(`🧹 Cleaned up AI game ${gameId}`);
  }

  // Get all active AI games for monitoring
  getActiveAIGames() {
    return Array.from(this.aiGames);
  }

  // Check if AI should make a move
  shouldAIMakeMove(gameState) {
    if (!this.isAIGame(gameState)) return false;
    if (gameState.status !== 'playing') return false;
    
    const currentPlayer = gameState.players.find(p => p.color === gameState.currentTurn);
    return currentPlayer && currentPlayer.isAI;
  }

  // Shutdown all AI engines
  shutdown() {
    console.log('🛑 Shutting down AI Game Manager...');
    
    for (const [gameId, engine] of this.aiPlayers.entries()) {
      engine.shutdown();
    }
    
    this.aiPlayers.clear();
    this.aiGames.clear();
    this.pendingAIMoves.clear();
    
    console.log('✅ AI Game Manager shutdown complete');
  }
}

module.exports = AIGameManager; 