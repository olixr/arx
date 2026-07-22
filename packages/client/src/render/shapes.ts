/**
 * The DevCraft shape language: sharp-angle brutalism. Forms are blocks
 * with 45° chamfered corners and low-poly facets — never soft pills.
 * Every painter builds from these two primitives so the whole world
 * speaks one dialect.
 */

/**
 * Adds a chamfered-rectangle subpath: a block with its corners cut at
 * 45°. Per-corner sizes follow CSS order [tl, tr, br, bl]; pass a
 * single number for a uniform cut.
 */
export function chamferRect(
  ctx: CanvasRenderingContext2D | Path2D,
  x: number,
  y: number,
  w: number,
  h: number,
  cut: number | [number, number, number, number],
): void {
  // Allocation-free clamp: this runs thousands of times a frame across
  // the painters — the old destructure+map built an array, an iterator
  // and a closure per call (~6MB/s of pure garbage in town).
  const cap = Math.min(w, h) / 2;
  let tl: number, tr: number, br: number, bl: number;
  if (typeof cut === 'number') {
    tl = tr = br = bl = cut < 0 ? 0 : cut > cap ? cap : cut;
  } else {
    tl = cut[0] < 0 ? 0 : cut[0] > cap ? cap : cut[0];
    tr = cut[1] < 0 ? 0 : cut[1] > cap ? cap : cut[1];
    br = cut[2] < 0 ? 0 : cut[2] > cap ? cap : cut[2];
    bl = cut[3] < 0 ? 0 : cut[3] > cap ? cap : cut[3];
  }
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + w - tr, y);
  if (tr > 0) ctx.lineTo(x + w, y + tr);
  ctx.lineTo(x + w, y + h - br);
  if (br > 0) ctx.lineTo(x + w - br, y + h);
  ctx.lineTo(x + bl, y + h);
  if (bl > 0) ctx.lineTo(x, y + h - bl);
  ctx.lineTo(x, y + tl);
  ctx.closePath();
}

/**
 * Adds a faceted "circle" subpath: a regular polygon standing in for a
 * disc. `squashY` flattens it into a ground ellipse; `rot` picks which
 * facet faces up so repeated shapes don't tile visibly.
 */
export function facetCircle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  sides = 6,
  rot = -Math.PI / 2,
  squashY = 1,
): void {
  for (let i = 0; i < sides; i++) {
    const a = rot + (i / sides) * Math.PI * 2;
    const vx = x + Math.cos(a) * r;
    const vy = y + Math.sin(a) * r * squashY;
    if (i === 0) ctx.moveTo(vx, vy);
    else ctx.lineTo(vx, vy);
  }
  ctx.closePath();
}

/**
 * Adds a jittered low-poly blob subpath — the rock/canopy silhouette.
 * `seed` deterministically varies the radii so no two blobs match.
 */
export function facetBlob(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  seed: number,
  sides = 8,
  squashY = 1,
  rot = -Math.PI / 2,
): void {
  for (let i = 0; i < sides; i++) {
    const a = rot + (i / sides) * Math.PI * 2;
    const j = 0.82 + (((seed >> (i * 3)) & 7) / 7) * 0.3;
    const vx = x + Math.cos(a) * r * j;
    const vy = y + Math.sin(a) * r * j * squashY;
    if (i === 0) ctx.moveTo(vx, vy);
    else ctx.lineTo(vx, vy);
  }
  ctx.closePath();
}

/**
 * INSTANCED BLOBS: facetBlob is a pure function of (seed, sides, rot) up
 * to an affine transform — radius is a uniform scale, squash a y-scale,
 * position a translation. Hot per-frame painters (tree canopies draw
 * thousands of blobs a frame) build the UNIT blob once here and stamp
 * it with `path.addPath(unit, matrix)` — zero trig, zero allocation per
 * stamp, pixel-identical to rebuilding the path.
 */
const unitBlobs = new Map<number, Path2D>();

export function unitBlob(seed: number, sides: number): Path2D {
  // seed is a 32-bit hash; ×16 stays exact in a double.
  const key = (seed >>> 0) * 16 + sides;
  let p = unitBlobs.get(key);
  if (!p) {
    // Distinct seeds accumulate as the world is explored; the entries
    // are tiny (~9 verts) but unbounded — reset and rebuild on demand.
    if (unitBlobs.size > 20000) unitBlobs.clear();
    p = new Path2D();
    facetBlob(p as unknown as CanvasRenderingContext2D, 0, 0, 1, seed, sides, 1);
    unitBlobs.set(key, p);
  }
  return p;
}

/**
 * Shared scratch matrix for unitBlob stamps: addPath consumes the dict
 * synchronously, so one mutable object serves every stamp with no GC.
 */
export const BLOB_M = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
