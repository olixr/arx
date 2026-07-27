import { shade } from './rig.js';
import {
  azDelta,
  bandPath,
  curve,
  facingOf,
  ringDepth,
  ringX,
  ripple,
  walkRing,
  type BandStation,
  type RingCover,
  type RingFrame,
} from './headRing.js';

/**
 * THE BEARD RIDES THE SAME RING — facial hair on the shared skull-ring
 * projection (headRing.ts), the second tenant after the hair.
 *
 * The retired beards were screen-space slabs pinned to a `pairX` slide
 * with a `bK = 1 − 0.25·profileK` width fudge: they stayed stuck to
 * the front of the face at every facing and simply squeezed as the
 * head turned, so a beard never wrapped a jaw and never went away when
 * the head did. Here a beard is exactly what it is on a real head — a
 * BAND around the jaw, anchored at fixed azimuths, projected. It wraps
 * at three-quarters, foreshortens into profile, and vanishes on its
 * own when the face turns away, because the far half of the ring is
 * simply not drawn. There is no facing test in this file.
 *
 * A beard is authored as two curves against the ring:
 *   top(a)  — where the hair meets skin (× hh from the head center),
 *             low at the chin, climbing to the sideburn at the ears;
 *   fall(a) — how far it hangs below that line.
 * Plus an optional MUSTACHE, which is its own little band on the upper
 * lip with the same projection, and which is deliberately separated
 * from the beard mass by a sliver of skin — that gap IS the mouth.
 *
 * Everything else is inherited law: ONE band per piece driven off ONE
 * station walk (never two shapes sharing an edge — that is what put a
 * seam through the hair), the GATHER so a beard narrows as it falls
 * instead of hanging like a bib, LOW-FREQUENCY ripple on the hem, and
 * the DEPTH-PASS one-sun form split.
 *
 * THE COVERAGE LAW applies as it does to hair, with one difference
 * that matters: a sealed full helm hides a face, so a beard shows only
 * what escapes BELOW the helm box (headY + 0.98·hh) — a patriarch's
 * fall spills out under a greathelm, a goatee does not.
 */

export type BeardCover = RingCover;

interface Mustache {
  /** Azimuth half-width of the piece. */
  half: number;
  /** Upper-lip line (× hh from the head center). */
  y: number;
  /** Thickness (× hh). */
  thick: number;
  /** How far the outer ends droop below the center (× hh). */
  droop: number;
}

interface BeardDef {
  /** Where the beard meets skin (× hh from head center) at azimuth a. */
  top: (a: number) => number;
  /** How far it hangs below that line (× hh). 0 = no beard there. */
  fall: (a: number) => number;
  /** Stubble paints as a translucent shadow rather than as mass. */
  alpha?: number;
  mustache?: Mustache;
  /** Strand seams down the mass, at their own jaw bearings. */
  seams?: readonly { a: number; w: number }[];
  /** A center parting down a long beard — the patriarch's fork. */
  fork?: { w: number; from: number };
}

/**
 * THE LEVEL-HEM LAW, beard edition. Author the BOTTOM line and derive
 * the length from it — never author the length directly. A beard is
 * cut to a hem that hangs roughly level around the jaw; if the length
 * is authored instead, it has to fight the rising jaw-top curve, and
 * the band shears into a wedge that sweeps off the chin and reads as a
 * scarf rather than as facial hair. This is the same law the hair hem
 * lives under, for the same reason.
 */
const hemTo =
  (top: (a: number) => number, bot: (a: number) => number) =>
  (a: number): number =>
    Math.max(0, bot(a) - top(a));

/**
 * THE JAW-LINE LAW: a beard's top curve climbs as it goes round. At
 * the chin it sits under the mouth; by the time it reaches the ear it
 * has risen to the sideburn. A beard authored with a flat top reads as
 * a bib strapped to the face — the rise IS the jaw.
 */
const JAW_TOP = curve([
  [0, 0.5], // under the mouth
  [0.6, 0.34],
  [1.0, 0.18],
  [1.3, 0.08], // the sideburn, reaching up toward the hair
  [1.5, 0.04],
]);
// THE EYE-LINE CEILING: no beard curve may climb above the eye line
// (headY + 0.1·hh). A top that rises past it reads as cheek fur
// growing out of the eye socket at three-quarter facings, where the
// far side of the jaw wraps toward the silhouette and lands right
// beside the surviving eye.

/** A mustache sized for the rig's mouth, shared by the kinds that wear one. */
const LIP: Mustache = { half: 0.46, y: 0.3, thick: 0.15, droop: 0.07 };

/** Style 1 — MUSTACHE: the lip alone, no jaw mass at all. */
const MUSTACHE: BeardDef = {
  top: () => 0,
  fall: () => 0,
  mustache: LIP,
};

const GOATEE_TOP = curve([
  [0, 0.56], // just under the lower lip
  [0.4, 0.52],
  [0.7, 0.46],
]);

/**
 * Style 2 — GOATEE: a chin patch with a mustache over it. The patch is
 * a narrow band (the chin is a small part of the ring), so it wraps
 * off the silhouette early — which is right: a goatee is invisible in
 * profile past about three-quarters.
 */
const GOATEE: BeardDef = {
  top: GOATEE_TOP,
  fall: ripple(
    hemTo(
      GOATEE_TOP,
      curve([
        [0, 1.32], // hangs a third of a head past the chin
        [0.34, 1.2],
        [0.56, 0.82],
        [0.7, 0.46], // ends exactly ON the top curve
      ]),
    ),
    0.03,
    0.015,
  ),
  mustache: LIP,
  seams: [{ a: -0.16, w: 0.05 }],
};

/**
 * Style 3 — FULL BEARD: sideburn to sideburn around the jaw, cropped
 * close under the chin. The mustache rides above a skin gap — the lip.
 */
const FULL: BeardDef = {
  top: JAW_TOP,
  fall: ripple(
    hemTo(
      JAW_TOP,
      curve([
        [0, 1.3], // the hem, hanging just past the chin
        [0.8, 1.24],
        [1.1, 1.04],
        [1.3, 0.62],
        [1.5, 0.04], // ends exactly ON the top curve — see THE CLOSED-HEM LAW
      ]),
    ),
    0.05,
    0.025,
  ),
  mustache: LIP,
  seams: [
    { a: -0.34, w: 0.06 },
    { a: 0.42, w: 0.055 },
    { a: -0.95, w: 0.05 },
    { a: 1.05, w: 0.05 },
  ],
};

/**
 * Style 4 — PATRIARCH: the long beard, falling to the chest and drawn
 * to a gathered point by the same GATHER law the hair uses. Takes the
 * old index 4 (a braided beard in the retired set): both are the big
 * statement beard, so a stored look keeps its character.
 */
const PATRIARCH: BeardDef = {
  top: JAW_TOP,
  fall: ripple(
    hemTo(
      JAW_TOP,
      curve([
        [0, 2.5], // the hem reaches the chest
        [0.45, 2.3],
        [0.85, 1.75],
        [1.12, 1.05],
        [1.32, 0.5],
        [1.5, 0.04], // ends exactly ON the top curve
      ]),
    ),
    0.08,
    0.04,
  ),
  mustache: { ...LIP, half: 0.5, thick: 0.17, droop: 0.11 },
  seams: [
    { a: -0.3, w: 0.07 },
    { a: 0.36, w: 0.065 },
    { a: -0.86, w: 0.055 },
    { a: 0.95, w: 0.055 },
  ],
  fork: { w: 0.075, from: 0.55 },
};

const CHOPS_TOP = curve([
  [0, 0.3],
  [0.62, 0.24],
  [1.0, 0.12],
  [1.3, 0.04], // reaches the ear root and stops (the eye-line ceiling)
  [1.5, 0.02],
]);

/**
 * Style 5 — MUTTON CHOPS: the sides only, chin bare. The fall is zero
 * across the front of the ring, so the band simply is not there — the
 * same mechanism that ends every other beard at the ear, used at the
 * other end.
 */
const CHOPS: BeardDef = {
  top: CHOPS_TOP,
  fall: ripple(
    hemTo(
      CHOPS_TOP,
      // Across the chin the hem sits ON the top line, so the band has
      // no thickness there and simply is not drawn: the shaved chin IS
      // the style, expressed in the same two curves as everything else.
      curve([
        [0, 0.3],
        [0.62, 0.24],
        [0.78, 0.62],
        [1.0, 0.92],
        [1.18, 0.9],
        [1.36, 0.5],
        [1.5, 0.02], // ends exactly ON the top curve
      ]),
    ),
    0.045,
    0.02,
  ),
  seams: [
    { a: -1.02, w: 0.06 },
    { a: 1.1, w: 0.06 },
  ],
};

const STUBBLE_TOP = curve([
  [0, 0.26], // up over the lip: stubble covers the mustache area too
  [0.7, 0.16],
  [1.1, 0.08],
  [1.4, 0.04],
]);

/**
 * Style 6 — STUBBLE: no mass at all, just a translucent shadow over
 * the jaw and lip. It is the one kind whose `fall` is a coverage area
 * rather than a hanging length, and it wears no gather — stubble does
 * not hang off anything.
 */
const STUBBLE: BeardDef = {
  top: STUBBLE_TOP,
  fall: hemTo(
    STUBBLE_TOP,
    curve([
      [0, 1.16],
      [0.8, 1.12],
      [1.2, 0.96],
      [1.42, 0.5],
      [1.56, 0.04], // ends exactly ON the top curve
    ]),
  ),
  alpha: 0.34,
};

/**
 * The style table, indexed by Look.beard. Order preserves the retired
 * set's indices — 1 mustache, 2 goatee, 3 full, 5 chops, 6 stubble all
 * mean what they always meant, and only 4 (braided → patriarch) is
 * reinterpreted. Index 0 is clean-shaven: a real null entry, so a
 * lookup must bounds-check BEFORE falling back or a shaved chin grows
 * a beard.
 */
const BEARDS: readonly (BeardDef | null)[] = [
  null,
  MUSTACHE,
  GOATEE,
  FULL,
  PATRIARCH,
  CHOPS,
  STUBBLE,
];

/**
 * THE JAW ORBIT: a beard rides the same recessed ring the face
 * features do (ORBIT 0.875 in rig.ts), NOT the skull's widest circle.
 * At 0.99 the chin swings almost to the silhouette while the nose and
 * mouth stay near the middle of the face, so the beard slides off its
 * own chin as the head turns — the jaw is narrower than the skull, and
 * the number has to say so.
 */
const JAW_R = 0.9;
/**
 * ...but the chin JUTS. A beard stands out in front of the face, so
 * the ring bulges forward at the nose bearing and settles back to the
 * jaw radius at the corners. At a uniform radius the profile beard
 * sits inside the chin silhouette and reads as painted onto the face
 * instead of growing off it. cos²a is 1 at the chin and 0 at the jaw
 * corners, which is exactly the shape wanted.
 */
const CHIN_OUT = 0.17;
const jawRadius = (a: number): number => JAW_R + CHIN_OUT * Math.cos(a) ** 2;
/**
 * NO GATHER ON THE JAW. The hair mantle narrows as it falls because it
 * hangs free off the skull; a beard is strapped to a jaw and follows
 * it. Pulling the bottom edge inward while the top edge stays on the
 * ring shears the band into a wedge that sweeps away from the chin and
 * reads as detached — a scarf, not a beard. Only the very tip of a
 * LONG beard draws together, and that is authored in its fall curve.
 */
/** A sealed helm's box: only what falls below this escapes it. */
const SEALED_FLOOR = 0.98;

/** Sample the beard band at one ring azimuth, or null where it is bare. */
function stationAt(
  f: RingFrame,
  st: BeardDef,
  phi: number,
  psi: number,
  floorY: number | null,
): BandStation | null {
  const a = phi - psi;
  const fall = Math.max(0, st.fall(a));
  // THE CLOSED-HEM LAW: a band thinner than this is not art, it is an
  // artifact. `curve` clamps to its last knot forever, so a bottom
  // curve that ends even slightly below its top curve leaves a
  // permanent hairline band ringing the whole head — every bottom
  // curve here therefore ends exactly ON its top curve, and this floor
  // catches whatever the ripple nudges back over the line.
  if (fall <= 0.05) return null;
  let top = f.headY + st.top(a) * f.hh;
  const bot = top + fall * f.hh;
  if (floorY !== null) {
    if (bot <= floorY) return null;
    if (top < floorY) top = floorY;
  }
  const x = ringX(f, psi, jawRadius(a));
  return { x, xr: x, top, bot };
}

/** The mustache is its own band, on the same ring and the same laws. */
function mustacheBand(
  f: RingFrame,
  m: Mustache,
  phi: number,
  psis: readonly number[],
  floorY: number | null,
): (BandStation | null)[] {
  return psis.map((psi) => {
    const a = wrapNear(phi - psi);
    if (Math.abs(a) > m.half) return null;
    const k = Math.abs(a) / m.half;
    let top = f.headY + (m.y + m.droop * k * k) * f.hh;
    const bot = top + m.thick * f.hh;
    if (floorY !== null) {
      if (bot <= floorY) return null;
      if (top < floorY) top = floorY;
    }
    const x = ringX(f, psi, jawRadius(a));
    return { x, xr: x, top, bot };
  });
}

/** Azimuths near the nose, folded so the ±π wrap cannot split a lip. */
const wrapNear = (a: number): number => azDelta(a, 0);

/**
 * Paint the beard. Called from the face block in drawHumanoid — after
 * the cheek marks (a beard covers blush and freckles) and before the
 * tusks, which grow in front of it.
 */
export function drawBeard(
  ctx: CanvasRenderingContext2D,
  f: RingFrame,
  styleIx: number,
  cover: BeardCover,
): void {
  if (cover === 'cloth') return;
  const st = styleIx >= 0 && styleIx < BEARDS.length ? BEARDS[styleIx] : null;
  if (!st) return; // clean-shaven
  const { headX, headY, hw, hh, col, hurt } = f;
  const phi = facingOf(f);
  const floorY = cover === 'sealed' ? headY + SEALED_FLOOR * hh : null;
  // A beard lives on the face, so only the camera half of the ring is
  // ever walked. When the head turns away the band empties on its own.
  const psis = walkRing(false);
  const sts = psis.map((psi) => stationAt(f, st, phi, psi, floorY));
  const lip = st.mustache ? mustacheBand(f, st.mustache, phi, psis, floorY) : null;

  const base = hurt ? col : col;
  if (st.alpha) ctx.globalAlpha = st.alpha;
  ctx.fillStyle = base;
  const hasMass = bandPath(ctx, sts);
  if (hasMass) ctx.fill();
  if (lip) {
    ctx.fillStyle = base;
    if (bandPath(ctx, lip)) ctx.fill();
  }
  if (st.alpha) {
    ctx.globalAlpha = 1;
    return; // stubble is a shadow: it carries no facets of its own
  }
  if (hurt || !hasMass) return;

  // ---- the depth kit, clipped to the beard's own band.
  ctx.save();
  bandPath(ctx, sts);
  ctx.clip();
  // Trailing-half shade: the beard keeps the head's screen-fixed light.
  ctx.fillStyle = shade(base, -12);
  ctx.fillRect(headX, headY - hh, hw * 3, hh * 6);
  // Strand seams at their own bearings, foreshortening with the jaw.
  for (const sm of st.seams ?? []) {
    const psi = azDelta(phi, sm.a);
    const d = ringDepth(psi);
    if (d < 0.04) continue;
    ctx.fillStyle = shade(base, -20);
    const w = sm.w * hw * (0.45 + 0.55 * d);
    ctx.fillRect(ringX(f, psi, jawRadius(sm.a)) - w / 2, headY, w, hh * 4);
  }
  // The fork: a long beard parts down its center line.
  if (st.fork) {
    const psi = azDelta(phi, 0);
    const d = ringDepth(psi);
    if (d > 0.15) {
      ctx.fillStyle = shade(base, -26);
      const w = st.fork.w * hw * d;
      ctx.fillRect(ringX(f, psi, jawRadius(0)) - w / 2, headY + st.fork.from * hh, w, hh * 4);
    }
  }
  // The hem: the cut end sits in shadow, tracking the same stations as
  // the edge it belongs to (never its own sampling — that is a seam).
  ctx.fillStyle = shade(base, -24);
  const hem = sts.map((s) =>
    s ? { x: s.x, xr: s.xr, top: s.bot - hh * 0.1, bot: s.bot } : null,
  );
  if (bandPath(ctx, hem)) ctx.fill();
  ctx.restore();

  // The mustache gets its own light, above the beard's.
  if (lip && st.mustache) {
    ctx.save();
    bandPath(ctx, lip);
    ctx.clip();
    ctx.fillStyle = shade(base, -12);
    ctx.fillRect(headX, headY - hh, hw * 3, hh * 4);
    ctx.fillStyle = shade(base, -22);
    const under = lip.map((s) =>
      s ? { x: s.x, xr: s.xr, top: s.bot - hh * 0.04, bot: s.bot } : null,
    );
    if (bandPath(ctx, under)) ctx.fill();
    ctx.restore();
  }
}
