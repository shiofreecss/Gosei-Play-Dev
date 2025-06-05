#!/bin/bash

# DNS Setup Guide for Gosei Play Server
# Domain: gosei-svr-01.beaver.foundation
# Server IP: 172.105.114.6

DOMAIN="gosei-svr-01.beaver.foundation"
SERVER_IP="172.105.114.6"

echo "🌐 DNS Setup Guide for Gosei Play Server"
echo "========================================"
echo ""
echo "📡 Domain: $DOMAIN"
echo "🖥️  Server IP: $SERVER_IP"
echo ""

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

# Function to check DNS
check_dns() {
    print_status "Checking DNS resolution for $DOMAIN..."
    
    # Check if dig is available
    if ! command -v dig &> /dev/null; then
        print_status "Installing dig (dnsutils)..."
        apt update
        apt install -y dnsutils
    fi
    
    # Check A record
    RESOLVED_IP=$(dig +short $DOMAIN | tail -n1)
    
    if [ -z "$RESOLVED_IP" ]; then
        print_error "❌ Domain $DOMAIN does not resolve to any IP"
        echo "   The domain has no DNS A record configured"
        return 1
    elif [ "$RESOLVED_IP" = "$SERVER_IP" ]; then
        print_success "✅ Domain $DOMAIN correctly resolves to $SERVER_IP"
        return 0
    else
        print_warning "⚠️  Domain $DOMAIN resolves to $RESOLVED_IP"
        print_warning "   But this server's IP is $SERVER_IP"
        return 1
    fi
}

# Function to wait for DNS propagation
wait_for_dns() {
    local max_attempts=60  # 10 minutes
    local attempt=1
    
    print_status "Waiting for DNS propagation..."
    print_status "This can take 5-60 minutes depending on your DNS provider"
    
    while [ $attempt -le $max_attempts ]; do
        if check_dns >/dev/null 2>&1; then
            print_success "✅ DNS propagation completed!"
            return 0
        fi
        
        echo -n "   Attempt $attempt/$max_attempts: Checking... "
        if [ $attempt -eq 1 ]; then
            echo "Still propagating (this is normal)"
        elif [ $attempt -lt 30 ]; then
            echo "Still waiting..."
        else
            echo "Taking longer than expected..."
        fi
        
        sleep 10
        ((attempt++))
    done
    
    print_error "❌ DNS still not propagated after 10 minutes"
    return 1
}

# Check current DNS status
echo "🔍 Current DNS Status:"
echo "===================="
check_dns

if [ $? -eq 0 ]; then
    echo ""
    print_success "🎉 DNS is already configured correctly!"
    print_status "You can now run the SSL setup:"
    echo "   ./setup-ssl.sh"
    exit 0
fi

echo ""
echo "📋 DNS Setup Instructions:"
echo "=========================="
echo ""
echo "You need to configure DNS records for your domain. Here's how:"
echo ""
echo "🔧 Step 1: Access Your Domain's DNS Settings"
echo "---------------------------------------------"
echo "1. Go to your domain registrar's website (where you bought the domain)"
echo "2. Log into your account"
echo "3. Find 'DNS Management', 'DNS Settings', or 'Name Servers'"
echo ""
echo "🔧 Step 2: Add DNS Records"
echo "--------------------------"
echo "Add these DNS records:"
echo ""
echo "   Record Type: A"
echo "   Name/Host: @ (or leave blank for root domain)"
echo "   Value/Points to: $SERVER_IP"
echo "   TTL: 300 (5 minutes) or use default"
echo ""
echo "   Record Type: A"
echo "   Name/Host: www"
echo "   Value/Points to: $SERVER_IP"
echo "   TTL: 300 (5 minutes) or use default"
echo ""
echo "🔧 Step 3: Save and Wait"
echo "------------------------"
echo "1. Save the DNS changes"
echo "2. Wait 5-60 minutes for DNS propagation"
echo "3. Run this script again to verify: ./setup-dns.sh"
echo ""

echo "🌐 Popular DNS Providers Instructions:"
echo "======================================"
echo ""
echo "📍 Cloudflare:"
echo "   1. Go to cloudflare.com → Login"
echo "   2. Select your domain"
echo "   3. Go to 'DNS' tab"
echo "   4. Add A record: @ → $SERVER_IP"
echo "   5. Add A record: www → $SERVER_IP"
echo ""
echo "📍 Namecheap:"
echo "   1. Go to namecheap.com → Login"
echo "   2. Account → Domain List"
echo "   3. Click 'Manage' next to your domain"
echo "   4. Go to 'Advanced DNS' tab"
echo "   5. Add A record: @ → $SERVER_IP"
echo "   6. Add A record: www → $SERVER_IP"
echo ""
echo "📍 GoDaddy:"
echo "   1. Go to godaddy.com → Login"
echo "   2. My Products → DNS"
echo "   3. Click domain name"
echo "   4. Add A record: @ → $SERVER_IP"
echo "   5. Add A record: www → $SERVER_IP"
echo ""
echo "📍 Google Domains:"
echo "   1. Go to domains.google.com → Login"
echo "   2. Click your domain"
echo "   3. Go to 'DNS' tab"
echo "   4. Add A record: @ → $SERVER_IP"
echo "   5. Add A record: www → $SERVER_IP"
echo ""

# Offer to wait for DNS
echo "⏳ DNS Verification Options:"
echo "============================"
echo ""
echo "1. Configure DNS now and come back later"
echo "2. Configure DNS now and wait here for propagation"
echo "3. Exit and configure DNS manually"
echo ""

read -p "What would you like to do? (1/2/3): " -n 1 -r
echo
echo ""

case $REPLY in
    1)
        print_status "📋 Next Steps:"
        echo "1. Configure DNS as shown above"
        echo "2. Run: ./setup-dns.sh (to verify)"
        echo "3. Run: ./setup-ssl.sh (once DNS works)"
        ;;
    2)
        print_status "Configuring DNS monitoring..."
        print_warning "⚠️  Make sure you configure DNS records first!"
        echo ""
        read -p "Press Enter after you've configured DNS records..." 
        echo ""
        
        if wait_for_dns; then
            print_success "🎉 DNS is now working!"
            echo ""
            print_status "Next step: Run SSL setup"
            echo "   ./setup-ssl.sh"
        else
            print_error "DNS verification failed"
            print_status "Please check your DNS configuration and try again"
        fi
        ;;
    3)
        print_status "Exiting. Configure DNS and run ./setup-dns.sh to verify"
        ;;
    *)
        print_warning "Invalid option. Exiting."
        ;;
esac

echo ""
echo "🔧 Verification Commands:"
echo "========================"
echo ""
echo "# Check DNS from this server:"
echo "dig +short $DOMAIN"
echo ""
echo "# Check DNS from external source:"
echo "nslookup $DOMAIN 8.8.8.8"
echo ""
echo "# Online DNS checkers:"
echo "https://www.whatsmydns.net/#A/$DOMAIN"
echo "https://dnschecker.org/"
echo ""
echo "💡 Remember: DNS changes can take 5-60 minutes to propagate worldwide" 