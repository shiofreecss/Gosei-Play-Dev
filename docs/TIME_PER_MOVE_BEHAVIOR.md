# Time per Move Behavior

## Current Version: v0.0.8 ✅

**Status**: Production Ready | **Last Updated**: May 26, 2025

## Overview

The Time per Move system in Gosei Play provides automatic game type detection and configuration based on the time per move setting. This document details how the system behaves and integrates with different game types.

## Core Behaviors

### Automatic Game Type Detection

#### Even Game Detection
```typescript
// When Time per Move is set to 0
if (timePerMove === 0) {
  gameType = 'even';
  mainTime = getRecommendedTimeForBoardSize(boardSize);
  byoYomiEnabled = true;
}
```

#### Blitz Game Detection
```typescript
// When Time per Move is set to 5+ seconds
if (timePerMove >= 5) {
  gameType = 'blitz';
  mainTime = 0;
  byoYomiEnabled = false;
}
```

## Game Type Integration

### Even/Handicap/Teaching Games
- **Time per Move**: Must be 0 (disabled)
- **Main Time**: Based on board size recommendations
- **Byo-yomi**: Available for use
- **Fischer Increment**: Optional

### Blitz Games
- **Time per Move**: Must be 5+ seconds
- **Main Time**: Automatically set to 0
- **Byo-yomi**: Automatically disabled
- **Fischer Increment**: Available for use

## Implementation Details

### Time Control Validation
```typescript
function validateTimePerMove(settings: GameSettings): ValidationResult {
  // Validate Blitz game settings
  if (settings.gameType === 'blitz') {
    if (settings.timePerMove < 5) {
      return {
        valid: false,
        error: 'Blitz games require at least 5 seconds per move'
      };
    }
  }
  
  // Validate standard game settings
  if (['even', 'handicap', 'teaching'].includes(settings.gameType)) {
    if (settings.timePerMove !== 0) {
      return {
        valid: false,
        error: 'Time per move must be disabled (0) for standard games'
      };
    }
  }
  
  return { valid: true };
}
```

### Game Type Detection
```typescript
function detectGameTypeFromTime(timePerMove: number): GameType {
  if (timePerMove >= 5) {
    return 'blitz';
  }
  return 'even';
}
```

### Time Control Updates
```typescript
function updateTimeControls(settings: GameSettings): void {
  if (settings.timePerMove >= 5) {
    // Blitz game configuration
    settings.mainTime = 0;
    settings.byoYomiEnabled = false;
    settings.byoYomiPeriods = 0;
  } else {
    // Standard game configuration
    settings.mainTime = getRecommendedTimeForBoardSize(settings.boardSize);
    settings.byoYomiEnabled = true;
  }
}
```

## User Interface Behavior

### Time per Move Input
- **Step Value**: 5 seconds for Blitz games
- **Minimum**: 5 seconds for Blitz
- **Maximum**: 60 seconds for Blitz
- **Disabled**: For standard games (Even/Handicap/Teaching)

### Visual Feedback
- Clear indication of current game type
- Automatic updates to related controls
- Warning messages for invalid settings
- Success messages for valid configurations

## Time Control Matrix

| Setting | Even Game | Handicap Game | Teaching Game | Blitz Game |
|---------|-----------|---------------|---------------|------------|
| Time per Move | 0 | 0 | 0 | 5+ seconds |
| Main Time | Board-based | Board-based | 2x Board-based | 0 |
| Byo-yomi | Available | Available | Available | Disabled |
| Fischer | Optional | Optional | Optional | Optional |

## Validation Rules

### Blitz Game Rules
1. Time per move must be ≥ 5 seconds
2. Main time must be 0
3. Byo-yomi must be disabled
4. Fischer increment is optional

### Standard Game Rules
1. Time per move must be 0
2. Main time follows board recommendations
3. Byo-yomi is available
4. Fischer increment is optional

## Error Handling

### Common Issues
1. **Invalid Time per Move**
   - Below minimum for Blitz
   - Non-zero for standard games
   - Above maximum for Blitz

2. **Resolution Steps**
   - Automatic correction when possible
   - Clear error messages
   - Suggested valid configurations

### Error Messages
```typescript
const timePerMoveErrors = {
  blitzTooLow: 'Blitz games require at least 5 seconds per move',
  standardNonZero: 'Standard games must have Time per Move set to 0',
  blitzTooHigh: 'Maximum Time per Move for Blitz games is 60 seconds'
};
```

## Best Practices

### Setting Up Games
1. **Choose Time per Move First**
   - Determines game type automatically
   - Sets appropriate defaults
   - Enables/disables relevant controls

2. **Adjust Other Settings**
   - Work within game type constraints
   - Use recommended values
   - Consider player skill levels

3. **Verify Configuration**
   - Check all time settings
   - Ensure settings match game goals
   - Test with practice games

## Testing Strategy

### Test Scenarios
- ✅ Game type detection accuracy
- ✅ Time control validation
- ✅ UI feedback and updates
- ✅ Error handling
- ✅ Setting persistence

### Performance Testing
- ✅ Multiple concurrent games
- ✅ Rapid setting changes
- ✅ UI responsiveness
- ✅ State consistency

## Logging and Monitoring

### Server Logs
```
[Time] Game type changed to blitz (timePerMove: 5s)
[Time] Time controls updated for blitz configuration
[Time] Invalid time per move setting detected (3s for blitz)
```

### Client Logs
```
[UI] Time per move changed: 5s → blitz mode
[UI] Controls updated for blitz configuration
[UI] Warning: Invalid time per move setting
```

## Future Enhancements

### Planned Features
- Custom time presets
- Tournament time controls
- Advanced Blitz variants
- Time usage analytics

### Long-term Goals
- AI-assisted time recommendations
- Dynamic time adjustments
- Professional tournament support
- Enhanced analytics tools

## Related Documentation

- [GAME_TYPE_TIME_CONTROL_BEHAVIOR.md](GAME_TYPE_TIME_CONTROL_BEHAVIOR.md)
- [TIME_TRACKING_SYSTEM.md](TIME_TRACKING_SYSTEM.md)
- [BYO_YOMI_IMPLEMENTATION_SUMMARY.md](BYO_YOMI_IMPLEMENTATION_SUMMARY.md)
- [VERSION.md](VERSION.md)

## Technical Support

For time per move related issues:
1. Check game type detection
2. Verify time control settings
3. Review error messages
4. Test with standard configurations

---

*This document details the Time per Move behavior in Gosei Play v0.0.8.* 