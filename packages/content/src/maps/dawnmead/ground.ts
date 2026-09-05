/**
 * DAWNMEAD UNDER SIEGE (band 6) — THE GROUND FIRST (L1, brief §2 G0-G46).
 *
 * Nothing above ground is laid here. Streets, wear lines and ellipses,
 * yards, water, the bridge, the ford, the pier, the count-knoll's
 * raise and stairs, the ash pans and the Road Row's tuft: every tile a
 * district stands on is laid before any district runs, so a prop is
 * always placed on the ground it wore.
 *
 * Every op below is Dirt unless it says otherwise. "PIN" marks a tile
 * pins.md forbids to move. Wear is never a rectangle: the brushes
 * wobble and rag on meadRng; the fillRects left here are FENCED YARDS
 * and FLOORS (a penned run, a hall's stone, a ruin's floor), which are
 * honest rectangles because a rail or a wall is their edge. FIX PASS 1
 * (defect 7): the five OPEN yards (the farm yard, Weir's, Ottery's,
 * the bake apron, the log yard) read hard-edged on the block-out and
 * now go down through wear.rect, whose rim rags on the hash. FIX PASS
 * 2 (review finding 2): five more open-ground blocks that survived
 * as hard rectangles (the harvest corner, the smoke yard, the butts'
 * shooting ground and its three marks) go down the same way; the
 * homestead track's east band and its south leg wobble like the
 * north band (finding 4); the granary track reaches the breach apron
 * (live defect 2); the spark way reaches the pad (finding 8).
 */
import { Detail, Tile } from '@arx/shared';
import type { DawnCtx, Pt } from './ctx.js';

/** Rects inside which the flower thinning clears EVERY flower (G45: Tuft, not flowers). */
export const NO_FLOWER_ZONES: ReadonlyArray<readonly [number, number, number, number]> = [
  [110, 150, 117, 162], // the Road Row inside its rail
];

export function ground(ctx: DawnCtx): void {
  const { b, wear, brookX } = ctx;
  const dirt = (x: number, y: number): void => {
    b.set(x, y, Tile.Dirt);
  };
  const dirtRun = (x0: number, x1: number, y0: number, y1: number): void => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) dirt(x, y);
  };
  const L = (pts: ReadonlyArray<Pt>, width: 1 | 2 | 3 = 1, wobble?: number): void =>
    wear.line(pts, wobble === undefined ? { width } : { width, wobble });

  // G1 THE LANE — the one honest road, west to east, Path rows 111-113
  // (PIN; (191,111..113) Path; first_road begins at world (32,48)).
  b.path({ x: 86, y: 112 }, { x: 191, y: 112 }, 3);

  // G2 THE BROOK — down from the north wood and out the south hem;
  // shallows line every reach so nothing traps a waker on the wrong
  // bank (PIN: north cx 162, south cx 158; edge-harmony outflow law).
  for (let y = 0; y < 224; y++) {
    const cx = brookX(y);
    b.set(cx - 2, y, Tile.WaterShallow);
    b.set(cx - 1, y, Tile.Water);
    b.set(cx, y, Tile.Water);
    b.set(cx + 1, y, Tile.Water);
    b.set(cx + 2, y, Tile.WaterShallow);
  }

  // G3 THE LANE BRIDGE — one rectangle centred on the brook at the
  // lane's middle row (spans-are-rectangles law; PIN x157..163 y110..114).
  {
    const bcx = brookX(112);
    for (let y = 110; y <= 114; y++) {
      for (let x = bcx - 3; x <= bcx + 3; x++) b.set(x, y, Tile.Bridge);
    }
  }

  // G4 THE FORD — knee-deep the whole way across: the crofters'
  // crossing, the honest shortcut between the granary meadow and the
  // east wold; two-wide approaches worn by ewes and a cart.
  for (let y = 148; y <= 151; y++) {
    const cx = brookX(y);
    for (let x = cx - 1; x <= cx + 1; x++) b.set(x, y, Tile.WaterShallow);
  }
  L([[150, 149], [153, 150], [156, 150]], 2);
  L([[164, 150], [167, 150], [171, 151]], 2);

  // G5 THE PIER ROOT — planks off the near bank over deep water, a
  // widened head where a man can stand; it stops mid-channel and
  // never reaches x >= 161 (PIN).
  dirt(152, 46);
  dirt(153, 46);
  for (let x = 154; x <= 159; x++) b.set(x, 46, Tile.Dock);
  for (let x = 158; x <= 159; x++) b.set(x, 45, Tile.Dock).set(x, 47, Tile.Dock);

  // G6 SHOULDERS — wheels leave the Path where carts turn: the bridge
  // feet, the gate, the works' apron.
  wear.shoulders(150, 156, 110);
  wear.shoulders(150, 156, 114);
  wear.shoulders(164, 170, 110);
  wear.shoulders(164, 170, 114);
  wear.shoulders(170, 188, 110);
  wear.shoulders(170, 188, 114);
  wear.shoulders(138, 157, 110);

  // G7 THE RING PAD — old stone, grass taking the cracks back at its
  // rim (PIN; the golden re-stamp makes this exact anyway).
  b.fillEllipse(78.5, 112.5, 7.5, 6, Tile.StoneFloor);
  for (const [gx, gy] of ctx.pins.RING_PAD.bites) b.set(gx, gy, Tile.Grass);

  // G8 THE RING'S TRACE — feet from the pad's west bite to the burnt
  // cottage's open face, starting one column outside the box.
  L([[63, 112], [62, 111], [61, 109], [60, 108]]);

  // G9 THE COUSIN'S WAY — feet from the Row went to look; it curves from
  // the lane south-west to the shell's east corner, skirting the box's
  // north-west corner so the golden stamp never cuts it.
  L([[76, 93], [72, 94], [68, 96], [65, 98], [63, 100], [62, 104], [62, 107]]);

  // G10 WREN'S STEP — the worn step onto the lane (PIN).
  dirt(93, 110);

  // G11 THE COTTAGE LANE — the two doors' feet: Hilde's step and the
  // crowded roof's step and yard.
  L([[76, 93], [83, 93], [90, 93], [96, 93], [100, 93]], 1, 0.25);
  dirt(83, 91);
  dirt(83, 92);
  dirt(98, 93);
  wear.ellipse(98, 94, 2.5, 1);

  // G12 THE ORCHARD WALK + THE BEND — the crofters' and the wakers' way
  // north between the hedge (x92) and the fence (x96); it bends between
  // the roofs to the lane; the east-gate approach joins it.
  L([[94, 27], [95, 40], [94, 53], [95, 66], [94, 75], [94, 81]]);
  L([[94, 81], [93, 83], [92, 85], [91, 87], [90, 89], [90, 91], [90, 93]]);
  dirt(93, 52);

  // G13 THE GINNEL — the cottages' back way to the green between Wren's
  // hedge and the inn.
  L([[100, 94], [100, 96], [101, 98], [100, 100], [101, 102], [101, 103]]);

  // G14 THE WELL COURT — stone only where fifty years of buckets wore
  // it (KEPT verbatim, ruling 11; the Well is green.ts's).
  b.fillEllipse(114.5, 108.5, 5.5, 4, Tile.StoneFloor);

  // G15 GREEN WEAR — the well-to-bell line lies on the court's own
  // stone (a no-op), so pebbles carry it; the inn is walked from the
  // lane; the tally is read from the lane; the twins' game wore one
  // patch; Hilde's way from the ginnel to the bell bench.
  ctx.detail(112, 106, Detail.Pebbles);
  ctx.detail(116, 106, Detail.Pebbles);
  ctx.detail(114, 110, Detail.Pebbles);
  L([[120, 110], [120, 109], [121, 108], [120, 107], [120, 106]]);
  wear.ellipse(128, 107.5, 2.5, 2);
  wear.ellipse(127, 116, 2.5, 1.5);
  L([[101, 103], [103, 104], [105, 105], [107, 106], [109, 107], [109, 108]]);

  // G16 THE INN FORECOURT — the paved frontage (x110..131, y103..105).
  b.fillRect(110, 103, 22, 3, Tile.StoneFloor);

  // G17 THE HOMESTEAD WAY — the shipped north part to the Common's
  // north gate; the Common's interior stays grass (Brammel keeps it
  // grass); from the south gate a two-wide track runs east past the
  // inn's gable, south to the green, and a one-wide tail meets the lane
  // between the stall and the oak. Brammel's, Sorrel's, the twins'
  // feet; carts down to the stall.
  // FIX PASS 1 (defect 11): the north band was a ruled two-wide strip
  // from the strip's mouth to the Common's north gate; it wobbles now
  // like every other track, the yard's mouth (120..121,47) and the
  // gate's foot (120..121,65) held exact for the stops on them.
  L([[120, 46], [120, 52], [120, 59], [120, 65]], 2, 0.3);
  dirt(120, 47);
  dirt(121, 47);
  dirt(121, 65);
  dirtRun(120, 121, 83, 85);
  // FIX PASS 2 (finding 4): the east band (y84-85 x121..133) and the
  // south leg (x132-133 y85..107) were ruled two-wide strips, the same
  // class the north band was; they wobble now, the gate's foot
  // (120..121,83..85) above and the tail's join (132,108) below held
  // exact. The core's second cell rides south of the band and east of
  // the leg, so the shipped columns are still the ones worn.
  L([[121, 84], [126, 84], [132, 84]], 2, 0.3);
  L([[132, 85], [132, 96], [132, 107]], 2, 0.3);
  L([[132, 108], [132, 109], [132, 110]]);

  // G18 THE FARM YARD — the wain door's apron, the house door's foot,
  // the field gate (PIN stop (112,32)).
  wear.rect(115, 47, 136, 50);
  dirt(107, 47);
  L([[107, 47], [110, 47], [114, 47]]);
  dirt(112, 31);
  dirt(112, 32);

  // G19 THE COOP — penned dirt (x101..113, y52..60).
  b.fillRect(101, 52, 13, 9, Tile.Dirt);

  // G20 THE HUNTERS' TRAIL — the wolves came down to the arch; the
  // hunters go out. Single-file dirt (PIN heads (60,0) and the row
  // y26), worn three wide at the elbow with ragged outer cells, and the
  // arch apron.
  for (let y = 0; y <= 25; y++) dirt(60, y);
  // The elbow's own row is ruled under its three-wide wear; east of the
  // arch the leg to the orchard walk wobbles (FIX PASS 1, defect 11: a
  // ruled 36-tile row read as a drawn line).
  for (let x = 60; x <= 69; x++) dirt(x, 26);
  L([[69, 26], [77, 26], [86, 26], [95, 26]], 1, 0.3);
  for (let y = 16; y <= 26; y++) {
    if (ctx.rng(59, y) < 0.75) dirt(59, y);
    if (ctx.rng(61, y) < 0.75) dirt(61, y);
  }
  for (let x = 60; x <= 69; x++) {
    if (ctx.rng(x, 25) < 0.75) dirt(x, 25);
    if (ctx.rng(x, 27) < 0.75) dirt(x, 27);
  }
  dirt(68, 27);
  dirt(68, 28);
  dirt(68, 29);

  // G21 THE HARVEST CORNER — mid-picking; open ground inside the
  // hedge, so its rim rags (FIX PASS 2, finding 2: the shipped
  // fillRect read as a dirt square in grass). The press, the cart and
  // the crates stand on it after and overwrite what they stand on.
  wear.rect(46, 66, 51, 70);

  // G22 THE COMMON'S GROUND — Brammel's stand inside the west gate; the
  // crofters' drive from the walk; the crofters' way in up the strip
  // between the Common and Sorrel's rails to the broken corner.
  wear.ellipse(98, 74, 2, 1.5);
  L([[94, 75], [95, 74]]);
  L([[136, 109], [136, 101], [135, 93], [136, 87], [134, 84], [133, 83]]);

  // G24 THE WATER WAY — Sorrel's night path; Weir's fish on a barrow:
  // north off the lane through the drover yard's south mouth and the
  // yard, out its north gap (PIN (147,69)), and on to Weir's yard (PIN
  // (147,60)).
  dirtRun(147, 148, 88, 110);
  dirtRun(147, 148, 60, 69);
  dirtRun(147, 147, 40, 59);

  // G25 WEIR'S YARD — everything a river gives you (x140..154, y42..52).
  wear.rect(140, 42, 154, 52);

  // G26 SORREL'S YARD — where the beasts drink (x140..155, y70..85); the
  // keeper's gap in the cross rail (PIN stop (147,78)).
  b.fillRect(140, 70, 16, 16, Tile.Dirt);
  dirt(146, 78);
  dirt(147, 78);

  // G27 OTTERY'S YARD — the trade you can read from the street
  // (x138..156, y96..109), opening onto the lane's shoulder.
  wear.rect(138, 96, 156, 109);

  // G28 THE COOK'S WAY + APRONS — Berrit's stops: the way down from
  // the green, the bake apron, the smoke yard, the hall's stone, the
  // supper court (Campfire (129,144) PIN), the garden threshold.
  L([[121, 114], [121, 122]], 2);
  wear.rect(121, 123, 132, 125);
  // The smoke yard east of the hall is open ground with no rail or
  // wall on its edge, so it rags too (FIX PASS 2, finding 2).
  wear.rect(135, 126, 138, 134);
  b.fillRect(121, 126, 13, 11, Tile.StoneFloor);
  b.fillEllipse(129, 145, 5, 4, Tile.Dirt);
  dirt(117, 139);

  // G29 THE PROVING WAY — the green's south mouth, three wide and ragged.
  L([[108, 114], [108, 117], [108, 120]], 3);

  // G30 THE MUSTER COURT — the court's dirt and the line strip the
  // wards rake (inside the ellipse: a no-op on screen, kept for them).
  // The chart's floor Dirt (103..105,119) is gone with the chart: FIX
  // PASS 1 (defect 3) stood the chart at y121-123, inside the ellipse.
  b.fillEllipse(96, 126, 11, 9, Tile.Dirt);
  b.fillRect(90, 119, 13, 3, Tile.Dirt);

  // G31 THE YARD'S APPROACH — Halla's post is reached from the court:
  // two wide from the court's south rim into the pell yard's north gap.
  L([[91, 135], [91, 150]], 2);

  // G32 THE COUNT-KNOLL — the first elevation in the zone: Halla had it
  // raised this spring to see the old road's first rows at dusk. The
  // top (x101..105, y139..140) stays grass at level 1; the rim
  // auto-fences to Cliff with the three stairs its only gap; the foot
  // apron and the line to the spur. y142 x101..105 stays level 0 and
  // fenceable: nothing else is ever authored on those five tiles.
  b.raise(100, 138, 7, 4, 1);
  b.stairs(102, 141);
  b.stairs(103, 141);
  b.stairs(104, 141);
  dirt(102, 142);
  dirt(103, 142);
  dirt(104, 142);
  wear.ellipse(103, 143, 2.5, 1);
  L([[105, 143], [106, 143], [107, 143]]);

  // G33 THE PELL YARD — Halla's ground (x87..104, y152..171), sand at
  // its heart, the north gap (91..92,151), the south gap (90..93,172)
  // (PIN (93,171) (93,172)), the lodge apron (PIN (102,175)).
  b.fillRect(87, 152, 18, 20, Tile.Dirt);
  b.fillEllipse(95, 163, 7, 5, Tile.Sand);
  dirt(91, 151);
  dirt(92, 151);
  for (let x = 90; x <= 93; x++) dirt(x, 172);
  wear.ellipse(102, 174, 3, 1);
  dirt(102, 175);

  // G34 THE SCHOOL ROAD + THE BUTTS' GATE — Rill's and Alder's are
  // walked from Halla's: west along y150, the gate approach to the
  // shooting line, on to the copse two wide, Alder's apron (PIN door (29,160)).
  L([[90, 149], [84, 149], [83, 150], [70, 150], [56, 150], [49, 150], [35, 150]]);
  dirt(34, 150);
  dirt(48, 151);
  dirt(48, 152);
  dirt(47, 152);
  dirtRun(33, 34, 151, 160);
  dirt(30, 160);
  dirt(31, 160);
  dirt(32, 160);

  // G35 THE BUTTS — a range is grass, worn only where feet stand and
  // arrows land: the shooting ground and the three marks (the third
  // clipped to x76..80 by the fence at x81). FIX PASS 2 (finding 2):
  // the range fence stands a tile or more off every edge and the
  // backstops stand inside the marks, so these were dirt squares in
  // grass; they rag now. The shooting line's stone and the marks'
  // stakes overwrite what they stand on.
  wear.rect(44, 155, 51, 166);
  wear.rect(56, 158, 61, 163);
  wear.rect(66, 158, 71, 163);
  wear.rect(76, 158, 80, 163);

  // G36 RILL'S HOME WAY — her gate (PIN (52,168)) to her door (PIN (52,174)).
  for (let y = 169; y <= 173; y++) dirt(52, y);

  // G37 THE SPARK WAY — from the pell yard's south gap to the ward arch
  // (75..77,193); Varn's way to his door (PIN).
  L([[91, 173], [88, 176], [85, 180], [81, 184], [78, 188], [77, 191], [76, 192]]);
  // The tile between the arch and the pad's rim: the way goes under
  // the arch and onto the stone, not to a grass step short of it
  // (FIX PASS 2, finding 8; the arch tile itself is spark.ts's).
  dirt(76, 194);
  dirt(60, 199);
  dirt(56, 199);
  dirt(54, 199);
  dirt(53, 199);

  // G38 THE LOG YARD — the trade itself, ranked where the road can take it.
  wear.rect(31, 154, 38, 165);

  // G39 THE SPARK PAD — the old pad, grass taking its rim back the way
  // it takes the Ring's, and the burnt heart where fifty years of
  // lessons landed.
  b.fillEllipse(74, 202, 11, 8, Tile.StoneFloor);
  for (const [gx, gy] of [[64, 198], [84, 206], [67, 208], [82, 196], [74, 210]] as const) {
    b.set(gx, gy, Tile.Grass);
  }
  b.fillEllipse(74, 202, 3, 2, Tile.Dirt);

  // G40 THE SACKING ROW — three families' feet for a season, on the
  // hedge leg's south face (x163..171, y105..108).
  wear.ellipse(167, 106.5, 4.5, 2);

  // G41 THE CRAB BANK — sand shoals where the mudcrabs sun in the open,
  // a warm pool and a cold one (kept verbatim).
  b.fillEllipse(174, 44, 9, 12, Tile.Sand);
  b.fillEllipse(180, 60, 7, 6, Tile.Sand);
  b.fillEllipse(172, 30, 6, 5, Tile.Sand);
  b.fillEllipse(173, 38, 2, 1, Tile.WaterShallow);
  b.fillEllipse(179, 58, 2, 1, Tile.WaterShallow);

  // G42 ASH GROUND — the ONLY ash floor until AshGround lands (ruling
  // Kit 1): the burnt cottage's floor is Dirt under Ash (J14), its
  // open-face row and the lobe where the roof's ash blew south; the
  // sacking row's pan; the spark verge where Varn barrowed a load. No
  // spectrum stroke exists inside the rect (§12.2).
  dirtRun(55, 60, 101, 107);
  for (let y = 101; y <= 107; y++) for (let x = 55; x <= 60; x++) ctx.detail(x, y, Detail.Ash);
  ctx.detail(56, 108, Detail.Ash);
  ctx.detail(58, 108, Detail.Ash);
  ctx.detail(59, 109, Detail.Ash);
  dirtRun(166, 168, 107, 108);
  for (let y = 107; y <= 108; y++) for (let x = 166; x <= 168; x++) ctx.detail(x, y, Detail.Ash);
  ctx.detail(87, 202, Detail.Ash);

  // G43 THE GRANARY — the ruin's floor inside the shell, the breach
  // apron where the fight reads from the road, and the track off the
  // spur to the breach (142..143,170). FIX PASS 2 (live defect 2): the
  // brief's last two points (140,170) (142,171) fell on the shell's
  // wall row, so the track dead-ended at (137,167) against the west
  // wall with four tiles of grass to the apron. It still bends at
  // (137,167), coming down round the shipped long grass at (136,166)
  // (the cat's cover, verbatim; the shipped diagonal ran under it and
  // read as broken); the leg down the wall's west side is ruled,
  // because a wall is its edge (a wobble there would step under the
  // wall and leave a hole in the track); it turns two rows below the
  // wall and wobbles east along y172, past the leaning fence posts,
  // into the apron at (141,172).
  b.fillRect(139, 158, 16, 12, Tile.Dirt);
  wear.ellipse(142.5, 172.5, 3, 2);
  for (let x = 109; x <= 134; x++) dirt(x, 164);
  L([[134, 164], [135, 167], [137, 167]]);
  L([[137, 167], [137, 172]], 1, 0);
  L([[137, 172], [141, 172]]);

  // G44 THE OLD-ROAD SPUR — three grades and the bend: worn HARD where
  // feet go (the knoll, the graves, the lodge; PIN stops on x107),
  // BENDING round the lodge's gable (its east wall is x107), REJOINING,
  // then BROKEN to single tiles with grass between, because past the
  // lodge nobody walks it who means to come back; the EXIT (PIN (108,223)).
  dirtRun(107, 108, 121, 175);
  dirtRun(108, 109, 174, 189);
  dirtRun(107, 108, 188, 190);
  // FIX PASS 1 (defect 10): alternating columns every row read as a
  // regular sawtooth. The broken grade is single tiles where the hash
  // keeps them (0.7), a two-wide remnant now and then (0.15), and tall
  // grass creeping onto the other column where the hash lets it (0.4);
  // the flood walks grass, so (108,223) stays reachable whatever falls.
  for (let y = 191; y <= 220; y++) {
    const on = 107 + (y & 1);
    const off = on === 107 ? 108 : 107;
    if (ctx.rng(on, y) < 0.7) dirt(on, y);
    if (ctx.rng(off, y + 101) < 0.15) dirt(off, y);
    else if (ctx.rng(off, y) < 0.4) b.set(off, y, Tile.GrassTall);
  }
  dirtRun(107, 108, 221, 223);

  // G45 THE ROAD ROW'S GROUND — graves stand on grass; the mouth into
  // the rail's gap (110,156); Tuft, not flowers (NO_FLOWER_ZONES).
  dirt(109, 156);
  ctx.detail(113, 158, Detail.Tuft);
  ctx.detail(115, 158, Detail.Tuft);
  ctx.detail(111, 160, Detail.Tuft);
  ctx.detail(116, 153, Detail.Tuft);

  // G46 THE COLD CAMP'S GROUND — somebody waited a night.
  // (3 by 1.5, FIX PASS 1 defect 11: the 2 by 1 read as a plus sign.)
  wear.ellipse(111, 197, 3, 1.5);
}
