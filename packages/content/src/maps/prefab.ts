import type { PlaneId } from '../planes.js';
import type { PortalDef, ZoneActorSpawn, ZoneSpawn } from './types.js';
import { base64ToI8, base64ToU16, i8ToBase64, u16ToBase64 } from './serialize.js';

/**
 * POI PREFABS — reusable points of interest. A prefab is a captured
 * rectangle of authored content: three tile layers plus the placements
 * that stood inside it, coordinates RELATIVE to the prefab's top-left
 * corner. Stamping one into a zone replays the tiles and re-anchors
 * every placement at the stamp point — a guard post, a shrine, a
 * bandit camp saved once and planted anywhere. The library lives in
 * data/prefabs/*.json on the server so the whole team shares it.
 */

/** A portal carried by a prefab: position is relative, dest stays absolute. */
export interface PrefabPortal {
  dx: number;
  dy: number;
  dest?: { x: number; y: number };
  /**
   * The plane `dest` lives on (THE WORLDS APART). Absent falls to the
   * minted portal's legacy derivation like any untagged door; a prefab
   * that names its far side keeps it through capture and every stamp —
   * without this field a cross-plane door was silently re-filed by
   * dest.y the moment it rode a prefab.
   */
  destPlane?: PlaneId;
  delve?: boolean;
}

export interface PrefabSpawn {
  dx: number;
  dy: number;
  npc: string;
  radius: number;
  count: number;
  level?: number;
  name?: string;
  /** Activity window (game hours, midnight-wrapping) — see ZoneSpawn.hours. */
  hours?: { from: number; to: number };
}

export interface PrefabActor {
  dx: number;
  dy: number;
  actor: string;
  dir?: number;
  routine?: string;
}

/**
 * THE ROUND HAS STATIONS (the peopled landmarks): an authored patrol
 * route carried by the prefab, coordinates RELATIVE like every other
 * placement. Compose deals routes to the def's patrol sentries in
 * order (first route, first patroller) before falling back to the
 * synthetic ring — the strongholds' authored-route preference walked
 * down the shelf. A stop may dwell (ticks) and sit (the fireside
 * pause on the round).
 */
export interface PrefabRoute {
  pts: Array<{ dx: number; dy: number; dwell?: number; sit?: boolean }>;
}

export interface PrefabDef {
  id: string;
  name: string;
  width: number;
  height: number;
  ground: Uint16Array;
  detail: Uint16Array;
  elev: Int8Array;
  portals: PrefabPortal[];
  spawns: PrefabSpawn[];
  actorSpawns: PrefabActor[];
  /** Authored patrol rounds (absent = none; compose rings synthetically). */
  routes?: PrefabRoute[];
}

export interface PrefabJson {
  id: string;
  name: string;
  width: number;
  height: number;
  ground: string;
  detail: string;
  /** Absent ⇒ flat. */
  elev?: string;
  portals?: PrefabPortal[];
  spawns?: PrefabSpawn[];
  actorSpawns?: PrefabActor[];
  routes?: PrefabRoute[];
}

/**
 * Raised 128 → 256 for the stronghold Second Charter (THE ZONE LAW):
 * a citadel-class layout prefab runs to ~180/axis. Every consumer
 * (sketch, boot loading, Map Studio PUT, the client editor) reads
 * this one constant.
 */
export const PREFAB_MAX_DIM = 256;
export const PREFAB_ID_RE = /^[a-z][a-z0-9_-]{0,63}$/;

export function validatePrefab(p: PrefabDef): string[] {
  const errors: string[] = [];
  if (!PREFAB_ID_RE.test(p.id)) errors.push(`id '${p.id}' must match ${PREFAB_ID_RE}`);
  if (!p.name.trim()) errors.push('name is empty');
  if (
    !Number.isInteger(p.width) || !Number.isInteger(p.height) ||
    p.width < 1 || p.height < 1 || p.width > PREFAB_MAX_DIM || p.height > PREFAB_MAX_DIM
  ) {
    errors.push(`dims ${p.width}x${p.height} outside 1..${PREFAB_MAX_DIM}`);
  }
  const size = p.width * p.height;
  if (p.ground.length !== size || p.detail.length !== size || p.elev.length !== size) {
    errors.push('layer length does not match dims');
  }
  const inside = (dx: number, dy: number): boolean =>
    dx >= 0 && dy >= 0 && dx < p.width && dy < p.height;
  for (const pt of p.portals) {
    if (!inside(pt.dx, pt.dy)) errors.push(`portal at ${pt.dx},${pt.dy} outside the prefab`);
    if (!pt.delve && !pt.dest) errors.push(`portal at ${pt.dx},${pt.dy} needs dest or delve`);
  }
  for (const s of p.spawns) {
    if (!inside(s.dx, s.dy)) errors.push(`spawn '${s.npc}' at ${s.dx},${s.dy} outside the prefab`);
    if (s.count < 1 || s.radius < 0) errors.push(`spawn '${s.npc}' has bad count/radius`);
  }
  for (const a of p.actorSpawns) {
    if (!inside(a.dx, a.dy)) errors.push(`actor '${a.actor}' at ${a.dx},${a.dy} outside the prefab`);
  }
  for (const [ri, route] of (p.routes ?? []).entries()) {
    if (route.pts.length < 3) errors.push(`route ${ri} needs at least 3 stops`);
    for (const [pi, pt] of route.pts.entries()) {
      if (!inside(pt.dx, pt.dy)) errors.push(`route ${ri} stop ${pi} outside the prefab`);
      // A leg the idle brain can honestly walk (the lawfulRoute hop cap);
      // the loop's closing leg counts too.
      const next = route.pts[(pi + 1) % route.pts.length]!;
      const hop = Math.max(Math.abs(next.dx - pt.dx), Math.abs(next.dy - pt.dy));
      if (hop > 12) errors.push(`route ${ri} leg ${pi} hops ${hop} (max 12)`);
    }
  }
  return errors;
}

export function prefabToJson(p: PrefabDef): PrefabJson {
  const flat = p.elev.every((v) => v === 0);
  return {
    id: p.id,
    name: p.name,
    width: p.width,
    height: p.height,
    ground: u16ToBase64(p.ground),
    detail: u16ToBase64(p.detail),
    elev: flat ? undefined : i8ToBase64(p.elev),
    portals: p.portals.length > 0 ? p.portals : undefined,
    spawns: p.spawns.length > 0 ? p.spawns : undefined,
    actorSpawns: p.actorSpawns.length > 0 ? p.actorSpawns : undefined,
    routes: p.routes && p.routes.length > 0 ? p.routes : undefined,
  };
}

export function prefabFromJson(json: PrefabJson): PrefabDef {
  const size = json.width * json.height;
  if (!Number.isInteger(size) || size <= 0 || size > PREFAB_MAX_DIM * PREFAB_MAX_DIM) {
    throw new Error('invalid prefab dimensions');
  }
  const def: PrefabDef = {
    id: json.id,
    name: json.name,
    width: json.width,
    height: json.height,
    ground: base64ToU16(json.ground, size),
    detail: base64ToU16(json.detail, size),
    elev: json.elev ? base64ToI8(json.elev, size) : new Int8Array(size),
    portals: json.portals ?? [],
    spawns: json.spawns ?? [],
    actorSpawns: json.actorSpawns ?? [],
    ...(json.routes && json.routes.length > 0 ? { routes: json.routes } : {}),
  };
  const errors = validatePrefab(def);
  if (errors.length > 0) throw new Error(errors.join('; '));
  return def;
}
