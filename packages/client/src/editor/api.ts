import type { GeographyDef, PrefabJson, ZoneJson } from '@devcraft/content';

/**
 * The editor's wire to the game server's dev maps API (/dev/maps on
 * the game port, proxied by Vite in dev). Every save lands on disk
 * AND hot-reloads into the running world, so a connected game client
 * sees the edit within a tick.
 */

export interface MapListEntry {
  id: string;
  name: string;
  width: number;
  height: number;
  origin: { x: number; y: number };
  spawn: { x: number; y: number } | null;
  builtin: boolean;
  hasFile: boolean;
  /** A composed frontier site (poi:cx,cy) — read-only until adopted. */
  poi: boolean;
  actorSpawns: number;
  npcSpawns: number;
  portals: number;
  /**
   * Client-side synthetic: a ledger-decided site nobody has walked
   * near yet — no zone stands, but opening it will compose one.
   */
  dormant?: boolean;
}

export interface MapList {
  zones: MapListEntry[];
  orphans: string[];
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(path, init);
  } catch {
    throw new Error('server unreachable — is the game server running?');
  }
  if (!res.ok) {
    let msg = `${res.status}`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) msg = body.error;
    } catch {
      /* non-JSON error body */
    }
    throw new Error(msg);
  }
  return res;
}

export async function listMaps(): Promise<MapList> {
  const res = await request('/dev/maps');
  return (await res.json()) as MapList;
}

export async function fetchZone(id: string): Promise<ZoneJson> {
  const res = await request(`/dev/maps/zone/${encodeURIComponent(id)}`);
  return (await res.json()) as ZoneJson;
}

export async function saveZone(json: ZoneJson): Promise<void> {
  await request(`/dev/maps/zone/${json.id}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(json),
  });
}

export async function deleteZone(id: string): Promise<{ reverted?: string; unloaded?: boolean }> {
  const res = await request(`/dev/maps/zone/${id}`, { method: 'DELETE' });
  return (await res.json()) as { reverted?: string; unloaded?: boolean };
}

// ------------------------------------------------- live registries

/** The running server's pick lists — the same truth it spawns from. */
export interface RegistrySnapshot {
  npcs: Array<{ id: string; name: string; level: number }>;
  actors: Array<{ id: string; name: string; title?: string }>;
  routines: string[];
}

export async function fetchRegistry(): Promise<RegistrySnapshot> {
  const res = await request('/dev/registry');
  return (await res.json()) as RegistrySnapshot;
}

// ------------------------------------------------- prefab library

export interface PrefabListEntry {
  id: string;
  name: string;
  width: number;
  height: number;
  portals: number;
  spawns: number;
  actorSpawns: number;
}

export async function listPrefabs(): Promise<PrefabListEntry[]> {
  const res = await request('/dev/prefabs');
  return ((await res.json()) as { prefabs: PrefabListEntry[] }).prefabs;
}

export async function fetchPrefab(id: string): Promise<PrefabJson> {
  const res = await request(`/dev/prefabs/${id}`);
  return (await res.json()) as PrefabJson;
}

export async function savePrefab(json: PrefabJson): Promise<void> {
  await request(`/dev/prefabs/${json.id}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(json),
  });
}

export async function deletePrefab(id: string): Promise<void> {
  await request(`/dev/prefabs/${id}`, { method: 'DELETE' });
}

// ------------------------------------------------- the world

/** A decided site exactly as the world_pois ledger keeps it. */
export interface PoiSiteWire {
  cellX: number;
  cellY: number;
  epoch: number;
  tier: number;
  defId: string;
  prefabId: string;
  anchorX: number;
  anchorY: number;
}

/** One POI ledger row with its live/authored state, as /dev/world tells it. */
export interface WorldCell {
  cellX: number;
  cellY: number;
  epoch: number;
  clearedAt: number | null;
  site: PoiSiteWire | null;
  defName: string | null;
  zoneId: string | null;
  authoredId: string | null;
}

export interface WorldSnapshot {
  seed: number;
  poiCell: number;
  cells: WorldCell[];
  geography: GeographyDef;
  geographyEdited: boolean;
  warnings: string[];
  poiDefs: Array<{
    id: string;
    name: string;
    weight: number;
    tiers: [number, number];
    haven: number | null;
  }>;
}

export async function fetchWorld(): Promise<WorldSnapshot> {
  const res = await request('/dev/world');
  return (await res.json()) as WorldSnapshot;
}

export interface GeographySaveResult {
  ok: boolean;
  swept?: { evicted: number; orphaned: number };
  warnings?: string[];
}

export async function saveGeography(def: GeographyDef): Promise<GeographySaveResult> {
  const res = await request('/dev/content/geography', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(def),
  });
  return (await res.json()) as GeographySaveResult;
}

export async function revertGeography(): Promise<GeographySaveResult> {
  const res = await request('/dev/content/geography', { method: 'DELETE' });
  return (await res.json()) as GeographySaveResult;
}

export async function poiCellAction(
  cellX: number,
  cellY: number,
  action: 'reroll' | 'dissolve' | 'force',
  defId?: string,
): Promise<{ ok: boolean; site: PoiSiteWire | null }> {
  const res = await request('/dev/pois/cell', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ cellX, cellY, action, ...(defId ? { defId } : {}) }),
  });
  return (await res.json()) as { ok: boolean; site: PoiSiteWire | null };
}

export async function adoptPoiCell(
  cellX: number,
  cellY: number,
  id: string,
  name?: string,
): Promise<{ ok: boolean; id: string }> {
  const res = await request('/dev/maps/adopt', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ cellX, cellY, id, ...(name ? { name } : {}) }),
  });
  return (await res.json()) as { ok: boolean; id: string };
}
