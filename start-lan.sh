#!/bin/bash
echo "Starting Gosei Play for LAN Access..."
echo "This allows other computers on your network to connect to the game."
echo

# Get the local IP address
if command -v hostname >/dev/null 2>&1 && command -v grep >/dev/null 2>&1; then
    # Try hostname command first
    LOCAL_IP=$(hostname -I | cut -d' ' -f1 2>/dev/null)
    if [ -z "$LOCAL_IP" ]; then
        # Fallback to ifconfig
        LOCAL_IP=$(ifconfig | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | head -1)
    fi
else
    LOCAL_IP="[Unable to determine IP]"
fi

# Start the socket server for LAN access
echo "Starting socket server for LAN access..."
cd server && npm install && npm start &
SERVER_PID=$!

# Give the server time to start
echo "Waiting for server to start..."
sleep 5

# Return to root and start React app for LAN access
cd ..
echo "Starting React app for LAN access..."
HOST=0.0.0.0 npm start &
CLIENT_PID=$!

echo
echo "========================================"
echo "  Network Access Information"
echo "========================================"
echo
echo "Server running on: http://$LOCAL_IP:3001"
echo "Client running on: http://$LOCAL_IP:3000"
echo
echo "Other computers on your network can access the game at:"
echo "  http://$LOCAL_IP:3000"
echo
echo "Make sure your firewall allows connections on ports 3000 and 3001"
echo
echo "If you encounter any issues:"
echo "1. Check firewall settings"
echo "2. Ensure both computers are on the same network"
echo "3. Try temporarily disabling firewall"
echo
echo "Press Ctrl+C to stop both processes"

# Wait for Ctrl+C
trap "kill $SERVER_PID $CLIENT_PID; exit" INT
wait 