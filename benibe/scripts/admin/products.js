'use strict';
/* [NEW] Admin > Products: product list and flower inventory ("Restock"). Data comes from Api (api.js). */
const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const peso = n => '₱' + Number(n).toLocaleString('en-PH');
const LIMIT = 7, LOW = 50, CATS = ['Fresh', 'Dried', 'Dome', 'Balloon'], SIZES = ['Small', 'Medium', 'Large'];
const PEN = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20l1-4L16.500 4.500a2 2 0 0 1 3 3L8 19z"/><path d="m14.500 6.500 3 3"/></svg>';
const BIN = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/></svg>';
const state = { products: [], items: [], allP: false, allI: false };
const att = v => v ? 'Attached' : '<span class="none">None</span>';
const iconBtn = (kind, id, label) => `<button type="button" class="ib" data-act="${kind}" data-id="${esc(id)}" aria-label="${kind === 'edit' ? 'Edit' : 'Delete'} ${esc(label)}">${kind === 'edit' ? PEN : BIN}</button>`;

/* ---------- rendering (filters + header search are applied here) ---------- */
function view(list, catSel, fields, all) {
  const cat = $(catSel).value, q = $('#adminSearch').value.trim().toLowerCase();
  const m = list.filter(x => (!cat || x.category === cat) && (!q || fields.map(f => String(x[f] ?? '')).join(' ').toLowerCase().includes(q) || ('#' + x.id).toLowerCase().includes(q)));
  return { match: m, shown: all ? m : m.slice(0, LIMIT) };
}
function render() {
  const p = view(state.products, '#fP', ['name', 'type', 'category', 'size'], state.allP);
  $('#pBody').innerHTML = p.shown.map(r => `<tr><td class="pid">#${esc(r.id)}</td><td>${esc(r.name)}</td><td>${r.stock}</td><td>${esc(r.size)}</td><td>${peso(r.price)}</td><td>${esc(r.category)}</td><td>${esc(r.type) || '<span class="none">—</span>'}</td><td>${att(r.photo)}</td><td>${att(r.description)}</td><td class="ctr">${iconBtn('edit', r.id, 'product #' + r.id + ' ' + r.name)}</td><td class="ctr">${iconBtn('del', r.id, 'product #' + r.id + ' ' + r.name)}</td></tr>`).join('')
    || `<tr class="empty-row"><td colspan="11">${state.products.length ? 'No matching products.' : 'No products yet. Use “+ New product” to add one.'}</td></tr>`;
  $('#cntP').textContent = `${p.shown.length} of ${state.products.length} products`;
  $('#vallP').hidden = p.match.length <= LIMIT; $('#vallP').textContent = state.allP ? 'Show fewer ←' : 'View All Products →';
  const i = view(state.items, '#fI', ['name', 'category'], state.allI);
  $('#iBody').innerHTML = i.shown.map(r => `<tr><td class="pid">#${esc(r.id)}</td><td>${esc(r.name)}</td><td class="${r.stems < LOW ? 'lowst' : ''}">${r.stems}</td><td>${esc(r.category)}</td><td>${att(r.photo)}</td><td class="ctr">${iconBtn('edit', r.id, 'item #' + r.id + ' ' + r.name)}</td><td class="ctr">${iconBtn('del', r.id, 'item #' + r.id + ' ' + r.name)}</td></tr>`).join('')
    || `<tr class="empty-row"><td colspan="7">${state.items.length ? 'No matching items.' : 'No items yet. Use “+ New item” to add one.'}</td></tr>`;
  $('#cntI').textContent = `${i.shown.length} of ${state.items.length} items`;
  $('#vallI').hidden = i.match.length <= LIMIT; $('#vallI').textContent = state.allI ? 'Show fewer ←' : 'View All Items →';
}
function load() {
  return Promise.all([Api.getProducts(), Api.getStock()]).then(([p, s]) => { state.products = p; state.items = s.sort((a, b) => a.id.localeCompare(b.id)); render(); })
    .catch(() => { $('#pBody').innerHTML = '<tr class="empty-row"><td colspan="11">We couldn’t load products. Please refresh to try again.</td></tr>'; });
}
['#fP', '#fI'].forEach(s => $(s).addEventListener('change', () => { state.allP = state.allI = false; render(); }));
$('#adminSearch').addEventListener('input', render);
$('#adminSearchForm').addEventListener('submit', e => e.preventDefault());
$('#vallP').addEventListener('click', () => { state.allP = !state.allP; render(); });
$('#vallI').addEventListener('click', () => { state.allI = !state.allI; render(); });

/* ---------- form helpers ---------- */
const setErr = (id, m) => { const e = $('#' + id + 'E'); if (e) e.textContent = m; const el = $('#' + id); el && el.setAttribute('aria-invalid', !!m); return !m; };
const fld = (id, label, attrs = '', val = '') => `<div class="m-field"><label for="${id}">${label}</label><input id="${id}" value="${esc(val)}" ${attrs}><p class="err" id="${id}E" role="alert"></p></div>`;
const sel = (id, label, opts, cur) => `<div class="m-field"><label for="${id}">${label}</label><select id="${id}">${opts.map(o => `<option${o === cur ? ' selected' : ''}>${o}</option>`).join('')}</select><p class="err" id="${id}E" role="alert"></p></div>`;
const file = (id, has) => `<div class="m-field"><label for="${id}">Photo ${has ? '(currently attached – choose a file to replace it)' : '(optional)'}</label><input id="${id}" type="file" accept="image/*"><p class="err" id="${id}E" role="alert"></p></div>`;
function formModal(title, html, onSave, label) {
  openModal(title, html, [{ label: 'Cancel' }, { label, dark: true, keep: true, fn: onSave }]); const f = $('#mBody input,#mBody select'); f && f.focus();
}
$('#mBody').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type !== 'file') { e.preventDefault(); $('#mActions .btn.dark').click(); } });
const fileName = (id, current) => { const f = $('#' + id).files[0]; if (!f) return current || ''; return f.name; }; // the file itself needs a real upload endpoint
function fileOk(id) { const f = $('#' + id).files[0]; if (!f) return true; return setErr(id, f.type.startsWith('image/') && f.size <= 2 * 1048576 ? '' : 'Choose an image under 2 MB.'); }
function submit(btn, call, map, done) {
  btn.disabled = true;
  call().then(r => { closeModal(); done(r); return load(); }).catch(e => {
    btn.disabled = false; const id = e.field && map[e.field];
    if (id && $('#' + id)) { setErr(id, e.message); $('#' + id).focus(); } else toast(e.status === 404 ? 'That record no longer exists.' : 'Something went wrong. Please try again.');
    if (e.status === 404) { closeModal(); load(); }
  });
}

/* ---------- products ---------- */
const PMAP = { name: 'pN', category: 'pC', type: 'pT', size: 'pS', price: 'pP', stock: 'pK', description: 'pD', photo: 'pF' };
function productModal(p) {
  const edit = !!p;
  formModal(edit ? `Edit product #${p.id}` : 'New product',
    fld('pN', 'Product name', 'maxlength="60"', p?.name) + sel('pC', 'Category', CATS, p?.category) + fld('pT', 'Type (main flower, e.g. Pink Rose)', 'maxlength="40"', p?.type) + sel('pS', 'Size/Dimension', SIZES, p?.size || 'Medium')
    + fld('pP', 'Price (₱)', 'inputmode="decimal" maxlength="9"', p?.price ?? '') + fld('pK', 'Stock', 'inputmode="numeric" maxlength="6"', p?.stock ?? 0) + file('pF', !!p?.photo)
    + `<div class="m-field"><label for="pD">Description</label><textarea id="pD" rows="3" maxlength="500">${esc(p?.description || '')}</textarea><p class="err" id="pDE" role="alert"></p></div>`,
    () => {
      const price = parseFloat($('#pP').value), stock = $('#pK').value.trim() === '' ? NaN : Number($('#pK').value);
      const ok = [setErr('pN', $('#pN').value.trim().length >= 2 ? '' : 'Enter a product name (2–60 characters).'), setErr('pP', price > 0 ? '' : 'Enter a price above 0.'),
        setErr('pK', Number.isInteger(stock) && stock >= 0 ? '' : 'Enter a whole number, 0 or more.'), fileOk('pF')];
      if (ok.includes(false)) return;
      const body = { name: $('#pN').value, category: $('#pC').value, type: $('#pT').value, size: $('#pS').value, price, stock, description: $('#pD').value, photo: fileName('pF', p?.photo) };
      submit($('#mActions .btn.dark'), () => edit ? Api.updateProduct(p.id, body) : Api.addProduct(body), PMAP, r => toast(edit ? `Saved #${r.id}.` : `Added product #${r.id}.`));
    }, edit ? 'Save changes' : 'Add product');
}
$('#addP').addEventListener('click', () => productModal());

/* ---------- inventory items ---------- */
const IMAP = { name: 'iN', category: 'iC', stems: 'iS', photo: 'iF' };
function itemModal(it) {
  const edit = !!it;
  formModal(edit ? `Edit item #${it.id}` : 'New item', fld('iN', 'Type (flower)', 'maxlength="40"', it?.name) + sel('iC', 'Category', CATS, it?.category) + fld('iS', 'Stems', 'inputmode="numeric" maxlength="6"', it?.stems ?? 0) + file('iF', !!it?.photo),
    () => {
      const stems = $('#iS').value.trim() === '' ? NaN : Number($('#iS').value);
      const ok = [setErr('iN', $('#iN').value.trim().length >= 2 ? '' : 'Enter the flower type (2–40 characters).'), setErr('iS', Number.isInteger(stems) && stems >= 0 ? '' : 'Enter a whole number, 0 or more.'), fileOk('iF')];
      if (ok.includes(false)) return;
      const body = { name: $('#iN').value, category: $('#iC').value, stems, photo: fileName('iF', it?.photo) };
      submit($('#mActions .btn.dark'), () => edit ? Api.updateItem(it.id, body) : Api.addItem(body), IMAP, r => toast(edit ? `Saved #${r.id}.` : `Added item #${r.id}.`));
    }, edit ? 'Save changes' : 'Add item');
}
$('#addI').addEventListener('click', () => itemModal());

/* ---------- edit / delete buttons (one listener per table) ---------- */
function rowActions(tbodySel, listKey, editFn, delFn, noun) {
  $(tbodySel).addEventListener('click', e => {
    const b = e.target.closest('.ib'); if (!b) return; const rec = state[listKey].find(x => x.id === b.dataset.id); if (!rec) return;
    if (b.dataset.act === 'edit') return editFn(rec);
    openModal(`Delete #${rec.id}?`, `<p>Delete the ${noun} <b>${esc(rec.name)}</b>? This can’t be undone and is recorded in the log history.</p>`,
      [{ label: 'Keep it' }, { label: 'Yes, delete', dark: true, fn: () => delFn(rec.id).then(() => { toast(`Deleted #${rec.id}.`); return load(); }).catch(err => { toast(err.status === 404 ? 'That record was already removed.' : 'Could not delete. Please try again.'); load(); }) }]);
  });
}
rowActions('#pBody', 'products', productModal, Api.deleteProduct, 'product');
rowActions('#iBody', 'items', itemModal, Api.deleteItem, 'item');

load();
