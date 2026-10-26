'use strict';
/* Ben Ibe Flowers – product page. Frontend demo only (see README notes in chat). */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ---------- toast ---------- */
let tt;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(tt); tt = setTimeout(() => t.classList.remove('show'), 2600);
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-toast]'); if (b) toast(b.dataset.toast);
  const m = e.target.closest('[data-modal]'); if (m) openInfo(m.dataset.modal);
});

/* ---------- modal (Esc, backdrop, scroll lock, focus return) ---------- */
let lastFocus;
function openModal(title, html, actions = []) {
  lastFocus = document.activeElement;
  $('#mTitle').textContent = title; $('#mBody').innerHTML = html;
  const a = $('#mActions'); a.innerHTML = '';
  actions.forEach(x => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn ' + (x.dark ? 'dark' : 'light'); b.textContent = x.label; /* [EDITED] actions flagged keep:true stay open so forms can validate before closing */
    b.onclick = () => { if (x.keep) { x.fn && x.fn(); return; } closeModal(); x.fn && x.fn(); }; a.append(b); });
  $('#modal').hidden = false; document.body.classList.add('lock');
  ($('#mActions .btn') || $('.x')).focus();
}
function closeModal() { $('#modal').hidden = true; document.body.classList.remove('lock'); lastFocus && lastFocus.focus(); }
$('#modal').addEventListener('click', e => { if (e.target.closest('[data-close]')) closeModal(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !$('#modal').hidden) closeModal();
  if (e.key === 'Tab' && !$('#modal').hidden) { // keep focus inside dialog
    const f = $$('button,[href],input', $('.dialog')); if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});
function openInfo(k) {
  const d = {
    terms: ['Terms & Conditions', '<p>Replace with the shop’s real terms: orders, substitutions, delivery windows and refunds.</p>'],
    privacy: ['Privacy Policy', '<p>Replace with the shop’s real privacy policy describing what customer data is collected and why.</p>']
  }[k];
  openModal(d[0], d[1], [{ label: 'Close' }]);
}

/* [EDITED] ?. guards below: the admin pages have no storefront header, cart or search form */
/* ---------- mobile nav ---------- */
const burger = $('.burger'), nav = $('#mainnav');
burger?.addEventListener('click', () => { const o = nav.classList.toggle('open'); burger.setAttribute('aria-expanded', o); });
nav?.addEventListener('click', e => { if (e.target.closest('a')) { nav.classList.remove('open'); burger.setAttribute('aria-expanded', false); } });

/* ---------- accordions ---------- */
$$('.acc-h').forEach(h => h.addEventListener('click', () => {
  const a = h.parentElement, o = a.classList.toggle('open'); h.setAttribute('aria-expanded', o);
}));

/* [EDITED] ratings & reviews only run on pages that have them (the checkout page doesn't) */
if ($('#bars')) {
/* ---------- ratings & reviews ---------- */
const dist = [[5, 90], [4, 12], [3, 6], [2, 4], [1, 4]];
$('#bars').innerHTML = dist.map(([n, w]) => `<div class="bar"><span class="st">${'★'.repeat(n)}</span><span class="tr"><b data-w="${w}"></b></span><span>${n}</span></div>`).join('');
const bars = new IntersectionObserver((es, o) => es.forEach(e => { if (e.isIntersecting) { $$('b', e.target).forEach(b => b.style.width = b.dataset.w + '%'); o.disconnect(); } }), { threshold: .3 });
bars.observe($('#bars'));

const reviews = [
  [4, 'Review Review Review Review Review Review Review Review Review Review Review Review Review Review Review Review Review Review Review Review Review Review Review Review', []],
  [5, 'Review Review Review Review Review Review Review Review Review Review Review Review Review Review Review Review Review Review Review Review Review Review Review Review', ['Video', 'Photo']],
  [5, 'Review Review Review Review Review Review Review Review Review Review Review Review Review Review Review Review Review Review Review Review Review Review Review Review', ['Video']],
  [5, 'Review Review Review Review Review Review Review Review Review Review Review Review Review Review Review Review Review', []],
  [4, 'Review Review Review Review Review Review Review Review Review Review Review Review Review Review Review', ['Photo']]
];
let shown = 3;
function renderReviews() {
  $('#reviews').innerHTML = reviews.slice(0, shown).map(([n, t, m]) =>
    `<div class="review"><div class="stars">${'★'.repeat(n)}<span>${'★'.repeat(5 - n) ? ' ' + n : ''}</span></div><p>${t}</p>${m.length ? `<div class="media-row">${m.map(x => `<button class="mbox" data-toast="${x} preview needs real uploaded media.">${x}</button>`).join('')}</div>` : ''}</div>`).join('');
  const more = shown < reviews.length; $('#seeMore').hidden = !more;
}
$('#seeMore').addEventListener('click', () => { shown = reviews.length; renderReviews(); });
renderReviews();
}

/* ---------- header search on pages without a product grid -> go to products page ---------- */
$('#searchForm')?.addEventListener('submit', e => {
  if ($('#grid')) return; // product page handles its own search
  e.preventDefault(); const q = $('#searchInput').value.trim();
  location.href = 'index.html' + (q ? '?q=' + encodeURIComponent(q) : '') + '#more';
});

/* [NEW] shared cart (localStorage) used by the product and checkout pages */
const CART_KEY = 'benibe-cart';
function getCart() { try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch (e) { return []; } }
function saveCart(c) { try { localStorage.setItem(CART_KEY, JSON.stringify(c)); } catch (e) { /* storage blocked */ } }
function updateBadge(pop) {
  const b = $('#cartCount'); if (!b) return;
  const n = getCart().reduce((s, i) => s + i.qty, 0);
  b.hidden = !n; b.textContent = n;
  if (pop) { b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); }
}
function cartAdd(item) { const c = getCart(); c.push(item); saveCart(c); updateBadge(true); }
$('.cart')?.addEventListener('click', () => { location.href = 'order.html'; });
updateBadge();
