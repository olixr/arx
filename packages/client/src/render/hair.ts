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
 * hair onto the same footing: every part of a hairdo lives at a fixed
 * AZIMUTH on the scalp ring, and every facing question is answered by
 * projecting that azimuth — never by choosing a band.
 *
 * THE ONE PIECE OF ALGEBRA. Write the facing as φ = atan2(fy, fx) and
 * measure each scalp azimuth against it, ψ = φ − a. Then the whole
 * projection collapses to a single pair:
 *
 *   screen x   u(ψ) = cos ψ      (−1 … 1 across the skull silhouette)
 *   depth      d(ψ) = sin ψ      (> 0 = camera side, < 0 = behind)
 *
 * Three facts fall straight out of that, and they are the reason this
 * module has no facing bands anywhere in it:
 *
 *   1. The camera-facing half is exactly ψ ∈ (0, π), and across it u
 *      sweeps −1 → 1 MONOTONICALLY. So the hair can be drawn as one
 *      polygon sampled in ψ — the samples are already sorted in screen
 *      x, at every facing, with no seams and nothing to sort.
 *   2. |d| is the tangential foreshortening at that azimuth, so hair
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
 * THE ONE-SILHOUETTE LAW. A pass is ONE polygon — crown and hanging
 * mass together, never a cap shape plus a fall shape. Two shapes were
 * tried first and always showed a hairline-shaped seam across the head
 * where they met: they sampled the same hem curve with DIFFERENT
 * parameterizations (one uniform in screen x, one uniform in azimuth)
 * at slightly different radii, so their polyline vertices could not
 * agree, and the sliver between two chords is visible at any zoom. No
 * amount of tuning fixes that; sharing one station walk does. Every
 * interior mark (contact shadow, cut hem, seams, strand notches) is
 * driven off those SAME stations, so nothing can drift against the
 * silhouette that contains it.
 *
 * Because both passes walk identical station math, they also agree
 * EXACTLY at ψ = 0 and ψ = π — the two points where the near and far
 * halves meet at the silhouette edge. That is why the head never shows
 * a notch at its own profile.
 *
 * TWO PASSES. drawHairBack paints the far half (ψ ∈ (−π, 0)) before
 * the torso, so hair down the back is occluded by the shoulders
 * exactly as it should be; drawHairFront paints the near half after
 * the ears (curtains overlay ear roots — the ear law holds) and before
 * the face.
 *
 * Styles are DATA (HairstyleDef): a hairline curve, a fall curve, a
 * parting notch, seams, hem chips, and strand notches — all azimuth-
 * anchored. New styles are authored, not re-coded.
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
   * face, rising through the temples into whatever mass the cut has.
   * Its own ripple cuts the strand tips, so a hem is never a flat bar.
   */
  fall: (a: number) => number;
  /**
   * The parting notch: a bite of forehead at a fixed azimuth. It
   * slides across the brow with the turn and rounds the corner like
   * any other feature. Depth is capped by the notch-HIGH law: the
   * hem never dips low enough to crowd the eye line.
   */
  notch?: { a: number; half: number; raise: number };
  /** Strand seams down the mass, at their own skull bearings. */
  seams: readonly { a: number; w: number }[];
  /** Near-strand chips riding the hem. */
  chips: readonly HemChip[];
  /** Dark parting notches rising off the hem into the crown. */
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
 * A hem ripple: the small unevenness that makes a cut edge read as
 * hair rather than as a ruled line. Amplitude is per style — a long
 * layered cut wants more than a barbered crop.
 */
const ripple =
  (base: (a: number) => number, amp: number, amp2 = amp * 0.5) =>
  (a: number): number => {
    const v = base(a);
    if (v <= 0.02) return v;
    // Low frequencies only. A ripple that cycles fast against the ring
    // scallops the hem into a row of lobes that read as melted wax at
    // any real zoom; hair unevenness is a few long waves with a finer
    // one riding them, and it must also EASE OUT as the fall shortens
    // so a barbered edge stays barbered.
    const k = Math.min(1, v / 0.5);
    return v + k * (amp * Math.cos(a * 2.5 + 0.4) + amp2 * Math.cos(a * 5.5 + 1.1));
  };

/**
 * Style 0 — THE WAYFARER: a layered, collar-length cut. Straight brow
 * fringe with one parting notch, temple wisps framing the face, and a
 * nape mass falling to the collarbone.
 *
 * THE EAR-LINE LAW: hanging hair begins at the temple, ~80° off the
 * nose — never earlier. The fall band projects onto the CHEEK at
 * three-quarter facings (honest geometry: near-side hair does overlap
 * the face), so a band that opens at 70° swallows half the face at
 * 45°. THE LEVEL-HEM LAW: past the ear the fall lengths stay nearly
 * EQUAL around the ring — hair is cut to one length, so its hem hangs
 * level; a fall that keeps growing toward the occiput shears the mass
 * into a wedge that tapers to a point in mid-air past the shoulder at
 * every profile facing. The small remaining rise is the extra distance
 * around the back of a real skull.
 */
const WAYFARER: HairstyleDef = {
  hairline: curve([
    [0, -0.44], // the brow window: a straight, confident fringe
    [0.66, -0.44],
    [1.05, -0.18], // lifting over the temple
    [1.62, 0.14], // clearing the ear root (the ear paints under this)
    [2.3, 0.44], // the behind-ear drop
    [Math.PI, 0.66], // the nape
  ]),
  fall: ripple(
    curve([
      [0, 0], // across the face there is no fall — the fringe IS the hem
      [1.16, 0.14], // the sideburn: a short lock, never zero — a fall that
      [1.36, 0.34], // hits exactly 0 tapers the mass to a needle point on
      [1.54, 0.68], // the cheek at every three-quarter facing
      [1.82, 1.0], // clearing the ear: the mass is at full length
      [2.3, 1.12],
      [Math.PI, 1.16], // the occiput, barely longer than the flanks
    ]),
    0.055,
    0.028,
  ),
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
 * Style 2 — THE CROP: the short cut, barbered close. Everything that
 * makes it read as short is in the HAIRLINE, not in the fall: the hem
 * climbs ABOVE the ear root (so the ears show, which is most of the
 * silhouette read), and the nape ends high on the neck instead of on
 * the collar. What little fall there is stays under a fifth of a head
 * — a sideburn in front of the ear, and just enough weight at the
 * nape that the back of the head is not a bare dome.
 *
 * The ripple is HALF the Wayfarer's: a barbered edge is tidy, and at
 * this length a big ripple reads as a ragged mistake rather than as
 * layering. The part is deeper and set further round — a side part is
 * this cut's one piece of character.
 */
const CROP: HairstyleDef = {
  hairline: curve([
    [0, -0.52], // a higher brow window than the long cut
    [0.58, -0.52],
    [1.0, -0.36],
    [1.5, -0.16], // ABOVE the ear root: the ear reads, and that is the cut
    [2.1, 0.06],
    [Math.PI, 0.24], // the nape, high on the neck
  ]),
  fall: ripple(
    curve([
      [0, 0],
      [1.1, 0],
      [1.34, 0.16], // the sideburn, in front of the ear
      [1.62, 0.1],
      [2.2, 0.13],
      [Math.PI, 0.18], // a little weight at the nape, nothing more
    ]),
    0.026,
    0.014,
  ),
  notch: { a: 0.62, half: 0.3, raise: 0.16 },
  seams: [
    { a: -2.3, w: 0.05 },
    { a: 2.5, w: 0.05 },
  ],
  chips: [
    { a: -0.26, w: 0.42, drop: 0.16 },
    { a: 0.9, w: 0.3, drop: 0.13 },
  ],
  strands: [
    { a: -0.7, w: 0.08, rise: 0.24 },
    { a: 0.34, w: 0.09, rise: 0.26 },
    { a: -1.7, w: 0.08, rise: 0.3 },
    { a: 1.9, w: 0.08, rise: 0.32 },
    { a: 2.7, w: 0.07, rise: 0.28 },
  ],
};

/**
 * The style table, indexed by Look.hair. Index 1 is Bald — a real
 * null entry, so every lookup must bounds-check BEFORE falling back
 * or a bald head grows hair. Future styles append; the INDEX
 * STABILITY LAW of look.ts reaches into this table.
 */
const STYLES: readonly (HairstyleDef | null)[] = [WAYFARER, null, CROP];

/**
 * What a humanoid with no Look wears — every NPC in the world. The
 * short cut is the neutral one: a town full of guards and crofters in
 * collar-length hair reads as a costume choice nobody made.
 */
export const NPC_HAIR_STYLE = 2;

/** Overhang law: the crown clears the skull silhouette, never insets it. */
const CAP_R = 1.04;
/**
 * THE GATHER LAW: the mass narrows as it falls. Hair hangs off a head
 * and converges toward the neck — a mass that keeps full skull width
 * all the way down reads as a cape or a hood, not as hair. Blended in
 * by how much fall a column actually has, so there is no width step
 * where the hanging part begins.
 */
const GATHER = 0.84;
/** Fall length (× hh) at which the gather is fully applied. */
const GATHER_FULL = 0.9;
/**
 * Station count for the silhouette walk. THE NYQUIST LAW: this must
 * comfortably out-sample the hem ripple's highest frequency, or the
 * strand tips alias into a stair-step of little rectangles — sampling
 * artifacts read as broken art, not as hair.
 */
const STEPS = 84;
/** A sealed helm's box: nape geometry must start below this to exist. */
const SEALED_FLOOR = 0.86;
/** Below this fall a column is bare skin under the hem, not hair. */
const BARE = 0.05;

/** Signed shortest distance between two azimuths. */
const azDelta = (a: number, b: number): number => wrapAz(a - b);

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

interface Station {
  /** Screen x of the silhouette's bottom edge at this azimuth. */
  x: number;
  /** Screen x on the skull ring itself (no gather) — for interior marks. */
  xr: number;
  /** Hem (hair-meets-skin) y, and the bottom-of-fall y. */
  hemY: number;
  botY: number;
  fall: number;
}

/**
 * One station of the silhouette walk. Both passes and every interior
 * mark go through here, which is what keeps them all in register.
 */
function stationAt(f: HairFrame, st: HairstyleDef, phi: number, psi: number): Station {
  const a = phi - psi;
  const fall = Math.max(0, st.fall(a));
  const hemY = f.headY + hemAt(st, a) * f.hh;
  // The gather eases in with the fall, so the crown's full width and
  // the mass's narrowed width are the same curve, never a step.
  const g = 1 - (1 - GATHER) * Math.min(1, fall / GATHER_FULL);
  const xr = f.headX + Math.cos(psi) * f.hw * CAP_R;
  return {
    x: f.headX + Math.cos(psi) * f.hw * CAP_R * g,
    xr,
    hemY,
    botY: hemY + fall * f.hh,
    fall,
  };
}

/** Walk one pass's half of the ring, screen-left to screen-right. */
function walk(f: HairFrame, st: HairstyleDef, phi: number, back: boolean): Station[] {
  const out: Station[] = [];
  for (let i = 0; i <= STEPS; i++) {
    const t = i / STEPS;
    // The camera side is d = sin ψ > 0, so the FRONT pass is
    // ψ ∈ (0, π) and the far pass is ψ ∈ (−π, 0) — and the azimuth is
    // recovered by a = φ − ψ, never φ + ψ (that sign swaps the passes
    // wholesale: the far mass paints over the face and the near mass
    // hides behind the shoulders).
    const psi = back ? -Math.PI + t * Math.PI : Math.PI - t * Math.PI;
    out.push(stationAt(f, st, phi, psi));
  }
  return out;
}

/**
 * THE ONE SILHOUETTE: crown overhang across the top, then the bottom
 * edge sampled through the stations — hem where the cut ends on skin,
 * hem + fall where it hangs. One path, so there is no internal join
 * to show a seam.
 */
function silhouettePath(ctx: CanvasRenderingContext2D, f: HairFrame, sts: Station[]): void {
  const { headX, headY, hw, hh, cut } = f;
  const capX = hw * CAP_R;
  const topY = headY - hh * 1.05;
  const capCut = cut * 1.15;
  const first = sts[0]!;
  const last = sts[sts.length - 1]!;
  ctx.beginPath();
  ctx.moveTo(headX - capX + capCut, topY);
  ctx.lineTo(headX + capX - capCut, topY);
  ctx.lineTo(headX + capX, topY + capCut);
  // THE SHOULDER: the silhouette keeps full skull width down to the
  // hairline at each edge before the gather draws it in. Running the
  // crown corner straight to the gathered hem tip instead makes the
  // side one long blade-straight diagonal — the mass reads as a sheet
  // of card, not as hair with a head inside it.
  ctx.lineTo(last.xr, last.hemY);
  for (let i = sts.length - 1; i >= 0; i--) ctx.lineTo(sts[i]!.x, sts[i]!.botY);
  ctx.lineTo(first.xr, first.hemY);
  ctx.lineTo(headX - capX, topY + capCut);
  ctx.closePath();
}

/**
 * The sealed-helm silhouette: no crown at all (the helm owns it), just
 * the nape geometry that escapes below the rim.
 */
function napePath(
  ctx: CanvasRenderingContext2D,
  f: HairFrame,
  sts: Station[],
  floorY: number,
): boolean {
  const live = sts.filter((s) => s.botY > floorY && s.fall > BARE);
  if (live.length < 2) return false;
  ctx.beginPath();
  ctx.moveTo(live[0]!.x, Math.max(live[0]!.hemY, floorY));
  for (const s of live) ctx.lineTo(s.x, Math.max(s.hemY, floorY));
  for (let i = live.length - 1; i >= 0; i--) ctx.lineTo(live[i]!.x, live[i]!.botY);
  ctx.closePath();
  return true;
}

/**
 * Paint a band that hugs the bottom edge over a contiguous run of
 * stations — used for BOTH hem shadows, so each tracks the silhouette
 * it belongs to exactly.
 *
 * THE CONTACT-SHADOW LAW: the hem under-shade is the shadow the hair
 * casts ON SKIN. Where the mass continues below the hem there is no
 * skin, and painting it there lays a hard line across the middle of
 * the hair that reads as a scratch. So the skin band is cut wherever a
 * fall hangs under that column, and the cut end gets its own band.
 */
function hemBand(
  ctx: CanvasRenderingContext2D,
  sts: Station[],
  keep: (s: Station) => boolean,
  yOf: (s: Station) => number,
  depth: number,
): void {
  let run: Station[] = [];
  const flush = (): void => {
    if (run.length >= 2) {
      ctx.beginPath();
      ctx.moveTo(run[0]!.x, yOf(run[0]!));
      for (const s of run) ctx.lineTo(s.x, yOf(s));
      for (let i = run.length - 1; i >= 0; i--) ctx.lineTo(run[i]!.x, yOf(run[i]!) - depth);
      ctx.closePath();
      ctx.fill();
    }
    run = [];
  };
  for (const s of sts) {
    if (keep(s)) run.push(s);
    else flush();
  }
  flush();
}

function drawPass(
  ctx: CanvasRenderingContext2D,
  f: HairFrame,
  styleIx: number,
  cover: HairCover,
  back: boolean,
): void {
  if (cover === 'cloth') return;
  const st = styleIx >= 0 && styleIx < STYLES.length ? STYLES[styleIx] : STYLES[0];
  if (!st) return; // bald
  const { headX, headY, hw, hh, cut, col, hurt } = f;
  const phi = Math.atan2(f.fy, f.fx);
  const sealed = cover === 'sealed';
  const sts = walk(f, st, phi, back);
  // The far half lies in the head's own shadow — a step darker, the
  // same nape tone the ear backs wear.
  const base = hurt ? col : back ? shade(col, -10) : col;

  // ---- the silhouette.
  ctx.fillStyle = base;
  if (sealed) {
    if (!napePath(ctx, f, sts, headY + SEALED_FLOOR * hh)) return;
    ctx.fill();
  } else {
    silhouettePath(ctx, f, sts);
    ctx.fill();
  }
  if (hurt) return;

  // ---- the depth kit, clipped to whatever silhouette this pass drew.
  ctx.save();
  if (sealed) napePath(ctx, f, sts, headY + SEALED_FLOOR * hh);
  else silhouettePath(ctx, f, sts);
  ctx.clip();
  // Trailing-half shade: the hair keeps the head's screen-fixed light.
  ctx.fillStyle = shade(base, -12);
  ctx.fillRect(headX, headY - hh * 2, hw * 3, hh * 6);
  // The lit crown plane — the top of the head catches the sun.
  if (!sealed && !back) {
    ctx.fillStyle = shade(base, 10);
    ctx.beginPath();
    chamferRect(ctx, headX - hw * 0.8, headY - hh * 0.98, hw * 1.6, hh * 0.22, cut * 0.4);
    ctx.fill();
  }
  // Strand seams at their own bearings, foreshortening with the skull.
  ctx.fillStyle = shade(base, -20);
  for (const sm of st.seams) {
    const psi = azDelta(phi, sm.a);
    const d = Math.sin(psi);
    if (back ? d > -0.04 : d < 0.04) continue;
    const w = sm.w * hw * (0.45 + 0.55 * Math.abs(d));
    const x = headX + Math.cos(psi) * hw * CAP_R;
    ctx.fillRect(x - w / 2, headY - hh, w, hh * 4);
  }
  // Strand notches: parting lines that rise off the hem and TAPER OUT
  // into the crown. They must be wedges, not bars — a constant-width
  // rect ends on a hard horizontal edge partway up the head, which at
  // zoom reads as a floating dash of debris rather than as a parting.
  if (!sealed && !back) {
    ctx.fillStyle = shade(base, -22);
    for (const sn of st.strands) {
      const psi = azDelta(phi, sn.a);
      const d = Math.sin(psi);
      if (d <= 0.06) continue;
      const s = stationAt(f, st, phi, psi);
      const w = sn.w * hw * (0.6 + 0.4 * d);
      const topY = s.hemY - sn.rise * hh;
      ctx.beginPath();
      ctx.moveTo(s.xr - w / 2, s.hemY + hh * 0.02);
      ctx.lineTo(s.xr + w / 2, s.hemY + hh * 0.02);
      ctx.lineTo(s.xr + w * 0.16, topY);
      ctx.lineTo(s.xr - w * 0.16, topY);
      ctx.closePath();
      ctx.fill();
    }
  }
  // The two hem shadows, both walking the same stations as the edge.
  ctx.fillStyle = shade(base, -22);
  if (!sealed) {
    hemBand(ctx, sts, (s) => s.fall <= BARE, (s) => s.hemY, -hh * 0.09);
  }
  ctx.fillStyle = shade(base, -26);
  hemBand(ctx, sts, (s) => s.fall > BARE, (s) => s.botY, hh * 0.1);
  ctx.restore();

  // ---- hem chips: the nearest locks of the fringe, hanging a little
  // past the hem OVER the depth kit. They TAPER to their tip: a square
  // chip reads as a block bitten out of the forehead (it did), a
  // tapered one reads as a lock of hair lying in front of the rest.
  if (sealed || back) return;
  for (const ch of st.chips) {
    const psi = azDelta(phi, ch.a);
    const d = Math.sin(psi);
    if (d <= 0.08) continue;
    const s = stationAt(f, st, phi, psi);
    if (s.fall > BARE) continue; // a chip only reads against skin
    const w = ch.w * hw * Math.max(0.35, d);
    const tipY = s.hemY + ch.drop * hh;
    const tw = w * 0.42;
    const lean = w * 0.12;
    ctx.fillStyle = base;
    ctx.beginPath();
    ctx.moveTo(s.xr - w / 2, s.hemY - hh * 0.12);
    ctx.lineTo(s.xr + w / 2, s.hemY - hh * 0.12);
    ctx.lineTo(s.xr + tw / 2 + lean, tipY);
    ctx.lineTo(s.xr - tw / 2 + lean, tipY);
    ctx.closePath();
    ctx.fill();
    // The lock's own under-tip shadow, so it sits IN FRONT of the hem.
    ctx.fillStyle = shade(base, -20);
    ctx.beginPath();
    ctx.moveTo(s.xr - tw / 2 + lean, tipY);
    ctx.lineTo(s.xr + tw / 2 + lean, tipY);
    ctx.lineTo(s.xr + tw / 2 + lean, tipY - hh * 0.05);
    ctx.lineTo(s.xr - tw / 2 + lean, tipY - hh * 0.05);
    ctx.closePath();
    ctx.fill();
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
