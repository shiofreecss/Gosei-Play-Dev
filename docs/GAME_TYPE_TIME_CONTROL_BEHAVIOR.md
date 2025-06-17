# Game Type Time Control Behavior

## Current Version: v0.0.9 ✅

**Status**: Production Ready | **Last Updated**: January 2025

## Overview

Gosei Play implements an intelligent time control system that automatically adjusts settings based on game type and user selections. This document details the automatic behaviors and relationships between game types and time controls.

## Game Type Automation

### Even Game
- **Time per Move**: Automatically set to 0 (disabled)
- **Main Time**: Uses board size recommendations
- **Byo-yomi**: Available for use
- **Fischer Increment**: Available but defaults to 0

### Handicap Game
- **Time per Move**: Automatically set to 0 (disabled)
- **Main Time**: Uses board size recommendations
- **Byo-yomi**: Available for use
- **Fischer Increment**: Available but defaults to 0

### Teaching Game
- **Time per Move**: Automatically set to 0 (disabled)
- **Main Time**: Extended recommendations (2x standard)
- **Byo-yomi**: Available for use
- **Fischer Increment**: Available but defaults to 0

### Blitz Game
- **Time per Move**: Must be 5+ seconds
- **Main Time**: Automatically set to 0
- **Byo-yomi**: Automatically disabled
- **Fischer Increment**: Available for quick time additions

## Automatic Time Control Behaviors

### Time per Move Settings
```typescript
// When Time per Move is set to 0
if (timePerMove === 0) {
  gameType = 'even';
  mainTime = getRecommendedTimeForBoardSize(boardSize);
  byoYomiEnabled = true;
}

// When Time per Move is set to 5+ seconds
if (timePerMove >= 5) {
  gameType = 'blitz';
  mainTime = 0;
  byoYomiEnabled = false;
}
```

### Byo-yomi Intelligence
```typescript
// When selecting any number of byo-yomi periods
if (byoYomiPeriods > 0) {
  byoYomiTime = 30; // Automatically set to 30 seconds
}

// Byo-yomi disabled for Blitz games
if (gameType === 'blitz') {
  byoYomiEnabled = false;
  byoYomiPeriods = 0;
}
```

## Time Control Matrix

| Game Type | Time per Move | Main Time | Byo-yomi | Fischer | Display |
|-----------|---------------|-----------|----------|---------|---------|
| Even | 0 (disabled) | Board-based or 0 (∞) | Available | Optional | MM:SS or ∞ |
| Handicap | 0 (disabled) | Board-based or 0 (∞) | Available | Optional | MM:SS or ∞ |
| Teaching | 0 (disabled) | 2x Board-based or 0 (∞) | Available | Optional | MM:SS or ∞ |
| Blitz | 5+ seconds | 0 | Disabled | Optional | MM:SS ⏱️ |

## Board Size Time Recommendations

| Board Size | Standard Time | Teaching Time |
|------------|---------------|---------------|
| 9×9 | 10 minutes | 20 minutes |
| 13×13 | 20 minutes | 40 minutes |
| 15×15 | 30 minutes | 60 minutes |
| 19×19 | 45 minutes | 90 minutes |
| 21×21 | 60 minutes | 120 minutes |

## User Interface Behavior

### Dynamic Control States
- **Byo-yomi Controls**: Disabled and grayed out in Blitz games
- **Main Time Input**: Disabled in Blitz games
- **Time per Move**: Step increments of 5 seconds for Blitz games
- **Help Text**: Context-aware explanations of current settings

### Visual Feedback
- Clear indication when controls are disabled
- Explanatory tooltips for automatic behaviors
- Warning messages for invalid combinations
- Success messages for valid configurations
- **Unlimited time display**: Shows ∞ symbol when main time = 0

## Implementation Details

### Game Type Detection
```typescript
function detectGameType(timeSettings) {
  if (timeSettings.timePerMove >= 5) {
    return 'blitz';
  }
  if (timeSettings.timePerMove === 0) {
    return timeSettings.handicap > 0 ? 'handicap' : 'even';
  }
  return 'teaching';
}
```

### Time Control Validation
```typescript
function validateTimeControls(settings) {
  // Blitz game validation
  if (settings.gameType === 'blitz') {
    if (settings.timePerMove < 5) {
      return { valid: false, error: 'Blitz games require 5+ seconds per move' };
    }
    if (settings.byoYomiPeriods > 0) {
      return { valid: false, error: 'Byo-yomi not allowed in Blitz games' };
    }
  }
  
  // Even/Handicap/Teaching validation
  if (['even', 'handicap', 'teaching'].includes(settings.gameType)) {
    if (settings.timePerMove !== 0) {
      return { valid: false, error: 'Time per move must be 0 for non-Blitz games' };
    }
  }
  
  return { valid: true };
}
```

## Error Handling

### Common Issues
1. **Invalid Time Combinations**
   - Byo-yomi enabled in Blitz games
   - Time per move set for non-Blitz games
   - Zero main time in standard games

2. **Resolution Steps**
   - Automatic correction of invalid settings
   - Clear error messages explaining issues
   - Suggestions for valid configurations

### Error Messages
```typescript
const errorMessages = {
  blitzByoYomi: 'Byo-yomi is not allowed in Blitz games',
  invalidTimePerMove: 'Time per move must be 0 or 5+ seconds',
  blitzMainTime: 'Main time is automatically set to 0 in Blitz games',
  standardTimePerMove: 'Time per move must be 0 in standard games'
};
```

## Best Practices

### Setting Up Games
1. **Choose Game Type First**
   - Determines available time control options
   - Sets intelligent defaults
   - Enables/disables appropriate controls

2. **Adjust Time Controls**
   - Work within game type constraints
   - Use recommended values when available
   - Consider player skill levels

3. **Verify Settings**
   - Check all time control values
   - Ensure settings match game goals
   - Test with practice games

### Time Management
1. **Standard Games**
   - Use main time for primary play
   - Add byo-yomi for overtime
   - Consider Fischer increment for steady pace

2. **Blitz Games**
   - Set appropriate per-move time
   - Use Fischer increment if needed
   - Practice with time pressure

## Related Documentation

- [TIME_TRACKING_SYSTEM.md](TIME_TRACKING_SYSTEM.md) - Core time tracking implementation
- [BOARD_SIZES.md](BOARD_SIZES.md) - Board size specific time recommendations
- [PLANNING.md](PLANNING.md) - Future time control enhancements
- [VERSION.md](VERSION.md) - Time control feature history

## Future Enhancements

### Planned Features
- Custom time control templates
- Tournament presets
- Advanced Fischer increment options
- Canadian byo-yomi support

### Long-term Goals
- AI-assisted time recommendations
- Player history based defaults
- Dynamic time control adjustments
- Advanced tournament controls

## Technical Support

For issues with time control behavior:
1. Check game type and time control compatibility
2. Verify all settings are within valid ranges
3. Test with recommended configurations
4. Review server logs for timing issues

---

*This document is regularly updated to reflect the latest time control behaviors and best practices.* 