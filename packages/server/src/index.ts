import { readFileSync, readdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { WebSocketServer } from 'ws';
import {
  DIALOGUES,
  NPC_ACTORS,
  ROUTINES,
  buildBramblewick,
  buildGloomhollow,
  buildHollowStair,
  zoneFromJson,
  type ZoneDef,
  type ZoneJson,
} from '@devcraft/content';
import { config } from './config.js';
import { AccountStore } from './db/accounts.js';
import { createMapsApi } from './dev/mapsApi.js';
import { openDb } from './db/db.js';
import { loadDialogues, seedDialogues } from './db/dialogues.js';
import { loadNpcActors, syncNpcActors } from './db/npcActors.js';
import { loadRoutines, seedRoutines } from './db/routines.js';
import { GameServer } from './game/gameServer.js';
import { Session } from './net/session.js';
import { WorldSource } from './world/worldSource.js';

// Authored zones: built-ins from content, plus map-editor JSON saved
// in data/maps/. Later zones win where they overlap. Bramblewick
// stays first: WorldSource takes the world spawn from the first zone
// that declares one. A file whose id matches a built-in REPLACES it
// in place (same overlay slot) — that's how an edited town ships.
const builtinZones = new Map<string, ZoneDef>(
  [buildBramblewick(), buildGloomhollow(), buildHollowStair()].map((z) => [z.id, z]),
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
const world = new WorldSource(config.worldSeed, zones);
for (const built of accounts.loadBuiltTiles()) {
  world.registerBuilt(built.tx, built.ty, built.tile, built.owner, built.prevTile);
}
const game = new GameServer(world, accounts);
game.loadCrops(accounts.loadCrops());
for (const zone of zones) {
  if (zone.spawns && zone.spawns.length > 0) game.registerSpawns(zone.spawns);
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
  if (zone.actorSpawns && zone.actorSpawns.length > 0) game.registerActorSpawns(zone.actorSpawns);
}
console.log(
  `[npc] actors: ${actorLoad.actors.length} loaded ` +
    `(+${actorSync.added} ~${actorSync.updated} -${actorSync.removed} =${actorSync.unchanged})`,
);

// Dialogue trees — THE DATABASE IS THE TRUTH. Shipped JSON seeds it
// (respecting every tool edit); the runtime reads only the DB.
const dlgSeed = seedDialogues(db, [...DIALOGUES.values()]);
const dlgLoad = loadDialogues(db);
for (const err of dlgLoad.errors) console.warn(`[npc] invalid DB dialogue: ${err}`);
game.registerDialogues(dlgLoad.dialogues);
game.dialogueSource = () => loadDialogues(db); // /dlgreload's live wire
console.log(
  `[npc] dialogues: ${dlgLoad.dialogues.length} loaded ` +
    `(+${dlgSeed.added} ~${dlgSeed.updated} !${dlgSeed.kept} -${dlgSeed.removed} =${dlgSeed.unchanged})`,
);

game.start();

// One shared http server: the WebSocket rides it at /ws, and the dev
// maps API (the map editor's save/load/hot-reload wire) answers under
// /dev/maps on the same port.
const mapsApi = createMapsApi(game, builtinZones);
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
