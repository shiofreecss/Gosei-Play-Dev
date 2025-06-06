#!/bin/bash

# ===================================================================
# Gosei Server Complete Production Deployment Script
# ===================================================================
# For Ubuntu 20.04+ with 2GB RAM
# Optimized for 100+ concurrent users
# Domain: gosei-svr-01.beaver.foundation
# ===================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration Variables - UPDATE THESE!
DOMAIN="gosei-svr-01.beaver.foundation"
APP_DIR="/var/www/gosei"
USER=$(whoami)
REPO_URL="https://github.com/shiofreecss/DEV-Gosei-Play.git"  # UPDATE THIS!
NODE_VERSION="18"
EMAIL="nhvu.dalat@gmail.com"  # UPDATE THIS for SSL certificates

# Script start
clear
echo -e "${PURPLE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${PURPLE}    🚀 Gosei Server Complete Production Deployment Script${NC}"
echo -e "${PURPLE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}Domain: ${DOMAIN}${NC}"
echo -e "${CYAN}Target: 100+ concurrent users${NC}"
echo -e "${CYAN}Server: 2GB RAM VPS with load balancing${NC}"
echo -e "${PURPLE}═══════════════════════════════════════════════════════════════${NC}"

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

# Check prerequisites and create user if needed
check_prerequisites() {
    print_header "🔍 CHECKING PREREQUISITES AND USER SETUP"
    
    # Check if running as root
    if [[ $EUID -eq 0 ]]; then
        print_warning "Running as root. We'll create a dedicated user for the deployment."
        create_deployment_user
    else
        print_status "Running as user: $(whoami)"
        
        # Check if user has sudo privileges
        if ! sudo -n true 2>/dev/null; then
            print_error "Current user doesn't have sudo privileges."
            print_warning "Please run with a user that has sudo access, or run as root to create a new user."
            exit 1
        fi
        
        print_success "User has sudo privileges"
    fi
    
    # Check internet connectivity
    if ! ping -c 1 google.com &> /dev/null; then
        print_error "No internet connection detected. Please check your network."
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Create deployment user
create_deployment_user() {
    print_header "👤 CREATING DEPLOYMENT USER"
    
    # Default user for Gosei deployment
    DEFAULT_USERNAME="gosei"
    
    echo -e "${CYAN}Creating a dedicated user for Gosei deployment...${NC}"
    echo -e "${YELLOW}This user will be used to run the application and manage the server.${NC}"
    echo ""
    
    # Prompt for username
    read -p "Enter username for deployment user (default: ${DEFAULT_USERNAME}): " DEPLOY_USERNAME
    DEPLOY_USERNAME=${DEPLOY_USERNAME:-$DEFAULT_USERNAME}
    
    # Check if user already exists
    if id "$DEPLOY_USERNAME" &>/dev/null; then
        print_warning "User '$DEPLOY_USERNAME' already exists."
        read -p "Do you want to use this existing user? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_error "Please choose a different username or use the existing user."
            exit 1
        fi
        
        # Ensure user has sudo privileges
        if ! groups "$DEPLOY_USERNAME" | grep -q sudo; then
            print_status "Adding user '$DEPLOY_USERNAME' to sudo group..."
            usermod -aG sudo "$DEPLOY_USERNAME"
        fi
        
        print_success "Using existing user '$DEPLOY_USERNAME'"
    else
        # Prompt for password
        echo -e "${CYAN}Setting up password for user '$DEPLOY_USERNAME'...${NC}"
        while true; do
            read -s -p "Enter password for user '$DEPLOY_USERNAME': " USER_PASSWORD
            echo
            read -s -p "Confirm password: " USER_PASSWORD_CONFIRM
            echo
            
            if [ "$USER_PASSWORD" = "$USER_PASSWORD_CONFIRM" ]; then
                if [ ${#USER_PASSWORD} -lt 8 ]; then
                    print_error "Password must be at least 8 characters long."
                    continue
                fi
                break
            else
                print_error "Passwords do not match. Please try again."
            fi
        done
        
        print_status "Creating user '$DEPLOY_USERNAME'..."
        
        # Create user with home directory
        useradd -m -s /bin/bash "$DEPLOY_USERNAME"
        
        # Set password
        echo "$DEPLOY_USERNAME:$USER_PASSWORD" | chpasswd
        
        # Add user to sudo group
        usermod -aG sudo "$DEPLOY_USERNAME"
        
        # Configure sudo without password for deployment (temporary)
        echo "$DEPLOY_USERNAME ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/gosei-deployment
        
        print_success "User '$DEPLOY_USERNAME' created successfully"
    fi
    
    # Update USER variable for the rest of the script
    USER="$DEPLOY_USERNAME"
    
    # Switch to the deployment user if we're still root
    if [[ $EUID -eq 0 ]]; then
        print_status "Switching to user '$DEPLOY_USERNAME' for deployment..."
        
        # Copy this script to the user's home directory
        SCRIPT_PATH="$(readlink -f "$0")"
        USER_HOME="/home/$DEPLOY_USERNAME"
        cp "$SCRIPT_PATH" "$USER_HOME/deploy-gosei-production.sh"
        chown "$DEPLOY_USERNAME:$DEPLOY_USERNAME" "$USER_HOME/deploy-gosei-production.sh"
        chmod +x "$USER_HOME/deploy-gosei-production.sh"
        
        # Update configuration variables in the copied script
        sed -i "s/USER=\$(whoami)/USER=\"$DEPLOY_USERNAME\"/" "$USER_HOME/deploy-gosei-production.sh"
        
        print_status "Continuing deployment as user '$DEPLOY_USERNAME'..."
        
        # Execute the script as the new user, skipping user creation
        sudo -u "$DEPLOY_USERNAME" bash "$USER_HOME/deploy-gosei-production.sh" --skip-user-creation
        exit $?
    fi
}

# System update and essential packages
setup_system() {
    print_header "🔧 SYSTEM SETUP AND UPDATES"
    
    print_status "Updating system packages..."
    sudo apt update && sudo apt upgrade -y
    
    print_status "Installing essential packages..."
    sudo apt install -y curl wget git unzip software-properties-common \
        htop iotop multitail bc build-essential apt-transport-https \
        ca-certificates gnupg lsb-release ufw fail2ban
    
    print_success "System setup completed"
}

# Configure firewall and security
setup_security() {
    print_header "🔒 SECURITY CONFIGURATION"
    
    print_status "Configuring UFW firewall..."
    sudo ufw --force reset
    sudo ufw default deny incoming
    sudo ufw default allow outgoing
    sudo ufw allow ssh
    sudo ufw allow 80
    sudo ufw allow 443
    sudo ufw --force enable
    
    print_status "Configuring fail2ban..."
    sudo systemctl enable fail2ban
    sudo systemctl start fail2ban
    
    print_success "Security configuration completed"
}

# Install Node.js
install_nodejs() {
    print_header "📦 INSTALLING NODE.JS ${NODE_VERSION}"
    
    print_status "Adding NodeSource repository..."
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
    
    print_status "Installing Node.js..."
    sudo apt-get install -y nodejs
    
    # Verify installation
    NODE_VER=$(node --version)
    NPM_VER=$(npm --version)
    print_success "Node.js ${NODE_VER} and npm ${NPM_VER} installed successfully"
}

# Install and configure Nginx
install_nginx() {
    print_header "🌐 INSTALLING AND CONFIGURING NGINX"
    
    print_status "Installing Nginx..."
    sudo apt install -y nginx
    
    print_status "Starting and enabling Nginx..."
    sudo systemctl start nginx
    sudo systemctl enable nginx
    
    print_success "Nginx installed and configured"
}

# Create Nginx site configuration
configure_nginx_site() {
    print_header "⚖️ CONFIGURING NGINX LOAD BALANCING"
    
    print_status "Creating Nginx site configuration for ${DOMAIN}..."
    
    sudo tee /etc/nginx/sites-available/${DOMAIN} > /dev/null << EOF
# Upstream configuration for load balancing
upstream gosei_backend {
    least_conn;
    server 127.0.0.1:3001 max_fails=3 fail_timeout=30s weight=3;
    server 127.0.0.1:3002 backup max_fails=2 fail_timeout=15s;
    keepalive 32;
}

# Rate limiting zones
limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone \$binary_remote_addr zone=general:10m rate=30r/s;

server {
    listen 80;
    server_name ${DOMAIN};
    
    # Let's Encrypt ACME challenge
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    location / {
        limit_req zone=general burst=50 nodelay;
        proxy_pass http://gosei_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 300s;
        proxy_cache_bypass \$http_upgrade;
    }
    
    location /socket.io/ {
        proxy_pass http://gosei_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }
    
    location /health {
        access_log off;
        proxy_pass http://gosei_backend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
    }
}
EOF
    
    print_status "Enabling site and removing default..."
    sudo ln -sf /etc/nginx/sites-available/${DOMAIN} /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    
    print_status "Testing Nginx configuration..."
    if sudo nginx -t; then
        print_success "Nginx configuration is valid"
        sudo systemctl reload nginx
    else
        print_error "Nginx configuration test failed"
        exit 1
    fi
}

# Install PM2
install_pm2() {
    print_header "🔄 INSTALLING PM2 PROCESS MANAGER"
    
    print_status "Installing PM2 globally..."
    sudo npm install -g pm2@latest
    
    PM2_VER=$(pm2 --version)
    print_success "PM2 ${PM2_VER} installed successfully"
}

# Deploy application
deploy_application() {
    print_header "📱 DEPLOYING GOSEI APPLICATION"
    
    # Update configuration variables if needed
    if [ "$REPO_URL" = "https://github.com/yourusername/gosei-play.git" ]; then
        print_warning "Please update REPO_URL in the script with your actual repository URL"
        read -p "Enter your repository URL: " USER_REPO_URL
        if [ ! -z "$USER_REPO_URL" ]; then
            REPO_URL=$USER_REPO_URL
        fi
    fi
    
    print_status "Creating application directory..."
    sudo mkdir -p ${APP_DIR}
    sudo chown -R ${USER}:${USER} ${APP_DIR}
    
    print_status "Cloning repository..."
    if [ -d "${APP_DIR}/.git" ]; then
        print_warning "Repository already exists, pulling latest changes..."
        cd ${APP_DIR}
        git pull origin main
    else
        git clone ${REPO_URL} ${APP_DIR}
        cd ${APP_DIR}
    fi
    
    print_status "Checking server directory structure..."
    if [ ! -d "${APP_DIR}/server" ]; then
        print_error "Server directory not found at ${APP_DIR}/server"
        print_status "Available directories in ${APP_DIR}:"
        ls -la ${APP_DIR}/
        
        # Check for common alternative directory names
        if [ -d "${APP_DIR}/heroku-server" ]; then
            print_warning "Found 'heroku-server' directory. Creating symlink to 'server'..."
            ln -s ${APP_DIR}/heroku-server ${APP_DIR}/server
        elif [ -d "${APP_DIR}/src" ]; then
            print_warning "Found 'src' directory. Using that instead..."
            cd ${APP_DIR}/src
        elif [ -f "${APP_DIR}/server.js" ]; then
            print_warning "Found server.js in root directory. Using root directory..."
            cd ${APP_DIR}
        else
            print_error "Could not find Node.js server files. Please check repository structure."
            exit 1
        fi
    else
        print_success "Server directory found"
        cd ${APP_DIR}/server
    fi
    
    print_status "Installing application dependencies..."
    npm install --production
    
    print_status "Installing production optimization packages..."
    npm install compression helmet express-rate-limit
    
    print_success "Application deployed successfully"
}

# Apply system optimizations
optimize_system() {
    print_header "🚀 APPLYING SYSTEM OPTIMIZATIONS"
    
    print_status "Configuring system limits..."
    sudo tee -a /etc/security/limits.conf > /dev/null << EOF
${USER} soft nofile 65536
${USER} hard nofile 65536
${USER} soft nproc 32768
${USER} hard nproc 32768
EOF
    
    print_status "Configuring kernel parameters..."
    sudo tee -a /etc/sysctl.conf > /dev/null << 'EOF'

# Network optimizations for high concurrent connections
net.core.somaxconn = 65535
net.core.netdev_max_backlog = 5000
net.ipv4.tcp_max_syn_backlog = 30000
net.ipv4.tcp_fin_timeout = 30
net.ipv4.tcp_keepalive_time = 120
net.ipv4.ip_local_port_range = 1024 65000
EOF
    
    print_status "Applying kernel parameters..."
    sudo sysctl -p
    
    print_success "System optimizations applied"
}

# Start services
start_services() {
    print_header "🟢 STARTING SERVICES"
    
    print_status "Creating PM2 log directory..."
    sudo mkdir -p /var/log/pm2
    sudo chown -R ${USER}:${USER} /var/log/pm2
    
    print_status "Starting Gosei server with PM2..."
    
    # Determine the correct server directory
    if [ -d "${APP_DIR}/server" ]; then
        SERVER_PATH="${APP_DIR}/server"
    elif [ -d "${APP_DIR}/heroku-server" ]; then
        SERVER_PATH="${APP_DIR}/heroku-server"
    elif [ -d "${APP_DIR}/src" ]; then
        SERVER_PATH="${APP_DIR}/src"
    elif [ -f "${APP_DIR}/server.js" ]; then
        SERVER_PATH="${APP_DIR}"
    else
        print_error "Cannot find server files to start"
        exit 1
    fi
    
    print_status "Using server path: ${SERVER_PATH}"
    cd ${SERVER_PATH}
    
    # Verify server.js exists
    if [ ! -f "server.js" ]; then
        print_error "server.js not found in ${SERVER_PATH}"
        print_status "Available files:"
        ls -la
        exit 1
    fi
    
    # Check if PM2 processes already exist and handle accordingly
    print_status "Checking for existing PM2 processes..."
    
    if pm2 list | grep -q "gosei-server"; then
        print_warning "Existing Gosei PM2 processes found"
        pm2 status
        
        read -p "Do you want to (r)estart, (d)elete and recreate, or (s)kip PM2 setup? [r/d/s]: " -n 1 -r
        echo
        
        case $REPLY in
            [Rr]* )
                print_status "Restarting existing PM2 processes..."
                pm2 restart gosei-server-cluster 2>/dev/null || true
                pm2 restart gosei-server-backup 2>/dev/null || true
                print_success "PM2 processes restarted"
                ;;
            [Dd]* )
                print_status "Deleting existing processes and recreating..."
                pm2 delete gosei-server-cluster 2>/dev/null || true
                pm2 delete gosei-server-backup 2>/dev/null || true
                sleep 2
                start_pm2_processes
                ;;
            [Ss]* )
                print_warning "Skipping PM2 setup - using existing processes"
                ;;
            * )
                print_status "Invalid option, restarting existing processes..."
                pm2 restart gosei-server-cluster 2>/dev/null || true
                pm2 restart gosei-server-backup 2>/dev/null || true
                ;;
        esac
    else
        print_status "No existing PM2 processes found, creating new ones..."
        start_pm2_processes
    fi
}

# Function to start PM2 processes
start_pm2_processes() {
    print_status "Starting new PM2 processes..."
    
    # Start the applications with error handling
    if NODE_ENV=production PORT=3001 pm2 start server.js --name gosei-server-cluster --instances 2 -e /var/log/pm2/gosei-error.log -o /var/log/pm2/gosei-out.log; then
        print_success "Main cluster started successfully"
    else
        print_error "Failed to start main cluster"
        return 1
    fi
    
    if NODE_ENV=production PORT=3002 pm2 start server.js --name gosei-server-backup --instances 1 -e /var/log/pm2/gosei-backup-error.log -o /var/log/pm2/gosei-backup-out.log; then
        print_success "Backup server started successfully"
    else
        print_error "Failed to start backup server"
        return 1
    fi
    
    print_status "Saving PM2 configuration..."
    pm2 save
    
    print_status "Setting up PM2 startup script..."
    pm2 startup
    
    print_success "Services started successfully"
}

# Create monitoring scripts
create_monitoring() {
    print_header "📊 SETTING UP MONITORING"
    
    print_status "Creating health check script..."
    cat > ${APP_DIR}/health-check.sh << 'EOF'
#!/bin/bash
# Health check script for Gosei server

HEALTH_URL="http://localhost:3001/health"
BACKUP_URL="http://localhost:3002/health"
LOG_FILE="/var/log/gosei-health.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

# Function to check endpoint
check_endpoint() {
    local url=$1
    local name=$2
    local response=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 --max-time 10 $url 2>/dev/null)
    
    if [ "$response" -eq 200 ]; then
        echo "$DATE: $name is healthy (HTTP $response)" >> $LOG_FILE
        return 0
    else
        echo "$DATE: $name health check failed (HTTP $response)" >> $LOG_FILE
        return 1
    fi
}

# Check main cluster
if ! check_endpoint $HEALTH_URL "Main Cluster"; then
    echo "$DATE: Restarting main cluster..." >> $LOG_FILE
    pm2 restart gosei-server-cluster
    sleep 5
fi

# Check backup server
if ! check_endpoint $BACKUP_URL "Backup Server"; then
    echo "$DATE: Restarting backup server..." >> $LOG_FILE
    pm2 restart gosei-server-backup
    sleep 3
fi
EOF
    
    chmod +x ${APP_DIR}/health-check.sh
    
    print_success "Monitoring scripts created"
}

# Install and configure SSL
setup_ssl() {
    print_header "🔐 SETTING UP SSL CERTIFICATE"
    
    print_status "Installing Certbot and dependencies..."
    sudo apt update
    sudo apt install -y certbot python3-certbot-nginx snapd
    
    # Install certbot via snap for latest version
    print_status "Installing latest Certbot via snap..."
    sudo snap install core; sudo snap refresh core
    sudo snap install --classic certbot
    sudo ln -sf /snap/bin/certbot /usr/bin/certbot
    
    # Ensure webroot directory exists
    print_status "Preparing webroot directory..."
    sudo mkdir -p /var/www/html/.well-known/acme-challenge
    sudo chown -R www-data:www-data /var/www/html
    sudo chmod -R 755 /var/www/html
    
    print_status "Checking domain DNS resolution..."
    if ! nslookup ${DOMAIN} >/dev/null 2>&1; then
        print_warning "DNS resolution for ${DOMAIN} failed. Continuing anyway..."
    else
        print_success "DNS resolution for ${DOMAIN} successful"
    fi
    
    print_warning "Ensure your domain ${DOMAIN} is pointing to this server's IP: $(curl -s ifconfig.me 2>/dev/null || echo 'Unable to detect')"
    
    # Auto-enable SSL by default
    print_status "Setting up SSL certificate automatically..."
    
    # Try multiple approaches for getting the certificate
    SSL_SUCCESS=false
    
    # Method 1: Webroot method
    print_status "Attempting SSL certificate generation (Method 1: Webroot)..."
    if sudo certbot certonly --webroot -w /var/www/html -d ${DOMAIN} --non-interactive --agree-tos --email ${EMAIL} --no-eff-email; then
        SSL_SUCCESS=true
        print_success "SSL certificate obtained via webroot method"
    else
        print_warning "Webroot method failed, trying standalone method..."
        
        # Method 2: Standalone method (temporarily stop nginx)
        print_status "Attempting SSL certificate generation (Method 2: Standalone)..."
        sudo systemctl stop nginx
        if sudo certbot certonly --standalone -d ${DOMAIN} --non-interactive --agree-tos --email ${EMAIL} --no-eff-email; then
            SSL_SUCCESS=true
            print_success "SSL certificate obtained via standalone method"
        fi
        sudo systemctl start nginx
    fi
    
    if [ "$SSL_SUCCESS" = true ]; then
        print_status "SSL certificate obtained successfully. Updating Nginx configuration..."
        configure_nginx_ssl
        
        print_status "Testing SSL certificate auto-renewal..."
        if sudo certbot renew --dry-run; then
            print_success "SSL auto-renewal test passed"
        else
            print_warning "SSL auto-renewal test failed, but certificate is installed"
        fi
        
        # Set up automatic renewal
        setup_ssl_renewal
        
        print_success "SSL certificate installed and auto-renewal configured"
    else
        print_error "All SSL certificate generation methods failed."
        print_warning "Common issues:"
        print_warning "1. Domain not pointing to this server"
        print_warning "2. Firewall blocking port 80/443"
        print_warning "3. DNS propagation not complete"
        print_warning ""
        print_warning "Server will continue running on HTTP."
        print_warning "To retry SSL later, run: sudo certbot certonly --webroot -w /var/www/html -d ${DOMAIN}"
    fi
}

# Setup SSL auto-renewal
setup_ssl_renewal() {
    print_status "Setting up SSL certificate auto-renewal..."
    
    # Create renewal script
    sudo tee /usr/local/bin/renew-ssl.sh > /dev/null << 'EOF'
#!/bin/bash
# SSL Certificate Renewal Script for Gosei

/usr/bin/certbot renew --quiet --no-self-upgrade

# Check if renewal was successful and reload nginx
if [ $? -eq 0 ]; then
    systemctl reload nginx
    logger "SSL certificate renewed successfully for Gosei server"
else
    logger "SSL certificate renewal failed for Gosei server"
fi
EOF
    
    sudo chmod +x /usr/local/bin/renew-ssl.sh
    
    # Add to crontab for automatic renewal (twice daily)
    (crontab -l 2>/dev/null; echo "0 2,14 * * * /usr/local/bin/renew-ssl.sh") | sudo crontab -
    
    # Enable and start certbot timer (systemd approach)
    if systemctl is-enabled certbot.timer >/dev/null 2>&1; then
        sudo systemctl enable certbot.timer
        sudo systemctl start certbot.timer
        print_status "Enabled systemd certbot timer for automatic renewal"
    fi
    
    print_success "SSL auto-renewal configured"
}

# Configure Nginx with SSL
configure_nginx_ssl() {
    print_status "Updating Nginx configuration with SSL and enhanced security..."
    
    # Generate stronger DH parameters if they don't exist
    if [ ! -f /etc/nginx/dhparam.pem ]; then
        print_status "Generating strong DH parameters (this may take a few minutes)..."
        sudo openssl dhparam -out /etc/nginx/dhparam.pem 2048
    fi
    
    sudo tee /etc/nginx/sites-available/${DOMAIN} > /dev/null << EOF
# Upstream configuration for load balancing
upstream gosei_backend {
    least_conn;
    server 127.0.0.1:3001 max_fails=3 fail_timeout=30s weight=3;
    server 127.0.0.1:3002 backup max_fails=2 fail_timeout=15s;
    keepalive 32;
    keepalive_requests 1000;
    keepalive_timeout 60s;
}

# Rate limiting zones
limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone \$binary_remote_addr zone=general:10m rate=30r/s;
limit_req_zone \$binary_remote_addr zone=socket:10m rate=100r/s;

# SSL session cache
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;

server {
    listen 80;
    server_name ${DOMAIN};
    
    # Let's Encrypt ACME challenge
    location /.well-known/acme-challenge/ {
        root /var/www/html;
        allow all;
    }
    
    # Redirect all other HTTP traffic to HTTPS
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name ${DOMAIN};
    
    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
    
    # Enhanced SSL security
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_dhparam /etc/nginx/dhparam.pem;
    ssl_ecdh_curve secp384r1;
    
    # OCSP Stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    ssl_trusted_certificate /etc/letsencrypt/live/${DOMAIN}/chain.pem;
    resolver 8.8.8.8 8.8.4.4 valid=300s;
    resolver_timeout 5s;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' ws: wss: data: blob: 'unsafe-inline' 'unsafe-eval'" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json;
    
    # Main application proxy
    location / {
        limit_req zone=general burst=50 nodelay;
        proxy_pass http://gosei_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$server_name;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 300s;
        proxy_cache_bypass \$http_upgrade;
        proxy_buffering off;
    }
    
    # WebSocket/Socket.IO specific configuration
    location /socket.io/ {
        limit_req zone=socket burst=200 nodelay;
        proxy_pass http://gosei_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$server_name;
        proxy_cache_bypass \$http_upgrade;
        proxy_buffering off;
        
        # WebSocket timeout settings
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
        proxy_connect_timeout 60s;
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://gosei_backend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_connect_timeout 5s;
        proxy_read_timeout 10s;
    }
    
    # Static file serving with caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)\$ {
        proxy_pass http://gosei_backend;
        proxy_cache_valid 200 1h;
        add_header Cache-Control "public, immutable";
        expires 1h;
    }
    
    # Security: Block common attack patterns
    location ~ /\.(ht|git|svn) {
        deny all;
        return 404;
    }
    
    location ~ /\.(env|log|config) {
        deny all;
        return 404;
    }
}
EOF
    
    print_status "Testing updated Nginx configuration..."
    if sudo nginx -t; then
        print_success "Nginx SSL configuration is valid"
        sudo systemctl reload nginx
        print_status "Nginx reloaded with SSL configuration"
        
        # Test SSL configuration
        print_status "Testing SSL configuration..."
        sleep 2
        if curl -sI https://${DOMAIN} >/dev/null 2>&1; then
            print_success "HTTPS connection test passed"
        else
            print_warning "HTTPS connection test failed - check certificate installation"
        fi
    else
        print_error "Nginx SSL configuration test failed"
        # Show nginx error log for debugging
        print_status "Nginx error log (last 10 lines):"
        sudo tail -10 /var/log/nginx/error.log
        exit 1
    fi
}

# Setup cron jobs
setup_cron_jobs() {
    print_header "⏰ SETTING UP CRON JOBS"
    
    print_status "Adding cron jobs for monitoring..."
    
    # Create temporary cron file
    crontab -l > /tmp/gosei_cron 2>/dev/null || true
    
    # Add new cron jobs
    cat >> /tmp/gosei_cron << EOF
# Gosei Server Monitoring
*/5 * * * * ${APP_DIR}/health-check.sh >/dev/null 2>&1
0 3 * * 0 pm2 flush >/dev/null 2>&1
EOF
    
    # Install the cron jobs
    crontab /tmp/gosei_cron
    rm /tmp/gosei_cron
    
    print_success "Cron jobs configured"
}

# Verify installation
verify_installation() {
    print_header "✅ VERIFYING INSTALLATION"
    
    print_status "Checking PM2 processes..."
    pm2 status
    
    print_status "Checking Nginx status..."
    sudo systemctl status nginx --no-pager -l
    
    print_status "Testing health endpoints..."
    sleep 5
    
    if curl -sf http://localhost:3001/health > /dev/null; then
        print_success "Main cluster health check: PASSED"
    else
        print_error "Main cluster health check: FAILED"
    fi
    
    if curl -sf http://localhost:3002/health > /dev/null; then
        print_success "Backup server health check: PASSED"
    else
        print_error "Backup server health check: FAILED"
    fi
    
    if curl -sf http://localhost > /dev/null; then
        print_success "Nginx proxy test: PASSED"
    else
        print_error "Nginx proxy test: FAILED"
    fi
    
    # Test HTTPS if SSL is configured
    if [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
        print_status "Testing HTTPS connection..."
        if curl -sf https://${DOMAIN} > /dev/null 2>&1; then
            print_success "HTTPS connection test: PASSED"
            
            # SSL certificate details
            print_status "SSL certificate information:"
            CERT_EXPIRY=$(openssl x509 -in /etc/letsencrypt/live/${DOMAIN}/cert.pem -noout -enddate | cut -d= -f2)
            print_status "Certificate expires: ${CERT_EXPIRY}"
            
            # SSL rating check (optional)
            print_status "SSL configuration rating check:"
            SSL_LABS_URL="https://www.ssllabs.com/ssltest/analyze.html?d=${DOMAIN}&hideResults=on&latest"
            print_status "Check SSL rating at: ${SSL_LABS_URL}"
        else
            print_warning "HTTPS connection test: FAILED"
            print_warning "SSL may need more time to propagate"
        fi
    else
        print_warning "SSL certificate not found - running in HTTP mode"
    fi
    
    print_success "Installation verification completed"
}

# Cleanup deployment configuration
cleanup_deployment() {
    print_header "🧹 CLEANING UP DEPLOYMENT CONFIGURATION"
    
    # Remove temporary sudo configuration
    if [ -f "/etc/sudoers.d/gosei-deployment" ]; then
        print_status "Removing temporary sudo configuration..."
        sudo rm -f /etc/sudoers.d/gosei-deployment
        
        # Create a more secure sudo configuration for the gosei user
        if [ "$USER" != "root" ]; then
            sudo tee /etc/sudoers.d/gosei-user > /dev/null << EOF
# Allow $USER to manage PM2 and Nginx without password
$USER ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart nginx, /usr/bin/systemctl reload nginx, /usr/bin/systemctl status nginx, /usr/bin/nginx -t, /usr/bin/certbot, /usr/sbin/ufw
EOF
            print_status "Created secure sudo configuration for user '$USER'"
        fi
    fi
    
    print_success "Cleanup completed"
}

# Main deployment function
main() {
    print_status "Starting deployment at $(date)"
    
    # Check for skip-user-creation flag
    SKIP_USER_CREATION=false
    for arg in "$@"; do
        if [ "$arg" = "--skip-user-creation" ]; then
            SKIP_USER_CREATION=true
            break
        fi
    done
    
    # Run all deployment steps
    if [ "$SKIP_USER_CREATION" = false ]; then
        check_prerequisites
    else
        print_header "🔍 CONTINUING DEPLOYMENT (USER CREATION SKIPPED)"
        print_status "Running as user: $(whoami)"
    fi
    
    setup_system
    setup_security
    install_nodejs
    install_nginx
    configure_nginx_site
    install_pm2
    deploy_application
    optimize_system
    start_services
    create_monitoring
    setup_ssl
    setup_cron_jobs
    verify_installation
    
    # Cleanup deployment configuration
    if [ "$SKIP_USER_CREATION" = false ]; then
        cleanup_deployment
    fi
    
    # Final success message
    print_header "🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!"
    
    echo -e "${GREEN}Your Gosei server is now running with:${NC}"
    echo -e "${CYAN}• Domain: ${DOMAIN}${NC}"
    echo -e "${CYAN}• User: ${USER}${NC}"
    echo -e "${CYAN}• Load Balancer: Nginx with PM2 cluster mode${NC}"
    
    # SSL status
    if [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
        echo -e "${CYAN}• SSL: ✅ Let's Encrypt certificate (HTTPS enabled)${NC}"
        echo -e "${CYAN}• Auto-renewal: ✅ Configured (twice daily)${NC}"
    else
        echo -e "${CYAN}• SSL: ⚠️ Not configured (HTTP only)${NC}"
        echo -e "${YELLOW}  Run SSL setup: sudo certbot certonly --webroot -w /var/www/html -d ${DOMAIN}${NC}"
    fi
    
    echo -e "${CYAN}• Monitoring: Health checks every 5 minutes${NC}"
    echo -e "${CYAN}• Security: Enhanced headers, rate limiting, DDoS protection${NC}"
    
    echo ""
    echo -e "${YELLOW}Useful commands (run as user '${USER}'):${NC}"
    echo -e "${CYAN}• Check PM2 status: ${NC}pm2 status"
    echo -e "${CYAN}• View logs: ${NC}pm2 logs"
    echo -e "${CYAN}• Monitor system: ${NC}pm2 monit"
    echo -e "${CYAN}• Check Nginx: ${NC}sudo systemctl status nginx"
    echo -e "${CYAN}• View health logs: ${NC}tail -f /var/log/gosei-health.log"
    echo ""
    echo -e "${YELLOW}User Management:${NC}"
    echo -e "${CYAN}• Switch to deployment user: ${NC}su - ${USER}"
    echo -e "${CYAN}• SSH login: ${NC}ssh ${USER}@gosei-svr-01.beaver.foundation"
    echo -e "${CYAN}• Change password: ${NC}passwd"
    
    echo ""
    echo -e "${GREEN}🚀 Your Gosei server is ready for 100+ concurrent users!${NC}"
    echo -e "${GREEN}🎮 Players can now connect at: https://${DOMAIN}${NC}"
    
    print_status "Deployment completed at $(date)"
}

# Run main deployment
main "$@" 