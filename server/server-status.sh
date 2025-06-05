#!/bin/bash

# Quick Server Status Check
echo "🎮 Gosei Play Server Status"
echo "============================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# Check if PM2 processes are running
echo "📊 PM2 Processes:"
pm2 list

echo ""
echo "🔍 Process Details:"
if pm2 list | grep -q "gosei-play-server.*online"; then
    echo -e "  • Status: ${GREEN}✅ Running${NC}"
    
    # Get process info
    PID=$(pm2 list | grep gosei-play-server | awk '{print $6}')
    UPTIME=$(pm2 list | grep gosei-play-server | awk '{print $7}')
    CPU=$(pm2 list | grep gosei-play-server | awk '{print $10}')
    MEM=$(pm2 list | grep gosei-play-server | awk '{print $11}')
    
    echo "  • PID: $PID"
    echo "  • Uptime: $UPTIME"
    echo "  • CPU: $CPU"
    echo "  • Memory: $MEM"
    
else
    echo -e "  • Status: ${RED}❌ Not Running${NC}"
fi

echo ""
echo "🌐 Network Status:"
if netstat -tlnp 2>/dev/null | grep -q ":3001"; then
    echo -e "  • Port 3001: ${GREEN}✅ Open${NC}"
else
    echo -e "  • Port 3001: ${RED}❌ Not listening${NC}"
fi

echo ""
echo "🔧 Services:"
# Check Redis
if redis-cli ping >/dev/null 2>&1; then
    echo -e "  • Redis: ${GREEN}✅ Running${NC}"
else
    echo -e "  • Redis: ${RED}❌ Not running${NC}"
fi

# Check if we're the gosei user
if [ "$USER" = "gosei" ]; then
    echo ""
    echo "💡 Quick Commands:"
    echo "  • View logs: pm2 logs"
    echo "  • Restart: pm2 restart gosei-play-server" 
    echo "  • Monitor: pm2 monit"
    echo "  • Fix & start: ./fix-and-start.sh"
fi 