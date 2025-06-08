#!/bin/bash

# Repository Structure Checker for Gosei Deployment
# Helps debug deployment issues related to directory structure

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${CYAN}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_header() {
    echo ""
    echo -e "${CYAN}════════════════════════════════════════════${NC}"
    echo -e "${CYAN} $1${NC}"
    echo -e "${CYAN}════════════════════════════════════════════${NC}"
}

# Configuration
REPO_URL="https://github.com/shiofreecss/DEV-Gosei-Play.git"
APP_DIR="/var/www/gosei"

print_header "🔍 REPOSITORY STRUCTURE CHECKER"

print_status "Repository URL: ${REPO_URL}"
print_status "Deployment Directory: ${APP_DIR}"

# Check if app directory exists
if [ ! -d "${APP_DIR}" ]; then
    print_warning "Application directory ${APP_DIR} does not exist"
    print_status "Creating directory..."
    sudo mkdir -p ${APP_DIR}
    sudo chown -R $(whoami):$(whoami) ${APP_DIR}
    print_success "Directory created"
fi

# Check if repository is cloned
if [ ! -d "${APP_DIR}/.git" ]; then
    print_warning "Repository not cloned yet"
    print_status "Cloning repository..."
    git clone ${REPO_URL} ${APP_DIR}
    print_success "Repository cloned"
else
    print_success "Repository already exists"
    print_status "Updating repository..."
    cd ${APP_DIR}
    git pull origin main
fi

print_header "📁 DIRECTORY STRUCTURE ANALYSIS"

print_status "Contents of ${APP_DIR}:"
ls -la ${APP_DIR}/

echo ""
print_status "Looking for server files..."

# Check for different server directory structures
if [ -d "${APP_DIR}/server" ]; then
    print_success "✅ Found /server directory"
    echo -e "${GREEN}Contents of /server:${NC}"
    ls -la ${APP_DIR}/server/
    
    if [ -f "${APP_DIR}/server/server.js" ]; then
        print_success "✅ Found server.js in /server"
    elif [ -f "${APP_DIR}/server/index.js" ]; then
        print_warning "⚠️ Found index.js instead of server.js in /server"
    elif [ -f "${APP_DIR}/server/app.js" ]; then
        print_warning "⚠️ Found app.js instead of server.js in /server"
    else
        print_error "❌ No main server file found in /server"
    fi
    
elif [ -d "${APP_DIR}/heroku-server" ]; then
    print_warning "⚠️ Found /heroku-server directory instead of /server"
    echo -e "${YELLOW}Contents of /heroku-server:${NC}"
    ls -la ${APP_DIR}/heroku-server/
    
    if [ -f "${APP_DIR}/heroku-server/server.js" ]; then
        print_success "✅ Found server.js in /heroku-server"
        print_status "Deployment script will create a symlink: /server -> /heroku-server"
    fi
    
elif [ -d "${APP_DIR}/src" ]; then
    print_warning "⚠️ Found /src directory"
    echo -e "${YELLOW}Contents of /src:${NC}"
    ls -la ${APP_DIR}/src/
    
elif [ -f "${APP_DIR}/server.js" ]; then
    print_warning "⚠️ Found server.js in root directory"
    print_status "Deployment script will use root directory"
    
else
    print_error "❌ No server directory or server.js found!"
    print_status "Available directories:"
    find ${APP_DIR} -type d -name "*server*" -o -name "*src*" -o -name "*app*" 2>/dev/null | head -10
fi

# Check for package.json
echo ""
print_status "Looking for package.json files..."

if [ -f "${APP_DIR}/package.json" ]; then
    print_success "✅ Found package.json in root"
fi

if [ -f "${APP_DIR}/server/package.json" ]; then
    print_success "✅ Found package.json in /server"
elif [ -f "${APP_DIR}/heroku-server/package.json" ]; then
    print_success "✅ Found package.json in /heroku-server"
else
    print_warning "⚠️ No package.json found in server directory"
fi

# Check for common Node.js files
echo ""
print_status "Checking for Node.js project files..."

check_file() {
    local file_path=$1
    local description=$2
    
    if [ -f "$file_path" ]; then
        print_success "✅ Found $description"
        return 0
    else
        print_warning "⚠️ Missing $description"
        return 1
    fi
}

# Check in multiple possible locations
for dir in "${APP_DIR}/server" "${APP_DIR}/heroku-server" "${APP_DIR}/src" "${APP_DIR}"; do
    if [ -d "$dir" ]; then
        echo -e "\n${CYAN}Checking $dir:${NC}"
        check_file "$dir/package.json" "package.json"
        check_file "$dir/server.js" "server.js"
        check_file "$dir/index.js" "index.js (alternative)"
        check_file "$dir/app.js" "app.js (alternative)"
        break
    fi
done

print_header "🔧 DEPLOYMENT RECOMMENDATIONS"

if [ -d "${APP_DIR}/server" ]; then
    print_success "✅ Repository structure is compatible with deployment script"
    echo -e "${GREEN}   → Use: ./deploy-gosei-production.sh${NC}"
    
elif [ -d "${APP_DIR}/heroku-server" ]; then
    print_warning "⚠️ Repository uses /heroku-server instead of /server"
    echo -e "${YELLOW}   → Deployment script will automatically handle this${NC}"
    echo -e "${YELLOW}   → Use: ./deploy-gosei-production.sh${NC}"
    
elif [ -f "${APP_DIR}/server.js" ]; then
    print_warning "⚠️ Server files are in root directory"
    echo -e "${YELLOW}   → Deployment script will automatically handle this${NC}"
    echo -e "${YELLOW}   → Use: ./deploy-gosei-production.sh${NC}"
    
else
    print_error "❌ Repository structure needs manual configuration"
    echo -e "${RED}   → Check repository structure manually${NC}"
    echo -e "${RED}   → Ensure server.js exists in the correct location${NC}"
fi

print_header "📋 MANUAL VERIFICATION COMMANDS"

echo -e "${CYAN}To verify manually, run these commands:${NC}"
echo -e "cd ${APP_DIR}"
echo -e "find . -name '*.js' -type f | head -10"
echo -e "find . -name 'package.json' -type f"
echo -e "find . -name 'server.js' -type f"

echo ""
print_success "Repository structure check completed!" 