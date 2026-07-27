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
/**
 * Everything behind the skull: called by rig.ts BEFORE the torso, so
 * hair down the back is occluded by the shoulders exactly as it
 * should be, and shows below the jaw when the head is turned away.
 */
export declare function drawHairBack(ctx: CanvasRenderingContext2D, f: HairFrame, styleIx: number, cover: HairCover): void;
/**
 * Everything on the camera side of the skull: called after the ears
 * (curtains overlay roots), before the face (deep-set eyes stay clear
 * of the side curtains by the EYE_R recess — the established law).
 */
export declare function drawHairFront(ctx: CanvasRenderingContext2D, f: HairFrame, styleIx: number, cover: HairCover): void;
//# sourceMappingURL=hair.d.ts.map