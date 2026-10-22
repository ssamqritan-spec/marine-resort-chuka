// DEVELOPMENT MOCK ONLY. Everything here is DEMO: no real reservation, payment or ticket exists.
const wait = ms => new Promise(r => setTimeout(r, ms));
const rid = p => p + '-' + [...crypto.getRandomValues(new Uint8Array(4))].map(b => b.toString(36).toUpperCase().padStart(2,'0')).join('').slice(0,6);
const subs = {}; const DEMO_VERIFY_MS = 10000;
const mine = () => JSON.parse(localStorage.getItem('cxo.demo.tickets') || '[]');
export const api = {
  async reserve({ qty, category }) { await wait(500); return { id: rid('DEMO-RSV'), qty, category, status: 'RESERVED', total: qty * 250, serverTime: Date.now(), expiresAt: Date.now() + 120000, demo: true }; },
  async createOrder({ reservation, holders }) { await wait(400); return { id: rid('DEMO-ORD'), total: reservation.total, serverTime: Date.now(), demo: true,
    reservation: { ...reservation, status: 'PAYMENT_PENDING', expiresAt: Date.now() + 600000 }, holders }; },
  async submitPayment({ orderId, message, holders, total }) { await wait(600); subs[orderId] = { t: Date.now(), reject: message.trim().length < 15, holders, total }; return { status: 'PAYMENT_SUBMITTED' }; },
  async paymentStatus(orderId) { await wait(250); const s = subs[orderId]; if (!s) return { status: 'VERIFICATION_PENDING' };
    const e = Date.now() - s.t; if (e < 3000) return { status: 'PAYMENT_SUBMITTED' }; if (e < DEMO_VERIFY_MS) return { status: 'VERIFICATION_PENDING' };
    if (s.reject) return { status: 'PAYMENT_REJECTED' };
    if (!s.tickets) { s.tickets = s.holders.map(h => ({ id: 'DEMO-' + [4,4,4].map(n => [...crypto.getRandomValues(new Uint8Array(n))].map(b => 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'[b % 31]).join('')).join('-'),
      holder: h.name, phone: h.phone, category: 'ONLINE', status: 'VALID', issuedAt: new Date().toISOString(), demo: true }));
      localStorage.setItem('cxo.demo.tickets', JSON.stringify([...s.tickets, ...mine()])); }
    return { status: 'TICKET_ISSUED', tickets: s.tickets }; },
  async tickets() { await wait(350); return mine(); }
};
