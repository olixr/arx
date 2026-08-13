import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  COMBO_GRACE_TICKS,
  FINISHER_DAMAGE_MULT,
  FINISHER_RECOVERY_MULT,
  HEAVY_BOLT_RECOVERY_MULT,
  HEAVY_BOLT_SPLASH,
  STRIKE_CLOCKS,
  TWOHAND_ARC_HALF,
  freshCombo,
} from '@arx/shared';
import { GameServer } from './gameServer.js';

/**
 * THE MOVESET BOOK's door laws, pinned at tryPlayerAttack: the page
 * drives every beat (length, recovery, pose, windup), THE HONEST
 * SWING lands on the impact frame, THE BRANCH answers the rhythm tap,
 * TEMPO quickens the practiced hand, and the string still belongs to
 * the weapon that started it. Same slate discipline as
 * castEngine.test.ts: private GameServer methods over a hand-built
 * slate — no db, no sockets, real content.
 *
 * Content facts leaned on: bronze_sword (onehand cd 7, sword_string
 * 4 beats), shiv (dagger cd 4, dagger_flurry 5 beats), iron_greatblade
 * (twohand cd 12, great_string), carved_staff (arx cd 8, wand_rhythm),
 * shortbow (archery — no page).
 */

type Fn = (...a: unknown[]) => unknown;
const proto = GameServer.prototype as unknown as {
  tryPlayerAttack: Fn;
  meleeSwing: Fn;
  equippedWeapon: Fn;
  offhandWeapon: Fn;
  speakCombo: Fn;
  landStrike: Fn;
  resolvePendingStrike: Fn;
};

interface SwingRec {
  aim: number;
  range: number;
  maxHit: number;
  knockbackMult?: number;
  sweepAll?: boolean;
  arcHalf?: number;
  extraRewind?: number;
}

function mkRig(weaponId: string) {
  const sent: Array<Record<string, unknown>> = [];
  const poses: Array<{ pose: number; ticks: number }> = [];
  const swings: SwingRec[] = [];
  const windups: number[] = [];
  const projectiles: Array<Record<string, unknown>> = [];
  const player = {
    attackCooldown: 0,
    lastCombatAt: 0,
    hidden: false,
    sneaking: false,
    combo: freshCombo(),
    pendingStrike: null as { at: number; pressTick: number } | null,
    buffs: [] as unknown[],
    equipment: { weapon: { id: weaponId } } as Record<string, { id: string } | undefined>,
    gear: {
      styleDmgMult: { onehand: 1, twohand: 1, arx: 1, archery: 1 },
      elementDmgMult: {},
      critPct: 0,
    },
    perks: { finisherBonusMult: 1, greatReach: 0, offhandDelayTicks: 4 },
    session: { sendJson: (m: Record<string, unknown>) => sent.push(m) },
    offhandEchoTicks: 0,
    offhandEchoAim: 0,
  };
  let nextEid = 1;
  const rig = {
    tickCount: 0,
    equippedWeapon: proto.equippedWeapon,
    offhandWeapon: proto.offhandWeapon,
    speakCombo: proto.speakCombo,
    landStrike: proto.landStrike,
    resolvePendingStrike: proto.resolvePendingStrike,
    revealPlayer: () => undefined,
    effectiveLevel: () => 10,
    setPose: (_eid: unknown, pose: number, ticks: number) => poses.push({ pose, ticks }),
    meleeSwing: (
      _eid: unknown,
      _player: unknown,
      aim: number,
      range: number,
      maxHit: number,
      knockbackMult?: number,
      sweepAll?: boolean,
      _wasHidden?: boolean,
      _backstabMult?: number,
      _xpStyle?: string,
      arcHalf?: number,
      extraRewind?: number,
    ) => {
      swings.push({ aim, range, maxHit, knockbackMult, sweepAll, arcHalf, extraRewind });
      return 0;
    },
    grantArt: () => undefined,
    hasPassive: () => false,
    positions: {
      must: () => ({ x: 0, y: 0, dir: 0 }),
      set: () => undefined,
    },
    kinds: { set: () => undefined },
    ecs: { create: () => nextEid++ },
    projectiles: { set: (_eid: unknown, p: Record<string, unknown>) => projectiles.push(p) },
    updateChunkMembership: () => undefined,
  };
  // Swing at a tick, then let any blow in flight land on its frame —
  // recording the windup it flew.
  const swingAt = (tick: number, tapped = false) => {
    rig.tickCount = tick;
    player.attackCooldown = 0; // the sim decrements per tick; the slate jumps
    proto.tryPlayerAttack.call(rig, 1, player, 0, tick, tapped);
    if (player.pendingStrike) {
      windups.push(player.pendingStrike.at - player.pendingStrike.pressTick);
      rig.tickCount = player.pendingStrike.at;
      proto.resolvePendingStrike.call(rig, 1, player);
    } else if (projectiles.length === 0) {
      windups.push(0);
    }
  };
  return { rig, player, sent, poses, swings, windups, projectiles, swingAt };
}

test('sword string: four beats, book clocks, honest windups, earned finisher', () => {
  const { player, sent, poses, swings, windups, swingAt } = mkRig('bronze_sword');
  swingAt(0);
  swingAt(7);
  swingAt(14);
  swingAt(21); // the payoff beat, all in rhythm
  assert.deepEqual(sent.map((m) => m.stage), [0, 1, 2, 3], 'the whole string spoken');
  assert.deepEqual(sent.map((m) => m.run), [1, 2, 3, 4], 'THE RUN spoken with every beat');
  assert.ok(sent.every((m) => m.t === 'combo' && m.len === 4), 'the book names the length');
  assert.equal(player.attackCooldown, Math.round(7 * FINISHER_RECOVERY_MULT));
  assert.equal(sent[3]!.grace, player.attackCooldown + COMBO_GRACE_TICKS);
  // Pose alternation: forehand, backhand, forehand, payoff — from the
  // strike clock table.
  assert.deepEqual(
    poses.map((p) => p.ticks),
    [
      STRIKE_CLOCKS.onehand.swing.holdTicks,
      STRIKE_CLOCKS.onehand.swing.holdTicks,
      STRIKE_CLOCKS.onehand.swing.holdTicks,
      STRIKE_CLOCKS.onehand.finisher.holdTicks,
    ],
  );
  assert.notEqual(poses[2]!.pose, poses[3]!.pose, 'adjacent beats flip the byte');
  assert.notEqual(poses[1]!.pose, poses[2]!.pose);
  // THE HONEST SWING: chips fly 2 ticks, the payoff 3.
  assert.deepEqual(windups, [2, 2, 2, 3]);
  // Hold-flow finisher: the crowd-clear sweep at the payoff multiplier.
  assert.deepEqual(swings.map((s) => s.sweepAll), [false, false, false, true]);
  assert.equal(swings[3]!.maxHit, Math.round(swings[0]!.maxHit * FINISHER_DAMAGE_MULT));
  assert.deepEqual(
    swings.map((s) => s.extraRewind),
    [2, 2, 2, 3],
    'lag comp rewinds by the windup the blow flew',
  );
});

test('THE BRANCH: a rhythm TAP on the payoff drives the piercing thrust', () => {
  const { swings, swingAt } = mkRig('bronze_sword');
  swingAt(0);
  swingAt(7);
  swingAt(14);
  swingAt(21, true); // tapped on the beat
  assert.equal(swings[3]!.sweepAll, false, 'the thrust takes ONE body');
  assert.equal(swings[3]!.maxHit, Math.round(swings[0]!.maxHit * 3.0), 'the duelist payoff');
});

test('TEMPO: rhythm past a full string quickens the hand by one tick', () => {
  const { windups, swingAt } = mkRig('bronze_sword');
  swingAt(0);
  swingAt(7);
  swingAt(14);
  swingAt(21); // finisher, recovery 14
  swingAt(35); // run 5 > len 4 — the practiced opener
  assert.equal(windups[4], 1, 'windup 2 shaved to 1 (speed, never damage)');
});

test('dagger flurry: five quick cuts, the plunge, exact-parity payoff', () => {
  const { player, sent, windups, swings, swingAt } = mkRig('shiv');
  swingAt(0);
  swingAt(4);
  swingAt(8);
  swingAt(12);
  swingAt(16);
  assert.deepEqual(sent.map((m) => m.stage), [0, 1, 2, 3, 4]);
  assert.ok(sent.every((m) => m.len === 5), 'the flurry is five beats');
  assert.deepEqual(windups, [1, 1, 1, 1, 2], 'fast hands stay fast');
  assert.equal(player.attackCooldown, Math.round(4 * 2.0));
  assert.equal(swings[4]!.maxHit, Math.round(swings[0]!.maxHit * 2.75), 'the plunge');
  assert.equal(swings[4]!.sweepAll, true);
});

test('a rest past the grace window starts the string over', () => {
  const { sent, swingAt } = mkRig('bronze_sword');
  swingAt(0);
  const grace = sent[0]!.grace as number;
  swingAt(grace + 1);
  assert.deepEqual(sent.map((m) => m.stage), [0, 0], 'the dropped string restarts');
});

test('THE STRING BELONGS TO THE WEAPON: a swap never inherits the beat', () => {
  const { player, sent, poses, swings, swingAt } = mkRig('bronze_sword');
  swingAt(0);
  swingAt(7);
  player.equipment.weapon = { id: 'iron_greatblade' };
  swingAt(14);
  assert.deepEqual(sent.map((m) => m.stage), [0, 1, 0], 'the greatblade starts its own string');
  assert.equal(poses[2]!.ticks, STRIKE_CLOCKS.twohand.swing.holdTicks, 'great opener clock');
  assert.equal(swings[2]!.arcHalf, TWOHAND_ARC_HALF, 'the wide reap arrives with the swap');
  assert.equal(swings[2]!.sweepAll, true, 'THE CLEAVE LAW from the first greatswing');
});

test('EXPLICIT LANES: a style with no page pays nothing and fires nothing', () => {
  const { player, sent, poses, swings, projectiles, swingAt } = mkRig('shortbow');
  swingAt(0);
  assert.equal(player.attackCooldown, 0, 'no cooldown paid');
  assert.equal(sent.length + poses.length + swings.length + projectiles.length, 0);
});

test('wand rhythm: bolt, bolt, ORB — the page drives the projectile lane', () => {
  const { player, sent, poses, projectiles, swingAt } = mkRig('carved_staff');
  swingAt(0);
  swingAt(8);
  swingAt(16);
  assert.deepEqual(sent.map((m) => m.stage), [0, 1, 2]);
  assert.equal(projectiles.length, 3, 'bolts spawn at the press — flight is the honest travel');
  assert.equal(projectiles[0]!.heavy, undefined);
  assert.equal(projectiles[2]!.heavy, true, 'the third bolt is the orb');
  assert.equal(projectiles[2]!.splashRadius, HEAVY_BOLT_SPLASH);
  assert.ok(
    (projectiles[2]!.speed as number) < (projectiles[0]!.speed as number),
    'the orb flies fat and slow',
  );
  assert.equal(player.attackCooldown, Math.round(8 * HEAVY_BOLT_RECOVERY_MULT));
  assert.equal(poses[2]!.ticks, STRIKE_CLOCKS.arx.finisher.holdTicks);
  assert.ok(projectiles.every((p) => p.basic === true), 'bolts stay basics through the one door');
});

test('the swing and the scenery share ONE cone', () => {
  const arcs: number[] = [];
  const fake = {
    positions: { must: () => ({ x: 0, y: 0, dir: 0 }) },
    smashPropsInArc: (_pos: unknown, _aim: unknown, _range: unknown, arcHalf: number) =>
      arcs.push(arcHalf),
    viewRewindTicks: () => 0,
    npcs: new Map(),
    pets: new Map(),
  };
  const player = {
    equipment: {},
    perks: { backstabBonus: 0 },
    gear: { critPct: 0 },
    buffs: [],
    sneaking: false,
  };
  proto.meleeSwing.call(fake, 1, player, 0, 2.6, 5, 1, true, false, 1.5, 'twohand', TWOHAND_ARC_HALF);
  assert.deepEqual(arcs, [TWOHAND_ARC_HALF], 'the reap clears scenery as wide as it cuts');
});
