import { mkdirSync } from 'node:fs';
import { readFile, readdir, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Db } from '../db/db.js';
import {
  AUTHORED_FACTIONS,
  AUTHORED_FRONTIER,
  AUTHORED_STANCES,
  AUTHORED_GROWTH,
  AUTHORED_GEOGRAPHY,
  AUTHORED_LOOT_TABLES,
  AUTHORED_MINOR_DEFS,
  AUTHORED_NODES,
  AUTHORED_NPCS,
  AUTHORED_POI_DEFS,
  AUTHORED_STRONGHOLDS,
  STRONGHOLD_DEFS,
  FAMILY_STYLES,
  genStronghold,
  replaceStrongholds,
  validateStronghold,
  MINOR_DEFS,
  familiesOf,
  DIALOGUES,
  ITEMS,
  LOOT_TABLES,
  NODES,
  NPCS,
  NPC_ACTORS,
  FACTIONS,
  FRONTIER,
  GROWTH,
  POI_DEFS,
  ZONE_EDGE_PROFILES,
  elevationAt,
  geographySnapshot,
  replaceFactions,
  replaceFrontier,
  replaceGrowth,
  replaceStances,
  STANCES,
  ARENAS,
  AUTHORED_ARENAS,
  replaceArenas,
  validateArenas,
  arenaValidateRefsNow,
  geographyWarnings,
  ROAD_SPAN_MAX,
  TRAIL_SPAN_MAX,
  routeBridgeDecks,
  packZoneEdgeProfile,
  lootTableErrors,
  prefabFromJson,
  prefabToJson,
  replaceLootTables,
  replaceMinorDefs,
  replaceNodes,
  replaceNpcDefs,
  replacePoiDefs,
  validateFactions,
  validateFrontier,
  validateStances,
  validateGrowth,
  validateGeographyDef,
  validateMinorDef,
  validateNodeDoc,
  validateNpcDef,
  validatePoiDef,
  validateVoice,
  validateVoiceBank,
  validateVoiceClip,
  AUTHORED_VOICE,
  VOICE,
  VOICE_EXTS,
  replaceVoice,
  voiceClipUrl,
  zoneFromJson,
  zoneToJson,
  validateZone,
  type VoiceExt,
  type GeographyDef,
  type LootTableDef,
  type NpcActorDef,
  type NpcDef,
  type PoiDef,
  type PrefabJson,
  type ZoneDef,
  type ZoneJson,
} from '@arx/content';
import { hashString } from '@arx/shared';
import { config } from '../config.js';
import {
  importContentDoc,
  loadContentDocs,
  revertContentDoc,
} from '../db/contentDocs.js';
import {
  editedDialogueIds,
  importDialogue,
  loadDialogues,
  revertDialogue,
} from '../db/dialogues.js';
import { editedActorSlugs, importNpcActor, loadNpcActors, revertNpcActor } from '../db/npcActors.js';
import {
  deleteVoiceBank,
  deleteVoiceClip,
  importVoiceClip,
  loadVoiceBanks,
  loadVoiceClips,
  saveVoiceBank,
} from '../db/voice.js';
import { saveVoiceFile, unlinkVoiceFile } from '../voice/store.js';
import { previewPoi } from '../world/pois.js';
import { composeStronghold } from '../world/strongholds.js';
import { simulateLandSteps, type LandSimStats } from '../world/finds.js';
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
 *   GET    /dev/content/voice      the whole clip ledger: clips + banks + dials
 *   PUT    /dev/content/voice/clips/<id>   upload (JSON w/ base64 audio) or metadata edit
 *   DELETE /dev/content/voice/clips/<id>   delete; 409s while referenced; orphans unlink
 *   PUT    /dev/content/voice/banks/<kind>/<id>   replace an owner's whole bank card
 *   DELETE /dev/content/voice/banks/<kind>/<id>   clear it
 *   GET/PUT/DELETE /dev/content/voice/dials       the 'voice' singleton (frontier skeleton)
 *
 * Gated on config.devCommands — the same switch as the chat dev
 * commands — and open CORS, so the Vite-served editor can reach a
 * server on another port during development.
 */

const ID_RE = /^[a-z][a-z0-9_-]{0,63}$/;
const MAX_BODY = 32 * 1024 * 1024;
/** Hard cap on authored zone dims — a fat-fingered width shouldn't OOM the server. */
const MAX_DIM = 512;

/**
 * THE COUNSEL PAYS ONCE (core-audit debt 12): geographyWarnings walks
 * every route point through the elevation field — 10^5..10^6 fbm
 * evals, tens of ms — SYNCHRONOUSLY on the game event loop, and the
 * Studio's World view POLLS the routes that serve it. The survey is
 * pure in (def, seed), so an identical doc gets its cached answer,
 * keyed by a content hash of the def (length + FNV over the JSON —
 * cheap next to one fbm pass). Capped tiny FIFO: the working set is
 * "the live doc and the doc just saved", never a library. THE SPAN
 * LAW GROWS TEETH stays OUTSIDE this cache on purpose — the PUT's
 * deck gate judges CANDIDATE docs and must always run fresh.
 */
const WARNINGS_CACHE_CAP = 4;
const warningsCache = new Map<string, string[]>();

function cachedGeographyWarnings(def: GeographyDef): string[] {
  const json = JSON.stringify(def);
  const key = `${config.worldSeed}:${json.length}:${hashString(json)}`;
  const hit = warningsCache.get(key);
  if (hit) return hit;
  const warnings = geographyWarnings(def, config.worldSeed, (x, y) =>
    elevationAt(config.worldSeed, x, y),
  );
  if (warningsCache.size >= WARNINGS_CACHE_CAP) {
    warningsCache.delete(warningsCache.keys().next().value!);
  }
  warningsCache.set(key, warnings);
  return warnings;
}

export type MapsApiHandler = (req: IncomingMessage, res: ServerResponse) => Promise<boolean>;

export function createMapsApi(
  game: GameServer,
  builtinZones: ReadonlyMap<string, ZoneDef>,
  db: Db,
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
      url.pathname === '/dev/world' ||
      url.pathname === '/dev/prefabs' ||
      url.pathname.startsWith('/dev/prefabs/') ||
      url.pathname.startsWith('/dev/content/') ||
      url.pathname.startsWith('/dev/pois/') ||
      url.pathname.startsWith('/dev/strongholds/');
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

      // ------------------------------------------------ the world
      // One read for the World view: seed (the editor runs the same
      // worldgen), the POI ledger with live/authored states, and the
      // geography plan with its advisory warnings.
      if (url.pathname === '/dev/world' && req.method === 'GET') {
        const snap = game.worldSnapshot();
        const def = geographySnapshot();
        const edited =
          (await loadContentDocs(db, 'geography')).find((d) => d.id === 'world')?.edited ?? false;
        sendJson(res, 200, {
          ...snap,
          geography: def,
          geographyEdited: edited,
          warnings: cachedGeographyWarnings(def),
          // The edge-harmony registry, packed — the editor mirrors it
          // so its client-side worldgen blends exactly like the server.
          edgeProfiles: ZONE_EDGE_PROFILES.map(packZoneEdgeProfile),
          poiDefs: [...POI_DEFS.values()].map((d) => ({
            id: d.id,
            name: d.name,
            weight: d.weight,
            tiers: d.tiers,
            haven: d.haven?.safeR ?? null,
            family: d.family ?? null,
            compound: d.compound !== undefined,
          })),
          // THE ONE ATLAS (Phase 6): the countries, for the territory
          // wash — derived from the live def roster, same as every lean.
          families: familiesOf([...POI_DEFS.values()]),
        });
        return true;
      }

      // ------------------------------------------------ geography
      // The whole plan is ONE document under the two-hash law. A save
      // swaps the live registry, regenerates the world, restreams
      // every client, and re-surveys the POI ledger in the same breath.
      if (url.pathname === '/dev/content/geography') {
        if (req.method === 'GET') {
          const def = geographySnapshot();
          const edited =
            (await loadContentDocs(db, 'geography')).find((d) => d.id === 'world')?.edited ?? false;
          sendJson(res, 200, {
            def,
            edited,
            warnings: cachedGeographyWarnings(def),
          });
          return true;
        }
        if (req.method === 'PUT') {
          let raw: unknown;
          try {
            raw = JSON.parse(await readBody(req));
          } catch (err) {
            sendJson(res, 400, { error: (err as Error).message });
            return true;
          }
          const result = validateGeographyDef(raw, { poiDefIds: new Set(POI_DEFS.keys()) });
          if (!result.ok) {
            sendJson(res, 400, { error: result.errors.join('; ') });
            return true;
          }
          // THE SPAN LAW GROWS TEETH (core-audit debt 13): the deck
          // survey used to run AFTER the save — a road drawn across
          // the Glasswater shipped its impossible causeway to every
          // player, and the warning arrived in the same response, too
          // late. Deep-water decks and over-max spans now REFUSE the
          // save; the shore-hugging counsel stays advisory.
          const decks = routeBridgeDecks(result.def, config.worldSeed, (x, y) =>
            elevationAt(config.worldSeed, x, y),
          );
          const unlawful = decks.filter(
            (d) => d.deep > 0 || d.span > (d.trail ? TRAIL_SPAN_MAX : ROAD_SPAN_MAX),
          );
          if (unlawful.length > 0) {
            const d = unlawful[0]!;
            sendJson(res, 400, {
              error:
                `route '${d.routeId}' lays an unlawful ${d.span}-tile deck at ` +
                `(${d.x0},${d.y0})..(${d.x1},${d.y1})` +
                (d.deep > 0 ? ` over ${d.deep} tile(s) of DEEP water (never bridged)` : '') +
                ` — cross at a neck or walk the shore (the span law)`,
            });
            return true;
          }
          await importContentDoc(db, 'geography', 'world', result.def);
          const swept = game.reloadGeography(result.def);
          console.log(`[content] geography saved + live (world regenerating)`);
          sendJson(res, 200, { ok: true, swept, warnings: cachedGeographyWarnings(result.def) });
          return true;
        }
        if (req.method === 'DELETE') {
          const outcome = await revertContentDoc(db, 'geography', 'world', AUTHORED_GEOGRAPHY);
          const swept = game.reloadGeography({
            routes: AUTHORED_GEOGRAPHY.routes.map((r) => ({ ...r, pts: r.pts.map((p) => ({ ...p })) })),
            sites: AUTHORED_GEOGRAPHY.sites.map((s) => ({ ...s })),
            anchors: AUTHORED_GEOGRAPHY.anchors.map((a) => ({ ...a })),
            massifs: AUTHORED_GEOGRAPHY.massifs.map((m) => ({ ...m })),
            veils: AUTHORED_GEOGRAPHY.veils.map((v) => ({ ...v })),
            fens: AUTHORED_GEOGRAPHY.fens.map((f) => ({ ...f })),
            meres: AUTHORED_GEOGRAPHY.meres.map((m) => ({ ...m })),
            pinelands: AUTHORED_GEOGRAPHY.pinelands.map((p) => ({ ...p })),
            scorches: AUTHORED_GEOGRAPHY.scorches.map((s) => ({ ...s })),
            planned: AUTHORED_GEOGRAPHY.planned.map((p) => ({ ...p })),
          });
          console.log(`[content] geography ${outcome} — shipped plan stands`);
          sendJson(res, 200, { ok: true, outcome, swept });
          return true;
        }
      }

      // ------------------------------------------------ factions doc
      // THE LEDGER OF NAMES is ONE document under the two-hash law
      // (docs/factions-plan.md). Call-time reads + index rebuild in
      // replaceFactions mean a save re-draws the political map with
      // no reload.
      if (url.pathname === '/dev/content/factions') {
        if (req.method === 'GET') {
          const edited =
            (await loadContentDocs(db, 'factions')).find((d) => d.id === 'world')?.edited ?? false;
          sendJson(res, 200, { def: JSON.parse(JSON.stringify(FACTIONS)), edited });
          return true;
        }
        if (req.method === 'PUT') {
          let raw: unknown;
          try {
            raw = JSON.parse(await readBody(req));
          } catch (err) {
            sendJson(res, 400, { error: (err as Error).message });
            return true;
          }
          const result = validateFactions(raw);
          if (!result.ok) {
            sendJson(res, 400, { error: result.errors.join('; ') });
            return true;
          }
          // THE TWO DOCS AGREE (stances cross-law): a faction id equal
          // to a declared stances tribe would silently hand that tribe
          // watch semantics. The stances validator refuses the collision
          // in one direction; this refuses the other (the validator
          // can't import stances — the docs only meet here).
          const tribeClash = result.def.roster.find((f) =>
            STANCES.tribes.some((t) => t.id === f.id),
          );
          if (tribeClash) {
            sendJson(res, 400, {
              error: `faction id '${tribeClash.id}' collides with a declared stances tribe`,
            });
            return true;
          }
          await importContentDoc(db, 'factions', 'world', result.def);
          replaceFactions(result.def);
          console.log('[content] factions doc saved + live (no reload needed — call-time reads)');
          sendJson(res, 200, { ok: true });
          return true;
        }
        if (req.method === 'DELETE') {
          const outcome = await revertContentDoc(db, 'factions', 'world', AUTHORED_FACTIONS);
          replaceFactions(JSON.parse(JSON.stringify(AUTHORED_FACTIONS)) as typeof FACTIONS);
          console.log(`[content] factions doc ${outcome} — shipped roster stands`);
          sendJson(res, 200, { ok: true, outcome });
          return true;
        }
      }

      // ------------------------------------------------ stances doc
      // THE WILD TAKES SIDES is ONE document under the two-hash law
      // (docs/npc-hostility-plan.md). Call-time reads + claim-index
      // rebuild in replaceStances mean a save re-draws the wild's
      // feuds on the very next perception scan.
      if (url.pathname === '/dev/content/stances') {
        if (req.method === 'GET') {
          const edited =
            (await loadContentDocs(db, 'stances')).find((d) => d.id === 'world')?.edited ?? false;
          sendJson(res, 200, { def: JSON.parse(JSON.stringify(STANCES)), edited });
          return true;
        }
        if (req.method === 'PUT') {
          let raw: unknown;
          try {
            raw = JSON.parse(await readBody(req));
          } catch (err) {
            sendJson(res, 400, { error: (err as Error).message });
            return true;
          }
          const result = validateStances(raw);
          if (!result.ok) {
            sendJson(res, 400, { error: result.errors.join('; ') });
            return true;
          }
          await importContentDoc(db, 'stances', 'world', result.def);
          replaceStances(result.def);
          console.log('[content] stances doc saved + live (no reload needed — call-time reads)');
          sendJson(res, 200, { ok: true, warnings: result.warnings });
          return true;
        }
        if (req.method === 'DELETE') {
          const outcome = await revertContentDoc(db, 'stances', 'world', AUTHORED_STANCES);
          replaceStances(JSON.parse(JSON.stringify(AUTHORED_STANCES)) as typeof STANCES);
          console.log(`[content] stances doc ${outcome} — shipped stances stand`);
          sendJson(res, 200, { ok: true, outcome });
          return true;
        }
      }

      // ------------------------------------------------ arena doc
      // THE SAND AND THE ROAR is ONE document under the two-hash law
      // (docs/arena-plan.md). Call-time reads + index rebuild in
      // replaceArenas mean a save re-writes the counter's card before
      // the next bell; the validator walks the LIVE registries
      // (bestiary, tables, actors, geography) so a card can never
      // name a foe that does not stand.
      if (url.pathname === '/dev/content/arena') {
        if (req.method === 'GET') {
          const edited =
            (await loadContentDocs(db, 'arena')).find((d) => d.id === 'world')?.edited ?? false;
          sendJson(res, 200, { def: JSON.parse(JSON.stringify(ARENAS)), edited });
          return true;
        }
        if (req.method === 'PUT') {
          let raw: unknown;
          try {
            raw = JSON.parse(await readBody(req));
          } catch (err) {
            sendJson(res, 400, { error: (err as Error).message });
            return true;
          }
          const result = validateArenas(raw, arenaValidateRefsNow());
          if (!result.ok) {
            sendJson(res, 400, { error: result.errors.join('; ') });
            return true;
          }
          await importContentDoc(db, 'arena', 'world', result.def);
          replaceArenas(result.def);
          console.log('[content] arena doc saved + live (no reload needed — call-time reads)');
          sendJson(res, 200, { ok: true, warnings: result.warnings });
          return true;
        }
        if (req.method === 'DELETE') {
          const outcome = await revertContentDoc(db, 'arena', 'world', AUTHORED_ARENAS);
          replaceArenas(JSON.parse(JSON.stringify(AUTHORED_ARENAS)) as typeof ARENAS);
          console.log(`[content] arena doc ${outcome} — the shipped card stands`);
          sendJson(res, 200, { ok: true, outcome });
          return true;
        }
      }

      // ------------------------------------------------ frontier dials
      // THE WEATHER is ONE document under the two-hash law (Phase 6).
      // Every consumer reads FRONTIER.x at call time, so a save needs
      // no reload — the swap steers the very next frontier beat.
      if (url.pathname === '/dev/content/frontier') {
        if (req.method === 'GET') {
          const edited =
            (await loadContentDocs(db, 'frontier')).find((d) => d.id === 'world')?.edited ?? false;
          sendJson(res, 200, { def: { ...FRONTIER }, edited });
          return true;
        }
        if (req.method === 'PUT') {
          let raw: unknown;
          try {
            raw = JSON.parse(await readBody(req));
          } catch (err) {
            sendJson(res, 400, { error: (err as Error).message });
            return true;
          }
          const result = validateFrontier(raw);
          if (!result.ok) {
            sendJson(res, 400, { error: result.errors.join('; ') });
            return true;
          }
          await importContentDoc(db, 'frontier', 'world', result.def);
          replaceFrontier(result.def);
          console.log('[content] frontier dials saved + live (no reload needed — call-time reads)');
          sendJson(res, 200, { ok: true });
          return true;
        }
        if (req.method === 'DELETE') {
          const outcome = await revertContentDoc(db, 'frontier', 'world', AUTHORED_FRONTIER);
          replaceFrontier({ ...AUTHORED_FRONTIER });
          console.log(`[content] frontier dials ${outcome} — shipped weather stands`);
          sendJson(res, 200, { ok: true, outcome });
          return true;
        }
      }

      // ------------------------------------------------ growth dials
      // THE LAND'S CLOCK is ONE document under the two-hash law
      // (second-growth Phase 1). Call-time reads: a save re-aims every
      // live regrowth's projection on the very next beat.
      if (url.pathname === '/dev/content/growth') {
        if (req.method === 'GET') {
          const edited =
            (await loadContentDocs(db, 'growth')).find((d) => d.id === 'world')?.edited ?? false;
          sendJson(res, 200, { def: { ...GROWTH }, edited });
          return true;
        }
        if (req.method === 'PUT') {
          let raw: unknown;
          try {
            raw = JSON.parse(await readBody(req));
          } catch (err) {
            sendJson(res, 400, { error: (err as Error).message });
            return true;
          }
          const result = validateGrowth(raw);
          if (!result.ok) {
            sendJson(res, 400, { error: result.errors.join('; ') });
            return true;
          }
          await importContentDoc(db, 'growth', 'world', result.def);
          replaceGrowth(result.def);
          console.log('[content] growth dials saved + live (no reload needed — call-time reads)');
          sendJson(res, 200, { ok: true });
          return true;
        }
        if (req.method === 'DELETE') {
          const outcome = await revertContentDoc(db, 'growth', 'world', AUTHORED_GROWTH);
          replaceGrowth({ ...AUTHORED_GROWTH });
          console.log(`[content] growth dials ${outcome} — the shipped clock stands`);
          sendJson(res, 200, { ok: true, outcome });
          return true;
        }
      }

      // ------------------------------------------------ the clip ledger
      // THE CLIP LEDGER (voiceover-plan Phase 2). Clip metadata rides
      // the two-hash law in voice_clips; binaries land content-
      // addressed in data/voice via saveVoiceFile (THE HASH IS THE
      // FILE — an upload carries base64 audio inside ordinary JSON so
      // the one readBody door serves it). Banks are whole cards per
      // owner; the dials are a 'voice' singleton on the frontier
      // skeleton. Nothing here needs a game reload — the resolver
      // (Phase 3) reads the ledger at call time.

      if (url.pathname === '/dev/content/voice' && req.method === 'GET') {
        const load = await loadVoiceClips(db);
        const banks = await loadVoiceBanks(db);
        const dialsEdited =
          (await loadContentDocs(db, 'voice')).find((d) => d.id === 'world')?.edited ?? false;
        sendJson(res, 200, {
          clips: load.clips.map((c) => ({
            def: c.def,
            edited: c.edited,
            url: voiceClipUrl(c.def),
          })),
          banks,
          dials: { def: { ...VOICE }, edited: dialsEdited },
          errors: load.errors,
        });
        return true;
      }

      if (url.pathname === '/dev/content/voice/dials') {
        if (req.method === 'GET') {
          const edited =
            (await loadContentDocs(db, 'voice')).find((d) => d.id === 'world')?.edited ?? false;
          sendJson(res, 200, { def: { ...VOICE }, edited });
          return true;
        }
        if (req.method === 'PUT') {
          let raw: unknown;
          try {
            raw = JSON.parse(await readBody(req));
          } catch (err) {
            sendJson(res, 400, { error: (err as Error).message });
            return true;
          }
          const result = validateVoice(raw);
          if (!result.ok) {
            sendJson(res, 400, { error: result.errors.join('; ') });
            return true;
          }
          await importContentDoc(db, 'voice', 'world', result.def);
          replaceVoice(result.def);
          console.log('[content] voice dials saved + live (call-time reads)');
          sendJson(res, 200, { ok: true });
          return true;
        }
        if (req.method === 'DELETE') {
          const outcome = await revertContentDoc(db, 'voice', 'world', AUTHORED_VOICE);
          replaceVoice({ ...AUTHORED_VOICE });
          console.log(`[content] voice dials ${outcome} — shipped dials stand`);
          sendJson(res, 200, { ok: true, outcome });
          return true;
        }
      }

      const vclipMatch = /^\/dev\/content\/voice\/clips\/([^/]+)$/.exec(url.pathname);
      if (vclipMatch) {
        const id = vclipMatch[1]!;
        if (req.method === 'PUT') {
          interface ClipUpload {
            id?: string;
            ext?: string;
            durMs?: number;
            transcript?: string;
            actor?: string;
            tags?: string[];
            /** Base64 audio — present on upload/replace, absent on a metadata edit. */
            dataB64?: string;
          }
          let raw: ClipUpload;
          try {
            raw = JSON.parse(await readBody(req)) as ClipUpload;
            if (raw.id !== id) throw new Error(`body id '${raw.id}' does not match URL '${id}'`);
          } catch (err) {
            sendJson(res, 400, { error: (err as Error).message });
            return true;
          }
          let fileHash: string;
          let bytes: number;
          if (raw.dataB64 !== undefined) {
            let buf: Buffer;
            try {
              buf = Buffer.from(raw.dataB64, 'base64');
            } catch {
              sendJson(res, 400, { error: 'dataB64 is not valid base64' });
              return true;
            }
            if (buf.length === 0 || buf.length > VOICE.maxClipBytes) {
              sendJson(res, 400, {
                error: `audio must be 1..${VOICE.maxClipBytes} bytes (the maxClipBytes dial)`,
              });
              return true;
            }
            if (!VOICE_EXTS.includes(raw.ext as VoiceExt)) {
              sendJson(res, 400, { error: `ext must be one of ${VOICE_EXTS.join('/')}` });
              return true;
            }
            const saved = await saveVoiceFile(buf, raw.ext as VoiceExt);
            fileHash = saved.fileHash;
            bytes = buf.length;
          } else {
            // Metadata-only edit: the recording stays what it was.
            const existing = (await loadVoiceClips(db)).clips.find((c) => c.def.id === id);
            if (!existing) {
              sendJson(res, 404, { error: `clip '${id}' does not exist (uploads need dataB64)` });
              return true;
            }
            fileHash = existing.def.fileHash;
            bytes = existing.def.bytes;
            raw.ext = raw.ext ?? existing.def.ext;
          }
          const result = validateVoiceClip(
            {
              id,
              fileHash,
              ext: raw.ext,
              durMs: raw.durMs,
              bytes,
              transcript: raw.transcript,
              actor: raw.actor,
              tags: raw.tags,
            },
            { actorIds: game.actorIds() },
          );
          if (!result.ok) {
            sendJson(res, 400, { error: result.errors.join('; ') });
            return true;
          }
          await importVoiceClip(db, result.def);
          // The live resolver speaks the new clip on the next beat.
          game.registerVoiceClips((await loadVoiceClips(db)).clips.map((c) => c.def));
          console.log(`[content] voice clip '${id}' saved (${result.def.durMs}ms, ${bytes}b)`);
          sendJson(res, 200, { ok: true, def: result.def, url: voiceClipUrl(result.def) });
          return true;
        }
        if (req.method === 'DELETE') {
          const outcome = await deleteVoiceClip(db, id);
          if (!outcome.ok) {
            if ('missing' in outcome) {
              sendJson(res, 404, { error: `clip '${id}' does not exist` });
            } else {
              sendJson(res, 409, {
                error: `clip '${id}' is still spoken`,
                banks: outcome.refs.banks,
                nodes: outcome.refs.nodes,
              });
            }
            return true;
          }
          // Orphaned binary goes with its last row — dedupe kept it
          // alive while any sharer remained.
          if (outcome.fileOrphaned) await unlinkVoiceFile(outcome.fileHash, outcome.ext);
          game.registerVoiceClips((await loadVoiceClips(db)).clips.map((c) => c.def));
          console.log(`[content] voice clip '${id}' deleted${outcome.fileOrphaned ? ' + file' : ''}`);
          sendJson(res, 200, { ok: true });
          return true;
        }
      }

      const vbankMatch = /^\/dev\/content\/voice\/banks\/([^/]+)\/([^/]+)$/.exec(url.pathname);
      if (vbankMatch) {
        const [, ownerKind, ownerId] = vbankMatch;
        if (req.method === 'PUT') {
          let raw: { owner?: { kind?: string; id?: string } };
          try {
            raw = JSON.parse(await readBody(req)) as typeof raw;
            if (raw.owner?.kind !== ownerKind || raw.owner?.id !== ownerId) {
              throw new Error(`body owner does not match URL '${ownerKind}/${ownerId}'`);
            }
          } catch (err) {
            sendJson(res, 400, { error: (err as Error).message });
            return true;
          }
          const clipIds = new Set((await loadVoiceClips(db)).clips.map((c) => c.def.id));
          // Each owner kind validates against its own live roster:
          // actors, POI archetypes, zones (THE WORLD SPEAKS).
          const ownerIds =
            ownerKind === 'actor'
              ? game.actorIds()
              : ownerKind === 'poi'
                ? new Set(POI_DEFS.keys())
                : ownerKind === 'zone'
                  ? game.zoneIds()
                  : undefined;
          const result = validateVoiceBank(raw, { clipIds, ownerIds });
          if (!result.ok) {
            sendJson(res, 400, { error: result.errors.join('; ') });
            return true;
          }
          const saved = await saveVoiceBank(db, result.def, clipIds);
          if (!saved.ok) {
            sendJson(res, 400, { error: saved.errors.join('; ') });
            return true;
          }
          // The live throat clears on the very next beat.
          game.registerVoiceBanks(await loadVoiceBanks(db));
          console.log(`[content] voice bank ${ownerKind}:${ownerId} saved`);
          sendJson(res, 200, { ok: true });
          return true;
        }
        if (req.method === 'DELETE') {
          const existed = await deleteVoiceBank(db, ownerKind!, ownerId!);
          game.registerVoiceBanks(await loadVoiceBanks(db));
          console.log(`[content] voice bank ${ownerKind}:${ownerId} ${existed ? 'deleted' : 'was empty'}`);
          sendJson(res, 200, { ok: true, existed });
          return true;
        }
      }

      // ------------------------------------------------ POI cells
      // The studio's levers over the frontier ledger — the /poi chat
      // commands' semantics behind an API.
      if (url.pathname === '/dev/pois/cell' && req.method === 'POST') {
        let body: {
          cellX?: number;
          cellY?: number;
          action?: string;
          defId?: string;
          stage?: number;
        };
        try {
          body = JSON.parse((await readBody(req)) || '{}') as typeof body;
        } catch (err) {
          sendJson(res, 400, { error: (err as Error).message });
          return true;
        }
        const { cellX, cellY, action } = body;
        if (
          !Number.isInteger(cellX) ||
          !Number.isInteger(cellY) ||
          (action !== 'reroll' &&
            action !== 'dissolve' &&
            action !== 'force' &&
            action !== 'stage' &&
            action !== 'ember')
        ) {
          sendJson(res, 400, {
            error: "needs { cellX, cellY, action: 'reroll'|'dissolve'|'force'|'stage'|'ember' }",
          });
          return true;
        }
        const result = game.poiCellAction(cellX!, cellY!, action, body.defId, body.stage);
        if (!result.ok) {
          sendJson(res, 400, { error: result.error });
          return true;
        }
        sendJson(res, 200, { ok: true, site: result.site });
        return true;
      }

      // Adopt: freeze a composed POI site into an authored zone the
      // editor owns — the ground the scaffold rolled becomes ground
      // the studio curates. The cell itself dissolves (decided-empty)
      // so the frontier never re-stands a twin under the new zone.
      if (url.pathname === '/dev/maps/adopt' && req.method === 'POST') {
        let body: { cellX?: number; cellY?: number; id?: string; name?: string };
        try {
          body = JSON.parse((await readBody(req)) || '{}') as typeof body;
        } catch (err) {
          sendJson(res, 400, { error: (err as Error).message });
          return true;
        }
        const { cellX, cellY, id } = body;
        if (!Number.isInteger(cellX) || !Number.isInteger(cellY) || typeof id !== 'string') {
          sendJson(res, 400, { error: 'needs { cellX, cellY, id }' });
          return true;
        }
        if (!ID_RE.test(id)) {
          sendJson(res, 400, { error: `zone id must match ${ID_RE}` });
          return true;
        }
        if (game.planes.planeOfZone(id) || builtinZones.has(id)) {
          sendJson(res, 400, { error: `zone id '${id}' is taken` });
          return true;
        }
        const composed = game.poiCellZone(cellX!, cellY!);
        if (!composed) {
          sendJson(res, 404, { error: `cell ${cellX},${cellY} holds no site to adopt` });
          return true;
        }
        const adopted: ZoneDef = {
          ...composed,
          id,
          name: body.name?.trim() || composed.name,
        };
        mkdirSync(mapsDir, { recursive: true });
        await writeFile(join(mapsDir, `${id}.json`), JSON.stringify(zoneToJson(adopted), null, 2));
        // Dissolve FIRST (retires the poi zone + its placements), then
        // stand the authored twin in its place — same tick, no gap a
        // player could fall through.
        game.poiCellAction(cellX!, cellY!, 'dissolve');
        game.reloadZone(adopted);
        console.log(`[maps] adopted poi cell ${cellX},${cellY} as zone '${id}'`);
        sendJson(res, 200, { ok: true, id });
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
          (await loadContentDocs(db, 'npc')).filter((d) => d.edited).map((d) => d.id),
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
          await importContentDoc(db, 'npc', id, doc);
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
          const outcome = await revertContentDoc(db, 'npc', id, authored);
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
          (await loadContentDocs(db, 'loot')).filter((d) => d.edited).map((d) => d.id),
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
          await importContentDoc(db, 'loot', id, doc);
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
          const outcome = await revertContentDoc(db, 'loot', id, authored);
          replaceLootTables(candidate.values());
          console.log(`[content] loot table '${id}' ${outcome}`);
          sendJson(res, 200, { ok: true, outcome });
          return true;
        }
      }

      if (url.pathname === '/dev/content/actors' && req.method === 'GET') {
        const load = await loadNpcActors(db);
        const edited = await editedActorSlugs(db);
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
            actor = await importNpcActor(db, raw);
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
          const outcome = await revertNpcActor(db, slug, authored);
          game.reloadActorDef(slug, authored);
          console.log(`[content] actor '${slug}' ${outcome}`);
          sendJson(res, 200, { ok: true, outcome });
          return true;
        }
      }

      // ------------------------------------------------ POI archetypes
      // Same two-hash law as the bestiary: content_docs kind 'poi',
      // the one validator on every write (with the LIVE prefab library
      // as refs), live-registry swap, and reloadPoiDef so standing
      // cells recompose under the edit within a tick.

      if (url.pathname === '/dev/content/pois' && req.method === 'GET') {
        const edited = new Set(
          (await loadContentDocs(db, 'poi')).filter((d) => d.edited).map((d) => d.id),
        );
        sendJson(res, 200, {
          pois: [...POI_DEFS.values()].map((d) => ({
            def: d,
            edited: edited.has(d.id),
            authored: AUTHORED_POI_DEFS.has(d.id),
          })),
          prefabIds: [...game.poiPrefabIds()],
        });
        return true;
      }

      // THE SMALL FINDS bench doors (lived-in-land Phase 2) — the
      // pois shape wholesale: list with edited/authored pills, PUT
      // through the one validator + live swap + re-deal, DELETE =
      // revert-to-authored.
      if (url.pathname === '/dev/content/minors' && req.method === 'GET') {
        const edited = new Set(
          (await loadContentDocs(db, 'minor')).filter((d) => d.edited).map((d) => d.id),
        );
        sendJson(res, 200, {
          minors: [...MINOR_DEFS.values()].map((d) => ({
            def: d,
            edited: edited.has(d.id),
            authored: AUTHORED_MINOR_DEFS.has(d.id),
          })),
          prefabIds: [...game.poiPrefabIds()],
        });
        return true;
      }

      const minorMatch = /^\/dev\/content\/minors\/([^/]+)$/.exec(url.pathname);
      if (minorMatch) {
        const id = minorMatch[1]!;
        if (req.method === 'PUT') {
          let raw: { id?: string };
          try {
            raw = JSON.parse(await readBody(req)) as { id?: string };
            if (raw.id !== id) throw new Error(`body id '${raw.id}' does not match URL '${id}'`);
          } catch (err) {
            sendJson(res, 400, { error: (err as Error).message });
            return true;
          }
          const result = validateMinorDef(raw, {
            prefabIds: game.poiPrefabIds(),
            npcIds: new Set(NPCS.keys()),
          });
          if (!result.ok) {
            sendJson(res, 400, { error: result.errors.join('; ') });
            return true;
          }
          await importContentDoc(db, 'minor', id, result.def);
          const next = new Map(MINOR_DEFS);
          next.set(id, result.def);
          replaceMinorDefs(next.values());
          game.reloadMinorDef(id);
          console.log(`[content] minor '${id}' saved + live`);
          sendJson(res, 200, { ok: true });
          return true;
        }
        if (req.method === 'DELETE') {
          const authored = AUTHORED_MINOR_DEFS.get(id) ?? null;
          const outcome = await revertContentDoc(db, 'minor', id, authored);
          const next = new Map(MINOR_DEFS);
          if (authored) next.set(id, authored);
          else next.delete(id);
          replaceMinorDefs(next.values());
          game.reloadMinorDef(id);
          console.log(`[content] minor '${id}' ${outcome}`);
          sendJson(res, 200, { ok: true, outcome });
          return true;
        }
      }

      // THE ROSTER SPEAKS (second-growth Phase 5) — the node roster's
      // bench doors, on the minors shape: list with edited/authored
      // pills, PUT through the one validator + live in-place swap
      // (call-time reads mean the very next gather uses it), DELETE =
      // revert-to-authored.
      if (url.pathname === '/dev/content/nodes' && req.method === 'GET') {
        const edited = new Set(
          (await loadContentDocs(db, 'node')).filter((d) => d.edited).map((d) => d.id),
        );
        sendJson(res, 200, {
          nodes: NODES.map((d) => ({
            def: d,
            edited: edited.has(d.id),
            authored: AUTHORED_NODES.has(d.id),
          })),
        });
        return true;
      }

      const nodeMatch = /^\/dev\/content\/nodes\/([^/]+)$/.exec(url.pathname);
      if (nodeMatch) {
        const id = nodeMatch[1]!;
        if (req.method === 'PUT') {
          let raw: { id?: string };
          try {
            raw = JSON.parse(await readBody(req)) as { id?: string };
            if (raw.id !== id) throw new Error(`body id '${raw.id}' does not match URL '${id}'`);
          } catch (err) {
            sendJson(res, 400, { error: (err as Error).message });
            return true;
          }
          const result = validateNodeDoc(raw, { lootTables: new Set(LOOT_TABLES.keys()) });
          if (!result.ok) {
            sendJson(res, 400, { error: result.errors.join('; ') });
            return true;
          }
          const next = NODES.some((n) => n.id === id)
            ? NODES.map((n) => (n.id === id ? result.def : n))
            : [...NODES, result.def];
          try {
            replaceNodes(next);
          } catch (err) {
            sendJson(res, 400, { error: (err as Error).message });
            return true;
          }
          await importContentDoc(db, 'node', id, result.def);
          console.log(`[content] node '${id}' saved + live (call-time reads)`);
          sendJson(res, 200, { ok: true });
          return true;
        }
        if (req.method === 'DELETE') {
          const authored = AUTHORED_NODES.get(id) ?? null;
          const outcome = await revertContentDoc(db, 'node', id, authored);
          const next = authored
            ? NODES.map((n) => (n.id === id ? authored : n))
            : NODES.filter((n) => n.id !== id);
          replaceNodes(next.some((n) => n.id === id) || !authored ? next : [...next, authored]);
          console.log(`[content] node '${id}' ${outcome}`);
          sendJson(res, 200, { ok: true, outcome });
          return true;
        }
      }

      const poiMatch = /^\/dev\/content\/pois\/([^/]+)$/.exec(url.pathname);
      if (poiMatch) {
        const id = poiMatch[1]!;
        if (req.method === 'PUT') {
          let raw: { id?: string };
          try {
            raw = JSON.parse(await readBody(req)) as { id?: string };
            if (raw.id !== id) throw new Error(`body id '${raw.id}' does not match URL '${id}'`);
          } catch (err) {
            sendJson(res, 400, { error: (err as Error).message });
            return true;
          }
          const result = validatePoiDef(raw, { prefabIds: game.poiPrefabIds(), actorIds: game.actorIds(), routineIds: game.routineIds() });
          if (!result.ok) {
            sendJson(res, 400, { error: result.errors.join('; ') });
            return true;
          }
          await importContentDoc(db, 'poi', id, result.def);
          const next = new Map(POI_DEFS);
          next.set(id, result.def);
          replacePoiDefs(next.values());
          game.reloadPoiDef(id);
          console.log(`[content] poi '${id}' saved + live`);
          sendJson(res, 200, { ok: true });
          return true;
        }
        if (req.method === 'DELETE') {
          const authored = AUTHORED_POI_DEFS.get(id) ?? null;
          const outcome = await revertContentDoc(db, 'poi', id, authored);
          const next = new Map(POI_DEFS);
          if (authored) next.set(id, authored);
          else next.delete(id);
          replacePoiDefs(next.values());
          game.reloadPoiDef(id);
          console.log(`[content] poi '${id}' ${outcome}`);
          sendJson(res, 200, { ok: true, outcome });
          return true;
        }
      }

      // ------------------------------------------- THE FOUNDRY doors
      // (strongholds Phase 1): the layout repository on the pois
      // shape — list with edited/authored pills, PUT through the one
      // validator against the LIVE prefab library, DELETE = revert —
      // plus the generate door the bench rolls proposals through.
      // No live cells stand in Phase 1, so a registry swap is the
      // whole reload.
      if (url.pathname === '/dev/content/strongholds' && req.method === 'GET') {
        const edited = new Set(
          (await loadContentDocs(db, 'stronghold')).filter((d) => d.edited).map((d) => d.id),
        );
        sendJson(res, 200, {
          strongholds: [...STRONGHOLD_DEFS.values()].map((d) => ({
            def: d,
            edited: edited.has(d.id),
            authored: AUTHORED_STRONGHOLDS.has(d.id),
          })),
          prefabIds: [...game.poiPrefabIds()],
          families: [...FAMILY_STYLES.keys()],
        });
        return true;
      }

      const strongholdMatch = /^\/dev\/content\/strongholds\/([^/]+)$/.exec(url.pathname);
      if (strongholdMatch) {
        const id = strongholdMatch[1]!;
        if (req.method === 'PUT') {
          let raw: { id?: string; prefab?: string };
          try {
            raw = JSON.parse(await readBody(req)) as { id?: string; prefab?: string };
            if (raw.id !== id) throw new Error(`body id '${raw.id}' does not match URL '${id}'`);
          } catch (err) {
            sendJson(res, 400, { error: (err as Error).message });
            return true;
          }
          // The geometry laws need the layout's actual prefab — save
          // the prefab to the library first (the bench does), then
          // the def; a def naming a prefab the library lacks refuses.
          const prefab = typeof raw.prefab === 'string' ? game.poiPrefab(raw.prefab) : undefined;
          if (!prefab) {
            sendJson(res, 400, { error: `prefab '${String(raw.prefab)}' is not in the library — save it first` });
            return true;
          }
          const result = validateStronghold(raw, { prefab, npcIds: new Set(NPCS.keys()) });
          if (!result.ok) {
            sendJson(res, 400, { error: result.errors.join('; ') });
            return true;
          }
          await importContentDoc(db, 'stronghold', id, result.def);
          const next = new Map(STRONGHOLD_DEFS);
          next.set(id, result.def);
          replaceStrongholds(next.values());
          game.reloadStrongholdLayout(id);
          console.log(`[content] stronghold '${id}' saved + live (standing capitals re-stand)`);
          sendJson(res, 200, { ok: true, gates: result.gates });
          return true;
        }
        if (req.method === 'DELETE') {
          const authored = AUTHORED_STRONGHOLDS.get(id) ?? null;
          const outcome = await revertContentDoc(db, 'stronghold', id, authored);
          const next = new Map(STRONGHOLD_DEFS);
          if (authored) next.set(id, authored);
          else next.delete(id);
          replaceStrongholds(next.values());
          game.reloadStrongholdLayout(id);
          console.log(`[content] stronghold '${id}' ${outcome}`);
          sendJson(res, 200, { ok: true, outcome });
          return true;
        }
      }

      if (url.pathname === '/dev/strongholds/preview' && req.method === 'POST') {
        // THE STAGE LADDER (Phase 6): compose a real capital at the
        // asked stage/epoch on a synthetic seat — the re-manned wards
        // and thickened watch SEEN, not trusted.
        let body: { id?: string; stage?: number; epoch?: number };
        try {
          body = JSON.parse(await readBody(req)) as { id?: string; stage?: number; epoch?: number };
        } catch (err) {
          sendJson(res, 400, { error: (err as Error).message });
          return true;
        }
        const def = STRONGHOLD_DEFS.get(String(body.id ?? ''));
        const prefab = def ? game.poiPrefab(def.prefab) : undefined;
        if (!def || !prefab) {
          sendJson(res, 404, { error: `no layout '${String(body.id)}' on the shelf` });
          return true;
        }
        const seat = {
          gx: 0,
          gy: 0,
          x: Math.floor(prefab.width / 2),
          y: Math.floor(prefab.height / 2),
          rect: { x: 0, y: 0, w: prefab.width, h: prefab.height },
          family: def.family,
          tier: def.tiers[1],
          layoutId: def.id,
        };
        const zone = composeStronghold(
          config.worldSeed,
          seat,
          def,
          prefab,
          Math.max(0, Math.floor(body.epoch ?? 0)),
          Math.max(0, Math.min(3, Math.floor(body.stage ?? 0))),
        );
        sendJson(res, 200, { zone: zoneToJson(zone) });
        return true;
      }

      if (url.pathname === '/dev/strongholds/generate' && req.method === 'POST') {
        interface GenBody {
          seed?: number;
          id?: string;
          name?: string;
          description?: string;
          family?: string;
          tiers?: [number, number];
          weight?: number;
          sizeClass?: string;
          bossNames?: string[];
        }
        let body: GenBody;
        try {
          body = JSON.parse(await readBody(req)) as GenBody;
        } catch (err) {
          sendJson(res, 400, { error: (err as Error).message });
          return true;
        }
        const seed = Number.isInteger(body.seed) ? (body.seed as number) : 1;
        try {
          const proposal = genStronghold(seed, {
            id: typeof body.id === 'string' ? body.id : 'stronghold_draft',
            name: typeof body.name === 'string' && body.name.trim() ? body.name : 'Foundry draft',
            ...(typeof body.description === 'string' && body.description
              ? { description: body.description }
              : {}),
            family: typeof body.family === 'string' ? body.family : 'goblin',
            tiers:
              Array.isArray(body.tiers) && body.tiers.length === 2
                ? [body.tiers[0], body.tiers[1]]
                : [3, 5],
            weight: typeof body.weight === 'number' ? body.weight : 2,
            sizeClass: body.sizeClass === 'citadel' ? 'citadel' : 'hold',
            bossNames:
              Array.isArray(body.bossNames) && body.bossNames.length > 0
                ? body.bossNames
                : ['The Unnamed'],
          });
          const check = validateStronghold(proposal.def, { prefab: proposal.prefab });
          sendJson(res, 200, {
            ok: check.ok,
            def: proposal.def,
            prefab: prefabToJson(proposal.prefab),
            gates: check.ok ? check.gates : [],
            errors: check.ok ? [] : check.errors,
          });
        } catch (err) {
          // A refused proposal (no ground for the court at this seed)
          // is an honest answer, not a server fault.
          sendJson(res, 200, { ok: false, errors: [(err as Error).message] });
        }
        return true;
      }

      // The bench's observed panel: run the REAL scaffold over a fresh
      // scan (draft def included, unsaved) — batched between event-loop
      // turns so the game tick never waits on a simulation.
      if (url.pathname === '/dev/pois/simulate' && req.method === 'POST') {
        let body: { cells?: number; draft?: unknown };
        try {
          body = JSON.parse((await readBody(req)) || '{}') as typeof body;
        } catch (err) {
          sendJson(res, 400, { error: (err as Error).message });
          return true;
        }
        let draft: PoiDef | undefined;
        if (body.draft !== undefined) {
          const v = validatePoiDef(body.draft, { prefabIds: game.poiPrefabIds(), actorIds: game.actorIds(), routineIds: game.routineIds() });
          if (!v.ok) {
            sendJson(res, 400, { error: v.errors.join('; ') });
            return true;
          }
          draft = v.def;
        }
        const ctx = game.poiBenchContext(draft);
        if (!ctx) {
          sendJson(res, 503, { error: 'poi system not initialized' });
          return true;
        }
        const cells = Math.max(20, Math.min(1000, body.cells ?? 300));
        // THE DENSITY SURVEY (lived-in-land Phase 6): the whole land at
        // once — sites, the finds lattice, ungated hold promotion, and
        // the territory read. Superset of the old site-only stats; the
        // bench reads what it knows.
        const steps = simulateLandSteps(config.worldSeed, ctx, cells);
        const stats = await new Promise<LandSimStats>((resolve) => {
          const drain = (): void => {
            const r = steps.next();
            if (r.done) resolve(r.value);
            else setImmediate(drain);
          };
          drain();
        });
        sendJson(res, 200, stats);
        return true;
      }

      // The bench's stage: a REAL composed site for an archetype at a
      // requested tier — cues, garrison, patrol ring and all.
      if (url.pathname === '/dev/pois/preview' && req.method === 'POST') {
        let body: { id?: string; tier?: number; prefab?: string; draft?: unknown; stage?: number };
        try {
          body = JSON.parse((await readBody(req)) || '{}') as typeof body;
        } catch (err) {
          sendJson(res, 400, { error: (err as Error).message });
          return true;
        }
        let draft: PoiDef | undefined;
        if (body.draft !== undefined) {
          const v = validatePoiDef(body.draft, { prefabIds: game.poiPrefabIds(), actorIds: game.actorIds(), routineIds: game.routineIds() });
          if (!v.ok) {
            sendJson(res, 400, { error: v.errors.join('; ') });
            return true;
          }
          draft = v.def;
        }
        const defId = draft?.id ?? body.id;
        const tier = body.tier ?? 2;
        const stage = body.stage ?? 0;
        if (typeof defId !== 'string' || !Number.isInteger(tier) || !Number.isInteger(stage)) {
          sendJson(res, 400, { error: 'needs { id or draft, tier, stage? }' });
          return true;
        }
        const ctx = game.poiBenchContext(draft);
        if (!ctx) {
          sendJson(res, 503, { error: 'poi system not initialized' });
          return true;
        }
        const shown = previewPoi(config.worldSeed, ctx, defId, tier, body.prefab, stage);
        if (!shown) {
          sendJson(res, 404, { error: `no honest tier-${tier} ground found for '${defId}'` });
          return true;
        }
        sendJson(res, 200, { site: shown.site, zone: zoneToJson(shown.zone) });
        return true;
      }

      // ------------------------------------------------ dialogues
      // Trees live in their relational tables under the two-hash law;
      // every write validates through the ONE validator (against the
      // LIVE actor roster) and swaps the running registry in the same
      // breath — the next Talk speaks the edit.

      if (url.pathname === '/dev/content/dialogues' && req.method === 'GET') {
        const load = await loadDialogues(db, { actorIds: game.actorIds() });
        const edited = await editedDialogueIds(db);
        sendJson(res, 200, {
          dialogues: load.dialogues.map((d) => ({
            def: d,
            edited: edited.has(d.id),
            authored: DIALOGUES.has(d.id),
          })),
          errors: load.errors,
        });
        return true;
      }

      const dlgMatch = /^\/dev\/content\/dialogues\/([^/]+)$/.exec(url.pathname);
      if (dlgMatch) {
        const id = dlgMatch[1]!;
        if (req.method === 'PUT') {
          let raw: { id?: string };
          try {
            raw = JSON.parse(await readBody(req)) as { id?: string };
            if (raw.id !== id) throw new Error(`body id '${raw.id}' does not match URL '${id}'`);
          } catch (err) {
            sendJson(res, 400, { error: (err as Error).message });
            return true;
          }
          // A Studio save checks voice refs against the live ledger —
          // strict where a human edits, lenient where the world boots.
          const result = await importDialogue(db, raw, {
            actorIds: game.actorIds(),
            voiceClipIds: game.voiceClipIds(),
          });
          if (!result.ok) {
            sendJson(res, 400, { error: result.errors.join('; ') });
            return true;
          }
          const fresh = await game.reloadDialogues();
          console.log(`[content] dialogue '${id}' saved + live (${fresh.count} registered)`);
          sendJson(res, 200, { ok: true });
          return true;
        }
        if (req.method === 'DELETE') {
          const authored = DIALOGUES.get(id) ?? null;
          const outcome = await revertDialogue(db, id, authored);
          await game.reloadDialogues();
          console.log(`[content] dialogue '${id}' ${outcome}`);
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
            maxStack: i.maxStack ?? null,
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
          const def = prefabFromJson(json);
          await writeFile(
            join(prefabsDir, `${id}.json`),
            JSON.stringify(prefabToJson(def), null, 2),
          );
          // The POI system reads the SAME library: standing sites
          // wearing this prefab re-dress within a tick of the save.
          game.reloadPoiPrefab(id, def);
          console.log(`[maps] saved prefab '${id}' (${json.width}x${json.height})`);
          sendJson(res, 200, { ok: true });
          return true;
        }
        if (req.method === 'DELETE') {
          try {
            await unlink(join(prefabsDir, `${id}.json`));
            game.reloadPoiPrefab(id, null);
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
        // THE WORLDS APART: the browser lists every plane's zones.
        const allZones = [...game.planes.all()].flatMap((w) => w.zoneDefs);
        const zones = allZones.map((z) => ({
          id: z.id,
          name: z.name,
          width: z.width,
          height: z.height,
          origin: z.origin,
          // THE WORLDS APART: the browser groups by plane, not by y.
          plane: z.plane ?? 'surface',
          spawn: z.spawn ?? null,
          builtin: builtinZones.has(z.id),
          hasFile: onDisk.has(z.id),
          poi: z.id.startsWith('poi:'),
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
        const id = decodeURIComponent(zoneMatch[1]!);
        // Composed POI zones open read-only: the scaffold owns their
        // ground (edits belong to the archetype bench or the adopt
        // flow), but the studio may LOOK at anything the world holds.
        if (id.startsWith('poi:')) {
          if (req.method === 'GET') {
            // Materialize on demand — the studio may open a site the
            // ledger decided but nobody has walked near yet.
            const m = /^poi:(-?\d+),(-?\d+)$/.exec(id);
            const zone = m
              ? game.poiCellZone(Number(m[1]), Number(m[2]))
              : (game.surface.zoneById(id) ?? null);
            if (zone) sendJson(res, 200, zoneToJson(zone));
            else sendJson(res, 404, { error: `cell '${id}' holds no site` });
            return true;
          }
          sendJson(res, 400, {
            error: `'${id}' is a composed site — edit its archetype in the Content Studio, or adopt it as an authored zone`,
          });
          return true;
        }
        // Composed capitals open read-only the same way — the Foundry
        // owns their ground; the studio may look.
        if (id.startsWith('stronghold:')) {
          if (req.method === 'GET') {
            const zone = game.surface.zoneById(id) ?? null;
            if (zone) sendJson(res, 200, zoneToJson(zone));
            else sendJson(res, 404, { error: `no capital stands as '${id}'` });
            return true;
          }
          sendJson(res, 400, {
            error: `'${id}' is a composed capital — curate its layout in the Foundry bench`,
          });
          return true;
        }
        if (!ID_RE.test(id)) {
          sendJson(res, 400, { error: `zone id must match ${ID_RE}` });
          return true;
        }

        if (req.method === 'GET') {
          const live = game.planes.planeOfZone(id)?.zoneById(id);
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
          // THE ONE ZONE GATE, server side (Map Studio v2 Phase 6):
          // the SAME ZoneBuilder replay the studio runs — a save that
          // breaks the zone laws never reaches disk or the live world,
          // whoever sent it. A valid-but-unfenced zone (hand-imported
          // JSON) has its cliff fence completed here, exactly as the
          // studio completes it before its own saves.
          const verdict = validateZone(zone);
          if (!verdict.ok) {
            sendJson(res, 400, { error: `zone law: ${verdict.error}` });
            return true;
          }
          if (verdict.fencedGround) {
            zone.ground.set(verdict.fencedGround);
            console.log(`[maps] '${id}': auto-fence completed ${verdict.fenceAdded} cliff tiles`);
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
