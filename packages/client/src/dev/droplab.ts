// TEMPORARY drop verification harness (checked-in tooling): THE DROP
// SHEET — the ground-loot audit for THE DROPPED WORLD. Every ground
// form drawn in a live cell on a grass ground, at the street scale the
// player actually meets loot at, with a tile grid for the body-ruler
// and stack/rarity variant rows. The audits this sheet exists to run:
//   1. SILHOUETTE — does every form read at k=48 (street scale)?
//   2. SCALE — does a sword lie a sword's length, a loaf a loaf's?
//      (grid squares are one tile; the rig stands ~1.15 tiles)
//   3. THE PILE — do stacks read as MORE at a glance?
//   4. THE ROLL — does rarity speak from the dirt before the label?
// Levers:
//   ?k=<px>       px per tile (default 48; try 96 for close read)
//   ?only=<form>  draw only cells whose form matches
import { ITEMS } from '@arx/content';
import { drawGroundDrop, groundForm, type GroundDropEnv } from '../render/groundItems.js';

const canvas = document.getElementById('lab') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const q = new URLSearchParams(location.search);
const K = Number(q.get('k') ?? 48);
const ONLY = q.get('only');

interface Cell {
  label: string;
  itemId: string;
  qty: number;
  roll?: { rar: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'; seed: number };
}

// The curated spread: one row per family neighborhood, breadth first.
const SPREAD: Array<[string, Cell[]]> = [
  ['the armory lies at true scale', [
    { label: 'bronze_sword', itemId: 'bronze_sword', qty: 1 },
    { label: 'steel_scimitar', itemId: 'steel_scimitar', qty: 1 },
    { label: 'iron_dagger', itemId: 'iron_dagger', qty: 1 },
    { label: 'steel_greatblade', itemId: 'steel_greatblade', qty: 1 },
    { label: 'iron_greataxe', itemId: 'iron_greataxe', qty: 1 },
    { label: 'iron_spear', itemId: 'iron_spear', qty: 1 },
    { label: 'watch_halberd', itemId: 'watch_halberd', qty: 1 },
    { label: 'longbow', itemId: 'longbow', qty: 1 },
    { label: 'ember_battlestaff', itemId: 'ember_battlestaff', qty: 1 },
    { label: 'iron_axe (tool)', itemId: 'iron_axe', qty: 1 },
    { label: 'fishing_rod', itemId: 'fishing_rod', qty: 1 },
  ]],
  ['shields & the off hand', [
    { label: 'spiked_buckler', itemId: 'spiked_buckler', qty: 1 },
    { label: 'oak_kiteshield', itemId: 'oak_kiteshield', qty: 1 },
    { label: 'tower_shield', itemId: 'tower_shield', qty: 1 },
    { label: 'tome_of_embers', itemId: 'tome_of_embers', qty: 1 },
    { label: 'arcane_orb', itemId: 'arcane_orb', qty: 1 },
    { label: 'hunters_quiver', itemId: 'hunters_quiver', qty: 1 },
    { label: 'arrow x20', itemId: 'arrow', qty: 20 },
  ]],
  ['the wardrobe: slot bundles x armor class', [
    { label: 'iron_helm (plate)', itemId: 'iron_helm', qty: 1 },
    { label: 'wizards_hat (cloth)', itemId: 'wizards_hat', qty: 1 },
    { label: 'huntsman jerkin (leather)', itemId: 'huntsman_jerkin', qty: 1 },
    { label: 'iron_platebody', itemId: 'iron_platebody', qty: 1 },
    { label: 'emberweave_robe', itemId: 'emberweave_robe', qty: 1 },
    { label: 'iron_greaves', itemId: 'iron_greaves', qty: 1 },
    { label: 'wanderer_boots', itemId: 'wanderer_boots', qty: 1 },
    { label: 'iron_sabatons', itemId: 'iron_sabatons', qty: 1 },
    { label: 'steel_gauntlets', itemId: 'steel_gauntlets', qty: 1 },
    { label: 'cape_traveler', itemId: 'cape_traveler', qty: 1 },
    { label: 'ember_charm (relic)', itemId: 'ember_charm', qty: 1 },
    { label: 'sigil_fallen_champion', itemId: 'sigil_fallen_champion', qty: 1 },
  ]],
  ['the roll speaks: one blade, five tiers', [
    { label: 'common', itemId: 'steel_sword', qty: 1, roll: { rar: 'common', seed: 11 } },
    { label: 'uncommon', itemId: 'steel_sword', qty: 1, roll: { rar: 'uncommon', seed: 11 } },
    { label: 'rare', itemId: 'steel_sword', qty: 1, roll: { rar: 'rare', seed: 11 } },
    { label: 'epic', itemId: 'steel_sword', qty: 1, roll: { rar: 'epic', seed: 11 } },
    { label: 'legendary', itemId: 'steel_sword', qty: 1, roll: { rar: 'legendary', seed: 11 } },
    { label: 'dungeon_key (epic)', itemId: 'dungeon_key', qty: 1, roll: { rar: 'epic', seed: 3 } },
    { label: 'brass_key', itemId: 'brass_key', qty: 1 },
  ]],
  ['raw matter: piles grow with the stack', [
    { label: 'coins x3', itemId: 'coins', qty: 3 },
    { label: 'coins x200', itemId: 'coins', qty: 200 },
    { label: 'iron_bar x1', itemId: 'iron_bar', qty: 1 },
    { label: 'iron_bar x5', itemId: 'iron_bar', qty: 5 },
    { label: 'gold_bar x5', itemId: 'gold_bar', qty: 5 },
    { label: 'oak_log x1', itemId: 'oak_log', qty: 1 },
    { label: 'oak_log x5', itemId: 'oak_log', qty: 5 },
    { label: 'board x10', itemId: 'board', qty: 10 },
    { label: 'iron_ore', itemId: 'iron_ore', qty: 1 },
    { label: 'gold_ore', itemId: 'gold_ore', qty: 1 },
  ]],
  ['fiber, hide & thread', [
    { label: 'leather', itemId: 'leather', qty: 1 },
    { label: 'wolf_fur', itemId: 'wolf_fur', qty: 1 },
    { label: 'fox_pelt', itemId: 'fox_pelt', qty: 1 },
    { label: 'cloth', itemId: 'cloth', qty: 1 },
    { label: 'moonpale_silk', itemId: 'moonpale_silk', qty: 1 },
    { label: 'wool', itemId: 'wool', qty: 1 },
    { label: 'cotton', itemId: 'cotton', qty: 1 },
    { label: 'twine', itemId: 'twine', qty: 1 },
    { label: 'wheat (sheaf)', itemId: 'wheat', qty: 1 },
    { label: 'silverleaf (herb)', itemId: 'silverleaf', qty: 1 },
  ]],
  ['light in stone: gems, dust & trophies', [
    { label: 'ember_essence', itemId: 'ember_essence', qty: 1 },
    { label: 'frost_essence', itemId: 'frost_essence', qty: 1 },
    { label: 'astral_essence', itemId: 'astral_essence', qty: 1 },
    { label: 'arcane_dust', itemId: 'arcane_dust', qty: 1 },
    { label: 'deepking_pearl', itemId: 'deepking_pearl', qty: 1 },
    { label: 'molten_slag', itemId: 'molten_slag', qty: 1 },
    { label: 'bones', itemId: 'bones', qty: 1 },
    { label: 'razorback_tusk x2', itemId: 'razorback_tusk', qty: 2 },
    { label: 'crab_carapace', itemId: 'crab_carapace', qty: 1 },
    { label: 'owl_plume', itemId: 'owl_plume', qty: 1 },
    { label: 'venom_sac', itemId: 'venom_sac', qty: 1 },
  ]],
  ['the written word & keepsakes', [
    { label: 'scroll_keen_edge', itemId: 'scroll_keen_edge', qty: 1 },
    { label: 'scrolls x3', itemId: 'scroll_blazing_edge', qty: 3 },
    { label: 'recipe (cook)', itemId: 'recipe_cook_hearty_stew', qty: 1 },
    { label: 'weathered_letter', itemId: 'weathered_letter', qty: 1 },
    { label: 'gold_ring', itemId: 'gold_ring', qty: 1 },
    { label: 'seal_ring', itemId: 'seal_ring', qty: 1 },
    { label: 'gilded_locket', itemId: 'gilded_locket', qty: 1 },
    { label: 'reavers_mark', itemId: 'reavers_mark', qty: 1 },
    { label: 'sand_laurel', itemId: 'sand_laurel', qty: 1 },
  ]],
  ['the garden', [
    { label: 'carrot_seed', itemId: 'carrot_seed', qty: 1 },
    { label: 'apple_sapling', itemId: 'apple_sapling', qty: 1 },
    { label: 'willow_cutting', itemId: 'willow_cutting', qty: 1 },
    { label: 'acorn', itemId: 'acorn', qty: 1 },
    { label: 'pine_cone', itemId: 'pine_cone', qty: 1 },
    { label: 'pine_resin', itemId: 'pine_resin', qty: 1 },
    { label: 'beeswax', itemId: 'beeswax', qty: 1 },
    { label: 'flour (sack)', itemId: 'flour', qty: 1 },
    { label: 'compost', itemId: 'compost', qty: 1 },
    { label: 'prime_compost', itemId: 'prime_compost', qty: 1 },
    { label: 'watering_can', itemId: 'watering_can', qty: 1 },
  ]],
  ['the larder I: field & water', [
    { label: 'raw_trout', itemId: 'raw_trout', qty: 1 },
    { label: 'raw_eel', itemId: 'raw_eel', qty: 1 },
    { label: 'glimmerfish x3', itemId: 'raw_glimmerfish', qty: 3 },
    { label: 'raw_chicken', itemId: 'raw_chicken', qty: 1 },
    { label: 'cooked_chicken', itemId: 'cooked_chicken', qty: 1 },
    { label: 'raw_beef', itemId: 'raw_beef', qty: 1 },
    { label: 'cooked_beef', itemId: 'cooked_beef', qty: 1 },
    { label: 'egg x3', itemId: 'egg', qty: 3 },
    { label: 'burnt_food', itemId: 'burnt_food', qty: 1 },
  ]],
  ['the larder II: harvest', [
    { label: 'carrot x3', itemId: 'carrot', qty: 3 },
    { label: 'potato', itemId: 'potato', qty: 1 },
    { label: 'onion', itemId: 'onion', qty: 1 },
    { label: 'cabbage', itemId: 'cabbage', qty: 1 },
    { label: 'pumpkin', itemId: 'pumpkin', qty: 1 },
    { label: 'apple x3 (prime)', itemId: 'apple_prime', qty: 3 },
    { label: 'berries', itemId: 'berries', qty: 1 },
    { label: 'truffle', itemId: 'truffle', qty: 1 },
  ]],
  ['the larder III: the table', [
    { label: 'bread', itemId: 'bread', qty: 1 },
    { label: 'cake', itemId: 'cake', qty: 1 },
    { label: 'pumpkin_pie', itemId: 'pumpkin_pie', qty: 1 },
    { label: 'hearty_stew', itemId: 'hearty_stew', qty: 1 },
    { label: 'buttered_potatoes', itemId: 'buttered_potatoes', qty: 1 },
    { label: 'royal_banquet', itemId: 'royal_banquet', qty: 1 },
    { label: 'butter', itemId: 'butter', qty: 1 },
    { label: 'hard_cheese', itemId: 'hard_cheese', qty: 1 },
    { label: 'fried_egg', itemId: 'fried_egg', qty: 1 },
    { label: 'milk (pail)', itemId: 'milk', qty: 1 },
    { label: 'honey', itemId: 'honey', qty: 1 },
    { label: 'farmhouse_ale', itemId: 'farmhouse_ale', qty: 1 },
    { label: 'pickled_cabbage', itemId: 'pickled_cabbage', qty: 1 },
  ]],
  ['the apothecary', [
    { label: 'healing_tincture', itemId: 'healing_tincture', qty: 1 },
    { label: 'tinctures x3', itemId: 'healing_tincture', qty: 3 },
    { label: 'swiftness_tonic', itemId: 'swiftness_tonic', qty: 1 },
    { label: 'master_draught', itemId: 'master_draught', qty: 1 },
    { label: 'dawnfire_elixir', itemId: 'dawnfire_elixir', qty: 1 },
    { label: 'adderfang_oil', itemId: 'adderfang_oil', qty: 1 },
    { label: 'vipers_kiss', itemId: 'vipers_kiss', qty: 1 },
    { label: 'mending_salve', itemId: 'mending_salve', qty: 1 },
  ]],
  ['husbandry & the road', [
    { label: 'chick_crate', itemId: 'chick_crate', qty: 1 },
    { label: 'calf_crate', itemId: 'calf_crate', qty: 1 },
    { label: 'drovers_lead', itemId: 'drovers_lead', qty: 1 },
    { label: 'bay_courser (saddle)', itemId: 'bay_courser', qty: 1 },
    { label: 'night_sabercat', itemId: 'night_sabercat', qty: 1 },
  ]],
];

const CELL_W = Math.max(150, K * 3.2);
const CELL_H = Math.max(140, K * 3.0);
const COLS = Math.floor(1720 / CELL_W);
const HEAD = 34;

function layout(): Array<{ title: string; cells: Cell[]; rows: number }> {
  const rows = SPREAD.filter(([, cells]) =>
    !ONLY || cells.some((c) => groundForm(c.itemId) === ONLY),
  ).map(([title, cells]) => ({
    title,
    cells: ONLY ? cells.filter((c) => groundForm(c.itemId) === ONLY) : cells,
    rows: 0,
  }));
  let total = 0;
  for (const r of rows) {
    r.rows = Math.max(1, Math.ceil(r.cells.length / COLS));
    total += r.rows;
  }
  canvas.height = rows.length * HEAD + total * CELL_H + 40;
  return rows;
}

const ROWS = layout();

// Missing ids die loudly, not as blank cells.
for (const [, cells] of SPREAD) {
  for (const c of cells) {
    if (!ITEMS.get(c.itemId) && c.itemId !== 'unknown') {
      console.warn(`droplab: ${c.itemId} is not in ITEMS`);
    }
  }
}

function frame(now: number): void {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // The street: a grass ground with the tile grid for the body-ruler.
  ctx.fillStyle = '#4a5d3a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = 'rgba(36, 26, 46, 0.14)';
  ctx.lineWidth = 1;
  for (let x = 0; x < canvas.width; x += K) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += K) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  let y = 8;
  let eid = 100;
  for (const row of ROWS) {
    ctx.fillStyle = '#f0e8d4';
    ctx.font = '600 15px Trebuchet MS';
    ctx.textAlign = 'left';
    ctx.fillText(row.title.toUpperCase(), 12, y + 20);
    y += HEAD;
    row.cells.forEach((c, i) => {
      const col = i % COLS;
      const r = Math.floor(i / COLS);
      const cx = col * CELL_W + CELL_W / 2;
      const cy = y + r * CELL_H + CELL_H * 0.62;
      // Contact shadow the renderer would cast.
      ctx.save();
      ctx.translate(cx, cy);
      ctx.fillStyle = 'rgba(20, 14, 8, 0.3)';
      ctx.beginPath();
      ctx.ellipse(0, K * 0.05, K * 0.3, K * 0.13, 0, 0, Math.PI * 2);
      ctx.fill();
      const env: GroundDropEnv = {
        ctx,
        k: K,
        eid: eid++,
        itemId: c.itemId,
        qty: c.qty,
        now,
        outline: '#241a2e',
        hovered: false,
        roll: c.roll as GroundDropEnv['roll'],
      };
      try {
        drawGroundDrop(env);
      } catch (e) {
        ctx.fillStyle = '#ff5050';
        ctx.fillRect(-K * 0.3, -K * 0.5, K * 0.6, K * 0.5);
        console.error(c.itemId, e);
      }
      ctx.restore();
      ctx.fillStyle = 'rgba(240, 232, 212, 0.85)';
      ctx.font = '11px Trebuchet MS';
      ctx.textAlign = 'center';
      ctx.fillText(`${c.label}`, cx, y + r * CELL_H + CELL_H - 8);
    });
    y += row.rows * CELL_H;
  }
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
