import type { LootTableDef, NpcActorDef, NpcDef } from '@devcraft/content';

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
