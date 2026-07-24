import type { PoiDef } from './types.js';

/**
 * The shipped archetype roster — phase 1's three families. Prefab
 * spawns are the hand-placed core; garrison entries are the
 * tier-scaled muscle composed around them (holdfast inside, sentries
 * on the approach ring). Every level and chest kind resolves through
 * DANGER_LAWS at compose time — the defs themselves never name a
 * number a tier already owns.
 */
export const POI_DEFS: readonly PoiDef[] = [
  {
    id: 'goblin_warcamp',
    name: 'Goblin warcamp',
    tiers: [1, 3],
    weight: 3,
    prefabs: ['poi_goblin_camp_ring', 'poi_goblin_camp_pair'],
    garrison: [
      // The camp fills out as the frontier deepens.
      { npc: 'goblin', count: [1, 3], role: 'holdfast' },
      // Watchers posted on the townward approach — the tell.
      { npc: 'goblin', count: [1, 2], role: 'sentry' },
      // War-hounds prowl the deep-tier camps.
      { npc: 'worg', count: [1, 2], role: 'holdfast', minTier: 3 },
      // The war-chief wears a name where the land is worst.
      {
        npc: 'goblin',
        count: [1, 1],
        role: 'holdfast',
        minTier: 3,
        levelOffset: 5,
        name: 'Goblin War-chief',
      },
    ],
    chestTierBonus: 0,
  },
  {
    id: 'forest_ruin',
    name: 'Forgotten ruin',
    tiers: [2, 4],
    weight: 2,
    prefabs: ['poi_ruin_keep', 'poi_ruin_circle'],
    garrison: [
      { npc: 'skeleton', count: [1, 2], role: 'holdfast' },
      // The dead keep a wide watch.
      { npc: 'skeleton_archer', count: [1, 1], role: 'sentry', minTier: 3 },
      {
        npc: 'skeleton_champion',
        count: [1, 1],
        role: 'holdfast',
        minTier: 4,
        levelOffset: 3,
        name: 'Warden of the Stones',
      },
    ],
    // The chest IS the point of a ruin — one kind above the land's law.
    chestTierBonus: 1,
  },
  {
    id: 'wild_grove',
    name: 'Wild grove',
    tiers: [1, 4],
    weight: 2,
    prefabs: ['poi_grove_ore', 'poi_grove_yew'],
    garrison: [
      // The nodes are the loot; the guardians are the price.
      { npc: 'wolf', count: [1, 2], role: 'holdfast', minTier: 2 },
      { npc: 'worg', count: [1, 1], role: 'holdfast', minTier: 4 },
      { npc: 'bear', count: [1, 1], role: 'sentry', minTier: 3 },
    ],
  },
];
