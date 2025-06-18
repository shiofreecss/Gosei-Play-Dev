@echo off
echo KataGo CPU Setup for Windows Development
echo ========================================

:: Check if we have curl and PowerShell for downloads
where curl >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: curl is required but not found. Please install curl or use PowerShell version.
    echo.
    echo Alternative: Run this script with PowerShell instead of cmd.exe
    pause
    exit /b 1
)

:: Create katago directory in server folder if it doesn't exist
if not exist "katago" mkdir katago

echo.
echo Downloading KataGo Windows CPU executable...
echo This will download the latest KataGo v1.16.2 CPU build for Windows
echo.

:: Download the latest KataGo CPU version for Windows (Eigen backend)
curl -L -o "katago/katago-v1.16.2-eigen-windows-x64.zip" "https://github.com/lightvector/KataGo/releases/download/v1.16.2/katago-v1.16.2-eigen-windows-x64.zip"

if %errorlevel% neq 0 (
    echo ERROR: Failed to download KataGo executable
    pause
    exit /b 1
)

echo.
echo Extracting KataGo executable...

:: Extract using PowerShell since Windows doesn't have unzip by default
powershell -command "Expand-Archive -Path 'katago/katago-v1.16.2-eigen-windows-x64.zip' -DestinationPath 'katago/extracted' -Force"

if %errorlevel% neq 0 (
    echo ERROR: Failed to extract KataGo executable
    pause
    exit /b 1
)

:: Move the executable to the katago folder
if exist "katago/extracted/katago.exe" (
    move "katago/extracted/katago.exe" "katago/katago.exe"
    echo KataGo executable installed: server/katago/katago.exe
) else (
    echo ERROR: katago.exe not found in extracted files
    dir katago\extracted
    pause
    exit /b 1
)

:: Clean up
rmdir /s /q "katago/extracted" 2>nul
del "katago/katago-v1.16.2-eigen-windows-x64.zip" 2>nul

echo.
echo Downloading neural network model...
echo This will download the b6c96 model (~8MB) optimized for 9x9 boards

curl -L -o "katago/b6c96-s1802764800-d629989359.bin.gz" "https://media.katagotraining.org/uploaded/networks/models/kata1/b6c96-s1802764800-d629989359.bin.gz"

if %errorlevel% neq 0 (
    echo ERROR: Failed to download neural network model
    pause
    exit /b 1
)

echo.
echo Creating Windows-specific KataGo configuration...

:: Create a Windows-compatible config file
(
echo # KataGo GTP Config for Windows Development
echo # Generated automatically for local testing
echo.
echo logFile = katago\logs\gtp.log
echo logAllGTPCommunication = true
echo logSearchInfo = true
echo logTimeStamp = true
echo.
echo # Engine settings optimized for 9x9 development
echo numSearchThreads = 2
echo maxVisits = 100
echo maxPlayouts = 100
echo maxTime = 3.0
echo.
echo # Rules
echo rules = tromp-taylor
echo.
echo # Search settings for development
echo cpuctExploration = 1.0
echo fpuReductionMax = 0.2
echo rootFpuReductionMax = 0.2
echo.
echo # Analysis settings
echo reportAnalysisWinratesAs = SIDETOMOVE
echo analysisPVLen = 5
echo.
echo # Memory settings for development machine
echo nnCacheSizePowerOfTwo = 16
echo nnMutexPoolSizePowerOfTwo = 12
echo.
echo # Resign settings
echo allowResignation = true
echo resignThreshold = -0.95
echo resignConsecTurns = 3
) > "katago/gtp_dev.cfg"

echo.
echo Creating logs directory...
if not exist "katago/logs" mkdir "katago\logs"

echo.
echo Testing KataGo installation...
echo.

:: Test the installation
"katago/katago.exe" version

if %errorlevel% neq 0 (
    echo ERROR: KataGo executable test failed
    echo Please check if you have Visual C++ Redistributable installed
    echo Download from: https://aka.ms/vs/17/release/vc_redist.x64.exe
    pause
    exit /b 1
)

echo.
echo ========================================
echo KataGo CPU Setup Complete!
echo ========================================
echo.
echo Installation Summary:
echo - KataGo executable: server/katago/katago.exe
echo - Neural network: server/katago/b6c96-s1802764800-d629989359.bin.gz
echo - Config file: server/katago/gtp_dev.cfg
echo - Logs directory: server/katago/logs/
echo.
echo To add KataGo to your PATH:
echo 1. Copy the full path: %~dp0katago
echo 2. Add to System Environment Variables
echo 3. Or use full path: %~dp0katago\katago.exe
echo.
echo Test command:
echo   server\katago\katago.exe benchmark -model server\katago\b6c96-s1802764800-d629989359.bin.gz -config server\katago\gtp_dev.cfg
echo.
echo Next steps:
echo 1. Test the server: npm run dev (from project root)
echo 2. Start client: npm start (from project root)
echo 3. Create AI game from the homepage
echo.
pause 