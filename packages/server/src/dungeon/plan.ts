import { rarityIndex } from '@arx/shared';
import { dist, type DungeonBuild, type Room, type RoomKind } from './types.js';

/**
 * PLAN — THE SPINE AND THE BRANCHES.
 *
 * The old plan spread anchors uniformly and hoped MST depth made a
 * journey. This plan AUTHORS the journey:
 *
 *  - The SPINE is the critical path: the entry (south) walks a
 *    wandering heading — arcs, S-curves, doglegs — rung by rung until
 *    the last rung seats the champion's court. Rung count and step
 *    length are laws, so the road is long by construction, not luck.
 *  - BRANCHES hang the remaining rooms off the trunk nearest-first
 *    (branch-of-branch included) — the side tangents. Deep branch
 *    leaves take the set-pieces: vault, the theme's own point of
 *    interest, the wayfarers' camp.
 *  - LOOPS close between rooms of NEIGHBORING depth only (≤2 rungs
 *    apart), never touching the court or its approach — runs are not
 *    out-and-back, but the finale is always earned.
 */

/** Margin: big rooms (r ≤ 13) + grand arenas must never kiss the apron. */
export const PLAN_MARGIN = 13;

/** The spine's rung count for a chamber budget. */
export function spineRungs(chambers: number): number {
  return Math.max(5, Math.round(chambers * 0.4));
}

function blankRoom(x: number, y: number, kind: RoomKind, onSpine: boolean): Room {
  return { x, y, kind, style: 'cave', arch: 'blob', r: 7, depth: 0, degree: 0, onSpine };
}

export function planLayout(b: DungeonBuild): void {
  const S = b.spec.size;
  const M = PLAN_MARGIN;
  const rng = b.rLayout;
  const rooms: Room[] = [];

  // ---- the spine -----------------------------------------------------
  const rungs = spineRungs(b.spec.chambers);
  const entry = blankRoom((S >> 1) + rng.int(-(S >> 3), S >> 3), S - M - 2, 'entry', true);
  rooms.push(entry);

  // The journey should spend the whole map: total walked length ≈
  // 1.25× the usable span, split across the rungs.
  const step = Math.max(16, Math.min(30, ((S - 2 * M) * 1.25) / (rungs - 1)));
  let heading = -Math.PI / 2 + rng.range(-0.6, 0.6);
  let px = entry.x;
  let py = entry.y;
  const MIN_SEP = 13;
  // THE ROAD IS LONG BY CONSTRUCTION: rungs are a floor, not the law.
  // A 4-connected walk can never beat the direct manhattan distance,
  // so the one provable guard is the court's own remove: while the
  // final rung would seat the court nearer than 0.88×S manhattan from
  // the entry, the road walks on (≤4 extra rungs). The proving found
  // monotone-diagonal spines whose branch blobs bridged the chord —
  // walked at 0.73× the law; this bound closes every such seed.
  const targetDirect = S * 0.88;
  let extraRungs = 0;
  const maxRungs = rungs + 4;
  for (let i = 1; i < rungs + extraRungs; i++) {
    let placed = false;
    for (let attempt = 0; attempt < 10 && !placed; attempt++) {
      // Wander, but never swing back south: the road always makes way.
      heading += rng.range(-0.55, 0.55);
      heading = Math.max(-Math.PI + 0.35, Math.min(-0.35, heading));
      let nx = px + Math.cos(heading) * step;
      let ny = py + Math.sin(heading) * step;
      // A wall ahead bends the road, not the law: side walls mirror
      // the heading east↔west; the far wall folds it to whichever
      // lateral side the road already leaned.
      if (nx < M || nx > S - M - 1) heading = -Math.PI - heading;
      if (ny < M) heading = heading < -Math.PI / 2 ? -Math.PI + 0.35 : -0.35;
      nx = Math.max(M, Math.min(S - M - 1, nx));
      ny = Math.max(M, Math.min(S - M - 1, ny));
      if (rooms.some((r) => dist(nx, ny, r.x, r.y) < MIN_SEP)) continue;
      px = Math.round(nx);
      py = Math.round(ny);
      placed = true;
    }
    if (!placed) {
      // Ten bends refused: shove the road onward along its heading and
      // accept the tight rung — the carver blends kissing rooms fine.
      px = Math.round(Math.max(M, Math.min(S - M - 1, px + Math.cos(heading) * step)));
      py = Math.round(Math.max(M, Math.min(S - M - 1, py + Math.sin(heading) * step)));
    }
    const isLast = i === rungs + extraRungs - 1;
    const directM = Math.abs(px - entry.x) + Math.abs(py - entry.y);
    if (isLast && directM < targetDirect && rungs + extraRungs < maxRungs) {
      extraRungs++;
      rooms.push(blankRoom(px, py, 'room', true));
      continue;
    }
    rooms.push(blankRoom(px, py, isLast ? 'boss' : 'room', true));
  }
  const bossIdx = rooms.length - 1;
  const spine = rooms.map((_, i) => i);

  // Spine edges: rung to rung, the road itself.
  const edges: Array<[number, number]> = [];
  for (let i = 1; i < rooms.length; i++) edges.push([i - 1, i]);

  // ---- the branches --------------------------------------------------
  // Extra road rungs never eat the tangents: the chamber budget grows
  // with them, so an extended seed keeps its full breadth to explore.
  const chamberBudget = b.spec.chambers + extraRungs;
  while (rooms.length < chamberBudget) {
    let best: { x: number; y: number } | null = null;
    let bestScore = -1;
    for (let k = 0; k < 14; k++) {
      const p = { x: rng.int(M, S - M - 1), y: rng.int(M, S - M - 1) };
      let minD = Infinity;
      for (const r of rooms) minD = Math.min(minD, dist(p.x, p.y, r.x, r.y));
      if (minD > bestScore) {
        bestScore = minD;
        best = p;
      }
    }
    const room = blankRoom(best!.x, best!.y, 'room', false);
    // Attach to the nearest room that is not the court — the champion
    // keeps exactly one approach.
    let anchor = 0;
    let ad = Infinity;
    for (let i = 0; i < rooms.length; i++) {
      if (i === bossIdx) continue;
      const d = dist(room.x, room.y, rooms[i]!.x, rooms[i]!.y);
      if (d < ad) {
        ad = d;
        anchor = i;
      }
    }
    rooms.push(room);
    edges.push([anchor, rooms.length - 1]);
  }

  // ---- tree depth (loops fold in after, and barely bend it) ----------
  const depthOver = (edgeList: Array<[number, number]>): number[] => {
    const adj: number[][] = rooms.map(() => []);
    for (const [i, j] of edgeList) {
      adj[i]!.push(j);
      adj[j]!.push(i);
    }
    const depth = rooms.map(() => -1);
    depth[0] = 0;
    const q = [0];
    while (q.length > 0) {
      const i = q.shift()!;
      for (const j of adj[i]!) {
        if (depth[j] === -1) {
          depth[j] = depth[i]! + 1;
          q.push(j);
        }
      }
    }
    return depth as number[];
  };
  const treeDepth = depthOver(edges);

  // ---- loops: neighborly cross-links only ----------------------------
  // A loop may only join rooms ≤2 rungs apart in the tree, and never
  // the court or its final approach — cross-play without shortcuts.
  const guarded = new Set([bossIdx, spine[spine.length - 2]!]);
  const hasEdge = (i: number, j: number) =>
    edges.some(([a, c]) => (a === i && c === j) || (a === j && c === i));
  // THE ROAD STAYS LONG: a loop is lateral circulation, never a chord.
  // Dijkstra walks the planned graph (euclidean weights — the carver
  // digs corridors near-straight) before a candidate joins; any link
  // that would shorten the entry→court road is refused, multi-hop
  // bypasses through branch chains included. The proving found a rare
  // crypt whose entry→rung-2 loop cut the road to 0.73× the law.
  // Weights are MANHATTAN — corridors carve as L-legs, and a euclidean
  // metric under-prices diagonal chords enough to let them through.
  const roadLen = (extra?: [number, number]): number => {
    const all = extra ? [...edges, extra] : edges;
    const adj: Array<Array<{ j: number; w: number }>> = rooms.map(() => []);
    for (const [i, j] of all) {
      const w =
        Math.abs(rooms[i]!.x - rooms[j]!.x) + Math.abs(rooms[i]!.y - rooms[j]!.y);
      adj[i]!.push({ j, w });
      adj[j]!.push({ j: i, w });
    }
    const best = rooms.map(() => Infinity);
    best[0] = 0;
    const done = new Set<number>();
    for (;;) {
      let u = -1;
      for (let k = 0; k < rooms.length; k++) {
        if (!done.has(k) && best[k]! < (u === -1 ? Infinity : best[u]!)) u = k;
      }
      if (u === -1 || u === bossIdx) break;
      done.add(u);
      for (const { j, w } of adj[u]!) best[j] = Math.min(best[j]!, best[u]! + w);
    }
    return best[bossIdx]!;
  };
  const loopKeepsRoad = (i: number, j: number): boolean =>
    roadLen([i, j]) >= roadLen() - 0.5;
  const maxLoops = Math.max(3, Math.round(b.spec.chambers / 5));
  let loops = 0;
  const loopFits = (i: number, j: number): boolean => {
    if (guarded.has(i) || guarded.has(j) || hasEdge(i, j)) return false;
    if (Math.abs(treeDepth[i]! - treeDepth[j]!) > 2) return false;
    return dist(rooms[i]!.x, rooms[i]!.y, rooms[j]!.x, rooms[j]!.y) < S * 0.34;
  };
  for (let i = 0; i < rooms.length && loops < maxLoops; i++) {
    for (let j = i + 1; j < rooms.length && loops < maxLoops; j++) {
      if (loopFits(i, j) && rng.chance(0.28) && loopKeepsRoad(i, j)) {
        edges.push([i, j]);
        loops++;
      }
    }
  }
  // THE FLOOR OF ONE: a dungeon with no loop at all is an out-and-back
  // chore — if the coin never fell, take the first lawful cross-link.
  if (loops === 0) {
    outer: for (let i = 0; i < rooms.length; i++) {
      for (let j = i + 1; j < rooms.length; j++) {
        if (loopFits(i, j) && loopKeepsRoad(i, j)) {
          edges.push([i, j]);
          loops++;
          break outer;
        }
      }
    }
  }

  const depth = depthOver(edges);
  for (let i = 0; i < rooms.length; i++) rooms[i]!.depth = depth[i]!;
  for (const [i, j] of edges) {
    rooms[i]!.degree++;
    rooms[j]!.degree++;
  }

  // ---- set-pieces on the tangents ------------------------------------
  const themePoi: RoomKind =
    b.spec.theme === 'crypt'
      ? 'ossuary'
      : b.spec.theme === 'mine'
        ? 'forge'
        : b.spec.theme === 'cavern'
          ? 'spring'
          : b.spec.theme === 'warren'
            ? 'den'
            : 'camp';
  const leaves = rooms
    .map((r, i) => ({ r, i }))
    .filter(({ r, i }) => i !== 0 && i !== bossIdx && r.degree === 1 && !r.onSpine)
    .sort((p, q) => q.r.depth - p.r.depth);
  if (rarityIndex(b.spec.tier) >= 1 && leaves.length > 0) leaves[0]!.r.kind = 'vault';
  if (leaves.length > 1 && rng.chance(0.85)) leaves[1]!.r.kind = themePoi;
  // The big tiers earn a second set-piece leaf — more to find per run.
  if (rarityIndex(b.spec.tier) >= 3 && leaves.length > 2) {
    leaves[2]!.r.kind = rng.chance(0.5) ? themePoi : 'camp';
  }
  const midRooms = rooms.filter((r) => r.kind === 'room' && !r.onSpine);
  if (themePoi !== 'camp' && midRooms.length > 2 && rng.chance(0.55)) {
    midRooms[rng.int(0, midRooms.length - 1)]!.kind = 'camp';
  }

  b.rooms = rooms;
  b.edges = edges.map(([a, c]) => ({ a, b: c }));
  b.spine = spine;
  b.bossIdx = bossIdx;
}
