# QR Menü Scripti

Restoran ve kafeler için tasarlanmış, dijital, teması özelleştirilebilir, hızlı QR Menü sistemi.

## 🚀 Özellikler

- **Müşteri Ekranı**: Glassmorphism tasarımlı, cihaz dostu (mobil öncelikli), animasyonlu ve "karanlık / aydınlık" tema seçmeli premium menü görünümü.
- **Admin Paneli**: Kategori ve ürünleri (resim, açıklama, fiyat, alerjen, öne çıkan) yönetebileceğiniz gelişmiş CRUD sistemi.
- **Canlı Tema Yaratıcı**: Restoranınıza uygun 3 farklı ana rengi seçerek, menünün görünümünü anlık kişiselleştirin.
- **QR Kod Üretimi**: Sistem üzerinden renklerinize uygun QR kod otomatik üretilir. Direkt SVG/PNG indirebilir veya yazdırabilirsiniz.
- **Veritabanı**: Kurulum derdi olmayan, süper hızlı taşınabilir SQLite (WAL modunda) veritabanı.

---

## 💻 Kurulum ve Çalıştırma

### Gereksinimler
- Node.js (v18+)

### Adımlar

1. Bağımlılıkları yükleyin:
   ```bash
   npm install
   ```
2. Eğer yüklü değilse, `.env` dosyasını oluşturup gerekli ayarları yapın (Örnek port: 3000).
3. Sunucuyu başlatın:
   ```bash
   npm start
   ```
4. Tarayıcınızda açın:
   - **Müşteri Menüsü:** `http://localhost:3000`
   - **Admin Paneli:** `http://localhost:3000/admin`

*(İlk girişte sizden Yönetici kullanıcı adı ve şifresi oluşturmanızı isteyecektir)*

---

## 🐳 Docker ile Kurulum (Production)

Kendi sunucunuzda ayağa kaldırmak için:

```bash
# İmajı oluştur
docker build -t qr-menu .

# Konteyneri çalıştır (Verileri kalıcı yapmak için volume eklenmiştir)
docker run -d -p 3000:3000 -v $(pwd)/data:/app/data -v $(pwd)/uploads:/app/uploads --name qrmenu qr-menu
```

---

## 🛠️ Stack

- **Backend:** Node.js, Express.js
- **Veritabanı:** `sqlite` ve `sqlite3`
- **Frontend / UI:** Vanilla HTML/CSS/JS (Sıfır framework, yüksek hız), Glassmorphism UI
- **Dosya Yükleme:** `multer`
- **QR Üretim:** `qrcode`
- **Güvenlik:** `bcryptjs`, `jsonwebtoken`

---

## 📝 Lisans
MIT License
