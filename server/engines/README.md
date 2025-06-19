# KataGo CPU Engine for Gosei Play

This implementation integrates KataGo (CPU version) into Gosei Play, allowing players to challenge a powerful Go AI optimized for CPU-only systems with 4-8GB RAM. Supports both **Windows** and **Linux** development environments.

## 🎯 Features

- **Cross-Platform**: Works on Windows 10/11 and Ubuntu Linux 16.04+
- **CPU-Optimized**: Specifically tuned for CPU-only systems with limited RAM
- **Multi-Board Support**: Optimized for 9x9 boards, supports 13x13 and 19x19
- **Multiple Difficulty Levels**: Easy, Normal, Hard, and Expert AI opponents
- **Low Memory Footprint**: Uses lightweight neural network models (6-10 blocks)
- **Real-time Integration**: Seamlessly integrated with the existing game system
- **Automatic Configuration**: Self-configuring setup with optimized settings

## 🚀 Quick Setup

### Windows Setup

#### Method 1: Automated Setup (Recommended)
```cmd
cd server
setup-katago-windows.bat
```

#### Method 2: Manual Setup
1. **Download KataGo v1.16.2 for Windows:**
   - Visit: https://github.com/lightvector/KataGo/releases/latest
   - Download: `katago-v1.16.2-windows-x64.zip`
   - Extract to `server/katago/` directory

2. **Download Neural Network Model:**
   - Visit: https://katagotraining.org/
   - Download a `b6c96` model (~8MB) for CPU usage
   - Save to `server/katago/` directory

3. **Test Installation:**
   ```cmd
   cd server
   node test-katago-setup.js
   ```

### Linux Setup

#### Method 1: Automated Setup (Recommended)
```bash
cd server
chmod +x setup-katago.sh
./setup-katago.sh
```

#### Method 2: Manual Setup
```bash
# 1. Create directories
mkdir -p server/katago/models
cd server/katago

# 2. Download KataGo binary
wget https://github.com/lightvector/KataGo/releases/download/v1.15.1/katago-v1.15.1-linux-x64-cpu.zip
unzip katago-v1.15.1-linux-x64-cpu.zip
mv katago-v* katago
chmod +x katago

# 3. Download neural network model
cd models
wget https://media.katagotraining.org/uploaded/networks/models/kata1/b6c96-s1235592320-d204142634.bin.gz

# 4. Test installation
cd ..
./katago version
```

### Verification

After setup, you should see:
```
✅ KataGo binary downloaded and installed
✅ Neural network model downloaded  
✅ KataGo is working correctly
✅ GTP interface working correctly
```

### Start Playing

```bash
# Start the server
npm start

# Or for development
node server.js
```

The server will automatically detect KataGo and enable AI games.

## 🎮 How to Use

### Creating AI Games

1. **From the Web Interface**:
   - Go to the game creation page
   - Enable "🤖 Play against KataGo AI" 
   - Select your preferred difficulty level
   - Choose board size (9x9 recommended for best performance)
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

## ⚙️ Configuration & System Requirements

### System Requirements

**Minimum (Easy/Normal difficulty)**:
- **Windows**: Windows 10/11 x64
- **Linux**: Ubuntu 16.04+ or compatible
- **RAM**: 4GB minimum
- **CPU**: 2-core processor
- **Storage**: 50MB disk space
- **Network**: Internet connection for initial download

**Recommended (Hard/Expert difficulty)**:
- **Windows**: Windows 10/11 x64  
- **Linux**: Ubuntu 18.04+ or compatible
- **RAM**: 8GB or more
- **CPU**: 4-core processor
- **Storage**: 100MB disk space

### Performance by Board Size

| Board Size | Performance | Recommended For |
|------------|-------------|-----------------|
| **9x9** | ⭐ Optimal (1-8s per move) | Development, casual play |
| **13x13** | ✅ Good (5-15s per move) | Intermediate play |
| **19x19** | ⚠️ Slow (15-60s per move) | Patient players only |

### Memory Optimization

The implementation uses several optimizations for low-memory systems:

```cfg
# CPU Configuration Highlights  
analysisThreads = 1
numSearchThreads = 8
nnMaxBatchSize = 1
nnCacheSizePowerOfTwo = 16  # 64KB cache
ponderingEnabled = false
maxVisits = 100
maxTime = 3.0
```

### Neural Network Models

**Recommended Models for CPU**:
- `b6c96-s1235592320-d204142634.bin.gz` (~8MB, 6 blocks)
- `kata1-b6c96-s175395328-d26788732.bin.gz` (~8MB, 6 blocks) 
- `b10c128-s197428736-d67404019.bin.gz` (~15MB, 10 blocks)

**Model Performance**:
- **6-block models**: ~100-200MB RAM, 1-5s per move on 9x9
- **10-block models**: ~200-400MB RAM, 2-8s per move on 9x9

## 🛠️ Advanced Configuration

### Custom Difficulty Settings

You can customize AI strength by editing `katago-cpu-config.cfg`:

```cfg
# For weaker AI (good for beginners)
maxVisits = 25
maxTime = 1.0

# For stronger AI (advanced players)  
maxVisits = 800
maxTime = 10.0
numSearchThreads = 4
```

### Multi-Threading

For systems with 8GB+ RAM:
```cfg
numSearchThreads = 4    # Use 4 threads
analysisThreads = 2     # Use 2 analysis threads  
nnMaxBatchSize = 2      # Larger batches
```

## 🔧 Troubleshooting

### Windows Issues

**1. "KataGo executable not found"**
```cmd
# Check if binary exists
dir server\katago\katago.exe

# Download manually if missing
# Visit: https://github.com/lightvector/KataGo/releases/latest
```

**2. "Missing DLL files"**
- Download the full Windows release package
- Ensure all `.dll` files are in the same directory as `katago.exe`
- Install Microsoft Visual C++ Redistributable if needed

**3. "Neural network model not found"**
```cmd
# Check if model exists
dir server\katago\*.bin.gz

# Download manually from https://katagotraining.org/
```

### Linux Issues

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

### Performance Issues

**AI moves too slowly:**
- Reduce AI difficulty level to "Easy" or "Normal"
- Use 9x9 board size only
- Close other applications to free RAM
- Check system resources with Task Manager (Windows) or `htop` (Linux)

**Out of memory errors:**
- Use "Easy" difficulty only
- Enable virtual memory/swap space
- Close browser tabs and other applications
- Use a smaller neural network model (6-block instead of 10-block)

**Server won't start with AI:**
1. Check server console for error messages
2. Run `node test-katago-setup.js` to diagnose issues
3. Verify KataGo installation with `katago version`
4. Check log files in `server/katago/logs/gtp.log`

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

### File Structure

```
server/
├── engines/
│   ├── katago-cpu.js           # KataGo engine wrapper (cross-platform)
│   ├── katago-cpu-config.cfg   # Auto-generated CPU config
│   └── README.md               # This documentation
├── managers/
│   └── ai-game-manager.js      # AI game management
├── katago/                     # KataGo installation directory
│   ├── katago(.exe)           # KataGo binary (Linux/Windows)
│   ├── *.dll                  # Windows dependencies
│   ├── *.bin.gz               # Neural network models
│   ├── gtp_dev.cfg           # Development configuration
│   └── logs/
│       └── gtp.log           # GTP communication logs
├── setup-katago.sh           # Linux setup script
├── setup-katago-windows.bat  # Windows setup script
└── test-katago-setup.js      # Installation test script
```

### API Integration

The KataGo engine integrates through the existing game system:

- **Game Creation**: AI player is added when `vsAI: true`
- **Move Handling**: AI moves are generated after human moves
- **Game Flow**: Standard game rules apply (time controls, scoring, etc.)
- **Cleanup**: AI engines are properly shut down when games end
- **Multi-Platform**: Automatic platform detection and configuration

## 🎯 Best Practices

### For Optimal Performance

1. **Use 9x9 boards**: Fastest and most responsive gameplay
2. **Start with Normal difficulty**: Good balance of strength and speed  
3. **Close unnecessary applications**: Free up RAM for KataGo
4. **Use SSD storage**: Faster model loading times
5. **Enable swap/virtual memory**: Prevents out-of-memory crashes
6. **Monitor system resources**: Keep RAM usage under 80%

### Development Tips

1. **Use Easy difficulty during development**: Faster iteration cycles
2. **Test with small boards first**: Quicker feedback loops
3. **Check logs regularly**: `server/katago/logs/gtp.log` for debugging
4. **Run test script**: `node test-katago-setup.js` to verify setup
5. **Monitor memory usage**: Task Manager or htop during play

## 🔮 Future Enhancements

- [ ] GPU acceleration support (CUDA/OpenCL)
- [ ] Larger neural network models for stronger play
- [ ] Advanced analysis and review features
- [ ] Multiple AI personalities and playing styles
- [ ] Opening book integration
- [ ] Territory estimation and live analysis
- [ ] Handicap game support
- [ ] Teaching mode with move suggestions

## 📋 Testing Checklist

Before deploying, verify:

- [ ] `node test-katago-setup.js` passes all tests
- [ ] AI can create games and make moves on 9x9 boards
- [ ] Performance is acceptable for chosen difficulty
- [ ] Memory usage stays within system limits
- [ ] Logs show no critical errors
- [ ] AI properly resigns when behind
- [ ] Games can be completed and scored correctly

## 📝 Version History

- **v1.16.2** (Windows): Latest KataGo release with improved CPU performance
- **v1.15.1** (Linux): Stable Linux release with proven compatibility
- **CPU Config**: Optimized configurations for 4-8GB RAM systems
- **Cross-Platform**: Unified codebase supporting Windows and Linux

## 📞 Support & Contributing

### Getting Help

If you encounter issues:

1. **Check this documentation** - especially the troubleshooting section
2. **Run the test script**: `node test-katago-setup.js`
3. **Check system requirements** - ensure minimum specs are met
4. **Review log files** - `server/katago/logs/gtp.log` for errors
5. **Test with Easy difficulty** - rule out performance issues
6. **Verify file permissions** - especially on Linux systems

### Contributing

To improve the KataGo integration:

1. Test on different system configurations
2. Report performance issues with detailed system specs
3. Suggest configuration improvements
4. Help with documentation updates
5. Submit bug reports with reproduction steps

## 🏆 Credits & License

- **KataGo**: Created by David Wu - [MIT License](https://github.com/lightvector/KataGo/blob/master/LICENSE)
- **Neural Networks**: Licensed for research and non-commercial use
- **Gosei Play Integration**: Part of the Gosei Play project

---

**Ready to challenge the AI? Start with Easy difficulty and work your way up! 🎮🤖**

*Remember: KataGo is extremely strong, even on Easy mode. Don't be discouraged by losses - use them as learning opportunities to improve your Go skills!* 🎓 