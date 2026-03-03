@echo off
chcp 65001 >nul

:: ========================================
:: AionUi WebUI Start Script
:: ========================================

echo.
echo ========================================
echo    AionUi WebUI Start Script
echo ========================================
echo.

cd /d "%~dp0"

echo Starting AionUi WebUI...
echo Access URL: http://localhost:3000
echo Press Ctrl+C to stop service
echo.
echo ========================================
echo.

npm run webui

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Service start failed, error code: %errorlevel%
    pause
)
