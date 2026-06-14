const request = require('supertest');
const fs = require('fs');
const path = require('path');
const getDb = require('../database');
const app = require('../server');

let token;
let categoryId;
let productId;
let db;

beforeAll(async () => {
  db = await getDb();
  // Clear db
  await db.run('DELETE FROM products');
  await db.run('DELETE FROM categories');
  await db.run('DELETE FROM admins');
  
  // Create test admin
  await request(app)
    .post('/api/auth/setup')
    .send({ username: 'testadmin', password: 'testpassword' });
    
  // Login to get token
  const res = await request(app)
    .post('/api/auth/login')
    .send({ username: 'testadmin', password: 'testpassword' });
    
  token = res.body.token;
});

describe('Auth API', () => {
  it('should not allow second setup', async () => {
    const res = await request(app)
      .post('/api/auth/setup')
      .send({ username: 'admin2', password: '123' });
    expect(res.status).toBe(400);
  });

  it('should check status correctly', async () => {
    const res = await request(app).get('/api/auth/status');
    expect(res.body.needsSetup).toBe(false);
  });
});

describe('Settings API', () => {
  it('should get settings', async () => {
    const res = await request(app).get('/api/settings');
    expect(res.status).toBe(200);
    expect(res.body.restaurant_name).toBe('Restoran Adı');
  });

  it('should update settings', async () => {
    const res = await request(app)
      .put('/api/settings')
      .set('Authorization', `Bearer ${token}`)
      .send({ restaurant_name: 'Yeni Restoran' });
    expect(res.status).toBe(200);
    expect(res.body.restaurant_name).toBe('Yeni Restoran');
  });
});

describe('Categories API', () => {
  it('should create a category', async () => {
    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Test Kategori', icon: '🍕' });
    
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Test Kategori');
    categoryId = res.body.id;
  });

  it('should get all categories', async () => {
    const res = await request(app).get('/api/categories');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('should update category', async () => {
    const res = await request(app)
      .put(`/api/categories/${categoryId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Güncel Kategori' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Güncel Kategori');
  });
});

describe('Products API', () => {
  it('should create a product', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .field('category_id', categoryId.toString())
      .field('name', 'Test Ürün')
      .field('price', '150.50')
      .field('description', 'Test açıklama');
      
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Test Ürün');
    expect(res.body.price).toBe(150.5);
    productId = res.body.id;
  });

  it('should get all products', async () => {
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('should update product', async () => {
    const res = await request(app)
      .put(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${token}`)
      .field('price', '200');
    expect(res.status).toBe(200);
    expect(res.body.price).toBe(200);
  });
});

describe('QR API', () => {
  it('should return base64 qr code', async () => {
    const res = await request(app).get('/api/qr');
    expect(res.status).toBe(200);
    expect(res.body.qr).toContain('data:image/png;base64');
  });
});

afterAll(async () => {
  if (db) {
    await db.close();
  }
});
