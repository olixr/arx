/**
 * DAWNMEAD UNDER SIEGE (band 6) — inn.ts [L2 WEST].
 *
 * D5 THE FIVE STONES (110,84)-(133,105): the inn verbatim (J19), fuller
 * this spring: the crofters' goods in the wing aisle, two bedrolls on
 * the common-room floor for the crofter children, the pennant down,
 * the woodpile and ladder moved to the east gable so the homestead
 * track (G17) can pass it. The four guest beds stay the waker's (J20:
 * no Steinar this band).
 *
 * GROUND IT STANDS ON (laid by L1 ground.ts before this runs):
 *   G16 forecourt (x110..131, y103..105), G17 the track past the east
 *   gable (x132-133).
 * SIGNS IT QUEUES: THE FIVE STONES (116,104) HangingSign.
 * CAST HOOKS (people.ts places the bodies): Gilly post (116.5,88.5) +
 *   bed foot (113,100) staged from (113,101); her night path
 *   (118,90)>(113,98)>(113,101)>(113,100) open; the guest bed feet
 *   (125,89) (128,89) (125,93) (128,93) with stands (126,89) (127,89)
 *   (126,93) (127,93) walkable; the door column x120-121 rows 103..105
 *   holds nothing; Margit's night path crosses the forecourt at 18.5
 *   under Gilly's shingle.
 *
 * THE CURATION LAW (plan §7): every prop carries its sentence as the
 * comment above its placement; scenes not scatter; ground first;
 * breathing room; nothing is a placeholder; occlusion law; cardinal
 * stands; gates open; wear is never a rectangle; one Signpost per
 * eyeful. CONTENT BOUNDARY holds; no dashes in any player-facing string.
 */
import {
  Detail,
  Tile,
  awningTile,
  bracketSignDetail,
  herbBundlesDetail,
  sillHerbsDetail,
  wallBannerDetail,
} from '@arx/shared';
import type { DawnCtx } from './ctx.js';

export function inn(ctx: DawnCtx): void {
  const { b, pins } = ctx;
  const S = pins.SIGN_LEDGER;

  // SENTENCE: named for five stones when there were five; Gilly has
  // four beds for wakers, a bed of her own, and floors for everyone
  // else this spring.
  ctx.box(110, 84, 133, 105, 'inn:D5 THE FIVE STONES');

  // ==================================================================
  // PRIMARY the building (verbatim).
  // ==================================================================
  // Timber on boards, the wide door south onto the forecourt, a window
  // either side of it and two on every long face.
  b.building(112, 86, 19, 17, {
    wall: Tile.WallWood,
    floor: Tile.WoodFloor,
    doors: [{ side: 's', at: 9 }],
    windows: [
      { side: 's', at: 5 }, { side: 's', at: 13 },
      { side: 'w', at: 6 }, { side: 'e', at: 6 },
      { side: 'n', at: 5 }, { side: 'n', at: 13 },
    ],
  });
  // The south corners turned so the frontage reads as one face.
  b.set(112, 102, Tile.WallWoodDiagSE);
  b.set(130, 102, Tile.WallWoodDiagSW);
  // The wide door: two leaves, because a cart's worth of wakers comes
  // through it on a bad night.
  b.set(120, 102, Tile.DoorwayWoodWide);
  b.set(121, 102, Tile.DoorwayWoodWide);
  ctx.door(120, 102);
  ctx.door(121, 102);

  // ==================================================================
  // SECONDARY the bar and the common room (verbatim).
  // ==================================================================
  // The counter run; the serving lane behind it stays open at y88.
  for (let x = 114; x <= 117; x++) b.set(x, 90, Tile.Counter);
  // The keg and the tapped cask behind the bar's west end.
  b.set(113, 89, Tile.BrewKeg);
  b.set(114, 89, Tile.TapCask);
  // The stocked back bar along the north wall: the cabinet, the shelf,
  // the jars, the basket, and the barrel at the aisle's head.
  b.set(115, 87, Tile.Cabinet);
  b.set(116, 87, Tile.ShopShelf);
  b.set(117, 87, Tile.GlazedJars);
  b.set(118, 87, Tile.BasketStack);
  b.set(119, 88, Tile.Barrel);
  // Gilly's post behind the counter (116.5,88.5), facing her room.
  ctx.post(116, 88);
  // The hearth on the west wall, and three honest tables with their
  // chairs, the bench under the west window.
  b.set(112, 94, Tile.Hearth);
  b.set(114, 94, Tile.Table);
  b.set(115, 94, Tile.Table);
  b.set(114, 93, Tile.Chair);
  b.set(115, 95, Tile.Chair);
  b.set(116, 94, Tile.Chair);
  b.set(118, 97, Tile.Table);
  b.set(119, 97, Tile.Table);
  b.set(118, 96, Tile.Chair);
  b.set(119, 98, Tile.Chair);
  b.set(114, 99, Tile.Table);
  b.set(114, 100, Tile.Chair);
  b.set(113, 97, Tile.Bench);
  // The rugs under the hearth table and the middle one.
  b.setDetail(115, 93, Detail.Rug);
  b.setDetail(116, 93, Detail.Rug);
  b.setDetail(118, 98, Detail.Rug);
  b.setDetail(119, 98, Detail.Rug);
  // The house banner on the west wall in ochre, the one colour Gilly
  // hangs.
  b.setDetail(112, 90, wallBannerDetail(6));
  // Gilly's corner behind the bar's end: her own small bed, head
  // north, foot (113,100) (PIN; stand (113,101)), the cabinet at its
  // head, the round rug her feet find.
  b.set(113, 99, Tile.Bed);
  b.set(113, 100, Tile.Bed);
  b.set(112, 99, Tile.Cabinet);
  b.setDetail(114, 100, Detail.RugRound);

  // ==================================================================
  // SECONDARY the guest wing (verbatim).
  // ==================================================================
  // The partition wall with its one door at the aisle's middle.
  for (let y = 87; y <= 101; y++) b.set(123, y, Tile.WallWood);
  b.set(123, 95, Tile.DoorwayWood);
  ctx.door(123, 95);
  // Four claimable beds, head north, two each side of the aisle: the
  // first bed a waker can call home (PIN; feet (125,89) (128,89)
  // (125,93) (128,93)).
  b.set(125, 88, Tile.Bed);
  b.set(125, 89, Tile.Bed);
  b.set(128, 88, Tile.Bed);
  b.set(128, 89, Tile.Bed);
  b.set(125, 92, Tile.Bed);
  b.set(125, 93, Tile.Bed);
  b.set(128, 92, Tile.Bed);
  b.set(128, 93, Tile.Bed);
  // The wing's cabinets: north-west of the wing (the north-east corner
  // would seal a pocket) and by the south-east wall; the stool at the
  // wing's foot.
  b.set(126, 87, Tile.Cabinet);
  b.set(129, 96, Tile.Cabinet);
  b.set(128, 99, Tile.WoodStool);
  // The aisle rugs between the bed pairs.
  b.setDetail(126, 91, Detail.Rug);
  b.setDetail(127, 91, Detail.Rug);
  b.setDetail(126, 95, Detail.Rug);
  b.setDetail(127, 95, Detail.Rug);
  // The doormats inside the wide door, the herb bundles on the wing's
  // north wall, the sill herbs in the west window.
  b.setDetail(120, 101, Detail.Doormat);
  b.setDetail(121, 101, Detail.Doormat);
  b.setDetail(126, 86, herbBundlesDetail(1));
  b.setDetail(117, 102, sillHerbsDetail(2));

  // ==================================================================
  // TERTIARY NEW: the inn fuller this spring.
  // ==================================================================
  // The crofters' goods in the wing aisle, what three families could
  // carry that is not a sheep: a basket stack against the north pair
  // and a crate against the south pair; the aisle stays one wide,
  // (126,90) and (127,94) open, and every bed foot's stand is walkable.
  b.set(127, 90, Tile.BasketStack);
  b.set(126, 94, Tile.Crate);
  // Two bedrolls on the common-room floor: the crofter children's beds
  // Gilly is making up by the middle table (a Bedroll is not a lie
  // tile; nobody's routine ends here).
  b.set(116, 99, Tile.Bedroll);
  b.set(117, 100, Tile.Bedroll);
  // The woodpile and the leaning ladder moved to the east gable, in the
  // one column between the wall and the homestead track (G17 x132-133):
  // the shipped (132,90) (132,93) are the track now.
  b.set(131, 90, Tile.Woodpile);
  b.set(131, 94, Tile.LeanLadder);
  // CUT: the pennant (118,102) is down (a fete's rag has no season this
  // spring); the forecourt Bench (128,105) (the stall's carts tie
  // there); the paved-over stalls (128..129,104) and crate (126,105);
  // BarrelStack (132,106) (the track's tail); the service-side
  // BarrelStack (110,88) and CrateStack (110,91) (not in the D5
  // inventory; the four columns x108-111 to the pen rail stay open).

  // ==================================================================
  // FRONTAGE: the forecourt (G16), the paired canopies, the shingle,
  // the rail, the lamps.
  // ==================================================================
  // Two shed canopies in weld either side of the wide door, each over
  // a wall tile (the awning host law: (118..119,102) and (122..123,102)
  // are the south wall).
  b.set(118, 103, awningTile('shed', 3));
  b.set(119, 103, awningTile('shed', 3));
  b.set(122, 103, awningTile('shed', 3));
  b.set(123, 103, awningTile('shed', 3));
  // The bracket over the door: five stones cut in the board, never
  // corrected to seven.
  b.setDetail(122, 102, bracketSignDetail(0));
  // The shingle between the canopies, on the forecourt's own stone.
  ctx.sign(S.five_stones.x, S.five_stones.y, S.five_stones.title, S.five_stones.lines, S.five_stones.tile);
  // The hitching rail for whatever a traveller rides in on; the tally
  // stall's counted carts tie here too (green.ts).
  b.set(126, 104, Tile.HitchingPost);
  // The forecourt's two lamps at its corners, on the S2 cadence.
  b.set(111, 105, Tile.LampPost);
  b.set(131, 105, Tile.LampPost);
}
