/**
 * THE SAND AND THE ROAR'S ENGINE — enrollment, the stakes board, the gates, waves, wipes, victories, the guard sweep and the arena tick.
 * Moved verbatim off GameServer (foundations F4); the class keeps
 * one-line delegators so every caller and test slate reads unchanged.
 */
import { arenaPayFor, bankArenaXp, freshArenaBank, inPit, rollMatchPlan, scatterSpots, stockBark } from './arenaMind.js';
import { log } from '../log.js';
import { addItem, countItem, removeItem } from './inventory.js';
import { secToTicks } from './tuning.js';
import { ARENAS, ArenaMatchDef, ArenaVenueDef, NPCS, SURFACE_PLANE_ID, arenaMatchDef, arenaPurseTableFor, arenaTitleFor, arenaVenue, crownPoolFor, forgeCrown, matchesForVenue, scaleNpcDef, totalXpForArenaRank } from '@arx/content';
import { EntityId, S2CArenaState, S2CMessage, TICK_MS, Tile, closedChestTile, shutDoorTile } from '@arx/shared';
import type { ArenaMatchState, GameServer, PlayerComp } from './gameServer.js';

/** The venue's live match holding this soul, if any. */
export function arenaOf(srv: GameServer, characterId: number): ArenaMatchState | null {
  for (const m of srv.arenaMatches.values()) {
    if (m.members.has(characterId)) return m;
  }
  return null;
}

/** The venue whose SHUT gates hold this soul (the death-spill ask). */
export function arenaEnrolledVenue(srv: GameServer, characterId: number): ArenaVenueDef | undefined {
  const m = srv.arenaOf(characterId);
  if (!m || !m.gatesShut) return undefined;
  if (m.members.get(characterId)?.alive !== true) return undefined;
  return m.venue;
}

/**
 * Fan a message to members. Plain state fans reach the LIVING only
 * (the audit's find: a fallen member's `off` was undone by the very
 * next fan, riding their corpse home wearing a live match card);
 * ceremony fans (`all: true` — wipe, off, victory) reach everyone.
 */
export function arenaSend(srv: GameServer, match: ArenaMatchState, msg: S2CMessage, opts: { all?: boolean } = {}): void {
  for (const [cid, m] of match.members) {
    if (!opts.all && m.alive !== true) continue;
    const eid = srv.characterEids.get(cid);
    if (eid === undefined) continue;
    srv.players.get(eid)?.session?.sendJson(msg);
  }
}

/**
 * THE STANDS SEE THE CARD: fan a state to members AND to every
 * bystander near the pit (spec-tagged — their HUD self-clears when
 * the fan goes quiet, so no teardown owes them an 'off').
 */
export function arenaStateFan(srv: GameServer, match: ArenaMatchState, all = false): void {
  const state = srv.arenaState(match);
  srv.arenaSend(match, state, { all });
  const venue = match.venue;
  const plane = venue.plane ?? SURFACE_PLANE_ID;
  const reach = Math.max(venue.pit.rx, venue.pit.ry) + 14;
  const spec = { ...state, spec: true as const };
  for (const [peid, p] of srv.players) {
    if (match.members.has(p.characterId)) continue;
    const pp = srv.positions.get(peid);
    if (!pp || pp.plane !== plane) continue;
    if (Math.hypot(pp.x - venue.pit.x, pp.y - venue.pit.y) > reach) continue;
    p.session?.sendJson(spec);
  }
}

export function arenaFoesLeft(srv: GameServer, match: ArenaMatchState): number {
  let n = 0;
  for (const eid of match.waveEids) if (srv.ecs.isAlive(eid)) n++;
  return n;
}

/** The match's living state on the wire (remainMs = a DURATION). */
export function arenaState(srv: GameServer, 
  match: ArenaMatchState,
  phase: S2CArenaState['phase'] = match.phase,
): S2CArenaState {
  const remain =
    match.deadlineTick > srv.tickCount
      ? (match.deadlineTick - srv.tickCount) * TICK_MS
      : undefined;
  return {
    t: 'arena',
    phase,
    venue: match.venueId,
    name: match.def.name,
    round: Math.min(match.round + 1, match.plan.rounds.length),
    rounds: match.plan.rounds.length,
    ...(remain !== undefined ? { remainMs: remain } : {}),
    ...(match.phase === 'round' ? { foes: srv.arenaFoesLeft(match) } : {}),
  };
}

/**
 * THE ANNOUNCER IS A THROAT: every called line leaves the
 * ringmaster's own body through the spoken air. An uncast throat
 * (Phase 5 pending) falls back to the quiet quartermaster so the
 * beat is never silent — but the fallback is a system line, never a
 * fake bubble.
 */
export function arenaBark(srv: GameServer, match: ArenaMatchState, text: string): void {
  if (text.length === 0) return;
  const venue = match.venue;
  if (!venue) return;
  if (match.masterEid === null || !srv.ecs.isAlive(match.masterEid)) {
    match.masterEid = null;
    const plane = venue.plane ?? SURFACE_PLANE_ID;
    for (const [aeid, comp] of srv.actors) {
      if (comp.actor.id !== venue.master) continue;
      const p = srv.positions.get(aeid);
      if (p && p.plane === plane) {
        match.masterEid = aeid;
        break;
      }
    }
  }
  if (match.masterEid !== null) {
    const comp = srv.actors.get(match.masterEid);
    srv.sayAloud(match.masterEid, comp?.actor.name ?? 'The Ringmaster', text);
  } else {
    srv.arenaSend(match, { t: 'chat', channel: 'system', text });
  }
}

/**
 * Shut or open the venue's gates through the door machinery. A shut
 * never lands on a body (the embed law) — blocked leaves stand open
 * and the per-beat retry in tickArenas closes them as they clear.
 * Unbuilt ground (no door tile — a venue drawn before Phase 5's
 * masonry) no-ops politely so the engine can rehearse anywhere.
 */
export function arenaSetGates(srv: GameServer, match: ArenaMatchState, shut: boolean): void {
  const venue = match.venue;
  if (!venue) return;
  const plane = venue.plane ?? SURFACE_PLANE_ID;
  const world = srv.worldOf(plane);
  let allSet = true;
  for (const g of match.gateTiles) {
    const now = world.groundAt(g.x, g.y);
    if (now === undefined) continue;
    if (shut) {
      const target = shutDoorTile(g.open);
      if (target === null || now === target) continue;
      if (srv.bodyOnTile(plane, g.x, g.y)) {
        allSet = false;
        continue;
      }
      srv.setWorldTile(plane, g.x, g.y, target);
      srv.broadcastFx(plane, {
        t: 'fx',
        kind: 'rattle',
        x: g.x + 0.5,
        y: g.y + 0.5,
        radius: 1,
      });
    } else {
      const target = g.open;
      if (now !== target && shutDoorTile(g.open) === now) {
        srv.setWorldTile(plane, g.x, g.y, target);
      }
    }
  }
  match.gatesShut = shut && allSet;
}

/** Open the stakes board — the arena dialogue hook's good ending. */
export function arenaBoardOpen(srv: GameServer, eid: EntityId, player: PlayerComp, venueId: string): void {
  const venue = arenaVenue(venueId);
  if (!venue) {
    srv.speak(player, 'Closed', 'The ring is not drawn yet. Come back when the sand is laid.');
    return;
  }
  const bank = player.arena;
  const cards = matchesForVenue(venueId).map((m) => ({
    id: m.id,
    name: m.name,
    ...(m.blurb !== undefined ? { blurb: m.blurb } : {}),
    level: m.level,
    fee: m.fee,
    rounds: m.rounds.length,
    ...(m.rankReq !== undefined ? { rankReq: m.rankReq } : {}),
    ...((m.rankReq ?? 0) > bank.rank ? { locked: true } : {}),
  }));
  player.session?.sendJson({
    t: 'arenaboard',
    venue: venueId,
    name: venue.name,
    matches: cards,
    rank: bank.rank,
    title: arenaTitleFor(bank.rank),
    xp: bank.xp,
    xpPrev: totalXpForArenaRank(bank.rank),
    ...(bank.rank < ARENAS.ladder.maxRank
      ? { xpNext: totalXpForArenaRank(bank.rank + 1) }
      : {}),
    // THE STANDING: the record and the next named rung, so the foot
    // of the board can wear the buyer's whole story (all additive).
    wins: bank.wins,
    losses: bank.losses,
    maxRank: ARENAS.ladder.maxRank,
    ...(() => {
      const up = ARENAS.ladder.titles.find((t) => t.rank > bank.rank);
      return up ? { nextTitle: up.title, nextTitleRank: up.rank } : {};
    })(),
  });
}

/**
 * Buy a card: the claim ceremony. The server judges everything —
 * the venue within hail, the claim free, the rest raked, the rank
 * gate, the stake in coin — and refuses through the risen word.
 */
export function arenaQueue(srv: GameServer, eid: EntityId, matchId: string, opts: { devFree?: boolean } = {}): void {
  const player = srv.players.get(eid);
  const pos = srv.positions.get(eid);
  if (!player || !pos) return;
  const def = arenaMatchDef(matchId);
  if (!def) {
    srv.speak(player, 'No card', 'The board holds no such card.');
    return;
  }
  // The venue is WHERE YOU STAND: the nearest ring on this plane
  // whose counter lists the card, within hail of its sand.
  let venue: ArenaVenueDef | null = null;
  let best = Number.POSITIVE_INFINITY;
  for (const v of ARENAS.venues) {
    if ((v.plane ?? SURFACE_PLANE_ID) !== pos.plane) continue;
    if (!matchesForVenue(v.id).some((m) => m.id === matchId)) continue;
    const d = Math.hypot(pos.x - v.pit.x, pos.y - v.pit.y);
    if (d < best) {
      best = d;
      venue = v;
    }
  }
  if (venue === null || best > 40) {
    srv.speak(player, 'No ring', 'No ring within hail answers that card.');
    return;
  }
  if (srv.arenaMatches.has(venue.id)) {
    srv.speak(player, 'Claimed', 'The sand is claimed. Watch, or wait your turn.');
    return;
  }
  const rest = srv.arenaCooldowns.get(venue.id) ?? 0;
  if (Date.now() < rest) {
    srv.speak(player, 'Raked', 'The sand is being raked. Give it a moment.');
    return;
  }
  if (srv.arenaOf(player.characterId) !== null) {
    srv.speak(player, 'Enrolled', 'You are already on a card.');
    return;
  }
  if ((def.rankReq ?? 0) > player.arena.rank) {
    srv.speak(player, 'Unproven', `The board wants rank ${def.rankReq} for that card.`);
    return;
  }
  if (!opts.devFree && def.fee > 0) {
    const coins = countItem(player.inventory, 'coins');
    if (coins < def.fee) {
      srv.speak(player, 'Short', `The stake is ${def.fee} coins. You carry ${coins}.`);
      return;
    }
    removeItem(player.inventory, 'coins', def.fee);
    player.session?.sendJson({ t: 'inv', slots: player.inventory });
  }
  const plane = venue.plane ?? SURFACE_PLANE_ID;
  const world = srv.worldOf(plane);
  const seed = (Date.now() ^ (eid * 0x9e3779b1)) >>> 1;
  const match: ArenaMatchState = {
    venueId: venue.id,
    def: JSON.parse(JSON.stringify(def)) as ArenaMatchDef,
    venue: JSON.parse(JSON.stringify(venue)) as ArenaVenueDef,
    plan: rollMatchPlan(def, seed),
    seed,
    phase: 'muster',
    round: 0,
    deadlineTick: srv.tickCount + secToTicks(ARENAS.dials.musterSec),
    members: new Map([[player.characterId, { alive: true }]]),
    initiatorChar: player.characterId,
    waveEids: new Set(),
    propTiles: [],
    gateTiles: venue.gates.map((g) => ({
      x: g.x,
      y: g.y,
      open: world.groundAt(g.x, g.y) ?? 0,
    })),
    gatesShut: false,
    chestPrev: null,
    masterEid: null,
    startedAt: Date.now(),
    lastBeatTick: srv.tickCount,
  };
  srv.arenaMatches.set(venue.id, match);
  // The muster call reaches the whole party — the fellows see the
  // clock even from across the district. A fellow already on a live
  // card keeps their own fight (the audit's find: double enrollment
  // made arenaOf insertion-order-dependent and misrouted their
  // leave and their HUD).
  for (const cid of srv.party.fellowsOf(player.characterId)) {
    if (srv.arenaOf(cid) === null) match.members.set(cid, { alive: true });
  }
  srv.arenaStateFan(match);
  srv.arenaBark(match, stockBark('muster', seed, 0));
  srv.broadcastFx(plane, {
    t: 'fx',
    kind: 'horn',
    x: venue.pit.x,
    y: venue.pit.y,
    radius: 8,
  });
}

/** Walk away: a muster cancel (initiator, refunded) or a forfeit. */
export function arenaLeave(srv: GameServer, eid: EntityId): void {
  const player = srv.players.get(eid);
  if (!player) return;
  const match = srv.arenaOf(player.characterId);
  if (!match) return;
  if (match.phase === 'muster' && match.initiatorChar === player.characterId) {
    if (match.def.fee > 0) {
      addItem(player.inventory, 'coins', match.def.fee);
      player.session?.sendJson({ t: 'inv', slots: player.inventory });
    }
    srv.speak(player, 'Returned', 'The stake returns to your purse.', undefined, 'note');
    srv.arenaReset(match, { silent: true });
    return;
  }
  if (match.phase === 'muster') {
    // A fellow declining the muster simply steps off the roster —
    // gate-shut re-derives enrollment, and a deleted name cannot be
    // silently re-enrolled by standing in the wrong place.
    match.members.delete(player.characterId);
    player.session?.sendJson({ t: 'arena', phase: 'off' });
    if (match.members.size === 0) srv.arenaReset(match, { silent: true });
    return;
  }
  const m = match.members.get(player.characterId);
  if (m?.alive === true) {
    m.alive = false;
    const venue = match.venue;
    const pos = srv.positions.get(eid);
    // The walk-of-shame is for a body ON the sand — never a
    // cross-map ferry (the audit's find: a far-away fellow could
    // ride the forfeit teleport across the whole plane).
    if (pos && pos.plane === (venue.plane ?? SURFACE_PLANE_ID) && inPit(venue.pit, pos.x, pos.y, 1.5)) {
      srv.teleport(eid, venue.exit.x + 0.5, venue.exit.y + 0.5);
    }
    player.session?.sendJson({ t: 'arena', phase: 'off' });
    srv.arenaWipeCheck(match);
  }
}

/** A member fell (the death branch's call). */
export function arenaMemberFell(srv: GameServer, player: PlayerComp): void {
  const match = srv.arenaOf(player.characterId);
  if (!match) return;
  if (match.phase === 'muster') {
    // A muster that loses its buyer folds politely, stake returned.
    if (match.initiatorChar === player.characterId) {
      if (match.def.fee > 0) {
        addItem(player.inventory, 'coins', match.def.fee);
        player.session?.sendJson({ t: 'inv', slots: player.inventory });
      }
      srv.arenaReset(match, { silent: true });
    } else {
      match.members.delete(player.characterId);
    }
    return;
  }
  const m = match.members.get(player.characterId);
  if (m?.alive !== true) return;
  m.alive = false;
  player.session?.sendJson({ t: 'arena', phase: 'off' });
  srv.arenaStateFan(match);
  srv.arenaWipeCheck(match);
}

/** A member's session died — the sand counts them severed. */
export function arenaMemberSevered(srv: GameServer, characterId: number): void {
  const match = srv.arenaOf(characterId);
  if (!match) return;
  if (match.phase === 'muster') {
    match.members.delete(characterId);
    if (match.members.size === 0) srv.arenaReset(match, { silent: true });
    return;
  }
  const m = match.members.get(characterId);
  if (m?.alive === true) {
    m.alive = false;
    srv.arenaWipeCheck(match);
  }
}

export function arenaWipeCheck(srv: GameServer, match: ArenaMatchState): void {
  if (match.phase === 'victory') return;
  for (const m of match.members.values()) if (m.alive) return;
  srv.arenaWipe(match);
}

/** THE WIPE RESETS THE SAND: the card is lost whole. */
export function arenaWipe(srv: GameServer, match: ArenaMatchState): void {
  srv.arenaBark(match, stockBark('wipe', match.seed, match.round));
  for (const cid of match.members.keys()) {
    const eid = srv.characterEids.get(cid);
    const player = eid !== undefined ? srv.players.get(eid) : undefined;
    if (player) {
      player.arena.losses++;
      if (player.characterId > 0) srv.accounts.saveArena(player.characterId, player.arena);
    } else if (cid > 0) {
      // An offline member still takes the loss — best effort.
      void srv.accounts
        .loadArena(cid)
        .then((row) => {
          const backEid = srv.characterEids.get(cid);
          const back = backEid !== undefined ? srv.players.get(backEid) : undefined;
          const bank = back ? back.arena : (row ?? freshArenaBank());
          bank.losses++;
          srv.accounts.saveArena(cid, bank);
        })
        // The bank read failing means the offline loss went unpaid — say so.
        .catch((err: unknown) => log('error', 'arena', 'offline bank loss unpaid', { cid, error: String(err) }));
    }
  }
  srv.arenaSend(match, { ...srv.arenaState(match, 'wipe'), remainMs: undefined }, { all: true });
  srv.arenaReset(match, { keepWipeWord: true });
}

/**
 * Rake the sand: sweep every body and prop the match placed, stand
 * the gates open, retire the purse, and free the claim. The ONE
 * teardown — victory grace, wipe, cancel, and the backstop all end
 * here (the teardownDungeon lesson: one door out, however it went).
 */
export function arenaReset(srv: GameServer, 
  match: ArenaMatchState,
  opts: { silent?: boolean; keepWipeWord?: boolean } = {},
): void {
  const venue = match.venue;
  const plane = venue?.plane ?? SURFACE_PLANE_ID;
  // The sand takes its dead: wave bodies leave with a death burst
  // (the disbandCourt manner) and their own summons go with them.
  for (const weid of match.waveEids) {
    if (!srv.ecs.isAlive(weid)) continue;
    const npc = srv.npcs.get(weid);
    const wpos = srv.positions.get(weid);
    if (npc) srv.disbandCourt(npc);
    if (wpos) {
      for (const s of srv.sessions) {
        if (s.knownEntities.has(weid)) {
          s.sendJson({ t: 'death', eid: weid, x: wpos.x, y: wpos.y, defId: npc?.def.id ?? '' });
        }
      }
    }
    srv.wildBodies.delete(weid);
    srv.removeFromChunks(weid);
    srv.ecs.destroy(weid);
  }
  match.waveEids.clear();
  // Props and purse go back to the ground they stood on, and the
  // respawn queue forgets them — a smashed barrel must not respawn
  // onto raked sand, nor a reclose resurrect a retired purse.
  const swept = new Set<string>();
  for (const p of match.propTiles) {
    srv.setWorldTile(plane, p.x, p.y, p.prev);
    swept.add(`${p.x},${p.y}`);
  }
  match.propTiles.length = 0;
  if (venue && match.chestPrev !== null) {
    srv.setWorldTile(plane, venue.chest.x, venue.chest.y, match.chestPrev);
    srv.poiChests.delete(`${plane}|${venue.chest.x},${venue.chest.y}`);
    swept.add(`${venue.chest.x},${venue.chest.y}`);
    match.chestPrev = null;
  }
  srv.arenaChestClaims.delete(match.venueId);
  for (const g of match.gateTiles) swept.add(`${g.x},${g.y}`);
  srv.respawnQueue.removeWhere((entry) => entry.plane === plane && swept.has(`${entry.tx},${entry.ty}`));
  srv.arenaSetGates(match, false);
  // THE WIPE KEEPS ITS BEAT (the audit's find: 'wipe' then 'off' in
  // the same tick meant the lost frame never rendered): on the wipe
  // path no 'off' is sent at all — the client holds the wipe card
  // for its own 2.6 s beat and lowers itself. Every other path
  // lowers the HUD for everyone, fallen included.
  if (!opts.keepWipeWord) {
    srv.arenaSend(match, { t: 'arena', phase: 'off' }, { all: true });
  }
  srv.arenaMatches.delete(match.venueId);
  srv.arenaCooldowns.set(match.venueId, Date.now() + ARENAS.dials.cooldownSec * 1000);
}

/** Gate-shut: enrollment crystallizes and the sand empties of guests. */
export function arenaGateShut(srv: GameServer, match: ArenaMatchState): void {
  const venue = match.venue;
  if (!venue) {
    srv.arenaReset(match, { silent: true });
    return;
  }
  const plane = venue.plane ?? SURFACE_PLANE_ID;
  // Who stands the sand stands the card (party members only).
  const enrolled = new Map<number, { alive: boolean }>();
  for (const cid of match.members.keys()) {
    const eid = srv.characterEids.get(cid);
    if (eid === undefined) continue;
    const p = srv.positions.get(eid);
    if (!p || p.plane !== plane) continue;
    if (inPit(venue.pit, p.x, p.y, 1)) enrolled.set(cid, { alive: true });
  }
  if (enrolled.size === 0) {
    // Nobody took the sand: the stake returns and the claim folds.
    const eid = srv.characterEids.get(match.initiatorChar);
    const player = eid !== undefined ? srv.players.get(eid) : undefined;
    if (player && match.def.fee > 0) {
      addItem(player.inventory, 'coins', match.def.fee);
      player.session?.sendJson({ t: 'inv', slots: player.inventory });
      srv.speak(player, 'Folded', 'Nobody took the sand. The stake returns.', undefined, 'note');
    }
    srv.arenaReset(match, { silent: true });
    return;
  }
  match.members.clear();
  for (const [cid, m] of enrolled) match.members.set(cid, m);
  srv.arenaGuardSweep(match, venue);
  match.phase = 'gates';
  match.deadlineTick = srv.tickCount + 40;
  srv.arenaSetGates(match, true);
  srv.arenaBark(match, stockBark('gates', match.seed, 1));
  // 'field', not 'charge': charge is a pure instrument client-side
  // (no signature crown) — the gates' iron set-piece rides a field
  // wire so THE BAR COMES DOWN actually draws.
  srv.broadcastFx(plane, {
    t: 'fx',
    kind: 'field',
    x: venue.pit.x,
    y: venue.pit.y,
    radius: Math.max(venue.pit.rx, venue.pit.ry),
    id: 'arena:gates',
    ticks: 40,
  });
  srv.arenaStateFan(match);
}

/** Field the current round onto the sand. */
export function arenaSpawnRound(srv: GameServer, match: ArenaMatchState): void {
  const venue = match.venue;
  const round = match.plan.rounds[match.round];
  if (!venue || !round) {
    srv.arenaReset(match, { silent: true });
    return;
  }
  const plane = venue.plane ?? SURFACE_PLANE_ID;
  const world = srv.worldOf(plane);
  const walkable = (x: number, y: number): boolean =>
    !world.isSolid(Math.floor(x), Math.floor(y));
  const spots = scatterSpots(
    venue.pit,
    round.bodies.length + round.props,
    match.seed ^ (match.round * 0x9109),
    walkable,
  );
  let si = 0;
  for (const b of round.bodies) {
    const base = NPCS.get(b.npc);
    if (!base) continue;
    let def = scaleNpcDef(base, b.level, b.name);
    if (b.crownSeed !== undefined && !def.boss && def.kit && crownPoolFor(b.npc)) {
      def = forgeCrown(def, b.crownSeed, b.name !== undefined ? { name: b.name } : undefined);
    }
    const spot = spots[si++] ?? { x: venue.pit.x, y: venue.pit.y };
    // Every wave body flies the 'arena' banner: kin-peace keeps a
    // mixed card from hunting itself, and no matrix row exists so
    // the town watch has no standing feud with the sport.
    const neid = srv.spawnNpc(def, plane, spot.x, spot.y, -1, undefined, undefined, 'arena');
    const npc = srv.npcs.get(neid);
    if (npc) npc.arenaMatch = match.venueId;
    match.waveEids.add(neid);
    srv.broadcastFx(plane, {
      t: 'fx',
      kind: 'summon',
      x: spot.x,
      y: spot.y,
      radius: Math.max(0.8, def.radius * 1.6),
    });
  }
  // Cover for the round: barrels and crates, smashable, swept at
  // the reset (the destructible law's own hits/respawn dials run
  // while the round lives).
  for (let i = 0; i < round.props; i++) {
    const spot = spots[si++];
    if (!spot) break;
    const tx = Math.floor(spot.x);
    const ty = Math.floor(spot.y);
    if (world.isSolid(tx, ty)) continue;
    if (venue.gates.some((g) => g.x === tx && g.y === ty)) continue;
    if (venue.chest.x === tx && venue.chest.y === ty) continue;
    const prev = world.groundAt(tx, ty);
    if (prev === undefined) continue;
    srv.setWorldTile(plane, tx, ty, i % 2 === 0 ? Tile.Barrel : Tile.Crate);
    match.propTiles.push({ x: tx, y: ty, prev });
  }
  const last = match.round === match.plan.rounds.length - 1;
  srv.arenaBark(
    match,
    round.bark ?? stockBark(last ? 'final' : 'round', match.seed, 10 + match.round),
  );
  srv.broadcastFx(plane, {
    t: 'fx',
    kind: 'horn',
    x: venue.pit.x,
    y: venue.pit.y,
    radius: 8,
  });
  match.phase = 'round';
  match.deadlineTick = 0;
  srv.arenaStateFan(match);
}

/** A wave body left the sand — the kill path's notification. */
export function arenaBodyFell(srv: GameServer, npcEid: EntityId, venueId: string): void {
  const match = srv.arenaMatches.get(venueId);
  if (!match) return;
  match.waveEids.delete(npcEid);
  if (match.phase !== 'round') return;
  if (srv.arenaFoesLeft(match) > 0) {
    srv.arenaStateFan(match);
    return;
  }
  if (match.round >= match.plan.rounds.length - 1) {
    srv.arenaVictory(match);
  } else {
    match.round++;
    match.phase = 'breather';
    match.deadlineTick = srv.tickCount + secToTicks(ARENAS.dials.countdownSec);
    srv.arenaBark(match, stockBark('round', match.seed, 20 + match.round));
    srv.arenaStateFan(match);
  }
}

/** The card is won: the show, the ladder, the purse. */
export function arenaVictory(srv: GameServer, match: ArenaMatchState): void {
  const venue = match.venue;
  if (!venue) {
    srv.arenaReset(match, { silent: true });
    return;
  }
  const plane = venue.plane ?? SURFACE_PLANE_ID;
  match.phase = 'victory';
  match.deadlineTick = srv.tickCount + secToTicks(ARENAS.dials.chestGraceSec);
  srv.arenaSetGates(match, false);
  // The ladder pays every enrolled soul — the fallen at the doc's
  // fraction (they bought the card too; the sand remembers).
  for (const [cid, m] of match.members) {
    const pay = arenaPayFor(match.def, m.alive);
    const eid = srv.characterEids.get(cid);
    const player = eid !== undefined ? srv.players.get(eid) : undefined;
    if (player) {
      const { climbed } = bankArenaXp(player.arena, pay);
      player.arena.wins++;
      if (player.characterId > 0) srv.accounts.saveArena(player.characterId, player.arena);
      player.session?.sendJson({
        t: 'chat',
        channel: 'system',
        text: `The card pays ${pay} arena marks.`,
      });
      for (const rank of climbed) {
        const title = arenaTitleFor(rank);
        const held = arenaTitleFor(rank - 1);
        const pos = eid !== undefined ? srv.positions.get(eid) : undefined;
        srv.speak(
          player,
          `Rank ${rank}`,
          title !== held
            ? `The board writes you at rank ${rank}. The crowd has a name for you now: ${title}.`
            : `The board writes you at rank ${rank}.`,
          pos ? { x: pos.x, y: pos.y } : undefined,
          'good',
        );
      }
    } else if (cid > 0) {
      void srv.accounts
        .loadArena(cid)
        .then((row) => {
          // If the soul relogged while the read was in flight, pay
          // the LIVE bank (the audit's find: the async save would
          // otherwise be clobbered by the next live write).
          const backEid = srv.characterEids.get(cid);
          const back = backEid !== undefined ? srv.players.get(backEid) : undefined;
          const bank = back ? back.arena : (row ?? freshArenaBank());
          bankArenaXp(bank, pay);
          bank.wins++;
          srv.accounts.saveArena(cid, bank);
        })
        .catch((err: unknown) => log('error', 'arena', 'offline bank win unpaid', { cid, error: String(err) }));
    }
  }
  // The purse rises on the sand, warded to the enrolled, rolled at
  // the card's own level (the chest-law overlay carries both).
  const chestGround = srv.worldOf(plane).groundAt(venue.chest.x, venue.chest.y);
  if (chestGround !== undefined && !srv.worldOf(plane).isSolid(venue.chest.x, venue.chest.y)) {
    match.chestPrev = chestGround;
    srv.setWorldTile(plane, venue.chest.x, venue.chest.y, closedChestTile(match.def.chest ?? 'boss'));
    srv.poiChests.set(`${plane}|${venue.chest.x},${venue.chest.y}`, {
      cell: `arena:${match.venueId}`,
      table: match.def.lootTable ?? arenaPurseTableFor(match.def.level),
      level: match.def.level,
    });
    srv.arenaChestClaims.set(match.venueId, new Set(match.members.keys()));
    srv.broadcastFx(plane, {
      t: 'fx',
      kind: 'summon',
      x: venue.chest.x + 0.5,
      y: venue.chest.y + 0.5,
      radius: 1.4,
      id: 'arena:purse',
    });
  }
  srv.arenaBark(match, stockBark('victory', match.seed, 30));
  srv.arenaBark(match, stockBark('chest', match.seed, 31));
  srv.broadcastFx(plane, {
    t: 'fx',
    kind: 'nova',
    x: venue.pit.x,
    y: venue.pit.y,
    radius: Math.max(venue.pit.rx, venue.pit.ry),
    id: 'arena:victory',
  });
  srv.arenaStateFan(match, true);
}

/** THE CLAIM IS THE PARTY'S: walk the uninvited off the sand. */
export function arenaGuardSweep(srv: GameServer, match: ArenaMatchState, venue: ArenaVenueDef): void {
  const plane = venue.plane ?? SURFACE_PLANE_ID;
  for (const [peid, p] of srv.players) {
    const pp = srv.positions.get(peid);
    if (!pp || pp.plane !== plane) continue;
    // The sand, plus the gate line, plus the gatehouse recesses: a
    // body parked ON a gate tile would hold the bar open all match
    // and rob the death spill of its gate (the audit's find), and a
    // body in a carved passage row between gate and sand (the Grand
    // Ring's two-tile crown, §10 fix) would be sealed in with the
    // card. Pad 1.5 reaches the recesses; everything the wider
    // ellipse adds beyond them is solid wall no body can stand in.
    const onGate = match.gateTiles.some(
      (g) => Math.floor(pp.x) === g.x && Math.floor(pp.y) === g.y,
    );
    if (!onGate && !inPit(venue.pit, pp.x, pp.y, 1.5)) continue;
    if (match.members.get(p.characterId)?.alive === true) continue;
    srv.teleport(peid, venue.exit.x + 0.5, venue.exit.y + 0.5);
    p.session?.sendJson({
      t: 'chat',
      channel: 'system',
      text: 'The sand is claimed. The stands are free.',
    });
  }
}

/** The 5 Hz beat: clocks, sweeps, engagement, the backstop. */
export function tickArenas(srv: GameServer, now: number): void {
  if (srv.arenaMatches.size === 0) return;
  for (const match of [...srv.arenaMatches.values()]) {
    const venue = match.venue;
    if (!venue) {
      srv.arenaReset(match, { silent: true });
      continue;
    }
    const plane = venue.plane ?? SURFACE_PLANE_ID;
    // The backstop: no claim outlives its cap, however it hung —
    // except a card already WON, which is not hung at all: its own
    // grace deadline ends it (the audit's find: the backstop was
    // banking a loss on top of a banked win).
    if (match.phase !== 'victory' && now - match.startedAt > ARENAS.dials.matchCapSec * 1000) {
      srv.arenaWipe(match);
      continue;
    }
    if (match.phase !== 'muster' && match.phase !== 'victory') {
      // Gates that a body blocked shut on the retry; the sweep walks
      // creepers out; absent members read as severed.
      if (!match.gatesShut) srv.arenaSetGates(match, true);
      srv.arenaGuardSweep(match, venue);
      for (const [cid, m] of match.members) {
        if (!m.alive) continue;
        const eid = srv.characterEids.get(cid);
        const pp = eid !== undefined ? srv.positions.get(eid) : undefined;
        if (
          !pp ||
          pp.plane !== plane ||
          Math.hypot(pp.x - venue.pit.x, pp.y - venue.pit.y) > 60
        ) {
          m.alive = false;
          srv.arenaWipeCheck(match);
        }
      }
      if (!srv.arenaMatches.has(match.venueId)) continue;
    }
    if (match.phase === 'round') {
      // The sand suffers no shy fighter: an idle wave body past its
      // first breath is pressed onto the nearest enrolled soul
      // through the ONE aggro door, forced.
      for (const weid of match.waveEids) {
        const npc = srv.npcs.get(weid);
        if (!npc || npc.state !== 'idle') continue;
        if (srv.tickCount < npc.noAggroUntilTick) continue;
        let bestEid: EntityId | null = null;
        let bestD = Number.POSITIVE_INFINITY;
        const wpos = srv.positions.get(weid);
        if (!wpos) continue;
        for (const [cid, m] of match.members) {
          if (!m.alive) continue;
          const eid = srv.characterEids.get(cid);
          const pp = eid !== undefined ? srv.positions.get(eid) : undefined;
          if (!pp || pp.plane !== plane) continue;
          const d = Math.hypot(pp.x - wpos.x, pp.y - wpos.y);
          if (d < bestD) {
            bestD = d;
            bestEid = eid!;
          }
        }
        if (bestEid !== null) srv.npcAggro(weid, npc, bestEid, { force: true });
      }
      // Safety net beside the kill-path check (a body swept by any
      // other door must not hold the round open forever).
      if (srv.arenaFoesLeft(match) === 0 && match.waveEids.size === 0) {
        if (match.round >= match.plan.rounds.length - 1) srv.arenaVictory(match);
        else {
          match.round++;
          match.phase = 'breather';
          match.deadlineTick = srv.tickCount + secToTicks(ARENAS.dials.countdownSec);
          srv.arenaStateFan(match);
        }
        continue;
      }
    }
    if (match.deadlineTick > 0 && srv.tickCount >= match.deadlineTick) {
      switch (match.phase) {
        case 'muster':
          srv.arenaGateShut(match);
          break;
        case 'gates':
          match.phase = 'breather';
          match.deadlineTick = srv.tickCount + secToTicks(ARENAS.dials.countdownSec);
          srv.arenaStateFan(match);
          break;
        case 'breather':
          srv.arenaSpawnRound(match);
          break;
        case 'victory':
          srv.arenaReset(match);
          break;
        case 'round':
          break;
      }
      continue;
    }
    // The once-a-second heartbeat keeps every running clock honest.
    if (match.deadlineTick > srv.tickCount && srv.tickCount - match.lastBeatTick >= 20) {
      match.lastBeatTick = srv.tickCount;
      srv.arenaStateFan(match);
    }
  }
}
