#!/bin/bash

# ===================================================================
# Redis Startup Fix for Gosei Production Server
# ===================================================================
# Diagnoses and fixes Redis service startup failures
# Common issues: config errors, permissions, port conflicts
# ===================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

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
echo -e "${CYAN}🔧 Redis Startup Troubleshooter${NC}"
echo ""

print_header "🔍 DIAGNOSING REDIS STARTUP FAILURE"

print_status "Checking Redis service status..."
systemctl status redis-server.service --no-pager || true

print_status "Checking Redis logs for errors..."
echo -e "${CYAN}Recent Redis service logs:${NC}"
journalctl -xeu redis-server.service --no-pager -n 20 || true

print_status "Checking if Redis port is in use..."
if netstat -tulpn | grep :6379; then
    print_warning "Port 6379 is already in use!"
    netstat -tulpn | grep :6379
else
    print_status "Port 6379 is available"
fi

print_status "Checking Redis configuration file..."
if [ -f /etc/redis/redis.conf ]; then
    print_status "Redis config exists, checking syntax..."
    
    # Check for common configuration issues
    echo -e "${CYAN}Checking for configuration issues:${NC}"
    
    # Check for missing directories
    if grep -q "^dir " /etc/redis/redis.conf; then
        REDIS_DIR=$(grep "^dir " /etc/redis/redis.conf | awk '{print $2}')
        if [ ! -d "$REDIS_DIR" ]; then
            print_error "Redis data directory $REDIS_DIR does not exist"
            mkdir -p "$REDIS_DIR"
            chown redis:redis "$REDIS_DIR"
            print_success "Created Redis data directory: $REDIS_DIR"
        fi
    fi
    
    # Check for log file directory
    if grep -q "^logfile " /etc/redis/redis.conf; then
        REDIS_LOG=$(grep "^logfile " /etc/redis/redis.conf | awk '{print $2}')
        REDIS_LOG_DIR=$(dirname "$REDIS_LOG")
        if [ ! -d "$REDIS_LOG_DIR" ]; then
            print_error "Redis log directory $REDIS_LOG_DIR does not exist"
            mkdir -p "$REDIS_LOG_DIR"
            chown redis:redis "$REDIS_LOG_DIR"
            print_success "Created Redis log directory: $REDIS_LOG_DIR"
        fi
    fi
    
else
    print_error "Redis configuration file not found!"
fi

print_header "🔧 FIXING COMMON REDIS ISSUES"

# Stop Redis service if running
print_status "Stopping Redis service..."
systemctl stop redis-server.service || true

# Kill any Redis processes
print_status "Cleaning up any Redis processes..."
pkill redis-server || true
sleep 2

# Create a minimal working Redis configuration
print_status "Creating a minimal Redis configuration..."
sudo tee /etc/redis/redis.conf > /dev/null << 'EOF'
# Minimal Redis configuration for Gosei Socket.IO adapter
port 6379
bind 127.0.0.1
protected-mode yes
timeout 300
tcp-keepalive 300

# Working directory
dir /var/lib/redis

# Logging
loglevel notice
logfile /var/log/redis/redis-server.log

# Persistence (simplified)
save 900 1
save 300 10
save 60 10000

# Memory management
maxmemory 256mb
maxmemory-policy allkeys-lru

# Security
requirepass gosei_redis_secret_2024

# Process management
daemonize no
supervised systemd

# Performance
tcp-backlog 511
databases 16

# Disable some features that might cause issues
stop-writes-on-bgsave-error no
rdbcompression yes
rdbchecksum yes
EOF

print_status "Creating necessary Redis directories..."
sudo mkdir -p /var/lib/redis
sudo mkdir -p /var/log/redis
sudo chown redis:redis /var/lib/redis
sudo chown redis:redis /var/log/redis
sudo chmod 755 /var/lib/redis
sudo chmod 755 /var/log/redis

print_status "Setting correct ownership for Redis config..."
sudo chown redis:redis /etc/redis/redis.conf
sudo chmod 640 /etc/redis/redis.conf

print_status "Testing Redis configuration syntax..."
sudo -u redis redis-server /etc/redis/redis.conf --test-memory 1 || {
    print_error "Redis configuration test failed!"
    print_status "Trying even simpler configuration..."
    
    # Ultra-minimal config
    sudo tee /etc/redis/redis.conf > /dev/null << 'EOF'
port 6379
bind 127.0.0.1
dir /var/lib/redis
logfile /var/log/redis/redis-server.log
requirepass gosei_redis_secret_2024
daemonize no
supervised systemd
EOF
    
    sudo chown redis:redis /etc/redis/redis.conf
    sudo chmod 640 /etc/redis/redis.conf
}

print_header "🚀 STARTING REDIS SERVICE"

print_status "Reloading systemd daemon..."
sudo systemctl daemon-reload

print_status "Starting Redis service..."
if sudo systemctl start redis-server.service; then
    print_success "Redis service started successfully!"
    
    print_status "Enabling Redis service for auto-start..."
    sudo systemctl enable redis-server.service
    
    print_status "Testing Redis connection..."
    sleep 3
    
    if redis-cli -a gosei_redis_secret_2024 ping 2>/dev/null | grep -q PONG; then
        print_success "✅ Redis is responding to ping!"
    else
        print_warning "Redis started but not responding to ping yet (may take a moment)"
    fi
    
else
    print_error "Failed to start Redis service"
    print_status "Checking logs again..."
    journalctl -xeu redis-server.service --no-pager -n 10
    
    print_status "Trying manual Redis start for debugging..."
    sudo -u redis redis-server /etc/redis/redis.conf &
    sleep 5
    
    if pgrep redis-server > /dev/null; then
        print_success "Redis started manually - there may be a systemd issue"
        pkill redis-server
        print_status "Use the manual start command if systemd continues to fail"
    else
        print_error "Redis failed to start manually as well"
    fi
fi

print_header "🧪 VERIFICATION"

print_status "Redis service status:"
systemctl status redis-server.service --no-pager || true

print_status "Redis process check:"
ps aux | grep redis | grep -v grep || echo "No Redis processes found"

print_status "Redis port check:"
netstat -tulpn | grep :6379 || echo "Redis port not listening"

print_header "✅ REDIS TROUBLESHOOTING COMPLETE"

if systemctl is-active --quiet redis-server.service; then
    echo -e "${GREEN}🎉 Redis is now running successfully!${NC}"
    echo ""
    echo -e "${CYAN}Next steps:${NC}"
    echo -e "${YELLOW}1. Test Redis connection: redis-cli -a gosei_redis_secret_2024 ping${NC}"
    echo -e "${YELLOW}2. Continue with Socket.IO Redis adapter setup${NC}"
    echo -e "${YELLOW}3. Update your server.js to use Redis adapter${NC}"
else
    echo -e "${RED}❌ Redis is still not running${NC}"
    echo ""
    echo -e "${CYAN}Manual troubleshooting options:${NC}"
    echo -e "${YELLOW}1. Check logs: journalctl -xeu redis-server.service${NC}"
    echo -e "${YELLOW}2. Test config: redis-server /etc/redis/redis.conf --test-memory 1${NC}"
    echo -e "${YELLOW}3. Manual start: sudo -u redis redis-server /etc/redis/redis.conf${NC}"
    echo ""
    echo -e "${CYAN}Alternative: Use only sticky sessions for now${NC}"
    echo -e "${YELLOW}Run the main fix script and choose option 1 (Sticky Sessions)${NC}"
fi

print_status "Troubleshooting completed at $(date)" 