import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { Tile } from './tiles.js';
import { isSeatTile, pickSeatDir, seatAt, type SeatGround } from './seats.js';

/** A tiny world: a map of "x,y" → tile, everything else grass. */
function worldOf(tiles: Record<string, Tile>): SeatGround {
  return (x, y) => tiles[`${x},${y}`] ?? Tile.Grass;
}

test('seat tiles are exactly the four furniture kinds', () => {
  assert.ok(isSeatTile(Tile.Chair));
  assert.ok(isSeatTile(Tile.Bench));
  assert.ok(isSeatTile(Tile.Throne));
  assert.ok(isSeatTile(Tile.Bed));
  assert.ok(!isSeatTile(Tile.Table));
  assert.ok(!isSeatTile(Tile.Grass));
  assert.ok(!isSeatTile(undefined));
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
  // The sleeper lies mid-deck, head north.
  assert.equal(head.ay, 6.04);
  assert.equal(head.dir, -Math.PI / 2);
  assert.ok(head.span! > 1.9, 'a double bed stretches the sleeper');
});

test('a lone bed against an east wall lies side-on, pillow east', () => {
  const g = worldOf({ '5,5': Tile.Bed, '6,5': Tile.WallStone });
  const seat = seatAt(g, 5, 5)!;
  assert.equal(seat.head, 'e');
  assert.equal(seat.dir, 0);
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
