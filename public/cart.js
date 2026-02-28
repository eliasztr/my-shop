// cart.js

function renderCart() {
  const cart = getCart();
  const container = document.getElementById('cartContent');
  updateCartCount();

  if (cart.length === 0) {
    container.innerHTML = `
      <div class="cart-empty">
        <div style="font-size:48px;margin-bottom:16px">🛒</div>
        Your cart is empty.<br>
        <a href="/">Continue Shopping</a>
      </div>
    `;
    return;
  }

  const total = cart.reduce((s, i) => s + (i.salePrice || i.price) * i.qty, 0);

  container.innerHTML = `
    ${cart.map(item => {
      const img = (item.images && item.images[0]) || item.image || 'https://via.placeholder.com/80x80?text=?';
      const price = (item.salePrice || item.price);
      return `
        <div class="cart-item">
          <img src="${img}" alt="${item.name}" onerror="this.src='https://via.placeholder.com/80x80?text=?'">
          <div class="cart-item-info">
            <div class="cart-item-name">${item.name}</div>
            <div class="cart-item-price">$${price.toFixed(2)} × ${item.qty} = <strong>$${(price * item.qty).toFixed(2)}</strong></div>
            <div style="display:flex;gap:8px;margin-top:8px;align-items:center">
              <button onclick="updateQty('${item.id}', -1)" style="background:var(--navy);color:white;border:none;border-radius:4px;width:28px;height:28px;cursor:pointer;font-size:16px">−</button>
              <span>${item.qty}</span>
              <button onclick="updateQty('${item.id}', 1)" style="background:var(--navy);color:white;border:none;border-radius:4px;width:28px;height:28px;cursor:pointer;font-size:16px">+</button>
            </div>
          </div>
          <button class="cart-item-remove" onclick="removeItem('${item.id}')">✕</button>
        </div>
      `;
    }).join('')}

    <div class="cart-summary">
      <div class="cart-total">Total: <span>$${total.toFixed(2)}</span></div>
      <button class="btn-checkout" onclick="location.href='checkout.html'">Proceed to Checkout →</button>
    </div>
  `;
}

function updateQty(id, delta) {
  const cart = getCart();
  const item = cart.find(i => i.id === id);
  if (item) {
    item.qty = Math.max(1, item.qty + delta);
    saveCart(cart);
  }
  renderCart();
}

function removeItem(id) {
  const cart = getCart().filter(i => i.id !== id);
  saveCart(cart);
  renderCart();
  showToast('Item removed', 'error');
}

renderCart();
