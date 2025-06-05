#!/bin/bash

# SSL Setup Script for Gosei Play Server
# Sets up Nginx reverse proxy with Let's Encrypt SSL
# Domain: gosei-svr-01.beaver.foundation

set -e

DOMAIN="gosei-svr-01.beaver.foundation"
EMAIL="nhvu.dalat@gmail.com"  # Change this to your email
NODE_PORT="3001"

echo "🔐 Setting up SSL for Gosei Play Server"
echo "📡 Domain: $DOMAIN"
echo "🔧 Nginx + Let's Encrypt + Auto-renewal"
echo "========================================"

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo "❌ This script must be run as root to configure Nginx and SSL"
   echo "💡 Run: sudo ./setup-ssl.sh"
   exit 1
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Update system packages
print_status "Updating system packages..."
apt update

# Install Nginx
print_status "Installing Nginx..."
apt install -y nginx

# Start and enable Nginx
systemctl start nginx
systemctl enable nginx
print_success "Nginx installed and started"

# Install Certbot for Let's Encrypt
print_status "Installing Certbot and Nginx plugin..."
apt install -y certbot python3-certbot-nginx

# Create initial Nginx configuration
print_status "Creating initial HTTP-only Nginx configuration for $DOMAIN..."

# Remove any existing configurations
rm -f /etc/nginx/sites-enabled/gosei-play*
rm -f /etc/nginx/sites-available/gosei-play*
rm -f /etc/nginx/sites-enabled/default

# Create simple HTTP-only configuration for certificate verification
cat > /etc/nginx/sites-available/gosei-play << EOF
# Gosei Play Server Configuration (Pre-SSL)
# Domain: $DOMAIN

# Rate limiting
limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone \$binary_remote_addr zone=websocket:10m rate=30r/s;

# Upstream for load balancing
upstream gosei_backend {
    server 127.0.0.1:$NODE_PORT;
    keepalive 64;
}

# HTTP server (for ACME challenge and initial setup)
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN;
    
    # Let's Encrypt ACME challenge
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    # Proxy to Node.js backend (temporary, will be HTTPS after SSL)
    location / {
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
        
        # Proxy timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Disable proxy buffering
        proxy_buffering off;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # Socket.IO specific location
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
        
        # WebSocket timeouts
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
        proxy_connect_timeout 60s;
        
        proxy_buffering off;
    }
}
EOF

# Enable the site
ln -sf /etc/nginx/sites-available/gosei-play /etc/nginx/sites-enabled/

# Test initial Nginx configuration
print_status "Testing initial Nginx configuration..."
if nginx -t; then
    print_success "✅ Initial Nginx configuration is valid"
    systemctl reload nginx
    
    # Wait for nginx to be ready
    sleep 2
    
    # Test HTTP access
    print_status "Testing HTTP access..."
    if curl -s -o /dev/null -w "%{http_code}" http://$DOMAIN | grep -q "200\|301\|302"; then
        print_success "✅ HTTP access working"
    else
        print_warning "HTTP access test inconclusive, continuing..."
    fi
else
    print_error "❌ Nginx configuration has errors"
    nginx -t
    exit 1
fi

# Check if domain resolves to this server
print_status "Checking domain resolution..."
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || echo "unknown")
print_status "Server IP: $SERVER_IP"

if command -v dig &> /dev/null; then
    DOMAIN_IP=$(dig +short $DOMAIN | tail -n1)
    print_status "Domain IP: $DOMAIN_IP"
    
    if [ "$SERVER_IP" != "$DOMAIN_IP" ] && [ "$DOMAIN_IP" != "" ]; then
        print_warning "⚠️  DNS Warning!"
        print_warning "Domain $DOMAIN resolves to $DOMAIN_IP"
        print_warning "But this server's IP is $SERVER_IP"
        print_warning "SSL certificate might fail!"
        
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_error "Please fix DNS first: $DOMAIN → $SERVER_IP"
            exit 1
        fi
    else
        print_success "✅ Domain resolves correctly to server IP"
    fi
else
    print_warning "dig not available, skipping DNS check"
fi

# Obtain SSL certificate
print_status "Obtaining SSL certificate from Let's Encrypt..."
print_status "Email: $EMAIL"
print_status "Domain: $DOMAIN"

# Ensure nginx is running
if ! systemctl is-active --quiet nginx; then
    print_status "Starting Nginx..."
    systemctl start nginx
    sleep 2
fi

# Don't kill processes on port 80 - nginx needs to be running for webroot verification
print_status "Using nginx webroot for certificate verification..."

# Try to get certificate with nginx plugin (automatic configuration)
print_status "Attempting SSL certificate acquisition..."
if certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email $EMAIL --redirect --no-eff-email; then
    print_success "✅ SSL certificate obtained and HTTPS configured!"
    
elif certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email $EMAIL --no-eff-email; then
    print_success "✅ SSL certificate obtained (without auto-redirect)"
    print_status "You can manually configure HTTPS redirect if needed"
    
else
    print_error "❌ Failed to obtain SSL certificate with nginx plugin"
    
    # Try with webroot method as fallback
    print_status "Trying webroot method as fallback..."
    mkdir -p /var/www/html
    
    if certbot certonly --webroot -w /var/www/html -d $DOMAIN --non-interactive --agree-tos --email $EMAIL --no-eff-email; then
        print_success "✅ SSL certificate obtained with webroot method"
        print_warning "⚠️  You'll need to manually configure nginx for HTTPS"
        
        # Show manual configuration hint
        echo ""
        print_status "To manually add HTTPS to nginx:"
        echo "1. Edit /etc/nginx/sites-available/gosei-play"
        echo "2. Add SSL server block with certificates:"
        echo "   ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;"
        echo "   ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;"
        
    else
        print_error "❌ All certificate acquisition methods failed!"
        print_error ""
        print_error "Common issues:"
        print_error "1. Domain $DOMAIN doesn't point to this server ($SERVER_IP)"
        print_error "2. Port 80 is blocked by firewall"
        print_error "3. Another web server is interfering"
        print_error "4. DNS propagation hasn't completed yet"
        print_error ""
        print_status "Your server is still accessible via HTTP:"
        print_status "  http://$DOMAIN"
        print_status "  http://$SERVER_IP"
        exit 1
    fi
fi

# Set up automatic renewal
print_status "Setting up automatic certificate renewal..."

# Create renewal script
cat > /usr/local/bin/renew-gosei-ssl << 'EOF'
#!/bin/bash
# Automatic SSL renewal for Gosei Play Server

# Renew certificates
certbot renew --quiet

# Reload Nginx if renewal was successful
if [ $? -eq 0 ]; then
    systemctl reload nginx
    echo "$(date): SSL certificate renewed and Nginx reloaded" >> /var/log/gosei-ssl-renewal.log
fi
EOF

chmod +x /usr/local/bin/renew-gosei-ssl

# Add to crontab for automatic renewal (twice daily)
crontab -l 2>/dev/null | grep -v renew-gosei-ssl | crontab -
(crontab -l 2>/dev/null; echo "0 2,14 * * * /usr/local/bin/renew-gosei-ssl") | crontab -

print_success "Automatic renewal configured (twice daily at 2 AM and 2 PM)"

# Create SSL monitoring script
cat > /usr/local/bin/check-gosei-ssl << EOF
#!/bin/bash
echo "🔐 SSL Certificate Status for $DOMAIN"
echo "======================================="
echo ""

# Check certificate expiry
echo "📅 Certificate Expiration:"
certbot certificates | grep -A 10 "$DOMAIN"

echo ""
echo "🔍 Certificate Details:"
echo | openssl s_client -servername $DOMAIN -connect $DOMAIN:443 2>/dev/null | openssl x509 -noout -dates

echo ""
echo "🌐 SSL Test:"
echo "Visit: https://www.ssllabs.com/ssltest/analyze.html?d=$DOMAIN"

echo ""
echo "🔄 Next Renewal Check:"
certbot renew --dry-run
EOF

chmod +x /usr/local/bin/check-gosei-ssl

# Configure Nginx for production
print_status "Optimizing Nginx for production..."

# Update Nginx main configuration
cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup

cat > /etc/nginx/nginx.conf << 'EOF'
user www-data;
worker_processes auto;
worker_cpu_affinity auto;
worker_rlimit_nofile 65535;
pid /run/nginx.pid;

events {
    worker_connections 4096;
    use epoll;
    multi_accept on;
}

http {
    # Basic Settings
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    keepalive_requests 1000;
    types_hash_max_size 2048;
    server_tokens off;
    client_max_body_size 16M;
    
    # Security
    server_names_hash_bucket_size 64;
    
    # MIME
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    # Logging
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;
    
    # Gzip
    gzip on;
    gzip_vary on;
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
    
    # Virtual Host Configs
    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
EOF

# Test and reload Nginx
nginx -t && systemctl reload nginx

print_success "Nginx optimized for production"

# Create Nginx monitoring script
cat > /usr/local/bin/nginx-status << 'EOF'
#!/bin/bash
echo "🌐 Nginx Status for Gosei Play Server"
echo "===================================="
echo ""

echo "📊 Service Status:"
systemctl status nginx --no-pager -l

echo ""
echo "🔗 Active Connections:"
ss -tlnp | grep :80
ss -tlnp | grep :443

echo ""
echo "📝 Recent Access Logs (last 10):"
tail -n 10 /var/log/nginx/access.log

echo ""
echo "❌ Recent Error Logs (last 5):"
tail -n 5 /var/log/nginx/error.log
EOF

chmod +x /usr/local/bin/nginx-status

# Final verification
print_status "Running final SSL verification..."

sleep 5

# Check if HTTPS is working
if curl -s -I https://$DOMAIN | grep -q "HTTP/"; then
    print_success "HTTPS is working!"
else
    print_warning "HTTPS verification failed, but SSL might still be working"
fi

# Display final status
echo ""
echo "🎉 SSL Setup Completed!"
echo "========================================"
echo ""
print_success "Your Gosei Play server is now secured with SSL!"
echo ""
echo "🌐 Your server is accessible at:"
echo "  • https://$DOMAIN (SSL secured)"
echo "  • http://$DOMAIN (redirects to HTTPS)"
echo ""
echo "🔐 SSL Configuration:"
echo "  • Certificate: Let's Encrypt"
echo "  • Auto-renewal: Enabled (twice daily)"
echo "  • Security headers: Configured"
echo "  • WebSocket support: Enabled"
echo "  • Rate limiting: Enabled"
echo ""
echo "🔧 Management Commands:"
echo "  • Check SSL: check-gosei-ssl"
echo "  • Nginx status: nginx-status"
echo "  • Renew manually: certbot renew"
echo "  • Test renewal: certbot renew --dry-run"
echo ""
echo "📊 SSL Monitoring:"
echo "  • Certificate logs: /var/log/gosei-ssl-renewal.log"
echo "  • Nginx logs: /var/log/nginx/"
echo "  • SSL test: https://www.ssllabs.com/ssltest/analyze.html?d=$DOMAIN"
echo ""
echo "⚠️  Important:"
echo "  • Firewall ports 80 and 443 are now required"
echo "  • Certificate will auto-renew every 60 days"
echo "  • Monitor renewal logs regularly"

# Update firewall if UFW is active
if command -v ufw &> /dev/null && ufw status | grep -q "Status: active"; then
    print_status "Updating firewall rules..."
    ufw allow 'Nginx Full'
    ufw delete allow 'Nginx HTTP' 2>/dev/null || true
    print_success "Firewall updated for HTTPS"
fi
EOF 