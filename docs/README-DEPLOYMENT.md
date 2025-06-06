# 🚀 Gosei Server Production Deployment

This repository contains a comprehensive deployment solution for the Gosei Go game server, optimized for 100+ concurrent users on a 2GB VPS.

## 📋 Quick Start

### 1. Prepare Your VPS

- **OS**: Ubuntu 20.04 LTS or newer
- **RAM**: 2GB minimum 
- **Domain**: Point `gosei-svr-01.beaver.foundation` to your VPS IP
- **User**: Non-root user with sudo privileges

### 2. Update Configuration

Before running the script, update these variables in `deploy-gosei-production.sh`:

```bash
# Required Updates:
REPO_URL="https://github.com/YOURUSERNAME/gosei-play.git"  # Your actual repo
EMAIL="your-email@domain.com"  # For SSL certificates
```

### 3. Run the Deployment Script

```bash
# Download the deployment script
wget https://raw.githubusercontent.com/yourusername/gosei-play/main/deploy-gosei-production.sh

# Make it executable
chmod +x deploy-gosei-production.sh

# Run the deployment
./deploy-gosei-production.sh
```

The script will automatically:
- ✅ Install Node.js 18, Nginx, PM2
- ✅ Configure load balancing with 2 primary + 1 backup server
- ✅ Set up SSL certificates with Let's Encrypt
- ✅ Apply system optimizations for high concurrency
- ✅ Configure monitoring and health checks
- ✅ Set up security (firewall, fail2ban)

## 🎯 What Gets Deployed

### **Architecture**
```
Internet → Nginx Load Balancer → PM2 Cluster
                ↓
    ┌─ gosei-server-cluster (2 instances) :3001
    └─ gosei-server-backup (1 instance)   :3002
```

### **Features Included**
- **Load Balancing**: Nginx with least-connections algorithm
- **High Availability**: 2+1 server instances with automatic failover  
- **SSL Security**: Let's Encrypt certificates with auto-renewal
- **Rate Limiting**: Protection against DDoS and abuse
- **Health Monitoring**: Automatic health checks every 5 minutes
- **System Optimization**: Kernel parameters tuned for 100+ concurrent connections
- **Security**: UFW firewall + fail2ban intrusion detection

## 📊 Monitoring & Management

### **Check System Status**
```bash
# PM2 process status
pm2 status

# System monitoring
pm2 monit

# Nginx status
sudo systemctl status nginx

# View logs
pm2 logs
tail -f /var/log/gosei-health.log
```

### **Useful Commands**
```bash
# Restart servers
pm2 restart all

# Scale instances
pm2 scale gosei-server-cluster 4

# SSL certificate renewal
sudo certbot renew

# Check connections
netstat -an | grep :443 | grep ESTABLISHED | wc -l
```

## 🔧 Customization

### **Scaling for More Users**

For **200+ concurrent users**, update the script:
```bash
# In deploy-gosei-production.sh
NODE_ENV=production PORT=3001 pm2 start server.js --name gosei-server-cluster --instances 4

# Update Nginx upstream
upstream gosei_backend {
    least_conn;
    server 127.0.0.1:3001 weight=5;
    server 127.0.0.1:3002 weight=5;
    server 127.0.0.1:3003 backup;
}
```

### **Memory Optimization**

For **1GB VPS**, use fewer instances:
```bash
# Use only 1 primary + 1 backup
pm2 start server.js --name gosei-server-main --instances 1
```

## 🛠️ Troubleshooting

### **Common Issues**

1. **Connection Failed**
   ```bash
   # Check if services are running
   pm2 status
   sudo systemctl status nginx
   
   # Check logs
   pm2 logs --err
   sudo tail -f /var/log/nginx/error.log
   ```

2. **SSL Issues**
   ```bash
   # Manual SSL setup
   sudo certbot --nginx -d gosei-svr-01.beaver.foundation
   
   # Check certificate status
   sudo certbot certificates
   ```

3. **High Memory Usage**
   ```bash
   # Restart PM2 processes
   pm2 reload all
   
   # Check memory usage
   free -h
   pm2 monit
   ```

### **Performance Tuning**

For optimal performance:
```bash
# Monitor real-time connections
watch -n 1 'netstat -an | grep :443 | grep ESTABLISHED | wc -l'

# Check server response time
curl -w "@curl-format.txt" -o /dev/null -s https://gosei-svr-01.beaver.foundation/health

# Load testing
ab -n 1000 -c 50 https://gosei-svr-01.beaver.foundation/
```

## 📁 Documentation Files

- **`docs/PRODUCTION_VPS_DEPLOYMENT.md`** - Complete manual deployment guide
- **`docs/PM2_ECOSYSTEM_CONFIG.md`** - PM2 configuration details
- **`docs/CLIENT_PRODUCTION_CONFIG.md`** - Client-side configuration
- **`docs/QUICK_DEPLOY_SCRIPT.md`** - Basic deployment script

## 🎮 Client Configuration

Update your client to connect to the production server:

```javascript
const socket = io("https://gosei-svr-01.beaver.foundation", {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 5,
  timeout: 10000
});
```

## 🚀 Ready to Deploy!

Your Gosei Go game server will be ready to handle:
- ✅ **100+ concurrent users**
- ✅ **Real-time WebSocket connections**
- ✅ **High availability with automatic failover**
- ✅ **SSL security and performance optimization**

Run the script and start your Go game server in production! 🎯

---

**Need help?** Check the troubleshooting section or review the detailed documentation in the `docs/` folder. 