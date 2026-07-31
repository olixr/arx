import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHUNK_SIZE, TILE_SKIP, Tile } from '@arx/shared';
import {
  AUTHORED_GROWTH,
  DARK_BAND_Y,
  GROWTH,
  GROWTH_BARE,
  GROWTH_SCAR,
  NODES_BY_TILE,
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
 * THE SECOND GROWTH Phase 1 (docs/second-growth-plan.md), pinned at
 * the server's seams: THE KEPT AND THE WILD domain router answers by
 * where the ground CAME FROM; the ensure() overlay serves the pure
 * projection so unloaded chunks (and restarts) are simply correct;
 * and the growth beat advances checkpoints, heals rows away, yields
 * to claims, and never stands a tree up through a body. The beat and
 * the felling run here as prototype calls against slates over a REAL
 * WorldSource (the demolish/poiWard idiom).
 */

type Fn = (...a: unknown[]) => unknown;
const proto = GameServer.prototype as unknown as {
  tickGrowth: (now: number) => void;
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
    patched,
    saved,
    deleted,
  };
  return s;
}

/** A wild spot away from every authored zone, above the dark band. */
const WX = 200;
const WY = 200;

function fellAt(s: ReturnType<typeof slate>, tx: number, ty: number, tile: Tile): GrowthRow {
  s.world.ensure(Math.floor(tx / CHUNK_SIZE), Math.floor(ty / CHUNK_SIZE));
  (proto.fellWild as Fn).call(s, tx, ty, NODES_BY_TILE.get(tile)!);
  const row = s.world.growthAt(tx, ty);
  assert.ok(row, 'the felling must register a ledger row');
  return row!;
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
  const fresh: GrowthRow = {
    tx: WX,
    ty: WY,
    tile: Tile.TreeOak,
    state: GROWTH_SCAR,
    since: now,
    due: null,
    owner: null,
    firstSeenAt: now,
  };
  const world = new WorldSource(SEED, []);
  world.registerGrowth(fresh);
  world.ensure(Math.floor(WX / CHUNK_SIZE), Math.floor(WY / CHUNK_SIZE));
  assert.equal(world.groundAt(WX, WY), Tile.Stump, 'a fresh scar generates as the stump');

  // The same row rehydrated after a three-month sleep: the chunk must
  // generate already healed — no beat, no catch-up pass.
  const old: GrowthRow = { ...fresh, since: now - 90 * 24 * 3_600_000, firstSeenAt: now - 90 * 24 * 3_600_000 };
  const world2 = new WorldSource(SEED, []);
  world2.registerGrowth(old);
  world2.ensure(Math.floor(WX / CHUNK_SIZE), Math.floor(WY / CHUNK_SIZE));
  assert.equal(
    world2.groundAt(WX, WY),
    projectGrowth(SEED, old, Date.now()).tile,
    'the overlay and the projection are the same truth',
  );
  assert.equal(world2.groundAt(WX, WY), Tile.TreeOak, 'ninety days heals an oak');
});

test('felling wild ground writes the ledger, not the respawn queue', () => {
  const world = new WorldSource(SEED, []);
  const s = slate(world);
  const row = fellAt(s, WX, WY, Tile.TreeOak);
  assert.equal(world.groundAt(WX, WY), Tile.Stump, 'the scar stands at once');
  assert.equal(row.state, GROWTH_SCAR);
  assert.ok(row.due !== null && row.due > row.since, 'the checkpoint carries an honest deadline');
  assert.equal(s.saved.length, 1, 'the harvest persists immediately');
});

test('the beat advances ages, catches up after sleeps, and heals rows away', () => {
  const world = new WorldSource(SEED, []);
  const s = slate(world);
  const row = fellAt(s, WX, WY, Tile.TreeOak);

  // Just past the scar's deadline: the stump relaxes to bare grass.
  const t1 = row.due! + 1000;
  proto.tickGrowth.call(s, t1);
  assert.equal(row.state, GROWTH_BARE, 'the checkpoint advances');
  assert.equal(world.groundAt(WX, WY), Tile.Grass, 'the ground follows');
  assert.ok(
    s.saved.some((r) => r.state === GROWTH_BARE),
    'the advanced checkpoint persists',
  );

  // A three-month sleep: one beat walks every remaining age and heals.
  proto.tickGrowth.call(s, t1 + 90 * 24 * 3_600_000);
  assert.equal(world.growthAt(WX, WY), undefined, 'the healed deviation dissolves');
  assert.equal(world.groundAt(WX, WY), Tile.TreeOak, 'seed-truth stands back up');
  assert.ok(
    s.deleted.some(([tx, ty]) => tx === WX && ty === WY),
    'the row leaves the table',
  );
});

test("THE BUILDER'S CLEARING: claimed ground ends the regrowth", () => {
  const world = new WorldSource(SEED, []);
  const s = slate(world);
  fellAt(s, WX + 10, WY, Tile.TreeOak);
  world.registerBuilt(WX + 10, WY, Tile.WoodFloor, 7, Tile.Grass);
  proto.tickGrowth.call(s, Date.now() + 400 * 24 * 3_600_000);
  assert.equal(world.growthAt(WX + 10, WY), undefined, 'the land yields to the hand that holds it');
  assert.ok(
    s.deleted.some(([tx]) => tx === WX + 10),
    'the yielded row leaves the table',
  );
  assert.ok(
    !s.patched.some((p) => p.tx === WX + 10 && p.tile === Tile.TreeOak),
    'no tree ever stomps the build',
  );
});

test('a tree never stands up through a body — the defer courtesy', () => {
  const world = new WorldSource(SEED, []);
  const s = slate(world);
  const row = fellAt(s, WX, WY + 10, Tile.Tree);
  s.bodyOnTile = () => true;
  const future = Date.now() + 400 * 24 * 3_600_000;
  proto.tickGrowth.call(s, future);
  assert.ok(world.growthAt(WX, WY + 10) !== undefined, 'the blocked heal waits');
  assert.equal(row.deferUntil, future + 5000, 'the courtesy defer is stamped');
  assert.equal(world.groundAt(WX, WY + 10), Tile.Stump, 'the ground holds');
  s.bodyOnTile = () => false;
  proto.tickGrowth.call(s, future + 6000);
  assert.equal(world.groundAt(WX, WY + 10), Tile.Tree, 'the tree stands once the way is clear');
});

test('the beat is budgeted in writes — a clearcut heals as a drizzle', () => {
  const base = validateGrowth({});
  assert.ok(base.ok);
  if (!base.ok) return;
  replaceGrowth({ ...base.def, beatBudget: 2 });
  try {
    const world = new WorldSource(SEED, []);
    const s = slate(world);
    for (let i = 0; i < 5; i++) fellAt(s, WX + i, WY + 20, Tile.BerryBush);
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

test('a dial edit re-aims live regrowth on the next beat (call-time reads)', () => {
  const world = new WorldSource(SEED, []);
  const s = slate(world);
  const row = fellAt(s, WX + 30, WY + 30, Tile.RockGold);
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
    assert.equal(world.groundAt(WX + 30, WY + 30), Tile.RockGold, 'the beat lands the new clock');
  } finally {
    replaceGrowth({ ...AUTHORED_GROWTH });
  }
});
