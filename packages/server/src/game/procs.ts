/**
 * THE DEEPER SIGIL'S ENGINE — proc state, the offer, the four moment doors (body, steel, low-hp, stride) and the guarded runner.
 * Moved verbatim off GameServer (foundations F4); the class keeps
 * one-line delegators so every caller and test slate reads unchanged.
 */
import { ELEMENT_COLORS, ProcEffect, ProcMoment, ProcRuntime, SURFACE_PLANE_ID, TARGETED_ACTIONS, mkProcRuntime, procWakes, weaponStrikeEffects } from '@arx/content';
import { EntityId, EquippedItem, SkillId, survivesCleanse } from '@arx/shared';
import type { GameServer, PlayerComp, ProcContext } from './gameServer.js';
// Deferred value import of the parent module's own helpers — touched
// only inside the moved functions, long after both modules initialize.
import { CHAIN_PROC_RANGE, mkBuff } from './gameServer.js';

export function procState(srv: GameServer, player: PlayerComp, id: string): ProcRuntime {
  let st = player.procs.get(id);
  if (!st) {
    st = mkProcRuntime();
    player.procs.set(id, st);
  }
  return st;
}

/**
 * THE ONE PROC DOOR. Every trigger site funnels through here, so the
 * rest timer, the meter, and the firing all live at one seam. The
 * arbitration itself is pure and lives in content/equipment (see
 * procWakes) so the ordering laws can be pinned without a server.
 *
 * Returns whatever the action hands back (a yield working's extra),
 * 0 for everything else.
 */
export function offerProc(srv: GameServer, 
  eid: EntityId,
  player: PlayerComp,
  p: ProcEffect,
  on: ProcMoment,
  ctx: ProcContext,
  amount = 1,
): number {
  const st = srv.procState(player, p.id);
  // A stacking meter that moves — a charge banked, or the spend when
  // the working answers — reaches the wearer's HUD at tick end.
  const banked = st.stacks;
  const woke = procWakes(p, st, on, srv.tickCount, undefined, amount);
  if (st.stacks !== banked) srv.chargesDirty.add(eid);
  if (!woke) return 0;
  return srv.runProc(eid, player, p, ctx);
}

/**
 * Offer a moment to every working the BODY carries — the gear
 * aggregate and, since THE WAKING HAND, the answered packages'
 * workings beside them. Two lists, one door, one meter law. The
 * preconditions are door law, INLINE per the slate-test law, never
 * arbitration — procWakes stays pure:
 *  - a targeted working cannot answer a moment with no live foe in
 *    hand (no chance rolled, no rest stamped on a sure no-op);
 *  - a hitState working is skipped when the struck body does not
 *    carry its state (THE READING EDGE — the body lane hears it
 *    now too, since a calling's edge is the hand itself and rides
 *    aggregate-side);
 *  - a pet-targeted boon is skipped when no companion stands
 *    (THE PACK'S BLESSING — the same targeted-moment law spoken
 *    for the leash: a downed or absent companion is a sure no-op).
 *
 * All three are pinned in wornBookDoors.test.ts / procDoors.test.ts.
 */
export function bodyMoment(srv: GameServer, 
  eid: EntityId,
  player: PlayerComp,
  on: ProcMoment,
  ctx: ProcContext,
): number {
  let extra = 0;
  const offer = (p: ProcEffect): void => {
    if (
      (TARGETED_ACTIONS as readonly string[]).includes(p.action.do) &&
      (ctx.targetEid === undefined || !srv.npcs.has(ctx.targetEid))
    ) {
      return;
    }
    if (p.trigger.on === 'hitState') {
      const wanted = p.trigger.status;
      const riding =
        ctx.targetEid !== undefined &&
        (srv.statuses?.get(ctx.targetEid)?.some((s) => s.id === wanted) ?? false);
      if (!riding) return;
    }
    // THE PACK'S BLESSING door law (THE WORN BOOK): a pet-targeted
    // working cannot answer a moment with no companion standing —
    // no charge banked, no rest stamped on a sure no-op (the
    // targeted-moment law, spoken for the leash).
    if (p.action.do === 'boon' && p.action.target === 'pet') {
      const petEid = player.petEid ?? null;
      if (petEid === null || (srv.healths?.get(petEid)?.hp ?? 0) <= 0) return;
    }
    extra += srv.offerProc(eid, player, p, on, ctx);
  };
  for (const p of player.gear.procs) offer(p);
  for (const p of player.callingProcs ?? []) offer(p);
  return extra;
}

/**
 * Offer a moment to the workings on the steel that LANDED, then to
 * the body. Two dual-wielded blades carry two different edges and
 * each answers only when its own steel connects, exactly as coats do.
 */
export function steelMoment(srv: GameServer, 
  eid: EntityId,
  player: PlayerComp,
  worn: EquippedItem | undefined,
  on: ProcMoment,
  ctx: ProcContext,
): void {
  if (worn) {
    for (const p of weaponStrikeEffects(worn.id, worn.roll).procs) {
      // THE READING EDGE door law: a hitState working is skipped
      // BEFORE arbitration when the struck body does not carry its
      // state — no roll spent, no rest banked (the targeted-moment
      // law), so the published chance holds against marked bodies.
      if (p.trigger.on === 'hitState') {
        const wanted = p.trigger.status;
        const riding =
          ctx.targetEid !== undefined &&
          (srv.statuses?.get(ctx.targetEid)?.some((s) => s.id === wanted) ?? false);
        if (!riding) continue;
      }
      srv.offerProc(eid, player, p, on, ctx);
    }
  }
  srv.bodyMoment(eid, player, on, ctx);
}

/**
 * THE CROSSING: a lowHp working answers the fall past its line and
 * then goes quiet until the wearer climbs back over it. The crossing
 * is read from the health BEFORE the wound against the health after
 * it, so re-arming needs no call from any heal site — food, tonics,
 * drains, totems, lifesteal, and the regen tick all re-arm the
 * working simply by lifting the wearer over the line before the
 * next fall. One dive past the mark is one answer however many
 * small hits carried it down.
 *
 * THE DOOR REPAIR (callings-v2 Phase 2): the crossing check stays
 * here (it reads the health component — a door fact, like
 * hitState's list read), but the rest law and the firing walk
 * through offerProc with everything else. No hand-rolled icd
 * anywhere.
 */
export function lowHpMoment(srv: GameServer, eid: EntityId, player: PlayerComp, prevHp: number): void {
  const health = srv.healths.get(eid);
  if (!health || health.maxHp <= 0 || health.hp <= 0) return;
  const frac = health.hp / health.maxHp;
  const prevFrac = prevHp / health.maxHp;
  const pos = srv.positions.get(eid);
  const ctx: ProcContext = { x: pos?.x ?? 0, y: pos?.y ?? 0 };
  const offer = (p: ProcEffect): void => {
    if (p.trigger.on !== 'lowHp') return;
    if (prevFrac <= p.trigger.pct || frac > p.trigger.pct) return;
    srv.offerProc(eid, player, p, 'lowHp', ctx);
  };
  for (const p of player.gear.procs) offer(p);
  for (const p of player.callingProcs ?? []) offer(p);
}

/** Ground covered on foot feeds every stride working (one door law). */
export function strideMoment(srv: GameServer, eid: EntityId, player: PlayerComp, tiles: number): void {
  if (tiles <= 0) return;
  let ctx: ProcContext | undefined;
  const offer = (p: ProcEffect): void => {
    if (p.trigger.on !== 'stride') return;
    if (!ctx) {
      const pos = srv.positions.get(eid);
      ctx = { x: pos?.x ?? 0, y: pos?.y ?? 0 };
    }
    srv.offerProc(eid, player, p, 'stride', ctx, tiles);
  };
  for (const p of player.gear.procs) offer(p);
  for (const p of player.callingProcs ?? []) offer(p);
}

/**
 * A woken working does its work and says its name. The name floats
 * once and no number ever does: a proc is an event in the fight, and
 * a second damage number every other second is noise, not feedback.
 *
 * The wrapper holds the procDepth guard: everything an action does —
 * status lays, damage, kills the damage causes — runs under it, so
 * THE ANSWERED ECHO's door can refuse proc-born landings by
 * construction.
 */
export function runProc(srv: GameServer, eid: EntityId, player: PlayerComp, p: ProcEffect, ctx: ProcContext): number {
  // Slate-safe bookkeeping (the slate law): a bare rig without the
  // counter still walks the door.
  srv.procDepth = (srv.procDepth ?? 0) + 1;
  try {
    return srv.runProcInner(eid, player, p, ctx);
  } finally {
    srv.procDepth--;
  }
}

export function runProcInner(srv: GameServer, 
  eid: EntityId,
  player: PlayerComp,
  p: ProcEffect,
  ctx: ProcContext,
): number {
  // The working fires on its bearer's plane.
  const procPlane = srv.positions.get(eid)?.plane ?? SURFACE_PLANE_ID;
  const a = p.action;
  const color = ELEMENT_COLORS[p.element ?? 'arcane'];
  const style: SkillId = ctx.style ?? 'arx';
  const at = srv.positions.get(eid);
  let radius = 0.6;
  let x2: number | undefined;
  let y2: number | undefined;
  let extra = 0;

  switch (a.do) {
    case 'status': {
      if (ctx.targetEid === undefined || !srv.npcs.has(ctx.targetEid)) break;
      srv.applyStatusToNpc(
        ctx.targetEid,
        { status: a.status, power: a.power, durationTicks: a.ticks },
        eid,
        style,
      );
      break;
    }
    case 'boon': {
      // THE SELF-BLESSING: the working lays a boon page on its own
      // wearer through the real player apply door — count stacks,
      // swing re-mirror, chips, the whole visible layer answer as
      // they do for any other page. Boon-lane-only is load law
      // (procMismatch); the door needs no second check.
      //
      // THE PACK'S BLESSING (THE WORN BOOK): target 'pet' hands the
      // page to the companion instead, through the pet's own NPC
      // apply door — a quickened pet TRULY swings faster, the NPC
      // swing sites fold statusSwingFactor already. No companion
      // standing means a silent refusal (the aggregate lane also
      // refuses at the door, charge unspent), and the page can never
      // reach any other player: only the wearer's own petEid is a
      // candidate.
      if (a.target === 'pet') {
        const petEid = player.petEid ?? null;
        if (petEid === null || (srv.healths?.get(petEid)?.hp ?? 0) <= 0) return extra;
        srv.applyStatusToNpc(
          petEid,
          { status: a.status, power: a.power, durationTicks: a.ticks },
          eid,
          'beastcraft',
        );
        const pp = srv.positions?.get(petEid);
        if (at && pp) {
          x2 = pp.x;
          y2 = pp.y;
        }
        radius = 0.9;
        break;
      }
      srv.applyStatusToPlayer(eid, { status: a.status, power: a.power, durationTicks: a.ticks }, eid);
      radius = 0.9;
      break;
    }
    case 'bolt': {
      if (ctx.targetEid === undefined || !srv.npcs.has(ctx.targetEid)) break;
      const tp = srv.positions.get(ctx.targetEid);
      if (at && tp) {
        x2 = tp.x;
        y2 = tp.y;
      }
      srv.damageNpc(ctx.targetEid, a.damage, eid, style, { fromProc: true });
      break;
    }
    case 'nova': {
      radius = a.radius;
      for (const npcEid of srv.npcsWithin(procPlane, ctx.x, ctx.y, a.radius)) {
        srv.damageNpc(npcEid, a.damage, eid, style, {
          knockFrom: { x: ctx.x, y: ctx.y },
          fromProc: true,
        });
      }
      break;
    }
    case 'chain': {
      // The struck foe first, then the nearest others outward — the
      // same walk the reaction table's chain effect takes.
      const hit = ctx.targetEid !== undefined && srv.npcs.has(ctx.targetEid) ? [ctx.targetEid] : [];
      for (const npcEid of srv.npcsWithin(procPlane, ctx.x, ctx.y, CHAIN_PROC_RANGE)) {
        if (hit.length > a.jumps) break;
        if (!hit.includes(npcEid)) hit.push(npcEid);
      }
      let from = { x: ctx.x, y: ctx.y };
      for (const npcEid of hit) {
        const tp = srv.positions.get(npcEid);
        if (tp) {
          srv.broadcastFx(procPlane, {
            t: 'fx',
            kind: 'proc',
            x: from.x,
            y: from.y,
            x2: tp.x,
            y2: tp.y,
            radius: 0.4,
            color,
            // The final broadcast's `<action>:<procId>` convention —
            // a bare proc id fell back to the status shape client-side.
            id: `${a.do}:${p.id}`,
          });
          from = { x: tp.x, y: tp.y };
        }
        srv.damageNpc(npcEid, a.damage, eid, style, { fromProc: true });
      }
      break;
    }
    case 'ward': {
      player.buffs.push(
        mkBuff({ shieldHp: a.absorb, name: p.name, untilTick: srv.tickCount + a.ticks }),
      );
      srv.sendBuffs(player);
      radius = 0.9;
      break;
    }
    case 'heal': {
      // A mend that lifts the wearer over a lowHp line re-arms the
      // workings that watch it by nature now: the crossing is read
      // from prev-vs-new health at the next wound, so no re-arm
      // call is owed here (or at any other heal site).
      const health = srv.healths.get(eid);
      if (health) health.hp = Math.min(health.maxHp, health.hp + a.amount);
      break;
    }
    case 'surge': {
      const until = srv.tickCount + a.ticks;
      const lift = a.pct / 100;
      player.buffs.push(
        mkBuff({
          name: p.name,
          ...(a.stat === 'speed'
            ? { speedMult: 1 + lift, untilTick: until }
            : a.stat === 'swing'
              ? { attackSpeedMult: 1 + lift, untilTick: until }
              : a.stat === 'armor'
                ? { armor: a.pct, untilTick: until }
                : a.stat === 'regen'
                  ? { regenPer4s: a.pct, untilTick: until }
                  : a.stat === 'crit'
                    ? { critPct: a.pct, untilTick: until }
                    : { dmgMult: 1 + lift, untilTick: until }),
        }),
      );
      srv.sendBuffs(player);
      // A speed surge moves the steady mult — the ride mirror's law.
      if (a.stat === 'speed') srv.rideDirty.add(player);
      radius = 0.9;
      break;
    }
    case 'cleanse': {
      // THE HONEST CLEANSE: hostile pages strip; boons ride on (a
      // mend must never die to its bearer's own dispel).
      const clist = srv.statuses.get(eid)?.filter((s) => survivesCleanse(s.id));
      if (clist && clist.length > 0) srv.statuses.set(eid, clist);
      else srv.statuses.delete(eid);
      radius = 0.9;
      break;
    }
    case 'yield': {
      extra = a.extra;
      break;
    }
    case 'reveal': {
      radius = a.radius;
      srv.revealNearby(eid, ctx, a.radius, a.of, color);
      break;
    }
  }

  srv.broadcastFx(procPlane, {
    t: 'fx',
    kind: 'proc',
    x: ctx.x,
    y: ctx.y,
    x2,
    y2,
    radius,
    color,
    text: p.name,
    // `<action>:<procId>` — the projectile defId's `arx:<element>`
    // convention. The client shapes the moment off the ACTION so a
    // working looks right the day it is authored, and still gets to
    // override with a bespoke signature registered under either key.
    id: `${a.do}:${p.id}`,
  });
  return extra;
}
