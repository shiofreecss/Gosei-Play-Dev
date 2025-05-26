# Byo-yomi Automatic Behavior

## Overview
When selecting any Byo-yomi period (3, 5, or 7 periods), the system automatically sets the Byo-yomi time to 30 seconds by default, while still allowing users to customize this value if desired.

## Automatic Behavior

### When Selecting Byo-yomi Periods
- **Any period selection (3, 5, or 7)**: Automatically sets Byo-yomi time to **30 seconds**
- **No byo-yomi (0 periods)**: Preserves the current Byo-yomi time setting

### User Control
- Users can still manually change the Byo-yomi time after the automatic selection
- The 30-second default provides a sensible starting point
- All standard options remain available (30s, 40s, 60s)

## Implementation Details

The automatic behavior is implemented in the Byo-yomi Periods dropdown onChange handler in `src/pages/HomePage.tsx`:

```typescript
onChange={(e) => {
  const periods = parseInt(e.target.value);
  const newOptions = {
    ...gameOptions.timeControlOptions,
    byoYomiPeriods: periods,
    // Auto-set to 30 seconds when selecting any byo-yomi periods
    byoYomiTime: periods > 0 ? 30 : (gameOptions.timeControlOptions?.byoYomiTime || 0)
  };
  updateGameOption('timeControlOptions', newOptions);
}}
```

## User Interface Changes

### Help Text Update
- Updated help text to: "Time per byo-yomi period (auto-set to 30s when periods selected)"
- Clearly indicates the automatic behavior to users

### Behavior Flow
1. User selects any Byo-yomi period (3, 5, or 7)
2. System automatically sets Byo-yomi time to 30 seconds
3. User can optionally change the time to 40s, 60s, or keep 30s
4. If user selects "No byo-yomi", the time setting is preserved

## Benefits

- **Convenience**: No need to manually set both periods and time
- **Sensible Default**: 30 seconds is the standard Byo-yomi time in Go
- **Flexibility**: Users can still customize the time if needed
- **User-friendly**: Clear indication of automatic behavior

## Use Cases

### Standard Tournament Play
1. Select "5 periods (Standard)"
2. System automatically sets to 30 seconds
3. Ready to play with standard tournament timing

### Custom Timing
1. Select desired number of periods
2. System sets 30 seconds automatically
3. Manually adjust to preferred time (40s or 60s)
4. Customized Byo-yomi timing ready

## Technical Notes

- The automatic setting only triggers when changing from 0 periods to any positive number
- When going back to "No byo-yomi", the previous time setting is preserved
- All changes are synchronized with the timeControlOptions object
- Settings are automatically saved to localStorage 