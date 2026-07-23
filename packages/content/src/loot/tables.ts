import { RARITY_TIERS } from '@devcraft/shared';
import { HEIRLOOM_CHANCE } from '../equipment/tables.js';
import { ITEMS } from '../items.js';
import type { LootEntryDef, LootTableDef } from './types.js';

/**
 * The loot-table roster. Kill tables keep the world's existing drop
 * economy: every item the old inline NpcDef lists paid out is reachable
 * from the same foe's tables (content.test pins this). Set bundles are
 * GENERATED from the item registry — a new piece added to a set joins
 * its drop bundle without touching this file.
 */

/** Armor-set piece weights, by equip slot: bodies are the chase piece. */
const PIECE_W: Record<string, number> = {
  head: 1,
  body: 0.75,
  legs: 0.85,
  boots: 1,
  gloves: 1,
};

/**
 * Drop lines for one armor set (optionally one dye lot): scans ITEMS
 * for `<family>_<piece>` (or `<family>_<piece>_<colorway>`) gear ids.
 * `base` is the headline per-piece chance; slot weights shade it.
 */
export function setDrops(
  family: string,
  base: number,
  opts: { colorway?: string; skip?: readonly string[] } = {},
): LootEntryDef[] {
  const entries: LootEntryDef[] = [];
  const prefix = `${family}_`;
  for (const [id, def] of ITEMS) {
    if (!id.startsWith(prefix) || !def.gear) continue;
    const rest = id.slice(prefix.length);
    const parts = rest.split('_');
    const piece = parts[0]!;
    if (opts.colorway ? parts.length !== 2 || parts[1] !== opts.colorway : parts.length !== 1) {
      continue;
    }
    if (opts.skip?.includes(piece)) continue;
    const w = PIECE_W[def.gear.slot];
    if (w === undefined) continue;
    entries.push({ item: id, chance: Math.round(base * w * 1e4) / 1e4 });
  }
  if (entries.length === 0) {
    throw new Error(`loot: setDrops('${family}') matched no items`);
  }
  // Registry order is stable, but sort so authored JSON exports diff cleanly.
  entries.sort((a, b) => a.item!.localeCompare(b.item!));
  return entries;
}

const defs: LootTableDef[] = [
  // ------------------------------------------------- shared mechanisms
  {
    id: 'heirlooms',
    desc: 'The heirloom law: any old set or weapon, re-issued at the foe’s power. Assign to foes strong enough to carry the past.',
    entries: [{ pool: 'heirloom', chance: HEIRLOOM_CHANCE }],
  },

  // ----------------------------------------------------------- farmyard
  {
    id: 'chicken',
    desc: 'Everything a chicken is made of.',
    entries: [
      { item: 'raw_chicken' },
      { item: 'feather', qty: [3, 8] },
      { item: 'bones' },
    ],
  },
  {
    id: 'cow',
    desc: 'Everything a cow is made of.',
    entries: [{ item: 'raw_beef' }, { item: 'cowhide' }, { item: 'bones' }],
  },

  // ---------------------------------------------------------- rat nest
  {
    id: 'rat',
    desc: 'Nest basics.',
    entries: [
      { item: 'bones' },
      { item: 'venom_gland', chance: 0.3 },
      { item: 'scrap_hide', qty: [1, 2], chance: 0.5 },
      { item: 'crimson_essence', chance: 0.08 },
    ],
  },
  {
    id: 'rat_wardrobe',
    desc: 'Cloth and leathers dragged into the nest.',
    entries: [
      ...setDrops('mothwing', 0.028),
      ...setDrops('fenwalker', 0.014, { colorway: 'rustsedge' }),
      ...setDrops('cutpurse', 0.014, { colorway: 'alleyrat' }),
    ],
  },
  {
    id: 'rat_arms',
    desc: 'The gutter arms rack: what beat the rats, kept.',
    entries: [
      { item: 'rustbite', chance: 0.02 },
      { item: 'shiv', chance: 0.03 },
      { item: 'ratter', chance: 0.02 },
      { item: 'stickbow', chance: 0.03 },
      { item: 'poachers_friend', chance: 0.015 },
      { item: 'hazel_switch', chance: 0.025 },
    ],
  },

  // ------------------------------------------------------- goblin camp
  {
    id: 'goblin',
    desc: 'Camp basics: pocket change, scavenged kit.',
    entries: [
      { item: 'bones' },
      { item: 'coins', qty: [3, 18], chance: 0.8 },
      { item: 'brass_key', chance: 0.025 },
      { item: 'bronze_sword', chance: 0.08 },
      { item: 'arrow', qty: [4, 12], chance: 0.25 },
      { item: 'snare_kit', chance: 0.04 },
      { item: 'leather_body', chance: 0.05 },
      { item: 'leather_chaps', chance: 0.04 },
      { item: 'scrap_hide', qty: [1, 2], chance: 0.35 },
      { item: 'linen_scrap', qty: [1, 3], chance: 0.4 },
      { item: 'emberstone', chance: 0.012 },
      { item: 'bloomstone', chance: 0.012 },
      { item: 'ember_essence', qty: [1, 2], chance: 0.15 },
      { item: 'arcane_dust', chance: 0.1 },
    ],
  },
  {
    id: 'goblin_wardrobe',
    desc: 'Singed, stolen, and hacked-apart wardrobes of the camp.',
    entries: [
      ...setDrops('mothwing', 0.018, { colorway: 'ember' }),
      ...setDrops('fenwalker', 0.016),
      ...setDrops('cutpurse', 0.016),
      ...setDrops('briarplate', 0.01, { colorway: 'bloodbriar' }),
    ],
  },
  {
    id: 'goblin_arms',
    desc: 'Camp ironwork and stolen hedge-magic.',
    entries: [
      { item: 'rustbite', chance: 0.03 },
      { item: 'gobsplitter', chance: 0.025 },
      { item: 'shiv', chance: 0.025 },
      { item: 'stickbow', chance: 0.03 },
      { item: 'knucklebow', chance: 0.025 },
      { item: 'bramblethorn', chance: 0.015 },
      { item: 'hazel_switch', chance: 0.03 },
      { item: 'wisplight', chance: 0.012 },
    ],
  },
  {
    id: 'goblin_thrower',
    desc: 'Thrower basics: ammo and the warband’s colors.',
    entries: [
      { item: 'bones' },
      { item: 'coins', qty: [4, 20], chance: 0.8 },
      { item: 'arrow', qty: [6, 14], chance: 0.5 },
      { item: 'straw_decoy', chance: 0.05 },
      { item: 'cape_banner', chance: 0.06 },
      { item: 'apprentice_robe', chance: 0.04 },
      { item: 'linen_scrap', qty: [1, 3], chance: 0.45 },
      { item: 'stormpearl', chance: 0.01 },
      { item: 'fang_band', chance: 0.03 },
      { item: 'storm_essence', qty: [1, 2], chance: 0.16 },
      { item: 'arcane_dust', chance: 0.1 },
    ],
  },
  {
    id: 'thrower_wardrobe',
    desc: 'Coast plunder and trampled-fen cloth.',
    entries: [
      ...setDrops('tidecaller', 0.02),
      ...setDrops('fenwalker', 0.014, { colorway: 'mirebloom' }),
      ...setDrops('cutpurse', 0.012, { colorway: 'redhand' }),
      ...setDrops('briarplate', 0.009, { colorway: 'nightbriar' }),
    ],
  },
  {
    id: 'thrower_arms',
    desc: 'Raider blades off the coast and the fens.',
    entries: [
      { item: 'gobsplitter', chance: 0.02 },
      { item: 'fenreaper', chance: 0.015 },
      { item: 'bogsting', chance: 0.018 },
      { item: 'scaler', chance: 0.015 },
      { item: 'redhand', chance: 0.012 },
      { item: 'knucklebow', chance: 0.03 },
      { item: 'driftwood', chance: 0.02 },
      { item: 'fishspine', chance: 0.015 },
      { item: 'bramblethorn', chance: 0.012 },
      { item: 'wisplight', chance: 0.02 },
      { item: 'shepherds_crook', chance: 0.02 },
      { item: 'serpentcoil', chance: 0.008 },
    ],
  },

  // -------------------------------------------------------------- crypt
  {
    id: 'skeleton',
    desc: 'Grave-goods: old iron and the shield-stone.',
    entries: [
      { item: 'bones', qty: [1, 2] },
      { item: 'coins', qty: [5, 25], chance: 0.7 },
      { item: 'brass_key', chance: 0.05 },
      { item: 'iron_ore', chance: 0.15 },
      { item: 'gloomsilk_thread', chance: 0.35 },
      { item: 'ember_charm', chance: 0.03 },
      { item: 'aegis_stone', chance: 0.025 },
      { item: 'seeker_stone', chance: 0.015 },
      { item: 'cape_emberweave', chance: 0.04 },
      { item: 'cape_midnight', chance: 0.035 },
      { item: 'iron_helm', chance: 0.05 },
      { item: 'iron_greaves', chance: 0.04 },
      { item: 'iron_sabatons', chance: 0.04 },
      { item: 'iron_gauntlets', chance: 0.04 },
      { item: 'frostshard', chance: 0.012 },
      { item: 'arcane_dust', qty: [1, 2], chance: 0.35 },
      { item: 'frost_essence', chance: 0.14 },
    ],
  },
  {
    id: 'skeleton_guard',
    desc: 'The key-keeper of the crypt: the watch carried the brass, the iron, and the shield-stone.',
    entries: [
      { item: 'bones', qty: [1, 2] },
      { item: 'coins', qty: [8, 32], chance: 0.7 },
      // The guards hold the keys — the strongchest story sends you
      // through them.
      { item: 'brass_key', chance: 0.12 },
      { item: 'iron_ore', chance: 0.2 },
      { item: 'iron_helm', chance: 0.06 },
      { item: 'oak_kiteshield', chance: 0.035 },
      { item: 'aegis_stone', chance: 0.04 },
      { item: 'gloomsilk_thread', chance: 0.3 },
      { item: 'arcane_dust', qty: [1, 2], chance: 0.35 },
      { item: 'frost_essence', chance: 0.14 },
    ],
  },
  {
    id: 'crypt_wardrobe',
    desc: 'What the crypt’s prowlers and its watch wore in. The Nightveil jerkin and Voidwhisper robe stay with the Champion.',
    entries: [
      ...setDrops('nightveil', 0.025, { skip: ['jerkin'] }),
      ...setDrops('voidwhisper', 0.02, { skip: ['robe'] }),
      ...setDrops('mothwing', 0.016, { colorway: 'dusk' }),
      ...setDrops('fenwalker', 0.012, { colorway: 'graymist' }),
      ...setDrops('dawnsworn', 0.012, { colorway: 'eclipse' }),
      ...setDrops('briarplate', 0.009, { colorway: 'bonebriar' }),
      ...setDrops('cutpurse', 0.012, { colorway: 'moonless' }),
      ...setDrops('emberfox', 0.01, { colorway: 'silverfox' }),
      ...setDrops('sentinel', 0.01),
      ...setDrops('sentinel', 0.008, { colorway: 'bloodwatch' }),
    ],
  },
  {
    id: 'crypt_arms',
    desc: 'Blades, bows, and staves the dead still carry.',
    entries: [
      { item: 'fenreaper', chance: 0.01 },
      { item: 'gravewhisper', chance: 0.012 },
      { item: 'bloodletter', chance: 0.008 },
      { item: 'bonepick', chance: 0.015 },
      { item: 'redhand', chance: 0.01 },
      { item: 'nightthorn', chance: 0.01 },
      { item: 'leech', chance: 0.008 },
      { item: 'marrowpoint', chance: 0.015 },
      { item: 'whisperwind', chance: 0.012 },
      { item: 'emberglow', chance: 0.006 },
      { item: 'gravewood', chance: 0.03 },
      { item: 'gloomthorn', chance: 0.012 },
      { item: 'boneharrow', chance: 0.004 },
    ],
  },

  // ----------------------------------------------------- the Champion
  {
    id: 'skeleton_champion',
    desc: 'The boss purse: guaranteed coin, trinkets, and the sigil.',
    entries: [
      { item: 'bones', qty: [2, 4] },
      { item: 'coins', qty: [40, 120] },
      { item: 'iron_sword', chance: 0.4 },
      { item: 'iron_bar', qty: [1, 2], chance: 0.5 },
      { item: 'gloomsilk_thread', qty: [2, 4], chance: 0.7 },
      { item: 'storm_bell', chance: 0.12 },
      { item: 'storm_coil', chance: 0.1 },
      { item: 'seeker_stone', chance: 0.08 },
      { item: 'fang_band', chance: 0.06 },
      { item: 'ember_staff', chance: 0.1 },
      { item: 'willow_longbow', chance: 0.1 },
      { item: 'sigil_fallen_champion', chance: 0.25 },
      { item: 'tome_of_embers', chance: 0.15 },
      { item: 'arcane_dust', qty: [3, 6], chance: 0.8 },
      { item: 'storm_essence', qty: [1, 3], chance: 0.5 },
      { item: 'frost_essence', qty: [1, 3], chance: 0.5 },
    ],
  },
  {
    id: 'champion_capes',
    desc: 'The prestige rack: he wears one mantle at a time, and so will you.',
    mode: 'pick',
    nothingW: 53,
    entries: [
      { item: 'cape_champion', w: 20 },
      { item: 'cape_storm', w: 10 },
      { item: 'cape_royal', w: 8 },
      { item: 'cape_celestial', w: 5 },
      { item: 'cape_phoenix', w: 4 },
    ],
  },
  {
    id: 'champion_wardrobe',
    desc: 'The villain’s own wardrobe, and the reserved set pieces.',
    entries: [
      { item: 'horned_raider_helm', chance: 0.12 },
      { item: 'steel_greathelm', chance: 0.06 },
      { item: 'iron_platebody', chance: 0.15 },
      { item: 'emberweave_robe', chance: 0.08 },
      { item: 'frostplate_platebody', chance: 0.06 },
      { item: 'frostplate_greaves', chance: 0.05 },
      { item: 'nightveil_jerkin', chance: 0.05 },
      { item: 'voidwhisper_robe', chance: 0.045 },
      ...setDrops('dreadforge', 0.04),
      ...setDrops('emberfox', 0.04, { colorway: 'shadowfox' }),
      ...setDrops('sentinel', 0.035, { colorway: 'daybreak' }),
      ...setDrops('sentinel', 0.03, { colorway: 'midnight' }),
    ],
  },
  {
    id: 'champion_armory',
    desc: 'The trophy racks of everyone who tried. The white whales only exist legendary.',
    entries: [
      { item: 'duelists_grace', chance: 0.06 },
      { item: 'bloodletter', chance: 0.04 },
      { item: 'stormcall', chance: 0.05 },
      { item: 'sovereign', chance: 0.025 },
      { item: 'starfall', chance: 0.01 },
      { item: 'oathkeeper', chance: 0.005 },
      { item: 'hush', chance: 0.05 },
      { item: 'sparkfang', chance: 0.04 },
      { item: 'nightthorn', chance: 0.03 },
      { item: 'kingsbane', chance: 0.02 },
      { item: 'last_word', chance: 0.005 },
      { item: 'emberglow', chance: 0.04 },
      { item: 'whisperwind', chance: 0.04 },
      { item: 'marrowpoint', chance: 0.05 },
      { item: 'kingswood', chance: 0.025 },
      { item: 'starcall', chance: 0.012 },
      { item: 'skyrender', chance: 0.005 },
      { item: 'glacierbite', chance: 0.05 },
      { item: 'pyreheart', chance: 0.04 },
      { item: 'runegnarl', chance: 0.04 },
      { item: 'sunwrought', chance: 0.04 },
      { item: 'boneharrow', chance: 0.03 },
      { item: 'bloodmoon', chance: 0.025 },
      { item: 'nightwell', chance: 0.02 },
      { item: 'tempest_crown', chance: 0.02 },
      { item: 'worldsplinter', chance: 0.005 },
    ],
  },

  // ---------------------------------------------------- treasure chests
  // Interaction loot: rollLoot('chest_*', { level }) from the chest
  // interact, spilled at the chest's foot as owned ground drops.
  {
    id: 'chest_wood',
    desc: 'The traveller’s chest: pocket coin, supplies, and sometimes the key to something better.',
    entries: [
      { item: 'coins', qty: [10, 40] },
      { item: 'arrow', qty: [6, 18], chance: 0.4 },
      { item: 'linen_scrap', qty: [1, 3], chance: 0.35 },
      { item: 'scrap_hide', qty: [1, 2], chance: 0.3 },
      { item: 'arcane_dust', qty: [1, 2], chance: 0.2 },
      { item: 'brass_key', chance: 0.1 },
      { table: 'goblin_arms', mult: 1.5 },
    ],
  },
  {
    id: 'chest_iron',
    desc: 'Behind the brass lock: the strongchest pays in iron, silk, and arms worth binding shut.',
    rarityBonus: 4,
    entries: [
      { item: 'coins', qty: [40, 110] },
      { item: 'iron_bar', qty: [1, 2], chance: 0.5 },
      { item: 'gloomsilk_thread', qty: [1, 3], chance: 0.45 },
      { item: 'arcane_dust', qty: [2, 4], chance: 0.5 },
      { item: 'ember_charm', chance: 0.05 },
      { item: 'aegis_stone', chance: 0.05 },
      { table: 'crypt_arms', mult: 3 },
      { table: 'crypt_wardrobe', mult: 2 },
    ],
  },
  {
    id: 'chest_gilded',
    desc: 'Treasure-house work: heavy coin, and one prize always picked off the vault shelf.',
    rarityBonus: 8,
    minRarity: 'uncommon',
    entries: [
      { item: 'coins', qty: [90, 220] },
      { table: 'chest_gilded_prize' },
      { item: 'arcane_dust', qty: [3, 6], chance: 0.7 },
      { item: 'storm_essence', qty: [1, 3], chance: 0.4 },
      { item: 'frost_essence', qty: [1, 3], chance: 0.4 },
      { table: 'heirlooms', mult: 2 },
    ],
  },
  {
    id: 'chest_gilded_prize',
    desc: 'The vault shelf: a gilded coffer never opens on nothing.',
    mode: 'pick',
    entries: [
      { item: 'emberstone', w: 12 },
      { item: 'bloomstone', w: 12 },
      { item: 'stormpearl', w: 10 },
      { item: 'frostshard', w: 10 },
      { item: 'storm_bell', w: 8 },
      { item: 'storm_coil', w: 8 },
      { item: 'seeker_stone', w: 8 },
      { item: 'tome_of_embers', w: 7 },
      { item: 'sovereign', w: 3 },
      { item: 'kingsbane', w: 2 },
      { item: 'starfall', w: 1 },
      { item: 'skyrender', w: 1 },
    ],
  },
  {
    id: 'chest_mossy',
    desc: 'The forest kept it fed: herbs, hides, old coin — and the odd blade the moss couldn’t digest.',
    rarityBonus: 2,
    entries: [
      { item: 'coins', qty: [20, 65] },
      { item: 'scrap_hide', qty: [1, 3], chance: 0.4 },
      { item: 'gloomsilk_thread', qty: [1, 2], chance: 0.3 },
      { item: 'arcane_dust', qty: [1, 3], chance: 0.35 },
      { item: 'crimson_essence', qty: [1, 2], chance: 0.3 },
      { item: 'brass_key', chance: 0.08 },
      { table: 'crypt_arms', mult: 1.5 },
      { table: 'wolf_arms', mult: 1.5 },
    ],
  },
  {
    id: 'chest_boss',
    desc: 'The black chest behind the boss: the champion’s own cache, worth the fight in front of it.',
    rarityBonus: 10,
    entries: [
      { item: 'coins', qty: [120, 300] },
      { table: 'champion_armory', mult: 3 },
      { table: 'champion_capes' },
      { table: 'heirlooms', mult: 3 },
      { item: 'sigil_fallen_champion', chance: 0.15 },
      { item: 'arcane_dust', qty: [4, 8], chance: 0.8 },
      { item: 'crimson_essence', qty: [2, 4], chance: 0.5 },
    ],
  },

  // ------------------------------------------------------- wolf packs
  {
    id: 'wolf',
    desc: 'Pack basics: fur, and what snagged in it.',
    entries: [
      { item: 'bones' },
      { item: 'wolf_fur', chance: 0.9 },
      { item: 'venom_gland', chance: 0.25 },
      { item: 'verdant_totem', chance: 0.05 },
      { item: 'bramble_band', chance: 0.04 },
      { item: 'bloomstone', chance: 0.015 },
      { item: 'crimson_essence', qty: [1, 2], chance: 0.14 },
      { item: 'verdant_essence', chance: 0.12 },
    ],
  },
  {
    id: 'wolf_wardrobe',
    desc: 'Hunt the pack, wear the pack. Frostplate walks with the winter packs — the body and greaves stay with the Champion.',
    entries: [
      { item: 'wolfhide_hood', chance: 0.06 },
      { item: 'wanderer_boots', chance: 0.05 },
      { item: 'frostplate_helm', chance: 0.03 },
      { item: 'frostplate_sabatons', chance: 0.03 },
      { item: 'frostplate_gauntlets', chance: 0.03 },
      ...setDrops('wolfstalker', 0.03),
      ...setDrops('mothwing', 0.016, { colorway: 'luna' }),
      ...setDrops('emberfox', 0.014),
      ...setDrops('emberfox', 0.009, { colorway: 'dawnfox' }),
      ...setDrops('briarplate', 0.012),
    ],
  },
  {
    id: 'wolf_arms',
    desc: 'The pack’s blades, bows, and argued-over staves.',
    entries: [
      { item: 'wolffang', chance: 0.03 },
      { item: 'frostbrand', chance: 0.01 },
      { item: 'fangtooth', chance: 0.03 },
      { item: 'palefire', chance: 0.008 },
      { item: 'poachers_friend', chance: 0.02 },
      { item: 'wolfsong', chance: 0.02 },
      { item: 'rimewood', chance: 0.008 },
      { item: 'shepherds_crook', chance: 0.03 },
      { item: 'glacierbite', chance: 0.006 },
    ],
  },

  // ------------------------------------------------------- the wilds
  {
    id: 'mudcrab',
    desc: 'Shell pickings, and whatever it caught last.',
    entries: [
      { item: 'bones' },
      { item: 'raw_trout', chance: 0.25 },
      { item: 'coins', qty: [1, 6], chance: 0.3 },
    ],
  },
  {
    id: 'slime',
    desc: 'What the ooze dissolved, and what it could not.',
    entries: [
      { item: 'coins', qty: [2, 10], chance: 0.5 },
      { item: 'verdant_essence', chance: 0.15 },
      { item: 'arcane_dust', chance: 0.12 },
    ],
  },
  {
    id: 'slime_small',
    desc: 'Half an ooze holds half a hoard.',
    entries: [
      { item: 'coins', qty: [1, 4], chance: 0.4 },
      { item: 'verdant_essence', chance: 0.05 },
    ],
  },
  {
    id: 'ram',
    desc: 'Horn, hide, and stubbornness.',
    entries: [
      { item: 'bones' },
      { item: 'scrap_hide', qty: [1, 2], chance: 0.7 },
    ],
  },
  {
    id: 'stag',
    desc: 'The wood’s bounty on four legs.',
    entries: [
      { item: 'bones' },
      { item: 'raw_beef', chance: 0.5 },
      { item: 'scrap_hide', qty: [1, 3], chance: 0.8 },
      { item: 'verdant_essence', chance: 0.08 },
    ],
  },
  {
    id: 'boar',
    desc: 'Bristle, tusk, and a hearty cut.',
    entries: [
      { item: 'bones' },
      { item: 'raw_beef', chance: 0.5 },
      { item: 'scrap_hide', qty: [1, 3], chance: 0.8 },
      { item: 'crimson_essence', chance: 0.06 },
    ],
  },
  {
    id: 'giant_beetle',
    desc: 'Ground chitin is half dust already.',
    entries: [
      { item: 'bones' },
      { item: 'arcane_dust', chance: 0.15 },
      { item: 'verdant_essence', chance: 0.08 },
    ],
  },
  {
    id: 'cave_bat',
    desc: 'Small bones and cave-things.',
    entries: [
      { item: 'bones' },
      { item: 'crimson_essence', chance: 0.06 },
      { item: 'gloomsilk_thread', chance: 0.12 },
    ],
  },
  {
    id: 'adder',
    desc: 'Venom by the gland, skin by the yard.',
    entries: [
      { item: 'bones' },
      { item: 'venom_gland', chance: 0.6 },
      { item: 'scrap_hide', qty: [1, 2], chance: 0.4 },
    ],
  },
  {
    id: 'giant_spider',
    desc: 'Silk and venom — the crypt tailors pay for both.',
    entries: [
      { item: 'venom_gland', chance: 0.5 },
      { item: 'gloomsilk_thread', qty: [1, 2], chance: 0.4 },
      { item: 'crimson_essence', chance: 0.08 },
    ],
  },
  {
    id: 'skeleton_archer',
    desc: 'A quiver that outlived its owner.',
    entries: [
      { item: 'bones' },
      { item: 'arrow', qty: [6, 18], chance: 0.8 },
      { item: 'coins', qty: [4, 20], chance: 0.6 },
      { item: 'arcane_dust', chance: 0.12 },
      { item: 'frost_essence', chance: 0.12 },
    ],
  },
  {
    id: 'troll',
    desc: 'A pocket-hoard scraped off the hills.',
    entries: [
      { item: 'bones' },
      { item: 'coins', qty: [10, 40], chance: 0.9 },
      { item: 'arcane_dust', qty: [1, 2], chance: 0.2 },
      { item: 'ember_essence', chance: 0.12 },
      { item: 'leather', chance: 0.15 },
    ],
  },
  {
    id: 'bear',
    desc: 'A deep-wood giant leaves a deep-wood haul.',
    entries: [
      { item: 'bones' },
      { item: 'raw_beef', qty: [1, 2], chance: 0.7 },
      { item: 'scrap_hide', qty: [2, 4], chance: 0.9 },
      { item: 'crimson_essence', qty: [1, 2], chance: 0.15 },
    ],
  },
];

/**
 * Structural validation — run at module load and by the JSON path, so a
 * broken table (typoed item, dangling reference, cycle) fails the build
 * or the import, never a kill.
 */
export function validateLootTables(tables: readonly LootTableDef[]): void {
  const ids = new Set<string>();
  for (const t of tables) {
    if (ids.has(t.id)) throw new Error(`loot table '${t.id}' declared twice`);
    ids.add(t.id);
  }
  const byId = new Map(tables.map((t) => [t.id, t]));
  for (const t of tables) {
    const mode = t.mode ?? 'each';
    if (t.entries.length === 0) throw new Error(`loot table '${t.id}' has no entries`);
    if (mode === 'each' && (t.picks || t.nothingW !== undefined)) {
      throw new Error(`loot table '${t.id}': picks/nothingW are pick-mode fields`);
    }
    if (t.picks && (t.picks[0] < 1 || t.picks[1] < t.picks[0])) {
      throw new Error(`loot table '${t.id}': malformed picks range`);
    }
    for (const e of t.entries) {
      const kinds = [e.item, e.table, e.pool].filter((k) => k !== undefined).length;
      if (kinds !== 1) {
        throw new Error(`loot table '${t.id}': entry needs exactly one of item/table/pool`);
      }
      if (e.item && !ITEMS.has(e.item)) {
        throw new Error(`loot table '${t.id}': unknown item '${e.item}'`);
      }
      if (e.table && !byId.has(e.table)) {
        throw new Error(`loot table '${t.id}': unknown table ref '${e.table}'`);
      }
      if (e.pool && e.pool !== 'heirloom') {
        throw new Error(`loot table '${t.id}': unknown pool '${String(e.pool)}'`);
      }
      if (e.mult !== undefined && (!e.table || e.mult <= 0)) {
        throw new Error(`loot table '${t.id}': mult belongs on table refs, > 0`);
      }
      if (e.chance !== undefined && (mode === 'pick' || e.chance <= 0 || e.chance > 1)) {
        throw new Error(`loot table '${t.id}': chance must be each-mode, in (0, 1]`);
      }
      if (e.w !== undefined && (mode === 'each' || e.w <= 0)) {
        throw new Error(`loot table '${t.id}': w is a pick-mode weight, > 0`);
      }
      if (e.qty && (!Number.isInteger(e.qty[0]) || e.qty[0] < 1 || e.qty[1] < e.qty[0])) {
        throw new Error(`loot table '${t.id}': malformed qty range`);
      }
    }
    if (t.minRarity && !RARITY_TIERS.includes(t.minRarity)) {
      throw new Error(`loot table '${t.id}': unknown rarity '${String(t.minRarity)}'`);
    }
  }
  // Reference cycles would make the resolver loop; reject them here.
  const state = new Map<string, 'visiting' | 'done'>();
  const visit = (id: string, path: string[]): void => {
    const s = state.get(id);
    if (s === 'done') return;
    if (s === 'visiting') {
      throw new Error(`loot table cycle: ${[...path, id].join(' -> ')}`);
    }
    state.set(id, 'visiting');
    for (const e of byId.get(id)!.entries) {
      if (e.table) visit(e.table, [...path, id]);
    }
    state.set(id, 'done');
  };
  for (const t of tables) visit(t.id, []);
}

validateLootTables(defs);

export const LOOT_TABLES: ReadonlyMap<string, LootTableDef> = new Map(defs.map((t) => [t.id, t]));
