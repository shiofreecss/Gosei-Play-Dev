#!/bin/bash

# ===================================================================
# Nginx SSL Configuration Update Script for Gosei Server
# ===================================================================
# Updates existing Nginx configuration to use SSL certificates
# Domain: gosei-svr-01.beaver.foundation
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
echo -e "${CYAN}🔐 Updating Nginx Configuration with SSL for ${DOMAIN}${NC}"
echo ""

print_header "🔍 CHECKING SSL CERTIFICATE"

# Check if SSL certificate exists
if [ ! -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
    print_error "SSL certificate not found at /etc/letsencrypt/live/${DOMAIN}/fullchain.pem"
    print_warning "Please obtain SSL certificate first using: sudo certbot certonly --webroot -w /var/www/html -d ${DOMAIN}"
    exit 1
fi

print_success "SSL certificate found"

# Check certificate validity
CERT_EXPIRY=$(openssl x509 -in /etc/letsencrypt/live/${DOMAIN}/cert.pem -noout -enddate | cut -d= -f2)
print_status "Certificate expires: ${CERT_EXPIRY}"

print_header "🔧 UPDATING NGINX CONFIGURATION"

# Generate stronger DH parameters if they don't exist
if [ ! -f /etc/nginx/dhparam.pem ]; then
    print_status "Generating strong DH parameters (this may take a few minutes)..."
    sudo openssl dhparam -out /etc/nginx/dhparam.pem 2048
    print_success "DH parameters generated"
else
    print_status "DH parameters already exist"
fi

# Backup current configuration
print_status "Backing up current Nginx configuration..."
sudo cp /etc/nginx/sites-available/${DOMAIN} /etc/nginx/sites-available/${DOMAIN}.backup.$(date +%Y%m%d_%H%M%S)
print_success "Configuration backed up"

# Create SSL-enabled Nginx configuration
print_status "Creating SSL-enabled Nginx configuration..."

sudo tee /etc/nginx/sites-available/${DOMAIN} > /dev/null << EOF
# Upstream configuration for load balancing
upstream gosei_backend {
    least_conn;
    server 127.0.0.1:3001 max_fails=3 fail_timeout=30s weight=3;
    server 127.0.0.1:3002 backup max_fails=2 fail_timeout=15s;
    keepalive 32;
    keepalive_requests 1000;
    keepalive_timeout 60s;
}

# Sticky session upstream for Socket.IO
upstream gosei_socketio {
    ip_hash;  # Use IP-based sticky sessions
    server 127.0.0.1:3001 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:3002 max_fails=2 fail_timeout=15s;
    keepalive 32;
    keepalive_requests 1000;
    keepalive_timeout 60s;
}

# Rate limiting zones
limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone \$binary_remote_addr zone=general:10m rate=30r/s;
limit_req_zone \$binary_remote_addr zone=socket:10m rate=100r/s;

# SSL session cache
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;

# HTTP server - redirect to HTTPS
server {
    listen 80;
    server_name ${DOMAIN};
    
    # Let's Encrypt ACME challenge
    location /.well-known/acme-challenge/ {
        root /var/www/html;
        allow all;
    }
    
    # Redirect all other HTTP traffic to HTTPS
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name ${DOMAIN};
    
    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
    
    # Enhanced SSL security
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_dhparam /etc/nginx/dhparam.pem;
    ssl_ecdh_curve secp384r1;
    
    # OCSP Stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    ssl_trusted_certificate /etc/letsencrypt/live/${DOMAIN}/chain.pem;
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
    
    # Main application proxy
    location / {
        limit_req zone=general burst=50 nodelay;
        proxy_pass http://gosei_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$server_name;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 300s;
        proxy_cache_bypass \$http_upgrade;
        proxy_buffering off;
    }
    
    # WebSocket/Socket.IO specific configuration
    location /socket.io/ {
        limit_req zone=socket burst=200 nodelay;
        proxy_pass http://gosei_socketio;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$server_name;
        proxy_cache_bypass \$http_upgrade;
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
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_connect_timeout 5s;
        proxy_read_timeout 10s;
    }
    
    # Static file serving with caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)\$ {
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

print_success "SSL configuration created"

print_header "🧪 TESTING CONFIGURATION"

# Test Nginx configuration
print_status "Testing Nginx configuration syntax..."
if sudo nginx -t; then
    print_success "Nginx configuration syntax is valid"
else
    print_error "Nginx configuration test failed!"
    print_warning "Restoring backup configuration..."
    sudo cp /etc/nginx/sites-available/${DOMAIN}.backup.* /etc/nginx/sites-available/${DOMAIN}
    sudo systemctl reload nginx
    exit 1
fi

# Reload Nginx
print_status "Reloading Nginx with SSL configuration..."
sudo systemctl reload nginx
print_success "Nginx reloaded successfully"

print_header "✅ VERIFICATION"

# Wait a moment for nginx to fully reload
sleep 3

# Test HTTP redirect
print_status "Testing HTTP to HTTPS redirect..."
HTTP_RESPONSE=$(curl -s -I -w "%{http_code}" -o /dev/null http://${DOMAIN}/ || echo "000")
if [ "$HTTP_RESPONSE" = "301" ]; then
    print_success "HTTP to HTTPS redirect working (301)"
else
    print_warning "HTTP redirect may not be working properly (got $HTTP_RESPONSE)"
fi

# Test HTTPS connection
print_status "Testing HTTPS connection..."
if curl -s -I https://${DOMAIN}/ >/dev/null 2>&1; then
    print_success "HTTPS connection test passed"
    
    # Get SSL grade
    print_status "SSL certificate details:"
    openssl s_client -connect ${DOMAIN}:443 -servername ${DOMAIN} </dev/null 2>/dev/null | openssl x509 -noout -subject -dates
    
else
    print_warning "HTTPS connection test failed"
    print_warning "This might be due to DNS propagation or firewall settings"
fi

# Test health endpoint over HTTPS
print_status "Testing health endpoint over HTTPS..."
if curl -s -f https://${DOMAIN}/health >/dev/null 2>&1; then
    print_success "Health endpoint accessible over HTTPS"
else
    print_warning "Health endpoint test failed - check if application is running"
fi

print_header "🔐 SSL CONFIGURATION COMPLETED"

echo -e "${GREEN}✅ SSL has been successfully configured for ${DOMAIN}${NC}"
echo -e "${CYAN}🌐 Your site is now accessible at: https://${DOMAIN}${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "${CYAN}• Test your site: https://${DOMAIN}${NC}"
echo -e "${CYAN}• Check SSL rating: https://www.ssllabs.com/ssltest/analyze.html?d=${DOMAIN}${NC}"
echo -e "${CYAN}• Monitor logs: sudo tail -f /var/log/nginx/access.log${NC}"
echo -e "${CYAN}• Check certificate auto-renewal: sudo certbot renew --dry-run${NC}"
echo ""
echo -e "${GREEN}🎉 SSL setup complete! Your Gosei server is now secure.${NC}"

# Show PM2 status
print_status "Current PM2 processes:"
pm2 status 2>/dev/null || echo "PM2 not running or accessible"

print_status "SSL update completed at $(date)" 