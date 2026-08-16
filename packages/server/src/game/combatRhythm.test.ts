import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  COMBO_GRACE_TICKS,
  DRAW_FULL_TICKS,
  FINISHER_DAMAGE_MULT,
  FINISHER_RECOVERY_MULT,
  GUARD_SWEEP_KNOCKBACK,
  GUARD_SWEEP_RANGE,
  GUARD_SWEEP_WINDUP,
  HEAVY_BOLT_RECOVERY_MULT,
  HEAVY_BOLT_SPLASH,
  OVERCHARGE_TICKS,
  PoseState,
  STRIKE_CLOCKS,
  TWOHAND_ARC_HALF,
  VOLLEY_DMG_FACTOR,
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
  offhandStrike: Fn;
  speakCombo: Fn;
  landStrike: Fn;
  resolvePendingStrike: Fn;
  tickBowDraw: Fn;
  forEachNpcNear: Fn;
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
      styleDmgMult: { onehand: 1, twohand: 1, polearm: 1, arx: 1, archery: 1 },
      elementDmgMult: {},
      critPct: 0,
    },
    perks: { finisherBonusMult: 1, greatReach: 0, poleReach: 0, warGripBonus: 0, offhandDelayTicks: 4, offhandFactorBonus: 0, snapShotMult: 1 },
    session: { sendJson: (m: Record<string, unknown>) => sent.push(m) },
    skills: {} as Record<string, number>,
    inventory: [] as Array<{ item: string; qty: number } | null>,
    drawTicks: 0,
    offhandEchoTicks: 0,
    offhandEchoAim: 0,
    offhandEchoMult: 1,
  };
  let nextEid = 1;
  const rig = {
    tickCount: 0,
    equippedWeapon: proto.equippedWeapon,
    offhandWeapon: proto.offhandWeapon,
    speakCombo: proto.speakCombo,
    landStrike: proto.landStrike,
    resolvePendingStrike: proto.resolvePendingStrike,
    foeWithin: () => false,
    // The slate has no wire and no history ring: the shooter sees the
    // live world (rewind 0) and a spawned shot pre-flies nothing.
    viewRewindTicks: () => 0,
    preFlyProjectile: () => undefined,
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

test('THE OVERHEAD: a rhythm TAP narrows the mountain to a falling line', () => {
  const { swings, swingAt } = mkRig('iron_greatblade');
  swingAt(0);
  swingAt(12);
  swingAt(24, true); // tapped on the payoff
  assert.equal(swings[2]!.arcHalf, 0.6, 'the cone narrows');
  assert.equal(swings[2]!.maxHit, Math.round(swings[0]!.maxHit * 3.5), 'and falls harder');
  assert.equal(swings[2]!.knockbackMult, 2.6, 'and shoves harder');
});

test('THE GUARD SWEEP: a foe at the doorstep turns the bolt into the pole', () => {
  const near = mkRig('carved_staff');
  near.rig.foeWithin = () => true;
  near.swingAt(0);
  assert.equal(near.projectiles.length, 0, 'no bolt spawns inside a chest');
  assert.equal(near.swings.length, 1, 'the pole strikes instead');
  assert.equal(near.swings[0]!.knockbackMult, GUARD_SWEEP_KNOCKBACK, 'the shove that makes room');
  assert.equal(near.swings[0]!.range, GUARD_SWEEP_RANGE);
  assert.equal(near.swings[0]!.sweepAll, true, 'the turn clears the doorstep');
  assert.deepEqual(near.windups, [GUARD_SWEEP_WINDUP], 'the moulinet coils');
  assert.equal(near.poses[0]!.pose, PoseState.Attack, 'the pose speaks steel — the pole plays');
  assert.deepEqual(near.sent.map((m) => m.stage), [0], 'the rhythm stage still advances');
  const far = mkRig('carved_staff');
  far.swingAt(0);
  assert.equal(far.projectiles.length, 1, 'open ground keeps the bolt');
  assert.equal(far.poses[0]!.pose, PoseState.Cast);
});

test('THE WEAVE: the echo breathes with the string at exact parity', () => {
  const { player, swingAt } = mkRig('bronze_sword');
  player.equipment.offhand = { id: 'shiv' };
  const avg = 5.5 / 4; // the sword page's own average
  const seen: number[] = [];
  swingAt(0);
  seen.push(player.offhandEchoMult);
  swingAt(7);
  seen.push(player.offhandEchoMult);
  swingAt(14);
  seen.push(player.offhandEchoMult);
  swingAt(21);
  seen.push(player.offhandEchoMult);
  assert.ok(Math.abs(seen[0]! - 1 / avg) < 1e-9, 'soft on the chips');
  assert.ok(Math.abs(seen[3]! - FINISHER_DAMAGE_MULT / avg) < 1e-9, 'heavy on the payoff');
  const sum = seen.reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sum - 4) < 1e-9, 'Σ mults over the string = len — parity by construction');
});

test('the echo lands at the beat weight it mirrors', () => {
  const { rig, player, swings } = mkRig('bronze_sword');
  player.equipment.offhand = { id: 'shiv' };
  player.skills = { dualwield: 0 };
  player.offhandEchoMult = 2;
  proto.offhandStrike.call(rig, 1, player, 0);
  const heavy = swings[0]!.maxHit;
  swings.length = 0;
  player.offhandEchoMult = 1;
  proto.offhandStrike.call(rig, 1, player, 0);
  assert.ok(Math.abs(heavy - swings[0]!.maxHit * 2) <= 1, 'the echo scales with the beat');
});

test('THE OVERCHARGE VOLLEY: held past full, the release fans three shafts', () => {
  const single = mkRig('shortbow');
  single.player.inventory = [{ item: 'arrow', qty: 50 }];
  single.player.drawTicks = DRAW_FULL_TICKS; // a plain full draw
  proto.tickBowDraw.call(
    single.rig,
    1,
    single.player,
    (proto.equippedWeapon as Fn).call(single.rig, single.player),
    false,
    0,
    1,
  );
  assert.equal(single.projectiles.length, 1);
  const one = single.projectiles[0]!.maxHit as number;

  const volley = mkRig('shortbow');
  volley.player.inventory = [{ item: 'arrow', qty: 50 }];
  volley.player.drawTicks = DRAW_FULL_TICKS + OVERCHARGE_TICKS;
  proto.tickBowDraw.call(
    volley.rig,
    1,
    volley.player,
    (proto.equippedWeapon as Fn).call(volley.rig, volley.player),
    false,
    0,
    1,
  );
  assert.equal(volley.projectiles.length, 3, 'the fan');
  assert.ok(
    volley.projectiles.every(
      (p) => (p.maxHit as number) === Math.max(1, Math.round(one * VOLLEY_DMG_FACTOR)),
    ),
    'each shaft carries the volley fraction',
  );
  assert.equal(volley.projectiles[0]!.fullDraw, true, 'the center shaft keeps the riders');
  assert.equal(volley.projectiles[1]!.fullDraw, false);
  const dirs = volley.projectiles.map((p) => Math.atan2(p.dirY as number, p.dirX as number));
  assert.ok(dirs[1]! < dirs[0]! && dirs[2]! > dirs[0]!, 'the wings spread');
  assert.equal(volley.player.inventory[0]!.qty, 49, 'one nocked arrow — the overcharge splits it');
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
    chunks: new Map(),
    forEachNpcNear: proto.forEachNpcNear,
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
