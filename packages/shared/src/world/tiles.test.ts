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
  doorInfo,
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
