Write-Host "KataGo CPU Setup for Windows Development" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

# Check if we have required tools
if (!(Get-Command curl -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: curl is required but not found." -ForegroundColor Red
    Write-Host "Please install curl or use Windows 10/11 with curl built-in." -ForegroundColor Yellow
    exit 1
}

# Create katago directory if it doesn't exist
$katagoDir = "katago"
if (!(Test-Path $katagoDir)) {
    New-Item -ItemType Directory -Path $katagoDir | Out-Null
}

Write-Host ""
Write-Host "Downloading KataGo Windows CPU executable..." -ForegroundColor Yellow
Write-Host "This will download the latest KataGo v1.16.2 CPU build for Windows" -ForegroundColor Gray
Write-Host ""

# Download the latest KataGo CPU version for Windows (Eigen backend)
$downloadUrl = "https://github.com/lightvector/KataGo/releases/download/v1.16.2/katago-v1.16.2-eigen-windows-x64.zip"
$zipPath = Join-Path $katagoDir "katago-v1.16.2-eigen-windows-x64.zip"

try {
    curl -L -o $zipPath $downloadUrl
    if ($LASTEXITCODE -ne 0) {
        throw "Download failed"
    }
    Write-Host "✅ Downloaded KataGo executable" -ForegroundColor Green
} catch {
    Write-Host "❌ ERROR: Failed to download KataGo executable" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Extracting KataGo executable..." -ForegroundColor Yellow

# Extract the zip file
$extractPath = Join-Path $katagoDir "extracted"
try {
    Expand-Archive -Path $zipPath -DestinationPath $extractPath -Force
    Write-Host "✅ Extracted KataGo files" -ForegroundColor Green
} catch {
    Write-Host "❌ ERROR: Failed to extract KataGo executable" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    exit 1
}

# Move the executable to the katago folder
$executablePath = Join-Path $extractPath "katago.exe"
$targetPath = Join-Path $katagoDir "katago.exe"

if (Test-Path $executablePath) {
    Move-Item $executablePath $targetPath -Force
    Write-Host "✅ KataGo executable installed: server/katago/katago.exe" -ForegroundColor Green
} else {
    Write-Host "❌ ERROR: katago.exe not found in extracted files" -ForegroundColor Red
    Get-ChildItem $extractPath
    exit 1
}

# Clean up
Remove-Item $extractPath -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item $zipPath -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Downloading neural network model..." -ForegroundColor Yellow
Write-Host "This will download the b6c96 model (~8MB) optimized for 9x9 boards" -ForegroundColor Gray

$modelUrl = "https://media.katagotraining.org/uploaded/networks/models/kata1/b6c96-s1802764800-d629989359.bin.gz"
$modelPath = Join-Path $katagoDir "b6c96-s1802764800-d629989359.bin.gz"

try {
    curl -L -o $modelPath $modelUrl
    if ($LASTEXITCODE -ne 0) {
        throw "Model download failed"
    }
    Write-Host "✅ Downloaded neural network model" -ForegroundColor Green
} catch {
    Write-Host "❌ ERROR: Failed to download neural network model" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Creating Windows-specific KataGo configuration..." -ForegroundColor Yellow

# Create logs directory
$logsDir = Join-Path $katagoDir "logs"
if (!(Test-Path $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir | Out-Null
}

# Create a Windows-compatible config file
$configPath = Join-Path $katagoDir "gtp_dev.cfg"
$logPath = Join-Path $logsDir "gtp.log"

$config = @"
# KataGo GTP Config for Windows Development
# Generated automatically for local testing

logFile = $($logPath -replace '\\', '/')
logAllGTPCommunication = true
logSearchInfo = true
logTimeStamp = true

# Engine settings optimized for 9x9 development
numSearchThreads = 2
maxVisits = 100
maxPlayouts = 100
maxTime = 3.0

# Rules
rules = tromp-taylor

# Search settings for development
cpuctExploration = 1.0
fpuReductionMax = 0.2
rootFpuReductionMax = 0.2

# Analysis settings
reportAnalysisWinratesAs = SIDETOMOVE
analysisPVLen = 5

# Memory settings for development machine
nnCacheSizePowerOfTwo = 16
nnMutexPoolSizePowerOfTwo = 12

# Resign settings
allowResignation = true
resignThreshold = -0.95
resignConsecTurns = 3
"@

Set-Content -Path $configPath -Value $config -Encoding UTF8
Write-Host "✅ Created KataGo configuration file" -ForegroundColor Green

Write-Host ""
Write-Host "Testing KataGo installation..." -ForegroundColor Yellow

# Test the installation
try {
    $version = & $targetPath version
    Write-Host "✅ KataGo version: $version" -ForegroundColor Green
} catch {
    Write-Host "❌ ERROR: KataGo executable test failed" -ForegroundColor Red
    Write-Host "Please check if you have Visual C++ Redistributable installed" -ForegroundColor Yellow
    Write-Host "Download from: https://aka.ms/vs/17/release/vc_redist.x64.exe" -ForegroundColor Cyan
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "KataGo CPU Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Installation Summary:" -ForegroundColor Cyan
Write-Host "- KataGo executable: server/katago/katago.exe" -ForegroundColor White
Write-Host "- Neural network: server/katago/b6c96-s1802764800-d629989359.bin.gz" -ForegroundColor White
Write-Host "- Config file: server/katago/gtp_dev.cfg" -ForegroundColor White
Write-Host "- Logs directory: server/katago/logs/" -ForegroundColor White
Write-Host ""
Write-Host "To add KataGo to your PATH:" -ForegroundColor Cyan
Write-Host "1. Copy the full path: $(Resolve-Path $katagoDir)" -ForegroundColor Yellow
Write-Host "2. Add to System Environment Variables" -ForegroundColor Yellow
Write-Host "3. Or use full path: $(Resolve-Path $targetPath)" -ForegroundColor Yellow
Write-Host ""
Write-Host "Test command:" -ForegroundColor Cyan
Write-Host "  server\katago\katago.exe benchmark -model server\katago\b6c96-s1802764800-d629989359.bin.gz -config server\katago\gtp_dev.cfg" -ForegroundColor Yellow
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Test the server: npm run dev (from project root)" -ForegroundColor Yellow
Write-Host "2. Start client: npm start (from project root)" -ForegroundColor Yellow
Write-Host "3. Create AI game from the homepage" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press any key to continue..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") 