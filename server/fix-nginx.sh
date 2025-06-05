#!/bin/bash

# Fix Nginx Configuration - Remove SSL until certificates are ready
# This fixes the "no ssl_certificate defined" error

echo "🔧 Fixing Nginx Configuration"
echo "=============================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   print_error "This script must be run as root"
   echo "💡 Run: sudo ./fix-nginx.sh"
   exit 1
fi

DOMAIN="gosei-svr-01.beaver.foundation"
NODE_PORT="3001"

print_status "Creating HTTP-only Nginx configuration..."
print_status "Domain: $DOMAIN"
print_status "Backend: localhost:$NODE_PORT"

# Backup existing configuration if it exists
if [ -f "/etc/nginx/sites-enabled/gosei-play" ]; then
    print_status "Backing up existing configuration..."
    mkdir -p /etc/nginx/backups
    cp /etc/nginx/sites-enabled/gosei-play /etc/nginx/backups/gosei-play.backup.$(date +%Y%m%d_%H%M%S)
fi

# Remove existing configuration (including any backup files in sites-enabled)
rm -f /etc/nginx/sites-enabled/gosei-play*
rm -f /etc/nginx/sites-available/gosei-play

# Create HTTP-only configuration (SSL will be added later)
cat > /etc/nginx/sites-available/gosei-play << EOF
# Gosei Play Server Configuration (HTTP Only - Pre-SSL)
# Domain: $DOMAIN
# Load Balanced Node.js Backend

# Rate limiting
limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone \$binary_remote_addr zone=websocket:10m rate=30r/s;

# Upstream for load balancing
upstream gosei_backend {
    server 127.0.0.1:$NODE_PORT;
    keepalive 64;
}

# HTTP server (temporary - SSL will be added later)
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN;
    
    # Basic security headers
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";
    
    # Gzip Compression
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
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;
    
    # Proxy settings for Node.js backend
    location / {
        # Rate limiting
        limit_req zone=api burst=20 nodelay;
        
        proxy_pass http://gosei_backend;
        proxy_http_version 1.1;
        
        # WebSocket support
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Standard proxy headers
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$host;
        proxy_set_header X-Forwarded-Port \$server_port;
        
        # Proxy timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Disable proxy buffering for real-time applications
        proxy_buffering off;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # Socket.IO specific location (for better WebSocket handling)
    location /socket.io/ {
        limit_req zone=websocket burst=50 nodelay;
        
        proxy_pass http://gosei_backend;
        proxy_http_version 1.1;
        
        # WebSocket headers
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # Disable timeouts for WebSocket connections
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
        proxy_connect_timeout 60s;
        
        # Disable buffering
        proxy_buffering off;
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        proxy_pass http://gosei_backend;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Static files caching (if you add static assets later)
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)\$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
        proxy_pass http://gosei_backend;
    }
    
    # Security: Block access to hidden files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    # Security: Block access to backup files
    location ~* \.(bak|backup|old|orig|original|tmp)\$ {
        deny all;
        access_log off;
        log_not_found off;
    }
}
EOF

# Enable the site
ln -sf /etc/nginx/sites-available/gosei-play /etc/nginx/sites-enabled/

# Remove default nginx site if it exists
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
print_status "Testing Nginx configuration..."
if nginx -t; then
    print_success "✅ Nginx configuration is valid"
    
    # Start/restart Nginx
    print_status "Starting Nginx..."
    systemctl restart nginx
    
    if systemctl is-active --quiet nginx; then
        print_success "✅ Nginx is running successfully"
        
        echo ""
        print_success "🎉 Nginx Fixed and Running!"
        echo ""
        echo "🌐 Your server is now accessible at:"
        echo "  • http://$DOMAIN (if DNS is configured)"
        echo "  • http://localhost (locally)"
        echo "  • http://172.105.114.6 (direct IP access)"
        echo ""
        echo "📋 Next Steps:"
        echo "1. Configure DNS: $DOMAIN → 172.105.114.6"
        echo "2. Verify DNS: ./check-dns.sh"
        echo "3. Add SSL: ./setup-ssl.sh (after DNS works)"
        echo ""
        echo "💡 Test the server:"
        echo "  curl -I http://$DOMAIN"
        echo "  curl -I http://172.105.114.6"
        
    else
        print_error "❌ Nginx failed to start"
        systemctl status nginx --no-pager
    fi
    
else
    print_error "❌ Nginx configuration has errors"
    nginx -t
    exit 1
fi

# Show current nginx status
echo ""
print_status "📊 Current Nginx Status:"
systemctl status nginx --no-pager -l

echo ""
print_status "🔍 Listening Ports:"
ss -tlnp | grep :80 || echo "  No processes listening on port 80" 