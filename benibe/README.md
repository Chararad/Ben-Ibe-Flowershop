# Ben Ibe Flowers - frontend (HTML, CSS, vanilla JS)

The storefront, the shop pages (product, booking, checkout, tracking) and the admin pages are now **one project**. No build step, no framework, no dependencies. Open `index.html` in a browser (it sends you to `html/index.html`; everything also works straight from the folder, without a web server), or serve the folder:

    python3 -m http.server 8000      # then visit http://localhost:8000

Fonts (Poppins, Cormorant Garamond) load from Google Fonts, so an internet connection is needed for the exact look.

## Folder structure
    index.html          entry page: forwards to html/index.html
    html/               all 24 pages
    scripts/            components.js, chat.js, plus main/, shop/ and admin/ (one script per page + shared helpers)
    css/                base.css, components.css, chat.css, plus main/, shop/ and admin/
    assets/             logos and placeholder photos shared by every page

Inside `html/`, pages link to each other by file name only. Pages load `../css/...`, `../scripts/...` and `../assets/...`.

## Pages (`html/`)
**Storefront**
| Page | File | Script (`scripts/main/`) | Style (`css/main/`) |
|---|---|---|---|
| Homepage | `index.html` | `site.js` | `home.css` |
| Products (filters, pagination) | `products.html` | `products.js` | `products.css` |
| Services + booking popup | `services.html` | `services.js` | `services.css` |
| Booking confirmation | `booking-confirmation.html` | `booking-confirmation.js` | `confirmation.css` |
| Order confirmation | `order-confirmation.html` | `order-confirmation.js` | `confirmation.css` |
| About Us | `about.html` | `site.js` | `about.css` |
| Customer profile | `profile.html` | `profile.js` | `profile.css` |
| Terms & Conditions, Privacy Policy | `terms.html`, `privacy.html` | `site.js` | `legal.css` |
| Register, Reset password (stand-alone) | `register.html`, `reset-password.html` | `auth.js` | `auth.css` |
| 404 error (stand-alone) | `404.html` | - | `auth.css` |

`site.js` is shared by the storefront pages (homepage content, scroll reveal, back-to-top and small helpers). Every storefront page also loads `css/main/site.css`.

**Shop pages (formerly `part2/` folder Janna's part)** - scripts in `scripts/shop/`, styles in `css/shop/` (plus the shared `shop/site.css`)
| Page | File | Scripts (after `components.js`, `chat.js`) | Style |
|---|---|---|---|
| Product page + order form | `product.html` | `common.js`, `product.js` | `product.css` |
| Service reservation (booking form) | `booking.html` | `common.js`, `api.js`, `reservation.js` | `reservation.css` |
| Checkout | `order.html` | `common.js`, `api.js`, `checkout.js` | `checkout.css` |
| Track order | `track.html` | `common.js`, `api.js`, `tracklib.js`, `track-order.js` | `track-order.css` |
| Track booking | `track-booking.html` | `common.js`, `api.js`, `tracklib.js`, `track-booking.js` | `track-booking.css` |

`common.js` holds the dialog popups, cart logic and reviews of the shop pages.

**Admin pages** - scripts in `scripts/admin/`, styles in `css/admin/` (plus `shop/site.css` and `admin/shell.css`)
| Page | File | Script / style |
|---|---|---|
| Dashboard | `admin-dashboard.html` | `dashboard.js` / `dashboard.css` |
| Orders | `admin-orders.html` | `orders.js` / `orders.css` |
| Bookings | `admin-bookings.html` | `bookings.js` / `bookings.css` |
| Products + flower inventory | `admin-products.html` | `products.js` / `products.css` |
| Customers | `admin-customers.html` | `customers.js` / `customers.css` |
| Staff members | `admin-staff.html` | `staff.js` / `staff.css` |
| Profile settings + log history | `admin-profile.html` | `profile.js` / `profile.css` |

All admin pages also load `shop/common.js`, `shop/api.js` and `admin/shell.js` (sidebar drawer, header menus, notifications). **There is no admin login yet.** Anyone who has the files can open the admin pages. Do not put them on a public site until sign-in and role checks exist on the server.

Names that changed when the folders were merged: `part2/index.html` is now `html/product.html` (the homepage keeps `index.html`); `script.js` became `main/site.js` and `shop/product.js`; `booking.js` and `order.js` became `main/booking-confirmation.js` and `main/order-confirmation.js` (storefront) and `shop/reservation.js` and `shop/checkout.js` (shop); `admin.js` became `admin/shell.js`; `track.js` became `shop/track-order.js`.

## Shared components (one place, same on every page)
`scripts/components.js` renders the navbar (with the top bar), footer, sidebar, login popup and toast, so there is no copy of them in the HTML files. A page contains placeholders and loads the script **before its own scripts, at the end of `<body>`**:

    <div data-bi="navbar" data-active="products"></div>        <!-- home | about | products | services -->
    <div data-bi="footer"></div>
    <div data-bi="sidebar" data-variant="account" data-active="profile"></div>   <!-- profile page -->
    <div data-bi="sidebar" data-variant="admin" data-active="orders"></div>      <!-- admin pages -->
    <script src="../scripts/components.js"></script>
    <script src="../scripts/chat.js"></script>                 <!-- only pages with the navbar -->

- Links and images are built from the project folder, so the same markup works anywhere.
- Change shop details (hours, branches, phone, email), the nav links, social links or sidebar links once, at the top of `scripts/components.js`.
- Page scripts can react to `bi:search` (header search) and `bi:cart-click` (cart icon) events; `event.preventDefault()` replaces the default (search opens the Products page, the cart opens `html/order.html`). Helpers: `BenIbeShell.toast(msg)`, `.openModal(id)`, `.closeModal(el)`, `.setCartCount(n)`.
- Popups: write them as `.bi-modal` (see `services.html`), open with a `data-modal="id"` button; Esc, the X and a click outside close them.
- To add a page: copy a similar page into `html/`, change the content and the CSS and script links, and keep the placeholders.

## Chat popup (prototype)
The speech-bubble icon in the navbar opens a floating chat (header, messages, text box, send button, quick replies; full-width bottom sheet on phones). It replies automatically (opening hours, delivery, tracking, branches, booking) and keeps the conversation in the browser (`localStorage`, key `benibe-chat-demo`). **There is no chat server yet.** Only `ChatService` at the top of `scripts/chat.js` would change: replace `history()` and `send(text)` with calls to your chat API and keep the message shape `{ from: 'shop' | 'customer', text, at }`.

## CSS organisation
Load order on a page: `base.css` -> `components.css` -> `chat.css` -> site file (`main/site.css` or `shop/site.css`) -> page file(s). Every page links exactly the files it needs. Shared components use the `bi-` prefix (`bi-block__element--modifier`, state classes `is-open`, `is-active`); older page-specific class names were left as they are so nothing else changed. Rules keep their original order inside each file, with responsive `@media` blocks at the bottom (a few stay in place where a later rule depends on them). Colors, fonts and motion are CSS variables in `css/base.css` (`--bi-*`).

## Data layer (`scripts/shop/api.js`)
The shop and admin pages ask `api.js` for data; nothing else reads or writes orders, bookings, customers and so on. Today it is a mock that keeps data in the browser (`localStorage`, keys start with `benibe-`). When the backend exists, replace each method body with a `fetch()` call and keep the same return shapes. The endpoint for each method is written above it in `api.js`.

## Replace the placeholders (keep the file names)
- Photos in `assets/` are placeholder SVGs: `hero`, `product`, `cat`, `story`, `svc-hero`, `svc-cart`, `svc-workshop`, `booking-hero`, `order-hero`, `about-hero`, `about-founders`, `bouquet-1`, `bouquet-2`, `topo` (page background). Swap in real photos with the same name, or change the `src` if you use .jpg/.png.
- All names, emails, phone numbers, addresses, prices and order numbers in the pages are made-up sample data.

## Things to edit
- Storefront content: top of `scripts/main/site.js` (homepage) and `products.js` (catalogue). Profile demo data: `profile.js`. Sample order: `order-confirmation.js`.
- Product page: `PRICE` and the `products` list in `scripts/shop/product.js`. Reviews: `reviews` in `common.js`.
- Delivery fee, time slots and pickup branches: `FEE`, `SLOTS`, `BRANCHES` in `scripts/shop/checkout.js` (and `FEE` in `api.js`).
- Sample orders, bookings, customers, staff, products and stock: the seed data near the top of `api.js`.
- "Last Updated" date: `html/terms.html` and `html/privacy.html` (the `<time>` line, text and `datetime`).

## Demo behavior, and what still needs a backend
Everything below works only as a demonstration in the browser; nothing is stored on a server.
- Login popup, registration, password reset emails, the "My Account" session (a flag kept for the browser tab only)
- Customer chat (prototype with automatic replies). The admin "message" buttons still show a "not built yet" message
- Cart, checkout, order and booking numbers, payments (GCash / card), delivery pricing
- Order and booking tracking, status changes, confirmation emails or SMS; booking submission to a branch
- Saved addresses, transaction and log history, profile and password changes, photo uploads (only the file name is recorded)
- Admin roles and permissions: the staff "Access" checkboxes are saved but not enforced
- Passwords are never stored in the browser, but real password hashing, login and sessions must be built on the server
- The storefront sample data, the shop checkout and the admin orders list are separate samples; in a real database they must be the same orders and bookings

## Testing helpers (browser console)
- Move a customer order to its next status: `Api.mockAdvance('BIF-000124')`
- Move a booking to its next status: `Api.mockAdvanceReservation('BKG-000046')`
- Reset all demo data: `Object.keys(localStorage).filter(k => k.startsWith('benibe-')).forEach(k => localStorage.removeItem(k))`

Remove these helpers (`mockAdvance`, `mockAdvanceReservation`) before going live.

## Other notes
- `INTEGRATION.md` (backend endpoints) and `CHANGES.md` (change log) are mentioned in `api.js` but were not in the files received. Add them back if you have them.
- The customer cart icon opens the checkout page; a separate cart page and real customer sign-in are not built yet.

## Hosting the 404 page
`html/404.html` uses relative links. Most hosts look for `404.html` in the site's top folder, so configure your host to serve `html/404.html` (or copy it to the top folder and change its asset and link paths).
