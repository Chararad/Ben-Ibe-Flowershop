'use strict';
/* [NEW] Shared admin shell: sidebar drawer, header popovers, signed-in admin name. Reused by every admin page. */
const adminReady = Api.getAdminProfile(); // pages await this for the profile; the API is only called once

function setAdminHeader(p) {
  const full = `${p.firstName} ${p.lastName}`.trim();
  $('#meName').textContent = full; $('#meRole').textContent = p.role;
  $('#greet').textContent = `Blooming Day, ${full}!`;
  if (p.avatarUrl) { $$('.av-w').forEach(a => { a.style.backgroundImage = `url("${p.avatarUrl}")`; a.classList.add('has-img'); }); }
}
adminReady.then(setAdminHeader).catch(e => {
  $('#greet').textContent = e.status === 401 || e.status === 403 ? 'Please sign in as an administrator.' : 'Could not load your profile.';
});

/* ---------- sidebar drawer (phones/tablets) ---------- */
const sbEl = $('#sidebar'), scrimEl = $('#scrim'), drawerBtn = $('.ah-burger');
function drawer(open) {
  sbEl.classList.toggle('is-open', open); scrimEl.hidden = !open; drawerBtn.setAttribute('aria-expanded', open);
  document.body.classList.toggle('lock', open);
  if (open) $('.bi-sidebar__link', sbEl).focus(); else if (!open && document.activeElement && sbEl.contains(document.activeElement)) drawerBtn.focus();
}
drawerBtn.addEventListener('click', () => drawer(!sbEl.classList.contains('is-open')));
scrimEl.addEventListener('click', () => drawer(false));
sbEl.addEventListener('click', e => { if (e.target.closest('.bi-sidebar__link')) drawer(false); });
matchMedia('(min-width:901px)').addEventListener('change', e => { if (e.matches) drawer(false); });

/* ---------- popovers (bell + account) ---------- */
const pops = [['#bellBtn', '#bellPop'], ['#meBtn', '#mePop']].map(([b, p]) => [$(b), $(p)]);
function closePops(except) { pops.forEach(([b, p]) => { if (p !== except) { p.hidden = true; b.setAttribute('aria-expanded', false); } }); }
pops.forEach(([b, p]) => b.addEventListener('click', () => {
  const open = p.hidden; closePops(p); p.hidden = !open; b.setAttribute('aria-expanded', open);
  if (open && p.id === 'bellPop') loadNotes(true);
}));
document.addEventListener('click', e => { if (!e.target.closest('.pw')) closePops(); });
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  const o = pops.find(([, p]) => !p.hidden);
  if (o && $('#modal').hidden) { closePops(); o[0].focus(); } else if (sbEl.classList.contains('is-open')) drawer(false);
});

/* ---------- notifications ---------- */
const stampShort = iso => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
function loadNotes(markRead) {
  Api.getNotifications().then(list => {
    $('#bellDot').hidden = !list.some(n => !n.read) || !!markRead;
    $('#bellList').innerHTML = list.length ? list.map(n => `<li>${escHtml(n.text)}<small>${stampShort(n.at)}</small></li>`).join('') : '<li class="muted">You’re all caught up.</li>';
    if (markRead && list.some(n => !n.read)) Api.markNotificationsRead();
  }).catch(() => { $('#bellList').innerHTML = '<li class="muted">Couldn’t load notifications.</li>'; });
}
const escHtml = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
loadNotes(false);
