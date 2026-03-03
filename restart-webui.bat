@echo off

echo ========================================
echo    Stop and Restart AionUi
echo ========================================
echo.

echo Step 1: Killing Node processes...
taskkill /F /IM node.exe >nul 2>&1

echo Step 2: Waiting 2 seconds...
timeout /t 2 /nobreak >nul

echo Step 3: Starting WebUI...
echo.
echo Access: http://localhost:3000
echo.
echo Starting...
cd /d "%~dp0"
npm run webui
