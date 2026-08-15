import { Rng, TILE_SKIP, Tile, hashString } from '@arx/shared';
import type { PrefabDef } from '../maps/prefab.js';

/**
 * THE INFLUENCE LAW (the hybrid charter, second rung) — every ordinary
 * POI grows from a stamp into a TERRITORY: the authored sketch stays
 * verbatim as the concentrated HEART, and a generated outskirt ring
 * gives it the ground an occupied place actually works — worked
 * patches, a satellite pocket or two, sparse family litter thinning
 * with distance, worn tracks walking out. The heart is dense; the
 * edges breathe; the muster spreads with the footprint (compose's
 * hold radius and knot splits read the dims), so the camp is taken in
 * pulls across real ground instead of one brawl on a postage stamp.
 *
 * Deterministic per prefab id — the same territory forever (pinned-
 * seed authorship, the Foundry law). The heart's tiles, spawn
 * markers, and portals are BIT-IDENTICAL, only translated to the new
 * center: curation on the sketches survives expansion untouched.
 *
 * Exemptions: compound courts (their constellation is the WINGS),
 * the five landmarks (born expansive), and minor finds (texture is
 * texture). Wing-pool prefabs cap small so compounds keep fitting
 * their cell; quiet wayside types cap gentler than war-camps.
 */

interface Vocab {
  /** Litter that thins with distance from the heart. */
  litter: readonly Tile[];
  /** A satellite pocket's dressing (around a small worked patch). */
  pocket: readonly Tile[];
  /** Camp families keep a pocket fire; the dead and the wild do not. */
  fire?: Tile;
}

const VOCABS: ReadonlyArray<[RegExp, Vocab]> = [
  [/^poi_(goblin|warhold)/, { litter: [Tile.SkullPile, Tile.BonePile, Tile.WarBanner], pocket: [Tile.TentHide, Tile.MeatRack, Tile.SkullPile], fire: Tile.Campfire }],
  [/^poi_(bandit|stockade|raider|barrow_diggers|wardline)/, { litter: [Tile.Crate, Tile.Barrel, Tile.CaveRubble], pocket: [Tile.TentHide, Tile.Crate, Tile.PlunderSacks], fire: Tile.Campfire }],
  [/^poi_(den|greatden)/, { litter: [Tile.BonePile, Tile.SkullPile], pocket: [Tile.BeastNest, Tile.BonePile, Tile.HideFrame] }],
  [/^poi_(gnoll)/, { litter: [Tile.BonePile, Tile.SkullPile], pocket: [Tile.TentHide, Tile.MeatSpit, Tile.SkullPile], fire: Tile.Campfire }],
  // Skral litter is the CATCH: racks, frames, and fish-bone middens —
  // a shoal's verge smells of smoke and low tide from the road.
  // THE BANKS GET THEIR GOODS: the shoal's verge smells of low tide,
  // not woodsmoke — shell heaps, drying racks, and sprung traps where
  // the war camp would drop bones and hides.
  [/^poi_(skral)/, { litter: [Tile.ShellMidden, Tile.FishRack, Tile.FishTrap], pocket: [Tile.NetFrame, Tile.FishRack, Tile.ShellMidden], fire: Tile.Campfire }],
  // Ogre litter is FURNITURE-sized: whole middens, whole skulls, the
  // meat economy of a body that eats a cow a day. The fire is the
  // great bonfire — an ogre camp reads from a hilltop away.
  [/^poi_(ogre)/, { litter: [Tile.BonePile, Tile.SkullPile, Tile.MeatRack], pocket: [Tile.SkullPile, Tile.MeatSpit, Tile.PlunderSacks], fire: Tile.Bonfire }],
  [/^poi_(fell|barrow_ring|watchtower|ruin|riftgate|hoargate|champions)/, { litter: [Tile.CaveRubble, Tile.Rock, Tile.BonePile], pocket: [Tile.PillarStone, Tile.Rock, Tile.CaveRubble] }],
  [/^poi_(digs)/, { litter: [Tile.CaveRubble, Tile.Rock], pocket: [Tile.Rock, Tile.CaveRubble, Tile.Barrel] }],
  [/^poi_(lair)/, { litter: [Tile.BonePile, Tile.Rock], pocket: [Tile.Rock, Tile.BonePile] }],
  [/^poi_(roost)/, { litter: [Tile.BonePile, Tile.Stump], pocket: [Tile.Tree, Tile.BonePile] }],
];

const NEUTRAL: Vocab = { litter: [Tile.Rock, Tile.Stump, Tile.BerryBush], pocket: [Tile.Rock, Tile.GrassTall, Tile.BerryBush] };

/**
 * Wing-pool prefabs: compounds must keep fitting their cell AND their
 * wings must keep finding ground on the court's ring — 20 measured
 * (26 starved the war-grounds of wings entirely).
 */
const WING_CAP = new Set([
  'poi_goblin_camp_ring',
  'poi_goblin_camp_pair',
  'poi_bandit_hollow',
  'poi_den_bones',
  'poi_den_hollow',
  // THE TIDEHOLD's wing pool — the shoal camps ring the court the way
  // the goblin camps ring the warhold, and pay the same rent.
  'poi_skral_weir',
  'poi_skral_midden',
  'poi_skral_wreck',
  'poi_skral_drying',
]);

/** Quiet wayside types: expanded gently, never into a sprawl. */
const QUIET_CAP = new Set([
  'poi_wayshrine_stones',
  'poi_wayshrine_pool',
  'poi_grove_ore',
  'poi_grove_yew',
  'poi_grove_spring',
  'poi_peddler_rest',
  'poi_hamlet_croft',
  'poi_hamlet_pair',
  'poi_company_tollhouse',
]);

/**
 * MEASURED caps — the authored pins are the law: every coordinate-
 * pinned site was probed against its whole prefab pool (≤10% rough
 * within the 14-tile nudge), and the tightest verge sizes its type.
 * The longmeadow milepost takes 18; the Hoargate's shelf takes 48;
 * a toll bar hugs a road bend at 22; the diggers' fell bench at 32.
 */
const MEASURED_CAP = new Map<string, number>([
  // The spineshelf ledge is wedged between Silverfall's clearance and
  // the crag rough — waystations keep their ORIGINAL footprints (a
  // rest is furniture; the world's ledges were sized for it).
  ['poi_waystation_camp', 13],
  ['poi_waystation_rest', 15],
  ['poi_waystation_walled', 15],
  ['poi_bandit_toll', 22],
  ['poi_barrow_diggers', 24],
  ['poi_hoargate', 48],
  // The high fells hold no room: the barrow cell (5,-4) takes ONLY
  // the original footprints — the fell theme IS scarce rocky ground
  // (the def's approach cues carry the influence read instead).
  ['poi_fell_barrow', 17],
  ['poi_barrow_ring', 11],
]);

/** Untouched: courts, landmarks, finds. */
const EXEMPT = new Set([
  'poi_warhold_court',
  'poi_stockade_court',
  'poi_greatden_court',
  'poi_skral_court',
  'poi_barrowfield_great',
  'poi_ruin_greatkeep',
  'poi_goblin_sprawl',
  'poi_wolfkin_killfield',
  'poi_brigand_waystead',
  // THE PEOPLED LANDMARKS: born expansive, born peopled.
  'poi_goblin_warren',
  'poi_goblin_mootfield',
  'poi_goblin_grubfarm',
  'poi_goblin_warstage',
  'poi_dead_chapel',
  'poi_dead_muster',
  'poi_dead_cloister',
  'poi_dead_kingsrow',
]);

export function expandInfluence(prefab: PrefabDef): PrefabDef {
  if (EXEMPT.has(prefab.id) || !prefab.id.startsWith('poi_')) return prefab;
  const { width: ow, height: oh } = prefab;
  const orig = Math.max(ow, oh);
  const cap = MEASURED_CAP.get(prefab.id) ?? (WING_CAP.has(prefab.id) ? 20 : QUIET_CAP.has(prefab.id) ? 30 : 64);
  const target = Math.min(cap, Math.max(Math.min(34, cap), Math.round(orig * 2.6)));
  if (target <= orig) return prefab;
  const s = target / orig;
  const w = Math.min(90, Math.round(ow * s));
  const h = Math.min(90, Math.round(oh * s));
  const g = new Uint16Array(w * h).fill(TILE_SKIP);
  const rng = new Rng(hashString(prefab.id) ^ 0x1f7);
  const vocab = VOCABS.find(([re]) => re.test(prefab.id))?.[1] ?? NEUTRAL;

  const put = (x: number, y: number, t: Tile): void => {
    if (x < 1 || y < 1 || x >= w - 1 || y >= h - 1) return; // skip perimeter
    g[y * w + x] = t;
  };
  const at = (x: number, y: number): number =>
    x >= 0 && y >= 0 && x < w && y < h ? g[y * w + x]! : TILE_SKIP;

  // The HEART: the authored sketch, verbatim, centered.
  const hx0 = Math.floor((w - ow) / 2);
  const hy0 = Math.floor((h - oh) / 2);
  for (let y = 0; y < oh; y++) {
    for (let x = 0; x < ow; x++) {
      const t = prefab.ground[y * ow + x]!;
      if (t !== TILE_SKIP) g[(hy0 + y) * w + (hx0 + x)] = t;
    }
  }
  const cx = w >> 1;
  const cy = h >> 1;
  const heartR = Math.max(ow, oh) / 2;
  const rimR = Math.min(w, h) / 2 - 2;

  // Worked patches: the ground an occupied place actually uses.
  const patches = 3 + rng.int(0, 3);
  for (let i = 0; i < patches; i++) {
    const a = rng.range(0, Math.PI * 2);
    const d = rng.range(heartR + 2, Math.max(heartR + 3, rimR - 3));
    const px = Math.round(cx + Math.cos(a) * d);
    const py = Math.round(cy + Math.sin(a) * d * (h / w));
    const pr = rng.int(2, 4);
    for (let dy = -pr; dy <= pr; dy++) {
      for (let dx = -pr; dx <= pr; dx++) {
        if (dx * dx + dy * dy > pr * pr + rng.int(0, 2)) continue;
        if (at(px + dx, py + dy) === TILE_SKIP) {
          put(px + dx, py + dy, rng.chance(0.25) ? Tile.GrassTall : Tile.Grass);
        }
      }
    }
  }

  // Satellite pockets: a couple of folks worked THIS ground too.
  const pockets = 1 + rng.int(0, 1) + (target >= 48 ? 1 : 0);
  for (let i = 0; i < pockets; i++) {
    const a = rng.range(0, Math.PI * 2);
    const d = rng.range(heartR + 4, Math.max(heartR + 5, rimR - 2));
    const px = Math.round(cx + Math.cos(a) * d);
    const py = Math.round(cy + Math.sin(a) * d * (h / w));
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        if (dx * dx + dy * dy > 5) continue;
        if (at(px + dx, py + dy) === TILE_SKIP) put(px + dx, py + dy, Tile.Dirt);
      }
    }
    if (vocab.fire && rng.chance(0.7)) put(px, py, vocab.fire);
    const props = rng.int(2, 3);
    for (let p = 0; p < props; p++) {
      const ox = px + rng.int(-2, 2);
      const oy = py + rng.int(-2, 2);
      if (at(ox, oy) === Tile.Dirt) put(ox, oy, vocab.pocket[rng.int(0, vocab.pocket.length - 1)]!);
    }
    // The pocket remembers the heart: a worn line between them.
    let tx = px;
    let ty = py;
    for (let guard = 0; guard < 200 && (Math.abs(tx - cx) > heartR - 2 || Math.abs(ty - cy) > heartR - 2); guard++) {
      if (at(tx, ty) === TILE_SKIP && rng.chance(0.8)) put(tx, ty, Tile.Dirt);
      if (tx !== cx && (ty === cy || rng.chance(0.55))) tx += Math.sign(cx - tx);
      else if (ty !== cy) ty += Math.sign(cy - ty);
    }
  }

  // Litter, thinning with distance — influence FADES, never stops dead.
  const litterCount = Math.round((w * h) / 90);
  for (let i = 0; i < litterCount; i++) {
    const a = rng.range(0, Math.PI * 2);
    // Bias toward the heart edge: square the unit roll.
    const u = rng.range(0, 1);
    const d = heartR + 1 + u * u * Math.max(1, rimR - heartR - 1);
    const lx = Math.round(cx + Math.cos(a) * d);
    const ly = Math.round(cy + Math.sin(a) * d * (h / w));
    if (at(lx, ly) !== TILE_SKIP) continue;
    put(lx, ly, vocab.litter[rng.int(0, vocab.litter.length - 1)]!);
  }

  // Worn tracks out of the heart: the ways in are the ways picked off.
  const tracks = 2 + rng.int(0, 1);
  for (let i = 0; i < tracks; i++) {
    const a = rng.range(0, Math.PI * 2);
    let fade = 1;
    for (let d = heartR - 1; d < rimR; d++) {
      const tx = Math.round(cx + Math.cos(a) * d);
      const ty = Math.round(cy + Math.sin(a) * d * (h / w));
      if (at(tx, ty) === TILE_SKIP && rng.chance(fade)) put(tx, ty, Tile.Dirt);
      fade *= 0.94;
    }
  }

  return {
    ...prefab,
    width: w,
    height: h,
    ground: g,
    detail: new Uint16Array(w * h),
    elev: new Int8Array(w * h),
    spawns: prefab.spawns.map((sp) => ({ ...sp, dx: sp.dx + hx0, dy: sp.dy + hy0 })),
    portals: prefab.portals.map((pt) => ({ ...pt, dx: pt.dx + hx0, dy: pt.dy + hy0 })),
    actorSpawns: prefab.actorSpawns.map((asp) => ({ ...asp, dx: asp.dx + hx0, dy: asp.dy + hy0 })),
    ...(prefab.routes
      ? { routes: prefab.routes.map((r) => ({ pts: r.pts.map((p) => ({ ...p, dx: p.dx + hx0, dy: p.dy + hy0 })) })) }
      : {}),
  };
}
