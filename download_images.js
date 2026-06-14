const fs = require('fs');
const path = require('path');
const https = require('https');
const getDb = require('./database');

const uploadsDir = path.join(__dirname, 'uploads');

async function downloadImage(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      // Handle redirects if any
      if (res.statusCode === 301 || res.statusCode === 302) {
        return downloadImage(res.headers.location, dest).then(resolve).catch(reject);
      }
      
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to get '${url}' (${res.statusCode})`));
      }

      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(dest);
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

const keywords = {
  'Bruschetta': 'bruschetta,bread',
  'Trüflü Patates Kızartması': 'frenchfries,potato',
  'Günün Çorbası': 'soup,food',
  'Dana Bonfile (250g)': 'steak,meat',
  'Izgara Somon': 'salmon,fish',
  'El Yapımı Trüflü Ravioli': 'ravioli,pasta',
  'Margherita Napoli': 'margheritapizza,pizza',
  'Quattro Formaggi': 'cheesepizza,pizza',
  'Füme Kaburga Pizza': 'meatpizza,pizza',
  'San Sebastian Cheesecake': 'cheesecake,dessert',
  'Klasik Tiramisu': 'tiramisu,dessert',
  'Orman Meyveli Smoothie': 'smoothie,berry',
  'Artisan Limonata': 'lemonade,drink',
  'Filtre Kahve': 'coffee,black'
};

async function main() {
  try {
    const db = await getDb();
    const products = await db.all('SELECT id, name FROM products');

    console.log(`${products.length} ürün için resim indiriliyor...`);

    for (const p of products) {
      const keyword = keywords[p.name] || 'food,dish';
      // Use loremflickr for random images based on keyword
      const url = `https://loremflickr.com/600/400/${keyword}?random=${p.id}`;
      const filename = `demo-${p.id}-${Date.now()}.jpg`;
      const destPath = path.join(uploadsDir, filename);

      try {
        await downloadImage(url, destPath);
        const imageUrl = `/uploads/${filename}`;
        await db.run('UPDATE products SET image_url = ? WHERE id = ?', [imageUrl, p.id]);
        console.log(`✅ ${p.name} için resim eklendi.`);
      } catch (err) {
        console.error(`❌ ${p.name} için resim indirilemedi:`, err.message);
      }
      
      // Small pause to avoid rate limiting
      await new Promise(r => setTimeout(r, 500));
    }
    
    console.log('🎉 Bütün ürün resimleri başarıyla yüklendi!');

  } catch (err) {
    console.error('Hata:', err);
  } finally {
    process.exit(0);
  }
}

main();
