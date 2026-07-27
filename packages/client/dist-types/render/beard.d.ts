import { type RingCover, type RingFrame } from './headRing.js';
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
/**
 * Paint the beard. Called from the face block in drawHumanoid — after
 * the cheek marks (a beard covers blush and freckles) and before the
 * tusks, which grow in front of it.
 */
export declare function drawBeard(ctx: CanvasRenderingContext2D, f: RingFrame, styleIx: number, cover: BeardCover): void;
//# sourceMappingURL=beard.d.ts.map