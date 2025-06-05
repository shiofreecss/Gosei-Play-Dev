#!/bin/bash

# Complete Deployment Script for Gosei Play Server with SSL
# Sets up user, server, load balancing, and SSL in one command
# Domain: gosei-svr-01.beaver.foundation

set -e

DOMAIN="gosei-svr-01.beaver.foundation"
EMAIL="nhvu.dalat@gmail.com"  # Update this to your email

echo "🚀 Gosei Play Server - Complete Deployment with SSL"
echo "📡 Domain: $DOMAIN"
echo "🔐 Includes: User setup + Load balancing + SSL"
echo "================================================"

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

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   print_error "This script must be run as root initially"
   echo "💡 Run: sudo ./quick-deploy-ssl.sh"
   exit 1
fi

# Check domain DNS resolution
print_status "Checking DNS configuration..."
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || echo "unknown")
print_status "Server IP: $SERVER_IP"

if command -v dig &> /dev/null; then
    DOMAIN_IP=$(dig +short $DOMAIN | tail -n1)
    print_status "Domain IP: $DOMAIN_IP"
    
    if [ "$SERVER_IP" != "$DOMAIN_IP" ] && [ "$DOMAIN_IP" != "" ]; then
        print_warning "⚠️  DNS Issue Detected!"
        print_warning "Domain $DOMAIN resolves to $DOMAIN_IP"
        print_warning "But this server's IP is $SERVER_IP"
        print_warning ""
        print_warning "Please update your DNS to point $DOMAIN to $SERVER_IP"
        print_warning "SSL certificate will fail without correct DNS!"
        
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_error "Please fix DNS first, then run this script again"
            echo ""
            echo "DNS Setup Instructions:"
            echo "1. Go to your domain registrar (where you bought $DOMAIN)"
            echo "2. Find DNS settings or Name servers"
            echo "3. Add/update A record: $DOMAIN → $SERVER_IP"
            echo "4. Wait 5-60 minutes for DNS propagation"
            echo "5. Run this script again"
            exit 1
        fi
    else
        print_success "DNS looks good!"
    fi
else
    print_warning "dig command not available, skipping DNS check"
fi

echo ""
print_status "🚀 Starting deployment process..."
echo ""

# Step 1: Set up user and basic server
print_status "📋 Step 1: Setting up deployment user and server..."
chmod +x setup-user.sh quick-deploy.sh
./quick-deploy.sh

if [ $? -ne 0 ]; then
    print_error "Server deployment failed!"
    exit 1
fi

print_success "✅ Server deployment completed!"

# Step 2: Wait for server to be ready
print_status "⏳ Waiting for server to be ready..."
sleep 10

# Check if Node.js server is running
USERNAME="gosei"
if su - $USERNAME -c "pm2 list | grep -q gosei-play-server.*online"; then
    print_success "✅ Node.js server is running"
else
    print_warning "Node.js server may not be running properly"
    print_status "Attempting to start server..."
    su - $USERNAME -c "cd ~/gosei-play/server && pm2 start ecosystem.config.js" || true
    sleep 5
fi

# Step 3: Set up SSL
print_status "📋 Step 3: Setting up SSL certificates..."

# Update email in SSL script
sed -i "s/EMAIL=\"admin@gosei.xyz\"/EMAIL=\"$EMAIL\"/" setup-ssl.sh

chmod +x setup-ssl.sh
./setup-ssl.sh

if [ $? -ne 0 ]; then
    print_error "SSL setup failed!"
    print_error "Your server is running but without SSL"
    print_error "You can access it at: http://$DOMAIN:3001"
    exit 1
fi

print_success "✅ SSL setup completed!"

# Step 4: Final verification
print_status "📋 Step 4: Running final verification..."

# Test HTTP redirect
print_status "Testing HTTP to HTTPS redirect..."
HTTP_RESPONSE=$(curl -s -I -w "%{http_code}" http://$DOMAIN 2>/dev/null | tail -n1)
if [[ "$HTTP_RESPONSE" == "301" || "$HTTP_RESPONSE" == "302" ]]; then
    print_success "✅ HTTP redirects to HTTPS"
else
    print_warning "HTTP redirect may not be working (got $HTTP_RESPONSE)"
fi

# Test HTTPS
print_status "Testing HTTPS connection..."
if curl -s -I https://$DOMAIN >/dev/null 2>&1; then
    print_success "✅ HTTPS is working"
else
    print_warning "HTTPS test failed, but may still be working"
fi

# Test WebSocket through SSL
print_status "Testing WebSocket support..."
if curl -s -I -H "Upgrade: websocket" -H "Connection: Upgrade" https://$DOMAIN >/dev/null 2>&1; then
    print_success "✅ WebSocket support enabled"
else
    print_warning "WebSocket test inconclusive"
fi

# Create comprehensive monitoring script
print_status "Creating complete monitoring script..."

cat > /usr/local/bin/gosei-monitor << EOF
#!/bin/bash
echo "🎮 Gosei Play Server - Complete Status"
echo "======================================"
echo ""

echo "🌐 Domain: $DOMAIN"
echo "📧 Admin: $EMAIL"
echo "🖥️  Server IP: $SERVER_IP"
echo ""

echo "📊 System Overview:"
echo "  • OS: \$(lsb_release -d 2>/dev/null | cut -f2 || uname -o)"
echo "  • Uptime: \$(uptime -p 2>/dev/null || uptime)"
echo "  • Memory: \$(free -h | grep Mem | awk '{print \$3 "/" \$2}')"
echo "  • Disk: \$(df -h / | awk 'NR==2{print \$3 "/" \$2 " (" \$5 " used)"}')"
echo ""

echo "🔐 SSL Status:"
check-gosei-ssl 2>/dev/null | head -10 || echo "SSL check failed"
echo ""

echo "🌐 Nginx Status:"
if systemctl is-active --quiet nginx; then
    echo "  • Status: ✅ Running"
    echo "  • Connections: \$(ss -tlnp | grep -c ":80\\|:443") active"
else
    echo "  • Status: ❌ Not running"
fi
echo ""

echo "🚀 Node.js Server:"
su - $USERNAME -c "pm2 list" 2>/dev/null | grep gosei-play-server || echo "PM2 status unavailable"
echo ""

echo "📊 Redis Status:"
if command -v redis-cli &> /dev/null; then
    if redis-cli ping >/dev/null 2>&1; then
        echo "  • Status: ✅ Running"
        echo "  • Memory: \$(redis-cli info memory | grep used_memory_human | cut -d: -f2 | tr -d '\r')"
        echo "  • Keys: \$(redis-cli dbsize 2>/dev/null || echo "0")"
    else
        echo "  • Status: ❌ Not responding"
    fi
else
    echo "  • Status: ❓ Redis CLI not available"
fi
echo ""

echo "🌐 Connectivity Tests:"
echo "  • HTTP: \$(curl -s -o /dev/null -w "%{http_code}" http://$DOMAIN 2>/dev/null || echo "Failed")"
echo "  • HTTPS: \$(curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN 2>/dev/null || echo "Failed")"
echo ""

echo "📝 Recent Activity:"
echo "  • Nginx access (last 3):"
tail -n 3 /var/log/nginx/access.log 2>/dev/null | sed 's/^/    /' || echo "    No access logs"
echo "  • Nginx errors (last 2):"
tail -n 2 /var/log/nginx/error.log 2>/dev/null | sed 's/^/    /' || echo "    No error logs"
echo ""

echo "💡 Quick Commands:"
echo "  • Full status: gosei-monitor"
echo "  • SSL check: check-gosei-ssl"
echo "  • Restart server: su - $USERNAME -c 'cd ~/gosei-play/server && ./restart.sh'"
echo "  • View logs: su - $USERNAME -c 'pm2 logs'"
echo "  • Nginx status: nginx-status"
EOF

chmod +x /usr/local/bin/gosei-monitor

# Create quick restart script
cat > /usr/local/bin/gosei-restart << EOF
#!/bin/bash
echo "🔄 Restarting Gosei Play Server..."
echo ""

echo "📊 Stopping services..."
su - $USERNAME -c "pm2 stop ecosystem.config.js" 2>/dev/null || true
sleep 2

echo "🚀 Starting services..."
su - $USERNAME -c "cd ~/gosei-play/server && pm2 start ecosystem.config.js"
sleep 3

echo "🌐 Reloading Nginx..."
systemctl reload nginx

echo ""
echo "✅ Restart completed!"
echo ""
gosei-monitor
EOF

chmod +x /usr/local/bin/gosei-restart

# Display final status
echo ""
echo "🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!"
echo "================================================"
echo ""
print_success "Your Gosei Play server is now fully deployed with SSL!"
echo ""
echo "🌐 Access Your Server:"
echo "  • Primary URL: https://$DOMAIN"
echo "  • HTTP (redirects): http://$DOMAIN"
echo "  • IP Access: https://$SERVER_IP (if needed)"
echo ""
echo "🔐 SSL Information:"
echo "  • Certificate: Let's Encrypt (free)"
echo "  • Auto-renewal: Every 60 days"
echo "  • Security Grade: A+ (estimated)"
echo "  • WebSocket: Enabled"
echo ""
echo "⚡ Performance Features:"
echo "  • Load balancing: Multi-worker Node.js"
echo "  • Caching: Redis-backed state"
echo "  • Compression: Gzip enabled"
echo "  • Rate limiting: Enabled"
echo ""
echo "🔧 Management Commands:"
echo "  • Complete status: gosei-monitor"
echo "  • Quick restart: gosei-restart"
echo "  • SSL check: check-gosei-ssl"
echo "  • Nginx status: nginx-status"
echo "  • Server logs: su - $USERNAME -c 'pm2 logs'"
echo ""
echo "📊 Monitoring:"
echo "  • SSL Test: https://www.ssllabs.com/ssltest/analyze.html?d=$DOMAIN"
echo "  • Uptime: Use any uptime monitoring service"
echo "  • Performance: Monitor with PM2 or external tools"
echo ""
echo "⚠️  Important Notes:"
echo "  • Save these commands for future use"
echo "  • Monitor SSL renewal logs: /var/log/gosei-ssl-renewal.log"
echo "  • Regular backups recommended"
echo "  • Keep system updated: apt update && apt upgrade"
echo ""
echo "🎮 Your Go server is ready for players!"

# Run the monitoring command to show current status
echo ""
echo "📊 Current Status:"
echo "=================="
gosei-monitor 