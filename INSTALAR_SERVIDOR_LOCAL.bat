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

echo Preparando o PC servidor da Central de Carteira Fenie...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "tools\local\install-server-fenie.ps1"
set "EXIT_CODE=%ERRORLEVEL%"

echo.
if "%EXIT_CODE%"=="0" (
  echo Instalacao do servidor local concluida.
) else (
  echo A instalacao encontrou um problema.
)

pause
exit /b %EXIT_CODE%
