# CHROME XO

Mobile-first concert ticketing frontend: HTML5, CSS3, vanilla ES modules, GSAP, CSS 3D. No build step.

## Run locally
    Double-click index.html, or: cd chrome-xo && python3 -m http.server 8080
Works from a local file or a server (js/app.js is the bundled build of the modules; rebuild with: npx esbuild js/main.js --bundle --format=iife --minify --outfile=js/app.js).

## Deploy on Render (static site)
Push this folder to GitHub, create a Static Site on Render, publish directory `.`, no build command. `render.yaml` is included.

## Supabase
Run `supabase/schema.sql` in the Supabase SQL editor. Use the service key only inside the future Rust API, never in this frontend.

## Going live
1. Deploy the Rust API (Render web service) implementing the contracts documented at the top of `js/api-client.js`.
2. In `js/config.js` set `API_BASE` and `MOCK: false`.
3. Tickets, QR tokens, reservations and payment verification are server-authoritative.

## Layout
- `js/config.js` event facts, prices, payment number | `state.js` checkout state machine | `api-client.js` API adapter
- `js/mock.js` DEMO simulation | `ui.js` pages | `fx.js` hero, embers, 3D ticket
- `supabase/schema.sql` | `render.yaml` | `assets/` optimised photographs
Hash routes: `#/` `#/lineup` `#/experience` `#/event` `#/tickets` `#/customer` `#/pay` `#/verify` `#/status` `#/ticket` `#/my-tickets` `#/expired` `#/support`.

## Production notes
- Build: `npm i && npm run build` regenerates `js/app.js` and `css/app.min.css` (esbuild).
- Hosted sites call the real API at `API_BASE` (js/config.js).
- Until the Rust API is live, a hosted site will show a clear "could not reserve" message at checkout. Nothing is faked.
- `_headers` / `render.yaml` set security headers and caching. Update `connect-src` if the API domain changes.
- `sw.js` caches the app shell for fast repeat visits and never caches `/api/` requests.
- Set the real ticket-price, date and gate time in `js/config.js`.
