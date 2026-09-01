/**
 * THE STANDING LEDGER — factions, deeds, fines, theft and its witnesses: the law's bookkeeping.
 * Moved verbatim off GameServer (foundations F4); the class keeps
 * one-line delegators so every caller and test slate reads unchanged.
 * Intra-family calls dispatch through srv.* ON PURPOSE — test slates
 * stub siblings, and the stub must win over the module's own copy.
 */
import { addItem, countItem, hasSpaceFor, removeItem } from './inventory.js';
import { FACTIONS, PlaneId, STANDING_CLAMP, crossDeltas, factionDef, factionOfActor, factionOfNpc, itemDef, standingBand, theftChance } from '@arx/content';
import { ALERT_SUS, EntityId, sightLine, sightVisibility } from '@arx/shared';
import type { ActorComp, GameServer, PlayerComp } from './gameServer.js';
// Value import of the parent class for its statics — touched only at
// runtime, long after both modules initialize.
import { GameServer as GameServerClass } from './gameServer.js';

/**
 * THE ONE DOOR (docs/factions-plan.md): every standing move in the
 * game lands here — clamp, persist-on-mutation, the quiet ledger
 * line, and the band-crossing ceremony (the ONLY repevent trigger).
 * `cross: true` pays the opposition matrix under THE BORDER LAW;
 * authored deltas (quest rewards, story hooks) omit it and state
 * both sides themselves. Cross-pay never re-crosses.
 */
export function creditStanding(srv: GameServer, 
  player: PlayerComp,
  factionId: string,
  delta: number,
  opts: { cross?: boolean } = {},
): void {
  const def = factionDef(factionId);
  const applied = Math.round(delta);
  if (!def || applied === 0) return;
  const before = player.standing.get(factionId) ?? 0;
  const after = Math.max(-STANDING_CLAMP, Math.min(STANDING_CLAMP, before + applied));
  if (after !== before) {
    player.standing.set(factionId, after);
    if (player.characterId > 0) srv.accounts.saveStanding(player.characterId, factionId, after);
    const moved = after - before;
    // THE DEED IS PUBLIC: every delta prints its quiet ledger line.
    player.session?.sendJson({
      t: 'chat',
      channel: 'system',
      text: `${def.name} ${moved > 0 ? '+' : '−'}${Math.abs(moved)} — ${
        moved > 0 ? 'word of it travels well' : 'the deed is marked'
      }.`,
    });
    const bandAfter = standingBand(after);
    if (bandAfter !== standingBand(before)) {
      player.session?.sendJson({
        t: 'repevent',
        faction: factionId,
        name: def.name,
        band: bandAfter,
        rose: after > before,
      });
      // A band can open (or close) a quest gate or a tree.
      srv.pushQuestAvail(player);
    }
    srv.pushRep(player);
  }
  if (opts.cross) {
    for (const c of crossDeltas(factionId, applied, before)) {
      srv.creditStanding(player, c.faction, c.delta);
    }
  }
}

/** A systemic deed by name — value read from the live doc, matrix paid. */
export function creditDeed(srv: GameServer, 
  player: PlayerComp,
  factionId: string | null,
  deed: 'bountyHonored' | 'tollBroken' | 'assaultEnforcer' | 'slayMember' | 'theftWitnessed',
): void {
  if (factionId === null) return;
  srv.creditStanding(player, factionId, FACTIONS.deeds[deed], { cross: true });
}

/**
 * THE ROAD BACK (Phase 3): the fine counter behind the `fine` hook.
 * Quote answers the arithmetic; payment takes the coins and lifts
 * standing to EXACTLY the doc's fineFloor through the one door —
 * you buy back the courtroom, never the hearts. Every dial read
 * live; every no-op answered politely in the clerk's voice.
 */
export function runFine(srv: GameServer, player: PlayerComp, factionId: string, quote: boolean): void {
  const def = factionDef(factionId);
  const session = player.session;
  if (!def || !session) return;
  const sys = (text: string) => session.sendJson({ t: 'chat', channel: 'system', text });
  const standing = player.standing.get(factionId) ?? 0;
  const deficit = FACTIONS.fineFloor - standing;
  if (deficit <= 0) {
    sys('Your name needs no buying back here.');
    return;
  }
  const owed = deficit * FACTIONS.finePerPoint;
  const coins = countItem(player.inventory, 'coins');
  if (quote) {
    sys(`The fine stands at ${owed} coins${coins < owed ? ` — you carry ${coins}` : ''}.`);
    return;
  }
  if (coins < owed) {
    sys(`The fine stands at ${owed} coins. You carry ${coins}. Come back heavier.`);
    return;
  }
  removeItem(player.inventory, 'coins', owed);
  session.sendJson({ t: 'inv', slots: player.inventory });
  sys(`${owed} coins, counted twice. The book moves your name to the watched column.`);
  // Through the one door: the quiet line, the ceremony, the gates
  // all re-answer — and the deficit lands exactly on the floor.
  srv.creditStanding(player, factionId, deficit);
}

/**
 * A player broke an enforcer's peace: the assault deed, charged
 * exactly at the rest→war flip (the calling damage sites gate on
 * npcAtPeace), so a whole fight is ONE deed — and cycling the
 * guard's leash to farm outrage only digs the outlaw hole deeper.
 */
export function chargeAssault(srv: GameServer, attackerEid: EntityId, npcEid: EntityId): void {
  const player = srv.players.get(attackerEid);
  if (!player) return;
  srv.creditDeed(player, srv.npcEnforcerFid(npcEid), 'assaultEnforcer');
}

/**
 * THE WITNESS LAW (Phase 5): the faction bodies that actually SAW
 * a spot — inside the doc's radius, with an honest sightline (walls
 * seal, cover counts — the perception epic's own ray). Civilians
 * witness too: a grocer watching you rob the smith is a witness;
 * only bodies with a combat brain can also turn suspicious.
 */
export function theftWitnesses(srv: GameServer, 
  plane: PlaneId,
  x: number,
  y: number,
  markEid: EntityId,
): Array<{ eid: EntityId; fid: string }> {
  const out: Array<{ eid: EntityId; fid: string }> = [];
  const r = FACTIONS.theft.witnessRadius;
  // Eyes live on the theft's OWN plane, and the sight ray runs
  // through that plane's walls — the Deep Market's keepers judge a
  // lifted purse by the Undercroft's rock, not by whatever the
  // surface happens to have built at the same coordinates.
  const world = srv.worldOf(plane);
  const seen = (opos: { plane: PlaneId; x: number; y: number }): boolean => {
    if (opos.plane !== plane) return false;
    const dx = opos.x - x;
    const dy = opos.y - y;
    if (dx * dx + dy * dy > r * r) return false;
    return sightVisibility(sightLine(world, opos.x, opos.y, x, y)) > 0;
  };
  for (const [oEid, actor] of srv.actors) {
    if (oEid === markEid) continue;
    const fid = factionOfActor(actor.actor.id);
    if (fid === null) continue;
    const opos = srv.positions.get(oEid);
    if (opos && seen(opos)) out.push({ eid: oEid, fid });
  }
  for (const [oEid, npc] of srv.npcs) {
    if (oEid === markEid || srv.actors.has(oEid)) continue;
    const fid = factionOfNpc(npc.def.id);
    if (fid === null) continue;
    const opos = srv.positions.get(oEid);
    if (opos && seen(opos)) out.push({ eid: oEid, fid });
  }
  return out;
}

/**
 * A witnessed theft: the deed through the one door, then a bounded
 * alarm — heads turn toward the spot, nobody rallies to a pocket
 * the way they would to a scream over steel. Returns whether any
 * faction body saw it (unseen is unswayed).
 */
export function chargeTheft(srv: GameServer, 
  thiefEid: EntityId,
  player: PlayerComp,
  x: number,
  y: number,
  witnesses: Array<{ eid: EntityId; fid: string }>,
  chargeFid?: string,
): boolean {
  if (witnesses.length === 0) return false;
  srv.creditDeed(player, chargeFid ?? witnesses[0]!.fid, 'theftWitnessed');
  let turned = 0;
  for (const w of witnesses) {
    if (turned >= 3) break;
    const npc = srv.npcs.get(w.eid);
    if (!npc || npc.state !== 'idle') continue;
    npc.state = 'suspicious';
    npc.alert = Math.max(npc.alert, ALERT_SUS);
    npc.alertEid = thiefEid;
    npc.alertX = x;
    npc.alertY = y;
    npc.alertSeenTick = srv.tickCount;
    npc.huntUntilTick = srv.tickCount + GameServerClass.SUS_DWELL_TICKS * 2;
    turned++;
  }
  return true;
}

/**
 * THE LIGHT FINGERS (Phase 5): the lift itself. The roll is public
 * arithmetic (theftChance — the sneak hand against the mark),
 * success skims one row of the mark's authored pockets (coins by
 * the doc's cap and coin is coin, never stolen; goods carry the
 * facet to the fence), and failure is a spun mark, a cry, and —
 * only if a faction body truly saw it — the theftWitnessed deed.
 * The mark stays wary either way: wariness, not pity, meters the
 * take.
 */
export function pickpocket(srv: GameServer, 
  eid: EntityId,
  player: PlayerComp,
  pos: { plane: PlaneId; x: number; y: number; dir: number },
  targetEid: EntityId,
  actorComp: ActorComp,
  npos: { plane: PlaneId; x: number; y: number; dir: number },
  sys: (text: string) => void,
): void {
  const rows = actorComp.actor.inventory ?? [];
  if (rows.length === 0) {
    sys('Nothing worth lifting.');
    return;
  }
  const now = Date.now();
  if (now < (player.markWary.get(targetEid) ?? 0)) {
    sys('Too soon — the mark is wary.');
    return;
  }
  const row = rows[Math.floor(Math.random() * rows.length)]!;
  // Keys land on the ring — no pack room needed.
  if (!itemDef(row.item)?.dungeonKey && !hasSpaceFor(player.inventory, row.item)) {
    sys('Your pack has no room for other folk’s goods.');
    return;
  }
  const markLevel = srv.npcs.get(targetEid)?.def.level ?? 10;
  const chance = theftChance(srv.effectiveLevel(player, 'sneak'), markLevel);
  player.markWary.set(targetEid, now + FACTIONS.theft.retrySec * 1000);
  if (Math.random() < chance) {
    const coins = row.item === 'coins';
    const qty = coins ? Math.min(row.qty, FACTIONS.theft.coinCap) : 1;
    const def = itemDef(row.item);
    // THE KEY RING: a lifted key clips onto the ring minted whole
    // (common — theft never mints rarity, the flood law's border).
    // The ring takes no stolen facet: a key opens ITS dungeon and
    // nothing else, so there is nothing to launder through it.
    if (def?.dungeonKey) {
      srv.addKeyToRing(player, srv.mintFreshKeyRoll());
      sys(`You slip away with: ${def.name}.`);
      srv.grantXp(eid, player, 'sneak', 8 + markLevel);
      return;
    }
    // Skimmed gear wears the shop-counter baseline — theft never
    // mints rarity (the flood law keeps its border here too).
    const roll = def && !def.stackable ? { rar: 'common' as const, seed: 0 } : undefined;
    const got = addItem(player.inventory, row.item, qty, roll, !coins);
    if (got === 0) return;
    player.session?.sendJson({ t: 'inv', slots: player.inventory });
    sys(
      coins
        ? `You slip away with ${got} coins.`
        : `You slip away with: ${def?.name ?? row.item}.`,
    );
    srv.grantXp(eid, player, 'sneak', 8 + markLevel);
    return;
  }
  // Caught: the crouch is blown, the mark spins and cries.
  srv.revealPlayer(eid, player);
  npos.dir = Math.atan2(pos.y - npos.y, pos.x - npos.x);
  const cries = ['Hey — my pocket!', 'Thief! A thief!', 'Hands! I felt hands!'];
  srv.sayAloud(targetEid, actorComp.actor.name, cries[(targetEid + srv.tickCount) % cries.length]!);
  sys('The grab misses.');
  const witnesses = srv.theftWitnesses(pos.plane, pos.x, pos.y, targetEid);
  const markFid = factionOfActor(actorComp.actor.id);
  if (markFid !== null) witnesses.unshift({ eid: targetEid, fid: markFid });
  srv.chargeTheft(eid, player, pos.x, pos.y, witnesses);
}
