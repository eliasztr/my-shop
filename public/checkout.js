// checkout.js

let orderItems = [];

async function loadOrderItems() {
  const params = new URLSearchParams(location.search);
  const isDirect = params.get('direct') === 'true';

  if (isDirect) {
    const id = params.get('id');
    const qty = parseInt(params.get('qty')) || 1;
    try {
      const res = await fetch(`/products/${id}`);
      const product = await res.json();
      orderItems = [{ ...product, qty }];
    } catch (err) {
      orderItems = [];
    }
  } else {
    orderItems = getCart();
  }

  renderOrderSummary();
}

function renderOrderSummary() {
  const container = document.getElementById('orderItems');
  const totalEl = document.getElementById('orderTotal');

  if (orderItems.length === 0) {
    container.innerHTML = '<p style="color:#999">No items in order.</p>';
    totalEl.innerHTML = '';
    return;
  }

  const total = orderItems.reduce((s, i) => s + (parseFloat(i.salePrice || i.price) || 0) * i.qty, 0);

  container.innerHTML = orderItems.map(item => {
    const img = (item.images && item.images[0]) || item.image || '';
    const price = parseFloat(item.salePrice || item.price) || 0;
    return `
      <div class="checkout-item">
        ${img ? `<img src="${img}" alt="${item.name}" onerror="this.style.display='none'">` : ''}
        <div style="flex:1">
          <div style="font-weight:bold">${item.name}</div>
          <div style="color:var(--text-light);font-size:14px">$${price.toFixed(2)} × ${item.qty}</div>
        </div>
        <div style="font-weight:bold;color:var(--gold)">$${(price * item.qty).toFixed(2)}</div>
      </div>
    `;
  }).join('');

  totalEl.innerHTML = `Total: <span>$${total.toFixed(2)}</span>`;
}

function validatePhone(phone) {
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  return /^(\+961|00961|961)?(03|70|71|76|78|79|81|82|83|84|85|86|87|88|89)\d{6}$/.test(cleaned);
}

async function placeOrder() {
  let valid = true;
  const name = document.getElementById('fullName').value.trim();
  const phone = document.getElementById('phoneNum').value.trim();
  const address = document.getElementById('address').value.trim();
  const email = document.getElementById('email').value.trim();

  const nameErr = document.getElementById('nameError');
  const phoneErr = document.getElementById('phoneError');
  const addrErr = document.getElementById('addressError');

  nameErr.classList.remove('visible');
  phoneErr.classList.remove('visible');
  addrErr.classList.remove('visible');

  if (!name) { nameErr.classList.add('visible'); valid = false; }
  if (!phone || !validatePhone(phone)) { phoneErr.classList.add('visible'); valid = false; }
  if (!address) { addrErr.classList.add('visible'); valid = false; }

  if (!valid) { showToast('Please fill in all required fields', 'error'); return; }

  const btn = document.getElementById('placeOrderBtn');
  btn.textContent = 'Placing order...'; btn.disabled = true;

  const total = orderItems.reduce((s, i) => s + (parseFloat(i.salePrice || i.price) || 0) * i.qty, 0);
  const orderId = Date.now().toString().slice(-6);

  const orderData = {
    orderId,
    items: orderItems.map(i => ({ id: i.id, name: i.name, price: parseFloat(i.salePrice || i.price) || 0, qty: i.qty })),
    customerInfo: { name, phone, address, email },
    total,
    status: 'قيد الانتظار'
  };

  try {
    const res = await fetch('/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    });
    if (!res.ok) throw new Error('Server error');

    // Clear cart
    const params = new URLSearchParams(location.search);
    if (params.get('direct') !== 'true') {
      localStorage.removeItem('cart');
      updateCartCount();
    }

    // Show success screen
    showOrderSuccess(orderId, name);

  } catch (err) {
    showToast('Failed to place order. Please try again.', 'error');
    btn.textContent = 'Place Order'; btn.disabled = false;
  }
}

function showOrderSuccess(orderId, name) {
  document.querySelector('.checkout-section').innerHTML = `
    <div style="grid-column:1/-1;text-align:center;padding:60px 24px">
      <div style="font-size:72px;margin-bottom:24px">✅</div>
      <h2 style="font-size:28px;color:var(--navy);margin-bottom:12px">Order Placed Successfully!</h2>
      <p style="font-size:16px;color:#666;margin-bottom:8px">Thank you, <strong>${name}</strong>!</p>
      <p style="font-size:15px;color:#666;margin-bottom:32px">Your order <strong>#${orderId}</strong> has been received. We will contact you soon.</p>
      <a href="/" class="btn-primary" style="display:inline-block;text-decoration:none">Continue Shopping</a>
    </div>
  `;
}

updateCartCount();
loadOrderItems();
