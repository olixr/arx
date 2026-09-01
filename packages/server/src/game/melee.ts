/**
 * THE CUT'S RESOLUTION — the equipped weapon, the combo voice, the swing, the landed strike and the smashable props in its arc.
 * Moved verbatim off GameServer (foundations F4); the class keeps
 * one-line delegators so every caller and test slate reads unchanged.
 */
import { PlaneId, isRiftPlane, itemDef, movesetFor, rolledStats, strikePose, weaponStrikeEffects } from '@arx/content';
import { BACKSTAB_MULT_DEFAULT, COMBO_STAGES, DestructibleInfo, EntityId, EntityKind, GUARD_SWEEP_KNOCKBACK, GUARD_SWEEP_RANGE, GUARD_SWEEP_WINDUP, PLAYER_POWER_PER_LEVEL, POLEARM_WAR_GRIP_MULT, STRIKE_CLOCKS, SkillId, StatusId, TILE_DEFS, TWOHAND_ARC_HALF, Tile, advanceCombo, destructibleInfo, isBehind, levelForXp, nearestFloorTile, offhandDamageFactor, powerMult as powerMultFn, statusSwingFactor, swingCooldown, swingMult } from '@arx/shared';
import { rollBasic, surgeCritPct, surgeDmgMult } from './formulas.js';
import type { GameServer, PlayerComp } from './gameServer.js';

export function equippedWeapon(srv: GameServer, player: PlayerComp) {
  const worn = player.equipment.weapon;
  if (!worn) return null;
  const def = itemDef(worn.id);
  if (!def?.weapon) return null;
  // Rolled weapons carry rarity in the edge: derive the instance's
  // damage (fractional — every maxHit site rounds downstream). Weapons
  // not yet migrated into the gear schema pass through untouched.
  const rolled = rolledStats(worn.id, worn.roll);
  const weapon =
    rolled?.damage !== undefined ? { ...def.weapon, damage: rolled.damage } : def.weapon;
  return { id: worn.id, weapon };
}

/**
 * THE SPOKEN BEAT: tell the swinging session what stage just played
 * and how long its string stays alive. Own-session only, one tiny
 * message per basic — the combo stops being a server secret.
 * Stamped AFTER the lane sets recovery + grace, so `grace` is the
 * honest remaining window from this tick.
 */
export function speakCombo(srv: GameServer, player: PlayerComp, stage: number, len = COMBO_STAGES): void {
  player.session?.sendJson({
    t: 'combo',
    stage,
    len,
    grace: Math.max(0, player.combo.graceUntilTick - srv.tickCount),
    run: player.combo.run,
  });
}

export function tryPlayerAttack(srv: GameServer, 
  eid: EntityId,
  player: PlayerComp,
  aim: number,
  seq: number,
  tapped = false,
  pressLagTicks = 0,
): void {
  if (player.attackCooldown > 0) return;
  // FAIR HANDS: a held body (a riding stagger) swings nothing
  // (inline — the slate-test law).
  if (srv.statuses?.get(eid)?.some((s) => (s.stunLeft ?? 0) > 0)) return;
  const equipped = srv.equippedWeapon(player);
  if (process.env.COMBAT_DEBUG) {
    console.log(`[combat] attack eid=${eid} weapon=${equipped?.id ?? 'none'} style=${equipped?.weapon.style ?? '-'}`);
  }
  if (!equipped) return;
  const { weapon } = equipped;
  // THE MOVESET BOOK: the weapon's page IS the lane. Archery routes
  // through tickBowDraw before this door ever sees it, and a style
  // with no page pays nothing and fires nothing — checked BEFORE the
  // cooldown/reveal pay.
  const moveset = movesetFor(weapon, equipped.id);
  if (!moveset) {
    if (process.env.COMBAT_DEBUG) {
      console.log(`[combat] no moveset page for style=${weapon.style}`);
    }
    return;
  }

  // THE SWING CHANNEL (buff forge): worn gear × riding buffs, band-
  // clamped — the ONE swing multiplier, paid here and mirrored by
  // the client's prediction lanes through the same shared math. The
  // bow keeps its own draw clock (a deliberate Phase 5 door).
  const swing = swingMult(
    (player.gear.attackSpeedMult ?? 1) * statusSwingFactor(srv.statuses?.get(eid)),
    player.buffs,
  );
  player.attackCooldown = swingCooldown(weapon.cooldownTicks, swing);
  player.lastCombatAt = Date.now();
  // Backstab eligibility is judged at the moment of the swing — capture
  // stealth BEFORE the attack reveals us.
  const wasHidden = player.hidden;
  srv.revealPlayer(eid, player);

  const level = srv.effectiveLevel(player, weapon.style);
  // School-tuned gear (Blazing Edge etc.) amplifies bolts of its element.
  const elementMult =
    weapon.style === 'arx' && weapon.element
      ? (player.gear.elementDmgMult[weapon.element] ?? 1)
      : 1;
  // THE VERSATILE GRIP: an empty off fist takes the war grip — both
  // hands on the haft, the d6→d8 step. Resolved live at this door,
  // never stored; a back-mounted quiver leaves the grip free.
  const offSlot = player.equipment.offhand;
  const warGrip =
    weapon.style === 'polearm' && (!offSlot || itemDef(offSlot.id)?.backMounted === true);
  const maxHit = Math.max(
    1,
    Math.round(
      weapon.damage *
        powerMultFn(level, PLAYER_POWER_PER_LEVEL) *
        player.gear.styleDmgMult[weapon.style] *
        elementMult *
        (warGrip ? POLEARM_WAR_GRIP_MULT + player.perks.warGripBonus : 1),
    ),
  );

  // One data-driven door for every page: advance the ONE track, read
  // the beat's strike (a rhythm TAP takes the branch where one is
  // authored), pay its recovery, speak it, pose it, and land it on
  // the choreography's impact frame.
  const len = moveset.string.length;
  const stage = advanceCombo(player.combo, equipped.id, srv.tickCount, len);
  const beat = moveset.string[stage]!;
  const strike = tapped && beat.alt ? beat.alt : beat;
  const finisher = stage === len - 1;
  // The strike's recovery pays through the swing channel too, with
  // THE CHOREOGRAPHY FLOOR: haste never starts the next swing before
  // this one's pose hold ends (the client mirror does the same math).
  const swingClock = STRIKE_CLOCKS[weapon.style as keyof typeof STRIKE_CLOCKS];
  const holdFloor = swingClock
    ? finisher
      ? swingClock.finisher.holdTicks
      : swingClock.swing.holdTicks
    : 1;
  player.attackCooldown = swingCooldown(
    Math.round(weapon.cooldownTicks * strike.recoveryMult),
    swing,
    holdFloor,
  );
  player.combo.graceUntilTick = srv.tickCount + player.attackCooldown + moveset.graceTicks;
  srv.speakCombo(player, stage, len);
  // THE GUARD SWEEP: a foe inside the pole's reach turns a wand beat
  // into a STRIKE — the moulinet the staff choreography always knew,
  // not a bolt spawned inside the enemy's chest. Same beat, same
  // damage, same rhythm stage; the delivery answers the range, and
  // the pose speaks steel so the pole choreography plays.
  const pos = srv.positions.must(eid);
  // THE SWEEP JUDGES WHAT YOU SAW: the doorstep is measured against
  // the foe positions the shooter's screen was showing at the press
  // (the same rewind law melee hit tests ride) — the client's guard
  // mirror reads its interpolated view, which IS that rewound state,
  // so bolt-vs-pole stops flickering against a strafing foe.
  const guard =
    moveset.style === 'arx' &&
    srv.foeWithin(pos, GUARD_SWEEP_RANGE, srv.viewRewindTicks(player));
  // THE STRIKE CLOCK + THE POSE ALTERNATION LAW: any string length
  // rides the existing pose bytes, adjacent beats never repeating
  // (a guard beat between bolts still flips the byte — steel vs
  // Cast — so the anim clock stays honest).
  const clock = STRIKE_CLOCKS[moveset.style][finisher ? 'finisher' : 'swing'];
  srv.setPose(
    eid,
    strikePose(guard ? 'steel' : moveset.poseDialect, stage, len),
    clock.holdTicks,
  );
  // TEMPO: rhythm held past one full string quickens the hand — the
  // windup shaves a tick. Speed, never damage (the cadence contract).
  const windup = guard
    ? GUARD_SWEEP_WINDUP
    : Math.max(0, strike.windupTicks - (player.combo.run > len ? 1 : 0));

  if (moveset.style === 'arx' && !guard) {
    // Wand rhythm: bolt → bolt → orb. The bolt spawns at the press —
    // its flight is already the honest travel (windup 0 by authoring).
    const proj = srv.ecs.create();
    srv.kinds.set(proj, EntityKind.Projectile);
    srv.positions.set(proj, { x: pos.x, y: pos.y, dir: aim, plane: pos.plane });
    srv.projectiles.set(proj, {
      ownerEid: eid,
      style: 'arx',
      maxHit: Math.round(maxHit * strike.dmgMult),
      dirX: Math.cos(aim),
      dirY: Math.sin(aim),
      speed: (weapon.projectileSpeed ?? 12) * (strike.speedMult ?? 1),
      distLeft: weapon.range,
      basic: true,
      spawnSeq: seq,
      element: weapon.element,
      heavy: finisher || undefined,
      splashRadius: strike.splash,
      // Ember Bolt passive: the payoff beat sets things burning.
      status:
        finisher && srv.hasPassive(player, 'ember_bolt')
          ? { status: 'burn', power: 1, durationTicks: 60 }
          : undefined,
    });
    // THE SHOT REMEMBERS ITS PRESS: fly the wire's worth of ticks
    // now, through the same step door — the bolt is born where the
    // shooter's tracer already is.
    srv.preFlyProjectile(proj, pressLagTicks);
    return;
  }

  // Steel lanes — THE HONEST SWING: the blow is committed at the
  // press (cooldown, pose, the spoken beat) and LANDS at the impact
  // frame. Every number is captured now: the promise made is the
  // promise kept, a mid-windup swap changes nothing.
  const strikeData = {
    at: srv.tickCount + windup,
    pressTick: srv.tickCount,
    aim,
    // Follow-Through rides only the finisher — the rhythm's payoff.
    maxHit: finisher
      ? Math.round(maxHit * strike.dmgMult * player.perks.finisherBonusMult)
      : Math.round(maxHit * strike.dmgMult),
    kbMult: guard ? GUARD_SWEEP_KNOCKBACK : strike.kbMult,
    // The pole's turn clears the doorstep; steel beats read the page.
    sweepAll: guard ? true : strike.sweepAll,
    wasHidden,
    backstabMult: weapon.backstabMult ?? BACKSTAB_MULT_DEFAULT,
    xpStyle: moveset.style as SkillId,
    arcHalf: guard
      ? TWOHAND_ARC_HALF
      : (strike.arcHalf ?? (moveset.style === 'twohand' ? TWOHAND_ARC_HALF : Math.PI / 3)),
    // Farcleaver: the edge arrives before the argument.
    range: guard
      ? GUARD_SWEEP_RANGE
      : weapon.range +
        (moveset.style === 'twohand'
          ? player.perks.greatReach
          : moveset.style === 'polearm'
            ? player.perks.poleReach
            : 0),
    deed: moveset.style === 'twohand',
    // THE READING EDGE: the beat's consume clause is captured at
    // the press like every other number — the promise made is the
    // promise kept. The guard sweep is a doorstep clearing, not a
    // page beat, and spends nothing.
    consumes: guard ? undefined : strike.consumes,
  };
  if (windup === 0) srv.landStrike(eid, player, strikeData);
  else player.pendingStrike = strikeData;
  // Dual wield: the off blade echoes every mainhand swing a
  // half-beat later. Scheduled from the press, so the echo still
  // trails the main IMPACT by the rig's one-two beat.
  if (moveset.style === 'onehand' && srv.offhandWeapon(player)) {
    // Ambidexter tightens the echo's schedule.
    player.offhandEchoTicks = player.perks.offhandDelayTicks;
    player.offhandEchoAim = aim;
    // THE WEAVE: the echo breathes with the string — soft on the
    // chips, heavy on the payoff — normalized by the page's own
    // average, so the echo's cycle output is EXACTLY what the flat
    // echo paid (Σ dmgMult/avg = len, by construction).
    const avg = moveset.string.reduce((a, b) => a + b.dmgMult, 0) / len;
    player.offhandEchoMult = strike.dmgMult / avg;
  }
}

/**
 * A living foe (never a companion) inside `range` of this body.
 * `rewindTicks` > 0 measures against the foe's REWOUND position —
 * what the asking player's screen showed — via the same history
 * ring melee lag comp reads.
 */
export function foeWithin(srv: GameServer, pos: { plane: PlaneId; x: number; y: number }, range: number, rewindTicks = 0): boolean {
  let found = false;
  srv.forEachNpcNear(pos.plane, pos.x, pos.y, range, (npcEid, npc) => {
    if (srv.pets.has(npcEid) || srv.companions.has(npcEid)) return;
    const hp = srv.healths.get(npcEid);
    if (!hp || hp.hp <= 0) return;
    const npos = srv.npcPosAt(npcEid, rewindTicks);
    if (!npos) return;
    if (Math.hypot(npos.x - pos.x, npos.y - pos.y) - npc.def.radius <= range) {
      found = true;
      return true;
    }
  });
  return found;
}

/** The impact frame arriving: a committed strike lands. */
export function landStrike(srv: GameServer, 
  eid: EntityId,
  player: PlayerComp,
  s: NonNullable<PlayerComp['pendingStrike']>,
): void {
  const felled = srv.meleeSwing(
    eid,
    player,
    s.aim,
    s.range,
    s.maxHit,
    s.kbMult,
    s.sweepAll,
    s.wasHidden,
    s.backstabMult,
    s.xpStyle,
    s.arcHalf,
    // Lag comp: the world the attacker saw at the PRESS — the base
    // rewind plus however long this blow has been in flight.
    srv.tickCount - s.pressTick,
    s.consumes ? { ...s.consumes, consume: true } : undefined,
  );
  // THE UNWRITTEN PAGE: three felled by ONE turn of the great
  // steel is the whirlwind's deed — the crowd taught the turning.
  if (s.deed && felled >= 3) srv.grantArt(player, 'whirling_ruin');
}

/** The per-tick landing door for blows in flight. */
export function resolvePendingStrike(srv: GameServer, eid: EntityId, player: PlayerComp): void {
  const s = player.pendingStrike;
  if (!s || srv.tickCount < s.at) return;
  player.pendingStrike = null;
  srv.landStrike(eid, player, s);
}

/**
 * The offhand echo: a second, lighter cut from the off blade. Damage
 * scales by offhandDamageFactor(dualwield) — clumsy at discovery,
 * near-mirrored at mastery — and every landed echo trains dualwield
 * (that's the ONLY way it trains). The base scaling still rides
 * onehand: it is a one-handed strike, thrown by the weaker hand.
 */
export function offhandStrike(srv: GameServer, eid: EntityId, player: PlayerComp, aim: number): void {
  const off = srv.offhandWeapon(player);
  if (!off) return;
  const dwLevel = levelForXp(player.skills.dualwield ?? 0);
  const level = srv.effectiveLevel(player, 'onehand');
  // Twin Tempo lifts the echo — the never-mirrors cap holds.
  const trained = Math.min(0.85, offhandDamageFactor(dwLevel) + player.perks.offhandFactorBonus);
  // THE MIRRORED HAND: while the stance rides, the echo lands at the
  // buff's weight when that beats the trained factor — parity at the
  // stance's honed peak, never past it (the off hand never OUT-hits
  // the main; the passive curve's law stands untouched).
  let stanceWeight = 0;
  for (const b of player.buffs) {
    if (b.untilTick > srv.tickCount) stanceWeight = Math.max(stanceWeight, b.offhandWeight);
  }
  const maxHit = Math.max(
    1,
    Math.round(
      off.weapon.damage *
        powerMultFn(level, PLAYER_POWER_PER_LEVEL) *
        player.gear.styleDmgMult.onehand *
        Math.max(trained, Math.min(1, stanceWeight)) *
        // THE WEAVE: the off blade breathes with the string it
        // mirrors — soft on the chips, heavy on the payoff beat.
        player.offhandEchoMult,
    ),
  );
  // NO pose here: the echo is pure client choreography (the rig's
  // one-two law animates the off blade inside the MAIN swing's
  // pose beat). Re-posing mid-swing restarted the main hand's
  // animation clock — the client played a second mainhand cut over
  // the first, and the off blade never moved: the "flailing" bug.
  srv.meleeSwing(
    eid,
    player,
    aim,
    off.weapon.range,
    maxHit,
    0.6,
    false,
    false,
    off.weapon.backstabMult ?? BACKSTAB_MULT_DEFAULT,
    'dualwield',
  );
}

export function meleeSwing(srv: GameServer, 
  eid: EntityId,
  player: PlayerComp,
  aim: number,
  range: number,
  maxHit: number,
  knockbackMult = 1,
  sweepAll = false,
  wasHidden = false,
  backstabMult = BACKSTAB_MULT_DEFAULT,
  xpStyle: SkillId = 'onehand',
  /** Sweep half-angle — swords cut a ±60° cone, greatweapons wider. */
  arcHalf = Math.PI / 3,
  /** Extra rewind ticks: how long this blow flew after its press. */
  extraRewind = 0,
  /** THE READING EDGE: the beat's payoff clause, per struck body. */
  vs?: { status: StatusId; mult: number; consume?: boolean },
  /** @returns bodies FELLED by this one swing (the whirlwind's deed). */
): number {
  const pos = srv.positions.must(eid);
  // Every swing sweeps the scenery too: destructible clutter in the
  // arc bursts regardless of what the blade finds to bleed — through
  // the SAME cone the blade cuts (a greatweapon's wide reap clears
  // wide scenery; this used to hardcode the sword's ±60°).
  srv.smashPropsInArc(pos, aim, range, arcHalf);
  // Strike effects live on the blade that lands — the echo cut reads
  // the offhand instance, exactly like coats.
  const struckWeapon =
    xpStyle === 'dualwield' ? player.equipment.offhand : player.equipment.weapon;
  if (struckWeapon) {
    backstabMult += weaponStrikeEffects(struckWeapon.id, struckWeapon.roll).backstabBonus;
  }
  // Opportunist: the turned back pays the practiced hand more.
  backstabMult += player.perks.backstabBonus;
  const critPct = player.gear.critPct + surgeCritPct(player);
  maxHit = Math.max(1, Math.round(maxHit * surgeDmgMult(player)));
  // LAG COMP: test the swing against the world the ATTACKER saw —
  // NPC positions rewound by their view delay (see npcHist), plus
  // the windup this blow spent in flight since its press. Damage
  // and knockback still resolve on the live entity.
  const rewind = srv.viewRewindTicks(player) + extraRewind;
  // A strike out of full stealth backstabs from any angle; otherwise a
  // sneaking attacker must be inside the cone behind the target's facing.
  const backstabs = (npos: { x: number; y: number; dir: number }): boolean =>
    wasHidden || (player.sneaking && isBehind(pos.x, pos.y, npos.x, npos.y, npos.dir));
  let bestTarget: EntityId | null = null;
  let bestDist = Infinity;
  const inArc: EntityId[] = [];
  srv.forEachNpcNear(pos.plane, pos.x, pos.y, range, (npcEid, npc) => {
    // A companion is not a target — the blade picks the mob behind it.
    if (srv.pets.has(npcEid) || srv.companions.has(npcEid)) return;
    const npos = srv.npcPosAt(npcEid, rewind);
    if (!npos) return;
    const dx = npos.x - pos.x;
    const dy = npos.y - pos.y;
    const dist = Math.hypot(dx, dy) - npc.def.radius;
    if (dist > range) return;
    // Within the weapon's sweep arc of the aim direction; anything
    // practically touching the player is hittable regardless of aim
    // (feel > sim).
    const angleTo = Math.atan2(dy, dx);
    let diff = Math.abs(angleTo - aim) % (Math.PI * 2);
    if (diff > Math.PI) diff = Math.PI * 2 - diff;
    if (diff > arcHalf && dist > 0.9) return;
    inArc.push(npcEid);
    if (dist < bestDist) {
      bestDist = dist;
      bestTarget = npcEid;
    }
  });
  if (sweepAll) {
    // The finisher clears the crowd — everyone in the arc eats it.
    let felled = 0;
    for (const npcEid of inArc) {
      const backstab = backstabs(srv.npcPosAt(npcEid, rewind) ?? srv.positions.must(npcEid));
      let { dmg, crit } = rollBasic(backstab ? Math.round(maxHit * backstabMult) : maxHit, critPct);
      // Executioner: greatblows bite deeper into the nearly-felled.
      if (dmg > 0 && xpStyle === 'twohand' && player.perks.greatExecute > 0) {
        const hp = srv.healths.get(npcEid);
        if (hp && hp.hp / hp.maxHp < 0.25) dmg = Math.round(dmg * (1 + player.perks.greatExecute));
      }
      srv.damageNpc(npcEid, dmg, eid, xpStyle, {
        crit,
        knockbackMult,
        basic: true,
        backstab,
        offhand: xpStyle === 'dualwield',
        vs,
      });
      const after = srv.healths.get(npcEid);
      if (!after || after.hp <= 0) felled++;
    }
    return felled;
  }
  if (process.env.COMBAT_DEBUG) {
    let nearest = Infinity;
    for (const [npcEid] of srv.npcs) {
      const npos = srv.positions.get(npcEid);
      if (npos) nearest = Math.min(nearest, Math.hypot(npos.x - pos.x, npos.y - pos.y));
    }
    console.log(
      `[combat] swing eid=${eid} at(${pos.x.toFixed(1)},${pos.y.toFixed(1)}) aim=${aim.toFixed(2)} ` +
        `target=${bestTarget} nearestNpc=${nearest.toFixed(2)}`,
    );
  }
  if (bestTarget !== null) {
    const backstab = backstabs(srv.npcPosAt(bestTarget, rewind) ?? srv.positions.must(bestTarget));
    const { dmg, crit } = rollBasic(backstab ? Math.round(maxHit * backstabMult) : maxHit, critPct);
    srv.damageNpc(bestTarget, dmg, eid, xpStyle, {
      crit,
      knockbackMult,
      basic: true,
      backstab,
      offhand: xpStyle === 'dualwield',
      vs,
    });
    const after = srv.healths.get(bestTarget);
    if (!after || after.hp <= 0) return 1;
  }
  return 0;
}

/**
 * Sweep the strike arc for destructible clutter — same cone law as
 * the NPC sweep (the caller's arcHalf of aim, touch range always
 * counts) so a swing that would cut a goblin also bursts the barrel
 * beside it. Every prop in the arc goes at once: clearing a room is
 * the fantasy.
 */
export function smashPropsInArc(srv: GameServer, 
  pos: { plane: PlaneId; x: number; y: number },
  aim: number,
  range: number,
  arcHalf = Math.PI / 3,
): void {
  const world = srv.worldOf(pos.plane);
  const r = Math.ceil(range + 1);
  const ptx = Math.floor(pos.x);
  const pty = Math.floor(pos.y);
  for (let ty = pty - r; ty <= pty + r; ty++) {
    for (let tx = ptx - r; tx <= ptx + r; tx++) {
      const g = world.groundAt(tx, ty);
      if (g === undefined) continue;
      const info = destructibleInfo(g);
      if (!info) continue;
      const dx = tx + 0.5 - pos.x;
      const dy = ty + 0.5 - pos.y;
      const dist = Math.hypot(dx, dy) - 0.35;
      if (dist > range) continue;
      const angleTo = Math.atan2(dy, dx);
      let diff = Math.abs(angleTo - aim) % (Math.PI * 2);
      if (diff > Math.PI) diff = Math.PI * 2 - diff;
      if (diff > arcHalf && dist > 0.9) continue;
      srv.hitProp(pos.plane, tx, ty, g as Tile, info, angleTo);
    }
  }
}

/**
 * Land one blow on a destructible prop. Durability is counted in
 * HITS, not damage — bulk reads as bulk at every level. A blow that
 * leaves wood standing broadcasts the same 'smash' fx with the
 * remaining fraction in `radius` (the client shudders the prop and
 * spits chips); the last blow runs the full burst.
 */
export function hitProp(srv: GameServer, 
  plane: PlaneId,
  tx: number,
  ty: number,
  tile: Tile,
  info: DestructibleInfo,
  dir: number,
): void {
  const key = `${plane}|${tx},${ty}`;
  const left = (srv.propDamage.get(key) ?? info.hits) - 1;
  if (left > 0) {
    srv.propDamage.set(key, left);
    srv.broadcastFx(plane, {
      t: 'fx',
      kind: 'smash',
      x: tx + 0.5,
      y: ty + 0.5,
      radius: left / info.hits,
      dir,
      id: info.kind,
    });
    return;
  }
  srv.propDamage.delete(key);
  srv.smashProp(plane, tx, ty, tile, info, dir);
}

/**
 * Burst a destructible prop. The tile becomes the floor beneath it
 * (the shared nearestFloorTile law — exactly the underlay the client
 * already painted, so nothing pops), collision and pathing follow
 * the ordinary patch, and the respawn queue stands the prop back up
 * after its absence has been enjoyed. The debris itself is pure
 * client-side theatre keyed off ONE broadcast fx — the server never
 * simulates a splinter.
 */
export function smashProp(srv: GameServer, 
  plane: PlaneId,
  tx: number,
  ty: number,
  tile: Tile,
  info: DestructibleInfo,
  dir: number,
): void {
  // Fx FIRST: it carries the impact heading + kind, and must land
  // before the tile patch that erases the prop.
  srv.broadcastFx(plane, {
    t: 'fx',
    kind: 'smash',
    x: tx + 0.5,
    y: ty + 0.5,
    radius: 0, // nothing left standing — the burst
    dir,
    id: info.kind,
  });
  // A player-built prop remembers its true ground; authored clutter
  // reveals the same floor the client bakes beneath it.
  const world = srv.worldOf(plane);
  const built = world.builtAt(tx, ty);
  const floor =
    built && !TILE_DEFS[built.prevTile as Tile]?.solid
      ? (built.prevTile as Tile)
      : nearestFloorTile((x, y) => world.groundAt(x, y), tx, ty);
  srv.setWorldTile(plane, tx, ty, floor);
  // THE CLEARED HALL STAYS CLEARED: inside a live delve nothing
  // stands back up — a smashed cracked wall stays open (never
  // resealing a hidden room mid-run), a scattered bone pile stays
  // scattered. The re-cut on the next key turn is the reset.
  if (!isRiftPlane(plane)) {
    srv.respawnQueue.push({
      at: Date.now() + info.respawnSec * 1000,
      plane,
      tx,
      ty,
      tile,
      over: floor,
    });
  }
}
