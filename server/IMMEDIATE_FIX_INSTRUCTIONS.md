# 🚨 IMMEDIATE FIX: Socket.IO "Game Not Found" Issue

## ⚡ Quick Solution (Skip Redis for now)

Since Redis is having startup issues, let's fix your immediate problem with **sticky sessions** first. This will solve the "game not found" issue right away.

## 🔧 Steps to Fix

### 1. Upload the Fix Script to Your Server

```bash
# From your local machine
scp server/quick-fix-sticky-sessions.sh ubuntu@gosei-svr-01.beaver.foundation:/home/ubuntu/
```

### 2. Run the Fix Script on Your Server

```bash
# SSH to your server
ssh ubuntu@gosei-svr-01.beaver.foundation

# Make script executable and run it
chmod +x quick-fix-sticky-sessions.sh
sudo ./quick-fix-sticky-sessions.sh
```

That's it! The script will:
- ✅ Backup your current nginx configuration
- ✅ Apply sticky sessions for Socket.IO 
- ✅ Test and reload nginx
- ✅ Fix the "game not found" issue

### 3. Test the Fix

1. **Browser A**: Go to https://gosei-svr-01.beaver.foundation and create a game
2. **Browser B**: Join the same game using the game code
3. **Result**: Both should work without "game not found" errors!

## 🤔 Alternative: Manual Fix (if script upload fails)

If you can't upload the script, you can apply the fix manually:

### On Your Production Server:

```bash
# Backup current config
sudo cp /etc/nginx/sites-available/gosei-svr-01.beaver.foundation /etc/nginx/sites-available/gosei-svr-01.beaver.foundation.backup

# Edit the nginx config
sudo nano /etc/nginx/sites-available/gosei-svr-01.beaver.foundation
```

### Add this upstream block (after the existing gosei_backend):

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

### Change the Socket.IO location block:

Find this line:
```nginx
proxy_pass http://gosei_backend;
```

In the `/socket.io/` location block, change it to:
```nginx
proxy_pass http://gosei_socketio;
```

### Test and apply:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 🎯 What This Fix Does

- **Before**: Socket.IO connections randomly hit different backend servers
- **After**: Socket.IO connections from the same IP always hit the same server
- **Result**: Games stay on the same instance where they were created

## 🔧 Redis Later (Optional)

You can set up Redis later for better scalability using the `fix-redis-startup.sh` script when you have time. But the sticky sessions fix will solve your immediate issue.

## 🆘 If Something Goes Wrong

Restore your backup:
```bash
sudo cp /etc/nginx/sites-available/gosei-svr-01.beaver.foundation.backup /etc/nginx/sites-available/gosei-svr-01.beaver.foundation
sudo systemctl reload nginx
```

## ✅ Expected Result

✅ **Before Fix**: "Game not found" when Browser B tries to join Browser A's game  
✅ **After Fix**: Multiple browsers can create and join games seamlessly  
✅ **Production**: Your server now works correctly for multi-player games!

---

**💡 TL;DR**: Run `quick-fix-sticky-sessions.sh` on your server and your "game not found" issue will be fixed immediately! 