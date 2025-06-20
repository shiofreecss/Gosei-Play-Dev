const EnhancedAIManager = require('../managers/enhanced-ai-manager');

/**
 * AI Game API - Demonstrates how to integrate network selection
 */
class AIGameAPI {
  constructor() {
    this.aiManager = new EnhancedAIManager();
  }

  /**
   * Create AI game endpoint
   * POST /api/ai/create-game
   * Body: {
   *   humanPlayerRank: '5k',    // Human player rank
   *   aiStrength: 'equal',      // 'easy', 'equal', 'hard'
   *   boardSize: 9,             // Board size
   *   humanPlayerColor: 'black' // Human player color
   * }
   */
  async createAIGame(req, res) {
    try {
      const { 
        humanPlayerRank = '5k', 
        aiStrength = 'equal', 
        boardSize = 9, 
        humanPlayerColor = 'black' 
      } = req.body;

      // Validate inputs
      if (!['easy', 'equal', 'hard'].includes(aiStrength)) {
        return res.status(400).json({ error: 'Invalid AI strength. Use: easy, equal, hard' });
      }

      if (![9, 13, 19].includes(boardSize)) {
        return res.status(400).json({ error: 'Invalid board size. Use: 9, 13, 19' });
      }

      // Create game state
      const gameState = {
        id: `game_${Date.now()}`,
        board: { size: boardSize, stones: [] },
        players: [],
        currentPlayer: 'black',
        history: [],
        gameOver: false,
        timeControl: null
      };

      // Create human player
      const humanPlayer = {
        id: `human_${Date.now()}`,
        username: 'Human Player',
        color: humanPlayerColor,
        isAI: false,
        rank: humanPlayerRank
      };

      gameState.players.push(humanPlayer);

      // Create AI opponent
      const aiPlayer = await this.aiManager.createAIGame(
        gameState, 
        humanPlayer, 
        humanPlayerRank, 
        aiStrength
      );

      console.log(`🎮 AI Game Created: ${humanPlayerRank} Human vs ${aiPlayer.aiNetwork.level} AI`);

      res.json({
        success: true,
        gameId: gameState.id,
        gameState: gameState,
        aiOpponent: {
          name: aiPlayer.username,
          level: aiPlayer.aiNetwork.level,
          elo: aiPlayer.aiNetwork.elo,
          rank: aiPlayer.aiNetwork.rank
        },
        message: `Created ${aiStrength} AI opponent for ${humanPlayerRank} player`
      });

    } catch (error) {
      console.error('❌ AI Game Creation Error:', error);
      res.status(500).json({ 
        error: error.message,
        suggestion: 'Make sure KataGo networks are downloaded. Run: download-networks.bat'
      });
    }
  }

  /**
   * Get available AI opponents for a human player rank
   * GET /api/ai/opponents/:rank
   */
  async getAvailableOpponents(req, res) {
    try {
      const { rank } = req.params;
      
      // Validate rank format
      const rankRegex = /^(1[0-5]k|[1-9]k|[1-9]d)$/;
      if (!rankRegex.test(rank)) {
        return res.status(400).json({ 
          error: 'Invalid rank format. Use format like: 5k, 2d, etc.' 
        });
      }

      const opponents = this.aiManager.getAvailableOpponents(rank);
      
      res.json(opponents.map(opponent => ({
        strength: opponent.strength,
        network: {
          file: opponent.network.file,
          elo: opponent.network.elo,
          level: opponent.network.level,
          rank: opponent.network.rank
        },
        description: opponent.description,
        available: true // All opponents from enhanced AI manager are available
      })));

    } catch (error) {
      console.error('❌ Get Available Opponents Error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get network selector info
   * GET /api/ai/networks
   */
  async getNetworkInfo(req, res) {
    try {
      const networks = {
        beginner: this.aiManager.networkSelector.networks.beginner,
        normal: this.aiManager.networkSelector.networks.normal,
        dan: this.aiManager.networkSelector.networks.dan,
        pro: this.aiManager.networkSelector.networks.pro
      };

      // Check which networks are available
      const networkStatus = {};
      for (const [category, categoryNetworks] of Object.entries(networks)) {
        networkStatus[category] = categoryNetworks.map(network => ({
          ...network,
          available: this.aiManager.networkSelector.checkNetworkExists(category, network.file)
        }));
      }

      res.json({
        networkCategories: networkStatus,
        totalNetworks: Object.values(networks).flat().length,
        downloadedNetworks: Object.values(networkStatus).flat().filter(n => n.available).length
      });

    } catch (error) {
      console.error('❌ Network Info Error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Test network selection
   * GET /api/ai/test-selection/:rank/:strength
   */
  async testNetworkSelection(req, res) {
    try {
      const { rank, strength = 'equal' } = req.params;
      
      const networkConfig = this.aiManager.selectNetworkForPlayer(rank, strength);
      
      res.json({
        humanPlayerRank: rank,
        aiStrength: strength,
        selectedNetwork: {
          name: networkConfig.network.level,
          elo: networkConfig.network.elo,
          rank: networkConfig.network.rank,
          file: networkConfig.network.file,
          category: networkConfig.category,
          available: networkConfig.exists
        },
        computationalSettings: this.aiManager.getComputationalSettings(networkConfig.network, 9)
      });

    } catch (error) {
      console.error('❌ Network Selection Test Error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get all available networks (without requiring rank)
   * GET /api/ai/all-networks
   */
  async getAllNetworks(req, res) {
    try {
      const fs = require('fs');
      const path = require('path');
      
      const networksDir = path.join(__dirname, '../katago/networks');
      const categories = ['beginner', 'normal', 'dan', 'pro'];
      const allNetworks = [];
      
      for (const category of categories) {
        const categoryDir = path.join(networksDir, category);
        
        if (!fs.existsSync(categoryDir)) {
          continue;
        }
        
        const files = fs.readdirSync(categoryDir);
        const metaFiles = files.filter(file => file.endsWith('.meta.json'));
        
        for (const metaFile of metaFiles) {
          try {
            const metaPath = path.join(categoryDir, metaFile);
            const metaData = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
            
            // Check if the actual network file exists
            const networkFile = metaFile.replace('.meta.json', '.txt');
            const networkPath = path.join(categoryDir, networkFile);
            const isAvailable = fs.existsSync(networkPath);
            
            allNetworks.push({
              id: `${category}-${metaData.elo}`, // Unique identifier
              filename: metaData.filename,
              elo: metaData.elo,
              level: metaData.level,
              category: category,
              directory: metaData.directory,
              cpuFriendly: metaData.cpu_friendly,
              available: isAvailable,
              networkFile: networkFile
            });
          } catch (error) {
            console.warn(`⚠️ Error reading metadata file ${metaFile}:`, error.message);
          }
        }
      }
      
      // Sort by ELO rating (ascending)
      allNetworks.sort((a, b) => a.elo - b.elo);
      
      res.json({
        success: true,
        networks: allNetworks,
        totalNetworks: allNetworks.length,
        availableNetworks: allNetworks.filter(n => n.available).length,
        categories: {
          beginner: allNetworks.filter(n => n.category === 'beginner').length,
          normal: allNetworks.filter(n => n.category === 'normal').length,
          dan: allNetworks.filter(n => n.category === 'dan').length,
          pro: allNetworks.filter(n => n.category === 'pro').length
        }
      });
      
    } catch (error) {
      console.error('❌ Get All Networks Error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Setup Express routes
   */
  setupRoutes(app) {
    app.post('/api/ai/create-game', this.createAIGame.bind(this));
    app.get('/api/ai/opponents/:rank', this.getAvailableOpponents.bind(this));
    app.get('/api/ai/networks', this.getNetworkInfo.bind(this));
    app.get('/api/ai/all-networks', this.getAllNetworks.bind(this));
    app.get('/api/ai/test-selection/:rank/:strength?', this.testNetworkSelection.bind(this));
    
    console.log('✅ AI Game API routes registered');
  }
}

module.exports = AIGameAPI; 