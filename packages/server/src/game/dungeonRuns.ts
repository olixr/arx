/**
 * THE LONG DARK'S DOORS — riftgates, instance entry and teardown, headcounts, clears, party joins and guest evictions.
 * Moved verbatim off GameServer (foundations F4); the class keeps
 * one-line delegators so every caller and test slate reads unchanged.
 */
import { DUNGEON_ORIGIN, generateDungeon } from '../dungeon/generate.js';
import { Session } from '../net/session.js';
import { PlaneId, PlanePos, riftPlaneDef, riftPlaneId } from '@arx/content';
import { DungeonSpec, EntityId, ItemRoll, Tile, dungeonModifiers } from '@arx/shared';
import type { GameServer, PlayerComp } from './gameServer.js';

/**
 * The Riftgate answers an interact by opening the key panel — the
 * client lists the keys from its own ring mirror; `usekey` names
 * one by ring id. `live` marks the caller's standing run so a
 * worn-out key can still re-enter the door it already paid for.
 */
export function openRiftgate(srv: GameServer, eid: EntityId, player: PlayerComp): void {
  const inst = srv.dungeons.get(player.characterId);
  // The gates are one network: any fellow's live run stands open here.
  const partyRuns: Array<{ name: string; dungeon: string; tier: string; power: number }> = [];
  for (const fellowId of srv.party.fellowsOf(player.characterId)) {
    const fellowInst = srv.dungeons.get(fellowId);
    if (!fellowInst) continue;
    const name = srv.accounts.characterName(fellowId);
    if (!name) continue;
    partyRuns.push({ name, dungeon: fellowInst.name, tier: fellowInst.tier, power: fellowInst.power });
  }
  player.session?.sendJson({
    t: 'riftgate',
    live: inst ? { seed: inst.seed, tier: inst.tier, power: inst.power } : undefined,
    partyRuns: partyRuns.length > 0 ? partyRuns : undefined,
  });
  if (player.keyRing.length === 0 && partyRuns.length === 0) {
    player.session?.sendJson({
      t: 'chat',
      channel: 'system',
      text: 'The Riftgate stands dark. It wants a dungeon key — the deep places and their keepers drop them.',
    });
  }
}

export function enterDungeon(srv: GameServer, 
  eid: EntityId,
  player: PlayerComp,
  spec: DungeonSpec,
  returnTo: PlanePos,
): void {
  let inst = srv.dungeons.get(player.characterId);
  if (inst && inst.seed === spec.seed && inst.tier === spec.tier && inst.power === spec.power) {
    srv.transferPlane(eid, inst.plane, inst.entry.x, inst.entry.y);
    return;
  }
  if (inst) srv.teardownDungeon(player.characterId);
  const slot = srv.nextDungeonSlot++;
  // THE WORLDS APART: the run is cut onto its own rift plane —
  // minted here, dropped whole at teardown. The plane IS the
  // isolation; every run generates at the same quiet origin.
  const plane = riftPlaneId(slot);
  const result = generateDungeon(spec, DUNGEON_ORIGIN, returnTo, slot);
  srv.planes.add(riftPlaneDef(plane, spec.name), [result.zone]);
  const spawnIndexes = srv.registerSpawns(result.zone.spawns ?? [], plane);
  inst = {
    zoneId: result.zone.id,
    spawnIndexes,
    slot,
    plane,
    entry: result.entry,
    seed: spec.seed,
    tier: spec.tier,
    power: spec.power,
    ownerId: player.characterId,
    ownerReturn: returnTo,
    name: spec.name,
    sigil: spec.sigil,
    theme: spec.theme,
    guests: new Map(),
    // registerSpawns flattens one point per BODY — the champion's
    // global index is offset by every earlier entry's count.
    bossSpawnIdx: (() => {
      if (result.bossSpawnIndex === null) return undefined;
      let flat = 0;
      for (let i = 0; i < result.bossSpawnIndex; i++) {
        flat += result.zone.spawns?.[i]?.count ?? 0;
      }
      return spawnIndexes[flat];
    })(),
    cutAt: Date.now(),
    courtExit: result.courtExit ?? undefined,
  };
  srv.dungeons.set(player.characterId, inst);
  // THE COURT WARDS THE PRIZE: the champion's chest refuses the hand
  // while he stands — the fight is the key, not the sneak.
  if (result.bossChest) {
    srv.poiChests.set(`${plane}|${result.bossChest.x},${result.bossChest.y}`, {
      cell: `dg:${player.characterId}`,
      warded: true,
    });
  }
  const modNames = dungeonModifiers(spec.seed, spec.tier).map((m) => m.name);
  player.session?.sendJson({
    t: 'dungeon',
    name: spec.name,
    sigil: spec.sigil,
    tier: spec.tier,
    theme: spec.theme,
    power: spec.power,
    mods: modNames.length > 0 ? modNames : undefined,
  });
  player.session?.sendJson({
    t: 'chat',
    channel: 'system',
    text: `${spec.name} — sigil ${spec.sigil}, power ${spec.power}${modNames.length > 0 ? `, ${modNames.join(', ').toLowerCase()}` : ''}. The way out is where you land; the boss is where you'd least like him.`,
  });
  srv.transferPlane(eid, plane, result.entry.x, result.entry.y);
  // Offer the fellowship the door (any riftgate carries them in).
  if (player.characterId > 0) {
    srv.party.notifyDelve(player.characterId, player.name, spec.name);
  }
}

export function teardownDungeon(srv: GameServer, characterId: number): void {
  const dungeon = srv.dungeons.get(characterId);
  if (!dungeon) return;
  // Anyone still standing in the halls goes home before the rock
  // closes — guests to their own gate, anyone else to the spawn.
  for (const [eid, player] of srv.players) {
    if (player.characterId === characterId) continue;
    const pos = srv.positions.get(eid);
    if (!pos || pos.plane !== dungeon.plane) continue;
    const back = dungeon.guests.get(player.characterId) ?? srv.planes.worldSpawn;
    srv.transferPlane(eid, back.plane, back.x, back.y);
    player.session?.sendJson({
      t: 'chat',
      channel: 'system',
      text: 'The rift closes behind its keyholder — the world takes you back.',
    });
  }
  dungeon.guests.clear();
  // The run's slots return to the pool — every dungeon ever cut used
  // to permanently fatten spawnPoints (the one retirement door law).
  for (const idx of dungeon.spawnIndexes) srv.freeSpawnSlot(idx);
  // THE ROCK TAKES ITS DEAD: anything still breathing on the plane
  // that the roster never knew — a crown's raised adds spawn with
  // spawnIndex -1 — goes with the world it stood in. Companions are
  // the one exception: a friend follows its keeper, never the rubble.
  const strays: EntityId[] = [];
  for (const [neid] of srv.npcs) {
    if (srv.pets.has(neid) || srv.companions.has(neid)) continue;
    const npos = srv.positions.get(neid);
    if (!npos || npos.plane !== dungeon.plane) continue;
    strays.push(neid);
  }
  for (const neid of strays) {
    srv.removeFromChunks(neid);
    srv.ecs.destroy(neid);
  }
  // THE PLANE'S EPHEMERA GO WITH IT (post-ship audit): a projectile
  // still in flight would ask worldOf() for a plane that no longer
  // stands on the very next tick — one arrow loosed at the exit door
  // used to kill the whole server. Drops and summons share the sweep
  // (loot on a dead plane is loot nobody can ever reach), and
  // scheduled blasts and fields on the plane die unexploded.
  const ephemera: EntityId[] = [];
  for (const [peid] of srv.projectiles) {
    if (srv.positions.get(peid)?.plane === dungeon.plane) ephemera.push(peid);
  }
  for (const [deid] of srv.drops) {
    if (srv.positions.get(deid)?.plane === dungeon.plane) ephemera.push(deid);
  }
  for (const [seid] of srv.summons) {
    if (srv.positions.get(seid)?.plane === dungeon.plane) ephemera.push(seid);
  }
  for (const eeid of ephemera) {
    srv.removeFromChunks(eeid);
    srv.ecs.destroy(eeid);
  }
  for (let i = srv.pendingBlasts.length - 1; i >= 0; i--) {
    if (srv.pendingBlasts[i]!.plane === dungeon.plane) srv.pendingBlasts.splice(i, 1);
  }
  for (let i = srv.activeFields.length - 1; i >= 0; i--) {
    if (srv.activeFields[i]!.plane === dungeon.plane) srv.activeFields.splice(i, 1);
  }
  // THE UNLOAD IS THE POINT: the whole plane goes — zones, chunks,
  // portals, signs, memory — in one drop.
  srv.planes.drop(dungeon.plane);
  // The chunk index sheds the dead plane's now-empty sets — slot ids
  // recycle, but these keys used to pile up for the whole uptime.
  const deadPrefix = `${dungeon.plane}|`;
  for (const [key, set] of srv.chunks) {
    if (set.size === 0 && key.startsWith(deadPrefix)) srv.chunks.delete(key);
  }
  srv.dungeons.delete(characterId);
  // The court's ward retires with its halls.
  for (const [tileKey, over] of srv.poiChests) {
    if (over.cell === `dg:${characterId}`) srv.poiChests.delete(tileKey);
  }
  // THE WORN WARD's last beat rides every door-close: a spent key
  // that was only standing because this run stood crumbles now.
  const ownerEid = srv.characterEids.get(characterId);
  if (ownerEid !== undefined) {
    const owner = srv.players.get(ownerEid);
    if (owner) srv.sweepWornKeys(owner);
  }
}

/**
 * THE MANY ARE MET: how many souls of the run (owner + guests)
 * currently stand inside the instance that owns this tile — 1 when
 * the ground is no dungeon. The garrison meets the party through
 * this number: each extra soul thickens every body's effective hide
 * and stiffens its arm, so a fellowship fights a fight instead of
 * a harvest, and a key's power reads as the SOLO recommendation.
 */
export function dungeonHeadcount(srv: GameServer, plane: PlaneId): number {
  const inst = srv.dungeonOnPlane(plane);
  if (!inst) return 1;
  let n = 0;
  for (const [peid, p] of srv.players) {
    if (p.characterId !== inst.ownerId && !inst.guests.has(p.characterId)) continue;
    if (p.session === null && p.disconnectedAt !== null) continue;
    const pp = srv.positions.get(peid);
    if (pp && pp.plane === inst.plane) n++;
  }
  return Math.max(1, n);
}

/**
 * THE COURT FALLS: the champion of a run went down. If the felled
 * spawn is the run's own crown, the run is CLEARED — every soul of
 * the fellowship present gets the ceremony (banner + line, with the
 * run clock read honest), and the sealed rift-mouth below the dais
 * tears open so the victors step home instead of walking the whole
 * cleared spine back. Fires at most once per cut: THE CLEARED HALL
 * pins the champion's respawn to Infinity, so he falls only once.
 */
export function noteDungeonCleared(srv: GameServer, spawnIndex: number, plane: PlaneId): void {
  const inst = srv.dungeonOnPlane(plane);
  if (!inst || inst.bossSpawnIdx !== spawnIndex) return;
  const sec = Math.max(1, Math.round((Date.now() - inst.cutAt) / 1000));
  if (inst.courtExit) {
    srv.setWorldTile(inst.plane, inst.courtExit.x, inst.courtExit.y, Tile.PortalUp);
    srv.broadcastFx(inst.plane, {
      t: 'fx',
      kind: 'summon',
      x: inst.courtExit.x + 0.5,
      y: inst.courtExit.y + 0.5,
      radius: 1.6,
      color: '#8f7ae8',
    });
  }
  const mm = Math.floor(sec / 60);
  const ss = String(sec % 60).padStart(2, '0');
  const line = `${inst.name} is cleared — the court fell in ${mm}:${ss}. The champion's chest lies open to claim${inst.courtExit ? ', and a way home stands torn open below the dais' : ''}.`;
  for (const [peid, p] of srv.players) {
    if (p.characterId !== inst.ownerId && !inst.guests.has(p.characterId)) continue;
    const pp = srv.positions.get(peid);
    if (!pp || pp.plane !== inst.plane) continue;
    p.session?.sendJson({ t: 'dgclear', name: inst.name, sigil: inst.sigil, sec });
    p.session?.sendJson({ t: 'chat', channel: 'system', text: line });
  }
}

/**
 * Step into a party member's live run. The riftgates are one network —
 * any gate can carry a fellow into a run the keyholder holds open.
 */
export function partyJoinRun(srv: GameServer, eid: EntityId, session: Session, name: string): void {
  const actor = srv.socialActor(eid, session);
  if (!actor) return;
  const player = srv.players.get(eid);
  const pos = srv.positions.get(eid);
  if (!player || !pos) return;
  const sys = (text: string) => session.sendJson({ t: 'chat', channel: 'system', text });
  if (!srv.riftgateNear(pos)) {
    sys('You need to stand at a Riftgate to follow your party.');
    return;
  }
  void (async () => {
    const target = await srv.accounts.findCharacterByName(name.trim());
    if (!target) return sys('No one by that name.');
    if (!srv.party.fellowsOf(actor.id).includes(target.id)) {
      return sys(`${target.name} is not in your party.`);
    }
    const inst = srv.dungeons.get(target.id);
    if (!inst) return sys(`${target.name} holds no rift open.`);
    inst.guests.set(actor.id, { plane: pos.plane, x: pos.x, y: pos.y });
    // The banner + fog-mask reset ride the same message the owner got.
    const guestMods = dungeonModifiers(inst.seed, inst.tier as ItemRoll['rar']).map((m) => m.name);
    session.sendJson({
      t: 'dungeon',
      name: inst.name,
      sigil: inst.sigil,
      tier: inst.tier,
      theme: inst.theme,
      power: inst.power,
      mods: guestMods.length > 0 ? guestMods : undefined,
    });
    srv.transferPlane(eid, inst.plane, inst.entry.x, inst.entry.y);
    const ownerEid = srv.characterEids.get(target.id);
    if (ownerEid !== undefined) {
      srv.players.get(ownerEid)?.session?.sendJson({
        t: 'chat',
        channel: 'system',
        text: `${actor.name} steps through the rift to join you.`,
      });
    }
  })().catch((err: Error) => console.error('[party]', err.message));
}

/**
 * A character stopped being party to their fellows — if they were
 * guesting in one's dungeon, the rift no longer knows them.
 */
export function evictFromGuestDungeon(srv: GameServer, characterId: number): void {
  const eid = srv.characterEids.get(characterId);
  for (const inst of srv.dungeons.values()) {
    const back = inst.guests.get(characterId);
    if (back === undefined) continue;
    inst.guests.delete(characterId);
    if (eid === undefined) continue;
    const pos = srv.positions.get(eid);
    if (!pos || pos.plane !== inst.plane) continue;
    srv.transferPlane(eid, back.plane, back.x, back.y);
    srv.players.get(eid)?.session?.sendJson({
      t: 'chat',
      channel: 'system',
      text: 'The rift no longer knows you — it hands you back to your gate.',
    });
  }
}
