/**
 * THE CART HAS TWO FEET (contested lands band 7, owed E5 / A6) — the
 * content lint for the shared FOOTPRINT map (shared/world/tiles.ts).
 *
 * Four scarred-land props (LeanTo, FieldCot, BelongingsCart,
 * BrokenCart) own a SECOND FOOT: the one cardinal neighbour their
 * painter reaches into, which the walk collider holds as a full block
 * while the prop stands. A footprint only tells the truth when that
 * neighbour is open ground the author gave the prop, so this lint
 * refuses any placement whose second foot is:
 *
 *  - SOLID (a hedge, a rack, a wall, another prop, a door): the art
 *    would stand inside another piece and the block would double a
 *    block; the author must move one of them;
 *  - A ROUTE (a Path tile — the lane, a road, a yard's paved way; or
 *    a Bridge/Dock deck): a cart parked with its shafts across the
 *    road blocks the road for everybody, which no sentence in any
 *    zone has ever meant;
 *  - A ROUTINE WAYPOINT (a placed actor's own post cell, or any post
 *    or path stop of its routine, in this zone's rect; a spawn
 *    point's patrol stop or authored post): a body sent to stand in
 *    the shafts would be snapped out by the stuck watchdog, the exact
 *    class of live regression worldFit.test exists to end;
 *  - OUTSIDE THE RECT: the second foot must stand on authored ground
 *    (the border ring of every authored rect is TILE_SKIP by law, so a
 *    lawful placement never reaches the edge).
 *
 * Pure read over a built ZoneDef; content.test asserts [] for every
 * shipped zone. Prefab sketches (pois/prefabs.ts) run the same law
 * through `footprintViolationsOn` with their own sampler.
 */
import { FOOTPRINT, TILE_DEFS, Tile, doorInfo } from '@arx/shared';
import type { ZoneDef } from '../types.js';
import { ROUTINES } from '../../routines/registry.js';
import type { RoutineDef, RoutineTask } from '../../routines/types.js';

/** Route tiles: the second foot may never lie on a way people walk. */
const ROUTE_TILES: ReadonlySet<number> = new Set<number>([Tile.Path, Tile.Bridge, Tile.Dock]);

export interface FootprintGround {
  /** Tile id at a WORLD cell, undefined outside the authored ground. */
  at(x: number, y: number): number | undefined;
  /** The cells to check, WORLD coords, every one carrying a FOOTPRINT tile. */
  cells: ReadonlyArray<readonly [number, number]>;
  /** WORLD cells a routine or a patrol will stand on (post cells included). */
  waypoints: ReadonlySet<string>;
}

const key = (x: number, y: number): string => `${x},${y}`;

/** The general law, for any sampler (zone or prefab). */
export function footprintViolationsOn(g: FootprintGround): string[] {
  const bad: string[] = [];
  for (const [x, y] of g.cells) {
    const t = g.at(x, y);
    if (t === undefined) continue;
    const f = FOOTPRINT.get(t as Tile);
    if (f === undefined) continue;
    const fx = x + f.dx;
    const fy = y + f.dy;
    const name = TILE_DEFS[t as Tile].name;
    const ft = g.at(fx, fy);
    const where = `${name} at (${x},${y}), second foot (${fx},${fy})`;
    if (ft === undefined) {
      bad.push(`${where}: outside the authored ground`);
      continue;
    }
    const fd = TILE_DEFS[ft as Tile];
    if (fd.solid || doorInfo(ft as Tile) !== null) {
      bad.push(`${where}: solid '${fd.name}'`);
      continue;
    }
    if (ROUTE_TILES.has(ft)) {
      bad.push(`${where}: a route ('${fd.name}')`);
      continue;
    }
    if (g.waypoints.has(key(fx, fy))) {
      bad.push(`${where}: a routine waypoint`);
    }
  }
  return bad;
}

/** Every cell a routine task sends its body to, WORLD tiles. */
function taskCells(task: RoutineTask, ax: number, ay: number, out: Set<string>): void {
  if (task.kind === 'post') {
    out.add(key(Math.floor(ax + (task.x ?? 0)), Math.floor(ay + (task.y ?? 0))));
  } else if (task.kind === 'path') {
    for (const wp of task.waypoints) out.add(key(Math.floor(ax + wp.x), Math.floor(ay + wp.y)));
  }
  // wander: rolled at runtime inside a radius; the centre alone is
  // not a stand, and a blocked cell inside the circle is re-rolled.
}

function routineCells(def: RoutineDef, ax: number, ay: number, out: Set<string>): void {
  taskCells(def.base, ax, ay, out);
  for (const s of def.slots ?? []) taskCells(s.task, ax, ay, out);
}

/** The zone's waypoint set: actor posts and routine stops, spawn patrols and posts. */
export function zoneWaypoints(z: ZoneDef): Set<string> {
  const out = new Set<string>();
  for (const a of z.actorSpawns ?? []) {
    out.add(key(Math.floor(a.x), Math.floor(a.y)));
    if (a.routine !== undefined) {
      const def = ROUTINES.get(a.routine);
      if (def !== undefined) routineCells(def, a.x, a.y, out);
    }
  }
  for (const s of z.spawns ?? []) {
    for (const p of s.patrol ?? []) out.add(key(Math.floor(p.x), Math.floor(p.y)));
    if (s.post !== undefined) out.add(key(Math.floor(s.post.x), Math.floor(s.post.y)));
  }
  return out;
}

/** The zone law: every FOOTPRINT tile in the built ground, checked. */
export function footprintViolations(z: ZoneDef): string[] {
  const w = z.width;
  const cells: Array<readonly [number, number]> = [];
  for (let i = 0; i < z.ground.length; i++) {
    if (FOOTPRINT.has(z.ground[i]! as Tile)) cells.push([z.origin.x + (i % w), z.origin.y + Math.floor(i / w)]);
  }
  const at = (x: number, y: number): number | undefined => {
    const lx = x - z.origin.x;
    const ly = y - z.origin.y;
    return lx >= 0 && ly >= 0 && lx < w && ly < z.height ? z.ground[ly * w + lx] : undefined;
  };
  return footprintViolationsOn({ at, cells, waypoints: zoneWaypoints(z) });
}
