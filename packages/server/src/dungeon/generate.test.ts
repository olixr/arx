import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  DOOR_TILES,
  RARITY_TIERS,
  Tile,
  dungeonModifiers,
  dungeonSpecFromRoll,
  isSolidTile,
  type RarityTier,
} from '@arx/shared';
import { NPCS, riftPlaneId } from '@arx/content';
import { DUNGEON_ORIGIN, generateDungeon } from './generate.js';

const ORIGIN = DUNGEON_ORIGIN;
const RETURN = { plane: 'surface', x: 60, y: 34 };

function gen(seed: number, tier: RarityTier = 'rare', pwr?: number) {
  const spec = dungeonSpecFromRoll({ rar: tier, seed, pwr });
  return generateDungeon(spec, ORIGIN, RETURN, 0);
}

/** Walkable for a player mid-run: floors, water, doors (they open). */
function passable(t: number, cracksOpen = false): boolean {
  if (cracksOpen && t === Tile.CrackedCaveWall) return true;
  return !isSolidTile(t) || DOOR_TILES.has(t as Tile);
}

function reachSet(ground: Uint16Array, s: number, sx: number, sy: number, cracksOpen = false) {
  const seen = new Uint8Array(s * s);
  const stack = [sy * s + sx];
  seen[sy * s + sx] = 1;
  while (stack.length > 0) {
    const i = stack.pop()!;
    const x = i % s;
    const y = Math.floor(i / s);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= s || ny >= s) continue;
      const ni = ny * s + nx;
      if (seen[ni] || !passable(ground[ni]!, cracksOpen)) continue;
      seen[ni] = 1;
      stack.push(ni);
    }
  }
  return seen;
}

function findTiles(ground: Uint16Array, s: number, tiles: Set<Tile>) {
  const out: Array<{ x: number; y: number; t: Tile }> = [];
  for (let i = 0; i < ground.length; i++) {
    if (tiles.has(ground[i] as Tile)) {
      out.push({ x: i % s, y: Math.floor(i / s), t: ground[i] as Tile });
    }
  }
  return out;
}

function adjacentReached(seen: Uint8Array, s: number, x: number, y: number): boolean {
  for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx >= 0 && ny >= 0 && nx < s && ny < s && seen[ny * s + nx]) return true;
  }
  return false;
}

const CHEST_SET = new Set([
  Tile.ChestWood,
  Tile.ChestMossy,
  Tile.ChestIron,
  Tile.ChestGilded,
  Tile.ChestBoss,
]);

test('same key generates the identical dungeon, twice', () => {
  const a = gen(123456789);
  const b = gen(123456789);
  assert.deepEqual(Array.from(a.zone.ground), Array.from(b.zone.ground));
  assert.deepEqual(a.zone.spawns, b.zone.spawns);
  assert.deepEqual(a.zone.portals, b.zone.portals);
  assert.equal(a.zone.name, b.zone.name);
});

test('different seeds diverge', () => {
  const a = gen(1);
  const b = gen(2);
  let diff = 0;
  for (let i = 0; i < a.zone.ground.length; i++) {
    if (a.zone.ground[i] !== b.zone.ground[i]) diff++;
  }
  assert.ok(diff > 100, `only ${diff} cells differ`);
});

test('every tier, many seeds: exit portal, reachable prizes, sane density', () => {
  for (const tier of RARITY_TIERS) {
    for (let seed = 1; seed <= 25; seed++) {
      const { zone, entry, spec } = gen(seed * 7919, tier);
      const s = zone.width;
      assert.equal(zone.width, spec.size);
      assert.equal(zone.height, spec.size);

      // The way out exists, at the landing.
      const portals = findTiles(zone.ground, s, new Set([Tile.PortalUp]));
      assert.equal(portals.length, 1, `${tier}/${seed}: one exit portal`);

      const ex = Math.floor(entry.x - ORIGIN.x);
      const ey = Math.floor(entry.y - ORIGIN.y);
      assert.ok(!isSolidTile(zone.ground[ey * s + ex]!), `${tier}/${seed}: landing walkable`);

      // Every chest is at least crackable-reachable; non-hidden chests
      // need no cracks at all.
      const seenNoCracks = reachSet(zone.ground, s, ex, ey, false);
      const seenCracked = reachSet(zone.ground, s, ex, ey, true);
      const chests = findTiles(zone.ground, s, CHEST_SET);
      assert.ok(chests.length >= 3, `${tier}/${seed}: has a chest ladder (${chests.length})`);
      for (const ch of chests) {
        assert.ok(
          adjacentReached(seenCracked, s, ch.x, ch.y),
          `${tier}/${seed}: chest at ${ch.x},${ch.y} sealed off even through cracks`,
        );
      }
      const openChests = chests.filter((ch) => adjacentReached(seenNoCracks, s, ch.x, ch.y));
      assert.ok(
        openChests.length >= Math.min(3, chests.length),
        `${tier}/${seed}: path chests reachable without secrets`,
      );

      // Secrets exist: at least one cracked wall hiding floor beyond.
      const cracks = findTiles(zone.ground, s, new Set([Tile.CrackedCaveWall]));
      assert.ok(cracks.length >= 1, `${tier}/${seed}: has a secret`);

      // Ore is present, and the ladder respects the power gate.
      const ores = findTiles(
        zone.ground,
        s,
        new Set([
          Tile.RockCopper, Tile.RockTin, Tile.RockIron, Tile.RockCoal, Tile.RockSilver,
          Tile.RockGold, Tile.RockMithril, Tile.RockAdamant, Tile.RockObsidian, Tile.RockStarfall,
        ]),
      );
      assert.ok(ores.length >= 3, `${tier}/${seed}: ore veins present`);

      // Floor fraction: explorable but still a dungeon.
      let floors = 0;
      for (let i = 0; i < zone.ground.length; i++) {
        if (!isSolidTile(zone.ground[i]!)) floors++;
      }
      const frac = floors / zone.ground.length;
      assert.ok(frac > 0.1 && frac < 0.6, `${tier}/${seed}: floor fraction ${frac.toFixed(2)}`);

      // The garrison is real, scaled, and made of real beasts.
      assert.ok((zone.spawns ?? []).length >= 4, `${tier}/${seed}: spawns`);
      for (const sp of zone.spawns ?? []) {
        assert.ok(NPCS.has(sp.npc), `${tier}/${seed}: unknown npc ${sp.npc}`);
        assert.ok((sp.level ?? 1) >= 1 && (sp.level ?? 1) <= 99);
      }
      const named = (zone.spawns ?? []).filter((sp) => sp.name);
      assert.ok(named.length >= 1, `${tier}/${seed}: a named boss`);
    }
  }
});

test('the entry landing is never inside a wall or prop', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const { zone, entry } = gen(seed * 104729, 'legendary');
    const s = zone.width;
    const ex = Math.floor(entry.x - ORIGIN.x);
    const ey = Math.floor(entry.y - ORIGIN.y);
    assert.ok(!isSolidTile(zone.ground[ey * s + ex]!), `seed ${seed}`);
  }
});

test('corridors are wide enough to read: 1-wide pinches stay rare', () => {
  // A pinch is a floor cell squeezed solid-to-solid on an axis —
  // exactly the passage the 2.5D camera hides behind its own south
  // wall. Hidden-room tunnels are 1-wide BY DESIGN (a secret should
  // feel like a crack); everything else the carve brushes keep 3+
  // wide, so the total stays a whisper of the floor count.
  for (const tier of ['common', 'rare', 'legendary'] as const) {
    for (let seed = 1; seed <= 15; seed++) {
      const { zone } = gen(seed * 31337, tier);
      const s = zone.width;
      // Only WALL MASS counts as a squeeze — a cell beside a chest or
      // an ore node is furniture clearance, not a thin corridor.
      const WALLS = new Set<number>([Tile.CaveWall, Tile.WallStone, Tile.CrackedCaveWall]);
      const wallAt = (x: number, y: number) =>
        x < 0 || y < 0 || x >= s || y >= s || WALLS.has(zone.ground[y * s + x]!);
      let pinches = 0;
      let floors = 0;
      for (let y = 1; y < s - 1; y++) {
        for (let x = 1; x < s - 1; x++) {
          if (isSolidTile(zone.ground[y * s + x]!)) continue;
          floors++;
          if ((wallAt(x, y - 1) && wallAt(x, y + 1)) || (wallAt(x - 1, y) && wallAt(x + 1, y))) {
            pinches++;
          }
        }
      }
      // The absolute cap scales with map area (45 was tuned at the old
      // 136 max — same per-area strictness, bigger canvases).
      const pinchCap = Math.round((s * s) / 400);
      assert.ok(
        pinches <= pinchCap && pinches / floors < 0.03,
        `${tier}/${seed}: ${pinches} wall-pinch cells of ${floors} floor (cap ${pinchCap})`,
      );
    }
  }
});

test('THE WORLDS APART: each run cuts on its own rift plane', () => {
  // Fixed origin, isolated by PLANE — the slot names the plane, and
  // the zone the cut registers is tagged to it.
  const spec = dungeonSpecFromRoll({ rar: 'rare', seed: 42 });
  const a = generateDungeon(spec, ORIGIN, RETURN, 0);
  const b = generateDungeon(spec, ORIGIN, RETURN, 1);
  assert.equal(a.zone.plane, riftPlaneId(0));
  assert.equal(b.zone.plane, riftPlaneId(1));
});

/** BFS walk length from the landing to a target's doorstep, in tiles. */
function walkDistance(
  ground: Uint16Array,
  s: number,
  sx: number,
  sy: number,
  tx: number,
  ty: number,
): number {
  const dist = new Int32Array(s * s).fill(-1);
  dist[sy * s + sx] = 0;
  const q = [sy * s + sx];
  while (q.length > 0) {
    const i = q.shift()!;
    const x = i % s;
    const y = Math.floor(i / s);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= s || ny >= s) continue;
      const ni = ny * s + nx;
      if (dist[ni] !== -1 || !passable(ground[ni]!)) continue;
      dist[ni] = dist[i]! + 1;
      q.push(ni);
    }
  }
  let best = -1;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
    const d = dist[(ty + dy) * s + (tx + dx)] ?? -1;
    if (d >= 0 && (best === -1 || d < best)) best = d;
  }
  return best;
}

test('THE SPINE: the road to the court is long by construction', () => {
  // The critical path is authored rung by rung — the shortest walk
  // from the landing to the champion's chest must spend the map.
  // Measured across tiers: 1.0–1.5× the side; the law pins 0.85×.
  for (const tier of ['common', 'rare', 'legendary'] as const) {
    for (let seed = 1; seed <= 10; seed++) {
      const { zone, entry, bossChest, spec } = gen(seed * 7919, tier);
      const s = zone.width;
      assert.ok(bossChest, `${tier}/${seed}: the court raises a chest`);
      const d = walkDistance(
        zone.ground,
        s,
        Math.floor(entry.x - ORIGIN.x),
        Math.floor(entry.y - ORIGIN.y),
        bossChest!.x - ORIGIN.x,
        bossChest!.y - ORIGIN.y,
      );
      assert.ok(
        d >= spec.size * 0.85,
        `${tier}/${seed}: court ${d} tiles out on a ${spec.size} map — too short a road`,
      );
    }
  }
});

test("THE CHAMPION'S COURT: every theme seats its crown over a warded chest", () => {
  // Find seeds for every theme (the seed hash deals them), then hold
  // each court to the law: a boss chest the result names, a champion
  // spawn the result indexes, the theme's own seat on it.
  const SEATS: Record<string, string[]> = {
    cavern: ['giant_spider'],
    crypt: ['skeleton_fallen_king', 'skeleton_barrow_lord'],
    mine: ['anvil_golem'],
    stronghold: ['goblin_flame_tyrant'],
    warren: ['gnoll_matriarch'],
    heartwood: ['skeleton_barrow_lord'],
  };
  const found = new Map<string, number>();
  for (let seed = 1; found.size < 6 && seed <= 600; seed++) {
    const spec = dungeonSpecFromRoll({ rar: 'rare', seed });
    if (!found.has(spec.theme)) found.set(spec.theme, seed);
  }
  assert.equal(found.size, 6, 'all six themes deal within 600 seeds');
  for (const [theme, seed] of found) {
    const { zone, bossChest, bossSpawnIndex } = gen(seed, 'rare');
    const s = zone.width;
    assert.ok(bossChest, `${theme}: court chest exists`);
    assert.equal(
      zone.ground[(bossChest!.y - ORIGIN.y) * s + (bossChest!.x - ORIGIN.x)],
      Tile.ChestBoss,
      `${theme}: the named chest cell is the boss chest`,
    );
    assert.ok(bossSpawnIndex !== null, `${theme}: champion spawn indexed`);
    const champ = (zone.spawns ?? [])[bossSpawnIndex!];
    assert.ok(champ?.name, `${theme}: the champion is named`);
    assert.ok(
      SEATS[theme]!.includes(champ!.npc),
      `${theme}: seat ${champ!.npc} is not this theme's crown`,
    );
    assert.equal(champ!.count, 1, `${theme}: one champion`);
    // THE COURT HOLDS THE CROWN: the seat's arena override must fit
    // the 23×15 arena prefab (walkable half-extents ≈ 9.5×6.5) — an
    // open-ground arenaR would chase kiters up the approach corridor
    // and park the rim guard outside the walls where it never fires.
    assert.ok(
      champ!.arenaR !== undefined && champ!.arenaR <= 9,
      `${theme}: court seat arenaR ${champ!.arenaR} exceeds the arena prefab`,
    );
  }
});

test('THE ROAD STAYS LONG: the shortcut seeds the proving caught stay closed', () => {
  // Two real regressions, pinned by seed: a common crypt whose loop
  // chorded the road to 0.82×, and a rare crypt whose monotone
  // diagonal spine let branch blobs bridge the entry→court chord
  // (0.73×). The plan-time loop guard + the direct-manhattan spine
  // extension close both — and must stay closed.
  for (const [seed, tier] of [
    [12345, 'common'],
    [2619526897, 'rare'],
  ] as const) {
    const { zone, entry, bossChest, spec } = gen(seed, tier);
    const d = walkDistance(
      zone.ground,
      zone.width,
      Math.floor(entry.x - ORIGIN.x),
      Math.floor(entry.y - ORIGIN.y),
      bossChest!.x - ORIGIN.x,
      bossChest!.y - ORIGIN.y,
    );
    assert.ok(
      d >= spec.size * 0.85,
      `${tier}/${seed}: road ${d} on a ${spec.size} map — the shortcut reopened`,
    );
  }
});

test('THE WAY HOME OPENS: the court keeps a sealed rift-mouth, floor until earned', () => {
  for (const tier of ['common', 'legendary'] as const) {
    for (let seed = 1; seed <= 12; seed++) {
      const { zone, bossChest, courtExit } = gen(seed * 7919, tier);
      const s = zone.width;
      assert.ok(courtExit, `${tier}/${seed}: the court seats a way home`);
      // Registered as a portal already…
      assert.ok(
        (zone.portals ?? []).some((p) => p.x === courtExit!.x && p.y === courtExit!.y),
        `${tier}/${seed}: the rift-mouth is a registered portal`,
      );
      // …but the tile stays plain floor until the champion falls.
      const t = zone.ground[(courtExit!.y - ORIGIN.y) * s + (courtExit!.x - ORIGIN.x)]!;
      assert.ok(
        t === Tile.CaveFloor || t === Tile.DungeonFloor,
        `${tier}/${seed}: sealed mouth is floor, not ${t}`,
      );
      // And it stands in the court, below the prize.
      assert.ok(bossChest, `${tier}/${seed}: court chest exists`);
      const dx = courtExit!.x - bossChest!.x;
      const dy = courtExit!.y - bossChest!.y;
      assert.ok(Math.hypot(dx, dy) <= 16, `${tier}/${seed}: mouth ${Math.hypot(dx, dy)} from dais`);
    }
  }
});

test('THE TURNED SEED: modifiers are pure, tier-budgeted, and distinct', () => {
  for (let seed = 1; seed <= 200; seed++) {
    for (const tier of RARITY_TIERS) {
      const a = dungeonModifiers(seed, tier);
      const b = dungeonModifiers(seed, tier);
      assert.deepEqual(a, b, 'same seed, same words');
      const ids = a.map((m) => m.id);
      assert.equal(new Set(ids).size, ids.length, 'no word turned twice');
      const budget: Record<RarityTier, [number, number]> = {
        common: [0, 1],
        uncommon: [1, 1],
        rare: [1, 2],
        epic: [2, 2],
        legendary: [2, 3],
      };
      const [lo, hi] = budget[tier];
      assert.ok(a.length >= lo && a.length <= hi, `${tier}: ${a.length} words`);
    }
  }
});

test('THE LIVED-IN DARK: war themes seat posts and the halls are walked', () => {
  // Across a spread of war-theme seeds, at least some camps seat
  // posted bodies and some corridor sentries carry patrol rounds —
  // the fixtures exist, hop lengths stay lawful.
  let posts = 0;
  let patrols = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const spec = dungeonSpecFromRoll({ rar: 'epic', seed });
    if (spec.theme !== 'stronghold' && spec.theme !== 'warren') continue;
    const { zone } = gen(seed, 'epic');
    for (const sp of zone.spawns ?? []) {
      if (sp.post) {
        posts++;
        assert.equal(sp.count, 1, 'a post is one body');
      }
      if (sp.patrol) {
        patrols++;
        assert.ok(sp.patrol.length >= 3, 'a round has stops');
        for (let i = 1; i < sp.patrol.length; i++) {
          const a = sp.patrol[i - 1]!;
          const b = sp.patrol[i]!;
          assert.ok(
            Math.hypot(a.x - b.x, a.y - b.y) <= 12,
            'patrol hops stay walkable',
          );
        }
      }
    }
  }
  assert.ok(posts >= 1, `war camps seat posted bodies (${posts})`);
  assert.ok(patrols >= 3, `corridor sentries walk rounds (${patrols})`);
});
