import assert from 'node:assert/strict';
import { test } from 'node:test';
import { TILE_DEFS, TILE_SKIP, Tile, doorInfo, seatAt } from '@arx/shared';
import { AUTHORED_WILD_SITES } from '../geography.js';
import { buildFenside } from '../maps/fenside.js';
import { PINS as FEN } from '../maps/fenside/pins.js';
import { buildPicket, buildWardthread } from '../maps/wardthread.js';
import { PINS as WARD } from '../maps/wardthread/pins.js';
import { NPC_ACTORS } from '../actors/registry.js';
import { validateNpcActor } from '../actors/validate.js';
import { ROUTINES } from '../routines/registry.js';
import type { RoutineDef, RoutineTask } from '../routines/types.js';
import { POI_DEFS } from './defs.js';
import { POI_PREFABS } from './prefabs.js';
import type { PrefabDef } from '../maps/prefab.js';

/**
 * THE PREFAB FIT (band 7, THE HAVEN'S CAST, blockout §4.1) — the
 * seating audit's committed half for POI actor rows.
 *
 * worldFit.test.ts holds every ZONE placement's routine against the
 * zone's own grid; a POI row carrying `at` (THE POST IS NAMED) has no
 * zone to be held against until compose time, so a re-sketch of the
 * prefab could strand a sleeper beside a moved bed or park a sit stop
 * on the floor and nothing would say so until the live audit. This
 * file expands each such row against every prefab in the def's pool,
 * with the same laws worldFit reads:
 *
 *  - the `at` cell is standable (open ground, or a seat/bed) and has
 *    a walkable CARDINAL neighbour (the cardinal-stand law);
 *  - every `lie` stop lands ON a Tile.Bed (seatAt pose 'lie') with an
 *    8-neighbour stand in the post's own walk component, and no two
 *    rows of one def lie on the same mattress (ONE SLEEPER OWNS THE
 *    MATTRESS: a bed run is one bed);
 *  - every `sit` stop lands ON real furniture (a seat under the stop,
 *    never the bare floor: the wayside sit is the zone's idiom, not a
 *    haven's);
 *  - no linger stop (sit/lie/work) stands in the shallows;
 *  - every open target is in the post's walk component; a solid one
 *    (a station, a lamp to trim) has a cardinal stand in it;
 *  - a wander circle holds reachable ground;
 *  - legs that leave the prefab are open-world ground, unknowable
 *    here, and are skipped, EXCEPT the one cross-lane walk this band
 *    authored: Ingram's morning to the ford is held to the fenside
 *    zone's own pins so the crofts' pin, the sketch and the head's
 *    layout argue with one number.
 */

const CARDINAL = [[0, 1], [0, -1], [1, 0], [-1, 0]] as const;
const RING8 = [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [-1, 1], [1, -1], [-1, -1]] as const;

interface Grid {
  p: PrefabDef;
  ground: (x: number, y: number) => number | undefined;
  comp: Int32Array;
  compAt: (x: number, y: number) => number;
  inRect: (x: number, y: number) => boolean;
}

function buildGrid(p: PrefabDef): Grid {
  const { width: w, height: h } = p;
  const inRect = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < w && y < h;
  const ground = (x: number, y: number): number | undefined => (inRect(x, y) ? p.ground[y * w + x] : undefined);
  const standable = (i: number): boolean => {
    const t = p.ground[i]!;
    if (t === TILE_SKIP) return false;
    return !TILE_DEFS[t as Tile].solid || doorInfo(t) !== null;
  };
  const comp = new Int32Array(w * h).fill(-1);
  let next = 0;
  const queue: number[] = [];
  for (let seed = 0; seed < w * h; seed++) {
    if (comp[seed] !== -1 || !standable(seed)) continue;
    const label = next++;
    comp[seed] = label;
    queue.length = 0;
    queue.push(seed);
    while (queue.length > 0) {
      const i = queue.pop()!;
      const x = i % w;
      const y = Math.floor(i / w);
      for (const [dx, dy] of CARDINAL) {
        const nx = x + dx;
        const ny = y + dy;
        if (!inRect(nx, ny)) continue;
        const ni = ny * w + nx;
        if (comp[ni] !== -1 || !standable(ni)) continue;
        comp[ni] = label;
        queue.push(ni);
      }
    }
  }
  const compAt = (x: number, y: number): number => (inRect(x, y) ? comp[y * w + x]! : -1);
  return { p, ground, comp, compAt, inRect };
}

interface Stop {
  x: number;
  y: number;
  sit: boolean;
  lie: boolean;
  work: boolean;
  label: string;
}

function stopsOf(task: RoutineTask, ax: number, ay: number, label: string): Stop[] {
  if (task.kind === 'post') {
    return [{ x: ax + (task.x ?? 0), y: ay + (task.y ?? 0), sit: task.sit === true, lie: task.lie === true, work: task.work === true, label: `${label} post` }];
  }
  if (task.kind === 'path') {
    return task.waypoints.map((wp, i) => ({ x: ax + wp.x, y: ay + wp.y, sit: wp.sit === true, lie: wp.lie === true, work: wp.work === true, label: `${label} wp${i}` }));
  }
  return [];
}

function tasksOf(def: RoutineDef): Array<{ task: RoutineTask; label: string }> {
  return [
    { task: def.base, label: 'base' },
    ...(def.slots ?? []).map((s, i) => ({ task: s.task, label: `slot${i}[${s.from}-${s.to})` })),
  ];
}

/** Every POI row that names its post, with the prefab it stands in. */
function namedRows(): Array<{ defId: string; pid: string; row: number; slug: string; dx: number; dy: number; routine?: string }> {
  const out: Array<{ defId: string; pid: string; row: number; slug: string; dx: number; dy: number; routine?: string }> = [];
  for (const def of POI_DEFS.values()) {
    for (const [i, a] of (def.actors ?? []).entries()) {
      if (!a.at) continue;
      for (const pid of def.prefabs) {
        out.push({ defId: def.id, pid, row: i, slug: a.pool.join('|'), dx: a.at.dx, dy: a.at.dy, ...(a.routine !== undefined ? { routine: a.routine } : {}) });
      }
    }
  }
  return out;
}

test('THE PREFAB FIT: every named post stands, sits, sleeps and walks inside its own sketch', () => {
  const bad: string[] = [];
  const grids = new Map<string, Grid>();
  const gridOf = (pid: string): Grid | undefined => {
    if (!grids.has(pid)) {
      const p = POI_PREFABS.get(pid);
      if (p) grids.set(pid, buildGrid(p));
    }
    return grids.get(pid);
  };
  // One sleeper owns the mattress: bed anchors claimed per def+prefab.
  const mattresses = new Map<string, string>();
  const posts = new Map<string, string>();
  const rows = namedRows();
  assert.ok(rows.length >= 7, 'the crofts name at least seven posts');
  for (const r of rows) {
    const g = gridOf(r.pid);
    if (!g) {
      bad.push(`${r.defId}[${r.row}] ${r.slug}: prefab '${r.pid}' unknown`);
      continue;
    }
    const who = `${r.defId}/${r.pid}[${r.row}] ${r.slug}`;
    const t = g.ground(r.dx, r.dy);
    const where = `(${r.dx},${r.dy})`;
    if (t === undefined || t === TILE_SKIP) {
      bad.push(`${who}: at ${where} is not the sketch's ground`);
      continue;
    }
    const seat = seatAt(g.ground, r.dx, r.dy);
    const solid = TILE_DEFS[t as Tile].solid && doorInfo(t) === null;
    if (solid && !seat) bad.push(`${who}: at ${where} is solid '${TILE_DEFS[t as Tile].name}'`);
    // The cardinal stand: the post itself, or (for a seat post) a walkable cardinal neighbour.
    const home = ((): number => {
      if (!solid) return g.compAt(r.dx, r.dy);
      for (const [dx, dy] of CARDINAL) {
        const c = g.compAt(r.dx + dx, r.dy + dy);
        if (c !== -1) return c;
      }
      return -1;
    })();
    if (home === -1) {
      bad.push(`${who}: at ${where} offers no stand`);
      continue;
    }
    if (!CARDINAL.some(([dx, dy]) => g.compAt(r.dx + dx, r.dy + dy) === home)) {
      bad.push(`${who}: at ${where} has no walkable cardinal neighbour (the cardinal-stand law)`);
    }
    // Two rows never share one cell.
    const postKey = `${r.defId}/${r.pid}@${r.dx},${r.dy}`;
    if (posts.has(postKey)) bad.push(`${who}: at ${where} is already ${posts.get(postKey)}'s post`);
    else posts.set(postKey, r.slug);

    if (!r.routine) continue;
    const def = ROUTINES.get(r.routine);
    if (!def) {
      bad.push(`${who}: names unknown routine '${r.routine}'`);
      continue;
    }
    for (const { task, label } of tasksOf(def)) {
      if (task.kind === 'wander') {
        const cx = r.dx + (task.x ?? 0) + 0.5;
        const cy = r.dy + (task.y ?? 0) + 0.5;
        if (!g.inRect(Math.floor(cx), Math.floor(cy))) continue;
        let open = false;
        const rad = Math.ceil(task.radius);
        for (let dy = -rad; dy <= rad && !open; dy++) {
          for (let dx = -rad; dx <= rad && !open; dx++) {
            const tx = Math.floor(cx) + dx;
            const ty = Math.floor(cy) + dy;
            if (Math.hypot(tx + 0.5 - cx, ty + 0.5 - cy) > task.radius) continue;
            if (g.compAt(tx, ty) === home) open = true;
          }
        }
        if (!open) bad.push(`${who} (${def.id}) ${label}: no reachable ground in the wander circle at (${cx},${cy}) r${task.radius}`);
        continue;
      }
      for (const stop of stopsOf(task, r.dx, r.dy, label)) {
        if (!g.inRect(stop.x, stop.y)) continue; // an open-world leg (Ingram's ford walk: held below)
        const st = g.ground(stop.x, stop.y)!;
        const name = st === TILE_SKIP ? 'skip' : TILE_DEFS[st as Tile].name;
        const sw = `(${stop.x},${stop.y}) '${name}'`;
        if (st === TILE_SKIP) {
          bad.push(`${who} (${def.id}) ${stop.label}: stop on the sketch's transparent ring at ${sw}`);
          continue;
        }
        const ssolid = TILE_DEFS[st as Tile].solid && doorInfo(st) === null;
        if ((stop.sit || stop.lie || stop.work) && st === Tile.WaterShallow) {
          bad.push(`${who} (${def.id}) ${stop.label}: linger stop in the shallows at ${sw}`);
          continue;
        }
        const spec = seatAt(g.ground, stop.x, stop.y);
        if (stop.lie) {
          if (!spec || spec.pose !== 'lie') {
            bad.push(`${who} (${def.id}) ${stop.label}: lie stop off a bed at ${sw}`);
            continue;
          }
          const key = `${r.defId}/${r.pid}@bed${spec.ax},${spec.ay}`;
          if (mattresses.has(key)) bad.push(`${who} (${def.id}) ${stop.label}: the bed at ${sw} already sleeps ${mattresses.get(key)} (one sleeper owns the mattress)`);
          else mattresses.set(key, r.slug);
        } else if (stop.sit) {
          if (!spec || spec.pose !== 'sit') {
            bad.push(`${who} (${def.id}) ${stop.label}: sit stop with no seat under it at ${sw}`);
            continue;
          }
        }
        if (!ssolid) {
          if (g.compAt(stop.x, stop.y) !== home) bad.push(`${who} (${def.id}) ${stop.label}: target ${sw} unreachable from the post`);
        } else {
          const ring = spec ? RING8 : CARDINAL;
          if (!ring.some(([dx, dy]) => g.compAt(stop.x + dx, stop.y + dy) === home)) {
            bad.push(`${who} (${def.id}) ${stop.label}: solid target ${sw} has no reachable stand beside it`);
          }
        }
      }
    }
  }
  assert.deepEqual(bad, [], `named posts out of prefab fit:\n  ${bad.join('\n  ')}`);
});

test('THE HAVEN\'S CAST (blockout §3.3): the crofts\' rows, their posts and the one board', () => {
  const def = POI_DEFS.get('fenside_lamp')!;
  assert.ok(def, 'fenside_lamp missing');
  const rows = def.actors!;
  assert.equal(rows.length, 8, 'Hale, Halvor, Ingram, two crofters, two skral, the watch');
  const by = (slug: string) => rows.filter((a) => a.pool.length === 1 && a.pool[0] === slug);
  // Hale on watch at the lamp's south cell, facing up the approach.
  const hale = by('waykeeper_hale');
  assert.equal(hale.length, 1);
  assert.equal(hale[0]!.post, 'watch');
  assert.deepEqual(hale[0]!.at, { dx: 4, dy: 2, dir: 'N' });
  assert.equal(hale[0]!.routine, 'hale_lamp');
  // Halvor at the fire's south-west cell, facing the gate across the water.
  assert.deepEqual(by('fenside_halvor')[0]!.at, { dx: 12, dy: 10, dir: 'W' });
  assert.equal(by('fenside_halvor')[0]!.routine, 'halvor_gate');
  // Ingram's post is the crofts' hearth (R3): beside his cot under the gate's canvas, facing the water.
  assert.equal(by('charter_ingram').length, 1, 'one Ingram');
  assert.equal(by('charter_ingram')[0]!.post, 'hearth');
  assert.deepEqual(by('charter_ingram')[0]!.at, { dx: 9, dy: 4, dir: 'E' });
  assert.equal(by('charter_ingram')[0]!.routine, 'ingram_dike');
  // Two crofters: the boards and the stilted pen, both facing west.
  const crofters = by('fenside_crofter');
  assert.equal(crofters.length, 2);
  assert.deepEqual(crofters.map((c) => c.at), [{ dx: 8, dy: 6, dir: 'W' }, { dx: 20, dy: 12, dir: 'W' }]);
  assert.deepEqual(crofters.map((c) => c.routine), ['crofter_boards', 'crofter_stilts']);
  // Two skral at the weir (R8): neutral rows, no routine, the totem's bank and the panels' shallows.
  const skral = by('skral_weirward');
  assert.equal(skral.length, 2);
  assert.deepEqual(skral.map((s) => s.at), [{ dx: 8, dy: 14, dir: 'E' }, { dx: 3, dy: 13, dir: 'S' }]);
  assert.ok(skral.every((s) => s.routine === undefined), 'a creature that sleeps where you can see it is not this creature');
  // The watch stands named too (fix pass 2, the live audit's third
  // defect): its derived post fell on the fen waist's felled south
  // shoulder twelve tiles from the bar's archer, inside the reavers'
  // eyeful, and the two drew steel whenever it investigated toward
  // the water. Now it keeps the gate's north edge four east of the
  // lamp, facing the road: the townward ring at the approach's head,
  // twenty-eight tiles from the crew's nearest stand.
  const watch = by('wayward_watch');
  assert.equal(watch.length, 1);
  assert.equal(watch[0]!.post, 'watch');
  assert.deepEqual(watch[0]!.at, { dx: 8, dy: 0, dir: 'N' });
  const grid = POI_PREFABS.get('poi_fenside_lamp')!;
  assert.equal(grid.ground[0 * grid.width + 8], Tile.GrassTall, 'the north edge, the gate\'s own long grass');
  const archer = [128, 91];
  const watchWorld = [148 + 8 + 0.5, 86 + 0 + 0.5];
  assert.ok(Math.hypot(watchWorld[0]! - archer[0]!, watchWorld[1]! - archer[1]!) > 25, 'out of the bar\'s eyeful');
  // ONE LEIF (R6/E4): no POI row anywhere places the lamp-boy; his walk is the road's.
  for (const d of POI_DEFS.values()) {
    assert.ok(!(d.actors ?? []).some((a) => a.pool.includes('waykeeper_leif')), `${d.id} places a second Leif`);
  }
  assert.ok(!ROUTINES.has('leif_walk'), 'leif_walk retired');
  // The crofts' one board (J16): THE OLD SLUICE and DROWNED CORN retired into the mouths.
  assert.deepEqual(def.signs, [
    { title: 'THE FIRST LAMP', lines: ['A Waykeeper lamp, lit at dusk.', 'Past the reach the fen', 'is nobody\'s road.'] },
  ]);
  assert.deepEqual(def.haven, { safeR: 16 }, 'R7: safeR stays 16');
});

test('THE HAVEN\'S CAST: the furniture under the stops is the furniture the brief named', () => {
  const p = POI_PREFABS.get('poi_fenside_lamp')!;
  const g = (x: number, y: number): number | undefined => (x >= 0 && y >= 0 && x < p.width && y < p.height ? p.ground[y * p.width + x] : undefined);
  const post = (def: RoutineDef, slot: number): { x: number; y: number } => {
    const t = def.slots![slot]!.task;
    assert.equal(t.kind, 'post');
    return t.kind === 'post' ? { x: t.x ?? 0, y: t.y ?? 0 } : { x: 0, y: 0 };
  };
  // Hale: the lamp one north of his post is what he trims; the stone bench two east is his night seat.
  const hale = ROUTINES.get('hale_lamp')!;
  assert.equal(g(4, 1), Tile.LampPost);
  const trim = hale.slots![0]!.task;
  assert.ok(trim.kind === 'path' && trim.waypoints[0]!.x === 0 && trim.waypoints[0]!.y === -1 && trim.waypoints[0]!.work === true);
  const bench = post(hale, 3);
  assert.equal(g(4 + bench.x, 2 + bench.y), Tile.StoneBench, 'Hale sleeps at his post in his boots, on the bench');
  assert.equal(hale.slots![3]!.from, 21.5);
  assert.equal(hale.slots![3]!.to, 5);
  // Halvor: the sluice's near post is one west of his look cell; the same bench at noon; the west cabin's bed.
  const halvor = ROUTINES.get('halvor_gate')!;
  const look = halvor.slots![0]!.task;
  assert.ok(look.kind === 'path');
  const lx = 12 + look.waypoints[0]!.x;
  const ly = 10 + look.waypoints[0]!.y;
  assert.equal(g(lx, ly), Tile.WaterShallow, 'he wades to the gate');
  assert.equal(g(lx - 1, ly), Tile.TimberPost, 'the near post, one tile off');
  assert.equal(g(lx - 2, ly), Tile.SluiceGateStrung, 'the strung panel beside it');
  const hb = post(halvor, 1);
  assert.equal(g(12 + hb.x, 10 + hb.y), Tile.StoneBench, 'the two men share one bench');
  assert.ok(halvor.slots![1]!.from >= 12 && halvor.slots![1]!.to <= 13, 'Halvor sits while Hale wanders');
  const hbed = post(halvor, 2);
  assert.equal(g(12 + hbed.x, 10 + hbed.y), Tile.Bed);
  // Ingram: the cot under the canvas is one north of his stand.
  const ingram = ROUTINES.get('ingram_dike')!;
  const cot = post(ingram, 2);
  assert.equal(g(9 + cot.x, 4 + cot.y), Tile.Bed);
  assert.equal(g(9, 2), Tile.LeanTo, 'the canvas over the cot');
  // The crofters: the boards by day; the east cabin's two beds by
  // night, one each (fix pass 2 split the joined 'EE' run into 'E.E'
  // so the second crofter lies instead of sitting up in the chair;
  // one sleeper owns the mattress and now there are two).
  const boards = ROUTINES.get('crofter_boards')!;
  const loop = boards.slots![0]!.task;
  assert.ok(loop.kind === 'path');
  assert.equal(g(8 + loop.waypoints[0]!.x - 1, 6 + loop.waypoints[0]!.y), Tile.PorchDeck, 'the north pallet');
  assert.equal(g(7, 6), Tile.PorchDeck, 'the south pallet at her post');
  const cbed = post(boards, 2);
  assert.equal(g(8 + cbed.x, 6 + cbed.y), Tile.Bed, 'the east cabin\'s bed');
  const stilts = ROUTINES.get('crofter_stilts')!;
  const morning = stilts.slots![0]!.task;
  assert.ok(morning.kind === 'path');
  assert.equal(g(20 + morning.waypoints[0]!.x + 1, 12 + morning.waypoints[0]!.y), Tile.PorchDeck, 'the boards from the water side');
  const sbed = post(stilts, 2);
  assert.equal(g(20 + sbed.x, 12 + sbed.y), Tile.Bed, 'the second crofter\'s own bed, east of the floor cell');
  assert.notEqual(`${8 + cbed.x},${6 + cbed.y}`, `${20 + sbed.x},${12 + sbed.y}`, 'two beds, two sleepers');
  assert.equal(g(20, 4), Tile.WoodFloor, 'the floor cell between the two beds');
  assert.equal(g(20, 6), Tile.Chair, 'the chair by the east hearth stands empty at night');
  assert.equal(g(19, 12), Tile.RailWood, 'the pen\'s rail beside his post');
  // The drover's sit is the wayside kind on open ground: the zone's idiom.
  const drover = ROUTINES.get('drover_held')!;
  assert.ok(drover.base.kind === 'post' && drover.base.sit === true);
});

test('INGRAM WALKS THE LINE (R3, G-11): the ford stops are the fenside zone\'s own pins', () => {
  const pin = AUTHORED_WILD_SITES.find((s) => s.id === 'fenside_crofts')!;
  assert.ok(pin, 'the crofts are pinned');
  assert.ok(pin.x !== undefined && pin.y !== undefined, 'the crofts are pinned to a coordinate');
  const p = POI_PREFABS.get('poi_fenside_lamp')!;
  // composePoi's blit anchor: the prefab's (0,0) lands at the pin minus half the sketch.
  const ox = pin.x! - Math.floor(p.width / 2);
  const oy = pin.y! - Math.floor(p.height / 2);
  const row = POI_DEFS.get('fenside_lamp')!.actors!.find((a) => a.pool[0] === 'charter_ingram')!;
  const ax = ox + row.at!.dx;
  const ay = oy + row.at!.dy;
  const walk = ROUTINES.get('ingram_dike')!.slots![0]!.task;
  assert.ok(walk.kind === 'path' && walk.mode === 'once');
  const world = walk.waypoints.map((wp) => [ax + wp.x, ay + wp.y] as const);
  assert.deepEqual(world[0], [FEN.HEAD_STAND[0], FEN.HEAD_STAND[1]], 'the clerk\'s stand behind the counter');
  assert.deepEqual(world[1], [FEN.LINE_END_STAND[0], FEN.LINE_END_STAND[1]], 'the line\'s end from the bank');
  assert.deepEqual(world[2], [FEN.LINE_MIDDLE_STAND[0], FEN.LINE_MIDDLE_STAND[1]], 'the line\'s middle from the shallows');
  assert.deepEqual(world[3], [ax, ay], 'and home');
  assert.ok(walk.waypoints.slice(0, 3).every((wp) => (wp.waitSec ?? 0) > 0 && wp.dir !== undefined), 'the level in his hand at every stop');
  assert.ok(walk.waypoints.every((wp) => Math.abs(wp.x) <= 128 && Math.abs(wp.y) <= 128), 'every leg inside MAX_OFFSET');
  // The head's stand is open ground in the built zone and reachable from the road's cell before the counter.
  const z = buildFenside();
  const at = (x: number, y: number): number | undefined => {
    const lx = x - z.origin.x;
    const ly = y - z.origin.y;
    return lx >= 0 && ly >= 0 && lx < z.width && ly < z.height ? z.ground[ly * z.width + lx] : undefined;
  };
  const stand = at(FEN.HEAD_STAND[0], FEN.HEAD_STAND[1])!;
  assert.ok(stand !== TILE_SKIP && !TILE_DEFS[stand as Tile].solid, 'the clerk\'s stand is open ground');
  assert.equal(at(FEN.HEAD_COUNTER[0], FEN.HEAD_COUNTER[1]), Tile.Counter, 'the counter in front of him');
  for (const [x, y] of [FEN.LINE_END_STAND, FEN.LINE_MIDDLE_STAND]) {
    const t = at(x, y);
    assert.ok(t === undefined || t === TILE_SKIP || !TILE_DEFS[t as Tile].solid, `the line stand (${x},${y}) is the field's own ground`);
  }
});

test('THE FORK\'S CAST (band 8 blockout §3.3, 0.2 M): Torsten and the sentinels are hearth rows with named posts, and the rest has one board', () => {
  const def = POI_DEFS.get('fork_waystation')!;
  assert.ok(def, 'fork_waystation missing');
  const rows = def.actors!;
  assert.equal(rows.length, 6, 'the keeper, the two watch, Torsten, the two sentinels');
  // The keeper and the derived ring are untouched.
  assert.deepEqual(rows[0], { pool: ['wayfarer_senna', 'wayfarer_dray', 'wayfarer_petch'], post: 'hearth', routine: 'waystation_keeper' });
  const watch = rows.filter((a) => a.pool.length === 1 && a.pool[0] === 'wayward_watch');
  assert.equal(watch.length, 2, 'the derived ring, and the only bodies that charge');
  assert.ok(watch.every((w) => w.post === 'watch' && w.at === undefined && w.routine === undefined));
  // Torsten in the mouth facing down the scuff, a HEARTH row (a watch
  // row charges any menace inside its reach; the sergeant stands the
  // way a lamp post stands), with the walk to his slate.
  const torsten = rows.filter((a) => a.pool.length === 1 && a.pool[0] === 'waykeeper_torsten');
  assert.equal(torsten.length, 1, 'one Torsten');
  assert.equal(torsten[0]!.post, 'hearth');
  assert.deepEqual(torsten[0]!.at, { dx: 12, dy: 4, dir: 'E' });
  assert.equal(torsten[0]!.routine, 'torsten_fork');
  // The two sentinels flank the stone, hearth rows, no routine: a
  // sentinel that sleeps where you can see it is not this sentinel,
  // and one that draws on a wolf makes its own line a lie.
  const sentinels = rows.filter((a) => a.pool.length === 1 && a.pool[0] === 'even_sentinel');
  assert.equal(sentinels.length, 2);
  assert.ok(sentinels.every((s) => s.post === 'hearth' && s.routine === undefined));
  assert.deepEqual(sentinels.map((s) => s.at), [{ dx: 14, dy: 1, dir: 'N' }, { dx: 16, dy: 2, dir: 'E' }]);
  // The sketch under the posts: the mouth's Dirt under the sergeant;
  // the waystone between the sentinels' open cells; the cairn pair
  // down the mouth from him.
  const p = POI_PREFABS.get('poi_fork_waystation')!;
  const g = (x: number, y: number): number | undefined => (x >= 0 && y >= 0 && x < p.width && y < p.height ? p.ground[y * p.width + x] : undefined);
  // THE SHELF IS THE SKETCH (band 8 fix pass): 22x8 at cap 22, so the
  // expansion hands it back untouched and every `at` above is a sketch
  // column; the footprint is the one band 0 measured, so the golden
  // anchor and the posts hold. Column 21 is the mouth's own last Dirt
  // (no hashed stump plugs it); the oak at the mouth falls to the
  // def's clearing 4 (a ninth row slid the anchor, refused).
  assert.equal(p.width, 22, 'the 22-wide sketch: no apron column');
  assert.equal(p.height, 8);
  assert.equal(g(21, 4), Tile.Dirt, 'the mouth reaches the shoulder: no clearing stump at (-140,-165)');
  assert.equal(g(21, 3), TILE_SKIP, 'the rest of column 21 is the field\'s');
  assert.equal(def.cues?.clearing, 4, 'the ring reaches the oak at (-144,-158), four rows south');
  assert.equal(g(0, 1), TILE_SKIP, 'column 0 is the sketch\'s own west edge, not an apron');
  assert.equal(g(12, 4), Tile.Dirt, 'the mouth under Torsten');
  assert.equal(g(15, 1), Tile.ElvenWaystone, 'the stone the sentinels keep');
  for (const [x, y] of [[14, 1], [16, 2]] as const) {
    const t = g(x, y)!;
    assert.ok(t !== TILE_SKIP && !TILE_DEFS[t as Tile].solid, `a sentinel's cell (${x},${y}) is open ground`);
  }
  assert.equal(g(17, 3), Tile.LampCairn, 'the cairn pair');
  assert.equal(g(17, 5), Tile.LampCairn);
  for (let x = 13; x <= 20; x++) assert.equal(g(x, 4), Tile.Dirt, `the mouth runs east of him at (${x},4)`);
  // ONE BOARD: THE TALLY went to the picket (the zone's ZoneSign).
  assert.deepEqual(def.signs, [{ title: 'THE FORK REST', lines: ['the lamps stop here', 'the stone keeps the mile past it'] }]);
  assert.ok(def.description!.includes('across the road the thread they strung round the dying stand'), 'the description says where the thread is');
  assert.ok(!def.description!.includes('grey stone at the thread\'s end'), 'no grey stone in a Waykeeper yard');
  assert.deepEqual(def.haven, { safeR: 18 });
  // ONE TORSTEN: no other def places him (the picket places nobody).
  for (const d of POI_DEFS.values()) {
    if (d.id === 'fork_waystation') continue;
    assert.ok(!(d.actors ?? []).some((a) => a.pool.includes('waykeeper_torsten')), `${d.id} places a second Torsten`);
  }
  assert.deepEqual(buildPicket().actorSpawns ?? [], [], 'the picket places nobody: the sergeant walks down to it');
});

test('TORSTEN WALKS TO THE SLATE (band 8 §4, N10): the morning walk\'s stops are the trail\'s route points and the picket\'s own pins', () => {
  // composePoi's blit anchor for the fork: the 22x8 sketch is the
  // shelf (server/src/world/pois.test.ts's sentence: sketch column c
  // is world x = -161 + c), so the sketch's (0,0) lands at the golden
  // anchor (-150,-165) minus (11,4). The frame lane's FORK_FOOTPRINT
  // is the same box measured the other way, and its AT_POSTS are
  // derived from it plus the def's own offsets; the boxes must agree
  // or every offset below is a tile out (the review's finding 8).
  const shelf = POI_PREFABS.get('poi_fork_waystation')!;
  const ox = WARD.HAVEN.x - Math.floor(shelf.width / 2);
  const oy = WARD.HAVEN.y - Math.floor(shelf.height / 2);
  assert.equal(shelf.width, 22, 'the sketch is the shelf');
  assert.equal(ox, WARD.FORK_FOOTPRINT[0], 'the shelf\'s west edge is the frame lane\'s');
  assert.equal(oy, WARD.FORK_FOOTPRINT[1]);
  assert.equal(oy + shelf.height - 1, WARD.FORK_FOOTPRINT[3], 'and its south edge');
  const atRows = POI_DEFS.get('fork_waystation')!.actors!.filter((a) => a.at !== undefined);
  assert.deepEqual(atRows.map((a) => [ox + a.at!.dx, oy + a.at!.dy]), WARD.AT_POSTS.map((p) => [p[0], p[1]]), 'the frame lane\'s at posts are the composed cells');
  const row = POI_DEFS.get('fork_waystation')!.actors!.find((a) => a.pool[0] === 'waykeeper_torsten')!;
  const ax = ox + row.at!.dx;
  const ay = oy + row.at!.dy;
  assert.ok(ax >= -150 && ax <= -141 && ay === -165, `the post (${ax},${ay}) is in the mouth's Dirt row`);
  const def = ROUTINES.get('torsten_fork')!;
  const walk = def.slots![0]!.task;
  assert.ok(walk.kind === 'path' && walk.mode === 'once');
  const world = walk.waypoints.map((wp) => [ax + wp.x, ay + wp.y] as const);
  assert.ok(walk.waypoints.every((wp) => Math.abs(wp.x) <= 128 && Math.abs(wp.y) <= 128), 'every leg inside MAX_OFFSET');
  // Out: the trail's own route points (the bed by definition, read
  // from ROAD_ROUTES, never typed), then the bed cell nearest the
  // slate, then the slate's west cell; back the same way; home last.
  const isRoutePt = ([x, y]: readonly [number, number]): boolean => WARD.TRAIL_PTS.some((p) => p.x === x && p.y === y);
  for (const i of [0, 1, 2]) assert.ok(isRoutePt(world[i]!), `stop ${i} (${world[i]!.join(',')}) is a hunters' trail route point`);
  assert.deepEqual(world[0], [-136, -166], 'the trail\'s last leg, east of the mouth');
  assert.deepEqual(world[3], [WARD.PICKET_FLOOD_FROM[0], WARD.PICKET_FLOOD_FROM[1]], 'the bed cell nearest the slate');
  assert.deepEqual(world[4], [WARD.SLATE_STAND[0], WARD.SLATE_STAND[1]], 'the slate\'s west cell: the chalking stand');
  assert.deepEqual(world.slice(5, 8), world.slice(0, 3).reverse(), 'back the way he came');
  assert.deepEqual(world[8], [ax, ay], 'and home');
  // The slate is one east of the stand and he faces it; the stand is
  // the picket's own Dirt; the bench is nobody's stop (benchUnused).
  assert.equal(WARD.SLATE[0], WARD.SLATE_STAND[0] + 1);
  assert.equal(WARD.SLATE[1], WARD.SLATE_STAND[1]);
  assert.equal(walk.waypoints[4]!.dir, 0, 'facing east at the slate');
  assert.equal(walk.waypoints[4]!.work, true, 'chalking');
  const z = buildPicket();
  const at = (x: number, y: number): number | undefined => {
    const lx = x - z.origin.x;
    const ly = y - z.origin.y;
    return lx >= 0 && ly >= 0 && lx < z.width && ly < z.height ? z.ground[ly * z.width + lx] : undefined;
  };
  assert.equal(at(WARD.SLATE_STAND[0], WARD.SLATE_STAND[1]), Tile.Dirt, 'twenty two years of one man standing');
  assert.equal(at(WARD.SLATE[0], WARD.SLATE[1]), Tile.Signpost, 'THE TALLY');
  assert.equal(at(WARD.PICKET_FLOOD_FROM[0], WARD.PICKET_FLOOD_FROM[1]), TILE_SKIP, 'the bed is the carve\'s, never authored');
  for (const [x, y] of world) {
    assert.ok(!(x === WARD.BENCH[0] && y === WARD.BENCH[1]) && !(x === WARD.BENCH_STAND[0] && y === WARD.BENCH_STAND[1]), 'Torsten has never sat on it');
    const t = at(x, y);
    if (t === undefined || t === TILE_SKIP) continue;
    assert.ok(!TILE_DEFS[t as Tile].solid, `a stop at (${x},${y}) stands on open ground, not '${TILE_DEFS[t as Tile].name}'`);
  }
  // The worn line from the bed to the stand is Dirt where the picket
  // authors it (G2), so the last leg reads as his.
  for (let x = WARD.SLATE_LINE[0]![0]; x <= WARD.SLATE_STAND[0]; x++) assert.equal(at(x, WARD.SLATE_STAND[1]), Tile.Dirt, `the worn line at (${x},${WARD.SLATE_STAND[1]})`);
});

test('THE CUT\'S FURNITURE (band 8 §4.1, 0.2 K): the furniture under Bodil\'s and the fellers\' stops is the furniture the pins name', () => {
  const z = buildWardthread();
  const at = (x: number, y: number): number | undefined => {
    const lx = x - z.origin.x;
    const ly = y - z.origin.y;
    return lx >= 0 && ly >= 0 && lx < z.width && ly < z.height ? z.ground[ly * z.width + lx] : undefined;
  };
  const spawns = z.actorSpawns ?? [];
  const post = (def: RoutineDef, slot: number): { x: number; y: number } => {
    const t = def.slots![slot]!.task;
    assert.equal(t.kind, 'post');
    return t.kind === 'post' ? { x: t.x ?? 0, y: t.y ?? 0 } : { x: 0, y: 0 };
  };
  // BODIL at the sawhorse's south cell, facing north into it.
  const bodil = spawns.find((a) => a.actor === 'charter_bodil')!;
  assert.ok(bodil && bodil.routine === 'bodil_cut');
  const bx = Math.floor(bodil.x);
  const by = Math.floor(bodil.y);
  assert.deepEqual([bx, by], [WARD.POSTS.charter_bodil.x, WARD.POSTS.charter_bodil.y]);
  assert.equal(at(bx, by), Tile.Dirt, 'her stand is worn');
  assert.equal(at(bx, by - 1), Tile.Sawhorse, 'the sawhorse one north: the station her work post squares to');
  const routine = ROUTINES.get('bodil_cut')!;
  const sit = post(routine, 0);
  assert.equal(at(bx + sit.x, by + sit.y), Tile.Dirt, 'the noon sit is the wayside kind, on the yard\'s Dirt');
  assert.equal(at(bx + sit.x - 1, by + sit.y), Tile.Campfire, 'beside the fire, which she faces');
  const rope = routine.slots![1]!.task;
  assert.ok(rope.kind === 'path');
  const rx = bx + rope.waypoints[0]!.x;
  const ry = by + rope.waypoints[0]!.y;
  assert.equal(at(rx, ry - 1), Tile.RailWood, 'the rope one north of her count, which she faces');
  assert.ok(WARD.ROPE.some(([x, y]) => x === rx && y === ry - 1));
  assert.ok(Math.abs(rope.waypoints[0]!.dir! + Math.PI / 2) < 1e-3, 'facing north at the rope');
  const bed = post(routine, 3);
  assert.equal(at(bx + bed.x, by + bed.y), Tile.Bed, 'SLEEPER STAYS IN BED');
  assert.deepEqual([bx + bed.x, by + bed.y], [WARD.CAMP.bed[0], WARD.CAMP.bed[1]]);
  assert.equal(at(WARD.CAMP.leanTo[0], WARD.CAMP.leanTo[1]), Tile.LeanTo, 'the canvas over it');
  // THE FELLERS: two bodies, two routines (band 8 fix pass; THE POST
  // IS THE ORIGIN: the two beds lie at different offsets from the two
  // stands, so each post carries its own id), and each night stop is
  // a LIE that lands on a Bed at the camp — SLEEPER STAYS IN BED for
  // the whole crew. The Bedrolls that stood as declared wayside lies
  // are gone (the audit found both men sitting on the ground beside
  // them: a Bedroll is no seat kind). The face feller's own cell was
  // boxed by a stump, the thread and two cells the zone left to the
  // field; the fellers' walk (pins.FACE_WALK) wears the way west.
  const fellers = spawns.filter((a) => a.actor === 'charter_feller');
  assert.equal(fellers.length, 2);
  assert.deepEqual(fellers.map((f) => f.routine).sort(), ['feller_cut', 'feller_trunk_cut']);
  const bedsTaken = new Set<string>();
  for (const f of fellers) {
    const fr = ROUTINES.get(f.routine!)!;
    const night = post(fr, 2);
    const nightTask = fr.slots![2]!.task;
    assert.ok(nightTask.kind === 'post' && nightTask.lie === true, `${f.routine}: the night is a lie`);
    const wander = fr.slots![0]!.task;
    assert.ok(wander.kind === 'wander');
    const fx = Math.floor(f.x);
    const fy = Math.floor(f.y);
    assert.equal(at(fx, fy), Tile.Dirt, `a feller's stand at (${fx},${fy}) is worn`);
    const nx = fx + night.x;
    const ny = fy + night.y;
    assert.equal(at(nx, ny), Tile.Bed, `${f.routine}: the night lie at (${nx},${ny}) lands on a Bed`);
    assert.ok(WARD.CAMP.beds.some(([bx2, by2]) => bx2 === nx && by2 === ny), 'one of the camp\'s two frames');
    bedsTaken.add(`${nx},${ny}`);
    // The fire's ring or his own stand lies inside the noon circle.
    const cx = fx + (wander.x ?? 0) + 0.5;
    const cy = fy + (wander.y ?? 0) + 0.5;
    const nearFire = Math.hypot(WARD.CAMP.fire[0] + 0.5 - cx, WARD.CAMP.fire[1] + 0.5 - cy) <= wander.radius + 1;
    const nearPost = Math.hypot(fx + 0.5 - cx, fy + 0.5 - cy) <= wander.radius;
    assert.ok(nearFire || nearPost, `the noon drift at (${cx},${cy}) reaches the fire or the face`);
  }
  assert.equal(bedsTaken.size, 2, 'two men, two frames, nobody shares');
  // The way from the face to the fire is worn, so the sweep can read
  // the face feller's bed from his stand.
  for (const [x, y] of WARD.FACE_WALK) assert.equal(at(x, y), Tile.Dirt, `the fellers' walk at (${x},${y})`);
  // THE CIVILIAN WORD (0.2 K, as the validator allows it): friendly
  // bodies carry no combat body at all, so a wolf on the line cannot
  // see them and a swing passes through; `protection: invulnerable`
  // is a word for NEUTRAL bodies with a combat block (Torsten, the
  // sentinels) and the validator refuses it on a friendly def.
  for (const slug of ['charter_bodil', 'charter_feller']) {
    const a = NPC_ACTORS.get(slug)!;
    assert.ok(a, `${slug} missing`);
    assert.equal(a.disposition, 'friendly');
    assert.equal(a.protection, undefined);
    assert.equal(a.combat, undefined);
    const warded = validateNpcActor({ ...a, protection: 'invulnerable' });
    assert.ok(!warded.ok && warded.errors.some((e) => e.includes('friendly actors cannot carry protection')), 'the validator\'s own law');
  }
  const feller = NPC_ACTORS.get('charter_feller')!;
  assert.equal(feller.name, 'Feller');
  assert.equal(feller.title, 'Charter feller');
  assert.equal(feller.lines!.length, 3, 'the pool\'s three lines, place-neutral');
  assert.ok(feller.inventory!.some((s) => s.item === 'bronze_axe'), 'an axe in the pockets');
  for (const s of [NPC_ACTORS.get('waykeeper_torsten')!, NPC_ACTORS.get('even_sentinel')!]) {
    assert.equal(s.disposition, 'neutral');
    assert.equal(s.protection, 'invulnerable');
  }
  assert.ok(NPC_ACTORS.get('waykeeper_torsten')!.examine!.includes('the picket below is his slate and his bell'));
  // THE PEOPLE SPEAK: no dash of any kind in anything a player reads
  // that this band wrote or touched.
  const fork = POI_DEFS.get('fork_waystation')!;
  const spoken = [
    feller.name, feller.title!, feller.examine!, ...feller.lines!,
    NPC_ACTORS.get('charter_bodil')!.title!, NPC_ACTORS.get('waykeeper_torsten')!.examine!,
    fork.description!, ...fork.signs!.flatMap((s) => [s.title, ...(s.lines ?? [])]),
  ];
  for (const s of spoken) assert.ok(!/[-—–]/.test(s), `dash in a player string: ${s}`);
});
