import { dangerAt, type ChestKind, type DangerAnchor } from '@arx/shared';

/**
 * THE SETTLED ANCHORS + DANGER LAWS — content's half of the danger
 * field (shared/world/danger.ts owns the math).
 *
 * Anchors are the lights of civilization: inside safeR the world is
 * tier 0 — no POIs, no wild threats. The laws table is the ONE place a
 * danger tier turns into concrete numbers; every consumer (POI
 * scaffold, garrison levels, chest kinds, future wild spawns) indexes
 * this table rather than hard-coding its own ladder — the
 * DUNGEON_TIER_LAWS precedent, walked out into the open world.
 */

export const SETTLED_ANCHORS: readonly DangerAnchor[] = [
  // Dawnmead — the awakening village. Its safe radius covers the
  // village, its worked meadows, and the first stretch of the east
  // lane toward Amberford.
  { x: -64, y: 48, safeR: 64 },
  // Amberford — the crossroads market town (the master plan's second
  // hearth), a real journey east across the Amberfen now. The corridor
  // bands tier 1 at the hems up to tier 3 at its deep middle — but the
  // ROAD stays spawn-calm the whole way and the Fenside Crofts' lamp
  // breaks the journey at the waist: dangers stand BESIDE the road
  // (the toll camp law), so the walk has teeth without being a
  // gauntlet. The northwest march toward Silverfall stays deep.
  { x: 352, y: 24, safeR: 72 },
  // Silverfall — the mountain capital, and a HAVEN, not a hearth
  // (the haven law): its lamp keeps the terraces tier 0 and relieves
  // a graded rim, but it never joins the band march — the High Road
  // approach stays tier 4-5 to the last brazier, exactly as the
  // master plan demands. The walk is the game; the walls are the
  // reward.
  { x: -288, y: -160, safeR: 72, haven: true },
  // Saltmere — the town at the water's end, and the second HAVEN:
  // its lamp keeps the quay and the pans tier 0, but the Salt Road
  // south stays an earned walk — tier 2 past the halfway lamp, tier 3
  // for the last league to the gate. Beyond the mere the far shore
  // runs tier 4-5: the deep south is a frontier the town lights, not
  // one it tames.
  { x: 356, y: 292, safeR: 64, haven: true },
  // Pinewatch — the town that watches the deep wood, and the third
  // HAVEN. Its lamp keeps the muster yard and the boom tier 0, and
  // its country bands tier 4 (levels 22-34) all the way round: the
  // first town the Dawnlands ask a made adventurer to earn. North
  // across the Glasswater and east past the Wardline the field goes
  // to 5 and stays there — the old wood is watched, never held.
  { x: 584, y: -136, safeR: 64, haven: true },
  // Hartfell — the town past the treeline, and the fourth HAVEN. Its
  // lamp keeps the Kettle and the folds tier 0, and the relief grades
  // the walk-out: tier 3 at the walls, 4 a stone's throw on, 5 past
  // that — because the base band this far north-east is 5 everywhere,
  // and the town is a warm ring in it, not a hole through it. No
  // dread stands on the Barrowfell for the same reason a candle isn't
  // lit at noon: the field is already at its ceiling up there.
  { x: 848, y: -392, safeR: 64, haven: true },
  // THE BLACKPINE — the first DREAD in the Dawnlands, and the reason
  // the Sparway is the bad way. The trail between Amberford and
  // Pinewatch is barely half the Timber Road's length and passes far
  // nearer both towns, so the band march alone would have made the
  // shortcut the SAFE road: exactly backwards. The wood answers for
  // itself instead. Two tiers inside the line, one on the rim, and
  // nothing at all inside anyone's walls (the dread never reaches
  // into a hearth). Nobody put this here; the wood was always like
  // this, and the Timber Road's whole existence is the argument.
  { x: 440, y: -96, safeR: 88, dread: 2 },
];

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
  // 5 — the far dark: the overworld's dungeon-grade band.
  { npcLevel: [32, 48], chest: 'boss', rarityBonus: 6, poiChance: 0.5, wildDensity: 0.55, findChance: 0.22, holdChance: 0.18 },
  // 6 — THE OVERBAND: the lampless dark. Distance never deals this
  // row — only named country does: a dread-3 heart standing in ground
  // the march already saturates (shared/world/danger.ts owns the law;
  // the first such heart is the Brand, the Kingsdelf epic). Chest kind
  // holds at 'boss' — the strongbox ladder's honest cap — and the
  // rarity bonus carries the difference.
  { npcLevel: [44, 60], chest: 'boss', rarityBonus: 8, poiChance: 0.5, wildDensity: 0.55, findChance: 0.2, holdChance: 0.18 },
];

/** Danger tier at a world tile over the settled anchors. */
export function dangerTierAt(seed: number, tx: number, ty: number): number {
  return dangerAt(seed, tx, ty, SETTLED_ANCHORS);
}

/** The law row for a tier (clamped — a bad tier never crashes a roll). */
export function dangerLaw(tier: number): DangerLaw {
  return DANGER_LAWS[Math.max(0, Math.min(DANGER_LAWS.length - 1, tier))]!;
}
