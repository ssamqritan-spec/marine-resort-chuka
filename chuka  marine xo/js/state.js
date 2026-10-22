// Checkout state machine. Invalid transitions throw. The browser never reaches TICKET_READY without API confirmation.
const FLOW = { BROWSING:['SELECTING_TICKETS'], SELECTING_TICKETS:['RESERVING','BROWSING'], RESERVING:['RESERVED','SELECTING_TICKETS'],
  RESERVED:['ENTERING_CUSTOMER_DETAILS','RESERVATION_EXPIRED','SELECTING_TICKETS'],
  ENTERING_CUSTOMER_DETAILS:['AWAITING_PAYMENT','RESERVATION_EXPIRED','SELECTING_TICKETS'],
  AWAITING_PAYMENT:['PAYMENT_SUBMITTED','RESERVATION_EXPIRED','ENTERING_CUSTOMER_DETAILS'],
  PAYMENT_SUBMITTED:['VERIFYING_PAYMENT'], VERIFYING_PAYMENT:['PAYMENT_VERIFIED','PAYMENT_FAILED','MANUAL_REVIEW'],
  MANUAL_REVIEW:['PAYMENT_VERIFIED','PAYMENT_FAILED'], PAYMENT_VERIFIED:['ISSUING_TICKET'], ISSUING_TICKET:['TICKET_READY'],
  PAYMENT_FAILED:['AWAITING_PAYMENT','SELECTING_TICKETS'], RESERVATION_EXPIRED:['SELECTING_TICKETS'], TICKET_READY:['BROWSING','SELECTING_TICKETS'] };
const KEY = 'cxo.session';
const fresh = () => ({ st:'BROWSING', qty:1, res:null, order:null, buyer:{name:'',phone:''}, holders:[], offset:0, submittedAt:null });
export let S = Object.assign(fresh(), JSON.parse(sessionStorage.getItem(KEY) || '{}')); // never holds the M-Pesa message
export const save = () => sessionStorage.setItem(KEY, JSON.stringify(S));
export function go(to) { if (S.st === to) return; if (!FLOW[S.st]?.includes(to)) throw new Error(`Invalid transition ${S.st} -> ${to}`); S.st = to; save(); }
export function reset() { Object.assign(S, fresh()); save(); }
