/**
 * THE WATCHED WORLD — the spatial hash, interest membership, the meta builder and the snapshot sender: what each session sees.
 * Moved verbatim off GameServer (foundations F4); the class keeps
 * one-line delegators so every caller and test slate reads unchanged.
 */
import { Session } from '../net/session.js';
import { PlaneId, actorAppearance } from '@arx/content';
import { ALERT_ICON_ENGAGED, ALERT_ICON_HUNTING, ALERT_ICON_LOOKING, ALERT_ICON_NONE, ALERT_ICON_PURSUIT, ALERT_ICON_WARY, CHUNK_SIZE, EntityId, EntityMeta, EquipSlot, INTEREST_CHUNK_RADIUS, POS_SCALE, PoseState, SnapshotEntity, chunkKey, encodeChunk, encodeSnapshot, isStowedSlot, levelForXp, petLevelFor } from '@arx/shared';
import type { GameServer } from './gameServer.js';

/**
 * THE WORLDS APART: the entity-chunk index is keyed plane-first, so
 * a proximity scan can only ever see bodies whose coordinates share
 * a coordinate space. Session.knownChunks stays bare "cx,cy" — a
 * session streams exactly one plane at a time and is cleared whole
 * at every crossing.
 */
export function chunkKeyOf(srv: GameServer, plane: PlaneId, x: number, y: number): string {
  return `${plane}|${chunkKey(Math.floor(x / CHUNK_SIZE), Math.floor(y / CHUNK_SIZE))}`;
}

export function updateChunkMembership(srv: GameServer, eid: EntityId): void {
  const pos = srv.positions.must(eid);
  const key = srv.chunkKeyOf(pos.plane, pos.x, pos.y);
  const prev = srv.entityChunk.get(eid);
  if (prev === key) return;
  if (prev !== undefined) srv.chunks.get(prev)?.delete(eid);
  let set = srv.chunks.get(key);
  if (!set) {
    set = new Set();
    srv.chunks.set(key, set);
  }
  set.add(eid);
  srv.entityChunk.set(eid, key);
}

export function removeFromChunks(srv: GameServer, eid: EntityId): void {
  const prev = srv.entityChunk.get(eid);
  if (prev !== undefined) {
    srv.chunks.get(prev)?.delete(eid);
    srv.entityChunk.delete(eid);
  }
}

/** Diff the session's known set against what's visible; send enter/leave. */
export function updateInterest(srv: GameServer, session: Session): void {
  const eid = session.playerEid!;
  const pos = srv.positions.get(eid);
  if (!pos) return;

  const ccx = Math.floor(pos.x / CHUNK_SIZE);
  const ccy = Math.floor(pos.y / CHUNK_SIZE);

  // Discovery runs on the center-chunk EDGE — the new-chunk branch
  // below fires for chunks 2 away (64+ tiles out), far too early to
  // shout "discovered" about anything.
  const center = chunkKey(ccx, ccy);
  if (session.lastCenterChunk !== center) {
    session.lastCenterChunk = center;
    srv.checkDiscoveries(eid);
  }

  // The session streams the player's OWN plane and nothing else —
  // knownChunks keys stay bare "cx,cy" (the plane is the session's),
  // while the entity index reads through plane-first keys.
  const world = srv.planes.require(pos.plane);
  const visible = new Set<EntityId>();
  const windowKeys = new Set<string>();
  for (let cy = ccy - INTEREST_CHUNK_RADIUS; cy <= ccy + INTEREST_CHUNK_RADIUS; cy++) {
    for (let cx = ccx - INTEREST_CHUNK_RADIUS; cx <= ccx + INTEREST_CHUNK_RADIUS; cx++) {
      const key = chunkKey(cx, cy);
      windowKeys.add(key);
      if (!session.knownChunks.has(key)) {
        session.knownChunks.add(key);
        session.sendBinary(encodeChunk(world.ensure(cx, cy)));
        // The words ride in with the board they belong to.
        srv.sendChunkSigns(session, cx, cy);
      }
      const set = srv.chunks.get(`${pos.plane}|${key}`);
      if (set) for (const e of set) visible.add(e);
    }
  }
  // CHUNK HYSTERESIS: forget a streamed chunk only when it falls a
  // full ring beyond the interest window. Evicting at the window's
  // exact edge meant a player pacing across a chunk border
  // re-downloaded the same five chunks (~25KB) on every crossing —
  // the client caches them forever, so the resend was pure waste.
  for (const key of session.knownChunks) {
    if (windowKeys.has(key)) continue;
    const comma = key.indexOf(',');
    const cx = Number(key.slice(0, comma));
    const cy = Number(key.slice(comma + 1));
    if (
      Math.abs(cx - ccx) > INTEREST_CHUNK_RADIUS + 1 ||
      Math.abs(cy - ccy) > INTEREST_CHUNK_RADIUS + 1
    ) {
      session.knownChunks.delete(key);
    }
  }

  // Fully-hidden players simply aren't there to anyone else: the diff
  // below issues the leave (and later the fresh re-enter) for free, and
  // snapshots only iterate knownEntities so nothing leaks meanwhile.
  for (const e of visible) {
    if (e !== eid && srv.players.get(e)?.hidden) visible.delete(e);
  }

  const enters: EntityMeta[] = [];
  for (const e of visible) {
    if (!session.knownEntities.has(e)) {
      session.knownEntities.add(e);
      enters.push(srv.buildMeta(e));
    }
  }
  const leaves: EntityId[] = [];
  for (const e of session.knownEntities) {
    if (visible.has(e)) continue;
    // ENTITY HYSTERESIS: the mirror of the chunk rule above. Leaving
    // at the window's exact edge meant a player pacing across a chunk
    // border leave/re-entered every outer-ring entity on each crossing
    // — the re-enter wipes sentSnapSig and the client's interp buffer,
    // so the entity visibly pops. Keep a known entity for one extra
    // ring instead: it stays in knownEntities so snapshots keep
    // streaming it, and THE QUIET WIRE makes the ring nearly free (an
    // unchanged row never resends). Hidden players still leave at
    // once (anti-ESP), and a despawned body has no ring to hold.
    // A body on another plane leaves AT ONCE — hysteresis is a
    // border comfort, and there is no border between worlds.
    const kept = srv.positions.get(e);
    if (kept && kept.plane === pos.plane && !srv.players.get(e)?.hidden) {
      const ecx = Math.floor(kept.x / CHUNK_SIZE);
      const ecy = Math.floor(kept.y / CHUNK_SIZE);
      if (
        Math.abs(ecx - ccx) <= INTEREST_CHUNK_RADIUS + 1 &&
        Math.abs(ecy - ccy) <= INTEREST_CHUNK_RADIUS + 1
      ) {
        continue;
      }
    }
    session.knownEntities.delete(e);
    session.sentSnapSig.delete(e);
    leaves.push(e);
  }

  if (enters.length > 0) session.sendJson({ t: 'enter', entities: enters });
  if (leaves.length > 0) session.sendJson({ t: 'leave', eids: leaves });
}

export function buildMeta(srv: GameServer, eid: EntityId): EntityMeta {
  const kind = srv.kinds.must(eid);
  const pos = srv.positions.must(eid);
  const meta: EntityMeta = { eid, kind, x: pos.x, y: pos.y };
  const player = srv.players.get(eid);
  if (player) {
    meta.name = player.name;
    // Appearance carries item IDS only — rendering never needs rolls.
    // Enchants are the exception: they change how gear LOOKS, so the
    // enchanted slots ride along (ids only, still no rolls).
    // THE QUIET BACK (user verdict, 2026-08-14, amends LAW 6): only
    // the ACTIVE set shows on the body — the waiting pair drew as a
    // crossed back rank for one commit and read as overstuffed, and
    // double-sheathing piled scabbards on scabbards. The SLEEPING
    // STEEL exclusion is total now: stowed slots leave the wire here
    // too (nothing renders them, so nothing should carry them).
    const equip: Partial<Record<EquipSlot, string>> = {};
    let ench: Partial<Record<EquipSlot, string>> | undefined;
    for (const [slot, worn] of Object.entries(player.equipment)) {
      if (!worn) continue;
      if (isStowedSlot(slot as EquipSlot)) continue;
      equip[slot as EquipSlot] = worn.id;
      if (worn.roll?.ench) {
        ench ??= {};
        ench[slot as EquipSlot] = worn.roll.ench;
      }
    }
    meta.appearance = {
      bodyColor: '',
      equip,
      ench,
      look: player.look ?? undefined,
      carry: player.carryStyle === 'rogue' ? 'rogue' : undefined,
      carryOff: player.carryOff === 'rogue' ? 'rogue' : undefined,
      mount: player.mountId ?? undefined,
    };
  }
  const npc = srv.npcs.get(eid);
  if (npc) {
    meta.name = npc.def.name;
    meta.defId = npc.def.id;
    meta.level = npc.def.level;
    // THE DREAD CROWN: the banner's whole read — ladder length, the
    // standing rung, its reveal line, and the gate notches (each
    // later rung's hpBelow, so the gauge shows where the fight will
    // turn). Re-broadcast through the one meta door on every turn
    // and on the arena reset.
    const boss = npc.def.boss;
    if (boss) {
      const phase = npc.bossPhase ?? 0;
      const gates = boss.phases
        .slice(1)
        .map((p) => p.hpBelow)
        .filter((g): g is number => g !== undefined);
      meta.boss = {
        title: boss.title,
        phases: boss.phases.length,
        phase,
        phaseName: boss.phases[phase]?.name,
        gates: gates.length > 0 ? gates : undefined,
      };
    }
  }
  // THE COLLAR TELLS THE TALE: ownership is the one companion fact
  // every watcher must know — it changes what the entity IS
  // (somebody's, not the wild's; never a fight offer). Name and
  // level read from the keeper's row; the species body carries the
  // art unchanged (the collar render itself lands Phase 5).
  const petComp = srv.pets.get(eid);
  if (petComp && npc) {
    const keeper = srv.players.get(petComp.ownerEid);
    const row = keeper?.pets.find((p) => p.slot === petComp.slot);
    if (keeper && row) {
      meta.name = row.name;
      meta.level = petLevelFor(row.xp, npc.def.level, levelForXp(keeper.skills.beastcraft ?? 0));
    }
    meta.ownerEid = petComp.ownerEid;
    meta.friendly = true;
    // THE COAT OUTLIVES THE BODY: the courted look rides the wire
    // so every watcher dresses the same friend, every respawn.
    if (row?.lookSeed != null) meta.seed = row.lookSeed;
  }
  // THE COMPANY YOU KEEP: a befriended companion wears its name and
  // the `company` mark — what tells the two owned lanes apart on
  // the wire (no collar, no level gem, no fight offer, ever).
  const compComp = srv.companions.get(eid);
  if (compComp && npc) {
    const keeper = srv.players.get(compComp.ownerEid);
    const row = keeper?.companions.find((c) => c.slot === compComp.slot);
    if (row) meta.name = row.name;
    // Company has no ladder: the species' wild level (stamped for
    // every npc above) leaves the plate — 'Pip', never 'Pip (1)'.
    delete meta.level;
    meta.ownerEid = compComp.ownerEid;
    meta.friendly = true;
    meta.company = true;
    if (row?.lookSeed != null) meta.seed = row.lookSeed;
  }
  // THE ANIMALS OF THE YARD: a kept animal wears its given name and
  // the stock marker (never fightable); ownerEid rides only while
  // the keeper is online, aiming the keeper's own prompts.
  const stockComp = srv.livestock.get(eid);
  if (stockComp && npc) {
    meta.name = stockComp.row.name;
    meta.stock = true;
    meta.friendly = true;
    const keeperEid = srv.characterEids.get(stockComp.row.characterId);
    if (keeperEid !== undefined) meta.ownerEid = keeperEid;
    // THE FLEECE TELLS THE TIME: a sheep wears its produce clock —
    // clipped while the wool regrows, a full cloud when shearable.
    if (stockComp.row.species === 'sheep' && npc.nextProduceAt > Date.now()) {
      meta.shorn = true;
    }
  }
  const actorComp = srv.actors.get(eid);
  if (actorComp) {
    const actor = actorComp.actor;
    meta.name = actor.name;
    if (actor.title) meta.title = actor.title;
    if (actor.model.kind === 'creature') {
      // The bestiary body carries the art; the actor carries the name.
      meta.defId = actor.model.creature;
    } else {
      // Humanoids ride the wire exactly like players: a Look plus
      // worn item ids, rendered by the one humanoid rig.
      const appearance = actorAppearance(actor);
      if (appearance) {
        // THE SADDLE IN THE SCHEDULE: a riding body carries its
        // beast on the same appearance channel a player does — one
        // identity fact, every watcher, one render path.
        if (actorComp.mount) appearance.mount = actorComp.mount;
        meta.appearance = appearance;
      }
    }
    // No combat body = never attackable: clients offer Talk, and no
    // combat loop can even see this entity.
    if (!npc) meta.friendly = true;
    // Has a voice — clients offer Talk even on fightable neutrals.
    if (srv.dialoguesByActor.has(actor.id) || (actor.lines?.length ?? 0) > 0) {
      meta.talk = true;
    }
    // The slug is static identity (v20): each client resolves its
    // OWN quest marks against it — per-viewer truth off the wire.
    meta.actor = actor.id;
  }
  const drop = srv.drops.get(eid);
  if (drop) {
    meta.defId = drop.item;
    meta.qty = drop.qty;
    meta.roll = drop.roll;
  }
  const proj = srv.projectiles.get(eid);
  if (proj) {
    const base = proj.heavy ? `${proj.style}_heavy` : proj.style;
    meta.defId = proj.element ? `${base}:${proj.element}` : base;
    // Tracer handoff identity (v8): the owner's client matches its
    // predicted shot to this entity by (ownerEid, seq).
    meta.ownerEid = proj.ownerEid;
    if (proj.spawnSeq !== undefined) meta.seq = proj.spawnSeq;
    // Ballistic truth (v9): heading + speed let every client fly
    // this shot from its first sample instead of freezing on it
    // until a snapshot pair reveals the velocity.
    meta.dir = Math.atan2(proj.dirY, proj.dirX);
    meta.speed = proj.speed;
    if (proj.returns) meta.returns = true;
  }
  const summon = srv.summons.get(eid);
  if (summon) meta.defId = `summon_${summon.kind}`;
  const grave = srv.graves.get(eid);
  if (grave) {
    meta.defId = 'gravestone';
    meta.name = grave.name;
  }
  return meta;
}

/**
 * The overhead telegraph, a pure read of the state ladder — THE
 * EYE ABOVE THE HEAD. Every rung the player can act on wears its
 * own face: the ENGAGED lock (the eye is ON you), the PURSUIT
 * slash (the committed blind run — sight broken, still coming:
 * keep running), the HUNTING sweep (hide now, the chain is
 * broken), the LOOKING walk-over, the WARY stare. A chase never
 * lies about its eye anymore: the blind leg telegraphs blind.
 */
export function npcAlertByte(srv: GameServer, eid: EntityId): number {
  const npc = srv.npcs.get(eid);
  if (!npc) return ALERT_ICON_NONE;
  if (npc.state === 'chase' || npc.state === 'seekhelp') {
    return npc.pursuitSinceTick !== undefined ? ALERT_ICON_PURSUIT : ALERT_ICON_ENGAGED;
  }
  if (npc.state === 'search') return ALERT_ICON_HUNTING;
  if (npc.state === 'investigate') return ALERT_ICON_LOOKING;
  if (npc.state === 'suspicious') return ALERT_ICON_WARY;
  return ALERT_ICON_NONE;
}

export function sendSnapshot(srv: GameServer, session: Session): void {
  const player = srv.players.get(session.playerEid!);
  if (!player) return;
  // BACKPRESSURE: a congested socket gets no snapshots — they are
  // superseded data, and stacking them onto a stalled receiver only
  // deepens how far behind it wakes. Events and chunks still queue
  // (they are one-shot truths); the first drained snapshot carries
  // the current world.
  if (session.congested) return;
  const TAU = Math.PI * 2;
  const entities: SnapshotEntity[] = [];
  for (const eid of session.knownEntities) {
    const pos = srv.positions.get(eid);
    if (!pos) continue;
    const health = srv.healths.get(eid);
    // A living body never rounds to the death byte — 1/255 is the
    // honest floor for "bloodied but breathing".
    const hpPct = health
      ? health.hp > 0
        ? Math.max(1, Math.round((health.hp / health.maxHp) * 255))
        : 0
      : 255;
    const pose = srv.poses.get(eid) ?? PoseState.Idle;
    const status = srv.statusBits(eid);
    const alert = srv.npcAlertByte(eid);
    // THE QUIET WIRE: compare in WIRE precision (the encoder's own
    // quantization) so float dust can't force a resend, and skip
    // any entity whose whole row is unchanged. The own body always
    // ships — reconciliation runs on its presence.
    const xq = Math.round(pos.x * POS_SCALE);
    const yq = Math.round(pos.y * POS_SCALE);
    const dirq = Math.round(((((pos.dir % TAU) + TAU) % TAU) / TAU) * 255) & 0xff;
    if (eid !== session.playerEid) {
      const sig = session.sentSnapSig.get(eid);
      if (
        sig &&
        sig[0] === xq &&
        sig[1] === yq &&
        sig[2] === dirq &&
        sig[3] === pose &&
        sig[4] === hpPct &&
        sig[5] === status &&
        sig[6] === alert
      ) {
        continue;
      }
      if (sig) {
        sig[0] = xq; sig[1] = yq; sig[2] = dirq; sig[3] = pose;
        sig[4] = hpPct; sig[5] = status; sig[6] = alert;
      } else {
        session.sentSnapSig.set(eid, Int32Array.of(xq, yq, dirq, pose, hpPct, status, alert));
      }
    }
    entities.push({
      eid,
      x: pos.x,
      y: pos.y,
      dir: pos.dir,
      pose,
      hpPct,
      status,
      alert,
    });
  }
  session.sendBinary(
    encodeSnapshot({
      serverTick: srv.tickCount,
      lastInputSeq: player.lastProcessedSeq,
      entities,
    }),
  );
}
