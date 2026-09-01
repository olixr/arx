import {
  ELEMENT_COLORS,
  GRADED_PRODUCE,
  gradeOf,
  itemDef,
  type ItemDef,
} from '@arx/content';
import { RARITY_COLORS, rarityIndex, type ItemRoll } from '@arx/shared';
import { shade } from './tint.js';
import { chamferRect, facetBlob, facetCircle } from './shapes.js';
import {
  bladeStyle,
  bowStyle,
  drawBow,
  drawGreatweapon,
  drawPole,
  drawStaff,
  drawSword,
  greatStyle,
  poleStyle,
  staffStyle,
  wieldClass,
} from './weapons.js';
import { drawTool, toolStyle } from './tools.js';
import { drawShieldAt, shieldStyle } from './shields.js';
import { offhandStyle } from './armor.js';

/**
 * THE DROPPED WORLD — every item's honest form on the ground.
 *
 * For years a dropped item was a leather bag with a topper. This module
 * replaces the bag with a REPRESENTATION LAW: an item on the ground is
 * the item, at the world's own scale, wherever the thing can honestly
 * be shown — and a deliberate, slot-shaped generalization where a 1:1
 * render would lie or mud (armor worn on a body has no honest "on the
 * ground" pose; it becomes the smith's bundle of its own slot, in its
 * own colors).
 *
 * The families:
 *  - WEAPONS AND TOOLS lie on the ground at their true held scale,
 *    painted by the SAME style painters that dress the fist — zero art
 *    drift, living fx channels still breathing on the dirt. The lay is
 *    a ground-plane projection (y-squash OUTSIDE the lay rotation), so
 *    a spear reads as a spear lying in the grass, not a spear pasted on
 *    it. Shields lie face-up through drawShieldAt's plane yaw.
 *  - ARMOR is the DELIBERATE GENERALIZATION, per slot: a helm's dome, a
 *    strapped cuirass bundle, folded legwear, a standing pair of boots,
 *    crossed gloves, a rolled cloak — each tinted by the piece and
 *    dressed by its armor class (cloth folds, leather stitch, plate
 *    sheen). Offhand tomes/orbs/quivers get their own true forms.
 *  - MATERIALS are 1:1: logs with ring faces, plank stacks, ingots that
 *    pyramid as the stack grows, draped pelts, cloth bolts, crystal
 *    shards glowing in their school's color, scrolls with wax seals,
 *    real keys, rings, bones, feathers, seed pouches, produce heaps,
 *    steaming bowls, cheese wheels with the wedge cut out.
 *  - THE SATCHEL survives as the last-resort fallback only — if a thing
 *    can't be shown beautifully, the generalization must still be.
 *
 * Stack grammar is per-family (bars pyramid, fish fan, scrolls fan,
 *  produce heaps) — a pile reads as a PILE before its label confirms it.
 * Rarity is a ground statement: uncommon+ rolls glow in their tier's
 *  color, rare+ orbit motes, legendary breathes a soft light shaft.
 *
 * Everything renders inside the drop's local frame: origin at the
 * drop's ground point, +y down, one world tile = `k` px. The caller
 * (renderer.dropItem) owns landing pop, bob, contact shadow, hover
 * and the loot label; this module owns the matter itself.
 */

// ---------------------------------------------------------------- form taxonomy

export type GroundForm =
  // 1:1 forms
  | 'coins'
  | 'ore'
  | 'egg'
  | 'weapon'
  | 'tool'
  | 'shield'
  | 'tome'
  | 'orb'
  | 'quiver'
  | 'arrows'
  | 'log'
  | 'board'
  | 'bar'
  | 'hide'
  | 'clothbolt'
  | 'wool'
  | 'cotton'
  | 'spool'
  | 'sheaf'
  | 'gem'
  | 'pearl'
  | 'dust'
  | 'scroll'
  | 'paper'
  | 'key'
  | 'ring'
  | 'bone'
  | 'fang'
  | 'shellplate'
  | 'feather'
  | 'sac'
  | 'slag'
  | 'seedpouch'
  | 'sapling'
  | 'twigbundle'
  | 'acorn'
  | 'pinecone'
  | 'resin'
  | 'waxcake'
  | 'sack'
  | 'soil'
  | 'crate'
  | 'saddle'
  | 'lead'
  | 'wateringcan'
  | 'locket'
  | 'token'
  | 'laurel'
  | 'truffle'
  // food & drink
  | 'fish'
  | 'bird'
  | 'steak'
  | 'root'
  | 'bulb'
  | 'leafhead'
  | 'gourd'
  | 'fruit'
  | 'berries'
  | 'loaf'
  | 'cake'
  | 'pie'
  | 'dish'
  | 'bowl'
  | 'board_feast'
  | 'butter'
  | 'cheese'
  | 'jug'
  | 'pail'
  | 'honeypot'
  | 'jar'
  | 'skillet'
  | 'burnt'
  | 'potion'
  | 'oilvial'
  | 'salvepot'
  // the generalizations
  | 'helm'
  | 'bodyarmor'
  | 'legarmor'
  | 'boots'
  | 'gloves'
  | 'cape'
  | 'trinket'
  | 'satchel';

/** Species dress for the fish family: hue, proportion, and light. */
const FISH_LOOK: Record<string, { col: string; belly: string; long: number; glow?: string }> = {
  trout: { col: '#7a9a6a', belly: '#d8cfa8', long: 1 },
  pike: { col: '#6a8a56', belly: '#c8c898', long: 1.25 },
  eel: { col: '#5a6a7a', belly: '#a8b0b8', long: 1.55 },
  salmon: { col: '#b07a62', belly: '#e8c8a8', long: 1.1 },
  glimmerfish: { col: '#7ab4d8', belly: '#d8ecf8', long: 0.95, glow: '#9ad8f8' },
};

const WOOD_TINT: Record<string, string> = {
  log: '#8a6a45',
  oak_log: '#7a5a38',
  pine_log: '#a3805a',
  willow_log: '#94825e',
  yew_log: '#6b4a3a',
  board: '#a3805a',
  oak_board: '#8a6a45',
};

/** Explicit small families — ids whose form no field can derive. */
const FORM_BY_ID: Record<string, GroundForm> = {
  coins: 'coins',
  egg: 'egg',
  egg_fine: 'egg',
  egg_prime: 'egg',
  arrow: 'arrows',
  // wood
  log: 'log', oak_log: 'log', pine_log: 'log', willow_log: 'log', yew_log: 'log',
  board: 'board', oak_board: 'board',
  // hides & fibers
  leather: 'hide', hardened_leather: 'hide', cowhide: 'hide', wolf_fur: 'hide',
  direwolf_pelt: 'hide', feywolf_pelt: 'hide', lynx_pelt: 'hide', duskruff_pelt: 'hide',
  fox_pelt: 'hide', smokebrush_pelt: 'hide', gnoll_hide: 'hide', scrap_hide: 'hide',
  packlord_mane: 'hide',
  cloth: 'clothbolt', linen: 'clothbolt', gloomsilk: 'clothbolt', moonpale_silk: 'clothbolt',
  linen_scrap: 'clothbolt',
  wool: 'wool', wool_fine: 'wool', wool_prime: 'wool',
  cotton: 'cotton', cotton_fine: 'cotton', cotton_prime: 'cotton',
  twine: 'spool', gloomsilk_thread: 'spool',
  plant_fibre: 'sheaf', wheat: 'sheaf', wheat_fine: 'sheaf', wheat_prime: 'sheaf',
  barley: 'sheaf', barley_fine: 'sheaf', barley_prime: 'sheaf',
  silverbark: 'board',
  // stones, cores & light
  emberstone: 'gem', frostshard: 'gem', stormpearl: 'pearl', bloomstone: 'gem',
  deepening_sigil: 'gem', everfrost_shard: 'gem', golem_core: 'gem',
  hillstone_heart: 'gem', wardstone: 'gem', moonglass_lens: 'gem',
  deepking_pearl: 'pearl', molten_slag: 'slag',
  arcane_dust: 'dust', focused_dust: 'dust', spore_dust: 'dust',
  // keys, rings, papers
  brass_key: 'key', dungeon_key: 'key',
  gold_ring: 'ring', silver_ring: 'ring', legion_ring: 'ring', seal_ring: 'ring',
  grave_band: 'ring',
  torn_ledger_page: 'paper', survey_pages: 'paper', weathered_letter: 'paper',
  redmask_writ: 'paper',
  gilded_locket: 'locket', crew_paytin: 'token', reavers_mark: 'token',
  warlord_crest: 'token', spade_mark: 'token', marked_tool: 'token',
  sand_laurel: 'laurel',
  // trophies of the wild
  bones: 'bone',
  worg_fang: 'fang', ogre_tooth: 'fang', warboss_tusk: 'fang', razorback_tusk: 'fang',
  crusher_claw: 'fang',
  turtle_scute: 'shellplate', colossus_plate: 'shellplate', crab_carapace: 'shellplate',
  skral_frill: 'shellplate', forgeplate_scrap: 'shellplate', bonegrinder_girdle: 'shellplate',
  basilisk_scale: 'shellplate', fen_basilisk_hide: 'hide', petrified_eye: 'pearl',
  feather: 'feather', owl_plume: 'feather', elder_plume: 'feather',
  venom_sac: 'sac', venom_sac_fine: 'sac', venom_sac_prime: 'sac', venom_gland: 'sac',
  truffle: 'truffle', truffle_fine: 'truffle', truffle_prime: 'truffle',
  // the garden
  acorn: 'acorn', pine_cone: 'pinecone', pine_resin: 'resin', beeswax: 'waxcake',
  tree_seed: 'seedpouch', palegill_spores: 'seedpouch',
  apple_sapling: 'sapling', plum_sapling: 'sapling', mirefig_sapling: 'sapling',
  willow_cutting: 'twigbundle', bush_cutting: 'twigbundle', bramble_cutting: 'twigbundle',
  compost: 'soil', prime_compost: 'soil',
  salt: 'sack', flour: 'sack',
  watering_can: 'wateringcan',
  chick_crate: 'crate', calf_crate: 'crate', lamb_crate: 'crate', boarlet_crate: 'crate',
  drovers_lead: 'lead',
  // dairy & pantry
  milk: 'pail', milk_fine: 'pail', milk_prime: 'pail',
  butter: 'butter', butter_fine: 'butter', butter_prime: 'butter',
  soft_cheese: 'cheese', soft_cheese_fine: 'cheese', soft_cheese_prime: 'cheese',
  hard_cheese: 'cheese', hard_cheese_fine: 'cheese', hard_cheese_prime: 'cheese',
  honey: 'honeypot', honey_fine: 'honeypot', honey_prime: 'honeypot',
  cooking_oil: 'oilvial', cooking_oil_fine: 'oilvial', cooking_oil_prime: 'oilvial',
  vinegar: 'oilvial',
  cider: 'jug', cider_fine: 'jug', cider_prime: 'jug',
  farmhouse_ale: 'jug', farmhouse_ale_fine: 'jug', farmhouse_ale_prime: 'jug',
  honeybrew: 'jug', honeybrew_fine: 'jug', honeybrew_prime: 'jug',
  pickled_cabbage: 'jar',
  fried_egg: 'skillet',
  burnt_food: 'burnt',
  // cooked & raw larder (fish resolve by species below; these are the rest)
  raw_chicken: 'bird', cooked_chicken: 'bird',
  raw_beef: 'steak', cooked_beef: 'steak', smoked_beef: 'steak',
  bread: 'loaf', cake: 'cake',
  pumpkin_pie: 'pie', shepherds_pie: 'pie', orchard_tart: 'pie',
  orchard_crumble: 'dish', buttered_potatoes: 'dish', roast_redroot: 'dish',
  honeyed_carrots: 'dish', kingsquash_bake: 'dish', truffle_roast: 'dish',
  roast_pumpkin: 'dish', baked_potato: 'dish',
  onion_soup: 'bowl', hearty_pottage: 'bowl', barley_porridge: 'bowl',
  hearty_stew: 'bowl', fishers_pot: 'bowl',
  ploughmans_board: 'board_feast', harvest_feast: 'board_feast', royal_banquet: 'board_feast',
};

/** Produce forms by base id (graded variants resolve through gradeOf). */
const PRODUCE_FORM: Record<string, GroundForm> = {
  carrot: 'root', redroot: 'root',
  potato: 'bulb', onion: 'bulb',
  cabbage: 'leafhead',
  pumpkin: 'gourd', kingsquash: 'gourd',
  apple: 'fruit', plum: 'fruit', mirefig: 'fruit',
  berries: 'berries',
  sagewort: 'sheaf', moonbell: 'sheaf', bittercress: 'sheaf', silverleaf: 'sheaf',
  duskthorn: 'sheaf', dawnveil: 'sheaf', sunflower: 'sheaf',
  dried_sagewort: 'sheaf', dried_moonbell: 'sheaf', dried_bittercress: 'sheaf',
  adderstongue: 'sheaf',
};

const ORE_IDS = new Set([
  'copper_ore', 'tin_ore', 'iron_ore', 'coal', 'gold_ore', 'silver_ore',
  'mithril_ore', 'adamant_ore', 'obsidian_shard', 'starmetal_ore',
]);

function fishSpecies(itemId: string): string | undefined {
  for (const sp of Object.keys(FISH_LOOK)) {
    if (itemId === sp || itemId === `raw_${sp}` || itemId === `smoked_${sp}` || itemId === `panfried_${sp}`) {
      return sp;
    }
  }
  return undefined;
}

/**
 * The classification law: every item id resolves to exactly one ground
 * form. Field-derived families first (weapon styles, slots, scroll
 * fields), then the explicit id maps, then the satchel.
 */
export function groundForm(itemId: string): GroundForm {
  const explicit = FORM_BY_ID[itemId];
  if (explicit) return explicit;
  if (ORE_IDS.has(itemId)) return 'ore';
  if (fishSpecies(itemId)) return 'fish';

  const def = itemDef(itemId);

  // Graded produce (and dried herbs) fold onto their base's form.
  const { base } = gradeOf(itemId);
  const produce = PRODUCE_FORM[base];
  if (produce && (base === itemId || GRADED_PRODUCE.has(base) || base.startsWith('dried_'))) {
    return produce;
  }

  // The written word FIRST: an enchant scroll or a `recipe_craft_iron_sword`
  // is parchment, whatever weapon name rides its id — field identity
  // outranks the armory's id heuristics.
  if (def?.enchant || def?.teaches || itemId.startsWith('scroll_') || itemId.startsWith('recipe_')) {
    return 'scroll';
  }
  if (def?.mount) return 'saddle';

  // The gatherer's kit.
  if (def?.tool) return 'tool';

  // Offhands next (a spiked_buckler is a shield, not a blade): shields
  // lie as shields; tomes, orbs and quivers as themselves.
  if (def?.equipSlot === 'offhand' && !def?.weapon) {
    const kind = offhandStyle(itemId).kind;
    if (kind === 'tome') return 'tome';
    if (kind === 'orb') return 'orb';
    if (kind === 'quiver') return 'quiver';
    return 'shield';
  }

  // The wardrobe generalization, per slot.
  switch (def?.equipSlot) {
    case 'head': return 'helm';
    case 'body': return 'bodyarmor';
    case 'legs': return 'legarmor';
    case 'boots': return 'boots';
    case 'gloves': return 'gloves';
    case 'cape': return 'cape';
    case 'relic':
    case 'sigil': return 'trinket';
  }

  // The armory: anything the fist can paint lies on the ground as
  // itself. Known defs need the weapon field; unknown ids (dev spawns,
  // future content) may still resolve through the id heuristic.
  if (def?.weapon || (!def && wieldClass(itemId) !== 'none')) return 'weapon';
  if (!def && toolStyle(itemId, undefined)) return 'tool';

  // Metal loaves.
  if (itemId.endsWith('_bar')) return 'bar';

  // The elemental essences (ember_essence, frost_essence, ...).
  if (itemId.endsWith('_essence')) return 'gem';
  // Seeds and spores.
  if (itemId.endsWith('_seed') || itemId.endsWith('_spores')) return 'seedpouch';
  if (itemId.endsWith('_sapling')) return 'sapling';
  if (itemId.endsWith('_cutting')) return 'twigbundle';

  // Brews, oils and salves by the apothecary's suffix grammar.
  if (itemId.endsWith('_oil') || def?.coating) return 'oilvial';
  if (itemId.endsWith('_salve')) return 'salvepot';
  if (
    itemId.endsWith('_tincture') || itemId.endsWith('_tonic') || itemId.endsWith('_draught') ||
    itemId.endsWith('_elixir') || itemId.endsWith('_brew') || itemId === 'vipers_kiss' ||
    itemId === 'hobble_brew'
  ) {
    return 'potion';
  }

  // Any other consumable: a covered dish is the honest generalization.
  if (def?.heals || def?.buff) return 'dish';

  return 'satchel';
}

// ---------------------------------------------------------------- draw contract

export interface GroundDropEnv {
  ctx: CanvasRenderingContext2D;
  /** Camera scale: px per world tile. */
  k: number;
  /** Entity id — seeds deterministic per-drop jitter and fx phase. */
  eid: number;
  itemId: string;
  qty: number;
  now: number;
  /** Outline ink (hover brightens it). */
  outline: string;
  hovered: boolean;
  roll?: ItemRoll;
}

/** Deterministic per-drop hash, matching the renderer's coin scatter. */
function rnd(eid: number, i: number): number {
  const v = Math.sin(eid * 12.9898 + i * 78.233) * 43758.5453;
  return v - Math.floor(v);
}

/**
 * The ground-plane projection for lying objects: y compressed OUTSIDE
 * the lay rotation, so a long thing rotated on the ground foreshortens
 * exactly as the camera's tilt demands.
 */
const GROUND_SQUASH = 0.62;

/** Contact-shadow spread multiplier per form (the caller draws it). */
export function groundShadowSpread(itemId: string): number {
  switch (groundForm(itemId)) {
    case 'coins': return 0.75;
    case 'weapon': case 'tool': case 'arrows': return 1.5;
    case 'shield': return 1.25;
    case 'log': case 'board': return 1.3;
    case 'board_feast': return 1.2;
    case 'sapling': case 'crate': return 1.0;
    case 'feather': case 'ring': case 'key': case 'acorn': return 0.45;
    default: return 0.85;
  }
}

/**
 * The drop's ground glow, if it earns one: rolled rarity above common
 * speaks in its tier color; crystal matter glows in its school; big
 * coin piles and high-value goods keep their classic shimmer.
 */
export function groundGlowFor(
  itemId: string,
  qty: number,
  roll?: ItemRoll,
): { rgb: string; r: number; a: number } | null {
  const rar = roll?.rar;
  if (rar && rar !== 'common') {
    const col = RARITY_COLORS[rar];
    if (col) {
      const c = parseInt(col.slice(1), 16);
      const t = rarityIndex(rar);
      return {
        rgb: `${(c >> 16) & 255}, ${(c >> 8) & 255}, ${c & 255}`,
        r: 0.55 + t * 0.12,
        a: 0.08 + t * 0.035,
      };
    }
  }
  const def = itemDef(itemId);
  const form = groundForm(itemId);
  if (form === 'gem' || form === 'pearl' || form === 'slag') {
    const col = def?.color ?? '#b0a49a';
    const c = parseInt(col.slice(1), 16);
    return { rgb: `${(c >> 16) & 255}, ${(c >> 8) & 255}, ${c & 255}`, r: 0.6, a: 0.12 };
  }
  if (itemId === 'coins' && qty >= 25) return { rgb: '232, 182, 76', r: 0.7, a: 0.1 };
  if ((def?.value ?? 0) >= 300) {
    const col = def?.color ?? '#b0a49a';
    const c = parseInt(col.slice(1), 16);
    return { rgb: `${(c >> 16) & 255}, ${(c >> 8) & 255}, ${c & 255}`, r: 0.7, a: 0.12 };
  }
  return null;
}

// ---------------------------------------------------------------- outline shader

// THE GROUND RING: reused style painters (weapons, tools, shields) are
// authored ringless — the rig rings them source-atop against the body,
// the icon baker rings them offline. On the open ground the item needs
// the FULL ring, live, under whatever lay transform the drop composed:
// paint the art into a scratch at device pixels, stamp eight tinted
// taps of its alpha UNDER it, blit both. Scratches are module-scoped
// and grow-only; contexts without canvas support (test stubs) fall
// back to ringless direct paint.
let olA: HTMLCanvasElement | null = null;
let olACtx: CanvasRenderingContext2D | null = null;
let olB: HTMLCanvasElement | null = null;
let olBCtx: CanvasRenderingContext2D | null = null;
const OL_TAPS: ReadonlyArray<readonly [number, number]> = [
  [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1],
];

function paintOutlinedGround(
  ctx: CanvasRenderingContext2D,
  outline: string,
  s: number,
  env: readonly [number, number, number, number],
  paint: (c: CanvasRenderingContext2D) => void,
): void {
  if (!olA && typeof document !== 'undefined' && typeof ctx.getTransform === 'function') {
    olA = document.createElement('canvas');
    olB = document.createElement('canvas');
    olACtx = olA.getContext('2d');
    olBCtx = olB.getContext('2d');
  }
  const a = olACtx;
  const b = olBCtx;
  if (!a || !b || !olA || !olB || typeof ctx.getTransform !== 'function') {
    paint(ctx);
    return;
  }
  const m = ctx.getTransform();
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [px, py] of [
    [env[0] * s, env[2] * s], [env[1] * s, env[2] * s],
    [env[0] * s, env[3] * s], [env[1] * s, env[3] * s],
  ] as const) {
    const dx = m.a * px + m.c * py + m.e;
    const dy = m.b * px + m.d * py + m.f;
    if (dx < minX) minX = dx;
    if (dx > maxX) maxX = dx;
    if (dy < minY) minY = dy;
    if (dy > maxY) maxY = dy;
  }
  const norm = Math.hypot(m.a, m.b) || 1;
  const ring = Math.max(1.25, s * norm * 0.042);
  const ri = Math.max(1, Math.round(ring));
  const rd = Math.max(1, Math.round(ring * 0.71));
  const pad = ri + 3;
  const w = Math.ceil(maxX - minX) + pad * 2;
  const h = Math.ceil(maxY - minY) + pad * 2;
  if (w <= 0 || h <= 0 || w > 4096 || h > 4096) {
    paint(ctx);
    return;
  }
  if (olA.width < w || olA.height < h) {
    olA.width = olB.width = Math.max(olA.width, w);
    olA.height = olB.height = Math.max(olA.height, h);
  }
  // Art at device pixels under the live transform.
  a.setTransform(1, 0, 0, 1, 0, 0);
  a.clearRect(0, 0, w, h);
  a.setTransform(m.a, m.b, m.c, m.d, m.e - minX + pad, m.f - minY + pad);
  paint(a);
  // Ring: eight tinted taps of the art's alpha.
  b.setTransform(1, 0, 0, 1, 0, 0);
  b.clearRect(0, 0, w, h);
  for (const [tx, ty] of OL_TAPS) {
    const diag = tx !== 0 && ty !== 0;
    b.drawImage(olA, tx * (diag ? rd : ri), ty * (diag ? rd : ri));
  }
  b.globalCompositeOperation = 'source-in';
  b.fillStyle = outline;
  b.fillRect(0, 0, w, h);
  b.globalCompositeOperation = 'source-over';
  // Blit ring then art in device space.
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(olB, 0, 0, w, h, minX - pad, minY - pad, w, h);
  ctx.drawImage(olA, 0, 0, w, h, minX - pad, minY - pad, w, h);
  ctx.restore();
  a.setTransform(1, 0, 0, 1, 0, 0);
  b.setTransform(1, 0, 0, 1, 0, 0);
}

// ---------------------------------------------------------------- raw matter

/** Real gold on the ground: a pile that grows with the sum. */
function drawCoinsGround(g: GroundDropEnv): void {
  const { ctx, k, eid, qty, now } = g;
  const n = qty >= 200 ? 9 : qty >= 50 ? 6 : qty >= 10 ? 4 : 3;
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = Math.max(1.2, k * 0.032);
  for (let i = 0; i < n; i++) {
    const row = i < Math.ceil(n / 2) ? 0 : i < n - 1 ? 1 : 2;
    const inRow = row === 0 ? i : row === 1 ? i - Math.ceil(n / 2) : 0;
    const rowN = row === 0 ? Math.ceil(n / 2) : Math.max(1, n - 1 - Math.ceil(n / 2));
    const cx = (inRow - (rowN - 1) / 2) * k * 0.13 + (rnd(eid, i) - 0.5) * k * 0.05;
    const cy = -row * k * 0.075 + (rnd(eid, i + 9) - 0.5) * k * 0.02;
    ctx.fillStyle = row === 2 ? '#f2cd5e' : row === 1 ? '#e8b64c' : '#d9a441';
    ctx.beginPath();
    ctx.ellipse(cx, cy, k * 0.085, k * 0.055, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(122, 84, 30, 0.75)';
    ctx.beginPath();
    ctx.ellipse(cx, cy, k * 0.048, k * 0.028, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = g.outline;
    ctx.lineWidth = Math.max(1.2, k * 0.032);
  }
  drawTwinkle(g, now, -k * 0.07);
}

/** The wandering glint gold and gems share — catches the eye afield. */
function drawTwinkle(g: GroundDropEnv, now: number, baseY: number): void {
  const { ctx, k, eid } = g;
  const tw = Math.sin(now / 260 + eid * 2.3);
  if (tw <= 0.55) return;
  const a = (tw - 0.55) / 0.45;
  const gx = (rnd(eid, 31) - 0.5) * k * 0.3;
  const gy = baseY - rnd(eid, 32) * k * 0.08;
  ctx.fillStyle = `rgba(255, 244, 214, ${0.9 * a})`;
  const gr = k * 0.045 * a;
  ctx.beginPath();
  ctx.moveTo(gx, gy - gr);
  ctx.lineTo(gx + gr * 0.4, gy);
  ctx.lineTo(gx, gy + gr);
  ctx.lineTo(gx - gr * 0.4, gy);
  ctx.closePath();
  ctx.fill();
}

const ORE_DROP: Record<string, string> = {
  copper_ore: '#c47b3d',
  tin_ore: '#cfd3dc',
  iron_ore: '#a05038',
  coal: '#4a4456',
  gold_ore: '#e8b64c',
  silver_ore: '#c6cfe0',
  mithril_ore: '#8fb4e4',
  adamant_ore: '#6cb47a',
  obsidian_shard: '#3b3247',
  starmetal_ore: '#d6cbf6',
};

/** Raw stone reads as stone — hefty chunk plus spall, node language. */
function drawOreGround(g: GroundDropEnv, def: ItemDef | undefined): void {
  const { ctx, k, itemId, now } = g;
  const oreCol = ORE_DROP[itemId] ?? def?.color ?? '#b0a49a';
  const accent =
    itemId === 'coal' ? '#8a86a0'
    : itemId === 'obsidian_shard' ? '#b8a8d8'
    : itemId === 'tin_ore' || itemId === 'silver_ore' || itemId === 'starmetal_ore' ? '#ffffff'
    : itemId === 'mithril_ore' ? '#d8ecff'
    : itemId === 'adamant_ore' ? '#d2f0d0'
    : '#fff6d8';
  const chunk = (cx: number, cy: number, w: number, rot: number): void => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    const hh = w * 0.8;
    const cut = w * 0.2;
    ctx.fillStyle = shade(oreCol, -32);
    ctx.strokeStyle = g.outline;
    ctx.lineWidth = Math.max(1.4, k * 0.038);
    ctx.beginPath();
    chamferRect(ctx, -w / 2, -hh / 2, w, hh, cut);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = oreCol;
    ctx.beginPath();
    chamferRect(ctx, -w * 0.38, -hh * 0.4, w * 0.72, hh * 0.66, cut * 0.7);
    ctx.fill();
    ctx.fillStyle = accent;
    ctx.fillRect(-w * 0.28, -hh * 0.3, w * 0.24, hh * 0.18);
    ctx.restore();
  };
  chunk(-k * 0.1, -k * 0.14, k * 0.36, -0.1);
  chunk(k * 0.17, -k * 0.07, k * 0.24, 0.16);
  if (itemId === 'copper_ore') {
    ctx.fillStyle = '#3fa98e';
    ctx.globalAlpha = 0.6;
    ctx.fillRect(-k * 0.2, -k * 0.08, k * 0.07, k * 0.06);
    ctx.globalAlpha = 1;
  } else if (itemId === 'iron_ore') {
    ctx.fillStyle = shade(oreCol, -24);
    ctx.fillRect(-k * 0.24, -k * 0.16, k * 0.26, Math.max(1.2, k * 0.032));
  } else if (itemId === 'gold_ore') {
    drawTwinkle(g, now, -k * 0.2);
  }
}

/** A hen's egg where it was laid — a small clutch for a stack. */
function drawEggGround(g: GroundDropEnv): void {
  const { ctx, k, eid, qty } = g;
  const n = Math.min(3, qty);
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = Math.max(1.2, k * 0.034);
  for (let i = 0; i < n; i++) {
    const ex = (i - (n - 1) / 2) * k * 0.15 + (rnd(eid, i + 3) - 0.5) * k * 0.04;
    const ey = (rnd(eid, i + 7) - 0.5) * k * 0.05;
    const rot = (rnd(eid, i + 11) - 0.5) * 0.7;
    ctx.fillStyle = i % 2 ? '#efe3c8' : '#e8d9b0';
    ctx.beginPath();
    ctx.ellipse(ex, ey, k * 0.075, k * 0.095, rot, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#f8f2e0';
    ctx.beginPath();
    ctx.ellipse(ex - k * 0.02, ey - k * 0.035, k * 0.026, k * 0.034, rot, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * A felled round on the ground: bark cylinder lying at the ground
 * diagonal, ring face toward the eye — the log-yard language at drop
 * scale. Stacks build the 2+1 cord.
 */
function drawLogGround(g: GroundDropEnv, def: ItemDef | undefined): void {
  const { ctx, k, eid, qty, itemId } = g;
  const bark = WOOD_TINT[itemId] ?? def?.color ?? '#8a6a45';
  const face = shade(bark, 34);
  const lw = Math.max(1.4, k * 0.04);
  const one = (cx: number, cy: number, len: number, r: number): void => {
    ctx.save();
    ctx.translate(cx, cy);
    // Body.
    ctx.fillStyle = bark;
    ctx.strokeStyle = g.outline;
    ctx.lineWidth = lw;
    ctx.beginPath();
    chamferRect(ctx, -len / 2, -r, len, r * 2, r * 0.55);
    ctx.fill();
    ctx.stroke();
    // Bark grain: two long shade bands.
    ctx.fillStyle = shade(bark, -20);
    ctx.beginPath();
    chamferRect(ctx, -len / 2 + r * 0.4, r * 0.15, len - r * 1.4, r * 0.5, r * 0.2);
    ctx.fill();
    ctx.fillStyle = shade(bark, 14);
    ctx.beginPath();
    chamferRect(ctx, -len / 2 + r * 0.5, -r * 0.72, len * 0.45, r * 0.42, r * 0.18);
    ctx.fill();
    // Ring face, right end: pale disc + rings.
    ctx.fillStyle = face;
    ctx.beginPath();
    ctx.ellipse(len / 2, 0, r * 0.42, r * 0.96, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = shade(face, -30);
    ctx.lineWidth = Math.max(1, k * 0.016);
    ctx.beginPath();
    ctx.ellipse(len / 2, 0, r * 0.22, r * 0.5, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  };
  const len = k * 0.62;
  const r = k * 0.115;
  if (qty >= 3) {
    one(-k * 0.09, -k * 0.02, len, r);
    one(k * 0.12, -k * 0.005 + k * 0.01, len * 0.92, r);
    one(k * 0.01, -k * 0.19, len * 0.9, r);
  } else if (qty === 2) {
    one(-k * 0.06, -k * 0.01, len, r);
    one(k * 0.1, -k * 0.03, len * 0.9, r * 0.95);
  } else {
    ctx.save();
    ctx.rotate((rnd(eid, 71) - 0.5) * 0.24);
    one(0, -k * 0.06, len, r);
    ctx.restore();
  }
}

/** Sawn boards in a neat cross-stack, per-wood tint. */
function drawBoardGround(g: GroundDropEnv, def: ItemDef | undefined): void {
  const { ctx, k, qty, itemId } = g;
  const wood = WOOD_TINT[itemId] ?? def?.color ?? '#a3805a';
  const lw = Math.max(1.4, k * 0.038);
  const n = qty >= 10 ? 4 : qty >= 3 ? 3 : 2;
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = lw;
  for (let i = 0; i < n; i++) {
    const y = -k * 0.02 - i * k * 0.075;
    const off = (i % 2 ? -1 : 1) * k * 0.03;
    ctx.fillStyle = i === n - 1 ? shade(wood, 16) : shade(wood, -6 * i);
    ctx.beginPath();
    chamferRect(ctx, -k * 0.31 + off, y - k * 0.07, k * 0.62, k * 0.075, k * 0.018);
    ctx.fill();
    ctx.stroke();
    // End grain on the right edge.
    ctx.fillStyle = shade(wood, 30);
    ctx.fillRect(k * 0.31 + off - k * 0.045, y - k * 0.062, k * 0.038, k * 0.06);
    // One knot or grain line per board.
    ctx.strokeStyle = shade(wood, -28);
    ctx.lineWidth = Math.max(1, k * 0.016);
    ctx.beginPath();
    ctx.moveTo(-k * 0.24 + off, y - k * 0.032);
    ctx.lineTo(k * 0.18 + off, y - k * 0.038);
    ctx.stroke();
    ctx.strokeStyle = g.outline;
    ctx.lineWidth = lw;
  }
}

/**
 * The smelter's loaf: a chamfered ingot with a bright top face; the
 * classic pyramid as the stack grows. Metal identity = the def color.
 */
function drawBarGround(g: GroundDropEnv, def: ItemDef | undefined): void {
  const { ctx, k, qty } = g;
  const metal = def?.color ?? '#c8ccd6';
  const lw = Math.max(1.4, k * 0.04);
  const one = (cx: number, cy: number, dk: number): void => {
    ctx.save();
    ctx.translate(cx, cy);
    const w = k * 0.3;
    const h = k * 0.13;
    // Loaf body: trapezoid flanks + lit top plane (the crate-lid law).
    ctx.fillStyle = shade(metal, dk - 12);
    ctx.strokeStyle = g.outline;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(-w / 2, 0);
    ctx.lineTo(-w / 2 + k * 0.035, -h);
    ctx.lineTo(w / 2 - k * 0.035, -h);
    ctx.lineTo(w / 2, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = shade(metal, dk + 26);
    ctx.beginPath();
    ctx.moveTo(-w / 2 + k * 0.035, -h);
    ctx.lineTo(-w / 2 + k * 0.062, -h - k * 0.045);
    ctx.lineTo(w / 2 - k * 0.062, -h - k * 0.045);
    ctx.lineTo(w / 2 - k * 0.035, -h);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Stamp mark on the flank.
    ctx.fillStyle = shade(metal, dk - 34);
    ctx.beginPath();
    facetCircle(ctx, 0, -h * 0.5, k * 0.028, 6);
    ctx.fill();
    ctx.restore();
  };
  if (qty >= 3) {
    one(-k * 0.16, 0, -8);
    one(k * 0.16, 0, -4);
    one(0, -k * 0.155, 8);
  } else if (qty === 2) {
    one(-k * 0.16, 0, -6);
    one(k * 0.16, -k * 0.01, 2);
  } else {
    one(0, -k * 0.02, 0);
  }
}

/**
 * A pelt draped where it fell: fur-notched silhouette, spine sheen,
 * pale hide underside curling at one corner. Tanned leather folds
 * square instead.
 */
function drawHideGround(g: GroundDropEnv, def: ItemDef | undefined): void {
  const { ctx, k, eid, itemId } = g;
  const fur = def?.color ?? '#8a6a45';
  const lw = Math.max(1.4, k * 0.038);
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = lw;
  const tanned = itemId === 'leather' || itemId === 'hardened_leather';
  if (tanned) {
    // Folded leather square: two stacked folds, stitch dashes, strap.
    for (let i = 1; i >= 0; i--) {
      ctx.fillStyle = i ? shade(fur, -14) : fur;
      ctx.beginPath();
      chamferRect(ctx, -k * 0.24, -k * 0.1 - i * k * 0.085, k * 0.48, k * 0.115, k * 0.03);
      ctx.fill();
      ctx.stroke();
    }
    ctx.fillStyle = shade(fur, 16);
    ctx.beginPath();
    chamferRect(ctx, -k * 0.2, -k * 0.185, k * 0.17, k * 0.05, k * 0.02);
    ctx.fill();
    ctx.strokeStyle = shade(fur, -34);
    ctx.lineWidth = Math.max(1, k * 0.016);
    ctx.setLineDash([k * 0.022, k * 0.022]);
    ctx.beginPath();
    ctx.moveTo(-k * 0.2, -k * 0.06);
    ctx.lineTo(k * 0.2, -k * 0.06);
    ctx.stroke();
    ctx.setLineDash([]);
    return;
  }
  // The draped pelt: head end left, haunch right, four leg stubs,
  // fur notches along the south edge.
  ctx.save();
  ctx.rotate((rnd(eid, 73) - 0.5) * 0.2);
  ctx.fillStyle = fur;
  ctx.beginPath();
  ctx.moveTo(-k * 0.3, -k * 0.13);
  ctx.quadraticCurveTo(-k * 0.36, -k * 0.2, -k * 0.27, -k * 0.235);
  ctx.quadraticCurveTo(-k * 0.1, -k * 0.29, k * 0.12, -k * 0.26);
  ctx.quadraticCurveTo(k * 0.32, -k * 0.235, k * 0.3, -k * 0.12);
  // South edge: fur teeth.
  ctx.lineTo(k * 0.22, -k * 0.045);
  ctx.lineTo(k * 0.16, -k * 0.095);
  ctx.lineTo(k * 0.08, -k * 0.03);
  ctx.lineTo(0, -k * 0.09);
  ctx.lineTo(-k * 0.08, -k * 0.025);
  ctx.lineTo(-k * 0.16, -k * 0.09);
  ctx.lineTo(-k * 0.23, -k * 0.04);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Spine sheen + flank shadow: the coat has direction.
  ctx.fillStyle = shade(fur, 18);
  ctx.beginPath();
  ctx.moveTo(-k * 0.24, -k * 0.21);
  ctx.quadraticCurveTo(0, -k * 0.26, k * 0.24, -k * 0.215);
  ctx.quadraticCurveTo(k * 0.1, -k * 0.235, -k * 0.1, -k * 0.235);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = shade(fur, -18);
  ctx.beginPath();
  ctx.moveTo(-k * 0.2, -k * 0.09);
  ctx.quadraticCurveTo(0, -k * 0.14, k * 0.2, -k * 0.095);
  ctx.quadraticCurveTo(0, -k * 0.06, -k * 0.2, -k * 0.09);
  ctx.closePath();
  ctx.fill();
  // Curled corner shows the pale underside.
  ctx.fillStyle = '#d8c8a8';
  ctx.beginPath();
  ctx.moveTo(k * 0.3, -k * 0.12);
  ctx.quadraticCurveTo(k * 0.33, -k * 0.19, k * 0.24, -k * 0.2);
  ctx.quadraticCurveTo(k * 0.29, -k * 0.15, k * 0.26, -k * 0.11);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/** A bolt of cloth: the roll with a spiral end and a loose flap. */
function drawClothBoltGround(g: GroundDropEnv, def: ItemDef | undefined): void {
  const { ctx, k, itemId } = g;
  const col = def?.color ?? '#c8c0a8';
  const lw = Math.max(1.4, k * 0.038);
  const silk = itemId.includes('silk');
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = lw;
  ctx.save();
  ctx.rotate(-0.14);
  // Loose flap unrolled to the left, under the roll.
  ctx.fillStyle = shade(col, -12);
  ctx.beginPath();
  ctx.moveTo(-k * 0.34, -k * 0.03);
  ctx.quadraticCurveTo(-k * 0.2, -k * 0.085, -k * 0.02, -k * 0.06);
  ctx.lineTo(-k * 0.02, -k * 0.005);
  ctx.quadraticCurveTo(-k * 0.2, -k * 0.03, -k * 0.34, k * 0.02);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // The roll.
  ctx.fillStyle = col;
  ctx.beginPath();
  chamferRect(ctx, -k * 0.1, -k * 0.2, k * 0.44, k * 0.17, k * 0.06);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = shade(col, silk ? 34 : 18);
  ctx.beginPath();
  chamferRect(ctx, -k * 0.07, -k * 0.19, k * 0.36, k * 0.05, k * 0.022);
  ctx.fill();
  // Spiral end.
  ctx.fillStyle = shade(col, -8);
  ctx.beginPath();
  ctx.ellipse(k * 0.34, -k * 0.115, k * 0.042, k * 0.078, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = shade(col, -32);
  ctx.lineWidth = Math.max(1, k * 0.016);
  ctx.beginPath();
  ctx.ellipse(k * 0.34, -k * 0.115, k * 0.02, k * 0.038, 0, 0, Math.PI * 2);
  ctx.stroke();
  if (silk) {
    // A moving sheen band — silk answers light.
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#ffffff';
    const sx = -k * 0.04 + ((g.now / 900 + g.eid) % 1) * k * 0.3;
    ctx.beginPath();
    ctx.moveTo(sx, -k * 0.2);
    ctx.lineTo(sx + k * 0.05, -k * 0.2);
    ctx.lineTo(sx - k * 0.01, -k * 0.03);
    ctx.lineTo(sx - k * 0.06, -k * 0.03);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

/** A shorn fleece: cloud mass with curl notches and a warm shadow. */
function drawWoolGround(g: GroundDropEnv): void {
  const { ctx, k, eid } = g;
  const lw = Math.max(1.4, k * 0.038);
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = lw;
  ctx.fillStyle = '#ece4d2';
  ctx.beginPath();
  facetBlob(ctx, 0, -k * 0.13, k * 0.24, (eid * 2654435761) >>> 0, 9, 0.72);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#f8f2e4';
  ctx.beginPath();
  facetBlob(ctx, -k * 0.05, -k * 0.18, k * 0.13, (eid * 40503) >>> 0, 7, 0.72);
  ctx.fill();
  ctx.fillStyle = shade('#ece4d2', -16);
  ctx.beginPath();
  ctx.ellipse(k * 0.03, -k * 0.045, k * 0.17, k * 0.05, 0, 0, Math.PI * 2);
  ctx.fill();
  // Curl ticks.
  ctx.strokeStyle = shade('#ece4d2', -24);
  ctx.lineWidth = Math.max(1, k * 0.018);
  for (const [cx, cy] of [[-k * 0.1, -k * 0.1], [k * 0.06, -k * 0.16], [k * 0.13, -k * 0.08]] as const) {
    ctx.beginPath();
    ctx.arc(cx, cy, k * 0.032, 0.4, Math.PI * 1.4);
    ctx.stroke();
  }
}

/** Cotton bolls: three puffs bursting from their split brown husks. */
function drawCottonGround(g: GroundDropEnv): void {
  const { ctx, k, eid } = g;
  const lw = Math.max(1.2, k * 0.032);
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = lw;
  for (let i = 0; i < 3; i++) {
    const cx = (i - 1) * k * 0.15 + (rnd(eid, 80 + i) - 0.5) * k * 0.04;
    const cy = -k * 0.1 - (i % 2) * k * 0.06;
    // Husk points behind — kept PALE: dark husks swallowed the puffs
    // and the boll read as a spiny beast at street scale.
    ctx.fillStyle = '#b09468';
    for (let j = 0; j < 3; j++) {
      const a = -Math.PI / 2 + (j - 1) * 0.9;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a - 0.5) * k * 0.05, cy + Math.sin(a - 0.5) * k * 0.05);
      ctx.lineTo(cx + Math.cos(a) * k * 0.105, cy + Math.sin(a) * k * 0.105);
      ctx.lineTo(cx + Math.cos(a + 0.5) * k * 0.05, cy + Math.sin(a + 0.5) * k * 0.05);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.fillStyle = '#f4eee0';
    ctx.beginPath();
    facetBlob(ctx, cx, cy, k * 0.075, ((eid + i) * 69069) >>> 0, 7);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    facetCircle(ctx, cx - k * 0.02, cy - k * 0.025, k * 0.026, 5);
    ctx.fill();
  }
}

/** A spool of thread with a loose tail. */
function drawSpoolGround(g: GroundDropEnv, def: ItemDef | undefined): void {
  const { ctx, k } = g;
  const col = def?.color ?? '#c4a35a';
  const lw = Math.max(1.3, k * 0.034);
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = lw;
  ctx.save();
  ctx.rotate(0.2);
  // Flanges.
  ctx.fillStyle = '#8a6a45';
  ctx.beginPath();
  chamferRect(ctx, -k * 0.15, -k * 0.22, k * 0.05, k * 0.2, k * 0.014);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  chamferRect(ctx, k * 0.1, -k * 0.22, k * 0.05, k * 0.2, k * 0.014);
  ctx.fill();
  ctx.stroke();
  // Wound body.
  ctx.fillStyle = col;
  ctx.beginPath();
  chamferRect(ctx, -k * 0.1, -k * 0.2, k * 0.2, k * 0.16, k * 0.02);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = shade(col, -26);
  ctx.lineWidth = Math.max(1, k * 0.016);
  for (let i = 1; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(-k * 0.1, -k * 0.2 + i * k * 0.04);
    ctx.lineTo(k * 0.1, -k * 0.2 + i * k * 0.04);
    ctx.stroke();
  }
  ctx.fillStyle = shade(col, 22);
  ctx.fillRect(-k * 0.08, -k * 0.19, k * 0.05, k * 0.035);
  // Tail.
  ctx.strokeStyle = shade(col, -10);
  ctx.lineWidth = Math.max(1.2, k * 0.024);
  ctx.beginPath();
  ctx.moveTo(k * 0.1, -k * 0.06);
  ctx.quadraticCurveTo(k * 0.24, -k * 0.02, k * 0.3, -k * 0.09);
  ctx.stroke();
  ctx.restore();
}

/** A tied sheaf of stalks or herbs, heads up, band at the waist. */
function drawSheafGround(g: GroundDropEnv, def: ItemDef | undefined): void {
  const { ctx, k, eid, itemId } = g;
  const col = def?.color ?? '#c8b060';
  const dried = itemId.startsWith('dried_');
  const stalk = dried ? shade(col, -18) : col;
  const lw = Math.max(1.2, k * 0.03);
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = lw;
  for (let i = -2; i <= 2; i++) {
    ctx.save();
    ctx.translate(i * k * 0.045, -k * 0.06);
    ctx.rotate(i * 0.16 + (rnd(eid, 90 + i) - 0.5) * 0.08);
    ctx.strokeStyle = shade(stalk, -22);
    ctx.lineWidth = Math.max(1.3, k * 0.026);
    ctx.beginPath();
    ctx.moveTo(0, k * 0.06);
    ctx.lineTo(0, -k * 0.26);
    ctx.stroke();
    // Head: a leaf pair + tip.
    ctx.fillStyle = i % 2 ? stalk : shade(stalk, 14);
    ctx.strokeStyle = g.outline;
    ctx.lineWidth = Math.max(1, k * 0.018);
    ctx.beginPath();
    ctx.ellipse(0, -k * 0.3, k * 0.035, k * 0.075, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  // Waist tie.
  ctx.fillStyle = '#c4a35a';
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = lw;
  ctx.beginPath();
  chamferRect(ctx, -k * 0.11, -k * 0.1, k * 0.22, k * 0.05, k * 0.016);
  ctx.fill();
  ctx.stroke();
}

/**
 * Crystal matter: a standing shard cluster cut in the node language,
 * inner light breathing in the school's color.
 */
function drawGemGround(g: GroundDropEnv, def: ItemDef | undefined): void {
  const { ctx, k, eid, now, itemId } = g;
  // Essences speak their school's exact color.
  const elem = itemId.endsWith('_essence') ? itemId.slice(0, -'_essence'.length) : undefined;
  const col =
    (elem && (ELEMENT_COLORS as Record<string, string>)[elem === 'crimson' ? 'blood' : elem]) ??
    def?.color ?? '#8f9ed6';
  const lw = Math.max(1.3, k * 0.036);
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = lw;
  const shardAt = (cx: number, h: number, w: number, lean: number, dk: number): void => {
    ctx.save();
    ctx.translate(cx, 0);
    ctx.rotate(lean);
    ctx.fillStyle = shade(col, dk);
    ctx.beginPath();
    ctx.moveTo(0, -h);
    ctx.lineTo(w * 0.55, -h * 0.62);
    ctx.lineTo(w * 0.42, 0);
    ctx.lineTo(-w * 0.42, 0);
    ctx.lineTo(-w * 0.55, -h * 0.58);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Facet light down the left face.
    ctx.fillStyle = shade(col, dk + 34);
    ctx.beginPath();
    ctx.moveTo(0, -h);
    ctx.lineTo(-w * 0.5, -h * 0.56);
    ctx.lineTo(-w * 0.18, -h * 0.5);
    ctx.lineTo(-w * 0.05, -h * 0.9);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };
  shardAt(-k * 0.1, k * 0.26, k * 0.13, -0.22, -10);
  shardAt(k * 0.11, k * 0.2, k * 0.11, 0.26, -18);
  shardAt(0, k * 0.36, k * 0.16, 0.02, 0);
  // The inner light breathes.
  const pulse = 0.5 + 0.5 * Math.sin(now / 520 + eid * 1.3);
  ctx.globalAlpha = 0.3 + 0.25 * pulse;
  ctx.fillStyle = shade(col, 52);
  ctx.beginPath();
  ctx.moveTo(0, -k * 0.3);
  ctx.lineTo(k * 0.05, -k * 0.15);
  ctx.lineTo(0, -k * 0.05);
  ctx.lineTo(-k * 0.05, -k * 0.15);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
  drawTwinkle(g, now, -k * 0.28);
}

/** A pearl on its scallop of nacre. */
function drawPearlGround(g: GroundDropEnv, def: ItemDef | undefined): void {
  const { ctx, k, eid, now } = g;
  const col = def?.color ?? '#e8e4ec';
  const lw = Math.max(1.3, k * 0.036);
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = lw;
  // Nacre saucer.
  ctx.fillStyle = '#c8bcd0';
  ctx.beginPath();
  ctx.ellipse(0, -k * 0.05, k * 0.19, k * 0.07, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = shade('#c8bcd0', 20);
  ctx.beginPath();
  ctx.ellipse(-k * 0.03, -k * 0.065, k * 0.1, k * 0.032, 0, 0, Math.PI * 2);
  ctx.fill();
  // The pearl.
  ctx.fillStyle = col;
  ctx.beginPath();
  facetCircle(ctx, 0, -k * 0.16, k * 0.115, 10);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = shade(col, -14);
  ctx.beginPath();
  ctx.ellipse(k * 0.025, -k * 0.13, k * 0.06, k * 0.035, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  facetCircle(ctx, -k * 0.04, -k * 0.2, k * 0.028, 6);
  ctx.fill();
  drawTwinkle(g, now + eid, -k * 0.2);
}

/** Cooled slag still holding its heat in the cracks. */
function drawSlagGround(g: GroundDropEnv, def: ItemDef | undefined): void {
  const { ctx, k, eid, now } = g;
  const col = def?.color ?? '#4a4456';
  const lw = Math.max(1.3, k * 0.036);
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = lw;
  ctx.fillStyle = col;
  ctx.beginPath();
  facetBlob(ctx, 0, -k * 0.12, k * 0.22, (eid * 2654435761) >>> 0, 8, 0.78);
  ctx.fill();
  ctx.stroke();
  // Ember cracks pulse.
  const heat = 0.55 + 0.45 * Math.sin(now / 380 + eid);
  ctx.strokeStyle = `rgba(240, 130, 50, ${0.5 + 0.4 * heat})`;
  ctx.lineWidth = Math.max(1.2, k * 0.024);
  ctx.beginPath();
  ctx.moveTo(-k * 0.12, -k * 0.1);
  ctx.lineTo(-k * 0.02, -k * 0.16);
  ctx.lineTo(k * 0.05, -k * 0.08);
  ctx.moveTo(-k * 0.02, -k * 0.16);
  ctx.lineTo(k * 0.02, -k * 0.22);
  ctx.stroke();
  ctx.fillStyle = `rgba(255, 200, 120, ${0.35 * heat})`;
  ctx.beginPath();
  facetCircle(ctx, 0, -k * 0.14, k * 0.05, 6);
  ctx.fill();
}

/** A pinched pouch spilling a glittering pinch of its dust. */
function drawDustGround(g: GroundDropEnv, def: ItemDef | undefined): void {
  const { ctx, k, eid, now } = g;
  const col = def?.color ?? '#b49ae0';
  const lw = Math.max(1.3, k * 0.036);
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = lw;
  // Small soft pouch, mouth open toward the spill.
  ctx.fillStyle = '#6b5a7a';
  ctx.beginPath();
  ctx.moveTo(-k * 0.16, -k * 0.03);
  ctx.quadraticCurveTo(-k * 0.2, -k * 0.24, -k * 0.03, -k * 0.28);
  ctx.quadraticCurveTo(k * 0.1, -k * 0.3, k * 0.13, -k * 0.2);
  ctx.quadraticCurveTo(k * 0.16, -k * 0.08, k * 0.08, -k * 0.02);
  ctx.quadraticCurveTo(-k * 0.04, k * 0.02, -k * 0.16, -k * 0.03);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = shade('#6b5a7a', 16);
  ctx.beginPath();
  ctx.moveTo(-k * 0.12, -k * 0.16);
  ctx.quadraticCurveTo(-k * 0.1, -k * 0.24, -k * 0.02, -k * 0.26);
  ctx.lineTo(-k * 0.02, -k * 0.21);
  ctx.quadraticCurveTo(-k * 0.08, -k * 0.2, -k * 0.12, -k * 0.16);
  ctx.closePath();
  ctx.fill();
  // Mouth gather + tie.
  ctx.fillStyle = shade(col, -20);
  ctx.beginPath();
  ctx.ellipse(k * 0.05, -k * 0.245, k * 0.055, k * 0.028, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // The spill.
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.ellipse(k * 0.19, -k * 0.035, k * 0.09, k * 0.035, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Motes lift off the spill.
  for (let i = 0; i < 3; i++) {
    const t = ((now / 1400 + rnd(eid, 100 + i)) % 1);
    const a = 1 - t;
    ctx.globalAlpha = 0.7 * a;
    ctx.fillStyle = shade(col, 40);
    const mx = k * (0.16 + rnd(eid, 104 + i) * 0.08);
    const my = -k * 0.05 - t * k * 0.22;
    ctx.beginPath();
    facetCircle(ctx, mx, my, k * 0.016 * (0.6 + a * 0.4), 4);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** A sealed scroll: rolled parchment, ribbon, wax seal in its color. */
function drawScrollGround(g: GroundDropEnv, def: ItemDef | undefined): void {
  const { ctx, k, qty, eid } = g;
  const seal = def?.color ?? '#a83232';
  const parch = '#e8dcb8';
  const lw = Math.max(1.3, k * 0.034);
  const one = (rot: number, dy: number): void => {
    ctx.save();
    ctx.rotate(rot);
    ctx.translate(0, dy);
    ctx.strokeStyle = g.outline;
    ctx.lineWidth = lw;
    // The roll.
    ctx.fillStyle = parch;
    ctx.beginPath();
    chamferRect(ctx, -k * 0.26, -k * 0.16, k * 0.52, k * 0.13, k * 0.05);
    ctx.fill();
    ctx.stroke();
    // End curls: spiral faces both ends.
    for (const ex of [-k * 0.26, k * 0.26]) {
      ctx.fillStyle = shade(parch, -10);
      ctx.beginPath();
      ctx.ellipse(ex, -k * 0.095, k * 0.035, k * 0.062, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = shade(parch, -34);
      ctx.lineWidth = Math.max(1, k * 0.014);
      ctx.beginPath();
      ctx.ellipse(ex, -k * 0.095, k * 0.015, k * 0.03, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = g.outline;
      ctx.lineWidth = lw;
    }
    // Top light.
    ctx.fillStyle = shade(parch, 14);
    ctx.beginPath();
    chamferRect(ctx, -k * 0.2, -k * 0.155, k * 0.4, k * 0.036, k * 0.016);
    ctx.fill();
    // Ribbon + wax seal.
    ctx.fillStyle = shade(seal, -12);
    ctx.fillRect(-k * 0.03, -k * 0.165, k * 0.06, k * 0.14);
    ctx.strokeRect(-k * 0.03, -k * 0.165, k * 0.06, k * 0.14);
    ctx.fillStyle = seal;
    ctx.beginPath();
    facetCircle(ctx, 0, -k * 0.1, k * 0.052, 7);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = shade(seal, -26);
    ctx.beginPath();
    facetCircle(ctx, 0, -k * 0.1, k * 0.026, 5);
    ctx.fill();
    ctx.fillStyle = shade(seal, 30);
    ctx.beginPath();
    facetCircle(ctx, -k * 0.018, -k * 0.118, k * 0.013, 4);
    ctx.fill();
    ctx.restore();
  };
  if (qty >= 3) {
    one(0.34 + (rnd(eid, 110) - 0.5) * 0.1, -k * 0.02);
    one(-0.28, -k * 0.04);
    one(0.03, -k * 0.06);
  } else if (qty === 2) {
    one(0.26, -k * 0.02);
    one(-0.08, -k * 0.05);
  } else {
    one((rnd(eid, 111) - 0.5) * 0.3, -k * 0.03);
  }
}

/** Loose pages: script lines and an ink mark, corner lifted. */
function drawPaperGround(g: GroundDropEnv, def: ItemDef | undefined): void {
  const { ctx, k, eid, itemId } = g;
  const parch = itemId === 'weathered_letter' ? '#ddd0a8' : '#e8dcb8';
  const lw = Math.max(1.2, k * 0.03);
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = lw;
  ctx.save();
  ctx.rotate((rnd(eid, 113) - 0.5) * 0.4);
  // Under-sheet peeking.
  ctx.fillStyle = shade(parch, -14);
  ctx.beginPath();
  chamferRect(ctx, -k * 0.14, -k * 0.24, k * 0.31, k * 0.25, k * 0.012);
  ctx.fill();
  ctx.stroke();
  // Top sheet with a torn corner.
  ctx.fillStyle = parch;
  ctx.beginPath();
  ctx.moveTo(-k * 0.17, -k * 0.28);
  ctx.lineTo(k * 0.1, -k * 0.28);
  ctx.lineTo(k * 0.15, -k * 0.22);
  ctx.lineTo(k * 0.14, -k * 0.015);
  ctx.lineTo(-k * 0.16, -k * 0.015);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Script.
  ctx.strokeStyle = '#6b5a48';
  ctx.lineWidth = Math.max(1, k * 0.014);
  for (let i = 0; i < 4; i++) {
    const y = -k * (0.23 - i * 0.052);
    ctx.beginPath();
    ctx.moveTo(-k * 0.12, y);
    ctx.lineTo(k * (0.09 - rnd(eid, 116 + i) * 0.05), y);
    ctx.stroke();
  }
  // Ink mark bottom right (the writ's stamp).
  ctx.fillStyle = def?.color ?? '#a83232';
  ctx.beginPath();
  facetCircle(ctx, k * 0.075, -k * 0.055, k * 0.032, 6);
  ctx.fill();
  ctx.restore();
}

/** A real key lying on the ground: bow, stem, bit. */
function drawKeyGround(g: GroundDropEnv, def: ItemDef | undefined): void {
  const { ctx, k, eid, itemId, now, roll } = g;
  // A dungeon key wears its tier's metal.
  const rarCol = itemId === 'dungeon_key' && roll ? RARITY_COLORS[roll.rar] : null;
  const col = rarCol ?? def?.color ?? '#c8a038';
  const lw = Math.max(1.3, k * 0.034);
  ctx.save();
  ctx.scale(1, GROUND_SQUASH + 0.12);
  ctx.rotate(-0.5 + (rnd(eid, 118) - 0.5) * 0.3);
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = lw;
  // Bow: a faceted ring.
  ctx.fillStyle = col;
  ctx.beginPath();
  facetCircle(ctx, -k * 0.19, 0, k * 0.115, 7);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = shade(col, -40);
  ctx.beginPath();
  facetCircle(ctx, -k * 0.19, 0, k * 0.052, 6);
  ctx.fill();
  ctx.stroke();
  // Stem.
  ctx.fillStyle = shade(col, -8);
  ctx.beginPath();
  chamferRect(ctx, -k * 0.09, -k * 0.028, k * 0.38, k * 0.056, k * 0.014);
  ctx.fill();
  ctx.stroke();
  // Bit teeth.
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(k * 0.29, -k * 0.028);
  ctx.lineTo(k * 0.29, k * 0.115);
  ctx.lineTo(k * 0.235, k * 0.115);
  ctx.lineTo(k * 0.235, k * 0.05);
  ctx.lineTo(k * 0.19, k * 0.05);
  ctx.lineTo(k * 0.19, k * 0.028);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Stem light.
  ctx.fillStyle = shade(col, 28);
  ctx.fillRect(-k * 0.07, -k * 0.02, k * 0.3, k * 0.016);
  ctx.restore();
  if (rarCol) drawTwinkle(g, now, -k * 0.12);
}

/** A band of precious metal standing aslant, gem eye catching light. */
function drawRingGround(g: GroundDropEnv, def: ItemDef | undefined): void {
  const { ctx, k, itemId, now } = g;
  const col = def?.color ?? '#d9a441';
  const lw = Math.max(1.3, k * 0.034);
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = lw;
  // The band: an ellipse ring standing near-upright.
  ctx.save();
  ctx.translate(0, -k * 0.115);
  ctx.rotate(0.22);
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.ellipse(0, 0, k * 0.115, k * 0.135, 0, 0, Math.PI * 2);
  ctx.ellipse(0, 0, k * 0.062, k * 0.082, 0, 0, Math.PI * 2);
  ctx.fill('evenodd');
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, 0, k * 0.062, k * 0.082, 0, 0, Math.PI * 2);
  ctx.stroke();
  // Inner shadow crescent + outer light.
  ctx.fillStyle = shade(col, -26);
  ctx.beginPath();
  ctx.ellipse(k * 0.02, k * 0.045, k * 0.062, k * 0.045, 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = shade(col, 32);
  ctx.beginPath();
  ctx.ellipse(-k * 0.055, -k * 0.075, k * 0.032, k * 0.05, -0.6, 0, Math.PI * 2);
  ctx.fill();
  // Signets and legion bands carry a face; plain rings a gem.
  if (itemId === 'seal_ring' || itemId === 'legion_ring' || itemId === 'grave_band') {
    ctx.fillStyle = shade(col, -18);
    ctx.beginPath();
    facetCircle(ctx, 0, -k * 0.135, k * 0.055, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = shade(col, -44);
    ctx.beginPath();
    facetCircle(ctx, 0, -k * 0.135, k * 0.026, 4);
    ctx.fill();
  } else {
    ctx.fillStyle = '#c4553d';
    ctx.beginPath();
    facetCircle(ctx, 0, -k * 0.15, k * 0.042, 5);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fff2cc';
    ctx.beginPath();
    facetCircle(ctx, -k * 0.015, -k * 0.165, k * 0.014, 4);
    ctx.fill();
  }
  ctx.restore();
  drawTwinkle(g, now, -k * 0.18);
}

/** Clean bones: a crossed pair, knobbed ends honest. */
function drawBoneGround(g: GroundDropEnv): void {
  const { ctx, k, eid } = g;
  const boneCol = '#e4dcc8';
  const lw = Math.max(1.3, k * 0.034);
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = lw;
  for (const [rot, dk] of [[0.5 + (rnd(eid, 120) - 0.5) * 0.2, -12], [-0.35, 0]] as const) {
    ctx.save();
    ctx.translate(0, -k * 0.1);
    ctx.rotate(rot);
    ctx.fillStyle = shade(boneCol, dk);
    // Shaft.
    ctx.beginPath();
    chamferRect(ctx, -k * 0.2, -k * 0.032, k * 0.4, k * 0.064, k * 0.02);
    ctx.fill();
    ctx.stroke();
    // Knobs.
    for (const ex of [-k * 0.21, k * 0.21]) {
      ctx.beginPath();
      facetCircle(ctx, ex, -k * 0.03, k * 0.048, 6);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      facetCircle(ctx, ex, k * 0.03, k * 0.048, 6);
      ctx.fill();
      ctx.stroke();
    }
    ctx.fillStyle = shade(boneCol, dk + 16);
    ctx.fillRect(-k * 0.16, -k * 0.024, k * 0.28, k * 0.02);
    ctx.restore();
  }
}

/** A trophy fang or tusk: one proud curved point, root band wrapped. */
function drawFangGround(g: GroundDropEnv, def: ItemDef | undefined): void {
  const { ctx, k, eid, qty } = g;
  const col = def?.color ?? '#e8e0cc';
  const lw = Math.max(1.3, k * 0.036);
  const n = Math.min(3, Math.max(1, qty));
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = lw;
  for (let i = 0; i < n; i++) {
    ctx.save();
    ctx.translate((i - (n - 1) / 2) * k * 0.18, 0);
    ctx.rotate((i - (n - 1) / 2) * 0.24 + (rnd(eid, 124 + i) - 0.5) * 0.12);
    // The curve: base at ground, tip hooking up-right.
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(-k * 0.085, -k * 0.02);
    ctx.quadraticCurveTo(-k * 0.06, -k * 0.24, k * 0.09, -k * 0.36);
    ctx.quadraticCurveTo(k * 0.02, -k * 0.2, k * 0.015, -k * 0.02);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Edge light along the outer curve.
    ctx.fillStyle = shade(col, 22);
    ctx.beginPath();
    ctx.moveTo(-k * 0.07, -k * 0.06);
    ctx.quadraticCurveTo(-k * 0.05, -k * 0.22, k * 0.07, -k * 0.335);
    ctx.quadraticCurveTo(k * 0.0, -k * 0.22, -k * 0.035, -k * 0.06);
    ctx.closePath();
    ctx.fill();
    // Root wrap.
    ctx.fillStyle = '#6b4a26';
    ctx.beginPath();
    chamferRect(ctx, -k * 0.095, -k * 0.075, k * 0.12, k * 0.055, k * 0.014);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

/** A chitin or shell plate propped like fallen armor of the wild. */
function drawShellPlateGround(g: GroundDropEnv, def: ItemDef | undefined): void {
  const { ctx, k, eid } = g;
  const col = def?.color ?? '#7a8a6a';
  const lw = Math.max(1.4, k * 0.038);
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = lw;
  ctx.save();
  ctx.rotate((rnd(eid, 126) - 0.5) * 0.24);
  // The plate: a broad faceted scute, domed.
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(-k * 0.26, -k * 0.07);
  ctx.quadraticCurveTo(-k * 0.24, -k * 0.3, 0, -k * 0.345);
  ctx.quadraticCurveTo(k * 0.24, -k * 0.3, k * 0.26, -k * 0.07);
  ctx.quadraticCurveTo(0, -k * 0.005, -k * 0.26, -k * 0.07);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Growth ridges.
  ctx.strokeStyle = shade(col, -26);
  ctx.lineWidth = Math.max(1, k * 0.02);
  for (let i = 1; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(-k * (0.26 - i * 0.07), -k * (0.08 + i * 0.01));
    ctx.quadraticCurveTo(0, -k * (0.28 - i * 0.055), k * (0.26 - i * 0.07), -k * (0.08 + i * 0.01));
    ctx.stroke();
  }
  // Dome light.
  ctx.fillStyle = shade(col, 24);
  ctx.beginPath();
  ctx.moveTo(-k * 0.15, -k * 0.24);
  ctx.quadraticCurveTo(-k * 0.06, -k * 0.315, k * 0.03, -k * 0.31);
  ctx.quadraticCurveTo(-k * 0.05, -k * 0.27, -k * 0.1, -k * 0.2);
  ctx.closePath();
  ctx.fill();
  // Chipped edge tells the fight.
  ctx.fillStyle = shade(col, -34);
  ctx.beginPath();
  ctx.moveTo(k * 0.18, -k * 0.09);
  ctx.lineTo(k * 0.23, -k * 0.13);
  ctx.lineTo(k * 0.24, -k * 0.07);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** A fallen feather, spine and barbs, resting light as it landed. */
function drawFeatherGround(g: GroundDropEnv, def: ItemDef | undefined): void {
  const { ctx, k, eid, itemId } = g;
  const col = itemId === 'feather' ? '#e8e4d8' : def?.color ?? '#c8b890';
  const lw = Math.max(1.2, k * 0.028);
  ctx.save();
  ctx.scale(1, GROUND_SQUASH + 0.1);
  ctx.rotate(-0.45 + (rnd(eid, 128) - 0.5) * 0.4);
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = lw;
  // Vane: two lobes around the spine, notched trailing edge.
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(-k * 0.3, k * 0.02);
  ctx.quadraticCurveTo(-k * 0.1, -k * 0.115, k * 0.18, -k * 0.085);
  ctx.quadraticCurveTo(k * 0.3, -k * 0.06, k * 0.34, -k * 0.01);
  ctx.lineTo(k * 0.22, -k * 0.005);
  ctx.lineTo(k * 0.16, k * 0.045);
  ctx.lineTo(k * 0.05, k * 0.02);
  ctx.lineTo(-k * 0.03, k * 0.07);
  ctx.quadraticCurveTo(-k * 0.18, k * 0.065, -k * 0.3, k * 0.02);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Spine.
  ctx.strokeStyle = shade(col, -30);
  ctx.lineWidth = Math.max(1.2, k * 0.022);
  ctx.beginPath();
  ctx.moveTo(-k * 0.34, k * 0.035);
  ctx.quadraticCurveTo(0, -k * 0.03, k * 0.33, -k * 0.012);
  ctx.stroke();
  // Barb hints.
  ctx.lineWidth = Math.max(1, k * 0.014);
  for (let i = 0; i < 4; i++) {
    const x = -k * 0.14 + i * k * 0.11;
    ctx.beginPath();
    ctx.moveTo(x, -k * 0.005 - i * k * 0.008);
    ctx.lineTo(x + k * 0.05, -k * 0.07);
    ctx.stroke();
  }
  // Downy base.
  ctx.fillStyle = shade(col, 20);
  ctx.beginPath();
  facetBlob(ctx, -k * 0.27, k * 0.025, k * 0.05, (eid * 40503) >>> 0, 6, 0.7);
  ctx.fill();
  ctx.restore();
}

/** A venom sac: taut membrane, sickly sheen, one drip bead. */
function drawSacGround(g: GroundDropEnv, def: ItemDef | undefined): void {
  const { ctx, k, eid, now } = g;
  const col = def?.color ?? '#9ab44a';
  const lw = Math.max(1.3, k * 0.034);
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = lw;
  // The sac sags under its own load.
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(0, -k * 0.31);
  ctx.quadraticCurveTo(k * 0.19, -k * 0.28, k * 0.175, -k * 0.115);
  ctx.quadraticCurveTo(k * 0.16, k * 0.005, 0, k * 0.005);
  ctx.quadraticCurveTo(-k * 0.16, k * 0.005, -k * 0.175, -k * 0.115);
  ctx.quadraticCurveTo(-k * 0.19, -k * 0.28, 0, -k * 0.31);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Neck knot.
  ctx.fillStyle = shade(col, -30);
  ctx.beginPath();
  ctx.ellipse(0, -k * 0.315, k * 0.045, k * 0.026, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Membrane sheen + deep pooling.
  ctx.fillStyle = shade(col, 30);
  ctx.beginPath();
  ctx.ellipse(-k * 0.07, -k * 0.22, k * 0.055, k * 0.035, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = shade(col, -22);
  ctx.beginPath();
  ctx.ellipse(k * 0.03, -k * 0.07, k * 0.09, k * 0.045, 0.15, 0, Math.PI * 2);
  ctx.fill();
  // The slow drip bead at the base.
  const t = (now / 1600 + rnd(eid, 130)) % 1;
  if (t < 0.7) {
    ctx.fillStyle = shade(col, 12);
    ctx.beginPath();
    ctx.ellipse(k * 0.06, k * 0.02 + t * k * 0.05, k * 0.022, k * 0.03, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** The forest floor's truffle: a warty dark lump with cut-face gleam. */
function drawTruffleGround(g: GroundDropEnv): void {
  const { ctx, k, eid } = g;
  const col = '#4a3a30';
  const lw = Math.max(1.3, k * 0.034);
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = lw;
  ctx.fillStyle = col;
  ctx.beginPath();
  facetBlob(ctx, 0, -k * 0.12, k * 0.17, (eid * 2654435761) >>> 0, 9, 0.85);
  ctx.fill();
  ctx.stroke();
  // Warts.
  ctx.fillStyle = shade(col, 14);
  for (let i = 0; i < 5; i++) {
    const a = rnd(eid, 132 + i) * Math.PI * 2;
    const r = k * (0.06 + rnd(eid, 138 + i) * 0.07);
    ctx.beginPath();
    facetCircle(ctx, Math.cos(a) * r, -k * 0.12 + Math.sin(a) * r * 0.8, k * 0.026, 5);
    ctx.fill();
  }
  // The prized marbled cut face.
  ctx.fillStyle = '#c8b89a';
  ctx.beginPath();
  ctx.ellipse(k * 0.1, -k * 0.16, k * 0.055, k * 0.07, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = shade('#c8b89a', -30);
  ctx.lineWidth = Math.max(1, k * 0.012);
  ctx.beginPath();
  ctx.moveTo(k * 0.08, -k * 0.2);
  ctx.quadraticCurveTo(k * 0.12, -k * 0.16, k * 0.085, -k * 0.11);
  ctx.moveTo(k * 0.115, -k * 0.19);
  ctx.quadraticCurveTo(k * 0.09, -k * 0.15, k * 0.12, -k * 0.12);
  ctx.stroke();
}

// ---------------------------------------------------------------- the garden

/** A seed pouch: open burlap mouth, seeds visible, sprout tag color. */
function drawSeedPouchGround(g: GroundDropEnv, def: ItemDef | undefined): void {
  const { ctx, k, eid } = g;
  const col = def?.color ?? '#8aa050';
  const burlap = '#a08a5a';
  const lw = Math.max(1.3, k * 0.034);
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = lw;
  // Squat open sack, mouth rolled.
  ctx.fillStyle = burlap;
  ctx.beginPath();
  ctx.moveTo(-k * 0.17, -k * 0.01);
  ctx.quadraticCurveTo(-k * 0.2, -k * 0.2, -k * 0.13, -k * 0.26);
  ctx.lineTo(k * 0.13, -k * 0.26);
  ctx.quadraticCurveTo(k * 0.2, -k * 0.2, k * 0.17, -k * 0.01);
  ctx.quadraticCurveTo(0, k * 0.035, -k * 0.17, -k * 0.01);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Rolled rim.
  ctx.fillStyle = shade(burlap, -16);
  ctx.beginPath();
  ctx.ellipse(0, -k * 0.255, k * 0.145, k * 0.055, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // The seed heap in the mouth.
  ctx.fillStyle = shade(col, -8);
  ctx.beginPath();
  ctx.ellipse(0, -k * 0.26, k * 0.105, k * 0.038, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = shade(col, 16);
  for (let i = 0; i < 5; i++) {
    const sx = (rnd(eid, 140 + i) - 0.5) * k * 0.16;
    const sy = -k * 0.265 - rnd(eid, 146 + i) * k * 0.025;
    ctx.beginPath();
    ctx.ellipse(sx, sy, k * 0.017, k * 0.012, rnd(eid, 152 + i) * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // Weave hint + a couple strays on the ground.
  ctx.strokeStyle = shade(burlap, -26);
  ctx.lineWidth = Math.max(1, k * 0.014);
  ctx.beginPath();
  ctx.moveTo(-k * 0.14, -k * 0.12);
  ctx.lineTo(k * 0.14, -k * 0.12);
  ctx.moveTo(-k * 0.155, -k * 0.06);
  ctx.lineTo(k * 0.155, -k * 0.06);
  ctx.stroke();
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.ellipse(k * 0.21, k * 0.01, k * 0.018, k * 0.013, 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(-k * 0.22, -k * 0.02, k * 0.016, k * 0.012, -0.4, 0, Math.PI * 2);
  ctx.fill();
}

/** A root-balled sapling ready for planting, leaves already reaching. */
function drawSaplingGround(g: GroundDropEnv, def: ItemDef | undefined): void {
  const { ctx, k, eid } = g;
  const leaf = def?.color ?? '#6a9a4a';
  const lw = Math.max(1.3, k * 0.034);
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = lw;
  // Burlap root ball, tied.
  ctx.fillStyle = '#a08a5a';
  ctx.beginPath();
  facetCircle(ctx, 0, -k * 0.075, k * 0.13, 7, -Math.PI / 2, 0.78);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = shade('#a08a5a', -28);
  ctx.lineWidth = Math.max(1, k * 0.016);
  ctx.beginPath();
  ctx.moveTo(-k * 0.1, -k * 0.12);
  ctx.lineTo(k * 0.1, -k * 0.03);
  ctx.moveTo(-k * 0.1, -k * 0.03);
  ctx.lineTo(k * 0.1, -k * 0.12);
  ctx.stroke();
  // Stem + branches.
  ctx.strokeStyle = '#6b4a26';
  ctx.lineWidth = Math.max(1.6, k * 0.036);
  ctx.beginPath();
  ctx.moveTo(0, -k * 0.13);
  ctx.quadraticCurveTo(k * 0.01, -k * 0.3, -k * 0.015, -k * 0.42);
  ctx.stroke();
  ctx.lineWidth = Math.max(1.2, k * 0.024);
  ctx.beginPath();
  ctx.moveTo(-k * 0.005, -k * 0.27);
  ctx.lineTo(k * 0.09, -k * 0.35);
  ctx.moveTo(0, -k * 0.33);
  ctx.lineTo(-k * 0.09, -k * 0.4);
  ctx.stroke();
  // Leaf tufts.
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = Math.max(1.1, k * 0.026);
  for (const [lx, ly, r] of [
    [-k * 0.015, -k * 0.46, k * 0.085],
    [k * 0.105, -k * 0.375, k * 0.06],
    [-k * 0.105, -k * 0.425, k * 0.055],
  ] as const) {
    ctx.fillStyle = leaf;
    ctx.beginPath();
    facetBlob(ctx, lx, ly, r, ((eid + lx) * 69069) >>> 0, 7, 0.85);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = shade(leaf, 20);
    ctx.beginPath();
    facetCircle(ctx, lx - r * 0.3, ly - r * 0.3, r * 0.35, 5);
    ctx.fill();
  }
}

/** A tied bundle of live cuttings, buds still on the twigs. */
function drawTwigBundleGround(g: GroundDropEnv, def: ItemDef | undefined): void {
  const { ctx, k, eid } = g;
  const bud = def?.color ?? '#8aa050';
  const lw = Math.max(1.2, k * 0.03);
  ctx.save();
  ctx.scale(1, GROUND_SQUASH + 0.14);
  ctx.rotate(-0.4 + (rnd(eid, 156) - 0.5) * 0.2);
  for (let i = -1; i <= 1; i++) {
    const y = i * k * 0.055;
    ctx.strokeStyle = '#6b4a26';
    ctx.lineWidth = Math.max(1.4, k * 0.03);
    ctx.beginPath();
    ctx.moveTo(-k * 0.28, y);
    const bend = (rnd(eid, 160 + i) - 0.5) * k * 0.08;
    ctx.quadraticCurveTo(0, y + bend, k * 0.28, y - k * 0.02 * i);
    ctx.stroke();
    // Buds along each twig.
    ctx.fillStyle = bud;
    ctx.strokeStyle = g.outline;
    ctx.lineWidth = Math.max(1, k * 0.016);
    for (let b = 0; b < 2; b++) {
      const bx = -k * 0.1 + b * k * 0.22 + rnd(eid, 164 + i * 3 + b) * k * 0.06;
      ctx.beginPath();
      ctx.ellipse(bx, y + bend * 0.5 - k * 0.02, k * 0.026, k * 0.038, -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }
  // Twine wrap.
  ctx.fillStyle = '#c4a35a';
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = lw;
  ctx.beginPath();
  chamferRect(ctx, -k * 0.045, -k * 0.1, k * 0.09, k * 0.2, k * 0.014);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/** The real acorn: cap, kernel, gleam. */
function drawAcornGround(g: GroundDropEnv): void {
  const { ctx, k, eid } = g;
  const lw = Math.max(1.2, k * 0.03);
  ctx.save();
  ctx.rotate(0.3 + (rnd(eid, 168) - 0.5) * 0.4);
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = lw;
  // Kernel.
  ctx.fillStyle = '#b08850';
  ctx.beginPath();
  ctx.moveTo(-k * 0.09, -k * 0.14);
  ctx.quadraticCurveTo(-k * 0.1, -k * 0.02, 0, k * 0.02);
  ctx.quadraticCurveTo(k * 0.1, -k * 0.02, k * 0.09, -k * 0.14);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = shade('#b08850', 22);
  ctx.beginPath();
  ctx.ellipse(-k * 0.035, -k * 0.09, k * 0.026, k * 0.045, 0.2, 0, Math.PI * 2);
  ctx.fill();
  // Cap with crosshatch + stem nub.
  ctx.fillStyle = '#7a5a38';
  ctx.beginPath();
  ctx.moveTo(-k * 0.105, -k * 0.13);
  ctx.quadraticCurveTo(0, -k * 0.235, k * 0.105, -k * 0.13);
  ctx.quadraticCurveTo(0, -k * 0.1, -k * 0.105, -k * 0.13);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = shade('#7a5a38', -24);
  ctx.lineWidth = Math.max(1, k * 0.012);
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(i * k * 0.035 - k * 0.01, -k * 0.2);
    ctx.lineTo(i * k * 0.035 + k * 0.012, -k * 0.125);
    ctx.stroke();
  }
  ctx.strokeStyle = '#6b4a26';
  ctx.lineWidth = Math.max(1.4, k * 0.026);
  ctx.beginPath();
  ctx.moveTo(0, -k * 0.21);
  ctx.lineTo(k * 0.02, -k * 0.27);
  ctx.stroke();
  ctx.restore();
}

/** A pine cone: layered scale rows, tip-lit. */
function drawPineconeGround(g: GroundDropEnv): void {
  const { ctx, k, eid } = g;
  const body = '#8a6a45';
  const lw = Math.max(1.1, k * 0.026);
  ctx.save();
  ctx.rotate(0.5 + (rnd(eid, 170) - 0.5) * 0.3);
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = Math.max(1.3, k * 0.032);
  // Cone silhouette.
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(0, -k * 0.28);
  ctx.quadraticCurveTo(k * 0.13, -k * 0.2, k * 0.1, -k * 0.05);
  ctx.quadraticCurveTo(k * 0.05, k * 0.02, 0, k * 0.02);
  ctx.quadraticCurveTo(-k * 0.05, k * 0.02, -k * 0.1, -k * 0.05);
  ctx.quadraticCurveTo(-k * 0.13, -k * 0.2, 0, -k * 0.28);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Scale rows: staggered chevrons, lighter toward the tip.
  ctx.lineWidth = lw;
  for (let row = 0; row < 4; row++) {
    const y = -k * (0.22 - row * 0.065);
    const w = k * (0.055 + row * 0.016);
    ctx.strokeStyle = shade(body, 18 - row * 12);
    for (let cN = -1; cN <= 1; cN++) {
      const x = cN * w + (row % 2 ? w / 2 : 0);
      if (Math.abs(x) > k * 0.1) continue;
      ctx.beginPath();
      ctx.moveTo(x - k * 0.028, y);
      ctx.lineTo(x, y + k * 0.032);
      ctx.lineTo(x + k * 0.028, y);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** A lump of hardened amber resin, light caught inside. */
function drawResinGround(g: GroundDropEnv): void {
  const { ctx, k, eid, now } = g;
  const col = '#d99a3d';
  const lw = Math.max(1.3, k * 0.034);
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = lw;
  ctx.fillStyle = col;
  ctx.beginPath();
  facetBlob(ctx, 0, -k * 0.11, k * 0.16, (eid * 2654435761) >>> 0, 7, 0.82);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = shade(col, -22);
  ctx.beginPath();
  facetCircle(ctx, k * 0.045, -k * 0.075, k * 0.06, 6);
  ctx.fill();
  ctx.fillStyle = shade(col, 36);
  ctx.beginPath();
  ctx.ellipse(-k * 0.055, -k * 0.155, k * 0.045, k * 0.028, -0.5, 0, Math.PI * 2);
  ctx.fill();
  // Inner glow flicker: the sun lives in amber.
  const glow = 0.5 + 0.5 * Math.sin(now / 700 + eid * 0.7);
  ctx.globalAlpha = 0.35 * glow;
  ctx.fillStyle = '#ffd98a';
  ctx.beginPath();
  facetCircle(ctx, 0, -k * 0.11, k * 0.07, 6);
  ctx.fill();
  ctx.globalAlpha = 1;
}

/** A pressed wax cake with the comb's hex memory in its face. */
function drawWaxCakeGround(g: GroundDropEnv): void {
  const { ctx, k } = g;
  const col = '#e0b850';
  const lw = Math.max(1.3, k * 0.034);
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = lw;
  ctx.fillStyle = shade(col, -10);
  ctx.beginPath();
  facetCircle(ctx, 0, -k * 0.085, k * 0.2, 8, -Math.PI / 2, 0.62);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = col;
  ctx.beginPath();
  facetCircle(ctx, 0, -k * 0.125, k * 0.19, 8, -Math.PI / 2, 0.55);
  ctx.fill();
  ctx.stroke();
  // Comb cells stamped in the top face.
  ctx.strokeStyle = shade(col, -24);
  ctx.lineWidth = Math.max(1, k * 0.014);
  for (const [hx, hy] of [
    [0, -k * 0.13], [-k * 0.085, -k * 0.115], [k * 0.085, -k * 0.115],
    [-k * 0.04, -k * 0.165], [k * 0.045, -k * 0.17],
  ] as const) {
    ctx.beginPath();
    facetCircle(ctx, hx, hy, k * 0.032, 6, -Math.PI / 2, 0.6);
    ctx.stroke();
  }
  ctx.fillStyle = shade(col, 24);
  ctx.beginPath();
  ctx.ellipse(-k * 0.08, -k * 0.175, k * 0.05, k * 0.02, -0.2, 0, Math.PI * 2);
  ctx.fill();
}

/** A tied provision sack (salt, flour), dusted at the mouth. */
function drawSackGround(g: GroundDropEnv, def: ItemDef | undefined): void {
  const { ctx, k, itemId } = g;
  const cloth = '#d8ccb0';
  const dustCol = itemId === 'salt' ? '#f4f2ec' : '#f0e8d4';
  const lw = Math.max(1.3, k * 0.036);
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = lw;
  // Plump sack body.
  ctx.fillStyle = cloth;
  ctx.beginPath();
  ctx.moveTo(-k * 0.19, -k * 0.02);
  ctx.quadraticCurveTo(-k * 0.235, -k * 0.24, -k * 0.09, -k * 0.32);
  ctx.quadraticCurveTo(-k * 0.02, -k * 0.4, k * 0.05, -k * 0.345);
  ctx.quadraticCurveTo(k * 0.21, -k * 0.28, k * 0.19, -k * 0.05);
  ctx.quadraticCurveTo(0, k * 0.03, -k * 0.19, -k * 0.02);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Tied ear above the cinch.
  ctx.fillStyle = shade(cloth, -10);
  ctx.beginPath();
  ctx.moveTo(-k * 0.03, -k * 0.365);
  ctx.quadraticCurveTo(0, -k * 0.43, k * 0.05, -k * 0.39);
  ctx.quadraticCurveTo(k * 0.02, -k * 0.35, -k * 0.03, -k * 0.365);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#c4a35a';
  ctx.beginPath();
  chamferRect(ctx, -k * 0.055, -k * 0.36, k * 0.1, k * 0.038, k * 0.012);
  ctx.fill();
  ctx.stroke();
  // Belly shade + light.
  ctx.fillStyle = shade(cloth, -16);
  ctx.beginPath();
  ctx.ellipse(k * 0.06, -k * 0.1, k * 0.09, k * 0.055, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = shade(cloth, 16);
  ctx.beginPath();
  ctx.ellipse(-k * 0.08, -k * 0.24, k * 0.055, k * 0.04, -0.4, 0, Math.PI * 2);
  ctx.fill();
  // The contents dust the shoulder.
  ctx.fillStyle = dustCol;
  ctx.beginPath();
  ctx.ellipse(-k * 0.02, -k * 0.35, k * 0.05, k * 0.02, 0.1, 0, Math.PI * 2);
  ctx.fill();
  // Stencil band names the goods plainly.
  ctx.fillStyle = shade(def?.color ?? '#a09a8a', -8);
  ctx.beginPath();
  chamferRect(ctx, -k * 0.1, -k * 0.19, k * 0.2, k * 0.05, k * 0.01);
  ctx.fill();
}

/** A rich heap of worked soil, a sprout already daring it. */
function drawSoilGround(g: GroundDropEnv, def: ItemDef | undefined): void {
  const { ctx, k, eid, itemId } = g;
  const soil = itemId === 'prime_compost' ? '#3f3226' : '#54432f';
  const lw = Math.max(1.3, k * 0.034);
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = lw;
  ctx.fillStyle = soil;
  ctx.beginPath();
  facetBlob(ctx, 0, -k * 0.09, k * 0.23, (eid * 2654435761) >>> 0, 9, 0.55);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = shade(soil, 14);
  ctx.beginPath();
  facetBlob(ctx, -k * 0.04, -k * 0.13, k * 0.13, (eid * 40503) >>> 0, 7, 0.55);
  ctx.fill();
  // Crumbs.
  ctx.fillStyle = shade(soil, -14);
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    facetCircle(ctx, (rnd(eid, 174 + i) - 0.5) * k * 0.42, -k * 0.02 + rnd(eid, 178 + i) * k * 0.03, k * 0.02, 5);
    ctx.fill();
  }
  // The sprout: prime compost earns two leaves.
  ctx.strokeStyle = '#4a7a3a';
  ctx.lineWidth = Math.max(1.3, k * 0.026);
  ctx.beginPath();
  ctx.moveTo(k * 0.03, -k * 0.16);
  ctx.quadraticCurveTo(k * 0.04, -k * 0.24, k * 0.02, -k * 0.28);
  ctx.stroke();
  ctx.fillStyle = def?.color ?? '#6a9a4a';
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = Math.max(1, k * 0.018);
  ctx.beginPath();
  ctx.ellipse(k * 0.055, -k * 0.29, k * 0.038, k * 0.022, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  if (itemId === 'prime_compost') {
    ctx.beginPath();
    ctx.ellipse(-k * 0.005, -k * 0.285, k * 0.032, k * 0.019, 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

/** A slatted livestock crate, straw bedding, something small inside. */
function drawCrateGround(g: GroundDropEnv, def: ItemDef | undefined): void {
  const { ctx, k, itemId, now, eid } = g;
  const wood = '#a3805a';
  const lw = Math.max(1.4, k * 0.038);
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = lw;
  // Box with the crate-lid top plane.
  ctx.fillStyle = shade(wood, -8);
  ctx.beginPath();
  chamferRect(ctx, -k * 0.23, -k * 0.3, k * 0.46, k * 0.3, k * 0.02);
  ctx.fill();
  ctx.stroke();
  // Slats: vertical gaps show the dark interior.
  ctx.fillStyle = shade(wood, -46);
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(-k * 0.155 + i * k * 0.125, -k * 0.24, k * 0.05, k * 0.2);
  }
  // The occupant: a warm shape + peeking eye glint in the middle gap.
  const who = itemId.startsWith('chick') ? '#e8c84a' : itemId.startsWith('lamb') ? '#ece4d2' : itemId.startsWith('calf') ? '#a3714a' : '#8a6a52';
  ctx.fillStyle = who;
  ctx.beginPath();
  ctx.ellipse(-k * 0.03 + k * 0.125, -k * 0.14, k * 0.038, k * 0.055, 0, 0, Math.PI * 2);
  ctx.fill();
  const blink = Math.sin(now / 900 + eid) > -0.85;
  if (blink) {
    ctx.fillStyle = '#241a2e';
    ctx.beginPath();
    facetCircle(ctx, k * 0.095, -k * 0.17, k * 0.012, 4);
    ctx.fill();
  }
  // Frame rails + top plane.
  ctx.fillStyle = wood;
  ctx.beginPath();
  chamferRect(ctx, -k * 0.24, -k * 0.33, k * 0.48, k * 0.07, k * 0.016);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = shade(wood, 20);
  ctx.beginPath();
  chamferRect(ctx, -k * 0.22, -k * 0.32, k * 0.44, k * 0.028, k * 0.01);
  ctx.fill();
  ctx.fillStyle = wood;
  ctx.beginPath();
  chamferRect(ctx, -k * 0.24, -k * 0.075, k * 0.48, k * 0.055, k * 0.014);
  ctx.fill();
  ctx.stroke();
  // Straw wisps out the bottom gap.
  ctx.strokeStyle = '#d8b862';
  ctx.lineWidth = Math.max(1, k * 0.016);
  for (let i = 0; i < 3; i++) {
    const sx = (rnd(eid, 182 + i) - 0.5) * k * 0.36;
    ctx.beginPath();
    ctx.moveTo(sx, -k * 0.02);
    ctx.lineTo(sx + k * 0.05, k * 0.015);
    ctx.stroke();
  }
}

/** Saddle papers: a saddle resting over a folded blanket. */
function drawSaddleGround(g: GroundDropEnv, def: ItemDef | undefined): void {
  const { ctx, k } = g;
  const leather = '#7a5a38';
  const blanket = def?.color ?? '#8a4a3a';
  const lw = Math.max(1.4, k * 0.038);
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = lw;
  // Folded blanket base.
  ctx.fillStyle = blanket;
  ctx.beginPath();
  chamferRect(ctx, -k * 0.26, -k * 0.12, k * 0.52, k * 0.12, k * 0.03);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = shade(blanket, 16);
  ctx.beginPath();
  chamferRect(ctx, -k * 0.24, -k * 0.115, k * 0.48, k * 0.04, k * 0.014);
  ctx.fill();
  // The saddle: seat sweep, pommel and cantle rise.
  ctx.fillStyle = leather;
  ctx.beginPath();
  ctx.moveTo(-k * 0.21, -k * 0.13);
  ctx.quadraticCurveTo(-k * 0.23, -k * 0.29, -k * 0.13, -k * 0.31);
  ctx.quadraticCurveTo(-k * 0.02, -k * 0.2, k * 0.09, -k * 0.215);
  ctx.quadraticCurveTo(k * 0.2, -k * 0.32, k * 0.235, -k * 0.245);
  ctx.quadraticCurveTo(k * 0.25, -k * 0.16, k * 0.19, -k * 0.125);
  ctx.quadraticCurveTo(0, -k * 0.085, -k * 0.21, -k * 0.13);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Seat gleam + skirt stitch.
  ctx.fillStyle = shade(leather, 22);
  ctx.beginPath();
  ctx.moveTo(-k * 0.1, -k * 0.24);
  ctx.quadraticCurveTo(0, -k * 0.17, k * 0.1, -k * 0.19);
  ctx.quadraticCurveTo(0, -k * 0.145, -k * 0.1, -k * 0.24);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = shade(leather, -30);
  ctx.lineWidth = Math.max(1, k * 0.016);
  ctx.setLineDash([k * 0.02, k * 0.02]);
  ctx.beginPath();
  ctx.moveTo(-k * 0.18, -k * 0.125);
  ctx.quadraticCurveTo(0, -k * 0.085, k * 0.18, -k * 0.12);
  ctx.stroke();
  ctx.setLineDash([]);
  // Stirrup.
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = lw;
  ctx.fillStyle = '#c8ccd6';
  ctx.beginPath();
  facetCircle(ctx, k * 0.13, -k * 0.05, k * 0.05, 6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = shade('#c8ccd6', -40);
  ctx.beginPath();
  facetCircle(ctx, k * 0.13, -k * 0.05, k * 0.024, 5);
  ctx.fill();
}

/** A drover's lead: coiled rope with a bright clip. */
function drawLeadGround(g: GroundDropEnv): void {
  const { ctx, k } = g;
  const rope = '#c4a35a';
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = Math.max(1.3, k * 0.034);
  // Coil: three stacked loops.
  for (let i = 0; i < 3; i++) {
    ctx.strokeStyle = i === 2 ? shade(rope, 14) : shade(rope, -6 * i);
    ctx.lineWidth = Math.max(2, k * 0.05);
    ctx.beginPath();
    ctx.ellipse(0, -k * 0.07 - i * k * 0.035, k * 0.19 - i * k * 0.008, k * 0.075, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Outline pass around the coil mass.
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = Math.max(1.2, k * 0.024);
  ctx.beginPath();
  ctx.ellipse(0, -k * 0.105, k * 0.225, k * 0.125, 0, 0, Math.PI * 2);
  ctx.stroke();
  // Loose end + clip.
  ctx.strokeStyle = shade(rope, -12);
  ctx.lineWidth = Math.max(2, k * 0.045);
  ctx.beginPath();
  ctx.moveTo(k * 0.18, -k * 0.06);
  ctx.quadraticCurveTo(k * 0.3, -k * 0.01, k * 0.26, k * 0.02);
  ctx.stroke();
  ctx.fillStyle = '#c8ccd6';
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = Math.max(1.2, k * 0.026);
  ctx.beginPath();
  chamferRect(ctx, k * 0.23, k * 0.0, k * 0.07, k * 0.045, k * 0.014);
  ctx.fill();
  ctx.stroke();
}

/** The gardener's watering can: body, spout, rose, arc handle. */
function drawWateringCanGround(g: GroundDropEnv, def: ItemDef | undefined): void {
  const { ctx, k } = g;
  const tin = def?.color ?? '#8a9aa8';
  const lw = Math.max(1.4, k * 0.038);
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = lw;
  // Body.
  ctx.fillStyle = tin;
  ctx.beginPath();
  chamferRect(ctx, -k * 0.15, -k * 0.3, k * 0.3, k * 0.3, [k * 0.02, k * 0.02, k * 0.05, k * 0.05]);
  ctx.fill();
  ctx.stroke();
  // Spout reaching up-right, rose at the tip.
  ctx.beginPath();
  ctx.moveTo(k * 0.13, -k * 0.17);
  ctx.lineTo(k * 0.31, -k * 0.3);
  ctx.lineTo(k * 0.35, -k * 0.26);
  ctx.lineTo(k * 0.16, -k * 0.11);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = shade(tin, -14);
  ctx.beginPath();
  facetCircle(ctx, k * 0.345, -k * 0.29, k * 0.05, 6, 0.4);
  ctx.fill();
  ctx.stroke();
  // Rose holes.
  ctx.fillStyle = shade(tin, -44);
  for (const [hx, hy] of [[k * 0.33, -k * 0.3], [k * 0.36, -k * 0.28], [k * 0.345, -k * 0.265]] as const) {
    ctx.beginPath();
    facetCircle(ctx, hx, hy, k * 0.009, 4);
    ctx.fill();
  }
  // Arc handle over the top.
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = Math.max(2, k * 0.05);
  ctx.beginPath();
  ctx.arc(0, -k * 0.3, k * 0.115, Math.PI, 0);
  ctx.stroke();
  ctx.strokeStyle = shade(tin, 8);
  ctx.lineWidth = Math.max(1.2, k * 0.028);
  ctx.beginPath();
  ctx.arc(0, -k * 0.3, k * 0.115, Math.PI, 0);
  ctx.stroke();
  // Water line + body light.
  ctx.strokeStyle = shade(tin, -20);
  ctx.lineWidth = Math.max(1, k * 0.018);
  ctx.beginPath();
  ctx.moveTo(-k * 0.13, -k * 0.21);
  ctx.lineTo(k * 0.13, -k * 0.21);
  ctx.stroke();
  ctx.fillStyle = shade(tin, 22);
  ctx.beginPath();
  chamferRect(ctx, -k * 0.12, -k * 0.28, k * 0.07, k * 0.16, k * 0.02);
  ctx.fill();
}

/** A gilded locket fallen open — a keepsake, not treasure to melt. */
function drawLocketGround(g: GroundDropEnv, def: ItemDef | undefined): void {
  const { ctx, k, now } = g;
  const gold = def?.color ?? '#d9a441';
  const lw = Math.max(1.2, k * 0.03);
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = lw;
  // Chain pooled behind.
  ctx.strokeStyle = shade(gold, -14);
  ctx.lineWidth = Math.max(1.2, k * 0.024);
  ctx.beginPath();
  ctx.ellipse(-k * 0.02, -k * 0.16, k * 0.13, k * 0.05, 0.2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = lw;
  // Two halves open like a book.
  for (const [off, dk] of [[-k * 0.085, -10], [k * 0.085, 4]] as const) {
    ctx.fillStyle = shade(gold, dk);
    ctx.beginPath();
    ctx.ellipse(off, -k * 0.06, k * 0.082, k * 0.095, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  // The portrait face in the right half; engraving in the left.
  ctx.fillStyle = '#e8dcc0';
  ctx.beginPath();
  ctx.ellipse(k * 0.085, -k * 0.06, k * 0.05, k * 0.062, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#8a6a52';
  ctx.beginPath();
  facetCircle(ctx, k * 0.085, -k * 0.075, k * 0.022, 6);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(k * 0.085, -k * 0.03, k * 0.03, k * 0.02, 0, 0, Math.PI);
  ctx.fill();
  ctx.strokeStyle = shade(gold, -26);
  ctx.lineWidth = Math.max(1, k * 0.012);
  ctx.beginPath();
  ctx.arc(-k * 0.085, -k * 0.06, k * 0.04, 0, Math.PI * 2);
  ctx.stroke();
  drawTwinkle(g, now, -k * 0.1);
}

/** A stamped token or campaign mark: a worn disc with a device. */
function drawTokenGround(g: GroundDropEnv, def: ItemDef | undefined): void {
  const { ctx, k, eid } = g;
  const col = def?.color ?? '#a89a8a';
  const lw = Math.max(1.3, k * 0.034);
  ctx.save();
  ctx.rotate((rnd(eid, 186) - 0.5) * 0.3);
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = lw;
  // Disc at a slight lie — the rim LIT so a dark campaign token still
  // parts from the grass (bench verdict: the mark sank at street read).
  ctx.fillStyle = shade(col, 14);
  ctx.beginPath();
  facetCircle(ctx, 0, -k * 0.09, k * 0.16, 8, -Math.PI / 2, 0.82);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = shade(col, -14);
  ctx.beginPath();
  facetCircle(ctx, 0, -k * 0.09, k * 0.115, 8, -Math.PI / 2, 0.82);
  ctx.fill();
  // The device: a stamped chevron pair.
  ctx.fillStyle = shade(col, 52);
  ctx.beginPath();
  ctx.moveTo(-k * 0.06, -k * 0.06);
  ctx.lineTo(0, -k * 0.115);
  ctx.lineTo(k * 0.06, -k * 0.06);
  ctx.lineTo(k * 0.035, -k * 0.04);
  ctx.lineTo(0, -k * 0.075);
  ctx.lineTo(-k * 0.035, -k * 0.04);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-k * 0.06, -k * 0.115);
  ctx.lineTo(0, -k * 0.17);
  ctx.lineTo(k * 0.06, -k * 0.115);
  ctx.lineTo(k * 0.035, -k * 0.095);
  ctx.lineTo(0, -k * 0.13);
  ctx.lineTo(-k * 0.035, -k * 0.095);
  ctx.closePath();
  ctx.fill();
  // Rim light.
  ctx.strokeStyle = shade(col, 30);
  ctx.lineWidth = Math.max(1, k * 0.016);
  ctx.beginPath();
  ctx.arc(-k * 0.045, -k * 0.14, k * 0.12, Math.PI * 0.9, Math.PI * 1.5);
  ctx.stroke();
  ctx.restore();
}

/** The arena's sand laurel: a woven half-wreath, victory-gold. */
function drawLaurelGround(g: GroundDropEnv, def: ItemDef | undefined): void {
  const { ctx, k } = g;
  const leaf = def?.color ?? '#c8a838';
  const lw = Math.max(1.2, k * 0.028);
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = lw;
  // Two branches sweeping up to nearly meet.
  for (const dir of [-1, 1]) {
    ctx.strokeStyle = shade('#8a6a34', -8);
    ctx.lineWidth = Math.max(1.4, k * 0.028);
    ctx.beginPath();
    ctx.moveTo(0, -k * 0.02);
    ctx.quadraticCurveTo(dir * k * 0.24, -k * 0.06, dir * k * 0.17, -k * 0.26);
    ctx.stroke();
    // Leaves along the branch.
    ctx.strokeStyle = g.outline;
    ctx.lineWidth = Math.max(1, k * 0.016);
    for (let i = 0; i < 5; i++) {
      const t = 0.2 + i * 0.18;
      const bx = dir * (2 * (1 - t) * t * k * 0.24 + t * t * k * 0.17);
      const by = -k * 0.02 + 2 * (1 - t) * t * -k * 0.04 + t * t * -k * 0.24;
      const a = dir * (-0.6 - t * 0.9);
      ctx.fillStyle = i % 2 ? leaf : shade(leaf, 16);
      ctx.beginPath();
      ctx.ellipse(bx + dir * k * 0.02, by - k * 0.01, k * 0.055, k * 0.024, a, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }
  // Ribbon tie at the base.
  ctx.fillStyle = '#a83232';
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = Math.max(1.1, k * 0.024);
  ctx.beginPath();
  chamferRect(ctx, -k * 0.045, -k * 0.045, k * 0.09, k * 0.05, k * 0.014);
  ctx.fill();
  ctx.stroke();
}

// ---------------------------------------------------------------- the larder

/** Steam wisps over anything served hot. */
function drawSteam(g: GroundDropEnv, cx: number, cy: number, n = 2): void {
  const { ctx, k, eid, now } = g;
  for (let i = 0; i < n; i++) {
    const t = (now / 1800 + rnd(eid, 190 + i)) % 1;
    const a = t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85;
    ctx.globalAlpha = 0.4 * a;
    ctx.strokeStyle = '#f0ece0';
    ctx.lineWidth = Math.max(1.2, k * 0.026);
    const sx = cx + (i - (n - 1) / 2) * k * 0.07;
    const sy = cy - t * k * 0.22;
    ctx.beginPath();
    ctx.moveTo(sx, sy + k * 0.05);
    ctx.quadraticCurveTo(sx + k * 0.03 * Math.sin(t * 9 + i), sy + k * 0.02, sx, sy - k * 0.03);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/** A whole fish as it came from the water: body, tail, fin, eye. */
function drawFishGround(g: GroundDropEnv): void {
  const { ctx, k, eid, qty, itemId } = g;
  const sp = fishSpecies(g.itemId) ?? 'trout';
  const look = FISH_LOOK[sp] ?? FISH_LOOK.trout!;
  const cooked = itemId.startsWith('smoked_') || itemId.startsWith('panfried_');
  const body = cooked ? shade('#b08850', -6) : look.col;
  const belly = cooked ? '#d8b880' : look.belly;
  const lw = Math.max(1.2, k * 0.03);
  const n = Math.min(3, qty);
  const L = k * 0.31 * look.long;
  for (let i = 0; i < n; i++) {
    ctx.save();
    ctx.translate((i - (n - 1) / 2) * k * 0.1, -k * 0.05 - Math.abs(i - (n - 1) / 2) * k * 0.09);
    ctx.scale(1, GROUND_SQUASH + 0.24);
    const flip = i % 2 ? -1 : 1;
    ctx.scale(flip, 1);
    ctx.rotate((rnd(eid, 194 + i) - 0.5) * 0.24);
    ctx.strokeStyle = g.outline;
    ctx.lineWidth = lw;
    // Body: a tapered lens, deeper at the shoulder.
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(-L, 0);
    ctx.quadraticCurveTo(-L * 0.4, -k * 0.115, L * 0.3, -k * 0.075);
    ctx.quadraticCurveTo(L * 0.8, -k * 0.035, L, -k * 0.01);
    ctx.quadraticCurveTo(L * 0.8, k * 0.02, L * 0.3, k * 0.065);
    ctx.quadraticCurveTo(-L * 0.4, k * 0.115, -L, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Tail fork.
    ctx.fillStyle = shade(body, -14);
    ctx.beginPath();
    ctx.moveTo(-L * 0.94, 0);
    ctx.lineTo(-L * 1.28, -k * 0.075);
    ctx.lineTo(-L * 1.16, 0);
    ctx.lineTo(-L * 1.28, k * 0.075);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Belly light + dorsal fin.
    ctx.fillStyle = belly;
    ctx.beginPath();
    ctx.moveTo(-L * 0.55, k * 0.04);
    ctx.quadraticCurveTo(0, k * 0.095, L * 0.5, k * 0.038);
    ctx.quadraticCurveTo(0, k * 0.05, -L * 0.55, k * 0.04);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = shade(body, -18);
    ctx.beginPath();
    ctx.moveTo(-L * 0.35, -k * 0.09);
    ctx.quadraticCurveTo(-L * 0.05, -k * 0.16, L * 0.15, -k * 0.085);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Gill line + eye.
    ctx.strokeStyle = shade(body, -24);
    ctx.lineWidth = Math.max(1, k * 0.016);
    ctx.beginPath();
    ctx.arc(L * 0.52, 0, k * 0.055, -1.2, 1.2);
    ctx.stroke();
    ctx.fillStyle = '#f4efe4';
    ctx.strokeStyle = g.outline;
    ctx.lineWidth = Math.max(1, k * 0.014);
    ctx.beginPath();
    facetCircle(ctx, L * 0.74, -k * 0.022, k * 0.026, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#241a2e';
    ctx.beginPath();
    facetCircle(ctx, L * 0.75, -k * 0.022, k * 0.012, 4);
    ctx.fill();
    // Glimmerfish carries its own light down the lateral line.
    if (sp === 'glimmerfish' && !cooked) {
      const p = 0.5 + 0.5 * Math.sin(g.now / 480 + eid + i);
      ctx.globalAlpha = 0.5 + 0.4 * p;
      ctx.strokeStyle = look.glow ?? '#9ad8f8';
      ctx.lineWidth = Math.max(1.2, k * 0.02);
      ctx.beginPath();
      ctx.moveTo(-L * 0.8, k * 0.005);
      ctx.quadraticCurveTo(0, -k * 0.02, L * 0.6, -k * 0.012);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }
  if (cooked) drawSteam(g, 0, -k * 0.16);
}

/** A dressed bird: raw pale or roast bronzed, drumsticks proud. */
function drawBirdGround(g: GroundDropEnv): void {
  const { ctx, k, itemId } = g;
  const cooked = itemId.startsWith('cooked');
  const skin = cooked ? '#c08838' : '#e8d0b8';
  const lw = Math.max(1.3, k * 0.034);
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = lw;
  // The body: breast up, cavity end right.
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.ellipse(0, -k * 0.115, k * 0.19, k * 0.135, -0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Drumsticks crossed at the right, knuckle nubs pale.
  for (const [rot, oy] of [[0.55, -k * 0.03], [0.95, k * 0.02]] as const) {
    ctx.save();
    ctx.translate(k * 0.135, -k * 0.09 + oy);
    ctx.rotate(rot);
    ctx.fillStyle = shade(skin, cooked ? -10 : -6);
    ctx.beginPath();
    ctx.moveTo(0, -k * 0.045);
    ctx.quadraticCurveTo(k * 0.13, -k * 0.055, k * 0.16, -k * 0.02);
    ctx.quadraticCurveTo(k * 0.165, k * 0.015, k * 0.13, k * 0.02);
    ctx.quadraticCurveTo(k * 0.04, k * 0.04, 0, k * 0.045);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#f0e8dc';
    ctx.beginPath();
    facetCircle(ctx, k * 0.165, 0, k * 0.028, 5);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  // Breast light; a roast wears glaze shine + steam.
  ctx.fillStyle = shade(skin, cooked ? 26 : 14);
  ctx.beginPath();
  ctx.ellipse(-k * 0.06, -k * 0.175, k * 0.08, k * 0.045, -0.3, 0, Math.PI * 2);
  ctx.fill();
  if (cooked) {
    ctx.fillStyle = shade(skin, -18);
    ctx.beginPath();
    ctx.ellipse(k * 0.02, -k * 0.06, k * 0.1, k * 0.035, 0.1, 0, Math.PI * 2);
    ctx.fill();
    drawSteam(g, -k * 0.02, -k * 0.24);
  } else {
    // Raw: a cool sheen band.
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(-k * 0.02, -k * 0.2, k * 0.05, k * 0.02, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

/** A cut of beef: raw marbled slab or seared roast. */
function drawSteakGround(g: GroundDropEnv): void {
  const { ctx, k, itemId } = g;
  const cooked = itemId.startsWith('cooked') || itemId.startsWith('smoked');
  const meat = cooked ? '#8a5230' : '#c4553d';
  const lw = Math.max(1.3, k * 0.034);
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = lw;
  ctx.save();
  ctx.rotate(-0.14);
  // The slab, thick-edged.
  ctx.fillStyle = shade(meat, -20);
  ctx.beginPath();
  chamferRect(ctx, -k * 0.22, -k * 0.14, k * 0.44, k * 0.15, k * 0.06);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = meat;
  ctx.beginPath();
  chamferRect(ctx, -k * 0.22, -k * 0.2, k * 0.44, k * 0.16, k * 0.06);
  ctx.fill();
  ctx.stroke();
  if (cooked) {
    // Sear bars + rest juices.
    ctx.strokeStyle = shade(meat, -34);
    ctx.lineWidth = Math.max(1.4, k * 0.03);
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(i * k * 0.11 - k * 0.05, -k * 0.195);
      ctx.lineTo(i * k * 0.11 + k * 0.05, -k * 0.05);
      ctx.stroke();
    }
    drawSteam(g, 0, -k * 0.25);
  } else {
    // Marbling + fat cap.
    ctx.strokeStyle = '#f0e0d0';
    ctx.lineWidth = Math.max(1, k * 0.018);
    ctx.beginPath();
    ctx.moveTo(-k * 0.14, -k * 0.14);
    ctx.quadraticCurveTo(-k * 0.02, -k * 0.09, k * 0.08, -k * 0.135);
    ctx.moveTo(-k * 0.07, -k * 0.175);
    ctx.quadraticCurveTo(k * 0.02, -k * 0.14, k * 0.13, -k * 0.16);
    ctx.stroke();
    ctx.fillStyle = '#f0e0d0';
    ctx.beginPath();
    ctx.moveTo(-k * 0.22, -k * 0.155);
    ctx.quadraticCurveTo(0, -k * 0.215, k * 0.22, -k * 0.16);
    ctx.lineTo(k * 0.22, -k * 0.125);
    ctx.quadraticCurveTo(0, -k * 0.18, -k * 0.22, -k * 0.12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = shade(meat, 18);
  ctx.beginPath();
  ctx.ellipse(-k * 0.1, -k * 0.11, k * 0.05, k * 0.026, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Root vegetables with their greens still on: carrot, redroot. */
function drawRootGround(g: GroundDropEnv, def: ItemDef | undefined): void {
  const { ctx, k, eid, qty } = g;
  const col = def?.color ?? '#d9843d';
  const lw = Math.max(1.2, k * 0.03);
  const n = Math.min(3, qty);
  for (let i = 0; i < n; i++) {
    ctx.save();
    ctx.translate((i - (n - 1) / 2) * k * 0.14, -Math.abs(i - (n - 1) / 2) * k * 0.02);
    ctx.rotate(0.9 + (rnd(eid, 200 + i) - 0.5) * 0.4);
    ctx.strokeStyle = g.outline;
    ctx.lineWidth = lw;
    // Taproot.
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(0, -k * 0.16);
    ctx.quadraticCurveTo(k * 0.065, -k * 0.13, k * 0.045, -k * 0.03);
    ctx.quadraticCurveTo(k * 0.03, k * 0.09, 0, k * 0.16);
    ctx.quadraticCurveTo(-k * 0.03, k * 0.09, -k * 0.045, -k * 0.03);
    ctx.quadraticCurveTo(-k * 0.065, -k * 0.13, 0, -k * 0.16);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Ring scars + shoulder light.
    ctx.strokeStyle = shade(col, -22);
    ctx.lineWidth = Math.max(1, k * 0.014);
    for (let r = 0; r < 3; r++) {
      ctx.beginPath();
      ctx.moveTo(-k * (0.04 - r * 0.008), -k * (0.08 - r * 0.07));
      ctx.lineTo(k * (0.04 - r * 0.008), -k * (0.08 - r * 0.07));
      ctx.stroke();
    }
    ctx.fillStyle = shade(col, 22);
    ctx.beginPath();
    ctx.ellipse(-k * 0.02, -k * 0.1, k * 0.018, k * 0.05, 0.15, 0, Math.PI * 2);
    ctx.fill();
    // The greens.
    ctx.strokeStyle = '#4a7a3a';
    ctx.lineWidth = Math.max(1.2, k * 0.022);
    for (let l = -1; l <= 1; l++) {
      ctx.beginPath();
      ctx.moveTo(0, -k * 0.15);
      ctx.quadraticCurveTo(l * k * 0.06, -k * 0.22, l * k * 0.085, -k * 0.28);
      ctx.stroke();
    }
    ctx.restore();
  }
}

/** Bulbs: potato's earthy lump, onion's papery globe with its neck. */
function drawBulbGround(g: GroundDropEnv, def: ItemDef | undefined): void {
  const { ctx, k, eid, qty, itemId } = g;
  const onion = itemId.startsWith('onion');
  const col = def?.color ?? (onion ? '#d8a858' : '#c8a068');
  const lw = Math.max(1.2, k * 0.03);
  const n = Math.min(3, qty);
  for (let i = 0; i < n; i++) {
    const cx = (i - (n - 1) / 2) * k * 0.16;
    const cy = -k * 0.09 - (i % 2) * k * 0.03;
    ctx.strokeStyle = g.outline;
    ctx.lineWidth = lw;
    ctx.fillStyle = i === 1 ? shade(col, -8) : col;
    if (onion) {
      ctx.beginPath();
      facetCircle(ctx, cx, cy, k * 0.105, 8, -Math.PI / 2, 0.92);
      ctx.fill();
      ctx.stroke();
      // Papery sheen lines + the neck tuft.
      ctx.strokeStyle = shade(col, -20);
      ctx.lineWidth = Math.max(1, k * 0.014);
      for (let s = -1; s <= 1; s++) {
        ctx.beginPath();
        ctx.moveTo(cx + s * k * 0.045, cy - k * 0.08);
        ctx.quadraticCurveTo(cx + s * k * 0.06, cy, cx + s * k * 0.04, cy + k * 0.085);
        ctx.stroke();
      }
      ctx.strokeStyle = '#a08a5a';
      ctx.lineWidth = Math.max(1.2, k * 0.02);
      ctx.beginPath();
      ctx.moveTo(cx, cy - k * 0.1);
      ctx.quadraticCurveTo(cx + k * 0.02, cy - k * 0.15, cx - k * 0.01, cy - k * 0.175);
      ctx.stroke();
    } else {
      ctx.beginPath();
      facetBlob(ctx, cx, cy, k * 0.125, ((eid + i) * 69069) >>> 0, 8, 0.82);
      ctx.fill();
      ctx.stroke();
      // Eyes.
      ctx.fillStyle = shade(col, -26);
      for (let e = 0; e < 3; e++) {
        ctx.beginPath();
        facetCircle(ctx, cx + (rnd(eid, 204 + i * 3 + e) - 0.5) * k * 0.12, cy + (rnd(eid, 208 + i * 3 + e) - 0.5) * k * 0.1, k * 0.014, 4);
        ctx.fill();
      }
      ctx.fillStyle = shade(col, 18);
      ctx.beginPath();
      ctx.ellipse(cx - k * 0.035, cy - k * 0.045, k * 0.04, k * 0.025, -0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** A cabbage head: wrapper leaves opening around the tight heart. */
function drawLeafHeadGround(g: GroundDropEnv, def: ItemDef | undefined): void {
  const { ctx, k } = g;
  const col = def?.color ?? '#7aa858';
  const lw = Math.max(1.3, k * 0.032);
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = lw;
  // Outer wrappers: three broad leaves.
  for (const [rot, dk] of [[-0.7, -14], [0.7, -8], [0, 0]] as const) {
    ctx.save();
    ctx.rotate(rot * 0.3);
    ctx.fillStyle = shade(col, dk);
    ctx.beginPath();
    ctx.ellipse(rot * k * 0.09, -k * 0.1, k * 0.155, k * 0.13, rot * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  // The heart.
  ctx.fillStyle = shade(col, 16);
  ctx.beginPath();
  facetCircle(ctx, 0, -k * 0.115, k * 0.105, 8);
  ctx.fill();
  ctx.stroke();
  // Vein lines.
  ctx.strokeStyle = shade(col, 34);
  ctx.lineWidth = Math.max(1, k * 0.016);
  for (let v = -1; v <= 1; v++) {
    ctx.beginPath();
    ctx.moveTo(0, -k * 0.03);
    ctx.quadraticCurveTo(v * k * 0.06, -k * 0.12, v * k * 0.075, -k * 0.195);
    ctx.stroke();
  }
  ctx.fillStyle = shade(col, 30);
  ctx.beginPath();
  ctx.ellipse(-k * 0.045, -k * 0.16, k * 0.045, k * 0.028, -0.4, 0, Math.PI * 2);
  ctx.fill();
}

/** A gourd standing on its base: ribbed, stalk curled. */
function drawGourdGround(g: GroundDropEnv, def: ItemDef | undefined): void {
  const { ctx, k, itemId } = g;
  const col = def?.color ?? (itemId.startsWith('kingsquash') ? '#c8b44a' : '#d9843d');
  const lw = Math.max(1.4, k * 0.038);
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = lw;
  // Body: squat sphere, slightly wider than tall.
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.ellipse(0, -k * 0.14, k * 0.21, k * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Ribs.
  ctx.strokeStyle = shade(col, -22);
  ctx.lineWidth = Math.max(1.1, k * 0.02);
  for (let r = -2; r <= 2; r++) {
    if (r === 0) continue;
    ctx.beginPath();
    ctx.moveTo(r * k * 0.065, -k * 0.285);
    ctx.quadraticCurveTo(r * k * 0.1, -k * 0.14, r * k * 0.065, -k * 0.005);
    ctx.stroke();
  }
  // Crown light + ground shade.
  ctx.fillStyle = shade(col, 22);
  ctx.beginPath();
  ctx.ellipse(-k * 0.07, -k * 0.225, k * 0.06, k * 0.035, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = shade(col, -16);
  ctx.beginPath();
  ctx.ellipse(k * 0.03, -k * 0.045, k * 0.13, k * 0.04, 0, 0, Math.PI * 2);
  ctx.fill();
  // Stalk.
  ctx.strokeStyle = '#6b7a3a';
  ctx.lineWidth = Math.max(1.6, k * 0.036);
  ctx.beginPath();
  ctx.moveTo(0, -k * 0.29);
  ctx.quadraticCurveTo(k * 0.03, -k * 0.36, k * 0.08, -k * 0.35);
  ctx.stroke();
}

/** Orchard fruit: an apple/plum/fig with cheek light and a leaf. */
function drawFruitGround(g: GroundDropEnv, def: ItemDef | undefined): void {
  const { ctx, k, eid, qty } = g;
  const col = def?.color ?? '#c4553d';
  const lw = Math.max(1.2, k * 0.03);
  const n = Math.min(3, qty);
  for (let i = 0; i < n; i++) {
    const cx = (i - (n - 1) / 2) * k * 0.15 + (rnd(eid, 212 + i) - 0.5) * k * 0.03;
    const cy = -k * 0.095 - (i % 2) * k * 0.04;
    ctx.strokeStyle = g.outline;
    ctx.lineWidth = lw;
    ctx.fillStyle = i === 1 ? shade(col, -10) : col;
    ctx.beginPath();
    facetCircle(ctx, cx, cy, k * 0.095, 9, -Math.PI / 2 + 0.2, 0.95);
    ctx.fill();
    ctx.stroke();
    // Cheek light + dimple.
    ctx.fillStyle = shade(col, 30);
    ctx.beginPath();
    ctx.ellipse(cx - k * 0.03, cy - k * 0.04, k * 0.032, k * 0.022, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = shade(col, -24);
    ctx.beginPath();
    ctx.ellipse(cx, cy - k * 0.085, k * 0.02, k * 0.009, 0, 0, Math.PI * 2);
    ctx.fill();
    // Stem + one leaf on the front fruit.
    ctx.strokeStyle = '#6b4a26';
    ctx.lineWidth = Math.max(1.2, k * 0.02);
    ctx.beginPath();
    ctx.moveTo(cx, cy - k * 0.09);
    ctx.lineTo(cx + k * 0.015, cy - k * 0.14);
    ctx.stroke();
    if (i === 0) {
      ctx.fillStyle = '#5a8a42';
      ctx.strokeStyle = g.outline;
      ctx.lineWidth = Math.max(1, k * 0.016);
      ctx.beginPath();
      ctx.ellipse(cx + k * 0.05, cy - k * 0.135, k * 0.038, k * 0.018, -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }
}

/** A berry cluster heaped on its own leaves. */
function drawBerriesGround(g: GroundDropEnv, def: ItemDef | undefined): void {
  const { ctx, k, eid } = g;
  const col = def?.color ?? '#7a4a8a';
  const lw = Math.max(1.1, k * 0.026);
  // Leaf bed.
  ctx.fillStyle = '#5a8a42';
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = Math.max(1.2, k * 0.028);
  for (const rot of [-0.6, 0.4, 1.7]) {
    ctx.beginPath();
    ctx.ellipse(Math.cos(rot) * k * 0.09, -k * 0.045 + Math.sin(rot) * k * 0.03, k * 0.1, k * 0.045, rot, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  // The heap: back row dark, front row lit, one gleam per berry.
  ctx.lineWidth = lw;
  const spots: Array<[number, number, number]> = [
    [-k * 0.09, -k * 0.1, -16], [k * 0.02, -k * 0.13, -10], [k * 0.11, -k * 0.09, -16],
    [-k * 0.04, -k * 0.06, 6], [k * 0.06, -k * 0.05, 0], [-k * 0.12, -k * 0.04, 0],
    [0, -k * 0.185, 10],
  ];
  for (const [bx, by, dk] of spots) {
    ctx.fillStyle = shade(col, dk);
    ctx.beginPath();
    facetCircle(ctx, bx + (rnd(eid, 216) - 0.5) * k * 0.01, by, k * 0.05, 7);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = shade(col, dk + 36);
    ctx.beginPath();
    facetCircle(ctx, bx - k * 0.014, by - k * 0.016, k * 0.013, 4);
    ctx.fill();
  }
}

/** A proud loaf: scored crust, flour dust, board underneath. */
function drawLoafGround(g: GroundDropEnv): void {
  const { ctx, k } = g;
  const crust = '#c08838';
  const lw = Math.max(1.3, k * 0.034);
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = lw;
  ctx.save();
  ctx.rotate(-0.1);
  // The loaf.
  ctx.fillStyle = crust;
  ctx.beginPath();
  ctx.moveTo(-k * 0.22, -k * 0.03);
  ctx.quadraticCurveTo(-k * 0.24, -k * 0.2, -k * 0.05, -k * 0.225);
  ctx.quadraticCurveTo(k * 0.16, -k * 0.24, k * 0.22, -k * 0.1);
  ctx.quadraticCurveTo(k * 0.24, -k * 0.02, k * 0.16, -k * 0.01);
  ctx.lineTo(-k * 0.17, -k * 0.005);
  ctx.quadraticCurveTo(-k * 0.22, -k * 0.005, -k * 0.22, -k * 0.03);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Score cuts: pale crumb showing through.
  ctx.strokeStyle = '#e8d0a0';
  ctx.lineWidth = Math.max(1.6, k * 0.036);
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(i * k * 0.085 - k * 0.045, -k * 0.185 + Math.abs(i) * k * 0.02);
    ctx.lineTo(i * k * 0.085 + k * 0.035, -k * 0.115 + Math.abs(i) * k * 0.015);
    ctx.stroke();
  }
  // Crust light + flour dust.
  ctx.fillStyle = shade(crust, 26);
  ctx.beginPath();
  ctx.ellipse(-k * 0.09, -k * 0.17, k * 0.06, k * 0.03, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = '#f4ecd8';
  ctx.beginPath();
  ctx.ellipse(k * 0.06, -k * 0.2, k * 0.05, k * 0.02, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}

/** A celebration cake: two tiers, drip icing, one candle-berry. */
function drawCakeGround(g: GroundDropEnv, def: ItemDef | undefined): void {
  const { ctx, k } = g;
  const sponge = def?.color ?? '#d8a868';
  const icing = '#f4ece0';
  const lw = Math.max(1.3, k * 0.034);
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = lw;
  // Plate.
  ctx.fillStyle = '#c8ccd6';
  ctx.beginPath();
  ctx.ellipse(0, -k * 0.02, k * 0.24, k * 0.075, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Tiers.
  for (const [w, y, h] of [[k * 0.36, -k * 0.05, k * 0.14], [k * 0.24, -k * 0.19, k * 0.115]] as const) {
    ctx.fillStyle = sponge;
    ctx.beginPath();
    chamferRect(ctx, -w / 2, y - h, w, h, k * 0.014);
    ctx.fill();
    ctx.stroke();
    // Icing cap with drips.
    ctx.fillStyle = icing;
    ctx.beginPath();
    ctx.moveTo(-w / 2 - k * 0.012, y - h);
    ctx.lineTo(w / 2 + k * 0.012, y - h);
    ctx.lineTo(w / 2 + k * 0.008, y - h + k * 0.045);
    ctx.quadraticCurveTo(w * 0.3, y - h + k * 0.07, w * 0.22, y - h + k * 0.04);
    ctx.quadraticCurveTo(w * 0.05, y - h + k * 0.08, -w * 0.08, y - h + k * 0.045);
    ctx.quadraticCurveTo(-w * 0.28, y - h + k * 0.075, -w / 2 + k * 0.005, y - h + k * 0.038);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  // The crowning berry.
  ctx.fillStyle = '#c4553d';
  ctx.beginPath();
  facetCircle(ctx, 0, -k * 0.335, k * 0.035, 6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fff2cc';
  ctx.beginPath();
  facetCircle(ctx, -k * 0.012, -k * 0.347, k * 0.012, 4);
  ctx.fill();
}

/** A pie fresh from the oven: crimped rim, vent cuts, filling peek. */
function drawPieGround(g: GroundDropEnv, def: ItemDef | undefined): void {
  const { ctx, k, itemId } = g;
  const crust = '#c89848';
  const fill = def?.color ?? (itemId.startsWith('pumpkin') ? '#d9843d' : '#8a4a3a');
  const lw = Math.max(1.3, k * 0.034);
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = lw;
  // Tin.
  ctx.fillStyle = '#a8aeb8';
  ctx.beginPath();
  ctx.ellipse(0, -k * 0.045, k * 0.235, k * 0.095, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Dome.
  ctx.fillStyle = crust;
  ctx.beginPath();
  ctx.ellipse(0, -k * 0.115, k * 0.205, k * 0.115, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Crimped rim: a run of thumb scallops.
  ctx.fillStyle = shade(crust, -12);
  for (let i = 0; i < 9; i++) {
    const a = Math.PI * (0.08 + (i / 8) * 0.84);
    const sx = Math.cos(a) * k * 0.2;
    const sy = -k * 0.06 - Math.sin(a) * k * 0.02;
    ctx.beginPath();
    facetCircle(ctx, sx, sy, k * 0.032, 5);
    ctx.fill();
  }
  // Vent cuts with the filling glowing through.
  ctx.strokeStyle = fill;
  ctx.lineWidth = Math.max(1.6, k * 0.034);
  ctx.beginPath();
  ctx.moveTo(-k * 0.055, -k * 0.16);
  ctx.lineTo(k * 0.0, -k * 0.115);
  ctx.moveTo(k * 0.055, -k * 0.16);
  ctx.lineTo(k * 0.0, -k * 0.115);
  ctx.stroke();
  // Glaze light.
  ctx.fillStyle = shade(crust, 26);
  ctx.beginPath();
  ctx.ellipse(-k * 0.075, -k * 0.165, k * 0.06, k * 0.028, -0.3, 0, Math.PI * 2);
  ctx.fill();
  drawSteam(g, 0, -k * 0.22);
}

/** A hot dish: earthenware oval, contents heaped in its color. */
function drawDishGround(g: GroundDropEnv, def: ItemDef | undefined): void {
  const { ctx, k, eid } = g;
  const ware = '#8a5a3a';
  const food = def?.color ?? '#c8a058';
  const lw = Math.max(1.3, k * 0.034);
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = lw;
  // The dish.
  ctx.fillStyle = ware;
  ctx.beginPath();
  ctx.ellipse(0, -k * 0.055, k * 0.235, k * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = shade(ware, -22);
  ctx.beginPath();
  ctx.ellipse(0, -k * 0.075, k * 0.19, k * 0.07, 0, 0, Math.PI * 2);
  ctx.fill();
  // The heap: three mounded lumps of the food's color.
  for (const [fx, fy, r, dk] of [
    [-k * 0.075, -k * 0.1, k * 0.08, -8],
    [k * 0.07, -k * 0.095, k * 0.075, -14],
    [0, -k * 0.145, k * 0.085, 8],
  ] as const) {
    ctx.fillStyle = shade(food, dk);
    ctx.beginPath();
    facetBlob(ctx, fx, fy, r, ((eid + fx) * 69069) >>> 0, 7, 0.8);
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = shade(food, 28);
  ctx.beginPath();
  ctx.ellipse(-k * 0.02, -k * 0.175, k * 0.045, k * 0.02, -0.2, 0, Math.PI * 2);
  ctx.fill();
  // A garnish fleck.
  ctx.fillStyle = '#5a8a42';
  ctx.beginPath();
  ctx.ellipse(k * 0.04, -k * 0.14, k * 0.022, k * 0.01, 0.5, 0, Math.PI * 2);
  ctx.fill();
  drawSteam(g, 0, -k * 0.2);
}

/** A steaming bowl: glazed rim, broth surface, spoon handle out. */
function drawBowlGround(g: GroundDropEnv, def: ItemDef | undefined): void {
  const { ctx, k } = g;
  const ware = '#6a7a8a';
  const broth = def?.color ?? '#b8863d';
  const lw = Math.max(1.3, k * 0.034);
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = lw;
  // Bowl body.
  ctx.fillStyle = ware;
  ctx.beginPath();
  ctx.moveTo(-k * 0.19, -k * 0.185);
  ctx.quadraticCurveTo(-k * 0.17, -k * 0.01, 0, 0);
  ctx.quadraticCurveTo(k * 0.17, -k * 0.01, k * 0.19, -k * 0.185);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Glaze band.
  ctx.fillStyle = shade(ware, 18);
  ctx.beginPath();
  ctx.moveTo(-k * 0.165, -k * 0.15);
  ctx.quadraticCurveTo(0, -k * 0.115, k * 0.165, -k * 0.15);
  ctx.lineTo(k * 0.15, -k * 0.1);
  ctx.quadraticCurveTo(0, -k * 0.065, -k * 0.15, -k * 0.1);
  ctx.closePath();
  ctx.fill();
  // Rim + broth.
  ctx.fillStyle = shade(ware, -14);
  ctx.beginPath();
  ctx.ellipse(0, -k * 0.185, k * 0.19, k * 0.065, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = broth;
  ctx.beginPath();
  ctx.ellipse(0, -k * 0.185, k * 0.15, k * 0.048, 0, 0, Math.PI * 2);
  ctx.fill();
  // Surface bits + sheen.
  ctx.fillStyle = shade(broth, -18);
  for (const [bx, by] of [[-k * 0.06, -k * 0.185], [k * 0.045, -k * 0.175], [k * 0.02, -k * 0.2]] as const) {
    ctx.beginPath();
    facetCircle(ctx, bx, by, k * 0.022, 5);
    ctx.fill();
  }
  ctx.fillStyle = shade(broth, 30);
  ctx.beginPath();
  ctx.ellipse(-k * 0.05, -k * 0.2, k * 0.04, k * 0.014, -0.1, 0, Math.PI * 2);
  ctx.fill();
  // Spoon leaning out.
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = Math.max(1.6, k * 0.036);
  ctx.beginPath();
  ctx.moveTo(k * 0.1, -k * 0.2);
  ctx.lineTo(k * 0.21, -k * 0.33);
  ctx.stroke();
  ctx.strokeStyle = '#c8a058';
  ctx.lineWidth = Math.max(1.2, k * 0.024);
  ctx.beginPath();
  ctx.moveTo(k * 0.105, -k * 0.205);
  ctx.lineTo(k * 0.205, -k * 0.325);
  ctx.stroke();
  drawSteam(g, -k * 0.02, -k * 0.26);
}

/** The laden board: a feast spread that reads as plenty. */
function drawFeastBoardGround(g: GroundDropEnv, def: ItemDef | undefined): void {
  const { ctx, k, itemId } = g;
  const wood = '#a3805a';
  const royal = itemId === 'royal_banquet';
  const lw = Math.max(1.3, k * 0.034);
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = lw;
  // The board.
  ctx.fillStyle = wood;
  ctx.beginPath();
  chamferRect(ctx, -k * 0.33, -k * 0.15, k * 0.66, k * 0.16, k * 0.03);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = shade(wood, 14);
  ctx.beginPath();
  chamferRect(ctx, -k * 0.31, -k * 0.14, k * 0.62, k * 0.045, k * 0.016);
  ctx.fill();
  // The spread: a roast center, cheese wedge, bread, fruit, sprigs.
  // Roast.
  ctx.fillStyle = '#8a5230';
  ctx.beginPath();
  ctx.ellipse(0, -k * 0.19, k * 0.115, k * 0.075, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = shade('#8a5230', 24);
  ctx.beginPath();
  ctx.ellipse(-k * 0.035, -k * 0.215, k * 0.05, k * 0.026, -0.3, 0, Math.PI * 2);
  ctx.fill();
  // Cheese wedge.
  ctx.fillStyle = '#e0b850';
  ctx.beginPath();
  ctx.moveTo(-k * 0.29, -k * 0.14);
  ctx.lineTo(-k * 0.15, -k * 0.22);
  ctx.lineTo(-k * 0.13, -k * 0.14);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Loaf.
  ctx.fillStyle = '#c08838';
  ctx.beginPath();
  ctx.ellipse(k * 0.21, -k * 0.185, k * 0.085, k * 0.05, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Fruit pair.
  ctx.fillStyle = '#c4553d';
  ctx.beginPath();
  facetCircle(ctx, k * 0.09, -k * 0.145, k * 0.038, 7);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#7a4a8a';
  ctx.beginPath();
  facetCircle(ctx, -k * 0.06, -k * 0.135, k * 0.032, 7);
  ctx.fill();
  ctx.stroke();
  // Herb sprigs.
  ctx.strokeStyle = '#5a8a42';
  ctx.lineWidth = Math.max(1, k * 0.018);
  ctx.beginPath();
  ctx.moveTo(k * 0.14, -k * 0.13);
  ctx.lineTo(k * 0.17, -k * 0.17);
  ctx.moveTo(-k * 0.2, -k * 0.13);
  ctx.lineTo(-k * 0.23, -k * 0.165);
  ctx.stroke();
  // The royal banquet earns a golden goblet.
  if (royal) {
    ctx.strokeStyle = g.outline;
    ctx.lineWidth = Math.max(1.2, k * 0.026);
    ctx.fillStyle = '#d9a441';
    ctx.beginPath();
    ctx.moveTo(k * 0.285, -k * 0.3);
    ctx.quadraticCurveTo(k * 0.31, -k * 0.24, k * 0.3, -k * 0.215);
    ctx.lineTo(k * 0.315, -k * 0.155);
    ctx.lineTo(k * 0.265, -k * 0.155);
    ctx.lineTo(k * 0.28, -k * 0.215);
    ctx.quadraticCurveTo(k * 0.27, -k * 0.24, k * 0.295, -k * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#8a2a3a';
    ctx.beginPath();
    ctx.ellipse(k * 0.29, -k * 0.3, k * 0.026, k * 0.012, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  drawSteam(g, 0, -k * 0.26);
}

/** A pat of butter on its cloth, one curl shaved off. */
function drawButterGround(g: GroundDropEnv): void {
  const { ctx, k } = g;
  const col = '#f0d060';
  const lw = Math.max(1.2, k * 0.03);
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = lw;
  // Cloth square under.
  ctx.fillStyle = '#e8e0cc';
  ctx.beginPath();
  ctx.moveTo(-k * 0.24, -k * 0.02);
  ctx.lineTo(-k * 0.06, -k * 0.115);
  ctx.lineTo(k * 0.22, -k * 0.06);
  ctx.lineTo(k * 0.08, k * 0.035);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // The block, crate-lid lit.
  ctx.fillStyle = shade(col, -10);
  ctx.beginPath();
  chamferRect(ctx, -k * 0.13, -k * 0.16, k * 0.26, k * 0.13, k * 0.014);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = shade(col, 18);
  ctx.beginPath();
  ctx.moveTo(-k * 0.13, -k * 0.16);
  ctx.lineTo(-k * 0.095, -k * 0.215);
  ctx.lineTo(k * 0.165, -k * 0.215);
  ctx.lineTo(k * 0.13, -k * 0.16);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // The shaved curl beside it.
  ctx.fillStyle = shade(col, 26);
  ctx.beginPath();
  ctx.arc(k * 0.2, -k * 0.045, k * 0.045, 0.4, Math.PI * 1.6);
  ctx.arc(k * 0.2, -k * 0.045, k * 0.022, Math.PI * 1.6, 0.4, true);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

/** A cheese wheel with the wedge cut out — the eye holes showing. */
function drawCheeseGround(g: GroundDropEnv, def: ItemDef | undefined): void {
  const { ctx, k, eid, itemId } = g;
  const rind = itemId.startsWith('hard') ? '#c89848' : '#e8c868';
  const paste = def?.color ?? shade(rind, 24);
  const lw = Math.max(1.3, k * 0.034);
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = lw;
  // The wheel: a squat cylinder with a wedge notch at 4 o'clock.
  const R = k * 0.21;
  const notchA0 = 0.15;
  const notchA1 = 0.95;
  ctx.fillStyle = rind;
  ctx.beginPath();
  ctx.moveTo(0, -k * 0.09);
  ctx.ellipse(0, -k * 0.09, R, R * 0.62, 0, notchA1, notchA0 + Math.PI * 2);
  ctx.lineTo(0, -k * 0.09);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Side wall under the front arc.
  ctx.fillStyle = shade(rind, -18);
  ctx.beginPath();
  ctx.ellipse(0, -k * 0.09, R, R * 0.62, 0, notchA0, Math.PI - 0.2);
  ctx.ellipse(0, -k * 0.035, R, R * 0.62, 0, Math.PI - 0.2, notchA0, true);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Cut faces of the notch: pale paste with eyes.
  ctx.fillStyle = paste;
  ctx.beginPath();
  ctx.moveTo(0, -k * 0.09);
  ctx.lineTo(Math.cos(notchA0) * R, -k * 0.09 + Math.sin(notchA0) * R * 0.62);
  ctx.lineTo(Math.cos(notchA0) * R, -k * 0.035 + Math.sin(notchA0) * R * 0.62);
  ctx.lineTo(0, -k * 0.035);
  ctx.lineTo(Math.cos(notchA1) * R * 0.99, -k * 0.035 + Math.sin(notchA1) * R * 0.62);
  ctx.lineTo(Math.cos(notchA1) * R * 0.99, -k * 0.09 + Math.sin(notchA1) * R * 0.62);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Eyes in the paste + top light.
  ctx.fillStyle = shade(paste, -22);
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    facetCircle(ctx, k * (0.04 + rnd(eid, 220 + i) * 0.1), -k * (0.05 + rnd(eid, 224 + i) * 0.02), k * 0.014, 5);
    ctx.fill();
  }
  ctx.fillStyle = shade(rind, 20);
  ctx.beginPath();
  ctx.ellipse(-k * 0.07, -k * 0.155, k * 0.075, k * 0.032, -0.2, 0, Math.PI * 2);
  ctx.fill();
  // The cut wedge lying beside.
  ctx.save();
  ctx.translate(k * 0.235, k * 0.0);
  ctx.rotate(0.3);
  ctx.fillStyle = paste;
  ctx.beginPath();
  ctx.moveTo(-k * 0.09, 0);
  ctx.lineTo(k * 0.06, -k * 0.055);
  ctx.lineTo(k * 0.06, 0.0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/** A stoneware jug with a cork and a rope loop handle. */
function drawJugGround(g: GroundDropEnv, def: ItemDef | undefined): void {
  const { ctx, k } = g;
  const ware = def?.color ?? '#a3714a';
  const lw = Math.max(1.3, k * 0.036);
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = lw;
  // Body: swollen shoulder tapering to a foot.
  ctx.fillStyle = ware;
  ctx.beginPath();
  ctx.moveTo(-k * 0.09, -k * 0.42);
  ctx.quadraticCurveTo(-k * 0.23, -k * 0.35, -k * 0.19, -k * 0.15);
  ctx.quadraticCurveTo(-k * 0.17, -k * 0.01, 0, 0);
  ctx.quadraticCurveTo(k * 0.17, -k * 0.01, k * 0.19, -k * 0.15);
  ctx.quadraticCurveTo(k * 0.23, -k * 0.35, k * 0.09, -k * 0.42);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Neck + cork.
  ctx.fillStyle = shade(ware, -12);
  ctx.beginPath();
  chamferRect(ctx, -k * 0.06, -k * 0.5, k * 0.12, k * 0.09, k * 0.014);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#c8a058';
  ctx.beginPath();
  chamferRect(ctx, -k * 0.045, -k * 0.545, k * 0.09, k * 0.05, k * 0.016);
  ctx.fill();
  ctx.stroke();
  // Glaze dip line + belly light.
  ctx.fillStyle = shade(ware, -20);
  ctx.beginPath();
  ctx.moveTo(-k * 0.205, -k * 0.24);
  ctx.quadraticCurveTo(0, -k * 0.19, k * 0.205, -k * 0.24);
  ctx.lineTo(k * 0.21, -k * 0.3);
  ctx.quadraticCurveTo(0, -k * 0.26, -k * 0.21, -k * 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = shade(ware, 20);
  ctx.beginPath();
  ctx.ellipse(-k * 0.09, -k * 0.3, k * 0.045, k * 0.09, 0.15, 0, Math.PI * 2);
  ctx.fill();
  // Loop handle.
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = Math.max(2, k * 0.05);
  ctx.beginPath();
  ctx.arc(k * 0.15, -k * 0.375, k * 0.065, -Math.PI * 0.7, Math.PI * 0.45);
  ctx.stroke();
  ctx.strokeStyle = shade(ware, 6);
  ctx.lineWidth = Math.max(1.2, k * 0.028);
  ctx.beginPath();
  ctx.arc(k * 0.15, -k * 0.375, k * 0.065, -Math.PI * 0.7, Math.PI * 0.45);
  ctx.stroke();
}

/** The milk pail: banded wood, handle up, cream at the brim. */
function drawPailGround(g: GroundDropEnv): void {
  const { ctx, k } = g;
  const wood = '#a3805a';
  const lw = Math.max(1.3, k * 0.036);
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = lw;
  // Staved body, wider at the top.
  ctx.fillStyle = wood;
  ctx.beginPath();
  ctx.moveTo(-k * 0.17, -k * 0.31);
  ctx.lineTo(k * 0.17, -k * 0.31);
  ctx.lineTo(k * 0.13, -k * 0.01);
  ctx.quadraticCurveTo(0, k * 0.02, -k * 0.13, -k * 0.01);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Stave lines + iron bands.
  ctx.strokeStyle = shade(wood, -24);
  ctx.lineWidth = Math.max(1, k * 0.016);
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(i * k * 0.085, -k * 0.31);
    ctx.lineTo(i * k * 0.065, -k * 0.005);
    ctx.stroke();
  }
  ctx.fillStyle = '#6a7a8a';
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = Math.max(1.1, k * 0.024);
  ctx.beginPath();
  chamferRect(ctx, -k * 0.165, -k * 0.26, k * 0.33, k * 0.038, k * 0.008);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  chamferRect(ctx, -k * 0.14, -k * 0.09, k * 0.28, k * 0.036, k * 0.008);
  ctx.fill();
  ctx.stroke();
  // The milk at the brim.
  ctx.fillStyle = '#f4f0e4';
  ctx.beginPath();
  ctx.ellipse(0, -k * 0.31, k * 0.145, k * 0.05, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(-k * 0.04, -k * 0.32, k * 0.06, k * 0.02, -0.15, 0, Math.PI * 2);
  ctx.fill();
  // Bail handle laid to one side.
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = Math.max(1.8, k * 0.04);
  ctx.beginPath();
  ctx.arc(k * 0.03, -k * 0.3, k * 0.185, -Math.PI * 0.85, -Math.PI * 0.15);
  ctx.stroke();
  ctx.strokeStyle = '#8a9aa8';
  ctx.lineWidth = Math.max(1.1, k * 0.022);
  ctx.beginPath();
  ctx.arc(k * 0.03, -k * 0.3, k * 0.185, -Math.PI * 0.85, -Math.PI * 0.15);
  ctx.stroke();
}

/** The honey pot: fat glazed belly, wooden dipper, one amber drip. */
function drawHoneyPotGround(g: GroundDropEnv): void {
  const { ctx, k, eid, now } = g;
  const ware = '#c8a058';
  const honey = '#d9902d';
  const lw = Math.max(1.3, k * 0.036);
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = lw;
  // Pot.
  ctx.fillStyle = ware;
  ctx.beginPath();
  ctx.moveTo(-k * 0.08, -k * 0.33);
  ctx.quadraticCurveTo(-k * 0.21, -k * 0.29, -k * 0.185, -k * 0.12);
  ctx.quadraticCurveTo(-k * 0.165, 0, 0, 0);
  ctx.quadraticCurveTo(k * 0.165, 0, k * 0.185, -k * 0.12);
  ctx.quadraticCurveTo(k * 0.21, -k * 0.29, k * 0.08, -k * 0.33);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Mouth full of honey, one run down the belly.
  ctx.fillStyle = honey;
  ctx.beginPath();
  ctx.ellipse(0, -k * 0.33, k * 0.085, k * 0.035, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  const run = 0.5 + 0.5 * Math.sin(now / 2400 + eid);
  ctx.fillStyle = shade(honey, -8);
  ctx.beginPath();
  ctx.moveTo(k * 0.055, -k * 0.32);
  ctx.quadraticCurveTo(k * 0.085, -k * 0.26, k * 0.07, -k * (0.2 - run * 0.03));
  ctx.quadraticCurveTo(k * 0.06, -k * (0.16 - run * 0.03), k * 0.045, -k * (0.19 - run * 0.03));
  ctx.quadraticCurveTo(k * 0.045, -k * 0.27, k * 0.035, -k * 0.315);
  ctx.closePath();
  ctx.fill();
  // Belly light + glaze band.
  ctx.fillStyle = shade(ware, 22);
  ctx.beginPath();
  ctx.ellipse(-k * 0.085, -k * 0.22, k * 0.04, k * 0.07, 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = shade(ware, -18);
  ctx.lineWidth = Math.max(1, k * 0.016);
  ctx.beginPath();
  ctx.moveTo(-k * 0.175, -k * 0.1);
  ctx.quadraticCurveTo(0, -k * 0.06, k * 0.175, -k * 0.1);
  ctx.stroke();
  // The dipper leaning in the mouth.
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = Math.max(1.6, k * 0.036);
  ctx.beginPath();
  ctx.moveTo(k * 0.02, -k * 0.34);
  ctx.lineTo(k * 0.14, -k * 0.5);
  ctx.stroke();
  ctx.strokeStyle = '#8a6a45';
  ctx.lineWidth = Math.max(1.2, k * 0.024);
  ctx.beginPath();
  ctx.moveTo(k * 0.025, -k * 0.345);
  ctx.lineTo(k * 0.135, -k * 0.49);
  ctx.stroke();
  ctx.fillStyle = '#8a6a45';
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = Math.max(1.1, k * 0.022);
  ctx.beginPath();
  ctx.ellipse(k * 0.145, -k * 0.5, k * 0.035, k * 0.028, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = shade('#8a6a45', -26);
  ctx.lineWidth = Math.max(1, k * 0.012);
  ctx.beginPath();
  ctx.ellipse(k * 0.145, -k * 0.5, k * 0.018, k * 0.014, 0.4, 0, Math.PI * 2);
  ctx.stroke();
}

/** A preserving jar: glass, packed contents, cloth-topped lid. */
function drawJarGround(g: GroundDropEnv, def: ItemDef | undefined): void {
  const { ctx, k } = g;
  const contents = def?.color ?? '#a8b858';
  const glass = '#c8d4d8';
  const lw = Math.max(1.3, k * 0.034);
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = lw;
  // Jar body.
  ctx.fillStyle = glass;
  ctx.beginPath();
  chamferRect(ctx, -k * 0.14, -k * 0.34, k * 0.28, k * 0.34, [k * 0.03, k * 0.03, k * 0.05, k * 0.05]);
  ctx.fill();
  ctx.stroke();
  // The packed contents: stacked wavy layers.
  ctx.fillStyle = contents;
  ctx.beginPath();
  chamferRect(ctx, -k * 0.115, -k * 0.28, k * 0.23, k * 0.255, k * 0.03);
  ctx.fill();
  ctx.strokeStyle = shade(contents, -24);
  ctx.lineWidth = Math.max(1, k * 0.016);
  for (let i = 1; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(-k * 0.11, -k * 0.28 + i * k * 0.062);
    ctx.quadraticCurveTo(0, -k * 0.28 + i * k * 0.062 + k * 0.02, k * 0.11, -k * 0.28 + i * k * 0.062);
    ctx.stroke();
  }
  // Glass shine.
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  chamferRect(ctx, -k * 0.105, -k * 0.31, k * 0.045, k * 0.27, k * 0.02);
  ctx.fill();
  ctx.globalAlpha = 1;
  // Cloth-top lid tied with twine.
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = lw;
  ctx.fillStyle = '#e8e0cc';
  ctx.beginPath();
  ctx.moveTo(-k * 0.155, -k * 0.345);
  ctx.quadraticCurveTo(0, -k * 0.43, k * 0.155, -k * 0.345);
  ctx.lineTo(k * 0.13, -k * 0.3);
  ctx.quadraticCurveTo(0, -k * 0.365, -k * 0.13, -k * 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = '#c4a35a';
  ctx.lineWidth = Math.max(1.2, k * 0.024);
  ctx.beginPath();
  ctx.moveTo(-k * 0.14, -k * 0.315);
  ctx.quadraticCurveTo(0, -k * 0.27, k * 0.14, -k * 0.315);
  ctx.stroke();
}

/** A fried egg still in its little skillet. */
function drawSkilletGround(g: GroundDropEnv): void {
  const { ctx, k } = g;
  const iron = '#3f3b4a';
  const lw = Math.max(1.3, k * 0.034);
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = lw;
  // Pan.
  ctx.fillStyle = iron;
  ctx.beginPath();
  ctx.ellipse(0, -k * 0.07, k * 0.2, k * 0.085, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = shade(iron, -18);
  ctx.beginPath();
  ctx.ellipse(0, -k * 0.075, k * 0.165, k * 0.065, 0, 0, Math.PI * 2);
  ctx.fill();
  // Handle.
  ctx.fillStyle = iron;
  ctx.beginPath();
  chamferRect(ctx, k * 0.17, -k * 0.115, k * 0.19, k * 0.05, k * 0.02);
  ctx.fill();
  ctx.stroke();
  // The egg: white splashed loose, yolk domed.
  ctx.fillStyle = '#f4f0e4';
  ctx.beginPath();
  facetBlob(ctx, -k * 0.01, -k * 0.08, k * 0.115, 77777, 8, 0.72);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#e8a83d';
  ctx.beginPath();
  facetCircle(ctx, -k * 0.015, -k * 0.09, k * 0.05, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fff2cc';
  ctx.beginPath();
  facetCircle(ctx, -k * 0.03, -k * 0.105, k * 0.016, 4);
  ctx.fill();
  drawSteam(g, 0, -k * 0.14, 1);
}

/** Burnt food: a charred lump that still smokes its shame. */
function drawBurntGround(g: GroundDropEnv): void {
  const { ctx, k, eid, now } = g;
  const char = '#2e2a36';
  const lw = Math.max(1.3, k * 0.034);
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = lw;
  ctx.fillStyle = char;
  ctx.beginPath();
  facetBlob(ctx, 0, -k * 0.1, k * 0.17, (eid * 2654435761) >>> 0, 8, 0.75);
  ctx.fill();
  ctx.stroke();
  // Ash pale cracks.
  ctx.strokeStyle = '#6a6474';
  ctx.lineWidth = Math.max(1, k * 0.016);
  ctx.beginPath();
  ctx.moveTo(-k * 0.09, -k * 0.08);
  ctx.lineTo(-k * 0.01, -k * 0.13);
  ctx.lineTo(k * 0.06, -k * 0.07);
  ctx.stroke();
  ctx.fillStyle = shade(char, 16);
  ctx.beginPath();
  facetCircle(ctx, -k * 0.05, -k * 0.15, k * 0.045, 6);
  ctx.fill();
  // A thin smoke thread.
  const t = (now / 2000 + rnd(eid, 228)) % 1;
  ctx.globalAlpha = 0.35 * (1 - t);
  ctx.strokeStyle = '#8a8494';
  ctx.lineWidth = Math.max(1.2, k * 0.022);
  ctx.beginPath();
  ctx.moveTo(0, -k * 0.18);
  ctx.quadraticCurveTo(k * 0.04 * Math.sin(t * 7), -k * (0.24 + t * 0.12), -k * 0.01, -k * (0.3 + t * 0.16));
  ctx.stroke();
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- the apothecary

/**
 * The potion family: bottle silhouette by the brew's suffix, liquid in
 * the item's color, cork and neck twine, a caught window of light.
 */
function drawPotionGround(g: GroundDropEnv, def: ItemDef | undefined): void {
  const { ctx, k, itemId, qty, eid, now } = g;
  const liq = def?.color ?? '#b04a6a';
  const elixir = itemId.endsWith('_elixir');
  const stout = itemId.endsWith('_draught') || itemId.endsWith('_brew');
  const lw = Math.max(1.2, k * 0.03);
  const one = (ox: number, oy: number, scale: number): void => {
    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(scale, scale);
    ctx.strokeStyle = g.outline;
    ctx.lineWidth = lw / scale;
    const glass = '#c8d4d8';
    if (elixir) {
      // Teardrop flask.
      ctx.fillStyle = glass;
      ctx.beginPath();
      ctx.moveTo(0, -k * 0.42);
      ctx.quadraticCurveTo(k * 0.13, -k * 0.28, k * 0.125, -k * 0.13);
      ctx.quadraticCurveTo(k * 0.11, 0, 0, 0);
      ctx.quadraticCurveTo(-k * 0.11, 0, -k * 0.125, -k * 0.13);
      ctx.quadraticCurveTo(-k * 0.13, -k * 0.28, 0, -k * 0.42);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = liq;
      ctx.beginPath();
      ctx.moveTo(-k * 0.115, -k * 0.16);
      ctx.quadraticCurveTo(0, -k * 0.21, k * 0.115, -k * 0.16);
      ctx.quadraticCurveTo(k * 0.1, 0, 0, -k * 0.005);
      ctx.quadraticCurveTo(-k * 0.1, 0, -k * 0.115, -k * 0.16);
      ctx.closePath();
      ctx.fill();
    } else if (stout) {
      // Stout round-shouldered bottle.
      ctx.fillStyle = glass;
      ctx.beginPath();
      ctx.moveTo(-k * 0.05, -k * 0.44);
      ctx.lineTo(-k * 0.05, -k * 0.34);
      ctx.quadraticCurveTo(-k * 0.16, -k * 0.3, -k * 0.15, -k * 0.14);
      ctx.quadraticCurveTo(-k * 0.14, 0, 0, 0);
      ctx.quadraticCurveTo(k * 0.14, 0, k * 0.15, -k * 0.14);
      ctx.quadraticCurveTo(k * 0.16, -k * 0.3, k * 0.05, -k * 0.34);
      ctx.lineTo(k * 0.05, -k * 0.44);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = liq;
      ctx.beginPath();
      ctx.moveTo(-k * 0.143, -k * 0.2);
      ctx.quadraticCurveTo(0, -k * 0.25, k * 0.143, -k * 0.2);
      ctx.quadraticCurveTo(k * 0.14, 0, 0, -k * 0.005);
      ctx.quadraticCurveTo(-k * 0.14, 0, -k * 0.143, -k * 0.2);
      ctx.closePath();
      ctx.fill();
    } else {
      // Slim tonic vial.
      ctx.fillStyle = glass;
      ctx.beginPath();
      ctx.moveTo(-k * 0.045, -k * 0.46);
      ctx.lineTo(-k * 0.045, -k * 0.35);
      ctx.quadraticCurveTo(-k * 0.095, -k * 0.32, -k * 0.09, -k * 0.12);
      ctx.quadraticCurveTo(-k * 0.088, 0, 0, 0);
      ctx.quadraticCurveTo(k * 0.088, 0, k * 0.09, -k * 0.12);
      ctx.quadraticCurveTo(k * 0.095, -k * 0.32, k * 0.045, -k * 0.35);
      ctx.lineTo(k * 0.045, -k * 0.46);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = liq;
      ctx.beginPath();
      ctx.moveTo(-k * 0.088, -k * 0.2);
      ctx.quadraticCurveTo(0, -k * 0.23, k * 0.088, -k * 0.2);
      ctx.quadraticCurveTo(k * 0.086, 0, 0, -k * 0.004);
      ctx.quadraticCurveTo(-k * 0.086, 0, -k * 0.088, -k * 0.2);
      ctx.closePath();
      ctx.fill();
    }
    // Meniscus light on the liquid.
    ctx.fillStyle = shade(liq, 28);
    ctx.beginPath();
    ctx.ellipse(0, -k * (elixir ? 0.175 : 0.21), k * (stout ? 0.1 : 0.065), k * 0.02, 0, 0, Math.PI * 2);
    ctx.fill();
    // Cork + twine.
    ctx.fillStyle = '#c8a058';
    ctx.strokeStyle = g.outline;
    ctx.lineWidth = Math.max(1, k * 0.022) / scale;
    ctx.beginPath();
    chamferRect(ctx, -k * 0.05, -k * 0.5, k * 0.1, k * 0.06, k * 0.014);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#8a6a45';
    ctx.lineWidth = Math.max(1, k * 0.014) / scale;
    ctx.beginPath();
    ctx.moveTo(-k * 0.048, -k * 0.44);
    ctx.lineTo(k * 0.048, -k * 0.44);
    ctx.stroke();
    // Glass window light.
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(-k * (stout ? 0.08 : 0.05), -k * 0.17, k * 0.022, k * 0.08, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
  };
  const n = Math.min(3, qty);
  if (n === 3) {
    one(-k * 0.17, 0, 0.82);
    one(k * 0.18, -k * 0.01, 0.86);
    one(0, -k * 0.02, 1);
  } else if (n === 2) {
    one(k * 0.15, -k * 0.005, 0.85);
    one(-k * 0.08, -k * 0.015, 1);
  } else {
    one(0, 0, 1);
  }
  // An elixir hums with its own light.
  if (elixir) {
    const p = 0.5 + 0.5 * Math.sin(now / 560 + eid);
    ctx.globalAlpha = 0.3 + 0.25 * p;
    ctx.fillStyle = shade(liq, 46);
    ctx.beginPath();
    facetCircle(ctx, 0, -k * 0.14, k * 0.055, 6);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

/** An oil or venom vial: slim amber glass, waxed seal, drip etch. */
function drawOilVialGround(g: GroundDropEnv, def: ItemDef | undefined): void {
  const { ctx, k, itemId } = g;
  const liq = def?.color ?? '#c8a038';
  const menace = def?.coating !== undefined || itemId === 'vipers_kiss';
  const lw = Math.max(1.2, k * 0.028);
  ctx.save();
  ctx.rotate(0.12);
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = lw;
  // Square-shouldered vial.
  ctx.fillStyle = '#c8bfa8';
  ctx.beginPath();
  chamferRect(ctx, -k * 0.085, -k * 0.34, k * 0.17, k * 0.34, [k * 0.02, k * 0.02, k * 0.035, k * 0.035]);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = liq;
  ctx.beginPath();
  chamferRect(ctx, -k * 0.062, -k * 0.24, k * 0.124, k * 0.215, k * 0.026);
  ctx.fill();
  ctx.fillStyle = shade(liq, 26);
  ctx.beginPath();
  ctx.ellipse(0, -k * 0.235, k * 0.055, k * 0.016, 0, 0, Math.PI * 2);
  ctx.fill();
  // Neck + wax cap dripping down one shoulder.
  ctx.fillStyle = '#c8bfa8';
  ctx.beginPath();
  chamferRect(ctx, -k * 0.038, -k * 0.42, k * 0.076, k * 0.09, k * 0.01);
  ctx.fill();
  ctx.stroke();
  const wax = menace ? '#7a2e3a' : '#a83232';
  ctx.fillStyle = wax;
  ctx.beginPath();
  ctx.moveTo(-k * 0.055, -k * 0.43);
  ctx.quadraticCurveTo(0, -k * 0.475, k * 0.055, -k * 0.43);
  ctx.lineTo(k * 0.048, -k * 0.375);
  ctx.quadraticCurveTo(k * 0.02, -k * 0.36, k * 0.012, -k * 0.395);
  ctx.lineTo(-k * 0.048, -k * 0.39);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // The poisoner's thorn etch on the glass.
  if (menace) {
    ctx.strokeStyle = shade(liq, -38);
    ctx.lineWidth = Math.max(1, k * 0.016);
    ctx.beginPath();
    ctx.moveTo(-k * 0.03, -k * 0.06);
    ctx.quadraticCurveTo(0, -k * 0.14, -k * 0.01, -k * 0.2);
    ctx.moveTo(-k * 0.028, -k * 0.115);
    ctx.lineTo(k * 0.015, -k * 0.15);
    ctx.moveTo(-k * 0.02, -k * 0.165);
    ctx.lineTo(-k * 0.045, -k * 0.19);
    ctx.stroke();
  }
  // Glass shine.
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  chamferRect(ctx, -k * 0.062, -k * 0.3, k * 0.026, k * 0.24, k * 0.012);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}

/** A salve pot: squat tin, lid ajar showing the balm. */
function drawSalvePotGround(g: GroundDropEnv, def: ItemDef | undefined): void {
  const { ctx, k } = g;
  const balm = def?.color ?? '#8aa858';
  const tin = '#a8aeb8';
  const lw = Math.max(1.2, k * 0.03);
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = lw;
  // Pot body.
  ctx.fillStyle = tin;
  ctx.beginPath();
  chamferRect(ctx, -k * 0.15, -k * 0.17, k * 0.3, k * 0.17, [k * 0.02, k * 0.02, k * 0.04, k * 0.04]);
  ctx.fill();
  ctx.stroke();
  // The balm at the mouth.
  ctx.fillStyle = balm;
  ctx.beginPath();
  ctx.ellipse(0, -k * 0.17, k * 0.125, k * 0.045, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = shade(balm, 24);
  ctx.beginPath();
  ctx.ellipse(-k * 0.035, -k * 0.18, k * 0.05, k * 0.018, -0.15, 0, Math.PI * 2);
  ctx.fill();
  // Lid leaning against the pot.
  ctx.fillStyle = shade(tin, -10);
  ctx.beginPath();
  ctx.ellipse(k * 0.2, -k * 0.07, k * 0.045, k * 0.105, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = shade(tin, 14);
  ctx.beginPath();
  ctx.ellipse(k * 0.195, -k * 0.075, k * 0.022, k * 0.06, -0.5, 0, Math.PI * 2);
  ctx.fill();
  // Tin knurl + light.
  ctx.strokeStyle = shade(tin, -22);
  ctx.lineWidth = Math.max(1, k * 0.014);
  ctx.beginPath();
  ctx.moveTo(-k * 0.14, -k * 0.13);
  ctx.lineTo(k * 0.14, -k * 0.13);
  ctx.stroke();
  ctx.fillStyle = shade(tin, 20);
  ctx.beginPath();
  chamferRect(ctx, -k * 0.12, -k * 0.115, k * 0.05, k * 0.08, k * 0.014);
  ctx.fill();
}

// ---------------------------------------------------------------- the armory

/**
 * Per-class art envelope [x0, x1, -y, +y] in units of s, matching the
 * rig's held envelopes (bows run their length in local y).
 */
const WEAPON_ENV: Record<string, readonly [number, number, number, number]> = {
  great: [-1.35, 1.35, -0.5, 0.5],
  blade: [-0.55, 1.25, -0.35, 0.35],
  pole: [-1.25, 1.65, -0.4, 0.4],
  bow: [-0.55, 0.75, -0.9, 0.9],
  staff: [-1.15, 1.55, -0.4, 0.4],
  tool: [-0.75, 1.05, -0.4, 0.4],
};

/**
 * A weapon or tool lying on the ground at its true held scale, painted
 * by the same style painter that dresses the fist. The lay: ground
 * squash outside a per-drop diagonal, the art's visual center pulled
 * to the drop point, the full ring struck live.
 */
function drawWeaponGround(g: GroundDropEnv, def: ItemDef | undefined, isTool: boolean): void {
  const { ctx, k, eid, itemId, now } = g;
  const s = k;
  const color = def?.color ?? '#b0b4bc';
  const kind = isTool ? 'tool' : wieldClass(itemId);
  const env = WEAPON_ENV[kind === 'none' ? 'blade' : kind] ?? WEAPON_ENV.blade!;

  // The lay diagonal: a pleasing strewn angle, mirrored and jittered
  // per drop so a battlefield of blades never reads as a rack. A bow's
  // length runs local ±y — turn the stave a quarter more so it lies
  // ALONG the diagonal like every other long arm, not across it.
  const side = rnd(eid, 51) > 0.5 ? 1 : -1;
  const lay =
    side * (0.5 + (rnd(eid, 52) - 0.5) * 0.35) + (kind === 'bow' ? Math.PI / 2 : 0);

  let paint: (c: CanvasRenderingContext2D) => void;
  let cxOff = 0;
  let cyOff = 0;
  if (kind === 'great') {
    const st = greatStyle(itemId, color)!;
    paint = (c) => drawGreatweapon(c, st, s, now, false, 0.42);
    cxOff = 0.12 * s;
  } else if (kind === 'pole') {
    const st = poleStyle(itemId, color)!;
    paint = (c) => drawPole(c, st, s, now, false, 0.5);
    cxOff = 0.12 * s;
  } else if (kind === 'bow') {
    const st = bowStyle(itemId, color)!;
    paint = (c) => drawBow(c, st, s, now, false, 0, undefined);
    cxOff = 0.18 * s;
  } else if (kind === 'staff') {
    const st = staffStyle(itemId, color)!;
    paint = (c) => drawStaff(c, st, s, now, false, 0.5, 0);
    cxOff = 0.12 * s;
  } else if (isTool || (toolStyle(itemId, color) && kind === 'none')) {
    const st = toolStyle(itemId, color)!;
    paint = (c) => drawTool(c, st, s, now, false);
    cxOff = 0.15 * s;
  } else {
    const st = bladeStyle(itemId, color)!;
    paint = (c) => drawSword(c, st, s, now, false);
    cxOff = 0.35 * s;
  }

  ctx.save();
  // Lift the art's center a touch so the mass sits on the drop point.
  ctx.translate(0, -0.1 * k);
  // The ground projection. A bow is exempted from the full squash —
  // its identity IS its curve, and the flat projection folds the
  // stave into a boomerang; it rests near-upright like the icon's
  // diagonal instead (a stave leaned where it fell).
  ctx.scale(1, kind === 'bow' ? 0.9 : GROUND_SQUASH);
  ctx.rotate(kind === 'bow' ? side * 0.35 + Math.PI / 2 : lay);
  ctx.translate(-cxOff, cyOff);
  paintOutlinedGround(ctx, g.outline, s, env, paint);
  ctx.restore();
}

// ---------------------------------------------------------------- the wardrobe

type ACls = 'cloth' | 'leather' | 'plate';

function armorClassOf(def: ItemDef | undefined): ACls {
  const c = def?.gear?.armorClass;
  return c === 'cloth' || c === 'plate' ? c : 'leather';
}

/**
 * THE SMITH'S BUNDLE — armor's deliberate generalization. A worn piece
 * has no honest lying pose, so each slot gets ONE readable form dressed
 * three ways by armor class: the plate dome / leather cap / cloth cowl,
 * the cuirass / laced jerkin / folded robe, and so on — always in the
 * piece's own colors, so a drop field of gear still reads set by set.
 */
function drawHelmGround(g: GroundDropEnv, def: ItemDef | undefined): void {
  const { ctx, k } = g;
  const col = def?.color ?? '#8a8ea0';
  const cls = armorClassOf(def);
  const lw = Math.max(1.5, k * 0.042);
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = lw;
  if (cls === 'cloth') {
    // A cowl standing in its own drape: peak, face shadow, pooled hem.
    ctx.fillStyle = shade(col, -18);
    ctx.beginPath();
    ctx.ellipse(0, -k * 0.03, k * 0.21, k * 0.075, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(-k * 0.155, -k * 0.05);
    ctx.quadraticCurveTo(-k * 0.19, -k * 0.3, -k * 0.02, -k * 0.395);
    ctx.quadraticCurveTo(k * 0.05, -k * 0.42, k * 0.065, -k * 0.34);
    ctx.quadraticCurveTo(k * 0.185, -k * 0.24, k * 0.155, -k * 0.045);
    ctx.quadraticCurveTo(0, -k * 0.115, -k * 0.155, -k * 0.05);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // The hood's mouth: a deep interior shadow.
    ctx.fillStyle = shade(col, -46);
    ctx.beginPath();
    ctx.moveTo(-k * 0.085, -k * 0.09);
    ctx.quadraticCurveTo(-k * 0.06, -k * 0.265, k * 0.02, -k * 0.29);
    ctx.quadraticCurveTo(k * 0.07, -k * 0.2, k * 0.075, -k * 0.095);
    ctx.quadraticCurveTo(0, -k * 0.15, -k * 0.085, -k * 0.09);
    ctx.closePath();
    ctx.fill();
    // Peak light.
    ctx.fillStyle = shade(col, 22);
    ctx.beginPath();
    ctx.moveTo(-k * 0.1, -k * 0.24);
    ctx.quadraticCurveTo(-k * 0.06, -k * 0.35, k * 0.0, -k * 0.375);
    ctx.quadraticCurveTo(-k * 0.03, -k * 0.3, -k * 0.055, -k * 0.22);
    ctx.closePath();
    ctx.fill();
    return;
  }
  // Cap and casque share the dome; the class dresses it.
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(-k * 0.185, -k * 0.1);
  ctx.quadraticCurveTo(-k * 0.2, -k * 0.36, 0, -k * 0.385);
  ctx.quadraticCurveTo(k * 0.2, -k * 0.36, k * 0.185, -k * 0.1);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Brim band seats the dome on the ground.
  ctx.fillStyle = shade(col, -24);
  ctx.beginPath();
  chamferRect(ctx, -k * 0.205, -k * 0.115, k * 0.41, k * 0.085, k * 0.028);
  ctx.fill();
  ctx.stroke();
  if (cls === 'plate') {
    // Eye slit + nasal bar: unmistakably a fighting helm.
    ctx.fillStyle = shade(col, -52);
    ctx.beginPath();
    chamferRect(ctx, -k * 0.125, -k * 0.21, k * 0.1, k * 0.05, k * 0.016);
    ctx.fill();
    ctx.beginPath();
    chamferRect(ctx, k * 0.03, -k * 0.21, k * 0.1, k * 0.05, k * 0.016);
    ctx.fill();
    ctx.fillStyle = shade(col, 8);
    ctx.beginPath();
    chamferRect(ctx, -k * 0.026, -k * 0.24, k * 0.052, k * 0.13, k * 0.014);
    ctx.fill();
    ctx.stroke();
    // Crown ridge light.
    ctx.fillStyle = shade(col, 30);
    ctx.beginPath();
    ctx.moveTo(-k * 0.13, -k * 0.27);
    ctx.quadraticCurveTo(-k * 0.07, -k * 0.35, -k * 0.015, -k * 0.36);
    ctx.lineTo(-k * 0.015, -k * 0.31);
    ctx.quadraticCurveTo(-k * 0.08, -k * 0.3, -k * 0.13, -k * 0.27);
    ctx.closePath();
    ctx.fill();
  } else {
    // Leather cap: stitch seam over the crown, side lace tails.
    ctx.strokeStyle = shade(col, -34);
    ctx.lineWidth = Math.max(1, k * 0.02);
    ctx.setLineDash([k * 0.024, k * 0.024]);
    ctx.beginPath();
    ctx.moveTo(-k * 0.14, -k * 0.16);
    ctx.quadraticCurveTo(0, -k * 0.33, k * 0.14, -k * 0.16);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = g.outline;
    ctx.lineWidth = lw;
    ctx.fillStyle = shade(col, 20);
    ctx.beginPath();
    ctx.moveTo(-k * 0.14, -k * 0.25);
    ctx.quadraticCurveTo(-k * 0.08, -k * 0.34, -k * 0.02, -k * 0.35);
    ctx.lineTo(-k * 0.02, -k * 0.305);
    ctx.quadraticCurveTo(-k * 0.09, -k * 0.29, -k * 0.14, -k * 0.25);
    ctx.closePath();
    ctx.fill();
  }
}

function drawBodyArmorGround(g: GroundDropEnv, def: ItemDef | undefined): void {
  const { ctx, k } = g;
  const col = def?.color ?? '#8a8ea0';
  const cls = armorClassOf(def);
  const lw = Math.max(1.5, k * 0.042);
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = lw;
  if (cls === 'cloth') {
    // A folded robe: three soft folds stacked, a sash cinched across.
    for (let i = 2; i >= 0; i--) {
      const w = k * (0.42 - i * 0.035);
      const y = -k * (0.1 + (2 - i) * 0.095);
      ctx.fillStyle = i === 0 ? shade(col, 12) : shade(col, -6 - i * 8);
      ctx.beginPath();
      chamferRect(ctx, -w / 2, y - k * 0.1, w, k * 0.115, k * 0.04);
      ctx.fill();
      ctx.stroke();
    }
    ctx.fillStyle = shade(col, -30);
    ctx.beginPath();
    chamferRect(ctx, -k * 0.215, -k * 0.225, k * 0.43, k * 0.055, k * 0.02);
    ctx.fill();
    ctx.stroke();
    // Sash knot tail.
    ctx.fillStyle = shade(col, -30);
    ctx.beginPath();
    ctx.moveTo(k * 0.1, -k * 0.19);
    ctx.quadraticCurveTo(k * 0.17, -k * 0.12, k * 0.13, -k * 0.045);
    ctx.lineTo(k * 0.08, -k * 0.08);
    ctx.quadraticCurveTo(k * 0.12, -k * 0.14, k * 0.1, -k * 0.19);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    return;
  }
  // Cuirass / jerkin: a torso front resting upright against its own
  // rolled padding — chest swell, waist taper, neck hole in shadow.
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(-k * 0.21, -k * 0.09);
  ctx.lineTo(-k * 0.165, -k * 0.3);
  ctx.quadraticCurveTo(-k * 0.155, -k * 0.375, -k * 0.07, -k * 0.385);
  ctx.lineTo(k * 0.07, -k * 0.385);
  ctx.quadraticCurveTo(k * 0.155, -k * 0.375, k * 0.165, -k * 0.3);
  ctx.lineTo(k * 0.21, -k * 0.09);
  ctx.quadraticCurveTo(0, -k * 0.035, -k * 0.21, -k * 0.09);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Neck hole.
  ctx.fillStyle = shade(col, -50);
  ctx.beginPath();
  ctx.ellipse(0, -k * 0.365, k * 0.06, k * 0.032, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  if (cls === 'plate') {
    // Chest gleam + waist flange line: worked metal.
    ctx.fillStyle = shade(col, 32);
    ctx.beginPath();
    ctx.moveTo(-k * 0.125, -k * 0.315);
    ctx.quadraticCurveTo(-k * 0.05, -k * 0.35, -k * 0.02, -k * 0.345);
    ctx.lineTo(-k * 0.035, -k * 0.24);
    ctx.quadraticCurveTo(-k * 0.09, -k * 0.26, -k * 0.125, -k * 0.315);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = shade(col, -28);
    ctx.lineWidth = Math.max(1, k * 0.022);
    ctx.beginPath();
    ctx.moveTo(-k * 0.185, -k * 0.13);
    ctx.quadraticCurveTo(0, -k * 0.08, k * 0.185, -k * 0.13);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-k * 0.02, -k * 0.335);
    ctx.lineTo(-k * 0.005, -k * 0.09);
    ctx.stroke();
  } else {
    // Lace-up front: eyelet ladder + cross laces.
    ctx.strokeStyle = shade(col, -36);
    ctx.lineWidth = Math.max(1, k * 0.02);
    for (let i = 0; i < 3; i++) {
      const y = -k * (0.3 - i * 0.075);
      ctx.beginPath();
      ctx.moveTo(-k * 0.045, y);
      ctx.lineTo(k * 0.045, y - k * 0.03);
      ctx.moveTo(k * 0.045, y);
      ctx.lineTo(-k * 0.045, y - k * 0.03);
      ctx.stroke();
    }
    ctx.fillStyle = shade(col, 18);
    ctx.beginPath();
    ctx.moveTo(-k * 0.14, -k * 0.31);
    ctx.quadraticCurveTo(-k * 0.08, -k * 0.35, -k * 0.055, -k * 0.345);
    ctx.lineTo(-k * 0.065, -k * 0.25);
    ctx.quadraticCurveTo(-k * 0.11, -k * 0.27, -k * 0.14, -k * 0.31);
    ctx.closePath();
    ctx.fill();
  }
}

function drawLegArmorGround(g: GroundDropEnv, def: ItemDef | undefined): void {
  const { ctx, k } = g;
  const col = def?.color ?? '#8a8ea0';
  const cls = armorClassOf(def);
  const lw = Math.max(1.5, k * 0.042);
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = lw;
  // Folded legwear over a belt bar: two tapered legs hanging from the
  // fold, cuffs staggered so the pair reads at a glance.
  ctx.fillStyle = '#6b4a26';
  ctx.beginPath();
  chamferRect(ctx, -k * 0.2, -k * 0.36, k * 0.4, k * 0.055, k * 0.02);
  ctx.fill();
  ctx.stroke();
  for (const [off, dy] of [[-k * 0.09, 0], [k * 0.09, k * 0.03]] as const) {
    ctx.fillStyle = off < 0 ? col : shade(col, -12);
    ctx.beginPath();
    ctx.moveTo(off - k * 0.085, -k * 0.325);
    ctx.lineTo(off + k * 0.085, -k * 0.325);
    ctx.lineTo(off + k * 0.06, -k * 0.05 + dy);
    ctx.lineTo(off - k * 0.06, -k * 0.05 + dy);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    if (cls === 'plate') {
      // Knee cop: a bright chevron plate on each leg.
      ctx.fillStyle = shade(col, 26);
      ctx.beginPath();
      ctx.moveTo(off - k * 0.055, -k * 0.2 + dy);
      ctx.lineTo(off, -k * 0.24 + dy);
      ctx.lineTo(off + k * 0.055, -k * 0.2 + dy);
      ctx.lineTo(off, -k * 0.155 + dy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      // Cuff band; cloth adds a hem stripe, leather a stitch.
      ctx.fillStyle = shade(col, cls === 'cloth' ? 16 : -28);
      ctx.beginPath();
      chamferRect(ctx, off - k * 0.062, -k * 0.105 + dy, k * 0.124, k * 0.045, k * 0.012);
      ctx.fill();
      ctx.stroke();
    }
  }
  // Belt buckle glint.
  ctx.fillStyle = '#d9a441';
  ctx.beginPath();
  chamferRect(ctx, -k * 0.03, -k * 0.35, k * 0.06, k * 0.035, k * 0.01);
  ctx.fill();
  ctx.stroke();
}

function drawBootsGround(g: GroundDropEnv, def: ItemDef | undefined): void {
  const { ctx, k } = g;
  const col = def?.color ?? '#7a5a38';
  const cls = armorClassOf(def);
  const lw = Math.max(1.5, k * 0.042);
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = lw;
  // A standing pair, the far boot turned out — the world's most
  // readable "wearable for your feet" statement.
  for (const [off, flip, dk] of [[k * 0.1, -1, -14], [-k * 0.075, 1, 0]] as const) {
    ctx.save();
    ctx.translate(off, dk === 0 ? 0 : -k * 0.015);
    ctx.scale(flip, 1);
    ctx.fillStyle = shade(col, dk);
    ctx.beginPath();
    ctx.moveTo(-k * 0.065, -k * 0.32);
    ctx.lineTo(k * 0.055, -k * 0.32);
    ctx.lineTo(k * 0.05, -k * 0.1);
    ctx.lineTo(k * 0.15, -k * 0.055);
    ctx.quadraticCurveTo(k * 0.165, -k * 0.005, k * 0.12, 0);
    ctx.lineTo(-k * 0.055, 0);
    ctx.quadraticCurveTo(-k * 0.075, -k * 0.16, -k * 0.065, -k * 0.32);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Sole.
    ctx.fillStyle = shade(col, -44);
    ctx.beginPath();
    chamferRect(ctx, -k * 0.06, -k * 0.032, k * 0.19, k * 0.032, k * 0.012);
    ctx.fill();
    // Cuff: plate flares bright, leather rolls, cloth ties.
    ctx.fillStyle = cls === 'plate' ? shade(col, 30) : shade(col, dk - 22);
    ctx.beginPath();
    chamferRect(ctx, -k * 0.072, -k * 0.345, k * 0.135, k * 0.055, k * 0.016);
    ctx.fill();
    ctx.stroke();
    if (cls === 'plate') {
      // Shin ridge light.
      ctx.fillStyle = shade(col, 26);
      ctx.fillRect(-k * 0.03, -k * 0.28, k * 0.026, k * 0.18);
    }
    ctx.restore();
  }
}

function drawGlovesGround(g: GroundDropEnv, def: ItemDef | undefined): void {
  const { ctx, k } = g;
  const col = def?.color ?? '#8a6a45';
  const cls = armorClassOf(def);
  const lw = Math.max(1.5, k * 0.042);
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = lw;
  // Two gauntlets crossed at the wrist, palms down — drawn a third
  // larger than "true" so the pair holds its ground beside the boots
  // (bench verdict: at honest size they read as a crumpled patch).
  for (const [rot, dk] of [[0.5, -14], [-0.35, 0]] as const) {
    ctx.save();
    ctx.translate(dk === 0 ? -k * 0.02 : k * 0.03, -k * 0.1 + (dk === 0 ? 0 : -k * 0.02));
    ctx.scale(1.32, 1.32);
    ctx.rotate(rot);
    // Cuff flare.
    ctx.fillStyle = shade(col, dk - 20);
    ctx.beginPath();
    ctx.moveTo(-k * 0.155, -k * 0.075);
    ctx.lineTo(-k * 0.06, -k * 0.05);
    ctx.lineTo(-k * 0.06, k * 0.05);
    ctx.lineTo(-k * 0.155, k * 0.075);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Hand: mitt mass + thumb.
    ctx.fillStyle = shade(col, dk);
    ctx.beginPath();
    chamferRect(ctx, -k * 0.065, -k * 0.052, k * 0.155, k * 0.104, k * 0.032);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(k * 0.015, k * 0.062, k * 0.045, k * 0.028, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (cls === 'plate') {
      // Knuckle plates.
      ctx.fillStyle = shade(col, 26);
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(k * (0.005 + i * 0.028), -k * 0.04, k * 0.02, k * 0.08);
      }
    } else if (cls === 'leather') {
      ctx.strokeStyle = shade(col, -34);
      ctx.lineWidth = Math.max(1, k * 0.018);
      ctx.setLineDash([k * 0.02, k * 0.02]);
      ctx.beginPath();
      ctx.moveTo(-k * 0.05, 0);
      ctx.lineTo(k * 0.075, 0);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = g.outline;
      ctx.lineWidth = lw;
    }
    ctx.restore();
  }
}

function drawCapeGround(g: GroundDropEnv, def: ItemDef | undefined): void {
  const { ctx, k } = g;
  const col = def?.color ?? '#7a4a4a';
  const lw = Math.max(1.5, k * 0.042);
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = lw;
  // A rolled cloak lying at a soft diagonal: the roll, its spiral end,
  // a strap around the middle, the clasp brooch catching light.
  ctx.save();
  ctx.rotate(-0.18);
  ctx.fillStyle = col;
  ctx.beginPath();
  chamferRect(ctx, -k * 0.28, -k * 0.21, k * 0.56, k * 0.17, k * 0.065);
  ctx.fill();
  ctx.stroke();
  // Roll shading: top light, under-curve dark.
  ctx.fillStyle = shade(col, 20);
  ctx.beginPath();
  chamferRect(ctx, -k * 0.25, -k * 0.2, k * 0.5, k * 0.05, k * 0.024);
  ctx.fill();
  ctx.fillStyle = shade(col, -22);
  ctx.beginPath();
  chamferRect(ctx, -k * 0.25, -k * 0.085, k * 0.5, k * 0.042, k * 0.02);
  ctx.fill();
  // Spiral end face.
  ctx.fillStyle = shade(col, -10);
  ctx.beginPath();
  ctx.ellipse(k * 0.28, -k * 0.125, k * 0.045, k * 0.082, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = shade(col, -36);
  ctx.lineWidth = Math.max(1, k * 0.02);
  ctx.beginPath();
  ctx.ellipse(k * 0.28, -k * 0.125, k * 0.02, k * 0.04, 0, 0, Math.PI * 2);
  ctx.stroke();
  // Strap + brooch.
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = lw;
  ctx.fillStyle = '#6b4a26';
  ctx.beginPath();
  chamferRect(ctx, -k * 0.06, -k * 0.225, k * 0.075, k * 0.2, k * 0.014);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#d9a441';
  ctx.beginPath();
  facetCircle(ctx, -k * 0.022, -k * 0.24, k * 0.038, 6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fff2cc';
  ctx.beginPath();
  facetCircle(ctx, -k * 0.032, -k * 0.25, k * 0.013, 5);
  ctx.fill();
  ctx.restore();
}

function drawTrinketGround(g: GroundDropEnv, def: ItemDef | undefined): void {
  const { ctx, k, itemId } = g;
  const col = def?.color ?? '#b0a49a';
  const lw = Math.max(1.4, k * 0.038);
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = lw;
  // A talisman on its pooled cord: charm disc up, cord coiled beneath.
  ctx.strokeStyle = '#6b4a26';
  ctx.lineWidth = Math.max(1.2, k * 0.03);
  ctx.beginPath();
  ctx.ellipse(0, -k * 0.045, k * 0.155, k * 0.06, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(k * 0.02, -k * 0.06, k * 0.115, k * 0.045, 0.2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = lw;
  // The charm: a faceted amulet standing against the coil.
  ctx.fillStyle = col;
  ctx.beginPath();
  facetCircle(ctx, 0, -k * 0.175, k * 0.115, 6, -Math.PI / 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = shade(col, -28);
  ctx.beginPath();
  facetCircle(ctx, 0, -k * 0.175, k * 0.07, 6, -Math.PI / 2);
  ctx.fill();
  // Sigils burn a star heart; relics a bright eye.
  const sigil = def?.equipSlot === 'sigil' || itemId.startsWith('sigil_');
  ctx.fillStyle = shade(col, 44);
  if (sigil) {
    const r = k * 0.05;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 4;
      const rr = i % 2 === 0 ? r : r * 0.42;
      const vx = Math.cos(a) * rr;
      const vy = -k * 0.175 + Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(vx, vy);
      else ctx.lineTo(vx, vy);
    }
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.beginPath();
    facetCircle(ctx, 0, -k * 0.175, k * 0.032, 5);
    ctx.fill();
  }
  // Bail + gleam.
  ctx.fillStyle = '#d9a441';
  ctx.beginPath();
  facetCircle(ctx, 0, -k * 0.3, k * 0.026, 5);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fff2cc';
  ctx.beginPath();
  facetCircle(ctx, -k * 0.038, -k * 0.225, k * 0.014, 4);
  ctx.fill();
}

function drawTomeGround(g: GroundDropEnv, def: ItemDef | undefined): void {
  const { ctx, k } = g;
  const col = def?.color ?? '#8a5a3a';
  const lw = Math.max(1.5, k * 0.042);
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = lw;
  ctx.save();
  ctx.rotate(-0.12);
  // Page block first (it peeks past the cover on two sides).
  ctx.fillStyle = '#e8dcb8';
  ctx.beginPath();
  chamferRect(ctx, -k * 0.175, -k * 0.245, k * 0.35, k * 0.235, k * 0.014);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = shade('#e8dcb8', -26);
  ctx.lineWidth = Math.max(1, k * 0.014);
  for (let i = 1; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(-k * 0.17, -k * 0.245 + i * k * 0.052);
    ctx.lineTo(k * 0.17, -k * 0.245 + i * k * 0.052);
    ctx.stroke();
  }
  // Cover, offset up-left, spine ribs, corner caps, clasp.
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = lw;
  ctx.fillStyle = col;
  ctx.beginPath();
  chamferRect(ctx, -k * 0.195, -k * 0.31, k * 0.37, k * 0.25, k * 0.02);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = shade(col, -22);
  ctx.beginPath();
  chamferRect(ctx, -k * 0.195, -k * 0.31, k * 0.075, k * 0.25, [k * 0.02, 0, 0, k * 0.02]);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = shade(col, 18);
  ctx.beginPath();
  chamferRect(ctx, -k * 0.1, -k * 0.29, k * 0.245, k * 0.06, k * 0.02);
  ctx.fill();
  // Boss stud + clasp strap.
  ctx.fillStyle = '#d9a441';
  ctx.beginPath();
  facetCircle(ctx, k * 0.005, -k * 0.185, k * 0.04, 6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#6b4a26';
  ctx.beginPath();
  chamferRect(ctx, k * 0.13, -k * 0.225, k * 0.085, k * 0.055, k * 0.014);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawOrbGround(g: GroundDropEnv, def: ItemDef | undefined): void {
  const { ctx, k, eid, now } = g;
  const col = def?.color ?? '#8f9ed6';
  const lw = Math.max(1.5, k * 0.042);
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = lw;
  // A seer's orb resting in a bronze cradle ring.
  ctx.fillStyle = '#8a6234';
  ctx.beginPath();
  ctx.ellipse(0, -k * 0.055, k * 0.135, k * 0.05, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = col;
  ctx.beginPath();
  facetCircle(ctx, 0, -k * 0.2, k * 0.155, 10, -Math.PI / 2 + 0.3);
  ctx.fill();
  ctx.stroke();
  // Inner swirl: two crescent sweeps of deeper and brighter glass.
  ctx.fillStyle = shade(col, -26);
  ctx.beginPath();
  ctx.ellipse(k * 0.03, -k * 0.165, k * 0.09, k * 0.055, 0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = shade(col, 30);
  ctx.beginPath();
  ctx.ellipse(-k * 0.045, -k * 0.245, k * 0.062, k * 0.038, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  facetCircle(ctx, -k * 0.065, -k * 0.27, k * 0.02, 5);
  ctx.fill();
  // A slow inner pulse — the orb is awake even on the ground.
  const pulse = 0.5 + 0.5 * Math.sin(now / 640 + eid);
  ctx.globalAlpha = 0.25 + 0.2 * pulse;
  ctx.fillStyle = shade(col, 46);
  ctx.beginPath();
  facetCircle(ctx, 0, -k * 0.2, k * (0.07 + 0.02 * pulse), 8);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawQuiverGround(g: GroundDropEnv, def: ItemDef | undefined): void {
  const { ctx, k } = g;
  const col = def?.color ?? '#8a6a45';
  const lw = Math.max(1.5, k * 0.042);
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = lw;
  ctx.save();
  ctx.rotate(0.3);
  // Arrows first — they live behind the tube's mouth.
  for (let i = -1; i <= 1; i++) {
    ctx.save();
    ctx.translate(i * k * 0.05, -k * 0.36);
    ctx.rotate(i * 0.16);
    ctx.strokeStyle = '#8a6a45';
    ctx.lineWidth = Math.max(1.4, k * 0.026);
    ctx.beginPath();
    ctx.moveTo(0, k * 0.1);
    ctx.lineTo(0, -k * 0.16);
    ctx.stroke();
    ctx.fillStyle = i === 0 ? shade(col, 26) : '#c4c8d2';
    ctx.strokeStyle = g.outline;
    ctx.lineWidth = Math.max(1, k * 0.018);
    ctx.beginPath();
    ctx.moveTo(0, -k * 0.22);
    ctx.lineTo(k * 0.034, -k * 0.13);
    ctx.lineTo(0, -k * 0.155);
    ctx.lineTo(-k * 0.034, -k * 0.13);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  // The tube: tapered leather, mouth ring, belly strap.
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = lw;
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(-k * 0.105, -k * 0.33);
  ctx.lineTo(k * 0.105, -k * 0.33);
  ctx.lineTo(k * 0.07, k * 0.02);
  ctx.quadraticCurveTo(0, k * 0.05, -k * 0.07, k * 0.02);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = shade(col, -24);
  ctx.beginPath();
  ctx.ellipse(0, -k * 0.33, k * 0.105, k * 0.038, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = shade(col, 18);
  ctx.beginPath();
  chamferRect(ctx, -k * 0.095, -k * 0.29, k * 0.055, k * 0.2, k * 0.02);
  ctx.fill();
  ctx.fillStyle = shade(col, -30);
  ctx.beginPath();
  chamferRect(ctx, -k * 0.096, -k * 0.16, k * 0.19, k * 0.05, k * 0.016);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/** Loose ammo: a tied sheaf of arrows lying on the ground. */
function drawArrowsGround(g: GroundDropEnv, def: ItemDef | undefined): void {
  const { ctx, k, eid, qty } = g;
  const col = def?.color ?? '#c8ccd6';
  const lw = Math.max(1, k * 0.02);
  const n = qty >= 20 ? 5 : qty >= 5 ? 4 : 3;
  ctx.save();
  ctx.scale(1, GROUND_SQUASH);
  ctx.rotate(-0.55 + (rnd(eid, 57) - 0.5) * 0.2);
  for (let i = 0; i < n; i++) {
    const y = (i - (n - 1) / 2) * k * 0.052;
    const x = (rnd(eid, 60 + i) - 0.5) * k * 0.06;
    // Shaft.
    ctx.strokeStyle = '#8a6a45';
    ctx.lineWidth = Math.max(1.4, k * 0.028);
    ctx.beginPath();
    ctx.moveTo(x - k * 0.3, y);
    ctx.lineTo(x + k * 0.26, y);
    ctx.stroke();
    // Head.
    ctx.fillStyle = '#c4c8d2';
    ctx.strokeStyle = g.outline;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(x + k * 0.34, y);
    ctx.lineTo(x + k * 0.25, y - k * 0.028);
    ctx.lineTo(x + k * 0.25, y + k * 0.028);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Fletching.
    ctx.fillStyle = i % 2 ? col : shade(col, 14);
    ctx.beginPath();
    ctx.moveTo(x - k * 0.31, y);
    ctx.lineTo(x - k * 0.22, y - k * 0.038);
    ctx.lineTo(x - k * 0.185, y);
    ctx.lineTo(x - k * 0.22, y + k * 0.038);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  // Tie band around the bundle's waist.
  ctx.fillStyle = '#c4a35a';
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = lw;
  ctx.beginPath();
  chamferRect(ctx, -k * 0.045, -(n * k * 0.052) / 2 - k * 0.02, k * 0.09, n * k * 0.052 + k * 0.04, k * 0.014);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/** A shield lying face-up on the ground, catching the sky. */
function drawShieldGround(g: GroundDropEnv, def: ItemDef | undefined): void {
  const { ctx, k, eid, itemId, now } = g;
  const st = offhandStyle(itemId);
  const kind = st.kind === 'kite' || st.kind === 'tower' ? st.kind : 'buckler';
  const style = shieldStyle(itemId, kind, st.color, st.trim, (st as { boss?: string }).boss);
  const size = (kind === 'tower' ? 0.52 : kind === 'kite' ? 0.44 : 0.34) * k;
  ctx.save();
  ctx.translate(0, -0.12 * k);
  ctx.scale(1, GROUND_SQUASH);
  ctx.rotate((rnd(eid, 53) - 0.5) * 0.5);
  paintOutlinedGround(
    ctx,
    g.outline,
    size,
    [-1.1, 1.1, -1.25, 1.25],
    (c) => drawShieldAt(c, style, { cx: 0, cy: 0, size, theta: 0, tilt: 0, nowMs: now }),
  );
  ctx.restore();
}

// ---------------------------------------------------------------- the satchel

/**
 * The last-resort generalization: the cinched leather satchel with a
 * stitched patch dyed in the goods' color. Anything the taxonomy can't
 * show honestly still drops as a handsome parcel — and the audit test
 * keeps this club small on purpose.
 */
function drawSatchelGround(g: GroundDropEnv, def: ItemDef | undefined): void {
  const { ctx, k } = g;
  const col = def?.color ?? '#b0a49a';
  const lw = Math.max(1.5, k * 0.042);
  const bw = k * 0.34;
  const leather = '#8f6c46';
  ctx.fillStyle = leather;
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = lw;
  ctx.beginPath();
  chamferRect(ctx, -bw / 2, -k * 0.31, bw, k * 0.31, k * 0.07);
  ctx.fill();
  ctx.stroke();
  // Gathered mouth above the tie.
  ctx.fillStyle = shade(leather, -8);
  ctx.beginPath();
  chamferRect(ctx, -k * 0.1, -k * 0.415, k * 0.2, k * 0.1, k * 0.035);
  ctx.fill();
  ctx.stroke();
  // Rope cinch + knot.
  ctx.fillStyle = '#c4a35a';
  ctx.beginPath();
  chamferRect(ctx, -k * 0.115, -k * 0.345, k * 0.23, k * 0.05, k * 0.02);
  ctx.fill();
  ctx.stroke();
  // Base weight band + top-left light facet.
  ctx.fillStyle = shade(leather, -22);
  ctx.beginPath();
  chamferRect(ctx, -bw / 2 + k * 0.025, -k * 0.085, bw - k * 0.05, k * 0.06, k * 0.02);
  ctx.fill();
  ctx.fillStyle = shade(leather, 20);
  ctx.beginPath();
  chamferRect(ctx, -bw / 2 + k * 0.035, -k * 0.28, k * 0.1, k * 0.055, k * 0.02);
  ctx.fill();
  // The stitched patch dyed in the goods' color.
  ctx.fillStyle = col;
  ctx.strokeStyle = g.outline;
  ctx.lineWidth = Math.max(1, k * 0.022);
  ctx.beginPath();
  chamferRect(ctx, -k * 0.065, -k * 0.225, k * 0.13, k * 0.115, k * 0.025);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = shade(col, -34);
  ctx.setLineDash([k * 0.022, k * 0.022]);
  ctx.beginPath();
  chamferRect(ctx, -k * 0.048, -k * 0.208, k * 0.096, k * 0.08, k * 0.018);
  ctx.stroke();
  ctx.setLineDash([]);
}

// ---------------------------------------------------------------- rarity's voice

/**
 * THE ROLL SPEAKS FROM THE DIRT: a rare drop must read as rare before
 * its label does. Tiers stack their statements — rare+ orbits motes in
 * the tier color, epic+ adds rising shimmer, legendary breathes a soft
 * light shaft behind the item. (Uncommon speaks through the ground
 * glow the renderer queues from groundGlowFor.)
 */
function drawRarityShaft(g: GroundDropEnv): void {
  const { ctx, k, eid, now, roll } = g;
  if (!roll || rarityIndex(roll.rar) < 4) return;
  const col = RARITY_COLORS[roll.rar];
  if (!col) return;
  const p = 0.5 + 0.5 * Math.sin(now / 900 + eid * 0.7);
  const grad = ctx.createLinearGradient(0, 0, 0, -k * 1.05);
  const c = parseInt(col.slice(1), 16);
  const rgb = `${(c >> 16) & 255}, ${(c >> 8) & 255}, ${c & 255}`;
  grad.addColorStop(0, `rgba(${rgb}, ${0.22 + 0.1 * p})`);
  grad.addColorStop(1, `rgba(${rgb}, 0)`);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(-k * 0.16, 0);
  ctx.lineTo(-k * 0.09, -k * 1.05);
  ctx.lineTo(k * 0.09, -k * 1.05);
  ctx.lineTo(k * 0.16, 0);
  ctx.closePath();
  ctx.fill();
}

function drawRarityMotes(g: GroundDropEnv): void {
  const { ctx, k, eid, now, roll } = g;
  if (!roll) return;
  const tier = rarityIndex(roll.rar);
  if (tier < 2) return;
  const col = RARITY_COLORS[roll.rar];
  if (!col) return;
  // Orbiting motes: little cut diamonds riding a ground ellipse —
  // sized to read at street scale, not just on the bench sheet.
  const n = tier >= 4 ? 4 : tier >= 3 ? 3 : 2;
  for (let i = 0; i < n; i++) {
    const a = now / 1400 + eid + (i / n) * Math.PI * 2;
    const mx = Math.cos(a) * k * 0.34;
    const my = -k * 0.08 + Math.sin(a) * k * 0.13;
    const behind = Math.sin(a) < 0;
    ctx.globalAlpha = behind ? 0.55 : 0.95;
    ctx.fillStyle = col;
    const r = k * 0.038;
    ctx.beginPath();
    ctx.moveTo(mx, my - r);
    ctx.lineTo(mx + r * 0.6, my);
    ctx.lineTo(mx, my + r);
    ctx.lineTo(mx - r * 0.6, my);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Epic+: shimmer sparks rising off the item itself.
  if (tier >= 3) {
    for (let i = 0; i < 2; i++) {
      const t = (now / 1600 + rnd(eid, 230 + i)) % 1;
      const a = 1 - t;
      ctx.globalAlpha = 0.7 * a;
      ctx.fillStyle = shade(col, 30);
      const sx = (rnd(eid, 234 + i) - 0.5) * k * 0.3;
      const sy = -k * 0.15 - t * k * 0.35;
      const r = k * 0.02 * (0.5 + a * 0.5);
      ctx.beginPath();
      ctx.moveTo(sx, sy - r);
      ctx.lineTo(sx + r * 0.5, sy);
      ctx.lineTo(sx, sy + r);
      ctx.lineTo(sx - r * 0.5, sy);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

/** Graded produce announces its grade: one gleam for Fine, two + a warm rim for Prime. */
function drawGradeGleam(g: GroundDropEnv): void {
  const { ctx, k, itemId, now, eid } = g;
  const { base, grade } = gradeOf(itemId);
  if (!grade || !GRADED_PRODUCE.has(base)) return;
  const tw = Math.sin(now / 340 + eid * 1.9);
  if (tw <= 0.35) return;
  const a = (tw - 0.35) / 0.65;
  ctx.fillStyle = `rgba(255, 246, 214, ${0.9 * a})`;
  const star = (sx: number, sy: number, r: number): void => {
    ctx.beginPath();
    ctx.moveTo(sx, sy - r);
    ctx.lineTo(sx + r * 0.38, sy);
    ctx.lineTo(sx, sy + r);
    ctx.lineTo(sx - r * 0.38, sy);
    ctx.closePath();
    ctx.fill();
  };
  star(-k * 0.09, -k * 0.24, k * 0.05 * a);
  if (grade >= 2) star(k * 0.11, -k * 0.15, k * 0.038 * a);
}

// ---------------------------------------------------------------- the dispatch

/**
 * Paint one drop's matter inside the drop-local frame (origin at the
 * ground point, +y down, `k` px per tile). The caller owns landing
 * pop/bob (applied to the frame), contact shadow, hover ring, glow
 * queueing and the loot label.
 */
export function drawGroundDrop(g: GroundDropEnv): void {
  const def = itemDef(g.itemId);
  const form = groundForm(g.itemId);

  // The legendary shaft rises behind the matter.
  drawRarityShaft(g);

  switch (form) {
    case 'coins': drawCoinsGround(g); break;
    case 'ore': drawOreGround(g, def); break;
    case 'egg': drawEggGround(g); break;
    case 'weapon': drawWeaponGround(g, def, false); break;
    case 'tool': drawWeaponGround(g, def, true); break;
    case 'shield': drawShieldGround(g, def); break;
    case 'tome': drawTomeGround(g, def); break;
    case 'orb': drawOrbGround(g, def); break;
    case 'quiver': drawQuiverGround(g, def); break;
    case 'arrows': drawArrowsGround(g, def); break;
    case 'helm': drawHelmGround(g, def); break;
    case 'bodyarmor': drawBodyArmorGround(g, def); break;
    case 'legarmor': drawLegArmorGround(g, def); break;
    case 'boots': drawBootsGround(g, def); break;
    case 'gloves': drawGlovesGround(g, def); break;
    case 'cape': drawCapeGround(g, def); break;
    case 'trinket': drawTrinketGround(g, def); break;
    case 'log': drawLogGround(g, def); break;
    case 'board': drawBoardGround(g, def); break;
    case 'bar': drawBarGround(g, def); break;
    case 'hide': drawHideGround(g, def); break;
    case 'clothbolt': drawClothBoltGround(g, def); break;
    case 'wool': drawWoolGround(g); break;
    case 'cotton': drawCottonGround(g); break;
    case 'spool': drawSpoolGround(g, def); break;
    case 'sheaf': drawSheafGround(g, def); break;
    case 'gem': drawGemGround(g, def); break;
    case 'pearl': drawPearlGround(g, def); break;
    case 'dust': drawDustGround(g, def); break;
    case 'slag': drawSlagGround(g, def); break;
    case 'scroll': drawScrollGround(g, def); break;
    case 'paper': drawPaperGround(g, def); break;
    case 'key': drawKeyGround(g, def); break;
    case 'ring': drawRingGround(g, def); break;
    case 'bone': drawBoneGround(g); break;
    case 'fang': drawFangGround(g, def); break;
    case 'shellplate': drawShellPlateGround(g, def); break;
    case 'feather': drawFeatherGround(g, def); break;
    case 'sac': drawSacGround(g, def); break;
    case 'truffle': drawTruffleGround(g); break;
    case 'seedpouch': drawSeedPouchGround(g, def); break;
    case 'sapling': drawSaplingGround(g, def); break;
    case 'twigbundle': drawTwigBundleGround(g, def); break;
    case 'acorn': drawAcornGround(g); break;
    case 'pinecone': drawPineconeGround(g); break;
    case 'resin': drawResinGround(g); break;
    case 'waxcake': drawWaxCakeGround(g); break;
    case 'sack': drawSackGround(g, def); break;
    case 'soil': drawSoilGround(g, def); break;
    case 'crate': drawCrateGround(g, def); break;
    case 'saddle': drawSaddleGround(g, def); break;
    case 'lead': drawLeadGround(g); break;
    case 'wateringcan': drawWateringCanGround(g, def); break;
    case 'locket': drawLocketGround(g, def); break;
    case 'token': drawTokenGround(g, def); break;
    case 'laurel': drawLaurelGround(g, def); break;
    case 'fish': drawFishGround(g); break;
    case 'bird': drawBirdGround(g); break;
    case 'steak': drawSteakGround(g); break;
    case 'root': drawRootGround(g, def); break;
    case 'bulb': drawBulbGround(g, def); break;
    case 'leafhead': drawLeafHeadGround(g, def); break;
    case 'gourd': drawGourdGround(g, def); break;
    case 'fruit': drawFruitGround(g, def); break;
    case 'berries': drawBerriesGround(g, def); break;
    case 'loaf': drawLoafGround(g); break;
    case 'cake': drawCakeGround(g, def); break;
    case 'pie': drawPieGround(g, def); break;
    case 'dish': drawDishGround(g, def); break;
    case 'bowl': drawBowlGround(g, def); break;
    case 'board_feast': drawFeastBoardGround(g, def); break;
    case 'butter': drawButterGround(g); break;
    case 'cheese': drawCheeseGround(g, def); break;
    case 'jug': drawJugGround(g, def); break;
    case 'pail': drawPailGround(g); break;
    case 'honeypot': drawHoneyPotGround(g); break;
    case 'jar': drawJarGround(g, def); break;
    case 'skillet': drawSkilletGround(g); break;
    case 'burnt': drawBurntGround(g); break;
    case 'potion': drawPotionGround(g, def); break;
    case 'oilvial': drawOilVialGround(g, def); break;
    case 'salvepot': drawSalvePotGround(g, def); break;
    default: drawSatchelGround(g, def); break;
  }

  drawGradeGleam(g);
  drawRarityMotes(g);
}

// ---------------------------------------------------------------- the landing

/**
 * THE TUMBLE — a drop's landing choreography, as pure kinematics the
 * renderer samples by age. The item falls a real ballistic arc, takes
 * two damped bounces with squash-and-stretch at each contact, rocks a
 * decaying wobble as it settles, and only then hands over to the idle
 * bob. A per-drop stagger delay means a slain foe's spill POPS like a
 * split satchel instead of landing as one synchronized clap.
 *
 * All lengths are in TILES (the caller multiplies by camera scale).
 */
export interface DropLanding {
  /** Height above the ground, tiles (0 once settled). */
  lift: number;
  /** Vertical scale: >1 stretching in flight, <1 squashing at contact. */
  squash: number;
  /** Settling rock, radians — apply to the whole drop frame. */
  wobble: number;
  /** Appear-grow scale (0.9 → 1 over the first beat). */
  pop: number;
  /** Ground contacts so far (0..3) — dust fires on each increase. */
  contacts: number;
  /** True once the whole choreography is over. */
  settled: boolean;
}

const LAND_G = 14; // tiles/s²
const LAND_H0 = 0.95; // drop-in height, tiles
const LAND_TF = Math.sqrt((2 * LAND_H0) / LAND_G); // first fall time
const LAND_V1 = 0.32 * LAND_G * LAND_TF; // bounce 1 launch speed
const LAND_TB1 = (2 * LAND_V1) / LAND_G;
const LAND_V2 = 0.4 * LAND_V1; // bounce 2 launch speed
const LAND_TB2 = (2 * LAND_V2) / LAND_G;
/** Full choreography duration (after the per-drop delay). */
export const LAND_TOTAL = LAND_TF + LAND_TB1 + LAND_TB2 + 0.3;

/** The per-drop stagger: 0..0.14s, deterministic per eid. */
export function dropLandDelay(eid: number): number {
  return rnd(eid, 300) * 0.14;
}

/** Squash pulse after a contact: a half-sine dip, sharper each time. */
function contactSquash(dt: number, depth: number, span: number): number {
  if (dt < 0 || dt >= span) return 0;
  return depth * Math.sin((dt / span) * Math.PI);
}

export function dropLanding(eid: number, ageSec: number): DropLanding {
  const t = ageSec - dropLandDelay(eid);
  if (t <= 0) {
    // Not yet arrived: hold at the top of the arc, invisible-small pop.
    return { lift: LAND_H0, squash: 1.05, wobble: 0, pop: 0.9, contacts: 0, settled: false };
  }
  const pop = t >= 0.12 ? 1 : 0.9 + (t / 0.12) * 0.1;
  const tc1 = LAND_TF;
  const tc2 = LAND_TF + LAND_TB1;
  const tc3 = tc2 + LAND_TB2;
  let lift: number;
  let contacts: number;
  if (t < tc1) {
    lift = LAND_H0 - 0.5 * LAND_G * t * t;
    contacts = 0;
  } else if (t < tc2) {
    const u = t - tc1;
    lift = LAND_V1 * u - 0.5 * LAND_G * u * u;
    contacts = 1;
  } else if (t < tc3) {
    const u = t - tc2;
    lift = LAND_V2 * u - 0.5 * LAND_G * u * u;
    contacts = 2;
  } else {
    lift = 0;
    contacts = 3;
  }
  if (lift < 0) lift = 0;
  // Stretch in flight, squash at each floor strike.
  let squash = 1;
  if (contacts === 0) {
    squash = 1 + 0.05 * Math.min(1, (LAND_G * t) / 4);
  } else {
    squash =
      1 -
      contactSquash(t - tc1, 0.16, 0.1) -
      contactSquash(t - tc2, 0.09, 0.085) -
      contactSquash(t - tc3, 0.05, 0.07);
  }
  // The settling rock: kicked at first contact, damped to nothing.
  let wobble = 0;
  if (t >= tc1) {
    const u = t - tc1;
    const dir = rnd(eid, 301) > 0.5 ? 1 : -1;
    wobble = dir * 0.14 * Math.exp(-u * 5.5) * Math.sin(u * 17);
  }
  const settled = t >= tc3 + 0.3;
  return { lift, squash, wobble, pop, contacts, settled };
}

// ---------------------------------------------------------------- the label law

/**
 * THE QUIET PLATE — the loot label's visibility law, pure so the pins
 * can hold it. With every drop wearing its honest form, the ART is the
 * first read; a plate is the SECOND read, invited three ways:
 *  - hover / the reveal hold: full read, always;
 *  - a rolled rare+ drop or a dungeon key announces at range — the
 *    payoff beat must never hide;
 *  - anything else whispers only within arm's reach.
 */
export function lootLabelAlpha(
  dist: number,
  hovered: boolean,
  showAll: boolean,
  rarTier: number,
): number {
  if (hovered || showAll) return 1;
  if (rarTier >= 2) return Math.max(0, Math.min(1, (5.5 - dist) / 1.2));
  return Math.max(0, Math.min(1, (1.7 - dist) / 0.7));
}

/** A roll's tier index (0 = common/rollless) — the label law's key. */
export function rarTierOf(roll?: ItemRoll): number {
  return roll ? rarityIndex(roll.rar) : 0;
}

/**
 * Plate priority under crowding — when more plates want in than the
 * screen can hold legibly, the payoff wins, then the pointer, then
 * whatever is closest. Higher score = keeps its plate.
 */
export function lootPlateScore(
  hovered: boolean,
  rarTier: number,
  value: number,
  dist: number,
): number {
  return (
    (hovered ? 1000 : 0) +
    rarTier * 100 +
    Math.min(40, Math.sqrt(Math.max(0, value)) * 2) -
    dist * 8
  );
}

/**
 * Whether the renderer should echo shrunken siblings behind the front
 * item for a merged stack. Families that draw their OWN pile grammar
 * (coin piles, egg clutches, log cords, bar pyramids, fanned fish,
 * scroll fans, potion clusters, produce heaps...) refuse the echo.
 */
export function drawsOwnPile(itemId: string): boolean {
  switch (groundForm(itemId)) {
    case 'coins': case 'egg': case 'log': case 'board': case 'bar':
    case 'fish': case 'scroll': case 'potion': case 'root': case 'bulb':
    case 'fruit': case 'fang': case 'arrows': case 'berries':
    // Non-stacking gear and singletons never echo.
    case 'weapon': case 'tool': case 'shield': case 'helm': case 'bodyarmor':
    case 'legarmor': case 'boots': case 'gloves': case 'cape': case 'trinket':
    case 'tome': case 'orb': case 'quiver': case 'crate': case 'saddle':
    case 'board_feast':
      return true;
    default:
      return false;
  }
}
