const getDb = require('./database');
const bcrypt = require('bcryptjs');

async function seed() {
  try {
    const db = await getDb();
    console.log('Veritabanına bağlanıldı.');

    // 1. Clear existing data
    await db.run('DELETE FROM products');
    await db.run('DELETE FROM categories');
    await db.run('DELETE FROM admins');
    await db.run('DELETE FROM settings');

    // 2. Add Admin
    const hash = bcrypt.hashSync('admin', 10);
    await db.run('INSERT INTO admins (username, password_hash) VALUES (?, ?)', ['admin', hash]);
    console.log('✅ Admin oluşturuldu (Kullanıcı: admin, Şifre: admin)');

    // 3. Add Settings
    await db.run(`
      INSERT INTO settings 
      (id, restaurant_name, slogan, primary_color, secondary_color, accent_color, phone, address, wifi_password, instagram, theme) 
      VALUES (1, 'Gourmet Lounge', 'Mutfağın Sanatla Buluştuğu Yer', '#e67e22', '#1a1a2e', '#e74c3c', '0539 293 54 99', 'Merkez / Kocaeli', 'gourmet2024', '@gourmetlounge', 'dark')
    `);
    console.log('✅ Ayarlar yapılandırıldı.');

    // 4. Add Categories
    const categories = [
      { name: 'Başlangıçlar', icon: '🥗', desc: 'İştah açıcı lezzetler', order: 1 },
      { name: 'Ana Yemekler', icon: '🥩', desc: 'Şefin özel spesiyalleri', order: 2 },
      { name: 'Pizzalar', icon: '🍕', desc: 'Odun ateşinde', order: 3 },
      { name: 'Tatlılar', icon: '🍰', desc: 'Günün en tatlı anı', order: 4 },
      { name: 'İçecekler', icon: '🍷', desc: 'Serinleten tatlar', order: 5 }
    ];

    const catIds = {};
    for (const cat of categories) {
      const result = await db.run(
        'INSERT INTO categories (name, description, icon, sort_order) VALUES (?, ?, ?, ?)',
        [cat.name, cat.desc, cat.icon, cat.order]
      );
      catIds[cat.name] = result.lastID;
    }
    console.log(`✅ ${categories.length} Kategori eklendi.`);

    // 5. Add Products
    const products = [
      // Başlangıçlar
      { cat: 'Başlangıçlar', name: 'Bruschetta', desc: 'Kızarmış ekşi mayalı ekmek üzerinde taze domates, fesleğen ve zeytinyağı.', price: 185, featured: 0, allergens: 'Gluten' },
      { cat: 'Başlangıçlar', name: 'Trüflü Patates Kızartması', desc: 'Parmesan peyniri ve trüf yağı ile tatlandırılmış ince kesim patates.', price: 210, featured: 1, allergens: 'Süt Ürünleri' },
      { cat: 'Başlangıçlar', name: 'Günün Çorbası', desc: 'Şefin taze malzemelerle hazırladığı günün çorbası.', price: 140, featured: 0, allergens: '' },
      
      // Ana Yemekler
      { cat: 'Ana Yemekler', name: 'Dana Bonfile (250g)', desc: 'Istiridye mantarı, kuşkonmaz ve özel demi-glace sos ile.', price: 850, featured: 1, allergens: '' },
      { cat: 'Ana Yemekler', name: 'Izgara Somon', desc: 'Sote ıspanak, bebek patates ve limonlu tereyağ sosu ile.', price: 680, featured: 0, allergens: 'Balık, Süt Ürünleri' },
      { cat: 'Ana Yemekler', name: 'El Yapımı Trüflü Ravioli', desc: 'Porçini mantarı dolgusu ve kremsi trüf sos ile.', price: 420, featured: 1, allergens: 'Gluten, Süt Ürünleri' },
      
      // Pizzalar
      { cat: 'Pizzalar', name: 'Margherita Napoli', desc: 'San Marzano domates sosu, taze buffalo mozzarella ve fesleğen.', price: 350, featured: 1, allergens: 'Gluten, Süt Ürünleri' },
      { cat: 'Pizzalar', name: 'Quattro Formaggi', desc: 'Mozzarella, gorgonzola, parmesan ve provolone peynirleri.', price: 410, featured: 0, allergens: 'Gluten, Süt Ürünleri' },
      { cat: 'Pizzalar', name: 'Füme Kaburga Pizza', desc: 'Ağır ateşte pişmiş dana kaburga, karamelize soğan, barbekü sos.', price: 460, featured: 1, allergens: 'Gluten, Süt Ürünleri' },
      
      // Tatlılar
      { cat: 'Tatlılar', name: 'San Sebastian Cheesecake', desc: 'Akışkan iç dolgusu ve yanında ılık çikolata sos ile.', price: 280, featured: 1, allergens: 'Gluten, Süt Ürünleri, Yumurta' },
      { cat: 'Tatlılar', name: 'Klasik Tiramisu', desc: 'Mascarpone peyniri ve espresso ile ıslatılmış kedi dili.', price: 240, featured: 0, allergens: 'Gluten, Süt Ürünleri, Yumurta' },
      
      // İçecekler
      { cat: 'İçecekler', name: 'Orman Meyveli Smoothie', desc: 'Taze böğürtlen, çilek, yaban mersini ve badem sütü.', price: 160, featured: 0, allergens: 'Kuruyemiş' },
      { cat: 'İçecekler', name: 'Artisan Limonata', desc: 'Taze nane ve zencefil ile ev yapımı soğuk limonata.', price: 120, featured: 1, allergens: '' },
      { cat: 'İçecekler', name: 'Filtre Kahve', desc: 'Taze çekilmiş %100 Arabica çekirdeklerinden.', price: 90, featured: 0, allergens: '' }
    ];

    for (const p of products) {
      await db.run(
        'INSERT INTO products (category_id, name, description, price, is_featured, allergens, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [catIds[p.cat], p.name, p.desc, p.price, p.featured, p.allergens, 0]
      );
    }
    console.log(`✅ ${products.length} Ürün eklendi.`);
    
    console.log('🎉 Demo verileri başarıyla oluşturuldu!');

  } catch (err) {
    console.error('Hata:', err);
  } finally {
    const db = await getDb();
    await db.close();
    process.exit(0);
  }
}

seed();
