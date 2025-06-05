#!/bin/bash

# Fix and Start Gosei Play Server
# Fixes PM2 configuration issues and starts the server properly

echo "🔧 Fixing Gosei Play Server Configuration"
echo "========================================"

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

# Check if running as gosei user
if [ "$USER" != "gosei" ]; then
    print_error "This script should be run as the 'gosei' user"
    print_status "Switch to gosei user with: su - gosei"
    print_status "Then run: cd ~/gosei-play/server && ./fix-and-start.sh"
    exit 1
fi

# Check current directory
if [ ! -f "cluster.js" ]; then
    print_warning "Not in the correct directory"
    print_status "Changing to server directory..."
    cd ~/gosei-play/server || {
        print_error "Could not find server directory"
        exit 1
    }
fi

print_status "Current directory: $(pwd)"

# Stop any existing PM2 processes
print_status "Stopping existing PM2 processes..."
pm2 delete all 2>/dev/null || true
pm2 kill 2>/dev/null || true

# Clear PM2 logs
print_status "Clearing PM2 logs..."
pm2 flush 2>/dev/null || true

# Create logs directory if it doesn't exist
print_status "Creating logs directory..."
mkdir -p logs

# Check if Redis is running
print_status "Checking Redis status..."
if ! redis-cli ping >/dev/null 2>&1; then
    print_warning "Redis is not responding"
    print_status "Starting Redis..."
    sudo systemctl start redis-server
    sleep 2
    
    if redis-cli ping >/dev/null 2>&1; then
        print_success "Redis is now running"
    else
        print_error "Failed to start Redis"
        print_status "You may need to install Redis: sudo apt install redis-server"
    fi
else
    print_success "Redis is running"
fi

# Verify ecosystem.config.js is valid
print_status "Validating PM2 configuration..."
if node -e "require('./ecosystem.config.js')" 2>/dev/null; then
    print_success "PM2 configuration is valid"
else
    print_error "PM2 configuration has syntax errors"
    print_status "Please check ecosystem.config.js"
    exit 1
fi

# Install dependencies if needed
print_status "Checking dependencies..."
if [ ! -d "node_modules" ]; then
    print_status "Installing dependencies..."
    npm install
fi

# Check if cluster.js exists
if [ ! -f "cluster.js" ]; then
    print_error "cluster.js not found!"
    print_status "Make sure you're in the correct directory and all files are present"
    exit 1
fi

# Start the server
print_status "Starting Gosei Play server with PM2..."
pm2 start ecosystem.config.js --env production

# Wait a moment for startup
sleep 3

# Check if it started successfully
print_status "Checking server status..."
pm2 list

# Check if process is running
if pm2 list | grep -q "gosei-play-server.*online"; then
    print_success "🎉 Server started successfully!"
    
    # Show logs
    echo ""
    print_status "Recent logs:"
    pm2 logs gosei-play-server --lines 10 --nostream
    
    echo ""
    print_success "Server Status:"
    echo "  • Process: Running"
    echo "  • Port: 3001"
    echo "  • Local access: http://localhost:3001"
    echo "  • Domain access: http://gosei-svr-01.beaver.foundation:3001"
    echo ""
    print_status "Useful commands:"
    echo "  • View logs: pm2 logs"
    echo "  • Restart: pm2 restart gosei-play-server"
    echo "  • Stop: pm2 stop gosei-play-server"
    echo "  • Monitor: pm2 monit"
    
else
    print_error "Server failed to start"
    echo ""
    print_status "Checking logs for errors..."
    pm2 logs gosei-play-server --lines 20 --nostream
    
    echo ""
    print_status "Troubleshooting steps:"
    echo "1. Check if port 3001 is already in use: netstat -tlnp | grep 3001"
    echo "2. Check Redis connection: redis-cli ping"
    echo "3. Check Node.js version: node --version (should be 18+)"
    echo "4. Check file permissions: ls -la cluster.js"
    echo "5. Manual start test: node cluster.js"
fi

echo ""
print_status "For SSL setup, run: ./setup-ssl.sh (after DNS is configured)" 