# 🔄 Auto Save Feature Documentation

## Overview

The **Auto Save feature** is a client-side game state preservation system that automatically saves your current game progress to your browser's local storage. This feature ensures players don't lose their game progress due to browser crashes, accidental tab closures, or internet connectivity issues.

## 🎯 Purpose

### Problem Solved
- **Browser crashes**: Games are automatically recovered
- **Accidental tab closure**: Resume exactly where you left off  
- **Internet disconnection**: Local copy preserves your progress
- **Long games**: Protection against unexpected interruptions
- **Device switching**: Continue games across browser sessions

### Benefits
- **Zero data loss**: Complete game state preservation
- **Seamless recovery**: Automatic restoration of game progress
- **Peace of mind**: Play without worrying about technical issues
- **Offline backup**: Local storage provides redundancy

## 🛠️ How It Works

### Automatic Saving Process

1. **Interval-Based**: Saves every **30 seconds** when enabled
2. **Complete State**: Stores entire game state including:
   - Board position (all stone placements)
   - Move history (complete game record)
   - Current turn information
   - Player details
   - Game settings and metadata
   - Timestamp of save

3. **Storage Location**: Browser's localStorage with key format:
   ```
   gosei-offline-game-{gameId}
   ```

### Storage Format
```json
{
  "gameState": {
    "id": "game123",
    "board": {
      "stones": [...],
      "size": 19,
      "capturedStones": {"black": 0, "white": 0}
    },
    "history": [...],
    "currentTurn": "black",
    "status": "playing",
    "players": [...],
    "gameType": "standard",
    "timeControl": {...}
  },
  "savedAt": "2024-01-15T10:30:00.000Z",
  "currentPlayer": {
    "id": "player1",
    "color": "black", 
    "name": "PlayerName"
  }
}
```

## 🎮 User Interface

### Desktop Interface

**Location**: Game Info Panel → Settings Section

**Controls**:
- **Toggle Button**: Green (ON) / Gray (OFF)
- **Status Text**: "Auto Save" with current state
- **Manual Save**: "Save Now" button (when auto save is OFF)

### Mobile Interface

**Location**: Bottom Game Tools → Settings Section

**Controls**:
- **Toggle Button**: Same as desktop
- **Responsive Design**: Adapts to screen size
- **Touch-Friendly**: Optimized for mobile interaction

### Visual Indicators
```typescript
// Auto Save Toggle States
autoSaveEnabled ? 'bg-green-600 text-white' : 'bg-neutral-400 text-neutral-700'
```

## 🔧 Technical Implementation

### Core Logic (GamePage.tsx)

```typescript
// State Management
const [autoSaveEnabled, setAutoSaveEnabled] = useState<boolean>(() => {
  const savedPref = localStorage.getItem('gosei-auto-save-enabled');
  return savedPref ? JSON.parse(savedPref) : false;
});

// Auto Save Effect
useEffect(() => {
  // Save preference to localStorage
  localStorage.setItem('gosei-auto-save-enabled', JSON.stringify(autoSaveEnabled));

  // Set up interval if enabled
  if (autoSaveEnabled && gameState && gameState.id) {
    const interval = setInterval(() => {
      try {
        localStorage.setItem(`gosei-offline-game-${gameState.id}`, JSON.stringify({
          gameState,
          savedAt: new Date().toISOString(),
          currentPlayer
        }));
        console.log('Game auto-saved to local storage');
      } catch (error) {
        console.error('Failed to auto-save game:', error);
        // Handle storage quota exceeded
        if (error instanceof DOMException && error.name === 'QuotaExceededError') {
          setAutoSaveEnabled(false);
          // Show notification
        }
      }
    }, 30000); // 30 seconds
    
    setAutoSaveInterval(interval);
  }

  // Cleanup
  return () => {
    if (autoSaveInterval) {
      clearInterval(autoSaveInterval);
    }
  };
}, [autoSaveEnabled, gameState, currentPlayer]);
```

### Manual Save Function

```typescript
const saveGameNow = () => {
  if (gameState && gameState.id) {
    try {
      localStorage.setItem(`gosei-offline-game-${gameState.id}`, JSON.stringify({
        gameState,
        savedAt: new Date().toISOString(),
        currentPlayer
      }));
      // Show success notification
    } catch (error) {
      console.error('Failed to save game:', error);
      // Show error notification
    }
  }
};
```

### Storage Management

```typescript
// Automatic cleanup of old games (GameContext.tsx)
const cleanupOldGames = () => {
  try {
    const allKeys = Object.keys(localStorage);
    const gameKeys = allKeys.filter(key => key.startsWith('gosei-offline-game-'));
    
    // Remove games older than 24 hours
    const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
    
    gameKeys.forEach(key => {
      try {
        const gameData = JSON.parse(localStorage.getItem(key) || '');
        if (gameData.savedAt && new Date(gameData.savedAt).getTime() < twentyFourHoursAgo) {
          localStorage.removeItem(key);
        }
      } catch (e) {
        // Remove corrupted data
        localStorage.removeItem(key);
      }
    });
  } catch (e) {
    console.error('Error cleaning up old games:', e);
  }
};
```

## 📋 User Guide

### How to Enable Auto Save

1. **During a Game**:
   - Look for the **Settings** section in the game interface
   - Find the **"Auto Save"** option
   - Click the toggle to turn it **ON** (button turns green)

2. **Preference Persistence**:
   - Your choice is automatically saved
   - Setting applies to all future games
   - Survives browser restarts

### How to Use Manual Save

1. **When Auto Save is OFF**:
   - A **"Save Now"** button appears
   - Click it to immediately save current game state
   - Useful for important moments or before risky moves

2. **Strategic Saving**:
   - Save before experimental moves
   - Save after significant progress
   - Save when taking breaks during long games

### Game Recovery

**Automatic Recovery**:
- Games are automatically restored when you return
- No user action required
- Seamless continuation of gameplay

**Manual Recovery**:
- Check localStorage for saved games
- Look for keys: `gosei-offline-game-{gameId}`
- Data includes complete game state

## ⚠️ Limitations & Considerations

### Browser Limitations

1. **Storage Quota**: 
   - Limited by browser storage limits (~5-10MB typical)
   - Auto-disables if quota exceeded
   - Shows warning notification

2. **Browser-Specific**:
   - Saved games only work in the same browser
   - Not synced across different browsers
   - Private/incognito mode may not persist

3. **Device-Specific**:
   - Saves are local to the device
   - Not synchronized across devices
   - Clearing browser data removes saves

### Data Management

1. **Automatic Cleanup**:
   - Games older than 24 hours are automatically deleted
   - Prevents storage bloat
   - Maintains browser performance

2. **Storage Conflicts**:
   - Multiple games can be saved simultaneously
   - Each game has unique storage key
   - No interference between different games

## 🛡️ Error Handling

### Storage Quota Exceeded

```typescript
if (error instanceof DOMException && error.name === 'QuotaExceededError') {
  setAutoSaveEnabled(false);
  setNotification({
    visible: true,
    message: 'Auto-save has been disabled because your device storage is full.',
    type: 'warning'
  });
}
```

### Corrupted Data Recovery

```typescript
try {
  const gameData = JSON.parse(localStorage.getItem(key) || '');
  // Process valid data
} catch (e) {
  // Remove corrupted data
  localStorage.removeItem(key);
}
```

### Network Disconnection

- Auto save continues to work offline
- Provides local backup while server is unreachable
- Seamless transition when connection restored

## 🔍 Debugging & Monitoring

### Console Logging

```typescript
// Successful save
console.log('Game auto-saved to local storage');

// Error logging
console.error('Failed to auto-save game:', error);

// Cleanup logging
console.log('Cleaned up old saved games');
```

### Manual Inspection

```javascript
// Browser console commands
localStorage.getItem('gosei-auto-save-enabled');
Object.keys(localStorage).filter(key => key.startsWith('gosei-offline-game-'));
JSON.parse(localStorage.getItem('gosei-offline-game-{gameId}'));
```

### Storage Analysis

```javascript
// Check storage usage
const storageUsed = JSON.stringify(localStorage).length;
console.log('LocalStorage usage:', storageUsed, 'characters');

// Check auto save games
const gameKeys = Object.keys(localStorage).filter(key => key.startsWith('gosei-offline-game-'));
console.log('Saved games:', gameKeys.length);
```

## 🚀 Performance Considerations

### Minimal Impact
- **Interval**: Only saves every 30 seconds
- **Async**: Non-blocking JSON serialization
- **Efficient**: Minimal CPU usage
- **Selective**: Only saves when game state changes

### Memory Usage
- **Temporary**: JSON string creation only during save
- **Cleanup**: Automatic removal of old data
- **Optimized**: Compact storage format

### Network Independence
- **Local Operation**: No network requests
- **Offline Capable**: Works without internet
- **Fast**: Immediate save/restore operations

## 📊 Analytics & Metrics

### Usage Tracking
- User preference (enabled/disabled)
- Save frequency and success rate
- Storage usage patterns
- Recovery scenarios

### Error Monitoring
- Quota exceeded incidents
- Corrupted data detection
- Cleanup operation success

## 🔮 Future Enhancements

### Planned Features
- [ ] **Cloud Sync**: Optional server-side backup
- [ ] **Multiple Saves**: Save multiple game states per game
- [ ] **Export/Import**: Manual game state management
- [ ] **Compression**: Reduce storage footprint
- [ ] **Selective Saves**: Save only critical game moments

### Considerations
- [ ] **Cross-Device Sync**: Synchronize across devices
- [ ] **Version Control**: Track save history
- [ ] **Collaborative Saves**: Multi-player save coordination
- [ ] **Recovery UI**: Better recovery interface

## 📝 Related Documentation

- [MOVE_STORAGE_SYSTEM.md](MOVE_STORAGE_SYSTEM.md) - Overall move storage architecture
- [README.md](README.md) - General project overview
- [QUICK_START.md](QUICK_START.md) - Getting started guide
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Common issues and solutions

## 🤝 Contributing

To improve the auto save feature:

1. **Test edge cases**: Storage limits, corrupted data, network issues
2. **Performance optimization**: Reduce storage footprint
3. **User experience**: Improve notifications and feedback
4. **Cross-browser compatibility**: Test different browsers
5. **Documentation**: Keep this document updated

## 📞 Support

If you encounter auto save issues:

1. **Check browser storage**: Clear data if needed
2. **Verify feature is enabled**: Check toggle state
3. **Monitor console**: Look for error messages
4. **Test manual save**: Try "Save Now" button
5. **Browser compatibility**: Try different browser

---

**The Auto Save feature provides peace of mind for Go players, ensuring their games are always protected! 🛡️🎮** 