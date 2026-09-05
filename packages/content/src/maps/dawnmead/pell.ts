/**
 * DAWNMEAD UNDER SIEGE (band 6) — pell.ts [L5 SOUTH].
 *
 * D17 THE PELL YARD + THE LODGE.
 *
 * SCENES / BOXES (brief §3, declared with ctx.box):
 *   (84,150)-(107,189): the rails x86..105 y151..172 with the north gap
 *   (91..92,151) and the south gap (90..93,172), the pell line, the
 *   stands, the scarred wall, THE LODGE (96,176)-(107,187) twelve wide
 *   with THE FIFTH BUNK (104,184)/(104,185).
 * GROUND (laid by L1 ground.ts before this runs): G31 the approach into
 *   the north gap, G33 the yard's dirt + sand + gaps + the lodge apron,
 *   G44 the spur bending on x108-109 round the lodge's gable.
 * SIGNS: THE PELL YARD (94,148) Signpost; THE LODGE (94,175) HangingSign.
 * CAST HOOKS: Halla's post (93.5,162.5) on sand, her loop (88,157)
 *   (98,157), her exit (93,171) (93,172), her bed (97,177)/(97,178);
 *   the four ward bunks; the door (102,176) and apron (102,175); foot
 *   stands (98,178) (101,178) (102,178) (105,181) (103,185) open.
 * NOT PLACED: the shipped LampPost (110,173). The brief's D17 lists it
 *   verbatim, but (110,173) stands inside oldRoad.ts's box
 *   (108,164)-(122,223) and inside sight line S3's corridor (x105-111
 *   y142-175 holds nothing tall); D17's own eye-rest says the lodge
 *   has "its one lamp". The west lamp (93,173) is that lamp.
 *
 * THE CURATION LAW (plan §7): every prop carries its sentence as the
 * comment above its placement; scenes not scatter; ground first;
 * breathing room; nothing is a placeholder; occlusion law (nothing tall
 * on rows 1-2 south of doors, stations, signs, posts, forage nodes);
 * cardinal stands for every lie and sit; gates authored open; wear is a
 * wobbling one-wide Dirt line or an ellipse, never a rectangle; one
 * Signpost per eyeful. CONTENT BOUNDARY holds; no dashes in any
 * player-facing string.
 */
import { Detail, Tile, bannerStandTile, wallArmsDetail, wallBannerDetail } from '@arx/shared';
import type { DawnCtx } from './ctx.js';

export function pell(ctx: DawnCtx): void {
  const { b } = ctx;
  ctx.box(84, 150, 107, 189, 'pell: the yard and the lodge');

  // ================================================================
  // THE PELL YARD (x86-105, J5). Halla's ground for thirty years; the
  // third stand is dressed now with kit the Charter issued and nobody
  // has claimed, and there is litter at the scarred wall's foot because
  // the yard hits harder this year.
  // ================================================================
  // The rail ring, four open tiles from the butts' east fence (x82-85)
  // and one open column (x106) beside the spur; the north gap is the
  // way in from the court, the south gap is Halla's own way out to the
  // lodge (PIN (93,171) (93,172)). pen() draws the gaps last so the
  // gates are the ground G33 laid.
  ctx.pen(86, 151, 20, 22, {
    rail: Tile.RailWood,
    gaps: [
      { side: 'n', at: 5 }, { side: 'n', at: 6 },
      { side: 's', at: 4 }, { side: 's', at: 5 }, { side: 's', at: 6 }, { side: 's', at: 7 },
    ],
  });
  // Halla's post on the sand at the yard's heart, facing north to the
  // line; people.ts places the body.
  ctx.post(93, 162);

  // THE PELL LINE: dummies and posts, ranked but never ruled, thirty
  // years of moving them a pace to spare the worn ground.
  b.set(88, 155, Tile.TargetDummy).set(93, 156, Tile.TargetDummy).set(99, 155, Tile.TargetDummy);
  b.set(90, 158, Tile.TimberPost).set(96, 159, Tile.TimberPost).set(102, 157, Tile.TimberPost);
  // Straw where the dummies are re-stuffed, sawdust where the posts are
  // struck.
  ctx.detail(87, 156, Detail.Straw);
  ctx.detail(93, 157, Detail.Straw);
  ctx.detail(99, 156, Detail.Straw);
  ctx.detail(90, 159, Detail.Sawdust);
  ctx.detail(96, 160, Detail.Sawdust);

  // THE STANDS: two dressed as they always were, and the third dressed
  // this spring with kit the Charter issued that nobody has claimed.
  b.set(102, 155, Tile.ArmorStandFull).set(104, 155, Tile.ArmorStandFull);
  b.set(102, 158, Tile.ArmorStandFull);
  // The rack the stands are dressed from, and the yard's own spears
  // beside it (ruling Kit 12: Ottery's make, the yard's own).
  b.set(104, 160, Tile.WeaponRack);
  b.set(104, 162, Tile.SpearRack);
  // The grindstone at the east rail: wood first, then steel, and steel
  // is kept sharp here.
  b.set(102, 164, Tile.Grindstone);
  // The two colours at the yard's north rail, the fordgate's weld and
  // the Crown's ochre (J10): the yard trains for both.
  b.set(96, 152, bannerStandTile(ctx.pins.DYE_FORDGATE));
  b.set(102, 152, bannerStandTile(ctx.pins.DYE_CROWN));

  // THE SCARRED WALL: the thing the yard actually hits, a WALL_RUN
  // member no sign may stand on.
  for (let y = 165; y <= 169; y++) b.set(87, y, Tile.WallStone);
  // The dummy in front of the wall, struck until the wall is.
  b.set(88, 167, Tile.TargetDummy);
  // Litter at the wall's foot: splinters and straw the yard has not
  // swept because it hits harder this year and the sweeping lost.
  b.set(88, 165, Tile.FieldLitter);

  // The bales at the corners, for the dummies and the falls: one at
  // the north-west corner, two stacked down the east rail at the
  // north-east (the shipped pair stood (104,153) (103,154) and with the
  // stand at (104,155) sealed the tile between them; the sealed-pocket
  // flood is a law, so the second bale rides the rail instead).
  b.set(87, 153, Tile.HayBale).set(104, 153, Tile.HayBale).set(104, 154, Tile.HayBale);
  // The watchers' bench beside the south gap, where the next pair waits.
  b.set(94, 171, Tile.Bench).set(95, 171, Tile.Bench);
  // The water barrel at the south-east corner.
  b.set(101, 171, Tile.Barrel);
  // The baskets of wooden wasters beside the wall.
  b.set(89, 168, Tile.BasketStack);
  // Straw where a fall was broken; pebbles where the sand is raked
  // thin and the yard's feet turn.
  ctx.detail(93, 166, Detail.Straw);
  ctx.detail(95, 163, Detail.Pebbles);
  ctx.detail(92, 161, Detail.Pebbles);
  ctx.detail(98, 165, Detail.Pebbles);
  ctx.detail(88, 168, Detail.Pebbles);
  ctx.detail(92, 163, Detail.Pebbles);
  ctx.detail(99, 167, Detail.Pebbles);
  ctx.detail(95, 161, Detail.Pebbles);
  // THE PELL YARD board, two rows north of the school road, one col
  // east of where it stood so it is 25 cols from THE LONG BUTTS (J16).
  const yardSign = ctx.pins.SIGN_LEDGER.pell_yard;
  ctx.sign(yardSign.x, yardSign.y, yardSign.title, yardSign.lines, yardSign.tile);

  // ================================================================
  // THE LODGE (twelve wide, five bunks). Five bunks for four wards and
  // a yardmaster who sleeps last; the fifth went in this spring for the
  // fourth man and it does not fit, and the hot bunk is hot at nineteen
  // because the day ward is still up.
  // ================================================================
  // Stone, twelve wide so the spur can bend round its gable (J5);
  // door north onto the apron (PIN (102,176)), windows either side of
  // it and one in each gable.
  b.building(96, 176, 12, 12, {
    wall: Tile.WallStone,
    floor: Tile.StoneFloor,
    doors: [{ side: 'n', at: 6 }],
    windows: [{ side: 'n', at: 2 }, { side: 'n', at: 10 }, { side: 'w', at: 5 }, { side: 'e', at: 5 }],
  });
  ctx.door(102, 176);
  // Halla's bunk, the west one, head north; she lies at (97,178) from
  // the stand (98,178).
  b.set(97, 177, Tile.Bed).set(97, 178, Tile.Bed);
  // The night ward's bunk; lie (100,178), stand (101,178).
  b.set(100, 177, Tile.Bed).set(100, 178, Tile.Bed);
  // The dusk ward's bunk; lie (103,178), stand (102,178).
  b.set(103, 177, Tile.Bed).set(103, 178, Tile.Bed);
  // THE HOT BUNK under the east window: the day ward's, lie (106,181),
  // stand (105,181); warm at nineteen because he is still up.
  b.set(106, 180, Tile.Bed).set(106, 181, Tile.Bed);
  // THE FIFTH BUNK, head north against the south run, wedged in this
  // spring for the muster ward; lie (104,185), stands (103,185) and
  // (105,185). It does not fit, and it is in.
  b.set(104, 184, Tile.Bed).set(104, 185, Tile.Bed);
  // The duty table in the middle of the floor and its two chairs, where
  // the rota is argued before it is written.
  b.set(101, 181, Tile.Table).set(101, 182, Tile.Chair).set(102, 181, Tile.Chair);
  // The hearth in the south-west corner.
  b.set(97, 185, Tile.Hearth);
  // The lodge's own rack and stand by the hearth: the wards arm here
  // before they walk to the line.
  b.set(99, 186, Tile.WeaponRack).set(101, 186, Tile.ArmorStand);
  // The cabinet inside the north-east corner, one tile west of where it
  // stood because that tile is the wall now.
  b.set(106, 177, Tile.Cabinet);
  // The crate and the woodpile in the south-east corner.
  b.set(106, 185, Tile.Crate).set(106, 186, Tile.Woodpile);
  // The rug under the table's south side, the mat inside the door.
  b.setDetail(101, 184, Detail.Rug).setDetail(102, 184, Detail.Rug);
  b.setDetail(102, 177, Detail.Doormat);
  // Arms on the north wall either side of the door.
  b.setDetail(99, 176, wallArmsDetail(0)).setDetail(105, 176, wallArmsDetail(2));
  // The wards' Crown colour on the west wall, verbatim.
  b.setDetail(96, 182, wallBannerDetail(ctx.pins.DYE_CROWN));
  // The lodge's woodpile outside the west wall.
  b.set(94, 178, Tile.Woodpile);
  // The lodge's one lamp, at the apron's west side.
  b.set(93, 173, Tile.LampPost);
  // THE LODGE shingle on the frontage (a semicolon is not a dash).
  const lodgeSign = ctx.pins.SIGN_LEDGER.lodge;
  ctx.sign(lodgeSign.x, lodgeSign.y, lodgeSign.title, lodgeSign.lines, lodgeSign.tile);
}
