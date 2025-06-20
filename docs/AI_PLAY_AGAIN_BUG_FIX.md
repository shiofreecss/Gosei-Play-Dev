# AI Play Again Bug Fix

## Issue Summary
When playing again with AI, the system was failing with two critical errors:
1. `thinkingTimeSeconds is not defined` error in AI move generation
2. "KataGo model not found" error when recreating AI engines

## Root Cause Analysis

### Issue 1: thinkingTimeSeconds Undefined Error
**Location**: `server/managers/enhanced-ai-manager.js` line 457
**Problem**: The `thinkingTimeSeconds` variable was defined inside the try block but referenced in the catch block for error handling.

```javascript
// ❌ BEFORE - thinkingTimeSeconds only defined in try block
async _generateAIMove(gameState, color, engine) {
  try {
    const thinkingStartTime = Date.now();
    // ... move generation code ...
    const thinkingTimeSeconds = Math.max(1, Math.floor((thinkingEndTime - thinkingStartTime) / 1000));
  } catch (error) {
    // ❌ ERROR: thinkingTimeSeconds is undefined here
    return { 
      type: 'pass', 
      color,
      playerId: this.getAIPlayer(gameState, color).id,
      thinkingTime: thinkingTimeSeconds || 1  // ❌ ReferenceError
    };
  }
}
```

### Issue 2: Improper AI Engine Recreation
**Location**: `server/server.js` lines 2174-2194
**Problem**: The play again logic was creating KataGo engines directly instead of using the EnhancedAIManager, and wasn't preserving the `selectedNetworkId`.

```javascript
// ❌ BEFORE - Direct engine creation
const KataGoCPUEngine = require('./engines/katago-cpu');
const engine = new KataGoCPUEngine(aiSettings);
aiGameManager.aiPlayers.set(newGameId, engine);
await engine.initialize(); // ❌ This fails because model isn't properly set up
```

## Solutions Implemented

### Fix 1: Proper Variable Scoping
**File**: `server/managers/enhanced-ai-manager.js`

```javascript
// ✅ AFTER - thinkingTimeSeconds defined outside try block
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
    
    // ... rest of move generation logic ...
    
  } catch (error) {
    console.error(`❌ AI move generation failed: ${error.message}`);
    
    // ✅ Now thinkingTimeSeconds is properly defined
    return { 
      type: 'pass', 
      color,
      playerId: this.getAIPlayer(gameState, color).id,
      thinkingTime: thinkingTimeSeconds  // ✅ Works correctly
    };
  }
}
```

### Fix 2: Proper AI Manager Usage & Network Preservation
**File**: `server/server.js`

#### Preserve selectedNetworkId in new game state:
```javascript
// ✅ Preserve network selection for play again
const newGameState = {
  // ... other game state properties ...
  vsAI: originalGame.vsAI,
  aiLevel: originalGame.aiLevel,
  selectedNetworkId: originalGame.selectedNetworkId, // ✅ Added this line
  aiUndoUsed: false
};
```

#### Use proper AI manager methods:
```javascript
// ✅ AFTER - Use EnhancedAIManager methods
if (aiGameManager && originalGame.vsAI) {
  const humanPlayer = newGameState.players.find(p => !p.isAI);
  const aiPlayer = newGameState.players.find(p => p.isAI);
  
  if (humanPlayer && aiPlayer) {
    setTimeout(async () => {
      try {
        // Use the proper AI manager methods to recreate the AI game
        if (newGameState.selectedNetworkId) {
          log(`🤖 Recreating AI game with direct network selection: ${newGameState.selectedNetworkId}`);
          await aiGameManager.createAIGameWithDirectNetwork(newGameState, humanPlayer, newGameState.selectedNetworkId);
        } else {
          // Fallback to old method
          const aiLevel = originalGame.aiLevel || 'normal';
          log(`🤖 Recreating AI game with level: ${aiLevel}`);
          await aiGameManager.createAIGame(newGameState, humanPlayer, '5k', aiLevel);
        }
        
        log(`✅ AI engine recreated for new game ${newGameId}`);
      } catch (error) {
        log(`❌ Failed to recreate AI engine: ${error.message}`);
      }
    }, 100);
  }
}
```

## Testing Results

Created and ran comprehensive tests to verify the fixes:

1. ✅ **EnhancedAIManager instantiation** - Works correctly
2. ✅ **_generateAIMove error handling** - No more `thinkingTimeSeconds` undefined errors
3. ✅ **Method existence** - `createAIGameWithDirectNetwork` and `getNetworkById` methods available
4. ✅ **Network selection** - Direct network selection by ID works properly

## Expected Behavior After Fix

1. **First AI Game**: Works as before (no regression)
2. **Play Again with AI**: 
   - ✅ Preserves the selected AI network (e.g., "Very Strong Normal")
   - ✅ Creates new AI engine using proper EnhancedAIManager methods
   - ✅ No more "model not found" errors
   - ✅ No more `thinkingTimeSeconds` undefined errors
   - ✅ AI responds properly to human moves in the new game

## Files Modified

1. `server/managers/enhanced-ai-manager.js` - Fixed variable scoping in `_generateAIMove`
2. `server/server.js` - Fixed AI engine recreation in play again logic

## Backward Compatibility

Both fixes maintain full backward compatibility:
- Games without `selectedNetworkId` fall back to the old AI level system
- Error handling improvements don't change the API or expected behavior
- All existing functionality continues to work as before

The fixes ensure that "Play Again" with AI now works seamlessly for both direct network selection and legacy AI level selection methods. 