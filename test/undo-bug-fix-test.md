# Undo Bug Fix Test - Specific Scenario

## Bug Description
When Black has made 3 moves and White has made 2 moves (5 total moves), and Black requests undo, when White accepts, it was clearing ALL moves instead of just the last move.

## Test Scenario

### Setup
1. Start a new game
2. Play exactly 5 moves:
   - Move 1: Black places stone at (4,4)
   - Move 2: White places stone at (16,16) 
   - Move 3: Black places stone at (4,16)
   - Move 4: White places stone at (16,4)
   - Move 5: Black places stone at (10,10)

### The Bug Test
1. **Black** clicks "Undo" (wants to undo move 5)
2. **White** clicks "Accept" on the notification
3. **Expected Result**: 
   - Only move 5 should be removed
   - Board should have 4 stones remaining at: (4,4), (16,16), (4,16), (16,4)
   - History should show 4 moves
   - Turn should be Black's turn (since we removed Black's move)

### What Was Happening Before Fix
- All moves were being cleared
- Board would be empty 
- History would be empty
- This was due to incorrect replay logic in server

### Root Cause
The server's undo logic had multiple issues:
1. **Incorrect replay**: The replay logic didn't properly handle captures
2. **Move format**: Handling of `move.position` vs direct `move` object
3. **Turn calculation**: Incorrect turn calculation after undo
4. **Capture tracking**: Not properly recalculating captured stones

### Fix Applied
```javascript
// Before (buggy):
historyToKeep.forEach(move => {
  if (!move.pass) {
    stones.push({
      position: move,  // This could be wrong format
      color: currentTurn
    });
    // No capture logic applied during replay
  }
});

// After (fixed):
historyToKeep.forEach((move, index) => {
  if (!move.pass) {
    const newStone = {
      position: move.position || move, // Handle both formats
      color: currentTurn
    };
    stones.push(newStone);
    
    // Apply proper capture logic during replay
    const captureResult = captureDeadStones(...);
    stones = captureResult.remainingStones;
    // ... proper capture counting
  }
});
```

### Verification Steps
1. Follow the test scenario above
2. Check browser console for server logs:
   - Should show: "Keeping 4 moves out of 5 total moves"
   - Should show: "Replayed move X: color at (x,y)"
   - Should show: "Undo completed: Board has 4 stones"
3. Verify board state matches expected result
4. Verify turn is correct after undo 