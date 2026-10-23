import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';
import QRCode from 'qrcode';

const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;
const ORIGINS = (process.env.ALLOWED_ORIGIN || 'https://marine-resort-chuka.onrender.com')
  .split(',').map(s => s.trim().replace(/\/$/, '')).filter(Boolean);
const EVENT_ID = 'evt_khaligraph_chuka';
const PRICE = 250, MAX_QTY = 10;
const RESERVE_MS = 2 * 60 * 1000, PAY_MS = 10 * 60 * 1000, REVIEW_MS = 24 * 60 * 60 * 1000;
const PAY_NUMBER_DIGITS = '732532860';

let _db;
const db = () => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) throw new HttpError(500, 'Server is not configured yet.');
  return (_db ||= createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } }));
};

class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
const fail = (s, m) => { throw new HttpError(s, m); };
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);
const q = async p => { const { data, error } = await p; if (error) { console.error(error); fail(500, 'Service error. Please try again.'); } return data; };
const isUuid = v => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const clean = (v, max) => String(v ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, max);
const digits = v => String(v || '').replace(/\D/g, '');

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(cors({
  origin: (origin, cb) => cb(null, !origin || ORIGINS.includes(origin)),
  credentials: true, methods: ['GET', 'POST', 'OPTIONS'], allowedHeaders: ['Content-Type'], maxAge: 86400
}));
app.use(express.json({ limit: '20kb' }));
app.use('/api', rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: true, legacyHeaders: false, message: { message: 'Too many requests. Please slow down.' } }));
const strict = rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: true, legacyHeaders: false, message: { message: 'Too many attempts. Please wait a minute.' } });

// ---- anonymous session cookie (used only for "My Tickets") ----
const getSid = req => (req.headers.cookie || '').split(';').map(c => c.trim().split('=')).find(([k]) => k === 'cxo_sid')?.[1];
const ensureSid = (req, res) => {
  let sid = getSid(req);
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(sid || '')) sid = crypto.randomBytes(24).toString('base64url');
  res.cookie('cxo_sid', sid, { httpOnly: true, secure: true, sameSite: 'none', maxAge: 365 * 24 * 3600 * 1000, path: '/' });
  return sid;
};

app.get('/', (_req, res) => res.json({ service: 'chrome-xo-api', ok: true }));
app.get('/api/health', (_req, res) => res.json({ ok: true, configured: !!(SUPABASE_URL && SUPABASE_SERVICE_KEY), origins: ORIGINS }));

// ---- 1. reserve ----
app.post('/api/reservations', strict, wrap(async (req, res) => {
  const { eventId, qty } = req.body || {};
  const n = Number(qty);
  if (!Number.isInteger(n) || n < 1 || n > MAX_QTY) fail(400, `Choose between 1 and ${MAX_QTY} tickets.`);
  if (eventId !== EVENT_ID) fail(404, 'Event not found.');
  const ev = await q(db().from('events').select('id,capacity').eq('id', EVENT_ID).maybeSingle());
  if (!ev) fail(500, 'Event is not set up yet.');
  if (ev.capacity != null) {
    const { count } = await db().from('tickets').select('id', { count: 'exact', head: true }).eq('event_id', EVENT_ID);
    const held = await q(db().from('reservations').select('qty').eq('event_id', EVENT_ID).in('status', ['RESERVED', 'PAYMENT_PENDING']).gt('expires_at', new Date().toISOString()));
    const used = (count || 0) + held.reduce((a, r) => a + r.qty, 0);
    if (used + n > ev.capacity) fail(409, 'Sorry, not enough tickets are left.');
  }
  const expires = new Date(Date.now() + RESERVE_MS);
  const r = await q(db().from('reservations').insert({ event_id: EVENT_ID, qty: n, total_kes: n * PRICE, status: 'RESERVED', expires_at: expires.toISOString() }).select().single());
  res.json({ id: r.id, qty: r.qty, category: 'online', status: r.status, total: r.total_kes, serverTime: Date.now(), expiresAt: expires.getTime() });
}));

// ---- 2. create order ----
const orderOut = (o, r) => ({ id: o.id, total: o.total_kes, serverTime: Date.now(),
  reservation: { id: r.id, qty: r.qty, category: 'online', status: 'PAYMENT_PENDING', total: r.total_kes, expiresAt: new Date(r.expires_at).getTime() } });

app.post('/api/orders', strict, wrap(async (req, res) => {
  const { reservationId, buyer, holders } = req.body || {};
  if (!isUuid(reservationId)) fail(400, 'Invalid reservation.');
  const r = await q(db().from('reservations').select('*').eq('id', reservationId).maybeSingle());
  if (!r) fail(404, 'Reservation not found.');
  if (['EXPIRED', 'RELEASED'].includes(r.status) || new Date(r.expires_at) < new Date()) fail(410, 'Your reservation has expired. Please start again.');
  const bName = clean(buyer?.name, 80), bPhone = clean(buyer?.phone, 20);
  if (bName.length < 2 || digits(bPhone).length < 9) fail(400, 'Please enter your name and a valid phone number.');
  if (!Array.isArray(holders) || holders.length !== r.qty) fail(400, 'Enter a name and phone number for every ticket.');
  const hs = holders.map(h => ({ name: clean(h?.name, 80), phone: clean(h?.phone, 20) }));
  if (hs.some(h => h.name.length < 2 || digits(h.phone).length < 9)) fail(400, 'Enter a valid name and phone number for every ticket.');
  const sid = ensureSid(req, res);
  const existing = await q(db().from('orders').select('*').eq('reservation_id', r.id).maybeSingle());
  if (existing) {
    if (existing.status !== 'AWAITING_PAYMENT') fail(409, 'This order has already been paid.');
    const o = await q(db().from('orders').update({ buyer_name: bName, buyer_phone: bPhone, holders: hs, session_id: sid }).eq('id', existing.id).select().single());
    return res.json(orderOut(o, r));
  }
  const expires = new Date(Date.now() + PAY_MS).toISOString();
  const upd = await q(db().from('reservations').update({ status: 'PAYMENT_PENDING', expires_at: expires }).eq('id', r.id).select().single());
  const o = await q(db().from('orders').insert({ reservation_id: r.id, buyer_name: bName, buyer_phone: bPhone, total_kes: r.total_kes, holders: hs, session_id: sid }).select().single());
  res.json(orderOut(o, upd));
}));

// ---- 3. submit payment message: checked automatically, tickets issued on success ----
const ALPHA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const part = () => Array.from({ length: 4 }, () => ALPHA[crypto.randomInt(ALPHA.length)]).join('');

async function issueTickets(o) {
  const have = await q(db().from('tickets').select('id').eq('order_id', o.id));
  if (!have.length) {
    const rows = (o.holders || []).map(h => ({ id: `OML-${part()}-${part()}-${part()}`, event_id: EVENT_ID, order_id: o.id, holder_name: h.name, holder_phone: h.phone,
      category: 'ONLINE', status: 'VALID', qr_token: crypto.randomBytes(24).toString('base64url') }));
    if (!rows.length) fail(500, 'Order has no ticket holders.');
    await q(db().from('tickets').insert(rows));
  }
  await q(db().from('orders').update({ status: 'PAID' }).eq('id', o.id));
  await q(db().from('reservations').update({ status: 'CONVERTED' }).eq('id', o.reservation_id));
}

app.post('/api/payments/submit', strict, wrap(async (req, res) => {
  const { orderId, message } = req.body || {};
  if (!isUuid(orderId)) fail(400, 'Invalid order.');
  if (typeof message !== 'string' || message.trim().length < 10 || message.length > 2000) fail(400, 'Paste the full M-PESA confirmation message.');
  const o = await q(db().from('orders').select('*').eq('id', orderId).maybeSingle());
  if (!o) fail(404, 'Order not found.');
  if (o.status !== 'AWAITING_PAYMENT') return res.json({ status: 'PAYMENT_SUBMITTED' });
  const text = message.replace(/\s+/g, ' ').trim();
  const ref = text.toUpperCase().match(/\b(?=[A-Z0-9]*[A-Z])(?=[A-Z0-9]*\d)[A-Z0-9]{10}\b/)?.[0];
  const amt = text.match(/Ksh\.?\s?([\d,]+(?:\.\d{1,2})?)/i);
  const parsed = amt ? Math.round(parseFloat(amt[1].replace(/,/g, ''))) : null;
  const valid = !!ref && /confirmed/i.test(text) && parsed !== null && parsed >= o.total_kes && digits(text).includes(PAY_NUMBER_DIGITS);
  if (!valid) { // rejected: nothing is locked, the buyer can paste the correct message
    await q(db().from('payment_submissions').insert({ order_id: o.id, status: 'REJECTED', raw_message: text, parsed_amount: parsed, reviewed_at: new Date().toISOString() }));
    return res.json({ status: 'PAYMENT_SUBMITTED' });
  }
  const hash = crypto.createHash('sha256').update(text.toLowerCase()).digest('hex');
  const ins = await db().from('payment_submissions').insert({ order_id: o.id, message_hash: hash, mpesa_ref: ref, status: 'VERIFICATION_PENDING', raw_message: text, parsed_amount: parsed }).select().single();
  if (ins.error) { if (ins.error.code === '23505') fail(409, 'This M-PESA message has already been used.'); console.error(ins.error); fail(500, 'Service error. Please try again.'); }
  try {
    await issueTickets(o);
    await q(db().from('payment_submissions').update({ status: 'VERIFIED', reviewed_at: new Date().toISOString() }).eq('id', ins.data.id));
  } catch (e) { await db().from('payment_submissions').delete().eq('id', ins.data.id); throw e; }
  res.json({ status: 'PAYMENT_SUBMITTED' });
}));

// ---- 4. payment status (polled by the site) ----
const ticketOut = async t => ({ id: t.id, holder: t.holder_name, phone: t.holder_phone, category: t.category, status: t.status, issuedAt: t.issued_at,
  qrImage: await QRCode.toDataURL(`CXO:${t.id}:${t.qr_token}`, { margin: 1, width: 240 }) });

app.get('/api/payments/:orderId/status', wrap(async (req, res) => {
  if (!isUuid(req.params.orderId)) fail(400, 'Invalid order.');
  const subs = await q(db().from('payment_submissions').select('status,created_at').eq('order_id', req.params.orderId).order('created_at', { ascending: false }).limit(1));
  const s = subs[0]?.status;
  if (!s || s === 'VERIFICATION_PENDING' || Date.now() - new Date(subs[0].created_at).getTime() < 2500) return res.json({ status: 'VERIFICATION_PENDING' });
  if (s === 'MANUAL_REVIEW') return res.json({ status: 'MANUAL_REVIEW_REQUIRED' });
  if (s === 'REJECTED') return res.json({ status: 'PAYMENT_REJECTED' });
  const ts = await q(db().from('tickets').select('*').eq('order_id', req.params.orderId).order('issued_at'));
  if (!ts.length) return res.json({ status: 'VERIFICATION_PENDING' });
  res.json({ status: 'TICKET_ISSUED', tickets: await Promise.all(ts.map(ticketOut)) });
}));

// ---- 5. my tickets (this browser only) ----
app.get('/api/tickets', wrap(async (req, res) => {
  const sid = getSid(req);
  if (!sid) return res.json([]);
  const orders = await q(db().from('orders').select('id').eq('session_id', sid));
  if (!orders.length) return res.json([]);
  const ts = await q(db().from('tickets').select('*').in('order_id', orders.map(o => o.id)).order('issued_at', { ascending: false }));
  res.json(await Promise.all(ts.map(ticketOut)));
}));

app.use((_req, _res, next) => next(new HttpError(404, 'Not found.')));
app.use((err, _req, res, _next) => {
  const status = err.status || (err.type === 'entity.parse.failed' ? 400 : 500);
  if (status === 500) console.error(err);
  res.status(status).json({ message: status === 500 ? (err.message === 'Server is not configured yet.' ? err.message : 'Service error. Please try again.') : err.message });
});

app.listen(process.env.PORT || 3000, () => console.log('chrome-xo-api listening; allowed origins:', ORIGINS.join(', ')));
