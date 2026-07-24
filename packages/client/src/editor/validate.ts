import { Tile } from '@devcraft/shared';
import { ZoneBuilder, type ZoneDef } from '@devcraft/content';

/**
 * The editor's validator IS the ZoneBuilder — the same laws every
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

export function validateZone(zone: ZoneDef): ValidationResult {
  const b = new ZoneBuilder(zone.id, zone.name, zone.origin, zone.width, zone.height, Tile.Grass);
  for (let y = 0; y < zone.height; y++) {
    for (let x = 0; x < zone.width; x++) {
      const i = y * zone.width + x;
      const g = zone.ground[i]! as Tile;
      if (g === Tile.Ramp) b.stairs(x, y);
      else b.set(x, y, g);
      const d = zone.detail[i]!;
      if (d !== 0) b.setDetail(x, y, d);
      const e = zone.elev ? zone.elev[i]! : 0;
      if (e > 0) b.raise(x, y, 1, 1, e);
      else if (e < 0) b.sink(x, y, 1, 1, -e);
    }
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
  let fenceAdded = 0;
  for (let i = 0; i < built.ground.length; i++) {
    if (built.ground[i] !== zone.ground[i]) fenceAdded++;
  }
  return {
    ok: true,
    fencedGround: fenceAdded > 0 ? built.ground : undefined,
    fenceAdded,
  };
}
