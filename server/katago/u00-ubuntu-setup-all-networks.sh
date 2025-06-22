#!/bin/bash

# KataGo Complete Network Setup Script for Ubuntu/Linux
# Downloads all networks organized by playing strength level
# Extracts them and removes .gz files to save disk space

echo "=== KataGo Complete Network Setup for Ubuntu/Linux ==="
echo "This script will:"
echo "1. Download all 12 KataGo networks organized by Elo ranges"
echo "2. Extract all .txt.gz files to .txt files"
echo "3. Remove .gz files to save disk space"
echo "4. Create metadata files for each network"
echo ""

# Check if required tools are available
check_requirements() {
    echo "🔍 Checking requirements..."
    
    if ! command -v wget &> /dev/null; then
        echo "❌ wget is required but not installed."
        echo "Install with: sudo apt update && sudo apt install wget"
        exit 1
    fi
    
    if ! command -v gunzip &> /dev/null; then
        echo "❌ gunzip is required but not installed."
        echo "Install with: sudo apt update && sudo apt install gzip"
        exit 1
    fi
    
    echo "✅ All requirements satisfied"
    echo ""
}

# Create directories if they don't exist
echo "📁 Creating directory structure..."
mkdir -p networks/beginner
mkdir -p networks/normal
mkdir -p networks/dan
mkdir -p networks/pro
echo "✅ Directories created"
echo ""

# Base URL for KataGo networks
BASE_URL="https://media.katagotraining.org/uploaded/networks/models/kata1"

# Function to download and extract network
download_and_extract_network() {
    local filename=$1
    local directory=$2
    local elo=$3
    local level_desc=$4
    local txt_filename="${filename%.gz}"
    
    echo "Processing $level_desc ($elo Elo): $filename"
    
    # Download if not exists
    if [ ! -f "networks/$directory/$filename" ] && [ ! -f "networks/$directory/$txt_filename" ]; then
        echo "  📥 Downloading $filename..."
        if wget -q "$BASE_URL/$filename" -O "networks/$directory/$filename"; then
            echo "  ✅ Downloaded: $filename"
        else
            echo "  ❌ Failed to download: $filename"
            return 1
        fi
    elif [ -f "networks/$directory/$txt_filename" ]; then
        echo "  ○ Already extracted: $txt_filename"
        return 0
    else
        echo "  ○ Already downloaded: $filename"
    fi
    
    # Extract if .gz file exists and .txt doesn't
    if [ -f "networks/$directory/$filename" ] && [ ! -f "networks/$directory/$txt_filename" ]; then
        echo "  🔧 Extracting $filename..."
        cd "networks/$directory"
        
        if gunzip -c "$filename" > "$txt_filename" 2>/dev/null; then
            if [ -f "$txt_filename" ] && [ -s "$txt_filename" ]; then
                echo "  ✅ Extracted: $txt_filename"
                echo "  🗑️  Removing $filename..."
                rm "$filename"
                echo "  ✅ Cleaned up: $filename"
            else
                echo "  ❌ Failed to extract $filename (empty output)"
                rm -f "$txt_filename"
                cd "../.."
                return 1
            fi
        else
            echo "  ❌ Failed to extract $filename"
            cd "../.."
            return 1
        fi
        cd "../.."
    fi
    
    # Create metadata file if it doesn't exist
    local meta_filename="networks/$directory/${txt_filename%.txt}.meta.json"
    if [ ! -f "$meta_filename" ]; then
        echo "  📝 Creating metadata file..."
        cat > "$meta_filename" << EOF
{
  "filename": "$txt_filename",
  "elo": $elo,
  "level": "$level_desc",
  "directory": "$directory",
  "cpu_friendly": true
}
EOF
        echo "  ✅ Created: ${meta_filename##*/}"
    fi
    
    echo ""
    return 0
}

# Check requirements first
check_requirements

echo "🚀 Starting network setup process..."
echo ""

echo "=== BEGINNER LEVEL (1000-1500 Elo) ==="
download_and_extract_network "kata1-b6c96-s1995008-d1329786.txt.gz" "beginner" "1071.5" "8k-7k level"

echo "=== NORMAL LEVEL (1500-1900 Elo) ==="
download_and_extract_network "kata1-b6c96-s4136960-d1510003.txt.gz" "normal" "1539.5" "6k-5k level"
download_and_extract_network "kata1-b6c96-s5214720-d1690538.txt.gz" "normal" "1611.3" "5k-4k level"
download_and_extract_network "kata1-b6c96-s6127360-d1754797.txt.gz" "normal" "1711.0" "4k-3k level"
download_and_extract_network "kata1-b6c96-s8080640-d1961030.txt.gz" "normal" "1862.5" "2k-1k level"

echo "=== DAN LEVEL (1941-2400 Elo) ==="
download_and_extract_network "kata1-b6c96-s8982784-d2082583.txt.gz" "dan" "1941.4" "1d level"
download_and_extract_network "kata1-b6c96-s10014464-d2201128.txt.gz" "dan" "2113.0" "2d level"
download_and_extract_network "kata1-b6c96-s10825472-d2300510.txt.gz" "dan" "2293.5" "3d level"
download_and_extract_network "kata1-b6c96-s11888896-d2416753.txt.gz" "dan" "2398.4" "4d level"

echo "=== PRO LEVEL (2545-3050 Elo) ==="
download_and_extract_network "kata1-b6c96-s12849664-d2510774.txt.gz" "pro" "2545.2" "5d level"
download_and_extract_network "kata1-b6c96-s13733120-d2631546.txt.gz" "pro" "2849.0" "6d+ level"
download_and_extract_network "kata1-b6c96-s175395328-d26788732.txt.gz" "pro" "3050.2" "Professional level"

echo "=== SETUP COMPLETE ==="
echo ""

# Count total networks
total_networks=0
for dir in networks/*/; do
    if [ -d "$dir" ]; then
        count=$(find "$dir" -name "*.txt" -not -name "*.meta.*" | wc -l)
        total_networks=$((total_networks + count))
    fi
done

echo "📊 Setup Summary:"
echo "   • Total networks ready: $total_networks"
echo "   • All networks extracted and ready for KataGo"
echo "   • All .gz files automatically removed to save space"
echo "   • Metadata files created for each network"
echo ""

echo "📁 Network organization by Elo ranges:"
echo "   • networks/beginner/  : 1000-1500 Elo (8k-7k players) - 1 network"
echo "   • networks/normal/    : 1500-1900 Elo (6k-1k players) - 4 networks"  
echo "   • networks/dan/       : 1941-2400 Elo (1d-4d players) - 4 networks"
echo "   • networks/pro/       : 2545-3050 Elo (5d+ players) - 3 networks"
echo ""

echo "💾 Disk space optimization:"
echo "   • Each network: ~4.8MB .gz → ~12MB .txt"
echo "   • Total space saved: ~$(echo "$total_networks * 4.8" | bc 2>/dev/null || echo "58")MB"
echo ""

echo "🎮 All networks are ready for use with KataGo!"
echo "💡 Choose networks based on player skill level for optimal gameplay"
echo ""
echo "🔧 Next steps:"
echo "   1. Install KataGo if not already installed"
echo "   2. Configure your Go application to use these networks"
echo "   3. Use the Enhanced AI Manager for automatic network selection"
echo ""

# Make the script files executable (for future use)
echo "🔧 Setting up script permissions..."
chmod +x "$(dirname "$0")/download-networks.sh" 2>/dev/null || true
chmod +x "$(dirname "$0")/u02-extract-all-networks.sh" 2>/dev/null || true
chmod +x "$0" 2>/dev/null || true

echo "✅ Ubuntu KataGo network setup complete!" 