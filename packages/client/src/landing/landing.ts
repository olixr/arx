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
import { loadReels, montage, reelVideo, type ReelEntry } from './reels.js';
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

// The sim only runs while the LIVE band is actually on screen — the
// canvas moved out of the hero when the reels took it, and a scene
// simulating a meadow nobody is looking at is pure heat.
const hero = document.querySelector('.live') ?? document.querySelector('.hero')!;
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


// ═══════════════════════════════════════════════════════ THE REELS
//
// Everything recorded on this page hangs off one manifest written by
// the capture lane (packages/tools/src/reel). The page asks for it once
// and then wires four kinds of surface: the hero montage, the
// full-bleed bands, the reels inside feature rows, and the road-picker.
//
// If the manifest is missing — a fresh checkout that has not shot any
// reels yet — every one of these quietly does nothing and the page
// stands on its copy and its live canvas. The front door must never
// depend on a build artefact to be a front door.

/**
 * THE ROADS. Each card is a real way to spend a hundred hours, and each
 * one is answered by a reel of somebody actually spending them.
 */
const ROADS: Array<{ reel: string; name: string; line: string }> = [
  {
    reel: 'the-cut',
    name: 'The Blade',
    line: 'Meet the thing on the road with steel. Every swing is a real body swinging.',
  },
  {
    reel: 'the-arts',
    name: 'The Adept',
    line: 'Three hundred and nine arts, and two skills the game never admits exist.',
  },
  {
    reel: 'the-crown',
    name: 'The Crown-hunter',
    line: 'Eight crowned foes hold ground out there. Read the wind-up or wear it.',
  },
  {
    reel: 'the-long-dark',
    name: 'The Delver',
    line: 'Cut a dungeon out of a key. The same key always opens the same halls.',
  },
  {
    reel: 'the-tended-earth',
    name: 'The Steader',
    line: 'Twenty-three crops, a barn full of opinions, and walls that outlast you.',
  },
  {
    reel: 'the-wild-at-heel',
    name: 'The Beastcrafter',
    line: 'Sixteen species will walk beside you once your beastcraft earns them.',
  },
  {
    reel: 'the-road',
    name: 'The Wanderer',
    line: 'Ride north until the gazetteer runs out of words. It does not end there.',
  },
];

void (async () => {
  const reels = await loadReels();
  if (!reels.size) return;
  const pick = (id: string): ReelEntry | undefined => reels.get(id);

  // ------------------------------------------------------- the cold open
  const stage = document.getElementById('hero-stage');
  const heroCut = [...reels.values()].filter((r) => r.hero);
  if (stage && heroCut.length) {
    montage(stage, heroCut, {
      caption: document.getElementById('hero-caption'),
      ticks: document.getElementById('hero-ticks'),
    });
  }

  // ---------------------------------------------------------- the bands
  for (const [nodeId, reelId] of [
    ['crown-stage', 'the-crown'],
    ['arts-stage', 'the-arts'],
    ['depart-stage', 'the-night'],
  ] as const) {
    const host = document.getElementById(nodeId);
    const entry = pick(reelId);
    if (host && entry) host.appendChild(reelVideo(entry, { loop: true, full: true }));
  }

  // ------------------------------------------- reels inside feature rows
  for (const well of document.querySelectorAll<HTMLElement>('[data-reel]')) {
    const entry = pick(well.dataset.reel ?? '');
    if (!entry) continue;
    well.appendChild(reelVideo(entry, { loop: true }));
    const cap = document.querySelector<HTMLElement>(
      `[data-reel-cap="${CSS.escape(entry.id)}"]`,
    );
    if (cap) cap.textContent = entry.caption;
  }

  // ------------------------------------------------------- choose a road
  const list = document.getElementById('paths-list');
  const screen = document.getElementById('paths-screen');
  const cap = document.getElementById('paths-cap');
  const roads = ROADS.filter((r) => reels.has(r.reel));
  if (list && screen && roads.length) {
    let current = -1;
    const cards: HTMLButtonElement[] = [];

    const choose = (i: number): void => {
      if (i === current) return;
      current = i;
      const road = roads[i]!;
      const entry = reels.get(road.reel)!;
      cards.forEach((c, n) => {
        c.setAttribute('aria-selected', String(n === i));
        c.tabIndex = n === i ? 0 : -1;
      });
      screen.replaceChildren(reelVideo(entry, { loop: true }));
      if (cap) cap.textContent = entry.caption;
    };

    roads.forEach((road, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'path-card chamfer';
      b.role = 'tab';
      b.setAttribute('aria-selected', 'false');
      b.tabIndex = -1;
      const name = document.createElement('span');
      name.className = 'path-name';
      name.textContent = road.name;
      const line = document.createElement('span');
      line.className = 'path-line';
      line.textContent = road.line;
      b.append(name, line);
      // Hover previews, click commits, arrows walk the list — the same
      // three doors every other control in this game offers.
      b.addEventListener('mouseenter', () => choose(i));
      b.addEventListener('focus', () => choose(i));
      b.addEventListener('click', () => choose(i));
      b.addEventListener('keydown', (e) => {
        const step = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
        if (!step) return;
        e.preventDefault();
        const next = (i + step + roads.length) % roads.length;
        cards[next]!.focus();
      });
      list.appendChild(b);
      cards.push(b);
    });
    choose(0);
  }
})();


// ═════════════════════════════════════════════════════════ THE SCORE
//
// The game has eighteen tracks. The front door offers one — never
// automatically, never louder than the room, and always with a way out.
// A page that makes noise at a stranger has already lost them, so this
// only ever starts on a click, and the fade is long enough that turning
// it on does not feel like an accident.
{
  const btn = document.getElementById('score-btn') as HTMLButtonElement | null;
  const label = btn?.querySelector('.score-label');
  let audio: HTMLAudioElement | null = null;
  let fade = 0;
  const PEAK = 0.34;

  const ramp = (to: number, done?: () => void): void => {
    window.clearInterval(fade);
    fade = window.setInterval(() => {
      if (!audio) return;
      const step = to > audio.volume ? 0.02 : -0.02;
      audio.volume = Math.min(1, Math.max(0, audio.volume + step));
      if (Math.abs(audio.volume - to) < 0.021) {
        audio.volume = to;
        window.clearInterval(fade);
        done?.();
      }
    }, 40);
  };

  btn?.addEventListener('click', () => {
    const on = btn.getAttribute('aria-pressed') === 'true';
    if (on) {
      btn.setAttribute('aria-pressed', 'false');
      if (label) label.textContent = 'Score off';
      ramp(0, () => audio?.pause());
      return;
    }
    if (!audio) {
      audio = new Audio('/music/adventure_1.mp3');
      audio.loop = true;
      audio.volume = 0;
      audio.preload = 'auto';
    }
    btn.setAttribute('aria-pressed', 'true');
    if (label) label.textContent = 'Score on';
    void audio.play().catch(() => {
      btn.setAttribute('aria-pressed', 'false');
      if (label) label.textContent = 'Score off';
    });
    ramp(PEAK);
  });

  // Leaving the tab takes the music with you.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) audio?.pause();
    else if (btn?.getAttribute('aria-pressed') === 'true') void audio?.play().catch(() => {});
  });
}
