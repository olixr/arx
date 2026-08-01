import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GameServer } from './gameServer.js';
import { emptyInventory } from './inventory.js';

/**
 * Bench ceremony fixes from the 2026-07 audit:
 *
 * - the deepening routes through onEquipmentChanged, so the worn
 *   instance's new shape reaches every mirror at once;
 * - a block-woken working refuses any offhand that is not a shield
 *   (bonded to a quiver it would be silent forever);
 * - the sunder message tells the truth about a deepened piece.
 */

type AnyFn = (...args: never[]) => unknown;
const proto = GameServer.prototype as unknown as {
  useItem: AnyFn;
  sunder: AnyFn;
  deepenTarget: AnyFn;
  equippedShield: AnyFn;
};

const call = (fn: AnyFn, self: unknown, ...args: unknown[]): unknown =>
  (fn as (...a: unknown[]) => unknown).call(self, ...args);

function benchSlate() {
  const lines: string[] = [];
  const equipChanges: unknown[] = [];
  const player: Record<string, unknown> = {
    characterId: 7,
    inventory: emptyInventory(),
    equipment: {} as Record<string, { id: string; roll?: Record<string, unknown> }>,
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
    positions: new Map([[1, { x: 0, y: 0, dir: 0 }]]),
    healths: { must: () => ({ hp: 10, maxHp: 20 }) },
    nearTile: () => true,
    useItem: proto.useItem,
    sunder: proto.sunder,
    deepenTarget: proto.deepenTarget,
    equippedShield: proto.equippedShield,
    onEquipmentChanged: (...a: unknown[]) => equipChanges.push(a),
    broadcastFx: () => {},
    grantXp: () => {},
  };
  return { s, player, lines, equipChanges };
}

test('the deepening broadcasts the worn change like bond and sunder do', () => {
  const { s, player, equipChanges } = benchSlate();
  const inv = player.inventory as ReturnType<typeof emptyInventory>;
  inv[0] = { item: 'deepening_sigil', qty: 1 };
  const roll: Record<string, unknown> = { rar: 'epic', seed: 1, ench: 'keen_edge', q: 0 };
  (player.equipment as Record<string, unknown>).weapon = { id: 'bronze_sword', roll };
  call(proto.useItem, s, 1, 0);
  assert.equal(roll.deep, true, 'the piece opened');
  assert.equal(inv[0], null, 'the sigil was spent');
  assert.equal(equipChanges.length, 1, 'the change reached the recompute+broadcast door');
});

test("a block-woken working refuses a quiver: the rune listens for a shield's answer", () => {
  const { s, player, lines, equipChanges } = benchSlate();
  const inv = player.inventory as ReturnType<typeof emptyInventory>;
  inv[0] = { item: 'scroll_wardens_rune', qty: 1, roll: { rar: 'common', seed: 0 } };
  (player.equipment as Record<string, unknown>).offhand = { id: 'hunters_quiver' };
  call(proto.useItem, s, 1, 0);
  assert.ok(inv[0], 'the scroll survives the refusal');
  const offhand = (player.equipment as { offhand: { roll?: { ench?: string } } }).offhand;
  assert.equal(offhand.roll?.ench, undefined, 'nothing bonded onto the quiver');
  assert.equal(equipChanges.length, 0);
  assert.equal(lines.length, 1);
  assert.match(lines[0]!, /shield/i);
  assert.doesNotMatch(lines[0]!, /—|–|--/, 'the refusal keeps the dash ban');
});

test('the same working bonds cleanly onto a raised wall', () => {
  const { s, player, equipChanges } = benchSlate();
  const inv = player.inventory as ReturnType<typeof emptyInventory>;
  inv[0] = { item: 'scroll_wardens_rune', qty: 1, roll: { rar: 'common', seed: 0 } };
  (player.equipment as Record<string, unknown>).offhand = { id: 'oak_kiteshield' };
  call(proto.useItem, s, 1, 0);
  assert.equal(inv[0], null, 'the scroll was spent');
  const offhand = (player.equipment as { offhand: { roll?: { ench?: string } } }).offhand;
  assert.equal(offhand.roll?.ench, 'wardens_rune');
  assert.equal(equipChanges.length, 1);
});

test('sundering one seat of a deepened piece says the other still rides', () => {
  const { s, player, lines } = benchSlate();
  const inv = player.inventory as ReturnType<typeof emptyInventory>;
  const roll: Record<string, unknown> = {
    rar: 'epic',
    seed: 1,
    ench: 'keen_edge',
    q: 0,
    deep: true,
    ench2: 'wardens_rune',
    q2: 0,
  };
  inv[0] = { item: 'bronze_sword', qty: 1, roll: roll as never };
  call(proto.sunder, s, 1, 0, undefined, 'ward');
  assert.equal(roll.ench, undefined, 'the ward came out');
  assert.equal(roll.ench2, 'wardens_rune', 'the art stayed in');
  assert.equal(lines.length, 1);
  assert.match(lines[0]!, /still rides/i, 'the copy tells the truth');
  assert.doesNotMatch(lines[0]!, /bare steel/i);
  assert.doesNotMatch(lines[0]!, /—|–|--/, 'the line keeps the dash ban');
});

test('sundering the last working still reads as bare steel', () => {
  const { s, player, lines } = benchSlate();
  const inv = player.inventory as ReturnType<typeof emptyInventory>;
  const roll: Record<string, unknown> = { rar: 'rare', seed: 2, ench: 'keen_edge', q: 0 };
  inv[0] = { item: 'bronze_sword', qty: 1, roll: roll as never };
  call(proto.sunder, s, 1, 0, undefined, 'ward');
  assert.equal(roll.ench, undefined);
  assert.equal(lines.length, 1);
  assert.match(lines[0]!, /bare steel again/i);
});
