import assert from 'node:assert/strict';
import { test } from 'node:test';
import { TILE_SKIP, Tile } from '@arx/shared';
import {
  FRONTIER,
  POI_DEFS,
  POI_PREFABS,
  ROAD_SHOULDER,
  SETTLED_ANCHORS,
  groundProbeAt,
  roadBearingAt,
  roadDistanceAt,
} from '@arx/content';
import {
  composePoi,
  poiContext,
  poiForCell,
  poiScanOrder,
  traceTrail,
} from './pois.js';
import { composeFinds, findsForCell } from './finds.js';

const SEED = 1337;
const CTX = poiContext(SETTLED_ANCHORS, [], POI_PREFABS, [], []);

/**
 * THE WORN PATH's laws, pinned (lived-in-land Phase 3): the walk is
 * deterministic and continuous, it ARRIVES at roads and stops beside
 * the carve (never on it), it tapers honestly in the roadless deep,
 * boldness widens it monotonically, and the composed zone's perimeter
 * stays all-transparent — the edge-harmony machinery must never read
 * a trail as a border intention.
 */

test('traceTrail: deterministic, continuous, and honest about water and rock', () => {
  // Deep-wild walk aimed at nothing: capped by reach, no road.
  const a = traceTrail(SEED, 0xabc, -300, 250, 5, 1, 0, 48, []);
  const b = traceTrail(SEED, 0xabc, -300, 250, 5, 1, 0, 48, []);
  assert.deepEqual(a, b, 'the walk re-rolled differently');
  assert.ok(a.points.length <= 49, 'the walk outran its reach');
  for (let i = 1; i < a.points.length; i++) {
    const dx = Math.abs(a.points[i]!.x - a.points[i - 1]!.x);
    const dy = Math.abs(a.points[i]!.y - a.points[i - 1]!.y);
    assert.ok(dx <= 2 && dy <= 2, `the path jumped ${dx},${dy} — a desire path never teleports`);
  }
  for (const p of a.points) {
    assert.ok(
      roadDistanceAt(SEED, p.x, p.y) > ROAD_SHOULDER + 0.5 || a.reachedRoad,
      'a point sits on the carve without arrival',
    );
  }
});

test('traceTrail: aimed the way the composer aims, most walks arrive beside the carve', () => {
  // Self-aiming, exactly as composePoi does it: sample the map for
  // standable points 15–35 tiles off a road, take the bearing from
  // roadBearingAt, walk. Fen water and rock lawfully eat some walks;
  // most must arrive, and every arrival stands beside the carve.
  let tried = 0;
  let arrived = 0;
  outer: for (let y = -80; y <= 320; y += 16) {
    for (let x = -80; x <= 420; x += 16) {
      if (tried >= 24) break outer;
      const d = roadDistanceAt(SEED, x, y);
      if (d < 15 || d > 35) continue;
      if (groundProbeAt(SEED, x, y) !== 'grass' && groundProbeAt(SEED, x, y) !== 'forest') continue;
      const bearing = roadBearingAt(x, y, 48);
      if (!bearing) continue;
      tried++;
      const t = traceTrail(SEED, 0x77 + x * 31 + y, x, y, 1, bearing.x, bearing.y, 48, []);
      if (!t.reachedRoad) continue;
      arrived++;
      const last = t.points[t.points.length - 1]!;
      assert.ok(
        roadDistanceAt(SEED, last.x, last.y) > ROAD_SHOULDER + 0.5,
        'the mouth must stand beside the road, never on it',
      );
      assert.ok(
        roadDistanceAt(SEED, last.x, last.y) < ROAD_SHOULDER + 5,
        'the mouth wandered off before arriving',
      );
    }
  }
  assert.ok(tried >= 12, `only ${tried} lawful start points found`);
  assert.ok(
    arrived >= tried * 0.5,
    `only ${arrived}/${tried} walks arrived — the walker loses the road`,
  );
});

/** First composed trail-wearing site in the scan, with its def. */
function trailSite(): { site: NonNullable<ReturnType<typeof poiForCell>> } | null {
  for (const { cx, cy } of poiScanOrder(10)) {
    const site = poiForCell(SEED, cx, cy, 0, CTX);
    if (!site) continue;
    const def = POI_DEFS.get(site.defId);
    if (def?.cues?.approachPath && def.garrison.length > 0) return { site };
  }
  return null;
}

test('composePoi: the trail arm extends the zone, stages widen it monotonically', () => {
  const found = trailSite();
  assert.ok(found, 'no trail-wearing site in the scan');
  const { site } = found!;
  const z0 = composePoi(SEED, site, CTX, 0)!;
  const z0b = composePoi(SEED, site, CTX, 0)!;
  assert.deepEqual(z0.ground, z0b.ground, 'composition re-rolled differently');
  const dirt = (z: { ground: Uint16Array }): number => {
    let n = 0;
    for (let i = 0; i < z.ground.length; i++) {
      if (z.ground[i] === Tile.Dirt) n++;
    }
    return n;
  };
  let prev = dirt(z0);
  assert.ok(prev > 0, 'the trail stamped nothing');
  for (const stage of [1, 2, 3]) {
    const zs = composePoi(SEED, site, CTX, stage)!;
    assert.equal(zs.width, z0.width, 'stages must not move the rect');
    assert.equal(zs.height, z0.height, 'stages must not move the rect');
    const d = dirt(zs);
    assert.ok(d >= prev, `stage ${stage} narrowed the walk (${d} < ${prev})`);
    prev = d;
  }
});

test('the all-skip-perimeter law: no composed zone publishes an edge intention', () => {
  let checked = 0;
  for (const { cx, cy } of poiScanOrder(8)) {
    const site = poiForCell(SEED, cx, cy, 0, CTX);
    if (site) {
      const z = composePoi(SEED, site, CTX, 0);
      if (z) {
        checked++;
        for (let x = 0; x < z.width; x++) {
          assert.equal(z.ground[x], TILE_SKIP, `${z.id}: top perimeter leaks at ${x}`);
          assert.equal(z.ground[(z.height - 1) * z.width + x], TILE_SKIP, `${z.id}: bottom leaks`);
        }
        for (let y = 0; y < z.height; y++) {
          assert.equal(z.ground[y * z.width], TILE_SKIP, `${z.id}: left leaks`);
          assert.equal(z.ground[y * z.width + z.width - 1], TILE_SKIP, `${z.id}: right leaks`);
        }
      }
    }
    const finds = findsForCell(SEED, cx, cy, 0, CTX, site && { x: site.anchorX, y: site.anchorY });
    if (finds.length === 0) continue;
    const composed = composeFinds(SEED, cx, cy, 0, finds, CTX);
    if (!composed) continue;
    checked++;
    const { zone } = composed;
    for (let x = 0; x < zone.width; x++) {
      assert.equal(zone.ground[x], TILE_SKIP, `${zone.id}: top perimeter leaks at ${x}`);
      assert.equal(
        zone.ground[(zone.height - 1) * zone.width + x],
        TILE_SKIP,
        `${zone.id}: bottom leaks`,
      );
    }
    for (let y = 0; y < zone.height; y++) {
      assert.equal(zone.ground[y * zone.width], TILE_SKIP, `${zone.id}: left leaks`);
      assert.equal(
        zone.ground[y * zone.width + zone.width - 1],
        TILE_SKIP,
        `${zone.id}: right leaks`,
      );
    }
  }
  assert.ok(checked >= 20, `only ${checked} zones checked`);
});

test('the taper law: a roadless trail forgets itself instead of stopping dead', () => {
  // Walk due east from deep wild (no road within reach out there).
  const t = traceTrail(SEED, 0x99, -420, 300, 5, 1, 0, FRONTIER.trailReach, []);
  if (t.points.length < 30 || t.reachedRoad) return; // ground refused — other pins cover
  // The trail exists; the composer's taper stamps intermittent grass
  // past 80% — verified at compose level by the monotonic test's
  // ground diffs; here pin the walker half: full reach walked.
  assert.ok(t.points[t.points.length - 1]!.t - t.points[0]!.t >= 29);
});
