'use strict';
/* [NEW] Admin > Profile Settings. Data comes from Api (api.js); shell behaviour lives in admin.js. */
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const fmtAt = iso => { const d = new Date(iso), h = d.getHours(); return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}, ${h % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };
const FIELDS = ['firstName', 'lastName', 'email', 'phone'];
let profile = null, avatarFile = null;

/* ---------- tabs (Manage Profile / Log History) ---------- */
const tabs = [$('#tabP'), $('#tabL')], panels = [$('#panelP'), $('#panelL')];
function selectTab(i, focus) {
  tabs.forEach((t, n) => { t.setAttribute('aria-selected', n === i); t.tabIndex = n === i ? 0 : -1; panels[n].hidden = n !== i; });
  history.replaceState(null, '', i ? '#log' : location.pathname + location.search);
  applyFilter(); if (focus) tabs[i].focus();
}
tabs.forEach((t, i) => t.addEventListener('click', () => selectTab(i)));
$('.ptabs').addEventListener('keydown', e => {
  const i = tabs.indexOf(document.activeElement); if (i < 0) return;
  const n = { ArrowRight: (i + 1) % 2, ArrowDown: (i + 1) % 2, ArrowLeft: (i + 1) % 2, ArrowUp: (i + 1) % 2, Home: 0, End: 1 }[e.key];
  if (n !== undefined) { e.preventDefault(); selectTab(n, true); }
});
$('#viewAll').addEventListener('click', () => selectTab(1, true));

/* ---------- log history ---------- */
function renderLog(tbody, items) {
  tbody.innerHTML = items.map(l => `<tr><td>#${esc(l.id)}</td><td>${esc(l.user)}</td><td>${fmtAt(l.at)}</td><td>${esc(l.activity)}</td></tr>`).join('')
    + '<tr class="empty-row" hidden><td colspan="4">No matching records.</td></tr>';
}
const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
function loadLogs() {
  return Promise.all([Api.getActivityLog({ limit: 7 }), Api.getActivityLog({ limit: 100 })]).then(([r, a]) => {
    renderLog($('#logRecent'), r.items); renderLog($('#logAll'), a.items);
    $('#lCount').textContent = `Showing ${a.items.length} of ${a.total} records`; applyFilter();
  }).catch(() => { $('#logRecent').innerHTML = '<tr><td colspan="4">Couldn’t load the log. Please try again.</td></tr>'; });
}
/* header search filters the table you are looking at (with a real backend, send ?q= to the API instead) */
function applyFilter() {
  const q = $('#adminSearch').value.trim().toLowerCase(), body = panels[0].hidden ? $('#logAll') : $('#logRecent');
  let shown = 0; $$('tr:not(.empty-row)', body).forEach(r => { const ok = !q || r.textContent.toLowerCase().includes(q); r.hidden = !ok; shown += ok; });
  const e = $('.empty-row', body); if (e) e.hidden = shown > 0 || !$$('tr', body).length;
}
$('#adminSearch').addEventListener('input', applyFilter);
$('#adminSearchForm').addEventListener('submit', e => e.preventDefault());

/* ---------- form ---------- */
const rules = {
  firstName: v => /^[A-Za-z\u00C0-\u024F][A-Za-z\u00C0-\u024F\s.'-]*$/.test(v.trim()) ? '' : 'Enter a first name (letters only).',
  lastName: v => /^[A-Za-z\u00C0-\u024F][A-Za-z\u00C0-\u024F\s.'-]*$/.test(v.trim()) ? '' : 'Enter a last name (letters only).',
  email: v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Enter a valid email address.',
  phone: v => /^(09\d{9}|639\d{9})$/.test(v) ? '' : 'Enter a Philippine mobile number, like 09XXXXXXXXX.',
  password: v => !v ? '' : v.length < 8 || !/[A-Za-z]/.test(v) || !/\d/.test(v) ? 'Use 8+ characters with at least one letter and one number.' : '',
  password2: v => v === $('#password').value ? '' : 'Passwords do not match.'
};
const setErr = (id, m) => { $('#' + id + 'E').textContent = m; $('#' + id).setAttribute('aria-invalid', !!m); return !m; };
const check = id => setErr(id, rules[id]($('#' + id).value));
function dirty() { return !!profile && (FIELDS.some(f => $('#' + f).value.trim() !== profile[f]) || $('#password').value !== '' || !!avatarFile); }
function sync() { $('#updBtn').disabled = !dirty(); }
$('#phone').addEventListener('input', e => { e.target.value = e.target.value.replace(/\D/g, ''); });
Object.keys(rules).forEach(id => {
  const el = $('#' + id);
  el.addEventListener('input', () => { sync(); if (el.getAttribute('aria-invalid') === 'true') check(id); if (id === 'password' && $('#password2').value) check('password2'); });
  el.addEventListener('blur', () => { if (el.value || id === 'password2' && $('#password').value) check(id); });
});
function fill(p) { FIELDS.forEach(f => { $('#' + f).value = p[f]; }); $('#password').value = $('#password2').value = ''; Object.keys(rules).forEach(i => setErr(i, '')); avatarFile = null; sync(); }

$('#pform').addEventListener('submit', e => {
  e.preventDefault(); if (!dirty()) return;
  const bad = Object.keys(rules).filter(id => !check(id)); if (bad.length) { $('#' + bad[0]).focus(); return; }
  const patch = {}; FIELDS.forEach(f => { const v = $('#' + f).value.trim(); if (v !== profile[f]) patch[f] = v; });
  if ($('#password').value) patch.password = $('#password').value;
  if (avatarFile) patch.avatar = avatarFile.name; // the file itself needs a real upload endpoint
  const btn = $('#updBtn'); btn.disabled = true; btn.textContent = 'Updating…';
  Api.updateAdminProfile(patch).then(p => {
    const hadPw = !!patch.password; profile = p; if (avatarFile) p.avatarUrl = URL.createObjectURL(avatarFile);
    setAdminHeader(p); fill(p); toast(hadPw ? 'Profile and password updated.' : 'Profile updated.'); return loadLogs();
  }).catch(err => {
    if (err.field && $('#' + err.field)) { setErr(err.field, err.message); $('#' + err.field).focus(); } else toast('Could not update your profile. Please try again.');
    sync();
  }).finally(() => { btn.textContent = 'Update Information'; sync(); });
});

/* ---------- avatar preview ---------- */
$('#avatarIn').addEventListener('change', e => {
  const f = e.target.files[0]; if (!f) return;
  if (!f.type.startsWith('image/') || f.size > 2 * 1048576) { toast('Choose an image under 2 MB.'); e.target.value = ''; return; }
  avatarFile = f; const url = URL.createObjectURL(f);
  $$('.av-w').forEach(a => { a.style.backgroundImage = `url("${url}")`; a.classList.add('has-img'); }); sync();
});

/* ---------- init ---------- */
adminReady.then(p => { profile = p; fill(p); }).catch(() => { $('#pform').querySelectorAll('input').forEach(i => i.disabled = true); });
loadLogs();
if (location.hash === '#log') selectTab(1);
