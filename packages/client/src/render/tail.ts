import { shade, type GnollLook } from './rig.js';

/**
 * THE TAIL IS A SIMULATION, NOT A POSE — the cape contract in muscle.
 * A world-space verlet chain (x, y in tiles + a height axis) hangs off
 * the back of the hips and is PULLED behind the body: run and it
 * streams out and lags the turn, stop and it swings past and settles,
 * spin and it wraps around the torso column and recovers. Where cloth
 * obeys wind and gravity, a tail has TONE: every node carries a spring
 * toward the species' rest carriage (low, sunk, behind the facing), so
 * the brush always comes home to the hyena's flag instead of hanging
 * like a rope. The renderer ticks it once per frame beside the cape
 * sim and projects the nodes; depth follows the cape's facing law, so
 * the z-order is right at every one of the eight bands by
 * construction.
 */

interface TailNode {
  x: number;
  y: number;
  z: number;
  px: number;
  py: number;
  pz: number;
}

/** How far behind the hip line the tail roots (tiles). */
const BACK_OFF = 0.12;
/** The brush may not pierce the torso column. */
const BODY_R = 0.15;
/** The brush rides low but never scrapes the dirt. */
const GROUND_Z = 0.045;

export class TailSim {
  readonly nodes: TailNode[] = [];
  /** Per-body phase — a warband never wags in sync. */
  readonly phase: number;
  private readonly segLen: number;
  private readonly segs: number;
  private lastAx = 0;
  private lastAy = 0;
  private live = false;
  private isFront = false;
  private restlessUntil = 0;
  /**
   * True while the brush genuinely moves (anchor travel or a tip still
   * swinging after a stop) — the renderer's cue to re-bake the body
   * sprite at full rate. Calm tails fall back to the idle cadence,
   * whose ~8-frame resample is exactly right for the resting wag.
   */
  restless = false;
  /** Tip speed (tiles/s) — the settle detector. */
  tipSpd = 0;

  constructor(
    private readonly heavy: number,
    seed: number,
  ) {
    this.segs = 6;
    this.segLen = 0.072 * (1 + 0.3 * (heavy - 1));
    this.phase = (seed % 97) * 0.613;
  }

  /**
   * Advance the tail one frame. (ax, ay) is the body's world position
   * (lunge included), az the HIP height in tile units, dir the facing
   * in radians. sizeK scales the whole appendage (the packlord 1.42).
   */
  update(
    ax: number,
    ay: number,
    az: number,
    dir: number,
    dt: number,
    tSec: number,
    sizeK: number,
  ): void {
    const n = this.segs + 1;
    const fx = Math.cos(dir);
    const fy = Math.sin(dir);
    const cx = ax - fx * BACK_OFF * sizeK;
    const cy = ay - fy * BACK_OFF * sizeK;
    const seg = this.segLen * sizeK;

    // First sight or teleport: lay the brush at rest behind the facing
    // — never let it whip across the map to catch up.
    if (
      !this.live ||
      this.nodes.length !== n ||
      Math.hypot(cx - this.nodes[0]!.x, cy - this.nodes[0]!.y) > 2
    ) {
      this.nodes.length = 0;
      for (let i = 0; i < n; i++) {
        const ti = i / (n - 1);
        const x = cx - fx * seg * i;
        const y = cy - fy * seg * i;
        const z = Math.max(GROUND_Z, az * (1 - 0.55 * ti));
        this.nodes.push({ x, y, z, px: x, py: y, pz: z });
      }
      this.lastAx = ax;
      this.lastAy = ay;
      this.live = true;
    }

    const h = Math.min(0.05, Math.max(0.001, dt));
    // MUSCLE, NOT CLOTH: damping heavier than any cape — a tail swings
    // with the body and comes home, it never flutters.
    const ret = Math.exp(-4.6 * h);
    const hh = h * h;

    // Anchor speed: a lope streams the brush out and lifts its carry.
    const spd = Math.min(7, Math.hypot(ax - this.lastAx, ay - this.lastAy) / h);
    this.lastAx = ax;
    this.lastAy = ay;
    // The carry: sunk at rest (the hunched silhouette), rising toward
    // level as the body runs — a hyena's flag only lifts for the chase.
    const carry = 0.55 - Math.min(0.28, spd * 0.055);

    const lastI = n - 1;
    for (let i = 1; i < n; i++) {
      const nd = this.nodes[i]!;
      const ti = i / lastI;
      const vx = (nd.x - nd.px) * ret;
      const vy = (nd.y - nd.py) * ret;
      const vz = (nd.z - nd.pz) * ret;
      nd.px = nd.x;
      nd.py = nd.y;
      nd.pz = nd.z;

      // The rest carriage this node's muscle pulls toward: straight
      // behind the facing, drooping down the carry curve. Base nodes
      // hold the line hard, the tip is freest to lag and whip — which
      // is exactly what makes the trailing read organic.
      const rx = cx - fx * seg * i;
      const ry = cy - fy * seg * i;
      const rz = Math.max(GROUND_Z, az * (1 - carry * ti));
      const tone = 30 * (1 - 0.62 * ti);
      let gx = (rx - nd.x) * tone;
      let gy = (ry - nd.y) * tone;
      const gz = (rz - nd.z) * tone * 0.8 - 5 * this.heavy;

      // The wag: a lateral beat perpendicular to the facing, quick and
      // shallow at rest, wider and faster on the move — plus each
      // node a phase step behind the last, so the wave TRAVELS down
      // the brush instead of stamping it.
      const wagHz = 2.0 + Math.min(2.4, spd * 0.55);
      const wag =
        Math.sin(tSec * wagHz * Math.PI + this.phase + ti * 2.3) *
        (0.55 + 1.3 * Math.min(1, spd / 4)) *
        ti *
        3.0;
      gx += -fy * wag;
      gy += fx * wag;

      nd.x += vx + gx * hh;
      nd.y += vy + gy * hh;
      nd.z += vz + gz * hh;
    }

    // Constraints: pin the root, keep segment lengths, stay out of the
    // torso column, never scrape the ground.
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
        // The parent is stiffer than the child — the tail hangs FROM
        // the body, the same law the cape learned.
        const wq = i === 1 ? 1 : 0.7;
        q.x -= dx * err * wq;
        q.y -= dy * err * wq;
        q.z -= dz * err * wq;
        if (i > 1) {
          p.x += dx * err * (1 - wq);
          p.y += dy * err * (1 - wq);
          p.z += dz * err * (1 - wq);
        }

        const bdx = q.x - ax;
        const bdy = q.y - ay;
        const bd = Math.hypot(bdx, bdy);
        const minR = BODY_R * sizeK;
        if (bd < minR && q.z > 0.1) {
          const push = (minR - bd) / (bd || 1e-6);
          q.x += bdx * push;
          q.y += bdy * push;
        }

        if (q.z < GROUND_Z) q.z = GROUND_Z;
      }
    }

    const tip = this.nodes[lastI]!;
    this.tipSpd = Math.hypot(tip.x - tip.px, tip.y - tip.py, tip.z - tip.pz) / h;
    if (spd > 0.25 || this.tipSpd > 0.45) this.restlessUntil = tSec + 0.5;
    this.restless = tSec < this.restlessUntil;
  }

  /**
   * Paint side is a FACING law, not a tail-position law — the cape's
   * exact hysteresis. The tail lives on the back, and the back is
   * toward the camera exactly when the facing points up-screen.
   */
  front(fy: number): boolean {
    if (fy < -0.22) this.isFront = true;
    else if (fy > -0.1) this.isFront = false;
    return this.isFront;
  }
}

export interface TailDrawOpts {
  hurt: boolean;
}

/**
 * Paint the projected brush: a tapered ribbon through the simulated
 * nodes with the bushy mid-length bulge, the trailing-half form shade,
 * pale underfur along the low edge, two mask rings that WRAP the
 * volume (rungs, not blobs), and the mask-dipped tip. `pts` are the
 * nodes projected to screen by the caller; `wk` is the width scale
 * (camera scale × body size). Built with plain path calls — no Path2D
 * — so the node-side painter tests can walk every coordinate.
 */
export function drawTail(
  ctx: CanvasRenderingContext2D,
  pts: Array<{ x: number; y: number }>,
  gn: GnollLook,
  wk: number,
  opts: TailDrawOpts,
): void {
  const n = pts.length;
  if (n < 3) return;
  const { hurt } = opts;

  // Edges: perpendicular of the chain tangent at each node, widths on
  // the brush profile — slim root, fat mid-length bulge, tapered tip.
  const left: Array<{ x: number; y: number }> = [];
  const right: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)]!;
    const b = pts[Math.min(n - 1, i + 1)]!;
    let tx = b.x - a.x;
    let ty = b.y - a.y;
    const tl = Math.hypot(tx, ty) || 1;
    tx /= tl;
    ty /= tl;
    const t = i / (n - 1);
    const w =
      (0.024 + 0.055 * Math.sin(Math.min(1, t * 1.2) * Math.PI) + 0.014 * (1 - t)) *
      gn.heavy *
      wk;
    left.push({ x: pts[i]!.x + ty * w, y: pts[i]!.y - tx * w });
    right.push({ x: pts[i]!.x - ty * w, y: pts[i]!.y + tx * w });
  }

  const silhouette = (): void => {
    ctx.beginPath();
    ctx.moveTo(left[0]!.x, left[0]!.y);
    for (let i = 1; i < n; i++) ctx.lineTo(left[i]!.x, left[i]!.y);
    // Rounded tip: bow the path out past the last node.
    const tipX = pts[n - 1]!.x + (pts[n - 1]!.x - pts[n - 2]!.x) * 0.4;
    const tipY = pts[n - 1]!.y + (pts[n - 1]!.y - pts[n - 2]!.y) * 0.4;
    ctx.quadraticCurveTo(tipX, tipY, right[n - 1]!.x, right[n - 1]!.y);
    for (let i = n - 2; i >= 0; i--) ctx.lineTo(right[i]!.x, right[i]!.y);
    ctx.closePath();
  };

  ctx.lineJoin = 'round';
  ctx.fillStyle = hurt ? '#ffffff' : gn.fur;
  silhouette();
  ctx.fill();
  if (hurt) return;

  // Trailing-half form shade — the same ONE-SUN split the body wears.
  ctx.save();
  silhouette();
  ctx.clip();
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = shade(gn.fur, -14);
  ctx.beginPath();
  ctx.moveTo(pts[0]!.x, pts[0]!.y);
  for (let i = 1; i < n; i++) ctx.lineTo(pts[i]!.x, pts[i]!.y);
  for (let i = n - 1; i >= 0; i--) ctx.lineTo(right[i]!.x, right[i]!.y);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
  // Two THIN mask rings that wrap the volume — narrow slices inset
  // into their rungs so they ride every swing. Full-rung bands read
  // raccoon; a hyena's tail carries pinstripes, not panels.
  ctx.fillStyle = shade(gn.mask, -2);
  for (const i0 of [2, 4]) {
    const la = left[i0]!;
    const lb = left[i0 + 1]!;
    const ra = right[i0]!;
    const rb = right[i0 + 1]!;
    ctx.beginPath();
    ctx.moveTo(la.x + (lb.x - la.x) * 0.3, la.y + (lb.y - la.y) * 0.3);
    ctx.lineTo(la.x + (lb.x - la.x) * 0.62, la.y + (lb.y - la.y) * 0.62);
    ctx.lineTo(ra.x + (rb.x - ra.x) * 0.62, ra.y + (rb.y - ra.y) * 0.62);
    ctx.lineTo(ra.x + (rb.x - ra.x) * 0.3, ra.y + (rb.y - ra.y) * 0.3);
    ctx.closePath();
    ctx.fill();
  }
  // The mask tip: the last knuckle dips in the dark ink.
  ctx.fillStyle = gn.mask;
  ctx.beginPath();
  ctx.moveTo(left[n - 2]!.x, left[n - 2]!.y);
  ctx.lineTo(left[n - 1]!.x, left[n - 1]!.y);
  const capX = pts[n - 1]!.x + (pts[n - 1]!.x - pts[n - 2]!.x) * 0.45;
  const capY = pts[n - 1]!.y + (pts[n - 1]!.y - pts[n - 2]!.y) * 0.45;
  ctx.quadraticCurveTo(capX, capY, right[n - 1]!.x, right[n - 1]!.y);
  ctx.lineTo(right[n - 2]!.x, right[n - 2]!.y);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Pale underfur along the DOWN-SCREEN edge — the brush's low side.
  let leftDown = 0;
  for (let i = 1; i < n - 1; i++) leftDown += left[i]!.y - right[i]!.y;
  const low = leftDown >= 0 ? left : right;
  ctx.strokeStyle = shade(gn.underfur, -8);
  ctx.lineWidth = Math.max(1, wk * 0.016);
  ctx.beginPath();
  ctx.moveTo(low[1]!.x, low[1]!.y);
  for (let i = 2; i <= n - 2; i++) ctx.lineTo(low[i]!.x, low[i]!.y);
  ctx.stroke();

  // A quiet contour so the brush separates from the same-fur body when
  // it swings across it (the front band's whole depth read).
  ctx.strokeStyle = shade(gn.fur, -24);
  ctx.lineWidth = Math.max(1, wk * 0.014);
  silhouette();
  ctx.stroke();
}
