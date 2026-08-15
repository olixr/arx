import { readFileSync, readdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { WebSocketServer } from 'ws';
import {
  AUTHORED_FACTIONS,
  AUTHORED_FRONTIER,
  AUTHORED_GEOGRAPHY,
  AUTHORED_GROWTH,
  AUTHORED_VOICE,
  AUTHORED_LOOT_TABLES,
  AUTHORED_MINOR_DEFS,
  AUTHORED_STRONGHOLDS,
  replaceStrongholds,
  validateStronghold,
  type StrongholdDef,
  AUTHORED_NODES,
  AUTHORED_NPCS,
  AUTHORED_POI_DEFS,
  DIALOGUES,
  NPC_ACTORS,
  QUESTS,
  ROUTINES,
  buildAmberford,
  buildPinewatch,
  buildHartfell,
  buildKingsdelf,
  buildEvenfall,
  buildSaltmere,
  buildDawnmead,
  buildSilverfall,
  buildUndercroft,
  buildLowhall,
  lootTableErrors,
  replaceFactions,
  replaceFrontier,
  replaceGeography,
  replaceGrowth,
  replaceLootTables,
  minorRosterFingerprint,
  replaceMinorDefs,
  replaceNodes,
  replaceNpcDefs,
  replacePoiDefs,
  replaceVoice,
  validateFactions,
  validateFrontier,
  validateGeographyDef,
  validateGrowth,
  validateMinorDef,
  validateNodeDoc,
  validateNpcDef,
  validatePoiDef,
  validateVoice,
  validateZone,
  zoneFromJson,
  zonePlacementErrors,
  type GrowthRow,
  larderEpoch,
  type LootTableDef,
  type MinorDef,
  type NodeDef,
  type NpcDef,
  type PoiDef,
  type ZoneDef,
  type ZoneJson,
} from '@arx/content';
import { config } from './config.js';
import { AccountStore } from './db/accounts.js';
import { loadContentDocs, seedContentDocs } from './db/contentDocs.js';
import { createMapsApi } from './dev/mapsApi.js';
import { serveVoiceFile } from './voice/store.js';
import { openDb } from './db/db.js';
import { loadDialogues, seedDialogues } from './db/dialogues.js';
import { loadVoiceBanks, loadVoiceClips } from './db/voice.js';
import { loadQuests, seedQuests } from './db/quests.js';
import { loadNpcActors, syncNpcActors } from './db/npcActors.js';
import { loadRoutines, seedRoutines } from './db/routines.js';
import { GameServer } from './game/gameServer.js';
import { clientIp, ipGuard } from './net/ipGuard.js';
import { Session } from './net/session.js';
import { WorldSource } from './world/worldSource.js';

// Authored zones: built-ins from content, plus map-editor JSON saved
// in data/maps/. Later zones win where they overlap. Dawnmead comes
// first: WorldSource takes the world spawn from the first zone that
// declares one. A file whose id matches a built-in REPLACES it in
// place (same overlay slot) — that's how an edited village ships.
// The world is built out fresh from Dawnmead: the old placeholder
// town, dungeon, and quarry zones are gone, and everything past the
// hedgerows is the procedural frontier.
// Dawnmead stays FIRST: the world spawn (rescue law, underground
// surfacing) is the first zone declaring one — the Waking Ring.
const builtinZones = new Map<string, ZoneDef>(
  [
    buildDawnmead(),
    buildAmberford(),
    buildSilverfall(),
    buildSaltmere(),
    buildPinewatch(),
    buildHartfell(),
    buildKingsdelf(),
    buildEvenfall(),
    buildUndercroft(),
  buildLowhall(),
  ].map((z) => [z.id, z]),
);
const zones: ZoneDef[] = [...builtinZones.values()];
try {
  const mapsDir = join(config.dataDir, 'maps');
  for (const file of readdirSync(mapsDir).filter((f) => f.endsWith('.json')).sort()) {
    try {
      const json = JSON.parse(readFileSync(join(mapsDir, file), 'utf8')) as ZoneJson;
      const zone = zoneFromJson(json);
      // THE ONE ZONE GATE holds at boot too (core-audit debt 4 — the
      // header always claimed it did). Malformed placements REFUSE the
      // file (a 1e9 spawn count would hang the boot); a builder-law
      // verdict only WARNS here — refusing a standing town zone over a
      // fence drift is the bigger hazard, and the Studio's save door
      // keeps the hard gate.
      const placementErrors = zonePlacementErrors(zone);
      if (placementErrors.length > 0) {
        throw new Error(`placements invalid: ${placementErrors[0]}`);
      }
      const verdict = validateZone(zone);
      if (!verdict.ok) {
        console.warn(`[server] zone '${json.id}' fails the builder replay (${verdict.error}) — loaded anyway (grandfathered; re-save in the Studio to heal)`);
      }
      const idx = zones.findIndex((z) => z.id === zone.id);
      if (idx === -1) zones.push(zone);
      else zones[idx] = zone;
      console.log(`[server] loaded zone '${json.id}' from data/maps/${file}`);
    } catch (err) {
      console.warn(`[server] skipped bad map file ${file}: ${(err as Error).message}`);
    }
  }
} catch {
  // no data/maps directory — built-in zones only
}

const db = await openDb();
const accounts = new AccountStore(db);
// Character names serve the sign-byline hot path synchronously.
await accounts.preloadCharacterNames();

// The invite gate. INVITE_CODE seeds/re-arms the one live code each
// boot; the ledger can hold more, added straight in the table.
if (config.inviteCode) {
  await accounts.upsertInviteCode(config.inviteCode, 'seeded from INVITE_CODE env');
}
if (config.requireInvite) {
  const open = await accounts.countOpenInviteCodes();
  console.log(`[server] registration requires an invite code (${open} code(s) open)`);
  if (open === 0) {
    console.warn('[server] WARNING: invite required but NO open codes exist — nobody can register. Set INVITE_CODE in .env.');
  }
}

// NPC actors + routines load FIRST among the POI family's refs — pure
// DB reads, hoisted above the content block so the POI validator can
// check actor/routine references against the LIVE roster (Studio-born
// entries included). Boot used to validate with the authored
// registries only, while the CMS PUT validated with the live ids: a
// def naming a Studio-born actor saved fine, then silently reverted to
// its authored twin on the very next boot (core-audit debt 3).
// registerActors/registerRoutines still run at their old station,
// from these same results.
const actorSync = await syncNpcActors(db, [...NPC_ACTORS.values()]);
const actorLoad = await loadNpcActors(db);
const rtnSeed = await seedRoutines(db, [...ROUTINES.values()]);
const rtnLoad = await loadRoutines(db);
const liveActorIds = new Set(actorLoad.actors.map((a) => a.id));
const liveRoutineIds = new Set(rtnLoad.routines.map((r) => r.id));

// Bestiary + loot tables, DB-first under the two-hash truth law: the
// shipped registries seed content_docs, the runtime reads BACK from
// the DB, and the live module maps are repopulated — every consumer
// resolves through them at call time. Invalid docs are reported and
// the authored def stands in, so a bad tool edit can't brick a boot.
{
  const npcSeed = await seedContentDocs(
    db,
    'npc',
    [...AUTHORED_NPCS.values()].map((d) => ({ id: d.id, doc: d })),
  );
  const lootSeed = await seedContentDocs(
    db,
    'loot',
    [...AUTHORED_LOOT_TABLES.values()].map((t) => ({ id: t.id, doc: t })),
  );
  const lootDocs = await loadContentDocs(db, 'loot');
  const lootDefs = lootDocs.map((d) => d.doc as LootTableDef);
  const lootProblems = lootTableErrors(lootDefs);
  if (lootProblems.length > 0) {
    console.warn(`[content] DB loot tables invalid (${lootProblems[0]}) — authored set stands`);
  } else {
    replaceLootTables(lootDefs);
  }
  const lootIds = new Set((lootProblems.length > 0 ? [...AUTHORED_LOOT_TABLES.keys()] : lootDefs.map((t) => t.id)));
  const npcDocs = await loadContentDocs(db, 'npc');
  const npcIds = new Set(npcDocs.map((d) => d.id));
  const goodNpcs: NpcDef[] = [];
  for (const docRow of npcDocs) {
    const errors = validateNpcDef(docRow.doc, { lootTables: lootIds, npcIds });
    if (errors.length > 0) {
      console.warn(`[content] DB npc '${docRow.id}' invalid (${errors[0]}) — authored def stands`);
      const authored = AUTHORED_NPCS.get(docRow.id);
      if (authored) goodNpcs.push(authored);
    } else {
      goodNpcs.push(docRow.doc as NpcDef);
    }
  }
  replaceNpcDefs(goodNpcs);
  console.log(
    `[content] npcs: ${goodNpcs.length} loaded ` +
      `(+${npcSeed.added} ~${npcSeed.updated} !${npcSeed.kept} -${npcSeed.removed} =${npcSeed.unchanged}) · ` +
      `loot tables: ${lootDefs.length} ` +
      `(+${lootSeed.added} ~${lootSeed.updated} !${lootSeed.kept} -${lootSeed.removed} =${lootSeed.unchanged})`,
  );

  // POI archetypes join the same law: authored JSON seeds, DB rows
  // load back through the one validator, the live registry swaps.
  const poiSeed = await seedContentDocs(
    db,
    'poi',
    [...AUTHORED_POI_DEFS.values()].map((d) => ({ id: d.id, doc: d })),
  );
  const poiDocs = await loadContentDocs(db, 'poi');
  const goodPois: PoiDef[] = [];
  for (const docRow of poiDocs) {
    const res = validatePoiDef(docRow.doc, { actorIds: liveActorIds, routineIds: liveRoutineIds });
    if (!res.ok) {
      console.warn(`[content] DB poi '${docRow.id}' invalid (${res.errors[0]}) — authored def stands`);
      const authored = AUTHORED_POI_DEFS.get(docRow.id);
      if (authored) goodPois.push(authored);
    } else {
      goodPois.push(res.def);
    }
  }
  replacePoiDefs(goodPois);
  console.log(
    `[content] pois: ${goodPois.length} loaded ` +
      `(+${poiSeed.added} ~${poiSeed.updated} !${poiSeed.kept} -${poiSeed.removed} =${poiSeed.unchanged})`,
  );

  // THE SMALL FINDS join the same law (lived-in-land Phase 2): the
  // minor-def roster seeds as content docs, DB rows load back through
  // the one validator, the live registry swaps.
  const minorSeed = await seedContentDocs(
    db,
    'minor',
    [...AUTHORED_MINOR_DEFS.values()].map((d) => ({ id: d.id, doc: d })),
  );
  const minorDocs = await loadContentDocs(db, 'minor');
  const goodMinors: MinorDef[] = [];
  for (const docRow of minorDocs) {
    const res = validateMinorDef(docRow.doc);
    if (!res.ok) {
      console.warn(
        `[content] DB minor '${docRow.id}' invalid (${res.errors[0]}) — authored def stands`,
      );
      const authored = AUTHORED_MINOR_DEFS.get(docRow.id);
      if (authored) goodMinors.push(authored);
    } else {
      goodMinors.push(res.def);
    }
  }
  replaceMinorDefs(goodMinors);
  console.log(
    `[content] finds: ${goodMinors.length} loaded ` +
      `(+${minorSeed.added} ~${minorSeed.updated} !${minorSeed.kept} -${minorSeed.removed} =${minorSeed.unchanged})`,
  );
  // THE BITS KNOW THEIR ROSTER (core-audit debt 6): the finds cleared
  // bits bind by slot index while the deal re-derives from this
  // roster. When the live roster's print differs from the one the bits
  // were earned under, every bit lawfully dies BEFORE loadMinorCells
  // reads the rows back — the texture re-deals whole.
  {
    const fp = minorRosterFingerprint();
    const stored = await accounts.loadMinorRosterFp();
    if (stored !== null && stored !== fp) {
      await accounts.clearAllMinorBits();
      console.log('[content] finds roster changed — cleared bits re-deal whole');
    }
    if (stored !== fp) accounts.saveMinorRosterFp(fp);
  }

  // THE FOUNDRY's repository (strongholds Phase 1) joins the same
  // law: the pinned-seed shelf seeds as content docs, DB rows load
  // back through the one validator (grammar half here — geometry laws
  // run against the live prefab library at PUT time), the live
  // registry swaps.
  const strongholdSeed = await seedContentDocs(
    db,
    'stronghold',
    [...AUTHORED_STRONGHOLDS.values()].map((d) => ({ id: d.id, doc: d })),
  );
  const strongholdDocs = await loadContentDocs(db, 'stronghold');
  const goodStrongholds: StrongholdDef[] = [];
  for (const docRow of strongholdDocs) {
    const res = validateStronghold(docRow.doc);
    if (!res.ok) {
      console.warn(
        `[content] DB stronghold '${docRow.id}' invalid (${res.errors[0]}) — authored layout stands`,
      );
      const authored = AUTHORED_STRONGHOLDS.get(docRow.id);
      if (authored) goodStrongholds.push(authored);
    } else {
      goodStrongholds.push(res.def);
    }
  }
  replaceStrongholds(goodStrongholds);
  console.log(
    `[content] strongholds: ${goodStrongholds.length} loaded ` +
      `(+${strongholdSeed.added} ~${strongholdSeed.updated} !${strongholdSeed.kept} -${strongholdSeed.removed} =${strongholdSeed.unchanged})`,
  );

  // THE ROSTER SPEAKS (second-growth Phase 5): the resource-node
  // roster joins the law — every gatherable's yields, gates, windows,
  // and renewal class are Studio content. Call-time reads through
  // NODES_BY_TILE mean an edit steers the very next gather.
  const nodeSeed = await seedContentDocs(
    db,
    'node',
    [...AUTHORED_NODES.values()].map((d) => ({ id: d.id, doc: d })),
  );
  const nodeDocs = await loadContentDocs(db, 'node');
  const goodNodes: NodeDef[] = [];
  for (const docRow of nodeDocs) {
    const res = validateNodeDoc(docRow.doc, { lootTables: lootIds });
    if (!res.ok) {
      console.warn(`[content] DB node '${docRow.id}' invalid (${res.errors[0]}) — authored def stands`);
      const authored = AUTHORED_NODES.get(docRow.id);
      if (authored) goodNodes.push(authored);
    } else {
      goodNodes.push(res.def);
    }
  }
  try {
    replaceNodes(goodNodes);
    console.log(
      `[content] nodes: ${goodNodes.length} loaded ` +
        `(+${nodeSeed.added} ~${nodeSeed.updated} !${nodeSeed.kept} -${nodeSeed.removed} =${nodeSeed.unchanged})`,
    );
  } catch (err) {
    console.warn(`[content] node roster refused (${(err as Error).message}) — authored roster stands`);
  }

  // THE GEOGRAPHY joins the law: one 'world' doc holding the whole
  // plan — roads, authored wild sites, anchors, landform fields,
  // planned rects. It MUST swap in before WorldSource exists: the
  // first generated chunk and every boot sweep read the live plan.
  await seedContentDocs(db, 'geography', [{ id: 'world', doc: AUTHORED_GEOGRAPHY }]);
  const geoDocs = await loadContentDocs(db, 'geography');
  const geoRow = geoDocs.find((d) => d.id === 'world');
  if (geoRow) {
    const res = validateGeographyDef(geoRow.doc);
    if (!res.ok) {
      console.warn(`[content] DB geography invalid (${res.errors[0]}) — authored plan stands`);
    } else {
      replaceGeography(res.def);
      console.log(
        `[content] geography: ${res.def.routes.length} routes · ${res.def.sites.length} wild sites · ` +
          `${res.def.anchors.length} anchors · ${res.def.planned.length} planned rects` +
          (geoRow.edited ? ' (tool-edited)' : ''),
      );
    }
  }

  // THE FRONTIER DIALS join the law (living-frontier Phase 6): one
  // 'world' doc holding the whole weather — linger, fallow, stage
  // days, satellite caps, calm windows, raid dice, peddler hours.
  // Every consumer reads FRONTIER.x at call time, so the swap needs
  // no reload hooks — the Studio's edit steers the very next beat.
  // THE LEDGER OF NAMES (docs/factions-plan.md Phase 1): the faction
  // roster, bands, deed values, and opposition matrix are one 'world'
  // doc under the same law — every consumer reads FACTIONS.x (or the
  // membership indexes) at call time, so a Studio save re-draws the
  // political map on the very next beat.
  await seedContentDocs(db, 'factions', [{ id: 'world', doc: AUTHORED_FACTIONS }]);
  const factionsDocs = await loadContentDocs(db, 'factions');
  const factionsRow = factionsDocs.find((d) => d.id === 'world');
  if (factionsRow) {
    const res = validateFactions(factionsRow.doc);
    if (!res.ok) {
      console.warn(`[content] DB factions doc invalid (${res.errors[0]}) — authored roster stands`);
    } else {
      replaceFactions(res.def);
      console.log(
        `[content] factions: ${res.def.roster.map((f) => f.id).join(', ')} · ` +
          `${res.def.roster.reduce((n, f) => n + f.members.length, 0)} members` +
          (factionsRow.edited ? ' (tool-edited)' : ''),
      );
    }
  }

  // THE CLIP LEDGER (voiceover-plan Phase 2): the voice dials are one
  // 'world' doc under the same law — quip cadence, duck depths, and
  // the upload cap all read at call time.
  await seedContentDocs(db, 'voice', [{ id: 'world', doc: AUTHORED_VOICE }]);
  const voiceDocs = await loadContentDocs(db, 'voice');
  const voiceRow = voiceDocs.find((d) => d.id === 'world');
  if (voiceRow) {
    const res = validateVoice(voiceRow.doc);
    if (!res.ok) {
      console.warn(`[content] DB voice dials invalid (${res.errors[0]}) — authored dials stand`);
    } else {
      replaceVoice(res.def);
      console.log(
        `[content] voice dials: quip ${res.def.quipChance}@${Math.round(res.def.quipCooldownMs / 1000)}s · ` +
          `duck ${res.def.duckLine}/${res.def.duckAmbience} · prefetch ${res.def.prefetchCap}` +
          (voiceRow.edited ? ' (tool-edited)' : ''),
      );
    }
  }
  // THE GROWTH DIALS join the law (second-growth Phase 1): one 'world'
  // doc holding the land's clock — the ages' windows, the beat's
  // cadence and budget. Call-time reads; the Studio's edit re-aims
  // every live regrowth on the very next beat.
  await seedContentDocs(db, 'growth', [{ id: 'world', doc: AUTHORED_GROWTH }]);
  const growthDocs = await loadContentDocs(db, 'growth');
  const growthRow = growthDocs.find((d) => d.id === 'world');
  if (growthRow) {
    const res = validateGrowth(growthRow.doc);
    if (!res.ok) {
      console.warn(`[content] DB growth dials invalid (${res.errors[0]}) — authored dials stand`);
    } else {
      replaceGrowth(res.def);
      console.log(
        `[content] growth dials: tree ${res.def.treeStumpMinutes[0]}+${res.def.treeBareMinutes[0]}+` +
          `${res.def.treeSaplingMinutes[0]}m.. · ore ${res.def.oreReopenMinutes[0]}-${res.def.oreReopenMinutes[1]}m · ` +
          `forage ${res.def.forageMinutes[0]}-${res.def.forageMinutes[1]}m · beat ${res.def.beatTicks}t/${res.def.beatBudget}` +
          (growthRow.edited ? ' (tool-edited)' : ''),
      );
    }
  }
  await seedContentDocs(db, 'frontier', [{ id: 'world', doc: AUTHORED_FRONTIER }]);
  const frontierDocs = await loadContentDocs(db, 'frontier');
  const frontierRow = frontierDocs.find((d) => d.id === 'world');
  if (frontierRow) {
    const res = validateFrontier(frontierRow.doc);
    if (!res.ok) {
      console.warn(`[content] DB frontier dials invalid (${res.errors[0]}) — authored dials stand`);
    } else {
      replaceFrontier(res.def);
      console.log(
        `[content] frontier dials: ember ${Math.round(res.def.emberLingerMs[0] / 60000)}–` +
          `${Math.round(res.def.emberLingerMs[1] / 60000)}m · stage ~` +
          `${(res.def.stageMs[0] / 86_400_000).toFixed(1)}d · raid ${Math.round(res.def.raidRollMs / 60000)}m@` +
          `${res.def.raidChance}` +
          (frontierRow.edited ? ' (tool-edited)' : ''),
      );
    }
  }
}

const world = new WorldSource(config.worldSeed, zones);
for (const built of await accounts.loadBuiltTiles()) {
  world.registerBuilt(built.tx, built.ty, built.tile, built.owner, built.prevTile);
}
// THE SECOND LAYER: hung decor rehydrates beside the built tiles, so
// a chunk's first generation already carries every player's cloth.
for (const hung of await accounts.loadBuiltDetails()) {
  world.registerBuiltDetail(hung.tx, hung.ty, hung.detail, hung.owner, hung.prevDetail);
}
// THE SECOND GROWTH: the wild-harvest ledger rehydrates before any
// chunk exists — the ensure() overlay projects every row against the
// clock at generation time, so a regrowth that crossed ages (or fully
// healed) while the server slept is simply CORRECT on first read; the
// growth beat only catches the checkpoints up.
{
  const growthRows = await accounts.loadGrowth();
  for (const row of growthRows) world.registerGrowth(row as GrowthRow);
  if (growthRows.length > 0) {
    console.log(`[world] growth ledger: ${growthRows.length} wild harvest(s) still healing`);
  }
}
const game = new GameServer(world, accounts);
game.loadCrops(await accounts.loadCrops());
game.loadFarmBins(await accounts.loadFarmBins());
game.loadFarmTroughs(await accounts.loadFarmTroughs());
game.loadLivestockRows(await accounts.loadLivestock());
game.loadStationJobs(await accounts.loadStationJobs());
game.loadFarmApiaries(await accounts.loadFarmApiaries());
game.loadLarderFills(await accounts.loadLarderFills(larderEpoch(Date.now()) - 1));
game.loadSigns(await accounts.loadSigns());
// THE HEARTH WATCH: claim rings derive from EVERY claimed bed, offline
// settlers included — before the first POI decision reads the context.
game.initHomes(await accounts.allHomes());
game.initPois(await accounts.loadPoiCells(), await accounts.loadFrontierCredits(), {
  discovered: await accounts.loadDiscoveredPoiCells(),
  calm: await accounts.loadFrontierCalm(),
  minors: await accounts.loadMinorCells(),
  strongholds: await accounts.loadStrongholds(),
});
for (const zone of zones) {
  if (zone.spawns && zone.spawns.length > 0) game.registerSpawns(zone.spawns, zone.id);
}

// NPC actors, DB-first: authored JSON seeds the relational tables,
// then the runtime roster is read BACK from the DB — the same tables
// dev tools will edit. One validator guards both directions. (Loaded
// in the content phase above so the POI validator saw the live ids;
// registered here, at the same station as always.)
for (const err of actorLoad.errors) console.warn(`[npc] invalid DB actor: ${err}`);
game.registerActors(actorLoad.actors);

// Routines, DB-first under the same truth law — registered BEFORE the
// placements that reference them, so a dangling routine id warns at
// boot instead of failing silently at spawn time.
for (const err of rtnLoad.errors) console.warn(`[npc] invalid DB routine: ${err}`);
game.registerRoutines(rtnLoad.routines);
game.routineSource = () => loadRoutines(db); // /routinereload's live wire
console.log(
  `[npc] routines: ${rtnLoad.routines.length} loaded ` +
    `(+${rtnSeed.added} ~${rtnSeed.updated} !${rtnSeed.kept} -${rtnSeed.removed} =${rtnSeed.unchanged})`,
);

for (const zone of zones) {
  if (zone.actorSpawns && zone.actorSpawns.length > 0) {
    game.registerActorSpawns(zone.actorSpawns, zone.id);
  }
}
console.log(
  `[npc] actors: ${actorLoad.actors.length} loaded ` +
    `(+${actorSync.added} ~${actorSync.updated} !${actorSync.kept} -${actorSync.removed} =${actorSync.unchanged})`,
);

// THE SPOKEN LINE: the clip ledger enters the game before dialogues —
// the resolver answers every beat door from this live map, and the
// Studio's clip routes re-register it on every upload/delete.
const voiceClipLoad = await loadVoiceClips(db);
for (const err of voiceClipLoad.errors) console.warn(`[content] invalid voice clip: ${err}`);
game.registerVoiceClips(voiceClipLoad.clips.map((c) => c.def));
const voiceBankLoad = await loadVoiceBanks(db);
game.registerVoiceBanks(voiceBankLoad);
if (voiceClipLoad.clips.length > 0 || voiceBankLoad.length > 0) {
  console.log(
    `[content] voice: ${voiceClipLoad.clips.length} clip(s), ${voiceBankLoad.length} bank(s) in the ledger`,
  );
}

// Dialogue trees — THE DATABASE IS THE TRUTH. Shipped JSON seeds it
// (respecting every tool edit); the runtime reads only the DB.
const dlgSeed = await seedDialogues(db, [...DIALOGUES.values()]);
const dlgLoad = await loadDialogues(db, { actorIds: game.actorIds() });
for (const err of dlgLoad.errors) console.warn(`[npc] invalid DB dialogue: ${err}`);
game.registerDialogues(dlgLoad.dialogues);
// The live wire for /dlgreload and the Content Studio — validated
// against the LIVE actor roster, so studio-born actors may speak.
game.dialogueSource = () => loadDialogues(db, { actorIds: game.actorIds() });
console.log(
  `[npc] dialogues: ${dlgLoad.dialogues.length} loaded ` +
    `(+${dlgSeed.added} ~${dlgSeed.updated} !${dlgSeed.kept} -${dlgSeed.removed} =${dlgSeed.unchanged})`,
);

// Quests — same DB-truth law, registered last: quest defs cross-ref
// the live actor roster the way dialogue bindings do.
const questSeed = await seedQuests(db, [...QUESTS.values()]);
const questLoad = await loadQuests(db, { actorIds: game.actorIds() });
for (const err of questLoad.errors) console.warn(`[npc] invalid DB quest: ${err}`);
game.registerQuests(questLoad.quests);
game.questSource = () => loadQuests(db, { actorIds: game.actorIds() });
console.log(
  `[npc] quests: ${questLoad.quests.length} loaded ` +
    `(+${questSeed.added} ~${questSeed.updated} !${questSeed.kept} -${questSeed.removed} =${questSeed.unchanged})`,
);

game.start();

// One shared http server: the WebSocket rides it at /ws, and the dev
// maps API (the map editor's save/load/hot-reload wire) answers under
// /dev/maps on the same port.
const mapsApi = createMapsApi(game, builtinZones, db);
const bootedAt = Date.now();
const httpServer = createServer((req, res) => {
  // Liveness probe for supervisor/monitoring — no auth, no state.
  if (req.url === '/healthz') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(
      JSON.stringify({
        ok: true,
        uptimeSec: Math.floor((Date.now() - bootedAt) / 1000),
        players: game.playerCount(),
      }),
    );
    return;
  }
  // Voice clips (read-only, prod-safe, immutable-cached) — the one
  // static thing the game server serves: binaries live in data/voice,
  // which survives deploys the way the Vite web root never does.
  const pathname = (req.url ?? '/').split('?')[0] ?? '/';
  if (serveVoiceFile(req, res, pathname)) return;
  mapsApi(req, res)
    .then((handled) => {
      if (!handled) {
        res.writeHead(404, { 'content-type': 'text/plain' });
        res.end('arx server');
      }
    })
    .catch((err: Error) => {
      if (!res.headersSent) res.writeHead(500, { 'content-type': 'text/plain' });
      res.end(`error: ${err.message}`);
    });
});
const wss = new WebSocketServer({
  server: httpServer,
  path: '/ws',
  // Snapshots are 20Hz and tiny — compression would add per-message
  // CPU + latency for nothing. Explicit so nobody "enables a win".
  perMessageDeflate: false,
  // Clients only ever send small JSON intents (Session drops anything
  // over 4KB after receipt) — without this cap the ws default lets a
  // hostile peer stage a 100MiB frame in server memory first.
  maxPayload: 16 * 1024,
});
httpServer.listen(config.port, config.host);
wss.on('connection', (ws, req) => {
  // Overload fuse + per-IP budgets (concurrent cap, connect rate)
  // BEFORE a Session exists — a refused socket costs us nothing more
  // than the handshake it already spent.
  const ip = clientIp(req);
  if (wss.clients.size > config.maxConnections || !ipGuard.tryConnect(ip)) {
    ws.close(1013, 'try again later');
    return;
  }
  ws.on('close', () => ipGuard.disconnect(ip));
  // KILL NAGLE. Node sockets batch small writes by default; a 20Hz
  // stream of sub-MTU snapshots is Nagle's worst case — it can hold a
  // snapshot back until the previous one is ACKed (+RTT, up to ~40ms
  // added latency on real networks). Localhost hides this entirely,
  // which is why it survives in dev. The single most important line
  // in the transport.
  req.socket.setNoDelay(true);
  new Session(ws, game, ip);
});

console.log(`[server] Arx server listening on ws://${config.host}:${config.port}/ws`);
if (config.fakeLagMs > 0) {
  console.log(`[server] fake lag enabled: ${config.fakeLagMs}ms ± ${config.fakeJitterMs}ms jitter`);
}

function shutdown(): void {
  console.log('[server] shutting down');
  game.stop();
  wss.close();
  httpServer.close();
  // stop() enqueued the final saves — let the FIFO drain before exit.
  db.close()
    .catch(() => undefined)
    .finally(() => process.exit(0));
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
