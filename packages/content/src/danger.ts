import { dangerAt, type ChestKind, type DangerAnchor } from '@arx/shared';

/**
 * THE SETTLED ANCHORS + DANGER LAWS — content's half of the danger
 * field (shared/world/danger.ts owns the math).
 *
 * Anchors are the lights of civilization: inside safeR the world is
 * tier 0 — no POIs, no wild threats. Every town carries its WORD
 * (`country`) — the tier of its own hinterland — and the field is the
 * worded march over the lot (THE LADDER PAST THE LAMPS; the shared
 * header owns the law). The laws table is the ONE place a danger tier
 * turns into concrete numbers; every consumer (POI scaffold, garrison
 * levels, chest kinds, wild spawns) indexes this table rather than
 * hard-coding its own ladder — the DUNGEON_TIER_LAWS precedent,
 * walked out into the open world.
 */

export const SETTLED_ANCHORS: readonly DangerAnchor[] = [
  // Dawnmead — the awakening village, and the softest word in the
  // Dawnlands. Its safe radius covers the village, its worked meadows,
  // and the first stretch of the east lane toward Amberford; its word
  // keeps the whole first province a country of firsts — the basin
  // runs a full band-width in every direction before the land asks
  // anything of anyone.
  { x: -64, y: 48, safeR: 64, country: 1 },
  // Amberford — the crossroads market town (the master plan's second
  // hearth), a real journey east across the Amberfen. The corridor
  // between the two hearth-words bands 1 at the hems to 2-3 at its
  // deep middle — and the ROAD stays spawn-calm the whole way:
  // dangers stand BESIDE the road (the toll camp law), so the walk
  // has teeth without being a gauntlet.
  { x: 520, y: -4, safeR: 72, country: 2 },
  // Silverfall — the mountain capital: a haven (lamp + relief) AND a
  // worded town. The High Road approach climbs the march to the last
  // brazier; the Silverspine past the walls holds at the city's word.
  // The walk is the game; the walls are the reward.
  { x: -448, y: -280, safeR: 72, haven: true, country: 4 },
  // Saltmere — the town at the water's end. The Salt Road south stays
  // an earned walk, and beyond the mere the far shore begins the long
  // climb toward the southern rim — a frontier the town lights, not
  // one it tames.
  { x: 760, y: 330, safeR: 64, haven: true, country: 3 },
  // Pinewatch — the town that watches the deep wood. Its word bands
  // the muster country at 4 (levels 22-34): the first town the
  // Dawnlands ask a made adventurer to earn. North across the
  // Glasswater the march climbs past it and keeps climbing.
  { x: 1160, y: -356, safeR: 64, haven: true, country: 4 },
  // Hartfell — the town past the treeline. Its word holds the fells
  // at 5; past the folds the Barrowdeep march runs 6, 7, and on — the
  // town is a warm ring in the climb, not the top of it.
  { x: 1304, y: -616, safeR: 64, haven: true, country: 5 },
  // THE BLACKPINE — the first DREAD in the Dawnlands, and the reason
  // the Sparway is the bad way. The trail between Amberford and
  // Pinewatch is barely half the Timber Road's length and passes far
  // nearer both towns, so the band march alone would have made the
  // shortcut the SAFE road: exactly backwards. The wood answers for
  // itself instead. Two tiers inside the line, one on the rim, and
  // nothing at all inside anyone's walls (the dread never reaches
  // into a hearth). Nobody put this here; the wood was always like
  // this, and the Timber Road's whole existence is the argument.
  { x: 886, y: -108, safeR: 72, dread: 2 },
  // Kingsdelf — the town in the King's Delf. Its word is 6: the delf
  // country deals level-44s at the walls' relief and worse past it —
  // a level-50 town wrapped in level-50 land, with the furnace next
  // door. The Returning built INSIDE the far dark, and the map says
  // so now without needing the Brand to say it for them.
  { x: -480, y: 328, safeR: 64, haven: true, country: 6 },
  // THE BRAND — the burned mountain, the first dread-3 heart in the
  // Dawnlands. The heart adds its full dread to the marched field:
  // with the delf's word at 6 beside it, the burn reads 7 to 9 across
  // the heart — the hottest standing ground in the shipped world.
  // The Overband proper (tier 10) stays closed here by law: the Brand
  // stands in base-5 country, and the noise can never fake remoteness.
  // The reach (safeR + 48) clears Kingsdelf's north wall — the town
  // lives BESIDE the furnace, never in it. Nobody put this here
  // either; a star did.
  { x: -544, y: 144, safeR: 96, dread: 3 },
  // Evenfall — the city of the old folk, and the hottest word a town
  // speaks: 7. The Everwood is the wall, and the wall is the point —
  // level-55s under the outermost boughs, worse in the deep veil, and
  // the Heartwood march past the city runs 8 and 9 to the western
  // rim. The relief grades the last waystones so the gate can be
  // reached at all; everything before them must be EARNED. A town of
  // the old blood was never anyone's to walk to at level twenty.
  { x: -1032, y: -358, safeR: 64, haven: true, country: 7 },
];

/**
 * THE WORD BACKFILL — the authored word of every shipped anchor,
 * keyed by position and FROZEN at module load (before any live swap
 * can touch SETTLED_ANCHORS). A geography doc saved before anchors
 * learned to speak carries wordless towns; the validator backfills
 * each one from this map so a stale Studio save can never silence
 * Evenfall (the FRONTIER backfill law, walked over to the anchors).
 */
export const AUTHORED_ANCHOR_WORDS: ReadonlyMap<string, number> = new Map(
  SETTLED_ANCHORS.filter((a) => a.country !== undefined).map((a) => [
    `${a.x},${a.y}`,
    a.country as number,
  ]),
);

/**
 * Swap the settled anchors live (the geography live-registry law —
 * `replaceGeography` calls this; nothing else should). The array
 * identity is stable: consumers that captured the reference keep
 * reading the fresh truth.
 */
export function replaceSettledAnchors(anchors: readonly DangerAnchor[]): void {
  const live = SETTLED_ANCHORS as DangerAnchor[];
  live.length = 0;
  for (const a of anchors) live.push({ ...a });
}

export interface DangerLaw {
  /** Combat-level band for spawns scaled at this tier. */
  npcLevel: readonly [number, number];
  /** Chest kind a POI's strongbox upgrades to at this tier. */
  chest: ChestKind;
  /** Loot-table rarityBonus granted to tier-scaled sources. */
  rarityBonus: number;
  /** Chance a macro-cell at this tier hosts a POI at all. */
  poiChance: number;
  /** Ambient wilderness spawn density (phase 3; 0..1 scalar). */
  wildDensity: number;
  /**
   * THE SMALL FINDS (lived-in-land phase 2): per-SLOT chance a
   * 32-tile sub-lattice slot deals a minor find — 16 slots per cell,
   * so ~0.18 reads as roughly three finds per hostile-tier cell. The
   * texture layer's one density dial, living in the one law table
   * like every other density.
   */
  findChance: number;
  /**
   * THE WAR-GROUND (lived-in-land phase 4): chance a cell that rolled
   * a site PROMOTES to a compound hold instead — court, wings, chief,
   * the region's landmark. Zero below tier 3 by law: a war-ground is
   * deep-frontier furniture, and the region law (one hold per
   * neighborhood) caps it harder than the chance does.
   */
  holdChance: number;
}

export const DANGER_LAWS: readonly DangerLaw[] = [
  // 0 — settled: authored content only. The scaffold never rolls here.
  { npcLevel: [1, 4], chest: 'wood', rarityBonus: 0, poiChance: 0, wildDensity: 0, findChance: 0, holdChance: 0 },
  // 1 — the near frontier: a first camp just past the town fields.
  { npcLevel: [4, 9], chest: 'wood', rarityBonus: 0, poiChance: 0.3, wildDensity: 0.25, findChance: 0.14, holdChance: 0 },
  // 2 — the walk-out: worth packing food for.
  { npcLevel: [9, 16], chest: 'mossy', rarityBonus: 1, poiChance: 0.38, wildDensity: 0.35, findChance: 0.18, holdChance: 0 },
  // 3 — the expedition line: brass keys start mattering.
  { npcLevel: [15, 24], chest: 'iron', rarityBonus: 2, poiChance: 0.42, wildDensity: 0.45, findChance: 0.2, holdChance: 0.1 },
  // 4 — deep frontier: champions wear names out here.
  { npcLevel: [22, 34], chest: 'gilded', rarityBonus: 4, poiChance: 0.45, wildDensity: 0.5, findChance: 0.22, holdChance: 0.14 },
  // 5 — the far dark: the overworld's first dungeon-grade band.
  { npcLevel: [32, 48], chest: 'boss', rarityBonus: 6, poiChance: 0.5, wildDensity: 0.55, findChance: 0.22, holdChance: 0.18 },
  // 6 — the lampless dark: Kingsdelf's word, the ogres' floor, and
  // the first band no road promises to cross. Chest kind holds at
  // 'boss' from here up — the strongbox ladder's honest cap — and the
  // rarity bonus carries the difference.
  { npcLevel: [44, 60], chest: 'boss', rarityBonus: 8, poiChance: 0.5, wildDensity: 0.55, findChance: 0.2, holdChance: 0.18 },
  // 7 — the howling dark: Evenfall's word. The Everwood, the deep
  // fells, the land past every lamp but the old folk's.
  { npcLevel: [55, 72], chest: 'boss', rarityBonus: 10, poiChance: 0.5, wildDensity: 0.58, findChance: 0.2, holdChance: 0.2 },
  // 8 — the nameless waste: no town speaks for this land. The march
  // alone deals it, and the march does not stop dealing it.
  { npcLevel: [66, 84], chest: 'boss', rarityBonus: 12, poiChance: 0.5, wildDensity: 0.6, findChance: 0.2, holdChance: 0.2 },
  // 9 — the world's rim: the ladder's last honest rung, level-90s in
  // the open air. Everything out here outranks every crown in the
  // shipped towns; the reward table knows it.
  { npcLevel: [78, 95], chest: 'boss', rarityBonus: 14, poiChance: 0.5, wildDensity: 0.62, findChance: 0.2, holdChance: 0.22 },
  // 10 — THE OVERBAND: the sundered dark. Distance never deals this
  // row — only named country can: a dread-3 heart standing on ground
  // the march already saturates (shared/world/danger.ts owns the
  // law). No shipped heart qualifies yet; the row waits for the
  // world's rim to earn a name.
  { npcLevel: [88, 99], chest: 'boss', rarityBonus: 16, poiChance: 0.5, wildDensity: 0.62, findChance: 0.2, holdChance: 0.22 },
];

/** Danger tier at a world tile over the settled anchors. */
export function dangerTierAt(seed: number, tx: number, ty: number): number {
  return dangerAt(seed, tx, ty, SETTLED_ANCHORS);
}

/** The law row for a tier (clamped — a bad tier never crashes a roll). */
export function dangerLaw(tier: number): DangerLaw {
  return DANGER_LAWS[Math.max(0, Math.min(DANGER_LAWS.length - 1, tier))]!;
}
