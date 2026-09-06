/**
 * THE SETT (contested lands, band 9d) — ground.ts. THE GROUND FIRST
 * (brief §3.1 G1-G6; the curation law's first pass).
 *
 * G0 the base is TILE_SKIP everywhere: the thinned belt north of the
 *    lip, the east meadow and the forest show through every cell the
 *    mask did not sink or fence (lint.skipRing, lint.floorPainted).
 * G1 THE FLOOR is the mask's: CaveFloor under every sunk cell (the
 *    rock they came up through), Cliff on every rim. Nothing here.
 * G2 THE APRONS: the stair-foot ellipse under the north flight's
 *    mouth; the crown and mouth aprons of the core steps; a Dirt
 *    apron r 1.5 round each of the four corbel cells on the −1 ring
 *    (M1, M2, K1, K2): a cell's door is worn whatever the hash says.
 * G3 THE WEAR (the floor pass; THE CURATION LAW: wear is wobbling
 *    one-wide lines and ragged ellipses, never ribbons or rectangles):
 *    two worn lines from the foot (pins.RIMSET.LINES), west to the
 *    yard's stile and east to the shelf's mouth, one wide with a low
 *    wobble and the hash's breaks (RIMSET.WEAR), so they read as feet
 *    on rock; the third way, foot to core steps, is THE LAID COURSE:
 *    StoneFloor set by the Marl in a wobbling line (RIMSET.LAID), its
 *    last three chalked (rimset.ts). The brush never paints a rim
 *    (Cliff is not wearable) and never crosses a solid.
 * G4 THE WET FLOOR: authored WaterShallow on the core's south half,
 *    61 cells at −2 (the water IS the ground; the ninth course and
 *    Drusa's cell stand in it later); the Dirt edge along its north
 *    bank; Drusa's Dirt north of her cell.
 * G5 THE ASH: on the four cardinals of each hearth (K1 as the Ashlamp
 *    fixed it: the bed's own cell carries none; lint.emberBedsOffAsh).
 * G6 THE YARD'S GROUND: the row strip the taken stand on, the cart's
 *    two feet, and the Plug's walk (Dirt on the ring's border cells,
 *    broken by the hash: a ring of feet, not a square of tape; the
 *    corners, where they turn, always worn).
 * Then every post's patch: a body that stands all day wears its
 *    ground (the crew-stands law); the two in the water stand in it;
 *    the posts that stand in the open (setter_b, Durrow) wear a
 *    ragged ellipse, not a square.
 */
import { Tile } from '@arx/shared';
import type { Pt } from './pins.js';
import { settRng, type SettCtx } from './ctx.js';

const rowCells = (r: { y: number; x0: number; x1: number }): Pt[] => {
  const out: Pt[] = [];
  for (let x = r.x0; x <= r.x1; x++) out.push([x, r.y]);
  return out;
};

export function ground(ctx: SettCtx): void {
  const { pins, wear } = ctx;
  const { HEAD, RIMSET, CORE_STEPS, PLUG, WETFLOOR, YARD, SHELF, POSTS } = pins;

  // G2 THE APRONS. SENTENCE: the north flight's mouth is the one way
  // in and eleven winters of feet have worn its foot bare.
  wear.ellipse(RIMSET.FOOT.cx, RIMSET.FOOT.cy, RIMSET.FOOT.rx, RIMSET.FOOT.ry);
  // SENTENCE: the core steps are the only way down to the floor; their
  // crown and their mouth are worn to the width of the flight.
  for (const [x, y] of rowCells(CORE_STEPS.CROWN_APRON)) ctx.floor(x, y, Tile.Dirt);
  for (const [x, y] of rowCells(CORE_STEPS.MOUTH_APRON)) ctx.floor(x, y, Tile.Dirt);
  // SENTENCE: a cell's door is worn by the one who lives in it.
  for (const [cx, cy] of [RIMSET.M1, RIMSET.M2, SHELF.K1, SHELF.K2]) {
    wear.ellipse(cx, cy, RIMSET.CELL_APRON_R, RIMSET.CELL_APRON_R);
  }
  // The head's own ground on the lip (level 0): the approach, the
  // crown row, the chalk's bare cells and the furrows' cells (a detail
  // needs painted ground under it; the field's cell would drop it).
  ctx.put(HEAD.APPROACH[0], HEAD.APPROACH[1], Tile.Dirt);
  for (const [x, y] of rowCells(HEAD.CROWN)) ctx.put(x, y, Tile.Dirt);
  for (const [x, y] of HEAD.C1) ctx.put(x, y, Tile.Dirt);
  for (const [x, y] of HEAD.FURROWS) ctx.put(x, y, Tile.Dirt);

  // G3 THE WEAR. SENTENCE: from the foot the Marl go west to the
  // weight and east to the fire, and on rock a way is worn where the
  // feet agree, a broken line one foot wide, and nowhere else.
  wear.line(RIMSET.LINES.WEST, { width: 1, ...RIMSET.WEAR });
  wear.line(RIMSET.LINES.EAST, { width: 1, ...RIMSET.WEAR });
  // THE LAID COURSE. SENTENCE: the way south to the floor is the one
  // way down and the Marl set it, stone laid flat from the foot to
  // three short of the crown; the three are chalked (rimset.ts).
  wear.line(RIMSET.LAID, { width: 1, wobble: RIMSET.WEAR.wobble, tile: Tile.StoneFloor });

  // G4 THE WET FLOOR. SENTENCE: the wet came up under the Sinter and
  // they set where it stands on the Sett's floor.
  ctx.water(WETFLOOR.ROWS.flatMap(rowCells));
  // SENTENCE: the bank the dry ones stand on to look at the wet, worn
  // where they stand and rock between (the hash breaks it, never two
  // in a row); Drusa's Dirt north of her cell is hers whatever the
  // hash says.
  ragged(rowCells(WETFLOOR.EDGE), (x, y) => ctx.floor(x, y, Tile.Dirt), 0.3, new Set([`${WETFLOOR.DRUSA_DIRT[0]},${WETFLOOR.DRUSA_DIRT[1]}`]));
  ctx.floor(WETFLOOR.DRUSA_DIRT[0], WETFLOOR.DRUSA_DIRT[1], Tile.Dirt);

  // G5 THE ASH. SENTENCE: black stone burns long and leaves a pan;
  // the pan is round the bed, never under it.
  ctx.ash(SHELF.B1[0], SHELF.B1[1]);
  ctx.ash(SHELF.B2[0], SHELF.B2[1]);

  // G6 THE YARD'S GROUND. SENTENCE: the taken were laid in a row on
  // ground kept bare for them, like the dead.
  for (const [x, y] of rowCells(YARD.ROW_STRIP)) ctx.floor(x, y, Tile.Dirt);
  // SENTENCE: the cart stands on its two feet and the ground under
  // both is the cart's (E5: a foot is open ground the author gave it).
  ctx.floor(YARD.CART[0], YARD.CART[1], Tile.Dirt);
  ctx.floor(YARD.CART_FOOT[0], YARD.CART_FOOT[1], Tile.Dirt);
  // THE PLUG'S WALK. SENTENCE: they go round the dome and never over
  // it, and the ring their feet have worn is the whole of what the
  // floor says about the hole: worn hardest where they turn, broken
  // between, a ring of feet and not a square of tape.
  const w = PLUG.WALK;
  const corners = new Set([`${w.x0},${w.y0}`, `${w.x1},${w.y0}`, `${w.x1},${w.y1}`, `${w.x0},${w.y1}`]);
  ragged(ringCells(w), (x, y) => ctx.floor(x, y, Tile.Dirt), 0.3, corners);

  // The posts' patches (the crew-stands law): the two wetsetters stand
  // in the water and wear nothing; a post in the open wears a ragged
  // ellipse (the setter at the dead-row's head, Durrow between his
  // fires); the rest stand in an apron already worn.
  for (const p of Object.values(POSTS)) ctx.stand(p.x, p.y);
  ctx.stand(pins.VORL_ROW.seat[0], pins.VORL_ROW.seat[1]);
  for (const key of ['setter_b', 'dolmen_durrow'] as const) {
    const p = POSTS[key];
    wear.ellipse(p.x, p.y, RIMSET.POST_APRON_R, RIMSET.POST_APRON_R);
  }
}

/** The border of a box, walked in order (top L→R, east side, bottom R→L, west side) so "never two in a row" means along the ring. */
function ringCells(b: { x0: number; y0: number; x1: number; y1: number }): Pt[] {
  const out: Pt[] = [];
  for (let x = b.x0; x <= b.x1; x++) out.push([x, b.y0]);
  for (let y = b.y0 + 1; y <= b.y1; y++) out.push([b.x1, y]);
  for (let x = b.x1 - 1; x >= b.x0; x--) out.push([x, b.y1]);
  for (let y = b.y1 - 1; y > b.y0; y--) out.push([b.x0, y]);
  return out;
}

/**
 * THE RAGGED RUN: paint every cell of an ordered run but the ones the
 * hash drops (fraction `gap`, never two in a row, never a kept cell),
 * on the Sett's own salt, so the run is byte-identical and reads as
 * wear, not fill.
 */
function ragged(cells: ReadonlyArray<Pt>, paint: (x: number, y: number) => void, gap: number, keep: ReadonlySet<string>): void {
  let dropped = false;
  for (const [x, y] of cells) {
    const drop: boolean = !keep.has(`${x},${y}`) && !dropped && settRng(x + 61, y + 67) < gap;
    dropped = drop;
    if (!drop) paint(x, y);
  }
}
