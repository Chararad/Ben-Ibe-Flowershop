'use strict';
const PRICE = 1543;
/* ---------- gallery ---------- */
$$('.thumb').forEach(t => t.addEventListener('click', () => {
  $$('.thumb').forEach(x => { x.classList.toggle('active', x === t); x.setAttribute('aria-selected', x === t); });
  const img = $('#mainImg'); img.style.opacity = 0;
  setTimeout(() => { img.src = t.dataset.src; img.style.opacity = 1; }, 180);
}));

/* ---------- selects ---------- */
const colors = ['White', 'Pink', 'Red', 'Purple', 'Lavender', 'Yellow', 'Blue', 'Peach', 'Cream'];
$$('.color').forEach(s => s.innerHTML = '<option value="" selected>Color</option>' + colors.map(c => `<option>${c}</option>`).join(''));

/* ---------- quantity ---------- */
const qty = $('#qty');
const setQty = v => { qty.value = Math.min(99, Math.max(1, parseInt(v, 10) || 1)); };
$('#minus').onclick = () => setQty(+qty.value - 1);
$('#plus').onclick = () => setQty(+qty.value + 1);
qty.addEventListener('change', () => setQty(qty.value));

/* ---------- photo upload preview ---------- */
$('#photo').addEventListener('change', e => {
  const f = e.target.files[0]; if (!f) return;
  if (!f.type.startsWith('image/') || f.size > 5 * 1048576) { toast('Choose an image under 5 MB.'); e.target.value = ''; return; }
  const box = $('#photoBox'), img = new Image(); img.alt = 'Your reference photo';
  img.src = URL.createObjectURL(f); box.replaceChildren(img);
});

/* ---------- cart + order ---------- */
function valid() {
  const sel = $('#loc'), fr = sel.closest('.frame'), ok = sel.value.trim().length >= 8;
  fr.classList.toggle('invalid', !ok); $('#locErr').textContent = ok ? '' : 'Enter your full delivery address (at least street and city).';
  if (!ok) sel.focus(); return ok;
}
$('#loc').addEventListener('blur', () => { if ($('#loc').value) valid(); });
/* [EDITED] cart now stores the real item (shared with the checkout page) */
function currentItem() {
  const f = $('#photo').files[0];
  return { name: 'Product Name', price: PRICE, qty: +qty.value, options: ['c1', 'c2', 'c3'].map(id => $('#' + id).value).filter(Boolean),
    dedication: $('#ded').value.trim(), note: $('#notes').value.trim(), address: $('#loc').value.trim(), photo: f ? f.name : '' };
}
$('#addCart').addEventListener('click', () => {
  if (!valid()) return;
  cartAdd(currentItem());
  toast(`Added ${qty.value} × Product Name to cart`);
});
$('#orderForm').addEventListener('submit', e => {
  e.preventDefault(); if (!valid()) return;
  const esc = s => s.replace(/[&<>"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
  const v = id => esc($('#' + id).value.trim()) || '—';
  const total = (PRICE * qty.value).toLocaleString('en-PH');
  openModal('Review your order', `<dl><dt>Item</dt><dd>Product Name</dd><dt>Deliver to</dt><dd>${v('loc')}</dd><dt>Quantity</dt><dd>${qty.value}</dd><dt>Flowers</dt><dd>${v('c1')}</dd><dt>Wrapper</dt><dd>${v('c2')}</dd><dt>Ribbon</dt><dd>${v('c3')}</dd><dt>Total</dt><dd>₱${total}</dd></dl><p class="note">Demo only: no payment or order is sent until a backend is connected.</p>`,
    /* [EDITED] confirm now adds the item and opens the checkout page */
    [{ label: 'Edit order' }, { label: 'Go to checkout', dark: true, fn: () => { cartAdd(currentItem()); location.href = 'order.html'; } }]);
});

/* ---------- products + filters ---------- */
const cats = ['All', 'Fresh', 'Dried', 'Dome', 'Balloons'];
const products = [
  ['Fresh', 'assets/bouquet-1.svg'], ['Dried', 'assets/bouquet-2.svg'], ['Dome', 'assets/bouquet-1.svg'], ['Balloons', 'assets/bouquet-2.svg'],
  ['Fresh', 'assets/bouquet-2.svg'], ['Dried', 'assets/bouquet-1.svg'], ['Dome', 'assets/bouquet-2.svg'], ['Balloons', 'assets/bouquet-1.svg']
].map(([c, img], i) => ({ c, img, name: 'Product Name', price: PRICE, i }));
let cat = 'All', term = '';
$('.chips').innerHTML = cats.map(c => `<button type="button" class="chip" aria-pressed="${c === 'All'}" data-c="${c}">${c}</button>`).join('');
$('.chips').addEventListener('click', e => {
  const b = e.target.closest('.chip'); if (!b) return; cat = b.dataset.c;
  $$('.chip').forEach(x => x.setAttribute('aria-pressed', x === b)); renderGrid();
});
function renderGrid() {
  const list = products.filter(p => (cat === 'All' || p.c === cat) && p.name.toLowerCase().includes(term)).slice(0, 4);
  $('#grid').innerHTML = list.length ? list.map((p, i) => `<button class="card" style="animation-delay:${i * 60}ms" data-toast="Product pages need real product data."><span>${p.name}</span><div class="im"><img src="${p.img}" alt="${p.name}" loading="lazy"></div><b>₱${p.price.toLocaleString('en-PH')}</b></button>`).join('') : '<p class="empty">No products match. Try another category or search.</p>';
}
renderGrid();
$('#searchForm').addEventListener('submit', e => { e.preventDefault(); term = $('#searchInput').value.trim().toLowerCase(); cat = 'All'; $$('.chip').forEach(x => x.setAttribute('aria-pressed', x.dataset.c === 'All')); renderGrid(); $('#more').scrollIntoView({ behavior: 'smooth' }); });

/* ---------- search term passed from other pages (?q=) ---------- */
const q0 = new URLSearchParams(location.search).get('q');
if (q0) { term = q0.toLowerCase(); $('#searchInput').value = q0; renderGrid(); }
