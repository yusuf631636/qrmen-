const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let dbInstance = null;

async function getDb() {
  if (dbInstance) return dbInstance;

  dbInstance = await open({
    filename: path.join(dataDir, 'menu.db'),
    driver: sqlite3.Database
  });

  // Enable WAL mode for better performance
  await dbInstance.exec('PRAGMA journal_mode = WAL;');
  await dbInstance.exec('PRAGMA foreign_keys = ON;');

  // Create tables
  await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY DEFAULT 1,
      restaurant_name TEXT DEFAULT 'Restoran Adı',
      slogan TEXT DEFAULT 'Lezzetin Adresi',
      logo_url TEXT DEFAULT '',
      cover_url TEXT DEFAULT '',
      primary_color TEXT DEFAULT '#e67e22',
      secondary_color TEXT DEFAULT '#2c3e50',
      accent_color TEXT DEFAULT '#e74c3c',
      currency TEXT DEFAULT '₺',
      language TEXT DEFAULT 'tr',
      theme TEXT DEFAULT 'dark',
      phone TEXT DEFAULT '',
      address TEXT DEFAULT '',
      instagram TEXT DEFAULT '',
      wifi_password TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      icon TEXT DEFAULT '🍽️',
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      price REAL NOT NULL,
      image_url TEXT DEFAULT '',
      is_available INTEGER DEFAULT 1,
      is_featured INTEGER DEFAULT 0,
      allergens TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Insert default settings if not exists
  const settingsCount = await dbInstance.get('SELECT COUNT(*) as count FROM settings');
  if (settingsCount.count === 0) {
    await dbInstance.run('INSERT INTO settings (id) VALUES (1)');
  }

  return dbInstance;
}

module.exports = getDb;
