import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { Tile } from './tiles.js';
import { hashCoords } from '../math/rng.js';
import { findSeatNear, isSeatTile, pickSeatDir, seatAt, type SeatGround } from './seats.js';

/** A tiny world: a map of "x,y" → tile, everything else grass. */
function worldOf(tiles: Record<string, Tile>): SeatGround {
  return (x, y) => tiles[`${x},${y}`] ?? Tile.Grass;
}

test('every prop a body can physically sit or lie in answers the registry', () => {
  assert.ok(isSeatTile(Tile.Chair));
  assert.ok(isSeatTile(Tile.Bench));
  assert.ok(isSeatTile(Tile.Throne));
  assert.ok(isSeatTile(Tile.Bed));
  assert.ok(isSeatTile(Tile.ElvenDaybed));
  assert.ok(isSeatTile(Tile.ElvenChair));
  assert.ok(isSeatTile(Tile.ElvenBench));
  assert.ok(isSeatTile(Tile.StoneBench));
  assert.ok(isSeatTile(Tile.WoodStool));
  // Workbenches are stations, not seats — you stand at a fletcher's
  // bench, whatever its name says.
  assert.ok(!isSeatTile(Tile.CarvingBench));
  assert.ok(!isSeatTile(Tile.FletchersBench));
  assert.ok(!isSeatTile(Tile.Table));
  assert.ok(!isSeatTile(Tile.Grass));
  assert.ok(!isSeatTile(undefined));
});

test('the elven chair keeps its painted north back — no table turn', () => {
  // The painter draws the back north unconditionally, so the sim
  // must never turn the body sideways: a table east changes nothing.
  const seat = seatAt(worldOf({ '5,5': Tile.ElvenChair, '6,5': Tile.Table }), 5, 5)!;
  assert.equal(seat.kind, 'chair');
  assert.equal(seat.dir, Math.PI / 2);
  assert.equal(seatAt(worldOf({ '5,5': Tile.ElvenChair }), 5, 5)!.seatH, 0.36);
});

test('the elven bench and stone slab take the bench law; an elven table fixes them', () => {
  const free = seatAt(worldOf({ '5,5': Tile.StoneBench }), 5, 5)!;
  assert.equal(free.kind, 'bench');
  assert.equal(free.fixed, false);
  assert.equal(free.seatH, 0.3);
  const fixed = seatAt(worldOf({ '5,5': Tile.ElvenBench, '5,4': Tile.ElvenTable }), 5, 5)!;
  assert.equal(fixed.fixed, true);
  assert.equal(fixed.dir, -Math.PI / 2);
  assert.equal(fixed.seatH, 0.36);
});

test('the stool faces the table it serves and mirrors the painter’s height roll', () => {
  // A table north → the sitter faces it (back south → face north).
  const atTable = seatAt(worldOf({ '5,5': Tile.WoodStool, '5,4': Tile.Table }), 5, 5)!;
  assert.equal(atTable.kind, 'stool');
  assert.equal(atTable.dir, -Math.PI / 2);
  // Alone → the camera, like every seat.
  assert.equal(seatAt(worldOf({ '7,9': Tile.WoodStool }), 7, 9)!.dir, Math.PI / 2);
  // PARITY: seat height is the painter's own hash roll (salt 41).
  const h = hashCoords(41, 5, 5);
  assert.equal(atTable.seatH, 0.3 + ((h >>> 4) & 3) * 0.014);
});

test('the oak chair turns its back to the whole sit-at family (painter parity)', () => {
  // Table south → back north → the sitter faces south, at it.
  const seat = seatAt(worldOf({ '5,5': Tile.Chair, '5,6': Tile.Table }), 5, 5)!;
  assert.equal(seat.dir, Math.PI / 2);
  const east = seatAt(worldOf({ '5,5': Tile.Chair, '6,5': Tile.ElvenTable }), 5, 5)!;
  assert.equal(east.dir, 0); // faces east, at the elven table
});

test('the elven daybed lays a sleeper east-west, bolster west, uncovered', () => {
  // Painter parity: hw 0.58 → span 1.16, the leaf-green bolster at
  // the WEST end, deck lifted 0.3 — and the art hangs from the
  // tile's SOUTH edge, so the anchor rides south of a cot's.
  const seat = seatAt(worldOf({ '5,5': Tile.ElvenDaybed }), 5, 5)!;
  assert.equal(seat.kind, 'daybed');
  assert.equal(seat.pose, 'lie');
  assert.equal(seat.head, 'w');
  assert.equal(seat.span, 1.16);
  assert.equal(seat.seatH, 0.3);
  assert.equal(seat.ax, 5.5);
  assert.equal(seat.ay, 5.96);
  assert.deepEqual(seat.tiles, [{ x: 5, y: 5 }]);
});

test('a lone chair faces the camera (painter default back=n)', () => {
  const g = worldOf({ '5,5': Tile.Chair });
  const seat = seatAt(g, 5, 5)!;
  assert.equal(seat.kind, 'chair');
  assert.equal(seat.pose, 'sit');
  assert.equal(seat.dir, Math.PI / 2);
  assert.equal(seat.seatH, 0.34);
  assert.deepEqual(seat.tiles, [{ x: 5, y: 5 }]);
});

test('a chair turns its sitter to the table — all four sides', () => {
  // Table north → back south → face north.
  let seat = seatAt(worldOf({ '5,5': Tile.Chair, '5,4': Tile.Table }), 5, 5)!;
  assert.equal(seat.dir, -Math.PI / 2);
  // Table south → face south.
  seat = seatAt(worldOf({ '5,5': Tile.Chair, '5,6': Tile.Table }), 5, 5)!;
  assert.equal(seat.dir, Math.PI / 2);
  // Table east → face east (back west).
  seat = seatAt(worldOf({ '5,5': Tile.Chair, '6,5': Tile.Counter }), 5, 5)!;
  assert.equal(seat.dir, 0);
  // Table west → face west.
  seat = seatAt(worldOf({ '5,5': Tile.Chair, '4,5': Tile.Table }), 5, 5)!;
  assert.equal(seat.dir, Math.PI);
});

test('the chair scan priority matches the painter (north table wins)', () => {
  const seat = seatAt(
    worldOf({ '5,5': Tile.Chair, '5,4': Tile.Table, '6,5': Tile.Table }),
    5,
    5,
  )!;
  assert.equal(seat.dir, -Math.PI / 2);
});

test('a free bench seats either side by approach; a table fixes it', () => {
  const free = seatAt(worldOf({ '5,5': Tile.Bench }), 5, 5)!;
  assert.equal(free.fixed, false);
  // Walk up from the south → sit facing south.
  assert.equal(pickSeatDir(free, 5.5, 6.8), Math.PI / 2);
  // Walk up from the north → sit facing north.
  assert.equal(pickSeatDir(free, 5.5, 4.2), -Math.PI / 2);

  const fixed = seatAt(worldOf({ '5,5': Tile.Bench, '5,4': Tile.Table }), 5, 5)!;
  assert.equal(fixed.fixed, true);
  assert.equal(fixed.dir, -Math.PI / 2);
  // Approach can't turn a diner away from the table.
  assert.equal(pickSeatDir(fixed, 5.5, 6.8), -Math.PI / 2);
});

test('a bench flanked by tables both sides is free again', () => {
  const seat = seatAt(
    worldOf({ '5,5': Tile.Bench, '5,4': Tile.Table, '5,6': Tile.Table }),
    5,
    5,
  )!;
  assert.equal(seat.fixed, false);
});

test('the throne always faces the camera and sits highest', () => {
  const seat = seatAt(worldOf({ '5,5': Tile.Throne }), 5, 5)!;
  assert.equal(seat.kind, 'throne');
  assert.equal(seat.dir, Math.PI / 2);
  assert.ok(seat.seatH > 0.34 && seat.seatH > 0.36, 'crown furniture rides above common seats');
  // The sitter's anchor stays past the throne's sortY carve-out
  // (ty + 0.42) so the tall back paints behind the seated royal.
  assert.ok(seat.ay > 5.42);
});

test('a two-tile bed is ONE seat: both tiles answer with the whole run', () => {
  const g = worldOf({ '5,5': Tile.Bed, '5,6': Tile.Bed });
  const head = seatAt(g, 5, 5)!;
  const foot = seatAt(g, 5, 6)!;
  assert.equal(head.pose, 'lie');
  assert.equal(head.head, 'n');
  assert.deepEqual(head.tiles, [
    { x: 5, y: 5 },
    { x: 5, y: 6 },
  ]);
  // Tapping the foot tile lands the same anchor and claim.
  assert.deepEqual(foot.tiles, head.tiles);
  assert.equal(foot.ax, head.ax);
  assert.equal(foot.ay, head.ay);
  // The sleeper lies mid-deck, head north, FACE UP (the supine
  // figure's face points at the camera whatever way the bed runs).
  assert.equal(head.ay, 6.04);
  assert.equal(head.dir, Math.PI / 2);
  assert.ok(head.span! > 1.9, 'a double bed stretches the sleeper');
});

test('an east-west bed run is ONE full-length side-on bed', () => {
  const g = worldOf({ '5,5': Tile.Bed, '6,5': Tile.Bed, '7,5': Tile.WallStone });
  const west = seatAt(g, 5, 5)!;
  const east = seatAt(g, 6, 5)!;
  assert.equal(west.pose, 'lie');
  assert.equal(west.head, 'e');
  assert.deepEqual(west.tiles, [
    { x: 5, y: 5 },
    { x: 6, y: 5 },
  ]);
  // Both tiles answer with the same run, anchor mid-deck.
  assert.deepEqual(east.tiles, west.tiles);
  assert.equal(west.ax, 6);
  assert.equal(west.ay, 5.54);
  assert.ok(west.span! > 1.9, 'a two-tile run stretches the sleeper');
  // Head at the WEST wall when that end holds the wall instead.
  const g2 = worldOf({ '5,5': Tile.Bed, '6,5': Tile.Bed, '4,5': Tile.WallWood });
  assert.equal(seatAt(g2, 6, 5)!.head, 'w');
});

test('a north-south run outranks an east neighbor (parity priority)', () => {
  const g = worldOf({ '5,5': Tile.Bed, '5,6': Tile.Bed, '6,5': Tile.Bed });
  assert.equal(seatAt(g, 5, 5)!.head, 'n');
});

test('a lone bed against an east wall lies side-on, pillow east', () => {
  const g = worldOf({ '5,5': Tile.Bed, '6,5': Tile.WallStone });
  const seat = seatAt(g, 5, 5)!;
  assert.equal(seat.head, 'e');
  assert.equal(seat.dir, Math.PI / 2);
  assert.equal(seat.span, 0.92);
  assert.deepEqual(seat.tiles, [{ x: 5, y: 5 }]);
});

test('a lone bed with a north wall keeps the pillow north (painter priority)', () => {
  const g = worldOf({ '5,5': Tile.Bed, '5,4': Tile.WallWood, '4,5': Tile.WallWood });
  const seat = seatAt(g, 5, 5)!;
  assert.equal(seat.head, 'n');
});

test('non-furniture answers null', () => {
  assert.equal(seatAt(worldOf({}), 5, 5), null);
  assert.equal(seatAt(worldOf({ '5,5': Tile.Table }), 5, 5), null);
});

// ------------------------------------------------- THE LIVING ANCHOR

test('findSeatNear: the exact authored tile wins outright', () => {
  const g = worldOf({ '5,5': Tile.Chair, '6,5': Tile.Chair });
  const seat = findSeatNear(g, 5, 5, 'sit')!;
  assert.deepEqual(seat.tiles, [{ x: 5, y: 5 }]);
});

test('findSeatNear: pose intent is absolute — a lie stop walks past the chair to the bed', () => {
  // Chair ON the authored tile, bed two tiles east: a sleeper must
  // never perch on furniture of the wrong pose, however close.
  const g = worldOf({ '5,5': Tile.Chair, '7,5': Tile.Bed });
  const seat = findSeatNear(g, 5, 5, 'lie')!;
  assert.equal(seat.pose, 'lie');
  assert.deepEqual(seat.tiles, [{ x: 7, y: 5 }]);
  // And the mirror: a sit stop aimed at a bed finds the chair.
  const g2 = worldOf({ '5,5': Tile.Bed, '7,5': Tile.Chair });
  const sit = findSeatNear(g2, 5, 5, 'sit')!;
  assert.equal(sit.pose, 'sit');
  assert.deepEqual(sit.tiles, [{ x: 7, y: 5 }]);
});

test('findSeatNear: nearest matching piece wins, ring by ring', () => {
  const g = worldOf({ '8,5': Tile.Bed, '6,5': Tile.Bed });
  const seat = findSeatNear(g, 5, 5, 'lie')!;
  assert.deepEqual(seat.tiles, [{ x: 6, y: 5 }]);
  // Within one ring, euclidean distance breaks the tie: the cardinal
  // neighbor beats the diagonal. (Placed apart — adjacent beds would
  // lawfully merge into one run.)
  const g2 = worldOf({ '4,4': Tile.Bed, '5,6': Tile.Bed });
  assert.deepEqual(findSeatNear(g2, 5, 5, 'lie')!.tiles, [{ x: 5, y: 6 }]);
});

test('findSeatNear: the search honors its radius — the room next door stays private', () => {
  const g = worldOf({ '9,5': Tile.Bed });
  assert.equal(findSeatNear(g, 5, 5, 'lie'), null);
  assert.ok(findSeatNear(g, 5, 5, 'lie', 4));
});

test('findSeatNear: hitting any tile of a run answers the whole canonical run', () => {
  const g = worldOf({
    '5,4': Tile.Bed,
    '5,5': Tile.Bed,
    '5,3': Tile.WallStone,
  });
  // Authored at the foot neighbor: the ring finds a run tile, and the
  // spec is the same one seatAt derives — anchor mid-deck, both tiles.
  const seat = findSeatNear(g, 5, 6, 'lie')!;
  assert.equal(seat.tiles.length, 2);
  assert.equal(seat.ax, 5.5);
});
