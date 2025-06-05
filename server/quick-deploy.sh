#!/bin/bash

# Quick Deployment Script for Gosei Play Server
# This script sets up everything needed for deployment

set -e

echo "🚀 Gosei Play Server - Quick Deployment"
echo "📡 Domain: gosei-svr-01.beaver.foundation (2GB RAM VPS)"
echo "========================================"

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo "❌ This script must be run as root initially to set up the user"
   echo "💡 Run: sudo ./quick-deploy.sh"
   exit 1
fi

# Step 1: Set up user
echo "🔐 Step 1: Setting up deployment user..."
chmod +x setup-user.sh
./setup-user.sh

# Step 2: Copy files to user directory
USERNAME="gosei"
USER_HOME="/home/$USERNAME"
PROJECT_DIR="$USER_HOME/gosei-play"

echo "📁 Step 2: Copying files to user directory..."

# Create server directory
mkdir -p $PROJECT_DIR/server

# Copy all server files
cp -r . $PROJECT_DIR/server/

# Set ownership
chown -R $USERNAME:$USERNAME $PROJECT_DIR

echo "✅ Files copied to $PROJECT_DIR"

# Step 3: Switch to user and run deployment
echo "🚀 Step 3: Running deployment as user $USERNAME..."

# Create a script to run as the user
cat > /tmp/run-deployment.sh << 'EOF'
#!/bin/bash
cd ~/gosei-play/server
echo "📍 Current directory: $(pwd)"
echo "📋 Files available:"
ls -la

# Make scripts executable
chmod +x *.sh

# Run the deployment
echo "🚀 Starting deployment..."
./deploy.sh
EOF

chmod +x /tmp/run-deployment.sh
chown $USERNAME:$USERNAME /tmp/run-deployment.sh

# Run as the user
echo "🔄 Switching to user $USERNAME for deployment..."
su - $USERNAME -c "bash /tmp/run-deployment.sh"

# Clean up temp script
rm -f /tmp/run-deployment.sh

echo ""
echo "🎉 Quick deployment completed!"
echo "========================================"
echo ""
echo "📋 What was set up:"
echo "  • User: $USERNAME"
echo "  • Project: $PROJECT_DIR"
echo "  • Server running on port 3001"
echo "  • Redis configured for clustering"
echo "  • PM2 process management"
echo ""
echo "🔧 Management Commands:"
echo "  • Switch to user: su - $USERNAME"
echo "  • Monitor: su - $USERNAME -c 'cd ~/gosei-play/server && ./monitor.sh'"
echo "  • Restart: su - $USERNAME -c 'cd ~/gosei-play/server && ./restart.sh'"
echo "  • Logs: su - $USERNAME -c 'pm2 logs'"
echo ""
echo "🌐 Your server should now be accessible at:"
echo "  • http://gosei-svr-01.beaver.foundation:3001"
echo "  • http://$(curl -s ifconfig.me):3001" 