import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GameServer } from './gameServer.js';
import { addItem, countItem, emptyInventory } from './inventory.js';

/**
 * THE WORN BOOK's two engine doors, pinned:
 *
 * - THE PACK'S BLESSING (packlord's 4pc, the roster's only
 *   target:'pet' action): the working is refused BEFORE arbitration
 *   when no companion stands — no charge banked, no rest stamped on a
 *   sure no-op — and the page it lays walks the pet's OWN npc apply
 *   door with the wearer's own petEid, never the player door, never
 *   another wearer's companion, never the foe in hand;
 * - THE WRIGHT'S RHYTHM (wrightcloth's 4pc, the roster's only
 *   per:'craft' rhythm): the bench moment is offered inside the
 *   HONEST branch, so a finished working banks its charge and a
 *   yield working's extra mints one more of the very recipe worked,
 *   while a burnt pan reaches no door and mints nothing.
 *
 * All run on hand-built slates over GameServer.prototype (the
 * procDoors/theft rig pattern).
 */

type AnyFn = (...args: never[]) => unknown;
const proto = GameServer.prototype as unknown as {
  bodyMoment: AnyFn;
  offerProc: AnyFn;
  procState: AnyFn;
  runProc: AnyFn;
  runProcInner: AnyFn;
  tickCraft: AnyFn;
};

const call = (fn: AnyFn, self: unknown, ...args: unknown[]): unknown =>
  (fn as (...a: unknown[]) => unknown).call(self, ...args);

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

// ------------------------------------------- THE PACK'S BLESSING door

/** packlord's word, counted at one so a single blow reaches the door. */
const petBoon = {
  kind: 'proc' as const,
  id: 'pack_pace_t',
  name: 'The Pack Sets the Pace',
  trigger: { on: 'stacks' as const, per: 'hit' as const, count: 1 },
  action: {
    do: 'boon' as const,
    status: 'quicken' as const,
    power: 1,
    ticks: 100,
    target: 'pet' as const,
  },
  icd: 300,
};

const OTHER_PET = 7;
const FOE = 9;

/**
 * A wearer at eid 1, a foe at 9, and ANOTHER wearer's companion at 7
 * always standing and always hale — the door may never see it.
 */
function petSlate(opts: { petEid?: number | null; petHp?: number } = {}) {
  const runs: unknown[][] = [];
  const petEid = opts.petEid ?? null;
  const healths = new Map<number, { hp: number; maxHp: number }>([
    [OTHER_PET, { hp: 10, maxHp: 10 }],
    [FOE, { hp: 20, maxHp: 20 }],
  ]);
  if (petEid !== null) healths.set(petEid, { hp: opts.petHp ?? 10, maxHp: 10 });
  const player = { gear: { procs: [petBoon] }, procs: new Map(), petEid };
  const s = {
    tickCount: 100,
    healths,
    npcs: new Map<number, unknown>([
      [FOE, { def: { radius: 0.4 } }],
      [OTHER_PET, { def: { radius: 0.4 } }],
    ]),
    chargesDirty: new Set<number>(),
    bodyMoment: proto.bodyMoment,
    offerProc: proto.offerProc,
    procState: proto.procState,
    runProc: (...a: unknown[]) => {
      runs.push(a);
      return 0;
    },
  };
  if (petEid !== null) s.npcs.set(petEid, { def: { radius: 0.4 } });
  return { s, player, runs };
}

const stateOf = (player: { procs: Map<string, unknown> }) =>
  player.procs.get('pack_pace_t') as { restUntil: number; stacks: number } | undefined;

test('THE PACK sends no blessing to nobody: no companion, no charge, no rest', () => {
  const { s, player, runs } = petSlate({ petEid: null });
  call(proto.bodyMoment, s, 1, player, 'hit', { x: 0, y: 0, targetEid: FOE });
  assert.equal(runs.length, 0, 'the working never fired');
  assert.equal(stateOf(player)?.restUntil ?? 0, 0, 'no rest was stamped on a sure no-op');
  assert.equal(stateOf(player)?.stacks ?? 0, 0, 'and the charge was never spent unheard');
  assert.equal(s.chargesDirty.size, 0, 'a meter that never moved marks no wearer');
});

test('THE PACK blesses the companion that stands', () => {
  const { s, player, runs } = petSlate({ petEid: 5 });
  call(proto.bodyMoment, s, 1, player, 'hit', { x: 0, y: 0, targetEid: FOE });
  assert.equal(runs.length, 1, 'a living companion opens the door');
  assert.equal(stateOf(player)!.restUntil, 400, 'and the rest banks as ever');
});

test('a downed companion is no companion: the door refuses, the charge is unspent', () => {
  const { s, player, runs } = petSlate({ petEid: 5, petHp: 0 });
  call(proto.bodyMoment, s, 1, player, 'hit', { x: 0, y: 0, targetEid: FOE });
  assert.equal(runs.length, 0, 'the fallen take no boons');
  assert.equal(stateOf(player)?.restUntil ?? 0, 0, 'no rest on a working that could not answer');
  // The same wearer, the same blow, once the companion is up again.
  s.healths.get(5)!.hp = 6;
  call(proto.bodyMoment, s, 1, player, 'hit', { x: 0, y: 0, targetEid: FOE });
  assert.equal(runs.length, 1, 'a companion back on its feet hears the word');
});

/** The same slate with the REAL firing chain bound, apply doors spied. */
function petRouteSlate(opts: { petEid?: number | null } = {}) {
  const base = petSlate(opts);
  const npcLays: unknown[][] = [];
  const playerLays: unknown[][] = [];
  const s = {
    ...base.s,
    positions: new Map([
      [1, { plane: 'surface', x: 0, y: 0, dir: 0 }],
      [5, { plane: 'surface', x: 1, y: 0, dir: 0 }],
      [OTHER_PET, { plane: 'surface', x: 2, y: 0, dir: 0 }],
      [FOE, { plane: 'surface', x: 3, y: 0, dir: 0 }],
    ]),
    broadcastFx: () => {},
    applyStatusToNpc: (...a: unknown[]) => {
      npcLays.push(a);
      return true;
    },
    applyStatusToPlayer: (...a: unknown[]) => {
      playerLays.push(a);
      return true;
    },
    runProc: proto.runProc,
    runProcInner: proto.runProcInner,
  };
  return { s, player: base.player, npcLays, playerLays };
}

test("the blessing walks the pet's own apply door, with the pet's eid and the beast's style", () => {
  const { s, player, npcLays, playerLays } = petRouteSlate({ petEid: 5 });
  call(proto.bodyMoment, s, 1, player, 'hit', { x: 0, y: 0, targetEid: FOE });
  assert.equal(npcLays.length, 1, 'exactly one page was laid');
  assert.deepEqual(npcLays[0], [
    5,
    { status: 'quicken', power: 1, durationTicks: 100 },
    1,
    'beastcraft',
  ]);
  assert.equal(playerLays.length, 0, 'the wearer keeps none of it');
});

test("a pet-targeted blessing can never reach another wearer's companion or the foe in hand", () => {
  // The foe rides the moment and another wearer's hale companion
  // stands right there: only the wearer's OWN leash is a candidate.
  const { s, player, npcLays } = petRouteSlate({ petEid: 5 });
  call(proto.bodyMoment, s, 1, player, 'hit', { x: 0, y: 0, targetEid: FOE });
  assert.deepEqual(
    npcLays.map((a) => a[0]),
    [5],
    "the page went to the wearer's own companion and nowhere else",
  );
  // A wearer with no leash at all blesses nobody, however many other
  // companions stand within reach.
  const bare = petRouteSlate({ petEid: null });
  call(proto.bodyMoment, bare.s, 1, bare.player, 'hit', { x: 0, y: 0, targetEid: FOE });
  assert.equal(bare.npcLays.length, 0, 'an unleashed wearer lays nothing on anyone');
});

// ------------------------------------------ THE WRIGHT'S RHYTHM door

/** wrightcloth's word, counted at one so a single working mints. */
const craftYield = {
  kind: 'proc' as const,
  id: 'wright_working_t',
  name: 'Every Eighth Working',
  trigger: { on: 'stacks' as const, per: 'craft' as const, count: 1 },
  action: { do: 'yield' as const, extra: 1 },
  icd: 40,
  element: 'ember' as const,
};

const TWINE_RECIPE = {
  id: 'test_twine',
  name: 'Twine',
  skill: 'tailoring' as const,
  levelReq: 1,
  xp: 10,
  station: null,
  inputs: [{ item: 'plant_fibre', qty: 2 }],
  output: { item: 'twine', qty: 1 },
  ticks: 1,
};

/** The same bench, with a pan that always burns. */
const TROUT_RECIPE = {
  id: 'test_trout',
  name: 'Trout',
  skill: 'cooking' as const,
  levelReq: 1,
  xp: 10,
  station: null,
  inputs: [{ item: 'raw_trout', qty: 1 }],
  output: { item: 'trout', qty: 1 },
  ticks: 1,
  burnChance: 1,
  burnResult: 'burnt_food',
};

function craftSlate(recipe: typeof TWINE_RECIPE | typeof TROUT_RECIPE) {
  const runs: unknown[][] = [];
  const player = {
    gear: { procs: [craftYield] },
    procs: new Map(),
    inventory: emptyInventory(),
    perks: {
      materialSave: {} as Record<string, number>,
      burnChanceMult: 1,
      inscribeQuality: 0,
      craftSpeed: {} as Record<string, number>,
    },
    session: { sendJson: () => {} },
    // The bench is one tick from done, one working ordered.
    action: { kind: 'craft' as const, recipe, remaining: 1, total: 1, ticksLeft: 1 },
  };
  for (const input of recipe.inputs) addItem(player.inventory, input.item, input.qty);
  const s = {
    tickCount: 100,
    npcs: new Map(),
    chargesDirty: new Set<number>(),
    positions: new Map([[1, { plane: 'surface', x: 0, y: 0, dir: 0 }]]),
    nearTile: () => true,
    hasInputs: () => true,
    effectiveLevel: () => 1,
    grantXp: () => {},
    cancelAction: () => {},
    broadcastFx: () => {},
    bodyMoment: proto.bodyMoment,
    offerProc: proto.offerProc,
    procState: proto.procState,
    runProc: (...a: unknown[]) => {
      runs.push(a);
      return (proto.runProc as (...x: unknown[]) => number).apply(s, a);
    },
    runProcInner: proto.runProcInner,
    tickCraft: proto.tickCraft,
  };
  return { s, player, runs };
}

test("THE WRIGHT'S RHYTHM: an honest working reaches the bench door and mints the recipe's own output", () => {
  const { s, player, runs } = craftSlate(TWINE_RECIPE);
  call(proto.tickCraft, s, 1, player);
  assert.equal(runs.length, 1, 'the finished working was offered at the bench');
  assert.equal((runs[0]![3] as { style: string }).style, 'tailoring', 'the trade rides the moment');
  assert.equal(countItem(player.inventory, 'twine'), 2, 'the working came off the bench twice');
  assert.deepEqual(
    [...new Set(player.inventory.filter((sl) => sl !== null).map((sl) => sl!.item))],
    ['twine'],
    "and the mint minted the recipe's own output, nothing else",
  );
});

test('a burnt pan never reaches the bench door: no charge, no mint', () => {
  const { s, player, runs } = craftSlate(TROUT_RECIPE);
  // A roll of 0 burns it outright; the door lives past the else.
  withRolls([0], () => call(proto.tickCraft, s, 1, player));
  assert.equal(countItem(player.inventory, 'burnt_food'), 1, 'the pan burnt, as scripted');
  assert.equal(countItem(player.inventory, 'trout'), 0, 'and no fish was ever cooked');
  assert.equal(runs.length, 0, 'a failed working is no working');
  assert.equal(
    (player.procs.get('wright_working_t') as { stacks: number } | undefined)?.stacks ?? 0,
    0,
    'the rhythm counts finished workings, never burnt ones',
  );
});
