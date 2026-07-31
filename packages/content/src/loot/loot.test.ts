import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rarityIndex } from '@arx/shared';
import { ITEMS, itemDef } from '../items.js';
import { HEIRLOOM_MIN_SURPLUS } from '../equipment/tables.js';
import { NPCS } from '../npcs.js';
import { LOOT_TABLES, setDrops, validateLootTables } from './tables.js';
import { reachableItems, rollLoot } from './roll.js';
import { expectedYield } from './analyze.js';
import { lootTablesFromJson, lootTablesToJson } from './serialize.js';
import type { LootTableDef } from './types.js';

/** Deterministic PRNG (mulberry32) so statistical tests never flake. */
function srand(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function registry(...tables: LootTableDef[]): Map<string, LootTableDef> {
  return new Map(tables.map((t) => [t.id, t]));
}

test('validation rejects malformed tables', () => {
  const ok: LootTableDef = { id: 'a', entries: [{ item: 'bones' }] };
  validateLootTables([ok]);
  const bad: Array<[string, LootTableDef[]]> = [
    ['duplicate id', [ok, { id: 'a', entries: [{ item: 'coins' }] }]],
    ['empty entries', [{ id: 'b', entries: [] }]],
    ['unknown item', [{ id: 'b', entries: [{ item: 'no_such_item' }] }]],
    ['dangling ref', [{ id: 'b', entries: [{ table: 'nowhere' }] }]],
    ['two kinds', [{ id: 'b', entries: [{ item: 'bones', table: 'a' }] }]],
    ['bad chance', [{ id: 'b', entries: [{ item: 'bones', chance: 1.5 }] }]],
    ['w in each mode', [{ id: 'b', entries: [{ item: 'bones', w: 2 }] }]],
    ['picks in each mode', [{ id: 'b', picks: [1, 2], entries: [{ item: 'bones' }] }]],
    ['zero maxDrops', [{ id: 'b', maxDrops: 0, entries: [{ item: 'bones' }] }]],
    ['fractional maxDrops', [{ id: 'b', maxDrops: 1.5, entries: [{ item: 'bones' }] }]],
    ['bad qty', [{ id: 'b', entries: [{ item: 'bones', qty: [3, 1] }] }]],
    ['mult off a table ref', [{ id: 'b', entries: [{ item: 'bones', mult: 0.5 }] }]],
    [
      'cycle',
      [
        { id: 'b', entries: [{ table: 'c' }] },
        { id: 'c', entries: [{ table: 'b' }] },
      ],
    ],
  ];
  for (const [what, defs] of bad) {
    assert.throws(() => validateLootTables(defs), `validation missed: ${what}`);
  }
});

test('the shipped roster serializes and round-trips through JSON', () => {
  const defs = [...LOOT_TABLES.values()];
  const back = lootTablesFromJson(lootTablesToJson(defs));
  assert.deepEqual(back, defs);
});

test('setDrops generates one weighted line per set piece', () => {
  const base = setDrops('mothwing', 0.028);
  assert.equal(base.length, 5, 'mothwing base lot is five pieces');
  assert.ok(base.every((e) => !e.item!.match(/_(ember|dusk|luna)$/)), 'base lot excludes dye lots');
  const robe = base.find((e) => e.item === 'mothwing_robe')!;
  const cowl = base.find((e) => e.item === 'mothwing_cowl')!;
  assert.ok(robe.chance! < cowl.chance!, 'the body is the chase piece');
  assert.equal(setDrops('mothwing', 0.028, { colorway: 'dusk' }).length, 5);
  assert.equal(
    setDrops('nightveil', 0.025, { skip: ['jerkin'] }).find((e) => e.item === 'nightveil_jerkin'),
    undefined,
    'skip holds pieces back',
  );
  assert.throws(() => setDrops('no_such_set', 0.5));
});

test('each-mode: guaranteed lines always pay, chances converge, qty stays in range', () => {
  const rand = srand(7);
  let feathers = 0;
  let coins = 0;
  const N = 4000;
  for (let i = 0; i < N; i++) {
    const chicken = rollLoot('chicken', { level: 1, rand });
    assert.equal(chicken.length, 3, 'all chicken lines are guaranteed');
    const f = chicken.find((d) => d.item === 'feather')!;
    assert.ok(f.qty >= 3 && f.qty <= 8);
    feathers += f.qty;
    const goblin = rollLoot('goblin', { level: 5, rand });
    if (goblin.some((d) => d.item === 'coins')) coins++;
  }
  assert.ok(Math.abs(feathers / N - 5.5) < 0.15, `feather mean ${feathers / N} off 5.5`);
  assert.ok(Math.abs(coins / N - 0.7) < 0.03, `coin rate ${coins / N} off 0.7`);
});

test('pick-mode racks scale their hit odds under mult — the chest dial', () => {
  const rackDef: LootTableDef = {
    id: 'rack',
    mode: 'pick',
    nothingW: 90,
    entries: [{ item: 'bones', w: 10 }],
  };
  const tables = registry(
    rackDef,
    { id: 'kill', entries: [{ table: 'rack' }] },
    { id: 'chest', entries: [{ table: 'rack', mult: 9 }] },
  );
  const rand = srand(19);
  let killHits = 0;
  let chestHits = 0;
  const N = 6000;
  for (let i = 0; i < N; i++) {
    if (rollLoot('kill', { level: 1, rand }, tables).length) killHits++;
    if (rollLoot('chest', { level: 1, rand }, tables).length) chestHits++;
  }
  assert.ok(Math.abs(killHits / N - 0.1) < 0.02, `base rack rate ${killHits / N} off 0.1`);
  // mult 9: 9·10 / (9·10 + 90) = 0.5 — the chest carries the rack hot.
  assert.ok(Math.abs(chestHits / N - 0.5) < 0.03, `mult rack rate ${chestHits / N} off 0.5`);
});

test('maxDrops caps a table’s payout, nested refs included, without favoring entry order', () => {
  const tables = registry(
    { id: 'purse', entries: [{ item: 'coins' }, { item: 'feather' }] },
    {
      id: 'hoard',
      maxDrops: 2,
      entries: [{ item: 'bones' }, { item: 'arrow' }, { table: 'purse' }],
    },
  );
  const rand = srand(23);
  const kept = new Map<string, number>();
  for (let i = 0; i < 3000; i++) {
    const drops = rollLoot('hoard', { level: 1, rand }, tables);
    assert.equal(drops.length, 2, 'four guaranteed lines always cull to the cap');
    for (const d of drops) kept.set(d.item, (kept.get(d.item) ?? 0) + 1);
  }
  // Random culling: every line survives sometimes, none dominates.
  for (const item of ['bones', 'arrow', 'coins', 'feather']) {
    const share = (kept.get(item) ?? 0) / 6000;
    assert.ok(share > 0.15 && share < 0.35, `${item} survival share ${share} off 0.25`);
  }
});

test('pick-mode: at most one draw pays, frequencies follow weights', () => {
  const rand = srand(11);
  const counts = new Map<string, number>();
  const N = 6000;
  for (let i = 0; i < N; i++) {
    const drops = rollLoot('champion_capes', { level: 20, rand });
    assert.ok(drops.length <= 1, 'one mantle at a time');
    for (const d of drops) counts.set(d.item, (counts.get(d.item) ?? 0) + 1);
  }
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(total / N - 0.47) < 0.03, `cape rate ${total / N} off 0.47`);
  assert.ok(
    (counts.get('cape_champion') ?? 0) > (counts.get('cape_phoenix') ?? 0) * 2,
    'weights order the rack',
  );
});

test('nested refs honor mult; depth cannot run away', () => {
  const tables = registry(
    { id: 'child', entries: [{ item: 'bones' }] },
    { id: 'parent', entries: [{ table: 'child', mult: 0.5 }] },
  );
  const rand = srand(3);
  let hits = 0;
  const N = 4000;
  for (let i = 0; i < N; i++) if (rollLoot('parent', { level: 1, rand }, tables).length) hits++;
  assert.ok(Math.abs(hits / N - 0.5) < 0.03, `mult rate ${hits / N} off 0.5`);
});

test('rarity floor and rarityBonus calibrate a table upward', () => {
  const tables = registry(
    { id: 'fancy', minRarity: 'rare', entries: [{ item: 'wolfhide_hood' }] },
    { id: 'plain', entries: [{ item: 'wolfhide_hood' }] },
    { id: 'blessed', rarityBonus: 40, entries: [{ item: 'wolfhide_hood' }] },
  );
  const rand = srand(19);
  let plainCommon = 0;
  let blessedCommon = 0;
  for (let i = 0; i < 1500; i++) {
    const fancy = rollLoot('fancy', { level: 12, rand }, tables)[0]!;
    assert.ok(rarityIndex(fancy.roll!.rar) >= rarityIndex('rare'), 'floor holds');
    if (rollLoot('plain', { level: 12, rand }, tables)[0]!.roll!.rar === 'common') plainCommon++;
    if (rollLoot('blessed', { level: 12, rand }, tables)[0]!.roll!.rar === 'common') {
      blessedCommon++;
    }
  }
  assert.ok(blessedCommon < plainCommon * 0.8, 'rarityBonus shifts the curve');
});

test('power policy: source promotes above native, native never stamps', () => {
  const tables = registry(
    { id: 'src', entries: [{ item: 'mothwing_cowl' }] },
    { id: 'nat', power: 'native', entries: [{ item: 'mothwing_cowl' }] },
  );
  const rand = srand(23);
  const native = itemDef('mothwing_cowl')!.gear!.levelReq!.level;
  for (let i = 0; i < 300; i++) {
    const p = rollLoot('src', { level: 40, rand }, tables)[0]!;
    assert.ok(p.roll!.pwr! >= 40 && p.roll!.pwr! <= 43, 'source stamps foe level + jitter');
    // Jitter reaches +3, so sit 4 below native to stay under the bar.
    const weak = rollLoot('src', { level: native - 4, rand }, tables)[0]!;
    assert.equal(weak.roll!.pwr, undefined, 'a weak source never promotes');
    assert.equal(rollLoot('nat', { level: 40, rand }, tables)[0]!.roll!.pwr, undefined);
  }
});

test('the heirloom table honors the surplus law and stamps power', () => {
  const rand = srand(31);
  let seenAny = false;
  for (let i = 0; i < 3000; i++) {
    for (const d of rollLoot('heirlooms', { level: 20, rand })) {
      seenAny = true;
      const gear = itemDef(d.item)?.gear;
      assert.ok(gear, 'heirlooms are rolled gear');
      assert.ok(
        (gear!.levelReq?.level ?? 1) <= 20 - HEIRLOOM_MIN_SURPLUS,
        `${d.item} too strong for a level-20 heirloom`,
      );
      assert.ok(d.roll!.pwr! >= 20, 'heirlooms arrive at the foe’s power');
    }
  }
  assert.ok(seenAny, 'the 5% chance pays out across 3000 kills');
});

test('every foe’s tables preserve its signature loot — reserved pieces stay reserved', () => {
  const reach = new Map<string, Set<string>>();
  for (const [id, npc] of NPCS) {
    const items = new Set<string>();
    for (const t of npc.loot) for (const item of reachableItems(t)) items.add(item);
    reach.set(id, items);
  }
  const expect: Record<string, string[]> = {
    chicken: ['raw_chicken', 'feather', 'bones'],
    cow: ['raw_beef', 'cowhide'],
    rat: ['mothwing_robe', 'fenwalker_hood_rustsedge', 'cutpurse_gloves_alleyrat', 'ratter', 'shiv'],
    goblin: ['bronze_sword', 'snare_kit', 'mothwing_cowl_ember', 'briarplate_platebody_bloodbriar', 'gobsplitter', 'wisplight', 'emberstone'],
    goblin_thrower: ['straw_decoy', 'cape_banner', 'tidecaller_robe', 'cutpurse_jerkin_redhand', 'briarplate_helm_nightbriar', 'serpentcoil', 'fishspine'],
    skeleton: ['aegis_stone', 'iron_helm', 'nightveil_cowl', 'voidwhisper_skirts', 'sentinel_gauntlets_bloodwatch', 'dawnsworn_robe_eclipse', 'gravewhisper', 'boneharrow'],
    skeleton_champion: ['sigil_fallen_champion', 'storm_coil', 'cape_champion', 'cape_phoenix', 'dreadforge_platebody', 'nightveil_jerkin', 'voidwhisper_robe', 'sentinel_greaves_daybreak', 'emberfox_hood_shadowfox', 'oathkeeper', 'last_word', 'skyrender', 'worldsplinter', 'frostplate_platebody'],
    wolf: ['wolf_fur', 'bramble_band', 'wolfhide_hood', 'wolfstalker_chaps', 'emberfox_gloves_dawnfox', 'mothwing_wraps_luna', 'frostplate_helm', 'wolffang', 'glacierbite'],
  };
  for (const [npc, items] of Object.entries(expect)) {
    for (const item of items) {
      assert.ok(ITEMS.has(item), `expected item '${item}' no longer exists`);
      assert.ok(reach.get(npc)!.has(item), `${npc} lost '${item}'`);
    }
  }
  // The Champion's reserved pieces must never leak to the crypt floor.
  assert.ok(!reach.get('skeleton')!.has('nightveil_jerkin'), 'jerkin leaked to skeletons');
  assert.ok(!reach.get('skeleton')!.has('voidwhisper_robe'), 'robe leaked to skeletons');
  assert.ok(!reach.get('wolf')!.has('frostplate_platebody'), 'guarded frostplate leaked to wolves');
});

test('the flood law: every foe’s per-kill expectation stays under its station’s ceiling', () => {
  // Pure table math via expectedYield — no player state, no pity, no
  // time-played dials: the odds ARE the economy. Regular foes pay a
  // couple of stacks and treat gear as an event; named foes pay richer;
  // the Champion alone showers. A retune (code or CMS) that breaks a
  // ceiling is a flood, not a balance pass.
  const NAMED = new Set(['kobold_digmaster', 'brigand_reaver', 'dire_wolf', 'gnoll_champion']);
  const BOSS = new Set(['skeleton_champion']);
  for (const [id, npc] of NPCS) {
    let stacks = 0;
    let gear = 0;
    for (const t of npc.loot) {
      const y = expectedYield(t);
      stacks += y.stacks;
      gear += y.gearStacks;
    }
    const [maxStacks, maxGear] = BOSS.has(id) ? [8, 2.2] : NAMED.has(id) ? [4.5, 0.5] : [3.2, 0.2];
    assert.ok(stacks <= maxStacks, `${id} expects ${stacks.toFixed(2)} stacks/kill > ${maxStacks}`);
    assert.ok(gear <= maxGear, `${id} expects ${gear.toFixed(3)} gear/kill > ${maxGear}`);
  }
});
