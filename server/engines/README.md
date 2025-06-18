# KataGo CPU Engine for Gosei Play

This implementation integrates KataGo (CPU version) into Gosei Play, allowing players to challenge a powerful Go AI optimized for CPU-only systems with 4-8GB RAM.

## 🎯 Features

- **CPU-Optimized**: Specifically tuned for CPU-only systems with limited RAM
- **9x9 Board Focus**: Optimized for 9x9 Go boards for best performance
- **Multiple Difficulty Levels**: Easy, Normal, Hard, and Expert AI opponents
- **Low Memory Footprint**: Uses lightweight neural network models (6-10 blocks)
- **Real-time Integration**: Seamlessly integrated with the existing game system

## 🚀 Quick Setup

### 1. Run the Setup Script

```bash
cd server
chmod +x setup-katago.sh
./setup-katago.sh
```

This script will:
- Download KataGo CPU binary for Linux
- Download a lightweight neural network model (b6c96 - 6 blocks, ~8MB)
- Set up the optimized configuration
- Test the installation

### 2. Verify Installation

After running the setup script, you should see:
```
✅ KataGo binary downloaded and installed
✅ Neural network model downloaded
✅ KataGo is working correctly
✅ GTP interface working correctly
```

### 3. Start the Server

```bash
npm start
```

The server will automatically detect KataGo and enable AI games.

## 🎮 How to Use

### Creating AI Games

1. **From the Web Interface**:
   - Go to the game creation page
   - Enable "🤖 Play against KataGo AI" 
   - Select your preferred difficulty level
   - Choose 9x9 board size for best performance
   - Create the game

2. **AI Difficulty Levels**:
   - **🐣 Easy**: 1s thinking time, 50 visits (perfect for beginners)
   - **🎯 Normal**: 3s thinking time, 100 visits (good for most players)
   - **🔥 Hard**: 5s thinking time, 200 visits (for experienced players)
   - **💎 Expert**: 8s thinking time, 400 visits (advanced players only)

### Game Flow

1. Human player creates an AI game
2. AI player is automatically added to the game
3. If AI plays black, it makes the first move automatically
4. Human and AI alternate moves
5. AI thinks for the specified time and makes moves
6. Game continues until completion or resignation

## ⚙️ Configuration

### System Requirements

**Minimum (Easy/Normal difficulty)**:
- Ubuntu 16.04+ or compatible Linux distro
- 4GB RAM
- 2-core CPU
- 20MB disk space

**Recommended (Hard/Expert difficulty)**:
- Ubuntu 18.04+ or compatible Linux distro
- 8GB RAM
- 4-core CPU
- 50MB disk space

### Memory Optimization

The implementation uses several optimizations for low-memory systems:

```javascript
// CPU Configuration Highlights
analysisThreads = 1
numSearchThreads = 1
nnMaxBatchSize = 1
nnCacheSizePowerOfTwo = 16  // 64KB cache
ponderingEnabled = false
```

### Model Information

**Default Model**: `b6c96-s1235592320-d204142634.bin.gz`
- **Size**: ~8MB compressed
- **Blocks**: 6 blocks (very fast on CPU)
- **Strength**: Strong enough for most players on 9x9
- **Memory Usage**: ~100-200MB during play

## 🛠️ Manual Installation

If the setup script doesn't work, you can install manually:

### 1. Download KataGo Binary

```bash
cd server/katago
wget https://github.com/lightvector/KataGo/releases/download/v1.15.1/katago-v1.15.1-linux-x64-cpu.zip
unzip katago-v1.15.1-linux-x64-cpu.zip
mv katago-v* katago
chmod +x katago
```

### 2. Download Neural Network

```bash
cd models
wget https://media.katagotraining.org/uploaded/networks/models/kata1/b6c96-s1235592320-d204142634.bin.gz
```

### 3. Test Installation

```bash
./katago version
```

## 🔧 Troubleshooting

### Common Issues

**1. "KataGo executable not found"**
```bash
# Check if binary exists and is executable
ls -la server/katago/katago
chmod +x server/katago/katago
```

**2. "Neural network model not found"**
```bash
# Verify model exists
ls -la server/katago/models/b6c96-*.bin.gz
```

**3. "GTP interface test failed"**
```bash
# Test GTP manually
cd server/katago
echo "boardsize 9" | ./katago gtp -model models/b6c96-s1235592320-d204142634.bin.gz
```

**4. AI moves too slowly**
- Reduce AI difficulty level
- Ensure you're using 9x9 board size
- Close other applications to free RAM
- Check system resources with `htop`

**5. Out of memory errors**
- Use "Easy" or "Normal" difficulty only
- Ensure swap is enabled
- Close browser tabs and other applications

### Performance Tuning

**For 4GB RAM systems**:
- Use Easy or Normal difficulty only
- Set `maxVisits = 50` in katago-cpu-config.cfg
- Enable swap space if not already enabled

**For 8GB+ RAM systems**:
- Can use Hard or Expert difficulty
- Increase `maxVisits` for stronger play
- Consider multiple threads: `numSearchThreads = 2`

## 📊 Technical Details

### Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Game Client   │    │   Server/Socket  │    │  KataGo Engine  │
│                 │    │                  │    │                 │
│ Player makes    │───▶│ Validates move   │    │                 │
│ move            │    │ Updates state    │    │                 │
│                 │    │                  │    │                 │
│                 │    │ Triggers AI move │───▶│ Analyzes board  │
│                 │    │                  │    │ Generates move  │
│                 │    │                  │    │                 │
│ Receives AI     │◀───│ Broadcasts move  │◀───│ Returns move    │
│ move            │    │ Updates state    │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Files Structure

```
server/
├── engines/
│   ├── katago-cpu.js           # KataGo engine wrapper
│   ├── katago-cpu-config.cfg   # Generated CPU config
│   └── README.md               # This file
├── managers/
│   └── ai-game-manager.js      # AI game management
├── katago/
│   ├── katago                  # KataGo binary
│   └── models/
│       └── b6c96-*.bin.gz      # Neural network model
└── setup-katago.sh            # Setup script
```

### API Integration

The KataGo engine integrates through the existing game system:

- **Game Creation**: AI player is added when `vsAI: true`
- **Move Handling**: AI moves are generated after human moves
- **Game Flow**: Standard game rules apply (time controls, scoring, etc.)
- **Cleanup**: AI engines are properly shut down when games end

## 🎯 Optimization Tips

### For Best Performance

1. **Use 9x9 boards**: Optimal performance and user experience
2. **Start with Normal difficulty**: Good balance of strength and speed
3. **Close unnecessary applications**: Free up RAM for KataGo
4. **Use SSD storage**: Faster model loading
5. **Enable swap**: Prevents out-of-memory crashes

### Board Size Recommendations

- **9x9**: Optimal ⭐ (1-8 seconds per move)
- **13x13**: Good ✓ (5-15 seconds per move)
- **19x19**: Slow ⚠️ (15-60+ seconds per move)

## 🔮 Future Enhancements

- [ ] Support for larger neural network models
- [ ] GPU acceleration support
- [ ] Advanced analysis features
- [ ] Multiple AI personalities
- [ ] Adjustable playing style parameters
- [ ] Opening book integration

## 📝 License & Credits

- **KataGo**: [MIT License](https://github.com/lightvector/KataGo/blob/master/LICENSE)
- **Neural Networks**: Licensed for non-commercial use
- **Gosei Play Integration**: Part of the Gosei Play project

## 🤝 Contributing

To improve the KataGo integration:

1. Test on different system configurations
2. Report performance issues
3. Suggest configuration improvements
4. Help with documentation

## 📞 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Verify system requirements
3. Test with Easy difficulty first
4. Check server logs for error messages

Remember: KataGo AI is very strong! Don't be discouraged if you lose games. Use it as a learning opportunity to improve your Go skills. 🎓

---

**Happy playing! 🎮** 