import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHUNK_SIZE, TILE_SKIP, TREE_TILES, Tile } from '@arx/shared';
import {
  AUTHORED_GROWTH,
  DARK_BAND_Y,
  GROWTH,
  GROWTH_BARE,
  GROWTH_DRIFTED,
  GROWTH_SCAR,
  NODES_BY_TILE,
  bareRestFor,
  germEveryFor,
  projectGrowth,
  replaceGrowth,
  validateGrowth,
  type GrowthRow,
  type NodeDef,
  type ZoneDef,
} from '@arx/content';
import { GameServer } from '../game/gameServer.js';
import { config } from '../config.js';
import { WorldSource } from './worldSource.js';

/**
 * THE SECOND GROWTH Phases 1+2 (docs/second-growth-plan.md), pinned at
 * the server's seams: THE KEPT AND THE WILD domain router answers by
 * where the ground CAME FROM; the ensure() overlay serves the pure
 * projection (restarts included); the growth beat advances ages,
 * yields to claims, and never stands a tree up through a body; and
 * THE LIVING WOOD's law holds — time alone NEVER stands a tree: only
 * a germination roll against the standing world does, the dispersal
 * can hand a neighbor's species (which then rests as a drifted crown),
 * and the next felling re-aims at seed-truth. Prototype calls against
 * slates over a REAL WorldSource (the demolish/poiWard idiom).
 */

type Fn = (...a: unknown[]) => unknown;
const proto = GameServer.prototype as unknown as {
  tickGrowth: (now: number) => void;
  tickGermination: (now: number) => void;
  visitDormant: (seed: number, row: GrowthRow, now: number) => void;
  maybeWander: (row: GrowthRow, now: number) => boolean;
  fellWild: (tx: number, ty: number, node: NodeDef) => void;
};

const SEED = config.worldSeed;

function slate(world: WorldSource) {
  const patched: Array<{ tx: number; ty: number; tile: number }> = [];
  const saved: GrowthRow[] = [];
  const deleted: Array<[number, number]> = [];
  const s = {
    world,
    accounts: {
      saveGrowth: (r: GrowthRow) => saved.push({ ...r }),
      deleteGrowth: (tx: number, ty: number) => deleted.push([tx, ty]),
    },
    setWorldTile: (tx: number, ty: number, tile: Tile) => {
      world.setGround(tx, ty, tile);
      patched.push({ tx, ty, tile });
    },
    bodyOnTile: (() => false) as (tx: number, ty: number) => boolean,
    inClaimRing: (() => false) as (tx: number, ty: number) => boolean,
    growthRand: (() => 0.5) as () => number,
    tickGermination: proto.tickGermination,
    visitDormant: proto.visitDormant,
    maybeWander: proto.maybeWander,
    germCursor: 0,
    patched,
    saved,
    deleted,
  };
  return s;
}

/** Queue up dice for the germination visitor: roll, driftRoll, pickRoll. */
function queueRolls(s: ReturnType<typeof slate>, rolls: number[]): void {
  s.growthRand = () => (rolls.length > 0 ? rolls.shift()! : 0.5);
}

function fellAt(s: ReturnType<typeof slate>, tx: number, ty: number, tile: Tile): GrowthRow {
  s.world.ensure(Math.floor(tx / CHUNK_SIZE), Math.floor(ty / CHUNK_SIZE));
  (proto.fellWild as Fn).call(s, tx, ty, NODES_BY_TILE.get(tile)!);
  const row = s.world.growthAt(tx, ty);
  assert.ok(row, 'the felling must register a ledger row');
  return row!;
}

/**
 * Find WILD tiles whose worldgen seed-truth matches — scanned
 * chunk-by-chunk so the pristine memo stays warm.
 */
function findWildTruth(
  world: WorldSource,
  pred: (t: Tile) => boolean,
  count = 1,
): Array<{ tx: number; ty: number; tile: Tile }> {
  const out: Array<{ tx: number; ty: number; tile: Tile }> = [];
  for (let ccy = 0; ccy < 14; ccy++) {
    for (let ccx = 0; ccx < 14; ccx++) {
      for (let dy = 4; dy < CHUNK_SIZE - 4; dy++) {
        for (let dx = 4; dx < CHUNK_SIZE - 4; dx++) {
          const tx = ccx * CHUNK_SIZE + dx;
          const ty = ccy * CHUNK_SIZE + dy;
          const t = world.naturalGround(tx, ty) as Tile;
          if (pred(t) && world.growthDomainAt(tx, ty) === 'wild') {
            out.push({ tx, ty, tile: t });
            if (out.length >= count) return out;
          }
        }
      }
    }
  }
  if (out.length === 0) throw new Error('no wild truth match in the scan box');
  return out;
}

function findWildTree(world: WorldSource): { tx: number; ty: number; tile: Tile } {
  return findWildTruth(world, (t) => TREE_TILES.has(t))[0]!;
}

test('THE KEPT AND THE WILD: the domain router answers by ground provenance', () => {
  const size = 8 * 8;
  const ground = new Uint16Array(size).fill(Tile.Grass);
  ground[0] = TILE_SKIP; // origin cell is transparent
  const zone: ZoneDef = {
    id: 'growth_domain_test',
    name: 'Domain Test',
    origin: { x: 32, y: 32 },
    width: 8,
    height: 8,
    ground,
    detail: new Uint16Array(size),
  };
  const wildZone: ZoneDef = {
    ...zone,
    id: 'growth_domain_wild',
    origin: { x: 64, y: 32 },
    growth: 'wild',
  };
  const world = new WorldSource(SEED, [zone, wildZone]);
  assert.equal(world.growthDomainAt(36, 36), 'kept', 'authored zone ground is kept by default');
  assert.equal(world.growthDomainAt(32, 32), 'wild', 'a TILE_SKIP cell is transparent');
  assert.equal(world.growthDomainAt(200, 200), 'wild', 'raw worldgen ground is wild');
  assert.equal(world.growthDomainAt(68, 36), 'wild', 'the zone mark overrides the default');
  assert.equal(
    world.growthDomainAt(36, DARK_BAND_Y + 50),
    'kept',
    'the dark band answers to its own generators',
  );
});

test('the ensure() overlay serves the pure projection — restarts included', () => {
  const now = Date.now();
  const spot = findWildTree(new WorldSource(SEED, []));
  const fresh: GrowthRow = {
    tx: spot.tx,
    ty: spot.ty,
    tile: spot.tile,
    state: GROWTH_SCAR,
    since: now,
    due: null,
    owner: null,
    firstSeenAt: now,
  };
  const world = new WorldSource(SEED, []);
  world.registerGrowth(fresh);
  world.ensure(Math.floor(spot.tx / CHUNK_SIZE), Math.floor(spot.ty / CHUNK_SIZE));
  assert.equal(world.groundAt(spot.tx, spot.ty), Tile.Stump, 'a fresh scar generates as the stump');

  // The same row rehydrated after a three-month sleep: the chunk must
  // generate as DORMANT BARE GROUND — a tree needs the world's yes,
  // and a sleeping server never gave one.
  const old: GrowthRow = {
    ...fresh,
    since: now - 90 * 24 * 3_600_000,
    firstSeenAt: now - 90 * 24 * 3_600_000,
  };
  const world2 = new WorldSource(SEED, []);
  world2.registerGrowth(old);
  world2.ensure(Math.floor(spot.tx / CHUNK_SIZE), Math.floor(spot.ty / CHUNK_SIZE));
  assert.equal(
    world2.groundAt(spot.tx, spot.ty),
    projectGrowth(SEED, old, Date.now()).tile,
    'the overlay and the projection are the same truth',
  );
  assert.equal(world2.groundAt(spot.tx, spot.ty), Tile.Grass, 'ninety slept days leave bare ground');
});

test('felling wild ground writes the ledger, not the respawn queue', () => {
  const world = new WorldSource(SEED, []);
  const s = slate(world);
  const spot = findWildTree(world);
  const row = fellAt(s, spot.tx, spot.ty, spot.tile);
  assert.equal(world.groundAt(spot.tx, spot.ty), Tile.Stump, 'the scar stands at once');
  assert.equal(row.state, GROWTH_SCAR);
  assert.equal(row.tile, spot.tile, 'an honest felling aims at what stood');
  assert.ok(row.due !== null && row.due > row.since, 'the checkpoint carries an honest deadline');
  assert.equal(s.saved.length, 1, 'the harvest persists immediately');
});

test('the beat relaxes the scar to DORMANT bare — and time alone never sprouts it', () => {
  const world = new WorldSource(SEED, []);
  const s = slate(world);
  const spot = findWildTree(world);
  const row = fellAt(s, spot.tx, spot.ty, spot.tile);

  const t1 = row.due! + 1000;
  proto.tickGrowth.call(s, t1);
  assert.equal(row.state, GROWTH_BARE, 'the checkpoint advances to bare');
  assert.equal(row.due, null, 'and goes dormant — germination is the world’s call');
  assert.equal(world.groundAt(spot.tx, spot.ty), Tile.Grass, 'the ground follows');

  // Rolls always FAIL: however far the clock runs, no tree stands.
  queueRolls(s, []);
  s.growthRand = () => 0.9999;
  for (let i = 1; i <= 5; i++) {
    proto.tickGrowth.call(s, t1 + i * 30 * 24 * 3_600_000);
  }
  assert.equal(row.state, GROWTH_BARE, 'five months of failed rolls leave bare ground');
  assert.equal(world.groundAt(spot.tx, spot.ty), Tile.Grass);
});

test('THE REST FLOOR: bare ground may not even roll before the soil recovers', () => {
  const world = new WorldSource(SEED, []);
  const s = slate(world);
  const spot = findWildTree(world);
  const row = fellAt(s, spot.tx, spot.ty, spot.tile);
  proto.tickGrowth.call(s, row.due! + 1000);
  assert.equal(row.state, GROWTH_BARE);
  const floor = bareRestFor(SEED, spot.tx, spot.ty, row.firstSeenAt);
  queueRolls(s, [0, 0.99, 0.5]); // a roll that WOULD succeed
  proto.tickGrowth.call(s, row.since + floor - 60_000);
  assert.equal(row.due, null, 'before the floor no roll happens at all');
  proto.tickGrowth.call(s, row.since + floor + 60_000);
  assert.ok(row.due !== null, 'past the floor the same dice germinate the tile');
});

test('germination walks the tile to a clean heal when truth rises', () => {
  const world = new WorldSource(SEED, []);
  const s = slate(world);
  const spot = findWildTree(world);
  const row = fellAt(s, spot.tx, spot.ty, spot.tile);
  proto.tickGrowth.call(s, row.due! + 1000);
  const floor = bareRestFor(SEED, spot.tx, spot.ty, row.firstSeenAt);
  queueRolls(s, [0, 0.99, 0.5]); // germinate; refuse the drift — truth rises
  proto.tickGrowth.call(s, row.since + floor + 60_000);
  assert.ok(row.due !== null, 'the seed is in the ground');
  assert.equal(row.tile, spot.tile, 'the draw aimed at seed-truth');

  const sapDue = projectGrowth(SEED, row, row.due!).due!;
  proto.tickGrowth.call(s, row.due! + 1000);
  assert.ok(TREE_TILES.has(spot.tile), 'the walk is on a real tree');
  proto.tickGrowth.call(s, sapDue + 1000);
  assert.equal(world.growthAt(spot.tx, spot.ty), undefined, 'the healed deviation dissolves');
  assert.equal(world.groundAt(spot.tx, spot.ty), spot.tile, 'seed-truth stands back up');
  assert.ok(
    s.deleted.some(([tx, ty]) => tx === spot.tx && ty === spot.ty),
    'the row leaves the table',
  );
});

test('a drifted species rests as a crown, and the next felling re-aims at truth', () => {
  const world = new WorldSource(SEED, []);
  const s = slate(world);
  const spot = findWildTree(world);
  const row = fellAt(s, spot.tx, spot.ty, spot.tile);
  proto.tickGrowth.call(s, row.due! + 1000);
  assert.equal(row.state, GROWTH_BARE);
  // Hand the tile a drifted draw (the visitor's outcome, checkpointed):
  // a different species than seed-truth germinated here.
  const drifted = spot.tile === Tile.TreePine ? Tile.TreeOak : Tile.TreePine;
  row.tile = drifted;
  row.due = row.since + 60_000;
  const sapDue = projectGrowth(SEED, row, row.due).due!;
  proto.tickGrowth.call(s, row.due + 1000);
  proto.tickGrowth.call(s, sapDue + 1000);
  assert.equal(row.state, GROWTH_DRIFTED, 'a foreign crown rests as a drifted row');
  assert.equal(world.groundAt(spot.tx, spot.ty), drifted, 'the drifted species stands');
  assert.ok(world.growthAt(spot.tx, spot.ty) !== undefined, 'the row IS the tree’s memory');

  // Beats leave a drifted crown alone.
  const savedBefore = s.saved.length;
  proto.tickGrowth.call(s, sapDue + 90 * 24 * 3_600_000);
  assert.equal(row.state, GROWTH_DRIFTED);
  assert.equal(s.saved.length, savedBefore, 'at rest — no writes');

  // Felling the drifted crown re-aims the ground at seed-truth.
  const again = fellAt(s, spot.tx, spot.ty, drifted);
  assert.equal(again.tile, spot.tile, 'THE LAND REMEMBERS ITS NATURE — drift decays');
});

test("THE BUILDER'S CLEARING: germination waits at the fence, and on-tile claims end the row", () => {
  const world = new WorldSource(SEED, []);
  const s = slate(world);
  const spot = findWildTree(world);
  const row = fellAt(s, spot.tx, spot.ty, spot.tile);
  proto.tickGrowth.call(s, row.due! + 1000);
  const floor = bareRestFor(SEED, spot.tx, spot.ty, row.firstSeenAt);
  const every = germEveryFor(SEED, spot.tx, spot.ty, row.firstSeenAt);

  // A wall one tile away: the courtesy ring refuses the roll, but the
  // row survives — the forest waits at the fence.
  world.registerBuilt(spot.tx + 1, spot.ty, Tile.WoodFloor, 7, Tile.Grass);
  queueRolls(s, [0, 0.99, 0.5]);
  proto.tickGrowth.call(s, row.since + floor + 60_000);
  assert.equal(row.due, null, 'no germination against a built wall');
  assert.ok(world.growthAt(spot.tx, spot.ty) !== undefined, 'the row waits, never dropped');

  // The wall comes down: the next cadence window germinates.
  world.unregisterBuilt(spot.tx + 1, spot.ty);
  queueRolls(s, [0, 0.99, 0.5]);
  proto.tickGrowth.call(s, row.since + floor + every + 120_000);
  assert.ok(row.due !== null, 'the forest grows back the day the claim lapses');

  // A claimed yard refuses the same way (fresh ground, ring stubbed).
  const world2 = new WorldSource(SEED, []);
  const s2 = slate(world2);
  const spot2 = findWildTree(world2);
  const row2 = fellAt(s2, spot2.tx, spot2.ty, spot2.tile);
  proto.tickGrowth.call(s2, row2.due! + 1000);
  s2.inClaimRing = () => true;
  queueRolls(s2, [0, 0.99, 0.5]);
  proto.tickGrowth.call(
    s2,
    row2.since + bareRestFor(SEED, spot2.tx, spot2.ty, row2.firstSeenAt) + 60_000,
  );
  assert.equal(row2.due, null, 'no germination inside a claimed yard');
  assert.ok(world2.growthAt(spot2.tx, spot2.ty) !== undefined, 'the row waits at the ring too');
});

test('a tree never stands up through a body — the defer courtesy', () => {
  const world = new WorldSource(SEED, []);
  const s = slate(world);
  const spot = findWildTree(world);
  const row = fellAt(s, spot.tx, spot.ty, spot.tile);
  proto.tickGrowth.call(s, row.due! + 1000);
  row.due = row.since + 60_000; // germinated (checkpointed by hand)
  const sapDue = projectGrowth(SEED, row, row.due).due!;
  proto.tickGrowth.call(s, row.due + 1000); // the sapling stands (non-solid)
  s.bodyOnTile = () => true;
  const ripeAt = sapDue + 1000;
  proto.tickGrowth.call(s, ripeAt);
  assert.ok(world.growthAt(spot.tx, spot.ty) !== undefined, 'the blocked crown waits');
  assert.equal(row.deferUntil, ripeAt + 5000, 'the courtesy defer is stamped');
  s.bodyOnTile = () => false;
  proto.tickGrowth.call(s, ripeAt + 6000);
  assert.equal(world.groundAt(spot.tx, spot.ty), spot.tile, 'the tree stands once the way is clear');
});

test('the beat is budgeted in writes — a harvest heals as a drizzle', () => {
  const base = validateGrowth({});
  assert.ok(base.ok);
  if (!base.ok) return;
  replaceGrowth({ ...base.def, beatBudget: 2 });
  try {
    const world = new WorldSource(SEED, []);
    const s = slate(world);
    const herbs = findWildTruth(
      world,
      (t) => t === Tile.WildSagewort || t === Tile.WildMoonbell || t === Tile.FibrePlant,
      5,
    );
    assert.equal(herbs.length, 5, 'the scan box must hold five wild herbs');
    for (const h of herbs) fellAt(s, h.tx, h.ty, h.tile);
    s.growthRand = () => 0.99; // the meadow stays put — no wandering today
    const future = Date.now() + 30 * 24 * 3_600_000;
    proto.tickGrowth.call(s, future);
    assert.equal(s.deleted.length, 2, 'one beat lands exactly the budget');
    proto.tickGrowth.call(s, future);
    proto.tickGrowth.call(s, future);
    assert.equal(s.deleted.length, 5, 'later beats finish the job');
  } finally {
    replaceGrowth({ ...AUTHORED_GROWTH });
  }
});

test('THE QUICK MEADOW: a picked wild bush returns by succession, not the clock', () => {
  const world = new WorldSource(SEED, []);
  const s = slate(world);
  const spot = findWildTruth(world, (t) => t === Tile.BerryBush)[0]!;
  const row = fellAt(s, spot.tx, spot.ty, spot.tile);
  assert.equal(row.state, GROWTH_BARE, 'a picked bush starts DORMANT');
  assert.equal(row.due, null);
  assert.equal(world.groundAt(spot.tx, spot.ty), Tile.Grass, 'grass from the first moment');

  // Failed rolls: a month of clock and the ground is still grass.
  s.growthRand = () => 0.9999;
  const t1 = Date.now();
  proto.tickGrowth.call(s, t1 + 30 * 24 * 3_600_000);
  assert.equal(row.due, null, 'time alone never stands a bush either');

  // The world says yes: one germination roll, then the sprout deadline.
  queueRolls(s, [0]);
  const t2 = t1 + 30 * 24 * 3_600_000 + germEveryFor(SEED, spot.tx, spot.ty, row.firstSeenAt) + 1;
  proto.tickGrowth.call(s, t2);
  assert.ok(row.due !== null, 'the bush germinates against the standing world');
  proto.tickGrowth.call(s, row.due! + 1000);
  assert.equal(world.growthAt(spot.tx, spot.ty), undefined, 'truth heals clean — row dissolves');
  assert.equal(world.groundAt(spot.tx, spot.ty), Tile.BerryBush, 'the bush stands');
});

test('THE WANDERING PATCH: out with the pick, home with the next — and the ledger empties', () => {
  const world = new WorldSource(SEED, []);
  const s = slate(world);
  const spot = findWildTruth(
    world,
    (t) => t === Tile.WildSagewort || t === Tile.FibrePlant,
  )[0]!;
  const row = fellAt(s, spot.tx, spot.ty, spot.tile);

  // Ripe + a wander roll that succeeds: the patch surfaces on fresh
  // grass in reach, and the old ground seals (a drifted pair stands).
  queueRolls(s, [0, 0]); // wander roll, pool pick
  proto.tickGrowth.call(s, row.due! + 1000);
  const rows = [...world.growthLedger.values()];
  assert.equal(rows.length, 2, 'the wander leaves a sealed mouth and a standing patch');
  const stand = rows.find((r) => r.tile === spot.tile);
  const sealed = rows.find((r) => r.tile === Tile.Grass);
  assert.ok(stand && sealed, 'one resource, one seal — conservation by construction');
  assert.equal(sealed!.tx, spot.tx, 'the old ground sealed to grass');
  assert.equal(world.groundAt(stand!.tx, stand!.ty), spot.tile, 'the patch stands elsewhere');
  assert.equal(world.groundAt(spot.tx, spot.ty), Tile.Grass);
  const dist = Math.hypot(stand!.tx - spot.tx, stand!.ty - spot.ty);
  assert.ok(dist <= GROWTH.forageDriftReach, 'the wander respects its reach');

  // Pick the wandered patch: its wander HOMES to the sealed truth-site
  // and BOTH rows cancel — the meadow walks back to worldgen's truth.
  const again = fellAt(s, stand!.tx, stand!.ty, spot.tile);
  queueRolls(s, [0, 0]);
  proto.tickGrowth.call(s, again.due! + 1000);
  assert.equal(world.growthLedger.size, 0, 'full circle — the ledger is EMPTY');
  assert.equal(world.groundAt(spot.tx, spot.ty), spot.tile, 'truth stands at home');
  assert.equal(world.groundAt(stand!.tx, stand!.ty), Tile.Grass, 'the wander site healed to grass');
});

test('THE PATIENT STONE: a re-opening vein either heals home or migrates conserving ore', () => {
  const world = new WorldSource(SEED, []);
  const s = slate(world);
  const ores = new Set([
    Tile.RockCopper,
    Tile.RockTin,
    Tile.RockIron,
    Tile.RockCoal,
    Tile.RockSilver,
    Tile.RockGold,
  ]);
  const spot = findWildTruth(world, (t) => ores.has(t))[0]!;
  const row = fellAt(s, spot.tx, spot.ty, spot.tile);
  assert.equal(world.groundAt(spot.tx, spot.ty), Tile.RockDepleted, 'the spent rock stands');
  queueRolls(s, [0, 0]); // always try to wander
  proto.tickGrowth.call(s, row.due! + 1000);
  const rows = [...world.growthLedger.values()];
  if (rows.length === 0) {
    // No host rock in reach: the vein re-opened at its own mouth.
    assert.equal(world.groundAt(spot.tx, spot.ty), spot.tile, 'healed home');
  } else {
    // Migration: exactly one ore stands, exactly one mouth sealed.
    assert.equal(rows.length, 2, 'a wander is always a pair');
    const stand = rows.find((r) => r.tile === spot.tile)!;
    const sealed = rows.find((r) => r.tile === Tile.Rock)!;
    assert.ok(stand && sealed, 'one vein, one sealed mouth — ore is conserved');
    assert.equal(world.groundAt(stand.tx, stand.ty), spot.tile, 'the vein surfaced in the formation');
    assert.equal(world.groundAt(spot.tx, spot.ty), Tile.Rock, 'plain rock seals the old mouth');
  }
});

test('a dial edit re-aims live regrowth on the next beat (call-time reads)', () => {
  const world = new WorldSource(SEED, []);
  const s = slate(world);
  const row = fellAt(s, 230, 230, Tile.RockGold);
  const before = projectGrowth(SEED, row, row.since).due!;
  const base = validateGrowth({});
  assert.ok(base.ok);
  if (!base.ok) return;
  replaceGrowth({ ...base.def, oreReopenMinutes: [1, 1] });
  try {
    const after = projectGrowth(SEED, row, row.since).due!;
    assert.ok(after < before, 'the projection follows the live dial');
    assert.equal(after - row.since, 60_000, 'a one-minute vein re-opens in one minute');
    proto.tickGrowth.call(s, row.since + 61_000);
    assert.equal(world.groundAt(230, 230), Tile.RockGold, 'the beat lands the new clock');
  } finally {
    replaceGrowth({ ...AUTHORED_GROWTH });
  }
});