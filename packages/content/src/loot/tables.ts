import { RARITY_TIERS } from '@arx/shared';
import { HEIRLOOM_CHANCE } from '../equipment/tables.js';
import { ITEMS } from '../items.js';
import { UNLOCKABLE_RECIPES, recipeScrollId } from '../recipes.js';
// A deliberate cycle: analyze.js imports this module's LOOT_TABLES.
// Safe because the module-load call below (validateLootTables) stays
// purely structural — expectedYield is only dereferenced from
// lootTableErrors, long after both module bodies have evaluated.
import { expectedYield } from './analyze.js';
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
    // A tinker went after a nest with the wrong knife and the right
    // nerve. The knife stayed.
    { item: 'cindersnip', chance: 0.015 },
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
      // The glassworks above the warren lost a pipe down a shaft,
      // gather and all. The diggers treat it as a lamp that drips.
      { item: 'glassgather', chance: 0.006 },
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
      // One vein came up already knife shaped and pulling at the
      // picks. The digmaster hafted it and stopped losing nails.
      { item: 'lodestone', chance: 0.008 },
      // The magister's clock survived the diggers by being too
      // interesting to smash. The digmaster winds it and listens.
      { item: 'escapement', chance: 0.008 },
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
    // Farm iron the camp stole with the rest of the barn.
    { item: 'weathervane', chance: 0.015 },
    // Chain is money to a goblin. The blade that ends chains, more so.
    { item: 'chainbreaker', chance: 0.012 },
    // The camp stole a well-finder and dug where it pointed. They
    // found water. They remain furious about it.
    { item: 'dowser', chance: 0.012 },
  ]),
  {
    // THE WARBOSS PAYS LIKE A CHAMPION: the tusk trophy, the hoard
    // under the boss-court floor, and every worn piece really drops
    // (the loot-story law: the leather on its back lands here, the
    // gobmangler and the warboard ride the goblin_arms rack beside
    // this table).
    id: 'goblin_champion',
    desc: 'The warboss pays for the whole camp: its tusk, its stolen leather, and the hoard it bullied together.',
    rarityBonus: 3,
    entries: [
      { item: 'bones' },
      { item: 'warboss_tusk', chance: 0.9 },
      { item: 'coins', qty: [30, 80], chance: 0.7 },
      { item: 'crimson_essence', qty: [1, 3], chance: 0.35 },
      { item: 'brass_key', chance: 0.08 },
      { item: 'dungeon_key', chance: 0.04 },
      { item: 'leather_body', chance: 0.02 },
      // The camp crowns its boss in stolen briar-iron — the chase lot
      // the wardrobe rack teases lands heavier on the boss itself.
      ...setDrops('briarplate', 0.012, { colorway: 'bloodbriar' }),
    ],
  },
  {
    // THE GRAND ARCANUM: the first voice of the fire carries the
    // last word of the scripture. (Held to 0.002: a lvl 7 caster
    // guarding a lvl 45 legendary is the longest hunt on the road —
    // the troll law, run further.)
    id: 'firecaller_word',
    desc: 'What the firecaller keeps: the Flamewrought scripture, one line at a time.',
    entries: [...setDrops('flamewrought', 0.002)],
  },
  {
    // THE GRAND ARCANUM: the gloomcaller looked into the gloam and
    // came back wearing the answer badly. It fits you better.
    id: 'gloom_regalia',
    desc: 'The gloomcaller’s prize: the Gloamsight vestments, worn wrong.',
    entries: [...setDrops('gloamsight', 0.003)],
  },
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
    // A Waykeeper sergeant is short one sword, and the road is short
    // one lamp. The crews think it's funny. The road does not.
    { item: 'lamplight', chance: 0.012 },
    // Every second crew hand carries a key knife and swears by it.
    { item: 'latchkey', chance: 0.012 },
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
      // The company's arguing door — the crew that kicks doors for a
      // living loses one, occasionally, along with the argument.
      { item: 'lowhall_breacher', chance: 0.02 },
      // THE BLADED LONG-ARMS' talon: the Company's dismounting bill.
      // The reaver kept the crew's shares AND the crew's best argument.
      { item: 'crowsbeak', chance: 0.025 },
      { item: 'leather_hood', chance: 0.03 },
      ...setDrops('cutpurse', 0.012),
      // THE RED RIGHT HAND: the company's colors fly nowhere else.
      // The Red Company never sold its flagship — you take it off the
      // one rank the low roads permit to wear it.
      ...setDrops('cutpurse', 0.008, { colorway: 'redhand' }),
      // The crews burn what they rob. One of them walked out of a
      // burn wearing this, and the reaver took it off them.
      ...setDrops('cindershade', 0.01),
      // The crews broke the old border watch and stripped the dead.
      // The watch fire plate never stopped signaling; reavers who
      // wear it sleep badly and will not say why.
      ...setDrops('redmarch', 0.004),
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
      // A doorwarden stood in the crew's way once. The reaver kept
      // the blade and has been standing a little straighter since.
      { item: 'threshold', chance: 0.01 },
      // Off a shipmaster's cabin wall, rings and all. The reaver
      // cannot read it and will not admit it points somewhere.
      { item: 'meridian', chance: 0.008 },
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
      // Second prize in the same dream: the weather, pre-bottled.
      // Nobody in camp will pull the cork. Nobody will bury it.
      { item: 'stormjar', chance: 0.006 },
      // The one bow in camp nobody dares string. The spark between
      // the talons has opinions about goblins.
      { item: 'galespur', chance: 0.005 },
    ],
  },
  rack('thrower_wardrobe', 'Coast plunder and trampled-fen cloth.', 0.04, [
    ...setDrops('tidecaller', 0.02),
    // The maelstrom lot: the raiders row THROUGH the weather that
    // makes it, and some of them row back out wearing it.
    ...setDrops('tidecaller', 0.012, { colorway: 'maelstrom' }),
    ...setDrops('fenwalker', 0.014, { colorway: 'mirebloom' }),
    ...setDrops('briarplate', 0.009, { colorway: 'nightbriar' }),
  ]),
  rack('thrower_arms', 'Raider blades off the coast and the fens.', 0.045, [
    { item: 'gobsplitter', chance: 0.02 },
    { item: 'fenreaper', chance: 0.015 },
    { item: 'bogsting', chance: 0.018 },
    { item: 'scaler', chance: 0.015 },
    { item: 'redhand', chance: 0.012 },
    // Coast plunder off a wreck the raiders won't row back over.
    { item: 'reefwrack', chance: 0.012 },
    { item: 'undertow', chance: 0.008 },
    // The lure stave came up in a net. The netter traded it fast.
    { item: 'merelight', chance: 0.01 },
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
      // The shrine bell came down here with its keeper. It still
      // rings ahead of what the dark sends.
      { item: 'knellwood', chance: 0.004 },
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
      // THE ARMORY's loot-story: the issue halberd the watch fell on
      // duty with. The relief never came; the shift never ended.
      { item: 'watch_halberd', chance: 0.012 },
    ],
  },
  rack(
    'crypt_wardrobe',
    'What the crypt’s prowlers and its watch wore in. The Nightveil jerkin and Voidwhisper robe stay with the Champion.',
    0.05,
    [
      ...setDrops('nightveil', 0.025, { skip: ['jerkin'] }),
      // The veil's wing: the prowlers' own wall, fletched and gilded.
      { item: 'nightveil_pinion', chance: 0.02 },
      ...setDrops('voidwhisper', 0.02, { skip: ['robe'] }),
      ...setDrops('mothwing', 0.016, { colorway: 'dusk' }),
      ...setDrops('fenwalker', 0.012, { colorway: 'graymist' }),
      // The abyss lot: cut from water no sun has reached — the crypt
      // is the one dark deep enough to have kept it.
      ...setDrops('tidecaller', 0.01, { colorway: 'abyss' }),
      ...setDrops('dawnsworn', 0.012, { colorway: 'eclipse' }),
      ...setDrops('briarplate', 0.009, { colorway: 'bonebriar' }),
      ...setDrops('cutpurse', 0.012, { colorway: 'moonless' }),
      ...setDrops('emberfox', 0.01, { colorway: 'silverfox' }),
      ...setDrops('sentinel', 0.01),
      ...setDrops('sentinel', 0.008, { colorway: 'bloodwatch' }),
    ],
  ),
  {
    // THE GRAND ARCANUM: the chanter's own hoard. It stole the
    // morning service whole and has sung it wrong ever since; the
    // ivory and gold come off the bones one piece at a century.
    id: 'chanter_vestry',
    desc: 'The bone chanter’s stolen liturgy: the Sunhallow vestments, surrendered slowly.',
    entries: [...setDrops('sunhallow', 0.004)],
  },
  {
    // THE BARROW LOT: the nightveil re-dyed in dead-king bronze-green,
    // paid only by the lords of the deep crypt — the leather chase's
    // reintroduction rung. Source power stamps it at the lord's level,
    // so the old silhouette keeps climbing past its native band.
    id: 'barrow_regalia',
    desc: 'The old kings’ quiet colors: barrow-steeped veil leather, surrendered by the lords alone.',
    entries: [
      ...setDrops('nightveil', 0.03, { colorway: 'barrowdusk' }),
      // The gate off the deep crypt's own door, ram's skull and all —
      // a lord surrenders the way IN last of everything.
      { item: 'fellhorn_gate', chance: 0.05 },
    ],
  },
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
    // THE DRAWN BREATH's grave-goods: the spindle that was buried
    // full, the candle that outlasted its watchman, and a kerb slab
    // some robber hafted and did not live to keep.
    { item: 'heartspindle', chance: 0.008 },
    { item: 'candlewake', chance: 0.012 },
    { item: 'kerbstone', chance: 0.01 },
    // The dead keep their own calendar: a blade with a moon in it,
    // and the shrine knife that walked its light down here once.
    { item: 'hollowmoon', chance: 0.007 },
    { item: 'vesper', chance: 0.01 },
    // The bell stick tolls ahead of the dark's errands. The dark
    // keeps trying to bury it deeper.
    { item: 'knellwood', chance: 0.008 },
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
      // It was buried inside a kerb ring. One slab is missing, and
      // the Champion swings the grudge.
      { item: 'kerbstone', chance: 0.025 },
      { item: 'iron_bar', qty: [1, 2], chance: 0.4 },
      { item: 'gloomsilk_thread', qty: [2, 5], chance: 0.5 },
      // The dark he has stood in for a few centuries has gone thick.
      { item: 'umbral_essence', qty: [1, 3], chance: 0.4 },
      // THE BLADED LONG-ARMS' fang: the barrow's collection arm.
      // What the dead were owed, the Champion still collects.
      { item: 'tithe_hook', chance: 0.02 },
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
      // The sealed gallery is two doors from the Champion's vault.
      // On still nights the drill keeps time with the singing.
      { item: 'hollowchoir', chance: 0.005 },
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
      // THE DRAWN BREATH's trophies: the warbow nobody strung twice,
      // the doorwarden's blade off a door that lost, and the spindle
      // a champion carried point down like a torch.
      { item: 'oxbow', chance: 0.03 },
      { item: 'threshold', chance: 0.04 },
      { item: 'heartspindle', chance: 0.02 },
      { item: 'bloodmoon', chance: 0.025 },
      { item: 'nightwell', chance: 0.02 },
      { item: 'tempest_crown', chance: 0.02 },
      { item: 'worldsplinter', chance: 0.005 },
      // The Champion's own arm: the shield it grew, and the dreadforge
      // wall from the armory it was buried with.
      { item: 'bonespur_ward', chance: 0.035 },
      { item: 'dreadforge_thornwall', chance: 0.02 },
      // THE SHIELD WAVE's chase walls, racked with the rest of the
      // trophies: the veil's wing, the Brand's burning door, and the
      // gate-glass wall (whose true home is the riftgate cache).
      { item: 'nightveil_pinion', chance: 0.02 },
      { item: 'cindermaw_bulwark', chance: 0.015 },
      { item: 'gatefall_bulwark', chance: 0.01 },
      // THE ARMORY's chase pieces: the great school's owned steel,
      // and the two heirlooms that only exist legendary.
      { item: 'ashrender', chance: 0.04 },
      { item: 'frostfell', chance: 0.035 },
      { item: 'stormhewer', chance: 0.035 },
      { item: 'colossus_vow', chance: 0.005 },
      { item: 'mountains_end', chance: 0.005 },
      // THE ARMORY's knights among everyone who tried: the lance off
      // the last unhorsing, and the school's legendary-only dawn.
      { item: 'knights_lance', chance: 0.03 },
      { item: 'dawnlance', chance: 0.004 },
      // The gate pieces rack here too (their true home is the
      // riftgate cache, the gatefall_bulwark precedent): the warden's
      // halberd and the pike that fell pointing up.
      { item: 'gatewarden_halberd', chance: 0.012 },
      { item: 'heavens_reach', chance: 0.006 },
      // THE BLADED LONG-ARMS at the racks: the pilgrim way's double
      // answer, and the sky's own shear — legendary or not at all.
      { item: 'pilgrims_moon', chance: 0.008 },
      { item: 'skyshear', chance: 0.004 },
      // THE VAULT OF NAMES' legendary pair: the gate-glass blade and
      // the cracked bell, both legendary or not at all.
      { item: 'riftglass', chance: 0.004 },
      { item: 'last_bell', chance: 0.005 },
      // THE MASTERWORKS' high shelf: the duelist's lace, the carried
      // blade, the Line's trust, the needle, the black crescent, the
      // turned glass, and the sword the sky came down for.
      { item: 'silverlace', chance: 0.03 },
      { item: 'riven', chance: 0.012 },
      { item: 'silver_line', chance: 0.012 },
      { item: 'silverthread', chance: 0.03 },
      { item: 'eclipse', chance: 0.012 },
      { item: 'borrowed_time', chance: 0.004 },
      { item: 'northlight', chance: 0.008 },
      // The staff masterworks' shelf beside them: the coal orchard,
      // the sealed gallery's pipes, the storm gauge, and the stave
      // that keeps the Ring's count.
      { item: 'ashgarden', chance: 0.03 },
      { item: 'hollowchoir', chance: 0.025 },
      { item: 'spindrift', chance: 0.03 },
      { item: 'wakestone', chance: 0.004 },
      // The honor guard's lion plate, racked with everyone who tried
      // — the guard never sold a suit; the trophy walls collect.
      ...setDrops('kingsmane', 0.004),
      // The archmage tried too. The racks keep the vestment; the
      // glyph ring keeps turning over it, uncollected.
      ...setDrops('aetherion', 0.004),
      // The doorwarden went down the way and did not come back. The
      // racks keep the gatefall harness; the seam still tries.
      ...setDrops('gatefall', 0.004),
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
      // A traveller's water-finder, packed and never missed until
      // the third dry camp.
      { item: 'dowser', chance: 0.01 },
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
      // The glassworks' pipe went into the strongbox still warm.
      // The inventory clerk wrote "warm" and declined to elaborate.
      { item: 'glassgather', chance: 0.005 },
      // A navigator's stave, impounded over an unpaid berth. The
      // needle has been pointing at the harbormaster's house since.
      { item: 'meridian', chance: 0.005 },
      // Bottled weather, wax seal intact. Do not shake.
      { item: 'stormjar', chance: 0.004 },
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
      // A clockmaker's estate, settled: the wheel that lets time
      // through, and a lady's glass the appraisers refused to face.
      { item: 'escapement', chance: 0.005 },
      { item: 'mirrormere', chance: 0.005 },
      // The magister's own key to doors without hinges, banked with
      // everything else he trusted no apprentice to hold.
      { item: 'runekey', chance: 0.005 },
      // A collector paid a fortune for plate carved from fell bones,
      // then paid another to keep it somewhere with guards.
      ...setDrops('fellbone', 0.005),
      // The pale quench of the thorn forge, banked by an heir who
      // never liked how it watched the room.
      ...setDrops('palethorn', 0.004),
      // Beside it, the harp he taught to shoot. The vault log lists
      // it as an instrument. The guards list it as a reason to knock.
      { item: 'runespan', chance: 0.005 },
      // The morning service, folded right: the chanter sings the
      // stolen set wrong, and the vaults keep the one it was copied
      // from.
      ...setDrops('sunhallow', 0.005),
      // An heir sold the family oracle's vestments unworn. The clerk
      // who shelved them says the sigils finished reading him in
      // under a minute.
      ...setDrops('gloamsight', 0.004),
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
      // The vault holds the Line's own blade in trust, and one box
      // the clerks keep upside down and will not say why.
      { item: 'silver_line', w: 2 },
      { item: 'borrowed_time', w: 1 },
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
      // The forest banked three trades in one box: the hive that
      // stayed, the caps that glow, and the harvest that never ends.
      { item: 'swarmsong', chance: 0.006 },
      { item: 'duskcap', chance: 0.005 },
      { item: 'lastsheaf', chance: 0.005 },
      // A pack buried a champion under the moss with full honors.
      // The moss kept the honors.
      ...setDrops('jadeskull', 0.005),
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
      // THE DEEPENING's key, and the rarest ordinary thing in the game.
      { item: 'deepening_sigil', chance: 0.04 },
      // THE BLADED LONG-ARMS' cleaver: the Oldcrown armory pattern,
      // cached by whoever looted the armory first.
      { item: 'oldcrown_bardiche', chance: 0.015 },
      // The king under the hill banked with the house he built.
      ...setDrops('barrowking', 0.008),
      // A rook got here first, once. It left the feathers behind.
      ...setDrops('rookfeather', 0.01),
      // The champion's parade kit went into the hoard with the
      // champion. The oath-cloth still flies down there.
      ...setDrops('oathgold', 0.008),
      // The weather abdicated into this hoard. The crown floats an
      // honest inch over the coins and outranks all of them.
      { item: 'skythrone', chance: 0.008 },
      // The storm kept its anvil, though, and nailed it over a war
      // bow's tip. The hoard hears the hammering on bad nights.
      { item: 'thunderhead', chance: 0.008 },
      // THE ROAD GROWS SHORT, Phase 5: the night sabercat's harness —
      // the rarest ordinary thing in the game, flat rate FOREVER (the
      // flood-law: no pity, no dials; rare for everyone, every time).
      { item: 'night_sabercat', chance: 0.006 },
      // The hoard's weather corner: the gauge stave off the mere's
      // worst night, and the bough that argued with a fire and won.
      { item: 'spindrift', chance: 0.005 },
      { item: 'ashgarden', chance: 0.006 },
      // The border watch's last muster was ransomed piece by piece
      // into the deep hoards. The hearts still take their turns.
      ...setDrops('redmarch', 0.006),
      // The honor guard never sold a suit. The world only keeps what
      // it took, and it took it down here.
      ...setDrops('kingsmane', 0.004),
      // The fire's scripture went into the dark still lit. The hoard
      // reads a line of it every night and has never reached the end.
      ...setDrops('flamewrought', 0.005),
      // The archmage's vestment went below with its ring still
      // turning. The coins nearest it stack themselves.
      ...setDrops('aetherion', 0.004),
      // The doorwarden's harness came back up without the warden.
      // Nobody in the hoard's history has worn it twice.
      ...setDrops('gatefall', 0.004),
      // THE GILDED TYRANT: the wall the champion carried into the
      // dark, face out. The hoard kept the face. It is not sorry.
      { item: 'gilded_tyrant', chance: 0.01 },
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
      { item: 'deepening_sigil', chance: 0.03 },
      // Ground from a pane of this very gate.
      { item: 'riftglass', chance: 0.006 },
      // A wall with a pane of the gate set through it — the keeper's
      // own answer to what the keeper was keeping.
      { item: 'gatefall_bulwark', chance: 0.02 },
      // THE ARMORY at the gate: the warden's own halberd, and the
      // pike that fell pointing up — the cache keeps both watches.
      { item: 'gatewarden_halberd', chance: 0.015 },
      { item: 'heavens_reach', chance: 0.008 },
      // The sky's shear went below with the gate it was sheared over.
      { item: 'skyshear', chance: 0.006 },
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
      // A sword broke against the seal down here and came back
      // carried. The gatekeeper never asked what did the carrying.
      { item: 'riven', chance: 0.008 },
      // The gate's cousins: pipes that learned their song behind a
      // seal, and a stave chipped from beside the Ring itself.
      { item: 'hollowchoir', chance: 0.005 },
      { item: 'wakestone', chance: 0.006 },
      // A thorn company held the gate one whole winter. The winter
      // held longer.
      ...setDrops('rimethorn', 0.005),
      // The king's own lion plate went through the gate on a bier.
      // Nothing about that day is written anywhere official.
      ...setDrops('kingsmane', 0.004),
      // A singer walked into the gate mid-verse. The orbs waited by
      // the lock for three seasons, then gave up and went in after.
      ...setDrops('stormsinger', 0.005),
      // The last warden's kit, minus the hat the worgs argue over.
      // The gatekeeper holds the rest against the toll.
      ...setDrops('duskwarden', 0.004),
      // The ring of runes fits the gate's own lock a little too
      // well. Nobody has dared turn it.
      ...setDrops('aetherion', 0.004),
      // Forged from the first gate that fell. The gatekeeper says
      // the suit knocks, some nights, and it knocks from inside.
      ...setDrops('gatefall', 0.004),
    ],
  },

  // --------------------------------------------- THE SAND AND THE ROAR
  // The arena's purses (docs/arena-plan.md). THE CHEST IS THE PURSE:
  // arena foes pay no ground loot, so these four banded tables are the
  // sport's entire payout, priced against the fee and walked by the
  // same flood-law gate as every chest.
  {
    id: 'arena_purse_t1',
    desc: 'The small ring’s purse: coin over the stake, and a working fighter’s odds and ends.',
    rarityBonus: 2,
    entries: [
      { item: 'coins', qty: [40, 90] },
      { item: 'bread', qty: [1, 2], chance: 0.5 },
      { item: 'arcane_dust', qty: [1, 3], chance: 0.4 },
      { table: 'crypt_arms', mult: 6 },
      { item: 'brass_key', chance: 0.08 },
      { table: 'heirlooms' },
    ],
  },
  {
    id: 'arena_purse_t2',
    desc: 'The card above the warm-ups: real coin, and the crowd throws things worth keeping.',
    rarityBonus: 4,
    entries: [
      { item: 'coins', qty: [80, 160] },
      { item: 'arcane_dust', qty: [2, 4], chance: 0.6 },
      { item: 'crimson_essence', qty: [1, 2], chance: 0.3 },
      { table: 'crypt_arms', mult: 8 },
      { table: 'heirlooms', mult: 2 },
      { item: 'brass_key', chance: 0.1 },
    ],
  },
  {
    id: 'arena_purse_t3',
    desc: 'The Grand Ring’s standing purse: champion-grade steel has ended up in it before.',
    rarityBonus: 6,
    entries: [
      { item: 'coins', qty: [140, 260] },
      { item: 'arcane_dust', qty: [3, 6], chance: 0.7 },
      { item: 'crimson_essence', qty: [1, 3], chance: 0.4 },
      { item: 'radiant_essence', qty: [1, 2], chance: 0.25 },
      { table: 'champion_armory', mult: 2 },
      { table: 'heirlooms', mult: 2 },
    ],
  },
  {
    id: 'arena_purse_t4',
    desc: 'The headline purse: what a crowned name is worth to the house that booked it.',
    rarityBonus: 8,
    entries: [
      { item: 'coins', qty: [220, 420] },
      { item: 'arcane_dust', qty: [4, 8], chance: 0.8 },
      { item: 'crimson_essence', qty: [2, 4], chance: 0.45 },
      { item: 'radiant_essence', qty: [1, 3], chance: 0.3 },
      { item: 'astral_essence', qty: [1, 2], chance: 0.25 },
      { table: 'champion_armory', mult: 3 },
      { table: 'champion_capes' },
      { table: 'heirlooms', mult: 3 },
      { item: 'sigil_fallen_champion', chance: 0.1 },
      // The arena's OWN trophy — nowhere else in the world (the
      // exclusive law: some things only the sand pays).
      { item: 'sand_laurel', chance: 0.05 },
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
      // The dusk roads took the last warden at the ford. The packs
      // split the kit and could not agree on the hat. (Held to
      // 0.002: the war-hounds' per-kill ceiling carries the camp.)
      ...setDrops('duskwarden', 0.002),
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
      // The court's soldiers wore thorns quenched in the same deep
      // winter. The den floor keeps a muster of them under the frost.
      ...setDrops('rimethorn', 0.006),
      // The court's sword outlived the court. The matriarch sleeps
      // curled around it, and the den never quite thaws.
      { item: 'winterspire', chance: 0.008 },
    ],
  },
  {
    id: 'fey_wolf',
    desc: 'The court\'s hound pays in the court\'s coin: the glimmering pelt, and the estate\'s silver it never stopped wearing.',
    rarityBonus: 4,
    entries: [
      { item: 'bones' },
      { item: 'feywolf_pelt', chance: 0.9 },
      { item: 'wolf_fur', qty: [1, 2], chance: 0.5 },
      { item: 'coins', qty: [60, 140], chance: 0.8 },
      { item: 'crimson_essence', qty: [1, 3], chance: 0.35 },
      { item: 'bloomstone', chance: 0.06 },
      { item: 'brass_key', chance: 0.1 },
      { item: 'dungeon_key', chance: 0.06 },
      // The hound was the court's own — nothing "snagged in its fur";
      // it WEARS the estate, and pays the wardrobe best of any pack.
      ...setDrops('wintercourt', 0.02),
      // The Court's token: birch-silver and everfrost, conferred on
      // whoever the hound was GUARDING. It wasn't guarding you.
      { item: 'wintercourt_rime', chance: 0.03 },
      ...setDrops('rimethorn', 0.01),
      // The moon's own staff and the bow of night glass: the worgs
      // howl at these where the camps stole them. The hound carries
      // theirs by RIGHT, which is why its rates read like a will.
      { item: 'moonwell', chance: 0.015 },
      // THE ARMORY's court piece: the estate's crescent glaive, worn
      // the way the estate wears everything — by right.
      { item: 'moonglaive', chance: 0.012 },
      { item: 'moonglass', chance: 0.015 },
      { item: 'winterspire', chance: 0.012 },
    ],
  },
  // ------------------------------------------------------ the tufted shadows
  {
    id: 'lynx',
    desc: 'What the ambusher leaves: the spotted pelt, and its last quiet meal.',
    entries: [
      { item: 'bones' },
      { item: 'lynx_pelt', chance: 0.9 },
      // A cat caches its kills — sometimes you find the cache.
      { item: 'raw_chicken', chance: 0.2 },
      { item: 'scrap_hide', qty: [1, 2], chance: 0.3 },
      { item: 'crimson_essence', qty: [1, 2], chance: 0.12 },
      { item: 'verdant_essence', chance: 0.1 },
      { item: 'verdant_totem', chance: 0.02 },
      { item: 'bloomstone', chance: 0.01 },
    ],
  },
  {
    id: 'lynx_champion',
    desc: 'The duskruff pays like the champion she is: the great grey pelt, and every shining thing dragged back to the lair.',
    rarityBonus: 3,
    entries: [
      { item: 'bones' },
      { item: 'duskruff_pelt', chance: 0.9 },
      { item: 'lynx_pelt', qty: [1, 2], chance: 0.6 },
      // Cats keep what glitters. The lair floor pays out.
      { item: 'coins', qty: [30, 80], chance: 0.7 },
      { item: 'crimson_essence', qty: [1, 3], chance: 0.35 },
      { item: 'verdant_totem', chance: 0.1 },
      { item: 'bloomstone', chance: 0.04 },
      { item: 'brass_key', chance: 0.08 },
      { item: 'dungeon_key', chance: 0.04 },
      // What hunts at dusk collects at dusk: the moth-knife followed
      // the duskruff home the way the moths follow the dark.
      { item: 'mothlight', chance: 0.012 },
      // The old cat kills silver foxes on principle. The pelts pile
      // up in the lair, cured by nothing but patience.
      ...setDrops('emberfox', 0.006, { colorway: 'silverfox' }),
    ],
  },
  // ------------------------------------------------------- the red skulk
  {
    id: 'fox',
    desc: 'What the henhouse raider leaves: the flagged pelt, and somebody\'s missing chicken.',
    entries: [
      { item: 'bones' },
      { item: 'fox_pelt', chance: 0.9 },
      // Every fox is three fences from a coop it knows the way into.
      { item: 'raw_chicken', chance: 0.25 },
      { item: 'egg', chance: 0.15 },
      { item: 'scrap_hide', qty: [1, 2], chance: 0.3 },
      { item: 'crimson_essence', qty: [1, 2], chance: 0.12 },
      { item: 'verdant_essence', chance: 0.1 },
      { item: 'verdant_totem', chance: 0.02 },
      { item: 'bloomstone', chance: 0.01 },
    ],
  },
  {
    id: 'fox_champion',
    desc: 'The smokebrush vixen pays like the matriarch she is: the ember-dark pelt, and everything the skulk ever stole, buried where only she remembered.',
    rarityBonus: 3,
    entries: [
      { item: 'bones' },
      { item: 'smokebrush_pelt', chance: 0.9 },
      { item: 'fox_pelt', qty: [1, 2], chance: 0.6 },
      // A fox caches what it cannot carry. The matriarch cached for
      // nine winters.
      { item: 'coins', qty: [30, 80], chance: 0.7 },
      { item: 'crimson_essence', qty: [1, 3], chance: 0.35 },
      { item: 'verdant_totem', chance: 0.1 },
      { item: 'bloomstone', chance: 0.04 },
      { item: 'brass_key', chance: 0.08 },
      { item: 'dungeon_key', chance: 0.04 },
      // The set that carries her name comes home to her: the tanners
      // who cut the first emberfox jerkin cut it from her line.
      ...setDrops('emberfox', 0.006),
    ],
  },
  // ------------------------------------------------------ the parliament
  {
    id: 'great_owl',
    desc: 'What the glade hunter leaves: down by the fistful, the long silent plume, and whatever its last meal carried.',
    entries: [
      { item: 'bones' },
      { item: 'feather', qty: [3, 8], chance: 0.9 },
      { item: 'owl_plume', chance: 0.45 },
      { item: 'raw_chicken', chance: 0.2 },
      // Silent wings hold a little of the night sky's weather.
      { item: 'storm_essence', chance: 0.12 },
      { item: 'umbral_essence', chance: 0.08 },
      // ...and of the night sky itself. The parliament is astral's
      // mid-band seam: press recipe low (enchanting 5, recipes.ts),
      // owls here, boss chest and riftgate at the rich top end.
      { item: 'astral_essence', chance: 0.08 },
      // Owls swallow their prey whole — rings and all.
      { item: 'silver_ring', chance: 0.015 },
    ],
  },
  {
    id: 'elder_great_owl',
    desc: 'The elder pays like the champion it is: the moon-edged plume, and a crop full of everything the wood ever lost.',
    rarityBonus: 3,
    entries: [
      { item: 'bones' },
      { item: 'elder_plume', chance: 0.9 },
      { item: 'owl_plume', qty: [1, 3], chance: 0.5 },
      { item: 'feather', qty: [5, 12], chance: 0.7 },
      { item: 'storm_essence', qty: [1, 3], chance: 0.35 },
      { item: 'umbral_essence', qty: [1, 2], chance: 0.2 },
      // The elder has watched the sky the longest (astral's mid-band
      // champion line; the ladder is commented on the great_owl table).
      { item: 'astral_essence', qty: [1, 2], chance: 0.2 },
      // A century of swallowed glitter: the crop gives back the
      // wood's little fortunes.
      { item: 'silver_ring', chance: 0.06 },
      { item: 'gold_ring', chance: 0.03 },
      { item: 'brass_key', chance: 0.08 },
      { item: 'dungeon_key', chance: 0.04 },
      // The elder watched a lady carry a glass through the glade
      // once, and has been trying to catch the other sky since.
      { item: 'mirrormere', chance: 0.01 },
      // The pale thorn lot went south over the high passes and never
      // came down. The parliament nests above what is left of it.
      // (Named-station generosity: the elder pays gear like the
      // champion it is — the audit found it the poorest named purse.)
      ...setDrops('palethorn', 0.022),
      // The only thing over the pines that ever outflew the weather
      // it sings about. The elder took the singer's indigo the way
      // it takes everything: mid-verse.
      ...setDrops('stormsinger', 0.015),
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
    // What the herders dropped running: the flower knife they carry
    // against the wolves' own hills.
    { item: 'larkspur', chance: 0.012 },
    // Dusk hunts with the pack. So does what follows dusk around.
    { item: 'mothlight', chance: 0.007 },
  ]),

  // ------------------------------------------------------- gnoll warband
  {
    id: 'gnoll',
    desc: 'Scavenger pickings: the speckled hide, and whatever the warband dragged home last.',
    entries: [
      { item: 'bones' },
      { item: 'gnoll_hide', chance: 0.85 },
      { item: 'coins', qty: [5, 18], chance: 0.55 },
      { item: 'scrap_hide', qty: [1, 2], chance: 0.3 },
      // Scavengers keep what flies: pilfered fletching by the fistful.
      { item: 'arrow', qty: [6, 14], chance: 0.08 },
      { item: 'crimson_essence', chance: 0.12 },
      { item: 'arcane_dust', chance: 0.06 },
      { item: 'brass_key', chance: 0.03 },
      { item: 'dungeon_key', chance: 0.015 },
    ],
  },
  {
    id: 'gnoll_champion',
    desc: 'The packlord pays like the champion it is: the great mane, and the hoard it slept on.',
    rarityBonus: 3,
    entries: [
      { item: 'bones' },
      { item: 'packlord_mane', chance: 0.9 },
      { item: 'gnoll_hide', qty: [1, 2], chance: 0.5 },
      { item: 'coins', qty: [30, 80], chance: 0.7 },
      { item: 'crimson_essence', qty: [1, 3], chance: 0.35 },
      { item: 'brass_key', chance: 0.08 },
      { item: 'dungeon_key', chance: 0.04 },
      // The pack raided a harvest that would not stop being one.
      // The packlord slept on the sheaf and dreamed of bread.
      { item: 'lastsheaf', chance: 0.012 },
      // THE BLADED LONG-ARMS' scythe: a farmstead answered the raid
      // in the field's own iron, and the packlord kept the answer.
      { item: 'long_harvest', chance: 0.02 },
      // The packs crown their best in jade and a skull that watches
      // back. The packlord earned every piece twice.
      ...setDrops('jadeskull', 0.022),
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
      // The tide buried a duelist and kept the saber. The crabs have
      // been passing it around ever since.
      { item: 'saltfang', chance: 0.008 },
      // An angler's lure the size of a boathook. The crabs cannot
      // decide whether they worship it or resent it.
      { item: 'merelight', chance: 0.01 },
      // The dark-waters lot: dredged off the shelf where the light
      // gives up. The crabs brought it back; they will not go back.
      ...setDrops('tidecaller', 0.008, { colorway: 'darkwater' }),
    ],
  },
  {
    id: 'giant_crab',
    desc: 'The bank pays its toll in plate: storm-worn shell off the bulwark, and whatever the tide owed it.',
    entries: [
      { item: 'bones' },
      { item: 'crab_carapace', chance: 0.7 },
      // The great claw comes away whole about as often as it lets go.
      { item: 'crusher_claw', chance: 0.15 },
      { item: 'raw_trout', qty: [1, 2], chance: 0.5 },
      { item: 'coins', qty: [12, 40], chance: 0.4 },
      { item: 'frost_essence', chance: 0.12 },
    ],
  },
  // ---- THE STONE COURT (the basilisks).
  {
    id: 'fen_basilisk',
    desc: 'Marsh pickings: keeled hide off the lurker, and whatever the fen had already swallowed.',
    entries: [
      { item: 'bones' },
      { item: 'fen_basilisk_hide', chance: 0.6 },
      // A lurker's gullet is a fish ledger with one entry left.
      { item: 'raw_trout', chance: 0.35 },
      { item: 'coins', qty: [3, 12], chance: 0.4 },
      { item: 'verdant_essence', chance: 0.1 },
    ],
  },
  {
    id: 'basilisk',
    desc: 'The gaze line pays in horn: grey scutes off the stone court, and grit that used to be somebody\'s boots.',
    entries: [
      { item: 'bones' },
      { item: 'basilisk_scale', chance: 0.7 },
      { item: 'coins', qty: [10, 34], chance: 0.4 },
      { item: 'verdant_essence', chance: 0.12 },
    ],
  },
  {
    id: 'elder_basilisk',
    desc: 'The elder\'s estate: heavy scale in quantity, and — for the steady-handed — the eye itself, gone to agate.',
    entries: [
      { item: 'bones' },
      { item: 'basilisk_scale', qty: [1, 2], chance: 0.8 },
      // The collector's piece: half the elders keep it intact.
      { item: 'petrified_eye', chance: 0.5 },
      { item: 'coins', qty: [24, 70], chance: 0.5 },
      { item: 'verdant_essence', chance: 0.15 },
    ],
  },
  {
    id: 'skral',
    desc: 'Bank pickings: the day\'s catch off its belt, and the frill if the skinning goes well.',
    entries: [
      { item: 'bones' },
      // A skral IS a fisher — the catch on its belt is the least
      // surprising drop in the game.
      { item: 'raw_trout', qty: [1, 2], chance: 0.5 },
      { item: 'skral_frill', chance: 0.1 },
      { item: 'coins', qty: [3, 14], chance: 0.45 },
      { item: 'frost_essence', chance: 0.08 },
      { item: 'brass_key', chance: 0.02 },
      { item: 'dungeon_key', chance: 0.012 },
    ],
  },
  {
    id: 'skral_champion',
    desc: 'The deepking pays like a king of anywhere: the pearl off its throat, and the drowned things it hoarded.',
    rarityBonus: 3,
    entries: [
      { item: 'bones' },
      { item: 'deepking_pearl', chance: 0.9 },
      { item: 'skral_frill', qty: [1, 2], chance: 0.5 },
      { item: 'coins', qty: [25, 70], chance: 0.7 },
      { item: 'frost_essence', qty: [1, 3], chance: 0.35 },
      { item: 'brass_key', chance: 0.08 },
      { item: 'dungeon_key', chance: 0.04 },
      // The dark-waters wardrobe the crabs only pass around — the
      // deepking is the one who DIVES for it. Better odds at the
      // throne than in the shallows.
      ...setDrops('tidecaller', 0.02, { colorway: 'darkwater' }),
      // THE BLADED LONG-ARMS' fork: the deepking's own trident,
      // barbed to keep what it takes — surrendered only with the throne.
      { item: 'tidesplitter', chance: 0.012 },
    ],
  },

  // ------------------------- THE LEGION (docs/hobgoblin-plan.md): the
  // hobgoblins pay like the army they are — issued kit on the arms
  // rack (the loot-story law: the sword and shield you fought are the
  // sword and shield you loot), the queue-ring off every soldier's
  // braid, and the warlord's crest for whoever ends the campaign.
  {
    id: 'hobgoblin',
    desc: 'A soldier\'s pockets: pay in coin, the queue-ring off the braid, and the quartermaster\'s ledger settled the hard way.',
    entries: [
      { item: 'bones' },
      { item: 'legion_ring', chance: 0.1 },
      { item: 'coins', qty: [6, 20], chance: 0.55 },
      { item: 'crimson_essence', chance: 0.08 },
      { item: 'brass_key', chance: 0.03 },
      { item: 'dungeon_key', chance: 0.015 },
    ],
  },
  rack('hobgoblin_arms', 'The legion\'s issue: line steel, drilled boards, and the flame-speaker\'s staff.', 0.045, [
    { item: 'iron_sword', chance: 0.5 },
    { item: 'oak_kiteshield', chance: 0.3 },
    { item: 'shortbow', chance: 0.25 },
    { item: 'iron_greatblade', chance: 0.12 },
    { item: 'steel_sword', chance: 0.1 },
    { item: 'ember_staff', chance: 0.08 },
    // The wall-rank's issue: the drilled doorwall itself, off the
    // soldiers who anchor the line's free edge.
    { item: 'legion_doorwall', chance: 0.06 },
  ]),
  {
    id: 'hobgoblin_champion',
    desc: 'The warlord pays out the whole war chest: the crest off the galea, the rings of the fallen, and the campaign\'s take.',
    rarityBonus: 3,
    entries: [
      { item: 'bones' },
      { item: 'warlord_crest', chance: 0.9 },
      // The warlord's own guard carries the doorwall; the campaign
      // that ends here pays its best-drilled iron forward.
      { item: 'legion_doorwall', chance: 0.12 },
      { item: 'legion_ring', qty: [1, 2], chance: 0.5 },
      { item: 'coins', qty: [30, 85], chance: 0.7 },
      { item: 'crimson_essence', qty: [1, 3], chance: 0.35 },
      { item: 'brass_key', chance: 0.08 },
      { item: 'dungeon_key', chance: 0.04 },
      // THE BLADED LONG-ARMS' moon: the warlord's standard-cutter,
      // ember edge still banked from the last campaign.
      { item: 'bannereaver', chance: 0.012 },
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
    id: 'giant_slime',
    desc: 'A landmark of ooze digests a landmark of pocket change.',
    entries: [
      { item: 'coins', qty: [6, 20], chance: 0.7 },
      { item: 'verdant_essence', chance: 0.35 },
      { item: 'arcane_dust', chance: 0.2 },
      { item: 'vipersong', chance: 0.03 },
    ],
  },
  {
    id: 'gray_ooze',
    desc: 'What the acid pitted but could not finish.',
    entries: [
      { item: 'coins', qty: [4, 14], chance: 0.6 },
      { item: 'arcane_dust', chance: 0.2 },
    ],
  },
  {
    id: 'frost_slime',
    desc: 'The cold kept its keepsakes better than any vault.',
    entries: [
      { item: 'coins', qty: [6, 18], chance: 0.65 },
      { item: 'arcane_dust', chance: 0.3 },
      { item: 'verdant_essence', chance: 0.12 },
    ],
  },
  {
    // The debris you SEE suspended in the prism is this table, told
    // honestly — the cube is the corridor's lost-and-found.
    id: 'gelatinous_cube',
    desc: 'Everything the corridor ever swallowed, in one place.',
    entries: [
      { item: 'coins', qty: [15, 40], chance: 0.9 },
      { item: 'arcane_dust', chance: 0.3 },
      { item: 'verdant_essence', chance: 0.2 },
    ],
  },
  {
    id: 'tar_slime',
    desc: 'Steel it ate, coin it could not.',
    entries: [
      { item: 'coins', qty: [12, 30], chance: 0.8 },
      { item: 'arcane_dust', chance: 0.35 },
    ],
  },
  {
    // No wool here on purpose: the fleece answers only the shears
    // of a keeper — the yard registry is the only wool payer.
    id: 'sheep',
    desc: 'A hide and an apology.',
    entries: [{ item: 'bones' }, { item: 'scrap_hide', chance: 0.6 }],
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
    // THE OLD RAZORBACK pays like the terror it is: ivory off the
    // jaw, the forest floor's hoard out of its cheeks, and whatever
    // its last argument left snagged in the quills.
    id: 'dire_boar',
    desc: 'Aged ivory, a deep larder, and the wood\'s spoils in the bristles.',
    rarityBonus: 2,
    entries: [
      { item: 'bones' },
      { item: 'razorback_tusk', qty: [1, 2], chance: 0.8 },
      { item: 'raw_beef', qty: [1, 2], chance: 0.7 },
      { item: 'scrap_hide', qty: [2, 4], chance: 0.8 },
      // The digger's hoard: what the snout found stays in the cheeks.
      { item: 'truffle', chance: 0.2 },
      { item: 'coins', qty: [20, 55], chance: 0.5 },
      { item: 'crimson_essence', qty: [1, 2], chance: 0.25 },
      // It walks the bull's country and the hart's glades like its
      // little cousin — and wins far more often.
      ...setDrops('aurochs', 0.012),
      ...setDrops('hartsong', 0.012),
      // THE ARMORY's loot-story: the winged spear that promised to
      // stop it, still in the shoulder. It kept the receipt.
      { item: 'boar_spear', chance: 0.03 },
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
      // A hive stick went down a burrow after a swarm that had
      // better plans. The beetles have been babysitting since.
      { item: 'swarmsong', chance: 0.01 },
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
    id: 'giant_bat',
    desc: 'Sail leather by the wing and orchard-thief bones.',
    entries: [
      { item: 'bones' },
      // One wing is more hide than most whole animals carry.
      { item: 'scrap_hide', qty: [1, 2], chance: 0.55 },
      { item: 'crimson_essence', chance: 0.08 },
      { item: 'gloomsilk_thread', chance: 0.1 },
    ],
  },
  {
    id: 'dire_bat',
    desc: 'Ragged sail-leather and a skull that is mostly fangs.',
    entries: [
      { item: 'bones', qty: [1, 2] },
      { item: 'scrap_hide', qty: [1, 3], chance: 0.6 },
      // What it fed on, distilled. Do not ask what it fed on.
      { item: 'crimson_essence', chance: 0.16 },
      { item: 'umbral_essence', chance: 0.14 },
      { item: 'gloomsilk_thread', qty: [1, 2], chance: 0.14 },
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
      // Dusk grows in the web's shade too. The spiders farm it and
      // do not discuss with whom.
      { item: 'duskcap', chance: 0.008 },
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
      // A hafted seal-slab the troll respects as a fellow stone, and
      // the green-night sword it will not sleep near.
      { item: 'quarryheart', chance: 0.01 },
      { item: 'northlight', chance: 0.006 },
      // The troll planted the burning bough to see what would grow.
      // It grew exactly what it was: the troll is very proud.
      { item: 'ashgarden', chance: 0.006 },
      // The hills kept bigger bones than the troll's, and somebody
      // forged them. The troll wears what fits and hoards the rest.
      // (Held to 0.003: the troll's per-kill ceiling is nearly full.)
      ...setDrops('fellbone', 0.003),
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
  {
    id: 'giant_turtle',
    desc: 'The pond bank pays in armor: scutes off the keep, and whatever the last careless fish learned too late.',
    entries: [
      { item: 'bones' },
      { item: 'turtle_scute', chance: 0.7 },
      // A turtle fishes by waiting. It is very good at waiting.
      { item: 'raw_trout', qty: [1, 2], chance: 0.5 },
      { item: 'scrap_hide', qty: [1, 3], chance: 0.7 },
      { item: 'crimson_essence', chance: 0.1 },
    ],
  },
  {
    id: 'colossus_turtle',
    desc: 'Fell a hill and the hill settles its estate: plate, moss-buried keepsakes, and a century of other people\'s bad ideas.',
    rarityBonus: 3,
    entries: [
      { item: 'bones' },
      { item: 'colossus_plate', chance: 0.85 },
      { item: 'turtle_scute', qty: [1, 3], chance: 0.5 },
      // Climbers leave things on a hill that never noticed them, and
      // it kept every one where it lay.
      { item: 'coins', qty: [40, 100], chance: 0.5 },
      { item: 'crimson_essence', qty: [1, 3], chance: 0.15 },
      { item: 'brass_key', chance: 0.06 },
      { item: 'dungeon_key', chance: 0.03 },
    ],
  },

  // ------------------------------------------------------------------
  // THE EARTH STANDS UP (docs/golems-plan.md): the golem hoards. No
  // bones ever — a construct leaves masonry, not marrow. Each pays its
  // own heart, its build's signature piece, and the element it was.
  {
    id: 'rock_golem',
    desc: 'What a fallen cairn is: stones, and one that mattered.',
    entries: [
      { item: 'coins', qty: [15, 50], chance: 0.85 },
      { item: 'hillstone_heart', qty: [1, 2], chance: 0.6 },
      { item: 'golem_core', chance: 0.3 },
      { item: 'arcane_dust', qty: [1, 2], chance: 0.2 },
      // A hafted seal-slab. It stood among its own kind here.
      { item: 'quarryheart', chance: 0.012 },
    ],
  },
  {
    id: 'iron_golem',
    desc: 'Everything the lodestone gathered, let go at once.',
    entries: [
      { item: 'coins', qty: [25, 70], chance: 0.85 },
      { item: 'forgeplate_scrap', qty: [1, 2], chance: 0.6 },
      { item: 'iron_ore', qty: [1, 3], chance: 0.5 },
      { item: 'golem_core', chance: 0.35 },
      { item: 'coal', qty: [1, 2], chance: 0.3 },
      // The storm lives in forged joints, and sometimes it stays.
      { item: 'storm_essence', chance: 0.15 },
      // The lodestone gathered every stray iron thing for a century.
      // One piece of the pile was a knife the whole time, pointing.
      { item: 'lodestone', chance: 0.008 },
    ],
  },
  {
    id: 'fire_golem',
    desc: 'A banked furnace raked out at last.',
    entries: [
      { item: 'coins', qty: [30, 80], chance: 0.85 },
      { item: 'molten_slag', qty: [1, 2], chance: 0.6 },
      { item: 'golem_core', chance: 0.35 },
      { item: 'ember_essence', qty: [1, 2], chance: 0.35 },
      { item: 'coal', qty: [2, 4], chance: 0.4 },
      // The burning bough suits a body that never stopped burning.
      { item: 'ashgarden', chance: 0.008 },
      // The furnace door the body was BUILT around, seams still lit.
      { item: 'cindermaw_bulwark', chance: 0.012 },
    ],
  },
  {
    id: 'ice_golem',
    desc: 'Old winter, quarried where it fell.',
    entries: [
      { item: 'coins', qty: [30, 90], chance: 0.85 },
      { item: 'everfrost_shard', qty: [1, 2], chance: 0.6 },
      { item: 'golem_core', chance: 0.4 },
      { item: 'frost_essence', qty: [1, 2], chance: 0.35 },
      // The tower of ice answers to the winter that outlasted it.
      { item: 'winterspire', chance: 0.008 },
      { item: 'northlight', chance: 0.006 },
      // THE ARMORY's cold lance: the fell's icicle, quarried whole
      // with the winter that kept it.
      { item: 'fellwinter_lance', chance: 0.008 },
    ],
  },

  // ------------------------------------------------------------------
  // THE HILL COMES DOWN (docs/ogres-plan.md): the ogre sacks. A giant
  // carries everything it owns — coin it can't count, supper it was
  // saving, and hide nothing smaller could wear.
  {
    id: 'ogre',
    desc: 'The sack, spilled: junk coin, tomorrow\'s supper, and a tooth that mattered.',
    entries: [
      { item: 'coins', qty: [20, 60], chance: 0.85 },
      { item: 'ogre_tooth', chance: 0.35 },
      // The belt larder: an ogre never walks far from its next meal.
      { item: 'raw_beef', qty: [1, 2], chance: 0.4 },
      { item: 'leather', qty: [1, 2], chance: 0.35 },
      { item: 'scrap_hide', qty: [2, 4], chance: 0.4 },
      // The club it swung at you — the loot-story law, giant-sized.
      { item: 'ogre_greatclub', chance: 0.012 },
      // THE BLADED LONG-ARMS' cleaver: the hill sacked an Oldcrown
      // armory once, and the sack still remembers.
      { item: 'oldcrown_bardiche', chance: 0.01 },
    ],
  },
  {
    id: 'ogre_hurler',
    desc: 'The thrower\'s cart, tipped: what was ammunition and what was lunch.',
    entries: [
      { item: 'coins', qty: [25, 65], chance: 0.85 },
      { item: 'ogre_tooth', chance: 0.3 },
      { item: 'raw_beef', qty: [1, 2], chance: 0.35 },
      { item: 'leather', qty: [1, 2], chance: 0.35 },
    ],
  },
  {
    id: 'ogre_bellower',
    desc: 'The singer\'s effects: supper mostly, and the voice\'s worth in coin.',
    entries: [
      { item: 'coins', qty: [30, 70], chance: 0.85 },
      // The belt haunches — the bellower carries the camp's larder.
      { item: 'raw_beef', qty: [2, 3], chance: 0.6 },
      { item: 'ogre_tooth', chance: 0.3 },
      { item: 'arcane_dust', qty: [1, 2], chance: 0.15 },
    ],
  },
  {
    id: 'ogre_champion',
    desc: 'The Bonegrinder\'s estate: the girdle, the sack, and everything the camp owed it.',
    rarityBonus: 3,
    entries: [
      { item: 'coins', qty: [60, 140], chance: 0.9 },
      { item: 'bonegrinder_girdle', chance: 0.9 },
      { item: 'ogre_tooth', qty: [1, 2], chance: 0.5 },
      { item: 'raw_beef', qty: [2, 4], chance: 0.5 },
      { item: 'leather', qty: [2, 3], chance: 0.4 },
      // The Bonegrinder's own timber, better odds — the master keeps
      // the best argument in the camp.
      { item: 'ogre_greatclub', chance: 0.08 },
      // The camp's whole toll shelf, carried hot — the master skims
      // the best of everything the hill ever flattened.
      { table: 'ogre_arms', mult: 3 },
      // THE GILDED TYRANT: the one toll the hill never re-sold — a
      // gold door with a face, sized like a compliment to its owner.
      { item: 'gilded_tyrant', chance: 0.008 },
    ],
  },
  // THE HILL'S TOLL SHELF: everything the flattened travelers were
  // carrying — existing arms re-homed on the giant-kin (the reuse law:
  // a rack re-introduces the world's weapons, it never mints new ones).
  rack('ogre_arms', 'The toll shelf: arms the hill collected and never learned to hold.', 0.05, [
    { item: 'ogre_greatclub', chance: 0.05 },
    { item: 'quarryheart', chance: 0.02 },
    { item: 'bearspine', chance: 0.02 },
    { item: 'barrowmaw', chance: 0.015 },
  ]),
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
      if (e.item) {
        // THE ACQUISITION LAW AT THE DOOR: gear a table pays must be
        // drop-flagged — stampRoll refuses anything else at roll time
        // (loudly, and withholds the drop), so letting it into a table
        // just authors a drop that never lands. The seven-orphan bug
        // and the CMS live-edit lane both die here.
        const gear = ITEMS.get(e.item)?.gear;
        if (gear && !gear.acquisition.drop) {
          throw new Error(
            `loot table '${t.id}': gear '${e.item}' carries no drop acquisition — ` +
              `flag it (acquisition.drop) or keep it off drop tables`,
          );
        }
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
    // Value checks for the fields the resolver does math with — the
    // check-only+passthrough CMS door let a string nothingW NaN the
    // draw weights and an unknown power string silently behave as
    // 'source'. Typed at the door now.
    if (
      t.nothingW !== undefined &&
      (typeof t.nothingW !== 'number' || !Number.isFinite(t.nothingW) || t.nothingW < 0)
    ) {
      throw new Error(`loot table '${t.id}': nothingW must be a non-negative number`);
    }
    if (
      t.rarityBonus !== undefined &&
      (typeof t.rarityBonus !== 'number' || !Number.isFinite(t.rarityBonus))
    ) {
      throw new Error(`loot table '${t.id}': rarityBonus must be a finite number`);
    }
    if (t.power !== undefined && t.power !== 'source' && t.power !== 'native') {
      throw new Error(`loot table '${t.id}': power must be 'source' | 'native'`);
    }
    if (t.picks && (!Number.isInteger(t.picks[0]) || !Number.isInteger(t.picks[1]))) {
      throw new Error(`loot table '${t.id}': picks must be integers`);
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

/**
 * THE FLOOD LAW AT THE DOOR: the richest lawful station is the boss
 * purse — loot.test pins the full ladder ([3.2, 0.2] regular,
 * [4.5, 0.5] named, [8, 2.2] boss stacks/gear per kill), summed over
 * each foe's tables. The accept gate cannot know which station will
 * carry a candidate table, so it enforces the honest subset: no
 * SINGLE table may expect past the boss ceiling on its own, because
 * no station anywhere could lawfully carry it. CI's per-station sums
 * stay the fine gate; this is the coarse one, armed at CMS accept
 * instead of the next pipeline run.
 */
export const BOSS_YIELD_CEILING = { stacks: 8, gearStacks: 2.2 } as const;

/** validateLootTables, collecting instead of throwing — the CMS gate. */
export function lootTableErrors(tables: readonly LootTableDef[]): string[] {
  try {
    validateLootTables(tables);
  } catch (err) {
    return [(err as Error).message];
  }
  // Structure holds — now the flood law. Yield math needs the whole
  // candidate set resolvable (refs vetted above), never the live map:
  // the gate judges the world being proposed, not the one running.
  const byId = new Map(tables.map((t) => [t.id, t]));
  const errors: string[] = [];
  for (const t of tables) {
    const y = expectedYield(t.id, byId);
    if (y.stacks > BOSS_YIELD_CEILING.stacks) {
      errors.push(
        `loot table '${t.id}': expects ${y.stacks.toFixed(2)} stacks/roll — past the boss ` +
          `ceiling (${BOSS_YIELD_CEILING.stacks}); no station may lawfully carry it`,
      );
    }
    if (y.gearStacks > BOSS_YIELD_CEILING.gearStacks) {
      errors.push(
        `loot table '${t.id}': expects ${y.gearStacks.toFixed(3)} gear/roll — past the boss ` +
          `ceiling (${BOSS_YIELD_CEILING.gearStacks}); no station may lawfully carry it`,
      );
    }
  }
  return errors;
}
