import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GameServer } from './gameServer.js';
import { packChunk } from './indexes.js';
import { addItem, countItem, emptyInventory } from './inventory.js';
import { DUNGEON_KEY_ITEM, dungeonSpecFromRoll, keyForgePrice, keyUsesForTier } from '@arx/shared';
import type { InvSlot, ItemRoll, KeyLore } from '@arx/shared';
import * as keySys from './keyring.js';

/**
 * THE KEY RING: dungeon keys never enter the pack — both pickup doors
 * (explicit click, walk-over vacuum) clip them onto the ring even
 * with a FULL pack; the drop verb sets a key back down carrying its
 * whole roll; THE WORN WARD spends a use per fresh cut, refuses a
 * spent key, re-enters a standing run free, and crumbles worn keys
 * only when their own door is closed. All against hand-built slates
 * (the pickup.test idiom) — the methods only touch plain maps.
 */

type Fn = (...a: unknown[]) => unknown;
const proto = GameServer.prototype as unknown as {
  pickupDrop: Fn;
  tickDrops: Fn;
  forEachDropNear: Fn;
  keyDrop: Fn;
  useKey: Fn;
  sweepWornKeys: Fn;
  addKeyToRing: Fn;
  sendKeyRing: Fn;
  sendKeyLore: Fn;
  recordKeyLore: Fn;
  keyLabel: Fn;
  keyForge: Fn;
  keywrightNear: Fn;
  speak: Fn;
};

interface Drop {
  item: string;
  qty: number;
  roll?: ItemRoll;
  ownerEid: number | null;
  ownerUntil: number;
  despawnAt: number;
  pickupAfter: number;
}

const keyRoll = (uses?: number, seed = 42): ItemRoll => ({
  rar: 'common',
  seed,
  pwr: 6,
  ...(uses !== undefined ? { uses } : {}),
});

const keyPile = (roll: ItemRoll, qty = 1): Drop => ({
  item: DUNGEON_KEY_ITEM,
  qty,
  roll,
  ownerEid: null,
  ownerUntil: 0,
  despawnAt: Date.now() + 60_000,
  pickupAfter: 0,
});

function slate(inventory: InvSlot[], drop: Drop | null, ring: Array<{ id: number; roll: ItemRoll }> = []) {
  const sent: Array<Record<string, unknown>> = [];
  const destroyed: number[] = [];
  const placed: Array<Record<string, unknown>> = [];
  const positions = new Map([
    [1, { plane: 'surface', x: 5.5, y: 5.5, dir: 0 }],
    [9, { plane: 'surface', x: 5.5, y: 5.5, dir: 0 }],
  ]);
  const player = {
    characterId: 7,
    sneaking: false,
    autoLoot: true,
    inventory,
    keyRing: ring,
    keyRingDirty: false,
    keyLore: new Map<number, KeyLore>(),
    discoveries: new Set<string>(),
    session: { sendJson: (m: Record<string, unknown>) => sent.push(m) },
  };
  positions.set(50, { plane: 'surface', x: 6.5, y: 5.5, dir: 0 }); // the Keywright's bench
  const loreWrites: KeyLore[] = [];
  const labelWrites: Array<{ seed: number; label: string | null }> = [];
  return {
    speak: proto.speak,
    addKeyToRing: proto.addKeyToRing,
    sendKeyRing: proto.sendKeyRing,
    sendKeyLore: proto.sendKeyLore,
    recordKeyLore: proto.recordKeyLore,
    sweepWornKeys: proto.sweepWornKeys,
    keywrightNear: proto.keywrightNear,
    nextKeyRingId: 100,
    players: new Map([[1, player]]),
    drops: new Map(drop ? [[9, drop]] : []),
    // The vacuum reads the chunk index now (THE INDEX SERVES THE PILE).
    forEachDropNear: proto.forEachDropNear,
    chunks: new Map(drop ? [['surface|0,0', new Set([9])]] : []),
    chunkGrid: new Map(drop ? [['surface', new Map([[packChunk(0, 0), new Set([9])]])]] : []),
    dungeons: new Map<number, { seed: number; tier: string; power: number }>(),
    graves: new Map(),
    deathMarks: new Map(),
    characterEids: new Map([[7, 1]]),
    actors: new Map([[50, { actor: { id: 'keywright_orla' } }]]),
    accounts: {
      upsertKeyLore: (_cid: number, lore: KeyLore) => loreWrites.push(lore),
      labelKeyLore: (_cid: number, seed: number, label: string | null) =>
        labelWrites.push({ seed, label }),
    },
    loreWrites,
    labelWrites,
    positions: {
      get: (eid: number) => positions.get(eid),
      must: (eid: number) => positions.get(eid)!,
    },
    world: { isSolid: () => false },
    worldOf: () => ({ isSolid: () => false }),
    grantXp: () => {},
    removeFromChunks: () => {},
    recordDiscovery: () => {},
    riftgateNear: () => ({ x: 5, y: 5 }),
    placeDrop: (_plane: string, item: string, qty: number, _x: number, _y: number, comp: Record<string, unknown>) => {
      placed.push({ item, qty, ...comp });
      return 99;
    },
    enterDungeon: (..._a: unknown[]) => {
      entered.push(1);
    },
    ecs: { destroy: (eid: number) => destroyed.push(eid) },
    // observation taps
    sent,
    destroyed,
    placed,
    player,
  };
}

const entered: number[] = [];

function fullPack(): InvSlot[] {
  const inv = emptyInventory();
  addItem(inv, 'bronze_axe', inv.length);
  return inv;
}

test('pickupDrop clips a key onto the ring even with a FULL pack', () => {
  const s = slate(fullPack(), keyPile(keyRoll(2)));
  proto.pickupDrop.call(s, 1, 9);
  assert.equal(s.player.keyRing.length, 1);
  assert.equal(s.player.keyRing[0]!.roll.uses, 2);
  assert.equal(s.player.keyRingDirty, true);
  assert.deepEqual(s.destroyed, [9]); // the ground key is gone
  assert.ok(s.sent.some((m) => m.t === 'keyring'), 'the ring mirror rides the wire');
  // The pack never gained a slot — keys don't live there.
  assert.ok(s.player.inventory.every((slot) => slot?.item !== DUNGEON_KEY_ITEM));
});

test('the walk-over vacuum clips keys too, one ring row per merged twin', () => {
  const s = slate(fullPack(), keyPile(keyRoll(1), 2)); // twin pile of 2
  proto.tickDrops.call(s, Date.now());
  assert.equal(s.player.keyRing.length, 2);
  assert.deepEqual(s.destroyed, [9]);
});

test('keyDrop sets the key down carrying its whole roll, worn uses included', () => {
  const ring = [{ id: 5, roll: keyRoll(1, 777) }];
  const s = slate(emptyInventory(), null, ring);
  proto.keyDrop.call(s, 1, 5);
  assert.equal(s.player.keyRing.length, 0);
  assert.equal(s.placed.length, 1);
  assert.equal(s.placed[0]!.item, DUNGEON_KEY_ITEM);
  assert.deepEqual(s.placed[0]!.roll, keyRoll(1, 777));
  assert.ok(s.sent.some((m) => m.t === 'keyring'));
});

test('keyDrop of an unknown id is a quiet no-op', () => {
  const s = slate(emptyInventory(), null, [{ id: 5, roll: keyRoll(1) }]);
  proto.keyDrop.call(s, 1, 999);
  assert.equal(s.player.keyRing.length, 1);
  assert.equal(s.placed.length, 0);
});

test('THE WORN WARD: a fresh cut spends one use, stamped on the roll', () => {
  entered.length = 0;
  const ring = [{ id: 5, roll: keyRoll(2, 42) }];
  const s = slate(emptyInventory(), null, ring);
  proto.useKey.call(s, 1, 5);
  assert.equal(entered.length, 1, 'the cut happened');
  assert.equal(ring[0]!.roll.uses, 1, 'one turn spent');
  assert.ok(s.sent.some((m) => m.t === 'keyring'));
});

test('a spent key is refused at the gate — no cut, no decrement below zero', () => {
  entered.length = 0;
  const ring = [{ id: 5, roll: keyRoll(0, 42) }];
  const s = slate(emptyInventory(), null, ring);
  proto.useKey.call(s, 1, 5);
  assert.equal(entered.length, 0, 'the gate refused');
  assert.equal(ring[0]!.roll.uses, 0);
});

test('re-entering the standing run is free — even on a spent key', () => {
  entered.length = 0;
  const roll = keyRoll(0, 42);
  const spec = dungeonSpecFromRoll(roll);
  const ring = [{ id: 5, roll }];
  const s = slate(emptyInventory(), null, ring);
  s.dungeons.set(7, { seed: spec.seed, tier: spec.tier, power: spec.power });
  proto.useKey.call(s, 1, 5);
  assert.equal(entered.length, 1, 'the open door still answers');
  assert.equal(roll.uses, 0, 're-entry never spends');
});

test('sweepWornKeys crumbles spent keys but spares the live run and legacy grace', () => {
  const worn = { id: 1, roll: keyRoll(0, 10) };
  const liveWorn = { id: 2, roll: keyRoll(0, 20) };
  const fresh = { id: 3, roll: keyRoll(2, 30) };
  const legacy = { id: 4, roll: { rar: 'rare', seed: 40 } as ItemRoll }; // absent uses = whole
  const s = slate(emptyInventory(), null, [worn, liveWorn, fresh, legacy]);
  const liveSpec = dungeonSpecFromRoll(liveWorn.roll);
  s.dungeons.set(7, { seed: liveSpec.seed, tier: liveSpec.tier, power: liveSpec.power });
  proto.sweepWornKeys.call(s, s.player);
  assert.deepEqual(
    s.player.keyRing.map((k: { id: number }) => k.id),
    [2, 3, 4],
    'only the closed-door spent key crumbled',
  );
  assert.ok(s.sent.some((m) => m.t === 'keyring'));
});

test('a fresh mint carries the full tier budget on the wire law', () => {
  // The content mint (stampRoll) is pinned in content tests; here we
  // pin the shared law the server leans on for grants and sweeps.
  assert.equal(keyUsesForTier('common') >= 1, true);
  assert.equal(keyUsesForTier('legendary') >= keyUsesForTier('common'), true);
});

// ------------------------------------------------- THE KEY LEDGER

test('a key landing on the ring writes the ledger exactly once', () => {
  const s = slate(emptyInventory(), null);
  proto.addKeyToRing.call(s, s.player, keyRoll(3, 777));
  proto.addKeyToRing.call(s, s.player, keyRoll(1, 777)); // same door again
  proto.addKeyToRing.call(s, s.player, keyRoll(3, 888));
  assert.equal(s.player.keyLore.size, 2, 'one row per seed, forever');
  assert.equal(s.loreWrites.length, 2, 'first touch persists, later touches never re-write');
  assert.ok(s.sent.some((m) => m.t === 'keylore'), 'the ledger mirror rides the wire');
});

test('the margin note takes a clean label, refuses ink not worth keeping', () => {
  const s = slate(emptyInventory(), null);
  proto.recordKeyLore.call(s, s.player, keyRoll(3, 777));
  proto.keyLabel.call(s, 1, 777, 'The Money Run');
  assert.equal(s.player.keyLore.get(777)!.label, 'The Money Run');
  assert.deepEqual(s.labelWrites.at(-1), { seed: 777, label: 'The Money Run' });
  proto.keyLabel.call(s, 1, 777, '   '); // clearing
  assert.equal(s.player.keyLore.get(777)!.label, undefined);
  proto.keyLabel.call(s, 1, 777, '!!!'); // unworthy ink — refused, spoken
  assert.equal(s.player.keyLore.get(777)!.label, undefined);
  assert.ok(
    s.sent.some((m) => typeof m.text === 'string' && (m.text as string).includes('will not take')),
  );
});

test('THE KEYWRIGHT: a lost door is cut again for the tier price, whole', () => {
  const inv = emptyInventory();
  addItem(inv, 'coins', 10_000);
  const s = slate(inv, null);
  const lore: KeyLore = { seed: 777, rar: 'rare', pwr: 31 };
  s.player.keyLore.set(777, lore);
  proto.keyForge.call(s, 1, 777);
  assert.equal(s.player.keyRing.length, 1, 'the door hangs again');
  const cut = s.player.keyRing[0]!.roll;
  assert.equal(cut.seed, 777, 'the SAME halls (seed-is-the-dungeon)');
  assert.equal(cut.rar, 'rare');
  assert.equal(cut.pwr, 31);
  assert.equal(cut.uses, keyUsesForTier('rare'), 'a full fresh ward');
  assert.equal(countItem(s.player.inventory, 'coins'), 10_000 - keyForgePrice('rare'));
});

test('the forge refuses: away from the bench, unknown doors, held copies, light purses', () => {
  // Away from the bench.
  const far = slate(emptyInventory(), null);
  (far.positions as { get: (e: number) => { x: number; y: number } | undefined }) = {
    get: (e: number) => (e === 1 ? { x: 500, y: 500 } : undefined),
  } as never;
  far.player.keyLore.set(777, { seed: 777, rar: 'common' });
  proto.keyForge.call(far, 1, 777);
  assert.equal(far.player.keyRing.length, 0);

  const s = slate(emptyInventory(), null);
  addItem(s.player.inventory, 'coins', 10_000);
  // Unknown door.
  proto.keyForge.call(s, 1, 424242);
  assert.equal(s.player.keyRing.length, 0, 'the ledger holds only what the hands have known');
  // Held copy (THE ONE COPY).
  s.player.keyLore.set(777, { seed: 777, rar: 'common' });
  s.player.keyRing.push({ id: 5, roll: keyRoll(1, 777) });
  proto.keyForge.call(s, 1, 777);
  assert.equal(s.player.keyRing.length, 1, 'the forge cuts lost doors, not copies');
  // Light purse.
  const poor = slate(emptyInventory(), null);
  poor.player.keyLore.set(888, { seed: 888, rar: 'legendary' });
  proto.keyForge.call(poor, 1, 888);
  assert.equal(poor.player.keyRing.length, 0);
  assert.equal(countItem(poor.player.inventory, 'coins'), 0);
});

// ---- THE DOOR, DIRECT (core audit 2026-09, Band A).

test('mintFreshKeyRoll / addKeyToRing direct === delegator on the same dice', () => {
  const real = Math.random;
  const mint = (via: 'module' | 'class') => {
    Math.random = () => 0.25;
    try {
      return via === 'module' ? keySys.mintFreshKeyRoll({} as never) : (GameServer.prototype as unknown as { mintFreshKeyRoll: () => ItemRoll }).mintFreshKeyRoll.call({});
    } finally {
      Math.random = real;
    }
  };
  const roll = mint('module');
  assert.deepEqual(mint('class'), roll);
  assert.equal(roll.rar, 'common');
  assert.equal(roll.seed, Math.floor(0.25 * 0x100000000) >>> 0);
  assert.equal(roll.uses, keyUsesForTier('common'));
  const ring = (via: 'module' | 'class') => {
    const sent: unknown[] = [];
    const player = { keyRing: [] as unknown[], nextKeyId: 1, session: { sendJson: (m: unknown) => sent.push(m) } };
    const s = {
      sendKeyRing: (p: unknown) => sent.push(['ring', (p as { keyRing: unknown[] }).keyRing.length]),
      recordKeyLore: (_p: unknown, r: ItemRoll) => sent.push(['lore', r.seed]),
    } as unknown as GameServer;
    const row =
      via === 'module'
        ? keySys.addKeyToRing(s, player as never, roll, true)
        : (proto.addKeyToRing.call(s, player as never, roll as never, true as never) as { id: number; roll: ItemRoll });
    return { row, ring: player.keyRing, sent };
  };
  const a = ring('module');
  assert.deepEqual(ring('class'), a);
  assert.equal(a.ring.length, 1);
  assert.deepEqual(a.row.roll, roll);
});
