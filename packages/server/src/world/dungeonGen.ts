import { CHUNK_SIZE, Rng, Tile, type Vec2 } from '@devcraft/shared';
import type { ZoneDef, ZoneSpawn, PortalDef } from '@devcraft/content';

/**
 * Procedural delve generator: rooms + L-corridors carved from cave wall.
 * Deterministic per seed. Entry room holds the way out; the deepest room
 * holds a Skeleton Champion guarding the good loot.
 */
export interface DelveResult {
  zone: ZoneDef;
  /** Where the entering player lands (world coords). */
  entry: Vec2;
}

const SIZE = 64;

export function generateDelve(seed: number, origin: Vec2, returnTo: Vec2): DelveResult {
  const rng = new Rng(seed);
  const ground = new Uint16Array(SIZE * SIZE).fill(Tile.CaveWall);
  const detail = new Uint16Array(SIZE * SIZE);

  const carve = (x: number, y: number, w: number, h: number) => {
    for (let iy = y; iy < y + h; iy++) {
      for (let ix = x; ix < x + w; ix++) {
        if (ix > 0 && iy > 0 && ix < SIZE - 1 && iy < SIZE - 1) {
          ground[iy * SIZE + ix] = Tile.CaveFloor;
        }
      }
    }
  };

  // Rooms: random rects, mildly overlapping is fine (caves are organic).
  const roomCount = rng.int(6, 9);
  const rooms: Array<{ x: number; y: number; w: number; h: number; cx: number; cy: number }> = [];
  for (let i = 0; i < roomCount; i++) {
    const w = rng.int(6, 12);
    const h = rng.int(5, 10);
    const x = rng.int(2, SIZE - w - 2);
    const y = rng.int(2, SIZE - h - 2);
    rooms.push({ x, y, w, h, cx: Math.floor(x + w / 2), cy: Math.floor(y + h / 2) });
    carve(x, y, w, h);
  }

  // Corridors connect each room to the next (chain keeps it a dungeon
  // crawl rather than a plaza).
  for (let i = 1; i < rooms.length; i++) {
    const a = rooms[i - 1]!;
    const b = rooms[i]!;
    const x0 = Math.min(a.cx, b.cx);
    const x1 = Math.max(a.cx, b.cx);
    carve(x0, a.cy - 1, x1 - x0 + 2, 3);
    const y0 = Math.min(a.cy, b.cy);
    const y1 = Math.max(a.cy, b.cy);
    carve(b.cx - 1, y0, 3, y1 - y0 + 2);
  }

  // Scatter ore veins along walls of carved space.
  for (let i = 0; i < 6; i++) {
    const room = rng.pick(rooms);
    const ix = rng.int(room.x, room.x + room.w - 1);
    const iy = rng.int(room.y, room.y + room.h - 1);
    ground[iy * SIZE + ix] = rng.chance(0.5) ? Tile.RockIron : Tile.RockCopper;
  }

  const entryRoom = rooms[0]!;
  const lastRoom = rooms[rooms.length - 1]!;

  // Way out where you land.
  ground[entryRoom.cy * SIZE + entryRoom.cx] = Tile.PortalUp;
  const portals: PortalDef[] = [
    { x: origin.x + entryRoom.cx, y: origin.y + entryRoom.cy, dest: returnTo },
  ];

  const spawns: ZoneSpawn[] = [];
  // Skeletons in every middle room, champion in the last.
  for (let i = 1; i < rooms.length - 1; i++) {
    const room = rooms[i]!;
    spawns.push({
      npc: 'skeleton',
      x: origin.x + room.cx,
      y: origin.y + room.cy,
      radius: Math.max(2, Math.min(room.w, room.h) / 2 - 1),
      count: rng.int(1, 3),
    });
  }
  spawns.push({
    npc: 'skeleton_champion',
    x: origin.x + lastRoom.cx,
    y: origin.y + lastRoom.cy,
    radius: 2,
    count: 1,
  });

  const zone: ZoneDef = {
    id: `delve-${seed}`,
    name: 'The Delve',
    origin,
    width: SIZE,
    height: SIZE,
    ground,
    detail,
    portals,
    spawns,
  };

  return {
    zone,
    entry: { x: origin.x + entryRoom.cx + 0.5, y: origin.y + entryRoom.cy + 1.5 },
  };
}

/** Delve instances live on their own row of the dark band. */
export function delveOrigin(slot: number): Vec2 {
  return { x: 8192 + slot * (SIZE + CHUNK_SIZE * 2), y: 8192 };
}
