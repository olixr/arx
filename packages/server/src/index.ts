import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { WebSocketServer } from 'ws';
import {
  DIALOGUES,
  NPC_ACTORS,
  buildBramblewick,
  buildGloomhollow,
  buildHollowStair,
  zoneFromJson,
  type ZoneDef,
  type ZoneJson,
} from '@devcraft/content';
import { config } from './config.js';
import { AccountStore } from './db/accounts.js';
import { openDb } from './db/db.js';
import { loadDialogues, seedDialogues } from './db/dialogues.js';
import { loadNpcActors, syncNpcActors } from './db/npcActors.js';
import { GameServer } from './game/gameServer.js';
import { Session } from './net/session.js';
import { WorldSource } from './world/worldSource.js';

// Authored zones: built-ins from content, plus editor-exported JSON
// dropped into data/maps/. Later zones win where they overlap.
// Bramblewick stays first: WorldSource takes the world spawn from the
// first zone that declares one.
const zones: ZoneDef[] = [buildBramblewick(), buildGloomhollow(), buildHollowStair()];
try {
  const mapsDir = join(config.dataDir, 'maps');
  for (const file of readdirSync(mapsDir).filter((f) => f.endsWith('.json')).sort()) {
    const json = JSON.parse(readFileSync(join(mapsDir, file), 'utf8')) as ZoneJson;
    zones.push(zoneFromJson(json));
    console.log(`[server] loaded zone '${json.id}' from data/maps/${file}`);
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

const wss = new WebSocketServer({
  port: config.port,
  path: '/ws',
  // Snapshots are 20Hz and tiny — compression would add per-message
  // CPU + latency for nothing. Explicit so nobody "enables a win".
  perMessageDeflate: false,
});
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
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
