@echo off
title Claude Motion clone
cd /d "%~dp0"
where node >nul 2>nul || (echo Instale o Node.js 20 ou mais novo: https://nodejs.org && pause && exit /b 1)
if not exist node_modules (
  echo Instalando bibliotecas pela primeira vez...
  call npm install --no-audit --no-fund
)
if not exist .env copy .env.example .env >nul
node server.js --open
pause
