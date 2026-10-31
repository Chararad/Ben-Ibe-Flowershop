'use strict';
/* [NEW] Track-order page. All data comes from Api (api.js); nothing here knows where orders are stored. */
const STEPS = {
  delivery: [['placed', 'Order Placed'], ['preparing', 'Being Prepared'], ['dispatched', 'Out For Delivery'], ['completed', 'Delivered']],
  pickup: [['placed', 'Order Placed'], ['preparing', 'Being Prepared'], ['dispatched', 'Ready For Pickup'], ['completed', 'Picked Up']]
};
const PILL = { placed: 'Order placed', preparing: 'Being prepared', dispatched: { delivery: 'Out for delivery', pickup: 'Ready for pickup' }, completed: { delivery: 'Delivered', pickup: 'Picked up' } };

function stepText(o, key) {
  const ev = o.events.find(e => e.status === key), pick = o.mode === 'pickup';
  if (key === 'dispatched') {
    if (!ev) return pick ? 'Date and time will appear here' : 'Date, time and carrier tracking number will appear here';
    return stamp(ev.at) + (pick ? '' : o.trackingNumber ? ` • Tracking No. ${o.trackingNumber}` : ' • Carrier tracking number will appear here');
  }
  if (key === 'completed' && !ev) return 'Expected ' + fmtDay(new Date(o.schedule.date + 'T00:00'));
  return ev ? stamp(ev.at) : 'Not started yet';
}

function render(o) {
  const mode = o.mode === 'pickup' ? 'pickup' : 'delivery', steps = STEPS[mode];
  const idx = Math.max(0, steps.findIndex(([k]) => k === o.status)), finished = o.status === 'completed';
  document.title = `Order ${o.id} – Ben Ibe Flowers`;
  $('#oTitle').textContent = 'Order ' + o.id;
  $('#oTrk').textContent = 'Tracking Number' + (mode === 'delivery' ? (o.trackingNumber ? ': ' + o.trackingNumber : ': not available yet') : '');
  const pill = $('#oPill'), p = PILL[o.status]; pill.textContent = typeof p === 'string' ? p : p[mode]; pill.hidden = false;

  $('#timeline').innerHTML = timelineHtml(steps.map(([k, label], i) => ({ cls: i < idx || (i === idx && finished) ? 'done' : i === idx ? 'cur' : 'todo', title: label, text: stepText(o, k) })));

  $('#dH').textContent = mode === 'pickup' ? 'Pickup Details' : 'Delivery Details';
  $('#dBody').innerHTML = `<p>${esc(mode === 'pickup' ? o.branch : o.address)}</p><p>${fmtDay(new Date(o.schedule.date + 'T00:00'))} • ${esc(o.schedule.time)}</p>`;

  $('#items').innerHTML = o.items.map(i => `<div class="oi"><img src="${esc(i.img || '../assets/bouquet-1.svg')}" alt="${esc(i.name)}"><div><b>${esc(i.name)}</b>${(i.lines || []).map(l => `<p>${esc(l)}</p>`).join('')}</div><div class="op"><b>${peso(i.price)}</b><em>x${i.qty}</em></div></div>`).join('');
  const nb = $('#noteBox'), notes = o.notes || []; nb.classList.toggle('ph', !notes.length);
  nb.innerHTML = notes.length ? notes.map(n => `<p>${esc(n)}</p>`).join('') : 'Custom note and uploaded photo, if any';
  $('#fee').textContent = peso(o.fee); $('#total').textContent = peso(o.total);
}

/* [EDITED] loading, polling and lookup now come from tracklib.js (shared with the reservation tracker) */
loadTracker({ get: Api.getOrder, latest: Api.getLatestOrder, render, isFinal: o => o.status === 'completed', noun: 'order', param: 'order', blankTitle: 'Track your order', blankSub: 'Tracking Number' });
bindLookup();
