import { test } from 'node:test';
import assert from 'node:assert/strict';
import { InputButton, SWAP_BEAT_MS, SWAP_BEAT_TICKS, TICK_MS, xpForLevel } from '@arx/shared';
import { itemDef } from '@arx/content';
import { GameServer } from './gameServer.js';

/**
 * THE SECOND GRIP Phase 1 (THE SECOND ROW), pinned: the stowed pair's
 * equip laws mirror the hands (two-hands law, dual-wield gate, spoken
 * refusals), THE SLEEPING STEEL folds nothing (the gear fold's half of
 * that law is pinned in content/equipment.test.ts; the passive half
 * lives here), and THE HONEST TRADE is one atomic exchange behind a
 * beat that swallows re-presses. The methods are private GameServer
 * methods over plain maps, so they run against a hand-built slate — no
 * db, no sockets, real content.
 *
 * Content facts these tests lean on: 'bronze_sword' and 'gladius' are
 * one-handed weapons (gladius gates at onehand 2), 'iron_greatblade'
 * is two-handed, 'shortbow' fills both fists, 'oak_kiteshield' is a
 * held offhand (defence 6), 'frost_quiver' is the back-mounted
 * offhand carrying the chill_charged passive.
 */

type Fn = (...a: unknown[]) => unknown;
const proto = GameServer.prototype as unknown as {
  useItem: Fn;
  swapWeaponSets: Fn;
  discoverDualWield: Fn;
  passiveIds: Fn;
  speak: Fn;
};

interface FakeSlot {
  item: string;
  qty: number;
  stolen?: boolean;
  roll?: unknown;
}

interface FakePlayer {
  characterId: number;
  inventory: Array<FakeSlot | null>;
  equipment: Record<string, { id: string; roll?: unknown } | undefined>;
  skills: Record<string, number>;
  session: { sendJson: (m: unknown) => void };
  combo: { stage: number; graceUntilTick: number; weaponId: string | null; run: number };
  pendingStrike: unknown;
  action: { kind: string } | null;
  sheathed: boolean;
  drawTicks: number;
  drawLockUntilSeq: number;
  drawLockUntilTick: number;
  swapLockUntilSeq: number;
  swapLockUntilTick: number;
  perks?: unknown;
}

function mkPlayer(over: Partial<FakePlayer> = {}): FakePlayer {
  return {
    characterId: 7,
    inventory: new Array<FakeSlot | null>(40).fill(null),
    equipment: {},
    skills: { onehand: xpForLevel(10), defence: xpForLevel(10), archery: xpForLevel(10) },
    session: { sendJson: () => undefined },
    combo: { stage: 2, graceUntilTick: 99, weaponId: 'bronze_sword', run: 4 },
    pendingStrike: { at: 5 },
    action: null,
    sheathed: false,
    drawTicks: 0,
    drawLockUntilSeq: 0,
    drawLockUntilTick: 0,
    swapLockUntilSeq: 0,
    swapLockUntilTick: 0,
    ...over,
  };
}

function slate(player: FakePlayer, tick = 100) {
  const sent: Array<Record<string, unknown>> = [];
  const calls: string[] = [];
  player.session = { sendJson: (m) => sent.push(m as Record<string, unknown>) };
  const self = {
    players: new Map([[1, player]]),
    tickCount: tick,
    useItem: proto.useItem,
    swapWeaponSets: proto.swapWeaponSets,
    discoverDualWield: proto.discoverDualWield,
    passiveIds: proto.passiveIds,
    speak: proto.speak,
    onEquipmentChanged: () => calls.push('equipchange'),
    cancelCasting: () => calls.push('cancelcast'),
    cancelAction: (_e: unknown, _p: unknown, reason: string) => calls.push(`cancelaction:${reason}`),
    grantXp: (_e: unknown, _p: unknown, skill: string) => calls.push(`xp:${skill}`),
  };
  return { self, sent, calls };
}

function give(player: FakePlayer, index: number, item: string): void {
  player.inventory[index] = { item, qty: 1 };
}

test('the stow verb lands a weapon in the stowed row, hands untouched', () => {
  const player = mkPlayer();
  const { self, calls } = slate(player);
  give(player, 0, 'bronze_sword');
  self.useItem.call(self, 1, 0, true);
  assert.equal(player.equipment.stowWeapon?.id, 'bronze_sword', 'the blade waits at the ready');
  assert.equal(player.equipment.weapon, undefined, 'the hands stay bare');
  assert.equal(player.inventory[0], null, 'the pack slot emptied');
  assert.ok(calls.includes('equipchange'), 'the standing rail ran');
});

test('stow refuses what the hands cannot row, with words', () => {
  const player = mkPlayer({ skills: { defence: xpForLevel(99) } });
  const { self, sent } = slate(player);
  give(player, 0, 'iron_helm');
  self.useItem.call(self, 1, 0, true);
  assert.equal(player.equipment.stowWeapon, undefined);
  assert.equal(player.equipment.head, undefined, 'a refused stow never falls through to the hands');
  assert.equal(player.inventory[0]?.item, 'iron_helm', 'the piece stays in the pack');
  assert.ok(
    sent.some((m) => m.t === 'chat' && String(m.text).includes('at the ready')),
    'the refusal is spoken, not silent',
  );
});

test('THE TWO-HANDS LAW holds in the stowed row', () => {
  const player = mkPlayer({
    equipment: { stowOffhand: { id: 'oak_kiteshield' } },
    skills: { twohand: xpForLevel(20), defence: xpForLevel(10) },
  });
  const { self, sent } = slate(player);
  give(player, 0, 'iron_greatblade');
  self.useItem.call(self, 1, 0, true);
  assert.equal(player.equipment.stowWeapon?.id, 'iron_greatblade');
  assert.equal(player.equipment.stowOffhand, undefined, 'the stowed shield sheds');
  assert.ok(
    player.inventory.some((s) => s?.item === 'oak_kiteshield'),
    'the shed shield lands in the pack, never vanishes',
  );
  assert.ok(
    sent.some((m) => m.t === 'chat' && String(m.text).includes('both hands')),
    'the shed is spoken',
  );
});

test('a back-mounted quiver rides beside a stowed bow', () => {
  const player = mkPlayer({ equipment: { stowOffhand: { id: 'frost_quiver' } } });
  const { self } = slate(player);
  give(player, 0, 'shortbow');
  self.useItem.call(self, 1, 0, true);
  assert.equal(player.equipment.stowWeapon?.id, 'shortbow');
  assert.equal(player.equipment.stowOffhand?.id, 'frost_quiver', 'the quiver keeps its perch');
});

test('the stowed row pairs blades under the gate, without the ceremony', () => {
  // At the unlock the second blade pairs into the stowed off hand, but
  // the discovery stays unspoken: packing knives is planning, not the
  // act (the swap that draws them speaks it).
  const strong = mkPlayer({ equipment: { stowWeapon: { id: 'bronze_sword' } } });
  const s1 = slate(strong);
  give(strong, 0, 'gladius');
  s1.self.useItem.call(s1.self, 1, 0, true);
  assert.equal(strong.equipment.stowWeapon?.id, 'bronze_sword');
  assert.equal(strong.equipment.stowOffhand?.id, 'gladius', 'the pair forms in the stowed row');
  assert.equal(strong.skills.dualwield, undefined, 'no ceremony for a packed pair');

  // Below the unlock and undiscovered, the second blade replaces
  // instead of pairing — the same refusal-by-swap the hands give.
  const weak = mkPlayer({
    equipment: { stowWeapon: { id: 'bronze_sword' } },
    skills: { onehand: xpForLevel(3) },
  });
  const s2 = slate(weak);
  give(weak, 0, 'gladius');
  s2.self.useItem.call(s2.self, 1, 0, true);
  assert.equal(weak.equipment.stowWeapon?.id, 'gladius', 'the new blade takes the row');
  assert.equal(weak.equipment.stowOffhand, undefined, 'no pair below the gate');
  assert.ok(
    weak.inventory.some((s) => s?.item === 'bronze_sword'),
    'the replaced blade returns to the pack',
  );
});

test('THE HONEST TRADE: one atomic exchange, the beat paid once', () => {
  const player = mkPlayer({
    equipment: {
      weapon: { id: 'bronze_sword', roll: { rar: 'rare', seed: 1 } },
      offhand: { id: 'oak_kiteshield' },
      stowWeapon: { id: 'shortbow' },
      stowOffhand: { id: 'frost_quiver' },
    },
  });
  const { self, calls } = slate(player, 100);
  self.swapWeaponSets.call(self, 1, player, 100);
  assert.equal(player.equipment.weapon?.id, 'shortbow');
  assert.equal(player.equipment.offhand?.id, 'frost_quiver');
  assert.equal(player.equipment.stowWeapon?.id, 'bronze_sword');
  assert.deepEqual(
    player.equipment.stowWeapon?.roll,
    { rar: 'rare', seed: 1 },
    'the instance travels whole, roll and all',
  );
  assert.equal(player.equipment.stowOffhand?.id, 'oak_kiteshield');
  // ONE LAW, TWO CLOCKS: the beat locks in INPUT-SEQ units (the clock
  // the client's fire mirrors share) AND in server ticks (the wall
  // clock a hostile seq counter cannot inflate away).
  assert.equal(player.swapLockUntilSeq, 112, 'the beat is 12 ticks of input seq');
  assert.equal(player.swapLockUntilTick, 112, 'and 12 ticks of server clock');
  assert.equal(player.drawLockUntilSeq, 112, 'attacks wait behind the standing draw lock');
  assert.equal(player.drawLockUntilTick, 112, 'on both clocks');
  assert.equal(player.combo.stage, 0, 'the traded string is a dropped string');
  assert.equal(player.pendingStrike, null, 'the traded blow never lands');
  assert.ok(calls.includes('cancelcast'), 'traded steel casts nothing');
  assert.ok(calls.includes('equipchange'), 'the standing rail ran');

  // Re-press inside the beat: swallowed whole, nothing moves.
  self.swapWeaponSets.call(self, 1, player, 106);
  assert.equal(player.equipment.weapon?.id, 'shortbow', 'the beat swallows the re-press');

  // Past the beat on BOTH clocks, the trade returns everything.
  self.tickCount = 112;
  self.swapWeaponSets.call(self, 1, player, 112);
  assert.equal(player.equipment.weapon?.id, 'bronze_sword');
  assert.equal(player.equipment.offhand?.id, 'oak_kiteshield');
  assert.equal(player.equipment.stowWeapon?.id, 'shortbow');
  assert.equal(player.equipment.stowOffhand?.id, 'frost_quiver');
});

test('a one-sided trade leaves honest empties, never ghost keys', () => {
  const player = mkPlayer({
    equipment: { weapon: { id: 'iron_greatblade' }, stowWeapon: { id: 'bronze_sword' } },
  });
  const { self } = slate(player);
  self.swapWeaponSets.call(self, 1, player, 50);
  assert.equal(player.equipment.weapon?.id, 'bronze_sword');
  assert.equal(player.equipment.stowWeapon?.id, 'iron_greatblade');
  assert.ok(!('offhand' in player.equipment), 'an empty hand stays an absent key');
  assert.ok(!('stowOffhand' in player.equipment), 'an empty row slot stays an absent key');
});

test('EMPTY HANDS REFUSE QUIETLY: no stowed set, no beat paid', () => {
  const player = mkPlayer({ equipment: { weapon: { id: 'bronze_sword' } } });
  const { self, sent, calls } = slate(player);
  self.swapWeaponSets.call(self, 1, player, 50);
  assert.equal(player.equipment.weapon?.id, 'bronze_sword', 'nothing moves');
  assert.equal(player.swapLockUntilSeq, 0, 'no beat is paid for a refusal');
  assert.equal(player.swapLockUntilTick, 0, 'on either clock');
  assert.ok(
    sent.some((m) => m.t === 'chat' && String(m.text).includes('Nothing waits')),
    'the refusal is spoken',
  );
  assert.ok(!calls.includes('equipchange'), 'the rail does not run for nothing');
});

test('the swap speaks the dual-wield ceremony when two blades reach the hands', () => {
  const player = mkPlayer({
    equipment: { stowWeapon: { id: 'bronze_sword' }, stowOffhand: { id: 'gladius' } },
    skills: { onehand: xpForLevel(12) },
  });
  const { self, sent, calls } = slate(player);
  self.swapWeaponSets.call(self, 1, player, 50);
  assert.equal(player.skills.dualwield, 0, 'the hidden skill wakes at the hands');
  assert.ok(calls.includes('xp:dualwield'), 'the first spark of the school');
  assert.ok(
    sent.some((m) => m.t === 'chat'),
    'the discovery is spoken',
  );
});

test('a channel dies with the trade', () => {
  const player = mkPlayer({
    equipment: { stowWeapon: { id: 'bronze_sword' } },
    action: { kind: 'channel' },
  });
  const { self, calls } = slate(player);
  self.swapWeaponSets.call(self, 1, player, 50);
  assert.ok(calls.includes('cancelaction:cancelled'), 'the note breaks with the trade');
});

test('THE SLEEPING STEEL wakes no passives', () => {
  const sleeping = mkPlayer({ equipment: { stowOffhand: { id: 'frost_quiver' } } });
  const { self } = slate(sleeping);
  assert.deepEqual(self.passiveIds.call(self, sleeping), [], 'a stowed quiver chills nothing');
  const worn = mkPlayer({ equipment: { offhand: { id: 'frost_quiver' } } });
  const s2 = slate(worn);
  assert.deepEqual(
    s2.self.passiveIds.call(s2.self, worn),
    [itemDef('frost_quiver')!.passive],
    'the same quiver worn in earnest speaks',
  );
});

// TWIN LAW (the STRIKE_CLOCKS precedent): both sides lock in input-seq
// units and choreograph in ms — one beat, two units. This pin outlives
// the constants: change both or neither.
test('the swap beat twins agree across the tick clock', () => {
  assert.equal(SWAP_BEAT_TICKS * TICK_MS, SWAP_BEAT_MS, 'tick and ms twins must stay byte-equal');
});

test('the swap verb owns a fresh input bit', () => {
  assert.equal(InputButton.Swap, 1 << 11, 'the pinned wire bit');
  const all = [
    InputButton.Attack,
    InputButton.Interact,
    InputButton.Ability1,
    InputButton.Ability2,
    InputButton.Ability3,
    InputButton.Ability4,
    InputButton.Sneak,
    InputButton.Sit,
    InputButton.Sheathe,
    InputButton.Mount,
    InputButton.Swap,
  ];
  assert.equal(new Set(all).size, all.length, 'every verb answers its own bit');
});

// ---- THE DELIBERATE PAIR: `off` aims a blade at the off hand by name

test('THE DELIBERATE PAIR: off aims a second blade at the off hand and speaks the ceremony', () => {
  const player = mkPlayer({ equipment: { weapon: { id: 'bronze_sword' } } });
  const { self, calls } = slate(player);
  give(player, 0, 'gladius');
  self.useItem.call(self, 1, 0, false, true);
  assert.equal(player.equipment.weapon?.id, 'bronze_sword', 'the main hand keeps its blade');
  assert.equal(player.equipment.offhand?.id, 'gladius', 'the aimed blade takes the off hand');
  assert.equal(player.skills.dualwield, 0, 'the deliberate road wakes the hidden skill too');
  assert.ok(calls.includes('xp:dualwield'), 'the first spark of the school');
  assert.ok(calls.includes('equipchange'), 'the standing rail ran');
});

test('the deliberate pair swaps a worn off hand back to the pack, one for one', () => {
  const player = mkPlayer({
    equipment: { weapon: { id: 'bronze_sword' }, offhand: { id: 'oak_kiteshield' } },
  });
  const { self } = slate(player);
  give(player, 0, 'gladius');
  self.useItem.call(self, 1, 0, false, true);
  assert.equal(player.equipment.offhand?.id, 'gladius', 'the blade takes the socket');
  assert.ok(
    player.inventory.some((s) => s?.item === 'oak_kiteshield'),
    'the shield lands in the pack, never vanishes',
  );
});

test('below the gate the deliberate pair refuses with words, and nothing moves', () => {
  const player = mkPlayer({
    equipment: { weapon: { id: 'bronze_sword' } },
    skills: { onehand: xpForLevel(3) },
  });
  const { self, sent } = slate(player);
  give(player, 0, 'gladius');
  self.useItem.call(self, 1, 0, false, true);
  assert.equal(player.equipment.offhand, undefined, 'the off hand stays bare');
  assert.equal(player.equipment.weapon?.id, 'bronze_sword', 'no silent fallthrough to the main hand');
  assert.equal(player.inventory[0]?.item, 'gladius', 'the blade stays in the pack');
  assert.ok(
    sent.some((m) => m.t === 'notice' && String(m.text).includes('onehand')),
    'the refusal names the bar',
  );
});

test('a second blade wants a one-handed main: empty or two-handed hands refuse aloud', () => {
  // Bare hands: nothing to pair with.
  const bare = mkPlayer();
  const s1 = slate(bare);
  give(bare, 0, 'gladius');
  s1.self.useItem.call(s1.self, 1, 0, false, true);
  assert.equal(bare.equipment.offhand, undefined);
  assert.equal(bare.inventory[0]?.item, 'gladius');
  assert.ok(
    s1.sent.some((m) => m.t === 'notice' && String(m.text).includes('main hand')),
    'the refusal points at the main hand',
  );

  // A greatblade main: both fists are spoken for.
  const heavy = mkPlayer({
    equipment: { weapon: { id: 'iron_greatblade' } },
    skills: { onehand: xpForLevel(12), twohand: xpForLevel(20) },
  });
  const s2 = slate(heavy);
  give(heavy, 0, 'gladius');
  s2.self.useItem.call(s2.self, 1, 0, false, true);
  assert.equal(heavy.equipment.offhand, undefined, 'no blade beside a greatblade');
  assert.equal(heavy.equipment.weapon?.id, 'iron_greatblade', 'the main hand stands untouched');
});

test('off refuses what no off hand can hold, with words', () => {
  const player = mkPlayer({ skills: { defence: xpForLevel(99) } });
  const { self, sent } = slate(player);
  give(player, 0, 'iron_helm');
  self.useItem.call(self, 1, 0, false, true);
  assert.equal(player.equipment.head, undefined, 'a refused aim never falls through to its own slot');
  assert.equal(player.inventory[0]?.item, 'iron_helm', 'the piece stays in the pack');
  assert.ok(
    sent.some((m) => m.t === 'chat' && String(m.text).includes('off hand')),
    'the refusal is spoken',
  );
});

test('off on an off-hand piece is a courtesy, not a change: the shield lands as ever', () => {
  const player = mkPlayer();
  const { self } = slate(player);
  give(player, 0, 'oak_kiteshield');
  self.useItem.call(self, 1, 0, false, true);
  assert.equal(player.equipment.offhand?.id, 'oak_kiteshield', 'the natural road holds');
});

test('stow and off compose: the pair forms in the ready row, without the ceremony', () => {
  const player = mkPlayer({
    equipment: { stowWeapon: { id: 'bronze_sword' }, stowOffhand: { id: 'oak_kiteshield' } },
  });
  const { self } = slate(player);
  give(player, 0, 'gladius');
  self.useItem.call(self, 1, 0, true, true);
  assert.equal(player.equipment.stowOffhand?.id, 'gladius', 'the aimed blade takes the ready off hand');
  assert.ok(
    player.inventory.some((s) => s?.item === 'oak_kiteshield'),
    'the waiting shield returns to the pack',
  );
  assert.equal(player.skills.dualwield, undefined, 'packing knives is planning, not the act');
});
