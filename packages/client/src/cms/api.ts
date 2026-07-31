import type {
  GrowthDef,
  NodeDef,
  DialogueDef,
  FactionsDef,
  FrontierDef,
  LootTableDef,
  MinorDef,
  NpcActorDef,
  NpcDef,
  PoiDef,
  PrefabJson,
  VoiceBankDef,
  VoiceClipDef,
  VoiceDoc,
  ZoneJson,
} from '@arx/content';

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

/** The weather is a singleton: one doc, one 'world' id, two hashes. */
export async function getFrontier(): Promise<{ def: FrontierDef; edited: boolean }> {
  return (await (await request('/dev/content/frontier')).json()) as {
    def: FrontierDef;
    edited: boolean;
  };
}

export async function saveFrontier(def: FrontierDef): Promise<void> {
  await request('/dev/content/frontier', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(def),
  });
}

export async function revertFrontier(): Promise<{ outcome: string }> {
  return (await (
    await request('/dev/content/frontier', { method: 'DELETE' })
  ).json()) as { outcome: string };
}

/** The names are a singleton too: one doc, one 'world' id, two hashes. */
export async function getFactions(): Promise<{ def: FactionsDef; edited: boolean }> {
  return (await (await request('/dev/content/factions')).json()) as {
    def: FactionsDef;
    edited: boolean;
  };
}

export async function saveFactions(def: FactionsDef): Promise<void> {
  await request('/dev/content/factions', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(def),
  });
}

export async function revertFactions(): Promise<{ outcome: string }> {
  return (await (
    await request('/dev/content/factions', { method: 'DELETE' })
  ).json()) as { outcome: string };
}

// ------------------------------------------------- the clip ledger

/** One GET carries the whole spoken world: clips, banks, dials. */
export interface VoiceLedger {
  clips: Array<{ def: VoiceClipDef; edited: boolean; url: string }>;
  banks: VoiceBankDef[];
  dials: { def: VoiceDoc; edited: boolean };
  errors: string[];
}

export async function getVoice(): Promise<VoiceLedger> {
  return (await (await request('/dev/content/voice')).json()) as VoiceLedger;
}

/** Upload/replace (with dataB64) or metadata-only edit (without). */
export interface VoiceClipUpload {
  id: string;
  ext?: string;
  durMs: number;
  transcript?: string;
  actor?: string;
  tags?: string[];
  dataB64?: string;
}

export async function saveVoiceClip(
  upload: VoiceClipUpload,
): Promise<{ def: VoiceClipDef; url: string }> {
  return (await (
    await request(`/dev/content/voice/clips/${upload.id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(upload),
    })
  ).json()) as { def: VoiceClipDef; url: string };
}

export async function deleteVoiceClip(id: string): Promise<void> {
  await request(`/dev/content/voice/clips/${id}`, { method: 'DELETE' });
}

export async function saveVoiceBank(def: VoiceBankDef): Promise<void> {
  await request(`/dev/content/voice/banks/${def.owner.kind}/${def.owner.id}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(def),
  });
}

export async function deleteVoiceBank(kind: string, id: string): Promise<void> {
  await request(`/dev/content/voice/banks/${kind}/${id}`, { method: 'DELETE' });
}

/** The dials are a singleton: one doc, one 'world' id, two hashes. */
export async function saveVoiceDials(def: VoiceDoc): Promise<void> {
  await request('/dev/content/voice/dials', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(def),
  });
}

export async function revertVoiceDials(): Promise<{ outcome: string }> {
  return (await (
    await request('/dev/content/voice/dials', { method: 'DELETE' })
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

export async function listMinors(): Promise<{
  minors: Array<Editable<MinorDef>>;
  prefabIds: string[];
}> {
  return (await (await request('/dev/content/minors')).json()) as {
    minors: Array<Editable<MinorDef>>;
    prefabIds: string[];
  };
}

export async function saveMinor(def: MinorDef): Promise<void> {
  await request(`/dev/content/minors/${def.id}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(def),
  });
}

export async function revertMinor(id: string): Promise<{ outcome: string }> {
  return (await (
    await request(`/dev/content/minors/${id}`, { method: 'DELETE' })
  ).json()) as { outcome: string };
}

export async function listNodes(): Promise<{ nodes: Array<Editable<NodeDef>> }> {
  return (await (await request('/dev/content/nodes')).json()) as {
    nodes: Array<Editable<NodeDef>>;
  };
}

export async function saveNode(def: NodeDef): Promise<void> {
  await request(`/dev/content/nodes/${def.id}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(def),
  });
}

export async function revertNode(id: string): Promise<{ outcome: string }> {
  return (await (
    await request(`/dev/content/nodes/${id}`, { method: 'DELETE' })
  ).json()) as { outcome: string };
}

export async function getGrowthDoc(): Promise<{ def: GrowthDef; edited: boolean }> {
  return (await (await request('/dev/content/growth')).json()) as {
    def: GrowthDef;
    edited: boolean;
  };
}

export async function saveGrowthDoc(def: GrowthDef): Promise<void> {
  await request('/dev/content/growth', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(def),
  });
}

export async function revertGrowthDoc(): Promise<{ outcome: string }> {
  return (await (await request('/dev/content/growth', { method: 'DELETE' })).json()) as {
    outcome: string;
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
  /** THE DENSITY SURVEY (Phase 6): the whole land, observed at once. */
  finds: { total: number; histogram: Record<number, number>; byDef: Record<string, number> };
  /** Promotion runs UNGATED in a fresh scan — the upper bound, and the bench says so. */
  holds: { sites: number; byDef: Record<string, number> };
  territory: Record<string, { sites: number; familyTrue: number }>;
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
  args: { id?: string; draft?: PoiDef; tier: number; prefab?: string; stage?: number },
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
