/**
 * THE STRUCTURE FACE — one law for every world-geometry vertical face.
 *
 * The renderer draws several receding vertical faces (deck fascia, wall
 * side faces, cliff curtains, garrison curtain sides) as a screen-space
 * trapezoid between two world-ground corners A and B, each foreshortened
 * by ITS OWN depthScale so the face recedes as a true trapezoid (the far
 * corner shorter), and with the two shared corners rounded to the same
 * device pixel so run-mates meet seam-free — the cliffArt / deck law.
 *
 * Four near-identical implementations existed. This module holds the ONE
 * shared primitive so later phases (top-plane, feature-on-face UV, door
 * migration) build on one thing. It comes in two shapes because the four
 * call sites feed it two ways, and folding them into one function would
 * change the arithmetic (and so the pixels):
 *
 *  - WORLD-CORNER faces (deckStandFace, cliffFaceItem) hand this module
 *    two WORLD corners; it projects, rounds, samples each corner's
 *    depthScale and builds the four trapezoid corners — `projectFace`
 *    (and its callback wrapper `emit`).
 *
 *  - SCREEN-CORNER faces (the wall/garrison side faces) have ALREADY
 *    projected + custom-snapped their corners (snapPx + shared-edge bleed)
 *    and pre-foreshortened their lifts, so they only need the trapezoid
 *    fill + course-band + seam helpers, in screen space — `faceFill`,
 *    `faceBand`, `faceSeam`. Re-projecting them here (Math.round vs their
 *    snapPx/bleed) would move the pixels, so this shape keeps their
 *    corners and lifts verbatim.
 *
 * Pure and alloc-lean like the hot-path code it replaces: the world-corner
 * path allocates exactly the two Vec2s the old inline code did, plus one
 * small geometry record.
 */
/** The camera slice a structure face needs (satisfied by the Camera class). */
export interface FaceCamera {
    worldToScreen(wx: number, wy: number, w: number, h: number): {
        x: number;
        y: number;
    };
    depthScale(wy: number): number;
    /**
     * Device px per world tile (`camera.scale`). The world-corner run
     * primitives (`faceStrip`, `topPlane`) take lifts as WORLD heights (tiles)
     * — the units `collectVolume.heightAt` yields — and fold `scale` in here,
     * so a corner's screen lift is `worldHeight · scale · depthScale(corner)`
     * (exactly wallItem's `whT · sS`). `projectFace`/`emit`/`faceUV`/the
     * screen-space fills below never read it (they take pre-scaled lifts), so
     * their callers are unaffected.
     */
    scale: number;
}
/**
 * The four projected trapezoid corners of a world-corner face. `ax/ay` and
 * `bx/by` are the rounded screen bases of corners A and B; `yTop*` / `yBot*`
 * are each corner's top and bottom screen y after its own depthScale lift;
 * `dsA` / `dsB` are the per-corner depthScales (for callers whose dressing
 * foreshortens with the face).
 */
export interface FaceGeom {
    ax: number;
    ay: number;
    bx: number;
    by: number;
    dsA: number;
    dsB: number;
    yTopA: number;
    yTopB: number;
    yBotA: number;
    yBotB: number;
}
/**
 * Project a world-corner face. `a` / `b` are world-ground corners; `liftTop`
 * / `liftBot` are SCREEN-space lifts (device px, camera.scale already folded
 * in). Each corner subtracts `lift * depthScale(corner)`, so the two edges
 * slant with depth; shared corners round to the device pixel. At q=0
 * depthScale is exactly 1 and worldToScreen is exact-affine ⇒ the collapse
 * to today's single-depthScale rect is byte-identical.
 *
 * Arithmetic is left as `lift * ds` (NOT reassociated) so it matches the
 * old inline `A.y - lift * ds` bit-for-bit at every q.
 */
export declare function projectFace(cam: FaceCamera, w: number, h: number, ax: number, ay: number, bx: number, by: number, liftTop: number, liftBot: number): FaceGeom;
/**
 * `projectFace` + a paint callback — the headline primitive. Projects the
 * world-corner face, then hands the caller the geometry to paint its own
 * body / dressing / outline. The caller does zero projection or rounding.
 */
export declare function emit(cam: FaceCamera, w: number, h: number, ax: number, ay: number, bx: number, by: number, liftTop: number, liftBot: number, paint: (f: FaceGeom) => void): void;
/** A point on the face, in whatever screen/frame space the caller feeds. */
export interface FacePt {
    x: number;
    y: number;
}
/**
 * FEATURE-ON-FACE UV (Epic B P2, P3) — map a face-local (u,v) onto the
 * face's OWN projected plane through its four corners, so windows, doors
 * and wall-hangings ride the face itself instead of a stale row anchor.
 *
 * `u` runs along the wall (0 = west corner, 1 = east); `v` runs up the
 * height (0 = ground/base row, 1 = crown/top row). The map is the
 * standard bilinear over the four corners — interpolate up each side
 * edge by `v`, then across by `u`:
 *
 *   S(u,v) = lerp( lerp(baseW, topW; v), lerp(baseE, topE; v); u )
 *
 * Corners are handed in whatever space the caller draws in (this renderer
 * feeds frame-local corners: base row y=0, top row y=-hs). GL interpolates
 * the four corners perspective-correctly across the quad, so four corners
 * suffice; the canvas oracle mesh-subdivides (P4's concern, not this one).
 *
 * At q=0 the four corners form an axis-aligned rect (top and base share
 * x; both rows are horizontal), so `S(u,v).x` is v-independent and
 * `S(u,v).y` is u-independent — the map collapses to today's plain rect
 * placement, and a feature keyed to it lands pixel-for-pixel where it did
 * before the lean.
 *
 * The corner deltas are captured once; the returned mapper is alloc-free
 * when handed an `out` point (the hot path reuses one), else it returns a
 * fresh `{x,y}`.
 */
export declare function faceUV(baseWx: number, baseWy: number, baseEx: number, baseEy: number, topWx: number, topWy: number, topEx: number, topEy: number): (u: number, v: number, out?: FacePt) => FacePt;
/** A minimal 2D canvas surface — the drawing subset the side faces use. */
export interface FaceCtx {
    fillStyle: string | CanvasGradient | CanvasPattern;
    beginPath(): void;
    moveTo(x: number, y: number): void;
    lineTo(x: number, y: number): void;
    closePath(): void;
    fill(): void;
}
/**
 * SCREEN-SPACE side-face trapezoid. `ax/ay`–`bx/by` are the projected +
 * snapped GROUND corners; the top edge lifts by each corner's OWN
 * pre-foreshortened screen lift (`aLift` / `bLift`), so the face slants to
 * meet the crown. The lifts arrive already scaled (depthScale folded in by
 * the caller) so nothing is reassociated here.
 */
export declare function faceFill(ctx: FaceCtx, ax: number, ay: number, aLift: number, bx: number, by: number, bLift: number, col: string): void;
/** A course band between wall-height fractions f0..f1 of a side face. */
export declare function faceBand(ctx: FaceCtx, ax: number, ay: number, aLift: number, bx: number, by: number, bLift: number, f0: number, f1: number, col: string): void;
/**
 * A thin seam line across a side face at wall-height fraction f, constant
 * device thickness (min 1px) — a chinking line or mortar bed.
 */
export declare function faceSeam(ctx: FaceCtx, ax: number, ay: number, aLift: number, bx: number, by: number, bLift: number, f: number, wpx: number, col: string): void;
/** A world-ground corner (tile-corner coords), as `collectVolume` emits. */
export interface WorldCorner {
    x: number;
    y: number;
}
/**
 * A SILHOUETTE accumulator — the union of the projected OUTER rings that a
 * volume's `faceStrip`/`topPlane` calls produce, for A3's alpha-dilate
 * outline. Retire the per-tile vector stroke: ring the whole composited
 * volume once instead. Alloc-lean and headless (no `Path2D` dependency); the
 * caller emits the collected rings into whatever path/canvas it dilates.
 */
export interface Silhouette {
    /** Each entry is one closed ring of projected device-px points. */
    readonly rings: FacePt[][];
    /** Push one closed ring (a strip's or plane's projected outer boundary). */
    add(ring: FacePt[]): void;
    /**
     * Replay every accumulated ring into a `Path2D`-like sink as closed
     * subpaths — the union the outline dilate rings. The sink is passed in so
     * this module stays headless (node-testable); the renderer hands a real
     * `Path2D`, a test hands a recorder.
     */
    emit(sink: SilhouetteSink): void;
}
/** The `Path2D` subset `Silhouette.emit` drives. */
export interface SilhouetteSink {
    moveTo(x: number, y: number): void;
    lineTo(x: number, y: number): void;
    closePath(): void;
}
/** The screen-space bounding box of a silhouette's accumulated rings (device
 *  or css px, whatever space the rings were added in), or `null` if empty.
 *  A3's `paintVolumeRing` sizes its dilate scratch to this. Pure + alloc-lean
 *  (one record); extracted so the ring's extent is node-testable off the same
 *  rings the renderer dilates. */
export declare function silhouetteBounds(sil: Silhouette): {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
} | null;
/** Open a fresh silhouette accumulator for ONE volume. */
export declare function beginSilhouette(): Silhouette;
/**
 * RUN-CONTINUOUS SIDE FACE. `corners` is the ordered chain of WORLD ground
 * corners along ONE exposed run edge (a slice of a `collectVolume.perimeter`
 * loop); `liftTop`/`liftBot` are WORLD heights (tiles) for the face's top and
 * bottom edges (bottom is 0 for a wall standing on the ground). Every corner
 * is projected, rounded and lifted by ITS OWN depthScale exactly ONCE, then
 * each adjacent pair is handed to `paint` as a `FaceGeom` trapezoid segment.
 *
 * The seamlessness win: segment `i`'s far corner and segment `i+1`'s near
 * corner are the SAME `RunCorner`, so `segᵢ.bx === segᵢ₊₁.ax` and their tops
 * agree to the device pixel — the fills abut with zero gap, no double-round.
 * The top edge slants correctly under pitch because each corner subtracts its
 * own `liftTop · scale · depthScale` (the far corner foreshortens more) — the
 * arithmetic wallItem does inline today, now shared across the whole run.
 *
 * Backend-agnostic exactly like `faceFill`/`faceBand`: `paint` draws each
 * segment through whatever ctx the caller dispatches to (canvas2d or the
 * stage), so A2/A4 call `faceFill`/`faceBand`/`faceSeam` inside `paint`.
 *
 * `opts.silhouette`, if given, accumulates the whole strip's OUTER ring
 * (ground edge forward, then top edge back) for A3's outline.
 *
 * At q=0 (depthScale === 1, affine) a straight E–W run is an axis-aligned
 * rectangle strip, byte-equivalent to today's per-tile rects.
 */
export declare function faceStrip(cam: FaceCamera, w: number, h: number, corners: readonly WorldCorner[], liftTop: number, liftBot: number, paint: (seg: FaceGeom, i: number) => void, opts?: {
    silhouette?: Silhouette;
}): void;
/** The whole-run crown handed to `topPlane`'s paint callback. */
export interface TopPlaneGeom {
    /**
     * The projected crown loop (the perimeter lifted to `height`), as a closed
     * ring of device-px points — the exact shape to fill and to clip the
     * run-continuous crown dressing to. Corner order matches the input loop.
     */
    poly: FacePt[];
    /**
     * WHOLE-RUN UV → screen mapper (a `faceUV` over the run's world bbox
     * corners, each lifted to `height`): `u` spans west→east across the run,
     * `v` spans north→south across its depth. A2's `woodCrownRun` becomes a
     * `paintUV` that keys every arris/spine/grain line to a `u`/`v` fraction,
     * so the beam tiles continuously across the whole run instead of per tile.
     * At q=0 the bbox projects to an axis-aligned rect and this collapses to
     * plain-rect placement — reproducing `woodCrownPlate`'s flat `fillRect`
     * look, so A2 can retire `woodCrownPlate`.
     */
    uv: (u: number, v: number, out?: FacePt) => FacePt;
}
/**
 * RUN-CONTINUOUS CROWN (top plane). `loop` is a `collectVolume.perimeter`
 * loop in WORLD corners; `height` is the crown's WORLD height (tiles). Every
 * loop corner is lifted vertically on screen by its own
 * `height · scale · depthScale` and rounded — so the crown recedes as a true
 * plane under pitch (far corners lift less and project narrower) and, being
 * projected off the SAME world corners the side `faceStrip` uses, seats on
 * the face tops seam-free.
 *
 * `paint` receives the projected loop (`poly`, to fill/clip) plus a
 * whole-run `uv` mapper spanning the run's world bounding rectangle, so
 * crown art tiles across the entire run. `opts.silhouette` accumulates the
 * projected loop as the crown's outer ring for A3.
 */
export declare function topPlane(cam: FaceCamera, w: number, h: number, loop: readonly WorldCorner[], height: number, paint: (plane: TopPlaneGeom) => void, opts?: {
    silhouette?: Silhouette;
}): void;
//# sourceMappingURL=structureFace.d.ts.map