@echo off
title Hizli Guncelleme
color 0E
echo Guncelleniyor...
taskkill /F /IM node.exe 2>nul
timeout /t 1 /nobreak >nul
start /B node server.js
timeout /t 3 /nobreak >nul
echo Tamamlandi! http://localhost:3000
exit