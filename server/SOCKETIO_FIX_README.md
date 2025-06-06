# Socket.IO Load Balancing Fix

## 🔍 Problem Description

Your production server has a **"game not found"** issue when multiple browsers try to create and join games. This happens because:

1. **nginx load balancer** routes traffic to multiple backend instances (ports 3001 and 3002)
2. **Browser A** creates a game → hits port 3001 → game stored in 3001's memory
3. **Browser B** joins game → hits port 3002 → port 3002 doesn't have the game → **"game not found"**
4. The issue doesn't happen on localhost because there's only one instance running

## 🏥 Current Configuration Issue

```nginx
upstream gosei_backend {
    least_conn;
    server 127.0.0.1:3001 max_fails=3 fail_timeout=30s weight=3;
    server 127.0.0.1:3002 backup max_fails=2 fail_timeout=15s;
}
```

Socket.IO connections are distributed randomly between instances, but **game state is only stored in memory** of each individual instance.

## ✅ Solutions Available

### Solution 1: Sticky Sessions (Quick Fix) ⚡
- **What it does**: Routes Socket.IO connections based on client IP
- **Pros**: Works immediately, no additional setup
- **Cons**: Less even load distribution, doesn't work with CDNs/proxies
- **Best for**: Quick fix while implementing Solution 2

### Solution 2: Redis Adapter (Best Practice) 🏆  
- **What it does**: Shares Socket.IO state across all instances using Redis
- **Pros**: True scalability, works with any load balancing
- **Cons**: Requires Redis installation and configuration
- **Best for**: Production environments

## 🚀 How to Fix

### Option A: Run the Automated Fix Script

1. **Upload the fix script** to your production server:
   ```bash
   scp server/fix-socketio-loadbalancing.sh ubuntu@your-server:/home/ubuntu/
   ```

2. **Run the script** on your production server:
   ```bash
   ssh ubuntu@your-server
   chmod +x fix-socketio-loadbalancing.sh
   sudo ./fix-socketio-loadbalancing.sh
   ```

3. **Choose your solution** when prompted:
   - Option 1: Sticky Sessions (immediate fix)
   - Option 2: Redis Adapter (best practice)
   - Option 3: Both (recommended)

### Option B: Manual Quick Fix (Sticky Sessions)

**On your production server**, edit the nginx configuration:

```bash
sudo nano /etc/nginx/sites-available/gosei-svr-01.beaver.foundation
```

**Add this upstream block** for Socket.IO:

```nginx
# Sticky session upstream for Socket.IO
upstream gosei_socketio {
    ip_hash;  # This ensures Socket.IO connections stick to same backend
    server 127.0.0.1:3001 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:3002 max_fails=2 fail_timeout=15s;
    keepalive 32;
    keepalive_requests 1000;
    keepalive_timeout 60s;
}
```

**Update the Socket.IO location block**:

```nginx
location /socket.io/ {
    limit_req zone=socket burst=200 nodelay;
    proxy_pass http://gosei_socketio;  # Use sticky upstream
    # ... rest of configuration stays the same
}
```

**Test and reload nginx**:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 🧪 Testing the Fix

After applying the fix:

1. **Test from different browsers/devices**:
   - Browser A: Create a game on https://gosei-svr-01.beaver.foundation
   - Browser B: Join the same game using the game code
   - Both should work without "game not found" errors

2. **Test from different networks**:
   - Mobile hotspot vs WiFi
   - Different locations
   - Should work consistently

## 📋 Verification Commands

**Check nginx configuration**:
```bash
sudo nginx -t
```

**Check backend processes**:
```bash
pm2 status
```

**Check nginx access logs**:
```bash
sudo tail -f /var/log/nginx/access.log
```

**Test Socket.IO endpoint**:
```bash
curl -I https://gosei-svr-01.beaver.foundation/socket.io/
```

## 🔧 Advanced: Redis Adapter Implementation

If you chose Redis adapter, you also need to **update your server code**:

1. **Install dependencies** (done by script):
   ```bash
   npm install @socket.io/redis-adapter redis
   ```

2. **Add to your server.js**:
   ```javascript
   const redisAdapter = require('./redis-adapter');
   
   // After creating your io instance
   redisAdapter(io).catch(console.error);
   ```

3. **Restart PM2 processes**:
   ```bash
   pm2 restart all
   ```

## 🎯 Expected Results

✅ **Before Fix**: "Game not found" when joining from different browsers  
✅ **After Fix**: Games work seamlessly across multiple browsers and devices  
✅ **Production Ready**: Your server can handle multiple concurrent games  

## 🆘 Troubleshooting

**If fix doesn't work**:

1. **Check nginx syntax**:
   ```bash
   sudo nginx -t
   ```

2. **Restart nginx completely**:
   ```bash
   sudo systemctl restart nginx
   ```

3. **Check PM2 processes**:
   ```bash
   pm2 logs
   ```

4. **Restore backup** if needed:
   ```bash
   sudo cp /etc/nginx/sites-available/gosei-svr-01.beaver.foundation.backup.* /etc/nginx/sites-available/gosei-svr-01.beaver.foundation
   sudo systemctl reload nginx
   ```

**Still having issues?** Check the browser developer console for WebSocket connection errors.

---

💡 **Pro Tip**: The sticky sessions fix should resolve your immediate issue. You can implement the Redis adapter later for better scalability. 