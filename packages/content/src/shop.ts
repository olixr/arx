/**
 * THE SHOPS OF THE REALM. Each shop is a stock list with fixed prices
 * and infinite supply; selling anything anywhere pays half its item
 * value. 'general_store' is the counter-tile shop the starter town has
 * always had; the trainer shops hang off ACTORS (NpcActorDef.shop) —
 * talk to the profession's trainer and their wares open.
 *
 * Trainer stock is GENERATED: every trainer-unlock recipe's scroll,
 * sold by the profession that teaches it, priced by the recipe's
 * level. Drop-unlock recipes never reach a shelf — the world hides
 * those on purpose.
 */
import type { SkillId } from '@arx/shared';
import { UNLOCKABLE_RECIPES, recipeScrollId } from './recipes.js';

export interface ShopEntry {
  item: string;
  /** Purchase price; selling anything pays half its item value. */
  price: number;
}

export interface ShopDef {
  id: string;
  /** Shelf-board title shown at the top of the store screen. */
  name: string;
  stock: readonly ShopEntry[];
}

/** What the guild charges to put its knowledge on paper. */
export function trainerPrice(levelReq: number): number {
  // Steepens with the ladder: lvl 12 ≈ 300c, lvl 30 ≈ 900c, lvl 39 ≈ 1.3k.
  return Math.round((60 + levelReq * 20 + levelReq * levelReq * 0.5) / 5) * 5;
}

/**
 * THE ELVEN EXCEPTION's roll: taught lore that exactly ONE teacher
 * carries (the Bowyer's House, the Evenfall epic). These stay off
 * every generic guild shelf — the knowledge went west, and the walk
 * west is the price.
 */
const SINGLE_TEACHER_RECIPES: ReadonlySet<string> = new Set([
  'craft_windsinger',
  'craft_yew_shortbow',
  'craft_yew_hunting_bow',
  'craft_yew_longbow',
  // The Silk Hall's lane (the second single-teacher shelf): the
  // moonpale weave and the star cloth it carries.
  'craft_moonpale_silk',
  'craft_starweaver_circlet',
  'craft_starweaver_robe',
  'craft_starweaver_skirts',
  'craft_starweaver_slippers',
  'craft_starweaver_gloves',
  // The Third Table's cold work.
  'craft_moonglass_lens',
]);

/** Every trainer-taught scroll for the given professions, by level. */
function trainerStock(skills: SkillId[]): ShopEntry[] {
  return UNLOCKABLE_RECIPES.filter(
    (r) => r.unlock === 'trainer' && skills.includes(r.skill) && !SINGLE_TEACHER_RECIPES.has(r.id),
  )
    .sort((a, b) => a.levelReq - b.levelReq || a.name.localeCompare(b.name))
    .map((r) => ({ item: recipeScrollId(r.id), price: trainerPrice(r.levelReq) }));
}

export const GENERAL_STORE: readonly ShopEntry[] = [
  { item: 'bronze_axe', price: 25 },
  { item: 'bronze_pickaxe', price: 25 },
  { item: 'fishing_rod', price: 20 },
  { item: 'bronze_sword', price: 40 },
  { item: 'shortbow', price: 45 },
  { item: 'arrow', price: 3 },
  { item: 'apprentice_staff', price: 55 },
  // One starter relic on the shelf so the E slot is discoverable
  // without a lucky drop; the rest are monster-hunted.
  { item: 'snare_kit', price: 300 },
  // Starter farming: herb seeds are foraging-only finds. THE FULL
  // FIELD widened the racks with the staple and orchard bands; the
  // high herbs, the far roots, and the dark bed sell nowhere but
  // Jorel's stall (seed_stall) in the Amberford fields.
  { item: 'carrot_seed', price: 5 },
  { item: 'potato_seed', price: 8 },
  { item: 'onion_seed', price: 12 },
  { item: 'sunflower_seed', price: 15 },
  { item: 'cabbage_seed', price: 18 },
  { item: 'wheat_seed', price: 20 },
  { item: 'apple_sapling', price: 25 },
  { item: 'cotton_seed', price: 30 },
  { item: 'bramble_cutting', price: 30 },
  { item: 'pumpkin_seed', price: 35 },
  { item: 'plum_sapling', price: 40 },
  { item: 'barley_seed', price: 45 },
  { item: 'watering_can', price: 30 },
  // THE OLD GATE (contested lands band 7): a wright's counter sells what
  // a wright's shed holds. Halvor's four boards come off this shelf.
  { item: 'board', price: 4 },
  // Basic outfitting — always the fixed common baseline; better rolls
  // come from the anvil, the workbench, or the wilds.
  { item: 'leather_boots', price: 60 },
  { item: 'woven_trousers', price: 55 },
  // The cookbook shelf keeps the two starter dishes only — the
  // cooking school proper moved south with Smokemistress Alba
  // (alba_receipts, Saltmere): her shelf carries the whole trade.
  { item: recipeScrollId('cook_hearty_stew'), price: trainerPrice(12) },
  { item: recipeScrollId('cook_cake'), price: trainerPrice(15) },
];

/**
 * The frontier counter: everything a road asks of you, at a frontier
 * markup — the waystation is a lifeline, not a bargain. Brass keys on
 * the shelf close the strongbox economy's loop: the deep-band iron
 * chests always have an answer, if you can pay for it.
 */
export const WAYSTATION_SUPPLIES: readonly ShopEntry[] = [
  { item: 'bread', price: 25 },
  { item: 'cooked_beef', price: 15 },
  { item: 'hearty_stew', price: 45 },
  { item: 'healing_tincture', price: 55 },
  { item: 'mending_salve', price: 165 },
  { item: 'swiftness_tonic', price: 110 },
  { item: 'ironbark_tonic', price: 130 },
  { item: 'arrow', price: 5 },
  { item: 'brass_key', price: 240 },
];

/**
 * The hamlet larder — what a croft can spare, priced like the
 * neighbors you are: food off the land, nothing exotic.
 */
export const HAMLET_LARDER: readonly ShopEntry[] = [
  { item: 'bread', price: 18 },
  { item: 'egg', price: 8 },
  { item: 'milk', price: 12 },
  { item: 'cooked_beef', price: 14 },
  { item: 'hearty_stew', price: 40 },
];

/**
 * Edda's stores at the Last Lamp — the final resupply before the
 * Silverspine climb. Everything the dark ahead will ask of you,
 * priced like the last chance it is.
 */
/**
 * THE SEED STALL (farming v2 Phase 2) — Jorel's board table in the
 * Amberford fields. The ONLY counter for the high-band seeds: the
 * far roots, the brewer's herbs, and the dark bed. Prices are steep
 * on purpose — past the general racks, the seed is the investment —
 * and the plant-door's farming gate does the real gatekeeping.
 * Sagewort and moonbell stay off every counter forever (the
 * forager's kinship law).
 */
export const SEED_STALL: readonly ShopEntry[] = [
  { item: 'redroot_seed', price: 90 },
  { item: 'kingsquash_seed', price: 160 },
  { item: 'bittercress_seed', price: 120 },
  { item: 'silverleaf_seed', price: 200 },
  { item: 'duskthorn_seed', price: 320 },
  { item: 'dawnveil_seed', price: 500 },
  { item: 'adderstongue_seed', price: 260 },
  { item: 'palegill_spores', price: 300 },
  { item: 'mirefig_sapling', price: 340 },
];

/**
 * THE DROVER'S YARD (farming v2 Phase 3) — Sorrel's counter at the
 * Dawnmead stalls. Crated young for the keeping (released at your own
 * feed trough), the lead that walks one back, and the barley the
 * manger wants. The animal itself is never an item for long: the
 * crate is a promise, the yard is the animal.
 */
export const DROVER_YARD: readonly ShopEntry[] = [
  { item: 'chick_crate', price: 60 },
  { item: 'calf_crate', price: 350 },
  { item: 'lamb_crate', price: 280 },
  { item: 'boarlet_crate', price: 700 },
  { item: 'drovers_lead', price: 40 },
  { item: 'barley_seed', price: 45 },
];

/**
 * THE FIVE STONES (THE DAWN REMADE) — Gilly's board at the Dawnmead
 * inn: plain fare priced for a waker's first coins, and nothing a
 * kitchen of your own wouldn't beat.
 */
export const GILLY_BOARD: readonly ShopEntry[] = [
  { item: 'bread', price: 8 },
  { item: 'cooked_chicken', price: 15 },
  { item: 'trout', price: 14 },
  { item: 'berries', price: 4 },
];

export const LAST_LAMP_STORES: readonly ShopEntry[] = [
  { item: 'bread', price: 30 },
  { item: 'hearty_stew', price: 55 },
  { item: 'healing_tincture', price: 60 },
  { item: 'mending_salve', price: 175 },
  { item: 'swiftness_tonic', price: 120 },
  { item: 'ironbark_tonic', price: 140 },
  { item: 'arrow', price: 6 },
  { item: 'brass_key', price: 260 },
];

const defs: ShopDef[] = [
  { id: 'general_store', name: 'General Store', stock: GENERAL_STORE },
  { id: 'seed_stall', name: "Jorel's Seed Stall", stock: SEED_STALL },
  { id: 'drover_yard', name: "Sorrel's Drover Yard", stock: DROVER_YARD },
  { id: 'gilly_board', name: 'The Five Stones', stock: GILLY_BOARD },
  // THE CAUSEWAY HEAD (contested lands band 7, plan §3.1): Ingram's
  // counter at the ford. The levy is paid in corn, the corn goes on a
  // shelf, and the shelf sells it back to the road at the ford price:
  // the Charter's honest cruelty in one line. Open to both sides of the
  // fork; the boards are the dike's own timber, sold to anyone.
  {
    id: 'causeway_head',
    name: 'The Causeway Head',
    stock: [
      { item: 'green_corn', price: 4 },
      { item: 'board', price: 4 },
    ],
  },
  { id: 'waystation_supplies', name: "The Wayfarer's Pack", stock: WAYSTATION_SUPPLIES },
  // THE GREY ROOT (contested lands band 8, plan §3.3): Alder's yard, the
  // bow wood shelf that has sold nobody. No `shop` rides forester_alder's
  // def: the hook in alder_bowwood alone opens it, on grey_root_done, so
  // the yard is a thing the axe earns, and the Wool Count's closure
  // (alder_trades_closed, one priority above) outranks it for a
  // character who walked both forks. Priced at the ledger's own values
  // plus the yard's handling, the way the general store prices boards.
  {
    id: 'copse_yard',
    name: 'The Copse yard',
    stock: [
      { item: 'yew_log', price: 60 },
      { item: 'log', price: 6 },
      { item: 'board', price: 4 },
    ],
  },
  // THE ROAD'S FORTUNE (living frontier, phase 5): the peddler carts.
  // Each carries a thing or two town never sells — drop-unlock recipe
  // scrolls (found knowledge, sold only on the road) and keys under
  // town price. The stock IS the story: catch the cart or miss it.
  {
    id: 'peddler_tinker',
    name: 'The Mended Cart',
    stock: [
      { item: 'brass_key', price: 48 },
      { item: 'twine', price: 6 },
      { item: 'arrow', price: 1 },
      { item: 'mending_salve', price: 28 },
    ],
  },
  {
    id: 'peddler_herbwife',
    name: 'Roots & Remedies',
    stock: [
      { item: 'recipe_brew_adderfang_oil', price: 260 },
      { item: 'recipe_brew_hobble_brew', price: 420 },
      { item: 'venom_gland', price: 25 },
      { item: 'mending_salve', price: 26 },
    ],
  },
  {
    id: 'peddler_relics',
    name: 'The Provenance Cart',
    stock: [
      { item: 'dungeon_key', price: 95 },
      { item: 'recipe_brew_vipers_kiss', price: 700 },
      { item: 'crimson_essence', price: 120 },
    ],
  },
  { id: 'hamlet_larder', name: 'The Croft Larder', stock: HAMLET_LARDER },
  { id: 'last_lamp_stores', name: "Edda's Stores", stock: LAST_LAMP_STORES },
  // Amberford's counters — every shopkeeper a person, every shelf a
  // livelihood (Epic 6: the people pass).
  {
    id: 'merra_goods',
    name: "Merra's Provisions",
    stock: [
      { item: 'bread', price: 10 },
      { item: 'egg', price: 6 },
      { item: 'milk', price: 8 },
      { item: 'berries', price: 4 },
      { item: 'carrot', price: 5 },
      { item: 'flour', price: 9 },
      { item: 'twine', price: 7 },
      { item: 'plant_fibre', price: 4 },
      // Seed for the Free Furrows — the grocer keeps the common
      // ground planted, matching the Dawnmead general store's rates.
      { item: 'carrot_seed', price: 5 },
      { item: 'sunflower_seed', price: 15 },
      { item: 'wheat_seed', price: 20 },
      { item: 'cotton_seed', price: 30 },
    ],
  },
  {
    id: 'dunna_board',
    name: "The Wanderer's Table",
    stock: [
      { item: 'hearty_stew', price: 26 },
      { item: 'bread', price: 10 },
      { item: 'cooked_beef', price: 22 },
      { item: 'fried_egg', price: 12 },
      { item: 'cake', price: 45 },
      { item: 'milk', price: 8 },
    ],
  },
  {
    id: 'garton_mill',
    name: 'The Millstone',
    stock: [
      { item: 'flour', price: 8 },
      { item: 'wheat', price: 5 },
      { item: 'bread', price: 9 },
    ],
  },
  {
    id: 'peld_catch',
    name: "Peld's Catch",
    stock: [
      { item: 'raw_trout', price: 14 },
      { item: 'trout', price: 24 },
      { item: 'fishing_rod', price: 60 },
    ],
  },
  {
    id: 'hask_outfitting',
    name: "Hask's Outfitting",
    stock: [
      { item: 'arrow', price: 6 },
      { item: 'snare_kit', price: 90 },
      { item: 'straw_decoy', price: 70 },
      { item: 'bronze_axe', price: 55 },
      { item: 'bronze_pickaxe', price: 55 },
      { item: 'fishing_rod', price: 60 },
      { item: 'leather_hood', price: 48 },
      { item: 'leather_body', price: 80 },
      { item: 'leather_boots', price: 40 },
      { item: 'leather_gloves', price: 36 },
      { item: 'cape_traveler', price: 120 },
      { item: 'healing_tincture', price: 65 },
    ],
  },
  // Silverfall's counters — the mountain trades at mountain prices.
  {
    id: 'balla_stock',
    name: 'The Grand Rack',
    stock: [
      { item: 'bronze_bar', price: 30 },
      { item: 'iron_bar', price: 60 },
      { item: 'steel_bar', price: 130 },
      { item: 'silver_bar', price: 180 },
      { item: 'coal', price: 18 },
    ],
  },
  {
    id: 'ottilie_bolts',
    name: "Ottilie's Bolts",
    stock: [
      { item: 'cloth', price: 20 },
      { item: 'linen', price: 46 },
      { item: 'cotton', price: 8 },
      { item: 'twine', price: 7 },
      { item: 'leather', price: 26 },
    ],
  },
  {
    id: 'wyn_remedies',
    name: "Wyn's Remedies",
    stock: [
      { item: 'healing_tincture', price: 60 },
      { item: 'mending_salve', price: 85 },
      { item: 'gatherers_brew', price: 95 },
      { item: 'swiftness_tonic', price: 110 },
      { item: 'ironbark_tonic', price: 130 },
      { item: 'sagewort', price: 10 },
      { item: 'moonbell', price: 16 },
    ],
  },
  {
    id: 'signy_board',
    name: "Signy's Terrace Kitchen",
    stock: [
      { item: 'hearty_stew', price: 24 },
      { item: 'bread', price: 9 },
      { item: 'cooked_beef', price: 22 },
      { item: 'trout', price: 20 },
      { item: 'fried_egg', price: 11 },
      { item: 'milk', price: 8 },
    ],
  },
  {
    id: 'galleria_stalls',
    name: 'The Galleria',
    stock: [
      { item: 'cloth', price: 22 },
      { item: 'leather', price: 28 },
      { item: 'silver_ring', price: 220 },
      { item: 'gold_ring', price: 320 },
      { item: 'arcane_dust', price: 90 },
      { item: 'cape_traveler', price: 130 },
    ],
  },
  {
    id: 'gate_market_stock',
    name: 'The Gate Market',
    stock: [
      { item: 'raw_trout', price: 12 },
      { item: 'trout', price: 22 },
      { item: 'coal', price: 16 },
      { item: 'iron_ore', price: 30 },
      { item: 'silver_ore', price: 70 },
      { item: 'bread', price: 11 },
    ],
  },
  {
    id: 'stig_patterns',
    name: "Stig's Measures",
    stock: [
      ...trainerStock(['woodworking']),
      { item: 'twine', price: 8 },
    ],
  },
  {
    id: 'solvei_craft',
    name: "Solvei's Craft",
    stock: [
      ...trainerStock(['enchanting']),
      { item: 'arcane_dust', price: 80 },
    ],
  },
  {
    id: 'vigdis_wares',
    name: 'The Silver Setting',
    stock: [
      { item: 'silver_ring', price: 190 },
      { item: 'gold_ring', price: 290 },
      { item: 'silver_bar', price: 200 },
      { item: 'cape_gilded', price: 900 },
    ],
  },
  {
    id: 'ragna_board',
    name: 'The Silver Flagon',
    stock: [
      { item: 'hearty_stew', price: 26 },
      { item: 'bread', price: 10 },
      { item: 'cooked_beef', price: 24 },
      { item: 'trout', price: 22 },
      { item: 'milk', price: 9 },
    ],
  },
  {
    id: 'calder_goods',
    name: "Calder's Counter",
    stock: [
      { item: 'brass_key', price: 650 },
      { item: 'leather', price: 22 },
      { item: 'twine', price: 5 },
      { item: 'cape_midnight', price: 420 },
      { item: 'silver_ore', price: 55 },
    ],
  },
  // The Tollhouse ledger's other column (factions Phase 5): Ferrick
  // buys what honest counters won't — a fence by roster law, since
  // his faction sits in the doc's theft.fences list.
  // THE LOW HALL — the Red Company's sanctuary counters.
  {
    id: 'company_counter',
    name: "The Tallyman's Counter",
    stock: [
      { item: 'swiftness_tonic', price: 65 },
      { item: 'leadfoot_oil', price: 90 },
      { item: 'silver_ring', price: 140 },
      { item: 'iron_bar', price: 58 },
      { item: 'bread', price: 10 },
    ],
  },
  {
    id: 'company_kit',
    name: 'The Kit Cage',
    stock: [
      { item: 'leather_body', price: 120 },
      { item: 'leather_chaps', price: 95 },
      { item: 'leather_boots', price: 60 },
      { item: 'leather_gloves', price: 55 },
      { item: 'iron_sword', price: 180 },
      { item: 'steel_dagger', price: 260 },
    ],
  },
  {
    id: 'company_post',
    name: "The Company's Cut",
    stock: [
      { item: 'cutpurse_cowl', price: 260 },
      { item: 'swiftness_tonic', price: 70 },
      { item: 'leadfoot_oil', price: 95 },
      { item: 'silver_ring', price: 150 },
    ],
  },
  // The Deep Market's counters.
  {
    id: 'varga_ore',
    name: "Varga's Scales",
    stock: [
      { item: 'copper_ore', price: 12 },
      { item: 'tin_ore', price: 12 },
      { item: 'iron_ore', price: 28 },
      { item: 'coal', price: 15 },
      { item: 'gold_ore', price: 90 },
      { item: 'silver_ore', price: 65 },
      { item: 'iron_bar', price: 62 },
    ],
  },
  {
    id: 'ninebrass_curios',
    name: "Ninebrass's Curios",
    stock: [
      { item: 'emberstone', price: 240 },
      { item: 'frostshard', price: 240 },
      { item: 'stormpearl', price: 260 },
      { item: 'bloomstone', price: 240 },
      { item: 'arcane_dust', price: 85 },
      { item: 'silver_ring', price: 210 },
      { item: 'brass_key', price: 250 },
    ],
  },
  // ------------------------------------------------------- Saltmere
  // The chandlery: everything the water asks of you, in threes.
  {
    id: 'saltmere_stores',
    name: 'Saltmere Stores',
    stock: [
      { item: 'fishing_rod', price: 18 },
      { item: 'twine', price: 10 },
      { item: 'arrow', price: 4 },
      { item: 'bread', price: 20 },
      { item: 'healing_tincture', price: 58 },
      { item: 'leather_boots', price: 62 },
      { item: 'brass_key', price: 250 },
    ],
  },
  // Dorrit's board at the Painted Gull: the house dish is the point.
  {
    id: 'gull_board',
    name: 'The Painted Gull',
    stock: [
      { item: 'bread', price: 18 },
      { item: 'fried_egg', price: 10 },
      { item: 'milk', price: 12 },
      { item: 'hearty_stew', price: 42 },
      { item: 'fishers_pot', price: 78 },
    ],
  },
  // Alba's Receipts: the world's one true cooking school — every
  // taught dish in the trade, plus the salt and the smoke to prove it.
  {
    id: 'alba_receipts',
    name: "Alba's Receipts",
    stock: [
      ...trainerStock(['cooking']),
      { item: 'salt', price: 8 },
      { item: 'smoked_trout', price: 34 },
    ],
  },
  // ------------------------------------------------------- PINEWATCH
  // The town that watches the deep wood sells what the deep wood is
  // worth: sawn boards by the stack, spars nobody else can shape, and
  // the pitch that comes off the kilns downwind of everything.
  {
    id: 'groa_boards',
    name: 'The Great Saw',
    stock: [
      { item: 'board', price: 6 },
      { item: 'pine_log', price: 26 },
      { item: 'log', price: 20 },
    ],
  },
  // Yannick sells the raw stick and the resin off it. The mast itself
  // is not for sale to anyone who has to ask.
  {
    id: 'yannick_spars',
    name: "Sparwrights' Row",
    stock: [
      { item: 'pine_log', price: 24 },
      { item: 'pine_resin', price: 7 },
      { item: 'board', price: 7 },
    ],
  },
  // Vigga hangs heads and sets teeth. The ladder here is honest iron
  // and steel: this is a working town, not an armoury.
  {
    id: 'vigga_edges',
    name: 'The Axe-Smith',
    stock: [
      { item: 'bronze_axe', price: 26 },
      { item: 'iron_axe', price: 120 },
      { item: 'steel_axe', price: 420 },
      { item: 'iron_bar', price: 42 },
    ],
  },
  // The Pine and Bell keeps the four o clock fire and feeds whoever
  // comes off the tower stair.
  {
    id: 'bell_board',
    name: 'The Pine and Bell',
    stock: [
      { item: 'bread', price: 18 },
      { item: 'cooked_beef', price: 16 },
      { item: 'hearty_stew', price: 44 },
      { item: 'milk', price: 12 },
    ],
  },
  // Rullo's kilns: resin in, firepitch out, eyebrows optional.
  {
    id: 'rullo_pitch',
    name: 'The Pitch Yard',
    stock: [
      { item: 'pine_resin', price: 6 },
      { item: 'firepitch_oil', price: 90 },
    ],
  },
  // Nial keeps two of everything and three of what people lose.
  {
    id: 'pinewatch_stores',
    name: 'Pinewatch Stores',
    stock: [
      { item: 'bronze_axe', price: 28 },
      { item: 'fishing_rod', price: 22 },
      { item: 'arrow', price: 4 },
      // The pass pony: Nial outfits the cold country, beast included.
      { item: 'hoargate_garron', price: 3500 },
      { item: 'healing_tincture', price: 60 },
      { item: 'mending_salve', price: 170 },
      { item: 'ironbark_tonic', price: 135 },
      { item: 'leather_boots', price: 64 },
      { item: 'brass_key', price: 250 },
    ],
  },
  // Ylva fishes the one water nobody else wants. Cold, slow, big.
  {
    id: 'ylva_catch',
    name: 'The Fisher Steps',
    stock: [
      { item: 'fishing_rod', price: 18 },
      { item: 'raw_trout', price: 11 },
      { item: 'trout', price: 22 },
    ],
  },
  // PINEWATCH REMADE — the Southreach's counters. Berget sells the
  // MAKINGS, never the made: issued steel is counted steel, and a
  // civilian's blade is earned at the anvil. The margin over the
  // Charterhouse's own rates is called the wall tax, and she will
  // explain it exactly once.
  {
    id: 'berget_wall',
    name: 'The Northguard Armory',
    stock: [
      { item: 'steel_bar', price: 140 },
      { item: 'iron_bar', price: 46 },
      { item: 'coal', price: 30 },
      { item: 'arrow', price: 4 },
      { item: 'healing_tincture', price: 62 },
    ],
  },
  // Espen strings every bow with the story of the tree it was. The
  // dozen on the counter are good. The dozen under it are not for you.
  {
    id: 'espen_staves',
    name: 'The Fletcher',
    stock: [
      { item: 'hunting_bow', price: 330 },
      { item: 'arrow', price: 3 },
      { item: 'feather', price: 2 },
    ],
  },
  // Kolbrun's counter arms the cull and dresses the road north: honest
  // leathers and the furs the count could spare. Nothing fancier — the
  // fells' first-quality hides belong to Hartfell, and she says so.
  {
    id: 'kolbrun_leathers',
    name: "The Hunters' Hall",
    stock: [
      { item: 'leather_body', price: 118 },
      { item: 'leather_chaps', price: 92 },
      { item: 'leather_gloves', price: 58 },
      { item: 'leather_boots', price: 66 },
      { item: 'wolf_fur', price: 26 },
    ],
  },
  // -------------------------------------------------------- HARTFELL
  // The town past the treeline sells what the fell is worth: the best
  // leather in the Dawnlands, the tallow every road lamp burns, and
  // the winter's meat out of Geir's smoke. It does NOT sell masterwork
  // anything — the limits are the town.
  //
  // Kolgrim arms the hunt and nothing fancier. The traps hold what
  // they promise, which is the entire point of a promise.
  {
    id: 'kolgrim_hunt',
    name: 'Horn Hall',
    stock: [
      { item: 'hunting_bow', price: 320 },
      { item: 'arrow', price: 4 },
      { item: 'snare_kit', price: 260 },
      { item: 'leather_boots', price: 66 },
    ],
  },
  // Ranna grades in front of you. First quality is already sold.
  {
    id: 'ranna_furs',
    name: 'The Hidehall',
    stock: [
      { item: 'leather', price: 20 },
      { item: 'hardened_leather', price: 78 },
      { item: 'leather_body', price: 74 },
      { item: 'leather_chaps', price: 60 },
      { item: 'wolf_fur', price: 36 },
      { item: 'direwolf_pelt', price: 190 },
    ],
  },
  // Ulfa lights the road. Dark is what costs.
  {
    id: 'ulfa_lights',
    name: 'The Chandlery',
    stock: [
      { item: 'firepitch_oil', price: 85 },
      { item: 'twine', price: 9 },
    ],
  },
  // Geir's smoke: the winter, won in autumn.
  {
    id: 'geir_smokehouse',
    name: 'The Rendery',
    stock: [
      { item: 'smoked_trout', price: 30 },
      { item: 'salmon', price: 90 },
      { item: 'cooked_beef', price: 18 },
      { item: 'salt', price: 9 },
    ],
  },
  // Tuli's tray: nothing dies for a comb.
  {
    id: 'tuli_horn',
    name: 'The Bone Shop',
    stock: [
      { item: 'bones', price: 4 },
      { item: 'worg_fang', price: 70 },
      { item: 'silver_ring', price: 180 },
    ],
  },
  // Eirik: small iron at working prices, and honesty at none.
  {
    id: 'eirik_iron',
    name: 'The Smithy',
    stock: [
      { item: 'iron_bar', price: 48 },
      { item: 'bronze_axe', price: 30 },
      { item: 'bronze_pickaxe', price: 30 },
      { item: 'iron_sword', price: 210 },
    ],
  },
  // The Horn and Hearth: broth, bread, and the fire that never dies.
  {
    id: 'brandulf_board',
    name: 'The Horn and Hearth',
    stock: [
      { item: 'bread', price: 20 },
      { item: 'hearty_stew', price: 48 },
      { item: 'cooked_beef', price: 18 },
      { item: 'milk', price: 14 },
      { item: 'healing_tincture', price: 62 },
    ],
  },
  // Maeva: salves, tinctures, and honesty about which you need.
  {
    id: 'maeva_remedies',
    name: 'The Springhall',
    stock: [
      { item: 'healing_tincture', price: 58 },
      { item: 'mending_salve', price: 168 },
      { item: 'ironbark_tonic', price: 130 },
      { item: 'gatherers_brew', price: 70 },
    ],
  },
  // Voss sells tackle and yesterday's catch, in that order of pride.
  {
    id: 'voss_tackle',
    name: "Voss's Tackle",
    stock: [
      { item: 'fishing_rod', price: 16 },
      { item: 'raw_trout', price: 10 },
      { item: 'trout', price: 20 },
      { item: 'smoked_trout', price: 32 },
    ],
  },
  // The White Harvest: Ondra's salt, at the pans' own price.
  {
    id: 'ondra_salt',
    name: 'The White Harvest',
    stock: [
      { item: 'salt', price: 5 },
    ],
  },
  // The Ropewalk's counter: line, cord, and cloth off the looms.
  {
    id: 'jessa_walk',
    name: 'The Ropewalk',
    stock: [
      { item: 'twine', price: 8 },
      { item: 'cloth', price: 30 },
      { item: 'snare_kit', price: 280 },
    ],
  },
  // Osa's yard sells the road itself: coursers, saddled and shod.
  // The price IS the gate (the weapon idiom: economic, never levels).
  {
    id: 'osa_stable',
    name: 'The High Yard',
    stock: [
      { item: 'bay_courser', price: 3500 },
      { item: 'grey_courser', price: 3500 },
      { item: 'dun_courser', price: 3500 },
    ],
  },
  // ---- THE FALLS VALE — Silverfall's lower town (the Vale epic).
  // The Vale is the cheap half of the capital ON PURPOSE: every
  // price here undercuts the terraces above it, because the wealth
  // gradient is the storytelling.
  {
    id: 'brant_flour',
    name: "The King's Mill",
    stock: [
      { item: 'flour', price: 7 },
      { item: 'wheat', price: 5 },
      { item: 'bread', price: 8 },
    ],
  },
  {
    id: 'hedda_loaves',
    name: 'The Bakehouse',
    stock: [
      { item: 'bread', price: 8 },
      { item: 'fried_egg', price: 10 },
      { item: 'milk', price: 7 },
    ],
  },
  {
    id: 'ulf_board',
    name: 'The Last Climb',
    stock: [
      { item: 'hearty_stew', price: 22 },
      { item: 'bread', price: 8 },
      { item: 'cooked_beef', price: 20 },
      { item: 'trout', price: 18 },
      { item: 'milk', price: 7 },
    ],
  },
  {
    id: 'ronnaug_board',
    name: "The Delvers' Rest",
    stock: [
      { item: 'hearty_stew', price: 21 },
      { item: 'bread', price: 8 },
      { item: 'cooked_beef', price: 20 },
      { item: 'milk', price: 7 },
    ],
  },
  {
    id: 'maeve_beds',
    name: "The Pilgrim's Rest",
    stock: [
      { item: 'bread', price: 8 },
      { item: 'hearty_stew', price: 20 },
      { item: 'milk', price: 7 },
    ],
  },
  {
    id: 'brigga_catch',
    name: 'The Kingshore Catch',
    stock: [
      { item: 'raw_trout', price: 12 },
      { item: 'trout', price: 20 },
      { item: 'fishing_rod', price: 55 },
    ],
  },
  {
    id: 'petya_catch',
    name: "Petya's Slab",
    stock: [
      { item: 'raw_trout', price: 13 },
      { item: 'trout', price: 21 },
    ],
  },
  {
    id: 'lucan_greens',
    name: "Lucan's Boards",
    stock: [
      { item: 'carrot', price: 4 },
      { item: 'berries', price: 3 },
      { item: 'egg', price: 5 },
      { item: 'milk', price: 7 },
      { item: 'flour', price: 8 },
    ],
  },
  // ---- KINGSDELF — the town in the King's Delf (the Kingsdelf epic).
  // Ore and glass and light; everything else walked here up the unlit
  // road, and the prices say so. The limits are the town: no loom, no
  // crops, no masterwork sold over any counter.
  // Brekka feeds the shifts; the day-book is free, the stew is not.
  {
    id: 'brekka_board',
    name: "The Foreman's Rest",
    stock: [
      { item: 'bread', price: 6 },
      { item: 'fried_egg', price: 10 },
      { item: 'hearty_stew', price: 20 },
      { item: 'cooked_beef', price: 16 },
      { item: 'milk', price: 6 },
    ],
  },
  // Orin trades in known stock the Charter freights down: a beast you
  // can trust on a road you cannot. (A delf-bred mount is a debt the
  // Beastyard means to pay.)
  {
    id: 'orin_stable',
    name: 'The Beastyard',
    stock: [
      { item: 'bay_courser', price: 3600 },
      { item: 'grey_courser', price: 3600 },
      { item: 'hoargate_garron', price: 3600 },
      { item: 'drovers_lead', price: 45 },
    ],
  },
  // Ferrun sells the forge's knowledge at the far end of the ladder's
  // road: the same guild schematics as the ford, without the walk.
  { id: 'ferrun_commissions', name: 'Starfall Commissions', stock: trainerStock(['smithing']) },
  // Veyle sells the Arcanum's own folios, which annoys the Arcanum,
  // which is not why she does it. Mostly.
  { id: 'veyle_craft', name: 'The Focus House', stock: trainerStock(['enchanting']) },
  // Mirena sells the burn's stones, cut and clean: the glasswork's
  // raw heart, priced for people who know what they are holding.
  {
    id: 'mirena_wares',
    name: 'The Glasshouse',
    stock: [
      { item: 'emberstone', price: 95 },
      { item: 'frostshard', price: 95 },
      { item: 'arcane_dust', price: 60 },
      { item: 'stormpearl', price: 130 },
    ],
  },
  // Soren sells what a lamp eats. The lamps themselves he gives to
  // the road, one by one, which is the whole argument.
  {
    id: 'soren_lamps',
    name: 'The Flamehouse',
    stock: [
      { item: 'firepitch_oil', price: 28 },
      { item: 'coal', price: 9 },
      { item: 'emberstone', price: 98 },
    ],
  },
  // Etta apologizes for the prices. The road does not.
  {
    id: 'etta_goods',
    name: 'The Provisioner',
    stock: [
      { item: 'bread', price: 7 },
      { item: 'flour', price: 9 },
      { item: 'salt', price: 7 },
      { item: 'berries', price: 6 },
      { item: 'wheat', price: 6 },
      { item: 'cake', price: 34 },
    ],
  },
  // Cass sells warmth first and looks second, and will tell you so.
  {
    id: 'cass_outfitting',
    name: 'The Outfitter',
    stock: [
      { item: 'leather_body', price: 60 },
      { item: 'leather_chaps', price: 48 },
      { item: 'leather_boots', price: 36 },
      { item: 'leather_gloves', price: 30 },
      { item: 'leather_hood', price: 34 },
      { item: 'cape_traveler', price: 90 },
    ],
  },
  // Ida's shelf: what works, priced so the shifts can afford it.
  {
    id: 'ida_remedies',
    name: 'The Dispensary',
    stock: [
      { item: 'healing_tincture', price: 32 },
      { item: 'mending_salve', price: 26 },
      { item: 'ironbark_tonic', price: 42 },
      { item: 'gatherers_brew', price: 26 },
      { item: 'moonbell', price: 20 },
      { item: 'sagewort', price: 9 },
    ],
  },
  // Denna sells the mere's pale catch and the means to try your own.
  {
    id: 'denna_catch',
    name: 'The Quay',
    stock: [
      { item: 'raw_trout', price: 9 },
      { item: 'smoked_trout', price: 20 },
      { item: 'salmon', price: 16 },
      { item: 'fishing_rod', price: 60 },
      { item: 'fishers_pot', price: 48 },
    ],
  },
  // Slate sells rope, keys, and no questions. The Company's counter
  // in all but name, which is the name's whole job.
  {
    id: 'slate_sundries',
    name: 'Sundries',
    stock: [
      { item: 'twine', price: 5 },
      { item: 'snare_kit', price: 260 },
      { item: 'leadfoot_oil', price: 48 },
      { item: 'straw_decoy', price: 38 },
      { item: 'brass_key', price: 250 },
    ],
  },
  // Bretta sells the forge's knowledge: every guild-taught schematic
  // in the smithing line, jewellery to platebodies.
  { id: 'trainer_smithing', name: 'Ironhewn Schematics', stock: trainerStock(['smithing']) },
  // Tilo's hall covers cloth and carved wood; the hides went home to
  // Swale's tannery with THE FORD COMES HOME ("giving the hides back
  // to somebody who likes them," he says, gratefully downwind).
  {
    id: 'trainer_artisan',
    name: "Tilo's Patterns",
    stock: trainerStock(['tailoring', 'woodworking']),
  },
  // Swale sells the wet trade's whole ladder off the riverbank, plus
  // the honest sundries a strap-cutter goes through.
  {
    id: 'trainer_tanner',
    name: "Swale's Frames",
    stock: [
      ...trainerStock(['leatherworking']),
      { item: 'leather', price: 22 },
      { item: 'twine', price: 7 },
    ],
  },
  // Elowen keeps the brewing formulas and the enchanter's treatises.
  {
    id: 'trainer_sage',
    name: "Elowen's Folios",
    stock: trainerStock(['herbalism', 'enchanting']),
  },
  // Bray trades in road-bred stock off the coaching yard: the ford is
  // where a waker meets the first saddle, priced like a gate, plus
  // the drover's lead for the beast you tamed yourself.
  {
    id: 'bray_stable',
    name: 'The Ford Stable',
    stock: [
      { item: 'bay_courser', price: 3600 },
      { item: 'grey_courser', price: 3600 },
      { item: 'drovers_lead', price: 45 },
    ],
  },
  // ---- EVENFALL — the city the old folk kept (the Evenfall epic).
  // The finest, never the most: the prices are courteous and firm,
  // and half the stock exists nowhere else at any price.
  // Aewyn staffs the game's whole bow lane: the trainer shelf like
  // anyone else, and the high shelf as SCROLLS — the legacy-scroll
  // precedent, because no trainer teaches above the band and the
  // wood does not make exceptions, it makes arrangements.
  {
    id: 'aewyn_bows',
    name: "The Bowyer's House",
    stock: [
      ...trainerStock(['woodworking']),
      { item: recipeScrollId('craft_windsinger'), price: 2400 },
      { item: recipeScrollId('craft_yew_shortbow'), price: 2600 },
      { item: recipeScrollId('craft_yew_hunting_bow'), price: 2900 },
      { item: recipeScrollId('craft_yew_longbow'), price: 3200 },
      { item: 'yew_log', price: 110 },
      { item: 'silverbark', price: 130 },
      { item: 'heartwood', price: 900 },
    ],
  },
  // Myrren keeps the tailoring shelf and the cloth worth crossing a
  // map for. (The moonpale weave itself is not for sale. Ask, and
  // learn something about yourself.)
  {
    id: 'myrren_silks',
    name: 'The Silk Hall',
    stock: [
      ...trainerStock(['tailoring']),
      { item: recipeScrollId('craft_moonpale_silk'), price: 900 },
      { item: recipeScrollId('craft_starweaver_circlet'), price: 2300 },
      { item: recipeScrollId('craft_starweaver_slippers'), price: 2400 },
      { item: recipeScrollId('craft_starweaver_gloves'), price: 2400 },
      { item: recipeScrollId('craft_starweaver_skirts'), price: 2600 },
      { item: recipeScrollId('craft_starweaver_robe'), price: 3000 },
      { item: 'moonpale_silk', price: 300 },
      { item: 'cloth', price: 45 },
      { item: 'linen', price: 38 },
      { item: 'gloomsilk', price: 180 },
    ],
  },
  // Vessa sells the enchanter's shelf at the oldest table in the
  // world, and the deep materials the Arcanum rations.
  {
    id: 'vessa_inscriptions',
    name: 'The Third Table',
    stock: [
      ...trainerStock(['enchanting']),
      { item: recipeScrollId('craft_moonglass_lens'), price: 1100 },
      { item: 'arcane_dust', price: 55 },
      { item: 'stormpearl', price: 120 },
      { item: 'mithril_bar', price: 380 },
    ],
  },
  // Selorne trades in cold light: the stones the glass listens to.
  {
    id: 'selorne_glass',
    name: 'The Moonglass Hall',
    stock: [
      { item: 'moonglass_lens', price: 340 },
      { item: 'frostshard', price: 90 },
      { item: 'moonbell', price: 18 },
      { item: 'dried_moonbell', price: 130 },
      { item: 'arcane_dust', price: 60 },
    ],
  },
  // Faelar sells finished mithril, never ore: the elven way.
  {
    id: 'faelar_fittings',
    name: 'The Mithril Forge',
    stock: [
      { item: 'mithril_bar', price: 400 },
      { item: 'mithril_sword', price: 2900 },
      { item: 'mithril_tanto', price: 3200 },
    ],
  },
  // Corwen weighs what the wood gives and takes a cut.
  {
    id: 'corwen_goods',
    name: 'The Gate Court Stand',
    stock: [
      { item: 'berries', price: 5 },
      { item: 'raw_trout', price: 12 },
      { item: 'honey', price: 48 },
      { item: 'yew_log', price: 120 },
      { item: 'silverbark', price: 140 },
    ],
  },
  // Elarin feeds travelers and collects their idioms in change.
  {
    id: 'elarin_board',
    name: 'The Outward House',
    stock: [
      { item: 'bread', price: 7 },
      { item: 'hearty_stew', price: 22 },
      { item: 'cooked_beef', price: 18 },
      { item: 'milk', price: 7 },
    ],
  },
  // Naia's remedies: gathered, never tilled, and they taste like
  // that on purpose.
  {
    id: 'naia_remedies',
    name: 'The Stillroom',
    stock: [
      { item: 'healing_tincture', price: 62 },
      { item: 'mending_salve', price: 88 },
      { item: 'swiftness_tonic', price: 112 },
      { item: 'ironbark_tonic', price: 132 },
      { item: 'sagewort', price: 10 },
      { item: 'moonbell', price: 16 },
    ],
  },
];

export const SHOPS: ReadonlyMap<string, ShopDef> = new Map(defs.map((d) => [d.id, d]));

export function shopDef(id: string): ShopDef | undefined {
  return SHOPS.get(id);
}

/** Where a beginner first learns each taught trade. */
export interface TrainerPost {
  skill: SkillId;
  /** The teacher's name as the town knows it. */
  teacher: string;
  town: string;
}

// THE BENCH NAMES ITS TEACHERS: the crafting ledger's rumor line
// points at a real door instead of shrugging "trainers somewhere".
// One post per skill — the nearest school for a beginner (Amberford
// is the first craft town; cooking's school moved south with Alba).
// Second-town shelves (Stig, Solvei) stay discoveries of their own.
export const TRAINER_DIRECTORY: readonly TrainerPost[] = [
  { skill: 'smithing', teacher: 'Bretta Ironhewn', town: 'Amberford' },
  { skill: 'leatherworking', teacher: 'Swale', town: 'Amberford' },
  { skill: 'tailoring', teacher: 'Tilo', town: 'Amberford' },
  { skill: 'woodworking', teacher: 'Tilo', town: 'Amberford' },
  { skill: 'herbalism', teacher: 'Elowen', town: 'Amberford' },
  { skill: 'enchanting', teacher: 'Elowen', town: 'Amberford' },
  { skill: 'cooking', teacher: 'Smokemistress Alba', town: 'Saltmere' },
];

export function trainerPostFor(skill: SkillId): TrainerPost | undefined {
  return TRAINER_DIRECTORY.find((p) => p.skill === skill);
}
