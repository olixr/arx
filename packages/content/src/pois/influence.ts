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
  /**
   * THE CLAIM MARK (docs/contested-lands-plan.md §2, §6 family E): the
   * one prop that says at a glance WHOSE ground you are on. Planted at
   * the trailheads — where the worn tracks leave the territory — never
   * more than two per territory, never in the litter roll (a glyph is
   * not litter). Absent = this people claims nothing (the dead, the
   * wild, the gloom).
   */
  mark?: Tile;
  /**
   * The mark this vocab flies INSTEAD when the site stands within
   * trailReach of a carved road (the road-faith law: a lamp cairn
   * never lies about a road being there). Read only through the
   * `nearRoad` option of `expandInfluence` / `claimMarkOf`; the
   * prefab shelf expands with no site under it, so the shelf never
   * flies this one on its own.
   */
  roadMark?: Tile;
}

/**
 * The scatter vocabularies, NAMED so a declaration can claim one
 * outright (`vocab: 'skral'`) when its id reads wrong for its family.
 */
const VOCAB = {
  // THE MARKS (contested lands K2): each people that CLAIMS ground
  // flies its glyph at the trailheads. The goblins' skull totem stays
  // their word; the Legion's crimson square, the Company's red rag,
  // the pack's bone tree, the kobolds' tally stone and the towns'
  // charter post join it. The dead, the wild and the gloom claim
  // nothing and fly nothing.
  warband: { litter: [Tile.SkullPile, Tile.BonePile, Tile.WarBanner], pocket: [Tile.TentHide, Tile.MeatRack, Tile.SkullPile], fire: Tile.Campfire, mark: Tile.SkullTotem },
  // THE LEGION (hobgoblins): drilled and square — barriers, banners,
  // supply on the verge, never a skull pile (they do not dig cairns
  // and they tend their wounded). Their standard is the one crimson
  // square. `poi_hob_*` used to fall to the neutral rocks-and-berries
  // read, which put a hedgerow round a muster-yard.
  legion: { litter: [Tile.SpikeBarrier, Tile.WarBanner, Tile.Crate], pocket: [Tile.TentHide, Tile.Crate, Tile.SpikeBarrier], fire: Tile.Campfire, mark: Tile.LegionStandard },
  plunder: { litter: [Tile.Crate, Tile.Barrel, Tile.CaveRubble], pocket: [Tile.TentHide, Tile.Crate, Tile.PlunderSacks], fire: Tile.Campfire, mark: Tile.RedRagStake },
  den: { litter: [Tile.BonePile, Tile.SkullPile], pocket: [Tile.BeastNest, Tile.BonePile, Tile.HideFrame], mark: Tile.BoneTree },
  // The husk warband's word is the midden (plan §2): they eat here.
  gnoll: { litter: [Tile.BonePile, Tile.SkullPile], pocket: [Tile.TentHide, Tile.MeatSpit, Tile.SkullPile], fire: Tile.Campfire, mark: Tile.BoneMidden },
  // Skral litter is the CATCH: racks, frames, and fish-bone middens —
  // a shoal's verge smells of smoke and low tide from the road.
  // THE BANKS GET THEIR GOODS: the shoal's verge smells of low tide,
  // not woodsmoke — shell heaps, drying racks, and sprung traps where
  // the war camp would drop bones and hides.
  skral: { litter: [Tile.ShellMidden, Tile.FishRack, Tile.FishTrap], pocket: [Tile.NetFrame, Tile.KelpLine, Tile.WithyStore], fire: Tile.Campfire, mark: Tile.TideTotem },
  // Ogre litter is FURNITURE-sized: whole middens, whole skulls, the
  // meat economy of a body that eats a cow a day. The fire is the
  // great bonfire — an ogre camp reads from a hilltop away.
  ogre: { litter: [Tile.BonePile, Tile.SkullPile, Tile.MeatRack], pocket: [Tile.SkullPile, Tile.MeatSpit, Tile.PlunderSacks], fire: Tile.Bonfire },
  oldstone: { litter: [Tile.CaveRubble, Tile.Rock, Tile.BonePile], pocket: [Tile.PillarStone, Tile.Rock, Tile.CaveRubble] },
  // THE DIGS: the kobolds' tally stone counts the verge, and the verge
  // is what they threw out of the ground — the spoil heap (K4, family
  // C) joins the rubble in the roll and heads every pocket (a pocket
  // is a trial pit: its spoil beside it, a barrel for the water).
  digs: { litter: [Tile.CaveRubble, Tile.SpoilHeap, Tile.Rock], pocket: [Tile.SpoilHeap, Tile.CaveRubble, Tile.Barrel], mark: Tile.TallyStone },
  lair: { litter: [Tile.BonePile, Tile.Rock], pocket: [Tile.Rock, Tile.BonePile] },
  roost: { litter: [Tile.BonePile, Tile.Stump], pocket: [Tile.Tree, Tile.BonePile] },
  // THE RUIN (family A, the cold hearth): what a burning leaves on its
  // own verge — ash shovelled out, beams that fell short of the door,
  // and a satellite pocket that is the outbuilding that burned too,
  // its ember bed the night tell (the family's own fire, LEFT
  // BURNING) — and the field litter (K3, family B): whoever burned it
  // was fought at the door, and what the fight dropped lies on the
  // verge with the ash.
  ruin: { litter: [Tile.AshHeap, Tile.CharredBeam, Tile.FieldLitter], pocket: [Tile.CharredBeam, Tile.AshHeap, Tile.FieldLitter], fire: Tile.EmberBed },
  // THE FIELD (family B, the field after): open ground where two sides
  // met. The verge is what the fight dropped — litter, twice over, and
  // a cairn somebody knocked flat walking through; a pocket is a knot
  // that stood and died together: the cairn raised over them, their
  // litter, a post bristling with the archers' misses. No fire (nobody
  // stayed), no mark (the dead claim nothing).
  field: { litter: [Tile.FieldLitter, Tile.FieldLitter, Tile.CairnFallen], pocket: [Tile.FieldCairn, Tile.FieldLitter, Tile.ArrowPost] },
  // THE DISPLACED (family F): the muster ground's verge is what people
  // set down when they stopped running — a crate, a cask, a bedroll
  // slept in out past the lean-tos; a pocket is one more household
  // that pitched apart from the rest, its fire an EMBER BED (a cooking
  // fire banked by day — never a Campfire, plan §7.3). No mark: the
  // displaced claim nothing, they are standing on somebody's ground.
  displaced: { litter: [Tile.Crate, Tile.Bedroll, Tile.Barrel], pocket: [Tile.LeanTo, Tile.Bedroll, Tile.CrateGoods], fire: Tile.EmberBed },
  // THE BLIGHT (family D, the gloom): the ground that stopped, keyed
  // to the gloom's own ids (K4): the gloom stone's cold swell, the
  // creep root that comes back on the hour, the snag that died from
  // the roots. A pocket is where it is thickest — the stone, the
  // root, and the world's own cold light beside them. FoulPool and
  // CropBlighted stay out: sick water and a dead crop are placed by
  // the hand that drained the pond and tilled the field, never
  // scattered. No mark: what was here first claims nothing.
  blight: { litter: [Tile.GloomStone, Tile.CreepRoot, Tile.DeadTree], pocket: [Tile.GloomStone, Tile.CreepRoot, Tile.GlowShroom] },
  // THE SETTLED GROUND: the towns' litter, and the towns' claim — the
  // Charter's survey stake off-road (they measure everything, even
  // what they do not own), the Waykeepers' lamp cairn where a road is
  // PROVEN within trailReach (the road-faith law; see `roadMark`).
  neutral: { litter: [Tile.Rock, Tile.Stump, Tile.BerryBush], pocket: [Tile.Rock, Tile.GrassTall, Tile.BerryBush], mark: Tile.CharterPost, roadMark: Tile.LampCairn },
  // THE WAYSIDE: the road's own ground — a waystation, a peddler's
  // rest. The same verge, and the ONE mark it can honestly fly is the
  // Waykeepers' cairn, road-proven; with no proof it flies nothing.
  // Never the Charter's stake: the order refuses Charter oil because
  // it comes with a ledger (plan §2), and a survey stake on a lamp
  // haven would say the ledger won.
  wayside: { litter: [Tile.Rock, Tile.Stump, Tile.BerryBush], pocket: [Tile.Rock, Tile.GrassTall, Tile.BerryBush], roadMark: Tile.LampCairn },
  // THE WILD: the same verge with no claim on it — the open default
  // for any id no family owns (a new sketch never inherits a Charter
  // stake by accident; it EARNS a mark by matching a family or
  // declaring a vocab).
  wild: { litter: [Tile.Rock, Tile.Stump, Tile.BerryBush], pocket: [Tile.Rock, Tile.GrassTall, Tile.BerryBush] },
} as const satisfies Record<string, Vocab>;

export type InfluenceVocab = keyof typeof VOCAB;

/**
 * The FAMILY fallback for ids that declare no vocab: a new
 * `poi_goblin_*` camp reads as a war-band without saying so — the
 * prefix IS the family. A declaration's `vocab` outranks this read.
 */
const VOCAB_OF: ReadonlyArray<[RegExp, InfluenceVocab]> = [
  [/^poi_(goblin|warhold)/, 'warband'],
  [/^poi_(hob)/, 'legion'],
  // The Company's tollhouse is the Company's: it litters what the
  // road paid and flies the red rag.
  [/^poi_(bandit|stockade|raider|barrow_diggers|wardline|company)/, 'plunder'],
  [/^poi_(den|greatden)/, 'den'],
  [/^poi_(gnoll)/, 'gnoll'],
  [/^poi_(skral)/, 'skral'],
  [/^poi_(ogre)/, 'ogre'],
  [/^poi_(fell|barrow_ring|watchtower|ruin|riftgate|hoargate|champions)/, 'oldstone'],
  [/^poi_(burnt)/, 'ruin'],
  // The field after and the muster ground (K3): the fight's leavings
  // and the displaced's — never the wild's hedgerow round a
  // battlefield (the Legion-yard lesson, above).
  [/^poi_(field)/, 'field'],
  [/^poi_(muster)/, 'displaced'],
  [/^poi_(digs)/, 'digs'],
  [/^poi_(lair)/, 'lair'],
  [/^poi_(roost)/, 'roost'],
  // The settled ground — the hamlets the Charter bills — flies the
  // towns' claim. The wayside — waystations, the peddler's rest — is
  // the road's and flies the cairn only where the composer proves the
  // road (`nearRoad`), nothing from the shelf. The wayshrines are the
  // old faith's and plant no stake. The lamp havens (last_lamp,
  // fenside_lamp, fork_waystation, the Third Stone) are NOT here
  // either: their peoples' marks (LampCairn, PitLamp) need a road or a
  // Returner under them, and the shelf has neither — their defs' cues
  // carry the marks per site instead.
  [/^poi_(hamlet)/, 'neutral'],
  [/^poi_(waystation|peddler)/, 'wayside'],
];

/**
 * The vocab a prefab id resolves to with no declaration — the family
 * read, then the wild. Exported so a site composer can ask the same
 * question the shelf asked.
 */
export function familyVocabOf(prefabId: string): InfluenceVocab {
  return VOCAB_OF.find(([re]) => re.test(prefabId))?.[1] ?? 'wild';
}

/**
 * The claim mark a vocab flies at a given site: its road mark when a
 * carved road stands within trailReach (proven by the caller — the
 * composer's `roadBearingAt(anchor, FRONTIER.trailReach)`), else its
 * off-road mark, else nothing. The shelf expands with `nearRoad`
 * unknown and takes the off-road word; a per-site composer that has
 * the road under its hand can ask for the honest one.
 *
 * NOT YET HONOURED IN PRODUCTION (K2 review): the only production
 * caller is the shelf's import-time `expandInfluence(p)` with no site
 * under it, so `nearRoad` is never true outside the tests — no vocab
 * flies LampCairn from the road gate and `wayside` marks nothing.
 * The contract stands for the per-site composer that will honour it
 * (server pois.ts compose has `roadBearingAt` to hand); until then
 * the fork rest's cairns are the sketch's own (prefabs.ts wardLine).
 * Nobody may assume a hamlet by a road grows a cairn from this gate.
 */
export function claimMarkOf(vocab: InfluenceVocab, nearRoad: boolean): Tile | undefined {
  const v: Vocab = VOCAB[vocab];
  return nearRoad ? v.roadMark ?? v.mark : v.mark;
}

/** The two-per-territory ceiling on claim marks: a glyph, not a picket line. */
export const CLAIM_MARKS_MAX = 2;

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

export interface ExpandOptions {
  /**
   * The site stands within trailReach of a carved road — the caller's
   * proof, never the shelf's guess. Flips a vocab to its `roadMark`.
   * Absent = false: the off-road mark, the one that cannot lie.
   */
  nearRoad?: boolean;
}

export function expandInfluence(prefab: PrefabDef, opts: ExpandOptions = {}): PrefabDef {
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
  const vocabName: InfluenceVocab = decl?.vocab ?? familyVocabOf(prefab.id);
  const vocab: Vocab = VOCAB[vocabName];
  const mark = claimMarkOf(vocabName, opts.nearRoad === true);

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
  // Each track remembers its TRAILHEAD — the last worn tile before
  // the ground stops remembering feet — because that is where a
  // people plants its claim.
  const tracks = 2 + rng.int(0, 1);
  const worked = (t: number): boolean => t === Tile.Dirt || t === Tile.Grass || t === Tile.GrassTall;
  const trailheads: Array<{ x: number; y: number; a: number; d: number }> = [];
  for (let i = 0; i < tracks; i++) {
    const a = rng.range(0, Math.PI * 2);
    let fade = 1;
    let head: { x: number; y: number; a: number; d: number } | null = null;
    for (let d = heartR - 1; d < rimR; d++) {
      const tx = Math.round(cx + Math.cos(a) * d);
      const ty = Math.round(cy + Math.sin(a) * d * (h / w));
      if (at(tx, ty) === TILE_SKIP && rng.chance(fade)) put(tx, ty, Tile.Dirt);
      // The head is the farthest WORKED tile on the bearing — the
      // track's own dirt, a pocket line it walked along, or a worked
      // patch that swallowed it; ground that remembers feet either way.
      if (worked(at(tx, ty))) head = { x: tx, y: ty, a, d };
      fade *= 0.94;
    }
    if (head) trailheads.push(head);
  }

  // THE CLAIM MARKS: the people's glyph at the trailheads — one past
  // the last worn tile on the track's own bearing, or beside it when
  // the ground there is taken; at most CLAIM_MARKS_MAX per territory.
  // Planted AFTER every roll above and with no roll of their own, so
  // every territory keeps the exact litter, pockets and tracks it
  // shipped with (the Foundry law) and gains only its mark.
  if (mark !== undefined) {
    const free = (x: number, y: number): boolean => x >= 1 && y >= 1 && x < w - 1 && y < h - 1 && at(x, y) === TILE_SKIP;
    const touchesWorked = (x: number, y: number): boolean => {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if ((dx !== 0 || dy !== 0) && worked(at(x + dx, y + dy))) return true;
        }
      }
      return false;
    };
    let planted = 0;
    for (const t of trailheads) {
      if (planted >= CLAIM_MARKS_MAX) break;
      // The stake wants the first FREE tile past the worked ground on
      // the track's own heading — the edge where the ground stops
      // remembering feet. A track that a worked patch swallowed has its
      // head deep in grass and the patch may run on past the track's
      // own reach, so the walk keeps going outward (over a litter roll
      // if one sits in the way) until it clears the worked ground, and
      // only a spot that still TOUCHES worked ground counts: the stake
      // stands at the verge, never adrift in the empty ring. Failing
      // that, the shoulders of each worked tile back down the track
      // toward the heart (the stake moves one tile in, never off the
      // worked ground).
      const along = Math.abs(Math.cos(t.a)) >= Math.abs(Math.sin(t.a));
      const candidates: Array<[number, number]> = [];
      for (let d = t.d + 1, steps = 0; steps < Math.max(w, h); d++, steps++) {
        const x = Math.round(cx + Math.cos(t.a) * d);
        const y = Math.round(cy + Math.sin(t.a) * d * (h / w));
        if (x < 1 || y < 1 || x >= w - 1 || y >= h - 1) break;
        if (!free(x, y)) continue;
        if (touchesWorked(x, y)) candidates.push([x, y]);
        break;
      }
      for (let d = t.d; d > heartR; d--) {
        const x = Math.round(cx + Math.cos(t.a) * d);
        const y = Math.round(cy + Math.sin(t.a) * d * (h / w));
        if (!worked(at(x, y))) continue;
        candidates.push(along ? [x, y - 1] : [x - 1, y], along ? [x, y + 1] : [x + 1, y]);
      }
      const spot = candidates.find(([x, y]) => free(x, y));
      if (!spot) continue;
      put(spot[0], spot[1], mark);
      planted++;
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
