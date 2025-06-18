# KataGo CPU Setup Guide for Windows Development

This guide will help you set up KataGo CPU for local Windows development and testing of the Gosei Play AI features.

## ✅ Quick Setup Status

Your KataGo CPU setup is **PARTIALLY COMPLETE**:
- ✅ KataGo executable (v1.16.2) is installed and working
- ✅ All required DLL files are present
- ✅ Configuration files are created
- ⚠️ Neural network model needs to be downloaded manually

## Manual Neural Network Download (Required)

The neural network models failed to download automatically. Please download manually:

### Option 1: Download from KataGo Training Site (Recommended)
1. Visit: https://katagotraining.org/
2. Look for "Latest Networks" section
3. Download a **b6c96** or **b18c384** model (smaller models work better for CPU)
4. Save the `.bin.gz` file to your `server/katago/` directory

### Option 2: Download from GitHub Releases
1. Visit: https://github.com/lightvector/KataGo/releases/latest
2. Scroll down to "Assets" section
3. Look for neural network files ending in `.bin.gz`
4. Download a **b6c96** model for CPU usage
5. Save to your `server/katago/` directory

### Recommended Models for CPU Development:
- `kata1-b6c96-s175395328-d26788732.bin.gz` (~8MB, good for testing)
- `b6c96-s1235592320-d204142634.bin.gz` (~8MB, alternative)

## Testing Your Setup

Once you have downloaded a neural network model:

1. **Test KataGo with the model:**
```cmd
cd server\katago
katago.exe benchmark -model YOUR_MODEL_NAME.bin.gz -config ..\engines\katago-cpu-config.cfg
```

2. **Test the AI integration:**
```cmd
cd server
node server.js
```

3. **Test in your browser:**
   - Open http://localhost:3000
   - Create a new AI game
   - Make a move and see if the AI responds

## Current File Structure

Your setup should look like this:
```
server/
├── katago/
│   ├── katago.exe              ✅ Working
│   ├── *.dll                   ✅ All DLLs present
│   ├── gtp_dev.cfg            ✅ Config file
│   ├── logs/                  ✅ Log directory
│   └── YOUR_MODEL.bin.gz      ⚠️ Download manually
├── engines/
│   └── katago-cpu.js          ✅ Engine wrapper
└── managers/
    └── ai-game-manager.js     ✅ AI game manager
```

## Performance Expectations

With the CPU version on Windows:
- **9x9 boards**: 1-5 seconds per move (good for development)
- **19x19 boards**: 5-30 seconds per move (slower but workable)
- **Memory usage**: ~100-500MB depending on model size

## Troubleshooting

### If KataGo fails to start:
1. Make sure you downloaded the neural network model
2. Check that the model file is not corrupted (should be several MB, not just a few bytes)
3. Verify the file path in your config matches the actual file name

### If moves are too slow:
1. Use a smaller model (b6c96 instead of b18c384)
2. Reduce the number of visits in the config
3. Consider using fewer search threads

### If the AI doesn't respond:
1. Check the server console for error messages
2. Look at the KataGo log files in `server/katago/logs/`
3. Verify your Node.js server is running properly

## Next Steps

1. **Download a neural network model** (see instructions above)
2. **Test the setup** using the commands provided
3. **Start developing** - your AI features should now work!

## Configuration Files

The setup has created optimized configuration files:
- `server/katago/gtp_dev.cfg` - Development configuration
- `server/engines/katago-cpu-config.cfg` - CPU-optimized settings

These are tuned for 9x9 Go development with reasonable performance on 4-8GB RAM systems.

## Getting Help

If you encounter issues:
1. Check the error messages in the console
2. Look at the log files in `server/katago/logs/`
3. Verify your neural network model downloaded correctly (file size should be several MB)
4. Test KataGo directly with the benchmark command shown above 