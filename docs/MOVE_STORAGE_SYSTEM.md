# Move Storage System Documentation

## Overview

This document describes how moves are stored, managed, and synchronized across the Gosei Play application. Understanding the move storage system is crucial for maintaining data integrity, implementing features like undo, and debugging game state issues.

## Table of Contents

- [Data Structures](#data-structures)
- [Storage Locations](#storage-locations)
- [Move Flow](#move-flow)
- [Synchronization](#synchronization)
- [Undo System](#undo-system)
- [Debugging](#debugging)
- [API Reference](#api-reference)

## Data Structures

### GameMove Type

All moves in the game are represented by the `GameMove` type:

```typescript
export type GameMove = Position | { pass: true };
```

**Move Types:**
- **Stone Placement**: `{ x: number, y: number }`
- **Pass Move**: `{ pass: true }`

### Enhanced Move Data (Server-Side)

The server stores additional metadata for each move:

```javascript
const moveHistoryEntry = {
  position: position,           // Move position {x, y}
  color: color,                // 'black' | 'white'
  playerId: playerId,          // Player who made the move
  timestamp: Date.now(),       // When move was made
  timeSpentOnMove: timeSpentOnMove,     // Time spent on this move
  timeSpentDisplay: formatMoveTimeDisplay(timeSpentOnMove),
  timeDisplay: formatTimeDisplay(movingPlayer),
  timeRemaining: movingPlayer.timeRemaining,
  isInByoYomi: movingPlayer.isInByoYomi,
  byoYomiTimeLeft: movingPlayer.byoYomiTimeLeft,
  byoYomiPeriodsLeft: movingPlayer.byoYomiPeriodsLeft,
  capturedCount: capturedStones.capturedCount
};
```

### GameState Structure

The central data structure containing all game information:

```typescript
export interface GameState {
  id: string;
  code: string;
  board: Board;                    // Current board state
  players: Player[];
  currentTurn: StoneColor;
  capturedStones: {
    black: number;
    white: number;
  };
  history: GameMove[];             // ← ALL MOVES STORED HERE
  status: 'waiting' | 'playing' | 'finished' | 'scoring';
  winner: StoneColor | null;
  // ... other properties
}
```

## Storage Locations

### 1. Primary Storage: GameState.history

**Location**: Every `GameState` object
**Type**: `GameMove[]`
**Purpose**: Canonical record of all moves in chronological order

```typescript
// Accessing moves
const allMoves = gameState.history;
const moveCount = gameState.history.length;
const lastMove = gameState.history[gameState.history.length - 1];
const stoneMoves = gameState.history.filter(move => !isPassMove(move));
```

### 2. Server Storage: activeGames Map

**Location**: `server/server.js`
**Structure**: `Map<gameId, GameState>`
**Purpose**: Authoritative game state storage

```javascript
// Server storage
const activeGames = new Map();

// Storing game state
activeGames.set(gameId, gameState);

// Retrieving game state
const gameState = activeGames.get(gameId);
```

**Enhanced Move Storage:**
- Full move metadata including timing
- Capture information
- Player state at time of move
- Validation and rule enforcement

### 3. Client Storage: React State

**Location**: `src/context/GameContext.tsx`
**Purpose**: Real-time game state for UI updates

```typescript
// Client state management
const [state, dispatch] = useReducer(gameReducer, initialState);

// Updating moves
dispatch({ 
  type: 'UPDATE_GAME_STATE', 
  payload: updatedGameState 
});
```

### 4. Persistent Storage: localStorage

**Location**: Browser localStorage
**Key**: `gosei-game-${gameId}`
**Purpose**: Game persistence across sessions

```typescript
// Saving to localStorage
localStorage.setItem(`gosei-game-${gameId}`, JSON.stringify(gameState));

// Loading from localStorage
const savedGame = localStorage.getItem(`gosei-game-${gameId}`);
const gameState = JSON.parse(savedGame);
```

## Move Flow

### 1. Move Creation

```typescript
// Stone placement
const position: Position = { x: 4, y: 4 };

// Pass move
const passMove = { pass: true };
```

### 2. Client-Side Processing

```typescript
// In GameContext.tsx - placeStone()
const result = applyGoRules(position, currentPlayer.color, gameState);
const updatedGameState = {
  ...gameState,
  history: [...gameState.history, position],  // Add to history
  currentTurn: toggleTurn(gameState.currentTurn),
  // ... other updates
};

// Update local state
dispatch({ type: 'UPDATE_GAME_STATE', payload: updatedGameState });

// Send to server
socket.emit('makeMove', {
  gameId: gameState.id,
  position,
  color: currentPlayer.color,
  playerId: currentPlayer.id
});
```

### 3. Server-Side Processing

```javascript
// In server.js - makeMove handler
socket.on('makeMove', ({ gameId, position, color, playerId }) => {
  const gameState = activeGames.get(gameId);
  
  // Validate move
  const isValid = validateMove(position, gameState);
  
  // Apply move with captures
  const result = captureDeadStones(gameState, updatedStones, position, color);
  
  // Create enhanced move entry
  const moveHistoryEntry = {
    position: position,
    color: color,
    playerId: playerId,
    timestamp: Date.now(),
    // ... additional metadata
  };
  
  // Add to history
  gameState.history.push(moveHistoryEntry);
  
  // Broadcast update
  broadcastGameUpdate(gameId, gameState);
});
```

### 4. State Synchronization

```typescript
// Client receives update
socket.on('gameState', (updatedGameState) => {
  dispatch({ type: 'UPDATE_GAME_STATE', payload: updatedGameState });
  
  // Persist to localStorage
  localStorage.setItem(`gosei-game-${gameState.id}`, JSON.stringify(updatedGameState));
});
```

## Synchronization

### Real-Time Updates

1. **WebSocket Events**:
   - `gameState` - Full state update
   - `moveMade` - Immediate move notification
   - `turnPassed` - Pass move notification

2. **Event Flow**:
   ```
   Client Move → Server Validation → State Update → Broadcast → All Clients Updated
   ```

3. **Conflict Resolution**:
   - Server is authoritative
   - Client optimistic updates
   - Server validation overrides

### Persistence Strategy

1. **Auto-save**: After each move
2. **Manual save**: User-initiated
3. **Session recovery**: On reconnection
4. **Cleanup**: Old games removed periodically

## Undo System

### Undo Request

```typescript
// Client requests undo
const requestUndo = () => {
  const moveIndex = gameState.history.length - 1;  // Last move
  
  const undoRequest = {
    requestedBy: currentPlayer.id,
    moveIndex: moveIndex
  };
  
  socket.emit('requestUndo', {
    gameId: gameState.id,
    playerId: currentPlayer.id,
    moveIndex: moveIndex
  });
};
```

### Server Undo Processing

```javascript
// Server processes undo
socket.on('respondToUndoRequest', ({ gameId, accepted, moveIndex }) => {
  if (accepted) {
    // Keep moves up to but not including moveIndex
    const historyToKeep = gameState.history.slice(0, moveIndex);
    
    // Replay game from beginning
    const newGameState = replayGameFromHistory(historyToKeep);
    
    // Update and broadcast
    activeGames.set(gameId, newGameState);
    broadcastGameUpdate(gameId, newGameState);
  }
});
```

### Replay Logic

```javascript
function replayGameFromHistory(historyToKeep) {
  let stones = [];
  let currentTurn = 'black';
  let capturedStones = { black: 0, white: 0 };
  
  // Add handicap stones if applicable
  if (gameState.gameType === 'handicap') {
    stones = getHandicapStones(gameState.board.size, gameState.handicap);
    currentTurn = 'white';
  }
  
  // Replay each move with proper capture logic
  historyToKeep.forEach((move, index) => {
    if (!move.pass) {
      // Add stone
      stones.push({ position: move.position || move, color: currentTurn });
      
      // Apply captures
      const captureResult = captureDeadStones(gameState, stones, move.position, currentTurn);
      stones = captureResult.remainingStones;
      
      // Update capture counts
      capturedStones[currentTurn] += captureResult.capturedCount;
    }
    
    // Toggle turn
    currentTurn = currentTurn === 'black' ? 'white' : 'black';
  });
  
  return { stones, currentTurn, capturedStones, history: historyToKeep };
}
```

## Debugging

### Common Issues

1. **Desynchronized State**:
   ```typescript
   // Check for differences
   console.log('Client moves:', gameState.history.length);
   console.log('Server moves:', serverGameState.history.length);
   ```

2. **Move Validation Failures**:
   ```typescript
   // Debug move validation
   console.log('Move position:', position);
   console.log('Current board:', gameState.board.stones);
   console.log('Validation result:', applyGoRules(position, color, gameState));
   ```

3. **Undo Issues**:
   ```typescript
   // Debug undo state
   console.log('Undo request:', gameState.undoRequest);
   console.log('Move to undo:', gameState.history[moveIndex]);
   console.log('Moves after undo:', gameState.history.slice(0, moveIndex));
   ```

### Debugging Commands

```javascript
// Server console
console.log('Active games:', activeGames.size);
console.log('Game state:', JSON.stringify(gameState, null, 2));
console.log('Move history:', gameState.history.map((m, i) => `${i}: ${JSON.stringify(m)}`));

// Client console
console.log('Current game:', gameState);
console.log('Move count:', gameState.history.length);
console.log('Last move:', gameState.history[gameState.history.length - 1]);
```

## API Reference

### Key Functions

#### Client-Side (`GameContext.tsx`)

```typescript
// Place a stone
placeStone(position: Position): void

// Pass turn
passTurn(): void

// Request undo
requestUndo(): void

// Respond to undo
respondToUndoRequest(accept: boolean): void
```

#### Server-Side (`server.js`)

```javascript
// Handle move
socket.on('makeMove', ({ gameId, position, color, playerId }) => {})

// Handle pass
socket.on('passTurn', ({ gameId, color, playerId }) => {})

// Handle undo request
socket.on('requestUndo', ({ gameId, playerId, moveIndex }) => {})

// Handle undo response
socket.on('respondToUndoRequest', ({ gameId, playerId, accepted, moveIndex }) => {})
```

#### Utility Functions

```typescript
// Check if move is a pass
isPassMove(move: GameMove): move is { pass: true }

// Create pass move
createPassMove(): { pass: true }

// Apply Go rules
applyGoRules(position: Position, color: StoneColor, gameState: GameState)

// Capture dead stones
captureDeadStones(gameState: GameState, stones: Stone[], position: Position, color: StoneColor)
```

### Socket Events

| Event | Direction | Purpose |
|-------|-----------|---------|
| `makeMove` | Client → Server | Send move to server |
| `passTurn` | Client → Server | Send pass to server |
| `gameState` | Server → Client | Broadcast full state |
| `moveMade` | Server → Client | Immediate move notification |
| `requestUndo` | Client → Server | Request move undo |
| `respondToUndoRequest` | Client → Server | Respond to undo request |

## File Locations

- **Types**: `src/types/go.ts`
- **Client Logic**: `src/context/GameContext.tsx`
- **Server Logic**: `server/server.js`
- **Go Rules**: `src/utils/goGameLogic.ts`
- **Undo UI**: `src/components/UndoNotification.tsx`

## Related Documentation

- [VERSION.md](VERSION.md) - Version history and feature changes
- [KO_RULE_IMPLEMENTATION.md](KO_RULE_IMPLEMENTATION.md) - Ko rule handling
- [TIME_TRACKING_SYSTEM.md](TIME_TRACKING_SYSTEM.md) - Time management
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Common issues and solutions

---

**Last Updated**: December 2024  
**Version**: 1.0.0 