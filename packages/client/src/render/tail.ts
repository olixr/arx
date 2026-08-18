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
   *
   * `tipCurl` lifts the rest carriage back UP toward the tip (a
   * fraction of the root height, squared along the chain) — the
   * feline hook: a big cat's tail sweeps low off the haunch and rises
   * through its last third. Zero (the default) is the hanging carry
   * every existing tail ships with, verbatim.
   *
   * `restCarry` is the rest droop fraction: how much of the root
   * height the chain gives up by the tip while standing. The default
   * 0.55 is the hyena flag every shipped tail wears; a horse's hair
   * fall HANGS (≈0.88) and only lifts toward the stream at a gallop —
   * speed scales the carry off this same dial.
   */
  constructor(
    private readonly heavy: number,
    seed: number,
    private readonly rootOff: number = BACK_OFF,
    private readonly tipCurl: number = 0,
    private readonly restCarry: number = 0.55,
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
    /**
     * THE RAISED FLAG (house cat): 0..1 stands the rest carriage UP —
     * the root leaves the rump level, the chain rises through
     * vertical, and the tip hooks forward past it (the domestic
     * question mark). 0 keeps every shipped tail's carriage verbatim;
     * speed streams a raised tail back down toward the classic trail,
     * so a darting cat levels its flag by construction.
     */
    perk = 0,
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
    // level as the body runs — a hyena's flag only lifts for the
    // chase, a horse's hanging fall streams out behind the gallop.
    // Scaled off restCarry so every dial keeps the same speed law
    // (at the 0.55 default this is the shipped 0.55 − min(.28, …)).
    const carry = this.restCarry * (1 - Math.min(0.51, spd * 0.1));

    const lastI = n - 1;
    // THE RAISED FLAG: integrate the perked rest polyline once — each
    // segment leaves at a steeper angle than the last, so the chain
    // curls up and over by construction (never a kinked bend).
    const perkEff = Math.max(0, Math.min(1, perk)) * (1 - Math.min(1, spd / 2.8));
    let restPts: Array<{ x: number; y: number; z: number }> | null = null;
    if (perkEff > 0.01) {
      restPts = [];
      let rxA = cx;
      let ryA = cy;
      let rzA = az;
      for (let i = 1; i < n; i++) {
        const ti = i / lastI;
        const th = Math.min(Math.PI * 0.62, perkEff * (0.3 + 1.5 * ti));
        rxA -= fx * seg * Math.cos(th);
        ryA -= fy * seg * Math.cos(th);
        rzA += seg * Math.sin(th);
        restPts.push({ x: rxA, y: ryA, z: rzA });
      }
    }
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
      const rp = restPts ? restPts[i - 1]! : null;
      const drx = cx - fx * seg * i;
      const dry = cy - fy * seg * i;
      const drz = Math.max(GROUND_Z, az * (1 - carry * ti) + this.tipCurl * az * ti * ti);
      const rx = rp ? drx * (1 - perkEff) + rp.x * perkEff : drx;
      const ry = rp ? dry * (1 - perkEff) + rp.y * perkEff : dry;
      const rz = rp ? Math.max(GROUND_Z, drz * (1 - perkEff) + rp.z * perkEff) : drz;
      const tone = 30 * (1 - 0.62 * ti);
      let gx = (rx - nd.x) * tone;
      let gy = (ry - nd.y) * tone;
      // A raised tail is held by MUSCLE, not hung by gravity — the
      // settle weight yields to the perk so the flag actually stands.
      const gz = (rz - nd.z) * tone * 0.8 - 5 * this.heavy * (1 - perkEff);

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
 * THE CROC TAIL IS A LIMB, NOT A BRUSH — the basilisks' rebuilt tail
 * sim (user mandate: the tail is the character's weapon and its
 * swimming engine — huge, meaty, proportional to the body, and it
 * must never scrunch). Three laws separate it from every brush on
 * the cape contract:
 *
 * 1. THE UNBENDING ROOT: a tail that is mostly muscle around a chain
 *    of vertebrae cannot fold on itself. Every joint carries a HARD
 *    bend clamp — tight at the root (the meat), opening toward the
 *    tip (the whip) — enforced inside the constraint loop, plus a
 *    straightening spring that pulls each segment toward its
 *    parent's line. A spin wraps a brush around the torso; it sweeps
 *    this tail around in one stiff arc.
 *
 * 2. THE SCULL: the drive is a slow, heavy traveling wave — the
 *    crocodile's swimming stroke read on land as the walking sway.
 *    Amplitude grows along the chain and with speed; the frequency
 *    stays LOW (a two-meter tail beats like an oar, never like a
 *    terrier). At rest a lazy residue of the same wave keeps it
 *    alive.
 *
 * 3. THE DRAG: the rest carriage runs off the stern at hull height,
 *    sinks to the ground by two-thirds of the length, and the last
 *    third DRAGS — the furrow-cutting read of every reference croc.
 *
 * Same lifecycle contract as every sim in this file: snap-to-rest on
 * first sight/teleport, restless cue for the body-sprite cache,
 * front() facing hysteresis, seeded per-body phase.
 */

export interface CrocTailOpts {
  /** Total chain length (tiles) — the WHOLE tail, root to tip. */
  len: number;
  /** Mass feel: scales damping weight and settle gravity. */
  heavy: number;
  /**
   * Rigidity dial 0..1: scales the straightening spring AND tightens
   * the bend clamps. The elder is a stone column (0.85); the fen
   * swimmer keeps a supler chain (0.55).
   */
  stiff: number;
  /** Scull wave amplitude scale (the fen swims hardest). */
  wave: number;
}

/** The dragging third never quite plows the dirt. */
const CROC_GROUND_Z = 0.02;

export class CrocTailSim {
  readonly nodes: TailNode[] = [];
  readonly phase: number;
  private readonly segLen: number;
  private readonly segs: number;
  private lastAx = 0;
  private lastAy = 0;
  /** THE SLEWED FACING: the sim's own heading, chasing the body's at
   *  a heavy fixed rate — the whole anchor frame (root seat, rest
   *  line, scull axis) reads THIS, so an instant about-face of the
   *  body turns the tail like a ship's boom instead of teleporting
   *  its root through the chain. */
  private dirS = 0;
  private live = false;
  private isFront = false;
  private restlessUntil = 0;
  restless = false;
  tipSpd = 0;

  constructor(
    seed: number,
    private readonly rootOff: number,
    private readonly opts: CrocTailOpts,
  ) {
    // Nine segments: enough joints for one honest S-wave down the
    // chain, few enough that the bend clamps keep it a single mass.
    this.segs = 9;
    this.segLen = opts.len / this.segs;
    this.phase = (seed % 97) * 0.613;
  }

  /** The rest height of node ti (0..1) given the stern height az. */
  private restZ(az: number, ti: number): number {
    // Hull height off the stern, sinking to the drag by 2/3 length.
    const sink = Math.min(1, ti / 0.66);
    return Math.max(CROC_GROUND_Z, az * (1 - sink * sink * 0.96));
  }

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
    const h0 = Math.min(0.05, Math.max(0.001, dt));
    // The heading chases the body's at ~7 rad/s — a full about-face
    // sweeps through in under half a second, and everything the tail
    // anchors to (root, rest, scull) rides the slewed frame.
    if (!this.live) this.dirS = dir;
    let dDiff = dir - this.dirS;
    while (dDiff > Math.PI) dDiff -= Math.PI * 2;
    while (dDiff < -Math.PI) dDiff += Math.PI * 2;
    this.dirS += Math.sign(dDiff) * Math.min(Math.abs(dDiff), 7 * h0);
    const fx = Math.cos(this.dirS);
    const fy = Math.sin(this.dirS);
    const cx = ax - fx * this.rootOff * sizeK;
    const cy = ay - fy * this.rootOff * sizeK;
    const seg = this.segLen * sizeK;
    const o = this.opts;

    // First sight or teleport: lay the tail at rest behind the
    // facing — never let two meters of muscle whip across the map.
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
        const z = this.restZ(az, ti);
        this.nodes.push({ x, y, z, px: x, py: y, pz: z });
      }
      this.lastAx = ax;
      this.lastAy = ay;
      this.live = true;
    }

    const h = Math.min(0.05, Math.max(0.001, dt));
    // Heavier than any brush: a limb of this mass neither flutters
    // nor rings — it sweeps and settles.
    const ret = Math.exp(-5.4 * h);
    const hh = h * h;

    const spd = Math.min(7, Math.hypot(ax - this.lastAx, ay - this.lastAy) / h);
    this.lastAx = ax;
    this.lastAy = ay;

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

      // The rest carriage: straight astern, on the drag curve. Tone
      // is high and stays high down the chain — the whole tail is
      // muscle; only the last knuckles loosen.
      const rx = cx - fx * seg * i;
      const ry = cy - fy * seg * i;
      const rz = this.restZ(az, ti);
      const tone = 34 * (1 - 0.45 * ti);
      let gx = (rx - nd.x) * tone;
      let gy = (ry - nd.y) * tone;
      const gz = (rz - nd.z) * tone * 0.9 - 4 * o.heavy;

      // THE SCULL: one slow heavy traveling wave. The beat barely
      // quickens with speed (mass sets the cadence, not urgency);
      // what speed buys is AMPLITUDE — the walking sway opening into
      // the full swimming stroke.
      const hz = 0.85 + Math.min(0.6, spd * 0.16);
      const swim =
        Math.sin(tSec * hz * Math.PI * 2 + this.phase + ti * 3.6) *
        (0.35 + 2.2 * Math.min(1, spd / 3.2)) *
        Math.pow(ti, 1.4) *
        2.4 *
        o.wave;
      gx += -fy * swim;
      gy += fx * swim;

      nd.x += vx + gx * hh;
      nd.y += vy + gy * hh;
      nd.z += vz + gz * hh;
    }

    // The first segment is FUSED to the (slewed) hull line: the tail
    // grows out of the stern, it does not hinge there — and because
    // the frame itself slews, the fuse carries honest turn lag.
    {
      const b = this.nodes[1]!;
      b.x = cx - fx * seg;
      b.y = cy - fy * seg;
      b.z += (this.restZ(az, 1 / lastI) - b.z) * 0.5;
    }

    // Constraints: pin the root, keep lengths, and enforce THE
    // UNBENDING ROOT — the straightening spring plus the hard bend
    // clamp per joint, root-tight and tip-free.
    for (let iter = 0; iter < 4; iter++) {
      const a = this.nodes[0]!;
      a.x = cx;
      a.y = cy;
      a.z = az;
      for (let i = 1; i < n; i++) {
        const p = this.nodes[i - 1]!;
        const q = this.nodes[i]!;
        let dx = q.x - p.x;
        let dy = q.y - p.y;
        let dz = q.z - p.z;
        const d = Math.hypot(dx, dy, dz) || 1e-6;
        const err = (d - seg) / d;
        // STRICTLY FORWARD-SOLVED: the child absorbs the whole
        // correction, the parent never moves. A soft back-reaction
        // (the brush contract) re-breaks an upstream joint AFTER its
        // clamp has run — the root-to-tip sweep must be monotone, or
        // a violent about-face leaves a folded joint no later pass
        // revisits (the frame-0 scrunch the law test caught).
        q.x -= dx * err;
        q.y -= dy * err;
        q.z -= dz * err;

        if (i > 1) {
          const ti = i / lastI;
          // Parent segment's line — the direction this joint wants
          // to continue.
          const g = this.nodes[i - 2]!;
          let ux = p.x - g.x;
          let uy = p.y - g.y;
          let uz = p.z - g.z;
          const ul = Math.hypot(ux, uy, uz) || 1e-6;
          ux /= ul;
          uy /= ul;
          uz /= ul;
          dx = q.x - p.x;
          dy = q.y - p.y;
          dz = q.z - p.z;
          const dl = Math.hypot(dx, dy, dz) || 1e-6;
          // The straightening spring: blend toward the parent line,
          // strongest at the root.
          const straight = o.stiff * (0.5 - 0.34 * ti);
          const sx = p.x + ux * dl;
          const sy = p.y + uy * dl;
          const sz = p.z + uz * dl;
          q.x += (sx - q.x) * straight;
          q.y += (sy - q.y) * straight;
          q.z += (sz - q.z) * straight;
          // THE HARD CLAMP: the joint may not bend past its cone —
          // ~16° at the root opening to ~42° at the tip (scaled
          // tighter by stiff). Past the cone, the node is ROTATED
          // back onto it, not nudged: scrunch is impossible by
          // construction.
          dx = q.x - p.x;
          dy = q.y - p.y;
          dz = q.z - p.z;
          const dl2 = Math.hypot(dx, dy, dz) || 1e-6;
          const dot = (dx * ux + dy * uy + dz * uz) / dl2;
          const maxA = (0.28 + 0.45 * ti) * (1.35 - 0.55 * o.stiff);
          const cosMax = Math.cos(maxA);
          if (dot < cosMax) {
            // Component of d perpendicular to u.
            let ox = dx - ux * dot * dl2;
            let oy = dy - uy * dot * dl2;
            let oz = dz - uz * dot * dl2;
            const ol = Math.hypot(ox, oy, oz) || 1e-6;
            ox /= ol;
            oy /= ol;
            oz /= ol;
            const sinMax = Math.sin(maxA);
            q.x = p.x + (ux * cosMax + ox * sinMax) * dl2;
            q.y = p.y + (uy * cosMax + oy * sinMax) * dl2;
            q.z = p.z + (uz * cosMax + oz * sinMax) * dl2;
          }
        }

        if (q.z < CROC_GROUND_Z) q.z = CROC_GROUND_Z;
      }
    }

    const tip = this.nodes[lastI]!;
    this.tipSpd = Math.hypot(tip.x - tip.px, tip.y - tip.py, tip.z - tip.pz) / h;
    if (spd > 0.25 || this.tipSpd > 0.4) this.restlessUntil = tSec + 0.5;
    this.restless = tSec < this.restlessUntil;
  }

  /** The cape's facing-law hysteresis, verbatim. */
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

export interface HorseTailStyle {
  /** Pre-lifted hair tone (the portrait law: shade(mane, 18)). */
  hair: string;
  /** Strand ink a step darker than the fall. */
  strand: string;
  /** Width multiplier — the garron drags a shaggier fall. */
  heavy: number;
}

/**
 * Paint the projected HORSE TAIL — a full fall of hair off the croup:
 * a bound dock at the root opening into a draped sheet that swells
 * past mid-length and closes on a ragged hem, never a rope. Loose
 * strands ride the fall for texture; a quiet contour separates hair
 * from same-coat croup. The painter never learns a species (the
 * canid-lane law): dials ride the style. Plain path calls — no Path2D
 * — so node-side painter tests can walk every coordinate.
 */
export function drawHorseTail(
  ctx: CanvasRenderingContext2D,
  pts: Array<{ x: number; y: number }>,
  st: HorseTailStyle,
  wk: number,
  opts: BobtailDrawOpts,
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
    // The fall's profile: a bound dock, then the sheet lets go — width
    // grows to a late swell and only closes in the last knuckle, the
    // way loose hair carries its mass low.
    const w = (0.03 + 0.052 * Math.pow(Math.min(1, t * 1.25), 0.8) * (1 - 0.55 * Math.max(0, t - 0.78) * 4.5)) * st.heavy * wk;
    left.push({ x: pts[i]!.x + ty * w, y: pts[i]!.y - tx * w });
    right.push({ x: pts[i]!.x - ty * w, y: pts[i]!.y + tx * w });
  }

  const silhouette = (): void => {
    ctx.beginPath();
    ctx.moveTo(left[0]!.x, left[0]!.y);
    for (let i = 1; i < n; i++) ctx.lineTo(left[i]!.x, left[i]!.y);
    // The hem: a shallow ragged close past the last node — hair ends
    // on strands, not on a bullet point.
    const tipX = pts[n - 1]!.x + (pts[n - 1]!.x - pts[n - 2]!.x) * 0.4;
    const tipY = pts[n - 1]!.y + (pts[n - 1]!.y - pts[n - 2]!.y) * 0.4;
    ctx.quadraticCurveTo(tipX, tipY, right[n - 1]!.x, right[n - 1]!.y);
    for (let i = n - 2; i >= 0; i--) ctx.lineTo(right[i]!.x, right[i]!.y);
    ctx.closePath();
  };

  ctx.lineJoin = 'round';
  ctx.fillStyle = opts.hurt ? '#ffffff' : opts.back ? shade(st.hair, -10) : st.hair;
  silhouette();
  ctx.fill();
  if (opts.hurt) return;

  // Loose strands down the fall — the hair read at close-up, clipped
  // to the sheet so they never fly off the silhouette.
  ctx.save();
  silhouette();
  ctx.clip();
  ctx.strokeStyle = st.strand;
  ctx.lineWidth = Math.max(1, wk * 0.016);
  ctx.lineCap = 'round';
  for (const lane of [-0.45, 0.05, 0.5]) {
    ctx.beginPath();
    ctx.moveTo(
      pts[1]!.x + (left[1]!.x - pts[1]!.x) * lane,
      pts[1]!.y + (left[1]!.y - pts[1]!.y) * lane,
    );
    for (let i = 2; i < n; i++) {
      ctx.lineTo(
        pts[i]!.x + (left[i]!.x - pts[i]!.x) * lane,
        pts[i]!.y + (left[i]!.y - pts[i]!.y) * lane,
      );
    }
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
  ctx.restore();

  // The quiet contour that separates the fall from the croup.
  ctx.strokeStyle = shade(st.hair, -24);
  ctx.lineWidth = Math.max(1, wk * 0.014);
  silhouette();
  ctx.stroke();
}

export interface SabercatTailStyle {
  coat: string;
  /** The dark banding ink near the tip — the saber stripe read. */
  band: string;
  heavy: number;
}

/**
 * Paint the projected SABERCAT TAIL — the big cat's rope: long, slim,
 * near-constant width with a soft blunt tip, dark-banded through its
 * last third. Nothing like the fox's plume or the horse's hair fall —
 * a cat's tail is MUSCLE all the way out. Style dials only (the
 * canid-lane law). Plain path calls — no Path2D — so node-side
 * painter tests can walk every coordinate.
 */
export function drawSabercatTail(
  ctx: CanvasRenderingContext2D,
  pts: Array<{ x: number; y: number }>,
  st: SabercatTailStyle,
  wk: number,
  opts: BobtailDrawOpts,
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
    // The rope: full at the haunch root, easing only gently — the tip
    // keeps most of its girth (a cat's tail never whips to a thread).
    const w = (0.036 - 0.011 * t) * st.heavy * wk;
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
  ctx.fillStyle = opts.hurt ? '#ffffff' : shade(st.coat, opts.back ? -12 : -3);
  silhouette();
  ctx.fill();
  if (opts.hurt) return;

  // The banding: two dark rings riding their rungs plus the dipped
  // tip — the saber stripe read carried out the tail, wrapped so the
  // rings turn with every swing.
  ctx.save();
  silhouette();
  ctx.clip();
  ctx.fillStyle = st.band;
  for (const i0 of [n - 4, n - 3]) {
    const la = left[i0]!;
    const lb = left[i0 + 1]!;
    const ra = right[i0]!;
    const rb = right[i0 + 1]!;
    ctx.beginPath();
    ctx.moveTo(la.x + (lb.x - la.x) * 0.35, la.y + (lb.y - la.y) * 0.35);
    ctx.lineTo(la.x + (lb.x - la.x) * 0.7, la.y + (lb.y - la.y) * 0.7);
    ctx.lineTo(ra.x + (rb.x - ra.x) * 0.7, ra.y + (rb.y - ra.y) * 0.7);
    ctx.lineTo(ra.x + (rb.x - ra.x) * 0.35, ra.y + (rb.y - ra.y) * 0.35);
    ctx.closePath();
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(left[n - 2]!.x + (left[n - 1]!.x - left[n - 2]!.x) * 0.5, left[n - 2]!.y + (left[n - 1]!.y - left[n - 2]!.y) * 0.5);
  ctx.lineTo(left[n - 1]!.x, left[n - 1]!.y);
  const capX = pts[n - 1]!.x + (pts[n - 1]!.x - pts[n - 2]!.x) * 0.55;
  const capY = pts[n - 1]!.y + (pts[n - 1]!.y - pts[n - 2]!.y) * 0.55;
  ctx.quadraticCurveTo(capX, capY, right[n - 1]!.x, right[n - 1]!.y);
  ctx.lineTo(right[n - 2]!.x + (right[n - 1]!.x - right[n - 2]!.x) * 0.5, right[n - 2]!.y + (right[n - 1]!.y - right[n - 2]!.y) * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // The quiet contour that separates the rope from same-coat flanks.
  ctx.strokeStyle = shade(st.coat, -24);
  ctx.lineWidth = Math.max(1, wk * 0.012);
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

/** Pre-resolved house-cat tail tones — the painter never learns a species. */
export interface HousecatTailStyle {
  coat: string;
  under: string;
  /** Ring/tip/dark ink. */
  mark: string;
  /** Tail dress: ringed, dark-tipped, plain coat, or mark end to end. */
  kind: 'rings' | 'tip' | 'coat' | 'dark';
  /** The plume vs the whip — hair length is told from the tail first. */
  longhair: boolean;
}

/**
 * Paint the projected HOUSE-CAT TAIL. Two silhouettes share one
 * ribbon: the shorthair's slim whip (near-even taper, rounded tip)
 * and the longhair's plume (volume that swells past mid-length, edge
 * fluff at close zoom). The dress rides on top — rings walk the
 * outer two-thirds (the raccoon read), the tip dips, or the dark
 * point runs end to end. Plain path calls, no Path2D, so node-side
 * painter tests can walk every coordinate.
 */
export function drawHousecatTail(
  ctx: CanvasRenderingContext2D,
  pts: Array<{ x: number; y: number }>,
  st: HousecatTailStyle,
  wk: number,
  opts: { hurt?: boolean; back?: boolean },
): void {
  const n = pts.length;
  if (n < 5) return;
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
    // The whip tapers gently; the plume swells and holds (the fox
    // profile at kitten scale).
    const w = st.longhair
      ? (0.022 + 0.038 * Math.pow(Math.sin(Math.min(1, t * 1.08) * Math.PI), 0.7)) * wk
      : (0.028 - 0.01 * t) * wk;
    left.push({ x: pts[i]!.x + ty * w, y: pts[i]!.y - tx * w });
    right.push({ x: pts[i]!.x - ty * w, y: pts[i]!.y + tx * w });
  }
  const silhouette = (): void => {
    ctx.beginPath();
    ctx.moveTo(left[0]!.x, left[0]!.y);
    for (let i = 1; i < n; i++) ctx.lineTo(left[i]!.x, left[i]!.y);
    const tipX = pts[n - 1]!.x + (pts[n - 1]!.x - pts[n - 2]!.x) * (st.longhair ? 0.5 : 0.35);
    const tipY = pts[n - 1]!.y + (pts[n - 1]!.y - pts[n - 2]!.y) * (st.longhair ? 0.5 : 0.35);
    ctx.quadraticCurveTo(tipX, tipY, right[n - 1]!.x, right[n - 1]!.y);
    for (let i = n - 2; i >= 0; i--) ctx.lineTo(right[i]!.x, right[i]!.y);
    ctx.closePath();
  };
  ctx.lineJoin = 'round';
  const base = st.kind === 'dark' ? st.mark : shade(st.coat, -3);
  // The back view dims toward the coat — never a bright banner over
  // the body (the fox balloon lesson, kept).
  ctx.fillStyle = opts.hurt ? '#ffffff' : opts.back ? shade(base, -16) : base;
  silhouette();
  ctx.fill();
  if (!opts.hurt) {
    if (st.kind === 'rings') {
      // THE RINGS: banded ink walking the outer two-thirds — each band
      // spans a knuckle fraction so the dress bends with the chain.
      ctx.fillStyle = opts.back ? shade(st.mark, -10) : st.mark;
      const bandAt = (tA: number, tB: number): void => {
        const seg = (tt: number): { li: number; f: number } => {
          const x = tt * (n - 1);
          const li = Math.min(n - 2, Math.floor(x));
          return { li, f: x - li };
        };
        const lerp = (
          arr: Array<{ x: number; y: number }>,
          q: { li: number; f: number },
        ): { x: number; y: number } => ({
          x: arr[q.li]!.x + (arr[q.li + 1]!.x - arr[q.li]!.x) * q.f,
          y: arr[q.li]!.y + (arr[q.li + 1]!.y - arr[q.li]!.y) * q.f,
        });
        const a = seg(tA);
        const b = seg(tB);
        const la = lerp(left, a);
        const lb = lerp(left, b);
        const ra = lerp(right, a);
        const rb = lerp(right, b);
        ctx.beginPath();
        ctx.moveTo(la.x, la.y);
        ctx.lineTo(lb.x, lb.y);
        ctx.lineTo(rb.x, rb.y);
        ctx.lineTo(ra.x, ra.y);
        ctx.closePath();
        ctx.fill();
      };
      bandAt(0.4, 0.52);
      bandAt(0.62, 0.74);
      bandAt(0.84, 1.0);
    } else if (st.kind === 'tip') {
      ctx.fillStyle = st.mark;
      const fl = n - 2;
      ctx.beginPath();
      ctx.moveTo(left[fl]!.x, left[fl]!.y);
      ctx.lineTo(left[n - 1]!.x, left[n - 1]!.y);
      const capX = pts[n - 1]!.x + (pts[n - 1]!.x - pts[n - 2]!.x) * 0.45;
      const capY = pts[n - 1]!.y + (pts[n - 1]!.y - pts[n - 2]!.y) * 0.45;
      ctx.quadraticCurveTo(capX, capY, right[n - 1]!.x, right[n - 1]!.y);
      ctx.lineTo(right[fl]!.x, right[fl]!.y);
      ctx.closePath();
      ctx.fill();
    }
    // The plume's edge fluff: loose strands off the low edge, close
    // zoom only — the longhair read the brief asked the tail to carry.
    if (st.longhair && wk > 70) {
      let leftDown = 0;
      for (let i = 1; i < n - 1; i++) leftDown += left[i]!.y - right[i]!.y;
      const low = leftDown >= 0 ? left : right;
      ctx.strokeStyle = shade(base, -12);
      ctx.lineWidth = Math.max(1, wk * 0.016);
      ctx.lineCap = 'round';
      for (let i = 2; i <= n - 2; i += 2) {
        ctx.beginPath();
        ctx.moveTo(low[i]!.x, low[i]!.y);
        ctx.lineTo(low[i]!.x + (low[i]!.x - pts[i]!.x) * 0.5, low[i]!.y + (low[i]!.y - pts[i]!.y) * 0.5 + wk * 0.02);
        ctx.stroke();
      }
      ctx.lineCap = 'butt';
    }
    // The quiet contour separating the tail from same-coat flanks.
    ctx.strokeStyle = shade(st.coat, -26);
    ctx.lineWidth = Math.max(1, wk * 0.013);
    silhouette();
    ctx.stroke();
  }
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

/** Pre-resolved fey-banner tones — the painter never learns a species. */
export interface FeyBrushStyle {
  coat: string;
  /** The dusk mantle ink — the banner's quiet contour. */
  mantle: string;
  /** The court's cold light: the tip dip, the low seam, the shed motes. */
  light: string;
  /** Volume scale — the banners run slimmer than any wolf's brush. */
  heavy: number;
}

/**
 * Paint one projected FAE BANNER — the court hound's tail voice. The
 * wolves dip their tips in ink or frost; the hound's banners end in
 * LIGHT: a slim silk taper, a pale seam riding the low edge, the last
 * knuckle dipped in cold glimmer, and two shed motes trailing off the
 * tip — deterministic from the chain's own geometry, so the sheet, the
 * portrait, and the fight all shed the same light. Two of these run
 * per hound (the TWIN BANNERS, the silhouette signature no other body
 * owns); each rides its own sim, so no pair ever streams in sync.
 * Plain path calls — no Path2D — so node-side painter tests can walk
 * every coordinate.
 */
export function drawFeyBrush(
  ctx: CanvasRenderingContext2D,
  pts: Array<{ x: number; y: number }>,
  st: FeyBrushStyle,
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
    // The fey profile: a silk flag — slimmer root than any wolf, the
    // bulge pushed late, and a long honest point.
    const w =
      (0.02 + 0.05 * Math.pow(Math.sin(Math.min(1, t * 1.05) * Math.PI), 0.85) + 0.008 * (1 - t)) *
      st.heavy *
      wk;
    left.push({ x: pts[i]!.x + ty * w, y: pts[i]!.y - tx * w });
    right.push({ x: pts[i]!.x - ty * w, y: pts[i]!.y + tx * w });
  }

  const silhouette = (): void => {
    ctx.beginPath();
    ctx.moveTo(left[0]!.x, left[0]!.y);
    for (let i = 1; i < n; i++) ctx.lineTo(left[i]!.x, left[i]!.y);
    const tipX = pts[n - 1]!.x + (pts[n - 1]!.x - pts[n - 2]!.x) * 0.55;
    const tipY = pts[n - 1]!.y + (pts[n - 1]!.y - pts[n - 2]!.y) * 0.55;
    ctx.quadraticCurveTo(tipX, tipY, right[n - 1]!.x, right[n - 1]!.y);
    for (let i = n - 2; i >= 0; i--) ctx.lineTo(right[i]!.x, right[i]!.y);
    ctx.closePath();
  };

  ctx.lineJoin = 'round';
  // The back view dims toward the mantle — the fox's balloon lesson,
  // spoken in dusk.
  ctx.fillStyle = opts.hurt ? '#ffffff' : opts.back ? shade(st.mantle, -6) : shade(st.coat, -3);
  silhouette();
  ctx.fill();
  if (opts.hurt) {
    // The hurt flash keeps the shed motes — the twin-banner signature
    // must survive the silhouette read.
    feyMotes(ctx, pts, wk, '#ffffff');
    return;
  }

  ctx.save();
  silhouette();
  ctx.clip();
  // THE TIP DIP IN LIGHT: the last knuckle and a half in the court's
  // own cold glimmer — the inversion of every wolf in the wood, and
  // the read that survives any zoom.
  ctx.fillStyle = st.light;
  ctx.beginPath();
  const fl = n - 2;
  ctx.moveTo(left[fl]!.x + (left[fl - 1]!.x - left[fl]!.x) * 0.3, left[fl]!.y + (left[fl - 1]!.y - left[fl]!.y) * 0.3);
  for (let i = fl; i < n; i++) ctx.lineTo(left[i]!.x, left[i]!.y);
  const capX = pts[n - 1]!.x + (pts[n - 1]!.x - pts[n - 2]!.x) * 0.6;
  const capY = pts[n - 1]!.y + (pts[n - 1]!.y - pts[n - 2]!.y) * 0.6;
  ctx.quadraticCurveTo(capX, capY, right[n - 1]!.x, right[n - 1]!.y);
  for (let i = n - 2; i >= fl; i--) ctx.lineTo(right[i]!.x, right[i]!.y);
  ctx.lineTo(right[fl]!.x + (right[fl - 1]!.x - right[fl]!.x) * 0.3, right[fl]!.y + (right[fl - 1]!.y - right[fl]!.y) * 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // The pale seam along the DOWN-SCREEN edge — moonlight catching the
  // silk's low side.
  let leftDown = 0;
  for (let i = 1; i < n - 1; i++) leftDown += left[i]!.y - right[i]!.y;
  const low = leftDown >= 0 ? left : right;
  ctx.strokeStyle = shade(st.light, -18);
  ctx.lineWidth = Math.max(1, wk * 0.013);
  ctx.beginPath();
  ctx.moveTo(low[1]!.x, low[1]!.y);
  for (let i = 2; i <= n - 2; i++) ctx.lineTo(low[i]!.x, low[i]!.y);
  ctx.stroke();

  // The quiet contour in mantle ink.
  ctx.strokeStyle = shade(st.mantle, -10);
  ctx.lineWidth = Math.max(1, wk * 0.013);
  silhouette();
  ctx.stroke();

  // THE SHED MOTES: two cold sparks trailing off the tip along the
  // banner's own last direction — geometry-deterministic, so every
  // caller sheds the same light.
  feyMotes(ctx, pts, wk, st.light);
}

/** The banner's shed light: two diamonds past the tip, tapering. */
function feyMotes(
  ctx: CanvasRenderingContext2D,
  pts: Array<{ x: number; y: number }>,
  wk: number,
  color: string,
): void {
  const n = pts.length;
  const dx = pts[n - 1]!.x - pts[n - 2]!.x;
  const dy = pts[n - 1]!.y - pts[n - 2]!.y;
  ctx.fillStyle = color;
  for (const [f, r] of [
    [0.55, 0.022],
    [1.05, 0.014],
  ] as const) {
    const mx = pts[n - 1]!.x + dx * f;
    const my = pts[n - 1]!.y + dy * f;
    const rr = wk * r;
    ctx.beginPath();
    ctx.moveTo(mx, my - rr);
    ctx.lineTo(mx + rr * 0.7, my);
    ctx.lineTo(mx, my + rr);
    ctx.lineTo(mx - rr * 0.7, my);
    ctx.closePath();
    ctx.fill();
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
