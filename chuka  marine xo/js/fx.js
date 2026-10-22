// Visual effects: hero intro, embers, parallax, reveals, 3D ticket (CSS 3D, light enough for budget Android).
const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;
if (reduce) document.documentElement.classList.add('reduce');
export function intro(root) {
  if (reduce || !window.gsap) return;
  const g = gsap; g.registerPlugin(ScrollTrigger);
  g.timeline({ defaults: { ease: 'power3.out' } })
    .from('.hero-bg img', { opacity: 0, scale: 1.5, duration: 1.4 })
    .from('.beam', { opacity: 0, duration: 1 }, .2)
    .from('.hero-title i', { yPercent: 110, duration: .8, stagger: .15 }, .5)
    .from('.hero .live,.tag,.meta,.cd,.price-strip', { y: 24, opacity: 0, stagger: .1, duration: .6 }, 1)
    .from('.hero .btn', { y: 24, opacity: 0, duration: .5 }, 1.5);
  root.querySelectorAll('.rv').forEach(el => { g.set(el, { opacity: 0, y: 28 }); g.to(el, { opacity: 1, y: 0, duration: .7, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 88%' } }); });
  g.utils.toArray('.ch > img,.ch .ph img,.spon img').forEach(i => g.fromTo(i, { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: i.parentElement, scrub: true } }));
  g.utils.toArray('.col figure').forEach((fg, i) => g.from(fg, { y: 60, rotation: i % 2 ? 8 : -8, opacity: 0, scrollTrigger: { trigger: fg, start: 'top 90%' } }));
  g.utils.toArray('.act').forEach((a, i) => g.from(a, { rotationY: i ? 22 : 0, x: 40, opacity: 0, scrollTrigger: { trigger: a, start: 'top 92%' } }));
}
export function embers(canvas) {
  if (reduce) return () => {}; const c = canvas.getContext('2d'); let w, h, raf, on = true;
  const fit = () => { w = canvas.width = canvas.offsetWidth; h = canvas.height = canvas.offsetHeight; }; fit(); addEventListener('resize', fit);
  const P = Array.from({ length: 34 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * 2 + .6, v: Math.random() * .0012 + .0004, d: Math.random() * 2 - 1 }));
  const io = new IntersectionObserver(e => { on = e[0].isIntersecting; if (on) loop(); }); io.observe(canvas);
  function loop() { if (!on) return; c.clearRect(0, 0, w, h);
    for (const p of P) { p.y -= p.v; p.x += p.d * .0003; if (p.y < 0) { p.y = 1; p.x = Math.random(); } c.beginPath(); c.arc(p.x * w, p.y * h, p.r, 0, 7); c.fillStyle = `rgba(255,${60 + p.r * 40|0},70,${.25 + p.y * .6})`; c.fill(); }
    raf = requestAnimationFrame(loop); } loop();
  return () => { on = false; cancelAnimationFrame(raf); io.disconnect(); removeEventListener('resize', fit); };
}
export function parallax(hero) {
  const img = hero.querySelector('.hero-bg'); if (reduce) return () => {};
  const f = () => { img.style.transform = `translate3d(0,${Math.min(scrollY, 600) * .25}px,0)`; }; addEventListener('scroll', f, { passive: true }); return () => removeEventListener('scroll', f);
}
export function ticket3d(stage) {
  const t = stage.querySelector('.t3d'); let ry = 12, rx = -8, drag = false, lx = 0, vis = true, raf, mx = 0, my = 0, time = 0;
  const down = e => { drag = true; lx = e.clientX; stage.setPointerCapture(e.pointerId); stage.style.cursor = 'grabbing'; };
  const move = e => { if (drag) { ry += (e.clientX - lx) * .6; lx = e.clientX; } else if (e.pointerType === 'mouse') { const r = stage.getBoundingClientRect(); mx = (e.clientX - r.left) / r.width - .5; my = (e.clientY - r.top) / r.height - .5; } };
  const up = () => { drag = false; stage.style.cursor = 'grab'; };
  stage.addEventListener('pointerdown', down); stage.addEventListener('pointermove', move); stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);
  const io = new IntersectionObserver(e => { vis = e[0].isIntersecting; if (vis) tick(); }); io.observe(stage);
  function tick() { if (!vis) return; time += .012;
    if (!drag) { ry += (Math.sin(time * .7) * 28 + 8 + mx * 30 - ry) * .04; rx += (-8 + Math.cos(time) * 5 - my * 20 - rx) * .06; }
    t.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg) translateY(${Math.sin(time * 1.3) * 8}px)`; raf = requestAnimationFrame(tick); }
  if (reduce) { t.style.transform = 'rotateX(-8deg) rotateY(14deg)'; return () => {}; } tick();
  return () => { vis = false; cancelAnimationFrame(raf); io.disconnect(); };
}
