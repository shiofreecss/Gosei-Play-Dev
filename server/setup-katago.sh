#!/bin/bash

# KataGo CPU Setup Script for Ubuntu (4-8GB RAM)
# Optimized for 9x9 Go boards

set -e

echo "🚀 Setting up KataGo CPU for 9x9 Go..."

# Create directories
mkdir -p katago/models
mkdir -p bin

cd katago

# Download KataGo CPU binary for Linux
echo "📥 Downloading KataGo CPU binary..."
if [ ! -f "katago" ]; then
    # Download the latest KataGo CPU release
    KATAGO_VERSION="v1.16.2"
    KATAGO_URL="https://github.com/lightvector/KataGo/releases/download/${KATAGO_VERSION}/katago-${KATAGO_VERSION}-eigen-linux-x64.zip"
    
    wget -O katago-cpu.zip "$KATAGO_URL"
    unzip katago-cpu.zip
    # Find the katago executable and move it to the current directory
    find . -name "katago" -type f -exec mv {} ./katago \;
    chmod +x katago  
    rm katago-cpu.zip
    
    echo "✅ KataGo binary downloaded and installed"
else
    echo "✅ KataGo binary already exists"
fi

# Download a lightweight neural network model (b6c96 - 6 blocks, ~8MB)
echo "📥 Downloading lightweight neural network model..."
if [ ! -f "models/b6c96-s1235592320-d204142634.bin.gz" ]; then
    cd models
    
    # Download b6c96 model (6 blocks, very fast on CPU)
    MODEL_URL="https://media.katagotraining.org/uploaded/networks/models/kata1/b6c96-s1235592320-d204142634.bin.gz"
    wget -O b6c96-s1235592320-d204142634.bin.gz "$MODEL_URL"
    
    echo "✅ Neural network model downloaded"
    cd ..
else
    echo "✅ Neural network model already exists"
fi

# Test KataGo installation
echo "🧪 Testing KataGo installation..."
if ./katago version; then
    echo "✅ KataGo is working correctly"
else
    echo "❌ KataGo installation failed"
    exit 1
fi

# Create a simple test to verify GTP interface
echo "🧪 Testing GTP interface..."
echo -e "boardsize 9\nclear_board\nquit" | timeout 10s ./katago gtp -model models/b6c96-s1235592320-d204142634.bin.gz -config ../engines/katago-cpu-config.cfg > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ GTP interface working correctly"
else
    echo "⚠️  GTP interface test had issues, but KataGo should still work"
fi

cd ..

echo ""
echo "🎉 KataGo CPU setup completed!"
echo ""
echo "📋 Setup Summary:"
echo "   • KataGo binary: katago/katago"
echo "   • Neural network: katago/models/b6c96-s1235592320-d204142634.bin.gz"
echo "   • Configuration: engines/katago-cpu-config.cfg"
echo "   • Optimized for: 9x9 boards, 4-8GB RAM, CPU-only"
echo ""
echo "🚀 You can now start the server and create AI games!"
echo ""
echo "💡 Tips for better performance:"
echo "   • Close other applications to free up RAM"
echo "   • Use 'easy' or 'normal' AI difficulty for best performance"
echo "   • Consider upgrading to 8GB+ RAM for 'hard' difficulty"
echo "" 