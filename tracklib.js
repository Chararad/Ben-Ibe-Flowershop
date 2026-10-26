'use strict';
/* [NEW] Helpers shared by track.html (orders) and track-booking.html (reservations). */
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const peso = n => '₱' + Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDay = d => `${DAYS[d.getDay()]}, ${d.getDate()} ${MON[d.getMonth()]}`;
const stamp = iso => { const d = new Date(iso); return `${fmtDay(d)} • ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`; };
const clock = hhmm => { const [h, m] = hhmm.split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };
const CHECK = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#fffdf6" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.500 4.500 4.500L19 7.500"/></svg>';

/* items: [{cls:'done'|'cur'|'todo', title, text}] */
const timelineHtml = items => items.map(({ cls, title, text }) =>
  `<li class="${cls}"${cls === 'cur' ? ' aria-current="step"' : ''}><span class="dot">${cls === 'done' ? CHECK : ''}</span><h3>${esc(title)}</h3>${text ? `<p>${esc(text)}</p>` : ''}</li>`).join('');

/* Loads one record (by ?param= or the latest), renders it, and re-checks every 60 s until it is finished. */
function loadTracker({ get, latest, render, isFinal, noun, param, blankTitle, blankSub }) {
  let current = '', timer = null;
  const qid = new URLSearchParams(location.search).get(param);
  function apply(o) {
    const s = JSON.stringify(o); if (s === current) return; current = s; render(o);
    $('#tkState').hidden = true; $('#tkBody').hidden = false; clearInterval(timer);
    if (!isFinal(o)) timer = setInterval(() => { if (!document.hidden) get(o.id).then(apply).catch(() => { /* keep the last known status */ }); }, 60000);
  }
  function fail(msg) {
    $('#tkBody').hidden = true; $('#oPill').hidden = true; $('#oTitle').textContent = blankTitle; $('#oTrk').textContent = blankSub;
    const s = $('#tkState'); s.textContent = msg; s.hidden = false;
  }
  (qid ? get(qid) : latest()).then(apply)
    .catch(e => fail(e.status === 404 ? `We couldn’t find ${noun} ${qid}. Check the number and try again.` : `We couldn’t load your ${noun}. Please try again in a moment.`));
}

/* "Track a different one": BIF-###### -> orders page, BKG-###### -> reservations page */
function bindLookup() {
  $('#lookup').addEventListener('submit', e => {
    e.preventDefault(); const v = $('#lkId').value.trim().toUpperCase(), o = /^BIF-\d{6}$/.test(v), b = /^BKG-\d{6}$/.test(v);
    $('#lkE').textContent = o || b ? '' : 'Enter a number like BIF-000123 (order) or BKG-000045 (reservation).'; $('#lkId').setAttribute('aria-invalid', !(o || b));
    if (o) location.href = 'track.html?order=' + encodeURIComponent(v); else if (b) location.href = 'track-booking.html?booking=' + encodeURIComponent(v);
  });
}
