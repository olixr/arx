import { readFileSync, readdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { WebSocketServer } from 'ws';
import {
  AUTHORED_GEOGRAPHY,
  AUTHORED_LOOT_TABLES,
  AUTHORED_NPCS,
  AUTHORED_POI_DEFS,
  DIALOGUES,
  NPC_ACTORS,
  ROUTINES,
  buildAmberford,
  buildDawnmead,
  buildSilverfall,
  buildUndercroft,
  lootTableErrors,
  replaceGeography,
  replaceLootTables,
  replaceNpcDefs,
  replacePoiDefs,
  validateGeographyDef,
  validateNpcDef,
  validatePoiDef,
  zoneFromJson,
  type LootTableDef,
  type NpcDef,
  type PoiDef,
  type ZoneDef,
  type ZoneJson,
} from '@devcraft/content';
import { config } from './config.js';
import { AccountStore } from './db/accounts.js';
import { loadContentDocs, seedContentDocs } from './db/contentDocs.js';
import { createMapsApi } from './dev/mapsApi.js';
import { openDb } from './db/db.js';
import { loadDialogues, seedDialogues } from './db/dialogues.js';
import { loadNpcActors, syncNpcActors } from './db/npcActors.js';
import { loadRoutines, seedRoutines } from './db/routines.js';
import { GameServer } from './game/gameServer.js';
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

const db = openDb();
const accounts = new AccountStore(db);

// Bestiary + loot tables, DB-first under the two-hash truth law: the
// shipped registries seed content_docs, the runtime reads BACK from
// the DB, and the live module maps are repopulated — every consumer
// resolves through them at call time. Invalid docs are reported and
// the authored def stands in, so a bad tool edit can't brick a boot.
{
  const npcSeed = seedContentDocs(
    db,
    'npc',
    [...AUTHORED_NPCS.values()].map((d) => ({ id: d.id, doc: d })),
  );
  const lootSeed = seedContentDocs(
    db,
    'loot',
    [...AUTHORED_LOOT_TABLES.values()].map((t) => ({ id: t.id, doc: t })),
  );
  const lootDocs = loadContentDocs(db, 'loot');
  const lootDefs = lootDocs.map((d) => d.doc as LootTableDef);
  const lootProblems = lootTableErrors(lootDefs);
  if (lootProblems.length > 0) {
    console.warn(`[content] DB loot tables invalid (${lootProblems[0]}) — authored set stands`);
  } else {
    replaceLootTables(lootDefs);
  }
  const lootIds = new Set((lootProblems.length > 0 ? [...AUTHORED_LOOT_TABLES.keys()] : lootDefs.map((t) => t.id)));
  const npcDocs = loadContentDocs(db, 'npc');
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
  const poiSeed = seedContentDocs(
    db,
    'poi',
    [...AUTHORED_POI_DEFS.values()].map((d) => ({ id: d.id, doc: d })),
  );
  const poiDocs = loadContentDocs(db, 'poi');
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
  seedContentDocs(db, 'geography', [{ id: 'world', doc: AUTHORED_GEOGRAPHY }]);
  const geoDocs = loadContentDocs(db, 'geography');
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
}

const world = new WorldSource(config.worldSeed, zones);
for (const built of accounts.loadBuiltTiles()) {
  world.registerBuilt(built.tx, built.ty, built.tile, built.owner, built.prevTile);
}
const game = new GameServer(world, accounts);
game.loadCrops(accounts.loadCrops());
game.initPois(accounts.loadPoiCells());
for (const zone of zones) {
  if (zone.spawns && zone.spawns.length > 0) game.registerSpawns(zone.spawns, zone.id);
}

// NPC actors, DB-first: authored JSON seeds the relational tables,
// then the runtime roster is read BACK from the DB — the same tables
// dev tools will edit. One validator guards both directions.
const actorSync = syncNpcActors(db, [...NPC_ACTORS.values()]);
const actorLoad = loadNpcActors(db);
for (const err of actorLoad.errors) console.warn(`[npc] invalid DB actor: ${err}`);
game.registerActors(actorLoad.actors);

// Routines, DB-first under the same truth law — registered BEFORE the
// placements that reference them, so a dangling routine id warns at
// boot instead of failing silently at spawn time.
const rtnSeed = seedRoutines(db, [...ROUTINES.values()]);
const rtnLoad = loadRoutines(db);
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
const dlgSeed = seedDialogues(db, [...DIALOGUES.values()]);
const dlgLoad = loadDialogues(db, { actorIds: game.actorIds() });
for (const err of dlgLoad.errors) console.warn(`[npc] invalid DB dialogue: ${err}`);
game.registerDialogues(dlgLoad.dialogues);
// The live wire for /dlgreload and the Content Studio — validated
// against the LIVE actor roster, so studio-born actors may speak.
game.dialogueSource = () => loadDialogues(db, { actorIds: game.actorIds() });
console.log(
  `[npc] dialogues: ${dlgLoad.dialogues.length} loaded ` +
    `(+${dlgSeed.added} ~${dlgSeed.updated} !${dlgSeed.kept} -${dlgSeed.removed} =${dlgSeed.unchanged})`,
);

game.start();

// One shared http server: the WebSocket rides it at /ws, and the dev
// maps API (the map editor's save/load/hot-reload wire) answers under
// /dev/maps on the same port.
const mapsApi = createMapsApi(game, builtinZones, db);
const httpServer = createServer((req, res) => {
  mapsApi(req, res)
    .then((handled) => {
      if (!handled) {
        res.writeHead(404, { 'content-type': 'text/plain' });
        res.end('devcraft server');
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
httpServer.listen(config.port);
wss.on('connection', (ws, req) => {
  // KILL NAGLE. Node sockets batch small writes by default; a 20Hz
  // stream of sub-MTU snapshots is Nagle's worst case — it can hold a
  // snapshot back until the previous one is ACKed (+RTT, up to ~40ms
  // added latency on real networks). Localhost hides this entirely,
  // which is why it survives in dev. The single most important line
  // in the transport.
  req.socket.setNoDelay(true);
  new Session(ws, game);
});

console.log(`[server] DevCraft server listening on ws://localhost:${config.port}/ws`);
if (config.fakeLagMs > 0) {
  console.log(`[server] fake lag enabled: ${config.fakeLagMs}ms ± ${config.fakeJitterMs}ms jitter`);
}

function shutdown(): void {
  console.log('[server] shutting down');
  game.stop();
  wss.close();
  httpServer.close();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
