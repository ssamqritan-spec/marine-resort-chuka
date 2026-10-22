// API adapter. Contracts (proposed, not existing):
// POST /api/reservations {eventId,category,qty} -> {id,qty,status,total,serverTime,expiresAt}
// POST /api/orders {reservationId,buyer,holders[{name,phone}]} -> {id,total,serverTime,reservation{status,expiresAt}}
// POST /api/payments/submit {orderId,message} -> {status}   (message travels in the body only, never stored client-side)
// GET  /api/payments/:orderId/status -> {status: PAYMENT_SUBMITTED|VERIFICATION_PENDING|PAYMENT_VERIFIED|PAYMENT_REJECTED|MANUAL_REVIEW_REQUIRED|TICKET_ISSUED, tickets?[]}
// GET  /api/tickets (authenticated) -> [{id,holder,phone,category,status,issuedAt,qrImage}]
import { CONFIG } from './config.js';
import { api as mock } from './mock.js';
async function http(path, { method = 'GET', body } = {}) {
  const c = new AbortController(), t = setTimeout(() => c.abort(), CONFIG.TIMEOUT);
  try { const r = await fetch(CONFIG.API_BASE + path, { method, signal: c.signal, credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: body && JSON.stringify(body) });
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message || 'Request failed (' + r.status + ')'); return await r.json();
  } catch (e) { throw new Error(e.name === 'AbortError' ? 'The server took too long to respond.' : e.message || 'Service unavailable. Please try again.'); } finally { clearTimeout(t); }
}
const real = {
  reserve: b => http('/api/reservations', { method: 'POST', body: { eventId: CONFIG.EVENT.id, ...b } }),
  createOrder: ({ reservation, holders, buyer }) => http('/api/orders', { method: 'POST', body: { reservationId: reservation.id, holders, buyer } }),
  submitPayment: b => http('/api/payments/submit', { method: 'POST', body: b }),
  paymentStatus: id => http(`/api/payments/${encodeURIComponent(id)}/status`),
  tickets: () => http('/api/tickets')
};
export const api = CONFIG.MOCK ? mock : real;
