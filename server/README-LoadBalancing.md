# Gosei Play Server - Load Balancing Setup

## 🚀 Overview

This setup implements **horizontal load balancing** for the Gosei Play Go server on a **2GB RAM VPS** (gosei-svr-01.beaver.foundation). The architecture uses:

- **Node.js Clustering**: Multiple worker processes for CPU utilization
- **Redis**: Shared state management across workers
- **PM2**: Process management and monitoring
- **Memory Optimization**: Configured for 2GB RAM constraints

## 🏗️ Architecture

```
Internet → Nginx (Reverse Proxy) → PM2 Cluster Manager
                                      ↓
                            [Worker 1] [Worker 2] [Worker 3] [Worker 4]
                                      ↓
                                 Redis (Shared State)
                                      ↓
                              Socket.IO Adapter (Redis)
```

### Key Components

1. **Cluster Manager** (`cluster.js`): Manages worker processes
2. **Clustered Server** (`server-clustered.js`): Redis-backed server instances
3. **Redis**: Shared game state and Socket.IO adapter
4. **PM2**: Production process management

## 📋 Prerequisites

- Ubuntu 18.04+ or similar Linux distribution
- Node.js 16+ installed
- Minimum 2GB RAM
- Domain: gosei-svr-01.beaver.foundation

## 🛠️ Installation

### 1. Quick Deployment

```bash
# Clone your repository
cd server/

# Make deployment script executable
chmod +x deploy.sh

# Run the complete deployment
./deploy.sh
```

### 2. Manual Installation

If you prefer manual setup:

```bash
# Install Redis
chmod +x setup-redis.sh
./setup-redis.sh

# Install Node.js dependencies
npm install

# Start with PM2
npm run pm2:start
```

## 📊 Memory Configuration (2GB VPS)

### Allocation Strategy
- **Redis**: 512MB (25%)
- **Node.js Workers**: ~1200MB (60%)
- **System + Other**: ~300MB (15%)

### Worker Limits
- **Max Workers**: 4 (capped for 2GB RAM)
- **Node.js Heap**: 1536MB total
- **Memory Restart**: 1500MB threshold

## 🔧 Configuration Files

### `ecosystem.config.js`
PM2 production configuration with memory limits:

```javascript
max_memory_restart: '1500MB'
node_args: '--max-old-space-size=1536'
instances: 1 // Single cluster manager
```

### `cluster.js`
Worker management with auto-scaling:

```javascript
const maxWorkers = Math.min(numCPUs, 4); // Cap at 4 for 2GB RAM
const MEMORY_THRESHOLD = 1.5 * 1024 * 1024 * 1024; // 1.5GB
```

### Redis Configuration
Optimized for 2GB VPS:

```
maxmemory 512mb
maxmemory-policy allkeys-lru
```

## 🚀 Usage

### Starting the Server
```bash
npm run pm2:start
```

### Monitoring
```bash
# General monitoring
./monitor.sh

# PM2 dashboard
pm2 monit

# Redis monitoring
redis-monitor

# Logs
pm2 logs
```

### Management Commands
```bash
# Restart server
./restart.sh

# Health check
./health-check.sh

# Stop server
pm2 stop ecosystem.config.js

# View process list
pm2 list
```

## 📈 Performance Optimization

### 1. Memory Management
- **Automatic restarts** when memory exceeds 1.5GB
- **Worker rotation** under high memory pressure
- **Redis LRU eviction** for game state cleanup

### 2. Load Distribution
- **Round-robin** request distribution
- **Sticky sessions** via Socket.IO Redis adapter
- **Graceful worker restarts** without downtime

### 3. Redis Optimization
- **Optimized data structures** for game state
- **TTL-based cleanup** (24-hour game expiry)
- **Compressed persistence** with RDB snapshots

## 🔍 Monitoring & Alerts

### System Metrics
```bash
# Memory usage
free -h

# CPU usage
top -bn1 | grep "Cpu(s)"

# Network connections
netstat -tlnp | grep :3001

# Redis info
redis-cli info memory
```

### Log Locations
- **PM2 Logs**: `./logs/`
- **Redis Logs**: `/var/log/redis/`
- **System Logs**: `journalctl -u redis`

## 🚨 Troubleshooting

### Common Issues

#### High Memory Usage
```bash
# Check memory by process
pm2 monit

# Restart workers
pm2 restart ecosystem.config.js

# Check Redis memory
redis-cli info memory
```

#### Redis Connection Issues
```bash
# Check Redis status
sudo systemctl status redis

# Test Redis connection
redis-cli ping

# View Redis logs
sudo journalctl -u redis -f
```

#### Worker Process Issues
```bash
# Check PM2 logs
pm2 logs --lines 50

# Restart specific worker
pm2 restart 0

# Full cluster restart
pm2 restart ecosystem.config.js
```

### Performance Tuning

#### For Higher Traffic
1. **Increase worker count** (if RAM allows)
2. **Add Redis persistence** for critical games
3. **Implement Redis clustering**
4. **Add Nginx load balancing**

#### For Lower Memory Usage
1. **Reduce worker count** to 2
2. **Lower Redis memory limit** to 256MB
3. **Adjust Node.js heap size**

## 🔐 Security Considerations

### Production Checklist
- [ ] Set Redis password
- [ ] Configure firewall (UFW)
- [ ] Setup SSL/TLS certificates
- [ ] Enable Redis AUTH
- [ ] Restrict Redis bind address
- [ ] Configure rate limiting

### Redis Security
```bash
# Set Redis password (in /etc/redis/redis.conf)
requirepass your_secure_password_here

# Restart Redis
sudo systemctl restart redis
```

## 📊 Scaling Strategies

### Vertical Scaling (Single Server)
- Upgrade to 4GB/8GB RAM
- Increase worker count
- Add Redis clustering

### Horizontal Scaling (Multiple Servers)
- Use external Redis cluster
- Implement Nginx load balancer
- Add health checks
- Database replication

## 🎯 Production Deployment

### Nginx Configuration
```nginx
upstream gosei_backend {
    server 127.0.0.1:3001;
    keepalive 64;
}

server {
    listen 80;
    server_name gosei-svr-01.beaver.foundation;
    
    location / {
        proxy_pass http://gosei_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### SSL Setup
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d gosei-svr-01.beaver.foundation
```

## 📞 Support

For issues related to:
- **Memory optimization**: Check PM2 and Redis configurations
- **Performance problems**: Review monitoring output
- **Connection issues**: Verify Redis and Socket.IO setup
- **Deployment**: Run `./health-check.sh` for diagnostics

## 🔄 Updates & Maintenance

### Regular Maintenance
```bash
# Update dependencies
npm update

# Restart with zero downtime
pm2 reload ecosystem.config.js

# Backup Redis data
redis-cli save
```

### Log Rotation
Automatic log rotation is configured for:
- PM2 logs (30 days)
- Redis logs (52 days)
- System logs (default) 