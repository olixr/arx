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
  worldToScreen(wx: number, wy: number, w: number, h: number): { x: number; y: number };
  depthScale(wy: number): number;
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
export function projectFace(
  cam: FaceCamera,
  w: number,
  h: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  liftTop: number,
  liftBot: number,
): FaceGeom {
  const A = cam.worldToScreen(ax, ay, w, h);
  const B = cam.worldToScreen(bx, by, w, h);
  A.x = Math.round(A.x);
  A.y = Math.round(A.y);
  B.x = Math.round(B.x);
  B.y = Math.round(B.y);
  const dsA = cam.depthScale(ay);
  const dsB = cam.depthScale(by);
  return {
    ax: A.x,
    ay: A.y,
    bx: B.x,
    by: B.y,
    dsA,
    dsB,
    yTopA: A.y - liftTop * dsA,
    yTopB: B.y - liftTop * dsB,
    yBotA: A.y - liftBot * dsA,
    yBotB: B.y - liftBot * dsB,
  };
}

/**
 * `projectFace` + a paint callback — the headline primitive. Projects the
 * world-corner face, then hands the caller the geometry to paint its own
 * body / dressing / outline. The caller does zero projection or rounding.
 */
export function emit(
  cam: FaceCamera,
  w: number,
  h: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  liftTop: number,
  liftBot: number,
  paint: (f: FaceGeom) => void,
): void {
  paint(projectFace(cam, w, h, ax, ay, bx, by, liftTop, liftBot));
}

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
export function faceFill(
  ctx: FaceCtx,
  ax: number,
  ay: number,
  aLift: number,
  bx: number,
  by: number,
  bLift: number,
  col: string,
): void {
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(ax, ay - aLift);
  ctx.lineTo(bx, by - bLift);
  ctx.lineTo(bx, by);
  ctx.closePath();
  ctx.fill();
}

/** A course band between wall-height fractions f0..f1 of a side face. */
export function faceBand(
  ctx: FaceCtx,
  ax: number,
  ay: number,
  aLift: number,
  bx: number,
  by: number,
  bLift: number,
  f0: number,
  f1: number,
  col: string,
): void {
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(ax, ay - aLift * f0);
  ctx.lineTo(ax, ay - aLift * f1);
  ctx.lineTo(bx, by - bLift * f1);
  ctx.lineTo(bx, by - bLift * f0);
  ctx.closePath();
  ctx.fill();
}

/**
 * A thin seam line across a side face at wall-height fraction f, constant
 * device thickness (min 1px) — a chinking line or mortar bed.
 */
export function faceSeam(
  ctx: FaceCtx,
  ax: number,
  ay: number,
  aLift: number,
  bx: number,
  by: number,
  bLift: number,
  f: number,
  wpx: number,
  col: string,
): void {
  const wa = Math.max(1, wpx);
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(ax, ay - aLift * f);
  ctx.lineTo(bx, by - bLift * f);
  ctx.lineTo(bx, by - bLift * f + wa);
  ctx.lineTo(ax, ay - aLift * f + wa);
  ctx.closePath();
  ctx.fill();
}
