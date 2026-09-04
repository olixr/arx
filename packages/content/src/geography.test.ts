import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DANGER_OVER, dangerAt, type DangerAnchor } from '@arx/shared';
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
} from './geography.js';
import { SETTLED_ANCHORS } from './danger.js';
import { buildDawnmead } from './maps/dawnmead.js';
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
//   tier-1 cores (3 of 6): veil_den [-2,-1], first_road_toll [0,0],
//     felling_drum [0,-1];
//   tier-2 cores (9 of 14): fork_rest [-2,-2], husk_of_the_line
//     [-1,-2], fenside_crofts [1,0] (the crofts AND the lamp: one
//     scene with the bar), third_stone [-2,1], broken_barrow [-2,0],
//     plus the shipped longmeadow_rest [0,-2], amberfen_shoal [1,1],
//     returners_camp [-3,1];
//   tier-3: hobgoblin_legion [-1,-3].
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
    ['first_road_toll', 'bandit_camp', '0,0'],
    ['fenside_crofts', 'fenside_lamp', '1,0'],
    ['fork_rest', 'fork_waystation', '-2,-2'],
    ['husk_of_the_line', 'husk_of_the_line', '-1,-2'],
    ['felling_drum', 'felling_drum', '0,-1'],
    ['hobgoblin_legion', 'hobgoblin_legion', '-1,-3'],
    ['veil_den', 'wolfkin_den', '-2,-1'],
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
  for (const defId of ['fenside_lamp', 'ashlamp', 'fork_waystation', 'third_stone_rest',
    'husk_of_the_line', 'felling_drum', 'legion_pressed', 'hobgoblin_legion', 'broken_barrow']) {
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
  assert.deepEqual(snap.spectrum, []);
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
