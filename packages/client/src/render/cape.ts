import { itemDef } from '@arx/content';
import { shade } from './rig.js';
import { SLOT_GLINT_PHASE, glintAt, type SlotLight } from './wornLight.js';

/**
 * Capes: a verlet chain simulated in WORLD space plus a height axis, so
 * the cloth genuinely lives behind the body — turn and it swings around
 * you, run and it lifts and streams, stop and it settles with the wind
 * still working the hem. The renderer projects the simulated nodes and
 * paints a faceted two-tone ribbon in the brutalist dialect.
 */

export interface CapeStyle {
  color: string;
  /** Hem band + clasp color — the cape's signature accent. */
  trim: string;
  /** Spine nodes below the anchor (more = longer, more sinuous). */
  segs: number;
  /** Tiles per spine segment. */
  segLen: number;
  /** Half-width at the shoulders / at the hem (tiles). */
  shoulderW: number;
  hemW: number;
  /** Gravity multiplier — fur hangs, silk floats. */
  weight: number;
  /** How eagerly the scene wind works the cloth. */
  windMul: number;
  /** High-frequency edge flutter amplitude. */
  flutter: number;
  /** Mark stitched below the mantle. */
  emblem?: 'chevron' | 'diamond' | 'bolt';
  /** Bottom-edge cut: torn rags, dress scallops, a banner's tails. */
  hem?: 'tattered' | 'scallop' | 'swallowtail';
  /** Woven pattern across the cloth. */
  pattern?: 'stripe' | 'bands' | 'border' | 'patch';
  /** Animated prestige effect, clipped to the cloth. */
  fx?: 'ember' | 'storm' | 'stars' | 'shimmer' | 'aurora';
  /** Effect accent color (defaults to trim). */
  fxColor?: string;
}

/**
 * The cape wardrobe — every entry is its OWN garment: geometry, cloth
 * behavior, cut, pattern, and (for the prestige tier) a living effect.
 * Never homogenous recolors. Progression arc: torn rags → workmanlike
 * cloth → storied drops → animated luxury.
 */
const CAPE_STYLES: Record<string, CapeStyle> = {
  // ---- starter tier: humble, patched, honest.
  cape_ragged: {
    color: '#8a7a5f',
    trim: '#6e6049',
    segs: 4,
    segLen: 0.115,
    shoulderW: 0.15,
    hemW: 0.2,
    weight: 1.1,
    windMul: 0.9,
    flutter: 0.8,
    hem: 'tattered',
    pattern: 'patch',
  },
  cape_traveler: {
    color: '#7da35a',
    trim: '#55793c',
    segs: 6,
    segLen: 0.12,
    shoulderW: 0.16,
    hemW: 0.225,
    weight: 0.92,
    windMul: 1.1,
    flutter: 1.0,
    pattern: 'border',
  },
  wolf_pelt_cloak: {
    color: '#6a6f7d',
    trim: '#494e5c',
    segs: 5,
    segLen: 0.115,
    shoulderW: 0.175,
    hemW: 0.21,
    weight: 1.2,
    windMul: 0.65,
    flutter: 0.5,
    hem: 'tattered',
    pattern: 'bands',
  },
  // ---- low tier: capes with a story.
  cape_banner: {
    color: '#a34434',
    trim: '#d9c496',
    segs: 7,
    segLen: 0.125,
    shoulderW: 0.15,
    hemW: 0.2,
    weight: 0.95,
    windMul: 1.15,
    flutter: 1.0,
    hem: 'swallowtail',
    pattern: 'stripe',
  },
  cape_huntsman: {
    color: '#3f6b3a',
    trim: '#b7a06a',
    segs: 6,
    segLen: 0.12,
    shoulderW: 0.165,
    hemW: 0.235,
    weight: 1.0,
    windMul: 0.9,
    flutter: 0.7,
    hem: 'scallop',
    emblem: 'diamond',
  },
  cape_midnight: {
    color: '#2e2a3e',
    trim: '#4a4462',
    segs: 7,
    segLen: 0.125,
    shoulderW: 0.145,
    hemW: 0.195,
    weight: 1.0,
    windMul: 0.8,
    flutter: 0.6,
    pattern: 'border',
  },
  cape_emberweave: {
    color: '#c4553d',
    trim: '#e8a23c',
    segs: 6,
    segLen: 0.125,
    shoulderW: 0.165,
    hemW: 0.245,
    weight: 0.78,
    windMul: 1.35,
    flutter: 1.4,
    fx: 'ember',
  },
  // ---- high tier: gear you're seen in.
  cape_gilded: {
    color: '#c9a23c',
    trim: '#8a6a1f',
    segs: 6,
    segLen: 0.12,
    shoulderW: 0.17,
    hemW: 0.24,
    weight: 1.05,
    windMul: 0.8,
    flutter: 0.6,
    fx: 'shimmer',
    fxColor: '#fff0c0',
  },
  cape_storm: {
    color: '#3c4a66',
    trim: '#9fd8ff',
    segs: 7,
    segLen: 0.125,
    shoulderW: 0.165,
    hemW: 0.25,
    weight: 0.95,
    windMul: 1.1,
    flutter: 0.9,
    hem: 'tattered',
    fx: 'storm',
    fxColor: '#9fd8ff',
  },
  cape_champion: {
    color: '#8a2f3c',
    trim: '#e8b64c',
    segs: 7,
    segLen: 0.13,
    shoulderW: 0.18,
    hemW: 0.27,
    weight: 1.05,
    windMul: 0.9,
    flutter: 0.7,
    emblem: 'chevron',
    fx: 'shimmer',
    fxColor: '#ffe9b0',
  },
  // ---- prestige tier: living cloth.
  cape_royal: {
    color: '#6b3fa0',
    trim: '#e8b64c',
    segs: 7,
    segLen: 0.13,
    shoulderW: 0.185,
    hemW: 0.275,
    weight: 1.1,
    windMul: 0.75,
    flutter: 0.55,
    hem: 'scallop',
    pattern: 'border',
    emblem: 'diamond',
    fx: 'shimmer',
    fxColor: '#ffe9b0',
  },
  cape_celestial: {
    color: '#1f2247',
    trim: '#8f9fd8',
    segs: 8,
    segLen: 0.125,
    shoulderW: 0.17,
    hemW: 0.26,
    weight: 0.9,
    windMul: 0.85,
    flutter: 0.7,
    fx: 'stars',
    fxColor: '#e8ecff',
  },
  cape_phoenix: {
    color: '#c4372a',
    trim: '#ffb43c',
    segs: 7,
    segLen: 0.13,
    shoulderW: 0.17,
    hemW: 0.26,
    weight: 0.82,
    windMul: 1.05,
    flutter: 1.1,
    hem: 'tattered',
    pattern: 'stripe',
    fx: 'ember',
    fxColor: '#ffd77a',
  },
};

/** Unknown cape items still fly: defaults in the item's own color. */
export function capeStyle(itemId: string): CapeStyle {
  const known = CAPE_STYLES[itemId];
  if (known) return known;
  const color = itemDef(itemId)?.color ?? '#8a8494';
  return {
    color,
    trim: shade(color, -30),
    segs: 6,
    segLen: 0.12,
    shoulderW: 0.16,
    hemW: 0.22,
    weight: 0.95,
    windMul: 1,
    flutter: 0.9,
  };
}

interface CapeNode {
  x: number;
  y: number;
  z: number;
  px: number;
  py: number;
  pz: number;
}

/** How far behind the spine the cloth clasps on (tiles). */
const BACK_OFF = 0.13;
/** The cloth may not pierce the torso column. */
const BODY_R = 0.16;
/** Hem rest height off the ground. */
const GROUND_Z = 0.03;

export class CapeSim {
  readonly nodes: CapeNode[] = [];
  /** Per-cape phase — no two capes ripple (or twinkle) in sync. */
  readonly phase: number;
  private lastAx = 0;
  private lastAy = 0;
  private live = false;
  private isFront = false;
  /** Hem velocity (tiles/s) — drives the kick-light on the trim. */
  hemSpd = 0;

  constructor(
    private readonly style: CapeStyle,
    seed: number,
  ) {
    this.phase = (seed % 97) * 0.613;
  }

  /**
   * Advance the cloth one frame. (ax, ay) is the wearer's world position
   * (lunge included), az the shoulder height in tile units, dir the
   * facing in radians. sizeK scales the whole garment (champions 1.25).
   */
  update(
    ax: number,
    ay: number,
    az: number,
    dir: number,
    dt: number,
    wind: { bx: number; by: number },
    tSec: number,
    sizeK: number,
    seatK = 0,
  ): void {
    const st = this.style;
    const n = st.segs + 1;
    const fx = Math.cos(dir);
    const fy = Math.sin(dir);
    // The clasp sits behind the shoulders, opposite the facing.
    const cx = ax - fx * BACK_OFF * sizeK;
    const cy = ay - fy * BACK_OFF * sizeK;
    const seg = st.segLen * sizeK;

    // First sight or teleport: hang the cloth straight down the back —
    // never let it whip across the map to catch up.
    if (!this.live || this.nodes.length !== n || Math.hypot(cx - this.nodes[0]!.x, cy - this.nodes[0]!.y) > 2) {
      this.nodes.length = 0;
      for (let i = 0; i < n; i++) {
        const x = cx - fx * seg * 0.35 * i;
        const y = cy - fy * seg * 0.35 * i;
        const z = Math.max(GROUND_Z, az - seg * 0.93 * i);
        this.nodes.push({ x, y, z, px: x, py: y, pz: z });
      }
      this.lastAx = ax;
      this.lastAy = ay;
      this.live = true;
    }

    const h = Math.min(0.05, Math.max(0.001, dt));
    // HEAVY CLOTH: strong damping is what makes fabric read as weighty —
    // it swings with the wearer and settles, it never flails.
    const ret = Math.exp(-3.8 * h);
    const hh = h * h;

    // Anchor speed: a sprint lifts the hem so the cape STREAMS.
    const spd = Math.min(7, Math.hypot(ax - this.lastAx, ay - this.lastAy) / h);
    this.lastAx = ax;
    this.lastAy = ay;

    const lastI = n - 1;
    for (let i = 1; i < n; i++) {
      const nd = this.nodes[i]!;
      const ti = i / lastI; // 0 shoulders → 1 hem: freedom grows downward
      const vx = (nd.x - nd.px) * ret;
      const vy = (nd.y - nd.py) * ret;
      const vz = (nd.z - nd.pz) * ret;
      nd.px = nd.x;
      nd.py = nd.y;
      nd.pz = nd.z;

      // Scene wind (the same field the grass and trees obey) + a private
      // flutter ripple travelling down the cloth. Both are kept modest:
      // a wool mantle stirs in a gust, it doesn't thrash — the drama
      // comes from the wearer's own motion.
      const windK = st.windMul * (0.35 + 0.65 * ti) * 1.1;
      const rip = Math.sin(tSec * (3.6 + st.flutter * 1.1) + this.phase + i * 1.9);
      const flut = st.flutter * 0.8 * ti * rip;
      let gx = wind.bx * windK - fy * flut;
      let gy = wind.by * windK + fx * flut;
      // THE SIDE-VIEW LIE: a top-down side profile is a forced
      // perspective — the cape must commit to the side-scroller read,
      // streaming behind the facing on the character's own depth lane.
      // As the facing goes horizontal the cloth is pushed back along it
      // and gently centered toward the clasp's lane, so it can't wander
      // toward/away from the camera and dither around the body.
      const sideK = Math.abs(fx) * (1 - Math.abs(fy));
      gx += -fx * 3.2 * sideK * (0.5 + 0.5 * ti);
      gy += (cy - nd.y) * 2.8 * sideK * (1 - 0.4 * ti);
      // THE SEATED TUCK: with the clasp down at seated-shoulder height
      // the slack has to live on the ground — nudge it home BEHIND the
      // sitter along the facing so the pool settles at the back like
      // cloth swept aside to sit, and can never creep under the body.
      if (seatK > 0) {
        const settle = 6 * seatK * ti;
        gx -= fx * settle;
        gy -= fy * settle;
      }
      // Gravity vs the running billow: speed converts hang into stream.
      const gz = -26 * st.weight + spd * (1.4 + 0.8 * ti) + Math.abs(wind.bx + wind.by) * 0.4 * ti;

      nd.x += vx + gx * hh;
      nd.y += vy + gy * hh;
      nd.z += vz + gz * hh;
    }

    // Constraints: pin the clasp, keep segment lengths, stay out of the
    // torso, and never sink through the ground.
    for (let iter = 0; iter < 3; iter++) {
      const a = this.nodes[0]!;
      a.x = cx;
      a.y = cy;
      a.z = az;
      for (let i = 1; i < n; i++) {
        const p = this.nodes[i - 1]!;
        const q = this.nodes[i]!;
        const dx = q.x - p.x;
        const dy = q.y - p.y;
        const dz = q.z - p.z;
        const d = Math.hypot(dx, dy, dz) || 1e-6;
        const err = (d - seg) / d;
        // The parent is stiffer than the child — cloth hangs FROM you.
        const wq = i === 1 ? 1 : 0.68;
        q.x -= dx * err * wq;
        q.y -= dy * err * wq;
        q.z -= dz * err * wq;
        if (i > 1) {
          p.x += dx * err * (1 - wq);
          p.y += dy * err * (1 - wq);
          p.z += dz * err * (1 - wq);
        }

        // Torso column collision: wrap around the sides, never through.
        const bdx = q.x - ax;
        const bdy = q.y - ay;
        const bd = Math.hypot(bdx, bdy);
        const minR = BODY_R * sizeK;
        if (bd < minR && q.z > 0.12) {
          const push = (minR - bd) / (bd || 1e-6);
          q.x += bdx * push;
          q.y += bdy * push;
        }

        if (q.z < GROUND_Z) {
          q.z = GROUND_Z;
          // Ground drag: the hem brushes the grass, it doesn't skate.
          // Seated, the ground grips harder — pooled cloth is TUCKED,
          // it doesn't wander with every breath of wind.
          const grip = 0.5 + 0.4 * seatK;
          q.px += (q.x - q.px) * grip;
          q.py += (q.y - q.py) * grip;
        }
      }
    }

    const hem = this.nodes[lastI]!;
    this.hemSpd = Math.hypot(hem.x - hem.px, hem.y - hem.py, hem.z - hem.pz) / h;
  }

  /**
   * Paint side is a FACING law, not a cloth-position law — the same
   * convention as the beast head/tail and the weapon-behind rule. The
   * cloth hangs on the back, and the back is toward the camera exactly
   * when the facing points up-screen. Cloth position near the side
   * boundary is pure noise (that's what caused the paint flicker);
   * facing is definitive. Hysteresis band so the flip never dithers,
   * placed just above horizontal where the cape is slim and tucked —
   * the swap is invisible there.
   */
  front(fy: number): boolean {
    if (fy < -0.22) this.isFront = true;
    else if (fy > -0.1) this.isFront = false;
    return this.isFront;
  }
}

interface Pt {
  x: number;
  y: number;
}

export interface CapeDrawOpts {
  hurt: boolean;
  /**
   * THE FORESHORTENING LAW — the projected length of the shoulder bar
   * the cloth hangs from (1 facing up/down, ~0.45 in pure profile,
   * continuous through all 360°). The clasp is welded to the body plane
   * so it foreshortens fully; free cloth twists back toward the camera
   * down its length, recovering breadth toward the hem.
   */
  breadthK: number;
  /** 0..1 from hem speed — a fast-moving trim catches the light. */
  hemGlow: number;
  /** Wall-clock seconds + per-cape phase drive the living effects. */
  tSec: number;
  phase: number;
  /**
   * 0..1 seated pooling — grounded cloth relaxes and SPREADS toward
   * the hem, so the pooled slack reads as fabric fanned on the ground
   * instead of a taut hanging ribbon lying on its side.
   */
  spread?: number;
  /**
   * THE WORN LIGHT: the working bonded to this cape. At tier 1 the
   * cape's whole voice is one travelling glint on the trailing hem —
   * higher tiers speak through the wake and corona instead, so the
   * hem stays quiet for them.
   */
  arx?: SlotLight;
}

const lerpPt = (a: Pt, b: Pt, t: number): Pt => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});
const fract = (x: number): number => x - Math.floor(x);

/**
 * Paint the projected ribbon: base fill, hard-shade fold half, spine
 * crease, lit shoulder mantle, trim hem, then the style's own voice —
 * shaped hem cuts, woven patterns, an emblem, and for the prestige
 * tier a living effect clipped to the cloth. The tunic's own dialect,
 * in fabric. `pts` are the nodes projected to screen by the caller;
 * `wk` is the width scale (camera scale × body size).
 */
export function drawCape(
  ctx: CanvasRenderingContext2D,
  pts: Pt[],
  style: CapeStyle,
  wk: number,
  opts: CapeDrawOpts,
): void {
  const n = pts.length;
  if (n < 3) return;
  const { hurt, breadthK, tSec, phase } = opts;
  let hemGlow = opts.hemGlow;

  // Lateral direction at each node = screen-perpendicular of the chain
  // tangent; widths taper out from shoulder to a flared hem, scaled by
  // the foreshortening law (full clasp weld → hem twist recovery).
  const left: Pt[] = [];
  const right: Pt[] = [];
  const widths: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)]!;
    const b = pts[Math.min(n - 1, i + 1)]!;
    let tx = b.x - a.x;
    let ty = b.y - a.y;
    const tl = Math.hypot(tx, ty) || 1;
    tx /= tl;
    ty /= tl;
    const t = i / (n - 1);
    const persp = breadthK + (1 - breadthK) * 0.45 * t;
    // Seated pool: spread grows quadratically down the cloth so the
    // shoulders stay fitted while the grounded hem fans out.
    const pool = 1 + (opts.spread ?? 0) * 0.55 * t * t;
    const w = (style.shoulderW + (style.hemW - style.shoulderW) * t) * wk * persp * pool;
    widths.push(w);
    left.push({ x: pts[i]!.x + ty * w, y: pts[i]!.y - tx * w });
    right.push({ x: pts[i]!.x - ty * w, y: pts[i]!.y + tx * w });
  }

  // The hem edge: straight, or CUT — torn rags, dress scallops, a
  // banner's split tails. Points run left-hem → right-hem, with the
  // cuts biting inward along the cloth (toward the second-to-last row).
  const hemL = left[n - 1]!;
  const hemR = right[n - 1]!;
  const inX = pts[n - 2]!.x - pts[n - 1]!.x;
  const inY = pts[n - 2]!.y - pts[n - 1]!.y;
  const inLen = Math.hypot(inX, inY) || 1;
  const bite = Math.min(inLen * 0.55, wk * 0.09);
  const inward = (p: Pt, d: number): Pt => ({ x: p.x + (inX / inLen) * d, y: p.y + (inY / inLen) * d });
  const hemPts: Pt[] = [hemL];
  if (style.hem === 'tattered') {
    // Uneven teeth — every tear a different depth, fixed per cape.
    for (let k = 1; k <= 5; k++) {
      const base = lerpPt(hemL, hemR, k / 6);
      const deep = k % 2 === 1 ? bite * (0.7 + 0.3 * Math.sin(phase * 3 + k * 2.3)) : bite * 0.1;
      hemPts.push(inward(base, deep));
    }
  } else if (style.hem === 'scallop') {
    // Regular shallow V-cuts — tailored, not torn.
    for (let k = 1; k <= 7; k++) {
      const base = lerpPt(hemL, hemR, k / 8);
      hemPts.push(inward(base, k % 2 === 1 ? bite * 0.45 : 0));
    }
  } else if (style.hem === 'swallowtail') {
    // A banner's split: the center sweeps up, leaving two tails.
    hemPts.push(inward(lerpPt(hemL, hemR, 0.3), bite * 0.25));
    hemPts.push(inward(lerpPt(hemL, hemR, 0.5), bite * 1.35));
    hemPts.push(inward(lerpPt(hemL, hemR, 0.7), bite * 0.25));
  }
  hemPts.push(hemR);

  // One silhouette path: down the left edge, across the hem cut, back
  // up the right — used for the base fill, the interior clip, and the
  // outline, so every layer agrees on the same cloth.
  const path = new Path2D();
  path.moveTo(left[0]!.x, left[0]!.y);
  for (let i = 1; i < n; i++) path.lineTo(left[i]!.x, left[i]!.y);
  for (const p of hemPts) path.lineTo(p.x, p.y);
  for (let i = n - 1; i >= 0; i--) path.lineTo(right[i]!.x, right[i]!.y);
  path.closePath();

  const trace = (edgeA: Pt[], edgeB: Pt[]) => {
    ctx.beginPath();
    ctx.moveTo(edgeA[0]!.x, edgeA[0]!.y);
    for (let i = 1; i < edgeA.length; i++) ctx.lineTo(edgeA[i]!.x, edgeA[i]!.y);
    for (let i = edgeB.length - 1; i >= 0; i--) ctx.lineTo(edgeB[i]!.x, edgeB[i]!.y);
    ctx.closePath();
  };

  // A point ON the cloth: t down the spine (0 clasp → 1 hem), q across
  // it (−1 left edge → 1 right edge). Anchors patterns and effects to
  // the fabric so they ride every fold and swing.
  const clothPoint = (t: number, q: number): Pt => {
    const fi = Math.max(0, Math.min(n - 1.001, t * (n - 1)));
    const i0 = Math.floor(fi);
    const f = fi - i0;
    const base = lerpPt(pts[i0]!, pts[i0 + 1]!, f);
    const edge = q >= 0 ? lerpPt(right[i0]!, right[i0 + 1]!, f) : lerpPt(left[i0]!, left[i0 + 1]!, f);
    return lerpPt(base, edge, Math.abs(q));
  };

  // Flat cloth: no baked outline — silhouette lines belong to the
  // renderer's outline pass, where they're uniform and optional.
  ctx.fillStyle = hurt ? '#ffffff' : style.color;
  ctx.lineJoin = 'round';
  ctx.fill(path);
  if (hurt) return;

  // Everything decorative stays inside the silhouette.
  ctx.save();
  ctx.clip(path);

  // ---- woven pattern, under the shading so the fold reads over it.
  if (style.pattern === 'stripe') {
    // A herald's center stripe running the cloth's full length.
    ctx.fillStyle = style.trim;
    ctx.beginPath();
    ctx.moveTo(clothPoint(0, -0.3).x, clothPoint(0, -0.3).y);
    for (let i = 0; i < n; i++) {
      const p = clothPoint(i / (n - 1), -0.3);
      ctx.lineTo(p.x, p.y);
    }
    for (let i = n - 1; i >= 0; i--) {
      const p = clothPoint(i / (n - 1), 0.3);
      ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    ctx.fill();
  } else if (style.pattern === 'bands') {
    // Shaggy fur rows — alternate rungs darkened.
    for (let i = 1; i < n - 1; i += 2) {
      ctx.fillStyle = shade(style.color, -10);
      trace([left[i]!, left[i + 1]!], [right[i]!, right[i + 1]!]);
      ctx.fill();
    }
  } else if (style.pattern === 'border') {
    // A woven edge running the full length of both sides.
    ctx.strokeStyle = style.trim;
    ctx.lineWidth = Math.max(1.5, wk * 0.05);
    for (const edge of [left, right]) {
      ctx.beginPath();
      ctx.moveTo(edge[0]!.x, edge[0]!.y);
      for (let i = 1; i < n; i++) ctx.lineTo(edge[i]!.x, edge[i]!.y);
      ctx.stroke();
    }
  } else if (style.pattern === 'patch') {
    // One honest repair, stitched on slightly askew.
    const a = clothPoint(0.42, 0.12);
    const b = clothPoint(0.42, 0.62);
    const c = clothPoint(0.68, 0.66);
    const d = clothPoint(0.68, 0.08);
    ctx.fillStyle = shade(style.color, 16);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(c.x, c.y);
    ctx.lineTo(d.x, d.y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = shade(style.color, -22);
    ctx.lineWidth = Math.max(1, wk * 0.018);
    ctx.setLineDash([wk * 0.035, wk * 0.03]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // ---- hard fold shade down one half — flat art, no gradients.
  ctx.fillStyle = shade(style.color, -16);
  ctx.globalAlpha = 0.82;
  trace(pts, right);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Spine crease: one dark fold line down the middle of the cloth —
  // the cheapest cut that makes a flat ribbon read as draped fabric.
  if (n >= 4) {
    ctx.strokeStyle = shade(style.color, -30);
    ctx.lineWidth = Math.max(1, wk * 0.022);
    ctx.beginPath();
    ctx.moveTo(pts[1]!.x, pts[1]!.y);
    for (let i = 2; i < n - 1; i++) ctx.lineTo(pts[i]!.x, pts[i]!.y);
    ctx.stroke();
  }

  // ---- lit mantle plane across the shoulders.
  ctx.fillStyle = shade(style.color, 12);
  trace([left[0]!, left[1]!], [right[0]!, right[1]!]);
  ctx.fill();

  // ---- living effects: the prestige tier breathes. All deterministic
  // from time + the cape's own phase, all riding the actual cloth.
  const fxc = style.fxColor ?? style.trim;
  if (style.fx === 'ember' || style.fx === 'storm') {
    // These cloths smoulder/charge even at rest: the hem pulses.
    hemGlow = Math.max(hemGlow, 0.35 + 0.35 * Math.sin(tSec * 2.3 + phase));
  }

  // ---- trim hem — the accent that names the cape at a glance.
  ctx.fillStyle = shade(style.trim, Math.round(hemGlow * 22));
  trace([left[n - 2]!, left[n - 1]!], [right[n - 2]!, right[n - 1]!]);
  ctx.fill();

  // ---- emblem, stitched below the mantle and sized from the rung
  // it's sewn onto so it foreshortens with the fabric.
  if (style.emblem && n >= 4) {
    const m = pts[2]!;
    const cw = widths[2]! * 0.72;
    ctx.fillStyle = style.trim;
    ctx.beginPath();
    if (style.emblem === 'chevron') {
      ctx.moveTo(m.x - cw, m.y - cw * 0.5);
      ctx.lineTo(m.x + cw, m.y - cw * 0.5);
      ctx.lineTo(m.x, m.y + cw * 0.9);
    } else if (style.emblem === 'diamond') {
      ctx.moveTo(m.x, m.y - cw * 0.8);
      ctx.lineTo(m.x + cw * 0.6, m.y);
      ctx.lineTo(m.x, m.y + cw * 0.8);
      ctx.lineTo(m.x - cw * 0.6, m.y);
    } else {
      // bolt
      ctx.moveTo(m.x - cw * 0.25, m.y - cw * 0.8);
      ctx.lineTo(m.x + cw * 0.35, m.y - cw * 0.15);
      ctx.lineTo(m.x + cw * 0.05, m.y - 0.05 * cw);
      ctx.lineTo(m.x + cw * 0.3, m.y + cw * 0.8);
      ctx.lineTo(m.x - 0.35 * cw, m.y + cw * 0.05);
      ctx.lineTo(m.x - 0.02 * cw, m.y - cw * 0.1);
    }
    ctx.closePath();
    ctx.fill();
  }

  if (style.fx === 'ember') {
    // Sparks born at the hem climb the cloth and die as they cool.
    for (let k = 0; k < 6; k++) {
      const u = fract(tSec * (0.3 + ((k * 37) % 10) / 33) + k * 0.618 + phase);
      const t = 0.95 - u * 0.75;
      const q = (((k * 53) % 100) / 50 - 1) * 0.75;
      const p = clothPoint(t, q);
      const sz = wk * 0.05 * (1 - u * 0.55);
      ctx.globalAlpha = (1 - u) * 0.9;
      ctx.fillStyle = k % 2 === 0 ? fxc : '#ff9a3d';
      ctx.fillRect(p.x - sz / 2, p.y - sz / 2, sz, sz);
    }
    ctx.globalAlpha = 1;
  } else if (style.fx === 'storm') {
    // A charge crackles across the weave in stuttering arcs.
    const beat = tSec * 5.7 + phase * 4;
    if (Math.sin(beat) > 0.78) {
      const cell = Math.floor(beat / Math.PI);
      const t0 = 0.2 + ((cell * 29) % 50) / 100;
      const q0 = ((cell * 61) % 100) / 60 - 0.8;
      const p1 = clothPoint(t0, q0);
      const p2 = clothPoint(t0 + 0.18, q0 + 0.45);
      const p3 = clothPoint(t0 + 0.32, q0 - 0.2);
      ctx.strokeStyle = fxc;
      ctx.lineWidth = Math.max(1.5, wk * 0.032);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineTo(p3.x, p3.y);
      ctx.stroke();
    }
  } else if (style.fx === 'stars') {
    // A constellation sewn into the cloth, each star on its own
    // twinkle clock — plus a slow aurora breathing across the weave.
    const au = fract(tSec * 0.1 + phase * 0.2);
    const t1 = au * 1.3 - 0.15;
    const b1 = clothPoint(Math.max(0, Math.min(1, t1)), 0);
    const b2 = clothPoint(Math.max(0, Math.min(1, t1 + 0.22)), 0);
    ctx.fillStyle = `hsl(${Math.round(fract(tSec * 0.05 + phase) * 360)} 60% 70% / 0.14)`;
    ctx.fillRect(
      Math.min(b1.x, b2.x) - wk * 0.3,
      Math.min(b1.y, b2.y),
      Math.abs(b2.x - b1.x) + wk * 0.6,
      Math.max(4, Math.abs(b2.y - b1.y)),
    );
    for (let k = 0; k < 8; k++) {
      const t = 0.12 + ((k * 29) % 70) / 85;
      const q = ((((k * 61) % 160) / 80 - 1) * 0.8);
      const p = clothPoint(t, q);
      const tw = 0.5 + 0.5 * Math.sin(tSec * (1.3 + (k % 5) * 0.55) + k * 2.1 + phase);
      const sz = wk * 0.032 * (0.7 + 0.7 * tw);
      ctx.globalAlpha = 0.35 + 0.65 * tw;
      ctx.fillStyle = fxc;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - sz);
      ctx.lineTo(p.x + sz, p.y);
      ctx.lineTo(p.x, p.y + sz);
      ctx.lineTo(p.x - sz, p.y);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else if (style.fx === 'shimmer' || style.fx === 'aurora') {
    // A glint band sweeping slowly down the cloth; aurora cycles hue.
    const u = fract(tSec * 0.2 + phase * 0.3);
    const t1 = Math.max(0, Math.min(1, u * 1.4 - 0.2));
    const t2 = Math.max(0, Math.min(1, t1 + 0.16));
    if (t2 > t1) {
      ctx.fillStyle =
        style.fx === 'aurora'
          ? `hsl(${Math.round(fract(tSec * 0.06 + phase) * 360)} 65% 70% / 0.2)`
          : fxc;
      ctx.globalAlpha = style.fx === 'aurora' ? 1 : 0.22;
      const a1 = clothPoint(t1, -1);
      const a2 = clothPoint(t1, 1);
      const a3 = clothPoint(t2, 1);
      const a4 = clothPoint(t2, -1);
      ctx.beginPath();
      ctx.moveTo(a1.x, a1.y);
      ctx.lineTo(a2.x, a2.y);
      ctx.lineTo(a3.x, a3.y);
      ctx.lineTo(a4.x, a4.y);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  ctx.restore();

  // THE WORN LIGHT, tier 1: one spark travelling the trailing hem on
  // the kit-wide glint clock (SLOT_GLINT_PHASE.cape keeps it in the
  // round). Painted after the clip so it sits ON the hem edge — the
  // same restraint as every other slot's tier-1 mark: no particles,
  // no glow, mostly dark.
  if (opts.arx && opts.arx.tier <= 1) {
    const g = glintAt(tSec * 1000, SLOT_GLINT_PHASE.cape ?? 0);
    if (g > 0.02) {
      // The spark slides along the hem inside its own bright pass.
      const u = 0.2 + 0.6 * fract(tSec * 0.9 + (SLOT_GLINT_PHASE.cape ?? 0));
      const hp = lerpPt(hemL, hemR, u);
      const r = Math.max(1.5, wk * 0.045) * (0.6 + 0.4 * g);
      ctx.save();
      ctx.globalAlpha = 0.85 * g;
      ctx.fillStyle = opts.arx.tint.core;
      ctx.beginPath();
      ctx.moveTo(hp.x, hp.y - r);
      ctx.lineTo(hp.x + r * 0.7, hp.y);
      ctx.lineTo(hp.x, hp.y + r);
      ctx.lineTo(hp.x - r * 0.7, hp.y);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 0.45 * g;
      ctx.strokeStyle = opts.arx.tint.mid;
      ctx.lineWidth = Math.max(1, wk * 0.014);
      ctx.beginPath();
      ctx.moveTo(hp.x - r * 1.7, hp.y);
      ctx.lineTo(hp.x + r * 1.7, hp.y);
      ctx.stroke();
      ctx.restore();
    }
  }
}
