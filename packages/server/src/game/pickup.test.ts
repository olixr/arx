import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GameServer } from './gameServer.js';
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
const proto = GameServer.prototype as unknown as { pickupDrop: Fn; tickDrops: Fn };

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

function slate(inventory: InvSlot[], drop: Drop, opts: { sneaking?: boolean } = {}) {
  const sent: Array<Record<string, unknown>> = [];
  const destroyed: number[] = [];
  const xp: Array<{ skill: string; amount: number }> = [];
  const positions = new Map([
    [1, { x: 5.5, y: 5.5 }],
    [9, { x: 5.5, y: 5.5 }],
  ]);
  const player = {
    characterId: 7,
    sneaking: opts.sneaking ?? false,
    inventory,
    session: { sendJson: (m: Record<string, unknown>) => sent.push(m) },
  };
  return {
    players: new Map([[1, player]]),
    drops: new Map([[9, drop]]),
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
    s.sent.some((m) => m['t'] === 'chat' && String(m['text']).includes('the rest stays')),
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
