/* Ben Ibe Flowers – Services page: booking form. Saves the booking in sessionStorage and opens the
   confirmation page. Real submission, order numbers and payment need a backend. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const form = $('#book-form'), date = $('#bk-date');

  const d = new Date(); date.min = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  $$('[data-book]').forEach(b => b.addEventListener('click', () => { $('#bk-service').value = b.dataset.book; }));

  const rules = {
    'bk-name':     v => v.trim().length >= 2 ? '' : 'Please enter your full name.',
    'bk-email':    v => /^\S+@\S+\.\S+$/.test(v) ? '' : 'Enter a valid email address.',
    'bk-phone':    v => /^(\+?63|0)9\d{9}$/.test(v.replace(/[\s-]/g, '')) ? '' : 'Enter a valid PH mobile number, e.g. 0969 200 8228.',
    'bk-date':     v => !v ? 'Choose an event date.' : v < date.min ? 'Date cannot be in the past.' : '',
    'bk-guests':   v => Number.isInteger(+v) && +v >= 1 && +v <= 300 && v !== '' ? '' : 'Enter 1 to 300 guests.',
    'bk-location': v => v.trim().length >= 5 ? '' : 'Enter the event address (street, barangay, city/town).',
    'bk-start':    v => v ? '' : 'Choose a start time.',
    'bk-end':      v => !v ? 'Choose an end time.' : $('#bk-start').value && v <= $('#bk-start').value ? 'End time must be after the start time.' : '',
    'bk-qty':      v => v === '' || (Number.isInteger(+v) && +v >= 1 && +v <= 500) ? '' : 'Enter 1 to 500 bouquets, or leave blank.'
  };
  const check = id => { const el = $('#' + id), msg = rules[id](el.value); $('#' + id + '-e').textContent = msg; el.classList.toggle('bad', !!msg); el.setAttribute('aria-invalid', !!msg); return !msg; };
  Object.keys(rules).forEach(id => $('#' + id).addEventListener('blur', () => check(id)));

  form.addEventListener('submit', e => {
    e.preventDefault();
    const ids = Object.keys(rules), results = ids.map(check); // validate all so every error shows
    const bad = ids.find((id, i) => !results[i]);
    if (bad) { $('#' + bad).focus(); return; }
    const v = id => $('#' + id).value.trim();
    const booking = { ref: 'BIF-' + String(Date.now()).slice(-6), service: v('bk-service'), occasion: v('bk-occasion'), name: v('bk-name'),
      email: v('bk-email'), phone: v('bk-phone'), date: v('bk-date'), start: v('bk-start'), end: v('bk-end'), guests: v('bk-guests'),
      qty: v('bk-qty'), location: v('bk-location'), branch: v('bk-branch'), payment: v('bk-pay'), notes: v('bk-notes') };
    try { sessionStorage.setItem('benibe.booking', JSON.stringify(booking)); } catch (err) { /* storage blocked: page falls back to sample */ }
    window.location.href = 'booking-confirmation.html';
  });
})();
