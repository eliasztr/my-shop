// product.js - Product Details Page

const params = new URLSearchParams(location.search);
const productId = params.get('id');
let currentProduct = null;
let selectedQty = 1;
let currentImageIndex = 0;
let productImages = [];

function getAnonUserId() {
  let id = localStorage.getItem('anonUserId');
  if (!id) { id = 'anon_' + Math.random().toString(36).substr(2, 9); localStorage.setItem('anonUserId', id); }
  return id;
}

async function loadProduct() {
  if (!productId) {
    document.getElementById('productDetails').innerHTML = '<p style="text-align:center;padding:60px;color:#999">Product not found.</p>';
    return;
  }
  fetch(`/products/${productId}/view`, { method: 'POST' }).catch(() => {});
  try {
    const res = await fetch(`/products/${productId}`);
    if (!res.ok) throw new Error('Not found');
    currentProduct = await res.json();
    renderProductDetails(currentProduct);
    if (currentProduct.category) loadRelated(currentProduct.category);
  } catch (err) {
    document.getElementById('productDetails').innerHTML = '<p style="text-align:center;padding:60px;color:#999">Product not found.</p>';
  }
}

function renderProductDetails(p) {
  productImages = (p.images && p.images.length > 0) ? p.images : [p.image || 'https://via.placeholder.com/380x380?text=No+Image'];
  currentImageIndex = 0;

  const price = parseFloat(p.price) || 0;
  const salePrice = p.salePrice ? parseFloat(p.salePrice) : null;
  const hasDiscount = salePrice && salePrice < price;
  const displayPrice = hasDiscount ? salePrice : price;
  const userRating = parseInt(localStorage.getItem(`rating_${p.id}`)) || 0;

  // Build thumbnail strip (always show even for 1 image)
  const thumbsHtml = `
    <div class="product-thumbnails" id="productThumbs">
      ${productImages.map((img, i) => `
        <img src="${img}" alt="" class="${i === 0 ? 'active' : ''}"
          onclick="setMainImage(${i})" loading="lazy"
          onerror="this.src='https://via.placeholder.com/80x80?text=?'">
      `).join('')}
    </div>
  `;

  // Carousel arrows only if more than 1 image
  const arrowsHtml = productImages.length > 1 ? `
    <button class="carousel-prev" onclick="prevImage()">&#8249;</button>
    <button class="carousel-next" onclick="nextImage()">&#8250;</button>
    <div class="carousel-dots" id="carouselDots">
      ${productImages.map((_, i) => `<span class="${i===0?'active':''}" onclick="setMainImage(${i})"></span>`).join('')}
    </div>
  ` : '';

  document.getElementById('productDetails').innerHTML = `
    <div class="product-images">
      <div class="product-main-image" id="mainImageWrap" onclick="openImageModal(productImages[currentImageIndex])">
        <img id="mainProductImg" src="${productImages[0]}" alt="${p.name}"
          onerror="this.src='https://via.placeholder.com/380x380?text=No+Image'">
        ${arrowsHtml}
      </div>
      ${productImages.length > 1 ? thumbsHtml : ''}
    </div>

    <div class="product-info-panel">
      <h1>${p.name}</h1>

      ${p.ratingsCount > 0 ? `
        <div class="product-info-rating">
          ${renderStars(p.averageRating)}
          <span>(${p.ratingsCount} rating${p.ratingsCount !== 1 ? 's' : ''})</span>
        </div>
      ` : ''}

      <div class="product-price-block">
        <span class="product-price-current">$${displayPrice.toFixed(2)}</span>
        ${hasDiscount ? `
          <span class="product-price-old">$${price.toFixed(2)}</span>
          <span class="product-sale-badge">-${p.salePercentage || Math.round((price-salePrice)/price*100)}% SALE</span>
        ` : ''}
      </div>

      ${p.description ? `<p class="product-description">${p.description}</p>` : ''}

      <div class="quantity-selector">
        <span class="qty-label">Qty:</span>
        <button class="qty-btn" onclick="changeQty(-1)">−</button>
        <input type="text" class="qty-value" id="qtyValue" value="1" readonly>
        <button class="qty-btn" onclick="changeQty(1)">+</button>
      </div>

      <div class="product-actions">
        <button class="btn-add-cart" onclick="addToCartProduct()">🛒 Add to Cart</button>
        <button class="btn-buy-now" onclick="buyNow()">⚡ Buy Now</button>
      </div>

      <div class="rating-section">
        <h3>Rate this product</h3>
        <div class="stars-input" id="starsInput">
          ${[1,2,3,4,5].map(n => `
            <span data-val="${n}" class="${n <= userRating ? 'filled' : ''}"
              onmouseover="highlightStars(${n})"
              onmouseout="resetStars()"
              onclick="submitRating(${n})">★</span>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  document.title = `${p.name} - My Shop`;
  setTimeout(initSwipe, 100);
}

// ============ CAROUSEL ============
function setMainImage(index) {
  currentImageIndex = index;
  document.getElementById('mainProductImg').src = productImages[index];
  // Update thumbnails
  document.querySelectorAll('#productThumbs img').forEach((img, i) => img.classList.toggle('active', i === index));
  // Update dots
  document.querySelectorAll('#carouselDots span').forEach((dot, i) => dot.classList.toggle('active', i === index));
}

function nextImage() {
  setMainImage((currentImageIndex + 1) % productImages.length);
}

function prevImage() {
  setMainImage((currentImageIndex - 1 + productImages.length) % productImages.length);
}

function changeMainImage(el, src) {
  document.getElementById('mainProductImg').src = src;
  document.querySelectorAll('.product-thumbnails img').forEach(img => img.classList.remove('active'));
  el.classList.add('active');
}

function changeQty(delta) {
  selectedQty = Math.max(1, selectedQty + delta);
  document.getElementById('qtyValue').value = selectedQty;
}

function addToCartProduct() {
  if (!currentProduct) return;
  const cart = getCart();
  const existing = cart.find(i => i.id === currentProduct.id);
  if (existing) { existing.qty += selectedQty; } else { cart.push({ ...currentProduct, qty: selectedQty }); }
  saveCart(cart);
  showToast(`Added ${selectedQty}× to cart! 🛒`, 'success');
}

function buyNow() {
  if (!currentProduct) return;
  location.href = `checkout.html?direct=true&id=${currentProduct.id}&qty=${selectedQty}`;
}

// ============ RATING ============
function highlightStars(n) {
  document.querySelectorAll('#starsInput span').forEach(s => s.classList.toggle('filled', parseInt(s.dataset.val) <= n));
}
function resetStars() {
  const saved = parseInt(localStorage.getItem(`rating_${productId}`) || 0);
  document.querySelectorAll('#starsInput span').forEach(s => s.classList.toggle('filled', parseInt(s.dataset.val) <= saved));
}
async function submitRating(stars) {
  const userId = getAnonUserId();
  try {
    await fetch(`/products/${productId}/rate`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stars, userId })
    });
    localStorage.setItem(`rating_${productId}`, stars);
    showToast(`Rated ${stars} star${stars > 1 ? 's' : ''}! ⭐`, 'success');
  } catch (err) { showToast('Rating failed', 'error'); }
}


// ============ TOUCH SWIPE ============
let touchStartX = 0;
function initSwipe() {
  const wrap = document.getElementById('mainImageWrap');
  if (!wrap) return;
  wrap.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
  wrap.addEventListener('touchend', e => {
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) { // min swipe distance
      if (diff > 0) nextImage(); else prevImage();
    }
  }, { passive: true });
}

// ============ IMAGE MODAL ============
function openImageModal(src) {
  document.getElementById('imageModalImg').src = src;
  document.getElementById('imageModal').classList.add('open');
}
function closeImageModal() { document.getElementById('imageModal').classList.remove('open'); }

// ============ RELATED ============
async function loadRelated(category) {
  try {
    const res = await fetch('/products');
    const all = await res.json();
    const related = all.filter(p => p.category === category && p.id !== productId).slice(0, 4);
    if (related.length === 0) return;
    document.getElementById('relatedSection').style.display = 'block';
    allProducts = all;
    document.getElementById('relatedGrid').innerHTML = related.map(renderProductCard).join('');
  } catch (err) {}
}

// Init
updateCartCount();
loadProduct();
