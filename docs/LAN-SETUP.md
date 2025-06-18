# Gosei Play - LAN Setup Guide

This guide explains how to enable LAN (Local Area Network) play so other computers on your network can connect to your Gosei Play server.

## Quick Start

### Windows
1. Run `start-lan.bat` instead of `start.bat`
2. The script will display your local IP address
3. Other players can access the game at `http://YOUR_IP:3000`

### Linux/Mac
1. Run `./start-lan.sh` instead of `./start.sh`
2. The script will display your local IP address
3. Other players can access the game at `http://YOUR_IP:3000`

## What's Different in LAN Mode

- **Server**: Binds to `0.0.0.0:3001` instead of `localhost:3001`
- **Client**: Binds to `0.0.0.0:3000` instead of `localhost:3000`
- **Auto-detection**: Client automatically detects the server IP when accessed via LAN

## Firewall Configuration

### Windows Firewall
1. Open Windows Defender Firewall
2. Click "Allow an app or feature through Windows Defender Firewall"
3. Click "Change Settings" and then "Allow another app..."
4. Add Node.js and allow it through both Private and Public networks
5. Alternatively, allow ports 3000 and 3001 specifically

### Quick Firewall Commands (Windows - Run as Administrator)
```batch
netsh advfirewall firewall add rule name="Gosei Play Client" dir=in action=allow protocol=TCP localport=3000
netsh advfirewall firewall add rule name="Gosei Play Server" dir=in action=allow protocol=TCP localport=3001
```

### Linux Firewall (ufw)
```bash
sudo ufw allow 3000
sudo ufw allow 3001
```

## Troubleshooting

### Cannot Connect from Other Computers
1. **Check IP Address**: Ensure you're using the correct IP address
2. **Firewall**: Temporarily disable firewall to test
3. **Network**: Ensure both computers are on the same network
4. **Antivirus**: Some antivirus software blocks network connections

### Finding Your IP Address Manually

#### Windows
```cmd
ipconfig | findstr "IPv4"
```

#### Linux/Mac
```bash
hostname -I
# or
ifconfig | grep "inet " | grep -v 127.0.0.1
```

### Common Issues
- **Router/ISP blocking**: Some routers block peer-to-peer connections
- **VPN**: Disable VPN if having connection issues
- **Multiple Network Adapters**: Make sure you're using the right IP address

## Manual Configuration

If you need to specify a custom server IP, set the environment variable:
```bash
# Windows
set REACT_APP_SERVER_HOST=192.168.1.100
npm start

# Linux/Mac
REACT_APP_SERVER_HOST=192.168.1.100 npm start
```

## Security Notes

- LAN mode allows any computer on your network to access the game
- Consider your network security before enabling LAN mode
- The server doesn't require authentication, so anyone with network access can join
- Only enable LAN mode on trusted networks

## Testing the Setup

1. Start the server in LAN mode on one computer
2. On another computer on the same network, open a web browser
3. Navigate to `http://[SERVER_IP]:3000`
4. You should see the Gosei Play interface
5. Create a game on one computer and try to join from another

## Port Reference

- **3000**: React development server (client)
- **3001**: Socket.IO server (game server)

Both ports need to be accessible from the network for LAN play to work properly. 