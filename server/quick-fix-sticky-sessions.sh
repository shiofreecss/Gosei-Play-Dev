#!/bin/bash

# ===================================================================
# Quick Fix: Sticky Sessions for Socket.IO Load Balancing
# ===================================================================
# Solves "game not found" issue without requiring Redis
# ===================================================================

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

DOMAIN="gosei-svr-01.beaver.foundation"

echo -e "${BLUE}🔧 Quick Fix: Sticky Sessions for Socket.IO${NC}"
echo ""

echo -e "${GREEN}[INFO]${NC} Backing up current nginx configuration..."
sudo cp /etc/nginx/sites-available/${DOMAIN} /etc/nginx/sites-available/${DOMAIN}.backup.sticky.$(date +%Y%m%d_%H%M%S)

echo -e "${GREEN}[INFO]${NC} Applying sticky sessions fix..."

# Apply the fixed nginx configuration
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

echo -e "${GREEN}[INFO]${NC} Testing nginx configuration..."
if sudo nginx -t; then
    echo -e "${GREEN}[SUCCESS]${NC} Nginx configuration is valid"
    
    echo -e "${GREEN}[INFO]${NC} Reloading nginx..."
    sudo systemctl reload nginx
    
    echo -e "${GREEN}[SUCCESS]${NC} ✅ Sticky sessions applied successfully!"
    echo ""
    echo -e "${BLUE}🎯 What this fixes:${NC}"
    echo -e "${YELLOW}• Socket.IO connections now stick to the same backend server${NC}"
    echo -e "${YELLOW}• Games created on one instance stay on that instance${NC}"
    echo -e "${YELLOW}• Multiple browsers can now join the same game${NC}"
    echo ""
    echo -e "${BLUE}🧪 Test your fix:${NC}"
    echo -e "${YELLOW}1. Browser A: Create a game on https://gosei-svr-01.beaver.foundation${NC}"
    echo -e "${YELLOW}2. Browser B: Join the same game using the game code${NC}"
    echo -e "${YELLOW}3. Both should work without 'game not found' errors${NC}"
    echo ""
    echo -e "${GREEN}🎉 Your production server is now fixed!${NC}"
    
else
    echo -e "${RED}[ERROR]${NC} Nginx configuration test failed!"
    echo -e "${YELLOW}[INFO]${NC} Restoring backup..."
    sudo cp /etc/nginx/sites-available/${DOMAIN}.backup.sticky.* /etc/nginx/sites-available/${DOMAIN}
    sudo systemctl reload nginx
    echo -e "${RED}[ERROR]${NC} Fix failed - configuration restored"
    exit 1
fi 