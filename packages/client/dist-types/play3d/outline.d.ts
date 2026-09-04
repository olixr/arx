/**
 * THE OUTLINE LAW, ported (play3d S1). The 2D renderer's painters are
 * fill-only; the dark ring every body, tree and prop wears is an 8-tap
 * alpha DILATE composited UNDER the art (Renderer.bakeOutlineRing).
 * The 3D client bakes the same ring into every sprite texture at paint
 * time — it is what makes a billboard read as THIS game's art against
 * lit geometry (the July spike's single biggest cohesion win).
 *
 * Integer tap offsets (a bake, not a live blit — quantization is
 * allowed), the same ring colour, the same destination-over landing.
 * One module-level scratch canvas grows to the largest request and is
 * never re-minted.
 */
/**
 * Ring the art already painted into `ctx`'s canvas (pixel rect
 * 0..pw × 0..ph) with a dilate of radius `r` px, landed under the art.
 */
export declare function outlineRing(ctx: CanvasRenderingContext2D, pw: number, ph: number, r: number): void;
//# sourceMappingURL=outline.d.ts.map