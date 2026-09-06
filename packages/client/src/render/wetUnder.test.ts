import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Tile } from '@arx/shared';
import { WET_STANDERS, wetUnderGround } from './terrain.js';

/**
 * THE PROP STANDS IN WATER (contested lands band 7, site-grammar G-2)
 * — the parity of the water underlay, beside bridges.test's deck
 * laws. String-map worlds: G grass, D dirt, ~ water, s shallow, W deep,
 * F fence, C charter post, x scarecrow, T timber post, R rag stake,
 * I irrigation channel, undefined outside.
 */
function samplerOf(rows: string[]) {
  const chars: Record<string, Tile> = {
    G: Tile.Grass,
    D: Tile.Dirt,
    '~': Tile.Water,
    s: Tile.WaterShallow,
    W: Tile.WaterDeep,
    F: Tile.Fence,
    C: Tile.CharterPost,
    x: Tile.Scarecrow,
    T: Tile.TimberPost,
    R: Tile.RedRagStake,
    I: Tile.IrrigationChannel,
    w: Tile.CourseWall,
    K: Tile.CorbelCell,
    k: Tile.CorbelCell,
    p: Tile.PlumbStone,
  };
  return (tx: number, ty: number): number | undefined => {
    if (ty < 0 || ty >= rows.length || tx < 0) return undefined;
    const c = rows[ty]![tx];
    return c === undefined ? undefined : chars[c];
  };
}

test('the amphibious set is exactly the sixteen the site grammar names plus the Standing Course\'s four (9d E3)', () => {
  assert.deepEqual(
    [...WET_STANDERS].sort((a, b) => a - b),
    [
      Tile.Fence, Tile.FenceBroken, Tile.Scarecrow, Tile.CharterPost, Tile.RedRagStake,
      Tile.SluiceGate, Tile.SluiceGateStrung, Tile.TimberPost, Tile.RailWood, Tile.Dugout,
      Tile.TideTotem, Tile.WeirPanels, Tile.KeepPool, Tile.ReedShelter, Tile.IrrigationChannel,
      Tile.FelledLog,
      // THE STANDING COURSE (band 9d, E3): the Sett's wet floor and the meadow's sheet.
      Tile.CourseWall, Tile.CourseStile, Tile.CorbelCell, Tile.PlumbStone,
    ].sort((a, b) => a - b),
  );
});

test('THE NINTH COURSE (9d E3): a course wall with water on two cardinals stands in the shallows; a corbel cell half in the wet reads the water; a dry course keeps its floor', () => {
  // The Sinter's wet floor: the ninth course runs east to west through
  // the shallows with water north and south of every tile; run-mates
  // skipped; Drusa's cell at the run's east end has water south and
  // west and dry floor north and east (a tie goes to the water).
  const g = samplerOf([
    'sssssssss',
    'wwwwwwwwK', // y1: the ninth course, Drusa's cell at its east end
    'sssssssss',
    'DDDDDDDDD',
    'DDwDDkDDp', // y4: a dry course, a dry cell and a dry stone on the floor
    'DDDDDDDDD',
  ]);
  for (let x = 0; x <= 7; x++) assert.equal(wetUnderGround(g, x, 1), Tile.WaterShallow, `course x${x} stands in the water`);
  assert.equal(wetUnderGround(g, 8, 1), Tile.WaterShallow, 'the cell: water on two cardinals, run-mate west, floor east');
  assert.equal(wetUnderGround(g, 2, 4), null, 'a dry course keeps its floor (byte-identical bakes)');
  assert.equal(wetUnderGround(g, 5, 4), null, 'a dry cell keeps its floor');
  assert.equal(wetUnderGround(g, 8, 4), null, 'a dry stone keeps its floor');
});

test('a fence line written into a drowned row stands in the shallows, run-mates skipped', () => {
  // The drowned croft row: shallows above and below, the fence its own run.
  const g = samplerOf([
    'GGGGGGG',
    'sssssss',
    'CFFFFFC', // y2: the dike line, posts at both ends
    'sssssss',
    'GGGGGGG',
  ]);
  for (let x = 1; x <= 5; x++) assert.equal(wetUnderGround(g, x, 2), Tile.WaterShallow, `fence x${x}`);
  assert.equal(wetUnderGround(g, 0, 2), Tile.WaterShallow, 'the west post');
  assert.equal(wetUnderGround(g, 6, 2), Tile.WaterShallow, 'the east post');
});

test('a scarecrow to its waist and a mark-post in the channel read the water they stand in', () => {
  const g = samplerOf([
    'sssss',
    'ssxss', // the scarecrow, shallows all round
    'sssss',
    '~~~~~',
    '~~T~~', // the mark-post in open water
    '~~~~~',
    'WWWWW',
    'WWRWW', // a rag stake in the deep (never authored, but the depth law is the deck's)
    'WWWWW',
  ]);
  assert.equal(wetUnderGround(g, 2, 1), Tile.WaterShallow);
  assert.equal(wetUnderGround(g, 2, 4), Tile.Water);
  assert.equal(wetUnderGround(g, 2, 7), Tile.WaterDeep);
});

test('a dry ring falls through: the fence on the lawn keeps its lawn (byte-identical bakes)', () => {
  const g = samplerOf([
    'GGGGG',
    'GFFFG',
    'GGGGG',
  ]);
  for (let x = 1; x <= 3; x++) assert.equal(wetUnderGround(g, x, 1), null, `fence x${x} is dry`);
  // A fence on the bank with one lick of water diagonal to it is still on the bank.
  const bank = samplerOf([
    '~GGG',
    'GFGG',
    'GGGG',
  ]);
  assert.equal(wetUnderGround(bank, 1, 1), null, 'one diagonal lick never drowns a bank fence');
  // A trench cut across a stone yard is still a trench in the yard.
  const yard = samplerOf(['DDD', 'DID', 'DDD']);
  assert.equal(wetUnderGround(yard, 1, 1), null);
});

test('the bank stake: ties go to the water, a land majority stays land', () => {
  // Water on two cardinals, bank on two: the stake is in the shallows (the dike line's shore end).
  const tie = samplerOf([
    'GsG',
    'GCG',
    'GsG',
  ]);
  assert.equal(wetUnderGround(tie, 1, 1), Tile.WaterShallow, 'two and two is a wet stake');
  // Water on one cardinal, bank on three: the stake is planted on the bank.
  const shore = samplerOf([
    'GsG',
    'GCG',
    'GGG',
  ]);
  assert.equal(wetUnderGround(shore, 1, 1), null, 'one and three is a dry stake');
});

test('a fence mid-run with only run-mates beside it asks the diagonals', () => {
  const g = samplerOf([
    'sssss',
    'FFFFF', // a fence run across a pond, a cross-fence through it
    'ssFss',
    'ssFss',
  ]);
  // (2,1): W and E run-mates, S a run-mate, N shallow -> shallow by the cardinals.
  assert.equal(wetUnderGround(g, 2, 1), Tile.WaterShallow);
  // (2,2): N and S run-mates, W and E shallow -> shallow.
  assert.equal(wetUnderGround(g, 2, 2), Tile.WaterShallow);
  // A fence with run-mates on every cardinal reads the diagonals.
  const cross = samplerOf([
    'sFs',
    'FFF',
    'sFs',
  ]);
  assert.equal(wetUnderGround(cross, 1, 1), Tile.WaterShallow, 'the diagonals decide a fully joined cell');
  // A fully joined cell with unknown diagonals stays undecided.
  const blind = samplerOf(['F']);
  assert.equal(wetUnderGround(blind, 0, 0), null);
});
