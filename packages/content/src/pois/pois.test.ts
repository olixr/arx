import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { Detail, TILE_SKIP, Tile, chestInfo, isSeatTile, isSolidTile } from '@arx/shared';
import { buildAmberford } from '../maps/amberford.js';
import { buildDawnmead } from '../maps/dawnmead.js';
import { buildEvenfall } from '../maps/evenfall.js';
import { buildHartfell } from '../maps/hartfell.js';
import { buildKingsdelf } from '../maps/kingsdelf.js';
import { buildLowhall } from '../maps/lowhall.js';
import { buildPinewatch } from '../maps/pinewatch.js';
import { buildSaltmere } from '../maps/saltmere.js';
import { buildSilverfall } from '../maps/silverfall.js';
import { buildUndercroft } from '../maps/undercroft.js';
import type { ZoneDef } from '../maps/types.js';
import { DANGER_LAWS } from '../danger.js';
import { FRONTIER } from '../frontier.js';
import { AUTHORED_GEOGRAPHY, roadBearingAt } from '../geography.js';
import { NPCS } from '../npcs.js';
import type { PrefabDef } from '../maps/prefab.js';
import { AUTHORED_POI_DEFS, POI_DEFS } from './defs.js';
import { CLAIM_MARKS_MAX, claimMarkOf, declareInfluence, expandInfluence, familyVocabOf } from './influence.js';
import { K3_SKETCHES, POI_PREFABS } from './prefabs.js';
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

// ---- THE PRESSED SATELLITE (docs/contested-lands-plan.md §5 beat 8):
// boldness.rivalDef — dealt as the reach at satelliteStage, never rolled.
test('CONTESTED LANDS: boldness.rivalDef validates its shape and the registry holds its law', async () => {
  const { rivalDefErrors } = await import('./defs.js');
  const base = {
    id: 'test_drum',
    name: 'Test drum',
    tiers: [1, 3] as [number, number],
    weight: 2,
    prefabs: ['poi_goblin_camp_ring'],
    garrison: [{ npc: 'goblin', count: [1, 2], role: 'holdfast' }],
  };
  const rung = { stages: [{ scatter: [{ tile: 'BonePile', count: 1 }] }] };
  const good = validatePoiDef({ ...base, boldness: { ...rung, satellites: true, rivalDef: 'test_legion' } });
  assert.ok(good.ok, JSON.stringify(good));
  if (good.ok) assert.equal(good.def.boldness?.rivalDef, 'test_legion');
  for (const [why, boldness] of [
    ['no satellites', { ...rung, rivalDef: 'test_legion' }],
    ['names itself', { ...rung, satellites: true, rivalDef: 'test_drum' }],
    ['empty id', { ...rung, satellites: true, rivalDef: '' }],
  ] as const) {
    const res = validatePoiDef({ ...base, boldness });
    assert.ok(!res.ok, `refused: ${why}`);
  }
  // The registry cross-law: the rival must exist and be weight 0.
  const drum = good.ok ? good.def : undefined;
  assert.ok(drum);
  const rival = (weight: number) =>
    validatePoiDef({ ...base, id: 'test_legion', name: 'Test legion', weight, boldness: undefined });
  const w0 = rival(0);
  const w2 = rival(2);
  assert.ok(w0.ok && w2.ok);
  if (!w0.ok || !w2.ok) return;
  assert.deepEqual(rivalDefErrors(new Map([[drum!.id, drum!], ['test_legion', w0.def]])), []);
  assert.equal(rivalDefErrors(new Map([[drum!.id, drum!]])).length, 1, 'a missing rival is named');
  assert.match(rivalDefErrors(new Map([[drum!.id, drum!], ['test_legion', w2.def]]))[0]!, /weight 0/);
  // The shipped roster passes its own law (buildRegistry already threw otherwise).
  assert.deepEqual(rivalDefErrors(POI_DEFS), []);
});

// --------------------------------------------------------------------
// THE CONTESTED LANDS (docs/contested-lands-plan.md §3, §13.2, band 0):
// the ring's weight-0 variants, the tribe field the validator used to
// eat, and the rival's reach.
// --------------------------------------------------------------------

// Band 7: `ashlamp` retired (the scar is an authored zone, R1) and
// `first_road_bar` joined (Brede's bodies, R4).
const CONTESTED_DEFS = [
  'fenside_lamp', 'first_road_bar', 'fork_waystation', 'third_stone_rest',
  'husk_of_the_line', 'felling_drum', 'legion_pressed', 'hobgoblin_legion', 'broken_barrow',
] as const;

test('THE CONTESTED LANDS: weight-0 variants on existing families only (ONE ATLAS LAW)', () => {
  const atlas = new Set<string>();
  for (const d of POI_DEFS.values()) {
    if ((CONTESTED_DEFS as readonly string[]).includes(d.id)) continue;
    if (d.family) atlas.add(d.family);
  }
  for (const id of CONTESTED_DEFS) {
    const def = POI_DEFS.get(id);
    assert.ok(def, `${id} missing from the registry`);
    assert.equal(def!.weight, 0, `${id} must never roll on its own`);
    if (def!.family !== undefined) {
      assert.ok(atlas.has(def!.family), `${id}: family '${def!.family}' is NEW — the atlas is closed`);
    }
    for (const g of def!.garrison) {
      assert.ok(NPCS.has(g.npc), `${id}: unknown npc ${g.npc}`);
    }
  }
  // The frequency law: heavy families never stand inside tier 2 as
  // themselves — the variants carry honest smaller tiers.
  assert.deepEqual(POI_DEFS.get('husk_of_the_line')!.tiers, [2, 4]);
  assert.deepEqual(POI_DEFS.get('broken_barrow')!.tiers, [2, 4]);
  assert.deepEqual(POI_DEFS.get('hobgoblin_legion')!.tiers, [3, 6]);
  assert.deepEqual(POI_DEFS.get('felling_drum')!.tiers, [1, 3]);
  assert.deepEqual(POI_DEFS.get('legion_pressed')!.tiers, [1, 3]);
  // BREDE'S BAR (band 7, R4 + §3.2): the honest smaller variant of
  // bandit_camp — weight 0, tiers 1..3, the reaver row minTier 1 so
  // Brede stands whatever the jitter rolls, crowned, ONE name, and
  // THE MOUTH ON THE ROW; THE PASS and THE TOLL SURVEY on the def;
  // the warded pit-takings box; no boldness and no actors (the bar
  // scene and the drover are the fenside zone's, R2).
  const bar = POI_DEFS.get('first_road_bar')!;
  assert.deepEqual(bar.tiers, [1, 3]);
  assert.equal(bar.family, 'brigand');
  assert.deepEqual(bar.prefabs, ['poi_first_road_bar']);
  assert.equal(bar.passFlag, 'charter_pass');
  assert.equal(bar.toll, true);
  assert.equal(bar.chestLoot, 'chest_pit_takings');
  assert.equal(bar.chestWarded, true);
  assert.equal(bar.chestTierBonus, 1);
  assert.equal(bar.clearedFlag, 'poi_first_bar_broken');
  assert.equal(bar.boldness, undefined, 'authored cells never stage');
  assert.equal(bar.actors, undefined, 'Brede rides the row; the drover is the zone\'s');
  assert.equal(bar.haven, undefined);
  assert.equal(bar.garrison.length, 4, 'a crew of five, not a warband');
  const brede = bar.garrison.find((g) => g.npc === 'brigand_reaver')!;
  assert.ok(brede, 'the reaver row is missing');
  assert.deepEqual(brede.names, ['Brede']);
  assert.equal(brede.crowned, true);
  assert.equal(brede.actor, 'company_brede');
  assert.equal(brede.minTier, 1, 'Brede stands whatever the jitter says');
  assert.equal(brede.role, 'holdfast');
  assert.deepEqual(brede.count, [1, 1]);
  assert.ok(bar.garrison.filter((g) => g.role === 'sentry').length === 2, 'the post line: an archer and a picket');
  // THE POST IS NAMED, for the ring (fix pass 1): both sentries stand
  // named cells at the post line either side of the warden's gap (the
  // archer on the south shoulder facing north, the picket on the
  // north shoulder facing south), so the pass is read on the road and
  // not twenty rows from it; neither walks a round.
  const archer = bar.garrison.find((g) => g.npc === 'brigand_archer')!;
  assert.deepEqual(archer.at, { dx: 13, dy: -11, dir: 'N' });
  assert.equal(archer.patrol, undefined, 'a posted body stands; the round was the ring\'s');
  const picket = bar.garrison.find((g) => g.role === 'sentry' && g.npc === 'brigand')!;
  assert.deepEqual(picket.at, { dx: 13, dy: -16, dir: 'S' });
  assert.equal(picket.minTier, 1);
  // Hale stands at the First Lamp and nowhere a rolled outpost could
  // mint him twice.
  const outpost = POI_DEFS.get('wardens_outpost')!;
  assert.ok(!outpost.actors!.some((a) => a.pool.includes('waykeeper_hale')), 'Hale is still in the outpost pool');
  assert.ok(outpost.actors!.some((a) => a.pool.includes('waykeeper_sergeant')), 'the name-free sergeant is missing');
  assert.ok(POI_DEFS.get('fenside_lamp')!.actors!.some((a) => a.pool.includes('waykeeper_hale') && a.post === 'watch'));
  // Torsten and the sentinels stand at the fork; the Returners and
  // Aske keep the Third Stone (no Wayward Watch there).
  const fork = POI_DEFS.get('fork_waystation')!;
  assert.ok(fork.actors!.some((a) => a.pool.includes('waykeeper_torsten')));
  assert.equal(fork.actors!.filter((a) => a.pool.includes('even_sentinel')).length, 2);
  const third = POI_DEFS.get('third_stone_rest')!;
  assert.ok(!third.actors!.some((a) => a.pool.includes('wayward_watch')));
  assert.ok(third.actors!.some((a) => a.pool.includes('returner_eskil')));
  assert.equal(third.actors!.filter((a) => a.pool.includes('returner_pool')).length, 2);
});

test('THE POST IS NAMED, for the ring: a sentry row\'s `at` is carried, and the validator refuses it on a holdfast, with a patrol, on a squad, or on a solid sketch cell', () => {
  const base = {
    id: 'test_named_sentry',
    name: 'Test named sentry',
    tiers: [1, 3],
    weight: 0,
    prefabs: ['poi_first_road_bar'],
  };
  const ok = validatePoiDef({
    ...base,
    garrison: [
      { npc: 'brigand', count: [1, 1], role: 'holdfast' },
      { npc: 'brigand_archer', count: [1, 1], role: 'sentry', at: { dx: 13, dy: -11, dir: 'N' } },
    ],
  });
  assert.ok(ok.ok, JSON.stringify(ok));
  if (ok.ok) assert.deepEqual(ok.def.garrison[1]!.at, { dx: 13, dy: -11, dir: 'N' });
  const refuse = (row: Record<string, unknown>, needle: string): void => {
    const bad = validatePoiDef({ ...base, garrison: [row] });
    assert.ok(!bad.ok, `accepted ${JSON.stringify(row)}`);
    if (!bad.ok) assert.ok(bad.errors.some((e) => e.includes(needle)), `${needle}: ${bad.errors.join(' | ')}`);
  };
  refuse({ npc: 'brigand', count: [1, 1], role: 'holdfast', at: { dx: 0, dy: -3 } }, 'at is a sentry trait');
  refuse({ npc: 'brigand_archer', count: [1, 1], role: 'sentry', patrol: true, at: { dx: 0, dy: -3 } }, 'at and patrol cannot both stand');
  refuse({ npc: 'brigand', count: [1, 2], role: 'sentry', at: { dx: 0, dy: -3 } }, 'at posts one body');
  refuse({ npc: 'brigand', count: [1, 1], role: 'sentry', at: { dx: 0, dy: 99 } }, 'out of shouting distance');
  // A cell inside the sketch must be open: the bar's fire is solid.
  const camp = POI_PREFABS.get('poi_first_road_bar')!;
  let fire = -1;
  for (let i = 0; i < camp.ground.length; i++) if (camp.ground[i] === Tile.Campfire) { fire = i; break; }
  assert.ok(fire >= 0);
  refuse({ npc: 'brigand', count: [1, 1], role: 'sentry', at: { dx: fire % camp.width, dy: Math.floor(fire / camp.width) } }, 'is solid tile');
  refuse({ npc: 'brigand', count: [1, 1], role: 'sentry', at: { dx: 1.5, dy: 0 } }, 'at must be');
});

test('THE WILD TAKES SIDES: the validator carries tribe (it used to eat it)', () => {
  const ok = validatePoiDef({
    id: 'test_tribe',
    name: 'Test tribe',
    tiers: [2, 4],
    weight: 0,
    prefabs: ['poi_watchtower_husk'],
    garrison: [
      { npc: 'gnoll', count: [2, 2], role: 'holdfast', tribe: 'gnoll', hours: { from: 5.5, to: 20.5 } },
      { npc: 'skeleton', count: [2, 2], role: 'holdfast', tribe: 'dead', hours: { from: 20.5, to: 5.5 } },
    ],
  });
  assert.ok(ok.ok, JSON.stringify(ok));
  if (ok.ok) {
    assert.equal(ok.def.garrison[0]!.tribe, 'gnoll');
    assert.equal(ok.def.garrison[1]!.tribe, 'dead');
  }
  const bad = validatePoiDef({
    id: 'test_tribe',
    name: 'Test tribe',
    tiers: [2, 4],
    weight: 0,
    prefabs: ['poi_watchtower_husk'],
    garrison: [{ npc: 'gnoll', count: [1, 1], role: 'holdfast', tribe: 'Not A Slug' }],
  });
  assert.ok(!bad.ok);
  if (!bad.ok) assert.ok(bad.errors.some((e) => e.includes('tribe must be a lowercase slug')));
  // The shipped rows keep theirs through the registry.
  const husk = POI_DEFS.get('husk_of_the_line')!;
  const gnolls = husk.garrison.filter((g) => g.tribe === 'gnoll');
  const dead = husk.garrison.filter((g) => g.tribe === 'dead');
  assert.ok(gnolls.length >= 3 && dead.length >= 3, 'the husk lost a people');
  assert.equal(husk.garrison.length, gnolls.length + dead.length, 'every husk row wears a tribe');
  // Day and night: the windows are complementary — the gnolls hold
  // 05:30-20:30, the line 20:30-05:30, and the changeover is the
  // fight (plan §3.2).
  for (const g of gnolls) assert.deepEqual(g.hours, { from: 5.5, to: 20.5 }, `${g.npc}: gnoll hours`);
  for (const g of dead) assert.deepEqual(g.hours, { from: 20.5, to: 5.5 }, `${g.npc}: dead hours`);
  // Both crowns wear the plan's names.
  assert.ok(gnolls.some((g) => g.crowned && g.names?.[0] === 'Old Cackle'));
  assert.ok(dead.some((g) => g.crowned && g.names?.[0] === 'the Struck Sergeant'));
  // The Doorless: a tribe on the goblin family, never a family.
  const barrow = POI_DEFS.get('broken_barrow')!;
  assert.ok(barrow.garrison.some((g) => g.tribe === 'goblin_doorless' && g.crowned && g.names?.[0] === 'Grubb Turnsoil'));
  assert.ok(barrow.garrison.filter((g) => g.tribe === 'dead').every((g) => g.hours?.from === 20.5));
  assert.equal(barrow.family, 'dead');
  // Aske's crew: neutral Company bodies on the watch ring, never a
  // hostile garrison at a haven (a haven does not gate a garrison's
  // aggro, and a garrison would make the Third Stone poiThreatens).
  const third = POI_DEFS.get('third_stone_rest')!;
  assert.deepEqual(third.garrison, []);
  assert.equal(third.actors!.filter((a) => a.pool.includes('company_blade') && a.post === 'watch').length, 3);
  assert.ok(third.actors!.some((a) => a.pool.includes('company_aske')));
  // Harguk stands crowned at the Legion.
  assert.ok(POI_DEFS.get('hobgoblin_legion')!.garrison.some((g) => g.crowned && g.names?.[0] === 'Harguk Fiveblows' && g.tribe === 'legion'));
  // The Felling: worgs wear tribe goblin (so the veil's wolves fight
  // them), a firecaller stands, and the Doorless cut snags at night.
  const drum = POI_DEFS.get('felling_drum')!;
  assert.ok(drum.garrison.filter((g) => g.npc === 'worg').every((g) => g.tribe === 'goblin'));
  assert.ok(drum.garrison.some((g) => g.npc === 'goblin_firecaller'));
  assert.ok(drum.garrison.some((g) => g.tribe === 'goblin_doorless' && g.hours?.from === 20 && g.hours?.to === 6 && g.count[1] === 2));
  const day = drum.garrison.filter((g) => !g.hours).reduce((n, g) => n + g.count[1], 0);
  assert.equal(day, 8, 'the Drum musters eight by day (the perf budget)');
});

test("THE RIVAL'S REACH: legion_pressed is registered and dealt by nobody in band 0", () => {
  const drum = POI_DEFS.get('felling_drum')!;
  assert.equal(drum.boldness?.satellites, true);
  // A cell-forced site is in authoredCells: it never stages up and
  // never deals a satellite (§1 law 2), so a rivalDef on it is dead.
  // §13.2 deals the pressed camp from the ROLLED Drum (goblin_warcamp)
  // — a world-wide change that waits on the owner's word (band 8).
  assert.equal(drum.boldness?.rivalDef, undefined, 'no dead rivalDef on an authored cell');
  assert.equal(POI_DEFS.get('goblin_warcamp')!.boldness?.rivalDef, undefined, 'the rolled Drum is unwired until the owner rules');
  assert.equal(drum.boldness?.stages.length, 3, 'the Drum keeps the warcamp ladder');
  const pressed = POI_DEFS.get('legion_pressed')!;
  assert.equal(pressed.weight, 0);
  assert.equal(pressed.family, 'goblin');
  assert.ok(pressed.garrison.every((g) => g.tribe === 'legion'));
  assert.ok(pressed.cues?.scatter?.some((s) => s.tile === 'LegionStandard'));
  // The Legion core carries no ladder: authored cells deal no
  // satellites and its reach is an authored loop.
  assert.equal(POI_DEFS.get('hobgoblin_legion')!.boldness, undefined);
  // A rival with no arm is refused.
  const noArm = validatePoiDef({
    id: 'test_rival',
    name: 'Test rival',
    tiers: [1, 3],
    weight: 0,
    prefabs: ['poi_goblin_camp_ring'],
    garrison: [{ npc: 'goblin', count: [1, 2], role: 'holdfast' }],
    boldness: { stages: [{ garrison: [{ npc: 'goblin', count: [1, 1], role: 'holdfast' }] }], rivalDef: 'legion_pressed' },
  });
  assert.ok(!noArm.ok);
  if (!noArm.ok) assert.ok(noArm.errors.some((e) => e.includes('rivalDef')));
});

test('THE CONTESTED SKETCHES: the staged sites read as the plan drew them', () => {
  const count = (p: PrefabDef, t: Tile): number => {
    let n = 0;
    for (const g of p.ground) if (g === t) n++;
    return n;
  };
  // The Fenside Lamp (re-dressed in band 7, R7 + R8): rows under water
  // with the scarecrow and the channel standing in them, the sluice on
  // two posts (one strung) plus the empty berth's pair, pallets on
  // stilts with the green corn on them, the crofters' dugout and the
  // shoal's taken one, ONE lamp at the gate with its bench, milestone,
  // oil, canvas and chalk post, the weir at the south water edge, five
  // beds (two cabins and Ingram's cot), ONE board.
  const fen = POI_PREFABS.get('poi_fenside_lamp')!;
  assert.ok(fen, 'poi_fenside_lamp missing');
  // The MEASURED cap: the sketch is its own footprint (24x16, no
  // verge), because the channel's east bank at the ford holds no wider
  // stamp within the pin's nudge (prefabs.ts, the declaration's note).
  assert.equal(fen.width, 24, 'the crofts grew a verge the bank cannot hold');
  assert.equal(fen.height, 16, 'the crofts grew a verge the bank cannot hold');
  // THE CLEARING SOUTH (fix pass 1): the forest's crowns reach seven
  // rows north of their trunks, so the felled ring runs seven past the
  // footprint and the weir's shelter and the skral beside it stand
  // clear; the road shoulder north reads as rock to the cue and keeps
  // its oaks.
  assert.equal(POI_DEFS.get('fenside_lamp')!.cues?.clearing, 7);
  assert.ok(count(fen, Tile.WaterShallow) >= 20, 'the rows are not drowned');
  assert.equal(count(fen, Tile.Scarecrow), 1);
  assert.equal(count(fen, Tile.IrrigationChannel), 1);
  assert.equal(count(fen, Tile.SluiceGate), 1);
  assert.equal(count(fen, Tile.SluiceGateStrung), 1);
  assert.ok(count(fen, Tile.TimberPost) >= 4, 'the sluice pair and the empty berth');
  assert.ok(count(fen, Tile.PorchDeck) >= 4, 'the pallets on stilts');
  assert.equal(count(fen, Tile.HayBale), 2, 'the green corn on the boards (fix pass 1: porchCarries lifts a HayBale now)');
  assert.equal(count(fen, Tile.CrateGoods), 0, 'no crate on the pallets: the corn reads as corn');
  // The bales stand between deck rows so the boards run beneath them.
  const cell = (x: number, y: number): number => fen.ground[y * fen.width + x]!;
  for (const [x, y] of [[6, 5], [7, 5]] as const) {
    assert.equal(cell(x, y), Tile.HayBale);
    assert.ok(cell(x, y - 1) === Tile.PorchDeck && cell(x, y + 1) === Tile.PorchDeck, `the bale at (${x},${y}) rides the pallet`);
  }
  // THE EMPTY BERTH (fix pass 1): the two posts stand abreast in the
  // shallows with one tile of open water between them, and nothing
  // stands in the column above or below to fuse with them.
  assert.equal(cell(2, 6), Tile.TimberPost);
  assert.equal(cell(4, 6), Tile.TimberPost);
  assert.equal(cell(3, 6), Tile.WaterShallow, 'the water between the posts is the whole sentence');
  assert.equal(cell(4, 8), Tile.WaterShallow, 'no third post below the berth');
  assert.equal(count(fen, Tile.Dugout), 2, "the crofters' own and the shoal's taken one");
  assert.equal(count(fen, Tile.LampPost), 1, "Hale's lamp, and only his");
  assert.equal(count(fen, Tile.Tilled), 0, 'no dry rows — the field is the water');
  assert.ok(fen.spawns.every((s) => s.npc === 'chicken'), 'hens only');
  // The weir (R8): three panels across the water, the cut keep-pool,
  // the felled log where the axe was laid, the totem and the shelter.
  assert.equal(count(fen, Tile.WeirPanels), 3);
  assert.equal(count(fen, Tile.KeepPool), 1);
  assert.equal(count(fen, Tile.FelledLog), 1);
  assert.equal(count(fen, Tile.TideTotem), 1);
  assert.equal(count(fen, Tile.ReedShelter), 1);
  // The First Lamp's furniture: the bench, the milestone (the verge
  // may litter a second rock; the sketch's own is one), the oil, the
  // canvas, and the one board.
  assert.equal(count(fen, Tile.StoneBench), 1);
  assert.ok(count(fen, Tile.Rock) >= 1, 'the milestone');
  assert.equal(count(fen, Tile.BarrelStack), 1, 'the tithed oil');
  assert.equal(count(fen, Tile.LeanTo), 1, "the watch's canvas");
  assert.ok(count(fen, Tile.Bed) >= 5, "two cabins' beds and Ingram's cot");
  assert.equal(count(fen, Tile.Signpost), 1, 'one board per eyeful (J16)');
  assert.equal(count(fen, Tile.HangingSign), 0, 'the shingle retired with its two boards');
  assert.equal(count(fen, Tile.Campfire), 1, 'the fire at the heart, small on purpose');
  // The Ashlamp is no sketch any more (band 7, R1): the scar is an
  // authored zone (`maps/ashlamp/`, its own test) and `poi_ashlamp`
  // retired with the def.
  assert.equal(POI_PREFABS.get('poi_ashlamp'), undefined, 'poi_ashlamp retired into the ashlamp zone');
  assert.equal(POI_DEFS.get('ashlamp'), undefined, 'the ashlamp def retired into the ashlamp zone');
  // BREDE'S CAMP (band 7, R4; blockout §2.6): the toll's honest
  // smaller variant — the track, the fire, the banner pair and the
  // torch at the mouth, the pickets and the archer, the warded box and
  // the drover's wain, the bones, ONE red rag toward the ford; and
  // NONE of the bar scene (that is the fenside zone's, R2). Cap 22: a
  // toll bar hugs a road bend, so the shelf stands no wider than the
  // rolled toll's.
  const camp = POI_PREFABS.get('poi_first_road_bar')!;
  assert.ok(camp, 'poi_first_road_bar missing');
  assert.ok(camp.width <= 22 && camp.height <= 22, `cap 22 (got ${camp.width}x${camp.height})`);
  assert.equal(count(camp, Tile.Campfire), 1, 'one fire at the anchor');
  assert.equal(count(camp, Tile.WarBanner), 2, 'the banner pair flanking the track');
  assert.equal(count(camp, Tile.StandingTorch), 1, 'the torch at the mouth');
  assert.equal(count(camp, Tile.ChestIron), 1, 'the warded box');
  assert.equal(count(camp, Tile.PlunderCart), 1, "the drover's wain");
  assert.equal(count(camp, Tile.BonePile), 1);
  assert.equal(count(camp, Tile.RedRagStake), 1, 'one red rag, at the north-east corner');
  assert.equal(count(camp, Tile.WarTable), 0, "the counter is the zone's");
  assert.equal(count(camp, Tile.NoticeBoard), 0, "the receipts are the zone's");
  assert.equal(count(camp, Tile.PrisonCage), 0, "the cage is the zone's");
  assert.equal(count(camp, Tile.SpikeBarrier), 0, "the teeth are the zone's");
  assert.equal(count(camp, Tile.TrophyStake), 0, "Brede's stake stands at the Ashlamp");
  // The crew is the DEF's: a sketch's digit markers add bodies on top
  // of the garrison (server composePoi's hand-placed spawns), so the
  // bar's sketch places none — five rows, five bodies, not eight.
  assert.equal(camp.spawns.length, 0, 'the sketch musters nobody; the def\'s five rows are the crew');
  // The fork rest: one waystone, a thread of three, one grey stone.
  const fork = POI_PREFABS.get('poi_fork_waystation')!;
  assert.ok(fork, 'poi_fork_waystation missing');
  assert.equal(count(fork, Tile.ElvenWaystone), 1);
  assert.equal(count(fork, Tile.WardThread), 3);
  assert.equal(count(fork, Tile.GloomStone), 1);
  assert.equal(count(fork, Tile.WaterShallow), 0, "'~' is the thread here");
  // The Third Stone: a pit lamp on a stake and NEVER a lamp post, two
  // dark lamps on the approach, the cart, the ladder, the chest, the
  // shrine, two boards.
  const third = POI_PREFABS.get('poi_third_stone')!;
  assert.ok(third, 'poi_third_stone missing');
  assert.equal(count(third, Tile.LampPost), 0, 'the Returners light stakes, never posts');
  assert.equal(count(third, Tile.PitLamp), 1);
  assert.equal(count(third, Tile.PitLampDark), 2);
  assert.equal(count(third, Tile.TimberPost), 1);
  assert.equal(count(third, Tile.MineCart), 1);
  assert.equal(count(third, Tile.LeanLadder), 1);
  assert.equal(count(third, Tile.ChestWood), 1);
  assert.equal(count(third, Tile.WayShrine), 1);
  assert.equal(count(third, Tile.HangingSign), 2, 'the board and the board nailed over it');
  // The broken barrow: kerb, mounds, the cist's one cache, cairns
  // re-set wrong, crooked rows, the trough, the cage, three tents,
  // one campfire and no bonfire, the totem, the spoil ring, the flat
  // door (arch + posts, no lintel), sacks, the stake, hurdles — and
  // no palisade, no banner.
  const barrow = POI_PREFABS.get('poi_broken_barrow')!;
  assert.ok(barrow, 'poi_broken_barrow missing');
  assert.ok(count(barrow, Tile.Rock) >= 30, 'the kerb');
  assert.ok(count(barrow, Tile.GraveMound) >= 20, 'the mound');
  assert.equal(count(barrow, Tile.ChestIron), 1);
  assert.equal(count(barrow, Tile.FieldCairn), 2);
  assert.ok(count(barrow, Tile.Tilled) >= 20, 'the furrows');
  assert.equal(count(barrow, Tile.GnawTrough), 1);
  assert.equal(count(barrow, Tile.CritterCage), 1);
  assert.equal(count(barrow, Tile.TentHide), 3);
  assert.equal(count(barrow, Tile.Campfire), 1);
  assert.equal(count(barrow, Tile.Bonfire), 0, 'never a bonfire');
  assert.equal(count(barrow, Tile.SkullTotem), 1);
  assert.ok(count(barrow, Tile.SpoilHeap) >= 8, 'the spoil ring');
  assert.equal(count(barrow, Tile.ArchStone), 2);
  assert.equal(count(barrow, Tile.TimberPost), 2);
  assert.equal(count(barrow, Tile.GrainSacks), 3);
  assert.equal(count(barrow, Tile.BeastStake), 1);
  assert.ok(count(barrow, Tile.Fence) >= 5, 'salvaged hurdles');
  assert.equal(count(barrow, Tile.Palisade), 0);
  assert.equal(count(barrow, Tile.WarBanner), 0);
  assert.equal(count(barrow, Tile.BannerPole), 0);
  assert.equal(count(barrow, Tile.HangingSign), 1);
  // THE CHARTER'S CHAIN is part of the barrow (band 0, owner's
  // ruling): eight survey stakes in ONE ruled line, the lectern and
  // the tally board under canvas at the line's east end.
  assert.equal(count(barrow, Tile.CharterPost), 8, 'the survey stakes');
  assert.equal(count(barrow, Tile.Lectern), 1, 'the chart-table');
  assert.equal(count(barrow, Tile.NoticeBoard), 1, 'the tally board');
  assert.ok(count(barrow, Tile.AwningShed) >= 3, 'the canvas over the east end');
  const stakeRows = new Set<number>();
  let stakeMaxX = -1;
  let lecternX = -1;
  let boardX = -1;
  for (let i = 0; i < barrow.ground.length; i++) {
    const x = i % barrow.width;
    const y = Math.floor(i / barrow.width);
    if (barrow.ground[i] === Tile.CharterPost) { stakeRows.add(y); stakeMaxX = Math.max(stakeMaxX, x); }
    if (barrow.ground[i] === Tile.Lectern) lecternX = x;
    if (barrow.ground[i] === Tile.NoticeBoard) boardX = x;
  }
  assert.equal(stakeRows.size, 1, 'the stakes are ruled in one straight line');
  assert.ok(lecternX > stakeMaxX - 5 && boardX > stakeMaxX - 5, 'the table and the board stand at the line\'s east end');
  // The totem stands on the farm's WEST edge (x < the first furrow),
  // facing away from the village.
  let totemX = -1;
  let furrowMinX = Infinity;
  for (let i = 0; i < barrow.ground.length; i++) {
    const x = i % barrow.width;
    if (barrow.ground[i] === Tile.SkullTotem) totemX = x;
    if (barrow.ground[i] === Tile.Tilled) furrowMinX = Math.min(furrowMinX, x);
  }
  assert.ok(totemX >= 0 && totemX < furrowMinX, `the totem (x=${totemX}) faces west of the rows (x=${furrowMinX})`);
});

test('THE CONTENT BOUNDARY: the contested defs keep the palette', () => {
  const banned = /\b(witch|witches|witchcraft|hex|hexes|coven|warlock|demon|demons|devil|devils|infernal|occult|hell)\b/i;
  for (const id of CONTESTED_DEFS) {
    const text = JSON.stringify(POI_DEFS.get(id));
    const hit = text.match(banned);
    assert.equal(hit, null, `${id}: '${hit?.[0]}' is outside the content boundary`);
  }
});

// ---- THE MARKS (docs/contested-lands-plan.md §2, §6 family E, K2):
// five peoples finally have a glyph — and every glyph stands on its
// own people's ground and nobody else's.
test('THE MARKS: every scatter name is a Tile, and each claim mark lands on its own people', () => {
  // The claim marks by people (plan §2's Mark column), and the defs
  // each may stand on. A mark on any other def is a lie about whose
  // ground it is — the whole point of the kit.
  const MARK_HOME: Record<string, ReadonlySet<string>> = {
    LegionStandard: new Set(['hobgoblin_warcamp', 'hobgoblin_legion', 'legion_pressed']),
    BoneTree: new Set(['wolfkin_den', 'wolfkin_greatden']),
    TallyStone: new Set(['kobold_digs']),
    RedRagStake: new Set(['road_toll', 'bandit_camp', 'company_tollhouse', 'first_road_bar']),
    LampCairn: new Set(['fork_waystation']),
    WardThread: new Set(['fork_waystation']),
    PitLampDark: new Set(['broken_barrow']),
    CharterPost: new Set<string>(),
    SkullTotem: new Set<string>(),
  };
  // Every def that MUST fly its people's mark BY CUE on the approach:
  // the wing-capped pools whose one-tile verge plants nothing from
  // the shelf, and the pressed satellite's borrowed standard.
  const MUST_FLY: ReadonlyArray<[string, string[]]> = [
    ['legion_pressed', ['LegionStandard']],
    ['wolfkin_den', ['BoneTree']],
    ['wolfkin_greatden', ['BoneTree']],
    ['road_toll', ['RedRagStake']],
    ['bandit_camp', ['RedRagStake']],
  ];
  // Every def whose mark STANDS in every prefab it rolls — planted by
  // the shelf's influence verge or authored in the sketch — and so
  // flies no cue for it (THE MARK STANDS WHERE IT IS AUTHORED: the cue
  // placer lands only on bare grass along the approach cone and the K2
  // census lost the fork's cairns, the barrow's dark lamp and the toll's
  // stake to canopy; a cue on top of a standing mark also doubled the
  // shelf's two into three and four).
  const MUST_STAND: ReadonlyArray<[string, string]> = [
    ['hobgoblin_warcamp', 'LegionStandard'],
    ['hobgoblin_legion', 'LegionStandard'],
    ['kobold_digs', 'TallyStone'],
    ['company_tollhouse', 'RedRagStake'],
    ['fork_waystation', 'LampCairn'],
    ['fork_waystation', 'WardThread'],
    ['broken_barrow', 'PitLampDark'],
    ['road_toll', 'RedRagStake'],
    // Brede's camp (band 7): the one red rag at its north-east corner
    // is the sketch's own, toward the ford — no cue.
    ['first_road_bar', 'RedRagStake'],
  ];
  const countIn = (p: PrefabDef, t: Tile): number => p.ground.reduce((n, v) => n + (v === t ? 1 : 0), 0);

  for (const def of POI_DEFS.values()) {
    const base = def.cues?.scatter ?? [];
    const rungs = def.boldness?.stages.flatMap((s) => s.scatter ?? []) ?? [];
    for (const row of [...base, ...rungs]) {
      assert.equal(typeof Tile[row.tile as keyof typeof Tile], 'number', `${def.id}: scatter '${row.tile}' is not a Tile`);
    }
    // The approach is a cue, not a dump: on the contested defs eight
    // tiles at most, and everywhere no more than two of any one mark
    // (a glyph, not a picket line). (greatkeep_ruin's ten-tile approach
    // predates the kit and is not this law's to trim.)
    const total = base.reduce((n, r) => n + r.count, 0);
    const contested = Object.values(MARK_HOME).some((home) => home.has(def.id));
    if (contested) assert.ok(total <= 8, `${def.id}: cues.scatter drops ${total} tiles on the approach (max 8)`);
    const byTile = new Map<string, number>();
    for (const r of base) byTile.set(r.tile, (byTile.get(r.tile) ?? 0) + r.count);
    for (const [tile, home] of Object.entries(MARK_HOME)) {
      const n = byTile.get(tile) ?? 0;
      assert.ok(n <= 2, `${def.id}: flies ${n} ${tile} on the approach (max 2 of any mark)`);
      if (n > 0) assert.ok(home.has(def.id), `${def.id}: flies ${tile} — not its people's ground`);
      for (const r of rungs) {
        assert.notEqual(r.tile, tile, `${def.id}: a boldness rung adds the ${tile} mark — marks are the base claim, never escalation`);
      }
    }
  }
  for (const [id, marks] of MUST_FLY) {
    const def = POI_DEFS.get(id);
    assert.ok(def, `${id} missing from the registry`);
    const names = new Set((def.cues?.scatter ?? []).map((r) => r.tile));
    for (const m of marks) assert.ok(names.has(m), `${id}: does not fly ${m} on the approach`);
  }
  for (const [id, mark] of MUST_STAND) {
    const def = POI_DEFS.get(id);
    assert.ok(def, `${id} missing from the registry`);
    const tile = Tile[mark as keyof typeof Tile] as Tile;
    for (const pid of def.prefabs) {
      const p = POI_PREFABS.get(pid);
      assert.ok(p, `${id}: prefab ${pid} missing from the shelf`);
      assert.ok(countIn(p, tile) >= 1, `${id}: ${pid} does not stand a ${mark} — the mark must stand where it is authored`);
    }
  }
  // THE SUM IS THE LAW: shelf plus cue never exceeds the two-per-
  // territory ceiling for any claim mark on any roll. (The ward thread
  // is a LINE by design — three tiles strung across the fork's stand —
  // not a glyph, so the ceiling does not count it.)
  for (const def of POI_DEFS.values()) {
    const cues = def.cues?.scatter ?? [];
    for (const [tile] of Object.entries(MARK_HOME)) {
      // Lines and older marks stand outside the glyph ceiling: the ward
      // thread and the Charter's chain are LINES by design, and the
      // goblin skull totem predates the kit (a mootfield rings four).
      if (tile === 'WardThread' || tile === 'CharterPost' || tile === 'SkullTotem') continue;
      const t = Tile[tile as keyof typeof Tile] as Tile;
      const cue = cues.filter((r) => r.tile === tile).reduce((n, r) => n + r.count, 0);
      for (const pid of def.prefabs) {
        const p = POI_PREFABS.get(pid);
        if (!p) continue;
        const standing = countIn(p, t);
        assert.ok(
          standing + cue <= CLAIM_MARKS_MAX,
          `${def.id}/${pid}: ${standing} ${tile} standing + ${cue} by cue = ${standing + cue} (max ${CLAIM_MARKS_MAX} per territory)`,
        );
      }
    }
  }
  // The pressed satellite stands under ONE standard by canon (plan
  // §3.5): the Legion's reach, not a second Legion.
  const pressed = POI_DEFS.get('legion_pressed')!;
  assert.equal(pressed.cues?.scatter?.find((r) => r.tile === 'LegionStandard')?.count, 1, 'legion_pressed must fly exactly one standard');
});

test('THE MARKS: influence plants each people\'s claim at the trailheads, and the road gate holds', () => {
  const mk = (id: string): PrefabDef => {
    const w = 11;
    const h = 9;
    const ground = new Uint16Array(w * h).fill(TILE_SKIP);
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) ground[y * w + x] = Tile.Dirt;
    return { id, name: id, width: w, height: h, ground, detail: new Uint16Array(w * h), elev: new Int8Array(w * h), portals: [], spawns: [], actorSpawns: [] };
  };
  const count = (p: PrefabDef, t: Tile): number => p.ground.reduce((n, v) => n + (v === t ? 1 : 0), 0);
  /** Is this cell one the heart AUTHORED (an opaque tile of the source sketch, translated)? */
  const heartOf = (p: PrefabDef, src: PrefabDef) => {
    const hx0 = Math.floor((p.width - src.width) / 2);
    const hy0 = Math.floor((p.height - src.height) / 2);
    return (x: number, y: number) => {
      const lx = x - hx0;
      const ly = y - hy0;
      if (lx < 0 || ly < 0 || lx >= src.width || ly >= src.height) return false;
      return src.ground[ly * src.width + lx] !== TILE_SKIP;
    };
  };
  /** Every mark stands OFF the authored heart and touches worked ground — a track or a patch (the trailhead law). */
  const marksStandAtTrailheads = (p: PrefabDef, src: PrefabDef, mark: Tile): number => {
    const inHeart = heartOf(p, src);
    let n = 0;
    for (let i = 0; i < p.ground.length; i++) {
      if (p.ground[i] !== mark) continue;
      const x = i % p.width;
      const y = Math.floor(i / p.width);
      assert.ok(!inHeart(x, y), `${p.id}: mark inside the heart at ${x},${y}`);
      let touchesTrack = false;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const t = p.ground[(y + dy) * p.width + (x + dx)];
          if ((dx || dy) && (t === Tile.Dirt || t === Tile.Grass || t === Tile.GrassTall)) touchesTrack = true;
        }
      }
      assert.ok(touchesTrack, `${p.id}: mark at ${x},${y} stands off the worked ground`);
      n++;
    }
    return n;
  };

  // Each people's mark, one or two, at the trailheads.
  for (const [vocab, mark] of [
    ['plunder', Tile.RedRagStake],
    ['den', Tile.BoneTree],
    ['digs', Tile.TallyStone],
    ['warband', Tile.SkullTotem],
    ['legion', Tile.LegionStandard],
    ['gnoll', Tile.BoneMidden],
    ['skral', Tile.TideTotem],
  ] as const) {
    const src = mk(`poi_test_mark_${vocab}`);
    const p = expandInfluence(declareInfluence(src, { vocab }));
    const n = marksStandAtTrailheads(p, src, mark);
    assert.ok(n >= 1 && n <= 2, `${vocab}: planted ${n} marks (want 1..2)`);
  }

  // The dead, the wild and the gloom claim nothing.
  const MARKS = [Tile.CharterPost, Tile.LampCairn, Tile.LegionStandard, Tile.BoneTree, Tile.TallyStone, Tile.WardThread, Tile.RedRagStake, Tile.SkullTotem, Tile.BoneMidden, Tile.TideTotem];
  for (const vocab of ['oldstone', 'lair', 'roost', 'blight', 'ruin', 'ogre', 'wild', 'wayside'] as const) {
    const p = expandInfluence(declareInfluence(mk(`poi_test_nomark_${vocab}`), { vocab }));
    for (const m of MARKS) assert.equal(count(p, m), 0, `${vocab}: flies ${Tile[m]} — this people claims nothing`);
  }
  // An id no family owns is WILD: the same verge, no claim on it.
  const stray = expandInfluence(mk('poi_test_stray_unowned'));
  assert.ok(count(stray, Tile.BerryBush) + count(stray, Tile.Rock) > 0, 'the wild verge went empty');
  for (const m of MARKS) assert.equal(count(stray, m), 0, `an unowned id inherited ${Tile[m]}`);

  // THE ROAD GATE: the settled road flies the Charter's stake off-road
  // and the Waykeepers' lamp cairn only when a road is PROVEN under it.
  // ONE source, expanded twice with only the road proof toggled — the
  // same id is the same RNG stream, so the mark is the ONLY difference.
  const settled = declareInfluence(mk('poi_test_neutral_road_gate'), { vocab: 'neutral' });
  const off = expandInfluence(settled);
  assert.ok(marksStandAtTrailheads(off, settled, Tile.CharterPost) >= 1, 'off-road: no charter post');
  assert.equal(count(off, Tile.LampCairn), 0, 'off-road: a lamp cairn with no road under it (the road-faith law)');
  const on = expandInfluence(settled, { nearRoad: true });
  assert.ok(marksStandAtTrailheads(on, settled, Tile.LampCairn) >= 1, 'near a road: no lamp cairn');
  assert.equal(count(on, Tile.CharterPost), 0, 'near a road: the lamp cairn should have taken the charter post\'s place');
  // The mark is the ONLY difference between the two: litter, pockets
  // and tracks roll identically (the marks spend no rolls of their own).
  assert.equal(on.width, off.width);
  for (let i = 0; i < on.ground.length; i++) {
    const a = on.ground[i]!;
    const b = off.ground[i]!;
    if (a === b) continue;
    assert.ok((a === Tile.LampCairn && b === Tile.CharterPost), `road gate changed a non-mark tile at ${i}: ${Tile[a]} vs ${Tile[b]}`);
  }
  // THE WAYSIDE is the road's ground: the cairn where a road is proven,
  // NOTHING otherwise — never the Charter's stake (plan §2: the order
  // refuses Charter oil because it comes with a ledger).
  const waySrc = mk('poi_test_wayside_onroad');
  const way = expandInfluence(declareInfluence(waySrc, { vocab: 'wayside' }), { nearRoad: true });
  assert.ok(marksStandAtTrailheads(way, waySrc, Tile.LampCairn) >= 1, 'wayside near a road: no lamp cairn');
  assert.equal(count(way, Tile.CharterPost), 0, 'wayside: a Charter stake on the road\'s own ground');
  assert.equal(claimMarkOf('wayside', false), undefined, 'wayside off-road must claim nothing');
  assert.equal(claimMarkOf('wayside', true), Tile.LampCairn);
  assert.equal(claimMarkOf('neutral', false), Tile.CharterPost);
  assert.equal(claimMarkOf('neutral', true), Tile.LampCairn);
  // The family read: hamlets are the Charter's, the rests are the
  // road's, the shrines are nobody's stake, the unowned are wild.
  assert.equal(familyVocabOf('poi_hamlet_croft'), 'neutral');
  assert.equal(familyVocabOf('poi_waystation_camp'), 'wayside');
  assert.equal(familyVocabOf('poi_peddler_rest'), 'wayside');
  assert.equal(familyVocabOf('poi_wayshrine_stones'), 'wild');
  assert.equal(familyVocabOf('poi_hob_muster'), 'legion');
  assert.equal(familyVocabOf('poi_company_tollhouse'), 'plunder');
  assert.equal(familyVocabOf('poi_burnt_steading'), 'ruin');
  assert.equal(familyVocabOf('poi_broken_barrow'), 'wild');

  // THE RUIN and THE BLIGHT vocabs (K3/K4 THE VOCAB): ash, timber and
  // the fight's litter for a burning; the gloom keyed to its OWN ids —
  // and never the neutral hedgerow, never a living campfire.
  const ruin = expandInfluence(declareInfluence(mk('poi_test_vocab_ruin'), { vocab: 'ruin' }));
  assert.ok(count(ruin, Tile.AshHeap) + count(ruin, Tile.CharredBeam) > 0, 'ruin: no ash or timber on the verge');
  assert.ok(count(ruin, Tile.FieldLitter) > 0, 'ruin: the fight at the door left no litter (K3 joins the roll)');
  assert.equal(count(ruin, Tile.BerryBush), 0, 'ruin: the neutral hedgerow leaked in');
  assert.equal(count(ruin, Tile.Campfire), 0, 'ruin: a living campfire on a burnt verge');
  const blight = expandInfluence(declareInfluence(mk('poi_test_vocab_blight'), { vocab: 'blight' }));
  assert.ok(count(blight, Tile.GloomStone) + count(blight, Tile.CreepRoot) > 0, 'blight: the gloom is not keyed to its own ids');
  assert.equal(count(blight, Tile.Stump), 0, 'blight: a cut stump is a feller\'s word, not the gloom\'s');
  assert.equal(count(blight, Tile.BonePile), 0, 'blight: bones are the den\'s word, not the gloom\'s');
  // Sick water and a dead crop are PLACED by the hand that drained the
  // pond and tilled the field — never rolled as litter on any verge.
  for (const placed of [Tile.FoulPool, Tile.CropBlighted]) {
    assert.equal(count(ruin, placed) + count(blight, placed), 0, `${Tile[placed]} is placed, never rolled`);
  }
  // THE DIGS: the spoil heap joins the rubble (K4, family C).
  const digs = expandInfluence(declareInfluence(mk('poi_test_vocab_digs'), { vocab: 'digs' }));
  assert.ok(count(digs, Tile.SpoilHeap) > 0, 'digs: the verge is not what they threw out of the ground');
  // THE FIELD and THE DISPLACED (K3, families B and F): the fight's
  // leavings, and the runners' — neither with a mark, neither with the
  // wild's berry hedge; the displaced cook on an ember bed, never a
  // campfire.
  const field = expandInfluence(declareInfluence(mk('poi_test_vocab_field'), { vocab: 'field' }));
  assert.ok(count(field, Tile.FieldLitter) > 0, 'field: no litter on the verge');
  assert.equal(count(field, Tile.BerryBush), 0, 'field: the hedgerow round a battlefield');
  assert.equal(count(field, Tile.Campfire) + count(field, Tile.EmberBed), 0, 'field: nobody stayed to light a fire');
  const displaced = expandInfluence(declareInfluence(mk('poi_test_vocab_displaced'), { vocab: 'displaced' }));
  assert.ok(count(displaced, Tile.Crate) + count(displaced, Tile.Bedroll) + count(displaced, Tile.Barrel) > 0, 'displaced: nothing set down on the verge');
  assert.equal(count(displaced, Tile.Campfire), 0, 'displaced: a campfire — the plan says ember bed, never');
  assert.equal(count(displaced, Tile.BerryBush), 0, 'displaced: the hedgerow');
  for (const v of [field, displaced, blight]) {
    for (const m of MARKS) assert.equal(count(v, m), 0, `${v.id}: the dead, the displaced and the gloom claim nothing (${Tile[m]})`);
  }
  assert.equal(familyVocabOf('poi_field_after'), 'field');
  assert.equal(familyVocabOf('poi_muster_ground'), 'displaced');

  // THE SHELF: the family read reaches the shipped prefabs — the
  // Legion's yards fly the square, the digs the tally, the Company's
  // ground the rag, the settled hamlets the stake, the husk warband
  // the midden, the Drum's stockade the totem; the burnt steading
  // litters ash; and the lamp havens fly NOTHING from the shelf (their
  // marks need a road or a Returner under them and ride their defs'
  // cues instead).
  for (const [id, mark] of [
    ['poi_hob_muster', Tile.LegionStandard],
    ['poi_hob_watch', Tile.LegionStandard],
    ['poi_hob_forgecamp', Tile.LegionStandard],
    ['poi_digs_pit', Tile.TallyStone],
    ['poi_digs_mouth', Tile.TallyStone],
    ['poi_company_tollhouse', Tile.RedRagStake],
    ['poi_raider_squat', Tile.RedRagStake],
    ['poi_wardline_cut', Tile.RedRagStake],
    ['poi_hamlet_croft', Tile.CharterPost],
    ['poi_hamlet_pair', Tile.CharterPost],
    ['poi_gnoll_squat', Tile.BoneMidden],
    ['poi_goblin_stockade', Tile.SkullTotem],
  ] as const) {
    const p = POI_PREFABS.get(id)!;
    assert.ok(p, `${id} missing from the shelf`);
    assert.ok(count(p, mark) >= 1 && count(p, mark) <= 2, `${id}: ${count(p, mark)} ${Tile[mark]} on the shelf (want 1..2)`);
  }
  // THE WING HAS NO VERGE: a WING_POOL_CAP territory (the dens, the
  // bandit hollow and toll) keeps a ring a tile or two wide — no track
  // is walked, so no trailhead, so no mark from the shelf. That is
  // honest (a stake in a one-tile ring would stand on the perimeter)
  // and the def's cues carry the glyph on the approach instead: for
  // every def of this lane the mark reaches the world one way or the
  // other, and the wing-capped ones by cue.
  const GLYPH_OF: ReadonlyArray<[string, Tile]> = [
    ['hobgoblin_warcamp', Tile.LegionStandard],
    ['hobgoblin_legion', Tile.LegionStandard],
    ['legion_pressed', Tile.LegionStandard],
    ['wolfkin_den', Tile.BoneTree],
    ['wolfkin_greatden', Tile.BoneTree],
    ['kobold_digs', Tile.TallyStone],
    ['road_toll', Tile.RedRagStake],
    ['bandit_camp', Tile.RedRagStake],
    ['company_tollhouse', Tile.RedRagStake],
    ['first_road_bar', Tile.RedRagStake],
  ];
  for (const [defId, mark] of GLYPH_OF) {
    const def = POI_DEFS.get(defId)!;
    const shelf = def.prefabs.some((pid) => count(POI_PREFABS.get(pid)!, mark) >= 1);
    const cue = (def.cues?.scatter ?? []).some((r) => r.tile === Tile[mark]);
    assert.ok(shelf || cue, `${defId}: ${Tile[mark]} reaches the world neither from the shelf nor the cues`);
    if (!shelf) assert.ok(cue, `${defId}: wing-capped pool plants no ${Tile[mark]} — the cues must carry it`);
  }
  for (const id of ['poi_den_bones', 'poi_den_hollow', 'poi_bandit_hollow', 'poi_bandit_toll', 'poi_first_road_bar']) {
    const p = POI_PREFABS.get(id)!;
    assert.ok(p.width <= 24 && p.height <= 24, `${id}: no longer wing-capped — the shelf should plant its mark now; move it up to the shelf list`);
  }
  assert.equal(count(POI_PREFABS.get('poi_hob_muster')!, Tile.BerryBush), 0, 'a Legion yard with a hedgerow round it');
  const steading = POI_PREFABS.get('poi_burnt_steading')!;
  assert.ok(count(steading, Tile.AshHeap) + count(steading, Tile.CharredBeam) > 0, 'the burnt steading litters no ash');
  for (const id of [
    'poi_third_stone', 'poi_fork_waystation', 'poi_last_lamp', 'poi_fenside_lamp', 'poi_grove_spring',
    // The wayside and the shrines: the road's and the old faith's, no
    // stake from a shelf that cannot see the road.
    'poi_waystation_camp', 'poi_waystation_rest', 'poi_waystation_walled', 'poi_peddler_rest', 'poi_wayshrine_stones', 'poi_wayshrine_pool',
  ]) {
    const p = POI_PREFABS.get(id)!;
    assert.ok(p, `${id} missing from the shelf`);
    for (const m of MARKS) {
      // The fork rest's SKETCH strings the Even Court's thread across
      // its own waystone (authored heart art, plan §2's WardThread) and
      // stands the Waykeepers' cairn pair at its west mouth (the road-
      // faith law holds it: the def is weight 0 and every authored site
      // is road-proven below) — that is the sketch's word, not the
      // shelf's roll.
      if (id === 'poi_fork_waystation' && (m === Tile.WardThread || m === Tile.LampCairn)) continue;
      // The crofts' SKETCH stands the shoal's own tide totem at the
      // weir on the south water edge (band 7, R8: the shoal moved their
      // weir onto the crofters' reach, and the totem is theirs) — the
      // sketch's word, not the shelf's roll; the wild verge plants none.
      if (id === 'poi_fenside_lamp' && m === Tile.TideTotem) {
        assert.equal(count(p, m), 1, "the shoal's one totem at the weir");
        continue;
      }
      assert.equal(count(p, m), 0, `${id}: the shelf flies ${Tile[m]} on ground that is not the Charter's`);
    }
  }
});

// ---- THE ROAD-FAITH LAW on the cues (plan §6.1 row 527): a lamp cairn
// stands within trailReach of a road ONLY. The shelf cannot see the
// road, so the vocab's cairn rides `nearRoad`; a def's cues CAN fly it
// unconditionally — which is honest exactly when every site the def
// stands at is pinned beside a road. This holds each such def to it.
test('THE ROAD-FAITH LAW: every site whose cues or sketches fly LampCairn is pinned within trailReach of a road', () => {
  // A def flies the cairn by cue, or STANDS it in a sketch (the fork
  // rest's pair at its west mouth) — either way it promises a road.
  const stands = (d: { prefabs: readonly string[] }): boolean =>
    d.prefabs.some((pid) => (POI_PREFABS.get(pid)?.ground ?? []).some((v) => v === Tile.LampCairn));
  const flyers = [...POI_DEFS.values()].filter(
    (d) => (d.cues?.scatter ?? []).some((r) => r.tile === 'LampCairn') || stands(d),
  );
  assert.ok(flyers.length >= 1, 'no def flies the lamp cairn on its approach or stands one in its sketch');
  assert.ok(flyers.some((d) => d.id === 'fork_waystation'), 'the fork rest stands the Waykeepers\' cairns');
  for (const def of flyers) {
    assert.equal(def.weight, 0, `${def.id}: flies LampCairn but rolls freely (weight ${def.weight}) — a rolled site cannot promise a road; use the vocab's nearRoad gate`);
    const sites = AUTHORED_GEOGRAPHY.sites.filter((s) => s.defId === def.id);
    assert.ok(sites.length >= 1, `${def.id}: flies LampCairn but stands at no authored site`);
    for (const s of sites) {
      assert.ok(s.x !== undefined && s.y !== undefined, `${def.id}@${s.id}: cell-mode site cannot promise a road`);
      assert.ok(
        roadBearingAt(s.x!, s.y!, FRONTIER.trailReach) !== null,
        `${def.id}@${s.id} (${s.x},${s.y}): no road within trailReach ${FRONTIER.trailReach} — the cairn would lie`,
      );
    }
  }
  // And the rolled defs that scatter a lamp: none may (the vocab's road
  // gate is the only honest path for a site the geography does not pin).
  for (const def of POI_DEFS.values()) {
    const rungs = def.boldness?.stages.flatMap((st) => st.scatter ?? []) ?? [];
    assert.ok(!rungs.some((r) => r.tile === 'LampCairn'), `${def.id}: a boldness rung lights a lamp cairn — a bolder camp is not a road`);
  }
});

// Every people's glyph (plan §2's Mark column): the K3 lane plants none
// of them — the field, the displaced and the gloom claim nothing.
const K3_MARKS = [Tile.CharterPost, Tile.LampCairn, Tile.LegionStandard, Tile.BoneTree, Tile.TallyStone, Tile.WardThread, Tile.RedRagStake, Tile.SkullTotem, Tile.BoneMidden, Tile.TideTotem, Tile.PitLamp, Tile.PitLampDark];

// ---- THE FIELD AFTER AND THE DISPLACED (docs/contested-lands-plan.md
// §6 families B and F, K3 THE VOCAB): the two K3 sketches read as the
// plan drew them, and the ten defs' cue rows fly the kit by name.
test('THE FIELD AFTER: open ground where two sides met, the spill under the horse and half the litter, the drag behind the cart', () => {
  const count = (p: PrefabDef, t: Tile): number => p.ground.reduce((n, v) => n + (v === t ? 1 : 0), 0);
  const shelf = POI_PREFABS.get('poi_field_after')!;
  assert.ok(shelf, 'poi_field_after missing from the shelf');
  const field = K3_SKETCHES.get('poi_field_after')!;
  assert.ok(field, 'poi_field_after raw sketch missing');
  assert.ok(shelf.width > field.width && shelf.height > field.height, 'the field took no verge (the field vocab should roll one)');
  assert.equal(count(field, Tile.FallenBanner), 1, 'the banner down where the line broke');
  assert.equal(count(field, Tile.BeastBones), 1, 'the horse on its side');
  assert.equal(count(field, Tile.BrokenCart), 1, 'the cart at the south mouth');
  assert.equal(count(field, Tile.ArrowPost), 1, "the archers' post on the flank");
  assert.equal(count(field, Tile.FieldLitter), 8, 'a field, not a skirmish: eight litter tiles at the heart');
  assert.equal(count(field, Tile.FieldCairn), 2, 'somebody came back for two of them');
  // And the verge rolls the field vocab — more litter, never a fire.
  assert.ok(count(shelf, Tile.FieldLitter) > 8, 'the verge rolled no litter');
  assert.equal(count(shelf, Tile.Campfire) + count(shelf, Tile.EmberBed), 0, 'a fire on the field\'s verge');
  // No wall, no fire, no camp, no garrison, no strongbox: the field is
  // the stage; a zone def pins what haunts it.
  for (const t of [Tile.Campfire, Tile.EmberBed, Tile.Bonfire, Tile.RuinWallStone, Tile.RuinWallWood, Tile.TentHide, Tile.LeanTo]) {
    assert.equal(count(field, t), 0, `the field stands a ${Tile[t]}`);
  }
  assert.equal(shelf.spawns.length, 0, 'the field posts no body of its own');
  for (const g of shelf.ground) assert.equal(chestInfo(g), null, 'the field keeps no strongbox');
  // Who met whom is never said: no people's mark on the field, heart
  // or verge.
  for (const m of K3_MARKS) assert.equal(count(shelf, m), 0, `the field flies ${Tile[m]} — who met whom is never said`);
  // THE FLOOR REMEMBERS: the dark spill lies under the horse and under
  // about half the litter — baked on the detail plane, never a decal
  // (plan §1 law 8); a spill under EVERY litter tile read as a spotted
  // floor (the K3/K4 proof) — and the drag furrow runs as one north-
  // south column that ends at the cart (the furrow bake draws N-S bands).
  const w = field.width;
  let cartX = -1;
  let cartY = -1;
  let litterN = 0;
  let litterSpilled = 0;
  for (let i = 0; i < field.ground.length; i++) {
    const t = field.ground[i]!;
    if (t === Tile.BeastBones) {
      assert.equal(field.detail[i], Detail.DarkSpill, `the horse at ${i % w},${Math.floor(i / w)} lies on clean ground — the spill must lie under it`);
    }
    if (t === Tile.FieldLitter) {
      litterN++;
      if (field.detail[i] === Detail.DarkSpill) litterSpilled++;
    }
    if (t === Tile.BrokenCart) { cartX = i % w; cartY = Math.floor(i / w); }
  }
  assert.ok(litterSpilled >= 3 && litterSpilled * 2 <= litterN + 1, `about half the litter carries a spill (${litterSpilled} of ${litterN})`);
  const furrow: Array<[number, number]> = [];
  for (let i = 0; i < field.detail.length; i++) if (field.detail[i] === Detail.DragFurrow) furrow.push([i % w, Math.floor(i / w)]);
  assert.ok(furrow.length >= 3, 'the drag is a run, not a smudge');
  assert.ok(furrow.every(([x]) => x === cartX), 'the furrow runs in the cart\'s own column (the bake draws north-south bands)');
  const ys = furrow.map(([, y]) => y).sort((a, b) => a - b);
  assert.equal(ys[ys.length - 1]! + 1, cartY, 'the furrow ends at the cart — it was dragged here, not from here');
  for (let k = 1; k < ys.length; k++) assert.equal(ys[k], ys[k - 1]! + 1, 'the drag is unbroken');
  // Nothing on the field stands on the spill but what belongs there:
  // no spill wanders under grass with nothing on it.
  for (let i = 0; i < field.detail.length; i++) {
    if (field.detail[i] !== Detail.DarkSpill) continue;
    const t = field.ground[i]!;
    assert.ok(t === Tile.FieldLitter || t === Tile.BeastBones, `a spill at ${i % w},${Math.floor(i / w)} under ${Tile[t]} — the spill marks where something fell`);
  }
});

test('THE MUSTER GROUND: the displaced pitched with their faces south, the fire an ember bed over its pan', () => {
  const count = (p: PrefabDef, t: Tile): number => p.ground.reduce((n, v) => n + (v === t ? 1 : 0), 0);
  const shelf = POI_PREFABS.get('poi_muster_ground')!;
  assert.ok(shelf, 'poi_muster_ground missing from the shelf');
  // The sketch's own word is read off the raw sketch; the verge is the
  // displaced vocab's roll (one more household under a lean-to, a
  // pocket fire that is an ember bed) and answers on the shelf's copy.
  const muster = K3_SKETCHES.get('poi_muster_ground')!;
  assert.ok(muster, 'poi_muster_ground raw sketch missing');
  assert.ok(shelf.width > muster.width && shelf.height > muster.height, 'the muster ground took no verge');
  assert.equal(count(muster, Tile.LeanTo), 2);
  assert.equal(count(muster, Tile.Bedroll), 3);
  assert.equal(count(muster, Tile.BelongingsCart), 1);
  assert.equal(count(muster, Tile.FieldCot), 2);
  assert.equal(count(muster, Tile.WaterTrough), 1);
  assert.equal(count(muster, Tile.Signpost), 1, 'one plain post at the road mouth');
  assert.equal(count(muster, Tile.CrateGoods), 1, "the household's goods beside the cart");
  assert.equal(count(muster, Tile.EmberBed), 1, 'one cooking fire, banked');
  assert.equal(count(shelf, Tile.Campfire) + count(shelf, Tile.Bonfire), 0, 'never a campfire, heart or verge (plan §7.3)');
  assert.equal(count(shelf, Tile.TreePine), 0, "'j' is the trough here, never the pine");
  assert.equal(count(shelf, Tile.HangingSign), 0, "'i' is the plain post here, never the hanging sign");
  assert.equal(shelf.spawns.length, 0, 'a haven\'s actors stand here by def; the sketch posts nobody');
  for (const g of shelf.ground) assert.equal(chestInfo(g), null, 'they own what is on the cart and nothing else');
  for (const m of K3_MARKS) assert.equal(count(shelf, m), 0, `the displaced fly ${Tile[m]} — they claim nothing`);
  const w = muster.width;
  for (let i = 0; i < muster.ground.length; i++) {
    const t = muster.ground[i]!;
    if (t === Tile.LeanTo) {
      // Open face SOUTH: the cell below a lean-to is never a solid.
      const south = muster.ground[i + w];
      assert.ok(south !== undefined && south !== TILE_SKIP && !isSolidTile(south), `lean-to at ${i % w},${Math.floor(i / w)}: its open face is blocked by ${south === undefined ? 'the edge' : Tile[south]}`);
    }
    if (t === Tile.EmberBed) assert.equal(muster.detail[i], Detail.Ash, 'the ember bed sits over its ash pan (K1 grammar)');
  }
  // The verge's lean-tos keep the law too: the influence roll puts a
  // pocket piece on dirt inside its worked patch, never with a solid
  // pressed against its south face.
  const sw = shelf.width;
  for (let i = 0; i < shelf.ground.length; i++) {
    if (shelf.ground[i] !== Tile.LeanTo) continue;
    const south = shelf.ground[i + sw];
    assert.ok(south === undefined || south === TILE_SKIP || !isSolidTile(south), `verge lean-to at ${i % sw},${Math.floor(i / sw)}: its open face is blocked by ${south === undefined ? 'the edge' : Tile[south]}`);
  }
});

test('THE VOCAB CUES: the ten defs fly the field, the displaced, the stripped land and the spoil by name, within their ceilings', () => {
  const rows = (id: string): Map<string, number> => {
    const def = POI_DEFS.get(id);
    assert.ok(def, `${id} missing from the registry`);
    const m = new Map<string, number>();
    for (const r of def.cues?.scatter ?? []) {
      assert.equal(typeof Tile[r.tile as keyof typeof Tile], 'number', `${id}: scatter '${r.tile}' is not a Tile`);
      m.set(r.tile, (m.get(r.tile) ?? 0) + r.count);
    }
    return m;
  };
  // THE DEAD-FAMILY RUINS fly the field after: litter, a cairn or two,
  // the horse — at most two of each (a cue, not a dump), and the
  // muster (the field where the muster died) flies all three.
  for (const id of ['dead_muster', 'greatkeep_ruin', 'forest_ruin', 'watchtower_ruin']) {
    const m = rows(id);
    assert.ok((m.get('FieldLitter') ?? 0) + (m.get('FieldCairn') ?? 0) + (m.get('BeastBones') ?? 0) >= 2, `${id}: the field after never reached the approach`);
    for (const t of ['FieldLitter', 'FieldCairn', 'BeastBones']) {
      assert.ok((m.get(t) ?? 0) <= 2, `${id}: flies ${m.get(t)} ${t} (max 2 each)`);
    }
    for (const t of ['LeanTo', 'Bedroll', 'BelongingsCart', 'FieldCot']) {
      assert.equal(m.get(t) ?? 0, 0, `${id}: the displaced camp on a dead field`);
    }
    assert.equal(POI_DEFS.get(id)!.family, 'dead', `${id}: not the dead family`);
  }
  for (const t of ['FieldLitter', 'FieldCairn', 'BeastBones']) assert.ok(rows('dead_muster').has(t), `dead_muster: does not fly ${t}`);
  // THE HAVENS' pockets carry the displaced: one lean-to, one bedroll,
  // one cart each — a family under sacking at the edge of somebody's
  // safety, never a second haven.
  for (const id of ['wardens_outpost', 'waystation', 'roadside_hamlet']) {
    const m = rows(id);
    assert.ok(POI_DEFS.get(id)!.haven, `${id}: not a haven`);
    for (const t of ['LeanTo', 'Bedroll', 'BelongingsCart']) {
      assert.equal(m.get(t), 1, `${id}: flies ${m.get(t) ?? 0} ${t} (want exactly 1)`);
    }
    for (const t of ['FieldLitter', 'BeastBones', 'FieldCairn', 'DeadTree', 'CharredStump', 'SpoilHeap']) {
      assert.equal(m.get(t) ?? 0, 0, `${id}: a haven flies ${t}`);
    }
  }
  // THE STRIPPED LAND: the fellers leave snags and the clamp's stumps.
  for (const id of ['fellers_camp', 'timber_poachers']) {
    const m = rows(id);
    assert.ok((m.get('DeadTree') ?? 0) >= 1, `${id}: no dead standing tree on the verge`);
    assert.ok((m.get('CharredStump') ?? 0) >= 1, `${id}: no charred stump on the verge`);
    assert.ok((m.get('DeadTree') ?? 0) <= 2 && (m.get('CharredStump') ?? 0) <= 2, `${id}: the stripped cue is a cue, not a clear-cut`);
  }
  // THE DIGS: the spoil heap on the approach, the tally stone STANDING
  // in the sketch (K2's MUST_STAND law) and never doubled by cue.
  const digs = rows('kobold_digs');
  assert.equal(digs.get('SpoilHeap'), 2, 'kobold_digs: the spoil');
  assert.equal(digs.get('TallyStone') ?? 0, 0, 'kobold_digs: the tally stands in the sketch — a cue would double it');
  // Every cue row in this lane drops eight tiles or fewer on the
  // approach (the K2 ceiling), the pre-kit great keep ten.
  for (const id of ['dead_muster', 'forest_ruin', 'watchtower_ruin', 'wardens_outpost', 'waystation', 'roadside_hamlet', 'fellers_camp', 'timber_poachers', 'kobold_digs']) {
    const total = [...rows(id).values()].reduce((n, v) => n + v, 0);
    assert.ok(total <= 9, `${id}: cues.scatter drops ${total} tiles on the approach`);
  }
  assert.ok([...rows('greatkeep_ruin').values()].reduce((n, v) => n + v, 0) <= 10, 'greatkeep_ruin: keeps its pre-kit ten');
  // The K3/K4 defs fly no claim mark by cue that their people do not
  // own — the two-per-territory SUM law (K2) is held by THE MARKS test
  // above; this pins that this lane added no glyph at all.
  for (const id of ['dead_muster', 'greatkeep_ruin', 'forest_ruin', 'watchtower_ruin', 'wardens_outpost', 'waystation', 'roadside_hamlet', 'fellers_camp', 'timber_poachers', 'kobold_digs']) {
    const m = rows(id);
    for (const mark of K3_MARKS) assert.equal(m.get(Tile[mark]!) ?? 0, 0, `${id}: this lane flies ${Tile[mark]} — the marks are K2's`);
  }
});

// ---------------------------------------------------------------------
// BAND 7 ENGINE (L5): THE PASS, THE TOLL SURVEY, THE MOUTH ON THE ROW,
// THE POST IS NAMED — the validator carries the four fields and
// refuses the shapes the brief names.
// ---------------------------------------------------------------------

test('BAND 7: the validator carries passFlag, toll, the garrison mouth and the named post', () => {
  const base = {
    id: 'test_bar',
    name: 'Test bar',
    tiers: [1, 3],
    weight: 0,
    prefabs: ['poi_bandit_hollow'],
    garrison: [
      { npc: 'brigand', count: [2, 2], role: 'holdfast' },
      {
        npc: 'brigand_reaver',
        count: [1, 1],
        role: 'holdfast',
        minTier: 1,
        names: ['Brede'],
        crowned: true,
        actor: 'company_broker',
      },
    ],
    passFlag: 'charter_pass',
    toll: true,
  };
  const good = validatePoiDef(base);
  assert.ok(good.ok, JSON.stringify(good));
  if (!good.ok) return;
  assert.equal(good.def.passFlag, 'charter_pass');
  assert.equal(good.def.toll, true);
  assert.equal(good.def.garrison[1]!.actor, 'company_broker');
  assert.deepEqual(good.def.garrison[1]!.names, ['Brede']);
  assert.equal(good.def.garrison[1]!.crowned, true);
  assert.equal(good.def.garrison[1]!.minTier, 1);

  // THE POST IS NAMED: an `at` on open ground of the pooled prefab.
  const grid = POI_PREFABS.get('poi_waystation_camp')!;
  let open: { dx: number; dy: number } | null = null;
  let solid: { dx: number; dy: number } | null = null;
  for (let i = 0; i < grid.ground.length && (!open || !solid); i++) {
    const t = grid.ground[i]!;
    if (t === TILE_SKIP) continue;
    const cell = { dx: i % grid.width, dy: Math.floor(i / grid.width) };
    if (!isSolidTile(t) && !open) open = cell;
    if (isSolidTile(t) && !isSeatTile(t) && !solid) solid = cell;
  }
  assert.ok(open && solid, 'the waystation sketch has both open and solid cells');
  const staffed = validatePoiDef({
    id: 'test_post',
    name: 'Test post',
    tiers: [2, 4],
    weight: 1,
    prefabs: ['poi_waystation_camp'],
    garrison: [],
    actors: [{ pool: ['wayward_watch'], post: 'watch', at: { ...open!, dir: 'N' } }],
  });
  assert.ok(staffed.ok, JSON.stringify(staffed));
  assert.deepEqual(staffed.ok && staffed.def.actors?.[0]?.at, { ...open!, dir: 'N' });

  const refused: Array<[string, Record<string, unknown>]> = [
    ['passFlag in the dlg namespace', { passFlag: 'dlg:charter_pass' }],
    ['passFlag with no slug shape', { passFlag: 'Charter Pass' }],
    ['toll as a string', { toll: 'yes' }],
    [
      'mouth on an uncrowned row',
      { garrison: [{ npc: 'brigand_reaver', count: [1, 1], role: 'holdfast', names: ['Brede'], actor: 'company_broker' }] },
    ],
    [
      'mouth on a two-name pool',
      {
        garrison: [
          { npc: 'brigand_reaver', count: [1, 1], role: 'holdfast', names: ['Brede', 'Sten'], crowned: true, actor: 'company_broker' },
        ],
      },
    ],
    [
      'mouth on a nameless row',
      { garrison: [{ npc: 'brigand_reaver', count: [1, 1], role: 'holdfast', crowned: true, actor: 'company_broker' }] },
    ],
    [
      'mouth naming a dead slug',
      {
        garrison: [
          { npc: 'brigand_reaver', count: [1, 1], role: 'holdfast', names: ['Brede'], crowned: true, actor: 'nobody_home' },
        ],
      },
    ],
    [
      'mouth on a sentry row',
      {
        garrison: [
          { npc: 'brigand_reaver', count: [1, 1], role: 'sentry', names: ['Brede'], crowned: true, actor: 'company_broker' },
        ],
      },
    ],
    ['pass with no garrison', { garrison: [], passFlag: 'charter_pass' }],
  ];
  for (const [label, patch] of refused) {
    const res = validatePoiDef({ ...base, ...patch });
    assert.ok(!res.ok, `'${label}' passed validation`);
  }
  const postRefused: Array<[string, Record<string, unknown>]> = [
    ['at outside the rect', { at: { dx: grid.width + 3, dy: 0 } }],
    ['at on a solid tile', { at: solid! }],
    ['at with a slanted dir', { at: { ...open!, dir: 'NE' } }],
    ['at with fractional cells', { at: { dx: 1.5, dy: 2 } }],
  ];
  for (const [label, at] of postRefused) {
    const res = validatePoiDef({
      id: 'test_post',
      name: 'Test post',
      tiers: [2, 4],
      weight: 1,
      prefabs: ['poi_waystation_camp'],
      garrison: [],
      actors: [{ pool: ['wayward_watch'], post: 'watch', ...at }],
    });
    assert.ok(!res.ok, `'${label}' passed validation`);
  }
});

test('BAND 7: one body per named slug — a garrison mouth is placed by no zone and no actors row', () => {
  // THE MOUTH ON THE ROW's singleton law (the one-Leif rule's cousin):
  // the slug a crowned row speaks through stands nowhere else — not
  // in any def's staff pool, not on any authored zone's actor list.
  const mouths = new Map<string, string>();
  for (const def of POI_DEFS.values()) {
    for (const g of def.garrison) {
      if (g.actor === undefined) continue;
      assert.ok(!mouths.has(g.actor), `mouth '${g.actor}' rides two rows (${mouths.get(g.actor)} and ${def.id})`);
      mouths.set(g.actor, def.id);
    }
  }
  for (const def of POI_DEFS.values()) {
    for (const a of def.actors ?? []) {
      for (const slug of a.pool) {
        assert.ok(!mouths.has(slug), `'${slug}' is a garrison mouth of ${mouths.get(slug)} and a staff row of ${def.id}`);
      }
    }
  }
  const towns: Array<[string, () => ZoneDef]> = [
    ['dawnmead', buildDawnmead],
    ['amberford', buildAmberford],
    ['silverfall', buildSilverfall],
    ['saltmere', buildSaltmere],
    ['pinewatch', buildPinewatch],
    ['hartfell', buildHartfell],
    ['kingsdelf', buildKingsdelf],
    ['evenfall', buildEvenfall],
    ['undercroft', buildUndercroft],
    ['lowhall', buildLowhall],
  ];
  for (const [name, build] of towns) {
    for (const a of build().actorSpawns ?? []) {
      assert.ok(!mouths.has(a.actor), `'${a.actor}' is a garrison mouth of ${mouths.get(a.actor)} and stands in ${name}`);
    }
  }
});
