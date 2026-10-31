/* Ben Ibe Flowers – Register and Reset Password (frontend demo). No account is created and no email is
   sent; real sign-up and password-reset emails need a backend. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const check = (rules, id) => { const e = $('#' + id), m = rules[id](e.value); $('#' + id + '-e').textContent = m; e.classList.toggle('bad', !!m); e.setAttribute('aria-invalid', !!m); return !m; };
  const validate = rules => { const ids = Object.keys(rules), ok = ids.map(id => check(rules, id)); const bad = ids.find((id, i) => !ok[i]); if (bad) $('#' + bad).focus(); return !bad; };
  const wire = rules => Object.keys(rules).forEach(id => $('#' + id).addEventListener('blur', () => check(rules, id)));
  const EMAIL = v => /^\S+@\S+\.\S+$/.test(v.trim()) ? '' : 'Enter a valid email address.';

  // Show / hide password
  document.querySelectorAll('.eye').forEach(b => b.addEventListener('click', () => {
    const i = document.getElementById(b.dataset.for), show = i.type === 'password';
    i.type = show ? 'text' : 'password'; i.classList.toggle('has-eye', true);
    b.setAttribute('aria-pressed', show); b.setAttribute('aria-label', show ? 'Hide password' : 'Show password'); b.classList.toggle('on', show);
  }));

  const reg = $('#register-form');
  if (reg) {
    const rules = {
      'rg-first': v => v.trim() ? '' : 'First name is required.',
      'rg-last': v => v.trim() ? '' : 'Last name is required.',
      'rg-email': EMAIL,
      'rg-pass': v => v.length >= 8 && /[A-Za-z]/.test(v) && /\d/.test(v) ? '' : 'Use at least 8 characters with a letter and a number.',
      'rg-pass2': v => v && v === $('#rg-pass').value ? '' : 'Passwords do not match.' };
    wire(rules);
    reg.addEventListener('submit', e => {
      e.preventDefault(); if (!validate(rules)) return;
      $('#rg-status').textContent = 'Account created (demo – nothing was saved). Taking you to log in…';
      reg.querySelector('.dark-btn').disabled = true;
      setTimeout(() => { location.href = 'index.html#login'; }, 1800);
    });
  }

  const rst = $('#reset-form');
  if (rst) {
    const rules = { 'rs-email': EMAIL }; wire(rules);
    rst.addEventListener('submit', e => { e.preventDefault(); $('#rs-status').textContent = ''; if (validate(rules)) $('#rs-status').textContent = 'Email Sent!'; });
  }
})();
