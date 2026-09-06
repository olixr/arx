import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHUNK_SIZE, Detail, Tile, TREE_TILES, hashCoords } from '@arx/shared';
import {
  ELDER_SALT,
  FOREST_LAW,
  FOREST_LINE,
  canopyCoverAt,
  copseCoverAt,
  dampOf,
  latticeCandidate,
  latticeTreeAt,
  standAt,
  standGateAt,
} from './forest.js';
import { WORLD_SEED, coldAt, generateChunk, levelAt, moistureAt } from './worldgen.js';

/**
 * THE WOOD LEARNS TO BREATHE — the proofs. Each number below was
 * measured on the shipped seed and pinned with room to breathe; the
 * before/after census lives in docs/forest-plan.md.
 */

const SAPLINGS = new Set([
  Tile.Sapling,
  Tile.SaplingOak,
  Tile.SaplingWillow,
  Tile.SaplingYew,
  Tile.SaplingPine,
]);

interface Census {
  land: number;
  forest: number;
  trees: number;
  touching: number;
  byBin: Record<string, { n: number; trees: number }>;
  meadowTrees: number;
  meadow: number;
  saplings: number;
  litter: number;
  bracken: number;
  shadeGrass: number;
  shadeLitter: number;
  stumpsDry: number;
  snagsDry: number;
  sagewort: number;
  copseWindows: number;
}

/** Walk a block of chunks (interior tiles only, so every neighbour is in hand). */
function census(cx0: number, cy0: number, cx1: number, cy1: number): Census {
  const c: Census = {
    land: 0,
    forest: 0,
    trees: 0,
    touching: 0,
    byBin: {},
    meadowTrees: 0,
    meadow: 0,
    saplings: 0,
    litter: 0,
    bracken: 0,
    shadeGrass: 0,
    shadeLitter: 0,
    stumpsDry: 0,
    snagsDry: 0,
    sagewort: 0,
    copseWindows: 0,
  };
  for (let cy = cy0; cy <= cy1; cy++) {
    for (let cx = cx0; cx <= cx1; cx++) {
      const ch = generateChunk(WORLD_SEED, cx, cy);
      const g = ch.ground;
      const d = ch.detail;
      const at = (lx: number, ly: number): number => g[ly * CHUNK_SIZE + lx]!;
      const treeAt = (lx: number, ly: number): boolean => TREE_TILES.has(at(lx, ly) as Tile);
      for (let ly = 1; ly < CHUNK_SIZE - 1; ly++) {
        for (let lx = 1; lx < CHUNK_SIZE - 1; lx++) {
          const t = at(lx, ly);
          if (t === Tile.Water || t === Tile.WaterDeep || t === Tile.WaterShallow) continue;
          const tx = cx * CHUNK_SIZE + lx;
          const ty = cy * CHUNK_SIZE + ly;
          if (levelAt(WORLD_SEED, tx, ty) !== 0) continue;
          c.land++;
          const m = moistureAt(WORLD_SEED, tx, ty);
          const forest = m > FOREST_LINE;
          let shaded = false;
          let n8 = 0;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if ((dx !== 0 || dy !== 0) && treeAt(lx + dx, ly + dy)) {
                n8++;
                shaded = true;
              }
            }
          }
          if (forest) {
            c.forest++;
            const bin = m > 0.9 ? 'core' : m > 0.8 ? 'deep' : m > 0.7 ? 'mid' : 'fringe';
            const b = (c.byBin[bin] ??= { n: 0, trees: 0 });
            b.n++;
            if (TREE_TILES.has(t as Tile)) {
              b.trees++;
              c.trees++;
              if (n8 > 0) c.touching++;
            }
            if (SAPLINGS.has(t as Tile)) c.saplings++;
            if (t === Tile.WildSagewort) c.sagewort++;
            const dd = d[ly * CHUNK_SIZE + lx];
            if (dd === Detail.LeafLitter) c.litter++;
            if (dd === Detail.Bracken) c.bracken++;
            if (t === Tile.Grass && shaded) {
              c.shadeGrass++;
              if (dd === Detail.LeafLitter) c.shadeLitter++;
            }
            if (dampOf(m) <= 0.5) {
              if (t === Tile.Stump) c.stumpsDry++;
              if (t === Tile.DeadTree) c.snagsDry++;
            }
          } else if (m >= 0.34) {
            c.meadow++;
            if (TREE_TILES.has(t as Tile)) {
              c.meadowTrees++;
              if (n8 > 0) c.touching++;
            }
          }
          // A copse: a 5×5 window holding three or more field trees.
          if (!forest && lx >= 2 && ly >= 2 && lx < CHUNK_SIZE - 2 && ly < CHUNK_SIZE - 2) {
            let k = 0;
            for (let dy = -2; dy <= 2; dy++) {
              for (let dx = -2; dx <= 2; dx++) if (treeAt(lx + dx, ly + dy)) k++;
            }
            if (k >= 3) c.copseWindows++;
          }
        }
      }
    }
  }
  return c;
}

// The Thornveil and the Everwood — two named woods, one warm and one
// high-latitude, plus the open country south of Dawnmead.
const WIDE = census(-40, -20, 20, 10);

test('the fields stay in bounds', () => {
  for (let i = 0; i < 2000; i++) {
    const tx = (hashCoords(1, i, 7) % 4000) - 2000;
    const ty = (hashCoords(2, i, 9) % 3000) - 1500;
    const s = standAt(WORLD_SEED, tx, ty);
    assert.ok(s > -0.2 && s < 1.2, `stand ${s}`);
    for (const m of [0.5, 0.62, 0.7, 0.85, 1.1]) {
      const c = canopyCoverAt(WORLD_SEED, tx, ty, m);
      assert.ok(c >= 0 && c <= 1, `cover ${c}`);
      if (m <= FOREST_LINE) assert.equal(c, 0, 'no canopy below the forest line');
      const g = standGateAt(WORLD_SEED, tx, ty, dampOf(m));
      assert.ok(g >= 0 && g <= 1);
    }
    const k = copseCoverAt(WORLD_SEED, tx, ty);
    assert.ok(k >= FOREST_LAW.copseFloor - 1e-9 && k <= FOREST_LAW.copseCover + 1e-9);
  }
});

test('the lattice: one candidate per cell, inside its cell, vigor in 0..1', () => {
  for (const cell of [2, 4, 5]) {
    for (let i = 0; i < 500; i++) {
      const cx = (hashCoords(3, i, cell) % 1000) - 500;
      const cy = (hashCoords(4, i, cell) % 1000) - 500;
      const c = latticeCandidate(WORLD_SEED, ELDER_SALT, cx, cy, cell);
      assert.ok(c.x >= cx * cell && c.x < (cx + 1) * cell);
      assert.ok(c.y >= cy * cell && c.y < (cy + 1) * cell);
      assert.ok(c.vigor >= 0 && c.vigor < 1);
    }
  }
});

test('THE WEEDING: under any cover field, two standing trees never touch', () => {
  // A deliberately lumpy cover so the gate varies tile to tile.
  const cover = (x: number, y: number): number => (hashCoords(77, x, y) % 1000) / 1000;
  for (const cell of [2, 3, 5]) {
    const stands = new Set<string>();
    for (let y = -60; y < 60; y++) {
      for (let x = -60; x < 60; x++) {
        if (latticeTreeAt(WORLD_SEED, ELDER_SALT, cell, x, y, cover)) stands.add(`${x},${y}`);
      }
    }
    assert.ok(stands.size > 100, `cell ${cell} grew only ${stands.size} trees`);
    for (const key of stands) {
      const [x, y] = key.split(',').map(Number) as [number, number];
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if ((dx !== 0 || dy !== 0) && stands.has(`${x + dx},${y + dy}`)) {
            assert.fail(`cell ${cell}: trees touch at ${key} and ${x + dx},${y + dy}`);
          }
        }
      }
    }
  }
});

test('the lattice is pure: the same tile answers the same, whatever chunk asks', () => {
  // Two chunks that share a border must agree on the border trees:
  // the memoized margin can never change a verdict.
  const a = generateChunk(WORLD_SEED, -14, -10);
  const b = generateChunk(WORLD_SEED, -13, -10);
  const c2 = generateChunk(WORLD_SEED, -14, -9);
  const g = (ch: { ground: Uint16Array }, lx: number, ly: number) => ch.ground[ly * CHUNK_SIZE + lx]!;
  // Re-generate a and compare whole.
  const a2 = generateChunk(WORLD_SEED, -14, -10);
  assert.deepEqual([...a.ground], [...a2.ground]);
  assert.deepEqual([...a.detail], [...a2.detail]);
  // Across the border: no two trees touch even between chunks.
  for (let ly = 0; ly < CHUNK_SIZE; ly++) {
    if (!TREE_TILES.has(g(a, CHUNK_SIZE - 1, ly) as Tile)) continue;
    for (let dy = -1; dy <= 1; dy++) {
      const ny = ly + dy;
      if (ny < 0 || ny >= CHUNK_SIZE) continue;
      assert.ok(!TREE_TILES.has(g(b, 0, ny) as Tile), `trees touch across the x seam at row ${ly}`);
    }
  }
  for (let lx = 0; lx < CHUNK_SIZE; lx++) {
    if (!TREE_TILES.has(g(a, lx, CHUNK_SIZE - 1) as Tile)) continue;
    for (let dx = -1; dx <= 1; dx++) {
      const nx = lx + dx;
      if (nx < 0 || nx >= CHUNK_SIZE) continue;
      assert.ok(!TREE_TILES.has(g(c2, nx, 0) as Tile), `trees touch across the y seam at col ${lx}`);
    }
  }
});

test('the shipped wood: no tree touches another, anywhere in the sample', () => {
  assert.ok(WIDE.trees > 5000, `sample too small: ${WIDE.trees} trees`);
  assert.equal(WIDE.touching, 0);
});

test('the shipped wood: a third of the old stand, thickest in the cores', () => {
  const dens = (k: string): number => {
    const b = WIDE.byBin[k]!;
    return b.trees / b.n;
  };
  // The old law dealt 0.108 / 0.196 / 0.283 / 0.403 in these bins.
  assert.ok(dens('fringe') > 0.035 && dens('fringe') < 0.08, `fringe ${dens('fringe')}`);
  assert.ok(dens('mid') > 0.045 && dens('mid') < 0.09, `mid ${dens('mid')}`);
  assert.ok(dens('deep') > 0.055 && dens('deep') < 0.11, `deep ${dens('deep')}`);
  assert.ok(dens('core') > 0.065 && dens('core') < 0.13, `core ${dens('core')}`);
  assert.ok(dens('core') > dens('fringe'), 'the core is the thickest stand');
  assert.ok(WIDE.trees / WIDE.forest < 0.1, `overall ${WIDE.trees / WIDE.forest}`);
});

test('the floor: litter under the crowns, bracken in the gaps, young trees between', () => {
  assert.ok(WIDE.shadeLitter / WIDE.shadeGrass > 0.3, 'litter under the crowns');
  assert.ok(WIDE.litter > 0 && WIDE.bracken > 0);
  assert.ok(WIDE.saplings / WIDE.forest > 0.008, `saplings ${WIDE.saplings / WIDE.forest}`);
  assert.ok(WIDE.saplings / WIDE.forest < 0.04);
  // Snags belong to the old wood only (stumps also come from road
  // shoulders and the scorch, so only the snag is a clean pin).
  assert.equal(WIDE.snagsDry, 0);
});

test('the forager keeps the wood: the herb deal holds its share', () => {
  // WildSagewort at flora < 0.008 on every non-elder forest tile. With
  // fewer elders the herb finds a touch MORE ground, never less.
  const share = WIDE.sagewort / WIDE.forest;
  assert.ok(share > 0.006 && share < 0.0095, `sagewort share ${share}`);
});

test('the meadow: copses where the field crests, no speckle', () => {
  const share = WIDE.meadowTrees / WIDE.meadow;
  assert.ok(share > 0.002 && share < 0.009, `meadow tree share ${share}`);
  assert.ok(WIDE.copseWindows > 50, `copses ${WIDE.copseWindows}`);
});

test('the taiga still stands north: pines keep the cold share', () => {
  let pine = 0;
  let broad = 0;
  for (let cy = -48; cy <= -40; cy += 2) {
    for (let cx = 22; cx <= 38; cx += 2) {
      const g = generateChunk(WORLD_SEED, cx, cy).ground;
      for (let i = 0; i < g.length; i++) {
        if (g[i] === Tile.TreePine) pine++;
        else if (TREE_TILES.has(g[i] as Tile)) broad++;
      }
    }
  }
  assert.ok(pine > broad, `north pine ${pine} vs broadleaf ${broad}`);
  assert.ok(coldAt(WORLD_SEED, 500, -700) > 0.8);
});
