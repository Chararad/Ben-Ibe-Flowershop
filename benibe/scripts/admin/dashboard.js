'use strict';
/* [NEW] Admin > Dashboard. Data comes from Api (api.js); shell behaviour lives in admin.js. */
const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const peso = n => '₱' + Number(n).toLocaleString('en-PH');
const time12 = hhmm => { const [h, m] = hhmm.split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };
const MONTHS_L = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const dateLong = iso => { const [y, m, d] = iso.split('-').map(Number); return `${MONTHS_L[m - 1]} ${d}, ${y}`; };
const USER = '<svg class="mini-av" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="24" fill="#c9ccd3"/><circle cx="24" cy="19" r="8" fill="#6b7280"/><path d="M8 42c1-8 8-12 16-12s15 4 16 12a24 24 0 0 1-32 0z" fill="#6b7280"/></svg>';

/* ---------- status chips (coloured selects) ---------- */
/* [EDITED] one status list shared with the Orders page; each chip only offers the moves the server allows */
const ST = { pending: 'Pending', preparing: 'Preparing', out_for_delivery: 'Out for delivery', complete: 'Complete', canceled: 'Canceled' };
const PAY = { paid: 'Paid', pending: 'Pending', canceled: 'Canceled' };
const TONE = { out_for_delivery: 'green', paid: 'green', complete: 'green', pending: 'amber', preparing: 'amber', canceled: 'red' };
const chip = (kind, id, value, labels, payment) => { const keys = [value, ...Api.transitions[kind][value]];
  return `<select class="chip-s" data-kind="${kind}" data-id="${esc(id)}" data-tone="${TONE[value]}" data-prev="${value}" aria-label="${kind === 'payment' ? 'Payment' : 'Status'} for #${esc(id)}">${keys.map(k => `<option value="${k}"${k === value ? ' selected' : ''}${kind === 'status' && ['preparing', 'out_for_delivery', 'complete'].includes(k) && payment !== 'paid' ? ' disabled' : ''}>${labels[k]}</option>`).join('')}</select>`; };

document.addEventListener('change', e => {
  const s = e.target.closest('.chip-s'); if (!s) return;
  const { kind, id, prev } = s.dataset, v = s.value, opts = kind === 'payment' ? PAY : ST;
  const run = () => {
    s.value = v; s.disabled = true;
    Api.updateOrder(id, { [kind]: v }).then(() => { toast(`#${id} ${kind} set to ${opts[v]}.`); return load(); })
      .catch(e => { s.value = s.dataset.prev; toast(e.status === 422 ? e.message : 'Could not update that order. Please try again.'); }).finally(() => { s.disabled = false; });
  };
  if (v === 'canceled') { // destructive: ask first, and snap back until confirmed
    s.value = prev;
    openModal(`Cancel #${id}?`, `<p>Set this ${kind} to <b>Canceled</b>? This is recorded in the log history.</p>`, [{ label: 'Keep it' }, { label: 'Yes, cancel', dark: true, fn: run }]);
  } else run();
});

/* ---------- stat cards ---------- */
const ICON = {
  sales: '<text x="16" y="23" text-anchor="middle" font-size="22" font-weight="600" fill="#fff" font-family="Poppins,sans-serif">₱</text>',
  orders: '<path d="M7 12h18l-1.500 14h-15z" fill="none"/><path d="M12 12v-1a4 4 0 0 1 8 0v1" fill="none"/>',
  pending: '<rect x="8" y="7" width="16" height="20" rx="2" fill="none"/><path d="M13 5h6v4h-6zM12 15h8M12 19h8" fill="none"/>',
  stock: '<path d="M6 16h20v10H6zM11 16V9h10v7M16 9v17M6 21h20" fill="none"/>',
  pay: '<rect x="6" y="9" width="20" height="16" rx="2" fill="none"/><path d="M6 14h20M21 19h3" fill="none"/>',
  truck: '<path d="M4 9h15v14H4zM19 14h5l3 4v5h-8" fill="none"/><circle cx="10" cy="24" r="2.500" fill="#f0954a"/><circle cx="23" cy="24" r="2.500" fill="#f0954a"/>'
};
const card = (title, color, icon, value, caption) => `<article class="sc"><h2>${title}</h2><div class="sc-row"><span class="sc-ic" style="background:${color}"><svg width="34" height="34" viewBox="0 0 32 32" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none" aria-hidden="true">${ICON[icon]}</svg></span><b>${value}</b></div>${caption}</article>`;
const delta = pct => `<p class="cap sm"><span class="${pct < 0 ? 'neg' : 'pos'}">${pct < 0 ? '↓' : '↑'} ${Math.abs(pct)}%</span> from yesterday</p>`;
function renderStats(s) {
  $('#stats').innerHTML = [
    card('Today’s Sales', '#8ad05a', 'sales', peso(s.salesToday), delta(s.salesDeltaPct)),
    card('Today’s Orders', '#1f6fc4', 'orders', s.ordersToday, delta(s.ordersDeltaPct)),
    card('Pending Orders', '#e9bb42', 'pending', s.pendingOrders, '<p class="cap gold">Needs Attention</p>'),
    card('Low Stock', '#7a66c9', 'stock', s.lowStock, '<p class="cap red">Items need restocking</p>'),
    card('Pending Payments', '#e78ac3', 'pay', s.pendingPayments, '<p class="cap orange">Awaiting verification</p>'),
    card('Deliveries Today', '#f0954a', 'truck', s.deliveriesToday, `<p class="cap green">${s.outForDelivery} currently out for delivery</p>`)
  ].join('');
}

/* ---------- tables ---------- */
function renderTx(t) {
  $('#txCount').textContent = t.total;
  $('#tx').innerHTML = t.items.map(r => `<tr data-q="${esc((r.customer + ' ' + r.orderName + ' ' + r.location + ' ' + r.id).toLowerCase())}"><td><span class="cust">${USER}<span><b>${esc(r.customer)}</b><small>${esc(r.orderName)}</small></span></span></td><td class="tm">${time12(r.time)}</td><td class="lc">${esc(r.location)}</td><td>${chip('status', r.id, r.status, ST, r.payment || 'paid')}</td></tr>`).join('') + '<tr class="empty-row" hidden><td colspan="4">No matching transactions.</td></tr>';
}
function renderRecent(list) {
  $('#recent').innerHTML = list.map(r => `<tr data-q="${esc((r.id + ' ' + r.customer + ' ' + r.product).toLowerCase())}"><td class="oid">#${esc(r.id)}</td><td>${esc(r.customer)}</td><td>${esc(r.product)}</td><td>${peso(r.amount)}</td><td>${chip('payment', r.id, r.payment, PAY)}</td><td class="dl">${dateLong(r.delivery)}</td><td>${chip('status', r.id, r.status, ST, r.payment)}</td></tr>`).join('') + '<tr class="empty-row" hidden><td colspan="7">No matching orders.</td></tr>';
}
function applyFilter() { // header search; with a real backend send ?q= to the API instead
  const q = $('#adminSearch').value.trim().toLowerCase();
  ['#tx', '#recent'].forEach(sel => { const body = $(sel); let n = 0;
    $$('tr:not(.empty-row)', body).forEach(r => { const ok = !q || r.dataset.q.includes(q); r.hidden = !ok; n += ok; });
    const e = $('.empty-row', body); if (e) e.hidden = n > 0; });
}
$('#adminSearch').addEventListener('input', applyFilter);
$('#adminSearchForm').addEventListener('submit', e => e.preventDefault());

/* ---------- low stock + quick actions ---------- */
function renderLow(l) {
  $('#lowList').innerHTML = l.items.length ? l.items.map(i => `<li><button type="button" class="lrow" data-id="${esc(i.id)}"><span class="thumb"></span><span class="ltx"><b>${esc(i.name)}</b><small>${i.stems} stems left</small></span><svg width="12" height="16" viewBox="0 0 12 16" fill="none" stroke="#8a8077" stroke-width="1.4" aria-hidden="true"><path d="m3 2 6 6-6 6"/></svg></button></li>`).join('')
    + (l.count > l.items.length ? `<li><button type="button" class="more" id="lowAll">View all ${l.count} low-stock items</button></li>` : '') : '<li class="ok">All products are well stocked.</li>';
}
const fieldHtml = (id, label, attrs = '', val = '') => `<div class="m-field"><label for="${id}">${label}</label><input id="${id}" value="${esc(val)}" ${attrs}><p class="err" id="${id}E" role="alert"></p></div>`;
const setErr = (id, m) => { $('#' + id + 'E').textContent = m; $('#' + id).setAttribute('aria-invalid', !!m); return !m; };
function formModal(title, html, onSave, label = 'Save') {
  openModal(title, html, [{ label: 'Cancel' }, { label, dark: true, keep: true, fn: onSave }]); const f = $('#mBody input,#mBody select'); f && f.focus();
}
$('#mBody').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); $('#mActions .btn.dark').click(); } });

function restockModal(preId) {
  Api.getStock().then(list => {
    formModal('Restock flowers', `<div class="m-field"><label for="rsP">Product</label><select id="rsP">${list.map(i => `<option value="${esc(i.id)}"${i.id === preId ? ' selected' : ''}>${esc(i.name)} (${i.stems} stems)</option>`).join('')}</select></div>` + fieldHtml('rsQ', 'Stems to add', 'inputmode="numeric" maxlength="6"'),
      () => {
        const q = $('#rsQ').value.replace(/\D/g, ''), n = +q; if (!setErr('rsQ', q && n >= 1 && n <= 100000 ? '' : 'Enter a whole number from 1 to 100,000.')) return;
        const b = $('#mActions .btn.dark'); b.disabled = true;
        Api.restock($('#rsP').value, n).then(it => { closeModal(); toast(`Added ${n} stems of ${it.name}.`); return load(); })
          .catch(e => { b.disabled = false; if (e.field) setErr('rsQ', e.message); else toast('Could not restock. Please try again.'); });
      }, 'Restock');
    $('#rsQ').addEventListener('input', e => { e.target.value = e.target.value.replace(/\D/g, ''); });
  }).catch(() => toast('Could not load products.'));
}
function addProductModal() {
  formModal('Add product', fieldHtml('apN', 'Product name', 'maxlength="60"') + `<div class="m-field"><label for="apC">Category</label><select id="apC"><option>Fresh</option><option>Dried</option><option>Dome</option><option>Balloon</option></select></div>` + fieldHtml('apP', 'Price (₱)', 'inputmode="decimal" maxlength="9"') + fieldHtml('apS', 'Starting stems', 'inputmode="numeric" maxlength="6"', '0'),
    () => {
      const price = parseFloat($('#apP').value), stems = parseInt($('#apS').value, 10), name = $('#apN').value.trim();
      const ok = [setErr('apN', name.length >= 2 ? '' : 'Enter a product name (2–60 characters).'), setErr('apP', price > 0 ? '' : 'Enter a price above 0.'), setErr('apS', Number.isInteger(stems) && stems >= 0 ? '' : 'Enter a whole number, 0 or more.')];
      if (ok.includes(false)) return;
      const b = $('#mActions .btn.dark'); b.disabled = true;
      Api.addProduct({ name, category: $('#apC').value, price, stock: stems }).then(it => { closeModal(); toast(`Added product ${it.name}.`); return load(); })
        .catch(e => { b.disabled = false; if (e.field && $('#' + { name: 'apN', price: 'apP', stock: 'apS' }[e.field])) setErr({ name: 'apN', price: 'apP', stock: 'apS' }[e.field], e.message); else toast('Could not add the product. Please try again.'); });
    }, 'Add product');
}
$('#addProduct').addEventListener('click', addProductModal);
$('#restockBtn').addEventListener('click', () => restockModal());
$('#lowList').addEventListener('click', e => {
  const r = e.target.closest('.lrow'); if (r) return restockModal(r.dataset.id);
  if (e.target.closest('#lowAll')) Api.getStock({ lowOnly: true }).then(l => openModal('Low stock items', `<ul class="lm">${l.map(i => `<li><span>${esc(i.name)}</span><b>${i.stems} stems</b></li>`).join('')}</ul>`, [{ label: 'Close' }, { label: 'Restock…', dark: true, fn: () => restockModal() }]));
});

/* ---------- sales chart (plain SVG, redraws when the box is resized) ---------- */
let points = [], active = -1;
const kfmt = v => v >= 1000 ? (v / 1000) % 1 ? (v / 1000).toFixed(1) + 'K' : v / 1000 + 'K' : String(v);
function drawChart() {
  const box = $('#chart'), W = box.clientWidth; if (!W || !points.length) return;
  const H = 300, L = 54, R = 22, T = 14, B = 34, vals = points.map(p => p.value), max = Math.max(...vals), min = Math.min(...vals);
  const steps = [1000, 2500, 5000, 10000, 25000, 50000], step = steps.find(s => (max - min) / s <= 5) || 50000;
  const lo = Math.max(0, Math.floor(min / step) * step - 2 * step), hi = Math.ceil(max / step) * step;
  const x = i => L + 28 + i * ((W - L - R - 56) / Math.max(1, points.length - 1)), y = v => T + (H - T - B) * (1 - (v - lo) / (hi - lo));
  const P = points.map((p, i) => [x(i), y(p.value)]);
  let d = `M${P[0][0]} ${P[0][1]}`; // smooth curve (cardinal spline)
  for (let i = 0; i < P.length - 1; i++) { const p0 = P[i - 1] || P[i], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2] || p2;
    d += ` C${p1[0] + (p2[0] - p0[0]) / 6} ${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6} ${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]} ${p2[1]}`; }
  const ticks = []; for (let v = lo; v <= hi + 1; v += step) ticks.push(v);
  const every = Math.ceil(points.length / Math.max(2, Math.floor((W - L - R) / 56)));
  box.querySelector('svg')?.remove();
  box.insertAdjacentHTML('afterbegin', `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true">
    ${ticks.map(v => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="#e6dfd4" stroke-dasharray="3 4"/><text x="${L - 10}" y="${y(v) + 4}" text-anchor="end">${kfmt(v)}</text>`).join('')}
    ${points.map((p, i) => i % every ? '' : `<text x="${x(i)}" y="${H - 10}" text-anchor="middle">${esc(p.label)}</text>`).join('')}
    <path d="${d}" fill="none" stroke="#58b81f" stroke-width="1.7" stroke-linecap="round"/>
    <circle id="cdot" r="4.500" fill="#fff" stroke="#58b81f" stroke-width="2" style="display:none"/></svg>`);
  box._x = x; box._y = y; show(active);
}
function show(i) {
  const tip = $('#ctip'), dot = $('#cdot'), box = $('#chart'); active = i;
  if (i < 0 || !points[i]) { tip.hidden = true; dot && (dot.style.display = 'none'); return; }
  const px = box._x(i), py = box._y(points[i].value);
  dot.style.display = ''; dot.setAttribute('cx', px); dot.setAttribute('cy', py);
  tip.hidden = false; tip.innerHTML = `${esc(points[i].label)} &nbsp;<b>${Math.round(points[i].value / 1000)}k</b>`;
  tip.style.left = Math.min(Math.max(px, 60), box.clientWidth - 60) + 'px'; tip.style.top = py + 'px';
  $('#chartLive').textContent = `${points[i].label}: ${peso(points[i].value)}`;
}
const nearest = ev => { const box = $('#chart'), r = box.getBoundingClientRect(), px = ev.clientX - r.left; let best = 0, bd = 1e9; points.forEach((_, i) => { const dd = Math.abs(box._x(i) - px); if (dd < bd) { bd = dd; best = i; } }); return best; };
$('#chart').addEventListener('pointermove', e => show(nearest(e)));
$('#chart').addEventListener('pointerdown', e => show(nearest(e)));
$('#chart').addEventListener('pointerleave', () => { if (document.activeElement !== $('#chart')) show(-1); });
$('#chart').addEventListener('blur', () => show(-1));
$('#chart').addEventListener('keydown', e => {
  const n = points.length, k = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
  if (k) { e.preventDefault(); show(active < 0 ? (k > 0 ? 0 : n - 1) : Math.min(n - 1, Math.max(0, active + k))); }
  else if (e.key === 'Home') { e.preventDefault(); show(0); } else if (e.key === 'End') { e.preventDefault(); show(n - 1); } else if (e.key === 'Escape') show(-1);
});
let raf; new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(drawChart); }).observe($('#chart'));
function loadSales() {
  Api.getSales($('#period').value).then(r => { points = r.points; active = -1; drawChart(); })
    .catch(() => { $('#chart').insertAdjacentHTML('afterbegin', '<p class="muted-p">Couldn’t load sales. Please try again.</p>'); });
}
$('#period').addEventListener('change', loadSales);

/* ---------- init ---------- */
function load() {
  return Api.getDashboard().then(d => { renderStats(d.stats); renderTx(d.transactions); renderRecent(d.recent); renderLow(d.lowStock); applyFilter(); })
    .catch(() => { $('#stats').innerHTML = '<p class="muted-p">We couldn’t load the dashboard. Please refresh to try again.</p>'; });
}
load(); loadSales();
