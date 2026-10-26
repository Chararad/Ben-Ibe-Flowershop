'use strict';
/* [NEW] Checkout page: contact, delivery/pickup, schedule, payment, summary. Frontend demo only. */
const FEE = 39;
const BRANCHES = ['Sto. Rosario St., Sto. Rosario, Angeles City, Pampanga, Philippines', '291-A Sto. Rosario St. Corner Lakandula St. San Jose, Angeles City, Pampanga, Philippines'];
const SLOTS = [[9, 10], [11, 12], [13, 14]];
const peso = n => '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const icon = s => window.ICON_CAL.replace(/__S__/g, s);
const h12 = h => (h % 12 || 12);
/* [NEW] time range label, e.g. 9:00 - 10:00 AM */
const rng = (a, b) => { const ap = h => h < 12 ? 'AM' : 'PM'; return ap(a) === ap(b) ? `${h12(a)}:00 - ${h12(b)}:00 ${ap(b)}` : `${h12(a)}:00 ${ap(a)} - ${h12(b)}:00 ${ap(b)}`; };
const t12 = hhmm => { const [h, m] = hhmm.split(':').map(Number); return `${h12(h)}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };
const day0 = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const today = day0(new Date());
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const same = (a, b) => a && b && +day0(a) === +day0(b);

/* ---------- cart items (real cart, or sample items matching the design) ---------- */
let items = getCart(), sample = false;
if (!items.length) {
  sample = true;
  items = [
    { name: 'Product Name', price: 1025, qty: 1, img: 'assets/bouquet-1.svg', lines: ['3pcs', 'Pink', 'Cream', 'Pink', 'Regular Kraft Paper Bag', 'With Dedication Note'] },
    { name: 'Product Name', price: 1725, qty: 1, img: 'assets/bouquet-2.svg', lines: ['14pcs', 'Red', 'White', 'Dark Brown', 'Brown', 'Brown', 'Plastic Packaging'] }
  ];
}
const st = { contact: { name: '', phone: '', email: '' }, mode: 'delivery', address: (!sample && items.find(i => i.address) || {}).address || '', branch: '', date: null, slot: null, custom: null, customDate: false, pay: '' };

/* ---------- summary ---------- */
/* [EDITED] note lines are reused when the order is sent */
const noteList = () => sample ? [] : items.flatMap(i => [i.dedication && 'Dedication: ' + i.dedication, i.note && 'Note: ' + i.note, i.photo && 'Photo: ' + i.photo].filter(Boolean));
function renderSummary() {
  $('#sampleTag').textContent = sample ? '(sample items – add products from the product page)' : '';
  $('#items').innerHTML = items.map((i, n) => {
    const lines = i.lines || [...(i.options || []), ...(i.dedication ? ['With Dedication Note'] : [])];
    return `<div class="oi" style="animation-delay:${n * 70}ms"><img src="${i.img || (n % 2 ? 'assets/bouquet-2.svg' : 'assets/bouquet-1.svg')}" alt="${esc(i.name)}"><div><b>${esc(i.name)}</b>${lines.map(l => `<p>${esc(l)}</p>`).join('')}</div><div class="op"><b>${peso(i.price)}</b><em>x${i.qty}</em></div></div>`;
  }).join('');
  const notes = noteList();
  const nb = $('#noteBox'); nb.classList.toggle('ph', !notes.length);
  nb.innerHTML = notes.length ? notes.map(n => `<p>${esc(n)}</p>`).join('') : 'Custom note and uploaded photo, if any';
  const fee = st.mode === 'delivery' ? FEE : 0, sub = items.reduce((s, i) => s + i.price * i.qty, 0);
  $('#fee').textContent = peso(fee); $('#total').textContent = peso(sub + fee);
}

/* ---------- small form modal helper ---------- */
function formModal(title, html, onSave) {
  openModal(title, html, [{ label: 'Cancel' }, { label: 'Save', dark: true, keep: true, fn: () => { if (onSave()) closeModal(); } }]);
  const f = $('#mBody input,#mBody select'); f && f.focus();
}
$('#mBody').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); $('#mActions .btn.dark').click(); } });
const mf = (id, label, attrs = '', val = '') => `<div class="m-field"><label for="${id}">${label}</label><input id="${id}" value="${esc(val)}" ${attrs}><p class="err" id="${id}E" role="alert"></p></div>`;
const setErr = (id, msg) => { $('#' + id + 'E').textContent = msg; $('#' + id).setAttribute('aria-invalid', !!msg); return !msg; };

/* ---------- contact ---------- */
function renderContact() {
  const c = st.contact, v = [[c.name, 'Full name'], [c.phone, 'Contact number'], [c.email, 'Email Address']];
  $('#contactLines').innerHTML = v.map(([a, ph]) => `<p class="${a ? '' : 'ph'}">${esc(a || ph)}</p>`).join('');
}
$('#editContact').onclick = () => formModal('Contact details',
  mf('cName', 'Full name', 'autocomplete="name" maxlength="60"', st.contact.name) + mf('cPhone', 'Contact number', 'inputmode="numeric" autocomplete="tel" maxlength="12" placeholder="09XXXXXXXXX"', st.contact.phone) + mf('cEmail', 'Email address', 'type="email" autocomplete="email" maxlength="80"', st.contact.email),
  () => {
    const n = $('#cName').value.trim(), p = $('#cPhone').value.replace(/\D/g, ''), m = $('#cEmail').value.trim();
    const r = [setErr('cName', /^[A-Za-z\u00C0-\u024F][A-Za-z\u00C0-\u024F\s.'-]+$/.test(n) ? '' : 'Enter your full name (letters only).'),
      setErr('cPhone', /^(09\d{9}|639\d{9})$/.test(p) ? '' : 'Enter a Philippine mobile number, like 09XXXXXXXXX.'),
      setErr('cEmail', /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(m) ? '' : 'Enter a valid email address.')];
    if (r.includes(false)) return false;
    st.contact = { name: n, phone: p, email: m }; renderContact(); return true;
  });

/* ---------- delivery / pickup ---------- */
function renderWhere() {
  const d = st.mode === 'delivery';
  $('#whereTitle').textContent = d ? 'Deliver to' : 'Pick up at';
  $('#changeWhere').textContent = d ? 'Change address' : 'Change branch';
  const t = d ? st.address : st.branch, p = $('#whereText');
  p.textContent = t || (d ? 'address delivery house number, street, barangay, city/town' : 'Choose a branch for pickup');
  p.classList.toggle('ph', !t);
  $('#dateLbl').textContent = `Select ${d ? 'delivery' : 'pickup'} date:`; $('#timeLbl').textContent = `Select ${d ? 'delivery' : 'pickup'} time:`;
  $$('.tg').forEach(b => b.setAttribute('aria-pressed', b.dataset.mode === st.mode));
  renderSummary();
}
$$('.tg').forEach(b => b.onclick = () => { st.mode = b.dataset.mode; renderWhere(); });
$('#changeWhere').onclick = () => {
  if (st.mode === 'delivery') return formModal('Delivery address', mf('aAddr', 'House no., street, barangay, city/town', 'autocomplete="street-address" maxlength="160"', st.address),
    () => { const v = $('#aAddr').value.trim(); if (!setErr('aAddr', v.length >= 8 ? '' : 'Enter the full address (street, barangay, city).')) return false; st.address = v; renderWhere(); return true; });
  formModal('Pickup branch', BRANCHES.map((b, i) => `<label class="m-radio"><input type="radio" name="br" value="${i}" ${st.branch === b ? 'checked' : ''}><span>${esc(b)}</span></label>`).join('') + '<p class="err" id="brE" role="alert"></p>',
    () => { const r = $('input[name=br]:checked'); if (!r) { $('#brE').textContent = 'Choose a branch.'; return false; } st.branch = BRANCHES[+r.value]; renderWhere(); return true; });
};

/* ---------- date + time ---------- */
const dayLabel = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
function renderDates() {
  const q = [[today, 'Today'], [addDays(today, 1), 'Tomorrow'], [addDays(today, 2), addDays(today, 2).toLocaleDateString('en-US', { weekday: 'long' })]];
  let h = q.map(([d, l], i) => `<button type="button" class="tile" data-i="${i}" aria-pressed="${same(st.date, d) && !st.customDate}"><small>${dayLabel(d)}</small><b>${l}</b></button>`).join('');
  h += st.customDate ? `<button type="button" class="tile" id="pickDate" aria-pressed="true" aria-label="Change date"><small>${dayLabel(st.date)}</small><b>${st.date.toLocaleDateString('en-US', { weekday: 'short' })}</b></button>`
    : `<button type="button" class="tile" id="pickDate" aria-label="Pick another date">${icon(40)}</button>`;
  $('#dateTiles').innerHTML = h;
  $$('#dateTiles [data-i]').forEach(b => b.onclick = () => { st.date = q[+b.dataset.i][0]; st.customDate = false; fixSlot(); renderDates(); renderTimes(); });
  $('#pickDate').onclick = () => {
    const iso = d => d.toLocaleDateString('en-CA');
    formModal('Pick a date', mf('dDate', 'Date', `type="date" min="${iso(today)}" max="${iso(addDays(today, 90))}"`, st.date ? iso(st.date) : ''),
      () => { const v = $('#dDate').value; const d = v && day0(new Date(v + 'T00:00')); if (!setErr('dDate', d && d >= today && d <= addDays(today, 90) ? '' : 'Choose a date within the next 90 days.')) return false;
        st.date = d; st.customDate = ![0, 1, 2].some(n => same(d, addDays(today, n))); fixSlot(); renderDates(); renderTimes(); return true; });
  };
}
const minStart = () => { const n = new Date(); return n.getHours() * 60 + n.getMinutes() + 60; }; // needs 1 hour lead time
function fixSlot() { if (st.slot !== null && st.slot !== 'custom' && same(st.date, today) && SLOTS[st.slot][0] * 60 < minStart()) st.slot = null; if (st.slot === 'custom' && same(st.date, today) && toMin(st.custom) < minStart()) { st.slot = null; st.custom = null; } }
const toMin = v => { const [h, m] = v.split(':').map(Number); return h * 60 + m; };
function renderTimes() {
  const isToday = same(st.date, today);
  let h = SLOTS.map(([a, b], i) => `<button type="button" class="tile" data-s="${i}" aria-pressed="${st.slot === i}"${isToday && a * 60 < minStart() ? ' disabled' : ''}>${h12(a)}:00-${h12(b)}:00</button>`).join('');
  h += st.slot === 'custom' ? `<button type="button" class="tile" id="pickTime" aria-pressed="true" aria-label="Change time">${t12(st.custom)}</button>` : `<button type="button" class="tile" id="pickTime" aria-label="Pick another time">${icon(20)}</button>`;
  $('#timeTiles').innerHTML = h;
  $$('#timeTiles [data-s]').forEach(b => b.onclick = () => { st.slot = +b.dataset.s; renderTimes(); });
  $('#pickTime').onclick = () => formModal('Pick a time', mf('tTime', 'Time (shop hours 8:00 AM – 6:00 PM)', 'type="time" min="08:00" max="18:00"', st.custom || ''),
    () => { const v = $('#tTime').value; let msg = '';
      if (!v) msg = 'Choose a time.'; else if (toMin(v) < 480 || toMin(v) > 1080) msg = 'Choose a time between 8:00 AM and 6:00 PM.';
      else if (isToday && toMin(v) < minStart()) msg = 'For today, choose a time at least 1 hour from now.';
      if (!setErr('tTime', msg)) return false; st.slot = 'custom'; st.custom = v; renderTimes(); return true; });
}

/* ---------- payment ---------- */
$$('.pr').forEach(b => b.onclick = () => { st.pay = b.dataset.pay; $$('.pr').forEach(x => x.setAttribute('aria-checked', x === b)); });

/* ---------- place order ---------- */
function fail(msg, boxId, focus) {
  toast(msg); const b = $(boxId); b.scrollIntoView({ behavior: 'smooth', block: 'center' });
  b.classList.remove('flash'); void b.offsetWidth; b.classList.add('flash'); focus && focus();
}
$('#placeOrder').onclick = () => {
  const c = st.contact, d = st.mode === 'delivery';
  if (!c.name || !c.phone || !c.email) return fail('Add your contact details first.', '#boxContact', () => $('#editContact').click());
  if (d && !st.address) return fail('Add a delivery address.', '#boxWhere', () => $('#changeWhere').click());
  if (!d && !st.branch) return fail('Choose a pickup branch.', '#boxWhere', () => $('#changeWhere').click());
  if (!st.date) return fail(`Select a ${d ? 'delivery' : 'pickup'} date.`, '#boxSched');
  if (st.slot === null) return fail(`Select a ${d ? 'delivery' : 'pickup'} time.`, '#boxSched');
  if (!st.pay) return fail('Select a payment method.', '#boxPay');
  const time = st.slot === 'custom' ? t12(st.custom) : `${h12(SLOTS[st.slot][0])}:00-${h12(SLOTS[st.slot][1])}:00`;
  /* [EDITED] payload sent to Api.placeOrder (the server must recompute prices, fee and total itself) */
  const payload = { contact: { ...c }, mode: st.mode, address: d ? st.address : '', branch: d ? '' : st.branch,
    schedule: { date: st.date.toLocaleDateString('en-CA'), time: st.slot === 'custom' ? t12(st.custom) : rng(...SLOTS[st.slot]) }, payment: st.pay,
    items: items.map((i, n) => ({ name: i.name, price: i.price, qty: i.qty, lines: i.lines || [...(i.options || []), ...(i.dedication ? ['With Dedication Note'] : [])], img: i.img || (n % 2 ? 'assets/bouquet-2.svg' : 'assets/bouquet-1.svg') })), notes: noteList() };
  openModal('Review and place order', `<dl><dt>Name</dt><dd>${esc(c.name)}</dd><dt>Contact</dt><dd>${esc(c.phone)}<br>${esc(c.email)}</dd><dt>${d ? 'Deliver to' : 'Pick up at'}</dt><dd>${esc(d ? st.address : st.branch)}</dd><dt>When</dt><dd>${st.date.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })}, ${time}</dd><dt>Payment</dt><dd>${esc(st.pay)}</dd><dt>Total</dt><dd>${$('#total').textContent}</dd></dl><p class="note">Demo only: no payment is taken and no order is sent until a backend is connected.</p>`,
    [{ label: 'Go back' }, { label: 'Place order', dark: true, fn: () => {
      const b = $('#placeOrder'); b.disabled = true; b.textContent = 'Placing order…';
      Api.placeOrder(payload).then(o => {
        if (!sample) { saveCart([]); updateBadge(); }
        b.textContent = 'Order placed';
        openModal('Order placed', `<p>Your order number is <b>${esc(o.id)}</b>.</p><p class="note">Demo only: stored in this browser, nothing was sent or charged.</p>`,
          [{ label: 'Close' }, { label: 'Track order', dark: true, fn: () => { location.href = 'track.html?order=' + encodeURIComponent(o.id); } }]);
      }).catch(() => { b.disabled = false; b.textContent = 'Place Order'; toast('Could not place the order. Please try again.'); });
    } }]);
};

renderContact(); renderWhere(); renderDates(); renderTimes();
