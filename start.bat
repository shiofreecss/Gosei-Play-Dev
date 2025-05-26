@echo off
echo Starting Gosei Play...

:: Check if the server is already running
netstat -ano | findstr ":3001" | findstr "LISTENING" > nul
if %ERRORLEVEL% EQU 0 (
    echo Socket server is already running on port 3001
) else (
    :: Start the socket server
    echo Starting socket server...
    start cmd /k "cd server && npm install && npm start"
    
    :: Give the server time to start
    echo Waiting for server to start...
    timeout /t 5 /nobreak > nul
)

:: Start the React app
echo Starting React app...
start cmd /k "npm start"

echo Gosei Play started!
echo Server running on http://localhost:3001
echo Client running on http://localhost:3000
echo.
echo If you encounter any issues with game creation:
echo 1. Make sure the socket server is running
echo 2. Check browser console for errors
echo 3. Run check-server.bat to verify server status 