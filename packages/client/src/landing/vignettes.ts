/**
 * THE SMALL STAGES — live canvas vignettes for the feature sections.
 *
 * Each one runs the game's FX grammar: seeded jagged rings, burst
 * stars, and bolt paths (copied verbatim from abilityFx.ts — importing
 * that module would drag the whole rig/armor graph into the eager
 * bundle), the family palettes from the eleven FX voices, and the
 * renderer's radial glow sprite under `lighter`. Hard edges only — no
 * blur, no shadowBlur, geometry re-renders identically from its seed.
 *
 * One shared ticker drives every vignette; each pauses off-screen.
 */
import { radialGlowSprite } from '../render/glowSprite.js';

const GLOW_STOPS: ReadonlyArray<readonly [number, number]> = [
  [0, 1],
  [0.55, 0.38],
  [1, 0],
];

// ---------------------------------------------------- abilityFx copies

/** Tiny deterministic PRNG — effects re-render identically every frame. */
function srand(seed: number): () => number {
  let a = (seed * 2654435761) >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function jaggedRingPath(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  squash: number,
  points: number,
  jag: number,
  rot: number,
  seed = 7,
): void {
  const rand = srand(seed);
  for (let i = 0; i <= points; i++) {
    const a = rot + (i / points) * Math.PI * 2;
    const rr = r * (1 + (i % 2 === 0 ? 0 : jag * (0.6 + 0.8 * rand())) * (i % 4 === 1 ? 1 : -1));
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr * squash;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function burstStarPath(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  points: number,
  rot: number,
  squash = 1,
): void {
  for (let i = 0; i <= points * 2; i++) {
    const a = rot + (i / (points * 2)) * Math.PI * 2;
    const rr = i % 2 === 0 ? rOuter : rInner;
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr * squash;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function boltPath(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  seed: number,
  jagPx: number,
): void {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const steps = Math.max(3, Math.min(9, Math.round(len / 26)));
  const rand = srand(seed);
  ctx.moveTo(x1, y1);
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const off = (rand() - 0.5) * 2 * jagPx * (1 - Math.abs(t - 0.5));
    ctx.lineTo(x1 + dx * t + nx * off, y1 + dy * t + ny * off);
  }
  ctx.lineTo(x2, y2);
}

// -------------------------------------------------- the family voices

interface Voice {
  id: string;
  name: string;
  core: string;
  mid: string;
  deep: string;
  glow: string;
  pts: number;
  jag: number;
  speed: number;
  dash?: boolean;
  star?: boolean;
  bolt?: boolean;
}

/** The FX family palettes, straight from abilityFx.ts. */
export const VOICES: Voice[] = [
  { id: 'ember', name: 'Ember', core: '#fff3d0', mid: '#ff9a44', deep: '#c43a18', glow: '255, 150, 70', pts: 10, jag: 0.5, speed: 0.5 },
  { id: 'frost', name: 'Frost', core: '#f0fbff', mid: '#8ac4e8', deep: '#3a6c94', glow: '150, 208, 240', pts: 16, jag: 0.75, speed: 0.22 },
  { id: 'storm', name: 'Storm', core: '#fffce0', mid: '#e8e06a', deep: '#8a7a2a', glow: '240, 228, 120', pts: 12, jag: 0.2, speed: 0.85, bolt: true },
  { id: 'verdant', name: 'Verdant', core: '#eaffd8', mid: '#7ac46a', deep: '#3a6a34', glow: '140, 208, 120', pts: 8, jag: 0.6, speed: 0.3 },
  { id: 'blood', name: 'Blood', core: '#ffd8d8', mid: '#c4372a', deep: '#6a1518', glow: '220, 80, 60', pts: 9, jag: 0.9, speed: 0.6 },
  { id: 'void', name: 'Void', core: '#e8e0ff', mid: '#7a68a8', deep: '#2a2244', glow: '150, 120, 220', pts: 14, jag: 0.3, speed: 0.4, dash: true },
  { id: 'radiant', name: 'Radiant', core: '#fffbe8', mid: '#ffd98a', deep: '#b8862a', glow: '255, 220, 140', pts: 12, jag: 0.12, speed: 0.35, star: true },
  { id: 'bone', name: 'Bone', core: '#fffcf0', mid: '#e2dcc8', deep: '#8a8474', glow: '220, 214, 190', pts: 7, jag: 0.35, speed: 0.26 },
  { id: 'steel', name: 'Steel', core: '#ffffff', mid: '#b8bec8', deep: '#5a6068', glow: '200, 208, 220', pts: 6, jag: 0.12, speed: 0.45 },
  { id: 'gold', name: 'Gold', core: '#fff8d8', mid: '#e8c04c', deep: '#9a7a1c', glow: '240, 200, 90', pts: 5, jag: 0.2, speed: 0.32, star: true },
  { id: 'tide', name: 'Tide', core: '#e0f8f8', mid: '#6aa0c8', deep: '#2a5a78', glow: '120, 180, 210', pts: 12, jag: 0.4, speed: 0.28 },
  { id: 'arcane', name: 'Arcane', core: '#f4ecff', mid: '#b49af0', deep: '#5a4088', glow: '190, 160, 250', pts: 14, jag: 0.25, speed: 0.5, dash: true, star: true },
  { id: 'shadow', name: 'Shadow', core: '#d8d4e8', mid: '#6a6080', deep: '#1a1626', glow: '120, 110, 160', pts: 11, jag: 0.45, speed: 0.18 },
];

// ------------------------------------------------------ shared ticker

type Painter = (t: number) => void;

const stages: Array<{ el: Element; paint: Painter; visible: boolean }> = [];
let ticking = false;
let reduced = false;

const io =
  typeof IntersectionObserver !== 'undefined'
    ? new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            const st = stages.find((s) => s.el === e.target);
            if (st) st.visible = e.isIntersecting;
          }
          ensureTick();
        },
        { rootMargin: '80px' },
      )
    : null;

function ensureTick(): void {
  if (ticking || reduced) return;
  if (!stages.some((s) => s.visible)) return;
  ticking = true;
  requestAnimationFrame(tick);
}

function tick(now: number): void {
  const anyVisible = stages.some((s) => s.visible);
  if (!anyVisible || document.hidden) {
    ticking = false;
    return;
  }
  const t = now / 1000;
  for (const s of stages) if (s.visible) s.paint(t);
  requestAnimationFrame(tick);
}

function addStage(el: Element, paint: Painter): void {
  stages.push({ el, paint, visible: false });
  io?.observe(el);
  if (reduced) paint(1.7); // one still frame, seeded geometry holds
}

/** Reduced-motion mode: every stage paints once and holds. */
export function setVignettesReduced(v: boolean): void {
  reduced = v;
}

function setupCanvas(canvas: HTMLCanvasElement): {
  g: CanvasRenderingContext2D;
  w: number;
  h: number;
  clear: () => void;
} {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.max(40, rect.width);
  const h = Math.max(40, rect.height);
  canvas.width = Math.ceil(w * dpr);
  canvas.height = Math.ceil(h * dpr);
  const g = canvas.getContext('2d')!;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  // Clear the FULL backing store: a fractional CSS-px sliver left
  // uncleared would accumulate `lighter` glow into a bright seam.
  const clear = (): void => {
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, canvas.width, canvas.height);
    g.restore();
  };
  return { g, w, h, clear };
}

// ---------------------------------------------------------- the chips

/** One school's sigil: a seeded ring turning on the ground plane. */
export function initSchoolChip(canvas: HTMLCanvasElement, voiceId: string): void {
  const v = VOICES.find((x) => x.id === voiceId) ?? VOICES[0]!;
  const { g, w, h, clear } = setupCanvas(canvas);
  const cx = w / 2;
  const cy = h / 2 + h * 0.04;
  const R = Math.min(w, h) * 0.32;
  const seed = 7 + v.pts;
  const sprite = radialGlowSprite(v.glow, GLOW_STOPS, 0.08);

  addStage(canvas, (t) => {
    clear();
    const rot = t * v.speed;
    // The heart glow breathes under everything.
    const pulse = 0.55 + Math.sin(t * 1.7 + v.pts) * 0.2;
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = 0.5 * pulse;
    const gr = R * 1.5;
    g.drawImage(sprite, cx - gr, cy - gr, gr * 2, gr * 2);
    g.restore();
    // Deep ring counter-turns beneath the bright one.
    g.strokeStyle = v.deep;
    g.lineWidth = Math.max(1.5, R * 0.09);
    g.globalAlpha = 0.85;
    g.beginPath();
    jaggedRingPath(g, cx, cy, R * 0.6, 0.68, Math.max(8, v.pts - 2), v.jag * 0.4, -rot * 0.7, seed + 3);
    g.stroke();
    // The bright rim.
    g.strokeStyle = v.mid;
    g.lineWidth = Math.max(1.5, R * 0.11);
    g.globalAlpha = 1;
    if (v.dash) g.setLineDash([R * 0.3, R * 0.22]);
    g.beginPath();
    jaggedRingPath(g, cx, cy, R, 0.68, Math.max(10, v.pts), v.jag * 0.7, rot, seed);
    g.stroke();
    g.setLineDash([]);
    // Motifs: the star heart, the crossing bolt.
    if (v.star) {
      g.fillStyle = v.core;
      g.globalAlpha = 0.85 + 0.15 * Math.sin(t * 3.1);
      g.beginPath();
      burstStarPath(g, cx, cy - R * 0.12, R * 0.34, R * 0.13, 4, rot * 0.6, 1);
      g.fill();
    }
    if (v.bolt) {
      const flash = (t * 0.8 + 0.3) % 1 < 0.14;
      if (flash) {
        g.strokeStyle = v.core;
        g.lineWidth = Math.max(1.2, R * 0.06);
        g.beginPath();
        boltPath(g, cx - R * 0.9, cy - R * 0.55, cx + R * 0.85, cy + R * 0.5, ((t * 3) | 0) * 17 + 5, R * 0.3);
        g.stroke();
      }
    }
    g.globalAlpha = 1;
  });
}

// ------------------------------------------------------- the riftgate

/**
 * THE RIFTGATE — keys turn, places answer. A rift-cut key floating in
 * its arcane ring; the vignette for the Long Dark section.
 */
export function initRiftgate(canvas: HTMLCanvasElement): void {
  const { g, w, h, clear } = setupCanvas(canvas);
  const cx = w / 2;
  const cy = h * 0.58;
  const R = Math.min(w, h) * 0.4;
  const sprite = radialGlowSprite('190, 160, 250', GLOW_STOPS, 0.08);

  const drawKey = (t: number): void => {
    const bob = Math.sin(t * 0.9) * h * 0.016;
    const kx = cx;
    const ky = h * 0.42 + bob;
    const s = Math.min(w, h) * 0.0034;
    g.save();
    g.translate(kx, ky);
    g.rotate(Math.PI / 2 + Math.sin(t * 0.5) * 0.05);
    g.scale(s, s);
    // Faceted gold, one ink outline, hard offset shade — the item law.
    g.lineJoin = 'miter';
    const shaft = new Path2D(
      'M -8 -4 L 60 -4 L 60 4 L 44 4 L 44 14 L 36 14 L 36 4 L 24 4 L 24 12 L 16 12 L 16 4 L -8 4 Z',
    );
    g.fillStyle = '#8a5f1c';
    g.save();
    g.translate(2.6, 2.6);
    g.fill(shaft);
    g.restore();
    g.fillStyle = '#d9a441';
    g.fill(shaft);
    g.strokeStyle = '#241a2e';
    g.lineWidth = 2.4;
    g.stroke(shaft);
    // The bow: an open octagon with a rift-cut void.
    const bow = new Path2D();
    const br = 16;
    for (let i = 0; i <= 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      const x = -14 + Math.cos(a) * br;
      const y = Math.sin(a) * br;
      if (i === 0) bow.moveTo(x, y);
      else bow.lineTo(x, y);
    }
    bow.closePath();
    for (let i = 8; i >= 0; i--) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      const x = -14 + Math.cos(a) * br * 0.45;
      const y = Math.sin(a) * br * 0.45;
      if (i === 8) bow.moveTo(x, y);
      else bow.lineTo(x, y);
    }
    bow.closePath();
    g.fillStyle = '#8a5f1c';
    g.save();
    g.translate(2.6, 2.6);
    g.fill(bow, 'evenodd');
    g.restore();
    g.fillStyle = '#e8b64c';
    g.fill(bow, 'evenodd');
    g.strokeStyle = '#241a2e';
    g.lineWidth = 2.4;
    g.stroke(bow);
    // The hum: a lit facet along the shaft.
    g.fillStyle = '#ffe9a8';
    g.fillRect(0, -4, 40, 2.6);
    g.restore();
  };

  addStage(canvas, (t) => {
    clear();
    const pulse = 0.5 + Math.sin(t * 1.3) * 0.18;
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = 0.55 * pulse;
    const gr = R * 1.7;
    g.drawImage(sprite, cx - gr, cy - gr * 0.72, gr * 2, gr * 1.44);
    g.restore();
    // The gate's two rune rings, turning against each other on the ground.
    g.strokeStyle = '#5a4088';
    g.lineWidth = Math.max(1.5, R * 0.045);
    g.setLineDash([R * 0.11, R * 0.09]);
    g.beginPath();
    jaggedRingPath(g, cx, cy, R * 1.06, 0.42, 22, 0.07, -t * 0.16, 21);
    g.stroke();
    g.strokeStyle = '#b49af0';
    g.lineWidth = Math.max(1.5, R * 0.055);
    g.setLineDash([R * 0.08, R * 0.11]);
    g.beginPath();
    jaggedRingPath(g, cx, cy, R * 0.8, 0.42, 18, 0.1, t * 0.24, 13);
    g.stroke();
    g.setLineDash([]);
    // Sparks ride the inner rim.
    const rand = srand(((t * 1.4) | 0) * 31 + 7);
    for (let i = 0; i < 3; i++) {
      const a = rand() * Math.PI * 2;
      const rr = R * (0.76 + rand() * 0.34);
      g.fillStyle = i === 0 ? '#f4ecff' : '#b49af0';
      const sx = cx + Math.cos(a) * rr;
      const sy = cy + Math.sin(a) * rr * 0.42 - rand() * R * 0.5;
      g.fillRect(sx, sy, 2.2, 2.2);
    }
    drawKey(t);
  });
}

// -------------------------------------------------------- the crown

/** THE DREAD CROWN — the world learns to crown its foes. */
export function initCrown(canvas: HTMLCanvasElement): void {
  const { g, w, h, clear } = setupCanvas(canvas);
  const cx = w / 2;
  const cy = h * 0.6;
  const R = Math.min(w, h) * 0.4;
  const sprite = radialGlowSprite('255, 150, 70', GLOW_STOPS, 0.08);

  const drawCrown = (t: number): void => {
    const bob = Math.sin(t * 0.8 + 1) * h * 0.014;
    const s = Math.min(w, h) * 0.0042;
    g.save();
    g.translate(cx, h * 0.4 + bob);
    g.scale(s, s);
    g.lineJoin = 'miter';
    // Five points on a chamfered band; the dread is in the silhouette.
    const crown = new Path2D(
      'M -42 22 L -46 -8 L -30 8 L -20 -18 L -10 6 L 0 -26 L 10 6 L 20 -18 L 30 8 L 46 -8 L 42 22 L 34 28 L -34 28 Z',
    );
    g.fillStyle = '#8a5f1c';
    g.save();
    g.translate(3, 3);
    g.fill(crown);
    g.restore();
    g.fillStyle = '#d9a441';
    g.fill(crown);
    g.strokeStyle = '#241a2e';
    g.lineWidth = 2.6;
    g.stroke(crown);
    // The band's lit facet and rivet line.
    g.fillStyle = '#e8b64c';
    g.fillRect(-42, 22, 84, 3);
    g.fillStyle = '#ffe9a8';
    for (const px of [-28, 0, 28]) g.fillRect(px - 1.6, 24, 3.2, 3.2);
    // The gem watches. It pulses like a coal.
    const gem = 0.6 + Math.sin(t * 2.3) * 0.4;
    g.fillStyle = '#6a1518';
    g.beginPath();
    burstStarPath(g, 0, 8, 8.5, 5.5, 4, Math.PI / 4, 1);
    g.fill();
    g.fillStyle = `rgba(217, 87, 99, ${(0.45 + gem * 0.55).toFixed(3)})`;
    g.beginPath();
    burstStarPath(g, 0, 8, 5.5, 3.5, 4, Math.PI / 4, 1);
    g.fill();
    g.restore();
  };

  addStage(canvas, (t) => {
    clear();
    const flick = 0.78 + Math.sin(t * 13) * 0.14 + Math.sin(t * 29) * 0.08;
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = 0.4 * flick;
    const gr = R * 1.6;
    g.drawImage(sprite, cx - gr, cy - gr * 0.7, gr * 2, gr * 1.4);
    g.restore();
    // The dread presence: an ember ring smolders on the ground.
    g.strokeStyle = '#c43a18';
    g.lineWidth = Math.max(1.5, R * 0.05);
    g.beginPath();
    jaggedRingPath(g, cx, cy + h * 0.06, R * 0.78, 0.4, 16, 0.22, t * 0.2, 9);
    g.stroke();
    g.strokeStyle = '#ff9a44';
    g.lineWidth = Math.max(1.2, R * 0.035);
    g.globalAlpha = 0.6 + 0.3 * Math.sin(t * 5);
    g.beginPath();
    jaggedRingPath(g, cx, cy + h * 0.06, R * 0.62, 0.4, 14, 0.26, -t * 0.3, 5);
    g.stroke();
    g.globalAlpha = 1;
    // Embers climb out of the ring and give up.
    const rand = srand(17);
    for (let i = 0; i < 7; i++) {
      const ph = (t * (0.3 + rand() * 0.25) + rand()) % 1;
      const ex = cx + (rand() - 0.5) * R * 1.7;
      const ey = cy + (rand() - 0.5) * R * 0.5 - ph * h * 0.42;
      g.fillStyle = `rgba(255, 190, 110, ${((1 - ph) * 0.75).toFixed(3)})`;
      g.fillRect(ex + Math.sin(t * 2 + i) * 4, ey, 2.4, 2.4);
    }
    drawCrown(t);
  });
}
