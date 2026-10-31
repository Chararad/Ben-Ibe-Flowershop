/* Ben Ibe Flowers – Customer profile (frontend demo). All data below is sample data held in memory;
   real accounts, saved addresses, history and password changes need a backend. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const toast = m => window.BenIbe.toast(m);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  const now = () => new Date().toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' });

  // ---- sample data ----
  const profile = { first: 'Maria', last: 'Santos', email: 'maria.santos@example.com', phone: '0969 200 8228' };
  const addresses = [{ label: 'Home', name: 'Maria Santos', phone: '0969 200 8228', street: '123 Sample St.', brgy: 'Sto. Rosario', city: 'Angeles City, Pampanga' }];
  const trans = [
    ['BIF-000123 · Pink Bouquet', 'Order', 'Delivered', 'Sto. Rosario, Angeles City'], ['BIF-000122 · Bloom Cart', 'Booking', 'Confirmed', 'San Jose, Angeles City'],
    ['BIF-000118 · Flower Dome', 'Order', 'Processing', 'Sto. Rosario, Angeles City'], ['BIF-000110 · Flower Workshop', 'Booking', 'Completed', 'Sto. Rosario, Angeles City'],
    ['BIF-000104 · Red Roses', 'Order', 'Delivered', 'Sto. Rosario, Angeles City'], ['BIF-000097 · Balloons', 'Order', 'Cancelled', 'Sto. Rosario, Angeles City'],
    ['BIF-000091 · Dried Flowers', 'Order', 'Delivered', 'Sto. Rosario, Angeles City']];
  const logs = [['Logged in', 'Oct 25, 2026, 9:15 AM'], ['Placed order BIF-000123', 'Oct 24, 2026, 6:42 PM'], ['Booked Bloom Cart BIF-000122', 'Oct 20, 2026, 2:10 PM'],
    ['Updated shipping address', 'Oct 12, 2026, 11:03 AM'], ['Placed order BIF-000118', 'Oct 9, 2026, 4:27 PM'], ['Logged in', 'Oct 9, 2026, 4:20 PM']]
    .map((l, i, a) => ({ id: 'LOG-' + String(a.length - i).padStart(4, '0'), act: l[0], time: l[1] }));
  let logCount = logs.length;
  const open = { trans: false, log: false }, COLLAPSED = 3;

  // ---- validation helpers ----
  const PHONE = v => /^(\+?63|0)9\d{9}$/.test(v.replace(/[\s-]/g, ''));
  const req = (n, msg) => v => v.trim().length >= n ? '' : msg;
  const check = (rules, id) => { const e = $('#' + id), m = rules[id](e.value); $('#' + id + '-e').textContent = m; e.classList.toggle('bad', !!m); e.setAttribute('aria-invalid', !!m); return !m; };
  const validate = rules => { const ids = Object.keys(rules), ok = ids.map(id => check(rules, id)); const bad = ids.find((id, i) => !ok[i]); if (bad) $('#' + bad).focus(); return !bad; };
  const wire = rules => Object.keys(rules).forEach(id => $('#' + id).addEventListener('blur', () => check(rules, id)));

  // ---- tables ----
  function renderTable(tbody, rows, expanded) {
    tbody.replaceChildren();
    (expanded ? rows : rows.slice(0, COLLAPSED)).forEach(r => {
      const tr = el('tr');
      r.forEach((c, i) => { const td = el('td'); if (c.chip) td.append(el('span', 'chip ' + c.chip, c.chip)); else td.textContent = c; tr.append(td); });
      tbody.append(tr);
    });
  }
  const renderTrans = () => renderTable($('#trans-table tbody'), trans.map(r => [r[0], r[1], { chip: r[2] }, r[3]]), open.trans);
  const renderLogs = () => renderTable($('#log-table tbody'), logs.map(l => [l.id, l.time, l.act]), open.log);
  function addLog(act) { logs.unshift({ id: 'LOG-' + String(++logCount).padStart(4, '0'), act, time: now() }); renderLogs(); }
  function bindMore(btnId, key, render, total) {
    const b = $('#' + btnId);
    b.addEventListener('click', () => { open[key] = !open[key]; b.setAttribute('aria-expanded', open[key]); $('span', b).textContent = open[key] ? 'See less' : 'See more'; render(); });
  }
  bindMore('trans-more', 'trans', renderTrans); bindMore('log-more', 'log', renderLogs);

  // ---- addresses ----
  const sel = $('#addr-select'), detail = $('#addr-detail');
  function renderAddr(keep) {
    sel.replaceChildren(); addresses.forEach((a, i) => { const o = el('option', '', a.label); o.value = i; sel.append(o); });
    sel.value = keep ?? 0; showAddr();
  }
  function showAddr() {
    const a = addresses[sel.value]; if (!a) return;
    $('#addr-line').textContent = `${a.street}, Brgy. ${a.brgy}, ${a.city}`;
    detail.replaceChildren(); [['Recipient', a.name], ['Phone', a.phone], ['Barangay', a.brgy], ['City / town', a.city]].forEach(([k, v]) => { detail.append(el('dt', '', k), el('dd', '', v)); });
  }
  sel.addEventListener('change', showAddr);
  const addrMore = $('#addr-more');
  addrMore.addEventListener('click', () => { const o = detail.hidden; detail.hidden = !o; addrMore.setAttribute('aria-expanded', o); $('span', addrMore).textContent = o ? 'See less' : 'See more'; });

  const addrRules = { 'ad-label': req(2, 'Enter a label, e.g. Home.'), 'ad-name': req(2, 'Enter the recipient name.'), 'ad-phone': v => PHONE(v) ? '' : 'Enter a valid PH mobile number.',
    'ad-street': req(3, 'Enter house number and street.'), 'ad-brgy': req(2, 'Enter the barangay.'), 'ad-city': req(2, 'Enter the city or town.') };
  wire(addrRules);
  $('#addr-form').addEventListener('submit', e => {
    e.preventDefault(); if (!validate(addrRules)) return;
    const v = id => $('#' + id).value.trim();
    addresses.push({ label: v('ad-label'), name: v('ad-name'), phone: v('ad-phone'), street: v('ad-street'), brgy: v('ad-brgy'), city: v('ad-city') });
    renderAddr(addresses.length - 1); addLog('Added shipping address'); e.target.reset();
    window.BenIbe.close($('#addr-modal')); toast('Address added (demo – not saved to a server)');
  });

  // ---- profile form ----
  const fill = () => { $('#pf-first').value = profile.first; $('#pf-last').value = profile.last; $('#pf-email').value = profile.email; $('#pf-phone').value = profile.phone; };
  const pfRules = { 'pf-first': req(1, 'First name is required.'), 'pf-last': req(1, 'Last name is required.'),
    'pf-email': v => /^\S+@\S+\.\S+$/.test(v) ? '' : 'Enter a valid email address.', 'pf-phone': v => PHONE(v) ? '' : 'Enter a valid PH mobile number, e.g. 0969 200 8228.',
    'pf-pass': v => !v || v.length >= 8 ? '' : 'Use at least 8 characters, or leave blank to keep your password.',
    'pf-pass2': v => v === $('#pf-pass').value ? '' : 'Passwords do not match.' };
  wire(pfRules);
  $('#profile-form').addEventListener('submit', e => {
    e.preventDefault(); if (!validate(pfRules)) return;
    Object.assign(profile, { first: $('#pf-first').value.trim(), last: $('#pf-last').value.trim(), email: $('#pf-email').value.trim(), phone: $('#pf-phone').value.trim() });
    const pw = $('#pf-pass').value; $('#pf-pass').value = ''; $('#pf-pass2').value = '';
    addLog(pw ? 'Updated profile and password' : 'Updated profile information'); toast('Profile updated (demo – not saved to a server)');
  });

  // ---- side menu: highlight the section in view ----
  const links = $$('#account-nav a');
  const spy = new IntersectionObserver(es => es.forEach(en => {
    if (en.isIntersecting) links.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === '#' + en.target.id));
  }), { rootMargin: '-25% 0px -65% 0px' });
  $$('.pmain section').forEach(s => spy.observe(s));
  links.forEach(a => a.addEventListener('click', () => links.forEach(x => x.classList.toggle('is-active', x === a))));

  fill(); renderAddr(); renderTrans(); renderLogs();
})();
