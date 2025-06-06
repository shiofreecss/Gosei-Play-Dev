# Quick Deployment Script for Gosei Server

This script automates the deployment process for setting up the Gosei server on your VPS.

## Automated Deployment Script

Create this script as `deploy-gosei.sh` on your VPS:

```bash
#!/bin/bash

# Gosei Server Quick Deployment Script
# For Ubuntu 20.04+ with 2GB RAM  
# Domain: gosei-svr-01.beaver.foundation

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="gosei-svr-01.beaver.foundation"
APP_DIR="/var/www/gosei"
USER=$(whoami)
REPO_URL="https://github.com/yourusername/gosei-play.git"  # Update this!
NODE_VERSION="18"

echo -e "${GREEN}🚀 Starting Gosei Server Deployment...${NC}"

# Function to print status
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_status "Updating system packages..."
sudo apt update && sudo apt upgrade -y

print_status "Installing essential packages..."
sudo apt install -y curl wget git unzip software-properties-common

print_status "Configuring firewall..."
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable

print_status "Installing Node.js ${NODE_VERSION}..."
curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
sudo apt-get install -y nodejs

print_status "Installing Nginx..."
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx

print_status "Installing PM2..."
sudo npm install -g pm2

print_status "Installing Certbot for SSL..."
sudo apt install -y certbot python3-certbot-nginx

print_status "Creating application directory..."
sudo mkdir -p $APP_DIR
sudo chown -R $USER:$USER $APP_DIR

print_status "Cloning repository..."
if [ -d "$APP_DIR/.git" ]; then
    print_warning "Repository already exists, pulling latest changes..."
    cd $APP_DIR
    git pull origin main
else
    git clone $REPO_URL $APP_DIR
    cd $APP_DIR
fi

print_status "Installing application dependencies..."
cd $APP_DIR/heroku-server
npm install

print_status "Installing production dependencies..."
npm install compression helmet express-rate-limit

print_status "Creating PM2 log directory..."
sudo mkdir -p /var/log/pm2
sudo chown -R $USER:$USER /var/log/pm2

print_status "Starting Gosei server with PM2..."
cd $APP_DIR/heroku-server
pm2 start server.js --name gosei-server --instances 2 --env production

print_status "Saving PM2 configuration..."
pm2 save

print_status "Setting up PM2 startup..."
pm2 startup

echo -e "${GREEN}✅ Basic deployment completed!${NC}"
echo ""
echo "Next steps:"
echo "1. Set up SSL certificate:"
echo -e "   ${YELLOW}sudo certbot --nginx -d $DOMAIN${NC}"
echo ""
echo "2. Configure Nginx for load balancing (see full guide)"
echo ""
echo "3. Check server status:"
echo -e "   ${YELLOW}pm2 status${NC}"
echo ""
echo -e "${GREEN}Your Gosei server should now be running!${NC}"
```

## Usage Instructions

### 1. Download and Run the Script

```bash
# On your VPS, create the script
nano deploy-gosei.sh

# Copy the script content above, then make it executable  
chmod +x deploy-gosei.sh

# Update the REPO_URL variable with your actual repository
# Run the deployment
./deploy-gosei.sh
```

### 2. Manual Steps After Script Completion

```bash
# 1. Set up SSL certificate
sudo certbot --nginx -d gosei-svr-01.beaver.foundation

# 2. Configure Nginx (see PRODUCTION_VPS_DEPLOYMENT.md for full config)

# 3. Verify everything is working
pm2 status
sudo systemctl status nginx
curl -I https://gosei-svr-01.beaver.foundation/health
```

This script provides a quick start for deployment. For the complete production setup with load balancing and optimization, follow the full PRODUCTION_VPS_DEPLOYMENT.md guide! 
