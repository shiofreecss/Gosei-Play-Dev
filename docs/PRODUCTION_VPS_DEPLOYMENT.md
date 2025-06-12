# Gosei Server Production VPS Deployment Guide

Complete deployment guide for Gosei Go game server on a 2GB RAM VPS with load balancing for 100 concurrent users.

## 🌐 **Live Production: [https://play.gosei.xyz](https://play.gosei.xyz)** ✅

This deployment guide was successfully used to deploy the live production instance.

**Domain**: gosei-svr-01.beaver.foundation  
**Target**: 100 concurrent users  
**Server**: 2GB RAM VPS  

## Prerequisites

- Ubuntu 20.04 LTS or newer
- Domain DNS pointing to your VPS IP
- Root or sudo access
- Basic command line knowledge

## Initial Server Setup

### 1. System Update and Security

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y curl wget git unzip software-properties-common

# Configure UFW firewall
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable

# Create non-root user (optional but recommended)
sudo adduser gosei
sudo usermod -aG sudo gosei
```

### 2. Install Node.js 18 (LTS)

```bash
# Install Node.js via NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should show v18.x.x
npm --version   # Should show 9.x.x or higher
```

### 3. Install and Configure Nginx

```bash
# Install Nginx
sudo apt install -y nginx

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Verify Nginx is running
sudo systemctl status nginx
```

### 4. Install PM2 for Process Management

```bash
# Install PM2 globally
sudo npm install -g pm2

# Verify installation
pm2 --version
```

## Deploy Gosei Server

### 1. Clone and Setup Application

```bash
# Create application directory
sudo mkdir -p /var/www/gosei
sudo chown -R $USER:$USER /var/www/gosei
cd /var/www/gosei

# Clone your repository (replace with your actual repo)
git clone https://github.com/yourusername/gosei-play.git .

# Navigate to server directory
cd heroku-server

# Install dependencies
npm install

# Install additional production dependencies
npm install compression helmet express-rate-limit
```

### 2. Create Production Server Configuration

Create `ecosystem.config.js` for PM2 cluster mode:

```javascript
module.exports = {
  apps: [{
    name: 'gosei-server',
    script: './server.js',
    instances: 2, // Use 2 instances for 2GB RAM
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development',
      PORT: 3001
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    // Memory and CPU limits
    max_memory_restart: '400M',
    node_args: '--max-old-space-size=384',
    
    // Logging
    log_file: '/var/log/pm2/gosei-combined.log',
    out_file: '/var/log/pm2/gosei-out.log',
    error_file: '/var/log/pm2/gosei-error.log',
    
    // Auto restart on file change in production
    watch: false,
    ignore_watch: ['node_modules', 'logs'],
    
    // Restart options
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s'
  }, {
    name: 'gosei-server-backup',
    script: './server.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'development',
      PORT: 3002
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3002
    },
    max_memory_restart: '300M',
    node_args: '--max-old-space-size=256'
  }]
};
```

### 3. Optimize Server for Production

Update your `server.js` to include production optimizations:

```javascript
// Add at the top of server.js after other requires
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Add middleware before your existing routes
app.use(compression()); // Gzip compression
app.use(helmet()); // Security headers

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api', limiter);

// Trust proxy headers (important for rate limiting behind nginx)
app.set('trust proxy', 1);
```

### 4. Create PM2 Log Directory

```bash
# Create log directory
sudo mkdir -p /var/log/pm2
sudo chown -R $USER:$USER /var/log/pm2
```

## Configure Nginx with Load Balancing

### 1. Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/gosei-svr-01.beaver.foundation
```

Add the following configuration:

```nginx
# Upstream configuration for load balancing
upstream gosei_backend {
    # Least connections load balancing
    least_conn;
    
    # Primary servers
    server 127.0.0.1:3001 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:3001 max_fails=3 fail_timeout=30s;
    
    # Backup server
    server 127.0.0.1:3002 backup;
    
    # Enable session persistence for Socket.IO
    ip_hash;
}

# Rate limiting zones
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=general:10m rate=30r/s;

server {
    listen 80;
    server_name gosei-svr-01.beaver.foundation;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name gosei-svr-01.beaver.foundation;
    
    # SSL Configuration (will be configured by Certbot)
    # ssl_certificate /path/to/cert;
    # ssl_certificate_key /path/to/key;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json;
    
    # Main location block
    location / {
        # Apply rate limiting
        limit_req zone=general burst=50 nodelay;
        
        # Proxy settings
        proxy_pass http://gosei_backend;
        proxy_http_version 1.1;
        
        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Standard proxy headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 300s;
        
        # Buffer settings
        proxy_buffering on;
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
        
        # Disable proxy cache for real-time features
        proxy_cache_bypass $http_upgrade;
    }
    
    # API endpoints with stricter rate limiting
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        
        proxy_pass http://gosei_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Socket.IO path
    location /socket.io/ {
        proxy_pass http://gosei_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Longer timeout for Socket.IO
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        proxy_pass http://gosei_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
    
    # Static files (if any)
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri @proxy;
    }
    
    location @proxy {
        proxy_pass http://gosei_backend;
    }
}
```

### 2. Enable Site and Test Configuration

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/gosei-svr-01.beaver.foundation /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# If test passes, reload Nginx
sudo systemctl reload nginx
```

## SSL Certificate Setup

### 1. Install Certbot

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d gosei-svr-01.beaver.foundation

# Follow the prompts and choose redirect option (2)
```

### 2. Auto-renewal Setup

```bash
# Test auto-renewal
sudo certbot renew --dry-run

# If successful, the cron job is automatically set up
# Verify cron job exists
sudo systemctl status certbot.timer
```

## Deploy and Start Services

### 1. Start Gosei Server with PM2

```bash
# Navigate to server directory
cd /var/www/gosei/heroku-server

# Start in production mode
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup
# Follow the instructions provided by PM2

# Verify services are running
pm2 status
```

### 2. Create Health Check Script

```bash
nano /var/www/gosei/health-check.sh
```

```bash
#!/bin/bash
# Health check script for Gosei server

HEALTH_URL="https://gosei-svr-01.beaver.foundation/health"
LOG_FILE="/var/log/gosei-health.log"

response=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)

if [ $response -eq 200 ]; then
    echo "$(date): Server is healthy" >> $LOG_FILE
else
    echo "$(date): Server health check failed (HTTP $response)" >> $LOG_FILE
    # Restart services if unhealthy
    pm2 restart gosei-server
fi
```

```bash
# Make executable
chmod +x /var/www/gosei/health-check.sh

# Add to crontab for monitoring every 5 minutes
crontab -e
# Add line:
# */5 * * * * /var/www/gosei/health-check.sh
```

## System Optimization for 100 Concurrent Users

### 1. OS-Level Optimizations

```bash
# Edit system limits
sudo nano /etc/security/limits.conf
```

Add these lines:

```
# Gosei server limits
gosei soft nofile 65536
gosei hard nofile 65536
gosei soft nproc 32768
gosei hard nproc 32768
```

### 2. Nginx Optimizations

```bash
sudo nano /etc/nginx/nginx.conf
```

Update the configuration:

```nginx
user www-data;
worker_processes auto;
worker_rlimit_nofile 65535;

events {
    worker_connections 2048;
    use epoll;
    multi_accept on;
}

http {
    # Basic settings
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 30;
    keepalive_requests 100;
    types_hash_max_size 2048;
    server_tokens off;
    
    # Buffer sizes
    client_body_buffer_size 128k;
    client_max_body_size 10m;
    client_header_buffer_size 1k;
    large_client_header_buffers 4 4k;
    output_buffers 1 32k;
    postpone_output 1460;
    
    # File descriptors
    open_file_cache max=200000 inactive=20s;
    open_file_cache_valid 30s;
    open_file_cache_min_uses 2;
    open_file_cache_errors on;
    
    # Include other configs
    include /etc/nginx/mime.types;
    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
```

### 3. System Kernel Parameters

```bash
sudo nano /etc/sysctl.conf
```

Add these optimizations:

```
# Network optimizations for high concurrent connections
net.core.somaxconn = 65535
net.core.netdev_max_backlog = 5000
net.core.rmem_default = 262144
net.core.rmem_max = 16777216
net.core.wmem_default = 262144
net.core.wmem_max = 16777216
net.ipv4.tcp_rmem = 4096 65536 16777216
net.ipv4.tcp_wmem = 4096 65536 16777216
net.ipv4.tcp_max_syn_backlog = 30000
net.ipv4.tcp_max_tw_buckets = 400000
net.ipv4.tcp_fin_timeout = 30
net.ipv4.tcp_keepalive_time = 120
net.ipv4.tcp_keepalive_probes = 3
net.ipv4.tcp_keepalive_intvl = 15
net.ipv4.tcp_max_orphans = 3276800
net.ipv4.tcp_tw_recycle = 1
net.ipv4.ip_local_port_range = 1024 65000
```

Apply changes:

```bash
sudo sysctl -p
```

## Monitoring and Maintenance

### 1. Install Monitoring Tools

```bash
# Install htop for system monitoring
sudo apt install -y htop iotop

# Install log monitoring
sudo apt install -y multitail
```

### 2. Create Monitoring Scripts

Create system monitoring script:

```bash
nano /var/www/gosei/monitor.sh
```

```bash
#!/bin/bash
# System monitoring for Gosei server

LOG_FILE="/var/log/gosei-monitor.log"
THRESHOLD_CPU=80
THRESHOLD_MEMORY=80

# Get current stats
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
MEMORY_USAGE=$(free | grep Mem | awk '{printf("%.1f"), $3/$2 * 100.0}')
NGINX_PROCESSES=$(pgrep nginx | wc -l)
PM2_PROCESSES=$(pm2 list | grep -c "online")

echo "$(date): CPU: ${CPU_USAGE}%, Memory: ${MEMORY_USAGE}%, Nginx: ${NGINX_PROCESSES}, PM2: ${PM2_PROCESSES}" >> $LOG_FILE

# Alerts
if (( $(echo "$CPU_USAGE > $THRESHOLD_CPU" | bc -l) )); then
    echo "$(date): HIGH CPU USAGE: ${CPU_USAGE}%" >> $LOG_FILE
fi

if (( $(echo "$MEMORY_USAGE > $THRESHOLD_MEMORY" | bc -l) )); then
    echo "$(date): HIGH MEMORY USAGE: ${MEMORY_USAGE}%" >> $LOG_FILE
fi
```

### 3. Log Management

Set up log rotation:

```bash
sudo nano /etc/logrotate.d/gosei
```

```
/var/log/pm2/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    copytruncate
}

/var/log/gosei-*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    copytruncate
}
```

## Testing the Deployment

### 1. Verify All Services

```bash
# Check PM2 processes
pm2 status

# Check Nginx status
sudo systemctl status nginx

# Check SSL certificate
sudo certbot certificates

# Test health endpoint
curl -I https://gosei-svr-01.beaver.foundation/health
```

### 2. Load Testing

Install Apache Bench for basic load testing:

```bash
sudo apt install -y apache2-utils

# Test with 50 concurrent connections
ab -n 1000 -c 50 https://gosei-svr-01.beaver.foundation/

# Test WebSocket connections (requires wstest or similar)
```

### 3. Update Client Configuration

Update your client-side Socket.IO connection:

```javascript
const socket = io("https://gosei-svr-01.beaver.foundation", {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  timeout: 10000,
  forceNew: false
});
```

## Production Checklist

- [ ] Domain DNS configured
- [ ] SSL certificate installed and auto-renewal working
- [ ] PM2 processes running in cluster mode
- [ ] Nginx load balancing configured
- [ ] Firewall rules applied
- [ ] System optimizations applied
- [ ] Monitoring and health checks active
- [ ] Backup scripts scheduled
- [ ] Log rotation configured
- [ ] Load testing completed

Your Gosei server should now be ready to handle 100+ concurrent users with proper load balancing, SSL security, and monitoring in place!
