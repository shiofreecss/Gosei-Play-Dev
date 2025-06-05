#!/bin/bash

# Clean up Nginx configuration conflicts and apply fix
echo "🧹 Cleaning Nginx Configuration Conflicts"
echo "=========================================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   print_error "This script must be run as root"
   echo "💡 Run: sudo ./clean-nginx.sh"
   exit 1
fi

print_status "Stopping Nginx..."
systemctl stop nginx

print_status "Creating backup directory..."
mkdir -p /etc/nginx/backups

print_status "Moving any existing gosei-play configs to backup..."
if ls /etc/nginx/sites-enabled/gosei-play* 1> /dev/null 2>&1; then
    mv /etc/nginx/sites-enabled/gosei-play* /etc/nginx/backups/ 2>/dev/null || true
fi

if ls /etc/nginx/sites-available/gosei-play* 1> /dev/null 2>&1; then
    mv /etc/nginx/sites-available/gosei-play* /etc/nginx/backups/ 2>/dev/null || true
fi

print_status "Removing default nginx site..."
rm -f /etc/nginx/sites-enabled/default

print_status "Testing clean configuration..."
if nginx -t; then
    print_success "✅ Nginx configuration is now clean"
    
    print_status "Running the nginx fix script..."
    ./fix-nginx.sh
    
else
    print_error "❌ Still have nginx configuration issues"
    nginx -t
    
    print_status "Checking for other configuration files..."
    find /etc/nginx/sites-enabled/ -name "*" -type f
fi 