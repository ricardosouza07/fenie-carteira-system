@echo off
chcp 65001 >nul
setlocal

set "PROJECT_DIR=%~dp0"

cd /d "%PROJECT_DIR%"
if errorlevel 1 (
  echo Nao foi possivel abrir a pasta %PROJECT_DIR%.
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "tools\local\create-desktop-shortcut.ps1"
set "EXIT_CODE=%ERRORLEVEL%"

if "%EXIT_CODE%"=="0" (
  echo.
  echo Atalho criado com sucesso
)

echo.
pause
exit /b %EXIT_CODE%
