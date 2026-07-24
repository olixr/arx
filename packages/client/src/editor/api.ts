import type { ZoneJson } from '@devcraft/content';

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
  actorSpawns: number;
  npcSpawns: number;
  portals: number;
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
  const res = await request(`/dev/maps/zone/${id}`);
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
