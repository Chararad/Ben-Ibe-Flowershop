'use strict';
/* [NEW] Admin > Customers: searchable list, detail panel, edit / deactivate / delete, CSV export. Data comes from Api (api.js). */
const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const peso2 = n => '₱' + Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dFull = iso => { const [y, m, d] = iso.split('-').map(Number); return `${MON[m - 1]} ${d}, ${y}`; };
const fmtPhone = p => /^09\d{9}$/.test(p) ? `${p.slice(0, 4)} ${p.slice(4, 7)} ${p.slice(7)}` : p;
const OST = { pending: 'Pending', preparing: 'Preparing', out_for_delivery: 'Out for delivery', complete: 'Complete', canceled: 'Canceled' };
const OTONE = { pending: 'amber', preparing: 'amber', out_for_delivery: 'green', complete: 'green', canceled: 'red' };
const PAGE = 10;
const Q = { q: '', location: '', status: '', page: 1 };
let selected = '', current = null, req = 0, lastTotals = { total: 0, totalAll: 0 };

/* ---------- table ---------- */
function renderRows(items) {
  $('#cBody').innerHTML = items.length ? items.map(c => `<tr data-id="${esc(c.id)}"${c.id === selected ? ' class="is-sel"' : ''}><td class="oid">#${esc(c.id)}</td><td>${esc(c.name)}</td><td class="em">${esc(c.email)}</td><td>${esc(fmtPhone(c.phone))}</td><td class="loc">${esc(c.address)}</td><td>${c.ordersCount}</td><td><span class="stag" data-tone="${c.status === 'active' ? 'green' : 'grey'}">${c.status === 'active' ? 'Active' : 'Inactive'}</span></td>
    <td class="acts2"><button type="button" class="alink" data-act="view" data-id="${esc(c.id)}" aria-label="View ${esc(c.name)}">View</button><span aria-hidden="true">•</span><button type="button" class="alink" data-act="edit" data-id="${esc(c.id)}" aria-label="Edit ${esc(c.name)}">Edit</button><span aria-hidden="true">•</span><button type="button" class="alink del" data-act="del" data-id="${esc(c.id)}" aria-label="Delete ${esc(c.name)}">Delete</button></td></tr>`).join('')
    : '<tr class="empty-row"><td colspan="8">No customers match these filters.</td></tr>';
}
function pageList(c, n) { const s = new Set([1, n, c - 1, c, c + 1]); if (c <= 2) { s.add(2); s.add(3); } if (c >= n - 1) { s.add(n - 2); s.add(n - 1); }
  const a = [...s].filter(x => x >= 1 && x <= n).sort((x, y) => x - y), o = []; a.forEach((x, i) => { if (i && x - a[i - 1] > 1) o.push('…'); o.push(x); }); return o; }
function renderPager(r) {
  const b = (p, l, aria, dis) => `<button type="button" class="pgb" data-p="${p}" aria-label="${aria}"${dis ? ' disabled' : ''}>${l}</button>`;
  $('#pager').innerHTML = r.pages <= 1 ? '' : b(1, '«', 'First page', r.page === 1) + b(r.page - 1, '‹', 'Previous page', r.page === 1)
    + pageList(r.page, r.pages).map(x => x === '…' ? '<span class="gap" aria-hidden="true">…</span>' : `<button type="button" class="pgb${x === r.page ? ' cur' : ''}" data-p="${x}" aria-label="Page ${x}"${x === r.page ? ' aria-current="page"' : ''}>${x}</button>`).join('')
    + b(r.page + 1, '›', 'Next page', r.page === r.pages) + b(r.pages, '»', 'Last page', r.page === r.pages);
}
$('#pager').addEventListener('click', e => { const b = e.target.closest('.pgb'); if (!b || b.disabled) return; Q.page = +b.dataset.p; loadList(); });
function syncUrl() { const p = new URLSearchParams(); if (selected) p.set('customer', selected); history.replaceState(null, '', location.pathname + (p.toString() ? '?' + p : '')); }
function loadList() {
  const my = ++req;
  return Api.getAdminCustomers({ ...Q, pageSize: PAGE }).then(r => {
    if (my !== req) return; Q.page = r.page; lastTotals = r; renderRows(r.items); renderPager(r);
    $('#acH').textContent = r.total === r.totalAll ? `All Customers (${r.total})` : `Customers (${r.total} of ${r.totalAll})`;
    if (!selected && r.items[0]) pick(r.items[0].id, true); else syncUrl();
  }).catch(() => { if (my === req) $('#cBody').innerHTML = '<tr class="empty-row"><td colspan="8">We couldn’t load customers. <button type="button" class="more" id="retry">Try again</button></td></tr>'; });
}
$('#cBody').addEventListener('click', e => {
  if (e.target.id === 'retry') return loadList();
  const b = e.target.closest('.alink'); if (!b) return; const id = b.dataset.id;
  if (b.dataset.act === 'view') return pick(id);
  if (b.dataset.act === 'edit') return Api.getAdminCustomer(id).then(editModal).catch(() => toast('Could not load that customer.'));
  Api.getAdminCustomer(id).then(deleteModal).catch(() => toast('Could not load that customer.'));
});

/* ---------- filters ---------- */
let t1; const debounce = fn => { clearTimeout(t1); t1 = setTimeout(fn, 250); };
function setQuery(v) { $('#cq').value = v; if ($('#adminSearch').value !== v) $('#adminSearch').value = v; debounce(() => { Q.q = v; Q.page = 1; loadList(); }); }
$('#cq').addEventListener('input', e => setQuery(e.target.value));
$('#adminSearch').addEventListener('input', e => setQuery(e.target.value));
$('#cForm').addEventListener('submit', e => { e.preventDefault(); Q.q = $('#cq').value; Q.page = 1; loadList(); });
$('#adminSearchForm').addEventListener('submit', e => e.preventDefault());
$('#fLoc').addEventListener('change', e => { Q.location = e.target.value; Q.page = 1; loadList(); });
$('#fSt').addEventListener('change', e => { Q.status = e.target.value; Q.page = 1; loadList(); });

/* ---------- detail panel ---------- */
function renderDetail(c) {
  current = c; const on = c.status === 'active';
  $('#detail').innerHTML = `<h2 class="dhd">Customer Details</h2><div class="dbd">
    <dl class="dl"><dt>Customer</dt><dd>${esc(c.name)}</dd><dt>Phone</dt><dd>${esc(fmtPhone(c.phone))}</dd><dt>Email</dt><dd>${esc(c.email)}</dd><dt>Address</dt><dd>${esc(c.address)}</dd><dt>Joined</dt><dd>${dFull(c.joined)}</dd><dt>Total Spent</dt><dd>${peso2(c.totalSpent)}</dd><dt>Status</dt><dd><span class="stag" data-tone="${on ? 'green' : 'grey'}">${on ? 'Active' : 'Inactive'}</span></dd></dl>
    <h3 class="tlh">Recent Orders</h3>
    ${c.recentOrders.length ? `<table class="mini"><thead><tr><th scope="col">Order</th><th scope="col">Amount</th><th scope="col">Status</th></tr></thead><tbody>${c.recentOrders.map(o => `<tr><td><a href="admin-orders.html?order=${encodeURIComponent(o.id)}">#${esc(o.id)}</a></td><td>${peso2(o.amount).replace('.00', '')}</td><td><span class="stag pill" data-tone="${OTONE[o.status]}">${OST[o.status]}</span></td></tr>`).join('')}</tbody></table>` : '<p class="muted-p">No orders yet.</p>'}
    <div class="dact c3"><button type="button" class="pbtn dark" data-toast="Chat isn’t built yet.">Chat</button><button type="button" class="pbtn line" id="pEdit">Edit</button><button type="button" class="pbtn line" id="pToggle">${on ? 'Deactivate' : 'Activate'}</button></div></div>`;
}
function pick(id, silent) {
  selected = id; $$('#cBody tr').forEach(r => r.classList.toggle('is-sel', r.dataset.id === id)); syncUrl();
  return Api.getAdminCustomer(id).then(c => { renderDetail(c); if (!silent && innerWidth <= 1300) $('#detail').scrollIntoView({ behavior: 'smooth', block: 'start' }); })
    .catch(() => { $('#detail').innerHTML = '<p class="muted-p">We couldn’t load that customer.</p>'; });
}
const refresh = () => Promise.all([loadList(), current ? pick(current.id, true) : null]);
$('#detail').addEventListener('click', e => {
  if (!current) return;
  if (e.target.closest('#pEdit')) editModal(current);
  if (e.target.closest('#pToggle')) {
    if (current.status === 'inactive') return setStatus(current.id, 'active');
    openModal(`Deactivate ${current.name}?`, '<p>The customer will no longer be able to sign in or place orders. Their order history is kept. This is recorded in the log history.</p>', [{ label: 'Keep active' }, { label: 'Yes, deactivate', dark: true, fn: () => setStatus(current.id, 'inactive') }]);
  }
});
function setStatus(id, status) {
  Api.updateCustomer(id, { status }).then(() => { toast(status === 'active' ? 'Customer activated.' : 'Customer deactivated.'); return refresh(); })
    .catch(e => { toast(e.status === 422 ? e.message : 'Could not update that customer. Please try again.'); });
}

/* ---------- modals ---------- */
const setErr = (id, m) => { const e = $('#' + id + 'E'); if (e) e.textContent = m; const el = $('#' + id); el && el.setAttribute('aria-invalid', !!m); return !m; };
const fld = (id, label, attrs, val) => `<div class="m-field"><label for="${id}">${label}</label><input id="${id}" value="${esc(val)}" ${attrs}><p class="err" id="${id}E" role="alert"></p></div>`;
const RULES = {
  eN: v => /^[A-Za-z\u00C0-\u024F][A-Za-z\u00C0-\u024F\s.'-]{1,59}$/.test(v.trim()) ? '' : 'Enter a name (letters only, 2–60 characters).',
  eE: v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Enter a valid email address.',
  eP: v => /^(09\d{9}|639\d{9})$/.test(v.replace(/\s/g, '')) ? '' : 'Enter a Philippine mobile number, like 09XXXXXXXXX.',
  eA: v => v.trim().length >= 8 ? '' : 'Enter the full address (street, barangay, city).',
  eC: v => v.trim().length >= 2 ? '' : 'Enter the city or town.'
};
function editModal(c) {
  Api.getCustomerLocations().catch(() => []).then(locs => {
    openModal(`Edit #${c.id}`, fld('eN', 'Full name', 'maxlength="60" autocomplete="off"', c.name) + fld('eE', 'Email', 'type="email" maxlength="80"', c.email) + fld('eP', 'Phone', 'inputmode="numeric" maxlength="13"', c.phone)
      + fld('eA', 'Address', 'maxlength="160"', c.address) + fld('eC', 'City / location', 'maxlength="40" list="cityList"', c.city) + `<datalist id="cityList">${locs.map(l => `<option value="${esc(l)}">`).join('')}</datalist>`,
      [{ label: 'Cancel' }, { label: 'Save changes', dark: true, keep: true, fn: () => {
        const bad = Object.keys(RULES).filter(id => !setErr(id, RULES[id]($('#' + id).value))); if (bad.length) return $('#' + bad[0]).focus();
        const btn = $('#mActions .btn.dark'); btn.disabled = true; const map = { name: 'eN', email: 'eE', phone: 'eP', address: 'eA', city: 'eC' };
        Api.updateCustomer(c.id, { name: $('#eN').value, email: $('#eE').value, phone: $('#eP').value, address: $('#eA').value, city: $('#eC').value }).then(() => { closeModal(); toast(`Saved #${c.id}.`); return refresh(); })
          .catch(e => { btn.disabled = false; if (map[e.field]) { setErr(map[e.field], e.message); $('#' + map[e.field]).focus(); } else toast(e.status === 404 ? 'That customer no longer exists.' : 'Could not save. Please try again.'); if (e.status === 404) { closeModal(); refresh(); } });
      } }]);
    $('#eN').focus();
  });
}
$('#mBody').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); const b = $('#mActions .btn.dark'); b && b.click(); } });
function deleteModal(c) {
  const hasOrders = c.ordersCount > 0;
  openModal(`Delete ${c.name}?`, hasOrders ? `<p>This customer has <b>${c.ordersCount}</b> order${c.ordersCount === 1 ? '' : 's'}, so the account can’t be deleted. Deactivate it instead to stop sign-ins and keep the history.</p>`
    : '<p>Delete this customer? This can’t be undone and is recorded in the log history.</p>',
  hasOrders ? [{ label: 'Close' }, { label: 'Deactivate instead', dark: true, fn: () => c.status === 'active' ? setStatus(c.id, 'inactive') : toast('This customer is already inactive.') }]
    : [{ label: 'Keep it' }, { label: 'Yes, delete', dark: true, fn: () => Api.deleteCustomer(c.id).then(() => { toast(`Deleted #${c.id}.`); if (current && current.id === c.id) { current = null; selected = ''; $('#detail').innerHTML = '<p class="muted-p">Select a customer to see their details.</p>'; } return loadList(); }).catch(e => { toast(e.status === 422 ? e.message : 'Could not delete. Please try again.'); loadList(); }) }]);
}

/* ---------- export (CSV of everything that matches the current filters) ---------- */
const csvCell = v => { let s = String(v ?? ''); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }; // the quote prefix stops spreadsheet formula injection
$('#exportBtn').addEventListener('click', () => {
  const b = $('#exportBtn'); b.disabled = true;
  Api.exportCustomers({ q: Q.q, location: Q.location, status: Q.status }).then(rows => {
    const head = ['ID', 'Name', 'Email', 'Phone', 'Address', 'Location', 'Orders', 'Status', 'Joined'];
    const csv = [head, ...rows.map(c => [c.id, c.name, c.email, c.phone, c.address, c.city, c.ordersCount, c.status, c.joined])].map(r => r.map(csvCell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })), a = document.createElement('a');
    a.href = url; a.download = `customers-${new Date().toLocaleDateString('en-CA')}.csv`; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast(`Exported ${rows.length} customer${rows.length === 1 ? '' : 's'}.`);
  }).catch(() => toast('Could not export. Please try again.')).finally(() => { b.disabled = false; });
});

/* ---------- init ---------- */
const qs = new URLSearchParams(location.search);
if (/^CUS-\d{3}$/.test(qs.get('customer') || '')) selected = qs.get('customer');
Api.getCustomerLocations().then(l => $('#fLoc').insertAdjacentHTML('beforeend', l.map(x => `<option>${esc(x)}</option>`).join(''))).catch(() => { }).finally(() => { loadList(); if (selected) pick(selected, true); });
