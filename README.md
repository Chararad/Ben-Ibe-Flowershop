# Ben Ibe Flowers – frontend (HTML, CSS, vanilla JS)

No build step and no dependencies. Open `index.html` in a browser, or serve the folder:

    python3 -m http.server 8000      # then visit http://localhost:8000

Fonts (Poppins, and Cormorant Garamond on the tracking pages) load from Google Fonts, so an internet connection is needed for the exact look.

Keep **all files in one folder**, with the `assets/` folder beside them. Most pages need `common.js` and `api.js` to work.

## Customer pages
| Page | File | Scripts (in load order) |
|---|---|---|
| Product page + order form | `index.html` | `common.js`, `script.js` |
| Service reservation (booking form) | `booking.html` | `common.js`, `api.js`, `booking.js` |
| Checkout | `order.html` | `common.js`, `api.js`, `order.js` |
| Track order | `track.html` | `common.js`, `api.js`, `tracklib.js`, `track.js` |
| Track booking | `track-booking.html` | `common.js`, `api.js`, `tracklib.js`, `track-booking.js` |

The header, footer, popups, toasts, cart badge and reviews live in `common.js`. `style.css` is shared by every page.

## Admin pages
Shared by all of them: `admin.css` (on top of `style.css`), `admin.js` (sidebar, header menus, notifications), `common.js` and `api.js`.

| Page | File | Script |
|---|---|---|
| Dashboard | `admin-dashboard.html` | `admin-dashboard.js` |
| Orders | `admin-orders.html` | `admin-orders.js` |
| Bookings | `admin-bookings.html` | `admin-bookings.js` |
| Products + flower inventory | `admin-products.html` | `admin-products.js` |
| Customers | `admin-customers.html` | `admin-customers.js` |
| Staff members | `admin-staff.html` | `admin-staff.js` |
| Profile settings + log history | `admin-profile.html` | `admin-profile.js` |

**There is no admin login yet.** Anyone who has the files can open the admin pages. Do not put them on a public site until sign-in and role checks exist on the server.

## Data layer (`api.js`)
Every page asks `api.js` for data; nothing else reads or writes orders, bookings, customers and so on. Today it is a mock that keeps data in the browser (`localStorage`, keys start with `benibe-`). When the backend exists, replace each method body with a `fetch()` call and keep the same return shapes. The endpoint for each method is written above it in `api.js`, and the full list is in `INTEGRATION.md`.

## Replace the placeholders (keep the file names)
- `assets/bouquet-1.svg`, `assets/bouquet-2.svg` are placeholder product photos. Swap in real photos with the same name, or change the `src` in the HTML or data if you use .jpg/.png.
- The logos are real: `assets/logo-icon.png` (header), `assets/footer-logo.png` (footer) and `assets/sidebar-logo.png` (admin sidebar).
- The footer social buttons currently show a "add your link" message. Put the shop's real Instagram, Facebook and TikTok URLs in the footer of each page.
- All names, emails, phone numbers, addresses, prices and order numbers in the pages are made-up sample data.

## Things to edit
- Product list and price on the product page: `PRICE` and the `products` list in `script.js`. Reviews: `reviews` in `common.js`.
- Terms & Conditions and Privacy Policy text (shown in popups): `openInfo` in `common.js`.
- Delivery fee, delivery time slots and pickup branches: `FEE`, `SLOTS`, `BRANCHES` in `order.js` (and `FEE` in `api.js`).
- Shop hours, branch addresses and contact details: the footer in each HTML page.
- Sample orders, bookings, customers, staff, products and stock: the seed data near the top of `api.js`.
- Colors and spacing: the CSS variables at the top of `style.css`.

## Demo behavior, and what still needs a backend
Everything below works only as a demonstration in the browser; nothing is stored on a server.
- Sign-in, "My Account", "Log out", messages/chat (these buttons show a "not built yet" message)
- Cart, checkout, order and booking numbers, payments (GCash / card), delivery pricing
- Order and booking tracking, status changes, confirmation emails or SMS
- Photo uploads (only the file name is recorded)
- Admin roles and permissions: the staff "Access" checkboxes are saved but not enforced
- Passwords are never stored in the browser, but real password hashing, login and sessions must be built on the server
- The customer checkout and the admin orders list use separate sample data; in a real database they must be the same orders and bookings

## Testing helpers (browser console)
- Move a customer order to its next status: `Api.mockAdvance('BIF-000124')`
- Move a booking to its next status: `Api.mockAdvanceReservation('BKG-000046')`
- Reset all demo data: `Object.keys(localStorage).filter(k => k.startsWith('benibe-')).forEach(k => localStorage.removeItem(k))`

Remove these helpers (`mockAdvance`, `mockAdvanceReservation`) before going live.

## Other files
- `INTEGRATION.md`: every endpoint the backend needs, with notes on validation, security and what the server must enforce.
- `CHANGES.md`: what was added or edited in each round. Edited code is marked `[NEW]` or `[EDITED]` in the CSS and JS files.

## Pages not built yet
Homepage, About, Services, Products listing, Terms and Privacy as separate pages, a cart page, customer sign-in and registration, and a 404 page. The header links "About" and "Services" and the footer links point to the footer or the booking page for now. The admin sidebar has no other missing pages.
