/**
 * THE CHAMPION'S MARK — the victory banner staked where a camp broke.
 *
 * A knight's gonfalon on an iron-shod standard, taller than the rig
 * that earned it (~2.55 tiles against the body's ~1.15): dark ash
 * pole, forged spear finial, corded crossbar with hanging tassels,
 * and the cloth — a crimson hanging banner with a gold chief band
 * carrying the broken camp's danger pips, gold trim rails, and the
 * champion's laurel star at the field's heart.
 *
 * THE MOTION DOCTRINE applies whole:
 *  - The cloth is a SIMULATION, never a pose — a verlet spine on the
 *    cape lineage (world XYZ + real height, pinned crown, asymmetric
 *    stiffness so cloth hangs FROM the bar), painted through width
 *    rails. The crossbar tassels are the same sim, cut short.
 *  - Wind is the SHARED world front (grass.windAtInto) — the banner
 *    leans with the same gusts that comb the meadow around it.
 *  - The stake-in is ONE analytic curve (accelerating drop, then a
 *    damped-spring settle), a pure function of the frame clock: every
 *    viewer of one banner sees the same moment, and a null bornAt
 *    paints the settled standard exactly (lab sheets, welcome-time
 *    banners, and the long idle all share THE ONE REST).
 *  - All variation hashes the banner's seed: pole lean, cloth phase,
 *    rubble at the shoe. Math.random never appears.
 */

import type { WindSample } from './grass.js';

export interface Pt {
  x: number;
  y: number;
}

// ------------------------------------------------------------ geometry

/** Pole top (finial seat) in tiles of screen height above the shoe. */
export const TROPHY_POLE_H = 2.55;
/** Crossbar height — where the cloth crown pins. */
export const TROPHY_BAR_H = 2.18;
/** Crossbar half-span in tiles — wider than the cloth's sleeve, so
 *  the corded tassels at its ends swing clear of the field. */
export const TROPHY_BAR_HW = 0.38;
/** Cloth length (crown to hem) in tiles. */
const CLOTH_LEN = 1.42;
/** Cloth half-widths: snug sleeve at the bar, a slight bell at the hem. */
const CLOTH_TOP_HW = 0.3;
const CLOTH_HEM_HW = 0.34;
/** The cloth hangs this far south of the pole axis — the face never
 *  z-fights its own standard, and the field reads whole from the
 *  camera's south-facing seat. */
const FACE_OFF = 0.075;
/** Spine nodes below the pinned crown. */
const SEGS = 6;
const SEG_LEN = CLOTH_LEN / SEGS;

// ---------------------------------------------------------- choreography

/** The drop: staked from the sky in half a second. */
export const TROPHY_DROP_MS = 520;
/** The furled cloth takes this long to unroll after the strike. */
const UNFURL_MS = 480;
/** Settle spring runs its visible course inside this window. */
const SETTLE_MS = 1100;
/** Drop release height in tiles. */
const DROP_Z0 = 4.4;

export interface TrophyDrop {
  /** Standard's altitude in tiles (0 = shoe in the ground). */
  z: number;
  /** Vertical squash of the pole (1 = rest) — the drive-in settle. */
  squash: number;
  /** Contact-shadow strength 0..1 (grows as the stake nears). */
  shadowK: number;
  /** True once the shoe has struck ground (impact beats key on it). */
  landed: boolean;
  /** 0..1 flash envelope right after impact (dust/kick light window). */
  strike: number;
  /**
   * 1 = the cloth rides FURLED against the staff (the standard falls
   * as a wrapped stake); 0 = fully unrolled. The unfurl is the
   * victory's second beat — the strike plants it, the cloth answers.
   */
  furl: number;
}

const SETTLED: TrophyDrop = { z: 0, squash: 1, shadowK: 1, landed: true, strike: 0, furl: 0 };

/**
 * The stake-in as a pure function of age. Negative/NaN age (no
 * bornAt) and anything past the settle window return THE ONE REST —
 * a static frame shows the standard at its full argument.
 */
export function trophyDrop(ageMs: number | null): TrophyDrop {
  if (ageMs === null || !Number.isFinite(ageMs) || ageMs >= TROPHY_DROP_MS + SETTLE_MS) return SETTLED;
  if (ageMs < 0) return SETTLED;
  if (ageMs < TROPHY_DROP_MS) {
    // Accelerating fall — a thrown stake, not a drifting feather. The
    // cloth stays furled the whole way down.
    const t = ageMs / TROPHY_DROP_MS;
    return {
      z: DROP_Z0 * (1 - t * t),
      squash: 1,
      shadowK: 0.25 + 0.75 * t * t,
      landed: false,
      strike: 0,
      furl: 1,
    };
  }
  // The settle: one damped spring, no piecewise kinks. The pole bites
  // ground, compresses, and breathes back to rest while the cloth
  // unrolls (smoothstepped — cloth has no corners in its story).
  const ts = (ageMs - TROPHY_DROP_MS) / 1000;
  const osc = Math.exp(-ts * 5.2) * Math.sin(ts * 21);
  const u = Math.min(1, (ageMs - TROPHY_DROP_MS) / UNFURL_MS);
  return {
    z: 0,
    squash: 1 - osc * 0.085,
    shadowK: 1,
    landed: true,
    strike: Math.max(0, 1 - (ageMs - TROPHY_DROP_MS) / 340),
    furl: 1 - u * u * (3 - 2 * u),
  };
}

// ------------------------------------------------------------- the cloth

interface ClothNode {
  x: number;
  y: number;
  z: number;
  px: number;
  py: number;
  pz: number;
}

/**
 * A hanging chain on the cape contract: verlet nodes in world XYZ,
 * crown pinned to its bar point, gravity down, the shared wind
 * across, asymmetric segment stiffness so the cloth hangs FROM the
 * standard. One class serves the gonfalon spine and both tassels.
 */
export class TrophyCloth {
  readonly nodes: ClothNode[] = [];
  private live = false;
  /** Hem speed (tiles/s) — drives the trim's kick light. */
  hemSpd = 0;
  private readonly phase: number;

  constructor(
    seed: number,
    private readonly segs: number,
    private readonly segLen: number,
    /** Gravity weight — the gonfalon is heavier cloth than a cord. */
    private readonly weight: number,
    /** Wind response. */
    private readonly windMul: number,
  ) {
    this.phase = ((seed >>> 0) % 97) * 0.613;
  }

  /**
   * Pin the whole chain straight below the anchor — the falling
   * standard carries its cloth furled, so the sim rides the drop
   * pinned instead of tangling six tiles of freefall, and the strike
   * jolt starts from THE ONE REST (the unfurl's clean first frame).
   */
  rest(ax: number, ay: number, az: number): void {
    this.rehang(ax, ay, az);
  }

  /** Hang straight down from the pin — THE ONE REST. */
  private rehang(ax: number, ay: number, az: number): void {
    this.nodes.length = 0;
    for (let i = 0; i <= this.segs; i++) {
      const z = az - i * this.segLen;
      this.nodes.push({ x: ax, y: ay, z, px: ax, py: ay, pz: z });
    }
    this.live = true;
    this.hemSpd = 0;
  }

  update(ax: number, ay: number, az: number, dt: number, wind: WindSample, tSec: number): void {
    const first = !this.live || this.nodes.length !== this.segs + 1;
    if (!first) {
      const p0 = this.nodes[0]!;
      // First sight / teleport: snap to rest, never whip across the map.
      if (Math.hypot(ax - p0.x, ay - p0.y) > 2) this.rehang(ax, ay, az);
    } else {
      this.rehang(ax, ay, az);
    }
    const h = Math.min(0.05, Math.max(0.001, dt));
    const ret = Math.exp(-3.9 * h);
    const last = this.segs;
    for (let i = 1; i <= last; i++) {
      const n = this.nodes[i]!;
      const ti = i / last;
      // The banner flutters hardest at the hem; a slow ripple walks
      // down the cloth on the sim's own seeded phase.
      const rip = Math.sin(tSec * 3.1 + this.phase + i * 1.7);
      const windK = this.windMul * (0.3 + 0.7 * ti);
      const gx = wind.bx * windK + rip * 0.16 * ti * this.windMul;
      const gy = wind.by * windK * 0.4;
      const gz = -24 * this.weight;
      const vx = (n.x - n.px) * ret;
      const vy = (n.y - n.py) * ret;
      const vz = (n.z - n.pz) * ret;
      n.px = n.x;
      n.py = n.y;
      n.pz = n.z;
      n.x += vx + gx * h * h;
      n.y += vy + gy * h * h;
      n.z += vz + gz * h * h;
    }
    // Constraints: pin the crown, then solve segment lengths with the
    // parent stiffer — cloth hangs FROM the bar (the cape law).
    const p0 = this.nodes[0]!;
    p0.px = p0.x = ax;
    p0.py = p0.y = ay;
    p0.pz = p0.z = az;
    for (let it = 0; it < 3; it++) {
      for (let i = 1; i <= last; i++) {
        const a = this.nodes[i - 1]!;
        const b = this.nodes[i]!;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dz = b.z - a.z;
        const d = Math.hypot(dx, dy, dz) || 1e-6;
        const diff = (d - this.segLen) / d;
        const wq = i === 1 ? 1 : 0.7;
        b.x -= dx * diff * wq;
        b.y -= dy * diff * wq;
        b.z -= dz * diff * wq;
        if (i > 1) {
          const wp = 1 - wq;
          a.x += dx * diff * wp;
          a.y += dy * diff * wp;
          a.z += dz * diff * wp;
        }
        // The ground is real: a hem never sinks through the meadow.
        if (b.z < 0.02) b.z = 0.02;
      }
    }
    const hem = this.nodes[last]!;
    this.hemSpd = Math.hypot(hem.x - hem.px, hem.y - hem.py, hem.z - hem.pz) / h;
  }

  /**
   * The strike snap: the stake bites ground and the cloth takes the
   * jolt — one impulse down the chain, decaying toward the crown.
   */
  jolt(k: number): void {
    const last = this.segs;
    for (let i = 1; i <= last; i++) {
      const n = this.nodes[i]!;
      const ti = i / last;
      n.pz = n.z + k * 0.1 * ti;
      n.px = n.x - k * 0.028 * ti;
    }
  }
}

/** The gonfalon spine at full voice. */
export function makeTrophySpine(seed: number): TrophyCloth {
  return new TrophyCloth(seed, SEGS, SEG_LEN, 0.92, 0.5);
}

/** A crossbar tassel — short, light, quick. */
export function makeTrophyTassel(seed: number): TrophyCloth {
  return new TrophyCloth(seed, 3, 0.09, 0.55, 0.85);
}

// ------------------------------------------------------------- the paint

/** The standard's palette — one identity across every tier. */
const FIELD = '#8e2431';
const FIELD_DEEP = '#6b1a26';
const FIELD_LIT = '#a53344';
const GOLD = '#d9a94a';
const GOLD_LIT = '#f2d27c';
const GOLD_DEEP = '#a87a2e';
const WOOD = '#4a3a2c';
const WOOD_DEEP = '#332a20';
const IRON = '#6a7078';
const IRON_DEEP = '#454a52';

/** Seeded 0..1 stream (the render-law hash; Math.random is banned). */
function sr(seed: number, salt: number): number {
  let h = (seed ^ salt) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export interface TrophyDrawOpts {
  /** Screen point of the shoe (the ground anchor, terrain-lifted). */
  gx: number;
  gy: number;
  /** Camera scale (px per tile). */
  s: number;
  /** Danger tier 1..5 — the chief band's pips. */
  tier: number;
  /** The banner's identity hash (cell key) — lean, phase, rubble. */
  seed: number;
  /** Frame clock (ms) — trim glint and strike flash read from it. */
  nowMs: number;
  drop: TrophyDrop;
  /** Spine nodes projected to SCREEN by the caller (crown first). */
  spine: Pt[];
  /** Tassel chains, projected likewise (may be empty while airborne). */
  tasselL: Pt[];
  tasselR: Pt[];
  /** Hem speed in tiles/s — the trim's kick light. */
  hemSpd: number;
}

/**
 * Paint the standard. Pure: everything animated reads from nowMs and
 * the projected sim chains — the lab freezes it with one clock value.
 * Layer order tells the truth south-up: rubble, pole, crossbar and
 * tassels, then the cloth riding in front (its FACE_OFF hang).
 */
export function drawTrophyBanner(ctx: CanvasRenderingContext2D, o: TrophyDrawOpts): void {
  const { gx, gy, s, seed, drop } = o;
  const lean = (sr(seed, 0x11) - 0.5) * 0.075; // the stake's honest lean
  const zPx = drop.z * s;
  const baseY = gy - zPx;
  const sq = drop.squash;
  const poleTopY = baseY - TROPHY_POLE_H * s * sq;
  const barY = baseY - TROPHY_BAR_H * s * sq;
  const leanAt = (y: number): number => gx + (baseY - y) * lean;
  const pw = Math.max(1.5, s * 0.055); // pole width

  ctx.save();

  // --- conquered ground (only once the stake has bitten)
  if (drop.landed && drop.z === 0) {
    // The staked mound: a low earth heap the drive threw up.
    ctx.fillStyle = '#5d4a33';
    ctx.beginPath();
    ctx.ellipse(gx, gy + s * 0.015, s * 0.19, s * 0.075, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#6e5a40';
    ctx.beginPath();
    ctx.ellipse(gx - s * 0.02, gy - s * 0.005, s * 0.13, s * 0.05, 0, 0, Math.PI * 2);
    ctx.fill();
    // Seeded rubble chips ringing the shoe.
    for (let i = 0; i < 5; i++) {
      const a = sr(seed, 0x20 + i) * Math.PI * 2;
      const r = s * (0.14 + sr(seed, 0x30 + i) * 0.12);
      const cw = s * (0.028 + sr(seed, 0x40 + i) * 0.03);
      ctx.fillStyle = i % 2 === 0 ? '#4f4136' : '#5d4a33';
      ctx.fillRect(gx + Math.cos(a) * r - cw / 2, gy + Math.sin(a) * r * 0.42 - cw * 0.35, cw, cw * 0.7);
    }
  }

  // --- the pole (two facets: lit west edge, deep east)
  const topX = leanAt(poleTopY);
  ctx.fillStyle = WOOD;
  ctx.beginPath();
  ctx.moveTo(gx - pw, baseY);
  ctx.lineTo(topX - pw * 0.8, poleTopY);
  ctx.lineTo(topX + pw * 0.8, poleTopY);
  ctx.lineTo(gx + pw, baseY);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = WOOD_DEEP;
  ctx.beginPath();
  ctx.moveTo(gx + pw * 0.15, baseY);
  ctx.lineTo(topX + pw * 0.1, poleTopY);
  ctx.lineTo(topX + pw * 0.8, poleTopY);
  ctx.lineTo(gx + pw, baseY);
  ctx.closePath();
  ctx.fill();

  // Iron shoe at the ground; gold collars up the shaft.
  const shoeH = s * 0.14;
  ctx.fillStyle = IRON;
  ctx.fillRect(gx - pw * 1.35, baseY - shoeH, pw * 2.7, shoeH);
  ctx.fillStyle = IRON_DEEP;
  ctx.fillRect(gx + pw * 0.1, baseY - shoeH, pw * 1.25, shoeH);
  for (const hk of [0.62, 1.52]) {
    const cy = baseY - hk * s * sq;
    const cx = leanAt(cy);
    ctx.fillStyle = GOLD;
    ctx.fillRect(cx - pw * 1.2, cy - s * 0.026, pw * 2.4, s * 0.052);
    ctx.fillStyle = GOLD_DEEP;
    ctx.fillRect(cx + pw * 0.2, cy - s * 0.026, pw, s * 0.052);
  }

  // --- the crossbar (corded, slight sag) + end caps
  const barX = leanAt(barY);
  const bhw = TROPHY_BAR_HW * s;
  ctx.strokeStyle = WOOD;
  ctx.lineWidth = Math.max(1.2, s * 0.042);
  ctx.beginPath();
  ctx.moveTo(barX - bhw, barY + s * 0.012);
  ctx.quadraticCurveTo(barX, barY - s * 0.02, barX + bhw, barY + s * 0.012);
  ctx.stroke();
  ctx.fillStyle = GOLD;
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(barX + sd * bhw, barY + s * 0.012, s * 0.028, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- tassels off the bar ends (live chains)
  for (const [pts, sd] of [
    [o.tasselL, -1],
    [o.tasselR, 1],
  ] as const) {
    if (pts.length < 2) continue;
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = Math.max(1, s * 0.022);
    ctx.beginPath();
    ctx.moveTo(pts[0]!.x, pts[0]!.y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i]!.x, pts[i]!.y);
    ctx.stroke();
    const tip = pts[pts.length - 1]!;
    ctx.fillStyle = sd < 0 ? GOLD : GOLD_DEEP;
    ctx.beginPath();
    ctx.moveTo(tip.x - s * 0.022, tip.y);
    ctx.lineTo(tip.x + s * 0.022, tip.y);
    ctx.lineTo(tip.x, tip.y + s * 0.055);
    ctx.closePath();
    ctx.fill();
  }

  // --- the spear finial (iron blade on a gold seat)
  ctx.fillStyle = GOLD;
  ctx.beginPath();
  ctx.arc(topX, poleTopY - s * 0.02, s * 0.034, 0, Math.PI * 2);
  ctx.fill();
  const bladeH = s * 0.2;
  ctx.fillStyle = IRON;
  ctx.beginPath();
  ctx.moveTo(topX, poleTopY - s * 0.05 - bladeH);
  ctx.lineTo(topX + s * 0.045, poleTopY - s * 0.05);
  ctx.lineTo(topX - s * 0.045, poleTopY - s * 0.05);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = IRON_DEEP;
  ctx.beginPath();
  ctx.moveTo(topX, poleTopY - s * 0.05 - bladeH);
  ctx.lineTo(topX + s * 0.045, poleTopY - s * 0.05);
  ctx.lineTo(topX, poleTopY - s * 0.05);
  ctx.closePath();
  ctx.fill();

  // --- the furled wrap: the standard falls with its cloth rolled
  // tight against the staff, corded in gold — the strike unrolls it.
  if (drop.furl > 0.02 && o.spine.length >= 2) {
    const crown = o.spine[0]!;
    const wrapH = CLOTH_LEN * 0.82 * s;
    const wrapW = Math.max(2, s * 0.085 * (0.6 + 0.4 * drop.furl));
    ctx.globalAlpha = Math.min(1, drop.furl * 1.6);
    ctx.fillStyle = FIELD;
    ctx.fillRect(crown.x - wrapW, crown.y, wrapW * 2, wrapH);
    ctx.fillStyle = FIELD_DEEP;
    ctx.fillRect(crown.x + wrapW * 0.15, crown.y, wrapW * 0.85, wrapH);
    // The cords: three gold bindings that let go as the cloth opens.
    ctx.fillStyle = GOLD;
    for (const hk of [0.2, 0.5, 0.8]) {
      ctx.fillRect(crown.x - wrapW * 1.25, crown.y + wrapH * hk - s * 0.016, wrapW * 2.5, s * 0.032);
    }
    ctx.globalAlpha = 1;
  }

  // --- the cloth, painted from the projected spine through width
  // rails. The unfurl scales the rails out from the spine — the field
  // unrolls rather than pops (drop.furl 1 → 0).
  const spine = o.spine;
  const open = 1 - drop.furl;
  if (spine.length >= 2 && open > 0.02) {
    const last = spine.length - 1;
    const left: Pt[] = [];
    const right: Pt[] = [];
    for (let i = 0; i <= last; i++) {
      const p = spine[i]!;
      const q = spine[Math.min(last, i + 1)]!;
      const r = spine[Math.max(0, i - 1)]!;
      let tx = q.x - r.x;
      let ty = q.y - r.y;
      const tl = Math.hypot(tx, ty) || 1e-6;
      tx /= tl;
      ty /= tl;
      const ti = i / last;
      const hw = (CLOTH_TOP_HW + (CLOTH_HEM_HW - CLOTH_TOP_HW) * ti) * s * open;
      left.push({ x: p.x - -ty * hw, y: p.y - tx * hw });
      right.push({ x: p.x + -ty * hw, y: p.y + tx * hw });
    }
    // Swallowtail hem: both rails run to the tails, the center bites up.
    const hemL = left[last]!;
    const hemR = right[last]!;
    const hemC = spine[last]!;
    const bite = s * 0.22;

    const face = new Path2D();
    face.moveTo(left[0]!.x, left[0]!.y);
    for (let i = 1; i <= last; i++) face.lineTo(left[i]!.x, left[i]!.y);
    face.lineTo(hemL.x, hemL.y + s * 0.1);
    face.lineTo(hemC.x, hemC.y + s * 0.1 - bite);
    face.lineTo(hemR.x, hemR.y + s * 0.1);
    for (let i = last; i >= 0; i--) face.lineTo(right[i]!.x, right[i]!.y);
    face.closePath();

    // Field, then the deep fold half (the cloth's east belly), then a
    // lit rail on the west — three flat bands, the house shading.
    ctx.fillStyle = FIELD;
    ctx.fill(face);
    ctx.save();
    ctx.clip(face);
    const foldSway = Math.sin(o.nowMs / 900 + sr(seed, 0x55) * 6.28) * s * 0.02;
    ctx.fillStyle = FIELD_DEEP;
    ctx.beginPath();
    ctx.moveTo(spine[0]!.x + s * 0.06 + foldSway, spine[0]!.y);
    for (let i = 1; i <= last; i++) {
      ctx.lineTo(spine[i]!.x + s * 0.07 + foldSway, spine[i]!.y);
    }
    ctx.lineTo(right[last]!.x, right[last]!.y + s * 0.12);
    for (let i = last; i >= 0; i--) ctx.lineTo(right[i]!.x, right[i]!.y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = FIELD_LIT;
    ctx.beginPath();
    ctx.moveTo(left[0]!.x, left[0]!.y);
    for (let i = 1; i <= last; i++) ctx.lineTo(left[i]!.x, left[i]!.y);
    ctx.lineTo(left[last]!.x + s * 0.05, left[last]!.y);
    for (let i = last; i >= 0; i--) ctx.lineTo(left[i]!.x + s * 0.045, left[i]!.y);
    ctx.closePath();
    ctx.fill();
    // Two soft creases riding the spine — hanging cloth remembers its
    // roll. They follow the chain, so the wind bends them honestly.
    ctx.strokeStyle = FIELD_DEEP;
    ctx.lineWidth = Math.max(0.8, s * 0.014);
    ctx.globalAlpha = 0.55;
    for (const off of [-0.3, 0.42]) {
      ctx.beginPath();
      for (let i = 0; i <= last; i++) {
        const lx = left[i]!.x + (right[i]!.x - left[i]!.x) * (0.5 + off * 0.5);
        const ly = left[i]!.y + (right[i]!.y - left[i]!.y) * (0.5 + off * 0.5);
        if (i === 0) ctx.moveTo(lx, ly);
        else ctx.lineTo(lx, ly);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // The chief band: gold crown stripe wearing the danger pips.
    const chiefD = s * 0.24;
    ctx.fillStyle = GOLD;
    ctx.beginPath();
    ctx.moveTo(left[0]!.x, left[0]!.y);
    ctx.lineTo(right[0]!.x, right[0]!.y);
    ctx.lineTo(right[1]!.x, Math.min(right[1]!.y, right[0]!.y + chiefD));
    ctx.lineTo(left[1]!.x, Math.min(left[1]!.y, left[0]!.y + chiefD));
    ctx.closePath();
    ctx.fill();
    const pips = Math.max(1, Math.min(5, Math.round(o.tier)));
    const pipY = (left[0]!.y + right[0]!.y) / 2 + chiefD * 0.52;
    const pipR = s * 0.032;
    for (let i = 0; i < pips; i++) {
      const fx = (i - (pips - 1) / 2) * pipR * 3.1;
      const px = (left[0]!.x + right[0]!.x) / 2 + fx;
      ctx.fillStyle = FIELD_DEEP;
      ctx.beginPath();
      ctx.moveTo(px, pipY - pipR);
      ctx.lineTo(px + pipR, pipY);
      ctx.lineTo(px, pipY + pipR);
      ctx.lineTo(px - pipR, pipY);
      ctx.closePath();
      ctx.fill();
    }

    // The champion's device: a gold star in a laurel ring, riding the
    // field's heart on the cloth's own sway (it lives ON the cloth).
    const dev = spine[Math.floor(last * 0.55)]!;
    const devR = s * 0.14;
    ctx.strokeStyle = GOLD_DEEP;
    ctx.lineWidth = Math.max(1, s * 0.024);
    ctx.beginPath();
    ctx.arc(dev.x, dev.y, devR, 0.25 * Math.PI, 0.75 * Math.PI, true);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(dev.x, dev.y, devR, 0.75 * Math.PI, 0.25 * Math.PI, true);
    ctx.stroke();
    ctx.fillStyle = GOLD;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
      const ax = dev.x + Math.cos(a) * devR * 0.62;
      const ay = dev.y + Math.sin(a) * devR * 0.62;
      const b = a + Math.PI / 5;
      const bx = dev.x + Math.cos(b) * devR * 0.26;
      const by = dev.y + Math.sin(b) * devR * 0.26;
      if (i === 0) ctx.moveTo(ax, ay);
      else ctx.lineTo(ax, ay);
      ctx.lineTo(bx, by);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Trim rails down both edges — with the hem's kick light: fast
    // cloth catches the sun (the cape's hemGlow law).
    const kick = Math.min(1, o.hemSpd / 4);
    ctx.strokeStyle = kick > 0.4 ? GOLD_LIT : GOLD;
    ctx.lineWidth = Math.max(1, s * 0.026);
    for (const rail of [left, right]) {
      ctx.beginPath();
      ctx.moveTo(rail[0]!.x, rail[0]!.y);
      for (let i = 1; i <= last; i++) ctx.lineTo(rail[i]!.x, rail[i]!.y);
      ctx.stroke();
    }
    // A slow seeded glint walks the west trim.
    const gt = ((o.nowMs / 2600 + sr(seed, 0x66)) % 1) * last;
    const gi = Math.max(0, Math.min(last - 1, Math.floor(gt)));
    const gf = gt - gi;
    const ga = left[gi]!;
    const gb = left[gi + 1]!;
    ctx.fillStyle = GOLD_LIT;
    ctx.beginPath();
    ctx.arc(ga.x + (gb.x - ga.x) * gf, ga.y + (gb.y - ga.y) * gf, Math.max(1, s * 0.02), 0, Math.PI * 2);
    ctx.fill();
  }

  // --- the strike flash: a thin vertical light kick the instant the
  // stake bites (the nova's grammar) — bright, narrow, gone fast.
  if (drop.strike > 0) {
    const st2 = drop.strike * drop.strike;
    ctx.globalAlpha = st2 * 0.5;
    ctx.fillStyle = GOLD_LIT;
    const kw = Math.max(1.5, s * 0.05 * drop.strike);
    ctx.fillRect(gx - kw / 2, baseY - s * 1.6, kw, s * 1.6);
    ctx.globalAlpha = st2 * 0.16;
    ctx.fillRect(gx - kw * 2.2, baseY - s * 0.9, kw * 4.4, s * 0.08);
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

/**
 * The contact shadow — drawn in the renderer's shadow prepass. Grows
 * and sharpens as the falling stake nears the ground (height is real).
 */
export function drawTrophyShadow(
  ctx: CanvasRenderingContext2D,
  gx: number,
  gy: number,
  s: number,
  drop: TrophyDrop,
): void {
  ctx.save();
  ctx.globalAlpha = 0.26 * drop.shadowK;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(gx, gy + s * 0.02, s * 0.24 * (0.5 + 0.5 * drop.shadowK), s * 0.09 * (0.5 + 0.5 * drop.shadowK), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Where the cloth's crown pins in world space, given the pole anchor. */
export function trophyClothPin(
  wx: number,
  wy: number,
  drop: TrophyDrop,
): { x: number; y: number; z: number } {
  return { x: wx, y: wy + FACE_OFF, z: drop.z + TROPHY_BAR_H * drop.squash - 0.06 };
}

/** Tassel pins at the crossbar ends. */
export function trophyTasselPin(
  wx: number,
  wy: number,
  drop: TrophyDrop,
  side: -1 | 1,
): { x: number; y: number; z: number } {
  return { x: wx + side * TROPHY_BAR_HW, y: wy + 0.02, z: drop.z + TROPHY_BAR_H * drop.squash };
}
