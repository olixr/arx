import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHUNK_SIZE, Detail, TILE_DEFS, TILE_SKIP, TREE_TILES, Tile, tileIndex } from '@arx/shared';
import { generateChunk } from '../worldgen.js';
import { buildAshlamp } from './ashlamp.js';
import { buildAshlampWithRegistry } from './ashlamp/index.js';
import {
  bedUntouched,
  boxOverlaps,
  emberBedsOffAsh,
  occlusionViolations,
  padClear,
  shoulderListed,
  signPairViolations,
  skipRing,
  unreachableFloor,
} from './ashlamp/lint.js';
import { PINS } from './ashlamp/pins.js';
import { footprintViolations } from './lint/footprint.js';
import { zonePlacementErrors } from './validateZone.js';
import { zoneFromJson, zoneToJson } from './serialize.js';
import { ROAD_HALF, roadDistanceAt } from '../geography.js';
import { WORLD_SEED } from '../worldgen.js';

/**
 * THE ASHLAMP (contested lands, band 7; rulings R1): the threshold
 * scar on the First Road, an authored zone on the Dawnmead module
 * pattern. Every count below is the brief's §2.1 content list, which
 * R1 closed: nothing more stands here and nothing less.
 */
const count = (z: ReturnType<typeof buildAshlamp>, t: Tile): number => {
  let n = 0;
  for (const g of z.ground) if (g === t) n++;
  return n;
};
const at = (z: ReturnType<typeof buildAshlamp>, x: number, y: number): number =>
  z.ground[(y - z.origin.y) * z.width + (x - z.origin.x)]!;
const detailAt = (z: ReturnType<typeof buildAshlamp>, x: number, y: number): number =>
  z.detail[(y - z.origin.y) * z.width + (x - z.origin.x)]!;

test('ashlamp: the rect, the growth and the empty rosters are the brief\'s', () => {
  const z = buildAshlamp();
  assert.equal(z.id, 'ashlamp');
  assert.equal(z.name, 'The Ashlamp');
  assert.deepEqual({ x: z.origin.x, y: z.origin.y, w: z.width, h: z.height }, { x: 48, y: 92, w: 23, h: 19 });
  assert.equal(z.growth, 'wild', 'G-3: authored wilderness, untended');
  assert.equal(z.spawn, undefined, 'no spawn');
  assert.deepEqual(z.spawns ?? [], [], 'no spawn rows: nobody lives here');
  assert.deepEqual(z.actorSpawns ?? [], [], 'no bodies');
  assert.equal(z.chests, undefined, 'no chest');
});

test('ashlamp: THE CLOSED CONTENT LIST (R1) — the shell, the cold socket, the ember, the wain, the stake, the snag, one board', () => {
  const z = buildAshlamp();
  assert.equal(count(z, Tile.RuinWallStone), 17, 'the shell: a 7x5 ring less three breaches');
  assert.equal(count(z, Tile.LampPostDark), 1, "the order's lamp, cold");
  assert.equal(count(z, Tile.LampPost), 0, 'no warm lamp: the first dark place on the road');
  assert.equal(count(z, Tile.EmberBed), 1, 'ONE ember bed');
  assert.equal(count(z, Tile.CharredBeam), 2, 'the beams where the roof went');
  assert.equal(count(z, Tile.AshHeap), 1, 'the heap out the west breach');
  assert.equal(count(z, Tile.BelongingsCart), 1, 'the stalled Charter wain');
  assert.equal(count(z, Tile.CrateGoods), 1, 'its goods under tarp');
  assert.equal(count(z, Tile.Lectern), 1, "Margit's tally board");
  assert.equal(count(z, Tile.TrophyStake), 1, "Brede's stake, plain (R12)");
  assert.equal(count(z, Tile.DeadTree), 1, 'one snag on the skyline');
  assert.equal(count(z, Tile.Signpost), 1, 'one board per eyeful');
  assert.equal(count(z, Tile.SignpostBurnt), 0, 'A1 does not fold here (0.2 E)');
  assert.equal(count(z, Tile.GrassTall), 2, "the tufts at the ring's rim");
  // Where each stands, by the pins.
  assert.equal(at(z, PINS.LAMP[0], PINS.LAMP[1]), Tile.LampPostDark);
  assert.equal(at(z, PINS.EMBER[0], PINS.EMBER[1]), Tile.EmberBed);
  assert.equal(at(z, PINS.STAKE[0], PINS.STAKE[1]), Tile.TrophyStake);
  assert.equal(at(z, PINS.DEAD_TREE[0], PINS.DEAD_TREE[1]), Tile.DeadTree);
  // The snag stands in a felled pocket (fix pass 1): no living tree
  // inside DEAD_TREE_FELL or on the row east of the cart, so nothing
  // paints its crown over the one silhouette between the scar and the
  // waist. The fell writes Grass only where worldgen grew a tree; a
  // cell that was never a tree stays the field's own (TILE_SKIP), so
  // the read is against worldgen: no tree stands there either way.
  const field = (x: number, y: number): number => {
    const c = generateChunk(WORLD_SEED, Math.floor(x / CHUNK_SIZE), Math.floor(y / CHUNK_SIZE));
    return c.ground[tileIndex(x, y)]!;
  };
  let felled = 0;
  for (const r of [PINS.DEAD_TREE_FELL, ...PINS.DEAD_TREE_FELL_ROW]) {
    for (let y = r.y0; y <= r.y1; y++) {
      for (let x = r.x0; x <= r.x1; x++) {
        const t = at(z, x, y);
        if (t === TILE_SKIP) {
          assert.ok(!TREE_TILES.has(field(x, y) as Tile), `(${x},${y}) leaves a worldgen tree standing over the snag`);
        } else {
          assert.ok(t === Tile.DeadTree || !TREE_TILES.has(t as Tile), `(${x},${y}) carries a living tree over the snag`);
          if (t === Tile.Grass && TREE_TILES.has(field(x, y) as Tile)) felled++;
        }
      }
    }
  }
  assert.ok(felled >= 4, `the pocket felled real trees (${felled})`);
  // The wain keeps the two oaks it pulled in under, north-west of the cart on its row.
  for (const x of [65, 66]) assert.ok(TREE_TILES.has(field(x, 97) as Tile) && at(z, x, 97) === TILE_SKIP, `the wain stands under the oak at (${x},97) still`);
  // The ember on the north row, two open rows from the south wall that hid it.
  assert.deepEqual([...PINS.EMBER], [58, 94]);
  assert.equal(at(z, 58, 95), Tile.Dirt, 'open floor south of the pan');
  assert.equal(at(z, 58, 96), Tile.Dirt, 'open floor south of the pan');
  // The ember's own cell is bare dirt; the ash lies around it.
  assert.notEqual(detailAt(z, PINS.EMBER[0], PINS.EMBER[1]), Detail.Ash, 'the pan reads against the ash');
  assert.equal(at(z, PINS.WAIN.cart[0], PINS.WAIN.cart[1]), Tile.BelongingsCart);
  assert.equal(at(z, PINS.WAIN.foot[0], PINS.WAIN.foot[1]), Tile.Dirt, 'E5: the second foot is open ground');
  for (const [x, y] of PINS.BREACHES) assert.equal(at(z, x, y), Tile.Dirt, `breach (${x},${y}) is trodden, not wall`);
  // The floor under ash (J14) and the ember on its own ash (K1).
  for (let y = PINS.FLOOR.y0; y <= PINS.FLOOR.y1; y++) {
    for (let x = PINS.FLOOR.x0; x <= PINS.FLOOR.x1; x++) {
      if (at(z, x, y) === Tile.Dirt) assert.equal(detailAt(z, x, y), Detail.Ash, `floor (${x},${y}) under ash`);
    }
  }
  let ash = 0;
  for (const d of z.detail) if (d === Detail.Ash) ash++;
  assert.ok(ash >= 15 && ash <= 30, `the ash pan and its ragged ring, ${ash} cells`);
});

test('ashlamp: THE BOARD says only what it says', () => {
  const z = buildAshlamp();
  assert.equal(z.signs?.length, 1);
  const s = z.signs![0]!;
  assert.deepEqual([s.x, s.y, s.title, s.lines], [61, 99, 'THE ASHLAMP.', ['Struck.']]);
  for (const line of [s.title, ...(s.lines ?? [])]) {
    assert.ok(!/[-–—]/.test(line), `no dash in "${line}"`);
    assert.ok(/[.!?]$/.test(line), `"${line}" is a whole sentence`);
  }
});

test('ashlamp: THE FLOODS run clean (CURATION LAW 6) and the carve stays the field\'s', () => {
  const { zone: z, registry } = buildAshlampWithRegistry();
  assert.deepEqual(unreachableFloor(z, PINS.FLOOD_FROM), [], 'sealed pockets');
  assert.deepEqual(occlusionViolations(z, registry), [], 'the occlusion law');
  assert.deepEqual(signPairViolations(z), [], 'one Signpost per eyeful');
  assert.deepEqual(boxOverlaps(registry), [], 'scene boxes overlap');
  assert.deepEqual(emberBedsOffAsh(z), [], 'the pan reads against the ash, never under it (fix pass 1)');
  assert.deepEqual(skipRing(z), [], 'the border ring is the field\'s; no edge profile');
  assert.deepEqual(bedUntouched(z, PINS.BED_EXEMPT), [], 'the bed stays TILE_SKIP');
  assert.deepEqual(shoulderListed(z, PINS.SHOULDER_LISTED, PINS.BED_EXEMPT), [], 'every shoulder cell is listed');
  assert.deepEqual(padClear(z), [], 'G-12: no pinned footprint crowds the rect');
  assert.deepEqual(footprintViolations(z), [], 'E5: the wain\'s second foot');
  assert.deepEqual(zonePlacementErrors(z), [], 'the placement vet');
  // Nothing authored within ROAD_HALF of the wandered carve, ever.
  for (let ly = 0; ly < z.height; ly++) {
    for (let lx = 0; lx < z.width; lx++) {
      const x = z.origin.x + lx;
      const y = z.origin.y + ly;
      if (roadDistanceAt(WORLD_SEED, x, y) <= ROAD_HALF) {
        assert.equal(z.ground[ly * z.width + lx], TILE_SKIP, `(${x},${y}) is on the bed`);
      }
    }
  }
  // Two silhouettes at most beyond the shell: the wain and the snag
  // (the composed emptiness of the long dry begins at the rect's edge):
  // east of x 66 only the cart, its goods crate and the dead tree are solid.
  let solidEast = 0;
  for (let ly = 0; ly < z.height; ly++) {
    for (let lx = 0; lx < z.width; lx++) {
      const x = z.origin.x + lx;
      const t = z.ground[ly * z.width + lx]!;
      if (x > 66 && t !== TILE_SKIP && TILE_DEFS[t as Tile].solid) solidEast++;
    }
  }
  assert.equal(solidEast, 3, 'east of x 66 only the cart, the goods crate and the dead tree stand');
});

test('ashlamp: byte-identical across two builds and through JSON', () => {
  const a = buildAshlamp();
  const b = buildAshlamp();
  assert.deepEqual(a, b);
  const round = zoneFromJson(JSON.parse(JSON.stringify(zoneToJson(a))));
  assert.deepEqual(round.ground, a.ground);
  assert.deepEqual(round.detail, a.detail);
  assert.equal(round.growth, 'wild');
});
