@echo off
chcp 65001 >nul
setlocal

call "%~dp0INICIAR_SERVIDOR_FENIE.bat" %*
exit /b %ERRORLEVEL%
