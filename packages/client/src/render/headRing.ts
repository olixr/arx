/**
 * THE SKULL RING — the shared projection every piece of head art rides.
 *
 * Hair proved this foundation; beards are the second tenant, and any
 * future head-slot art (chin straps, face wraps, war braids) is meant
 * to be the third. The rule the whole system exists to enforce: art on
 * a head lives at a fixed AZIMUTH on the skull, and every facing
 * question is answered by PROJECTING that azimuth — never by testing
 * which band the facing falls in. Band gates are what made the old
 * hair snap between facings; nothing here can snap, because nothing
 * here branches on the facing.
 *
 * THE ONE PIECE OF ALGEBRA. Write the facing as φ = atan2(fy, fx) and
 * measure each azimuth against it, ψ = φ − a. Then:
 *
 *   screen x   u(ψ) = cos ψ      (−1 … 1 across the skull silhouette)
 *   depth      d(ψ) = sin ψ      (> 0 = camera side, < 0 = behind)
 *
 * Three facts fall out, and they do all the work:
 *
 *   1. The camera-facing half is exactly ψ ∈ (0, π), and across it u
 *      sweeps −1 → 1 MONOTONICALLY. So anything wrapping the head can
 *      be drawn as one polygon sampled in ψ — the samples arrive
 *      already sorted in screen x, at every facing, with no seams and
 *      nothing to depth-sort.
 *   2. |d| is the tangential foreshortening at that azimuth, so art
 *      rounding the silhouette compresses on its own.
 *   3. Inverting u gives the hairline solve, a = φ − acos(u): a screen
 *      column can ask which patch of skull it is showing and read that
 *      patch's authored height.
 *
 * SIGN TRAP, and it costs a full cycle every time: the azimuth is
 * recovered as a = φ − ψ, NEVER φ + ψ. Backwards, the two halves swap
 * wholesale — far-side art paints over the face and near-side art
 * hides behind the shoulders — and the result looks merely wrong-ish
 * rather than obviously broken.
 *
 * Heights are yaw-invariant: vertical positions are authored in
 * head-local y and never move with the facing. Sliding them with fy is
 * what made the old head read as a top-down dial.
 */

/** The head block a piece of ring art is painted onto. */
export interface RingFrame {
  /** Head block center + measurements, straight from drawHumanoid. */
  headX: number;
  headY: number;
  hw: number;
  hh: number;
  cut: number;
  /** Facing: fx = cos(dir), fy = sin(dir); fy > 0 faces the camera. */
  fx: number;
  fy: number;
  /** Resolved art color (hair palette / NPC tint). */
  col: string;
  /** Hurt flash — paint flat, no form facets. */
  hurt: boolean;
}

/**
 * THE COVERAGE LAW tiers, resolved by rig.ts from the worn helm. A
 * helmet never deletes head art, it CONTAINS it.
 *   free   — bare head or a circlet: everything shows.
 *   brim   — wizard's hat: the cloth holds hanging pieces; faces show.
 *   sealed — every forged metal kind (THE FORGE LAW: all metal is
 *            full-face): only what escapes below the box shows.
 *   cloth  — hoods: the cloth wraps everything.
 */
export type RingCover = 'free' | 'brim' | 'sealed' | 'cloth';

/** Fold an azimuth into (−π, π] — a = φ − ψ can leave the range. */
export const wrapAz = (a: number): number => {
  let v = a;
  while (v > Math.PI) v -= Math.PI * 2;
  while (v <= -Math.PI) v += Math.PI * 2;
  return v;
};

/** Signed shortest distance between two azimuths. */
export const azDelta = (a: number, b: number): number => wrapAz(a - b);

/**
 * A piecewise-linear curve over |a| — the authoring primitive for
 * every ring profile (hairlines, hem falls, beard tops). Symmetric by
 * construction, because a head is.
 */
export const curve =
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
 * The small unevenness that makes a cut edge read as hair rather than
 * as a ruled line. LOW FREQUENCIES ONLY, and eased out as the length
 * shortens: a ripple that cycles fast against the ring scallops the
 * edge into a row of lobes that read as melted wax at any real zoom,
 * and a barbered edge has to stay barbered.
 */
export const ripple =
  (base: (a: number) => number, amp: number, amp2 = amp * 0.5) =>
  (a: number): number => {
    const v = base(a);
    if (v <= 0.02) return v;
    const k = Math.min(1, v / 0.5);
    return v + k * (amp * Math.cos(a * 2.5 + 0.4) + amp2 * Math.cos(a * 5.5 + 1.1));
  };

/**
 * Ring sampling density. THE NYQUIST LAW: this must comfortably
 * out-sample the highest frequency any profile carries, or edges alias
 * into a stair-step of little rectangles — sampling artifacts read as
 * broken art, not as art.
 */
export const RING_STEPS = 84;

export const facingOf = (f: RingFrame): number => Math.atan2(f.fy, f.fx);

/** Screen x of a ring azimuth, at radius r × the head half-width. */
export const ringX = (f: RingFrame, psi: number, r = 1): number =>
  f.headX + Math.cos(psi) * f.hw * r;

/** How much this azimuth faces the camera (> 0 = the near half). */
export const ringDepth = (psi: number): number => Math.sin(psi);

/**
 * Walk one half of the ring, ordered so screen x runs left → right
 * either way. The camera half is ψ ∈ (0, π); the far half ψ ∈ (−π, 0).
 */
export function walkRing(back: boolean, steps = RING_STEPS): number[] {
  const out: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    out.push(back ? -Math.PI + t * Math.PI : Math.PI - t * Math.PI);
  }
  return out;
}

/**
 * One sampled column of a band. The two edges carry SEPARATE screen
 * x's on purpose: the top edge is where the art meets the head, so it
 * rides the ring itself (`xr`), while the bottom edge may be drawn in
 * by a gather (`x`). Feeding the gathered x to both edges makes the
 * top edge wander in and out with the fall length — non-monotonic in
 * screen x — and the band self-intersects into a bowtie that renders
 * as a thin blade. That bug ate a beard.
 */
export interface BandStation {
  /** Screen x of the bottom edge (after any gather). */
  x: number;
  /** Screen x of the top edge, on the ring itself. */
  xr: number;
  top: number;
  bot: number;
}

/**
 * Build a closed path over a run of stations — top edge left→right,
 * bottom edge back right→left. `null` entries break the band, and each
 * surviving run becomes its own subpath, so one fill paints them all.
 *
 * Every edge AND every interior mark of a piece of ring art must be
 * driven off the same station list. Two shapes that sample one curve
 * with different parameterizations can never agree on their vertices,
 * and the sliver between their chords shows as a seam at any zoom —
 * that bug cost a whole pass of the hair work.
 */
export function bandPath(
  ctx: CanvasRenderingContext2D,
  sts: readonly (BandStation | null)[],
): boolean {
  let any = false;
  let run: BandStation[] = [];
  ctx.beginPath();
  const flush = (): void => {
    if (run.length >= 2) {
      any = true;
      ctx.moveTo(run[0]!.xr, run[0]!.top);
      for (const s of run) ctx.lineTo(s.xr, s.top);
      for (let i = run.length - 1; i >= 0; i--) ctx.lineTo(run[i]!.x, run[i]!.bot);
      ctx.closePath();
    }
    run = [];
  };
  for (const s of sts) {
    if (s) run.push(s);
    else flush();
  }
  flush();
  return any;
}
