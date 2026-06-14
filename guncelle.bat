@echo off
title QR Menü Otomatik Güncelleme
color 0A

echo ========================================
echo    QR MENU OTOMATIK GUNCELLEME SISTEMI
echo ========================================
echo.

echo [1/4] SAMBAPOS baglantisi kontrol ediliyor...
node -e "require('./server').connectSamba()" 2>nul
if errorlevel 1 (
    echo HATA: SAMBAPOS'a baglanilamadi!
    echo Lutfen SAMBAPOS'un calistigini kontrol edin.
    pause
    exit /b 1
)
echo SAMBAPOS baglantisi OK!

echo.
echo [2/4] Veritabani senkronizasyonu baslatiliyor...
node -e "
(async () => {
    const getDb = require('./database');
    const db = await getDb();
    
    // Kategorileri temizle
    await db.run('DELETE FROM categories');
    await db.run('DELETE FROM products');
    
    console.log('Veritabani temizlendi, senkronizasyon bekleniyor...');
    process.exit(0);
})()
"

echo.
echo [3/4] Yeni veriler cekiliyor...
echo Bu islem 30-60 saniye surebilir, lutfen bekleyin...

REM Sunucuyu guncel verilerle yeniden baslat
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

start /B node server.js

timeout /t 5 /nobreak >nul

echo.
echo [4/4] Guncelleme tamamlandi!
echo.
echo QR Menu adresi: http://localhost:3000
echo.
echo Guncelleme tarihi: %date% %time%
echo ========================================
echo.
pause