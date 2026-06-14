@echo off
title QR Menü - Otomatik GitHub ve Netlify Güncelleme
color 0A

echo ========================================
echo    QR MENU OTOMATIK GUNCELLEME SISTEMI
echo ========================================
echo.

echo [1/5] Proje klasorune gidiliyor...
cd /d C:\Users\EnsariPos\Documents\qr-main\qr-main
if errorlevel 1 (
    echo HATA: Proje klasoru bulunamadi!
    pause
    exit /b 1
)
echo OK: %CD%
echo.

echo [2/5] netlify/functions klasoru kontrol ediliyor...
if not exist "netlify\functions" mkdir netlify\functions
copy /Y server.js netlify\functions\server.js > nul
echo OK: server.js kopyalandi
echo.

echo [3/5] Git deposu kontrol ediliyor...
if not exist ".git" (
    echo Git deposu bulunamadi, kuruluyor...
    git init
    git remote add origin https://github.com/yusuf631636/qrmen-.git
)
echo OK: Git deposu hazir
echo.

echo [4/5] Dosyalar GitHub'a gonderiliyor...
git add .
git commit -m "Otomatik guncelleme - %date% %time%"

:: Güncellenen kısım: Hangi dalda olduğumuzu bul ve ona göre push et
git branch
echo.
echo Yukaridaki listeden mevcut dal adini kontrol ediyorum...
for /f "tokens=2" %%i in ('git branch ^| find "*"') do set branch=%%i
echo Mevcut dal adi: %branch%
echo.

if "%branch%"=="" (
    echo UYARI: Dal adi bulunamadi, 'master' olarak ayarlaniyor...
    set branch=master
)

echo GitHub'a gonderiliyor (dal: %branch%)...
git push -u origin %branch%

if errorlevel 1 (
    echo HATA: GitHub'a gonderilemedi!
    echo.
    echo Cozum onerisi: Eger bu ilk gonderiminizse, su komutu calistirip tekrar deneyin:
    echo git push -u origin master --force
    pause
    exit /b 1
)
echo OK: GitHub'a gonderildi
echo.

echo [5/5] Netlify otomatik deploy ediyor...
echo Site adresi: https://qr-menuyusufusta.netlify.app
echo Guncelleme 1-2 dakika icinde yayinda olacaktir.
echo.

echo ========================================
echo    ISLEM TAMAMLANDI!
echo ========================================
echo.
echo Guncelleme tarihi: %date% %time%
echo.
pause