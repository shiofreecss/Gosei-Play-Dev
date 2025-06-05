#!/bin/bash

# Gosei Play Server Deployment Script
# Automated deployment with load balancing and monitoring
# Version: 1.2.0
# Domain: gosei-svr-01.beaver.foundation

set -e  # Exit on any error

echo "🚀 Deploying Gosei Play Server with Load Balancing"
echo "📡 Target: gosei-svr-01.beaver.foundation (2GB RAM VPS)"
echo "========================================================"

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
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root for security reasons"
   exit 1
fi

# Check system resources
print_status "Checking system resources..."
TOTAL_MEM=$(free -m | awk 'NR==2{print $2}')
print_status "Total RAM: ${TOTAL_MEM}MB"

if [ $TOTAL_MEM -lt 1800 ]; then
    print_warning "System has less than 2GB RAM. Performance may be affected."
fi

# Create necessary directories
print_status "Creating directory structure..."
mkdir -p logs
mkdir -p backups

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 16+ first."
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ $NODE_VERSION -lt 16 ]; then
    print_error "Node.js version 16+ required. Current version: $(node --version)"
    exit 1
fi

print_success "Node.js $(node --version) detected"

# Install dependencies
print_status "Installing Node.js dependencies..."
npm install

# Setup Redis
print_status "Setting up Redis for clustering..."
if command -v redis-server &> /dev/null; then
    print_success "Redis is already installed"
else
    print_status "Redis not found. Running Redis setup..."
    chmod +x setup-redis.sh
    ./setup-redis.sh
fi

# Test Redis connection
print_status "Testing Redis connection..."
if redis-cli ping > /dev/null 2>&1; then
    print_success "Redis connection successful"
else
    print_error "Redis connection failed. Please check Redis installation."
    exit 1
fi

# Create environment file
print_status "Creating environment configuration..."
cat > .env << EOF
NODE_ENV=production
PORT=3001
REDIS_HOST=localhost
REDIS_PORT=6379
DOMAIN=gosei-svr-01.beaver.foundation

# Memory settings for 2GB VPS
MAX_OLD_SPACE_SIZE=1536
MAX_MEMORY_RESTART=1500MB

# Logging
LOG_LEVEL=info
LOG_DIR=./logs

# Security (set these in production)
# REDIS_PASSWORD=your_secure_password_here
# JWT_SECRET=your_jwt_secret_here
EOF

print_success "Environment file created"

# Install PM2 globally if not present
if ! command -v pm2 &> /dev/null; then
    print_status "Installing PM2 globally..."
    sudo npm install -g pm2
fi

# Setup PM2 startup script
print_status "Configuring PM2 startup..."
sudo pm2 startup systemd -u $USER --hp $HOME > /dev/null 2>&1 || true

# Stop any existing processes
print_status "Stopping existing processes..."
pm2 stop ecosystem.config.js > /dev/null 2>&1 || true
pm2 delete ecosystem.config.js > /dev/null 2>&1 || true

# Create backup of existing game state if any
print_status "Creating backup of existing data..."
BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p $BACKUP_DIR

# Backup Redis data if it exists
if redis-cli ping > /dev/null 2>&1; then
    redis-cli save > /dev/null 2>&1 || true
    if [ -f /var/lib/redis/dump.rdb ]; then
        sudo cp /var/lib/redis/dump.rdb $BACKUP_DIR/ 2>/dev/null || true
        print_success "Redis data backed up to $BACKUP_DIR"
    fi
fi

# Test the cluster setup
print_status "Testing cluster configuration..."
timeout 10 node cluster.js --test > /dev/null 2>&1 || true

# Start the load-balanced server
print_status "Starting load-balanced Gosei Play server..."
pm2 start ecosystem.config.js

# Wait for startup
sleep 5

# Check if processes are running
if pm2 list | grep -q "gosei-play-server.*online"; then
    print_success "Server started successfully!"
    
    # Show status
    echo ""
    print_status "Server Status:"
    pm2 list
    
    echo ""
    print_status "Resource Usage:"
    pm2 monit --no-colors | head -20
    
    echo ""
    print_status "Redis Status:"
    redis-monitor
    
else
    print_error "Server failed to start. Check logs:"
    pm2 logs --lines 20
    exit 1
fi

# Save PM2 configuration
pm2 save > /dev/null 2>&1

# Create monitoring script
print_status "Creating monitoring utilities..."
cat > monitor.sh << 'EOF'
#!/bin/bash
echo "🎮 Gosei Play Server Monitor"
echo "=========================="
echo ""
echo "📊 PM2 Status:"
pm2 list
echo ""
echo "📊 Redis Status:"
redis-monitor
echo ""
echo "💾 Memory Usage:"
free -h
echo ""
echo "💻 CPU Usage:"
top -bn1 | grep "Cpu(s)" | awk '{print $2 $3 $4 $5 $6 $7 $8}'
echo ""
echo "🌐 Network Connections:"
netstat -tlnp | grep :3001 || echo "No connections on port 3001"
echo ""
echo "📝 Recent Logs (last 10 lines):"
pm2 logs --lines 10 --nostream
EOF

chmod +x monitor.sh

# Create restart script
cat > restart.sh << 'EOF'
#!/bin/bash
echo "🔄 Restarting Gosei Play Server..."
pm2 restart ecosystem.config.js
sleep 3
echo "✅ Restart complete!"
pm2 list
EOF

chmod +x restart.sh

# Create status check script
cat > health-check.sh << 'EOF'
#!/bin/bash
# Health check script for load balancer

# Check if server is responding
if curl -f -s http://localhost:3001/ > /dev/null; then
    echo "✅ Server is healthy"
    exit 0
else
    echo "❌ Server health check failed"
    exit 1
fi
EOF

chmod +x health-check.sh

# Setup log rotation
print_status "Setting up log rotation..."
sudo tee /etc/logrotate.d/gosei-play > /dev/null << EOF
/home/$USER/*/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    copytruncate
    su $USER $USER
}
EOF

# Final verification
print_status "Running final verification..."
sleep 2

# Test server endpoint
if curl -f -s http://localhost:3001/ > /dev/null; then
    print_success "Server endpoint is responding"
else
    print_warning "Server endpoint test failed - check configuration"
fi

# Test Redis
if redis-cli ping > /dev/null 2>&1; then
    print_success "Redis is operational"
else
    print_warning "Redis test failed"
fi

echo ""
echo "🎉 Deployment completed!"
echo "========================================================"
echo ""
print_success "Gosei Play Server is now running with load balancing!"
echo ""
echo "📋 Quick Commands:"
echo "  • Monitor: ./monitor.sh"
echo "  • Restart: ./restart.sh"
echo "  • Health: ./health-check.sh"
echo "  • Logs: pm2 logs"
echo "  • Stop: pm2 stop ecosystem.config.js"
echo ""
echo "🔧 Configuration:"
echo "  • Domain: gosei-svr-01.beaver.foundation"
echo "  • Port: 3001"
echo "  • Workers: Auto-scaled based on CPU cores (max 4 for 2GB RAM)"
echo "  • Redis: localhost:6379 (512MB memory limit)"
echo "  • Logs: ./logs/"
echo ""
echo "📊 Monitoring:"
echo "  • PM2 Dashboard: pm2 monit"
echo "  • Redis Monitor: redis-monitor"
echo "  • System Stats: ./monitor.sh"
echo ""
echo "🚨 Important:"
echo "  • Set Redis password in production"
echo "  • Configure firewall rules"
echo "  • Setup SSL/TLS certificates"
echo "  • Monitor memory usage regularly" 