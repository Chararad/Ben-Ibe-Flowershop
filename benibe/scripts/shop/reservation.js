'use strict';
/* Service reservation page: calendar, field rules, review modal. Frontend demo only. */
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const today = new Date(); today.setHours(0, 0, 0, 0);
const MAX_AHEAD = 18; // months a booking can be made in advance
let view = new Date(today.getFullYear(), today.getMonth(), 1), picked = null;
const fmtDate = d => d.toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

/* ---------- calendar ---------- */
function renderCal() {
  const y = view.getFullYear(), m = view.getMonth();
  const first = new Date(y, m, 1).getDay(), n = new Date(y, m + 1, 0).getDate();
  const blank = '<span class="day blank" aria-hidden="true"></span>';
  let h = blank.repeat(first);
  for (let d = 1; d <= n; d++) {
    const dt = new Date(y, m, d), sel = picked && +picked === +dt;
    h += `<button type="button" class="day${sel ? ' sel' : ''}${+dt === +today ? ' today' : ''}" data-d="${d}" aria-pressed="${!!sel}" aria-label="${fmtDate(dt)}"${dt < today ? ' disabled' : ''}>${d}</button>`;
  }
  h += blank.repeat((7 - (first + n) % 7) % 7);
  const box = $('#days'); box.innerHTML = h;
  $('#calTitle').textContent = `${MONTHS[m]} ${y}`;
  const diff = (y - today.getFullYear()) * 12 + m - today.getMonth();
  $('#prevM').disabled = diff <= 0; $('#nextM').disabled = diff >= MAX_AHEAD;
}
function shift(n) {
  view = new Date(view.getFullYear(), view.getMonth() + n, 1); renderCal();
  const b = $('#days'); b.classList.remove('fade'); void b.offsetWidth; b.classList.add('fade');
}
$('#prevM').onclick = () => shift(-1);
$('#nextM').onclick = () => shift(1);
$('#days').addEventListener('click', e => {
  const b = e.target.closest('.day[data-d]'); if (!b) return;
  picked = new Date(view.getFullYear(), view.getMonth(), +b.dataset.d);
  $('#dateMsg').textContent = fmtDate(picked); $('#e-date').textContent = '';
  renderCal(); $('.day.sel').focus();
});
renderCal();

/* ---------- fields: live filtering + validation ---------- */
const clean = {
  name: v => v.replace(/[^A-Za-z\u00C0-\u024F\s.'-]/g, ''),
  phone: v => v.replace(/\D/g, ''), guests: v => v.replace(/\D/g, ''), qty: v => v.replace(/\D/g, '')
};
Object.entries(clean).forEach(([id, fn]) => $('#' + id).addEventListener('input', e => { e.target.value = fn(e.target.value); }));
const rules = {
  name: v => !v.trim() ? 'Enter the concierge’s name.' : /^[A-Za-z\u00C0-\u024F][A-Za-z\u00C0-\u024F\s.'-]+$/.test(v.trim()) ? '' : 'Use letters only.',
  phone: v => /^(09\d{9}|639\d{9})$/.test(v) ? '' : 'Enter a Philippine mobile number, like 09XXXXXXXXX.',
  loc: v => v.trim().length >= 8 ? '' : 'Enter the full event address (street, barangay, city).',
  time: v => v ? '' : 'Choose the event time.',
  guests: v => +v >= 1 ? '' : 'Enter the number of guests (1 or more).',
  qty: v => +v >= 1 ? '' : 'Enter how many bouquets or flowers you expect (1 or more).',
  type: v => v ? '' : 'Choose a type of event.'
};
function check(id) {
  const el = $('#' + id), msg = rules[id](el.value);
  $('#e-' + id).textContent = msg; el.setAttribute('aria-invalid', !!msg);
  el.closest('.frame').classList.toggle('invalid', !!msg); return !msg;
}
Object.keys(rules).forEach(id => { const el = $('#' + id); el.addEventListener('blur', () => { if (el.value) check(id); }); el.addEventListener('change', () => check(id)); });

/* ---------- submit -> review modal ---------- */
const esc = s => s.replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
$('#bookForm').addEventListener('submit', e => {
  e.preventDefault();
  const results = Object.keys(rules).map(id => [id, check(id)]);
  const dateOk = !!picked; $('#e-date').textContent = dateOk ? '' : 'Pick an event date on the calendar.';
  if (!dateOk) { ($('.day:not(:disabled)') || $('#nextM')).focus(); return; }
  const bad = results.find(r => !r[1]); if (bad) { $('#' + bad[0]).focus(); return; }
  const v = id => esc($('#' + id).value.trim()) || '—';
  const t = new Date('1970-01-01T' + $('#time').value).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });
  /* [EDITED] payload for Api.placeReservation (the server must re-validate everything and check availability) */
  const payload = { date: picked.toLocaleDateString('en-CA'), time: $('#time').value, location: $('#loc').value.trim(), contact: { name: $('#name').value.trim(), phone: $('#phone').value },
    guests: +$('#guests').value, quantity: +$('#qty').value, eventType: $('#type').value, notes: $('#notes').value.trim() };
  openModal('Review your reservation', `<dl><dt>Date</dt><dd>${fmtDate(picked)}</dd><dt>Time</dt><dd>${t}</dd><dt>Concierge</dt><dd>${v('name')}</dd><dt>Contact</dt><dd>${v('phone')}</dd><dt>Location</dt><dd>${v('loc')}</dd><dt>Guests</dt><dd>${v('guests')}</dd><dt>Bouquets/flowers</dt><dd>${v('qty')}</dd><dt>Event</dt><dd>${v('type')}</dd><dt>Notes</dt><dd>${v('notes')}</dd></dl><p class="note">Demo only: nothing is sent or saved until a backend is connected.</p>`,
    [{ label: 'Edit details' }, { label: 'Confirm reservation', dark: true, fn: () => {
      Api.placeReservation(payload).then(r => openModal('Reservation received', `<p>Your booking number is <b>${esc(r.id)}</b>. The shop will confirm it soon.</p><p class="note">Demo only: stored in this browser, nothing was sent.</p>`,
        [{ label: 'Close' }, { label: 'Track reservation', dark: true, fn: () => { location.href = 'track-booking.html?booking=' + encodeURIComponent(r.id); } }]))
        .catch(() => toast('Could not send your reservation. Please try again.'));
    } }]);
});
