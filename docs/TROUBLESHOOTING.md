# Troubleshooting Guide for Gosei Play

## Current Version: v1.0.8 ✅

**Status**: Production Ready | **Last Updated**: May 26, 2025

This guide covers common issues and solutions for the Gosei Play application, including the latest features like authentic byo-yomi time controls and intelligent game type automation.

## Quick Diagnostics

### System Status Check
1. **Frontend**: Check if React app loads at `http://localhost:3000`
2. **Backend**: Verify socket server runs on `http://localhost:3001`
3. **Connection**: Look for green connection indicator in bottom-right corner
4. **Browser Console**: Press F12 and check for errors

### Connection Status Indicator
- **🟢 Green**: Server connected and ready
- **🔴 Red**: Server disconnected or unreachable
- **🟡 Yellow**: Connecting or intermittent connection

## Game Creation and Navigation Issues

### Problem: App doesn't redirect after creating a game

#### Solution 1: Use the Automated Startup Script
The most reliable way to start the application:

```bash
# Windows
run-all.bat

# Linux/Mac
./start.sh
```

This script will:
- Install all dependencies for both client and server
- Check if the socket server is already running
- Start the socket server if needed
- Start the React app
- Verify connections

#### Solution 2: Manual Server Check
If automated startup fails, check server status:

```bash
# Windows
check-server.bat

# Linux/Mac
./check-server.sh
```

#### Solution 3: Manual Startup
Start components individually:

```bash
# Terminal 1: Start the socket server
cd server
npm install
npm start

# Terminal 2: Start the React app
npm install
npm start
```

### Problem: Socket connection issues

#### Symptoms
- Red connection indicator
- Games not creating
- Real-time updates not working
- Console errors about WebSocket connections

#### Solutions
1. **Check Firewall**: Ensure port 3001 is not blocked
2. **Antivirus Software**: Temporarily disable to test
3. **Browser Issues**: Try different browser or incognito mode
4. **Network Configuration**: Check proxy settings
5. **Port Conflicts**: Ensure port 3001 is available

## Time Control Issues (v1.0.8)

### Problem: Byo-yomi not working correctly

#### Symptoms
- Time not resetting after moves
- Periods not consuming properly
- Timeout not triggering correctly

#### Solutions
1. **Server Restart**: Restart the socket server
2. **Browser Refresh**: Hard refresh the page (Ctrl+F5)
3. **Check Logs**: Look for byo-yomi messages in server console
4. **Game Type**: Ensure you're not in Blitz mode (byo-yomi disabled)

### Problem: Time control automation not working

#### Symptoms
- Game type not changing when adjusting time per move
- Byo-yomi controls not disabling in Blitz games
- Time settings not auto-adjusting

#### Solutions
1. **Clear Browser Cache**: Clear localStorage and cookies
2. **Check Game Type**: Verify correct game type is selected
3. **Manual Override**: Manually set desired time controls
4. **Browser Compatibility**: Ensure modern browser (Chrome 90+, Firefox 88+)

## Board and Game Logic Issues

### Problem: Ko rule violations not detected

#### Symptoms
- Infinite capture loops possible
- Invalid moves allowed
- Board state inconsistencies

#### Solutions
1. **Server Restart**: Ko rule logic is server-side
2. **Game Refresh**: Refresh the game page
3. **Check Console**: Look for Ko rule error messages
4. **Report Bug**: If persistent, report with game state

### Problem: Handicap stones not placing correctly

#### Symptoms
- Wrong number of stones
- Incorrect positions
- Visual display issues

#### Solutions
1. **Board Size Check**: Ensure board size supports handicap count
2. **Game Type**: Verify "Handicap Game" is selected
3. **Browser Refresh**: Reload the page
4. **Clear Cache**: Clear browser cache and localStorage

## Mobile and Responsive Issues

### Problem: Touch interface not working

#### Symptoms
- Can't place stones on mobile
- Buttons not responding to touch
- Layout issues on small screens

#### Solutions
1. **Browser Update**: Ensure latest mobile browser
2. **Zoom Level**: Reset browser zoom to 100%
3. **Orientation**: Try both portrait and landscape
4. **Touch Calibration**: Check device touch settings

### Problem: Board not displaying correctly on mobile

#### Symptoms
- Board too small or large
- Grid lines not visible
- Stones overlapping

#### Solutions
1. **Screen Size**: Use recommended board sizes for mobile (9×9, 13×13)
2. **Browser Zoom**: Adjust zoom level for better visibility
3. **Device Rotation**: Try landscape mode for larger boards
4. **Browser Choice**: Use Chrome or Safari for best compatibility

## Performance Issues

### Problem: Slow game performance

#### Symptoms
- Lag when placing stones
- Slow time updates
- Delayed move synchronization

#### Solutions
1. **Close Other Tabs**: Reduce browser memory usage
2. **Check Network**: Ensure stable internet connection
3. **Server Load**: Check if server is overloaded
4. **Device Performance**: Close other applications

### Problem: Memory leaks or crashes

#### Symptoms
- Browser becomes unresponsive
- Page crashes after extended play
- Increasing memory usage

#### Solutions
1. **Page Refresh**: Refresh the game page periodically
2. **Browser Restart**: Close and reopen browser
3. **Clear Cache**: Clear browser cache and data
4. **Update Browser**: Ensure latest browser version

## Network and Connectivity Issues

### Problem: Intermittent disconnections

#### Symptoms
- Connection indicator flashing
- Moves not syncing
- Game state inconsistencies

#### Solutions
1. **Network Stability**: Check internet connection
2. **VPN Issues**: Disable VPN if causing problems
3. **Proxy Settings**: Check corporate proxy configuration
4. **ISP Issues**: Contact internet service provider

### Problem: Cannot connect to server

#### Symptoms
- Persistent red connection indicator
- "Server unavailable" messages
- Cannot create or join games

#### Solutions
1. **Server Status**: Check if server is running
2. **URL Configuration**: Verify server URL in config
3. **DNS Issues**: Try different DNS servers
4. **Firewall**: Check corporate firewall settings

## Browser-Specific Issues

### Chrome Issues
- **Clear Site Data**: Settings > Privacy > Clear browsing data
- **Disable Extensions**: Test with extensions disabled
- **Hardware Acceleration**: Toggle hardware acceleration

### Firefox Issues
- **Enhanced Tracking Protection**: Disable for the site
- **WebSocket Support**: Ensure WebSockets are enabled
- **Security Settings**: Check security.tls settings

### Safari Issues
- **WebSocket Support**: Ensure WebSockets are enabled
- **Cross-Origin**: Check cross-origin settings
- **Private Browsing**: Test in regular browsing mode

### Edge Issues
- **Compatibility Mode**: Ensure not in compatibility mode
- **Security Zones**: Check security zone settings
- **WebSocket Support**: Verify WebSocket support

## Development and Debugging

### Debug Mode
Enable debug logging by adding to localStorage:
```javascript
localStorage.setItem('debug', 'true');
```

### Console Commands
Useful browser console commands:
```javascript
// Check game state
console.log(gameState);

// Check connection status
console.log(socket.connected);

// Clear all localStorage
localStorage.clear();

// Check time control settings
console.log(localStorage.getItem('gosei-time-control'));
```

### Server Logs
Monitor server console for:
- Connection events
- Game creation messages
- Time control updates
- Error messages

## Advanced Troubleshooting

### Complete Reset Procedure
If all else fails, perform a complete reset:

1. **Stop All Processes**
   ```bash
   # Kill all node processes
   taskkill /f /im node.exe  # Windows
   killall node              # Linux/Mac
   ```

2. **Clean Installation**
   ```bash
   # Remove node_modules
   rm -rf node_modules server/node_modules
   
   # Clear npm cache
   npm cache clean --force
   
   # Reinstall dependencies
   npm install
   cd server && npm install
   ```

3. **Clear Browser Data**
   - Clear all cookies and localStorage
   - Disable browser extensions
   - Reset browser settings if necessary

4. **Restart Everything**
   ```bash
   # Use startup script
   ./run-all.bat  # Windows
   ./start.sh     # Linux/Mac
   ```

### Environment Issues

#### Node.js Version
Ensure compatible Node.js version:
```bash
node --version  # Should be 16.x or higher
npm --version   # Should be 8.x or higher
```

#### Port Conflicts
Check for port conflicts:
```bash
# Windows
netstat -ano | findstr :3001
netstat -ano | findstr :3000

# Linux/Mac
lsof -i :3001
lsof -i :3000
```

#### Environment Variables
Check environment configuration:
```bash
# Display environment variables
echo $NODE_ENV
echo $REACT_APP_SERVER_URL
```

## Getting Help

### Before Reporting Issues
1. **Check this guide** for common solutions
2. **Search existing issues** in the repository
3. **Test in different browser** to isolate the problem
4. **Gather debug information** (console logs, network tab)

### Reporting Bugs
When reporting issues, include:
- **Version**: Current version (v1.0.8)
- **Browser**: Browser type and version
- **Operating System**: OS and version
- **Steps to Reproduce**: Detailed reproduction steps
- **Console Logs**: Any error messages
- **Network Tab**: WebSocket connection status
- **Screenshots**: Visual issues if applicable

### Community Support
- **GitHub Issues**: For bug reports and feature requests
- **Documentation**: Check all documentation files
- **Code Review**: Review source code for understanding

### Emergency Procedures
For critical issues affecting gameplay:
1. **Immediate**: Restart both client and server
2. **Short-term**: Use backup deployment if available
3. **Long-term**: Investigate root cause and implement fix

---

*This troubleshooting guide is regularly updated. For the latest information, check the repository documentation.* 