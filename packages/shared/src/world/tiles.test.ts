import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  CHEST_TILES,
  DIAG_WALL_TILES,
  DOOR_TILES,
  FENCE_TILES,
  GARRISON_TILES,
  INTERIOR_BOUNDARY_TILES,
  LIGHT_BLOCKING_TILES,
  WALL_RUN_TILES,
  Tile,
  chestInfo,
  closedChestTile,
  destructibleInfo,
  DESTRUCTIBLE_TILES,
  diagWallInfo,
  doorInfo,
  nearestFloorTile,
  openChestTile,
  openDoorTile,
  orientDiagFence,
  orientDiagWall,
  shutDoorTile,
  tileDef,
  type ChestKind,
} from './tiles.js';

const KINDS: readonly ChestKind[] = ['wood', 'mossy', 'iron', 'gilded', 'boss'];

test('every chest kind round-trips closed <-> open', () => {
  for (const kind of KINDS) {
    const closed = closedChestTile(kind);
    const open = openChestTile(kind);
    assert.notEqual(closed, open);
    assert.deepEqual(chestInfo(closed), { kind, open: false });
    assert.deepEqual(chestInfo(open), { kind, open: true });
    assert.ok(CHEST_TILES.has(closed));
    assert.ok(CHEST_TILES.has(open));
  }
});

test('chest tiles are solid props with defs', () => {
  for (const tile of CHEST_TILES) {
    const def = tileDef(tile);
    assert.ok(def.solid, `${def.name} must block movement`);
    assert.ok(def.raised, `${def.name} renders as a raised prop`);
  }
});

test('non-chest tiles report null', () => {
  assert.equal(chestInfo(Tile.BankChest), null);
  assert.equal(chestInfo(Tile.Crate), null);
});

test('every doorway round-trips open <-> shut', () => {
  for (const tile of DOOR_TILES) {
    const info = doorInfo(tile)!;
    const shut = shutDoorTile(tile)!;
    const open = openDoorTile(tile)!;
    assert.notEqual(shut, open);
    // Identity on the matching posture, counterpart on the other.
    assert.equal(info.open ? open : shut, tile);
    assert.deepEqual(doorInfo(shut), { ...info, open: false });
    assert.deepEqual(doorInfo(open), { ...info, open: true });
  }
});

test('door posture drives solidity and lamplight', () => {
  for (const tile of DOOR_TILES) {
    const info = doorInfo(tile)!;
    assert.equal(tileDef(tile).solid, !info.open, `${tileDef(tile).name} solidity`);
    if (info.material === 'fence') {
      // THE GATE CARVE-OUT: a fence gate rides the door machinery but
      // it is a waist-high slatted prop — never a wall member (a pen
      // must not become a "room") and never a lamplight blocker.
      assert.ok(!WALL_RUN_TILES.includes(tile), `${tileDef(tile).name} stays out of wall runs`);
      assert.ok(
        !LIGHT_BLOCKING_TILES.includes(tile),
        `${tileDef(tile).name} never blocks lamplight`,
      );
      continue;
    }
    if (info.material === 'garrison') {
      // THE SEPARATE-MASONRY LAW: the gatehouse belongs to the
      // garrison run family, never to building walls — and unlike a
      // fence gate its shut leaves are full-height lamplight mass.
      assert.ok(!WALL_RUN_TILES.includes(tile), `${tileDef(tile).name} stays out of wall runs`);
      assert.ok(GARRISON_TILES.has(tile), `${tileDef(tile).name} joins the garrison family`);
      assert.equal(
        LIGHT_BLOCKING_TILES.includes(tile),
        !info.open,
        `${tileDef(tile).name} lamplight`,
      );
      continue;
    }
    assert.equal(
      LIGHT_BLOCKING_TILES.includes(tile),
      !info.open,
      `${tileDef(tile).name} lamplight`,
    );
    // Open or shut, a doorway stays in its wall run — toggling must
    // never re-shape the building around it.
    assert.ok(WALL_RUN_TILES.includes(tile), `${tileDef(tile).name} joins wall runs`);
  }
});

test('fence family: gates round-trip and diagonals stay solid', () => {
  // The gate is a door of material 'fence' — the whole door pipeline
  // (interact, locks, occupancy, auto-close) serves it unchanged.
  assert.deepEqual(doorInfo(Tile.FenceGate), { material: 'fence', wide: false, open: true });
  assert.deepEqual(doorInfo(Tile.FenceGateShut), { material: 'fence', wide: false, open: false });
  assert.equal(shutDoorTile(Tile.FenceGate), Tile.FenceGateShut);
  assert.equal(openDoorTile(Tile.FenceGateShut), Tile.FenceGate);
  for (const tile of FENCE_TILES) {
    assert.ok(tileDef(tile).raised, `${tileDef(tile).name} renders raised`);
    // Only the open gate lets a body through.
    assert.equal(tileDef(tile).solid, tile !== Tile.FenceGate, `${tileDef(tile).name} solidity`);
  }
  // The 45° turn joins whichever diagonal already carries fencing.
  assert.equal(orientDiagFence(true, false, false, false), Tile.FenceDiagNE);
  assert.equal(orientDiagFence(false, false, false, true), Tile.FenceDiagNE);
  assert.equal(orientDiagFence(false, true, false, false), Tile.FenceDiagNW);
  assert.equal(orientDiagFence(false, false, true, false), Tile.FenceDiagNW);
  assert.equal(orientDiagFence(false, false, false, false), Tile.FenceDiagNE);
});

test('garrison family: the separate-masonry law holds', () => {
  // The whole family stands apart from building walls: no member
  // merges into a house run and none bounds an interior region —
  // a walled bailey is open sky, not a room.
  for (const tile of GARRISON_TILES) {
    assert.ok(!WALL_RUN_TILES.includes(tile), `${tileDef(tile).name} out of wall runs`);
    assert.ok(
      !INTERIOR_BOUNDARY_TILES.includes(tile),
      `${tileDef(tile).name} never encloses a room`,
    );
    // Only the open gate lets a body through the curtain.
    assert.equal(tileDef(tile).solid, tile !== Tile.GateGarrison, `${tileDef(tile).name} solidity`);
  }
  // Solid curtain mass blocks lamplight; the open passage spills it.
  assert.ok(LIGHT_BLOCKING_TILES.includes(Tile.WallGarrison));
  assert.ok(!LIGHT_BLOCKING_TILES.includes(Tile.GateGarrison));
  // The gate rides the door law, wide by construction, and
  // round-trips its postures.
  assert.deepEqual(doorInfo(Tile.GateGarrison), { material: 'garrison', wide: true, open: true });
  assert.equal(shutDoorTile(Tile.GateGarrison), Tile.GateGarrisonShut);
  assert.equal(openDoorTile(Tile.GateGarrisonShut), Tile.GateGarrison);
  // The 45° turns carry material + mass and auto-orient like every
  // diagonal wall — and they are diag-wall members (terrain's
  // exterior-ground rule and lamplight both key off that set).
  assert.deepEqual(diagWallInfo(Tile.WallGarrisonDiagSW), { material: 'garrison', mass: 'SW' });
  assert.ok(DIAG_WALL_TILES.has(Tile.WallGarrisonDiagNE));
  assert.equal(orientDiagWall('garrison', true, true, false, false), Tile.WallGarrisonDiagNE);
  assert.equal(orientDiagWall('garrison', false, false, true, true), Tile.WallGarrisonDiagSW);
});

test('non-door tiles report null', () => {
  assert.equal(doorInfo(Tile.WallWood), null);
  assert.equal(doorInfo(Tile.ArchStone), null);
  assert.equal(shutDoorTile(Tile.WallStone), null);
  assert.equal(openDoorTile(Tile.WallStone), null);
});

// ------------------------------------------------- destructible props

test('the smashable props carry a break-up kind, respawn law, and durability', () => {
  const expect: Array<[Tile, string, number]> = [
    [Tile.Barrel, 'barrel', 1],
    [Tile.Crate, 'crate', 1],
    [Tile.CrateGoods, 'goods', 2],
    [Tile.Chair, 'chair', 1],
    [Tile.Table, 'table', 3],
    [Tile.Bench, 'bench', 2],
    // The dungeon pair: bones scatter on a kick; the cracked wall is
    // the secret-door law — three blows open the hidden room.
    [Tile.BonePile, 'bonepile', 1],
    [Tile.CrackedCaveWall, 'crackedwall', 3],
  ];
  assert.equal(DESTRUCTIBLE_TILES.size, expect.length);
  for (const [tile, kind, hits] of expect) {
    const info = destructibleInfo(tile);
    assert.equal(info?.kind, kind);
    // Durability is counted in HITS (scale-free): at least one, and
    // pinned per prop so a rebalance is a deliberate act.
    assert.equal(info!.hits, hits);
    assert.ok(info!.hits >= 1);
    // The absence must be worth enjoying, and never permanent. The
    // cracked wall runs long on purpose: a found passage stays found
    // for the whole run (instances die before it restands).
    const cap = kind === 'crackedwall' ? 3600 : 600;
    assert.ok(info!.respawnSec >= 120 && info!.respawnSec <= cap);
    // Only SOLID clutter is smashable — bursting a walkable tile
    // would patch the floor out from under someone's feet.
    assert.ok(tileDef(tile).solid, `${tileDef(tile).name} is solid`);
  }
  // Bulk reads as bulk: the big joined table outlasts light clutter.
  assert.ok(destructibleInfo(Tile.Table)!.hits > destructibleInfo(Tile.Barrel)!.hits);
});

test('load-bearing scenery is not smashable', () => {
  for (const t of [Tile.WallWood, Tile.DoorwayWoodShut, Tile.ChestWood, Tile.Bed, Tile.Bookshelf]) {
    assert.equal(destructibleInfo(t), null);
  }
});

test('nearestFloorTile mirrors the underlay law: ring 1, ring 2, grass', () => {
  const world = (tiles: Record<string, Tile>) => (tx: number, ty: number) =>
    tiles[`${tx},${ty}`];
  // A neighboring floor wins outright.
  assert.equal(nearestFloorTile(world({ '0,1': Tile.WoodFloor }), 0, 0), Tile.WoodFloor);
  // A table ringed by its own chairs still finds the boards two out.
  assert.equal(
    nearestFloorTile(
      world({
        '0,1': Tile.Chair,
        '1,0': Tile.Chair,
        '-1,0': Tile.Chair,
        '0,-1': Tile.Chair,
        '0,2': Tile.StoneFloor,
      }),
      0,
      0,
    ),
    Tile.StoneFloor,
  );
  // Open air falls back to grass.
  assert.equal(nearestFloorTile(world({}), 0, 0), Tile.Grass);
});
