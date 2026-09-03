import { Tile } from '@arx/shared';
import { packTile } from './interiors.js';

/**
 * THE ONE RENDER — A0: the shared world-geometry flood.
 *
 * `collectVolume` generalizes the run-ring BFS that `tryRunRingItem`
 * used to keep to itself into ONE component-flood primitive that the
 * run-ring path (furniture), and later the wall/hedge paths (A2/A4),
 * all call. A "volume" is the 4-connected same-class component of tiles
 * containing a seed cell, described as:
 *
 *   - the member tile list (flat `[x0,y0,x1,y1,…]`),
 *   - the LEXICOGRAPHIC-MIN anchor + inclusive tile bbox,
 *   - the EXPOSED-PERIMETER edge loop(s) in WORLD (tile-corner) coords —
 *     the outer boundary with interior shared edges dropped, and
 *   - a per-member height sampler hook the caller supplies.
 *
 * The perimeter is why runs render seamlessly downstream (invariants
 * #2/#3 of the epic): the shared-edge test is computed ONCE for the
 * whole component, so a wall/hedge run projects each world corner once
 * (`faceStrip`/`topPlane` in A1) instead of per tile — no double-rounded
 * seams. The loop doubles as the top-plane outline (walk it at
 * `heightAt(tx,ty)`) and as the silhouette to ring (A3).
 *
 * Membership is decided by CLASS EQUALITY: `classOf(tile,tx,ty)` maps a
 * sampled tile to a class key (any number) or `null` for "not a member".
 * Two cells join iff both classes are non-null AND equal to the SEED's
 * class. So the run-ring path passes a `classOf` that returns the tile
 * itself (exact-tile runs never merge across kinds), while the wall path
 * (A2) will map every wall tile to one class (a wall run coalesces
 * regardless of the specific wall tile).
 */

/** Reads the ground tile at a world cell (`undefined` off-map). */
export type TileSampler = (tx: number, ty: number) => Tile | undefined;

/**
 * Maps a sampled tile (and its cell) to a class key, or `null` for
 * "not a member". Membership in a volume = same non-null class as seed.
 */
export type ClassOf = (tile: Tile, tx: number, ty: number) => number | null;

/** A world-space corner point (tile-corner integer coordinates). */
export interface VolPoint {
  x: number;
  y: number;
}

/** Pooled scratch so the hot flood allocates nothing per call. */
export interface VolumeScratch {
  members: number[];
  seen: Set<number>;
  queue: number[];
}

export interface CollectVolumeOpts {
  /**
   * Max member-tile count. If the component grows beyond this the flood
   * bails and `collectVolume` returns `null` (caller treats as "too big
   * — render plainly"), matching the run-ring `cap*2` guard.
   */
  cap?: number;
  /**
   * Per-member height sampler, echoed back on the volume so callers pass
   * `wallHeightAt` / the hedge height and A1/A2 lift the perimeter to it.
   * Defaults to a flat `() => 0`.
   */
  heightAt?: (tx: number, ty: number) => number;
  /**
   * Compute the exposed-perimeter loop(s). Defaults to `true`. The
   * run-ring hot path passes `false` (it needs only members + bbox), so
   * sharing the flood adds no per-frame edge work / garbage there.
   */
  perimeter?: boolean;
  /**
   * Pooled scratch to flood into. Reused across calls to stay alloc-free
   * in hot loops. When omitted, fresh arrays/set are allocated. NOTE: the
   * returned `members` aliases `scratch.members` — copy it if retained
   * past the next `collectVolume` call.
   */
  scratch?: VolumeScratch;
}

export interface Volume {
  /**
   * Member tiles as a flat `[x0,y0,x1,y1,…]`. Traversal order matches
   * the original run-ring DFS (stack pop, neighbour order E,W,S,N) so
   * dependent draw order is preserved. Aliases `scratch.members` when a
   * scratch was supplied — copy if retained.
   */
  members: number[];
  /** Member-tile count (`members.length / 2`). */
  count: number;
  /** Lexicographic-min anchor: min ty, then min tx. Stable per component. */
  ax: number;
  ay: number;
  /** Inclusive tile bbox. */
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /**
   * Exposed-perimeter loop(s) in WORLD corner coords. One entry per
   * closed boundary (outer boundary + any holes). Each loop is a list of
   * corner points with collinear midpoints merged (a straight E–W run →
   * a 4-corner rectangle), canonicalized to start at the loop's
   * lexicographic-min corner, wound clockwise in screen (y-down) space so
   * the filled interior is on the right. Empty when `perimeter:false`.
   */
  perimeter: VolPoint[][];
  /** Per-member height sampler (the caller's hook, else `() => 0`). */
  heightAt: (tx: number, ty: number) => number;
}

// Neighbour order MUST match the legacy run-ring flood (E, W, S, N) so
// the members array — and thus any order-dependent draw layering — is
// byte-for-byte what `tryRunRingItem` produced before the extraction.
const NEIGH_X = [1, -1, 0, 0] as const;
const NEIGH_Y = [0, 0, 1, -1] as const;

const FLAT0 = (_tx: number, _ty: number): number => 0;

/**
 * Flood the 4-connected same-class component containing (tx,ty).
 * Returns `null` if the seed isn't a member, or the component exceeds
 * `cap`. See the module doc for the full contract.
 */
export function collectVolume(
  sample: TileSampler,
  tx: number,
  ty: number,
  classOf: ClassOf,
  opts?: CollectVolumeOpts,
): Volume | null {
  const seedTile = sample(tx, ty);
  if (seedTile === undefined) return null;
  const seedClass = classOf(seedTile, tx, ty);
  if (seedClass === null) return null;

  const cap = opts?.cap ?? Infinity;
  const scratch = opts?.scratch;
  const members = scratch ? scratch.members : [];
  const seen = scratch ? scratch.seen : new Set<number>();
  const queue = scratch ? scratch.queue : [];
  members.length = 0;
  queue.length = 0;
  seen.clear();

  // BFS/DFS flood — stack (pop from end), same-class membership. This is
  // the exact loop lifted from tryRunRingItem, generalized to classOf.
  queue.push(tx, ty);
  seen.add(packTile(tx, ty));
  while (queue.length > 0) {
    if (members.length > cap * 2) return null; // too big — caller renders plainly
    const cy = queue.pop()!;
    const cx = queue.pop()!;
    members.push(cx, cy);
    for (let n = 0; n < 4; n++) {
      const nx = cx + NEIGH_X[n]!;
      const ny = cy + NEIGH_Y[n]!;
      const k = packTile(nx, ny);
      if (seen.has(k)) continue;
      const nt = sample(nx, ny);
      if (nt === undefined) continue;
      const nc = classOf(nt, nx, ny);
      if (nc !== seedClass) continue;
      seen.add(k);
      queue.push(nx, ny);
    }
  }

  // Anchor (lexicographic min) + inclusive bbox — order-independent, so
  // stable no matter which member the visible scan met first.
  let ax = tx;
  let ay = ty;
  let x0 = tx;
  let x1 = tx;
  let y0 = ty;
  let y1 = ty;
  for (let i = 0; i < members.length; i += 2) {
    const mx = members[i]!;
    const my = members[i + 1]!;
    if (my < ay || (my === ay && mx < ax)) {
      ax = mx;
      ay = my;
    }
    if (mx < x0) x0 = mx;
    if (mx > x1) x1 = mx;
    if (my < y0) y0 = my;
    if (my > y1) y1 = my;
  }

  const perimeter =
    (opts?.perimeter ?? true) ? exposedPerimeter(members, seen) : [];

  return {
    members,
    count: members.length / 2,
    ax,
    ay,
    x0,
    y0,
    x1,
    y1,
    perimeter,
    heightAt: opts?.heightAt ?? FLAT0,
  };
}

/** One directed boundary half-edge from (ax,ay) to (bx,by). */
interface DEdge {
  ax: number;
  ay: number;
  bx: number;
  by: number;
}

/**
 * Compute the exposed-perimeter loop(s) for a member set.
 *
 * A member cell (x,y) owns the unit world square whose corners are
 * (x,y)·(x+1,y)·(x+1,y+1)·(x,y+1). A cell edge is EXPOSED iff the
 * neighbour across it is not a member; exposed edges are emitted
 * clockwise (y-down) so the filled interior sits on the right. A shared
 * interior edge is dropped from BOTH its cells (neither neighbour is
 * "not a member"), so the shared-edge test is made exactly once per
 * edge — the invariant that lets a run project each corner once and tile
 * seam-free. Head-to-tail chaining stitches the half-edges into closed
 * loops; collinear midpoints are merged and each loop is canonicalized.
 *
 * `seen` is reused as the O(1) membership set (it already holds every
 * member's packed key from the flood).
 */
function exposedPerimeter(members: number[], seen: Set<number>): VolPoint[][] {
  const isMem = (x: number, y: number): boolean => seen.has(packTile(x, y));
  const edges: DEdge[] = [];
  for (let i = 0; i < members.length; i += 2) {
    const x = members[i]!;
    const y = members[i + 1]!;
    // North edge, walked east (A→B): interior below, on the right.
    if (!isMem(x, y - 1)) edges.push({ ax: x, ay: y, bx: x + 1, by: y });
    // East edge, walked south (B→C).
    if (!isMem(x + 1, y)) edges.push({ ax: x + 1, ay: y, bx: x + 1, by: y + 1 });
    // South edge, walked west (C→D).
    if (!isMem(x, y + 1)) edges.push({ ax: x + 1, ay: y + 1, bx: x, by: y + 1 });
    // West edge, walked north (D→A).
    if (!isMem(x - 1, y)) edges.push({ ax: x, ay: y + 1, bx: x, by: y });
  }

  // Index each edge by its start corner. For a well-formed (non-pinched)
  // polyomino boundary each corner has exactly one outgoing exposed edge.
  const byStart = new Map<number, DEdge>();
  for (const e of edges) byStart.set(packTile(e.ax, e.ay), e);

  const visited = new Set<DEdge>();
  const loops: VolPoint[][] = [];
  for (const start of edges) {
    if (visited.has(start)) continue;
    const loop: VolPoint[] = [];
    let e: DEdge | undefined = start;
    while (e && !visited.has(e)) {
      visited.add(e);
      loop.push({ x: e.ax, y: e.ay });
      e = byStart.get(packTile(e.bx, e.by));
    }
    loops.push(canonicalizeLoop(mergeCollinear(loop)));
  }
  return loops;
}

/**
 * THE ONE RENDER — A2b: partition a volume's MEMBER tiles into maximal
 * straight CROWN SPANS, each a small 4-corner rectangle loop covering that
 * span's tiles at their footprint (before lift). Every member tile is
 * covered by EXACTLY ONE span, so the union of the spans is the wall's
 * top footprint — the crown area — NOT the enclosed interior a `perimeter`
 * outer loop would fill (a building ring's perimeter fills its floor).
 *
 * Why per-span, not one crown poly: a whole-footprint crown DrawItem
 * rasterizes to ONE scratch texture the size of the footprint bbox — a
 * town of buildings blows the scratch/VRAM budget (the constraint that
 * scoped A2 to thin runs). Each span's bbox is a thin strip (≤ the run
 * length in one axis, 1 tile in the other), so its scratch stays small,
 * while adjacent spans SHARE world corners (same integer coords → the same
 * rounded device pixel when projected) so the crown stays seam-free across
 * the whole loop — the seamlessness invariant, kept.
 *
 * Partition rule (covers each tile once, prefers long spans in BOTH axes):
 *   1. maximal HORIZONTAL runs of length ≥ 2 (contiguous same-row members);
 *   2. the leftover single-in-their-row tiles → maximal VERTICAL runs.
 * A building ring yields its top row + bottom row (horizontal) and its two
 * side columns' middles (vertical) = the four perimeter edges, robustly.
 * A thin E–W run is one horizontal span; a thin N–S run one vertical span;
 * an isolated tile a 1×1 span.
 *
 * Corners wind clockwise in screen (y-down) space, interior on the right,
 * matching `exposedPerimeter` — winding is immaterial to a filled crown but
 * kept consistent for callers that ring a span.
 */
/** An inclusive tile-rect crown span (a thin strip: one axis is a single tile). */
export interface CrownSpan {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export function crownSpans(members: number[]): CrownSpan[] {
  const n = members.length;
  if (n === 0) return [];
  const isMem = new Set<number>();
  for (let i = 0; i < n; i += 2) isMem.add(packTile(members[i]!, members[i + 1]!));
  const spans: CrownSpan[] = [];
  const covered = new Set<number>();
  // 1. Horizontal runs of length ≥ 2. A tile joins a horizontal run iff its
  //    east neighbour is also a member — scan each member, start a run at a
  //    tile whose WEST neighbour is not a member, extend east.
  for (let i = 0; i < n; i += 2) {
    const x = members[i]!;
    const y = members[i + 1]!;
    if (isMem.has(packTile(x - 1, y))) continue; // not a run start
    if (!isMem.has(packTile(x + 1, y))) continue; // length 1 — defer to vertical
    let xb = x;
    while (isMem.has(packTile(xb + 1, y))) xb++;
    for (let cx = x; cx <= xb; cx++) covered.add(packTile(cx, y));
    spans.push({ x0: x, y0: y, x1: xb, y1: y });
  }
  // 2. Vertical runs over the leftover (single-in-row) tiles. Start at a
  //    tile whose NORTH neighbour is not a leftover, extend south.
  const isLeft = (cx: number, cy: number): boolean =>
    isMem.has(packTile(cx, cy)) && !covered.has(packTile(cx, cy));
  for (let i = 0; i < n; i += 2) {
    const x = members[i]!;
    const y = members[i + 1]!;
    if (!isLeft(x, y)) continue;
    if (isLeft(x, y - 1)) continue; // not a column start
    let yb = y;
    while (isLeft(x, yb + 1)) yb++;
    for (let cy = y; cy <= yb; cy++) covered.add(packTile(x, cy));
    spans.push({ x0: x, y0: y, x1: x, y1: yb });
  }
  return spans;
}

/**
 * THE ONE RENDER — A2c: partition a DIAGONAL wall run's members into
 * per-column crown SPANS. A 45° wall is a STAIRCASE of triangular tiles
 * (each classified `len:1`), diagonally — not 4-  — connected: consecutive
 * members share exactly ONE projected hypotenuse corner. There is no
 * multi-tile straight span to coalesce (each tile is its own triangle), so
 * the partition yields ONE 1×1 span per member — mirroring how `crownSpans`
 * yields a single span for an isolated tile. The seamlessness comes not from
 * merging bboxes (each stays a single tile = tiny scratch, no blowup) but
 * from the DRAW projecting each member's crown off shared WORLD corners, so
 * adjacent members' hypotenuse arrises meet on the same device pixel, and
 * from the outline testing the run member set so the shared corner never
 * inks an internal seam — exactly the garrison/wall span law, applied along
 * the 45° run. Union of the spans === the run; every member covered once.
 */
export function diagSpans(members: number[]): CrownSpan[] {
  const spans: CrownSpan[] = [];
  const seen = new Set<number>();
  for (let i = 0; i < members.length; i += 2) {
    const x = members[i]!;
    const y = members[i + 1]!;
    const k = packTile(x, y);
    if (seen.has(k)) continue; // a member listed once covers itself once
    seen.add(k);
    spans.push({ x0: x, y0: y, x1: x, y1: y });
  }
  return spans;
}

/** Drop points that sit on a straight (axis-aligned) run between neighbours. */
function mergeCollinear(loop: VolPoint[]): VolPoint[] {
  const n = loop.length;
  if (n < 3) return loop;
  const out: VolPoint[] = [];
  for (let i = 0; i < n; i++) {
    const prev = loop[(i - 1 + n) % n]!;
    const cur = loop[i]!;
    const next = loop[(i + 1) % n]!;
    // Axis-aligned collinear midpoint: same x for all three, or same y.
    const collinear =
      (prev.x === cur.x && cur.x === next.x) ||
      (prev.y === cur.y && cur.y === next.y);
    if (!collinear) out.push(cur);
  }
  return out;
}

/** Rotate a loop to start at its lexicographic-min corner (min y, then x). */
function canonicalizeLoop(loop: VolPoint[]): VolPoint[] {
  if (loop.length < 2) return loop;
  let mi = 0;
  for (let i = 1; i < loop.length; i++) {
    const p = loop[i]!;
    const m = loop[mi]!;
    if (p.y < m.y || (p.y === m.y && p.x < m.x)) mi = i;
  }
  if (mi === 0) return loop;
  return loop.slice(mi).concat(loop.slice(0, mi));
}
