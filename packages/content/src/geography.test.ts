import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AMBERFORD_RECT,
  AUTHORED_WILD_SITES,
  DAWNMEAD_RECT,
  PLANNED_ZONE_RECTS,
  ROAD_ROUTES,
  SILVERFALL_RECT,
  distToRect,
  fieldApronAt,
  massifAt,
  nearRoads,
  roadBearingAt,
  roadDistanceAt,
  roadHitAt,
  thornveilAt,
} from './geography.js';
import { buildDawnmead } from './maps/dawnmead.js';

/**
 * THE GEOGRAPHY IS LOAD-BEARING: zone builds stamp into exactly these
 * rects and the roads aim at exactly these gates, so drift between the
 * plan's numbers and the built world is a content bug worth failing
 * the build over.
 */

test('the Dawnmead rect matches the built zone exactly', () => {
  const z = buildDawnmead();
  assert.equal(z.origin.x, DAWNMEAD_RECT.x);
  assert.equal(z.origin.y, DAWNMEAD_RECT.y);
  assert.equal(z.width, DAWNMEAD_RECT.w);
  assert.equal(z.height, DAWNMEAD_RECT.h);
});

test('every route starts and ends at a planned zone (gates meet roads)', () => {
  const inAnyRect = (x: number, y: number): boolean =>
    PLANNED_ZONE_RECTS.some(
      (r) => x >= r.x - 1 && x <= r.x + r.w && y >= r.y - 1 && y <= r.y + r.h,
    );
  for (const route of ROAD_ROUTES) {
    const a = route.pts[0]!;
    const b = route.pts[route.pts.length - 1]!;
    // The Hunter's Trail ends at the Thornveil Fork ON the High Road,
    // not at a zone — its endpoint must instead sit on another route.
    if (route.id === 'hunters_trail') {
      assert.ok(inAnyRect(a.x, a.y), `${route.name} start is loose`);
      const high = ROAD_ROUTES.find((r) => r.id === 'high_road')!;
      const onHigh = high.pts.some((p) => p.x === b.x && p.y === b.y);
      assert.ok(onHigh, `${route.name} must end on a High Road waypoint (the fork)`);
      continue;
    }
    assert.ok(inAnyRect(a.x, a.y), `${route.name} start is loose`);
    assert.ok(inAnyRect(b.x, b.y), `${route.name} end is loose`);
  }
});

test('routes stay far above the dark band', () => {
  for (const route of ROAD_ROUTES) {
    for (const p of route.pts) {
      assert.ok(p.y < 400, `${route.name} waypoint (${p.x},${p.y}) rides toward the dark band`);
    }
  }
});

test('the fields fall off to honest zero in the far frontier', () => {
  assert.equal(massifAt(2000, 2000), 0);
  assert.equal(thornveilAt(2000, 2000), 0);
  assert.equal(fieldApronAt(2000, 2000, 64), 0);
  assert.equal(roadDistanceAt(1337, 2000, 2000), Infinity);
  assert.equal(nearRoads(1900, 1900, 2100, 2100), false);
});

test('road queries agree with themselves (deterministic, kind-aware)', () => {
  const a = roadHitAt(1337, 50, 45);
  const b = roadHitAt(1337, 50, 45);
  assert.deepEqual(a, b);
  assert.ok(a !== null && a.dist < 8, 'the First Road runs near (50,45)');
  assert.equal(a!.trail, false);
  const t = roadHitAt(1337, -60, -10);
  assert.ok(t !== null && t.trail, "the Hunter's Trail near (-60,-10) reads as a trail");
});

test('distToRect is zero inside, exact outside', () => {
  assert.equal(distToRect(120, 20, AMBERFORD_RECT), 0);
  assert.equal(distToRect(AMBERFORD_RECT.x - 10, 20, AMBERFORD_RECT), 10);
  assert.equal(
    distToRect(SILVERFALL_RECT.x + 5, SILVERFALL_RECT.y + 5, SILVERFALL_RECT),
    0,
  );
});

// ------------------------------------------------------------------
// THE AUTHORED WILD SITES — Epic 3's fixed points. One site per
// macro-cell is the scaffold's law; the mileposts must sit beside
// their road (never ON it), and nothing may claim settled ground.
// ------------------------------------------------------------------

test('authored wild sites claim distinct macro-cells', () => {
  const cells = new Set<string>();
  for (const s of AUTHORED_WILD_SITES) {
    const cx = s.cell ? s.cell[0] : Math.floor(s.x! / 128);
    const cy = s.cell ? s.cell[1] : Math.floor(s.y! / 128);
    const key = `${cx},${cy}`;
    assert.ok(!cells.has(key), `${s.id} shares macro-cell ${key} with another site`);
    cells.add(key);
  }
});

test('pinned mileposts stand beside the road, never on it', () => {
  for (const s of AUTHORED_WILD_SITES) {
    if (s.x === undefined || s.y === undefined) continue;
    const d = roadDistanceAt(1337, s.x, s.y);
    assert.ok(d > 4.5, `${s.id} anchor sits inside the road shoulder (${d.toFixed(1)})`);
    assert.ok(d < 26, `${s.id} anchor wandered off the road (${d.toFixed(1)})`);
    // The plan never pins a landmark inside its own future streets.
    for (const rect of PLANNED_ZONE_RECTS) {
      assert.ok(
        distToRect(s.x, s.y, rect) > 8,
        `${s.id} anchors inside a planned zone rect's near apron`,
      );
    }
  }
});

test('roadBearingAt points at the road, and honestly refuses far ground', () => {
  // A point south of the First Road: the bearing must lead back to it.
  const b = roadBearingAt(50, 60, 40);
  assert.ok(b !== null, 'the First Road is within 40 of (50,60)');
  const step = 10;
  const before = roadDistanceAt(1337, 50, 60);
  const after = roadDistanceAt(1337, Math.round(50 + b!.x * step), Math.round(60 + b!.y * step));
  assert.ok(after < before, 'walking the bearing must close on the road');
  // The deep frontier has no bearing to give.
  assert.equal(roadBearingAt(2000, 2000, 40), null);
});
