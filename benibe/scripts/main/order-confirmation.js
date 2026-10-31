/* Ben Ibe Flowers – Order confirmation. Reads an order saved in sessionStorage ("benibe.order")
   by a future checkout; opened directly it shows a sample order. Real order numbers, payment and
   delivery pricing need a backend. */
(() => {
  const $ = s => document.querySelector(s);
  const SAMPLE = { ref: 'BIF-000123', name: 'Maria Santos', delivery: 39, address: '123 Sample St., Brgy. Sto. Rosario, Angeles City',
    date: '2026-09-30', start: '16:00', end: '16:30', payment: 'GCash or Card', paid: true, notes: 'Custom note and uploaded photo, if any', sample: true,
    items: [
      { name: 'Product Name', lines: ['3pcs', 'Pink', 'Cream', 'Pink', 'Regular Kraft Paper Bag', 'With Dedication Note'], price: 1025, qty: 1 },
      { name: 'Product Name', lines: ['14pcs', 'Red', 'White', 'Dark Brown', 'Brown', 'Brown', 'Plastic Packaging'], price: 1725, qty: 1 }] };
  let data = null;
  try { data = JSON.parse(sessionStorage.getItem('benibe.order')); } catch (e) { /* storage unavailable */ }
  if (!data || !data.ref || !Array.isArray(data.items) || !data.items.length) data = SAMPLE;

  const money = n => '₱' + Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const set = (id, v) => { $('#' + id).textContent = v; }; // textContent only: never inject user input as HTML
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };

  set('od-first', String(data.name || '').trim().split(/\s+/)[0] || 'friend');
  set('od-ref', 'Order ' + data.ref);
  set('od-addr', data.address);
  set('od-when', window.BenIbe.formatWhen(data.date, data.start, data.end));
  set('od-pay', data.payment);
  set('od-paid', data.paid ? 'Paid' : 'Pending');
  set('od-note', data.notes || 'No custom note');

  let subtotal = 0;
  const list = $('#od-items');
  data.items.forEach((it, i) => {
    const qty = Number(it.qty) || 1, price = Number(it.price) || 0; subtotal += price * qty;
    const li = el('li'); li.style.setProperty('--i', i);
    const img = el('img'); img.src = it.img || '../assets/product.svg'; img.alt = it.name; img.width = 62; img.height = 62;
    const info = el('div'); info.append(el('div', 'nm', it.name));
    const opts = el('ul', 'opt'); (it.lines || []).forEach(l => opts.append(el('li', '', l))); info.append(opts);
    const pr = el('div', 'pr', money(price)); pr.append(el('i', '', 'x' + qty));
    li.append(img, info, pr); list.append(li);
  });
  const delivery = Number(data.delivery) || 0;
  set('od-delivery', money(delivery));
  set('od-total', money(subtotal + delivery));
  if (data.sample) $('#od-sample').hidden = false;

  $('#od-track').addEventListener('click', () => window.BenIbe.toast('Order tracking needs a backend'));
})();
