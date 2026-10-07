@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo   N1MM Logger+ Chinese Guide - Local Server
echo   ----------------------------------------------------
where node >nul 2>nul
if errorlevel 1 (
  echo   [ERROR] Node.js was not found.
  echo   Please install Node.js LTS from https://nodejs.org/ and run this file again.
  echo.
  pause
  exit /b 1
)
echo   Starting server... the browser will open automatically.
echo   Close this window to stop the server.
echo.
node "%~dp0server.mjs"
echo.
pause
