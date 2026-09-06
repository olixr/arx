import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BED_RUN_CAP, Tile, TILE_DEFS, TILE_SKIP, doorInfo, seatAt } from '@arx/shared';
import type { ZoneDef } from '../maps/types.js';
import { buildDawnmead } from '../maps/dawnmead.js';
import { buildAmberford } from '../maps/amberford.js';
import { buildSilverfall } from '../maps/silverfall.js';
import { buildSaltmere } from '../maps/saltmere.js';
import { buildPinewatch } from '../maps/pinewatch.js';
import { buildHartfell } from '../maps/hartfell.js';
import { buildKingsdelf } from '../maps/kingsdelf.js';
import { buildEvenfall } from '../maps/evenfall.js';
import { buildUndercroft } from '../maps/undercroft.js';
import { buildLowhall } from '../maps/lowhall.js';
import { buildAshlamp } from '../maps/ashlamp.js';
import { buildFenside } from '../maps/fenside.js';
import { buildPicket, buildTurnoff, buildWardthread } from '../maps/wardthread.js';
import { buildSett } from '../maps/sett.js';
import { ROUTINES } from './registry.js';
import type { RoutineTask, RoutineDef } from './types.js';

/**
 * THE SWEEP COMES HOME — the routine-waypoint world validator.
 *
 * Every town epic ran a "pre-validate sweep" (probe tool + BFS +
 * routine-waypoint check) as a throwaway script in the author's
 * hands: Amberford's law, Pinewatch's two pre-existing hits (Bram's
 * boom stop in pond water, Kettil's in the tally-shed wall). The
 * sweep caught real bugs every single time it ran — and it was never
 * committed, so every dressing pass since could silently strand a
 * sit stop on a moved chair. This file makes the sweep a standing
 * gate. What it holds, per placed routine, against the zone's own
 * grid:
 *
 *  - a `lie` stop lands ON a Tile.Bed (off a bed the runtime falls
 *    back to a floor sit in the open — never what the author meant);
 *  - a `sit` stop lands on real furniture, open ground (the wayside
 *    sit is authorable), or a solid tile with furniture beside it
 *    (THE FORGIVING TILE — the runtime probes the 8 neighbors);
 *  - no linger stop stands in pond water;
 *  - every target is REACHABLE from the placement: same walk
 *    component (doors count as walkable — the errand lane opens
 *    them; ramps bridge elevation exactly like the sim), with solid
 *    targets needing a cardinal-adjacent stand (the beside-stand
 *    arrive law) and seat/bed mounts an 8-neighbor stand;
 *  - a wander centre isn't sealed solid on all sides;
 *  - every routine id a placement names actually exists.
 *
 * A failure here is a body sitting tiles from its chair, lying on a
 * tavern floor, or snapped through a wall by the stuck watchdog —
 * the exact class of live regression this gate exists to end.
 */

const ZONES: Array<() => ZoneDef> = [
  buildDawnmead,
  buildAmberford,
  buildSilverfall,
  buildSaltmere,
  buildPinewatch,
  buildHartfell,
  buildKingsdelf,
  buildEvenfall,
  buildUndercroft,
  buildLowhall,
  // THE CONTESTED LANDS (band 7): the two east zones. The Ashlamp
  // places nobody; the Fen Waist places Ansel the drover, whose
  // wayside sit beside the cage and morning walk to nowhere are held
  // here like any villager's hours. The crofts' bodies are POI rows
  // and stand under pois/prefabFit.test.ts instead.
  buildAshlamp,
  buildFenside,
  // THE HUSK AND THE WARD LINE (band 8): the three north zones. The
  // picket and the turn place nobody (Torsten walks DOWN to his slate
  // from the fork rest's `at` post, held under pois/prefabFit.test.ts);
  // the ward line places Bodil and the two fellers, whose sawhorse
  // stand, wayside sit by the fire, rope count, bed under the canvas
  // and ground by the camp are held here like any villager's hours.
  // A cell the zone does not author is TILE_SKIP — the field's own
  // felled grass at the cut — and is unknowable here by the sweep's
  // own law: the face feller's cell is boxed by a stump, the thread
  // and two such cells, so every stop of his that the sweep CAN read
  // must be reachable from that box (feller_cut is authored to it).
  buildWardthread,
  buildPicket,
  buildTurnoff,
  // THE SETT (band 9d): the first sunk authored zone. Eleven actor
  // rows on the -1 ring and the -2 floor (Ammat on the lip at level
  // 0), every post read against the zone's own elev layer: the
  // sweep's flood crosses a level only over a Ramp tile, exactly the
  // sim's law, so a post sealed on the wrong side of a flight fails
  // here before a body ever stands mute at the bottom of a cliff.
  // The two wetsetters stand IN the authored WaterShallow on the
  // floor (a `post` stop with no sit/lie/work is lawful in water) and
  // Drusa's one loop (`dolmen_wet`) walks into the wet and back.
  // Vorl is a spawn row (no routine) and stands apart from the sweep.
  buildSett,
];

/**
 * Doors and gates the errand lane walks through: exactly the tiles
 * the runtime's openDoorsOnLane can work the latch on (doorInfo).
 */
const doorPass = (t: number): boolean => doorInfo(t) !== null;

interface Grid {
  z: ZoneDef;
  /** World-coord ground lookup; undefined outside the rect. */
  ground: (wx: number, wy: number) => number | undefined;
  /** Walk-component label per local tile; -1 = not standable. */
  comp: Int32Array;
  compAt: (wx: number, wy: number) => number;
  inRect: (wx: number, wy: number) => boolean;
}

function buildGrid(z: ZoneDef): Grid {
  const { width: w, height: h } = z;
  const local = (wx: number, wy: number): number =>
    (wy - z.origin.y) * w + (wx - z.origin.x);
  const inRect = (wx: number, wy: number): boolean =>
    wx >= z.origin.x && wy >= z.origin.y && wx < z.origin.x + w && wy < z.origin.y + h;
  const ground = (wx: number, wy: number): number | undefined =>
    inRect(wx, wy) ? z.ground[local(wx, wy)] : undefined;
  const lvl = (i: number): number => z.elev?.[i] ?? 0;
  const standable = (i: number): boolean => {
    const t = z.ground[i]! as Tile;
    // An authored zone's transparent cells (TILE_SKIP) are worldgen's
    // ground, unknowable here: never a stand, never a wall.
    if ((t as number) === TILE_SKIP) return false;
    return !TILE_DEFS[t].solid || doorPass(t);
  };
  // Label walk components: BFS floods with the sim's own movement law
  // (4-neighbor, elevation held level except across a Ramp tile).
  const comp = new Int32Array(w * h).fill(-1);
  let nextComp = 0;
  const queue: number[] = [];
  for (let seed = 0; seed < w * h; seed++) {
    if (comp[seed] !== -1 || !standable(seed)) continue;
    const label = nextComp++;
    comp[seed] = label;
    queue.length = 0;
    queue.push(seed);
    while (queue.length > 0) {
      const i = queue.pop()!;
      const x = i % w;
      const y = Math.floor(i / w);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const ni = ny * w + nx;
        if (comp[ni] !== -1 || !standable(ni)) continue;
        if (lvl(ni) !== lvl(i) && z.ground[i] !== Tile.Ramp && z.ground[ni] !== Tile.Ramp) {
          continue;
        }
        comp[ni] = label;
        queue.push(ni);
      }
    }
  }
  const compAt = (wx: number, wy: number): number =>
    inRect(wx, wy) ? comp[local(wx, wy)]! : -1;
  return { z, ground, comp, compAt, inRect };
}

interface Stop {
  wx: number;
  wy: number;
  sit: boolean;
  lie: boolean;
  work: boolean;
  label: string;
}

/** Flatten a task into its authored destinations, world coords. */
function stopsOf(task: RoutineTask, ax: number, ay: number, label: string): Stop[] {
  if (task.kind === 'post') {
    return [
      {
        wx: ax + (task.x ?? 0),
        wy: ay + (task.y ?? 0),
        sit: task.sit === true,
        lie: task.lie === true,
        work: task.work === true,
        label: `${label} post`,
      },
    ];
  }
  if (task.kind === 'path') {
    return task.waypoints.map((wp, i) => ({
      wx: ax + wp.x,
      wy: ay + wp.y,
      sit: wp.sit === true,
      lie: wp.lie === true,
      work: wp.work === true,
      label: `${label} wp${i}`,
    }));
  }
  return []; // wander re-rolls targets at runtime; the centre is checked apart
}

function checkRoutine(
  g: Grid,
  actor: string,
  def: RoutineDef,
  ax: number,
  ay: number,
  bad: string[],
): void {
  // The placement itself must offer a stand to measure everything from.
  const homeComp = ((): number => {
    const c = g.compAt(Math.floor(ax), Math.floor(ay));
    if (c !== -1) return c;
    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]] as const) {
      const n = g.compAt(Math.floor(ax) + dx, Math.floor(ay) + dy);
      if (n !== -1) return n;
    }
    return -1;
  })();
  if (homeComp === -1) {
    bad.push(`${actor} (${def.id}): the post itself at ${ax},${ay} offers no stand`);
    return;
  }

  const tasks: Array<{ task: RoutineTask; label: string }> = [
    { task: def.base, label: 'base' },
    ...(def.slots ?? []).map((s, i) => ({ task: s.task, label: `slot${i}[${s.from}-${s.to})` })),
  ];

  for (const { task, label } of tasks) {
    if (task.kind === 'wander') {
      // Mirror routineRollWander's own domain: rolled points land
      // within `radius` of the centre POINT, so the check is "does
      // any standable tile the roll could land in connect to the
      // post" — not the centre tile itself (a centre on the mess
      // table is lawful as long as the aisle is in reach).
      const ccx = ax + (task.x ?? 0);
      const ccy = ay + (task.y ?? 0);
      if (g.inRect(Math.floor(ccx), Math.floor(ccy))) {
        let open = false;
        const r = Math.ceil(task.radius);
        for (let dy = -r; dy <= r && !open; dy++) {
          for (let dx = -r; dx <= r && !open; dx++) {
            const tx2 = Math.floor(ccx) + dx;
            const ty2 = Math.floor(ccy) + dy;
            if (Math.hypot(tx2 + 0.5 - ccx, ty2 + 0.5 - ccy) > task.radius) continue;
            if (g.compAt(tx2, ty2) === homeComp) open = true;
          }
        }
        if (!open) {
          bad.push(
            `${actor} (${def.id}) ${label}: no reachable ground inside the wander circle at ` +
              `(${ccx},${ccy}) r${task.radius}`,
          );
        }
      }
      continue;
    }
    for (const stop of stopsOf(task, ax, ay, label)) {
      const tx = Math.floor(stop.wx);
      const ty = Math.floor(stop.wy);
      if (!g.inRect(tx, ty)) continue; // open-world leg — worldgen ground, unknowable here
      const t = g.ground(tx, ty)! as Tile;
      if ((t as number) === TILE_SKIP) continue; // a transparent cell of an authored zone: the field's own ground
      const solid = TILE_DEFS[t].solid && !doorPass(t);
      const where = `(${tx},${ty}) [local ${tx - g.z.origin.x},${ty - g.z.origin.y}] tile '${TILE_DEFS[t].name}'`;

      // The pond-water law: nobody's shift stands in the shallows.
      if ((stop.sit || stop.lie || stop.work) && t === Tile.WaterShallow) {
        bad.push(`${actor} (${def.id}) ${stop.label}: linger stop in pond water at ${where}`);
        continue;
      }

      const spec = seatAt(g.ground, tx, ty);
      if (stop.lie) {
        if (!spec || spec.pose !== 'lie') {
          bad.push(`${actor} (${def.id}) ${stop.label}: lie stop off a bed at ${where}`);
          continue;
        }
      } else if (stop.sit && !spec) {
        if (solid) {
          // THE FORGIVING TILE: the runtime probes the 8 neighbors of a
          // solid target for the furniture the author meant.
          const near = [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [-1, 1], [1, -1], [-1, -1]].some(
            ([dx, dy]) => seatAt(g.ground, tx + dx!, ty + dy!) !== null,
          );
          if (!near) {
            bad.push(
              `${actor} (${def.id}) ${stop.label}: sit stop on solid ${where} with no seat beside it`,
            );
            continue;
          }
        }
        // Open ground = the authorable wayside floor sit; lawful.
      }

      // Reachability, by the arrive law's own shape: an open target is
      // stood ON (same component as home); a solid target (station
      // addressing, furniture) is stood BESIDE (cardinal neighbor); a
      // mounted seat accepts any 8-neighbor stand within the mount's
      // linger reach.
      if (!solid) {
        if (g.compAt(tx, ty) !== homeComp) {
          bad.push(`${actor} (${def.id}) ${stop.label}: target ${where} unreachable from the post`);
        }
      } else {
        const ring = spec
          ? [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [-1, 1], [1, -1], [-1, -1]]
          : [[0, 1], [0, -1], [1, 0], [-1, 0]];
        const stand = ring.some(([dx, dy]) => g.compAt(tx + dx!, ty + dy!) === homeComp);
        if (!stand) {
          bad.push(
            `${actor} (${def.id}) ${stop.label}: solid target ${where} has no reachable stand beside it`,
          );
        }
      }
    }
  }
}

test('every placed routine fits the world it walks — the committed pre-validate sweep', () => {
  const bad: string[] = [];
  for (const build of ZONES) {
    const z = build();
    const spawns = (z.actorSpawns ?? []).filter((a) => a.routine);
    if (spawns.length === 0) continue;
    const g = buildGrid(z);
    for (const a of spawns) {
      const def = ROUTINES.get(a.routine!);
      if (!def) {
        bad.push(`${z.id}: ${a.actor} names unknown routine '${a.routine}'`);
        continue;
      }
      checkRoutine(g, `${z.id}/${a.actor}`, def, a.x, a.y, bad);
    }
  }
  assert.deepEqual(bad, [], `routine stops out of world fit:\n  ${bad.join('\n  ')}`);
});

test('no authored bed run outruns the registry cap — the parity law holds', () => {
  const bad: string[] = [];
  for (const build of ZONES) {
    const z = build();
    const at = (x: number, y: number): number | undefined =>
      x >= 0 && y >= 0 && x < z.width && y < z.height ? z.ground[y * z.width + x] : undefined;
    for (let y = 0; y < z.height; y++) {
      for (let x = 0; x < z.width; x++) {
        if (at(x, y) !== Tile.Bed) continue;
        // Count only from a run head so each run reports once.
        if (at(x - 1, y) !== Tile.Bed) {
          let len = 1;
          while (at(x + len, y) === Tile.Bed) len++;
          if (len > BED_RUN_CAP) bad.push(`${z.id}: E-W bed run of ${len} at (${x},${y})`);
        }
        if (at(x, y - 1) !== Tile.Bed) {
          let len = 1;
          while (at(x, y + len) === Tile.Bed) len++;
          if (len > BED_RUN_CAP) bad.push(`${z.id}: N-S bed run of ${len} at (${x},${y})`);
        }
      }
    }
  }
  assert.deepEqual(bad, [], `bed runs past BED_RUN_CAP:\n  ${bad.join('\n  ')}`);
});
