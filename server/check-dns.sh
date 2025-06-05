#!/bin/bash

# Quick DNS Check for Gosei Play Server
# Domain: gosei-svr-01.beaver.foundation

DOMAIN="gosei-svr-01.beaver.foundation"
SERVER_IP="172.105.114.6"

echo "🔍 DNS Check for $DOMAIN"
echo "================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if dig is available
if ! command -v dig &> /dev/null; then
    echo "Installing dig..."
    apt update && apt install -y dnsutils
fi

# Check DNS resolution
echo "🌐 Checking DNS resolution..."
RESOLVED_IP=$(dig +short $DOMAIN | tail -n1)

if [ -z "$RESOLVED_IP" ]; then
    echo -e "${RED}❌ FAIL${NC}: Domain $DOMAIN does not resolve"
    echo "   No A record found"
    echo ""
    echo "📋 You need to configure DNS first:"
    echo "   Add A record: $DOMAIN → $SERVER_IP"
    echo ""
    echo "💡 Run for detailed setup: ./setup-dns.sh"
    exit 1
elif [ "$RESOLVED_IP" = "$SERVER_IP" ]; then
    echo -e "${GREEN}✅ SUCCESS${NC}: Domain resolves correctly"
    echo "   $DOMAIN → $SERVER_IP"
    echo ""
    echo "🎉 DNS is ready! You can now run SSL setup:"
    echo "   ./setup-ssl.sh"
else
    echo -e "${YELLOW}⚠️  WARNING${NC}: Domain resolves to wrong IP"
    echo "   $DOMAIN → $RESOLVED_IP (should be $SERVER_IP)"
    echo ""
    echo "📋 Fix required:"
    echo "   Update A record: $DOMAIN → $SERVER_IP"
    echo ""
    echo "💡 Run for detailed setup: ./setup-dns.sh"
    exit 1
fi

# Check www subdomain
echo ""
echo "🌐 Checking www subdomain..."
WWW_RESOLVED_IP=$(dig +short www.$DOMAIN | tail -n1)

if [ -z "$WWW_RESOLVED_IP" ]; then
    echo -e "${YELLOW}⚠️  WARNING${NC}: www.$DOMAIN does not resolve"
    echo "   Consider adding: www → $SERVER_IP"
elif [ "$WWW_RESOLVED_IP" = "$SERVER_IP" ]; then
    echo -e "${GREEN}✅ SUCCESS${NC}: www subdomain resolves correctly"
    echo "   www.$DOMAIN → $SERVER_IP"
else
    echo -e "${YELLOW}⚠️  WARNING${NC}: www subdomain resolves to wrong IP"
    echo "   www.$DOMAIN → $WWW_RESOLVED_IP (should be $SERVER_IP)"
fi

echo ""
echo "📊 DNS Summary:"
echo "==============="
echo "Domain: $DOMAIN"
echo "Target IP: $SERVER_IP"
echo "Resolved IP: $RESOLVED_IP"
echo "Status: $([ "$RESOLVED_IP" = "$SERVER_IP" ] && echo "Ready for SSL" || echo "Needs DNS fix")" 