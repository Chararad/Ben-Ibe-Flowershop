/* Ben Ibe Flowers - main site: homepage content, cart badge demo, scroll reveal, back-to-top and small helpers
   shared by the page scripts. The navbar, footer, login popup, toast and popups live in js/components.js. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const shell = window.BenIbeShell;

  // Product + review templates (edit the arrays to change content)
  const products = Array.from({ length: 10 }, () => ({ name: 'NAME', price: 1543, rating: 5, count: 10 }));
  const peso = n => '₱' + n.toLocaleString('en-PH');
  if ($('#product-grid') && !$('#product-grid').dataset.static) $('#product-grid').innerHTML = products.map((p, i) => `
    <article class="card"><div class="ph"><img src="../assets/product.svg" alt="Bouquet ${i + 1}" loading="lazy" width="300" height="400"></div>
    <div class="row"><span>${p.name}</span><span class="stars" aria-label="${p.rating} out of 5">★★★★★ <small>(${p.count})</small></span></div>
    <div class="row"><span class="price">${peso(p.price)}</span><button class="add" aria-label="Add ${p.name} to cart">+</button></div></article>`).join('');
  if ($('#review-grid')) $('#review-grid').innerHTML = Array.from({ length: 4 }, () => `
    <article class="rev"><div class="av" role="img" aria-label="Customer photo placeholder"></div>
    <p>Customer review text goes here.</p><div class="stars" aria-label="5 out of 5">★★★★★</div></article>`).join('');

  // Cart (in-memory demo only: real cart and checkout need a backend)
  let cart = 0;
  $('#product-grid')?.addEventListener('click', e => {
    if (e.target.closest('.add')) { shell.setCartCount(++cart, { pop: true }); shell.toast('Added to cart'); }
  });
  document.addEventListener('bi:cart-click', e => {
    e.preventDefault();
    shell.toast(cart ? `${cart} item(s) in cart – checkout needs backend` : 'Your cart is empty');
  });

  // Scroll reveal
  const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { threshold: .12 });
  $$('.reveal').forEach(el => io.observe(el));

  // Back-to-top button (long pages)
  const toTop = $('#to-top');
  if (toTop) {
    addEventListener('scroll', () => toTop.classList.toggle('show', scrollY > 600), { passive: true });
    toTop.addEventListener('click', () => scrollTo({ top: 0, behavior: 'smooth' }));
  }

  // "Wed, 30 Sep • 4:00 - 4:30 PM" from a YYYY-MM-DD date and 24h start/end times
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const t12 = t => { const [h, m] = String(t).split(':').map(Number); return { txt: `${h % 12 || 12}:${String(m).padStart(2, '0')}`, ap: h < 12 ? 'AM' : 'PM' }; };
  const formatWhen = (date, start, end) => {
    const [y, m, d] = String(date).split('-').map(Number), dt = new Date(y, m - 1, d);
    if (isNaN(dt)) return '—';
    const a = t12(start), b = t12(end);
    return `${DAYS[dt.getDay()]}, ${d} ${MONTHS[m - 1]} • ${a.txt}${a.ap === b.ap ? '' : ' ' + a.ap} - ${b.txt} ${b.ap}`;
  };

  // Helpers used by the other page scripts of the main site
  window.BenIbe = { toast: shell.toast, open: shell.openModal, close: shell.closeModal, formatWhen };
})();
