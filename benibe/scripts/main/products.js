/* Ben Ibe Flowers – Products page: filtering + pagination (demo data, no backend). */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // ---- Demo catalogue (edit/replace with real data or an API later) ----
  const COLORS = ['Red', 'Pink', 'Orange', 'Yellow', 'Green', 'Blue', 'Purple', 'White', 'Black'];
  const SUBS = ['Local Roses', 'Lisianthus', 'Ecuadorian', 'Imported Roses', 'Carnation', 'Gerbera', 'Gerbera Mix', 'Carnation Mix', 'Stargazer', 'Sunlight', 'Tulips', 'Roses and tulips', 'Sunflower', 'Coquette', 'Assorted'];
  const TREE = { 'Fresh Bouquets': SUBS, 'Dried Flowers': [], 'Flower Domes': [], 'Balloons': [] };
  const RATINGS = [5, 4, 4, 3, 5, 2, 4, 1, 5];
  const products = []; let n = 0;
  const add = (cat, sub, name) => { n++; products.push({ name, cat, sub, color: COLORS[(n * 4) % 9], price: 500 + (n * 370) % 4200, rating: RATINGS[n % 9], count: 5 + (n * 7) % 40 }); };
  SUBS.forEach(s => add('Fresh Bouquets', s, s + ' Bouquet'));
  ['Dried Flowers', 'Flower Domes', 'Balloons'].forEach(c => { for (let i = 1; i <= 6; i++) add(c, null, c.replace(/s$/, '') + ' ' + i); });

  const PER = 9, MAX = 5000;
  const st = { min: 0, max: MAX, colors: new Set(), cats: new Set(), rating: 0, q: '', page: 1 };
  const peso = v => '₱' + v.toLocaleString('en-PH');
  const side = $('#filters'), grid = $('#product-grid'), pager = $('#pager'), count = $('#count');
  const toggle = (set, v, on) => on ? set.add(v) : set.delete(v);

  // ---- Sidebar ----
  const chk = (label, attrs, checked) => `<label class="chk"><input type="checkbox" ${attrs} ${checked ? 'checked' : ''}><span>${label}</span></label>`;
  function buildSidebar() {
    side.innerHTML = `<h2>Filter</h2>
    <div class="f-group"><div class="f-row"><h3>Price Range</h3><span id="pr-label"></span></div>
      <div class="dual"><div class="track"><div class="fill" id="fill"></div></div>
      <input type="range" id="pmin" min="0" max="${MAX}" step="100" value="${st.min}" aria-label="Minimum price">
      <input type="range" id="pmax" min="0" max="${MAX}" step="100" value="${st.max}" aria-label="Maximum price"></div></div>
    <div class="f-group"><h3>Colors</h3>${COLORS.map(c => chk(c, `data-color="${c}"`, st.colors.has(c))).join('')}</div>
    <div class="f-group"><h3>Categories</h3>${Object.entries(TREE).map(([c, subs]) =>
      chk(c, `data-cat="${c}"`, st.cats.has(c)).replace('class="chk"', 'class="chk parent"') +
      (subs.length ? `<div class="subs">${subs.map(s => chk(s, `data-sub="${c}/${s}"`, st.cats.has(c + '/' + s))).join('')}</div>` : '')).join('')}</div>
    <div class="f-group"><h3>Minimum Rating</h3>${[4, 3, 2, 1].map(r => `<label class="chk"><input type="radio" name="rating" data-rating="${r}" ${st.rating === r ? 'checked' : ''}><span>${r}+ <span class="stars" aria-hidden="true">${'★'.repeat(r)}</span></span></label>`).join('')}</div>
    <button class="clear" data-clear>Clear all filters</button>`;
    Object.keys(TREE).forEach(syncParent); syncPrice();
  }
  function syncParent(c) {
    const subs = TREE[c], el = $(`[data-cat="${c}"]`, side); if (!subs.length || !el) return;
    const k = subs.filter(s => st.cats.has(c + '/' + s)).length;
    el.checked = k === subs.length; el.indeterminate = k > 0 && k < subs.length; toggle(st.cats, c, k === subs.length);
  }
  function syncPrice() {
    const a = $('#pmin'), b = $('#pmax'); $('#pr-label').textContent = `₱${st.min}-${st.max}`;
    $('#fill').style.left = st.min / MAX * 100 + '%'; $('#fill').style.width = (st.max - st.min) / MAX * 100 + '%';
    a.style.zIndex = st.min > MAX / 2 ? 3 : 1; b.style.zIndex = 2; // keep both thumbs grabbable
  }

  side.addEventListener('input', e => {
    if (e.target.id !== 'pmin' && e.target.id !== 'pmax') return;
    let a = +$('#pmin').value, b = +$('#pmax').value;
    if (a > b) { if (e.target.id === 'pmin') a = b; else b = a; }
    $('#pmin').value = a; $('#pmax').value = b; st.min = a; st.max = b; st.page = 1; syncPrice(); render();
  });
  side.addEventListener('change', e => {
    const t = e.target, d = t.dataset;
    if (d.color) toggle(st.colors, d.color, t.checked);
    else if (d.cat) { toggle(st.cats, d.cat, t.checked); TREE[d.cat].forEach(s => toggle(st.cats, d.cat + '/' + s, t.checked)); $$(`[data-sub^="${d.cat}/"]`, side).forEach(i => i.checked = t.checked); t.indeterminate = false; }
    else if (d.sub) { toggle(st.cats, d.sub, t.checked); syncParent(d.sub.split('/')[0]); }
    else return;
    st.page = 1; render();
  });
  side.addEventListener('click', e => { // radios can't be unchecked natively, so handle click
    const r = e.target.dataset.rating; if (r === undefined) return;
    if (st.rating === +r) { e.target.checked = false; st.rating = 0; } else st.rating = +r;
    st.page = 1; render();
  });
  document.addEventListener('click', e => {
    if (!e.target.closest('[data-clear]')) return;
    Object.assign(st, { min: 0, max: MAX, rating: 0, q: '', page: 1 }); st.colors.clear(); st.cats.clear();
    $('#bi-search-input').value = ''; buildSidebar(); render();
  });

  // ---- Search: the header search box (js/components.js) filters this page by name ----
  const applySearch = query => { st.q = query; st.page = 1; render(); };
  document.addEventListener('bi:search', e => { e.preventDefault(); applySearch(e.detail.query); });
  $('#bi-search-input').addEventListener('input', e => applySearch(e.target.value.trim()));
  const searchFromOtherPage = new URLSearchParams(location.search).get('q'); // arriving from another page's search box
  if (searchFromOtherPage) { $('#bi-search-input').value = searchFromOtherPage; st.q = searchFromOtherPage; }

  // ---- Mobile filter toggle ----
  const ft = $('#filter-toggle');
  ft.addEventListener('click', () => { const o = side.classList.toggle('open'); ft.setAttribute('aria-expanded', o); ft.textContent = o ? 'Hide filters' : 'Show filters'; });

  // ---- Results ----
  const matches = p => p.price >= st.min && p.price <= st.max && p.rating >= st.rating
    && (!st.colors.size || st.colors.has(p.color))
    && (!st.cats.size || st.cats.has(p.sub ? p.cat + '/' + p.sub : p.cat))
    && p.name.toLowerCase().includes(st.q.toLowerCase());
  const card = (p, i) => `<article class="card" style="--i:${i}"><div class="ph"><img src="../assets/product.svg" alt="${p.name}" loading="lazy" width="300" height="400"></div>
    <div class="row"><span>${p.name}</span><span class="stars" aria-label="Rated ${p.rating} out of 5">${'★'.repeat(p.rating)}${'☆'.repeat(5 - p.rating)} <small>(${p.count})</small></span></div>
    <div class="row"><span class="price">${peso(p.price)}</span><button class="add" aria-label="Add ${p.name} to cart">+</button></div></article>`;

  function render() {
    const list = products.filter(matches), pages = Math.max(1, Math.ceil(list.length / PER));
    st.page = Math.min(st.page, pages);
    const slice = list.slice((st.page - 1) * PER, st.page * PER);
    grid.innerHTML = slice.length ? slice.map(card).join('') : '<div class="empty"><p>No products match your filters.</p><button class="btn-order" data-clear>Clear filters</button></div>';
    count.textContent = `${list.length} product${list.length === 1 ? '' : 's'} found`;
    renderPager(pages);
  }
  function renderPager(total) {
    if (total <= 1) { pager.innerHTML = ''; return; }
    const set = new Set([1, total]), c = st.page;
    (c <= 3 ? [2, 3] : c >= total - 2 ? [total - 2, total - 1] : [c - 1, c, c + 1]).forEach(p => p > 0 && p <= total && set.add(p));
    const nums = [...set].sort((a, b) => a - b);
    const b = (go, label, aria, dis) => `<button data-go="${go}" aria-label="${aria}" ${dis ? 'disabled' : ''}>${label}</button>`;
    let h = b(1, '«', 'First page', c === 1) + b(c - 1, '‹', 'Previous page', c === 1);
    nums.forEach((p, i) => { if (i && p - nums[i - 1] > 1) h += '<span aria-hidden="true">…</span>'; h += `<button data-go="${p}" ${p === c ? 'aria-current="page"' : ''} aria-label="Page ${p}">${p}</button>`; });
    pager.innerHTML = h + b(c + 1, '›', 'Next page', c === total) + b(total, '»', 'Last page', c === total);
  }
  pager.addEventListener('click', e => {
    const g = e.target.closest('[data-go]'); if (!g || g.disabled) return;
    st.page = +g.dataset.go; render(); $('.shop').scrollIntoView({ behavior: 'smooth' });
  });

  buildSidebar(); render();
})();
