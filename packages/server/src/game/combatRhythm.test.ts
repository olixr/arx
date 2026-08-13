import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  COMBO_GRACE_TICKS,
  COMBO_STAGES,
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
 * THE ONE RHYTHM's door laws, pinned at tryPlayerAttack: one ComboTrack
 * advances every lane, the string belongs to the weapon that started
 * it, recoveries and pose holds come from the shared tables, the beat
 * is SPOKEN to its own session, and no style fires from a fallthrough.
 * Same slate discipline as castEngine.test.ts: private GameServer
 * methods over a hand-built slate — no db, no sockets, real content.
 *
 * Content facts leaned on: bronze_sword (onehand, cd 7), iron_greatblade
 * (twohand, cd 12), carved_staff (arx, cd 8), shortbow (archery, cd 7).
 */

type Fn = (...a: unknown[]) => unknown;
const proto = GameServer.prototype as unknown as {
  tryPlayerAttack: Fn;
  meleeSwing: Fn;
  equippedWeapon: Fn;
  offhandWeapon: Fn;
  speakCombo: Fn;
};

interface SwingRec {
  aim: number;
  range: number;
  maxHit: number;
  knockbackMult?: number;
  sweepAll?: boolean;
  arcHalf?: number;
}

function mkRig(weaponId: string) {
  const sent: Array<Record<string, unknown>> = [];
  const poses: Array<{ pose: number; ticks: number }> = [];
  const swings: SwingRec[] = [];
  const projectiles: Array<Record<string, unknown>> = [];
  const player = {
    attackCooldown: 0,
    lastCombatAt: 0,
    hidden: false,
    sneaking: false,
    combo: freshCombo(),
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
    ) => {
      swings.push({ aim, range, maxHit, knockbackMult, sweepAll, arcHalf });
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
  return { rig, player, sent, poses, swings, projectiles };
}

function swingAt(rig: { tickCount: number }, player: { attackCooldown: number }, tick: number) {
  rig.tickCount = tick;
  player.attackCooldown = 0; // the sim decrements per tick; the slate jumps
  proto.tryPlayerAttack.call(rig, 1, player, 0, tick);
}

test('onehand string: stages, clocks, finisher sweep, and the spoken beat', () => {
  const { rig, player, sent, poses, swings } = mkRig('bronze_sword');
  swingAt(rig, player, 0);
  swingAt(rig, player, 7);
  swingAt(rig, player, 14); // all inside cooldown+grace — the full string
  assert.deepEqual(
    sent.map((m) => m.stage),
    [0, 1, 2],
    'the whole string spoken, in order',
  );
  assert.deepEqual(
    sent.map((m) => m.run),
    [1, 2, 3],
    'THE RUN spoken with every beat',
  );
  assert.ok(
    sent.every((m) => m.t === 'combo' && m.len === COMBO_STAGES),
    'every beat names the string length',
  );
  // Recovery: swings ride the weapon cooldown; the finisher pays double.
  assert.equal(player.attackCooldown, Math.round(7 * FINISHER_RECOVERY_MULT));
  // The spoken grace is the honest remaining window (recovery + grace).
  assert.equal(sent[2]!.grace, player.attackCooldown + COMBO_GRACE_TICKS);
  // Pose holds come from THE STRIKE CLOCK.
  assert.deepEqual(
    poses.map((p) => p.ticks),
    [
      STRIKE_CLOCKS.onehand.swing.holdTicks,
      STRIKE_CLOCKS.onehand.swing.holdTicks,
      STRIKE_CLOCKS.onehand.finisher.holdTicks,
    ],
  );
  // Only the finisher sweeps, at the payoff multiplier.
  assert.deepEqual(swings.map((s) => s.sweepAll), [false, false, true]);
  assert.equal(swings[2]!.maxHit, Math.round(swings[0]!.maxHit * FINISHER_DAMAGE_MULT));
});

test('a rest past the grace window starts the string over', () => {
  const { rig, player, sent } = mkRig('bronze_sword');
  swingAt(rig, player, 0);
  const grace = sent[0]!.grace as number;
  swingAt(rig, player, grace + 1);
  assert.deepEqual(sent.map((m) => m.stage), [0, 0], 'the dropped string restarts');
});

test('THE STRING BELONGS TO THE WEAPON: a swap never inherits the beat', () => {
  const { rig, player, sent, poses, swings } = mkRig('bronze_sword');
  swingAt(rig, player, 0);
  swingAt(rig, player, 7);
  // The old bug, dead: sword-sword-GREATSWORD used to land an instant
  // x3.0 finisher off the shared stage counter.
  player.equipment.weapon = { id: 'iron_greatblade' };
  swingAt(rig, player, 14);
  assert.deepEqual(sent.map((m) => m.stage), [0, 1, 0], 'the greatblade starts its own string');
  assert.equal(poses[2]!.ticks, STRIKE_CLOCKS.twohand.swing.holdTicks, 'great opener clock');
  assert.equal(swings[2]!.arcHalf, TWOHAND_ARC_HALF, 'the wide reap arrives with the swap');
  assert.equal(swings[2]!.sweepAll, true, 'THE CLEAVE LAW from the first greatswing');
});

test('EXPLICIT LANES: a style with no lane pays nothing and fires nothing', () => {
  // A bow in the melee door (archery routes through tickBowDraw and
  // never lands here in the sim — the guard keeps the door honest).
  const { rig, player, sent, poses, swings, projectiles } = mkRig('shortbow');
  swingAt(rig, player, 0);
  assert.equal(player.attackCooldown, 0, 'no cooldown paid');
  assert.equal(sent.length + poses.length + swings.length + projectiles.length, 0);
});

test('wand rhythm: bolt, bolt, HEAVY — splash, slow orb, long recovery', () => {
  const { rig, player, sent, poses, projectiles } = mkRig('carved_staff');
  swingAt(rig, player, 0);
  swingAt(rig, player, 8);
  swingAt(rig, player, 16);
  assert.deepEqual(sent.map((m) => m.stage), [0, 1, 2]);
  assert.equal(projectiles.length, 3);
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
  // meleeSwing must hand its own arcHalf to smashPropsInArc — the prop
  // sweep hardcoded the sword's ±60° and shorted the great reap.
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
