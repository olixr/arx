/**
 * THE SCARRED LAND — A. the cold hearth's walls: RuinWallStone (505)
 * and RuinWallWood (506), the SIXTH and SEVENTH run-merging families.
 *
 * THE SEPARATE-MASONRY LAW, spoken twice more: a ruin merges with its
 * OWN kind only — stone with stone, char with char. It never dies into
 * a living WallStone/WallWood run (the fire stopped HERE: a standing
 * house does not become a ruin mid-wall), never bounds an interior,
 * and the roofer (keyed on WALL_RUN_TILES) can never grow a roof over
 * it. Like the fence, the palisade, the hedge and the iron, both
 * paint their exposed silhouette LIVE at `beginStructOutline` weight
 * — exposed edges only, shared edges never — so runs of any length
 * ring seamlessly with no bake cap. They therefore return NO `body`
 * (a body would put the per-tile eight-tap ring on every tile and ink
 * every seam) and stand outside CACHED_RING_TILES; the renderer's
 * switch calls in here directly.
 *
 * EDGE-STABLE crests: every mass that touches a tile seam takes its
 * height from the SEAM's own hash (west seam = (tx,ty), east seam =
 * (tx+1,ty); north = (tx,ty), south = (tx,ty+1)), so the two tiles
 * meeting there agree to the pixel and the skyline steps only INSIDE
 * a tile. Every hash-dealt flourish (chips, soot, moss, laths, the
 * fallen plate) lives mid-span, never across a seam.
 *
 * THE STONE (505): TWN_STONE course blocks — the town's own kept
 * limestone, which is what a burnt house is made of — laid in four
 * quarter-tile columns, each a stack of 0.16-tile courses (three to
 * seven: a 0.48..1.12-tile body against the 1.15-tile rig), so the
 * crest is a stepped skyline. Broken course tops are THE lit facet
 * (TOP-PLANE at syT·0.32); every step-up shows a lit west riser to the
 * fixed art sun and a shaded east fall; courses alternate tone and
 * every second header block shows its darker end (the courses read
 * as courses at a tile's distance); mortar is a dark value step,
 * never a line. A rubble skirt of squared blocks leans on the foot
 * and shares the wall's silhouette (the foot walk steps around them
 * — no chip rings alone but the one loose chip out in the grass),
 * one soot lick climbs the leeward (east) half of the face, and a
 * GY_MOSS chip takes a north joint on the crest. Free E-W run ends
 * carry no anchor: they tumble down to three courses and spill chips
 * (a ruin dies into its own skirt); a quoin block — six or seven
 * courses, the tallest thing on its tile — anchors every N-S end,
 * corner, tee and cross, with the masses beside it capped a course
 * under it.
 *
 * THE TIMBER (506): a charred sill plate seam-to-seam with its nail
 * line of dark dots, two or three SCAR_CHAR studs a tile (1.0..1.3
 * body; every third hash tile burns one down to a 0.4 stub) standing
 * ON the plate, each with an ash-grey lit top that is its own square
 * section foreshortened (a 0.1-tile timber cannot show a wall-deep
 * plane — the fat corner post earns a deeper cap the same way), a
 * west face that is the one lit facet and wears the ember-check
 * squares — the alligator char catching the sun, nowhere else — a
 * leaning wall-plate beam with silvered end grain that slid off the
 * studs, and lath fragments still nailed between them.
 *
 * Both walls speak every direction: E-W courses face the camera; N-S
 * runs are the honest edge-on projection (a crest band / a sill band
 * marching up-screen, studs as billboards in depth, every foot
 * PROJECTED through barrierPt so runs meet seam-true under the lean —
 * at q=0 every point collapses to today's axis rects); a junction
 * (corner, tee, run-into-run) anchors on one quoin block / corner
 * post at the tile heart. Fills and struct strokes only — no
 * translate/rotate, so the canvas oracle and the GL stage agree.
 * Nothing here breathes (no cloth), nothing glows (no light rows),
 * and shadows cast per frame through castEdgeQuad.
 */
import { RUIN_WALL_TILES, Tile, hashCoords } from '@arx/shared';
import { barrierPt } from '../../barrierArt.js';
import { ELEV_H } from '../../elevPick.js';
import { GY_MOSS } from '../../paintVocab.js';
import { chamferRect, facetBlob } from '../../shapes.js';
import { DOCK_LIFT } from '../../terrain.js';
import { shade } from '../../tint.js';
import { SCAR_ASH, SCAR_CHAR, TWN_STONE, TWN_STONE_DARK, TWN_STONE_LIT } from '../palette.js';
import type { ClientGame } from '../../../game/clientGame.js';
import type { PaintHost } from '../../paintHost.js';
import type { DrawItem } from '../../renderer.js';

// ---- inks -------------------------------------------------------------

/** The stone: kept limestone, sooted. Face a half step under the town's
 *  kept wall (a ruin has no one to lime-wash it), crest the lit key. */
const ST_FACE = shade(TWN_STONE, -6);
/** THE COURSES READ AS COURSES (K1 polish): the face is laid course by
 *  course, tones alternating ±7 about ST_FACE — one pale value with
 *  only the mortar steps washed to a flat slab at zoom 1.3 — and every
 *  second header block (the half block laid THROUGH the wall, its end
 *  face showing) a step darker still. All inside TWN_STONE's family
 *  and every one under the lit crest: the top plane stays brightest. */
const ST_FACE_UP = shade(ST_FACE, 7);
const ST_FACE_DOWN = shade(ST_FACE, -7);
const ST_HEADER = shade(ST_FACE, -15);
const ST_LIT = TWN_STONE_LIT;
const ST_LIT_FAR = shade(TWN_STONE_LIT, -18);
const ST_WEST = shade(TWN_STONE, 16);
const ST_EAST = shade(TWN_STONE_DARK, -10);
const ST_MORTAR = shade(TWN_STONE_DARK, -26);
const ST_CHIP = shade(TWN_STONE, -2);
const ST_CHIP_LIT = shade(TWN_STONE_LIT, -4);
const SOOT = 'rgba(22, 16, 24, 0.44)';
const CONTACT = 'rgba(12, 8, 20, 0.26)';

/** The timber: cold violet-black char (never brown — burnt wood drinks
 *  the light), its lit facet one careful step up, its burnt-through
 *  tops dusted ash-grey, the plate's end grain silvered by weather. */
const CH_FACE = SCAR_CHAR;
const CH_LIT = shade(SCAR_CHAR, 22);
const CH_CHECK = shade(SCAR_CHAR, 40);
const CH_EAST = shade(SCAR_CHAR, -8);
const CH_TOP = shade(SCAR_ASH, -22);
const CH_TOP_FAR = shade(SCAR_ASH, -48);
const CH_LATH = shade(SCAR_CHAR, 34);
const CH_SILVER = shade(SCAR_ASH, 26);
const NAIL = '#141016';

// ---- measure ----------------------------------------------------------

/** One masonry course, tiles. Three to seven courses stand. */
const COURSE = 0.16;
/** Column pitch of the stone course, tiles (four to the tile). */
const COL = 0.25;
/** The N-S crest band's half width, tiles (a 0.3-tile wall in depth). */
const BAND_HW = 0.15;
/** A stud's nominal width, tiles (0.13..0.16 with its hash jitter — a
 *  hand's width of timber, wide enough that the checks survive). */
const STUD_W = 0.13;
/** Stud stations across an E-W tile, tile fractions from the centre. */
const STUD_FX: readonly number[] = [-0.33, 0, 0.33];
/** Stud stations down an N-S tile (north half, south half). */
const STUD_FY_N: readonly number[] = [-0.375, -0.125];
const STUD_FY_S: readonly number[] = [0.125, 0.375];

/** Courses standing, dealt from a hash: 3..7, weighted to the middle. */
function coursesOf(seed: number): number {
  return 3 + [0, 1, 1, 2, 2, 3, 3, 4][seed & 7]!;
}

/**
 * THE EDGE-STABLE LAW, as a pure function: the courses standing at one
 * of a tile's four seams. The seam owns the number — the west seam of
 * (tx,ty) IS the east seam of (tx-1,ty), the north seam of (tx,ty) IS
 * the south seam of (tx,ty-1) — so two tiles meeting there agree to
 * the pixel and a run of any length joins without a step. Exported
 * for the pin in ruinWalls.test.ts.
 */
export function stoneSeamCourses(tx: number, ty: number, side: 'w' | 'e' | 'n' | 's'): number {
  switch (side) {
    case 'w':
      return coursesOf(hashCoords(505, tx, ty));
    case 'e':
      return coursesOf(hashCoords(505, tx + 1, ty));
    case 'n':
      return coursesOf(hashCoords(507, tx, ty));
    case 's':
      return coursesOf(hashCoords(507, tx, ty + 1));
  }
}

/** A stud's body, tiles: 1.0..1.3. */
function studBody(seed: number): number {
  return 1.0 + (((seed >>> 2) & 7) / 7) * 0.3;
}

/** Own-kind connectivity: a ruin course reaches only for its own tile id. */
function ruinKin(game: ClientGame, tile: Tile, x: number, y: number): boolean {
  const t = game.world.groundAt(x, y);
  return t === tile && RUIN_WALL_TILES.has(t);
}

/** Mint-time frame shared by both walls: the projected tile datum and
 *  its own-kind connectivity. */
interface RunFrame {
  readonly tx: number;
  readonly ty: number;
  readonly s: number;
  readonly syT: number;
  readonly px: number;
  readonly baseY: number;
  readonly lift: number;
  readonly h: number;
  readonly cn: boolean;
  readonly ce: boolean;
  readonly cs: boolean;
  readonly cw: boolean;
  /** E-W span, screen x (equal when the tile carries no E-W course). */
  readonly xw: number;
  readonly xe: number;
  readonly ewAny: boolean;
  readonly nsAny: boolean;
  /** A corner, tee, cross, or a run turning into a run: the tile heart
   *  anchors on one squared block (a through-run needs none). */
  readonly anchor: boolean;
  /** The E-W course's ends stand in the open (no kin, no junction). */
  readonly westFree: boolean;
  readonly eastFree: boolean;
}

function runFrame(rend: PaintHost, tile: Tile, tx: number, ty: number, game: ClientGame): RunFrame {
  const s = rend.camera.scale; // the lean is gone (epic/lean-out): one flat scale, no depth term
  const syT = s * rend.camera.yScale;
  const p = rend.camera.worldToScreen(tx + 0.5, ty + 0.5, rend.w, rend.h);
  let lift = game.world.elevAt(tx, ty) * ELEV_H * s;
  p.y -= lift;
  if (rend.porchAt(game, tx, ty)) {
    p.y -= DOCK_LIFT * s;
    lift += DOCK_LIFT * s;
  }
  const cn = ruinKin(game, tile, tx, ty - 1);
  const ce = ruinKin(game, tile, tx + 1, ty);
  const cs = ruinKin(game, tile, tx, ty + 1);
  const cw = ruinKin(game, tile, tx - 1, ty);
  const any = cn || ce || cs || cw;
  const isoEW = !any;
  const xw = cw || isoEW ? p.x - s * 0.5 : p.x;
  const xe = ce || isoEW ? p.x + s * 0.5 : p.x;
  const ewAny = cw || ce || isoEW;
  const nsAny = cn || cs;
  const nsThrough = cn && cs && !ewAny;
  // A quoin / corner post anchors every tile that carries a N-S course
  // and is not a pure N-S through-run: N-S run ends, corners, tees,
  // crosses. E-W run ends carry no anchor — they TUMBLE (a ruin dies
  // into its own skirt), which is the story the family tells.
  const anchor = nsAny && !nsThrough;
  return {
    tx,
    ty,
    s,
    syT,
    px: p.x,
    baseY: p.y + syT * 0.14,
    lift,
    h: hashCoords(tile, tx, ty),
    cn,
    ce,
    cs,
    cw,
    xw,
    xe,
    ewAny,
    nsAny,
    anchor,
    westFree: ewAny && !cw && !nsAny,
    eastFree: ewAny && !ce && !nsAny,
  };
}

export function ruinWallItem(rend: PaintHost, tile: Tile, tx: number, ty: number, game: ClientGame): DrawItem {
  const f = runFrame(rend, tile, tx, ty, game);
  return tile === Tile.RuinWallStone ? stoneItem(rend, f) : woodItem(rend, f);
}

// ---- THE STONE --------------------------------------------------------

function stoneItem(rend: PaintHost, f: RunFrame): DrawItem {
  const { tx, ty, s, syT, px, baseY, lift, h, cn, cs, cw, ce, xw, xe, ewAny } = f;
  const top = syT * 0.32;
  const c = COURSE * s;
  const colW = COL * s;
  const jw = Math.max(1, s * 0.03);

  // The columns this tile draws: all four across a through-run or a
  // lone tumble, the two of one half when the course ends at the heart.
  const i0 = xw < px ? 0 : 2;
  const i1 = xe > px ? 3 : 1;
  const colX = (i: number) => px - s * 0.5 + i * colW;
  // The quoin stands six or seven courses and every INTERIOR mass
  // beside it is capped a course under it. A border column (0/3)
  // keeps the raw seam hash (3..7) so it meets its neighbour's
  // column at exactly one height — edge stability outranks the
  // crown, so one seam column in sixteen stands level with the
  // quoin; nothing on the tile ever overtops it by more than that.
  const anchorCourses = 6 + ((h >>> 20) & 1);
  const capBesideQuoin = (n: number) => (f.anchor ? Math.min(n, anchorCourses - 1) : n);

  // Column heights, in courses. Border columns (0 and 3) take the SEAM
  // hash so a neighbour's border column stands at exactly the same
  // height; the first/last DRAWN column of a free end tumbles down to
  // three courses (the wall dies into its skirt); the two interior
  // columns are the tile's own.
  const colCourses = (i: number): number => {
    if (f.westFree && i === i0) return 3;
    if (f.eastFree && i === i1) return 3;
    if (i === 0) return stoneSeamCourses(tx, ty, 'w');
    if (i === 3) return stoneSeamCourses(tx, ty, 'e');
    return capBesideQuoin(coursesOf(hashCoords(509, tx * 4 + i, ty)));
  };

  // N-S crest band: four depth segments to the tile (two a half), the
  // north and south seam segments sharing the seam hash.
  const segCourses = (k: number): number => {
    if (k === 0) return cn ? stoneSeamCourses(tx, ty, 'n') : coursesOf(hashCoords(511, tx, ty * 4));
    if (k === 3) return cs ? stoneSeamCourses(tx, ty, 's') : coursesOf(hashCoords(511, tx, ty * 4 + 3));
    return capBesideQuoin(coursesOf(hashCoords(511, tx, ty * 4 + k)));
  };

  // The skirt: three or four blocks lie mid-span (never across a seam),
  // two when the course is a half; a free end spills two more.
  const chipSeeds: number[] = [];
  if (ewAny) {
    const span = xe - xw;
    const n = span > s * 0.75 ? 3 + ((h >>> 3) & 1) : 2;
    for (let i = 0; i < n; i++) chipSeeds.push(hashCoords(513, tx * 8 + i, ty));
  }

  return {
    sortY: ty + 0.8,
    drawShadow: () => {
      // The living wall's law (renderer wall items): a prism casts
      // from its SOUTH foot edge, E-W, at its plan width. A N-S band
      // cast from its zero-width centre line extrudes to a hairline
      // sliver under a near-noon sun — the dark spike that hung
      // under every free south end. The E-W course's cast already
      // covers the north half's foot at the heart.
      if (ewAny) rend.castEdgeQuad(xw, baseY, xe, baseY, 0.8);
      else if (cn) rend.castEdgeQuad(px - BAND_HW * s, baseY, px + BAND_HW * s, baseY, 0.8);
      if (cs) rend.castEdgeQuad(px - BAND_HW * s, baseY + syT * 0.5, px + BAND_HW * s, baseY + syT * 0.5, 0.8);
    },
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      const bp0 = { x: 0, y: 0 };
      const bp1 = { x: 0, y: 0 };

      /** The courses of one column, foot up: each course's own tone
       *  (alternating up / down about the face), the header block in
       *  every second odd course a darker step (checkered by column so
       *  the darks never line up into a stripe), then the mortar —
       *  horizontal beds every course, perpends staggered in running
       *  bond — as dark value steps over it all. `k` is the column's
       *  index, the checker's other axis. */
      const courses = (x: number, w: number, n: number, k: number) => {
        for (let j = 0; j < n; j++) {
          const y = baseY - (j + 1) * c;
          ctx.fillStyle = j & 1 ? ST_FACE_UP : ST_FACE_DOWN;
          ctx.fillRect(x, y, w, c);
          // Odd courses carry the perpend at mid-column: the half block
          // east of it is the header. Every second one shows its end.
          if (j & 1 && (((j >> 1) + k) & 1) === 0) {
            ctx.fillStyle = ST_HEADER;
            ctx.fillRect(x + w * 0.5, y, w * 0.5, c);
          }
        }
        ctx.fillStyle = ST_MORTAR;
        for (let j = 1; j < n; j++) ctx.fillRect(x, baseY - j * c - jw * 0.5, w, jw);
        for (let j = 0; j < n; j++) {
          const jx = x + (j & 1 ? w * 0.5 : 0);
          ctx.fillRect(jx - jw * 0.5, baseY - (j + 1) * c, jw, c);
        }
      };

      // ---- the N-S crest band (north half first; the south half after
      // the course and the anchor, so every overlap reads front-over-back)
      const bandHalf = (half: 'n' | 's') => {
        const ks = half === 'n' ? [0, 1] : [2, 3];
        for (const k of ks) {
          const fyN = -0.5 + k * 0.25;
          const fyS = fyN + 0.25;
          const nC = segCourses(k);
          const H = nC * c;
          const a = barrierPt(px, s, baseY, syT, 0, fyN, bp0);
          const ax = a.x;
          const ay = a.y;
          const b = barrierPt(px, s, baseY, syT, 0, fyS, bp1);
          const bx = b.x;
          const by = b.y;
          const hw = BAND_HW * s;
          // Whatever stands south of this segment: the next segment, the
          // seam-shared neighbour, or nothing (a free end / the junction
          // block, which paints over the full face).
          const nextC =
            k === 3 ? (cs ? nC : 0) : k === 1 && !cs && half === 'n' ? 0 : segCourses(k + 1);
          // The riser: the south face showing above whatever stands south.
          if (nextC < nC) {
            const faceH = (nC - nextC) * c;
            ctx.fillStyle = ST_FACE;
            ctx.fillRect(bx - hw, by - H, hw * 2, faceH);
            // The riser's courses alternate like the E-W face's.
            for (let j = nextC; j < nC; j++) {
              ctx.fillStyle = j & 1 ? ST_FACE_UP : ST_FACE_DOWN;
              ctx.fillRect(bx - hw, by - (j + 1) * c, hw * 2, c);
            }
            ctx.fillStyle = ST_MORTAR;
            for (let j = nextC + 1; j < nC; j++) ctx.fillRect(bx - hw, by - j * c - jw * 0.5, hw * 2, jw);
            ctx.fillStyle = ST_WEST;
            ctx.fillRect(bx - hw, by - H, s * 0.04, faceH);
            ctx.fillStyle = ST_EAST;
            ctx.fillRect(bx + hw - s * 0.03, by - H, s * 0.03, faceH);
          }
          // The crest: the lit top plane running in depth, its west edge
          // a hair brighter (the sun rakes it), its east edge shaded.
          ctx.fillStyle = ST_LIT;
          ctx.beginPath();
          ctx.moveTo(ax - hw, ay - H);
          ctx.lineTo(ax + hw, ay - H);
          ctx.lineTo(bx + hw, by - H);
          ctx.lineTo(bx - hw, by - H);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = shade(ST_LIT, 10);
          ctx.beginPath();
          ctx.moveTo(ax - hw, ay - H);
          ctx.lineTo(ax - hw + s * 0.04, ay - H);
          ctx.lineTo(bx - hw + s * 0.04, by - H);
          ctx.lineTo(bx - hw, by - H);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = ST_LIT_FAR;
          ctx.beginPath();
          ctx.moveTo(ax + hw - s * 0.04, ay - H);
          ctx.lineTo(ax + hw, ay - H);
          ctx.lineTo(bx + hw, by - H);
          ctx.lineTo(bx + hw - s * 0.04, by - H);
          ctx.closePath();
          ctx.fill();
          // Block beds crossing the crest in depth: a mason laid this.
          ctx.fillStyle = ST_MORTAR;
          const my = (ay + by) * 0.5 - H;
          ctx.fillRect(bx - hw + s * 0.04, my - jw * 0.5, hw * 2 - s * 0.08, jw);
          if (rend.outlineOn) {
            // Silhouette: the two crest edges, the step to the next
            // crest, the free north end, and the riser's foot.
            rend.beginStructOutline();
            ctx.beginPath();
            const stepY = by - nextC * c;
            ctx.moveTo(ax - hw, ay - H);
            ctx.lineTo(bx - hw, by - H);
            if (nextC < nC) ctx.lineTo(bx - hw, stepY);
            ctx.moveTo(ax + hw, ay - H);
            ctx.lineTo(bx + hw, by - H);
            if (nextC < nC) ctx.lineTo(bx + hw, stepY);
            if (k === 0 && !cn) {
              ctx.moveTo(ax - hw, ay - H);
              ctx.lineTo(ax + hw, ay - H);
            }
            if (nextC === 0) {
              ctx.moveTo(bx - hw, by);
              ctx.lineTo(bx + hw, by);
            }
            ctx.stroke();
          }
        }
      };

      // ---- the E-W course: four quarter-tile columns of coursed blocks
      const courseEW = () => {
        // Contact shade seats the whole run in its ground.
        ctx.fillStyle = CONTACT;
        ctx.fillRect(xw, baseY - s * 0.02, xe - xw, s * 0.06);
        let prevC = f.westFree ? 0 : colCourses(i0);
        for (let i = i0; i <= i1; i++) {
          const x = colX(i);
          const nC = colCourses(i);
          const H = nC * c;
          ctx.fillStyle = ST_FACE;
          ctx.fillRect(x, baseY - H, colW, H);
          courses(x, colW, nC, i);
          // The lit crest: a broken course top is THE lit facet.
          ctx.fillStyle = ST_LIT;
          ctx.fillRect(x, baseY - H - top, colW, top);
          ctx.fillStyle = ST_LIT_FAR;
          ctx.fillRect(x, baseY - H - top, colW, Math.max(1, s * 0.03));
          // A step up from the west: the block's west side catches the
          // sun down to the lower crest (a free west end: to the ground).
          if (nC > prevC) {
            ctx.fillStyle = ST_WEST;
            ctx.fillRect(x, baseY - H - top, s * 0.04, (nC - prevC) * c + (prevC === 0 ? top : 0));
          }
          // A step down to the east: the taller block's east side falls
          // into shade above the lower crest.
          const nextC = i < i1 ? colCourses(i + 1) : f.eastFree ? 0 : nC;
          if (nextC < nC) {
            ctx.fillStyle = ST_EAST;
            ctx.fillRect(x + colW - s * 0.03, baseY - H - top, s * 0.03, (nC - nextC) * c + (nextC === 0 ? top : 0));
          }
          prevC = nC;
        }
        // The soot lick: the fire's breath up the leeward (east) half of
        // the face — a scorch STAIN that hugs the courses and narrows
        // as it climbs, laid as stacked value steps (BLOCK LAW), never
        // a tongue (the MournerStatue precedent: a dark teardrop on
        // pale stone reads as a ghost, not as soot).
        if (((h >>> 9) & 3) !== 0 && xe - xw > s * 0.45) {
          const lickI = xe > px ? 2 : 1;
          const lx = colX(lickI) + colW * (0.3 + ((h >>> 11) & 3) * 0.1);
          const lickC = Math.min(3, Math.min(colCourses(lickI), colCourses(Math.min(i1, lickI + 1))) - 1);
          const widths = [0.3, 0.2, 0.12];
          const lean = ((h >>> 13) & 1) ? 0.03 : -0.03;
          ctx.fillStyle = SOOT;
          for (let j = 0; j < lickC; j++) {
            const w = s * widths[j]!;
            ctx.fillRect(lx - w * 0.5 + j * lean * s, baseY - (j + 1) * c, w, c);
          }
        }
        // Damp keeps the crest's north joints: one moss chip, hash-rare,
        // on an interior column joint.
        if (((h >>> 12) & 3) === 0) {
          const mi = xw < px ? 1 : 3;
          const jx = colX(mi);
          const mC = Math.min(colCourses(mi - 1), colCourses(mi));
          ctx.fillStyle = GY_MOSS;
          ctx.beginPath();
          facetBlob(ctx, jx, baseY - mC * c - top + s * 0.035, s * 0.05, h ^ 0x5c, 5, 0.6);
          ctx.fill();
        }
        // The rubble skirt — THE ONE RING (K1 polish): the blocks that
        // came down lie AGAINST the foot course and share the wall's
        // silhouette — the outline below walks the foot line around
        // them, so no chip earns a ring of its own (the first cut
        // ringed every chip with its own eight taps and the skirt read
        // as a CHAIN of beads at zoom 2.4). A block is a squared quad
        // (BLOCK LAW) with its lit top showing above the foot line
        // against the face and its shaded east arris; the contact
        // shade seats it. One LOOSE chip may lie a step out in the
        // grass — at most one a tile, only when the hash deals it —
        // and that one alone stands apart with its own ring.
        interface FootBlock { x0: number; x1: number; top: number; bot: number }
        const footBlock = (b: FootBlock) => {
          const w = b.x1 - b.x0;
          const hh = b.bot - b.top;
          ctx.fillStyle = CONTACT;
          ctx.fillRect(b.x0 - s * 0.01, b.bot - s * 0.012, w + s * 0.02, s * 0.03);
          ctx.fillStyle = ST_CHIP;
          ctx.fillRect(b.x0, b.top, w, hh);
          ctx.fillStyle = ST_CHIP_LIT;
          ctx.fillRect(b.x0 + s * 0.012, b.top, w - s * 0.024, Math.max(1, s * 0.03));
          ctx.fillStyle = ST_EAST;
          ctx.fillRect(b.x1 - s * 0.03, b.top + s * 0.03, s * 0.03, hh - s * 0.03);
        };
        // The blocks at the wall's own block size (0.16..0.22 wide,
        // 0.09..0.12 tall), dealt into non-overlapping slots along the
        // mid-span (never across a seam), each leaning on the foot:
        // its bottom a hair below the foot line, its top above it.
        const span = xe - xw;
        const footBlocks: FootBlock[] = [];
        const slot = (span * 0.72) / Math.max(1, chipSeeds.length);
        for (let i = 0; i < chipSeeds.length; i++) {
          const seed = chipSeeds[i]!;
          const w = Math.min(s * (0.16 + ((seed >>> 10) & 3) * 0.025), slot * 0.9);
          const cx = xw + span * 0.14 + slot * (i + 0.5) + (((seed >>> 8) & 3) - 1.5) * (slot - w) * 0.3;
          const hh = s * (0.09 + ((seed >>> 12) & 1) * 0.03);
          const bot = baseY + syT * (0.03 + ((seed >>> 13) & 1) * 0.03);
          footBlocks.push({ x0: cx - w * 0.5, x1: cx + w * 0.5, top: bot - hh, bot });
        }
        // The tumble: a free end spills two more blocks past the last
        // course — the near one leaning on the course's end, the far
        // one lying lower against the near one — fused into the same
        // silhouette by abutting exactly (B's east edge IS A's west).
        const westA: FootBlock | null = f.westFree
          ? { x0: xw - s * 0.2, x1: xw, top: baseY - s * 0.05, bot: baseY + syT * 0.06 }
          : null;
        const westB: FootBlock | null = westA
          ? { x0: xw - s * 0.36, x1: westA.x0, top: baseY + syT * 0.13 - s * 0.09, bot: baseY + syT * 0.13 }
          : null;
        const eastA: FootBlock | null = f.eastFree
          ? { x0: xe, x1: xe + s * 0.2, top: baseY - s * 0.05, bot: baseY + syT * 0.07 }
          : null;
        const eastB: FootBlock | null = eastA
          ? { x0: eastA.x1, x1: xe + s * 0.36, top: baseY + syT * 0.14 - s * 0.09, bot: baseY + syT * 0.14 }
          : null;
        // Paint order: far tumble under near tumble, then the foot blocks.
        if (westB) footBlock(westB);
        if (westA) footBlock(westA);
        if (eastB) footBlock(eastB);
        if (eastA) footBlock(eastA);
        for (const b of footBlocks) footBlock(b);
        // The one loose chip, a step out in the grass, clear of every
        // foot block's bottom, chamfered like a field stone: it lies
        // apart, so it alone rings.
        if (((h >>> 15) & 3) === 0 && span > s * 0.45) {
          const w = s * 0.17;
          const hh = s * 0.09;
          const cx = xw + span * (0.3 + ((h >>> 17) & 3) * 0.12);
          const cy = baseY + syT * 0.24;
          ctx.fillStyle = CONTACT;
          ctx.fillRect(cx - w * 0.5 - s * 0.01, cy - s * 0.012, w + s * 0.02, s * 0.03);
          ctx.fillStyle = ST_CHIP;
          ctx.beginPath();
          chamferRect(ctx, cx - w * 0.5, cy - hh, w, hh, s * 0.015);
          ctx.fill();
          ctx.fillStyle = ST_CHIP_LIT;
          ctx.fillRect(cx - w * 0.5 + s * 0.012, cy - hh, w - s * 0.024, Math.max(1, s * 0.03));
          ctx.fillStyle = ST_EAST;
          ctx.fillRect(cx + w * 0.5 - s * 0.03, cy - hh + s * 0.03, s * 0.03, hh - s * 0.03);
          if (rend.outlineOn) {
            rend.beginStructOutline();
            ctx.beginPath();
            chamferRect(ctx, cx - w * 0.5, cy - hh, w, hh, s * 0.015);
            ctx.stroke();
          }
        }
        if (rend.outlineOn) {
          // Silhouette: the stepped skyline (crest tops + risers), the
          // verticals of the two free ends (down to the tumble's near
          // block where one leans there), and the FOOT WALK — one line
          // from end to end that steps around every block lying against
          // the foot and around the tumble past each free end. At a
          // seam the border columns share a height, so nothing steps
          // there. Every edge a block shares with the face or with its
          // neighbour is interior and never inks.
          rend.beginStructOutline();
          ctx.beginPath();
          let y = baseY - colCourses(i0) * c - top;
          ctx.moveTo(colX(i0), f.westFree ? (westA ? westA.top : baseY) : y);
          if (f.westFree) ctx.lineTo(colX(i0), y);
          for (let i = i0; i <= i1; i++) {
            const yi = baseY - colCourses(i) * c - top;
            if (yi !== y) ctx.lineTo(colX(i), yi);
            y = yi;
            ctx.lineTo(colX(i) + colW, y);
          }
          if (f.eastFree) ctx.lineTo(xe, eastA ? eastA.top : baseY);
          // The foot walk, west to east.
          if (westA && westB) {
            ctx.moveTo(xw, westA.top);
            ctx.lineTo(westA.x0, westA.top);
            ctx.lineTo(westA.x0, westB.top);
            ctx.lineTo(westB.x0, westB.top);
            ctx.lineTo(westB.x0, westB.bot);
            ctx.lineTo(westB.x1, westB.bot);
            ctx.lineTo(westA.x0, westA.bot);
            ctx.lineTo(xw, westA.bot);
            ctx.lineTo(xw, baseY);
          } else {
            ctx.moveTo(xw, baseY);
          }
          for (const b of footBlocks) {
            ctx.lineTo(b.x0, baseY);
            ctx.lineTo(b.x0, b.bot);
            ctx.lineTo(b.x1, b.bot);
            ctx.lineTo(b.x1, baseY);
          }
          ctx.lineTo(xe, baseY);
          if (eastA && eastB) {
            ctx.lineTo(xe, eastA.bot);
            ctx.lineTo(eastA.x1, eastA.bot);
            ctx.lineTo(eastA.x1, eastB.bot);
            ctx.lineTo(eastB.x1, eastB.bot);
            ctx.lineTo(eastB.x1, eastB.top);
            ctx.lineTo(eastB.x0, eastB.top);
            ctx.lineTo(eastA.x1, eastA.top);
            ctx.lineTo(xe, eastA.top);
          }
          ctx.stroke();
        }
      };

      // ---- the junction: one quoin block at the tile heart, the
      // tallest thing on the tile (corners are what a ruin keeps).
      const quoin = () => {
        const hw = s * 0.19;
        const H = anchorCourses * c;
        ctx.fillStyle = CONTACT;
        ctx.fillRect(px - hw - s * 0.02, baseY - s * 0.02, hw * 2 + s * 0.04, s * 0.07);
        ctx.fillStyle = ST_FACE;
        ctx.fillRect(px - hw, baseY - H, hw * 2, H);
        // The quoin's courses alternate tone with the rest of the wall.
        for (let j = 0; j < anchorCourses; j++) {
          ctx.fillStyle = j & 1 ? ST_FACE_UP : ST_FACE_DOWN;
          ctx.fillRect(px - hw, baseY - (j + 1) * c, hw * 2, c);
        }
        // Quoins alternate long and short: a perpend every other course.
        ctx.fillStyle = ST_MORTAR;
        for (let j = 1; j < anchorCourses; j++) ctx.fillRect(px - hw, baseY - j * c - jw * 0.5, hw * 2, jw);
        for (let j = 1; j < anchorCourses; j += 2) ctx.fillRect(px + hw * 0.3 - jw * 0.5, baseY - (j + 1) * c, jw, c);
        ctx.fillStyle = ST_WEST;
        ctx.fillRect(px - hw, baseY - H - top, s * 0.045, H + top);
        ctx.fillStyle = ST_EAST;
        ctx.fillRect(px + hw - s * 0.035, baseY - H - top, s * 0.035, H + top);
        ctx.fillStyle = ST_LIT;
        ctx.fillRect(px - hw + s * 0.045, baseY - H - top, hw * 2 - s * 0.08, top);
        ctx.fillStyle = ST_LIT_FAR;
        ctx.fillRect(px - hw + s * 0.045, baseY - H - top, hw * 2 - s * 0.08, Math.max(1, s * 0.03));
        if (rend.outlineOn) {
          rend.beginStructOutline();
          ctx.beginPath();
          const yTop = baseY - H - top;
          // The crest and both verticals — down to the course crest where
          // a course runs into it, to the ground where nothing does.
          const yW = cw ? baseY - colCourses(1) * c - top : baseY;
          const yE = ce ? baseY - colCourses(2) * c - top : baseY;
          ctx.moveTo(px - hw, yW);
          ctx.lineTo(px - hw, yTop);
          ctx.lineTo(px + hw, yTop);
          ctx.lineTo(px + hw, yE);
          if (!cs) {
            ctx.moveTo(px - hw, baseY);
            ctx.lineTo(px + hw, baseY);
          }
          ctx.stroke();
        }
      };

      // Back-to-front: the north band, the course, the quoin, the south band.
      if (cn) bandHalf('n');
      if (ewAny) courseEW();
      if (f.anchor) quoin();
      if (cs) bandHalf('s');
    },
  };
}

// ---- THE TIMBER -------------------------------------------------------

function woodItem(rend: PaintHost, f: RunFrame): DrawItem {
  const { tx, ty, s, syT, px, baseY, lift, h, cn, cs, cw, ce, xw, xe, ewAny } = f;
  const sillH = s * 0.09;
  const sillTop = syT * 0.12;
  /** A stud's lit top is its own square section foreshortened (a
   *  0.1-tile timber cannot show a wall-deep plane); the fat corner
   *  post earns a deeper cap the same way. Never under 0.03s. */
  const capOf = (w: number) => Math.max(s * 0.03, w * 1.1 * rend.camera.yScale);
  /** The E-W studs STAND ON the sill's top plane, mid-plane. */
  const studFootEW = baseY - sillH - sillTop * 0.45;
  // Every third hash tile burns one stud down to a stub.
  const stubTile = h % 3 === 0;
  const stubIdx = (h >>> 5) % 3;

  /** A stud's body at station k of this tile (E-W stations 0..2, N-S 4..7). */
  const bodyAt = (k: number): number => {
    if (stubTile && (k < 3 ? k === stubIdx : k - 4 === stubIdx)) return 0.4;
    return studBody(hashCoords(517, tx * 8 + k, ty));
  };
  const widthAt = (k: number): number => s * (STUD_W + ((hashCoords(519, tx * 8 + k, ty) >>> 3) & 3) * 0.01);

  // E-W stud stations inside the span (the centre stud is the junction
  // post when the tile anchors; a run end keeps it as its last stud).
  const stations: number[] = [];
  if (ewAny) {
    for (let k = 0; k < STUD_FX.length; k++) {
      const x = px + STUD_FX[k]! * s;
      if (x >= xw - s * 0.01 && x <= xe + s * 0.01) stations.push(k);
    }
  }

  return {
    sortY: ty + 0.8,
    drawShadow: () => {
      // An open frame throws a lighter shadow than a wall. The N-S
      // band casts from its south foot at the staggered studs' plan
      // width (the stone wall's note: a centre-line cast spikes).
      const bw = s * (0.065 + STUD_W * 0.5);
      if (ewAny) rend.castEdgeQuad(xw, baseY, xe, baseY, 0.9);
      else if (cn) rend.castEdgeQuad(px - bw, baseY, px + bw, baseY, 0.9);
      if (cs) rend.castEdgeQuad(px - bw, baseY + syT * 0.5, px + bw, baseY + syT * 0.5, 0.9);
    },
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      const bp0 = { x: 0, y: 0 };
      const bp1 = { x: 0, y: 0 };

      /** One charred stud: a squared billboard with its shaded east
       *  arris, ember-check squares on the west (sun) face only, and a
       *  burnt-through top dusted ash-grey — the lit top plane. */
      const stud = (x: number, foot: number, w: number, body: number, ink: boolean) => {
        const H = body * s;
        const topY = foot - H;
        const cap = capOf(w);
        ctx.fillStyle = CH_FACE;
        ctx.fillRect(x, topY, w, H);
        ctx.fillStyle = CH_EAST;
        ctx.fillRect(x + w - s * 0.03, topY, s * 0.03, H);
        // The west face is THE lit facet (one, toward the art sun);
        // on it the alligator char's cubes — the ember checks — catch
        // a step more light, and the value step between them is the
        // crack. Nowhere else on the stud.
        ctx.fillStyle = CH_LIT;
        ctx.fillRect(x, topY, s * 0.05, H);
        ctx.fillStyle = CH_CHECK;
        const pitch = s * 0.08;
        for (let y = topY + s * 0.02; y + s * 0.045 <= foot; y += pitch) {
          ctx.fillRect(x + s * 0.005, y, s * 0.04, s * 0.045);
        }
        // The top: burnt through, ash over char, far edge shaded.
        ctx.fillStyle = CH_TOP;
        ctx.fillRect(x, topY - cap, w, cap);
        ctx.fillStyle = CH_TOP_FAR;
        ctx.fillRect(x, topY - cap, w, Math.max(1, s * 0.03));
        if (ink && rend.outlineOn) {
          // Silhouette: the two verticals and the cap; no foot line —
          // the foot meets the plate it stands on (a shared edge).
          rend.beginStructOutline();
          ctx.beginPath();
          ctx.moveTo(x, foot);
          ctx.lineTo(x, topY - cap);
          ctx.lineTo(x + w, topY - cap);
          ctx.lineTo(x + w, foot);
          ctx.stroke();
        }
      };

      /** A lath fragment still nailed to a stud, reaching toward the
       *  tile centre (never a seam). */
      const lath = (x0: number, x1: number, y: number) => {
        const lx = Math.min(x0, x1);
        const lw = Math.abs(x1 - x0);
        // One lit strip (its underside would be a sub-minimum feature).
        ctx.fillStyle = CH_LATH;
        ctx.fillRect(lx, y, lw, s * 0.04);
        if (rend.outlineOn) {
          // THE ONE RING: three free sides only — the end butted
          // against the stud is a shared edge and never inks.
          rend.beginStructOutline();
          ctx.beginPath();
          const studSide = x0;
          const freeEnd = x1;
          ctx.moveTo(studSide, y);
          ctx.lineTo(freeEnd, y);
          ctx.lineTo(freeEnd, y + s * 0.04);
          ctx.lineTo(studSide, y + s * 0.04);
          ctx.stroke();
        }
      };

      // ---- the N-S sill band + studs marching in depth
      const bandHalf = (half: 'n' | 's') => {
        const fy0 = half === 'n' ? -0.5 : 0;
        const fy1 = fy0 + 0.5;
        const a = barrierPt(px, s, baseY, syT, 0, fy0, bp0);
        const ax = a.x;
        const ay = a.y;
        const b = barrierPt(px, s, baseY, syT, 0, fy1, bp1);
        const bx = b.x;
        const by = b.y;
        const hw = s * 0.05;
        const southFree = half === 's' && !cs;
        // A free south end shows the sill's cut face: char, a lit west
        // sliver, the end grain silvered where the weather got in.
        if (southFree) {
          ctx.fillStyle = CH_FACE;
          ctx.fillRect(bx - hw, by - sillH, hw * 2, sillH);
          ctx.fillStyle = CH_LIT;
          ctx.fillRect(bx - hw, by - sillH, s * 0.03, sillH);
          ctx.fillStyle = CH_SILVER;
          ctx.fillRect(bx - hw + s * 0.03, by - sillH + s * 0.015, hw * 2 - s * 0.055, s * 0.03);
        }
        // The sill's top face in depth: ash-grey, dark east edge.
        ctx.fillStyle = CH_TOP;
        ctx.beginPath();
        ctx.moveTo(ax - hw, ay - sillH);
        ctx.lineTo(ax + hw, ay - sillH);
        ctx.lineTo(bx + hw, by - sillH);
        ctx.lineTo(bx - hw, by - sillH);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = CH_FACE;
        ctx.beginPath();
        ctx.moveTo(ax + hw - s * 0.03, ay - sillH);
        ctx.lineTo(ax + hw, ay - sillH);
        ctx.lineTo(bx + hw, by - sillH);
        ctx.lineTo(bx + hw - s * 0.03, by - sillH);
        ctx.closePath();
        ctx.fill();
        // The nail line marches down the sill on the tile's own pitch.
        ctx.fillStyle = NAIL;
        for (let i = 0; i < 4; i++) {
          const nfy = fy0 + i * 0.125;
          const np = barrierPt(px, s, baseY, syT, 0, nfy, bp0);
          ctx.fillRect(np.x - s * 0.015, np.y - sillH - s * 0.015, s * 0.03, s * 0.03);
        }
        if (rend.outlineOn) {
          rend.beginStructOutline();
          ctx.beginPath();
          ctx.moveTo(ax - hw, ay - sillH);
          ctx.lineTo(bx - hw, by - sillH);
          ctx.moveTo(ax + hw, ay - sillH);
          ctx.lineTo(bx + hw, by - sillH);
          if (half === 'n' && !cn) {
            ctx.moveTo(ax - hw, ay - sillH);
            ctx.lineTo(ax + hw, ay - sillH);
          }
          if (southFree) {
            // The cut end: down both sides and along the foot.
            ctx.moveTo(bx - hw, by - sillH);
            ctx.lineTo(bx - hw, by);
            ctx.lineTo(bx + hw, by);
            ctx.lineTo(bx + hw, by - sillH);
          }
          ctx.stroke();
        }
        // The studs: billboards standing ON the sill top at projected
        // feet, STAGGERED into a double row (the palisade's lesson:
        // dead-vertical stacking swallows every top in the timber in
        // front; the sidestep lets each cap clear its neighbour).
        const fys = half === 'n' ? STUD_FY_N : STUD_FY_S;
        for (let i = 0; i < fys.length; i++) {
          const k = (half === 'n' ? 4 : 6) + i;
          const foot = barrierPt(px, s, baseY, syT, k % 2 === 0 ? -0.065 : 0.065, fys[i]!, bp0);
          const w = widthAt(k);
          stud(foot.x - w * 0.5, foot.y - sillH, w, bodyAt(k), true);
        }
      };

      // ---- the E-W course: the sill, the studs, the laths, the plate
      const courseEW = () => {
        ctx.fillStyle = CONTACT;
        ctx.fillRect(xw, baseY - s * 0.02, xe - xw, s * 0.06);
        // The sill plate, seam to seam: charred face, ash-grey lit top.
        ctx.fillStyle = CH_FACE;
        ctx.fillRect(xw, baseY - sillH, xe - xw, sillH);
        ctx.fillStyle = CH_LIT;
        ctx.fillRect(xw, baseY - sillH, xe - xw, Math.max(1, s * 0.03));
        ctx.fillStyle = CH_TOP;
        ctx.fillRect(xw, baseY - sillH - sillTop, xe - xw, sillTop);
        ctx.fillStyle = CH_TOP_FAR;
        ctx.fillRect(xw, baseY - sillH - sillTop, xe - xw, Math.max(1, s * 0.03));
        if (f.westFree) {
          ctx.fillStyle = CH_SILVER;
          ctx.fillRect(xw, baseY - sillH, s * 0.03, sillH);
        }
        if (f.eastFree) {
          ctx.fillStyle = CH_EAST;
          ctx.fillRect(xe - s * 0.03, baseY - sillH, s * 0.03, sillH);
        }
        // The nail line: dark dots on the tile's own pitch, so the line
        // runs unbroken across every seam.
        ctx.fillStyle = NAIL;
        for (let i = 0; i < 8; i++) {
          const nx = px - s * 0.5 + i * s * 0.125;
          if (nx < xw - s * 0.001 || nx >= xe - s * 0.001) continue;
          ctx.fillRect(nx - s * 0.015, baseY - sillH - sillTop * 0.5 - s * 0.015, s * 0.03, s * 0.03);
        }
        if (rend.outlineOn) {
          rend.beginStructOutline();
          ctx.beginPath();
          ctx.moveTo(xw, baseY - sillH - sillTop);
          ctx.lineTo(xe, baseY - sillH - sillTop);
          ctx.moveTo(xw, baseY);
          ctx.lineTo(xe, baseY);
          if (f.westFree) {
            ctx.moveTo(xw, baseY - sillH - sillTop);
            ctx.lineTo(xw, baseY);
          }
          if (f.eastFree) {
            ctx.moveTo(xe, baseY - sillH - sillTop);
            ctx.lineTo(xe, baseY);
          }
          ctx.stroke();
        }
        // The studs — the centre station is the junction post's when
        // the tile anchors (drawn fatter, later).
        const studX = (k: number) => px + STUD_FX[k]! * s - widthAt(k) * 0.5;
        for (const k of stations) {
          if (k === 1 && f.anchor) continue;
          stud(studX(k), studFootEW, widthAt(k), bodyAt(k), true);
        }
        // Laths: two to four fragments nailed to a stud, reaching toward
        // the span's interior so none can cross a seam or hang past a
        // half-span's end into the air.
        const nLath = 2 + ((h >>> 14) & 3);
        for (let i = 0; i < nLath; i++) {
          const seed = hashCoords(521, tx * 8 + i, ty);
          const k = stations[(seed >>> 4) % stations.length]!;
          if (k === 1 && f.anchor) continue;
          const body = bodyAt(k);
          const dir =
            k === 0 ? 1 : k === 2 ? -1 : xw >= px ? 1 : xe <= px ? -1 : (seed >>> 6) & 1 ? 1 : -1;
          const x0 = dir > 0 ? studX(k) + widthAt(k) : studX(k);
          const len = s * (0.1 + ((seed >>> 8) & 7) * 0.014);
          const y = studFootEW - s * (0.14 + ((seed >>> 11) & 7) * (body > 0.5 ? 0.09 : 0.02));
          if (y < studFootEW - body * s + s * 0.05) continue;
          lath(x0, x0 + dir * len, y);
        }
        // The wall plate: the beam that sat on the studs, one end still
        // up on a stud top, the other slid down to the ground — a
        // squared quad on the lean, silvered end grain at both ends.
        if (((h >>> 7) & 3) !== 3 && stations.length >= 2) {
          const ks = stations.filter((k) => !(k === 1 && f.anchor) && bodyAt(k) > 0.5);
          if (ks.length > 0) {
            const kHi = ks[(h >>> 16) % ks.length]!;
            const hiX = px + STUD_FX[kHi]! * s + (kHi === 2 ? -1 : 1) * widthAt(kHi) * 0.2;
            const hiY = studFootEW - bodyAt(kHi) * s - capOf(widthAt(kHi)) * 0.4;
            // The low end lands mid-span on the ground, leaning away from
            // the stud toward the tile centre.
            const toward = kHi === 2 ? -1 : kHi === 0 ? 1 : ce && !cw ? 1 : -1;
            const loX = Math.min(xe - s * 0.08, Math.max(xw + s * 0.08, hiX + toward * s * 0.42));
            const loY = baseY + syT * 0.06;
            const dx = loX - hiX;
            const dy = loY - hiY;
            const len = Math.hypot(dx, dy) || 1;
            const t = s * 0.085;
            // The normal pointing UP-screen: that side is the beam's lit face.
            let nx = -dy / len;
            let ny = dx / len;
            if (ny > 0) {
              nx = -nx;
              ny = -ny;
            }
            const quad = (o0: number, o1: number, fill: string) => {
              ctx.fillStyle = fill;
              ctx.beginPath();
              ctx.moveTo(hiX + nx * o0, hiY + ny * o0);
              ctx.lineTo(loX + nx * o0, loY + ny * o0);
              ctx.lineTo(loX + nx * o1, loY + ny * o1);
              ctx.lineTo(hiX + nx * o1, hiY + ny * o1);
              ctx.closePath();
              ctx.fill();
            };
            quad(-t * 0.5, t * 0.5, CH_FACE);
            quad(t * 0.5 - s * 0.03, t * 0.5, CH_LIT);
            // Silvered end grain: the weather got to the cut ends.
            ctx.fillStyle = CH_SILVER;
            ctx.fillRect(hiX - t * 0.45, hiY - t * 0.45, t * 0.9, t * 0.9);
            ctx.fillRect(loX - t * 0.45, loY - t * 0.45, t * 0.9, t * 0.9);
            ctx.fillStyle = shade(CH_SILVER, -30);
            ctx.fillRect(hiX - t * 0.45, hiY + t * 0.09, t * 0.9, t * 0.36);
            ctx.fillRect(loX - t * 0.45, loY + t * 0.09, t * 0.9, t * 0.36);
            if (rend.outlineOn) {
              rend.beginStructOutline();
              ctx.beginPath();
              ctx.moveTo(hiX + nx * t * 0.5, hiY + ny * t * 0.5);
              ctx.lineTo(loX + nx * t * 0.5, loY + ny * t * 0.5);
              ctx.lineTo(loX - nx * t * 0.5, loY - ny * t * 0.5);
              ctx.lineTo(hiX - nx * t * 0.5, hiY - ny * t * 0.5);
              ctx.closePath();
              ctx.stroke();
            }
          }
        }
      };

      // ---- the junction: one corner post, the fattest stud on the tile.
      const cornerPost = () => {
        const w = s * 0.2;
        stud(px - w * 0.5, studFootEW, w, 1.3 + ((h >>> 18) & 3) * 0.02, true);
      };

      // Back-to-front: the north band, the course, the post, the south band.
      if (cn) bandHalf('n');
      if (ewAny) courseEW();
      if (f.anchor) cornerPost();
      if (cs) bandHalf('s');
    },
  };
}
