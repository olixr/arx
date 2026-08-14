/**
 * THE EAR IS A SIMULATION — the tail contract at head height.
 *
 * Big ears stopped being rigged geometry and became elastic bodies: a
 * short verlet chain per ear, anchored to the SKULL'S OWN AZIMUTH and
 * projected through the game's fixed bird's-eye camera. The rest pose
 * is not authored per facing band — it is the projection of one 3D
 * carriage (root orbiting the skull, membrane swept out-and-up, tips
 * raking back), so every one of the eight bands, the in-betweens, the
 * foreshortening, and the near/far draw order fall out of the same
 * arithmetic BY CONSTRUCTION. No band ever gets its own blend to rot.
 *
 * The physics adds what rigging never could: the ears LAG the turn and
 * swing home, stream on a sprint, flap with the gait bob, overshoot on
 * a hard stop, and settle — secondary motion with real inertia. But an
 * ear is cartilage and muscle, not cloth: tone is high, damping heavy,
 * and every node lives inside a hard deviation cap around its rest
 * seat, so an ear BENDS and never folds over the face (THE STRENGTH
 * LAW). A settled sim is bit-identical to the stateless rest chain —
 * THE ONE REST — so audit sheets and static previews paint the exact
 * silhouette the live game relaxes to.
 *
 * The module is species-agnostic on purpose: chains are shaped by an
 * EarCarriage (azimuth, orbit, length, spread, rise, curl) and painted
 * through an EarStyle of pre-resolved colors, so any big-eared body —
 * goblin wings today, kobold dishes tomorrow — can join the system
 * without this file learning a species name.
 */

/** The camera's fixed bird's-eye squash — depth rides at 0.6 height. */
const YK = 0.6;

/** Verlet nodes per chain (3 segments — root, blade, tip). */
const N = 4;

export interface EarCarriage {
  /** Root azimuth off the facing (radians) — how far around the skull
   *  the ear roots. ~2.0 puts it wide at the temples face-on and walks
   *  it to the occiput at profile, where a turned head keeps it. */
  azimuth: number;
  /** Skull orbit radius the root rides (tiles). */
  rootR: number;
  /** How high on the skull the root sits (tiles above head center). */
  rootLift: number;
  /** Full spine length (tiles). */
  length: number;
  /** Outward (radial) component of the rest direction. */
  spread: number;
  /** Upward component of the rest direction — the standing rake. */
  rise: number;
  /** Per-segment extra rake (radians): the tip's back-hook. */
  curl: readonly [number, number, number];
}

/** Per-frame drive shared by the sim and the stateless fallback. */
export interface EarBeat {
  dir: number;
  /** 0..1 pin-back — the jeer sweeps the ears around toward the rear. */
  pin: number;
  /** The listening sway (radians) — the caller's clock, per side. */
  sway: number;
}

export interface EarChain {
  /** Spine offsets from the head anchor, in tiles (screen plane). */
  pts: Array<{ x: number; y: number }>;
  /** Camera-side term: >0 the ear roots on the viewer's side of the
   *  skull (paint over the head), <0 it roots behind (paint under). */
  depth: number;
}

/**
 * THE ONE REST — the projected rest chain both the sim's muscle pulls
 * toward and the stateless fallback paints outright. All eight facing
 * bands come out of this one projection; nothing here is per-band.
 */
export function earRestChain(side: number, c: EarCarriage, beat: EarBeat): EarChain {
  // The root azimuth walks with the facing; the pin-back and the sway
  // ROTATE AROUND THE SKULL (a real ear pins toward the occiput — it
  // does not hinge over the face).
  const az = beat.dir + side * (c.azimuth + beat.pin * 0.5 + beat.sway);
  const rx = Math.cos(az);
  const ry = Math.sin(az);
  const pts: Array<{ x: number; y: number }> = [
    { x: rx * c.rootR, y: ry * c.rootR * YK - c.rootLift },
  ];
  // One 3D carriage, projected: out along the skull radial, up the
  // standing rake. The projection's magnitude carries the true
  // foreshortening; the flat-vector style COMPRESSES it (pm^0.3) —
  // direction stays honest at every band, but the silhouette-bearing
  // blade never collapses just because it swung toward the camera
  // (SILHOUETTE HIERARCHY: the ear stays the tallest thing in
  // profile, read-at-scale over optical truth).
  const iv = 1 / Math.hypot(c.spread, c.rise);
  const d3x = rx * c.spread * iv;
  const d3y = ry * c.spread * iv;
  const d3z = c.rise * iv;
  const pjx = d3x;
  const pjy = d3y * YK - d3z;
  const pm = Math.hypot(pjx, pjy) || 1e-6;
  const eff = (c.length * Math.pow(pm, 0.3)) / pm / (N - 1);
  let sx = pjx * eff;
  let sy = pjy * eff;
  // The curl rakes successive segments outward and back — the wing's
  // hook. Its direction follows the blade's own screen lean and FADES
  // through vertical (a signed flip there would kink the rest chain
  // mid-turn — a discontinuity no clamp or spring should ever see).
  const w = Math.max(-1, Math.min(1, pjx / (0.25 * pm)));
  for (let i = 1; i < N; i++) {
    const a = c.curl[i - 1]! * w;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const nx = sx * ca - sy * sa;
    const ny = sx * sa + sy * ca;
    sx = nx;
    sy = ny;
    pts.push({ x: pts[i - 1]!.x + sx, y: pts[i - 1]!.y + sy });
  }
  return { pts, depth: ry };
}

interface ENode {
  x: number;
  y: number;
  px: number;
  py: number;
}

/**
 * The elastic pair. Simulated in ANCHOR-LOCAL tile space: the chains
 * ride wherever the painter seats the skull (never a re-anchoring
 * seam), the anchor's own screen travel arrives as an inertial shove
 * (zoom-independent — pixels normalize through the scale), and the
 * camera never enters the math.
 */
export class EarSim {
  private readonly chains: [ENode[], ENode[]] = [[], []];
  private lastMs = 0;
  private lastAx = 0;
  private lastAy = 0;
  private live = false;
  private restlessUntil = 0;
  /** True while the ears genuinely move — the renderer's full-rate
   *  re-bake cue, exactly the tail's contract. */
  restless = false;
  /** Per-body phase — a warband never flicks in sync. */
  readonly phase: number;

  constructor(seed: number) {
    this.phase = (seed % 93) * 0.641;
  }

  /**
   * Advance both ears one frame. (axPx, ayPx) is the head anchor in
   * screen pixels (bob and lunge included), sPx the pixels-per-tile
   * scale, `pin` the 0..1 jeer pin-back.
   */
  update(
    axPx: number,
    ayPx: number,
    sPx: number,
    c: EarCarriage,
    dir: number,
    pin: number,
    nowMs: number,
  ): void {
    const rawDt = (nowMs - this.lastMs) / 1000;
    this.lastMs = nowMs;
    const h = Math.min(0.05, Math.max(0.001, rawDt));
    // Anchor travel in tiles — the inertial shove. First sight, a
    // teleport, or a long gap lays the ears at rest instead of letting
    // them whip across the head to catch up.
    let ddx = (axPx - this.lastAx) / sPx;
    let ddy = (ayPx - this.lastAy) / sPx;
    this.lastAx = axPx;
    this.lastAy = ayPx;
    const snap = !this.live || rawDt > 0.25 || rawDt < 0 || Math.hypot(ddx, ddy) > 2;
    if (snap) {
      ddx = 0;
      ddy = 0;
    }
    const tSec = nowMs / 1000;
    // MEMBRANE OVER CARTILAGE: damping between the cape's flutter and
    // the tail's muscle — an ear bounces once and comes home.
    const ret = Math.exp(-5.2 * h);
    const hh = h * h;

    for (const side of [-1, 1] as const) {
      const sway = 0.05 * Math.sin(nowMs / 640 + this.phase + side * 1.7);
      const rest = earRestChain(side, c, { dir, pin, sway });
      const ch = this.chains[side < 0 ? 0 : 1]!;
      if (snap || ch.length !== N) {
        ch.length = 0;
        for (const p of rest.pts) ch.push({ x: p.x, y: p.y, px: p.x, py: p.y });
      }
      // The root is pinned to the skull — cartilage, not a hinge.
      const r0 = rest.pts[0]!;
      ch[0]!.x = r0.x;
      ch[0]!.y = r0.y;
      ch[0]!.px = r0.x;
      ch[0]!.py = r0.y;
      for (let i = 1; i < N; i++) {
        const nd = ch[i]!;
        const ti = i / (N - 1);
        // The inertial shove: the head moved, the blade lags. Verlet
        // takes it as a previous-position shift, tip freest.
        const inertia = 0.85 * ti;
        const vx = (nd.x - (nd.px + ddx * inertia)) * ret;
        const vy = (nd.y - (nd.py + ddy * inertia)) * ret;
        nd.px = nd.x;
        nd.py = nd.y;
        // HIGH TONE: an ear is muscle-rooted cartilage — it snaps back
        // harder than any tail, softest only at the very tip.
        const tone = 60 * (1 - 0.55 * ti);
        const rp = rest.pts[i]!;
        nd.x += vx + (rp.x - nd.x) * tone * hh;
        nd.y += vy + (rp.y - nd.y) * tone * hh;
      }
      // Constraints: segment lengths match the REST chain's own (the
      // projection already carries the foreshortening), parent stiffer
      // than child; then THE STRENGTH LAW — every node stays inside a
      // hard cap around its rest seat, so the ear bends organically
      // and can never fold over the face or spear out forward.
      for (let iter = 0; iter < 2; iter++) {
        for (let i = 1; i < N; i++) {
          const p = ch[i - 1]!;
          const q = ch[i]!;
          const ra = rest.pts[i - 1]!;
          const rb = rest.pts[i]!;
          const seg = Math.hypot(rb.x - ra.x, rb.y - ra.y);
          const dx = q.x - p.x;
          const dy = q.y - p.y;
          const d = Math.hypot(dx, dy) || 1e-6;
          const err = (d - seg) / d;
          const wq = i === 1 ? 1 : 0.68;
          q.x -= dx * err * wq;
          q.y -= dy * err * wq;
          if (i > 1) {
            p.x += dx * err * (1 - wq);
            p.y += dy * err * (1 - wq);
          }
        }
      }
      // THE STRENGTH LAW, enforced LAST so no reciprocal push can
      // undo it: every node holds inside a hard cap around its rest
      // seat — the blade bends organically and can never fold over
      // the face or spear out forward.
      for (let i = 1; i < N; i++) {
        const q = ch[i]!;
        const ra = rest.pts[i - 1]!;
        const rb = rest.pts[i]!;
        const seg = Math.hypot(rb.x - ra.x, rb.y - ra.y);
        const devMax = seg * (0.3 + 0.35 * i);
        const ex = q.x - rb.x;
        const ey = q.y - rb.y;
        const ed = Math.hypot(ex, ey);
        if (ed > devMax) {
          const kk = devMax / ed;
          q.x = rb.x + ex * kk;
          q.y = rb.y + ey * kk;
        }
      }
    }

    // The settle detector — tip speed across both ears.
    let tipSpd = 0;
    for (const ch of this.chains) {
      const t = ch[N - 1];
      if (t) tipSpd = Math.max(tipSpd, Math.hypot(t.x - t.px, t.y - t.py) / h);
    }
    if (Math.hypot(ddx, ddy) / h > 0.25 || tipSpd > 0.4 || pin > 0.02) {
      this.restlessUntil = tSec + 0.5;
    }
    this.restless = tSec < this.restlessUntil;
    this.live = true;
  }

  /** The simulated chain for one side, with the frame's depth term. */
  chain(side: number, c: EarCarriage, dir: number, pin: number): EarChain {
    const ch = this.chains[side < 0 ? 0 : 1]!;
    const depth = Math.sin(dir + side * (c.azimuth + pin * 0.5));
    if (ch.length !== N) {
      // Never ticked (first paint): hand back the rest chain.
      return earRestChain(side, c, { dir, pin, sway: 0 });
    }
    return { pts: ch.map((nd) => ({ x: nd.x, y: nd.y })), depth };
  }
}

/** Pre-resolved colors — the painter never learns a species. */
export interface EarStyle {
  skin: string;
  outline: string;
  membrane: string;
  rib: string;
  seam: string;
}

export interface EarDrawOpts {
  hurt: boolean;
  /** True when the head faces away: backs show (seam, no membrane). */
  back: boolean;
  /** Scarred trailing edge — the healed bite out of the blade. */
  notch: boolean;
  /** Screen position of the head center — picks the outward edge. */
  headX: number;
  headY: number;
}

/**
 * Paint one projected ear: a tapered wing ribbon through the chain —
 * convex leading edge bowed out, concave trailing edge, pointed tip —
 * with the pale membrane and two fanned ribs on the forward face, a
 * single cartilage seam on the back, and the optional healed notch.
 * Plain path calls so painter tests can walk every coordinate.
 */
export function drawWingEar(
  ctx: CanvasRenderingContext2D,
  pts: Array<{ x: number; y: number }>,
  w0: number,
  st: EarStyle,
  opts: EarDrawOpts,
): void {
  const n = pts.length;
  if (n < 3) return;
  // Perpendiculars along the spine; the width profile keeps the blade
  // a wing — full at the root, swelling slightly, running to a point.
  const wProf = [1, 1.18, 0.62, 0];
  const ea: Array<{ x: number; y: number }> = [];
  const eb: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)]!;
    const b = pts[Math.min(n - 1, i + 1)]!;
    let tx = b.x - a.x;
    let ty = b.y - a.y;
    const tl = Math.hypot(tx, ty) || 1;
    tx /= tl;
    ty /= tl;
    const w = w0 * (wProf[i] ?? 0);
    ea.push({ x: pts[i]!.x + ty * w, y: pts[i]!.y - tx * w });
    eb.push({ x: pts[i]!.x - ty * w, y: pts[i]!.y + tx * w });
  }
  // The leading (convex) edge is the one facing AWAY from the skull.
  const mid = pts[1]!;
  const da = Math.hypot(ea[1]!.x - opts.headX, ea[1]!.y - opts.headY);
  const db = Math.hypot(eb[1]!.x - opts.headX, eb[1]!.y - opts.headY);
  const lead = da >= db ? ea : eb;
  const trail = da >= db ? eb : ea;

  const silhouette = (): void => {
    ctx.beginPath();
    ctx.moveTo(trail[0]!.x, trail[0]!.y);
    ctx.lineTo(lead[0]!.x, lead[0]!.y);
    // Leading edge bows OUT through the blade.
    ctx.quadraticCurveTo(lead[1]!.x, lead[1]!.y, lead[2]!.x, lead[2]!.y);
    ctx.quadraticCurveTo(lead[3]!.x, lead[3]!.y, pts[3]!.x, pts[3]!.y);
    // Trailing edge runs home concave — the membrane's sag pulls each
    // control toward the spine — with the warboss's healed notch
    // bitten out of the blade on the way down.
    if (opts.notch) {
      const nx = trail[2]!.x * 0.65 + pts[3]!.x * 0.35;
      const ny = trail[2]!.y * 0.65 + pts[3]!.y * 0.35;
      ctx.lineTo(nx, ny);
      ctx.lineTo(nx * 0.7 + pts[2]!.x * 0.3, ny * 0.7 + pts[2]!.y * 0.3);
    }
    ctx.quadraticCurveTo(
      trail[2]!.x * 0.6 + pts[2]!.x * 0.4,
      trail[2]!.y * 0.6 + pts[2]!.y * 0.4,
      trail[1]!.x,
      trail[1]!.y,
    );
    ctx.quadraticCurveTo(
      trail[1]!.x * 0.5 + pts[1]!.x * 0.5,
      trail[1]!.y * 0.5 + pts[1]!.y * 0.5,
      trail[0]!.x,
      trail[0]!.y,
    );
    ctx.closePath();
  };

  ctx.lineJoin = 'round';
  ctx.fillStyle = opts.hurt ? '#ffffff' : st.skin;
  silhouette();
  ctx.fill();
  if (opts.hurt) return;
  ctx.strokeStyle = st.outline;
  ctx.lineWidth = Math.max(1, w0 * 0.22);
  silhouette();
  ctx.stroke();

  if (!opts.back) {
    // The lit membrane: pale skin stretched inside the blade, two
    // fanned rib strokes keeping it a wing, never a paddle.
    ctx.save();
    silhouette();
    ctx.clip();
    ctx.fillStyle = st.membrane;
    ctx.beginPath();
    ctx.moveTo(pts[0]!.x * 0.7 + mid.x * 0.3, pts[0]!.y * 0.7 + mid.y * 0.3);
    ctx.quadraticCurveTo(lead[1]!.x, lead[1]!.y, pts[2]!.x, pts[2]!.y);
    ctx.quadraticCurveTo(
      trail[1]!.x * 0.5 + pts[1]!.x * 0.5,
      trail[1]!.y * 0.5 + pts[1]!.y * 0.5,
      pts[0]!.x * 0.7 + mid.x * 0.3,
      pts[0]!.y * 0.7 + mid.y * 0.3,
    );
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = st.rib;
    ctx.lineWidth = Math.max(1, w0 * 0.12);
    for (const k of [0.55, 0.85] as const) {
      ctx.beginPath();
      ctx.moveTo(pts[0]!.x, pts[0]!.y);
      const rx = pts[1]!.x + (pts[2]!.x - pts[1]!.x) * k;
      const ry = pts[1]!.y + (pts[2]!.y - pts[1]!.y) * k;
      ctx.quadraticCurveTo(lead[1]!.x * 0.4 + pts[1]!.x * 0.6, lead[1]!.y * 0.4 + pts[1]!.y * 0.6, rx, ry);
      ctx.stroke();
    }
    ctx.restore();
  } else {
    // Ear back: one cartilage seam keeps it a volume.
    ctx.strokeStyle = st.seam;
    ctx.lineWidth = Math.max(1, w0 * 0.14);
    ctx.beginPath();
    ctx.moveTo(pts[0]!.x, pts[0]!.y);
    ctx.quadraticCurveTo(lead[1]!.x * 0.5 + pts[1]!.x * 0.5, lead[1]!.y * 0.5 + pts[1]!.y * 0.5, pts[2]!.x, pts[2]!.y);
    ctx.stroke();
  }
}
