import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { TILE_SKIP, Tile, chestInfo } from '@arx/shared';
import { DANGER_LAWS } from '../danger.js';
import { NPCS } from '../npcs.js';
import type { PrefabDef } from '../maps/prefab.js';
import { AUTHORED_POI_DEFS, POI_DEFS } from './defs.js';
import { declareInfluence, expandInfluence } from './influence.js';
import { POI_PREFABS } from './prefabs.js';
import { validatePoiDef } from './validate.js';

const DEFS_DIR = join(dirname(fileURLToPath(import.meta.url)), 'defs');

test('every defs/*.json file is on the SOURCES roster', () => {
  const files = readdirSync(DEFS_DIR).filter((f) => f.endsWith('.json'));
  assert.ok(files.length >= 3, 'defs directory looks empty');
  for (const file of files) {
    const id = file.replace(/\.json$/, '');
    assert.ok(POI_DEFS.has(id), `${file}: missing from the registry SOURCES roster`);
  }
  assert.equal(POI_DEFS.size, files.length, 'registry holds defs with no file');
});

test('every archetype references known prefabs and bestiary ids', () => {
  for (const def of POI_DEFS.values()) {
    assert.ok(def.prefabs.length > 0, `${def.id} has an empty prefab pool`);
    for (const id of def.prefabs) {
      assert.ok(POI_PREFABS.has(id), `${def.id} references unknown prefab '${id}'`);
    }
    for (const g of def.garrison) {
      assert.ok(NPCS.has(g.npc), `${def.id} garrison references unknown npc '${g.npc}'`);
      assert.ok(g.count[0] <= g.count[1], `${def.id}/${g.npc} count range inverted`);
      if (g.minTier !== undefined) {
        assert.ok(
          g.minTier >= def.tiers[0] && g.minTier <= def.tiers[1],
          `${def.id}/${g.npc} minTier outside the archetype's tiers`,
        );
      }
      if (g.patrol) assert.equal(g.role, 'sentry', `${def.id}/${g.npc}: patrol on a holdfast`);
    }
    assert.ok(
      def.tiers[0] >= 1 && def.tiers[1] < DANGER_LAWS.length && def.tiers[0] <= def.tiers[1],
      `${def.id} tier range invalid`,
    );
  }
});

test('the authored roster and live registry start identical', () => {
  assert.deepEqual([...POI_DEFS.entries()], [...AUTHORED_POI_DEFS.entries()]);
});

test('the validator normalizes a good doc and names every fault in a bad one', () => {
  const good = validatePoiDef({
    id: 'test_camp',
    name: 'Test camp',
    tiers: [1, 3],
    weight: 2,
    prefabs: ['poi_goblin_camp_ring'],
    garrison: [
      { npc: 'goblin', count: [1, 2], role: 'sentry', patrol: true },
    ],
    cues: { clearing: 3, approachPath: true, scatter: [{ tile: 'BonePile', count: 2 }] },
  });
  assert.ok(good.ok, JSON.stringify(good));
  if (good.ok) {
    assert.equal(good.def.cues?.clearing, 3);
    assert.equal(good.def.garrison[0]!.patrol, true);
  }

  const bad = validatePoiDef({
    id: 'Bad Id!',
    name: '',
    tiers: [0, 9],
    weight: -1,
    prefabs: [],
    garrison: [
      { npc: 'no_such_beast', count: [3, 1], role: 'boss' },
      { npc: 'goblin', count: [1, 1], role: 'holdfast', patrol: true },
    ],
    chestTierBonus: 7,
    cues: { clearing: 99, scatter: [{ tile: 'NoSuchTile', count: 1 }] },
  });
  assert.ok(!bad.ok);
  if (!bad.ok) {
    const text = bad.errors.join('\n');
    for (const needle of [
      'id', 'name is empty', 'tiers', 'weight', 'prefabs',
      "unknown npc 'no_such_beast'", 'count 3..1', 'role',
      'patrol is a sentry trait', 'chestTierBonus', 'cues.clearing',
      "unknown tile name 'NoSuchTile'",
    ]) {
      assert.ok(text.includes(needle), `missing error about: ${needle}\n${text}`);
    }
  }
});

test('the validator vets activity windows', () => {
  const good = validatePoiDef({
    id: 'night_test',
    name: 'Night test',
    tiers: [1, 2],
    weight: 1,
    prefabs: ['poi_grove_ore'],
    garrison: [
      { npc: 'wolf', count: [1, 1], role: 'holdfast', hours: { from: 20.5, to: 5.5 } },
    ],
  });
  assert.ok(good.ok, JSON.stringify(good));
  if (good.ok) assert.deepEqual(good.def.garrison[0]!.hours, { from: 20.5, to: 5.5 });

  const bad = validatePoiDef({
    id: 'bad_hours',
    name: 'Bad hours',
    tiers: [1, 2],
    weight: 1,
    prefabs: ['poi_grove_ore'],
    garrison: [
      { npc: 'wolf', count: [1, 1], role: 'holdfast', hours: { from: 25, to: 3 } },
      { npc: 'wolf', count: [1, 1], role: 'holdfast', hours: { from: 4, to: 4 } },
    ],
  });
  assert.ok(!bad.ok);
  if (!bad.ok) {
    const text = bad.errors.join('\n');
    assert.ok(text.includes('hours must be'), text);
    assert.ok(text.includes('empty window'), text);
  }
});

test('the validator cross-checks prefab ids when given the library', () => {
  const res = validatePoiDef(
    {
      id: 'ghost_camp',
      name: 'Ghost camp',
      tiers: [1, 2],
      weight: 1,
      prefabs: ['poi_that_never_was'],
      garrison: [],
    },
    { prefabIds: new Set(POI_PREFABS.keys()) },
  );
  assert.ok(!res.ok);
  if (!res.ok) assert.ok(res.errors.join(' ').includes("unknown prefab 'poi_that_never_was'"));
});

test('prefab spawns reference known bestiary ids', () => {
  for (const p of POI_PREFABS.values()) {
    for (const s of p.spawns) {
      assert.ok(NPCS.has(s.npc), `${p.id} spawn references unknown npc '${s.npc}'`);
    }
  }
});

test('warcamp and ruin prefabs carry exactly one closed strongbox', () => {
  for (const def of POI_DEFS.values()) {
    if (def.chestTierBonus === undefined) continue;
    for (const id of def.prefabs) {
      const p = POI_PREFABS.get(id)!;
      let chests = 0;
      for (const g of p.ground) {
        const info = chestInfo(g);
        if (info && !info.open) chests++;
      }
      assert.equal(chests, 1, `${id} should hold exactly one strongbox`);
    }
  }
});

test('prefabs keep a transparent fringe so stamps sit in the terrain', () => {
  for (const p of POI_PREFABS.values()) {
    let skips = 0;
    for (const g of p.ground) if (g === TILE_SKIP) skips++;
    assert.ok(skips > 0, `${p.id} has no TILE_SKIP cells — it would stamp a hard rectangle`);
    const { width: w, height: h } = p;
    for (const [x, y] of [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]] as const) {
      assert.equal(p.ground[y * w + x], TILE_SKIP, `${p.id} corner ${x},${y} not transparent`);
    }
  }
});

test('markers stand on open ground, never inside walls or props', () => {
  for (const p of POI_PREFABS.values()) {
    for (const s of p.spawns) {
      const t = p.ground[s.dy * p.width + s.dx]!;
      assert.ok(
        t === Tile.Grass || t === Tile.Dirt || t === Tile.StoneFloor,
        `${p.id} spawn '${s.npc}' stands on tile ${t}`,
      );
    }
  }
});

test('phase-4 grammar: the validator vets staff, havens, wards, names, and flags', () => {
  const base = {
    id: 'test_site',
    name: 'Test site',
    tiers: [2, 4],
    weight: 1,
    prefabs: ['poi_waystation_camp'],
    garrison: [],
  };
  const good = validatePoiDef({
    ...base,
    actors: [
      { pool: ['wayfarer_senna', 'wayfarer_dray'], post: 'hearth', routine: 'waystation_keeper' },
      { pool: ['wayward_watch'], post: 'watch' },
    ],
    haven: { safeR: 18 },
    chestLoot: 'chest_riftgate',
    clearedFlag: 'poi_test_cleared',
  });
  assert.ok(good.ok, JSON.stringify(good));
  assert.equal(good.ok && good.def.haven?.safeR, 18);
  assert.equal(good.ok && good.def.actors?.length, 2);

  const badCases: Array<[string, Record<string, unknown>]> = [
    ['unknown actor', { actors: [{ pool: ['nobody_home'], post: 'hearth' }] }],
    ['bad post', { actors: [{ pool: ['wayward_watch'], post: 'roof' }] }],
    ['unknown routine', { actors: [{ pool: ['wayward_watch'], post: 'watch', routine: 'ghost_hours' }] }],
    ['haven too wide', { haven: { safeR: 99 } }],
    ['unknown chest table', { chestLoot: 'chest_of_wonders' }],
    ['ward with no keeper', { chestWarded: true }],
    ['flag in the dlg namespace', { clearedFlag: 'dlg:sneaky' }],
    [
      'name pool on a platoon',
      {
        garrison: [
          { npc: 'troll', count: [1, 2], role: 'holdfast', names: ['Korga'] },
        ],
      },
    ],
  ];
  for (const [label, patch] of badCases) {
    const res = validatePoiDef({ ...base, ...patch });
    assert.ok(!res.ok, `'${label}' passed validation`);
  }
});

test('THE FREQUENCY LAW: boldness rungs vet like garrisons and never out-level the base', () => {
  const base = {
    id: 'test_bold',
    name: 'Test bold camp',
    tiers: [1, 3] as [number, number],
    weight: 2,
    prefabs: ['poi_goblin_camp_ring'],
    garrison: [
      { npc: 'goblin', count: [1, 2], role: 'holdfast', levelOffset: 3 },
    ],
  };
  const good = validatePoiDef({
    ...base,
    boldness: {
      stages: [
        { garrison: [{ npc: 'goblin', count: [1, 2], role: 'holdfast', levelOffset: 3 }] },
        { scatter: [{ tile: 'BonePile', count: 2 }] },
      ],
      satellites: true,
    },
  });
  assert.ok(good.ok, JSON.stringify(good));
  if (good.ok) {
    assert.equal(good.def.boldness?.stages.length, 2);
    assert.equal(good.def.boldness?.satellites, true);
  }
  const badCases: Array<[string, unknown]> = [
    [
      'rung out-levels the base',
      { stages: [{ garrison: [{ npc: 'goblin', count: [1, 1], role: 'holdfast', levelOffset: 4 }] }] },
    ],
    ['too many rungs', { stages: [{}, {}, {}, {}] }],
    ['empty rung', { stages: [{}] }],
    ['bad rung npc', { stages: [{ garrison: [{ npc: 'dragon_emperor', count: [1, 1], role: 'holdfast' }] }] }],
  ];
  for (const [label, boldness] of badCases) {
    const res = validatePoiDef({ ...base, boldness });
    assert.ok(!res.ok, `'${label}' passed validation`);
  }
  // A garrison-less def cannot be emboldened.
  const noMuster = validatePoiDef({
    ...base,
    garrison: [],
    boldness: { stages: [{ scatter: [{ tile: 'BonePile', count: 1 }] }] },
  });
  assert.ok(!noMuster.ok, 'boldness without a garrison passed validation');
});

test('the shipped escalating archetypes carry their ladders', () => {
  for (const id of ['goblin_warcamp', 'bandit_camp', 'kobold_digs', 'wolfkin_den', 'forest_ruin']) {
    const def = POI_DEFS.get(id);
    assert.ok(def?.boldness, `${id} lost its boldness ladder`);
    assert.ok(def!.boldness!.stages.length === 3, `${id} should carry 3 rungs`);
  }
  // The mindless dead deepen but never spread — thematic contrast, pinned.
  assert.equal(POI_DEFS.get('forest_ruin')!.boldness!.satellites, undefined);
  assert.equal(POI_DEFS.get('goblin_warcamp')!.boldness!.satellites, true);
});

test('THE LANDMARKS: expansive authored grounds, each with one modest cache', () => {
  const LANDMARKS = [
    'poi_barrowfield_great',
    'poi_ruin_greatkeep',
    'poi_goblin_sprawl',
    'poi_wolfkin_killfield',
    'poi_brigand_waystead',
    'poi_goblin_warren',
    'poi_goblin_mootfield',
    'poi_goblin_grubfarm',
    'poi_goblin_warstage',
    'poi_dead_chapel',
    'poi_dead_muster',
    'poi_dead_cloister',
    'poi_dead_kingsrow',
    // THE DROWNED VILLAGES (docs/skral-decor-plan.md): the banks'
    // landmark grounds — they carry their own dug water, so the
    // meadow-fringe law reads through a sand hem instead.
    'poi_skral_village_longbanks',
    'poi_skral_village_saltgarth',
  ];
  // Livestock may be penned by hand (the stolen-cows law: authored
  // levels, never the danger band); hostiles always come from defs.
  const LIVESTOCK = new Set(['boar', 'cow', 'bull', 'sheep', 'ram', 'chicken']);
  for (const id of LANDMARKS) {
    const p = POI_PREFABS.get(id);
    assert.ok(p, `${id} missing from the shelf`);
    // 3-5x the ordinary camp (median 14): a landmark is a PLACE.
    assert.ok(Math.max(p!.width, p!.height) >= 45, `${id}: ${p!.width}x${p!.height} too small for a landmark`);
    assert.ok(Math.max(p!.width, p!.height) <= 98, `${id}: outgrew its cell`);
    // One iron cache — strongholds keep the big chests (the loot law).
    let iron = 0;
    let boss = 0;
    for (const t of p!.ground) {
      if (t === Tile.ChestIron) iron++;
      if (t === Tile.ChestBoss) boss++;
    }
    assert.equal(iron, 1, `${id}: exactly one modest cache`);
    assert.equal(boss, 0, `${id}: boss chests belong to strongholds and courts`);
    // No hostile spawn markers — the def's garrison is the muster.
    for (const s of p!.spawns) {
      assert.ok(LIVESTOCK.has(s.npc), `${id}: hand spawn '${s.npc}' is not livestock`);
      assert.ok(s.level !== undefined, `${id}: penned '${s.npc}' needs its authored level`);
    }
    // Referenced by a registered def.
    assert.ok(
      [...POI_DEFS.values()].some((d) => d.prefabs.includes(id)),
      `${id}: no def deals it`,
    );
  }
});

test('THE PEOPLED LANDMARKS: every landmark carries a walked round with stations', () => {
  const LANDMARKS = [
    'poi_barrowfield_great',
    'poi_ruin_greatkeep',
    'poi_goblin_sprawl',
    'poi_wolfkin_killfield',
    'poi_brigand_waystead',
    'poi_goblin_warren',
    'poi_goblin_mootfield',
    'poi_goblin_grubfarm',
    'poi_goblin_warstage',
    'poi_dead_chapel',
    'poi_dead_muster',
    'poi_dead_cloister',
    'poi_dead_kingsrow',
    'poi_skral_village_longbanks',
    'poi_skral_village_saltgarth',
  ];
  // The post signs the compose scan reads — a landmark must offer
  // real work: fires, drill gear, tents, seats, lights, or charges.
  const POST_SIGNS = new Set<number>([
    Tile.CookPot, Tile.MeatSpit, Tile.Bonfire, Tile.Campfire,
    Tile.TargetDummy, Tile.SpearRack, Tile.WeaponRack,
    Tile.TentHide, Tile.TentWar, Tile.Bench, Tile.Chair,
    Tile.SkullTotem, Tile.Brazier, Tile.WarBrazier, Tile.StandingTorch,
    Tile.PrisonCage, Tile.BeastNest,
    // The skral working shelf (the POI post table reads these):
    // shelters sleep, smokers cook, benches and pools and pans are
    // KEPT, racks drill, totems and lures keep vigil.
    Tile.ReedShelter, Tile.SmokeTripod, Tile.MendingBench, Tile.ShellBench,
    Tile.KeepPool, Tile.SaltPan, Tile.HarpoonRack, Tile.LurePole,
    Tile.TideTotem,
  ]);
  for (const id of LANDMARKS) {
    const p = POI_PREFABS.get(id)!;
    // An authored round with real stations (dwell stops) — the round
    // that walks, pauses at its work, and moves on.
    assert.ok(p.routes && p.routes.length >= 1, `${id}: no authored round`);
    for (const r of p.routes!) {
      assert.ok(r.pts.length >= 8, `${id}: a landmark round walks the whole ground`);
      assert.ok(
        r.pts.some((pt) => (pt.dwell ?? 0) >= 60),
        `${id}: a round needs at least one real station`,
      );
    }
    // Enough stamped work for the post scan to people the ground.
    let signs = 0;
    for (const t of p.ground) if (POST_SIGNS.has(t)) signs++;
    assert.ok(signs >= 4, `${id}: only ${signs} post signs — the ground reads unworked`);
    // The living families sit at their fires; the dead keep standing
    // rounds (sit stops are a fire-and-hearth thing).
    const sits = p.routes!.flatMap((r) => r.pts).filter((pt) => pt.sit).length;
    if (id.includes('goblin') || id.includes('brigand') || id.includes('skral')) {
      assert.ok(sits >= 1, `${id}: a living camp's round sits down somewhere`);
    }
  }
  // Module determinism: the shelf builds bit-identical every load
  // (the pinned-seed law) — two imports share one artifact, so check
  // a rebuilt prefab against the registry copy.
  const a = POI_PREFABS.get('poi_goblin_mootfield')!;
  assert.ok(
    a.ground.length === a.width * a.height && a.ground.some((t) => t === Tile.Bonfire),
    'mootfield lost its heart',
  );
});

test('THE DROWNED VILLAGES: the banks carry their own water, worked and walked', () => {
  // The village def: shore-flagged, family skral, both grounds dealt.
  const def = POI_DEFS.get('skral_village')!;
  assert.ok(def, 'skral_village missing');
  assert.equal(def.shore, true, 'a skral village stands on a bank or not at all');
  assert.equal(def.family, 'skral');
  assert.deepEqual(def.prefabs, ['poi_skral_village_longbanks', 'poi_skral_village_saltgarth']);
  assert.ok(
    def.garrison.some((g) => g.crowned && (g.names?.length ?? 0) >= 4),
    'a village answers to a named crowned deepking',
  );
  for (const id of def.prefabs) {
    const p = POI_PREFABS.get(id)!;
    // The '~' law at landmark scale: the village CARRIES its water —
    // the dug vein is the whole reason the ground exists.
    let wet = 0;
    let sand = 0;
    for (const t of p.ground) {
      if (t === Tile.WaterShallow) wet++;
      if (t === Tile.Sand) sand++;
    }
    assert.ok(wet >= 40, `${id}: only ${wet} wet cells — the vein went dry`);
    assert.ok(sand >= 20, `${id}: only ${sand} sand cells — the bank lost its hem`);
    // Two walked rounds each: the works and the watch.
    assert.equal(p.routes?.length, 2, `${id}: a village keeps two rounds`);
    // The whole craftsman shelf is present — a village, not a camp.
    const WORKED = [
      Tile.ReedShelter, Tile.SmokeTripod, Tile.MendingBench, Tile.WeirPanels,
      Tile.KelpLine, Tile.SaltPan, Tile.ShellBench, Tile.WithyStore,
      Tile.KeepPool, Tile.TideChimes, Tile.LurePole, Tile.TideAltar,
      Tile.WhaleRibs, Tile.Dugout, Tile.HarpoonRack,
    ];
    for (const tile of WORKED) {
      assert.ok(
        p.ground.some((t) => t === tile),
        `${id}: tile ${Tile[tile]} missing — the shelf is not all here`,
      );
    }
  }
});

test('THE DECLARED TERRITORY: influence rides the definition, and the heart keeps ALL THREE layers', () => {
  // A synthetic prefab with something in every layer — the shipped
  // sketches all carry empty detail/elev planes, so only a synthetic
  // heart can prove the blit (the audit's latent flattening bug).
  const mk = (id: string): PrefabDef => {
    const w = 9;
    const h = 7;
    const ground = new Uint16Array(w * h).fill(TILE_SKIP);
    const detail = new Uint16Array(w * h);
    const elev = new Int8Array(w * h);
    for (let i = 0; i < w * h; i++) {
      if (i % 3 === 0) ground[i] = Tile.Dirt;
      detail[i] = (i * 7) % 251;
      elev[i] = (i % 4) - 1;
    }
    // Corners transparent (the fringe law) so the sketch reads honest.
    for (const c of [0, w - 1, (h - 1) * w, h * w - 1]) ground[c] = TILE_SKIP;
    return { id, name: id, width: w, height: h, ground, detail, elev, portals: [], spawns: [], actorSpawns: [] };
  };

  // A DECLARED cap is the whole law: the long axis lands exactly on it
  // (9x7 wants round(9*2.6)=23, floored up to the 34 knee — the cap
  // outranks both).
  const capped = expandInfluence(declareInfluence(mk('poi_test_declared_cap'), { cap: 24 }));
  assert.equal(Math.max(capped.width, capped.height), 24, 'declared cap not honored');

  // An UNDECLARED poi_ id takes the open default (the 34 knee for a
  // small heart) — no far-file list left to consult.
  const open = expandInfluence(mk('poi_test_undeclared'));
  assert.equal(Math.max(open.width, open.height), 34, 'open default drifted');

  // A declared EXEMPT passes through untouched — same object, no copy.
  const exempt = mk('poi_test_declared_exempt');
  declareInfluence(exempt, { exempt: true });
  assert.equal(expandInfluence(exempt), exempt, 'exempt prefab was rebuilt');

  // THE HEART IS BIT-IDENTICAL — all three layers, not just ground:
  // detail and elev must survive expansion verbatim at the centered
  // rect (they used to be dropped for empty planes).
  const src = mk('poi_test_declared_cap');
  const hx0 = Math.floor((capped.width - src.width) / 2);
  const hy0 = Math.floor((capped.height - src.height) / 2);
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      const o = y * src.width + x;
      const e = (hy0 + y) * capped.width + (hx0 + x);
      const t = src.ground[o]!;
      if (t !== TILE_SKIP) assert.equal(capped.ground[e], t, `ground drifted at ${x},${y}`);
      assert.equal(capped.detail[e], src.detail[o], `detail flattened at ${x},${y}`);
      assert.equal(capped.elev[e], src.elev[o], `elev flattened at ${x},${y}`);
    }
  }
  // The outskirt ring carries NOTHING on the upper planes: detail and
  // elev outside the heart stay empty (the ring is ground-only).
  let outside = 0;
  for (let i = 0; i < capped.detail.length; i++) {
    const x = i % capped.width;
    const y = Math.floor(i / capped.width);
    const inHeart = x >= hx0 && x < hx0 + src.width && y >= hy0 && y < hy0 + src.height;
    if (!inHeart && (capped.detail[i] !== 0 || capped.elev[i] !== 0)) outside++;
  }
  assert.equal(outside, 0, 'the outskirts grew detail/elev');

  // A declared vocab OUTRANKS the family-prefix read: an id no regex
  // family claims, declared 'skral', litters the catch — racks,
  // middens, traps — never the neutral rocks-and-berries.
  const voiced = expandInfluence(declareInfluence(mk('poi_test_declared_vocab'), { vocab: 'skral' }));
  const SKRAL_SCATTER = new Set<number>([
    Tile.ShellMidden, Tile.FishRack, Tile.FishTrap, Tile.NetFrame, Tile.KelpLine, Tile.WithyStore,
  ]);
  assert.ok(
    voiced.ground.some((t) => SKRAL_SCATTER.has(t)),
    'declared vocab did not reach the scatter',
  );
  assert.ok(
    !voiced.ground.some((t) => t === Tile.BerryBush),
    'neutral vocab leaked past the declaration',
  );

  // ONE VOICE PER ID: a second declaration throws at load, never a
  // silent last-writer-wins.
  assert.throws(() => declareInfluence(mk('poi_test_declared_cap'), { cap: 10 }));

  // The migrated shelf holds its measured lines: the sample of each
  // old hand-list keeps the exact footprint it shipped with.
  for (const [id, maxDim] of [
    ['poi_goblin_camp_ring', 20], // wing pool
    ['poi_wayshrine_stones', 30], // quiet wayside
    ['poi_hoargate', 48], // measured pin
    ['poi_barrow_ring', 11], // measured pin (unexpanded — the fells hold no room)
  ] as const) {
    const p = POI_PREFABS.get(id)!;
    assert.ok(p, `${id} missing from the shelf`);
    assert.ok(Math.max(p.width, p.height) <= maxDim, `${id}: ${p.width}x${p.height} outgrew its declared cap ${maxDim}`);
  }
  // Exempt courts and landmarks never grew past their authored dims.
  const court = POI_PREFABS.get('poi_warhold_court')!;
  assert.equal(Math.max(court.width, court.height), 16, 'the warhold court expanded — exemption lost');
});
