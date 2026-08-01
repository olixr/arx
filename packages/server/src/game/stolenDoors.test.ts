import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GameServer } from './gameServer.js';
import { addItem, countItem, emptyInventory } from './inventory.js';

/**
 * NO LAUNDERING, walked door to door against the 2026-07 audit:
 *
 * - useItem consumes the CLICKED slot, so a stolen consumable is
 *   destroyed by its own use instead of working forever;
 * - stolen gear cannot be equipped (EquippedItem has no facet to
 *   carry, so the body would hand it back honest);
 * - sunder refuses hot goods exactly as the unmaking does;
 * - id-addressed shop sales refuse non-stackable defs (the
 *   instance-addressing law: removeItem would erase a roll unpriced).
 *
 * Hand-built slates over GameServer.prototype (the theft rig pattern).
 */

type AnyFn = (...args: never[]) => unknown;
const proto = GameServer.prototype as unknown as {
  useItem: AnyFn;
  sunder: AnyFn;
  shopOp: AnyFn;
};

const call = (fn: AnyFn, self: unknown, ...args: unknown[]): unknown =>
  (fn as (...a: unknown[]) => unknown).call(self, ...args);

function useSlate(opts: { hp?: number } = {}) {
  const lines: string[] = [];
  const health = { hp: opts.hp ?? 5, maxHp: 20 };
  const player: Record<string, unknown> = {
    characterId: 7,
    inventory: emptyInventory(),
    equipment: {},
    skills: {},
    perks: { foodHealMult: 1 },
    buffs: [],
    knownRecipes: new Set(),
    session: {
      sendJson: (m: { t: string; text?: string }) => {
        if (m.t === 'chat' && m.text) lines.push(m.text);
      },
    },
  };
  const s = {
    players: new Map([[1, player]]),
    healths: { must: () => health, get: () => health },
    positions: new Map([[1, { x: 0, y: 0, dir: 0 }]]),
    useItem: proto.useItem,
    equippedShield: (GameServer.prototype as unknown as { equippedShield: AnyFn }).equippedShield,
    deepenTarget: (GameServer.prototype as unknown as { deepenTarget: AnyFn }).deepenTarget,
    onEquipmentChanged: () => {},
    broadcastFx: () => {},
    grantXp: () => {},
  };
  return { s, player, health, lines };
}

test('a stolen loaf eaten is destroyed, and the bite really lands', () => {
  const { s, player, health } = useSlate({ hp: 5 });
  const inv = player.inventory as ReturnType<typeof emptyInventory>;
  inv[0] = { item: 'trout', qty: 1, stolen: true };
  call(proto.useItem, s, 1, 0);
  assert.equal(inv[0], null, 'the stolen trout is gone with the eating');
  assert.equal(health.hp, 9, 'and it fed the eater exactly once');
});

test('no consumption, no effect: full health refuses and keeps the slot', () => {
  const { s, player, health } = useSlate({ hp: 20 });
  const inv = player.inventory as ReturnType<typeof emptyInventory>;
  inv[0] = { item: 'trout', qty: 1, stolen: true };
  call(proto.useItem, s, 1, 0);
  assert.ok(inv[0], 'nothing was consumed');
  assert.equal(health.hp, 20);
});

test('stolen gear never reaches the body: equip refuses, plain and slot intact', () => {
  const { s, player, lines } = useSlate();
  const inv = player.inventory as ReturnType<typeof emptyInventory>;
  const roll = { rar: 'rare' as const, seed: 3 };
  inv[0] = { item: 'bronze_sword', qty: 1, roll, stolen: true };
  // A worn blade makes this the SWAP path — the refusal must cover it.
  (player.equipment as Record<string, unknown>).weapon = {
    id: 'bronze_sword',
    roll: { rar: 'common', seed: 0 },
  };
  call(proto.useItem, s, 1, 0);
  assert.equal(
    (player.equipment as { weapon: { roll: { seed: number } } }).weapon.roll.seed,
    0,
    'the worn blade never moved',
  );
  assert.ok(inv[0]?.stolen, 'the hot piece stays in the pack, facet and all');
  assert.equal(lines.length, 1);
  assert.match(lines[0]!, /hot/i);
  assert.doesNotMatch(lines[0]!, /—|–|--/, 'the refusal keeps the dash ban');
});

test('sunder refuses hot goods exactly as the unmaking does', () => {
  const lines: string[] = [];
  const roll = { rar: 'rare' as const, seed: 3, ench: 'keen_edge', q: 0 };
  const player = {
    inventory: emptyInventory(),
    equipment: {},
    session: {
      sendJson: (m: { t: string; text?: string }) => {
        if (m.t === 'chat' && m.text) lines.push(m.text);
      },
    },
  };
  player.inventory[0] = { item: 'bronze_sword', qty: 1, roll, stolen: true };
  const s = {
    players: new Map([[1, player]]),
    nearTile: () => true,
    positions: new Map([[1, { x: 0, y: 0, dir: 0 }]]),
    onEquipmentChanged: () => {},
    grantXp: () => {},
    broadcastFx: () => {},
    sunder: proto.sunder,
  };
  call(proto.sunder, s, 1, 0, undefined, 'ward');
  assert.equal(roll.ench, 'keen_edge', 'the working stays in the hot steel');
  assert.equal(lines.length, 1);
  assert.match(lines[0]!, /hot/i);
  assert.doesNotMatch(lines[0]!, /—|–|--/, 'the refusal keeps the dash ban');
});

function shopSlate() {
  const player = {
    inventory: emptyInventory(),
    session: { sendJson: () => {} },
  };
  const s = {
    players: new Map([[1, player]]),
    nearTile: () => true,
    nearShopkeeper: () => false,
    factionOfShop: () => null,
    shopOp: proto.shopOp,
  };
  return { s, player };
}

test('an id-addressed sale refuses non-stackable defs: gear must name its slot', () => {
  const { s, player } = shopSlate();
  addItem(player.inventory, 'bronze_sword', 1, { rar: 'legendary', seed: 9 });
  call(proto.shopOp, s, 1, 'sell', 'bronze_sword', 1, undefined, 'general_store');
  assert.equal(countItem(player.inventory, 'bronze_sword'), 1, 'the instance never left');
  assert.equal(countItem(player.inventory, 'coins'), 0, 'and no coin pretended it did');
});

test('id-addressed sales still move stackable materials', () => {
  const { s, player } = shopSlate();
  addItem(player.inventory, 'twine', 4);
  call(proto.shopOp, s, 1, 'sell', 'twine', 4, undefined, 'general_store');
  assert.equal(countItem(player.inventory, 'twine'), 0);
  assert.ok(countItem(player.inventory, 'coins') > 0);
});
