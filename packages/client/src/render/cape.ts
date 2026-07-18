import { itemDef } from '@devcraft/content';
import { shade } from './rig.js';

/**
 * Capes: a verlet chain simulated in WORLD space plus a height axis, so
 * the cloth genuinely lives behind the body — turn and it swings around
 * you, run and it lifts and streams, stop and it settles with the wind
 * still working the hem. The renderer projects the simulated nodes and
 * paints a faceted two-tone ribbon in the brutalist dialect.
 */

const OUTLINE = '#241a2e';

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
  /** Champion chevron stitched at the shoulders. */
  emblem?: boolean;
}

/**
 * Each cape is a different piece of cloth, not a recolor: the wolf pelt
 * is short heavy fur, emberweave is light and restless, the champion's
 * mantle is long and stately.
 */
const CAPE_STYLES: Record<string, CapeStyle> = {
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
    emblem: true,
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
  /** Per-cape flutter phase — no two capes ripple in sync. */
  private readonly phase: number;
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
    const ret = Math.exp(-2.6 * h); // velocity retention — cloth, not rope
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
      // flutter ripple travelling down the cloth.
      const windK = st.windMul * (0.35 + 0.65 * ti) * 2.1;
      const rip = Math.sin(tSec * (5.1 + st.flutter * 1.3) + this.phase + i * 1.9);
      const flut = st.flutter * 1.5 * ti * rip;
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
      // Gravity vs the running billow: speed converts hang into stream.
      const gz = -20 * st.weight + spd * (1.5 + 0.9 * ti) + Math.abs(wind.bx + wind.by) * 0.9 * ti;

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
          q.px += (q.x - q.px) * 0.5;
          q.py += (q.y - q.py) * 0.5;
        }
      }
    }

    const hem = this.nodes[lastI]!;
    this.hemSpd = Math.hypot(hem.x - hem.px, hem.y - hem.py, hem.z - hem.pz) / h;
  }

  /** Where the cloth actually is, for depth-true front/behind sorting. */
  meanY(): number {
    let sum = 0;
    for (let i = 1; i < this.nodes.length; i++) sum += this.nodes[i]!.y;
    return sum / Math.max(1, this.nodes.length - 1);
  }

  /**
   * Depth-true paint side with HYSTERESIS: the cloth must be clearly
   * toward the camera to come in front, and clearly away to go back —
   * inside the band it keeps its last side. Side profiles hover near
   * zero, and without the band they flickered between paint orders
   * every frame.
   */
  front(eY: number): boolean {
    const d = this.meanY() - eY;
    if (d > 0.09) this.isFront = true;
    else if (d < 0.02) this.isFront = false;
    return this.isFront;
  }
}

/**
 * Paint the projected ribbon: base fill, hard-shade fold half, lit
 * shoulder mantle, trim hem, outline — the tunic's own dialect, in cloth.
 * `pts` are the nodes projected to screen by the caller; `wk` is the
 * width scale (camera scale × body size). `sideK` is how side-on the
 * facing is (0 front/back → 1 pure profile): the clasp is seen edge-on
 * in profile so the top narrows, while the hem swings toward the camera
 * and flares FULLER — the forced perspective that makes the cloth read
 * as turning in space with the character. `hemGlow` (0..1, from hem
 * speed) lets a fast-moving trim catch the light.
 */
export function drawCape(
  ctx: CanvasRenderingContext2D,
  pts: Array<{ x: number; y: number }>,
  style: CapeStyle,
  wk: number,
  hurt: boolean,
  sideK = 0,
  hemGlow = 0,
): void {
  const n = pts.length;
  if (n < 3) return;

  // Lateral direction at each node = screen-perpendicular of the chain
  // tangent; widths taper out from shoulder to a flared hem.
  const left: Array<{ x: number; y: number }> = [];
  const right: Array<{ x: number; y: number }> = [];
  const topK = 1 - 0.3 * sideK; // clasp edge-on in profile
  const hemK = 1 + 0.22 * sideK; // hem swings out toward the camera
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)]!;
    const b = pts[Math.min(n - 1, i + 1)]!;
    let tx = b.x - a.x;
    let ty = b.y - a.y;
    const tl = Math.hypot(tx, ty) || 1;
    tx /= tl;
    ty /= tl;
    const t = i / (n - 1);
    const persp = topK + (hemK - topK) * t;
    const w = (style.shoulderW + (style.hemW - style.shoulderW) * t) * wk * persp;
    left.push({ x: pts[i]!.x - -ty * w, y: pts[i]!.y - tx * w });
    right.push({ x: pts[i]!.x + -ty * w, y: pts[i]!.y + tx * w });
  }

  const trace = (edgeA: Array<{ x: number; y: number }>, edgeB: Array<{ x: number; y: number }>) => {
    ctx.beginPath();
    ctx.moveTo(edgeA[0]!.x, edgeA[0]!.y);
    for (let i = 1; i < edgeA.length; i++) ctx.lineTo(edgeA[i]!.x, edgeA[i]!.y);
    for (let i = edgeB.length - 1; i >= 0; i--) ctx.lineTo(edgeB[i]!.x, edgeB[i]!.y);
    ctx.closePath();
  };

  const base = hurt ? '#ffffff' : style.color;
  ctx.fillStyle = base;
  ctx.strokeStyle = OUTLINE;
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(1.5, wk * 0.045);
  trace(left, right);
  ctx.fill();
  ctx.stroke();

  if (!hurt) {
    // Hard fold shade down one half — flat art, no gradients.
    ctx.fillStyle = shade(style.color, -16);
    trace(pts, right);
    ctx.fill();
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
    // Lit mantle plane across the shoulders.
    ctx.fillStyle = shade(style.color, 12);
    trace([left[0]!, left[1]!], [right[0]!, right[1]!]);
    ctx.fill();
    // Trim hem — the accent that names the cape at a glance. A hem
    // moving fast catches the light: the kick that sells the swing.
    ctx.fillStyle = shade(style.trim, Math.round(hemGlow * 22));
    trace([left[n - 2]!, left[n - 1]!], [right[n - 2]!, right[n - 1]!]);
    ctx.fill();
    if (style.emblem && n >= 4) {
      // Champion chevron: a hard triangle stitched below the mantle.
      const m = pts[2]!;
      const cw = style.shoulderW * wk * 0.8;
      ctx.fillStyle = style.trim;
      ctx.beginPath();
      ctx.moveTo(m.x - cw, m.y - cw * 0.5);
      ctx.lineTo(m.x + cw, m.y - cw * 0.5);
      ctx.lineTo(m.x, m.y + cw * 0.9);
      ctx.closePath();
      ctx.fill();
    }
    // Outline again over the shading so the silhouette stays crisp.
    ctx.strokeStyle = OUTLINE;
    trace(left, right);
    ctx.stroke();
  }
}
