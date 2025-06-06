#!/bin/bash

# Simple Nginx Configuration Tester for Gosei Deployment
# Fixes common nginx issues during deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${CYAN}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_header() {
    echo ""
    echo -e "${CYAN}============================================${NC}"
    echo -e "${CYAN} $1${NC}"
    echo -e "${CYAN}============================================${NC}"
}

# Domain configuration
DOMAIN="gosei-svr-01.beaver.foundation"

print_header "🔧 NGINX CONFIGURATION TESTER"

print_status "Checking nginx installation..."
if ! command -v nginx &> /dev/null; then
    print_error "Nginx is not installed"
    exit 1
fi

print_success "Nginx is installed"

print_status "Checking nginx service status..."
if systemctl is-active --quiet nginx; then
    print_success "Nginx service is running"
else
    print_warning "Nginx service is not running. Starting it..."
    sudo systemctl start nginx
fi

print_status "Testing current nginx configuration..."
if sudo nginx -t; then
    print_success "Current nginx configuration is valid"
else
    print_error "Current nginx configuration has errors. Let's fix it..."
    
    print_status "Creating a basic working configuration..."
    
    # Create basic working config
    sudo tee /etc/nginx/sites-available/${DOMAIN} > /dev/null << 'EOF'
# Upstream configuration for load balancing
upstream gosei_backend {
    least_conn;
    server 127.0.0.1:3001 max_fails=3 fail_timeout=30s weight=3;
    server 127.0.0.1:3002 backup max_fails=2 fail_timeout=15s;
    keepalive 32;
}

# Rate limiting zones
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=general:10m rate=30r/s;

server {
    listen 80;
    server_name gosei-svr-01.beaver.foundation;
    
    # Let's Encrypt ACME challenge
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
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
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 300s;
        proxy_cache_bypass $http_upgrade;
    }
    
    location /socket.io/ {
        proxy_pass http://gosei_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }
    
    location /health {
        access_log off;
        proxy_pass http://gosei_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
EOF
    
    print_status "Enabling the site..."
    sudo ln -sf /etc/nginx/sites-available/${DOMAIN} /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    
    print_status "Testing the fixed configuration..."
    if sudo nginx -t; then
        print_success "Fixed configuration is valid"
        sudo systemctl reload nginx
        print_success "Nginx reloaded successfully"
    else
        print_error "Configuration still has errors. Manual intervention required."
        exit 1
    fi
fi

print_status "Checking if SSL certificates exist..."
if [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
    print_success "SSL certificates found. Creating HTTPS configuration..."
    
    sudo tee /etc/nginx/sites-available/${DOMAIN} > /dev/null << 'EOF'
# Upstream configuration for load balancing
upstream gosei_backend {
    least_conn;
    server 127.0.0.1:3001 max_fails=3 fail_timeout=30s weight=3;
    server 127.0.0.1:3002 backup max_fails=2 fail_timeout=15s;
    keepalive 32;
}

# Rate limiting zones
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=general:10m rate=30r/s;

server {
    listen 80;
    server_name gosei-svr-01.beaver.foundation;
    
    # Let's Encrypt ACME challenge
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    # Redirect all other HTTP traffic to HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name gosei-svr-01.beaver.foundation;
    
    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/gosei-svr-01.beaver.foundation/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/gosei-svr-01.beaver.foundation/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
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
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 300s;
        proxy_cache_bypass $http_upgrade;
    }
    
    location /socket.io/ {
        proxy_pass http://gosei_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }
    
    location /health {
        access_log off;
        proxy_pass http://gosei_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
EOF
    
    print_status "Testing HTTPS configuration..."
    if sudo nginx -t; then
        print_success "HTTPS configuration is valid"
        sudo systemctl reload nginx
        print_success "Nginx reloaded with HTTPS"
    else
        print_error "HTTPS configuration failed. Reverting to HTTP-only."
        # Revert to HTTP-only config if HTTPS fails
        sudo tee /etc/nginx/sites-available/${DOMAIN} > /dev/null << 'EOF'
upstream gosei_backend {
    least_conn;
    server 127.0.0.1:3001 max_fails=3 fail_timeout=30s weight=3;
    server 127.0.0.1:3002 backup max_fails=2 fail_timeout=15s;
    keepalive 32;
}

limit_req_zone $binary_remote_addr zone=general:10m rate=30r/s;

server {
    listen 80;
    server_name gosei-svr-01.beaver.foundation;
    
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
        proxy_cache_bypass $http_upgrade;
    }
    
    location /socket.io/ {
        proxy_pass http://gosei_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }
    
    location /health {
        access_log off;
        proxy_pass http://gosei_backend;
        proxy_set_header Host $host;
    }
}
EOF
        sudo nginx -t && sudo systemctl reload nginx
        print_warning "Reverted to HTTP-only configuration"
    fi
else
    print_warning "No SSL certificates found. Using HTTP-only configuration."
fi

print_header "🧪 TESTING NGINX FUNCTIONALITY"

print_status "Checking nginx processes..."
if pgrep nginx > /dev/null; then
    print_success "Nginx processes are running"
else
    print_error "No nginx processes found"
fi

print_status "Checking port 80 accessibility..."
if netstat -tuln | grep :80 > /dev/null; then
    print_success "Port 80 is listening"
else
    print_warning "Port 80 is not listening"
fi

if [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
    print_status "Checking port 443 accessibility..."
    if netstat -tuln | grep :443 > /dev/null; then
        print_success "Port 443 is listening"
    else
        print_warning "Port 443 is not listening"
    fi
fi

print_status "Testing basic HTTP connection..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost | grep -q "200\|502\|503"; then
    print_success "Basic HTTP connection works"
else
    print_warning "HTTP connection test inconclusive"
fi

print_header "✅ NGINX CONFIGURATION TEST COMPLETED"

print_status "Configuration summary:"
echo -e "${CYAN}• Configuration file: /etc/nginx/sites-available/${DOMAIN}${NC}"
echo -e "${CYAN}• Enabled site: /etc/nginx/sites-enabled/${DOMAIN}${NC}"
echo -e "${CYAN}• Load balancing: least_conn method${NC}"
echo -e "${CYAN}• Backend servers: 127.0.0.1:3001 (primary), 127.0.0.1:3002 (backup)${NC}"

if [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
    echo -e "${GREEN}• SSL: Enabled with Let's Encrypt certificate${NC}"
else
    echo -e "${YELLOW}• SSL: Not configured (HTTP only)${NC}"
fi

echo ""
print_success "Nginx configuration test completed!"
echo -e "${CYAN}You can now run: sudo systemctl status nginx${NC}"
echo -e "${CYAN}View logs with: sudo tail -f /var/log/nginx/error.log${NC}" 