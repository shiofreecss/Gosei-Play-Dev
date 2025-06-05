#!/bin/bash

# User Setup Script for Gosei Play Server
# Run this as root to create the deployment user

set -e

echo "🔐 Setting up Gosei Play Server User"
echo "📡 Domain: gosei-svr-01.beaver.foundation"
echo "=================================="

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo "❌ This script must be run as root to create users"
   exit 1
fi

# Create gosei user
USERNAME="gosei"
HOME_DIR="/home/$USERNAME"

echo "👤 Creating user: $USERNAME"

# Create user with home directory
if id "$USERNAME" &>/dev/null; then
    echo "ℹ️  User $USERNAME already exists"
else
    useradd -m -s /bin/bash $USERNAME
    echo "✅ User $USERNAME created"
fi

# Add user to sudo group
usermod -aG sudo $USERNAME
echo "✅ Added $USERNAME to sudo group"

# Set up SSH key access (if root has keys)
if [ -d /root/.ssh ] && [ -f /root/.ssh/authorized_keys ]; then
    echo "🔑 Setting up SSH keys for $USERNAME"
    
    # Create .ssh directory for user
    mkdir -p $HOME_DIR/.ssh
    
    # Copy authorized keys
    cp /root/.ssh/authorized_keys $HOME_DIR/.ssh/
    
    # Set proper permissions
    chown -R $USERNAME:$USERNAME $HOME_DIR/.ssh
    chmod 700 $HOME_DIR/.ssh
    chmod 600 $HOME_DIR/.ssh/authorized_keys
    
    echo "✅ SSH keys configured for $USERNAME"
fi

# Install Node.js 18 LTS
echo "📦 Installing Node.js 18 LTS..."

# Update system first
apt update

# Install curl if not present
apt install -y curl

# Install Node.js 18 via NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Verify installation
NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)

echo "✅ Node.js installed: $NODE_VERSION"
echo "✅ npm installed: $NPM_VERSION"

# Install PM2 globally
echo "📦 Installing PM2 globally..."
npm install -g pm2

echo "✅ PM2 installed: $(pm2 --version)"

# Create project directory
PROJECT_DIR="$HOME_DIR/gosei-play"
echo "📁 Creating project directory: $PROJECT_DIR"

mkdir -p $PROJECT_DIR
chown -R $USERNAME:$USERNAME $PROJECT_DIR

# Set up basic firewall
echo "🛡️  Setting up basic firewall..."
ufw --force enable
ufw allow ssh
ufw allow 22
ufw allow 3001
ufw allow 80
ufw allow 443

echo "✅ Firewall configured"

# Install additional system dependencies
echo "📦 Installing system dependencies..."
apt install -y git curl wget unzip build-essential

# Create deployment info
cat > $HOME_DIR/deployment-info.txt << EOF
Gosei Play Server Deployment Info
=================================
Created: $(date)
Domain: gosei-svr-01.beaver.foundation
User: $USERNAME
Project Directory: $PROJECT_DIR
Node.js Version: $NODE_VERSION
PM2 Version: $(pm2 --version)

Next Steps:
1. Switch to user: su - $USERNAME
2. Upload/clone your code to: $PROJECT_DIR
3. Run deployment: cd $PROJECT_DIR/server && ./deploy.sh

Commands:
- Switch user: su - $USERNAME
- Check processes: pm2 list
- Monitor server: pm2 monit
- View logs: pm2 logs
EOF

chown $USERNAME:$USERNAME $HOME_DIR/deployment-info.txt

echo ""
echo "🎉 User setup completed!"
echo "=================================="
echo ""
echo "📋 Summary:"
echo "  • User created: $USERNAME"
echo "  • Home directory: $HOME_DIR"
echo "  • Project directory: $PROJECT_DIR"
echo "  • Node.js: $NODE_VERSION"
echo "  • PM2: $(pm2 --version)"
echo "  • SSH keys: $([ -f $HOME_DIR/.ssh/authorized_keys ] && echo "Configured" || echo "Not configured")"
echo ""
echo "🚀 Next Steps:"
echo "1. Switch to the new user:"
echo "   su - $USERNAME"
echo ""
echo "2. Clone/upload your code:"
echo "   cd $PROJECT_DIR"
echo "   # Upload your gosei-play files here"
echo ""
echo "3. Run deployment:"
echo "   cd $PROJECT_DIR/server"
echo "   ./deploy.sh"
echo ""
echo "📖 Read deployment info:"
echo "   cat $HOME_DIR/deployment-info.txt" 