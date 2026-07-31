import { RARITY_TIERS } from '@arx/shared';
import { HEIRLOOM_CHANCE } from '../equipment/tables.js';
import { ITEMS } from '../items.js';
import { UNLOCKABLE_RECIPES, recipeScrollId } from '../recipes.js';
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

/**
 * A pick-mode gear rack: ONE weighted draw per kill, tuned to a single
 * total hit rate — the rack pays that often no matter how many lines it
 * carries. Authored chances become relative weights (×1000) and
 * nothingW is derived, so a new piece DILUTES its siblings instead of
 * inflating the rack: adding a sword never mints more swords per kill.
 * This is the flood law's spine — gear is an event, not a shower.
 */
function rack(
  id: string,
  desc: string,
  hitChance: number,
  lines: LootEntryDef[],
): LootTableDef {
  const entries = lines.map((e) => {
    const { chance, ...rest } = e;
    return { ...rest, w: Math.max(1, Math.round((chance ?? 1) * 1000)) };
  });
  const sumW = entries.reduce((a, e) => a + (e.w ?? 1), 0);
  const nothingW = Math.round((sumW * (1 - hitChance)) / hitChance);
  return { id, desc, mode: 'pick', nothingW, entries };
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
  rack('rat_wardrobe', 'Cloth and leathers dragged into the nest.', 0.03, [
    ...setDrops('mothwing', 0.028),
    ...setDrops('fenwalker', 0.014, { colorway: 'rustsedge' }),
    ...setDrops('cutpurse', 0.014, { colorway: 'alleyrat' }),
  ]),
  rack('rat_arms', 'The gutter arms rack: what beat the rats, kept.', 0.035, [
    { item: 'rustbite', chance: 0.02 },
    { item: 'shiv', chance: 0.03 },
    { item: 'ratter', chance: 0.02 },
    { item: 'stickbow', chance: 0.03 },
    { item: 'poachers_friend', chance: 0.015 },
    { item: 'hazel_switch', chance: 0.025 },
  ]),

  // ---------------------------------------------------- kobold warren
  // Kobolds hoard ore the way dragons hoard gold — they just can't
  // smelt any of it. Every drop line tells the quarry story: pocket
  // ore, the pick off its back (the carried weapon really drops), and
  // keys dug out of places keys should not have been.
  {
    id: 'kobold',
    desc: 'Warren pickings: pocket ore and a dead digger’s kit.',
    entries: [
      { item: 'bones' },
      { item: 'coins', qty: [3, 14], chance: 0.65 },
      { item: 'copper_ore', qty: [1, 2], chance: 0.18 },
      { item: 'tin_ore', qty: [1, 2], chance: 0.18 },
      { item: 'coal', chance: 0.08 },
      { item: 'iron_ore', chance: 0.05 },
      { item: 'bronze_pickaxe', chance: 0.02 },
      { item: 'brass_key', chance: 0.02 },
      { item: 'dungeon_key', chance: 0.015 },
      { item: 'linen_scrap', qty: [2, 3], chance: 0.2 },
      { item: 'ember_essence', qty: [1, 2], chance: 0.1 },
      { item: 'arcane_dust', chance: 0.06 },
      // The warren dug into the old forge. The diggers wear what the
      // anvil remembers, one piece per lucky kobold.
      ...setDrops('forgeheart', 0.004),
      // The forge's last pour never cooled. The warren dug it out and
      // nobody has held it long since.
      { item: 'cindermaw', chance: 0.005 },
      // A firebird nested over the warren once. What fell down the
      // shafts was warm, and writing something.
      { item: 'firequill', chance: 0.005 },
      // The warren's cook-fires burned a whole bough-stack one year.
      // One bough burned back.
      { item: 'charbough', chance: 0.005 },
    ],
  },
  {
    id: 'kobold_digmaster',
    desc: 'The digmaster’s cut: the iron pick and the best of the hoard.',
    entries: [
      { item: 'bones' },
      { item: 'coins', qty: [15, 50], chance: 0.9 },
      { item: 'iron_ore', qty: [2, 4], chance: 0.4 },
      { item: 'coal', qty: [1, 3], chance: 0.3 },
      { item: 'copper_ore', qty: [2, 4], chance: 0.25 },
      { item: 'tin_ore', qty: [2, 4], chance: 0.25 },
      // The chase drop: his own pick, an early miner's first upgrade.
      { item: 'iron_pickaxe', chance: 0.05 },
      // The other tool: the war-axe that never once swung at stone.
      { item: 'seamsplitter', chance: 0.015 },
      { item: 'dungeon_key', chance: 0.1 },
      { item: 'brass_key', chance: 0.06 },
      { item: 'emberstone', chance: 0.03 },
      { item: 'ember_essence', qty: [2, 4], chance: 0.25 },
      { item: 'arcane_dust', qty: [1, 2], chance: 0.15 },
      // The diggers found the magister's wardrobe. The digmaster
      // kept the shiniest of it, the way digmasters do.
      ...setDrops('orrery', 0.005),
      // The old forge answers to the digmaster now. The black iron
      // never cooled and he never asked why.
      ...setDrops('forgeheart', 0.01),
      // The magister's study had one drawer the diggers never got
      // open. The digmaster wears the reason on his belt.
      { item: 'runekey', chance: 0.012 },
      // The study's music stand held no music, only a bow strung
      // four ways. The digmaster cannot make it stop humming.
      { item: 'runespan', chance: 0.012 },
    ],
  },

  // ------------------------------------------------------- goblin camp
  {
    id: 'goblin',
    desc: 'Camp basics: pocket change, scavenged kit. Materials land seldom but heavy — same craft flow, fewer piles.',
    entries: [
      { item: 'bones' },
      { item: 'coins', qty: [4, 22], chance: 0.7 },
      { item: 'brass_key', chance: 0.02 },
      { item: 'dungeon_key', chance: 0.015 },
      { item: 'bronze_sword', chance: 0.02 },
      { item: 'arrow', qty: [8, 20], chance: 0.12 },
      { item: 'snare_kit', chance: 0.025 },
      { item: 'leather_body', chance: 0.015 },
      { item: 'leather_chaps', chance: 0.012 },
      { item: 'scrap_hide', qty: [2, 3], chance: 0.2 },
      { item: 'linen_scrap', qty: [2, 4], chance: 0.25 },
      { item: 'emberstone', chance: 0.01 },
      { item: 'bloomstone', chance: 0.01 },
      { item: 'ember_essence', qty: [1, 2], chance: 0.12 },
      { item: 'arcane_dust', qty: [1, 2], chance: 0.08 },
    ],
  },
  rack('goblin_wardrobe', 'Singed, stolen, and hacked-apart wardrobes of the camp.', 0.04, [
    ...setDrops('mothwing', 0.018, { colorway: 'ember' }),
    ...setDrops('fenwalker', 0.016),
    ...setDrops('cutpurse', 0.016),
    ...setDrops('briarplate', 0.01, { colorway: 'bloodbriar' }),
  ]),
  rack('goblin_arms', 'Camp ironwork and stolen hedge-craft.', 0.045, [
    { item: 'rustbite', chance: 0.03 },
    { item: 'gobsplitter', chance: 0.025 },
    // Too big for any goblin to swing — looted, dragged home, hoarded.
    { item: 'iron_greatblade', chance: 0.018 },
    // The warband's own double-axe: two bent plow-blades, one haft.
    { item: 'gobmangler', chance: 0.02 },
    { item: 'gobnail_warboard', chance: 0.025 },
    { item: 'shiv', chance: 0.025 },
    { item: 'stickbow', chance: 0.03 },
    { item: 'knucklebow', chance: 0.025 },
    { item: 'bramblethorn', chance: 0.015 },
    { item: 'hazel_switch', chance: 0.03 },
    { item: 'wisplight', chance: 0.012 },
  ]),
  {
    // The road-thieves' pockets: heavier coin than any beast carries
    // (they've been TAKING it), trail rations, and the working kit of
    // an ambush trade. What they wear is what they drop.
    id: 'brigand',
    desc: 'A road-thief’s pockets: stolen coin and an ambusher’s kit.',
    entries: [
      { item: 'bones' },
      { item: 'coins', qty: [10, 36], chance: 0.8 },
      { item: 'brass_key', chance: 0.035 },
      { item: 'dungeon_key', chance: 0.02 },
      { item: 'bread', chance: 0.15 },
      { item: 'arrow', qty: [8, 18], chance: 0.15 },
      { item: 'snare_kit', chance: 0.03 },
      { item: 'leather_hood', chance: 0.015 },
      { item: 'leather_body', chance: 0.012 },
      { item: 'leather_chaps', chance: 0.01 },
      { item: 'leather_boots', chance: 0.01 },
      { item: 'scrap_hide', qty: [2, 3], chance: 0.18 },
      { item: 'linen_scrap', qty: [2, 4], chance: 0.22 },
      { item: 'arcane_dust', chance: 0.06 },
      // A torn bank page rides some pockets — reading it starts the
      // banker's errand. Plain table math; the page is worth nothing.
      { item: 'torn_ledger_page', chance: 0.025 },
      // A rank hand sometimes holds a piece of the reaver's prize.
      ...setDrops('cindershade', 0.004),
      // Every road crew has one hand who claims to have flown with
      // the Rookery. One of them was not lying.
      { item: 'rooksbeak', chance: 0.005 },
    ],
  },
  rack('brigand_wardrobe', 'Stolen wardrobes — cut purses and quieter boots.', 0.04, [
    ...setDrops('cutpurse', 0.02),
    ...setDrops('fenwalker', 0.016),
    ...setDrops('mothwing', 0.012),
  ]),
  rack('brigand_arms', 'Honest iron in dishonest hands.', 0.05, [
    { item: 'iron_sword', chance: 0.05 },
    { item: 'iron_dagger', chance: 0.05 },
    { item: 'shortbow', chance: 0.04 },
    { item: 'hunters_quiver', chance: 0.02 },
    { item: 'oak_kiteshield', chance: 0.02 },
    { item: 'iron_helm', chance: 0.03 },
    // The crew's toll-blade — the reaver keeps it; the crew dreams.
    { item: 'reavers_toll', chance: 0.012 },
  ]),
  {
    // The reaver kept the crew's shares. Killing the name is the
    // payday — and the second-best key faucet on the open road.
    id: 'brigand_reaver',
    desc: 'The crew’s shares, kept in the reaver’s own coat.',
    entries: [
      { item: 'bones' },
      { item: 'coins', qty: [30, 90], chance: 1 },
      { item: 'brass_key', chance: 0.14 },
      { item: 'dungeon_key', chance: 0.07 },
      { item: 'iron_dagger', chance: 0.05 },
      // The name carries the toll-blade itself.
      { item: 'reavers_toll', chance: 0.03 },
      // The war's own trophy, carried by whoever claims the road now.
      { item: 'tollbreaker', chance: 0.01 },
      { item: 'leather_hood', chance: 0.03 },
      ...setDrops('cutpurse', 0.012),
      // The crews burn what they rob. One of them walked out of a
      // burn wearing this, and the reaver took it off them.
      ...setDrops('cindershade', 0.01),
      { item: 'emberstone', chance: 0.02 },
      { item: 'stormpearl', chance: 0.015 },
      // The royal escort lost exactly one thing on the low road, and
      // the reaver has been afraid to sell it ever since.
      { item: 'crownfire', chance: 0.01 },
      // The crew drank to every job from one garnet cup. The cup
      // never filled and the crew never noticed what it was drinking.
      { item: 'everthirst', chance: 0.01 },
      // The crew's tracker bragged his bow found the mark by smell.
      // The crew stopped asking what it fed on.
      { item: 'redquarry', chance: 0.01 },
    ],
  },
  {
    id: 'goblin_thrower',
    desc: 'Thrower basics: ammo and the warband’s colors.',
    entries: [
      { item: 'bones' },
      { item: 'coins', qty: [5, 24], chance: 0.7 },
      { item: 'arrow', qty: [8, 18], chance: 0.45 },
      { item: 'straw_decoy', chance: 0.03 },
      { item: 'cape_banner', chance: 0.02 },
      { item: 'apprentice_robe', chance: 0.015 },
      { item: 'linen_scrap', qty: [2, 4], chance: 0.28 },
      { item: 'stormpearl', chance: 0.01 },
      { item: 'fang_band', chance: 0.02 },
      { item: 'storm_essence', qty: [1, 2], chance: 0.13 },
      { item: 'arcane_dust', chance: 0.07 },
      // The throwers scavenge the high passes after weather. Some of
      // what the lightning drops is armor.
      ...setDrops('stormcrown', 0.005),
      // And once in a war, what it drops is the blade it was aiming
      // at all along.
      { item: 'skysplinter', chance: 0.004 },
      // A thrower's dream kit: a stick that throws the WEATHER. None
      // of them can make it work. They keep it anyway.
      { item: 'galecall', chance: 0.005 },
      // The one bow in camp nobody dares string. The spark between
      // the talons has opinions about goblins.
      { item: 'galespur', chance: 0.005 },
    ],
  },
  rack('thrower_wardrobe', 'Coast plunder and trampled-fen cloth.', 0.04, [
    ...setDrops('tidecaller', 0.02),
    ...setDrops('fenwalker', 0.014, { colorway: 'mirebloom' }),
    ...setDrops('cutpurse', 0.012, { colorway: 'redhand' }),
    ...setDrops('briarplate', 0.009, { colorway: 'nightbriar' }),
  ]),
  rack('thrower_arms', 'Raider blades off the coast and the fens.', 0.045, [
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
  ]),

  // -------------------------------------------------------------- crypt
  {
    id: 'skeleton',
    desc: 'Grave-goods: old iron and the shield-stone.',
    entries: [
      { item: 'bones', qty: [1, 2] },
      { item: 'coins', qty: [6, 28], chance: 0.6 },
      { item: 'brass_key', chance: 0.05 },
      { item: 'dungeon_key', chance: 0.02 },
      { item: 'iron_ore', chance: 0.1 },
      { item: 'gloomsilk_thread', qty: [1, 2], chance: 0.22 },
      { item: 'ember_charm', chance: 0.012 },
      { item: 'aegis_stone', chance: 0.01 },
      { item: 'seeker_stone', chance: 0.008 },
      { item: 'cape_emberweave', chance: 0.012 },
      { item: 'cape_midnight', chance: 0.01 },
      { item: 'iron_helm', chance: 0.015 },
      { item: 'iron_greaves', chance: 0.01 },
      { item: 'iron_sabatons', chance: 0.01 },
      { item: 'iron_gauntlets', chance: 0.01 },
      { item: 'frostshard', chance: 0.01 },
      { item: 'arcane_dust', qty: [1, 3], chance: 0.22 },
      { item: 'frost_essence', chance: 0.11 },
      // A Waykeeper's last letter, still on the body it outlived —
      // using it opens The Last Patrol (an ordinary drop, no dials).
      { item: 'weathered_letter', chance: 0.03 },
      // The keeper's white and gold, still bright in the crypt dark.
      ...setDrops('vigil', 0.003),
      // Some bone remembers being a person. This one took notes.
      { item: 'marrowlight', chance: 0.004 },
      // One of the buried was a morning priest. The crypt has never
      // once managed to put the light out.
      { item: 'firstlight', chance: 0.004 },
      // The priest's warden was an archer. Her bow still faces the
      // east wall, waiting for a window.
      { item: 'suncrest', chance: 0.004 },
    ],
  },
  {
    id: 'skeleton_guard',
    desc: 'The key-keeper of the crypt: the watch carried the brass, the iron, and the shield-stone.',
    entries: [
      { item: 'bones', qty: [1, 2] },
      { item: 'coins', qty: [8, 32], chance: 0.65 },
      // The guards hold the keys — the strongchest story sends you
      // through them.
      { item: 'brass_key', chance: 0.12 },
      { item: 'iron_ore', chance: 0.12 },
      { item: 'iron_helm', chance: 0.02 },
      { item: 'oak_kiteshield', chance: 0.015 },
      { item: 'aegis_stone', chance: 0.02 },
      { item: 'gloomsilk_thread', qty: [1, 2], chance: 0.2 },
      { item: 'umbral_essence', chance: 0.14 },
      { item: 'arcane_dust', qty: [1, 3], chance: 0.22 },
      { item: 'frost_essence', chance: 0.11 },
      { item: 'weathered_letter', chance: 0.035 },
      // The watch kept the keeper's vestment with the keys.
      ...setDrops('vigil', 0.005),
      // The shrine blade the watch swore in on. The guard that holds
      // it still thinks the words are being read to him.
      { item: 'brightword', chance: 0.006 },
    ],
  },
  rack(
    'crypt_wardrobe',
    'What the crypt’s prowlers and its watch wore in. The Nightveil jerkin and Voidwhisper robe stay with the Champion.',
    0.05,
    [
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
  ),
  rack('crypt_arms', 'Blades, bows, and staves the dead still carry.', 0.045, [
    { item: 'fenreaper', chance: 0.01 },
    { item: 'gravewhisper', chance: 0.012 },
    // The great school's grave-goods: the buried blade and the jaws.
    { item: 'gravewrought', chance: 0.01 },
    { item: 'barrowmaw', chance: 0.008 },
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
  ]),

  // ----------------------------------------------------- the Champion
  {
    id: 'skeleton_champion',
    desc: 'The boss purse: guaranteed coin, trinkets, and the sigil.',
    entries: [
      { item: 'bones', qty: [2, 4] },
      { item: 'coins', qty: [40, 120] },
      { item: 'iron_sword', chance: 0.12 },
      // The Champion was buried with a greatsword. It kept that too.
      { item: 'gravewrought', chance: 0.03 },
      { item: 'iron_bar', qty: [1, 2], chance: 0.4 },
      { item: 'gloomsilk_thread', qty: [2, 5], chance: 0.5 },
      // The dark he has stood in for a few centuries has gone thick.
      { item: 'umbral_essence', qty: [1, 3], chance: 0.4 },
      { item: 'storm_bell', chance: 0.08 },
      { item: 'storm_coil', chance: 0.07 },
      { item: 'seeker_stone', chance: 0.05 },
      { item: 'fang_band', chance: 0.04 },
      { item: 'ember_staff', chance: 0.05 },
      { item: 'willow_longbow', chance: 0.05 },
      { item: 'sigil_fallen_champion', chance: 0.2 },
      { item: 'dungeon_key', chance: 0.3 },
      { item: 'tome_of_embers', chance: 0.1 },
      { item: 'arcane_dust', qty: [3, 6], chance: 0.6 },
      { item: 'storm_essence', qty: [1, 3], chance: 0.35 },
      { item: 'frost_essence', qty: [1, 3], chance: 0.35 },
      // The crypt's own legends: the king's plate stayed with the
      // Champion, the rift's cloth with the door he guards, and the
      // brood's silk with whatever he feeds.
      ...setDrops('barrowking', 0.006),
      ...setDrops('riftweave', 0.006),
      // One rook tried the Champion's vault in person. The Champion
      // kept the feathers.
      ...setDrops('rookfeather', 0.005),
      // The Champion knelt to a king once. What the king carried is
      // down here, still floating, still refusing to be worn.
      { item: 'skythrone', chance: 0.005 },
      // The king's marshal carried the answer to it: a war bow flying
      // the storm's anvil. The Champion holds both grudges now.
      { item: 'thunderhead', chance: 0.005 },
      ...setDrops('broodsilk', 0.008),
      // The Champion still drills in the dark. The gold and crimson
      // were the king's grant; the oath outlasted the king.
      ...setDrops('oathgold', 0.005),
      // The Champion's own field surgeon went into the dark with the
      // rest. Its needle still makes rounds.
      { item: 'marrowlight', chance: 0.006 },
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
  rack(
    'champion_wardrobe',
    'The villain’s own wardrobe, and the reserved set pieces.',
    0.4,
    [
      { item: 'horned_raider_helm', chance: 0.12 },
      { item: 'steel_greathelm', chance: 0.06 },
      { item: 'iron_platebody', chance: 0.15 },
      { item: 'emberweave_robe', chance: 0.08 },
      { item: 'frostplate_platebody', chance: 0.06 },
      { item: 'frostplate_greaves', chance: 0.05 },
      { item: 'frostplate_greatshield', chance: 0.04 },
      { item: 'nightveil_jerkin', chance: 0.05 },
      { item: 'voidwhisper_robe', chance: 0.045 },
      ...setDrops('dreadforge', 0.04),
      ...setDrops('emberfox', 0.04, { colorway: 'shadowfox' }),
      ...setDrops('sentinel', 0.035, { colorway: 'daybreak' }),
      ...setDrops('sentinel', 0.03, { colorway: 'midnight' }),
    ],
  ),
  rack(
    'champion_armory',
    'The trophy racks of everyone who tried. The white whales only exist legendary.',
    0.35,
    [
      { item: 'duelists_grace', chance: 0.06 },
      { item: 'bloodletter', chance: 0.04 },
      { item: 'stonebreaker_maul', chance: 0.04 },
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
      // The Champion's own arm: the shield it grew, and the dreadforge
      // wall from the armory it was buried with.
      { item: 'bonespur_ward', chance: 0.035 },
      { item: 'dreadforge_thornwall', chance: 0.02 },
      // THE ARMORY's chase pieces: the great school's owned steel,
      // and the two heirlooms that only exist legendary.
      { item: 'ashrender', chance: 0.04 },
      { item: 'frostfell', chance: 0.035 },
      { item: 'stormhewer', chance: 0.035 },
      { item: 'colossus_vow', chance: 0.005 },
      { item: 'mountains_end', chance: 0.005 },
      // THE VAULT OF NAMES' legendary pair: the gate-glass blade and
      // the cracked bell, both legendary or not at all.
      { item: 'riftglass', chance: 0.004 },
      { item: 'last_bell', chance: 0.005 },
    ],
  ),

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
      { item: 'dungeon_key', chance: 0.04 },
      // Racks are pick-mode: mult scales the hit odds against nothingW,
      // so a chest pays gear far oftener than the camp that guards it.
      { table: 'goblin_arms', mult: 8 },
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
      { item: 'dungeon_key', chance: 0.1 },
      { table: 'crypt_arms', mult: 12 },
      { table: 'crypt_wardrobe', mult: 10 },
      // The strongbox was sealed at dusk. Something in it is still
      // waiting for its hour.
      { item: 'firstlight', chance: 0.006 },
      // Locked away bronze-side down. The lid never quite goes dark
      // over the crest.
      { item: 'suncrest', chance: 0.006 },
      // Silver worth locking up twice. The three small moons keep
      // walking their ring in the dark.
      { item: 'moonwell', chance: 0.005 },
      // Glass poured on the same cold night, boxed so the glint
      // inside would stop unsettling the guards. It has not.
      { item: 'moonglass', chance: 0.005 },
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
      { item: 'dungeon_key', chance: 0.18 },
      { item: 'arcane_dust', qty: [3, 6], chance: 0.7 },
      { item: 'storm_essence', qty: [1, 3], chance: 0.4 },
      { item: 'frost_essence', qty: [1, 3], chance: 0.4 },
      // Gold keeps daylight better than most things.
      { item: 'radiant_essence', qty: [1, 2], chance: 0.3 },
      { table: 'heirlooms', mult: 2 },
      // The gilded locks held the rest of the magister's estate.
      ...setDrops('orrery', 0.008),
      // The rooks bank their best in other people's vaults.
      ...setDrops('rookfeather', 0.006),
      // A crown's ransom banks somewhere. Sometimes it IS the ransom.
      { item: 'crownfire', chance: 0.005 },
      // One rook's retirement plan, filed under someone else's name.
      { item: 'rooksbeak', chance: 0.006 },
      // Deposited in a vault by someone who wanted it far away, in
      // the dark, with other people's guards around it.
      { item: 'hollowstar', chance: 0.005 },
      // Banked with the lights facing the wall. The clerk who took
      // the deposit still checks over his shoulder.
      { item: 'hushwing', chance: 0.005 },
      // The magister's own key to doors without hinges, banked with
      // everything else he trusted no apprentice to hold.
      { item: 'runekey', chance: 0.005 },
      // Beside it, the harp he taught to shoot. The vault log lists
      // it as an instrument. The guards list it as a reason to knock.
      { item: 'runespan', chance: 0.005 },
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
      { item: 'dungeon_key', chance: 0.05 },
      { table: 'crypt_arms', mult: 6 },
      { table: 'wolf_arms', mult: 6 },
      // Moonbell grows over mossy lids; sometimes a set piece grew in.
      ...setDrops('moonbell', 0.008),
      // What the old kingdom fletched, the moss kept dry.
      ...setDrops('skytalon', 0.006),
      // The sea is a long way up the creek from here. Rings on the
      // lid anyway.
      { item: 'saltfang', chance: 0.005 },
      // The garden went wild over this one particular box.
      { item: 'nightbloom', chance: 0.004 },
      // The moss opened the lid a crack and a bough grew in. The
      // bloom on it still thinks the box is spring.
      { item: 'wealdheart', chance: 0.005 },
      // A shed crown went into the box as antler and came out
      // strung. The briar takes credit.
      { item: 'thornwake', chance: 0.005 },
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
      { item: 'dungeon_key', chance: 0.6 },
      { item: 'arcane_dust', qty: [4, 8], chance: 0.8 },
      { item: 'crimson_essence', qty: [2, 4], chance: 0.5 },
      { item: 'radiant_essence', qty: [1, 3], chance: 0.35 },
      { item: 'astral_essence', qty: [1, 3], chance: 0.3 },
      // The king under the hill banked with the house he built.
      ...setDrops('barrowking', 0.008),
      // A rook got here first, once. It left the feathers behind.
      ...setDrops('rookfeather', 0.01),
      // The champion's parade kit went into the hoard with the
      // champion. The pennons still fly down there.
      ...setDrops('oathgold', 0.008),
      // The weather abdicated into this hoard. The crown floats an
      // honest inch over the coins and outranks all of them.
      { item: 'skythrone', chance: 0.008 },
      // The storm kept its anvil, though, and nailed it over a war
      // bow's tip. The hoard hears the hammering on bad nights.
      { item: 'thunderhead', chance: 0.008 },
    ],
  },
  {
    id: 'chest_riftgate',
    desc: 'The gatekeeper’s cache: a dungeon key near-certain, and the kit of whoever failed to turn it.',
    rarityBonus: 3,
    entries: [
      { item: 'coins', qty: [30, 90] },
      { item: 'dungeon_key', chance: 0.75 },
      { item: 'brass_key', chance: 0.12 },
      { item: 'arcane_dust', qty: [2, 5], chance: 0.6 },
      { item: 'storm_essence', qty: [1, 2], chance: 0.25 },
      // The gate looks somewhere very far away. Some of it condenses.
      { item: 'astral_essence', qty: [1, 2], chance: 0.3 },
      { table: 'crypt_arms', mult: 8 },
      // Ground from a pane of this very gate.
      { item: 'riftglass', chance: 0.006 },
      // Woven from the same dark the blade was ground from.
      ...setDrops('riftweave', 0.006),
      // The smith's dragon run went below with whoever ordered it.
      ...setDrops('wyrmsteel', 0.006),
      // Whoever built the gate charted the sky to aim it. Their
      // instrument still keeps its own orbit by the lock.
      { item: 'driftstar', chance: 0.006 },
      // The charting took a loom. The loom took to the night. The
      // shuttle has not stopped for anyone since.
      { item: 'starloom', chance: 0.006 },
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
      { item: 'verdant_totem', chance: 0.02 },
      { item: 'bramble_band', chance: 0.015 },
      { item: 'bloomstone', chance: 0.01 },
      { item: 'crimson_essence', qty: [1, 2], chance: 0.12 },
      { item: 'verdant_essence', chance: 0.1 },
      // The winter court's leavings, snagged in the pack's fur.
      ...setDrops('wintercourt', 0.003),
    ],
  },
  rack(
    'wolf_wardrobe',
    'Hunt the pack, wear the pack. Frostplate walks with the winter packs — the body and greaves stay with the Champion.',
    0.05,
    [
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
  ),
  {
    id: 'worg',
    desc: 'Goblin war-hound pickings: mangy hide, a knife-length fang, and whatever the camp hung on it.',
    entries: [
      { item: 'bones' },
      { item: 'worg_fang', chance: 0.55 },
      { item: 'scrap_hide', qty: [1, 2], chance: 0.4 },
      { item: 'coins', qty: [4, 14], chance: 0.4 },
      { item: 'venom_gland', chance: 0.15 },
      { item: 'crimson_essence', chance: 0.12 },
      { item: 'bearspine', chance: 0.006 },
      // War-hounds howl at what their masters steal. One camp stole
      // the moon's own staff, and the worgs would not leave it be.
      { item: 'moonwell', chance: 0.01 },
      // The pack's other prize: a bow of night glass. The worgs
      // howl at the glint in it, which howls nothing back.
      { item: 'moonglass', chance: 0.01 },
    ],
  },
  {
    id: 'dire_wolf',
    desc: 'The matriarch pays like the champion she is: the great pelt, and the pack\'s hoard snagged in it.',
    rarityBonus: 3,
    entries: [
      { item: 'bones' },
      { item: 'direwolf_pelt', chance: 0.9 },
      // The matriarch carries the pack's shield — she pays it best.
      { item: 'wolfjaw_targe', chance: 0.06 },
      { item: 'wolf_fur', qty: [1, 2], chance: 0.6 },
      { item: 'coins', qty: [30, 80], chance: 0.7 },
      { item: 'crimson_essence', qty: [1, 3], chance: 0.35 },
      { item: 'verdant_totem', chance: 0.1 },
      { item: 'bloomstone', chance: 0.04 },
      { item: 'brass_key', chance: 0.08 },
      { item: 'dungeon_key', chance: 0.04 },
      // The matriarch walks with the winter court's wardrobe — the
      // cold kept a court once, and the packs inherited the estate.
      ...setDrops('wintercourt', 0.012),
      // The court's sword outlived the court. The matriarch sleeps
      // curled around it, and the den never quite thaws.
      { item: 'winterspire', chance: 0.008 },
    ],
  },
  rack('wolf_arms', 'The pack’s blades, bows, and argued-over staves.', 0.04, [
    { item: 'wolfjaw_targe', chance: 0.02 },
    { item: 'wolffang', chance: 0.03 },
    { item: 'frostbrand', chance: 0.01 },
    { item: 'fangtooth', chance: 0.03 },
    { item: 'palefire', chance: 0.008 },
    { item: 'poachers_friend', chance: 0.02 },
    { item: 'wolfsong', chance: 0.02 },
    { item: 'rimewood', chance: 0.008 },
    { item: 'shepherds_crook', chance: 0.03 },
    { item: 'glacierbite', chance: 0.006 },
  ]),

  // ------------------------------------------------------- the wilds
  {
    id: 'mudcrab',
    desc: 'Shell pickings, and whatever it caught last.',
    entries: [
      { item: 'bones' },
      { item: 'raw_trout', chance: 0.25 },
      { item: 'coins', qty: [1, 6], chance: 0.3 },
      // The tide buried a duelist and kept the saber. The crabs have
      // been passing it around ever since.
      { item: 'saltfang', chance: 0.008 },
    ],
  },
  {
    id: 'slime',
    desc: 'What the ooze dissolved, and what it could not.',
    entries: [
      { item: 'coins', qty: [2, 10], chance: 0.5 },
      { item: 'verdant_essence', chance: 0.15 },
      { item: 'arcane_dust', chance: 0.12 },
      // Jade is the one thing the ooze never managed to digest. It
      // carries the grudge around its middle.
      { item: 'vipersong', chance: 0.012 },
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
      // The crag keeps the storm and the ram keeps the crag. The
      // crown comes down the mountain one piece at a time.
      ...setDrops('stormcrown', 0.012),
      // The split blade fell up there with its wielder. The rams
      // guard the gap in it like a lamb.
      { item: 'skysplinter', chance: 0.01 },
      // The wind on the crag blows out of a spindle someone dropped.
      // The rams like the calm spot at the middle of it.
      { item: 'galecall', chance: 0.01 },
      // A falcon stooped at a ram once and lost. What the falconer
      // dropped on the crag, the flock now guards on principle.
      { item: 'galespur', chance: 0.01 },
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
      // The hart wore the crown first. The warden's kit follows it.
      ...setDrops('hartsong', 0.012),
      // The old wood grew one staff on purpose. The hart carries it
      // between owners, the way the wood asked it to.
      { item: 'wealdheart', chance: 0.008 },
      // Stags shed their crowns every spring. One spring the briar
      // got to a crown first, and the herd keeps its distance now.
      { item: 'thornwake', chance: 0.008 },
    ],
  },
  {
    // The bull earns its own table the day it starts dropping plate:
    // the Aurochs set is the pasture's legend, and the bull is the
    // legend's keeper.
    id: 'bull',
    desc: 'Everything a bull is made of, and the black bronze it earned.',
    entries: [
      { item: 'raw_beef' },
      { item: 'cowhide' },
      { item: 'bones' },
      ...setDrops('aurochs', 0.01),
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
      // The boar shares the bull's country; sometimes it wins.
      ...setDrops('aurochs', 0.005),
      // It tramples the hart's glades too, and keeps what it finds.
      ...setDrops('hartsong', 0.005),
    ],
  },
  {
    id: 'giant_beetle',
    desc: 'Ground chitin is half dust already.',
    entries: [
      { item: 'bones' },
      { item: 'arcane_dust', chance: 0.15 },
      { item: 'verdant_essence', chance: 0.08 },
      // Chitin does not burn. One beetle carried the coal-blade home
      // through the deep runs and never noticed the weight.
      { item: 'cindermaw', chance: 0.012 },
      // The same shell hauled the scribe's staff out of the burn.
      // Five brass feathers, not one of them singed.
      { item: 'firequill', chance: 0.01 },
      // It also dragged home a branch that was still burning. Three
      // seasons on, it still is.
      { item: 'charbough', chance: 0.01 },
    ],
  },
  {
    id: 'cave_bat',
    desc: 'Small bones and cave-things.',
    entries: [
      { item: 'bones' },
      { item: 'crimson_essence', chance: 0.06 },
      { item: 'gloomsilk_thread', chance: 0.12 },
      // It has never once seen the sun, and it shows.
      { item: 'umbral_essence', chance: 0.1 },
    ],
  },
  {
    id: 'adder',
    desc: 'Venom by the gland, skin by the yard.',
    entries: [
      { item: 'bones' },
      { item: 'venom_gland', chance: 0.6 },
      { item: 'scrap_hide', qty: [1, 2], chance: 0.4 },
      // The adder owns the Adderfang set — the skins the road crews
      // whisper about. Moonbell grows where the adders sun themselves.
      ...setDrops('adderfang', 0.008),
      ...setDrops('moonbell', 0.006),
      // The jade fang went into a nest a hundred years ago. The
      // adders keep it warm and call it grandmother.
      { item: 'vipersong', chance: 0.008 },
    ],
  },
  {
    id: 'giant_spider',
    desc: 'Silk and venom — the crypt tailors pay for both.',
    entries: [
      { item: 'venom_gland', chance: 0.5 },
      { item: 'gloomsilk_thread', qty: [1, 2], chance: 0.4 },
      { item: 'umbral_essence', chance: 0.12 },
      { item: 'crimson_essence', chance: 0.08 },
      // The spider owns Broodsilk — its own silk, worn back at it.
      // A long hunt: the web gives nothing up twice.
      ...setDrops('broodsilk', 0.0025),
      ...setDrops('moonbell', 0.005),
      // The petal-knife came into the web on a gardener who never
      // left. The web keeps the pruning shear it was pruned with.
      { item: 'nightbloom', chance: 0.006 },
      // The web's darkest corner holds a star that stopped shining
      // on purpose. Even the spider walks around it.
      { item: 'hollowstar', chance: 0.005 },
      // An owl hunted this web's corner of the dark for years. The
      // web won, and kept the wings as a warning.
      { item: 'hushwing', chance: 0.005 },
    ],
  },
  {
    id: 'skeleton_archer',
    desc: 'A quiver that outlived its owner.',
    entries: [
      { item: 'bones' },
      { item: 'arrow', qty: [8, 20], chance: 0.6 },
      { item: 'coins', qty: [4, 20], chance: 0.5 },
      { item: 'arcane_dust', chance: 0.1 },
      { item: 'frost_essence', chance: 0.1 },
      { item: 'weathered_letter', chance: 0.03 },
      // The old kingdom's hawk-warden, still at his post. The rig
      // outlived the wing.
      ...setDrops('skytalon', 0.008),
    ],
  },
  {
    id: 'troll',
    desc: 'A pocket-hoard scraped off the hills.',
    entries: [
      { item: 'bones' },
      { item: 'coins', qty: [10, 40], chance: 0.9 },
      { item: 'dungeon_key', chance: 0.05 },
      { item: 'arcane_dust', qty: [1, 2], chance: 0.15 },
      { item: 'ember_essence', chance: 0.1 },
      { item: 'leather', chance: 0.12 },
      // Fished out of the fen and kept for the light in it.
      { item: 'fens_lantern', chance: 0.02 },
      // The troll keeps anything that glows. It never once looked up
      // to ask where the dancing cloth came from.
      ...setDrops('skydancer', 0.008),
      // The trolls den in the old wyrm caves. The emerald plate suits
      // them fine; it glows.
      ...setDrops('wyrmsteel', 0.008),
      // It glows AND it grows. The troll thinks it is a pet.
      { item: 'winterspire', chance: 0.006 },
      // A falling star bounced off the hills once. The troll caught
      // it on the second bounce and has been feeding it since.
      { item: 'driftstar', chance: 0.006 },
      // The troll also keeps a frame of silver threads it cannot
      // untangle. It calls the frame "harp". The frame declines.
      { item: 'starloom', chance: 0.006 },
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
      // The claw-axe hafted through one of these very spines.
      { item: 'bearspine', chance: 0.012 },
      // The deep wood buried a red thing under a den because burying
      // it was easier than owning it. Ask the bear how that went.
      { item: 'everthirst', chance: 0.01 },
      // Rib and fang of the den's last owner, strung by the hunt
      // that lost. The bear sleeps on it out of respect.
      { item: 'redquarry', chance: 0.01 },
    ],
  },
];

/**
 * The recipe troves — GENERATED pick-tables over every drop-unlock
 * recipe scroll, banded by the recipe's level so a roadside chest
 * never spills a starsteel schematic. A trove always pays exactly one
 * scroll (the CHEST entry carries the find-chance); within a band the
 * humbler recipes turn up a little more often. New drop recipes join
 * their trove without touching this file.
 */
function recipeTrove(id: string, desc: string, lo: number, hi: number): LootTableDef {
  const entries: LootEntryDef[] = UNLOCKABLE_RECIPES.filter(
    (r) => r.unlock === 'drop' && r.levelReq >= lo && r.levelReq <= hi,
  ).map((r) => ({
    item: recipeScrollId(r.id),
    w: Math.max(1, Math.round(120 / Math.max(8, r.levelReq))),
  }));
  if (entries.length === 0) throw new Error(`recipe trove '${id}' has no recipes in [${lo}, ${hi}]`);
  return { id, desc, mode: 'pick', entries };
}

defs.push(
  recipeTrove(
    'recipe_trove_field',
    'Field lore: the forbidden brews and early found-knowledge the road hides.',
    1,
    39,
  ),
  recipeTrove(
    'recipe_trove_vault',
    'Vault lore: the high shelf of the working trades, under lock for a reason.',
    40,
    64,
  ),
  recipeTrove(
    'recipe_trove_crown',
    'Crown lore: capstone schematics and treatises the deep places keep.',
    65,
    200,
  ),
);

// Every chest tier carries its rumor of lore; the deeper ladders reach
// the higher shelves. Dungeon chests roll these same tables, so delve
// and Gloomhollow treasure inherits the chase automatically.
const TROVE_IN_CHESTS: Array<[chest: string, trove: string, chance: number]> = [
  ['chest_wood', 'recipe_trove_field', 0.07],
  ['chest_mossy', 'recipe_trove_field', 0.1],
  ['chest_iron', 'recipe_trove_field', 0.08],
  ['chest_iron', 'recipe_trove_vault', 0.08],
  ['chest_gilded', 'recipe_trove_vault', 0.15],
  ['chest_gilded', 'recipe_trove_crown', 0.05],
  ['chest_boss', 'recipe_trove_vault', 0.15],
  ['chest_boss', 'recipe_trove_crown', 0.15],
];
for (const [chest, trove, chance] of TROVE_IN_CHESTS) {
  const t = defs.find((d) => d.id === chest);
  if (!t) throw new Error(`trove wiring: unknown chest table '${chest}'`);
  t.entries.push({ table: trove, chance });
}

// ------------------------------------------------------ the bounty purse
// THE TOWN PAYS FOR QUIET (living-frontier Phase 3.2): one purse per
// site tier, paid to each participant when a bountied garrison breaks —
// NEVER while it stands (the anti-farm law: rewards buy the breaking,
// not the keeping). The server scales the rolled qty by the camp's
// boldness stage (×1..×4); the flood law's analyzer sees the base
// tables here like any other faucet. Coin-only by design: gear comes
// from the camp itself (bodies + warded chest) — the town adds wages.
defs.push(
  {
    id: 'bounty_t1',
    desc: "A hamlet's thanks: pocket coin for a nuisance put down.",
    entries: [{ item: 'coins', qty: [30, 60] }],
  },
  {
    id: 'bounty_t2',
    desc: 'A road bounty: honest wages for a camp broken.',
    entries: [{ item: 'coins', qty: [60, 110] }],
  },
  {
    id: 'bounty_t3',
    desc: 'A town purse: real coin for real trouble ended.',
    entries: [{ item: 'coins', qty: [100, 180] }],
  },
  {
    id: 'bounty_t4',
    desc: 'A garrison purse: the watch pays well past the safe roads.',
    entries: [{ item: 'coins', qty: [160, 280] }],
  },
  {
    id: 'bounty_t5',
    desc: 'A crown purse: the deep frontier answered in full.',
    entries: [{ item: 'coins', qty: [240, 420] }],
  },
);

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
    if (t.maxDrops !== undefined && (!Number.isInteger(t.maxDrops) || t.maxDrops < 1)) {
      throw new Error(`loot table '${t.id}': maxDrops must be a positive integer`);
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

/** The authored tables exactly as shipped — the CMS revert target. */
export const AUTHORED_LOOT_TABLES: ReadonlyMap<string, LootTableDef> = new Map(
  defs.map((t) => [t.id, t]),
);

/**
 * THE CMS HOOK: repopulate the live loot registry in place. rollLoot
 * resolves tables through this map on every roll, so a replaced set
 * pays out on the very next kill — no restart, no captured state.
 * Callers validate the FULL candidate set first (validateLootTables
 * throws on dangling refs and cycles); this function trusts its input.
 */
export function replaceLootTables(next: Iterable<LootTableDef>): void {
  const map = LOOT_TABLES as Map<string, LootTableDef>;
  map.clear();
  for (const t of next) map.set(t.id, t);
}

/** validateLootTables, collecting instead of throwing — the CMS gate. */
export function lootTableErrors(tables: readonly LootTableDef[]): string[] {
  try {
    validateLootTables(tables);
    return [];
  } catch (err) {
    return [(err as Error).message];
  }
}
