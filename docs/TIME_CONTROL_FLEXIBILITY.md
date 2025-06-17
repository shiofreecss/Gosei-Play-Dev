# Time Control Flexibility

## Overview

As of version 1.0.5, Gosei Play now offers complete flexibility in time control settings. Users are no longer restricted by minimum time requirements and can set any time they prefer for their games.

## What Changed

### Before (v0.0.4 and earlier)
- **Enforced minimum time requirements** based on board size:
  - 9×9 board: minimum 10 minutes
  - 13×13 board: minimum 20 minutes  
  - 15×15 board: minimum 30 minutes
  - 19×19 board: minimum 45 minutes
  - 21×21 board: minimum 60 minutes
- Users could not set time below these minimums
- Board size changes would force time to minimum values
- Help text stated "Minimum X minutes for Y×Y board"

### After (v0.0.5+)
- **Flexible time controls**: Users can set any time they want (≥0 minutes)
- **Recommended time settings**: Previous minimums are now suggestions
- **Smart board changes**: Only updates time if user hasn't customized it
- **User-friendly help text**: "Recommended X minutes (you can set any time you want)"
- **Support for all game types**: Bullet games, blitz games, custom timings
- **Unlimited time support**: Set 0 minutes for unlimited time (displays as ∞)

## Benefits

### For Players
- **Complete freedom** in time control selection
- **Unlimited time**: Set 0 minutes for untimed games (perfect for analysis)
- **Bullet games**: Set very short times (1-5 minutes) for fast-paced games
- **Blitz games**: Set medium times (5-15 minutes) for quick matches
- **Custom timings**: Set any time that fits your schedule
- **Preserved settings**: Custom times are maintained when changing board sizes

### For Game Variety
- **Teaching games**: Use longer times for instructional purposes
- **Quick practice**: Use shorter times for rapid skill building
- **Tournament flexibility**: Match any tournament time control format
- **Casual play**: Set comfortable times without restrictions

## How to Use

### Setting Custom Time Controls
1. Navigate to game creation
2. Enter your username
3. Click "Create New Game"
4. In the Time Control section:
   - Enter any positive number in "Main Time (minutes)"
   - The system shows recommended time but doesn't enforce it
   - You can set 0 minutes for unlimited time games (displays as ∞)
   - Your setting will be preserved when changing board sizes

### Recommended vs. Custom Times
- **Recommended times** are shown as guidance based on typical game complexity
- **Custom times** override recommendations and are preserved
- **Board size changes** only update time if you're using the current recommendation

### Advanced Time Controls
All advanced features work with any main time setting:
- **Byo-yomi periods**: 3, 5, or 7 extra time periods
- **Fischer increment**: 5s, 10s, or 15s added per move
- **Time per move**: Optional maximum time per individual move

## Examples

### Unlimited Time (0 minutes) 
- Set main time to 0 minutes (displays as ∞)
- Perfect for analysis, teaching, and casual study
- No time pressure allows for deep thinking
- Ideal for reviewing games or exploring positions

### Bullet Go (1-5 minutes)
- Set main time to 1-5 minutes
- No byo-yomi periods for maximum speed
- Ideal for quick practice sessions

### Blitz Go (5-15 minutes)  
- Set main time to 5-15 minutes
- Optional 3 byo-yomi periods for time pressure relief
- Good balance of speed and strategy

### Casual Games (15-60+ minutes)
- Set any comfortable time
- Use recommended times as starting point
- Add byo-yomi for thoughtful play

### Teaching Games (60+ minutes)
- Set longer times for explanation and discussion
- Use 5-7 byo-yomi periods for extensive analysis
- Perfect for learning complex positions

## Technical Implementation

### Code Changes
- `getMinimumTimeForBoardSize()` → `getRecommendedTimeForBoardSize()`
- Removed `Math.max(value, minTime)` enforcement
- Changed input validation to `newValue >= 0`
- Enhanced board size change logic to preserve custom settings

### User Interface
- Input field accepts any positive value
- Help text clarifies recommendations vs. requirements
- Smart defaulting preserves user preferences
- Consistent behavior across all board sizes

## Backward Compatibility

- **Existing games**: Continue to work with their original time settings
- **Saved preferences**: Maintained for returning users
- **Default behavior**: Still uses recommended times for new users
- **API compatibility**: All existing time control APIs remain functional

## Future Enhancements

- **Time control presets**: Quick selection of common time formats
- **Tournament templates**: Pre-configured settings for standard tournaments
- **Custom increment options**: More Fischer time increment choices
- **Advanced byo-yomi**: Canadian overtime and other time systems

---

*This feature enhancement reflects Gosei Play's commitment to providing a flexible, user-friendly Go gaming experience that accommodates players of all skill levels and time preferences.* 