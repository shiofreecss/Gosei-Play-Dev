const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class KataGoCPUEngine {
  constructor(options = {}) {
    this.boardSize = options.boardSize || 9;
    this.maxVisits = options.maxVisits || 100; // Very low for 9x9 CPU
    this.maxTime = options.maxTime || 3.0; // 3 seconds max per move
    this.threads = options.threads || 1; // Single thread for low RAM
    this.process = null;
    this.isInitialized = false;
    this.pendingCallbacks = new Map();
    this.commandId = 0;
    
    // Paths - will be set during initialization
    this.katagoPath = options.katagoPath || this.findKataGoExecutable();
    this.modelPath = options.modelPath || this.findKataGoModel();
    this.configPath = options.configPath || this.createCPUConfig();
    
    console.log(`🤖 KataGo CPU Engine initialized for ${this.boardSize}x${this.boardSize} board`);
    console.log(`🔧 Config: visits=${this.maxVisits}, time=${this.maxTime}s, threads=${this.threads}`);
  }

  findKataGoExecutable() {
    // Check if we're on Windows
    const isWindows = process.platform === 'win32';
    
    // Common paths where KataGo might be installed
    const possiblePaths = isWindows ? [
      path.join(__dirname, '..', 'katago', 'katago.exe'),
      './katago/katago.exe',
      './bin/katago.exe',
      'katago.exe'
    ] : [
      '/usr/local/bin/katago',
      '/usr/bin/katago',
      './katago/katago',
      './bin/katago'
    ];
    
    for (const exePath of possiblePaths) {
      if (fs.existsSync(exePath)) {
        console.log(`✅ Found KataGo executable at: ${exePath}`);
        return exePath;
      }
    }
    
    console.log('⚠️  KataGo executable not found. Please install KataGo or set path manually.');
    return isWindows ? 'katago.exe' : 'katago'; // Assume it's in PATH
  }

  findKataGoModel() {
    // Check if we're on Windows
    const isWindows = process.platform === 'win32';
    
    // Look for lightweight models suitable for CPU
    const possibleModels = [
      // Your downloaded model (prioritized)
      path.join(__dirname, '..', 'katago', 'kata1-b6c96-s175395328-d26788732.txt'),
      path.join(__dirname, '..', 'katago', 'kata1-b6c96-s175395328-d26788732.bin.gz'),
      // Windows and cross-platform paths
      path.join(__dirname, '..', 'katago', 'b6c96-s1802764800-d629989359.bin.gz'),
      './katago/b6c96-s1802764800-d629989359.bin.gz',
      './katago/models/b6c96-s1235592320-d204142634.bin.gz', // 6 block model
      './katago/models/b10c128-s197428736-d67404019.bin.gz',  // 10 block model
      './models/katago-b6c96.bin.gz',
      './models/katago-b10c128.bin.gz'
    ];
    
    // Add Linux-specific paths if not on Windows
    if (!isWindows) {
      possibleModels.push('/usr/share/katago/models/b6c96-s1235592320-d204142634.bin.gz');
    }
    
    for (const model of possibleModels) {
      if (fs.existsSync(model)) {
        console.log(`✅ Found KataGo model at: ${model}`);
        return model;
      }
    }
    
    console.log('⚠️  KataGo model not found. Please download a lightweight model.');
    return null;
  }

  createCPUConfig() {
    // Use katago directory for config if it exists, otherwise use engines directory
    const katagoDir = path.join(__dirname, '..', 'katago');
    const configDir = fs.existsSync(katagoDir) ? katagoDir : __dirname;
    const configPath = path.join(configDir, 'katago-cpu-config.cfg');
    const logPath = path.join(configDir, 'logs', 'gtp.log');
    
    // Ensure logs directory exists
    const logsDir = path.join(configDir, 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    // Create optimized config for CPU and low RAM usage
    const config = `# KataGo CPU Configuration for 9x9 Go
# Optimized for low memory usage (4-8GB RAM)

# Logging
logFile = ${logPath.replace(/\\/g, '/')}
logAllGTPCommunication = true
logSearchInfo = false
logTimeStamp = true

# Analysis settings
analysisThreads = ${this.threads}
numSearchThreads = ${this.threads}

# Memory optimization
maxVisits = ${this.maxVisits}
maxPlayouts = ${this.maxVisits}
maxTime = ${this.maxTime}

# CPU optimization
nnMaxBatchSize = 1
nnCacheSizePowerOfTwo = 16  # 64KB cache (very small)
nnMutexPoolSizePowerOfTwo = 10

# Disable GPU backends (CPU only)
cudaUseFP16 = false
cudaUseNHWC = false
openclUseFP16 = false
useFP16 = false

# Tuning for 9x9
searchFactorAfterOnePass = 0.5
searchFactorAfterTwoPass = 0.25
winLossUtilityFactor = 1.0
staticScoreUtilityFactor = 0.3
dynamicScoreUtilityFactor = 0.3

# Time management
lagBuffer = 0.5
searchTimeBuffer = 0.1

# Root policy temperature
rootPolicyTemperature = 1.1
rootPolicyTemperatureEarly = 1.5

# Pondering disabled to save resources
ponderingEnabled = false

# Rules
rules = tromp-taylor
`;

    try {
      fs.writeFileSync(configPath, config);
      console.log(`✅ Created KataGo CPU config at: ${configPath}`);
      return configPath;
    } catch (error) {
      console.error('❌ Failed to create KataGo config:', error);
      return null;
    }
  }

  async initialize() {
    if (this.isInitialized) return true;
    
    if (!this.modelPath) {
      throw new Error('KataGo model not found. Please download a lightweight model for CPU play.');
    }

    try {
      console.log('🚀 Starting KataGo CPU engine...');
      
      const args = [
        'gtp',
        '-model', this.modelPath,
        '-config', this.configPath
      ];

      this.process = spawn(this.katagoPath, args, {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      this.process.stdout.on('data', (data) => {
        this.handleResponse(data.toString());
      });

      this.process.stderr.on('data', (data) => {
        console.error('KataGo stderr:', data.toString());
      });

      this.process.on('close', (code) => {
        console.log(`KataGo process exited with code ${code}`);
        this.isInitialized = false;
      });

      this.process.on('error', (error) => {
        console.error('KataGo process error:', error);
        this.isInitialized = false;
      });

      // Initialize the engine
      console.log(`🎯 Setting KataGo board size to ${this.boardSize}x${this.boardSize}`);
      const boardSizeResponse = await this.sendCommand('boardsize', this.boardSize);
      console.log(`📋 KataGo boardsize response: ${boardSizeResponse}`);
      
      await this.sendCommand('clear_board');
      await this.sendCommand('komi', '6.5');
      
      this.isInitialized = true;
      console.log('✅ KataGo CPU engine initialized successfully');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to initialize KataGo:', error);
      return false;
    }
  }

  handleResponse(data) {
    const lines = data.trim().split('\n');
    
    for (const line of lines) {
      if (line.startsWith('=') || line.startsWith('?')) {
        // This is a command response
        const parts = line.split(' ');
        const commandId = parseInt(parts[0].substring(1));
        const response = parts.slice(1).join(' ');
        
        const callback = this.pendingCallbacks.get(commandId);
        if (callback) {
          this.pendingCallbacks.delete(commandId);
          if (line.startsWith('=')) {
            callback.resolve(response);
          } else {
            callback.reject(new Error(response));
          }
        }
      }
    }
  }

  sendCommand(command, ...args) {
    return new Promise((resolve, reject) => {
      if (!this.process) {
        reject(new Error('KataGo process not started'));
        return;
      }

      const commandId = ++this.commandId;
      const fullCommand = `${commandId} ${command} ${args.join(' ')}\n`;
      
      this.pendingCallbacks.set(commandId, { resolve, reject });
      this.process.stdin.write(fullCommand);
      
      // Timeout after 10 seconds
      setTimeout(() => {
        if (this.pendingCallbacks.has(commandId)) {
          this.pendingCallbacks.delete(commandId);
          reject(new Error('Command timeout'));
        }
      }, 10000);
    });
  }

  // Convert internal coordinates to Go notation (a-t, skipping i)
  positionToGoNotation(position) {
    if (!position) return 'pass';
    
    // Go coordinate system skips 'i'
    // Supports up to 19x19 (a-t, skipping i = 19 letters)
    const letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't'];
    
    if (position.x < 0 || position.x >= letters.length || position.y < 0 || position.y >= this.boardSize) {
      throw new Error(`Invalid coordinates: (${position.x}, ${position.y}) for ${this.boardSize}x${this.boardSize} board`);
    }
    
    // Additional check for board size limits
    if (this.boardSize > 19) {
      throw new Error(`Board size ${this.boardSize}x${this.boardSize} not supported for AI (max 19x19)`);
    }
    
    const notation = `${letters[position.x]}${position.y + 1}`;
    console.log(`🔄 Converting internal (${position.x}, ${position.y}) -> Go notation ${notation}`);
    return notation;
  }

  // Convert Go notation (a-t, skipping i) to internal coordinates
  goNotationToPosition(move) {
    if (!move || move === 'pass') return null;
    
    const letter = move.charAt(0);
    const number = parseInt(move.substring(1));
    
    // Go coordinate system skips 'i'
    // Supports up to 19x19 boards
    const letterMap = { 
      'a': 0, 'b': 1, 'c': 2, 'd': 3, 'e': 4, 'f': 5, 'g': 6, 'h': 7, 
      'j': 8, 'k': 9, 'l': 10, 'm': 11, 'n': 12, 'o': 13, 'p': 14, 
      'q': 15, 'r': 16, 's': 17, 't': 18 
    };
    
    const x = letterMap[letter];
    if (x === undefined || number < 1 || number > this.boardSize) {
      console.log(`❌ Invalid Go notation: ${move} (letter=${letter}, number=${number}, boardSize=${this.boardSize})`);
      console.log(`   x=${x}, letterValid=${x !== undefined}, numberValid=${number >= 1 && number <= this.boardSize}`);
      return null; // Invalid letter or number
    }
    
    // Additional check: make sure x coordinate is within board bounds
    if (x >= this.boardSize) {
      console.log(`❌ X coordinate out of bounds: ${letter}(${x}) >= ${this.boardSize}`);
      return null;
    }
    
    const y = number - 1; // Convert to 0-indexed
    const position = { x, y };
    console.log(`🔄 Converting Go notation ${move} -> internal (${position.x}, ${position.y})`);
    
    return position;
  }

  async playMove(color, position) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const move = this.positionToGoNotation(position);
      await this.sendCommand('play', color, move);
      console.log(`🎯 KataGo played ${color} ${move}`);
    } catch (error) {
      console.error('❌ Failed to play move in KataGo:', error);
      throw error;
    }
  }

  async generateMove(color) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      console.log(`🤔 KataGo thinking for ${color} on ${this.boardSize}x${this.boardSize} board...`);
      
      // Ensure board size is set correctly before generating move
      await this.sendCommand('boardsize', this.boardSize);
      
      // Query KataGo to confirm what board size it's using
      try {
        const boardSizeQuery = await this.sendCommand('query_boardsize');
        console.log(`📋 KataGo reports board size: ${boardSizeQuery}`);
      } catch (error) {
        console.log(`⚠️  KataGo doesn't support query_boardsize command`);
      }
      
      const response = await this.sendCommand('genmove', color);
      
      if (response.toLowerCase() === 'pass') {
        console.log(`🎯 KataGo decided to pass`);
        return null; // Pass move
      }
      
      // Parse the move using the reverse mapping
      const move = response.trim().toLowerCase();
      const position = this.goNotationToPosition(move);
      
      if (!position) {
        throw new Error(`KataGo generated invalid move: ${move} (board size mismatch)`);
      }
      
      console.log(`🎯 KataGo generated move: ${move} -> (${position.x}, ${position.y})`);
      return position;
      
    } catch (error) {
      console.error('❌ Failed to generate move:', error);
      throw error;
    }
  }

  async getScore() {
    if (!this.isInitialized) return null;

    try {
      const response = await this.sendCommand('final_score');
      console.log(`📊 KataGo score: ${response}`);
      return response;
    } catch (error) {
      console.error('❌ Failed to get score:', error);
      return null;
    }
  }

  async clearBoard() {
    if (!this.isInitialized) return;

    try {
      // Ensure board size is maintained when clearing
      await this.sendCommand('boardsize', this.boardSize);
      await this.sendCommand('clear_board');
      console.log(`🧹 KataGo board cleared (${this.boardSize}x${this.boardSize})`);
    } catch (error) {
      console.error('❌ Failed to clear board:', error);
    }
  }

  shutdown() {
    if (this.process) {
      this.process.kill();
      this.process = null;
      this.isInitialized = false;
      console.log('🛑 KataGo engine shutdown');
    }
  }
}

module.exports = KataGoCPUEngine; 