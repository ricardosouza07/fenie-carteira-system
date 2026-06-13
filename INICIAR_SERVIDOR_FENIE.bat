@echo off
chcp 65001 >nul
setlocal

set "PROJECT_DIR=%~dp0"
cd /d "%PROJECT_DIR%"
if errorlevel 1 (
  echo Nao foi possivel abrir a pasta do projeto.
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "tools\local\start-fenie.ps1" -ServerMode %*
set "EXIT_CODE=%ERRORLEVEL%"

if not "%EXIT_CODE%"=="0" (
  echo.
  echo O servidor encontrou um problema ao iniciar.
  pause
)

exit /b %EXIT_CODE%
