import { compileEquipment } from './compile.js';
import type { AffixPoolEntry, EquipmentDef } from './types.js';

/**
 * The starter equipment roster — enough pieces per slot and class to
 * verify the whole system end-to-end (rolls, requirements, class mods,
 * crafting bias, drop-only chases). The big 20-per-slot content pass
 * authors more of THESE records; defs are JSON-safe and round-trip
 * through equipment/serialize.ts.
 */

// Class-flavored affix pools. Local shorthand only — a JSON authoring
// tool would inline these; the serialized form always carries the pool.
const CLOTH_POOL: AffixPoolEntry[] = [
  { stat: 'magic', w: 3 },
  { stat: 'vitality' },
  { stat: 'herbalism' },
  { stat: 'regen' },
];
const LEATHER_POOL: AffixPoolEntry[] = [
  { stat: 'archery', w: 3 },
  { stat: 'sneak' },
  { stat: 'foraging' },
  { stat: 'maxHp' },
];
const PLATE_POOL: AffixPoolEntry[] = [
  { stat: 'melee', w: 2 },
  { stat: 'defence', w: 2 },
  { stat: 'vitality' },
  { stat: 'maxHp' },
];

export const EQUIPMENT_DEFS: EquipmentDef[] = [
  // ------------------------------------------------ body
  {
    id: 'apprentice_robe',
    name: 'Apprentice robe',
    slot: 'body',
    armorClass: 'cloth',
    levelReq: { skill: 'magic', level: 4 },
    armor: 2,
    affixPool: CLOTH_POOL,
    acquisition: { craft: true, drop: true },
    recipe: {
      skill: 'crafting',
      levelReq: 6,
      xp: 55,
      station: 'workbench',
      ticks: 50,
      inputs: [
        { item: 'cloth', qty: 2 },
        { item: 'twine', qty: 1 },
      ],
    },
    value: 60,
    color: '#5a6ea0',
    code: 'Ar',
    desc: 'Hems inked with first-year glyphs, most spelled correctly.',
  },
  {
    id: 'emberweave_robe',
    name: 'Emberweave robe',
    slot: 'body',
    armorClass: 'cloth',
    levelReq: { skill: 'magic', level: 24 },
    armor: 3,
    affixPool: [...CLOTH_POOL, { stat: 'cooking' }],
    acquisition: { craft: true, drop: true },
    recipe: {
      skill: 'crafting',
      levelReq: 30,
      xp: 240,
      station: 'workbench',
      ticks: 90,
      inputs: [
        { item: 'cloth', qty: 3 },
        { item: 'wolf_fur', qty: 2 },
        { item: 'gold_bar', qty: 1 },
      ],
    },
    value: 420,
    color: '#c4553d',
    code: 'Er',
    desc: 'Warm as a hearth and twice as opinionated.',
  },
  {
    id: 'leather_body',
    name: 'Leather body',
    slot: 'body',
    armorClass: 'leather',
    levelReq: { skill: 'defence', level: 5 },
    armor: 4,
    affixPool: LEATHER_POOL,
    acquisition: { craft: true, drop: true },
    recipe: {
      skill: 'crafting',
      levelReq: 8,
      xp: 75,
      station: 'workbench',
      ticks: 60,
      inputs: [{ item: 'leather', qty: 3 }],
    },
    value: 40,
    color: '#b08a5c',
    code: 'LB',
    desc: "Boiled leather that turns a blade's first bite.",
  },
  {
    id: 'huntsman_jerkin',
    name: "Huntsman's jerkin",
    slot: 'body',
    armorClass: 'leather',
    levelReq: { skill: 'defence', level: 12 },
    armor: 5,
    affixPool: [...LEATHER_POOL, { stat: 'woodcutting' }],
    acquisition: { craft: true },
    recipe: {
      skill: 'crafting',
      levelReq: 16,
      xp: 130,
      station: 'workbench',
      ticks: 70,
      inputs: [
        { item: 'leather', qty: 3 },
        { item: 'wolf_fur', qty: 1 },
      ],
    },
    value: 260,
    color: '#3f6b3a',
    code: 'Hj',
    desc: 'Studded green leather that moves quiet and takes a hit.',
  },
  {
    id: 'iron_platebody',
    name: 'Iron platebody',
    slot: 'body',
    armorClass: 'plate',
    levelReq: { skill: 'defence', level: 10 },
    armor: 6,
    affixPool: PLATE_POOL,
    acquisition: { craft: true, drop: true },
    recipe: {
      skill: 'smithing',
      levelReq: 20,
      xp: 180,
      station: 'anvil',
      ticks: 80,
      inputs: [{ item: 'iron_bar', qty: 3 }],
    },
    value: 300,
    color: '#8d9299',
    code: 'Ip',
    desc: 'A chest of honest iron. Arrows write it angry letters.',
  },
  {
    id: 'steel_platebody',
    name: 'Steel platebody',
    slot: 'body',
    armorClass: 'plate',
    levelReq: { skill: 'defence', level: 30 },
    armor: 9,
    affixPool: [...PLATE_POOL, { stat: 'smithing' }],
    acquisition: { craft: true },
    recipe: {
      skill: 'smithing',
      levelReq: 34,
      xp: 300,
      station: 'anvil',
      ticks: 95,
      inputs: [{ item: 'steel_bar', qty: 3 }],
    },
    value: 700,
    color: '#b8bec8',
    code: 'Sp',
    desc: 'Anvil-song in full chorus, gold-chased at the collar.',
  },

  // ------------------------------------------------ head
  {
    id: 'flower_crown',
    name: 'Flower crown',
    slot: 'head',
    armorClass: 'cloth',
    armor: 0,
    affixPool: [{ stat: 'farming', w: 2 }, { stat: 'foraging' }, { stat: 'herbalism' }],
    acquisition: { craft: true },
    recipe: {
      skill: 'crafting',
      levelReq: 5,
      xp: 35,
      station: 'workbench',
      ticks: 40,
      inputs: [
        { item: 'sunflower', qty: 3 },
        { item: 'twine', qty: 1 },
      ],
    },
    value: 35,
    color: '#e8c04c',
    code: 'Fc',
    desc: 'Sunflowers woven with twine. Armor value: joy.',
  },
  {
    id: 'iron_helm',
    name: 'Iron helm',
    slot: 'head',
    armorClass: 'plate',
    levelReq: { skill: 'defence', level: 8 },
    armor: 3,
    affixPool: PLATE_POOL,
    acquisition: { craft: true, drop: true },
    recipe: {
      skill: 'smithing',
      levelReq: 12,
      xp: 100,
      station: 'anvil',
      ticks: 60,
      inputs: [{ item: 'iron_bar', qty: 2 }],
    },
    value: 120,
    color: '#8d9299',
    code: 'Ih',
    desc: 'A dented dome that has already saved one skull. Yours next.',
  },
  {
    id: 'leather_hood',
    name: 'Leather hood',
    slot: 'head',
    armorClass: 'leather',
    levelReq: { skill: 'defence', level: 5 },
    armor: 2,
    affixPool: LEATHER_POOL,
    acquisition: { craft: true },
    recipe: {
      skill: 'crafting',
      levelReq: 6,
      xp: 50,
      station: 'workbench',
      ticks: 45,
      inputs: [{ item: 'leather', qty: 2 }],
    },
    value: 90,
    color: '#8a6a45',
    code: 'Lh',
    desc: 'Keeps the rain off and your face out of the story.',
  },
  {
    id: 'wolfhide_hood',
    name: 'Wolfhide hood',
    slot: 'head',
    armorClass: 'leather',
    levelReq: { skill: 'archery', level: 15 },
    armor: 3,
    affixPool: [{ stat: 'archery', w: 3 }, { stat: 'sneak', w: 2 }, { stat: 'maxHp' }],
    acquisition: { drop: true },
    value: 320,
    color: '#6a6f7d',
    code: 'Wh',
    desc: 'The pack still hunts — you just walk at the front now.',
  },
  {
    id: 'wizards_hat',
    name: "Wizard's hat",
    slot: 'head',
    armorClass: 'cloth',
    levelReq: { skill: 'magic', level: 12 },
    armor: 1,
    affixPool: [{ stat: 'magic', w: 3 }, { stat: 'herbalism' }, { stat: 'vitality' }, { stat: 'regen' }],
    acquisition: { craft: true },
    recipe: {
      skill: 'crafting',
      levelReq: 14,
      xp: 110,
      station: 'workbench',
      ticks: 60,
      inputs: [
        { item: 'cloth', qty: 2 },
        { item: 'moonbell', qty: 1 },
      ],
    },
    value: 210,
    color: '#4a5a9c',
    code: 'Wz',
    desc: 'Tall, folded, and slightly smug. The point is the point.',
  },
  {
    id: 'runecloth_cowl',
    name: 'Runecloth cowl',
    slot: 'head',
    armorClass: 'cloth',
    levelReq: { skill: 'magic', level: 20 },
    armor: 2,
    affixPool: [{ stat: 'magic', w: 3 }, { stat: 'herbalism' }, { stat: 'regen' }],
    acquisition: { craft: true },
    recipe: {
      skill: 'crafting',
      levelReq: 22,
      xp: 190,
      station: 'workbench',
      ticks: 80,
      inputs: [
        { item: 'cloth', qty: 3 },
        { item: 'moonbell', qty: 2 },
      ],
    },
    value: 380,
    color: '#7a5ac4',
    code: 'Rc',
    desc: 'Only a master weaver can set runes in thread. Prove it.',
  },
  {
    id: 'steel_greathelm',
    name: 'Steel greathelm',
    slot: 'head',
    armorClass: 'plate',
    levelReq: { skill: 'defence', level: 32 },
    armor: 5,
    affixPool: [...PLATE_POOL, { stat: 'mining' }],
    acquisition: { craft: true, drop: true },
    recipe: {
      skill: 'smithing',
      levelReq: 36,
      xp: 280,
      station: 'anvil',
      ticks: 90,
      inputs: [
        { item: 'steel_bar', qty: 2 },
        { item: 'iron_bar', qty: 1 },
      ],
    },
    value: 520,
    color: '#b8bec8',
    code: 'Gh',
    desc: 'The world through a slit: smaller, simpler, survivable.',
  },
  {
    id: 'horned_raider_helm',
    name: 'Horned raider helm',
    slot: 'head',
    armorClass: 'plate',
    levelReq: { skill: 'defence', level: 18 },
    armor: 4,
    affixPool: [{ stat: 'melee', w: 3 }, { stat: 'vitality' }, { stat: 'maxHp' }],
    acquisition: { drop: true },
    value: 340,
    color: '#7d6a52',
    code: 'Rh',
    desc: 'Impractical, intimidating, and absolutely worth it.',
  },

  // ------------------------------------------------ legs
  {
    id: 'woven_trousers',
    name: 'Woven trousers',
    slot: 'legs',
    armorClass: 'cloth',
    armor: 1,
    affixPool: CLOTH_POOL,
    acquisition: { craft: true, shop: true },
    recipe: {
      skill: 'crafting',
      levelReq: 3,
      xp: 30,
      station: 'workbench',
      ticks: 40,
      inputs: [
        { item: 'cloth', qty: 1 },
        { item: 'twine', qty: 1 },
      ],
    },
    value: 40,
    color: '#8f9ed6',
    code: 'Wt',
    desc: 'Soft, warm, and no trouble at all to run in.',
  },
  {
    id: 'leather_chaps',
    name: 'Leather chaps',
    slot: 'legs',
    armorClass: 'leather',
    levelReq: { skill: 'defence', level: 8 },
    armor: 3,
    affixPool: LEATHER_POOL,
    acquisition: { craft: true, drop: true },
    recipe: {
      skill: 'crafting',
      levelReq: 10,
      xp: 70,
      station: 'workbench',
      ticks: 55,
      inputs: [{ item: 'leather', qty: 2 }],
    },
    value: 150,
    color: '#b08a5c',
    code: 'Lc',
    desc: 'Brush, brambles, and goblin teeth all bounce off.',
  },
  {
    id: 'iron_greaves',
    name: 'Iron greaves',
    slot: 'legs',
    armorClass: 'plate',
    levelReq: { skill: 'defence', level: 12 },
    armor: 4,
    affixPool: PLATE_POOL,
    acquisition: { craft: true, drop: true },
    recipe: {
      skill: 'smithing',
      levelReq: 16,
      xp: 140,
      station: 'anvil',
      ticks: 70,
      inputs: [{ item: 'iron_bar', qty: 2 }],
    },
    value: 280,
    color: '#8d9299',
    code: 'Ig',
    desc: 'Shin-plates that turn a low sweep into a loud noise.',
  },
  {
    id: 'steel_greaves',
    name: 'Steel greaves',
    slot: 'legs',
    armorClass: 'plate',
    levelReq: { skill: 'defence', level: 31 },
    armor: 7,
    affixPool: [...PLATE_POOL, { stat: 'construction' }],
    acquisition: { craft: true },
    recipe: {
      skill: 'smithing',
      levelReq: 33,
      xp: 260,
      station: 'anvil',
      ticks: 85,
      inputs: [{ item: 'steel_bar', qty: 2 }],
    },
    value: 620,
    color: '#b8bec8',
    code: 'Sg',
    desc: 'Bright steel legs that stride through the front line.',
  },

  // ------------------------------------------------ boots
  {
    id: 'swiftstep_boots',
    name: 'Swiftstep boots',
    slot: 'boots',
    armorClass: 'cloth',
    levelReq: { skill: 'magic', level: 10 },
    armor: 1,
    affixPool: [{ stat: 'magic', w: 2 }, { stat: 'sneak' }, { stat: 'regen' }],
    acquisition: { craft: true },
    recipe: {
      skill: 'crafting',
      levelReq: 12,
      xp: 80,
      station: 'workbench',
      ticks: 50,
      inputs: [{ item: 'cloth', qty: 2 }],
    },
    value: 140,
    color: '#7fc9b3',
    code: 'Sb',
    desc: 'They touch the ground mostly out of politeness.',
  },
  {
    id: 'leather_boots',
    name: 'Leather boots',
    slot: 'boots',
    armorClass: 'leather',
    armor: 2,
    affixPool: LEATHER_POOL,
    acquisition: { craft: true, shop: true },
    recipe: {
      skill: 'crafting',
      levelReq: 2,
      xp: 25,
      station: 'workbench',
      ticks: 35,
      inputs: [{ item: 'leather', qty: 1 }],
    },
    value: 45,
    color: '#6b4a26',
    code: 'Lb',
    desc: 'Every long story starts with a good pair of boots.',
  },
  {
    id: 'wanderer_boots',
    name: "Wanderer's boots",
    slot: 'boots',
    armorClass: 'leather',
    levelReq: { skill: 'archery', level: 14 },
    armor: 2,
    affixPool: [...LEATHER_POOL, { stat: 'fishing' }],
    acquisition: { craft: true, drop: true },
    recipe: {
      skill: 'crafting',
      levelReq: 18,
      xp: 150,
      station: 'workbench',
      ticks: 65,
      inputs: [
        { item: 'leather', qty: 2 },
        { item: 'wolf_fur', qty: 1 },
      ],
    },
    value: 240,
    color: '#8a6a45',
    code: 'Wb',
    desc: 'Tall, folded, and already broken in by somebody braver.',
  },
  {
    id: 'iron_sabatons',
    name: 'Iron sabatons',
    slot: 'boots',
    armorClass: 'plate',
    levelReq: { skill: 'defence', level: 14 },
    armor: 3,
    affixPool: PLATE_POOL,
    acquisition: { craft: true, drop: true },
    recipe: {
      skill: 'smithing',
      levelReq: 17,
      xp: 145,
      station: 'anvil',
      ticks: 70,
      inputs: [{ item: 'iron_bar', qty: 2 }],
    },
    value: 260,
    color: '#8d9299',
    code: 'Is',
    desc: 'Steel toes settle a surprising number of arguments.',
  },
  {
    id: 'steel_sabatons',
    name: 'Steel sabatons',
    slot: 'boots',
    armorClass: 'plate',
    levelReq: { skill: 'defence', level: 30 },
    armor: 5,
    affixPool: PLATE_POOL,
    acquisition: { craft: true },
    recipe: {
      skill: 'smithing',
      levelReq: 32,
      xp: 240,
      station: 'anvil',
      ticks: 80,
      inputs: [{ item: 'steel_bar', qty: 2 }],
    },
    value: 480,
    color: '#b8bec8',
    code: 'Ss',
    desc: 'Bright steel feet. The floor hears you coming and agrees.',
  },

  // ------------------------------------------------ offhand
  {
    id: 'oak_kiteshield',
    name: 'Oak kiteshield',
    slot: 'offhand',
    levelReq: { skill: 'defence', level: 6 },
    armor: 3,
    affixPool: [{ stat: 'defence', w: 2 }, { stat: 'vitality' }, { stat: 'maxHp' }],
    acquisition: { craft: true },
    recipe: {
      skill: 'crafting',
      levelReq: 9,
      xp: 85,
      station: 'workbench',
      ticks: 60,
      inputs: [
        { item: 'oak_log', qty: 2 },
        { item: 'bronze_bar', qty: 1 },
      ],
    },
    value: 120,
    color: '#6b4a26',
    code: 'Ks',
    desc: 'A tall oak face with a chevron of hammered bronze.',
  },
  {
    id: 'arcane_orb',
    name: 'Arcane orb',
    slot: 'offhand',
    levelReq: { skill: 'magic', level: 16 },
    armor: 0,
    affixPool: [{ stat: 'magic', w: 3 }, { stat: 'vitality' }, { stat: 'regen' }],
    acquisition: { craft: true },
    recipe: {
      skill: 'crafting',
      levelReq: 24,
      xp: 200,
      station: 'workbench',
      ticks: 75,
      inputs: [
        { item: 'gold_bar', qty: 1 },
        { item: 'moonbell', qty: 2 },
      ],
    },
    value: 330,
    color: '#8f9ed6',
    code: 'Ao',
    desc: 'It orbits your palm and hums when you have a good idea.',
  },
  {
    id: 'tower_shield',
    name: 'Tower shield',
    slot: 'offhand',
    levelReq: { skill: 'defence', level: 20 },
    armor: 5,
    affixPool: [{ stat: 'defence', w: 3 }, { stat: 'maxHp' }, { stat: 'vitality' }],
    acquisition: { craft: true },
    recipe: {
      skill: 'smithing',
      levelReq: 24,
      xp: 190,
      station: 'anvil',
      ticks: 85,
      inputs: [
        { item: 'iron_bar', qty: 3 },
        { item: 'oak_log', qty: 1 },
      ],
    },
    value: 380,
    color: '#8d9299',
    code: 'Ts',
    desc: 'Less a shield, more a door you carry into arguments.',
  },
  {
    id: 'hunters_quiver',
    name: "Hunter's quiver",
    slot: 'offhand',
    levelReq: { skill: 'archery', level: 10 },
    armor: 1,
    affixPool: [{ stat: 'archery', w: 3 }, { stat: 'foraging' }, { stat: 'sneak' }],
    acquisition: { craft: true },
    recipe: {
      skill: 'crafting',
      levelReq: 12,
      xp: 90,
      station: 'workbench',
      ticks: 55,
      inputs: [
        { item: 'leather', qty: 2 },
        { item: 'feather', qty: 5 },
        { item: 'twine', qty: 1 },
      ],
    },
    value: 180,
    color: '#8a6a45',
    code: 'Hq',
    desc: 'Oiled leather, a fist of fletching, and no excuses left.',
  },
  {
    id: 'scholars_tome',
    name: "Scholar's tome",
    slot: 'offhand',
    levelReq: { skill: 'magic', level: 10 },
    armor: 0,
    affixPool: [{ stat: 'magic', w: 3 }, { stat: 'herbalism' }, { stat: 'regen' }],
    acquisition: { craft: true },
    recipe: {
      skill: 'crafting',
      levelReq: 12,
      xp: 90,
      station: 'workbench',
      ticks: 55,
      inputs: [
        { item: 'cloth', qty: 1 },
        { item: 'leather', qty: 1 },
        { item: 'moonbell', qty: 1 },
      ],
    },
    value: 190,
    color: '#4a5a9c',
    code: 'St',
    desc: 'Heavily annotated. The margins argue with the text and win.',
  },

  // ================================================ themed plate sets
  // The plate wardrobe: five full sets, each a color story and a shape
  // language of its own. A "variant" is pure data — same silhouette
  // vocabulary, different palette and devices — so no two sets (and no
  // two players) read alike.

  // -------- Warden: patina-green bronze and copper, the explorer's
  // plate. Grown, not forged — affixes lean into the field skills.
  ...wardenSet(),
  // -------- Frostplate: pale ice-steel, drop-only from the wolf packs.
  // The battle-mage hybrid: plate that still remembers magic.
  ...frostplateSet(),
  // -------- Bulwark: gunmetal and brass, the fortress line. Nothing
  // clever, everything thick.
  ...bulwarkSet(),
  // -------- Dreadforge: blackened steel and blood trim, drop-only from
  // the Skeleton Champion. The villain's wardrobe, worn by you.
  ...dreadforgeSet(),
  // -------- Sunforged: gold and ivory, the endgame craft line. Wings,
  // sun devices, gilded edges — the parade armor that fights.
  ...sunforgedSet(),

  // =============================================== themed leather sets
  // The leather wardrobe: the skirmisher's five color stories. Fur,
  // feathers, scales and antlers where plate had rivets and gold.

  // -------- Wayfarer: buckskin and a redtail feather, the scout's
  // starter craft line. Everything a long road asks for.
  ...wayfarerSet(),
  // -------- Wolfstalker: smoke-grey hide and winter fur, drop-only
  // from the wolf packs. Ears on the hood; the pack walks with you.
  ...wolfstalkerSet(),
  // -------- Nightveil: ink and dusk-purple, drop-only from the crypt.
  // Masked, quiet, gone. The rogue's wardrobe — it gates on Sneak.
  ...nightveilSet(),
  // -------- Drakescale: oxblood scale over boiled leather, the
  // skirmish bruiser's high craft line. Copper-edged, fire-tempered.
  ...drakescaleSet(),
  // -------- Stagheart: bark leather, moss trim, ivory ANTLERS — the
  // endgame forest-king craft. The wilds crown their own.
  ...stagheartSet(),

  // ================================================= themed cloth sets
  // The cloth wardrobe: the caster's five color stories. Sashes, hem
  // runes, floating orbs and halos where leather had fur and scale.

  // -------- Hedgewitch: moss and mustard patchwork, the herb-garden
  // craft line. A pointed hat colorway proves hats obey the law too.
  ...hedgewitchSet(),
  // -------- Tidecaller: deep teal and sea-foam, drop-only from the
  // goblin raiders who loot the coast. The tide keeps its own ledger.
  ...tidecallerSet(),
  // -------- Voidwhisper: ink-violet and pale lavender, drop-only from
  // the crypt. A masked cowl and an unblinking eye device.
  ...voidwhisperSet(),
  // -------- Cindersworn: charcoal and live ember, the high craft
  // line. Hem runes that glow like a banked fire.
  ...cinderswornSet(),
  // -------- Starweaver: midnight and silver, the endgame craft.
  // Orbits its own shoulder-orbs under a floating halo.
  ...starweaverSet(),

  // ========================================== early-game cloth wardrobe
  // Five sets for the leveling road (magic 2–19), each in FOUR dye lots
  // via the colorway law — same silhouette record, new palette and a
  // new place in the world to find it. Low-level never means mundane.
  ...earlyClothDefs(),
];

// ---------------------------------------------------------- set makers
// Local authoring shorthand only: each returns plain EquipmentDefs and
// keeps the four pieces of a set tonally coherent (one palette, one
// affix pool, one acquisition story). A JSON tool would inline these.

function wardenSet(): EquipmentDef[] {
  const pool: AffixPoolEntry[] = [
    { stat: 'defence', w: 2 },
    { stat: 'foraging' },
    { stat: 'farming' },
    { stat: 'woodcutting' },
    { stat: 'vitality' },
  ];
  const color = '#4a7a5a';
  const craft = (levelReq: number, xp: number, ticks: number, bronze: number, oak: number) => ({
    skill: 'smithing' as const,
    levelReq,
    xp,
    station: 'anvil' as const,
    ticks,
    inputs: oak > 0
      ? [{ item: 'bronze_bar', qty: bronze }, { item: 'oak_log', qty: oak }]
      : [{ item: 'bronze_bar', qty: bronze }],
  });
  return [
    {
      id: 'warden_helm', name: 'Warden helm', slot: 'head', armorClass: 'plate',
      levelReq: { skill: 'defence', level: 15 }, armor: 3, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(18, 120, 65, 2, 1),
      value: 260, color, code: 'Wd',
      desc: 'Verdigris bronze with a copper crest. The forest approves.',
    },
    {
      id: 'warden_platebody', name: 'Warden platebody', slot: 'body', armorClass: 'plate',
      levelReq: { skill: 'defence', level: 16 }, armor: 7, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(22, 200, 85, 3, 2),
      value: 380, color, code: 'Wp',
      desc: 'Leaf-bladed shoulders, a leaf on the chest. Armor that grew here.',
    },
    {
      id: 'warden_greaves', name: 'Warden greaves', slot: 'legs', armorClass: 'plate',
      levelReq: { skill: 'defence', level: 15 }, armor: 5, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(20, 160, 75, 2, 1),
      value: 320, color, code: 'Wg',
      desc: 'Mossy bronze shins that walk soft for their weight.',
    },
    {
      id: 'warden_sabatons', name: 'Warden sabatons', slot: 'boots', armorClass: 'plate',
      levelReq: { skill: 'defence', level: 15 }, armor: 3, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(19, 140, 70, 2, 0),
      value: 280, color, code: 'Ws',
      desc: 'Copper-toed and patient. Good soil never hurt good boots.',
    },
  ];
}

function frostplateSet(): EquipmentDef[] {
  const pool: AffixPoolEntry[] = [
    { stat: 'defence', w: 2 },
    { stat: 'magic', w: 2 },
    { stat: 'sneak' },
    { stat: 'maxHp' },
  ];
  const color = '#9db6cc';
  const piece = (
    id: string, name: string, slot: 'head' | 'body' | 'legs' | 'boots',
    level: number, armor: number, value: number, code: string, desc: string,
  ): EquipmentDef => ({
    id, name, slot, armorClass: 'plate',
    levelReq: { skill: 'defence', level }, armor, affixPool: pool,
    acquisition: { drop: true }, value, color, code, desc,
  });
  return [
    piece('frostplate_helm', 'Frostplate helm', 'head', 22, 4, 400, 'Fh',
      'Finned like a glacier calving. Cold to wear, colder to meet.'),
    piece('frostplate_platebody', 'Frostplate platebody', 'body', 24, 8, 560, 'Fp',
      'Pale steel that hums faintly when spells pass through it.'),
    piece('frostplate_greaves', 'Frostplate greaves', 'legs', 22, 6, 480, 'Fg',
      'Rime-chased legplates. Winter walks with you now.'),
    piece('frostplate_sabatons', 'Frostplate sabatons', 'boots', 22, 4, 420, 'Fs',
      'They leave frost in your footprints. The wolves remember.'),
  ];
}

function bulwarkSet(): EquipmentDef[] {
  const pool: AffixPoolEntry[] = [
    { stat: 'defence', w: 3 },
    { stat: 'vitality' },
    { stat: 'maxHp' },
    { stat: 'regen' },
  ];
  const color = '#5a6270';
  const craft = (levelReq: number, xp: number, ticks: number, iron: number, steel: number) => ({
    skill: 'smithing' as const,
    levelReq,
    xp,
    station: 'anvil' as const,
    ticks,
    inputs: [{ item: 'iron_bar', qty: iron }, { item: 'steel_bar', qty: steel }],
  });
  return [
    {
      id: 'bulwark_greathelm', name: 'Bulwark greathelm', slot: 'head', armorClass: 'plate',
      levelReq: { skill: 'defence', level: 26 }, armor: 5, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(30, 240, 85, 2, 1),
      value: 460, color, code: 'Bh',
      desc: 'A cross of daylight is all the world you need.',
    },
    {
      id: 'bulwark_platebody', name: 'Bulwark platebody', slot: 'body', armorClass: 'plate',
      levelReq: { skill: 'defence', level: 27 }, armor: 8, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(32, 320, 100, 2, 2),
      value: 640, color, code: 'Bp',
      desc: 'Brass-bound gunmetal with hip tassets. Built like an argument nobody wins.',
    },
    {
      id: 'bulwark_greaves', name: 'Bulwark greaves', slot: 'legs', armorClass: 'plate',
      levelReq: { skill: 'defence', level: 26 }, armor: 6, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(31, 260, 90, 1, 2),
      value: 540, color, code: 'Bg',
      desc: 'Legs for holding ground. The ground appreciates the company.',
    },
    {
      id: 'bulwark_sabatons', name: 'Bulwark sabatons', slot: 'boots', armorClass: 'plate',
      levelReq: { skill: 'defence', level: 25 }, armor: 4, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(30, 220, 80, 1, 1),
      value: 460, color, code: 'Bs',
      desc: 'Anchor-heavy, brass-cuffed. Retreat was never on the table.',
    },
  ];
}

function dreadforgeSet(): EquipmentDef[] {
  const pool: AffixPoolEntry[] = [
    { stat: 'melee', w: 3 },
    { stat: 'maxHp' },
    { stat: 'vitality' },
    { stat: 'sneak' },
  ];
  const color = '#4a4553';
  const piece = (
    id: string, name: string, slot: 'head' | 'body' | 'legs' | 'boots',
    level: number, armor: number, value: number, code: string, desc: string,
  ): EquipmentDef => ({
    id, name, slot, armorClass: 'plate',
    levelReq: { skill: 'defence', level }, armor, affixPool: pool,
    acquisition: { drop: true }, value, color, code, desc,
  });
  return [
    piece('dreadforge_helm', 'Dreadforge helm', 'head', 34, 6, 720, 'Dh',
      'Black horns, bared cheek-plates. Diplomacy, concluded.'),
    piece('dreadforge_platebody', 'Dreadforge platebody', 'body', 36, 10, 980, 'Dp',
      'Spike-shouldered night steel with a grinning device. It chose you back.'),
    piece('dreadforge_greaves', 'Dreadforge greaves', 'legs', 35, 8, 840, 'Dg',
      'Blood-chased shin plates that march best toward trouble.'),
    piece('dreadforge_sabatons', 'Dreadforge sabatons', 'boots', 34, 6, 760, 'Ds',
      'Spurred black sabatons. Even your footsteps carry knives.'),
  ];
}

function sunforgedSet(): EquipmentDef[] {
  const pool: AffixPoolEntry[] = [
    { stat: 'melee', w: 2 },
    { stat: 'defence', w: 2 },
    { stat: 'smithing' },
    { stat: 'vitality' },
    { stat: 'regen' },
  ];
  const color = '#d4a43c';
  const craft = (levelReq: number, xp: number, ticks: number, gold: number, steel: number) => ({
    skill: 'smithing' as const,
    levelReq,
    xp,
    station: 'anvil' as const,
    ticks,
    inputs: [{ item: 'gold_bar', qty: gold }, { item: 'steel_bar', qty: steel }],
  });
  return [
    {
      id: 'sunforged_helm', name: 'Sunforged helm', slot: 'head', armorClass: 'plate',
      levelReq: { skill: 'defence', level: 40 }, armor: 6, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(44, 420, 100, 1, 2),
      value: 900, color, code: 'Sh',
      desc: 'Ivory wings on gold. Dawn, issued as equipment.',
    },
    {
      id: 'sunforged_platebody', name: 'Sunforged platebody', slot: 'body', armorClass: 'plate',
      levelReq: { skill: 'defence', level: 42 }, armor: 11, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(48, 620, 120, 2, 3),
      value: 1300, color, code: 'Su',
      desc: 'Blade-winged shoulders and a blazing sun device. Parade armor that fights.',
    },
    {
      id: 'sunforged_greaves', name: 'Sunforged greaves', slot: 'legs', armorClass: 'plate',
      levelReq: { skill: 'defence', level: 41 }, armor: 9, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(46, 520, 110, 1, 3),
      value: 1100, color, code: 'Sn',
      desc: 'Gilded greaves bright enough to shave in.',
    },
    {
      id: 'sunforged_sabatons', name: 'Sunforged sabatons', slot: 'boots', armorClass: 'plate',
      levelReq: { skill: 'defence', level: 40 }, armor: 6, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(45, 460, 100, 1, 2),
      value: 950, color, code: 'So',
      desc: 'Every step leaves a little more morning behind.',
    },
  ];
}

function wayfarerSet(): EquipmentDef[] {
  const pool: AffixPoolEntry[] = [
    { stat: 'archery', w: 2 },
    { stat: 'foraging' },
    { stat: 'fishing' },
    { stat: 'woodcutting' },
    { stat: 'maxHp' },
  ];
  const color = '#a8895a';
  const craft = (levelReq: number, xp: number, ticks: number, leather: number, extra?: { item: string; qty: number }) => ({
    skill: 'crafting' as const,
    levelReq,
    xp,
    station: 'workbench' as const,
    ticks,
    inputs: extra
      ? [{ item: 'leather', qty: leather }, extra]
      : [{ item: 'leather', qty: leather }],
  });
  return [
    {
      id: 'wayfarer_hood', name: 'Wayfarer hood', slot: 'head', armorClass: 'leather',
      levelReq: { skill: 'archery', level: 12 }, armor: 3, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(14, 100, 55, 2, { item: 'feather', qty: 1 }),
      value: 180, color, code: 'Yh',
      desc: 'A redtail feather at the temple. The road knows its own.',
    },
    {
      id: 'wayfarer_jerkin', name: 'Wayfarer jerkin', slot: 'body', armorClass: 'leather',
      levelReq: { skill: 'archery', level: 14 }, armor: 5, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(18, 160, 70, 3, { item: 'twine', qty: 2 }),
      value: 280, color, code: 'Yj',
      desc: 'Fringed buckskin, broken in by miles you have not walked yet.',
    },
    {
      id: 'wayfarer_chaps', name: 'Wayfarer chaps', slot: 'legs', armorClass: 'leather',
      levelReq: { skill: 'archery', level: 13 }, armor: 4, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(16, 130, 60, 2, { item: 'twine', qty: 1 }),
      value: 230, color, code: 'Yc',
      desc: 'Wrapped soft, worn softer. Stiles and streams, no complaints.',
    },
    {
      id: 'wayfarer_boots', name: 'Wayfarer boots', slot: 'boots', armorClass: 'leather',
      levelReq: { skill: 'archery', level: 12 }, armor: 3, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(15, 110, 55, 2),
      value: 200, color, code: 'Yb',
      desc: 'Cross-strapped to the shin. They point away from home.',
    },
  ];
}

function wolfstalkerSet(): EquipmentDef[] {
  const pool: AffixPoolEntry[] = [
    { stat: 'sneak', w: 2 },
    { stat: 'archery', w: 2 },
    { stat: 'beastcraft' },
    { stat: 'maxHp' },
  ];
  const color = '#5f6470';
  const piece = (
    id: string, name: string, slot: 'head' | 'body' | 'legs' | 'boots',
    level: number, armor: number, value: number, code: string, desc: string,
  ): EquipmentDef => ({
    id, name, slot, armorClass: 'leather',
    levelReq: { skill: 'archery', level }, armor, affixPool: pool,
    acquisition: { drop: true }, value, color, code, desc,
  });
  return [
    piece('wolfstalker_hood', 'Wolfstalker hood', 'head', 22, 4, 420, 'Kh',
      'Fur-ruffed, ears pricked. You hear the forest hear you.'),
    piece('wolfstalker_jerkin', 'Wolfstalker jerkin', 'body', 24, 6, 580, 'Kj',
      'Winter fur across the shoulders. The pack made room.'),
    piece('wolfstalker_chaps', 'Wolfstalker chaps', 'legs', 22, 5, 500, 'Kc',
      'Smoke-grey wraps that move the way snowfall does.'),
    piece('wolfstalker_boots', 'Wolfstalker boots', 'boots', 22, 3, 440, 'Kb',
      'Fur-topped and silent. Your footprints start lying for you.'),
  ];
}

function nightveilSet(): EquipmentDef[] {
  const pool: AffixPoolEntry[] = [
    { stat: 'sneak', w: 3 },
    { stat: 'archery' },
    { stat: 'herbalism' },
    { stat: 'regen' },
  ];
  const color = '#3a3648';
  const piece = (
    id: string, name: string, slot: 'head' | 'body' | 'legs' | 'boots',
    level: number, armor: number, value: number, code: string, desc: string,
  ): EquipmentDef => ({
    id, name, slot, armorClass: 'leather',
    levelReq: { skill: 'sneak', level }, armor, affixPool: pool,
    acquisition: { drop: true }, value, color, code, desc,
  });
  return [
    piece('nightveil_cowl', 'Nightveil cowl', 'head', 27, 4, 560, 'Nh',
      'Cowl and half-mask. What the dark keeps, it keeps politely.'),
    piece('nightveil_jerkin', 'Nightveil jerkin', 'body', 28, 7, 760, 'Nj',
      'Ink-black leather stitched with dusk. Torchlight slides off it.'),
    piece('nightveil_leggings', 'Nightveil leggings', 'legs', 27, 5, 660, 'Nc',
      'Bound quiet at every seam. Stairs stop announcing you.'),
    piece('nightveil_boots', 'Nightveil boots', 'boots', 27, 4, 580, 'Nb',
      'Soled in hush. The floorboard forgives you in advance.'),
  ];
}

function drakescaleSet(): EquipmentDef[] {
  const pool: AffixPoolEntry[] = [
    { stat: 'archery', w: 2 },
    { stat: 'melee', w: 2 },
    { stat: 'vitality' },
    { stat: 'maxHp' },
  ];
  const color = '#8c3a32';
  const craft = (levelReq: number, xp: number, ticks: number, leather: number, iron: number) => ({
    skill: 'crafting' as const,
    levelReq,
    xp,
    station: 'workbench' as const,
    ticks,
    inputs: [{ item: 'leather', qty: leather }, { item: 'iron_bar', qty: iron }],
  });
  return [
    {
      id: 'drakescale_coif', name: 'Drakescale coif', slot: 'head', armorClass: 'leather',
      levelReq: { skill: 'archery', level: 33 }, armor: 5, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(36, 320, 85, 2, 1),
      value: 700, color, code: 'Qh',
      desc: 'Oxblood scale over a copper jaw. Ask the drake how it went.',
    },
    {
      id: 'drakescale_body', name: 'Drakescale body', slot: 'body', armorClass: 'leather',
      levelReq: { skill: 'archery', level: 34 }, armor: 8, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(40, 460, 100, 4, 2),
      value: 960, color, code: 'Qj',
      desc: 'Row on row of tempered scale. Arrows in, arrows off.',
    },
    {
      id: 'drakescale_chaps', name: 'Drakescale chaps', slot: 'legs', armorClass: 'leather',
      levelReq: { skill: 'archery', level: 33 }, armor: 6, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(38, 380, 90, 3, 1),
      value: 820, color, code: 'Qc',
      desc: 'Scaled to the knee, supple past it. Fire finds no purchase.',
    },
    {
      id: 'drakescale_boots', name: 'Drakescale boots', slot: 'boots', armorClass: 'leather',
      levelReq: { skill: 'archery', level: 33 }, armor: 5, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(37, 340, 85, 2, 1),
      value: 740, color, code: 'Qb',
      desc: 'Copper-toed scale boots. Embers make way, grudgingly.',
    },
  ];
}

function stagheartSet(): EquipmentDef[] {
  const pool: AffixPoolEntry[] = [
    { stat: 'archery', w: 3 },
    { stat: 'foraging' },
    { stat: 'sneak' },
    { stat: 'regen' },
    { stat: 'maxHp' },
  ];
  const color = '#6b5138';
  const craft = (levelReq: number, xp: number, ticks: number, leather: number, gold: number, feather: number) => ({
    skill: 'crafting' as const,
    levelReq,
    xp,
    station: 'workbench' as const,
    ticks,
    inputs: feather > 0
      ? [{ item: 'leather', qty: leather }, { item: 'gold_bar', qty: gold }, { item: 'feather', qty: feather }]
      : [{ item: 'leather', qty: leather }, { item: 'gold_bar', qty: gold }],
  });
  return [
    {
      id: 'stagheart_hood', name: 'Stagheart hood', slot: 'head', armorClass: 'leather',
      levelReq: { skill: 'archery', level: 40 }, armor: 6, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(44, 560, 100, 2, 1, 0),
      value: 1050, color, code: 'Gh',
      desc: 'Ivory antlers over bark leather. The wilds crown their own.',
    },
    {
      id: 'stagheart_jerkin', name: 'Stagheart jerkin', slot: 'body', armorClass: 'leather',
      levelReq: { skill: 'archery', level: 42 }, armor: 9, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(48, 780, 120, 4, 2, 6),
      value: 1400, color, code: 'Gj',
      desc: 'Feathered shoulders, gold-stitched fringe. The forest, formal.',
    },
    {
      id: 'stagheart_chaps', name: 'Stagheart chaps', slot: 'legs', armorClass: 'leather',
      levelReq: { skill: 'archery', level: 41 }, armor: 7, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(46, 660, 110, 3, 1, 0),
      value: 1200, color, code: 'Gc',
      desc: 'Moss-bound bark leather. Old growth from the knee down.',
    },
    {
      id: 'stagheart_boots', name: 'Stagheart boots', slot: 'boots', armorClass: 'leather',
      levelReq: { skill: 'archery', level: 40 }, armor: 5, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(45, 600, 100, 2, 1, 0),
      value: 1100, color, code: 'Gb',
      desc: 'They remember every path and prefer the unmarked ones.',
    },
  ];
}

function hedgewitchSet(): EquipmentDef[] {
  const pool: AffixPoolEntry[] = [
    { stat: 'magic', w: 2 },
    { stat: 'herbalism', w: 2 },
    { stat: 'farming' },
    { stat: 'regen' },
  ];
  const color = '#5a6b3a';
  const craft = (levelReq: number, xp: number, ticks: number, cloth: number, extra?: { item: string; qty: number }) => ({
    skill: 'crafting' as const,
    levelReq,
    xp,
    station: 'workbench' as const,
    ticks,
    inputs: extra
      ? [{ item: 'cloth', qty: cloth }, extra]
      : [{ item: 'cloth', qty: cloth }],
  });
  return [
    {
      id: 'hedgewitch_hat', name: 'Hedgewitch hat', slot: 'head', armorClass: 'cloth',
      levelReq: { skill: 'magic', level: 12 }, armor: 1, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(14, 100, 55, 2, { item: 'moonbell', qty: 1 }),
      value: 190, color, code: 'Hh',
      desc: 'Pointed, patched, and proud of both. Smells faintly of thyme.',
    },
    {
      id: 'hedgewitch_robe', name: 'Hedgewitch robe', slot: 'body', armorClass: 'cloth',
      levelReq: { skill: 'magic', level: 14 }, armor: 3, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(18, 160, 70, 3, { item: 'twine', qty: 2 }),
      value: 290, color, code: 'Hr',
      desc: 'Every patch was a lesson. The garden grades generously.',
    },
    {
      id: 'hedgewitch_skirts', name: 'Hedgewitch skirts', slot: 'legs', armorClass: 'cloth',
      levelReq: { skill: 'magic', level: 13 }, armor: 2, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(16, 130, 60, 2, { item: 'twine', qty: 1 }),
      value: 240, color, code: 'Hs',
      desc: 'Hemmed high for mud season. The mud appreciates the effort.',
    },
    {
      id: 'hedgewitch_slippers', name: 'Hedgewitch slippers', slot: 'boots', armorClass: 'cloth',
      levelReq: { skill: 'magic', level: 12 }, armor: 1, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(15, 110, 55, 2),
      value: 210, color, code: 'Hp',
      desc: 'Soft-soled and garden-stained. The cat approves of the toes.',
    },
  ];
}

function tidecallerSet(): EquipmentDef[] {
  const pool: AffixPoolEntry[] = [
    { stat: 'magic', w: 2 },
    { stat: 'fishing', w: 2 },
    { stat: 'regen' },
    { stat: 'maxHp' },
  ];
  const color = '#2f6a78';
  const piece = (
    id: string, name: string, slot: 'head' | 'body' | 'legs' | 'boots',
    level: number, armor: number, value: number, code: string, desc: string,
  ): EquipmentDef => ({
    id, name, slot, armorClass: 'cloth',
    levelReq: { skill: 'magic', level }, armor, affixPool: pool,
    acquisition: { drop: true }, value, color, code, desc,
  });
  return [
    piece('tidecaller_hood', 'Tidecaller hood', 'head', 22, 2, 430, 'Th',
      'A pearl at the brow. The sea pays attention to who wears it.'),
    piece('tidecaller_robe', 'Tidecaller robe', 'body', 24, 4, 600, 'Tr',
      'Foam-hemmed teal that always feels a little damp, never cold.'),
    piece('tidecaller_skirts', 'Tidecaller skirts', 'legs', 22, 3, 510, 'Tk',
      'They move like slack water and hit like a spring tide.'),
    piece('tidecaller_slippers', 'Tidecaller slippers', 'boots', 22, 2, 450, 'Tp',
      'Wet sand keeps no record of them. Neither does anything else.'),
  ];
}

function voidwhisperSet(): EquipmentDef[] {
  const pool: AffixPoolEntry[] = [
    { stat: 'magic', w: 2 },
    { stat: 'sneak', w: 2 },
    { stat: 'herbalism' },
    { stat: 'regen' },
  ];
  const color = '#453a5c';
  const piece = (
    id: string, name: string, slot: 'head' | 'body' | 'legs' | 'boots',
    level: number, armor: number, value: number, code: string, desc: string,
  ): EquipmentDef => ({
    id, name, slot, armorClass: 'cloth',
    levelReq: { skill: 'magic', level }, armor, affixPool: pool,
    acquisition: { drop: true }, value, color, code, desc,
  });
  return [
    piece('voidwhisper_cowl', 'Voidwhisper cowl', 'head', 27, 3, 580, 'Vh',
      'Masked to the eyes. The dark finishes your sentences now.'),
    piece('voidwhisper_robe', 'Voidwhisper robe', 'body', 28, 5, 790, 'Vr',
      'An unblinking eye on ink-violet cloth. It reads you back.'),
    piece('voidwhisper_skirts', 'Voidwhisper skirts', 'legs', 27, 3, 680, 'Vk',
      'Stitched from the quiet between two heartbeats.'),
    piece('voidwhisper_slippers', 'Voidwhisper slippers', 'boots', 27, 2, 600, 'Vp',
      'They touch the floor out of politeness, nothing more.'),
  ];
}

function cinderswornSet(): EquipmentDef[] {
  const pool: AffixPoolEntry[] = [
    { stat: 'magic', w: 3 },
    { stat: 'cooking' },
    { stat: 'vitality' },
    { stat: 'regen' },
  ];
  const color = '#4a3a38';
  const craft = (levelReq: number, xp: number, ticks: number, cloth: number, gold: number) => ({
    skill: 'crafting' as const,
    levelReq,
    xp,
    station: 'workbench' as const,
    ticks,
    inputs: [{ item: 'cloth', qty: cloth }, { item: 'wolf_fur', qty: 1 }, { item: 'gold_bar', qty: gold }],
  });
  return [
    {
      id: 'cindersworn_hood', name: 'Cindersworn hood', slot: 'head', armorClass: 'cloth',
      levelReq: { skill: 'magic', level: 33 }, armor: 3, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(36, 320, 85, 2, 1),
      value: 720, color, code: 'Ch',
      desc: 'An ember set at the brow. It has never once gone out.',
    },
    {
      id: 'cindersworn_robe', name: 'Cindersworn robe', slot: 'body', armorClass: 'cloth',
      levelReq: { skill: 'magic', level: 34 }, armor: 5, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(40, 460, 100, 4, 2),
      value: 990, color, code: 'Cr',
      desc: 'Charcoal cloth, hem runes banked like coals. Warm side out.',
    },
    {
      id: 'cindersworn_skirts', name: 'Cindersworn skirts', slot: 'legs', armorClass: 'cloth',
      levelReq: { skill: 'magic', level: 33 }, armor: 4, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(38, 380, 90, 3, 1),
      value: 850, color, code: 'Ck',
      desc: 'Ash-grey wool that keeps the heat and spends it later.',
    },
    {
      id: 'cindersworn_slippers', name: 'Cindersworn slippers', slot: 'boots', armorClass: 'cloth',
      levelReq: { skill: 'magic', level: 33 }, armor: 2, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(37, 340, 85, 2, 1),
      value: 760, color, code: 'Cp',
      desc: 'Every step leaves the faintest warmth in the floorboards.',
    },
  ];
}

function starweaverSet(): EquipmentDef[] {
  const pool: AffixPoolEntry[] = [
    { stat: 'magic', w: 3 },
    { stat: 'herbalism' },
    { stat: 'vitality' },
    { stat: 'maxHp' },
    { stat: 'regen' },
  ];
  const color = '#2c3260';
  const craft = (levelReq: number, xp: number, ticks: number, cloth: number, gold: number, moonbell: number) => ({
    skill: 'crafting' as const,
    levelReq,
    xp,
    station: 'workbench' as const,
    ticks,
    inputs: moonbell > 0
      ? [{ item: 'cloth', qty: cloth }, { item: 'gold_bar', qty: gold }, { item: 'moonbell', qty: moonbell }]
      : [{ item: 'cloth', qty: cloth }, { item: 'gold_bar', qty: gold }],
  });
  return [
    {
      id: 'starweaver_circlet', name: 'Starweaver circlet', slot: 'head', armorClass: 'cloth',
      levelReq: { skill: 'magic', level: 40 }, armor: 3, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(44, 560, 100, 2, 1, 2),
      value: 1080, color, code: 'Sc',
      desc: 'A silver band beneath a halo that never quite touches down.',
    },
    {
      id: 'starweaver_robe', name: 'Starweaver robe', slot: 'body', armorClass: 'cloth',
      levelReq: { skill: 'magic', level: 42 }, armor: 6, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(48, 780, 120, 4, 2, 3),
      value: 1450, color, code: 'Sr',
      desc: 'Midnight cloth, silver star, two orbs in patient orbit.',
    },
    {
      id: 'starweaver_skirts', name: 'Starweaver skirts', slot: 'legs', armorClass: 'cloth',
      levelReq: { skill: 'magic', level: 41 }, armor: 5, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(46, 660, 110, 3, 1, 2),
      value: 1250, color, code: 'Sk',
      desc: 'Hemmed with constellations nobody has misread yet.',
    },
    {
      id: 'starweaver_slippers', name: 'Starweaver slippers', slot: 'boots', armorClass: 'cloth',
      levelReq: { skill: 'magic', level: 40 }, armor: 3, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(45, 600, 100, 2, 1, 1),
      value: 1150, color, code: 'Sp',
      desc: 'Curled silver toes. The night sky, fitted for walking.',
    },
  ];
}

// ------------------------------------------------- colorway generator

/**
 * Colorway variants: the palette-swap law as a def generator. A variant
 * reuses its base piece wholesale — same slot, gate, armor and value —
 * and changes only identity: id suffix, dye-name prefix, color, story,
 * and how the world hands it out. Craft colorways append their dye
 * ingredient to the base recipe; drop colorways shed the recipe.
 */
interface ColorwaySpec {
  key: string;
  dye: string;
  color: string;
  desc: string;
  acquisition?: EquipmentDef['acquisition'];
  dyeInput?: { item: string; qty: number };
}

function colorways(pieces: EquipmentDef[], specs: ColorwaySpec[]): EquipmentDef[] {
  return specs.flatMap((cw) => pieces.map((p): EquipmentDef => {
    const acquisition = cw.acquisition ?? p.acquisition;
    const v: EquipmentDef = {
      ...p,
      id: `${p.id}_${cw.key}`,
      name: `${cw.dye} ${p.name.charAt(0).toLowerCase()}${p.name.slice(1)}`,
      color: cw.color,
      desc: cw.desc,
      acquisition,
    };
    // JSON-safety: absent, never explicitly undefined (round-trip law).
    if (acquisition.craft && p.recipe) {
      v.recipe = { ...p.recipe, inputs: cw.dyeInput ? [...p.recipe.inputs, cw.dyeInput] : p.recipe.inputs };
    } else {
      delete v.recipe;
    }
    return v;
  }));
}

function earlyClothDefs(): EquipmentDef[] {
  const thistledown = thistledownSet();
  const mothwing = mothwingSet();
  const dawnsworn = dawnswornSet();
  const fenwalker = fenwalkerSet();
  const stormwoven = stormwovenSet();
  return [
    // -------- Thistledown: undyed oat linen, big honest patches, a rope
    // sash. The very first robe — and the town square wears four dyes.
    ...thistledown,
    ...colorways(thistledown, [
      { key: 'madder', dye: 'Madder', color: '#a8524a', dyeInput: { item: 'berries', qty: 2 },
        desc: 'Dyed in crushed berry-madder — hedge red, honestly earned.' },
      { key: 'woad', dye: 'Woad', color: '#54688e', dyeInput: { item: 'moonbell', qty: 1 },
        desc: 'Moonbell-steeped blue. The sky, on a workday.' },
      { key: 'bracken', dye: 'Bracken', color: '#8a6f4a', dyeInput: { item: 'sagewort', qty: 2 },
        desc: 'Boiled bracken brown. It never shows the mud.' },
    ]),
    // -------- Mothwing: dust-sage cloth under a broad moth device, with
    // curled antennae on the cowl. Drop-only — each dye lot haunts a
    // different corner of the low-level world.
    ...mothwing,
    ...colorways(mothwing, [
      { key: 'luna', dye: 'Luna', color: '#9ab88e',
        desc: 'Pale green dust that only settles by moonlight.' },
      { key: 'dusk', dye: 'Dusk', color: '#7a6280',
        desc: 'Plum-grey wings from the crypt door at closing time.' },
      { key: 'ember', dye: 'Ember', color: '#a8705c',
        desc: 'Singed rose-copper. It flew too close, and liked it.' },
    ]),
    // -------- Dawnsworn: ivory and gold under a blazing sun device, a
    // brow gem that catches first light. The acolyte's craft line.
    ...dawnsworn,
    ...colorways(dawnsworn, [
      { key: 'duskvow', dye: 'Duskvow', color: '#9a6a86', dyeInput: { item: 'berries', qty: 2 },
        desc: 'Sworn to the other horizon — rose fading into violet.' },
      { key: 'highnoon', dye: 'Highnoon', color: '#eae4d2', dyeInput: { item: 'cotton', qty: 2 },
        desc: 'Bleached bright as noon. Squint and be grateful.' },
      { key: 'eclipse', dye: 'Eclipse', color: '#4a4550', acquisition: { drop: true },
        desc: 'Charcoal cloth ringed in gold — the sun, briefly borrowed.' },
    ]),
    // -------- Fenwalker: bog-green cloth threaded with wisp-light hem
    // runes, a reed feather at the temple. Drop-only from the fens.
    ...fenwalker,
    ...colorways(fenwalker, [
      { key: 'mirebloom', dye: 'Mirebloom', color: '#7a5a78',
        desc: 'Heather-purple from flowers that grow on drowned ground.' },
      { key: 'rustsedge', dye: 'Rustsedge', color: '#96603c',
        desc: 'Iron-water rust, cut from the reeds that drink it.' },
      { key: 'graymist', dye: 'Graymist', color: '#7d8580',
        desc: 'Woven fog. The bog keeps what it cannot see.' },
    ]),
    // -------- Stormwoven: slate cloth around a fat gold bolt, a mantle
    // like a rolling front. The mid-game craft line with weather in it.
    ...stormwoven,
    ...colorways(stormwoven, [
      { key: 'thunderhead', dye: 'Thunderhead', color: '#3a3f4e', dyeInput: { item: 'iron_bar', qty: 1 },
        desc: 'Anvil-cloud dark, gold at the seams. Count the seconds.' },
      { key: 'sunshower', dye: 'Sunshower', color: '#c9a85c', dyeInput: { item: 'sunflower', qty: 2 },
        desc: 'Rain with the sun still out — luck, wearable.' },
      { key: 'aurora', dye: 'Aurora', color: '#4e8a7a', dyeInput: { item: 'moonbell', qty: 1 },
        desc: 'Green fire off a midnight sky, hemmed and hushed.' },
    ]),
  ];
}

function thistledownSet(): EquipmentDef[] {
  const pool: AffixPoolEntry[] = [
    { stat: 'magic', w: 2 },
    { stat: 'farming' },
    { stat: 'foraging' },
    { stat: 'regen' },
  ];
  const color = '#c9bfa3';
  const craft = (levelReq: number, xp: number, ticks: number, cloth: number) => ({
    skill: 'crafting' as const,
    levelReq,
    xp,
    station: 'workbench' as const,
    ticks,
    inputs: [{ item: 'cloth', qty: cloth }, { item: 'twine', qty: 1 }],
  });
  return [
    {
      id: 'thistledown_hood', name: 'Thistledown hood', slot: 'head', armorClass: 'cloth',
      levelReq: { skill: 'magic', level: 2 }, armor: 1, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(2, 20, 35, 1),
      value: 30, color, code: 'Lh',
      desc: 'Oat linen, soft as seed-fluff. Every road starts warm.',
    },
    {
      id: 'thistledown_robe', name: 'Thistledown robe', slot: 'body', armorClass: 'cloth',
      levelReq: { skill: 'magic', level: 4 }, armor: 2, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(5, 40, 50, 2),
      value: 55, color, code: 'Lr',
      desc: 'Patched at the elbow, proud of it. The rope belt is load-bearing.',
    },
    {
      id: 'thistledown_skirts', name: 'Thistledown skirts', slot: 'legs', armorClass: 'cloth',
      levelReq: { skill: 'magic', level: 3 }, armor: 1, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(3, 30, 40, 1),
      value: 40, color, code: 'Lk',
      desc: 'Homespun and hemmed twice. Thorns give up politely.',
    },
    {
      id: 'thistledown_slippers', name: 'Thistledown slippers', slot: 'boots', armorClass: 'cloth',
      levelReq: { skill: 'magic', level: 2 }, armor: 1, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(2, 25, 35, 1),
      value: 35, color, code: 'Lp',
      desc: 'Quiet as thistle seed on the wind, twice as stubborn.',
    },
  ];
}

function mothwingSet(): EquipmentDef[] {
  const pool: AffixPoolEntry[] = [
    { stat: 'magic', w: 2 },
    { stat: 'sneak' },
    { stat: 'herbalism' },
    { stat: 'regen' },
  ];
  const color = '#8a8a72';
  const piece = (
    id: string, name: string, slot: 'head' | 'body' | 'legs' | 'boots',
    level: number, armor: number, value: number, code: string, desc: string,
  ): EquipmentDef => ({
    id, name, slot, armorClass: 'cloth',
    levelReq: { skill: 'magic', level }, armor, affixPool: pool,
    acquisition: { drop: true }, value, color, code, desc,
  });
  return [
    piece('mothwing_cowl', 'Mothwing cowl', 'head', 6, 1, 95, 'Mh',
      'Curled antennae over the brow. You hear the lamplight now.'),
    piece('mothwing_robe', 'Mothwing robe', 'body', 8, 3, 140, 'Mr',
      'Broad dust-pale wings across the chest. Drawn to bright things.'),
    piece('mothwing_skirts', 'Mothwing skirts', 'legs', 7, 2, 115, 'Mk',
      'They fold flat and silent, the way wings do at rest.'),
    piece('mothwing_slippers', 'Mothwing slippers', 'boots', 6, 1, 100, 'Mp',
      'Powder-soft steps. The candle never sees you coming.'),
  ];
}

function dawnswornSet(): EquipmentDef[] {
  const pool: AffixPoolEntry[] = [
    { stat: 'magic', w: 2 },
    { stat: 'regen', w: 2 },
    { stat: 'vitality' },
    { stat: 'maxHp' },
  ];
  const color = '#d9c9a0';
  const craft = (levelReq: number, xp: number, ticks: number, cloth: number) => ({
    skill: 'crafting' as const,
    levelReq,
    xp,
    station: 'workbench' as const,
    ticks,
    inputs: [{ item: 'cloth', qty: cloth }, { item: 'sunflower', qty: 2 }],
  });
  return [
    {
      id: 'dawnsworn_hood', name: 'Dawnsworn hood', slot: 'head', armorClass: 'cloth',
      levelReq: { skill: 'magic', level: 10 }, armor: 2, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(12, 85, 55, 2),
      value: 170, color, code: 'Ah',
      desc: 'A sunstone at the brow. It warms a minute before sunrise.',
    },
    {
      id: 'dawnsworn_robe', name: 'Dawnsworn robe', slot: 'body', armorClass: 'cloth',
      levelReq: { skill: 'magic', level: 12 }, armor: 3, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(16, 140, 70, 3),
      value: 240, color, code: 'Ar',
      desc: 'Ivory cloth behind a blazing sun. First light, sworn in.',
    },
    {
      id: 'dawnsworn_skirts', name: 'Dawnsworn skirts', slot: 'legs', armorClass: 'cloth',
      levelReq: { skill: 'magic', level: 11 }, armor: 2, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(14, 110, 60, 2),
      value: 205, color, code: 'Ak',
      desc: 'Gold-hemmed and early to rise. The dew steps aside.',
    },
    {
      id: 'dawnsworn_slippers', name: 'Dawnsworn slippers', slot: 'boots', armorClass: 'cloth',
      levelReq: { skill: 'magic', level: 10 }, armor: 1, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(13, 95, 55, 2),
      value: 180, color, code: 'Ap',
      desc: 'They face east on their own. Let them lead once in a while.',
    },
  ];
}

function fenwalkerSet(): EquipmentDef[] {
  const pool: AffixPoolEntry[] = [
    { stat: 'magic', w: 2 },
    { stat: 'herbalism', w: 2 },
    { stat: 'fishing' },
    { stat: 'maxHp' },
  ];
  const color = '#4a6b5c';
  const piece = (
    id: string, name: string, slot: 'head' | 'body' | 'legs' | 'boots',
    level: number, armor: number, value: number, code: string, desc: string,
  ): EquipmentDef => ({
    id, name, slot, armorClass: 'cloth',
    levelReq: { skill: 'magic', level }, armor, affixPool: pool,
    acquisition: { drop: true }, value, color, code, desc,
  });
  return [
    piece('fenwalker_hood', 'Fenwalker hood', 'head', 14, 2, 280, 'Fh',
      'A reed feather at the temple. The bog counts you as local.'),
    piece('fenwalker_robe', 'Fenwalker robe', 'body', 16, 4, 390, 'Fr',
      'Wisp-light runes ride the hem. They know where the ground lies.'),
    piece('fenwalker_skirts', 'Fenwalker skirts', 'legs', 15, 3, 330, 'Fk',
      'Hemmed high over the waterline, weighted low against the wind.'),
    piece('fenwalker_slippers', 'Fenwalker slippers', 'boots', 14, 2, 300, 'Fp',
      'Reed-lashed soles. The mud signs for someone else entirely.'),
  ];
}

function stormwovenSet(): EquipmentDef[] {
  const pool: AffixPoolEntry[] = [
    { stat: 'magic', w: 3 },
    { stat: 'vitality' },
    { stat: 'regen' },
    { stat: 'maxHp' },
  ];
  const color = '#4e5a78';
  const craft = (levelReq: number, xp: number, ticks: number, cloth: number) => ({
    skill: 'crafting' as const,
    levelReq,
    xp,
    station: 'workbench' as const,
    ticks,
    inputs: [{ item: 'cloth', qty: cloth }, { item: 'iron_bar', qty: 1 }],
  });
  return [
    {
      id: 'stormwoven_hood', name: 'Stormwoven hood', slot: 'head', armorClass: 'cloth',
      levelReq: { skill: 'magic', level: 17 }, armor: 2, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(20, 170, 70, 2),
      value: 360, color, code: 'Zh',
      desc: 'A storm-eye glints at the brow. Weather answers to it, some days.',
    },
    {
      id: 'stormwoven_robe', name: 'Stormwoven robe', slot: 'body', armorClass: 'cloth',
      levelReq: { skill: 'magic', level: 19 }, armor: 4, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(24, 260, 90, 4),
      value: 500, color, code: 'Zr',
      desc: 'A fat gold bolt on rolling slate. Thunder, tailored.',
    },
    {
      id: 'stormwoven_skirts', name: 'Stormwoven skirts', slot: 'legs', armorClass: 'cloth',
      levelReq: { skill: 'magic', level: 18 }, armor: 3, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(22, 210, 80, 3),
      value: 430, color, code: 'Zk',
      desc: 'Rain-grey wool with a charge in it. Hems mutter like far fronts.',
    },
    {
      id: 'stormwoven_slippers', name: 'Stormwoven slippers', slot: 'boots', armorClass: 'cloth',
      levelReq: { skill: 'magic', level: 17 }, armor: 2, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(21, 180, 70, 2),
      value: 380, color, code: 'Zp',
      desc: 'Static in the soles. Doorknobs have learned to flinch.',
    },
  ];
}

/** Compiled once at module load — throws loudly on any malformed def. */
export const COMPILED_EQUIPMENT = compileEquipment(EQUIPMENT_DEFS);
