import { Tile } from '@arx/shared';

/**
 * THE ONE FURNITURE TABLE (core-audit debt 1): which furniture seats a
 * post, and the work it holds. This table existed THREE times — the
 * POI composer, the stronghold generator, and the dungeon garrison
 * each kept a hand copy — and the copies had drifted: a skral fish
 * rack seated a cook in a capital and nobody at a shoal camp, the
 * strongholds never learned the bonfire or the bench, the dungeons
 * never learned the weapon rack. One table now; every lane reads it.
 *
 * What the table owns: furniture → kind, seats, and the hours that are
 * FURNITURE truth (a drill yard works daylight, a tent sleeps its
 * tenant at night, wherever it stands). What it deliberately does NOT
 * own: the vigil clock — that is a LANE law, not furniture truth. A
 * camp's vigil is the night watch (the POI composer stamps 18-6); a
 * stronghold's vigil is kept round the clock except under cairn walls,
 * where the dead's own clock turns it nocturnal (the generator's
 * recode). Family recodes (the dead never sleep, a beast den's nest is
 * a DAY rest) stay with their consumers for the same reason.
 */
export type PostSignKind = 'cook' | 'drill' | 'rest' | 'vigil' | 'keeper';

export interface PostSignRow {
  /** Furniture tiles that seat this post. */
  readonly match: readonly Tile[];
  readonly kind: PostSignKind;
  /** Bodies the furniture seats (the fire seats a circle). */
  readonly seats: number;
  /** Furniture-intrinsic working hours; absent = kept around the clock. */
  readonly hours?: { readonly from: number; readonly to: number };
}

export const POST_SIGN_ROWS: readonly PostSignRow[] = [
  // The fire seats a circle — the gathered camp, cooking.
  { match: [Tile.CookPot, Tile.MeatSpit, Tile.Bonfire, Tile.Campfire], kind: 'cook', seats: 3 },
  // The catch is tended like any hearth — one tender, not a circle.
  { match: [Tile.FishRack, Tile.CatchBasket], kind: 'cook', seats: 1 },
  { match: [Tile.SmokeTripod], kind: 'cook', seats: 1 },
  // The yard drills by daylight.
  { match: [Tile.TargetDummy, Tile.SpearRack, Tile.WeaponRack], kind: 'drill', seats: 1, hours: { from: 6, to: 20 } },
  { match: [Tile.HarpoonRack], kind: 'drill', seats: 1, hours: { from: 6, to: 20 } },
  // A tent (and the shoal's reed shelter) sleeps its tenant by night.
  { match: [Tile.TentHide, Tile.TentWar], kind: 'rest', seats: 1, hours: { from: 19, to: 7 } },
  { match: [Tile.ReedShelter], kind: 'rest', seats: 1, hours: { from: 19, to: 7 } },
  // A bench or chair is a seat kept — the refectory the dead never
  // left, the wayside bench a brigand loafs on.
  { match: [Tile.Bench, Tile.Chair], kind: 'rest', seats: 1 },
  // The watch furniture. Hours are the LANE's to stamp (see header).
  { match: [Tile.SkullTotem, Tile.Brazier, Tile.WarBrazier, Tile.StandingTorch, Tile.WarDrum], kind: 'vigil', seats: 1 },
  { match: [Tile.TideTotem, Tile.LurePole], kind: 'vigil', seats: 1 },
  // Work someone KEEPS: the pen, the nest, the spawning bank, and the
  // craftsmen's benches, pools, and pans.
  { match: [Tile.PrisonCage, Tile.BeastNest], kind: 'keeper', seats: 1 },
  { match: [Tile.RoeNest, Tile.Dugout], kind: 'keeper', seats: 1 },
  { match: [Tile.MendingBench, Tile.ShellBench, Tile.KeepPool, Tile.SaltPan], kind: 'keeper', seats: 1 },
  // THE WARREN AND THE LEGION: the camps' life furniture seats the
  // camp's LIFE. The rag nest is the tentless goblin's bed and keeps
  // tent hours; the knucklebone pit seats BOTH players (the game is
  // never solitaire) round the clock; the grog tub pours evenings
  // into the small hours — furniture truth: nobody drinks at dawn
  // muster. The gong, the brag-stake, and the effigy are watch
  // furniture (the lane stamps the vigil clock as ever). The war
  // table, the loot cart, the beast stake, and the critter cage are
  // work somebody KEEPS: the officer at the map, the guard on the
  // takings, the beast-keeper, the larder-keeper.
  { match: [Tile.RagNest], kind: 'rest', seats: 1, hours: { from: 19, to: 7 } },
  { match: [Tile.KnucklePit], kind: 'rest', seats: 2 },
  { match: [Tile.GrogTub], kind: 'rest', seats: 1, hours: { from: 16, to: 2 } },
  { match: [Tile.AlarmGong, Tile.TrophyStake, Tile.BossEffigy], kind: 'vigil', seats: 1 },
  { match: [Tile.WarTable, Tile.PlunderCart, Tile.BeastStake, Tile.CritterCage], kind: 'keeper', seats: 1 },
];
