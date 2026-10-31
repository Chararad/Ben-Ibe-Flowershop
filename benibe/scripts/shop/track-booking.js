'use strict';
/* [NEW] Track-booking page. Data comes from Api (api.js); shared helpers from tracklib.js. */
const STEPS = [['pending', 'Reservation'], ['confirmed', 'Confirmation'], ['preparing', 'Preparation'], ['completed', 'Day of the Event']];
const CURRENT = { pending: 1, confirmed: 2, preparing: 2, completed: 3 }; // which step is "in progress" for each status
const PILL = { pending: 'Pending', confirmed: 'Confirmed', preparing: 'Preparing', completed: 'Completed' };

function stepText(b, key) {
  const ev = b.events.find(e => e.status === key);
  if (key === 'completed') return ev ? stamp(ev.at) : 'Expected ' + fmtDay(new Date(b.date + 'T00:00'));
  if (key === 'confirmed' && !ev) return 'Waiting for the shop to confirm your reservation';
  return ev ? stamp(ev.at) : '';
}

function render(b) {
  const idx = CURRENT[b.status] ?? 1, finished = b.status === 'completed';
  document.title = `Booking ${b.id} – Ben Ibe Flowers`;
  $('#oTitle').textContent = 'Booking ' + b.id;
  $('#oTrk').textContent = 'Event: ' + b.eventType;
  const pill = $('#oPill'); pill.textContent = PILL[b.status] || b.status; pill.hidden = false;

  $('#timeline').innerHTML = timelineHtml(STEPS.map(([k, label], i) => ({ cls: i < idx || (i === idx && finished) ? 'done' : i === idx ? 'cur' : 'todo', title: label, text: stepText(b, k) })));

  $('#rBody').innerHTML = `<p>${esc(b.location)}</p><p>${fmtDay(new Date(b.date + 'T00:00'))} • ${clock(b.time)}</p>
    <div class="kv"><p>Booked by: <b>${esc(b.contact.name)}</b></p><p>Contact: <b>${esc(b.contact.phone)}</b></p><p>Expected Guest: <b>${b.guests}</b></p><p>Expected Quantity of Bouquet/Flowers: <b>${b.quantity}</b></p></div>`;
  const nb = $('#noteBox'); nb.classList.toggle('ph', !b.notes); nb.textContent = b.notes || 'Custom note';
  $('#fee').textContent = b.quote ? peso(b.quote.fee) : 'To be quoted'; $('#total').textContent = b.quote ? peso(b.quote.total) : 'To be quoted';
}

loadTracker({ get: Api.getReservation, latest: Api.getLatestReservation, render, isFinal: b => b.status === 'completed', noun: 'reservation', param: 'booking', blankTitle: 'Track your booking', blankSub: 'Reservation' });
bindLookup();
