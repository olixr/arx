import assert from 'node:assert/strict';
import { test } from 'node:test';
import { TILE_DEFS, TILE_SKIP, Tile, doorInfo, seatAt } from '@arx/shared';
import { AUTHORED_WILD_SITES } from '../geography.js';
import { buildFenside } from '../maps/fenside.js';
import { PINS as FEN } from '../maps/fenside/pins.js';
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
