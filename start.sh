#!/bin/bash
echo "Starting Gosei Play..."

# Start the socket server
cd server && npm install && npm start &
SERVER_PID=$!

# Return to root and start React app
cd ..
npm start &
CLIENT_PID=$!

echo "Gosei Play started!"
echo "Server running on http://localhost:3001"
echo "Client running on http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop both processes"

# Wait for Ctrl+C
trap "kill $SERVER_PID $CLIENT_PID; exit" INT
wait 