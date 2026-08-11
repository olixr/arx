import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dangerAt, type DangerAnchor } from '@arx/shared';
import { POI_DEFS } from './pois/defs.js';
import {
  AMBERFORD_RECT,
  AUTHORED_GEOGRAPHY,
  AUTHORED_WILD_SITES,
  DAWNMEAD_RECT,
  PLANNED_ZONE_RECTS,
  ROAD_ROUTES,
  SILVERFALL_RECT,
  distToRect,
  fenAt,
  fieldApronAt,
  geographySnapshot,
  geographyWarnings,
  massifAt,
  nearRoads,
  replaceGeography,
  roadBearingAt,
  roadDistanceAt,
  roadHitAt,
  routeBridgeDecks,
  ROAD_SPAN_MAX,
  TRAIL_SPAN_MAX,
  thornveilAt,
  validateGeographyDef,
} from './geography.js';
import { SETTLED_ANCHORS } from './danger.js';
import { buildDawnmead } from './maps/dawnmead.js';
import { elevationAt } from './worldgen.js';

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
    // The Sparway forks off the Timber Road at the bend where the
    // wains turn north around the braid country — the shortcut IS
    // the refusal to go around. Fork start, Pinewatch west gate end.
    if (route.id === 'sparway') {
      const timber = ROAD_ROUTES.find((r) => r.id === 'timber_road')!;
      const onTimber = timber.pts.some((p) => p.x === a.x && p.y === a.y);
      assert.ok(onTimber, `${route.name} must start on a Timber Road waypoint (the fork)`);
      assert.ok(inAnyRect(b.x, b.y), `${route.name} end is loose`);
      continue;
    }
    // The Hartway forks off the Timber Road's last-league waypoint
    // below Pinewatch — every wain north rolls past the town's walls
    // first. The fork IS the start; the end is Hartfell's gate.
    if (route.id === 'hartway') {
      const timber = ROAD_ROUTES.find((r) => r.id === 'timber_road')!;
      const onTimber = timber.pts.some((p) => p.x === a.x && p.y === a.y);
      assert.ok(onTimber, `${route.name} must start on a Timber Road waypoint (the fork)`);
      assert.ok(inAnyRect(b.x, b.y), `${route.name} end is loose`);
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
  assert.equal(fenAt(2000, 2000), 0);
  assert.equal(fieldApronAt(2000, 2000, 64), 0);
  assert.equal(roadDistanceAt(1337, 2000, 2000), Infinity);
  assert.equal(nearRoads(1900, 1900, 2100, 2100), false);
});

test('road queries agree with themselves (deterministic, kind-aware)', () => {
  const a = roadHitAt(1337, 34, 95);
  const b = roadHitAt(1337, 34, 95);
  assert.deepEqual(a, b);
  assert.ok(a !== null && a.dist < 8, 'the First Road runs the causeway near (34,95)');
  assert.equal(a!.trail, false);
  const t = roadHitAt(1337, -60, -10);
  assert.ok(t !== null && t.trail, "the Hunter's Trail near (-60,-10) reads as a trail");
});

test('distToRect is zero inside, exact outside', () => {
  assert.equal(distToRect(AMBERFORD_RECT.x + 16, 20, AMBERFORD_RECT), 0);
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
  // A point north of the First Road's shore leg: the bearing must lead back to it.
  const b = roadBearingAt(56, 64, 40);
  assert.ok(b !== null, 'the First Road is within 40 of (56,64)');
  const step = 10;
  const before = roadDistanceAt(1337, 56, 64);
  const after = roadDistanceAt(1337, Math.round(56 + b!.x * step), Math.round(64 + b!.y * step));
  assert.ok(after < before, 'walking the bearing must close on the road');
  // The deep frontier has no bearing to give.
  assert.equal(roadBearingAt(2000, 2000, 40), null);
});

// ------------------------------------------------------------------
// THE LIVE REGISTRY — the plan is editable data now. The validator is
// the one gate; replaceGeography must move every query and every
// exported array in the same breath, and the authored plan must
// round-trip through its own validator (the seed law).
// ------------------------------------------------------------------

test('the authored plan passes its own validator, byte-honest', () => {
  const res = validateGeographyDef(AUTHORED_GEOGRAPHY);
  assert.ok(res.ok, 'authored plan must validate');
  if (res.ok) {
    assert.equal(res.def.routes.length, AUTHORED_GEOGRAPHY.routes.length);
    assert.equal(res.def.sites.length, AUTHORED_GEOGRAPHY.sites.length);
    assert.equal(res.def.anchors.length, AUTHORED_GEOGRAPHY.anchors.length);
  }
});

test('the authored plan earns no warnings from its own counsel', () => {
  assert.deepEqual(
    geographyWarnings(AUTHORED_GEOGRAPHY, 1337, (x, y) => elevationAt(1337, x, y)),
    [],
  );
});

// ------------------------------------------------------------------
// THE SHORT SPAN LAW — a road bridges necks, not lakes. Every deck
// the carve would lay is measured against the real terrain and the
// worst one is named, so a re-drawn waypoint that wades into a mere
// fails with an address instead of a shrug.
// ------------------------------------------------------------------

test('every route crosses water only at short necks (the span law, route by route)', () => {
  const decks = routeBridgeDecks(AUTHORED_GEOGRAPHY, 1337, (x, y) => elevationAt(1337, x, y));
  for (const route of AUTHORED_GEOGRAPHY.routes) {
    const own = decks.filter((d) => d.routeId === route.id);
    const max = route.kind === 'trail' ? TRAIL_SPAN_MAX : ROAD_SPAN_MAX;
    for (const d of own) {
      assert.ok(
        d.span <= max,
        `${route.name} lays a ${d.span}-tile deck at (${d.x0},${d.y0})..(${d.x1},${d.y1}) — the law allows ${max}`,
      );
      assert.equal(
        d.deep,
        0,
        `${route.name} bridges deep water at (${d.x0},${d.y0})..(${d.x1},${d.y1}) — bridges cross necks, never cores`,
      );
    }
  }
});

test('the validator collects every error and names its subject', () => {
  const res = validateGeographyDef({
    routes: [{ id: 'Bad Id', name: '', kind: 'lane', pts: [{ x: 0, y: 0 }] }],
    sites: [
      { id: 'twin_a', defId: 'waystation', x: 10, y: 10 },
      { id: 'twin_b', defId: 'waystation', x: 20, y: 20 },
      { id: 'confused', defId: 'waystation', x: 5, y: 5, cell: [3, 3] },
    ],
    anchors: [],
    massifs: [{ id: 'flat', x: 0, y: 0, r: 2 }],
    veils: [],
    planned: [{ id: 'huge', x: 0, y: 0, w: 9999, h: 4 }],
  });
  assert.ok(!res.ok);
  if (!res.ok) {
    const all = res.errors.join(' | ');
    assert.match(all, /routes\[0\]\.id/);
    assert.match(all, /shares macro-cell/);
    assert.match(all, /'confused'.*not both/);
    assert.match(all, /anchors must be a non-empty array/);
    assert.match(all, /massifs\[0\]/);
    assert.match(all, /planned\[0\]/);
  }
});

test('the validator refuses a site wearing an unknown archetype when refs are given', () => {
  const snap = geographySnapshot();
  snap.sites = [{ id: 'lost', defId: 'no_such_place', x: 500, y: 500 }];
  const res = validateGeographyDef(snap, { poiDefIds: new Set(['waystation']) });
  assert.ok(!res.ok);
  if (!res.ok) assert.match(res.errors.join(' '), /unknown POI archetype 'no_such_place'/);
});

test('replaceGeography moves the roads, the anchors, and every query with them', () => {
  const before = geographySnapshot();
  try {
    const draft = geographySnapshot();
    // A brand-new road through the far east, far from every shipped route.
    draft.routes = [
      { id: 'east_reach', name: 'The East Reach', kind: 'road', pts: [{ x: 1000, y: 100 }, { x: 1200, y: 100 }] },
    ];
    draft.anchors = [{ x: 900, y: 100, safeR: 64 }];
    draft.sites = [{ id: 'east_rest', defId: 'waystation', x: 1100, y: 92 }];
    replaceGeography(draft);
    // The exported arrays kept their identity but hold the new truth.
    assert.equal(ROAD_ROUTES.length, 1);
    assert.equal(ROAD_ROUTES[0]!.id, 'east_reach');
    assert.equal(SETTLED_ANCHORS.length, 1);
    assert.equal(AUTHORED_WILD_SITES[0]!.id, 'east_rest');
    // The road queries answer from the new plan (derived bounds moved).
    assert.ok(roadDistanceAt(1337, 1100, 100) < 8, 'the East Reach exists');
    assert.equal(roadDistanceAt(1337, 34, 95), Infinity, 'the First Road is gone');
    assert.equal(nearRoads(0, 0, 200, 200), false);
    assert.ok(nearRoads(990, 90, 1010, 110));
  } finally {
    replaceGeography(before);
  }
  // The restoration is honest: shipped queries answer as ever.
  assert.ok(roadDistanceAt(1337, 34, 95) < 8);
  assert.equal(SETTLED_ANCHORS.length, AUTHORED_GEOGRAPHY.anchors.length);
});

test('the warnings counsel flags loose ends without blocking them', () => {
  const draft = geographySnapshot();
  draft.routes.push({
    id: 'nowhere_road',
    name: 'The Road to Nowhere',
    kind: 'road',
    pts: [{ x: 800, y: 300 }, { x: 900, y: 300 }],
  });
  const v = validateGeographyDef(draft);
  assert.ok(v.ok, 'a loose road is legal — the studio warns, never blocks');
  const warnings = geographyWarnings(draft).join(' | ');
  assert.match(warnings, /nowhere_road.*loose/);
});

// ------------------------------------------------------- the two ways
// THE SPARWAY'S BARGAIN, pinned. The whole point of the pair of roads
// to Pinewatch is that the short one costs more, and the danger field
// is where that has to be TRUE, not merely written on a sign. Distance
// alone would have made the shortcut the safe road (it stays nearer
// both towns the whole way), so the Blackpine dread and the Timber
// Road's havens carry the design between them. If someone moves a
// lamp or trims the wood, this is the test that notices.
test('the Sparway is shorter than the Timber Road and bands worse', () => {
  const routeOf = (id: string) => {
    const r = AUTHORED_GEOGRAPHY.routes.find((rt) => rt.id === id);
    assert.ok(r, `route ${id} must exist`);
    return r!;
  };
  const anchors: DangerAnchor[] = [
    ...AUTHORED_GEOGRAPHY.anchors.map((a) => ({ ...a })),
    // The havens the authored sites stand up at boot — the long road's
    // safety is these, so the measurement must include them.
    ...AUTHORED_GEOGRAPHY.sites.flatMap((s) => {
      const haven = POI_DEFS.get(s.defId)?.haven;
      return haven && s.x !== undefined && s.y !== undefined
        ? [{ x: s.x, y: s.y, safeR: haven.safeR, haven: true } as DangerAnchor]
        : [];
    }),
  ];
  const measure = (id: string): { len: number; mean: number } => {
    const pts = routeOf(id).pts;
    let len = 0;
    const tiers: number[] = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i]!;
      const b = pts[i + 1]!;
      const seg = Math.hypot(b.x - a.x, b.y - a.y);
      len += seg;
      for (let t = 0; t < 1; t += 4 / seg) {
        tiers.push(
          dangerAt(1337, Math.round(a.x + (b.x - a.x) * t), Math.round(a.y + (b.y - a.y) * t), anchors),
        );
      }
    }
    return { len, mean: tiers.reduce((s, v) => s + v, 0) / tiers.length };
  };
  const timber = measure('timber_road');
  const spar = measure('sparway');
  assert.ok(spar.len < timber.len * 0.7, `the Sparway must be the SHORT way (${spar.len} vs ${timber.len})`);
  assert.ok(
    spar.mean > timber.mean + 0.5,
    `the Sparway must be the BAD way (mean tier ${spar.mean.toFixed(2)} vs ${timber.mean.toFixed(2)})`,
  );
});

test('both towns stay tier 0 at their own hearths despite the Blackpine', () => {
  const anchors = AUTHORED_GEOGRAPHY.anchors.map((a) => ({ ...a }));
  assert.equal(dangerAt(1337, 352, 24, anchors), 0, 'Amberford');
  assert.equal(dangerAt(1337, 584, -136, anchors), 0, 'Pinewatch');
});

// ------------------------------------------------------------------
// HARTFELL — the onion law. The base band that far north-east is 5
// everywhere; the town is a warm ring in it, not a hole through it.
// The haven's relief must grade the walk-out (3-ish at the walls,
// 4-5 beyond) and the far fell must sit at the ceiling — that is the
// entire level-25-35 promise, so it is pinned.
// ------------------------------------------------------------------

test("Hartfell's relief grades the walk-out and the far fell stays at the ceiling", () => {
  const anchors = AUTHORED_GEOGRAPHY.anchors.map((a) => ({ ...a }));
  assert.equal(dangerAt(1337, 848, -392, anchors), 0, 'the Kettle is a hearth');
  assert.equal(dangerAt(1337, 838, -350, anchors), 0, 'the south gate stands inside the lamp');
  const walls = dangerAt(1337, 848, -318, anchors); // ~10 past the safe edge
  assert.ok(walls >= 2 && walls <= 4, `just past the walls should read 2-4, got ${walls}`);
  const fell = dangerAt(1337, 816, -500, anchors); // the Barrowfell approach
  assert.ok(fell >= 4, `the barrow country must stay deep, got ${fell}`);
  // The Hartway's middle league is honestly tier 5 country: the road
  // is calm to SPAWNS (worldgen's ROAD_CALM), never to the field.
  const midway = dangerAt(1337, 800, -240, anchors);
  assert.ok(midway >= 4, `the drove's long middle must stay earned, got ${midway}`);
});
