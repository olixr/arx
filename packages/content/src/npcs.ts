import type { StatusApply, StatusId } from '@devcraft/shared';

/** Loot: each entry rolls independently; qty is [min, max]. */
export interface LootEntry {
  item: string;
  qty: [number, number];
  chance: number;
}

/** A telegraphed special attack, run through the ability interpreter. */
export interface NpcSpecial {
  /** AbilityDef id (content/abilities.ts). */
  ability: string;
  /** Minimum ticks between uses (the NPC also needs a target in range). */
  everyTicks: number;
}

/** Thrown/shot basic attack instead of a melee lunge. */
export interface NpcRanged {
  range: number;
  projectileSpeed: number;
}

export interface NpcDef {
  id: string;
  name: string;
  /** Displayed combat level. */
  level: number;
  maxHp: number;
  /** Max hit per attack. */
  damage: number;
  /** Attack reach in tiles. */
  attackRange: number;
  attackCooldownTicks: number;
  /** 0 = passive (never initiates). */
  aggroRange: number;
  /** Gives up beyond this distance from its spawn point. */
  leashRange: number;
  speed: number;
  /** Split across combat skills on kill. */
  xpReward: number;
  loot: LootEntry[];
  respawnSec: number;
  /** Rendering: body color + radius in tiles. */
  color: string;
  radius: number;
  /**
   * How far the visual body extends NORTH of the ground point in
   * world-y tiles (screen height ÷ camera pitch). Projectiles test a
   * feet→crown band, not a circle at the feet — a shot that visually
   * crosses the chest or head must connect. See npcHitHeight().
   */
  hitHeight?: number;
  /** Telegraphed special attack for higher-tier threats. */
  special?: NpcSpecial;
  /** Basic attacks are projectiles with this flight profile. */
  ranged?: NpcRanged;
  /** Status carried by this NPC's basic attacks (wolves make you bleed). */
  attackStatus?: StatusApply;
  /** Statuses this NPC shrugs off entirely. */
  resist?: readonly StatusId[];
  /** Statuses that hit this NPC twice as hard. */
  weak?: readonly StatusId[];
  /** Livestock: what interacting yields (milking), on a per-animal cooldown. */
  produce?: { item: string; cooldownSec: number; xp: number };
  /** Livestock: lays this item on the ground every minSec–maxSec while players are near. */
  lays?: { item: string; minSec: number; maxSec: number; xp: number };
}

const defs: NpcDef[] = [
  {
    id: 'chicken',
    name: 'Chicken',
    level: 1,
    maxHp: 3,
    damage: 0,
    attackRange: 0.8,
    attackCooldownTicks: 40,
    aggroRange: 0,
    leashRange: 6,
    speed: 2,
    xpReward: 12,
    loot: [
      { item: 'raw_chicken', qty: [1, 1], chance: 1 },
      { item: 'feather', qty: [3, 8], chance: 1 },
      { item: 'bones', qty: [1, 1], chance: 1 },
    ],
    respawnSec: 15,
    color: '#f4efe4',
    radius: 0.22,
    hitHeight: 0.7,
    lays: { item: 'egg', minSec: 180, maxSec: 300, xp: 4 },
  },
  {
    id: 'cow',
    name: 'Cow',
    level: 3,
    maxHp: 12,
    damage: 1,
    attackRange: 0.9,
    attackCooldownTicks: 50,
    aggroRange: 0,
    leashRange: 8,
    speed: 1.8,
    xpReward: 30,
    loot: [
      { item: 'raw_beef', qty: [1, 1], chance: 1 },
      { item: 'cowhide', qty: [1, 1], chance: 1 },
      { item: 'bones', qty: [1, 1], chance: 1 },
    ],
    respawnSec: 20,
    color: '#c9b8a8',
    radius: 0.34,
    hitHeight: 1.4,
    produce: { item: 'milk', cooldownSec: 180, xp: 8 },
  },
  {
    id: 'rat',
    name: 'Giant rat',
    level: 2,
    maxHp: 8,
    damage: 1,
    attackRange: 0.8,
    attackCooldownTicks: 40,
    aggroRange: 3,
    leashRange: 8,
    speed: 3.2,
    xpReward: 20,
    loot: [
      { item: 'bones', qty: [1, 1], chance: 1 },
      // Mothwing: dust-sage cloth chewed out of cellar wardrobes —
      // the rats keep what the moths started.
      { item: 'mothwing_cowl', qty: [1, 1], chance: 0.028 },
      { item: 'mothwing_robe', qty: [1, 1], chance: 0.02 },
      { item: 'mothwing_skirts', qty: [1, 1], chance: 0.024 },
      { item: 'mothwing_slippers', qty: [1, 1], chance: 0.028 },
      // Rustsedge fenwalker: dragged up from the drain-water reeds.
      { item: 'fenwalker_hood_rustsedge', qty: [1, 1], chance: 0.014 },
      { item: 'fenwalker_robe_rustsedge', qty: [1, 1], chance: 0.01 },
      { item: 'fenwalker_skirts_rustsedge', qty: [1, 1], chance: 0.012 },
      { item: 'fenwalker_slippers_rustsedge', qty: [1, 1], chance: 0.014 },
      // Alleyrat cutpurse: the gutters keep the guild's grey colors.
      { item: 'cutpurse_cowl_alleyrat', qty: [1, 1], chance: 0.014 },
      { item: 'cutpurse_jerkin_alleyrat', qty: [1, 1], chance: 0.01 },
      { item: 'cutpurse_leggings_alleyrat', qty: [1, 1], chance: 0.012 },
      { item: 'cutpurse_boots_alleyrat', qty: [1, 1], chance: 0.014 },
    ],
    respawnSec: 15,
    color: '#8a7a6a',
    radius: 0.26,
    hitHeight: 0.6,
  },
  {
    id: 'goblin',
    name: 'Goblin',
    level: 5,
    maxHp: 14,
    damage: 1,
    attackRange: 1.0,
    attackCooldownTicks: 50,
    aggroRange: 4,
    leashRange: 12,
    speed: 3.6,
    xpReward: 50,
    loot: [
      { item: 'bones', qty: [1, 1], chance: 1 },
      { item: 'coins', qty: [3, 18], chance: 0.8 },
      { item: 'bronze_sword', qty: [1, 1], chance: 0.08 },
      { item: 'arrow', qty: [4, 12], chance: 0.25 },
      { item: 'snare_kit', qty: [1, 1], chance: 0.04 },
      // Scavenged armor — the first rolled-gear drops a new fighter sees.
      { item: 'leather_body', qty: [1, 1], chance: 0.05 },
      { item: 'leather_chaps', qty: [1, 1], chance: 0.04 },
      // Ember mothwing: singed cloth snatched from around campfires.
      { item: 'mothwing_cowl_ember', qty: [1, 1], chance: 0.018 },
      { item: 'mothwing_robe_ember', qty: [1, 1], chance: 0.014 },
      { item: 'mothwing_skirts_ember', qty: [1, 1], chance: 0.016 },
      { item: 'mothwing_slippers_ember', qty: [1, 1], chance: 0.018 },
      // Fenwalker: the camps squat on drowned ground; the bog pays rent.
      { item: 'fenwalker_hood', qty: [1, 1], chance: 0.016 },
      { item: 'fenwalker_robe', qty: [1, 1], chance: 0.012 },
      { item: 'fenwalker_skirts', qty: [1, 1], chance: 0.014 },
      { item: 'fenwalker_slippers', qty: [1, 1], chance: 0.016 },
      // Cutpurse: the camps rob the road; one thief robbed it better
      // and slower, right up until the goblins found the coin device.
      { item: 'cutpurse_cowl', qty: [1, 1], chance: 0.016 },
      { item: 'cutpurse_jerkin', qty: [1, 1], chance: 0.012 },
      { item: 'cutpurse_leggings', qty: [1, 1], chance: 0.014 },
      { item: 'cutpurse_boots', qty: [1, 1], chance: 0.016 },
      // Bloodbriar: the warband hacked a briar-knight apart and kept
      // the rust-red pieces. The thorns kept a few goblins back.
      { item: 'briarplate_helm_bloodbriar', qty: [1, 1], chance: 0.01 },
      { item: 'briarplate_platebody_bloodbriar', qty: [1, 1], chance: 0.008 },
      { item: 'briarplate_greaves_bloodbriar', qty: [1, 1], chance: 0.009 },
      { item: 'briarplate_sabatons_bloodbriar', qty: [1, 1], chance: 0.01 },
    ],
    respawnSec: 25,
    color: '#5c8a3a',
    radius: 0.3,
    hitHeight: 2.0,
  },
  {
    id: 'goblin_thrower',
    name: 'Goblin thrower',
    level: 6,
    maxHp: 12,
    damage: 2,
    attackRange: 5.5,
    attackCooldownTicks: 56,
    aggroRange: 6,
    leashRange: 12,
    speed: 3.2,
    xpReward: 60,
    loot: [
      { item: 'bones', qty: [1, 1], chance: 1 },
      { item: 'coins', qty: [4, 20], chance: 0.8 },
      { item: 'arrow', qty: [6, 14], chance: 0.5 },
      { item: 'straw_decoy', qty: [1, 1], chance: 0.05 },
      // Throwers carry the warband's colors.
      { item: 'cape_banner', qty: [1, 1], chance: 0.06 },
      { item: 'apprentice_robe', qty: [1, 1], chance: 0.04 },
      // Tidecaller: looted off the coast the warband raids — the full
      // sea-cloth chase set travels with the throwers.
      { item: 'tidecaller_hood', qty: [1, 1], chance: 0.02 },
      { item: 'tidecaller_robe', qty: [1, 1], chance: 0.015 },
      { item: 'tidecaller_skirts', qty: [1, 1], chance: 0.018 },
      { item: 'tidecaller_slippers', qty: [1, 1], chance: 0.02 },
      // Mirebloom fenwalker: heather-dyed, picked off the flower fens
      // the throwers trample on the march.
      { item: 'fenwalker_hood_mirebloom', qty: [1, 1], chance: 0.014 },
      { item: 'fenwalker_robe_mirebloom', qty: [1, 1], chance: 0.01 },
      { item: 'fenwalker_skirts_mirebloom', qty: [1, 1], chance: 0.012 },
      { item: 'fenwalker_slippers_mirebloom', qty: [1, 1], chance: 0.014 },
      // Redhand cutpurse: oxblood leathers, caught once — by a rock.
      { item: 'cutpurse_cowl_redhand', qty: [1, 1], chance: 0.012 },
      { item: 'cutpurse_jerkin_redhand', qty: [1, 1], chance: 0.009 },
      { item: 'cutpurse_leggings_redhand', qty: [1, 1], chance: 0.01 },
      { item: 'cutpurse_boots_redhand', qty: [1, 1], chance: 0.012 },
      // Nightbriar: violet-black bramble plate, thrown at range and
      // dragged home. The hedge grows back; the throwers do not.
      { item: 'briarplate_helm_nightbriar', qty: [1, 1], chance: 0.009 },
      { item: 'briarplate_platebody_nightbriar', qty: [1, 1], chance: 0.007 },
      { item: 'briarplate_greaves_nightbriar', qty: [1, 1], chance: 0.008 },
      { item: 'briarplate_sabatons_nightbriar', qty: [1, 1], chance: 0.009 },
    ],
    respawnSec: 30,
    color: '#6a9a3a',
    radius: 0.28,
    hitHeight: 2.0,
    // Keeps its distance and lobs rocks — punishes standing still,
    // rewards closing the gap or trading at range.
    ranged: { range: 5.5, projectileSpeed: 9 },
  },
  {
    id: 'skeleton',
    name: 'Skeleton',
    level: 8,
    maxHp: 24,
    damage: 2,
    attackRange: 1.0,
    attackCooldownTicks: 42,
    aggroRange: 5,
    leashRange: 16,
    speed: 3.4,
    xpReward: 80,
    loot: [
      { item: 'bones', qty: [1, 2], chance: 1 },
      { item: 'coins', qty: [5, 25], chance: 0.7 },
      { item: 'iron_ore', qty: [1, 1], chance: 0.15 },
      { item: 'ember_charm', qty: [1, 1], chance: 0.03 },
      { item: 'cape_emberweave', qty: [1, 1], chance: 0.04 },
      { item: 'cape_midnight', qty: [1, 1], chance: 0.035 },
      // Old soldiers' iron, still serviceable.
      { item: 'iron_helm', qty: [1, 1], chance: 0.05 },
      { item: 'iron_greaves', qty: [1, 1], chance: 0.04 },
      { item: 'iron_sabatons', qty: [1, 1], chance: 0.04 },
      // Nightveil: whoever prowled this crypt before you left the
      // small pieces; the jerkin stayed with the Champion.
      { item: 'nightveil_cowl', qty: [1, 1], chance: 0.025 },
      { item: 'nightveil_leggings', qty: [1, 1], chance: 0.02 },
      { item: 'nightveil_boots', qty: [1, 1], chance: 0.025 },
      // Voidwhisper: the crypt's other prowler dressed in cloth.
      { item: 'voidwhisper_cowl', qty: [1, 1], chance: 0.02 },
      { item: 'voidwhisper_skirts', qty: [1, 1], chance: 0.018 },
      { item: 'voidwhisper_slippers', qty: [1, 1], chance: 0.02 },
      // Dusk mothwing: plum-grey wings folded at the crypt door.
      { item: 'mothwing_cowl_dusk', qty: [1, 1], chance: 0.016 },
      { item: 'mothwing_robe_dusk', qty: [1, 1], chance: 0.012 },
      { item: 'mothwing_skirts_dusk', qty: [1, 1], chance: 0.014 },
      { item: 'mothwing_slippers_dusk', qty: [1, 1], chance: 0.016 },
      // Graymist fenwalker: fog woven by hands that stopped needing it.
      { item: 'fenwalker_hood_graymist', qty: [1, 1], chance: 0.012 },
      { item: 'fenwalker_robe_graymist', qty: [1, 1], chance: 0.009 },
      { item: 'fenwalker_skirts_graymist', qty: [1, 1], chance: 0.01 },
      { item: 'fenwalker_slippers_graymist', qty: [1, 1], chance: 0.012 },
      // Eclipse dawnsworn: the sun, briefly borrowed — never returned.
      { item: 'dawnsworn_hood_eclipse', qty: [1, 1], chance: 0.012 },
      { item: 'dawnsworn_robe_eclipse', qty: [1, 1], chance: 0.009 },
      { item: 'dawnsworn_skirts_eclipse', qty: [1, 1], chance: 0.01 },
      { item: 'dawnsworn_slippers_eclipse', qty: [1, 1], chance: 0.012 },
      // Bonebriar: pale as winter deadfall — the crypt's own hedge,
      // thorned deeper than the living kind.
      { item: 'briarplate_helm_bonebriar', qty: [1, 1], chance: 0.009 },
      { item: 'briarplate_platebody_bonebriar', qty: [1, 1], chance: 0.007 },
      { item: 'briarplate_greaves_bonebriar', qty: [1, 1], chance: 0.008 },
      { item: 'briarplate_sabatons_bonebriar', qty: [1, 1], chance: 0.009 },
      // Moonless cutpurse: ink on ink — the job in the crypt was real.
      { item: 'cutpurse_cowl_moonless', qty: [1, 1], chance: 0.012 },
      { item: 'cutpurse_jerkin_moonless', qty: [1, 1], chance: 0.009 },
      { item: 'cutpurse_leggings_moonless', qty: [1, 1], chance: 0.01 },
      { item: 'cutpurse_boots_moonless', qty: [1, 1], chance: 0.012 },
      // Silverfox emberfox: frost-grey guard hairs, crypt-cold.
      { item: 'emberfox_hood_silverfox', qty: [1, 1], chance: 0.01 },
      { item: 'emberfox_jerkin_silverfox', qty: [1, 1], chance: 0.008 },
      { item: 'emberfox_leggings_silverfox', qty: [1, 1], chance: 0.009 },
      { item: 'emberfox_boots_silverfox', qty: [1, 1], chance: 0.01 },
      // Sentinel: the crypt watch's own issue — the old soldiers still
      // wear the gunmetal vigil plate they died standing in.
      { item: 'sentinel_greathelm', qty: [1, 1], chance: 0.01 },
      { item: 'sentinel_platebody', qty: [1, 1], chance: 0.008 },
      { item: 'sentinel_greaves', qty: [1, 1], chance: 0.009 },
      { item: 'sentinel_sabatons', qty: [1, 1], chance: 0.01 },
      // Bloodwatch sentinel: the watch that ended badly, still posted.
      { item: 'sentinel_greathelm_bloodwatch', qty: [1, 1], chance: 0.008 },
      { item: 'sentinel_platebody_bloodwatch', qty: [1, 1], chance: 0.006 },
      { item: 'sentinel_greaves_bloodwatch', qty: [1, 1], chance: 0.007 },
      { item: 'sentinel_sabatons_bloodwatch', qty: [1, 1], chance: 0.008 },
    ],
    respawnSec: 30,
    color: '#d8d4c8',
    radius: 0.3,
    hitHeight: 2.0,
    // Dry bones: nothing to bleed, everything to burn.
    resist: ['bleed'],
    weak: ['burn'],
  },
  {
    id: 'skeleton_champion',
    name: 'Skeleton Champion',
    level: 20,
    maxHp: 80,
    damage: 5,
    attackRange: 1.2,
    attackCooldownTicks: 40,
    aggroRange: 6,
    leashRange: 20,
    speed: 3.8,
    xpReward: 400,
    loot: [
      { item: 'bones', qty: [2, 4], chance: 1 },
      { item: 'coins', qty: [40, 120], chance: 1 },
      { item: 'iron_sword', qty: [1, 1], chance: 0.4 },
      { item: 'iron_bar', qty: [1, 2], chance: 0.5 },
      { item: 'storm_bell', qty: [1, 1], chance: 0.12 },
      { item: 'ember_staff', qty: [1, 1], chance: 0.1 },
      { item: 'willow_longbow', qty: [1, 1], chance: 0.1 },
      { item: 'sigil_fallen_champion', qty: [1, 1], chance: 0.25 },
      { item: 'tome_of_embers', qty: [1, 1], chance: 0.15 },
      // He wears it into battle; beat him and it's yours.
      { item: 'cape_champion', qty: [1, 1], chance: 0.2 },
      // The prestige wardrobe: rare colors worth the delve.
      { item: 'cape_storm', qty: [1, 1], chance: 0.1 },
      { item: 'cape_royal', qty: [1, 1], chance: 0.08 },
      { item: 'cape_celestial', qty: [1, 1], chance: 0.05 },
      { item: 'cape_phoenix', qty: [1, 1], chance: 0.04 },
      // Champion's plunder: the raider helm nobody crafts.
      { item: 'horned_raider_helm', qty: [1, 1], chance: 0.12 },
      { item: 'steel_greathelm', qty: [1, 1], chance: 0.06 },
      { item: 'iron_platebody', qty: [1, 1], chance: 0.15 },
      { item: 'emberweave_robe', qty: [1, 1], chance: 0.08 },
      // The heavy frostplate pieces the wolves never carry.
      { item: 'frostplate_platebody', qty: [1, 1], chance: 0.06 },
      { item: 'frostplate_greaves', qty: [1, 1], chance: 0.05 },
      // Dreadforge: the villain's own wardrobe, drop-only, the
      // aspirational chase that outlasts the fight itself.
      { item: 'dreadforge_helm', qty: [1, 1], chance: 0.04 },
      { item: 'dreadforge_platebody', qty: [1, 1], chance: 0.03 },
      { item: 'dreadforge_greaves', qty: [1, 1], chance: 0.035 },
      { item: 'dreadforge_sabatons', qty: [1, 1], chance: 0.035 },
      // The Nightveil jerkin: the crypt's quietest prize.
      { item: 'nightveil_jerkin', qty: [1, 1], chance: 0.05 },
      // The Voidwhisper robe: the eye that watched him fall.
      { item: 'voidwhisper_robe', qty: [1, 1], chance: 0.045 },
      // Shadowfox emberfox: the charcoal pelt that hunts the dark he
      // guards — the full set rides with the Champion.
      { item: 'emberfox_hood_shadowfox', qty: [1, 1], chance: 0.04 },
      { item: 'emberfox_jerkin_shadowfox', qty: [1, 1], chance: 0.03 },
      { item: 'emberfox_leggings_shadowfox', qty: [1, 1], chance: 0.035 },
      { item: 'emberfox_boots_shadowfox', qty: [1, 1], chance: 0.04 },
      // Daybreak and midnight sentinel: the first and last hours of
      // the vigil, kept by the one who outranks the watch itself.
      { item: 'sentinel_greathelm_daybreak', qty: [1, 1], chance: 0.035 },
      { item: 'sentinel_platebody_daybreak', qty: [1, 1], chance: 0.025 },
      { item: 'sentinel_greaves_daybreak', qty: [1, 1], chance: 0.03 },
      { item: 'sentinel_sabatons_daybreak', qty: [1, 1], chance: 0.035 },
      { item: 'sentinel_greathelm_midnight', qty: [1, 1], chance: 0.03 },
      { item: 'sentinel_platebody_midnight', qty: [1, 1], chance: 0.02 },
      { item: 'sentinel_greaves_midnight', qty: [1, 1], chance: 0.025 },
      { item: 'sentinel_sabatons_midnight', qty: [1, 1], chance: 0.03 },
    ],
    respawnSec: 90,
    color: '#e8e2d0',
    radius: 0.42,
    hitHeight: 2.6,
    resist: ['bleed'],
    weak: ['burn'],
    // The boss move: a telegraphed floor slam you dodge on reaction.
    special: { ability: 'ground_slam', everyTicks: 160 },
  },
  {
    id: 'wolf',
    name: 'Wolf',
    level: 12,
    maxHp: 36,
    damage: 4,
    attackRange: 1.0,
    attackCooldownTicks: 38,
    aggroRange: 6,
    leashRange: 14,
    speed: 4.6,
    xpReward: 110,
    loot: [
      { item: 'bones', qty: [1, 1], chance: 1 },
      { item: 'wolf_fur', qty: [1, 1], chance: 0.9 },
      { item: 'verdant_totem', qty: [1, 1], chance: 0.05 },
      // The drop-only chase piece: hunt the pack, wear the pack.
      { item: 'wolfhide_hood', qty: [1, 1], chance: 0.06 },
      { item: 'wanderer_boots', qty: [1, 1], chance: 0.05 },
      // Frostplate walks with the winter packs — small pieces here,
      // the body and greaves guarded by the Champion.
      { item: 'frostplate_helm', qty: [1, 1], chance: 0.03 },
      { item: 'frostplate_sabatons', qty: [1, 1], chance: 0.03 },
      // Wolfstalker: the full leather chase set. Hunt the pack long
      // enough and you start dressing like it.
      { item: 'wolfstalker_hood', qty: [1, 1], chance: 0.03 },
      { item: 'wolfstalker_jerkin', qty: [1, 1], chance: 0.02 },
      { item: 'wolfstalker_chaps', qty: [1, 1], chance: 0.025 },
      { item: 'wolfstalker_boots', qty: [1, 1], chance: 0.03 },
      // Luna mothwing: pale green dust that only settles by moonlight,
      // shaken loose wherever the night packs run.
      { item: 'mothwing_cowl_luna', qty: [1, 1], chance: 0.016 },
      { item: 'mothwing_robe_luna', qty: [1, 1], chance: 0.012 },
      { item: 'mothwing_skirts_luna', qty: [1, 1], chance: 0.014 },
      { item: 'mothwing_slippers_luna', qty: [1, 1], chance: 0.016 },
      // Emberfox: the pack catches the fox; you catch the pack. The
      // early road's showpiece leathers, russet with the cream tail.
      { item: 'emberfox_hood', qty: [1, 1], chance: 0.014 },
      { item: 'emberfox_jerkin', qty: [1, 1], chance: 0.01 },
      { item: 'emberfox_leggings', qty: [1, 1], chance: 0.012 },
      { item: 'emberfox_boots', qty: [1, 1], chance: 0.014 },
      // Dawnfox: pale gold at first light — the dawn patrol's prize.
      { item: 'emberfox_hood_dawnfox', qty: [1, 1], chance: 0.009 },
      { item: 'emberfox_jerkin_dawnfox', qty: [1, 1], chance: 0.007 },
      { item: 'emberfox_leggings_dawnfox', qty: [1, 1], chance: 0.008 },
      { item: 'emberfox_boots_dawnfox', qty: [1, 1], chance: 0.009 },
      // Briarplate: the woods grew armor once. The packs den where the
      // briar-knight fell, and pieces surface with the thaw.
      { item: 'briarplate_helm', qty: [1, 1], chance: 0.012 },
      { item: 'briarplate_platebody', qty: [1, 1], chance: 0.009 },
      { item: 'briarplate_greaves', qty: [1, 1], chance: 0.01 },
      { item: 'briarplate_sabatons', qty: [1, 1], chance: 0.012 },
    ],
    respawnSec: 35,
    color: '#6a6f7d',
    radius: 0.34,
    hitHeight: 1.0,
    // Wolf bites tear — running from a wolf keeps costing you.
    attackStatus: { status: 'bleed', power: 1, durationTicks: 60 },
  },
];

export const NPCS: ReadonlyMap<string, NpcDef> = new Map(defs.map((d) => [d.id, d]));

/**
 * World-y extent of the visual body above the ground point. Projectile
 * hit tests (and the client's stuck-arrow attach) measure against the
 * feet→crown band [y − hitHeight, y], never a bare circle at the feet —
 * otherwise shots that visually cross the chest or head sail through.
 */
export function npcHitHeight(def: NpcDef): number {
  return def.hitHeight ?? Math.max(0.6, def.radius * 3);
}

/**
 * Y-distance from `y` to the nearest lip of an NPC's feet→crown band.
 * Zero while inside the band; pairs with the x-gap for the hit test.
 */
export function bandDy(y: number, npcY: number, hitHeight: number): number {
  const dyRaw = npcY - y;
  return dyRaw < 0 ? -dyRaw : Math.max(0, dyRaw - hitHeight);
}

export function npcDef(id: string): NpcDef | undefined {
  return NPCS.get(id);
}

/** Fixed spawn points around the starter town. */
export interface SpawnPoint {
  npc: string;
  x: number;
  y: number;
  /** Wander/respawn scatter radius. */
  radius: number;
  count: number;
}

export const TOWN_SPAWNS: readonly SpawnPoint[] = [
  // The farm pen holds livestock.
  { npc: 'chicken', x: 20, y: 28, radius: 4, count: 3 },
  { npc: 'cow', x: 20, y: 30, radius: 4, count: 2 },
  // Rats skulk near the pond.
  { npc: 'rat', x: 86, y: 66, radius: 5, count: 3 },
  // Goblins camp south of town.
  { npc: 'goblin', x: 44, y: 110, radius: 8, count: 4 },
  { npc: 'goblin', x: 60, y: 116, radius: 8, count: 3 },
  { npc: 'goblin_thrower', x: 52, y: 113, radius: 8, count: 2 },
  // Wolves in the western woods.
  { npc: 'wolf', x: -18, y: 40, radius: 8, count: 2 },
  { npc: 'wolf', x: -24, y: 60, radius: 8, count: 2 },
];
