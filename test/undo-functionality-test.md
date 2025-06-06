# Undo Functionality Test Guide

## Testing the Undo Notification System

### Setup
1. Start the server: `cd server && npm start`
2. Start the client: `npm start`
3. Create a new game
4. Share the game link and join with a second player (or open in incognito mode)

### Test Steps

#### 1. Basic Undo Request Test
1. **Player 1** places a stone on the board (Player 1's undo button is disabled)
2. **Player 2** places a stone on the board (now Player 1's undo button is enabled)  
3. **Player 1** clicks the "Undo" button (can only undo after opponent's turn)
4. **Expected Result**: 
   - Player 1's undo button shows "Undo Pending..."
   - Player 2 sees a notification: "Your opponent has requested to undo move X"
   - Notification has "Accept" and "Decline" buttons

#### 2. Accept Undo Test
1. Follow steps 1-3 from Basic Test
2. **Player 2** clicks "Accept" on the notification
3. **Expected Result**: 
   - Board reverts by removing just the last move
   - Game state shows one fewer move in history
   - Turn goes to the appropriate player
   - Notification disappears

#### 3. Decline Undo Test
1. Follow steps 1-3 from Basic Test
2. **Player 2** clicks "Decline" on the notification
3. **Expected Result**: 
   - Board remains unchanged
   - Game continues normally
   - Notification disappears
   - Player 1's undo button returns to normal

#### 4. Edge Cases

##### No Moves to Undo
1. Start a new game with no moves
2. **Player 1** tries to click "Undo"
3. **Expected Result**: Button should be disabled

##### Game Not in Playing State
1. During game setup (waiting for player)
2. Try to click "Undo"
3. **Expected Result**: Button should be disabled

##### Multiple Undo Requests
1. **Player 1** requests undo
2. **Player 1** tries to request undo again
3. **Expected Result**: Button should be disabled while pending

### Key Implementation Details

- ✅ UndoNotification component is imported and used
- ✅ Conditional rendering based on undoRequest presence
- ✅ Only shows to opponent (not requester)
- ✅ Undo button disabled appropriately
- ✅ Visual feedback for pending requests
- ✅ Server handles undo logic correctly
- ✅ Game state updates properly

### Technical Flow

1. **Request**: Player clicks "Undo" → `requestUndo()` → `socket.emit('requestUndo')`
2. **Server**: Receives request → Updates game state → `broadcastGameUpdate()`
3. **Notification**: Game state updated → `gameState.undoRequest` exists → Shows UndoNotification
4. **Response**: Opponent clicks Accept/Decline → `respondToUndoRequest()` → `socket.emit('respondToUndoRequest')`
5. **Resolution**: Server processes response → Reverts last move only → Updates game state → Broadcasts update → Notification disappears

### Behavior Changes Made

#### Undo Timing Logic
- **Fixed**: Players can only request undo when it's NOT their turn (after they've made a move)
- **Before**: `disabled={!isPlayerTurn || ...}` (could only undo during own turn)
- **After**: `disabled={isPlayerTurn || ...}` (can only undo when it's opponent's turn)
- **Logic**: You can only undo your previous move after your opponent's turn starts

#### Undo Move Count
- **Fixed**: Changed from undoing last 2 moves to undoing only the last 1 move
- **Before**: `moveIndex = Math.max(0, gameState.history.length - 2)` (removed 2 moves)
- **After**: `moveIndex = gameState.history.length - 1` (removes 1 move)
- **Result**: Now properly undoes just the previous move instead of removing all moves

#### Theme Compatibility
- **Fixed**: All undo-related UI components now support dark/light themes
- **Updated**: UndoNotification, undo button, and status indicators
- **Result**: Consistent theme support across all undo functionality 