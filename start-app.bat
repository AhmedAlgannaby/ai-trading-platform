@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required. Install the LTS version from https://nodejs.org/ and try again.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Installing app dependencies...
  call npm.cmd install
  if errorlevel 1 goto failed
)

echo Building the app...
call npm.cmd run build
if errorlevel 1 goto failed

echo Starting the app server...
start "AI Trading App Server" /D "%~dp0" cmd /k "npm.cmd start"

echo Waiting for the app server...
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$deadline = (Get-Date).AddSeconds(30); do { try { $response = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:3001/api/health' -TimeoutSec 2; if ($response.StatusCode -eq 200) { Start-Process 'http://localhost:3001'; exit 0 } } catch {}; Start-Sleep -Seconds 1 } while ((Get-Date) -lt $deadline); Write-Error 'The app server did not start. Check the AI Trading App Server window.'; exit 1"
if errorlevel 1 (
  echo Could not open the app. Check the server window for errors.
  pause
  exit /b 1
)
exit /b 0

:failed
echo App setup or build failed. Check the error above.
pause
exit /b 1
