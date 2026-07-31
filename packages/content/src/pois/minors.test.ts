import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { WILD_ROSTER } from '../wilds.js';
import { NPCS } from '../npcs.js';
import { AUTHORED_MINOR_DEFS, MINOR_DEFS, replaceMinorDefs } from './minorDefs.js';
import {
  MINOR_CACHE_CHANCE_CAP,
  MINOR_GARRISON_CAP,
  validateMinorDef,
} from './minorValidate.js';
import { POI_PREFABS } from './prefabs.js';

const MINORS_DIR = join(dirname(fileURLToPath(import.meta.url)), 'minors');

test('every authored find file is registered, and the registry is clean', () => {
  const files = readdirSync(MINORS_DIR).filter((f) => f.endsWith('.json'));
  assert.ok(files.length >= 8, 'minors directory looks empty');
  assert.equal(
    files.length,
    AUTHORED_MINOR_DEFS.size,
    'a minors/*.json file is missing from minorDefs.ts SOURCES',
  );
  for (const f of files) {
    assert.ok(AUTHORED_MINOR_DEFS.has(f.replace(/\.json$/, '')), `${f}: filename is not its id`);
  }
});

test('shipped finds obey the texture laws: small prefabs, whisper garrisons, real beasts', () => {
  for (const def of MINOR_DEFS.values()) {
    for (const pid of def.prefabs) {
      const prefab = POI_PREFABS.get(pid);
      assert.ok(prefab, `${def.id}: prefab '${pid}' not in the builtin library`);
      assert.ok(
        prefab!.width <= 9 && prefab!.height <= 7,
        `${def.id}: prefab '${pid}' is ${prefab!.width}x${prefab!.height} — a find must stay small`,
      );
      assert.equal(prefab!.spawns.length, 0, `${def.id}: find prefabs carry no spawn markers`);
    }
    const bodies = (def.garrison ?? []).reduce((s, g) => s + g.count[1], 0);
    assert.ok(bodies <= MINOR_GARRISON_CAP, `${def.id}: ${bodies} bodies over the cap`);
    for (const g of def.garrison ?? []) {
      assert.ok(NPCS.has(g.npc), `${def.id}: unknown npc '${g.npc}'`);
    }
    if (def.cache) assert.ok(def.cache.chance <= MINOR_CACHE_CHANCE_CAP, `${def.id}: cache too rich`);
  }
});

test('THE DEN IS THE SOURCE: wild habitats and find habitats name each other', () => {
  const findHabitats = new Set(
    [...MINOR_DEFS.values()].map((d) => d.habitat).filter((h): h is string => h !== undefined),
  );
  const wildHabitats = new Set(
    WILD_ROSTER.map((e) => e.habitat).filter((h): h is string => h !== undefined),
  );
  // Every habitat a wild entry answers to must exist as a find, and
  // every habitat a find offers must pull some wild kind — a slug
  // with only one side is a silent no-op forever.
  for (const h of wildHabitats) assert.ok(findHabitats.has(h), `no find offers habitat '${h}'`);
  for (const h of findHabitats) assert.ok(wildHabitats.has(h), `no wild kind answers habitat '${h}'`);
});

test('the validator refuses the dishonest find, by class', () => {
  const base = {
    id: 'find_test',
    name: 'Test find',
    tiers: [1, 3],
    weight: 1,
    prefabs: ['find_glade'],
  };
  const bad = (patch: Record<string, unknown>, needle: string): void => {
    const res = validateMinorDef({ ...base, ...patch });
    assert.ok(!res.ok, `expected rejection for ${needle}`);
    if (!res.ok) {
      assert.ok(
        res.errors.some((e) => e.includes(needle)),
        `errors mention ${needle}: ${res.errors.join(' | ')}`,
      );
    }
  };
  assert.ok(validateMinorDef(base).ok, 'the base find must pass');
  bad({ id: 'poi_test' }, 'find_');
  bad({ tiers: [0, 3] }, 'tiers');
  bad({ tiers: [3, 1] }, 'tiers');
  bad({ weight: 0 }, 'weight');
  bad({ prefabs: [] }, 'prefabs');
  bad(
    { garrison: [{ npc: 'rat', count: [2, 4] }] },
    'at most',
  );
  bad({ cache: { chance: 0.5 } }, 'texture is not treasure');
  bad({ clearing: 3 }, 'clearing');
  bad({ habitat: 'Bad Slug' }, 'habitat');
  bad({ chestWarded: true }, "unknown field 'chestWarded'");
  // Cross-refs bite when provided.
  const refs = { prefabIds: new Set(['find_glade']), npcIds: new Set(['rat']) };
  assert.ok(validateMinorDef({ ...base, garrison: [{ npc: 'rat', count: [1, 1] }] }, refs).ok);
  const badPrefab = validateMinorDef({ ...base, prefabs: ['find_ghost'] }, refs);
  assert.ok(!badPrefab.ok && badPrefab.errors.some((e) => e.includes('not in the library')));
  const badNpc = validateMinorDef({ ...base, garrison: [{ npc: 'ghost', count: [1, 1] }] }, refs);
  assert.ok(!badNpc.ok && badNpc.errors.some((e) => e.includes("unknown npc 'ghost'")));
});

test('replaceMinorDefs swaps the live registry in place', () => {
  const identity = MINOR_DEFS;
  const before = new Map(MINOR_DEFS);
  try {
    const one = MINOR_DEFS.get('find_glade')!;
    replaceMinorDefs([{ ...one, weight: 9 }]);
    assert.equal(MINOR_DEFS, identity);
    assert.equal(MINOR_DEFS.size, 1);
    assert.equal(MINOR_DEFS.get('find_glade')!.weight, 9);
  } finally {
    replaceMinorDefs(before.values());
  }
  assert.equal(MINOR_DEFS.size, before.size);
});
