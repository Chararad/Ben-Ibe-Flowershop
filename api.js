'use strict';
/* [NEW] Data layer. Every page asks THIS file for orders; nothing else reads or writes order data.
   Right now it is a mock that stores orders in localStorage. When the backend exists, replace the
   body of each method with a fetch() call (endpoint noted on each). Keep the return shapes the same
   and the pages will work unchanged. See INTEGRATION.md for the full contract.

   Order shape:
   { id:'BIF-000123', createdAt:ISO, status:'placed'|'preparing'|'dispatched'|'completed', mode:'delivery'|'pickup',
     contact:{name,phone,email}, address:'', branch:'', schedule:{date:'YYYY-MM-DD', time:'4:00 - 4:30 PM'},
     payment:'GCash'|'Card', trackingNumber:string|null,
     items:[{name,price,qty,lines:[],img}], notes:[], fee:39, total:2789,
     events:[{status, at:ISO}] }                                                                   */
const Api = (() => {
  const KEY = 'benibe-orders', SEQ = 'benibe-order-seq', LATENCY = 250, FEE = 39;
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } };
  const write = o => { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { /* storage blocked */ } };
  const later = (fn) => new Promise((res, rej) => setTimeout(() => { try { res(fn()); } catch (e) { rej(e); } }, LATENCY));
  const clone = o => JSON.parse(JSON.stringify(o));

  /* ===== [NEW] admin (mock). Real backend: enforce the "administrator" role on EVERY /api/admin/* route. ===== */
  const AKEY = 'benibe-admin', LKEY = 'benibe-admin-log', NKEY = 'benibe-admin-notes-read';
  const PROFILE0 = { firstName: 'Admin', lastName: 'Name', email: 'admin@benibeflowers.example', phone: '09690000000', role: 'Administrator', status: 'online', avatar: '' };
  const LOG0 = [
    ['Tst-001', 'View Data'], ['Tst-002', 'View Orders'], ['Tst-003', 'Change status for  #ORD-001 from Pending to Preparing'], ['Tst-004', 'Change payment for  #ORD-001 from Pending to Paid'],
    ['Tst-005', 'Added 1000 stems of Carnation'], ['Tst-006', 'Chatted with Customer_Name'], ['Tst-007', 'View Orders']
  ].map(([id, activity], i) => ({ id, user: 'Admin Name', at: '2027-01-01T09:0' + (i < 4 ? 0 : 1) + ':00', activity }));
  const NOTES0 = [{ id: 1, text: 'Order BIF-000123 is out for delivery', at: '2026-09-30T15:20:00' }, { id: 2, text: 'New booking request for January 2027', at: '2026-10-24T11:05:00' }];
  const jget = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } };
  const profile = () => ({ ...PROFILE0, ...jget(AKEY, {}) });
  const logs = () => { const l = jget(LKEY, null); return l || LOG0; };
  const addLog = (activity) => { const l = logs(), n = l.length + 1, p = profile();
    l.push({ id: 'Tst-' + String(n).padStart(3, '0'), user: `${p.firstName} ${p.lastName}`, at: new Date().toISOString(), activity }); localStorage.setItem(LKEY, JSON.stringify(l)); };
  const invalid = (field, message) => Object.assign(new Error(message), { status: 422, field });

  /* ===== [NEW] reservations (mock). Shape: { id:'BKG-000045', createdAt, status:'pending'|'confirmed'|'preparing'|'completed',
     date:'YYYY-MM-DD', time:'HH:MM', location, contact:{name,phone}, guests, quantity, eventType, notes,
     quote:null|{fee,total}   <- set by the shop, events:[{status,at}] } ===== */
  const RKEY = 'benibe-reservations', RSEQ = 'benibe-booking-seq';
  const RNEXT = { pending: 'confirmed', confirmed: 'preparing', preparing: 'completed' };
  const RSAMPLE = { id: 'BKG-000045', createdAt: '2026-10-20T10:00:00', status: 'pending', date: '2027-01-06', time: '16:00',
    location: 'address delivery house number, street, barangay, city/town', contact: { name: 'Sample Customer', phone: '09170000000' },
    guests: 50, quantity: 120, eventType: 'Wedding', notes: '', quote: { fee: 39, total: 2789 }, events: [{ status: 'pending', at: '2026-10-20T10:00:00' }] };
  const rread = () => { try { return JSON.parse(localStorage.getItem(RKEY)) || []; } catch (e) { return []; } };

  /* ===== [NEW] admin dashboard (mock). Real backend: compute stats/lists on the server, check the administrator role on every route. ===== */
  const SKEY = 'benibe-admin-inventory', LOW = 50; /* a product is "low" below 50 stems */

  /* ===== [NEW] one orders store shared by the admin Dashboard and Orders pages ===== */
  const OKEY = 'benibe-admin-orders-v2'; /* v2: orders now carry a customerId */
  const STL = { pending: 'Pending', preparing: 'Preparing', out_for_delivery: 'Out for delivery', complete: 'Complete', canceled: 'Canceled' };
  const PAYL = { paid: 'Paid', pending: 'Pending', canceled: 'Canceled' };
  /* allowed next values. The SERVER must enforce these too. */
  const TRANS = { status: { pending: ['preparing', 'canceled'], preparing: ['out_for_delivery', 'canceled'], out_for_delivery: ['complete', 'canceled'], complete: [], canceled: [] },
    payment: { pending: ['paid', 'canceled'], paid: [], canceled: [] } };
  /* staff seed (the first four also appear as the assigned person on sample orders and bookings) */
  const STAFF = ['Maria Santos', 'Juan Dela Cruz', 'Ana Lopez', 'Paolo Garcia', 'Liza Manalo', 'Carlo Mendoza', 'Bea Santiago', 'Rico Dizon'].map((name, i) => ({ id: 'STF-' + String(i + 1).padStart(3, '0'), name }));
  function seedOrders() {
    const NAMES = ['Ana Reyes', 'Marco Villanueva', 'Liza Manalo', 'Carlo Mendoza', 'Bea Santiago', 'Rico Dizon', 'Grace Pineda', 'Noel Bautista', 'Tina Ocampo', 'Jerome Lim', 'Faith Navarro', 'Paul Castillo'];
    const PRODUCTS = [['Red Roses', 1025], ['Pink Tulips', 1725], ['White Roses', 1530], ['Sunflowers', 1199], ['Pink Carnations', 1185], ['Bloom Carts', 1800], ['Lily Bouquet', 1350], ['Peony Bouquet', 2300]];
    const LINES = [['3pcs', 'Pink', 'Cream', 'Pink', 'Regular Kraft Paper Bag', 'With Dedication Note'], ['14pcs', 'Red', 'White', 'Dark Brown', 'Brown', 'Brown', 'Plastic Packaging']];
    const STREETS = ['Sto. Rosario St.', 'Lakandula St.', 'Rizal Ave.', 'MacArthur Hwy', 'Magalang Rd.'], BRGY = ['Sto. Rosario', 'San Jose', 'Balibago', 'Pulung Maragul', 'Malabanias'], CITIES = ['Angeles City', 'Mabalacat', 'San Fernando', 'Mexico'];
    const special = { 1: ['Red Roses', 1999, 'paid', '2027-01-01', 'preparing'], 2: ['Pink Tulips', 2300, 'pending', '2027-01-03', 'pending'], 3: ['White Roses', 1530, 'canceled', '2027-02-14', 'canceled'], 4: ['Bloom Carts', 1800, 'paid', '2027-03-01', 'pending'],
      5: ['White Roses', 1530, 'paid', '2027-02-13', 'complete'], 6: ['Pink Carnations', 1185, 'paid', '2027-01-13', 'complete'], 7: ['Bloom Carts', 1800, 'paid', '2027-01-26', 'preparing'] };
    const today = { 123: ['09:53', 'Clark', 'out_for_delivery'], 124: ['12:12', 'Tarlac', 'pending'], 125: ['10:28', 'Bacolor', 'preparing'], 126: ['13:27', 'Mexico', 'pending'], 127: ['09:25', 'Bulacan', 'canceled'], 128: ['16:18', 'Tarlac', 'pending'], 129: ['11:24', 'San Fernando', 'preparing'], 130: ['14:32', 'Minalin', 'preparing'] };
    const pool = [...Array(21).fill('pending'), ...Array(36).fill('preparing'), ...Array(27).fill('out_for_delivery'), ...Array(27).fill('complete'), ...Array(4).fill('canceled')]; /* 115 orders -> ids 8..122 */
    let s = 7; const rnd = () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    const CUST = seedCustomers(), owners = ownerIndexes();
    let payPending = 0, k = 0, out = [];
    for (let n = 1; n <= 130; n++) {
      const sp = special[n], td = today[n]; let status, product, price, delivery, payment;
      const [pn, pp] = PRODUCTS[(n * 5) % PRODUCTS.length];
      if (sp) { [product, price, payment, delivery, status] = sp; } else {
        status = td ? td[2] : pool[k++]; product = pn; price = pp;
        const d = new Date(Date.UTC(2027, 0, 1 + (n * 13) % 90)); delivery = d.toISOString().slice(0, 10);
      }
      if (!sp) {
        if (status === 'canceled') payment = 'canceled';
        else if (status === 'pending') { if (n === 124) payment = 'pending'; else if (n === 126 || n === 128) payment = 'paid'; else if (payPending < 10) { payment = 'pending'; payPending++; } else payment = 'paid'; }
        else payment = 'paid';
      }
      const qty = !sp && n % 9 === 0 ? 2 : 1, id = 'ORD-' + String(n).padStart(3, '0');
      const cu = CUST[owners[n - 1]];
      out.push({ id, customerId: cu.id, customer: cu.name, phone: cu.phone, address: cu.address, product, amount: price * qty, payment, delivery, status,
        assigned: status === 'pending' || status === 'canceled' ? '' : STAFF[n % 4].name, createdAt: '2026-12-' + String(1 + n % 28).padStart(2, '0') + 'T09:00:00',
        items: [{ name: product, price, qty, lines: LINES[n % 2], img: n % 2 ? 'assets/bouquet-2.svg' : 'assets/bouquet-1.svg' }],
        ...(td ? { today: true, time: td[0], location: td[1] } : {}) });
    }
    return out;
  }
  const orders = () => { const l = jget(OKEY, null); if (l) return l; const s = seedOrders(); localStorage.setItem(OKEY, JSON.stringify(s)); return s; };
  /* flower inventory (the "Restock" table). ids are the visible #ITM-### codes */
  const STOCK0 = [['ITM-001', 'Pink Rose', 'Fresh', 10], ['ITM-002', 'Red Rose', 'Dome', 10], ['ITM-003', 'Red Tulip', 'Dried', 55], ['ITM-004', 'White Rose', 'Fresh', 32], ['ITM-005', 'Orange Tulip', 'Dried', 24],
    ['ITM-006', 'White Carnation', 'Dried', 10], ['ITM-007', 'Orange Carnation', 'Balloon', 10], ['ITM-008', 'Pink Tulip', 'Fresh', 34], ['ITM-009', 'Carnation', 'Fresh', 44], ['ITM-010', 'Lily', 'Fresh', 45], ['ITM-011', 'Peony', 'Fresh', 220]]
    .map(([id, name, category, stems]) => ({ id, name, category, stems, photo: 'photo.jpg' }));
  /* products (the "Add product" table) */
  const PKEY = 'benibe-admin-products', PSEQ = 'benibe-admin-prd-seq', ISEQ = 'benibe-admin-itm-seq', CATS = ['Fresh', 'Dried', 'Dome', 'Balloon'], SIZES = ['Small', 'Medium', 'Large'];
  const PRD0 = [['PRD-001', 'Blush Garden Bouquet', 10, 'Medium', 1543, 'Fresh', 'Pink Rose'], ['PRD-002', 'Crimson Dome', 10, 'Medium', 2300, 'Dome', 'Red Rose'], ['PRD-003', 'Dried Tulip Bundle', 55, 'Large', 1530, 'Dried', 'Red Tulip'],
    ['PRD-004', 'Classic White Bouquet', 32, 'Medium', 1800, 'Fresh', 'White Rose'], ['PRD-005', 'Dried White Posy', 24, 'Small', 1185, 'Dried', 'White Rose'], ['PRD-006', 'Sunset Tulip Posy', 10, 'Small', 999, 'Dried', 'Orange Tulip'],
    ['PRD-007', 'Orange Balloon Bouquet', 10, 'Small', 1250, 'Balloon', 'Orange Tulip']].map(([id, name, stock, size, price, category, type]) => ({ id, name, stock, size, price, category, type, photo: 'photo.jpg', description: 'Sample description.' }));
  const products = () => jget(PKEY, null) || clone(PRD0);
  const saveProducts = l => localStorage.setItem(PKEY, JSON.stringify(l));
  const nextCode = (key, prefix, floor) => { const n = (+localStorage.getItem(key) || floor) + 1; localStorage.setItem(key, n); return prefix + '-' + String(n).padStart(3, '0'); };
  const notFound = what => Object.assign(new Error(what + ' not found'), { status: 404 });
  const cleanProduct = p => {
    const name = String(p.name ?? '').trim(), type = String(p.type ?? '').trim(), description = String(p.description ?? '').trim(), size = p.size || 'Medium', price = Number(p.price), stock = Number(p.stock);
    if (name.length < 2 || name.length > 60) throw invalid('name', 'Enter a product name (2–60 characters).');
    if (!CATS.includes(p.category)) throw invalid('category', 'Choose a category.');
    if (type.length > 40) throw invalid('type', 'Type must be 40 characters or fewer.');
    if (!SIZES.includes(size)) throw invalid('size', 'Choose a size.');
    if (!(price > 0 && price <= 1000000)) throw invalid('price', 'Enter a price above 0 (up to 1,000,000).');
    if (!Number.isInteger(stock) || stock < 0 || stock > 100000) throw invalid('stock', 'Enter a whole number from 0 to 100,000.');
    if (description.length > 500) throw invalid('description', 'Keep the description under 500 characters.');
    return { name, category: p.category, type, size, price, stock, photo: String(p.photo || ''), description };
  };
  const cleanItem = p => {
    const name = String(p.name ?? '').trim(), stems = Number(p.stems);
    if (name.length < 2 || name.length > 40) throw invalid('name', 'Enter the flower type (2–40 characters).');
    if (!CATS.includes(p.category)) throw invalid('category', 'Choose a category.');
    if (!Number.isInteger(stems) || stems < 0 || stems > 100000) throw invalid('stems', 'Enter a whole number from 0 to 100,000.');
    return { name, category: p.category, stems, photo: String(p.photo || '') };
  };
  const dupName = (list, name, selfId) => { if (list.some(x => x.id !== selfId && x.name.toLowerCase() === name.toLowerCase())) throw invalid('name', 'That name is already in use.'); };
  const stock = () => jget(SKEY, null) || clone(STOCK0);
  const lowList = () => stock().filter(s => s.stems < LOW).sort((x, y) => x.stems - y.stems);
  const MONTHLY = [100, 80, 83, 128, 108, 97, 100, 135, 105, 118, 125, 150].map(v => v * 1000);
  const wave = (n, base, amp, seed) => Array.from({ length: n }, (_, i) => Math.round(base + amp * Math.sin(i * 0.9 + seed) + amp * 0.5 * Math.sin(i * 2.3 + seed * 2)));

  /* ===== [NEW] admin bookings (mock). Service reservations, separate from orders. ===== */
  const BKEY = 'benibe-admin-bookings', SERVICES = ['Bloom Carts', 'Flower Workshop', 'Event Styling'];
  const BST = { pending: 'Pending', confirmed: 'Confirmed', preparing: 'Preparing', completed: 'Completed', declined: 'Declined' };
  const DEPL = { paid: 'Paid', pending: 'Pending' };
  const ACTIVE = ['pending', 'confirmed', 'preparing'];
  const BTRANS = { status: { pending: ['confirmed', 'declined'], confirmed: ['preparing', 'declined'], preparing: ['completed'], completed: [], declined: [] }, deposit: { pending: ['paid'], paid: [] } };
  const todayIso = () => new Date().toLocaleDateString('en-CA');
  function seedBookings() {
    const NAMES = ['Ana Reyes', 'Marco Villanueva', 'Liza Manalo', 'Carlo Mendoza', 'Bea Santiago', 'Rico Dizon', 'Grace Pineda', 'Noel Bautista', 'Tina Ocampo', 'Jerome Lim', 'Faith Navarro', 'Paul Castillo'];
    const VENUES = ['Sto. Rosario Church, Angeles City', 'Clark Marriott Ballroom, Mabalacat', 'Casa Lakandula, San Jose, Angeles City', 'Hacienda Garden, San Fernando', 'Private residence, Balibago, Angeles City'];
    const NOTES = ['Pastel colours please.', 'Need setup 2 hours before the event.', 'Allergic to lilies.', 'Bring extra ribbon and vases.', '', ''];
    const spec = [ /* id, service, date, time, guests, sets, deposit, status */
      [1, 'Bloom Carts', '2027-01-04', '10:00', 0, 1, 'paid', 'pending'], [2, 'Flower Workshop', '2027-01-09', '14:00', 15, 0, 'pending', 'confirmed'], [3, 'Bloom Carts', '2027-01-15', '09:00', 50, 0, 'paid', 'confirmed'],
      [4, 'Flower Workshop', '2027-01-27', '13:00', 12, 0, 'paid', 'confirmed'], [5, 'Bloom Carts', '2027-02-14', '10:00', 80, 1, 'paid', 'pending'] ];
    const past = [[6, '2026-09-12', 'completed'], [7, '2026-09-26', 'completed'], [8, '2026-10-03', 'completed'], [9, '2026-10-10', 'declined'], [10, '2026-10-17', 'completed']];
    const out = [], used = new Set(), times = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00'];
    const push = (n, service, date, time, guests, sets, deposit, status) => { used.add(service + date + time);
      out.push({ id: 'BKG-' + String(n).padStart(3, '0'), customer: NAMES[(n * 7) % NAMES.length], phone: '09' + String(100000000 + (n * 7919317) % 900000000), service, date, time, venue: VENUES[n % 5], guests, sets,
        depositAmount: 500 * (1 + n % 5), deposit, status, assigned: status === 'pending' || status === 'declined' ? '' : STAFF[n % 4].name, notes: NOTES[n % 6], createdAt: '2026-10-0' + (1 + n % 9) + 'T10:00:00' }); };
    spec.forEach(s => push(...s));
    past.forEach(([n, date, status], i) => push(n, SERVICES[i % 3], date, times[i % 6], i % 2 ? 20 : 0, i % 2 ? 0 : 1, status === 'declined' ? 'pending' : 'paid', status));
    const stats = ['pending', 'confirmed', 'confirmed', 'preparing', 'pending', 'confirmed']; let k = 0;
    for (let n = 11; n <= 30; n++) {
      const service = SERVICES[n % 3]; let day = (n * 5) % 76, time = times[n % 6], date;
      do { date = new Date(Date.UTC(2027, 1, 1 + day)).toISOString().slice(0, 10); if (used.has(service + date + time)) day++; else break; } while (true);
      const status = stats[k++ % stats.length]; push(n, service, date, time, service === 'Bloom Carts' ? 0 : 10 + (n % 6) * 5, service === 'Bloom Carts' ? 1 + n % 3 : 0, status === 'pending' && n % 2 ? 'pending' : 'paid', status);
    }
    return out;
  }
  const bookings = () => { const l = jget(BKEY, null); if (l) return l; const s = seedBookings(); localStorage.setItem(BKEY, JSON.stringify(s)); return s; };
  const bFilter = (list, { status = '', service = '', q = '', id = '' }) => { const qq = q.trim().toLowerCase(), idq = id.trim().toLowerCase().replace(/^#/, '');
    return list.filter(b => (!status || b.status === status) && (!service || b.service === service) && (!idq || b.id.toLowerCase().includes(idq)) && (!qq || [b.id, b.customer, b.service].join(' ').toLowerCase().includes(qq))); };
  const bSummary = b => ({ id: b.id, customer: b.customer, service: b.service, date: b.date, time: b.time, guests: b.guests, sets: b.sets, deposit: b.deposit, status: b.status });
  const fmtD = iso => { const [y, m, d] = iso.split('-').map(Number); return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1] + ' ' + d + ', ' + y; };
  const fmtT = hhmm => { const [h, m] = hhmm.split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };

  /* ===== [NEW] admin customers (mock). Orders reference customers by customerId. ===== */
  const CKEY = 'benibe-admin-customers';
  const CITIES_C = ['Angeles City', 'Mabalacat', 'San Fernando', 'Mexico', 'Porac', 'Bacolor', 'Magalang', 'Guagua'];
  function seedCustomers() {
    const FIRST = ['Ana', 'Marco', 'Liza', 'Carlo', 'Bea', 'Rico', 'Grace', 'Noel', 'Tina', 'Jerome', 'Faith', 'Paul', 'Mika', 'Gab', 'Lara', 'Ian'];
    const LAST = ['Reyes', 'Villanueva', 'Manalo', 'Mendoza', 'Santiago', 'Dizon', 'Pineda', 'Bautista'];
    const STREETS = ['Sto. Rosario St.', 'Lakandula St.', 'Rizal Ave.', 'MacArthur Hwy', 'Magalang Rd.'], BRGY = ['Sto. Rosario', 'San Jose', 'Balibago', 'Pulung Maragul', 'Malabanias'];
    return Array.from({ length: 128 }, (_, i) => { const n = i + 1, first = FIRST[Math.floor(i / 8)], last = LAST[i % 8], city = CITIES_C[(n * 3) % 8];
      return { id: 'CUS-' + String(n).padStart(3, '0'), name: `${first} ${last}`, email: `${first}.${last}${n}@example.com`.toLowerCase(), phone: '09' + String(100000000 + (n * 7919317) % 900000000),
        address: `${(n * 3) % 90 + 1} ${STREETS[n % 5]}, ${BRGY[n % 5]}, ${city}`, city, joined: new Date(Date.UTC(2023, 0, 1 + n * 8)).toISOString().slice(0, 10), status: n % 8 === 2 ? 'inactive' : 'active' }; });
  }
  function ownerIndexes() { /* which customer placed each of the 130 sample orders (the first six match the design's order counts) */
    const list = []; [5, 0, 3, 9, 12, 2].forEach((c, i) => { for (let k = 0; k < c; k++) list.push(i); });
    for (let i = 0; list.length < 130; i++) list.push(6 + (i * 11) % 122);
    let s = 11; const rnd = () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
    for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
    return list;
  }
  const customers = () => { const l = jget(CKEY, null); if (l) return l; const s = seedCustomers(); localStorage.setItem(CKEY, JSON.stringify(s)); return s; };
  const saveCustomers = l => localStorage.setItem(CKEY, JSON.stringify(l));
  const custStats = (c, all) => { const mine = all.filter(o => o.customerId === c.id), paid = mine.filter(o => o.status !== 'canceled');
    return { ordersCount: mine.length, totalSpent: paid.reduce((s, o) => s + o.amount, 0), recentOrders: mine.slice().sort((x, y) => y.id.localeCompare(x.id)).slice(0, 3).map(o => ({ id: o.id, amount: o.amount, status: o.status })) }; };
  const cMatch = (c, { q = '', location = '', status = '' }) => { const qq = q.trim().toLowerCase().replace(/\s+/g, ' '), digits = qq.replace(/\D/g, '');
    return (!location || c.city === location) && (!status || c.status === status) && (!qq || [c.id, c.name, c.email].join(' ').toLowerCase().includes(qq) || (digits.length >= 3 && c.phone.includes(digits))); };
  const cleanCustomer = (p, list, selfId) => {
    const name = String(p.name ?? '').trim(), email = String(p.email ?? '').trim().toLowerCase(), phone = String(p.phone ?? '').replace(/\s/g, ''), address = String(p.address ?? '').trim(), city = String(p.city ?? '').trim();
    if (!/^[A-Za-z\u00C0-\u024F][A-Za-z\u00C0-\u024F\s.'-]{1,59}$/.test(name)) throw invalid('name', 'Enter a name (letters only, 2–60 characters).');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw invalid('email', 'Enter a valid email address.');
    if (!/^(09\d{9}|639\d{9})$/.test(phone)) throw invalid('phone', 'Enter a Philippine mobile number, like 09XXXXXXXXX.');
    if (address.length < 8 || address.length > 160) throw invalid('address', 'Enter the full address (8–160 characters).');
    if (city.length < 2 || city.length > 40) throw invalid('city', 'Enter the city or town.');
    if (list.some(c => c.id !== selfId && c.email === email)) throw invalid('email', 'That email is already used by another customer.');
    if (list.some(c => c.id !== selfId && c.phone === phone)) throw invalid('phone', 'That phone number is already used by another customer.');
    if (!['active', 'inactive'].includes(p.status)) throw invalid('status', 'Invalid status.');
    return { name, email, phone, address, city, status: p.status };
  };

  /* ===== [NEW] staff accounts (mock). Passwords are NEVER stored here; a real server hashes them. ===== */
  const SKEY2 = 'benibe-admin-staff', ROLES = ['Florist', 'Delivery rider', 'Cashier', 'Manager'], ACCESS = ['viewOrders', 'updateOrderStatus', 'manageProducts', 'manageStaff', 'viewSales'];
  const ROLE_ACCESS = { Florist: [1, 1, 1, 0, 0], 'Delivery rider': [1, 1, 0, 0, 0], Cashier: [1, 1, 0, 0, 1], Manager: [1, 1, 1, 1, 1] };
  const accessFrom = arr => Object.fromEntries(ACCESS.map((k, i) => [k, !!arr[i]]));
  function seedStaff() {
    const now = new Date(), at = (days, h, m) => { const d = new Date(now); d.setDate(d.getDate() - days); d.setHours(h, m, 0, 0); return (d > now ? new Date(now - 300000) : d).toISOString(); };
    const rows = [['Florist', at(0, 9, 0), 1, 'active'], ['Delivery rider', at(0, 8, 30), 1, 'active'], ['Cashier', at(1, 17, 0), 0, 'active'], ['Florist', at(10, 16, 0), 0, 'active'],
      ['Manager', at(0, 7, 45), 1, 'active'], ['Delivery rider', at(2, 15, 0), 0, 'inactive'], ['Florist', at(3, 12, 0), 0, 'active'], ['Cashier', at(20, 10, 0), 0, 'active']];
    return rows.map(([role, lastActiveAt, online, status], i) => { const [first, ...rest] = STAFF[i].name.split(' '), last = rest.join(' ');
      return { id: STAFF[i].id, firstName: first, lastName: last, name: STAFF[i].name, email: `${first}.${last.replace(/\s/g, '')}@benibe.example`.toLowerCase(), phone: '09' + String(200000000 + ((i + 1) * 6130421) % 700000000),
        role, status, online: !!online && status === 'active', lastActiveAt, access: accessFrom(ROLE_ACCESS[role]), mustChangePassword: false, createdAt: '2025-06-01T09:00:00' }; });
  }
  const staffAll = () => { const l = jget(SKEY2, null); if (l) return l; const s = seedStaff(); localStorage.setItem(SKEY2, JSON.stringify(s)); return s; };
  const saveStaff = l => localStorage.setItem(SKEY2, JSON.stringify(l));
  const assignable = name => staffAll().some(s => s.status === 'active' && s.name === name);
  const staffShow = s => { const { mustChangePassword, ...rest } = s; return { ...rest, presence: s.status === 'inactive' ? 'inactive' : s.online ? 'online' : 'offline' }; };
  const staffMatch = (s, { q = '', role = '', status = '' }) => { const qq = q.trim().toLowerCase().replace(/\s+/g, ' '), digits = qq.replace(/\D/g, ''), p = s.status === 'inactive' ? 'inactive' : s.online ? 'online' : 'offline';
    return (!role || s.role === role) && (!status || p === status) && (!qq || [s.id, s.name, s.email, s.role].join(' ').toLowerCase().includes(qq) || (digits.length >= 3 && s.phone.includes(digits))); };
  const openWork = name => ({ orders: orders().filter(o => o.assigned === name && ['pending', 'preparing', 'out_for_delivery'].includes(o.status)).length, bookings: bookings().filter(b => b.assigned === name && ACTIVE.includes(b.status)).length });
  const passOk = p => typeof p === 'string' && p.length >= 8 && p.length <= 64 && /[A-Za-z]/.test(p) && /\d/.test(p);
  const cleanStaff = (p, list, selfId, isNew) => {
    const firstName = String(p.firstName ?? '').trim(), lastName = String(p.lastName ?? '').trim(), email = String(p.email ?? '').trim().toLowerCase(), phone = String(p.phone ?? '').replace(/\s/g, '');
    const nameRx = /^[A-Za-z\u00C0-\u024F][A-Za-z\u00C0-\u024F\s.'-]{0,39}$/;
    if (!nameRx.test(firstName)) throw invalid('firstName', 'Enter a first name (letters only).');
    if (!nameRx.test(lastName)) throw invalid('lastName', 'Enter a last name (letters only).');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw invalid('email', 'Enter a valid email address.');
    if (!/^(09\d{9}|639\d{9})$/.test(phone)) throw invalid('phone', 'Enter a Philippine mobile number, like 09XXXXXXXXX.');
    if (!ROLES.includes(p.role)) throw invalid('role', 'Choose a role.');
    if (!['active', 'inactive'].includes(p.status)) throw invalid('status', 'Invalid status.');
    if (list.some(s => s.id !== selfId && s.email === email)) throw invalid('email', 'That email is already used by another staff member.');
    if (list.some(s => s.id !== selfId && s.phone === phone)) throw invalid('phone', 'That phone number is already used by another staff member.');
    if (list.some(s => s.id !== selfId && s.name.toLowerCase() === `${firstName} ${lastName}`.toLowerCase())) throw invalid('firstName', 'A staff member with this name already exists.');
    if ((isNew || p.password) && !passOk(p.password)) throw invalid('password', 'Use 8–64 characters with at least one letter and one number.');
    const access = Object.fromEntries(ACCESS.map(k => [k, !!(p.access && p.access[k])]));
    return { firstName, lastName, name: `${firstName} ${lastName}`, email, phone, role: p.role, status: p.status, access };
  };
  const NEXT = { placed: 'preparing', preparing: 'dispatched', dispatched: 'completed' };

  /* Demo order shown in the design. Remove when real data exists. */
  const SAMPLE = {
    id: 'BIF-000123', createdAt: '2026-09-29T10:15:00', status: 'dispatched', mode: 'delivery',
    contact: { name: 'Sample Customer', phone: '09170000000', email: 'sample@example.com' },
    address: 'address delivery house number, street, barangay, city/town', branch: '',
    schedule: { date: '2026-09-30', time: '4:00 - 4:30 PM' }, payment: 'GCash', trackingNumber: 'SAMPLE-TRK-001',
    items: [
      { name: 'Product Name', price: 1025, qty: 1, img: 'assets/bouquet-1.svg', lines: ['3pcs', 'Pink', 'Cream', 'Pink', 'Regular Kraft Paper Bag', 'With Dedication Note'] },
      { name: 'Product Name', price: 1725, qty: 1, img: 'assets/bouquet-2.svg', lines: ['14pcs', 'Red', 'White', 'Dark Brown', 'Brown', 'Brown', 'Plastic Packaging'] }],
    notes: [], fee: FEE, total: 2789,
    events: [{ status: 'placed', at: '2026-09-29T10:15:00' }, { status: 'preparing', at: '2026-09-30T09:00:00' }, { status: 'dispatched', at: '2026-09-30T15:20:00' }]
  };

  return {
    /* GET /api/orders/:id  -> Order  (404 if not found or not owned by the signed-in customer) */
    getOrder(id) {
      return later(() => {
        const o = [...read(), SAMPLE].find(x => x.id.toLowerCase() === String(id).trim().toLowerCase());
        if (!o) throw Object.assign(new Error('Order not found'), { status: 404 });
        return clone(o);
      });
    },
    /* GET /api/orders?limit=1&sort=-createdAt -> Order  (the signed-in customer's latest order) */
    getLatestOrder() { return later(() => { const l = read(); return clone(l.length ? l[l.length - 1] : SAMPLE); }); },
    /* POST /api/orders  body: { contact, mode, address|branch, schedule, payment, items, notes }
       The server must recompute fee/total from its own prices and create the id. */
    placeOrder(p) {
      return later(() => {
        const n = (+localStorage.getItem(SEQ) || 123) + 1; localStorage.setItem(SEQ, n);
        const fee = p.mode === 'delivery' ? FEE : 0, now = new Date().toISOString();
        const o = { ...clone(p), id: 'BIF-' + String(n).padStart(6, '0'), createdAt: now, status: 'placed', trackingNumber: null, fee,
          total: p.items.reduce((s, i) => s + i.price * i.qty, 0) + fee, events: [{ status: 'placed', at: now }] };
        const all = read(); all.push(o); write(all); return clone(o);
      });
    },
    /* ===== [NEW] admin ===== */
    /* GET /api/admin/me -> profile. 401 if not signed in, 403 if not an administrator. */
    getAdminProfile() { return later(() => clone(profile())); },
    /* PATCH /api/admin/me  body: any of firstName,lastName,email,phone,password,avatar -> updated profile.
       Server: validate everything again, HASH the password (never store or log it) and require the CURRENT password to change it. */
    updateAdminProfile(patch) {
      return later(() => {
        const { password, ...rest } = patch;
        if (password !== undefined && (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password))) throw invalid('password', 'Password must be 8+ characters with a letter and a number.');
        if (rest.email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(rest.email)) throw invalid('email', 'Enter a valid email address.');
        const next = { ...jget(AKEY, {}), ...rest }; localStorage.setItem(AKEY, JSON.stringify(next)); /* password is deliberately NOT stored */
        const fields = Object.keys(rest).filter(k => k !== 'avatar'); if (rest.avatar) fields.push('photo');
        if (fields.length) addLog('Updated profile information (' + fields.join(', ') + ')');
        if (password !== undefined) addLog('Changed account password');
        return clone(profile());
      });
    },
    /* GET /api/admin/activity-log?limit=7 -> { items:[{id,user,at,activity}], total }  (the latest `limit`, oldest first) */
    getActivityLog({ limit = 100 } = {}) { return later(() => { const l = logs(); return clone({ items: l.slice(-limit), total: l.length }); }); },
    /* GET /api/admin/notifications -> [{id,text,at,read}] ;  POST /api/admin/notifications/read */
    getNotifications() { return later(() => { const r = jget(NKEY, []); return clone(NOTES0.map(n => ({ ...n, read: r.includes(n.id) }))); }); },
    markNotificationsRead() { return later(() => { localStorage.setItem(NKEY, JSON.stringify(NOTES0.map(n => n.id))); return true; }); },
    /* ===== [NEW] reservations ===== */
    /* GET /api/reservations/:id -> Reservation (404 if not found or not the caller's) */
    getReservation(id) {
      return later(() => {
        const r = [...rread(), RSAMPLE].find(x => x.id.toLowerCase() === String(id).trim().toLowerCase());
        if (!r) throw Object.assign(new Error('Reservation not found'), { status: 404 });
        return clone(r);
      });
    },
    /* GET /api/reservations?limit=1&sort=-createdAt -> Reservation (the signed-in customer's latest) */
    getLatestReservation() { return later(() => { const l = rread(); return clone(l.length ? l[l.length - 1] : RSAMPLE); }); },
    /* POST /api/reservations -> Reservation. Server: re-validate, check the date is still available, create the id, notify the shop. */
    placeReservation(p) {
      return later(() => {
        const n = (+localStorage.getItem(RSEQ) || 45) + 1; localStorage.setItem(RSEQ, n); const now = new Date().toISOString();
        const r = { ...clone(p), id: 'BKG-' + String(n).padStart(6, '0'), createdAt: now, status: 'pending', quote: null, events: [{ status: 'pending', at: now }] };
        const all = rread(); all.push(r); localStorage.setItem(RKEY, JSON.stringify(all)); return clone(r);
      });
    },
    /* DEV ONLY (delete later): staff would do this in the admin area. Console: Api.mockAdvanceReservation('BKG-000046') */
    mockAdvanceReservation(id) {
      const all = rread(), r = all.find(x => x.id === id); if (!r || !RNEXT[r.status]) return null;
      r.status = RNEXT[r.status]; r.events.push({ status: r.status, at: new Date().toISOString() });
      if (r.status === 'confirmed') r.quote = { fee: 39, total: 39 + r.quantity * 25 }; /* placeholder price: the shop sets the real quote */
      localStorage.setItem(RKEY, JSON.stringify(all)); return r.status;
    },
    /* ===== [NEW] admin dashboard ===== */
    /* GET /api/admin/dashboard -> { stats, transactions:{total,items}, recent, lowStock:{count,items} } */
    getDashboard() {
      return later(() => {
        const all = orders(), low = lowList(), cnt = f => all.filter(f).length;
        const out = cnt(o => o.status === 'out_for_delivery'), due = cnt(o => o.today && ['pending', 'preparing'].includes(o.status));
        return clone({ stats: { salesToday: 123456, salesDeltaPct: 13.01, ordersToday: 36, ordersDeltaPct: 34.94, pendingOrders: cnt(o => o.status === 'pending'), lowStock: low.length,
            pendingPayments: cnt(o => o.payment === 'pending' && o.status !== 'canceled'), deliveriesToday: out + due, outForDelivery: out },
          transactions: { total: 36, items: all.filter(o => o.today).map(o => ({ id: o.id, customer: o.customer, orderName: o.product, time: o.time, location: o.location, status: o.status, payment: o.payment })) },
          recent: all.slice(0, 7).map(o => ({ id: o.id, customer: o.customer, product: o.product, amount: o.amount, payment: o.payment, delivery: o.delivery, status: o.status })),
          lowStock: { count: low.length, items: low.slice(0, 3) } });
      });
    },
    /* GET /api/admin/sales?period=daily|weekly|monthly -> { points:[{label,value}] } */
    getSales(period = 'monthly') {
      return later(() => {
        const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], now = new Date(); now.setHours(0, 0, 0, 0);
        if (period === 'monthly') return { points: MONTHLY.map((value, i) => ({ label: M[i], value })) };
        const n = period === 'weekly' ? 12 : 30, step = period === 'weekly' ? 7 : 1;
        const vals = period === 'weekly' ? wave(n, 85000, 22000, 1) : wave(n, 14000, 4500, 3);
        return { points: vals.map((value, i) => { const d = new Date(now); d.setDate(d.getDate() - (n - 1 - i) * step); return { label: `${M[d.getMonth()]} ${d.getDate()}`, value }; }) };
      });
    },
    /* PATCH /api/admin/orders/:id  body { status } or { payment } -> updated row.
       Server: allow only valid transitions (e.g. no re-opening a canceled order), and write the activity-log row itself. */
    updateOrder(id, patch) {
      return later(() => {
        const all = orders(), o = all.find(x => x.id === id); if (!o) throw notFound('Order');
        const next = { status: o.status, payment: o.payment, assigned: o.assigned };
        if (patch.payment !== undefined) {
          if (!PAYL[patch.payment]) throw invalid('payment', 'Invalid payment status.');
          if (patch.payment !== o.payment && !TRANS.payment[o.payment].includes(patch.payment)) throw invalid('payment', `Payment can’t change from ${PAYL[o.payment]} to ${PAYL[patch.payment]}.`);
          next.payment = patch.payment;
        }
        if (patch.status !== undefined) {
          if (!STL[patch.status]) throw invalid('status', 'Invalid order status.');
          if (patch.status !== o.status && !TRANS.status[o.status].includes(patch.status)) throw invalid('status', `An order can’t go from ${STL[o.status]} to ${STL[patch.status]}.`);
          next.status = patch.status;
        }
        if (patch.assigned !== undefined) { if (patch.assigned !== '' && !assignable(patch.assigned)) throw invalid('assigned', 'Choose a staff member.'); next.assigned = patch.assigned; }
        if (['preparing', 'out_for_delivery', 'complete'].includes(next.status) && next.payment !== 'paid') throw invalid('status', 'Verify the payment (Paid) before preparing or delivering.');
        if (next.payment === 'canceled' && next.status !== 'canceled') throw invalid('payment', 'Cancel the order instead of only the payment.');
        if (next.status === 'canceled' && next.payment === 'pending') next.payment = 'canceled'; /* a paid order that is canceled needs a refund: server-side */
        if (next.payment !== o.payment) addLog(`Change payment for #${id} from ${PAYL[o.payment]} to ${PAYL[next.payment]}`);
        if (next.status !== o.status) addLog(`Change status for #${id} from ${STL[o.status]} to ${STL[next.status]}`);
        if (next.assigned !== o.assigned) addLog(next.assigned ? `Assigned #${id} to ${next.assigned}` : `Unassigned #${id}`);
        Object.assign(o, next); localStorage.setItem(OKEY, JSON.stringify(all)); return clone(o);
      });
    },
    /* ===== [NEW] admin bookings ===== */
    bookingServices: SERVICES,
    bookingTransitions: BTRANS,
    /* GET /api/admin/bookings/calendar?month=YYYY-MM&status=&service=&q= -> [{id,customer,service,date,time,status}] */
    getBookingCalendar({ month, ...f } = {}) { return later(() => clone(bFilter(bookings(), f).filter(b => b.date.startsWith(month)).sort((x, y) => (x.date + x.time).localeCompare(y.date + y.time)).map(bSummary))); },
    /* GET /api/admin/bookings?scope=upcoming|all&status=&service=&q=&id=&page=&pageSize= -> { items,total,page,pages }
       upcoming = from today on and still active, soonest first; all = every booking, latest date first. */
    getAdminBookings({ scope = 'upcoming', page = 1, pageSize = 10, ...f } = {}) {
      return later(() => {
        let l = bFilter(bookings(), f); const t = todayIso();
        l = scope === 'upcoming' ? l.filter(b => b.date >= t && ACTIVE.includes(b.status)).sort((x, y) => (x.date + x.time).localeCompare(y.date + y.time)) : l.sort((x, y) => (y.date + y.time).localeCompare(x.date + x.time));
        const pages = Math.max(1, Math.ceil(l.length / pageSize)), p = Math.min(Math.max(1, +page || 1), pages);
        return clone({ items: l.slice((p - 1) * pageSize, p * pageSize).map(bSummary), total: l.length, page: p, pages });
      });
    },
    /* GET /api/admin/bookings/:id -> full booking */
    getAdminBooking(id) { return later(() => { const b = bookings().find(x => x.id === id); if (!b) throw notFound('Booking'); return clone(b); }); },
    /* PATCH /api/admin/bookings/:id  { status, deposit, assigned, date, time, reason }
       Server: enforce the allowed moves, block double-booking a service slot, notify the customer on confirm / reschedule / decline, and log it. */
    updateBooking(id, patch) {
      return later(() => {
        const all = bookings(), b = all.find(x => x.id === id); if (!b) throw notFound('Booking');
        const nx = { status: b.status, deposit: b.deposit, assigned: b.assigned, date: b.date, time: b.time };
        if (patch.status !== undefined) { if (!BST[patch.status]) throw invalid('status', 'Invalid booking status.');
          if (patch.status !== b.status && !BTRANS.status[b.status].includes(patch.status)) throw invalid('status', `A booking can’t go from ${BST[b.status]} to ${BST[patch.status]}.`); nx.status = patch.status; }
        if (patch.deposit !== undefined) { if (!DEPL[patch.deposit]) throw invalid('deposit', 'Invalid deposit status.');
          if (patch.deposit !== b.deposit && !BTRANS.deposit[b.deposit].includes(patch.deposit)) throw invalid('deposit', 'A paid deposit can’t be changed here.'); nx.deposit = patch.deposit; }
        if (patch.assigned !== undefined) { if (patch.assigned !== '' && !assignable(patch.assigned)) throw invalid('assigned', 'Choose a staff member.');
          if (patch.assigned !== b.assigned && !ACTIVE.includes(b.status)) throw invalid('assigned', 'Only active bookings can be assigned.'); nx.assigned = patch.assigned; }
        if (patch.date !== undefined || patch.time !== undefined) {
          nx.date = patch.date ?? b.date; nx.time = patch.time ?? b.time;
          if (!ACTIVE.includes(b.status)) throw invalid('date', 'Only active bookings can be rescheduled.');
          if (!/^\d{4}-\d{2}-\d{2}$/.test(nx.date) || nx.date < todayIso()) throw invalid('date', 'Choose a date from today onward.');
          if (!/^\d{2}:\d{2}$/.test(nx.time) || nx.time < '08:00' || nx.time > '18:00') throw invalid('time', 'Choose a time between 8:00 AM and 6:00 PM.');
          if (all.some(x => x.id !== id && ACTIVE.includes(x.status) && x.service === b.service && x.date === nx.date && x.time === nx.time)) throw invalid('time', `${b.service} is already booked at that time.`);
        }
        const reason = String(patch.reason ?? '').trim(); if (reason.length > 200) throw invalid('reason', 'Keep the reason under 200 characters.');
        if (nx.deposit !== b.deposit) addLog(`Change deposit for #${id} from ${DEPL[b.deposit]} to ${DEPL[nx.deposit]}`);
        if (nx.status !== b.status) addLog(`Change status for #${id} from ${BST[b.status]} to ${BST[nx.status]}` + (nx.status === 'declined' && reason ? ` (${reason})` : ''));
        if (nx.date !== b.date || nx.time !== b.time) addLog(`Rescheduled #${id} from ${fmtD(b.date)} ${fmtT(b.time)} to ${fmtD(nx.date)} ${fmtT(nx.time)}`);
        if (nx.assigned !== b.assigned) addLog(nx.assigned ? `Assigned #${id} to ${nx.assigned}` : `Unassigned #${id}`);
        Object.assign(b, nx); if (nx.status === 'declined' && reason) b.declineReason = reason;
        localStorage.setItem(BKEY, JSON.stringify(all)); return clone(b);
      });
    },
    /* ===== [NEW] admin customers ===== */
    /* GET /api/admin/customers/locations -> ['Angeles City', ...] */
    getCustomerLocations() { return later(() => [...new Set(customers().map(c => c.city))].sort()); },
    /* GET /api/admin/customers?q=&location=&status=&page=&pageSize= -> { items,total,totalAll,page,pages }
       q matches name, email, ID and phone digits. ordersCount comes from the orders table. */
    getAdminCustomers({ page = 1, pageSize = 10, ...f } = {}) {
      return later(() => {
        const all = customers(), ords = orders(), m = all.filter(c => cMatch(c, f)), pages = Math.max(1, Math.ceil(m.length / pageSize)), p = Math.min(Math.max(1, +page || 1), pages);
        return clone({ items: m.slice((p - 1) * pageSize, p * pageSize).map(c => ({ ...c, ordersCount: ords.filter(o => o.customerId === c.id).length })), total: m.length, totalAll: all.length, page: p, pages });
      });
    },
    /* GET /api/admin/customers/:id -> customer + { ordersCount, totalSpent, recentOrders } */
    getAdminCustomer(id) { return later(() => { const c = customers().find(x => x.id === id); if (!c) throw notFound('Customer'); return clone({ ...c, ...custStats(c, orders()) }); }); },
    /* PATCH /api/admin/customers/:id { name,email,phone,address,city,status } */
    updateCustomer(id, patch) {
      return later(() => {
        const l = customers(), c = l.find(x => x.id === id); if (!c) throw notFound('Customer');
        const nx = cleanCustomer({ ...c, ...patch }, l, id), before = { ...c }; Object.assign(c, nx); saveCustomers(l);
        if (nx.name !== before.name || nx.phone !== before.phone || nx.address !== before.address) { const o = orders(); o.forEach(x => { if (x.customerId === id) { x.customer = nx.name; x.phone = nx.phone; x.address = nx.address; } }); localStorage.setItem(OKEY, JSON.stringify(o)); }
        if (nx.status !== before.status) addLog(`${nx.status === 'inactive' ? 'Deactivated' : 'Activated'} customer #${id}`);
        if (['name', 'email', 'phone', 'address', 'city'].some(k => nx[k] !== before[k])) addLog(`Edited customer #${id}`);
        return clone({ ...c, ...custStats(c, orders()) });
      });
    },
    /* DELETE /api/admin/customers/:id. Server: customers with orders must be deactivated or anonymised, not deleted. */
    deleteCustomer(id) {
      return later(() => {
        const l = customers(), c = l.find(x => x.id === id); if (!c) throw notFound('Customer');
        if (orders().some(o => o.customerId === id)) throw invalid('delete', 'This customer has orders, so it can’t be deleted. Deactivate the account instead.');
        saveCustomers(l.filter(x => x.id !== id)); addLog(`Deleted customer #${id} ${c.name}`); return true;
      });
    },
    /* GET /api/admin/customers/export?q=&location=&status= -> rows (admin only; log it, it contains personal data) */
    exportCustomers(f = {}) {
      return later(() => { const ords = orders(), rows = customers().filter(c => cMatch(c, f)).map(c => ({ ...c, ordersCount: ords.filter(o => o.customerId === c.id).length }));
        addLog(`Exported ${rows.length} customers`); return clone(rows); });
    },
    /* ===== [NEW] admin staff ===== */
    staffRoles: ROLES, staffRoleAccess: ROLE_ACCESS,
    /* GET /api/admin/staff/list?q=&role=&status=online|offline|inactive&page=&pageSize= -> { items,total,totalAll,page,pages } */
    getAdminStaff({ page = 1, pageSize = 6, ...f } = {}) {
      return later(() => { const all = staffAll(), m = all.filter(s => staffMatch(s, f)), pages = Math.max(1, Math.ceil(m.length / pageSize)), p = Math.min(Math.max(1, +page || 1), pages);
        return clone({ items: m.slice((p - 1) * pageSize, p * pageSize).map(staffShow), total: m.length, totalAll: all.length, page: p, pages }); });
    },
    /* GET /api/admin/staff/:id -> staff + { openWork:{orders,bookings} } */
    getAdminStaffMember(id) { return later(() => { const s = staffAll().find(x => x.id === id); if (!s) throw notFound('Staff member'); return clone({ ...staffShow(s), openWork: openWork(s.name) }); }); },
    /* POST /api/admin/staff { firstName,lastName,email,phone,role,password,access,status }
       Server: hash the temporary password, force a change at first sign-in, email the invite, and only let people with "Manage Staff" call this. */
    addStaff(p) {
      return later(() => { const l = staffAll(), c = cleanStaff(p, l, null, true), n = Math.max(0, ...l.map(s => +s.id.slice(4))) + 1;
        const s = { id: 'STF-' + String(n).padStart(3, '0'), ...c, online: false, lastActiveAt: null, mustChangePassword: true, createdAt: new Date().toISOString() };
        l.push(s); saveStaff(l); addLog(`Added staff #${s.id} ${s.name} (${s.role})`); return clone(staffShow(s)); });
    },
    /* PATCH /api/admin/staff/:id (password optional: a new one resets it and forces a change) */
    updateStaff(id, patch) {
      return later(() => {
        const l = staffAll(), s = l.find(x => x.id === id); if (!s) throw notFound('Staff member');
        const c = cleanStaff({ ...s, ...patch }, l, id, false), before = { ...s };
        if (c.status === 'inactive' && before.status === 'active') { const w = openWork(before.name); if (w.orders + w.bookings) throw invalid('status', `Reassign ${w.orders} open order${w.orders === 1 ? '' : 's'} and ${w.bookings} open booking${w.bookings === 1 ? '' : 's'} before deactivating.`); }
        Object.assign(s, c); if (c.status === 'inactive') s.online = false; if (patch.password) s.mustChangePassword = true; saveStaff(l);
        if (c.name !== before.name) { const o = orders(); o.forEach(x => { if (x.assigned === before.name) x.assigned = c.name; }); localStorage.setItem(OKEY, JSON.stringify(o));
          const b = bookings(); b.forEach(x => { if (x.assigned === before.name) x.assigned = c.name; }); localStorage.setItem(BKEY, JSON.stringify(b)); }
        if (c.status !== before.status) addLog(`${c.status === 'inactive' ? 'Deactivated' : 'Activated'} staff #${id}`);
        if (['name', 'email', 'phone', 'role'].some(k => c[k] !== before[k]) || JSON.stringify(c.access) !== JSON.stringify(before.access)) addLog(`Edited staff #${id}`);
        if (patch.password) addLog(`Reset temporary password for staff #${id}`);
        return clone(staffShow(s));
      });
    },
    /* DELETE /api/admin/staff/:id. Server: block while they have open work; keep history by id. */
    deleteStaff(id) {
      return later(() => {
        const l = staffAll(), s = l.find(x => x.id === id); if (!s) throw notFound('Staff member');
        const w = openWork(s.name); if (w.orders + w.bookings) throw invalid('delete', `${s.name} still has ${w.orders} open order${w.orders === 1 ? '' : 's'} and ${w.bookings} open booking${w.bookings === 1 ? '' : 's'}. Reassign them or deactivate the account instead.`);
        saveStaff(l.filter(x => x.id !== id)); addLog(`Deleted staff #${id} ${s.name}`); return true;
      });
    },
    /* ===== [NEW] admin orders list ===== */
    transitions: TRANS,
    /* GET /api/admin/staff -> [{id,name}] */
    getStaff() { return later(() => clone(staffAll().filter(s => s.status === 'active').map(s => ({ id: s.id, name: s.name })))); },
    /* GET /api/admin/orders?status=&q=&id=&from=&to=&page=&pageSize= -> { items, total, page, pages, counts }
       counts = per-status totals for the current q/id/date filters (so the pills stay in step). */
    getAdminOrders({ status = '', q = '', id = '', from = '', to = '', page = 1, pageSize = 10 } = {}) {
      return later(() => {
        const qq = q.trim().toLowerCase(), idq = id.trim().toLowerCase().replace(/^#/, '');
        const base = orders().filter(o => (!idq || o.id.toLowerCase().includes(idq)) && (!qq || [o.id, o.customer, o.product].join(' ').toLowerCase().includes(qq)) && (!from || o.delivery >= from) && (!to || o.delivery <= to));
        const counts = { all: base.length }; Object.keys(STL).forEach(k => { counts[k] = base.filter(o => o.status === k).length; });
        const m = status ? base.filter(o => o.status === status) : base, pages = Math.max(1, Math.ceil(m.length / pageSize)), p = Math.min(Math.max(1, +page || 1), pages);
        const items = m.slice((p - 1) * pageSize, p * pageSize).map(o => ({ id: o.id, customer: o.customer, product: o.product, amount: o.amount, payment: o.payment, delivery: o.delivery, status: o.status }));
        return clone({ items, total: m.length, page: p, pages, counts });
      });
    },
    /* GET /api/admin/orders/:id -> full order (contact, address, items, assigned) */
    getAdminOrder(id) { return later(() => { const o = orders().find(x => x.id === id); if (!o) throw notFound('Order'); return clone(o); }); },
    /* GET /api/admin/stock?low=1 -> [{id,name,category,stems}] (lowest first) */
    getStock({ lowOnly = false } = {}) { return later(() => clone(lowOnly ? lowList() : stock().sort((x, y) => x.stems - y.stems))); },
    /* POST /api/admin/stock/:id/restock { stems } -> item */
    restock(id, stems) {
      return later(() => {
        const s = stock(), it = s.find(x => x.id === id); if (!it) throw Object.assign(new Error('Product not found'), { status: 404 });
        if (!Number.isInteger(stems) || stems < 1 || stems > 100000) throw invalid('stems', 'Enter a whole number from 1 to 100,000.');
        it.stems += stems; localStorage.setItem(SKEY, JSON.stringify(s)); addLog(`Added ${stems} stems of ${it.name}`); return clone(it);
      });
    },
    /* ===== [NEW] products + inventory (admin Products page) ===== */
    /* GET /api/admin/products -> [{id,name,stock,size,price,category,type,photo,description}] */
    getProducts() { return later(() => clone(products())); },
    /* POST /api/admin/products -> product. Photo files go to a separate upload endpoint; `photo` is just its stored name/url. */
    addProduct(p) {
      return later(() => { const l = products(), c = cleanProduct(p); dupName(l, c.name);
        const it = { id: nextCode(PSEQ, 'PRD', 7), ...c }; l.push(it); saveProducts(l); addLog(`Added product #${it.id} ${it.name}`); return clone(it); });
    },
    /* PATCH /api/admin/products/:id -> product */
    updateProduct(id, patch) {
      return later(() => { const l = products(), it = l.find(x => x.id === id); if (!it) throw notFound('Product');
        const c = cleanProduct({ ...it, ...patch }); dupName(l, c.name, id); Object.assign(it, c); saveProducts(l); addLog(`Edited product #${id}`); return clone(it); });
    },
    /* DELETE /api/admin/products/:id. Server: refuse (or archive) products that appear in orders. */
    deleteProduct(id) {
      return later(() => { const l = products(), it = l.find(x => x.id === id); if (!it) throw notFound('Product');
        saveProducts(l.filter(x => x.id !== id)); addLog(`Deleted product #${id} ${it.name}`); return true; });
    },
    /* POST /api/admin/stock -> item */
    addItem(p) {
      return later(() => { const l = stock(), c = cleanItem(p); dupName(l, c.name);
        const it = { id: nextCode(ISEQ, 'ITM', 11), ...c }; l.push(it); localStorage.setItem(SKEY, JSON.stringify(l)); addLog(`Added item #${it.id} ${it.name} (${c.stems} stems)`); return clone(it); });
    },
    /* PATCH /api/admin/stock/:id -> item */
    updateItem(id, patch) {
      return later(() => { const l = stock(), it = l.find(x => x.id === id); if (!it) throw notFound('Item');
        const c = cleanItem({ ...it, ...patch }); dupName(l, c.name, id); const before = { ...it }; Object.assign(it, c); localStorage.setItem(SKEY, JSON.stringify(l));
        addLog(c.stems > before.stems && c.name === before.name && c.category === before.category ? `Added ${c.stems - before.stems} stems of ${c.name}` : `Edited item #${id}`); return clone(it); });
    },
    /* DELETE /api/admin/stock/:id */
    deleteItem(id) {
      return later(() => { const l = stock(), it = l.find(x => x.id === id); if (!it) throw notFound('Item');
        localStorage.setItem(SKEY, JSON.stringify(l.filter(x => x.id !== id))); addLog(`Deleted item #${id} ${it.name}`); return true; });
    },
    /* DEV ONLY (delete later): moves a stored order to its next status. Try it in the console:
       Api.mockAdvance('BIF-000124')  – then refresh or wait up to a minute on the track page. */
    mockAdvance(id) {
      const all = read(), o = all.find(x => x.id === id); if (!o || !NEXT[o.status]) return null;
      o.status = NEXT[o.status]; o.events.push({ status: o.status, at: new Date().toISOString() });
      if (o.status === 'dispatched' && o.mode === 'delivery') o.trackingNumber = 'DEMO-' + Math.random().toString(36).slice(2, 10).toUpperCase();
      write(all); return o.status;
    }
  };
})();
