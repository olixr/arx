import { SURFACE_PLANE_ID, legacyPlaneOfY, type PlaneId } from '../planes.js';
import type { PortalDef, ZoneActorSpawn, ZoneDef, ZoneSign, ZoneSpawn } from './types.js';

/**
 * Zone <-> JSON. Tile arrays are base64-encoded little-endian u16 so
 * zone files stay compact and diff-friendly enough. Used by the map
 * editor (export) and the server (loading data/maps/*.json overrides).
 */

export interface ZoneJson {
  id: string;
  name: string;
  /**
   * The plane this zone stamps. Absent in legacy files (pre-split);
   * zoneFromJson backfills those by the frozen y-law. Every new save
   * writes it explicitly — after the south opened, origin.y no longer
   * implies a plane. The asymmetry is the whole law: READS backfill
   * (the frozen y-law is exact for data authored before the split),
   * WRITES declare (a live ZoneDef without a tag IS a surface zone —
   * builders default to surface — and must never be re-derived from
   * a y that stopped meaning anything).
   */
  plane?: PlaneId;
  origin: { x: number; y: number };
  width: number;
  height: number;
  ground: string;
  detail: string;
  /** Base64 of the signed Int8 elevation layer; absent ⇒ flat 0. */
  elev?: string;
  spawn?: { x: number; y: number };
  /** Growth domain mark (second-growth); absent ⇒ 'kept'. */
  growth?: 'kept' | 'wild';
  /** Placed NPC actors (plain JSON — tiny lists, no encoding needed). */
  actorSpawns?: ZoneActorSpawn[];
  /** Portal tiles (world coords), same plain-JSON law as actorSpawns. */
  portals?: PortalDef[];
  /** Respawning NPC clusters (world coords). */
  spawns?: ZoneSpawn[];
  /** What the zone's sign tiles say (world coords), same plain-JSON law. */
  signs?: ZoneSign[];
}

export function u16ToBase64(arr: Uint16Array): string {
  const bytes = new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  // btoa in browsers, Buffer in Node.
  return typeof btoa === 'function' ? btoa(bin) : Buffer.from(bytes).toString('base64');
}

export function base64ToU16(s: string, expected: number): Uint16Array {
  let bytes: Uint8Array;
  if (typeof atob === 'function') {
    const bin = atob(s);
    bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  } else {
    bytes = new Uint8Array(Buffer.from(s, 'base64'));
  }
  const arr = new Uint16Array(bytes.buffer, 0, bytes.byteLength / 2);
  if (arr.length !== expected) {
    throw new Error(`zone tile data length ${arr.length}, expected ${expected}`);
  }
  return new Uint16Array(arr); // copy to a tightly-owned buffer
}

export function i8ToBase64(arr: Int8Array): string {
  // Reinterpret the bytes: base64 doesn't care about sign, only the
  // decoder's view does.
  const bytes = new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  return typeof btoa === 'function' ? btoa(bin) : Buffer.from(bytes).toString('base64');
}

export function base64ToI8(s: string, expected: number): Int8Array {
  let bytes: Uint8Array;
  if (typeof atob === 'function') {
    const bin = atob(s);
    bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  } else {
    bytes = new Uint8Array(Buffer.from(s, 'base64'));
  }
  if (bytes.length !== expected) {
    throw new Error(`zone elev data length ${bytes.length}, expected ${expected}`);
  }
  return new Int8Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + expected));
}

export function zoneToJson(zone: ZoneDef): ZoneJson {
  return {
    id: zone.id,
    name: zone.name,
    // Always explicit on the way out — and DECLARED, never derived.
    // An untagged live ZoneDef is a surface zone by law (builders
    // default to surface; zoneFromJson already backfilled any legacy
    // file at load). Consulting the frozen y-law here once sank
    // adopted south-frontier POIs and Studio saves at y>=512 into
    // underworld rock on the next boot.
    plane: zone.plane ?? SURFACE_PLANE_ID,
    origin: zone.origin,
    width: zone.width,
    height: zone.height,
    ground: u16ToBase64(zone.ground),
    detail: u16ToBase64(zone.detail),
    elev: zone.elev ? i8ToBase64(zone.elev) : undefined,
    spawn: zone.spawn,
    // The default domain serializes as absent so legacy files stay
    // byte-identical (the empty-list law below).
    growth: zone.growth === 'wild' ? 'wild' : undefined,
    actorSpawns: zone.actorSpawns,
    // Empty lists serialize as absent so legacy files stay byte-identical.
    portals: zone.portals && zone.portals.length > 0 ? zone.portals : undefined,
    spawns: zone.spawns && zone.spawns.length > 0 ? zone.spawns : undefined,
    signs: zone.signs && zone.signs.length > 0 ? zone.signs : undefined,
  };
}

export function zoneFromJson(json: ZoneJson): ZoneDef {
  const size = json.width * json.height;
  if (!Number.isInteger(size) || size <= 0 || size > 4096 * 4096) {
    throw new Error('invalid zone dimensions');
  }
  return {
    id: json.id,
    name: json.name,
    // Legacy files predate the split, so the frozen y-law names their
    // plane correctly; tagged files are taken at their word.
    plane: json.plane ?? legacyPlaneOfY(json.origin.y),
    origin: json.origin,
    width: json.width,
    height: json.height,
    ground: base64ToU16(json.ground, size),
    detail: base64ToU16(json.detail, size),
    // Zero-fill when absent: a flat legacy zone and one that never
    // mentions elevation decode identically.
    elev: json.elev ? base64ToI8(json.elev, size) : new Int8Array(size),
    spawn: json.spawn,
    // Anything but the explicit 'wild' mark normalizes to the default.
    growth: json.growth === 'wild' ? 'wild' : undefined,
    actorSpawns: json.actorSpawns,
    portals: json.portals,
    spawns: json.spawns,
    signs: json.signs,
  };
}
