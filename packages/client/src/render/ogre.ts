/**
 * THE GIANT DIALECT — the ogres (docs/ogres-plan.md).
 *
 * The fifth humanoid dialect beside bone, scale, fur, greenskin, and
 * construct — and the first WALKING body whose torso is authored as a
 * 3D carriage. Every mass (gut, chest, hump, hair mat, wrap, trophy
 * root) is a STATION in body space (F fwd, L lat, Z up) projected
 * through the fixed bird's-eye camera (YK 0.6), so orientation,
 * fore-aft placement, and near/far paint order at all eight bands and
 * every band between fall out BY CONSTRUCTION — no per-band blends
 * anywhere in the torso (THE MOTION DOCTRINE, law three).
 *
 * THE FOUR READS (owned by no other body):
 *   THE SLOPE     — a proportionally SMALL skull falling backward in
 *                   one plane from a heavy brow ledge into the hump.
 *                   Every other dialect grew the head; the giant
 *                   shrinks it. The inversion IS the read.
 *   THE GUT       — the widest station of the body, wider than the
 *                   shoulders (the ogre triangle points UP), and a
 *                   SIMULATION: GutSim lags the painted anchor so
 *                   every footfall lands with visible weight, and the
 *                   idle breath is the sleeping hill.
 *   THE UNDERBITE — the jaw is wider than the skull and leads it;
 *                   two lower teeth stand proud of the lip at rest.
 *                   The gape is a roar, never a nibble.
 *   THE KNUCKLE HANG — unequal bones (short heavy upper arm, LONG
 *                   forearm), the taper INVERTED (forearm out-girths
 *                   the upper), ham fists with knuckle ticks.
 *
 * Laws honored here:
 * - THE FLAT FORGE LAW: depth is flat value planes, never rounded
 *   gradients; seams are darker PLANES, edges are lit PLANES.
 * - THE TOP-PLANE LAW: every big mass shows a foreshortened lit crown.
 * - NO FACE FROM BEHIND: past backK 0.55 the head is hair mat, ear
 *   backs, and honest occiput.
 * - TRUE PROFILE UP FRONT: past profileK 0.9 the head swaps for an
 *   authored side silhouette (the gnoll law learned on day one) —
 *   blends below the branch only ever serve the ¾ bands.
 * - Hurt flash: fills go '#ffffff', detail passes skip.
 * - Seeded determinism: hide clusters, warts, scars, and the belt
 *   trophy all hash the spawn eid; Math.random never.
 * - THE ONE REST: every sim has a stateless rest twin, so posters,
 *   corpses, and sheets paint exactly what the game relaxes to.
 */
import { chamferRect } from './shapes.js';
import { shade } from './tint.js';

/** The fixed camera's vertical compression — one constant, one law. */
const YK = 0.6;

export type OgreDesign = 'brute' | 'hurler' | 'bellower' | 'champion';

export interface OgreLook {
  design: OgreDesign;
  /** The hide — most of the painted area. */
  hide: string;
  /** The front plane: belly, jaw underside, palm. */
  belly: string;
  /** The greasy mat: crown fall, hump drape, sideburn. */
  hair: string;
  /** The pelt wrap at the hips. */
  wrap: string;
  /** The rope that cinches it (and hangs the trophies). */
  rope: string;
  /** Worn tooth and toenail ivory. */
  teeth: string;
  /** War-paint / accent: the bellower's drum ring, the champion's ash. */
  paint: string;
  /** Frame multiplier: gut girth, fist size, jaw weight. */
  heavy: number;
  /** One torn ear and an old face scar — rolled, never authored. */
  scarred: boolean;
  /** Spawn seed — warts, patches, trophy kind, nothing else. */
  seed?: number;
}

/**
 * THE HIDE CLUSTERS — rank-and-file only (ogre, ogre_hurler), the
 * gnoll hash law: four WIDE values so a camp never reads as one coat.
 * The bellower and the Bonegrinder are DESIGNS and never roll.
 */
const OGRE_CLUSTERS: ReadonlyArray<Pick<OgreLook, 'hide' | 'belly' | 'hair' | 'wrap'>> = [
  // Tallow: the storybook hill ogre, rancid-butter yellow.
  { hide: '#b3985e', belly: '#cbb684', hair: '#4a3f2e', wrap: '#7a5a38' },
  // Dun: peat-brown, the bog-country cousin.
  { hide: '#8f6f4e', belly: '#ad9068', hair: '#3c3226', wrap: '#64553c' },
  // Ash: grey as a standing stone at dusk.
  { hide: '#7e7f74', belly: '#9a9b8c', hair: '#33342c', wrap: '#5c5648' },
  // Sallow: sickly olive, the one that lives too near the fen.
  { hide: '#9aa060', belly: '#b8bd82', hair: '#45402a', wrap: '#6e6444' },
];

const BASE = {
  rope: '#a08a5c',
  teeth: '#e3d7b4',
} as const;

export const OGRE_LOOKS: Record<string, OgreLook> = {
  ogre: {
    design: 'brute',
    ...OGRE_CLUSTERS[0]!,
    ...BASE,
    paint: '#c9772e',
    heavy: 1.0,
    scarred: false,
  },
  ogre_hurler: {
    design: 'hurler',
    ...OGRE_CLUSTERS[1]!,
    ...BASE,
    paint: '#c9772e',
    heavy: 0.95,
    scarred: false,
  },
  // The bellower is a DESIGN: ash hide, and the ochre drum-ring
  // painted on the gut — the instrument announced.
  ogre_bellower: {
    design: 'bellower',
    ...OGRE_CLUSTERS[2]!,
    ...BASE,
    paint: '#c9772e',
    heavy: 1.1,
    scarred: false,
  },
  // BONEGRINDER: liver-dark, ash hand-print on the gut, double belt.
  ogre_champion: {
    design: 'champion',
    hide: '#96685a',
    belly: '#b08a74',
    hair: '#2e2620',
    wrap: '#4e3c2c',
    ...BASE,
    paint: '#8d8d84',
    heavy: 1.25,
    scarred: true,
  },
};

/** Knuth spread — consecutive camp eids must scatter (the gnoll law). */
const hash8 = (seed: number, k: number): number =>
  ((((seed + k * 131) * 2654435761) >>> 8) & 0xff) / 255;

const LOOK_CACHE = new Map<string, OgreLook>();

/**
 * Resolve a def's look. Rank-and-file roll the hide cluster and the
 * scar; designs keep their coat and roll only warts and the trophy.
 */
export function ogreLook(defId: string, seed = 0): OgreLook {
  const key = `${defId}|${seed & 0xff}`;
  const hit = LOOK_CACHE.get(key);
  if (hit) return hit;
  const base = OGRE_LOOKS[defId] ?? OGRE_LOOKS['ogre']!;
  let look: OgreLook = { ...base, seed };
  if (base.design === 'brute' || base.design === 'hurler') {
    const c = OGRE_CLUSTERS[(((seed * 2654435761) >>> 8) & 3)]!;
    look = { ...look, ...c, scarred: hash8(seed, 7) > 0.62 };
  }
  LOOK_CACHE.set(key, look);
  return look;
}

// ------------------------------------------------------------------ sims

/**
 * THE GUT KEEPS ITS OWN TIME — a one-mass spring in anchor-local TILE
 * space (the ear-sim contract: the camera never enters the math, zoom
 * normalizes through the scale). The mass lags the painted anchor's
 * travel, so the walk bob, the strike lunge, and the sudden stop all
 * arrive as honest jiggle — heavy-flesh tier: ONE bounce, then home.
 * Never a pose.
 */
export class GutSim {
  private dx = 0;
  private dy = 0;
  private vx = 0;
  private vy = 0;
  private ax0 = Number.NaN;
  private ay0 = Number.NaN;
  private t0 = Number.NaN;
  /** Renderer full-rate cue — true while the mass is visibly moving. */
  restless = false;
  constructor(private readonly seed: number) {}

  /** Tick at the painted torso anchor (screen px) — returns px offsets.
   *  Timing rides the wall clock (the ear-sim contract: RigPose has no
   *  dt, and a sim that trusts frame cadence stutters on a dropped
   *  frame anyway). */
  update(ax: number, ay: number, sPx: number, nowMs: number): { dx: number; dy: number } {
    const dt = Number.isFinite(this.t0) ? (nowMs - this.t0) / 1000 : 1 / 60;
    this.t0 = nowMs;
    const inv = 1 / Math.max(1e-3, sPx);
    // First sight / teleport: snap to rest — a gut never whips across
    // the map (the shared sim contract).
    if (!Number.isFinite(this.ax0) || Math.hypot(ax - this.ax0, ay - this.ay0) * inv > 2.2 || dt <= 0) {
      this.ax0 = ax;
      this.ay0 = ay;
      this.dx = this.dy = this.vx = this.vy = 0;
      this.restless = false;
      return { dx: 0, dy: 0 };
    }
    const mvx = (ax - this.ax0) * inv;
    const mvy = (ay - this.ay0) * inv;
    this.ax0 = ax;
    this.ay0 = ay;
    // The world moves; the mass stays put a beat — the shove.
    this.dx -= mvx;
    this.dy -= mvy;
    // Heavy flesh: firm spring, near-critical damping — one overshoot.
    const k = 130;
    const c = 14;
    const step = Math.min(0.05, Math.max(1e-4, dt));
    this.vx += (-k * this.dx - c * this.vx) * step;
    this.vy += (-k * this.dy - c * this.vy) * step;
    this.dx += this.vx * step;
    this.dy += this.vy * step;
    // THE STRENGTH LAW, spoken adipose: flesh sways, it never slides
    // off the skeleton — hard cap after integration.
    const cap = 0.085;
    const m = Math.hypot(this.dx, this.dy);
    if (m > cap) {
      this.dx *= cap / m;
      this.dy *= cap / m;
    }
    this.restless = Math.hypot(this.vx, this.vy) > 0.02 || m > 0.006;
    // Vertical reads louder than lateral on a bird's-eye body.
    return { dx: this.dx * sPx * 0.7, dy: this.dy * sPx };
  }
}

/** THE ONE REST — what a settled gut is: exactly nothing. */
export const GUT_REST = { dx: 0, dy: 0 } as const;

/** Trophy pendant chain: root + two free nodes, anchor-local px. */
export interface PendantChain {
  pts: Array<{ x: number; y: number }>;
}

const PENDANT_SEGS = 2;

/** THE ONE REST — the thong hangs straight down, knot to trophy. */
export function pendantRest(lenPx: number): PendantChain {
  const seg = lenPx / PENDANT_SEGS;
  return { pts: [{ x: 0, y: 0 }, { x: 0, y: seg }, { x: 0, y: seg * 2 }] };
}

/**
 * THE TROPHY RIDES THE STRIDE — a two-segment verlet pendant on the
 * cape contract: anchor-local, gravity down the screen, the anchor's
 * travel arriving as an inertial shove. Damping sits between cloth
 * and tail — a knotted skull flutters less than a hem and settles
 * faster than a brush comes home.
 */
export class PendantSim {
  private readonly nx: number[] = [];
  private readonly ny: number[] = [];
  private readonly px: number[] = [];
  private readonly py: number[] = [];
  private ax0 = Number.NaN;
  private ay0 = Number.NaN;
  private t0 = Number.NaN;
  restless = false;
  readonly phase: number;
  constructor(seed: number) {
    this.phase = (seed % 89) / 89;
    for (let i = 0; i <= PENDANT_SEGS; i++) {
      this.nx.push(0);
      this.ny.push(0);
      this.px.push(0);
      this.py.push(0);
    }
  }

  /** Tick at the knot's painted position (screen px); wall-clock time. */
  update(ax: number, ay: number, lenPx: number, nowMs: number): PendantChain {
    const dt = Number.isFinite(this.t0) ? (nowMs - this.t0) / 1000 : 1 / 60;
    this.t0 = nowMs;
    const seg = lenPx / PENDANT_SEGS;
    if (!Number.isFinite(this.ax0) || Math.hypot(ax - this.ax0, ay - this.ay0) > lenPx * 6 || dt <= 0) {
      // Snap to rest on first sight / teleport.
      this.ax0 = ax;
      this.ay0 = ay;
      for (let i = 0; i <= PENDANT_SEGS; i++) {
        this.nx[i] = 0;
        this.ny[i] = seg * i;
        this.px[i] = this.nx[i]!;
        this.py[i] = this.ny[i]!;
      }
      this.restless = false;
      return { pts: this.chainPts() };
    }
    const mvx = ax - this.ax0;
    const mvy = ay - this.ay0;
    this.ax0 = ax;
    this.ay0 = ay;
    const step = Math.min(0.05, Math.max(1e-4, dt));
    const damp = 0.88;
    const grav = lenPx * 26 * step * step;
    let travel = 0;
    for (let i = 1; i <= PENDANT_SEGS; i++) {
      // The anchor moved out from under the mass — the shove.
      const vx = (this.nx[i]! - this.px[i]!) * damp - mvx * 0.55;
      const vy = (this.ny[i]! - this.py[i]!) * damp - mvy * 0.55;
      this.px[i] = this.nx[i]!;
      this.py[i] = this.ny[i]!;
      this.nx[i]! += vx;
      this.ny[i]! += vy + grav;
      travel += Math.abs(vx) + Math.abs(vy);
    }
    // Distance constraints root-out, twice — short chain, stiff thong.
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 1; i <= PENDANT_SEGS; i++) {
        const dx = this.nx[i]! - this.nx[i - 1]!;
        const dy = this.ny[i]! - this.ny[i - 1]!;
        const d = Math.hypot(dx, dy) || 1e-4;
        const f = (d - seg) / d;
        if (i === 1) {
          this.nx[i]! -= dx * f;
          this.ny[i]! -= dy * f;
        } else {
          this.nx[i]! -= dx * f * 0.5;
          this.ny[i]! -= dy * f * 0.5;
          this.nx[i - 1]! += dx * f * 0.5;
          this.ny[i - 1]! += dy * f * 0.5;
        }
      }
    }
    // A thong swings, it never climbs: hard cap at ±1.15 rad off
    // vertical, applied AFTER the constraint passes (the ear law).
    for (let i = 1; i <= PENDANT_SEGS; i++) {
      const dx = this.nx[i]! - this.nx[i - 1]!;
      const dy = this.ny[i]! - this.ny[i - 1]!;
      const ang = Math.atan2(dx, dy);
      const cap = 1.15;
      if (Math.abs(ang) > cap || dy < 0) {
        const a = Math.max(-cap, Math.min(cap, ang));
        const d = Math.hypot(dx, dy) || 1e-4;
        this.nx[i] = this.nx[i - 1]! + Math.sin(a) * d;
        this.ny[i] = this.ny[i - 1]! + Math.cos(a) * d;
      }
    }
    this.restless = travel > lenPx * 0.01;
    return { pts: this.chainPts() };
  }

  private chainPts(): Array<{ x: number; y: number }> {
    const out: Array<{ x: number; y: number }> = [];
    for (let i = 0; i <= PENDANT_SEGS; i++) out.push({ x: this.nx[i]!, y: this.ny[i]! });
    return out;
  }
}

// ------------------------------------------------------------ the body

export interface OgreBodyFrame {
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
  /** 0..1 menace ramp (Cast/Attack wind) — the bellows fill. */
  flare: number;
  /**
   * THE WEIGHT CROSSES (−1..1): the walk's lateral rock — the mass
   * moves onto the planted column each stride (the heaviest walkers
   * sway; a bounce would lie about the tonnage). Derived from the
   * live foot lifts by the rig; 0 at rest and in stateless callers.
   */
  sway: number;
  /** GutSim output in px, or null → THE ONE REST (posters, sheets). */
  gut: { dx: number; dy: number } | null;
  /** PendantSim chain, or null → the rest hang. */
  pendant: PendantChain | null;
}

/**
 * THE PROJECTOR — one body-space camera for every station. F is the
 * facing, L its left hand, Z straight up; the return is a torso-local
 * screen offset (px) plus the depth term that owns paint order:
 * depth > 0 leans toward the viewer.
 */
function P(
  f: OgreBodyFrame,
  fwd: number,
  lat: number,
  z: number,
): { x: number; y: number; depth: number } {
  return {
    x: (fwd * f.fx - lat * f.fy) * f.s,
    y: (fwd * f.fy + lat * f.fx) * YK * f.s - z * f.s,
    depth: fwd * f.fy + lat * f.fx,
  };
}

/** One fleshy mass: chamfered block + FORM SPLIT + crown + under-shade. */
function fleshMass(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  cut: number,
  hide: string,
  hurt: boolean,
  crownK = 0.2,
): void {
  ctx.fillStyle = hurt ? '#ffffff' : hide;
  ctx.beginPath();
  chamferRect(ctx, x - w, y - h, w * 2, h * 2, cut);
  ctx.fill();
  if (hurt) return;
  ctx.save();
  ctx.beginPath();
  chamferRect(ctx, x - w, y - h, w * 2, h * 2, cut);
  ctx.clip();
  ctx.fillStyle = shade(hide, -11);
  ctx.fillRect(x, y - h, w, h * 2);
  ctx.fillStyle = shade(hide, 10);
  ctx.fillRect(x - w, y - h, w * 2, h * 2 * crownK);
  ctx.fillStyle = shade(hide, -16);
  ctx.fillRect(x - w, y + h * 0.74, w * 2, h * 0.26);
  ctx.restore();
}

/**
 * The giant's torso — called from drawHumanoid's dialect switch in the
 * torso-local frame (origin at the hip line). Stations are projected;
 * paint order is depth order; the rig paints arms and head after.
 */
export function paintOgreBody(ctx: CanvasRenderingContext2D, ogr: OgreLook, f: OgreBodyFrame): void {
  const { s, th, hurt, nowMs } = f;
  const hv = ogr.heavy;
  const seed = ogr.seed ?? 0;
  const hide = hurt ? '#ffffff' : ogr.hide;

  // The stations, projected once — then THE WEIGHT CROSSES: the whole
  // stack rocks toward the planted foot, hips loudest, crown least
  // (an inverted pendulum leans from the bottom; the top counters).
  const swayPx = f.sway * s;
  const stGut = P(f, 0.115, 0, 0);
  const stChest = P(f, 0.02, 0, 0);
  const stHump = P(f, -0.13, 0, 0);
  const stHair = P(f, -0.175, 0, 0);
  stGut.x += swayPx * 0.034;
  stChest.x += swayPx * 0.02;
  stHump.x += swayPx * 0.012;
  stHair.x += swayPx * 0.012;

  // THE BREATH — the sleeping hill at idle, the bellows on a wind:
  // one analytic curve, sim-safe (a null gut still breathes).
  const breath = (1 - f.runF * 0.75) * Math.sin(nowMs / 950 + seed * 0.7);
  const gutDx = (f.gut?.dx ?? 0);
  const gutDy = (f.gut?.dy ?? 0);

  // Measures. THE GUT OUT-WIDTHS THE SHOULDERS — the upward triangle.
  const gutW = f.ww * 1.24 * (0.92 + 0.16 * hv) * (1 + 0.012 * breath - 0.05 * f.flare);
  const gutH = th * 0.52 * (1 + 0.018 * breath);
  const gutY = -th * 0.34 + stGut.y + gutDy;
  const gutX = stGut.x + gutDx;
  const chestW = f.tw * 0.94;
  const chestH = th * 0.34 * (1 + 0.1 * f.flare);
  const chestY = -th * 0.78 + stChest.y - th * 0.04 * f.flare;
  const humpW = f.tw * 0.78;
  const humpH = th * 0.3;
  const humpY = -th * 1.02 + stHump.y;

  type Layer = { depth: number; paint: () => void };
  const layers: Layer[] = [];

  // ---- THE HUMP: the boulder of muscle the skull sinks in front of.
  layers.push({
    depth: stHump.depth,
    paint: () => {
      fleshMass(ctx, stHump.x, humpY, humpW, humpH, s * 0.09, ogr.hide, hurt, 0.3);
    },
  });

  // ---- THE HAIR MAT: the greasy fall draped over the hump — crown to
  // nape, ragged hem. It trails the facing by construction.
  layers.push({
    depth: stHair.depth,
    paint: () => {
      if (hurt) return;
      ctx.fillStyle = ogr.hair;
      const hx = stHair.x;
      const top = humpY - humpH * 0.9;
      const w = humpW * 0.88;
      ctx.beginPath();
      ctx.moveTo(hx - w, top + th * 0.06);
      ctx.quadraticCurveTo(hx, top - th * 0.05, hx + w, top + th * 0.06);
      // The ragged hem: four locks, mismatched on purpose.
      const hem = top + th * 0.34;
      for (let i = 0; i < 4; i++) {
        const t = 1 - (i / 3) * 2;
        const drop = th * (0.05 + 0.07 * hash8(seed, 20 + i));
        ctx.lineTo(hx + w * t - w * 0.12, hem + drop);
        ctx.lineTo(hx + w * t - w * 0.21, hem - th * 0.02);
      }
      ctx.closePath();
      ctx.fill();
    },
  });

  // ---- THE CHEST: narrower than the gut below it — the slab the
  // bellows fill lifts.
  layers.push({
    depth: stChest.depth,
    paint: () => {
      fleshMass(ctx, stChest.x, chestY, chestW, chestH, s * 0.1, ogr.hide, hurt, 0.26);
    },
  });

  // ---- THE GUT: the widest station of the body, and the live one.
  layers.push({
    depth: stGut.depth,
    paint: () => {
      ctx.fillStyle = hide;
      ctx.beginPath();
      ctx.ellipse(gutX, gutY, gutW, gutH, 0, 0, Math.PI * 2);
      ctx.fill();
      if (!hurt) {
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(gutX, gutY, gutW, gutH, 0, 0, Math.PI * 2);
        ctx.clip();
        // FORM SPLIT + the belly front plane sliding with the yaw.
        ctx.fillStyle = shade(ogr.hide, -11);
        ctx.fillRect(gutX, gutY - gutH, gutW, gutH * 2);
        const bellyX = gutX + f.fx * gutW * 0.22;
        ctx.fillStyle = hurt ? '#ffffff' : ogr.belly;
        ctx.globalAlpha = 1 - f.backK * 0.85;
        ctx.beginPath();
        ctx.ellipse(bellyX, gutY + gutH * 0.12, gutW * 0.62 * (1 - 0.5 * f.profileK), gutH * 0.72, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        // The navel — one dark tick, front plane only.
        if (f.backK < 0.4) {
          ctx.fillStyle = shade(ogr.hide, -26);
          ctx.beginPath();
          ctx.ellipse(bellyX, gutY + gutH * 0.34, s * 0.018, s * 0.026, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        // The bellower's drum ring, painted ON the instrument.
        if (ogr.design === 'bellower' && f.backK < 0.5) {
          ctx.strokeStyle = ogr.paint;
          ctx.lineWidth = Math.max(1.5, s * 0.024);
          ctx.globalAlpha = 0.8;
          ctx.beginPath();
          ctx.ellipse(bellyX, gutY + gutH * 0.08, gutW * 0.44 * (1 - 0.5 * f.profileK), gutH * 0.5, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        // The champion's ash hand-print — the camp's own heraldry,
        // faded like old paint (a hot alpha read as a wound).
        if (ogr.design === 'champion' && f.backK < 0.4) {
          ctx.fillStyle = ogr.paint;
          ctx.globalAlpha = 0.32;
          ctx.beginPath();
          ctx.ellipse(bellyX - s * 0.02, gutY - gutH * 0.1, s * 0.05, s * 0.06, 0, 0, Math.PI * 2);
          ctx.fill();
          for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.ellipse(bellyX - s * 0.065 + i * s * 0.032, gutY - gutH * 0.1 - s * 0.065, s * 0.012, s * 0.03, (i - 1.5) * 0.16, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
        }
        // Seeded warts — two or three, never symmetric.
        ctx.fillStyle = shade(ogr.hide, -14);
        const nw = 2 + (((seed * 2654435761) >>> 12) & 1);
        for (let i = 0; i < nw; i++) {
          const wx = gutX + (hash8(seed, 30 + i) * 2 - 1) * gutW * 0.7;
          const wy = gutY + (hash8(seed, 34 + i) * 2 - 1) * gutH * 0.6;
          ctx.beginPath();
          ctx.arc(wx, wy, s * (0.012 + 0.008 * hash8(seed, 38 + i)), 0, Math.PI * 2);
          ctx.fill();
        }
        // The crown band — the top plane the camera owns.
        ctx.fillStyle = shade(ogr.hide, 10);
        ctx.fillRect(gutX - gutW, gutY - gutH, gutW * 2, gutH * 0.34);
        ctx.fillStyle = shade(ogr.hide, -16);
        ctx.fillRect(gutX - gutW, gutY + gutH * 0.68, gutW * 2, gutH * 0.32);
        ctx.restore();
      }
    },
  });

  // ---- THE WRAP: the pelt cinched under the overhang — ragged hem,
  // rope, knot, and the shoulder strap crossing the front plane.
  layers.push({
    depth: stGut.depth + 0.05,
    paint: () => {
      if (hurt) return;
      const wy = gutY + gutH * 0.62;
      const wrapW = gutW * 0.92;
      const wrapH = th * 0.24;
      ctx.fillStyle = ogr.wrap;
      ctx.beginPath();
      ctx.moveTo(gutX - wrapW, wy - wrapH * 0.3);
      ctx.lineTo(gutX + wrapW, wy - wrapH * 0.3);
      // The torn hem: five teeth, seeded depths.
      for (let i = 0; i < 5; i++) {
        const t = 1 - (i / 4) * 2;
        const drop = wrapH * (0.5 + 0.5 * hash8(seed, 44 + i));
        ctx.lineTo(gutX + wrapW * t - wrapW * 0.1, wy + drop);
        ctx.lineTo(gutX + wrapW * t - wrapW * 0.2, wy + wrapH * 0.28);
      }
      ctx.closePath();
      ctx.fill();
      // Hem shade under the gut's overhang — the wrap sits UNDER flesh.
      ctx.fillStyle = shade(ogr.wrap, -14);
      ctx.fillRect(gutX - wrapW, wy - wrapH * 0.3, wrapW * 2, wrapH * 0.2);
      // The rope: one lap (two for the Bonegrinder), knot on the lead.
      ctx.strokeStyle = ogr.rope;
      ctx.lineWidth = Math.max(1.5, s * 0.026);
      const laps = ogr.design === 'champion' ? 2 : 1;
      for (let i = 0; i < laps; i++) {
        ctx.beginPath();
        ctx.moveTo(gutX - wrapW, wy - wrapH * 0.16 + i * s * 0.032);
        ctx.quadraticCurveTo(gutX, wy - wrapH * 0.02 + i * s * 0.032, gutX + wrapW, wy - wrapH * 0.16 + i * s * 0.032);
        ctx.stroke();
      }
      const knotX = gutX + f.lead * wrapW * 0.55;
      ctx.fillStyle = shade(ogr.rope, -10);
      ctx.beginPath();
      ctx.arc(knotX, wy - wrapH * 0.06, s * 0.03, 0, Math.PI * 2);
      ctx.fill();
    },
  });

  // ---- THE TROPHY: seed-picked, hung off the knot on its verlet (or
  // THE ONE REST). Its depth follows the knot's side of the body.
  const knotSide = P(f, 0.1, -f.lead * 0.42, 0);
  layers.push({
    depth: knotSide.depth + 0.02,
    paint: () => {
      const rootX = gutX + f.lead * gutW * 0.62;
      const rootY = gutY + gutH * 0.58;
      const len = s * 0.16;
      const chain = f.pendant ?? pendantRest(len);
      const tip = chain.pts[chain.pts.length - 1]!;
      const mid = chain.pts[1]!;
      // The thong.
      ctx.strokeStyle = hurt ? '#ffffff' : shade(ogr.rope, -6);
      ctx.lineWidth = Math.max(1, s * 0.014);
      ctx.beginPath();
      ctx.moveTo(rootX, rootY);
      ctx.quadraticCurveTo(rootX + mid.x, rootY + mid.y, rootX + tip.x, rootY + tip.y);
      ctx.stroke();
      // The trophy itself: skull, kettle, or gnawed bone — the sack's
      // one true prize, worn.
      const kind = ((seed * 2654435761) >>> 16) % 3;
      const tx = rootX + tip.x;
      const ty = rootY + tip.y + s * 0.028;
      ctx.fillStyle = hurt ? '#ffffff' : kind === 1 ? '#6d6a5c' : ogr.teeth;
      if (kind === 0) {
        // A skull the size of a fist (its owner's, not the ogre's).
        ctx.beginPath();
        ctx.arc(tx, ty, s * 0.032, 0, Math.PI * 2);
        ctx.fill();
        if (!hurt) {
          ctx.fillStyle = shade(ogr.teeth, -30);
          ctx.beginPath();
          ctx.arc(tx - s * 0.011, ty - s * 0.004, s * 0.007, 0, Math.PI * 2);
          ctx.arc(tx + s * 0.011, ty - s * 0.004, s * 0.007, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (kind === 1) {
        // The dented kettle — junk treasure, proudly kept.
        ctx.beginPath();
        chamferRect(ctx, tx - s * 0.03, ty - s * 0.026, s * 0.06, s * 0.052, s * 0.012);
        ctx.fill();
        if (!hurt) {
          ctx.fillStyle = shade('#6d6a5c', 14);
          ctx.fillRect(tx - s * 0.03, ty - s * 0.026, s * 0.06, s * 0.014);
        }
      } else {
        // The gnawed bone: supper that became jewelry. Worn ivory a
        // step down from the teeth — the first cut's bright stick
        // read as a stray white slash on the wrap.
        ctx.save();
        ctx.translate(tx, ty);
        ctx.rotate(0.6);
        ctx.fillStyle = hurt ? '#ffffff' : shade(ogr.teeth, -14);
        ctx.fillRect(-s * 0.007, -s * 0.028, s * 0.014, s * 0.056);
        ctx.beginPath();
        ctx.arc(0, -s * 0.03, s * 0.011, 0, Math.PI * 2);
        ctx.arc(0, s * 0.03, s * 0.011, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    },
  });

  // ---- The hurler's sling strap + hip pouch of stones.
  if (ogr.design === 'hurler') {
    const pouch = P(f, 0.02, f.lead * 0.5, 0);
    layers.push({
      depth: pouch.depth,
      paint: () => {
        if (hurt) return;
        // The strap crossing chest to hip — front-plane content.
        ctx.strokeStyle = shade(ogr.wrap, -8);
        ctx.lineWidth = Math.max(1.5, s * 0.03);
        ctx.beginPath();
        ctx.moveTo(stChest.x - f.lead * chestW * 0.5, chestY - chestH * 0.7);
        ctx.lineTo(gutX + f.lead * gutW * 0.72, gutY + gutH * 0.4);
        ctx.stroke();
        // The pouch, lumpy with tomorrow's ammunition.
        ctx.fillStyle = shade(ogr.wrap, -4);
        ctx.beginPath();
        ctx.ellipse(gutX + f.lead * gutW * 0.78, gutY + gutH * 0.55, s * 0.05, s * 0.06, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = shade(ogr.hide, -20);
        for (const [ox, oy] of [[-0.014, -0.02], [0.016, -0.008], [0.0, 0.018]] as const) {
          ctx.beginPath();
          ctx.arc(gutX + f.lead * gutW * 0.78 + ox * s, gutY + gutH * 0.55 + oy * s, s * 0.011, 0, Math.PI * 2);
          ctx.fill();
        }
      },
    });
  }

  // ---- The champion's bone pauldron-strap on the lead shoulder.
  if (ogr.design === 'champion') {
    const cap = P(f, 0, -f.lead * 0.44, 0);
    layers.push({
      depth: cap.depth,
      paint: () => {
        if (hurt) return;
        // Seated INBOARD and low — the first cut's outboard cap
        // drifted off the silhouette at the turned bands.
        const cx = stChest.x + f.lead * chestW * 0.62;
        const cy = chestY - chestH * 0.32;
        ctx.fillStyle = shade(ogr.teeth, -8);
        ctx.beginPath();
        chamferRect(ctx, cx - s * 0.05, cy - s * 0.036, s * 0.1, s * 0.072, s * 0.018);
        ctx.fill();
        ctx.fillStyle = shade(ogr.teeth, -26);
        for (const o of [-0.026, 0.002, 0.03] as const) {
          ctx.fillRect(cx + o * s, cy - s * 0.032, s * 0.011, s * 0.064);
        }
      },
    });
  }

  // Paint far to near — the projection owns the sandwich.
  layers.sort((a, b) => a.depth - b.depth);
  for (const l of layers) l.paint();
}

// ------------------------------------------------------------ the head

/** The head frame is the shared dialect contract (KoboldHeadFrame). */
interface OgreHeadFrame {
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
  gape: number;
}

/**
 * THE SLOPE AND THE UNDERBITE. Face-on through ¾: the small skull
 * falls back from the brow ledge; the jaw out-widths it and leads it;
 * two lower teeth stand proud. Past profileK 0.9 the head swaps for
 * the AUTHORED TRUE PROFILE (one closed silhouette, one ear, one eye,
 * one tusk). From behind: hair mat, ear backs, occiput — no face.
 */
export function paintOgreHead(
  ctx: CanvasRenderingContext2D,
  ogr: OgreLook,
  f: OgreHeadFrame,
  seed: number,
): void {
  const { s, headX, headY, hw, hh, fx, profileK, backK, lead, hurt, gape } = f;
  const hide = hurt ? '#ffffff' : ogr.hide;
  const back = backK > 0.55;

  // The roar tips the whole skull back — analytic, one curve, LOUD
  // (the first cut's 0.12 vanished at sheet zoom; a giant's roar
  // moves the giant).
  const roarLift = gape * hh * 0.28;

  if (profileK > 0.9 && !back) {
    ogreProfileHead(ctx, ogr, f, seed);
    return;
  }

  // --- the torn round ears: small on a giant — the scale-teller.
  // Both paint; the far one honestly sinks at the turned bands.
  const earR = hw * 0.3;
  for (const side of [-1, 1] as const) {
    const sink = side === lead ? 0 : profileK * earR * 0.8;
    const ex = headX + side * (hw * 0.94 - profileK * hw * 0.3 * (side === lead ? -0.2 : 1));
    const ey = headY - hh * 0.1 + sink * 0.4;
    ctx.fillStyle = hurt ? '#ffffff' : shade(ogr.hide, back ? -8 : -4);
    ctx.beginPath();
    ctx.arc(ex, ey, earR * (1 - 0.3 * (side === lead ? 0 : profileK)), 0, Math.PI * 2);
    ctx.fill();
    if (!hurt && ogr.scarred && side === lead) {
      // The torn notch — one bite some smaller thing got in first.
      ctx.fillStyle = shade(ogr.hide, -30);
      ctx.beginPath();
      ctx.moveTo(ex + side * earR * 0.5, ey - earR * 0.7);
      ctx.lineTo(ex + side * earR * 1.05, ey - earR * 0.15);
      ctx.lineTo(ex + side * earR * 0.35, ey - earR * 0.1);
      ctx.closePath();
      ctx.fill();
    }
    if (!hurt && !back) {
      ctx.fillStyle = shade(ogr.hide, -18);
      ctx.beginPath();
      ctx.arc(ex + fx * earR * 0.2, ey + earR * 0.08, earR * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // --- THE JAW: wider than the skull, leading it in depth — and
  // painted a half-step LIGHTER than the hide, so the underbite
  // separates from the chest slab it hangs over (the gnoll muzzle
  // law: a leading volume must out-value its ground).
  const jw = hw * 1.16;
  const jhh = hh * 0.5;
  const jx = headX + fx * hw * 0.26;
  const jy = headY + hh * 0.46 + gape * hh * 0.55;
  ctx.fillStyle = hurt ? '#ffffff' : shade(ogr.hide, 6);
  ctx.beginPath();
  chamferRect(ctx, jx - jw, jy - jhh * 0.7, jw * 2, jhh * 1.6, hw * 0.24);
  ctx.fill();

  // --- THE SLOPE: the skull polygon — brow ledge forward, crown
  // falling BACK. Painted after the jaw so the underbite reads as the
  // jaw coming out from UNDER the face.
  const bx = headX + fx * hw * 0.34; // brow leads the facing
  const ox = headX - fx * hw * 0.42; // occiput trails it
  const browY = headY - hh * 0.28 - roarLift;
  const crownY = headY - hh * 0.98 - roarLift;
  ctx.fillStyle = hide;
  ctx.beginPath();
  ctx.moveTo(bx - hw * 0.78, browY + hh * 0.1);
  ctx.lineTo(bx + hw * 0.78, browY + hh * 0.1);
  ctx.lineTo(ox + hw * 0.62, crownY + hh * 0.16);
  ctx.lineTo(ox - hw * 0.62, crownY + hh * 0.16);
  ctx.closePath();
  ctx.fill();
  // Mid-face cheeks joining brow to jaw.
  ctx.beginPath();
  chamferRect(ctx, headX - hw * 0.84, browY, hw * 1.68, jy - jhh * 0.66 - browY, hw * 0.2);
  ctx.fill();

  if (!hurt) {
    // The crown plane — the 2.5D top the camera owns. Kept SHALLOW:
    // the first cut's fat band flattened the skull into a box lid.
    ctx.fillStyle = shade(ogr.hide, 6);
    ctx.beginPath();
    ctx.moveTo(ox - hw * 0.58, crownY + hh * 0.16);
    ctx.lineTo(ox + hw * 0.58, crownY + hh * 0.16);
    ctx.lineTo(ox + hw * 0.48, crownY + hh * 0.24);
    ctx.lineTo(ox - hw * 0.48, crownY + hh * 0.24);
    ctx.closePath();
    ctx.fill();
    // The hair mat: crown fall toward the occiput, always trailing.
    ctx.fillStyle = ogr.hair;
    ctx.beginPath();
    ctx.moveTo(ox - hw * 0.66, crownY + hh * 0.14);
    ctx.quadraticCurveTo(ox, crownY - hh * 0.1, ox + hw * 0.66, crownY + hh * 0.14);
    ctx.lineTo(ox + hw * 0.5 - fx * hw * 0.2, crownY + hh * 0.52);
    ctx.lineTo(ox - hw * 0.5 - fx * hw * 0.2, crownY + hh * 0.52);
    ctx.closePath();
    ctx.fill();
  }

  if (back) {
    // NO FACE FROM BEHIND: the occiput fold and the nape mat.
    if (!hurt) {
      ctx.fillStyle = shade(ogr.hide, -9);
      ctx.fillRect(headX - hw * 0.6, headY - hh * 0.1, hw * 1.2, hh * 0.5);
      ctx.fillStyle = ogr.hair;
      ctx.beginPath();
      ctx.moveTo(headX - hw * 0.55, headY - hh * 0.6);
      ctx.quadraticCurveTo(headX, headY - hh * 0.9, headX + hw * 0.55, headY - hh * 0.6);
      ctx.lineTo(headX + hw * 0.4, headY + hh * 0.3);
      ctx.lineTo(headX - hw * 0.4, headY + hh * 0.3);
      ctx.closePath();
      ctx.fill();
    }
    return;
  }

  if (!hurt) {
    // --- THE BROW LEDGE: one filled overhang — DARK and DEEP (the
    // first cut whispered at −13 and the face went empty at sheet
    // zoom). It knits down with the roar; an ogre is always slightly
    // angry, and roaring, it means it.
    const knit = hh * 0.07 * (1 + gape * 1.6);
    ctx.fillStyle = shade(ogr.hide, -24);
    ctx.beginPath();
    ctx.moveTo(bx - hw * 0.74, browY - hh * 0.04);
    ctx.lineTo(bx + hw * 0.74, browY - hh * 0.04);
    ctx.lineTo(bx + hw * 0.58, browY + hh * 0.18 + knit);
    ctx.lineTo(bx + hw * 0.12, browY + hh * 0.12 + knit * 1.5);
    ctx.lineTo(bx - hw * 0.12, browY + hh * 0.12 + knit * 1.5);
    ctx.lineTo(bx - hw * 0.58, browY + hh * 0.18 + knit);
    ctx.closePath();
    ctx.fill();

    // --- the pig eyes: bigger sockets, dead-dark pupils — mean and
    // READABLE, sunk under the ledge.
    const eyeY = browY + hh * 0.26 + knit * 0.5;
    for (const side of [-1, 1] as const) {
      const sk = side === lead ? 1 : 1 - profileK * 0.85;
      if (sk < 0.2) continue;
      const ex = bx + side * hw * 0.36 * (1 - profileK * 0.3);
      ctx.fillStyle = shade(ogr.hide, -32);
      ctx.beginPath();
      ctx.ellipse(ex, eyeY, hw * 0.17 * sk, hh * 0.11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1c130c';
      ctx.beginPath();
      ctx.arc(ex + fx * hw * 0.03, eyeY + hh * 0.01, hw * 0.06 * sk, 0, Math.PI * 2);
      ctx.fill();
    }

    // --- the nose: broad, flat, and low — a wide LIT wedge with two
    // deep nostril darks, never a button.
    const nx = bx + fx * hw * 0.12;
    const nyy = eyeY + hh * 0.22;
    ctx.fillStyle = shade(ogr.hide, 10);
    ctx.beginPath();
    ctx.moveTo(nx - hw * 0.26, nyy + hh * 0.12);
    ctx.lineTo(nx - hw * 0.11, nyy - hh * 0.1);
    ctx.lineTo(nx + hw * 0.11, nyy - hh * 0.1);
    ctx.lineTo(nx + hw * 0.26, nyy + hh * 0.12);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = shade(ogr.hide, -34);
    for (const sd of [-1, 1] as const) {
      ctx.beginPath();
      ctx.ellipse(nx + sd * hw * 0.12, nyy + hh * 0.06, hw * 0.052, hh * 0.038, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // --- THE UNDERBITE: the lip seam on the jaw, and the two lower
    // teeth standing PROUD of it even shut — TALL, with dark root
    // seams so the row reads at distance. The gape opens the maw and
    // the roar shows the whole argument.
    const lipY = jy - jhh * 0.34;
    if (gape > 0.12) {
      ctx.fillStyle = '#2a1a14';
      ctx.beginPath();
      chamferRect(ctx, jx - jw * 0.62, lipY - hh * 0.34 * gape, jw * 1.24, hh * 0.34 * gape + hh * 0.18, hw * 0.1);
      ctx.fill();
    } else {
      ctx.strokeStyle = shade(ogr.hide, -30);
      ctx.lineWidth = Math.max(1.2, s * 0.016);
      ctx.beginPath();
      ctx.moveTo(jx - jw * 0.56, lipY);
      ctx.quadraticCurveTo(jx, lipY + hh * 0.06, jx + jw * 0.56, lipY);
      ctx.stroke();
    }
    const teethN = gape > 0.12 ? 4 : 2;
    for (let i = 0; i < teethN; i++) {
      const t = teethN === 2 ? (i === 0 ? -1 : 1) * 0.34 : -0.51 + (i / (teethN - 1)) * 1.02;
      const tx = jx + t * jw * 0.8;
      const th2 = hh * (0.2 + 0.06 * ((i * 7 + seed) % 3 === 0 ? 1 : 0)) * (1 + gape * 0.4);
      ctx.fillStyle = ogr.teeth;
      ctx.beginPath();
      ctx.moveTo(tx - hw * 0.065, lipY + hh * 0.04);
      ctx.lineTo(tx, lipY - th2);
      ctx.lineTo(tx + hw * 0.065, lipY + hh * 0.04);
      ctx.closePath();
      ctx.fill();
      // The root seam seats the tooth IN the jaw, not on it.
      ctx.strokeStyle = shade(ogr.teeth, -32);
      ctx.lineWidth = Math.max(1, s * 0.008);
      ctx.beginPath();
      ctx.moveTo(tx - hw * 0.05, lipY + hh * 0.03);
      ctx.lineTo(tx + hw * 0.05, lipY + hh * 0.03);
      ctx.stroke();
    }

    // --- the jaw underside plane + jowl chamfer seams: the corners
    // of the jaw fold like flesh, and the mass turns under.
    ctx.fillStyle = shade(ogr.hide, -16);
    ctx.fillRect(jx - jw * 0.9, jy + jhh * 0.56, jw * 1.8, jhh * 0.34);
    ctx.strokeStyle = shade(ogr.hide, -20);
    ctx.lineWidth = Math.max(1, s * 0.012);
    for (const sd of [-1, 1] as const) {
      ctx.beginPath();
      ctx.moveTo(jx + sd * jw * 0.72, lipY + hh * 0.02);
      ctx.lineTo(jx + sd * jw * 0.9, jy + jhh * 0.4);
      ctx.stroke();
    }

    // --- the scar: one old pale seam across the cheek, rolled.
    if (ogr.scarred) {
      ctx.strokeStyle = shade(ogr.belly, -4);
      ctx.lineWidth = Math.max(1, s * 0.01);
      const scx = bx - lead * hw * 0.42;
      ctx.beginPath();
      ctx.moveTo(scx - hw * 0.08, browY + hh * 0.16);
      ctx.lineTo(scx + hw * 0.06, jy - jhh * 0.6);
      ctx.stroke();
    }
  }
}

/**
 * THE TRUE PROFILE — authored side silhouette, one closed outline:
 * nape → sloped crown rising to the brow crest → brow step → flat
 * nose → the lip notch — and then the JAW, jutting past the nose's
 * plumb line with one tusk standing up out of it. The underbite IS
 * the profile. One ear at the occiput, one hooded eye, the hair mat
 * falling behind. Blends never reach here (the gnoll law).
 */
function ogreProfileHead(
  ctx: CanvasRenderingContext2D,
  ogr: OgreLook,
  f: OgreHeadFrame,
  seed: number,
): void {
  void seed;
  const { s, headX, headY, hw, hh, fx, lead, hurt, gape } = f;
  const d = Math.sign(fx) || 1;
  const hide = hurt ? '#ffffff' : ogr.hide;
  const roarLift = gape * hh * 0.28;
  const jawDrop = gape * hh * 0.55;

  // Landmarks (x runs occiput → face along d). THE JUT IS THE READ:
  // the jaw's point runs a full 1.34 head-widths forward — past the
  // nose's plumb line by a third — and the whole silhouette exists
  // to deliver it (the first cut compressed to a loaf; never again).
  const occX = headX - d * hw * 0.82;
  const browX = headX + d * hw * 0.5;
  const noseX = headX + d * hw * 0.92;
  const jawX = headX + d * hw * 1.34;
  const crownY = headY - hh * 1.04 - roarLift;
  const browY = headY - hh * 0.34 - roarLift;
  const noseY = headY - hh * 0.02;
  const lipY = headY + hh * 0.34;
  const jawY = headY + hh * 0.86 + jawDrop;

  ctx.fillStyle = hide;
  ctx.beginPath();
  ctx.moveTo(occX + d * hw * 0.1, headY + hh * 0.66); // nape root
  ctx.lineTo(occX - d * hw * 0.08, headY - hh * 0.34);
  // THE SLOPE, in silhouette: one straight climb, no dome.
  ctx.lineTo(occX + d * hw * 0.46, crownY);
  ctx.lineTo(browX - d * hw * 0.08, browY - hh * 0.14);
  // The brow step: a real cliff, not a bevel.
  ctx.lineTo(browX + d * hw * 0.2, browY + hh * 0.1);
  // The flat nose, running out — short; the jaw owns the reach.
  ctx.lineTo(noseX, noseY);
  ctx.lineTo(noseX - d * hw * 0.02, lipY - hh * 0.1 + jawDrop * 0.3);
  // The lip notch — and then the JUT, low and far.
  ctx.lineTo(jawX, lipY + hh * 0.16 + jawDrop);
  ctx.lineTo(jawX - d * hw * 0.2, jawY);
  // The masseter falls back into the neckless shoulder line.
  ctx.lineTo(occX + d * hw * 0.34, jawY + hh * 0.04);
  ctx.closePath();
  ctx.fill();

  if (hurt) return;

  // The hair mat: crown to nape, a real mane's worth — the dark mass
  // that seats the slope against the hump.
  ctx.fillStyle = ogr.hair;
  ctx.beginPath();
  ctx.moveTo(occX + d * hw * 0.44, crownY - hh * 0.04);
  ctx.quadraticCurveTo(occX - d * hw * 0.42, crownY + hh * 0.16, occX - d * hw * 0.34, headY + hh * 0.44);
  ctx.lineTo(occX + d * hw * 0.12, headY + hh * 0.3);
  ctx.lineTo(occX + d * hw * 0.2, crownY + hh * 0.26);
  ctx.closePath();
  ctx.fill();

  // ONE ear at the occiput, torn if scarred.
  const earR = hw * 0.28;
  const ex = occX + d * hw * 0.3;
  const ey = headY - hh * 0.1;
  ctx.fillStyle = shade(ogr.hide, -4);
  ctx.beginPath();
  ctx.arc(ex, ey, earR, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = shade(ogr.hide, -20);
  ctx.beginPath();
  ctx.arc(ex + d * earR * 0.18, ey + earR * 0.1, earR * 0.42, 0, Math.PI * 2);
  ctx.fill();
  if (ogr.scarred && lead === d) {
    ctx.fillStyle = shade(ogr.hide, -30);
    ctx.beginPath();
    ctx.moveTo(ex + earR * 0.2, ey - earR * 0.9);
    ctx.lineTo(ex + earR * 0.75, ey - earR * 0.25);
    ctx.lineTo(ex + earR * 0.1, ey - earR * 0.3);
    ctx.closePath();
    ctx.fill();
  }

  // The brow shade cliff and ONE hooded eye sunk under it.
  ctx.fillStyle = shade(ogr.hide, -24);
  ctx.beginPath();
  ctx.moveTo(browX - d * hw * 0.34, browY - hh * 0.08);
  ctx.lineTo(browX + d * hw * 0.18, browY + hh * 0.02);
  ctx.lineTo(browX + d * hw * 0.04, browY + hh * 0.16);
  ctx.lineTo(browX - d * hw * 0.34, browY + hh * 0.1);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = shade(ogr.hide, -32);
  ctx.beginPath();
  ctx.ellipse(browX - d * hw * 0.08, browY + hh * 0.2, hw * 0.12, hh * 0.09, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1c130c';
  ctx.beginPath();
  ctx.arc(browX - d * hw * 0.05, browY + hh * 0.21, hw * 0.055, 0, Math.PI * 2);
  ctx.fill();

  // ONE nostril dark on the flat nose plane.
  ctx.fillStyle = shade(ogr.hide, -32);
  ctx.beginPath();
  ctx.ellipse(noseX - d * hw * 0.1, noseY + hh * 0.1, hw * 0.05, hh * 0.034, 0, 0, Math.PI * 2);
  ctx.fill();

  // The grin seam back from the lip notch; the maw opens on the roar.
  ctx.strokeStyle = shade(ogr.hide, -30);
  ctx.lineWidth = Math.max(1.2, s * 0.015);
  ctx.beginPath();
  ctx.moveTo(jawX - d * hw * 0.12, lipY + hh * 0.08 + jawDrop * 0.6);
  ctx.quadraticCurveTo(headX + d * hw * 0.3, lipY + hh * 0.18 + jawDrop * 0.6, headX - d * hw * 0.02, lipY + hh * 0.12 + jawDrop * 0.6);
  ctx.stroke();
  if (gape > 0.12) {
    ctx.fillStyle = '#2a1a14';
    ctx.beginPath();
    ctx.moveTo(noseX - d * hw * 0.02, lipY - hh * 0.08 + jawDrop * 0.25);
    ctx.lineTo(jawX - d * hw * 0.06, lipY + hh * 0.08 + jawDrop * 0.85);
    ctx.lineTo(headX + d * hw * 0.2, lipY + hh * 0.12 + jawDrop * 0.7);
    ctx.closePath();
    ctx.fill();
  }
  // ONE tusk standing out of the jut — TALL: the profile's argument.
  ctx.fillStyle = ogr.teeth;
  ctx.beginPath();
  ctx.moveTo(jawX - d * hw * 0.36, lipY + hh * 0.14 + jawDrop * 0.7);
  ctx.lineTo(jawX - d * hw * 0.26, lipY - hh * 0.24 + jawDrop * 0.35);
  ctx.lineTo(jawX - d * hw * 0.14, lipY + hh * 0.16 + jawDrop * 0.7);
  ctx.closePath();
  ctx.fill();

  // The jaw underside: a NARROW dark band along the bottom edge only
  // — the first cut's broad pale quad read as a collar.
  ctx.fillStyle = shade(ogr.hide, -20);
  ctx.beginPath();
  ctx.moveTo(jawX - d * hw * 0.2, jawY - hh * 0.02);
  ctx.lineTo(occX + d * hw * 0.36, jawY + hh * 0.02);
  ctx.lineTo(occX + d * hw * 0.4, jawY - hh * 0.1);
  ctx.lineTo(jawX - d * hw * 0.24, jawY - hh * 0.12);
  ctx.closePath();
  ctx.fill();
}

// ------------------------------------------------------------ the limbs

/**
 * THE KNUCKLE HANG — called from drawArm's dialect switch with joints
 * the rig solved on the ogre's UNEQUAL bones. The taper is inverted:
 * the forearm out-girths the upper arm (the ape read), and the hand
 * is a ham with knuckle ticks, not a mitt.
 */
export function drawOgreArm(
  ctx: CanvasRenderingContext2D,
  ogr: OgreLook,
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
  void nowMs;
  const hv = 0.9 + 0.2 * ogr.heavy;
  const hide = hurt ? '#ffffff' : ogr.hide;
  ctx.lineCap = 'round';
  // Upper arm: heavy, but the SHORT bone.
  ctx.strokeStyle = hurt ? '#ffffff' : shade(ogr.hide, -3);
  ctx.lineWidth = Math.max(2, s * 0.14 * hv);
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(kx, ky);
  ctx.stroke();
  // Forearm: LONGER and THICKER — the inverted taper is the silhouette.
  ctx.strokeStyle = hide;
  ctx.lineWidth = Math.max(2, s * 0.155 * hv);
  ctx.beginPath();
  ctx.moveTo(kx, ky);
  ctx.lineTo(ex, ey);
  ctx.stroke();
  if (!hurt) {
    // The elbow crease — flesh folds, it never shows a joint ball.
    ctx.strokeStyle = shade(ogr.hide, -16);
    ctx.lineWidth = Math.max(1, s * 0.016);
    const adx = ex - sx;
    const ady = ey - sy;
    const al = Math.hypot(adx, ady) || 1;
    ctx.beginPath();
    ctx.moveTo(kx - (ady / al) * s * 0.05, ky + (adx / al) * s * 0.05);
    ctx.lineTo(kx + (ady / al) * s * 0.05, ky - (adx / al) * s * 0.05);
    ctx.stroke();
  }
  // THE HAM FIST: a knuckle block wider than the forearm — a half
  // step DARKER than the hide, so the far fist poking past the gut's
  // silhouette reads as knuckles, never as floating tick marks.
  const fr = s * 0.115 * hv;
  ctx.fillStyle = hurt ? '#ffffff' : shade(ogr.hide, -6);
  ctx.beginPath();
  chamferRect(ctx, ex - fr, ey - fr * 0.85, fr * 2, fr * 1.7, fr * 0.45);
  ctx.fill();
  if (!hurt) {
    // The lit top of the fist — QUIET (+7, half-depth): the first
    // cut's bright band read as a floating white tick at rest, where
    // the knuckle hang parks the fists at thigh height.
    ctx.fillStyle = shade(ogr.hide, 7);
    ctx.fillRect(ex - fr * 0.7, ey - fr * 0.75, fr * 1.4, fr * 0.28);
    ctx.strokeStyle = shade(ogr.hide, -18);
    ctx.lineWidth = Math.max(1, s * 0.013);
    for (const o of [-0.5, 0, 0.5] as const) {
      ctx.beginPath();
      ctx.moveTo(ex + fr * o - fr * 0.12, ey - fr * 0.38);
      ctx.lineTo(ex + fr * o + fr * 0.12, ey - fr * 0.3);
      ctx.stroke();
    }
    // The bellower's arm ring: one worn bone band hugging the
    // forearm — shaded down and cut to the stroke's own width, so it
    // reads as WORN, never as a floating white bar.
    if (ogr.design === 'bellower') {
      ctx.strokeStyle = shade(ogr.teeth, -18);
      ctx.lineWidth = Math.max(1.5, s * 0.022);
      const mx = kx + (ex - kx) * 0.55;
      const my = ky + (ey - ky) * 0.55;
      const ndx = -(ey - ky);
      const ndy = ex - kx;
      const nl = Math.hypot(ndx, ndy) || 1;
      ctx.beginPath();
      ctx.moveTo(mx - (ndx / nl) * s * 0.062, my - (ndy / nl) * s * 0.062);
      ctx.lineTo(mx + (ndx / nl) * s * 0.062, my + (ndy / nl) * s * 0.062);
      ctx.stroke();
    }
  }
  ctx.lineCap = 'butt';
}

/**
 * The giant footing: a bare flat slab a size past even the golem's,
 * four toe seams and three worn nail chips — the calluses of a body
 * that never met a boot it couldn't split.
 */
export function paintOgreFoot(
  ctx: CanvasRenderingContext2D,
  ogr: OgreLook,
  fxx: number,
  fyy: number,
  s: number,
  lead: number,
  hurt: boolean,
): void {
  const gv = 0.9 + 0.18 * ogr.heavy;
  ctx.fillStyle = hurt ? '#ffffff' : shade(ogr.hide, -4);
  ctx.beginPath();
  chamferRect(ctx, fxx - 0.115 * s * gv, fyy - 0.035 * s, 0.23 * s * gv, 0.07 * s, 0.026 * s);
  ctx.fill();
  if (hurt) return;
  // The ankle fold seats the shank on the slab.
  ctx.fillStyle = shade(ogr.hide, -10);
  ctx.beginPath();
  ctx.arc(fxx - lead * 0.03 * s, fyy - 0.04 * s, 0.034 * s, 0, Math.PI * 2);
  ctx.fill();
  // Toe seams — four, splitting the leading half.
  ctx.strokeStyle = shade(ogr.hide, -22);
  ctx.lineWidth = Math.max(1, 0.013 * s);
  for (const o of [-0.02, 0.004, 0.028] as const) {
    ctx.beginPath();
    ctx.moveTo(fxx + lead * 0.05 * s, fyy + o * s - 0.008 * s);
    ctx.lineTo(fxx + lead * 0.1 * s * gv, fyy + o * s);
    ctx.stroke();
  }
  // Worn nail chips past the leading edge — ivory, not claw.
  ctx.fillStyle = shade(ogr.teeth, -8);
  for (const o of [-0.03, -0.002, 0.028] as const) {
    ctx.beginPath();
    ctx.moveTo(fxx + lead * 0.1 * s * gv, fyy + o * s - 0.008 * s);
    ctx.lineTo(fxx + lead * 0.128 * s * gv, fyy + o * s + 0.002 * s);
    ctx.lineTo(fxx + lead * 0.1 * s * gv, fyy + o * s + 0.011 * s);
    ctx.closePath();
    ctx.fill();
  }
}
