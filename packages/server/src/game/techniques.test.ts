import { test } from 'node:test';
import assert from 'node:assert/strict';
import { artFlag, xpForLevel } from '@arx/shared';
import { abilityDef, itemDef } from '@arx/content';
import { GameServer } from './gameServer.js';

/**
 * THE SECOND HAND's server laws, pinned: two free technique seats
 * validated per citizenship (rung by level, page by deed, secret by
 * mastery or THE LOAN LAW's teaching weapon), THE ONE SEAT LAW, the
 * loan's dormancy at the cast gate, and THE LOAN FOLLOWS THE BLADE on
 * equipment change. The methods are private GameServer methods over
 * plain maps, so they run here against a hand-built slate — no db, no
 * sockets, real content.
 *
 * Content facts these tests lean on (pinned in secretArts.test.ts):
 * 'lunge' is the gladius line's secret (onehand), 'volley' the
 * stickbow's (archery), 'heavy_slam' the onehand rung-5 ladder art
 * with authored ranks.
 */

type Fn = (...a: unknown[]) => unknown;
const proto = GameServer.prototype as unknown as {
  setTechnique: Fn;
  seatAbility: Fn;
  seatDormant: Fn;
  equippedArtIds: Fn;
  earnedArts: Fn;
  followLoanSeat: Fn;
  grantArt: Fn;
};

interface FakePlayer {
  characterId: number;
  techniques: [string | null, string | null];
  flags: Map<string, number>;
  skills: Record<string, number>;
  equipment: Record<string, { id: string } | undefined>;
  session: { sendJson: (m: unknown) => void };
}

function slate(player: FakePlayer) {
  const sent: Array<Record<string, unknown>> = [];
  const saves: Array<[number, string]> = [];
  player.session = { sendJson: (m) => sent.push(m as Record<string, unknown>) };
  const self = {
    players: new Map([[1, player]]),
    accounts: {
      saveTechniqueSeat: (_id: number, seat: number, ability: string) =>
        saves.push([seat, ability]),
      setFlag: () => undefined,
    },
    // The real private helpers under test ride the prototype.
    setTechnique: proto.setTechnique,
    seatAbility: proto.seatAbility,
    seatDormant: proto.seatDormant,
    equippedArtIds: proto.equippedArtIds,
    earnedArts: proto.earnedArts,
    followLoanSeat: proto.followLoanSeat,
    grantArt: proto.grantArt,
    techSeat: (slot: number) => (slot === 0 ? 0 : slot === 2 ? 1 : null),
    masteredArt: (p: FakePlayer, ability: string) => p.flags.has(artFlag(ability)),
    equippedWeapon: (p: FakePlayer) => {
      const worn = p.equipment.weapon;
      if (!worn) return null;
      return { id: worn.id, weapon: itemWeapon(worn.id) };
    },
    offhandWeapon: (p: FakePlayer) => {
      const worn = p.equipment.offhand;
      if (!worn) return null;
      const w = itemWeapon(worn.id);
      return w ? { id: worn.id, weapon: w } : null;
    },
    sendTechniques: (p: FakePlayer) => {
      p.session.sendJson({ t: 'techniques', chosen: [p.techniques[0], p.techniques[1]] });
    },
    sendCooldowns: () => undefined,
  };
  return { self, sent, saves };
}

function itemWeapon(id: string) {
  const w = itemDef(id)?.weapon;
  if (!w) throw new Error(`test item '${id}' has no weapon stats`);
  return w;
}

function mkPlayer(over: Partial<FakePlayer> = {}): FakePlayer {
  return {
    characterId: 7,
    techniques: [null, null],
    flags: new Map(),
    skills: {},
    equipment: {},
    session: { sendJson: () => undefined },
    ...over,
  };
}

test('a rung art seats when the level is met, and refuses below it', () => {
  const player = mkPlayer({ skills: { onehand: xpForLevel(10) } });
  const { self, sent, saves } = slate(player);
  self.setTechnique.call(self, 1, 'heavy_slam', 2);
  assert.equal(player.techniques[1], 'heavy_slam', 'rung 5 seats at level 10');
  assert.deepEqual(saves, [[1, 'heavy_slam']], 'persisted under the R seat');
  const low = mkPlayer({ skills: { onehand: xpForLevel(3) } });
  const s2 = slate(low);
  s2.self.setTechnique.call(s2.self, 1, 'heavy_slam', 2);
  assert.equal(low.techniques[1], null, 'below the rung nothing seats');
  assert.ok(
    s2.sent.some((m) => m.t === 'chat'),
    'the refusal is spoken, not silent',
  );
  void sent;
});

test('THE LOAN LAW at the seat door: a secret needs its teacher or its mastery', () => {
  const bare = mkPlayer();
  const s1 = slate(bare);
  s1.self.setTechnique.call(s1.self, 1, 'lunge', 2);
  assert.equal(bare.techniques[1], null, 'no teacher in hand, no seat');
  const armed = mkPlayer({ equipment: { weapon: { id: 'gladius' } } });
  const s2 = slate(armed);
  s2.self.setTechnique.call(s2.self, 1, 'lunge', 2);
  assert.equal(armed.techniques[1], 'lunge', 'the gladius lends its art');
  const master = mkPlayer({ flags: new Map([[artFlag('lunge'), 1]]) });
  const s3 = slate(master);
  s3.self.setTechnique.call(s3.self, 1, 'lunge', 2);
  assert.equal(master.techniques[1], 'lunge', 'mastery needs no blade');
});

test('THE ONE SEAT LAW: two seats must be two arts', () => {
  const player = mkPlayer({
    skills: { onehand: xpForLevel(50) },
    techniques: ['heavy_slam', null],
  });
  const { self, sent } = slate(player);
  self.setTechnique.call(self, 1, 'heavy_slam', 2);
  assert.equal(player.techniques[1], null, 'the double seat is refused');
  assert.ok(
    sent.some((m) => m.t === 'chat'),
    'the refusal is spoken',
  );
});

test('the offhand teaches too: a dual wielder hears both blades', () => {
  const player = mkPlayer({
    equipment: { weapon: { id: 'gladius' }, offhand: { id: 'bronze_dagger' } },
  });
  const { self } = slate(player);
  const arts = self.equippedArtIds.call(self, player) as Set<string>;
  assert.ok(arts.has('lunge'), 'the main hand lends');
  assert.ok(arts.has('shadowstep'), 'the offhand lends beside it');
});

test('THE LOAN LAW at the cast gate: dormancy is exact', () => {
  const player = mkPlayer({ techniques: ['lunge', 'heavy_slam'] });
  const { self } = slate(player);
  assert.equal(self.seatDormant.call(self, player, 0), true, 'teacher away, the seat sleeps');
  assert.equal(self.seatDormant.call(self, player, 1), false, 'a rung art never sleeps');
  player.equipment.weapon = { id: 'gladius' };
  assert.equal(self.seatDormant.call(self, player, 0), false, 'teacher in hand, the seat wakes');
  player.equipment.weapon = undefined;
  player.flags.set(artFlag('lunge'), 1);
  assert.equal(self.seatDormant.call(self, player, 0), false, 'mastery never sleeps');
});

test('an unmastered secret casts at Rank I; a rung art still hones', () => {
  const player = mkPlayer({
    skills: { onehand: xpForLevel(99) },
    techniques: ['lunge', 'heavy_slam'],
    equipment: { weapon: { id: 'gladius' } },
  });
  const { self } = slate(player);
  const lent = self.seatAbility.call(self, player, 0) as { id: string };
  assert.equal(lent.id, 'lunge', 'the loan resolves');
  const honed = self.seatAbility.call(self, player, 1) as { damage: number };
  assert.ok(
    honed.damage > abilityDef('heavy_slam')!.damage,
    'the rung art casts honed at 99 — both seats share the resolver',
  );
});

test('THE LOAN FOLLOWS THE BLADE: only an orphaned loan is replaced', () => {
  // The orphaned loan follows to the new weapon's art.
  const swap = mkPlayer({
    techniques: ['lunge', null],
    equipment: { weapon: { id: 'stickbow' } },
  });
  const s1 = slate(swap);
  s1.self.followLoanSeat.call(s1.self, swap);
  assert.equal(swap.techniques[0], 'volley', 'the loan follows the blade');
  assert.deepEqual(s1.saves, [[0, 'volley']], 'the follow persists under the Q seat');
  // A mastered art never follows.
  const master = mkPlayer({
    techniques: ['lunge', null],
    flags: new Map([[artFlag('lunge'), 1]]),
    equipment: { weapon: { id: 'stickbow' } },
  });
  const s2 = slate(master);
  s2.self.followLoanSeat.call(s2.self, master);
  assert.equal(master.techniques[0], 'lunge', 'mastery is the player’s arrangement');
  // A rung art never follows.
  const rung = mkPlayer({
    techniques: ['heavy_slam', null],
    equipment: { weapon: { id: 'stickbow' } },
  });
  const s3 = slate(rung);
  s3.self.followLoanSeat.call(s3.self, rung);
  assert.equal(rung.techniques[0], 'heavy_slam', 'the ladder is never touched');
  // THE ONE SEAT LAW holds even for the follow.
  const dup = mkPlayer({
    techniques: ['lunge', 'volley'],
    equipment: { weapon: { id: 'stickbow' } },
  });
  const s4 = slate(dup);
  s4.self.followLoanSeat.call(s4.self, dup);
  assert.equal(dup.techniques[0], 'lunge', 'no double seat, the orphan stays');
  // A still-taught loan stays put (the offhand keeps teaching it).
  const taught = mkPlayer({
    techniques: ['shadowstep', null],
    equipment: { weapon: { id: 'stickbow' }, offhand: { id: 'bronze_dagger' } },
  });
  const s5 = slate(taught);
  s5.self.followLoanSeat.call(s5.self, taught);
  assert.equal(taught.techniques[0], 'shadowstep', 'the offhand still teaches it');
});

test('mastered secrets ride the earned wire beside the deed pages', () => {
  const player = mkPlayer({
    flags: new Map([
      [artFlag('lunge'), 1],
      [artFlag('two_answers'), 1],
    ]),
  });
  const { self } = slate(player);
  const earned = self.earnedArts.call(self, player) as string[];
  assert.ok(earned.includes('lunge'), 'the mastered secret is owned');
  assert.ok(earned.includes('two_answers'), 'the deed page is owned');
});

test('grantArt masters a secret with its own ceremony line', () => {
  const player = mkPlayer();
  const { self, sent } = slate(player);
  self.grantArt.call(self, player, 'lunge');
  assert.ok(player.flags.has(artFlag('lunge')), 'the flag is set');
  const line = sent.find((m) => m.t === 'chat') as { text: string } | undefined;
  assert.ok(line && /yours now/.test(line.text), 'the mastery ceremony speaks');
  // A rung art can never be granted — the ladder is climbed, not given.
  const rung = mkPlayer();
  const s2 = slate(rung);
  s2.self.grantArt.call(s2.self, rung, 'heavy_slam');
  assert.ok(!rung.flags.has(artFlag('heavy_slam')), 'rung arts refuse the grant door');
});
