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
  const cap = Math.min(w, h) / 2;
  const [tl, tr, br, bl] = (
    typeof cut === 'number' ? [cut, cut, cut, cut] : cut
  ).map((c) => Math.max(0, Math.min(cap, c))) as [number, number, number, number];
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + w - tr, y);
  if (tr > 0) ctx.lineTo(x + w, y + tr);
  ctx.lineTo(x + w, y + h - br);
  if (br > 0) ctx.lineTo(x + w - br, y + h);
  ctx.lineTo(x + bl, y + h);
  if (bl > 0) ctx.lineTo(x, y + h - bl);
  ctx.lineTo(x, y + tl);
  if (tl > 0) ctx.closePath();
  else ctx.closePath();
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
