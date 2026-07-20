import type { ItemRoll } from '@devcraft/shared';
import { itemDef } from '../items.js';
import { rolledStats } from './roll.js';
import type { AffixStat } from './types.js';

/**
 * Instance naming: a rolled item introduces itself by what it DOES.
 * "Iron helm" is the mold; "Iron helm of Strength" is the one in your
 * hands. The suffix derives from the roll exactly like the stats do —
 * pure in (itemId, roll), never stored — so the name on a loot label,
 * the card, and a trade window can never disagree.
 *
 * The dominant affix (largest value; earlier roll order breaks ties)
 * names the piece. One epithet, never a word salad: an epic with three
 * affixes still reads "of the Forge" and lets the card tell the rest.
 */
export const AFFIX_EPITHETS: Record<AffixStat, string> = {
  vitality: 'of Vigor',
  melee: 'of Strength',
  defence: 'of the Bulwark',
  archery: 'of Swiftness',
  magic: 'of Sorcery',
  mining: 'of the Deep',
  woodcutting: 'of the Timberline',
  fishing: 'of the Tides',
  smithing: 'of the Forge',
  woodworking: 'of the Grain',
  leatherworking: 'of the Hide',
  tailoring: 'of the Needle',
  cooking: 'of the Hearth',
  construction: 'of the Mason',
  farming: 'of the Harvest',
  foraging: 'of the Wilds',
  herbalism: 'of the Grove',
  beastcraft: 'of the Wildheart',
  sneak: 'of Shadows',
  maxHp: 'of the Bear',
  regen: 'of Mending',
};

/** The dominant affix's epithet, or null for affixless/non-gear rolls. */
export function rollEpithet(itemId: string, roll?: ItemRoll): string | null {
  const rolled = rolledStats(itemId, roll);
  if (!rolled || rolled.affixes.length === 0) return null;
  let best = rolled.affixes[0]!;
  for (const a of rolled.affixes) if (a.value > best.value) best = a;
  return AFFIX_EPITHETS[best.stat];
}

/**
 * The display name for an item instance. Non-gear items and affixless
 * rolls keep the plain definition name.
 */
export function instanceName(itemId: string, roll?: ItemRoll): string {
  const base = itemDef(itemId)?.name ?? itemId;
  const epithet = rollEpithet(itemId, roll);
  return epithet ? `${base} ${epithet}` : base;
}
