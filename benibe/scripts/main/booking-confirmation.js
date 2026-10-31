/* Ben Ibe Flowers – Booking confirmation. Reads the booking saved by services.js (sessionStorage).
   Opened directly, it shows sample data. A real order number, payment and totals need a backend. */
(() => {
  const $ = s => document.querySelector(s);
  const SAMPLE = { ref: 'BIF-000123', service: 'Bloom Cart', occasion: 'Birthday', name: 'Maria Santos', phone: '0969 200 8228',
    guests: 30, qty: 30, location: '123 Sample St., Brgy. Sto. Rosario, Angeles City', date: '2026-09-30', start: '16:00', end: '16:30',
    payment: 'GCash or Card', notes: 'Custom note', sample: true };
  let data = null;
  try { data = JSON.parse(sessionStorage.getItem('benibe.booking')); } catch (e) { /* storage unavailable */ }
  if (!data || !data.ref) data = SAMPLE;

  const set = (id, v) => { $('#' + id).textContent = v; }; // textContent only: user input is never injected as HTML

  set('bk-first', String(data.name).trim().split(/\s+/)[0] || 'friend');
  set('bk-ref', 'Order ' + data.ref);
  set('bk-type', data.occasion ? `${data.service} – ${data.occasion}` : data.service);
  set('bk-loc', data.location);
  set('bk-when', window.BenIbe.formatWhen(data.date, data.start, data.end));
  set('bk-pay', data.payment);
  set('bk-by', data.name);
  set('bk-contact', [data.phone, data.email].filter(Boolean).join(' · '));
  set('bk-guests', data.guests);
  set('bk-qty', data.qty || 'Not specified');
  set('bk-note', data.notes || 'No custom note');
  if (data.sample) { set('bk-delivery', '₱39.00'); set('bk-total', '₱2,789.00'); $('#bk-sample').hidden = false; }
  else { set('bk-delivery', 'To be confirmed'); set('bk-total', 'To be confirmed'); set('bk-paid', 'Pending'); }

  $('#bk-track').addEventListener('click', () => window.BenIbe.toast('Tracking needs a backend – the branch will confirm your booking'));
})();
