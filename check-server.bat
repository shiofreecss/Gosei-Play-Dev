@echo off
echo Checking socket server status...

:: Check if the server is running on port 3001
netstat -ano | findstr ":3001" | findstr "LISTENING"

if %ERRORLEVEL% EQU 0 (
    echo Socket server is running on port 3001
) else (
    echo Socket server is NOT running on port 3001
    echo Starting the server...
    
    :: Check if server directory exists
    if exist "server" (
        cd server
        
        :: Check if node_modules exists, if not run npm install
        if not exist "node_modules" (
            echo Installing server dependencies...
            npm install
        )
        
        :: Start the server
        echo Starting socket server...
        start cmd /k "npm start"
        
        cd ..
        echo Server started successfully!
    ) else (
        echo Server directory not found. Please check your project structure.
    )
)

echo.
echo Use this command to start the full application:
echo start.bat
echo.
pause 