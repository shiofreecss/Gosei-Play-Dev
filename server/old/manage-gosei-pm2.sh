#!/bin/bash

# Gosei Server PM2 Management Script
# Provides easy management of Gosei server PM2 processes

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
    echo -e "${CYAN}============================================${NC}"
    echo -e "${CYAN} $1${NC}"
    echo -e "${CYAN}============================================${NC}"
}

# Configuration
APP_DIR="/var/www/gosei"
SERVER_DIR="${APP_DIR}/server"

show_help() {
    echo "Gosei Server PM2 Management Script"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  status    - Show current PM2 process status"
    echo "  start     - Start Gosei server processes"
    echo "  stop      - Stop Gosei server processes"
    echo "  restart   - Restart Gosei server processes"
    echo "  reload    - Reload processes (zero downtime)"
    echo "  delete    - Delete all Gosei processes"
    echo "  logs      - Show live logs"
    echo "  monit     - Launch PM2 monitoring dashboard"
    echo "  clean     - Clean up old logs"
    echo "  help      - Show this help message"
}

check_pm2() {
    if ! command -v pm2 &> /dev/null; then
        print_error "PM2 is not installed or not in PATH"
        exit 1
    fi
}

check_server_dir() {
    if [ ! -d "$SERVER_DIR" ]; then
        print_error "Server directory not found: $SERVER_DIR"
        print_status "Make sure Gosei server is deployed first"
        exit 1
    fi
    
    if [ ! -f "$SERVER_DIR/server.js" ]; then
        print_error "server.js not found in $SERVER_DIR"
        exit 1
    fi
}

show_status() {
    print_header "📊 CURRENT PM2 STATUS"
    pm2 status
    
    echo ""
    print_status "Gosei-specific processes:"
    pm2 list | grep gosei || print_warning "No Gosei processes found"
}

start_processes() {
    print_header "🚀 STARTING GOSEI PROCESSES"
    
    check_server_dir
    cd "$SERVER_DIR"
    
    # Check if processes already exist
    if pm2 list | grep -q "gosei-server"; then
        print_warning "Gosei processes already exist!"
        show_status
        echo ""
        read -p "Force restart existing processes? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            restart_processes
            return
        else
            print_status "Use 'restart' or 'delete' commands to manage existing processes"
            return
        fi
    fi
    
    print_status "Creating PM2 log directory..."
    sudo mkdir -p /var/log/pm2
    sudo chown -R $(whoami):$(whoami) /var/log/pm2
    
    print_status "Starting main cluster (2 instances on port 3001)..."
    NODE_ENV=production PORT=3001 pm2 start server.js \
        --name gosei-server-cluster \
        --instances 2 \
        -e /var/log/pm2/gosei-error.log \
        -o /var/log/pm2/gosei-out.log
    
    print_status "Starting backup server (1 instance on port 3002)..."
    NODE_ENV=production PORT=3002 pm2 start server.js \
        --name gosei-server-backup \
        --instances 1 \
        -e /var/log/pm2/gosei-backup-error.log \
        -o /var/log/pm2/gosei-backup-out.log
    
    print_status "Saving PM2 configuration..."
    pm2 save
    
    print_success "Gosei processes started successfully!"
    show_status
}

stop_processes() {
    print_header "⏹️ STOPPING GOSEI PROCESSES"
    
    pm2 stop gosei-server-cluster 2>/dev/null || print_warning "gosei-server-cluster not found"
    pm2 stop gosei-server-backup 2>/dev/null || print_warning "gosei-server-backup not found"
    
    print_success "Gosei processes stopped"
    show_status
}

restart_processes() {
    print_header "🔄 RESTARTING GOSEI PROCESSES"
    
    pm2 restart gosei-server-cluster 2>/dev/null || print_warning "gosei-server-cluster not found"
    pm2 restart gosei-server-backup 2>/dev/null || print_warning "gosei-server-backup not found"
    
    print_success "Gosei processes restarted"
    show_status
}

reload_processes() {
    print_header "🔄 RELOADING GOSEI PROCESSES (ZERO DOWNTIME)"
    
    pm2 reload gosei-server-cluster 2>/dev/null || print_warning "gosei-server-cluster not found"
    pm2 reload gosei-server-backup 2>/dev/null || print_warning "gosei-server-backup not found"
    
    print_success "Gosei processes reloaded with zero downtime"
    show_status
}

delete_processes() {
    print_header "🗑️ DELETING GOSEI PROCESSES"
    
    print_warning "This will completely remove all Gosei PM2 processes!"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        pm2 delete gosei-server-cluster 2>/dev/null || print_warning "gosei-server-cluster not found"
        pm2 delete gosei-server-backup 2>/dev/null || print_warning "gosei-server-backup not found"
        pm2 save
        
        print_success "Gosei processes deleted"
        show_status
    else
        print_status "Deletion cancelled"
    fi
}

show_logs() {
    print_header "📝 LIVE LOGS"
    
    if pm2 list | grep -q "gosei-server"; then
        print_status "Showing live logs for all Gosei processes..."
        print_status "Press Ctrl+C to exit"
        pm2 logs --grep gosei
    else
        print_warning "No Gosei processes found"
        print_status "Start the server first with: $0 start"
    fi
}

show_monitoring() {
    print_header "📊 PM2 MONITORING DASHBOARD"
    
    print_status "Launching PM2 monitoring dashboard..."
    print_status "Press Ctrl+C to exit"
    pm2 monit
}

clean_logs() {
    print_header "🧹 CLEANING PM2 LOGS"
    
    print_status "Flushing PM2 logs..."
    pm2 flush
    
    # Clean old log files
    if [ -d "/var/log/pm2" ]; then
        print_status "Cleaning old log files..."
        find /var/log/pm2 -name "*.log" -mtime +7 -delete 2>/dev/null || true
        print_success "Old log files cleaned"
    fi
    
    print_success "Log cleanup completed"
}

# Main script logic
case "${1:-help}" in
    status)
        check_pm2
        show_status
        ;;
    start)
        check_pm2
        start_processes
        ;;
    stop)
        check_pm2
        stop_processes
        ;;
    restart)
        check_pm2
        restart_processes
        ;;
    reload)
        check_pm2
        reload_processes
        ;;
    delete)
        check_pm2
        delete_processes
        ;;
    logs)
        check_pm2
        show_logs
        ;;
    monit)
        check_pm2
        show_monitoring
        ;;
    clean)
        check_pm2
        clean_logs
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac 