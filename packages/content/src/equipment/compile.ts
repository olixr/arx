import { RARITY_TIERS, SKILL_IDS, isRarityTier } from '@devcraft/shared';
import type { GearInfo, ItemDef } from '../items.js';
import type { RecipeDef } from '../recipes.js';
import type { AffixStat, EquipmentDef } from './types.js';
import { ARMOR_CLASS_SLOTS, GEAR_SLOTS } from './types.js';

/**
 * Compile EquipmentDefs into ordinary ItemDefs (+ generated RecipeDefs).
 * Runs at module load and THROWS on any malformed def, so a bad JSON
 * import or hand-edit fails the content tests loudly instead of
 * shipping a broken item. The structures/serialize compile-on-load law.
 */

function isAffixStat(v: unknown): v is AffixStat {
  return (
    v === 'maxHp' || v === 'regen' || (typeof v === 'string' && (SKILL_IDS as readonly string[]).includes(v))
  );
}

export function compileEquipment(defs: readonly EquipmentDef[]): {
  items: ItemDef[];
  recipes: RecipeDef[];
} {
  const items: ItemDef[] = [];
  const recipes: RecipeDef[] = [];
  const seen = new Set<string>();

  for (const def of defs) {
    const fail = (msg: string): never => {
      throw new Error(`equipment def '${def.id}': ${msg}`);
    };

    if (!def.id || seen.has(def.id)) fail('missing or duplicate id');
    seen.add(def.id);
    if (!GEAR_SLOTS.includes(def.slot)) fail(`bad slot '${def.slot}'`);
    if (ARMOR_CLASS_SLOTS.includes(def.slot) && !def.armorClass) {
      fail('armor slots require an armorClass');
    }
    if (def.slot === 'weapon' && !def.weapon) fail('weapon slot requires weapon stats');
    if (def.slot !== 'weapon' && def.weapon) fail('weapon stats on a non-weapon slot');
    if (def.backMounted && def.slot !== 'offhand') fail('backMounted is an offhand fact');
    if (!Array.isArray(def.affixPool)) fail('missing affixPool');
    for (const p of def.affixPool) {
      if (!isAffixStat(p.stat)) fail(`bad affix stat '${String(p.stat)}'`);
      if (p.w !== undefined && !(p.w > 0)) fail(`bad affix weight on '${p.stat}'`);
    }
    if (def.levelReq && !(SKILL_IDS as readonly string[]).includes(def.levelReq.skill)) {
      fail(`bad levelReq skill '${def.levelReq.skill}'`);
    }
    const rarities = def.rarities ?? [...RARITY_TIERS];
    if (rarities.length === 0 || rarities.some((r) => !isRarityTier(r))) fail('bad rarities list');
    const acq = def.acquisition;
    if (!acq || (!acq.drop && !acq.craft && !acq.shop)) {
      fail('needs at least one acquisition route');
    }
    if (!!acq.craft !== !!def.recipe) fail('recipe must be present iff acquisition.craft');

    const gear: GearInfo = {
      slot: def.slot,
      armorClass: def.armorClass,
      levelReq: def.levelReq,
      affixPool: def.affixPool.map((p) => ({ stat: p.stat, w: p.w ?? 1 })),
      rarities,
      acquisition: { drop: !!acq.drop, craft: !!acq.craft, shop: !!acq.shop },
      effects: def.effects,
    };

    items.push({
      id: def.id,
      name: def.name,
      // Rolled instances can never stack — each carries its own identity.
      stackable: false,
      value: def.value,
      equipSlot: def.slot,
      armor: def.armor,
      weapon: def.weapon,
      passive: def.passive,
      color: def.color,
      code: def.code,
      desc: def.desc,
      backMounted: def.backMounted,
      gear,
    });

    if (def.recipe) {
      recipes.push({
        id: `craft_${def.id}`,
        name: def.name,
        skill: def.recipe.skill,
        levelReq: def.recipe.levelReq,
        xp: def.recipe.xp,
        station: def.recipe.station,
        inputs: def.recipe.inputs,
        output: { item: def.id, qty: 1 },
        ticks: def.recipe.ticks,
        // The level band is the default ladder of knowledge: the
        // starter kit is everyone's, the working tiers are guild-
        // taught, the high shelf is found in the world.
        unlock:
          def.recipe.unlock ??
          (def.recipe.levelReq <= 10 ? 'core' : def.recipe.levelReq < 40 ? 'trainer' : 'drop'),
      });
    }
  }

  return { items, recipes };
}
