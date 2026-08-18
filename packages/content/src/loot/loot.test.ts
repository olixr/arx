import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rarityIndex } from '@arx/shared';
import { ITEMS, itemDef } from '../items.js';
import { HEIRLOOM_MIN_SURPLUS } from '../equipment/tables.js';
import { NPCS } from '../npcs.js';
import { POI_DEFS } from '../pois/defs.js';
import {
  BOSS_YIELD_CEILING,
  LOOT_TABLES,
  lootTableErrors,
  setDrops,
  validateLootTables,
} from './tables.js';
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

test('ctx.chanceMult damps a whole resolve — the delve trash dial', () => {
  const tables = registry(
    {
      id: 'trash',
      entries: [
        { item: 'bones' }, // guaranteed line thins too
        { item: 'feather', chance: 0.4 },
      ],
    },
    { id: 'rack', mode: 'pick', nothingW: 90, entries: [{ item: 'arrow', w: 10 }] },
  );
  const rand = srand(29);
  const N = 6000;
  let bones = 0;
  let feathers = 0;
  let rackHits = 0;
  for (let i = 0; i < N; i++) {
    for (const d of rollLoot('trash', { level: 1, rand, chanceMult: 0.5 }, tables)) {
      if (d.item === 'bones') bones++;
      if (d.item === 'feather') feathers++;
    }
    if (rollLoot('rack', { level: 1, rand, chanceMult: 0.5 }, tables).length) rackHits++;
  }
  assert.ok(Math.abs(bones / N - 0.5) < 0.03, `guaranteed line ${bones / N} off 0.5`);
  assert.ok(Math.abs(feathers / N - 0.2) < 0.02, `chance line ${feathers / N} off 0.2`);
  // pick-mode: 0.5·10 / (0.5·10 + 90) ≈ 0.0526 — weights damp against nothingW.
  assert.ok(Math.abs(rackHits / N - 0.0526) < 0.015, `pick rate ${rackHits / N} off 0.053`);
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
    goblin_thrower: ['straw_decoy', 'cape_banner', 'tidecaller_robe', 'tidecaller_robe_maelstrom', 'briarplate_helm_nightbriar', 'serpentcoil', 'fishspine'],
    brigand_reaver: ['reavers_toll', 'tollbreaker', 'cutpurse_jerkin_redhand', 'redmarch_platebody', 'crownfire'],
    goblin_champion: ['warboss_tusk', 'leather_body', 'briarplate_platebody_bloodbriar', 'gobmangler', 'gobnail_warboard'],
    lynx_champion: ['duskruff_pelt', 'mothlight', 'emberfox_hood_silverfox'],
    fox: ['fox_pelt', 'raw_chicken'],
    fox_champion: ['smokebrush_pelt', 'fox_pelt', 'emberfox_jerkin'],
    iron_golem: ['forgeplate_scrap', 'golem_core', 'lodestone'],
    ogre: ['ogre_tooth', 'raw_beef', 'ogre_greatclub', 'quarryheart'],
    // THE WORN BOOK wave: the hill kept a knight company's parade
    // gold, so 24-30 plate no longer drops out of crypts alone.
    ogre_champion: ['bonegrinder_girdle', 'ogre_tooth', 'ogre_greatclub', 'bearspine', 'oathgold_platebody'],
    // The legion's loot-story: the issued kit on the body really
    // drops — the line's sword and board, the longbowman's bow, the
    // warlord's steel and crest.
    hobgoblin: ['legion_ring', 'iron_sword', 'oak_kiteshield', 'shortbow'],
    hobgoblin_champion: ['warlord_crest', 'legion_ring', 'steel_sword'],
    // THE WORN BOOK wave's re-homed lots (the routes lane): the
    // fisher-people wear their own drowned cloth, the den holds the
    // rest of the last warden's kit, and 24-30 plate finally drops
    // somewhere that is not a crypt.
    skral: ['raw_trout', 'skral_frill', 'tidecaller_robe_darkwater'],
    skral_harpooner: ['tidecaller_hood_darkwater'],
    wolf_oldfang: ['direwolf_pelt', 'duskwarden_robe', 'duskwarden_wraps'],
    elder_great_owl: ['elder_plume', 'palethorn_platebody', 'stormsinger_robe'],
    gnoll_champion: ['packlord_mane', 'jadeskull_platebody', 'lastsheaf'],
    skeleton_barrow_lord: ['nightveil_jerkin_barrowdusk', 'sunhallow_robe'],
    skeleton_fallen_king: ['nightveil_cowl_barrowdusk', 'cape_champion'],
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
  // The Red Company's colors fly over the reaver alone — never a
  // goblin camp, never the common crews.
  assert.ok(!reach.get('goblin_thrower')!.has('cutpurse_jerkin_redhand'), 'redhand leaked to throwers');
  assert.ok(!reach.get('brigand')!.has('cutpurse_jerkin_redhand'), 'redhand leaked to the crews');
  // The Bonegrinder's girdle hangs on the Bonegrinder alone.
  assert.ok(!reach.get('ogre')!.has('bonegrinder_girdle'), 'girdle leaked to the rank-and-file');
  // The barrow lot belongs to the lords of the deep crypt alone —
  // never the crypt floor, never the Champion's own purse.
  assert.ok(!reach.get('skeleton')!.has('nightveil_jerkin_barrowdusk'), 'barrowdusk leaked to skeletons');
  assert.ok(!reach.get('skeleton_champion')!.has('nightveil_jerkin_barrowdusk'), 'barrowdusk leaked to the Champion');
});

test('THE WORN BOOK wave: the new houses have roads home, and the exclusives hold', () => {
  const reach = new Map<string, Set<string>>();
  for (const [id, npc] of NPCS) {
    const items = new Set<string>();
    for (const t of npc.loot) for (const item of reachableItems(t)) items.add(item);
    reach.set(id, items);
  }
  // Piece names belong to the family lane; the ROUTE is this lane's
  // to pin, so match on the family prefix and the gear flag rather
  // than on hand-copied ids (packlord_mane is a trophy, not a piece).
  const wears = (npc: string, family: string): boolean =>
    [...(reach.get(npc) ?? [])].some((i) => i.startsWith(`${family}_`) && itemDef(i)?.gear);
  const roads: Record<string, string[]> = {
    // The fen grows the leather; the elder court wears it.
    adderking: ['fen_basilisk', 'elder_basilisk'],
    // The leather ceiling: four crowned foes chosen for the headroom
    // the census found in them (19-24% of the boss gear ceiling).
    stormtalon: ['skral_tidelord', 'skral_deepmaw', 'goblin_flame_tyrant', 'gnoll_matriarch'],
    // The legion recut: the line signs for it, the warlord wears it.
    warvaliant: ['hobgoblin', 'hobgoblin_archer', 'hobgoblin_juggernaut', 'hobgoblin_champion'],
    // The pet lane's house, cut from the crest it drops beside.
    packlord: ['gnoll_champion', 'gnoll_matriarch'],
  };
  for (const [family, foes] of Object.entries(roads)) {
    for (const foe of foes) {
      assert.ok(NPCS.has(foe), `${foe} left the bestiary`);
      assert.ok(wears(foe, family), `${foe} pays no ${family} piece`);
    }
  }
  // CRAFT-LANE SYMMETRY IS DESIGN (the 2026-08 audit's binding
  // verdict): this wave's two craft-only houses gain material theming
  // and NEVER a drop route. The heirloom pool is their only way onto
  // the ground, exactly as it is for the other twelve.
  for (const family of ['weirkeeper', 'wrightcloth']) {
    for (const [id, t] of LOOT_TABLES) {
      const leak = t.entries.find((e) => e.item?.startsWith(`${family}_`));
      assert.equal(leak, undefined, `${family} grew a drop route in '${id}'`);
    }
  }
  // THE SAND'S SECOND EXCLUSIVE: the laurelbrand is awarded, never
  // looted. Two purse tables carry it; no chest, no rack, and no body
  // anywhere in the bestiary may.
  const homes = [...LOOT_TABLES]
    .filter(([, t]) => t.entries.some((e) => e.item === 'laurelbrand'))
    .map(([id]) => id)
    .sort();
  assert.deepEqual(homes, ['arena_purse_t3', 'arena_purse_t4'], 'the laurel blade left the sand');
  for (const [id, items] of reach) {
    assert.ok(!items.has('laurelbrand'), `the laurelbrand leaked onto '${id}'`);
  }
  // ...and the grave-goods left the sand with it: the small purses pay
  // the pit house's own rack now, not a crypt two counties over.
  for (const purse of ['arena_purse_t1', 'arena_purse_t2']) {
    const refs = LOOT_TABLES.get(purse)!.entries.map((e) => e.table);
    assert.ok(refs.includes('pit_arms'), `${purse} lost the pit rack`);
    assert.ok(!refs.includes('crypt_arms'), `${purse} still hands out grave-goods`);
  }
});

test('THE CAMPS BARE THEIR HOARDS: three war-camps carry their own strongbox', () => {
  const boxes: Array<[poi: string, table: string]> = [
    ['bandit_camp', 'chest_pit_takings'],
    ['hobgoblin_warcamp', 'chest_legion_issue'],
    ['ogre_camp', 'chest_toll_hoard'],
  ];
  for (const [poi, table] of boxes) {
    assert.ok(LOOT_TABLES.has(table), `the '${table}' lot never shipped`);
    assert.equal(POI_DEFS.get(poi)?.chestLoot, table, `${poi} lost its signature box`);
  }
  // THE RED RIGHT HAND stays where the audit put it: the crews' box
  // holds the crews' takings, never the Company's colors.
  const takings = reachableItems('chest_pit_takings');
  assert.ok(
    ![...takings].some((i) => i.endsWith('_redhand')),
    'redhand leaked into the pit takings',
  );
  // The legion's box carries the campaign's pattern; the hill's box
  // carries the hill's toll shelf and nothing it could not lift.
  assert.ok(
    [...reachableItems('chest_legion_issue')].some(
      (i) => i.startsWith('warvaliant_') && itemDef(i)?.gear,
    ),
    'the quartermaster shipped an empty rack',
  );
  assert.ok(reachableItems('chest_toll_hoard').has('ogre_greatclub'), 'the toll shelf went missing');
});

test('the flood law: every foe’s per-kill expectation stays under its station’s ceiling', () => {
  // Pure table math via expectedYield — no player state, no pity, no
  // time-played dials: the odds ARE the economy. Regular foes pay a
  // couple of stacks and treat gear as an event; named foes pay richer;
  // the Champion alone showers. A retune (code or CMS) that breaks a
  // ceiling is a flood, not a balance pass.
  const NAMED = new Set(['kobold_digmaster', 'brigand_reaver', 'dire_wolf', 'fey_wolf', 'dire_boar', 'gnoll_champion', 'goblin_champion', 'lynx_champion', 'fox_champion', 'elder_great_owl', 'ogre_champion', 'skral_champion', 'hobgoblin_champion']);
  // The crownsguard is the Ashen Court's champion body (the Kingsdelf
  // epic): a minTier-6 singleton that walks only after dusk, carrying
  // the champion's whole purse at the Overband's level. Boss station
  // by design — the shower is the point of surviving the procession.
  const BOSS = new Set(['skeleton_champion', 'skeleton_crownsguard']);
  for (const [id, npc] of NPCS) {
    let stacks = 0;
    let gear = 0;
    for (const t of npc.loot) {
      const y = expectedYield(t);
      stacks += y.stacks;
      gear += y.gearStacks;
    }
    // THE DREAD CROWN: a crowned foe IS boss station by definition —
    // the `boss` block is the marker, so every future crown inherits
    // the shower ceiling without joining a hand-kept list.
    const [maxStacks, maxGear] =
      BOSS.has(id) || npc.boss !== undefined ? [8, 2.2] : NAMED.has(id) ? [4.5, 0.5] : [3.2, 0.2];
    assert.ok(stacks <= maxStacks, `${id} expects ${stacks.toFixed(2)} stacks/kill > ${maxStacks}`);
    assert.ok(gear <= maxGear, `${id} expects ${gear.toFixed(3)} gear/kill > ${maxGear}`);
  }
});

test('the flood law at the door: the CMS gate refuses a single table past the boss purse', () => {
  // The accept gate cannot know which NPC station will carry a
  // candidate table — that binding is a kill-time fact — so it
  // enforces the honest subset: a lone table whose OWN expectation
  // tops the boss ceiling has no lawful home anywhere. The shipped
  // roster must pass its own door, or the CMS could never re-accept
  // the world as it stands.
  const shipped = [...LOOT_TABLES.values()];
  assert.deepEqual(lootTableErrors(shipped), [], 'the shipped roster fails its own door');
  // A nine-certain-stack purse floods the stack ceiling (8)...
  const flood: LootTableDef = {
    id: 'flood_purse',
    entries: Array.from({ length: 9 }, () => ({ item: 'bones' })),
  };
  const floodErrs = lootTableErrors([...shipped, flood]);
  assert.ok(
    floodErrs.some((e) => e.includes('flood_purse') && e.includes('stacks/roll')),
    `stack flood passed the door: ${floodErrs.join('; ')}`,
  );
  // ...and three certain gear drops flood the gear ceiling (2.2)
  // while staying under the stack one — each axis trips on its own.
  // Any gear item already riding a shipped table is drop-flagged by
  // construction (the acquisition law upstream), so borrow one.
  const gearItem = shipped
    .flatMap((t) => t.entries)
    .find((e) => e.item && itemDef(e.item)?.gear)!.item!;
  const shower: LootTableDef = {
    id: 'flood_wardrobe',
    entries: Array.from({ length: 3 }, () => ({ item: gearItem })),
  };
  const showerErrs = lootTableErrors([...shipped, shower]);
  assert.ok(
    showerErrs.some((e) => e.includes('flood_wardrobe') && e.includes('gear/roll')),
    `gear flood passed the door: ${showerErrs.join('; ')}`,
  );
  // The door's ceiling IS the boss station's — the ladder's top rung
  // pinned above; a drifted constant would quietly loosen the gate.
  assert.equal(BOSS_YIELD_CEILING.stacks, 8);
  assert.equal(BOSS_YIELD_CEILING.gearStacks, 2.2);
});

test('astral essence climbs a level-banded ladder, not a cliff', () => {
  // Astral's tier-1 workings open at enchanting 6-8, but for a long
  // time the reagent's only drops were the boss chest and the riftgate
  // cache — an endgame seam under an apprentice recipe. The ladder now:
  // press recipe low (recipes.ts), the parliament's owls mid-band,
  // boss chest and riftgate at the rich top end.
  const carries = (tableId: string): boolean =>
    LOOT_TABLES.get(tableId)!.entries.some((e) => e.item === 'astral_essence');
  assert.ok(carries('great_owl'), 'the great owl is the mid-band astral seam');
  assert.ok(carries('elder_great_owl'), 'the elder pays the seam richer');
  assert.ok(carries('chest_boss'), 'the top end must keep paying');
  assert.ok(carries('chest_riftgate'), 'the top end must keep paying');
  // And the roster still validates whole with the new lines in it.
  validateLootTables([...LOOT_TABLES.values()]);
});
