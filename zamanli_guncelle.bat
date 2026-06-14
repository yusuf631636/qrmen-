@echo off
echo %date% %time% - Otomatik guncelleme basladi >> C:\Users\EnsariPos\Documents\qr-main\qr-main\guncelleme_log.txt
cd /d C:\Users\EnsariPos\Documents\qr-main\qr-main
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul
start /B node server.js
echo %date% %time% - Guncelleme tamamlandi >> guncelleme_log.txt
exit