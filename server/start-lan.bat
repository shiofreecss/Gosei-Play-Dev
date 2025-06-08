@echo off
echo Starting Gosei Play for LAN Access...
echo This allows other computers on your network to connect to the game.
echo.

:: Get the local IP address
for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /C:"IPv4 Address"') do (
    set LOCAL_IP=%%i
    goto :found_ip
)
:found_ip
:: Clean up the IP (remove spaces)
set LOCAL_IP=%LOCAL_IP: =%

:: Check if the server is already running
netstat -ano | findstr ":3001" | findstr "LISTENING" > nul
if %ERRORLEVEL% EQU 0 (
    echo Socket server is already running on port 3001
) else (
    :: Start the socket server for LAN access
    echo Starting socket server for LAN access...
    start cmd /k "cd server && npm install && npm start"
    
    :: Give the server time to start
    echo Waiting for server to start...
    timeout /t 5 /nobreak > nul
)

:: Start the React app for LAN access
echo Starting React app for LAN access...
start cmd /k "npm run start:lan"

echo Gosei Play started for LAN access!
echo.
echo ========================================
echo   Network Access Information
echo ========================================
echo.
echo Server running on: http://%LOCAL_IP%:3001
echo Client running on: http://%LOCAL_IP%:3000
echo.
echo Other computers on your network can access the game at:
echo   http://%LOCAL_IP%:3000
echo.
echo Make sure your Windows Firewall allows connections on ports 3000 and 3001
echo.
echo If you encounter any issues:
echo 1. Check Windows Firewall settings
echo 2. Ensure both computers are on the same network
echo 3. Try disabling antivirus temporarily
echo 4. Run check-server.bat to verify server status
echo.
pause 