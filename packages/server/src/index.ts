import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { WebSocketServer } from 'ws';
import {
  buildBramblewick,
  buildGloomhollow,
  zoneFromJson,
  type ZoneDef,
  type ZoneJson,
} from '@devcraft/content';
import { config } from './config.js';
import { AccountStore } from './db/accounts.js';
import { openDb } from './db/db.js';
import { GameServer } from './game/gameServer.js';
import { Session } from './net/session.js';
import { WorldSource } from './world/worldSource.js';

// Authored zones: built-ins from content, plus editor-exported JSON
// dropped into data/maps/. Later zones win where they overlap.
const zones: ZoneDef[] = [buildBramblewick(), buildGloomhollow()];
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
  world.registerBuilt(built.tx, built.ty, built.tile, built.owner);
}
const game = new GameServer(world, accounts);
game.loadCrops(accounts.loadCrops());
for (const zone of zones) {
  if (zone.spawns && zone.spawns.length > 0) game.registerSpawns(zone.spawns);
}
game.start();

const wss = new WebSocketServer({ port: config.port, path: '/ws' });
wss.on('connection', (ws) => {
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
