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

# Install network tools if missing and user agrees
if ! command -v ss >/dev/null 2>&1 && ! command -v netstat >/dev/null 2>&1; then
    print_warning "Network diagnostic tools (ss/netstat) not found"
    read -p "Install net-tools package for better diagnostics? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Installing net-tools..."
        sudo apt update && sudo apt install -y net-tools iproute2
        print_success "Network tools installed"
    fi
fi

print_status "Checking nginx processes..."
if pgrep nginx > /dev/null; then
    print_success "Nginx processes are running"
    print_status "Nginx process details:"
    pgrep -a nginx | head -5
else
    print_error "No nginx processes found"
fi

print_status "Checking port 80 accessibility..."
if command -v ss >/dev/null 2>&1; then
    # Use ss (modern replacement for netstat)
    if ss -tuln | grep :80 > /dev/null; then
        print_success "Port 80 is listening"
    else
        print_warning "Port 80 is not listening"
    fi
elif command -v netstat >/dev/null 2>&1; then
    # Use netstat if available
    if netstat -tuln | grep :80 > /dev/null; then
        print_success "Port 80 is listening"
    else
        print_warning "Port 80 is not listening"
    fi
else
    # Alternative check using lsof or direct curl test
    if command -v lsof >/dev/null 2>&1 && lsof -i :80 > /dev/null 2>&1; then
        print_success "Port 80 is listening (via lsof)"
    elif curl -s -o /dev/null --connect-timeout 1 http://localhost >/dev/null 2>&1; then
        print_success "Port 80 is accessible (via curl test)"
    else
        print_warning "Cannot verify port 80 status (missing netstat/ss/lsof)"
    fi
fi

if [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
    print_status "Checking port 443 accessibility..."
    if command -v ss >/dev/null 2>&1; then
        if ss -tuln | grep :443 > /dev/null; then
            print_success "Port 443 is listening"
        else
            print_warning "Port 443 is not listening"
        fi
    elif command -v netstat >/dev/null 2>&1; then
        if netstat -tuln | grep :443 > /dev/null; then
            print_success "Port 443 is listening"
        else
            print_warning "Port 443 is not listening"
        fi
    else
        if command -v lsof >/dev/null 2>&1 && lsof -i :443 > /dev/null 2>&1; then
            print_success "Port 443 is listening (via lsof)"
        elif curl -s -o /dev/null --connect-timeout 1 https://localhost >/dev/null 2>&1; then
            print_success "Port 443 is accessible (via curl test)"
        else
            print_warning "Cannot verify port 443 status (missing netstat/ss/lsof)"
        fi
    fi
fi

print_status "Testing basic HTTP connection..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 http://localhost 2>/dev/null || echo "000")

if [[ "$HTTP_CODE" == "200" ]]; then
    print_success "Basic HTTP connection works (HTTP $HTTP_CODE)"
elif [[ "$HTTP_CODE" == "502" ]] || [[ "$HTTP_CODE" == "503" ]]; then
    print_warning "Nginx is running but backend servers may be down (HTTP $HTTP_CODE)"
    print_status "This is normal if PM2 processes haven't been started yet"
elif [[ "$HTTP_CODE" == "000" ]]; then
    print_warning "HTTP connection failed - check if nginx is properly configured"
else
    print_warning "HTTP connection returned code: $HTTP_CODE"
fi

# Test specific endpoints if available
print_status "Testing health endpoint..."
HEALTH_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 http://localhost/health 2>/dev/null || echo "000")
if [[ "$HEALTH_CODE" == "200" ]]; then
    print_success "Health endpoint responding (HTTP $HEALTH_CODE)"
elif [[ "$HEALTH_CODE" == "502" ]] || [[ "$HEALTH_CODE" == "503" ]]; then
    print_warning "Health endpoint proxying to backend (HTTP $HEALTH_CODE - backend may be down)"
else
    print_status "Health endpoint status: HTTP $HEALTH_CODE"
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
print_header "🎯 NEXT STEPS"

if [[ "$HTTP_CODE" == "502" ]] || [[ "$HTTP_CODE" == "503" ]]; then
    echo -e "${YELLOW}Nginx is configured correctly but backend servers aren't running.${NC}"
    echo -e "${CYAN}Next steps:${NC}"
    echo -e "${CYAN}1. Start your Gosei server with PM2${NC}"
    echo -e "${CYAN}2. Run: pm2 start server.js --name gosei-server${NC}"
    echo -e "${CYAN}3. Test again: curl http://localhost${NC}"
elif [[ "$HTTP_CODE" == "200" ]]; then
    print_success "Everything looks good! Nginx and backend are working."
    echo -e "${CYAN}Your server is ready for production use.${NC}"
else
    echo -e "${YELLOW}Some issues detected. Check the warnings above.${NC}"
fi

echo ""
print_success "Nginx configuration test completed!"
echo ""
echo -e "${CYAN}Useful commands:${NC}"
echo -e "${CYAN}• Check nginx status: ${NC}sudo systemctl status nginx"
echo -e "${CYAN}• View error logs: ${NC}sudo tail -f /var/log/nginx/error.log"
echo -e "${CYAN}• View access logs: ${NC}sudo tail -f /var/log/nginx/access.log"
echo -e "${CYAN}• Test configuration: ${NC}sudo nginx -t"
echo -e "${CYAN}• Reload nginx: ${NC}sudo systemctl reload nginx"

if [ -f "/var/log/pm2/gosei-error.log" ]; then
    echo -e "${CYAN}• View PM2 logs: ${NC}pm2 logs"
    echo -e "${CYAN}• Check PM2 status: ${NC}pm2 status"
fi 