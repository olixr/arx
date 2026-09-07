import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GameServer } from './gameServer.js';
import { packChunk } from './indexes.js';
import { addItem, countItem, emptyInventory } from './inventory.js';
import type { InvSlot } from '@arx/shared';

/**
 * THE HONEST PACK (building v2, phase 0): a pickup may never destroy
 * more than the pack actually held. A merged non-stackable pile bigger
 * than the free slots is taken partially — the remainder stays on the
 * ground, and any pickup-XP grants exactly once. Both doors (explicit
 * click and the walk-over vacuum) run here against a hand-built slate,
 * poiWard-style: the methods only touch plain maps.
 */

type Fn = (...a: unknown[]) => unknown;
const proto = GameServer.prototype as unknown as {
  pickupDrop: Fn;
  takeAllDrops: Fn;
  tickDrops: Fn;
  forEachDropNear: Fn;
  speak: Fn;
};

interface Drop {
  item: string;
  qty: number;
  roll?: unknown;
  ownerEid: number | null;
  ownerUntil: number;
  despawnAt: number;
  pickupAfter: number;
  xpOnPickup?: { skill: string; xp: number };
}

function sweepSlate(
  inventory: InvSlot[],
  dropList: Drop[],
  opts: { sneaking?: boolean; autoLoot?: boolean } = {},
) {
  const sent: Array<Record<string, unknown>> = [];
  const destroyed: number[] = [];
  const xp: Array<{ skill: string; amount: number }> = [];
  const positions = new Map([[1, { plane: 'surface', x: 5.5, y: 5.5 }]]);
  const drops = new Map<number, Drop>();
  const chunkSet = new Set<number>();
  dropList.forEach((d, i) => {
    const eid = 9 + i;
    drops.set(eid, d);
    positions.set(eid, { plane: 'surface', x: 5.5, y: 5.5 });
    chunkSet.add(eid);
  });
  const player = {
    characterId: 7,
    sneaking: opts.sneaking ?? false,
    autoLoot: opts.autoLoot ?? true,
    inventory,
    session: { sendJson: (m: Record<string, unknown>) => sent.push(m) },
  };
  return {
    speak: proto.speak,
    players: new Map([[1, player]]),
    drops,
    // The vacuum reads the chunk index now (THE INDEX SERVES THE PILE).
    forEachDropNear: proto.forEachDropNear,
    chunks: new Map([['surface|0,0', chunkSet]]),
    chunkGrid: new Map([['surface', new Map([[packChunk(0, 0), chunkSet]])]]),
    graves: new Map(),
    deathMarks: new Map(),
    positions: {
      get: (eid: number) => positions.get(eid),
      must: (eid: number) => positions.get(eid)!,
    },
    grantXp: (_eid: number, _p: unknown, skill: string, amount: number) =>
      xp.push({ skill, amount }),
    removeFromChunks: () => {},
    ecs: { destroy: (eid: number) => destroyed.push(eid) },
    // observation taps
    sent,
    destroyed,
    xp,
  };
}

function slate(inventory: InvSlot[], drop: Drop, opts: { sneaking?: boolean } = {}) {
  return sweepSlate(inventory, [drop], opts);
}

function packWithFreeSlots(free: number): InvSlot[] {
  const inv = emptyInventory();
  addItem(inv, 'bronze_axe', inv.length - free);
  return inv;
}

const pile = (qty: number, extra: Partial<Drop> = {}): Drop => ({
  item: 'bronze_axe',
  qty,
  ownerEid: null,
  ownerUntil: 0,
  despawnAt: Date.now() + 60_000,
  pickupAfter: 0,
  ...extra,
});

test('explicit pickup takes a partial fit and leaves the rest', () => {
  const s = slate(packWithFreeSlots(3), pile(10));
  proto.pickupDrop.call(s, 1, 9);
  assert.equal(countItem(s.players.get(1)!.inventory, 'bronze_axe'), 28, 'pack tops out');
  const drop = s.drops.get(9)!;
  assert.equal(drop.qty, 7, 'remainder stays on the ground');
  assert.equal(s.destroyed.length, 0, 'pile entity survives a partial take');
  assert.ok(
    s.sent.some((m) => m['t'] === 'notice' && String(m['text']).includes('the rest stays')),
    'the quartermaster says so',
  );
});

test('explicit pickup of a full fit still clears the pile', () => {
  const s = slate(packWithFreeSlots(10), pile(10));
  proto.pickupDrop.call(s, 1, 9);
  assert.equal(s.drops.get(9)!.qty, 10, 'qty untouched on the taken pile');
  assert.deepEqual(s.destroyed, [9], 'pile entity destroyed');
});

test('pickup XP grants once even across a split take', () => {
  const s = slate(packWithFreeSlots(2), pile(5, { xpOnPickup: { skill: 'mining', xp: 40 } }));
  proto.pickupDrop.call(s, 1, 9);
  assert.equal(s.xp.length, 1, 'granted on the first take');
  assert.equal(s.drops.get(9)!.xpOnPickup, undefined, 'the remainder carries no second grant');
});

test('walk-over vacuum takes a partial fit without destroying the pile', () => {
  const s = slate(packWithFreeSlots(3), pile(10));
  proto.tickDrops.call(s, Date.now());
  assert.equal(countItem(s.players.get(1)!.inventory, 'bronze_axe'), 28);
  assert.equal(s.drops.get(9)!.qty, 7);
  assert.equal(s.destroyed.length, 0);
});

test('walk-over vacuum clears a pile that fully fits', () => {
  const s = slate(packWithFreeSlots(10), pile(10));
  proto.tickDrops.call(s, Date.now());
  assert.deepEqual(s.destroyed, [9]);
});

test('sneaking feet trigger no vacuum at all', () => {
  const s = slate(packWithFreeSlots(10), pile(10), { sneaking: true });
  proto.tickDrops.call(s, Date.now());
  assert.deepEqual(s.destroyed, [], 'a sneak stands in the pile untouched');
  assert.equal(countItem(s.players.get(1)!.inventory, 'bronze_axe'), 18);
});

test('THE CHOSEN HAND: auto-loot off means the vacuum never serves', () => {
  const s = sweepSlate(packWithFreeSlots(10), [pile(10)], { autoLoot: false });
  proto.tickDrops.call(s, Date.now());
  assert.deepEqual(s.destroyed, [], 'the pile lies where it fell');
  assert.equal(countItem(s.players.get(1)!.inventory, 'bronze_axe'), 18);
});

test('ONE SWEEP: take-all clears every reachable pile with one inventory push', () => {
  const s = sweepSlate(packWithFreeSlots(10), [pile(2), pile(3), pile(1)]);
  proto.takeAllDrops.call(s, 1);
  assert.equal(countItem(s.players.get(1)!.inventory, 'bronze_axe'), 24, 'all six axes taken');
  assert.deepEqual([...s.destroyed].sort((a, b) => a - b), [9, 10, 11], 'every pile entity destroyed');
  assert.equal(s.sent.filter((m) => m['t'] === 'inv').length, 1, 'ONE inventory push');
  assert.equal(s.sent.filter((m) => m['t'] === 'notice').length, 0, 'no refusal when all fits');
});

test('ONE ANSWER: however many piles refuse, the sweep speaks pack-full once', () => {
  const s = sweepSlate(packWithFreeSlots(1), [pile(1), pile(1), pile(1)]);
  proto.takeAllDrops.call(s, 1);
  assert.equal(countItem(s.players.get(1)!.inventory, 'bronze_axe'), 28, 'the one slot filled');
  assert.equal(s.destroyed.length, 1, 'one pile taken, two remain');
  const notices = s.sent.filter((m) => m['t'] === 'notice');
  assert.equal(notices.length, 1, 'exactly one coalesced refusal');
  assert.ok(String(notices[0]!['text']).includes('stays where it fell'));
  assert.equal(s.sent.filter((m) => m['t'] === 'inv').length, 1);
});

test('the sweep spends a tight pack on the payoff first (rarity order)', () => {
  const s = sweepSlate(packWithFreeSlots(1), [
    pile(1),
    pile(1, { roll: { rar: 'rare', seed: 41 } }),
  ]);
  proto.takeAllDrops.call(s, 1);
  assert.deepEqual(s.destroyed, [10], 'the rare pile was taken');
  const kept = s.players.get(1)!.inventory.find((slot) => (slot?.roll as { rar?: string } | undefined)?.rar === 'rare');
  assert.ok(kept, 'the rare instance is in the pack');
  assert.equal(s.drops.get(9)!.qty, 1, 'the common pile still lies there');
});

test("the sweep skips another hand's live claim in silence", () => {
  const now = Date.now();
  const s = sweepSlate(packWithFreeSlots(10), [
    pile(2, { ownerEid: 4, ownerUntil: now + 30_000 }),
    pile(3),
  ]);
  proto.takeAllDrops.call(s, 1);
  assert.deepEqual(s.destroyed, [10], 'only the free pile was taken');
  assert.ok(
    !s.sent.some((m) => m['t'] === 'notice' && String(m['text']).includes('belongs to another')),
    'a sweep never nags about spoils it was not owed',
  );
});

test('take-all grants pickup XP exactly once per pile', () => {
  const s = sweepSlate(packWithFreeSlots(10), [
    pile(1, { xpOnPickup: { skill: 'farming', xp: 4 } }),
    pile(1, { xpOnPickup: { skill: 'farming', xp: 4 } }),
  ]);
  proto.takeAllDrops.call(s, 1);
  assert.equal(s.xp.length, 2, 'each pile pays its own xp once');
});
