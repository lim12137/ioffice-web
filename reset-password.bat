@echo off
chcp 65001 >nul

:: ========================================
:: AionUi Reset Admin Password Script
:: ========================================

echo.
echo ========================================
echo    AionUi Reset Admin Password
echo ========================================
echo.

cd /d "%~dp0"

echo Resetting admin password...
echo.
echo After reset, a new random password will be generated
echo Please copy the new password from terminal output
echo.
echo ========================================
echo.

npm run webui -- --resetpass

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Password reset failed, error code: %errorlevel%
    pause
)
