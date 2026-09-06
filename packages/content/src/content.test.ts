import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AWNING_SHAPES,
  Detail,
  DYE_COUNT,
  NPC_SAFE_SHAPES,
  PASSIVES,
  awningTile,
  SIGN_MAX_LINE,
  SIGN_MAX_LINES,
  SIGN_MAX_TITLE,
  SIGN_TILES,
  STATUS_IDS,
  Tile,
  TILE_DEFS,
  bannerPoleTile,
  wallHungInfo,
} from '@arx/shared';
import type { StationType } from '@arx/shared';
import type { ZoneDef, ZoneSign } from './maps/types.js';
import { ZoneBuilder } from './maps/builder.js';
import { buildDawnmead } from './maps/dawnmead.js';
import { buildDawnmeadWithRegistry } from './maps/dawnmead/index.js';
import {
  boxOverlaps,
  emberBedsOffAsh,
  occlusionViolations,
  ringBoxDiff,
  signPairViolations,
  unreachableFloor,
} from './maps/dawnmead/lint.js';
import { footprintViolations, footprintViolationsOn } from './maps/lint/footprint.js';
import { buildAmberford } from './maps/amberford.js';
import { buildSilverfall } from './maps/silverfall.js';
import { buildSaltmere } from './maps/saltmere.js';
import { buildPinewatch } from './maps/pinewatch.js';
import { buildHartfell } from './maps/hartfell.js';
import { buildKingsdelf } from './maps/kingsdelf.js';
import { buildEvenfall } from './maps/evenfall.js';
import { buildUndercroft } from './maps/undercroft.js';
import { buildLowhall } from './maps/lowhall.js';
import { buildAshlamp } from './maps/ashlamp.js';
import { buildFenside } from './maps/fenside.js';
import { buildPicket, buildTurnoff, buildWardthread } from './maps/wardthread.js';
import { buildSett } from './maps/sett.js';
import { AMBERFORD_RECT, EVENFALL_RECT, HARTFELL_RECT, KINGSDELF_RECT, SALTMERE_RECT, SILVERFALL_RECT } from './geography.js';
import { zoneFromJson, zoneToJson } from './maps/serialize.js';
import { zonePlacementErrors } from './maps/validateZone.js';
import { UNDERWORLD_PLANE_ID } from './planes.js';
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
import { SECRET_ARTS, secretArtDef } from './secretArts.js';
import { ITEMS, LEGACY_RECIPE_SCROLLS } from './items.js';
import { NPCS, TOWN_SPAWNS, validateNpcDef } from './npcs.js';
import { LOOT_TABLES } from './loot/tables.js';
import { RECIPES, recipesForStation } from './recipes.js';
import { NODES } from './nodes.js';
import { BUILDABLES, BUILD_CATEGORIES, DYES, DYE_PIGMENTS, buildableForDetail, buildableForTile, buildableGround } from './buildables.js';
import { GENERAL_STORE, SHOPS, TRAINER_DIRECTORY } from './shop.js';
import { UNLOCKABLE_RECIPES, recipeScrollId } from './recipes.js';
import { NPC_ACTORS } from './actors/registry.js';
import { DIALOGUES } from './dialogues/registry.js';
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

test('THE SECRET LEDGER: every weapon teaches, and every seat has a teacher', () => {
  // A weapon with no art is a mute teacher; an art with no secret seat
  // is a lesson nobody can keep. Both directions are the law.
  const taught = new Set<string>();
  for (const [id, item] of ITEMS) {
    if (!item.weapon) continue;
    assert.ok(item.weapon.art, `${id} has no weapon art`);
    const seat = secretArtDef(item.weapon.art);
    assert.ok(seat, `${id} art '${item.weapon.art}' holds no secret ledger seat`);
    assert.equal(
      seat!.style,
      item.weapon.style,
      `${id}: the seat's school must be the teaching weapon's style`,
    );
    taught.add(item.weapon.art);
  }
  for (const seat of SECRET_ARTS) {
    assert.ok(taught.has(seat.ability), `secret seat '${seat.ability}' has no teaching weapon`);
  }
});

test('THE THREE CITIZENSHIPS: rung, page, and secret seats never overlap', () => {
  const ladderIds = new Set(TECHNIQUES.map((t) => t.ability));
  const seatIds = new Set<string>();
  for (const seat of SECRET_ARTS) {
    assert.ok(abilityDef(seat.ability), `secret seat '${seat.ability}' resolves to an ability`);
    assert.ok(!ladderIds.has(seat.ability), `'${seat.ability}' is both ladder and secret`);
    assert.ok(!seatIds.has(seat.ability), `'${seat.ability}' holds two secret seats`);
    seatIds.add(seat.ability);
    assert.equal(seat.unlockLevel, 0, `${seat.ability}: a secret has no rung`);
    assert.ok(seat.secret, `${seat.ability}: a ledger seat carries the secret marker`);
    assert.ok(!seat.hidden, `${seat.ability}: one citizenship only — secret, never also hidden`);
  }
});

test('npc loot, kits, and spawns all resolve — THE KIT contract', () => {
  // THE COMPANY CRITTERS: pure-company bodies (the house cat) pay
  // nothing at all — no loot, no xp — so the kill law passes them by.
  // THE DOLMEN (bands 9a/9c): no Dolmen loot table exists yet; the set
  // never initiates (aggroRange 0) and its bodies are worn by
  // untargetable actors, so loot stays [] on every dolmen* row until 9d
  // brings the errand's stone drop. The exemption is by prefix so the
  // four 9c strata rows ride the same door as the Marl.
  const COMPANY = (id: string): boolean => id === 'cat' || id.startsWith('dolmen');
  for (const [id, npc] of NPCS) {
    if (COMPANY(id)) continue;
    assert.ok(npc.loot.length > 0, `${id} has no loot tables`);
    for (const tableId of npc.loot) {
      assert.ok(LOOT_TABLES.has(tableId), `${id} loot table '${tableId}' missing`);
    }
    for (const k of npc.kit ?? []) {
      const ab = abilityDef(k.ability);
      assert.ok(ab, `${id} kit '${k.ability}' missing`);
      if (!ab) continue;
      assert.ok(
        NPC_SAFE_SHAPES.has(ab.shape),
        `${id} kit '${k.ability}': shape '${ab.shape}' has no NPC lane`,
      );
      assert.equal(
        ab.cooldownTicks,
        0,
        `${id} kit '${k.ability}': NPC pacing lives on the def, never the ability`,
      );
      assert.ok(k.cooldownTicks >= 50, `${id} kit '${k.ability}': cooldown floor 50`);
      // THE TELEGRAPH PREMIUM (docs/enemy-arts-plan.md LAW 5): a die
      // above the def's basic buys its premium with warning time —
      // windup + fuse >= 24t (1.2s) earns 2.5x, >= 12t earns 1.5x,
      // less earns nothing. Structural, not conventional.
      if (ab.damage > npc.damage) {
        const warning = (k.windupTicks ?? 0) + (ab.fuseTicks ?? 0);
        const cap = warning >= 24 ? 2.5 : warning >= 12 ? 1.5 : 1;
        assert.ok(
          ab.damage <= npc.damage * cap,
          `${id} kit '${k.ability}': die ${ab.damage} outbids its warning (basic ${npc.damage}, ${warning}t telegraphed)`,
        );
      }
      // Ground shapes keep an honest reaction window at every band.
      if (ab.shape === 'ground_aoe') {
        assert.ok((ab.fuseTicks ?? 0) >= 15, `${id} kit '${k.ability}': ground fuse floor 15t`);
      }
      if (ab.summonNpc) {
        assert.ok(
          NPCS.has(ab.summonNpc.npc),
          `${id} kit '${k.ability}': summonNpc '${ab.summonNpc.npc}' missing`,
        );
        assert.ok(
          !NPCS.get(ab.summonNpc.npc)?.kit?.some((e) => abilityDef(e.ability)?.summonNpc),
          `${id} kit '${k.ability}': a summoned add may never itself summon (recursion cap by data)`,
        );
      }
      if (k.rally) assert.ok(npc.pack, `${id} kit '${k.ability}': rally without a pack tag`);
    }
  }
  for (const spawn of TOWN_SPAWNS) {
    assert.ok(NPCS.has(spawn.npc), `spawn '${spawn.npc}' missing`);
  }
});

test('every crowned foe stands lawful — THE DREAD CROWN contract', () => {
  // Authored bosses walk the SAME validator gate CMS docs walk, whole:
  // ladder shape, entry-through-the-kit, chain acyclicity, CC dials in
  // band. A crown that fails the gate fails the build, loudly.
  const refs = { lootTables: new Set(LOOT_TABLES.keys()), npcIds: new Set(NPCS.keys()) };
  let crowned = 0;
  for (const [id, npc] of NPCS) {
    if (!npc.boss) continue;
    crowned++;
    const errors = validateNpcDef(npc, refs);
    assert.deepEqual(errors, [], `${id}: ${errors.join('; ')}`);
    assert.ok(npc.kit && npc.kit.length >= 3, `${id}: a crown carries at least three voices`);
    // Every rung's entry and every chain link resolves to a living
    // ability (the validator proves kit membership; this proves the
    // ability registry holds them too).
    for (const p of npc.boss.phases) {
      if (p.entry) assert.ok(abilityDef(p.entry), `${id}: entry '${p.entry}' missing`);
    }
    for (const k of npc.kit ?? []) {
      if (k.then) assert.ok(abilityDef(k.then), `${id}: chain link '${k.then}' missing`);
    }
  }
  // The first crowns hold their seats.
  assert.ok(crowned >= 2, 'the world fields at least the king and the tyrant');
  assert.ok(NPCS.get('skeleton_fallen_king')?.boss, 'the crypt seat is crowned');
  assert.ok(NPCS.get('goblin_flame_tyrant')?.boss, 'the stronghold court is crowned');
});

test('techniques resolve, ladder is sane, and each style has a tree', () => {
  const styles = new Map<string, number[]>();
  for (const t of TECHNIQUES) {
    assert.ok(abilityDef(t.ability), `technique '${t.ability}' missing`);
    // Hidden pages have no rung — their clock is the anchor (ladder.test).
    if (!t.hidden) assert.ok(t.unlockLevel >= 1 && t.unlockLevel <= 99);
    const levels = styles.get(t.style) ?? [];
    if (!t.hidden) levels.push(t.unlockLevel);
    styles.set(t.style, levels);
  }
  for (const style of ['combat', 'onehand', 'archery', 'arx', 'sneak', 'twohand', 'shield', 'dualwield']) {
    const levels = styles.get(style);
    assert.ok(levels && levels.length >= 3, `${style} needs a technique tree`);
    assert.ok(Math.min(...levels) <= 5, `${style} needs an early unlock`);
  }
});

test('trade-skill law: every recipe belongs to a named trade, at that trade\'s station', () => {
  // No generic "crafting" — a recipe trains the profession that makes
  // its kind of thing, and each trade works at its own bench.
  // Amended for building v2: construction owns the sawhorse — sawing
  // boards is the builder's own loop, never a weapon-trade detour.
  const TRADES = ['smithing', 'woodworking', 'leatherworking', 'tailoring', 'cooking', 'herbalism', 'enchanting', 'construction'];
  const HOME: Record<string, string[]> = {
    smithing: ['furnace', 'anvil'],
    woodworking: ['carving_bench'],
    leatherworking: ['tanning_rack'],
    tailoring: ['loom'],
    cooking: ['fire', 'workbench'],
    herbalism: ['alembic'],
    enchanting: ['enchanting_table'],
    construction: ['sawhorse'],
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
    // THE ENCHANTER'S HAND inverted this law. A scroll now carries the
    // quality of the hand that inscribed it, and addItem throws the
    // roll away when it stacks — so stacking would silently erase the
    // maker's mark, which is the whole point of the system. Same law as
    // the dungeon key: the instance roll IS the inscription.
    assert.equal(
      scroll!.stackable,
      false,
      `${scroll!.id} must NOT stack — a scroll carries its maker's quality`,
    );
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
        ab.shape === 'ground_aoe' ||
          ab.shape === 'ground_field' ||
          ab.shape === 'nova' ||
          ab.shape === 'beam' ||
          ab.shape === 'melee_arc',
        `${id}: a pull needs a center to pull toward (a beam or an arc drags toward the caster)`,
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
      // Walk through your field — EXCEPT where a body honestly
      // stands: a recurring crop is a tree or standing cane, and a
      // log bed is knee-high timber (THE FULL FIELD's amendment).
      const mayStand = crop.recurring !== undefined || crop.bed === 'log';
      if (!mayStand) {
        assert.equal(TILE_DEFS[tile].solid, false, `${id} crop tiles must be walkable`);
      }
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
    // Exactly one lane: a piece places a tile OR hangs a detail.
    assert.ok(
      (b.tile !== undefined) !== (b.detail !== undefined),
      `${b.id} must set exactly one of tile/detail`,
    );
    if (b.tile !== undefined) assert.ok(TILE_DEFS[b.tile], `${b.id} tile has no def`);
    if (b.detail !== undefined) {
      // A hanging def anchors at variant 0 of a real hanging family,
      // and folds home through buildableForDetail across its band.
      const info = wallHungInfo(b.detail);
      assert.ok(info, `${b.id} detail is a real hanging`);
      assert.equal(info!.dye ?? info!.motif ?? info!.species ?? 0, 0, `${b.id} anchors variant 0`);
      assert.equal(buildableForDetail(b.detail)?.id, b.id, `${b.id} folds home`);
    }
  }
  // Every band member folds to its family's one def; the authored
  // royals hang free of the ledger.
  for (let d = 0; d < 128; d++) {
    const info = wallHungInfo(d);
    if (!info) continue;
    const def = buildableForDetail(d);
    if (info.kind === 'crown' || info.kind === 'moon' || info.kind === 'tapestry') {
      assert.equal(def, undefined, `royal ${d} is never player salvage`);
    } else {
      assert.ok(def, `hanging ${d} folds to a def`);
    }
  }

  // THE MILLED-AND-WHOLE LAW (building v2): milled wood stacks, and
  // raw logs may only be spent where whole timber is the point — the
  // campfire burns trunks, posts and poles drive whole, the garrison
  // gate hangs on beams, and the sawhorse bootstraps the board loop.
  // Everything else denominated in wood must ask for boards.
  for (const id of ['board', 'oak_board']) {
    assert.ok(ITEMS.get(id)?.stackable, `${id} must stack — hauling is not the gameplay`);
  }
  // THE MEASURED STACK: a cap only ever rides a stackable, sits in the
  // 5–20 materials band, and never touches rolled gear — a capped gear
  // stack would smear instance rolls, which the law forbids outright.
  for (const item of ITEMS.values()) {
    if (item.maxStack === undefined) continue;
    assert.ok(item.stackable, `${item.id} caps a stack it does not have`);
    assert.ok(
      item.maxStack >= 5 && item.maxStack <= 20,
      `${item.id} stack cap ${item.maxStack} leaves the 5-20 band`,
    );
    assert.equal(item.gear, undefined, `${item.id} is rolled gear and must never stack`);
  }
  // Every palette shelf holds at least one plan — an empty category
  // is a typo'd cat, not a design choice.
  for (const c of BUILD_CATEGORIES) {
    assert.ok(
      [...BUILDABLES.values()].some((b) => b.cat === c.id),
      `build shelf '${c.id}' is empty`,
    );
  }

  // THE DYE LAW (exterior decor): ten cloths, index-married to the
  // shared id bands. Length pinned to DYE_COUNT, ids unique, and the
  // undyed default sits at 0 — index order is FOREVER (rename in
  // place, never reorder; the index is baked into world ids).
  assert.equal(DYES.length, DYE_COUNT, 'dye roster matches the shared band width');
  assert.equal(new Set(DYES.map((d) => d.id)).size, DYES.length, 'dye ids unique');
  assert.equal(DYES[0]!.id, 'linen', 'the undyed default holds index 0');
  for (const d of DYES) {
    assert.ok(d.name.length > 0 && !/[—–]|--/.test(d.name), `${d.id} name honest + dash-free`);
  }
  // Pigments: index-married, real items, and the undyed default free.
  assert.equal(DYE_PIGMENTS.length, DYE_COUNT, 'pigment ledger matches the roster');
  assert.equal(DYE_PIGMENTS[0], null, 'linen asks nothing');
  for (let i = 1; i < DYE_PIGMENTS.length; i++) {
    const p = DYE_PIGMENTS[i];
    assert.ok(p && ITEMS.has(p.item) && p.qty > 0, `${DYES[i]!.id} pigment is a real cost`);
  }

  // THE PORCH: the deck is a floor of the outdoors — furniture,
  // rails, posts and awnings all accept it as footing, and the deck
  // itself rises from open ground.
  {
    const deck = BUILDABLES.get('porch_deck');
    const post = BUILDABLES.get('timber_post');
    assert.ok(deck && deck.tile === Tile.PorchDeck && deck.cat === 'foundation');
    assert.ok(post && post.tile === Tile.TimberPost);
    assert.ok(buildableGround(deck!).includes(Tile.Grass), 'a deck rises from open ground');
    for (const id of ['chair', 'bench', 'wood_railing', 'flower_box', 'lamp_post', 'awning_shed']) {
      const b = BUILDABLES.get(id)!;
      assert.ok(
        buildableGround(b).includes(Tile.PorchDeck),
        `${id} stands on the porch deck`,
      );
    }
  }

  // THE OUTWARD FACE: one buildable per awning shape, anchored at the
  // shape's dye-0 tile, cloth-costed on the decor shelf — and every
  // dyed id in every band folds back to its shape's one def (salvage
  // and the own-work overlay never care about dye).
  for (const shape of AWNING_SHAPES) {
    const def = BUILDABLES.get(`awning_${shape}`);
    assert.ok(def, `awning_${shape} exists`);
    assert.equal(def!.tile, awningTile(shape, 0), `awning_${shape} anchors at dye 0`);
    assert.equal(def!.cat, 'decor', `awning_${shape} sits on the decor shelf`);
    for (let dye = 0; dye < DYE_COUNT; dye++) {
      assert.equal(
        buildableForTile(awningTile(shape, dye))?.id,
        `awning_${shape}`,
        `${shape} dye ${dye} folds home`,
      );
    }
  }
  const WHOLE_TIMBER = new Set([
    'sawhorse',
    'campfire',
    'lamp_post',
    'banner_pole',
    'garrison_gate',
    'signpost',
    // THE PORCH: posts are driven whole, never sawn.
    'timber_post',
    // THE PLACEABLE FLAME: a torch is a stake with a rag head —
    // driven whole like every post.
    'standing_torch',
    // THE FULL FIELD: the shade bed IS a whole log — sawing it would
    // saw away the point.
    'mushroom_log',
  ]);
  for (const b of BUILDABLES.values()) {
    if (b.materials.some((m) => m.item === 'log' || m.item === 'oak_log')) {
      assert.ok(WHOLE_TIMBER.has(b.id), `${b.id} spends raw logs — milled work wants boards`);
    }
  }
  for (const id of ['saw_boards', 'saw_oak_boards']) {
    const r = RECIPES.get(id);
    assert.ok(r, `${id} recipe missing`);
    assert.equal(r!.station, 'sawhorse', `${id} saws at the sawhorse`);
    assert.equal(r!.skill, 'construction', `${id} is the builder's own trade`);
    assert.equal(r!.output.qty, 3, `${id}: one log, three boards — the user-locked ratio`);
    assert.equal(r!.inputs.length, 1);
    assert.equal(r!.inputs[0]!.qty, 1);
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
  // Which items each acquisition route can actually pay out. THE ONE
  // SANCTIONED EXCEPTION to the no-drop-scrolls-on-shelves law: the
  // peddler carts (THE ROAD'S FORTUNE, living-frontier Phase 5) — a
  // shop that stands for two hours somewhere on the road is found
  // knowledge, not scheduled knowledge. Town shelves stay honest.
  const shelved = new Set<string>();
  for (const shop of SHOPS.values()) {
    if (shop.id.startsWith('peddler_')) continue;
    for (const e of shop.stock) shelved.add(e.item);
  }
  const lootable = new Set<string>();
  for (const t of LOOT_TABLES.values()) {
    for (const e of t.entries) if (e.item) lootable.add(e.item);
  }

  // THE RETIRED SCROLL: taught lore that later went core keeps its
  // item (live inventories hold the paper) but leaves every shelf and
  // every loot table — the knowledge is free now.
  const legacy = new Set(LEGACY_RECIPE_SCROLLS.map((d) => d.id));
  for (const id of legacy) {
    assert.ok(!shelved.has(id), `legacy scroll '${id}' is still on a shelf`);
    assert.ok(!lootable.has(id), `legacy scroll '${id}' is still in loot`);
    const taught = ITEMS.get(id)?.teaches;
    assert.ok(taught && RECIPES.get(taught)?.unlock === 'core', `legacy scroll '${id}' should point at a core recipe`);
  }

  for (const r of RECIPES.values()) {
    const scroll = recipeScrollId(r.id);
    if (r.unlock === 'core') {
      if (!legacy.has(scroll)) {
        assert.ok(!ITEMS.has(scroll), `core recipe '${r.id}' should not have a scroll`);
      }
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
  // Every teaches pointer resolves to a real recipe; only retired
  // legacy paper may point at a core one.
  for (const def of ITEMS.values()) {
    if (!def.teaches) continue;
    const r = RECIPES.get(def.teaches);
    assert.ok(r, `item '${def.id}' teaches unknown recipe '${def.teaches}'`);
    if (!legacy.has(def.id)) {
      assert.notEqual(r!.unlock, 'core', `item '${def.id}' teaches a core recipe`);
    }
  }
  // Every shop an actor advertises exists; every trainer shop has a keeper.
  // A keeper is a def's `shop`, or a bound tree's `shop` hook: band 8's
  // copse_yard opens by hook alone (alder_bowwood, on grey_root_done) so
  // the Wool Count's closure can outrank the shelf, which a def shop
  // could not be made to do.
  const carried = new Set<string>();
  for (const actor of NPC_ACTORS.values()) {
    if (!actor.shop) continue;
    assert.ok(SHOPS.has(actor.shop), `actor '${actor.id}' advertises unknown shop '${actor.shop}'`);
    carried.add(actor.shop);
  }
  for (const d of DIALOGUES.values()) {
    if (!(d.bindings ?? []).length) continue;
    for (const n of d.nodes) {
      for (const h of n.hooks ?? []) if (h.kind === 'shop') carried.add(h.shop);
    }
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

/**
 * THE FIRST TRADE — the entry to every craft is a birthright. A fresh
 * character walking into the first craft town must find the door open:
 * each trade offers work at its very first level, the starter kits
 * (first-material weapons and a full armor wardrobe) are core
 * knowledge, and every taught trade names a teacher the bench can
 * point at. Higher shelves stay sought-out; the ground floor is free.
 */
test('THE FIRST TRADE: every craft opens at the first level', () => {
  const bySkill = new Map<string, number>();
  for (const r of RECIPES.values()) {
    if (r.unlock !== 'core') continue;
    const best = bySkill.get(r.skill);
    if (best === undefined || r.levelReq < best) bySkill.set(r.skill, r.levelReq);
  }
  for (const [skill, min] of bySkill) {
    assert.ok(min <= 2, `${skill}: first core recipe waits until level ${min}`);
  }
});

test('THE FIRST TRADE: the open door stands at the bench', () => {
  // Having a level-1 recipe in the abstract is not enough — it must be
  // LISTED where a fresh crafter looks, which is their trade's station.
  // For every craft skill with a bench, at least one of its benches'
  // ledgers (recipesForStation) must show a core recipe at level <= 2.
  // The craft-anywhere pieces (arrows, twine) ride along via the
  // open-door clause in recipesForStation; this pins that they do.
  const stationsBySkill = new Map<string, Set<StationType>>();
  for (const r of RECIPES.values()) {
    if (r.station === null) continue;
    if (!stationsBySkill.has(r.skill)) stationsBySkill.set(r.skill, new Set());
    stationsBySkill.get(r.skill)!.add(r.station);
  }
  for (const [skill, stations] of stationsBySkill) {
    const min = Math.min(
      ...[...stations].flatMap((st) =>
        recipesForStation(st)
          .filter((r) => r.skill === skill && r.unlock === 'core')
          .map((r) => r.levelReq),
      ),
    );
    assert.ok(
      min <= 2,
      `${skill}: no bench ledger opens before level ${min} — the door is closed`,
    );
  }
});

test('THE FIRST TRADE: every bronze weapon design is core', () => {
  // The starter metal's arms belong to every hand, whatever their
  // smithing level (the scimitar at 12 rides an explicit core pin).
  // Armor sets past the starter kit (Warden) and specialty reagent
  // work (Briarfang) may still be guild-taught.
  for (const r of RECIPES.values()) {
    if (r.skill !== 'smithing') continue;
    if (!ITEMS.get(r.output.item)?.weapon) continue;
    if (!r.inputs.some((i) => i.item === 'bronze_bar')) continue;
    const plain = r.inputs.every((i) => i.item === 'bronze_bar' || i.item === 'log' || i.item === 'oak_log');
    if (plain) assert.equal(r.unlock, 'core', `${r.id}: a plain bronze weapon behind a lock`);
  }
});

test('THE FIRST TRADE: the starter kit covers every hand and every slot', () => {
  const styles = new Set<string>();
  const slots = new Set<string>();
  for (const r of RECIPES.values()) {
    if (r.unlock !== 'core' || r.levelReq > 10) continue;
    const item = ITEMS.get(r.output.item);
    if (!item) continue;
    if (item.weapon?.style) styles.add(item.weapon.style);
    if (item.equipSlot) slots.add(item.equipSlot);
  }
  // Dual wield is the offhand use of any onehand blade, so onehand
  // coverage covers it; shield rides the offhand slot check below.
  for (const style of ['onehand', 'twohand', 'archery', 'arx']) {
    assert.ok(styles.has(style), `no core starter weapon for ${style}`);
  }
  for (const slot of ['head', 'body', 'legs', 'boots', 'gloves', 'offhand']) {
    assert.ok(slots.has(slot), `no core starter craft for the ${slot} slot`);
  }
});

test('THE FIRST TRADE: every taught trade names its teacher', () => {
  const posted = new Set(TRAINER_DIRECTORY.map((p) => p.skill));
  for (const r of RECIPES.values()) {
    if (r.unlock !== 'trainer') continue;
    assert.ok(posted.has(r.skill), `${r.skill} has taught lore but no TRAINER_DIRECTORY post`);
  }
  // Every post is a real door: the teacher stands somewhere with that
  // name, and their trade really has lore to sell.
  const actorNames = new Set([...NPC_ACTORS.values()].map((a) => a.name));
  const taughtSkills = new Set(
    [...RECIPES.values()].filter((r) => r.unlock === 'trainer').map((r) => r.skill),
  );
  for (const post of TRAINER_DIRECTORY) {
    assert.ok(actorNames.has(post.teacher), `directory names unknown teacher '${post.teacher}'`);
    assert.ok(taughtSkills.has(post.skill), `directory post for ${post.skill} has nothing to teach`);
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
      item.buff.speedMult ||
        item.buff.shieldHp ||
        item.buff.gatherSpeed ||
        item.buff.regenPer4s ||
        // THE LADEN TABLE's scarce combat dials count as doing.
        item.buff.armor ||
        item.buff.dmgMult ||
        item.buff.critPct ||
        // THE SLIPPED BLOW's cup.
        item.buff.evadePct ||
        // THE SWING CHANNEL's consumable lane (statusBook Phase 5).
        item.buff.attackSpeedMult,
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
    // A summon raises a helper prop OR (enemy arts) real bestiary adds.
    if (ab.shape === 'summon') assert.ok(ab.summon || ab.summonNpc, `${id} summons nothing`);
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

test('a sign stands in front of a wall, never in it', () => {
  // The Saltmere/Pinewatch lesson: b.sign() writes a tile, and a sign
  // tile written over a wall-run member punches a hole in the
  // building's silhouette. The builder now refuses at build-authoring
  // time, with coordinates, for every wall family.
  const b = new ZoneBuilder('scratch', 'Scratch', { x: 0, y: 0 }, 24, 24, Tile.Grass);
  b.building(4, 4, 7, 7, {
    wall: Tile.WallWood,
    floor: Tile.WoodFloor,
    doors: [{ side: 's', at: 3 }],
  });
  assert.throws(
    () => b.sign(5, 10, 'CUT WALL', [], Tile.HangingSign),
    /would overwrite 'wood wall'/,
    'a hanging sign on the south wall must refuse',
  );
  assert.throws(
    () => b.sign(7, 10, 'CUT DOOR', [], Tile.Signpost),
    /would overwrite/,
    'a signpost on a doorway must refuse',
  );
  b.set(2, 2, Tile.WallGarrison);
  assert.throws(
    () => b.sign(2, 2, 'CUT CURTAIN', []),
    /would overwrite/,
    'the garrison curtain refuses too',
  );
  // Open ground in front of the wall is the legal footing.
  b.sign(5, 11, 'THE FRONT', ['one pace off the facade'], Tile.HangingSign);
  assert.equal(b.get(5, 11), Tile.HangingSign);
});

test('structure templates: JSON round-trip is lossless and re-validated', () => {
  for (const tpl of STRUCTURE_TEMPLATES) {
    const back = templateFromJson(templateToJson(tpl));
    assert.deepEqual(back, tpl, `${tpl.id} did not survive the round trip`);
  }
  assert.throws(() => templateFromJson('{"id":"bad","legend":{},"rows":["x"]}'));
});

test('every authored zone passes the placement vet — no orphaned wall hangings', () => {
  // THE FLOOR BANNER purge: 19 wall-hung details across six towns
  // were authored on floors, windows, beds, and an arch — invisible
  // orphan cloth whose Studio marker glyph baked onto walkable
  // ground. The placement vet now refuses them; this sweep keeps
  // every shipped town clean forever.
  const towns: Array<[string, () => import('./maps/types.js').ZoneDef]> = [
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
    // THE CONTESTED LANDS (band 7): the two First Road patches take
    // the same vet (a warded chest, one actor row, the bar's gap).
    ['ashlamp', buildAshlamp],
    ['fenside', buildFenside],
    // THE CONTESTED LANDS (band 8): the three north patches take the
    // same vet (three actor rows and one spawn row on the ward line;
    // the picket's one board; the turn's two tiles).
    ['wardthread', buildWardthread],
    ['picket', buildPicket],
    ['turnoff', buildTurnoff],
    // THE CONTESTED LANDS (band 9d): the Sett takes the same vet
    // (eleven actor rows and Vorl's one spawn row; no board).
    ['sett', buildSett],
  ];
  for (const [name, build] of towns) {
    const errors = zonePlacementErrors(build()).filter((e) => e.includes('wall-hung'));
    assert.deepEqual(errors, [], `${name} hangs its cloth on real walls`);
  }
});

test('dawnmead: awakening anchors, stations, pens, and the lane seam hold', () => {
  const z = buildDawnmead();
  const at = (x: number, y: number): Tile => z.ground[y * z.width + x]! as Tile;
  // The spawn stands inside the Waking Ring, on the SAME world tile it
  // has kept through every rebuild (respawn + rescue law).
  assert.deepEqual(z.spawn, { x: -81.5, y: 48.5 });
  assert.equal(TILE_DEFS[at(78, 112)].solid, false, 'spawn tile must be walkable');
  // The lane exits the east edge on world rows 47-49 (local 111-113),
  // where the First Road begins at world (32,48).
  for (const y of [111, 112, 113]) {
    assert.equal(at(191, y), Tile.Path, `lane row ${y} must reach the east edge`);
  }
  // SEVEN standing stones close the Waking Ring (THE DAWN COMES OPEN);
  // the five that have always stood kept their world tiles.
  for (const [sx, sy] of [[78, 108], [74, 110], [82, 109], [74, 115], [81, 116], [72, 112], [85, 113]] as const) {
    assert.equal(at(sx, sy), Tile.PillarStone, `ring stone missing at ${sx},${sy}`);
  }
  // The singleton stations, the teaching ground, the syllabus animals
  // and the cast are pinned apart (below): they land with the district
  // modules and people.ts of the band-6 rebuild.
  // DAWNMEAD UNDER SIEGE: the count-knoll is the zone's first
  // elevation, so the JSON round trip now carries the elev layer and
  // must be byte-exact WITH it (the flat-zone law moved to Amberford).
  const json = zoneToJson(z);
  assert.ok(json.elev !== undefined, 'dawnmead carries the count-knoll');
  assert.deepEqual(zoneToJson(zoneFromJson(json)), json);
  // Exactly one raise: the knoll (100,138) 7x4 at level 1, 0 elsewhere.
  for (let i = 0; i < z.elev!.length; i++) {
    const x = i % z.width;
    const y = Math.floor(i / z.width);
    const onKnoll = x >= 100 && x <= 106 && y >= 138 && y <= 141;
    assert.equal(z.elev![i], onKnoll ? 1 : 0, `elevation off the knoll at (${x},${y})`);
  }
  // The knoll's rim is Cliff with the three stairs its only gap.
  for (const [sx, sy] of [[102, 141], [103, 141], [104, 141]] as const) {
    assert.equal(at(sx, sy), Tile.Ramp, `knoll stair missing at ${sx},${sy}`);
  }
  assert.equal(at(101, 141), Tile.Cliff);
  assert.equal(at(105, 141), Tile.Cliff);
  assert.equal(at(100, 139), Tile.Cliff);
  assert.equal(at(106, 139), Tile.Cliff);
  assert.equal(at(103, 138), Tile.Cliff);
  // Halla's seat is the StoneBench inside the rim (ruling 4; her sit
  // waypoint lands ON it); she is staged from (102,140), grass at level 1.
  assert.equal(at(102, 139), Tile.StoneBench, "Halla's bench on the knoll top");
  assert.equal(TILE_DEFS[at(102, 140)].solid, false, "Halla's bench stand on the knoll top");
  assert.equal(z.elev![140 * z.width + 102], 1, "Halla's stand is on the knoll's level");
});

/**
 * THE CAST SEATING (band 6 §5, §9.2 #15): thirteen named villagers,
 * Halla's four-ward rota, the Charter's clerk, the Returner, three
 * crofters and the Waykeeper at the gate, every one keeping hours; and
 * the syllabus animals in the open. These numbers are FINAL and land
 * with people.ts (lane L6); until it lands this test is red on purpose.
 */
function assertDawnmeadCast(z: ReturnType<typeof buildDawnmead>): void {
  const spawnCount = (npc: string) =>
    (z.spawns ?? []).filter((s) => s.npc === npc).reduce((n, s) => n + s.count, 0);
  assert.equal(spawnCount('chicken'), 5);
  assert.equal(spawnCount('cow'), 2);
  assert.equal(spawnCount('sheep'), 5, 'three ewes on the Common and two in the borrowed pen');
  assert.equal(spawnCount('rat'), 7, 'the granary rats moved indoors');
  assert.equal(spawnCount('mudcrab'), 5, 'the crab bank emptied');
  const actors = z.actorSpawns ?? [];
  assert.equal(actors.length, 23);
  for (const slug of [
    'keeper_wren',
    'yardmaster_halla',
    'fletcher_rill',
    'sparkwright_varn',
    'forester_alder',
    'cook_berrit',
    'wright_ottery',
    'innkeep_gilly',
    'angler_weir',
    'farmer_brammel',
    'drover_sorrel',
    'twin_tansy',
    'twin_wick',
    'charter_margit',
    'returner_hilde',
    'fenside_crofter',
    'waykeeper_leif',
  ]) {
    assert.ok(actors.some((a) => a.actor === slug), `${slug} missing from the village`);
  }
  assert.equal(actors.filter((a) => a.actor === 'dawnmead_ward').length, 4, 'the ward rota changed');
  assert.equal(actors.filter((a) => a.actor === 'fenside_crofter').length, 3, 'three families walked in');
  assert.equal(actors.filter((a) => a.routine).length, 23, 'every villager keeps hours');
}

test('dawnmead: the cast of twenty-three and the syllabus animals (lands with people.ts)', () => {
  assertDawnmeadCast(buildDawnmead());
});

/**
 * THE SINGLETON LEDGER (band 6 §6): one of each station, exactly, and
 * the teaching ground's floors. FINAL numbers; each lands with its
 * district (cookhouse, works, granary, stalls, copse, waterside, pell,
 * butts, spark) and is red on purpose until that lane lands.
 */
function assertDawnmeadStations(z: ReturnType<typeof buildDawnmead>): void {
  const counts = new Map<number, number>();
  for (const t of z.ground) counts.set(t, (counts.get(t) ?? 0) + 1);
  // The singleton stations: one of each, exactly, in the whole zone.
  assert.equal(counts.get(Tile.Campfire) ?? 0, 1, 'the supper fire missing');
  assert.equal(counts.get(Tile.Workbench) ?? 0, 1, "Ottery's bench missing");
  assert.equal(counts.get(Tile.ChestWood) ?? 0, 1, 'the granary chest missing');
  assert.equal(counts.get(Tile.Furnace) ?? 0, 1, 'the forge corner furnace missing');
  assert.equal(counts.get(Tile.Anvil) ?? 0, 1, 'the forge corner anvil missing');
  assert.equal(counts.get(Tile.CookPot) ?? 0, 1, "Berrit's pot missing");
  assert.equal(counts.get(Tile.BeastPen) ?? 0, 1, 'the stall door missing');
  assert.equal(counts.get(Tile.Well) ?? 0, 1, 'the well missing');
  // The teaching grounds: forage, ore, straw butts, and dummies.
  assert.ok((counts.get(Tile.BerryBush) ?? 0) >= 6, 'the berry banks thinned');
  assert.equal(counts.get(Tile.RockCopper) ?? 0, 2, 'the Scrap Crag copper moved');
  assert.equal(counts.get(Tile.RockTin) ?? 0, 2, 'the Scrap Crag tin moved');
  assert.ok((counts.get(Tile.TargetDummy) ?? 0) >= 4, 'the drill yard emptied');
  assert.ok((counts.get(Tile.FishingSpot) ?? 0) >= 3, 'the brook stopped biting');
}

test('dawnmead: the singleton stations and the teaching ground (land with the districts)', () => {
  assertDawnmeadStations(buildDawnmead());
});

test('dawnmead: the tally stall is the ONE MarketStall (lands with green.ts)', () => {
  const z = buildDawnmead();
  let stalls = 0;
  for (const t of z.ground) if (t === Tile.MarketStall) stalls++;
  assert.equal(stalls, 1, 'ruling Kit 12: MarketStall stays ONE');
});

test('dawnmead: THE TUTORIAL IS SACRED and the four floods run clean', () => {
  const { zone: z, registry } = buildDawnmeadWithRegistry();
  // The Ring box (64,100)-(93,124) is byte-identical to the shipped
  // build, ground and detail, 750 cells each (brief J17).
  assert.deepEqual(ringBoxDiff(z), [], 'the Waking Ring changed inside eight tiles');
  // K1: every EmberBed sits on its own ash.
  assert.deepEqual(emberBedsOffAsh(z), []);
  // No sealed pocket, nothing tall south of a door or a board, one
  // Signpost per eyeful, every scene box its own ground.
  assert.deepEqual(unreachableFloor(z, registry), [], 'sealed pockets');
  assert.deepEqual(occlusionViolations(z, registry), [], 'the occlusion law');
  assert.deepEqual(signPairViolations(z), [], 'one Signpost per eyeful');
  assert.deepEqual(boxOverlaps(registry), [], 'scene boxes overlap');
});

test('THE CART HAS TWO FEET: every two-foot prop in every authored zone stands its second foot on open ground', () => {
  // The lint (maps/lint/footprint.ts) over every shipped zone: a
  // belongings cart's shafts, a lean-to's skirt, a cot's far trestle
  // and a broken cart's spilled sacks each own one cardinal neighbour,
  // and that neighbour is never solid, a route or a routine waypoint.
  const zones: Array<[string, ZoneDef]> = [
    ['dawnmead', buildDawnmead()],
    ['amberford', buildAmberford()],
    ['silverfall', buildSilverfall()],
    ['saltmere', buildSaltmere()],
    ['pinewatch', buildPinewatch()],
    ['hartfell', buildHartfell()],
    ['kingsdelf', buildKingsdelf()],
    ['evenfall', buildEvenfall()],
    ['undercroft', buildUndercroft()],
    ['lowhall', buildLowhall()],
  ];
  for (const [id, z] of zones) assert.deepEqual(footprintViolations(z), [], `${id}: the second foot`);
  // Dawnmead's sacking row and the two lone carts are under the law
  // (five two-foot props stand in the village; none may vanish).
  const dawn = buildDawnmead();
  let twoFoot = 0;
  for (const t of dawn.ground) if (t === Tile.LeanTo || t === Tile.FieldCot || t === Tile.BelongingsCart || t === Tile.BrokenCart) twoFoot++;
  assert.equal(twoFoot, 8, 'two lean-tos, a cot, three belongings carts, two broken carts');
  // The three refusals, each on a two-tile string world.
  const world = (rows: string[], waypoints: string[] = []) => {
    const chars: Record<string, number> = { G: Tile.Grass, P: Tile.Path, H: Tile.Hedge, C: Tile.BelongingsCart, T: Tile.FieldCot };
    const at = (x: number, y: number): number | undefined => (y >= 0 && y < rows.length && x >= 0 && x < rows[y]!.length ? chars[rows[y]![x]!] : undefined);
    const cells: Array<[number, number]> = [];
    rows.forEach((r, y) => [...r].forEach((c, x) => { if (c === 'C' || c === 'T') cells.push([x, y]); }));
    return footprintViolationsOn({ at, cells, waypoints: new Set(waypoints) });
  };
  assert.deepEqual(world(['GGCG']), [], 'a cart with open ground west of it stands');
  assert.match(world(['GHCG'])[0]!, /solid 'hedge'/, 'a hedge in the shafts is refused');
  assert.match(world(['GPCG'])[0]!, /a route/, 'the shafts across the lane are refused');
  assert.match(world(['GGCG'], ['1,0'])[0]!, /routine waypoint/, 'a post in the shafts is refused');
  assert.match(world(['CG'])[0]!, /outside the authored ground/, 'a cart at the rect edge is refused');
  assert.match(world(['GGTH'])[0]!, /solid 'hedge'/, 'the cot reaches east');
  assert.deepEqual(world(['HGTG']), [], 'the cot does not reach west');
});

test('dawnmead: every doorway (granary included) walks from the spawn', () => {
  const z = buildDawnmead();
  const walkable = (x: number, y: number): boolean =>
    x >= 0 && y >= 0 && x < z.width && y < z.height &&
    !TILE_DEFS[z.ground[y * z.width + x]! as Tile].solid;
  const seen = new Uint8Array(z.width * z.height);
  const queue: number[] = [112 * z.width + 78]; // the Waking Ring
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
  // The ways out truly connect: the First Road's edge tile, the
  // hunters' trail head, and the old-road gate all walk from the Ring.
  assert.equal(seen[112 * z.width + 191], 1, 'the lane east is severed');
  assert.equal(seen[0 * z.width + 60], 1, "the hunters' trail is severed");
  assert.equal(seen[223 * z.width + 108], 1, 'the old road is severed');
});

test('amberford: the crossroads town holds its anchors, stations, and gates', () => {
  const z = buildAmberford();
  assert.equal(z.id, 'amberford');
  // The zone stamps into the master plan's rect exactly.
  assert.deepEqual(z.origin, { x: AMBERFORD_RECT.x, y: AMBERFORD_RECT.y });
  assert.equal(z.width, AMBERFORD_RECT.w);
  assert.equal(z.height, AMBERFORD_RECT.h);
  const at = (x: number, y: number): Tile => z.ground[y * z.width + x]! as Tile;
  // The respawn hearth stands on the Market Round, beside the well.
  assert.deepEqual(z.spawn, { x: AMBERFORD_RECT.x + 74.5, y: AMBERFORD_RECT.y + 53.5 });
  assert.equal(TILE_DEFS[at(74, 53)].solid, false, 'spawn tile must be walkable');
  // The gates meet the carved worldgen roads tile-for-tile: the First
  // Road's rows at the west edge, the High Road's mouth at the north,
  // the Timber Road out the east, the Salt Road off the south bank.
  for (const y of [50, 51, 52]) {
    assert.equal(at(0, y), Tile.Path, `Fordgate row ${y} must reach the west edge`);
  }
  for (const x of [68, 69, 70]) {
    assert.equal(at(x, 0), Tile.Path, `North Gate col ${x} must reach the north edge`);
  }
  for (const y of [70, 71, 72]) {
    assert.equal(at(143, y), Tile.Path, `East Road row ${y} must reach the east edge`);
  }
  for (const x of [86, 87, 88]) {
    assert.equal(at(x, 143), Tile.Path, `Salt Road col ${x} must reach the south edge`);
  }
  const counts = new Map<number, number>();
  for (const t of z.ground) counts.set(t, (counts.get(t) ?? 0) + 1);
  // THE FORD COMES HOME: the river crosses the zone — authored water
  // at the west hem entry, the southeast exit arm, and the NE tarn —
  // with the bridge and the wadeable Old Ford beside it.
  const water =
    (counts.get(Tile.Water) ?? 0) +
    (counts.get(Tile.WaterShallow) ?? 0) +
    (counts.get(Tile.WaterDeep) ?? 0);
  assert.ok(water >= 1200, 'the Amber Water ran dry');
  assert.equal(at(0, 120), Tile.WaterDeep, 'the west hem entry moved');
  assert.ok(at(130, 143) === Tile.Water || at(130, 143) === Tile.WaterShallow, 'the exit arm moved');
  assert.equal(at(140, 0), Tile.Water, 'the NE tarn moved');
  for (let y = 122; y <= 134; y++) {
    assert.equal(at(86, y), Tile.Bridge, `the bridge deck broke at row ${y}`);
  }
  assert.equal(at(80, 126), Tile.WaterShallow, 'the Old Ford must stay wadeable');
  // THE BANK: the banking chests and the vault behind them.
  assert.equal(counts.get(Tile.BankChest) ?? 0, 2, 'the bank floor lost its chests');
  assert.ok((counts.get(Tile.Vault) ?? 0) >= 3, 'the vault room lost its boxes');
  // Craft Row, the tannery, and the mill carry every trade's station.
  for (const [tile, name] of [
    [Tile.Furnace, 'furnace'],
    [Tile.Anvil, 'anvil'],
    [Tile.Loom, 'loom'],
    [Tile.TanningRack, 'tanning rack'],
    [Tile.HideFrame, 'hide frame'],
    [Tile.CarvingBench, 'carving bench'],
    [Tile.Alembic, 'alembic'],
    [Tile.Workbench, 'workbench'],
    [Tile.Sawhorse, 'sawhorse'],
  ] as const) {
    assert.ok((counts.get(tile) ?? 0) >= 1, `craft station missing: ${name}`);
  }
  // The market, the water, and the working town.
  assert.equal(counts.get(Tile.Well) ?? 0, 1, 'the Round keeps the one town well');
  assert.ok((counts.get(Tile.MarketStall) ?? 0) >= 10, 'the Round lost its stalls');
  assert.ok((counts.get(Tile.FishingSpot) ?? 0) >= 2, 'the river lost its fishing');
  assert.equal(counts.get(Tile.EelRun) ?? 0, 1, 'the eels left the bridge shadow');
  assert.ok((counts.get(Tile.Bridge) ?? 0) >= 40, 'the bridge went missing');
  assert.ok((counts.get(Tile.Dock) ?? 0) >= 20, 'the quay lost its planks');
  // The orchard bears real fruit now, and the garden family debuts.
  const appleTrees = (counts.get(Tile.AppleTreeMid) ?? 0) + (counts.get(Tile.AppleTreeRipe) ?? 0);
  const plumTrees = (counts.get(Tile.PlumTreeMid) ?? 0) + (counts.get(Tile.PlumTreeRipe) ?? 0);
  assert.ok(appleTrees >= 10, 'the orchard thinned');
  assert.ok(plumTrees >= 3, 'the plums went missing');
  assert.ok((counts.get(Tile.Hedge) ?? 0) >= 40, 'the hedges went unclipped');
  assert.ok((counts.get(Tile.HedgeGate) ?? 0) >= 4, 'the hedge arches closed');
  // THE FORD DRESSED — the dressing pass holds its anchors: the OLD
  // HOUND pair at the bridge, Peld's promised bell, the working
  // moorings and beached boats, the three books' desks, the fish
  // market's true slab (the stamped cart is gone for good), and not
  // one Basin left standing in for a real trough outdoors.
  assert.equal(counts.get(Tile.GuardianStatue) ?? 0, 2, 'the bridge lost its hounds');
  assert.equal(counts.get(Tile.TownBell) ?? 0, 1, "Peld's bell went quiet");
  assert.equal(counts.get(Tile.MooringPost) ?? 0, 2, 'the moorings pulled out');
  assert.equal(counts.get(Tile.BeachedSkiff) ?? 0, 2, 'the boats drifted off');
  assert.equal(counts.get(Tile.FishmongerSlab) ?? 0, 1, 'the fish market lost its slab');
  assert.equal(counts.get(Tile.ScribesDesk) ?? 0, 3, 'the town keeps three books');
  assert.equal(counts.get(Tile.NoticeBoard) ?? 0, 1, 'the Round lost its board');
  assert.equal(counts.get(Tile.WayShrine) ?? 0, 1, 'the Salt Road lost its shrine');
  // THE HERBALIST'S SHELF: Elowen's physic tub stands in her garden.
  assert.equal(counts.get(Tile.HerbPlanter) ?? 0, 1, "the physic tub left Elowen's garden");
  assert.equal(counts.get(Tile.WallFountain) ?? 0, 1, 'the memorial garden spring dried');
  assert.ok((counts.get(Tile.WaterTrough) ?? 0) >= 6, 'the troughs ran dry');
  assert.ok((counts.get(Tile.WoodStool) ?? 0) >= 4, 'the stools walked off');
  assert.ok((counts.get(Tile.StoneBench) ?? 0) >= 5, 'the stone seats changed');
  assert.equal(counts.get(Tile.QuenchTrough) ?? 0, 1, 'the forge lost its quench');
  assert.equal(counts.get(Tile.TapCask) ?? 0, 1, 'the yard cask ran out');
  // The stable — the coaching yard the roads paid for.
  assert.equal(counts.get(Tile.BeastPen) ?? 0, 1, 'the stable lost its stalls');
  assert.ok((counts.get(Tile.FeedTrough) ?? 0) >= 2, 'the feed bins emptied');
  assert.ok((counts.get(Tile.HayBale) ?? 0) >= 4, 'the hay ran out');
  // The farm kit dresses the working land.
  assert.equal(counts.get(Tile.Silo) ?? 0, 1);
  assert.equal(counts.get(Tile.Scarecrow) ?? 0, 1);
  assert.equal(counts.get(Tile.Dovecote) ?? 0, 1);
  assert.ok((counts.get(Tile.CompostBin) ?? 0) >= 2);
  assert.equal(counts.get(Tile.Apiary) ?? 0, 2);
  assert.equal(counts.get(Tile.FruitPress) ?? 0, 1);
  assert.ok((counts.get(Tile.GrowingFrame) ?? 0) >= 2);
  assert.ok((counts.get(Tile.DryingRack) ?? 0) >= 2);
  // The living-town pass: cookfires, ore, flax, common furrows.
  assert.equal(counts.get(Tile.Campfire) ?? 0, 2, 'the town lost a cookfire');
  assert.ok((counts.get(Tile.RockCopper) ?? 0) >= 2, 'the Delf lost its copper');
  assert.ok((counts.get(Tile.RockTin) ?? 0) >= 2, 'the Delf lost its tin');
  assert.equal(counts.get(Tile.RockIron) ?? 0, 1, 'the Delf keeps exactly one iron face');
  assert.ok((counts.get(Tile.FenceGate) ?? 0) >= 5, 'the working land lost its gates');
  assert.ok((counts.get(Tile.FibrePlant) ?? 0) >= 5, 'the retting bank lost its flax');
  assert.ok((counts.get(Tile.Tilled) ?? 0) >= 30, 'the Free Furrows went fallow');
  // THE TOWN WALL rings ONLY the town now: four road gates plus the
  // miners' postern (3 + 3 + 3 + 4 + 2) and four 45-degree corner
  // cuts of two tiles each.
  assert.equal(counts.get(Tile.GateGarrison) ?? 0, 15, 'the town gates changed');
  assert.ok((counts.get(Tile.WallGarrison) ?? 0) >= 280, 'the town wall came down');
  const amberDiags =
    (counts.get(Tile.WallGarrisonDiagNE) ?? 0) +
    (counts.get(Tile.WallGarrisonDiagNW) ?? 0) +
    (counts.get(Tile.WallGarrisonDiagSE) ?? 0) +
    (counts.get(Tile.WallGarrisonDiagSW) ?? 0);
  assert.equal(amberDiags, 8, 'the corner cuts changed');
  // The gates sit tile-exact on the road mouths, standing open.
  for (const y of [50, 51, 52]) assert.equal(at(16, y), Tile.GateGarrison);
  for (const x of [68, 69, 70]) assert.equal(at(x, 8), Tile.GateGarrison);
  for (const y of [70, 71, 72]) assert.equal(at(124, y), Tile.GateGarrison);
  for (const x of [85, 86, 87, 88]) assert.equal(at(x, 104), Tile.GateGarrison);
  for (const y of [20, 21]) assert.equal(at(124, y), Tile.GateGarrison, 'the postern shut');
  // The working livestock (the pasture herd AND the caravan oxen
  // boarding at Bray's — counts sum across spawn points per kind).
  const spawnKinds = new Map<string, number>();
  for (const s of z.spawns ?? []) spawnKinds.set(s.npc, (spawnKinds.get(s.npc) ?? 0) + s.count);
  assert.equal(spawnKinds.get('cow'), 5);
  assert.equal(spawnKinds.get('chicken'), 4);
  assert.equal(spawnKinds.get('sheep'), 3);
  // The people: eighteen named residents (the fifteen, plus Rowan at
  // the gate book, Bray at the stable, and Swale at the tannery),
  // the two traveling traders, the watch's ten-body rota, and Old
  // Serle at the Ford Ring's counter (THE SAND AND THE ROAR).
  const amberActors = z.actorSpawns ?? [];
  assert.equal(amberActors.length, 31, 'Amberford lost residents');
  assert.equal(
    amberActors.filter((a) => a.actor === 'round_trader').length,
    2,
    'the produce row lost its traders',
  );
  assert.equal(
    amberActors.filter((a) => a.actor === 'amberford_watch').length,
    10,
    'the wall lost its watch',
  );
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
    'registrar_rowan',
    'hostler_bray',
    'tanner_swale',
    'farmer_jorel',
    'farmer_tamsin',
    'keeper_ansel',
    'orchardist_perl',
    'courier_nib',
  ]) {
    assert.ok(amberActors.some((a) => a.actor === slug), `${slug} missing from Amberford`);
  }
  assert.equal(amberActors.filter((a) => a.routine).length, 31, 'every resident keeps hours');
  // The editor JSON round trip holds, flat-zone law included.
  const json = zoneToJson(z);
  assert.equal(json.elev, undefined, 'amberford is a flat zone');
  const { elev: _rt, ...back } = zoneToJson(zoneFromJson(json));
  const { elev: _src, ...src } = json;
  assert.deepEqual(back, src);
});

test('amberford: every doorway walks from the Round, and all four gates connect', () => {
  const z = buildAmberford();
  const walkable = (x: number, y: number): boolean =>
    x >= 0 && y >= 0 && x < z.width && y < z.height &&
    !TILE_DEFS[z.ground[y * z.width + x]! as Tile].solid;
  const seen = new Uint8Array(z.width * z.height);
  const queue: number[] = [53 * z.width + 74]; // the Market Round, by the well
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
  // All four road mouths connect to the Round, plus the postern.
  assert.equal(seen[51 * z.width + 0], 1, 'the Fordgate is severed');
  assert.equal(seen[0 * z.width + 69], 1, 'the North Gate is severed');
  assert.equal(seen[71 * z.width + 143], 1, 'the East Road is severed');
  assert.equal(seen[143 * z.width + 87], 1, 'the Salt Road is severed');
  assert.equal(seen[20 * z.width + 126], 1, "the miners' postern is severed");
  // And the banking floor is truly public: the lobby rug between the
  // two (solid) banking chests must be walkable from the door.
  assert.equal(seen[44 * z.width + 33], 1, 'the bank floor is unreachable');
  // The living-town posts walk from the Round too.
  const reach = (x: number, y: number, what: string): void => {
    assert.equal(seen[y * z.width + x], 1, `${what} cut off from the Round`);
  };
  reach(135, 20, 'the Delf floor');
  reach(82, 112, "the Catch Fire's ring");
  reach(98, 66, 'the coaching-yard fire ring');
  reach(8, 60, 'the Free Furrows interior');
  reach(26, 49, 'the Toll War memorial floor');
  reach(25, 65, 'the pilgrim alcove');
  reach(92, 124, 'the jetty finger');
  reach(80, 126, 'the Old Ford shallows');
  reach(86, 128, 'the bridge deck');
  reach(87, 140, 'the south bank road');
  reach(90, 15, 'the stable paddock');
  reach(92, 34, 'the herb garden');
  reach(124, 114, 'the tannery floor');
  reach(70, 82, 'the Commons green');
  reach(130, 126, 'the reeds nobody visits');
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
  assert.deepEqual(z.spawn, { x: -447.5, y: -239.5 });
  // ELEVATION IS REAL: the first terraced town exports a layer that
  // climbs all the way to the Hold, flat at the border apron.
  assert.ok(z.elev, 'silverfall must carry an elevation layer');
  let maxLvl = 0;
  for (const l of z.elev!) maxLvl = Math.max(maxLvl, l);
  assert.equal(maxLvl, 3, 'the Hold stands on the third terrace');
  // The gate road reaches the south border where the High Road lands
  // (the Vale growth moved the front door 128 rows down the mountain).
  for (const y of [254, 255]) {
    assert.equal(at(88, y), Tile.Path, `the approach road must reach row ${y}`);
  }
  // The High Street runs the whole Vale on stone: Silver Gate to
  // Vale Gate, one avenue, four gates on one line.
  for (const y of [120, 160, 220]) {
    assert.equal(at(88, y), Tile.StoneFloor, `the High Street breaks at row ${y}`);
  }
  // The Vale Bridge carries the avenue over the river's west leg.
  assert.equal(at(88, 197), Tile.Bridge, 'the Vale Bridge is down');
  const counts = new Map<number, number>();
  for (const t of z.ground) counts.set(t, (counts.get(t) ?? 0) + 1);
  const n = (t: Tile): number => counts.get(t) ?? 0;
  // The terraces are fenced and staired by the builder's own law
  // (39 of the Silver Stair + 6 on the Silent Terrace's two flights).
  // 45 of the Vale epic + the Grand Ring colosseum's eight stand
  // steps (two per crescent, two per grandstand wing — §10 THE SAND
  // GROWS).
  assert.equal(n(Tile.Ramp), 53, 'the city lost a flight');
  assert.ok(n(Tile.Cliff) > 500, 'the terrace fences are missing');
  // The mountain's ladder: silver in numbers, the deep teases above.
  assert.ok(n(Tile.RockSilver) >= 8, 'Silverfall without silver');
  assert.ok(n(Tile.RockMithril) >= 1 && n(Tile.RockAdamant) >= 1 && n(Tile.RockGold) >= 1);
  // Every profession works here: the full station roster, at capital
  // scale — the Emberway smelts, the Timberway carves, the Row sets.
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
  assert.ok(n(Tile.Furnace) >= 6 && n(Tile.Anvil) >= 3, 'the forge city smelts at scale');
  assert.ok(n(Tile.CarvingBench) >= 3, 'the Timberway lost its benches');
  assert.ok(n(Tile.Stump) >= 5, 'the saw yard lost its log stacks');
  // The bank, the tithe, the markets, the waters, the high snow.
  assert.ok(n(Tile.Vault) >= 5 && n(Tile.BankChest) >= 3, 'the mountain bank is short');
  assert.ok(n(Tile.MarketStall) >= 8, 'the stalls thinned');
  assert.ok(n(Tile.FishingSpot) >= 4, 'the mere and the pool must fish');
  assert.ok(n(Tile.ArchStone) >= 1, 'the Undercroft mouth lost its arch');
  // THE VALE KEEPS SHOP (the lower town's own roster): the mill
  // grinds, the commons mend, the taverns pour, the way keeps its
  // three stations, and the dead keep their three flames plus the
  // guild's two. (Oven/wheel/kiln/cobbler rows RETIRED 08-29 —
  // the museum audit sent them back to the shop.)
  assert.ok(n(Tile.Grindstone) >= 3, 'the mill lost its stones');
  assert.ok(n(Tile.CandleRack) >= 2, 'the chandlery went dark');
  assert.ok(n(Tile.TapCask) >= 3, 'the Vale taverns ran dry');
  assert.equal(n(Tile.WayShrine), 3, "the Pilgrim's Way lost a station");
  assert.equal(n(Tile.GuardianStatue), 3, 'the Vale lost a watcher');
  assert.equal(n(Tile.CandleShrine), 5, 'the kept flames miscount');
  assert.ok(n(Tile.BeachedSkiff) >= 2 && n(Tile.MooringPost) >= 2, 'the Kingshore lost its boats');
  assert.ok(n(Tile.Dock) >= 4, 'the quay planks are gone');
  assert.ok(n(Tile.TiedParcels) >= 3, 'the packed orders miscount');
  assert.ok(n(Tile.WaterTrough) >= 2, 'the wagon yard went dry');
  assert.ok(n(Tile.WallFountain) >= 1, 'the bath house lost its spring');
  assert.ok(n(Tile.Hedge) >= 20, 'Garland Row lost its hedge fronts');
  assert.ok(n(Tile.HedgeGate) >= 1, "the baker's wicket is gone");
  // THE FORTIFICATION LADDER (the Crown remaster + the Vale): the
  // VALE GATE (5) in the new outer curtain, the Silver Gate (5), the
  // Court Gate (9) at the stair crown, the CASTLE GATE (5) in the
  // precinct's south curtain, the Postern's 3 on the east shelf (the
  // Pinereach epic), the MINERS' POSTERN (2) in the old west run —
  // and the Grand Ring's two mouths (3 + 3, THE SAND AND THE ROAR).
  assert.equal(n(Tile.GateGarrison), 35, 'the city gates changed');
  assert.ok(n(Tile.WallGarrison) >= 240, 'the city curtain came down');
  const fallDiags =
    n(Tile.WallGarrisonDiagNE) + n(Tile.WallGarrisonDiagNW) +
    n(Tile.WallGarrisonDiagSE) + n(Tile.WallGarrisonDiagSW);
  assert.ok(fallDiags >= 24, 'the bastions lost their chamfers');
  for (let x = 86; x <= 90; x++) assert.equal(at(x, 112), Tile.GateGarrison);
  for (let x = 84; x <= 92; x++) assert.equal(at(x, 62), Tile.GateGarrison);
  for (let x = 86; x <= 90; x++) assert.equal(at(x, 32), Tile.GateGarrison);
  // The Crown sits its hall: two thrones, adjacent, and nothing else
  // in the realm wears the tile.
  assert.equal(n(Tile.Throne), 2, 'the thrones moved');
  assert.equal(at(77, 14), Tile.Throne);
  assert.equal(at(78, 14), Tile.Throne);
  assert.ok(n(Tile.Snow) > 0, 'the high ground lost its snow');
  assert.ok(n(Tile.Brazier) >= 10, 'the stair burns by brazier');
  // The Rookery: hidden, unofficial, and holding the Undercroft mouth.
  assert.ok(n(Tile.ChestMossy) >= 1, 'the Rookery lost its stash');
  // Rams on the Greenstair pasture — the city's only livestock.
  const spawnKinds = new Map((z.spawns ?? []).map((s) => [s.npc, s.count]));
  assert.equal(spawnKinds.get('ram'), 3);
  // The capital's cast: the Crown, the districts' masters, the Row's
  // keepers, the Rookery — and the pooled watch, guard, and stalls.
  const fallActors = z.actorSpawns ?? [];
  // 64 souls of the Crown remaster + 29 of THE PEOPLE OF THE VALE
  // (18 named, 6 lower watch, 3 pilgrims, 2 carters) + Ringmaster
  // Cato at the Grand Ring's counter (THE SAND AND THE ROAR).
  assert.equal(fallActors.length, 94, 'Silverfall lost residents');
  for (const slug of [
    'king_aeriex',
    'queen_kayri',
    'warden_maren',
    'drillmaster_jorunn',
    'steward_ansgar',
    'herald_ossian',
    'shrinekeeper_sella',
    'bursar_odele',
    'enchantress_solvei',
    'marshal_kestrel',
    'silversmith_vigdis',
    'weaver_ottilie',
    'scrivener_tove',
    'innkeep_ragna',
    'foreman_grettir',
    'smeltmaster_koll',
    'assayer_runa',
    'forgemistress_balla',
    'mason_petra',
    'carpenter_stig',
    'fletcher_haki',
    'cooper_dagny',
    'cook_signy',
    'herbalist_wyn',
    'gardener_ivo',
    'hostler_osa',
    'magpie_mab',
    'fence_calder',
    'lookout_pike',
    'miller_brant',
    'baker_hedda',
    'taverner_ulf',
    'keeper_ronnaug',
    'potter_signe',
    'chandler_wick',
    'cobbler_finn',
    'wainwright_torvald',
    'hostelkeeper_maeve',
    'gravekeeper_aldous',
    'fisher_brigga',
    'fisher_holm',
    'bathkeeper_una',
    'guildmaster_soren',
    'monger_petya',
    'monger_lucan',
    'sergeant_varn',
    'courier_pip',
  ]) {
    assert.ok(fallActors.some((a) => a.actor === slug), `${slug} missing from Silverfall`);
  }
  // The lower watch musters six: the Vale Gate rota pair, the wet
  // market beat, the shore, the wagon yard, and the threshold post.
  assert.equal(
    fallActors.filter((a) => a.actor === 'vale_watch').length, 6,
    'the Vale lost its watch',
  );
  // THE GARRISON MUSTERS (the Crown remaster): 16 city watch — the
  // 12 standing posts and rota of the garrison pass, plus the Court
  // Gate's second sentry, the bank front, the gate-market beat, and
  // the Lantern Row lantern-hours beat — and NINE castle guard on
  // the precinct's posts with the drill pair hot-bunking the
  // garrison range. The household staffs the palace: four pooled
  // servants beside the steward, the drillmaster, and the herald.
  assert.equal(fallActors.filter((a) => a.actor === 'silverfall_watch').length, 16);
  assert.equal(fallActors.filter((a) => a.actor === 'castle_guard').length, 9);
  assert.equal(fallActors.filter((a) => a.actor === 'castle_servant').length, 4);
  assert.equal(fallActors.filter((a) => a.actor === 'galleria_trader').length, 3);
  assert.equal(fallActors.filter((a) => a.actor === 'gate_monger').length, 2);
  assert.equal(fallActors.filter((a) => a.routine).length, 94, 'every keeper keeps hours');
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
  assert.equal(seen[255 * z.width + 88], 1, 'the High Road mouth is severed');
  assert.equal(seen[127 * z.width + 88], 1, 'the Silver Gate mouth is severed');
  assert.equal(seen[95 * z.width + 88], 1, 'the first flight is severed');
  assert.equal(seen[63 * z.width + 88], 1, 'the second flight is severed');
  assert.equal(seen[36 * z.width + 88], 1, 'the third flight is severed');
  // THE VALE WALKS: the Vale Gate passage, both river banks, the
  // Delvers' lane, the Silent Terrace (up its lych stair), the mill
  // lane, the wagon yard, and the Kingshore lane all reach the same
  // one city the spawn stands in.
  assert.equal(seen[237 * z.width + 88], 1, 'the Vale Gate passage is severed');
  assert.equal(seen[160 * z.width + 43], 1, "the Delvers' lane is severed");
  assert.equal(seen[130 * z.width + 20], 1, 'the Silent Terrace is severed');
  assert.equal(seen[157 * z.width + 120], 1, 'the mill lane is severed');
  assert.equal(seen[220 * z.width + 120], 1, 'the wagon yard is severed');
  assert.equal(seen[215 * z.width + 30], 1, 'the Kingshore lane is severed');
  assert.equal(seen[110 * z.width + 33], 1, "the miners' postern throat is severed");
  // The castle opens: the gate passage, the hall gate, the throne
  // dais approach, the bailey, and the drill yard all walk.
  assert.equal(seen[31 * z.width + 88], 1, 'the castle gate passage is severed');
  assert.equal(seen[25 * z.width + 77], 1, 'the hall gate apron is severed');
  assert.equal(seen[15 * z.width + 77], 1, 'the processional is severed');
  assert.equal(seen[28 * z.width + 65], 1, 'the drill yard is severed');
  assert.equal(seen[18 * z.width + 126], 1, 'the shrine pad is severed');
  assert.equal(seen[26 * z.width + 110], 1, 'the royal garden is severed');
  assert.equal(seen[14 * z.width + 95], 1, 'the east walk is severed');
  assert.equal(seen[11 * z.width + 14], 1, 'the deep gallery is severed');
  // THE POSTERN LANE walks end to end: the gatefront shelf, through
  // the gate in its throat, up the cliff foot to the muster yard, and
  // out the north hem where the Hoargate Road's first milepost
  // stands. The pass is only a pass if a body can get to it.
  assert.equal(seen[95 * z.width + 171], 1, 'the Postern Lane is severed below the gate');
  assert.equal(seen[80 * z.width + 171], 1, 'the postern gate does not open');
  assert.equal(seen[12 * z.width + 171], 1, 'the muster yard is severed');
  assert.equal(seen[8 * z.width + 171], 1, 'the muster hut is sealed');
  assert.equal(seen[0 * z.width + 172], 1, 'the Hoargate Road mouth is severed');
  // And the curtain still seals: nothing walks AROUND the east end of
  // the wall, only through the lane's own gate.
  assert.equal(seen[113 * z.width + 174], 0, 'the east curtain leaks past the scree');
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
  // THE WORLDS APART: the y is history, the tag is the law — the
  // declaration is what actually seats the district in the rock.
  assert.equal(z.plane, UNDERWORLD_PLANE_ID, 'the Undercroft declares the underworld plane');
  // THE REVOICE grew the rect east+south into solid dark rock —
  // origin fixed, both portals untouched.
  assert.equal(z.width, 128);
  assert.equal(z.height, 96);
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
  assert.ok(n(Tile.ChestIron) >= 3 && n(Tile.ChestGilded) >= 1 && n(Tile.ChestMossy) >= 3);
  assert.ok(n(Tile.CrackedCaveWall) >= 1, 'the guild keeps one secret');
  // THE REVOICE's four wings: the winch head's chains, the drowned
  // working's planks and visible islet chest, the chapel's pillars
  // and nine kept flames (vault 2 + memorial 3 + chapel 4), and the
  // war-mouth's abandoned barricade.
  assert.ok(n(Tile.WallChains) >= 3, 'the haulage line came down');
  assert.equal(n(Tile.GrandPillar), 2, 'the chapel lost a pillar');
  assert.equal(n(Tile.CandleShrine), 9, 'the kept flames miscount below');
  assert.equal(n(Tile.SpikeBarrier), 1, 'the barricade is gone');
  assert.ok(n(Tile.Dock) >= 6, 'the drowned working lost its planks');
  assert.equal(n(Tile.KeepPool), 1, 'the cave-fish pool is gone');
  assert.ok(n(Tile.MineCart) >= 1 && n(Tile.LootedChest) >= 2, 'the long haulage forgot its story');
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
  const croftActors = z.actorSpawns ?? [];
  assert.equal(croftActors.length, 4, 'the Deep Market lost its keepers');
  for (const slug of ['reeve_coppin', 'veteran_skarn', 'broker_varga', 'curio_ninebrass']) {
    assert.ok(croftActors.some((a) => a.actor === slug), `${slug} missing from the Deep Market`);
  }
  assert.equal(croftActors.filter((a) => a.routine).length, 4, 'every keeper keeps hours');
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

test('saltmere: the town at the waters end holds its shore, trades, and gate', () => {
  const z = buildSaltmere();
  assert.equal(z.id, 'saltmere');
  assert.deepEqual(z.origin, { x: SALTMERE_RECT.x, y: SALTMERE_RECT.y });
  assert.equal(z.width, SALTMERE_RECT.w);
  assert.equal(z.height, SALTMERE_RECT.h);
  const at = (x: number, y: number): Tile => z.ground[y * z.width + x]! as Tile;
  assert.deepEqual(z.spawn, { x: SALTMERE_RECT.x + 54.5, y: SALTMERE_RECT.y + 44.5 });
  assert.equal(TILE_DEFS[at(54, 44)].solid, false, 'spawn tile must be walkable');
  // The gate mouth meets the carved Salt Road at the north hem.
  for (const x of [52, 53, 54]) {
    assert.equal(at(x, 0), Tile.Path, `gate col ${x} must reach the north edge`);
    assert.equal(at(x, 2), Tile.GateGarrison, `gate col ${x} must stand open`);
  }
  const counts = new Map<number, number>();
  for (const t of z.ground) counts.set(t, (counts.get(t) ?? 0) + 1);
  // The wall: one gate, both curtain ends wading into the mere.
  assert.equal(counts.get(Tile.GateGarrison) ?? 0, 3, 'the town gate changed');
  assert.ok((counts.get(Tile.WallGarrison) ?? 0) >= 180, 'the curtain came down');
  assert.equal(
    (counts.get(Tile.WallGarrisonDiagSE) ?? 0) + (counts.get(Tile.WallGarrisonDiagSW) ?? 0),
    2,
    'the corner cuts changed',
  );
  // The trades: bank, pans, smoke school, ropewalk, slipway, piers.
  assert.equal(counts.get(Tile.BankChest) ?? 0, 2, 'the Counting House lost its chests');
  assert.equal(counts.get(Tile.Vault) ?? 0, 2, 'the vault room changed');
  assert.equal(counts.get(Tile.Campfire) ?? 0, 3, 'the smoke fires changed');
  assert.equal(counts.get(Tile.Loom) ?? 0, 2, 'the ropewalk lost a loom');
  assert.ok((counts.get(Tile.Sawhorse) ?? 0) >= 1, 'the slipway lost its sawhorse');
  assert.ok((counts.get(Tile.CarvingBench) ?? 0) >= 1, 'the slipway lost its bench');
  assert.ok((counts.get(Tile.Workbench) ?? 0) >= 1, 'the shed lost its bench');
  assert.equal(counts.get(Tile.FishingSpot) ?? 0, 4, 'the fishing changed');
  assert.ok((counts.get(Tile.MarketStall) ?? 0) >= 6, 'the quay market thinned');
  assert.ok((counts.get(Tile.Dock) ?? 0) >= 60, 'the piers came up short');
  assert.ok((counts.get(Tile.WaterShallow) ?? 0) >= 48, 'the pans drained');
  assert.ok((counts.get(Tile.Sand) ?? 0) >= 300, 'the flats washed away');
  assert.ok((counts.get(Tile.Water) ?? 0) >= 400, 'the mere shrank');
  assert.ok((counts.get(Tile.Bed) ?? 0) >= 30, 'the town lost its beds');
  // The people: eighteen posts, every one keeping hours (the gate
  // gained its night relief — THE CHANGING OF THE GUARD).
  const actors = z.actorSpawns ?? [];
  assert.equal(actors.length, 18, 'the cast changed size');
  for (const slug of [
    'portreeve_brack',
    'factor_neave',
    'innkeep_dorrit',
    'chandler_swale',
    'salter_ondra',
    'smokemistress_alba',
    'angler_voss',
    'boatwright_seff',
    'roper_jessa',
    'lightkeeper_lund',
    'pilot_fane',
  ] as const) {
    assert.ok(actors.some((a) => a.actor === slug), `missing resident: ${slug}`);
  }
  assert.equal(actors.filter((a) => a.actor === 'saltmere_watch').length, 4, 'the watch changed');
  assert.equal(actors.filter((a) => a.actor === 'saltmere_fisher').length, 3, 'the crews changed');
  assert.equal(actors.filter((a) => a.routine).length, actors.length, 'every resident keeps hours');
  const spawnKinds = new Map((z.spawns ?? []).map((s) => [s.npc, s.count]));
  assert.equal(spawnKinds.get('chicken'), 3);
  // The editor round trip holds, flat-zone law included.
  const json = zoneToJson(z);
  assert.equal(json.elev, undefined, 'saltmere is a flat zone');
  const { elev: _rt, ...back } = zoneToJson(zoneFromJson(json));
  const { elev: _src, ...src } = json;
  assert.deepEqual(back, src);
});

test('saltmere: every doorway walks from the quay square, out to the light', () => {
  const z = buildSaltmere();
  const walkable = (x: number, y: number): boolean =>
    x >= 0 && y >= 0 && x < z.width && y < z.height &&
    !TILE_DEFS[z.ground[y * z.width + x]! as Tile].solid;
  const seen = new Uint8Array(z.width * z.height);
  const queue: number[] = [44 * z.width + 54]; // the quay square
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
  assert.deepEqual(unreachable, [], `doorways cut off from the square: ${unreachable.join(' ')}`);
  const reach = (x: number, y: number, what: string): void => {
    assert.equal(seen[y * z.width + x], 1, `${what} unreachable at (${x},${y})`);
  };
  reach(53, 0, 'the gate mouth');
  reach(46, 59, 'pier A tip');
  reach(58, 63, 'pier B tip');
  reach(71, 57, 'pier C tip');
  reach(15, 50, 'the pans walk');
  reach(17, 70, "the Mere Light's south nose");
  reach(14, 67, "the islet's west ring");
  reach(94, 54, "the boatwright's strand");
  reach(41, 40, 'the supper fire ring');
  reach(60, 17, 'the Counting House lobby');
  reach(84, 44, 'the rack yard');
  reach(91, 16, "the roper's end room");
  // Every actor post stands on ground the square can reach.
  for (const a of z.actorSpawns ?? []) {
    reach(Math.floor(a.x - z.origin.x), Math.floor(a.y - z.origin.y), `post ${a.actor}`);
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
  // for every pre-elevation zone stays byte-identical. (Amberford is
  // the flat witness now: Dawnmead grew the count-knoll in band 6.)
  const json = zoneToJson(buildAmberford());
  assert.equal(json.elev, undefined);
  assert.ok(zoneFromJson(json).elev!.every((v) => v === 0));
  // Dawnmead's one raise round-trips with its layer intact.
  const dawn = zoneToJson(buildDawnmead());
  assert.ok(dawn.elev !== undefined);
  assert.deepEqual(zoneToJson(zoneFromJson(dawn)), dawn);
});


test('THE SIGN LAW: every authored board carries words, and every record has a board', () => {
  const zones = [buildDawnmead(), buildAmberford(), buildSilverfall(), buildUndercroft()];
  let total = 0;
  for (const z of zones) {
    const written = new Map<string, ZoneSign>();
    for (const sign of z.signs ?? []) {
      const key = `${sign.x},${sign.y}`;
      assert.ok(!written.has(key), `${z.id}: two records fight over the board at ${key}`);
      written.set(key, sign);
      // A record with nothing on it is a board nobody can read.
      assert.ok(
        sign.title !== '' || (sign.lines ?? []).some((l) => l !== ''),
        `${z.id}: the sign at ${key} says nothing`,
      );
      // The shared caps are the only truth about length — content that
      // overruns them would be silently trimmed on the way to a player.
      assert.ok(sign.title.length <= SIGN_MAX_TITLE, `${z.id}: title too long at ${key}`);
      for (const line of sign.lines ?? []) {
        assert.ok(line.length <= SIGN_MAX_LINE, `${z.id}: line too long at ${key}: "${line}"`);
      }
      assert.ok((sign.lines ?? []).length <= SIGN_MAX_LINES, `${z.id}: too many lines at ${key}`);
    }
    // ...and no blank boards: a sign tile the author never wrote on is
    // furniture pretending to be information.
    for (let i = 0; i < z.ground.length; i++) {
      if (!SIGN_TILES.has(z.ground[i] as Tile)) continue;
      const x = z.origin.x + (i % z.width);
      const y = z.origin.y + Math.floor(i / z.width);
      assert.ok(written.has(`${x},${y}`), `${z.id}: blank board standing at ${x},${y}`);
      total++;
    }
  }
  assert.ok(total >= 20, `the world should be signposted — only ${total} boards stand`);
});

test('the builder refuses a sign record whose board got stamped over', () => {
  const b = new ZoneBuilder('t_sign', 'Sign Test', { x: 0, y: 4096 }, 16, 16, Tile.Grass);
  b.spawn(8, 8);
  b.sign(4, 4, 'HERE', ['a note']);
  b.set(4, 4, Tile.Barrel); // a later stamp buries the board
  assert.throws(() => b.build(), /has no sign tile under it/);
});

test('sign records survive the editor JSON round trip', () => {
  const b = new ZoneBuilder('t_sign2', 'Sign Test', { x: 0, y: 4096 }, 16, 16, Tile.Grass);
  b.spawn(8, 8);
  b.sign(4, 4, 'DAWNMEAD', ['west, by the First Road'], Tile.Signpost);
  b.sign(6, 4, 'TITLE ONLY');
  const z = b.build();
  assert.deepEqual(zoneToJson(zoneFromJson(zoneToJson(z))).signs, zoneToJson(z).signs);
  // A title-only board stores no lines key at all (the absent-stays-
  // absent law every placement keeps).
  assert.equal(z.signs![1]!.lines, undefined);
});

// ---------------------------------------------------------- PINEWATCH
// The town that watches the deep wood. The anchors pinned here are the
// ones routines and quests measure from: move one and something walks
// into a wall at midnight.
test('pinewatch: the watch town holds its knoll, its waters, and four ways in', () => {
  const z = buildPinewatch();
  assert.equal(z.id, 'pinewatch');
  assert.equal(z.width, 128);
  assert.equal(z.height, 152, 'PINEWATCH REMADE grew the rect south, origin fixed');
  assert.equal(z.origin.x, 1096);
  assert.equal(z.origin.y, -404);
  assert.ok(z.elev, 'the Old Watch stands on a knoll, so the zone carries elevation');
  const at = (x: number, y: number): Tile => z.ground[y * z.width + x] as Tile;
  const n = (t: Tile): number => z.ground.reduce((c, g) => (g === t ? c + 1 : c), 0);
  // Water on three faces now: the Glasswater north-west AND down the
  // whole west hem, the tarn owning the south-east.
  assert.ok(n(Tile.WaterDeep) + n(Tile.Water) > 3000, 'the waters shrank');
  assert.ok(n(Tile.WaterShallow) >= 250, 'the wading margins and the millrace');
  assert.ok(n(Tile.Sand) >= 250, 'the working strand and the Winter Strand');
  assert.ok(n(Tile.Dock) >= 40, 'the boom, the piers, the slip, the fisher steps');
  assert.equal(n(Tile.FishingSpot), 7, 'the pond, the bay, the steps, the strand, the tarn');
  // Three flights now: the Old Watch's stair, the Answering Beacon's
  // pair, the Shore Bastion's one.
  assert.equal(n(Tile.Ramp), 6, 'the knoll, the beacon, and the bastion keep their flights');
  assert.ok(n(Tile.Cliff) >= 60, 'the knoll lost its rim');
  // The trades that exist nowhere else in the Dawnlands at this scale.
  assert.ok(n(Tile.Sawhorse) >= 14, 'the spar beds and the saw floor');
  assert.ok(n(Tile.Stump) >= 20, 'the timber strand, the skidway, the cordwood');
  assert.ok(n(Tile.SaplingPine) >= 20, 'the nursery is the Wardline is the town');
  assert.ok(n(Tile.TreePine) >= 300, 'the Pinereach comes in over the walls');
  assert.equal(n(Tile.RockIron), 3, "the ore cut — the mountain pays in iron");
  assert.equal(n(Tile.Furnace), 3, "the axe-smith's two fires and the bloomery");
  assert.equal(n(Tile.Anvil), 2);
  assert.equal(n(Tile.Vault), 2, 'the Charterhouse strongroom');
  assert.equal(n(Tile.BankChest), 2);
  // Four ways in: the Timber Gate in the cut (3), the Hartgate in the
  // notch (3), the Wardline (2), the Northguard's town door (2) — and
  // the Winter Strand, which is not a gate eleven months of the year.
  assert.equal(n(Tile.GateGarrison), 10, 'the cut, the notch, the Wardline, the fort door');
  assert.ok(n(Tile.WallGarrison) >= 220, 'the curtain came down');
  // The gate mouths meet the carved routes tile-exact.
  for (const x of [31, 32, 33]) {
    assert.equal(at(x, 151), Tile.Path, `the Timber Road mouth must reach the south edge at ${x}`);
    assert.equal(at(x, 140), Tile.GateGarrison, `the Timber Gate stands in the cut at ${x}`);
  }
  for (const x of [121, 122, 123]) {
    assert.equal(at(x, 0), Tile.Path, `the Hartway mouth must reach the north edge at ${x}`);
    assert.equal(at(x, 5), Tile.GateGarrison, `the Hartgate stands in the notch at ${x}`);
  }
  assert.equal(at(106, 60), Tile.GateGarrison, 'the Wardline gate stands');
  assert.equal(at(101, 27), Tile.GateGarrison, "the Northguard's town door opens on the Fort Lane");
  // The spawn is the muster yard: the respawn hearth of the north-east.
  assert.deepEqual(z.spawn, { x: 1096 + 66.5, y: -404 + 50.5 });
  // The cast.
  const actors = z.actorSpawns ?? [];
  assert.equal(actors.length, 37, 'Pinewatch lost residents (REMADE: 22 + the Northguard and the Southreach)');
  for (const slug of [
    'reeve_halla', 'old_torvi', 'sawmistress_groa', 'sparmaster_yannick', 'smith_vigga',
    'innkeep_sunniva', 'pitchmaster_rullo', 'factor_ebba', 'buyer_ospren', 'storekeep_nial',
    'tallyman_bram', 'boomsman_kettil', 'nurseryman_odd', 'warden_sigrun', 'fisher_ylva',
    'captain_stellan', 'quartermaster_berget', 'serjeant_ove', 'houndmistress_ranka',
    'fletcher_espen', 'hunter_kolbrun', 'herbalist_maren', 'ironmaster_torger', 'drover_sylvi',
  ]) {
    assert.ok(actors.some((a) => a.actor === slug), `${slug} missing from Pinewatch`);
  }
  assert.equal(actors.filter((a) => a.actor === 'pinewatch_watch').length, 3);
  assert.equal(actors.filter((a) => a.actor === 'pinewatch_sawyer').length, 3);
  assert.equal(actors.filter((a) => a.actor === 'pinewatch_northguard').length, 4, 'the gate pair and the patrol pair');
  assert.equal(actors.filter((a) => a.actor === 'pinewatch_hunter').length, 2, 'the cull keeps two on the board');
  assert.equal(actors.filter((a) => a.routine).length, 37, 'every keeper keeps hours');
  assert.ok((z.signs ?? []).length >= 16, 'the town lost its boards');
  // The elevation layer round-trips (the Silverfall law, not the flat one).
  const json = zoneToJson(z);
  assert.ok(json.elev !== undefined, 'the knoll must serialize');
  assert.deepEqual(zoneToJson(zoneFromJson(json)), json);
});

test('pinewatch: every door, pier, kiln and bed walks from the muster yard', () => {
  const z = buildPinewatch();
  const lvl = (i: number): number => z.elev![i] ?? 0;
  const walkable = (x: number, y: number): boolean =>
    x >= 0 && y >= 0 && x < z.width && y < z.height &&
    !TILE_DEFS[z.ground[y * z.width + x]! as Tile].solid;
  const seen = new Uint8Array(z.width * z.height);
  const start = 50 * z.width + 66;
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
      if (lvl(ni) !== lvl(i) && z.ground[i] !== Tile.Ramp && z.ground[ni] !== Tile.Ramp) continue;
      seen[ni] = 1;
      queue.push(ni);
    }
  }
  const unreachable: string[] = [];
  for (let i = 0; i < z.ground.length; i++) {
    const t = z.ground[i];
    if (
      (t === Tile.DoorwayStone || t === Tile.DoorwayWood ||
        t === Tile.DoorwayStoneWide || t === Tile.DoorwayWoodWide) && !seen[i]
    ) {
      unreachable.push(`(${i % z.width},${Math.floor(i / z.width)})`);
    }
  }
  assert.deepEqual(unreachable, [], `doorways cut off from the yard: ${unreachable.join(' ')}`);
  for (const [what, x, y] of [
    ['the tower stair top', 66, 38], ['the tower floor', 66, 40],
    ['the west pier', 50, 20], ['the raft dock', 60, 18], ['the fisher steps', 88, 12],
    ['the saw floor', 33, 48], ['the log deck', 36, 38], ['the board yard', 28, 58],
    ['the spar beds', 33, 82], ['the pitch kilns', 96, 82], ['the nursery beds', 94, 24],
    ['the Charterhouse floor', 90, 43], ['the inn hearth room', 79, 69],
    ['the Timber Road mouth in the cut', 32, 148], ['the Timber Gate lane', 32, 138],
    ['the Hartway mouth in the notch', 122, 2], ['the Northguard parade ground', 112, 12],
    ['the Answering Beacon', 121, 10], ['the Shore Bastion', 12, 120],
    ['the Winter Strand', 6, 110], ['the ore terrace', 43, 108],
    ['the Wardline gate', 106, 60], ['the Wardline path', 120, 59],
  ] as const) {
    assert.equal(seen[y * z.width + x], 1, `${what} is severed`);
  }
  // Every post a routine measures from stands on ground you can stand on.
  for (const a of z.actorSpawns ?? []) {
    const lx = Math.floor(a.x - z.origin.x);
    const ly = Math.floor(a.y - z.origin.y);
    assert.equal(seen[ly * z.width + lx], 1, `${a.actor}'s post at (${lx},${ly}) is unreachable`);
  }
});

// ----------------------------------------------------------- HARTFELL
// The town past the treeline. The anchors pinned here are the ones the
// people pass and the tithe arc will measure from: the Kettle, the
// stones, the sledge, the gates, and every door.
test('hartfell: the fell town holds its warm water, its stones, and four ways in', () => {
  const z = buildHartfell();
  assert.equal(z.id, 'hartfell');
  assert.equal(z.width, HARTFELL_RECT.w);
  assert.equal(z.height, HARTFELL_RECT.h);
  assert.equal(z.origin.x, HARTFELL_RECT.x);
  assert.equal(z.origin.y, HARTFELL_RECT.y);
  assert.ok(z.elev, 'the crag shelves carry elevation');
  const at = (x: number, y: number): Tile => z.ground[y * z.width + x] as Tile;
  const n = (t: Tile): number => z.ground.reduce((c, g) => (g === t ? c + 1 : c), 0);
  // Two waters and the warm one: the Graywater west, the Darkwater
  // north-east, the Kettle at the heart — and snow owning everything
  // except the melt ring. The one green circle is the town's image.
  assert.ok(n(Tile.Water) > 800, 'the lakes shrank');
  assert.ok(n(Tile.WaterShallow) >= 300, 'the shallows, the Warm Run, the bathing rim');
  assert.ok(n(Tile.Snow) > 2000, 'the fell lost its snow');
  assert.ok(n(Tile.Swamp) >= 30, 'the bay marsh and the wallow');
  // The crag shelves: two flights up, one notch through.
  assert.equal(n(Tile.Ramp), 6, 'the Lookout and the Beacon keep one flight each');
  assert.ok(n(Tile.Cliff) >= 150, 'the shelf rims are the north wall');
  // The trades that exist nowhere else at this scale.
  assert.equal(n(Tile.Vault), 1, "the Hidehall strongroom");
  assert.equal(n(Tile.BankChest), 2, 'two chests and a woman who counts');
  assert.equal(n(Tile.Furnace), 1, 'a working smith, not a master');
  assert.equal(n(Tile.Anvil), 1);
  assert.equal(n(Tile.SalmonRun), 2, 'the cold quay fishes the ice shelf');
  assert.equal(n(Tile.PillarStone), 11, 'the Quiet Stones ring and the old boundary row');
  assert.equal(n(Tile.BeastPen), 1, 'the companion pen by the folds');
  assert.ok(n(Tile.Fence) >= 80, 'the folds and the out-fold');
  assert.ok(n(Tile.Dock) >= 10, 'the two piers');
  // Four ways in: south gate, herdgate, shoregate, the Tithegate.
  assert.equal(n(Tile.GateGarrison), 12);
  assert.ok(n(Tile.WallGarrison) >= 200, 'the curtain came down');
  // The gate mouths meet the carved routes tile-exact: the Hartway
  // lands at local (54,95), the Cairn Path leaves at local (26,0).
  for (const x of [53, 54, 55]) {
    assert.equal(at(x, 95), Tile.Path, `the Hartway mouth must reach the south edge at ${x}`);
    assert.equal(at(x, 88), Tile.GateGarrison, `the south gate stands at ${x}`);
  }
  for (const x of [25, 26]) {
    assert.equal(at(x, 0), Tile.Dirt, `the Cairn Path must reach the north edge at ${x}`);
  }
  assert.equal(at(25, 12), Tile.GateGarrison, 'the Tithegate bars the notch');
  assert.equal(at(20, 50), Tile.GateGarrison, 'the shoregate opens to the quay');
  assert.equal(at(100, 63), Tile.GateGarrison, 'the herdgate opens to the drove');
  // The spawn is the Kettle's north walk: the respawn hearth of the far north.
  assert.deepEqual(z.spawn, { x: HARTFELL_RECT.x + 84.5, y: HARTFELL_RECT.y + 37.5 });
  // The cast: eighteen named, three on the horn, two at the folds.
  const actors = z.actorSpawns ?? [];
  assert.equal(actors.length, 23, 'Hartfell lost residents');
  for (const slug of [
    'speaker_ashild', 'springkeeper_maeva', 'huntmaster_kolgrim', 'guide_sunn',
    'furrier_ranna', 'tallywife_inga', 'chandler_ulfa', 'smokemaster_geir',
    'bonecarver_tuli', 'smith_eirik', 'innkeep_brandulf', 'herdmaster_swein',
    'tithekeeper_orvar', 'elder_gunvor', 'netkeeper_eyvor', 'waykeeper_signe',
    'buyer_hallward', 'pedlar_grimm',
  ]) {
    assert.ok(actors.some((a) => a.actor === slug), `${slug} missing from Hartfell`);
  }
  assert.equal(actors.filter((a) => a.actor === 'hartfell_watch').length, 3);
  assert.equal(actors.filter((a) => a.actor === 'hartfell_herder').length, 2);
  assert.equal(actors.filter((a) => a.routine).length, 23, 'every keeper keeps hours');
  const herds = z.spawns ?? [];
  assert.ok(herds.some((s) => s.npc === 'stag'), 'the stag left the fold');
  assert.equal(herds.filter((s) => s.npc === 'hind').length, 2, 'the hinds left the fold');
  assert.ok((z.signs ?? []).length >= 16, 'the town lost its boards');
  // The elevation layer round-trips (the Silverfall law, not the flat one).
  const json = zoneToJson(z);
  assert.ok(json.elev !== undefined, 'the shelves must serialize');
  assert.deepEqual(zoneToJson(zoneFromJson(json)), json);
});

test('hartfell: every door, pier, fold and stone walks from the Kettle', () => {
  const z = buildHartfell();
  const lvl = (i: number): number => z.elev![i] ?? 0;
  const walkable = (x: number, y: number): boolean =>
    x >= 0 && y >= 0 && x < z.width && y < z.height &&
    !TILE_DEFS[z.ground[y * z.width + x]! as Tile].solid;
  const seen = new Uint8Array(z.width * z.height);
  const start = 37 * z.width + 84; // the spawn walk
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
      if (lvl(ni) !== lvl(i) && z.ground[i] !== Tile.Ramp && z.ground[ni] !== Tile.Ramp) continue;
      seen[ni] = 1;
      queue.push(ni);
    }
  }
  const unreachable: string[] = [];
  for (let i = 0; i < z.ground.length; i++) {
    const t = z.ground[i];
    if (
      (t === Tile.DoorwayStone || t === Tile.DoorwayWood ||
        t === Tile.DoorwayStoneWide || t === Tile.DoorwayWoodWide) && !seen[i]
    ) {
      unreachable.push(`(${i % z.width},${Math.floor(i / z.width)})`);
    }
  }
  assert.deepEqual(unreachable, [], `doorways cut off from the Kettle: ${unreachable.join(' ')}`);
  for (const [what, x, y] of [
    ['the Beacon platform', 38, 12], ['the Lookout', 14, 12],
    ['the Quiet Stones', 26, 6], ['the Tithegate', 25, 12],
    ["Orvar's hut", 26, 22], ['the cold store', 26, 30], ['the sledge', 33, 27],
    ['Horn Hall', 44, 24], ['the butts', 64, 21],
    ['the Springhall moot', 79, 28], ['the warm pool room', 92, 32],
    ['the Kettle walk north', 84, 38], ['the Kettle walk south', 84, 50],
    ["the Speaker's hall", 62, 42], ["the Speaker's chamber", 65, 47],
    ['the Warm Row west', 73, 57], ["Tuli's bone shop", 93, 58],
    ['the Hidehall floor', 68, 70], ['the strongroom', 60, 68],
    ["Ranna's room", 61, 74], ["Inga's room", 71, 74],
    ['the chandlery', 84, 68], ['the smoke hut', 81, 78], ['the tallow shed', 95, 80],
    ['the smithy', 68, 83], ['the wardhut', 95, 68],
    ['the inn common room', 39, 73], ["Hallward's good room", 47, 83],
    ["the waykeeper's post", 59, 84], ['the bothy', 31, 52],
    ['fold A', 26, 67], ['fold B', 26, 77],
    ['the west pier', 2, 68], ["Eyvor's hut", 13, 77], ["Gunvor's cottage", 13, 55],
    ['the out-fold', 113, 60], ['the Darkwater shore', 108, 42],
    ['the Hartway mouth', 54, 95], ['the Cairn Path mouth', 26, 0],
    ['the shore lane', 18, 50],
  ] as const) {
    assert.equal(seen[y * z.width + x], 1, `${what} is severed`);
  }
  // Every post a routine measures from stands on ground you can stand on.
  for (const a of z.actorSpawns ?? []) {
    const lx = Math.floor(a.x - z.origin.x);
    const ly = Math.floor(a.y - z.origin.y);
    assert.equal(seen[ly * z.width + lx], 1, `${a.actor}'s post at (${lx},${ly}) is unreachable`);
  }
});

test('kingsdelf: the delf town holds its stone, its glass, and three ways in', () => {
  const z = buildKingsdelf();
  assert.equal(z.id, 'kingsdelf');
  assert.equal(z.width, KINGSDELF_RECT.w);
  assert.equal(z.height, KINGSDELF_RECT.h);
  assert.equal(z.origin.x, KINGSDELF_RECT.x);
  assert.equal(z.origin.y, KINGSDELF_RECT.y);
  assert.ok(z.elev, 'the crag shelves carry elevation');
  const at = (x: number, y: number): Tile => z.ground[y * z.width + x] as Tile;
  const n = (t: Tile): number => z.ground.reduce((c, g) => (g === t ? c + 1 : c), 0);
  // The Ashmere owns the south-west; the Sump is the one sweet water.
  assert.ok(n(Tile.Water) > 600, 'the drowned workings shrank');
  assert.ok(n(Tile.WaterShallow) >= 100, 'the wading rim and the Sump');
  // The working face: two shelves, six flights, the fence is the wall.
  assert.equal(n(Tile.Ramp), 18, 'the six flights of the two shelves');
  assert.ok(n(Tile.Cliff) >= 150, 'the shelf rims are the north wall');
  // The trades that exist nowhere else at this scale.
  assert.equal(n(Tile.Vault), 5, 'the Countinghouse vault row and the assay strongroom');
  assert.equal(n(Tile.BankChest), 2, "the Charter's public floor");
  assert.equal(n(Tile.EnchantingTable), 1, "the world's second table");
  assert.equal(n(Tile.BeastPen), 1, 'the Beastyard stalls');
  assert.equal(n(Tile.Furnace), 4, 'the forge pair and the twin kilns');
  assert.equal(n(Tile.Anvil), 2);
  assert.equal(n(Tile.RockMithril), 3, 'the Delfworks mithril faces');
  assert.equal(n(Tile.RockAdamant), 2, 'the Delfworks adamant faces');
  assert.equal(n(Tile.FishingSpot), 2, 'the pale sump-fish');
  assert.equal(n(Tile.ArchStone), 1, 'the Sealed Stair mouth');
  assert.ok(n(Tile.LampPost) >= 18, 'the lit town under the unlit road');
  assert.ok(n(Tile.Dock) >= 10, 'the quay');
  // Three ways in: the east gate, the wicket, the water gate.
  assert.equal(n(Tile.GateGarrison), 9);
  assert.ok(n(Tile.WallGarrison) >= 200, 'the curtain came down');
  // The gate mouths meet the carved routes tile-exact: the Old Road
  // lands at local (126,20); the Processional leaves at local (60,0).
  for (const y of [19, 20, 21]) {
    assert.equal(at(126, y), Tile.Path, `the Old Road mouth must reach the east edge at ${y}`);
    assert.equal(at(121, y), Tile.GateGarrison, `the east gate stands at ${y}`);
  }
  for (const x of [59, 60, 61]) {
    assert.equal(at(x, 0), Tile.Dirt, `the Processional must reach the north edge at ${x}`);
    assert.equal(at(x, 2), Tile.GateGarrison, `the wicket bar stands at ${x}`);
  }
  assert.equal(at(45, 86), Tile.GateGarrison, 'the water gate opens to the quay');
  // The spawn is the round beside the Stone: the south-west's hearth.
  assert.deepEqual(z.spawn, { x: KINGSDELF_RECT.x + 62.5, y: KINGSDELF_RECT.y + 65.5 });
  // The cast: eighteen named, four on the rota, three below, two at
  // the kilns — and every keeper keeps hours (the Keywright alone
  // holds a still bench, the Alda precedent).
  const actors = z.actorSpawns ?? [];
  assert.equal(actors.length, 27, 'Kingsdelf lost residents');
  for (const slug of [
    'delfmaster_ruen', 'factor_venn', 'sealkeeper_annik', 'innkeep_brekka',
    'stablemaster_orin', 'smith_ferrun', 'glasswright_mirena', 'enchanter_veyle',
    'assayer_lorn', 'lampwright_soren', 'waykeeper_liv', 'surveyor_hedda',
    'provisioner_etta', 'outfitter_cass', 'salvewright_ida', 'fisher_denna',
    'broker_slate', 'keywright_orla',
  ]) {
    assert.ok(actors.some((a) => a.actor === slug), `${slug} missing from Kingsdelf`);
  }
  assert.equal(actors.filter((a) => a.actor === 'kingsdelf_watch').length, 4);
  assert.equal(actors.filter((a) => a.actor === 'kingsdelf_delver').length, 3);
  assert.equal(actors.filter((a) => a.actor === 'kingsdelf_glasshand').length, 2);
  assert.equal(actors.filter((a) => a.routine).length, 26, 'every keeper keeps hours');
  // The hatch pairs with the Low Hall (the sixth-door law).
  assert.equal((z.portals ?? []).length, 1, 'the shadow keeps its one way down');
  assert.ok((z.signs ?? []).length >= 18, 'the town lost its boards');
  // The elevation layer round-trips (the Silverfall law, not the flat one).
  const json = zoneToJson(z);
  assert.ok(json.elev !== undefined, 'the shelves must serialize');
  assert.deepEqual(zoneToJson(zoneFromJson(json)), json);
});

test('kingsdelf: every door, stall and stone walks from the Unfinished Stone', () => {
  const z = buildKingsdelf();
  const lvl = (i: number): number => z.elev![i] ?? 0;
  const walkable = (x: number, y: number): boolean =>
    x >= 0 && y >= 0 && x < z.width && y < z.height &&
    !TILE_DEFS[z.ground[y * z.width + x]! as Tile].solid;
  const seen = new Uint8Array(z.width * z.height);
  const start = 65 * z.width + 62; // the round beside the Stone
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
      if (lvl(ni) !== lvl(i) && z.ground[i] !== Tile.Ramp && z.ground[ni] !== Tile.Ramp) continue;
      seen[ni] = 1;
      queue.push(ni);
    }
  }
  const unreachable: string[] = [];
  for (let i = 0; i < z.ground.length; i++) {
    const t = z.ground[i];
    if (
      (t === Tile.DoorwayStone || t === Tile.DoorwayWood ||
        t === Tile.DoorwayStoneWide || t === Tile.DoorwayWoodWide) && !seen[i]
    ) {
      unreachable.push(`(${i % z.width},${Math.floor(i / z.width)})`);
    }
  }
  assert.deepEqual(unreachable, [], `doorways cut off from the Stone: ${unreachable.join(' ')}`);
  for (const [what, x, y] of [
    ['the east gate mouth', 126, 20], ['the gate street', 100, 20],
    ['the wicket track', 60, 1], ['the notch', 60, 18],
    ['the Countinghouse lobby', 90, 25], ['the vault room', 90, 29],
    ['the Sealed Stair step', 37, 27], ['the names-stone stand', 41, 26],
    ["Annik's hut", 30, 33], ['the Delfworks', 16, 34],
    ['the Delfhall floor', 42, 38], ['the Starfall Forge', 37, 52],
    ['the assay counter', 53, 51], ["the Foreman's Rest bar", 78, 49],
    ["Hedda's room", 87, 54], ['the Glasshouse kilns', 98, 64],
    ['the dispensary', 105, 38], ['the wardroom', 115, 27],
    ['the provisioner', 52, 75], ['the outfitter', 64, 75],
    ["Ferrun's cottage", 113, 49], ['the delvers’ barracks', 100, 77],
    ['the Flamehouse flame', 17, 17], ['the Focus House table', 42, 17],
    ['the Beastyard pen', 100, 12], ["Orin's cottage", 114, 12],
    ['the lookout', 83, 4], ['the west crown', 30, 6],
    ['the Sump steps', 80, 70], ['the market round', 61, 65],
    ['the quay dock', 38, 88], ["Denna's shack", 51, 90],
    ['the water gate lane', 45, 89],
  ] as const) {
    assert.equal(seen[y * z.width + x], 1, `${what} is severed`);
  }
});

test('evenfall: the fair city holds its flame, its stair, and no wall at all', () => {
  const z = buildEvenfall();
  assert.equal(z.id, 'evenfall');
  assert.equal(z.width, EVENFALL_RECT.w);
  assert.equal(z.height, EVENFALL_RECT.h);
  assert.equal(z.origin.x, EVENFALL_RECT.x);
  assert.equal(z.origin.y, EVENFALL_RECT.y);
  assert.ok(z.elev, 'the terraces carry elevation');
  const at = (x: number, y: number): Tile => z.ground[y * z.width + x] as Tile;
  const n = (t: Tile): number => z.ground.reduce((c, g) => (g === t ? c + 1 : c), 0);
  // THE WALL-LESS LAW: the wood is the wall. Not one garrison tile.
  assert.equal(n(Tile.WallGarrison), 0, 'Evenfall must never build a curtain');
  assert.equal(n(Tile.GateGarrison), 0, 'the Evengate is people, not portcullis');
  // The Moonstair's dry twin: three seven-ramp flights.
  assert.equal(n(Tile.Ramp), 21, 'the three flights of the ascent');
  assert.ok(n(Tile.Cliff) >= 400, 'the terrace faces are the composition');
  // The waters: spring, twin races, the mere, the reed sink.
  assert.ok(n(Tile.Water) >= 600, 'the races and the mere shrank');
  assert.ok(n(Tile.WaterDeep) >= 120, "the mere's dark heart");
  assert.ok(n(Tile.WaterShallow) >= 400, 'the wading rims and the meander');
  assert.equal(n(Tile.SalmonRun), 1);
  assert.equal(n(Tile.GlimmerShoal), 1, 'the deep-water shoal the band earns');
  assert.equal(n(Tile.FishingSpot), 2);
  // THE FAIR HOUSE FURNISHED, end to end: the city uses the whole
  // kit — every one of the twenty-five props stands somewhere.
  assert.equal(n(Tile.Moonwell), 1);
  assert.equal(n(Tile.Everflame), 1, 'the flame that does not burn');
  assert.equal(n(Tile.MithrilAnvil), 1);
  assert.equal(n(Tile.ArcaneBeacon), 21, 'the beacons take the street-light watch');
  assert.equal(n(Tile.ElvenStatue), 4);
  assert.equal(n(Tile.ElvenFountain), 2);
  assert.equal(n(Tile.ElvenWaystone), 6, 'the gate pair and the kept walks');
  assert.equal(n(Tile.WardArch), 1, "the grove's warded arch");
  assert.equal(n(Tile.RunePillar), 4);
  assert.equal(n(Tile.Runestone), 6);
  assert.equal(n(Tile.CrystalCluster), 3);
  assert.equal(n(Tile.ArcaneTome), 1);
  assert.equal(n(Tile.ElvenHarp), 2);
  assert.equal(n(Tile.ElvenChimes), 5);
  assert.equal(n(Tile.ElvenLoom), 2, 'the silk lane');
  assert.equal(n(Tile.ElvenBanner), 4);
  assert.ok(n(Tile.ElvenBench) >= 12, 'the city sits where the views are');
  assert.ok(n(Tile.ElvenPlanter) >= 10, 'green stitched to stone');
  // The trades: the third table, the small fine bank, the one vein.
  assert.equal(n(Tile.EnchantingTable), 1, 'the third table in the Dawnlands');
  assert.equal(n(Tile.Vault), 2, 'the Keeping keeps little, perfectly');
  assert.equal(n(Tile.BankChest), 1);
  assert.equal(n(Tile.RockMithril), 1, "the old folk's own vein");
  assert.equal(n(Tile.CarvingBench), 2, "the bowyer's benches");
  // The gate mouth meets the carved trail tile-exact: the Evenway
  // lands at local (159,56); the arch pair frames the way.
  for (const y of [55, 56, 57]) {
    assert.equal(at(159, y), Tile.Path, `the Evenway mouth must reach the east edge at ${y}`);
  }
  assert.equal(at(157, 54), Tile.ArchStone, 'the north arch');
  assert.equal(at(157, 58), Tile.ArchStone, 'the south arch');
  // The wicket mouth meets the Heartwood Walk at local (16,0).
  for (const x of [15, 16, 17]) {
    assert.equal(at(x, 0), Tile.Dirt, `the Heartwood Walk must reach the north edge at ${x}`);
  }
  // The spawn is the gate court: the west's hearth.
  assert.deepEqual(z.spawn, { x: EVENFALL_RECT.x + 146.5, y: EVENFALL_RECT.y + 56.5 });
  // The cast: fourteen named, four on the watch, three in the Fair
  // Court — and every keeper keeps hours except Othiel, who holds the
  // Keeping's still bench (the Orla precedent).
  const actors = z.actorSpawns ?? [];
  assert.equal(actors.length, 21, 'Evenfall lost residents');
  for (const slug of [
    'king_aldaren', 'warden_sylwen', 'keeper_ilvane', 'loresinger_maelis',
    'bowyer_aewyn', 'weaver_myrren', 'glasswright_selorne', 'smith_faelar',
    'inscriber_vessa', 'innkeep_elarin', 'provisioner_corwen',
    'sentinel_serel', 'stillkeeper_naia', 'keeper_othiel',
  ]) {
    assert.ok(actors.some((a) => a.actor === slug), `${slug} missing from Evenfall`);
  }
  assert.equal(actors.filter((a) => a.actor === 'evenguard_watch').length, 4);
  assert.equal(actors.filter((a) => a.actor === 'fair_artisan').length, 3);
  assert.equal(actors.filter((a) => a.routine).length, 13, 'every keeper keeps hours');
  // No portals — there is NO Low Hall door here, by canon, forever.
  assert.equal((z.portals ?? []).length, 0, 'the Company has no door in Evenfall');
  assert.ok((z.signs ?? []).length >= 8, 'the city lost its boards');
  // The elevation layer round-trips (the Silverfall law).
  const json = zoneToJson(z);
  assert.ok(json.elev !== undefined, 'the terraces must serialize');
  assert.deepEqual(zoneToJson(zoneFromJson(json)), json);
});

test('evenfall: every door, court and stone walks from the gate', () => {
  const z = buildEvenfall();
  const lvl = (i: number): number => z.elev![i] ?? 0;
  const walkable = (x: number, y: number): boolean =>
    x >= 0 && y >= 0 && x < z.width && y < z.height &&
    !TILE_DEFS[z.ground[y * z.width + x]! as Tile].solid;
  const seen = new Uint8Array(z.width * z.height);
  const start = 56 * z.width + 146; // the gate court under the arch
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
      if (lvl(ni) !== lvl(i) && z.ground[i] !== Tile.Ramp && z.ground[ni] !== Tile.Ramp) continue;
      seen[ni] = 1;
      queue.push(ni);
    }
  }
  const unreachable: string[] = [];
  for (let i = 0; i < z.ground.length; i++) {
    const t = z.ground[i];
    if (
      (t === Tile.DoorwayStone || t === Tile.DoorwayWood ||
        t === Tile.DoorwayStoneWide || t === Tile.DoorwayWoodWide) && !seen[i]
    ) {
      unreachable.push(`(${i % z.width},${Math.floor(i / z.width)})`);
    }
  }
  assert.deepEqual(unreachable, [], `doorways cut off from the gate: ${unreachable.join(' ')}`);
  for (const [what, x, y] of [
    ['the gate arch mouth', 158, 56], ['the avenue', 120, 56],
    ['the Outward House bar', 142, 42], ['the guest wing', 150, 45],
    ["Corwen's pitch", 143, 53], ['the sentinel arbor', 150, 66],
    ['the fountain court', 106, 71], ['the mere shore', 135, 78],
    ['the stair court', 82, 97], ['the south span', 86, 103],
    ['the reed meadow', 86, 107], ['the cliff-foot walk', 97, 80],
    ['the Gallery walk', 83, 54], ["the Bowyer's floor", 81, 25],
    ['the Silk Hall looms', 79, 40], ['the Mithril Forge', 90, 43],
    ['the Moonglass benches', 78, 64], ['the guest house', 66, 21],
    ['the orchard bench walk', 57, 90], ['the wicket walk', 16, 5],
    ['the wicket mouth', 16, 1], ['the Moonwell court', 56, 48],
    ['the Keeping lobby', 53, 32], ['the Songhouse floor', 65, 31],
    ["the Inscriber's table", 64, 62], ['the Stillroom', 52, 64],
    ["the Warden's Roost", 28, 61], ['the hanging gardens', 30, 72],
    ['the mithril vein walk', 13, 66], ['the west strip north', 12, 28],
    ['the hall forecourt', 31, 52], ['the feast floor', 31, 45],
    ['the Everflame step', 31, 42], ['the solar', 38, 44],
    ['the spring walk', 31, 35], ["the King's Grove", 45, 47],
    ['the ward arch step', 46, 52],
  ] as const) {
    assert.equal(seen[y * z.width + x], 1, `${what} is severed`);
  }
});

test('lowhall: the Red Company keeps six doors, a hearth, and clean books', () => {
  const z = buildLowhall();
  assert.equal(z.id, 'lowhall');
  assert.ok(z.origin.y >= 512, 'the Low Hall must sit below DARK_BAND_Y');
  // THE WORLDS APART: the declaration, not the y, seats the hall.
  assert.equal(z.plane, UNDERWORLD_PLANE_ID, 'the Low Hall declares the underworld plane');
  assert.equal(z.width, 88);
  assert.equal(z.height, 56);
  // Dying on the low roads wakes you at the ring (nearest-spawn law).
  assert.deepEqual(z.spawn, { x: 217.5, y: 583.5 });
  const counts = new Map<number, number>();
  for (const t of z.ground) counts.set(t, (counts.get(t) ?? 0) + 1);
  const n = (t: Tile): number => counts.get(t) ?? 0;
  // THE SIX DOORS: one up-portal per city, each landing inside its
  // own town's rect — and each town's hatch drops back inside the
  // hall. The web is the whole point. (Kingsdelf cut the sixth door
  // when the Returning gave the Company an unwatched road worth a
  // cellar; Dawnmead still keeps none, by Ravna's first rule.)
  const ups = (z.portals ?? []).filter((p) => p.dest);
  assert.equal(ups.length, 6, 'the ring keeps six doors');
  const towns = [buildAmberford(), buildSilverfall(), buildSaltmere(), buildPinewatch(), buildHartfell(), buildKingsdelf()];
  for (const town of towns) {
    const landed = ups.some(
      (p) =>
        p.dest!.x >= town.origin.x && p.dest!.x < town.origin.x + town.width &&
        p.dest!.y >= town.origin.y && p.dest!.y < town.origin.y + town.height,
    );
    assert.ok(landed, `no Low Hall door lands in ${town.id}`);
    const hatch = (town.portals ?? []).find(
      (p) =>
        p.dest &&
        p.dest.x >= z.origin.x && p.dest.x < z.origin.x + z.width &&
        p.dest.y >= z.origin.y && p.dest.y < z.origin.y + z.height,
    );
    assert.ok(hatch, `${town.id} keeps no hatch down to the Low Hall`);
  }
  // The hall is furnished: the counting room, the kit cage, the
  // bunks, the pool, and the braziers the Company keeps fed.
  assert.equal(n(Tile.Vault), 1, "the Company's deep box");
  assert.equal(n(Tile.BankChest), 2, 'the counting room banks');
  assert.ok(n(Tile.ChestMossy) >= 1, 'the box nobody asks about');
  assert.equal(n(Tile.Bed), 6, 'three hot bunks');
  assert.ok(n(Tile.Brazier) >= 10, 'the Company burns braziers, not lamps');
  assert.equal(n(Tile.LampPost), 0, 'no town lamps below the towns');
  assert.ok(n(Tile.FishingSpot) >= 2, 'the still pool fishes');
  assert.ok(n(Tile.GlowShroom) >= 3 && n(Tile.Hearth) >= 3);
  assert.ok((z.signs ?? []).length >= 6, 'the doors are named inside the hall');
  // The household: three named keepers, five blades, two runners.
  const crew = z.actorSpawns ?? [];
  assert.equal(crew.length, 10, 'the Low Hall lost its household');
  for (const slug of ['captain_ravna', 'tallyman_brusk', 'quartermaster_yeva']) {
    assert.ok(crew.some((a) => a.actor === slug), `${slug} missing from the Low Hall`);
  }
  assert.equal(crew.filter((a) => a.actor === 'company_blade').length, 5);
  assert.equal(crew.filter((a) => a.actor === 'company_runner').length, 2);
  assert.equal(crew.filter((a) => a.routine).length, 10, 'every keeper keeps hours');
  // Every chamber walks from the ring.
  const walkable = (x: number, y: number): boolean =>
    x >= 0 && y >= 0 && x < z.width && y < z.height &&
    !TILE_DEFS[z.ground[y * z.width + x]! as Tile].solid;
  const seen = new Uint8Array(z.width * z.height);
  const queue: number[] = [31 * z.width + 17];
  seen[queue[0]!] = 1;
  while (queue.length > 0) {
    const i: number = queue.pop()!;
    const cx: number = i % z.width;
    const cy: number = Math.floor(i / z.width);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      if (!walkable(cx + dx, cy + dy)) continue;
      const ni = (cy + dy) * z.width + cx + dx;
      if (!seen[ni]) {
        seen[ni] = 1;
        queue.push(ni);
      }
    }
  }
  for (const [x, y, name] of [
    [17, 15, 'the Amberford door'],
    [25, 16, 'the Hartfell door'],
    [7, 20, 'the Silverfall door'],
    [7, 36, 'the Saltmere door'],
    [17, 41, 'the Pinewatch door'],
    [45, 13, 'the fence counter approach'],
    [68, 24, 'the kit cage floor'],
    [44, 45, 'the bunk room'],
    [52, 32, 'the feast hall floor'],
    [25, 43, 'the still pool bank'],
  ] as const) {
    assert.equal(seen[y * z.width + x], 1, `${name} is severed from the ring`);
  }
  // The editor round trip holds (flat zones compare without elev).
  const json = zoneToJson(z);
  assert.equal(json.portals?.length, 6, 'the six doors must serialize');
  const { elev: _rt, ...back } = zoneToJson(zoneFromJson(json));
  const { elev: _src, ...src } = json;
  assert.deepEqual(back, src);
});

test('the dyed banner pole folds home, dye-blind', () => {
  for (let dye = 0; dye < DYE_COUNT; dye++) {
    assert.equal(buildableForTile(bannerPoleTile(dye))?.id, 'banner_pole', `dye ${dye}`);
  }
  assert.equal(buildableForTile(Tile.BannerPole)?.id, 'banner_pole', 'the classic pole too');
});
