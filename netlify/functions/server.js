require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');
const getDb = require('./database');
const sql = require('mssql');
const serverless = require('serverless-http');

// SAMBAPOS MSSQL Bağlantı Ayarları
const sambaConfig = {
    server: process.env.SAMBA_HOST || 'DESKTOP-L720TK3',
    database: process.env.SAMBA_DB || 'SAMBAPOS',
    user: process.env.SAMBA_USER || 'sa',
    password: process.env.SAMBA_PASSWORD || 'alfa.1234',
    port: parseInt(process.env.SAMBA_PORT) || 1433,
    options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true
    }
};

// SAMBAPOS bağlantı havuzu
let sambaPool = null;

// SAMBAPOS'a bağlan
async function connectSamba() {
    try {
        sambaPool = await sql.connect({
            ...sambaConfig,
            requestTimeout: 60000,
            connectionTimeout: 30000,
            pool: {
                max: 10,
                min: 0,
                idleTimeoutMillis: 30000
            }
        });
        console.log('✅ SAMBAPOS MSSQL veritabanına bağlandı!');
        return sambaPool;
    } catch (err) {
        console.error('❌ SAMBAPOS bağlantı hatası:', err.message);
        return null;
    }
}

// SAMBAPOS'tan kategorileri çek
async function getCategoriesFromSamba() {
    if (!sambaPool) {
        await connectSamba();
    }
    if (!sambaPool) return [];
    
    try {
        const result = await sambaPool.request().query(`
            SELECT DISTINCT
                Id,
                Name
            FROM ScreenMenuCategories
            WHERE Name IS NOT NULL AND Name != ''
            ORDER BY Id ASC
        `);
        
        if (result.recordset.length > 0) {
            console.log(`✅ Kategoriler: ${result.recordset.length} kategori çekildi`);
            return result.recordset.map(cat => ({
                id: cat.Id,
                name: cat.Name,
                description: '',
                icon: '🍽️',
                sort_order: 0,
                is_active: 1
            }));
        }
        return [];
    } catch (err) {
        console.log('⚠️ Kategori çekme hatası:', err.message);
        return [];
    }
}

// SAMBAPOS'tan ürünleri ve fiyatlarını çek (sadece fiyatı 1 TL'den büyük olanlar)
async function getProductsFromSamba() {
    if (!sambaPool) {
        await connectSamba();
    }
    if (!sambaPool) return [];
    
    try {
        // Önce kategorileri al (ID ve ad eşlemesi için)
        const categoriesResult = await sambaPool.request().query(`
            SELECT Id, Name FROM ScreenMenuCategories
        `);
        
        // Kategori adlarını ID'lerine eşle
        const categoryNameToId = {};
        for (const cat of categoriesResult.recordset) {
            categoryNameToId[cat.Name] = cat.Id;
        }
        
        // Ürünleri ve kategori adlarını çek
        const productsResult = await sambaPool.request().query(`
            SELECT 
                Id,
                Name,
                GroupCode as CategoryName
            FROM MenuItems
            WHERE Name IS NOT NULL AND Name != ''
            ORDER BY Name ASC
        `);
        
        // Tüm fiyatları çek
        const pricesResult = await sambaPool.request().query(`
            SELECT 
                MenuItemPortionId,
                Price
            FROM MenuItemPrices
            WHERE Price IS NOT NULL AND Price > 1
        `);
        
        // Fiyatları eşle
        const priceMap = {};
        for (const p of pricesResult.recordset) {
            if (!priceMap[p.MenuItemPortionId] || p.Price > priceMap[p.MenuItemPortionId]) {
                priceMap[p.MenuItemPortionId] = p.Price;
            }
        }
        
        // Kategori adına göre ID eşleme yap
        const products = [];
        for (const p of productsResult.recordset) {
            const price = priceMap[p.Id];
            if (!price || price <= 1) continue;
            
            let categoryId = null;
            const categoryName = p.CategoryName;
            
            if (categoryName && categoryNameToId[categoryName]) {
                categoryId = categoryNameToId[categoryName];
            }
            
            if (!categoryId) {
                categoryId = 1;
            }
            
            products.push({
                id: p.Id,
                name: p.Name || 'İsimsiz',
                description: '',
                price: parseFloat(price),
                category_id: categoryId,
                image_url: '',
                is_available: 1,
                sort_order: 0
            });
        }
        
        console.log(`✅ Ürünler: ${products.length} fiyatlı ürün çekildi (1 TL üzeri)`);
        
        return products;
    } catch (err) {
        console.error('❌ Ürün çekme hatası:', err.message);
        return [];
    }
}

// SAMBAPOS kategorilerini yerel veritabanına kaydet
async function syncCategoriesToLocal() {
    try {
        const db = await getDb();
        const sambaCategories = await getCategoriesFromSamba();
        
        if (sambaCategories.length === 0) return;
        
        await db.run('DELETE FROM categories');
        await db.run('PRAGMA foreign_keys = OFF');
        
        for (const cat of sambaCategories) {
            await db.run(
                `INSERT OR REPLACE INTO categories (id, name, description, icon, sort_order, is_active) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [cat.id, cat.name, cat.description, cat.icon, cat.sort_order, cat.is_active]
            );
        }
        
        await db.run('PRAGMA foreign_keys = ON');
        
        const finalCount = await db.get('SELECT COUNT(*) as c FROM categories');
        console.log(`✅ Yerel veritabanına ${finalCount.c} kategori kaydedildi`);
    } catch (err) {
        console.log('⚠️ Kategori senkronizasyon hatası:', err.message);
    }
}

// SAMBAPOS ürünlerini yerel veritabanına kaydet
async function syncProductsToLocal() {
    try {
        const db = await getDb();
        const sambaProducts = await getProductsFromSamba();
        
        if (sambaProducts.length === 0) return;
        
        await db.run('DELETE FROM products');
        await db.run('PRAGMA foreign_keys = OFF');
        
        for (const p of sambaProducts) {
            await db.run(
                `INSERT OR REPLACE INTO products (id, category_id, name, description, price, image_url, is_available, is_featured, allergens, sort_order)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [p.id, p.category_id, p.name, p.description, p.price, p.image_url, p.is_available, 0, '', p.sort_order]
            );
        }
        
        await db.run('PRAGMA foreign_keys = ON');
        
        const count = await db.get('SELECT COUNT(*) as c FROM products');
        console.log(`✅ Yerel veritabanına ${count.c} ürün kaydedildi`);
    } catch (err) {
        console.log('⚠️ Ürün senkronizasyon hatası:', err.message);
        await db.run('PRAGMA foreign_keys = ON');
    }
}

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'qrmenu_default_secret';

// Ensure uploads directory
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(uploadsDir));

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|svg/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    cb(null, ext && mime);
  }
});

// Auth middleware
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token gerekli' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Geçersiz token' });
  }
}

// ─── AUTH ROUTES ────────────────────────────────────────

app.post('/api/auth/setup', async (req, res) => {
  try {
    const db = await getDb();
    const count = await db.get('SELECT COUNT(*) as c FROM admins');
    if (count.c > 0) return res.status(400).json({ error: 'Admin zaten oluşturulmuş' });

    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Kullanıcı adı ve şifre gerekli' });

    const hash = bcrypt.hashSync(password, 10);
    await db.run('INSERT INTO admins (username, password_hash) VALUES (?, ?)', [username, hash]);
    res.json({ success: true, message: 'Admin oluşturuldu' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/status', async (req, res) => {
  try {
    const db = await getDb();
    const count = await db.get('SELECT COUNT(*) as c FROM admins');
    res.json({ needsSetup: count.c === 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const db = await getDb();
    const { username, password } = req.body;
    const admin = await db.get('SELECT * FROM admins WHERE username = ?', [username]);
    if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
      return res.status(401).json({ error: 'Geçersiz kullanıcı adı veya şifre' });
    }
    const token = jwt.sign({ id: admin.id, username: admin.username }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, username: admin.username });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── SETTINGS ROUTES ───────────────────────────────────

app.get('/api/settings', async (req, res) => {
  try {
    const db = await getDb();
    const settings = await db.get('SELECT * FROM settings WHERE id = 1');
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/settings', authMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const fields = ['restaurant_name', 'slogan', 'logo_url', 'cover_url', 'primary_color',
      'secondary_color', 'accent_color', 'currency', 'language', 'theme',
      'phone', 'address', 'instagram', 'wifi_password'];
    const updates = [];
    const values = [];
    for (const f of fields) {
      if (req.body[f] !== undefined) {
        updates.push(`${f} = ?`);
        values.push(req.body[f]);
      }
    }
    if (updates.length === 0) return res.status(400).json({ error: 'Güncellenecek alan yok' });
    
    await db.run(`UPDATE settings SET ${updates.join(', ')} WHERE id = 1`, values);
    const settings = await db.get('SELECT * FROM settings WHERE id = 1');
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── CATEGORY ROUTES ───────────────────────────────────

app.get('/api/categories', async (req, res) => {
  try {
    const db = await getDb();
    const cats = await db.all('SELECT * FROM categories ORDER BY sort_order ASC, id ASC');
    res.json(cats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/categories', authMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const { name, description, icon, sort_order, is_active } = req.body;
    if (!name) return res.status(400).json({ error: 'Kategori adı gerekli' });
    
    const result = await db.run(
      'INSERT INTO categories (name, description, icon, sort_order, is_active) VALUES (?, ?, ?, ?, ?)',
      [name, description || '', icon || '🍽️', sort_order || 0, is_active !== undefined ? is_active : 1]
    );
    const cat = await db.get('SELECT * FROM categories WHERE id = ?', [result.lastID]);
    res.status(201).json(cat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/categories/:id', authMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const { name, description, icon, sort_order, is_active } = req.body;
    const existing = await db.get('SELECT * FROM categories WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Kategori bulunamadı' });

    await db.run(
      'UPDATE categories SET name = ?, description = ?, icon = ?, sort_order = ?, is_active = ? WHERE id = ?',
      [
        name || existing.name,
        description !== undefined ? description : existing.description,
        icon || existing.icon,
        sort_order !== undefined ? sort_order : existing.sort_order,
        is_active !== undefined ? is_active : existing.is_active,
        req.params.id
      ]
    );
    const cat = await db.get('SELECT * FROM categories WHERE id = ?', [req.params.id]);
    res.json(cat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/categories/:id', authMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const existing = await db.get('SELECT * FROM categories WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Kategori bulunamadı' });
    await db.run('DELETE FROM categories WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PRODUCT ROUTES ────────────────────────────────────

app.get('/api/products', async (req, res) => {
  try {
    const db = await getDb();
    const products = await db.all('SELECT * FROM products ORDER BY sort_order ASC, id ASC');
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/products/category/:categoryId', async (req, res) => {
  try {
    const db = await getDb();
    const products = await db.all(
      'SELECT * FROM products WHERE category_id = ? ORDER BY sort_order ASC, id ASC',
      [req.params.categoryId]
    );
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/products', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const db = await getDb();
    const { category_id, name, description, price, is_available, is_featured, allergens, sort_order } = req.body;
    if (!category_id || !name || price === undefined) {
      return res.status(400).json({ error: 'category_id, name ve price gerekli' });
    }
    const image_url = req.file ? `/uploads/${req.file.filename}` : '';
    const result = await db.run(
      `INSERT INTO products (category_id, name, description, price, image_url, is_available, is_featured, allergens, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        category_id, name, description || '', parseFloat(price), image_url,
        is_available !== undefined ? parseInt(is_available) : 1,
        is_featured !== undefined ? parseInt(is_featured) : 0,
        allergens || '', sort_order || 0
      ]
    );
    const product = await db.get('SELECT * FROM products WHERE id = ?', [result.lastID]);
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/products/:id', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const db = await getDb();
    const existing = await db.get('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Ürün bulunamadı' });

    const image_url = req.file ? `/uploads/${req.file.filename}` : existing.image_url;

    await db.run(
      `UPDATE products SET category_id = ?, name = ?, description = ?, price = ?, image_url = ?,
       is_available = ?, is_featured = ?, allergens = ?, sort_order = ? WHERE id = ?`,
      [
        req.body.category_id || existing.category_id,
        req.body.name || existing.name,
        req.body.description !== undefined ? req.body.description : existing.description,
        req.body.price !== undefined ? parseFloat(req.body.price) : existing.price,
        image_url,
        req.body.is_available !== undefined ? parseInt(req.body.is_available) : existing.is_available,
        req.body.is_featured !== undefined ? parseInt(req.body.is_featured) : existing.is_featured,
        req.body.allergens !== undefined ? req.body.allergens : existing.allergens,
        req.body.sort_order !== undefined ? parseInt(req.body.sort_order) : existing.sort_order,
        req.params.id
      ]
    );
    const product = await db.get('SELECT * FROM products WHERE id = ?', [req.params.id]);
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/products/:id', authMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const existing = await db.get('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Ürün bulunamadı' });

    if (existing.image_url) {
      const imgPath = path.join(__dirname, existing.image_url);
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    }

    await db.run('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── UPLOAD ROUTE ──────────────────────────────────────

app.post('/api/upload', authMiddleware, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Dosya yüklenemedi' });
  res.json({ url: `/uploads/${req.file.filename}` });
});

// ─── QR CODE ROUTE ─────────────────────────────────────

app.get('/api/qr', async (req, res) => {
  try {
    const db = await getDb();
    const protocol = req.protocol;
    const host = req.get('host');
    const menuUrl = `${protocol}://${host}`;

    const settings = await db.get('SELECT * FROM settings WHERE id = 1');
    const primaryColor = settings?.primary_color || '#e67e22';

    const qrDataUrl = await QRCode.toDataURL(menuUrl, {
      width: 512,
      margin: 2,
      color: { dark: primaryColor, light: '#ffffff' },
      errorCorrectionLevel: 'H'
    });
    res.json({ qr: qrDataUrl, url: menuUrl });
  } catch (err) {
    res.status(500).json({ error: 'QR kod oluşturulamadı' });
  }
});

app.get('/api/qr/download', async (req, res) => {
  try {
    const db = await getDb();
    const protocol = req.protocol;
    const host = req.get('host');
    const menuUrl = `${protocol}://${host}`;

    const settings = await db.get('SELECT * FROM settings WHERE id = 1');
    const primaryColor = settings?.primary_color || '#e67e22';

    const buffer = await QRCode.toBuffer(menuUrl, {
      width: 1024,
      margin: 2,
      color: { dark: primaryColor, light: '#ffffff' },
      errorCorrectionLevel: 'H'
    });
    res.set({ 'Content-Type': 'image/png', 'Content-Disposition': 'attachment; filename="qr-menu.png"' });
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: 'QR kod indirilemedi' });
  }
});

// ─── STATS ROUTE ───────────────────────────────────────

app.get('/api/stats', authMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const totalCategories = (await db.get('SELECT COUNT(*) as c FROM categories')).c;
    const totalProducts = (await db.get('SELECT COUNT(*) as c FROM products')).c;
    const activeProducts = (await db.get('SELECT COUNT(*) as c FROM products WHERE is_available = 1')).c;
    const featuredProducts = (await db.get('SELECT COUNT(*) as c FROM products WHERE is_featured = 1')).c;
    res.json({ totalCategories, totalProducts, activeProducts, featuredProducts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── FULL MENU DATA ────────────────────────────

app.get('/api/menu', async (req, res) => {
  try {
    const db = await getDb();
    const settings = await db.get('SELECT * FROM settings WHERE id = 1');
    
    await syncCategoriesToLocal();
    await syncProductsToLocal();
    
    const categories = await db.all('SELECT * FROM categories WHERE is_active = 1 ORDER BY sort_order ASC, id ASC');
    const products = await db.all('SELECT * FROM products WHERE is_available = 1 ORDER BY sort_order ASC, id ASC');
    
    console.log(`📊 Menü: ${categories.length} kategori, ${products.length} ürün`);
    
    const menu = categories.map(cat => ({
        ...cat,
        products: products.filter(p => p.category_id === cat.id)
    }));
    
    res.json({ settings, menu });
  } catch (err) {
    console.error('Menu hatası:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── SPA FALLBACK ──────────────────────────────────────

app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// ─── NETLIFY FUNCTIONS EXPORT ──────────────────────────

const handler = serverless(app);

// Yerel ortamda çalıştırmak için
if (process.env.LOCAL_DEV === 'true' || !process.env.NETLIFY) {
  connectSamba().then(() => {
    getDb().then(() => {
      app.listen(PORT, () => {
        console.log(`🍽️  QR Menü sunucusu çalışıyor: http://localhost:${PORT}`);
        console.log(`📱 Müşteri Menü: http://localhost:${PORT}`);
        console.log(`⚙️  Admin Panel:  http://localhost:${PORT}/admin`);
      });
    });
  }).catch(err => console.error('DB init error:', err));
}

// Netlify için export
module.exports.handler = handler;