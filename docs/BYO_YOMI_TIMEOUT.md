# Byo-Yomi Timeout Implementation

## Overview

Byo-yomi is a Japanese time control system used in Go where players receive additional time periods after their main time expires. This implementation provides complete byo-yomi timeout functionality for Gosei Play.

## Features

### Core Byo-Yomi Functionality
- **Main Time**: Primary time allocation for the entire game
- **Byo-Yomi Periods**: Additional time periods (3, 5, or 7) after main time expires
- **Period Reset**: Time resets to full period when a move is made
- **Progressive Timeout**: Players lose one period when time expires
- **Final Timeout**: Game ends when all periods are exhausted

### Server-Side Implementation
- Real-time timer tracking with 1-second precision
- Automatic transition from main time to byo-yomi
- Period management and countdown
- Timeout notifications with proper game result notation
- Move/pass handling that resets current byo-yomi period

### Client-Side Features
- Visual byo-yomi indicators in TimeControl component
- Real-time period countdown display
- Audio warnings for time pressure
- Synchronized state with server
- Proper cleanup of event listeners

## Technical Implementation

### Data Structures

#### Player Interface (Enhanced)
```typescript
interface Player {
  id: string;
  username: string;
  color: StoneColor;
  timeRemaining?: number; // Main time in seconds
  byoYomiPeriodsLeft?: number; // Periods remaining
  byoYomiTimeLeft?: number; // Time left in current period
  isInByoYomi?: boolean; // Whether in byo-yomi mode
}
```

#### TimeControl Props (Enhanced)
```typescript
interface TimeControlProps {
  // ... existing props
  blackByoYomiPeriodsLeft?: number;
  whiteByoYomiPeriodsLeft?: number;
  blackByoYomiTimeLeft?: number;
  whiteByoYomiTimeLeft?: number;
  blackIsInByoYomi?: boolean;
  whiteIsInByoYomi?: boolean;
}
```

### Server Events

#### Timer Management
- `timerTick`: Handles countdown for both main time and byo-yomi
- `byoYomiStarted`: Notifies when player enters byo-yomi
- `byoYomiPeriodUsed`: Notifies when a period is consumed
- `playerTimeout`: Handles final timeout with proper result notation

#### Game State Updates
- `timeUpdate`: Broadcasts current time state including byo-yomi info
- `makeMove`/`passTurn`: Resets current byo-yomi period when move is made

### Client Event Handling

#### GameContext Integration
```typescript
// Byo-yomi event handlers
newSocket.on('byoYomiStarted', (data) => {
  // Show notification about entering byo-yomi
});

newSocket.on('byoYomiPeriodUsed', (data) => {
  // Show notification about period consumption
});

newSocket.on('timeUpdate', (data) => {
  // Update player time including byo-yomi state
});
```

## User Experience

### Visual Indicators
- **Main Time**: Standard MM:SS format
- **Byo-Yomi**: "BY 3×0:30" format (periods × time per period)
- **Period Count**: "3 periods left" below timer
- **Time Pressure**: Red highlighting and pulse animation

### Audio Feedback
- Warning sounds at 60s, 30s, 10s in main time
- Warning sounds at 10s, 5s in byo-yomi periods
- Special sound when entering byo-yomi
- Period transition notification sound

### Notifications
- "You've entered byo-yomi! 5 periods of 30 seconds each."
- "Byo-yomi period used! 4 periods remaining."
- "Black expired - White win (W+T)" / "White expired - Black win (B+T)"

## Game Flow

### Normal Game Flow
1. Players start with full main time
2. Time counts down during their turn
3. When main time reaches 0:
   - If byo-yomi periods available: Enter byo-yomi mode
   - If no byo-yomi: Player times out immediately

### Byo-Yomi Flow
1. Player enters byo-yomi with full period time
2. Time counts down during their turn
3. When move/pass is made: Period time resets to full
4. When period time reaches 0:
   - If more periods available: Start next period
   - If no periods left: Player times out

### Timeout Handling
1. Server detects timeout condition
2. Game status set to 'finished'
3. Winner determined (opposite color)
4. Result notation set (B+T or W+T)
5. Timeout message broadcast to all players

## Configuration

### Time Control Setup
```typescript
const timeControlOptions = {
  timeControl: 30,        // 30 minutes main time
  byoYomiPeriods: 5,      // 5 byo-yomi periods
  byoYomiTime: 30,        // 30 seconds per period
  // ... other options
};
```

### Recommended Settings
- **Casual Games**: 3 periods × 30 seconds
- **Tournament Games**: 5 periods × 30 seconds  
- **Professional Games**: 5 periods × 60 seconds

## Error Handling

### Network Issues
- Client maintains local timer as backup
- Server state takes precedence on reconnection
- Graceful degradation if socket disconnects

### Edge Cases
- Handle rapid move sequences during byo-yomi
- Prevent negative time values
- Proper cleanup on game end/leave

## Testing Scenarios

### Basic Byo-Yomi
1. Create game with 1 minute main time + 3×30s byo-yomi
2. Let main time expire
3. Verify transition to byo-yomi mode
4. Make moves to test period reset
5. Let all periods expire to test timeout

### Network Resilience
1. Start byo-yomi game
2. Disconnect/reconnect during byo-yomi
3. Verify state synchronization
4. Test timeout during disconnection

### Multiple Players
1. Both players enter byo-yomi
2. Verify independent period tracking
3. Test timeout of one player
4. Verify proper game end handling

## Performance Considerations

### Timer Precision
- Server updates every 1 second
- Client polls every 500ms for smooth UI
- Drift compensation using server timestamps

### Memory Management
- Proper cleanup of timer intervals
- Event listener removal on component unmount
- Game state cleanup on timeout

### Network Efficiency
- Batched time updates for both players
- Minimal payload for frequent updates
- Efficient state synchronization

## Future Enhancements

### Advanced Features
- Canadian byo-yomi (stones per period)
- Fischer increment integration with byo-yomi
- Spectator view of byo-yomi state
- Historical byo-yomi usage statistics

### UI Improvements
- Animated period transitions
- Customizable warning thresholds
- Enhanced mobile byo-yomi display
- Accessibility improvements for time pressure

## Troubleshooting

### Common Issues
- **Timer drift**: Server state takes precedence
- **Missing notifications**: Check event listener setup
- **Incorrect period count**: Verify server synchronization
- **Timeout not triggering**: Check handlePlayerTimeout function

### Debug Information
- Enable timer debug logs in GameContext
- Monitor server logs for byo-yomi events
- Check network tab for timeUpdate frequency
- Verify player state in game state updates

## Implementation Status

✅ **Completed Features**
- Server-side byo-yomi timer management
- Client-side byo-yomi state tracking
- Period reset on move/pass
- Timeout handling with proper notation
- Visual indicators and notifications
- Event cleanup and memory management

🔄 **In Progress**
- Comprehensive testing across scenarios
- Performance optimization
- Documentation completion

📋 **Future Work**
- Advanced byo-yomi variants
- Enhanced mobile experience
- Spectator features
- Analytics integration 