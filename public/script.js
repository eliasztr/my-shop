// ============ CART UTILS ============
function getCart() { return JSON.parse(localStorage.getItem('cart') || '[]'); }
function saveCart(cart) { localStorage.setItem('cart', JSON.stringify(cart)); updateCartCount(); }
function updateCartCount() {
  const cart = getCart();
  const count = cart.reduce((s, i) => s + i.qty, 0);
  document.querySelectorAll('#cartCount').forEach(el => el.textContent = count);
}

function addToCart(product) {
  const cart = getCart();
  const existing = cart.find(i => i.id === product.id);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({ ...product, qty: 1 });
  }
  saveCart(cart);
  showToast('Added to cart! 🛒', 'success');
}

// ============ TOAST ============
function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.className = `toast ${type} show`;
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// ============ RENDER STARS ============
function renderStars(rating) {
  const r = parseFloat(rating) || 0;
  const full = Math.floor(r);
  const empty = 5 - full;
  return '★'.repeat(full) + '☆'.repeat(empty);
}

// ============ RENDER PRODUCT CARD ============
function renderProductCard(p) {
  try {
    const img = (p.images && p.images[0]) || p.image || 'https://via.placeholder.com/220x220?text=No+Image';
    // Always parse as float — fixes "15" string prices from manually added Firebase items
    const price = parseFloat(p.price) || 0;
    const salePrice = p.salePrice ? parseFloat(p.salePrice) : null;
    const hasDiscount = salePrice && salePrice < price;
    const displayPrice = hasDiscount ? salePrice : price;

    return `
      <div class="product-card" onclick="location.href='product.html?id=${p.id}'">
        <div class="product-card-image">
          <img src="${img}" alt="${p.name}" loading="lazy" onerror="this.src='https://via.placeholder.com/220x220?text=No+Image'">
          ${hasDiscount ? `<span class="sale-badge">-${p.salePercentage || Math.round((price-salePrice)/price*100)}% SALE</span>` : ''}
        </div>
        <div class="product-card-info">
          <div class="product-card-name">${p.name || 'Unnamed'}</div>
          <div class="product-card-price">
            <span class="price-current">$${displayPrice.toFixed(2)}</span>
            ${hasDiscount ? `<span class="price-old">$${price.toFixed(2)}</span>` : ''}
          </div>
          ${p.ratingsCount > 0 ? `
            <div class="product-card-rating">
              ${renderStars(p.averageRating)}
              <span>(${p.ratingsCount})</span>
            </div>
          ` : ''}
          ${p.description ? `<div class="product-card-description">${p.description}</div>` : ''}
          <div class="product-card-meta">
            ${p.sold ? `<span class="meta-sold">🔥 ${p.sold} sold</span>` : ''}
            ${p.stock !== undefined && p.stock !== null ? `<span class="meta-stock ${p.stock === 0 ? 'out' : p.stock <= 5 ? 'low' : ''}">${p.stock === 0 ? '❌ Out of stock' : p.stock <= 5 ? `⚠️ Only ${p.stock} left` : `✅ ${p.stock} in stock`}</span>` : ''}
          </div>
          <button class="btn-cart" onclick="event.stopPropagation(); addToCartFromCard('${p.id}')" ${p.stock === 0 ? 'disabled style="opacity:0.5;cursor:not-allowed"' : ''}>Add to Cart</button>
        </div>
      </div>
    `;
  } catch(e) {
    console.error('Error rendering product:', p, e);
    return '';
  }
}

// ============ LOAD PRODUCTS ============
let allProducts = [];
let activeCategory = null;

async function loadProducts() {
  try {
    const res = await fetch('/products');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    allProducts = await res.json();
    renderProducts(allProducts);
  } catch (err) {
    console.error('loadProducts error:', err);
    const grid = document.getElementById('productsGrid');
    if (grid) grid.innerHTML = `<p style="color:red;text-align:center;padding:40px">Failed to load products: ${err.message}</p>`;
  }
}

function renderProducts(products) {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;
  if (!products || products.length === 0) {
    grid.innerHTML = '<p style="text-align:center;color:#999;padding:40px">No products found.</p>';
    return;
  }
  grid.innerHTML = products.map(renderProductCard).join('');
}

function filterProducts() {
  const query = document.getElementById('searchInput')?.value.toLowerCase() || '';
  let filtered = allProducts;
  if (activeCategory) filtered = filtered.filter(p => p.category === activeCategory);
  if (query) filtered = filtered.filter(p => p.name && p.name.toLowerCase().includes(query));
  renderProducts(filtered);
}

function filterByCategory(cat, el) {
  activeCategory = cat;
  document.querySelectorAll('.category-link').forEach(l => l.classList.remove('active'));
  if (el) el.classList.add('active');
  filterProducts();
}

function addToCartFromCard(id) {
  const product = allProducts.find(p => p.id === id);
  if (product) addToCart(product);
}

// ============ LOAD CATEGORIES ============
async function loadCategories() {
  try {
    const res = await fetch('/categories');
    const categories = await res.json();
    const bar = document.getElementById('categoriesBar');
    if (!bar || categories.length === 0) return;
    bar.innerHTML += categories.map(c =>
      `<a href="#" class="category-link" onclick="filterByCategory('${c.name}', this); return false;">${c.name}</a>`
    ).join('');
  } catch (err) {}
}

// ============ HERO SLIDESHOW ============
let heroImages = [];
let heroIndex = 0;
let heroTimer = null;

async function loadHero() {
  try {
    const res = await fetch('/settings');
    const settings = await res.json();
    if (settings.heroHeading) document.getElementById('heroHeading').textContent = settings.heroHeading;
    if (settings.heroSubtitle) document.getElementById('heroSubtitle').textContent = settings.heroSubtitle;
    if (settings.heroBtn) document.getElementById('heroBtn').textContent = settings.heroBtn;

    // Build image list: heroImages array OR fallback to heroBg single
    heroImages = [];
    if (settings.heroImages && settings.heroImages.length > 0) {
      heroImages = settings.heroImages;
    } else if (settings.heroBg) {
      heroImages = [settings.heroBg];
    }

    initHeroSlideshow();
    if (settings.offerBannerEnabled) loadOfferBanner(settings);
  } catch (err) {}
}

function initHeroSlideshow() {
  const slidesEl = document.getElementById('heroSlides');
  const dotsEl = document.getElementById('heroDots');
  const prevBtn = document.getElementById('heroPrev');
  const nextBtn = document.getElementById('heroNext');
  if (!slidesEl) return;

  if (heroImages.length === 0) return; // keep default gradient

  // Build slides
  slidesEl.innerHTML = heroImages.map(url =>
    `<div class="hero-slide" style="background-image:url('${url}')"></div>`
  ).join('');

  // Build dots & show arrows only if more than 1
  if (heroImages.length > 1) {
    dotsEl.innerHTML = heroImages.map((_, i) =>
      `<span class="${i===0?'active':''}" onclick="goHeroSlide(${i})"></span>`
    ).join('');
    if (prevBtn) prevBtn.style.display = 'flex';
    if (nextBtn) nextBtn.style.display = 'flex';
    // Auto-advance every 4 seconds
    heroTimer = setInterval(() => heroSlide(1), 4000);
  }

  // Touch swipe on hero
  const hero = document.getElementById('heroSection');
  if (hero) {
    let tx = 0;
    hero.addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, { passive: true });
    hero.addEventListener('touchend', e => {
      const diff = tx - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 40) heroSlide(diff > 0 ? 1 : -1);
    }, { passive: true });
  }
}

function goHeroSlide(index) {
  heroIndex = index;
  document.getElementById('heroSlides').style.transform = `translateX(-${heroIndex * 100}%)`;
  document.querySelectorAll('#heroDots span').forEach((d, i) => d.classList.toggle('active', i === heroIndex));
  if (heroTimer) { clearInterval(heroTimer); heroTimer = setInterval(() => heroSlide(1), 4000); }
}

function heroSlide(dir) {
  heroIndex = (heroIndex + dir + heroImages.length) % heroImages.length;
  goHeroSlide(heroIndex);
}

// ============ OFFERS BANNER ============
function loadOfferBanner(settings) {
  if (sessionStorage.getItem('bannerDismissed')) return;
  const banner = document.getElementById('offersBanner');
  const text = document.getElementById('offersText');
  if (!banner || !text) return;
  const msg = settings.offerText || '🛍️ Special offer available!';
  text.textContent = msg;
  banner.classList.add('visible');
}

function dismissBanner() {
  sessionStorage.setItem('bannerDismissed', '1');
  document.getElementById('offersBanner')?.classList.remove('visible');
}

// ============ INIT ============
updateCartCount();
if (document.getElementById('heroHeading')) loadHero();
if (document.getElementById('categoriesBar')) loadCategories();
if (document.getElementById('productsGrid')) loadProducts();
