import type {
  DialogueDef,
  LootTableDef,
  NpcActorDef,
  NpcDef,
  PoiDef,
  PrefabJson,
  ZoneJson,
} from '@devcraft/content';

/** Content Studio's wire to the running server's /dev/content API. */

export interface Editable<T> {
  def: T;
  /** Diverged from (or never had) an authored code twin. */
  edited: boolean;
  /** An authored twin exists — revert restores it; else delete removes. */
  authored: boolean;
}

export interface ItemRow {
  id: string;
  name: string;
  value: number;
  stackable: boolean;
  slot: string | null;
  desc: string | null;
}

export interface SpawnSites {
  npcs: Array<{ npc: string; x: number; y: number }>;
  actors: Array<{ actor: string; x: number; y: number }>;
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

export async function listNpcs(): Promise<Array<Editable<NpcDef>>> {
  return ((await (await request('/dev/content/npcs')).json()) as { npcs: Array<Editable<NpcDef>> })
    .npcs;
}

export async function saveNpc(def: NpcDef): Promise<void> {
  await request(`/dev/content/npcs/${def.id}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(def),
  });
}

export async function revertNpc(id: string): Promise<{ outcome: string }> {
  return (await (
    await request(`/dev/content/npcs/${id}`, { method: 'DELETE' })
  ).json()) as { outcome: string };
}

export async function listLoot(): Promise<Array<Editable<LootTableDef>>> {
  return (
    (await (await request('/dev/content/loot')).json()) as {
      tables: Array<Editable<LootTableDef>>;
    }
  ).tables;
}

export async function saveLoot(def: LootTableDef): Promise<void> {
  await request(`/dev/content/loot/${def.id}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(def),
  });
}

export async function revertLoot(id: string): Promise<{ outcome: string }> {
  return (await (
    await request(`/dev/content/loot/${id}`, { method: 'DELETE' })
  ).json()) as { outcome: string };
}

export async function listActors(): Promise<{
  actors: Array<Editable<NpcActorDef>>;
  errors: string[];
}> {
  return (await (await request('/dev/content/actors')).json()) as {
    actors: Array<Editable<NpcActorDef>>;
    errors: string[];
  };
}

export async function saveActor(def: NpcActorDef): Promise<void> {
  await request(`/dev/content/actors/${def.id}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(def),
  });
}

export async function revertActor(slug: string): Promise<{ outcome: string }> {
  return (await (
    await request(`/dev/content/actors/${slug}`, { method: 'DELETE' })
  ).json()) as { outcome: string };
}

export async function listPois(): Promise<{ pois: Array<Editable<PoiDef>>; prefabIds: string[] }> {
  return (await (await request('/dev/content/pois')).json()) as {
    pois: Array<Editable<PoiDef>>;
    prefabIds: string[];
  };
}

export async function savePoi(def: PoiDef): Promise<void> {
  await request(`/dev/content/pois/${def.id}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(def),
  });
}

export async function revertPoi(id: string): Promise<{ outcome: string }> {
  return (await (
    await request(`/dev/content/pois/${id}`, { method: 'DELETE' })
  ).json()) as { outcome: string };
}

export interface PoiSimStats {
  evaluated: number;
  settledSkipped: number;
  sites: number;
  empty: number;
  byDef: Record<
    string,
    { count: number; tiers: Record<number, number>; prefabs: Record<string, number> }
  >;
}

/** The observed panel: the server runs the REAL scaffold over a fresh scan. */
export async function surveyFrontier(draft?: PoiDef, cells = 300): Promise<PoiSimStats> {
  return (await (
    await request('/dev/pois/simulate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ cells, ...(draft ? { draft } : {}) }),
    })
  ).json()) as PoiSimStats;
}

export interface PoiStage {
  site: {
    cellX: number;
    cellY: number;
    tier: number;
    defId: string;
    prefabId: string;
    anchorX: number;
    anchorY: number;
  };
  zone: ZoneJson;
}

/** The stage: a real composed site at the requested tier (draft included). */
export async function stagePoi(
  args: { id?: string; draft?: PoiDef; tier: number; prefab?: string },
): Promise<PoiStage> {
  return (await (
    await request('/dev/pois/preview', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(args),
    })
  ).json()) as PoiStage;
}

export async function fetchPrefab(id: string): Promise<PrefabJson> {
  return (await (await request(`/dev/prefabs/${id}`)).json()) as PrefabJson;
}

export async function listDialogues(): Promise<{
  dialogues: Array<Editable<DialogueDef>>;
  errors: string[];
}> {
  return (await (await request('/dev/content/dialogues')).json()) as {
    dialogues: Array<Editable<DialogueDef>>;
    errors: string[];
  };
}

export async function saveDialogue(def: DialogueDef): Promise<void> {
  await request(`/dev/content/dialogues/${def.id}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(def),
  });
}

export async function revertDialogue(id: string): Promise<{ outcome: string }> {
  return (await (
    await request(`/dev/content/dialogues/${id}`, { method: 'DELETE' })
  ).json()) as { outcome: string };
}

export async function listItems(): Promise<ItemRow[]> {
  return ((await (await request('/dev/content/items')).json()) as { items: ItemRow[] }).items;
}

export async function fetchSpawnSites(): Promise<SpawnSites> {
  return (await (await request('/dev/content/usage')).json()) as SpawnSites;
}

export interface ZoneRect {
  id: string;
  name: string;
  origin: { x: number; y: number };
  width: number;
  height: number;
}

export async function listZoneRects(): Promise<ZoneRect[]> {
  const body = (await (await request('/dev/maps')).json()) as { zones: ZoneRect[] };
  return body.zones;
}
