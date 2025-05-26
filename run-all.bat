@echo off
echo ======================================
echo Gosei Play - Startup Utility
echo ======================================
echo.

:: First, install all dependencies in the main project
echo Installing main app dependencies...
call npm install

:: Check if socket.io-client is installed (should be in node_modules)
if exist "node_modules\socket.io-client" (
    echo socket.io-client is installed
) else (
    echo socket.io-client not found, installing...
    call npm install socket.io-client
)

:: Install and check server dependencies
echo.
echo Checking server setup...

if exist "server" (
    cd server
    
    echo Installing server dependencies...
    call npm install
    
    :: Check if socket.io is installed (should be in node_modules)
    if exist "node_modules\socket.io" (
        echo socket.io is installed on server
    ) else (
        echo socket.io not found on server, installing...
        call npm install socket.io
    )
    
    cd ..
) else (
    echo Server directory not found. Please check your project structure.
    pause
    exit /b
)

:: Check if the server is already running
echo.
echo Checking if server is already running...
netstat -ano | findstr ":3001" | findstr "LISTENING" > nul
if %ERRORLEVEL% EQU 0 (
    echo Socket server is already running on port 3001
) else (
    :: Start the socket server
    echo Starting socket server...
    start cmd /k "cd server && npm start"
    
    :: Give the server time to start
    echo Waiting for server to start...
    timeout /t 5 /nobreak > nul
)

:: Start the React app
echo.
echo Starting React app...
start cmd /k "npm start"

echo.
echo ======================================
echo Gosei Play started!
echo.
echo Server running on http://localhost:3001
echo Client running on http://localhost:3000
echo.
echo If you encounter any issues with game creation:
echo 1. Make sure the socket server is running
echo 2. Check browser console for errors 
echo 3. Try refreshing the page
echo ======================================
echo.
pause 