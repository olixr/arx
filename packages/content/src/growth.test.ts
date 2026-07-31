import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Tile } from '@arx/shared';
import {
  AUTHORED_GROWTH,
  GROWTH,
  GROWTH_BARE,
  GROWTH_DRIFTED,
  GROWTH_SAPLING,
  GROWTH_SCAR,
  drawSpecies,
  germinationChance,
  growthDialectOf,
  growthTileForState,
  projectGrowth,
  validateGrowth,
  type GrowthRow,
} from './growth.js';
import { NODES } from './nodes.js';
import { zoneFromJson, zoneToJson } from './maps/serialize.js';
import type { ZoneDef } from './maps/types.js';

/**
 * THE SECOND GROWTH Phase 1 (docs/second-growth-plan.md), pinned:
 * the dial doc validates on the frontier skeleton with THE BACKFILL
 * LAW from day one; every depleting node speaks exactly one dialect;
 * and THE THREE AGES are a PURE walk — the same row and clock always
 * land on the same age, waits sit inside their authored bands, and a
 * checkpointed row walks to the identical future as a fresh one.
 */

const SEED = 1337;

function row(tile: Tile, tx: number, ty: number, since: number): GrowthRow {
  return {
    tx,
    ty,
    tile,
    state: GROWTH_SCAR,
    since,
    due: null,
    owner: null,
    firstSeenAt: since,
  };
}

test('the shipped dials satisfy their own validator', () => {
  const res = validateGrowth(AUTHORED_GROWTH);
  assert.ok(res.ok, res.ok ? '' : res.errors.join('; '));
});

test('THE BACKFILL LAW: an empty doc adopts every authored dial', () => {
  const res = validateGrowth({});
  assert.ok(res.ok, 'an empty doc must validate');
  if (!res.ok) return;
  assert.deepEqual(res.def, {
    ...AUTHORED_GROWTH,
    treeStumpMinutes: [...AUTHORED_GROWTH.treeStumpMinutes],
    treeBareMinutes: [...AUTHORED_GROWTH.treeBareMinutes],
    treeSaplingMinutes: [...AUTHORED_GROWTH.treeSaplingMinutes],
    oreReopenMinutes: [...AUTHORED_GROWTH.oreReopenMinutes],
    forageMinutes: [...AUTHORED_GROWTH.forageMinutes],
    germEveryMinutes: [...AUTHORED_GROWTH.germEveryMinutes],
    germSproutMinutes: [...AUTHORED_GROWTH.germSproutMinutes],
  });
});

test('present-but-malformed dials are refused; typos die loudly', () => {
  const inverted = validateGrowth({ treeBareMinutes: [500, 100] });
  assert.ok(!inverted.ok, 'an inverted band must be refused');
  const wrongType = validateGrowth({ beatTicks: 'fast' });
  assert.ok(!wrongType.ok, 'a string dial must be refused');
  const typo = validateGrowth({ treeStumpMinuets: [60, 150] });
  assert.ok(!typo.ok, 'an unknown key must be refused');
  assert.ok(
    !typo.ok && typo.errors.some((e) => e.includes('unknown dial')),
    'the refusal must name the unknown dial',
  );
});

test('ONE ENGINE, THREE DIALECTS: every depleting node speaks exactly one', () => {
  for (const node of NODES) {
    const dialect = growthDialectOf(node.tile);
    if (node.depletedTile === null) {
      assert.equal(dialect, null, `${node.name} never depletes and must have no dialect`);
      continue;
    }
    const expected =
      node.skill === 'woodcutting' ? 'tree' : node.skill === 'mining' ? 'ore' : 'forage';
    assert.equal(dialect, expected, `${node.name} must speak the ${expected} dialect`);
  }
  assert.equal(growthDialectOf(Tile.Grass), null, 'plain ground speaks no dialect');
});

test('THE THREE AGES: scar relaxes to DORMANT bare — time alone never stands a tree', () => {
  const t0 = 1_700_000_000_000;
  const r = row(Tile.TreeOak, 4213, 977, t0);

  const scar = projectGrowth(SEED, r, t0);
  assert.equal(scar.state, GROWTH_SCAR);
  assert.equal(scar.tile, Tile.Stump, 'the scar wears the stump');
  assert.ok(scar.due !== null && !scar.ripe, 'a fresh scar has a deadline');
  const stumpWait = scar.due! - t0;
  assert.ok(
    stumpWait >= GROWTH.treeStumpMinutes[0] * 60_000 &&
      stumpWait <= GROWTH.treeStumpMinutes[1] * 60_000,
    `stump wait ${stumpWait} must sit in the authored band`,
  );

  const bare = projectGrowth(SEED, r, scar.due!);
  assert.equal(bare.state, GROWTH_BARE);
  assert.equal(bare.tile, Tile.Grass, 'the stump relaxes to bare buildable grass');
  assert.equal(bare.due, null, 'bare ground is DORMANT — germination is a world event');
  assert.equal(bare.ripe, false);

  // A century of clock and the walk still waits at bare ground.
  const century = projectGrowth(SEED, r, t0 + 100 * 365 * 24 * 3_600_000);
  assert.equal(century.state, GROWTH_BARE);
  assert.equal(century.tile, Tile.Grass);
  assert.equal(century.ripe, false, 'THE WORLD DECIDES — the clock alone never does');
});

test('a germinated checkpoint walks bare -> sapling -> ripe crown', () => {
  const t0 = 1_700_000_000_000;
  const germDue = t0 + 3_600_000;
  const r: GrowthRow = {
    ...row(Tile.TreeOak, 4213, 977, t0),
    state: GROWTH_BARE,
    since: t0,
    due: germDue,
  };
  const waiting = projectGrowth(SEED, r, t0 + 60_000);
  assert.equal(waiting.state, GROWTH_BARE);
  assert.equal(waiting.due, germDue, 'the seed is in the ground, the deadline holds');

  const sapling = projectGrowth(SEED, r, germDue);
  assert.equal(sapling.state, GROWTH_SAPLING);
  assert.equal(sapling.tile, Tile.SaplingOak, 'the sapling keeps the drawn species');
  const saplingWait = sapling.due! - sapling.stateSince;
  assert.ok(
    saplingWait >= GROWTH.treeSaplingMinutes[0] * 60_000 &&
      saplingWait <= GROWTH.treeSaplingMinutes[1] * 60_000,
    'sapling wait must sit in the authored band',
  );

  const ripe = projectGrowth(SEED, r, sapling.due!);
  assert.equal(ripe.ripe, true, 'past the sapling the crown is ripe');
  assert.equal(ripe.tile, Tile.TreeOak, 'the crown wears the aimed species');
});

test('a drifted crown rests forever — only an axe moves it', () => {
  const t0 = 1_700_000_000_000;
  const r: GrowthRow = { ...row(Tile.TreePine, 11, 12, t0), state: GROWTH_DRIFTED };
  const rest = projectGrowth(SEED, r, t0 + 400 * 24 * 3_600_000);
  assert.equal(rest.state, GROWTH_DRIFTED);
  assert.equal(rest.tile, Tile.TreePine, 'the drifted species stands');
  assert.equal(rest.ripe, false, 'never ripe — the row IS the tree');
  assert.equal(rest.due, null);
});

test('ore and forage speak one long beat each', () => {
  const t0 = 1_700_000_000_000;
  const ore = row(Tile.RockGold, 5000, 300, t0);
  const oreScar = projectGrowth(SEED, ore, t0);
  assert.equal(oreScar.tile, Tile.RockDepleted);
  const oreWait = oreScar.due! - t0;
  assert.ok(
    oreWait >= GROWTH.oreReopenMinutes[0] * 60_000 &&
      oreWait <= GROWTH.oreReopenMinutes[1] * 60_000,
    'the vein re-opens inside the authored band',
  );
  const reopened = projectGrowth(SEED, ore, oreScar.due!);
  assert.equal(reopened.ripe, true, 'one beat and the vein stands');
  assert.equal(reopened.tile, Tile.RockGold);

  const bush = row(Tile.BerryBush, 700, 42, t0);
  const bushScar = projectGrowth(SEED, bush, t0);
  assert.equal(bushScar.tile, Tile.Grass, 'picked forage leaves bare grass');
  const back = projectGrowth(SEED, bush, bushScar.due!);
  assert.equal(back.ripe, true);
  assert.equal(back.tile, Tile.BerryBush);
});

test('the walk is deterministic and jittered per tile and per harvest', () => {
  const t0 = 1_700_000_000_000;
  const a1 = projectGrowth(SEED, row(Tile.Tree, 100, 100, t0), t0);
  const a2 = projectGrowth(SEED, row(Tile.Tree, 100, 100, t0), t0);
  assert.deepEqual(a1, a2, 'the same row and clock must answer identically');
  // Different harvests of the SAME tree draw different waits (the
  // firstSeenAt nonce) — pinned loosely: at least one of a spread of
  // re-fellings must differ, or the jitter is dead.
  const first = projectGrowth(SEED, row(Tile.Tree, 100, 100, t0), t0).due;
  let differs = false;
  for (let i = 1; i <= 8; i++) {
    const again = projectGrowth(SEED, row(Tile.Tree, 100, 100, t0 + i * 60_000), t0 + i * 60_000);
    if (again.due! - (t0 + i * 60_000) !== first! - t0) differs = true;
  }
  assert.ok(differs, 'refelling the same tree must re-deal its wait');
});

test('a checkpointed row walks to the same future as a fresh one', () => {
  const t0 = 1_700_000_000_000;
  const fresh = row(Tile.TreeYew, 8080, 512 - 40, t0);
  const scar = projectGrowth(SEED, fresh, t0);
  const bare = projectGrowth(SEED, fresh, scar.due!);
  // Advance the checkpoint the way the beat does, then ask about a
  // moment deep in the future from BOTH rows — the answers must agree
  // (both wait dormant at bare ground under the Phase 2 law).
  const advanced: GrowthRow = {
    ...fresh,
    state: bare.state,
    since: bare.stateSince,
    due: bare.due,
  };
  const deepFuture = t0 + 90 * 24 * 3_600_000;
  assert.deepEqual(
    projectGrowth(SEED, advanced, deepFuture),
    projectGrowth(SEED, fresh, deepFuture),
    'the checkpoint is bookkeeping, never a different truth',
  );
});

test('growthTileForState answers the stored age', () => {
  const t0 = 1_700_000_000_000;
  const r = row(Tile.TreePine, 61, 62, t0);
  assert.equal(growthTileForState(SEED, r), Tile.Stump);
  assert.equal(growthTileForState(SEED, { ...r, state: GROWTH_BARE }), Tile.Grass);
  assert.equal(growthTileForState(SEED, { ...r, state: GROWTH_SAPLING }), Tile.SaplingPine);
  assert.equal(
    growthTileForState(SEED, { ...r, state: GROWTH_DRIFTED, tile: Tile.TreeYew }),
    Tile.TreeYew,
    'a drifted crown is its own tile',
  );
});

test('THE FOREST GROWS FROM ITS EDGES: the chance is the wave', () => {
  assert.equal(
    germinationChance(0),
    GROWTH.pioneerChance,
    'zero crowns leaves only the pioneer whisper',
  );
  assert.ok(
    Math.abs(germinationChance(3) - (GROWTH.pioneerChance + 3 * GROWTH.sourceBoost)) < 1e-9,
    'each crown in reach boosts the roll',
  );
  assert.equal(germinationChance(1000), GROWTH.germChanceCap, 'the cap holds');
});

test('THE DISPERSAL DRAW aims at seed-truth and drifts only by chance', () => {
  const crowns = [Tile.TreePine, Tile.TreeOak, Tile.TreePine];
  assert.equal(
    drawSpecies(Tile.TreeOak, crowns, 0.99, 0.5, Tile.Tree),
    Tile.TreeOak,
    'past the drift chance the truth species rises',
  );
  assert.equal(
    drawSpecies(Tile.TreeOak, crowns, 0, 0, Tile.Tree),
    Tile.TreePine,
    'the drift roll hands a neighbor seed',
  );
  assert.equal(
    drawSpecies(Tile.TreeOak, [], 0, 0, Tile.Tree),
    Tile.TreeOak,
    'no neighbors means no drift, whatever the roll',
  );
  assert.equal(
    drawSpecies(null, [], 0.99, 0, Tile.Tree),
    Tile.Tree,
    'no truth and no neighbors falls back to the felled species',
  );
});

test('ZoneDef.growth rides serialization; the default stays absent', () => {
  const zone: ZoneDef = {
    id: 'growth_test',
    name: 'Growth Test',
    origin: { x: 0, y: 0 },
    width: 2,
    height: 2,
    ground: new Uint16Array([Tile.Grass, Tile.Grass, Tile.Grass, Tile.Grass]),
    detail: new Uint16Array(4),
    growth: 'wild',
  };
  const round = zoneFromJson(zoneToJson(zone));
  assert.equal(round.growth, 'wild', 'the wild mark must survive the round trip');
  const kept = zoneFromJson(zoneToJson({ ...zone, growth: undefined }));
  assert.equal(kept.growth, undefined, 'the default serializes as absent');
  assert.equal(
    zoneToJson({ ...zone, growth: undefined }).growth,
    undefined,
    'legacy files stay byte-identical',
  );
});
