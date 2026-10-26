'use strict';
/* [NEW] Admin > Staff Members: list, view, add / edit form with access rights, delete. Data comes from Api (api.js). */
const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ACCESS_LABELS = { viewOrders: 'View Orders', updateOrderStatus: 'Update Order Status', manageProducts: 'Manage Products', manageStaff: 'Manage Staff', viewSales: 'View Sales Data' };
const fmtPhone = p => /^09\d{9}$/.test(p) ? `${p.slice(0, 4)} ${p.slice(4, 7)} ${p.slice(7)}` : p;
const PRES = { online: ['Online', 'green'], offline: ['Offline', 'grey'], inactive: ['Inactive', 'red'] };
const PAGE = 6, Q = { q: '', role: '', status: '', page: 1 };
let editing = null, dirty = false, req = 0, touchedAccess = false;

function lastActive(iso) {
  if (!iso) return 'Never'; const d = new Date(iso), now = new Date(), t = x => new Date(x.getFullYear(), x.getMonth(), x.getDate()), days = Math.round((t(now) - t(d)) / 86400000);
  if (days <= 0) return 'Today, ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); if (days === 1) return 'Yesterday'; if (days < 7) return `${days} days ago`;
  return `${MON[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/* ---------- table ---------- */
function renderRows(items) {
  $('#sBody').innerHTML = items.length ? items.map(s => { const [l, tone] = PRES[s.presence];
    return `<tr data-id="${esc(s.id)}"${editing && editing.id === s.id ? ' class="is-sel"' : ''}><td class="oid">#${esc(s.id)}</td><td>${esc(s.name)}</td><td>${esc(s.role)}</td><td>${esc(s.email)}</td><td>${esc(fmtPhone(s.phone))}</td><td>${lastActive(s.lastActiveAt)}</td><td><span class="stag" data-tone="${tone}">${l}</span></td>
    <td class="acts2"><button type="button" class="alink" data-act="view" data-id="${esc(s.id)}" aria-label="View ${esc(s.name)}">View</button><span aria-hidden="true">•</span><button type="button" class="alink" data-act="edit" data-id="${esc(s.id)}" aria-label="Edit ${esc(s.name)}">Edit</button><span aria-hidden="true">•</span><button type="button" class="alink del" data-act="del" data-id="${esc(s.id)}" aria-label="Delete ${esc(s.name)}">Delete</button></td></tr>`; }).join('')
    : '<tr class="empty-row"><td colspan="8">No staff match these filters.</td></tr>';
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
function loadList() {
  const my = ++req;
  return Api.getAdminStaff({ ...Q, pageSize: PAGE }).then(r => {
    if (my !== req) return; Q.page = r.page; renderRows(r.items); renderPager(r);
    $('#asH').textContent = r.total === r.totalAll ? `All Staff (${r.total})` : `Staff (${r.total} of ${r.totalAll})`;
  }).catch(() => { if (my === req) $('#sBody').innerHTML = '<tr class="empty-row"><td colspan="8">We couldn’t load staff. <button type="button" class="more" id="retry">Try again</button></td></tr>'; });
}
$('#sBody').addEventListener('click', e => {
  if (e.target.id === 'retry') return loadList();
  const b = e.target.closest('.alink'); if (!b) return; const id = b.dataset.id;
  Api.getAdminStaffMember(id).then(s => b.dataset.act === 'view' ? viewModal(s) : b.dataset.act === 'edit' ? guard(() => loadForm(s)) : deleteModal(s)).catch(() => { toast('Could not load that staff member.'); loadList(); });
});

/* ---------- filters ---------- */
let t1; const debounce = fn => { clearTimeout(t1); t1 = setTimeout(fn, 250); };
function setQuery(v) { $('#sq').value = v; if ($('#adminSearch').value !== v) $('#adminSearch').value = v; debounce(() => { Q.q = v; Q.page = 1; loadList(); }); }
$('#sq').addEventListener('input', e => setQuery(e.target.value));
$('#adminSearch').addEventListener('input', e => setQuery(e.target.value));
$('#sForm').addEventListener('submit', e => { e.preventDefault(); Q.q = $('#sq').value; Q.page = 1; loadList(); });
$('#adminSearchForm').addEventListener('submit', e => e.preventDefault());
$('#fRole').addEventListener('change', e => { Q.role = e.target.value; Q.page = 1; loadList(); });
$('#fSt').addEventListener('change', e => { Q.status = e.target.value; Q.page = 1; loadList(); });

/* ---------- form ---------- */
const FIELDS = ['firstName', 'lastName', 'email', 'phone', 'role', 'password'];
const setErr = (id, m) => { const e = $('#' + id + 'E'); if (e) e.textContent = m; const el = $('#' + id); el && el.setAttribute('aria-invalid', !!m); return !m; };
const checks = () => $$('input[name=access]');
const nameRx = /^[A-Za-z\u00C0-\u024F][A-Za-z\u00C0-\u024F\s.'-]{0,39}$/;
const RULES = {
  firstName: v => nameRx.test(v.trim()) ? '' : 'Enter a first name (letters only).',
  lastName: v => nameRx.test(v.trim()) ? '' : 'Enter a last name (letters only).',
  email: v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Enter a valid email address.',
  phone: v => /^(09\d{9}|639\d{9})$/.test(v.replace(/\s/g, '')) ? '' : 'Enter a Philippine mobile number, like 09XXXXXXXXX.',
  role: v => v ? '' : 'Choose a role.',
  password: v => !v ? (editing ? '' : 'Enter a temporary password.') : v.length >= 8 && v.length <= 64 && /[A-Za-z]/.test(v) && /\d/.test(v) ? '' : 'Use 8–64 characters with at least one letter and one number.'
};
function setAccess(obj) { checks().forEach(c => { c.checked = !!obj[c.value]; }); }
function resetForm() {
  editing = null; dirty = false; touchedAccess = false; $('#sf').reset(); FIELDS.forEach(id => setErr(id, '')); setErr('access', ''); setErr('active', '');
  $('#modeNote').textContent = 'Adding a new staff member'; $('#pwL').textContent = 'Temporary Password'; $('#password').type = 'password'; $('#pwShow').textContent = 'Show'; $('#pwShow').setAttribute('aria-pressed', 'false');
  $('#pwHint').textContent = '8+ characters with a letter and a number. The staff member must change it at first sign-in.'; $('#active').checked = true; $('#saveBtn').textContent = 'Save Staff';
  $$('#sBody tr').forEach(r => r.classList.remove('is-sel'));
}
function loadForm(s) {
  resetForm(); editing = s; $('#firstName').value = s.firstName; $('#lastName').value = s.lastName; $('#email').value = s.email; $('#phone').value = s.phone; $('#role').value = s.role; setAccess(s.access); touchedAccess = true;
  $('#active').checked = s.status === 'active'; $('#modeNote').textContent = `Editing #${s.id} · ${s.name}`; $('#pwL').textContent = 'New Temporary Password (optional)';
  $('#pwHint').textContent = 'Leave blank to keep the current password. A new one is never shown again and must be changed at first sign-in.'; $('#saveBtn').textContent = 'Save changes';
  $$('#sBody tr').forEach(r => r.classList.toggle('is-sel', r.dataset.id === s.id));
  if (innerWidth <= 1300) $('#formPanel').scrollIntoView({ behavior: 'smooth', block: 'start' }); $('#firstName').focus();
}
function guard(fn) { // ask before throwing away typed-in changes
  if (!dirty) return fn();
  openModal('Discard changes?', '<p>You have unsaved changes in the staff form.</p>', [{ label: 'Keep editing' }, { label: 'Discard', dark: true, fn: () => { dirty = false; fn(); } }]);
}
$('#sf').addEventListener('input', e => { dirty = true; const id = e.target.id; if (RULES[id] && e.target.getAttribute('aria-invalid') === 'true') setErr(id, RULES[id](e.target.value)); if (id === 'phone') e.target.value = e.target.value.replace(/[^\d\s]/g, ''); if (e.target.name === 'access') { touchedAccess = true; setErr('access', ''); } });
$('#sf').addEventListener('change', () => { dirty = true; });
$('#role').addEventListener('change', e => { setErr('role', ''); if (!touchedAccess && Api.staffRoleAccess[e.target.value]) setAccess(Object.fromEntries(Object.keys(ACCESS_LABELS).map((k, i) => [k, !!Api.staffRoleAccess[e.target.value][i]]))); }); // sensible starting rights; still editable
$('#pwShow').addEventListener('click', () => { const p = $('#password'), show = p.type === 'password'; p.type = show ? 'text' : 'password'; $('#pwShow').textContent = show ? 'Hide' : 'Show'; $('#pwShow').setAttribute('aria-pressed', show); });
$('#pwGen').addEventListener('click', () => {
  const set = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789', r = crypto.getRandomValues(new Uint32Array(12));
  let p = [...r].map(n => set[n % set.length]).join(''); if (!/\d/.test(p)) p = p.slice(0, 11) + '7'; if (!/[A-Za-z]/.test(p)) p = 'k' + p.slice(1);
  $('#password').value = p; $('#password').type = 'text'; $('#pwShow').textContent = 'Hide'; $('#pwShow').setAttribute('aria-pressed', 'true'); setErr('password', ''); dirty = true; toast('Password generated. Copy it now: it won’t be shown again.');
});
$('#cancelBtn').addEventListener('click', () => guard(resetForm));
$('#addBtn').addEventListener('click', () => guard(() => { resetForm(); if (innerWidth <= 1300) $('#formPanel').scrollIntoView({ behavior: 'smooth', block: 'start' }); $('#firstName').focus(); }));
$('#sf').addEventListener('submit', e => {
  e.preventDefault();
  const bad = FIELDS.filter(id => !setErr(id, RULES[id]($('#' + id).value)));
  const hasAccess = checks().some(c => c.checked); setErr('access', hasAccess ? '' : 'Choose at least one access right.');
  if (bad.length) return $('#' + bad[0]).focus(); if (!hasAccess) return checks()[0].focus();
  const body = { firstName: $('#firstName').value, lastName: $('#lastName').value, email: $('#email').value, phone: $('#phone').value, role: $('#role').value, status: $('#active').checked ? 'active' : 'inactive',
    access: Object.fromEntries(checks().map(c => [c.value, c.checked])) };
  if ($('#password').value) body.password = $('#password').value;
  const btn = $('#saveBtn'), label = btn.textContent, wasEdit = !!editing; btn.disabled = true; btn.textContent = 'Saving…';
  (wasEdit ? Api.updateStaff(editing.id, body) : Api.addStaff(body)).then(s => { toast(wasEdit ? `Saved #${s.id}.` : `Added staff #${s.id}.`); resetForm(); return loadList(); })
    .catch(err => { const fid = err.field === 'status' ? 'active' : err.field; if (fid && $('#' + fid)) { setErr(fid, err.message); $('#' + fid).focus(); } else if (err.status === 404) { toast('That staff member no longer exists.'); resetForm(); loadList(); } else toast('Could not save. Please try again.'); })
    .finally(() => { btn.disabled = false; btn.textContent = editing ? 'Save changes' : 'Save Staff'; });
});
window.addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

/* ---------- view + delete ---------- */
function viewModal(s) {
  const [l, tone] = PRES[s.presence], ok = Object.keys(ACCESS_LABELS).filter(k => s.access[k]);
  openModal(esc(s.name), `<dl class="dl vm"><dt>ID</dt><dd>#${esc(s.id)}</dd><dt>Role</dt><dd>${esc(s.role)}</dd><dt>Email</dt><dd>${esc(s.email)}</dd><dt>Phone</dt><dd>${esc(fmtPhone(s.phone))}</dd><dt>Status</dt><dd><span class="stag" data-tone="${tone}">${l}</span></dd><dt>Last active</dt><dd>${lastActive(s.lastActiveAt)}</dd>
    <dt>Open work</dt><dd>${s.openWork.orders} orders · ${s.openWork.bookings} bookings</dd><dt>Access</dt><dd>${ok.length ? ok.map(k => ACCESS_LABELS[k]).join(', ') : 'None'}</dd></dl>`,
    [{ label: 'Close' }, { label: 'Edit', dark: true, fn: () => guard(() => loadForm(s)) }]);
  $('#mTitle').textContent = s.name;
}
function deleteModal(s) {
  const w = s.openWork, busy = w.orders + w.bookings > 0;
  openModal(`Delete ${s.name}?`, busy ? `<p>${esc(s.name)} still has <b>${w.orders}</b> open order${w.orders === 1 ? '' : 's'} and <b>${w.bookings}</b> open booking${w.bookings === 1 ? '' : 's'}. Reassign them first, or deactivate the account instead.</p>` : '<p>Delete this staff member? Their sign-in is removed. This can’t be undone and is recorded in the log history.</p>',
    busy ? [{ label: 'Close' }] : [{ label: 'Keep them' }, { label: 'Yes, delete', dark: true, fn: () => Api.deleteStaff(s.id).then(() => { toast(`Deleted #${s.id}.`); if (editing && editing.id === s.id) resetForm(); return loadList(); }).catch(e => { toast(e.status === 422 ? e.message : 'Could not delete. Please try again.'); loadList(); }) }]);
}

/* ---------- init ---------- */
$('#role').insertAdjacentHTML('beforeend', Api.staffRoles.map(r => `<option>${esc(r)}</option>`).join(''));
$('#fRole').insertAdjacentHTML('beforeend', Api.staffRoles.map(r => `<option>${esc(r)}</option>`).join(''));
loadList();
