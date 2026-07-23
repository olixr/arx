import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  DOOR_TILES,
  RARITY_TIERS,
  Tile,
  dungeonSpecFromRoll,
  isSolidTile,
  type RarityTier,
} from '@devcraft/shared';
import { NPCS } from '@devcraft/content';
import { dungeonOrigin, generateDungeon } from './generate.js';

const ORIGIN = { x: 8192, y: 8192 };
const RETURN = { x: 60, y: 34 };

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

test('dungeon origin slots never overlap', () => {
  const a = dungeonOrigin(0);
  const b = dungeonOrigin(1);
  assert.ok(b.x - a.x >= 136 + 32, 'slot spacing clears the largest tier');
});
