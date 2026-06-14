/* ═══════════════════════════════════════════════════
   QR MENÜ — Admin Panel Logic
   ═══════════════════════════════════════════════════ */

let token = localStorage.getItem('qr_menu_token') || '';
let currentCategories = [];
let currentProducts = [];

const API = {
  get: async (endpoint) => {
    const res = await fetch(endpoint, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.status === 401) { handleLogout(); throw new Error('Unauthorized'); }
    return res.json();
  },
  post: async (endpoint, data, isFormData = false) => {
    const options = {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    };
    if (isFormData) {
      options.body = data;
    } else {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(data);
    }
    const res = await fetch(endpoint, options);
    if (res.status === 401) { handleLogout(); throw new Error('Unauthorized'); }
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Bir hata oluştu');
    }
    return res.json();
  },
  put: async (endpoint, data, isFormData = false) => {
    const options = {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    };
    if (isFormData) {
      options.body = data;
    } else {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(data);
    }
    const res = await fetch(endpoint, options);
    if (res.status === 401) { handleLogout(); throw new Error('Unauthorized'); }
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Bir hata oluştu');
    }
    return res.json();
  },
  delete: async (endpoint) => {
    const res = await fetch(endpoint, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.status === 401) { handleLogout(); throw new Error('Unauthorized'); }
    return res.json();
  }
};

// ─── INITIALIZATION ─────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  if (!token) {
    checkSetupStatus();
  } else {
    showDashboard();
    loadDashboardData();
  }
});

async function checkSetupStatus() {
  try {
    const res = await fetch('/api/auth/status');
    const data = await res.json();
    document.getElementById('authScreen').style.display = 'flex';
    document.getElementById('dashboard').style.display = 'none';
    
    if (data.needsSetup) {
      document.getElementById('setupForm').style.display = 'block';
      document.getElementById('authSubtitle').textContent = 'Sistem Kurulumu';
    } else {
      document.getElementById('loginForm').style.display = 'block';
      document.getElementById('authSubtitle').textContent = 'Admin Girişi';
    }
  } catch (error) {
    showToast('Sunucuya bağlanılamadı', 'error');
  }
}

// ─── AUTHENTICATION ─────────────────────────
async function handleSetup(e) {
  e.preventDefault();
  const username = document.getElementById('setupUsername').value;
  const password = document.getElementById('setupPassword').value;
  
  try {
    const res = await fetch('/api/auth/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    if (res.ok) {
      showToast('Admin hesabı oluşturuldu, giriş yapabilirsiniz', 'success');
      document.getElementById('setupForm').style.display = 'none';
      document.getElementById('loginForm').style.display = 'block';
      document.getElementById('authSubtitle').textContent = 'Admin Girişi';
    } else {
      const data = await res.json();
      showToast(data.error || 'Kurulum başarısız', 'error');
    }
  } catch (error) {
    showToast('Bir hata oluştu', 'error');
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('loginUsername').value;
  const password = document.getElementById('loginPassword').value;
  const errorEl = document.getElementById('loginError');
  
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    const data = await res.json();
    
    if (res.ok) {
      token = data.token;
      localStorage.setItem('qr_menu_token', token);
      showDashboard();
      loadDashboardData();
    } else {
      errorEl.textContent = data.error || 'Giriş başarısız';
      errorEl.style.display = 'block';
    }
  } catch (error) {
    errorEl.textContent = 'Bir hata oluştu';
    errorEl.style.display = 'block';
  }
}

function handleLogout() {
  localStorage.removeItem('qr_menu_token');
  token = '';
  document.getElementById('authScreen').style.display = 'flex';
  document.getElementById('dashboard').style.display = 'none';
  checkSetupStatus();
}

// ─── DASHBOARD NAVIGATION ───────────────────
function showDashboard() {
  document.getElementById('authScreen').style.display = 'none';
  document.getElementById('dashboard').style.display = 'flex';
}

function toggleSidebar() {
  document.querySelector('.sidebar').classList.toggle('open');
  document.querySelector('.sidebar-overlay').classList.toggle('open');
}

function showPage(pageId) {
  // Update nav
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  document.querySelector(`.nav-item[data-page="${pageId}"]`)?.classList.add('active');
  
  // Hide all pages
  document.querySelectorAll('.page').forEach(el => el.classList.remove('active'));
  document.getElementById(`page-${pageId}`).classList.add('active');
  
  // Close mobile sidebar
  document.querySelector('.sidebar').classList.remove('open');
  document.querySelector('.sidebar-overlay').classList.remove('open');
  
  // Load page specific data
  if (pageId === 'overview') loadOverviewStats();
  if (pageId === 'categories') loadCategories();
  if (pageId === 'products') loadProducts();
  if (pageId === 'settings') loadSettings();
  if (pageId === 'qrcode') loadQRCode();
}

async function loadDashboardData() {
  await Promise.all([
    loadOverviewStats(),
    loadCategories(), // Need categories for product select list
    loadSettings()
  ]);
}

// ─── OVERVIEW STATS ─────────────────────────
async function loadOverviewStats() {
  try {
    const stats = await API.get('/api/stats');
    document.getElementById('statCategories').textContent = stats.totalCategories;
    document.getElementById('statProducts').textContent = stats.totalProducts;
    document.getElementById('statActive').textContent = stats.activeProducts;
    document.getElementById('statFeatured').textContent = stats.featuredProducts;
  } catch (err) {
    console.error('Stats load err:', err);
  }
}

// ─── CATEGORIES ─────────────────────────────
async function loadCategories() {
  try {
    const cats = await API.get('/api/categories');
    currentCategories = cats;
    renderCategoriesList(cats);
    
    // Update product modal select
    const select = document.getElementById('prodCategory');
    const filterSelect = document.getElementById('productCategoryFilter');
    
    let opts = '<option value="">Seçiniz...</option>';
    let filterOpts = '<option value="">Tüm Kategoriler</option>';
    
    cats.forEach(c => {
      opts += `<option value="${c.id}">${c.name}</option>`;
      filterOpts += `<option value="${c.id}">${c.name}</option>`;
    });
    
    select.innerHTML = opts;
    filterSelect.innerHTML = filterOpts;
  } catch (err) {
    showToast('Kategoriler yüklenemedi', 'error');
  }
}

function renderCategoriesList(cats) {
  const container = document.getElementById('categoriesList');
  const empty = document.getElementById('categoriesEmpty');
  
  if (!cats || cats.length === 0) {
    container.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  
  empty.style.display = 'none';
  container.innerHTML = cats.map(c => `
    <div class="item-card">
      <div class="item-card-header">
        <div class="item-card-title">
          <span>${c.icon}</span>
          <h4>${c.name}</h4>
        </div>
        <div class="item-card-actions">
          <button class="btn-icon" onclick='editCategory(${JSON.stringify(c).replace(/'/g, "&#39;")})'>✎</button>
          <button class="btn-icon danger" onclick="deleteCategory(${c.id})">🗑️</button>
        </div>
      </div>
      <p class="item-card-desc">${c.description || 'Açıklama yok'}</p>
      <div class="item-card-meta">
        <span class="item-card-badge ${c.is_active ? 'badge-active' : 'badge-inactive'}">${c.is_active ? 'Aktif' : 'Pasif'}</span>
        <span>Sıra: ${c.sort_order}</span>
      </div>
    </div>
  `).join('');
}

// Category Modal Logic
function openCategoryModal(cat = null) {
  const isEdit = !!cat;
  document.getElementById('categoryModalTitle').textContent = isEdit ? 'Kategoriyi Düzenle' : 'Yeni Kategori';
  document.getElementById('catEditId').value = isEdit ? cat.id : '';
  document.getElementById('catName').value = isEdit ? cat.name : '';
  document.getElementById('catDesc').value = isEdit ? cat.description : '';
  document.getElementById('catIcon').value = isEdit ? cat.icon : '🍽️';
  document.getElementById('catOrder').value = isEdit ? cat.sort_order : '0';
  document.getElementById('catActive').checked = isEdit ? !!cat.is_active : true;
  
  document.getElementById('categoryModal').style.display = 'flex';
}

window.editCategory = openCategoryModal;

function closeCategoryModal() {
  document.getElementById('categoryModal').style.display = 'none';
}

async function saveCategory(e) {
  e.preventDefault();
  const id = document.getElementById('catEditId').value;
  const data = {
    name: document.getElementById('catName').value,
    description: document.getElementById('catDesc').value,
    icon: document.getElementById('catIcon').value || '🍽️',
    sort_order: parseInt(document.getElementById('catOrder').value || 0),
    is_active: document.getElementById('catActive').checked ? 1 : 0
  };
  
  try {
    if (id) {
      await API.put(`/api/categories/${id}`, data);
      showToast('Kategori güncellendi', 'success');
    } else {
      await API.post('/api/categories', data);
      showToast('Kategori eklendi', 'success');
    }
    closeCategoryModal();
    loadCategories();
    loadOverviewStats();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteCategory(id) {
  if (!confirm('Bu kategoriyi ve içindeki tüm ürünleri silmek istediğinize emin misiniz?')) return;
  try {
    await API.delete(`/api/categories/${id}`);
    showToast('Kategori silindi', 'success');
    loadCategories();
    loadOverviewStats();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ─── PRODUCTS ───────────────────────────────
async function loadProducts() {
  try {
    currentProducts = await API.get('/api/products');
    filterProducts(); // initial render based on filter
  } catch (err) {
    showToast('Ürünler yüklenemedi', 'error');
  }
}

function filterProducts() {
  const catFilter = document.getElementById('productCategoryFilter').value;
  const filtered = catFilter 
    ? currentProducts.filter(p => p.category_id == catFilter)
    : currentProducts;
    
  renderProductsList(filtered);
}

window.filterProducts = filterProducts; // expose to html

function renderProductsList(products) {
  const container = document.getElementById('productsList');
  const empty = document.getElementById('productsEmpty');
  
  if (!products || products.length === 0) {
    container.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  
  empty.style.display = 'none';
  container.innerHTML = products.map(p => {
    const cat = currentCategories.find(c => c.id == p.category_id);
    const catName = cat ? cat.name : 'Unknown';
    const imgHtml = p.image_url 
      ? `<img src="${p.image_url}" alt="${p.name}">`
      : `<div class="product-item-placeholder">${p.name.charAt(0)}</div>`;
      
    return `
      <div class="item-card product-item-card">
        <div class="product-item-image">${imgHtml}</div>
        <div class="product-item-info">
          <h4>${p.name}</h4>
          <p>${p.description || 'Açıklama yok'}</p>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <span class="product-item-price">${p.price.toFixed(2)} ${window.currency || '₺'}</span>
            <span class="item-card-badge ${p.is_available ? 'badge-active' : 'badge-inactive'}">${p.is_available ? 'Mevcut' : 'Tükendi'}</span>
          </div>
          <div class="item-card-meta">
            <span>📁 ${catName}</span>
            ${p.is_featured ? '<span style="color:var(--warning)">🔥 Öne Çıkan</span>' : ''}
          </div>
        </div>
        <div class="item-card-actions" style="flex-direction:column;">
          <button class="btn-icon" onclick='editProduct(${JSON.stringify(p).replace(/'/g, "&#39;")})'>✎</button>
          <button class="btn-icon danger" onclick="deleteProduct(${p.id})">🗑️</button>
        </div>
      </div>
    `;
  }).join('');
}

// Product Modal Logic
function openProductModal(prod = null) {
  const isEdit = !!prod;
  document.getElementById('productModalTitle').textContent = isEdit ? 'Ürünü Düzenle' : 'Yeni Ürün';
  
  document.getElementById('prodEditId').value = isEdit ? prod.id : '';
  document.getElementById('prodName').value = isEdit ? prod.name : '';
  document.getElementById('prodCategory').value = isEdit ? prod.category_id : '';
  document.getElementById('prodDesc').value = isEdit ? prod.description : '';
  document.getElementById('prodPrice').value = isEdit ? prod.price : '';
  document.getElementById('prodOrder').value = isEdit ? prod.sort_order : '0';
  document.getElementById('prodAllergens').value = isEdit ? prod.allergens : '';
  document.getElementById('prodAvailable').checked = isEdit ? !!prod.is_available : true;
  document.getElementById('prodFeatured').checked = isEdit ? !!prod.is_featured : false;
  
  // Reset Image preview
  document.getElementById('prodImage').value = '';
  const preview = document.getElementById('prodImagePreview');
  if (isEdit && prod.image_url) {
    preview.innerHTML = `<img src="${prod.image_url}">`;
  } else {
    preview.innerHTML = `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg><span>Görsel Ekle</span>`;
  }
  
  document.getElementById('productModal').style.display = 'flex';
}

window.editProduct = openProductModal;

function closeProductModal() {
  document.getElementById('productModal').style.display = 'none';
}

window.previewProductImage = function() {
  const file = document.getElementById('prodImage').files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      document.getElementById('prodImagePreview').innerHTML = `<img src="${e.target.result}">`;
    }
    reader.readAsDataURL(file);
  }
};

async function saveProduct(e) {
  e.preventDefault();
  const id = document.getElementById('prodEditId').value;
  
  const formData = new FormData();
  formData.append('name', document.getElementById('prodName').value);
  formData.append('category_id', document.getElementById('prodCategory').value);
  formData.append('description', document.getElementById('prodDesc').value);
  formData.append('price', document.getElementById('prodPrice').value);
  formData.append('sort_order', document.getElementById('prodOrder').value || 0);
  formData.append('allergens', document.getElementById('prodAllergens').value);
  formData.append('is_available', document.getElementById('prodAvailable').checked ? 1 : 0);
  formData.append('is_featured', document.getElementById('prodFeatured').checked ? 1 : 0);
  
  const file = document.getElementById('prodImage').files[0];
  if (file) formData.append('image', file);
  
  try {
    if (id) {
      await API.put(`/api/products/${id}`, formData, true);
      showToast('Ürün güncellendi', 'success');
    } else {
      await API.post('/api/products', formData, true);
      showToast('Ürün eklendi', 'success');
    }
    closeProductModal();
    loadProducts();
    loadOverviewStats();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteProduct(id) {
  if (!confirm('Bu ürünü silmek istediğinize emin misiniz?')) return;
  try {
    await API.delete(`/api/products/${id}`);
    showToast('Ürün silindi', 'success');
    loadProducts();
    loadOverviewStats();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ─── SETTINGS ───────────────────────────────
async function loadSettings() {
  try {
    const s = await API.get('/api/settings');
    window.currency = s.currency || '₺'; // Cache for products list
    
    document.getElementById('setName').value = s.restaurant_name || '';
    document.getElementById('setSlogan').value = s.slogan || '';
    document.getElementById('setPhone').value = s.phone || '';
    document.getElementById('setWifi').value = s.wifi_password || '';
    document.getElementById('setAddress').value = s.address || '';
    document.getElementById('setInstagram').value = s.instagram || '';
    
    document.getElementById('setPrimary').value = s.primary_color || '#e67e22';
    document.getElementById('setPrimaryText').value = s.primary_color || '#e67e22';
    document.getElementById('setSecondary').value = s.secondary_color || '#2c3e50';
    document.getElementById('setSecondaryText').value = s.secondary_color || '#2c3e50';
    document.getElementById('setAccent').value = s.accent_color || '#e74c3c';
    document.getElementById('setAccentText').value = s.accent_color || '#e74c3c';
    
    document.getElementById('setTheme').value = s.theme || 'dark';
    document.getElementById('setCurrency').value = s.currency || '₺';
    
    if (s.logo_url) {
      document.getElementById('logoPreview').innerHTML = `<img src="${s.logo_url}">`;
    }
    
    // Bind color inputs sync
    const binds = ['Primary', 'Secondary', 'Accent'];
    binds.forEach(b => {
      document.getElementById(`set${b}`).addEventListener('input', e => {
        document.getElementById(`set${b}Text`).value = e.target.value;
      });
      document.getElementById(`set${b}Text`).addEventListener('input', e => {
        if(/^#[0-9A-F]{6}$/i.test(e.target.value)) document.getElementById(`set${b}`).value = e.target.value;
      });
    });
    
  } catch (err) {
    showToast('Ayarlar yüklenemedi', 'error');
  }
}

async function saveSettings() {
  const data = {
    restaurant_name: document.getElementById('setName').value,
    slogan: document.getElementById('setSlogan').value,
    phone: document.getElementById('setPhone').value,
    wifi_password: document.getElementById('setWifi').value,
    address: document.getElementById('setAddress').value,
    instagram: document.getElementById('setInstagram').value,
    primary_color: document.getElementById('setPrimaryText').value,
    secondary_color: document.getElementById('setSecondaryText').value,
    accent_color: document.getElementById('setAccentText').value,
    theme: document.getElementById('setTheme').value,
    currency: document.getElementById('setCurrency').value
  };
  
  try {
    await API.put('/api/settings', data);
    window.currency = data.currency;
    showToast('Ayarlar kaydedildi', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

window.uploadLogo = async function() {
  const file = document.getElementById('logoInput').files[0];
  if (!file) return;
  
  const formData = new FormData();
  formData.append('file', file);
  
  try {
    const uploadRes = await API.post('/api/upload', formData, true);
    await API.put('/api/settings', { logo_url: uploadRes.url });
    document.getElementById('logoPreview').innerHTML = `<img src="${uploadRes.url}">`;
    showToast('Logo güncellendi', 'success');
  } catch (err) {
    showToast('Logo yüklenemedi', 'error');
  }
};

// ─── QR CODE ────────────────────────────────
async function loadQRCode() {
  try {
    const res = await API.get('/api/qr');
    document.getElementById('qrPreview').innerHTML = `<img src="${res.qr}" alt="QR Kod">`;
    document.getElementById('qrUrl').innerHTML = `<a href="${res.url}" target="_blank" style="color:var(--text); text-decoration:none;">${res.url}</a>`;
  } catch (err) {
    document.getElementById('qrPreview').innerHTML = `<div class="qr-loading" style="color:var(--danger)">QR Kod Yüklenemedi</div>`;
  }
}

window.downloadQR = function() {
  window.open('/api/qr/download', '_blank');
};

window.printQR = async function() {
  try {
    const res = await API.get('/api/qr');
    const s = await API.get('/api/settings');
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>${s.restaurant_name} - QR Menü</title>
          <style>
            body { font-family: sans-serif; text-align: center; padding: 40px; }
            img { max-width: 400px; margin-bottom: 20px; }
            h1 { color: #333; margin-bottom: 10px; }
            p { color: #666; font-size: 18px; }
          </style>
        </head>
        <body>
          <h1>${s.restaurant_name}</h1>
          <p>QR Kodu okutarak menümüze ulaşabilirsiniz.</p>
          <img src="${res.qr}" />
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  } catch(err) {
    showToast('Yazdırma işlemi başarısız', 'error');
  }
};

// ─── UTILS ──────────────────────────────────
let toastTimeout;
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.style.display = 'block';
  toast.style.animation = 'none';
  toast.offsetHeight; // force reflow
  toast.style.animation = 'toastIn 0.3s ease-out forwards';
  
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.style.display = 'none';
  }, 3000);
}
