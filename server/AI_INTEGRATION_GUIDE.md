# AI Network Selection Integration Guide

This guide shows how to integrate the enhanced AI system with network selection into your existing Gosei Go server.

## 🔧 Integration Steps

### 1. **Replace AI Manager** (Recommended)

In your `server.js`, replace the current AI manager:

```javascript
// OLD (line ~12):
const AIGameManager = require('./managers/ai-game-manager');

// NEW:
const EnhancedAIManager = require('./managers/enhanced-ai-manager');

// OLD (line ~113):
const aiGameManager = new AIGameManager();

// NEW:
const aiGameManager = new EnhancedAIManager();
```

### 2. **Update AI Game Creation**

Find where AI games are created (search for `createAIGame` calls) and update them:

```javascript
// OLD:
await aiGameManager.createAIGame(gameState, humanPlayer, 'normal');

// NEW - with player rank and AI strength:
await aiGameManager.createAIGame(gameState, humanPlayer, '5k', 'equal');
//                                                      ^^^^  ^^^^^
//                                              player rank  AI strength
```

### 3. **Add API Routes** (Optional)

Add these routes to your server to test the system:

```javascript
// Add to server.js after existing routes
const AIGameAPI = require('./api/ai-game-api');
const aiGameAPI = new AIGameAPI();
aiGameAPI.setupRoutes(app);
```

## 🎮 Usage Examples

### **Create AI Game with Network Selection**

```javascript
// For a 5k player wanting an equal strength opponent
const aiPlayer = await aiGameManager.createAIGame(
  gameState,           // Game state object  
  humanPlayer,         // Human player object
  '5k',               // Human player rank
  'equal'             // AI difficulty: 'easy', 'equal', 'hard'
);

console.log(`Created AI: ${aiPlayer.username}`);
console.log(`AI Network: ${aiPlayer.aiNetwork.level} (${aiPlayer.aiNetwork.elo} Elo)`);
```

### **Get Available Opponents for a Player**

```javascript
const opponents = aiGameManager.getAvailableOpponents('3k');
/*
Returns:
[
  {
    strength: 'easy',
    network: { level: 'Weak Normal', elo: 1071.5, rank: '8k-7k' },
    description: 'Weaker opponent (Weak Normal)'
  },
  {
    strength: 'equal', 
    network: { level: 'Very Strong Normal', elo: 1711.0, rank: '4k-3k' },
    description: 'Equal strength (Very Strong Normal)'
  },
  {
    strength: 'hard',
    network: { level: 'Low Dan', elo: 1941.4, rank: '1d' },
    description: 'Stronger opponent (Low Dan)'
  }
]
*/
```

## 🌐 API Endpoints

Test your integration with these API endpoints:

### **1. Test Network Selection**
```bash
GET /api/ai/test-selection/5k/equal
```
Response:
```json
{
  "humanPlayerRank": "5k",
  "aiStrength": "equal", 
  "selectedNetwork": {
    "name": "Mid Normal",
    "elo": 1539.5,
    "rank": "6k-5k",
    "available": true
  },
  "computationalSettings": {
    "maxVisits": 100,
    "maxTime": 2.0,
    "threads": 1
  }
}
```

### **2. Get Available Opponents**
```bash
GET /api/ai/opponents/2d
```

### **3. Check Network Status**
```bash
GET /api/ai/networks
```

### **4. Create AI Game**
```bash
POST /api/ai/create-game
Content-Type: application/json

{
  "humanPlayerRank": "5k",
  "aiStrength": "equal",
  "boardSize": 9,
  "humanPlayerColor": "black"
}
```

## 🎯 Player Rank Mapping

The system automatically selects appropriate networks based on player rank:

| Player Rank | Selected Network | AI Strength |
|-------------|------------------|-------------|
| **15k-12k** | Absolute Beginner (483 Elo) | Beginner |
| **10k-9k** | Beginner (800 Elo) | Beginner |
| **8k-7k** | Weak Normal (1071 Elo) | Normal |
| **6k-5k** | Mid Normal (1539 Elo) | Normal |
| **5k-4k** | Strong Normal (1611 Elo) | Normal |
| **4k-3k** | Very Strong Normal (1711 Elo) | Normal |
| **2k-1k** | Near Dan (1862 Elo) | Normal |
| **1d** | Low Dan (1941 Elo) | Dan |
| **2d** | Mid Dan (2113 Elo) | Dan |
| **3d** | Strong Dan (2293 Elo) | Dan |
| **4d** | Very Strong Dan (2398 Elo) | Dan |
| **5d+** | Expert (2545 Elo) | Expert |

## ⚙️ AI Strength Modifiers

- **`'easy'`**: Selects a network 2-3 steps weaker than player rank
- **`'equal'`**: Selects network matching player rank  
- **`'hard'`**: Selects a network 2-3 steps stronger than player rank

## 📊 Computational Settings

The system automatically adjusts computational resources based on network strength:

- **Beginner** (< 1000 Elo): 50 visits, 1s thinking time
- **Normal** (1000-1500 Elo): 100 visits, 2s thinking time
- **Strong Normal** (1500-2000 Elo): 200 visits, 3s thinking time
- **Dan** (2000-2500 Elo): 300 visits, 5s thinking time
- **Expert** (2500+ Elo): 500 visits, 8s thinking time

Settings are further adjusted based on board size for optimal performance.

## 🔍 Testing Your Integration

1. **Start your server**
2. **Test network selection**:
   ```bash
   curl http://localhost:3001/api/ai/test-selection/5k/equal
   ```
3. **Check available networks**:
   ```bash
   curl http://localhost:3001/api/ai/networks
   ```
4. **Create a test AI game**:
   ```bash
   curl -X POST http://localhost:3001/api/ai/create-game \
     -H "Content-Type: application/json" \
     -d '{"humanPlayerRank":"5k","aiStrength":"equal","boardSize":9}'
   ```

## 🛠️ Troubleshooting

### **"Network not found" Error**
- **Solution**: Run `download-networks.bat` to download all networks
- **Check**: Use `/api/ai/networks` to see which networks are available

### **"AI engine initialization failed" Error**
- **Check**: KataGo executable path in `engines/katago-cpu.js`
- **Verify**: Network files exist in `katago/networks/` directories
- **Test**: Run `node server/katago/network-selector.js list`

### **Poor AI Performance**
- **Adjust**: Computational settings in `getComputationalSettings()`
- **Consider**: Using stronger networks for better play quality
- **Monitor**: CPU usage and adjust `maxVisits`/`maxTime` accordingly

## 🚀 Ready to Go!

Your enhanced AI system with network selection is now integrated! Players will automatically get appropriately challenging AI opponents based on their skill level.

**Key Benefits:**
- ✅ **Smart opponent matching** based on player rank
- ✅ **Adjustable difficulty** (easy/equal/hard)
- ✅ **Optimal performance** with automatic computational tuning
- ✅ **12 different AI personalities** from beginner to professional level 