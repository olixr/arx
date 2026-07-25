import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Detail, PASSIVES, STATUS_IDS, Tile, TILE_DEFS } from '@devcraft/shared';
import { ZoneBuilder } from './maps/builder.js';
import { buildDawnmead } from './maps/dawnmead.js';
import { buildAmberford } from './maps/amberford.js';
import { buildSilverfall } from './maps/silverfall.js';
import { buildUndercroft } from './maps/undercroft.js';
import { AMBERFORD_RECT, SILVERFALL_RECT } from './geography.js';
import { zoneFromJson, zoneToJson } from './maps/serialize.js';
import { compileTemplate, templateHeight, templateWidth } from './structures/stamp.js';
import { templateFromJson, templateToJson } from './structures/serialize.js';
import {
  CHAPEL,
  COTTAGE_SMALL,
  INN_LARGE,
  SMITHY,
  STRUCTURE_TEMPLATES,
  WELL_PLAZA,
} from './structures/templates.js';
import { ABILITIES, TECHNIQUES, abilityDef } from './abilities.js';
import { ITEMS } from './items.js';
import { NPCS, TOWN_SPAWNS } from './npcs.js';
import { LOOT_TABLES } from './loot/tables.js';
import { RECIPES } from './recipes.js';
import { NODES } from './nodes.js';
import { BUILDABLES } from './buildables.js';
import { GENERAL_STORE, SHOPS } from './shop.js';
import { UNLOCKABLE_RECIPES, recipeScrollId } from './recipes.js';
import { NPC_ACTORS } from './actors/registry.js';
import {
  CROPS,
  CROP_BY_SEED,
  CROP_TILES,
  growMs,
  stageEndMs,
  stageForElapsed,
  tileForStage,
} from './crops.js';

/**
 * Cross-reference integrity: every id that content points at must
 * resolve. Catches the classic data bug — a renamed ability or item
 * silently orphaning a weapon, relic, or loot table.
 */

test('every weapon art and relic active resolves to an ability', () => {
  for (const [id, item] of ITEMS) {
    if (item.weapon?.art) {
      assert.ok(abilityDef(item.weapon.art), `${id} art '${item.weapon.art}' missing`);
    }
    if (item.relic) {
      assert.ok(abilityDef(item.relic), `${id} relic '${item.relic}' missing`);
      assert.equal(item.equipSlot, 'relic', `${id} grants an active but is not relic-slotted`);
    }
    if (item.weapon?.ammo) {
      assert.ok(ITEMS.has(item.weapon.ammo), `${id} ammo '${item.weapon.ammo}' missing`);
    }
  }
});

test('every equippable weapon carries an Art — no dead Q slots', () => {
  for (const [id, item] of ITEMS) {
    if (item.weapon) assert.ok(item.weapon.art, `${id} has no weapon art`);
  }
});

test('npc loot, specials, and spawns all resolve', () => {
  for (const [id, npc] of NPCS) {
    assert.ok(npc.loot.length > 0, `${id} has no loot tables`);
    for (const tableId of npc.loot) {
      assert.ok(LOOT_TABLES.has(tableId), `${id} loot table '${tableId}' missing`);
    }
    if (npc.special) {
      const ab = abilityDef(npc.special.ability);
      assert.ok(ab, `${id} special '${npc.special.ability}' missing`);
      assert.ok(npc.special.everyTicks > 0);
    }
  }
  for (const spawn of TOWN_SPAWNS) {
    assert.ok(NPCS.has(spawn.npc), `spawn '${spawn.npc}' missing`);
  }
});

test('techniques resolve, ladder is sane, and each style has a tree', () => {
  const styles = new Map<string, number[]>();
  for (const t of TECHNIQUES) {
    assert.ok(abilityDef(t.ability), `technique '${t.ability}' missing`);
    assert.ok(t.unlockLevel >= 1 && t.unlockLevel <= 99);
    const levels = styles.get(t.style) ?? [];
    levels.push(t.unlockLevel);
    styles.set(t.style, levels);
  }
  for (const style of ['melee', 'archery', 'magic', 'sneak']) {
    const levels = styles.get(style);
    assert.ok(levels && levels.length >= 3, `${style} needs a technique tree`);
    assert.ok(Math.min(...levels) <= 5, `${style} needs an early unlock`);
  }
});

test('the sneak ladder is reachable — daggers carry techStyle, the tanto abstains', () => {
  const knives = [...ITEMS.values()].filter(
    (i) => (i.weapon?.backstabMult ?? 0) >= 2.2 && !i.id.includes('tanto'),
  );
  assert.ok(knives.length >= 15, 'the rogue roster went missing');
  for (const k of knives) {
    assert.equal(k.weapon!.techStyle, 'sneak', `${k.id} cannot reach the sneak ladder`);
  }
  const tantos = [...ITEMS.values()].filter((i) => i.id.includes('tanto') && i.weapon);
  assert.ok(tantos.length >= 1, 'the tanto line went missing');
  for (const t of tantos) {
    assert.equal(t.weapon!.techStyle, undefined, `${t.id} is the fighter's dagger — melee ladder`);
  }
});

test('trade-skill law: every recipe belongs to a named trade, at that trade\'s station', () => {
  // No generic "crafting" — a recipe trains the profession that makes
  // its kind of thing, and each trade works at its own bench.
  const TRADES = ['smithing', 'woodworking', 'leatherworking', 'tailoring', 'cooking', 'herbalism', 'enchanting'];
  const HOME: Record<string, string[]> = {
    smithing: ['furnace', 'anvil'],
    woodworking: ['carving_bench'],
    leatherworking: ['tanning_rack'],
    tailoring: ['loom'],
    cooking: ['fire', 'workbench'],
    herbalism: ['alembic'],
    enchanting: ['enchanting_table'],
  };
  for (const r of RECIPES.values()) {
    assert.ok(TRADES.includes(r.skill), `${r.id}: '${r.skill}' is not a trade skill`);
    if (r.station) {
      assert.ok(
        HOME[r.skill]!.includes(r.station),
        `${r.id}: a ${r.skill} recipe at the ${r.station} — wrong bench`,
      );
    }
  }
  // Every trade has recipes, and the anywhere-craftables stay a short list.
  const bySkill = new Map<string, number>();
  const anywhere: string[] = [];
  for (const r of RECIPES.values()) {
    bySkill.set(r.skill, (bySkill.get(r.skill) ?? 0) + 1);
    if (!r.station) anywhere.push(r.id);
  }
  for (const tr of TRADES) assert.ok((bySkill.get(tr) ?? 0) > 0, `trade ${tr} has no recipes`);
  assert.ok(anywhere.length <= 3, `field-craft list grew: ${anywhere.join(', ')}`);
});

test('prepared-material law: every trade good has a source and a sink', () => {
  const dropped = new Set<string>();
  for (const t of LOOT_TABLES.values()) {
    for (const e of t.entries) if (e.item) dropped.add(e.item);
  }
  // Raw combat drops that feed the tanner and the weaver.
  for (const raw of ['scrap_hide', 'linen_scrap', 'gloomsilk_thread', 'cowhide', 'wolf_fur']) {
    assert.ok(ITEMS.has(raw), `${raw} missing`);
    assert.ok(dropped.has(raw), `${raw} drops from no one`);
  }
  // Prepared materials: each has a producing recipe AND a consuming recipe —
  // raw thing → trade good → product, the profession's whole day.
  for (const mat of ['leather', 'hardened_leather', 'cloth', 'linen', 'gloomsilk', 'twine']) {
    assert.ok(ITEMS.has(mat), `${mat} missing`);
    const makers = [...RECIPES.values()].filter((r) => r.output.item === mat);
    const users = [...RECIPES.values()].filter((r) => r.inputs.some((i) => i.item === mat));
    assert.ok(makers.length > 0, `${mat} has no producing recipe`);
    assert.ok(users.length > 0, `${mat} is consumed by nothing`);
  }
  // Every craftable bow is strung with twine.
  for (const item of ITEMS.values()) {
    if (item.weapon?.ammo !== 'arrow') continue;
    const r = [...RECIPES.values()].find((x) => x.output.item === item.id);
    if (!r) continue; // drop-only finds
    assert.ok(
      r.inputs.some((i) => i.item === 'twine'),
      `${item.id} is a bow with no bowstring`,
    );
  }
});

test('weapon oils: valid statuses, every vial is brewable, potency climbs the skill', () => {
  const vials = [...ITEMS.values()].filter((i) => i.coating);
  assert.ok(vials.length >= 4, 'the poison-maker needs a shelf of vials');
  const brewReq = new Map<string, number>();
  for (const r of RECIPES.values()) {
    if (vials.some((v) => v.id === r.output.item)) {
      assert.equal(r.skill, 'herbalism', `${r.id} — poison-making lives in herbalism`);
      assert.equal(r.station, 'alembic', `${r.id} brews at the alembic`);
      brewReq.set(r.output.item, r.levelReq);
    }
  }
  for (const v of vials) {
    const c = v.coating!;
    assert.ok((STATUS_IDS as readonly string[]).includes(c.status.status), `${v.id} bad status`);
    assert.ok(c.durationSec > 0 && c.status.durationTicks > 0 && c.status.power > 0);
    assert.ok(brewReq.has(v.id), `${v.id} has no brew recipe — unmakeable poison`);
  }
  // Within a family, higher herbalism = stronger and longer oils.
  const venoms = vials
    .filter((v) => v.coating!.status.status === 'venom')
    .sort((a, b) => brewReq.get(a.id)! - brewReq.get(b.id)!);
  for (let i = 1; i < venoms.length; i++) {
    assert.ok(
      venoms[i]!.coating!.status.power > venoms[i - 1]!.coating!.status.power,
      'venom potency must climb the ladder',
    );
    assert.ok(
      venoms[i]!.coating!.durationSec > venoms[i - 1]!.coating!.durationSec,
      'coat duration must climb the ladder',
    );
  }
});

test('enchanting: every enchant is inscribable, every reagent is obtainable', async () => {
  const { ENCHANT_DEFS, ELEMENT_REAGENT } = await import('./equipment/enchants.js');
  const { NODES } = await import('./nodes.js');
  const { CROPS } = await import('./crops.js');
  const dropped = new Set<string>();
  for (const t of LOOT_TABLES.values()) {
    for (const e of t.entries) if (e.item) dropped.add(e.item);
  }
  const gathered = new Set<string | undefined>([
    ...NODES.map((n) => n.bonusYield?.item),
    ...NODES.map((n) => n.yieldItem),
    ...[...CROPS.values()].map((c) => c.yield.item),
  ]);
  for (const e of ENCHANT_DEFS) {
    // Scroll item exists and points back at its enchant.
    const scroll = ITEMS.get(`scroll_${e.id}`);
    assert.ok(scroll, `${e.id} has no scroll item`);
    assert.equal(scroll!.enchant, e.id);
    assert.ok(scroll!.stackable, `${scroll!.id} must stack — scrolls are trade goods`);
    // Inscribe recipe exists, trains enchanting at the table, gates at the def's level.
    const r = RECIPES.get(`inscribe_${e.id}`);
    assert.ok(r, `${e.id} has no inscribe recipe`);
    assert.equal(r!.skill, 'enchanting');
    assert.equal(r!.station, 'enchanting_table');
    assert.equal(r!.levelReq, e.level);
    assert.equal(r!.output.item, scroll!.id);
    // Every input resolves and is obtainable (dropped, gathered, or itself craftable).
    for (const inp of r!.inputs) {
      assert.ok(ITEMS.has(inp.item), `${r!.id} input ${inp.item} missing`);
      const craftable = [...RECIPES.values()].some((x) => x.output.item === inp.item);
      assert.ok(
        dropped.has(inp.item) || gathered.has(inp.item) || craftable,
        `${r!.id} input ${inp.item} is unobtainable`,
      );
    }
  }
  // The binder and every essence flow from the world.
  assert.ok(dropped.has('arcane_dust'), 'arcane dust drops from no one');
  for (const reagent of Object.values(ELEMENT_REAGENT)) {
    const craftable = [...RECIPES.values()].some((x) => x.output.item === reagent);
    assert.ok(
      dropped.has(reagent!) || gathered.has(reagent!) || craftable,
      `${reagent} is unobtainable`,
    );
  }
  // Gem grinding gives every element gem a second life as dust.
  for (const gem of ['emberstone', 'frostshard', 'stormpearl', 'bloomstone']) {
    assert.ok(RECIPES.has(`grind_${gem}`), `${gem} cannot be ground`);
  }
});

test('homing abilities are well-formed seekers', () => {
  let homing = 0;
  for (const [id, ab] of ABILITIES) {
    if (ab.homing === undefined) continue;
    homing++;
    assert.ok(ab.homing > 0, `${id} homing turn rate must be positive`);
    assert.ok(ab.projectiles && ab.projectiles >= 1, `${id} homing without projectiles`);
    assert.ok(ab.element, `${id} seekers must name a school (visual identity)`);
    assert.ok(!ab.pierce, `${id} homing + pierce would orbit-farm a single target`);
  }
  assert.ok(homing >= 3, 'the seeker family needs its varieties');
});

test('sigils and passives on items resolve', () => {
  let sigils = 0;
  let passives = 0;
  for (const [id, item] of ITEMS) {
    if (item.sigil) {
      sigils++;
      assert.ok(abilityDef(item.sigil), `${id} sigil '${item.sigil}' missing`);
      assert.equal(item.equipSlot, 'sigil', `${id} grants an ultimate but is not sigil-slotted`);
    }
    if (item.passive) {
      passives++;
      assert.ok(PASSIVES[item.passive], `${id} passive '${item.passive}' missing`);
      assert.ok(item.equipSlot, `${id} passive rides unequippable gear`);
    }
  }
  assert.ok(sigils >= 1, 'at least one boss sigil at launch');
  assert.ok(passives >= 4, 'at least four passive gear pieces at launch');
});

test('ability shape data is coherent — the executor never guesses', () => {
  for (const [id, ab] of ABILITIES) {
    if (ab.shape === 'ground_field') {
      assert.ok((ab.fieldTicks ?? 0) > 0, `${id}: a field needs a lifetime`);
      assert.ok((ab.pulseEveryTicks ?? 0) > 0, `${id}: a field needs a pulse cadence`);
      assert.ok((ab.fieldTicks ?? 0) > (ab.pulseEveryTicks ?? 0), `${id}: field dies before pulsing`);
    }
    if (ab.shape === 'flurry') {
      assert.ok((ab.hits ?? 0) >= 2, `${id}: a flurry of one is a swing`);
      assert.ok((ab.range ?? 0) > 0, `${id}: flurry needs reach`);
    }
    if (ab.shape === 'beam') {
      assert.ok((ab.range ?? 0) > 0, `${id}: a beam needs length`);
      assert.ok((ab.width ?? 0.55) > 0 && (ab.width ?? 0.55) < 2, `${id}: beam width out of band`);
    }
    if (ab.shape === 'leap_slam') {
      assert.ok((ab.dashTiles ?? 0) > 0, `${id}: a leap needs distance`);
      assert.ok((ab.radius ?? 0) > 0, `${id}: a slam needs a crater`);
    }
    if (ab.returns) assert.equal(ab.shape, 'projectile_fan', `${id}: only projectiles boomerang`);
    if (ab.executeBelow) {
      assert.ok(ab.executeBelow.frac > 0 && ab.executeBelow.frac < 1, `${id}: execute frac out of band`);
      assert.ok(ab.executeBelow.mult > 1, `${id}: an execute must actually bonus`);
    }
    if (ab.drainFrac !== undefined) {
      assert.ok(ab.drainFrac > 0 && ab.drainFrac <= 1, `${id}: drain fraction out of band`);
    }
    // Vortex pulls only make sense on centered effects.
    if ((ab.knockback ?? 0) < 0) {
      assert.ok(
        ab.shape === 'ground_aoe' || ab.shape === 'ground_field' || ab.shape === 'nova',
        `${id}: a pull needs a center to pull toward`,
      );
    }
  }
});

test('the arts are not homogenous — every shape family is in play', () => {
  const shapes = new Set([...ABILITIES.values()].map((a) => a.shape));
  for (const s of [
    'melee_arc',
    'dash_strike',
    'projectile_fan',
    'nova',
    'ground_aoe',
    'self_buff',
    'summon',
    'chain_zap',
    'pulse_nova',
    'beam',
    'ground_field',
    'leap_slam',
    'flurry',
  ]) {
    assert.ok(shapes.has(s as never), `no ability uses shape '${s}' — variety regressed`);
  }
  // The modifier axes each have at least one bearer in the wild.
  const all = [...ABILITIES.values()];
  assert.ok(all.some((a) => a.executeBelow), 'no execute abilities');
  assert.ok(all.some((a) => a.drainFrac), 'no drain abilities');
  assert.ok(all.some((a) => a.returns), 'no boomerang abilities');
  assert.ok(all.some((a) => (a.knockback ?? 0) < 0), 'no vortex pulls');
});

test('recipes reference real items', () => {
  for (const r of RECIPES.values()) {
    for (const input of r.inputs) assert.ok(ITEMS.has(input.item), `${r.id} input missing`);
    assert.ok(ITEMS.has(r.output.item), `${r.id} output '${r.output.item}' missing`);
    if (r.burnResult) assert.ok(ITEMS.has(r.burnResult), `${r.id} burn result missing`);
  }
});

test('crops: seeds, yields, and stage tiles all resolve', () => {
  for (const [id, crop] of CROPS) {
    assert.ok(ITEMS.has(crop.seedItem), `${id} seed '${crop.seedItem}' missing`);
    assert.ok(ITEMS.has(crop.yield.item), `${id} yield '${crop.yield.item}' missing`);
    assert.ok(crop.yield.min >= 1 && crop.yield.max >= crop.yield.min, `${id} yield malformed`);
    assert.ok(crop.seedReturn.min >= 0 && crop.seedReturn.max >= crop.seedReturn.min);
    assert.ok(crop.growMinutes > 0 && crop.levelReq >= 1 && crop.xp > 0);
    assert.equal(CROP_BY_SEED.get(crop.seedItem), crop, `${id} seed lookup broken`);
    for (const stage of [1, 2] as const) {
      const tile = tileForStage(crop, stage);
      assert.ok(TILE_DEFS[tile], `${id} stage ${stage} tile has no def`);
      assert.equal(TILE_DEFS[tile].solid, false, `${id} crop tiles must be walkable`);
      assert.deepEqual(CROP_TILES.get(tile), { crop, stage }, `${id} tile lookup broken`);
    }
  }
  assert.equal(TILE_DEFS[Tile.CropSprout].solid, false, 'sprout must be walkable');
  assert.equal(TILE_DEFS[Tile.Tilled].solid, false, 'tilled soil must be walkable');
});

test('crop stages: boundaries and watering boost math', () => {
  const carrot = CROPS.get('carrot')!;
  const total = growMs(carrot);
  assert.equal(stageForElapsed(carrot, 0), 0);
  assert.equal(stageForElapsed(carrot, stageEndMs(carrot, 0) - 1), 0);
  assert.equal(stageForElapsed(carrot, stageEndMs(carrot, 0)), 1);
  assert.equal(stageForElapsed(carrot, total - 1), 1);
  assert.equal(stageForElapsed(carrot, total), 2);
  assert.equal(stageForElapsed(carrot, total * 10), 2);
  // A watering boost is plain added milliseconds: elapsed + boost crosses
  // the same thresholds the clock would.
  const elapsed = total * 0.5;
  const boost = 0.35 * (total - elapsed);
  assert.equal(stageForElapsed(carrot, elapsed + boost), 1);
  assert.equal(stageForElapsed(carrot, total - boost + boost), 2);
});

test('mining ladder: ten ores climb 1→90, every yield feeds the forge, tools keep pace', async () => {
  const { RECIPES } = await import('./recipes.js');
  const mining = NODES.filter((n) => n.skill === 'mining');
  // The full ladder, in level order — a fresh bracket every 10-15
  // levels from the first copper swing to the starfall crater.
  const ladder = [
    ['copper_ore', 1], ['tin_ore', 1], ['iron_ore', 15], ['coal', 20],
    ['silver_ore', 30], ['gold_ore', 40], ['mithril_ore', 50],
    ['adamant_ore', 65], ['obsidian_shard', 78], ['starmetal_ore', 90],
  ] as const;
  assert.equal(mining.length, ladder.length, 'every rung has a deposit');
  for (const [item, lvl] of ladder) {
    const node = mining.find((n) => n.yieldItem === item);
    assert.ok(node, `${item} has a mining node`);
    assert.equal(node!.levelReq, lvl, `${item} gates at ${lvl}`);
    // Every ore is CONSUMED: smelted into a bar or smithed directly.
    const used = [...RECIPES.values()].some((r) => r.inputs.some((i) => i.item === item));
    assert.ok(used, `${item} feeds at least one recipe`);
  }
  // Later rock is slower rock: baseTicks never falls as levels climb.
  const sorted = [...mining].sort((a, b) => a.levelReq - b.levelReq);
  for (let i = 1; i < sorted.length; i++) {
    assert.ok(sorted[i]!.baseTicks >= sorted[i - 1]!.baseTicks, 'mining effort climbs the ladder');
  }
  // Every bar of the high ladder smelts, and the smelt gate matches
  // the ore's mining gate so a self-sufficient smith never stalls.
  for (const [bar, lvl] of [['silver_bar', 30], ['mithril_bar', 50], ['adamant_bar', 65], ['starsteel_bar', 90]] as const) {
    const r = RECIPES.get(`smelt_${bar.replace('_bar', '')}`);
    assert.ok(r, `${bar} smelts`);
    assert.equal(r!.levelReq, lvl, `${bar} gate rides its ore`);
    assert.equal(r!.station, 'furnace');
  }
  // The tool ladder: pickaxe power climbs one point per metal tier.
  const powers = ['bronze', 'iron', 'steel', 'mithril', 'adamant', 'starsteel'].map(
    (m) => ITEMS.get(`${m}_pickaxe`)?.tool?.power,
  );
  assert.deepEqual(powers, [1, 2, 3, 4, 5, 6], 'pickaxe power climbs the tiers');
  for (const m of ['iron', 'steel', 'mithril', 'adamant', 'starsteel']) {
    assert.ok(RECIPES.has(`smith_${m}_pickaxe`), `${m} pickaxe smiths`);
    assert.ok(RECIPES.has(`smith_${m}_axe`), `${m} axe smiths`);
  }
});

test('tool-tier gates: hard material refuses cheap tools, and the ladder never deadlocks', async () => {
  const { RECIPES } = await import('./recipes.js');
  const { TOOL_TIER_NAMES } = await import('./items.js');
  // The gate table, pinned: which tier each node demands.
  const gates: Array<[string, number]> = [
    // pickaxe rungs
    ['copper_ore', 1], ['tin_ore', 1], ['iron_ore', 1],
    ['coal', 2], ['silver_ore', 2],
    ['gold_ore', 3], ['mithril_ore', 3],
    ['adamant_ore', 4],
    ['obsidian_shard', 5], ['starmetal_ore', 5],
    // axe rungs
    ['log', 1], ['oak_log', 2], ['willow_log', 3], ['yew_log', 4],
  ];
  for (const [item, power] of gates) {
    const node = NODES.find((n) => n.yieldItem === item);
    assert.ok(node, `${item} has a node`);
    assert.equal(node!.minPower ?? 1, power, `${item} demands tier ${power}`);
    assert.ok(TOOL_TIER_NAMES[power], `tier ${power} has a name for the gate message`);
  }
  // Every named gate is reachable: some tool item of the node's type
  // carries at least that power.
  for (const node of NODES) {
    if (!node.tool || !node.minPower) continue;
    const reachable = [...ITEMS.values()].some(
      (d) => d.tool?.type === node.tool && d.tool.power >= node.minPower!,
    );
    assert.ok(reachable, `${node.name} gate has a tool that meets it`);
  }
  // THE BOOTSTRAP LAW: each smithable pickaxe must be forgeable using
  // only ore the PREVIOUS tier's pickaxe can free — otherwise the
  // ladder deadlocks and no one climbs past the gap. Walk each tool
  // recipe's bar back to its ore and check the ore node's gate.
  const barOre: Record<string, string> = {
    iron_bar: 'iron_ore', steel_bar: 'iron_ore', mithril_bar: 'mithril_ore',
    adamant_bar: 'adamant_ore', starsteel_bar: 'starmetal_ore',
  };
  const tiers = ['iron', 'steel', 'mithril', 'adamant', 'starsteel'];
  for (const metal of tiers) {
    const recipe = RECIPES.get(`smith_${metal}_pickaxe`);
    assert.ok(recipe, `${metal} pickaxe recipe exists`);
    const prevPower = ITEMS.get(`${metal}_pickaxe`)!.tool!.power - 1;
    for (const input of recipe!.inputs) {
      const ore = barOre[input.item];
      if (!ore) continue;
      const oreNode = NODES.find((n) => n.yieldItem === ore)!;
      assert.ok(
        (oreNode.minPower ?? 1) <= prevPower,
        `${metal} pickaxe needs ${ore}, which the previous tier (power ${prevPower}) must reach`,
      );
    }
    // Bars burn coal too (smelting) — coal must sit below every tier
    // that consumes it, and it does: gate 2, first consumer steel (3).
  }
  const coalNode = NODES.find((n) => n.yieldItem === 'coal')!;
  assert.ok((coalNode.minPower ?? 1) <= 2, 'coal opens to the iron pick that steel bars need');
});

test('foraging nodes, buildables, and shop stock resolve', () => {
  for (const node of NODES) {
    assert.ok(ITEMS.has(node.yieldItem), `${node.name} yield '${node.yieldItem}' missing`);
    if (node.bonusYield) {
      const { item, table } = node.bonusYield;
      assert.ok(
        (item !== undefined) !== (table !== undefined),
        `${node.name} bonus yield needs exactly one of item/table`,
      );
      if (item) assert.ok(ITEMS.has(item), `${node.name} bonus yield missing`);
      if (table) assert.ok(LOOT_TABLES.has(table), `${node.name} bonus table missing`);
      assert.ok(node.bonusYield.chance > 0 && node.bonusYield.chance <= 1);
    }
  }
  const foraging = NODES.filter((n) => n.skill === 'foraging');
  assert.ok(foraging.length >= 4, 'foraging needs wild plants to pick');
  for (const b of BUILDABLES.values()) {
    for (const m of b.materials) assert.ok(ITEMS.has(m.item), `${b.id} material missing`);
    assert.ok(TILE_DEFS[b.tile], `${b.id} tile has no def`);
  }
  for (const entry of GENERAL_STORE) {
    assert.ok(ITEMS.has(entry.item), `shop '${entry.item}' missing`);
  }
  for (const shop of SHOPS.values()) {
    assert.ok(shop.stock.length > 0, `shop '${shop.id}' has an empty shelf`);
    for (const entry of shop.stock) {
      assert.ok(ITEMS.has(entry.item), `shop '${shop.id}': '${entry.item}' missing`);
      assert.ok(entry.price > 0, `shop '${shop.id}': '${entry.item}' has no price`);
    }
  }
});

/**
 * THE RECIPE IS KNOWLEDGE — acquisition honesty. Every unlockable
 * recipe has a scroll that teaches it; every trainer scroll is on a
 * shelf somewhere; every drop scroll is reachable in a loot table;
 * and neither route leaks into the other. Core recipes never get
 * scrolls — everyone already knows them.
 */
test('recipe unlocks are honest: scrolls exist, shelves and troves cover them', () => {
  // Which items each acquisition route can actually pay out.
  const shelved = new Set<string>();
  for (const shop of SHOPS.values()) for (const e of shop.stock) shelved.add(e.item);
  const lootable = new Set<string>();
  for (const t of LOOT_TABLES.values()) {
    for (const e of t.entries) if (e.item) lootable.add(e.item);
  }

  for (const r of RECIPES.values()) {
    const scroll = recipeScrollId(r.id);
    if (r.unlock === 'core') {
      assert.ok(!ITEMS.has(scroll), `core recipe '${r.id}' should not have a scroll`);
      continue;
    }
    const def = ITEMS.get(scroll);
    assert.ok(def, `unlockable recipe '${r.id}' has no scroll item`);
    assert.equal(def!.teaches, r.id, `scroll '${scroll}' teaches the wrong recipe`);
    if (r.unlock === 'trainer') {
      assert.ok(shelved.has(scroll), `trainer recipe '${r.id}' is on no shop shelf`);
      assert.ok(!lootable.has(scroll), `trainer recipe '${r.id}' leaked into loot`);
    } else {
      assert.ok(lootable.has(scroll), `drop recipe '${r.id}' is in no loot table`);
      assert.ok(!shelved.has(scroll), `drop recipe '${r.id}' leaked onto a shelf`);
    }
  }
  // Every teaches pointer resolves to a real, non-core recipe.
  for (const def of ITEMS.values()) {
    if (!def.teaches) continue;
    const r = RECIPES.get(def.teaches);
    assert.ok(r, `item '${def.id}' teaches unknown recipe '${def.teaches}'`);
    assert.notEqual(r!.unlock, 'core', `item '${def.id}' teaches a core recipe`);
  }
  // Every shop an actor advertises exists; every trainer shop has a keeper.
  const carried = new Set<string>();
  for (const actor of NPC_ACTORS.values()) {
    if (!actor.shop) continue;
    assert.ok(SHOPS.has(actor.shop), `actor '${actor.id}' advertises unknown shop '${actor.shop}'`);
    carried.add(actor.shop);
  }
  for (const shop of SHOPS.values()) {
    if (shop.id === 'general_store') continue; // the counter tile serves it too
    // Trainer shelves are content debt while the world rebuilds out
    // from Dawnmead: the shops (and their scroll economy) stay
    // defined, and the settlements that keep them come later.
    if (shop.id.startsWith('trainer_')) continue;
    assert.ok(carried.has(shop.id), `shop '${shop.id}' has no actor to keep it`);
  }
});

test('livestock produce/lays and consumable buffs resolve', () => {
  for (const [id, npc] of NPCS) {
    if (npc.produce) assert.ok(ITEMS.has(npc.produce.item), `${id} produce missing`);
    if (npc.lays) {
      assert.ok(ITEMS.has(npc.lays.item), `${id} lays missing`);
      assert.ok(npc.lays.minSec > 0 && npc.lays.maxSec >= npc.lays.minSec);
    }
  }
  let tonics = 0;
  let foodBuffs = 0;
  for (const [id, item] of ITEMS) {
    if (!item.buff) continue;
    assert.ok(item.buff.durationSec > 0, `${id} buff has no duration`);
    assert.ok(
      item.buff.speedMult || item.buff.shieldHp || item.buff.gatherSpeed || item.buff.regenPer4s,
      `${id} buff does nothing`,
    );
    if (item.buff.channel === 'tonic') tonics++;
    else foodBuffs++;
  }
  assert.ok(tonics >= 3, 'herbalism needs tonic variety');
  assert.ok(foodBuffs >= 2, 'cooking needs buff food');
});

test('summon abilities define their summon; damage shapes define reach', () => {
  for (const [id, ab] of ABILITIES) {
    if (ab.shape === 'summon') assert.ok(ab.summon, `${id} summons nothing`);
    if (ab.shape === 'projectile_fan') {
      assert.ok((ab.projectiles ?? 0) >= 1 && (ab.range ?? 0) > 0, `${id} fan malformed`);
    }
    if (ab.shape === 'nova' || ab.shape === 'ground_aoe' || ab.shape === 'pulse_nova') {
      assert.ok((ab.radius ?? 0) > 0, `${id} has no radius`);
    }
    if (ab.shape === 'pulse_nova') {
      assert.ok((ab.pulses ?? 0) >= 2 && (ab.pulseEveryTicks ?? 0) > 0, `${id} pulses malformed`);
    }
    if (ab.shape === 'chain_zap') {
      assert.ok((ab.chainTargets ?? 0) >= 1 && (ab.radius ?? 0) > 0, `${id} chain malformed`);
    }
    if (ab.shape === 'dash_strike') {
      assert.ok((ab.dashTiles ?? 0) !== 0, `${id} has no dash`);
    }
  }
});

test('structure templates: whole roster compiles with real tiles', () => {
  assert.ok(STRUCTURE_TEMPLATES.length >= 9, 'starter roster incomplete');
  const ids = new Set<string>();
  for (const tpl of STRUCTURE_TEMPLATES) {
    assert.doesNotThrow(() => compileTemplate(tpl), `${tpl.id} does not compile`);
    assert.ok(!ids.has(tpl.id), `duplicate template id '${tpl.id}'`);
    ids.add(tpl.id);
    for (const [ch, cell] of Object.entries(tpl.legend)) {
      assert.equal(ch.length, 1, `${tpl.id} legend key '${ch}' is not a single char`);
      if (cell.tile !== undefined) {
        assert.ok(TILE_DEFS[cell.tile], `${tpl.id} char '${ch}' tile has no def`);
      }
    }
  }
});

test('structure stamping: flipX keeps the doorway on the perimeter', () => {
  const b = new ZoneBuilder('scratch', 'Scratch', { x: 0, y: 0 }, 24, 24, Tile.Grass);
  const ox = 4;
  const oy = 4;
  b.stamp(COTTAGE_SMALL, ox, oy, { flipX: true });
  const w = templateWidth(COTTAGE_SMALL);
  const h = templateHeight(COTTAGE_SMALL);
  const doors: Array<{ x: number; y: number }> = [];
  for (let y = oy; y < oy + h; y++) {
    for (let x = ox; x < ox + w; x++) {
      if (b.get(x, y) === Tile.DoorwayWood) doors.push({ x, y });
    }
  }
  assert.equal(doors.length, 1, 'cottage must stamp exactly one doorway');
  const d = doors[0]!;
  assert.ok(
    d.x === ox || d.y === oy || d.x === ox + w - 1 || d.y === oy + h - 1,
    `doorway at (${d.x},${d.y}) is not on the stamped footprint perimeter`,
  );
});

test('structure templates: double entries are wide-doorway runs, not door pairs', () => {
  // The smithy, inn, and chapel author their 2-wide entries as WIDE
  // doorway tiles so the renderer merges them into one full-width
  // opening. A 'DD' pair of plain doorways is reserved for buildings
  // that genuinely want two separate doors with a divider.
  for (const tpl of STRUCTURE_TEMPLATES) {
    for (const row of tpl.rows) {
      assert.ok(!row.includes('DD'), `${tpl.id} authors a plain-door pair — use '==' (wide)`);
    }
  }
  const wideRuns = [
    { tpl: SMITHY, tile: Tile.DoorwayStoneWide },
    { tpl: INN_LARGE, tile: Tile.DoorwayWoodWide },
    { tpl: CHAPEL, tile: Tile.DoorwayStoneWide },
  ];
  for (const { tpl, tile } of wideRuns) {
    let adjacentPair = false;
    for (const row of tpl.rows) {
      for (let x = 0; x + 1 < row.length; x++) {
        if (row[x] === '=' && row[x + 1] === '=') adjacentPair = true;
      }
    }
    assert.ok(adjacentPair, `${tpl.id} lost its 2-wide doorway run`);
    assert.equal(tpl.legend['=']!.tile, tile, `${tpl.id} '=' maps to the wrong wide doorway`);
  }
});

test('structure stamping: space cells are transparent', () => {
  const b = new ZoneBuilder('scratch', 'Scratch', { x: 0, y: 0 }, 24, 24, Tile.Grass);
  b.stamp(WELL_PLAZA, 2, 2);
  // The plaza disc's corners are spaces — the grass beneath survives.
  assert.equal(b.get(2, 2), Tile.Grass);
  assert.equal(b.get(8, 8), Tile.Grass);
  // ...while the disc itself landed.
  assert.equal(b.get(5, 5), Tile.WallStone); // the well
  assert.equal(b.get(4, 2), Tile.StoneFloor);
});

test('structure templates: JSON round-trip is lossless and re-validated', () => {
  for (const tpl of STRUCTURE_TEMPLATES) {
    const back = templateFromJson(templateToJson(tpl));
    assert.deepEqual(back, tpl, `${tpl.id} did not survive the round trip`);
  }
  assert.throws(() => templateFromJson('{"id":"bad","legend":{},"rows":["x"]}'));
});

test('dawnmead: awakening anchors, stations, pens, and the lane seam hold', () => {
  const z = buildDawnmead();
  const at = (x: number, y: number): Tile => z.ground[y * z.width + x]! as Tile;
  // The spawn stands inside the Waking Ring (world coords).
  assert.deepEqual(z.spawn, { x: -81.5, y: 48.5 });
  assert.equal(TILE_DEFS[at(14, 32)].solid, false, 'spawn tile must be walkable');
  // The lane exits the east edge on rows that meet Bramblewick's west
  // road (world y 47-49 = local y 31-33 with origin y 16).
  for (const y of [31, 32, 33]) {
    assert.equal(at(95, y), Tile.Path, `lane row ${y} must reach the east edge`);
  }
  const counts = new Map<number, number>();
  for (const t of z.ground) counts.set(t, (counts.get(t) ?? 0) + 1);
  assert.equal(counts.get(Tile.Campfire) ?? 0, 1, 'village campfire missing');
  assert.equal(counts.get(Tile.Workbench) ?? 0, 1, 'village workbench missing');
  assert.equal(counts.get(Tile.ChestWood) ?? 0, 1, 'the shed chest missing');
  assert.ok((counts.get(Tile.BerryBush) ?? 0) >= 5, 'the berry banks thinned');
  // The animals and their teacher-rats stand in the zone spawns.
  const spawnKinds = new Map((z.spawns ?? []).map((s) => [s.npc, s.count]));
  assert.equal(spawnKinds.get('chicken'), 4);
  assert.equal(spawnKinds.get('cow'), 2);
  assert.equal(spawnKinds.get('rat'), 3);
  // Six villagers, each with their post; five keep routine hours.
  const actors = z.actorSpawns ?? [];
  assert.equal(actors.length, 6);
  for (const slug of [
    'elder_rowan',
    'warden_bryn',
    'hearthkeeper_iona',
    'farmer_hobb',
    'tinker_fen',
    'young_pip',
  ]) {
    assert.ok(actors.some((a) => a.actor === slug), `${slug} missing from the village`);
  }
  assert.equal(actors.filter((a) => a.routine).length, 6, 'every villager keeps hours');
  // The zone survives the editor's JSON round trip. zoneFromJson
  // zero-fills the flat elev layer and the re-export then carries it,
  // so elevation is compared out; everything else must be byte-exact.
  const json = zoneToJson(z);
  assert.equal(json.elev, undefined, 'dawnmead is a flat zone');
  const { elev: _rt, ...back } = zoneToJson(zoneFromJson(json));
  const { elev: _src, ...src } = json;
  assert.deepEqual(back, src);
});

test('dawnmead: every doorway (shed included) walks from the spawn', () => {
  const z = buildDawnmead();
  const walkable = (x: number, y: number): boolean =>
    x >= 0 && y >= 0 && x < z.width && y < z.height &&
    !TILE_DEFS[z.ground[y * z.width + x]! as Tile].solid;
  const seen = new Uint8Array(z.width * z.height);
  const queue: number[] = [32 * z.width + 14]; // the Waking Ring
  seen[queue[0]!] = 1;
  while (queue.length > 0) {
    const i = queue.pop()!;
    const x = i % z.width;
    const y = Math.floor(i / z.width);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = x + dx;
      const ny = y + dy;
      const ni = ny * z.width + nx;
      if (walkable(nx, ny) && !seen[ni]) {
        seen[ni] = 1;
        queue.push(ni);
      }
    }
  }
  const unreachable: string[] = [];
  for (let i = 0; i < z.ground.length; i++) {
    const t = z.ground[i];
    if ((t === Tile.DoorwayStone || t === Tile.DoorwayWood) && !seen[i]) {
      unreachable.push(`(${i % z.width},${Math.floor(i / z.width)})`);
    }
  }
  assert.deepEqual(unreachable, [], `doorways cut off from spawn: ${unreachable.join(' ')}`);
  // The east lane truly connects: the edge tile the road leaves by is
  // reachable from the Ring, so a waker can walk to Bramblewick.
  assert.equal(seen[32 * z.width + 95], 1, 'the lane east is severed');
});

test('amberford: the crossroads town holds its anchors, stations, and gates', () => {
  const z = buildAmberford();
  assert.equal(z.id, 'amberford');
  // The zone stamps into the master plan's rect exactly.
  assert.deepEqual(z.origin, { x: AMBERFORD_RECT.x, y: AMBERFORD_RECT.y });
  assert.equal(z.width, AMBERFORD_RECT.w);
  assert.equal(z.height, AMBERFORD_RECT.h);
  const at = (x: number, y: number): Tile => z.ground[y * z.width + x]! as Tile;
  // The respawn hearth stands on the Market Round.
  assert.deepEqual(z.spawn, { x: 156.5, y: 28.5 });
  assert.equal(TILE_DEFS[at(52, 44)].solid, false, 'spawn tile must be walkable');
  // The gates meet the carved worldgen roads tile-for-tile: the First
  // Road's rows at the west edge, the High Road's mouth at the north.
  for (const y of [51, 52, 53]) {
    assert.equal(at(0, y), Tile.Path, `Fordgate row ${y} must reach the west edge`);
  }
  for (const x of [53, 54, 55]) {
    assert.equal(at(x, 0), Tile.Path, `North Gate col ${x} must reach the north edge`);
  }
  // The East Road stub wanders out the east edge toward Saltmere-someday.
  assert.equal(at(111, 61), Tile.Path, 'the east stub must reach the edge');
  const counts = new Map<number, number>();
  for (const t of z.ground) counts.set(t, (counts.get(t) ?? 0) + 1);
  // THE BANK: the world's first banking chests and the vault behind them.
  assert.equal(counts.get(Tile.BankChest) ?? 0, 2, 'the bank floor lost its chests');
  assert.ok((counts.get(Tile.Vault) ?? 0) >= 2, 'the vault room lost its boxes');
  // Craft Row carries every trainer trade's station, plus the town mill.
  for (const [tile, name] of [
    [Tile.Furnace, 'furnace'],
    [Tile.Anvil, 'anvil'],
    [Tile.Loom, 'loom'],
    [Tile.TanningRack, 'tanning rack'],
    [Tile.CarvingBench, 'carving bench'],
    [Tile.Alembic, 'alembic'],
    [Tile.Workbench, 'workbench'],
  ] as const) {
    assert.ok((counts.get(tile) ?? 0) >= 1, `craft station missing: ${name}`);
  }
  // The market, the water, and the working town.
  assert.ok((counts.get(Tile.MarketStall) ?? 0) >= 4, 'the Round lost its stalls');
  assert.ok((counts.get(Tile.FishingSpot) ?? 0) >= 2, 'the pond lost its fishing');
  assert.ok((counts.get(Tile.Bridge) ?? 0) >= 10, 'docks and spans missing');
  assert.ok((counts.get(Tile.TreeOak) ?? 0) >= 18, 'the orchard thinned');
  // Livestock only — the named people arrive in the people pass.
  const spawnKinds = new Map((z.spawns ?? []).map((s) => [s.npc, s.count]));
  assert.equal(spawnKinds.get('cow'), 3);
  assert.equal(spawnKinds.get('chicken'), 3);
  // The people pass: fifteen residents, every one on routine hours.
  const amberActors = z.actorSpawns ?? [];
  assert.equal(amberActors.length, 15, 'Amberford lost residents');
  for (const slug of [
    'smith_bretta',
    'master_tilo',
    'sage_elowen',
    'banker_cormund',
    'innkeep_dunna',
    'miller_garton',
    'ferryman_peld',
    'grocer_merra',
    'outfitter_hask',
    'captain_aldis',
    'farmer_jorel',
    'farmer_tamsin',
    'keeper_ansel',
    'orchardist_perl',
    'courier_nib',
  ]) {
    assert.ok(amberActors.some((a) => a.actor === slug), `${slug} missing from Amberford`);
  }
  assert.equal(amberActors.filter((a) => a.routine).length, 15, 'every resident keeps hours');
  // The editor JSON round trip holds, flat-zone law included.
  const json = zoneToJson(z);
  assert.equal(json.elev, undefined, 'amberford is a flat zone');
  const { elev: _rt, ...back } = zoneToJson(zoneFromJson(json));
  const { elev: _src, ...src } = json;
  assert.deepEqual(back, src);
});

test('amberford: every doorway walks from the Round, and all three gates connect', () => {
  const z = buildAmberford();
  const walkable = (x: number, y: number): boolean =>
    x >= 0 && y >= 0 && x < z.width && y < z.height &&
    !TILE_DEFS[z.ground[y * z.width + x]! as Tile].solid;
  const seen = new Uint8Array(z.width * z.height);
  const queue: number[] = [44 * z.width + 52]; // the Market Round
  seen[queue[0]!] = 1;
  while (queue.length > 0) {
    const i = queue.pop()!;
    const x = i % z.width;
    const y = Math.floor(i / z.width);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = x + dx;
      const ny = y + dy;
      const ni = ny * z.width + nx;
      if (walkable(nx, ny) && !seen[ni]) {
        seen[ni] = 1;
        queue.push(ni);
      }
    }
  }
  const unreachable: string[] = [];
  for (let i = 0; i < z.ground.length; i++) {
    const t = z.ground[i];
    if (
      (t === Tile.DoorwayStone ||
        t === Tile.DoorwayWood ||
        t === Tile.DoorwayStoneWide ||
        t === Tile.DoorwayWoodWide) &&
      !seen[i]
    ) {
      unreachable.push(`(${i % z.width},${Math.floor(i / z.width)})`);
    }
  }
  assert.deepEqual(unreachable, [], `doorways cut off from the Round: ${unreachable.join(' ')}`);
  // All three road mouths connect to the Round.
  assert.equal(seen[52 * z.width + 0], 1, 'the Fordgate is severed');
  assert.equal(seen[1 * z.width + 54], 1, 'the North Gate is severed');
  assert.equal(seen[61 * z.width + 111], 1, 'the east stub is severed');
  // And the banking floor is truly public: the lobby rug between the
  // two (solid) banking chests must be walkable from the door.
  assert.equal(seen[32 * z.width + 40], 1, 'the bank floor is unreachable');
});

test('silverfall: the mountain capital holds its terraces, stations, and gate', () => {
  const z = buildSilverfall();
  assert.equal(z.id, 'silverfall');
  // The zone stamps into the master plan's rect exactly.
  assert.deepEqual(z.origin, { x: SILVERFALL_RECT.x, y: SILVERFALL_RECT.y });
  assert.equal(z.width, SILVERFALL_RECT.w);
  assert.equal(z.height, SILVERFALL_RECT.h);
  const at = (x: number, y: number): Tile => z.ground[y * z.width + x]! as Tile;
  // The hearth of the north: respawn inside the gate on the avenue.
  assert.deepEqual(z.spawn, { x: -287.5, y: -119.5 });
  // ELEVATION IS REAL: the first terraced town exports a layer that
  // climbs all the way to the Hold, flat at the border apron.
  assert.ok(z.elev, 'silverfall must carry an elevation layer');
  let maxLvl = 0;
  for (const l of z.elev!) maxLvl = Math.max(maxLvl, l);
  assert.equal(maxLvl, 3, 'the Hold stands on the third terrace');
  // The gate road reaches the south border where the High Road lands.
  for (const y of [126, 127]) {
    assert.equal(at(88, y), Tile.Path, `the approach road must reach row ${y}`);
  }
  const counts = new Map<number, number>();
  for (const t of z.ground) counts.set(t, (counts.get(t) ?? 0) + 1);
  const n = (t: Tile): number => counts.get(t) ?? 0;
  // The terraces are fenced and staired by the builder's own law.
  assert.equal(n(Tile.Ramp), 39, 'the Silver Stair lost a flight');
  assert.ok(n(Tile.Cliff) > 500, 'the terrace fences are missing');
  // The mountain's ladder: silver in numbers, the deep teases above.
  assert.ok(n(Tile.RockSilver) >= 8, 'Silverfall without silver');
  assert.ok(n(Tile.RockMithril) >= 1 && n(Tile.RockAdamant) >= 1 && n(Tile.RockGold) >= 1);
  // Every profession works here: the full station roster.
  for (const [tile, name] of [
    [Tile.Furnace, 'furnace'],
    [Tile.Anvil, 'anvil'],
    [Tile.Loom, 'loom'],
    [Tile.TanningRack, 'tanning rack'],
    [Tile.CarvingBench, 'carving bench'],
    [Tile.Alembic, 'alembic'],
    [Tile.Workbench, 'workbench'],
    [Tile.EnchantingTable, 'enchanting table'],
    [Tile.Hearth, 'hearth'],
  ] as const) {
    assert.ok(n(tile) >= 1, `station missing: ${name}`);
  }
  assert.ok(n(Tile.Furnace) >= 5 && n(Tile.Anvil) >= 3, 'the forge city smelts at scale');
  // The bank, the markets, the waters, the high snow.
  assert.ok(n(Tile.Vault) >= 4 && n(Tile.BankChest) >= 3, 'the mountain bank is short');
  assert.ok(n(Tile.MarketStall) >= 7, 'galleria + gate market thinned');
  assert.ok(n(Tile.FishingSpot) >= 4, 'the mere and the pool must fish');
  assert.ok(n(Tile.ArchStone) >= 9, 'the gate arch fell');
  assert.ok(n(Tile.Snow) > 0, 'the high ground lost its snow');
  assert.ok(n(Tile.Brazier) >= 10, 'the stair burns by brazier');
  // Rams only — the people arrive in Epic 6.
  const spawnKinds = new Map((z.spawns ?? []).map((s) => [s.npc, s.count]));
  assert.equal(spawnKinds.get('ram'), 3);
  // The people pass: thirteen named keepers + the watch + the stalls.
  const fallActors = z.actorSpawns ?? [];
  assert.equal(fallActors.length, 21, 'Silverfall lost residents');
  for (const slug of [
    'warden_maren',
    'bursar_odele',
    'enchantress_solvei',
    'marshal_kestrel',
    'forgemistress_balla',
    'foreman_grettir',
    'weaver_ottilie',
    'herbalist_wyn',
    'cook_signy',
    'hostler_osa',
    'mason_petra',
    'gardener_ivo',
    'shrinekeeper_sella',
  ]) {
    assert.ok(fallActors.some((a) => a.actor === slug), `${slug} missing from Silverfall`);
  }
  assert.equal(fallActors.filter((a) => a.actor === 'silverfall_watch').length, 3);
  assert.equal(fallActors.filter((a) => a.actor === 'galleria_trader').length, 3);
  assert.equal(fallActors.filter((a) => a.actor === 'gate_monger').length, 2);
  assert.equal(fallActors.filter((a) => a.routine).length, 21, 'every keeper keeps hours');
  // The editor JSON round trip holds WITH the elevation layer.
  const json = zoneToJson(z);
  assert.ok(json.elev !== undefined, 'the elevation layer must serialize');
  assert.deepEqual(zoneToJson(zoneFromJson(json)), json);
});

test('silverfall: the Silver Stair connects every terrace and every doorway walks', () => {
  const z = buildSilverfall();
  const lvl = (i: number): number => z.elev![i] ?? 0;
  const walkable = (x: number, y: number): boolean =>
    x >= 0 && y >= 0 && x < z.width && y < z.height &&
    !TILE_DEFS[z.ground[y * z.width + x]! as Tile].solid;
  const seen = new Uint8Array(z.width * z.height);
  const start = 104 * z.width + 88; // the spawn tile inside the gate
  const queue: number[] = [start];
  seen[start] = 1;
  while (queue.length > 0) {
    const i = queue.pop()!;
    const x = i % z.width;
    const y = Math.floor(i / z.width);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = x + dx;
      const ny = y + dy;
      if (!walkable(nx, ny)) continue;
      const ni = ny * z.width + nx;
      if (seen[ni]) continue;
      // The builder's own law: level changes cross only on a stair.
      if (
        lvl(ni) !== lvl(i) &&
        z.ground[i] !== Tile.Ramp &&
        z.ground[ni] !== Tile.Ramp
      ) {
        continue;
      }
      seen[ni] = 1;
      queue.push(ni);
    }
  }
  // Every doorway in the city walks from the gate.
  const unreachable: string[] = [];
  for (let i = 0; i < z.ground.length; i++) {
    const t = z.ground[i];
    if (
      (t === Tile.DoorwayStone ||
        t === Tile.DoorwayWood ||
        t === Tile.DoorwayStoneWide ||
        t === Tile.DoorwayWoodWide) &&
      !seen[i]
    ) {
      unreachable.push(`(${i % z.width},${Math.floor(i / z.width)})`);
    }
  }
  assert.deepEqual(unreachable, [], `doorways cut off from the gate: ${unreachable.join(' ')}`);
  // The gate mouth, the three stair crowns, and the deep gallery.
  assert.equal(seen[127 * z.width + 88], 1, 'the High Road mouth is severed');
  assert.equal(seen[95 * z.width + 88], 1, 'the first flight is severed');
  assert.equal(seen[63 * z.width + 88], 1, 'the second flight is severed');
  assert.equal(seen[31 * z.width + 88], 1, 'the third flight is severed');
  assert.equal(seen[11 * z.width + 14], 1, 'the deep gallery is severed');
  // Every market stall keeps a walkable approach.
  for (let i = 0; i < z.ground.length; i++) {
    if (z.ground[i] !== Tile.MarketStall) continue;
    const x = i % z.width;
    const y = Math.floor(i / z.width);
    const open =
      seen[i + z.width] === 1 || seen[i - z.width] === 1 ||
      seen[i + 1] === 1 || seen[i - 1] === 1;
    assert.ok(open, `stall at (${x},${y}) has no reachable approach`);
  }
});

test('undercroft: the cavern district holds its story, its metal, and its teeth', () => {
  const z = buildUndercroft();
  assert.equal(z.id, 'undercroft');
  // The district lives in the dark band, directly under the mountain.
  assert.ok(z.origin.y >= 512, 'the Undercroft must sit below DARK_BAND_Y');
  assert.equal(z.width, 96);
  assert.equal(z.height, 64);
  // Dying below wakes you at the Landing (nearest-spawn law).
  assert.deepEqual(z.spawn, { x: -332.5, y: 552.5 });
  const counts = new Map<number, number>();
  for (const t of z.ground) counts.set(t, (counts.get(t) ?? 0) + 1);
  const n = (t: Tile): number => counts.get(t) ?? 0;
  // The Deep Market stands, and the metal ladder tops out here.
  assert.ok(n(Tile.MarketStall) >= 5, 'the Deep Market thinned');
  assert.ok(n(Tile.RockMithril) >= 2 && n(Tile.RockAdamant) >= 2, 'the high galleries lost their veins');
  assert.ok(n(Tile.RockObsidian) >= 3 && n(Tile.RockStarfall) >= 1, 'the deep walk lost its prize');
  assert.ok(n(Tile.RockSilver) >= 3, 'silver runs out before the deep does');
  // The treasure ladder: iron on the walks, gilded behind the crack,
  // mossy where the kobolds and the shrooms keep theirs.
  assert.ok(n(Tile.ChestIron) >= 2 && n(Tile.ChestGilded) >= 1 && n(Tile.ChestMossy) >= 2);
  assert.ok(n(Tile.CrackedCaveWall) >= 1, 'the guild keeps one secret');
  // Cave dressing: the dark is furnished.
  assert.ok(n(Tile.GlowShroom) >= 10 && n(Tile.Stalagmite) >= 8 && n(Tile.BonePile) >= 5);
  assert.ok(n(Tile.Brazier) >= 10, 'the guild-swept spine must burn');
  assert.ok(n(Tile.FishingSpot) >= 2, 'the cistern must fish');
  // The two portals: the way home, and the resident Riftgate.
  const portals = z.portals ?? [];
  assert.equal(portals.length, 2, 'the Landing portal and the Riftgate');
  const up = portals.find((p) => p.dest);
  const rift = portals.find((p) => p.delve);
  assert.ok(up && rift, 'one portal home, one delve gate');
  assert.ok(
    up!.dest!.x >= SILVERFALL_RECT.x && up!.dest!.x < SILVERFALL_RECT.x + SILVERFALL_RECT.w &&
      up!.dest!.y >= SILVERFALL_RECT.y && up!.dest!.y < SILVERFALL_RECT.y + SILVERFALL_RECT.h,
    'the way home must land inside Silverfall',
  );
  // And Silverfall's mouth answers: its portal lands inside this zone.
  const sf = buildSilverfall();
  const down = (sf.portals ?? []).find((p) => p.dest);
  assert.ok(down, 'Silverfall must carry the mouth portal');
  assert.ok(
    down!.dest!.x >= z.origin.x && down!.dest!.x < z.origin.x + z.width &&
      down!.dest!.y >= z.origin.y && down!.dest!.y < z.origin.y + z.height,
    'the mouth must drop into the Undercroft',
  );
  // The authored ladder: kobolds hold the front, the digmaster digs,
  // and the deep walk is webbed. No actors before Epic 6.
  const byNpc = new Map<string, number>();
  for (const s of z.spawns ?? []) byNpc.set(s.npc, (byNpc.get(s.npc) ?? 0) + s.count);
  assert.equal(byNpc.get('kobold'), 8);
  assert.equal(byNpc.get('kobold_digmaster'), 1);
  assert.equal(byNpc.get('giant_spider'), 1);
  assert.ok((byNpc.get('cave_bat') ?? 0) >= 5 && (byNpc.get('giant_beetle') ?? 0) >= 3);
  assert.equal((z.actorSpawns ?? []).length, 0, 'the Deep Market keepers are Epic 6');
  // The editor round trip holds WITH the portal records. (Flat zones
  // re-emit a zero elev layer after a round trip — compare without.)
  const json = zoneToJson(z);
  assert.equal(json.portals?.length, 2, 'portals must serialize');
  const { elev: _rt, ...back } = zoneToJson(zoneFromJson(json));
  const { elev: _src, ...src } = json;
  assert.deepEqual(back, src);
});

test('undercroft: every chamber walks from the Landing — except the secret', () => {
  const z = buildUndercroft();
  const idx = (x: number, y: number): number => y * z.width + x;
  const reach = (cracksOpen: boolean): Uint8Array => {
    const walkable = (x: number, y: number): boolean => {
      if (x < 0 || y < 0 || x >= z.width || y >= z.height) return false;
      const t = z.ground[idx(x, y)]! as Tile;
      if (cracksOpen && t === Tile.CrackedCaveWall) return true;
      return !TILE_DEFS[t].solid;
    };
    const seen = new Uint8Array(z.width * z.height);
    const start = idx(11, 32); // the Landing spawn tile
    const queue = [start];
    seen[start] = 1;
    while (queue.length > 0) {
      const i = queue.pop()!;
      const x = i % z.width;
      const y = Math.floor(i / z.width);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        if (!walkable(x + dx, y + dy)) continue;
        const ni = idx(x + dx, y + dy);
        if (!seen[ni]) {
          seen[ni] = 1;
          queue.push(ni);
        }
      }
    }
    return seen;
  };
  const seen = reach(false);
  // The spine and every district answer the flood.
  for (const [x, y, what] of [
    [44, 32, 'the Deep Market walk'],
    [43, 12, 'the Riftgate ring (beside the gate)'],
    [65, 24, 'the gallery junction'],
    [87, 16, 'the upper walk at the mithril face'],
    [86, 23, 'the mid walk at the adamant face'],
    [88, 31, 'the deep walk at the starfall vein'],
    [66, 45, 'the outer warren'],
    [78, 51, 'the deep warren'],
    [87, 46, "the digmaster's dig"],
    [87, 38, 'the dig tunnel toward the starfall'],
    [16, 49, 'the old works'],
    [25, 52, 'the cistern shore'],
    [46, 51, 'the glowshroom grotto'],
    [9, 32, 'the Landing portal approach'],
  ] as const) {
    assert.equal(seen[idx(x, y)], 1, `${what} is cut off from the Landing`);
  }
  // The secret nook stays secret until three blows say otherwise.
  assert.equal(seen[idx(93, 23)], 0, 'the cracked-wall nook must NOT walk while sealed');
  const open = reach(true);
  assert.equal(open[idx(93, 23)], 1, 'the nook must open when the crack does');
  // Every stall on the promenade keeps a walkable approach.
  for (let i = 0; i < z.ground.length; i++) {
    if (z.ground[i] !== Tile.MarketStall) continue;
    const ok =
      seen[i + z.width] === 1 || seen[i - z.width] === 1 || seen[i + 1] === 1 || seen[i - 1] === 1;
    assert.ok(ok, `stall at (${i % z.width},${Math.floor(i / z.width)}) has no approach`);
  }
});

test('daggers: backstab multiplier, fast cadence, and a real Art', () => {
  for (const id of ['bronze_dagger', 'iron_dagger']) {
    const item = ITEMS.get(id);
    assert.ok(item?.weapon, `${id} missing`);
    assert.ok((item.weapon.backstabMult ?? 0) > 1, `${id} has no backstab payoff`);
    assert.ok(item.weapon.cooldownTicks < 7, `${id} should swing faster than swords`);
    assert.ok(item.weapon.range < 1.7, `${id} should reach shorter than swords`);
    assert.ok(item.weapon.art && abilityDef(item.weapon.art), `${id} art unresolved`);
  }
});

// ------------------------------------------------------------------
// Signed elevation authoring: the builder grows the cliff fence itself
// and validates stairs/borders/reachability at build time, so every
// invalid arrangement below must fail loudly with coordinates.
// ------------------------------------------------------------------

/** A 24×24 grass shelf with one −1 sink; callers add stairs/conflicts. */
function sunkenZone(): ZoneBuilder {
  const b = new ZoneBuilder('t_sunken', 'Sunken Test', { x: 0, y: 4096 }, 24, 24, Tile.Grass);
  b.spawn(4, 4);
  b.sink(8, 8, 8, 8, 1);
  return b;
}

test('auto-fence: a sunken rect grows a complete cliff ring except stairs', () => {
  const z = sunkenZone().stairs(11, 7).build();
  assert.ok(z.elev, 'elev layer missing from a zone with sinks');
  // The level-0 lip around the sink (x7..16 × y7..16 perimeter) is the
  // high side of the boundary, so it carries the fence.
  for (let x = 7; x <= 16; x++) {
    for (const y of [7, 16]) {
      const g = z.ground[y * 24 + x];
      if (x === 11 && y === 7) assert.equal(g, Tile.Ramp, 'stair replaced by fence');
      else assert.equal(g, Tile.Cliff, `fence gap at (${x},${y})`);
    }
  }
  for (let y = 8; y <= 15; y++) {
    for (const x of [7, 16]) {
      assert.equal(z.ground[y * 24 + x], Tile.Cliff, `fence gap at (${x},${y})`);
    }
  }
  // The floor itself stays open grass at −1.
  assert.equal(z.elev[10 * 24 + 10], -1);
  assert.equal(z.ground[10 * 24 + 10], Tile.Grass);
  // The lip is level 0 — the fence stands ON the high side.
  assert.equal(z.elev[7 * 24 + 8], 0);
});

test('stairs validation rejects flights that break the straight-edge rule', () => {
  // West rim: the lower tile is EAST, not south — flights face the camera.
  assert.throws(() => sunkenZone().stairs(7, 11).build(), /SOUTH neighbor/);
  // Corner of the ring: the west mouth diagonal is not one level lower.
  assert.throws(() => sunkenZone().stairs(8, 7).build(), /mouth diagonals/);
  // A stair later buried under another tile is a layout conflict.
  assert.throws(() => {
    const b = sunkenZone().stairs(11, 7);
    b.set(11, 7, Tile.Grass);
    b.build();
  }, /overwritten/);
});

test('auto-fence refuses to bury authored tiles under cliffs', () => {
  const b = sunkenZone().stairs(11, 7);
  b.set(9, 7, Tile.Barrel); // an authored prop right on the rim
  assert.throws(() => b.build(), /auto-fence at \(9,7\)/);
});

test('nonzero elevation hugging the zone border throws', () => {
  const b = new ZoneBuilder('t_border', 'Border Test', { x: 0, y: 4096 }, 24, 24, Tile.Grass);
  b.spawn(12, 12);
  b.sink(1, 8, 6, 6, 1); // reaches x=1: inside the flat apron
  assert.throws(() => b.build(), /border/);
});

test('a sunken region with no stairs is unreachable and throws', () => {
  assert.throws(() => sunkenZone().build(), /unreachable/);
});

test('zone JSON round-trips signed elevation; flat zones export none', () => {
  const z = sunkenZone().stairs(11, 7).build();
  const back = zoneFromJson(zoneToJson(z));
  assert.deepEqual(Array.from(back.elev!), Array.from(z.elev!));
  assert.ok(Array.from(back.elev!).some((v) => v < 0), 'negatives lost in transit');
  // Flat zones carry no elev blob and decode zero-filled — the JSON
  // for every pre-elevation zone stays byte-identical.
  const json = zoneToJson(buildDawnmead());
  assert.equal(json.elev, undefined);
  assert.ok(zoneFromJson(json).elev!.every((v) => v === 0));
});

