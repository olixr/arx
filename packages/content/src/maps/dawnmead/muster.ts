/**
 * DAWNMEAD UNDER SIEGE (band 6) — muster.ts [L5 SOUTH].
 *
 * D16 THE MUSTER COURT + HALLA'S CHART + THE COUNT-KNOLL.
 *
 * SCENES / BOXES (brief §3, declared with ctx.box):
 *   the court, the chart and the knoll (94,117)-(107,149); the court's
 *   west hem south of the Ring box (84,125)-(93,149). Column 107 is
 *   the spur's own column (G44 ground; OPEN_STOPS (107,120) (107,121)):
 *   the box carries it as the brief wrote it and nothing of this scene
 *   ever stands on it. THE GREEN's box begins at x108 and the Road
 *   Row's at x108, so the box is disjoint from both.
 * GROUND (laid by L1 ground.ts before this runs): G29 the proving way,
 *   G30 the court ellipse + the line strip + the chart's floor, G31 the
 *   approach, G32 the knoll raise, stairs and apron.
 * SIGNS: THE MUSTER LINE (95,124) Signpost, four lines (J7; FIX PASS
 *   1 defect 2 moved it four cols west of (99,124): 25 cols from the
 *   DAWNMEAD post at the true 48x45 eyeful).
 * CAST HOOKS: ward #4's post (98.5,120.5) dir π/2 between the two
 *   stands; Halla's knoll sit (102,139) staged from (102,140); the
 *   apron y142 x101..105 is never authored; keepOut [98,136,108,146].
 * THE GOLDEN RIM (J7, J17): the box's NW rim (LampPost (85,117),
 *   NoticeBoard (93,119), WeaponRack (90,120), ArmorStandFull (92,122),
 *   Bench (87,123) (87,124)) is KEPT byte-identical. This module's boxes
 *   do not overlap the Ring box (x >= 94, or y >= 125), so it places
 *   nothing inside it; it asserts the golden literal still carries the
 *   rim before anything else is laid. LampPost (106,117) was moved to
 *   (110,117) by J7 and CUT by FIX PASS 1 (defect 4: it doubled the
 *   green's (109,119)); no lamp of the court's is placed here.
 * FIX PASS 1 (defect 3): HALLA'S CHART stood at y117-119, two rows
 *   south of the hound's WayShrine (103,115), and its stub's crown
 *   buried the shrine (S5 read as one wooden shed). The whole chart
 *   steps four rows south: stub (103..105,121), canopy (103..105,122),
 *   Table (103,123), Lectern (105,123), her stand (104,123), all on
 *   the court's own dirt; the SpearRack goes to (106,119).
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
import { Detail, Tile, awningTile, bannerStandTile } from '@arx/shared';
import type { DawnCtx } from './ctx.js';

/** The box's NW rim, the shipped tiles the golden must still carry (J7). */
const GOLDEN_RIM: ReadonlyArray<readonly [number, number, Tile]> = [
  [85, 117, Tile.LampPost],
  [93, 119, Tile.NoticeBoard],
  [90, 120, Tile.WeaponRack],
  [92, 122, Tile.ArmorStandFull],
  [87, 123, Tile.Bench],
  [87, 124, Tile.Bench],
];

function assertGoldenRim(ctx: DawnCtx): void {
  const box = ctx.pins.RING_BOX;
  const golden = ctx.pins.RING_BOX_GOLDEN;
  for (const [x, y, t] of GOLDEN_RIM) {
    const k = (y - box.y0) * box.w + (x - box.x0);
    if (golden.ground[k] !== t) {
      throw new Error(`dawnmead muster: the golden rim lost tile ${t} at (${x},${y}) (found ${golden.ground[k]})`);
    }
  }
}

export function muster(ctx: DawnCtx): void {
  const { b } = ctx;
  assertGoldenRim(ctx);

  ctx.box(94, 117, 107, 149, 'muster: the court, the chart, the knoll');
  ctx.box(84, 125, 93, 149, "muster: the court's west hem");

  // ================================================================
  // THE MUSTER LINE. The wards form up on the raked strip where the
  // proving way arrives, and this spring a fourth body stands it from
  // seven to nineteen so the rota is no longer a sign above an empty
  // line; Halla wrote the fire count on the board herself because a
  // line with no count is a fete.
  // ================================================================
  // The fordgate's colour at the line's west end: the wards are the
  // ford's enforcers on the village's own line (J10, weld).
  b.set(96, 119, bannerStandTile(ctx.pins.DYE_FORDGATE));
  // The Crown's colour at the east end, verbatim: the wards are still
  // the Crown's men, whoever pays for the bridge.
  b.set(100, 119, bannerStandTile(ctx.pins.DYE_CROWN));
  // The fourth ward stands the line between the two colours, seven to
  // nineteen and a quarter; people.ts places the body.
  ctx.post(98, 120);
  // The wards' own stand, dressed from at seven: bare, because the man
  // on the line is wearing it.
  b.set(101, 122, Tile.ArmorStand);
  // The wards' spears, Ottery's make, moved a pace east from (103,120)
  // by J7 and two rows north from (106,121) by FIX PASS 1 (defect 3)
  // so the chart's stub, now at y121, never stands in the rack's row;
  // it keeps the court's north-east verge beside the proving way.
  b.set(106, 119, Tile.SpearRack);
  // The watchers' side: two benches east of the line for whoever came
  // to see a muster and stayed to see the count.
  b.set(105, 126, Tile.Bench).set(105, 127, Tile.Bench);
  // Pebbles where the line's east end is scuffed by boots turning.
  ctx.detail(96, 124, Detail.Pebbles);
  // THE MUSTER LINE board, five rows south of the line's west end
  // inside the court's own dirt, the one Signpost in this eyeful (J7,
  // J16; FIX PASS 1 defect 2 stepped it four cols west to (95,124),
  // 25 cols from DAWNMEAD): the rota and the fire count, in Halla's
  // hand.
  const board = ctx.pins.SIGN_LEDGER.muster_line;
  ctx.sign(board.x, board.y, board.title, board.lines, board.tile);

  // ================================================================
  // HALLA'S CHART. Rain took her first chart in the spring, so she
  // nailed a tarred board over the table at the line's east end where
  // her watch trees are read standing, in weather, by whoever is on the
  // line; a paper chart in the lodge is a chart nobody on the line can
  // see.
  // ================================================================
  // The stub: three posts and boards, a WALL_RUN member no sign may
  // stand on; the awning host law wants a wall north of every canopy.
  // FIX PASS 1 (defect 3): at y117 the stub's crown buried the hound
  // shrine two rows north of it; the chart stands at y121 now, four
  // rows south, still the line's east end, on the court's own dirt.
  b.set(103, 121, Tile.WallWood).set(104, 121, Tile.WallWood).set(105, 121, Tile.WallWood);
  // The tarred board over the table, charcoal, directly south of the
  // stub (a tarred board is not a faction stand: J10).
  b.set(103, 122, awningTile('board', 7)).set(104, 122, awningTile('board', 7)).set(105, 122, awningTile('board', 7));
  // The tally sticks live on the table under the west end of the board.
  b.set(103, 123, Tile.Table);
  // The chart itself is read from the lectern at the east end; her
  // reading stand (104,123) between them stays open.
  b.set(105, 123, Tile.Lectern);
  // Pebbles where the reader shifts her feet in front of the lectern.
  ctx.detail(104, 124, Detail.Pebbles);

  // ================================================================
  // THE YARD'S HOUSEKEEPING, verbatim east of the box: what a court
  // needs when the line is not stood.
  // ================================================================
  // The water barrel at the court's south-east hem, on the way to the
  // knoll, because the wards drink after the line and not before.
  b.set(104, 133, Tile.Barrel);
  // Two bales for the court's dummy, dragged where the cart could drop
  // them and no further.
  b.set(94, 133, Tile.HayBale).set(95, 132, Tile.HayBale);
  // The Charter's crates of issued kit that nobody on the line has
  // claimed, stacked at the south rim.
  b.set(99, 133, Tile.CrateStack);
  // The court's own dummy, for the ward who did not get a turn at the
  // pell yard because he was standing the line.
  b.set(101, 129, Tile.TargetDummy);
  // Scuffed ground and straw where the bales were split and the dummy
  // hit.
  ctx.detail(100, 128, Detail.Pebbles);
  ctx.detail(98, 126, Detail.Sawdust);
  ctx.detail(102, 133, Detail.Straw);

  // ================================================================
  // THE WEST HEM, south of the Ring box (x <= 93, y >= 125): the
  // shipped housekeeping ranked at the court's west rim, verbatim.
  // ================================================================
  // The rail a visitor ties to when they ride in to watch the line.
  b.set(88, 128, Tile.HitchingPost);
  // The court's grindstone at the west hem, the wards' edges kept by
  // the man off the line.
  b.set(87, 131, Tile.Grindstone);
  // The woodpile beside it, for the lodge's hearth and the knoll's
  // brazier both.
  b.set(89, 132, Tile.Woodpile);
  // The second court dummy, the one the watchers hit while they wait.
  b.set(91, 130, Tile.TargetDummy);
  // Pebbles and straw where the second dummy is struck and re-stuffed.
  ctx.detail(91, 127, Detail.Pebbles);
  ctx.detail(93, 131, Detail.Straw);
  ctx.detail(91, 131, Detail.Straw);

  // ================================================================
  // THE COUNT-KNOLL. Halla had the knoll raised this spring so she
  // could see the old road's first rows at dusk and count what comes
  // up it; the bench is where she sits to count and the brazier is the
  // fire she lights herself, and a habit that has lasted since the
  // spring earns a seat. The raise, the three stairs and the apron are
  // G32's; the rim auto-fences to Cliff; only x101..105 y139..140 is
  // ever authored.
  // ================================================================
  // Her seat, inside the rim on the west: she sits facing south down
  // the spur (ruling 4), staged from (102,140), grass at level 1.
  b.set(102, 139, Tile.StoneBench);
  // Her watch fire, inside the rim on the east, lit by her own hand at
  // dusk (ruling Kit 12; J15: if lights.test refuses a second town
  // night-light the tile stays a cold brazier and the lighting is a bark).
  b.set(104, 139, Tile.Brazier);
  // Pebbles between the seat and the fire where she stands to count.
  ctx.detail(103, 140, Detail.Pebbles);
  // The knoll and its apron are the edge woods' business to avoid; the
  // rim rule skips every off-level tile as well.
  ctx.keepOut(98, 136, 108, 146, 'the count-knoll and its apron (S3)');
}
