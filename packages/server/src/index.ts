import { readFileSync, readdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { WebSocketServer } from 'ws';
import {
  AUTHORED_FACTIONS,
  AUTHORED_FRONTIER,
  AUTHORED_GEOGRAPHY,
  AUTHORED_LOOT_TABLES,
  AUTHORED_NPCS,
  AUTHORED_POI_DEFS,
  DIALOGUES,
  NPC_ACTORS,
  QUESTS,
  ROUTINES,
  buildAmberford,
  buildDawnmead,
  buildSilverfall,
  buildUndercroft,
  lootTableErrors,
  replaceFactions,
  replaceFrontier,
  replaceGeography,
  replaceLootTables,
  replaceNpcDefs,
  replacePoiDefs,
  validateFactions,
  validateFrontier,
  validateGeographyDef,
  validateNpcDef,
  validatePoiDef,
  zoneFromJson,
  type LootTableDef,
  type NpcDef,
  type PoiDef,
  type ZoneDef,
  type ZoneJson,
} from '@arx/content';
import { config } from './config.js';
import { AccountStore } from './db/accounts.js';
import { loadContentDocs, seedContentDocs } from './db/contentDocs.js';
import { createMapsApi } from './dev/mapsApi.js';
import { openDb } from './db/db.js';
import { loadDialogues, seedDialogues } from './db/dialogues.js';
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
  [buildDawnmead(), buildAmberford(), buildSilverfall(), buildUndercroft()].map((z) => [z.id, z]),
);
const zones: ZoneDef[] = [...builtinZones.values()];
try {
  const mapsDir = join(config.dataDir, 'maps');
  for (const file of readdirSync(mapsDir).filter((f) => f.endsWith('.json')).sort()) {
    try {
      const json = JSON.parse(readFileSync(join(mapsDir, file), 'utf8')) as ZoneJson;
      const zone = zoneFromJson(json);
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
    const res = validatePoiDef(docRow.doc);
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
const game = new GameServer(world, accounts);
game.loadCrops(await accounts.loadCrops());
game.loadSigns(await accounts.loadSigns());
// THE HEARTH WATCH: claim rings derive from EVERY claimed bed, offline
// settlers included — before the first POI decision reads the context.
game.initHomes(await accounts.allHomes());
game.initPois(await accounts.loadPoiCells(), await accounts.loadFrontierCredits(), {
  discovered: await accounts.loadDiscoveredPoiCells(),
  calm: await accounts.loadFrontierCalm(),
});
for (const zone of zones) {
  if (zone.spawns && zone.spawns.length > 0) game.registerSpawns(zone.spawns, zone.id);
}

// NPC actors, DB-first: authored JSON seeds the relational tables,
// then the runtime roster is read BACK from the DB — the same tables
// dev tools will edit. One validator guards both directions.
const actorSync = await syncNpcActors(db, [...NPC_ACTORS.values()]);
const actorLoad = await loadNpcActors(db);
for (const err of actorLoad.errors) console.warn(`[npc] invalid DB actor: ${err}`);
game.registerActors(actorLoad.actors);

// Routines, DB-first under the same truth law — registered BEFORE the
// placements that reference them, so a dangling routine id warns at
// boot instead of failing silently at spawn time.
const rtnSeed = await seedRoutines(db, [...ROUTINES.values()]);
const rtnLoad = await loadRoutines(db);
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
