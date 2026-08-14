import assert from 'node:assert/strict';
import { test } from 'node:test';
import { TILE_DEFS, TILE_SKIP, Tile, doorInfo } from '@arx/shared';
import { NPCS } from '../../npcs.js';
import { prefabFromJson, prefabToJson } from '../../maps/prefab.js';
import { AUTHORED_STRONGHOLDS, STRONGHOLD_DEFS, STRONGHOLD_PREFABS, STRONGHOLD_ROSTER } from './defs.js';
import { FAMILY_STYLES, genStronghold, type StrongholdSpec } from './generate.js';
import { WARD_PIECES } from './pieces.js';
import { sketch } from '../prefabs.js';
import { KNOT_BAND_MAX, KNOT_SPACING, STRONGHOLD_MAX_DIM, STRONGHOLD_MIN_DIM } from './types.js';
import { validateStronghold } from './validate.js';

const spec = (over: Partial<StrongholdSpec> = {}): StrongholdSpec => ({
  id: 'stronghold_test_ring',
  name: 'Test ring',
  family: 'goblin',
  tiers: [3, 5],
  weight: 2,
  sizeClass: 'hold',
  bossNames: ['Test Chief'],
  ...over,
});

// ---- The generator ---------------------------------------------------

test('genStronghold is deterministic: same seed, same layout, bit for bit', () => {
  const a = genStronghold(17, spec());
  const b = genStronghold(17, spec());
  assert.deepEqual(a.prefab.ground, b.prefab.ground);
  assert.deepEqual(a.def, b.def);
});

test('different seeds and different ids both change the layout', () => {
  const a = genStronghold(17, spec());
  const b = genStronghold(18, spec());
  const c = genStronghold(17, spec({ id: 'stronghold_test_other' }));
  assert.notDeepEqual(a.prefab.ground, b.prefab.ground, 'seed must matter');
  assert.notDeepEqual(a.prefab.ground, c.prefab.ground, 'the layout id must fold into the streams');
});

test('the generator refuses a family the Foundry has no style for', () => {
  assert.throws(() => genStronghold(1, spec({ family: 'kobold' })), /knows no 'kobold' style/);
});

test('generated layouts stay inside the dimension envelope for both size classes', () => {
  for (const sizeClass of ['hold', 'citadel'] as const) {
    for (let seed = 1; seed <= 8; seed++) {
      const { prefab } = genStronghold(seed, spec({ sizeClass }));
      assert.ok(
        prefab.width >= STRONGHOLD_MIN_DIM && prefab.width <= STRONGHOLD_MAX_DIM &&
          prefab.height >= STRONGHOLD_MIN_DIM && prefab.height <= STRONGHOLD_MAX_DIM,
        `${sizeClass} seed ${seed}: ${prefab.width}x${prefab.height} outside the envelope`,
      );
    }
  }
});

test('every family style names real npcs, pieces, and one boss piece', () => {
  for (const [family, style] of FAMILY_STYLES) {
    for (const id of [...style.wardPieces, style.watchPiece, style.bossPiece]) {
      assert.ok(WARD_PIECES.has(id), `${family}: unknown ward piece '${id}'`);
    }
    assert.equal(WARD_PIECES.get(style.bossPiece)!.kind, 'boss', `${family}: boss piece kind`);
    for (const entry of [...style.menu, style.sentinel, style.guard]) {
      assert.ok(NPCS.has(entry.npc), `${family}: unknown npc '${entry.npc}'`);
      assert.ok(
        entry.band[0] >= 1 && entry.band[1] <= KNOT_BAND_MAX,
        `${family}/${entry.npc}: band outside the knot law`,
      );
    }
    assert.ok(NPCS.has(style.bossNpc), `${family}: unknown boss npc`);
  }
});

// ---- The ward-piece shelf -------------------------------------------

test('exactly the boss pieces carry the one boss chest; no piece carries more', () => {
  for (const piece of WARD_PIECES.values()) {
    const { ground } = piece.prefab;
    let boss = 0;
    let lesser = 0;
    for (const t of ground) {
      if (t === Tile.ChestBoss) boss++;
      if (t === Tile.ChestWood || t === Tile.ChestIron) lesser++;
    }
    if (piece.kind === 'boss') assert.equal(boss, 1, `${piece.prefab.id}: boss piece needs its chest`);
    else assert.equal(boss, 0, `${piece.prefab.id}: only boss pieces carry the cache`);
    assert.equal(lesser, 0, `${piece.prefab.id}: texture is not treasure`);
  }
});

test('every ward piece keeps walkable ground and a transparent perimeter', () => {
  for (const piece of WARD_PIECES.values()) {
    const { width: w, height: h, ground } = piece.prefab;
    let open = 0;
    for (const t of ground) {
      if (t === TILE_SKIP || !TILE_DEFS[t as Tile]!.solid) open++;
    }
    assert.ok(open >= (w * h) / 2, `${piece.prefab.id}: less than half the piece is walkable`);
    for (let x = 0; x < w; x++) {
      assert.equal(ground[x], TILE_SKIP, `${piece.prefab.id}: top perimeter`);
      assert.equal(ground[(h - 1) * w + x], TILE_SKIP, `${piece.prefab.id}: bottom perimeter`);
    }
    for (let y = 0; y < h; y++) {
      assert.equal(ground[y * w], TILE_SKIP, `${piece.prefab.id}: left perimeter`);
      assert.equal(ground[y * w + w - 1], TILE_SKIP, `${piece.prefab.id}: right perimeter`);
    }
  }
});

// ---- The validator, refusal by refusal ------------------------------

const lawful = () => {
  const p = genStronghold(17, spec());
  const res = validateStronghold(p.def, { prefab: p.prefab });
  assert.ok(res.ok, `fixture seed must be lawful: ${res.ok ? '' : res.errors.join('; ')}`);
  return p;
};

const refuse = (mutate: (raw: Record<string, unknown>) => void, needle: RegExp) => {
  const p = lawful();
  const raw = JSON.parse(JSON.stringify(p.def)) as Record<string, unknown>;
  mutate(raw);
  const res = validateStronghold(raw, { prefab: p.prefab });
  assert.ok(!res.ok, `expected refusal matching ${needle}`);
  assert.ok(
    res.errors.some((e) => needle.test(e)),
    `expected ${needle}, got:\n  ${res.errors.join('\n  ')}`,
  );
};

test('validator refuses a bad id, a missing family, and shallow tiers', () => {
  refuse((raw) => (raw.id = 'goblin_moot'), /must match/);
  refuse((raw) => delete raw.family, /family must be a lowercase slug/);
  refuse((raw) => (raw.tiers = [1, 5]), /deep frontier/);
});

test('validator refuses PULL LAW violations by name', () => {
  refuse((raw) => {
    const wards = raw.wards as Array<{ knots: Array<{ at: [number, number] }> }>;
    const donor = wards.find((w) => w.knots.length > 0)!;
    const other = wards.find((w) => w !== donor && w.knots.length > 0)!;
    // Drag one anchor beside another (still inside its own rect? — the
    // law under test is spacing, so pick two knots and collide them).
    other.knots[0]!.at = [donor.knots[0]!.at[0] + 1, donor.knots[0]!.at[1]];
  }, /THE PULL LAW/);
});

test('validator refuses an oversized knot band', () => {
  refuse((raw) => {
    const wards = raw.wards as Array<{ knots: Array<{ band: [number, number] }> }>;
    wards.find((w) => w.knots.length > 0)!.knots[0]!.band = [1, 4];
  }, /a bigger fight is more knots/);
});

test('validator refuses a boss ward that is optional, missing, or unguarded', () => {
  refuse((raw) => {
    const wards = raw.wards as Array<{ key: string; optional?: boolean }>;
    wards.find((w) => w.key === 'last_stand')!.optional = true;
  }, /last stand always stands/);
  refuse((raw) => ((raw.boss as { ward: string }).ward = 'nowhere'), /not a ward key/);
  refuse((raw) => {
    const wards = raw.wards as Array<{ key: string; knots: unknown[] }>;
    wards.find((w) => w.key === 'last_stand')!.knots = [];
  }, /honor guard/);
});

test('validator refuses geometry crimes: shut gates, sealed wards, spawn markers', () => {
  const p = lawful();
  // A shut great gate breaks THE OPEN GATE LAW and seals the yard.
  const shutGround = p.prefab.ground.slice();
  for (let i = 0; i < shutGround.length; i++) {
    if (shutGround[i] === Tile.PalisadeGate) shutGround[i] = Tile.PalisadeGateShut;
  }
  const shut = validateStronghold(p.def, { prefab: { ...p.prefab, ground: shutGround } });
  assert.ok(!shut.ok && shut.errors.some((e) => /OPEN GATE LAW/.test(e)));
  // Spawn markers on the layout prefab break THE KNOTS ARE THE MUSTER.
  const marked = validateStronghold(p.def, {
    prefab: { ...p.prefab, spawns: [{ dx: 5, dy: 5, npc: 'goblin', radius: 2, count: 1 }] },
  });
  assert.ok(!marked.ok && marked.errors.some((e) => /the knots are the muster/.test(e)));
});

test('validator refuses a second boss chest and a chest outside the boss ward', () => {
  const p = lawful();
  const ground = p.prefab.ground.slice();
  // Drop a second boss chest far from the last stand (the fringe ring
  // stays clear; use a courtyard cell near the hearth).
  const bossWard = p.def.wards.find((w) => w.key === 'last_stand')!;
  let planted = false;
  for (let i = 0; i < ground.length && !planted; i++) {
    const x = i % p.prefab.width;
    const y = Math.floor(i / p.prefab.width);
    const inBoss =
      x >= bossWard.rect.x && y >= bossWard.rect.y &&
      x < bossWard.rect.x + bossWard.rect.w && y < bossWard.rect.y + bossWard.rect.h;
    if (!inBoss && ground[i] === Tile.Dirt) {
      ground[i] = Tile.ChestBoss;
      planted = true;
    }
  }
  assert.ok(planted);
  const res = validateStronghold(p.def, { prefab: { ...p.prefab, ground } });
  assert.ok(!res.ok);
  assert.ok(res.errors.some((e) => /exactly one/.test(e) || /outside the boss ward/.test(e)));
});

// ---- The raised ground (Phase 2) ------------------------------------

test('the sketch dialect parses a height plane and refuses a ragged one', () => {
  const rows = ['_____', '_...._'.slice(0, 5), '_____'];
  const good = sketch('elev_probe', 'Elev probe', rows, {}, ['_____', '_111_', '_____']);
  assert.equal(good.elev[5 + 1], 1);
  assert.equal(good.elev[0], 0);
  assert.throws(() => sketch('elev_probe', 'p', rows, {}, ['_____', '_11_', '_____']), /ragged elev row/);
  assert.throws(() => sketch('elev_probe', 'p', rows, {}, ['_____', '_1x1_', '_____']), /unknown elev char/);
  assert.throws(() => sketch('elev_probe', 'p', rows, {}, ['_____', '_111_']), /elev plane has 2 rows/);
});

const terracedShipped = () => {
  for (const def of STRONGHOLD_DEFS.values()) {
    const prefab = STRONGHOLD_PREFABS.get(def.prefab)!;
    if (prefab.elev.some((e) => e !== 0)) return { def, prefab };
  }
  throw new Error('no terraced layout on the shelf');
};

test('validator refuses raised ground whose fence is broken (FENCED HEIGHT)', () => {
  const { def, prefab } = terracedShipped();
  const ground = prefab.ground.slice();
  let cut = false;
  for (let i = 0; i < ground.length && !cut; i++) {
    if (ground[i] === Tile.Cliff) {
      ground[i] = Tile.Grass; // one cliff quarried away
      cut = true;
    }
  }
  assert.ok(cut);
  const res = validateStronghold(def, { prefab: { ...prefab, ground } });
  assert.ok(!res.ok && res.errors.some((e) => /FENCED HEIGHT/.test(e)), 'a quarried fence must refuse');
});

test('validator refuses a ramp that does not descend south (the camera-facing stair)', () => {
  const { def, prefab } = terracedShipped();
  const ground = prefab.ground.slice();
  // Turn a NORTH-edge cliff into a ramp: it would descend away from
  // the camera, which the shelf law forbids.
  let planted = false;
  for (let i = 0; i < ground.length && !planted; i++) {
    const x = i % prefab.width;
    const y = Math.floor(i / prefab.width);
    if (ground[i] === Tile.Cliff && prefab.elev[i] === 1 && prefab.elev[Math.max(0, (y - 1) * prefab.width + x)] === 0) {
      ground[i] = Tile.Ramp;
      planted = true;
    }
  }
  assert.ok(planted);
  const res = validateStronghold(def, { prefab: { ...prefab, ground } });
  assert.ok(!res.ok && res.errors.some((e) => /descend SOUTH/.test(e)));
});

test('validator refuses elevation on transparent cells and near the border', () => {
  const { def, prefab } = terracedShipped();
  const onSkip = prefab.elev.slice();
  onSkip[0] = 1; // the corner fringe cell is TILE_SKIP by law
  const r1 = validateStronghold(def, { prefab: { ...prefab, elev: onSkip } });
  assert.ok(!r1.ok && r1.errors.some((e) => /transparent cells carry elevation/.test(e)));
  const nearEdge = prefab.elev.slice();
  const g2 = prefab.ground.slice();
  g2[prefab.width + 1] = Tile.Cliff; // opaque cell at 1,1
  nearEdge[prefab.width + 1] = 1;
  const r2 = validateStronghold(def, { prefab: { ...prefab, ground: g2, elev: nearEdge } });
  assert.ok(!r2.ok && r2.errors.some((e) => /border-flat/.test(e)));
});

test('every terraced shipped layout raises its chief behind a south stair', () => {
  let terraced = 0;
  let stepped = 0;
  for (const def of STRONGHOLD_DEFS.values()) {
    const prefab = STRONGHOLD_PREFABS.get(def.prefab)!;
    const raised = prefab.elev.some((e) => e !== 0);
    if (!raised) continue;
    terraced++;
    const bi = def.boss.at[1] * prefab.width + def.boss.at[0];
    assert.ok(prefab.elev[bi]! >= 1, `${def.id}: the chief stands on the hill`);
    // THE STEPPED SUMMIT (Second Charter): a level-2 court means a
    // level-1 high ward beneath it — count the two-step summits.
    if (prefab.elev[bi] === 2) {
      stepped++;
      assert.ok(
        prefab.elev.some((e) => e === 1),
        `${def.id}: a level-2 court needs its level-1 high ward`,
      );
    }
    let ramps = 0;
    for (let i = 0; i < prefab.ground.length; i++) if (prefab.ground[i] === Tile.Ramp) ramps++;
    assert.ok(ramps >= 1, `${def.id}: a hill needs its stair`);
    // The reachability sweep already proved the stair is the way in;
    // pin that the fence itself validates.
    const res = validateStronghold(def, { prefab });
    assert.ok(res.ok, `${def.id}: ${res.ok ? '' : res.errors.join('; ')}`);
  }
  assert.ok(terraced >= 6, `only ${terraced} terraced layouts on the shelf`);
  assert.ok(stepped >= 4, `only ${stepped} stepped summits (every citadel climbs twice)`);
});

// ---- The shipped shelf, swept ---------------------------------------

test('every shipped layout validates against its own prefab (the repository sweep)', () => {
  assert.ok(STRONGHOLD_DEFS.size >= 8, 'the shelf looks understocked');
  for (const def of STRONGHOLD_DEFS.values()) {
    const prefab = STRONGHOLD_PREFABS.get(def.prefab);
    assert.ok(prefab, `${def.id}: prefab missing from the shelf`);
    const res = validateStronghold(def, { prefab });
    assert.ok(res.ok, `${def.id}: ${res.ok ? '' : res.errors.join('; ')}`);
    assert.ok(res.ok && res.gates.length >= 1, `${def.id}: no found door`);
  }
});

test('THE POST LAW, CAPTAIN LAW, and ROADS ARE WALKED are generated true (Third Charter)', () => {
  for (const def of STRONGHOLD_DEFS.values()) {
    const prefab = STRONGHOLD_PREFABS.get(def.prefab)!;
    const knots = def.wards.flatMap((w) => [...w.knots]);
    // Placed authority: every layout keeps ≥2 titled captains, each a
    // single named body.
    const titled = knots.filter((k) => k.title);
    assert.ok(titled.length >= 2, `${def.id}: only ${titled.length} titled captains`);
    for (const k of titled) {
      assert.deepEqual([...k.band], [1, 1], `${def.id}: a titled knot must be ONE body`);
    }
    // Bodies stand where the work is: a healthy share of the muster
    // carries a post, and every post anchor touches its furniture's
    // ward ground (validator holds passability; here we pin presence).
    const posted = knots.filter((k) => k.post);
    assert.ok(posted.length >= 4, `${def.id}: only ${posted.length} posted knots`);
    // The camp keeps a clock: at least one day post or night post.
    assert.ok(
      knots.some((k) => k.hours),
      `${def.id}: no hour-keeping knots (the camp reads the same at noon and midnight)`,
    );
    // The roads are walked: at least one authored route, every
    // waypoint on walkable composed ground with lawful hops.
    const routed = def.wards.filter((w) => w.route);
    assert.ok(routed.length >= 1, `${def.id}: no walked routes`);
    for (const w of routed) {
      assert.ok(w.route!.length >= 3, `${def.id}/${w.key}: route too short`);
      for (const [rx, ry] of w.route!) {
        const t = prefab.ground[ry * prefab.width + rx]!;
        const solid = t !== TILE_SKIP && (TILE_DEFS[t as Tile]?.solid ?? true);
        assert.ok(!solid, `${def.id}/${w.key}: waypoint ${rx},${ry} on solid ground`);
      }
    }
  }
});

test("THE CAPTAIN'S KEY: every lesser cache is a titled ward's charge", () => {
  for (const def of STRONGHOLD_DEFS.values()) {
    const prefab = STRONGHOLD_PREFABS.get(def.prefab)!;
    let caches = 0;
    for (let i = 0; i < prefab.ground.length; i++) {
      const t = prefab.ground[i]!;
      if (t !== Tile.ChestIron && t !== Tile.ChestWood) continue;
      caches++;
      const x = i % prefab.width;
      const y = Math.floor(i / prefab.width);
      const owner = def.wards.find(
        (w) => x >= w.rect.x && y >= w.rect.y && x < w.rect.x + w.rect.w && y < w.rect.y + w.rect.h,
      );
      assert.ok(owner, `${def.id}: cache at ${x},${y} in no ward`);
      assert.ok(
        owner!.knots.some((k) => k.title),
        `${def.id}: cache at ${x},${y} in an untitled ward`,
      );
    }
    // Two or three well-earned caches per stronghold beside the boss
    // chest — one per captain, never a scatter of freebies.
    assert.ok(caches >= 2 && caches <= 3, `${def.id}: ${caches} captain caches outside 2..3`);
  }
});

test('shipped knots keep THE PULL LAW with margin visible in the data', () => {
  for (const def of STRONGHOLD_DEFS.values()) {
    const anchors: Array<readonly [number, number]> = [];
    for (const w of def.wards) for (const k of w.knots) anchors.push(k.at);
    for (let a = 0; a < anchors.length; a++) {
      for (let b = a + 1; b < anchors.length; b++) {
        const d2 =
          (anchors[a]![0] - anchors[b]![0]) ** 2 + (anchors[a]![1] - anchors[b]![1]) ** 2;
        assert.ok(d2 >= KNOT_SPACING * KNOT_SPACING, `${def.id}: knots closer than the law`);
      }
    }
  }
});

test('every shipped gate stands open and pierces the wall', () => {
  for (const def of STRONGHOLD_DEFS.values()) {
    const prefab = STRONGHOLD_PREFABS.get(def.prefab)!;
    for (const t of prefab.ground) {
      const info = doorInfo(t);
      assert.ok(!info || info.open, `${def.id}: a shut leaf shipped`);
    }
  }
});

test('the authored shelf and the live registry start identical, and the roster is pinned', () => {
  assert.equal(AUTHORED_STRONGHOLDS.size, STRONGHOLD_DEFS.size);
  for (const [id, def] of AUTHORED_STRONGHOLDS) {
    assert.deepEqual(STRONGHOLD_DEFS.get(id), def);
    assert.ok(STRONGHOLD_ROSTER.some((r) => r.id === id), `${id}: missing from the pinned roster`);
  }
});

test('layout prefabs round-trip through the library JSON dialect', () => {
  for (const prefab of STRONGHOLD_PREFABS.values()) {
    const back = prefabFromJson(prefabToJson(prefab));
    assert.deepEqual(back.ground, prefab.ground, `${prefab.id}: ground round-trip`);
    assert.deepEqual(back.elev, prefab.elev, `${prefab.id}: elev round-trip`);
    assert.equal(back.spawns.length, 0, `${prefab.id}: the knots are the muster`);
  }
});
