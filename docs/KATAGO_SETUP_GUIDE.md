# 🤖 KataGo CPU Setup Guide for Gosei Play

This guide will help you set up KataGo CPU AI for 9x9 Go games on Ubuntu Linux with 4-8GB RAM.

## 🎯 What You Get

- **Powerful Go AI**: Play against KataGo, one of the strongest Go programs
- **4 Difficulty Levels**: Easy, Normal, Hard, and Expert
- **Optimized for 9x9**: Fast moves (1-8 seconds) on modest hardware
- **Low Memory Usage**: Works well with 4-8GB RAM systems
- **Seamless Integration**: AI players work like human players in the game

## 🚀 Quick Start (Ubuntu Linux)

### Step 1: Navigate to Server Directory
```bash
cd server
```

### Step 2: Run the Setup Script
```bash
chmod +x setup-katago.sh
./setup-katago.sh
```

### Step 3: Start the Server
```bash
npm start
```

### Step 4: Create AI Games
1. Open your browser and go to the game creation page
2. Enable "🤖 Play against KataGo AI"
3. Select difficulty level (start with "Normal")
4. Choose 9x9 board size for best performance
5. Create the game and start playing!

## 📋 System Requirements

### Minimum (Easy/Normal AI)
- **OS**: Ubuntu 16.04+ or compatible Linux
- **RAM**: 4GB
- **CPU**: 2-core processor
- **Storage**: 50MB free space
- **Network**: Internet connection for initial download

### Recommended (Hard/Expert AI)
- **OS**: Ubuntu 18.04+
- **RAM**: 8GB or more
- **CPU**: 4-core processor
- **Storage**: 100MB free space

## 🎮 AI Difficulty Levels

| Level | Thinking Time | Strength | Best For |
|-------|---------------|----------|----------|
| 🐣 Easy | 1 second | Beginner-friendly | New Go players |
| 🎯 Normal | 3 seconds | Balanced challenge | Most players |
| 🔥 Hard | 5 seconds | Strong opponent | Experienced players |
| 💎 Expert | 8 seconds | Maximum strength | Advanced players |

## 🔧 Manual Installation (if script fails)

### 1. Create Directories
```bash
mkdir -p server/katago/models
cd server/katago
```

### 2. Download KataGo Binary
```bash
wget https://github.com/lightvector/KataGo/releases/download/v1.15.1/katago-v1.15.1-linux-x64-cpu.zip
unzip katago-v1.15.1-linux-x64-cpu.zip
mv katago-v* katago
chmod +x katago
```

### 3. Download Neural Network Model
```bash
cd models
wget https://media.katagotraining.org/uploaded/networks/models/kata1/b6c96-s1235592320-d204142634.bin.gz
```

### 4. Test Installation
```bash
cd ..
./katago version
```

## 🎯 Performance Tips

### For 4GB RAM Systems
- Use Easy or Normal difficulty only
- Stick to 9x9 board sizes
- Close other applications while playing
- Enable swap space: `sudo swapon -s`

### For 8GB+ RAM Systems
- Can use any difficulty level
- 13x13 boards work but are slower
- Consider running other applications simultaneously

### Board Size Performance
- **9x9**: ⭐ Optimal (1-8 seconds per move)
- **13x13**: ✅ Good (5-15 seconds per move)  
- **19x19**: ⚠️ Slow (15-60+ seconds per move)

## 🛠️ Troubleshooting

### "KataGo executable not found"
```bash
# Check if binary exists
ls -la server/katago/katago

# Make it executable
chmod +x server/katago/katago

# Test directly
cd server/katago
./katago version
```

### "Neural network model not found"
```bash
# Check if model exists
ls -la server/katago/models/b6c96-*.bin.gz

# Re-download if missing
cd server/katago/models
wget https://media.katagotraining.org/uploaded/networks/models/kata1/b6c96-s1235592320-d204142634.bin.gz
```

### AI moves very slowly
1. Lower the difficulty level
2. Use 9x9 board size only
3. Close other applications
4. Check system resources: `htop`
5. Ensure you have enough RAM

### Out of memory errors
1. Use Easy difficulty only
2. Enable swap space
3. Close browser tabs and other apps
4. Restart the server

### Server won't start with AI
1. Check server logs for errors
2. Test KataGo manually:
   ```bash
   cd server/katago
   echo "boardsize 9" | ./katago gtp -model models/b6c96-s1235592320-d204142634.bin.gz
   ```
3. Verify all files are in place

## 📁 File Structure

After setup, you should have:
```
server/
├── engines/
│   ├── katago-cpu.js               # AI engine wrapper
│   ├── katago-cpu-config.cfg       # Auto-generated config
│   └── README.md                   # Detailed documentation
├── managers/
│   └── ai-game-manager.js          # AI game management
├── katago/
│   ├── katago                      # KataGo binary (executable)
│   └── models/
│       └── b6c96-s1235592320-d204142634.bin.gz  # Neural network
├── setup-katago.sh                # Setup script
└── server.js                      # Main server (with AI integration)
```

## 🎓 How to Play Against AI

### Game Creation
1. Fill in your username
2. Configure game settings (board size, time controls, etc.)
3. ✅ Enable "Play against KataGo AI"
4. Select your preferred difficulty
5. Choose your color preference or leave as "Random"
6. Create the game

### During the Game
- AI moves are displayed just like human moves
- AI thinking time is shown in the game
- You can resign, pass, or play normally
- Time controls work the same as human games
- Game ends normally with scoring

### Tips for Playing AI
- **Start with Easy**: Even Easy level is quite strong!
- **Learn from mistakes**: AI moves are usually very good examples
- **Don't get discouraged**: Losing to AI is normal and educational
- **Focus on fundamentals**: AI will punish basic mistakes quickly
- **Experiment**: Try different strategies and openings

## 🔮 Advanced Configuration

### Adjusting AI Strength
Edit `server/engines/katago-cpu-config.cfg`:
```ini
# Make AI weaker
maxVisits = 25
maxTime = 1.0

# Make AI stronger  
maxVisits = 800
maxTime = 10.0
```

### Using Different Models
Replace the model in `server/katago/models/` with:
- **b10c128**: Stronger but slower
- **b15c192**: Even stronger but much slower
- **b40c256**: Professional strength (requires 16GB+ RAM)

### Multiple Threads (8GB+ RAM)
```ini
numSearchThreads = 2
analysisThreads = 2
```

## 🚨 Important Notes

1. **Internet Required**: Initial setup downloads ~10MB
2. **Linux Only**: Currently works on Ubuntu/Linux only
3. **Performance Varies**: Older CPUs will be slower
4. **Memory Usage**: Monitor with `htop` or `free -h`
5. **AI is Strong**: Even "Easy" level beats most beginners

## 📞 Getting Help

If you need help:
1. Check this guide first
2. Look at `server/engines/README.md` for technical details
3. Check server console logs for error messages
4. Try the manual installation steps
5. Start with Easy difficulty and 9x9 boards

## 🎉 Success Indicators

You'll know everything is working when:
- ✅ Setup script completes without errors
- ✅ Server starts with "AI Game Manager initialized" message
- ✅ You can create AI games from the web interface
- ✅ AI makes moves within the expected time (1-8 seconds)
- ✅ Games complete normally with scoring

---

**Enjoy playing against KataGo! 🎮🤖**

*Remember: Even losing to the AI teaches you valuable Go patterns and strategies. Have fun learning!* 