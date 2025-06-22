# 🤖 KataGo Setup Guide for Gosei Play

This comprehensive guide covers KataGo AI setup for both **Windows** and **Ubuntu/Linux** systems. Choose your platform and follow the appropriate setup method.

## 🎯 What You Get

- **Powerful Go AI**: Play against KataGo, one of the strongest Go programs
- **Multiple Difficulty Levels**: Beginner to Professional strength
- **Optimized Performance**: Fast moves on modest hardware
- **Seamless Integration**: AI players work like human players in the game
- **Network Selection**: Automatic or manual network selection based on player skill

---

## 🚀 Windows Setup

### Method 1: Simple Setup (Binary Only)
For basic KataGo installation without neural networks:

```cmd
cd server
setup-katago.bat
```

**What this does:**
- Downloads KataGo CPU binary for Windows (v1.16.2)
- Sets up directory structure
- Tests KataGo installation
- Does NOT download neural network models

### Method 2: Complete Setup (Binary + Networks)
For full AI functionality with all network models:

```cmd
cd server\katago

# Step 1: Download all neural networks organized by skill level
w01-download-networks.bat

# Step 2: Extract all networks and clean up
w02-extract-all-networks.bat
```

**Network Organization:**
- `networks/beginner/`: 1000-1500 Elo (8k-7k players) - 1 network
- `networks/normal/`: 1500-1900 Elo (6k-1k players) - 4 networks  
- `networks/dan/`: 1941-2400 Elo (1d-4d players) - 4 networks
- `networks/pro/`: 2545-3050 Elo (5d+ players) - 3 networks

### Windows System Requirements
- **OS**: Windows 10/11 64-bit
- **RAM**: 4GB minimum, 8GB+ recommended
- **Storage**: 200MB for all networks
- **PowerShell**: Required for downloads and extraction

---

## 🐧 Ubuntu/Linux Setup

### Method 1: Simple Setup (Binary Only)
For basic KataGo installation without neural networks:

```bash
cd server
chmod +x setup-katago.sh
./setup-katago.sh
```

**What this does:**
- Downloads KataGo CPU binary for Linux (v1.16.2)
- Sets up directory structure
- Tests KataGo installation
- Does NOT download neural network models

### Method 2: Complete Setup (Binary + Networks)
For full AI functionality with all network models:

```bash
cd server/katago

# Complete setup: downloads, extracts, and organizes all networks
chmod +x u00-ubuntu-setup-all-networks.sh
./u00-ubuntu-setup-all-networks.sh
```

**What this does:**
- Downloads all 12 KataGo networks organized by Elo ranges
- Extracts all .txt.gz files to .txt files
- Removes .gz files to save disk space
- Creates metadata files for each network
- Automatically organizes networks by skill level

### Ubuntu System Requirements
- **OS**: Ubuntu 16.04+ or compatible Linux distribution
- **RAM**: 4GB minimum, 8GB+ recommended
- **Storage**: 200MB for all networks
- **Dependencies**: wget, gzip (usually pre-installed)

---

## 🎮 AI Difficulty Levels & Network Selection

### Automatic Selection by Elo Range

| Level | Elo Range | Description | Network Count | Best For |
|-------|-----------|-------------|---------------|----------|
| 🐣 **Beginner** | 1000-1500 | 8k-7k strength | 1 network | New Go players |
| 🎯 **Normal** | 1500-1900 | 6k-1k strength | 4 networks | Most players |
| 🔥 **Dan** | 1941-2400 | 1d-4d strength | 4 networks | Experienced players |
| 💎 **Pro** | 2545-3050 | 5d+ strength | 3 networks | Advanced players |

### Manual Network Selection
If you prefer to choose specific networks, they're located in:
- **Windows**: `server/katago/networks/[level]/`
- **Ubuntu**: `server/katago/networks/[level]/`

---

## 🔧 Testing Your Setup

### Windows Testing
```cmd
cd server\katago

# Test KataGo binary
katago.exe version

# Test with a specific network (replace with actual filename)
echo boardsize 9 | katago.exe gtp -model networks\beginner\kata1-b6c96-s1995008-d1329786.txt -config ..\engines\katago-cpu-config.cfg
```

### Ubuntu Testing
```bash
cd server/katago

# Test KataGo binary
./katago version

# Test with a specific network (replace with actual filename)
echo "boardsize 9" | ./katago gtp -model networks/beginner/kata1-b6c96-s1995008-d1329786.txt -config ../engines/katago-cpu-config.cfg
```

---

## 🎯 Performance Optimization

### Board Size Performance
- **9x9**: ⭐ Optimal (1-8 seconds per move)
- **13x13**: ✅ Good (5-15 seconds per move)  
- **19x19**: ⚠️ Slow (15-60+ seconds per move)

### Memory Usage by Network
- **Beginner networks**: ~100MB RAM
- **Normal/Dan networks**: ~200-400MB RAM
- **Pro networks**: ~400-600MB RAM

### Tips for Better Performance
1. **Use appropriate networks for your hardware**
2. **Close other applications while playing**
3. **Use 9x9 boards for fastest gameplay**
4. **Consider upgrading to 8GB+ RAM for Pro level**

---

## 🛠️ Troubleshooting

### Common Issues

#### "KataGo executable not found"
**Windows:**
```cmd
# Check if binary exists
dir server\katago\katago.exe

# Re-run setup if missing
cd server
setup-katago.bat
```

**Ubuntu:**
```bash
# Check if binary exists
ls -la server/katago/katago

# Make it executable if needed
chmod +x server/katago/katago

# Re-run setup if missing
cd server
./setup-katago.sh
```

#### "Neural network model not found"
**Windows:**
```cmd
# Check if networks exist
dir server\katago\networks\beginner\*.txt

# Re-download if missing
cd server\katago
w01-download-networks.bat
w02-extract-all-networks.bat
```

**Ubuntu:**
```bash
# Check if networks exist
ls -la server/katago/networks/beginner/*.txt

# Re-download if missing
cd server/katago
./u00-ubuntu-setup-all-networks.sh
```

#### AI moves very slowly
1. Lower the difficulty level (use Beginner/Normal networks)
2. Use 9x9 board size only
3. Close other applications
4. Check system resources
5. Ensure sufficient RAM available

---

## 📁 Expected File Structure

After complete setup, your directory should look like:

```
server/
├── katago/
│   ├── katago(.exe)                    # KataGo binary
│   ├── networks/                       # All AI networks
│   │   ├── beginner/                   # 1000-1500 Elo
│   │   │   ├── *.txt                   # Network files
│   │   │   └── *.meta.json             # Metadata
│   │   ├── normal/                     # 1500-1900 Elo
│   │   ├── dan/                        # 1941-2400 Elo
│   │   └── pro/                        # 2545-3050 Elo
│   ├── gtp_dev.cfg                     # Development config
│   ├── logs/                           # KataGo logs
│   ├── w01-download-networks.bat       # Windows download script
│   ├── w02-extract-all-networks.bat    # Windows extraction script
│   └── u00-ubuntu-setup-all-networks.sh # Ubuntu complete setup
├── engines/
│   ├── katago-cpu.js                   # AI engine wrapper
│   └── katago-cpu-config.cfg           # CPU-optimized config
├── managers/
│   ├── ai-game-manager.js              # AI game management
│   └── enhanced-ai-manager.js          # Enhanced AI with network selection
├── setup-katago.bat                    # Windows basic setup
├── setup-katago.sh                     # Ubuntu basic setup
└── server.js                           # Main server with AI integration
```

---

## 🎓 How to Play Against AI

### Game Creation
1. Fill in your username and configure game settings
2. ✅ Enable "Play against KataGo AI"
3. Select your preferred difficulty level:
   - **Beginner**: For new players (8k-7k strength)
   - **Normal**: For most players (6k-1k strength)
   - **Dan**: For experienced players (1d-4d strength)
   - **Pro**: For advanced players (5d+ strength)
4. Choose your color preference or leave as "Random"
5. Create the game and start playing!

### During the Game
- AI moves are displayed just like human moves
- AI thinking time is shown in the game interface
- You can resign, pass, or play normally
- Time controls work the same as human games
- Game ends normally with scoring

---

## 🔮 Advanced Configuration

### Custom Network Configuration
Edit `server/engines/katago-cpu-config.cfg` to:
- Adjust thinking time limits
- Modify search parameters
- Configure memory usage
- Set logging levels

### Enhanced AI Manager
The Enhanced AI Manager (`server/managers/enhanced-ai-manager.js`) provides:
- Automatic network selection based on difficulty
- Dynamic difficulty adjustment
- Performance monitoring
- Fallback network handling

---

## 🆘 Getting Help

If you encounter issues:

1. **Check the console output** for error messages
2. **Review log files** in `server/katago/logs/`
3. **Verify network files** are properly downloaded and extracted
4. **Test KataGo directly** using the testing commands above
5. **Ensure sufficient system resources** (RAM, CPU)

For specific platform issues:
- **Windows**: Check PowerShell execution policy
- **Ubuntu**: Verify wget and gzip are installed

---

## 📊 Network Download Summary

Total networks available: **12 networks**
- **Beginner**: 1 network (~12MB)
- **Normal**: 4 networks (~48MB)
- **Dan**: 4 networks (~48MB) 
- **Pro**: 3 networks (~36MB)
- **Total size**: ~144MB extracted

All networks are CPU-optimized b6c96 series for fast performance on modest hardware.

---

🎉 **Setup Complete!** Your KataGo AI is now ready for Go games at any skill level! 