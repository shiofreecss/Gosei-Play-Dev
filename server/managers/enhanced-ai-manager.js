const KataGoCPUEngine = require('../engines/katago-cpu');
const NetworkSelector = require('../katago/network-selector');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

class EnhancedAIManager {
  constructor() {
    this.aiPlayers = new Map(); // gameId -> AI engine instance
    this.aiGames = new Set(); // Track which games have AI players
    this.pendingAIMoves = new Map(); // gameId -> promise
    this.networkSelector = new NetworkSelector();
    
    console.log('🤖 Enhanced AI Manager initialized with network selection');
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

  /**
   * Create AI game with network selection based on human player skill
   * @param {Object} gameState - Game state
   * @param {Object} humanPlayer - Human player object
   * @param {string} humanPlayerRank - Human player rank (e.g., '5k', '2d')
   * @param {string} aiStrength - AI strength: 'easy', 'equal', 'hard' (relative to human)
   */
  async createAIGame(gameState, humanPlayer, humanPlayerRank = '5k', aiStrength = 'equal') {
    try {
      console.log(`🤖 Creating AI game for ${humanPlayerRank} player with ${aiStrength} AI`);
      
      const networkConfig = this.selectNetworkForPlayer(humanPlayerRank, aiStrength);
      
      if (!networkConfig.exists) {
        throw new Error(`Required network not found. Please run download-networks.bat`);
      }
      
      const aiPlayer = {
        id: `ai_${uuidv4()}`,
        username: `KataGo (${networkConfig.network.level})`,
        color: humanPlayer.color === 'black' ? 'white' : 'black',
        isAI: true,
        aiNetwork: networkConfig.network,
        timeRemaining: gameState.timeControl ? gameState.timeControl.timeControl * 60 : 0
      };

      gameState.players.push(aiPlayer);
      gameState.aiNetwork = networkConfig.network;
      
      const computationalSettings = this.getComputationalSettings(networkConfig.network, gameState.board.size);
      
      // Convert .txt.gz path to .txt path for KataGo
      const modelPath = networkConfig.path.replace('.txt.gz', '.txt');
      
      const engine = new KataGoCPUEngine({
        boardSize: gameState.board.size,
        modelPath: modelPath,
        ...computationalSettings
      });

      this.aiPlayers.set(gameState.id, engine);
      this.aiGames.add(gameState.id);
      await engine.initialize();
      
      console.log(`✅ AI game created: ${networkConfig.network.level} vs ${humanPlayerRank}`);
      return aiPlayer;
      
    } catch (error) {
      console.error(`❌ Failed to create AI game: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create AI game with direct network selection
   * @param {Object} gameState - Game state
   * @param {Object} humanPlayer - Human player object
   * @param {string} networkId - Network ID in format "category-elo" (e.g., "normal-1539.5")
   */
  async createAIGameWithDirectNetwork(gameState, humanPlayer, networkId) {
    try {
      console.log(`🤖 Creating AI game with direct network selection: ${networkId}`);
      
      const networkConfig = this.getNetworkById(networkId);
      
      if (!networkConfig) {
        throw new Error(`Network not found: ${networkId}`);
      }
      
      if (!networkConfig.exists) {
        throw new Error(`Network file not found: ${networkConfig.network.file}. Please run download-networks.bat`);
      }
      
      const aiPlayer = {
        id: `ai_${uuidv4()}`,
        username: `KataGo (${networkConfig.network.level})`,
        color: humanPlayer.color === 'black' ? 'white' : 'black',
        isAI: true,
        aiNetwork: networkConfig.network,
        timeRemaining: gameState.timeControl ? gameState.timeControl.timeControl * 60 : 0,
        byoYomiPeriodsLeft: gameState.timeControl ? gameState.timeControl.byoYomiPeriods : 0,
        byoYomiTimeLeft: gameState.timeControl ? gameState.timeControl.byoYomiTime : 0,
        isInByoYomi: false
      };

      gameState.players.push(aiPlayer);
      gameState.aiNetwork = networkConfig.network;
      
      const computationalSettings = this.getComputationalSettings(networkConfig.network, gameState.board.size);
      
      // Convert .txt.gz path to .txt path for KataGo
      const modelPath = networkConfig.path.replace('.txt.gz', '.txt');
      
      const engine = new KataGoCPUEngine({
        boardSize: gameState.board.size,
        modelPath: modelPath,
        ...computationalSettings
      });

      this.aiPlayers.set(gameState.id, engine);
      this.aiGames.add(gameState.id);
      await engine.initialize();
      
      console.log(`✅ AI game created with direct network: ${networkConfig.network.level} (${networkConfig.network.elo} Elo)`);
      return aiPlayer;
      
    } catch (error) {
      console.error(`❌ Failed to create AI game with direct network: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get network configuration by network ID
   * @param {string} networkId - Network ID in format "category-elo"
   * @returns {Object|null} Network configuration or null if not found
   */
  getNetworkById(networkId) {
    try {
      const [category, eloStr] = networkId.split('-');
      const elo = parseFloat(eloStr);
      
      if (!category || isNaN(elo)) {
        console.error(`Invalid network ID format: ${networkId}`);
        return null;
      }
      
      // Find the network in the appropriate category
      const categoryNetworks = this.networkSelector.networks[category];
      if (!categoryNetworks) {
        console.error(`Category not found: ${category}`);
        return null;
      }
      
      const network = categoryNetworks.find(n => Math.abs(n.elo - elo) < 0.1);
      if (!network) {
        console.error(`Network not found in category ${category} with elo ${elo}`);
        return null;
      }
      
      const networkPath = this.networkSelector.getNetworkPath(category, network.file);
      const exists = this.networkSelector.checkNetworkExists(category, network.file);
      
      return { network, category, path: networkPath, exists };
    } catch (error) {
      console.error(`Error getting network by ID ${networkId}:`, error);
      return null;
    }
  }

  /**
   * Select appropriate network based on human player rank and desired AI strength
   */
  selectNetworkForPlayer(humanPlayerRank, aiStrength = 'equal') {
    const baseNetwork = this.networkSelector.getNetworkByRank(humanPlayerRank);
    if (!baseNetwork) {
      throw new Error(`No network found for rank: ${humanPlayerRank}`);
    }
    
    let targetNetwork = baseNetwork;
    
    switch (aiStrength) {
      case 'easy':
        targetNetwork = this.getEasierNetwork(baseNetwork);
        break;
      case 'hard':
        targetNetwork = this.getHarderNetwork(baseNetwork);
        break;
    }
    
    const category = this.networkSelector.findNetworkCategory(targetNetwork);
    const networkPath = this.networkSelector.getNetworkPath(category, targetNetwork.file);
    const exists = this.networkSelector.checkNetworkExists(category, targetNetwork.file);
    
    return { network: targetNetwork, category, path: networkPath, exists };
  }

  /**
   * Get a network that's easier than the given network
   */
  getEasierNetwork(baseNetwork) {
    const allNetworks = [
      ...this.networkSelector.networks.beginner,
      ...this.networkSelector.networks.normal,
      ...this.networkSelector.networks.dan,
      ...this.networkSelector.networks.pro
    ].sort((a, b) => a.elo - b.elo);
    
    const currentIndex = allNetworks.findIndex(n => n.file === baseNetwork.file);
    const easierIndex = Math.max(0, currentIndex - 2);
    return allNetworks[easierIndex];
  }

  /**
   * Get a network that's harder than the given network
   */
  getHarderNetwork(baseNetwork) {
    const allNetworks = [
      ...this.networkSelector.networks.beginner,
      ...this.networkSelector.networks.normal,
      ...this.networkSelector.networks.dan,
      ...this.networkSelector.networks.pro
    ].sort((a, b) => a.elo - b.elo);
    
    const currentIndex = allNetworks.findIndex(n => n.file === baseNetwork.file);
    const harderIndex = Math.min(allNetworks.length - 1, currentIndex + 2);
    return allNetworks[harderIndex];
  }

  /**
   * Get computational settings based on network strength and board size
   */
  getComputationalSettings(network, boardSize = 9) {
    let baseSettings;
    if (network.elo < 1000) {
      baseSettings = { maxVisits: 50, maxTime: 1.0, threads: 1 };
    } else if (network.elo < 1500) {
      baseSettings = { maxVisits: 100, maxTime: 2.0, threads: 1 };
    } else if (network.elo < 2000) {
      baseSettings = { maxVisits: 200, maxTime: 3.0, threads: 1 };
    } else if (network.elo < 2500) {
      baseSettings = { maxVisits: 300, maxTime: 5.0, threads: 2 };
    } else {
      baseSettings = { maxVisits: 500, maxTime: 8.0, threads: 2 };
    }
    
    const sizeMultiplier = this.getBoardSizeMultiplier(boardSize);
    
    return {
      maxVisits: Math.floor(baseSettings.maxVisits * sizeMultiplier.visits),
      maxTime: baseSettings.maxTime * sizeMultiplier.time,
      threads: baseSettings.threads
    };
  }

  getBoardSizeMultiplier(boardSize) {
    switch (boardSize) {
      case 9: return { visits: 1.0, time: 1.0 };
      case 13: return { visits: 0.8, time: 1.5 };
      case 19: return { visits: 0.5, time: 3.0 };
      default: return { visits: 0.7, time: 2.0 };
    }
  }

  /**
   * List available AI opponents for a human player rank
   */
  getAvailableOpponents(humanPlayerRank) {
    const baseNetwork = this.networkSelector.getNetworkByRank(humanPlayerRank);
    if (!baseNetwork) {
      return [];
    }
    
    const opponents = [];
    
    // Add easy opponent
    const easyNetwork = this.getEasierNetwork(baseNetwork);
    const easyCategory = this.networkSelector.findNetworkCategory(easyNetwork);
    if (this.networkSelector.checkNetworkExists(easyCategory, easyNetwork.file)) {
      opponents.push({
        strength: 'easy',
        network: easyNetwork,
        description: `Weaker opponent (${easyNetwork.level})`
      });
    }
    
    // Add equal opponent
    const baseCategory = this.networkSelector.findNetworkCategory(baseNetwork);
    if (this.networkSelector.checkNetworkExists(baseCategory, baseNetwork.file)) {
      opponents.push({
        strength: 'equal',
        network: baseNetwork,
        description: `Equal strength (${baseNetwork.level})`
      });
    }
    
    // Add hard opponent
    const hardNetwork = this.getHarderNetwork(baseNetwork);
    const hardCategory = this.networkSelector.findNetworkCategory(hardNetwork);
    if (this.networkSelector.checkNetworkExists(hardCategory, hardNetwork.file)) {
      opponents.push({
        strength: 'hard',
        network: hardNetwork,
        description: `Stronger opponent (${hardNetwork.level})`
      });
    }
    
    return opponents;
  }

  // Rest of the methods remain the same as original AIGameManager
  async syncGameState(gameState) {
    const engine = this.aiPlayers.get(gameState.id);
    if (!engine) return;

    try {
      await engine.clearBoard();
      
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
    if (!engine) throw new Error('AI engine not found');

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
    // Track AI thinking time - define outside try block
    const thinkingStartTime = Date.now();
    let thinkingTimeSeconds = 1; // Default fallback value
    
    try {
      console.log(`🤖 AI (${color}) thinking...`);
      
      // Ensure engine is synced with current game state
      await this.syncGameState(gameState);
      
      // Generate the move
      const aiMove = await engine.generateMove(color);
      
      // Calculate actual thinking time
      const thinkingEndTime = Date.now();
      thinkingTimeSeconds = Math.max(1, Math.floor((thinkingEndTime - thinkingStartTime) / 1000));
      
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
        thinkingTime: thinkingTimeSeconds
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

  getActiveAIGames() {
    return Array.from(this.aiGames);
  }

  shouldAIMakeMove(gameState) {
    if (!this.isAIGame(gameState)) return false;
    if (gameState.status !== 'playing') return false;
    
    const currentPlayer = gameState.players.find(p => p.color === gameState.currentTurn);
    return currentPlayer && currentPlayer.isAI;
  }

  shutdown() {
    console.log('🛑 Shutting down Enhanced AI Game Manager...');
    for (const [gameId, engine] of this.aiPlayers) {
      engine.shutdown();
    }
    this.aiPlayers.clear();
    this.aiGames.clear();
    this.pendingAIMoves.clear();
  }
}

module.exports = EnhancedAIManager; 