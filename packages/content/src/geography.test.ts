import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DANGER_OVER, dangerAt, type DangerAnchor } from '@arx/shared';
import { POI_DEFS } from './pois/defs.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  AMBERFORD_RECT,
  ASHLAMP_RECT,
  AUTHORED_GEOGRAPHY,
  AUTHORED_NUDGE_MAX,
  AUTHORED_WILD_SITES,
  AUTHORED_ZONE_PAD,
  DAWNMEAD_RECT,
  FENSIDE_RECT,
  PICKET_RECT,
  PLANNED_ZONE_RECTS,
  SETT_RECT,
  COURSE_A_RECT,
  COURSE_B_RECT,
  COURSE_C_RECT,
  MEADOW_RECT,
  type ZoneRect,
  ROAD_ROUTES,
  SILVERFALL_RECT,
  TURNOFF_RECT,
  WARDTHREAD_RECT,
  distToRect,
  fenAt,
  fieldApronAt,
  geographySnapshot,
  geographyWarnings,
  massifAt,
  scorchAt,
  nearRoads,
  spectrumAt,
  type SpectrumStroke,
  replaceGeography,
  roadBearingAt,
  roadDistanceAt,
  roadHitAt,
  routeBridgeDecks,
  ROAD_SPAN_MAX,
  TRAIL_SPAN_MAX,
  thornveilAt,
  validateGeographyDef,
  GEO_ONE_SCENE_PAIRS,
  GEO_PIN_SPACING,
  prepareStrokes,
} from './geography.js';
import { SETTLED_ANCHORS } from './danger.js';
import { buildDawnmead } from './maps/dawnmead.js';
import { buildAshlamp } from './maps/ashlamp.js';
import { buildFenside } from './maps/fenside.js';
import { buildPicket, buildTurnoff, buildWardthread } from './maps/wardthread.js';
import { buildCourseA, buildCourseB, buildCourseC, buildMeadow, buildSett } from './maps/sett.js';
import type { ZoneDef } from './maps/types.js';
import { POI_PREFABS } from './pois/prefabs.js';
import { WORLD_SEED, elevationAt } from './worldgen.js';

/** Every terrain fact in this file is a fact about THE SHIPPED SEED. */
const SEED = WORLD_SEED;

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
    // The Sparway forks off the Timber Road where the wains commit to
    // the south bow — and REJOINS it below the lakes: the shortcut is
    // the refusal to go around, and both its ends live on the road it
    // refuses. Fork start, fork end.
    if (route.id === 'sparway') {
      const timber = ROAD_ROUTES.find((r) => r.id === 'timber_road')!;
      const onTimberA = timber.pts.some((p) => p.x === a.x && p.y === a.y);
      const onTimberB = timber.pts.some((p) => p.x === b.x && p.y === b.y);
      assert.ok(onTimberA, `${route.name} must start on a Timber Road waypoint (the fork)`);
      assert.ok(onTimberB, `${route.name} must end on a Timber Road waypoint (the rejoin)`);
      continue;
    }
    // The Evenway forks off the Hoargate Road at the bend where the
    // wains turn north for the climb — north to the cold gate, west
    // to the wood. The fork IS the start; the end is Evenfall's gate.
    if (route.id === 'evenway') {
      const hoargate = ROAD_ROUTES.find((r) => r.id === 'hoargate_road')!;
      const onHoargate = hoargate.pts.some((p) => p.x === a.x && p.y === a.y);
      assert.ok(onHoargate, `${route.name} must start on a Hoargate Road waypoint (the fork)`);
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
  assert.equal(scorchAt(2000, 2000), 0);
  assert.equal(fieldApronAt(2000, 2000, 64), 0);
  assert.equal(roadDistanceAt(SEED, 2000, 2000), Infinity);
  assert.equal(nearRoads(1900, 1900, 2100, 2100), false);
});

test('road queries agree with themselves (deterministic, kind-aware)', () => {
  const a = roadHitAt(SEED, 84, 104);
  const b = roadHitAt(SEED, 84, 104);
  assert.deepEqual(a, b);
  assert.ok(a !== null && a.dist < 8, 'the First Road runs the fen waist near (84,104)');
  assert.equal(a!.trail, false);
  const t = roadHitAt(SEED, -106, -74);
  assert.ok(t !== null && t.trail, "the Hunter's Trail near (-106,-74) reads as a trail");
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
//
// THE CONTESTED LANDS — BREATHING ROOM (docs/contested-lands-plan.md
// §13.1, §13.2, band 0). ONE SITE PER CELL, the ring as re-celled:
//   tier-1 cores (2 of 6): veil_den [-2,-1], felling_drum [0,-1];
//   tier-2 cores (9 of 14): first_road_toll [0,0] (BREDE'S BAR: the
//     cell's centre rolls tier 2 as dangerAt lays it, band 7 R10,
//     and the reaver row is minTier 1 so Brede stands whatever the
//     jitter says), fork_rest [-2,-2], husk_of_the_line [-1,-2],
//     third_stone [-2,1], broken_barrow [-2,0], plus the shipped
//     longmeadow_rest [0,-2], amberfen_shoal [1,1], returners_camp
//     [-3,1];
//   tier-3: fenside_crofts [1,0] (the crofts AND the lamp: one scene
//     with the bar; the cell's centre rolls tier 3, R10),
//     hobgoblin_legion [-1,-3].
// EMPTY ON PURPOSE — a listed asset, not a gap; never author a core
// here for the life of the epic: [-3,-1], [-3,0] (emptied when the
// barrow came east: its centre read tier 4 under the Spinewall's
// word), [1,-1], [-1,2], [-2,2] beyond the belt, the far north
// beyond the Legion, the First Road
// past the crofts for ~290 tiles to the tollhouse, and the Old Road
// from the Third Stone to returners_camp. [1,2] is RESERVED for the
// Sett (an authored zone, band 9), not for a site. The Ashlamp scar
// (72,64) is NOT a site: it shares [0,0] with the bar and the ledger
// is one row per cell (see the parked line in geography.ts).
// ------------------------------------------------------------------

/**
 * THE CONTESTED LANDS (plan §13.2): pinned sites that stand OFF every
 * way on purpose — the husk is 24 tiles past the trail's end and out
 * of its eyeline, the Legion is "off every way", the barrow stands on
 * open wold west of the Old Road, the Felling is the Drum's stand on
 * the ridge north-east of the gate (the cell pin found no ground
 * there, so it is an x/y pin now), and the Third Stone stands up a
 * track 39 tiles off the Old Road until band 10 lays its spur trail.
 * A milepost must hug its road; a camp the road never reaches must
 * not.
 */
const OFF_ROAD_PINS = new Set(['husk_of_the_line', 'hobgoblin_legion', 'broken_barrow', 'felling_drum', 'third_stone']);

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
    const d = roadDistanceAt(SEED, s.x, s.y);
    assert.ok(d > 4.5, `${s.id} anchor sits inside the road shoulder (${d.toFixed(1)})`);
    if (OFF_ROAD_PINS.has(s.id)) {
      assert.ok(d > 40, `${s.id} is declared off-road but stands ${d.toFixed(1)} from a carve`);
      continue;
    }
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
  const before = roadDistanceAt(SEED, 56, 64);
  const after = roadDistanceAt(SEED, Math.round(56 + b!.x * step), Math.round(64 + b!.y * step));
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
  // THE CONTESTED LANDS: the counsel still says an off-road pin may
  // never be found — true, and the Studio should keep saying it — but
  // the husk, the Legion and the barrow are OFF the ways by design
  // (plan §13.2), so exactly those five "far from any road" lines are
  // expected and nothing else is.
  const warnings = geographyWarnings(AUTHORED_GEOGRAPHY, SEED, (x, y) => elevationAt(SEED, x, y));
  const declared = warnings.filter((w) =>
    [...OFF_ROAD_PINS].some((id) => w.startsWith(`site '${id}' stands`) && w.includes('from any road')),
  );
  assert.equal(declared.length, OFF_ROAD_PINS.size, `every declared off-road pin is far from a road:\n${warnings.join('\n')}`);
  assert.deepEqual(warnings.filter((w) => !declared.includes(w)), []);
});

// ------------------------------------------------------------------
// THE SHORT SPAN LAW — a road bridges necks, not lakes. Every deck
// the carve would lay is measured against the real terrain and the
// worst one is named, so a re-drawn waypoint that wades into a mere
// fails with an address instead of a shrug.
// ------------------------------------------------------------------

test('every route crosses water only at short necks (the span law, route by route)', () => {
  const decks = routeBridgeDecks(AUTHORED_GEOGRAPHY, SEED, (x, y) => elevationAt(SEED, x, y));
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

test('THE AUTHORED HUG is a site row\'s own word: true or absent, pinned only; it survives the rebuild', () => {
  const snap = geographySnapshot();
  snap.sites = [{ id: 'the_toll', defId: 'bandit_camp', x: 500, y: 500, hug: true }];
  const ok = validateGeographyDef(snap, { poiDefIds: new Set(POI_DEFS.keys()) });
  assert.ok(ok.ok, ok.ok ? '' : ok.errors.join('; '));
  if (ok.ok) assert.equal(ok.def.sites[0]!.hug, true, 'the word survives the rebuild');
  // Absent is the pad, and the rebuilt row carries no key for it.
  snap.sites = [{ id: 'the_toll', defId: 'bandit_camp', x: 500, y: 500 }];
  const plain = validateGeographyDef(snap);
  assert.ok(plain.ok);
  if (plain.ok) assert.ok(!('hug' in plain.def.sites[0]!), 'an unworded pin carries no hug key');
  // false, a string, and a cell-forced site all refuse.
  for (const bad of [false, 'yes', 1]) {
    snap.sites = [{ id: 'the_toll', defId: 'bandit_camp', x: 500, y: 500, hug: bad as unknown as true }];
    const res = validateGeographyDef(snap);
    assert.ok(!res.ok, `hug ${JSON.stringify(bad)} passed`);
    if (!res.ok) assert.match(res.errors.join(' '), /hug must be true or absent/);
  }
  snap.sites = [{ id: 'den', defId: 'wolfkin_den', cell: [40, 40], hug: true }];
  const celled = validateGeographyDef(snap);
  assert.ok(!celled.ok, 'a cell-forced site has no pin to hug from');
  if (!celled.ok) assert.match(celled.errors.join(' '), /pinned site's word/);
});

test('the validator refuses a site wearing an unknown archetype when refs are given', () => {
  const snap = geographySnapshot();
  snap.sites = [{ id: 'lost', defId: 'no_such_place', x: 500, y: 500 }];
  const res = validateGeographyDef(snap, { poiDefIds: new Set(['waystation']) });
  assert.ok(!res.ok);
  if (!res.ok) assert.match(res.errors.join(' '), /unknown POI archetype 'no_such_place'/);
});

test('THE PINNED SKETCH: a site may pin one of its archetype prefabs; the validator refuses any other', () => {
  const snap = geographySnapshot();
  snap.sites = [{ id: 'the_toll', defId: 'bandit_camp', x: 500, y: 500, prefabId: 'poi_bandit_toll' }];
  const ok = validateGeographyDef(snap, { poiDefIds: new Set(POI_DEFS.keys()) });
  assert.ok(ok.ok, ok.ok ? '' : ok.errors.join('; '));
  if (ok.ok) assert.equal(ok.def.sites[0]!.prefabId, 'poi_bandit_toll', 'the pin survives the rebuild');
  // A cell-forced site pins the same way.
  snap.sites = [{ id: 'den', defId: 'wolfkin_den', cell: [40, 40], prefabId: POI_DEFS.get('wolfkin_den')!.prefabs[0] }];
  const celled = validateGeographyDef(snap);
  assert.ok(celled.ok);
  if (celled.ok) assert.equal(celled.def.sites[0]!.prefabId, POI_DEFS.get('wolfkin_den')!.prefabs[0]);
  // Another archetype's prefab, an unknown prefab, and a non-string all refuse.
  for (const bad of ['poi_last_lamp', 'poi_no_such_sketch', 7, '']) {
    snap.sites = [{ id: 'the_toll', defId: 'bandit_camp', x: 500, y: 500, prefabId: bad as string }];
    const res = validateGeographyDef(snap);
    assert.ok(!res.ok, `pin ${JSON.stringify(bad)} passed`);
    if (!res.ok) assert.match(res.errors.join(' '), /prefabId|pins prefab/);
  }
  // An unpinned site rebuilds without the key at all (the closed shape).
  snap.sites = [{ id: 'the_toll', defId: 'bandit_camp', x: 500, y: 500 }];
  const bare = validateGeographyDef(snap);
  assert.ok(bare.ok);
  if (bare.ok) assert.ok(!('prefabId' in bare.def.sites[0]!));
  // The First Road toll IS Brede's bar (band 7, R4): the site id is
  // kept so the ledger's poi:0,0 row re-seeds in place, and the plan
  // pins the bar's own sketch (the toll's honest smaller variant).
  const toll = AUTHORED_GEOGRAPHY.sites.find((s) => s.id === 'first_road_toll');
  assert.equal(toll?.prefabId, 'poi_first_road_bar');
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
    assert.ok(roadDistanceAt(SEED, 1100, 100) < 8, 'the East Reach exists');
    assert.equal(roadDistanceAt(SEED, 84, 104), Infinity, 'the First Road is gone');
    assert.equal(nearRoads(0, 0, 200, 200), false);
    assert.ok(nearRoads(990, 90, 1010, 110));
  } finally {
    replaceGeography(before);
  }
  // The restoration is honest: shipped queries answer as ever.
  assert.ok(roadDistanceAt(SEED, 84, 104) < 8);
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
          dangerAt(SEED, Math.round(a.x + (b.x - a.x) * t), Math.round(a.y + (b.y - a.y) * t), anchors),
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
  assert.equal(dangerAt(SEED, 520, -4, anchors), 0, 'Amberford');
  assert.equal(dangerAt(SEED, 1160, -356, anchors), 0, 'Pinewatch');
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
  assert.equal(dangerAt(SEED, 1304, -616, anchors), 0, 'the Kettle is a hearth');
  assert.equal(dangerAt(SEED, 1294, -572, anchors), 0, 'the south gate stands inside the lamp');
  const walls = dangerAt(SEED, 1304, -542, anchors); // ~10 past the safe edge
  assert.ok(walls >= 2 && walls <= 4, `just past the walls should read 2-4, got ${walls}`);
  const fell = dangerAt(SEED, 1260, -720, anchors); // the Barrowfell approach
  assert.ok(fell >= 4, `the barrow country must stay deep, got ${fell}`);
  // The Hartway's middle league is honestly tier 5 country: the road
  // is calm to SPAWNS (worldgen's ROAD_CALM), never to the field.
  const midway = dangerAt(SEED, 1240, -450, anchors);
  assert.ok(midway >= 4, `the drove's long middle must stay earned, got ${midway}`);
});

// ------------------------------------------------------------------
// KINGSDELF — the Overband onion. The town is the fifth haven in
// tier-5 country by plain distance; the Brand's dread-3 heart is the
// first ground in the game that reads tier 6 (the lampless dark),
// and the rim keeps the classic law. That is the entire level-50-60
// promise, so it is pinned.
// ------------------------------------------------------------------

test("Kingsdelf's bowl is calm, and the Brand's heart is the hottest shipped ground", () => {
  const anchors = AUTHORED_GEOGRAPHY.anchors.map((a) => ({ ...a }));
  assert.equal(dangerAt(SEED, -480, 328, anchors), 0, 'the delf floor is a hearth');
  assert.equal(dangerAt(SEED, -454, 310, anchors), 0, 'the benches stand inside the lamp');
  // The Brand's full heart under THE LADDER PAST THE LAMPS: the burn
  // adds its whole dread to the worded march (the delf's word 6 heats
  // this country), so the heart reads 6 at its softest jittered dip
  // and burns to 8-9 across the core — the hottest standing ground in
  // the shipped world. The Overband proper (tier 10) stays CLOSED by
  // law: the Brand stands in mid-march country, and neither noise nor
  // dread can fake remoteness.
  let deep = 0;
  for (let i = 0; i < 200; i++) {
    const ang = (i / 200) * Math.PI * 2;
    const tier = dangerAt(
      SEED,
      Math.round(-544 + Math.cos(ang) * 60),
      Math.round(144 + Math.sin(ang) * 60),
      anchors,
    );
    assert.ok(tier >= 6 && tier < DANGER_OVER, `burn heart read ${tier}`);
    if (tier >= 8) deep++;
  }
  assert.ok(deep > 40, `the burn barely burns: ${deep}/200 at 8+`);
  // The dread reach clears the town's north wall: beside the furnace,
  // never in it.
  const northWall = dangerAt(SEED, -480, 280, anchors);
  assert.ok(northWall <= 5, `the north wall must stay clear of the burn, got ${northWall}`);
  // The Old Road's last league grades in under the haven's relief —
  // an artery, not a gauntlet. The delf's word is 6 now, so the
  // relieved league reads 3-5: a level-50 town's doorstep, not a
  // meadow.
  const lastLeague = dangerAt(SEED, -398, 302, anchors);
  assert.ok(lastLeague >= 3 && lastLeague <= 5, `the last league should read 3-5, got ${lastLeague}`);
});

// ------------------------------------------------------------------
// THE CONTESTED LANDS — the re-celled ring (plan §13.2, band 0).
// ------------------------------------------------------------------

test('THE RE-CELLED MAP: every §13.2 site stands in its table cell on its def', () => {
  const byId = new Map(AUTHORED_WILD_SITES.map((s) => [s.id, s]));
  const cellOf = (s: { x?: number; y?: number; cell?: readonly [number, number] }): string =>
    s.cell ? `${s.cell[0]},${s.cell[1]}` : `${Math.floor(s.x! / 128)},${Math.floor(s.y! / 128)}`;
  const TABLE: Array<[string, string, string]> = [
    // site id, def id, cell
    ['first_road_toll', 'first_road_bar', '0,0'],
    ['fenside_crofts', 'fenside_lamp', '1,0'],
    ['fork_rest', 'fork_waystation', '-2,-2'],
    ['husk_of_the_line', 'husk_of_the_line', '-1,-2'],
    ['felling_drum', 'felling_drum', '0,-1'],
    ['hobgoblin_legion', 'hobgoblin_legion', '-1,-3'],
    // Band 8 (blockout 0.2 I): the den's row keeps its cell and takes
    // the weight-0 variant with Hollowhowl crowned (L3's def).
    ['veil_den', 'veil_den', '-2,-1'],
    ['third_stone', 'third_stone_rest', '-2,1'],
    ['broken_barrow', 'broken_barrow', '-2,0'],
    ['longmeadow_rest', 'waystation', '0,-2'],
    ['amberfen_shoal', 'skral_village', '1,1'],
    ['returners_camp', 'roadside_hamlet', '-3,1'],
  ];
  for (const [id, defId, cell] of TABLE) {
    const s = byId.get(id);
    assert.ok(s, `${id} missing from the plan`);
    assert.equal(s!.defId, defId, `${id} stands on the wrong def`);
    assert.equal(cellOf(s!), cell, `${id} stands in the wrong cell`);
    const def = POI_DEFS.get(defId);
    assert.ok(def, `${id}: def '${defId}' not in the registry`);
  }
  // Every contested def is weight 0 — placed by hand, never rolled.
  for (const defId of ['fenside_lamp', 'first_road_bar', 'fork_waystation', 'third_stone_rest',
    'husk_of_the_line', 'felling_drum', 'legion_pressed', 'hobgoblin_legion', 'broken_barrow', 'veil_den']) {
    assert.equal(POI_DEFS.get(defId)!.weight, 0, `${defId} must be weight 0`);
  }
  // The pressed camp is dealt, never placed: no site row names it.
  assert.ok(!AUTHORED_WILD_SITES.some((s) => s.defId === 'legion_pressed'));
  // EMPTY ON PURPOSE — and RESERVED: nothing authored stands here.
  const taken = new Set(AUTHORED_WILD_SITES.map(cellOf));
  for (const cell of ['-3,-1', '-3,0', '1,-1', '-1,2', '-2,2', '1,2']) {
    assert.ok(!taken.has(cell), `cell ${cell} is empty on purpose (plan §13.2) — something stands in it`);
  }
});

test('THE BREATHING ROOM LAW: pinned sites keep 70 tiles unless declared one scene', () => {
  // The shipped plan passes with exactly its declared pairs.
  const shipped = validateGeographyDef(AUTHORED_GEOGRAPHY, { poiDefIds: new Set(POI_DEFS.keys()) });
  assert.ok(shipped.ok, shipped.ok ? '' : shipped.errors.join('\n'));
  assert.ok(GEO_PIN_SPACING === 70);
  assert.ok(GEO_ONE_SCENE_PAIRS.some(([a, b]) => a === 'first_road_toll' && b === 'fenside_crofts'));
  // Two undeclared pins one screen apart are refused, and the error
  // names both.
  const draft = geographySnapshot();
  draft.sites.push({ id: 'crowd_a', defId: 'waystation', x: 3000, y: 3000 });
  draft.sites.push({ id: 'crowd_b', defId: 'waystation', x: 3040, y: 3030 });
  const v = validateGeographyDef(draft);
  assert.ok(!v.ok);
  if (!v.ok) {
    assert.ok(v.errors.some((e) => e.includes("'crowd_a'") && e.includes("'crowd_b'") && e.includes('50 tiles')), v.errors.join('\n'));
  }
  // Cell-forced sites are spaced by the cell law alone.
  const cells = geographySnapshot();
  cells.sites.push({ id: 'forced_a', defId: 'waystation', cell: [40, 40] });
  cells.sites.push({ id: 'pin_b', defId: 'waystation', x: 40 * 128 + 5, y: 40 * 128 + 5 });
  const c = validateGeographyDef(cells);
  assert.ok(!c.ok, 'a pin inside a forced cell shares its cell');
  if (!c.ok) assert.ok(c.errors.every((e) => !e.includes('tiles apart')), 'the cell law spoke, not the spacing law');
  // Exactly 70 apart is legal.
  const edge = geographySnapshot();
  edge.sites.push({ id: 'edge_a', defId: 'waystation', x: 3000, y: 3000 });
  edge.sites.push({ id: 'edge_b', defId: 'waystation', x: 3070, y: 3000 });
  // (3000,3000) and (3070,3000) sit in different cells (23 vs 23 — same
  // cell!): shift the second across the border so only spacing speaks.
  edge.sites[edge.sites.length - 1] = { id: 'edge_b', defId: 'waystation', x: 3072, y: 3000 };
  const e = validateGeographyDef(edge);
  assert.ok(e.ok, e.ok ? '' : e.errors.join('\n'));
});

// ------------------------------------------------------------------
// THE LIVING GROUND (docs/contested-lands-plan.md §12.2, LG-0): the
// spectrum is one optional key of the geography doc, vetted by its own
// module under this file's id law and the tutorial's rect.

const WOLD_GLOOM: SpectrumStroke = {
  id: 'wold_gloom',
  axis: 'blight',
  shape: { kind: 'circle', x: 1200, y: 1200, r: 40 },
  amp: 1,
  soft: 0.5,
  grain: 0.7,
  mode: 'max',
};

test('THE LIVING GROUND: the doc admits `spectrum`, round-trips without the word when absent, refuses the rest', () => {
  const snap = geographySnapshot();
  assert.ok('spectrum' in snap, 'the snapshot always writes the key — the welcome geo says the server folds');
  // THE AUTHORED STROKES: the Ashlamp burn (band 7, owed E2), then
  // band 8's two (owed F6): the blight under the ward line and the
  // Felling's burn, pinned in this file's band 8 cases below. Nothing
  // else is painted.
  assert.deepEqual(snap.spectrum!.map((s) => s.id), ['ashlamp_burn', 'wardthread_blight', 'felling_burn']);
  // A doc saved before the field validates and comes back WITHOUT the key.
  const { spectrum: _absent, ...bare } = snap;
  const old = validateGeographyDef(bare);
  assert.ok(old.ok, old.ok ? '' : old.errors.join('\n'));
  if (old.ok) assert.equal('spectrum' in old.def, false);
  // A stroke rides through whole.
  const withStroke = validateGeographyDef({ ...snap, spectrum: [WOLD_GLOOM] });
  assert.ok(withStroke.ok, withStroke.ok ? '' : withStroke.errors.join('\n'));
  if (withStroke.ok) assert.deepEqual(withStroke.def.spectrum, [WOLD_GLOOM]);
  // The closed shape still holds around it.
  const stray = validateGeographyDef({ ...snap, spectra: [] } as unknown as GeographyDefLike);
  assert.ok(!stray.ok && stray.errors.some((e) => e.includes("unknown field 'spectra'")));
  // A broken stroke is refused under THIS file's id law, by subject.
  const badId = validateGeographyDef({ ...snap, spectrum: [{ ...WOLD_GLOOM, id: 'Wold Gloom' }] });
  assert.ok(!badId.ok && badId.errors.some((e) => e.startsWith('spectrum[0].id must match')));
  const badAmp = validateGeographyDef({ ...snap, spectrum: [{ ...WOLD_GLOOM, amp: -0.4 }] });
  assert.ok(!badAmp.ok && badAmp.errors.some((e) => e.includes("spectrum 'wold_gloom'.amp") && e.includes('only season carries a sign')));
  const notList = validateGeographyDef({ ...snap, spectrum: {} } as unknown as GeographyDefLike);
  assert.ok(!notList.ok && notList.errors.includes('spectrum must be an array'));
});
type GeographyDefLike = Parameters<typeof validateGeographyDef>[0];

test('THE LIVING GROUND: replaceGeography swaps the field with the plan, and an absent key zeroes it', () => {
  const snap = geographySnapshot();
  try {
    assert.equal(spectrumAt('blight', 1200.5, 1200.5), 0);
    replaceGeography({ ...snap, spectrum: [WOLD_GLOOM] });
    assert.equal(spectrumAt('blight', 1200.5, 1200.5), 1);
    assert.equal(spectrumAt('burn', 1200.5, 1200.5), 0);
    // The snapshot carries the live strokes and never aliases them.
    const live = geographySnapshot();
    assert.deepEqual(live.spectrum, [WOLD_GLOOM]);
    live.spectrum![0]!.amp = 0;
    assert.equal(spectrumAt('blight', 1200.5, 1200.5), 1);
    // An older doc (no key) is a plan with no strokes.
    const { spectrum: _none, ...bare } = snap;
    replaceGeography(bare as typeof snap);
    assert.equal(spectrumAt('blight', 1200.5, 1200.5), 0);
  } finally {
    replaceGeography(snap);
  }
  assert.equal(spectrumAt('blight', 1200.5, 1200.5), 0);
});

test('THE TUTORIAL IS SACRED: the geography validator refuses a stroke over Dawnmead by name', () => {
  const snap = geographySnapshot();
  const inside = validateGeographyDef({
    ...snap,
    spectrum: [{ ...WOLD_GLOOM, shape: { kind: 'circle', x: DAWNMEAD_RECT.x + 40, y: DAWNMEAD_RECT.y + 40, r: 20 } }],
  });
  assert.ok(!inside.ok);
  if (!inside.ok) {
    assert.equal(inside.errors.length, 1);
    assert.match(inside.errors[0]!, /spectrum 'wold_gloom' overlaps the Dawnmead rect/);
    assert.match(inside.errors[0]!, /THE TUTORIAL IS SACRED/);
  }
  // Parked at amp 0 it stands (a draft, a zone gain).
  const parked = validateGeographyDef({
    ...snap,
    spectrum: [{ ...WOLD_GLOOM, amp: 0, shape: { kind: 'circle', x: DAWNMEAD_RECT.x + 40, y: DAWNMEAD_RECT.y + 40, r: 20 } }],
  });
  assert.ok(parked.ok, parked.ok ? '' : parked.errors.join('\n'));
  // The ragged hem is measured: a heart 50 east of the rect with r 40
  // grain 1 reaches 54 tiles back and is refused; grain 0 clears it.
  const east = DAWNMEAD_RECT.x + DAWNMEAD_RECT.w;
  const hem = validateGeographyDef({
    ...snap,
    spectrum: [{ ...WOLD_GLOOM, grain: 1, shape: { kind: 'circle', x: east + 50, y: 40, r: 40 } }],
  });
  assert.ok(!hem.ok && hem.errors[0]!.includes('Dawnmead'));
  const flat = validateGeographyDef({
    ...snap,
    spectrum: [{ ...WOLD_GLOOM, grain: 0, shape: { kind: 'circle', x: east + 50, y: 40, r: 40 } }],
  });
  assert.ok(flat.ok, flat.ok ? '' : flat.errors.join('\n'));
});

test('THE SHIPPED PLAN folds nothing over the tutorial: every axis is 0 across the Dawnmead rect', () => {
  const shipped = validateGeographyDef(AUTHORED_GEOGRAPHY, { poiDefIds: new Set(POI_DEFS.keys()) });
  assert.ok(shipped.ok, shipped.ok ? '' : shipped.errors.join('\n'));
  const snap = geographySnapshot();
  try {
    replaceGeography(AUTHORED_GEOGRAPHY);
    const r = DAWNMEAD_RECT;
    for (let y = r.y; y < r.y + r.h; y += 16) {
      for (let x = r.x; x < r.x + r.w; x += 16) {
        for (const axis of ['season', 'blight', 'burn', 'wear'] as const) {
          assert.equal(spectrumAt(axis, x + 0.5, y + 0.5), 0, `${axis} at ${x},${y}`);
        }
      }
    }
  } finally {
    replaceGeography(snap);
  }
});

// ------------------------------------------------------------------
// THE CONTESTED LANDS, band 7 — THE FEN LAMP AND THE BAR (L1 FRAME).
// Every number below is the brief's, measured at the shipped seed.
// ------------------------------------------------------------------

test('THE PAD LAW mirrors the server: AUTHORED_ZONE_PAD and the nudge agree with pois.ts', () => {
  // Content cannot import the server, so the mirror is pinned to the
  // server's source text: the two constants a content lint (padClear)
  // and this file hold the rects to.
  const src = readFileSync(
    fileURLToPath(new URL('../../server/src/world/pois.ts', import.meta.url)),
    'utf8',
  );
  const pad = /export const AUTHORED_ZONE_PAD = (\d+);/.exec(src);
  const nudge = /maxNudge = (\d+),/.exec(src);
  assert.ok(pad && nudge, 'the server names both numbers');
  assert.equal(Number(pad![1]), AUTHORED_ZONE_PAD, 'AUTHORED_ZONE_PAD drifted from the server');
  assert.equal(Number(nudge![1]), AUTHORED_NUDGE_MAX, 'the nudge drifted from findAuthoredAnchor');
});

test('THE TWO PATCHES: the Ashlamp and the fen waist are planned rects that build to their own pins', () => {
  const planned = new Map(PLANNED_ZONE_RECTS.map((p) => [p.id, p]));
  const ash = buildAshlamp();
  const fen = buildFenside();
  for (const [z, rect, name] of [
    [ash, ASHLAMP_RECT, 'The Ashlamp'],
    [fen, FENSIDE_RECT, 'The Fen Waist'],
  ] as const) {
    const row = planned.get(z.id);
    assert.ok(row, `${z.id} has a planned row`);
    assert.equal(row!.name, name);
    assert.ok(!row!.apron, `${z.id} is a patch on worldgen: no apron`);
    assert.deepEqual({ x: z.origin.x, y: z.origin.y, w: z.width, h: z.height }, rect, `${z.id}: the built rect is the plan's`);
    assert.equal(z.growth, 'wild', `${z.id} grows wild (G-3)`);
    assert.equal(z.spawn, undefined, `${z.id} declares no spawn`);
  }
  // R1: the Ashlamp's west edge never under x 40 and never touching
  // the tutorial's rect (Dawnmead ends at x 31); the fen waist's rect
  // is measured to the crofts' footprint (below), never past x 152.
  assert.ok(ASHLAMP_RECT.x >= 40 && ASHLAMP_RECT.x > DAWNMEAD_RECT.x + DAWNMEAD_RECT.w);
  assert.ok(FENSIDE_RECT.x + FENSIDE_RECT.w - 1 <= 152);
  // THE LONG DRY (x 70..124) lies between them and carries nothing:
  // neither rect reaches into it.
  assert.ok(ASHLAMP_RECT.x + ASHLAMP_RECT.w - 1 <= 70, 'the Ashlamp ends where the long dry begins');
  // Fix pass 1 widened the fen waist west to x 118 so the tier-2
  // cairn stands alone before the bar; the long dry is x 70..118.
  assert.ok(FENSIDE_RECT.x >= 118, 'the fen waist begins where the long dry ends');
});

// ------------------------------------------------------------------
// THE CONTESTED LANDS, band 8 — THE HUSK AND THE WARD LINE (L1 FRAME).
// Every number below is the brief's, measured at the shipped seed
// (maps/wardthread/pins.ts carries the tape).
// ------------------------------------------------------------------

test('THE THREE NORTH PATCHES: the ward line, the picket and the turn are planned rects that build to their own pins', () => {
  const planned = new Map(PLANNED_ZONE_RECTS.map((p) => [p.id, p]));
  for (const [z, rect, name] of [
    [buildWardthread(), WARDTHREAD_RECT, 'The Ward Line'],
    [buildPicket(), PICKET_RECT, 'The Picket'],
    [buildTurnoff(), TURNOFF_RECT, 'The Turn'],
  ] as const) {
    const row = planned.get(z.id);
    assert.ok(row, `${z.id} has a planned row`);
    assert.equal(row!.name, name);
    assert.ok(!row!.apron, `${z.id} is a patch on worldgen: no apron`);
    assert.deepEqual({ x: z.origin.x, y: z.origin.y, w: z.width, h: z.height }, rect, `${z.id}: the built rect is the plan's`);
    assert.equal(z.growth, 'wild', `${z.id} grows wild (G-3)`);
    assert.equal(z.spawn, undefined, `${z.id} declares no spawn`);
    assert.equal(z.chests, undefined, `${z.id} keeps no chest`);
  }
  // The rects as the tape measured them (pins.ts says why each grew):
  // the ward line to the road's shoulder and the tarn's rim, the
  // picket two rows south, the turn as drawn.
  assert.deepEqual(WARDTHREAD_RECT, { x: -164, y: -203, w: 37, h: 25 });
  assert.deepEqual(PICKET_RECT, { x: -131, y: -140, w: 24, h: 26 });
  assert.deepEqual(TURNOFF_RECT, { x: -80, y: -182, w: 14, h: 16 });
  // All three stand north of the tutorial's rect (y ends at 159; the
  // picket's bottom row is y -115, 51 rows north of its top at -64).
  for (const r of [WARDTHREAD_RECT, PICKET_RECT, TURNOFF_RECT]) {
    assert.ok(r.y + r.h - 1 < DAWNMEAD_RECT.y, `${r.x},${r.y} stands north of Dawnmead`);
  }
  // No north pin carries `hug` (blockout 0.2 B: a hug on a pin under
  // the pad can move its anchor on every fresh boot).
  for (const id of ['fork_rest', 'husk_of_the_line', 'felling_drum', 'hobgoblin_legion', 'veil_den', 'last_lamp']) {
    const s = AUTHORED_WILD_SITES.find((x) => x.id === id)!;
    assert.ok(!('hug' in s), `${id} says hug`);
  }
  // The den's row keeps its cell and gains its prefab (0.2 I).
  const den = AUTHORED_WILD_SITES.find((x) => x.id === 'veil_den')!;
  assert.deepEqual([den.cell, den.prefabId], [[-2, -1], 'poi_veil_den']);
});

test('THE LIVING GROUND, band 8: the blight under the ward line and the Felling\'s burn validate and keep clear of Dawnmead', () => {
  const shipped = validateGeographyDef(AUTHORED_GEOGRAPHY, { poiDefIds: new Set(POI_DEFS.keys()) });
  assert.ok(shipped.ok, shipped.ok ? '' : shipped.errors.join('\n'));
  const strokes = AUTHORED_GEOGRAPHY.spectrum!;
  const blight = strokes.find((s) => s.id === 'wardthread_blight')!;
  const burn = strokes.find((s) => s.id === 'felling_burn')!;
  assert.deepEqual(blight, {
    id: 'wardthread_blight',
    axis: 'blight',
    shape: { kind: 'capsule', x0: -146, y0: -188, x1: -140, y1: -196, r: 7 },
    amp: 0.7,
    soft: 0.5,
    grain: 0.35,
    mode: 'max',
  });
  assert.deepEqual(burn, {
    id: 'felling_burn',
    axis: 'burn',
    shape: { kind: 'circle', x: 80, y: -42, r: 18 },
    amp: 0.8,
    soft: 0.6,
    grain: 0.3,
    mode: 'max',
  });
  // Skin only: neither carries `bones`, so worldgen is byte-identical.
  assert.ok(!('bones' in blight) && !('bones' in burn));
  // The reach boxes (fully ragged): the blight's over the stand north
  // of the road, inside the ward line's rect and past its own hem,
  // more than 115 tiles north of Dawnmead's rect; the burn's east of
  // the gate, more than 25 tiles east of it.
  const [pb, pu] = prepareStrokes([blight, burn]);
  assert.ok(pb && pu);
  assert.ok(pb!.x0 > -155 && pb!.x1 < -131 && pb!.y0 > -205 && pb!.y1 < -179, `blight reach x ${pb!.x0}..${pb!.x1} y ${pb!.y0}..${pb!.y1}`);
  assert.ok(pb!.y1 < DAWNMEAD_RECT.y - 115, 'the blight ends more than 115 tiles north of the tutorial');
  assert.ok(pu!.x0 > 59 && pu!.x1 < 101 && pu!.y0 > -63 && pu!.y1 < -21, `burn reach x ${pu!.x0}..${pu!.x1} y ${pu!.y0}..${pu!.y1}`);
  assert.ok(pu!.x0 > DAWNMEAD_RECT.x + DAWNMEAD_RECT.w + 25, 'the burn begins more than 25 tiles east of the tutorial');
  // The blight's reach crosses the chunk border at y -192, where the
  // fringe-seam probe reads it; the burn's crosses x 64, x 96 and
  // y -32. The y -64 border lies two tiles past its ragged reach
  // (18 × (1 + 0.35 × 0.3) = 19.9 from y -42 ends at -61.9), so the
  // probe reads three of the Felling's four seams and the fourth is
  // the field's own.
  assert.ok(pb!.y0 < -192 && pb!.y1 > -192);
  for (const [lo, hi, edge] of [[pu!.x0, pu!.x1, 64], [pu!.x0, pu!.x1, 96], [pu!.y0, pu!.y1, -32]] as const) {
    assert.ok(lo < edge && hi > edge, `the burn crosses the seam at ${edge}`);
  }
  assert.ok(pu!.y0 > -64 && pu!.y0 < -61, 'the y -64 seam lies just past the burn\'s ragged reach');
  // The blight's own hem never touches the road's bed at the fork:
  // the reach box's bottom stands north of the bed's centre at x -143
  // (y -176.5) by more than the bed's half.
  assert.ok(pb!.y1 < -176.5 - 1.6);
});

test('G-12 THE PAD LAW with THE AUTHORED HUG opt-in: every pinned footprint keeps the pad from both patches unless its row says hug', () => {
  // The footprint the server scans is the pinned prefab (or the def's
  // first) as the shelf expanded it; the predicate mirrors pois.ts
  // intersectsZones (strict on both edges) at the pad findAuthoredAnchor
  // asks of the pin itself: PAD 0 for a pin whose site row says `hug`
  // (THE AUTHORED HUG, opt-in per site since fix pass 2: it may stand
  // edge to edge with a patch), AUTHORED_ZONE_PAD for every other pin
  // (the scan's first probe keeps it; a pin the scan has to walk keeps
  // it too, and the server test proves both east pins stand unnudged).
  // MEASURED: the bar's 22x14 at (126,109) is x 115..136, y 102..115,
  // ONE row south of the fen waist (y ends 100) so the zone's felled
  // shoulder meets the crew's own clearing, on the bar's word alone;
  // the crofts' 24x16 core at (160,94) is x 148..171, y 86..101,
  // exactly the pad east of the rect (x ends 141). A crofts prefab
  // grown past its core cannot stand at its pin at all (its 30x20
  // finds no ground within the nudge on either bank), so the crofts'
  // influence cap is the pin's own law: the core, no verge.
  // Band 8 adds the three north patches to the same law (no north pin
  // says hug; the fork rest's padded footprint at its PIN ends one
  // row short of the ward line's rect, pins.ts says so).
  // Band 9e adds the Course's four frames (the shoal is cell-forced,
  // never pinned, so its seat is held by sett.test's SEAT PIN instead).
  const rects = [ASHLAMP_RECT, FENSIDE_RECT, WARDTHREAD_RECT, PICKET_RECT, TURNOFF_RECT, SETT_RECT, COURSE_A_RECT, COURSE_B_RECT, COURSE_C_RECT, MEADOW_RECT];
  const rectName = new Map<object, string>([
    [ASHLAMP_RECT, 'ashlamp'], [FENSIDE_RECT, 'fenside'],
    [WARDTHREAD_RECT, 'wardthread'], [PICKET_RECT, 'picket'], [TURNOFF_RECT, 'turnoff'],
    [SETT_RECT, 'sett'],
    [COURSE_A_RECT, 'course_a'], [COURSE_B_RECT, 'course_b'], [COURSE_C_RECT, 'course_c'], [MEADOW_RECT, 'meadow'],
  ]);
  const hits: string[] = [];
  const gaps: Record<string, number> = {};
  for (const s of AUTHORED_WILD_SITES) {
    if (s.x === undefined || s.y === undefined) continue;
    const def = POI_DEFS.get(s.defId);
    const prefabId = s.prefabId ?? def?.prefabs[0];
    const p = prefabId !== undefined ? POI_PREFABS.get(prefabId) : undefined;
    if (!p) continue;
    const fx0 = s.x - Math.floor(p.width / 2);
    const fy0 = s.y - Math.floor(p.height / 2);
    const pad = s.hug === true ? 0 : AUTHORED_ZONE_PAD;
    for (const r of rects) {
      if (fx0 - pad < r.x + r.w && fx0 + p.width + pad > r.x && fy0 - pad < r.y + r.h && fy0 + p.height + pad > r.y) {
        hits.push(`${s.id} (${prefabId} ${p.width}x${p.height} at (${s.x},${s.y}), pad ${pad}: x ${fx0}..${fx0 + p.width - 1} y ${fy0}..${fy0 + p.height - 1}) stands inside the pad of rect x ${r.x}..${r.x + r.w - 1} y ${r.y}..${r.y + r.h - 1}`);
      }
      // The gap between the footprint and the rect on the axis they meet on.
      const gx = Math.max(r.x - (fx0 + p.width), fx0 - (r.x + r.w));
      const gy = Math.max(r.y - (fy0 + p.height), fy0 - (r.y + r.h));
      gaps[`${s.id}/${rectName.get(r)}`] = Math.max(gx, gy);
    }
  }
  assert.deepEqual(hits, [], 'a pinned footprint stands inside a patch\'s pad (if it is the crofts, its influence cap must be its 24x16 core)');
  assert.equal(gaps['first_road_toll/fenside'], 1, 'the bar stands one row south of the fen waist (THE AUTHORED HUG, on its own word)');
  // The fork rest's pin (-146,-168) keeps exactly the pad from the
  // ward line's rect (its 22x8 footprint's top row -172, the rect's
  // bottom -179: six rows between) and 22 from the picket's.
  assert.equal(gaps['fork_rest/wardthread'], AUTHORED_ZONE_PAD, 'the fork rest keeps the pad south of the ward line');
  assert.ok(gaps['fork_rest/picket']! >= 20, 'the fork rest stands well north of the picket');
  assert.deepEqual(AUTHORED_WILD_SITES.filter((s) => s.hug === true).map((s) => s.id), ['first_road_toll'], 'the bar is the one hugging pin');
  assert.equal(gaps['fenside_crofts/fenside'], AUTHORED_ZONE_PAD, 'the crofts keep the pad east of the fen waist');
  // The two east pins stand where the brief measured them.
  const bar = AUTHORED_WILD_SITES.find((s) => s.id === 'first_road_toll')!;
  const crofts = AUTHORED_WILD_SITES.find((s) => s.id === 'fenside_crofts')!;
  assert.deepEqual([bar.x, bar.y, bar.defId, bar.prefabId], [126, 109, 'first_road_bar', 'poi_first_road_bar']);
  assert.deepEqual([crofts.x, crofts.y, crofts.defId], [160, 94, 'fenside_lamp']);
  // Both pins stand at least AUTHORED_NUDGE_MAX clear of the tutorial rect.
  for (const s of [bar, crofts]) assert.ok(distToRect(s.x!, s.y!, DAWNMEAD_RECT) > AUTHORED_NUDGE_MAX);
});

test('R10 THE TIERS AS ROLLED: cell [0,0] centres tier 2 and [1,0] tier 3; the bar and the crofts stand on them', () => {
  const anchors = SETTLED_ANCHORS;
  assert.equal(dangerAt(SEED, 64, 64, anchors), 2, 'cell [0,0] centre');
  assert.equal(dangerAt(SEED, 192, 64, anchors), 3, 'cell [1,0] centre');
  assert.equal(dangerAt(SEED, 126, 109, anchors), 2, "Brede's bar at its pin");
  assert.equal(dangerAt(SEED, 160, 94, anchors), 3, 'the crofts at their pin');
  // The tier-2 line crosses the road at the fen waist's cairn (119,89), the rect's west edge.
  assert.equal(dangerAt(SEED, 119, 89, anchors), 2, 'the cairn stands on the threshold');
  assert.equal(dangerAt(SEED, 57, 95, anchors), 1, 'the Ashlamp is still tier-1 country');
});

test('E2 THE FIRST BURN STROKE: the Ashlamp burn stands east of the tutorial and crosses the x 64 chunk border', () => {
  const strokes = AUTHORED_GEOGRAPHY.spectrum ?? [];
  const burn = strokes.find((s) => s.id === 'ashlamp_burn');
  assert.ok(burn, 'the stroke is authored');
  assert.equal(burn!.axis, 'burn');
  assert.deepEqual(burn!.shape, { kind: 'circle', x: 57, y: 95, r: 11 }, "centred on the shell's heart");
  assert.equal(burn!.amp, 1);
  assert.ok(!('bones' in burn!) || !(burn as { bones?: boolean }).bones, 'skin only: worldgen is byte-identical');
  const [p] = prepareStrokes([burn!]);
  assert.ok(p, 'the stroke is live (amp not 0)');
  // The ragged reach box: at least eight tiles east of x 32 (the
  // tutorial rect ends at x 31), and it straddles the chunk border at
  // x 64 so the fringe-seam probe reads the halo step across it.
  assert.ok(p!.x0 >= 32 + 8, `bbox west edge ${p!.x0.toFixed(1)} is under eight tiles east of x 32`);
  assert.ok(p!.x0 < 64 && p!.x1 > 64, `bbox x ${p!.x0.toFixed(1)}..${p!.x1.toFixed(1)} does not cross x 64`);
  // The whole box lies inside the Ashlamp's eyeful, never reaching
  // the fen waist or the tutorial.
  assert.ok(p!.x1 < FENSIDE_RECT.x && p!.x0 > DAWNMEAD_RECT.x + DAWNMEAD_RECT.w);
  // The field reads the burn at the shell and nothing at the ford.
  assert.ok(spectrumAt('burn', 57, 95) > 0.9, 'full amplitude at the shell');
  assert.equal(spectrumAt('burn', 138, 85), 0, 'nothing at the ford');
});

test('THE LONG DRY carries nothing: no pinned site and no planned rect between x 71 and x 117 on the First Road', () => {
  // Fix pass 1: the fen waist's rect begins at x 118 (the cairn stands
  // at its west edge), so the long dry is x 71..117.
  for (const s of AUTHORED_WILD_SITES) {
    if (s.x === undefined || s.y === undefined) continue;
    const onTheDry = s.x > 70 && s.x < 118 && s.y > 80 && s.y < 120;
    assert.ok(!onTheDry, `${s.id} stands on the long dry`);
  }
  for (const r of PLANNED_ZONE_RECTS) {
    const overlaps = r.x <= 117 && r.x + r.w - 1 >= 71 && r.y <= 120 && r.y + r.h - 1 >= 80;
    assert.ok(!overlaps, `${r.id} reaches into the long dry`);
  }
});

// ------------------------------------------------------------------
// THE CONTESTED LANDS, band 9d — THE SETT (L1 FRAME). The rect is the
// bowl's own (maps/sett/pins.ts carries the tape); rulings R-A..R-D.
// ------------------------------------------------------------------

test('THE SETT: a planned rect in cell [1,2] that builds to its own pin, sunk, spawnless, with no site row and no pinned footprint inside the pad', () => {
  const z = buildSett();
  const row = PLANNED_ZONE_RECTS.find((p) => p.id === 'sett');
  assert.ok(row, 'sett has a planned row');
  assert.equal(row!.name, 'The Sett');
  assert.ok(!row!.apron, 'a patch on worldgen: no apron (an apron would damp the basin the zone reads)');
  assert.deepEqual(SETT_RECT, { x: 150, y: 265, w: 50, h: 74 });
  assert.deepEqual({ x: z.origin.x, y: z.origin.y, w: z.width, h: z.height }, SETT_RECT, 'the built rect is the plan\'s');
  assert.equal(z.growth, 'wild');
  assert.equal(z.spawn, undefined, 'no spawn: a Sett spawn would be a respawn hearth (R-D)');
  assert.deepEqual(z.reachFrom, { x: 172, y: 266 }, 'the reach anchor on the lip proves the floors instead');
  assert.equal(z.chests, undefined, 'no chest (R-E)');
  assert.ok(z.elev !== undefined, 'the first sunk authored zone carries a level layer');
  // Cell [1,2] carries no site row and no def: the zone is the cell's
  // whole authored content (§13: never a core here).
  const cell = (x: number, y: number): [number, number] => [Math.floor(x / 128), Math.floor(y / 128)];
  for (const s of AUTHORED_WILD_SITES) {
    if (s.x === undefined || s.y === undefined) continue;
    assert.notDeepEqual(cell(s.x, s.y), [1, 2], `site '${s.id}' stands in [1,2]`);
  }
  // The rect stands south of the tutorial's and clear of the two east
  // patches by more than a screen.
  assert.ok(SETT_RECT.y > DAWNMEAD_RECT.y + DAWNMEAD_RECT.h, 'south of Dawnmead');
  assert.ok(SETT_RECT.y > FENSIDE_RECT.y + FENSIDE_RECT.h + 100, 'a hundred past the fen waist');
});

// ------------------------------------------------------------------
// THE CONTESTED LANDS, band 9e — THE STANDING COURSE (L1 FRAMES). Four
// thin planned rects of the Sett's module from the lip to the Drowned
// Meadow (maps/sett/pins.ts carries the tape); rulings R-B, R-G.
// ------------------------------------------------------------------

test('THE STANDING COURSE: four planned rects that build to their own pins, flat, spawnless, abutting and never overlapping, clear of the shoal\'s booted pad', () => {
  const planned = new Map(PLANNED_ZONE_RECTS.map((p) => [p.id, p]));
  const frames: Array<[string, () => ZoneDef, ZoneRect, string]> = [
    ['course_a', buildCourseA, COURSE_A_RECT, 'The Standing Course'],
    ['course_b', buildCourseB, COURSE_B_RECT, 'The Standing Course'],
    ['course_c', buildCourseC, COURSE_C_RECT, 'The Standing Course'],
    ['meadow', buildMeadow, MEADOW_RECT, 'The Drowned Meadow'],
  ];
  for (const [id, build, rect, name] of frames) {
    const z = build();
    const row = planned.get(id);
    assert.ok(row, `${id} has a planned row`);
    assert.equal(row!.name, name);
    assert.ok(!row!.apron, `${id}: a patch on worldgen, no apron`);
    assert.deepEqual({ x: row!.x, y: row!.y, w: row!.w, h: row!.h }, rect);
    assert.deepEqual({ x: z.origin.x, y: z.origin.y, w: z.width, h: z.height }, rect, `${id}: the built rect is the plan's`);
    assert.equal(z.spawn, undefined);
    assert.equal(z.reachFrom, undefined);
    assert.equal(z.elev, undefined, 'flat');
    assert.equal(z.chests, undefined);
    assert.ok(rect.y >= 198, 'never a rect north of y 198');
    // THE SHOAL'S SEAT (9d's boot log: amberfen_shoal at (203,184), the
    // 60x46 prefab's footprint x 173..232, y 161..206, padded by
    // AUTHORED_ZONE_PAD): no frame cell inside x 167..238, y 155..212.
    const x1 = rect.x + rect.w - 1;
    const y1 = rect.y + rect.h - 1;
    const pad = { x0: 173 - AUTHORED_ZONE_PAD, y0: 161 - AUTHORED_ZONE_PAD, x1: 232 + AUTHORED_ZONE_PAD, y1: 206 + AUTHORED_ZONE_PAD };
    assert.deepEqual(pad, { x0: 167, y0: 155, x1: 238, y1: 212 });
    const inside = x1 >= pad.x0 && rect.x <= pad.x1 && y1 >= pad.y0 && rect.y <= pad.y1;
    assert.ok(!inside, `${id} stands inside the shoal's pad`);
  }
  // Abutting, never overlapping: the Sett and the four in a chain.
  const chain = [SETT_RECT, COURSE_A_RECT, COURSE_B_RECT, COURSE_C_RECT, MEADOW_RECT];
  for (let i = 0; i < chain.length; i++) {
    for (let j = i + 1; j < chain.length; j++) {
      const a = chain[i]!;
      const b = chain[j]!;
      const overlap = a.x <= b.x + b.w - 1 && b.x <= a.x + a.w - 1 && a.y <= b.y + b.h - 1 && b.y <= a.y + a.h - 1;
      assert.ok(!overlap, `${i} overlaps ${j}`);
    }
  }
  assert.equal(COURSE_A_RECT.x + COURSE_A_RECT.w, SETT_RECT.x);
  assert.equal(COURSE_B_RECT.y + COURSE_B_RECT.h, COURSE_A_RECT.y);
  assert.equal(COURSE_C_RECT.x + COURSE_C_RECT.w, COURSE_B_RECT.x);
  assert.equal(MEADOW_RECT.x + MEADOW_RECT.w, COURSE_C_RECT.x);
  // Cell [1,2] still carries no site row (the Course's frames are zones).
  const cell = (x: number, y: number): [number, number] => [Math.floor(x / 128), Math.floor(y / 128)];
  for (const s of AUTHORED_WILD_SITES) {
    if (s.x === undefined || s.y === undefined) continue;
    assert.notDeepEqual(cell(s.x, s.y), [1, 2], `site '${s.id}' stands in [1,2]`);
  }
});
