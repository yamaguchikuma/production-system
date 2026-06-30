@echo off
cd /d C:\projects\production-system\app
start "生産管理システム" cmd /k "npx next dev"
timeout /t 5 /nobreak > nul
start http://localhost:3000/orders
