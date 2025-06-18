# 🤖 KataGo P2AI Bot Player Implementation Plan

**Version**: 1.0  
**Date**: January 2025  
**Status**: Planning Phase  

## 📋 Overview

This document outlines the implementation plan for integrating KataGo as an AI bot player to enable Player vs AI (P2AI) gameplay mode in Gosei Play.

### Current System Architecture
- **Frontend**: React/TypeScript with Socket.IO
- **Backend**: Node.js/Express with Socket.IO and Redis
- **Game Logic**: Complete Go implementation with time controls, scoring, handicap
- **Existing Game Types**: `even`, `handicap`, `blitz`, `teaching`, `rengo`

### Target Architecture
```
Human Player ↔ Frontend ↔ Socket.IO ↔ Server ↔ KataGo Engine ↔ AI Bot
```

## 🎯 Goals

1. **Add P2AI game mode** with configurable AI strength levels
2. **Integrate KataGo** analysis engine for move generation
3. **Maintain existing architecture** and code patterns
4. **Ensure responsive gameplay** with realistic AI thinking times
5. **Support all board sizes** and rule sets

## 🏗️ Technical Implementation

### Phase 1: Core Infrastructure (Week 1-2)

#### A. Type System Updates

**File**: `src/types/go.ts`

```typescript
// Add P2AI to GameType union
export type GameType = 'even' | 'handicap' | 'blitz' | 'teaching' | 'rengo' | 'p2ai';

// AI Player interface
export interface AIPlayer extends Player {
  isAI: true;
  aiEngine: 'katago';
  aiStrength: 'beginner' | 'intermediate' | 'advanced' | 'professional';
  thinkingTime?: number;
  maxVisits?: number;
}

// AI Configuration
export interface AIConfig {
  strength: AIPlayer['aiStrength'];
  colorPreference: 'human_black' | 'human_white' | 'random';
  thinkingTimeRange: [number, number]; // min, max seconds
}
```

#### B. KataGo Engine Wrapper

**File**: `server/engines/katagoEngine.js`

```javascript
const { spawn } = require('child_process');
const readline = require('readline');

class KataGoEngine {
  constructor(config) {
    this.katagoPath = config.path;
    this.modelPath = config.modelPath;
    this.configPath = config.configPath;
    this.process = null;
    this.requestId = 0;
    this.pendingRequests = new Map();
    this.isInitialized = false;
  }

  async initialize() {
    return new Promise((resolve, reject) => {
      this.process = spawn(this.katagoPath, [
        'analysis',
        '-model', this.modelPath,
        '-config', this.configPath
      ]);

      this.setupJSONProtocol();
      
      // Wait for initialization
      setTimeout(() => {
        this.isInitialized = true;
        resolve();
      }, 3000);
    });
  }

  setupJSONProtocol() {
    const rl = readline.createInterface({
      input: this.process.stdout,
      output: this.process.stdin,
      terminal: false
    });

    rl.on('line', (line) => {
      try {
        const response = JSON.parse(line);
        this.handleResponse(response);
      } catch (error) {
        console.error('KataGo JSON parse error:', error);
      }
    });
  }

  async getBestMove(gameState, aiStrength) {
    const query = this.buildAnalysisQuery(gameState, aiStrength);
    return this.sendQuery(query);
  }

  buildAnalysisQuery(gameState, aiStrength) {
    const strengthConfig = this.getStrengthConfig(aiStrength);
    
    return {
      id: `move_${++this.requestId}`,
      initialStones: this.convertBoardToKatago(gameState.board.stones),
      moves: this.convertHistoryToMoves(gameState.history),
      rules: this.mapRulesToKatago(gameState.scoringRule),
      komi: gameState.komi,
      boardXSize: gameState.board.size,
      boardYSize: gameState.board.size,
      maxVisits: strengthConfig.maxVisits,
      analyzeOwnership: false,
      includeOwnership: false,
      includePolicy: true,
      includePVVisits: true
    };
  }

  getStrengthConfig(strength) {
    const configs = {
      beginner: { maxVisits: 100, randomness: 0.3, thinkingTime: [2, 8] },
      intermediate: { maxVisits: 400, randomness: 0.15, thinkingTime: [3, 12] },
      advanced: { maxVisits: 1000, randomness: 0.05, thinkingTime: [5, 20] },
      professional: { maxVisits: 2000, randomness: 0.0, thinkingTime: [8, 30] }
    };
    return configs[strength] || configs.intermediate;
  }
}

module.exports = KataGoEngine;
```

#### C. AI Player Manager

**File**: `server/managers/aiManager.js`

```javascript
const KataGoEngine = require('../engines/katagoEngine');

class AIPlayerManager {
  constructor() {
    this.katagoEngine = null;
    this.activeAIPlayers = new Map();
    this.initializeEngine();
  }

  async initializeEngine() {
    const config = {
      path: process.env.KATAGO_PATH || 'katago',
      modelPath: process.env.KATAGO_MODEL || './models/katago-latest.bin.gz',
      configPath: process.env.KATAGO_CONFIG || './config/katago-analysis.cfg'
    };
    
    this.katagoEngine = new KataGoEngine(config);
    await this.katagoEngine.initialize();
  }

  async createAIPlayer(gameId, aiConfig) {
    const strengthConfig = this.katagoEngine.getStrengthConfig(aiConfig.strength);
    
    const aiPlayer = {
      id: `ai_${gameId}`,
      username: `KataGo (${aiConfig.strength})`,
      color: null, // Assigned during game creation
      isAI: true,
      aiEngine: 'katago',
      aiStrength: aiConfig.strength,
      thinkingTime: this.randomThinkingTime(strengthConfig.thinkingTime),
      maxVisits: strengthConfig.maxVisits
    };
    
    this.activeAIPlayers.set(gameId, aiPlayer);
    return aiPlayer;
  }

  async makeAIMove(gameId, gameState, io) {
    const aiPlayer = this.activeAIPlayers.get(gameId);
    if (!aiPlayer || gameState.currentTurn !== aiPlayer.color) {
      return;
    }

    try {
      // Emit thinking state
      io.to(gameId).emit('aiThinking', {
        gameId,
        playerId: aiPlayer.id,
        estimatedTime: aiPlayer.thinkingTime
      });

      // Get move from KataGo
      const analysis = await this.katagoEngine.getBestMove(gameState, aiPlayer.aiStrength);
      const selectedMove = this.selectMoveFromAnalysis(analysis, aiPlayer.aiStrength);

      // Simulate thinking time
      await this.simulateThinking(aiPlayer.thinkingTime);

      // Execute the move
      await this.executeAIMove(gameId, selectedMove, aiPlayer, io);

    } catch (error) {
      console.error('AI move error:', error);
      // Fallback to random move or pass
      this.executeAIMove(gameId, { pass: true }, aiPlayer, io);
    }
  }

  selectMoveFromAnalysis(analysis, strength) {
    const moveInfos = analysis.moveInfos || [];
    if (moveInfos.length === 0) {
      return { pass: true };
    }

    const strengthConfig = this.katagoEngine.getStrengthConfig(strength);
    const randomness = strengthConfig.randomness;

    if (randomness === 0) {
      return this.convertKatagoMoveToPosition(moveInfos[0].move);
    }

    // Add randomness based on strength
    const totalMoves = Math.min(moveInfos.length, 10);
    const weights = moveInfos.slice(0, totalMoves).map((info, index) => {
      const baseWeight = Math.exp(-index * randomness * 3);
      return baseWeight;
    });

    const selectedIndex = this.weightedRandomSelection(weights);
    return this.convertKatagoMoveToPosition(moveInfos[selectedIndex].move);
  }

  async executeAIMove(gameId, move, aiPlayer, io) {
    io.to(gameId).emit('aiPlayerMove', {
      gameId,
      move,
      color: aiPlayer.color,
      playerId: aiPlayer.id
    });
  }

  randomThinkingTime([min, max]) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  async simulateThinking(seconds) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
  }
}

module.exports = AIPlayerManager;
```

### Phase 2: Server Integration (Week 2-3)

#### A. Update Game Creation Handler

**File**: `server/server.js`

```javascript
// Add AI manager
const AIPlayerManager = require('./managers/aiManager');
const aiManager = new AIPlayerManager();

// Update createGame handler
socket.on('createGame', async ({ gameState, playerId, playerName, aiConfig }) => {
  // ... existing validation ...

  if (gameState.gameType === 'p2ai') {
    try {
      // Create AI opponent
      const aiPlayer = await aiManager.createAIPlayer(gameState.id, aiConfig);
      
      // Assign colors
      const humanPlayer = gameState.players[0];
      if (aiConfig.colorPreference === 'random') {
        const humanIsBlack = Math.random() < 0.5;
        humanPlayer.color = humanIsBlack ? 'black' : 'white';
        aiPlayer.color = humanIsBlack ? 'white' : 'black';
      } else {
        humanPlayer.color = aiConfig.colorPreference === 'human_black' ? 'black' : 'white';
        aiPlayer.color = humanPlayer.color === 'black' ? 'white' : 'black';
      }

      gameState.players.push(aiPlayer);
      gameState.status = 'playing';

      // If AI plays first (black), trigger first move
      if (aiPlayer.color === 'black') {
        setTimeout(() => {
          aiManager.makeAIMove(gameState.id, gameState, io);
        }, 1000);
      }
    } catch (error) {
      console.error('Failed to create AI player:', error);
      socket.emit('error', 'Failed to create AI opponent');
      return;
    }
  }

  // ... rest of existing logic ...
});
```

#### B. Update Move Handler

```javascript
// Update makeMove handler
socket.on('makeMove', async ({ gameId, position, color, playerId }) => {
  // ... existing move validation and processing ...

  // After human move is processed successfully
  if (gameState.gameType === 'p2ai' && gameState.status === 'playing') {
    // Small delay then trigger AI move
    setTimeout(async () => {
      await aiManager.makeAIMove(gameId, gameState, io);
    }, 800);
  }

  // ... rest of existing logic ...
});
```

### Phase 3: Frontend Integration (Week 3-4)

#### A. Game Type Selection

**File**: `src/pages/HomePage.tsx`

```tsx
// Add P2AI option to game type selector
const renderGameTypeOptions = () => (
  <div className="game-type-selection">
    {/* ... existing options ... */}
    <div className="game-type-option" onClick={() => setGameType('p2ai')}>
      <div className="game-type-icon">🤖</div>
      <h3>vs AI</h3>
      <p>Play against KataGo AI</p>
    </div>
  </div>
);

// P2AI specific configuration
const P2AISettings = () => (
  <div className="p2ai-settings">
    <div className="setting-group">
      <label>AI Strength</label>
      <select value={aiConfig.strength} onChange={(e) => updateAIConfig('strength', e.target.value)}>
        <option value="beginner">Beginner (~10 kyu)</option>
        <option value="intermediate">Intermediate (~5 kyu)</option>
        <option value="advanced">Advanced (~1 dan)</option>
        <option value="professional">Professional (5+ dan)</option>
      </select>
    </div>
    
    <div className="setting-group">
      <label>Your Color</label>
      <select value={aiConfig.colorPreference} onChange={(e) => updateAIConfig('colorPreference', e.target.value)}>
        <option value="random">Random</option>
        <option value="human_black">Black (You play first)</option>
        <option value="human_white">White (AI plays first)</option>
      </select>
    </div>
  </div>
);
```

#### B. AI Player Display Component

**File**: `src/components/AIPlayerDisplay.tsx`

```tsx
import React, { useState, useEffect } from 'react';

interface AIPlayerDisplayProps {
  aiPlayer: AIPlayer;
  isThinking: boolean;
  estimatedThinkingTime?: number;
}

export const AIPlayerDisplay: React.FC<AIPlayerDisplayProps> = ({ 
  aiPlayer, 
  isThinking, 
  estimatedThinkingTime 
}) => {
  const [thinkingProgress, setThinkingProgress] = useState(0);

  useEffect(() => {
    if (isThinking && estimatedThinkingTime) {
      const interval = setInterval(() => {
        setThinkingProgress(prev => {
          const next = prev + (100 / estimatedThinkingTime);
          return next > 100 ? 100 : next;
        });
      }, 1000);

      return () => clearInterval(interval);
    } else {
      setThinkingProgress(0);
    }
  }, [isThinking, estimatedThinkingTime]);

  return (
    <div className={`ai-player-display ${aiPlayer.color}`}>
      <div className="ai-avatar">
        <div className="ai-icon">🤖</div>
        <div className="ai-info">
          <div className="ai-name">{aiPlayer.username}</div>
          <div className="ai-strength">{aiPlayer.aiStrength}</div>
        </div>
      </div>
      
      {isThinking && (
        <div className="thinking-indicator">
          <div className="thinking-text">
            <span className="thinking-dots">Thinking</span>
          </div>
          <div className="thinking-progress">
            <div 
              className="progress-bar" 
              style={{ width: `${thinkingProgress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
```

#### C. Socket Event Handlers

**File**: `src/context/GameContext.tsx`

```tsx
// Add AI-specific socket handlers
useEffect(() => {
  if (!state.socket) return;

  const handleAIThinking = ({ gameId, playerId, estimatedTime }: any) => {
    if (gameId === state.gameState?.id) {
      dispatch({
        type: 'AI_THINKING_START',
        payload: { playerId, estimatedTime }
      });
    }
  };

  const handleAIMove = ({ gameId, move, color, playerId }: any) => {
    if (gameId === state.gameState?.id) {
      dispatch({
        type: 'AI_THINKING_END',
        payload: { playerId }
      });
      
      // Process the AI move
      if (move.pass) {
        // Handle AI pass
        handleAIPass(color, playerId);
      } else {
        // Handle AI stone placement
        handleAIStonePlace(move, color, playerId);
      }
    }
  };

  state.socket.on('aiThinking', handleAIThinking);
  state.socket.on('aiPlayerMove', handleAIMove);

  return () => {
    state.socket?.off('aiThinking', handleAIThinking);
    state.socket?.off('aiPlayerMove', handleAIMove);
  };
}, [state.socket, state.gameState?.id]);
```

### Phase 4: Configuration & Deployment (Week 4-5)

#### A. KataGo Configuration Files

**File**: `server/config/katago-analysis.cfg`

```
# KataGo Analysis Engine Configuration for P2AI Mode

# Logging
logFile = katago-p2ai.log
logDir = ./logs
logTimeStamp = true

# Performance
numSearchThreads = 4
maxVisits = 2000

# Analysis specific
analysisPVLen = 10
analysisRequireMovePlausibility = false
reportAnalysisWinratesAs = SIDETOMOVE

# GPU settings (if available)
openclUseFP16 = true
```

#### B. Environment Configuration

**File**: `server/config/aiConfig.js`

```javascript
module.exports = {
  katago: {
    path: process.env.KATAGO_PATH || 'katago',
    modelPath: process.env.KATAGO_MODEL || './models/katago-latest.bin.gz',
    configPath: process.env.KATAGO_CONFIG || './config/katago-analysis.cfg',
    timeout: parseInt(process.env.KATAGO_TIMEOUT) || 30000
  },
  
  aiStrengths: {
    beginner: { 
      maxVisits: 100, 
      randomness: 0.3, 
      thinkingTime: [2, 8],
      description: "~10 kyu level"
    },
    intermediate: { 
      maxVisits: 400, 
      randomness: 0.15, 
      thinkingTime: [3, 12],
      description: "~5 kyu level"
    },
    advanced: { 
      maxVisits: 1000, 
      randomness: 0.05, 
      thinkingTime: [5, 20],
      description: "~1 dan level"
    },
    professional: { 
      maxVisits: 2000, 
      randomness: 0.0, 
      thinkingTime: [8, 30],
      description: "5+ dan level"
    }
  },

  performance: {
    maxConcurrentGames: 10,
    memoryLimit: '2GB',
    responseTimeout: 30000
  }
};
```

## 📅 Implementation Timeline

### Week 1: Foundation
- [ ] Add P2AI game type to type system
- [ ] Create KataGo engine wrapper
- [ ] Basic AI player manager
- [ ] Initial testing setup

### Week 2: Core Integration
- [ ] Integrate AI into game creation flow
- [ ] Implement move generation and selection
- [ ] Add thinking time simulation
- [ ] Server-side move processing

### Week 3: Frontend Development
- [ ] P2AI game creation UI
- [ ] AI player display components
- [ ] Thinking animations and indicators
- [ ] Socket event handling

### Week 4: Polish & Testing
- [ ] Game flow optimization
- [ ] Error handling and edge cases
- [ ] Performance testing
- [ ] UI/UX improvements

### Week 5: Deployment & Documentation
- [ ] Production configuration
- [ ] Documentation updates
- [ ] End-to-end testing
- [ ] Performance monitoring

## ⚠️ Technical Considerations

### Performance
- **KataGo Startup**: Keep persistent process running to avoid initialization delays
- **Memory Management**: Monitor KataGo memory usage and implement restart logic
- **Concurrent Games**: Handle multiple P2AI games without performance degradation
- **Response Times**: Ensure AI moves within reasonable time bounds

### Error Handling
- KataGo process crashes or timeouts
- Invalid move responses from AI
- Network communication failures
- Graceful degradation to random moves

### Security
- Validate all KataGo responses
- Prevent command injection in configuration
- Resource limits for AI processes
- Input sanitization for move data

### Scalability
- Process pooling for multiple games
- Load balancing AI requests
- Caching common positions
- Resource monitoring and alerting

## 📊 Success Metrics

### Performance Targets
- **AI Response Time**: 90% of moves within 5-30 seconds based on strength
- **Server Load**: <50% CPU usage with 10 concurrent P2AI games
- **Memory Usage**: <2GB per KataGo instance
- **Uptime**: >99% availability for AI services

### Quality Metrics
- **Move Quality**: AI plays reasonable moves for selected strength level
- **User Experience**: Smooth gameplay without noticeable delays
- **Error Rate**: <1% of games affected by AI errors
- **Game Completion**: >95% of started P2AI games complete successfully

## 🔄 Future Enhancements

### Phase 2 Features
- **AI Personalities**: Different playing styles (aggressive, territorial, etc.)
- **Handicap P2AI**: AI plays with handicap stones
- **Analysis Mode**: Post-game AI analysis and suggestions
- **Custom Strength**: Fine-tuned AI strength slider

### Advanced Features
- **Multiple AI Engines**: Support for other Go AIs
- **AI vs AI**: Spectate AI vs AI games
- **Training Mode**: AI provides hints and teaching
- **Tournament Mode**: Play series of games against progressively stronger AI

## 📝 Notes

### Development Environment
- Ensure KataGo is installed and accessible
- Configure appropriate model files
- Test with different board sizes
- Verify GPU/CPU performance settings

### Deployment Requirements
- KataGo binary and model files
- Sufficient system resources (CPU/GPU/Memory)
- Process monitoring and restart capabilities
- Log aggregation and monitoring

This plan provides a comprehensive roadmap for implementing KataGo P2AI functionality while maintaining the existing codebase architecture and ensuring a high-quality user experience. 