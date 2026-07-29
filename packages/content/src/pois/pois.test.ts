import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { TILE_SKIP, Tile, chestInfo } from '@arx/shared';
import { DANGER_LAWS } from '../danger.js';
import { NPCS } from '../npcs.js';
import { AUTHORED_POI_DEFS, POI_DEFS } from './defs.js';
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
