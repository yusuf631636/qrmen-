/* ═══════════════════════════════════════════════════
   QR MENÜ — Customer Menu Logic
   ═══════════════════════════════════════════════════ */

let menuData = null;
let currentCategory = 'all';

// DOM Elements
const els = {
  loader: document.getElementById('loader'),
  hero: document.getElementById('hero'),
  heroLogo: document.getElementById('heroLogo'),
  restaurantName: document.getElementById('restaurantName'),
  restaurantSlogan: document.getElementById('restaurantSlogan'),
  heroPhone: document.getElementById('heroPhone'),
  phoneText: document.getElementById('phoneText'),
  heroWifi: document.getElementById('heroWifi'),
  wifiText: document.getElementById('wifiText'),
  
  categoryNav: document.getElementById('categoryNavInner'),
  menuContent: document.getElementById('menuContent'),
  emptyState: document.getElementById('emptyState'),
  searchEmpty: document.getElementById('searchEmpty'),
  
  searchInput: document.getElementById('searchInput'),
  searchClear: document.getElementById('searchClear'),
  
  footerAddress: document.getElementById('footerAddress'),
  footerInsta: document.getElementById('footerInsta'),
  instaText: document.getElementById('instaText')
};

// ─── INITIALIZATION ─────────────────────────
async function init() {
  try {
    const res = await fetch('/api/menu');
    const data = await res.json();
    menuData = data;
    
    applySettings(data.settings);
    renderCategories(data.menu);
    renderMenu(data.menu);
    
    setTimeout(() => {
      els.loader.classList.add('hidden');
    }, 500);
  } catch (error) {
    console.error('Menu load error:', error);
    els.loader.innerHTML = '<p style="color:#e74c3c">Menü yüklenemedi. Lütfen sayfayı yenileyin.</p>';
  }
}

// ─── SETTINGS & THEME ────────────────────────
function applySettings(settings) {
  if (!settings) return;
  
  const root = document.documentElement;
  root.style.setProperty('--primary', settings.primary_color || '#e67e22');
  root.style.setProperty('--secondary', settings.secondary_color || '#2c3e50');
  root.style.setProperty('--accent', settings.accent_color || '#e74c3c');
  
  if (settings.theme === 'light') {
    document.body.classList.add('theme-light');
  }
  
  els.restaurantName.textContent = settings.restaurant_name || 'Restoran';
  document.title = `${settings.restaurant_name || 'Restoran'} - QR Menü`;
  
  if (settings.slogan) els.restaurantSlogan.textContent = settings.slogan;
  else els.restaurantSlogan.style.display = 'none';
  
  if (settings.logo_url) {
    els.heroLogo.innerHTML = `<img src="${settings.logo_url}" alt="Logo">`;
  } else {
    els.heroLogo.innerHTML = `<span class="hero-logo-placeholder">${settings.restaurant_name ? settings.restaurant_name.charAt(0) : 'R'}</span>`;
  }
  
  if (settings.phone) {
    els.phoneText.textContent = settings.phone;
    els.heroPhone.style.display = 'flex';
  }
  if (settings.wifi_password) {
    els.wifiText.textContent = settings.wifi_password;
    els.heroWifi.style.display = 'flex';
  }
  if (settings.address) {
    els.footerAddress.textContent = settings.address;
    els.footerAddress.style.display = 'block';
  }
  if (settings.instagram) {
    els.instaText.textContent = settings.instagram;
    els.footerInsta.href = `https://instagram.com/${settings.instagram.replace('@', '')}`;
    els.footerInsta.style.display = 'inline-flex';
  }
  
  window.currency = settings.currency || '₺';
}

// ─── RENDER CATEGORIES ───────────────────────
function renderCategories(menu) {
  if (!menu || menu.length === 0) return;
  
  let html = `<button class="cat-pill active" data-id="all">Tümü</button>`;
  menu.forEach(cat => {
    if (cat.products && cat.products.length > 0) {
      html += `<button class="cat-pill" data-id="${cat.id}">${cat.icon} ${cat.name}</button>`;
    }
  });
  
  els.categoryNav.innerHTML = html;
  
  // Event listeners
  document.querySelectorAll('.cat-pill').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.cat-pill').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      currentCategory = e.target.dataset.id;
      els.searchInput.value = '';
      els.searchClear.style.display = 'none';
      renderMenu(menuData.menu);
      
      // If not 'all', scroll to category
      if (currentCategory !== 'all') {
        const catEl = document.getElementById(`cat-${currentCategory}`);
        if (catEl) {
          const y = catEl.getBoundingClientRect().top + window.scrollY - 120;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      }
    });
  });
}

// ─── RENDER MENU ──────────────────────────────
function renderMenu(menu, searchTerm = '') {
  els.menuContent.innerHTML = '';
  els.emptyState.style.display = 'none';
  els.searchEmpty.style.display = 'none';
  
  if (!menu || menu.length === 0) {
    els.emptyState.style.display = 'block';
    return;
  }
  
  let hasVisibleCategories = false;
  const term = searchTerm.toLowerCase();
  
  menu.forEach(cat => {
    // Filter out empty categories
    if (!cat.products || cat.products.length === 0) return;
    
    // Check category filter
    if (currentCategory !== 'all' && currentCategory != cat.id && !searchTerm) return;
    
    // Filter products by search term
    const visibleProducts = cat.products.filter(p => {
      if (!term) return true;
      return p.name.toLowerCase().includes(term) || (p.description && p.description.toLowerCase().includes(term));
    });
    
    if (visibleProducts.length === 0) return;
    
    hasVisibleCategories = true;
    
    const catDiv = document.createElement('div');
    catDiv.className = 'menu-category';
    catDiv.id = `cat-${cat.id}`;
    
    catDiv.innerHTML = `
      <div class="menu-category-header">
        <span class="menu-category-icon">${cat.icon}</span>
        <h3 class="menu-category-name">${cat.name}</h3>
        <span class="menu-category-count">${visibleProducts.length}</span>
      </div>
      <div class="menu-category-items">
        ${visibleProducts.map(p => createProductCard(p)).join('')}
      </div>
    `;
    
    els.menuContent.appendChild(catDiv);
  });
  
  if (!hasVisibleCategories) {
    if (searchTerm) els.searchEmpty.style.display = 'block';
    else els.emptyState.style.display = 'block';
  }
}

// ─── PRODUCT CARD TEMPLATE ───────────────────
function createProductCard(product) {
  const priceFormatted = `${product.price.toFixed(2)} ${window.currency}`;
  const imageHtml = product.image_url 
    ? `<div class="product-image"><img src="${product.image_url}" alt="${product.name}" loading="lazy"></div>`
    : `<div class="product-image"><div class="product-placeholder">${product.name.charAt(0)}</div></div>`;
    
  const badgeHtml = product.is_featured ? `<span class="product-badge badge-featured">🔥 Önerilen</span>` : '';
  const allergensHtml = product.allergens ? `<div class="product-allergens">⚠️ ${product.allergens}</div>` : '';
  
  return `
    <div class="product-card ${product.is_featured ? 'featured' : ''}" onclick='openProductModal(${JSON.stringify(product).replace(/'/g, "&#39;")})'>
      ${imageHtml}
      <div class="product-info">
        <h4 class="product-name">${product.name}</h4>
        ${product.description ? `<p class="product-desc">${product.description}</p>` : ''}
        <div class="product-bottom">
          <span class="product-price">${priceFormatted}</span>
          ${badgeHtml}
        </div>
        ${allergensHtml}
      </div>
    </div>
  `;
}

// ─── SEARCH ──────────────────────────────────
els.searchInput.addEventListener('input', (e) => {
  const val = e.target.value.trim();
  els.searchClear.style.display = val ? 'block' : 'none';
  
  if (val) {
    document.querySelectorAll('.cat-pill').forEach(b => b.classList.remove('active'));
    document.querySelector('.cat-pill[data-id="all"]')?.classList.add('active');
    currentCategory = 'all';
  }
  
  renderMenu(menuData.menu, val);
});

els.searchClear.addEventListener('click', () => {
  els.searchInput.value = '';
  els.searchClear.style.display = 'none';
  renderMenu(menuData.menu);
});

// ─── PRODUCT MODAL ───────────────────────────
document.body.insertAdjacentHTML('beforeend', `
  <div id="customerProductModal" class="product-modal-overlay" onclick="if(event.target===this)closeCustomerModal()">
    <div class="product-modal">
      <button class="product-modal-close" onclick="closeCustomerModal()">&times;</button>
      <div id="cModalImageContainer"></div>
      <div class="product-modal-body">
        <h2 id="cModalName" class="product-modal-name"></h2>
        <div id="cModalAllergens" class="product-modal-allergens"></div>
        <p id="cModalDesc" class="product-modal-desc"></p>
        <div class="product-modal-meta">
          <span id="cModalPrice" class="product-modal-price"></span>
        </div>
      </div>
    </div>
  </div>
`);

const cModal = document.getElementById('customerProductModal');

window.openProductModal = function(product) {
  if (product.image_url) {
    document.getElementById('cModalImageContainer').innerHTML = `<img src="${product.image_url}" class="product-modal-image" alt="${product.name}">`;
  } else {
    document.getElementById('cModalImageContainer').innerHTML = `<div class="product-modal-image product-placeholder" style="height:200px">${product.name.charAt(0)}</div>`;
  }
  
  document.getElementById('cModalName').textContent = product.name;
  document.getElementById('cModalDesc').textContent = product.description || '';
  document.getElementById('cModalPrice').textContent = `${product.price.toFixed(2)} ${window.currency}`;
  
  const allergensContainer = document.getElementById('cModalAllergens');
  allergensContainer.innerHTML = '';
  if (product.allergens) {
    const arr = product.allergens.split(',').map(s => s.trim()).filter(Boolean);
    arr.forEach(a => {
      allergensContainer.innerHTML += `<span class="allergen-tag">${a}</span>`;
    });
  }
  
  cModal.classList.add('open');
  document.body.style.overflow = 'hidden';
};

window.closeCustomerModal = function() {
  cModal.classList.remove('open');
  document.body.style.overflow = '';
};

// Start
document.addEventListener('DOMContentLoaded', init);
