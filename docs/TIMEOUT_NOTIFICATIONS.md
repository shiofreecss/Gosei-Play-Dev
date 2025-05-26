# Timeout and Resignation Notifications

## Overview

As of the latest update, Gosei Play now displays proper notifications when games end due to time expiration or player resignation, following standard Go notation.

## Timeout Notifications

When a player runs out of time, the system now shows clear notifications with proper result notation:

### Server-Side Implementation
- **Enhanced timeout handling**: The server now sets a `result` field with proper notation
- **Detailed timeout messages**: Clear messages indicating which player expired and who won
- **Proper game state updates**: The game state includes both winner and result information

### Client-Side Display
- **Immediate notifications**: Players see timeout notifications as soon as time expires
- **Proper result format**: Uses standard Go notation (B+T, W+T)
- **Clear messaging**: Explains what happened and who won

### Timeout Message Format
- **Black expires**: "Black expired - White win (W+T)"
- **White expires**: "White expired - Black win (B+T)"

## Resignation Notifications

When a player resigns, the system shows enhanced notifications:

### Server-Side Implementation
- **Enhanced resignation handling**: The server now sets a `result` field with resignation notation
- **Detailed resignation messages**: Clear messages indicating which player resigned and who won
- **Proper game state updates**: The game state includes both winner and result information

### Client-Side Display
- **Immediate notifications**: Players see resignation notifications immediately
- **Proper result format**: Uses standard Go notation (B+R, W+R)
- **Clear messaging**: Explains what happened and who won

### Resignation Message Format
- **Black resigns**: "Black resigned - White win (W+R)"
- **White resigns**: "White resigned - Black win (B+R)"

## Game Complete Modal Enhancements

The game completion modal now handles both timeout and resignation games properly:

### Features
- **Flexible display**: Shows proper result notation even without traditional scoring
- **Timeout-specific messages**: Different messages for timeout vs. score-based wins
- **Resignation handling**: Proper display for resignation games
- **Fallback support**: Graceful handling of games without score objects

### Display Logic
- **With score**: Shows traditional score display with point differences
- **Without score**: Shows result notation (B+T, W+T, B+R, W+R)
- **Personal messages**: Tailored messages based on how the game ended

## Technical Implementation

### GameState Interface Updates
```typescript
export interface GameState {
  // ... existing fields ...
  result?: string; // Game result notation (e.g., B+T, W+T, B+R, W+R, B+5.5, etc.)
  // ... existing fields ...
}
```

### Server Events Enhanced
- **playerTimeout**: Now includes `message` and `result` fields
- **playerResigned**: Now includes `message` and `result` fields

### Client Event Handling
- **Enhanced timeout handling**: Processes timeout messages and results
- **Enhanced resignation handling**: Processes resignation messages and results
- **Improved notifications**: Shows proper messages based on game end type

## Testing Instructions

### Testing Timeout Notifications
1. Create a game with very short time controls (e.g., 1 minute)
2. Let one player's time expire
3. Verify that the proper timeout notification appears
4. Check that the GameCompleteModal shows the correct result

### Testing Resignation Notifications
1. Create any game
2. Have one player resign using the resign button
3. Verify that the proper resignation notification appears
4. Check that the GameCompleteModal shows the correct result

### Expected Results
- **Timeout**: Should see "Black/White expired - Opponent win (W+T/B+T)"
- **Resignation**: Should see "Black/White resigned - Opponent win (W+R/B+R)"
- **Modal**: Should display the result notation properly
- **Consistency**: All notifications should use standard Go notation

## Standard Go Result Notation

The system now uses proper Go result notation:
- **B+T**: Black wins by timeout (opponent's time expired)
- **W+T**: White wins by timeout (opponent's time expired)
- **B+R**: Black wins by resignation (opponent resigned)
- **W+R**: White wins by resignation (opponent resigned)
- **B+5.5**: Black wins by 5.5 points (traditional scoring)
- **W+5.5**: White wins by 5.5 points (traditional scoring)

This notation is consistent with professional Go tournaments and online Go servers worldwide. 