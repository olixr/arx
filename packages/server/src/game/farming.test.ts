import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  BRUSH_XP,
  COMPOST_MINUTES,
  CROP_BY_SEED,
  CROPS,
  LIVESTOCK,
  PRUNED_BIT,
  SOIL_ENRICHED,
  SOIL_RICH,
  SURFACE_PLANE_ID,
  WORK_RECIPES,
  growMs,
  harvestXp,
  stageEndMs,
} from '@arx/content';
import { PoseState, Tile } from '@arx/shared';
import * as farm from './farming.js';
import type { CropState, GameServer, LivestockComp, LivestockRow, NpcComp, PlayerComp } from './gameServer.js';
import { GameServer as GS } from './gameServer.js';
import { addItem, countItem, emptyInventory } from './inventory.js';
import { MILK_TICKS, MIN_GATHER_TICKS } from './tuning.js';

/**
 * THE TENDED EARTH'S CHARACTER (core audit 2026-09, Band A). The
 * farming module had zero coverage the day it was moved off the
 * class; this suite pins what it does TODAY — plant → tickCrops →
 * tickHarvest, the care fold, the bin, the manger, the yard, the
 * hive, the working station and the one care mirror — byte for
 * byte, so the next mover (or the next hand) is caught by a
 * witness. Every test calls the MODULE FUNCTION directly on a
 * hand-built slate; the class delegators it reaches back through
 * (cropElapsed, wellNear, livestockCountFor, the mirrors) are the
 * real prototype methods, bound onto the slate — THE STUB WINS THE
 * DOOR, so a family call still lands where the class says.
 */

type Fn = (...a: never[]) => unknown;
const proto = GS.prototype as unknown as Record<string, Fn>;

/** Run fn with a frozen wall clock. */
function withNow<T>(now: number, fn: () => T): T {
  const real = Date.now;
  Date.now = () => now;
  try {
    return fn();
  } finally {
    Date.now = real;
  }
}

/** Run fn with a scripted Math.random. */
function withRolls<T>(rolls: number[], fn: () => T): T {
  const real = Math.random;
  let i = 0;
  Math.random = () => rolls[Math.min(i++, rolls.length - 1)]!;
  try {
    return fn();
  } finally {
    Math.random = real;
  }
}

interface Msg {
  t: string;
  text?: string;
  [k: string]: unknown;
}

function farmSlate(opts: { characterId?: number; level?: number } = {}) {
  const wire: Array<{ sid: number; msg: Msg }> = [];
  const mkSession = (sid: number) => ({ sendJson: (m: Msg) => wire.push({ sid, msg: m }) });
  const session = mkSession(1);
  const other = mkSession(2);
  const ground = new Map<string, number>();
  const built = new Map<string, { owner: number }>();
  const registered: Array<[number, number, number | null]> = [];
  const tiles: Array<[string, number, number, number]> = [];
  const xp: Array<[string, number]> = [];
  const poses: number[] = [];
  const said: string[] = [];
  const drops: Array<[string, string, number, number, number]> = [];
  const db: string[] = [];
  const cancels: string[] = [];
  const destroyed: number[] = [];
  const metaUpdates: number[] = [];
  let nextEid = 100;
  const player = {
    characterId: opts.characterId ?? 7,
    name: 'Tess',
    inventory: emptyInventory(),
    skills: {},
    perks: { doubleHarvestChance: 0, seedRefundChance: 0, compostDiscount: 0, brushRestMult: 1 },
    session,
    action: null as null | Record<string, unknown>,
    procs: new Map(),
    equipment: {},
  };
  const pos = { plane: SURFACE_PLANE_ID, x: 10.5, y: 10.5, dir: 0 };
  const srv = {
    sessions: new Set([session, other]),
    players: new Map<number, unknown>([[1, player]]),
    positions: new Map<number, { plane: string; x: number; y: number; dir: number }>([[1, pos]]),
    poses: new Map<number, number>(),
    crops: new Map<string, CropState>(),
    farmBins: new Map(),
    farmTroughs: new Map(),
    farmJobs: new Map(),
    farmApiaries: new Map(),
    livestock: new Map<number, LivestockComp>(),
    npcs: new Map<number, Record<string, unknown>>(),
    tickCount: 500,
    surface: {
      groundAt: (x: number, y: number) => ground.get(`${x},${y}`),
      builtAt: (x: number, y: number) => built.get(`${x},${y}`),
      ensure: () => ({}),
      registerCropTile: (x: number, y: number, t: number) => registered.push([x, y, t]),
      unregisterCropTile: (x: number, y: number) => registered.push([x, y, null]),
    },
    // Every ledger write is recorded by name — the suite pins that
    // the row is saved, not what the store does with it.
    accounts: new Proxy({} as Record<string, Fn>, {
      get: (_t, k) => (...a: unknown[]) => db.push(`${String(k)}(${a.map(String).join(',')})`),
    }),
    grantXp: (_e: number, _p: unknown, skill: string, amt: number) => xp.push([skill, amt]),
    setPose: (_e: number, pose: number) => poses.push(pose),
    setWorldTile: (p: string, x: number, y: number, t: number) => tiles.push([p, x, y, t]),
    speak: (_p: unknown, _short: string, long: string) => said.push(long),
    spawnDrop: (p: string, item: string, qty: number, x: number, y: number) => drops.push([p, item, qty, x, y]),
    effectiveLevel: () => opts.level ?? 99,
    cancelAction: (_e: number, p: { action: unknown }, why?: string) => {
      p.action = null;
      cancels.push(why ?? '');
    },
    bodyMoment: () => 0,
    gatherSpeedOf: () => 1,
    plantWild: () => said.push('wild'),
    broadcastMetaUpdate: (e: number) => metaUpdates.push(e),
    removeFromChunks: () => {},
    ecs: { destroy: (e: number) => destroyed.push(e) },
    spawnNpc: (def: { id: string }, plane: string, x: number, y: number) => {
      const eid = nextEid++;
      srv.npcs.set(eid, { def, nextProduceAt: 0, nextLayAt: 1 });
      srv.positions.set(eid, { plane, x, y, dir: 0 });
      return eid;
    },
    // The family's own doors, real: THE STUB WINS THE DOOR.
    cropElapsed: proto.cropElapsed,
    refuseFarmingOffSurface: proto.refuseFarmingOffSurface,
    livestockCountFor: proto.livestockCountFor,
    livestockAtTrough: proto.livestockAtTrough,
    saveCrop: proto.saveCrop,
    mirrorPlot: proto.mirrorPlot,
    mirrorBin: proto.mirrorBin,
    mirrorJob: proto.mirrorJob,
    mirrorApiary: proto.mirrorApiary,
    mirrorTrough: proto.mirrorTrough,
    waterCrop: proto.waterCrop,
    irrigatedAt: proto.irrigatedAt,
    spawnLivestockEntity: proto.spawnLivestockEntity,
    wellNear: (): boolean => false,
  };
  const s = srv as unknown as GameServer;
  const sys = (wireSid = 1) =>
    wire.filter((w) => w.sid === wireSid && w.msg.t === 'chat').map((w) => w.msg.text);
  const farmMsgs = (wireSid = 1) => wire.filter((w) => w.sid === wireSid && w.msg.t === 'farm').map((w) => w.msg);
  return {
    s,
    srv,
    player: player as unknown as PlayerComp,
    raw: player,
    pos,
    ground,
    built,
    wire,
    sys,
    farmMsgs,
    registered,
    tiles,
    xp,
    poses,
    said,
    drops,
    db,
    cancels,
    destroyed,
    metaUpdates,
  };
}

const T0 = 1_000_000_000_000;
const carrot = CROP_BY_SEED.get('carrot_seed')!;
const plum = CROP_BY_SEED.get('plum_sapling')!;
const palegill = CROP_BY_SEED.get('palegill_spores')!;

/** Plant a carrot at (10,10) at T0 and hand back its row. */
function plantedCarrot(f: ReturnType<typeof farmSlate>, framed = false): CropState {
  f.ground.set('10,10', framed ? Tile.GrowingFrame : Tile.Tilled);
  addItem(f.raw.inventory, 'carrot_seed', 1);
  withNow(T0, () => farm.plant(f.s, 1, 10, 10, 'carrot_seed'));
  return f.srv.crops.get('10,10')!;
}

// ---- plant --------------------------------------------------------------

test('plant: a guest is refused in the exact words and keeps the seed', () => {
  const f = farmSlate({ characterId: -1 });
  f.ground.set('10,10', Tile.Tilled);
  addItem(f.raw.inventory, 'carrot_seed', 1);
  farm.plant(f.s, 1, 10, 10, 'carrot_seed');
  assert.deepEqual(f.sys(), ['Guests cannot plant crops — make an account!']);
  assert.equal(countItem(f.raw.inventory, 'carrot_seed'), 1);
  assert.equal(f.srv.crops.size, 0);
});

test('plant: out of arm\'s reach is a silent no; off the surface speaks the sunless line', () => {
  const f = farmSlate();
  f.ground.set('20,20', Tile.Tilled);
  addItem(f.raw.inventory, 'carrot_seed', 1);
  farm.plant(f.s, 1, 20, 20, 'carrot_seed');
  assert.deepEqual(f.wire, []);
  f.pos.plane = 'rift:3';
  f.ground.set('10,10', Tile.Tilled);
  farm.plant(f.s, 1, 10, 10, 'carrot_seed');
  assert.deepEqual(f.said, ['Nothing grows here — no sun ever reaches this ground.']);
  assert.equal(countItem(f.raw.inventory, 'carrot_seed'), 1);
});

test('plant: THE BED LAW — soil for seeds, a log for spores, open sky for a tree', () => {
  const f = farmSlate();
  addItem(f.raw.inventory, 'carrot_seed', 1);
  addItem(f.raw.inventory, 'palegill_spores', 1);
  addItem(f.raw.inventory, 'plum_sapling', 1);
  f.ground.set('10,10', Tile.Grass);
  farm.plant(f.s, 1, 10, 10, 'carrot_seed');
  assert.deepEqual(f.said, ['Seeds need a tilled garden plot.']);
  f.ground.set('10,10', Tile.Tilled);
  farm.plant(f.s, 1, 10, 10, 'palegill_spores');
  f.ground.set('10,10', Tile.GrowingFrame);
  farm.plant(f.s, 1, 10, 10, 'plum_sapling');
  assert.deepEqual(f.sys(), ['Spores want a laid mushroom log.', 'A tree wants open sky, not a frame.']);
  assert.equal(f.srv.crops.size, 0);
  assert.equal(countItem(f.raw.inventory, 'carrot_seed') + countItem(f.raw.inventory, 'palegill_spores') + countItem(f.raw.inventory, 'plum_sapling'), 3);
});

test('plant: the level gate speaks through speak() with the crop\'s own name', () => {
  const f = farmSlate({ level: 1 });
  f.ground.set('10,10', Tile.Tilled);
  addItem(f.raw.inventory, 'plum_sapling', 1);
  farm.plant(f.s, 1, 10, 10, 'plum_sapling');
  assert.deepEqual(f.said, ['You need farming level 30 to plant plum tree.']);
  assert.equal(countItem(f.raw.inventory, 'plum_sapling'), 1);
});

test('plant: a carrot goes in — row shape, sprout tile, a quarter of the XP, the Gather beat, the spoken minutes', () => {
  const f = farmSlate();
  const state = plantedCarrot(f);
  assert.equal(countItem(f.raw.inventory, 'carrot_seed'), 0);
  const { def, ...row } = state;
  assert.equal(def, carrot);
  assert.deepEqual(row, {
    tx: 10, ty: 10, plantedAt: T0, boostMs: 0, watered: 0, owner: 7, lastStage: 0, soil: 0, mulched: 0, framed: 0, cycles: 0,
  });
  assert.deepEqual(f.registered, [[10, 10, Tile.CropSprout]]);
  assert.deepEqual(f.tiles, [[SURFACE_PLANE_ID, 10, 10, Tile.CropSprout]]);
  assert.deepEqual(f.xp, [['farming', 20]]);
  assert.deepEqual(f.poses, [PoseState.Gather]);
  assert.deepEqual(f.db, ['upsertCrop(10,10,carrot,1000000000000,0,0,7,0,0,0,0)']);
  assert.deepEqual(f.sys(), ['You plant carrot. Ready in about 8 min.']);
  // An unframed row carries no care facts yet: no plot mirror.
  assert.deepEqual(f.farmMsgs(), []);
  assert.deepEqual(f.farmMsgs(2), []);
  // The plot is taken: a second seed stays in the pack, silently.
  addItem(f.raw.inventory, 'carrot_seed', 1);
  farm.plant(f.s, 1, 10, 10, 'carrot_seed');
  assert.equal(countItem(f.raw.inventory, 'carrot_seed'), 1);
});

test('plant: a growing frame marks the row framed and mirrors it to every session at once', () => {
  const f = farmSlate();
  const state = plantedCarrot(f, true);
  assert.equal(state.framed, 1);
  const plot = { t: 'farm', plots: [{ tx: 10, ty: 10, w: 0, soil: 0, m: 0, f: 1 }] };
  assert.deepEqual(f.farmMsgs(1), [plot]);
  assert.deepEqual(f.farmMsgs(2), [plot]);
});

test('plant: a wild seed leaves the crop rows for plantWild, but only on tilled earth', () => {
  const f = farmSlate();
  f.ground.set('10,10', Tile.Grass);
  farm.plant(f.s, 1, 10, 10, 'acorn');
  assert.deepEqual(f.sys(), ['Wild seeds want open tilled earth.']);
  f.ground.set('10,10', Tile.Tilled);
  farm.plant(f.s, 1, 10, 10, 'acorn');
  assert.deepEqual(f.said, ['wild']);
});

// ---- the clock: cropElapsed, tickCrops, waterCrop ---------------------------

test('cropElapsed: the frame\'s cloth runs the clock at 1.15x, and the boost rides on top', () => {
  const f = farmSlate();
  const state = plantedCarrot(f, true);
  state.boostMs = 1000;
  assert.equal(f.s.cropElapsed(state, T0 + 100_000), Math.round(100_000 * 1.15) + 1000);
  state.framed = 0;
  assert.equal(f.s.cropElapsed(state, T0 + 100_000), 101_000);
});

test('tickCrops: the row climbs sprout → mid → ripe on the stage ends, painting each transition once', () => {
  const f = farmSlate();
  const state = plantedCarrot(f);
  f.registered.length = 0;
  f.tiles.length = 0;
  const mid = stageEndMs(carrot, 0);
  const ripe = stageEndMs(carrot, 1);
  farm.tickCrops(f.s, T0 + mid - 1);
  assert.equal(state.lastStage, 0);
  farm.tickCrops(f.s, T0 + mid);
  farm.tickCrops(f.s, T0 + mid + 5000);
  assert.equal(state.lastStage, 1);
  farm.tickCrops(f.s, T0 + ripe);
  farm.tickCrops(f.s, T0 + ripe + 5000);
  assert.equal(state.lastStage, 2);
  assert.deepEqual(f.registered, [[10, 10, carrot.midTile], [10, 10, carrot.matureTile]]);
  assert.deepEqual(f.tiles, [
    [SURFACE_PLANE_ID, 10, 10, carrot.midTile],
    [SURFACE_PLANE_ID, 10, 10, carrot.matureTile],
  ]);
});

test('waterCrop: 35% of the stage\'s remainder, one drink per stage, none at ripe, none for the dark bed', () => {
  const f = farmSlate();
  const state = plantedCarrot(f);
  f.db.length = 0;
  const elapsed = 60_000;
  assert.equal(farm.waterCrop(f.s, state, T0 + elapsed), true);
  assert.equal(state.watered, 1);
  assert.equal(state.boostMs, Math.round((stageEndMs(carrot, 0) - elapsed) * 0.35));
  assert.equal(farm.waterCrop(f.s, state, T0 + elapsed), false, 'the sprout stage is slaked');
  assert.deepEqual(f.db, ['upsertCrop(10,10,carrot,1000000000000,0,1,7,0,0,0,0)'.replace(',0,1,7', `,${state.boostMs},1,7`)]);
  assert.deepEqual(f.farmMsgs(2), [{ t: 'farm', plots: [{ tx: 10, ty: 10, w: 1, soil: 0, m: 0, f: 0 }] }]);
  // The mid stage drinks once more; ripe never.
  const midAt = T0 + stageEndMs(carrot, 0);
  const before = state.boostMs;
  assert.equal(farm.waterCrop(f.s, state, midAt), true);
  assert.equal(state.watered, 3);
  assert.ok(state.boostMs > before);
  assert.equal(farm.waterCrop(f.s, state, T0 + growMs(carrot)), false);
  const log = { ...state, def: palegill, watered: 0 };
  assert.equal(farm.waterCrop(f.s, log, T0 + 1000), false);
});

test('tickCrops: a framed row is ALWAYS watered — each stage, no channel scan, no XP (the automation law)', () => {
  const f = farmSlate();
  const state = plantedCarrot(f, true);
  let scanned = 0;
  f.srv.irrigatedAt = (() => {
    scanned++;
    return false;
  }) as never;
  f.xp.length = 0;
  farm.tickCrops(f.s, T0 + 1000);
  assert.equal(state.watered, 1);
  farm.tickCrops(f.s, T0 + 1000);
  assert.equal(scanned, 0, 'the frame never asks the channel');
  const midAt = T0 + Math.ceil(stageEndMs(carrot, 0) / 1.15);
  farm.tickCrops(f.s, midAt);
  assert.equal(state.watered & 2, 2);
  assert.deepEqual(f.xp, []);
});

test('irrigatedAt: an adjacent channel counts only with a well in its feed range', () => {
  const f = farmSlate();
  assert.equal(farm.irrigatedAt(f.s, 10, 10), false);
  f.ground.set('11,10', Tile.IrrigationChannel);
  assert.equal(farm.irrigatedAt(f.s, 10, 10), false, 'a dry channel feeds nothing');
  f.srv.wellNear = ((tx: number, ty: number, range: number) => tx === 11 && ty === 10 && range === 6) as never;
  assert.equal(farm.irrigatedAt(f.s, 10, 10), true);
  // The plot's own tile is never the channel.
  f.ground.delete('11,10');
  f.ground.set('10,10', Tile.IrrigationChannel);
  assert.equal(farm.irrigatedAt(f.s, 10, 10), false);
});

test('tickCrops: a fed channel waters the growing row on the beat, silently', () => {
  const f = farmSlate();
  const state = plantedCarrot(f);
  f.ground.set('9,9', Tile.IrrigationChannel);
  f.srv.wellNear = (() => true) as never;
  farm.tickCrops(f.s, T0 + 1000);
  assert.equal(state.watered, 1);
  assert.deepEqual(f.xp, [['farming', 20]], 'planting paid; the channel did not');
});

// ---- the care folds: fertilize, mulch, prune --------------------------------

test('fertilize: plain compost enriches, prime compost makes rich, each step once, a tenth of the XP', () => {
  const f = farmSlate();
  const state = plantedCarrot(f);
  f.xp.length = 0;
  f.wire.length = 0;
  f.poses.length = 0;
  addItem(f.raw.inventory, 'compost', 2);
  addItem(f.raw.inventory, 'prime_compost', 2);
  withNow(T0 + 1000, () => farm.fertilize(f.s, 1, 10, 10));
  assert.equal(state.soil, SOIL_ENRICHED);
  assert.equal(countItem(f.raw.inventory, 'compost'), 1);
  withNow(T0 + 1000, () => farm.fertilize(f.s, 1, 10, 10));
  assert.equal(state.soil, SOIL_RICH);
  assert.equal(countItem(f.raw.inventory, 'compost'), 1, 'plain compost cannot better enriched ground');
  assert.equal(countItem(f.raw.inventory, 'prime_compost'), 1);
  withNow(T0 + 1000, () => farm.fertilize(f.s, 1, 10, 10));
  assert.deepEqual(f.sys(), [
    'You work compost into the soil.',
    'You work prime compost in. The ground turns dark and willing.',
    'The soil is as rich as it gets.',
  ]);
  assert.deepEqual(f.xp, [['farming', 8], ['farming', 8]]);
  assert.deepEqual(f.poses, [PoseState.Gather, PoseState.Gather]);
  assert.equal(f.farmMsgs(2).length, 2);
});

test('fertilize: the refusals — enriched ground wants prime, an empty pack, an empty plot, a log, a ripe row', () => {
  const f = farmSlate();
  const state = plantedCarrot(f);
  f.wire.length = 0;
  withNow(T0 + 1000, () => farm.fertilize(f.s, 1, 10, 10));
  state.soil = SOIL_ENRICHED;
  withNow(T0 + 1000, () => farm.fertilize(f.s, 1, 10, 10));
  f.ground.set('11,10', Tile.Tilled);
  withNow(T0 + 1000, () => farm.fertilize(f.s, 1, 11, 10));
  f.ground.set('12,10', Tile.Grass);
  withNow(T0 + 1000, () => farm.fertilize(f.s, 1, 12, 10));
  state.soil = 0;
  withNow(T0 + growMs(carrot), () => farm.fertilize(f.s, 1, 10, 10));
  f.srv.crops.set('11,10', { ...state, def: palegill, tx: 11 });
  withNow(T0 + 1000, () => farm.fertilize(f.s, 1, 11, 10));
  assert.deepEqual(f.sys(), [
    'You need compost in your pack.',
    'Only prime compost can better this ground.',
    'Plant first. The soil takes its meal through roots.',
    'It has grown all it will. Harvest it.',
    'The log asks for shade, nothing more.',
  ]);
});

test('mulch: two strands to a blanket, counted before taken; one blanket per planting', () => {
  const f = farmSlate();
  const state = plantedCarrot(f);
  f.xp.length = 0;
  f.wire.length = 0;
  addItem(f.raw.inventory, 'plant_fibre', 1);
  withNow(T0 + 1000, () => farm.mulch(f.s, 1, 10, 10));
  assert.equal(countItem(f.raw.inventory, 'plant_fibre'), 1, 'a short pack keeps its strand');
  assert.equal(state.mulched, 0);
  addItem(f.raw.inventory, 'plant_fibre', 2);
  withNow(T0 + 1000, () => farm.mulch(f.s, 1, 10, 10));
  assert.equal(countItem(f.raw.inventory, 'plant_fibre'), 1);
  assert.equal(state.mulched, 1);
  withNow(T0 + 1000, () => farm.mulch(f.s, 1, 10, 10));
  assert.deepEqual(f.sys(), [
    'Mulch wants plant fibre. Two strands to a blanket.',
    'You lay a fibre blanket around the stems.',
    'A mulch blanket already lies here.',
  ]);
  assert.deepEqual(f.xp, [['farming', 8]]);
  assert.deepEqual(f.farmMsgs(2), [{ t: 'farm', plots: [{ tx: 10, ty: 10, w: 0, soil: 0, m: 1, f: 0 }] }]);
});

test('prune: only an orchard, only mid-cycle, once behind its own bit; pays a tenth of the pick', () => {
  const f = farmSlate();
  const state = plantedCarrot(f);
  withNow(T0 + 1000, () => farm.prune(f.s, 1, 10, 10));
  assert.equal(state.watered & PRUNED_BIT, 0, 'a carrot has no deadwood');
  f.ground.set('12,10', Tile.Tilled);
  addItem(f.raw.inventory, 'plum_sapling', 1);
  withNow(T0, () => farm.plant(f.s, 1, 12, 10, 'plum_sapling'));
  const tree = f.srv.crops.get('12,10')!;
  f.xp.length = 0;
  f.wire.length = 0;
  withNow(T0 + growMs(plum), () => farm.prune(f.s, 1, 12, 10));
  assert.equal(tree.watered & PRUNED_BIT, 0);
  withNow(T0 + 1000, () => farm.prune(f.s, 1, 12, 10));
  assert.equal(tree.watered & PRUNED_BIT, PRUNED_BIT);
  withNow(T0 + 1000, () => farm.prune(f.s, 1, 12, 10));
  assert.deepEqual(f.sys(), [
    'Pick the fruit first. Then the knife.',
    'You cut the deadwood away. The tree breathes.',
    'The wood is already clean this season.',
  ]);
  assert.deepEqual(f.xp, [['farming', Math.ceil(harvestXp(plum, 0) / 10)]]);
  assert.equal(f.xp[0]![1], 35);
});

// ---- tickHarvest ------------------------------------------------------------

/** Ripen the row and put the harvester's hands on it (one tick left). */
function ripen(f: ReturnType<typeof farmSlate>, state: CropState): void {
  f.ground.set(`${state.tx},${state.ty}`, state.def.matureTile);
  f.raw.action = { kind: 'harvest', tx: state.tx, ty: state.ty, ticksLeft: 1 };
}

test('tickHarvest: the countdown, and the row gone from under the hands', () => {
  const f = farmSlate();
  const state = plantedCarrot(f);
  ripen(f, state);
  f.raw.action!.ticksLeft = 3;
  farm.tickHarvest(f.s, 1, f.player);
  assert.equal(f.raw.action!.ticksLeft, 2);
  assert.deepEqual(f.cancels, []);
  f.ground.set('10,10', carrot.midTile);
  farm.tickHarvest(f.s, 1, f.player);
  assert.deepEqual(f.cancels, ['gone']);
  assert.equal(f.raw.action, null);
  assert.ok(f.srv.crops.has('10,10'), 'the row itself stands');
});

/**
 * THE YIELD TABLE as the code deals it today, one row per crop, every
 * die at 0.5 (yield min+floor(span/2), the perk rolls failing, seeds
 * the same die). Recorded from a run of this very suite; a changed
 * roll formula, a changed def, or a re-ordered dice draw moves a cell.
 */
const YIELD_TABLE: Record<string, { item: string; qty: number; seeds: number; xp: number }> = {
  carrot: { item: 'carrot', qty: 3, seeds: 2, xp: 80 },
  sagewort: { item: 'sagewort', qty: 2, seeds: 2, xp: 100 },
  sunflower: { item: 'sunflower', qty: 2, seeds: 2, xp: 120 },
  wheat: { item: 'wheat', qty: 3, seeds: 2, xp: 180 },
  cotton: { item: 'cotton', qty: 3, seeds: 2, xp: 250 },
  moonbell: { item: 'moonbell', qty: 2, seeds: 2, xp: 400 },
  potato: { item: 'potato', qty: 4, seeds: 2, xp: 90 },
  onion: { item: 'onion', qty: 3, seeds: 2, xp: 110 },
  cabbage: { item: 'cabbage', qty: 3, seeds: 2, xp: 150 },
  pumpkin: { item: 'pumpkin', qty: 2, seeds: 2, xp: 300 },
  barley: { item: 'barley', qty: 4, seeds: 2, xp: 260 },
  redroot: { item: 'redroot', qty: 3, seeds: 2, xp: 450 },
  kingsquash: { item: 'kingsquash', qty: 2, seeds: 2, xp: 600 },
  bittercress: { item: 'bittercress', qty: 2, seeds: 2, xp: 420 },
  silverleaf: { item: 'silverleaf', qty: 2, seeds: 2, xp: 550 },
  duskthorn: { item: 'duskthorn', qty: 2, seeds: 2, xp: 700 },
  dawnveil: { item: 'dawnveil', qty: 2, seeds: 2, xp: 900 },
  adderstongue: { item: 'venom_sac', qty: 2, seeds: 2, xp: 500 },
  palegill: { item: 'spore_dust', qty: 3, seeds: 2, xp: 650 },
  appletree: { item: 'apple', qty: 3, seeds: 1, xp: 200 },
  bramblevine: { item: 'berries', qty: 3, seeds: 1, xp: 240 },
  plumtree: { item: 'plum', qty: 3, seeds: 1, xp: 350 },
  mirefig: { item: 'mirefig', qty: 3, seeds: 1, xp: 600 },
};

test('tickHarvest: THE YIELD TABLE — every crop at the half die, byte for byte', () => {
  const got: Record<string, { item: string; qty: number; seeds: number; xp: number }> = {};
  for (const def of CROPS.values()) {
    const f = farmSlate();
    const state: CropState = {
      def, tx: 10, ty: 10, plantedAt: T0, boostMs: 0, watered: 0, owner: 7, lastStage: 2, soil: 0, mulched: 0, framed: 0, cycles: 0,
    };
    f.srv.crops.set('10,10', state);
    ripen(f, state);
    withRolls([0.5], () => withNow(T0 + growMs(def), () => farm.tickHarvest(f.s, 1, f.player)));
    got[def.id] = {
      item: def.yield.item,
      qty: countItem(f.raw.inventory, def.yield.item),
      seeds: countItem(f.raw.inventory, def.seedItem),
      xp: f.xp.find(([sk]) => sk === 'farming')![1],
    };
  }
  assert.deepEqual(got, YIELD_TABLE);
  assert.equal(Object.keys(YIELD_TABLE).length, CROPS.size, 'every crop has a row');
});

test('tickHarvest: an annual row is cleared whole — ledger, tile index, bed tile, the care mirror\'s remove, done', () => {
  const f = farmSlate();
  const state = plantedCarrot(f);
  ripen(f, state);
  f.wire.length = 0;
  f.db.length = 0;
  f.registered.length = 0;
  f.tiles.length = 0;
  withRolls([0], () => farm.tickHarvest(f.s, 1, f.player));
  assert.equal(f.srv.crops.size, 0);
  assert.deepEqual(f.db, ['deleteCrop(10,10)']);
  assert.deepEqual(f.registered, [[10, 10, null]]);
  assert.deepEqual(f.tiles, [[SURFACE_PLANE_ID, 10, 10, Tile.Tilled]]);
  const remove = { t: 'farm', remove: [{ tx: 10, ty: 10 }] };
  assert.deepEqual(f.farmMsgs(1), [remove]);
  assert.deepEqual(f.farmMsgs(2), [remove]);
  assert.deepEqual(f.cancels, ['done']);
  assert.equal(countItem(f.raw.inventory, 'carrot'), 2);
  assert.equal(countItem(f.raw.inventory, 'carrot_seed'), 1);
  assert.deepEqual(f.sys(), [], 'a plain harvest says nothing');
  // A framed row hands the frame back, not bare soil.
  const g = farmSlate();
  const framed = plantedCarrot(g, true);
  ripen(g, framed);
  g.tiles.length = 0;
  withRolls([0], () => farm.tickHarvest(g.s, 1, g.player));
  assert.deepEqual(g.tiles, [[SURFACE_PLANE_ID, 10, 10, Tile.GrowingFrame]]);
});

test('tickHarvest: THE CARE FOLD — prime, fine, plain, and the dark bed that never grades', () => {
  const fold = (def: typeof carrot, watered: number, soil: number, mulched: number) => {
    const f = farmSlate();
    const state: CropState = {
      def, tx: 10, ty: 10, plantedAt: T0, boostMs: 0, watered, owner: 7, lastStage: 2, soil, mulched, framed: 0, cycles: 0,
    };
    f.srv.crops.set('10,10', state);
    ripen(f, state);
    withRolls([0], () => farm.tickHarvest(f.s, 1, f.player));
    const slot = f.raw.inventory.find((s) => s && s.item.startsWith(def.yield.item))!;
    return { item: slot.item, lines: f.sys() };
  };
  assert.deepEqual(fold(carrot, 3, SOIL_RICH, 0), { item: 'carrot_prime', lines: ['A prime harvest. The care shows.'] });
  assert.deepEqual(fold(carrot, 1, 0, 1), { item: 'carrot_fine', lines: ['A fine harvest.'] });
  assert.deepEqual(fold(carrot, 1, 0, 0), { item: 'carrot', lines: [] });
  assert.deepEqual(fold(palegill, 3, SOIL_RICH, 1), { item: 'spore_dust', lines: [] });
});

test('tickHarvest: THE ORCHARD SHAPE — the tree stands, re-aimed into the mid stage, its cycle bits reset', () => {
  const f = farmSlate();
  f.ground.set('10,10', Tile.Tilled);
  addItem(f.raw.inventory, 'plum_sapling', 1);
  withNow(T0, () => farm.plant(f.s, 1, 10, 10, 'plum_sapling'));
  const state = f.srv.crops.get('10,10')!;
  state.watered = 2 | PRUNED_BIT;
  state.soil = SOIL_RICH;
  ripen(f, state);
  f.xp.length = 0;
  f.tiles.length = 0;
  f.wire.length = 0;
  const T1 = T0 + growMs(plum);
  withRolls([0, 0, 0.99], () => withNow(T1, () => farm.tickHarvest(f.s, 1, f.player)));
  assert.ok(f.srv.crops.has('10,10'), 'the tree stands');
  assert.equal(state.cycles, 1);
  assert.equal(state.plantedAt, T1);
  assert.equal(state.boostMs, growMs(plum) - plum.recurring!.cooldownMinutes * 60_000);
  assert.equal(state.watered, 0);
  assert.equal(state.lastStage, 1);
  assert.equal(state.soil, SOIL_RICH, 'soil feeds the STANDING plant');
  assert.deepEqual(f.tiles, [[SURFACE_PLANE_ID, 10, 10, plum.midTile]]);
  assert.deepEqual(f.xp, [['farming', 350]]);
  assert.equal(countItem(f.raw.inventory, 'plum_prime'), 2, 'water + rich + prune = prime');
  assert.equal(countItem(f.raw.inventory, 'plum_sapling'), 1, 'the pruned wood struck as a cutting');
  assert.deepEqual(f.farmMsgs(2), [{ t: 'farm', plots: [{ tx: 10, ty: 10, w: 0, soil: SOIL_RICH, m: 0, f: 0 }] }]);
  assert.deepEqual(f.cancels, ['done']);
  // The second pick pays the cycle's own time.
  ripen(f, state);
  f.xp.length = 0;
  withRolls([0], () => withNow(T1 + growMs(plum), () => farm.tickHarvest(f.s, 1, f.player)));
  assert.deepEqual(f.xp, [['farming', plum.recurring!.cooldownMinutes * 10]]);
  assert.equal(state.cycles, 2);
});

test('tickHarvest: Bounty doubles the basket, Green Thumb hands a seed back, a full pack spills onto the plot', () => {
  const f = farmSlate();
  const state = plantedCarrot(f);
  ripen(f, state);
  f.raw.perks.doubleHarvestChance = 1;
  f.raw.perks.seedRefundChance = 1;
  withRolls([0], () => farm.tickHarvest(f.s, 1, f.player));
  assert.equal(countItem(f.raw.inventory, 'carrot'), 4);
  assert.equal(countItem(f.raw.inventory, 'carrot_seed'), 2);
  const g = farmSlate();
  const full = plantedCarrot(g);
  ripen(g, full);
  for (let i = 0; i < g.raw.inventory.length; i++) g.raw.inventory[i] = { item: 'trout', qty: 1 };
  withRolls([0], () => farm.tickHarvest(g.s, 1, g.player));
  assert.deepEqual(g.drops, [
    [SURFACE_PLANE_ID, 'carrot', 2, 10.5, 10.5],
    [SURFACE_PLANE_ID, 'carrot_seed', 1, 10.5, 10.5],
  ]);
});

// ---- the bin and the manger --------------------------------------------------

test('compostAdd: worth by kind, graded goods counted, the lid closes at the batch, the bin mirrored', () => {
  const f = farmSlate();
  f.ground.set('10,11', Tile.CompostBin);
  const inv = f.raw.inventory;
  inv[0] = { item: 'carrot', qty: 1 };
  inv[1] = { item: 'carrot_prime', qty: 1 };
  inv[2] = { item: 'carrot_seed', qty: 1 };
  inv[3] = { item: 'raw_beef', qty: 1 };
  inv[4] = { item: 'iron_sword', qty: 1 };
  inv[5] = { item: 'trout', qty: 1, stolen: true };
  inv[6] = { item: 'carrot_fine', qty: 1 };
  withNow(T0, () => {
    farm.compostAdd(f.s, 1, 10, 11, 4);
    farm.compostAdd(f.s, 1, 10, 11, 5);
    farm.compostAdd(f.s, 1, 10, 11, 0);
    farm.compostAdd(f.s, 1, 10, 11, 1);
    farm.compostAdd(f.s, 1, 10, 11, 2);
    farm.compostAdd(f.s, 1, 10, 11, 3);
  });
  const bin = f.srv.farmBins.get('10,11') as { fill: number; graded: number; startedAt: number };
  assert.deepEqual({ fill: bin.fill, graded: bin.graded, startedAt: bin.startedAt }, { fill: 6, graded: 3, startedAt: 0 });
  assert.ok(inv[4] && inv[5], 'gear and stolen goods stay in the pack');
  withNow(T0, () => farm.compostAdd(f.s, 1, 10, 11, 6));
  assert.deepEqual({ fill: bin.fill, graded: bin.graded, startedAt: bin.startedAt }, { fill: 8, graded: 5, startedAt: T0 });
  withNow(T0 + 1000, () => farm.compostAdd(f.s, 1, 10, 11, 4));
  withNow(T0 + COMPOST_MINUTES * 60_000, () => farm.compostAdd(f.s, 1, 10, 11, 4));
  assert.deepEqual(f.sys(), [
    'That has no place in the bin.',
    'Not with goods that would burn an honest heap.',
    'The lid closes. The heap sets to work.',
    'The bin is working. Let it be.',
    'The batch is done. Turn the bin out first.',
  ]);
  const last = f.farmMsgs(2).at(-1);
  assert.deepEqual(last, { t: 'farm', bins: [{ tx: 10, ty: 11, fill: 8, graded: 5, readyAt: T0 + COMPOST_MINUTES * 60_000 }] });
  assert.equal(f.db.at(-1), `upsertFarmBin(10,11,8,5,${T0})`);
  assert.equal(f.poses.length, 5);
});

test('compostAdd: the Rich Heap discount closes the lid early', () => {
  const f = farmSlate();
  f.ground.set('10,11', Tile.CompostBin);
  f.raw.perks.compostDiscount = 6;
  f.raw.inventory[0] = { item: 'carrot', qty: 2 };
  withNow(T0, () => {
    farm.compostAdd(f.s, 1, 10, 11, 0);
    farm.compostAdd(f.s, 1, 10, 11, 0);
  });
  assert.equal((f.srv.farmBins.get('10,11') as { startedAt: number }).startedAt, T0);
});

test('troughAdd: barley two measures, produce one plus its grade, the heap caps at twelve, refuse spoken', () => {
  const f = farmSlate();
  f.ground.set('10,11', Tile.FeedTrough);
  const inv = f.raw.inventory;
  inv[0] = { item: 'barley', qty: 5 };
  inv[1] = { item: 'carrot', qty: 1 };
  inv[2] = { item: 'carrot_prime', qty: 1 };
  inv[3] = { item: 'iron_sword', qty: 1 };
  inv[4] = { item: 'carrot', qty: 1, stolen: true };
  farm.troughAdd(f.s, 1, 10, 11, 0);
  const trough = f.srv.farmTroughs.get('10,11') as { feed: number };
  assert.equal(trough.feed, 2);
  farm.troughAdd(f.s, 1, 10, 11, 1);
  farm.troughAdd(f.s, 1, 10, 11, 2);
  assert.equal(trough.feed, 6);
  farm.troughAdd(f.s, 1, 10, 11, 3);
  farm.troughAdd(f.s, 1, 10, 11, 4);
  assert.equal(trough.feed, 6);
  for (let i = 0; i < 4; i++) farm.troughAdd(f.s, 1, 10, 11, 0);
  assert.equal(trough.feed, 12);
  assert.equal(countItem(inv, 'barley'), 1, 'the full manger refuses before it takes');
  farm.troughAdd(f.s, 1, 10, 11, 4);
  assert.deepEqual(f.said, ['The herd has no use for that.', 'The manger is heaped full.', 'The manger is heaped full.']);
  assert.deepEqual(f.sys(), [
    'You fill the manger. Somebody noticed immediately.',
    'You fill the manger. Somebody noticed immediately.',
    'You fill the manger. Somebody noticed immediately.',
    'Not with goods that would sour an honest manger.',
    'You fill the manger. Somebody noticed immediately.',
    'You fill the manger. Somebody noticed immediately.',
    'You fill the manger. Somebody noticed immediately.',
  ]);
  assert.deepEqual(f.farmMsgs(2).at(-1), { t: 'farm', troughs: [{ tx: 10, ty: 11, feed: 12 }] });
  assert.equal(f.db.at(-1), 'upsertFarmTrough(10,11,12)');
});

// ---- the yard: release, stand, interact, fleece -----------------------------

function ownTrough(f: ReturnType<typeof farmSlate>, tx = 11, ty = 11, owner = 7): void {
  f.ground.set(`${tx},${ty}`, Tile.FeedTrough);
  f.built.set(`${tx},${ty}`, { owner });
}

test('releaseLivestock: only at your OWN trough; the row, the slot, the clock, the naming card, the spoken step', () => {
  const f = farmSlate();
  f.raw.inventory[0] = { item: 'calf_crate', qty: 1 };
  withNow(T0, () => farm.releaseLivestock(f.s, 1, f.player, 0, 'calf_crate'));
  assert.deepEqual(f.sys(), ['Release it at your own feed trough. The yard is the animal\'s home.']);
  ownTrough(f, 11, 11, 99);
  withNow(T0, () => farm.releaseLivestock(f.s, 1, f.player, 0, 'calf_crate'));
  assert.equal(f.srv.livestock.size, 0, 'a neighbor\'s trough is not the yard');
  ownTrough(f);
  f.wire.length = 0;
  withNow(T0, () => farm.releaseLivestock(f.s, 1, f.player, 0, 'calf_crate'));
  assert.equal(f.raw.inventory[0], null);
  const cow = LIVESTOCK.get('cow')!;
  const expected: LivestockRow = {
    characterId: 7, slot: 0, species: 'cow', name: 'Cow', tx: 11, ty: 11, bond: 0, brushedAt: 0,
    nextProduceAt: T0 + cow.produce.cooldownSec * 1000, bornAt: T0,
  };
  const [eid, comp] = [...f.srv.livestock.entries()][0]!;
  assert.deepEqual(comp.row, expected);
  assert.equal(comp.shornShown, undefined);
  assert.deepEqual(f.db, [`saveLivestock(${String(expected)})`]);
  const npc = f.srv.npcs.get(eid)!;
  assert.equal(npc.nextProduceAt, expected.nextProduceAt);
  assert.equal(npc.nextLayAt, 0, 'a kept hen lays for the hand');
  assert.deepEqual(f.wire.filter((w) => w.sid === 1).map((w) => w.msg.t), ['inv', 'stockname', 'chat']);
  assert.deepEqual(f.wire.find((w) => w.msg.t === 'stockname')!.msg, { t: 'stockname', slot: 0, species: 'cow' });
  assert.deepEqual(f.sys(), ['The cow steps into your yard and looks around, deciding things.']);
  // The next animal takes the next free slot.
  f.raw.inventory[1] = { item: 'chick_crate', qty: 1 };
  withNow(T0, () => farm.releaseLivestock(f.s, 1, f.player, 1, 'chick_crate'));
  assert.deepEqual([...f.srv.livestock.values()].map((c) => c.row.slot), [0, 1]);
});

test('releaseLivestock: the level gate, the trough cap of four, and a guest', () => {
  const f = farmSlate({ level: 5 });
  ownTrough(f);
  f.raw.inventory[0] = { item: 'lamb_crate', qty: 1 };
  farm.releaseLivestock(f.s, 1, f.player, 0, 'lamb_crate');
  assert.deepEqual(f.said, ['You need beastcraft level 10 to keep a sheep.']);
  for (let i = 0; i < 4; i++) {
    f.raw.inventory[0] = { item: 'calf_crate', qty: 1 };
    farm.releaseLivestock(f.s, 1, f.player, 0, 'calf_crate');
  }
  assert.equal(f.srv.livestock.size, 4);
  f.raw.inventory[0] = { item: 'calf_crate', qty: 1 };
  farm.releaseLivestock(f.s, 1, f.player, 0, 'calf_crate');
  assert.equal(f.srv.livestock.size, 4);
  assert.equal(f.sys().at(-1), 'This trough feeds all it can. Raise another.');
  const g = farmSlate({ characterId: -1 });
  g.raw.inventory[0] = { item: 'calf_crate', qty: 1 };
  farm.releaseLivestock(g.s, 1, g.player, 0, 'calf_crate');
  assert.deepEqual(g.sys(), ['Guests cannot keep animals. Make an account!']);
});

test('spawnLivestockEntity: the south-apron scatter is dealt by slot; a sheep remembers its shorn look', () => {
  const f = farmSlate();
  const row = (slot: number, species = 'cow'): LivestockRow => ({
    characterId: 7, slot, species, name: species, tx: 20, ty: 20, bond: 0, brushedAt: 0, nextProduceAt: T0 + 1, bornAt: 0,
  });
  const at = (slot: number) => {
    const eid = farm.spawnLivestockEntity(f.s, row(slot))!;
    const p = f.srv.positions.get(eid)!;
    return [p.x, p.y];
  };
  // x = tx + 0.5 + ((slot % 3) - 1) * 1.2 + ((slot * 7) % 5) * 0.1; y = ty + 1.6 + floor(slot / 3) * 1.1.
  assert.deepEqual(at(0), [20 + 0.5 + -1 * 1.2 + 0 * 0.1, 20 + 1.6 + 0 * 1.1]);
  assert.deepEqual(at(1), [20 + 0.5 + 0 * 1.2 + 2 * 0.1, 20 + 1.6 + 0 * 1.1]);
  assert.deepEqual(at(4), [20 + 0.5 + 0 * 1.2 + 3 * 0.1, 20 + 1.6 + 1 * 1.1]);
  assert.equal(farm.spawnLivestockEntity(f.s, row(0, 'wolf')), null, 'the wild is never kept');
  const sheep = withNow(T0, () => farm.spawnLivestockEntity(f.s, row(2, 'sheep'))!);
  assert.equal(f.srv.livestock.get(sheep)!.shornShown, true);
});

function keptCow(f: ReturnType<typeof farmSlate>, nextProduceAt: number, brushedAt = 0) {
  const row: LivestockRow = {
    characterId: 7, slot: 0, species: 'cow', name: 'Buttercup', tx: 11, ty: 11, bond: 0, brushedAt, nextProduceAt, bornAt: 0,
  };
  const eid = farm.spawnLivestockEntity(f.s, row)!;
  return { eid, row, npc: f.srv.npcs.get(eid) as unknown as NpcComp, comp: f.srv.livestock.get(eid)! };
}

test('interactLivestock: not yours → a word; a ready udder → the milking rail, aimed and held', () => {
  const f = farmSlate();
  const { eid, npc, comp } = keptCow(f, T0);
  comp.row.characterId = 8;
  const said: string[] = [];
  withNow(T0, () => farm.interactLivestock(f.s, 1, f.player, eid, npc, comp, (t) => said.push(t)));
  assert.deepEqual(f.said, ['Buttercup belongs to another yard.']);
  comp.row.characterId = 7;
  withNow(T0, () => farm.interactLivestock(f.s, 1, f.player, eid, npc, comp, (t) => said.push(t)));
  const ticks = Math.max(MIN_GATHER_TICKS, Math.round(MILK_TICKS / 1));
  assert.deepEqual(f.raw.action, { kind: 'milk', targetEid: eid, ticksLeft: ticks });
  assert.equal(npc.holdUntilTick, 500 + ticks + 20);
  assert.equal(f.srv.poses.get(1), PoseState.Milk);
  assert.deepEqual(f.wire.filter((w) => w.sid === 1).map((w) => w.msg), [{ t: 'action', state: 'start', ticks }]);
  assert.deepEqual(said, []);
  // A full pack refuses before the hands go on.
  const g = farmSlate();
  const k = keptCow(g, T0);
  for (let i = 0; i < g.raw.inventory.length; i++) g.raw.inventory[i] = { item: 'trout', qty: 1 };
  withNow(T0, () => farm.interactLivestock(g.s, 1, g.player, k.eid, k.npc, k.comp, () => {}));
  assert.deepEqual(g.said, ['Your pack is full.']);
  assert.equal(g.raw.action, null);
});

test('interactLivestock: the brush pays bond and XP once a window; then the content line with the minutes', () => {
  const f = farmSlate();
  const { eid, npc, comp } = keptCow(f, T0 + 5 * 60_000 + 1);
  const said: string[] = [];
  const sys = (t: string) => said.push(t);
  withNow(T0, () => farm.interactLivestock(f.s, 1, f.player, eid, npc, comp, sys));
  assert.equal(comp.row.bond, 1);
  assert.equal(comp.row.brushedAt, T0);
  assert.deepEqual(f.xp, [['beastcraft', BRUSH_XP]]);
  assert.deepEqual(f.db, [`saveLivestock(${String(comp.row)})`]);
  withNow(T0 + 1000, () => farm.interactLivestock(f.s, 1, f.player, eid, npc, comp, sys));
  comp.row.bond = 7;
  comp.row.brushedAt = 0;
  withNow(T0 + 1000, () => farm.interactLivestock(f.s, 1, f.player, eid, npc, comp, sys));
  assert.deepEqual(said, [
    'You brush Buttercup down. It leans into the strokes.',
    'Buttercup is content. Nothing to milk yet (about 5 min).',
    'You brush Buttercup down. It would follow you anywhere it could.',
  ]);
});

test('interactLivestock: THE LEAD WAITS ITS TURN — it fires only when nothing else is owed, and refunds half the crate', () => {
  const f = farmSlate();
  const { eid, npc, comp } = keptCow(f, T0 + 60_000, T0);
  f.raw.inventory[0] = { item: 'drovers_lead', qty: 1 };
  const said: string[] = [];
  withNow(T0, () => farm.interactLivestock(f.s, 1, f.player, eid, npc, comp, (t) => said.push(t)));
  assert.equal(countItem(f.raw.inventory, 'drovers_lead'), 0);
  assert.equal(countItem(f.raw.inventory, 'coins'), 87, 'floor(175 / 2)');
  assert.equal(f.srv.livestock.size, 0);
  assert.deepEqual(f.destroyed, [eid]);
  assert.deepEqual(f.db, ['deleteLivestock(7,0)']);
  assert.deepEqual(said, ['You lead Buttercup back to the drover trade. The yard is quieter for it.']);
  // With the brush window open, the same lead in the pack waits.
  const g = farmSlate();
  const k = keptCow(g, T0 + 60_000, 0);
  g.raw.inventory[0] = { item: 'drovers_lead', qty: 1 };
  withNow(T0, () => farm.interactLivestock(g.s, 1, g.player, k.eid, k.npc, k.comp, () => {}));
  assert.ok(g.raw.inventory[0], 'the lead stays');
  assert.equal(g.srv.livestock.size, 1);
});

test('tickFleece: the shorn flag flips on the meta channel only when the wool clock crosses', () => {
  const f = farmSlate();
  const row: LivestockRow = {
    characterId: 7, slot: 0, species: 'sheep', name: 'Cloud', tx: 11, ty: 11, bond: 0, brushedAt: 0, nextProduceAt: T0 + 1000, bornAt: 0,
  };
  const eid = withNow(T0, () => farm.spawnLivestockEntity(f.s, row)!);
  farm.tickFleece(f.s, T0);
  farm.tickFleece(f.s, T0 + 500);
  assert.deepEqual(f.metaUpdates, []);
  farm.tickFleece(f.s, T0 + 1000);
  farm.tickFleece(f.s, T0 + 2000);
  assert.deepEqual(f.metaUpdates, [eid]);
  assert.equal(f.srv.livestock.get(eid)!.shornShown, false);
  (f.srv.npcs.get(eid) as { nextProduceAt: number }).nextProduceAt = T0 + 9000;
  farm.tickFleece(f.s, T0 + 3000);
  assert.deepEqual(f.metaUpdates, [eid, eid]);
});

// ---- the hive ----------------------------------------------------------------

test('interactApiary: the first touch settles the bees; thin comb speaks the minutes; the yard is the keeper\'s', () => {
  const f = farmSlate();
  const said: string[] = [];
  const sys = (t: string) => said.push(t);
  withNow(T0, () => farm.interactApiary(f.s, 1, f.player, 10, 12, sys));
  assert.deepEqual(f.srv.farmApiaries.get('10,12'), { tx: 10, ty: 12, since: T0 });
  assert.deepEqual(f.db, [`upsertFarmApiary(10,12,${T0})`]);
  assert.deepEqual(f.farmMsgs(2), [{ t: 'farm', apiaries: [{ tx: 10, ty: 12, since: T0 }] }]);
  withNow(T0 + 60_000, () => farm.interactApiary(f.s, 1, f.player, 10, 12, sys));
  assert.deepEqual(said, ['The bees settle into the new box. Give them time.', 'The comb is thin yet. About 24 min.']);
  f.built.set('10,12', { owner: 99 });
  withNow(T0 + 60 * 60_000, () => farm.interactApiary(f.s, 1, f.player, 10, 12, sys));
  assert.equal(said.at(-1), 'These bees answer another keeper.');
  assert.equal(countItem(f.raw.inventory, 'honey'), 0);
});

test('interactApiary: honey graded by the flowers standing near — THE GARDEN DID THIS, word for word', () => {
  const lift = (flowers: number, minutes: number) => {
    const f = farmSlate();
    f.srv.farmApiaries.set('10,12', { tx: 10, ty: 12, since: T0 });
    for (let i = 0; i < flowers; i++) f.ground.set(`${5 + i},${14}`, i % 2 ? Tile.FlowerBox : Tile.SunflowerRipe);
    const said: string[] = [];
    withNow(T0 + minutes * 60_000, () => farm.interactApiary(f.s, 1, f.player, 10, 12, (t) => said.push(t)));
    const honey = f.raw.inventory.find((s) => s && s.item.startsWith('honey'))!;
    return { honey: honey.item, qty: honey.qty, wax: countItem(f.raw.inventory, 'beeswax'), xp: f.xp, said, since: f.srv.farmApiaries.get('10,12')!.since };
  };
  assert.deepEqual(lift(0, 25), {
    honey: 'honey', qty: 1, wax: 1, xp: [['farming', 12]], said: ['You take fair comb. Bees do better beside a garden.'], since: T0 + 25 * 60_000,
  });
  assert.deepEqual(lift(4, 50), {
    honey: 'honey_fine', qty: 2, wax: 2, xp: [['farming', 24]], said: ['Good comb, sweetened by the flowers near.'], since: T0 + 50 * 60_000,
  });
  // Three units is the comb's store, however long the lid stayed shut.
  assert.deepEqual(lift(10, 500), {
    honey: 'honey_prime', qty: 3, wax: 3, xp: [['farming', 36]], said: ['The comb runs heavy and bright. The garden did this.'], since: T0 + 500 * 60_000,
  });
});

// ---- the working station -----------------------------------------------------

const churn = WORK_RECIPES.get('work_churn_butter')!;

test('workStart: inputs taken highest grade first, the batch wears its weakest; the job, the ledger, the mirror, the beat', () => {
  const f = farmSlate();
  f.ground.set('11,10', Tile.ButterChurn);
  addItem(f.raw.inventory, 'milk_prime', 1);
  addItem(f.raw.inventory, 'milk_fine', 1);
  addItem(f.raw.inventory, 'milk', 2);
  withNow(T0, () => farm.workStart(f.s, 1, 11, 10, 'work_churn_butter', 3));
  assert.equal(countItem(f.raw.inventory, 'milk_prime'), 0);
  assert.equal(countItem(f.raw.inventory, 'milk_fine'), 0);
  assert.equal(countItem(f.raw.inventory, 'milk'), 1);
  const job = { tx: 11, ty: 10, recipe: 'work_churn_butter', qty: 3, startedAt: T0, grade: 0, owner: 7 };
  assert.deepEqual(f.srv.farmJobs.get('11,10'), job);
  assert.deepEqual(f.db, [`upsertStationJob(11,10,work_churn_butter,3,${T0},0,7)`]);
  const { owner: _o, ...wireJob } = job;
  assert.deepEqual(f.farmMsgs(2), [{ t: 'farm', jobs: [wireJob] }]);
  assert.deepEqual(f.poses, [PoseState.Craft]);
  assert.deepEqual(f.sys(), ['The butter work begins. It runs while you wander.']);
  // Loading again while it works is refused; nothing more is taken.
  withNow(T0, () => farm.workStart(f.s, 1, 11, 10, 'work_churn_butter', 1));
  assert.deepEqual(f.said, ['The station is already working. Collect first.']);
  assert.equal(countItem(f.raw.inventory, 'milk'), 1);
});

test('workStart: the refusals spend nothing — wrong station, short inputs, the level gate, the batch cap', () => {
  const f = farmSlate();
  f.ground.set('11,10', Tile.ButterChurn);
  addItem(f.raw.inventory, 'milk_prime', 1);
  farm.workStart(f.s, 1, 11, 10, 'work_dry_sagewort', 1);
  farm.workStart(f.s, 1, 11, 10, 'work_churn_butter', 2);
  assert.deepEqual(f.sys(), ['Short of milk for 2.']);
  assert.equal(countItem(f.raw.inventory, 'milk_prime'), 1);
  const g = farmSlate({ level: 1 });
  g.ground.set('11,10', Tile.ButterChurn);
  addItem(g.raw.inventory, 'milk', 1);
  g.raw.inventory[0]!.qty = 30;
  farm.workStart(g.s, 1, 11, 10, 'work_churn_butter', 1);
  assert.deepEqual(g.said, ['You need cooking level 12 for churn butter.']);
  g.srv.effectiveLevel = (() => 99) as never;
  withNow(T0, () => farm.workStart(g.s, 1, 11, 10, 'work_churn_butter', 30));
  assert.equal((g.srv.farmJobs.get('11,10') as { qty: number }).qty, 10, 'the batch cap');
  assert.equal(countItem(g.raw.inventory, 'milk'), 20);
});

test('interactWorkStation: idle, another hand, not yet, the graded measure, the rest', () => {
  const f = farmSlate();
  const said: string[] = [];
  const sys = (t: string) => said.push(t);
  farm.interactWorkStation(f.s, 1, f.player, 11, 10, sys);
  f.srv.farmJobs.set('11,10', { tx: 11, ty: 10, recipe: 'work_churn_butter', qty: 3, startedAt: T0, grade: 1, owner: 8 });
  farm.interactWorkStation(f.s, 1, f.player, 11, 10, sys);
  const job = f.srv.farmJobs.get('11,10') as { qty: number; startedAt: number; owner: number };
  job.owner = 7;
  withNow(T0 + 60_000, () => farm.interactWorkStation(f.s, 1, f.player, 11, 10, sys));
  const one = churn.minutes * 60_000;
  withNow(T0 + 2 * one + 1, () => farm.interactWorkStation(f.s, 1, f.player, 11, 10, sys));
  assert.equal(countItem(f.raw.inventory, 'butter_fine'), 2);
  assert.deepEqual({ qty: job.qty, startedAt: job.startedAt }, { qty: 1, startedAt: T0 + 2 * one });
  assert.deepEqual(f.xp, [['cooking', churn.xp * 2]]);
  assert.equal(f.db.at(-1), `upsertStationJob(11,10,work_churn_butter,1,${T0 + 2 * one},1,7)`);
  withNow(T0 + 3 * one, () => farm.interactWorkStation(f.s, 1, f.player, 11, 10, sys));
  assert.equal(countItem(f.raw.inventory, 'butter_fine'), 3);
  assert.equal(f.srv.farmJobs.has('11,10'), false);
  assert.equal(f.db.at(-1), 'deleteStationJob(11,10)');
  assert.deepEqual(f.farmMsgs(2).at(-1), { t: 'farm', jobs: [{ tx: 11, ty: 10, recipe: 'work_churn_butter', qty: 0, startedAt: 0, grade: 0 }] });
  assert.deepEqual(said, [
    'The station stands idle. Load it and let it work.',
    'This batch is another hand\'s work.',
    'The work goes on. About 3 min to the next measure.',
    'You collect 2 fine butter. 1 still working.',
    'You collect 1 fine butter. The station rests.',
  ]);
});

// ---- the one care mirror -----------------------------------------------------

test('sendFarm: a fresh session hears only the rows with care facts, plus every bin, trough, live job and hive', () => {
  const f = farmSlate();
  const bare = plantedCarrot(f);
  const cared = { ...bare, tx: 12, watered: 3, soil: 2, mulched: 1 };
  f.srv.crops.set('12,10', cared);
  f.srv.farmBins.set('1,1', { tx: 1, ty: 1, fill: 3, graded: 1, startedAt: 0 });
  f.srv.farmBins.set('1,2', { tx: 1, ty: 2, fill: 8, graded: 0, startedAt: T0 });
  f.srv.farmTroughs.set('2,2', { tx: 2, ty: 2, feed: 4 });
  f.srv.farmJobs.set('3,3', { tx: 3, ty: 3, recipe: 'work_churn_butter', qty: 0, startedAt: 0, grade: 0, owner: 7 });
  f.srv.farmJobs.set('3,4', { tx: 3, ty: 4, recipe: 'work_churn_butter', qty: 2, startedAt: T0, grade: 2, owner: 7 });
  f.srv.farmApiaries.set('4,4', { tx: 4, ty: 4, since: T0 });
  const heard: Msg[] = [];
  farm.sendFarm(f.s, { sendJson: (m: Msg) => heard.push(m) } as never);
  assert.deepEqual(heard, [
    {
      t: 'farm',
      plots: [{ tx: 12, ty: 10, w: 3, soil: 2, m: 1, f: 0 }],
      bins: [
        { tx: 1, ty: 1, fill: 3, graded: 1, readyAt: 0 },
        { tx: 1, ty: 2, fill: 8, graded: 0, readyAt: T0 + COMPOST_MINUTES * 60_000 },
      ],
      troughs: [{ tx: 2, ty: 2, feed: 4 }],
      jobs: [{ tx: 3, ty: 4, recipe: 'work_churn_butter', qty: 2, startedAt: T0, grade: 2 }],
      apiaries: [{ tx: 4, ty: 4, since: T0 }],
    },
  ]);
  const quiet: Msg[] = [];
  farm.sendFarm(farmSlate().s, { sendJson: (m: Msg) => quiet.push(m) } as never);
  assert.deepEqual(quiet, [], 'an empty farm sends nothing');
});

test('the mirrors fan one row to every session, in the wire shape the client reads', () => {
  const f = farmSlate();
  const state = plantedCarrot(f);
  state.watered = 1;
  farm.mirrorPlot(f.s, state);
  farm.mirrorBin(f.s, { tx: 1, ty: 1, fill: 2, graded: 0, startedAt: 0 });
  farm.mirrorTrough(f.s, { tx: 2, ty: 2, feed: 3 });
  farm.mirrorJob(f.s, { tx: 3, ty: 3, recipe: 'r', qty: 1, startedAt: 5, grade: 2 });
  farm.mirrorApiary(f.s, 4, 4, 9);
  const expected = [
    { t: 'farm', plots: [{ tx: 10, ty: 10, w: 1, soil: 0, m: 0, f: 0 }] },
    { t: 'farm', bins: [{ tx: 1, ty: 1, fill: 2, graded: 0, readyAt: 0 }] },
    { t: 'farm', troughs: [{ tx: 2, ty: 2, feed: 3 }] },
    { t: 'farm', jobs: [{ tx: 3, ty: 3, recipe: 'r', qty: 1, startedAt: 5, grade: 2 }] },
    { t: 'farm', apiaries: [{ tx: 4, ty: 4, since: 9 }] },
  ];
  assert.deepEqual(f.farmMsgs(1), expected);
  assert.deepEqual(f.farmMsgs(2), expected);
});

// ---- the delegators ----------------------------------------------------------

test('every farming door on the class is a one-line delegator onto the module (same result, same arity)', () => {
  const f = farmSlate();
  const state = plantedCarrot(f);
  const viaClass = proto.cropElapsed as unknown as (this: unknown, s: CropState, n: number) => number;
  assert.equal(viaClass.call(f.s, state, T0 + 5000), f.s.cropElapsed(state, T0 + 5000));
  const a = farmSlate();
  const b = farmSlate();
  plantedCarrot(a);
  (proto.plant as unknown as (this: unknown, ...x: unknown[]) => void).call(b.s, 1, 10, 10, 'carrot_seed');
  b.ground.set('10,10', Tile.Tilled);
  addItem(b.raw.inventory, 'carrot_seed', 1);
  withNow(T0, () => (proto.plant as unknown as (this: unknown, ...x: unknown[]) => void).call(b.s, 1, 10, 10, 'carrot_seed'));
  const strip = (c: CropState) => ({ ...c, def: c.def.id });
  assert.deepEqual(strip(b.srv.crops.get('10,10')!), strip(a.srv.crops.get('10,10')!));
  assert.deepEqual(b.sys(), a.sys());
  for (const name of Object.keys(farm)) {
    const mod = (farm as unknown as Record<string, Fn>)[name]!;
    const del = proto[name];
    assert.ok(typeof del === 'function', `GameServer.${name} delegator exists`);
    assert.equal(del.length, mod.length - 1, `GameServer.${name} arity = module arity minus srv`);
  }
});
