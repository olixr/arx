import { mkdirSync } from 'node:fs';
import { readFile, readdir, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { DatabaseSync } from 'node:sqlite';
import {
  AUTHORED_LOOT_TABLES,
  AUTHORED_NPCS,
  ITEMS,
  LOOT_TABLES,
  NPCS,
  NPC_ACTORS,
  lootTableErrors,
  prefabFromJson,
  prefabToJson,
  replaceLootTables,
  replaceNpcDefs,
  validateNpcDef,
  zoneFromJson,
  zoneToJson,
  type LootTableDef,
  type NpcActorDef,
  type NpcDef,
  type PrefabJson,
  type ZoneDef,
  type ZoneJson,
} from '@devcraft/content';
import { config } from '../config.js';
import {
  importContentDoc,
  loadContentDocs,
  revertContentDoc,
} from '../db/contentDocs.js';
import { editedActorSlugs, importNpcActor, loadNpcActors, revertNpcActor } from '../db/npcActors.js';
import type { GameServer } from '../game/gameServer.js';

/**
 * The map editor's server side: a small dev-gated HTTP API over
 * data/maps/*.json plus live zone hot-reload. The editor talks to the
 * SAME world players are standing in — a save lands on disk (so the
 * next boot agrees) and swaps into the running WorldSource in the same
 * breath, restreaming the zone's chunks to every connected client.
 *
 *   GET    /dev/maps               list live zones (+ whether a file backs them)
 *   GET    /dev/maps/zone/<id>     ZoneJson of the live zone
 *   PUT    /dev/maps/zone/<id>     validate, write data/maps/<id>.json, hot-reload
 *   DELETE /dev/maps/zone/<id>     remove override file; builtins revert to code
 *   GET    /dev/registry           live pick lists (npc archetypes, actors, routines)
 *   GET    /dev/prefabs            list the shared POI prefab library
 *   GET    /dev/prefabs/<id>       one PrefabJson from data/prefabs/
 *   PUT    /dev/prefabs/<id>       validate + write data/prefabs/<id>.json
 *   DELETE /dev/prefabs/<id>       remove a prefab from the library
 *
 * Gated on config.devCommands — the same switch as the chat dev
 * commands — and open CORS, so the Vite-served editor can reach a
 * server on another port during development.
 */

const ID_RE = /^[a-z][a-z0-9_-]{0,63}$/;
const MAX_BODY = 32 * 1024 * 1024;
/** Hard cap on authored zone dims — a fat-fingered width shouldn't OOM the server. */
const MAX_DIM = 512;

export type MapsApiHandler = (req: IncomingMessage, res: ServerResponse) => Promise<boolean>;

export function createMapsApi(
  game: GameServer,
  builtinZones: ReadonlyMap<string, ZoneDef>,
  db: DatabaseSync,
): MapsApiHandler {
  const mapsDir = join(config.dataDir, 'maps');

  const sendJson = (res: ServerResponse, status: number, body: unknown): void => {
    const text = JSON.stringify(body);
    res.writeHead(status, {
      'content-type': 'application/json',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, PUT, DELETE, OPTIONS',
      'access-control-allow-headers': 'content-type',
    });
    res.end(text);
  };

  const readBody = (req: IncomingMessage): Promise<string> =>
    new Promise((resolve, reject) => {
      let size = 0;
      const parts: Buffer[] = [];
      req.on('data', (part: Buffer) => {
        size += part.length;
        if (size > MAX_BODY) {
          reject(new Error('body too large'));
          req.destroy();
          return;
        }
        parts.push(part);
      });
      req.on('end', () => resolve(Buffer.concat(parts).toString('utf8')));
      req.on('error', reject);
    });

  const fileIds = async (): Promise<Set<string>> => {
    try {
      const files = await readdir(mapsDir);
      return new Set(
        files.filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -'.json'.length)),
      );
    } catch {
      return new Set();
    }
  };

  const prefabsDir = join(config.dataDir, 'prefabs');

  return async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const isDev =
      url.pathname === '/dev/maps' ||
      url.pathname.startsWith('/dev/maps/') ||
      url.pathname === '/dev/registry' ||
      url.pathname === '/dev/prefabs' ||
      url.pathname.startsWith('/dev/prefabs/') ||
      url.pathname.startsWith('/dev/content/');
    if (!isDev) return false;

    if (req.method === 'OPTIONS') {
      sendJson(res, 204, {});
      return true;
    }
    if (!config.devCommands) {
      sendJson(res, 403, { error: 'dev commands are disabled on this server' });
      return true;
    }

    try {
      if (url.pathname === '/dev/registry' && req.method === 'GET') {
        sendJson(res, 200, game.registrySnapshot());
        return true;
      }

      // ------------------------------------------------ content CMS
      // Bestiary and loot tables are DB-first content_docs; actors
      // ride their relational tables. Every write validates against
      // the FULL candidate world, imports as a tool-owned row, swaps
      // the live registry, and retires standing bodies so the world
      // reflects the edit within a tick.

      if (url.pathname === '/dev/content/npcs' && req.method === 'GET') {
        const edited = new Set(
          loadContentDocs(db, 'npc').filter((d) => d.edited).map((d) => d.id),
        );
        sendJson(res, 200, {
          npcs: [...NPCS.values()].map((d) => ({
            def: d,
            edited: edited.has(d.id),
            authored: AUTHORED_NPCS.has(d.id),
          })),
        });
        return true;
      }

      const npcMatch = /^\/dev\/content\/npcs\/([^/]+)$/.exec(url.pathname);
      if (npcMatch) {
        const id = npcMatch[1]!;
        if (req.method === 'PUT') {
          let doc: NpcDef;
          try {
            doc = JSON.parse(await readBody(req)) as NpcDef;
            if (doc.id !== id) throw new Error(`body id '${doc.id}' does not match URL '${id}'`);
          } catch (err) {
            sendJson(res, 400, { error: (err as Error).message });
            return true;
          }
          const npcIds = new Set(NPCS.keys());
          npcIds.add(id);
          const errors = validateNpcDef(doc, {
            lootTables: new Set(LOOT_TABLES.keys()),
            npcIds,
          });
          if (errors.length > 0) {
            sendJson(res, 400, { error: errors.join('; ') });
            return true;
          }
          importContentDoc(db, 'npc', id, doc);
          const next = new Map(NPCS);
          next.set(id, doc);
          replaceNpcDefs(next.values());
          game.reloadNpcDef(id);
          console.log(`[content] npc '${id}' saved + live`);
          sendJson(res, 200, { ok: true });
          return true;
        }
        if (req.method === 'DELETE') {
          const authored = AUTHORED_NPCS.get(id) ?? null;
          const outcome = revertContentDoc(db, 'npc', id, authored);
          const next = new Map(NPCS);
          if (authored) next.set(id, authored);
          else next.delete(id);
          replaceNpcDefs(next.values());
          game.reloadNpcDef(id);
          console.log(`[content] npc '${id}' ${outcome}`);
          sendJson(res, 200, { ok: true, outcome });
          return true;
        }
      }

      if (url.pathname === '/dev/content/loot' && req.method === 'GET') {
        const edited = new Set(
          loadContentDocs(db, 'loot').filter((d) => d.edited).map((d) => d.id),
        );
        sendJson(res, 200, {
          tables: [...LOOT_TABLES.values()].map((t) => ({
            def: t,
            edited: edited.has(t.id),
            authored: AUTHORED_LOOT_TABLES.has(t.id),
          })),
        });
        return true;
      }

      const lootMatch = /^\/dev\/content\/loot\/([^/]+)$/.exec(url.pathname);
      if (lootMatch) {
        const id = lootMatch[1]!;
        if (req.method === 'PUT') {
          let doc: LootTableDef;
          try {
            doc = JSON.parse(await readBody(req)) as LootTableDef;
            if (doc.id !== id) throw new Error(`body id '${doc.id}' does not match URL '${id}'`);
          } catch (err) {
            sendJson(res, 400, { error: (err as Error).message });
            return true;
          }
          // Validate the whole world with the candidate swapped in —
          // dangling refs and cycles surface here, not at roll time.
          const candidate = new Map(LOOT_TABLES);
          candidate.set(id, doc);
          const errors = lootTableErrors([...candidate.values()]);
          if (errors.length > 0) {
            sendJson(res, 400, { error: errors.join('; ') });
            return true;
          }
          importContentDoc(db, 'loot', id, doc);
          replaceLootTables(candidate.values());
          console.log(`[content] loot table '${id}' saved + live`);
          sendJson(res, 200, { ok: true });
          return true;
        }
        if (req.method === 'DELETE') {
          const authored = AUTHORED_LOOT_TABLES.get(id) ?? null;
          const candidate = new Map(LOOT_TABLES);
          if (authored) candidate.set(id, authored);
          else candidate.delete(id);
          const errors = lootTableErrors([...candidate.values()]);
          if (errors.length > 0) {
            sendJson(res, 400, {
              error: `cannot remove — still referenced: ${errors[0]}`,
            });
            return true;
          }
          const outcome = revertContentDoc(db, 'loot', id, authored);
          replaceLootTables(candidate.values());
          console.log(`[content] loot table '${id}' ${outcome}`);
          sendJson(res, 200, { ok: true, outcome });
          return true;
        }
      }

      if (url.pathname === '/dev/content/actors' && req.method === 'GET') {
        const load = loadNpcActors(db);
        const edited = editedActorSlugs(db);
        sendJson(res, 200, {
          actors: load.actors.map((a) => ({
            def: a,
            edited: edited.has(a.id),
            authored: NPC_ACTORS.has(a.id),
          })),
          errors: load.errors,
        });
        return true;
      }

      const actorMatch = /^\/dev\/content\/actors\/([^/]+)$/.exec(url.pathname);
      if (actorMatch) {
        const slug = actorMatch[1]!;
        if (req.method === 'PUT') {
          let raw: { id?: string };
          try {
            raw = JSON.parse(await readBody(req)) as { id?: string };
            if (raw.id !== slug) throw new Error(`body id '${raw.id}' does not match URL '${slug}'`);
          } catch (err) {
            sendJson(res, 400, { error: (err as Error).message });
            return true;
          }
          let actor: NpcActorDef;
          try {
            actor = importNpcActor(db, raw);
          } catch (err) {
            sendJson(res, 400, { error: (err as Error).message });
            return true;
          }
          game.reloadActorDef(slug, actor);
          console.log(`[content] actor '${slug}' saved + live`);
          sendJson(res, 200, { ok: true });
          return true;
        }
        if (req.method === 'DELETE') {
          const authored = NPC_ACTORS.get(slug) ?? null;
          const outcome = revertNpcActor(db, slug, authored);
          game.reloadActorDef(slug, authored);
          console.log(`[content] actor '${slug}' ${outcome}`);
          sendJson(res, 200, { ok: true, outcome });
          return true;
        }
      }

      if (url.pathname === '/dev/content/items' && req.method === 'GET') {
        sendJson(res, 200, {
          items: [...ITEMS.values()].map((i) => ({
            id: i.id,
            name: i.name,
            value: i.value,
            stackable: i.stackable,
            slot: i.gear?.slot ?? i.equipSlot ?? null,
            desc: i.desc ?? null,
          })),
        });
        return true;
      }

      if (url.pathname === '/dev/content/usage' && req.method === 'GET') {
        sendJson(res, 200, game.spawnSiteSnapshot());
        return true;
      }

      if (url.pathname === '/dev/prefabs' && req.method === 'GET') {
        const prefabs: Array<{
          id: string;
          name: string;
          width: number;
          height: number;
          portals: number;
          spawns: number;
          actorSpawns: number;
        }> = [];
        try {
          for (const file of (await readdir(prefabsDir)).filter((f) => f.endsWith('.json'))) {
            try {
              const json = JSON.parse(
                await readFile(join(prefabsDir, file), 'utf8'),
              ) as PrefabJson;
              prefabs.push({
                id: json.id,
                name: json.name,
                width: json.width,
                height: json.height,
                portals: json.portals?.length ?? 0,
                spawns: json.spawns?.length ?? 0,
                actorSpawns: json.actorSpawns?.length ?? 0,
              });
            } catch {
              // A bad file shouldn't hide the rest of the library.
            }
          }
        } catch {
          // No prefabs dir yet — empty library.
        }
        prefabs.sort((a, b) => a.name.localeCompare(b.name));
        sendJson(res, 200, { prefabs });
        return true;
      }

      const prefabMatch = /^\/dev\/prefabs\/([^/]+)$/.exec(url.pathname);
      if (prefabMatch) {
        const id = prefabMatch[1]!;
        if (!ID_RE.test(id)) {
          sendJson(res, 400, { error: `prefab id must match ${ID_RE}` });
          return true;
        }
        if (req.method === 'GET') {
          try {
            const text = await readFile(join(prefabsDir, `${id}.json`), 'utf8');
            res.writeHead(200, {
              'content-type': 'application/json',
              'access-control-allow-origin': '*',
            });
            res.end(text);
          } catch {
            sendJson(res, 404, { error: `no prefab '${id}'` });
          }
          return true;
        }
        if (req.method === 'PUT') {
          let json: PrefabJson;
          try {
            json = JSON.parse(await readBody(req)) as PrefabJson;
            if (json.id !== id) throw new Error(`body id '${json.id}' does not match URL '${id}'`);
            prefabFromJson(json); // full validation round-trip
          } catch (err) {
            sendJson(res, 400, { error: (err as Error).message });
            return true;
          }
          mkdirSync(prefabsDir, { recursive: true });
          await writeFile(
            join(prefabsDir, `${id}.json`),
            JSON.stringify(prefabToJson(prefabFromJson(json)), null, 2),
          );
          console.log(`[maps] saved prefab '${id}' (${json.width}x${json.height})`);
          sendJson(res, 200, { ok: true });
          return true;
        }
        if (req.method === 'DELETE') {
          try {
            await unlink(join(prefabsDir, `${id}.json`));
            console.log(`[maps] deleted prefab '${id}'`);
            sendJson(res, 200, { ok: true });
          } catch {
            sendJson(res, 404, { error: `no prefab '${id}'` });
          }
          return true;
        }
      }
      if (url.pathname === '/dev/maps' && req.method === 'GET') {
        const onDisk = await fileIds();
        const zones = game.world.zoneDefs.map((z) => ({
          id: z.id,
          name: z.name,
          width: z.width,
          height: z.height,
          origin: z.origin,
          spawn: z.spawn ?? null,
          builtin: builtinZones.has(z.id),
          hasFile: onDisk.has(z.id),
          actorSpawns: z.actorSpawns?.length ?? 0,
          npcSpawns: z.spawns?.length ?? 0,
          portals: z.portals?.length ?? 0,
        }));
        // Files on disk that never loaded (dropped in after boot with
        // a bad parse, say) still deserve a row the editor can open.
        const liveIds = new Set(zones.map((z) => z.id));
        const orphans = [...onDisk].filter((id) => !liveIds.has(id));
        sendJson(res, 200, { zones, orphans });
        return true;
      }

      const zoneMatch = /^\/dev\/maps\/zone\/([^/]+)$/.exec(url.pathname);
      if (zoneMatch) {
        const id = zoneMatch[1]!;
        if (!ID_RE.test(id)) {
          sendJson(res, 400, { error: `zone id must match ${ID_RE}` });
          return true;
        }

        if (req.method === 'GET') {
          const live = game.world.zoneById(id);
          if (live) {
            sendJson(res, 200, zoneToJson(live));
            return true;
          }
          // Fall back to disk for orphan files.
          try {
            const text = await readFile(join(mapsDir, `${id}.json`), 'utf8');
            res.writeHead(200, {
              'content-type': 'application/json',
              'access-control-allow-origin': '*',
            });
            res.end(text);
          } catch {
            sendJson(res, 404, { error: `no zone '${id}'` });
          }
          return true;
        }

        if (req.method === 'PUT') {
          let zone: ZoneDef;
          try {
            const json = JSON.parse(await readBody(req)) as ZoneJson;
            if (json.id !== id) throw new Error(`body id '${json.id}' does not match URL '${id}'`);
            if (json.width > MAX_DIM || json.height > MAX_DIM) {
              throw new Error(`zone dims ${json.width}x${json.height} exceed ${MAX_DIM}`);
            }
            zone = zoneFromJson(json);
          } catch (err) {
            sendJson(res, 400, { error: (err as Error).message });
            return true;
          }
          mkdirSync(mapsDir, { recursive: true });
          await writeFile(
            join(mapsDir, `${id}.json`),
            JSON.stringify(zoneToJson(zone), null, 2),
          );
          game.reloadZone(zone);
          console.log(
            `[maps] saved + hot-reloaded zone '${id}' ` +
              `(${zone.width}x${zone.height} at ${zone.origin.x},${zone.origin.y})`,
          );
          sendJson(res, 200, { ok: true, reloaded: true });
          return true;
        }

        if (req.method === 'DELETE') {
          try {
            await unlink(join(mapsDir, `${id}.json`));
          } catch {
            // No file — deleting a never-saved builtin is a no-op below.
          }
          const builtin = builtinZones.get(id);
          if (builtin) {
            // The override file is gone: put the shipped zone back live.
            game.reloadZone(builtin);
            sendJson(res, 200, { ok: true, reverted: 'builtin' });
          } else {
            game.unloadZone(id);
            sendJson(res, 200, { ok: true, unloaded: true });
          }
          console.log(`[maps] deleted zone override '${id}'`);
          return true;
        }
      }

      sendJson(res, 404, { error: 'unknown maps endpoint' });
      return true;
    } catch (err) {
      sendJson(res, 500, { error: (err as Error).message });
      return true;
    }
  };
}
