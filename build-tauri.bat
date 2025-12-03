@echo off
echo ====================================
echo RAVR - Tauri Windows Build Script
echo ====================================
echo.

REM Check if Rust is installed
where rustc >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Rust neni nainstalovany!
    echo.
    echo Prosim nainstaluj Rust z: https://rustup.rs/
    echo.
    echo Po instalaci restartuj terminal a spust tento skript znovu.
    echo.
    pause
    exit /b 1
)

echo [OK] Rust je nainstalovany
rustc --version
echo.

REM Change to project directory
cd /d "%~dp0"

echo [INFO] Spoustim Tauri build...
echo.

call npm run tauri:build

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ====================================
    echo [SUCCESS] Build dokoncen!
    echo ====================================
    echo.
    echo Instalacka je v:
    echo %~dp0src-tauri\target\release\bundle\nsis\
    echo.
) else (
    echo.
    echo [ERROR] Build selhal!
    echo.
)

pause
