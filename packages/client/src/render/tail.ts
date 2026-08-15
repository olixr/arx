import { shade, type FoxLook, type GnollLook, type LynxLook } from './rig.js';

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

  /**
   * `rootOff` seats the root behind the anchor (tiles). The default is
   * the humanoid hip line; a QUADRUPED must pass its own body
   * half-length or the tail roots INSIDE the torso and hangs between
   * the legs — the fox lesson.
   */
  constructor(
    private readonly heavy: number,
    seed: number,
    private readonly rootOff: number = BACK_OFF,
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
    const cx = ax - fx * this.rootOff * sizeK;
    const cy = ay - fy * this.rootOff * sizeK;
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

/**
 * THE BOBTAIL IS A SIMULATION TOO — the lynx's stub on the same verlet
 * contract as the gnoll brush, retuned for a cat: THREE short segments
 * of pure muscle (tone far above the hyena's flag, damping heavier),
 * and a rest carriage that PERKS — the stub stands up-and-back off the
 * high rump at rest and through the pounce crouch (`perk` 1), then
 * flattens toward level as the body opens into a run. The flick is a
 * quick tip beat, agitated while wound, lazy at rest. Same restless
 * cue, same facing-law front() hysteresis, same lifecycle on the
 * renderer's anim map.
 */
export class BobtailSim {
  readonly nodes: TailNode[] = [];
  readonly phase: number;
  private readonly segLen: number;
  private readonly segs: number;
  private lastAx = 0;
  private lastAy = 0;
  private live = false;
  private isFront = false;
  private restlessUntil = 0;
  restless = false;
  tipSpd = 0;

  constructor(
    private readonly heavy: number,
    seed: number,
    /**
     * Rest-carriage dial: 1 = the cat's perked stub (the shipped
     * behavior, exactly); fractions lay the chain down — the turtle's
     * armored tail TRAILS low off the stern instead of standing.
     */
    private readonly standK: number = 1,
  ) {
    this.segs = 3;
    this.segLen = 0.055 * (1 + 0.35 * (heavy - 1));
    this.phase = (seed % 89) * 0.677;
  }

  /**
   * (ax, ay) body world position (lunge included), az the RUMP-TOP
   * height in tiles (the stub roots high, not at the hip line), dir
   * the facing, `perk` 0..1 — 1 through the pounce crouch, and the
   * caller may feed idle interest.
   */
  update(
    ax: number,
    ay: number,
    az: number,
    dir: number,
    dt: number,
    tSec: number,
    sizeK: number,
    perk: number,
  ): void {
    const n = this.segs + 1;
    const fx = Math.cos(dir);
    const fy = Math.sin(dir);
    const cx = ax - fx * 0.3 * sizeK;
    const cy = ay - fy * 0.3 * sizeK;
    const seg = this.segLen * sizeK;

    if (
      !this.live ||
      this.nodes.length !== n ||
      Math.hypot(cx - this.nodes[0]!.x, cy - this.nodes[0]!.y) > 2
    ) {
      this.nodes.length = 0;
      for (let i = 0; i < n; i++) {
        const ti = i / (n - 1);
        const x = cx - fx * seg * i * 0.6;
        const y = cy - fy * seg * i * 0.6;
        const z = az + seg * i * 0.8 * ti;
        this.nodes.push({ x, y, z, px: x, py: y, pz: z });
      }
      this.lastAx = ax;
      this.lastAy = ay;
      this.live = true;
    }

    const h = Math.min(0.05, Math.max(0.001, dt));
    // PURE MUSCLE: heavier damping than the hyena flag — a bob never
    // flutters, it FLICKS and settles.
    const ret = Math.exp(-5.4 * h);
    const hh = h * h;

    const spd = Math.min(7, Math.hypot(ax - this.lastAx, ay - this.lastAy) / h);
    this.lastAx = ax;
    this.lastAy = ay;
    // The carriage: perked near-vertical at rest and in the crouch,
    // laying back toward the facing line at a flat run. standK 1 is
    // the cat verbatim; a low dial keeps the chain trailed always.
    const stand = Math.max(
      0.25 * this.standK,
      (0.85 + 0.35 * perk - Math.min(0.6, spd * 0.13)) * this.standK,
    );

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

      // Rest carriage: a short arc up-and-back — the run flattens it,
      // the perk stands it. High muscle tone all the way to the tip
      // (a bob has no lagging rope length to spend).
      const back = seg * i * (1.05 - stand * 0.55);
      const rx = cx - fx * back;
      const ry = cy - fy * back;
      const rz = az + seg * i * stand * 0.9;
      const tone = 46 * (1 - 0.45 * ti);
      let gx = (rx - nd.x) * tone;
      let gy = (ry - nd.y) * tone;
      const gz = (rz - nd.z) * tone * 0.9 - 2.4 * this.heavy;

      // The flick: quick lateral tip beats — lazy at rest, agitated
      // while wound or running; the phase step makes it travel.
      const flickHz = 1.6 + Math.min(2.0, spd * 0.5) + perk * 1.6;
      // The carriage dial tones the beat with it: an armored trailer
      // sways where a cat's stub whips (standK 1 = the cat verbatim).
      const flick =
        Math.sin(tSec * flickHz * Math.PI + this.phase + ti * 1.9) *
        (0.4 + 0.9 * Math.min(1, spd / 4) + 0.7 * perk) *
        ti *
        2.6 *
        this.standK;
      gx += -fy * flick;
      gy += fx * flick;

      nd.x += vx + gx * hh;
      nd.y += vy + gy * hh;
      nd.z += vz + gz * hh;
    }

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
        const wq = i === 1 ? 1 : 0.7;
        q.x -= dx * err * wq;
        q.y -= dy * err * wq;
        q.z -= dz * err * wq;
        if (i > 1) {
          p.x += dx * err * (1 - wq);
          p.y += dy * err * (1 - wq);
          p.z += dz * err * (1 - wq);
        }
        if (q.z < GROUND_Z) q.z = GROUND_Z;
      }
    }

    const tip = this.nodes[lastI]!;
    this.tipSpd = Math.hypot(tip.x - tip.px, tip.y - tip.py, tip.z - tip.pz) / h;
    if (spd > 0.25 || this.tipSpd > 0.4) this.restlessUntil = tSec + 0.5;
    this.restless = tSec < this.restlessUntil;
  }

  /** The cape's exact facing-law hysteresis. */
  front(fy: number): boolean {
    if (fy < -0.22) this.isFront = true;
    else if (fy > -0.1) this.isFront = false;
    return this.isFront;
  }
}

export interface BobtailDrawOpts {
  hurt: boolean;
  /**
   * True when the facing points up-screen: the perked stub stands
   * against the cat's own back, so it shows its pale UNDERSIDE — a
   * dark stub against the coat read as a hole punched in the body.
   */
  back: boolean;
}

/**
 * Paint the projected bob: a short tapered ribbon through the
 * simulated nodes, black-dipped tip, the champion's silver ring below
 * it. Plain path calls — no Path2D — so node tests can walk it.
 */
export function drawBobtail(
  ctx: CanvasRenderingContext2D,
  pts: Array<{ x: number; y: number }>,
  look: LynxLook,
  wk: number,
  opts: BobtailDrawOpts,
): void {
  const n = pts.length;
  if (n < 3) return;
  const champ = look.champion === true;
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
    const w = (0.048 - 0.014 * t) * (champ ? 1.25 : 1) * wk;
    left.push({ x: pts[i]!.x + ty * w, y: pts[i]!.y - tx * w });
    right.push({ x: pts[i]!.x - ty * w, y: pts[i]!.y + tx * w });
  }

  const silhouette = (): void => {
    ctx.beginPath();
    ctx.moveTo(left[0]!.x, left[0]!.y);
    for (let i = 1; i < n; i++) ctx.lineTo(left[i]!.x, left[i]!.y);
    const tipX = pts[n - 1]!.x + (pts[n - 1]!.x - pts[n - 2]!.x) * 0.45;
    const tipY = pts[n - 1]!.y + (pts[n - 1]!.y - pts[n - 2]!.y) * 0.45;
    ctx.quadraticCurveTo(tipX, tipY, right[n - 1]!.x, right[n - 1]!.y);
    for (let i = n - 2; i >= 0; i--) ctx.lineTo(right[i]!.x, right[i]!.y);
    ctx.closePath();
  };

  ctx.lineJoin = 'round';
  ctx.fillStyle = opts.hurt ? '#ffffff' : opts.back ? look.under : shade(look.coat, -3);
  silhouette();
  ctx.fill();
  if (opts.hurt) return;

  // The black tip: the last knuckle dips in the tuft ink — the read
  // that survives any zoom.
  ctx.save();
  silhouette();
  ctx.clip();
  ctx.fillStyle = look.tuft;
  ctx.beginPath();
  ctx.moveTo(left[n - 2]!.x, left[n - 2]!.y);
  ctx.lineTo(left[n - 1]!.x, left[n - 1]!.y);
  const capX = pts[n - 1]!.x + (pts[n - 1]!.x - pts[n - 2]!.x) * 0.5;
  const capY = pts[n - 1]!.y + (pts[n - 1]!.y - pts[n - 2]!.y) * 0.5;
  ctx.quadraticCurveTo(capX, capY, right[n - 1]!.x, right[n - 1]!.y);
  ctx.lineTo(right[n - 2]!.x, right[n - 2]!.y);
  ctx.closePath();
  ctx.fill();
  // The duskruff's silver ring below the black.
  if (champ && look.grizzle) {
    ctx.fillStyle = look.grizzle;
    const la = left[n - 3]!;
    const lb = left[n - 2]!;
    const ra = right[n - 3]!;
    const rb = right[n - 2]!;
    ctx.beginPath();
    ctx.moveTo(la.x + (lb.x - la.x) * 0.55, la.y + (lb.y - la.y) * 0.55);
    ctx.lineTo(lb.x, lb.y);
    ctx.lineTo(rb.x, rb.y);
    ctx.lineTo(ra.x + (rb.x - ra.x) * 0.55, ra.y + (rb.y - ra.y) * 0.55);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // The quiet contour that separates the stub from same-fur flanks.
  ctx.strokeStyle = shade(look.coat, -24);
  ctx.lineWidth = Math.max(1, wk * 0.012);
  silhouette();
  ctx.stroke();
}

export interface TurtleTailStyle {
  skin: string;
  spike: string;
  /** Width multiplier — the colossus drags a thicker trailer. */
  heavy: number;
}

/**
 * Paint the projected turtle tail: a tapered armored cone off the
 * stern with spikelets marching down the dorsal edge — low-carried
 * muscle, never a plume. The painter never learns a species (the
 * canid-lane law): dials ride the style. Plain path calls — no
 * Path2D — so node-side painter tests can walk every coordinate.
 */
export function drawTurtleTail(
  ctx: CanvasRenderingContext2D,
  pts: Array<{ x: number; y: number }>,
  st: TurtleTailStyle,
  wk: number,
  opts: BobtailDrawOpts,
): void {
  const n = pts.length;
  if (n < 3) return;
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
    const w = (0.062 - 0.044 * t) * st.heavy * wk;
    left.push({ x: pts[i]!.x + ty * w, y: pts[i]!.y - tx * w });
    right.push({ x: pts[i]!.x - ty * w, y: pts[i]!.y + tx * w });
  }

  const silhouette = (): void => {
    ctx.beginPath();
    ctx.moveTo(left[0]!.x, left[0]!.y);
    for (let i = 1; i < n; i++) ctx.lineTo(left[i]!.x, left[i]!.y);
    // The tip closes to a point — armor, not fur.
    const tipX = pts[n - 1]!.x + (pts[n - 1]!.x - pts[n - 2]!.x) * 0.55;
    const tipY = pts[n - 1]!.y + (pts[n - 1]!.y - pts[n - 2]!.y) * 0.55;
    ctx.lineTo(tipX, tipY);
    for (let i = n - 1; i >= 0; i--) ctx.lineTo(right[i]!.x, right[i]!.y);
    ctx.closePath();
  };

  ctx.lineJoin = 'round';
  ctx.fillStyle = opts.hurt ? '#ffffff' : shade(st.skin, opts.back ? -14 : -6);
  silhouette();
  ctx.fill();
  if (opts.hurt) return;

  // Spikelets off the UPPER edge — whichever ribbon side currently
  // rides higher on screen, so the ridge stays dorsal at every facing.
  ctx.fillStyle = st.spike;
  for (let i = 1; i < n - 1; i++) {
    const hi = left[i]!.y <= right[i]!.y ? left[i]! : right[i]!;
    const t = i / (n - 1);
    const sw = (0.05 - 0.028 * t) * st.heavy * wk;
    ctx.beginPath();
    ctx.moveTo(hi.x - sw * 0.55, hi.y + sw * 0.2);
    ctx.lineTo(hi.x - sw * 0.1, hi.y - sw * 1.35);
    ctx.lineTo(hi.x + sw * 0.55, hi.y + sw * 0.2);
    ctx.closePath();
    ctx.fill();
  }

  // Segment rings: the armored joints, quiet.
  ctx.strokeStyle = shade(st.skin, -22);
  ctx.lineWidth = Math.max(1, wk * 0.014);
  for (let i = 1; i < n - 1; i++) {
    ctx.beginPath();
    ctx.moveTo(left[i]!.x, left[i]!.y);
    ctx.lineTo(right[i]!.x, right[i]!.y);
    ctx.stroke();
  }
  // The quiet contour that separates the trailer from the ground.
  silhouette();
  ctx.stroke();
}

export interface FoxBrushDrawOpts {
  hurt: boolean;
  /**
   * True when the facing points up-screen: the brush swings against
   * the fox's own back, so its fill steps to the pale underfur — a
   * same-coat plume over the body read as the body grown a tumor.
   */
  back: boolean;
}

/**
 * Paint the projected BRUSH — the fox's flag, the biggest tail any
 * beast in the wood carries: a full plume swelling past mid-length and
 * HOLDING its volume almost to the end, the darker root third grown
 * in (never a banded raccoon), and the flag tip — white on the wild
 * skulk, smoke over one ember ring on the matriarch. Pale underfur
 * rides the low edge; a quiet contour separates the plume from
 * same-coat flanks. Plain path calls — no Path2D — so node-side
 * painter tests can walk every coordinate.
 */
export function drawFoxBrush(
  ctx: CanvasRenderingContext2D,
  pts: Array<{ x: number; y: number }>,
  look: FoxLook,
  wk: number,
  opts: FoxBrushDrawOpts,
): void {
  const n = pts.length;
  // The root-third and flag overlays walk fixed knuckles — the brush
  // needs the full TailSim chain, not a stub.
  if (n < 5) return;
  const queen = look.champion === true;
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
    // The plume profile: a slim rooted neck, then volume that swells
    // fast and HOLDS — pow flattens the sine's peak so the brush
    // carries fat past mid-length instead of dieting to a whip.
    const w =
      (0.02 + 0.078 * Math.pow(Math.sin(Math.min(1, t * 1.06) * Math.PI), 0.65)) *
      (queen ? 1.2 : 1) *
      wk;
    left.push({ x: pts[i]!.x + ty * w, y: pts[i]!.y - tx * w });
    right.push({ x: pts[i]!.x - ty * w, y: pts[i]!.y + tx * w });
  }

  const silhouette = (): void => {
    ctx.beginPath();
    ctx.moveTo(left[0]!.x, left[0]!.y);
    for (let i = 1; i < n; i++) ctx.lineTo(left[i]!.x, left[i]!.y);
    const tipX = pts[n - 1]!.x + (pts[n - 1]!.x - pts[n - 2]!.x) * 0.5;
    const tipY = pts[n - 1]!.y + (pts[n - 1]!.y - pts[n - 2]!.y) * 0.5;
    ctx.quadraticCurveTo(tipX, tipY, right[n - 1]!.x, right[n - 1]!.y);
    for (let i = n - 2; i >= 0; i--) ctx.lineTo(right[i]!.x, right[i]!.y);
    ctx.closePath();
  };

  ctx.lineJoin = 'round';
  // The back view shows underfur, but DIMMED toward the coat — raw
  // cream painted plume-wide read as a balloon over the body.
  ctx.fillStyle = opts.hurt ? '#ffffff' : opts.back ? shade(look.under, -22) : shade(look.coat, -3);
  silhouette();
  ctx.fill();
  if (opts.hurt) return;

  ctx.save();
  silhouette();
  ctx.clip();
  // The darker root third, grown in along the chain — volume shading,
  // never a ring.
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = opts.back ? shade(look.under, -34) : look.brushRoot;
  ctx.beginPath();
  ctx.moveTo(left[0]!.x, left[0]!.y);
  ctx.lineTo(left[1]!.x, left[1]!.y);
  ctx.lineTo(left[2]!.x + (left[3]!.x - left[2]!.x) * 0.4, left[2]!.y + (left[3]!.y - left[2]!.y) * 0.4);
  ctx.lineTo(right[2]!.x + (right[3]!.x - right[2]!.x) * 0.4, right[2]!.y + (right[3]!.y - right[2]!.y) * 0.4);
  ctx.lineTo(right[1]!.x, right[1]!.y);
  ctx.lineTo(right[0]!.x, right[0]!.y);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
  // THE FLAG: the last knuckle and a half dips in the tip — white for
  // the skulk, smoke for the queen. The read that survives any zoom.
  ctx.fillStyle = look.tip;
  ctx.beginPath();
  const fl = n - 2;
  ctx.moveTo(left[fl]!.x + (left[fl - 1]!.x - left[fl]!.x) * 0.35, left[fl]!.y + (left[fl - 1]!.y - left[fl]!.y) * 0.35);
  for (let i = fl; i < n; i++) ctx.lineTo(left[i]!.x, left[i]!.y);
  const capX = pts[n - 1]!.x + (pts[n - 1]!.x - pts[n - 2]!.x) * 0.55;
  const capY = pts[n - 1]!.y + (pts[n - 1]!.y - pts[n - 2]!.y) * 0.55;
  ctx.quadraticCurveTo(capX, capY, right[n - 1]!.x, right[n - 1]!.y);
  for (let i = n - 2; i >= fl; i--) ctx.lineTo(right[i]!.x, right[i]!.y);
  ctx.lineTo(right[fl]!.x + (right[fl - 1]!.x - right[fl]!.x) * 0.35, right[fl]!.y + (right[fl - 1]!.y - right[fl]!.y) * 0.35);
  ctx.closePath();
  ctx.fill();
  // The queen's ember ring, banded hot below the smoke — her one
  // bright mark, where the whole skulk's flag burns white.
  if (queen && look.ember) {
    ctx.fillStyle = look.ember;
    const la = left[n - 3]!;
    const lb = left[n - 2]!;
    const ra = right[n - 3]!;
    const rb = right[n - 2]!;
    ctx.beginPath();
    ctx.moveTo(la.x + (lb.x - la.x) * 0.5, la.y + (lb.y - la.y) * 0.5);
    ctx.lineTo(la.x + (lb.x - la.x) * 0.82, la.y + (lb.y - la.y) * 0.82);
    ctx.lineTo(ra.x + (rb.x - ra.x) * 0.82, ra.y + (rb.y - ra.y) * 0.82);
    ctx.lineTo(ra.x + (rb.x - ra.x) * 0.5, ra.y + (rb.y - ra.y) * 0.5);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Pale underfur along the DOWN-SCREEN edge — the plume's low side.
  let leftDown = 0;
  for (let i = 1; i < n - 1; i++) leftDown += left[i]!.y - right[i]!.y;
  const low = leftDown >= 0 ? left : right;
  ctx.strokeStyle = shade(look.under, -6);
  ctx.lineWidth = Math.max(1, wk * 0.018);
  ctx.beginPath();
  ctx.moveTo(low[1]!.x, low[1]!.y);
  for (let i = 2; i <= n - 2; i++) ctx.lineTo(low[i]!.x, low[i]!.y);
  ctx.stroke();

  // The quiet contour separating the brush from same-coat flanks.
  ctx.strokeStyle = shade(look.coat, -24);
  ctx.lineWidth = Math.max(1, wk * 0.014);
  silhouette();
  ctx.stroke();
}

/** Pre-resolved wolf-brush tones — the painter never learns a species. */
export interface WolfBrushStyle {
  coat: string;
  under: string;
  /** The tip dip: saddle-dark on the pack, frost-pale on the matriarch
   *  — the inversion detail, kept on physics. */
  tip: string;
  /** Volume scale — the matriarch's brush out-masses the pack's. */
  heavy: number;
}

/**
 * Paint the projected WOLF BRUSH — the canid hang: bushy through the
 * middle, slimmer than the fox's flag plume, dipped at the tip in the
 * style's own ink. Pale underfur rides the low edge; a quiet contour
 * separates the brush from same-coat flanks. Plain path calls — no
 * Path2D — so node-side painter tests can walk every coordinate.
 */
export function drawWolfBrush(
  ctx: CanvasRenderingContext2D,
  pts: Array<{ x: number; y: number }>,
  st: WolfBrushStyle,
  wk: number,
  opts: FoxBrushDrawOpts,
): void {
  const n = pts.length;
  if (n < 4) return;
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
    // The wolf profile: a fuller root than the fox (the brush grows
    // straight out of the guard hairs), bushy mid, honest taper.
    const w =
      (0.026 + 0.062 * Math.pow(Math.sin(Math.min(1, t * 1.08) * Math.PI), 0.75) + 0.01 * (1 - t)) *
      st.heavy *
      wk;
    left.push({ x: pts[i]!.x + ty * w, y: pts[i]!.y - tx * w });
    right.push({ x: pts[i]!.x - ty * w, y: pts[i]!.y + tx * w });
  }

  const silhouette = (): void => {
    ctx.beginPath();
    ctx.moveTo(left[0]!.x, left[0]!.y);
    for (let i = 1; i < n; i++) ctx.lineTo(left[i]!.x, left[i]!.y);
    const tipX = pts[n - 1]!.x + (pts[n - 1]!.x - pts[n - 2]!.x) * 0.45;
    const tipY = pts[n - 1]!.y + (pts[n - 1]!.y - pts[n - 2]!.y) * 0.45;
    ctx.quadraticCurveTo(tipX, tipY, right[n - 1]!.x, right[n - 1]!.y);
    for (let i = n - 2; i >= 0; i--) ctx.lineTo(right[i]!.x, right[i]!.y);
    ctx.closePath();
  };

  ctx.lineJoin = 'round';
  // The back view shows underfur DIMMED toward the coat — the fox's
  // balloon lesson, inherited.
  ctx.fillStyle = opts.hurt ? '#ffffff' : opts.back ? shade(st.under, -24) : shade(st.coat, -4);
  silhouette();
  ctx.fill();
  if (opts.hurt) return;

  ctx.save();
  silhouette();
  ctx.clip();
  // The tip dip: the last knuckle and a half in the style's own ink —
  // the read that survives any zoom, dark or frost.
  ctx.fillStyle = st.tip;
  ctx.beginPath();
  const fl = n - 2;
  ctx.moveTo(left[fl]!.x + (left[fl - 1]!.x - left[fl]!.x) * 0.3, left[fl]!.y + (left[fl - 1]!.y - left[fl]!.y) * 0.3);
  for (let i = fl; i < n; i++) ctx.lineTo(left[i]!.x, left[i]!.y);
  const capX = pts[n - 1]!.x + (pts[n - 1]!.x - pts[n - 2]!.x) * 0.5;
  const capY = pts[n - 1]!.y + (pts[n - 1]!.y - pts[n - 2]!.y) * 0.5;
  ctx.quadraticCurveTo(capX, capY, right[n - 1]!.x, right[n - 1]!.y);
  for (let i = n - 2; i >= fl; i--) ctx.lineTo(right[i]!.x, right[i]!.y);
  ctx.lineTo(right[fl]!.x + (right[fl - 1]!.x - right[fl]!.x) * 0.3, right[fl]!.y + (right[fl - 1]!.y - right[fl]!.y) * 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Pale underfur along the DOWN-SCREEN edge — the brush's low side.
  let leftDown = 0;
  for (let i = 1; i < n - 1; i++) leftDown += left[i]!.y - right[i]!.y;
  const low = leftDown >= 0 ? left : right;
  ctx.strokeStyle = shade(st.under, -8);
  ctx.lineWidth = Math.max(1, wk * 0.016);
  ctx.beginPath();
  ctx.moveTo(low[1]!.x, low[1]!.y);
  for (let i = 2; i <= n - 2; i++) ctx.lineTo(low[i]!.x, low[i]!.y);
  ctx.stroke();

  // The quiet contour separating the brush from same-coat flanks.
  ctx.strokeStyle = shade(st.coat, -24);
  ctx.lineWidth = Math.max(1, wk * 0.014);
  silhouette();
  ctx.stroke();
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
