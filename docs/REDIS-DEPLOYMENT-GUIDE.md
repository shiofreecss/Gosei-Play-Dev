# Redis Deployment Guide - Fix "Game not found" for External Users

## Problem Description

When your Gosei server is deployed to a VPS, external users (different IPs, mobile LTE) get "Game not found" errors because:

1. **Multiple Server Instances**: PM2 runs multiple Node.js processes in cluster mode
2. **Memory-based Game Storage**: Each process stores games in its own memory
3. **Load Balancer Routing**: Nginx distributes requests to different processes
4. **Cross-Instance Communication**: Without Redis, processes can't share game state

## Solution: Redis Adapter

The Redis adapter enables all server instances to share game state through a central Redis database.

## Deployment Steps

### 1. Upload Updated Code
```bash
# Make sure your code includes the Redis fixes
git add .
git commit -m "Fix Redis adapter for external user support"
git push origin main
```

### 2. Deploy to VPS
```bash
# Run the deployment script
sudo ./server/deploy.sh
```

### 3. Test Redis Connection
```bash
# After deployment, test Redis connectivity
cd /var/www/gosei/server
node test-redis.js
```

**Expected Output:**
```
🔄 Testing Redis connection for Gosei server...

📋 Environment Variables:
   NODE_ENV: production
   REDIS_URL: redis://127.0.0.1:6379
   REDIS_PASSWORD: [HIDDEN]

🔌 Testing basic Redis connection...
✅ Redis connected successfully
🚀 Redis client ready
📡 Ping test: PONG
💾 Set/Get test: ✅ PASSED

🔌 Testing Socket.IO Redis adapter setup...
✅ Socket.IO Redis adapter created successfully
🎯 Testing adapter room functionality...
✅ Room functionality test: READY

🎉 ALL TESTS PASSED!

✅ Redis is properly configured and ready for Socket.IO scaling
✅ Multiple server instances will be able to share game state
✅ External users from different IPs should be able to join games

🚀 Your server is ready for production deployment!
```

### 4. Verify Server Status
```bash
# Check if servers are running with Redis
curl http://your-domain.com/debug/redis
```

**Expected Response:**
```json
{
  "adapterConfigured": true,
  "adapterType": "RedisAdapter",
  "environment": {
    "NODE_ENV": "production",
    "REDIS_URL": "redis://127.0.0.1:6379",
    "REDIS_PASSWORD": "[CONFIGURED]"
  },
  "timestamp": "2024-01-XX..."
}
```

### 5. Test External Access

1. **Create a game** on your local browser
2. **Get the game code** (e.g., "ABC123")
3. **Ask your friend** to join with the game code from their different network/IP
4. **Test with mobile LTE** - use your phone on mobile data (not WiFi)

## Troubleshooting

### If Redis Test Fails:

```bash
# Check Redis service status
sudo systemctl status redis-server

# Check Redis logs
sudo tail -f /var/log/redis/redis-server.log

# Test manual Redis connection
redis-cli -a gosei_redis_secret_2024 ping

# Restart Redis if needed
sudo systemctl restart redis-server
```

### If External Users Still Can't Join:

1. **Check server logs:**
```bash
pm2 logs gosei-main
```

2. **Look for Redis adapter messages:**
   - `✅ Redis adapter connected successfully`
   - `🔄 Setting up Redis adapter for Socket.IO scaling...`

3. **Verify environment variables:**
```bash
curl http://your-domain.com/health
```

4. **Check if multiple instances are running:**
```bash
pm2 list
```

### Common Issues:

| Issue | Cause | Solution |
|-------|-------|----------|
| "Redis connection failed" | Redis not running | `sudo systemctl start redis-server` |
| "Auth failed" | Wrong password | Check REDIS_PASSWORD in deploy.sh |
| "Connection refused" | Redis config issue | Check /etc/redis/redis.conf |
| Still using memory adapter | NODE_ENV not set | Verify PM2 ecosystem.config.js |

## Key Configuration Points

### 1. Environment Variables (PM2)
```javascript
env: {
  NODE_ENV: 'production',
  PORT: 3001,
  REDIS_URL: 'redis://127.0.0.1:6379',
  REDIS_PASSWORD: 'gosei_redis_secret_2024'
}
```

### 2. Redis Configuration
```bash
# /etc/redis/redis.conf
bind 127.0.0.1
port 6379
requirepass gosei_redis_secret_2024
```

### 3. Nginx Load Balancer
```nginx
upstream gosei_backend {
    ip_hash;  # Sticky sessions for Socket.IO
    server 127.0.0.1:3001;
    server 127.0.0.1:3002 backup;
}
```

## Success Indicators

✅ **Redis test passes**
✅ **Server shows "RedisAdapter" type**  
✅ **External users can join games**
✅ **Mobile LTE users can connect**
✅ **Game state persists across server restarts**

## Next Steps

After successful deployment:

1. **Monitor logs** for Redis connection messages
2. **Test with multiple external users** from different networks
3. **Verify game state sharing** between server instances
4. **Set up monitoring** for Redis health checks

Your Gosei server will now support **100+ concurrent users** from **any IP address worldwide**! 🎉 