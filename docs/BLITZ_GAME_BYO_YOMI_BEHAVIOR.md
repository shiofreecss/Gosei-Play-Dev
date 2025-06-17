# Blitz Game Byo-Yomi Restrictions

## Current Version: v0.0.8 ✅

**Status**: Production Ready | **Last Updated**: May 26, 2025

## Overview

In Gosei Play, Blitz games have specific restrictions on time controls to maintain their fast-paced nature. This document details the automatic disabling of byo-yomi in Blitz games and related behaviors.

## Core Restrictions

### Byo-Yomi Restrictions
- **Automatically Disabled**: Byo-yomi controls are disabled in Blitz mode
- **Zero Periods**: Byo-yomi periods automatically set to 0
- **UI Feedback**: Clear visual indication of disabled controls
- **Help Text**: Context-aware explanations of restrictions

## Implementation Details

### Automatic Disabling
```typescript
function updateBlitzTimeControls(settings: GameSettings): void {
  if (settings.gameType === 'blitz') {
    // Disable byo-yomi for Blitz games
    settings.byoYomiEnabled = false;
    settings.byoYomiPeriods = 0;
    settings.byoYomiTime = 0;
    
    // Ensure proper Blitz configuration
    settings.mainTime = 0;
    settings.timePerMove = Math.max(5, settings.timePerMove);
  }
}
```

### Validation Logic
```typescript
function validateBlitzSettings(settings: GameSettings): ValidationResult {
  if (settings.gameType === 'blitz') {
    if (settings.byoYomiPeriods > 0) {
      return {
        valid: false,
        error: 'Byo-yomi is not allowed in Blitz games'
      };
    }
    
    if (settings.timePerMove < 5) {
      return {
        valid: false,
        error: 'Blitz games require at least 5 seconds per move'
      };
    }
  }
  
  return { valid: true };
}
```

## User Interface

### Control States
- **Byo-yomi Inputs**: Disabled and grayed out
- **Period Selection**: Disabled with explanation
- **Time per Move**: Enabled with 5-second minimum
- **Main Time**: Fixed at 0 and disabled

### Visual Feedback
```typescript
interface ByoYomiControlProps {
  disabled: boolean;
  gameType: string;
}

const ByoYomiControl: React.FC<ByoYomiControlProps> = ({ disabled, gameType }) => {
  const helpText = gameType === 'blitz'
    ? 'Byo-yomi is disabled in Blitz games'
    : 'Select number of byo-yomi periods';
    
  return (
    <div className={`byo-yomi-control ${disabled ? 'disabled' : ''}`}>
      <label>Byo-yomi Periods</label>
      <select disabled={disabled}>
        {/* period options */}
      </select>
      <span className="help-text">{helpText}</span>
    </div>
  );
};
```

## Time Control Matrix

| Setting | Blitz Game | Standard Games |
|---------|------------|----------------|
| Time per Move | 5+ seconds | 0 (disabled) |
| Main Time | 0 (fixed) | Board-based |
| Byo-yomi | Disabled | Available |
| Fischer | Optional | Optional |

## Validation Rules

### Blitz Mode Requirements
1. **Time per Move**
   - Minimum: 5 seconds
   - Maximum: 60 seconds
   - Step: 5 seconds

2. **Main Time**
   - Must be 0
   - Automatically set
   - Cannot be changed

3. **Byo-yomi**
   - Must be disabled
   - Periods set to 0
   - Controls inactive

4. **Fischer Increment**
   - Optional feature
   - Can be enabled
   - Adds to move time

## Error Handling

### Common Issues
1. **Invalid Configurations**
   ```typescript
   const blitzErrors = {
     byoYomiEnabled: 'Byo-yomi cannot be enabled in Blitz games',
     timePerMoveTooLow: 'Time per move must be at least 5 seconds',
     mainTimeNonZero: 'Main time must be 0 in Blitz games'
   };
   ```

2. **Resolution Steps**
   - Automatic correction of settings
   - Clear error messages
   - User notifications
   - Setting recommendations

## State Management

### Game State Updates
```typescript
function updateGameState(state: GameState, changes: Partial<GameSettings>): GameState {
  if (changes.gameType === 'blitz') {
    return {
      ...state,
      ...changes,
      byoYomiEnabled: false,
      byoYomiPeriods: 0,
      mainTime: 0,
      timePerMove: Math.max(5, changes.timePerMove ?? 5)
    };
  }
  return { ...state, ...changes };
}
```

### Time Control Sync
```typescript
function syncTimeControls(settings: GameSettings): void {
  if (settings.gameType === 'blitz') {
    // Ensure consistent Blitz settings
    settings.byoYomiEnabled = false;
    settings.byoYomiPeriods = 0;
    settings.mainTime = 0;
    
    // Broadcast updates
    broadcastTimeSettings(settings);
  }
}
```

## Testing Strategy

### Test Scenarios
- ✅ Byo-yomi control disabling
- ✅ Time per move validation
- ✅ Main time enforcement
- ✅ UI feedback accuracy
- ✅ State synchronization

### Edge Cases
- ✅ Game type switching
- ✅ Setting persistence
- ✅ Network issues
- ✅ Concurrent games

## Logging and Monitoring

### Server Logs
```
[Blitz] Game created: timePerMove=5s, byoYomi=disabled
[Blitz] Invalid setting attempted: byoYomi=true
[Blitz] Settings corrected: byoYomi=false
```

### Client Logs
```
[UI] Blitz mode: byo-yomi controls disabled
[UI] Warning: invalid byo-yomi setting
[UI] Settings synchronized for Blitz game
```

## Best Practices

### Game Setup
1. **Select Blitz Mode**
   - Automatic time control adjustment
   - Clear UI feedback
   - Proper restrictions applied

2. **Configure Time per Move**
   - Use 5-second increments
   - Consider player skill levels
   - Test with practice games

3. **Verify Settings**
   - Check all time controls
   - Ensure proper restrictions
   - Test game creation

## User Experience

### Clear Communication
- Disabled controls are grayed out
- Help text explains restrictions
- Error messages are clear
- Setting changes are confirmed

### Smooth Transitions
- Automatic setting updates
- Clear visual feedback
- Immediate UI response
- State synchronization

## Future Enhancements

### Planned Features
- Custom Blitz presets
- Tournament Blitz modes
- Advanced time controls
- Performance analytics

### Long-term Goals
- AI-assisted time settings
- Dynamic time adjustments
- Professional Blitz support
- Enhanced analytics tools

## Related Documentation

- [TIME_PER_MOVE_BEHAVIOR.md](TIME_PER_MOVE_BEHAVIOR.md)
- [GAME_TYPE_TIME_CONTROL_BEHAVIOR.md](GAME_TYPE_TIME_CONTROL_BEHAVIOR.md)
- [TIME_TRACKING_SYSTEM.md](TIME_TRACKING_SYSTEM.md)
- [VERSION.md](VERSION.md)

## Technical Support

For Blitz game time control issues:
1. Verify game type settings
2. Check time per move value
3. Confirm byo-yomi is disabled
4. Test with standard configurations

---

*This document details the Blitz game byo-yomi restrictions in Gosei Play v0.0.8.* 