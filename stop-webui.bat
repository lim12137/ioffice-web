@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: ========================================
:: AionUi WebUI Stop Script
:: ========================================

echo.
echo ========================================
echo    AionUi WebUI Stop Script
echo ========================================
echo.

set "PID_FOUND=0"

:: Find process using port 3000
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000 " ^| findstr "LISTENING"') do (
    set "PID=%%a"
    set "PID_FOUND=1"
    echo [INFO] Found running process PID: %%a
    echo [INFO] Stopping process...
    taskkill /F /PID %%a >nul 2>&1

    if !errorlevel! equ 0 (
        echo [OK] Process stopped successfully
    ) else (
        echo [ERROR] Failed to stop process
    )
)

if !PID_FOUND! equ 0 (
    echo [INFO] No running process found
)

echo.
echo ========================================
echo.
pause

endlocal
