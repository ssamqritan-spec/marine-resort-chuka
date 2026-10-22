// Central configuration. Event facts are configurable; nothing here is authoritative for payments.
export const CONFIG = {
  API_BASE: 'https://chrome-xo-api.onrender.com', // Rust API on Render
  MOCK: /^(localhost|127\.0\.0\.1|)$/.test(location.hostname) || /[?&]demo\b/.test(location.search), // DEMO only: local files, localhost or ?demo. Hosted sites use the real API.
  TIMEOUT: 12000,
  EVENT: { id: 'evt_khaligraph_chuka', name: 'CHROME XO', artist: 'KHALIGRAPH JONES', venue: 'Marine Park Resort, Chuka',
    startsAt: '2026-10-24T00:00:00+03:00', dateLabel: 'SAT 24 OCT 2026', gatesOpen: null },
  PRICES: { online: 250, gate: 300 },
  PAY: { number: '+254732532860', method: 'M-PESA SEND MONEY' },
  MAX_QTY: 10, ISSUER: 'OMOLLO'
};
