/**
 * Ben Ibe Flowers - customer chat popup (FRONTEND PROTOTYPE).
 *
 * The chat icon in the navbar (js/components.js) opens this floating popup. Everything the customer sees
 * (header, message list, text box, send button, quick replies) is real and working, but there is no chat
 * server yet, so replies come from a small local script.
 *
 * BACKEND INTEGRATION POINT: only `ChatService` (below) would talk to a server. To go live, replace its
 * methods with calls to your chat API (fetch or WebSocket) and keep the same shapes:
 *     history()      -> Promise<Message[]>          earlier messages of this customer
 *     send(text)     -> Promise<Message[]>          the shop's reply or replies
 *     Message        =  { from: 'shop' | 'customer', text: string, at: ISO date string }
 * Nothing else in this file needs to change.
 */
(() => {
  'use strict';
  const toggle = document.getElementById('bi-chat-toggle');
  if (!toggle || !window.BenIbeShell) return; // pages without the navbar have no chat

  const { SHOP } = window.BenIbeShell;
  const STORAGE_KEY = 'benibe-chat-demo';
  const MAX_SAVED = 100;

  /* ========== Backend integration point (prototype implementation) ========== */

  const QUICK_REPLIES = ['Opening hours', 'Delivery', 'Track my order', 'Talk to a florist'];

  const ChatService = {
    history() {
      try { return Promise.resolve(JSON.parse(localStorage.getItem(STORAGE_KEY)) || []); }
      catch (e) { return Promise.resolve([]); }
    },
    remember(messages) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_SAVED))); } catch (e) { /* storage blocked */ }
    },
    send(text) {
      const t = text.toLowerCase();
      let reply;
      if (/hour|open|close|time/.test(t)) reply = `We are open ${SHOP.hours}.`;
      else if (/deliver|ship/.test(t)) reply = 'We deliver within Angeles City and nearby areas. Pick your date and time slot at checkout, and please double-check the delivery address.';
      else if (/track|order status|where is my/.test(t)) reply = 'You can follow your order or booking on the Track Order page (top of the site). Have your order number ready.';
      else if (/branch|address|where|location/.test(t)) reply = `Our branches: ${SHOP.branches.join(' | ')}`;
      else if (/book|reserve|workshop|bloom cart/.test(t)) reply = 'You can book a Bloom Cart or reserve a Flower Workshop spot on the Services page.';
      else if (/florist|human|person|staff|talk/.test(t)) reply = `A florist will gladly help! Call or text ${SHOP.phone}, or email ${SHOP.email}. (This chat is a preview and is not connected to the shop yet.)`;
      else reply = `Thanks for your message! This chat is a preview and is not connected to the shop yet, so please call ${SHOP.phone} or email ${SHOP.email} and we will help you right away.`;
      const messages = [{ from: 'shop', text: reply, at: new Date().toISOString() }];
      return new Promise(resolve => setTimeout(() => resolve(messages), 900)); // pretend the shop is typing
    }
  };

  /* ========== Popup (UI) ========== */

  document.body.insertAdjacentHTML('beforeend', `
<section class="bi bi-chat" id="bi-chat" role="dialog" aria-label="Chat with ${SHOP.name}" hidden>
  <header class="bi-chat__head">
    <span class="bi-chat__avatar" aria-hidden="true">BI</span>
    <div class="bi-chat__title"><strong>${SHOP.name}</strong><small>Preview &ndash; replies are automatic</small></div>
    <button type="button" class="bi-chat__close" aria-label="Close chat">&times;</button>
  </header>
  <div class="bi-chat__log" id="bi-chat-log" role="log" aria-live="polite" tabindex="0"></div>
  <div class="bi-chat__quick" id="bi-chat-quick">${QUICK_REPLIES.map(q => `<button type="button">${q}</button>`).join('')}</div>
  <form class="bi-chat__form" id="bi-chat-form" autocomplete="off">
    <label class="bi-sr" for="bi-chat-input">Type your message</label>
    <input id="bi-chat-input" type="text" placeholder="Type your message..." maxlength="500">
    <button type="submit" class="bi-chat__send" aria-label="Send message"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/></svg></button>
  </form>
</section>`);

  const $ = id => document.getElementById(id);
  const popup = $('bi-chat'), log = $('bi-chat-log'), form = $('bi-chat-form'), input = $('bi-chat-input'), quick = $('bi-chat-quick'), dot = $('bi-chat-dot');
  let messages = [];

  const clock = iso => new Date(iso).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });

  function addBubble(msg) {
    const bubble = document.createElement('div');
    bubble.className = 'bi-chat__msg bi-chat__msg--' + msg.from;
    const text = document.createElement('p'); text.textContent = msg.text; // textContent: customer text is never run as HTML
    const time = document.createElement('time'); time.dateTime = msg.at; time.textContent = clock(msg.at);
    bubble.append(text, time);
    log.append(bubble);
    log.scrollTop = log.scrollHeight;
  }

  function showTyping(on) {
    const existing = $('bi-chat-typing');
    if (on && !existing) {
      const t = document.createElement('div');
      t.id = 'bi-chat-typing'; t.className = 'bi-chat__typing'; t.setAttribute('aria-label', 'The shop is typing');
      t.innerHTML = '<span></span><span></span><span></span>';
      log.append(t); log.scrollTop = log.scrollHeight;
    } else if (!on && existing) existing.remove();
  }

  function push(msg) { messages.push(msg); addBubble(msg); ChatService.remember(messages); }

  async function sendFromCustomer(text) {
    text = text.trim();
    if (!text) return;
    push({ from: 'customer', text, at: new Date().toISOString() });
    quick.hidden = true;
    showTyping(true);
    const replies = await ChatService.send(text);
    showTyping(false);
    replies.forEach(push);
    if (popup.hidden) dot.hidden = false; // reply arrived while the popup was closed
  }

  function setOpen(open) {
    popup.hidden = false;
    requestAnimationFrame(() => popup.classList.toggle('is-open', open));
    toggle.setAttribute('aria-expanded', open);
    if (open) { dot.hidden = true; input.focus(); log.scrollTop = log.scrollHeight; }
    else { setTimeout(() => { if (!popup.classList.contains('is-open')) popup.hidden = true; }, 250); toggle.focus(); }
  }

  toggle.addEventListener('click', () => setOpen(!popup.classList.contains('is-open')));
  popup.querySelector('.bi-chat__close').addEventListener('click', () => setOpen(false));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && popup.classList.contains('is-open')) setOpen(false); });
  form.addEventListener('submit', e => { e.preventDefault(); const t = input.value; input.value = ''; sendFromCustomer(t); input.focus(); });
  quick.addEventListener('click', e => { const b = e.target.closest('button'); if (b) sendFromCustomer(b.textContent); });

  ChatService.history().then(saved => {
    messages = saved;
    if (!messages.length) messages = [{ from: 'shop', text: `Hi! Welcome to ${SHOP.name}. How can we help you today?`, at: new Date().toISOString() }];
    messages.forEach(addBubble);
    if (saved.length) quick.hidden = true;
  });
})();
