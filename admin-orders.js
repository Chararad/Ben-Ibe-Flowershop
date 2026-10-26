'use strict';
/* [NEW] Admin > Orders: filters, paginated table, and an order detail panel. Data comes from Api (api.js). */
const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const peso2 = n => '₱' + Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dShort = iso => { const [y, m, d] = iso.split('-').map(Number); return `${MON[m - 1]} ${d}, ${y}`; };
const ST = { pending: 'Pending', preparing: 'Preparing', out_for_delivery: 'Out for delivery', complete: 'Complete', canceled: 'Canceled' };
const PAY = { paid: 'Paid', pending: 'Pending', canceled: 'Canceled' };
const TONE = { out_for_delivery: 'green', paid: 'green', complete: 'green', pending: 'amber', preparing: 'amber', canceled: 'red' };
const NEEDS_PAID = ['preparing', 'out_for_delivery', 'complete'];
const PAGE = 10;
const Q = { status: '', q: '', id: '', from: '', to: '', page: 1 };
let req = 0, selected = '', current = null, staff = [];

/* status/payment chip; only the moves the server allows are offered */
const chip = (kind, id, value, labels, payment, cls = '') => {
  const keys = [value, ...Api.transitions[kind][value]];
  return `<select class="chip-s ${cls}" data-kind="${kind}" data-id="${esc(id)}" data-tone="${TONE[value]}" data-prev="${value}" aria-label="${kind === 'payment' ? 'Payment' : 'Status'} for #${esc(id)}">${keys.map(k => `<option value="${k}"${k === value ? ' selected' : ''}${kind === 'status' && NEEDS_PAID.includes(k) && payment !== 'paid' ? ' disabled' : ''}>${labels[k]}</option>`).join('')}</select>`;
};

/* ---------- pills ---------- */
function renderPills(c) {
  const defs = [['', 'All', c.all], ...Object.entries(ST).map(([k, l]) => [k, l, c[k]])];
  $('#pills').innerHTML = defs.map(([k, l, n]) => `<button type="button" class="fpill" data-s="${k}" aria-pressed="${Q.status === k}">${l} ${n}</button>`).join('');
}
$('#pills').addEventListener('click', e => { const b = e.target.closest('.fpill'); if (!b) return; Q.status = b.dataset.s; Q.page = 1; loadList(); });

/* ---------- table ---------- */
function renderRows(items) {
  $('#oBody').innerHTML = items.length ? items.map(r => `<tr data-id="${esc(r.id)}"${r.id === selected ? ' class="is-sel"' : ''}><td class="oid">#${esc(r.id)}</td><td>${esc(r.customer)}</td><td>${esc(r.product)}</td><td>${peso2(r.amount)}</td><td>${chip('payment', r.id, r.payment, PAY)}</td><td>${dShort(r.delivery)}</td><td>${chip('status', r.id, r.status, ST, r.payment)}</td><td><button type="button" class="viewb" data-id="${esc(r.id)}" aria-label="View order #${esc(r.id)}">View</button></td></tr>`).join('')
    : '<tr class="empty-row"><td colspan="8">No orders match these filters.</td></tr>';
}
function pageList(c, n) {
  const s = new Set([1, n, c - 1, c, c + 1]); if (c <= 2) { s.add(2); s.add(3); } if (c >= n - 1) { s.add(n - 2); s.add(n - 1); }
  const a = [...s].filter(x => x >= 1 && x <= n).sort((x, y) => x - y), out = [];
  a.forEach((x, i) => { if (i && x - a[i - 1] > 1) out.push('…'); out.push(x); }); return out;
}
function renderPager(r) {
  const b = (p, label, aria, dis) => `<button type="button" class="pgb" data-p="${p}" aria-label="${aria}"${dis ? ' disabled' : ''}>${label}</button>`;
  $('#pager').innerHTML = r.pages <= 1 && !r.total ? '' : b(1, '«', 'First page', r.page === 1) + b(r.page - 1, '‹', 'Previous page', r.page === 1)
    + pageList(r.page, r.pages).map(x => x === '…' ? '<span class="gap" aria-hidden="true">…</span>' : `<button type="button" class="pgb${x === r.page ? ' cur' : ''}" data-p="${x}" aria-label="Page ${x}"${x === r.page ? ' aria-current="page"' : ''}>${x}</button>`).join('')
    + b(r.page + 1, '›', 'Next page', r.page === r.pages) + b(r.pages, '»', 'Last page', r.page === r.pages);
}
$('#pager').addEventListener('click', e => { const b = e.target.closest('.pgb'); if (!b || b.disabled) return; Q.page = +b.dataset.p; loadList(); $('#aoH').scrollIntoView({ block: 'nearest' }); });

function syncUrl() { const p = new URLSearchParams(); if (Q.status) p.set('status', Q.status); if (Q.page > 1) p.set('page', Q.page); if (selected) p.set('order', selected); history.replaceState(null, '', location.pathname + (p.toString() ? '?' + p : '')); }
function loadList() {
  const my = ++req;
  return Api.getAdminOrders({ ...Q, pageSize: PAGE }).then(r => {
    if (my !== req) return; Q.page = r.page; renderPills(r.counts); renderRows(r.items); renderPager(r);
    if (!selected && r.items[0]) pick(r.items[0].id, true); else syncUrl();
  }).catch(() => { if (my === req) $('#oBody').innerHTML = '<tr class="empty-row"><td colspan="8">We couldn’t load orders. <button type="button" class="more" id="retry">Try again</button></td></tr>'; });
}
$('#oBody').addEventListener('click', e => { if (e.target.id === 'retry') return loadList(); const v = e.target.closest('.viewb'); if (v) pick(v.dataset.id); });

/* filters */
let t1; const debounce = fn => { clearTimeout(t1); t1 = setTimeout(fn, 250); };
$('#adminSearch').addEventListener('input', e => debounce(() => { Q.q = e.target.value; Q.page = 1; loadList(); }));
$('#idQ').addEventListener('input', e => debounce(() => { Q.id = e.target.value; Q.page = 1; loadList(); }));
$('#idForm').addEventListener('submit', e => { e.preventDefault(); Q.id = $('#idQ').value; Q.page = 1; loadList(); });
$('#adminSearchForm').addEventListener('submit', e => e.preventDefault());

/* ---------- date range popover ---------- */
const iso = d => d.toLocaleDateString('en-CA'), addD = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const PRESETS = { all: () => ['', ''], today: t => [iso(t), iso(t)], week: t => [iso(addD(t, -t.getDay())), iso(addD(t, 6 - t.getDay()))], month: t => [iso(new Date(t.getFullYear(), t.getMonth(), 1)), iso(new Date(t.getFullYear(), t.getMonth() + 1, 0))], next30: t => [iso(t), iso(addD(t, 30))] };
const drOpen = o => { $('#drPop').hidden = !o; $('#drBtn').setAttribute('aria-expanded', o); };
$('#drBtn').addEventListener('click', () => drOpen($('#drPop').hidden));
$$('input[name=dr]').forEach(r => r.addEventListener('change', () => { $('#drCustom').hidden = r.value !== 'custom' || !r.checked; }));
$('#drApply').addEventListener('click', () => {
  const v = $('input[name=dr]:checked').value; let from, to;
  if (v === 'custom') { from = $('#drFrom').value; to = $('#drTo').value;
    if (!from && !to) { $('#drErr').textContent = 'Choose a start or end date.'; return; } if (from && to && from > to) { $('#drErr').textContent = 'The start date must be before the end date.'; return; } $('#drErr').textContent = ''; }
  else { const t = new Date(); t.setHours(0, 0, 0, 0); [from, to] = PRESETS[v](t); }
  Q.from = from; Q.to = to; Q.page = 1; $('#drLabel').textContent = from || to ? `${from ? dShort(from) : '…'} – ${to ? dShort(to) : '…'}` : 'Date Range'; drOpen(false); loadList();
});
$('#drClear').addEventListener('click', () => { $('input[name=dr][value=all]').checked = true; $('#drCustom').hidden = true; $('#drFrom').value = $('#drTo').value = ''; Q.from = Q.to = ''; Q.page = 1; $('#drLabel').textContent = 'Date Range'; drOpen(false); loadList(); });
document.addEventListener('click', e => { if (!e.target.closest('.pw')) drOpen(false); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#drPop').hidden) { drOpen(false); $('#drBtn').focus(); } });

/* ---------- detail panel ---------- */
const STEPS = (o) => { const st = o.status, past = k => ({ preparing: ['preparing', 'out_for_delivery', 'complete'], out_for_delivery: ['out_for_delivery', 'complete'], complete: ['complete'] }[k] || []).includes(st);
  const l = [['Order Placed', true], ['Payment Verified', o.payment === 'paid'], ['Preparing', past('preparing')], ['Out For Delivery', past('out_for_delivery')], ['Delivered', st === 'complete']];
  if (st === 'canceled') l.push(['Canceled', true, true]); return l; };
function renderDetail(o) {
  current = o; const locked = !Api.transitions.status[o.status].length, item = o.items[0];
  $('#detail').innerHTML = `<h2 class="dhd">Order #${esc(o.id)}</h2><div class="dbd">
    <dl class="dl"><dt>Customer</dt><dd>${esc(o.customer)}</dd><dt>Phone</dt><dd>${esc(o.phone)}</dd><dt>Address</dt><dd>${esc(o.address)}</dd><dt>Delivery Date</dt><dd>${dShort(o.delivery)}</dd>
    <dt><label for="dAs">Assigned</label></dt><dd><select id="dAs" class="staffsel"><option value="">Unassigned</option>${staff.map(s => `<option${s.name === o.assigned ? ' selected' : ''}>${esc(s.name)}</option>`).join('')}</select></dd></dl>
    ${o.items.map(i => `<div class="ditem"><img src="${esc(i.img)}" alt="${esc(i.name)}"><div><b>${esc(i.name)}</b>${i.lines.map(l => `<p>${esc(l)}</p>`).join('')}</div><div class="op"><b>${peso2(i.price)}</b><em>x${i.qty}</em></div></div>`).join('')}
    <div class="dsel"><div>${chip('status', o.id, o.status, ST, o.payment, 'lg').replace('class="chip-s', 'id="dSt" class="chip-s').replace(/data-kind="status"/, 'data-kind="status" data-panel="1"')}</div><div>${chip('payment', o.id, o.payment, PAY, o.payment, 'lg').replace('class="chip-s', 'id="dPy" class="chip-s').replace(/data-kind="payment"/, 'data-kind="payment" data-panel="1"')}</div></div>
    <p class="err" id="dErr" role="alert"></p>
    <h3 class="tlh">Timeline</h3><ol class="otl">${STEPS(o).map(([l, on, bad]) => `<li><span class="rb${on ? ' on' : ''}${bad ? ' bad' : ''}" aria-hidden="true"></span>${l}<span class="sr-only">${on ? ' (done)' : ' (not yet)'}</span></li>`).join('')}</ol>
    <div class="dact"><button type="button" class="pbtn dark" id="dUpd" disabled>Update order</button><button type="button" class="pbtn line" id="dCan"${locked ? ' disabled' : ''}>Cancel order</button><button type="button" class="pbtn line wide" data-toast="Chat isn’t built yet.">Chat with customer</button></div></div>`;
  syncStatusOpts();
}
function pick(id, silent) {
  selected = id; $$('#oBody tr').forEach(r => r.classList.toggle('is-sel', r.dataset.id === id)); syncUrl();
  return Api.getAdminOrder(id).then(o => { renderDetail(o); if (!silent && innerWidth <= 1300) $('#detail').scrollIntoView({ behavior: 'smooth', block: 'start' }); })
    .catch(() => { $('#detail').innerHTML = '<p class="muted-p">We couldn’t load that order.</p>'; });
}
function syncStatusOpts() { // preparing / delivering only make sense once the payment is Paid
  const st = $('#dSt'), py = $('#dPy'); if (!st) return;
  $$('option', st).forEach(o => { o.disabled = NEEDS_PAID.includes(o.value) && py.value !== 'paid' && o.value !== current.status; });
}
const dirty = () => $('#dSt').value !== current.status || $('#dPy').value !== current.payment || $('#dAs').value !== current.assigned;
$('#detail').addEventListener('change', e => {
  const t = e.target; if (!current || !['dSt', 'dPy', 'dAs'].includes(t.id)) return;
  if (t.id === 'dPy') { t.dataset.tone = TONE[t.value]; syncStatusOpts(); } if (t.id === 'dSt') t.dataset.tone = TONE[t.value];
  $('#dErr').textContent = ''; $('#dUpd').disabled = !dirty();
});
function refresh() { return Promise.all([loadList(), current ? pick(current.id, true) : null]); }
function applyPatch(id, patch, done) {
  const btns = $$('#detail .pbtn'); btns.forEach(b => b.disabled = true);
  Api.updateOrder(id, patch).then(() => { toast(done); return refresh(); })
    .catch(e => { if (e.status === 422) { $('#dErr') && ($('#dErr').textContent = e.message); toast(e.message); } else toast('Could not update that order. Please try again.'); btns.forEach(b => b.disabled = false); if (current) $('#dUpd').disabled = !dirty(); });
}
$('#detail').addEventListener('click', e => {
  if (e.target.closest('#dUpd')) {
    const p = {}; if ($('#dPy').value !== current.payment) p.payment = $('#dPy').value; if ($('#dSt').value !== current.status) p.status = $('#dSt').value; if ($('#dAs').value !== current.assigned) p.assigned = $('#dAs').value;
    if (p.status === 'canceled') return confirmCancel(current.id); applyPatch(current.id, p, `Order #${current.id} updated.`);
  }
  if (e.target.closest('#dCan')) confirmCancel(current.id);
});
function confirmCancel(id) { openModal(`Cancel #${id}?`, '<p>Cancel this order? This can’t be undone and is recorded in the log history. If it was paid, a refund must be handled separately.</p>', [{ label: 'Keep it' }, { label: 'Yes, cancel', dark: true, fn: () => applyPatch(id, { status: 'canceled' }, `Order #${id} canceled.`) }]); }

/* table chips (change immediately) */
document.addEventListener('change', e => {
  const s = e.target.closest('#oBody .chip-s'); if (!s) return; const { kind, id, prev } = s.dataset, v = s.value;
  const run = () => { s.disabled = true; Api.updateOrder(id, { [kind]: v }).then(() => { toast(`#${id} ${kind} set to ${(kind === 'payment' ? PAY : ST)[v]}.`); return refresh(); })
    .catch(err => { s.value = prev; s.disabled = false; toast(err.status === 422 ? err.message : 'Could not update that order. Please try again.'); }); };
  if (v === 'canceled') { s.value = prev; openModal(`Cancel #${id}?`, `<p>Set this ${kind} to <b>Canceled</b>? This is recorded in the log history.</p>`, [{ label: 'Keep it' }, { label: 'Yes, cancel', dark: true, fn: run }]); } else run();
});

/* ---------- init ---------- */
const qs = new URLSearchParams(location.search);
if (ST[qs.get('status')]) Q.status = qs.get('status'); if (+qs.get('page') > 1) Q.page = +qs.get('page'); if (/^ORD-\d{3}$/.test(qs.get('order') || '')) selected = qs.get('order');
Api.getStaff().then(s => { staff = s; }).catch(() => { }).finally(() => { loadList(); if (selected) pick(selected, true); });
