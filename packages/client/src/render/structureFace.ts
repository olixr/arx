/**
 * THE STRUCTURE FACE — one law for every world-geometry vertical face.
 *
 * The renderer draws vertical faces (cliff curtains, and the wall /
 * doorway features that ride a face) as a screen-space rectangle between
 * two world-ground corners A and B, lifted by a screen-space height, with
 * the two shared corners rounded to the same device pixel so run-mates
 * meet seam-free — the cliffArt / deck law.
 *
 *  - WORLD-CORNER faces (cliffFaceItem) hand this module two WORLD
 *    corners; it projects, rounds and builds the four corners —
 *    `projectFace` (and its callback wrapper `emit`).
 *
 *  - FEATURE-ON-FACE placement (windows, doors, wall-hangings) maps a
 *    face-local (u,v) onto the face's own plane — `faceUV`.
 *
 * Pure and alloc-lean like the hot-path code it replaces: the world-corner
 * path allocates exactly the two Vec2s the old inline code did, plus one
 * small geometry record.
 */

/** The camera slice a structure face needs (satisfied by the Camera class). */
export interface FaceCamera {
  worldToScreen(wx: number, wy: number, w: number, h: number): { x: number; y: number };
}

/**
 * The four projected corners of a world-corner face. `ax/ay` and `bx/by`
 * are the rounded screen bases of corners A and B; `yTop*` / `yBot*` are
 * each corner's top and bottom screen y after the lift.
 */
export interface FaceGeom {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  yTopA: number;
  yTopB: number;
  yBotA: number;
  yBotB: number;
}

/**
 * Project a world-corner face. `a` / `b` are world-ground corners; `liftTop`
 * / `liftBot` are SCREEN-space lifts (device px, camera.scale already folded
 * in). Each corner subtracts the lift; shared corners round to the device
 * pixel.
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
  return {
    ax: A.x,
    ay: A.y,
    bx: B.x,
    by: B.y,
    yTopA: A.y - liftTop,
    yTopB: B.y - liftTop,
    yBotA: A.y - liftBot,
    yBotB: B.y - liftBot,
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

/** A point on the face, in whatever screen/frame space the caller feeds. */
export interface FacePt {
  x: number;
  y: number;
}

/**
 * FEATURE-ON-FACE UV — map a face-local (u,v) onto the face's own
 * plane through its four corners, so windows, doors and wall-hangings
 * ride the face itself.
 *
 * `u` runs along the wall (0 = west corner, 1 = east); `v` runs up the
 * height (0 = ground/base row, 1 = crown/top row). The map is the
 * standard bilinear over the four corners — interpolate up each side
 * edge by `v`, then across by `u`:
 *
 *   S(u,v) = lerp( lerp(baseW, topW; v), lerp(baseE, topE; v); u )
 *
 * Corners are handed in whatever space the caller draws in (this renderer
 * feeds frame-local corners: base row y=0, top row y=-hs). The four
 * corners form an axis-aligned rect (top and base share x; both rows are
 * horizontal), so `S(u,v).x` is v-independent and `S(u,v).y` is
 * u-independent — plain rect placement.
 *
 * The corner deltas are captured once; the returned mapper is alloc-free
 * when handed an `out` point (the hot path reuses one), else it returns a
 * fresh `{x,y}`.
 */
export function faceUV(
  baseWx: number,
  baseWy: number,
  baseEx: number,
  baseEy: number,
  topWx: number,
  topWy: number,
  topEx: number,
  topEy: number,
): (u: number, v: number, out?: FacePt) => FacePt {
  const dWx = topWx - baseWx; // west edge, base → top
  const dWy = topWy - baseWy;
  const dEx = topEx - baseEx; // east edge, base → top
  const dEy = topEy - baseEy;
  return (u: number, v: number, out?: FacePt): FacePt => {
    const wx = baseWx + dWx * v; // point up the west edge
    const wy = baseWy + dWy * v;
    const ex = baseEx + dEx * v; // point up the east edge
    const ey = baseEy + dEy * v;
    const x = wx + (ex - wx) * u; // then across, west → east
    const y = wy + (ey - wy) * u;
    if (out) {
      out.x = x;
      out.y = y;
      return out;
    }
    return { x, y };
  };
}
