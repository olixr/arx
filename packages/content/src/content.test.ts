import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Detail, PASSIVES, STATUS_IDS, Tile, TILE_DEFS } from '@devcraft/shared';
import { ZoneBuilder } from './maps/builder.js';
import { buildBramblewick } from './maps/bramblewick.js';
import { buildHollowStair } from './maps/hollowstair.js';
import { zoneFromJson, zoneToJson } from './maps/serialize.js';
import { compileTemplate, templateHeight, templateWidth } from './structures/stamp.js';
import { templateFromJson, templateToJson } from './structures/serialize.js';
import { COTTAGE_SMALL, STRUCTURE_TEMPLATES, WELL_PLAZA } from './structures/templates.js';
import { ABILITIES, TECHNIQUES, abilityDef } from './abilities.js';
import { ITEMS } from './items.js';
import { NPCS, TOWN_SPAWNS } from './npcs.js';
import { LOOT_TABLES } from './loot/tables.js';
import { RECIPES } from './recipes.js';
import { NODES } from './nodes.js';
import { BUILDABLES } from './buildables.js';
import { GENERAL_STORE } from './shop.js';
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
  const TRADES = ['smithing', 'woodworking', 'leatherworking', 'tailoring', 'cooking', 'herbalism'];
  const HOME: Record<string, string[]> = {
    smithing: ['furnace', 'anvil'],
    woodworking: ['carving_bench'],
    leatherworking: ['tanning_rack'],
    tailoring: ['loom'],
    cooking: ['fire', 'workbench'],
    herbalism: ['alembic'],
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

test('bramblewick: anchors, unique stations, and story markers hold', () => {
  const z = buildBramblewick();
  const at = (x: number, y: number): Tile => z.ground[y * z.width + x]! as Tile;
  assert.deepEqual(z.spawn, { x: 48.5, y: 52.5 });
  assert.equal(TILE_DEFS[at(48, 52)].solid, false, 'spawn tile must be walkable');
  assert.equal(at(59, 33), Tile.PortalDown, 'cave mouth moved');
  const counts = new Map<number, number>();
  for (const t of z.ground) counts.set(t, (counts.get(t) ?? 0) + 1);
  const stations: Array<[string, Tile]> = [
    ['bank chest', Tile.BankChest],
    ['shop counter', Tile.ShopCounter],
    ['furnace', Tile.Furnace],
    ['anvil', Tile.Anvil],
    ['workbench', Tile.Workbench],
    ['tanning rack', Tile.TanningRack],
    ['loom', Tile.Loom],
    ['carving bench', Tile.CarvingBench],
    ['alembic', Tile.Alembic],
  ];
  for (const [name, tile] of stations) {
    assert.equal(counts.get(tile) ?? 0, 1, `town needs exactly one ${name}`);
  }
  assert.equal(counts.get(Tile.Campfire) ?? 0, 1, 'town campfire missing');
});

test('bramblewick: every doorway is walkable from the spawn', () => {
  const z = buildBramblewick();
  const walkable = (x: number, y: number): boolean =>
    x >= 0 && y >= 0 && x < z.width && y < z.height &&
    !TILE_DEFS[z.ground[y * z.width + x]! as Tile].solid;
  const seen = new Uint8Array(z.width * z.height);
  const queue: number[] = [52 * z.width + 48]; // the spawn tile
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
  // Legacy zones carry no elev blob and decode zero-filled — the JSON
  // for every pre-elevation zone stays byte-identical.
  const json = zoneToJson(buildBramblewick());
  assert.equal(json.elev, undefined);
  assert.ok(zoneFromJson(json).elev!.every((v) => v === 0));
});

test('the Hollow Stair: descend twice before you find the dungeon entrance', () => {
  const z = buildHollowStair();
  const at = (x: number, y: number): number => z.ground[y * z.width + x]!;
  const lv = (x: number, y: number): number => z.elev![y * z.width + x]!;
  // Dell (−1) with a quarry core (−2).
  assert.equal(lv(11, 9), -1);
  assert.equal(lv(12, 14), -2);
  // One south-descending flight per level, framed by the auto-fence.
  assert.equal(at(11, 7), Tile.Ramp);
  assert.equal(at(11, 11), Tile.Ramp);
  assert.equal(at(10, 7), Tile.Cliff);
  assert.equal(at(10, 11), Tile.Cliff);
  // The delve mouth waits on the quarry floor.
  assert.equal(at(12, 14), Tile.PortalDown);
  const portal = z.portals?.find((p) => p.delve);
  assert.deepEqual({ x: portal?.x, y: portal?.y }, { x: 132, y: 22 });
});
