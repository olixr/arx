/**
 * THE BOOK OF STATES' ENGINE — laying, stacking (four models), ticking and reading the status ledger for NPCs and players.
 * Moved verbatim off GameServer (foundations F4); the class keeps
 * one-line delegators so every caller and test slate reads unchanged.
 * Intra-family calls dispatch through srv.* ON PURPOSE — test slates
 * stub siblings, and the stub must win over the module's own copy.
 */
import { bossStunTicks } from './bossMind.js';
import { ProcEffect } from '@arx/content';
import { AFFLICTION_STACKS_SHIFT, COUNT_STACKS_SHIFT, EntityId, SHEATHED_BIT, SHOCK_MAX_TICKS, SNEAK_DETECTED_BIT, SNEAK_HIDDEN_BIT, STATUS_BIT, SkillId, StatusApply, applyCount, ccTicksFor, decayAtZero, effectivePower, isSpark, pageOf, reactionDamage, reactionFor, refreshMax, sunderAmp, weakestOf } from '@arx/shared';
import type { GameServer, ProcContext } from './gameServer.js';

/**
 * A PLAYER'S OWN HAND laying a page — the door that rings THE
 * ANSWERED ECHO. The apply door itself (applyStatusToNpc) answers
 * whether the page truly LANDED (a resist, a ward, or an immunity
 * window is a refusal; a spark spent into a reaction is a landing —
 * the page answered, in fire instead of residence), and a true
 * landing offers the source's stateApplied workings their moment,
 * status-matched HERE so the arbitration stays pure. The echo fires
 * AFTER the door returns — never mid-apply, so a woken working that
 * lays its own pages can never alias the list being written.
 *
 * Who rings it is a routing law, not a flag: the player-hand sites
 * (ability statuses, coats, strike edges, buff edges, house words)
 * call THIS door; pets, NPC self-pages, reaction plagues, and proc
 * actions call applyStatusToNpc directly and never echo — PROCS
 * NEVER BEGET PROCS and THE METER IS THE FIGHTER'S OWN HAND are
 * facts about the call graph, with the procDepth guard as the
 * structural belt-and-braces underneath.
 */
export function layStatusOnNpc(srv: GameServer, 
  npcEid: EntityId,
  apply: StatusApply,
  sourceEid: EntityId,
  style: SkillId,
): void {
  if (!srv.applyStatusToNpc(npcEid, apply, sourceEid, style)) return;
  if ((srv.procDepth ?? 0) > 0) return;
  const src = srv.players?.get(sourceEid);
  if (!src) return;
  let ctx: ProcContext | undefined;
  const offer = (p: ProcEffect): void => {
    if (p.trigger.on !== 'stateApplied' || p.trigger.status !== apply.status) return;
    if (!ctx) {
      const pos = srv.positions?.get(sourceEid);
      ctx = { x: pos?.x ?? 0, y: pos?.y ?? 0, targetEid: npcEid, style };
    }
    srv.offerProc(sourceEid, src, p, 'stateApplied', ctx);
  };
  for (const p of src.gear?.procs ?? []) offer(p);
  for (const p of src.callingProcs ?? []) offer(p);
}

export function applyStatusToNpc(srv: GameServer, 
  npcEid: EntityId,
  apply: StatusApply,
  sourceEid: EntityId,
  style: SkillId,
  fromPet = false,
): boolean {
  const npc = srv.npcs.get(npcEid);
  if (!npc) return false;
  // The ward keeps venom off the blade's target entirely — no
  // status decals, no reaction fuel, nothing to detonate later.
  if (srv.actors.get(npcEid)?.actor.protection === 'invulnerable') return false;
  if (npc.def.resist?.includes(apply.status)) {
    const pos = srv.positions.get(npcEid);
    if (pos) {
      srv.broadcastFx(pos.plane, {
        t: 'fx',
        kind: 'reaction',
        x: pos.x,
        y: pos.y,
        radius: 0,
        color: '#9a94a8',
        text: 'Resist',
      });
    }
    return false;
  }
  let power = apply.power;
  let duration = apply.durationTicks;
  if (npc.def.weak?.includes(apply.status)) {
    power *= 2;
    duration = Math.round(duration * 1.5);
  }
  // THE BOOK OF STATES: the door reads the page and dispatches on
  // its stacking model — the lanes became data. The six shipped
  // pages transcribe the exact pre-book behavior (statusLanes pins
  // it); the count model is the composable workhorse waiting for
  // wave-one pages.
  const page = pageOf(apply.status);
  // A root's hold IS its status: the page's lock bounds the clock
  // (weakness stretches inside the bound, never past it).
  if (page.cc?.kind === 'root') duration = Math.min(duration, page.cc.maxTicks);
  // FAIR HANDS: a CC page with an authored immunity window is
  // refused while the window holds (no shipped page authors one, so
  // this guard costs a field read and passes — and touches no state,
  // the slate-test law). Expired stamps clean at the check.
  if (page.cc && page.cc.immunityTicks > 0) {
    const rec = srv.ccImmunity.get(npcEid);
    const until = rec?.[page.id];
    if (until !== undefined) {
      if (srv.tickCount < until) return false;
      delete rec![page.id];
    }
  }
  const list = srv.statuses.get(npcEid) ?? [];

  // -------------------------------------- the perSource model (wounds)
  if (page.stacking.model === 'perSource') {
    const own = list.find(
      (s) =>
        s.id === apply.status && s.sourceEid === sourceEid && (s.fromPet ?? false) === fromPet,
    );
    if (own) {
      // The same hand re-opening its own wound: refresh, never stack.
      refreshMax(own, power, duration);
    } else {
      const riding = list.filter((s) => s.id === apply.status);
      if (riding.length >= page.stacking.max) {
        // The body is at the cap: the new wound folds into the
        // weakest riding entry, so the blow still counts for
        // something and no source's credit is silently dropped.
        refreshMax(weakestOf(riding), power, duration);
      } else {
        list.push({
          id: apply.status,
          power,
          ticksLeft: duration,
          sourceEid,
          ...(fromPet ? { fromPet: true } : {}),
        });
      }
    }
    srv.statuses.set(npcEid, list);
    return true;
  }

  // --------------------------------------- the highest model (the mark)
  if (page.stacking.model === 'highest') {
    const same = list.find((s) => s.id === apply.status);
    if (same) {
      // Highest wins; a lesser mark still keeps the crack open.
      refreshMax(same, power, duration);
    } else {
      list.push({ id: apply.status, power, ticksLeft: duration, sourceEid });
    }
    srv.statuses.set(npcEid, list);
    return true;
  }

  // ------------------------------------------------------ the count model
  if (page.stacking.model === 'count') {
    const verdict = applyCount(list, page, power, duration, () => ({
      id: apply.status,
      power,
      ticksLeft: duration,
      sourceEid,
      ...(fromPet ? { fromPet: true } : {}),
    }));
    if (list.length > 0) srv.statuses.set(npcEid, list);
    else srv.statuses.delete(npcEid);
    const pos = srv.positions.get(npcEid);
    // A STACK IS A THING YOU CAN SEE: tiers speak as they are reached.
    if (pos) {
      for (const t of verdict.crossed) {
        srv.broadcastFx(pos.plane, {
          t: 'fx',
          kind: 'reaction',
          x: pos.x,
          y: pos.y,
          radius: 0,
          color: page.visuals.ink,
          text: t.name,
        });
      }
    }
    if (verdict.outcome === 'consumed' && verdict.detonation) {
      // The filled stack spends itself — spend, don't mint.
      const det = verdict.detonation;
      if (pos) {
        srv.broadcastFx(pos.plane, {
          t: 'fx',
          kind: 'reaction',
          x: pos.x,
          y: pos.y,
          radius: det.radius,
          color: page.visuals.ink,
          text: page.name,
        });
      }
      srv.damageNpc(npcEid, det.damage, sourceEid, style, {});
      if (pos && det.radius > 0) {
        // The ring pays once (core-audit debt 12's law holds here too).
        const paid = new Set<EntityId>([npcEid]);
        srv.forEachNpcNear(pos.plane, pos.x, pos.y, det.radius, (otherEid, otherNpc, opos) => {
          if (paid.has(otherEid)) return;
          if (Math.hypot(opos.x - pos.x, opos.y - pos.y) - otherNpc.def.radius > det.radius) {
            return;
          }
          paid.add(otherEid);
          srv.damageNpc(otherEid, det.damage, sourceEid, style, {});
        });
      }
    }
    return true;
  }

  // ------------------------- the refresh model (sparks keep reactions)
  const other =
    page.lane === 'spark'
      ? list.find((s) => s.id !== apply.status && isSpark(s.id))
      : undefined;
  const reaction = other ? reactionFor(other.id, apply.status) : null;

  if (other && reaction) {
    // Detonate: both statuses consumed in the flash.
    list.splice(list.indexOf(other), 1);
    const pos = srv.positions.get(npcEid);
    if (pos) {
      srv.broadcastFx(pos.plane, {
        t: 'fx',
        kind: 'reaction',
        x: pos.x,
        y: pos.y,
        radius: reaction.radius,
        color: reaction.color,
        text: reaction.name,
      });
    }
    const dmg = reactionDamage(other.power, power, reaction);
    srv.damageNpc(npcEid, dmg, sourceEid, style, {});
    if (pos) {
      switch (reaction.effect) {
        case 'aoe':
        case 'chain': {
          // Arc/blast into everything else nearby. THE INDEX SERVES
          // THE FIGHT here too (core-audit debt 12): reaction radii
          // are small and authored (2.2 tiles at the widest), so
          // the whole-map srv.npcs walk paid the world for a ring.
          // Pay once: damageNpc can knock a struck body into a new
          // chunk (or off the books) mid-visit, and the ring must
          // never bill the same body twice for the re-file.
          const paid = new Set<EntityId>([npcEid]);
          srv.forEachNpcNear(pos.plane, pos.x, pos.y, reaction.radius, (otherEid, otherNpc, opos) => {
            if (paid.has(otherEid)) return;
            if (Math.hypot(opos.x - pos.x, opos.y - pos.y) - otherNpc.def.radius > reaction.radius) {
              return;
            }
            paid.add(otherEid);
            srv.damageNpc(otherEid, dmg, sourceEid, style, {});
          });
          break;
        }
        case 'spread': {
          // The affliction finds new hosts — burn for Immolate,
          // venom for Contagion (the reaction names its own plague).
          const carried = reaction.spreadStatus ?? 'burn';
          const plague: StatusApply =
            apply.status === carried
              ? { status: carried, power: apply.power, durationTicks: apply.durationTicks }
              : { status: carried, power: other.power, durationTicks: 60 };
          // The ring again (core-audit debt 12), and the pay-once
          // Set matters MORE here: applyStatusToNpc can detonate a
          // fresh reaction on a neighbor mid-visit — recursion that
          // kills and re-chunks bodies under the iterator — and a
          // twice-visited host would double-dip the plague.
          const infected = new Set<EntityId>([npcEid]);
          srv.forEachNpcNear(pos.plane, pos.x, pos.y, reaction.radius, (otherEid, otherNpc, opos) => {
            if (infected.has(otherEid)) return;
            if (Math.hypot(opos.x - pos.x, opos.y - pos.y) - otherNpc.def.radius > reaction.radius) {
              return;
            }
            infected.add(otherEid);
            srv.applyStatusToNpc(otherEid, plague, sourceEid, style);
          });
          break;
        }
        case 'stun': {
          list.push({
            id: 'shock',
            power: 0,
            ticksLeft: SHOCK_MAX_TICKS,
            sourceEid,
            // THE STUBBORN CROWN: a crowned body's hard stagger is
            // dialed (the status itself rides on as reaction fuel).
            stunLeft: bossStunTicks(npc.def, SHOCK_MAX_TICKS),
          });
          break;
        }
        case 'burst':
          break;
      }
    }
    srv.statuses.set(npcEid, list);
    return true;
  }

  const same = list.find((s) => s.id === apply.status);
  if (same) {
    refreshMax(same, power, duration);
    if (page.cc) {
      // The page declares the lock; the body dials it (STUBBORN CROWN).
      same.stunLeft = Math.max(same.stunLeft ?? 0, bossStunTicks(npc.def, ccTicksFor(page, duration)));
    }
  } else {
    list.push({
      id: apply.status,
      power,
      ticksLeft: duration,
      sourceEid,
      // The stagger is brief; the charge rides on as reaction fodder.
      // (A crowned body's stagger is dialed — THE STUBBORN CROWN.)
      stunLeft: page.cc ? bossStunTicks(npc.def, ccTicksFor(page, duration)) : undefined,
      ...(fromPet ? { fromPet: true } : {}),
    });
  }
  srv.statuses.set(npcEid, list);
  return true;
}

/**
 * The player door. Players get no reactions (sparks refresh-max,
 * never detonate — the pre-lanes shape stands), but THE LEDGER
 * ANSWERED (book-plan Phase 3, green-lit): afflictions now stack
 * PER SOURCE on players exactly as they do on NPCs — capped at the
 * page's max, the new hand folding into the weakest wound, so a
 * pack's pressure is real and each wolf's own wound is honest. The
 * ONE deliberate number move of the phase, priced by the plan's
 * ledger; cleanse, kiting, and the visible stack row are the
 * counterplay. COUNT-model pages walk their own door on any body.
 * FAIR HANDS holds here too: immunity windows refuse, root clamps
 * to its page's lock, and a holdsPlayers stagger locks the hands
 * (stunLeft — read by the held gates at the attack/cast doors).
 */
export function applyStatusToPlayer(srv: GameServer, eid: EntityId, apply: StatusApply, sourceEid: EntityId): void {
  const page = pageOf(apply.status);
  // FAIR HANDS: the immunity window holds at the player door too
  // (inline for the slate-test law — no state touched unless a page
  // authors a window).
  if (page.cc && page.cc.immunityTicks > 0) {
    const rec = srv.ccImmunity.get(eid);
    const until = rec?.[page.id];
    if (until !== undefined) {
      if (srv.tickCount < until) return;
      delete rec![page.id];
    }
  }
  // A root's hold IS its status: the page's lock bounds the clock.
  const duration =
    page.cc?.kind === 'root'
      ? Math.min(apply.durationTicks, page.cc.maxTicks)
      : apply.durationTicks;
  const list = srv.statuses.get(eid) ?? [];
  if (page.stacking.model === 'count') {
    const verdict = applyCount(list, page, apply.power, duration, () => ({
      id: apply.status,
      power: apply.power,
      ticksLeft: duration,
      sourceEid,
    }));
    if (list.length > 0) srv.statuses.set(eid, list);
    else srv.statuses.delete(eid);
    const pos = srv.positions.get(eid);
    if (pos) {
      for (const t of verdict.crossed) {
        srv.broadcastFx(pos.plane, {
          t: 'fx',
          kind: 'reaction',
          x: pos.x,
          y: pos.y,
          radius: 0,
          color: page.visuals.ink,
          text: t.name,
        });
      }
    }
    if (verdict.outcome === 'consumed' && verdict.detonation) {
      // The filled stack answers on the wearer. The wound is already
      // inside (the DoT law), so the burst pierces like a pulse; the
      // radius stays the NPC door's — a player-worn state never
      // rings the neighbors.
      srv.damagePlayer(eid, verdict.detonation.damage, {
        pierceArmor: true,
        sourceEid,
      });
    }
    // A boon that moves the swing channel re-mirrors it at once.
    if (page.statMods?.attackSpeedMult !== undefined) {
      const p = srv.players.get(eid);
      if (p) srv.sendBuffs(p);
    }
    return;
  }
  // THE LEDGER ANSWERED: afflictions stack per source on players,
  // the NPC shape exactly (cap at the page's max, fold into the
  // weakest at the cap, the same hand refreshes its own wound).
  if (page.stacking.model === 'perSource') {
    const own = list.find((s) => s.id === apply.status && s.sourceEid === sourceEid);
    if (own) {
      refreshMax(own, apply.power, duration);
    } else {
      const riding = list.filter((s) => s.id === apply.status);
      if (riding.length >= page.stacking.max) {
        refreshMax(weakestOf(riding), apply.power, duration);
      } else {
        list.push({ id: apply.status, power: apply.power, ticksLeft: duration, sourceEid });
      }
    }
    srv.statuses.set(eid, list);
    return;
  }
  const same = list.find((s) => s.id === apply.status);
  if (same) {
    refreshMax(same, apply.power, duration);
    if (page.cc?.holdsPlayers) {
      same.stunLeft = Math.max(same.stunLeft ?? 0, ccTicksFor(page, duration));
    }
  } else {
    list.push({
      id: apply.status,
      power: apply.power,
      ticksLeft: duration,
      sourceEid,
      // FAIR HANDS, the player half: only a page that declares
      // holdsPlayers locks the hands (shock never does — the
      // historic law is the page's own word now).
      stunLeft: page.cc?.holdsPlayers ? ccTicksFor(page, duration) : undefined,
    });
  }
  srv.statuses.set(eid, list);
}

export function statusBits(srv: GameServer, eid: EntityId): number {
  let bits = 0;
  const list = srv.statuses.get(eid);
  if (list) {
    let stacks = 0;
    let count = 0;
    for (const s of list) {
      bits |= STATUS_BIT[s.id];
      // Two nibbles, two honest meanings (THE WIDER WOUND): the
      // affliction nibble counts per-source entries exactly as v29
      // wrote it; the count nibble carries a count-model page's own
      // depth in the high word.
      const model = pageOf(s.id).stacking.model;
      if (model === 'perSource') stacks++;
      else if (model === 'count') count += s.stacks ?? 1;
    }
    bits |= Math.min(stacks, 15) << AFFLICTION_STACKS_SHIFT;
    bits |= Math.min(count, 15) << COUNT_STACKS_SHIFT;
  }
  // Stealth bits ride the same byte. Snapshots for a hidden player only
  // ever reach their own session (interest suppression), so HIDDEN is
  // effectively owner-only; DETECTED drives the own eye chip.
  const player = srv.players.get(eid);
  if (player) {
    if (player.hidden) bits |= SNEAK_HIDDEN_BIT;
    if (srv.chasedPlayers.has(eid)) bits |= SNEAK_DETECTED_BIT;
    if (player.sheathed) bits |= SHEATHED_BIT;
  } else {
    // NPC sheathe is a pure function of disposition and combat state:
    // friendly actors (no combat body) always keep arms away; a
    // fightable actor with the preference stows only while idle — the
    // moment a chase begins the bit drops and the client plays the
    // draw. Plain bestiary mobs never stow.
    const npc = srv.npcs.get(eid);
    // Wariness is not war: a suspicious or investigating guard
    // keeps the blade on the hip — steel comes out for the chase
    // and stays out through the search.
    const stowed =
      npc?.state === 'idle' || npc?.state === 'suspicious' || npc?.state === 'investigate';
    if (npc ? npc.sheathePref && stowed : srv.actors.has(eid)) {
      bits |= SHEATHED_BIT;
    }
  }
  return bits;
}

export function tickStatuses(srv: GameServer, ): void {
  for (const [eid, list] of srv.statuses) {
    for (let i = list.length - 1; i >= 0; i--) {
      const s = list[i]!;
      s.ticksLeft--;
      if (s.stunLeft !== undefined && s.stunLeft > 0) s.stunLeft--;
      // THE BOOK OF STATES: the page owns the clock and the ramp.
      // The six shipped pages pulse exactly the pre-book numbers
      // (no ramps authored); a count page's pulse deepens per stack.
      const page = pageOf(s.id);
      const spec = page.tick;
      if (spec && s.ticksLeft > 0 && s.ticksLeft % spec.every === 0) {
        const pulse = effectivePower(page, s);
        if (spec.kind === 'heal') {
          // THE MEND DOOR: a heal-kind page raises its holder — the
          // HoT lane's engine seat. No shipped page authors it yet;
          // the boon wave gives it a voice when it gives it a name.
          const h = srv.healths.get(eid);
          if (h && h.hp > 0) h.hp = Math.min(h.maxHp, h.hp + pulse);
        } else if (srv.pets.has(eid)) {
          // A companion's DoT walks the pet rail (dotNpc would hit
          // the friendly-fire wall in damageNpc) — the drip pierces
          // armor exactly as it does for players: the wound's
          // already inside.
          srv.damagePet(eid, pulse, {
            pierceArmor: true,
            sourceEid: s.sourceEid,
            via: s.id as 'burn' | 'bleed' | 'venom',
          });
        } else if (srv.npcs.has(eid)) {
          srv.dotNpc(eid, pulse, s.sourceEid, s.id as 'burn' | 'bleed' | 'venom', s.fromPet);
        } else if (srv.players.has(eid)) {
          // Bitter Blood: the herbalist's constitution dulls the drip.
          const p = srv.players.get(eid)!;
          // The pulse carries its burner: a hurt moment with no
          // source in hand left every targeted hurt working rolling,
          // winning, and no-oping — its rest banked against nothing.
          srv.damagePlayer(eid, Math.max(1, Math.round(pulse * p.perks.dotResistMult)), {
            pierceArmor: true,
            sourceEid: s.sourceEid,
            via: s.id as 'burn' | 'bleed' | 'venom',
          });
        }
      }
      if (s.ticksLeft <= 0) {
        // The page owns the leaving too: stepDown sheds one stack
        // and re-arms; expire ends the state whole. A CC page with
        // an authored immunity window stamps it as the lock lifts.
        if (decayAtZero(page, s) === 'stepped') continue;
        list.splice(i, 1);
        if (page.cc && page.cc.immunityTicks > 0) {
          const rec = srv.ccImmunity.get(eid) ?? {};
          rec[s.id] = srv.tickCount + page.cc.immunityTicks;
          srv.ccImmunity.set(eid, rec);
        }
        // A swing-channel boon leaving re-mirrors the mult at once.
        if (page.statMods?.attackSpeedMult !== undefined) {
          const sp = srv.players.get(eid);
          if (sp) srv.sendBuffs(sp);
        }
      }
    }
    if (list.length === 0) srv.statuses.delete(eid);
  }
}

/**
 * DoT damage: hurts without flinching the target — a burning goblin
 * still fights; only direct hits interrupt windups.
 */
export function dotNpc(srv: GameServer, 
  npcEid: EntityId,
  dmg: number,
  sourceEid: EntityId,
  kind: 'burn' | 'bleed' | 'venom',
  fromPet = false,
): void {
  const npc = srv.npcs.get(npcEid);
  const health = srv.healths.get(npcEid);
  if (!npc || !health || dmg <= 0) return;
  // THE READING EDGE: the sunder mark amplifies the drip too — a
  // cracked guard lets everything through, wounds included. Gear
  // vs clauses stay OFF the pulse until a temper is authored to
  // read ticks (recorded in the plan; the seam covers direct blows).
  dmg = Math.round(dmg * sunderAmp(srv.statuses.get(npcEid)));
  // Nothing burns through the ward — a status that somehow landed
  // before protection was set still ticks for zero.
  if (srv.actors.get(npcEid)?.actor.protection === 'invulnerable') return;
  // The pulse signs its wound: the client inks the number per status.
  srv.broadcastHit(npcEid, dmg, false, 0, 0, false, false, kind);
  health.hp -= dmg;
  const source = srv.players.get(sourceEid);
  // BLOOD DRINK and VENOM SUP: the pet's own DoT ticks feed it a
  // sip — read from the CURRENT friend at heel (a dose that
  // outlives its layer simply feeds nobody).
  if (fromPet && source && source.petEid !== null) {
    const sipper = srv.pets.get(source.petEid);
    const leech = sipper?.bundle?.statusLeech;
    if (sipper && leech !== undefined) {
      const ph = srv.healths.get(source.petEid);
      if (ph && ph.hp > 0 && ph.hp < ph.maxHp) {
        ph.hp = Math.min(ph.maxHp, ph.hp + Math.max(1, Math.round(dmg * leech)));
      }
    }
  }
  if (source && !fromPet) {
    const style: SkillId = kind === 'burn' ? 'arx' : kind === 'venom' ? 'sneak' : 'onehand';
    // The drip draws the same mark budget as the blow that set it,
    // and pays under the school rate (0.5/dmg beside the school's 0.75).
    const credited = srv.creditMark(npc, sourceEid, dmg);
    if (credited > 0) srv.grantXp(sourceEid, source, style, Math.round(credited * 0.5));
  }
  // A DoT tail is not a struck blow — no style rides to the deed rail.
  if (health.hp <= 0) srv.killNpc(npcEid, npc, sourceEid);
}
