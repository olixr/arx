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
      skill: 'tailoring',
      levelReq: 6,
      xp: 55,
      station: 'loom',
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
      skill: 'tailoring',
      levelReq: 30,
      xp: 240,
      station: 'loom',
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
      skill: 'leatherworking',
      levelReq: 8,
      xp: 75,
      station: 'tanning_rack',
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
      skill: 'leatherworking',
      levelReq: 16,
      xp: 130,
      station: 'tanning_rack',
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
      skill: 'tailoring',
      levelReq: 5,
      xp: 35,
      station: 'loom',
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
      skill: 'leatherworking',
      levelReq: 6,
      xp: 50,
      station: 'tanning_rack',
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
      skill: 'tailoring',
      levelReq: 14,
      xp: 110,
      station: 'loom',
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
      skill: 'tailoring',
      levelReq: 22,
      xp: 190,
      station: 'loom',
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
      skill: 'tailoring',
      levelReq: 3,
      xp: 30,
      station: 'loom',
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
      skill: 'leatherworking',
      levelReq: 10,
      xp: 70,
      station: 'tanning_rack',
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
      skill: 'tailoring',
      levelReq: 12,
      xp: 80,
      station: 'loom',
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
      skill: 'leatherworking',
      levelReq: 2,
      xp: 25,
      station: 'tanning_rack',
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
      skill: 'leatherworking',
      levelReq: 18,
      xp: 150,
      station: 'tanning_rack',
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

  // ------------------------------------------------ gloves
  // The fifth armor slot: hands. Every themed set below carries its own
  // pair; these four are the plain working commons that seed the slot.
  {
    id: 'padded_mitts',
    name: 'Padded mitts',
    slot: 'gloves',
    armorClass: 'cloth',
    levelReq: { skill: 'magic', level: 8 },
    armor: 1,
    affixPool: [{ stat: 'magic', w: 2 }, { stat: 'tailoring' }, { stat: 'regen' }],
    acquisition: { craft: true },
    recipe: {
      skill: 'tailoring',
      levelReq: 10,
      xp: 70,
      station: 'loom',
      ticks: 45,
      inputs: [{ item: 'cloth', qty: 2 }],
    },
    value: 120,
    color: '#8a8ab0',
    code: 'Pm',
    desc: 'Quilted to the wrist. Cauldrons stop winning the argument.',
  },
  {
    id: 'leather_gloves',
    name: 'Leather gloves',
    slot: 'gloves',
    armorClass: 'leather',
    armor: 1,
    affixPool: LEATHER_POOL,
    acquisition: { craft: true, shop: true },
    recipe: {
      skill: 'leatherworking',
      levelReq: 2,
      xp: 25,
      station: 'tanning_rack',
      ticks: 35,
      inputs: [{ item: 'leather', qty: 1 }],
    },
    value: 40,
    color: '#b08a5c',
    code: 'Lg',
    desc: 'Broken in by somebody else\'s blisters. Grip and go.',
  },
  {
    id: 'iron_gauntlets',
    name: 'Iron gauntlets',
    slot: 'gloves',
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
    code: 'Iu',
    desc: 'A handshake with municipal backing.',
  },
  {
    id: 'steel_gauntlets',
    name: 'Steel gauntlets',
    slot: 'gloves',
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
    code: 'Sl',
    desc: 'Bright steel fists, gold at the knuckle. Doors open early.',
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
      skill: 'woodworking',
      levelReq: 9,
      xp: 85,
      station: 'carving_bench',
      ticks: 60,
      inputs: [
        { item: 'oak_log', qty: 2 },
        { item: 'bronze_bar', qty: 1 },
      ],
    },
    value: 120,
    color: '#79512a',
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
      skill: 'smithing',
      levelReq: 24,
      xp: 200,
      station: 'anvil',
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
    color: '#9aa1ab',
    code: 'Ts',
    desc: 'Less a shield, more a door you carry into arguments.',
  },
  {
    id: 'hunters_quiver',
    name: "Hunter's quiver",
    slot: 'offhand',
    backMounted: true,
    levelReq: { skill: 'archery', level: 10 },
    armor: 1,
    affixPool: [{ stat: 'archery', w: 3 }, { stat: 'foraging' }, { stat: 'sneak' }],
    acquisition: { craft: true },
    recipe: {
      skill: 'leatherworking',
      levelReq: 12,
      xp: 90,
      station: 'tanning_rack',
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
      skill: 'leatherworking',
      levelReq: 12,
      xp: 90,
      station: 'tanning_rack',
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

  // -------- Hedgemage: moss and mustard patchwork, the herb-garden
  // craft line. A pointed hat colorway proves hats obey the law too.
  ...hedgemageSet(),
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

  // ======================================== early-game leather wardrobe
  // Five sets for the hunters, rogues and thieves of the leveling road
  // (archery/sneak 2–19), each in FOUR dye lots via the colorway law.
  // The skirmisher's early pool: hare-swift couriers, river poachers,
  // guild thieves, trappers and the fox-cloaked showpiece.
  ...earlyLeatherDefs(),

  // ========================================== early-game plate wardrobe
  // Five sets for the knights of the leveling road (defence/melee 2–19),
  // each in FOUR lots via the colorway law. Craft lots RE-FORGE the same
  // silhouette from a different bar (swapInput); drop lots haunt the
  // mobs. Early never means humble — these are the showstoppers a new
  // knight marches around in.
  ...earlyPlateDefs(),

  // ====================================================== the blade roster
  // Twenty bespoke one-handed swords. Three smithing DESIGNS each forged
  // in four metals (a metal ladder is real stat progression, so the lots
  // are authored defs, not colorways), five bespoke crafts with story
  // ingredients, and twelve drop-only wild finds climbing all the way to
  // a legendary-only heirloom. Every signature blade carries its own
  // Weapon Art — pure data on the one ability executor.
  ...swordDefs(),

  // ===================================================== the rogue's roster
  // Twenty bespoke daggers. The thief's arsenal: sneak-gated, dialed on
  // backstabMult rather than raw damage, fastest cadences in the game.
  // Three smithing designs across the metal ladder, the migrated dirk
  // line, three bespoke crafts, and fourteen drop-only finds ending in
  // a legendary-only last word.
  ...daggerDefs(),

  // ==================================================== the archer's roster
  // Twenty bespoke bows. Three fletching designs climb the wood ladder
  // (log → oak → willow → yew), three bespoke crafts, fourteen wild
  // finds up to the legendary-only Skyrender. Longbows slow and heavy,
  // shortbows quick and close, recurves the hunter's middle path.
  ...bowDefs(),

  // =================================================== the archmage's roster
  // Twenty-two bespoke staves. The wizard's arsenal: every staff carries
  // an ELEMENT that tints its bolts and names its school, and a Weapon
  // Art from that school. One carving design climbs the wood ladder,
  // one battlestaff frame takes four swappable element gems (mined and
  // foraged from the land), three bespoke crafts, and a trail of wild
  // finds rising to the legendary-only Worldsplinter.
  ...staffDefs(),
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
    {
      id: 'warden_gauntlets', name: 'Warden gauntlets', slot: 'gloves', armorClass: 'plate',
      levelReq: { skill: 'defence', level: 15 }, armor: 3, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(19, 130, 68, 1, 1),
      value: 270, color, code: 'Wu',
      desc: 'Verdigris knuckles under a copper leaf. Grip like old roots.',
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
    id: string, name: string, slot: 'head' | 'body' | 'legs' | 'gloves' | 'boots',
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
    piece('frostplate_gauntlets', 'Frostplate gauntlets', 'gloves', 22, 4, 430, 'Fu',
      'Rime creeps the knuckles when you make a fist. Let it.'),
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
    {
      id: 'bulwark_gauntlets', name: 'Bulwark gauntlets', slot: 'gloves', armorClass: 'plate',
      levelReq: { skill: 'defence', level: 25 }, armor: 4, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(30, 230, 82, 1, 1),
      value: 470, color, code: 'Bu',
      desc: 'Brass-jointed gunmetal fists. What they hold stays held.',
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
    id: string, name: string, slot: 'head' | 'body' | 'legs' | 'gloves' | 'boots',
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
    piece('dreadforge_gauntlets', 'Dreadforge gauntlets', 'gloves', 34, 6, 780, 'Du',
      'Spiked night-steel fists. The handshake is a threat display.'),
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
    {
      id: 'sunforged_gauntlets', name: 'Sunforged gauntlets', slot: 'gloves', armorClass: 'plate',
      levelReq: { skill: 'defence', level: 40 }, armor: 6, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(45, 470, 100, 1, 2),
      value: 960, color, code: 'Sf',
      desc: 'Gold to the fingertip, ivory at the cuff. Applause, armored.',
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
    skill: 'leatherworking' as const,
    levelReq,
    xp,
    station: 'tanning_rack' as const,
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
    {
      id: 'wayfarer_gloves', name: 'Wayfarer gloves', slot: 'gloves', armorClass: 'leather',
      levelReq: { skill: 'archery', level: 12 }, armor: 3, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(15, 105, 55, 2),
      value: 195, color, code: 'Yg',
      desc: 'Buckskin worn to the shape of a bowstring. Maps optional.',
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
    id: string, name: string, slot: 'head' | 'body' | 'legs' | 'gloves' | 'boots',
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
    piece('wolfstalker_gloves', 'Wolfstalker gloves', 'gloves', 22, 3, 450, 'Ku',
      'Winter fur at the wrist, claw-tipped at the finger. Pack rules.'),
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
    id: string, name: string, slot: 'head' | 'body' | 'legs' | 'gloves' | 'boots',
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
    piece('nightveil_gloves', 'Nightveil gloves', 'gloves', 27, 4, 590, 'Nu',
      'Ink to the fingertip. Locks describe them as a rumor.'),
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
    skill: 'leatherworking' as const,
    levelReq,
    xp,
    station: 'tanning_rack' as const,
    ticks,
    inputs: [{ item: 'hardened_leather', qty: leather }, { item: 'iron_bar', qty: iron }],
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
    {
      id: 'drakescale_gloves', name: 'Drakescale gloves', slot: 'gloves', armorClass: 'leather',
      levelReq: { skill: 'archery', level: 33 }, armor: 5, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(37, 350, 85, 2, 1),
      value: 750, color, code: 'Qu',
      desc: 'Scale to the second knuckle. You can catch a brand barehanded now.',
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
    skill: 'leatherworking' as const,
    levelReq,
    xp,
    station: 'tanning_rack' as const,
    ticks,
    inputs: feather > 0
      ? [{ item: 'hardened_leather', qty: leather }, { item: 'gold_bar', qty: gold }, { item: 'feather', qty: feather }]
      : [{ item: 'hardened_leather', qty: leather }, { item: 'gold_bar', qty: gold }],
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
    {
      id: 'stagheart_gloves', name: 'Stagheart gloves', slot: 'gloves', armorClass: 'leather',
      levelReq: { skill: 'archery', level: 40 }, armor: 5, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(45, 610, 100, 2, 1, 2),
      value: 1120, color, code: 'Gu',
      desc: 'Bark-backed, gold-stitched, moss at the cuff. The forest\'s grip.',
    },
  ];
}

function hedgemageSet(): EquipmentDef[] {
  const pool: AffixPoolEntry[] = [
    { stat: 'magic', w: 2 },
    { stat: 'herbalism', w: 2 },
    { stat: 'farming' },
    { stat: 'regen' },
  ];
  const color = '#5a6b3a';
  const craft = (levelReq: number, xp: number, ticks: number, cloth: number, extra?: { item: string; qty: number }) => ({
    skill: 'tailoring' as const,
    levelReq,
    xp,
    station: 'loom' as const,
    ticks,
    inputs: extra
      ? [{ item: 'cloth', qty: cloth }, extra]
      : [{ item: 'cloth', qty: cloth }],
  });
  return [
    {
      id: 'hedgemage_hat', name: 'Hedgemage hat', slot: 'head', armorClass: 'cloth',
      levelReq: { skill: 'magic', level: 12 }, armor: 1, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(14, 100, 55, 2, { item: 'moonbell', qty: 1 }),
      value: 190, color, code: 'Hh',
      desc: 'Pointed, patched, and proud of both. Smells faintly of thyme.',
    },
    {
      id: 'hedgemage_robe', name: 'Hedgemage robe', slot: 'body', armorClass: 'cloth',
      levelReq: { skill: 'magic', level: 14 }, armor: 3, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(18, 160, 70, 3, { item: 'twine', qty: 2 }),
      value: 290, color, code: 'Hr',
      desc: 'Every patch was a lesson. The garden grades generously.',
    },
    {
      id: 'hedgemage_skirts', name: 'Hedgemage skirts', slot: 'legs', armorClass: 'cloth',
      levelReq: { skill: 'magic', level: 13 }, armor: 2, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(16, 130, 60, 2, { item: 'twine', qty: 1 }),
      value: 240, color, code: 'Hs',
      desc: 'Hemmed high for mud season. The mud appreciates the effort.',
    },
    {
      id: 'hedgemage_slippers', name: 'Hedgemage slippers', slot: 'boots', armorClass: 'cloth',
      levelReq: { skill: 'magic', level: 12 }, armor: 1, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(15, 110, 55, 2),
      value: 210, color, code: 'Hp',
      desc: 'Soft-soled and garden-stained. The cat approves of the toes.',
    },
    {
      id: 'hedgemage_gloves', name: 'Hedgemage gloves', slot: 'gloves', armorClass: 'cloth',
      levelReq: { skill: 'magic', level: 12 }, armor: 1, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(15, 105, 55, 2, { item: 'sagewort', qty: 1 }),
      value: 215, color, code: 'Hg',
      desc: 'Fingerless for the fiddly charms. Nettles lost this round.',
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
    id: string, name: string, slot: 'head' | 'body' | 'legs' | 'gloves' | 'boots',
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
    piece('tidecaller_gloves', 'Tidecaller gloves', 'gloves', 22, 2, 460, 'Tu',
      'Foam-cuffed, pearl at the wrist. The tide holds your hand back.'),
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
    id: string, name: string, slot: 'head' | 'body' | 'legs' | 'gloves' | 'boots',
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
    piece('voidwhisper_gloves', 'Voidwhisper gloves', 'gloves', 27, 2, 610, 'Vu',
      'An eye in each palm. Applaud carefully.'),
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
    skill: 'tailoring' as const,
    levelReq,
    xp,
    station: 'loom' as const,
    ticks,
    inputs: [{ item: 'gloomsilk', qty: cloth }, { item: 'wolf_fur', qty: 1 }, { item: 'gold_bar', qty: gold }],
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
    {
      id: 'cindersworn_gloves', name: 'Cindersworn gloves', slot: 'gloves', armorClass: 'cloth',
      levelReq: { skill: 'magic', level: 33 }, armor: 2, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(37, 350, 85, 2, 1),
      value: 770, color, code: 'Cu',
      desc: 'Char-black palms, ember-lined cuffs. Snap, and mean it.',
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
    skill: 'tailoring' as const,
    levelReq,
    xp,
    station: 'loom' as const,
    ticks,
    inputs: moonbell > 0
      ? [{ item: 'gloomsilk', qty: cloth }, { item: 'gold_bar', qty: gold }, { item: 'moonbell', qty: moonbell }]
      : [{ item: 'gloomsilk', qty: cloth }, { item: 'gold_bar', qty: gold }],
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
    {
      id: 'starweaver_gloves', name: 'Starweaver gloves', slot: 'gloves', armorClass: 'cloth',
      levelReq: { skill: 'magic', level: 40 }, armor: 3, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(45, 610, 100, 2, 1, 1),
      value: 1160, color, code: 'Sy',
      desc: 'A star sapphire on each hand. Constellations take requests.',
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
  /**
   * Re-forge lot: replace a base recipe input (the metal bar) instead of
   * appending a dye — "the same armor, hammered out of a different ore".
   * Quantity carries over from the input it replaces.
   */
  swapInput?: { from: string; to: string };
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
      let inputs = cw.dyeInput ? [...p.recipe.inputs, cw.dyeInput] : [...p.recipe.inputs];
      if (cw.swapInput) {
        const { from, to } = cw.swapInput;
        inputs = inputs.map((inp) => (inp.item === from ? { item: to, qty: inp.qty } : inp));
      }
      v.recipe = { ...p.recipe, inputs };
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
    skill: 'tailoring' as const,
    levelReq,
    xp,
    station: 'loom' as const,
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
    {
      id: 'thistledown_wraps', name: 'Thistledown wraps', slot: 'gloves', armorClass: 'cloth',
      levelReq: { skill: 'magic', level: 2 }, armor: 1, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(2, 22, 35, 1),
      value: 32, color, code: 'Lw',
      desc: 'Linen wound to the knuckle. Warm hands, willing sparks.',
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
    id: string, name: string, slot: 'head' | 'body' | 'legs' | 'gloves' | 'boots',
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
    piece('mothwing_wraps', 'Mothwing wraps', 'gloves', 6, 1, 98, 'Mw',
      'Wing-dust on the fingertips. Everything you touch glows a little.'),
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
    skill: 'tailoring' as const,
    levelReq,
    xp,
    station: 'loom' as const,
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
    {
      id: 'dawnsworn_wraps', name: 'Dawnsworn wraps', slot: 'gloves', armorClass: 'cloth',
      levelReq: { skill: 'magic', level: 10 }, armor: 1, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(13, 90, 55, 2),
      value: 175, color, code: 'Aw',
      desc: 'Gold-banded ivory. Morning light stays where you put it.',
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
    id: string, name: string, slot: 'head' | 'body' | 'legs' | 'gloves' | 'boots',
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
    piece('fenwalker_wraps', 'Fenwalker wraps', 'gloves', 14, 2, 290, 'Fw',
      'Reed-wound wrists, a wisp-rune in each palm. The bog waves back.'),
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
    skill: 'tailoring' as const,
    levelReq,
    xp,
    station: 'loom' as const,
    ticks,
    inputs: [{ item: 'linen', qty: cloth }, { item: 'iron_bar', qty: 1 }],
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
    {
      id: 'stormwoven_wraps', name: 'Stormwoven wraps', slot: 'gloves', armorClass: 'cloth',
      levelReq: { skill: 'magic', level: 17 }, armor: 2, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(21, 175, 70, 2),
      value: 370, color, code: 'Zw',
      desc: 'A gold bolt down each wrist. Point at nothing you like.',
    },
  ];
}

function earlyLeatherDefs(): EquipmentDef[] {
  const hareswift = hareswiftSet();
  const kingfisher = kingfisherSet();
  const cutpurse = cutpurseSet();
  const trapline = traplineSet();
  const emberfox = emberfoxSet();
  return [
    // -------- Hareswift: pale oat leather with white hare-fur and tall
    // black-tipped ears on the hood. The courier's first leathers — fast
    // feet, faster excuses. The craft line every fletcher starts in.
    ...hareswift,
    ...colorways(hareswift, [
      { key: 'clover', dye: 'Clover', color: '#7a9a58', dyeInput: { item: 'sagewort', qty: 2 },
        desc: 'Spring-meadow green. Eat, run, repeat.' },
      { key: 'snowmelt', dye: 'Snowmelt', color: '#cfd2ca', dyeInput: { item: 'cotton', qty: 2 },
        desc: 'Winter-coat white a week too late. Still lucky.' },
      { key: 'sorrel', dye: 'Sorrel', color: '#a86a48', dyeInput: { item: 'berries', qty: 2 },
        desc: 'Warm chestnut-red, the hare the hounds never caught.' },
    ]),
    // -------- Kingfisher: teal leather with a flame-orange breast and a
    // dagger of a feather at the temple. The river poacher's craft line —
    // patient, bright, gone before the splash lands.
    ...kingfisher,
    ...colorways(kingfisher, [
      { key: 'reedmace', dye: 'Reedmace', color: '#6a8a4a', dyeInput: { item: 'sagewort', qty: 2 },
        desc: 'Rush-green for waiting in. The river forgets you first.' },
      { key: 'stormgull', dye: 'Stormgull', color: '#9aa8b0', dyeInput: { item: 'cotton', qty: 2 },
        desc: 'Spray-grey wings over white water. Loud coast, quiet work.' },
      { key: 'sundart', dye: 'Sundart', color: '#d8a03c', dyeInput: { item: 'sunflower', qty: 2 },
        desc: 'The flash the fish sees last.' },
    ]),
    // -------- Cutpurse: umber leather under a brass coin device and a
    // half-mask. Drop-only — the guild does not sell its colors, you
    // take them off somebody who stopped needing them.
    ...cutpurse,
    ...colorways(cutpurse, [
      { key: 'alleyrat', dye: 'Alleyrat', color: '#5c5c56',
        desc: 'Gutter-grey. The lamplight owes you nothing and pays it.' },
      { key: 'moonless', dye: 'Moonless', color: '#33303c',
        desc: 'Ink on ink. Worn on the nights the job is real.' },
      { key: 'redhand', dye: 'Redhand', color: '#6e3a34',
        desc: 'Oxblood leather. Caught once, never twice.' },
    ]),
    // -------- Trapline: rawhide and fir hung with a toggled bandolier,
    // snare-cord wraps and a fur-ruffed hood. The trapper's craft line —
    // everything on the belt has caught something.
    ...trapline,
    ...colorways(trapline, [
      { key: 'juniper', dye: 'Juniper', color: '#4e6a52', dyeInput: { item: 'sagewort', qty: 2 },
        desc: 'High-ridge green. The cold keeps the fur honest.' },
      { key: 'riverclay', dye: 'Riverclay', color: '#96604c', dyeInput: { item: 'berries', qty: 2 },
        desc: 'Bank-mud red, proof against wet mornings.' },
      { key: 'nightsnare', dye: 'Nightsnare', color: '#3e4450', dyeInput: { item: 'moonbell', qty: 1 },
        desc: 'Set at dusk, checked at dawn. Blue-dark in between.' },
    ]),
    // -------- Emberfox: russet fox leather with black-socked legs, a
    // cream bib and a brush tail swinging at the hip. Drop-only — the
    // early road's showpiece, and it knows it.
    ...emberfox,
    ...colorways(emberfox, [
      { key: 'silverfox', dye: 'Silverfox', color: '#8a8e96',
        desc: 'Frost-grey guard hairs. Rare in the wild, rarer worn.' },
      { key: 'shadowfox', dye: 'Shadowfox', color: '#3a3640',
        desc: 'Charcoal melt. The henhouse never files a report.' },
      { key: 'dawnfox', dye: 'Dawnfox', color: '#d8b878',
        desc: 'Pale gold at first light, gone by second.' },
    ]),
  ];
}

function hareswiftSet(): EquipmentDef[] {
  const pool: AffixPoolEntry[] = [
    { stat: 'archery', w: 2 },
    { stat: 'sneak' },
    { stat: 'foraging' },
    { stat: 'regen' },
  ];
  const color = '#c2a878';
  const craft = (levelReq: number, xp: number, ticks: number, leather: number) => ({
    skill: 'leatherworking' as const,
    levelReq,
    xp,
    station: 'tanning_rack' as const,
    ticks,
    inputs: [{ item: 'leather', qty: leather }, { item: 'twine', qty: 1 }],
  });
  return [
    {
      id: 'hareswift_hood', name: 'Hareswift hood', slot: 'head', armorClass: 'leather',
      levelReq: { skill: 'archery', level: 2 }, armor: 1, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(2, 20, 35, 1),
      value: 30, color, code: 'Jh',
      desc: 'Tall ears, black at the tips. You hear the bowstring first.',
    },
    {
      id: 'hareswift_jerkin', name: 'Hareswift jerkin', slot: 'body', armorClass: 'leather',
      levelReq: { skill: 'archery', level: 4 }, armor: 3, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(5, 40, 50, 2),
      value: 55, color, code: 'Jj',
      desc: 'Oat-pale leather, fur at the throat. Built for the getaway.',
    },
    {
      id: 'hareswift_chaps', name: 'Hareswift chaps', slot: 'legs', armorClass: 'leather',
      levelReq: { skill: 'archery', level: 3 }, armor: 2, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(3, 30, 40, 1),
      value: 40, color, code: 'Jc',
      desc: 'Wrapped light at the knee. Hedgerows barely notice.',
    },
    {
      id: 'hareswift_boots', name: 'Hareswift boots', slot: 'boots', armorClass: 'leather',
      levelReq: { skill: 'archery', level: 2 }, armor: 1, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(2, 25, 35, 1),
      value: 35, color, code: 'Jb',
      desc: 'Fur-topped and spring-loaded. Zigzag comes standard.',
    },
    {
      id: 'hareswift_gloves', name: 'Hareswift gloves', slot: 'gloves', armorClass: 'leather',
      levelReq: { skill: 'archery', level: 2 }, armor: 1, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(2, 22, 35, 1),
      value: 33, color, code: 'Jg',
      desc: 'Hare-fur cuffs, nimble fingers. Fast hands finish first.',
    },
  ];
}

function kingfisherSet(): EquipmentDef[] {
  const pool: AffixPoolEntry[] = [
    { stat: 'archery', w: 2 },
    { stat: 'fishing', w: 2 },
    { stat: 'sneak' },
    { stat: 'maxHp' },
  ];
  const color = '#2f7a8a';
  const craft = (levelReq: number, xp: number, ticks: number, leather: number) => ({
    skill: 'leatherworking' as const,
    levelReq,
    xp,
    station: 'tanning_rack' as const,
    ticks,
    inputs: [{ item: 'leather', qty: leather }, { item: 'feather', qty: 2 }],
  });
  return [
    {
      id: 'kingfisher_hood', name: 'Kingfisher hood', slot: 'head', armorClass: 'leather',
      levelReq: { skill: 'archery', level: 6 }, armor: 2, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(7, 55, 45, 1),
      value: 95, color, code: 'Oh',
      desc: 'A flame feather at the temple. The river reads it as local.',
    },
    {
      id: 'kingfisher_jerkin', name: 'Kingfisher jerkin', slot: 'body', armorClass: 'leather',
      levelReq: { skill: 'archery', level: 8 }, armor: 4, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(11, 90, 60, 2),
      value: 140, color, code: 'Oj',
      desc: 'Teal back, orange breast, feathered shoulders. Dive dressed.',
    },
    {
      id: 'kingfisher_chaps', name: 'Kingfisher chaps', slot: 'legs', armorClass: 'leather',
      levelReq: { skill: 'archery', level: 7 }, armor: 3, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(9, 70, 50, 2),
      value: 115, color, code: 'Oc',
      desc: 'Waxed against the spray. Perch anywhere, answer nothing.',
    },
    {
      id: 'kingfisher_boots', name: 'Kingfisher boots', slot: 'boots', armorClass: 'leather',
      levelReq: { skill: 'archery', level: 6 }, armor: 2, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(8, 60, 45, 1),
      value: 100, color, code: 'Ob',
      desc: 'Dry inside, always. The bank mud files a complaint.',
    },
    {
      id: 'kingfisher_gloves', name: 'Kingfisher gloves', slot: 'gloves', armorClass: 'leather',
      levelReq: { skill: 'archery', level: 6 }, armor: 2, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(8, 58, 45, 1),
      value: 98, color, code: 'Og',
      desc: 'Teal-backed, orange at the palm. The strike half of the bird.',
    },
  ];
}

function cutpurseSet(): EquipmentDef[] {
  const pool: AffixPoolEntry[] = [
    { stat: 'sneak', w: 2 },
    { stat: 'archery' },
    { stat: 'tailoring' },
    { stat: 'maxHp' },
  ];
  const color = '#4e4438';
  const piece = (
    id: string, name: string, slot: 'head' | 'body' | 'legs' | 'gloves' | 'boots',
    level: number, armor: number, value: number, code: string, desc: string,
  ): EquipmentDef => ({
    id, name, slot, armorClass: 'leather',
    levelReq: { skill: 'sneak', level }, armor, affixPool: pool,
    acquisition: { drop: true }, value, color, code, desc,
  });
  return [
    piece('cutpurse_cowl', 'Cutpurse cowl', 'head', 10, 2, 170, 'Ph',
      'Cowl and kerchief. The face is nobody; the hands are famous.'),
    piece('cutpurse_jerkin', 'Cutpurse jerkin', 'body', 12, 4, 240, 'Pj',
      'A brass coin over the heart — the only one it ever paid for.'),
    piece('cutpurse_leggings', 'Cutpurse leggings', 'legs', 11, 3, 205, 'Pc',
      'Bound at the seams for rooftops. Tiles keep the secret.'),
    piece('cutpurse_boots', 'Cutpurse boots', 'boots', 10, 2, 180, 'Pb',
      'Soft-soled and unsigned. Every step is deniable.'),
    piece('cutpurse_gloves', 'Cutpurse gloves', 'gloves', 10, 2, 175, 'Pg',
      'Fingerless, famously. The hands the guild took its colors from.'),
  ];
}

function traplineSet(): EquipmentDef[] {
  const pool: AffixPoolEntry[] = [
    { stat: 'archery', w: 2 },
    { stat: 'beastcraft', w: 2 },
    { stat: 'foraging' },
    { stat: 'maxHp' },
  ];
  const color = '#8a7248';
  const craft = (levelReq: number, xp: number, ticks: number, leather: number) => ({
    skill: 'leatherworking' as const,
    levelReq,
    xp,
    station: 'tanning_rack' as const,
    ticks,
    inputs: [{ item: 'leather', qty: leather }, { item: 'twine', qty: 2 }],
  });
  return [
    {
      id: 'trapline_hood', name: 'Trapline hood', slot: 'head', armorClass: 'leather',
      levelReq: { skill: 'archery', level: 14 }, armor: 3, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(16, 120, 55, 2),
      value: 280, color, code: 'Xh',
      desc: 'Fur-ruffed against the ridge wind. Patience wears it well.',
    },
    {
      id: 'trapline_jerkin', name: 'Trapline jerkin', slot: 'body', armorClass: 'leather',
      levelReq: { skill: 'archery', level: 16 }, armor: 5, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(20, 190, 70, 3),
      value: 390, color, code: 'Xj',
      desc: 'A bone-toggled bandolier across rawhide. Every loop earned.',
    },
    {
      id: 'trapline_chaps', name: 'Trapline chaps', slot: 'legs', armorClass: 'leather',
      levelReq: { skill: 'archery', level: 15 }, armor: 4, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(18, 155, 60, 2),
      value: 330, color, code: 'Xc',
      desc: 'Waxed to the thigh. The bog and the briar both gave up.',
    },
    {
      id: 'trapline_boots', name: 'Trapline boots', slot: 'boots', armorClass: 'leather',
      levelReq: { skill: 'archery', level: 14 }, armor: 3, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(17, 130, 55, 2),
      value: 300, color, code: 'Xb',
      desc: 'Snare-cord laced to the shin. They walk their own line.',
    },
    {
      id: 'trapline_gloves', name: 'Trapline gloves', slot: 'gloves', armorClass: 'leather',
      levelReq: { skill: 'archery', level: 14 }, armor: 3, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(17, 125, 55, 2),
      value: 290, color, code: 'Xg',
      desc: 'Rawhide backs, snare-cord wrists. Ten fingers, still.',
    },
  ];
}

function emberfoxSet(): EquipmentDef[] {
  const pool: AffixPoolEntry[] = [
    { stat: 'sneak', w: 2 },
    { stat: 'archery', w: 2 },
    { stat: 'herbalism' },
    { stat: 'regen' },
  ];
  const color = '#b05a30';
  const piece = (
    id: string, name: string, slot: 'head' | 'body' | 'legs' | 'gloves' | 'boots',
    level: number, armor: number, value: number, code: string, desc: string,
  ): EquipmentDef => ({
    id, name, slot, armorClass: 'leather',
    levelReq: { skill: 'archery', level }, armor, affixPool: pool,
    acquisition: { drop: true }, value, color, code, desc,
  });
  return [
    piece('emberfox_hood', 'Emberfox hood', 'head', 17, 3, 360, 'Uh',
      'Russet ears, black-tipped, always turned the right way.'),
    piece('emberfox_jerkin', 'Emberfox jerkin', 'body', 19, 6, 500, 'Uj',
      'Cream at the throat, a brush tail at the hip. Vanity, weaponized.'),
    piece('emberfox_leggings', 'Emberfox leggings', 'legs', 18, 4, 430, 'Uc',
      'Black to the knee, the fox\'s own socks. Snow tells no one.'),
    piece('emberfox_boots', 'Emberfox boots', 'boots', 17, 3, 380, 'Ub',
      'Four soft points of contact. The ground agrees to lie.'),
    piece('emberfox_gloves', 'Emberfox gloves', 'gloves', 17, 3, 370, 'Ug',
      'Black to the wrist, the fox\'s own socks. Reach in anywhere.'),
  ];
}

function earlyPlateDefs(): EquipmentDef[] {
  const tuskguard = tuskguardSet();
  const valiant = valiantSet();
  const ramwall = ramwallSet();
  const briarplate = briarplateSet();
  const sentinel = sentinelSet();
  return [
    // -------- Tuskguard: burnished bronze behind boar tusks and a
    // bristle crest. The first plate a fighter ever wears — and it
    // re-forges from every bar the mine gives up.
    ...tuskguard,
    ...colorways(tuskguard, [
      { key: 'ironshod', dye: 'Ironshod', color: '#8d9299', swapInput: { from: 'bronze_bar', to: 'iron_bar' },
        desc: 'The same boar, hammered from honest iron.' },
      { key: 'gilded', dye: 'Gilded', color: '#d8ac44', swapInput: { from: 'bronze_bar', to: 'gold_bar' },
        desc: 'Gold over tusk and brow. Reckless. Magnificent.' },
      { key: 'ashen', dye: 'Ashen', color: '#4a4644', dyeInput: { item: 'coal', qty: 2 },
        desc: 'Coal-quenched black. The boar hunts at night now.' },
    ]),
    // -------- Valiant: bright tourney plate under a forged crest and a
    // tall plume — the storybook knight, enameled to order.
    ...valiant,
    ...colorways(valiant, [
      { key: 'crimson', dye: 'Crimson', color: '#a83a38', dyeInput: { item: 'berries', qty: 3 },
        desc: 'Tourney red enamel. The crowd remembers this one.' },
      { key: 'azure', dye: 'Azure', color: '#4a5f9c', dyeInput: { item: 'moonbell', qty: 1 },
        desc: 'Heraldic blue, white at the crest. Sworn to the river keep.' },
      { key: 'gilded', dye: 'Gilded', color: '#d8ac44', swapInput: { from: 'iron_bar', to: 'gold_bar' },
        desc: 'The champion\'s finish — gold from crest to heel.' },
    ]),
    // -------- Ramwall: fluted slate iron under great curled ram horns.
    // A walking keep; doors think twice.
    ...ramwall,
    ...colorways(ramwall, [
      { key: 'steelhorn', dye: 'Steelhorn', color: '#b8bec8', swapInput: { from: 'iron_bar', to: 'steel_bar' },
        desc: 'Bright steel re-forge. The wall, but polished.' },
      { key: 'goldhorn', dye: 'Goldhorn', color: '#7a7466', dyeInput: { item: 'gold_bar', qty: 1 },
        desc: 'Gilded horns on storm-grey plate. Rank, worn heavy.' },
      { key: 'stormram', dye: 'Stormram', color: '#3e4148', dyeInput: { item: 'coal', qty: 2 },
        desc: 'Coal-dark and spiked at the shoulder. The wall pushes back.' },
    ]),
    // -------- Briarplate: thorn-worked green-black plate, drop-only —
    // grown, the woods insist, not forged.
    ...briarplate,
    ...colorways(briarplate, [
      { key: 'bloodbriar', dye: 'Bloodbriar', color: '#5c3230',
        desc: 'Rust-red thorns. Something watered them.' },
      { key: 'bonebriar', dye: 'Bonebriar', color: '#b0a890',
        desc: 'Pale as winter deadfall, thorned twice as deep.' },
      { key: 'nightbriar', dye: 'Nightbriar', color: '#38304a',
        desc: 'Violet-black bramble. The hedge keeps its own hours.' },
    ]),
    // -------- Sentinel: gunmetal vigil plate under a spiked crown and
    // swept fins — the crypt watch's own issue, drop-only.
    ...sentinel,
    ...colorways(sentinel, [
      { key: 'daybreak', dye: 'Daybreak', color: '#cfc4a8',
        desc: 'Vigil kept until dawn — winged, white-gold, unblinking.' },
      { key: 'bloodwatch', dye: 'Bloodwatch', color: '#6e3038',
        desc: 'The watch that ended badly. The plate remembers.' },
      { key: 'midnight', dye: 'Midnight', color: '#2e3244',
        desc: 'Third bell. Nothing moves, and it sees all of it.' },
    ]),
  ];
}

function tuskguardSet(): EquipmentDef[] {
  const pool: AffixPoolEntry[] = [
    { stat: 'melee', w: 2 },
    { stat: 'defence', w: 2 },
    { stat: 'mining' },
    { stat: 'maxHp' },
  ];
  const color = '#a4744b';
  const craft = (levelReq: number, xp: number, ticks: number, bars: number) => ({
    skill: 'smithing' as const,
    levelReq,
    xp,
    station: 'anvil' as const,
    ticks,
    inputs: [{ item: 'bronze_bar', qty: bars }],
  });
  return [
    {
      id: 'tuskguard_helm', name: 'Tuskguard helm', slot: 'head', armorClass: 'plate',
      levelReq: { skill: 'defence', level: 2 }, armor: 2, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(2, 25, 40, 1),
      value: 30, color, code: 'Tg',
      desc: 'Bronze tusks off the jaw, bristles up the crown. Charge first.',
    },
    {
      id: 'tuskguard_platebody', name: 'Tuskguard platebody', slot: 'body', armorClass: 'plate',
      levelReq: { skill: 'defence', level: 4 }, armor: 4, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(6, 50, 55, 2),
      value: 55, color, code: 'Tj',
      desc: 'A boar\'s share of bronze. It has never once backed up.',
    },
    {
      id: 'tuskguard_greaves', name: 'Tuskguard greaves', slot: 'legs', armorClass: 'plate',
      levelReq: { skill: 'defence', level: 3 }, armor: 3, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(4, 35, 45, 1),
      value: 40, color, code: 'Tc',
      desc: 'Bronze to the knee. Underbrush files no further objections.',
    },
    {
      id: 'tuskguard_sabatons', name: 'Tuskguard sabatons', slot: 'boots', armorClass: 'plate',
      levelReq: { skill: 'defence', level: 2 }, armor: 2, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(3, 30, 40, 1),
      value: 35, color, code: 'Tb',
      desc: 'Hoof-heavy bronze. The ground learns your name by heart.',
    },
    {
      id: 'tuskguard_gauntlets', name: 'Tuskguard gauntlets', slot: 'gloves', armorClass: 'plate',
      levelReq: { skill: 'defence', level: 2 }, armor: 2, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(3, 28, 40, 1),
      value: 33, color, code: 'Tw',
      desc: 'A tusk stud over each knuckle. The boar shakes hands first.',
    },
  ];
}

function valiantSet(): EquipmentDef[] {
  const pool: AffixPoolEntry[] = [
    { stat: 'melee', w: 2 },
    { stat: 'defence', w: 2 },
    { stat: 'vitality' },
    { stat: 'regen' },
  ];
  const color = '#c9ccd4';
  const craft = (levelReq: number, xp: number, ticks: number, bars: number) => ({
    skill: 'smithing' as const,
    levelReq,
    xp,
    station: 'anvil' as const,
    ticks,
    inputs: [{ item: 'iron_bar', qty: bars }],
  });
  return [
    {
      id: 'valiant_helm', name: 'Valiant helm', slot: 'head', armorClass: 'plate',
      levelReq: { skill: 'defence', level: 6 }, armor: 3, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(8, 60, 50, 1),
      value: 95, color, code: 'Vv',
      desc: 'Forged crest, tall plume. The storybooks drew it from this.',
    },
    {
      id: 'valiant_platebody', name: 'Valiant platebody', slot: 'body', armorClass: 'plate',
      levelReq: { skill: 'defence', level: 8 }, armor: 5, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(12, 100, 65, 2),
      value: 140, color, code: 'Vj',
      desc: 'Mirror-bright plate behind a gold chevron. Stand where it shines.',
    },
    {
      id: 'valiant_greaves', name: 'Valiant greaves', slot: 'legs', armorClass: 'plate',
      levelReq: { skill: 'defence', level: 7 }, armor: 4, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(10, 80, 55, 1),
      value: 115, color, code: 'Vc',
      desc: 'Polished to parade order. They march even standing still.',
    },
    {
      id: 'valiant_sabatons', name: 'Valiant sabatons', slot: 'boots', armorClass: 'plate',
      levelReq: { skill: 'defence', level: 6 }, armor: 3, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(9, 65, 50, 1),
      value: 100, color, code: 'Vb',
      desc: 'Gold-toed and certain. Every step files a heroic report.',
    },
    {
      id: 'valiant_gauntlets', name: 'Valiant gauntlets', slot: 'gloves', armorClass: 'plate',
      levelReq: { skill: 'defence', level: 6 }, armor: 3, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(9, 62, 50, 1),
      value: 98, color, code: 'Vw',
      desc: 'Mirror-bright, gold at the cuff. Made for raising a champion\'s cup.',
    },
  ];
}

function ramwallSet(): EquipmentDef[] {
  const pool: AffixPoolEntry[] = [
    { stat: 'defence', w: 3 },
    { stat: 'melee' },
    { stat: 'smithing' },
    { stat: 'maxHp' },
  ];
  const color = '#6a7080';
  const craft = (levelReq: number, xp: number, ticks: number, bars: number) => ({
    skill: 'smithing' as const,
    levelReq,
    xp,
    station: 'anvil' as const,
    ticks,
    inputs: [{ item: 'iron_bar', qty: bars }],
  });
  return [
    {
      id: 'ramwall_helm', name: 'Ramwall helm', slot: 'head', armorClass: 'plate',
      levelReq: { skill: 'defence', level: 10 }, armor: 3, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(14, 110, 60, 2),
      value: 170, color, code: 'Rr',
      desc: 'Great curled horns over cheek plate. Gates negotiate now.',
    },
    {
      id: 'ramwall_platebody', name: 'Ramwall platebody', slot: 'body', armorClass: 'plate',
      levelReq: { skill: 'defence', level: 12 }, armor: 6, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(18, 170, 75, 3),
      value: 240, color, code: 'Rj',
      desc: 'Fluted slate iron, tassets to the thigh. A keep that walks.',
    },
    {
      id: 'ramwall_greaves', name: 'Ramwall greaves', slot: 'legs', armorClass: 'plate',
      levelReq: { skill: 'defence', level: 11 }, armor: 4, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(16, 140, 65, 2),
      value: 205, color, code: 'Rw',
      desc: 'Pillar-set greaves. Shoving matches end at the knee.',
    },
    {
      id: 'ramwall_sabatons', name: 'Ramwall sabatons', slot: 'boots', armorClass: 'plate',
      levelReq: { skill: 'defence', level: 10 }, armor: 3, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(15, 120, 60, 2),
      value: 180, color, code: 'Rb',
      desc: 'Foundation stones with laces. Braced is the resting state.',
    },
    {
      id: 'ramwall_gauntlets', name: 'Ramwall gauntlets', slot: 'gloves', armorClass: 'plate',
      levelReq: { skill: 'defence', level: 10 }, armor: 3, affixPool: pool,
      acquisition: { craft: true }, recipe: craft(15, 115, 60, 2),
      value: 175, color, code: 'Ru',
      desc: 'Fluted slate fists. Knock once; the door does the math.',
    },
  ];
}

function briarplateSet(): EquipmentDef[] {
  const pool: AffixPoolEntry[] = [
    { stat: 'melee', w: 3 },
    { stat: 'defence' },
    { stat: 'foraging' },
    { stat: 'maxHp' },
  ];
  const color = '#3e4a38';
  const piece = (
    id: string, name: string, slot: 'head' | 'body' | 'legs' | 'gloves' | 'boots',
    level: number, armor: number, value: number, code: string, desc: string,
  ): EquipmentDef => ({
    id, name, slot, armorClass: 'plate',
    levelReq: { skill: 'melee', level }, armor, affixPool: pool,
    acquisition: { drop: true }, value, color, code, desc,
  });
  return [
    piece('briarplate_helm', 'Briarplate helm', 'head', 14, 4, 280, 'Eh',
      'Thorn horns off a green-black skull. The hedge crowned somebody.'),
    piece('briarplate_platebody', 'Briarplate platebody', 'body', 16, 6, 390, 'Ej',
      'Plate grown over with iron bramble. Grabbing it is the mistake.'),
    piece('briarplate_greaves', 'Briarplate greaves', 'legs', 15, 5, 330, 'Ec',
      'Thorn-ridged to the shin. Walk anywhere; the briar signs off.'),
    piece('briarplate_sabatons', 'Briarplate sabatons', 'boots', 14, 4, 300, 'Eb',
      'Spiked at the toe like a rose remembers. Kick politely.'),
    piece('briarplate_gauntlets', 'Briarplate gauntlets', 'gloves', 14, 4, 290, 'Eu',
      'A thorn at every knuckle. The hedge grips back.'),
  ];
}

function sentinelSet(): EquipmentDef[] {
  const pool: AffixPoolEntry[] = [
    { stat: 'defence', w: 2 },
    { stat: 'melee', w: 2 },
    { stat: 'vitality' },
    { stat: 'regen' },
  ];
  const color = '#55607a';
  const piece = (
    id: string, name: string, slot: 'head' | 'body' | 'legs' | 'gloves' | 'boots',
    level: number, armor: number, value: number, code: string, desc: string,
  ): EquipmentDef => ({
    id, name, slot, armorClass: 'plate',
    levelReq: { skill: 'defence', level }, armor, affixPool: pool,
    acquisition: { drop: true }, value, color, code, desc,
  });
  return [
    piece('sentinel_greathelm', 'Sentinel greathelm', 'head', 17, 4, 360, 'Sv',
      'A spiked crown over a cross visor. The vigil wears its own hours.'),
    piece('sentinel_platebody', 'Sentinel platebody', 'body', 19, 7, 500, 'Sj',
      'Gunmetal fluting under bladed shoulders. Night shifts, plural.'),
    piece('sentinel_greaves', 'Sentinel greaves', 'legs', 18, 5, 430, 'Sq',
      'Stood so many watches they stand themselves. Heels together.'),
    piece('sentinel_sabatons', 'Sentinel sabatons', 'boots', 17, 4, 380, 'Se',
      'Iron soles that have never once fallen asleep on duty.'),
    piece('sentinel_gauntlets', 'Sentinel gauntlets', 'gloves', 17, 4, 370, 'Sz',
      'Gunmetal grip, gold-studded knuckles. The watch signs in.'),
  ];
}

// ------------------------------------------------------ the blade roster
// Twenty sword designs. Authoring laws: a metal ladder is real stat
// progression (damage, gates, recipe metal all climb), so smithing lines
// are generated defs, not colorways; every signature blade names its own
// Weapon Art; drop-only finds restrict `rarities` as they climb so the
// chase steepens — the heirloom at the top only exists legendary.

/** One smithing design forged across the metal ladder. */
interface MetalStep {
  metal: 'bronze' | 'iron' | 'steel' | 'gold' | 'mithril' | 'adamant' | 'obsidian' | 'starsteel';
  bar: string;
  color: string;
  damage: number;
  meleeReq: number;
  smithReq: number;
  xp: number;
  value: number;
  code: string;
  desc: string;
}

function metalLine(
  design: {
    key: string;
    name: string;
    cooldownTicks: number;
    range: number;
    art: string;
    backstabMult?: number;
    bars: number;
    ticks: number;
    pool: AffixPoolEntry[];
  },
  steps: MetalStep[],
): EquipmentDef[] {
  return steps.map((m) => {
    const weapon: EquipmentDef['weapon'] = {
      style: 'melee',
      damage: m.damage,
      cooldownTicks: design.cooldownTicks,
      range: design.range,
      art: design.art,
    };
    if (design.backstabMult) weapon.backstabMult = design.backstabMult;
    const def: EquipmentDef = {
      id: m.metal === 'bronze' ? design.key : `${m.metal}_${design.key}`,
      name: m.metal === 'bronze'
        ? design.name
        : `${m.metal.charAt(0).toUpperCase()}${m.metal.slice(1)} ${design.name.toLowerCase()}`,
      slot: 'weapon',
      weapon,
      affixPool: design.pool,
      acquisition: { craft: true },
      recipe: {
        skill: 'smithing', levelReq: m.smithReq, xp: m.xp, station: 'anvil',
        ticks: design.ticks, inputs: [{ item: m.bar, qty: design.bars }],
      },
      value: m.value, color: m.color, code: m.code, desc: m.desc,
    };
    if (m.meleeReq > 1) def.levelReq = { skill: 'melee', level: m.meleeReq };
    return def;
  });
}

function swordDefs(): EquipmentDef[] {
  // Pools: every sword leans melee; the flavor stats tell its story.
  const SOLDIER_POOL: AffixPoolEntry[] = [
    { stat: 'melee', w: 3 },
    { stat: 'defence' },
    { stat: 'vitality' },
    { stat: 'maxHp' },
  ];
  const ROGUE_POOL: AffixPoolEntry[] = [
    { stat: 'melee', w: 2 },
    { stat: 'sneak', w: 2 },
    { stat: 'vitality' },
    { stat: 'maxHp' },
  ];

  // ---- the classic arming line, migrated into the schema: same ids,
  // stats and recipe numbers the game shipped with, now rolled gear.
  // Existing DB rows adopt gracefully (roll-less ⇒ common/seed 0).
  const arming: EquipmentDef[] = [
    {
      id: 'bronze_sword', name: 'Bronze sword', slot: 'weapon',
      weapon: { style: 'melee', damage: 1, cooldownTicks: 7, range: 1.7, art: 'crescent_sweep' },
      affixPool: SOLDIER_POOL,
      acquisition: { craft: true, shop: true, drop: true },
      recipe: {
        skill: 'smithing', levelReq: 4, xp: 60, station: 'anvil', ticks: 60,
        inputs: [{ item: 'bronze_bar', qty: 2 }],
      },
      value: 32, color: '#a4744b', code: 'Sw',
      desc: 'Every hero\'s first blade. Swings quick, bites small.',
    },
    {
      id: 'iron_sword', name: 'Iron sword', slot: 'weapon',
      levelReq: { skill: 'melee', level: 10 },
      weapon: { style: 'melee', damage: 2, cooldownTicks: 7, range: 1.95, art: 'lunge' },
      affixPool: SOLDIER_POOL,
      acquisition: { craft: true, drop: true },
      recipe: {
        skill: 'smithing', levelReq: 18, xp: 130, station: 'anvil', ticks: 70,
        inputs: [{ item: 'iron_bar', qty: 2 }],
      },
      value: 90, color: '#8d9299', code: 'Is',
      desc: 'A longer reach and a colder edge than bronze.',
    },
    {
      id: 'steel_sword', name: 'Steel sword', slot: 'weapon',
      levelReq: { skill: 'melee', level: 20 },
      weapon: { style: 'melee', damage: 3, cooldownTicks: 7, range: 2.05, art: 'shockwave' },
      affixPool: SOLDIER_POOL,
      acquisition: { craft: true },
      recipe: {
        skill: 'smithing', levelReq: 33, xp: 250, station: 'anvil', ticks: 80,
        inputs: [{ item: 'steel_bar', qty: 2 }],
      },
      value: 240, color: '#b8bec8', code: 'Ss',
      desc: 'Anvil-song made solid. It hums when it swings.',
    },
    {
      id: 'mithril_sword', name: 'Mithril sword', slot: 'weapon',
      levelReq: { skill: 'melee', level: 40 },
      weapon: { style: 'melee', damage: 4, cooldownTicks: 7, range: 2.1, art: 'shockwave' },
      affixPool: SOLDIER_POOL,
      acquisition: { craft: true },
      recipe: {
        skill: 'smithing', levelReq: 50, xp: 560, station: 'anvil', ticks: 90,
        inputs: [{ item: 'mithril_bar', qty: 2 }],
      },
      value: 1500, color: '#7fa8d9', code: 'M4',
      desc: 'The blade the smith-songs promised. Light as a good idea.',
    },
    {
      id: 'adamant_sword', name: 'Adamant sword', slot: 'weapon',
      levelReq: { skill: 'melee', level: 55 },
      weapon: { style: 'melee', damage: 5, cooldownTicks: 7, range: 2.15, art: 'shockwave' },
      affixPool: SOLDIER_POOL,
      acquisition: { craft: true },
      recipe: {
        skill: 'smithing', levelReq: 65, xp: 920, station: 'anvil', ticks: 100,
        inputs: [{ item: 'adamant_bar', qty: 2 }],
      },
      value: 3000, color: '#5fa06a', code: 'M5',
      desc: 'Deep-green and patient. Whatever it meets was temporary.',
    },
    {
      id: 'obsidian_sword', name: 'Obsidian sword', slot: 'weapon',
      levelReq: { skill: 'melee', level: 68 },
      weapon: { style: 'melee', damage: 6, cooldownTicks: 7, range: 2.15, art: 'shockwave' },
      affixPool: SOLDIER_POOL,
      acquisition: { craft: true },
      recipe: {
        skill: 'smithing', levelReq: 78, xp: 1350, station: 'anvil', ticks: 110,
        inputs: [{ item: 'obsidian_shard', qty: 3 }],
      },
      value: 4900, color: '#4e4260', code: 'M6',
      desc: 'A blade of cooled night. It does not ring; it whispers.',
    },
    {
      id: 'starsteel_sword', name: 'Starsteel sword', slot: 'weapon',
      levelReq: { skill: 'melee', level: 80 },
      weapon: { style: 'melee', damage: 7, cooldownTicks: 7, range: 2.2, art: 'shockwave' },
      affixPool: SOLDIER_POOL,
      acquisition: { craft: true },
      recipe: {
        skill: 'smithing', levelReq: 90, xp: 1950, station: 'anvil', ticks: 120,
        inputs: [{ item: 'starsteel_bar', qty: 2 }],
      },
      value: 8600, color: '#cabdf2', code: 'M7',
      desc: 'The master smith\'s proof: a sword that remembers the sky.',
    },
  ];

  // ---- the three smithing lines: one design, four metals each.
  const falchion = metalLine(
    {
      key: 'falchion', name: 'Falchion', cooldownTicks: 8, range: 1.8,
      art: 'sundering_chop', bars: 2, ticks: 75, pool: SOLDIER_POOL,
    },
    [
      { metal: 'bronze', bar: 'bronze_bar', color: '#a4744b', damage: 2, meleeReq: 4, smithReq: 8, xp: 55, value: 55, code: 'Fa',
        desc: 'Half sword, half woodaxe, all argument. The village favorite.' },
      { metal: 'iron', bar: 'iron_bar', color: '#8d9299', damage: 3, meleeReq: 14, smithReq: 20, xp: 130, value: 150, code: 'Fi',
        desc: 'Iron gives the chop a voice. Fences and foes both listen.' },
      { metal: 'steel', bar: 'steel_bar', color: '#b8bec8', damage: 4, meleeReq: 28, smithReq: 36, xp: 280, value: 340, code: 'Fj',
        desc: 'A steel wedge with manners. It asks once.' },
      { metal: 'gold', bar: 'gold_bar', color: '#e8c04c', damage: 4, meleeReq: 32, smithReq: 42, xp: 340, value: 780, code: 'Fo',
        desc: 'Too soft for war, says the smith — swinging it anyway, grinning.' },
      { metal: 'mithril', bar: 'mithril_bar', color: '#7fa8d9', damage: 5, meleeReq: 40, smithReq: 52, xp: 620, value: 1600, code: 'F4',
        desc: 'Sky-metal with an axeman\'s temper. The chop arrives early.' },
      { metal: 'adamant', bar: 'adamant_bar', color: '#5fa06a', damage: 6, meleeReq: 55, smithReq: 67, xp: 1000, value: 3200, code: 'F5',
        desc: 'Green as deep water and about as easy to argue with.' },
      { metal: 'obsidian', bar: 'obsidian_shard', color: '#4e4260', damage: 7, meleeReq: 68, smithReq: 80, xp: 1400, value: 5200, code: 'F6',
        desc: 'Knapped volcano glass. The mountain\'s own cleaver.' },
      { metal: 'starsteel', bar: 'starsteel_bar', color: '#cabdf2', damage: 8, meleeReq: 80, smithReq: 92, xp: 2000, value: 9000, code: 'F7',
        desc: 'It fell from the sky once. It has been falling on things since.' },
    ],
  );
  const gladius = metalLine(
    {
      key: 'gladius', name: 'Gladius', cooldownTicks: 6, range: 1.5,
      art: 'lunge', bars: 1, ticks: 60, pool: SOLDIER_POOL,
    },
    [
      { metal: 'bronze', bar: 'bronze_bar', color: '#a4744b', damage: 1, meleeReq: 2, smithReq: 5, xp: 40, value: 38, code: 'Gd',
        desc: 'Short, wide, honest. The point does the talking.' },
      { metal: 'iron', bar: 'iron_bar', color: '#8d9299', damage: 2, meleeReq: 12, smithReq: 18, xp: 110, value: 120, code: 'Gi',
        desc: 'A legion\'s length of iron. Close means yours.' },
      { metal: 'steel', bar: 'steel_bar', color: '#b8bec8', damage: 3, meleeReq: 26, smithReq: 34, xp: 240, value: 300, code: 'Gy',
        desc: 'Steel at parade polish. Steps forward when you do.' },
      { metal: 'gold', bar: 'gold_bar', color: '#e8c04c', damage: 3, meleeReq: 30, smithReq: 40, xp: 300, value: 700, code: 'Gk',
        desc: 'A triumph in arm\'s reach. Generals retire onto these.' },
      { metal: 'mithril', bar: 'mithril_bar', color: '#7fa8d9', damage: 4, meleeReq: 40, smithReq: 50, xp: 560, value: 1450, code: 'G4',
        desc: 'So light the thrust outruns the thought behind it.' },
      { metal: 'adamant', bar: 'adamant_bar', color: '#5fa06a', damage: 5, meleeReq: 55, smithReq: 65, xp: 900, value: 2900, code: 'G5',
        desc: 'Shield-splitter in a short green package.' },
      { metal: 'obsidian', bar: 'obsidian_shard', color: '#4e4260', damage: 6, meleeReq: 68, smithReq: 78, xp: 1300, value: 4700, code: 'G6',
        desc: 'A glass tooth from the world\'s first fire.' },
      { metal: 'starsteel', bar: 'starsteel_bar', color: '#cabdf2', damage: 7, meleeReq: 80, smithReq: 90, xp: 1850, value: 8200, code: 'G7',
        desc: 'The point glows faintly, like it still misses the sky.' },
    ],
  );
  const scimitar = metalLine(
    {
      key: 'scimitar', name: 'Scimitar', cooldownTicks: 6, range: 1.7,
      art: 'crescent_sweep', backstabMult: 1.4, bars: 2, ticks: 70, pool: ROGUE_POOL,
    },
    [
      { metal: 'bronze', bar: 'bronze_bar', color: '#a4744b', damage: 1, meleeReq: 6, smithReq: 12, xp: 70, value: 60, code: 'Sx',
        desc: 'A grin of bronze. Fights sideways, wins sideways.' },
      { metal: 'iron', bar: 'iron_bar', color: '#8d9299', damage: 2, meleeReq: 16, smithReq: 24, xp: 150, value: 170, code: 'Si',
        desc: 'The curve finds what a straight edge misses.' },
      { metal: 'steel', bar: 'steel_bar', color: '#b8bec8', damage: 3, meleeReq: 30, smithReq: 38, xp: 300, value: 380, code: 'Gz',
        desc: 'Quick as gossip and twice as cutting.' },
      { metal: 'gold', bar: 'gold_bar', color: '#e8c04c', damage: 3, meleeReq: 34, smithReq: 44, xp: 360, value: 860, code: 'Kq',
        desc: 'A crescent moon on a velvet night out.' },
      { metal: 'mithril', bar: 'mithril_bar', color: '#7fa8d9', damage: 4, meleeReq: 40, smithReq: 54, xp: 660, value: 1750, code: 'C4',
        desc: 'The curve sings a higher note now. Duck.' },
      { metal: 'adamant', bar: 'adamant_bar', color: '#5fa06a', damage: 5, meleeReq: 55, smithReq: 69, xp: 1050, value: 3400, code: 'C5',
        desc: 'A green sickle that harvests exactly one crop.' },
      { metal: 'obsidian', bar: 'obsidian_shard', color: '#4e4260', damage: 6, meleeReq: 68, smithReq: 82, xp: 1450, value: 5500, code: 'C6',
        desc: 'The night sky, sharpened along one edge.' },
      { metal: 'starsteel', bar: 'starsteel_bar', color: '#cabdf2', damage: 7, meleeReq: 80, smithReq: 94, xp: 2100, value: 9400, code: 'C7',
        desc: 'A comet\'s arc, kept short enough to hold.' },
    ],
  );

  // ---- bespoke crafts: one-off recipes with story ingredients.
  const crafts: EquipmentDef[] = [
    {
      id: 'briarfang', name: 'Briarfang', slot: 'weapon',
      levelReq: { skill: 'melee', level: 15 },
      weapon: { style: 'melee', damage: 3, cooldownTicks: 7, range: 1.9, art: 'thorn_lash' },
      affixPool: [{ stat: 'melee', w: 2 }, { stat: 'foraging' }, { stat: 'vitality' }, { stat: 'regen' }],
      acquisition: { craft: true },
      recipe: {
        skill: 'smithing', levelReq: 20, xp: 180, station: 'anvil', ticks: 80,
        inputs: [{ item: 'bronze_bar', qty: 2 }, { item: 'oak_log', qty: 1 }, { item: 'berries', qty: 3 }],
      },
      value: 260, color: '#5a7a42', code: 'By',
      desc: 'Bronze quenched in berry-dark sap. The hedge kept one thorn for you.',
    },
    {
      id: 'moonshard', name: 'Moonshard', slot: 'weapon',
      levelReq: { skill: 'melee', level: 22 },
      weapon: { style: 'melee', damage: 2, cooldownTicks: 5, range: 2.05, art: 'lunge', backstabMult: 1.5 },
      affixPool: [{ stat: 'melee', w: 2 }, { stat: 'sneak' }, { stat: 'magic' }, { stat: 'maxHp' }],
      acquisition: { craft: true },
      recipe: {
        skill: 'smithing', levelReq: 30, xp: 260, station: 'anvil', ticks: 90,
        inputs: [{ item: 'steel_bar', qty: 1 }, { item: 'gold_bar', qty: 1 }, { item: 'moonbell', qty: 2 }],
      },
      value: 420, color: '#c9d4e8', code: 'Mn',
      desc: 'A needle of night-silver with a moonbell set at the pommel. It hums at dusk.',
    },
    {
      id: 'tidereaver', name: 'Tidereaver', slot: 'weapon',
      levelReq: { skill: 'melee', level: 26 },
      weapon: { style: 'melee', damage: 3, cooldownTicks: 6, range: 1.85, art: 'riptide' },
      affixPool: [{ stat: 'melee', w: 2 }, { stat: 'fishing' }, { stat: 'defence' }, { stat: 'maxHp' }],
      acquisition: { craft: true },
      recipe: {
        skill: 'smithing', levelReq: 34, xp: 320, station: 'anvil', ticks: 95,
        inputs: [{ item: 'steel_bar', qty: 2 }, { item: 'gold_bar', qty: 1 }, { item: 'raw_trout', qty: 1 }],
      },
      value: 520, color: '#3d7a78', code: 'Tv',
      desc: 'Quenched in a living tide — the trout was the tide\'s fee. Shell-guarded, sea-tempered.',
    },
    {
      id: 'emberbrand', name: 'Emberbrand', slot: 'weapon',
      levelReq: { skill: 'melee', level: 30 },
      weapon: { style: 'melee', damage: 4, cooldownTicks: 7, range: 1.9, art: 'cinder_arc' },
      affixPool: [{ stat: 'melee', w: 3 }, { stat: 'smithing' }, { stat: 'vitality' }, { stat: 'maxHp' }],
      acquisition: { craft: true },
      recipe: {
        skill: 'smithing', levelReq: 38, xp: 420, station: 'anvil', ticks: 105,
        inputs: [{ item: 'steel_bar', qty: 2 }, { item: 'coal', qty: 4 }, { item: 'gold_bar', qty: 1 }],
      },
      value: 680, color: '#c4623c', code: 'Em',
      desc: 'Forged and never let cool — a seam of live ember runs the fuller. It remembers the furnace.',
    },
    {
      id: 'dawnbreaker', name: 'Dawnbreaker', slot: 'weapon',
      levelReq: { skill: 'melee', level: 40 },
      weapon: { style: 'melee', damage: 5, cooldownTicks: 7, range: 2.0, art: 'sunburst' },
      affixPool: [{ stat: 'melee', w: 3 }, { stat: 'defence' }, { stat: 'vitality' }, { stat: 'maxHp' }, { stat: 'regen' }],
      acquisition: { craft: true },
      recipe: {
        skill: 'smithing', levelReq: 45, xp: 600, station: 'anvil', ticks: 120,
        inputs: [{ item: 'gold_bar', qty: 3 }, { item: 'steel_bar', qty: 2 }, { item: 'sunflower', qty: 3 }],
      },
      value: 1100, color: '#e8b64c', code: 'Db',
      desc: 'Gold over a steel heart, rayed like the sun coming over a hill. Night files a complaint.',
    },
  ];

  // ---- drop-only wild finds: the loot chase, junk-tier to heirloom.
  const finds: EquipmentDef[] = [
    {
      id: 'rustbite', name: 'Rustbite', slot: 'weapon',
      weapon: { style: 'melee', damage: 1, cooldownTicks: 6, range: 1.6, art: 'crescent_sweep' },
      affixPool: [{ stat: 'melee', w: 2 }, { stat: 'vitality' }, { stat: 'maxHp' }],
      rarities: ['common', 'uncommon', 'rare'],
      acquisition: { drop: true },
      value: 20, color: '#8a6a52', code: 'Rt',
      desc: 'Pitted, notched, and faintly orange. Still sharp where it counts — mostly.',
    },
    {
      id: 'gobsplitter', name: 'Gobsplitter', slot: 'weapon',
      levelReq: { skill: 'melee', level: 5 },
      weapon: { style: 'melee', damage: 2, cooldownTicks: 8, range: 1.8, art: 'shockwave' },
      affixPool: [{ stat: 'melee', w: 2 }, { stat: 'defence' }, { stat: 'maxHp' }],
      rarities: ['common', 'uncommon', 'rare', 'epic'],
      acquisition: { drop: true },
      value: 60, color: '#6e7a52', code: 'Gs',
      desc: 'Goblin ironwork: wrong angles, cruel edge, no apologies. It splits things.',
    },
    {
      id: 'wolffang', name: 'Wolffang', slot: 'weapon',
      levelReq: { skill: 'melee', level: 12 },
      weapon: { style: 'melee', damage: 2, cooldownTicks: 6, range: 1.8, art: 'lunge', backstabMult: 1.6 },
      affixPool: [{ stat: 'melee', w: 2 }, { stat: 'sneak' }, { stat: 'beastcraft' }, { stat: 'maxHp' }],
      acquisition: { drop: true },
      value: 130, color: '#8d939f', code: 'Wa',
      desc: 'A grey saber with a fang set in the pommel. The pack hunts ahead of the point.',
    },
    {
      id: 'fenreaper', name: 'Fenreaper', slot: 'weapon',
      levelReq: { skill: 'melee', level: 14 },
      weapon: { style: 'melee', damage: 3, cooldownTicks: 8, range: 2.0, art: 'reapers_arc' },
      affixPool: [{ stat: 'melee', w: 2 }, { stat: 'farming' }, { stat: 'defence' }, { stat: 'regen' }],
      acquisition: { drop: true },
      value: 240, color: '#4a5a48', code: 'Fz',
      desc: 'Bog-iron with a wisp-green light down the fuller. The marsh harvests too.',
    },
    {
      id: 'gravewhisper', name: 'Gravewhisper', slot: 'weapon',
      levelReq: { skill: 'melee', level: 18 },
      weapon: { style: 'melee', damage: 2, cooldownTicks: 6, range: 1.75, art: 'shadowstep', backstabMult: 2.0 },
      affixPool: [{ stat: 'melee', w: 2 }, { stat: 'sneak', w: 2 }, { stat: 'maxHp' }],
      acquisition: { drop: true },
      value: 320, color: '#7a7d88', code: 'Gw',
      desc: 'Ash-grey steel that makes no sound leaving the sheath. The dead lend quiet.',
    },
    {
      id: 'duelists_grace', name: 'Duelist\'s Grace', slot: 'weapon',
      levelReq: { skill: 'melee', level: 24 },
      weapon: { style: 'melee', damage: 3, cooldownTicks: 5, range: 1.9, art: 'quicksilver' },
      affixPool: [{ stat: 'melee', w: 3 }, { stat: 'sneak' }, { stat: 'vitality' }, { stat: 'maxHp' }],
      acquisition: { drop: true },
      value: 480, color: '#e6ddc8', code: 'Dl',
      desc: 'Swept hilt, ivory grip, gold wire. Somebody fought beautifully and lost anyway.',
    },
    {
      id: 'frostbrand', name: 'Frostbrand', slot: 'weapon',
      levelReq: { skill: 'melee', level: 28 },
      weapon: { style: 'melee', damage: 3, cooldownTicks: 7, range: 1.9, art: 'winters_edge' },
      affixPool: [{ stat: 'melee', w: 2 }, { stat: 'magic' }, { stat: 'defence' }, { stat: 'maxHp' }],
      rarities: ['uncommon', 'rare', 'epic', 'legendary'],
      acquisition: { drop: true },
      value: 560, color: '#a8c8dc', code: 'Fb',
      desc: 'Pale steel that fogs the air around it. Wounds close cold and slow.',
    },
    {
      id: 'bloodletter', name: 'Bloodletter', slot: 'weapon',
      levelReq: { skill: 'melee', level: 32 },
      weapon: { style: 'melee', damage: 4, cooldownTicks: 8, range: 1.85, art: 'red_harvest' },
      affixPool: [{ stat: 'melee', w: 3 }, { stat: 'vitality' }, { stat: 'maxHp', w: 2 }],
      rarities: ['uncommon', 'rare', 'epic', 'legendary'],
      acquisition: { drop: true },
      value: 720, color: '#5a4048', code: 'Bl',
      desc: 'A dark cleaver with a red seam that never dries. It keeps its own tally.',
    },
    {
      id: 'stormcall', name: 'Stormcall', slot: 'weapon',
      levelReq: { skill: 'melee', level: 35 },
      weapon: { style: 'melee', damage: 3, cooldownTicks: 6, range: 1.9, art: 'storm_brand' },
      affixPool: [{ stat: 'melee', w: 2 }, { stat: 'magic', w: 2 }, { stat: 'vitality' }, { stat: 'maxHp' }],
      rarities: ['uncommon', 'rare', 'epic', 'legendary'],
      acquisition: { drop: true },
      value: 800, color: '#5a6a9c', code: 'Sm',
      desc: 'Storm-blue steel under a gold bolt of a guard. Thunder answers the swing, eventually.',
    },
    {
      id: 'sovereign', name: 'Sovereign', slot: 'weapon',
      levelReq: { skill: 'melee', level: 38 },
      weapon: { style: 'melee', damage: 4, cooldownTicks: 7, range: 2.05, art: 'kings_decree' },
      affixPool: [{ stat: 'melee', w: 2 }, { stat: 'defence', w: 2 }, { stat: 'vitality' }, { stat: 'maxHp' }],
      rarities: ['rare', 'epic', 'legendary'],
      acquisition: { drop: true },
      value: 950, color: '#e8c04c', code: 'Ov',
      desc: 'A barrow-king\'s blade, gold and unbowed. The crown on the pommel still expects kneeling.',
    },
    {
      id: 'starfall', name: 'Starfall', slot: 'weapon',
      levelReq: { skill: 'melee', level: 45 },
      weapon: { style: 'melee', damage: 5, cooldownTicks: 7, range: 2.0, art: 'starfall_strike' },
      affixPool: [{ stat: 'melee', w: 3 }, { stat: 'magic' }, { stat: 'vitality' }, { stat: 'maxHp' }],
      rarities: ['epic', 'legendary'],
      acquisition: { drop: true },
      value: 1400, color: '#4a4066', code: 'Fy',
      desc: 'Iron that fell burning from a night sky, still salted with starlight. It wants to go back.',
    },
    {
      id: 'oathkeeper', name: 'Oathkeeper', slot: 'weapon',
      levelReq: { skill: 'melee', level: 50 },
      weapon: { style: 'melee', damage: 5, cooldownTicks: 6, range: 2.0, art: 'vow_unbroken' },
      affixPool: [{ stat: 'melee', w: 3 }, { stat: 'defence' }, { stat: 'vitality' }, { stat: 'maxHp' }, { stat: 'regen' }],
      rarities: ['legendary'],
      acquisition: { drop: true },
      effects: [{ kind: 'lifesteal', frac: 0.05 }],
      value: 2000, color: '#e8e8f0', code: 'Oa',
      desc: 'A plain, perfect blade in white steel. Whoever swore on it kept the promise. Your turn. Every wound it deals steadies your own hand.',
    },
  ];

  return [...arming, ...falchion, ...gladius, ...scimitar, ...crafts, ...finds];
}

// ----------------------------------------------------- the rogue's roster
// Dagger authoring laws: gates ride SNEAK (the rogue's ladder — tanto,
// the fighter's dagger, is the deliberate exception); backstabMult is
// the tuning dial that separates a workman's knife (2.2) from an
// assassin's (3.2); metal lines reuse the sword metalLine() maker.

function daggerDefs(): EquipmentDef[] {
  const THIEF_POOL: AffixPoolEntry[] = [
    { stat: 'sneak', w: 3 },
    { stat: 'melee' },
    { stat: 'foraging' },
    { stat: 'maxHp' },
  ];
  const ASSASSIN_POOL: AffixPoolEntry[] = [
    { stat: 'sneak', w: 3 },
    { stat: 'melee', w: 2 },
    { stat: 'maxHp' },
  ];
  // The tanto is the one dagger that fights face-on — melee gates, a
  // soldier's pool with a rogue accent.
  const SOLDIER_DAGGER_POOL: AffixPoolEntry[] = [
    { stat: 'melee', w: 2 },
    { stat: 'defence' },
    { stat: 'sneak' },
    { stat: 'maxHp' },
  ];

  // ---- the dirk line, migrated + extended: same ids the game shipped
  // with (roll-less DB rows adopt as common/seed 0), steel and gold new.
  const dirks: EquipmentDef[] = [
    {
      id: 'bronze_dagger', name: 'Bronze dagger', slot: 'weapon',
      weapon: { style: 'melee', damage: 1, cooldownTicks: 5, range: 1.35, art: 'shadowstep', backstabMult: 2.5 },
      affixPool: THIEF_POOL,
      acquisition: { craft: true },
      recipe: {
        skill: 'smithing', levelReq: 2, xp: 35, station: 'anvil', ticks: 45,
        inputs: [{ item: 'bronze_bar', qty: 1 }],
      },
      value: 28, color: '#a4744b', code: 'Bd',
      desc: 'Light enough to forget, sharp enough to remember.',
    },
    {
      id: 'iron_dagger', name: 'Iron dagger', slot: 'weapon',
      levelReq: { skill: 'sneak', level: 10 },
      weapon: { style: 'melee', damage: 2, cooldownTicks: 5, range: 1.45, art: 'shadowstep', backstabMult: 2.5 },
      affixPool: THIEF_POOL,
      acquisition: { craft: true },
      recipe: {
        skill: 'smithing', levelReq: 15, xp: 75, station: 'anvil', ticks: 55,
        inputs: [{ item: 'iron_bar', qty: 1 }],
      },
      value: 85, color: '#8d9299', code: 'Id',
      desc: 'A quiet argument, settled from behind.',
    },
    {
      id: 'steel_dagger', name: 'Steel dagger', slot: 'weapon',
      levelReq: { skill: 'sneak', level: 24 },
      weapon: { style: 'melee', damage: 3, cooldownTicks: 5, range: 1.5, art: 'shadowstep', backstabMult: 2.5 },
      affixPool: THIEF_POOL,
      acquisition: { craft: true },
      recipe: {
        skill: 'smithing', levelReq: 31, xp: 200, station: 'anvil', ticks: 65,
        inputs: [{ item: 'steel_bar', qty: 1 }],
      },
      value: 230, color: '#b8bec8', code: 'Dd',
      desc: 'Steel taught to whisper. The edge never gossips.',
    },
    {
      id: 'gold_dagger', name: 'Gold dagger', slot: 'weapon',
      levelReq: { skill: 'sneak', level: 28 },
      weapon: { style: 'melee', damage: 3, cooldownTicks: 5, range: 1.5, art: 'shadowstep', backstabMult: 2.6 },
      affixPool: THIEF_POOL,
      acquisition: { craft: true },
      recipe: {
        skill: 'smithing', levelReq: 41, xp: 280, station: 'anvil', ticks: 70,
        inputs: [{ item: 'gold_bar', qty: 1 }],
      },
      value: 640, color: '#e8c04c', code: 'Gg',
      desc: 'For the thief with nothing left to steal but style.',
    },
  ];

  // ---- three smithing lines across the ores.
  const stiletto = metalLine(
    {
      key: 'stiletto', name: 'Stiletto', cooldownTicks: 5, range: 1.5,
      art: 'shadowstep', backstabMult: 2.8, bars: 1, ticks: 55, pool: ASSASSIN_POOL,
    },
    [
      { metal: 'bronze', bar: 'bronze_bar', color: '#a4744b', damage: 1, meleeReq: 0, smithReq: 6, xp: 45, value: 42, code: 'Tt',
        desc: 'All point, no argument. Finds the gap in anything.' },
      { metal: 'iron', bar: 'iron_bar', color: '#8d9299', damage: 2, meleeReq: 0, smithReq: 19, xp: 115, value: 125, code: 'Ti',
        desc: 'A cold iron period at the end of a short sentence.' },
      { metal: 'steel', bar: 'steel_bar', color: '#c4cad4', damage: 3, meleeReq: 0, smithReq: 35, xp: 250, value: 310, code: 'Tn',
        desc: 'Mail shrugs at swords. It does not shrug at this.' },
      { metal: 'gold', bar: 'gold_bar', color: '#e8c04c', damage: 3, meleeReq: 0, smithReq: 41, xp: 310, value: 720, code: 'Tq',
        desc: 'A golden thorn for silk-lined pockets.' },
      { metal: 'mithril', bar: 'mithril_bar', color: '#7fa8d9', damage: 4, meleeReq: 0, smithReq: 51, xp: 580, value: 1500, code: 'T4',
        desc: 'Light enough to forget. They certainly will.' },
      { metal: 'adamant', bar: 'adamant_bar', color: '#5fa06a', damage: 5, meleeReq: 0, smithReq: 66, xp: 940, value: 3000, code: 'T5',
        desc: 'Plate is a rumor. This is a correction.' },
      { metal: 'obsidian', bar: 'obsidian_shard', color: '#4e4260', damage: 6, meleeReq: 0, smithReq: 79, xp: 1350, value: 4900, code: 'T6',
        desc: 'A splinter of midnight. It leaves no echo.' },
      { metal: 'starsteel', bar: 'starsteel_bar', color: '#cabdf2', damage: 7, meleeReq: 0, smithReq: 91, xp: 1900, value: 8600, code: 'T7',
        desc: 'One cold star, delivered to a very small address.' },
    ],
  );
  const kris = metalLine(
    {
      key: 'kris', name: 'Kris', cooldownTicks: 6, range: 1.45,
      art: 'serpents_kiss', backstabMult: 2.4, bars: 1, ticks: 60, pool: THIEF_POOL,
    },
    [
      { metal: 'bronze', bar: 'bronze_bar', color: '#a4744b', damage: 1, meleeReq: 0, smithReq: 14, xp: 80, value: 55, code: 'Qk',
        desc: 'The blade waves so the wound cannot close its eyes.' },
      { metal: 'iron', bar: 'iron_bar', color: '#8d9299', damage: 2, meleeReq: 0, smithReq: 26, xp: 160, value: 160, code: 'Ki',
        desc: 'Seven bends of iron, each one an opinion.' },
      { metal: 'steel', bar: 'steel_bar', color: '#c4cad4', damage: 3, meleeReq: 0, smithReq: 39, xp: 300, value: 360, code: 'Kn',
        desc: 'A river of steel. Rivers always find a way in.' },
      { metal: 'gold', bar: 'gold_bar', color: '#e8c04c', damage: 3, meleeReq: 0, smithReq: 45, xp: 380, value: 820, code: 'Ko',
        desc: 'A golden serpent, mid-strike, forever.' },
      { metal: 'mithril', bar: 'mithril_bar', color: '#7fa8d9', damage: 4, meleeReq: 0, smithReq: 55, xp: 700, value: 1800, code: 'K4',
        desc: 'The waves ride quicksilver-light. So does the hand.' },
      { metal: 'adamant', bar: 'adamant_bar', color: '#5fa06a', damage: 5, meleeReq: 0, smithReq: 70, xp: 1100, value: 3500, code: 'K5',
        desc: 'A green river in flood. Doors mean nothing to it.' },
      { metal: 'obsidian', bar: 'obsidian_shard', color: '#4e4260', damage: 6, meleeReq: 0, smithReq: 83, xp: 1500, value: 5700, code: 'K6',
        desc: 'Seven waves of black glass, each one a last word.' },
      { metal: 'starsteel', bar: 'starsteel_bar', color: '#cabdf2', damage: 7, meleeReq: 0, smithReq: 95, xp: 2200, value: 9800, code: 'K7',
        desc: 'It ripples like the night it fell through.' },
    ],
  );
  const tanto = metalLine(
    {
      key: 'tanto', name: 'Tanto', cooldownTicks: 6, range: 1.5,
      art: 'lunge', backstabMult: 2.2, bars: 1, ticks: 58, pool: SOLDIER_DAGGER_POOL,
    },
    [
      { metal: 'bronze', bar: 'bronze_bar', color: '#a4744b', damage: 2, meleeReq: 6, smithReq: 10, xp: 65, value: 48, code: 'Ta',
        desc: 'A chisel that chose violence. Honest work either way.' },
      { metal: 'iron', bar: 'iron_bar', color: '#8d9299', damage: 3, meleeReq: 16, smithReq: 22, xp: 140, value: 140, code: 'Ty',
        desc: 'The duelist\'s second answer, kept in the off hand.' },
      { metal: 'steel', bar: 'steel_bar', color: '#c4cad4', damage: 4, meleeReq: 30, smithReq: 37, xp: 290, value: 330, code: 'To',
        desc: 'Armor-writ: short, angled, final.' },
      { metal: 'gold', bar: 'gold_bar', color: '#e8c04c', damage: 4, meleeReq: 34, smithReq: 43, xp: 350, value: 760, code: 'Tz',
        desc: 'Ceremony up front, business at the tip.' },
      { metal: 'mithril', bar: 'mithril_bar', color: '#7fa8d9', damage: 5, meleeReq: 40, smithReq: 53, xp: 640, value: 1650, code: 'N4',
        desc: 'The off-hand answer, now asked in sky-metal.' },
      { metal: 'adamant', bar: 'adamant_bar', color: '#5fa06a', damage: 6, meleeReq: 55, smithReq: 68, xp: 1000, value: 3300, code: 'N5',
        desc: 'Green wedge, straight face. Armor files a complaint.' },
      { metal: 'obsidian', bar: 'obsidian_shard', color: '#4e4260', damage: 7, meleeReq: 68, smithReq: 81, xp: 1400, value: 5300, code: 'N6',
        desc: 'The kissaki is glass. The verdict is stone.' },
      { metal: 'starsteel', bar: 'starsteel_bar', color: '#cabdf2', damage: 8, meleeReq: 80, smithReq: 93, xp: 2000, value: 9200, code: 'N7',
        desc: 'Forge-cooled starlight with a working edge.' },
    ],
  );
  // Stiletto/kris gate on sneak, not melee — patch the maker's default.
  const sneakGate = (defs: EquipmentDef[], levels: number[]): EquipmentDef[] =>
    defs.map((d, i) => {
      const v = { ...d };
      if (levels[i]! > 1) v.levelReq = { skill: 'sneak', level: levels[i]! };
      else delete v.levelReq;
      return v;
    });

  // ---- bespoke crafts.
  const crafts: EquipmentDef[] = [
    {
      id: 'vagrants_friend', name: 'Vagrant\'s Friend', slot: 'weapon',
      levelReq: { skill: 'sneak', level: 2 },
      weapon: { style: 'melee', damage: 1, cooldownTicks: 5, range: 1.4, art: 'shadowstep', backstabMult: 2.5 },
      affixPool: [{ stat: 'sneak', w: 2 }, { stat: 'foraging' }, { stat: 'regen' }, { stat: 'maxHp' }],
      acquisition: { craft: true },
      recipe: {
        skill: 'smithing', levelReq: 8, xp: 55, station: 'anvil', ticks: 50,
        inputs: [{ item: 'bronze_bar', qty: 1 }, { item: 'leather', qty: 1 }, { item: 'twine', qty: 2 }],
      },
      value: 30, color: '#8a7a5c', code: 'Vf',
      desc: 'A plain knife that has opened tins, cut rope, and saved lives. It will not let go of your hand.',
    },
    {
      id: 'sting', name: 'Sting', slot: 'weapon',
      levelReq: { skill: 'sneak', level: 25 },
      weapon: { style: 'melee', damage: 2, cooldownTicks: 4, range: 1.4, art: 'stinger', backstabMult: 2.6 },
      affixPool: [{ stat: 'sneak', w: 2 }, { stat: 'melee' }, { stat: 'farming' }, { stat: 'maxHp' }],
      acquisition: { craft: true },
      recipe: {
        skill: 'smithing', levelReq: 32, xp: 260, station: 'anvil', ticks: 75,
        inputs: [{ item: 'gold_bar', qty: 1 }, { item: 'sunflower', qty: 2 }, { item: 'twine', qty: 1 }],
      },
      value: 450, color: '#e8b64c', code: 'Zg',
      desc: 'Amber and gold, banded like the wasp that inspired it. The fastest blade ever put to a whetstone.',
    },
    {
      id: 'coldsnap', name: 'Coldsnap', slot: 'weapon',
      levelReq: { skill: 'sneak', level: 30 },
      weapon: { style: 'melee', damage: 3, cooldownTicks: 5, range: 1.45, art: 'cold_snap', backstabMult: 2.4 },
      affixPool: [{ stat: 'sneak', w: 2 }, { stat: 'magic' }, { stat: 'defence' }, { stat: 'maxHp' }],
      acquisition: { craft: true },
      recipe: {
        skill: 'smithing', levelReq: 36, xp: 340, station: 'anvil', ticks: 85,
        inputs: [{ item: 'steel_bar', qty: 1 }, { item: 'gold_bar', qty: 1 }, { item: 'moonbell', qty: 2 }],
      },
      value: 560, color: '#b8d8e8', code: 'Qf',
      desc: 'Quenched at midwinter midnight and never warm again. The first frost, kept on a hip.',
    },
  ];

  // ---- drop-only wild finds: the knives the world already carries.
  const finds: EquipmentDef[] = [
    {
      id: 'shiv', name: 'Shiv', slot: 'weapon',
      weapon: { style: 'melee', damage: 1, cooldownTicks: 4, range: 1.25, art: 'shadowstep', backstabMult: 2.3 },
      affixPool: [{ stat: 'sneak', w: 2 }, { stat: 'melee' }, { stat: 'maxHp' }],
      rarities: ['common', 'uncommon', 'rare'],
      acquisition: { drop: true },
      value: 15, color: '#8a8276', code: 'Zx',
      desc: 'A filed scrap wrapped in rag and bad intentions. Somebody loved it once.',
    },
    {
      id: 'ratter', name: 'Ratter', slot: 'weapon',
      levelReq: { skill: 'sneak', level: 3 },
      weapon: { style: 'melee', damage: 1, cooldownTicks: 5, range: 1.35, art: 'shadowstep', backstabMult: 2.4 },
      affixPool: [{ stat: 'sneak' }, { stat: 'beastcraft', w: 2 }, { stat: 'foraging' }],
      acquisition: { drop: true },
      value: 60, color: '#9a8468', code: 'Ra',
      desc: 'The rat-catcher\'s trade knife — notched once per hundred. It ran out of room.',
    },
    {
      id: 'scaler', name: 'Scaler', slot: 'weapon',
      levelReq: { skill: 'sneak', level: 10 },
      weapon: { style: 'melee', damage: 2, cooldownTicks: 5, range: 1.4, art: 'riptide', backstabMult: 2.4 },
      affixPool: [{ stat: 'fishing', w: 2 }, { stat: 'sneak' }, { stat: 'cooking' }, { stat: 'maxHp' }],
      acquisition: { drop: true },
      value: 180, color: '#9ab8b0', code: 'Sa',
      desc: 'A legendary angler\'s gutting knife, lost to the coast raiders. It still smells faintly of the one that got away.',
    },
    {
      id: 'fangtooth', name: 'Fangtooth', slot: 'weapon',
      levelReq: { skill: 'sneak', level: 12 },
      weapon: { style: 'melee', damage: 2, cooldownTicks: 5, range: 1.4, art: 'lunge', backstabMult: 2.6 },
      affixPool: [{ stat: 'sneak', w: 2 }, { stat: 'beastcraft' }, { stat: 'melee' }, { stat: 'maxHp' }],
      acquisition: { drop: true },
      value: 140, color: '#d8d2c0', code: 'Zf',
      desc: 'A wolf\'s killing tooth, socketed and edged. It remembers how to be a mouth.',
    },
    {
      id: 'bogsting', name: 'Bogsting', slot: 'weapon',
      levelReq: { skill: 'sneak', level: 14 },
      weapon: { style: 'melee', damage: 2, cooldownTicks: 6, range: 1.45, art: 'thorn_lash', backstabMult: 2.4 },
      affixPool: [{ stat: 'sneak', w: 2 }, { stat: 'herbalism' }, { stat: 'regen' }],
      acquisition: { drop: true },
      value: 250, color: '#5a7a58', code: 'Zs',
      desc: 'A curved talon of bog-iron, green to the root. The marsh stings back.',
    },
    {
      id: 'bonepick', name: 'Bonepick', slot: 'weapon',
      levelReq: { skill: 'sneak', level: 16 },
      weapon: { style: 'melee', damage: 2, cooldownTicks: 5, range: 1.5, art: 'bone_needle', backstabMult: 2.7 },
      affixPool: [{ stat: 'sneak', w: 2 }, { stat: 'melee' }, { stat: 'maxHp' }],
      acquisition: { drop: true },
      value: 300, color: '#e2dcc8', code: 'Zb',
      desc: 'Carved from one femur into one purpose. The dead make excellent tools of themselves.',
    },
    {
      id: 'redhand', name: 'Redhand', slot: 'weapon',
      levelReq: { skill: 'sneak', level: 18 },
      weapon: { style: 'melee', damage: 2, cooldownTicks: 5, range: 1.4, art: 'quicksilver', backstabMult: 2.7 },
      affixPool: [{ stat: 'sneak', w: 3 }, { stat: 'melee' }, { stat: 'maxHp' }],
      acquisition: { drop: true },
      value: 340, color: '#a04a48', code: 'Rn',
      desc: 'The guild\'s initiation blade — the red is lacquer, they insist. Membership is permanent.',
    },
    {
      id: 'nightthorn', name: 'Nightthorn', slot: 'weapon',
      levelReq: { skill: 'sneak', level: 22 },
      weapon: { style: 'melee', damage: 3, cooldownTicks: 5, range: 1.45, art: 'shadow_fang', backstabMult: 2.8 },
      affixPool: ASSASSIN_POOL,
      acquisition: { drop: true },
      value: 520, color: '#4a4058', code: 'Nt',
      desc: 'A wave of blued steel grown in the crypt\'s dark, petal by petal. It blooms at throats.',
    },
    {
      id: 'leech', name: 'Leech', slot: 'weapon',
      levelReq: { skill: 'sneak', level: 26 },
      weapon: { style: 'melee', damage: 3, cooldownTicks: 6, range: 1.4, art: 'crimson_tithe', backstabMult: 2.5 },
      affixPool: [{ stat: 'sneak', w: 2 }, { stat: 'vitality', w: 2 }, { stat: 'regen' }],
      rarities: ['uncommon', 'rare', 'epic', 'legendary'],
      acquisition: { drop: true },
      value: 640, color: '#6a3a44', code: 'Lj',
      desc: 'It drinks a little from every wound and never says thank you. You feel better anyway.',
    },
    {
      id: 'hush', name: 'Hush', slot: 'weapon',
      levelReq: { skill: 'sneak', level: 30 },
      weapon: { style: 'melee', damage: 3, cooldownTicks: 5, range: 1.5, art: 'shadowstep', backstabMult: 3.0 },
      affixPool: [{ stat: 'sneak', w: 3 }, { stat: 'melee' }, { stat: 'maxHp' }],
      rarities: ['uncommon', 'rare', 'epic', 'legendary'],
      acquisition: { drop: true },
      value: 780, color: '#b8b4c4', code: 'Hu',
      desc: 'Rooms go quiet when it leaves the sheath. Rooms stay quiet after.',
    },
    {
      id: 'palefire', name: 'Palefire', slot: 'weapon',
      levelReq: { skill: 'sneak', level: 32 },
      weapon: { style: 'melee', damage: 3, cooldownTicks: 6, range: 1.45, art: 'pale_flame', backstabMult: 2.5 },
      affixPool: [{ stat: 'sneak', w: 2 }, { stat: 'magic', w: 2 }, { stat: 'maxHp' }],
      rarities: ['uncommon', 'rare', 'epic', 'legendary'],
      acquisition: { drop: true },
      value: 820, color: '#c8dce8', code: 'Pe',
      desc: 'A tanto that burns cold — the flame casts no light and keeps no warmth. Winter\'s candle.',
    },
    {
      id: 'sparkfang', name: 'Sparkfang', slot: 'weapon',
      levelReq: { skill: 'sneak', level: 35 },
      weapon: { style: 'melee', damage: 3, cooldownTicks: 5, range: 1.45, art: 'spark_lash', backstabMult: 2.6 },
      affixPool: [{ stat: 'sneak', w: 2 }, { stat: 'magic' }, { stat: 'melee' }, { stat: 'maxHp' }],
      rarities: ['uncommon', 'rare', 'epic', 'legendary'],
      acquisition: { drop: true },
      value: 900, color: '#7a88b8', code: 'Qs',
      desc: 'A hooked claw of storm-iron. Every cut files a complaint with the sky, and the sky answers.',
    },
    {
      id: 'kingsbane', name: 'Kingsbane', slot: 'weapon',
      levelReq: { skill: 'sneak', level: 40 },
      weapon: { style: 'melee', damage: 4, cooldownTicks: 5, range: 1.5, art: 'kings_bane', backstabMult: 2.8 },
      affixPool: [{ stat: 'sneak', w: 3 }, { stat: 'melee', w: 2 }, { stat: 'maxHp' }],
      rarities: ['rare', 'epic', 'legendary'],
      acquisition: { drop: true },
      value: 1200, color: '#c9a23c', code: 'Ke',
      desc: 'Gold-hilted, black-hearted — the needle that ended a dynasty. Crowns fit anyone, it whispers.',
    },
    {
      id: 'last_word', name: 'The Last Word', slot: 'weapon',
      levelReq: { skill: 'sneak', level: 50 },
      weapon: { style: 'melee', damage: 4, cooldownTicks: 4, range: 1.5, art: 'last_word', backstabMult: 3.2 },
      affixPool: [{ stat: 'sneak', w: 3 }, { stat: 'melee' }, { stat: 'vitality' }, { stat: 'maxHp' }],
      rarities: ['legendary'],
      acquisition: { drop: true },
      effects: [{ kind: 'backstab', bonus: 0.3 }, { kind: 'skill', skill: 'sneak', amount: 2 }],
      value: 2000, color: '#f0f0f4', code: 'Lz',
      desc: 'Every argument ends. This one ends them politely, completely, and from behind.',
    },
  ];

  const roster = [
    ...dirks,
    ...sneakGate(stiletto, [4, 14, 28, 32, 42, 56, 70, 82]),
    ...sneakGate(kris, [8, 18, 32, 36, 44, 58, 72, 84]),
    ...crafts,
    ...finds,
  ];
  return [...roster, ...tanto];
}

// ============================================================ the archer's
// roster: 20 bespoke bows. Three fletching lines climb the wood ladder
// (log → oak → willow → yew — the trees are real, go cut them), three
// bespoke crafts, and fourteen wild finds up to the legendary Skyrender.
// The dials are cadence, reach, and weight: longbows slow and heavy,
// shortbows quick and close, recurves the hunter's middle path.

/** One bow design fletched across the four bow woods (metalLine's cousin:
 *  crafting skill, no station — a bowyer works wherever there's a knee). */
interface WoodStep {
  wood: 'plain' | 'oak' | 'willow' | 'yew';
  log: string;
  color: string;
  damage: number;
  archReq: number;
  craftReq: number;
  xp: number;
  value: number;
  code: string;
  desc: string;
}

function woodLine(
  design: {
    key: string;
    name: string;
    cooldownTicks: number;
    range: number;
    projectileSpeed: number;
    art: string;
    logs: number;
    ticks: number;
    pool: AffixPoolEntry[];
  },
  steps: WoodStep[],
): EquipmentDef[] {
  return steps.map((w) => {
    const def: EquipmentDef = {
      id: w.wood === 'plain' ? design.key : `${w.wood}_${design.key}`,
      name: w.wood === 'plain'
        ? design.name
        : `${w.wood.charAt(0).toUpperCase()}${w.wood.slice(1)} ${design.name.toLowerCase()}`,
      slot: 'weapon',
      weapon: {
        style: 'archery',
        damage: w.damage,
        cooldownTicks: design.cooldownTicks,
        range: design.range,
        ammo: 'arrow',
        projectileSpeed: design.projectileSpeed,
        art: design.art,
      },
      affixPool: design.pool,
      acquisition: { craft: true },
      recipe: {
        skill: 'woodworking', levelReq: w.craftReq, xp: w.xp, station: 'carving_bench',
        // Every bow is strung: the tailor's twine is the bowyer's string.
        ticks: design.ticks,
        inputs: [{ item: w.log, qty: design.logs }, { item: 'twine', qty: 1 }],
      },
      value: w.value, color: w.color, code: w.code, desc: w.desc,
    };
    if (w.archReq > 1) def.levelReq = { skill: 'archery', level: w.archReq };
    return def;
  });
}

function bowDefs(): EquipmentDef[] {
  // Pools: every bow leans archery; the flavor stats tell its story.
  const ARCHER_POOL: AffixPoolEntry[] = [
    { stat: 'archery', w: 3 },
    { stat: 'defence' },
    { stat: 'vitality' },
    { stat: 'maxHp' },
  ];
  const HUNTER_POOL: AffixPoolEntry[] = [
    { stat: 'archery', w: 3 },
    { stat: 'sneak', w: 2 },
    { stat: 'foraging' },
    { stat: 'maxHp' },
  ];
  const GHOST_POOL: AffixPoolEntry[] = [
    { stat: 'archery', w: 2 },
    { stat: 'sneak', w: 2 },
    { stat: 'maxHp' },
  ];

  // Wood steps shared by every line — each design overrides stats/codes.
  const WOODS = { plain: '#8a6a45', oak: '#6b4a26', willow: '#8a9455', yew: '#7d4436' };

  // ---- shortbow: the skirmisher's bow. Quick to draw, quick to loose.
  // oak_shortbow is the id the game shipped with — it adopts as the oak
  // rung (roll-less DB rows become common/seed 0). The starter kit now
  // hands out the plain rung instead.
  const shortbow = woodLine(
    {
      key: 'shortbow', name: 'Shortbow', cooldownTicks: 7, range: 13,
      projectileSpeed: 16, art: 'volley', logs: 2, ticks: 55, pool: HUNTER_POOL,
    },
    [
      { wood: 'plain', log: 'log', color: WOODS.plain, damage: 3, archReq: 0, craftReq: 8, xp: 50, value: 30, code: 'Ho',
        desc: 'A hunter\'s first friend. Light, honest, always strung.' }, // also shop stock (patched below)
      { wood: 'oak', log: 'oak_log', color: WOODS.oak, damage: 4, archReq: 10, craftReq: 15, xp: 90, value: 110, code: 'Bw',
        desc: 'Dense oak snaps the arrow out flat and fast.' },
      { wood: 'willow', log: 'willow_log', color: WOODS.willow, damage: 5, archReq: 24, craftReq: 30, xp: 210, value: 320, code: 'Uw',
        desc: 'Willow forgives a hurried draw and hides the creak.' },
      { wood: 'yew', log: 'yew_log', color: WOODS.yew, damage: 6, archReq: 40, craftReq: 46, xp: 360, value: 740, code: 'Ys',
        desc: 'Yew in a small frame: a whisper that hits like a shout.' },
    ],
  );

  // ---- longbow: the war bow. Man-tall, slow, devastating.
  // willow_longbow adopts as the willow rung, same name it always had.
  const longbow = woodLine(
    {
      key: 'longbow', name: 'Longbow', cooldownTicks: 11, range: 18,
      projectileSpeed: 19, art: 'piercing_bolt', logs: 3, ticks: 70, pool: ARCHER_POOL,
    },
    [
      { wood: 'plain', log: 'log', color: WOODS.plain, damage: 5, archReq: 5, craftReq: 12, xp: 70, value: 55, code: 'Lo',
        desc: 'Taller than its owner and twice as stubborn.' },
      { wood: 'oak', log: 'oak_log', color: WOODS.oak, damage: 6, archReq: 15, craftReq: 22, xp: 140, value: 170, code: 'Ol',
        desc: 'An oak stave asks for your whole back, and pays for it.' },
      { wood: 'willow', log: 'willow_log', color: WOODS.willow, damage: 8, archReq: 30, craftReq: 34, xp: 280, value: 400, code: 'Wl',
        desc: 'Willow bends far and sends arrows farther.' },
      { wood: 'yew', log: 'yew_log', color: WOODS.yew, damage: 10, archReq: 45, craftReq: 50, xp: 420, value: 920, code: 'Yn',
        desc: 'The wood wars are fought over. A yard of bent thunder.' },
    ],
  );

  // ---- hunting bow: the recurve. Curled tips store a heavier strike
  // in a shorter frame — the tracker's bow.
  const hunting = woodLine(
    {
      key: 'hunting_bow', name: 'Hunting bow', cooldownTicks: 8, range: 15,
      projectileSpeed: 17, art: 'broadhead', logs: 2, ticks: 62, pool: HUNTER_POOL,
    },
    [
      { wood: 'plain', log: 'log', color: WOODS.plain, damage: 4, archReq: 3, craftReq: 10, xp: 60, value: 42, code: 'Hn',
        desc: 'Curled tips, quiet cast. Dinner never hears it.' },
      { wood: 'oak', log: 'oak_log', color: WOODS.oak, damage: 5, archReq: 12, craftReq: 18, xp: 120, value: 140, code: 'Ox',
        desc: 'Oak recurve — the poacher\'s rank badge, worn on the back.' },
      { wood: 'willow', log: 'willow_log', color: WOODS.willow, damage: 6, archReq: 26, craftReq: 32, xp: 240, value: 360, code: 'Wr',
        desc: 'It bends like the river it grew beside. Deer trust rivers.' },
      { wood: 'yew', log: 'yew_log', color: WOODS.yew, damage: 8, archReq: 42, craftReq: 48, xp: 390, value: 820, code: 'Yr',
        desc: 'The last thing the King\'s deer never saw.' },
    ],
  );

  // ---- bespoke crafts: three bows with recipes and reputations.
  const crafts: EquipmentDef[] = [
    {
      id: 'sparrowhawk', name: 'Sparrowhawk', slot: 'weapon',
      levelReq: { skill: 'archery', level: 18 },
      weapon: { style: 'archery', damage: 5, cooldownTicks: 7, range: 14, ammo: 'arrow', projectileSpeed: 18, art: 'wingbeat' },
      affixPool: [{ stat: 'archery', w: 2 }, { stat: 'beastcraft' }, { stat: 'foraging' }, { stat: 'maxHp' }],
      acquisition: { craft: true },
      recipe: {
        skill: 'woodworking', levelReq: 25, xp: 200, station: 'carving_bench', ticks: 65,
        inputs: [{ item: 'willow_log', qty: 1 }, { item: 'feather', qty: 8 }, { item: 'leather', qty: 1 }, { item: 'twine', qty: 1 }],
      },
      value: 380, color: '#4a8ab8', code: 'Hk',
      desc: 'A fowler\'s recurve, kingfisher-blue, tufted with the feathers of everything it has ever beaten to the sky.',
    },
    {
      id: 'heartwood', name: 'Heartwood', slot: 'weapon',
      levelReq: { skill: 'archery', level: 22 },
      weapon: { style: 'archery', damage: 6, cooldownTicks: 8, range: 15, ammo: 'arrow', projectileSpeed: 17, art: 'verdant_burst' },
      affixPool: [{ stat: 'archery', w: 2 }, { stat: 'foraging' }, { stat: 'regen' }, { stat: 'maxHp' }],
      acquisition: { craft: true },
      recipe: {
        skill: 'woodworking', levelReq: 28, xp: 240, station: 'carving_bench', ticks: 75,
        inputs: [{ item: 'oak_log', qty: 2 }, { item: 'sagewort', qty: 2 }, { item: 'berries', qty: 4 }, { item: 'twine', qty: 1 }],
      },
      value: 460, color: '#5a9a4a', code: 'He',
      desc: 'Cut from the living heart of a great oak that forgave the bowyer. Leaves still bud along the limbs in spring.',
    },
    {
      id: 'windsinger', name: 'Windsinger', slot: 'weapon',
      levelReq: { skill: 'archery', level: 40 },
      weapon: { style: 'archery', damage: 9, cooldownTicks: 10, range: 18, ammo: 'arrow', projectileSpeed: 21, art: 'windsong' },
      affixPool: [{ stat: 'archery', w: 3 }, { stat: 'magic' }, { stat: 'defence' }, { stat: 'maxHp' }],
      acquisition: { craft: true },
      recipe: {
        skill: 'woodworking', levelReq: 45, xp: 420, station: 'carving_bench', ticks: 90,
        inputs: [{ item: 'yew_log', qty: 2 }, { item: 'gold_bar', qty: 1 }, { item: 'moonbell', qty: 2 }, { item: 'twine', qty: 1 }],
      },
      value: 880, color: '#8ab4c8', code: 'Wi',
      desc: 'A yew war bow drilled with song-holes. You hear the note. Then whatever the note was about.',
    },
  ];

  // ---- drop-only wild finds: the bows the world already carries.
  const finds: EquipmentDef[] = [
    {
      id: 'stickbow', name: 'Stickbow', slot: 'weapon',
      weapon: { style: 'archery', damage: 2, cooldownTicks: 7, range: 12, ammo: 'arrow', projectileSpeed: 14, art: 'volley' },
      affixPool: [{ stat: 'archery', w: 2 }, { stat: 'foraging' }, { stat: 'maxHp' }],
      rarities: ['common', 'uncommon'],
      acquisition: { drop: true },
      value: 12, color: '#96784f', code: 'Kt',
      desc: 'A kinked branch and a length of gutcord. Someone\'s first try. It shoots! Mostly forward.',
    },
    {
      id: 'knucklebow', name: 'Knucklebow', slot: 'weapon',
      levelReq: { skill: 'archery', level: 4 },
      weapon: { style: 'archery', damage: 3, cooldownTicks: 7, range: 13, ammo: 'arrow', projectileSpeed: 15, art: 'volley' },
      affixPool: [{ stat: 'archery', w: 2 }, { stat: 'melee' }, { stat: 'maxHp' }],
      rarities: ['common', 'uncommon', 'rare'],
      acquisition: { drop: true },
      value: 55, color: '#8a6f52', code: 'Kx',
      desc: 'A goblin composite strung with stolen sinew and beaded with knuckle bones. It rattles a war-song.',
    },
    {
      id: 'poachers_friend', name: 'Poacher\'s Friend', slot: 'weapon',
      levelReq: { skill: 'archery', level: 8 },
      weapon: { style: 'archery', damage: 4, cooldownTicks: 7, range: 14, ammo: 'arrow', projectileSpeed: 16, art: 'volley' },
      affixPool: GHOST_POOL,
      rarities: ['common', 'uncommon', 'rare'],
      acquisition: { drop: true },
      value: 150, color: '#7a6a48', code: 'Pn',
      desc: 'Snare-cord grip, a tally of notches down the belly. It knows the paths the wardens don\'t.',
    },
    {
      id: 'bramblethorn', name: 'Bramblethorn', slot: 'weapon',
      levelReq: { skill: 'archery', level: 12 },
      weapon: { style: 'archery', damage: 5, cooldownTicks: 8, range: 14, ammo: 'arrow', projectileSpeed: 16, art: 'thorn_fan' },
      affixPool: [{ stat: 'archery', w: 2 }, { stat: 'foraging' }, { stat: 'herbalism' }, { stat: 'regen' }],
      rarities: ['common', 'uncommon', 'rare'],
      acquisition: { drop: true },
      value: 220, color: '#5a7a3c', code: 'Bx',
      desc: 'Living briar, still growing, still armed. One berry ripens on the upper limb and never falls.',
    },
    {
      id: 'driftwood', name: 'Driftwood', slot: 'weapon',
      levelReq: { skill: 'archery', level: 14 },
      weapon: { style: 'archery', damage: 5, cooldownTicks: 8, range: 15, ammo: 'arrow', projectileSpeed: 16, art: 'piercing_bolt' },
      affixPool: [{ stat: 'archery', w: 2 }, { stat: 'fishing' }, { stat: 'defence' }, { stat: 'maxHp' }],
      rarities: ['common', 'uncommon', 'rare'],
      acquisition: { drop: true },
      value: 260, color: '#b0a894', code: 'Dw',
      desc: 'A flatbow the sea carved for years and gave back finished. It aims like it remembers the tide.',
    },
    {
      id: 'fishspine', name: 'Fishspine', slot: 'weapon',
      levelReq: { skill: 'archery', level: 16 },
      weapon: { style: 'archery', damage: 5, cooldownTicks: 7, range: 14, ammo: 'arrow', projectileSpeed: 17, art: 'volley' },
      affixPool: [{ stat: 'fishing', w: 2 }, { stat: 'archery', w: 2 }, { stat: 'cooking' }, { stat: 'maxHp' }],
      rarities: ['uncommon', 'rare', 'epic', 'legendary'],
      acquisition: { drop: true },
      value: 300, color: '#c8ccc4', code: 'Fv',
      desc: 'The ribbed backbone of something deep, strung with sinew. It flexes like it is still swimming.',
    },
    {
      id: 'wolfsong', name: 'Wolfsong', slot: 'weapon',
      levelReq: { skill: 'archery', level: 18 },
      weapon: { style: 'archery', damage: 6, cooldownTicks: 8, range: 15, ammo: 'arrow', projectileSpeed: 17, art: 'howling_loose' },
      affixPool: [{ stat: 'archery', w: 2 }, { stat: 'beastcraft', w: 2 }, { stat: 'sneak' }, { stat: 'maxHp' }],
      rarities: ['uncommon', 'rare', 'epic', 'legendary'],
      acquisition: { drop: true },
      value: 420, color: '#8a8f9d', code: 'Wv',
      desc: 'Fur-gripped, with a howl trapped in the string. Every arrow leaves with the pack behind it.',
    },
    {
      id: 'rimewood', name: 'Rimewood', slot: 'weapon',
      levelReq: { skill: 'archery', level: 24 },
      weapon: { style: 'archery', damage: 7, cooldownTicks: 9, range: 16, ammo: 'arrow', projectileSpeed: 17, art: 'hoarfrost' },
      affixPool: [{ stat: 'archery', w: 2 }, { stat: 'magic' }, { stat: 'defence' }, { stat: 'maxHp' }],
      rarities: ['rare', 'epic', 'legendary'],
      acquisition: { drop: true },
      value: 640, color: '#a8c8d8', code: 'Rm',
      desc: 'A limb that froze mid-winter and never thawed. The frost on it is original. So is the cold.',
    },
    {
      id: 'marrowpoint', name: 'Marrowpoint', slot: 'weapon',
      levelReq: { skill: 'archery', level: 20 },
      weapon: { style: 'archery', damage: 7, cooldownTicks: 9, range: 16, ammo: 'arrow', projectileSpeed: 17, art: 'piercing_bolt' },
      affixPool: [{ stat: 'archery', w: 2 }, { stat: 'melee' }, { stat: 'vitality' }, { stat: 'maxHp' }],
      rarities: ['uncommon', 'rare', 'epic', 'legendary'],
      acquisition: { drop: true },
      value: 480, color: '#d8d2be', code: 'Mo',
      desc: 'Bone and iron from the crypt armory, fletched in grave-linen. The dead practice archery patiently.',
    },
    {
      id: 'whisperwind', name: 'Whisperwind', slot: 'weapon',
      levelReq: { skill: 'archery', level: 26 },
      weapon: { style: 'archery', damage: 6, cooldownTicks: 8, range: 16, ammo: 'arrow', projectileSpeed: 19, art: 'ghost_shaft' },
      affixPool: GHOST_POOL,
      rarities: ['uncommon', 'rare', 'epic', 'legendary'],
      acquisition: { drop: true },
      value: 560, color: '#9a96ac', code: 'Vn',
      desc: 'Ghost-grey and silent — the string never twangs, the shaft never whistles. The hit makes no promise it keeps.',
    },
    {
      id: 'emberglow', name: 'Emberglow', slot: 'weapon',
      levelReq: { skill: 'archery', level: 30 },
      weapon: { style: 'archery', damage: 8, cooldownTicks: 9, range: 15, ammo: 'arrow', projectileSpeed: 18, art: 'cinder_rain' },
      affixPool: [{ stat: 'archery', w: 2 }, { stat: 'magic' }, { stat: 'smithing' }, { stat: 'maxHp' }],
      rarities: ['rare', 'epic', 'legendary'],
      acquisition: { drop: true },
      value: 760, color: '#c86a38', code: 'Ew',
      desc: 'Fire-hardened heartwood with live coals under the grain. It keeps your hands warm and its own counsel.',
    },
    {
      id: 'kingswood', name: 'Kingswood', slot: 'weapon',
      levelReq: { skill: 'archery', level: 36 },
      weapon: { style: 'archery', damage: 8, cooldownTicks: 9, range: 17, ammo: 'arrow', projectileSpeed: 19, art: 'kings_arrow' },
      affixPool: [{ stat: 'archery', w: 3 }, { stat: 'defence' }, { stat: 'vitality' }, { stat: 'maxHp' }],
      rarities: ['rare', 'epic', 'legendary'],
      acquisition: { drop: true },
      value: 1100, color: '#8a5c30', code: 'Kd',
      desc: 'Royal yew under gilt fittings — cutting the tree was treason, bending the bow is coronation.',
    },
    {
      id: 'starcall', name: 'Starcall', slot: 'weapon',
      levelReq: { skill: 'archery', level: 42 },
      weapon: { style: 'archery', damage: 8, cooldownTicks: 8, range: 17, ammo: 'arrow', projectileSpeed: 19, art: 'starfall_arrows' },
      affixPool: [{ stat: 'archery', w: 3 }, { stat: 'magic', w: 2 }, { stat: 'maxHp' }],
      rarities: ['epic', 'legendary'],
      acquisition: { drop: true },
      value: 1400, color: '#5a5e9e', code: 'Zc',
      desc: 'Night-blue, chased with silver. Its arrows arc like falling stars, and the sky keeps sending more.',
    },
    {
      id: 'skyrender', name: 'The Skyrender', slot: 'weapon',
      levelReq: { skill: 'archery', level: 50 },
      weapon: { style: 'archery', damage: 9, cooldownTicks: 9, range: 18, ammo: 'arrow', projectileSpeed: 22, art: 'skyrend' },
      affixPool: [{ stat: 'archery', w: 3 }, { stat: 'sneak' }, { stat: 'vitality' }, { stat: 'maxHp' }],
      rarities: ['legendary'],
      acquisition: { drop: true },
      effects: [{ kind: 'crit', pct: 4 }, { kind: 'onHitStatus', status: 'shock', power: 1, durationTicks: 50, chance: 0.15 }],
      value: 2000, color: '#dce4ec', code: 'Zy',
      desc: 'A great recurve of pale sky-wood in gold storm fittings. The horizon flinches when it is strung.',
    },
  ];

  // The plain shortbow is general-store stock — always a fixed common
  // baseline on the shelf; better rolls come from the knee or the wilds.
  shortbow[0]!.acquisition = { craft: true, shop: true };

  return [...shortbow, ...longbow, ...hunting, ...crafts, ...finds];
}

function staffDefs(): EquipmentDef[] {
  // Pools: every staff leans magic; the flavor stats tell its school.
  const MAGE_POOL: AffixPoolEntry[] = [
    { stat: 'magic', w: 3 },
    { stat: 'vitality' },
    { stat: 'herbalism' },
    { stat: 'maxHp' },
  ];
  const SAGE_POOL: AffixPoolEntry[] = [
    { stat: 'magic', w: 3 },
    { stat: 'herbalism', w: 2 },
    { stat: 'regen' },
    { stat: 'maxHp' },
  ];
  const WARMAGE_POOL: AffixPoolEntry[] = [
    { stat: 'magic', w: 3 },
    { stat: 'defence' },
    { stat: 'vitality' },
    { stat: 'maxHp' },
  ];

  // ---- the carving ladder: one walking-staff design, four woods. The
  // generalist's line — arcane school, honest numbers, always craftable.
  const carved: EquipmentDef[] = (
    [
      { wood: 'plain', name: 'Carved staff', log: 'log', color: '#8a6a45', damage: 1,
        magReq: 0, craftReq: 6, xp: 45, value: 28, code: 'Cv',
        desc: 'A straight length of ash with a beginner\'s spiral cut. It hums if you listen.' },
      { wood: 'oak', name: 'Oak staff', log: 'oak_log', color: '#6b4a26', damage: 2,
        magReq: 10, craftReq: 14, xp: 85, value: 105, code: 'Oz',
        desc: 'Dense oak takes a deeper carving and a stronger charge.' },
      { wood: 'willow', name: 'Willow staff', log: 'willow_log', color: '#8a9455', damage: 3,
        magReq: 24, craftReq: 28, xp: 200, value: 310, code: 'Wu',
        desc: 'Willow bends around the current instead of fighting it.' },
      { wood: 'yew', name: 'Yew staff', log: 'yew_log', color: '#7d4436', damage: 4,
        magReq: 40, craftReq: 44, xp: 350, value: 720, code: 'Yw',
        desc: 'Graveyard yew. It already knows the words to most spells.' },
    ] as const
  ).map((w) => {
    const def: EquipmentDef = {
      id: w.wood === 'plain' ? 'carved_staff' : `${w.wood}_staff`,
      name: w.name,
      slot: 'weapon',
      weapon: {
        style: 'magic', damage: w.damage, cooldownTicks: 8, range: 14,
        projectileSpeed: 13, art: 'arcane_ring', element: 'arcane',
      },
      affixPool: MAGE_POOL,
      acquisition: { craft: true },
      recipe: {
        skill: 'woodworking', levelReq: w.craftReq, xp: w.xp, station: 'carving_bench',
        ticks: 55, inputs: [{ item: w.log, qty: 2 }],
      },
      value: w.value, color: w.color, code: w.code, desc: w.desc,
    };
    if (w.magReq > 0) def.levelReq = { skill: 'magic', level: w.magReq };
    return def;
  });

  // ---- battlestaffs: ONE willow war-frame, four element gems. The gem
  // is the recipe's swap stone — mined or foraged, socketed at the
  // crown, and the whole school follows it: bolts, Art, and glow.
  // RE-SOCKETING (see GEM_BATTLESTAFFS): using a gem on an EQUIPPED
  // battlestaff transmutes it in place — same frame, same roll, new
  // school. The old stone is pried out and lost; the new one is spent.
  const battlestaffs: EquipmentDef[] = (
    [
      { el: 'ember', gem: 'emberstone', name: 'Ember battlestaff', color: '#e8683c',
        art: 'cinderstorm', code: 'Bz',
        desc: 'An emberstone burns in the iron claw. The wood never chars; everything else does.' },
      { el: 'frost', gem: 'frostshard', name: 'Frost battlestaff', color: '#9ad0ec',
        art: 'glaciate', code: 'Bv',
        desc: 'The frostshard sweats a fog that falls instead of rising. Winter, portable.' },
      { el: 'storm', gem: 'stormpearl', name: 'Storm battlestaff', color: '#e8e29a',
        art: 'galvanic_arc', code: 'Vz',
        desc: 'The stormpearl ticks like far thunder. Hold it away from your teeth.' },
      { el: 'verdant', gem: 'bloomstone', name: 'Verdant battlestaff', color: '#7ac46a',
        art: 'overgrowth', code: 'Vx',
        desc: 'The bloomstone put out roots into the shaft. The staff is technically getting stronger.' },
    ] as const
  ).map((g) => ({
    id: `${g.el}_battlestaff`,
    name: g.name,
    slot: 'weapon' as const,
    levelReq: { skill: 'magic' as const, level: 30 },
    weapon: {
      style: 'magic' as const, damage: 5, cooldownTicks: 9, range: 14,
      projectileSpeed: 13, art: g.art, element: g.el,
    },
    affixPool: WARMAGE_POOL,
    acquisition: { craft: true },
    recipe: {
      skill: 'woodworking' as const, levelReq: 36, xp: 260, station: 'carving_bench', ticks: 80,
      inputs: [{ item: 'willow_log', qty: 2 }, { item: g.gem, qty: 1 }, { item: 'gold_bar', qty: 1 }],
    },
    value: 620, color: g.color, code: g.code,
    desc: g.desc,
  }));

  // ---- adopted classics: the two staves the game shipped with keep
  // their ids (existing DB rows become common/seed-0 rolls) and join
  // the roster as real gear.
  const classics: EquipmentDef[] = [
    {
      id: 'apprentice_staff', name: 'Apprentice staff', slot: 'weapon',
      weapon: { style: 'magic', damage: 1, cooldownTicks: 8, range: 14, projectileSpeed: 13, art: 'frost_nova', element: 'arcane' },
      affixPool: MAGE_POOL,
      acquisition: { shop: true },
      value: 45, color: '#7a5ac4', code: 'St',
      desc: 'A student\'s wand — bolt, bolt, then the heavy beat.',
    },
    {
      id: 'ember_staff', name: 'Ember staff', slot: 'weapon',
      levelReq: { skill: 'magic', level: 8 },
      weapon: { style: 'magic', damage: 2, cooldownTicks: 8, range: 14, projectileSpeed: 13, art: 'fireburst', element: 'ember' },
      affixPool: MAGE_POOL,
      rarities: ['common', 'uncommon', 'rare'],
      acquisition: { drop: true },
      value: 210, color: '#c4623c', code: 'Es',
      desc: 'Warm to the touch. Its bolts leave scorch marks.',
    },
  ];

  // ---- bespoke crafts: three staves with recipes and reputations.
  const crafts: EquipmentDef[] = [
    {
      id: 'hearthwarden', name: 'Hearthwarden', slot: 'weapon',
      levelReq: { skill: 'magic', level: 16 },
      weapon: { style: 'magic', damage: 4, cooldownTicks: 9, range: 13, projectileSpeed: 13, art: 'hearth_flare', element: 'ember' },
      affixPool: [{ stat: 'magic', w: 2 }, { stat: 'cooking' }, { stat: 'vitality' }, { stat: 'regen' }],
      acquisition: { craft: true },
      recipe: {
        skill: 'woodworking', levelReq: 22, xp: 180, station: 'carving_bench', ticks: 70,
        inputs: [{ item: 'oak_log', qty: 2 }, { item: 'coal', qty: 2 }, { item: 'emberstone', qty: 1 }],
      },
      value: 340, color: '#d08a4a', code: 'Hw',
      desc: 'A fireplace on a stick — the village wizard\'s answer to winter, wolves, and undercooked stew.',
    },
    {
      id: 'tidebinder', name: 'Tidebinder', slot: 'weapon',
      levelReq: { skill: 'magic', level: 26 },
      weapon: { style: 'magic', damage: 5, cooldownTicks: 9, range: 14, projectileSpeed: 13, art: 'undertow', element: 'frost' },
      affixPool: [{ stat: 'magic', w: 2 }, { stat: 'fishing', w: 2 }, { stat: 'defence' }, { stat: 'maxHp' }],
      acquisition: { craft: true },
      recipe: {
        skill: 'woodworking', levelReq: 32, xp: 230, station: 'carving_bench', ticks: 75,
        inputs: [{ item: 'willow_log', qty: 2 }, { item: 'raw_trout', qty: 3 }, { item: 'frostshard', qty: 1 }],
      },
      value: 520, color: '#5a8ab0', code: 'Td',
      desc: 'Driftwood bound in netting-cord, holding one drop of the sea that never falls. The tide does what it says now.',
    },
    {
      id: 'stormcaller', name: 'Stormcaller', slot: 'weapon',
      levelReq: { skill: 'magic', level: 42 },
      weapon: { style: 'magic', damage: 7, cooldownTicks: 10, range: 15, projectileSpeed: 14, art: 'stormlash', element: 'storm' },
      affixPool: [{ stat: 'magic', w: 3 }, { stat: 'smithing' }, { stat: 'vitality' }, { stat: 'maxHp' }],
      acquisition: { craft: true },
      recipe: {
        skill: 'woodworking', levelReq: 47, xp: 400, station: 'carving_bench', ticks: 90,
        inputs: [{ item: 'yew_log', qty: 2 }, { item: 'stormpearl', qty: 2 }, { item: 'gold_bar', qty: 1 }],
      },
      value: 980, color: '#c8c86a', code: 'Zl',
      desc: 'Twin iron prongs on a yew mast, wired to weather that owes the maker a favor. Point it up and apologize.',
    },
  ];

  // ---- drop-only wild finds: the staves the world already carries,
  // rarities steepening toward the champion's legendary.
  const finds: EquipmentDef[] = [
    {
      id: 'hazel_switch', name: 'Hazel switch', slot: 'weapon',
      weapon: { style: 'magic', damage: 1, cooldownTicks: 7, range: 12, projectileSpeed: 12, art: 'arcane_ring', element: 'arcane' },
      affixPool: [{ stat: 'magic', w: 2 }, { stat: 'foraging' }, { stat: 'maxHp' }],
      rarities: ['common', 'uncommon'],
      acquisition: { drop: true },
      value: 12, color: '#96784f', code: 'Hz',
      desc: 'A bent hazel rod some hedge-mage lost. Still finds water; occasionally finds trouble.',
    },
    {
      id: 'shepherds_crook', name: 'Shepherd\'s crook', slot: 'weapon',
      levelReq: { skill: 'magic', level: 5 },
      weapon: { style: 'magic', damage: 2, cooldownTicks: 8, range: 13, projectileSpeed: 12, art: 'overgrowth', element: 'verdant' },
      affixPool: [{ stat: 'magic', w: 2 }, { stat: 'beastcraft', w: 2 }, { stat: 'regen' }],
      rarities: ['common', 'uncommon', 'rare'],
      acquisition: { drop: true },
      value: 90, color: '#a08a5c', code: 'Kk',
      desc: 'The hook has pulled lambs from ravines and wolves off lambs. It has opinions about flocks.',
    },
    {
      id: 'wisplight', name: 'Wisplight', slot: 'weapon',
      levelReq: { skill: 'magic', level: 7 },
      weapon: { style: 'magic', damage: 2, cooldownTicks: 7, range: 14, projectileSpeed: 14, art: 'wisp_flare', element: 'radiant' },
      affixPool: [{ stat: 'magic', w: 2 }, { stat: 'sneak' }, { stat: 'maxHp' }],
      rarities: ['common', 'uncommon', 'rare'],
      acquisition: { drop: true },
      value: 130, color: '#e8e0b0', code: 'Xy',
      desc: 'A cage of twigs holding a wisp that followed someone home. It is not tame. It is patient.',
    },
    {
      id: 'gravewood', name: 'Gravewood', slot: 'weapon',
      levelReq: { skill: 'magic', level: 10 },
      weapon: { style: 'magic', damage: 3, cooldownTicks: 8, range: 14, projectileSpeed: 13, art: 'grave_chill', element: 'void' },
      affixPool: [{ stat: 'magic', w: 2 }, { stat: 'sneak' }, { stat: 'vitality' }, { stat: 'maxHp' }],
      rarities: ['common', 'uncommon', 'rare'],
      acquisition: { drop: true },
      value: 200, color: '#6a6454', code: 'Gx',
      desc: 'Cut from the tree that grows where nothing should. The skull on top came WITH the branch.',
    },
    {
      id: 'gloomthorn', name: 'Gloomthorn', slot: 'weapon',
      levelReq: { skill: 'magic', level: 14 },
      weapon: { style: 'magic', damage: 4, cooldownTicks: 8, range: 14, projectileSpeed: 13, art: 'gloom_burst', element: 'void' },
      affixPool: [{ stat: 'magic', w: 2 }, { stat: 'herbalism' }, { stat: 'sneak' }, { stat: 'maxHp' }],
      rarities: ['uncommon', 'rare', 'epic', 'legendary'],
      acquisition: { drop: true },
      value: 300, color: '#7a5a8a', code: 'Hx',
      desc: 'Briar wound so tight it knotted into a grudge. Every thorn points at somebody.',
    },
    {
      id: 'serpentcoil', name: 'Serpentcoil', slot: 'weapon',
      levelReq: { skill: 'magic', level: 18 },
      weapon: { style: 'magic', damage: 4, cooldownTicks: 7, range: 14, projectileSpeed: 14, art: 'venom_lash', element: 'verdant' },
      affixPool: [{ stat: 'magic', w: 2 }, { stat: 'herbalism', w: 2 }, { stat: 'sneak' }, { stat: 'maxHp' }],
      rarities: ['uncommon', 'rare', 'epic', 'legendary'],
      acquisition: { drop: true },
      value: 420, color: '#8aa050', code: 'Qn',
      desc: 'Two bronze serpents climbing a blackwood spine, mouths open at the crown. One of them is real. Guess.',
    },
    {
      id: 'glacierbite', name: 'Glacierbite', slot: 'weapon',
      levelReq: { skill: 'magic', level: 22 },
      weapon: { style: 'magic', damage: 5, cooldownTicks: 9, range: 14, projectileSpeed: 13, art: 'shatterfrost', element: 'frost' },
      affixPool: [{ stat: 'magic', w: 2 }, { stat: 'fishing' }, { stat: 'defence' }, { stat: 'maxHp' }],
      rarities: ['uncommon', 'rare', 'epic', 'legendary'],
      acquisition: { drop: true },
      value: 600, color: '#b0d8e8', code: 'Gq',
      desc: 'A spear of blue ice on an old pine haft. It has not melted in living memory, and it is not planning to.',
    },
    {
      id: 'pyreheart', name: 'Pyreheart', slot: 'weapon',
      levelReq: { skill: 'magic', level: 24 },
      weapon: { style: 'magic', damage: 6, cooldownTicks: 10, range: 13, projectileSpeed: 12, art: 'magma_orb', element: 'ember' },
      affixPool: [{ stat: 'magic', w: 2 }, { stat: 'smithing', w: 2 }, { stat: 'vitality' }, { stat: 'maxHp' }],
      rarities: ['rare', 'epic', 'legendary'],
      acquisition: { drop: true },
      value: 640, color: '#3a3038', code: 'Py',
      desc: 'Obsidian over a live magma vein. The cracks glow brighter when it is about to be used, like a held breath.',
    },
    {
      id: 'runegnarl', name: 'Runegnarl', slot: 'weapon',
      levelReq: { skill: 'magic', level: 28 },
      weapon: { style: 'magic', damage: 5, cooldownTicks: 9, range: 15, projectileSpeed: 13, art: 'rune_echo', element: 'arcane' },
      affixPool: [{ stat: 'magic', w: 3 }, { stat: 'tailoring' }, { stat: 'defence' }, { stat: 'maxHp' }],
      rarities: ['rare', 'epic', 'legendary'],
      acquisition: { drop: true },
      value: 720, color: '#8a7a9e', code: 'Rq',
      desc: 'A fist of rootwood cut with runes older than the alphabet they retired. They light up in order. Then again, louder.',
    },
    {
      id: 'sunwrought', name: 'Sunwrought', slot: 'weapon',
      levelReq: { skill: 'magic', level: 30 },
      weapon: { style: 'magic', damage: 6, cooldownTicks: 9, range: 15, projectileSpeed: 15, art: 'solar_lance', element: 'radiant' },
      affixPool: [{ stat: 'magic', w: 2 }, { stat: 'farming' }, { stat: 'vitality' }, { stat: 'maxHp' }],
      rarities: ['rare', 'epic', 'legendary'],
      acquisition: { drop: true },
      value: 800, color: '#e8b84a', code: 'Sx',
      desc: 'A gold sun-disc on a white ash stave, taken from a temple that outlived its god. Dawn, whenever you want it.',
    },
    {
      id: 'boneharrow', name: 'Boneharrow', slot: 'weapon',
      levelReq: { skill: 'magic', level: 32 },
      weapon: { style: 'magic', damage: 6, cooldownTicks: 9, range: 14, projectileSpeed: 13, art: 'marrow_pulse', element: 'void' },
      affixPool: [{ stat: 'magic', w: 2 }, { stat: 'sneak', w: 2 }, { stat: 'vitality' }, { stat: 'maxHp' }],
      rarities: ['epic', 'legendary'],
      acquisition: { drop: true },
      value: 1100, color: '#d8d2be', code: 'Hy',
      desc: 'Vertebrae threaded on iron, crowned with a ribcage lantern. The dead lend it out; they expect it back.',
    },
    {
      id: 'bloodmoon', name: 'Bloodmoon', slot: 'weapon',
      levelReq: { skill: 'magic', level: 34 },
      weapon: { style: 'magic', damage: 7, cooldownTicks: 9, range: 14, projectileSpeed: 13, art: 'red_eclipse', element: 'blood' },
      affixPool: [{ stat: 'magic', w: 2 }, { stat: 'melee' }, { stat: 'vitality', w: 2 }, { stat: 'maxHp' }],
      rarities: ['epic', 'legendary'],
      acquisition: { drop: true },
      value: 1250, color: '#a83a4a', code: 'Bm',
      desc: 'A crescent of red glass that drips upward. Astronomers deny it. The crescent does not care.',
    },
    {
      id: 'nightwell', name: 'Nightwell', slot: 'weapon',
      levelReq: { skill: 'magic', level: 36 },
      weapon: { style: 'magic', damage: 7, cooldownTicks: 10, range: 15, projectileSpeed: 13, art: 'void_rift', element: 'void' },
      affixPool: [{ stat: 'magic', w: 3 }, { stat: 'sneak' }, { stat: 'maxHp' }],
      rarities: ['epic', 'legendary'],
      acquisition: { drop: true },
      value: 1300, color: '#3a3252', code: 'Nw',
      desc: 'An iron crescent cradling a sphere of finished night. Stars float in it. Not reflections — tenants.',
    },
    {
      id: 'tempest_crown', name: 'Tempest Crown', slot: 'weapon',
      levelReq: { skill: 'magic', level: 38 },
      weapon: { style: 'magic', damage: 6, cooldownTicks: 8, range: 15, projectileSpeed: 15, art: 'eye_of_the_storm', element: 'storm' },
      affixPool: [{ stat: 'magic', w: 3 }, { stat: 'defence' }, { stat: 'vitality' }, { stat: 'maxHp' }],
      rarities: ['epic', 'legendary'],
      acquisition: { drop: true },
      value: 1400, color: '#b0b8d8', code: 'Tx',
      desc: 'A ring of gale-bent silver that a storm wore as a crown until someone impertinent collected it.',
    },
    {
      id: 'worldsplinter', name: 'The Worldsplinter', slot: 'weapon',
      levelReq: { skill: 'magic', level: 50 },
      weapon: { style: 'magic', damage: 10, cooldownTicks: 9, range: 16, projectileSpeed: 16, art: 'realm_rend', element: 'astral' },
      affixPool: [{ stat: 'magic', w: 3 }, { stat: 'vitality' }, { stat: 'defence' }, { stat: 'maxHp' }],
      rarities: ['legendary'],
      acquisition: { drop: true },
      effects: [{ kind: 'cooldown', pct: 6 }, { kind: 'elementDmg', element: 'astral', pct: 10 }],
      value: 2000, color: '#9ae8de', code: 'Wx',
      desc: 'A shard of the sky that fell before there were words for falling, socketed in whatever could hold it. Reality thins politely around the tip.',
    },
  ];

  return [...carved, ...battlestaffs, ...classics, ...crafts, ...finds];
}

/** Compiled once at module load — throws loudly on any malformed def. */
export const COMPILED_EQUIPMENT = compileEquipment(EQUIPMENT_DEFS);

/**
 * Gem → battlestaff element map, the re-socketing law. Using one of
 * these gems while a battlestaff is EQUIPPED swaps the staff's stone in
 * place: the item id transmutes (same willow frame, same ROLL — rarity,
 * seed, and power ride through untouched) and the whole school follows.
 * The consumed gem is spent; the pried-out stone does not come back.
 */
export const GEM_BATTLESTAFFS: Record<string, string> = {
  emberstone: 'ember_battlestaff',
  frostshard: 'frost_battlestaff',
  stormpearl: 'storm_battlestaff',
  bloomstone: 'verdant_battlestaff',
};
