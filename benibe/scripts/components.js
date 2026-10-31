/**
 * Ben Ibe Flowers - shared site components.
 *
 * Renders the navbar (with top bar), footer, sidebar, login popup and toast from ONE place so every page
 * looks and behaves the same. Plain JavaScript: no framework, no build step and no web server needed
 * (it works when a page is opened straight from the folder, and on any host).
 *
 * How a page uses it (put the placeholders where the component should appear, then load this file
 * BEFORE the page's own scripts, at the end of <body>):
 *
 *     <div data-bi="navbar" data-active="products"></div>      home | about | products | services
 *     <div data-bi="footer"></div>
 *     <div data-bi="sidebar" data-variant="account" data-active="profile"></div>
 *     <div data-bi="sidebar" data-variant="admin" data-active="orders"></div>
 *     <script src="../scripts/components.js"></script>         (pages live in the html/ folder)
 *
 * All links and images are resolved from the project folder (the one that holds html/, scripts/, css/ and
 * assets/), so the same markup works wherever a page lives.
 *
 * Page scripts can hook in with these events (cancel with event.preventDefault() to replace the default):
 *     bi:search      detail.query  - header search was submitted (default: open the Products page)
 *     bi:cart-click                - cart icon was clicked (default: open the checkout page)
 * and with the global BenIbeShell (toast, openModal, closeModal, setCartCount, isLoggedIn, url, SHOP).
 */
(() => {
  'use strict';

  /* ========== Configuration: edit here and every page updates ========== */

  const ROOT = new URL('../', document.currentScript.src).href;
  const url = path => ROOT + path;

  const SHOP = {
    name: 'Ben Ibe Flowers',
    hours: 'Mon-Sat 8:00 am - 6:30 pm / Sun 8:00 am - 6:00 pm',
    phone: '0969 200 8228',
    email: 'benibeflowersph@gmail.com',
    branches: [
      'Sto. Rosario St., Sto. Rosario, Angeles City, Pampanga, Philippines',
      '291-A Sto. Rosario St. Corner Lakandula St. San Jose, Angeles City, Pampanga, Philippines'
    ]
  };

  // shop's social profile links.
  const SOCIAL = [
    { label: 'Instagram', href: 'https://www.instagram.com/benibeflowers_ph?exln=MWRuMjlxMWx0cTFjcA==', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.3" cy="6.7" r=".8" fill="currentColor"/></svg>' },
    { label: 'Facebook', href: 'https://www.facebook.com/share/1HHmkebTNe/', icon: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-1.6 19.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.3v7A10 10 0 0 0 12 2z"/></svg>' },
    { label: 'TikTok', href: 'https://www.tiktok.com/@benibeflowersph?_r=1&_t=ZS-9B0CFgWgtbI', icon: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.6 2h-3.3v13.3a2.8 2.8 0 1 1-2-2.7V9.2a6.2 6.2 0 1 0 5.3 6.1V8.8A7.3 7.3 0 0 0 20 10.2V6.9A4.3 4.3 0 0 1 16.6 2z"/></svg>' }
  ];

  const NAV_LINKS = [
    { id: 'home', label: 'Home', href: 'html/index.html' },
    { id: 'about', label: 'About', href: 'html/about.html' },
    { id: 'products', label: 'Products', href: 'html/products.html' },
    { id: 'services', label: 'Services', href: 'html/services.html' }
  ];

  const FOOTER_LINKS = [
    { label: 'Products', href: 'html/products.html' },
    { label: 'Services', href: 'html/services.html' },
    { label: 'About Us', href: 'html/about.html' }
  ];

  const svg = (inner, size = 20, strokeWidth = 1.8) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;

  const ICONS = {
    search: svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>', 16),
    chat: svg('<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 21 12z"/><path d="M8.5 11h7M8.5 14.5h4"/>', 21),
    cart: svg('<path d="M3 4h3l2.5 11h10L21 7H7"/><circle cx="9" cy="19.5" r="1.4"/><circle cx="18" cy="19.5" r="1.4"/>', 21)
  };

  /* Sidebar definitions. "account" links jump to sections of the profile page; "admin" links open admin pages. */
  const SIDEBARS = {
    account: {
      label: 'Account menu',
      items: [
        { id: 'profile', label: 'Manage Profile', href: '#sec-profile', icon: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-5 5-7 8-7s7 2 8 7"/>' },
        { id: 'address', label: 'My Address', href: '#sec-address', icon: '<path d="M3 5c3-1 6-1 9 1 3-2 6-2 9-1v14c-3-1-6-1-9 1-3-2-6-2-9-1z"/><path d="M12 6v14"/>' },
        { id: 'transactions', label: 'Transaction History', href: '#sec-trans', icon: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>' },
        { id: 'log', label: 'Log History', href: '#sec-log', icon: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>' }
      ]
    },
    admin: {
      label: 'Admin navigation',
      logo: { src: 'assets/sidebar-logo.svg', href: 'html/index.html', alt: 'Ben Ibe Flowers', label: 'Ben Ibe Flowers storefront' },
      items: [
      { id: 'dashboard', label: 'Dashboard', href: 'html/admin-dashboard.html', icon: '<path d="M3 11.500 12 4l9 7.500"/><path d="M5.500 10v10h13V10"/><path d="M10 20v-6h4v6"/>' },
      { id: 'orders', label: 'Orders', href: 'html/admin-orders.html', icon: '<path d="M5 8h14l-1 12H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>' },
      { id: 'bookings', label: 'Bookings', href: 'html/admin-bookings.html', icon: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/><path d="m9.500 15 2 2 3.500-3.500"/>' },
      { id: 'products', label: 'Products', href: 'html/admin-products.html', icon: '<circle cx="12" cy="12" r="2.500"/><path d="M12 3c2 2 2 4.500 0 6.500C10 7.500 10 5 12 3zM12 21c-2-2-2-4.500 0-6.500 2 2 2 4.500 0 6.500zM3 12c2-2 4.500-2 6.500 0-2 2-4.500 2-6.500 0zM21 12c-2 2-4.500 2-6.500 0 2-2 4.500-2 6.500 0z"/>' },
      { id: 'customers', label: 'Customers', href: 'html/admin-customers.html', icon: '<path d="M4 9h16v10H4z"/><circle cx="12" cy="14" r="2.500"/><path d="M8 9V7a4 4 0 0 1 8 0v2"/>' },
      { id: 'staff', label: 'Staff', href: 'html/admin-staff.html', icon: '<circle cx="9" cy="9" r="3"/><path d="M3.500 19c0-3 2.500-5 5.500-5s5.500 2 5.500 5"/><circle cx="17" cy="9.500" r="2.200"/><path d="M16 14.200c3 0 4.800 1.800 4.800 4.300"/>' },
      { id: 'profile', label: 'Profile Settings', href: 'html/admin-profile.html', icon: '<circle cx="12" cy="12" r="3"/><path d="M19.400 13a7.500 7.500 0 0 0 0-2l2-1.500-2-3.400-2.300 1a7.500 7.500 0 0 0-1.700-1L15 3.500h-4l-.4 2.600a7.500 7.500 0 0 0-1.700 1l-2.300-1-2 3.400 2 1.500a7.500 7.500 0 0 0 0 2l-2 1.500 2 3.400 2.300-1a7.500 7.500 0 0 0 1.700 1l.4 2.600h4l.4-2.600a7.500 7.500 0 0 0 1.700-1l2.300 1 2-3.400z"/>' }
      ]
    }
  };

  /* ========== Templates ========== */

  const navbarHTML = active => `
<div class="bi bi-topbar">
  <div class="bi-container bi-topbar__in">
    <a class="bi-topbar__link" href="${url('html/track.html')}">Track Order</a>
    <button type="button" class="bi-topbar__link" data-account>My Account</button>
    <button type="button" class="bi-topbar__link" data-logout>Log Out</button>
  </div>
</div>
<header class="bi bi-header" id="bi-header">
  <div class="bi-container bi-header__in">
    <a class="bi-brand" href="${url('html/index.html')}" aria-label="${SHOP.name} home">
      <img src="${url('assets/logo.svg')}" alt="${SHOP.name} logo" width="167" height="48">
    </a>
    <button type="button" class="bi-burger" aria-label="Toggle menu" aria-expanded="false" aria-controls="bi-menu"><span></span><span></span><span></span></button>
    <nav class="bi-menu" id="bi-menu" aria-label="Main">
      ${NAV_LINKS.map(l => `<a href="${url(l.href)}"${l.id === active ? ' class="is-active" aria-current="page"' : ''}>${l.label}</a>`).join('')}
    </nav>
    <div class="bi-tools">
      <form class="bi-search" id="bi-search-form" role="search">
        <label class="bi-sr" for="bi-search-input">Search</label>
        <input id="bi-search-input" type="search" placeholder="Search" autocomplete="off">
        <button type="submit" aria-label="Submit search">${ICONS.search}</button>
      </form>
      <button type="button" class="bi-icon-btn" id="bi-chat-toggle" aria-label="Open chat with the shop" aria-expanded="false" aria-controls="bi-chat">${ICONS.chat}<span class="bi-dot" id="bi-chat-dot" hidden></span></button>
      <button type="button" class="bi-icon-btn" id="bi-cart" aria-label="Cart">${ICONS.cart}<span class="bi-badge" id="bi-cart-count" hidden>0</span></button>
    </div>
  </div>
</header>`;

  const footerHTML = () => `
<footer class="bi bi-footer">
  <div class="bi-container bi-footer__grid">
    <div class="bi-footer__logo"><img src="${url('assets/footer-logo.svg')}" alt="${SHOP.name}, since 1985" width="198" height="181" loading="lazy"></div>
    <div class="bi-footer__col">
      <h3>Working Hours</h3>
      <p>${SHOP.hours}</p>
      <ul class="bi-social">${SOCIAL.map(s => `<li><a href="${s.href}" target="_blank" rel="noopener" aria-label="${s.label}">${s.icon}</a></li>`).join('')}</ul>
    </div>
    <div class="bi-footer__col">
      <h3>Our Branches</h3>
      ${SHOP.branches.map(b => `<p>${b}</p>`).join('')}
    </div>
    <div class="bi-footer__col">
      <h3>Site Links</h3>
      <ul>${FOOTER_LINKS.map(l => `<li><a href="${url(l.href)}">${l.label}</a></li>`).join('')}</ul>
    </div>
    <div class="bi-footer__col">
      <h3>Customer Care</h3>
      <p><a href="mailto:${SHOP.email}">Contact Us</a><br>Phone: ${SHOP.phone}<br>Email: <a href="mailto:${SHOP.email}">${SHOP.email.split('@')[0]}</a></p>
      <ul><li><a href="${url('html/terms.html')}">Terms &amp; Conditions</a></li><li><a href="${url('html/privacy.html')}">Privacy Policy</a></li></ul>
    </div>
  </div>
  <p class="bi-container bi-footer__copy">&copy; ${new Date().getFullYear()} ${SHOP.name}</p>
</footer>`;

  const AVATAR = '<svg viewBox="0 0 80 80" width="80" height="80" aria-hidden="true"><circle cx="40" cy="40" r="40" fill="#d9dde6"/><circle cx="40" cy="31" r="12" fill="#6b7280"/><path d="M16 68c3-14 13-20 24-20s21 6 24 20a40 40 0 0 1-48 0z" fill="#6b7280"/></svg>';

  function sidebarHTML(variant, active) {
    const def = SIDEBARS[variant];
    if (!def) return '';
    const links = def.items.map(i => {
      const on = i.id === active;
      return `<li><a class="bi-sidebar__link${on ? ' is-active' : ''}" href="${i.href.startsWith('#') ? i.href : url(i.href)}"${on && variant === 'admin' ? ' aria-current="page"' : ''}>${svg(i.icon, variant === 'admin' ? 22 : 16, variant === 'admin' ? 1.5 : 1.6)}${i.label}</a></li>`;
    }).join('');
    const head = variant === 'admin'
      ? `<a class="bi-sidebar__logo" href="${url(def.logo.href)}" aria-label="${def.logo.label}"><img src="${url(def.logo.src)}" alt="${def.logo.alt}" width="124" height="124"></a>`
      : `<div class="bi-sidebar__avatar" role="img" aria-label="Profile picture placeholder">${AVATAR}</div>`;
    const scrim = variant === 'admin' ? '<div class="bi-scrim" id="scrim" hidden></div>' : '';
    return `<aside class="bi bi-sidebar bi-sidebar--${variant}"${variant === 'admin' ? ' id="sidebar"' : ''} aria-label="${def.label}">${head}<nav class="bi-sidebar__nav"><ul id="${variant}-nav">${links}</ul></nav></aside>${scrim}`;
  }

  const loginHTML = () => `
<div class="bi bi-modal" id="login-modal" role="dialog" aria-modal="true" aria-labelledby="login-title" hidden>
  <div class="bi-modal__box">
    <button type="button" class="bi-modal__close" aria-label="Close" data-modal-close>&times;</button>
    <h2 id="login-title">Log in</h2>
    <form id="login-form" novalidate>
      <label for="login-email">Email</label>
      <input id="login-email" type="email" autocomplete="email" required>
      <small class="err" id="login-email-e"></small>
      <label for="login-password">Password</label>
      <input id="login-password" type="password" autocomplete="current-password" minlength="6" required>
      <small class="err" id="login-password-e"></small>
      <button type="submit" class="bi-btn">Log in</button>
      <p class="note">New here? <a href="${url('html/register.html')}">Create an account</a> &middot; <a href="${url('html/reset-password.html')}">Forgot password?</a></p>
      <p class="note">Demo only &ndash; real authentication needs a backend.</p>
    </form>
  </div>
</div>`;

  /* ========== Mounting ========== */

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  function mount(el, html) {
    const tpl = document.createElement('template');
    tpl.innerHTML = html.trim();
    el.replaceWith(tpl.content); // replace (not wrap) so the sticky header can stick to the page
  }

  const renderers = {
    navbar: el => mount(el, navbarHTML(el.dataset.active || '')),
    footer: el => mount(el, footerHTML()),
    sidebar: el => mount(el, sidebarHTML(el.dataset.variant, el.dataset.active))
  };
  $$('[data-bi]').forEach(el => (renderers[el.dataset.bi] || (() => {}))(el));

  document.body.insertAdjacentHTML('beforeend', '<div class="bi bi-toast" id="toast" role="status" aria-live="polite"></div>');
  if ($('[data-account]')) document.body.insertAdjacentHTML('beforeend', loginHTML());

  /* ========== Toast ========== */

  let toastTimer;
  function toast(message) {
    const el = $('#toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-visible'), 2600);
  }
  document.addEventListener('click', e => {
    const trigger = e.target.closest('[data-toast]');
    if (trigger) toast(trigger.dataset.toast);
  });

  /* ========== Modals (login popup and any page popup written with .bi-modal) ========== */

  const FOCUSABLE = 'input,select,textarea,button,a[href]';
  let lastFocus = null;

  function openModal(target) {
    const modal = typeof target === 'string' ? document.getElementById(target) : target;
    if (!modal) return;
    lastFocus = document.activeElement;
    modal.hidden = false;
    requestAnimationFrame(() => modal.classList.add('is-open'));
    document.body.classList.add('lock');
    ($('input,select,textarea', modal) || $('[data-modal-close]', modal)).focus();
  }

  function closeModal(modal) {
    modal.classList.remove('is-open');
    document.body.classList.remove('lock');
    setTimeout(() => { modal.hidden = true; }, 300);
    if (lastFocus) lastFocus.focus();
  }

  document.addEventListener('click', e => {
    const opener = e.target.closest('[data-modal]');
    if (opener) { openModal(opener.dataset.modal); return; }
    const modal = e.target.closest('.bi-modal');
    if (modal && (e.target === modal || e.target.closest('[data-modal-close]'))) closeModal(modal);
  });

  document.addEventListener('keydown', e => {
    const modal = $('.bi-modal.is-open');
    if (!modal) return;
    if (e.key === 'Escape') { closeModal(modal); return; }
    if (e.key !== 'Tab') return; // keep keyboard focus inside the popup
    const items = $$(FOCUSABLE, modal).filter(i => !i.disabled && i.offsetParent !== null);
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  /* ========== Navbar behaviour ========== */

  const header = $('#bi-header');
  if (header) {
    const burger = $('.bi-burger', header), menu = $('#bi-menu');
    burger.addEventListener('click', () => {
      const open = menu.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', open);
    });
    menu.addEventListener('click', e => {
      if (e.target.closest('a')) { menu.classList.remove('is-open'); burger.setAttribute('aria-expanded', false); }
    });
    addEventListener('scroll', () => header.classList.toggle('is-stuck', scrollY > 10), { passive: true });

    $('#bi-search-form').addEventListener('submit', e => {
      e.preventDefault();
      const query = $('#bi-search-input').value.trim();
      const handled = !document.dispatchEvent(new CustomEvent('bi:search', { cancelable: true, detail: { query } }));
      if (!handled) location.href = url('html/products.html') + (query ? '?q=' + encodeURIComponent(query) : '');
    });

    $('#bi-cart').addEventListener('click', () => {
      const handled = !document.dispatchEvent(new CustomEvent('bi:cart-click', { cancelable: true }));
      if (!handled) location.href = url('html/order.html');
    });
  }

  function setCartCount(count, { pop = false } = {}) {
    const badge = $('#bi-cart-count');
    if (!badge) return;
    badge.hidden = !count;
    badge.textContent = count;
    if (pop) { badge.classList.remove('is-pop'); void badge.offsetWidth; badge.classList.add('is-pop'); }
  }

  /* ========== Demo account session (frontend only: a flag kept for this browser tab) ========== */

  const SESSION_KEY = 'benibe.demoUser';
  const isLoggedIn = () => { try { return sessionStorage.getItem(SESSION_KEY) === '1'; } catch (e) { return false; } };

  $$('[data-account]').forEach(b => b.addEventListener('click', () => {
    if (isLoggedIn()) location.href = url('html/profile.html'); else openModal('login-modal');
  }));
  $$('[data-logout]').forEach(b => b.addEventListener('click', () => {
    try { sessionStorage.removeItem(SESSION_KEY); } catch (e) { /* storage blocked */ }
    toast('Logged out (demo)');
    if (document.body.dataset.page === 'profile') setTimeout(() => { location.href = url('html/index.html'); }, 900);
  }));

  const loginForm = $('#login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', e => {
      e.preventDefault();
      const email = $('#login-email'), password = $('#login-password');
      let valid = true;
      const check = (input, message) => {
        $('#' + input.id + '-e').textContent = message;
        input.classList.toggle('bad', !!message);
        if (message) valid = false;
      };
      check(email, /^\S+@\S+\.\S+$/.test(email.value) ? '' : 'Enter a valid email address.');
      check(password, password.value.length >= 6 ? '' : 'Password must be at least 6 characters.');
      if (!valid) return;
      try { sessionStorage.setItem(SESSION_KEY, '1'); } catch (err) { /* storage blocked */ }
      loginForm.reset();
      closeModal($('#login-modal'));
      toast('Demo login – no real account is checked');
      setTimeout(() => { location.href = url('html/profile.html'); }, 700);
    });
    if (location.hash === '#login') openModal('login-modal'); // used by "Already Registered?" links
  }

  /* ========== Public API ========== */

  window.BenIbeShell = { ROOT, url, SHOP, toast, openModal, closeModal, setCartCount, isLoggedIn };
})();
