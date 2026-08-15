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
 * THE DECLARED TERRITORY (the audit's seventh debt paid): a prefab's
 * influence treatment is a property declared AT ITS OWN REGISTRATION
 * — `declareInfluence(sketch(...), { cap/exempt/vocab })` — never a
 * membership in a hand-list kept in THIS far file. The old EXEMPT/
 * WING_CAP/QUIET_CAP/MEASURED_CAP sets are gone: a wing camp that
 * missed its list silently sprawled to the open 64 cap, a landmark
 * that missed its list got its curated art buried in generated litter
 * — now the declaration rides the definition and there is no second
 * file to remember.
 *
 * Exemptions (declared where the prefabs are built): compound courts
 * (their constellation is the WINGS), the landmark shelf (born
 * expansive), and minor finds (texture is texture — their ids never
 * enter the poi_ namespace, so they pass through here by name).
 */

interface Vocab {
  /** Litter that thins with distance from the heart. */
  litter: readonly Tile[];
  /** A satellite pocket's dressing (around a small worked patch). */
  pocket: readonly Tile[];
  /** Camp families keep a pocket fire; the dead and the wild do not. */
  fire?: Tile;
}

/**
 * The scatter vocabularies, NAMED so a declaration can claim one
 * outright (`vocab: 'skral'`) when its id reads wrong for its family.
 */
const VOCAB = {
  warband: { litter: [Tile.SkullPile, Tile.BonePile, Tile.WarBanner], pocket: [Tile.TentHide, Tile.MeatRack, Tile.SkullPile], fire: Tile.Campfire },
  plunder: { litter: [Tile.Crate, Tile.Barrel, Tile.CaveRubble], pocket: [Tile.TentHide, Tile.Crate, Tile.PlunderSacks], fire: Tile.Campfire },
  den: { litter: [Tile.BonePile, Tile.SkullPile], pocket: [Tile.BeastNest, Tile.BonePile, Tile.HideFrame] },
  gnoll: { litter: [Tile.BonePile, Tile.SkullPile], pocket: [Tile.TentHide, Tile.MeatSpit, Tile.SkullPile], fire: Tile.Campfire },
  // Skral litter is the CATCH: racks, frames, and fish-bone middens —
  // a shoal's verge smells of smoke and low tide from the road.
  // THE BANKS GET THEIR GOODS: the shoal's verge smells of low tide,
  // not woodsmoke — shell heaps, drying racks, and sprung traps where
  // the war camp would drop bones and hides.
  skral: { litter: [Tile.ShellMidden, Tile.FishRack, Tile.FishTrap], pocket: [Tile.NetFrame, Tile.KelpLine, Tile.WithyStore], fire: Tile.Campfire },
  // Ogre litter is FURNITURE-sized: whole middens, whole skulls, the
  // meat economy of a body that eats a cow a day. The fire is the
  // great bonfire — an ogre camp reads from a hilltop away.
  ogre: { litter: [Tile.BonePile, Tile.SkullPile, Tile.MeatRack], pocket: [Tile.SkullPile, Tile.MeatSpit, Tile.PlunderSacks], fire: Tile.Bonfire },
  oldstone: { litter: [Tile.CaveRubble, Tile.Rock, Tile.BonePile], pocket: [Tile.PillarStone, Tile.Rock, Tile.CaveRubble] },
  digs: { litter: [Tile.CaveRubble, Tile.Rock], pocket: [Tile.Rock, Tile.CaveRubble, Tile.Barrel] },
  lair: { litter: [Tile.BonePile, Tile.Rock], pocket: [Tile.Rock, Tile.BonePile] },
  roost: { litter: [Tile.BonePile, Tile.Stump], pocket: [Tile.Tree, Tile.BonePile] },
  neutral: { litter: [Tile.Rock, Tile.Stump, Tile.BerryBush], pocket: [Tile.Rock, Tile.GrassTall, Tile.BerryBush] },
} as const satisfies Record<string, Vocab>;

export type InfluenceVocab = keyof typeof VOCAB;

/**
 * The FAMILY fallback for ids that declare no vocab: a new
 * `poi_goblin_*` camp reads as a war-band without saying so — the
 * prefix IS the family. A declaration's `vocab` outranks this read.
 */
const VOCAB_OF: ReadonlyArray<[RegExp, InfluenceVocab]> = [
  [/^poi_(goblin|warhold)/, 'warband'],
  [/^poi_(bandit|stockade|raider|barrow_diggers|wardline)/, 'plunder'],
  [/^poi_(den|greatden)/, 'den'],
  [/^poi_(gnoll)/, 'gnoll'],
  [/^poi_(skral)/, 'skral'],
  [/^poi_(ogre)/, 'ogre'],
  [/^poi_(fell|barrow_ring|watchtower|ruin|riftgate|hoargate|champions)/, 'oldstone'],
  [/^poi_(digs)/, 'digs'],
  [/^poi_(lair)/, 'lair'],
  [/^poi_(roost)/, 'roost'],
];

/**
 * A prefab's declared influence treatment — passed at the definition
 * site through `declareInfluence`, read here at expansion.
 */
export interface PrefabInfluence {
  /**
   * Territory cap: the expanded long axis never exceeds this (absent
   * = the open 64). MEASURED caps are the authored pins' law: every
   * coordinate-pinned site was probed against its whole prefab pool
   * (≤10% rough within the 14-tile nudge), and the tightest verge
   * sizes its type — the Hoargate's shelf takes 48; a toll bar hugs
   * a road bend at 22; the diggers' fell bench at 24.
   */
  cap?: number;
  /** Pass through untouched: courts, landmarks — anything born whole. */
  exempt?: true;
  /** Claim a scatter vocabulary by name (absent = the family read). */
  vocab?: InfluenceVocab;
}

/**
 * Wing-pool prefabs: compounds must keep fitting their cell AND their
 * wings must keep finding ground on the court's ring — 20 measured
 * (26 starved the war-grounds of wings entirely).
 */
export const WING_POOL_CAP = 20;

/** Quiet wayside types: expanded gently, never into a sprawl. */
export const QUIET_WAYSIDE_CAP = 30;

/** The open country's default: an ordinary camp takes a real verge. */
const OPEN_CAP = 64;

const DECLARED = new Map<string, PrefabInfluence>();

/**
 * Register a prefab's influence declaration AT its definition —
 * `const camp = declareInfluence(sketch(...), { cap: WING_POOL_CAP })`
 * — and hand the prefab back untouched. ONE VOICE PER ID: a second
 * declaration is a copy-paste error, and it throws at module load so
 * the mistake never ships as a silent last-writer-wins.
 */
export function declareInfluence<T extends PrefabDef>(prefab: T, influence: PrefabInfluence): T {
  if (DECLARED.has(prefab.id)) throw new Error(`influence for '${prefab.id}' declared twice`);
  DECLARED.set(prefab.id, influence);
  return prefab;
}

export function expandInfluence(prefab: PrefabDef): PrefabDef {
  const decl = DECLARED.get(prefab.id);
  if (decl?.exempt || !prefab.id.startsWith('poi_')) return prefab;
  const { width: ow, height: oh } = prefab;
  const orig = Math.max(ow, oh);
  const cap = decl?.cap ?? OPEN_CAP;
  const target = Math.min(cap, Math.max(Math.min(34, cap), Math.round(orig * 2.6)));
  if (target <= orig) return prefab;
  const s = target / orig;
  const w = Math.min(90, Math.round(ow * s));
  const h = Math.min(90, Math.round(oh * s));
  const g = new Uint16Array(w * h).fill(TILE_SKIP);
  const rng = new Rng(hashString(prefab.id) ^ 0x1f7);
  const vocab: Vocab = VOCAB[decl?.vocab ?? VOCAB_OF.find(([re]) => re.test(prefab.id))?.[1] ?? 'neutral'];

  const put = (x: number, y: number, t: Tile): void => {
    if (x < 1 || y < 1 || x >= w - 1 || y >= h - 1) return; // skip perimeter
    g[y * w + x] = t;
  };
  const at = (x: number, y: number): number =>
    x >= 0 && y >= 0 && x < w && y < h ? g[y * w + x]! : TILE_SKIP;

  // The HEART: the authored sketch, verbatim, centered — ALL THREE
  // layers. detail and elev used to be replaced with empty planes
  // here, which quietly contradicted the header's own BIT-IDENTICAL
  // contract: the first detail-bearing POI prefab would have
  // flattened at expansion. They blit beside ground now (straight
  // rect copies — the outskirt ring stays empty, so the heart is the
  // only thing either plane carries).
  const hx0 = Math.floor((w - ow) / 2);
  const hy0 = Math.floor((h - oh) / 2);
  for (let y = 0; y < oh; y++) {
    for (let x = 0; x < ow; x++) {
      const t = prefab.ground[y * ow + x]!;
      if (t !== TILE_SKIP) g[(hy0 + y) * w + (hx0 + x)] = t;
    }
  }
  const dt = new Uint16Array(w * h);
  const ev = new Int8Array(w * h);
  for (let y = 0; y < oh; y++) {
    dt.set(prefab.detail.subarray(y * ow, (y + 1) * ow), (hy0 + y) * w + hx0);
    ev.set(prefab.elev.subarray(y * ow, (y + 1) * ow), (hy0 + y) * w + hx0);
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
    detail: dt,
    elev: ev,
    spawns: prefab.spawns.map((sp) => ({ ...sp, dx: sp.dx + hx0, dy: sp.dy + hy0 })),
    portals: prefab.portals.map((pt) => ({ ...pt, dx: pt.dx + hx0, dy: pt.dy + hy0 })),
    actorSpawns: prefab.actorSpawns.map((asp) => ({ ...asp, dx: asp.dx + hx0, dy: asp.dy + hy0 })),
    ...(prefab.routes
      ? { routes: prefab.routes.map((r) => ({ pts: r.pts.map((p) => ({ ...p, dx: p.dx + hx0, dy: p.dy + hy0 })) })) }
      : {}),
  };
}
