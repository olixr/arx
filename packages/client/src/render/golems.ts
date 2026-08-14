/**
 * THE CONSTRUCT DIALECT — the golems (docs/golems-plan.md).
 *
 * The fourth humanoid dialect beside bone, scale, and fur: the IK rig,
 * carriage, and facing bands keep working untouched while head, torso,
 * limbs, and feet swap wholesale per BUILD. Four builds, four
 * constructions — never one painter in four palettes:
 *
 *   rock — a dry-stacked cairn: mismatched boulders, moss saddles,
 *          asymmetry as the design. It settles like a rockslide.
 *   iron — forged plate: riveted seams, brass strapping, the furnace
 *          slit visor. Armor with nobody inside; piston precision.
 *   fire — black basalt crust over a molten core: the light comes from
 *          INSIDE, through a crack network that gapes as it angers.
 *   ice  — faceted glacial slabs: hard straight seams, hoar collars,
 *          and a dark old heart frozen visible in the chest.
 *
 * Laws honored here:
 * - THE FLAT FORGE LAW: depth is flat value planes, never stroked
 *   contour lines. Seams are darker PLANES; edges are lit PLANES.
 * - THE TOP-PLANE LAW: every big mass shows a foreshortened lit crown
 *   (the crate-lid treatment) — the camera is a tilted bird's eye.
 * - NO FACE FROM BEHIND: every head paints an honest occiput past
 *   backK 0.55.
 * - Hurt flash: fills go '#ffffff', detail passes skip, silhouette
 *   stays clean.
 * - Outline-dilate safety: no deliberate silhouette gap anywhere —
 *   cracks and glow live INSIDE the masses, so the ring never bridges.
 * - Determinism: every seed-driven layout hashes the spawn seed; no
 *   per-frame randomness. Micro-motion is analytic off nowMs.
 */
import { chamferRect } from './shapes.js';
import { shade } from './rig.js';

export type GolemBuild = 'rock' | 'iron' | 'fire' | 'ice';

export interface GolemLook {
  build: GolemBuild;
  /** The main mass. */
  shell: string;
  /** Seam / shadow planes. */
  deep: string;
  /** Lit crown planes — the top the camera owns. */
  lit: string;
  /** Undersides, gaps between stones, the ice heart. */
  under: string;
  /** The one accent: moss, brass, slag, hoar. */
  accent: string;
  /** Inner light (iron visor, fire seams, ice sheen). */
  glow: string;
  /** Frame multiplier: shoulder mass, slab girth, fist size. */
  heavy: number;
  /** Spawn seed — drives stone layout, crack runs, facet tilts. */
  seed?: number;
}

export const GOLEM_LOOKS: Record<string, GolemLook> = {
  rock_golem: {
    build: 'rock',
    shell: '#87816e', deep: '#4e463c', lit: '#b0a88e', under: '#3a352c',
    accent: '#6a7d46', glow: '#b0a88e', heavy: 1,
  },
  iron_golem: {
    // THE LODESTONE: raw ore browns with a metallic pale, copper for
    // the one warmth, and the spark-pale glow of struck iron — the
    // forged greys and furnace orange died with the robot.
    build: 'iron',
    shell: '#6f665e', deep: '#3a322a', lit: '#a89a86', under: '#26201a',
    accent: '#b8703f', glow: '#dfe6ee', heavy: 1.05,
  },
  fire_golem: {
    build: 'fire',
    shell: '#3a2c26', deep: '#241a16', lit: '#5c453a', under: '#1a120e',
    accent: '#d84c1e', glow: '#ff9a44', heavy: 1,
  },
  ice_golem: {
    build: 'ice',
    shell: '#9ec8dc', deep: '#5a8aa8', lit: '#d8f2ff', under: '#2e4a60',
    accent: '#f0fbff', glow: '#e8faff', heavy: 1.1,
  },
  anvil_golem: {
    // THE ANVILHEART (the dread crown): the iron build gone DEEP-
    // MINE — coal-dark ore mass, seams of raw silver where the picks
    // opened it, and iron at forging heat standing in the visor and
    // the chest gaps. The lodestone's copper warmth is traded for
    // the mine's pale silver: the crown wears what the miners came
    // for. Broadest iron frame in the ground.
    build: 'iron',
    shell: '#4a443e', deep: '#26211c', lit: '#8a8178', under: '#17130f',
    accent: '#c8ccd4', glow: '#ffb44a', heavy: 1.18,
  },
};

/**
 * THE STONE CLUSTERS — four curated hillstone colorways for the
 * rank-and-file rock golem, picked by spawn seed (hash-spread so
 * neighboring spawns scatter across the quarries — the gnoll coat
 * law). The other three builds are DESIGNS: their seed varies layout
 * (which stones, where the cracks run, how the facets shear), never
 * the palette.
 */
const ROCK_CLUSTERS: ReadonlyArray<
  Pick<GolemLook, 'shell' | 'deep' | 'lit' | 'under' | 'accent'>
> = [
  { shell: '#87816e', deep: '#4e463c', lit: '#b0a88e', under: '#3a352c', accent: '#6a7d46' }, // grey tor
  { shell: '#8d7a5f', deep: '#52432f', lit: '#b49e78', under: '#3d3325', accent: '#75804a' }, // gritstone
  { shell: '#7d8065', deep: '#454a38', lit: '#a3a882', under: '#33382a', accent: '#5d7d42' }, // mossgrown
  { shell: '#96705a', deep: '#54382c', lit: '#bf9376', under: '#402a20', accent: '#7d7548' }, // red scree
];

const GOLEM_LOOK_CACHE = new Map<string, GolemLook>();

export function golemLook(defId: string, seed = 0): GolemLook {
  const base = GOLEM_LOOKS[defId] ?? GOLEM_LOOKS['rock_golem']!;
  const key = `${defId}|${seed & 0xff}`;
  const hit = GOLEM_LOOK_CACHE.get(key);
  if (hit) return hit;
  let look: GolemLook;
  if (base.build === 'rock') {
    // Hash before picking — consecutive spawn eids must scatter.
    const h = (seed * 2654435761) | 0;
    const cl = ROCK_CLUSTERS[(h >>> 8) & 3]!;
    const jit = (((h >>> 12) & 7) - 3) * 2;
    look = {
      ...base,
      shell: shade(cl.shell, jit),
      deep: cl.deep,
      lit: shade(cl.lit, jit),
      under: cl.under,
      accent: cl.accent,
      glow: shade(cl.lit, jit),
      seed,
    };
  } else {
    look = { ...base, seed };
  }
  GOLEM_LOOK_CACHE.set(key, look);
  return look;
}

/** Small deterministic stream off the spawn seed — layout, never time. */
function hash(seed: number, salt: number): number {
  let h = (seed ^ (salt * 0x9e3779b9)) | 0;
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return ((h ^= h >>> 16) >>> 0) / 4294967296;
}

// ---------------------------------------------------------------- body

export interface GolemBodyFrame {
  s: number;
  tw: number;
  ww: number;
  th: number;
  fx: number;
  fy: number;
  profileK: number;
  backK: number;
  lead: number;
  hurt: boolean;
  nowMs: number;
  runF: number;
  /** 0..1 menace ramp — Cast/Attack wind. Fire gapes, iron hisses. */
  flare: number;
}

/**
 * One stone of the cairn: a chamfered mass with its lit crown plane
 * and shaded cheek — THE FORM SPLIT restated for masonry. All four
 * builds' masses route through here so the value grammar stays one.
 */
function stoneMass(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  cut: number,
  shell: string,
  lit: string,
  deep: string,
  hurt: boolean,
  crownK = 0.24,
): void {
  ctx.fillStyle = hurt ? '#ffffff' : shell;
  ctx.beginPath();
  chamferRect(ctx, x - w, y - h, w * 2, h * 2, cut);
  ctx.fill();
  if (hurt) return;
  ctx.save();
  ctx.beginPath();
  chamferRect(ctx, x - w, y - h, w * 2, h * 2, cut);
  ctx.clip();
  // Hard shade right half; lit crown band; under-shade at the base.
  ctx.fillStyle = deep;
  ctx.globalAlpha = 0.42;
  ctx.fillRect(x, y - h, w, h * 2);
  ctx.globalAlpha = 1;
  ctx.fillStyle = lit;
  ctx.fillRect(x - w, y - h, w * 2, h * 2 * crownK);
  ctx.fillStyle = deep;
  ctx.fillRect(x - w, y + h * 0.72, w * 2, h * 0.28);
  ctx.restore();
}

/**
 * THE BINDING'S GRAVITY — the rock golem's orbiting stones: two or
 * three small crags held circling the shoulder line by whatever force
 * stacked the cairn. Analytic orbits off nowMs (no per-frame random),
 * seed-phased so no two golems swing in step. Positions are torso-
 * local; sin(angle) picks front/behind the masses. The orbit radius
 * clears the outline ring's bridge distance at nearest approach.
 */
function rockOrbs(
  gol: GolemLook,
  f: GolemBodyFrame,
): Array<{ x: number; y: number; r: number; front: boolean }> {
  // (The hurt flash keeps them — the silhouette owns its satellites.)
  const seed = gol.seed ?? 0;
  const out: Array<{ x: number; y: number; r: number; front: boolean }> = [];
  const n = 2 + (((seed * 2654435761) >>> 10) & 1);
  for (let k = 0; k < n; k++) {
    const phase = hash(seed, 80 + k) * Math.PI * 2;
    const speed = 0.45 + 0.18 * hash(seed, 84 + k);
    const ang = phase + (f.nowMs / 1000) * speed * (k % 2 === 0 ? 1 : -1);
    out.push({
      x: Math.cos(ang) * f.tw * 1.7,
      y: -f.th * (0.82 + 0.1 * hash(seed, 88 + k)) + Math.sin(ang) * f.tw * 0.28,
      r: f.s * (0.032 + 0.02 * hash(seed, 92 + k)),
      front: Math.sin(ang) > 0,
    });
  }
  return out;
}

/** One orbiting crag: shell chip with a lit crown fleck. */
function drawOrb(
  ctx: CanvasRenderingContext2D,
  gol: GolemLook,
  o: { x: number; y: number; r: number },
  hurt: boolean,
): void {
  ctx.fillStyle = hurt ? '#ffffff' : shade(gol.shell, -4);
  ctx.beginPath();
  ctx.moveTo(o.x - o.r, o.y + o.r * 0.5);
  ctx.lineTo(o.x - o.r * 0.7, o.y - o.r * 0.8);
  ctx.lineTo(o.x + o.r * 0.6, o.y - o.r);
  ctx.lineTo(o.x + o.r, o.y + o.r * 0.4);
  ctx.closePath();
  ctx.fill();
  if (!hurt) {
    ctx.fillStyle = gol.lit;
    ctx.beginPath();
    ctx.moveTo(o.x - o.r * 0.7, o.y - o.r * 0.8);
    ctx.lineTo(o.x + o.r * 0.6, o.y - o.r);
    ctx.lineTo(o.x + o.r * 0.2, o.y - o.r * 0.4);
    ctx.closePath();
    ctx.fill();
  }
}

export function paintGolemBody(
  ctx: CanvasRenderingContext2D,
  gol: GolemLook,
  f: GolemBodyFrame,
): void {
  switch (gol.build) {
    case 'rock': return rockBody(ctx, gol, f);
    case 'iron': return ironBody(ctx, gol, f);
    case 'fire': return fireBody(ctx, gol, f);
    case 'ice': return iceBody(ctx, gol, f);
  }
}

/**
 * ROCK — the dry-stacked cairn. Five mismatched stones, no two alike,
 * the near shoulder boulder bigger than the far (seed picks which).
 * Every stone settles on its own beat — the rockslide read — and the
 * seams stay honest dark gaps that never breach the silhouette.
 */
function rockBody(ctx: CanvasRenderingContext2D, gol: GolemLook, f: GolemBodyFrame): void {
  const { s, tw, th, fx, hurt, nowMs, runF } = f;
  const seed = gol.seed ?? 0;
  const hv = gol.heavy;
  // The settle: each stone breathes a hair out of phase — amplitude
  // grows slightly at a walk (the grind), dies at rest to a whisper.
  const amp = s * (0.0035 + 0.004 * runF);
  const settle = (ph: number): number =>
    hurt ? 0 : Math.sin(nowMs / 860 + ph * 2.1) * amp;
  // Which side carries the bigger shoulder: the cairn is lopsided.
  const bigSide = hash(seed, 1) > 0.5 ? 1 : -1;
  // The gap color under everything: seams read as depth, not holes —
  // a soft step down from the shell, never a black vest (the first
  // sheet's lesson: a high-contrast under-box reads as CLOTHING).
  ctx.fillStyle = hurt ? '#ffffff' : shade(gol.shell, -24);
  ctx.beginPath();
  chamferRect(ctx, -tw * 0.78, -th * 0.98, tw * 1.56, th * 0.96, s * 0.05);
  ctx.fill();
  // The far half of the binding's gravity: orbiting crags swing
  // BEHIND the stack first.
  const orbs = rockOrbs(gol, f);
  for (const o of orbs) if (!o.front) drawOrb(ctx, gol, o, hurt);
  // The hip stone: squat and DEEP — it swallows the thigh roots so
  // the legs read short and planted under the mass.
  const hipOff = (hash(seed, 2) - 0.5) * tw * 0.2;
  stoneMass(ctx, hipOff, -th * 0.16 + settle(0), tw * 0.64, th * 0.3, s * 0.045,
    gol.shell, gol.lit, gol.deep, hurt);
  // The belly stone: the biggest single mass, rolled to one side.
  const bellyOff = (hash(seed, 3) - 0.5) * tw * 0.3;
  stoneMass(ctx, bellyOff, -th * 0.52 + settle(1), tw * 0.78, th * 0.26, s * 0.06,
    hurt ? '#ffffff' : shade(gol.shell, 4), gol.lit, gol.deep, hurt);
  // The chest slab: wide, chamfered hard, carrying the shoulder line.
  stoneMass(ctx, -fx * tw * 0.08, -th * 0.84 + settle(2), tw * 0.92, th * 0.2, s * 0.055,
    hurt ? '#ffffff' : shade(gol.shell, -3), gol.lit, gol.deep, hurt);
  // The shoulder boulders: past the torso edge both sides — the mass
  // that makes the silhouette a hill. Near side bigger; both crowned.
  for (const side of [-1, 1] as const) {
    const big = side === bigSide;
    const r = tw * (big ? 0.46 : 0.36) * (0.92 + 0.16 * hv);
    const bx = side * tw * (big ? 0.76 : 0.68);
    const by = -th * 0.94 + settle(side + 3) - (big ? th * 0.06 : 0);
    ctx.fillStyle = hurt ? '#ffffff' : shade(gol.shell, big ? 2 : -4);
    ctx.beginPath();
    ctx.ellipse(bx, by, r, r * 0.82, side * 0.2, 0, Math.PI * 2);
    ctx.fill();
    if (!hurt) {
      // The boulder's lit crown — the top plane, foreshortened.
      ctx.fillStyle = gol.lit;
      ctx.beginPath();
      ctx.ellipse(bx - r * 0.08, by - r * 0.4, r * 0.68, r * 0.26, side * 0.15, 0, Math.PI * 2);
      ctx.fill();
      // Underside shade seats it on the chest slab.
      ctx.fillStyle = gol.deep;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.ellipse(bx, by + r * 0.5, r * 0.8, r * 0.24, 0, 0, Math.PI);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
  // The near half of the gravity: crags crossing IN FRONT of the mass.
  for (const o of orbs) if (o.front) drawOrb(ctx, gol, o, hurt);
  if (hurt) return;
  // THE BINDING SHOWS: whatever stacked the cairn still runs in its
  // seams — thin amber energy between the stones, banked at rest,
  // waking bright through the wind of every art. Thin LINES between
  // masses, never wide gaps (the fire golem owns the gaping crack;
  // the rock golem's force is a mason's mortar).
  const bindA = 0.5 + 0.5 * f.flare + 0.06 * Math.sin(nowMs / 780);
  ctx.save();
  ctx.lineCap = 'round';
  const seams: ReadonlyArray<readonly [number, number, number, number]> = [
    [-0.5, -0.32, 0.34, -0.36],
    [-0.44, -0.68, 0.5, -0.64],
    [-0.72, -0.86, -0.52, -0.72],
    [0.55, -0.88, 0.7, -0.74],
  ];
  // The CONTRAST LAW: the pale energy rides a deep under-stroke — a
  // bare amber line vanished into the khaki stone at rest.
  for (const pass of [0, 1] as const) {
    ctx.globalAlpha = pass === 0 ? Math.min(1, bindA) * 0.6 : Math.min(1, bindA);
    ctx.strokeStyle = pass === 0 ? '#3a352c' : '#e8c878';
    ctx.lineWidth = Math.max(1, s * (pass === 0 ? 0.034 : 0.018 + 0.014 * f.flare));
    for (const [x0, y0, x1, y1] of seams) {
      ctx.beginPath();
      ctx.moveTo(tw * x0 + hipOff * 0.4, th * y0 + settle(1) * 0.5);
      ctx.lineTo(tw * x1 + bellyOff * 0.4, th * y1 + settle(2) * 0.5);
      ctx.stroke();
    }
  }
  ctx.restore();
  // Moss saddles: the accent, laid on two crowns only (a cairn old
  // enough to walk grew a garden). Seed picks which stones.
  ctx.fillStyle = gol.accent;
  const mossA = hash(seed, 5);
  ctx.beginPath();
  ctx.ellipse(bigSide * tw * 0.7, -th * 1.02, tw * 0.2, th * 0.05, bigSide * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(bellyOff - tw * 0.2 + mossA * tw * 0.3, -th * 0.66, tw * 0.16, th * 0.04, -0.1, 0, Math.PI * 2);
  ctx.fill();
  // Pebbles wedged at the seams — the stack's mortar is gravity.
  ctx.fillStyle = shade(gol.shell, -10);
  for (let i = 0; i < 3; i++) {
    const pxr = (hash(seed, 6 + i) - 0.5) * tw * 1.3;
    const pyr = -th * (0.36 + 0.34 * hash(seed, 9 + i));
    ctx.beginPath();
    ctx.arc(pxr, pyr, s * (0.018 + 0.012 * hash(seed, 12 + i)), 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * One raw ore chunk: an angular six-facet mass with a metallic glint
 * sliver, an optional rust stratum, and a shadowed under-facet — the
 * iron golem's brick, deliberately CRYSTALLINE where the rock golem's
 * boulders are rounded. Facet jitter is seeded; nothing repeats.
 */
function oreMass(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  salt: number,
  seed: number,
  shell: string,
  lit: string,
  deep: string,
  hurt: boolean,
  rust?: string,
): void {
  const j = (i: number): number => (hash(seed, salt * 7 + i) - 0.5) * 0.22;
  const pts: ReadonlyArray<[number, number]> = [
    [-1 + j(0), 0.45 + j(1)],
    [-0.9 + j(2), -0.5 + j(3)],
    [-0.25 + j(4), -1],
    [0.6 + j(5), -0.85 + j(6)],
    [1, 0.1 + j(7)],
    [0.4 + j(8), 1],
  ];
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x + pts[0]![0] * w, y + pts[0]![1] * h);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(x + pts[i]![0] * w, y + pts[i]![1] * h);
  ctx.closePath();
  ctx.fillStyle = hurt ? '#ffffff' : shell;
  ctx.fill();
  if (!hurt) {
    ctx.clip();
    // The metallic read: ONE hard glint sliver off the upper facet —
    // sharp and pale, nothing like stone's soft lit crown.
    ctx.fillStyle = lit;
    ctx.beginPath();
    ctx.moveTo(x + pts[2]![0] * w, y + pts[2]![1] * h);
    ctx.lineTo(x + pts[3]![0] * w, y + pts[3]![1] * h);
    ctx.lineTo(x + pts[3]![0] * w * 0.55, y + pts[3]![1] * h * 0.45);
    ctx.lineTo(x + pts[2]![0] * w * 0.5, y + pts[2]![1] * h * 0.55);
    ctx.closePath();
    ctx.fill();
    // The under-facet in shadow.
    ctx.fillStyle = deep;
    ctx.globalAlpha = 0.55;
    ctx.fillRect(x - w, y + h * 0.55, w * 2, h * 0.45);
    ctx.globalAlpha = 1;
    // The rust stratum: weather written across the grain.
    if (rust) {
      ctx.fillStyle = rust;
      ctx.globalAlpha = 0.75;
      ctx.fillRect(x - w, y - h * (0.15 - hash(seed, salt + 40) * 0.3), w * 2, h * 0.2);
      ctx.globalAlpha = 1;
    }
  }
  ctx.restore();
}

/**
 * IRON — THE LODESTONE. Not forged and never a machine: a magnetic
 * heart that GATHERED a body — raw ore masses held in suspension,
 * humming with a quiver no stacked stone has, wearing the iron the
 * land lost (a horseshoe, old nails, a broken pick) embedded where
 * the field caught them. One copper vein is the warm accent; the
 * light is the pale spark of struck metal at the seams, never a
 * furnace. Asymmetric by construction — the field does not care for
 * symmetry, and symmetry was what read as ROBOT.
 */
function ironBody(ctx: CanvasRenderingContext2D, gol: GolemLook, f: GolemBodyFrame): void {
  const { s, tw, th, fx, backK, hurt, nowMs, flare } = f;
  const seed = gol.seed ?? 0;
  const hv = gol.heavy;
  const rust = shade(gol.deep, 14);
  // THE MAGNETIC QUIVER: every mass hums on its own fast micro-clock
  // — the suspension read that makes this body a FIELD, not a stack.
  // The hum deepens as the field strains through a wind.
  const qa = s * (0.0025 + 0.0045 * flare);
  const qv = (i: number): number =>
    hurt ? 0 : Math.sin(nowMs / 53 + i * 2.6) * qa + Math.sin(nowMs / 730 + i * 1.7) * s * 0.002;
  // The field's dark ground — contained, stepped toward the shell.
  ctx.fillStyle = hurt ? '#ffffff' : shade(gol.shell, -22);
  ctx.beginPath();
  chamferRect(ctx, -tw * 0.74, -th * 0.96, tw * 1.48, th * 0.94, s * 0.04);
  ctx.fill();
  // Which shoulder carries the bigger ore mass — the lodestone
  // gathered more on one side and never noticed.
  const bigSide = hash(seed, 130) > 0.5 ? 1 : -1;
  // The hip mass: squat, rust-banded.
  oreMass(ctx, (hash(seed, 131) - 0.5) * tw * 0.16, -th * 0.16 + qv(0), tw * 0.6, th * 0.28,
    1, seed, shade(gol.shell, -4), gol.lit, gol.deep, hurt, rust);
  // The belly mass: rolled off-center opposite the big shoulder.
  oreMass(ctx, -bigSide * tw * 0.12, -th * 0.5 + qv(1), tw * 0.72, th * 0.26,
    2, seed, shade(gol.shell, 3), gol.lit, gol.deep, hurt);
  // The chest mass: the widest gather, carrying the shoulder line.
  oreMass(ctx, fx * tw * -0.06, -th * 0.82 + qv(2), tw * 0.88, th * 0.26,
    3, seed, gol.shell, gol.lit, gol.deep, hurt, rust);
  // The shoulder chunks: angular, unequal — crystalline against the
  // rock golem's round boulders.
  for (const side of [-1, 1] as const) {
    const big = side === bigSide;
    oreMass(ctx, side * tw * (big ? 0.74 : 0.66), -th * (big ? 0.98 : 0.92) + qv(side + 4),
      tw * (big ? 0.4 : 0.3) * (0.94 + 0.12 * hv), th * (big ? 0.22 : 0.16),
      big ? 4 : 5, seed, shade(gol.shell, big ? 5 : -6), gol.lit, gol.deep, hurt);
  }
  if (hurt) return;
  // THE COPPER VEIN: one warm native seam riding the chest mass — the
  // accent law's single warmth on an otherwise cold body.
  ctx.strokeStyle = gol.accent;
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(1, s * 0.02);
  ctx.beginPath();
  ctx.moveTo(-tw * 0.5, -th * (0.9 + hash(seed, 133) * 0.06));
  ctx.lineTo(-tw * 0.12, -th * 0.8);
  ctx.lineTo(tw * 0.1, -th * 0.88);
  ctx.lineTo(tw * 0.44, -th * 0.76);
  ctx.stroke();
  // THE GATHERED IRON: seed-picked relics the field caught — worn
  // dark, half-swallowed by the ore. Two or three per body, from the
  // land's own losses (this is why it pays ore and old plate).
  const relics = [
    () => {
      // The horseshoe, open side down, two nail holes still in it.
      const hx = bigSide * tw * 0.3;
      const hy = -th * 0.48 + qv(1);
      ctx.strokeStyle = shade(gol.shell, -30);
      ctx.lineWidth = Math.max(1.5, s * 0.028);
      ctx.beginPath();
      ctx.arc(hx, hy, tw * 0.16, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
      ctx.fillStyle = shade(gol.shell, -30);
      for (const o of [-0.6, 0.6]) {
        ctx.beginPath();
        ctx.arc(hx + Math.cos(Math.PI * 1.5 + o) * tw * 0.16, hy + Math.sin(Math.PI * 1.5 + o) * tw * 0.16, s * 0.012, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    () => {
      // Three old nails, drawn to the belly at field angles.
      ctx.strokeStyle = shade(gol.shell, -32);
      ctx.lineCap = 'butt';
      ctx.lineWidth = Math.max(1, s * 0.016);
      for (let i = 0; i < 3; i++) {
        const a = -0.5 + i * 0.5 + hash(seed, 140 + i) * 0.3;
        const nx = -bigSide * tw * 0.28 + i * tw * 0.1;
        const ny = -th * 0.52 + qv(1);
        ctx.beginPath();
        ctx.moveTo(nx, ny);
        ctx.lineTo(nx + Math.cos(a) * s * 0.07, ny + Math.sin(a) * s * 0.07);
        ctx.stroke();
      }
      ctx.lineCap = 'round';
    },
    () => {
      // The broken pick-head, jutting from the big shoulder's edge.
      const px2 = bigSide * tw * (0.92 + 0.06 * hv);
      const py2 = -th * 1.02 + qv(bigSide + 4);
      ctx.fillStyle = shade(gol.shell, -26);
      ctx.beginPath();
      ctx.moveTo(px2 - bigSide * tw * 0.14, py2 + th * 0.05);
      ctx.lineTo(px2 + bigSide * tw * 0.1, py2 - th * 0.06);
      ctx.lineTo(px2 + bigSide * tw * 0.16, py2 + th * 0.015);
      ctx.lineTo(px2 - bigSide * tw * 0.1, py2 + th * 0.1);
      ctx.closePath();
      ctx.fill();
    },
    () => {
      // A snapped blade-tip, swallowed to the fuller, on the hip.
      const bx = -bigSide * tw * 0.4;
      const by = -th * 0.12 + qv(0);
      ctx.fillStyle = shade(gol.lit, -14);
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx - bigSide * tw * 0.22, by - th * 0.1);
      ctx.lineTo(bx - bigSide * tw * 0.16, by + th * 0.005);
      ctx.closePath();
      ctx.fill();
    },
  ];
  const first = (seed >>> 3) % relics.length;
  relics[first]!();
  relics[(first + 1 + ((seed >>> 7) % (relics.length - 1))) % relics.length]!();
  // THE SEAM SPARK: pale struck-metal light living where the masses
  // nearly meet — banked ticks at rest, snapping bright through the
  // wind. Iron's light is the spark, never a furnace.
  const sparkA = 0.3 + 0.7 * flare + 0.08 * Math.sin(nowMs / 340);
  ctx.save();
  ctx.globalAlpha = Math.min(1, sparkA);
  ctx.strokeStyle = gol.glow;
  ctx.lineWidth = Math.max(1, s * 0.014);
  for (const [sx0, sy0, sx1, sy1] of [
    [-0.4, -0.66, -0.14, -0.7],
    [0.2, -0.68, 0.46, -0.63],
    [-0.3, -0.32, 0.02, -0.35],
  ] as const) {
    ctx.beginPath();
    ctx.moveTo(tw * sx0, th * sy0 + qv(1));
    ctx.lineTo(tw * sx1, th * sy1 + qv(2));
    ctx.stroke();
  }
  // The one live cross-spark when the field strains hardest.
  if (flare > 0.5 && backK < 0.6) {
    const cs = s * 0.03 * flare;
    const cx2 = tw * 0.34;
    const cy2 = -th * 0.64;
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(cx2 - cs, cy2);
    ctx.lineTo(cx2 + cs, cy2);
    ctx.moveTo(cx2, cy2 - cs);
    ctx.lineTo(cx2, cy2 + cs);
    ctx.stroke();
  }
  ctx.restore();
  // THE HELD SHRAPNEL: three small pieces hovering just off the body,
  // quivering in the field — the read that says none of this is
  // stacked; all of it is HELD. These are STATIC seeded hovers, so
  // the air gap must out-wide both outline halos combined (the
  // dilate bridges any parked near-miss into a black tether): radial
  // 1.38·tw+ and clamped BELOW the shoulder-chunk band.
  for (let i = 0; i < 3; i++) {
    const a = hash(seed, 150 + i) * Math.PI * 2;
    const hx = Math.cos(a) * tw * (1.38 + 0.1 * hash(seed, 154 + i));
    const hy = -th * (0.3 + 0.32 * hash(seed, 158 + i)) + Math.sin(nowMs / 210 + i * 2.1) * s * 0.012 + qv(i + 6) * 2;
    ctx.fillStyle = shade(gol.shell, -18);
    if (i % 2 === 0) {
      ctx.beginPath();
      ctx.moveTo(hx - s * 0.02, hy + s * 0.012);
      ctx.lineTo(hx + s * 0.006, hy - s * 0.022);
      ctx.lineTo(hx + s * 0.02, hy + s * 0.016);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillRect(hx - s * 0.019, hy - s * 0.007, s * 0.038, s * 0.014);
    }
  }
}

/**
 * THE BOUND FLAME — one licking tongue: a two-tone teardrop with a
 * white heart, leaning and breathing on its own phase clock. Every
 * flame on the fire golem routes through here so the whole body
 * burns in one dialect (deterministic — phase comes from placement,
 * time from nowMs, never from random).
 */
function flameTongue(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  h: number,
  w: number,
  phase: number,
  nowMs: number,
  accent: string,
  vigor = 1,
): void {
  const lick = Math.sin(nowMs / 92 + phase * 5.1);
  const swell = 0.82 + 0.18 * Math.sin(nowMs / 143 + phase * 3.3);
  const tall = h * swell * vigor;
  if (tall < h * 0.15) return;
  const lean = lick * w * 0.55;
  ctx.beginPath();
  ctx.fillStyle = accent;
  ctx.moveTo(x - w, y);
  ctx.quadraticCurveTo(x - w * 0.5 + lean * 0.3, y - tall * 0.55, x + lean, y - tall);
  ctx.quadraticCurveTo(x + w * 0.5 + lean * 0.3, y - tall * 0.55, x + w, y);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.fillStyle = '#fff3d0';
  ctx.moveTo(x - w * 0.42, y);
  ctx.quadraticCurveTo(x + lean * 0.5, y - tall * 0.5, x + lean * 0.6, y - tall * 0.62);
  ctx.quadraticCurveTo(x + w * 0.3, y - tall * 0.3, x + w * 0.42, y);
  ctx.closePath();
  ctx.fill();
}

/**
 * FIRE — the banked furnace. The glow layer paints FIRST, then the
 * crust plates lie over it leaving the crack network — so the light
 * honestly comes from inside, and the cracks widen with the flare
 * (the menace ramp: at rest banked coals, in the wind the seams gape
 * white). Nothing glows past the silhouette; the ring stays closed.
 */
function fireBody(ctx: CanvasRenderingContext2D, gol: GolemLook, f: GolemBodyFrame): void {
  const { s, tw, th, fx, backK, hurt, nowMs, flare } = f;
  const seed = gol.seed ?? 0;
  if (hurt) {
    stoneMass(ctx, 0, -th * 0.55, tw * 0.86, th * 0.58, s * 0.06,
      '#ffffff', '#ffffff', '#ffffff', true);
    return;
  }
  // The furnace breath: the glow pulses slowly at rest, hard and
  // bright through the flare. Analytic — one clock, no randomness.
  const breath = 0.55 + 0.15 * Math.sin(nowMs / 640) + 0.45 * flare;
  // 1) The molten interior — slightly inset from the silhouette so
  // the outline ring always lands on crust, never on light.
  ctx.fillStyle = gol.glow;
  ctx.beginPath();
  chamferRect(ctx, -tw * 0.8, -th * 1.06, tw * 1.6, th * 1.04, s * 0.08);
  ctx.fill();
  ctx.fillStyle = '#fff3d0';
  ctx.globalAlpha = breath * 0.55;
  ctx.beginPath();
  ctx.ellipse(-fx * tw * 0.1, -th * 0.55, tw * 0.42, th * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  // 2) The crust plates: five basalt masses laid over the light. The
  // gaps BETWEEN them are the crack network — seed places the plates,
  // flare shrinks them (the seams widen; the plates never move).
  const plates: ReadonlyArray<[number, number, number, number, number]> = [
    // [cx, cy(in th), half-w(in tw), half-h(in th), salt]
    [0, -0.16, 0.7, 0.21, 21],
    [-0.36, -0.52, 0.42, 0.21, 22],
    [0.4, -0.5, 0.38, 0.19, 23],
    [-0.3, -0.88, 0.46, 0.19, 24],
    [0.38, -0.9, 0.4, 0.17, 25],
  ];
  for (const [pcx, pcy, phw, phh, salt] of plates) {
    const jx = (hash(seed, salt) - 0.5) * tw * 0.08;
    // At rest the seams are banked-coal thin; the flare opens them
    // wide — the menace ramp is the crust giving the light back.
    const shrink = 1 - 0.025 - 0.085 * flare;
    const w = tw * phw * shrink;
    const h = th * phh * shrink;
    const x = tw * pcx + jx;
    const y = th * pcy;
    ctx.fillStyle = shade(gol.shell, ((hash(seed, salt + 8) * 10) | 0) - 5);
    ctx.beginPath();
    chamferRect(ctx, x - w, y - h, w * 2, h * 2, s * 0.05);
    ctx.fill();
    // Each plate's cooled crown — dim, the light is UNDER it.
    ctx.fillStyle = gol.lit;
    ctx.globalAlpha = 0.5;
    ctx.fillRect(x - w, y - h, w * 2, h * 0.4);
    ctx.globalAlpha = 1;
  }
  // 3) The ember vents: two shoulder craters exhaling — accent rims
  // around open glow, the only interior light not roofed by crust.
  if (backK < 0.6) {
    for (const side of [-1, 1] as const) {
      const vx = side * tw * 0.62 - fx * tw * 0.08;
      const vy = -th * 1.0;
      ctx.fillStyle = shade(gol.shell, -8);
      ctx.beginPath();
      ctx.ellipse(vx, vy, tw * 0.17, th * 0.06, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = gol.accent;
      ctx.beginPath();
      ctx.ellipse(vx, vy, tw * 0.11, th * 0.036, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff3d0';
      ctx.globalAlpha = 0.5 + 0.5 * breath * 0.6;
      ctx.beginPath();
      ctx.ellipse(vx, vy, tw * 0.05, th * 0.016, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      // THE VENTS SPEAK FLAME: a live tongue stands on each shoulder
      // crater — small at rest, roaring through the wind. The fire
      // golem is not stone that glows; it is fire wearing stone.
      flameTongue(ctx, vx, vy - th * 0.01, th * (0.22 + 0.26 * flare), tw * 0.08,
        side * 1.7, nowMs, gol.glow, 0.8 + 0.5 * flare);
    }
  }
  // Seam jets: two small tongues escaping the plate gaps where the
  // crack network runs widest — the containment is imperfect, and
  // that imperfection is the menace.
  const jetK = 0.5 + 0.7 * flare;
  flameTongue(ctx, -tw * 0.06, -th * 0.36, th * 0.16, tw * 0.055, 0.7, nowMs, gol.accent, jetK);
  flameTongue(ctx, tw * 0.3, -th * 0.7, th * 0.14, tw * 0.05, 2.3, nowMs, gol.accent, jetK);
}

/**
 * ICE — the winter that remembers. Faceted slabs with hard straight
 * seams (the anti-rock: nothing rounded), a bright shear facet per
 * mass, hoar fringing the collar and hip seam — and THE HEART: a dark
 * old mass frozen deep in the chest, painted first and read through
 * the slab laid at four-fifths alpha. From behind the ice is honest:
 * no heart, just the blue depth.
 */
function iceBody(ctx: CanvasRenderingContext2D, gol: GolemLook, f: GolemBodyFrame): void {
  const { s, tw, th, fx, fy, backK, hurt } = f;
  const seed = gol.seed ?? 0;
  const hv = gol.heavy;
  if (hurt) {
    stoneMass(ctx, 0, -th * 0.55, tw * 0.9, th * 0.58, s * 0.03,
      '#ffffff', '#ffffff', '#ffffff', true);
    return;
  }
  // The deep water color grounds the stack — CONTAINED, so it reads
  // as depth inside the ice, never as dark clothing at the hips (the
  // first sheet's lesson).
  ctx.fillStyle = '#3d5a70';
  ctx.beginPath();
  chamferRect(ctx, -tw * 0.7, -th * 1.0, tw * 1.4, th * 0.94, s * 0.03);
  ctx.fill();
  // THE HEART — only when the chest faces us at all. Painted big and
  // near-black so it survives the slab laid over it.
  const heartK = backK < 0.4 && fy > -0.15 ? 1 : 0;
  if (heartK > 0) {
    ctx.fillStyle = '#141f2a';
    ctx.beginPath();
    ctx.ellipse(-fx * tw * 0.16, -th * 0.62, tw * 0.24, th * 0.19, 0.2, 0, Math.PI * 2);
    ctx.fill();
  }
  // The slabs: three sheared planes, each a polygon with one straight
  // shear seam — seed tilts the shears. Laid at 0.84 alpha so the
  // heart and the depth read THROUGH the ice.
  const tilt = (hash(seed, 31) - 0.5) * 0.16;
  ctx.globalAlpha = 0.8;
  // Hip wedge.
  ctx.fillStyle = shade(gol.shell, -5);
  ctx.beginPath();
  ctx.moveTo(-tw * 0.6, -th * 0.02);
  ctx.lineTo(-tw * 0.68, -th * 0.34);
  ctx.lineTo(tw * 0.62, -th * (0.3 + tilt));
  ctx.lineTo(tw * 0.56, -th * 0.02);
  ctx.closePath();
  ctx.fill();
  // Chest slab: the tall one, shoulders sheared wide.
  ctx.fillStyle = gol.shell;
  ctx.beginPath();
  ctx.moveTo(-tw * (0.84 + 0.1 * hv), -th * 1.06);
  ctx.lineTo(tw * (0.8 + 0.1 * hv), -th * (1.02 - tilt));
  ctx.lineTo(tw * 0.6, -th * (0.28 + tilt));
  ctx.lineTo(-tw * 0.66, -th * 0.32);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
  // The shear facet: ONE bright plane per body — the light hits the
  // fresh break. Side follows the lead so it reads at every facing.
  ctx.fillStyle = gol.lit;
  ctx.beginPath();
  ctx.moveTo(f.lead * tw * 0.14, -th * 1.04);
  ctx.lineTo(f.lead * tw * (0.76 + 0.1 * hv), -th * (1.0 - tilt));
  ctx.lineTo(f.lead * tw * 0.5, -th * 0.62);
  ctx.lineTo(f.lead * tw * 0.1, -th * 0.7);
  ctx.closePath();
  ctx.fill();
  // Pressure lines: two pale streaks frozen INTO the slab.
  ctx.strokeStyle = gol.glow;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = Math.max(1, s * 0.012);
  for (const [y0, x0, x1] of [[-0.86, -0.6, 0.44], [-0.48, -0.5, 0.3]] as const) {
    ctx.beginPath();
    ctx.moveTo(tw * x0, th * y0);
    ctx.lineTo(tw * x1, th * (y0 + 0.06));
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // Hoar collars: crystalline fringe at the neck and hip seams — the
  // accent, drawn as countable teeth, never fuzz.
  // The heart's cold halo, read THROUGH the slab — one thin ring so
  // the dark old thing registers at gameplay zoom.
  if (heartK > 0) {
    ctx.strokeStyle = gol.glow;
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = Math.max(1, s * 0.014);
    ctx.beginPath();
    ctx.ellipse(-fx * tw * 0.16, -th * 0.62, tw * 0.26, th * 0.21, 0.2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = gol.accent;
  for (const [yBand, n, sz] of [[-1.02, 5, 0.05], [-0.26, 3, 0.035]] as const) {
    for (let i = 0; i < n; i++) {
      const hx = -tw * 0.62 + (i / (n - 1)) * tw * 1.24 + (hash(seed, 40 + i) - 0.5) * tw * 0.08;
      const hs = s * sz * (0.8 + 0.5 * hash(seed, 50 + i));
      ctx.beginPath();
      ctx.moveTo(hx - hs, th * yBand);
      ctx.lineTo(hx, th * yBand - hs * 1.7);
      ctx.lineTo(hx + hs, th * yBand);
      ctx.closePath();
      ctx.fill();
    }
  }
  // THE COLD DRIPS: icicles hang under the chest slab's seam — grown,
  // not placed: seeded lengths, thickest mid-body where the melt
  // gathers. One of them carries a live drop crawling to its tip on
  // a slow clock (the renderer's joint voice releases the fall).
  for (let i = 0; i < 4; i++) {
    const ix = -tw * 0.44 + (i / 3) * tw * 0.92 + (hash(seed, 100 + i) - 0.5) * tw * 0.1;
    const mid = 1 - Math.abs(i / 3 - 0.5) * 1.1;
    const len = th * (0.1 + 0.14 * mid * (0.7 + 0.6 * hash(seed, 104 + i)));
    const iw = s * 0.022;
    ctx.fillStyle = shade(gol.shell, 6);
    ctx.beginPath();
    ctx.moveTo(ix - iw, -th * 0.3);
    ctx.lineTo(ix, -th * 0.3 + len);
    ctx.lineTo(ix + iw, -th * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = gol.lit;
    ctx.beginPath();
    ctx.moveTo(ix - iw * 0.5, -th * 0.3);
    ctx.lineTo(ix - iw * 0.1, -th * 0.3 + len * 0.7);
    ctx.lineTo(ix + iw * 0.1, -th * 0.3);
    ctx.closePath();
    ctx.fill();
  }
  // The crawling melt-drop on the longest icicle.
  const dripT = ((f.nowMs / 2600 + hash(seed, 108)) % 1);
  if (dripT < 0.7) {
    const ix = -tw * 0.44 + (1 / 3) * tw * 0.92 + (hash(seed, 101) - 0.5) * tw * 0.1;
    ctx.fillStyle = gol.glow;
    ctx.beginPath();
    ctx.arc(ix, -th * 0.3 + th * 0.22 * (dripT / 0.7), s * 0.013, 0, Math.PI * 2);
    ctx.fill();
  }
  // THE FACETS TWINKLE: two glint stars living on the slab planes,
  // each blinking on its own slow phase — trapped light, not sparkle
  // dust. Gated hard so at most one usually shows.
  for (let i = 0; i < 2; i++) {
    const tw2 = Math.sin(f.nowMs / 900 + hash(seed, 112 + i) * 9);
    if (tw2 < 0.86) continue;
    const gx = tw * (hash(seed, 116 + i) - 0.5) * 1.1;
    const gy = -th * (0.5 + 0.4 * hash(seed, 120 + i));
    const gs = s * 0.028;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(1, s * 0.012);
    ctx.beginPath();
    ctx.moveTo(gx - gs, gy);
    ctx.lineTo(gx + gs, gy);
    ctx.moveTo(gx, gy - gs);
    ctx.lineTo(gx, gy + gs);
    ctx.stroke();
  }
}

// ---------------------------------------------------------------- head

export interface GolemHeadFrame {
  s: number;
  headX: number;
  headY: number;
  hw: number;
  hh: number;
  cut: number;
  fx: number;
  fy: number;
  profileK: number;
  backK: number;
  lead: number;
  hurt: boolean;
  nowMs: number;
  /** 0..1 strike/cast beat — visors flare, capstones tip. */
  flare: number;
}

export function paintGolemHead(
  ctx: CanvasRenderingContext2D,
  gol: GolemLook,
  f: GolemHeadFrame,
  seed = 0,
): void {
  switch (gol.build) {
    case 'rock': return rockHead(ctx, gol, f, seed);
    case 'iron': return ironHead(ctx, gol, f);
    case 'fire': return fireHead(ctx, gol, f);
    case 'ice': return iceHead(ctx, gol, f, seed);
  }
}

/**
 * ROCK head — the capstone. A wide low boulder seated ON the shoulder
 * stones, dark SOCKETS for eyes (no glow — a cairn watches without
 * light), one moss tuft, and the nod: the whole capstone TIPS with
 * the strike beat. From behind: a plain crowned stone.
 */
function rockHead(ctx: CanvasRenderingContext2D, gol: GolemLook, f: GolemHeadFrame, seed: number): void {
  const { headX, headY, hw, hh, fx, profileK, backK, lead, hurt, flare } = f;
  const back = backK > 0.55;
  const gw = hw * 1.3;
  const gh = hh * 0.88;
  ctx.save();
  ctx.translate(headX, headY);
  // The nod — the capstone was only ever balanced.
  if (flare > 0) ctx.rotate(fx * flare * 0.1);
  const tiltCut = f.cut * (1 + hash(seed, 60) * 0.6);
  stoneMass(ctx, 0, 0, gw, gh, tiltCut, gol.shell, gol.lit, gol.deep, hurt, 0.3);
  if (!hurt && !back) {
    // THE SOCKETS: two deep-set voids under the brow shelf. Slide
    // with the facing on one fixed eye line; the far one rounds the
    // corner at profile — the billboard-face law, kept.
    const pairX = fx * gw * 0.34;
    const eyeDx = gw * 0.36 * (1 - profileK * 0.5);
    ctx.fillStyle = gol.under;
    for (const sd of [-1, 1] as const) {
      if (sd !== lead && profileK > 0.78) continue;
      ctx.beginPath();
      chamferRect(ctx, pairX + sd * eyeDx - gw * 0.13, -gh * 0.18, gw * 0.26, gh * 0.3, gw * 0.06);
      ctx.fill();
    }
    // The brow shelf: one lit ledge over the sockets — the capstone
    // frowns by geology.
    ctx.fillStyle = gol.lit;
    ctx.fillRect(pairX - gw * 0.56, -gh * 0.34, gw * 1.12, gh * 0.14);
    // The moss tuft off one corner.
    ctx.fillStyle = gol.accent;
    const mSide = hash(seed, 61) > 0.5 ? 1 : -1;
    ctx.beginPath();
    ctx.ellipse(mSide * gw * 0.62, -gh * 0.72, gw * 0.24, gh * 0.12, mSide * 0.3, 0, Math.PI * 2);
    ctx.fill();
  } else if (!hurt) {
    // The occiput: bedding seams only — no face from behind.
    ctx.strokeStyle = shade(gol.shell, -14);
    ctx.lineWidth = Math.max(1, gh * 0.06);
    for (const t of [0.1, 0.42]) {
      ctx.beginPath();
      ctx.moveTo(-gw * 0.6, -gh * t);
      ctx.lineTo(gw * 0.6, -gh * t + gh * 0.06);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/**
 * IRON head — the helm block. A chamfered forged box with a crest fin,
 * corner rivets, and THE VISOR SLIT: the one glowing line on the whole
 * body, leading the facing, flaring with the strike. From behind: the
 * occiput plate and its rivets, no light at all.
 */
/**
 * IRON head — THE LODESTONE SKULL. An angular magnetite chunk, tilted
 * the way the field left it, with ONE deep socket and the pale spark
 * that lives in it — a watching glint, never a furnace slit (the slit
 * was the robot). A crown of gathered iron rides the crest: two bent
 * nails and a spike the field caught and kept. From behind, bare ore
 * facets and a rust stratum — no face, no bolts.
 */
function ironHead(ctx: CanvasRenderingContext2D, gol: GolemLook, f: GolemHeadFrame): void {
  const { headX, headY, hw, hh, fx, backK, lead, hurt, flare, nowMs } = f;
  const seed = (gol.seed ?? 0) ^ 0x1e0;
  const back = backK > 0.55;
  const gw = hw * 1.14;
  const gh = hh * 1.0;
  const tilt = (hash(seed, 1) - 0.5) * 0.24;
  ctx.save();
  ctx.translate(headX, headY);
  ctx.rotate(tilt);
  // The skull chunk: crystalline, one hard glint facet.
  oreMass(ctx, 0, 0, gw, gh, 6, seed, gol.shell, gol.lit, gol.deep, hurt,
    back ? shade(gol.deep, 14) : undefined);
  if (hurt) {
    ctx.restore();
    return;
  }
  // The gathered crown: bent nails and one spike, embedded standing.
  ctx.strokeStyle = shade(gol.shell, -30);
  ctx.lineCap = 'butt';
  ctx.lineWidth = Math.max(1, gh * 0.07);
  for (const [ox, a, len] of [
    [-0.44, -0.35, 0.4],
    [0.1, 0.12, 0.52],
    [0.5, 0.42, 0.34],
  ] as const) {
    const bx = gw * ox;
    const by = -gh * (0.78 - Math.abs(ox) * 0.2);
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + Math.sin(a) * gh * len, by - Math.cos(a) * gh * len);
    ctx.stroke();
  }
  if (!back) {
    // THE ONE SOCKET: a dark hollow the field looks out of, leading
    // the facing — and in it the spark, breathing at rest, snapping
    // white through the wind. A glint, never a lamp.
    const ex = fx * gw * 0.3 + lead * gw * 0.08;
    const ey = -gh * 0.1;
    ctx.fillStyle = gol.under;
    ctx.beginPath();
    ctx.moveTo(ex - gw * 0.3, ey - gh * 0.1);
    ctx.lineTo(ex + gw * 0.22, ey - gh * 0.22);
    ctx.lineTo(ex + gw * 0.28, ey + gh * 0.16);
    ctx.lineTo(ex - gw * 0.2, ey + gh * 0.22);
    ctx.closePath();
    ctx.fill();
    const breathe = 0.55 + 0.2 * Math.sin(nowMs / 520);
    const bright = Math.min(1, breathe + flare);
    ctx.fillStyle = gol.glow;
    ctx.globalAlpha = bright;
    ctx.beginPath();
    ctx.arc(ex + fx * gw * 0.04, ey, gh * (0.09 + 0.05 * flare), 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = Math.min(1, bright) * 0.9;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ex + fx * gw * 0.04, ey - gh * 0.02, gh * 0.035, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    // The brow crag: a jutting facet shadowing the socket.
    ctx.fillStyle = shade(gol.shell, -14);
    ctx.beginPath();
    ctx.moveTo(ex - gw * 0.34, ey - gh * 0.14);
    ctx.lineTo(ex + gw * 0.3, ey - gh * 0.26);
    ctx.lineTo(ex + gw * 0.34, ey - gh * 0.16);
    ctx.lineTo(ex - gw * 0.26, ey - gh * 0.05);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/**
 * FIRE head — the crucible. An open vessel wider at the crown, and the
 * camera's tilt EARNS the read: the open top shows its molten pool as
 * a foreshortened ellipse. Crown cracks run glowing down the face; the
 * eyes are two pips of the same light. The strike beat SURGES the
 * pool. From behind, the vessel wall roofs the light to a rim glow.
 */
function fireHead(ctx: CanvasRenderingContext2D, gol: GolemLook, f: GolemHeadFrame): void {
  const { headX, headY, hw, hh, fx, profileK, backK, hurt, flare, nowMs } = f;
  const back = backK > 0.55;
  const gw = hw * 1.08;
  const gh = hh * 0.94;
  // The vessel: a trapezoid opening upward.
  ctx.fillStyle = hurt ? '#ffffff' : gol.shell;
  ctx.beginPath();
  ctx.moveTo(headX - gw * 1.0, headY - gh * 0.78);
  ctx.lineTo(headX + gw * 1.0, headY - gh * 0.78);
  ctx.lineTo(headX + gw * 0.66, headY + gh * 0.9);
  ctx.lineTo(headX - gw * 0.66, headY + gh * 0.9);
  ctx.closePath();
  ctx.fill();
  if (hurt) return;
  const breath = 0.6 + 0.4 * Math.min(1, 0.4 * Math.sin(nowMs / 640) + 0.6 + flare);
  // Form split on the vessel wall.
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(headX - gw * 1.0, headY - gh * 0.78);
  ctx.lineTo(headX + gw * 1.0, headY - gh * 0.78);
  ctx.lineTo(headX + gw * 0.66, headY + gh * 0.9);
  ctx.lineTo(headX - gw * 0.66, headY + gh * 0.9);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = shade(gol.shell, -9);
  ctx.fillRect(headX, headY - gh, gw, gh * 2);
  ctx.fillStyle = shade(gol.shell, -14);
  ctx.fillRect(headX - gw, headY + gh * 0.6, gw * 2, gh * 0.3);
  ctx.restore();
  // The open crown: rim, then the pool — the foreshortened top plane
  // the whole camera philosophy promises. Facing away, the far wall
  // hides the pool and only the rim glow survives.
  ctx.fillStyle = shade(gol.shell, 6);
  ctx.beginPath();
  ctx.ellipse(headX, headY - gh * 0.78, gw * 1.0, gh * 0.26, 0, 0, Math.PI * 2);
  ctx.fill();
  if (!back) {
    ctx.fillStyle = gol.glow;
    ctx.beginPath();
    ctx.ellipse(headX, headY - gh * 0.76, gw * 0.78, gh * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff3d0';
    ctx.globalAlpha = breath * 0.8;
    ctx.beginPath();
    ctx.ellipse(headX - fx * gw * 0.12, headY - gh * 0.76, gw * 0.4, gh * 0.09, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    // THE CROWN BURNS: three tongues stand out of the crucible pool —
    // the tallest at the center, all leaning together in the same
    // wind, roaring up through the flare. This is the read that says
    // FLAMES BOUND INTO A FORM before anything else on the body does.
    const roar = 0.85 + 0.65 * flare;
    flameTongue(ctx, headX - gw * 0.34, headY - gh * 0.78, gh * 0.44, gw * 0.14, 0.3, nowMs, gol.glow, roar * 0.8);
    flameTongue(ctx, headX + fx * gw * 0.08, headY - gh * 0.82, gh * 0.66, gw * 0.18, 1.6, nowMs, gol.glow, roar);
    flameTongue(ctx, headX + gw * 0.36, headY - gh * 0.78, gh * 0.38, gw * 0.12, 2.9, nowMs, gol.accent, roar * 0.75);
  } else {
    ctx.fillStyle = gol.accent;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.ellipse(headX, headY - gh * 0.76, gw * 0.7, gh * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  if (!back) {
    // Crown cracks: three glowing runs down the vessel face — widest
    // at the rim, dying toward the jaw, surging with the flare.
    ctx.strokeStyle = gol.glow;
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.6 + 0.4 * breath;
    for (const [x0, len, w] of [[-0.5, 0.7, 0.1], [0.1, 0.9, 0.13], [0.56, 0.55, 0.08]] as const) {
      ctx.lineWidth = Math.max(1, gh * w * (1 + 0.6 * flare));
      ctx.beginPath();
      ctx.moveTo(headX + gw * x0 + fx * gw * 0.1, headY - gh * 0.6);
      ctx.lineTo(headX + gw * (x0 * 0.7) + fx * gw * 0.14, headY - gh * 0.6 + gh * len);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // The eye pips: two small lights on the fixed eye line.
    const pairX = headX + fx * gw * 0.32;
    const eyeDx = gw * 0.34 * (1 - profileK * 0.5);
    for (const sd of [-1, 1] as const) {
      if (sd !== f.lead && profileK > 0.78) continue;
      ctx.fillStyle = '#fff3d0';
      ctx.beginPath();
      ctx.arc(pairX + sd * eyeDx, headY - gh * 0.06, gh * 0.09 * (1 + 0.5 * flare), 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/**
 * ICE head — the sheared prism. An asymmetric crystal, one bright
 * shear facet, eye NOTCHES (dark wedges cut in, not lights), and hoar
 * along the jaw base. The strike beat flashes one crack across the
 * face. From behind: the prism's dark back planes only.
 */
function iceHead(ctx: CanvasRenderingContext2D, gol: GolemLook, f: GolemHeadFrame, seed: number): void {
  const { headX, headY, hw, hh, fx, profileK, backK, lead, hurt, flare } = f;
  const back = backK > 0.55;
  const gw = hw * 1.1;
  const gh = hh * 1.12;
  const tip = (hash(seed, 70) - 0.5) * 0.3;
  // The prism silhouette: five points, sheared top.
  const pts: ReadonlyArray<[number, number]> = [
    [-gw * 0.9, gh * 0.5],
    [-gw * (0.8 - tip * 0.3), -gh * (0.62 + tip)],
    [gw * 0.28, -gh * (0.98 - tip)],
    [gw * 0.94, -gh * 0.34],
    [gw * 0.62, gh * 0.62],
  ];
  ctx.fillStyle = hurt ? '#ffffff' : gol.shell;
  ctx.beginPath();
  ctx.moveTo(headX + pts[0]![0], headY + pts[0]![1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(headX + pts[i]![0], headY + pts[i]![1]);
  ctx.closePath();
  ctx.fill();
  if (hurt) return;
  if (!back) {
    // The shear facet: the fresh break takes all the light.
    ctx.fillStyle = gol.lit;
    ctx.beginPath();
    ctx.moveTo(headX + lead * gw * 0.1, headY - gh * (0.9 - tip));
    ctx.lineTo(headX + lead * gw * 0.86, headY - gh * 0.32);
    ctx.lineTo(headX + lead * gw * 0.5, headY + gh * 0.1);
    ctx.lineTo(headX + lead * gw * 0.06, headY - gh * 0.3);
    ctx.closePath();
    ctx.fill();
    // The eye notches: two hard wedges CUT into the crystal — winter
    // does not look at you with light.
    const pairX = headX + fx * gw * 0.3;
    const eyeDx = gw * 0.34 * (1 - profileK * 0.5);
    ctx.fillStyle = gol.under;
    for (const sd of [-1, 1] as const) {
      if (sd !== lead && profileK > 0.78) continue;
      ctx.beginPath();
      ctx.moveTo(pairX + sd * eyeDx - gw * 0.12, headY - gh * 0.12);
      ctx.lineTo(pairX + sd * eyeDx + gw * 0.1, headY - gh * 0.2);
      ctx.lineTo(pairX + sd * eyeDx + gw * 0.06, headY + gh * 0.04);
      ctx.closePath();
      ctx.fill();
    }
    // The strike crack: one pale flash across the face on the beat.
    if (flare > 0.1) {
      ctx.strokeStyle = gol.glow;
      ctx.globalAlpha = flare;
      ctx.lineWidth = Math.max(1, gh * 0.05);
      ctx.beginPath();
      ctx.moveTo(headX - gw * 0.6, headY - gh * 0.5);
      ctx.lineTo(headX - gw * 0.1, headY - gh * 0.34);
      ctx.lineTo(headX + gw * 0.2, headY - gh * 0.44);
      ctx.lineTo(headX + gw * 0.7, headY - gh * 0.2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  } else {
    // The back planes: two dark facets, seamed.
    ctx.fillStyle = shade(gol.shell, -14);
    ctx.beginPath();
    ctx.moveTo(headX - gw * 0.7, headY + gh * 0.4);
    ctx.lineTo(headX - gw * 0.6, headY - gh * 0.5);
    ctx.lineTo(headX + gw * 0.1, headY - gh * 0.8);
    ctx.lineTo(headX + gw * 0.05, headY + gh * 0.5);
    ctx.closePath();
    ctx.fill();
  }
  // Hoar at the jaw base, both ways round — frost owns every seam.
  ctx.fillStyle = gol.accent;
  for (let i = 0; i < 4; i++) {
    const hx = headX - gw * 0.5 + (i / 3) * gw * 1.0;
    const hs = gh * 0.09 * (0.7 + 0.6 * hash(seed, 74 + i));
    ctx.beginPath();
    ctx.moveTo(hx - hs, headY + gh * 0.52);
    ctx.lineTo(hx, headY + gh * 0.52 - hs * 1.6);
    ctx.lineTo(hx + hs, headY + gh * 0.52);
    ctx.closePath();
    ctx.fill();
  }
}

// ---------------------------------------------------------------- limbs

/**
 * The construct arm — called from drawArm's dialect switch with the
 * solved joints. Four arms, four machines:
 *   rock — boulder shoulder to knuckle-heavy fist, stones threaded on
 *          the solved bone; iron — plate sleeves, elbow disc, riveted
 *   block fist; fire — crust segments with glowing joint gaps; ice —
 *   faceted columns ending in an angular wedge fist.
 */
export function drawGolemArm(
  ctx: CanvasRenderingContext2D,
  gol: GolemLook,
  sx: number,
  sy: number,
  kx: number,
  ky: number,
  ex: number,
  ey: number,
  s: number,
  hurt: boolean,
  nowMs: number,
): void {
  const hv = gol.heavy;
  const shell = hurt ? '#ffffff' : gol.shell;
  const deepC = hurt ? '#ffffff' : gol.deep;
  ctx.lineCap = 'round';
  switch (gol.build) {
    case 'rock': {
      // Two stones on the bone: a heavy upper boulder, a leaner
      // forearm stone, a fist like a fifth boulder.
      ctx.strokeStyle = shell;
      ctx.lineWidth = Math.max(2, s * 0.15 * (0.9 + 0.2 * hv));
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(kx, ky);
      ctx.stroke();
      ctx.strokeStyle = hurt ? '#ffffff' : shade(gol.shell, -8);
      ctx.lineWidth = Math.max(2, s * 0.115);
      ctx.beginPath();
      ctx.moveTo(kx, ky);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      if (!hurt) {
        // The elbow seam pebble — the joint is a stone that turns.
        ctx.fillStyle = deepC;
        ctx.beginPath();
        ctx.arc(kx, ky, Math.max(1.6, s * 0.045), 0, Math.PI * 2);
        ctx.fill();
      }
      // The fist: a knuckle boulder wider than the forearm.
      ctx.fillStyle = hurt ? '#ffffff' : shade(gol.shell, 2);
      ctx.beginPath();
      ctx.arc(ex, ey, s * 0.105 * (0.9 + 0.2 * hv), 0, Math.PI * 2);
      ctx.fill();
      if (!hurt) {
        ctx.fillStyle = gol.lit;
        ctx.beginPath();
        ctx.ellipse(ex - s * 0.015, ey - s * 0.045, s * 0.06, s * 0.028, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = deepC;
        ctx.lineWidth = Math.max(1, s * 0.014);
        for (const o of [-0.03, 0.015]) {
          ctx.beginPath();
          ctx.moveTo(ex + s * 0.03, ey + o * s - s * 0.02);
          ctx.lineTo(ex + s * 0.095, ey + o * s + s * 0.012);
          ctx.stroke();
        }
      }
      break;
    }
    case 'iron': {
      // Ore-column limbs: raw gathered metal, not machined sleeves —
      // a heavy chunk-stroke upper, a leaner forearm, and the LUMP
      // fist with old nail-heads for knuckles. The magnetic hum rides
      // the whole limb as a slow micro-offset.
      const q = hurt ? 0 : Math.sin(nowMs / 53) * s * 0.0025;
      ctx.lineCap = 'butt';
      ctx.strokeStyle = shell;
      ctx.lineWidth = Math.max(2, s * 0.135 * (0.9 + 0.2 * hv));
      ctx.beginPath();
      ctx.moveTo(sx + q, sy);
      ctx.lineTo(kx + q, ky);
      ctx.stroke();
      ctx.strokeStyle = hurt ? '#ffffff' : shade(gol.shell, -7);
      ctx.lineWidth = Math.max(2, s * 0.102);
      ctx.beginPath();
      ctx.moveTo(kx + q, ky);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      if (!hurt) {
        // The elbow: an angular ore chip with the copper fleck — the
        // one warmth carried to the limb.
        ctx.fillStyle = shade(gol.shell, -12);
        ctx.beginPath();
        ctx.moveTo(kx - s * 0.05, ky + s * 0.02);
        ctx.lineTo(kx - s * 0.01, ky - s * 0.055);
        ctx.lineTo(kx + s * 0.05, ky - s * 0.01);
        ctx.lineTo(kx + s * 0.02, ky + s * 0.05);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = gol.accent;
        ctx.beginPath();
        ctx.arc(kx, ky, Math.max(1, s * 0.016), 0, Math.PI * 2);
        ctx.fill();
      }
      // The fist: an angular ore lump, glint on the striking face,
      // three worn nail-heads for knuckles.
      ctx.save();
      ctx.translate(ex, ey);
      ctx.rotate(Math.atan2(ey - ky, ex - kx));
      ctx.fillStyle = hurt ? '#ffffff' : shade(gol.shell, 3);
      ctx.beginPath();
      ctx.moveTo(-s * 0.05, -s * 0.08);
      ctx.lineTo(s * 0.07, -s * 0.095);
      ctx.lineTo(s * 0.115, -s * 0.02);
      ctx.lineTo(s * 0.095, s * 0.075);
      ctx.lineTo(-s * 0.04, s * 0.09);
      ctx.closePath();
      ctx.fill();
      if (!hurt) {
        ctx.fillStyle = gol.lit;
        ctx.beginPath();
        ctx.moveTo(s * 0.07, -s * 0.095);
        ctx.lineTo(s * 0.115, -s * 0.02);
        ctx.lineTo(s * 0.05, -s * 0.03);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = shade(gol.shell, -26);
        for (const oy of [-0.05, 0, 0.05]) {
          ctx.beginPath();
          ctx.arc(s * 0.085, oy * s, s * 0.014, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
      break;
    }
    case 'fire': {
      // Crust segments with the light at the joints: the glow leaks
      // exactly where the arm articulates — the machine admits it.
      if (!hurt) {
        // lineJoin stays round or the sharp elbow miter throws a
        // glowing spike a full arm past the joint (the flag bug).
        ctx.lineJoin = 'round';
        ctx.strokeStyle = gol.glow;
        ctx.lineWidth = Math.max(2, s * 0.125 * (0.9 + 0.2 * hv));
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(kx, ky);
        ctx.lineTo(ex, ey);
        ctx.stroke();
        ctx.lineJoin = 'miter';
      }
      ctx.strokeStyle = shell;
      ctx.lineWidth = Math.max(2, s * 0.115 * (0.9 + 0.2 * hv));
      // Upper crust, stopped short of the elbow.
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + (kx - sx) * 0.82, sy + (ky - sy) * 0.82);
      ctx.stroke();
      ctx.lineWidth = Math.max(2, s * 0.09);
      ctx.beginPath();
      ctx.moveTo(kx + (ex - kx) * 0.16, ky + (ey - ky) * 0.16);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      // The fist: a crust ball, one glowing seam across the knuckles.
      ctx.fillStyle = shell;
      ctx.beginPath();
      ctx.arc(ex, ey, s * 0.1 * (0.9 + 0.2 * hv), 0, Math.PI * 2);
      ctx.fill();
      if (!hurt) {
        const pulse = 0.6 + 0.4 * Math.sin(nowMs / 640);
        ctx.strokeStyle = gol.glow;
        ctx.globalAlpha = pulse;
        ctx.lineWidth = Math.max(1, s * 0.02);
        ctx.beginPath();
        ctx.arc(ex, ey, s * 0.062, -0.6, 1.2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      break;
    }
    case 'ice': {
      // Faceted columns: the slab arm with one lit edge running its
      // length, ending in the wedge fist — an axe the golem was
      // born holding.
      ctx.lineCap = 'butt';
      ctx.strokeStyle = shell;
      ctx.lineWidth = Math.max(2, s * 0.135 * (0.9 + 0.2 * hv));
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(kx, ky);
      ctx.stroke();
      ctx.strokeStyle = hurt ? '#ffffff' : shade(gol.shell, -7);
      ctx.lineWidth = Math.max(2, s * 0.105);
      ctx.beginPath();
      ctx.moveTo(kx, ky);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      if (!hurt) {
        // The lit edge: one bright line down the whole limb.
        ctx.strokeStyle = gol.lit;
        ctx.lineWidth = Math.max(1, s * 0.025);
        ctx.beginPath();
        ctx.moveTo(sx, sy - s * 0.03);
        ctx.lineTo(kx, ky - s * 0.03);
        ctx.lineTo(ex, ey - s * 0.02);
        ctx.stroke();
        // Hoar at the elbow seam.
        ctx.fillStyle = gol.accent;
        ctx.beginPath();
        ctx.arc(kx, ky, Math.max(1.4, s * 0.032), 0, Math.PI * 2);
        ctx.fill();
      }
      // The wedge fist.
      ctx.save();
      ctx.translate(ex, ey);
      ctx.rotate(Math.atan2(ey - ky, ex - kx));
      ctx.fillStyle = hurt ? '#ffffff' : shade(gol.shell, 4);
      ctx.beginPath();
      ctx.moveTo(-s * 0.04, -s * 0.09);
      ctx.lineTo(s * 0.13, -s * 0.03);
      ctx.lineTo(s * 0.13, s * 0.03);
      ctx.lineTo(-s * 0.04, s * 0.09);
      ctx.closePath();
      ctx.fill();
      if (!hurt) {
        ctx.fillStyle = gol.lit;
        ctx.beginPath();
        ctx.moveTo(-s * 0.04, -s * 0.09);
        ctx.lineTo(s * 0.13, -s * 0.03);
        ctx.lineTo(s * 0.02, -s * 0.02);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      break;
    }
  }
  ctx.lineCap = 'butt';
}

/**
 * The construct foot — slab feet per build, called from the bare-foot
 * switch. Wider than any boot: a golem stands on its own architecture.
 */
export function paintGolemFoot(
  ctx: CanvasRenderingContext2D,
  gol: GolemLook,
  fxx: number,
  fyy: number,
  s: number,
  lead: number,
  hurt: boolean,
): void {
  const hv = gol.heavy;
  const gv = 0.94 + 0.18 * hv;
  switch (gol.build) {
    case 'rock': {
      // A rounded footing stone with two toe seams and one pebble.
      ctx.fillStyle = hurt ? '#ffffff' : shade(gol.shell, -3);
      ctx.beginPath();
      chamferRect(ctx, fxx - 0.105 * s * gv, fyy - 0.04 * s, 0.21 * s * gv, 0.08 * s, 0.032 * s);
      ctx.fill();
      if (!hurt) {
        ctx.fillStyle = gol.lit;
        ctx.fillRect(fxx - 0.08 * s * gv, fyy - 0.038 * s, 0.16 * s * gv, 0.022 * s);
        ctx.strokeStyle = shade(gol.shell, -22);
        ctx.lineWidth = Math.max(1, 0.013 * s);
        for (const o of [-0.012, 0.018]) {
          ctx.beginPath();
          ctx.moveTo(fxx + lead * 0.05 * s, fyy + o * s - 0.008 * s);
          ctx.lineTo(fxx + lead * 0.098 * s * gv, fyy + o * s);
          ctx.stroke();
        }
        ctx.fillStyle = shade(gol.shell, -12);
        ctx.beginPath();
        ctx.arc(fxx - lead * 0.07 * s, fyy + 0.028 * s, 0.016 * s, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'iron': {
      // The ore footing: an angular gathered lump — rust band, one
      // glint facet, an old nail-head worn near the heel. No sabaton;
      // nothing on this body was ever fitted.
      ctx.fillStyle = hurt ? '#ffffff' : shade(gol.shell, -2);
      ctx.beginPath();
      ctx.moveTo(fxx - 0.1 * s * gv, fyy - 0.026 * s);
      ctx.lineTo(fxx - 0.04 * s, fyy - 0.046 * s);
      ctx.lineTo(fxx + lead * 0.105 * s * gv, fyy - 0.026 * s);
      ctx.lineTo(fxx + lead * 0.115 * s * gv, fyy + 0.024 * s);
      ctx.lineTo(fxx - 0.09 * s * gv, fyy + 0.038 * s);
      ctx.closePath();
      ctx.fill();
      if (!hurt) {
        ctx.fillStyle = gol.lit;
        ctx.beginPath();
        ctx.moveTo(fxx - 0.04 * s, fyy - 0.046 * s);
        ctx.lineTo(fxx + lead * 0.105 * s * gv, fyy - 0.026 * s);
        ctx.lineTo(fxx + lead * 0.02 * s, fyy - 0.014 * s);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = shade(gol.deep, 14);
        ctx.fillRect(fxx - 0.08 * s * gv, fyy + 0.006 * s, 0.17 * s * gv, 0.014 * s);
        ctx.fillStyle = shade(gol.shell, -26);
        ctx.beginPath();
        ctx.arc(fxx - lead * 0.055 * s, fyy - 0.008 * s, 0.013 * s, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'fire': {
      // The cracked pad: crust block, one glowing seam across it.
      ctx.fillStyle = hurt ? '#ffffff' : gol.shell;
      ctx.beginPath();
      chamferRect(ctx, fxx - 0.1 * s * gv, fyy - 0.038 * s, 0.2 * s * gv, 0.076 * s, 0.026 * s);
      ctx.fill();
      if (!hurt) {
        ctx.strokeStyle = gol.glow;
        ctx.lineWidth = Math.max(1, 0.016 * s);
        ctx.beginPath();
        ctx.moveTo(fxx - 0.06 * s, fyy + 0.008 * s);
        ctx.lineTo(fxx + lead * 0.02 * s, fyy - 0.01 * s);
        ctx.lineTo(fxx + lead * 0.085 * s * gv, fyy + 0.004 * s);
        ctx.stroke();
        ctx.fillStyle = shade(gol.shell, -8);
        ctx.fillRect(fxx - 0.08 * s * gv, fyy + 0.02 * s, 0.16 * s * gv, 0.016 * s);
      }
      break;
    }
    case 'ice': {
      // The faceted wedge: pointed by the lead, one bright facet.
      ctx.fillStyle = hurt ? '#ffffff' : gol.shell;
      ctx.beginPath();
      ctx.moveTo(fxx - lead * 0.09 * s * gv, fyy - 0.036 * s);
      ctx.lineTo(fxx + lead * 0.115 * s * gv, fyy - 0.02 * s);
      ctx.lineTo(fxx + lead * 0.115 * s * gv, fyy + 0.02 * s);
      ctx.lineTo(fxx - lead * 0.09 * s * gv, fyy + 0.04 * s);
      ctx.closePath();
      ctx.fill();
      if (!hurt) {
        ctx.fillStyle = gol.lit;
        ctx.beginPath();
        ctx.moveTo(fxx - lead * 0.09 * s * gv, fyy - 0.036 * s);
        ctx.lineTo(fxx + lead * 0.115 * s * gv, fyy - 0.02 * s);
        ctx.lineTo(fxx + lead * 0.02 * s, fyy - 0.004 * s);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = gol.accent;
        ctx.beginPath();
        ctx.moveTo(fxx - lead * 0.06 * s, fyy - 0.05 * s);
        ctx.lineTo(fxx - lead * 0.045 * s, fyy - 0.078 * s);
        ctx.lineTo(fxx - lead * 0.03 * s, fyy - 0.05 * s);
        ctx.closePath();
        ctx.fill();
      }
      break;
    }
  }
}
