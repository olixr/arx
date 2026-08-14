import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FACTIONS } from '@arx/content';
import { GameServer } from './gameServer.js';
import { emptyInventory, addItem, countItem } from './inventory.js';

/**
 * THE LIGHT FINGERS (docs/factions-plan.md Phase 5) — the pickpocket
 * verb, the witness law, and the fence law, exercised for real on
 * minimal fake hosts (the standing/enforce rig pattern).
 */

type AnyFn = (...args: never[]) => unknown;
const proto = GameServer.prototype as unknown as {
  pickpocket: AnyFn;
  sayAloud: AnyFn;
  theftWitnesses: AnyFn;
  chargeTheft: AnyFn;
  creditDeed: AnyFn;
  creditStanding: AnyFn;
  playerBandWith: AnyFn;
  factionOfShop: AnyFn;
  shopOp: AnyFn;
};

interface FakePlayer {
  characterId: number;
  standing: Map<string, number>;
  repSig: string;
  flags: Map<string, number>;
  inventory: ReturnType<typeof emptyInventory>;
  markWary: Map<number, number>;
  session: { sendJson: () => void };
}

function slate(opts: {
  markSlug?: string;
  markRows?: Array<{ item: string; qty: number }>;
  witnessSlug?: string;
  standing?: Record<string, number>;
  walled?: boolean;
}): { s: Record<string, unknown>; player: FakePlayer } {
  const player: FakePlayer = {
    characterId: 7,
    standing: new Map(Object.entries(opts.standing ?? {})),
    repSig: '',
    flags: new Map(),
    inventory: emptyInventory(),
    markWary: new Map(),
    session: { sendJson: () => {} },
  };
  const actors = new Map<number, { actor: Record<string, unknown> }>();
  if (opts.markSlug) {
    actors.set(21, { actor: { id: opts.markSlug, name: 'Mark', inventory: opts.markRows } });
  }
  if (opts.witnessSlug) {
    actors.set(31, { actor: { id: opts.witnessSlug, name: 'Witness' } });
  }
  const s: Record<string, unknown> = {
    tickCount: 100,
    players: new Map([[11, player]]),
    positions: new Map([
      [11, { x: 5, y: 5, dir: 0 }],
      [21, { x: 6, y: 5, dir: 0 }],
      [31, { x: 9, y: 5, dir: 0 }],
    ]),
    actors,
    npcs: new Map(),
    sessions: [],
    // A wall column at x=7 seals the witness's line when asked for.
    world: {
      isSolid: (px: number) => opts.walled === true && px === 7,
    },
    effectiveLevel: () => 50,
    grantXp: () => {},
    revealPlayer: () => {},
    pickpocket: proto.pickpocket,
    // THE SPOKEN AIR: the caught cry leaves through the public door
    // now — the slate's empty sessions list keeps it a dry run.
    sayAloud: proto.sayAloud,
    theftWitnesses: proto.theftWitnesses,
    chargeTheft: proto.chargeTheft,
    creditDeed: proto.creditDeed,
    creditStanding: proto.creditStanding,
    playerBandWith: proto.playerBandWith,
    pushRep: () => {},
    pushQuestAvail: () => {},
    accounts: { saveStanding: () => {} },
  };
  return { s, player };
}

/** Run the lift with a scripted Math.random (row pick, then the roll). */
function lift(s: Record<string, unknown>, rolls: number[]): string[] {
  const lines: string[] = [];
  const real = Math.random;
  let i = 0;
  Math.random = () => rolls[Math.min(i++, rolls.length - 1)]!;
  try {
    (proto.pickpocket as (...a: unknown[]) => void).call(
      s,
      11,
      (s.players as Map<number, FakePlayer>).get(11),
      { x: 5, y: 5, dir: 0 },
      21,
      (s.actors as Map<number, unknown>).get(21),
      { x: 6, y: 5, dir: 0 },
      (t: string) => lines.push(t),
    );
  } finally {
    Math.random = real;
  }
  return lines;
}

test('a clean lift skims one row and stays quiet', () => {
  const { s, player } = slate({
    markSlug: 'grocer_merra',
    markRows: [{ item: 'twine', qty: 5 }],
  });
  lift(s, [0, 0]); // row 0, roll 0 < chance → success
  const slot = player.inventory.find((x) => x !== null);
  assert.ok(slot, 'the goods landed');
  assert.equal(slot.item, 'twine');
  assert.equal(slot.qty, 1, 'one unit, not the pocket');
  assert.equal(slot.stolen, true, 'goods carry the facet');
  assert.equal(player.standing.size, 0, 'a clean lift moves no ledger');
});

test('coin is coin: skims cap at the doc and stay honest', () => {
  const { s, player } = slate({
    markSlug: 'grocer_merra',
    markRows: [{ item: 'coins', qty: 400 }],
  });
  lift(s, [0, 0]);
  const slot = player.inventory.find((x) => x !== null);
  assert.ok(slot);
  assert.equal(slot.qty, FACTIONS.theft.coinCap, 'the cap meters the take');
  assert.equal(slot.stolen, undefined, 'coins never carry the facet');
});

test('THE WITNESS LAW: a seen failure charges, an unseen one does not', () => {
  // The mark itself is a faction member — its own eyes suffice.
  const seen = slate({ markSlug: 'grocer_merra', markRows: [{ item: 'twine', qty: 5 }] });
  lift(seen.s, [0, 0.99]); // roll fails
  assert.equal(
    seen.player.standing.get('fordgate'),
    FACTIONS.deeds.theftWitnessed,
    'the mark saw the hand',
  );
  // An unaffiliated mark, nobody else around: wary, but unswayed.
  const alone = slate({ markSlug: 'nameless_peddler', markRows: [{ item: 'twine', qty: 5 }] });
  lift(alone.s, [0, 0.99]);
  assert.equal(alone.player.standing.size, 0, 'unseen is unswayed');
  assert.ok(alone.player.markWary.get(21)! > Date.now(), 'the mark is wary all the same');
});

test('a wall seals a witness; an open lane does not', () => {
  // Unaffiliated mark, faction witness at x=9 — with a wall between.
  const walled = slate({
    markSlug: 'nameless_peddler',
    markRows: [{ item: 'twine', qty: 5 }],
    witnessSlug: 'banker_cormund',
    walled: true,
  });
  lift(walled.s, [0, 0.99]);
  assert.equal(walled.player.standing.size, 0, 'a wall is a wall');

  const open = slate({
    markSlug: 'nameless_peddler',
    markRows: [{ item: 'twine', qty: 5 }],
    witnessSlug: 'banker_cormund',
  });
  lift(open.s, [0, 0.99]);
  assert.equal(
    open.player.standing.get('fordgate'),
    FACTIONS.deeds.theftWitnessed,
    'the banker reads ledgers for a living',
  );
});

test('the mark stays wary — no second lift inside the window', () => {
  const { s, player } = slate({
    markSlug: 'grocer_merra',
    markRows: [{ item: 'twine', qty: 5 }],
  });
  lift(s, [0, 0]);
  const lines = lift(s, [0, 0]);
  assert.ok(lines.some((l) => l.includes('wary')), 'the window refuses the same hand');
  assert.equal(countItem(player.inventory, 'twine'), 0, 'stolen twine is not honest twine');
  assert.equal(player.inventory.filter((x) => x !== null).length, 1, 'and only one lift landed');
});

// ------------------------------------------------------- the fence law

function shopSlate(opts: { keeperSlug: string; shopId: string; standing?: Record<string, number> }): {
  s: Record<string, unknown>;
  player: FakePlayer;
} {
  const { s, player } = slate({ standing: opts.standing });
  s.actorDefs = new Map([[opts.keeperSlug, { shop: opts.shopId }]]);
  s.nearTile = () => false;
  s.nearShopkeeper = () => true;
  s.factionOfShop = proto.factionOfShop;
  s.shopOp = proto.shopOp;
  return { s, player };
}

test('THE FENCE LAW: honest counters refuse, the fence pays', () => {
  const town = shopSlate({ keeperSlug: 'grocer_merra', shopId: 'merra_goods' });
  addItem(town.player.inventory, 'twine', 2, undefined, true);
  const idx = town.player.inventory.findIndex((x) => x !== null);
  (proto.shopOp as (...a: unknown[]) => void).call(town.s, 11, 'sell', 'twine', 1, idx, 'merra_goods');
  assert.equal(countItem(town.player.inventory, 'coins'), 0, 'no honest coin for stolen goods');
  assert.equal(town.player.inventory[idx]?.qty, 2, 'the goods stay in the pack');

  const fence = shopSlate({ keeperSlug: 'fence_calder', shopId: 'calder_goods' });
  addItem(fence.player.inventory, 'twine', 2, undefined, true);
  const fdx = fence.player.inventory.findIndex((x) => x !== null);
  (proto.shopOp as (...a: unknown[]) => void).call(
    fence.s,
    11,
    'sell',
    'twine',
    1,
    fdx,
    'calder_goods',
  );
  assert.ok(countItem(fence.player.inventory, 'coins') >= 1, 'the fence asks no questions');
});

test('quest items are not stock — the counter refuses instead of eating them', () => {
  const town = shopSlate({ keeperSlug: 'grocer_merra', shopId: 'merra_goods' });
  addItem(town.player.inventory, 'reavers_mark', 1);
  const idx = town.player.inventory.findIndex((x) => x !== null);
  (proto.shopOp as (...a: unknown[]) => void).call(
    town.s,
    11,
    'sell',
    'reavers_mark',
    1,
    idx,
    'merra_goods',
  );
  assert.equal(countItem(town.player.inventory, 'reavers_mark'), 1, 'the errand survives');
  assert.equal(countItem(town.player.inventory, 'coins'), 0);
});
