# Time Tracking System

## Current Status: v0.0.8 ✅

**Implementation**: Production Ready | **Last Updated**: May 26, 2025

## Overview

Gosei Play implements an advanced move-based time tracking system that provides accurate, fair, and transparent timing for competitive Go games. This system replaces traditional continuous countdown timers with precise move-based time deduction.

## Core Principles

### 1. Move-Based Deduction
Time is only deducted when actual moves or passes are made, not during continuous countdown. This ensures:
- **Accuracy**: Time reflects actual thinking time
- **Fairness**: No time lost to network lag or system delays
- **Transparency**: Clear record of time spent on each move

### 2. Precise Time Calculation
Each move records the exact time spent thinking:
```
Time Spent = Move Time - Turn Start Time
```

### 3. Real-Time Synchronization
All players receive immediate time updates after each move, ensuring consistent game state across all clients.

## System Architecture

### Server-Side Implementation

#### Core Functions
```javascript
// Calculate actual time spent on a move
function calculateMoveTime(gameState) {
  if (!gameState.lastMoveTime) {
    return 0;
  }
  return Math.floor((Date.now() - gameState.lastMoveTime) / 1000);
}

// Format time display consistently
function formatMoveTimeDisplay(timeSpentSeconds) {
  const minutes = Math.floor(timeSpentSeconds / 60);
  const seconds = timeSpentSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}s`;
}
```

#### Time Deduction Process
1. **Turn Start**: `gameState.lastMoveTime` is set when a player's turn begins
2. **Move Made**: Calculate time spent using `calculateMoveTime()`
3. **Time Deduction**: Deduct spent time from player's remaining time
4. **State Update**: Update player's time state and broadcast to all clients
5. **Next Turn**: Reset timer for the next player

### Client-Side Integration

The system is fully compatible with existing client-side timer components:
- **GameTimer.js**: Receives accurate time updates from server
- **TimeDisplay.js**: Displays current time state without local countdown
- **TimeControl.tsx**: Manages time control settings and display

## Time Control Types

### Main Time
Standard time allocation for each player:
```javascript
// Deduct from main time
const newMainTime = Math.max(0, movingPlayer.timeRemaining - timeSpentOnMove);
movingPlayer.timeRemaining = newMainTime;

// Check for main time expiration
if (newMainTime <= 0 && gameState.timeControl.byoYomiPeriods > 0) {
  // Transition to byo-yomi
  movingPlayer.isInByoYomi = true;
  movingPlayer.byoYomiPeriodsLeft = gameState.timeControl.byoYomiPeriods;
  movingPlayer.byoYomiTimeLeft = gameState.timeControl.byoYomiTime;
}
```

### Byo-Yomi Periods
Japanese time control system with additional time periods:
```javascript
// Deduct from byo-yomi time
const newByoYomiTime = Math.max(0, movingPlayer.byoYomiTimeLeft - timeSpentOnMove);
movingPlayer.byoYomiTimeLeft = newByoYomiTime;

// Check for period expiration
if (newByoYomiTime <= 0 && movingPlayer.byoYomiPeriodsLeft > 1) {
  // Move to next byo-yomi period
  movingPlayer.byoYomiPeriodsLeft -= 1;
  movingPlayer.byoYomiTimeLeft = gameState.timeControl.byoYomiTime;
}
```

### Blitz Games
Time-per-move format for fast games:
```javascript
// Reset timer for each move
if (gameState.gameType === 'blitz' && gameState.timePerMove) {
  movingPlayer.timeRemaining = gameState.timePerMove;
}
```

## Features

### ✅ Accurate Move Timing
- Each move records exact time spent thinking
- Time displayed in MM:SS format (e.g., "00:15s" for 15 seconds)
- Both moves and passes record time spent
- **Unlimited time support**: Displays ∞ symbol when main time = 0

### ✅ Proper Time Deduction
- Time deducted from player's remaining time when moves are made
- Main time decreases based on actual time spent
- Byo-yomi periods consumed based on actual usage

### ✅ Automatic Transitions
- Seamless transition from main time to byo-yomi when main time expires
- Automatic progression through byo-yomi periods
- Clear logging of all time state changes

### ✅ Real-Time Updates
- All clients receive immediate time updates after each move
- Consistent time state across all connected clients
- Enhanced logging for debugging and monitoring

## Logging and Monitoring

### Move Tracking
```
🎯 MOVE TRACKED - Player made move at (4, 4) - Time spent: 00:10s (Main)
⏰ TIME DEDUCTED - Player black spent 10s from main time, 110s remaining
📤 TIME UPDATE SENT - Player black: Main=110s, InByoYomi=false
```

### Byo-Yomi Transitions
```
🚨 ENTERING BYO-YOMI: Player black entered byo-yomi with 5 periods
⏳ BYO-YOMI PERIOD USED: Player black used one period, 4 periods remaining
```

### Pass Tracking
```
🎯 PASS TRACKED - Player passed - Time spent: 00:05s (Byo-yomi)
⏰ TIME DEDUCTED (PASS) - Player white spent 5s in byo-yomi, 35s remaining in period
```

## Benefits

### 🎯 Accuracy
- Time tracking matches actual thinking time
- No timer drift or synchronization issues
- Precise byo-yomi period management

### 🚀 Performance
- Reduced server load (no continuous timer updates)
- More efficient network usage
- Better scalability for multiple games

### 🎮 User Experience
- Clear feedback on time spent per move
- Accurate time remaining displays
- Proper byo-yomi transitions

### 🔧 Maintainability
- Simplified timer logic
- Better debugging capabilities
- Clear separation of concerns

## Configuration

### Time Control Settings
```javascript
// Standard time control
{
  timeControl: 120,        // 2 minutes main time
  byoYomiPeriods: 5,       // 5 byo-yomi periods
  byoYomiTime: 40          // 40 seconds per period
}

// Unlimited time control (displays as ∞)
{
  timeControl: 0,          // 0 minutes = unlimited time
  byoYomiPeriods: 0,       // No byo-yomi periods
  byoYomiTime: 0           // No byo-yomi time
}

// Blitz time control
{
  gameType: 'blitz',
  timePerMove: 30          // 30 seconds per move
}
```

### Game State Structure
```javascript
{
  lastMoveTime: 1640995200000,  // Timestamp when current turn started
  players: [
    {
      id: "player1",
      color: "black",
      timeRemaining: 120,         // Main time remaining (seconds)
      isInByoYomi: false,         // Whether in byo-yomi mode
      byoYomiPeriodsLeft: 5,      // Byo-yomi periods remaining
      byoYomiTimeLeft: 40         // Time left in current period
    }
  ]
}
```

## Testing

### Test Scenarios
- ✅ Various time control settings (2 minutes + 5×40s byo-yomi)
- ✅ Main time to byo-yomi transitions
- ✅ Multiple byo-yomi period consumption
- ✅ Both moves and passes
- ✅ Multiple concurrent games
- ✅ Network disconnection and reconnection
- ✅ Game state synchronization

### Performance Testing
- ✅ Multiple simultaneous games (10+ concurrent)
- ✅ Long games with many moves (200+ moves)
- ✅ Rapid move sequences (blitz games)
- ✅ Memory usage and cleanup

## Migration and Compatibility

### Backward Compatibility
- All existing games continue to work
- No client-side changes required
- Existing time control settings preserved
- Compatible with all board sizes and game types

### Migration Process
1. Server automatically uses new time tracking for new games
2. Existing games maintain their current timer behavior
3. No database migrations required
4. Gradual rollout possible

## Troubleshooting

### Common Issues

#### Time Not Deducting
- **Cause**: `gameState.lastMoveTime` not set
- **Solution**: Ensure timer is reset when turns change
- **Debug**: Check server logs for "TIMER CALCULATION" messages

#### Incorrect Time Display
- **Cause**: Client-server synchronization issue
- **Solution**: Force time update broadcast
- **Debug**: Check "TIME UPDATE SENT" logs

#### Byo-Yomi Not Triggering
- **Cause**: Time control configuration missing
- **Solution**: Verify `byoYomiPeriods > 0` in game settings
- **Debug**: Check "ENTERING BYO-YOMI" logs

### Debug Commands
```javascript
// Server-side debugging
console.log('Game state:', JSON.stringify(gameState, null, 2));
console.log('Player times:', gameState.players.map(p => ({
  color: p.color,
  main: p.timeRemaining,
  byoyomi: p.byoYomiTimeLeft,
  periods: p.byoYomiPeriodsLeft
})));
```

## Future Enhancements

### Planned Features
- **Move Time Statistics**: Analysis of time usage patterns
- **Time Pressure Indicators**: Visual warnings for low time
- **Historical Time Data**: Move-by-move time analysis
- **Tournament Presets**: Common tournament time control formats

### Advanced Features
- **Fischer Increment**: Add time per move
- **Canadian Overtime**: Stones per time period
- **Absolute Time**: No overtime periods
- **Custom Time Controls**: User-defined time systems

## Related Documentation

- **[BYO_YOMI_CLOCK_RESET_ISSUE.md](BYO_YOMI_CLOCK_RESET_ISSUE.md)** - Implementation details and resolution
- **[TIME_CONTROL_FLEXIBILITY.md](TIME_CONTROL_FLEXIBILITY.md)** - Time control configuration options
- **[BYO_YOMI_TIMEOUT.md](BYO_YOMI_TIMEOUT.md)** - Byo-yomi timeout handling
- **[VERSION.md](VERSION.md)** - Version history and changes

## Technical Support

For technical issues or questions about the time tracking system:
1. Check server logs for timing-related messages
2. Verify game state synchronization
3. Test with simple time control settings
4. Review network connectivity and latency

The time tracking system is designed to be robust and self-healing, automatically recovering from most synchronization issues. 