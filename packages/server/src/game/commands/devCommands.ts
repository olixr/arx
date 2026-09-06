/**
 * Dev-gated slash commands — the whole workshop bench, answering only
 * when config.devCommands is on. Moved verbatim from gameServer.chat
 * (foundations F4); ORDER IS LAW for overlapping verbs (/flagreset
 * before /flag, /triggers before /trigger, the /pet* row).
 */
import { config } from '../../config.js';
import { CompanionRow, PetRow } from '../../db/accounts.js';
import { POI_CELL, poiCellKey, poiCellOf } from '../../world/pois.js';
import { CapitalSeat, capitalKey } from '../../world/strongholds.js';
import { addItem, hasSpaceFor } from '../inventory.js';
import { advanceStages, questAvailable, questReady } from '../quests.js';
import { stampFire } from '../triggers.js';
import { APIARY_MINUTES, APIARY_STORE_CAP, ARENAS, ArxElement, CALLINGS, CALLING_MAX_RANK, COMPANIONS, COMPOST_MINUTES, ELEMENT_COLORS, FACTIONS, FRONTIER, GROWTH_BARE, GROWTH_DRIFTED, GROWTH_STATE_NAMES, GrowthRow, MOUNTS, MUSEUM_PLANE_ID, NPCS, POI_DEFS, ProcAction, STRONGHOLD_DEFS, SURFACE_PLANE_ID, TAMES, TriggerEdge, WORK_RECIPES, arenaTitleFor, callingDef, companionDef, creepWaitFor, crownPoolFor, dangerLaw, enchantDef, factionDef, familiesOf, forgeCrown, groundProbeAt, growMs, growthDialectOf, itemDef, makeRoll, mountDef, petArtDef, projectGrowth, shoreProbeAt, standingBand, tameDef, territoryAt, totalXpForArenaRank, triggerOnceFlag, wildCandidates } from '@arx/content';
import { CHUNK_SIZE, COMPANION_CAP, ChestKind, Detail, ItemRoll, MAX_ITEM_POWER, PET_CAP, PET_REST_HOME_MS, RANK_ROMAN, RARITY_TIERS, STATUS_IDS, TICK_RATE, TIME_NAMES, Tile, bracketSignDetail, clockHoursAtTick, closedChestTile, dungeonSpecFromRoll, isRarityTier, isSkillId, keyUsesForTier, levelForXp, mintKeyPower, ofsForHours, pennantDetail, petBondRank, petFocusMax, petLevelFor, trellisDetail, wallBannerDetail, wallHungInfo } from '@arx/shared';
import { hearthOwnerOf } from '../formulas.js';
import { HEARTH_CD_MS, WILD_MAX_R } from '../tuning.js';
import type { ChatCommand } from './types.js';

/** One sample of every action shape, for the /proc dev lever. */
const DEV_PROC_ACTIONS: Record<string, ProcAction> = {
  status: { do: 'status', status: 'burn', power: 2, ticks: 60 },
  nova: { do: 'nova', damage: 6, radius: 3 },
  bolt: { do: 'bolt', damage: 8 },
  chain: { do: 'chain', damage: 5, jumps: 3 },
  ward: { do: 'ward', absorb: 30, ticks: 100 },
  heal: { do: 'heal', amount: 15 },
  surge: { do: 'surge', stat: 'crit', pct: 25, ticks: 100 },
  cleanse: { do: 'cleanse' },
  yield: { do: 'yield', extra: 2 },
  reveal: { do: 'reveal', radius: 10, of: 'node' },
};

// Dev-only utility commands, never broadcast.
const cmdTp: ChatCommand = {
  name: '/tp',
  claims: (text) => text.startsWith('/tp '),
  run(srv, eid, _player, text) {
    const [, xRaw, yRaw] = text.split(/\s+/);
    const x = Number.parseFloat(xRaw ?? '');
    const y = Number.parseFloat(yRaw ?? '');
    if (Number.isFinite(x) && Number.isFinite(y)) {
      // Land on the CENTER of the nearest walkable tile. A raw corner
      // teleport can overlap the player's radius into a solid
      // neighbor — an embedded body fails every movement candidate
      // and freezes in place with zero feedback.
      // /tp stays a SAME-PLANE teleport — the invoker's own world.
      const tpWorld = srv.worldAt(eid);
      const tx0 = Math.floor(x);
      const ty0 = Math.floor(y);
      outer: for (let r = 0; r <= 4; r++) {
        for (let dy = -r; dy <= r; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
            const tx = tx0 + dx;
            const ty = ty0 + dy;
            tpWorld.ensure(Math.floor(tx / CHUNK_SIZE), Math.floor(ty / CHUNK_SIZE));
            if (!tpWorld.isSolid(tx, ty)) {
              srv.teleport(eid, tx + 0.5, ty + 0.5);
              break outer;
            }
          }
        }
      }
    }
    return;
  },
};

const cmdMuseum: ChatCommand = {
  name: '/museum',
  claims: (text) => text === '/museum' || text.startsWith('/museum '),
  run(srv, eid, player, text) {
    // THE PROP MUSEUM: the review hall's one door. First call walks
    // you in at the entrance plinth; calling it from inside walks
    // you back to the exact spot you left (or home, if that world
    // has since been torn down — a rift never waits).
    const pos = srv.positions.get(eid);
    if (!pos) return;
    if (!srv.planes.get(MUSEUM_PLANE_ID)) {
      player.session?.sendJson({ t: 'chat', channel: 'system', text: 'The museum does not stand on this server.' });
      return;
    }
    if (pos.plane === MUSEUM_PLANE_ID) {
      const saved = srv.museumReturn.get(eid);
      const back = saved && srv.planes.get(saved.plane) ? saved : srv.planes.worldSpawn;
      srv.museumReturn.delete(eid);
      srv.transferPlane(eid, back.plane, back.x, back.y);
    } else {
      const entry = srv.planes.spawnOf('museum');
      if (!entry) return;
      srv.museumReturn.set(eid, { plane: pos.plane, x: pos.x, y: pos.y });
      srv.transferPlane(eid, entry.plane, entry.x, entry.y);
      player.session?.sendJson({
        t: 'chat',
        channel: 'system',
        text: 'The Prop Museum — walk the wings north to south; /museum returns you.',
      });
    }
    return;
  },
};

const cmdSettile: ChatCommand = {
  name: '/settile',
  claims: (text) => text.startsWith('/settile '),
  run(srv, eid, player, text) {
    // Rig fixture brush: /settile <tileId> <w> <h> [gapX gapY] fills
    // a rectangle of tiles south-east of the player through the one
    // setWorldTile door (patches stream like any build). Gaps carve
    // walkable lanes so dense prop fields stay traversable.
    const [, idRaw, wRaw, hRaw, gxRaw, gyRaw] = text.split(/\s+/);
    const tile = Number.parseInt(idRaw ?? '', 10);
    const w = Math.min(64, Number.parseInt(wRaw ?? '1', 10) || 1);
    const h = Math.min(64, Number.parseInt(hRaw ?? '1', 10) || 1);
    const gapX = Number.parseInt(gxRaw ?? '0', 10) || 0;
    const gapY = Number.parseInt(gyRaw ?? '0', 10) || 0;
    const pos = srv.positions.get(eid);
    if (pos && Number.isFinite(tile)) {
      const tx0 = Math.floor(pos.x) + 2;
      const ty0 = Math.floor(pos.y) + 2;
      let n = 0;
      for (let dy = 0; dy < h; dy++) {
        if (gapY > 0 && dy % (gapY + 1) === gapY) continue;
        for (let dx = 0; dx < w; dx++) {
          if (gapX > 0 && dx % (gapX + 1) === gapX) continue;
          srv.worldOf(pos.plane).ensure(
            Math.floor((tx0 + dx) / CHUNK_SIZE),
            Math.floor((ty0 + dy) / CHUNK_SIZE),
          );
          srv.setWorldTile(pos.plane, tx0 + dx, ty0 + dy, tile as Tile);
          n++;
        }
      }
      player.session?.sendJson({
        t: 'chat',
        channel: 'system',
        text: `Set ${n} tiles of ${tile} at ${tx0},${ty0}.`,
      });
    }
    return;
  },
};

const cmdTime: ChatCommand = {
  name: '/time',
  claims: (text) => text.startsWith('/time'),
  run(srv, _eid, player, text) {
    const arg = text.split(/\s+/)[1] ?? '';
    const target = TIME_NAMES[arg] ?? Number.parseFloat(arg);
    if (Number.isFinite(target) && target >= 0 && target < 24) {
      srv.timeOfsTicks += ofsForHours(srv.tickCount + srv.timeOfsTicks, target);
      for (const s of srv.sessions) s.sendJson({ t: 'time', ofs: srv.timeOfsTicks });
      const now = clockHoursAtTick(srv.tickCount, srv.timeOfsTicks);
      const hh = Math.floor(now);
      const mm = Math.floor((now - hh) * 60);
      srv.systemChatAll(`Time set: ${hh}:${String(mm).padStart(2, '0')}`);
    } else {
      const names = Object.keys(TIME_NAMES).join(', ');
      player.session?.sendJson({ t: 'chat', channel: 'system', text: `/time <0-24 | ${names}>` });
    }
    return;
  },
};

const cmdXp: ChatCommand = {
  name: '/xp',
  claims: (text) => text.startsWith('/xp '),
  run(srv, eid, player, text) {
    const [, skillRaw, amountRaw] = text.split(/\s+/);
    const amount = Math.max(1, Math.min(10_000_000, Number.parseInt(amountRaw ?? '0', 10) || 0));
    if (skillRaw && isSkillId(skillRaw) && amount > 0) {
      srv.grantXp(eid, player, skillRaw, amount);
      player.session?.sendJson({ t: 'chat', channel: 'system', text: `+${amount} ${skillRaw} xp` });
    } else {
      player.session?.sendJson({ t: 'chat', channel: 'system', text: '/xp <skill> <amount>' });
    }
    return;
  },
};

const cmdGrow: ChatCommand = {
  name: '/grow',
  claims: (text) => text === '/grow' || text.startsWith('/grow '),
  run(srv, eid, player, text) {
    const pos = srv.positions.get(eid);
    const now = Date.now();
    let grown = 0;
    for (const state of srv.crops.values()) {
      if (pos && Math.hypot(state.tx + 0.5 - pos.x, state.ty + 0.5 - pos.y) > 20) continue;
      const remaining = growMs(state.def) - srv.cropElapsed(state, now);
      if (remaining <= 0) continue;
      state.boostMs += remaining;
      srv.saveCrop(state);
      grown++;
    }
    // THE LIVING SOIL: the same lever hurries a working compost
    // batch to done (dev worlds cannot wait half an hour on a heap).
    let turned = 0;
    for (const bin of srv.farmBins.values()) {
      if (pos && Math.hypot(bin.tx + 0.5 - pos.x, bin.ty + 0.5 - pos.y) > 20) continue;
      if (bin.startedAt === 0 || now >= bin.startedAt + COMPOST_MINUTES * 60_000) continue;
      bin.startedAt = now - COMPOST_MINUTES * 60_000;
      srv.accounts.upsertFarmBin(bin.tx, bin.ty, bin.fill, bin.graded, bin.startedAt);
      srv.mirrorBin(bin);
      turned++;
    }
    // THE ANIMALS OF THE YARD: and hurries every nearby udder,
    // fleece, and snout to ready (same dev-world mercy).
    for (const [stockEid, comp] of srv.livestock) {
      const spos = srv.positions.get(stockEid);
      if (!spos || (pos && Math.hypot(spos.x - pos.x, spos.y - pos.y) > 20)) continue;
      const npc2 = srv.npcs.get(stockEid);
      if (!npc2 || now >= npc2.nextProduceAt) continue;
      npc2.nextProduceAt = now;
      comp.row.nextProduceAt = now;
      srv.accounts.saveLivestock(comp.row);
    }
    // THE WORKING YARD: and matures every nearby batch and hive.
    for (const job of srv.farmJobs.values()) {
      if (pos && Math.hypot(job.tx + 0.5 - pos.x, job.ty + 0.5 - pos.y) > 20) continue;
      const recipe = WORK_RECIPES.get(job.recipe);
      if (!recipe || job.qty <= 0) continue;
      job.startedAt = now - recipe.minutes * 60_000 * job.qty;
      srv.accounts.upsertStationJob(job.tx, job.ty, job.recipe, job.qty, job.startedAt, job.grade, job.owner);
      srv.mirrorJob(job);
    }
    for (const hive of srv.farmApiaries.values()) {
      if (pos && Math.hypot(hive.tx + 0.5 - pos.x, hive.ty + 0.5 - pos.y) > 20) continue;
      hive.since = now - APIARY_MINUTES * 60_000 * APIARY_STORE_CAP;
      srv.accounts.upsertFarmApiary(hive.tx, hive.ty, hive.since);
      srv.mirrorApiary(hive.tx, hive.ty, hive.since);
    }
    srv.tickCrops(now);
    player.session?.sendJson({
      t: 'chat',
      channel: 'system',
      text: `Ripened ${grown} crops${turned > 0 ? `, hurried ${turned} bins` : ''}.`,
    });
    return;
  },
};

const cmdClearfarm: ChatCommand = {
  name: '/clearfarm',
  claims: (text) => text === '/clearfarm' || text.startsWith('/clearfarm '),
  run(srv, eid, player, text) {
    // THE PROVING GROUND: level a radius to bare grass — crops,
    // bins, troughs, and built tiles all cleared. Dev worlds only;
    // the harness stages on virgin ground instead of playing the
    // terrain lottery (10-minute suites died of that lottery).
    const pos = srv.positions.get(eid);
    if (!pos) return;
    const r = Math.min(16, Math.max(2, Number(text.split(/\s+/)[1]) || 8));
    const cx = Math.floor(pos.x);
    const cy = Math.floor(pos.y);
    let cleared = 0;
    for (let ty = cy - r; ty <= cy + r; ty++) {
      for (let tx = cx - r; tx <= cx + r; tx++) {
        const key = `${tx},${ty}`;
        if (srv.crops.has(key)) {
          srv.crops.delete(key);
          srv.accounts.deleteCrop(tx, ty);
          srv.surface.unregisterCropTile(tx, ty);
          for (const s of srv.sessions) s.sendJson({ t: 'farm', remove: [{ tx, ty }] });
        }
        if (srv.farmBins.has(key)) {
          srv.farmBins.delete(key);
          srv.accounts.deleteFarmBin(tx, ty);
          srv.mirrorBin({ tx, ty, fill: 0, graded: 0, startedAt: 0 });
        }
        if (srv.farmTroughs.has(key)) {
          srv.farmTroughs.delete(key);
          srv.accounts.deleteFarmTrough(tx, ty);
          srv.mirrorTrough({ tx, ty, feed: 0 });
        }
        if (srv.worldOf(pos.plane).builtAt(tx, ty)) {
          srv.worldOf(pos.plane).unregisterBuilt(tx, ty);
          srv.accounts.deleteBuiltTile(pos.plane, tx, ty);
          srv.ringCache = null;
  srv.capitalCache?.clear();
        }
        const g = srv.worldOf(pos.plane).groundAt(tx, ty);
        if (g !== undefined && g !== Tile.Grass) {
          srv.setWorldTile(pos.plane, tx, ty, Tile.Grass);
          cleared++;
        }
      }
    }
    player.session?.sendJson({
      t: 'chat',
      channel: 'system',
      text: `Cleared ${cleared} tiles to grass (r=${r}).`,
    });
    return;
  },
};

const cmdProc: ChatCommand = {
  name: '/proc',
  claims: (text) => text.startsWith('/proc'),
  run(srv, eid, player, text) {
    // /proc <action> [element] — wake a working on the spot.
    //
    // THE DEEPER SIGIL ships its engine before its roster, so this is
    // how the whole path (action → fx → floaty → sound) is exercised
    // in a real session while enchants.ts still carries no procs. It
    // fires runProc DIRECTLY, so it deliberately proves nothing about
    // triggers, rest timers, or meters — those are pinned by tests.
    const [, actionRaw, elemRaw] = text.split(/\s+/);
    const pos = srv.positions.get(eid);
    const action = actionRaw ? DEV_PROC_ACTIONS[actionRaw] : undefined;
    if (!pos || !action) {
      player.session?.sendJson({
        t: 'chat',
        channel: 'system',
        text: `Workings: ${Object.keys(DEV_PROC_ACTIONS).join(', ')}`,
      });
      return;
    }
    const element = (elemRaw && elemRaw in ELEMENT_COLORS ? elemRaw : 'arcane') as ArxElement;
    const target = srv.npcsWithin(pos.plane, pos.x, pos.y, 8)[0];
    const tp = target !== undefined ? srv.positions.get(target) : undefined;
    srv.runProc(
      eid,
      player,
      {
        kind: 'proc',
        id: `dev_${actionRaw}`,
        name: 'Dev Working',
        trigger: { on: 'crit' },
        action,
        icd: 20,
        element,
      },
      { x: tp?.x ?? pos.x, y: tp?.y ?? pos.y, targetEid: target, style: 'arx' },
    );
    return;
  },
};

const cmdCalling: ChatCommand = {
  name: '/calling',
  claims: (text) => text.startsWith('/calling'),
  run(srv, eid, player, text) {
    // /calling <id> [off] — answer (or set down) a Calling IGNORING
    // the unlock and the budget, session-only: nothing is persisted,
    // and sanitizeCallings reclaims any over-held answer at the next
    // login. The rig's hand for walking the package engine — the
    // proc lane, the meters, the folds — without leveling a hand to
    // its seat first. The real toggle path (setCalling) keeps the
    // law; this lever deliberately steps past it, like /proc steps
    // past the triggers.
    const [, id, offRaw] = text.split(/\s+/);
    const def = id ? callingDef(id) : undefined;
    if (!def) {
      player.session?.sendJson({
        t: 'chat',
        channel: 'system',
        text: `Callings: ${[...CALLINGS.keys()].join(', ')}`,
      });
      return;
    }
    // /calling <id> [off | <rank 1..4>]
    const on = offRaw !== 'off';
    const devRank = Math.max(1, Math.min(CALLING_MAX_RANK, Number(offRaw) || 1));
    if (on) player.callings.set(def.id, devRank);
    else player.callings.delete(def.id);
    srv.recomputeGear(eid, player);
    player.session?.sendJson(srv.callingsMessage(player));
    srv.sendCooldowns(player);
    srv.sendCharges(player);
    player.session?.sendJson({
      t: 'chat',
      channel: 'system',
      text: on
        ? `${def.name} answers at Rank ${RANK_ROMAN[devRank]} (dev, unpersisted).`
        : `${def.name} set down (dev).`,
    });
    return;
  },
};

const cmdStatus: ChatCommand = {
  name: '/status',
  claims: (text) => text.startsWith('/status'),
  run(srv, eid, player, text) {
    // /status <id> [power] [durTicks] — lay a status on the nearest
    // foe (or on yourself when nothing stands near).
    //
    // THE TWO LANES ships sunder and coexistence ahead of their
    // sources, so this is how the lanes are walked in a live
    // session: stack venom from two hands, land a spark on a
    // wounded body and watch the wound ride through the flash. It
    // calls the real apply doors, so resists/weaknesses and the
    // reaction law all answer honestly; the lane laws themselves
    // are pinned by statusLanes.test.ts.
    const [, idRaw, powRaw, durRaw] = text.split(/\s+/);
    const pos = srv.positions.get(eid);
    const id = STATUS_IDS.find((s) => s === idRaw);
    if (!pos || !id) {
      player.session?.sendJson({
        t: 'chat',
        channel: 'system',
        text: `Statuses: ${STATUS_IDS.join(', ')}`,
      });
      return;
    }
    const power = Math.max(0, Number(powRaw) || 3);
    const durationTicks = Math.max(1, Number(durRaw) || 200);
    const target = srv.npcsWithin(pos.plane, pos.x, pos.y, 8)[0];
    if (target !== undefined) {
      // The lay door on purpose: the rig can prove THE ANSWERED
      // ECHO end to end with /calling + /status alone.
      srv.layStatusOnNpc(target, { status: id, power, durationTicks }, eid, 'arx');
    } else {
      srv.applyStatusToPlayer(eid, { status: id, power, durationTicks }, eid);
    }
    return;
  },
};

const cmdMount: ChatCommand = {
  name: '/mount',
  claims: (text) => text.startsWith('/mount'),
  run(srv, eid, player, text) {
    // /mount            — list mounts and what's owned
    // /mount <id>       — grant + choose + saddle up (the dev whistle)
    // /mount off        — boots on the ground
    const [, arg] = text.split(/\s+/);
    const pos = srv.positions.get(eid);
    if (!arg) {
      const rows = MOUNTS.map(
        (m) => `${player.mountsOwned.has(m.id) ? '●' : '○'} ${m.id} (${m.speedMult}×)`,
      );
      player.session?.sendJson({
        t: 'chat',
        channel: 'system',
        text: `Mounts: ${rows.join(', ')}${player.mountId ? ` — riding ${player.mountId}` : ''}`,
      });
      return;
    }
    if (arg === 'off') {
      srv.dismount(eid, player);
      return;
    }
    const def = mountDef(arg);
    if (!def || !pos) {
      player.session?.sendJson({ t: 'chat', channel: 'system', text: `No mount '${arg}'.` });
      return;
    }
    player.mountsOwned.add(def.id);
    player.mountChosen = def.id;
    srv.rideDirty.add(player); // owned set changed — the mirror must speak
    srv.dismount(eid, player); // switching beasts steps down first
    srv.mountToggle(eid, player, pos);
    return;
  },
};

const cmdTame: ChatCommand = {
  name: '/tame',
  claims: (text) => text.startsWith('/tame'),
  run(srv, eid, player, text) {
    // /tame               — list the tame roster and the household
    // /tame <species>     — grant a companion at heel (skips the gentling)
    // /tame drop <slot>   — release a stall (the stable door owns the real ceremony)
    // /tame heel <slot>   — the stable door's swap, penless (staging lever)
    const [, arg, arg2] = text.split(/\s+/);
    const say = (t: string) => player.session?.sendJson({ t: 'chat', channel: 'system', text: t });
    if (!arg) {
      const roster = [...TAMES.keys()].join(', ');
      const held = player.pets
        .map((p) => `${p.slot}:${p.name} (${p.species}, ${p.state})`)
        .join(', ');
      say(`Tames: ${roster}. Stalls: ${held || 'empty'}.`);
      return;
    }
    if (arg === 'heel') {
      const slot = Number.parseInt(arg2 ?? '', 10);
      const row2 = player.pets.find((p) => p.slot === slot);
      if (!row2) {
        say(`No companion in stall ${arg2}.`);
        return;
      }
      const prevHeel = player.pets.find((p) => p.state === 'heel');
      if (prevHeel && prevHeel !== row2) {
        prevHeel.state = 'stabled';
        if (player.characterId > 0) srv.accounts.savePetState(player.characterId, prevHeel.slot, 'stabled');
        srv.despawnPetEntity(player);
      }
      row2.state = 'heel';
      row2.restedAt = null;
      if (player.characterId > 0) srv.accounts.savePetRest(player.characterId, row2.slot, 'heel', null);
      player.petHp = null;
      srv.trySpawnPet(eid, player);
      srv.sendPet(player);
      say(`${row2.name} comes to your side.`);
      return;
    }
    if (arg === 'drop') {
      const slot = Number.parseInt(arg2 ?? '', 10);
      const idx = player.pets.findIndex((p) => p.slot === slot);
      if (idx < 0) {
        say(`No companion in stall ${arg2}.`);
        return;
      }
      const [row] = player.pets.splice(idx, 1);
      if (row!.state === 'heel') {
        srv.despawnPetEntity(player);
        player.petHp = null; // the heel row's hp goes with it
      }
      if (player.characterId > 0) srv.accounts.deletePet(player.characterId, row!.slot);
      say(`${row!.name} returns to the wild.`);
      srv.sendPet(player);
      return;
    }
    const tame = tameDef(arg);
    if (!tame) {
      say(`No tame '${arg}'.`);
      return;
    }
    if (player.pets.length >= PET_CAP) {
      say('Your stalls are full. Three is a household.');
      return;
    }
    const used = new Set(player.pets.map((p) => p.slot));
    let slot = 0;
    while (used.has(slot)) slot++;
    const prev = player.pets.find((p) => p.state === 'heel');
    if (prev) {
      prev.state = 'stabled';
      if (player.characterId > 0) srv.accounts.savePetState(player.characterId, prev.slot, 'stabled');
      srv.despawnPetEntity(player);
    }
    const tamedAt = Date.now();
    const row: PetRow = {
      slot,
      species: tame.species,
      name: NPCS.get(tame.species)?.name ?? tame.species,
      xp: 0,
      state: 'heel',
      restedAt: null,
      bondXp: 0,
      arts: [],
      tamedAt,
      tamedLevel: levelForXp(player.skills.beastcraft ?? 0),
      kills: 0,
      downs: 0,
      // No wild body stood for the dev whistle: roll the coat once.
      lookSeed: (Math.random() * 0x7fffffff) | 0,
    };
    player.pets.push(row);
    if (player.characterId > 0) srv.accounts.savePet(player.characterId, row, tamedAt);
    player.petHp = null;
    player.petBondAt.delete(slot);
    srv.trySpawnPet(eid, player);
    // Ceremony on purpose: the dev whistle exercises the naming card.
    srv.sendPet(player, slot);
    return;
  },
};

const cmdCompany: ChatCommand = {
  name: '/company',
  claims: (text) => text.startsWith('/company'),
  run(srv, eid, player, text) {
    // THE COMPANY YOU KEEP's staging lever:
    // /company                — list the roster and the kept company
    // /company <species>      — befriend at heel (skips the treat)
    // /company heel <slot>    — call a kept friend out (the real op)
    // /company home <slot>    — send the heel friend home (the real op)
    // /company part <slot>    — the goodbye (the real op)
    const [, arg, arg2] = text.split(/\s+/);
    const say = (t: string) => player.session?.sendJson({ t: 'chat', channel: 'system', text: t });
    if (!arg) {
      const roster = [...COMPANIONS.keys()].join(', ');
      const held = player.companions
        .map((c) => `${c.slot}:${c.name} (${c.species}, ${c.state})`)
        .join(', ');
      say(`Company: ${roster}. Kept: ${held || 'none'}.`);
      return;
    }
    if (arg === 'heel' || arg === 'home' || arg === 'part') {
      // The real door, refusals and all — the /petarts precedent.
      srv.companionOp(eid, arg, Number.parseInt(arg2 ?? '', 10));
      return;
    }
    const cdef = companionDef(arg);
    if (!cdef) {
      say(`No companion '${arg}'.`);
      return;
    }
    if (player.companions.length >= COMPANION_CAP) {
      say('Your company is full.');
      return;
    }
    let slot = 0;
    while (player.companions.some((c) => c.slot === slot)) slot++;
    const current = player.companions.find((c) => c.state === 'heel');
    if (current) {
      srv.despawnCompanionEntity(player);
      current.state = 'home';
      if (player.characterId > 0) srv.accounts.saveCompanionState(player.characterId, current.slot, 'home');
    }
    const row: CompanionRow = {
      slot,
      species: cdef.species,
      name: NPCS.get(cdef.species)?.name ?? cdef.species,
      state: 'heel',
      // No wild body stood for the dev whistle: roll the coat once.
      lookSeed: (Math.random() * 0x7fffffff) | 0,
      metAt: Date.now(),
    };
    player.companions.push(row);
    if (player.characterId > 0) srv.accounts.saveCompanion(player.characterId, row);
    srv.trySpawnCompanion(eid, player);
    // Ceremony on purpose: the dev whistle exercises the naming card.
    srv.sendCompanions(player, slot);
    return;
  },
};

const cmdPetbond: ChatCommand = {
  name: '/petbond',
  claims: (text) => text.startsWith('/petbond'),
  run(srv, _eid, player, text) {
    // The rope lever: '/petbond <slot> <amount>' — walks the bond
    // through the REAL faucet door (grantPetBond), so rank
    // ceremonies and focus growth are exercised, never bypassed.
    // The /xp precedent: a dev lever raises the ledger, the laws
    // still do all the talking.
    const parts = text.split(/\s+/).slice(1);
    const slot = Number(parts[0] ?? '0');
    const amount = Math.max(0, Math.min(100000, Number(parts[1] ?? '0')));
    const row = player.pets.find((p) => p.slot === slot);
    if (!row) {
      player.session?.sendJson({ t: 'chat', channel: 'system', text: 'No companion keeps that stall.' });
      return;
    }
    srv.grantPetBond(player, row, amount);
    srv.sendPet(player);
    return;
  },
};

const cmdPetarts: ChatCommand = {
  name: '/petarts',
  claims: (text) => text.startsWith('/petarts'),
  run(srv, eid, _player, text) {
    // The collar lever: '/petarts <slot> [id id id]' — the real op,
    // refusals and all, so the harness proves the same door players
    // use. No ids = an empty loadout (yesterday's wolf).
    const parts = text.split(/\s+/).slice(1);
    const slot = Number(parts[0] ?? '0');
    srv.petArtsOp(eid, slot, parts.slice(1));
    return;
  },
};

const cmdPetstate: ChatCommand = {
  name: '/petstate',
  claims: (text) => text.startsWith('/petstate'),
  run(srv, eid, player, text) {
    // The companion lens: household rows + the live body's truth.
    const say = (t: string) => player.session?.sendJson({ t: 'chat', channel: 'system', text: t });
    const pos2 = srv.positions.get(eid);
    const rows = player.pets.map((p) => {
      const live = player.petEid !== null && srv.pets.get(player.petEid)?.slot === p.slot;
      const ppos = live ? srv.positions.get(player.petEid!) : null;
      const hp = live ? srv.healths.get(player.petEid!) : null;
      const comp = live ? srv.pets.get(player.petEid!) : null;
      const d = ppos && pos2 ? Math.hypot(ppos.x - pos2.x, ppos.y - pos2.y).toFixed(1) : null;
      const downLeft =
        comp && comp.downedUntil > srv.tickCount ? ` down=${comp.downedUntil - srv.tickCount}t` : '';
      const restLeft =
        p.state === 'resting' && p.restedAt !== null
          ? ` rest=${Math.max(0, Math.ceil((p.restedAt + PET_REST_HOME_MS - Date.now()) / 1000))}s`
          : '';
      // THE KEEPER'S TONGUE: live surge/guard windows, for the bench
      // and the proving harness both.
      const surgeLeft =
        comp?.surge && comp.surge.untilTick > srv.tickCount
          ? ` surge=${comp.surge.untilTick - srv.tickCount}t x${comp.surge.dmgMult}${comp.surge.temper ? ' temper' : ''}`
          : '';
      const guardLeft =
        comp?.guard && comp.guard.untilTick > srv.tickCount
          ? ` guard=${comp.guard.untilTick - srv.tickCount}t +${comp.guard.armor}`
          : '';
      const bcNow = levelForXp(player.skills.beastcraft ?? 0);
      const lvlNow = petLevelFor(p.xp, NPCS.get(p.species)?.level ?? 1, bcNow);
      const spent = p.arts.reduce((s, id) => s + (petArtDef(id)?.focus ?? 0), 0);
      return (
        `${p.slot}: ${p.name} (${p.species}) ${p.state}${restLeft}` +
        (live
          ? ` LIVE d=${d} hp=${hp?.hp}/${hp?.maxHp} tgt=${comp?.target ?? '-'}${downLeft}${surgeLeft}${guardLeft}`
          : '') +
        ` xp=${p.xp} bond=${p.bondXp}(${petBondRank(p.bondXp)}) focus=${spent}/${petFocusMax(lvlNow, petBondRank(p.bondXp))}` +
        ` arts=[${p.arts.join(',')}] kills=${p.kills} downs=${p.downs}`
      );
    });
    say(rows.length > 0 ? rows.join(' | ') + ` calm=${player.petCalmTicks}` : 'No companions.');
    return;
  },
};

const cmdGive: ChatCommand = {
  name: '/give',
  claims: (text) => text.startsWith('/give '),
  run(srv, _eid, player, text) {
    // /give <item> [qty] [rarity] [power] [enchant] — gear/trinkets
    // mint a fresh roll at the requested tier, item power, and
    // enchant. The Playwright lever.
    const [, item, qtyRaw, rarRaw, pwrRaw, enchRaw] = text.split(/\s+/);
    const def = itemDef(item ?? '');
    const qty = Math.max(1, Math.min(1000, Number.parseInt(qtyRaw ?? '1', 10) || 1));
    const rar = isRarityTier(rarRaw ?? '') ? (rarRaw as ItemRoll['rar']) : undefined;
    const pwrParsed = Number.parseInt(pwrRaw ?? '', 10);
    const pwr =
      Number.isInteger(pwrParsed) && pwrParsed >= 1 && pwrParsed <= MAX_ITEM_POWER
        ? pwrParsed
        : undefined;
    const ench = enchantDef(enchRaw)?.id;
    if (def && (def.dungeonKey || hasSpaceFor(player.inventory, def.id))) {
      if (def.dungeonKey) {
        // Keys land on the ring with a REAL minted roll each — the
        // seed-0 roll-less twin defect is dead.
        const tier = rar ?? 'common';
        for (let i = 0; i < qty; i++) {
          const seed = Math.floor(Math.random() * 0x100000000) >>> 0;
          srv.addKeyToRing(
            player,
            { rar: tier, seed, pwr: pwr ?? mintKeyPower(tier, seed), uses: keyUsesForTier(tier) },
            false,
          );
        }
        srv.sendKeyRing(player);
      } else if (def.gear || def.relic || def.sigil) {
        for (let i = 0; i < qty; i++) {
          const roll = makeRoll(rar ?? 'common');
          roll.pwr = pwr;
          roll.ench = ench;
          addItem(player.inventory, def.id, 1, roll);
        }
      } else {
        addItem(player.inventory, def.id, qty);
      }
      player.session?.sendJson({ t: 'inv', slots: player.inventory });
      player.session?.sendJson({
        t: 'chat',
        channel: 'system',
        text: `Given: ${def.name} ×${qty}${rar ? ` (${rar})` : ''}${pwr ? ` [power ${pwr}]` : ''}`,
      });
    } else {
      player.session?.sendJson({ t: 'chat', channel: 'system', text: `Can't give '${item}'.` });
    }
    return;
  },
};

const cmdHang: ChatCommand = {
  name: '/hang',
  claims: (text) => text.startsWith('/hang'),
  run(srv, eid, player, text) {
    // /hang <what> [tx ty] — THE SECOND LAYER's Playwright lever,
    // driving the REAL hang lane (register + persist + patch).
    // <what> = a raw detail id, or kind[:variant]: banner:3,
    // pennant:0, sign:2, trellis:1, basket, tapestry, crown, moon.
    // Default target: the tile one north (stand before the wall).
    const [, whatRaw, txRaw, tyRaw] = text.split(/\s+/);
    const pos = srv.positions.get(eid);
    if (!pos) return;
    const tx = Number.isInteger(Number.parseInt(txRaw ?? '', 10))
      ? Number.parseInt(txRaw!, 10)
      : Math.floor(pos.x);
    const ty = Number.isInteger(Number.parseInt(tyRaw ?? '', 10))
      ? Number.parseInt(tyRaw!, 10)
      : Math.floor(pos.y) - 1;
    const [kind, variantRaw] = (whatRaw ?? '').split(':');
    const variant = Number.parseInt(variantRaw ?? '0', 10) || 0;
    let detail = Number.parseInt(kind ?? '', 10);
    if (!Number.isInteger(detail)) {
      try {
        detail =
          kind === 'banner'
            ? wallBannerDetail(variant)
            : kind === 'pennant'
              ? pennantDetail(variant)
              : kind === 'sign'
                ? bracketSignDetail(variant)
                : kind === 'trellis'
                  ? trellisDetail(variant)
                  : kind === 'basket'
                    ? Detail.WallBasket
                    : kind === 'tapestry'
                      ? Detail.Tapestry
                      : kind === 'crown'
                        ? Detail.BannerCrown
                        : kind === 'moon'
                          ? Detail.BannerMoon
                          : -1;
      } catch {
        detail = -1;
      }
    }
    if (wallHungInfo(detail) === null) {
      player.session?.sendJson({ t: 'chat', channel: 'system', text: `Can't hang '${whatRaw}'.` });
      return;
    }
    if (srv.hangDetail(eid, tx, ty, detail)) {
      player.session?.sendJson({
        t: 'chat',
        channel: 'system',
        text: `Hung detail ${detail} at ${tx},${ty}.`,
      });
    }
    return;
  },
};

const cmdUnhang: ChatCommand = {
  name: '/unhang',
  claims: (text) => text.startsWith('/unhang'),
  run(srv, eid, player, text) {
    // /unhang [tx ty] — take your own hanging down through the real
    // removal lane; the face's prior detail returns.
    const [, txRaw, tyRaw] = text.split(/\s+/);
    const pos = srv.positions.get(eid);
    if (!pos) return;
    const tx = Number.isInteger(Number.parseInt(txRaw ?? '', 10))
      ? Number.parseInt(txRaw!, 10)
      : Math.floor(pos.x);
    const ty = Number.isInteger(Number.parseInt(tyRaw ?? '', 10))
      ? Number.parseInt(tyRaw!, 10)
      : Math.floor(pos.y) - 1;
    if (srv.removeHanging(eid, tx, ty)) {
      player.session?.sendJson({
        t: 'chat',
        channel: 'system',
        text: `Taken down at ${tx},${ty}.`,
      });
    }
    return;
  },
};

const cmdSpawnmob: ChatCommand = {
  name: '/spawnmob',
  claims: (text) => text.startsWith('/spawnmob'),
  run(srv, eid, player, text) {
    // /spawnmob <npcId> [count] — ephemeral mobs (no respawn) beside
    // the caller. The staging lever: line up the whole bestiary.
    const [, id, countRaw] = text.split(/\s+/);
    const def = id ? NPCS.get(id) : undefined;
    if (!def) {
      const ids = [...NPCS.keys()].join(', ');
      player.session?.sendJson({ t: 'chat', channel: 'system', text: `/spawnmob <id> [count] — ${ids}` });
      return;
    }
    const count = Math.max(1, Math.min(8, Number.parseInt(countRaw ?? '1', 10) || 1));
    const pos = srv.positions.get(eid);
    if (!pos) return;
    let placed = 0;
    for (let i = 0; i < count; i++) {
      let x = pos.x + 1.5;
      let y = pos.y;
      for (let tries = 0; tries < 10; tries++) {
        const a = Math.random() * Math.PI * 2;
        const r = 1.2 + Math.random() * 2.2;
        const tx = pos.x + Math.cos(a) * r;
        const ty = pos.y + Math.sin(a) * r;
        if (!srv.worldOf(pos.plane).isSolid(Math.floor(tx), Math.floor(ty))) {
          x = tx;
          y = ty;
          break;
        }
      }
      srv.spawnNpc(def, pos.plane, x, y, -1);
      placed++;
    }
    player.session?.sendJson({ t: 'chat', channel: 'system', text: `Spawned ${def.name} ×${placed}.` });
    return;
  },
};

const cmdForgecrown: ChatCommand = {
  name: '/forgecrown',
  claims: (text) => text.startsWith('/forgecrown'),
  run(srv, eid, player, text) {
    // /forgecrown <baseId> [seed] — THE WILD CROWN's staging lever:
    // forge a boss variant beside the caller, deterministic in the
    // seed (the proving lane's whole handle on the forge).
    const [, id, seedRaw] = text.split(/\s+/);
    const base = id ? NPCS.get(id) : undefined;
    const pool = id ? crownPoolFor(id) : null;
    if (!base || !base.kit || base.boss || !pool) {
      const ids = [...NPCS.keys()].filter((k) => crownPoolFor(k) && !NPCS.get(k)!.boss);
      player.session?.sendJson({
        t: 'chat',
        channel: 'system',
        text: `/forgecrown <base> [seed] — forgeable: ${ids.join(', ')}`,
      });
      return;
    }
    const seed = Number.parseInt(seedRaw ?? '', 10) || ((Math.random() * 0x7fffffff) | 0);
    const forged = forgeCrown(base, seed);
    const pos = srv.positions.get(eid);
    if (!pos) return;
    let x = pos.x + 1.5;
    let y = pos.y;
    for (let tries = 0; tries < 10; tries++) {
      const a = Math.random() * Math.PI * 2;
      const r = 1.5 + Math.random() * 2;
      const tx = pos.x + Math.cos(a) * r;
      const ty = pos.y + Math.sin(a) * r;
      if (!srv.worldOf(pos.plane).isSolid(Math.floor(tx), Math.floor(ty))) {
        x = tx;
        y = ty;
        break;
      }
    }
    srv.spawnNpc(forged, pos.plane, x, y, -1);
    player.session?.sendJson({
      t: 'chat',
      channel: 'system',
      text: `Forged ${forged.name} — ${forged.boss!.title} (seed ${seed}).`,
    });
    return;
  },
};

const cmdNpcstate: ChatCommand = {
  name: '/npcstate',
  claims: (text) => text.startsWith('/npcstate'),
  run(srv, eid, player, text) {
    // Nearby NPC combat brains, closest first — the aggro-debug lens.
    const pos = srv.positions.get(eid);
    if (!pos) return;
    const rows: string[] = [];
    for (const [nEid, npc] of srv.npcs) {
      const npos = srv.positions.get(nEid);
      if (!npos) continue;
      const d = Math.hypot(npos.x - pos.x, npos.y - pos.y);
      if (d > 20) continue;
      const hp = srv.healths.get(nEid);
      rows.push(
        `${npc.def.id}#${nEid} d=${d.toFixed(1)} ${npc.state} tgt=${npc.targetEid ?? '-'} ` +
        `hp=${hp?.hp}/${hp?.maxHp} alert=${Math.round(npc.alert)}@${npc.alertEid ?? '-'} ` +
        `sulk=${Math.max(0, npc.noAggroUntilTick - srv.tickCount)} ` +
        `helpEid=${npc.helpEid ?? '-'} called=${npc.helpCalled}`,
      );
    }
    rows.sort();
    const send = (t: string) =>
      player.session?.sendJson({ t: 'chat', channel: 'system', text: t });
    if (rows.length === 0) send('No NPCs within 20 tiles.');
    for (const r of rows.slice(0, 12)) send(r);
    return;
  },
};

const cmdSpawnnpc: ChatCommand = {
  name: '/spawnnpc',
  claims: (text) => text.startsWith('/spawnnpc'),
  run(srv, eid, player, text) {
    // /spawnnpc <slug> [routine] — ephemeral copy of a defined actor
    // beside the caller (no post, no respawn). The staging lever:
    // audit any actor's face, gear, and voice without walking to
    // their post. The optional routine id (band 9a, THE GROUND DOOR)
    // stands the body on its day exactly as a zone row would:
    // spawnActor resolves it, and an unknown id stands the body still
    // with the existing one-line warning.
    const [, slug, routine] = text.split(/\s+/);
    const actor = slug ? srv.actorDefs.get(slug) : undefined;
    if (!actor) {
      const ids = [...srv.actorDefs.keys()].join(', ');
      player.session?.sendJson({ t: 'chat', channel: 'system', text: `/spawnnpc <slug> [routine] — ${ids}` });
      return;
    }
    const pos = srv.positions.get(eid);
    if (!pos) return;
    let x = pos.x + 1.5;
    let y = pos.y;
    for (let tries = 0; tries < 10; tries++) {
      const a = Math.random() * Math.PI * 2;
      const r = 1.2 + Math.random() * 1.6;
      const tx = pos.x + Math.cos(a) * r;
      const ty = pos.y + Math.sin(a) * r;
      if (!srv.worldOf(pos.plane).isSolid(Math.floor(tx), Math.floor(ty))) {
        x = tx;
        y = ty;
        break;
      }
    }
    srv.spawnActor(actor, pos.plane, x, y, -1, undefined, routine);
    player.session?.sendJson({
      t: 'chat',
      channel: 'system',
      text: `Spawned ${actor.name}${routine ? ` (${routine})` : ''}.`,
    });
    return;
  },
};

const cmdDlgreload: ChatCommand = {
  name: '/dlgreload',
  claims: (text) => text.startsWith('/dlgreload'),
  run(srv, _eid, player, text) {
    if (!srv.dialogueSource) return;
    void srv.reloadDialogues()
      .then((fresh) => {
        const errs = fresh.errors.length > 0 ? `, ${fresh.errors.length} invalid` : '';
        player.session?.sendJson({
          t: 'chat',
          channel: 'system',
          text: `Dialogues reloaded: ${fresh.count}${errs}.`,
        });
      })
      .catch((err: Error) => console.error('[dlg]', err.message));
    return;
  },
};

const cmdRoutinereload: ChatCommand = {
  name: '/routinereload',
  claims: (text) => text.startsWith('/routinereload'),
  run(srv, _eid, player, text) {
    // /routinereload — swap in the DB's current routines, live.
    // Walking bodies re-resolve their schedule on the next tick.
    if (!srv.routineSource) return;
    void srv.routineSource()
      .then((fresh) => {
        srv.routineDefs.clear();
        srv.registerRoutines(fresh.routines);
        for (const [, rc] of srv.routines) {
          const def = srv.routineDefs.get(rc.def.id);
          if (def) {
            rc.def = def;
            rc.slot = -2; // force a fresh schedule resolve
          }
        }
        const errs = fresh.errors.length > 0 ? `, ${fresh.errors.length} invalid` : '';
        player.session?.sendJson({
          t: 'chat',
          channel: 'system',
          text: `Routines reloaded: ${fresh.routines.length}${errs}.`,
        });
      })
      .catch((err: Error) => console.error('[routine]', err.message));
    return;
  },
};

const cmdRoutines: ChatCommand = {
  name: '/routines',
  claims: (text) => text.startsWith('/routines'),
  run(srv, eid, player, text) {
    // /routines — where is everyone in their day right now?
    const hours = clockHoursAtTick(srv.tickCount, srv.timeOfsTicks);
    const hh = Math.floor(hours);
    const mm = Math.floor((hours - hh) * 60);
    const lines: string[] = [`Routines at ${hh}:${String(mm).padStart(2, '0')} —`];
    for (const [eid, rc] of srv.routines) {
      const actor = srv.actors.get(eid)?.actor;
      const pos = srv.positions.get(eid);
      const npc = srv.npcs.get(eid);
      const task = srv.routineTask(rc);
      const state =
        npc && npc.state !== 'idle'
          ? npc.state
          : srv.tickCount < rc.pauseUntilTick
            ? 'paused'
            : rc.phase;
      const where = pos ? ` @ ${pos.x.toFixed(1)},${pos.y.toFixed(1)}` : '';
      const leg = task.kind === 'path' ? ` wp${rc.wpIndex}` : '';
      lines.push(
        `${actor?.name ?? '?'}: ${rc.def.id} slot ${rc.slot} ${task.kind}${leg} ${state}${where}`,
      );
    }
    if (srv.routines.size === 0) lines.push('nobody keeps hours here');
    player.session?.sendJson({ t: 'chat', channel: 'system', text: lines.join('\n') });
    return;
  },
};

const cmdFlagreset: ChatCommand = {
  name: '/flagreset',
  claims: (text) => text.startsWith('/flagreset'),
  run(srv, _eid, player, text) {
    // /flagreset [prefix] — wipe story flags (optionally by prefix,
    // e.g. `/flagreset dlg:` replays every one-time conversation).
    const prefix = text.slice('/flagreset'.length).trim();
    let n = 0;
    for (const flag of [...player.flags.keys()]) {
      if (prefix && !flag.startsWith(prefix)) continue;
      player.flags.delete(flag);
      if (player.characterId > 0) srv.accounts.clearFlag(player.characterId, flag);
      n++;
    }
    player.session?.sendJson({
      t: 'chat',
      channel: 'system',
      text: `Cleared ${n} flag${n === 1 ? '' : 's'}.`,
    });
    return;
  },
};

const cmdFlag: ChatCommand = {
  name: '/flag',
  claims: (text) => text.startsWith('/flag'),
  run(srv, _eid, player, text) {
    // /flag — list; /flag <name> [value] — set; /flag <name> 0 — clear.
    const [, flag, valueRaw] = text.split(/\s+/);
    if (!flag) {
      const list = [...player.flags.keys()].sort().join(', ');
      player.session?.sendJson({
        t: 'chat',
        channel: 'system',
        text: player.flags.size === 0 ? 'No flags set.' : `Flags: ${list}`,
      });
      return;
    }
    if (valueRaw === '0') {
      player.flags.delete(flag);
      if (player.characterId > 0) srv.accounts.clearFlag(player.characterId, flag);
      player.session?.sendJson({ t: 'chat', channel: 'system', text: `Flag '${flag}' cleared.` });
    } else {
      srv.setPlayerFlag(player, flag, Number.parseInt(valueRaw ?? '1', 10) || 1);
      player.session?.sendJson({ t: 'chat', channel: 'system', text: `Flag '${flag}' set.` });
    }
    return;
  },
};

const cmdStanding: ChatCommand = {
  name: '/standing',
  claims: (text) => text.startsWith('/standing'),
  run(srv, _eid, player, text) {
    // /standing — list mine; /standing <faction> <value|band> — set;
    // /standing reset — wipe the ledger (memory + rows).
    const [, a, b] = text.split(/\s+/);
    const sys = (t: string) => player.session?.sendJson({ t: 'chat', channel: 'system', text: t });
    if (!a) {
      sys(
        srv.repWire(player)
          .map((s) => `${s.faction}: ${s.value} (${s.band})`)
          .join(' · '),
      );
      return;
    }
    if (a === 'reset') {
      player.standing.clear();
      if (player.characterId > 0) srv.accounts.deleteStandings(player.characterId);
      srv.pushRep(player);
      srv.pushQuestAvail(player);
      sys('Standing ledger wiped.');
      return;
    }
    const def = factionDef(a);
    if (!def || b === undefined) {
      sys(`Usage: /standing [<faction> <value|band>] [reset] — factions: ${FACTIONS.roster.map((f) => f.id).join(', ')}`);
      return;
    }
    const bandTargets: Record<string, number> = {
      hunted: FACTIONS.bands.hunted,
      outlaw: FACTIONS.bands.outlaw,
      suspect: FACTIONS.bands.suspect,
      neutral: 0,
      known: FACTIONS.bands.known,
      trusted: FACTIONS.bands.trusted,
      champion: FACTIONS.bands.champion,
    };
    const target = b in bandTargets ? bandTargets[b]! : Number(b);
    if (!Number.isFinite(target)) {
      sys(`'${b}' is neither a value nor a band.`);
      return;
    }
    // Route through the one door as a raw delta (no cross) so the
    // ceremony/persist/push rails all fire exactly as in real play.
    srv.creditStanding(player, a, target - (player.standing.get(a) ?? 0));
    sys(`${def.name}: ${player.standing.get(a) ?? 0} (${standingBand(player.standing.get(a) ?? 0)})`);
    return;
  },
};

const cmdDeed: ChatCommand = {
  name: '/deed',
  claims: (text) => text.startsWith('/deed'),
  run(srv, _eid, player, text) {
    // /deed <bountyHonored|tollBroken|assaultEnforcer|slayMember> <faction>
    const [, kind, fac] = text.split(/\s+/);
    const sys = (t: string) => player.session?.sendJson({ t: 'chat', channel: 'system', text: t });
    const kinds = ['bountyHonored', 'tollBroken', 'assaultEnforcer', 'slayMember'] as const;
    const k = kinds.find((x) => x === kind);
    if (!k || !fac || !factionDef(fac)) {
      sys(`Usage: /deed <${kinds.join('|')}> <faction>`);
      return;
    }
    srv.creditDeed(player, fac, k);
    return;
  },
};

const cmdQuest: ChatCommand = {
  name: '/quest',
  claims: (text) => text.startsWith('/quest'),
  run(srv, eid, player, text) {
    // /quest — list; /quest accept <id>; /quest complete <id> (fills
    // the current stage's event counters — collects still need the
    // items); /quest reset [id]; /quest reload (swap from the DB).
    const [, sub, arg] = text.split(/\s+/);
    const sys = (t: string) => player.session?.sendJson({ t: 'chat', channel: 'system', text: t });
    if (!sub) {
      const ctx = srv.questCtx(player);
      const lines: string[] = [];
      for (const def of srv.questDefs.values()) {
        const q = player.quests.get(def.id);
        const state = q
          ? q.status === 'active'
            ? questReady(def, q, ctx)
              ? 'READY'
              : `active s${q.stage} [${q.progress.join(',')}]`
            : `done ×${q.completions}`
          : questAvailable(def, ctx)
            ? 'available'
            : 'gated';
        lines.push(`${def.id}: ${state}`);
      }
      sys(lines.length === 0 ? 'No quests registered.' : lines.join(' · '));
      return;
    }
    if (sub === 'accept' && arg) {
      sys(srv.questAccept(eid, player, arg) ? `Accepted '${arg}'.` : `'${arg}' is not available.`);
      return;
    }
    if (sub === 'complete' && arg) {
      const def = srv.questDefs.get(arg);
      const q = player.quests.get(arg);
      if (!def || !q || q.status !== 'active') {
        sys(`'${arg}' is not active.`);
        return;
      }
      const stage = def.stages[q.stage];
      stage?.objectives.forEach((obj, i) => {
        if (obj.kind !== 'collect') q.progress[i] = obj.kind === 'kill' ? obj.count : 1;
      });
      advanceStages(def, q, srv.questCtx(player));
      srv.persistQuest(player, arg);
      srv.pushQuestWire(player, def, q);
      sys(`Filled '${arg}' to stage ${q.stage}.`);
      return;
    }
    if (sub === 'turnin' && arg) {
      sys(srv.questTurnIn(eid, player, arg) ? `Turned in '${arg}'.` : `'${arg}' is not ready.`);
      return;
    }
    if (sub === 'reset') {
      const ids = arg ? [arg] : [...player.quests.keys()];
      for (const id of ids) {
        player.quests.delete(id);
        srv.persistQuest(player, id);
        player.session?.sendJson({ t: 'questupd', remove: id });
      }
      srv.pushQuestAvail(player);
      srv.sendQuestsFull(player);
      sys(`Reset ${ids.length} quest(s).`);
      return;
    }
    if (sub === 'reload') {
      void srv
        .reloadQuests()
        .then((res) => {
          sys(`Quests reloaded: ${res.count}${res.errors.length ? ` (${res.errors.length} invalid)` : ''}.`);
          for (const p of srv.players.values()) srv.sendQuestsFull(p);
        })
        .catch((err: Error) => {
          // A rejected lever is a logged refusal, never an unhandled
          // rejection that takes the process with it.
          console.error('[quest reload]', err.message);
          sys(`Quest reload failed: ${err.message}`);
        });
      return;
    }
    sys('/quest — list · accept <id> · complete <id> · turnin <id> · reset [id] · reload');
    return;
  },
};

const cmdGivekey: ChatCommand = {
  name: '/givekey',
  claims: (text) => text.startsWith('/givekey'),
  run(srv, _eid, player, text) {
    // /givekey [tier] [power] [seed] — mint a dungeon key. The
    // staging lever for the whole dungeon system: any tier, any
    // power, or an exact seed to revisit a known layout.
    const [, tierRaw, powerRaw, seedRaw] = text.split(/\s+/);
    const tier = tierRaw ?? 'common';
    if (!isRarityTier(tier)) {
      player.session?.sendJson({
        t: 'chat',
        channel: 'system',
        text: `/givekey [${RARITY_TIERS.join('|')}] [power] [seed]`,
      });
      return;
    }
    const seed = seedRaw !== undefined
      ? (Number.parseInt(seedRaw, 10) >>> 0)
      : (Math.floor(Math.random() * 0x100000000) >>> 0);
    const powerNum = Number.parseInt(powerRaw ?? '', 10);
    const pwr = Number.isFinite(powerNum) && powerNum >= 1
      ? Math.min(99, powerNum)
      : mintKeyPower(tier, seed);
    // Minted straight onto the ring — keys never touch the pack.
    const roll: ItemRoll = { rar: tier, seed, pwr, uses: keyUsesForTier(tier) };
    srv.addKeyToRing(player, roll);
    const spec = dungeonSpecFromRoll(roll);
    player.session?.sendJson({
      t: 'chat',
      channel: 'system',
      text: `Key minted: ${spec.name} (${spec.sigil}) — ${tier}, power ${spec.power}.`,
    });
    return;
  },
};

const cmdDanger: ChatCommand = {
  name: '/danger',
  claims: (text) => text.startsWith('/danger'),
  run(srv, eid, player, text) {
    // /danger — the field readout at your feet: tier, cell, ledger.
    const pos = srv.positions.get(eid);
    if (!pos) return;
    if (pos.plane !== SURFACE_PLANE_ID) {
      player.session?.sendJson({
        t: 'chat',
        channel: 'system',
        text: 'The danger field is a surface law — there is no field down here.',
      });
      return;
    }
    const tx = Math.floor(pos.x);
    const ty = Math.floor(pos.y);
    const tier = srv.liveDangerTier(tx, ty);
    const cx = poiCellOf(tx);
    const cy = poiCellOf(ty);
    const row = srv.poiLedger.get(poiCellKey(cx, cy));
    const state =
      row === undefined ? 'undecided'
      : row.site === null ? `decided empty (epoch ${row.epoch})`
      : `${row.site.defId} at ${row.site.anchorX},${row.site.anchorY} (epoch ${row.epoch})`;
    player.session?.sendJson({
      t: 'chat',
      channel: 'system',
      text: `Danger tier ${tier} · cell ${cx},${cy} · ${state}.`,
    });
    return;
  },
};

const cmdStronghold: ChatCommand = {
  name: '/stronghold',
  claims: (text) => text.startsWith('/stronghold'),
  run(srv, eid, player, text) {
    // /stronghold — the nearest seats and their states.
    // /stronghold here <layout> — force-stand a layout at your feet.
    const [, sub, arg] = text.split(/\s+/);
    const pos = srv.positions.get(eid);
    if (!pos) return;
    const px = Math.floor(pos.x);
    const py = Math.floor(pos.y);
    const say = (t: string) =>
      player.session?.sendJson({ t: 'chat', channel: 'system', text: t });
    if (sub === 'here' && arg) {
      const layout = STRONGHOLD_DEFS.get(arg);
      const prefab = layout ? srv.poiPrefabs?.get(layout.prefab) : undefined;
      if (!layout || !prefab) {
        say(`No layout '${arg}' on the shelf.`);
        return;
      }
      const gx = Math.floor(px / 384);
      const gy = Math.floor(py / 384);
      const key = capitalKey(gx, gy);
      if (srv.strongholdLive.has(key)) {
        say(`Lattice cell ${key} already hosts a capital.`);
        return;
      }
      const tier = Math.max(3, srv.liveDangerTier(px, py));
      const forced: CapitalSeat = {
        gx,
        gy,
        x: px,
        y: py,
        rect: {
          x: px - Math.floor(prefab.width / 2),
          y: py - Math.floor(prefab.height / 2),
          w: prefab.width,
          h: prefab.height,
        },
        family: layout.family,
        tier,
        layoutId: layout.id,
      };
      srv.materializeCapital(forced, { exactLayout: true });
      say(`'${layout.id}' stands at ${px},${py} (tier ${tier}) — dev-forced.`);
      return;
    }
    if (sub === 'clear') {
      const gx = Math.floor(px / 384);
      const gy = Math.floor(py / 384);
      srv.retireCapital(capitalKey(gx, gy));
      say(`Capital at lattice ${gx},${gy} retired (ledger row kept).`);
      return;
    }
    if (sub === 'stage') {
      const gx = Math.floor(px / 384);
      const gy = Math.floor(py / 384);
      const row = srv.strongholdLedger.get(capitalKey(gx, gy));
      if (!row) {
        say('No capital ledger row in this lattice cell.');
        return;
      }
      row.stage = Math.max(0, Math.min(FRONTIER.stageMax, Number(arg ?? row.stage + 1) || 0));
      row.stageAt = Date.now();
      srv.saveStrongholdRow(gx, gy);
      srv.retireCapital(capitalKey(gx, gy));
      say(`Capital staged to ${row.stage} — it re-stands bolder on approach.`);
      return;
    }
    if (sub === 'ember') {
      const gx = Math.floor(px / 384);
      const gy = Math.floor(py / 384);
      const row = srv.strongholdLedger.get(capitalKey(gx, gy));
      if (!row) {
        say('No capital ledger row in this lattice cell.');
        return;
      }
      const min = Math.max(0.05, Number(arg ?? 1) || 1);
      row.clearedAt = Date.now();
      row.emberUntil = Date.now() + Math.round(min * 60_000);
      srv.saveStrongholdRow(gx, gy);
      const live = srv.strongholdLive.get(capitalKey(gx, gy));
      if (live) srv.standDownGarrison(live.spawnIdx);
      say(`Capital embered for ~${min}m — a staged wipe without the fight.`);
      return;
    }
    // Info: this lattice neighborhood's seats.
    const gx = Math.floor(px / 384);
    const gy = Math.floor(py / 384);
    const lines: string[] = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const seat = srv.cachedSeat(gx + dx, gy + dy);
        if (!seat) continue;
        const key = capitalKey(seat.gx, seat.gy);
        const row = srv.strongholdLedger.get(key);
        const bits = row?.wardsCleared ?? 0;
        let brokenWards = 0;
        for (let b = bits; b > 0; b >>= 1) brokenWards += b & 1;
        const now = Date.now();
        const state = row?.fallowUntil
          ? `fallow ${Math.round((row.fallowUntil - now) / 60_000)}m`
          : row?.emberUntil
            ? `ember ${Math.round((row.emberUntil - now) / 60_000)}m`
            : srv.strongholdLive.has(key)
              ? srv.strongholdGarrisonStands(key)
                ? (row?.stage ? `standing, stage ${row.stage}` : 'standing') +
                  (brokenWards > 0 ? `, ${brokenWards} ward(s) broken` : '')
                : 'broken'
              : row
                ? 'known, beyond the fog'
                : 'unfound';
        const d = Math.round(Math.hypot(seat.x - px, seat.y - py));
        lines.push(
          `${key}: ${seat.layoutId} t${seat.tier} at ${seat.x},${seat.y} (${d} tiles) · ${state}`,
        );
      }
    }
    say(
      lines.length > 0
        ? `Capitals in the marches: ${lines.join(' · ')}`
        : 'No country in this neighborhood keeps a capital.',
    );
    return;
  },
};

const cmdPoi: ChatCommand = {
  name: '/poi',
  claims: (text) => text.startsWith('/poi'),
  run(srv, eid, player, text) {
    // /poi info — this cell's state.
    // /poi here [archetype] — force-materialize the current cell.
    // /poi reroll — retire the cell and re-roll it at epoch+1.
    const [, sub, arg] = text.split(/\s+/);
    const pos = srv.positions.get(eid);
    if (!pos) return;
    const cx = poiCellOf(pos.x);
    const cy = poiCellOf(pos.y);
    const key = poiCellKey(cx, cy);
    const say = (t: string) =>
      player.session?.sendJson({ t: 'chat', channel: 'system', text: t });
    if (sub === 'here') {
      const live = srv.poiLive.get(key);
      if (live?.zoneId) {
        say(`Cell ${key} already hosts '${live.zoneId}' — /poi reroll to replace it.`);
        return;
      }
      if (srv.poiLedger.get(key)?.site) srv.fadePoiDiscoveries(key);
      srv.poiLive.delete(key);
      srv.poiLedger.delete(key);
      const site = srv.materializePoiCell(cx, cy, { force: arg ?? true, epoch: 0 });
      say(
        site
          ? `${site.defId} (${site.prefabId}) stands at ${site.anchorX},${site.anchorY}.`
          : arg !== undefined && !POI_DEFS.has(arg)
            ? `Unknown archetype '${arg}' — ${[...POI_DEFS.keys()].join(', ')}.`
            : 'No suitable ground in this cell (settled, water, or broken terrain).',
      );
      return;
    }
    if (sub === 'reroll') {
      const prior = srv.poiLedger.get(key);
      const epoch = (prior?.epoch ?? 0) + 1;
      if (prior?.site) srv.fadePoiDiscoveries(key);
      srv.retirePoiCell(key);
      srv.poiLedger.delete(key);
      const site = srv.materializePoiCell(cx, cy, { epoch });
      say(
        site
          ? `Epoch ${epoch}: ${site.defId} stands at ${site.anchorX},${site.anchorY}.`
          : `Epoch ${epoch}: the cell rolled empty.`,
      );
      return;
    }
    if (sub === 'fallow') {
      // /poi fallow [days] — run the epoch turn now. 0 = every
      // cleared cell turns immediately (the staging lever).
      const days = Number.parseFloat(arg ?? '');
      const cutoff = Date.now() - (Number.isFinite(days) && days >= 0 ? days : 7) * 86_400_000;
      const res = srv.fallowSweep(cutoff);
      say(
        res.turned === 0
          ? 'No cleared cells past the fallow cutoff.'
          : `Fallow turn: ${res.turned} cells re-rolled — ${res.rerolled} stand anew, ` +
            `${res.turned - res.rerolled} rolled empty. Walk near them to see.`,
      );
      return;
    }
    if (sub === 'havens') {
      // /poi havens — every lamp burning on the frontier.
      say(
        srv.poiHavens.size === 0
          ? 'No haven lamps burning.'
          : [...srv.poiHavens.entries()]
              .map(([k, a]) => `${k}: ${a.x},${a.y} r${a.safeR}`)
              .join(' · '),
      );
      return;
    }
    const row = srv.poiLedger.get(key);
    const live = srv.poiLive.get(key);
    say(
      `Cell ${key}: ` +
        (row === undefined ? 'undecided' :
          row.site === null ? `decided empty (epoch ${row.epoch})` :
          `${row.site.defId} (${row.site.prefabId}) tier ${row.site.tier} at ` +
          `${row.site.anchorX},${row.site.anchorY}, epoch ${row.epoch}`) +
        (row?.clearedAt ? ` · cleared ${Math.round((Date.now() - row.clearedAt) / 60000)}m ago` : '') +
        (live?.zoneId ? ' · standing' : '') +
        ' — /poi here [archetype] · /poi reroll · /poi fallow [days] · /poi havens · /frontier',
    );
    return;
  },
};

const cmdWilds: ChatCommand = {
  name: '/wilds',
  claims: (text) => text.startsWith('/wilds'),
  run(srv, eid, player, text) {
    // The ambience lens (lived-in-land Phase 1): what the wild
    // spawner owes and holds at your feet — the tier's body budget,
    // how much of it stands nearby, and the roster the clock and
    // biome would deal here right now.
    const pos = srv.positions.get(eid);
    if (!pos) return;
    const say = (t: string) =>
      player.session?.sendJson({ t: 'chat', channel: 'system', text: t });
    if (pos.plane !== SURFACE_PLANE_ID) {
      say('The danger field is a surface law — there is no wild ambience down here.');
      return;
    }
    const tier = srv.liveDangerTier(Math.floor(pos.x), Math.floor(pos.y));
    const law = dangerLaw(tier);
    const budget = tier > 0 ? Math.round(FRONTIER.wildBudgetBase * law.wildDensity) : 0;
    let near = 0;
    for (const weid of srv.wildBodies.keys()) {
      const wpos = srv.positions.get(weid);
      if (wpos && Math.hypot(wpos.x - pos.x, wpos.y - pos.y) <= WILD_MAX_R + 24) {
        near++;
      }
    }
    const hours = clockHoursAtTick(srv.tickCount, srv.timeOfsTicks);
    const biome = groundProbeAt(config.worldSeed, Math.floor(pos.x), Math.floor(pos.y));
    const shore = shoreProbeAt(config.worldSeed, Math.floor(pos.x), Math.floor(pos.y));
    const pool =
      biome === 'grass' || biome === 'forest'
        ? wildCandidates(tier, biome, hours, shore)
        : [];
    const roster = pool
      .map((e) => {
        const [lo, hi] = e.band ?? [1, 1];
        const lead = e.lead ? `+${e.lead.npc}` : '';
        return `${e.npc}x${lo}${hi > lo ? `-${hi}` : ''}${lead}`;
      })
      .join(', ');
    say(
      `wilds: tier ${tier}, ${near}/${budget} bodies near ` +
        `(${srv.wildBodies.size} world-wide), ${biome}${shore ? ' shore' : ''} underfoot` +
        (pool.length > 0 ? ` | roster: ${roster}` : ' | roster: empty here'),
    );
    return;
  },
};

const cmdTerritory: ChatCommand = {
  name: '/territory',
  claims: (text) => text.startsWith('/territory'),
  run(srv, eid, player, text) {
    // The country lens (lived-in-land Phase 5): whose land you stand
    // on, the surrounding cells' countries, and the atlas roster.
    const pos = srv.positions.get(eid);
    if (!pos) return;
    const say = (t: string) =>
      player.session?.sendJson({ t: 'chat', channel: 'system', text: t });
    const families = familiesOf([...POI_DEFS.values()]);
    const here = territoryAt(
      config.worldSeed,
      Math.floor(pos.x),
      Math.floor(pos.y),
      families,
    );
    const cx = poiCellOf(pos.x);
    const cy = poiCellOf(pos.y);
    const rows: string[] = [];
    for (let dy = -1; dy <= 1; dy++) {
      const row: string[] = [];
      for (let dx = -1; dx <= 1; dx++) {
        const f = territoryAt(
          config.worldSeed,
          (cx + dx) * POI_CELL + POI_CELL / 2,
          (cy + dy) * POI_CELL + POI_CELL / 2,
          families,
        );
        row.push(f ?? 'none');
      }
      rows.push(row.join(' '));
    }
    say(
      `territory: ${here ?? 'none'} country at your feet (bias x${FRONTIER.territoryBias}) | ` +
        `cells around: [${rows.join(' / ')}] | atlas: ${families.sort().join(', ')}`,
    );
    return;
  },
};

const cmdFinds: ChatCommand = {
  name: '/finds',
  claims: (text) => text.startsWith('/finds'),
  run(srv, eid, player, text) {
    // The texture lens (lived-in-land Phase 2): what the lattice
    // dealt in this cell, which slots are cleared, and how many
    // habitat mouths are pulling knots world-wide.
    const pos = srv.positions.get(eid);
    if (!pos) return;
    const say = (t: string) =>
      player.session?.sendJson({ t: 'chat', channel: 'system', text: t });
    const cx = poiCellOf(pos.x);
    const cy = poiCellOf(pos.y);
    const key = poiCellKey(cx, cy);
    const fl = srv.findsLive.get(key);
    const ledger = srv.minorLedger.get(key);
    const epoch = srv.poiLedger.get(key)?.epoch ?? 0;
    const cleared = ledger && ledger.epoch === epoch ? ledger.cleared : 0;
    if (!fl || fl.finds.length === 0) {
      say(
        `finds: cell ${key} holds none — ` +
          `${srv.findsLive.size} cells standing, ${srv.habitatFinds.size} habitat mouths live`,
      );
      return;
    }
    const list = fl.finds
      .map((f) => {
        const bit = (cleared >>> f.slot) & 1;
        const hab = f.habitat !== undefined ? ` [${f.habitat}]` : '';
        return `${f.defId}@${f.anchorX},${f.anchorY} t${f.tier}${hab}${bit ? ' CLEARED' : ''}`;
      })
      .join(' | ');
    say(
      `finds: cell ${key} (epoch ${epoch}) deals ${fl.finds.length}: ${list} — ` +
        `${srv.habitatFinds.size} habitat mouths live`,
    );
    return;
  },
};

const cmdGrowth: ChatCommand = {
  name: '/growth',
  claims: (text) => text.startsWith('/growth'),
  run(srv, eid, player, text) {
    // The land's-clock lens (second-growth Phase 1): the domain
    // underfoot, the ledger census by dialect and age, and the
    // nearest healing ground with its honest deadline.
    const pos = srv.positions.get(eid);
    if (!pos) return;
    const say = (t: string) =>
      player.session?.sendJson({ t: 'chat', channel: 'system', text: t });
    const domain = srv.surface.growthDomainAt(Math.floor(pos.x), Math.floor(pos.y));
    const census = new Map<string, number>();
    let nearest: GrowthRow | null = null;
    let nearestD = Infinity;
    const now = Date.now();
    for (const row of srv.surface.growthLedger.values()) {
      // A sealed mouth (host ground over a wandered-away resource)
      // has no dialect of its own — name it honestly.
      const dialect =
        growthDialectOf(row.tile) ?? (row.state === GROWTH_DRIFTED ? 'sealed' : 'gone');
      const age =
        row.state === GROWTH_BARE
          ? row.due === null
            ? 'bare-dormant'
            : 'bare-seeded'
          : (GROWTH_STATE_NAMES[row.state] ?? `state${row.state}`);
      const k = `${dialect} ${age}`;
      census.set(k, (census.get(k) ?? 0) + 1);
      const d = Math.hypot(row.tx + 0.5 - pos.x, row.ty + 0.5 - pos.y);
      if (d < nearestD) {
        nearestD = d;
        nearest = row;
      }
    }
    const parts = [...census.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, n]) => `${k} x${n}`)
      .join(', ');
    let near = 'none';
    if (nearest) {
      const proj = projectGrowth(config.worldSeed, nearest, now);
      const eta = proj.ripe
        ? 'ripe, awaiting the beat'
        : proj.due === null
          ? proj.state === GROWTH_DRIFTED
            ? 'a drifted crown, at rest'
            : 'dormant, waiting on the world'
          : `${Math.max(0, Math.round((proj.due - now) / 60000))}m to next age`;
      near =
        `${nearest.tx},${nearest.ty} (${Math.round(nearestD)} tiles) ` +
        `${GROWTH_STATE_NAMES[proj.state] ?? proj.state}, ${eta}`;
    }
    const sown = [...srv.surface.growthLedger.values()].filter((r) => r.owner !== null).length;
    say(
      `growth: ${domain} ground underfoot | ledger ${srv.surface.growthLedger.size}` +
        (sown > 0 ? ` (${sown} sown)` : '') +
        (parts.length > 0 ? ` (${parts})` : '') +
        ` | nearest: ${near}`,
    );
    return;
  },
};

const cmdTriggers: ChatCommand = {
  name: '/triggers',
  claims: (text) => text.startsWith('/triggers'),
  run(srv, eid, player, text) {
    // THE WATCHFUL GROUND's lens:
    //   /triggers        — the roster, who holds you, your cooldown stamps
    //   /triggers reload — re-read the DB roster (the Studio's lever)
    const sys = (t: string) => player.session?.sendJson({ t: 'chat', channel: 'system', text: t });
    const [, verb] = text.split(/\s+/);
    if (verb === 'reload') {
      void srv
        .reloadTriggers()
        .then((r) => {
          sys(`triggers reloaded: ${r.count}${r.errors.length ? ` (${r.errors.length} refused)` : ''}`);
          for (const e of r.errors.slice(0, 4)) sys(`  ${e}`);
        })
        .catch((err: Error) => {
          console.error('[triggers reload]', err.message);
          sys(`triggers reload failed: ${err.message}`);
        });
      return;
    }
    const pos = srv.positions.get(eid);
    if (srv.triggerRoster.length === 0) {
      sys('trigger roster: empty');
      return;
    }
    const zones = (id: string) => srv.zoneRectOf(id);
    const rows = srv.triggerRoster.map((c) => {
      const d = c.def;
      const holding =
        pos !== undefined && player.triggerInside?.has(d.id) === true;
      const zoneMissing =
        d.area.kind === 'zone' && srv.zoneRectOf(d.area.zone) === null;
      const listeners = srv.triggerHooks.get(d.event)?.length ?? 0;
      const bits = [
        `${d.id} -> ${d.event}${listeners === 0 ? ' (no subscriber)' : ''}`,
        d.on,
        holding ? 'HOLDING YOU' : '',
        d.disabled ? 'disabled' : '',
        zoneMissing ? 'ZONE MISSING' : '',
      ].filter(Boolean);
      return bits.join(' · ');
    });
    sys(`triggers (${rows.length}):`);
    for (const r of rows) sys(`  ${r}`);
    const stamps = [...(player.triggerCooldowns ?? [])]
      .filter(([, until]) => until > srv.tickCount)
      .map(([g, until]) => `${g} ${(Math.max(0, until - srv.tickCount) / TICK_RATE).toFixed(0)}s`);
    if (stamps.length > 0) sys(`cooldowns: ${stamps.join(' · ')}`);
    if (pos) {
      const here = srv.triggerRoster
        .filter((c) => c.contains(pos.plane, pos.x, pos.y, zones))
        .map((c) => c.def.id);
      sys(`under your feet: ${here.length > 0 ? here.join(', ') : 'open ground'}`);
    }
    return;
  },
};

const cmdTrigger: ChatCommand = {
  name: '/trigger',
  claims: (text) => text.startsWith('/trigger '),
  run(srv, eid, player, text) {
    // /trigger <id> [enter|exit] — force-fire through the full door,
    // gates bypassed (stamps still land, so the theatre reads true).
    const sys = (t: string) => player.session?.sendJson({ t: 'chat', channel: 'system', text: t });
    const [, id, edgeArg] = text.split(/\s+/);
    const def = id !== undefined ? srv.triggerDefs.get(id) : undefined;
    if (!def) {
      sys(`Usage: /trigger <id> [enter|exit] — ids: ${[...srv.triggerDefs.keys()].join(', ')}`);
      return;
    }
    const edge: TriggerEdge = edgeArg === 'exit' ? 'exit' : 'enter';
    stampFire(player.triggerCooldowns ??= new Map(), def, srv.tickCount);
    if (def.once) srv.setPlayerFlag(player, triggerOnceFlag(def.id));
    if (def.setFlag) srv.setPlayerFlag(player, def.setFlag);
    const handlers = srv.triggerHooks.get(def.event) ?? [];
    for (const handler of handlers) handler({ def, edge, eid, player });
    sys(`fired ${def.id} (${edge}) -> '${def.event}' (${handlers.length} subscriber${handlers.length === 1 ? '' : 's'})`);
    return;
  },
};

const cmdFrontier: ChatCommand = {
  name: '/frontier',
  claims: (text) => text.startsWith('/frontier'),
  run(srv, eid, player, text) {
    // The living-frontier lens + staging levers (the /poi family's kin):
    //   /frontier          — credits + this cell's ember/fallow state + world counts
    //   /frontier tick     — force one full frontier pass now
    //   /frontier ember [minutes] — re-stamp the current cleared cell's linger
    //   /frontier credit [n]      — grant renewal credits (staging)
    const [, sub, arg] = text.split(/\s+/);
    const pos = srv.positions.get(eid);
    if (!pos) return;
    const cx = poiCellOf(pos.x);
    const cy = poiCellOf(pos.y);
    const key = poiCellKey(cx, cy);
    const say = (t: string) =>
      player.session?.sendJson({ t: 'chat', channel: 'system', text: t });
    if (sub === 'tick') {
      // The full work ladder, one unit — mirrors tickFrontier exactly.
      const now = Date.now();
      const did = srv.dissolveOneEmber(now)
        ? 'dissolved an ember'
        : srv.wakeOneFallow(now)
          ? 'woke a fallow cell'
          : srv.stageOnePoi(now)
            ? 'moved the boldness clock'
            : srv.seedOneSatellite(now)
              ? 'seeded (or scattered) a satellite'
              : srv.forkOneToll(now)
                ? 'forked a road toll'
                : srv.spendRenewalCredit(now)
                  ? 'spent a renewal credit'
                  : 'nothing due';
      const traces =
        (srv.satTrace.length > 0 ? ` [sat: ${srv.satTrace.join(' ')}]` : '') +
        (srv.tollTrace.length > 0 ? ` [toll: ${srv.tollTrace.join(' ')}]` : '');
      say(`Frontier pass: ${did}.${traces}`);
      return;
    }
    if (sub === 'creep') {
      // /frontier creep — backdate this cell's top-rung clock past
      // its creep wait so the next pass may fork the toll (staging).
      const row = srv.poiLedger.get(key);
      if (!row?.site) {
        say('This cell holds no site to creep.');
        return;
      }
      row.stageAt = Date.now() - creepWaitFor(config.worldSeed, cx, cy) - 1;
      srv.accounts.markPoiStage(cx, cy, row.stage, row.stageAt);
      say(`Creep clock backdated — /frontier tick may fork the toll now (stage ${row.stage}).`);
      return;
    }
    if (sub === 'raid') {
      // /frontier raid — force the covetous dice NOW (qualification
      // still applies; the trace tells you who refused and why).
      // /frontier raid calm — lift your own mercy stamp (staging).
      if (arg === 'calm') {
        player.raidCalmUntil = 0;
        if (player.characterId > 0) srv.accounts.resetRaidCalm(player.characterId);
        say('Your raid mercy stamp is lifted — the dice may pick you again.');
        return;
      }
      const stood = srv.tickRaidDice(Date.now(), true);
      say(
        `Raid dice (forced): ${stood ? 'a squat stands' : 'nothing stood'}.` +
          (srv.raidTrace.length > 0 ? ` [${srv.raidTrace.join(' ')}]` : ''),
      );
      return;
    }
    if (sub === 'peddler') {
      // /frontier peddler — deal fortune NOW at the most road-true
      // lawful spot in the renewal ring around you (staging: same
      // laws as the real fork, no credit spent).
      const pts: Array<{ tx: number; ty: number }> = [];
      const [pMin, pMax] = FRONTIER.renewalRing;
      for (let t = 0; t < FRONTIER.renewalTries * 2; t++) {
        const ang = Math.random() * Math.PI * 2;
        const d = pMin + Math.random() * (pMax - pMin);
        pts.push({
          tx: Math.round(pos.x + Math.cos(ang) * d),
          ty: Math.round(pos.y + Math.sin(ang) * d),
        });
      }
      const parked = srv.standOnePeddler(pts, Date.now());
      say(
        parked
          ? `Fortune on the road: a peddler parks her cart at ${parked.anchorX},${parked.anchorY}.`
          : 'No lawful verge for a cart this pass — try again.',
      );
      return;
    }
    if (sub === 'watch') {
      // /frontier watch — the world answers, read from where you stand
      // (what a speaker HERE would know), plus your open bounty marks.
      const s = srv.watchSurvey(pos.x, pos.y);
      const relief = !s.near && srv.calmWithinTiles(pos.x, pos.y, FRONTIER.marchTiles);
      const peddler = srv.worldFlagAnswer('world:peddler_near', player, pos.x, pos.y);
      const bounties = srv.openBounties(player);
      say(
        `The world answers here: threat_near=${s.near} threat_bold=${s.bold} ` +
          `toll_near=${s.toll} calm=${!s.near} relief=${relief} peddler_near=${peddler}. ` +
          `Open bounties: ${bounties.length > 0 ? bounties.join(' · ') : 'none'}.`,
      );
      return;
    }
    if (sub === 'ember') {
      // Any standing ember clock may be re-stamped — cleared camps,
      // scattered satellites, and a peddler's departure alike.
      const row = srv.poiLedger.get(key);
      if (!row?.site || (row.clearedAt === null && row.emberUntil === null)) {
        say('This cell holds no ember clock to re-stamp.');
        return;
      }
      const mins = Number.parseFloat(arg ?? '0');
      row.emberUntil = Date.now() + (Number.isFinite(mins) && mins >= 0 ? mins : 0) * 60_000;
      srv.accounts.setPoiEmber(cx, cy, row.emberUntil);
      say(`Ember re-stamped: dissolves in ${Math.round((row.emberUntil - Date.now()) / 1000)}s (dignity permitting).`);
      return;
    }
    if (sub === 'credit') {
      const n = Number.parseInt(arg ?? '1', 10);
      srv.frontierCredits += Number.isFinite(n) ? n : 1;
      srv.accounts.saveFrontierCredits(srv.frontierCredits);
      say(`Renewal debt now ${srv.frontierCredits}.`);
      return;
    }
    if (sub === 'stage') {
      // /frontier stage [n] — force this cell's boldness rung (staging).
      const row = srv.poiLedger.get(key);
      const def = row?.site ? POI_DEFS.get(row.site.defId) : undefined;
      if (!row?.site || !def) {
        say('This cell holds no site to stage.');
        return;
      }
      const max = Math.min(FRONTIER.stageMax, def.boldness?.stages.length ?? 0);
      if (max === 0) {
        say(`${def.name} carries no boldness ladder.`);
        return;
      }
      const n = Number.parseInt(arg ?? '', 10);
      const want = Number.isInteger(n)
        ? Math.max(0, Math.min(n, max))
        : Math.min(row.stage + 1, max);
      row.stage = want;
      row.stageAt = Date.now();
      srv.accounts.markPoiStage(cx, cy, want, row.stageAt);
      srv.retirePoiCell(key);
      if (want > 0) srv.pushStageRumor(key, def.name, want);
      say(`${def.name} set to stage ${want}/${max} — it recomposes as the world streams back.`);
      return;
    }
    if (sub === 'calm') {
      // /frontier calm [clear] — inspect or lift the relax windows.
      if (arg === 'clear') {
        srv.frontierCalm.clear();
        srv.accounts.pruneFrontierCalm(Number.MAX_SAFE_INTEGER);
        say('All relax windows lifted.');
        return;
      }
      say(
        srv.frontierCalm.size === 0
          ? 'No relax windows standing.'
          : [...srv.frontierCalm.entries()]
              .map(([k, u]) => `${k}: ${Math.max(0, Math.round((u - Date.now()) / 60000))}m`)
              .join(' · '),
      );
      return;
    }
    let embers = 0;
    let fallows = 0;
    for (const r of srv.poiLedger.values()) {
      // Cleared embers AND scattered satellites both count — any
      // standing site with a dissolve clock is an ember.
      if (r.site !== null && r.emberUntil !== null) embers++;
      if (r.site === null && r.fallowUntil !== null) fallows++;
    }
    const row = srv.poiLedger.get(key);
    const now = Date.now();
    const satTag = (r: NonNullable<ReturnType<typeof srv.poiLedger.get>>): string =>
      r.originCell !== null ? ` (satellite of ${r.originCell})` : r.stage > 0 ? ` (stage ${r.stage})` : '';
    const cellState =
      row === undefined
        ? 'undecided'
        : row.site && row.emberUntil !== null
          ? `${row.site.defId}${satTag(row)} EMBER — dissolves in ~${Math.max(0, Math.round((row.emberUntil - now) / 60000))}m`
          : row.site
            ? `${row.site.defId}${satTag(row)} standing`
            : row.fallowUntil !== null
              ? `fallow — may host in ~${Math.max(0, Math.round((row.fallowUntil - now) / 60000))}m`
              : `decided empty (epoch ${row.epoch})`;
    let staged = 0;
    let sats = 0;
    let tolls = 0;
    let squats = 0;
    let peddlers = 0;
    for (const r of srv.poiLedger.values()) {
      if (r.site === null) continue;
      if (r.site.defId === 'road_toll') tolls++;
      else if (r.site.defId === 'peddler_rest') peddlers++;
      else if (hearthOwnerOf(r.originCell) !== null) squats++;
      else if (r.originCell !== null) sats++;
      else if (r.stage > 0) staged++;
    }
    say(
      `Frontier: ${embers} ember(s), ${fallows} fallow, ${staged} staged core(s), ` +
        `${sats} satellite(s), ${tolls} toll(s), ${squats} squat(s), ${peddlers} peddler(s), ` +
        `${srv.frontierCalm.size} calm, debt ${srv.frontierCredits}, rings ${srv.claimRings().length}. ` +
        `Cell ${key}: ${cellState} — /frontier tick · ember [min] · stage [n] · creep · raid [calm] · peddler · watch · calm [clear] · credit [n]`,
    );
    return;
  },
};

const cmdSpawnchest: ChatCommand = {
  name: '/spawnchest',
  claims: (text) => text.startsWith('/spawnchest'),
  run(srv, eid, player, text) {
    // /spawnchest [wood|iron|gilded|mossy] — a closed chest on the
    // nearest open tile beside the caller. Transient (not a built
    // tile): chunk regen sweeps it, which is what staging wants.
    const [, kindRaw] = text.split(/\s+/);
    const kind = (kindRaw ?? 'wood') as ChestKind;
    if (!['wood', 'mossy', 'iron', 'gilded', 'boss'].includes(kind)) {
      player.session?.sendJson({
        t: 'chat',
        channel: 'system',
        text: '/spawnchest [wood|mossy|iron|gilded|boss]',
      });
      return;
    }
    const pos = srv.positions.get(eid);
    if (!pos) return;
    for (let tries = 0; tries < 14; tries++) {
      const a = (tries / 14) * Math.PI * 2;
      const r = 1.4 + Math.floor(tries / 7) * 0.9;
      const tx = Math.floor(pos.x + Math.cos(a) * r);
      const ty = Math.floor(pos.y + Math.sin(a) * r);
      if (srv.worldOf(pos.plane).isSolid(tx, ty)) continue;
      if (Math.floor(pos.x) === tx && Math.floor(pos.y) === ty) continue;
      srv.setWorldTile(pos.plane, tx, ty, closedChestTile(kind));
      player.session?.sendJson({
        t: 'chat',
        channel: 'system',
        text: `A ${kind} chest lands at ${tx}, ${ty}.`,
      });
      return;
    }
    player.session?.sendJson({ t: 'chat', channel: 'system', text: 'No open ground nearby.' });
    return;
  },
};

const cmdArena: ChatCommand = {
  name: '/arena',
  claims: (text) => text.startsWith('/arena'),
  run(srv, eid, player, text) {
    // THE SAND AND THE ROAR staging levers. All through the REAL
    // doors (the queue, the wipe, the kill path) — never a bypass.
    const sys = (line: string): void => {
      player.session?.sendJson({ t: 'chat', channel: 'system', text: line });
    };
    const [, verb, arg] = text.split(/\s+/);
    const mine = srv.arenaOf(player.characterId);
    if (verb === 'start' && arg !== undefined) {
      // The real claim ceremony, fee waived; stand near a venue.
      srv.arenaQueue(eid, arg, { devFree: true });
      return;
    }
    if (verb === 'muster' && mine && mine.phase === 'muster') {
      mine.deadlineTick = srv.tickCount + 1;
      sys('The muster clock snaps forward.');
      return;
    }
    if (verb === 'win' && mine && mine.phase === 'round') {
      for (const weid of [...mine.waveEids]) {
        const npc = srv.npcs.get(weid);
        if (npc && srv.ecs.isAlive(weid)) srv.killNpc(weid, npc, eid);
      }
      return;
    }
    if (verb === 'wipe' && mine) {
      srv.arenaWipe(mine);
      return;
    }
    if (verb === 'reset') {
      for (const m of [...srv.arenaMatches.values()]) srv.arenaReset(m, { silent: true });
      srv.arenaCooldowns.clear();
      sys('Every sand raked, every claim freed.');
      return;
    }
    if (verb === 'rank' && arg !== undefined) {
      const rank = Math.max(0, Math.min(ARENAS.ladder.maxRank, Number(arg) | 0));
      player.arena.rank = rank;
      player.arena.xp = totalXpForArenaRank(rank);
      if (player.characterId > 0) srv.accounts.saveArena(player.characterId, player.arena);
      sys(`The board writes you at rank ${rank} (${arenaTitleFor(rank) || 'unranked'}).`);
      return;
    }
    const state = mine
      ? `${mine.venueId}: ${mine.def.id} ${mine.phase} round ${mine.round + 1}/` +
        `${mine.plan.rounds.length}, foes ${srv.arenaFoesLeft(mine)}, ` +
        `members ${[...mine.members.values()].filter((m) => m.alive).length}/${mine.members.size}`
      : 'no card underway';
    sys(`/arena start <match> | muster | win | wipe | reset | rank <n> — ${state}`);
    return;
  },
};

export const DEV_COMMANDS: readonly ChatCommand[] = [
  cmdTp,
  cmdMuseum,
  cmdSettile,
  cmdTime,
  cmdXp,
  cmdGrow,
  cmdClearfarm,
  cmdProc,
  cmdCalling,
  cmdStatus,
  cmdMount,
  cmdTame,
  cmdCompany,
  cmdPetbond,
  cmdPetarts,
  cmdPetstate,
  cmdGive,
  cmdHang,
  cmdUnhang,
  cmdSpawnmob,
  cmdForgecrown,
  cmdNpcstate,
  cmdSpawnnpc,
  cmdDlgreload,
  cmdRoutinereload,
  cmdRoutines,
  cmdFlagreset,
  cmdFlag,
  cmdStanding,
  cmdDeed,
  cmdQuest,
  cmdGivekey,
  cmdDanger,
  cmdStronghold,
  cmdPoi,
  cmdWilds,
  cmdTerritory,
  cmdFinds,
  cmdGrowth,
  cmdTriggers,
  cmdTrigger,
  cmdFrontier,
  cmdSpawnchest,
  cmdArena,
];
