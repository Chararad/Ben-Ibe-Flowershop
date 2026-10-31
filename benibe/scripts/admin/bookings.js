'use strict';
/* [NEW] Admin > Bookings: calendar + list of service reservations, with a detail panel. Data comes from Api (api.js). */
const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const peso = n => '₱' + Number(n).toLocaleString('en-PH');
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MON = MONTHS.map(m => m.slice(0, 3));
const parts = iso => iso.split('-').map(Number);
const dFull = iso => { const [y, m, d] = parts(iso); return `${MON[m - 1]} ${d}, ${y}`; };
const dShort = iso => { const [, m, d] = parts(iso); return `${MON[m - 1]} ${d}`; };
const t12 = hhmm => { const [h, m] = hhmm.split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };
const qtyText = b => [b.guests > 0 && `${b.guests} guests`, b.sets > 0 && `${b.sets} ${b.sets === 1 ? 'set' : 'sets'}`].filter(Boolean).join(' · ') || '—';
const ST = { pending: 'Pending', confirmed: 'Confirmed', preparing: 'Preparing', completed: 'Completed', declined: 'Declined' };
const DEP = { paid: 'Paid', pending: 'Pending' };
const TONE = { pending: 'amber', confirmed: 'blue', preparing: 'amber', completed: 'green', declined: 'red', paid: 'green' };
const ACTIVE = ['pending', 'confirmed', 'preparing'];
const S = { view: 'calendar', y: 0, m: 0, status: '', service: '', q: '', id: '', page: 1 };
let selected = '', current = null, staff = [], reqT = 0, reqC = 0, evCache = [];

const chip = (kind, id, value, labels) => { const keys = [value, ...Api.bookingTransitions[kind][value]];
  return `<select class="chip-s" data-kind="${kind}" data-id="${esc(id)}" data-tone="${TONE[value]}" data-prev="${value}" aria-label="${kind === 'deposit' ? 'Deposit' : 'Status'} for #${esc(id)}">${keys.map(k => `<option value="${k}"${k === value ? ' selected' : ''}>${labels[k]}</option>`).join('')}</select>`; };

/* ---------- calendar ---------- */
function renderCal(items) {
  evCache = items; $('#mH').textContent = `${MONTHS[S.m]} ${S.y}`;
  const first = new Date(S.y, S.m, 1).getDay(), n = new Date(S.y, S.m + 1, 0).getDate(), todayIso = new Date().toLocaleDateString('en-CA');
  const by = {}; items.forEach(b => { (by[b.date] = by[b.date] || []).push(b); });
  const cells = []; for (let i = 0; i < first; i++) cells.push('<td class="blank"></td>');
  for (let d = 1; d <= n; d++) {
    const iso = `${S.y}-${String(S.m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`, list = by[iso] || [];
    const chips = list.slice(0, 2).map(b => `<button type="button" class="ev st-${b.status}${b.id === selected ? ' on' : ''}" data-id="${esc(b.id)}" aria-label="${esc(b.service)}, ${t12(b.time)}, ${esc(b.customer)}, ${ST[b.status]}" title="${t12(b.time)} · ${esc(b.customer)}">${esc(b.service)}</button>`).join('')
      + (list.length > 2 ? `<button type="button" class="evmore" data-day="${iso}">+${list.length - 2} more</button>` : '');
    cells.push(`<td${iso === todayIso ? ' class="today"' : ''}><span class="bn">${d}</span>${chips}</td>`);
  }
  while (cells.length % 7) cells.push('<td class="blank"></td>');
  $('#calBody').innerHTML = Array.from({ length: cells.length / 7 }, (_, r) => `<tr>${cells.slice(r * 7, r * 7 + 7).join('')}</tr>`).join('');
}
function loadCal() {
  const my = ++reqC, month = `${S.y}-${String(S.m + 1).padStart(2, '0')}`;
  return Api.getBookingCalendar({ month, status: S.status, service: S.service, q: S.q, id: S.id }).then(r => { if (my === reqC) renderCal(r); })
    .catch(() => { if (my === reqC) $('#calBody').innerHTML = '<tr><td colspan="7" class="calerr">We couldn’t load the calendar. Please try again.</td></tr>'; });
}
const shift = n => { const d = new Date(S.y, S.m + n, 1); S.y = d.getFullYear(); S.m = d.getMonth(); loadCal(); };
$('#prevM').addEventListener('click', () => shift(-1));
$('#nextM').addEventListener('click', () => shift(1));
$('#calBody').addEventListener('click', e => {
  const ev = e.target.closest('.ev'); if (ev) return pick(ev.dataset.id);
  const mo = e.target.closest('.evmore'); if (!mo) return;
  const list = evCache.filter(b => b.date === mo.dataset.day);
  openModal(`Bookings on ${dFull(mo.dataset.day)}`, `<ul class="lm daylist">${list.map(b => `<li><span>${t12(b.time)} · ${esc(b.service)}<br><small>${esc(b.customer)} · ${ST[b.status]}</small></span><button type="button" class="viewb" data-pick="${esc(b.id)}">View</button></li>`).join('')}</ul>`, [{ label: 'Close' }]);
});
$('#mBody').addEventListener('click', e => { const v = e.target.closest('[data-pick]'); if (v) { closeModal(); pick(v.dataset.pick); } });

/* ---------- table ---------- */
function renderRows(items) {
  $('#bBody').innerHTML = items.length ? items.map(b => `<tr data-id="${esc(b.id)}"${b.id === selected ? ' class="is-sel"' : ''}><td class="oid">#${esc(b.id)}</td><td>${esc(b.customer)}</td><td>${esc(b.service)}</td><td>${dShort(b.date)}, ${t12(b.time)}</td><td>${esc(qtyText(b))}</td><td>${chip('deposit', b.id, b.deposit, DEP)}</td><td>${chip('status', b.id, b.status, ST)}</td><td><button type="button" class="viewb" data-id="${esc(b.id)}" aria-label="View booking #${esc(b.id)}">View</button></td></tr>`).join('')
    : `<tr class="empty-row"><td colspan="8">${S.view === 'list' ? 'No bookings match these filters.' : 'No upcoming bookings match these filters.'}</td></tr>`;
}
function pageList(c, n) { const s = new Set([1, n, c - 1, c, c + 1]); if (c <= 2) { s.add(2); s.add(3); } if (c >= n - 1) { s.add(n - 2); s.add(n - 1); }
  const a = [...s].filter(x => x >= 1 && x <= n).sort((x, y) => x - y), o = []; a.forEach((x, i) => { if (i && x - a[i - 1] > 1) o.push('…'); o.push(x); }); return o; }
function renderPager(r) {
  const b = (p, l, aria, dis) => `<button type="button" class="pgb" data-p="${p}" aria-label="${aria}"${dis ? ' disabled' : ''}>${l}</button>`;
  $('#pager').innerHTML = S.view !== 'list' || r.pages <= 1 ? '' : b(1, '«', 'First page', r.page === 1) + b(r.page - 1, '‹', 'Previous page', r.page === 1)
    + pageList(r.page, r.pages).map(x => x === '…' ? '<span class="gap" aria-hidden="true">…</span>' : `<button type="button" class="pgb${x === r.page ? ' cur' : ''}" data-p="${x}" aria-label="Page ${x}"${x === r.page ? ' aria-current="page"' : ''}>${x}</button>`).join('')
    + b(r.page + 1, '›', 'Next page', r.page === r.pages) + b(r.pages, '»', 'Last page', r.page === r.pages);
}
$('#pager').addEventListener('click', e => { const b = e.target.closest('.pgb'); if (!b || b.disabled) return; S.page = +b.dataset.p; loadTable(); });
function loadTable() {
  const my = ++reqT, list = S.view === 'list';
  return Api.getAdminBookings({ scope: list ? 'all' : 'upcoming', status: S.status, service: S.service, q: S.q, id: S.id, page: S.page, pageSize: list ? 10 : 3 }).then(r => {
    if (my !== reqT) return; S.page = r.page; renderRows(r.items); renderPager(r);
    if (!selected && r.items[0]) pick(r.items[0].id, true); else syncUrl();
  }).catch(() => { if (my === reqT) $('#bBody').innerHTML = '<tr class="empty-row"><td colspan="8">We couldn’t load bookings. <button type="button" class="more" id="retry">Try again</button></td></tr>'; });
}
$('#bBody').addEventListener('click', e => { if (e.target.id === 'retry') return loadTable(); const v = e.target.closest('.viewb'); if (v) pick(v.dataset.id); });

/* ---------- view toggle + filters ---------- */
function setView(v) {
  S.view = v; S.page = 1; $$('.fpill').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === v));
  $('#calCard').hidden = v === 'list'; $('#ubH').textContent = v === 'list' ? 'All bookings' : 'Upcoming bookings'; $('#allLink').hidden = v === 'list';
  if (v === 'calendar') loadCal(); loadTable();
}
$$('.fpill').forEach(b => b.addEventListener('click', () => setView(b.dataset.v)));
$('#viewAllB').addEventListener('click', () => setView('list'));
function refilter() { S.page = 1; loadTable(); if (S.view === 'calendar') loadCal(); }
$('#fSt').addEventListener('change', e => { S.status = e.target.value; refilter(); });
$('#fSv').addEventListener('change', e => { S.service = e.target.value; refilter(); });
let t1; const debounce = fn => { clearTimeout(t1); t1 = setTimeout(fn, 250); };
$('#adminSearch').addEventListener('input', e => debounce(() => { S.q = e.target.value; refilter(); }));
$('#idQ').addEventListener('input', e => debounce(() => { S.id = e.target.value; refilter(); }));
$('#idForm').addEventListener('submit', e => { e.preventDefault(); S.id = $('#idQ').value; refilter(); });
$('#adminSearchForm').addEventListener('submit', e => e.preventDefault());
function syncUrl() { const p = new URLSearchParams(); if (S.view === 'list') p.set('view', 'list'); if (selected) p.set('booking', selected); history.replaceState(null, '', location.pathname + (p.toString() ? '?' + p : '')); }

/* ---------- detail panel ---------- */
function renderDetail(b) {
  current = b; const active = ACTIVE.includes(b.status);
  $('#detail').innerHTML = `<h2 class="dhd">Booking #${esc(b.id)}</h2><div class="dbd">
    <dl class="dl"><dt>Customer</dt><dd>${esc(b.customer)}</dd><dt>Phone</dt><dd>${esc(b.phone)}</dd><dt>Service</dt><dd>${esc(b.service)}</dd><dt>Date</dt><dd>${dFull(b.date)}</dd><dt>Time</dt><dd>${t12(b.time)}</dd>
    <dt>Venue</dt><dd>${esc(b.venue)}</dd><dt>Guest / qty</dt><dd>${esc(qtyText(b))}</dd><dt>Deposit</dt><dd>${peso(b.depositAmount)} (${DEP[b.deposit]})</dd><dt>Status</dt><dd><span class="stag" data-tone="${TONE[b.status]}">${ST[b.status]}</span></dd>
    <dt><label for="dAs">Assigned</label></dt><dd><select id="dAs" class="staffsel"${active ? '' : ' disabled'}><option value="">Unassigned</option>${staff.map(s => `<option${s.name === b.assigned ? ' selected' : ''}>${esc(s.name)}</option>`).join('')}</select></dd></dl>
    ${b.declineReason ? `<p class="note-r"><b>Decline reason:</b> ${esc(b.declineReason)}</p>` : ''}
    <label class="cnl" for="dNotes">Customer notes</label><textarea id="dNotes" class="bnotes" readonly rows="5">${esc(b.notes || 'No notes from the customer.')}</textarea>
    <p class="err" id="dErr" role="alert"></p>
    <div class="dact"><button type="button" class="pbtn dark" id="bConfirm"${b.status === 'pending' ? '' : ' disabled'}>Confirm</button><button type="button" class="pbtn line" id="bResched"${active ? '' : ' disabled'}>Reschedule</button><button type="button" class="pbtn line" id="bDecline"${['pending', 'confirmed'].includes(b.status) ? '' : ' disabled'}>Decline</button>
    <button type="button" class="pbtn line wide" data-toast="Chat isn’t built yet.">Chat with customer</button></div></div>`;
}
function pick(id, silent) {
  selected = id; $$('#bBody tr').forEach(r => r.classList.toggle('is-sel', r.dataset.id === id)); $$('.ev').forEach(e => e.classList.toggle('on', e.dataset.id === id)); syncUrl();
  return Api.getAdminBooking(id).then(b => { renderDetail(b); if (!silent && innerWidth <= 1300) $('#detail').scrollIntoView({ behavior: 'smooth', block: 'start' }); })
    .catch(() => { $('#detail').innerHTML = '<p class="muted-p">We couldn’t load that booking.</p>'; });
}
function refresh() { const jobs = [loadTable()]; if (S.view === 'calendar') jobs.push(loadCal()); if (current) jobs.push(pick(current.id, true)); return Promise.all(jobs); }
function apply(id, patch, done, onFail) {
  Api.updateBooking(id, patch).then(() => { toast(done); return refresh(); })
    .catch(e => { if (onFail && e.status === 422) onFail(e); else toast(e.status === 422 ? e.message : 'Could not update that booking. Please try again.'); if (e.status === 404) refresh(); });
}
$('#detail').addEventListener('change', e => { if (e.target.id !== 'dAs' || !current) return; const v = e.target.value; apply(current.id, { assigned: v }, v ? `Assigned to ${v}.` : 'Unassigned.', err => { toast(err.message); e.target.value = current.assigned; }); });
$('#detail').addEventListener('click', e => {
  if (!current) return;
  if (e.target.closest('#bConfirm')) apply(current.id, { status: 'confirmed' }, `Booking #${current.id} confirmed.`);
  if (e.target.closest('#bResched')) rescheduleModal(current);
  if (e.target.closest('#bDecline')) declineModal(current.id);
});

/* ---------- modals ---------- */
const setErr = (id, m) => { $('#' + id + 'E').textContent = m; $('#' + id).setAttribute('aria-invalid', !!m); return !m; };
function rescheduleModal(b) {
  const t = new Date().toLocaleDateString('en-CA');
  openModal(`Reschedule #${b.id}`, `<div class="m-field"><label for="rD">New date</label><input id="rD" type="date" min="${t}" value="${b.date >= t ? b.date : t}"><p class="err" id="rDE" role="alert"></p></div>
    <div class="m-field"><label for="rT">New time (8:00 AM – 6:00 PM)</label><input id="rT" type="time" min="08:00" max="18:00" value="${b.time}"><p class="err" id="rTE" role="alert"></p></div><p class="note">The customer is told about the new time once the backend sends notifications.</p>`,
    [{ label: 'Cancel' }, { label: 'Reschedule', dark: true, keep: true, fn: () => {
      const d = $('#rD').value, tm = $('#rT').value;
      const ok = [setErr('rD', d && d >= t ? '' : 'Choose a date from today onward.'), setErr('rT', tm && tm >= '08:00' && tm <= '18:00' ? '' : 'Choose a time between 8:00 AM and 6:00 PM.')];
      if (ok.includes(false)) return; if (d === b.date && tm === b.time) return closeModal();
      const btn = $('#mActions .btn.dark'); btn.disabled = true;
      Api.updateBooking(b.id, { date: d, time: tm }).then(() => { closeModal(); toast(`#${b.id} moved to ${dFull(d)}, ${t12(tm)}.`); return refresh(); })
        .catch(e => { btn.disabled = false; if (e.field === 'date' || e.field === 'time') setErr(e.field === 'date' ? 'rD' : 'rT', e.message); else toast('Could not reschedule. Please try again.'); });
    } }]);
  $('#rD').focus();
}
function declineModal(id) {
  openModal(`Decline #${id}?`, `<p>Decline this booking? It is recorded in the log history.</p><div class="m-field"><label for="dR">Reason for the customer (optional)</label><textarea id="dR" rows="3" maxlength="200"></textarea><p class="err" id="dRE" role="alert"></p></div>`,
    [{ label: 'Keep it' }, { label: 'Yes, decline', dark: true, fn: () => apply(id, { status: 'declined', reason: $('#dR') ? $('#dR').value : '' }, `Booking #${id} declined.`) }]);
}

/* table chips */
document.addEventListener('change', e => {
  const s = e.target.closest('#bBody .chip-s'); if (!s) return; const { kind, id, prev } = s.dataset, v = s.value;
  if (v === 'declined') { s.value = prev; return declineModal(id); }
  s.disabled = true;
  Api.updateBooking(id, { [kind]: v }).then(() => { toast(`#${id} ${kind} set to ${(kind === 'deposit' ? DEP : ST)[v]}.`); return refresh(); })
    .catch(err => { s.value = prev; s.disabled = false; toast(err.status === 422 ? err.message : 'Could not update that booking. Please try again.'); });
});

/* ---------- init ---------- */
const qs = new URLSearchParams(location.search);
if (/^BKG-\d{3}$/.test(qs.get('booking') || '')) selected = qs.get('booking');
Promise.all([Api.getStaff().then(s => { staff = s; }).catch(() => { }), Api.getAdminBookings({ scope: 'upcoming', pageSize: 1 }).catch(() => ({ items: [] }))]).then(([, first]) => {
  const d = first.items[0] ? parts(first.items[0].date) : [new Date().getFullYear(), new Date().getMonth() + 1]; S.y = d[0]; S.m = d[1] - 1;
  $('#fSv').insertAdjacentHTML('beforeend', Api.bookingServices.map(s => `<option>${esc(s)}</option>`).join(''));
  setView(qs.get('view') === 'list' ? 'list' : 'calendar'); if (selected) pick(selected, true);
});
