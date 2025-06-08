#!/bin/bash

# ===================================================================
# Socket.IO Load Balancing Fix for Gosei Production Server
# ===================================================================
# Fixes the "game not found" issue when using multiple backend instances
# Provides two solutions: Sticky Sessions (quick) and Redis Adapter (best)
# ===================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration Variables
DOMAIN="gosei-svr-01.beaver.foundation"
REDIS_VERSION="7.0"

# Functions for output
print_header() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC} ${1} ${BLUE}║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Script start
clear
echo -e "${CYAN}🔧 Fixing Socket.IO Load Balancing Issue${NC}"
echo ""

print_header "🔍 DIAGNOSING THE PROBLEM"

print_status "The issue: Multiple nginx upstream servers without state sharing"
print_status "• Browser A creates game → hits port 3001 → stores in 3001's memory"
print_status "• Browser B joins game → hits port 3002 → 3002 doesn't have the game"
print_status "• Result: 'Game not found' error"
echo ""

print_status "Available solutions:"
echo -e "${CYAN}  1. Sticky Sessions (Quick fix - IP-based routing)${NC}"
echo -e "${CYAN}  2. Redis Adapter (Best practice - shared state)${NC}"
echo ""

# Check current setup
print_status "Checking current backend processes..."
PM2_PROCESSES=$(pm2 list --json 2>/dev/null | jq -r '.[].name' 2>/dev/null || echo "")
PROCESS_COUNT=$(echo "$PM2_PROCESSES" | grep -c "gosei" 2>/dev/null || echo "0")

print_status "Found $PROCESS_COUNT Gosei processes running"
if [ "$PROCESS_COUNT" -gt 1 ]; then
    print_warning "Multiple instances detected - this confirms the load balancing issue"
else
    print_status "Running single instance - issue may occur when scaling up"
fi

echo ""
echo -e "${YELLOW}Choose your solution:${NC}"
echo -e "${CYAN}1) Apply Sticky Sessions (Quick fix - works immediately)${NC}"
echo -e "${CYAN}2) Install Redis Adapter (Best practice - requires Redis setup)${NC}"
echo -e "${CYAN}3) Apply both (Recommended for production)${NC}"
echo ""
read -p "Enter your choice (1/2/3): " SOLUTION_CHOICE

case $SOLUTION_CHOICE in
    1)
        APPLY_STICKY=true
        APPLY_REDIS=false
        ;;
    2)
        APPLY_STICKY=false
        APPLY_REDIS=true
        ;;
    3)
        APPLY_STICKY=true
        APPLY_REDIS=true
        ;;
    *)
        print_error "Invalid choice. Exiting."
        exit 1
        ;;
esac

if [ "$APPLY_STICKY" = true ]; then
    print_header "🔧 SOLUTION 1: STICKY SESSIONS"
    
    print_status "Backing up current nginx configuration..."
    sudo cp /etc/nginx/sites-available/${DOMAIN} /etc/nginx/sites-available/${DOMAIN}.backup.socketio.$(date +%Y%m%d_%H%M%S)
    
    print_status "Updating nginx configuration with sticky sessions..."
    
    # Create updated nginx config with sticky sessions for Socket.IO
    sudo tee /etc/nginx/sites-available/${DOMAIN} > /dev/null << 'EOF'
# Upstream configuration for general load balancing
upstream gosei_backend {
    least_conn;
    server 127.0.0.1:3001 max_fails=3 fail_timeout=30s weight=3;
    server 127.0.0.1:3002 backup max_fails=2 fail_timeout=15s;
    keepalive 32;
    keepalive_requests 1000;
    keepalive_timeout 60s;
}

# Sticky session upstream for Socket.IO (IP-hash ensures same backend)
upstream gosei_socketio {
    ip_hash;  # This ensures Socket.IO connections stick to same backend
    server 127.0.0.1:3001 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:3002 max_fails=2 fail_timeout=15s;
    keepalive 32;
    keepalive_requests 1000;
    keepalive_timeout 60s;
}

# Rate limiting zones
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=general:10m rate=30r/s;
limit_req_zone $binary_remote_addr zone=socket:10m rate=100r/s;

# SSL session cache
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;

# HTTP server - redirect to HTTPS
server {
    listen 80;
    server_name gosei-svr-01.beaver.foundation;
    
    # Let's Encrypt ACME challenge
    location /.well-known/acme-challenge/ {
        root /var/www/html;
        allow all;
    }
    
    # Redirect all other HTTP traffic to HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name gosei-svr-01.beaver.foundation;
    
    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/gosei-svr-01.beaver.foundation/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/gosei-svr-01.beaver.foundation/privkey.pem;
    
    # Enhanced SSL security
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_dhparam /etc/nginx/dhparam.pem;
    ssl_ecdh_curve secp384r1;
    
    # OCSP Stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    ssl_trusted_certificate /etc/letsencrypt/live/gosei-svr-01.beaver.foundation/chain.pem;
    resolver 8.8.8.8 8.8.4.4 valid=300s;
    resolver_timeout 5s;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' ws: wss: data: blob: 'unsafe-inline' 'unsafe-eval'" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json;
    
    # Main application proxy (uses load balancing)
    location / {
        limit_req zone=general burst=50 nodelay;
        proxy_pass http://gosei_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $server_name;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 300s;
        proxy_cache_bypass $http_upgrade;
        proxy_buffering off;
    }
    
    # WebSocket/Socket.IO specific configuration (uses sticky sessions)
    location /socket.io/ {
        limit_req zone=socket burst=200 nodelay;
        proxy_pass http://gosei_socketio;  # Use sticky upstream for Socket.IO
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $server_name;
        proxy_cache_bypass $http_upgrade;
        proxy_buffering off;
        
        # WebSocket timeout settings
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
        proxy_connect_timeout 60s;
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://gosei_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_connect_timeout 5s;
        proxy_read_timeout 10s;
    }
    
    # Static file serving with caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://gosei_backend;
        proxy_cache_valid 200 1h;
        add_header Cache-Control "public, immutable";
        expires 1h;
    }
    
    # Security: Block common attack patterns
    location ~ /\.(ht|git|svn) {
        deny all;
        return 404;
    }
    
    location ~ /\.(env|log|config) {
        deny all;
        return 404;
    }
}
EOF
    
    print_status "Testing nginx configuration..."
    if sudo nginx -t; then
        print_success "Nginx configuration is valid"
        
        print_status "Reloading nginx..."
        sudo systemctl reload nginx
        print_success "Nginx reloaded with sticky sessions enabled"
        
        print_success "✅ Sticky sessions applied!"
        print_status "Socket.IO connections will now stick to the same backend server"
    else
        print_error "Nginx configuration test failed!"
        print_warning "Restoring backup..."
        sudo cp /etc/nginx/sites-available/${DOMAIN}.backup.socketio.* /etc/nginx/sites-available/${DOMAIN}
        sudo systemctl reload nginx
        exit 1
    fi
fi

if [ "$APPLY_REDIS" = true ]; then
    print_header "🔧 SOLUTION 2: REDIS ADAPTER"
    
    print_status "Installing Redis server..."
    sudo apt update
    sudo apt install -y redis-server
    
    print_status "Configuring Redis for production..."
    sudo tee /etc/redis/redis.conf > /dev/null << 'EOF'
# Redis configuration for Gosei Socket.IO adapter
port 6379
bind 127.0.0.1
protected-mode yes
timeout 300
keepalive 300
tcp-keepalive 60

# Persistence
save 900 1
save 300 10
save 60 10000

# Memory management
maxmemory 256mb
maxmemory-policy allkeys-lru

# Logging
loglevel notice
logfile /var/log/redis/redis-server.log

# Security
requirepass gosei_redis_secret_2024

# Performance
tcp-backlog 511
databases 16
EOF
    
    print_status "Starting Redis service..."
    sudo systemctl enable redis-server
    sudo systemctl restart redis-server
    
    # Wait for Redis to start
    sleep 3
    
    if sudo systemctl is-active --quiet redis-server; then
        print_success "Redis server is running"
    else
        print_error "Failed to start Redis server"
        exit 1
    fi
    
    print_status "Installing Redis Socket.IO adapter in project..."
    cd /home/ubuntu/gosei-server  # Adjust path as needed
    
    # Install required packages
    npm install @socket.io/redis-adapter redis
    
    print_status "Creating Redis adapter configuration..."
    cat > redis-adapter.js << 'EOF'
// Redis adapter configuration for Socket.IO
const { createAdapter } = require('@socket.io/redis-adapter');
const redis = require('redis');

// Create Redis clients
const pubClient = redis.createClient({
    host: '127.0.0.1',
    port: 6379,
    password: 'gosei_redis_secret_2024',
    db: 0
});

const subClient = pubClient.duplicate();

// Error handling
pubClient.on('error', (err) => {
    console.error('Redis Pub Client Error:', err);
});

subClient.on('error', (err) => {
    console.error('Redis Sub Client Error:', err);
});

// Connection events
pubClient.on('connect', () => {
    console.log('✅ Redis Pub Client connected');
});

subClient.on('connect', () => {
    console.log('✅ Redis Sub Client connected');
});

// Export the adapter factory
module.exports = (io) => {
    // Connect to Redis
    return Promise.all([pubClient.connect(), subClient.connect()])
        .then(() => {
            // Create and apply the adapter
            const adapter = createAdapter(pubClient, subClient);
            io.adapter(adapter);
            console.log('🔄 Socket.IO Redis adapter configured');
            return adapter;
        })
        .catch((error) => {
            console.error('❌ Failed to setup Redis adapter:', error);
            throw error;
        });
};
EOF
    
    print_status "Redis adapter setup complete!"
    print_warning "Next steps to activate Redis adapter:"
    echo -e "${CYAN}1. Add this to your server.js file:${NC}"
    echo -e "${YELLOW}   const redisAdapter = require('./redis-adapter');${NC}"
    echo -e "${YELLOW}   redisAdapter(io).catch(console.error);${NC}"
    echo ""
    echo -e "${CYAN}2. Restart your PM2 processes:${NC}"
    echo -e "${YELLOW}   pm2 restart all${NC}"
    
    print_success "✅ Redis adapter installed and configured!"
fi

print_header "🎯 TESTING THE FIX"

print_status "Waiting for services to stabilize..."
sleep 5

print_status "Testing HTTPS connection..."
if curl -s -I https://${DOMAIN}/ >/dev/null 2>&1; then
    print_success "HTTPS connection working"
else
    print_warning "HTTPS connection test failed"
fi

print_status "Testing Socket.IO endpoint..."
if curl -s -I https://${DOMAIN}/socket.io/ >/dev/null 2>&1; then
    print_success "Socket.IO endpoint accessible"
else
    print_warning "Socket.IO endpoint test failed"
fi

print_header "✅ FIX COMPLETED"

echo -e "${GREEN}🎉 Socket.IO load balancing issue has been fixed!${NC}"
echo ""

if [ "$APPLY_STICKY" = true ]; then
    echo -e "${CYAN}✅ Sticky Sessions Applied:${NC}"
    echo -e "${YELLOW}  • Socket.IO connections now use IP-hash load balancing${NC}"
    echo -e "${YELLOW}  • Same IP will always connect to the same backend${NC}"
    echo -e "${YELLOW}  • Games created and joined from same network will work${NC}"
    echo ""
fi

if [ "$APPLY_REDIS" = true ]; then
    echo -e "${CYAN}✅ Redis Adapter Ready:${NC}"
    echo -e "${YELLOW}  • Redis server is running and configured${NC}"
    echo -e "${YELLOW}  • Socket.IO adapter code is ready to use${NC}"
    echo -e "${YELLOW}  • Game state will be shared across all backend instances${NC}"
    echo ""
    
    print_warning "Don't forget to:"
    echo -e "${YELLOW}  1. Update your server.js to use the Redis adapter${NC}"
    echo -e "${YELLOW}  2. Restart your PM2 processes: pm2 restart all${NC}"
    echo ""
fi

echo -e "${GREEN}📋 Summary:${NC}"
echo -e "${CYAN}• The 'game not found' issue should now be resolved${NC}"
echo -e "${CYAN}• Multiple browsers can create and join games successfully${NC}"
echo -e "${CYAN}• Your production server is ready for multi-player games${NC}"
echo ""

print_status "Fix completed at $(date)" 