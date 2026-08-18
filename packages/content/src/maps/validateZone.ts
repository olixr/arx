import { TILE_SKIP, Tile, hangHostTiles, wallHungInfo } from '@arx/shared';
import { ZoneBuilder } from './builder.js';
import type { ZoneDef } from './types.js';

/**
 * THE ONE ZONE GATE (Map Studio v2 Phase 6): shared by the studio's
 * live validator AND the server's save endpoint — the same replay,
 * the same verdicts, one implementation. The validator IS the
 * ZoneBuilder — the same laws every
 * shipped map passed at build time: flat two-tile border apron, the
 * camera-facing stair predicate, auto-grown cliff fences, and spawn
 * reachability across levels. The zone is replayed cell-by-cell
 * through a builder and build() renders the verdict. Ramp tiles are
 * replayed as stairs() — in this world a stair IS the only legal gap
 * in a fence, so painting one invokes the law.
 */

export interface ValidationResult {
  ok: boolean;
  error?: string;
  /** Ground after auto-fencing, when it differs from the input. */
  fencedGround?: Uint16Array;
  /** How many tiles the auto-fence would add. */
  fenceAdded: number;
}

/**
 * THE PLACEMENT VET (core-audit debt 4): the structural half of the
 * gate — spawns, actor posts, portals, and the growth mark checked as
 * VALUES, not just decoded shapes. These lists rode zoneFromJson by
 * reference with no check at all: a spawn count of 1e9 hung the boot
 * inside registerSpawns, a NaN radius scattered bodies into the void,
 * and none of it was refused anywhere on any path. Cheap (no builder
 * replay), so every load door can afford it.
 */
export function zonePlacementErrors(zone: ZoneDef): string[] {
  const errors: string[] = [];
  const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
  if (typeof zone.id !== 'string' || zone.id.length === 0 || zone.id.length > 64) {
    errors.push('zone id must be a non-empty string (max 64)');
  }
  if (typeof zone.name !== 'string' || zone.name.length > 120) {
    errors.push('zone name must be a string (max 120)');
  }
  if (zone.growth !== undefined && zone.growth !== 'kept' && zone.growth !== 'wild') {
    errors.push(`growth must be 'kept' | 'wild'`);
  }
  for (const [i, s] of (zone.spawns ?? []).entries()) {
    const at = `spawns[${i}]`;
    if (typeof s.npc !== 'string' || s.npc.length === 0) errors.push(`${at}.npc must be a slug`);
    if (!num(s.x) || !num(s.y)) errors.push(`${at} needs finite x/y`);
    if (!Number.isInteger(s.count) || s.count < 1 || s.count > 64) {
      errors.push(`${at}.count must be an integer 1..64`);
    }
    if (!num(s.radius) || s.radius < 0 || s.radius > 64) {
      errors.push(`${at}.radius must be 0..64 tiles`);
    }
    if (s.level !== undefined && (!Number.isInteger(s.level) || s.level < 1 || s.level > 99)) {
      errors.push(`${at}.level must be an integer 1..99`);
    }
    if (s.hours !== undefined && (!num(s.hours.from) || !num(s.hours.to))) {
      errors.push(`${at}.hours needs numeric from/to`);
    }
    if (s.patrol !== undefined) {
      if (!Array.isArray(s.patrol) || s.patrol.length > 64 ||
          s.patrol.some((p) => !num(p.x) || !num(p.y))) {
        errors.push(`${at}.patrol must be ≤64 finite waypoints`);
      }
    }
    if (s.post !== undefined && (!num(s.post.x) || !num(s.post.y) || !num(s.post.dir))) {
      errors.push(`${at}.post needs finite x/y/dir`);
    }
    // THE WILD TAKES SIDES: a malformed banner would poison every
    // stance read for the body ('' !== undefined wins the override).
    if (s.tribe !== undefined && (typeof s.tribe !== 'string' || !/^[a-z][a-z0-9_]*$/.test(s.tribe))) {
      errors.push(`${at}.tribe must be a slug`);
    }
  }
  for (const [i, a] of (zone.actorSpawns ?? []).entries()) {
    const at = `actorSpawns[${i}]`;
    if (typeof a.actor !== 'string' || a.actor.length === 0) errors.push(`${at}.actor must be a slug`);
    if (!num(a.x) || !num(a.y)) errors.push(`${at} needs finite x/y`);
    if (a.dir !== undefined && !num(a.dir)) errors.push(`${at}.dir must be a number`);
    if (a.routine !== undefined && typeof a.routine !== 'string') {
      errors.push(`${at}.routine must be a routine id`);
    }
  }
  for (const [i, p] of (zone.portals ?? []).entries()) {
    const at = `portals[${i}]`;
    if (!num(p.x) || !num(p.y)) errors.push(`${at} needs finite x/y`);
    if (p.dest !== undefined && (!num(p.dest.x) || !num(p.dest.y))) {
      errors.push(`${at}.dest needs finite x/y`);
    }
    if (p.dest === undefined && p.delve !== true) {
      errors.push(`${at} needs a dest or delve: true (a door must lead somewhere)`);
    }
  }
  // THE HANGING LAW's authoring gate (the floor-banner purge): a
  // wall-hung detail on a tile whose painter never runs the hangings
  // pass is orphan state — the cloth never draws, and the Studio
  // marker glyph baked onto walkable ground as a 'floor banner' the
  // player could stand on. Nineteen of these shipped across six
  // towns before this line existed. Cheap: one pass over the grid.
  if (zone.ground && zone.detail) {
    for (let i = 0; i < zone.detail.length; i++) {
      const d = zone.detail[i]!;
      if (d === 0 || wallHungInfo(d) === null) continue;
      const t = zone.ground[i]!;
      if (!hangHostTiles(d).has(t)) {
        const x = i % zone.width;
        const y = Math.floor(i / zone.width);
        errors.push(
          `wall-hung detail ${d} at (${x},${y}) sits on non-hangable tile ${t} — hang it on a wall its painter dresses`,
        );
      }
    }
  }
  return errors;
}

export function validateZone(zone: ZoneDef): ValidationResult {
  // The structural half first — a malformed placement list should
  // never reach the builder replay.
  const placementErrors = zonePlacementErrors(zone);
  if (placementErrors.length > 0) {
    return { ok: false, error: placementErrors.join('; '), fenceAdded: 0 };
  }
  const b = new ZoneBuilder(zone.id, zone.name, zone.origin, zone.width, zone.height, Tile.Grass);
  for (let y = 0; y < zone.height; y++) {
    for (let x = 0; x < zone.width; x++) {
      const i = y * zone.width + x;
      const g = zone.ground[i]! as Tile;
      // Transparent cells belong to the world beneath — the builder
      // never sees them, and the fence pass must never pave them.
      if ((g as number) === TILE_SKIP) continue;
      if (g === Tile.Ramp) b.stairs(x, y);
      else b.set(x, y, g);
      const d = zone.detail[i]!;
      if (d !== 0) b.setDetail(x, y, d);
      const e = zone.elev ? zone.elev[i]! : 0;
      if (e > 0) b.raise(x, y, 1, 1, e);
      else if (e < 0) b.sink(x, y, 1, 1, -e);
    }
  }
  // Sign records replay through the SAME law: each is registered on
  // the tile already painted under it, so a record whose board got
  // erased (or was never a board) fails here exactly as it would at
  // content build time. Passing the existing tile makes the placement
  // a no-op — the studio's paint layer stays the source of truth.
  for (const sign of zone.signs ?? []) {
    const lx = sign.x - zone.origin.x;
    const ly = sign.y - zone.origin.y;
    if (lx < 0 || ly < 0 || lx >= zone.width || ly >= zone.height) continue;
    const under = zone.ground[ly * zone.width + lx]!;
    // A record over a transparent cell has no board at all — replay it
    // as plain ground so the builder says exactly that, and never
    // stamp the sentinel into the replay (the fence diff reads it).
    b.sign(lx, ly, sign.title, sign.lines ?? [], (under === TILE_SKIP ? Tile.Grass : under) as Tile);
  }

  if (zone.spawn) {
    const sx = zone.spawn.x - zone.origin.x;
    const sy = zone.spawn.y - zone.origin.y;
    if (sx >= 0 && sy >= 0 && sx < zone.width && sy < zone.height) {
      b.spawn(Math.floor(sx), Math.floor(sy));
    }
  }
  let built;
  try {
    built = b.build();
  } catch (err) {
    return { ok: false, error: (err as Error).message, fenceAdded: 0 };
  }
  // Restore the sentinel before diffing: the builder replayed those
  // cells as its Grass base, but they are the world's, not ours.
  const fenced = new Uint16Array(built.ground);
  for (let i = 0; i < fenced.length; i++) {
    if (zone.ground[i] === TILE_SKIP) fenced[i] = TILE_SKIP;
  }
  let fenceAdded = 0;
  for (let i = 0; i < fenced.length; i++) {
    if (fenced[i] !== zone.ground[i]) fenceAdded++;
  }
  return {
    ok: true,
    fencedGround: fenceAdded > 0 ? fenced : undefined,
    fenceAdded,
  };
}
