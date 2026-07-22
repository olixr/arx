import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  CHEST_TILES,
  DOOR_TILES,
  LIGHT_BLOCKING_TILES,
  WALL_RUN_TILES,
  Tile,
  chestInfo,
  closedChestTile,
  destructibleInfo,
  DESTRUCTIBLE_TILES,
  doorInfo,
  nearestFloorTile,
  openChestTile,
  openDoorTile,
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

test('non-door tiles report null', () => {
  assert.equal(doorInfo(Tile.WallWood), null);
  assert.equal(doorInfo(Tile.ArchStone), null);
  assert.equal(shutDoorTile(Tile.WallStone), null);
  assert.equal(openDoorTile(Tile.WallStone), null);
});

// ------------------------------------------------- destructible props

test('the six smashable props carry a break-up kind, respawn law, and durability', () => {
  const expect: Array<[Tile, string, number]> = [
    [Tile.Barrel, 'barrel', 1],
    [Tile.Crate, 'crate', 1],
    [Tile.CrateGoods, 'goods', 2],
    [Tile.Chair, 'chair', 1],
    [Tile.Table, 'table', 3],
    [Tile.Bench, 'bench', 2],
  ];
  assert.equal(DESTRUCTIBLE_TILES.size, expect.length);
  for (const [tile, kind, hits] of expect) {
    const info = destructibleInfo(tile);
    assert.equal(info?.kind, kind);
    // Durability is counted in HITS (scale-free): at least one, and
    // pinned per prop so a rebalance is a deliberate act.
    assert.equal(info!.hits, hits);
    assert.ok(info!.hits >= 1);
    // The absence must be worth enjoying, and never permanent.
    assert.ok(info!.respawnSec >= 120 && info!.respawnSec <= 600);
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
