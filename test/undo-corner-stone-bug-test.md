# Undo Corner Stone Bug Test

## Bug Description
**CRITICAL**: When a player requests undo and the opponent accepts, a stone of the accepting player's color was being placed in the corner of the board. This was causing game corruption and confusion.

## Root Cause Analysis
The bug was in the server-side undo logic (`server/server.js`):

1. **Faulty handicap detection**: The logic was adding handicap stones even for normal games
2. **Invalid move format handling**: `move.position || move` could create invalid positions
3. **Client-side interference**: Client was doing its own undo logic instead of letting server handle it

## Fixes Applied

### Server-side fixes (`server/server.js`):
```javascript
// OLD (buggy):
if (gameState.gameType === 'handicap' && gameState.handicap > 0) {
  const handicapStones = getHandicapStones(gameState.board.size, gameState.handicap);
  stones = handicapStones;
}

// NEW (fixed):
if (gameState.gameType === 'handicap' && gameState.handicap > 0 && historyToKeep.length === 0) {
  const handicapStones = getHandicapStones(gameState.board.size, gameState.handicap);
  stones = handicapStones;
}
```

```javascript
// OLD (buggy):
position: move.position || move, // Handle both old and new move formats

// NEW (fixed):
let position;
if (move.position && typeof move.position === 'object' && typeof move.position.x === 'number' && typeof move.position.y === 'number') {
  position = move.position;
} else if (typeof move === 'object' && typeof move.x === 'number' && typeof move.y === 'number') {
  position = move;
} else {
  log(`ERROR: Invalid move format during undo replay at index ${index}:`, move);
  return; // Skip this invalid move
}
```

### Client-side fixes (`src/context/GameContext.tsx`):
- Removed client-side undo replay logic
- Let server handle all undo operations
- Client now only sends undo response to server and waits for authoritative update

## Test Scenarios

### Scenario 1: Normal Game Undo
1. **Setup**: Start a normal (non-handicap) game
2. **Play**: Make 3-4 moves alternating between players
3. **Undo**: Player A requests undo
4. **Accept**: Player B accepts the undo
5. **Expected**: Only the last move should be removed, no stones should appear in corners
6. **Verify**: Check that board state matches expected (one fewer stone)

### Scenario 2: Multiple Undos
1. **Setup**: Same as Scenario 1
2. **Play**: Make several moves
3. **Undo**: Request and accept multiple undos in sequence
4. **Expected**: Each undo should remove exactly one move, no phantom stones

### Scenario 3: Handicap Game Undo (Should still work)
1. **Setup**: Start a handicap game with 2-3 stones
2. **Play**: Make some moves after handicap stones are placed
3. **Undo**: Request undo to a point after handicap stones but before some regular moves
4. **Expected**: Should revert to correct point with handicap stones intact

### Scenario 4: Edge Cases
1. **First move undo**: Undo the very first move of the game
2. **Pass move undo**: Undo a pass move
3. **Capture sequence undo**: Undo after a capture has occurred

## Test Procedure

### Pre-test Setup
1. Start server: `cd server && npm start`
2. Start client: `npm start`
3. Open two browser windows/tabs

### Testing Steps
1. Create a new normal game (not handicap)
2. Join with second player
3. Make exactly 5 moves:
   - Move 1: Black at (10,10)
   - Move 2: White at (10,11)
   - Move 3: Black at (11,10)
   - Move 4: White at (11,11)
   - Move 5: Black at (12,10)

4. **Black requests undo** (to undo move 5)
5. **White accepts undo**

### Expected Results
- Board should have exactly 4 stones at: (10,10), (10,11), (11,10), (11,11)
- No stones should appear at corners: (0,0), (18,18), etc.
- Turn should be Black's turn (since Black's move was undone)
- History should show 4 moves instead of 5

### Success Criteria
✅ **No phantom stones appear anywhere on the board**
✅ **Exact correct number of stones remain**
✅ **Correct turn order maintained**
✅ **No console errors about invalid positions**

### What to Watch For
🚫 **Stones appearing at (0,0) or other corners**
🚫 **Wrong number of stones on board**
🚫 **Console errors about invalid move formats**
🚫 **Turn order confusion**

## Server Logs to Monitor
When testing, check server console for these logs:
- `Undo accepted: Keeping X moves out of Y total moves`
- `Replayed move N: color at (x, y), captured Z stones`
- `Undo completed: Board has X stones, next turn: color`

Should NOT see:
- `Added N handicap stones` (for normal games)
- `ERROR: Invalid move format during undo replay`
- `ERROR: Invalid position during undo replay`

## Manual Verification
After each undo test:
1. Count stones on board manually
2. Verify no stones in corners unless they should be there
3. Check that turn indicator shows correct player
4. Verify game continues normally after undo 