import { CONFIG as C } from './config.js';
import { S, go, save, reset } from './state.js';
import { api } from './api-client.js';
import { intro, embers, parallax, ticket3d } from './fx.js';
const E = C.EVENT, $ = (s, r = document) => r.querySelector(s), money = n => 'KSh ' + n.toLocaleString('en-KE');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const say = m => { $('#live').textContent = m; };
const normPhone = v => { const m = v.replace(/[\s\-()]/g, '').match(/^(?:\+?254|0)([17]\d{8})$/); return m ? '+254' + m[1] : null; };
const steps = n => `<div class="steps">${['Tickets', 'Details', 'Payment', 'Verify'].map((t, i) => `<span class="${i <= n ? 'on' : ''}">${i + 1} ${t}</span>`).join('')}</div>`;
const rsvBar = () => `<div class="rsv" id="rsv" role="timer"><span class="lbl" id="rl">RESERVATION</span><b id="rt">--:--</b></div>`;
const gallery = [['crowd-1', 'Live music'], ['crowd-2', 'Good vibes'], ['drinks', 'Food and drinks'], ['wristbands', 'One crowd'], ['vibes', 'Night out'], ['crowd-3', 'After dark']];

/* QR placeholder: real tickets use the server-authorised image (qrImage). Never encodes personal data. */
function qrMatrix(seed) { let h = 2166136261; for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619); const n = 25, m = [];
  for (let y = 0; y < n; y++) { m[y] = []; for (let x = 0; x < n; x++) { h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; m[y][x] = h % 100 < 48; } }
  const fp = (ox, oy) => { for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) m[oy + y][ox + x] = x == 0 || y == 0 || x == 6 || y == 6 || (x > 1 && x < 5 && y > 1 && y < 5); };
  fp(0, 0); fp(n - 7, 0); fp(0, n - 7); return m; }
const qrSvg = t => t.qrImage ? `<img src="${esc(t.qrImage)}" alt="Ticket QR code" width="100" height="100">` :
  `<svg viewBox="0 0 25 25" shape-rendering="crispEdges" role="img" aria-label="Ticket QR code placeholder">${qrMatrix(t.id).map((r, y) => r.map((v, x) => v ? `<rect x="${x}" y="${y}" width="1" height="1"/>` : '').join('')).join('')}</svg>`;
function pass(t) { return `<article class="pass" aria-label="Ticket ${esc(t.id)}">
<div class="top"><div><h3>${E.name.replace('XO', '<span class="red">XO</span>')}</h3><div class="lbl" style="color:#222">${E.artist}</div></div><span class="om">${C.ISSUER}</span></div>
<dl><div><dt>Holder</dt><dd>${esc(t.holder)}</dd></div><div><dt>Phone</dt><dd>${esc(t.phone)}</dd></div>
<div><dt>Ticket no.</dt><dd>${esc(t.id)}</dd></div><div><dt>Admission</dt><dd>${esc(t.category)}</dd></div>
<div><dt>Date</dt><dd>${E.dateLabel}</dd></div><div><dt>Venue</dt><dd>Marine Park Resort, Chuka</dd></div></dl>
<div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:8px"><span class="st">${esc(t.status)}</span><div class="qr">${qrSvg(t)}</div></div></article>`; }
async function png(t) { await document.fonts.ready; const c = document.createElement('canvas'); c.width = 1000; c.height = 520; const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 1000, 520); g.addColorStop(0, '#d7d8dc'); g.addColorStop(.35, '#8c8d94'); g.addColorStop(.6, '#e6e7ea'); g.addColorStop(1, '#7d7e85'); x.fillStyle = g; x.fillRect(0, 0, 1000, 520);
  x.strokeStyle = '#ED102B'; x.lineWidth = 8; x.strokeRect(4, 4, 992, 512); x.fillStyle = '#0b0b0d'; x.font = '84px Anton'; x.fillText('CHROME', 40, 105); x.fillStyle = '#ED102B'; x.fillText('XO', 330, 105);
  x.fillStyle = '#0b0b0d'; x.fillRect(790, 50, 170, 56); x.fillStyle = '#fff'; x.font = '38px Anton'; x.fillText(C.ISSUER, 806, 94);
  x.fillStyle = '#0b0b0d'; x.font = '34px Anton'; x.fillText(E.artist, 40, 160); x.setLineDash([12, 10]); x.beginPath(); x.moveTo(40, 190); x.lineTo(960, 190); x.stroke(); x.setLineDash([]);
  const rows = [['HOLDER', t.holder], ['PHONE', t.phone], ['TICKET NO.', t.id], ['ADMISSION', t.category], ['DATE', E.dateLabel], ['VENUE', 'MARINE PARK RESORT, CHUKA']];
  rows.forEach(([k, v], i) => { const cx = 40 + (i % 2) * 300, cy = 235 + (i >> 1) * 80; x.font = '700 15px Inter'; x.fillStyle = '#444'; x.fillText(k, cx, cy); x.font = '600 21px Inter'; x.fillStyle = '#0b0b0d'; x.fillText(String(v), cx, cy + 28, 280); });
  x.fillStyle = '#fff'; x.fillRect(700, 230, 260, 260); x.fillStyle = '#000'; const m = qrMatrix(t.id), s = 10; m.forEach((r, j) => r.forEach((v, i) => v && x.fillRect(715 + i * s, 245 + j * s, s, s)));
  const a = document.createElement('a'); a.download = `chromexo-${t.id}.png`; a.href = c.toDataURL('image/png'); a.click(); }

function timer(el) { const r = S.res; if (!r) return () => {}; const rt = $('#rt', el), rl = $('#rl', el), box = $('#rsv', el);
  const tick = () => { const left = Math.max(0, r.expiresAt - (Date.now() + S.offset)); const s = Math.ceil(left / 1000);
    rt.textContent = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
    rl.textContent = r.status === 'PAYMENT_PENDING' ? 'PAYMENT WINDOW' : 'TIME REMAINING'; box.className = 'rsv' + (s <= 10 ? ' crit' : s <= 30 ? ' warn' : '');
    if (!left) { clearInterval(id); try { go('RESERVATION_EXPIRED'); } catch {} location.hash = '#/expired'; } };
  const id = setInterval(tick, 1000); tick(); return () => clearInterval(id); }
const sync = o => { if (o.serverTime) S.offset = o.serverTime - Date.now(); };

export const views = {
  home: { html: () => `<section class="hero"><div class="hero-bg"><div class="slides"><img class="sl" style="--d:0s" src="assets/artists/hero.webp" alt="Khaligraph Jones on stage" fetchpriority="high"><img class="sl g" style="--d:6s" src="assets/artists/guest-2.webp" alt="Portrait"><img class="sl" style="--d:12s" src="assets/artists/kj-3.webp" alt="Khaligraph Jones above the crowd"><img class="sl g" style="--d:18s" src="assets/artists/guest-1.webp" alt="Portrait"></div><div class="beam b1"></div><div class="beam b2"></div><div class="smoke"></div><canvas id="fx"></canvas></div>
<div class="hero-copy"><p class="live">Live at Marine Park Resort, Chuka</p>
<h1 class="hero-title"><span><i class="w">KHALIGRAPH</i></span><span><i class="r">JONES</i></span></h1>
<p class="tag">Labels change. Roots don't.</p>
<div class="meta"><div>${E.dateLabel}</div><div>${E.venue}</div></div>
<a class="pb" href="#/tickets" aria-label="Buy Chrome ticket now and save 50 shillings"><img src="assets/artists/kj-2.webp" alt="" width="400" height="120"><span class="pt"><b>Buy Chrome now</b><i>Save KSh 50 discount</i></span><span class="pa" aria-hidden="true">&rsaquo;</span></a>
<div class="price-strip"><span>Online ${money(C.PRICES.online)}</span><span>At the gate ${money(C.PRICES.gate)}</span><span class="sv">Save KSh 50 online</span><span class="gin">Sponsored by Chrome Gin</span></div></div></section>

<section class="ch a rv" id="experience"><img src="assets/artists/kj-4.webp" alt="Khaligraph Jones, black and white, mid-verse" loading="lazy"><div class="cp"><p class="kick">01 / Roots</p><h2>Raised by<br>the <em>street.</em></h2><p class="line">Before the lights, there was the street. Every bar, every beat, still sounds like home.</p></div></section>

<section class="ch b rv"><div class="ph"><img src="assets/gallery/crowd-1.webp" alt="Friends celebrating together in the crowd" loading="lazy"></div><div class="over"><p class="kick">02 / Together</p><h2>Celebrating<br>the street<br>that <em>made us.</em></h2></div></section>

<section class="ch c rv"><img src="assets/artists/kj-2.webp" alt="Khaligraph Jones with a hand raised, black and white" loading="lazy"><div class="cp r"><p class="kick">03 / Truth</p><h2>Labels<br>change.</h2><h2 class="big-r">Roots<br>don't.</h2></div></section>

<section class="ch d rv"><img src="assets/artists/kj-3.webp" alt="Khaligraph Jones on stage in front of the crowd" loading="lazy"><div class="cp t"><p class="kick">04 / Journey</p><h2>Refined by<br>the <em>journey.</em></h2><p class="line">From the corner to the main stage. Same fire, sharper edge.</p></div></section>

<section class="ch e rv"><img src="assets/gallery/drinks.webp" alt="Drinks glowing on a bar table at night" loading="lazy"><div class="cp"><p class="kick">05 / The pour</p><h2>Rich.<br>Bold.<br><em>Smooth.</em></h2></div></section>
<section class="spon rv" aria-label="Official sponsor"><img src="assets/logos/chrome-gin.webp" alt="Chrome Gin bottle with two glasses and lemon slices" loading="lazy"><div><p class="kick">Official sponsor</p><h3>Chrome <span>Gin</span></h3><p class="lead">Smooth and crisp. Shop smart, enjoy Chrome.</p><p class="small">Sponsored by Chrome Gin. 18+ only. Enjoy responsibly.</p></div></section>

<section class="ch f rv"><p class="kick pad">06 / The night</p><h2 class="bash">Bash nia<br>kitu <em>brandy.</em></h2>
<div class="col"><figure style="left:0;top:0;width:62%;--r:-3deg"><img src="assets/gallery/crowd-2.webp" alt="Dancing in red light" loading="lazy" data-lb="assets/gallery/crowd-2.webp"><figcaption>Dance.</figcaption></figure>
<figure style="right:0;top:19%;width:52%;--r:4deg"><img src="assets/gallery/vibes.webp" alt="Two friends laughing together" loading="lazy" data-lb="assets/gallery/vibes.webp"><figcaption>Laugh.</figcaption></figure>
<figure style="left:6%;top:45%;width:50%;--r:-2deg"><img src="assets/gallery/crowd-3.webp" alt="Dancing under disco lights" loading="lazy" data-lb="assets/gallery/crowd-3.webp"><figcaption>Lose track.</figcaption></figure>
<figure style="right:2%;top:70%;width:44%;--r:5deg"><img src="assets/gallery/wristbands.webp" alt="Hands joined together wearing red wristbands" loading="lazy" data-lb="assets/gallery/wristbands.webp"><figcaption>Same wristband. Same roots.</figcaption></figure></div></section>

<section class="sec rv wrap" id="lineup"><p class="lbl">On the bill</p><h2>The <span class="red">lineup</span></h2>
<div class="rail"><div class="act hl"><img src="assets/artists/hero.webp" alt="Khaligraph Jones" loading="lazy"><div><h3>Khaligraph Jones</h3><small>Headliner</small></div></div>
<div class="act"><img src="assets/artists/guest-2.webp" alt="Boutross" loading="lazy"><div><h3>Boutross</h3><small>Live in Chuka</small></div></div></div></section>
<section class="sec rv wrap bt"><p class="kick">Also on stage</p><h2>Bou<span class="red">tross</span></h2>
<div class="btg"><img class="m" src="assets/artists/guest-2.webp" alt="Boutross" loading="lazy"><img src="assets/artists/guest-3.webp" alt="Boutross" loading="lazy"><img src="assets/artists/guest-1.webp" alt="Boutross" loading="lazy"></div></section>

<section class="cta rv"><p class="kick">We do not sell tickets</p><h2>We sell the night<br>you will <em>talk about.</em></h2>
<div class="stage" id="stage" aria-label="Interactive 3D ticket, drag to rotate"><div class="t3d">
<div class="face"><div class="perf"></div><div class="tiny">${E.name} presents</div><div><h3>${E.artist.split(' ')[0]}<br>${E.artist.split(' ')[1]}</h3></div><div class="tiny">Live in Chuka / ${E.dateLabel}</div></div>
<div class="face back"><h3>${C.ISSUER}</h3><div class="tiny">Official ticket issuer</div></div></div></div><p class="lbl" style="text-align:center;margin:0 0 18px">Tap. Rotate. Feel the energy.</p>
<div class="wrap"><div class="tk"><div class="opt main"><span class="save">SAVE KSh 50</span><h3>${money(C.PRICES.online)}</h3><p>Online</p></div><div class="opt"><span class="lbl">At the gate</span><h3>${money(C.PRICES.gate)}</h3><p style="color:var(--muted)">Pay on event day</p></div></div><p class="note">Do not wait till late to buy your Chrome ticket.</p><a class="pb" href="#/tickets" aria-label="Buy Chrome ticket now and save 50 shillings"><img src="assets/artists/kj-2.webp" alt="" width="400" height="120"><span class="pt"><b>Buy Chrome now</b><i>Save KSh 50 discount</i></span><span class="pa" aria-hidden="true">&rsaquo;</span></a>
<footer class="foot">Ticket issuer ${C.ISSUER}. Sponsored by Chrome Gin. Payment by M-Pesa Send Money.</footer></div></section>
<a class="pb stk" id="stk" href="#/tickets" aria-label="Buy Chrome ticket now and save 50 shillings"><img src="assets/artists/kj-2.webp" alt="" width="400" height="120"><span class="pt"><b>Buy Chrome now</b><i>Save KSh 50 discount</i></span><span class="pa" aria-hidden="true">&rsaquo;</span></a>`,
    mount(el) { const hdr = $('.hdr'); intro(el); const stk = $('#stk', el), cta = $('.cta', el), tg = () => stk.classList.toggle('show', scrollY > innerHeight * .7 && cta.getBoundingClientRect().top > innerHeight * .6); addEventListener('scroll', tg, { passive: true }); tg(); const c1 = embers($('#fx')), c2 = parallax($('.hero')), c3 = ticket3d($('#stage'));
      el.querySelectorAll('[data-lb]').forEach(b => b.onclick = () => { const d = document.createElement('div'); d.className = 'lb'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); d.tabIndex = 0; d.innerHTML = `<img src="${b.dataset.lb}" alt="">`; d.onclick = () => d.remove(); d.onkeydown = e => e.key === 'Escape' && d.remove(); document.body.append(d); d.focus(); });
      return () => { removeEventListener('scroll', tg); c1(); c2(); c3(); }; } },
  event: { html: () => `<div class="co"><div class="wrap"><h1>Event details</h1><p class="sub">${E.name} presents ${E.artist}</p>
<div class="card"><p class="lbl">Date</p><p style="font-size:20px;font-weight:600">${E.dateLabel}</p><p style="color:var(--muted)">${E.gatesOpen ? 'Gates open ' + E.gatesOpen : 'Gate time to be announced'}</p></div>
<div class="card"><p class="lbl">Venue</p><p style="font-size:20px;font-weight:600">${E.venue}</p><a class="red" href="https://www.google.com/maps/search/?api=1&query=Marine+Park+Resort+Chuka" target="_blank" rel="noopener">Get directions</a></div>
<div class="card"><p class="lbl">Admission</p><p>Online ${money(C.PRICES.online)}. At the gate ${money(C.PRICES.gate)}.</p></div>
<a class="btn" href="#/tickets">Get your ticket</a></div></div>` },
  tickets: { html: () => `<div class="co"><div class="wrap">${steps(0)}<h1>Select tickets</h1><p class="sub">Choose how many tickets you need.</p>
<div class="tk"><div class="opt main"><span class="save">SAVE KSh 50</span><h3>${money(C.PRICES.online)}</h3><p>Online ticket. Fast entry.</p>
<div class="qty"><button id="mi" aria-label="Fewer tickets">-</button><output id="q" aria-live="polite">${S.qty}</output><button id="pl" aria-label="More tickets">+</button></div></div>
<div class="opt"><span class="lbl">At the gate</span><h3>${money(C.PRICES.gate)}</h3><p style="color:var(--muted)">Informational. Pay on event day.</p></div></div>
<div class="sum"><div><span>Online ticket x <span id="q2">${S.qty}</span></span><span>${money(C.PRICES.online)} each</span></div><div class="tot"><span>Total</span><span id="tt"></span></div></div><p class="err" id="er" role="alert"></p></div>
<div class="bar"><div class="wrap"><button class="btn" id="go">Continue</button></div></div></div>`,
    mount(el) { const upd = () => { $('#q', el).textContent = $('#q2', el).textContent = S.qty; $('#tt', el).textContent = money(S.qty * C.PRICES.online); save(); }; upd();
      $('#mi', el).onclick = () => { S.qty = Math.max(1, S.qty - 1); upd(); }; $('#pl', el).onclick = () => { S.qty = Math.min(C.MAX_QTY, S.qty + 1); upd(); };
      $('#go', el).onclick = async e => { const b = e.currentTarget; b.disabled = true; b.innerHTML = '<span class="sp"></span> Reserving'; $('#er', el).textContent = '';
        try { if (S.st === 'BROWSING') go('SELECTING_TICKETS'); if (S.st !== 'SELECTING_TICKETS') { reset(); S.qty = Math.min(S.qty, C.MAX_QTY); go('SELECTING_TICKETS'); } go('RESERVING');
          const r = await api.reserve({ qty: S.qty, category: 'online' }); sync(r); S.res = r; S.holders = []; go('RESERVED'); location.hash = '#/customer';
        } catch (x) { try { go('SELECTING_TICKETS'); } catch {} $('#er', el).textContent = x.message || 'Could not reserve tickets.'; b.disabled = false; b.textContent = 'Continue'; } }; } },
  customer: { guard: () => S.res && ['RESERVED', 'ENTERING_CUSTOMER_DETAILS', 'AWAITING_PAYMENT'].includes(S.st) ? '' : '#/tickets',
    html: () => `${rsvBar()}<div class="co"><div class="wrap" style="padding-top:44px">${steps(1)}<h1>Your details</h1><p class="sub">Tickets are held while the timer runs.</p>
<form id="f" novalidate><div class="card"><label for="bn">Your full name</label><input id="bn" type="text" autocomplete="name" value="${esc(S.buyer.name)}"><div class="err" id="e-bn"></div>
<label for="bp">Your phone number</label><input id="bp" type="tel" inputmode="tel" autocomplete="tel" placeholder="0712 345 678" value="${esc(S.buyer.phone)}"><div class="err" id="e-bp"></div></div>
${Array.from({ length: S.res.qty }, (_, i) => `<div class="card"><p class="lbl">Ticket ${i + 1} holder</p>${i == 0 ? '<label class="chk"><input type="checkbox" id="same"> Same as buyer</label>' : ''}
<label for="hn${i}">Full name</label><input id="hn${i}" type="text" autocomplete="off" value="${esc(S.holders[i]?.name || '')}"><div class="err" id="e-hn${i}"></div>
<label for="hp${i}">Phone number</label><input id="hp${i}" type="tel" inputmode="tel" placeholder="+254712345678" value="${esc(S.holders[i]?.phone || '')}"><div class="err" id="e-hp${i}"></div></div>`).join('')}
<div class="sum"><div class="tot"><span>Total</span><span>${money(S.res.total)}</span></div></div><p class="err" id="er" role="alert"></p>
<button class="btn" id="sub" type="submit">Continue to payment</button></form></div></div>`,
    mount(el) { if (S.st === 'RESERVED') go('ENTERING_CUSTOMER_DETAILS'); const t = timer(el), n = S.res.qty; const keep = () => { S.buyer = { name: $('#bn', el).value, phone: $('#bp', el).value }; S.holders = Array.from({ length: n }, (_, i) => ({ name: $('#hn' + i, el).value, phone: $('#hp' + i, el).value })); save(); };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', keep)); const same = $('#same', el);
      if (same) same.onchange = () => { if (same.checked) { $('#hn0', el).value = $('#bn', el).value; $('#hp0', el).value = $('#bp', el).value; keep(); } };
      $('#f', el).onsubmit = async ev => { ev.preventDefault(); let ok = true; const bad = (k, m) => { $('#e-' + k, el).textContent = m; ok = false; }; el.querySelectorAll('.err').forEach(e => e.textContent = '');
        if ($('#bn', el).value.trim().length < 3) bad('bn', 'Enter your full name.'); const bp = normPhone($('#bp', el).value); if (!bp) bad('bp', 'Enter a valid Kenyan number, e.g. 0712 345 678.');
        const holders = []; for (let i = 0; i < n; i++) { const nm = $('#hn' + i, el).value.trim(), ph = normPhone($('#hp' + i, el).value); if (nm.length < 3) bad('hn' + i, 'Enter the ticket holder name.'); if (!ph) bad('hp' + i, 'Enter a valid Kenyan number.'); holders.push({ name: nm, phone: ph }); }
        if (!ok) { say('Please fix the highlighted fields.'); return; } const b = $('#sub', el); b.disabled = true; b.innerHTML = '<span class="sp"></span> Saving';
        try { const o = await api.createOrder({ reservation: S.res, holders, buyer: { name: $('#bn', el).value.trim(), phone: bp } }); sync(o); S.order = o; S.res = o.reservation; S.holders = holders; go('AWAITING_PAYMENT'); location.hash = '#/pay';
        } catch (x) { $('#er', el).textContent = x.message; b.disabled = false; b.textContent = 'Continue to payment'; } }; return t; } },
  pay: { guard: () => S.order && ['AWAITING_PAYMENT', 'PAYMENT_FAILED'].includes(S.st) ? '' : '#/tickets',
    html: () => `${rsvBar()}<div class="co"><div class="wrap center" style="padding-top:44px;text-align:left">${steps(2)}<h1>Complete your payment</h1><p class="sub">Order ${esc(S.order.id)}</p>
<div class="card"><p class="lbl">Amount due</p><div class="big">${money(S.order.total)}</div><p class="lbl" style="margin-top:12px">${C.PAY.method}</p>
<div class="num"><span>${C.PAY.number}</span><button id="cp">COPY</button></div><p style="color:var(--muted);font-size:14px">Confirm this recipient number on the M-Pesa screen before you send.</p></div>
<ol class="how"><li>Open M-Pesa.</li><li>Select Send Money.</li><li>Enter ${C.PAY.number}.</li><li>Enter the exact amount, ${money(S.order.total)}.</li><li>Complete the payment.</li><li>Copy your M-Pesa confirmation message.</li><li>Return here and submit the message.</li></ol>
<p class="err" style="color:var(--muted)">Submitting a message does not guarantee a ticket. Tickets are issued only after the payment is verified.</p></div>
<div class="bar"><div class="wrap"><a class="btn" href="#/verify">I have sent the money</a></div></div></div>`,
    mount(el) { const t = timer(el); $('#cp', el).onclick = async e => { try { await navigator.clipboard.writeText(C.PAY.number); e.target.textContent = 'COPIED'; say('Number copied'); } catch { e.target.textContent = 'SELECT'; } }; return t; } },
  verify: { guard: () => S.order && ['AWAITING_PAYMENT', 'PAYMENT_FAILED'].includes(S.st) ? '' : '#/tickets',
    html: () => `${rsvBar()}<div class="co"><div class="wrap" style="padding-top:44px">${steps(3)}<h1>Verify your payment</h1><p class="sub">Paste your M-Pesa confirmation message below.</p>
<form id="f"><label for="msg">M-Pesa confirmation message</label><textarea id="msg" placeholder="Paste your M-Pesa confirmation SMS here." autocomplete="off" spellcheck="false"></textarea><p class="err" id="er" role="alert"></p>
<p style="color:var(--muted);font-size:14px;margin:10px 0 16px">Privacy: your message is sent securely for verification only. It is not stored on this device and never appears in a link.</p>
<button class="btn" id="sub" type="submit">Submit for verification</button></form></div></div>`,
    mount(el) { const t = timer(el); let busy = false; $('#f', el).onsubmit = async ev => { ev.preventDefault(); if (busy) return; const m = $('#msg', el).value; if (!m.trim()) { $('#er', el).textContent = 'Paste your M-Pesa message to continue.'; return; }
        busy = true; const b = $('#sub', el); b.disabled = true; b.innerHTML = '<span class="sp"></span> Submitting';
        try { await api.submitPayment({ orderId: S.order.id, message: m, holders: S.holders, total: S.order.total }); $('#msg', el).value = ''; S.submittedAt = Date.now(); if (S.st === 'PAYMENT_FAILED') go('AWAITING_PAYMENT'); go('PAYMENT_SUBMITTED'); location.hash = '#/status';
        } catch (x) { busy = false; $('#er', el).textContent = x.message; b.disabled = false; b.textContent = 'Submit for verification'; } }; return t; } },
  status: { guard: () => S.order && ['PAYMENT_SUBMITTED', 'VERIFYING_PAYMENT', 'MANUAL_REVIEW', 'PAYMENT_FAILED'].includes(S.st) ? '' : (S.st === 'TICKET_READY' ? '#/ticket' : '#/tickets'),
    html: () => `<div class="co"><div class="wrap center"><div id="body"></div></div></div>`,
    mount(el) { let stop = false; const body = $('#body', el); const draw = (cls, title, msg, extra = '') => body.innerHTML = `<div class="ring ${cls}"><svg viewBox="0 0 160 160"><circle class="bg" cx="80" cy="80" r="70"/><circle class="fg" cx="80" cy="80" r="70"/></svg><b>${cls ? 'XO' : '...'}</b></div><h1>${title}</h1><p class="sub">${msg}</p><p class="lbl">Order ${esc(S.order.id)}</p>${extra}`;
      const poll = async () => { if (stop) return; const el2 = (Date.now() - (S.submittedAt || Date.now())) / 1000;
        try { const r = await api.paymentStatus(S.order.id);
          if (['PAYMENT_SUBMITTED', 'VERIFICATION_PENDING'].includes(r.status)) { if (S.st === 'PAYMENT_SUBMITTED') go('VERIFYING_PAYMENT'); draw('', 'Payment verification in progress', el2 > 60 ? 'Verification is taking longer than expected. Your request is still being processed. You can leave and return with your order reference.' : 'Your payment is being checked. This usually takes 30 to 60 seconds.', '<p style="margin-top:18px"><a class="red" href="#/support">Need help?</a></p>'); }
          else if (r.status === 'MANUAL_REVIEW_REQUIRED') { if (S.st === 'VERIFYING_PAYMENT') go('MANUAL_REVIEW'); draw('', 'Manual review', 'Your payment needs a manual check. Keep your order reference. We will update this page.', '<p style="margin-top:18px"><a class="red" href="#/support">Contact support</a></p>'); }
          else if (r.status === 'PAYMENT_REJECTED') { if (S.st !== 'PAYMENT_FAILED') go('PAYMENT_FAILED'); stop = true; draw('', 'Payment not verified', 'We could not match this message to a payment. Check the amount and recipient, then try again, or contact support.', '<div class="acts"><a class="btn" href="#/verify">Try again</a><a class="btn ghost" href="#/support">Contact support</a></div>'); body.querySelector('.ring svg').style.animation = 'none'; return; }
          else if (r.status === 'TICKET_ISSUED') { stop = true; if (S.st === 'VERIFYING_PAYMENT' || S.st === 'MANUAL_REVIEW') go('PAYMENT_VERIFIED'); go('ISSUING_TICKET'); S.tickets = r.tickets; go('TICKET_READY'); localStorage.setItem('cxo.last', JSON.stringify(r.tickets)); draw('done', 'Payment confirmed', 'Preparing your ticket.'); say('Payment confirmed'); setTimeout(() => location.hash = '#/ticket', 900); return; }
        } catch (x) { draw('', 'Checking payment', 'We could not reach the server. Retrying. Your order reference is safe.'); } setTimeout(poll, 3000); };
      draw('', 'Payment verification in progress', 'Your payment is being checked.'); poll(); return () => { stop = true; }; } },
  ticket: { guard: () => S.tickets?.length || JSON.parse(localStorage.getItem('cxo.last') || '[]').length ? '' : '#/my-tickets',
    html: () => { const L = S.tickets || JSON.parse(localStorage.getItem('cxo.last') || '[]'); return `<div class="co"><div class="wrap center" style="text-align:left"><div class="ok"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ED102B" stroke-width="3"><path d="M5 13l4 4L19 7"/></svg></div><h1 style="text-align:center">Payment successful</h1><p class="sub" style="text-align:center">Your ticket is ready</p>
${L.map(pass).join('')}<div class="acts"><button class="btn" id="dl">Download ticket (PNG)</button><button class="btn ghost" onclick="print()">Print or save as PDF</button><a class="btn ghost" href="#/my-tickets">My tickets</a></div></div></div>`; },
    mount(el) { const L = S.tickets || JSON.parse(localStorage.getItem('cxo.last') || '[]'); $('#dl', el).onclick = () => L.forEach(png); if (window.gsap) gsap.from('.pass', { y: 40, rotationX: 25, opacity: 0, stagger: .15, duration: .8, ease: 'power3.out' }); } },
  'my-tickets': { html: () => `<div class="co"><div class="wrap"><h1>My tickets</h1><p class="sub">Your issued tickets.</p><div id="list"><p class="sub"><span class="sp"></span> Loading</p></div></div></div>`,
    async mount(el) { try { const L = await api.tickets(); $('#list', el).innerHTML = L.length ? L.map(t => pass(t) + `<div class="acts" style="margin-bottom:22px"><button class="btn ghost" data-id="${esc(t.id)}">Download ${esc(t.id)}</button></div>`).join('') : '<div class="card center"><h3>No tickets yet</h3><p class="sub">Tickets appear here after payment is verified.</p><a class="btn" href="#/tickets">Get your ticket</a></div>';
      el.querySelectorAll('[data-id]').forEach(b => b.onclick = () => png(L.find(t => t.id === b.dataset.id)));
    } catch (x) { $('#list', el).innerHTML = `<p class="err">${esc(x.message)}</p>`; } } },
  expired: { html: () => `<div class="co"><div class="wrap center"><h1>Reservation expired</h1><p class="sub">Your hold on these tickets has ended and they were released.</p><a class="btn" href="#/tickets" id="again">Reserve again</a></div></div>`,
    mount(el) { $('#again', el).onclick = () => { const q = S.qty; reset(); S.qty = q; save(); }; } },
  support: { html: () => `<div class="co"><div class="wrap"><h1>Payment support</h1><p class="sub">Keep your order reference${S.order ? ': <b>' + esc(S.order.id) + '</b>' : ''} ready.</p>
<div class="card"><p>Contact the organiser using the details on the event poster, and quote your order reference. Do not send your M-Pesa PIN to anyone.</p></div><a class="btn ghost" href="#/">Back home</a></div></div>` }
};
