# Ubuntu VPS KataGo Setup Guide

## Issue: "Failed to load AI networks" on Ubuntu VPS

This guide will help you set up KataGo networks properly on your Ubuntu VPS.

## Step 1: Check Server Status

First, verify your server is running and accessible:

```bash
# Check if your Node.js server is running
ps aux | grep node

# Check if the server is listening on the correct port
netstat -tulpn | grep :3001

# Test the API endpoint directly
curl http://localhost:3001/api/ai/all-networks
```

## Step 2: Check Current Directory Structure

```bash
# Navigate to your project directory
cd /path/to/your/DEV-Gosei-Play

# Check if the networks directory exists
ls -la server/katago/

# Check if any networks are downloaded
ls -la server/katago/networks/
```

## Step 3: Download and Setup KataGo Networks

### Option A: Use the Updated Ubuntu Script

```bash
# Navigate to the katago directory
cd server/katago

# Make the script executable
chmod +x u00-ubuntu-setup-all-networks.sh

# Run the setup script
./u00-ubuntu-setup-all-networks.sh
```

### Option B: Manual Setup

If the script doesn't work, download networks manually:

```bash
# Create directories
mkdir -p server/katago/networks/{beginner,normal,dan,pro}

# Download networks manually
cd server/katago/networks

# Beginner network (1071.5 Elo)
wget https://media.katagotraining.org/uploaded/networks/models/kata1/kata1-b6c96-s1995008-d1329786.txt.gz -O beginner/kata1-b6c96-s1995008-d1329786.txt.gz

# Normal networks (1539.5-1862.5 Elo)
wget https://media.katagotraining.org/uploaded/networks/models/kata1/kata1-b6c96-s4136960-d1510003.txt.gz -O normal/kata1-b6c96-s4136960-d1510003.txt.gz
wget https://media.katagotraining.org/uploaded/networks/models/kata1/kata1-b6c96-s5214720-d1690538.txt.gz -O normal/kata1-b6c96-s5214720-d1690538.txt.gz
wget https://media.katagotraining.org/uploaded/networks/models/kata1/kata1-b6c96-s6127360-d1754797.txt.gz -O normal/kata1-b6c96-s6127360-d1754797.txt.gz
wget https://media.katagotraining.org/uploaded/networks/models/kata1/kata1-b6c96-s8080640-d1961030.txt.gz -O normal/kata1-b6c96-s8080640-d1961030.txt.gz

# Dan networks (1941.4-2398.4 Elo)
wget https://media.katagotraining.org/uploaded/networks/models/kata1/kata1-b6c96-s8982784-d2082583.txt.gz -O dan/kata1-b6c96-s8982784-d2082583.txt.gz
wget https://media.katagotraining.org/uploaded/networks/models/kata1/kata1-b6c96-s10014464-d2201128.txt.gz -O dan/kata1-b6c96-s10014464-d2201128.txt.gz
wget https://media.katagotraining.org/uploaded/networks/models/kata1/kata1-b6c96-s10825472-d2300510.txt.gz -O dan/kata1-b6c96-s10825472-d2300510.txt.gz
wget https://media.katagotraining.org/uploaded/networks/models/kata1/kata1-b6c96-s11888896-d2416753.txt.gz -O dan/kata1-b6c96-s11888896-d2416753.txt.gz

# Pro networks (2545.2-3050.2 Elo)
wget https://media.katagotraining.org/uploaded/networks/models/kata1/kata1-b6c96-s12849664-d2510774.txt.gz -O pro/kata1-b6c96-s12849664-d2510774.txt.gz
wget https://media.katagotraining.org/uploaded/networks/models/kata1/kata1-b6c96-s13733120-d2631546.txt.gz -O pro/kata1-b6c96-s13733120-d2631546.txt.gz
wget https://media.katagotraining.org/uploaded/networks/models/kata1/kata1-b6c96-s175395328-d26788732.txt.gz -O pro/kata1-b6c96-s175395328-d26788732.txt.gz
```

## Step 4: Extract Networks

```bash
# Extract all .gz files to .txt files
cd server/katago/networks

# Extract beginner networks
cd beginner
for file in *.txt.gz; do
    if [ -f "$file" ]; then
        echo "Extracting $file..."
        gunzip -c "$file" > "${file%.gz}"
        rm "$file"
        echo "✅ Extracted and cleaned up $file"
    fi
done
cd ..

# Extract normal networks
cd normal
for file in *.txt.gz; do
    if [ -f "$file" ]; then
        echo "Extracting $file..."
        gunzip -c "$file" > "${file%.gz}"
        rm "$file"
        echo "✅ Extracted and cleaned up $file"
    fi
done
cd ..

# Extract dan networks
cd dan
for file in *.txt.gz; do
    if [ -f "$file" ]; then
        echo "Extracting $file..."
        gunzip -c "$file" > "${file%.gz}"
        rm "$file"
        echo "✅ Extracted and cleaned up $file"
    fi
done
cd ..

# Extract pro networks
cd pro
for file in *.txt.gz; do
    if [ -f "$file" ]; then
        echo "Extracting $file..."
        gunzip -c "$file" > "${file%.gz}"
        rm "$file"
        echo "✅ Extracted and cleaned up $file"
    fi
done
cd ..
```

## Step 5: Create Metadata Files

```bash
# Create metadata files for each network
cd server/katago/networks

# Create metadata for beginner network
cat > beginner/kata1-b6c96-s1995008-d1329786.meta.json << EOF
{
  "filename": "kata1-b6c96-s1995008-d1329786.txt",
  "elo": 1071.5,
  "level": "8k-7k level",
  "directory": "beginner",
  "cpu_friendly": true
}
EOF

# Create metadata for normal networks
cat > normal/kata1-b6c96-s4136960-d1510003.meta.json << EOF
{
  "filename": "kata1-b6c96-s4136960-d1510003.txt",
  "elo": 1539.5,
  "level": "6k-5k level",
  "directory": "normal",
  "cpu_friendly": true
}
EOF

cat > normal/kata1-b6c96-s5214720-d1690538.meta.json << EOF
{
  "filename": "kata1-b6c96-s5214720-d1690538.txt",
  "elo": 1611.3,
  "level": "5k-4k level",
  "directory": "normal",
  "cpu_friendly": true
}
EOF

cat > normal/kata1-b6c96-s6127360-d1754797.meta.json << EOF
{
  "filename": "kata1-b6c96-s6127360-d1754797.txt",
  "elo": 1711.0,
  "level": "4k-3k level",
  "directory": "normal",
  "cpu_friendly": true
}
EOF

cat > normal/kata1-b6c96-s8080640-d1961030.meta.json << EOF
{
  "filename": "kata1-b6c96-s8080640-d1961030.txt",
  "elo": 1862.5,
  "level": "2k-1k level",
  "directory": "normal",
  "cpu_friendly": true
}
EOF

# Create metadata for dan networks
cat > dan/kata1-b6c96-s8982784-d2082583.meta.json << EOF
{
  "filename": "kata1-b6c96-s8982784-d2082583.txt",
  "elo": 1941.4,
  "level": "1d level",
  "directory": "dan",
  "cpu_friendly": true
}
EOF

cat > dan/kata1-b6c96-s10014464-d2201128.meta.json << EOF
{
  "filename": "kata1-b6c96-s10014464-d2201128.txt",
  "elo": 2113.0,
  "level": "2d level",
  "directory": "dan",
  "cpu_friendly": true
}
EOF

cat > dan/kata1-b6c96-s10825472-d2300510.meta.json << EOF
{
  "filename": "kata1-b6c96-s10825472-d2300510.txt",
  "elo": 2293.5,
  "level": "3d level",
  "directory": "dan",
  "cpu_friendly": true
}
EOF

cat > dan/kata1-b6c96-s11888896-d2416753.meta.json << EOF
{
  "filename": "kata1-b6c96-s11888896-d2416753.txt",
  "elo": 2398.4,
  "level": "4d level",
  "directory": "dan",
  "cpu_friendly": true
}
EOF

# Create metadata for pro networks
cat > pro/kata1-b6c96-s12849664-d2510774.meta.json << EOF
{
  "filename": "kata1-b6c96-s12849664-d2510774.txt",
  "elo": 2545.2,
  "level": "5d level",
  "directory": "pro",
  "cpu_friendly": true
}
EOF

cat > pro/kata1-b6c96-s13733120-d2631546.meta.json << EOF
{
  "filename": "kata1-b6c96-s13733120-d2631546.txt",
  "elo": 2849.0,
  "level": "6d+ level",
  "directory": "pro",
  "cpu_friendly": true
}
EOF

cat > pro/kata1-b6c96-s175395328-d26788732.meta.json << EOF
{
  "filename": "kata1-b6c96-s175395328-d26788732.txt",
  "elo": 3050.2,
  "level": "Professional level",
  "directory": "pro",
  "cpu_friendly": true
}
EOF
```

## Step 6: Verify Setup

```bash
# Check the final directory structure
tree server/katago/networks/

# Or if tree isn't available:
find server/katago/networks/ -type f | sort

# Count total networks
find server/katago/networks/ -name "*.txt" | wc -l
# Should output: 12

# Count metadata files
find server/katago/networks/ -name "*.meta.json" | wc -l
# Should output: 12
```

## Step 7: Test the API

```bash
# Test the networks API endpoint
curl http://localhost:3001/api/ai/all-networks

# If the above fails, check if server is running on different port
curl http://localhost:8080/api/ai/all-networks

# Test with your actual VPS IP if needed
curl http://YOUR_VPS_IP:3001/api/ai/all-networks
```

## Step 8: Install KataGo (if needed)

If you haven't installed KataGo yet:

```bash
# Download KataGo for Linux
wget https://github.com/lightvector/KataGo/releases/download/v1.16.2/katago-v1.16.2-eigen-linux-x64.tar.gz

# Extract
tar -xzf katago-v1.16.2-eigen-linux-x64.tar.gz

# Move to your project
mv katago server/katago/katago

# Make executable
chmod +x server/katago/katago
```

## Step 9: Update Server Configuration

Make sure your server configuration points to the correct paths:

```javascript
// In server/engines/katago-cpu.js, verify paths are correct for Linux:
const katagoPath = path.join(__dirname, '../katago/katago'); // Linux executable
const configPath = path.join(__dirname, '../katago/katago-cpu-config.cfg');
```

## Step 10: Restart Server

```bash
# Stop the current server (if running with PM2)
pm2 stop all

# Or if running directly
pkill -f node

# Start the server again
cd /path/to/your/DEV-Gosei-Play
npm start

# Or with PM2
pm2 start server/server.js --name "gosei-server"
```

## Troubleshooting

### Issue: "Permission denied" when running scripts
```bash
chmod +x server/katago/u00-ubuntu-setup-all-networks.sh
chmod +x server/katago/katago
```

### Issue: "wget: command not found"
```bash
sudo apt update
sudo apt install wget
```

### Issue: "gunzip: command not found"
```bash
sudo apt install gzip
```

### Issue: Networks still not loading
1. Check server logs for specific errors
2. Verify file permissions: `ls -la server/katago/networks/*/`
3. Test individual network files exist and are readable
4. Check if the API endpoint is accessible from your frontend

### Issue: "Cannot find KataGo executable"
- Verify KataGo is downloaded and executable
- Check the path in `server/engines/katago-cpu.js`
- Ensure the executable has proper permissions

## Expected Final Structure

```
server/katago/networks/
├── beginner/
│   ├── kata1-b6c96-s1995008-d1329786.txt
│   └── kata1-b6c96-s1995008-d1329786.meta.json
├── normal/
│   ├── kata1-b6c96-s4136960-d1510003.txt
│   ├── kata1-b6c96-s4136960-d1510003.meta.json
│   ├── kata1-b6c96-s5214720-d1690538.txt
│   ├── kata1-b6c96-s5214720-d1690538.meta.json
│   ├── kata1-b6c96-s6127360-d1754797.txt
│   ├── kata1-b6c96-s6127360-d1754797.meta.json
│   ├── kata1-b6c96-s8080640-d1961030.txt
│   └── kata1-b6c96-s8080640-d1961030.meta.json
├── dan/
│   ├── kata1-b6c96-s8982784-d2082583.txt
│   ├── kata1-b6c96-s8982784-d2082583.meta.json
│   ├── kata1-b6c96-s10014464-d2201128.txt
│   ├── kata1-b6c96-s10014464-d2201128.meta.json
│   ├── kata1-b6c96-s10825472-d2300510.txt
│   ├── kata1-b6c96-s10825472-d2300510.meta.json
│   ├── kata1-b6c96-s11888896-d2416753.txt
│   └── kata1-b6c96-s11888896-d2416753.meta.json
└── pro/
    ├── kata1-b6c96-s12849664-d2510774.txt
    ├── kata1-b6c96-s12849664-d2510774.meta.json
    ├── kata1-b6c96-s13733120-d2631546.txt
    ├── kata1-b6c96-s13733120-d2631546.meta.json
    ├── kata1-b6c96-s175395328-d26788732.txt
    └── kata1-b6c96-s175395328-d26788732.meta.json
```

After completing these steps, your Ubuntu VPS should have all 12 KataGo networks properly set up and accessible through the API! 