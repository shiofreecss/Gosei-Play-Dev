@echo off
echo === KataGo Network Extraction Tool ===
echo.
echo This will extract all .txt.gz files to .txt files for KataGo usage
echo Organized by Elo ranges: Beginner (1000-1500), Normal (1500-1900), Dan (1941-2400), Pro (2545-3050)
echo.

echo 🔧 Extracting BEGINNER networks (1000-1500 Elo)...
cd networks\beginner
for %%f in (*.txt.gz) do (
    echo   Extracting %%f...
    powershell -Command "Add-Type -AssemblyName System.IO.Compression; $gz = [System.IO.File]::OpenRead('%%f'); $gzip = New-Object System.IO.Compression.GzipStream($gz, [System.IO.Compression.CompressionMode]::Decompress); $output = [System.IO.File]::Create('%%~nf'); $gzip.CopyTo($output); $output.Close(); $gzip.Close(); $gz.Close()" 2>nul
    if exist "%%~nf" (
        echo   ✓ Created %%~nf
        echo   🗑️ Removing %%f...
        del "%%f"
        echo   ✓ Cleaned up %%f
    ) else (
        echo   ✗ Failed to extract %%f
    )
)
cd ..\..

echo.
echo 🔧 Extracting NORMAL networks (1500-1900 Elo)...
cd networks\normal
for %%f in (*.txt.gz) do (
    echo   Extracting %%f...
    powershell -Command "Add-Type -AssemblyName System.IO.Compression; $gz = [System.IO.File]::OpenRead('%%f'); $gzip = New-Object System.IO.Compression.GzipStream($gz, [System.IO.Compression.CompressionMode]::Decompress); $output = [System.IO.File]::Create('%%~nf'); $gzip.CopyTo($output); $output.Close(); $gzip.Close(); $gz.Close()" 2>nul
    if exist "%%~nf" (
        echo   ✓ Created %%~nf
        echo   🗑️ Removing %%f...
        del "%%f"
        echo   ✓ Cleaned up %%f
    ) else (
        echo   ✗ Failed to extract %%f
    )
)
cd ..\..

echo.
echo 🔧 Extracting DAN networks (1941-2400 Elo)...
cd networks\dan
for %%f in (*.txt.gz) do (
    echo   Extracting %%f...
    powershell -Command "Add-Type -AssemblyName System.IO.Compression; $gz = [System.IO.File]::OpenRead('%%f'); $gzip = New-Object System.IO.Compression.GzipStream($gz, [System.IO.Compression.CompressionMode]::Decompress); $output = [System.IO.File]::Create('%%~nf'); $gzip.CopyTo($output); $output.Close(); $gzip.Close(); $gz.Close()" 2>nul
    if exist "%%~nf" (
        echo   ✓ Created %%~nf
        echo   🗑️ Removing %%f...
        del "%%f"
        echo   ✓ Cleaned up %%f
    ) else (
        echo   ✗ Failed to extract %%f
    )
)
cd ..\..

echo.
echo 🔧 Extracting PRO networks (2545-3050 Elo)...
cd networks\pro
for %%f in (*.txt.gz) do (
    echo   Extracting %%f...
    powershell -Command "Add-Type -AssemblyName System.IO.Compression; $gz = [System.IO.File]::OpenRead('%%f'); $gzip = New-Object System.IO.Compression.GzipStream($gz, [System.IO.Compression.CompressionMode]::Decompress); $output = [System.IO.File]::Create('%%~nf'); $gzip.CopyTo($output); $output.Close(); $gzip.Close(); $gz.Close()" 2>nul
    if exist "%%~nf" (
        echo   ✓ Created %%~nf
        echo   🗑️ Removing %%f...
        del "%%f"
        echo   ✓ Cleaned up %%f
    ) else (
        echo   ✗ Failed to extract %%f
    )
)
cd ..\..

echo.
echo === EXTRACTION SUMMARY ===
echo.

set /a total=0
for /r networks %%f in (*.txt) do (
    set /a total+=1
)

echo 📊 Total extracted networks: %total%
echo ✅ All networks ready for KataGo!
echo.
echo 📁 Network organization by Elo ranges:
echo    • beginner\  : 1000-1500 Elo (8k-7k players)
echo    • normal\    : 1500-1900 Elo (6k-1k players)  
echo    • dan\       : 1941-2400 Elo (1d-4d players)
echo    • pro\       : 2545-3050 Elo (5d+ players)
echo.
echo 💡 KataGo will now use the extracted .txt files
echo 🗑️ All .txt.gz files have been automatically removed to save space
echo.

pause 