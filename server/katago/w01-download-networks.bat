@echo off
setlocal enabledelayedexpansion

REM KataGo Network Download Script for Windows
REM Downloads networks organized by Elo rating ranges

echo === KataGo Network Download Script ===
echo Downloading networks organized by Elo ranges...

REM Create directories if they don't exist
if not exist "networks\beginner" mkdir "networks\beginner"
if not exist "networks\normal" mkdir "networks\normal"
if not exist "networks\dan" mkdir "networks\dan"
if not exist "networks\pro" mkdir "networks\pro"

REM Base URL for KataGo networks
set BASE_URL=https://media.katagotraining.org/uploaded/networks/models/kata1

echo.
echo === BEGINNER LEVEL (1000-1500 Elo) ===
call :download_network "kata1-b6c96-s1995008-d1329786.txt.gz" "beginner" "1071.5" "8k-7k level"

echo.
echo === NORMAL LEVEL (1500-1900 Elo) ===
call :download_network "kata1-b6c96-s4136960-d1510003.txt.gz" "normal" "1539.5" "6k-5k level"
call :download_network "kata1-b6c96-s5214720-d1690538.txt.gz" "normal" "1611.3" "5k-4k level"
call :download_network "kata1-b6c96-s6127360-d1754797.txt.gz" "normal" "1711.0" "4k-3k level"
call :download_network "kata1-b6c96-s8080640-d1961030.txt.gz" "normal" "1862.5" "2k-1k level"

echo.
echo === DAN LEVEL (1941-2400 Elo) ===
call :download_network "kata1-b6c96-s8982784-d2082583.txt.gz" "dan" "1941.4" "1d level"
call :download_network "kata1-b6c96-s10014464-d2201128.txt.gz" "dan" "2113.0" "2d level"
call :download_network "kata1-b6c96-s10825472-d2300510.txt.gz" "dan" "2293.5" "3d level"
call :download_network "kata1-b6c96-s11888896-d2416753.txt.gz" "dan" "2398.4" "4d level"

echo.
echo === PRO LEVEL (2545-3050 Elo) ===
call :download_network "kata1-b6c96-s12849664-d2510774.txt.gz" "pro" "2545.2" "5d level"
call :download_network "kata1-b6c96-s13733120-d2631546.txt.gz" "pro" "2849.0" "6d+ level"
call :download_network "kata1-b6c96-s175395328-d26788732.txt.gz" "pro" "3050.2" "Professional level"

echo.
echo === DOWNLOAD COMPLETE ===
echo Networks organized by Elo ranges:
echo - beginner\  : 1000-1500 Elo (8k-7k)
echo - normal\    : 1500-1900 Elo (6k-1k)
echo - dan\       : 1941-2400 Elo (1d-4d)
echo - pro\       : 2545-3050 Elo (5d+)
echo.
echo All networks are CPU-friendly b6c96 series
echo Use appropriate network based on player strength!

pause
goto :eof

:download_network
set filename=%~1
set directory=%~2
set elo=%~3
set level_desc=%~4

if not exist "networks\%directory%\%filename%" (
    echo Downloading %level_desc% ^(%elo% Elo^): %filename%
    curl -s -L "%BASE_URL%/%filename%" -o "networks\%directory%\%filename%"
    if !errorlevel! equ 0 (
        echo ✓ Downloaded: %filename%
        REM Create metadata file
        set meta_filename=%filename:.txt.gz=.meta.json%
        (
            echo {
            echo   "filename": "%filename%",
            echo   "elo": %elo%,
            echo   "level": "%level_desc%",
            echo   "directory": "%directory%",
            echo   "cpu_friendly": true
            echo }
        ) > "networks\%directory%\!meta_filename!"
    ) else (
        echo ✗ Failed to download: %filename%
    )
) else (
    echo ✓ Already exists: %filename%
)
goto :eof 