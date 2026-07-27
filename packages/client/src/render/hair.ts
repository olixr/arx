import { chamferRect } from './shapes.js';
import { shade } from './rig.js';

/**
 * THE HAIR RIDES THE SKULL RING — the hair foundation.
 *
 * The old hair was a pile of screen-space slabs behind hard band gates
 * (`backK > 0.55`, `profileK > 0.4`): every turn crossed a threshold
 * where a mop, tail, or curtain SNAPPED into a new position. The face
 * and the ears never had that problem, because they live on continuous
 * projection laws (featX/featK, the azimuth law). This module brings
 * hair onto the same footing: every part of the hairdo lives at a fixed
 * AZIMUTH on the scalp ring, and every facing question is answered by
 * projecting that azimuth — never by choosing a band.
 *
 * THE ONE PIECE OF ALGEBRA. Write the facing as φ = atan2(fy, fx) and
 * measure each scalp azimuth against it, θ = a − φ. Then the whole
 * projection collapses to a single pair:
 *
 *   screen x   u(θ) =  cos θ      (−1 … 1 across the skull silhouette)
 *   depth      d(θ) = −sin θ      (> 0 = camera side, < 0 = behind)
 *
 * Three facts fall straight out of that, and they are the reason this
 * module has no facing bands anywhere in it:
 *
 *   1. The camera-facing half is exactly θ ∈ (−π, 0), and across it u
 *      sweeps −1 → 1 MONOTONICALLY. So a hair mass can be drawn as one
 *      polygon sampled in θ — the samples are already sorted in screen
 *      x, at every facing, with no seams and nothing to sort.
 *   2. |d| is the tangential foreshortening at that azimuth, so a lock
 *      rounding the silhouette compresses on its own.
 *   3. Inverting u gives the hairline solve: the scalp azimuth visible
 *      at screen column x is a = φ − acos(x). The hem is SAMPLED, not
 *      chosen — facing the camera the columns sweep ear→brow→ear (the
 *      fringe), at profile nose→nape (the classic diagonal hairline),
 *      from behind ear→occiput→ear (the full mop). One authored curve,
 *      every facing, zero snapping.
 *
 * Height is yaw-invariant here: vertical positions are authored in
 * head-local y and never move with the facing (sliding them with fy is
 * what made the old head read as a top-down dial).
 *
 * THE MANTLE. Hanging hair is ONE sampled polygon per pass, not a row
 * of discrete locks — v1 shipped discrete locks and they read as a
 * picket fence of slivers at every profile facing, because each lock
 * narrowed independently and the gaps between them opened up. The
 * mantle spans the whole fall band as a continuous body: its top edge
 * is the hairline curve, its bottom edge the fall curve, and the fall
 * curve's own ripple cuts the strand tips into the hem. Locks survive
 * only as SEAMS painted on that body.
 *
 * TWO PASSES. drawHairBack paints the far half (θ ∈ (0, π)) before the
 * torso, so hair down the back is occluded by the shoulders exactly as
 * it should be; drawHairFront paints the near half after the ears
 * (curtains overlay ear roots — the ear law holds) and before the face.
 *
 * Styles are DATA (HairstyleDef): a hairline curve, a fall curve, a
 * parting notch, seams, and hem chips — all azimuth-anchored. New
 * styles are authored, not re-coded.
 *
 * Lighting keeps the DEPTH-PASS one-sun law: screen-fixed x=0 form
 * split (trailing half −12), hem under-shade, lit crown band, chips
 * riding OVER the kit as nearer strands; the far pass sits a step
 * darker (nape shadow). Hurt flash paints flat, like the body.
 */

export interface HairFrame {
  /** Head block center + measurements, straight from drawHumanoid. */
  headX: number;
  headY: number;
  hw: number;
  hh: number;
  cut: number;
  /** Facing: fx = cos(dir), fy = sin(dir); fy > 0 faces the camera. */
  fx: number;
  fy: number;
  /** Resolved hair color (look palette / NPC tint). */
  col: string;
  /** Hurt flash — paint flat, no form facets. */
  hurt: boolean;
}

/** THE COVERAGE LAW tiers, resolved by rig.ts from the worn helm. */
export type HairCover = 'free' | 'brim' | 'sealed' | 'cloth';

/** A near-strand chip riding the hem — paints over the depth kit. */
interface HemChip {
  /** Scalp azimuth (radians off the nose; ±π = the occiput). */
  a: number;
  w: number;
  drop: number;
}

interface HairstyleDef {
  /** Head-local hem height (× hh, − is up) at scalp azimuth a. */
  hairline: (a: number) => number;
  /**
   * Fall length below the hairline (× hh) at azimuth a — 0 across the
   * face, rising through the temples into the full nape mass. Its own
   * ripple cuts the strand tips, so the hem is never a flat bar.
   */
  fall: (a: number) => number;
  /**
   * The parting notch: a bite of forehead at a fixed azimuth. It
   * slides across the brow with the turn and rounds the corner like
   * any other feature. Depth is capped by the notch-HIGH law: the
   * hem never dips low enough to crowd the eye line.
   */
  notch?: { a: number; half: number; raise: number };
  /** Strand seams down the mantle, at their own skull bearings. */
  seams: readonly { a: number; w: number }[];
  /** Near-strand chips riding the cap hem. */
  chips: readonly HemChip[];
  /** Dark parting notches rising off the cap hem into the crown. */
  strands: readonly { a: number; w: number; rise: number }[];
}

/** Fold an azimuth into (−π, π] — a = φ − ψ can leave the range. */
const wrapAz = (a: number): number => {
  let v = a;
  while (v > Math.PI) v -= Math.PI * 2;
  while (v <= -Math.PI) v += Math.PI * 2;
  return v;
};

/** Piecewise-linear curve over |a| — the authored knots. */
const curve =
  (knots: readonly (readonly [number, number])[]) =>
  (a: number): number => {
    const t = Math.abs(wrapAz(a));
    let lo = knots[0]!;
    for (const k of knots) {
      if (k[0] <= t) {
        lo = k;
        continue;
      }
      const f = (t - lo[0]) / (k[0] - lo[0]);
      return lo[1] + (k[1] - lo[1]) * f;
    }
    return lo[1];
  };

/**
 * Style 0 — THE WAYFARER: the game's default head of hair. A layered,
 * collar-length cut — straight brow fringe with one parting notch,
 * temple wisps framing the face, and a nape mass falling to the
 * collarbone. It reads as the same haircut from every one of the 360
 * degrees, which is the entire point of it.
 */
// THE EAR-LINE LAW: hanging hair begins at the temple, ~80° off the
// nose — never earlier. The fall band is projected onto the CHEEK at
// three-quarter facings (that is honest geometry: near-side hair does
// overlap the face), so a band that opens at 70° swallows half the
// face at 45°. Start it at the ear and the face stays clear at every
// facing while the mass still frames it.
// THE LEVEL-HEM LAW: past the ear the fall lengths stay nearly EQUAL
// around the ring. Hair is cut to one length, so its hem hangs level;
// a fall that keeps growing toward the occiput makes the mass shear
// into a long diagonal wedge that tapers to a point in mid-air past
// the shoulder at every profile facing (it did). The small remaining
// rise is the extra distance around the back of a real skull.
const WAYFARER_FALL = curve([
  [0, 0], // across the face there is no fall — the fringe IS the hem
  [1.16, 0.14], // the sideburn: a short lock, never zero — a fall that
  [1.36, 0.34], // hits exactly 0 tapers the mass to a needle point on
  [1.54, 0.68], // the cheek at every three-quarter facing
  [1.82, 1.0], // clearing the ear: the mass is at full length
  [2.3, 1.12],
  [Math.PI, 1.16], // the occiput, barely longer than the flanks
]);

const WAYFARER: HairstyleDef = {
  hairline: curve([
    [0, -0.44], // the brow window: a straight, confident fringe
    [0.66, -0.44],
    [1.05, -0.18], // lifting over the temple
    [1.62, 0.14], // clearing the ear root (the ear paints under this)
    [2.3, 0.44], // the behind-ear drop
    [Math.PI, 0.66], // the nape
  ]),
  // The ripple cuts strand tips into the hem — a fall of hair ends in
  // uneven points, never on a ruler line. Six lobes around the ring.
  fall: (a) => {
    const base = WAYFARER_FALL(a);
    if (base <= 0.02) return base;
    return base + 0.055 * Math.cos(a * 4.5) + 0.028 * Math.cos(a * 9 + 1.1);
  },
  notch: { a: 0.42, half: 0.26, raise: 0.19 },
  seams: [
    { a: -1.72, w: 0.055 },
    { a: 1.86, w: 0.06 },
    { a: -2.24, w: 0.07 },
    { a: 2.4, w: 0.065 },
    { a: -2.86, w: 0.06 },
    { a: 2.98, w: 0.055 },
  ],
  chips: [
    { a: -0.18, w: 0.56, drop: 0.26 },
    { a: 0.74, w: 0.44, drop: 0.22 },
  ],
  strands: [
    { a: -0.62, w: 0.09, rise: 0.3 },
    { a: 0.3, w: 0.1, rise: 0.34 },
    { a: -1.55, w: 0.1, rise: 0.42 },
    { a: 1.78, w: 0.11, rise: 0.5 },
    { a: -2.45, w: 0.11, rise: 0.46 },
    { a: 2.9, w: 0.1, rise: 0.55 },
  ],
};

/**
 * The style table. Index 1 is Bald (both passes no-op); everything
 * else indexes here. Future styles append — the INDEX STABILITY LAW
 * of look.ts reaches into this table.
 */
const STYLES: readonly (HairstyleDef | null)[] = [WAYFARER, null];

/** Overhang law: every cap clears the skull silhouette, never insets it. */
const CAP_R = 1.04;
/** The mantle hangs a hair's breadth wider than the cap. */
const MANTLE_R = 1.07;
/**
 * Mantle sampling. THE NYQUIST LAW: this must comfortably out-sample
 * the hem ripple's highest frequency, or the strand tips alias into a
 * stair-step of little rectangles (they did at 34 steps against a
 * 9-per-radian ripple) — sampling artifacts read as broken art, not
 * as hair. Same reason the cap hem samples at CAP_STEPS.
 */
const MANTLE_STEPS = 72;
/** Hairline solve resolution — the acos crowds azimuths near the edges. */
const CAP_STEPS = 48;
/** A sealed helm's box: nape geometry must start below this to exist. */
const SEALED_FLOOR = 0.86;
/**
 * THE GATHER LAW: the mass narrows as it falls. Hair hangs off a head
 * and converges toward the neck — a mantle that keeps full skull width
 * all the way down reads as a cape or a hood, not as hair (it did).
 */
const GATHER = 0.84;

const clamp = (v: number, lo: number, hi: number): number =>
  v < lo ? lo : v > hi ? hi : v;

/** Signed shortest distance between two azimuths. */
const azDelta = (a: number, b: number): number => {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
};

/** Hem height at azimuth a, with the parting notch folded in. */
const hemAt = (st: HairstyleDef, a: number): number => {
  let y = st.hairline(a);
  if (st.notch) {
    const k = 1 - Math.min(1, Math.abs(azDelta(a, st.notch.a)) / st.notch.half);
    if (k > 0) {
      // Notch-HIGH law: the bite never drops the hem below −0.24·hh.
      y = Math.min(y - st.notch.raise * k, -0.24);
    }
  }
  return y;
};

/**
 * THE MANTLE: the hanging mass of one pass, as a single continuous
 * polygon sampled in θ. Front pass sweeps θ −π → 0 (screen left to
 * right); back pass sweeps π → 0, which is the same screen sweep for
 * the far half. Returns false when the pass has no hanging hair at
 * all (a cropped style, or every sample sitting above a helm floor).
 */
function mantlePath(
  ctx: CanvasRenderingContext2D,
  f: HairFrame,
  st: HairstyleDef,
  phi: number,
  back: boolean,
  floor: number | null,
): boolean {
  const { headX, headY, hw, hh } = f;
  const top: [number, number][] = [];
  const bot: [number, number][] = [];
  for (let i = 0; i <= MANTLE_STEPS; i++) {
    const t = i / MANTLE_STEPS;
    // ψ runs over this pass's half of the ring, ordered so that
    // u = cos ψ walks screen-left to screen-right either way. The
    // camera side is d = sin ψ > 0, so the FRONT pass is ψ ∈ (0, π)
    // and the far pass is ψ ∈ (−π, 0) — and the azimuth is recovered
    // by a = φ − ψ, never φ + ψ (getting that sign backwards swaps
    // the two passes wholesale: the far mass paints over the face and
    // the near mass hides behind the shoulders).
    const psi = back ? -Math.PI + t * Math.PI : Math.PI - t * Math.PI;
    const a = phi - psi;
    const th = psi;
    const fall = st.fall(a);
    if (fall <= 0.02) continue;
    const x = headX + Math.cos(th) * hw * MANTLE_R;
    // THE GATHER LAW: the bottom edge draws in toward the head's axis.
    const xb = headX + (x - headX) * GATHER;
    let y0 = headY + hemAt(st, a) * hh;
    const y1 = y0 + fall * hh;
    // A sealed helm owns everything above its rim: the mantle starts
    // below the box or it simply is not there.
    if (floor !== null) {
      const fy0 = headY + floor * hh;
      if (y1 <= fy0) continue;
      if (y0 < fy0) y0 = fy0;
    }
    top.push([x, y0]);
    bot.push([xb, y1]);
  }
  if (top.length < 2) return false;
  ctx.beginPath();
  ctx.moveTo(top[0]![0], top[0]![1]);
  for (let i = 1; i < top.length; i++) ctx.lineTo(top[i]![0], top[i]![1]);
  for (let i = bot.length - 1; i >= 0; i--) ctx.lineTo(bot[i]![0], bot[i]![1]);
  ctx.closePath();
  return true;
}

/** Paint one pass's mantle: body, form split, seams, and cut hem. */
function paintMantle(
  ctx: CanvasRenderingContext2D,
  f: HairFrame,
  st: HairstyleDef,
  phi: number,
  back: boolean,
  floor: number | null,
): void {
  const { headX, headY, hw, hh, col, hurt } = f;
  // The far half lies in the head's own shadow — a step darker, the
  // same nape tone the ear backs wear.
  const base = hurt ? col : back ? shade(col, -10) : col;
  ctx.fillStyle = base;
  if (!mantlePath(ctx, f, st, phi, back, floor)) return;
  ctx.fill();
  if (hurt) return;
  ctx.save();
  mantlePath(ctx, f, st, phi, back, floor);
  ctx.clip();
  // Trailing-half shade: the mass keeps the head's screen-fixed light.
  ctx.fillStyle = shade(base, -12);
  ctx.fillRect(headX, headY - hh * 2, hw * 2, hh * 6);
  // Strand seams at their own bearings, foreshortening with the skull.
  ctx.fillStyle = shade(base, -20);
  for (const sm of st.seams) {
    const psi = azDelta(phi, sm.a);
    const d = Math.sin(psi);
    if (back ? d > -0.04 : d < 0.04) continue;
    const w = sm.w * hw * (0.45 + 0.55 * Math.abs(d));
    const x = headX + Math.cos(psi) * hw * MANTLE_R;
    ctx.fillRect(x - w / 2, headY - hh, w, hh * 4);
  }
  ctx.restore();
  // The cut hem: a shadow band riding just inside the bottom edge, so
  // the fall ends heavy instead of stopping on a bright line.
  ctx.save();
  mantlePath(ctx, f, st, phi, back, floor);
  ctx.clip();
  ctx.fillStyle = shade(base, -26);
  for (let i = 0; i <= MANTLE_STEPS; i++) {
    const t = i / MANTLE_STEPS;
    const psi = back ? -Math.PI + t * Math.PI : Math.PI - t * Math.PI;
    const a = phi - psi;
    const fall = st.fall(a);
    if (fall <= 0.02) continue;
    const x = headX + Math.cos(psi) * hw * MANTLE_R * GATHER;
    const y1 = headY + (hemAt(st, a) + fall) * hh;
    const w = (hw * 2 * Math.PI) / MANTLE_STEPS;
    ctx.fillRect(x - w, y1 - hh * 0.1, w * 2, hh * 0.1);
  }
  ctx.restore();
}

/** Build the cap silhouette path: overhang crown + the SOLVED hem. */
function capPath(ctx: CanvasRenderingContext2D, f: HairFrame, st: HairstyleDef, phi: number): void {
  const { headX, headY, hw, hh, cut } = f;
  const capX = hw * CAP_R;
  const capTop = hh * 1.05;
  const capCut = cut * 1.15;
  const topY = headY - capTop;
  const N = CAP_STEPS;
  ctx.moveTo(headX - capX + capCut, topY);
  ctx.lineTo(headX + capX - capCut, topY);
  ctx.lineTo(headX + capX, topY + capCut);
  // Hem stations, right edge to left edge — each column reads its own
  // visible azimuth through the hairline solve, a = φ − acos(u).
  for (let i = N; i >= 0; i--) {
    const u = (i / N) * 2 - 1;
    const a = phi - Math.acos(clamp(u, -1, 1));
    ctx.lineTo(headX + u * capX, headY + hemAt(st, a) * hh);
  }
  ctx.lineTo(headX - capX, topY + capCut);
  ctx.closePath();
}

function drawPass(
  ctx: CanvasRenderingContext2D,
  f: HairFrame,
  styleIx: number,
  cover: HairCover,
  back: boolean,
): void {
  if (cover === 'cloth') return;
  // Out-of-table indices fall to the default cut; index 1 is Bald and
  // its entry is genuinely null — `??` would resurrect hair on a bald
  // head, so the bounds check comes first.
  const st = styleIx < STYLES.length ? STYLES[styleIx] : STYLES[0];
  if (!st) return; // bald
  const phi = Math.atan2(f.fy, f.fx);
  const sealed = cover === 'sealed';
  // A wizard's brim holds every hanging strand; a sealed helm keeps
  // only what falls below its rim.
  if (cover !== 'brim') {
    paintMantle(ctx, f, st, phi, back, sealed ? SEALED_FLOOR : null);
  }

  // ---- the cap: camera-facing scalp only, and never under a helm
  // that owns the crown line.
  if (back || sealed) return;
  const { headX, headY, hw, hh, cut, col, hurt } = f;
  const capX = hw * CAP_R;
  const capTop = hh * 1.05;
  ctx.fillStyle = col;
  ctx.beginPath();
  capPath(ctx, f, st, phi);
  ctx.fill();
  if (!hurt) {
    // THE DEPTH KIT, clipped to the cap so no facet leaks past the
    // silhouette: trailing-half shade, a hem under-shade tracking the
    // solved hairline, strand notches, and the lit crown plane.
    ctx.save();
    ctx.beginPath();
    capPath(ctx, f, st, phi);
    ctx.clip();
    ctx.fillStyle = shade(col, -12);
    ctx.fillRect(headX, headY - capTop, capX, capTop + hh * 2.2);
    // THE CONTACT-SHADOW LAW: the hem under-shade is the shadow the
    // fringe casts ON SKIN. Where the mantle continues below the hem
    // there IS no skin — painting it there lays a thin hard line across
    // the middle of the hair mass that reads as a scratch, not a hem.
    // So the band is cut wherever a fall hangs under that column.
    ctx.fillStyle = shade(col, -22);
    const N = CAP_STEPS;
    let run: [number, number][] = [];
    const flushRun = (): void => {
      if (run.length >= 2) {
        ctx.beginPath();
        ctx.moveTo(run[0]![0], run[0]![1]);
        for (let i = 1; i < run.length; i++) ctx.lineTo(run[i]![0], run[i]![1]);
        for (let i = run.length - 1; i >= 0; i--) {
          ctx.lineTo(run[i]![0], run[i]![1] - hh * 0.09);
        }
        ctx.closePath();
        ctx.fill();
      }
      run = [];
    };
    for (let i = 0; i <= N; i++) {
      const u = (i / N) * 2 - 1;
      const a = phi - Math.acos(clamp(u, -1, 1));
      if (st.fall(a) > 0.05) {
        flushRun();
        continue;
      }
      run.push([headX + u * capX, headY + hemAt(st, a) * hh]);
    }
    flushRun();
    // Strand notches rise off the hem at their own skull bearings —
    // they slide across the cap with the turn and thin out as their
    // patch of scalp rounds the silhouette.
    ctx.fillStyle = shade(col, -22);
    for (const sn of st.strands) {
      const th = azDelta(sn.a, phi);
      const d = -Math.sin(th);
      if (d <= 0.06) continue;
      const sx = headX + Math.cos(th) * hw;
      const hy = headY + hemAt(st, sn.a) * hh;
      const w = sn.w * hw * (0.6 + 0.4 * d);
      ctx.fillRect(sx - w / 2, hy - sn.rise * hh, w, sn.rise * hh + hh * 0.02);
    }
    ctx.fillStyle = shade(col, 10);
    ctx.beginPath();
    chamferRect(ctx, headX - hw * 0.8, headY - hh * 0.98, hw * 1.6, hh * 0.22, cut * 0.4);
    ctx.fill();
    ctx.restore();
  }
  // Hem chips — nearer strands riding OVER the kit, azimuth-anchored
  // so they slide across the brow with the turn and round the corner.
  for (const ch of st.chips) {
    const th = azDelta(ch.a, phi);
    const d = -Math.sin(th);
    if (d <= 0.08) continue; // rounded the corner with its scalp patch
    const cx = headX + Math.cos(th) * hw;
    const hy = headY + hemAt(st, ch.a) * hh;
    const w = ch.w * hw * Math.max(0.35, d);
    ctx.fillStyle = col;
    ctx.fillRect(cx - w / 2, hy - hh * 0.12, w, hh * (0.12 + ch.drop));
    if (!hurt) {
      ctx.fillStyle = shade(col, -20);
      ctx.fillRect(cx - w / 2, hy + hh * ch.drop, w, hh * 0.05);
    }
  }
}

/**
 * Everything behind the skull: called by rig.ts BEFORE the torso, so
 * hair down the back is occluded by the shoulders exactly as it
 * should be, and shows below the jaw when the head is turned away.
 */
export function drawHairBack(
  ctx: CanvasRenderingContext2D,
  f: HairFrame,
  styleIx: number,
  cover: HairCover,
): void {
  drawPass(ctx, f, styleIx, cover, true);
}

/**
 * Everything on the camera side of the skull: called after the ears
 * (curtains overlay roots), before the face (deep-set eyes stay clear
 * of the side curtains by the EYE_R recess — the established law).
 */
export function drawHairFront(
  ctx: CanvasRenderingContext2D,
  f: HairFrame,
  styleIx: number,
  cover: HairCover,
): void {
  drawPass(ctx, f, styleIx, cover, false);
}
