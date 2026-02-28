// admin.js

if (localStorage.getItem('adminToken') !== 'admin_logged_in') {
  location.href = 'admin-login.html';
}

function logout() {
  localStorage.removeItem('adminToken');
  location.href = 'admin-login.html';
}

// ============ TABS ============
function switchTab(name, el) {
  document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  el.classList.add('active');
  if (name === 'orders') loadOrders();
  if (name === 'categories') loadAdminCategories();
  if (name === 'settings') loadSettings();
  if (name === 'analytics') loadAnalytics();
}

// ============ IMAGE ACCUMULATOR ============
// Each gallery is stored as an array of { type: 'existing'|'new', url, file }
// addImagesList  → for the ADD product form
// editImagesList → for the EDIT modal

let addGallery = [];    // { type:'new', file, previewUrl }
let editGallery = [];   // { type:'existing', url } or { type:'new', file, previewUrl }
let heroGallery = [];   // { type:'existing', url } or { type:'new', file, previewUrl }

function accumulateImages(input, listId, hiddenId) {
  const isEdit = listId === 'editImagesList';
  const gallery = isEdit ? editGallery : addGallery;

  Array.from(input.files).forEach(file => {
    const previewUrl = URL.createObjectURL(file);
    gallery.push({ type: 'new', file, previewUrl });
  });

  // Reset input so same file can be selected again
  input.value = '';

  renderGallery(listId, isEdit ? editGallery : addGallery, isEdit);
}

function accumulateHeroImages(input) {
  Array.from(input.files).forEach(file => {
    const previewUrl = URL.createObjectURL(file);
    heroGallery.push({ type: 'new', file, previewUrl });
  });
  input.value = '';
  renderHeroGallery();
}

function renderHeroGallery() {
  const container = document.getElementById('heroImagesList');
  if (!container) return;
  if (heroGallery.length === 0) {
    container.innerHTML = '<p style="color:#bbb;font-size:13px;padding:4px 0">No images yet — will use default gradient</p>';
    return;
  }
  container.innerHTML = heroGallery.map((item, i) => `
    <div class="image-preview-item">
      <img src="${item.type === 'existing' ? item.url : item.previewUrl}"
           onerror="this.src='https://via.placeholder.com/80x80?text=?'">
      <span class="remove-img" onclick="removeHeroImage(${i})" title="Remove">✕</span>
      ${i === 0 ? '<span style="position:absolute;bottom:0;left:0;right:0;background:rgba(201,168,76,0.85);color:#1a1a2e;font-size:9px;text-align:center;padding:2px;font-weight:bold">FIRST</span>' : ''}
    </div>
  `).join('');
}

function removeHeroImage(index) {
  heroGallery.splice(index, 1);
  renderHeroGallery();
}

function renderGallery(listId, gallery, isEdit) {
  const container = document.getElementById(listId);
  if (!container) return;

  if (gallery.length === 0) {
    container.innerHTML = '<p style="color:#bbb;font-size:13px;padding:4px 0">No images yet</p>';
    return;
  }

  container.innerHTML = gallery.map((item, i) => `
    <div class="image-preview-item">
      <img src="${item.type === 'existing' ? item.url : item.previewUrl}"
           onerror="this.src='https://via.placeholder.com/80x80?text=?'">
      <span class="remove-img" onclick="removeGalleryImage(${i}, ${isEdit})" title="Remove">✕</span>
      ${i === 0 ? '<span style="position:absolute;bottom:0;left:0;right:0;background:rgba(201,168,76,0.85);color:#1a1a2e;font-size:9px;text-align:center;padding:2px;font-weight:bold">MAIN</span>' : ''}
    </div>
  `).join('');
}

function removeGalleryImage(index, isEdit) {
  if (isEdit) {
    editGallery.splice(index, 1);
    renderGallery('editImagesList', editGallery, true);
  } else {
    addGallery.splice(index, 1);
    renderGallery('addImagesList', addGallery, false);
  }
}

// ============ PRODUCTS ============
let allAdminProducts = [];

async function loadAdminProducts() {
  try {
    const res = await fetch('/products');
    allAdminProducts = await res.json();
    document.getElementById('productCount').textContent = `(${allAdminProducts.length})`;
    renderAdminProducts(allAdminProducts);
    const cats = [...new Set(allAdminProducts.map(p => p.category).filter(Boolean))];
    document.querySelectorAll('#categoryList').forEach(dl => {
      dl.innerHTML = cats.map(c => `<option value="${c}">`).join('');
    });
  } catch (err) {
    document.getElementById('adminProductsList').innerHTML = '<p style="color:red">Failed to load products.</p>';
  }
}

function renderAdminProducts(products) {
  const container = document.getElementById('adminProductsList');
  if (products.length === 0) {
    container.innerHTML = '<p style="text-align:center;color:#999;padding:20px">No products yet.</p>';
    return;
  }
  container.innerHTML = products.map(p => {
    const img = (p.images && p.images[0]) || p.image || 'https://via.placeholder.com/64x64?text=?';
    const price = parseFloat(p.price) || 0;
    const salePrice = p.salePrice ? parseFloat(p.salePrice) : null;
    const hasDiscount = salePrice && salePrice < price;
    const imgCount = (p.images && p.images.length) || (p.image ? 1 : 0);
    return `
      <div class="admin-product-row">
        <img src="${img}" alt="${p.name}" onerror="this.src='https://via.placeholder.com/64x64?text=?'">
        <div class="admin-product-info">
          <strong>${p.name}</strong>
          <small>
            $${price.toFixed(2)}
            ${hasDiscount ? `→ <span style="color:var(--gold)">$${salePrice.toFixed(2)}</span>` : ''}
            ${p.category ? `| 🏷️ ${p.category}` : ''}
            | 🖼 ${imgCount} image(s)
            ${p.stock !== undefined && p.stock !== null ? `| 📦 ${p.stock} in stock` : ''}
            ${p.sold ? `| 🔥 ${p.sold} sold` : ''}
            ${p.views ? `| 👁 ${p.views}` : ''}
          </small>
        </div>
        <div class="admin-product-actions">
          <button class="btn-gold btn-sm" onclick="openEditModal('${p.id}')">Edit</button>
          <button class="btn-danger btn-sm" onclick="deleteProduct('${p.id}', this)">Delete</button>
        </div>
      </div>
    `;
  }).join('');
}

async function addProduct() {
  const name = document.getElementById('prodName').value.trim();
  const price = parseFloat(document.getElementById('prodPrice').value);
  const salePrice = parseFloat(document.getElementById('prodSalePrice').value) || null;
  const category = document.getElementById('prodCategory').value.trim();
  const description = document.getElementById('prodDescription').value.trim();
  const stock = document.getElementById('prodStock').value;

  if (!name || isNaN(price)) { showToast('Name and price are required!', 'error'); return; }
  if (addGallery.length === 0) { showToast('Please add at least one image!', 'error'); return; }

  const btn = document.getElementById('addProductBtn');
  btn.textContent = 'Uploading...'; btn.disabled = true;

  try {
    const formData = new FormData();
    formData.append('name', name);
    formData.append('price', price);
    if (salePrice && salePrice < price) formData.append('salePrice', salePrice);
    formData.append('category', category);
    formData.append('description', description);
    if (stock !== '') formData.append('stock', parseInt(stock));
    for (const item of addGallery) {
      formData.append('images', item.file);
    }

    const res = await fetch('/products', { method: 'POST', body: formData });
    if (!res.ok) throw new Error(await res.text());

    showToast('Product added! ✅', 'success');
    clearAddForm();
    loadAdminProducts();
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  } finally {
    btn.textContent = '+ Add Product'; btn.disabled = false;
  }
}

function clearAddForm() {
  ['prodName','prodPrice','prodSalePrice','prodCategory','prodDescription','prodStock'].forEach(id => document.getElementById(id).value = '');
  addGallery = [];
  renderGallery('addImagesList', addGallery, false);
}

async function deleteProduct(id, btn) {
  if (!confirm('Delete this product?')) return;
  btn.textContent = '...'; btn.disabled = true;
  try {
    await fetch(`/products/${id}`, { method: 'DELETE' });
    showToast('Product deleted', 'error');
    loadAdminProducts();
  } catch (err) {
    showToast('Error deleting', 'error');
    btn.textContent = 'Delete'; btn.disabled = false;
  }
}

// ============ EDIT MODAL ============
function openEditModal(id) {
  const p = allAdminProducts.find(x => x.id === id);
  if (!p) return;

  // Build editGallery from existing images
  editGallery = [];
  const imgs = (p.images && p.images.length > 0) ? p.images : (p.image ? [p.image] : []);
  imgs.forEach(url => editGallery.push({ type: 'existing', url }));

  document.getElementById('editProductId').value = id;
  document.getElementById('editName').value = p.name || '';
  document.getElementById('editPrice').value = parseFloat(p.price) || '';
  document.getElementById('editSalePrice').value = p.salePrice || '';
  document.getElementById('editCategory').value = p.category || '';
  document.getElementById('editDescription').value = p.description || '';
  document.getElementById('editStock').value = p.stock !== undefined && p.stock !== null ? p.stock : '';
  document.getElementById('editImagesInput').value = '';

  renderGallery('editImagesList', editGallery, true);
  document.getElementById('editModal').classList.add('open');
}

function closeEditModal() {
  document.getElementById('editModal').classList.remove('open');
  editGallery = [];
}

async function saveProduct() {
  const id = document.getElementById('editProductId').value;
  const name = document.getElementById('editName').value.trim();
  const price = parseFloat(document.getElementById('editPrice').value);
  const salePrice = parseFloat(document.getElementById('editSalePrice').value) || 0;
  const category = document.getElementById('editCategory').value.trim();
  const description = document.getElementById('editDescription').value.trim();
  const stock = document.getElementById('editStock').value;

  if (!name || isNaN(price)) { showToast('Name and price are required!', 'error'); return; }

  const saveBtn = document.querySelector('#editModal .btn-gold');
  saveBtn.textContent = 'Saving...'; saveBtn.disabled = true;

  try {
    const formData = new FormData();
    formData.append('name', name);
    formData.append('price', price);
    formData.append('salePrice', salePrice);
    formData.append('category', category);
    formData.append('description', description);
    formData.append('stock', stock !== '' ? parseInt(stock) : '');

    // Existing images that were kept
    const existingUrls = editGallery.filter(i => i.type === 'existing').map(i => i.url);
    formData.append('existingImages', JSON.stringify(existingUrls));

    // New images to upload
    const newFiles = editGallery.filter(i => i.type === 'new');
    for (const item of newFiles) {
      formData.append('images', item.file);
    }

    const res = await fetch(`/products/${id}`, { method: 'PUT', body: formData });
    if (!res.ok) throw new Error(await res.text());

    showToast('Product updated! ✅', 'success');
    closeEditModal();
    loadAdminProducts();
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  } finally {
    saveBtn.textContent = 'Save Changes'; saveBtn.disabled = false;
  }
}

// ============ ORDERS ============
async function loadOrders() {
  try {
    const res = await fetch('/orders');
    const orders = await res.json();
    const container = document.getElementById('ordersContent');
    if (orders.length === 0) { container.innerHTML = '<p style="text-align:center;color:#999;padding:20px">No orders yet.</p>'; return; }
    container.innerHTML = `
      <table class="orders-table">
        <thead><tr>
          <th>Order ID</th><th>Customer</th><th>Phone</th><th>Total</th><th>Items</th><th>Status</th><th>Actions</th>
        </tr></thead>
        <tbody>
          ${orders.map(o => `
            <tr>
              <td>#${o.orderId || o.id.slice(-6)}</td>
              <td>${o.customerInfo?.name || '-'}</td>
              <td>${o.customerInfo?.phone || '-'}</td>
              <td style="color:var(--gold);font-weight:bold">$${(o.total || 0).toFixed(2)}</td>
              <td>${(o.items || []).length} item(s)</td>
              <td>
                <select onchange="updateOrderStatus('${o.id}', this.value)" style="padding:4px 8px;border-radius:4px;border:1px solid #ddd;font-size:13px">
                  ${[
                    {value:'قيد الانتظار', label:'قيد الانتظار'},
                    {value:'سائق', label:'سائق'},
                    {value:'وصل', label:'وصل'},
                    {value:'مؤجل', label:'مؤجل'},
                    {value:'ملغي', label:'ملغي'},
                  ].map(s =>
                    `<option value="${s.value}" ${o.status===s.value?'selected':''}>${s.label}</option>`
                  ).join('')}
                </select>
              </td>
              <td><button class="btn-gold btn-sm" onclick="viewOrderDetail('${o.id}')">View</button></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    window._orders = orders;
  } catch (err) {
    document.getElementById('ordersContent').innerHTML = '<p style="color:red">Failed to load orders.</p>';
  }
}

async function updateOrderStatus(id, status) {
  try {
    await fetch(`/orders/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    showToast('Status updated!', 'success');
  } catch (err) { showToast('Error updating status', 'error'); }
}

function viewOrderDetail(id) {
  const order = (window._orders || []).find(o => o.id === id);
  if (!order) return;
  document.getElementById('orderModalContent').innerHTML = `
    <p><strong>Order #${order.orderId || id.slice(-6)}</strong></p>
    <p><strong>Customer:</strong> ${order.customerInfo?.name}</p>
    <p><strong>Phone:</strong> ${order.customerInfo?.phone}</p>
    <p><strong>Address:</strong> ${order.customerInfo?.address}</p>
    ${order.customerInfo?.email ? `<p><strong>Email:</strong> ${order.customerInfo.email}</p>` : ''}
    <hr style="margin:12px 0">
    <p><strong>Items:</strong></p>
    ${(order.items || []).map(i => `<p>• ${i.name} ×${i.qty} = $${(i.price*i.qty).toFixed(2)}</p>`).join('')}
    <hr style="margin:12px 0">
    <p><strong>Total: $${(order.total || 0).toFixed(2)}</strong></p>
    <p><strong>Status:</strong> ${order.status || 'قيد الانتظار'}</p>
  `;
  document.getElementById('orderModal').classList.add('open');
}

// ============ CATEGORIES ============
let adminCategories = [];
async function loadAdminCategories() {
  try {
    const res = await fetch('/categories');
    adminCategories = await res.json();
    renderAdminCategories();
  } catch (err) {}
}

function renderAdminCategories() {
  const container = document.getElementById('categoriesList');
  if (!container) return;
  if (adminCategories.length === 0) { container.innerHTML = '<p style="color:#999;padding:20px">No categories yet.</p>'; return; }
  container.innerHTML = adminCategories.map(c => `
    <div style="display:flex;align-items:center;gap:12px;padding:12px;border-bottom:1px solid #f0f0f0">
      <span style="flex:1;font-size:15px">🏷️ ${c.name}</span>
      <button class="btn-danger btn-sm" onclick="deleteCategory('${c.id}')">Delete</button>
    </div>
  `).join('');
}

async function addCategory() {
  const name = document.getElementById('catName').value.trim();
  if (!name) { showToast('Category name required', 'error'); return; }
  try {
    await fetch('/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
    document.getElementById('catName').value = '';
    showToast('Category added!', 'success');
    loadAdminCategories();
  } catch (err) { showToast('Error', 'error'); }
}

async function deleteCategory(id) {
  if (!confirm('Delete this category?')) return;
  try {
    await fetch(`/categories/${id}`, { method: 'DELETE' });
    showToast('Category deleted', 'error');
    loadAdminCategories();
  } catch (err) { showToast('Error', 'error'); }
}

// ============ SETTINGS ============
async function loadSettings() {
  try {
    const res = await fetch('/settings');
    const s = await res.json();
    if (s.heroHeading) document.getElementById('heroHeadingInput').value = s.heroHeading;
    if (s.heroSubtitle) document.getElementById('heroSubtitleInput').value = s.heroSubtitle;
    if (s.heroBtn) document.getElementById('heroBtnInput').value = s.heroBtn;
    if (s.offerBannerEnabled) document.getElementById('offerEnabled').checked = true;
    if (s.offerText) document.getElementById('offerText').value = s.offerText;

    // Load existing hero images into gallery
    heroGallery = [];
    const imgs = s.heroImages && s.heroImages.length > 0 ? s.heroImages : (s.heroBg ? [s.heroBg] : []);
    imgs.forEach(url => heroGallery.push({ type: 'existing', url }));
    renderHeroGallery();
  } catch (err) {}
}

function fileToBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result.split(',')[1]);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

async function saveHeroSettings() {
  const btn = document.getElementById('saveHeroBtn');
  btn.textContent = 'Saving...'; btn.disabled = true;
  try {
    // Upload any new hero images to ImgBB
    const finalHeroImages = [];
    for (const item of heroGallery) {
      if (item.type === 'existing') {
        finalHeroImages.push(item.url);
      } else {
        // Upload new file to ImgBB
        const fd = new FormData();
        fd.append('image', await fileToBase64(item.file));
        const imgRes = await fetch('https://api.imgbb.com/1/upload?key=86e971094cfd307ebff7cfaf86cb8ad5', { method: 'POST', body: fd });
        const imgData = await imgRes.json();
        if (imgData.success) finalHeroImages.push(imgData.data.url);
      }
    }

    await fetch('/settings', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        heroHeading: document.getElementById('heroHeadingInput').value,
        heroSubtitle: document.getElementById('heroSubtitleInput').value,
        heroBtn: document.getElementById('heroBtnInput').value,
        heroImages: finalHeroImages,
        heroBg: finalHeroImages[0] || '',
      })
    });
    showToast('Hero settings saved! ✅', 'success');
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  } finally {
    btn.textContent = 'Save Hero'; btn.disabled = false;
  }
}

async function saveOfferSettings() {
  try {
    await fetch('/settings', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        offerBannerEnabled: document.getElementById('offerEnabled').checked,
        offerText: document.getElementById('offerText').value.trim(),
      })
    });
    showToast('Offer settings saved! ✅', 'success');
  } catch (err) { showToast('Error saving', 'error'); }
}

// ============ ANALYTICS ============
async function loadAnalytics() {
  try {
    const res = await fetch('/analytics');
    const data = await res.json();
    document.getElementById('analyticsContent').innerHTML = `
      <div class="analytics-grid">
        <div class="analytics-card"><div class="value">${data.totalProducts}</div><div class="label">Total Products</div></div>
        <div class="analytics-card"><div class="value">${data.totalOrders}</div><div class="label">Total Orders</div></div>
        <div class="analytics-card"><div class="value">$${parseFloat(data.totalRevenue||0).toFixed(2)}</div><div class="label">Total Revenue</div></div>
        <div class="analytics-card"><div class="value">$${data.avgOrderValue||0}</div><div class="label">Avg. Order Value</div></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">
        <div class="admin-card">
          <h2>👁️ Most Viewed</h2>
          ${(data.topViewed||[]).map(p=>`
            <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #f0f0f0">
              <img src="${(p.images&&p.images[0])||p.image||''}" width="40" height="40" style="object-fit:cover;border-radius:4px" onerror="this.style.display='none'">
              <div style="flex:1;font-size:14px">${p.name}</div>
              <strong style="color:var(--gold)">${p.views||0} views</strong>
            </div>`).join('')||'<p style="color:#999">No data</p>'}
        </div>
        <div class="admin-card">
          <h2>⭐ Highest Rated</h2>
          ${(data.topRated||[]).filter(p=>p.ratingsCount>0).map(p=>`
            <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #f0f0f0">
              <img src="${(p.images&&p.images[0])||p.image||''}" width="40" height="40" style="object-fit:cover;border-radius:4px" onerror="this.style.display='none'">
              <div style="flex:1;font-size:14px">${p.name}</div>
              <strong style="color:#f4a800">${p.averageRating}★</strong>
            </div>`).join('')||'<p style="color:#999">No ratings yet</p>'}
        </div>
      </div>
    `;
  } catch (err) {
    document.getElementById('analyticsContent').innerHTML = '<p style="color:red">Failed to load analytics.</p>';
  }
}

// Close modals on overlay click
document.getElementById('editModal').addEventListener('click', function(e) { if (e.target === this) closeEditModal(); });
document.getElementById('orderModal').addEventListener('click', function(e) { if (e.target === this) document.getElementById('orderModal').classList.remove('open'); });

// Init
loadAdminProducts();
