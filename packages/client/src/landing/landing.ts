/**
 * THE FRONT DOOR — boot for arx.gg's landing page.
 *
 * Order of operations is the whole performance story: styles and the
 * light systems (meadow, fire, sky) come up on first paint; the heavy
 * painters (rig, trees) arrive through scene.ts's dynamic import; the
 * small stages only tick while on screen. Scroll work is transform-only
 * and runs through one rAF gate. prefers-reduced-motion stands
 * everything down to authored stills.
 */
import './landing.css';
import { createScene } from './scene.js';
import { VOICES, initCrown, initRiftgate, initSchoolChip, setVignettesReduced } from './vignettes.js';

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
setVignettesReduced(reduced);

// ------------------------------------------------------------ the hero
const heroCanvas = document.getElementById('hero-canvas') as HTMLCanvasElement;
const clockEl = document.getElementById('scene-clock');
const scene = createScene(heroCanvas, {
  reduced,
  onClock: (label) => {
    if (clockEl) clockEl.textContent = label;
  },
});

// The sim only runs while the hero is actually on screen.
const hero = document.querySelector('.hero')!;
const heroIo = new IntersectionObserver(
  (entries) => {
    for (const e of entries) scene.setRunning(e.isIntersecting && !document.hidden);
  },
  { rootMargin: '60px' },
);
heroIo.observe(hero);
document.addEventListener('visibilitychange', () => {
  scene.setRunning(!document.hidden && heroOnScreen());
});
function heroOnScreen(): boolean {
  const r = hero.getBoundingClientRect();
  return r.bottom > -60 && r.top < window.innerHeight + 60;
}

// ----------------------------------------------------------- the ledger
// The walking strip loops on translateX(-50%), which needs the run of
// figures doubled; skip the duplication when the strip stands still.
const ledgerLine = document.getElementById('ledger-line');
if (ledgerLine && !reduced) ledgerLine.innerHTML += ledgerLine.innerHTML;

// ------------------------------------------------------ the small stages
const grid = document.getElementById('school-grid');
if (grid) {
  for (const v of VOICES) {
    const cell = document.createElement('div');
    cell.className = 'school';
    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    const name = document.createElement('span');
    name.className = 'school-name';
    name.textContent = v.name;
    cell.append(canvas, name);
    grid.append(cell);
    // Defer until the grid has laid out so the canvas has a size.
    requestAnimationFrame(() => initSchoolChip(canvas, v.id));
  }
}
const riftgateCanvas = document.getElementById('riftgate-canvas') as HTMLCanvasElement | null;
if (riftgateCanvas) requestAnimationFrame(() => initRiftgate(riftgateCanvas));
const crownCanvas = document.getElementById('crown-canvas') as HTMLCanvasElement | null;
if (crownCanvas) requestAnimationFrame(() => initCrown(crownCanvas));

// ------------------------------------------------------------- reveals
const revealIo = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.classList.add('is-in');
        revealIo.unobserve(e.target);
      }
    }
  },
  { threshold: 0.18, rootMargin: '0px 0px -40px' },
);
for (const el of document.querySelectorAll('.reveal, .town')) revealIo.observe(el);

// ------------------------------------------------------- scroll effects
// One rAF gate for everything scroll-driven: the nav's solid state,
// the hero parallax, and the road rail drawing itself on.
const nav = document.getElementById('nav');
const heroStage = document.getElementById('hero-stage');
const heroContent = document.getElementById('hero-content');
const roadMap = document.getElementById('road-map');
const railFill = document.getElementById('road-rail-fill');
let scrollQueued = false;

function onScroll(): void {
  scrollQueued = false;
  const y = window.scrollY;
  nav?.classList.toggle('is-solid', y > 40);
  if (!reduced) {
    if (heroStage) heroStage.style.transform = `translateY(${(y * 0.32).toFixed(1)}px)`;
    if (heroContent) {
      const vh = window.innerHeight;
      const k = Math.min(1, y / (vh * 0.9));
      heroContent.style.transform = `translateY(${(y * 0.14).toFixed(1)}px)`;
      heroContent.style.opacity = `${(1 - k * 0.9).toFixed(3)}`;
    }
  }
  if (roadMap && railFill) {
    const r = roadMap.getBoundingClientRect();
    const vh = window.innerHeight;
    const p = Math.min(1, Math.max(0, (vh * 0.78 - r.top) / (r.height + vh * 0.2)));
    railFill.style.height = `${(p * 100).toFixed(2)}%`;
  }
}

window.addEventListener(
  'scroll',
  () => {
    if (!scrollQueued) {
      scrollQueued = true;
      requestAnimationFrame(onScroll);
    }
  },
  { passive: true },
);
onScroll();

// -------------------------------------------------------- the departure
// The last stretch of road: a night field of embers rising past the
// button. One tiny bespoke painter — motes and the fire palette,
// nothing heavier.
const depart = document.getElementById('depart-canvas') as HTMLCanvasElement | null;
if (depart) {
  const ctx = depart.getContext('2d')!;
  interface Mote {
    x: number;
    y: number;
    vy: number;
    drift: number;
    phase: number;
    size: number;
    warm: boolean;
  }
  let motes: Mote[] = [];
  let w = 0;
  let h = 0;
  let dpr = 1;
  let running = false;
  let raf = 0;

  const resize = (): void => {
    const rect = depart.getBoundingClientRect();
    if (!rect.width) return;
    w = rect.width;
    h = rect.height;
    dpr = Math.min(window.devicePixelRatio || 1, 1.6);
    depart.width = Math.ceil(w * dpr);
    depart.height = Math.ceil(h * dpr);
    const n = Math.round(Math.min(70, w / 22));
    motes = Array.from({ length: n }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vy: 9 + Math.random() * 16,
      drift: (Math.random() - 0.5) * 12,
      phase: Math.random() * Math.PI * 2,
      size: 1.6 + Math.random() * 1.8,
      warm: Math.random() < 0.7,
    }));
    if (reduced) paint(1200);
  };

  const paint = (now: number): void => {
    const t = now / 1000;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    // The night ground: the moonlit ambient over ink, banded down the
    // frame in flat steps — facets, never a fade.
    ctx.fillStyle = '#12100e';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(98, 112, 160, 0.09)';
    ctx.fillRect(0, 0, w, h * 0.3);
    ctx.fillStyle = 'rgba(98, 112, 160, 0.045)';
    ctx.fillRect(0, h * 0.3, w, h * 0.26);
    for (const m of motes) {
      const y = ((m.y - t * m.vy) % (h + 40) + (h + 40)) % (h + 40) - 20;
      const x = m.x + Math.sin(t * 0.7 + m.phase) * m.drift;
      const flick = 0.45 + 0.55 * Math.abs(Math.sin(t * 2.1 + m.phase));
      const fade = Math.min(1, (y / h) * 2.2);
      ctx.fillStyle = m.warm
        ? `rgba(255, 190, 110, ${(flick * fade * 0.8).toFixed(3)})`
        : `rgba(216, 232, 160, ${(flick * fade * 0.5).toFixed(3)})`;
      ctx.fillRect(x, y, m.size, m.size);
    }
  };

  const loop = (now: number): void => {
    if (!running) return;
    raf = requestAnimationFrame(loop);
    paint(now);
  };

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (reduced) continue;
        if (e.isIntersecting && !running) {
          running = true;
          raf = requestAnimationFrame(loop);
        } else if (!e.isIntersecting && running) {
          running = false;
          cancelAnimationFrame(raf);
        }
      }
    },
    { rootMargin: '80px' },
  );
  io.observe(depart);
  new ResizeObserver(resize).observe(depart);
  resize();
}
