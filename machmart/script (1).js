'use strict';

// This is the existing AWS REST API from the serverless-for-beginners tutorial.
// Each POST creates ONE SQS message containing only productName and quantity.
const API_URL = 'https://05ncm1u46a.execute-api.us-east-1.amazonaws.com/prod/orders';
const PRODUCTS = [
  {id:'headphones',name:'Wireless Headphones',category:'Audio',price:2499,icon:'🎧',bg:'#e8e0fc',badge:'BEST SELLER',description:'Get lost in every beat.'},
  {id:'watch',name:'Smart Watch',category:'Tech',price:3299,icon:'⌚',bg:'#e5f5ed',badge:'POPULAR',description:'Your everyday companion.'},
  {id:'mouse',name:'Gaming Mouse',category:'Tech',price:1299,icon:'🖱️',bg:'#f5e9db',badge:'NEW',description:'Precision meets comfort.'},
  {id:'keyboard',name:'Mechanical Keyboard',category:'Workspace',price:3999,icon:'⌨️',bg:'#e4ecfa',badge:'HOT PICK',description:'A better way to type.'},
  {id:'speaker',name:'Portable Speaker',category:'Audio',price:1899,icon:'🔊',bg:'#fae4e8',badge:'TRENDING',description:'Big sound, small package.'},
  {id:'lamp',name:'Desk Lamp',category:'Workspace',price:999,icon:'💡',bg:'#fff0cc',badge:'',description:'Set the mood for focus.'},
  {id:'backpack',name:'Everyday Backpack',category:'Lifestyle',price:1599,icon:'🎒',bg:'#e2f0ee',badge:'STAFF PICK',description:'Carry what matters most.'},
  {id:'camera',name:'Instant Camera',category:'Lifestyle',price:4999,icon:'📷',bg:'#f7e7f3',badge:'',description:'Keep every little moment.'}
];

const $ = (selector) => document.querySelector(selector);
const rupees = (amount) => `₹${amount.toLocaleString('en-IN')}`;
const STORAGE_KEY = 'machmart-demo-cart-v1';
let cart = {};
let category = 'All';
let submitting = false;
let toastTimer;
try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
    for (const product of PRODUCTS) {
      const quantity = saved[product.id];
      if (Number.isInteger(quantity) && quantity > 0 && quantity <= 99) cart[product.id] = quantity;
    }
  }
} catch { cart = {}; }

function saveCart() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cart)); } catch { /* storage may be blocked */ }
}
function toast(message) {
  $('#toast').textContent = message;
  $('#toast').classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 2500);
}
function renderProducts() {
  const search = $('#searchInput').value.trim().toLowerCase();
  const visible = PRODUCTS.filter((p) => (category === 'All' || p.category === category) && `${p.name} ${p.category} ${p.description}`.toLowerCase().includes(search));
  $('#resultCount').textContent = `${visible.length} product${visible.length === 1 ? '' : 's'}`;
  $('#emptyState').hidden = visible.length > 0;
  // Product records are local constants, never untrusted user HTML.
  $('#productGrid').innerHTML = visible.map((p) => `
    <article class="product-card">
      <div class="product-art" style="background:${p.bg}">${p.badge ? `<span class="badge">${p.badge}</span>` : ''}<span class="product-symbol" aria-hidden="true">${p.icon}</span></div>
      <div class="product-body"><div class="product-category">${p.category}</div><h3>${p.name}</h3><p class="product-description">${p.description}</p>
      <div class="product-foot"><span class="price">${rupees(p.price)}</span><button class="add-btn" data-add="${p.id}" aria-label="Add ${p.name} to cart">+</button></div></div>
    </article>`).join('');
}
function cartEntries() { return PRODUCTS.filter((p) => cart[p.id] > 0); }
function updateCart() {
  const products = cartEntries();
  const count = products.reduce((sum, p) => sum + cart[p.id], 0);
  const total = products.reduce((sum, p) => sum + cart[p.id] * p.price, 0);
  $('#cartCount').textContent = count;
  $('#drawerCount').textContent = `(${count})`;
  $('#subtotal').textContent = rupees(total);
  $('#checkoutButton').disabled = !products.length || submitting;
  $('#cartItems').innerHTML = products.length ? products.map((p) => `
    <div class="cart-item"><div class="cart-thumbnail" style="background:${p.bg}">${p.icon}</div>
    <div><h3>${p.name}</h3><p>${rupees(p.price)} each</p>
      <div class="cart-actions"><button class="qty-btn" data-qty="${p.id}" data-change="-1" aria-label="Decrease ${p.name}">−</button><strong>${cart[p.id]}</strong><button class="qty-btn" data-qty="${p.id}" data-change="1" aria-label="Increase ${p.name}">+</button><button class="remove-btn" data-remove="${p.id}">Remove</button></div>
    </div></div>`).join('') : '<div class="cart-empty"><span class="big">🛍️</span>Your bag is empty.<br/>Add something you love!</div>';
  saveCart();
}
function openCart() {
  $('#overlay').hidden = false;
  $('#cartDrawer').classList.add('open');
  $('#cartDrawer').setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  $('#closeCart').focus();
}
function closeCart() {
  if (submitting) return;
  $('#overlay').hidden = true;
  $('#cartDrawer').classList.remove('open');
  $('#cartDrawer').setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  $('#openCart').focus();
}
function addToCart(id) {
  if (submitting) return;
  const product = PRODUCTS.find(p => p.id === id);
  if (!product) return;
  if ((cart[id] || 0) >= 99) return toast('Maximum 99 of each product.');
  cart[id] = (cart[id] || 0) + 1;
  updateCart();
  toast(`${product.name} added to bag ✓`);
}
function setCheckoutMessage(message, type = '') {
  const el = $('#checkoutMessage');
  el.textContent = message;
  el.className = type;
}

async function checkout() {
  if (submitting) return;
  const selected = cartEntries().map(p => ({id:p.id,name:p.name,quantity:cart[p.id]}));
  if (!selected.length) return;
  if (!window.confirm(`Submit ${selected.length} demo order line${selected.length === 1 ? '' : 's'} to AWS? No payment or delivery will occur.`)) return;
  submitting = true;
  $('#checkoutButton').textContent = 'Submitting to AWS...';
  updateCart();
  setCheckoutMessage('Sending demo orders to AWS. Please wait...');
  let success = 0;
  const failures = [];
  // The tutorial's backend accepts one product per request. Submit sequentially
  // to avoid claiming a full-cart success if one request fails.
  for (const item of selected) {
    try {
      const response = await fetch(API_URL, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({productName:item.name,quantity:item.quantity})
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (typeof data.messageId !== 'string' || !data.messageId) throw new Error('Missing SQS message ID');
      success++;
      // Keep any items added later if the inventory has changed (normally locked).
      cart[item.id] = Math.max(0, (cart[item.id] || 0) - item.quantity);
      if (!cart[item.id]) delete cart[item.id];
    } catch (err) {
      console.error('Submission failed for', item.name, err);
      failures.push(item.name);
    }
  }
  submitting = false;
  $('#checkoutButton').innerHTML = 'Submit demo order <span>→</span>';
  updateCart();
  if (!failures.length) {
    setCheckoutMessage(`${success} product line${success === 1 ? '' : 's'} accepted by AWS SQS! Database processing happens asynchronously. No payment was made.`, 'success');
    toast('Demo order submitted ✓');
  } else {
    setCheckoutMessage(`${success} line(s) submitted; ${failures.length} failed: ${failures.join(', ')}. Failed items remain in the cart. Check API Gateway / CORS / Lambda logs.`, 'error');
  }
}

$('#productGrid').addEventListener('click', e => {
  const button = e.target.closest('[data-add]');
  if (button) addToCart(button.dataset.add);
});
$('#filters').addEventListener('click', e => {
  const button = e.target.closest('[data-category]');
  if (!button) return;
  category = button.dataset.category;
  document.querySelectorAll('.filter').forEach(b => b.classList.toggle('active', b === button));
  renderProducts();
});
$('#searchInput').addEventListener('input', renderProducts);
$('#openCart').addEventListener('click', openCart);
$('#closeCart').addEventListener('click', closeCart);
$('#overlay').addEventListener('click', closeCart);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('#cartDrawer').classList.contains('open')) closeCart(); });
$('#cartItems').addEventListener('click', e => {
  if (submitting) return;
  const changeBtn = e.target.closest('[data-qty]');
  const removeBtn = e.target.closest('[data-remove]');
  if (changeBtn) {
    const id = changeBtn.dataset.qty;
    const newQty = (cart[id] || 0) + Number(changeBtn.dataset.change);
    if (newQty > 99) return toast('Maximum 99 of each product.');
    if (newQty <= 0) delete cart[id]; else cart[id] = newQty;
    updateCart();
  }
  if (removeBtn) { delete cart[removeBtn.dataset.remove]; updateCart(); }
});
$('#checkoutButton').addEventListener('click', checkout);
$('#year').textContent = new Date().getFullYear();
renderProducts();
updateCart();
