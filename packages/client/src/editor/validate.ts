import { TILE_SKIP, Tile } from '@devcraft/shared';
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
