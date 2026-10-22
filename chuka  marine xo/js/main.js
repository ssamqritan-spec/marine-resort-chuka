import { views } from './ui.js';
const app = document.getElementById('app'), hdr = document.getElementById('hdr'), menu = document.getElementById('menu'), burger = document.getElementById('burger');
let clean = null;
const setMenu = o => { menu.classList.toggle('open', o); burger.setAttribute('aria-expanded', o); document.body.style.overflow = o ? 'hidden' : ''; };
burger.onclick = () => setMenu(true); document.getElementById('mx').onclick = () => setMenu(false); menu.onclick = e => e.target.closest('a') && setMenu(false);
addEventListener('keydown', e => e.key === 'Escape' && setMenu(false));
addEventListener('scroll', () => hdr.classList.toggle('on', scrollY > 30), { passive: true });
async function route() {
  clean?.(); clean = null; const key = (location.hash.slice(2) || 'home').split('?')[0], anchor = ['lineup', 'experience'].includes(key) ? key : null;
  const v = views[anchor ? 'home' : key] || views.home; const redirect = v.guard?.(); if (redirect) { location.hash = redirect; return; }
  app.innerHTML = v.html(); window.scrollTo(0, 0); hdr.classList.toggle('on', false);
  if (window.gsap && !matchMedia('(prefers-reduced-motion:reduce)').matches && !['home', 'lineup', 'experience'].includes(key)) gsap.from(app.firstElementChild, { opacity: 0, y: 16, duration: .4 });
  clean = (await v.mount?.(app)) || null; if (anchor) setTimeout(() => document.getElementById(anchor)?.scrollIntoView(), 50);
  document.title = 'CHROME XO | Khaligraph Jones Live in Chuka';
}
addEventListener('hashchange', route); route();
import { CONFIG } from './config.js';
addEventListener('error', () => { if (!app.firstElementChild) app.innerHTML = '<div class="co"><div class="wrap center"><h1>Something went wrong</h1><p class="sub">Please refresh the page.</p></div></div>'; });
if ('serviceWorker' in navigator && location.protocol === 'https:') addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
