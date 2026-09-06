/**
 * THE STANDING COURSE — the Dolmen's dry stone (plan §11.3, band 9b):
 * CourseWall (549) and CourseStile (550), the EIGHTH run-merging
 * family; CorbelCell (551) and PlumbStone (552), discrete.
 *
 * The fiction in one breath: the Dolmen SET stone. No mortar, no
 * timber, no lamp ("a lamp is a stone that goes out"), no cloth, no
 * dye, no flag. Every piece here is PLUMB, LEVEL and COUNTED, and none
 * of them is a ruin: the wall's crest is one level line the whole run
 * (the ruin's is a stepped tumble), a free end is a BUILT HEAD (the
 * ruin dies into its skirt; the Dolmen's wall stops because they
 * stopped), the stile is a made low place with its step stones and
 * Vorl's one upright (never a breach), the cell is a corbelled dome
 * because that is how a roof holds with no timber, and the plumb
 * stone's bob hangs dead true because a plumb that hangs true says
 * the ground under it is set. Voice: SET; shelf: KEPT.
 *
 * The laws every painter here obeys:
 * - BODY-RULER: measured in `s` against the 1.15s rig. The cope at
 *   COPE_H 0.82 (chest), the stile at STILE_H 0.50 (hip) with its
 *   steps at STEP_H 0.34 (knee), the cell's crown at CELL_H 1.75 (a
 *   body and a half), the plumb stone at PLUMB_H 0.40 (knee). All
 *   exported and pinned: STEP_H < STILE_H < COPE_H < 1.15 < CELL_H.
 * - TOP-PLANE: every standing mass shows its lit top at syT·0.32 —
 *   each cope stone, each step stone, the anchor header, the cell's
 *   capstone, the slotted top of the plumb stone. TWO SUNS: the west
 *   riser lit, the east arris shaded, on every stone.
 * - FLAT FORGE / BLOCK LAW: every stone is a filled quad (fillRect or
 *   a four-point quad), minimum feature 0.03s on both sides at every
 *   seed and in a gale; joints and depth are VALUE STEPS, never
 *   strokes; nothing translates or rotates; no ellipse but the
 *   contact seat under the two discrete pieces.
 * - THE ONE RING: the run pair returns NO `body` and strokes its
 *   EXPOSED silhouette live at `beginStructOutline` weight (shared
 *   edges never; the fenceBroken seg()/flush() idiom), standing
 *   outside both ring sets; the discrete pair carries `body` via
 *   stationBody (the cell in CACHED and STATIC both; the plumb stone
 *   in CACHED only, since it reads the clock).
 * - ONE BREEZE: only the plumb stone's cord and bob breathe —
 *   `rend.breezeAt` sampled ONCE per draw through `breeze()`, clamped
 *   to BOB_AMP 0.03s; the cord is a quad by moveTo/lineTo, never
 *   ctx.rotate. The other three never read the clock.
 * - EDGE-STABLE crests by construction: every seam column stands at
 *   COPE_H (a constant), so two tiles meeting at a seam agree to the
 *   pixel; every hash-dealt flourish (the through-stone, the mottle,
 *   the step stones) lives mid-span, never across a seam.
 * - THE SEPARATE-MASONRY LAW, spoken a third time: `courseKin` reads
 *   COURSE_TILES only. Stone the Dolmen set never dies into a town
 *   wall, a fence, the garrison or the ruin beside it.
 * - SHADOWS NEVER BAKE: castEdgeQuad per frame for the wall, the
 *   stile and the plumb stone; castBlob for the cell (a dome throws
 *   a blob). A N-S band casts from its SOUTH FOOT at plan width
 *   (the ruin walls' law: a centre-line cast spikes under noon).
 * - THE LIGHT IS CONTENT: no light rows, no queueGlow, no smoke.
 * - Draw-time `const ctx = rend.ctx` (the outline pass swaps it);
 *   hash deals by `h >>> k`; canvas/GL parity (fills and struct
 *   strokes only).
 */
import { COURSE_TILES, Tile, hashCoords } from '@arx/shared';
import { barrierPt } from '../../barrierArt.js';
import { ELEV_H } from '../../elevPick.js';
import { DOCK_LIFT } from '../../terrain.js';
import { shade } from '../../tint.js';
import { TH_CHALK, TH_MARL, TH_MARL_DARK, TH_MARL_LIT, TH_MARL_MOTTLE } from '../palette.js';
import type { ClientGame } from '../../../game/clientGame.js';
import type { PaintHost } from '../../paintHost.js';
import type { DrawItem } from '../../renderer.js';
import type { PropEntries, PropFrame, PropHost } from '../types.js';

// ---- the rig (exported and pinned by course.test.ts) ------------------

/** The cope's crest over baseY, in s: chest on the 1.15s rig. */
export const COPE_H = 0.82;
/** One face course, in s: four courses over a 0.14 footing = 0.70, the
 *  cope on edge 0.12 = 0.82. */
export const COURSE_H = 0.14;
/** The stile's dropped crest, in s: the hip. */
export const STILE_H = 0.5;
/** The step stones' lit tops, in s: the knee. */
export const STEP_H = 0.34;
/** The cell's crown over its foot line, in s: a body and a half. */
export const CELL_H = 1.75;
/** The cell's half-width at the foot, in tiles. */
export const CELL_RX = 0.6;
/** The cell's foot line south of the tile centre, in world tiles. */
export const CELL_FOOT_DY = 0.18;
/** The plumb stone's top over baseY, in s: the knee. */
export const PLUMB_H = 0.4;
/** ONE BREEZE clamp for the cord and bob, in tiles. */
export const BOB_AMP = 0.03;

// ---- measure ----------------------------------------------------------

/** The cope on edge, in s. */
const COPE_T = 0.12;
/** The N-S band's half width, tiles (the ruin's BAND_HW). */
const BAND_HW = 0.15;
/** A tall stub reaches this far into the stile from a wall seam. */
const STUB = 0.16;
/** A built head's column width, in s. */
const HEAD_W = 0.2;
/** The junction header's half width, in s. */
const ANCHOR_HW = 0.19;

// ---- the inks (dealt once from the palette; the hash deals the deal) --

/** The stone: warm bone marl, the courses alternating ±6 about it. */
const MARL = TH_MARL;
const MARL_UP = shade(TH_MARL, 6);
const MARL_DOWN = shade(TH_MARL, -6);
/** The lit top planes and the through-stones' proud ends. */
const MARL_LIT = TH_MARL_LIT;
const MARL_LIT_FAR = shade(TH_MARL_LIT, -14);
/** The west riser toward the fixed art sun; the east arris in shade. */
const MARL_WEST = shade(TH_MARL, 14);
const MARL_EAST = shade(TH_MARL_DARK, -6);
/** Joints: a dark value step, never a line. */
const JOINT = shade(TH_MARL_DARK, -20);
/** The grey mottle in the marl, one chip a course. */
const MOTTLE = TH_MARL_MOTTLE;
/** A through-stone's dark underside step (it stands proud of the face). */
const THROUGH_UNDER = shade(TH_MARL_DARK, -8);
/** The cell's ring undersides. */
const RING_UNDER = shade(TH_MARL_DARK, -12);
/** The door hole: the clamp's vent black. */
const DOOR = '#1b1719';
/** The slot across the plumb stone's top. */
const SLOT = shade(TH_MARL_DARK, -26);
/** The Marl's cord. */
const CORD = '#c9b995';
/** The bob: the Marl's own chalk. */
const BOB = TH_CHALK;
const BOB_SHADE = shade(TH_CHALK, -24);
/** The contact seat. */
const CONTACT = 'rgba(12, 8, 20, 0.26)';

// ---- the grammar block (marks.ts:181-260, copied: one block per file) -

/** The one breeze phase: dealt from the hash so no two cords keep time. */
function breezePhase(h: number, k: number): number {
  return ((h >>> k) & 15) * 0.41;
}

/** Clamp a breeze sample to its law's amplitude (in tiles → px). */
function clampAmp(v: number, ampTiles: number, s: number): number {
  const lim = ampTiles * s;
  return v > lim ? lim : v < -lim ? -lim : v;
}

/**
 * ONE BREEZE, sampled once per draw and held to the law. `amp` is the
 * piece's whole amplitude in tiles; the sway beat gets 0.75 of it and
 * the lag beat 0.55 (together 0.93), so a vertex that rides both plus
 * the turning edge of the thin quad it hangs on stays inside `amp·s`
 * of its still pose. The clamp is a guard against a gale, not the
 * shape of the motion.
 */
function breeze(
  rend: PropHost, tx: number, ty: number, t: number, ph: number, s: number, amp: number,
): { sw: number; lg: number } {
  const b = rend.breezeAt(tx, ty, t, ph, s, amp * 0.75, amp * 0.55);
  return { sw: clampAmp(b.sway, amp * 0.75, s), lg: clampAmp(b.lag, amp * 0.55, s) };
}

/** A filled four-corner quad (the diagonal grammar: never ctx.rotate). */
function quad(
  ctx: CanvasRenderingContext2D,
  x0: number, y0: number,
  x1: number, y1: number,
  x2: number, y2: number,
  x3: number, y3: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x3, y3);
  ctx.closePath();
  ctx.fill();
}

/** A filled triangle (the bob's point). */
function tri(
  ctx: CanvasRenderingContext2D,
  x0: number, y0: number,
  x1: number, y1: number,
  x2: number, y2: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.closePath();
  ctx.fill();
}

/** A cord a→b of thickness `th`: a thin quad along the axis. */
function cord(
  ctx: CanvasRenderingContext2D,
  ax: number, ay: number, bx: number, by: number, th: number,
): void {
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * th * 0.5;
  const ny = (dx / len) * th * 0.5;
  quad(ctx, ax - nx, ay - ny, bx - nx, by - ny, bx + nx, by + ny, ax + nx, ay + ny);
}

/** The seat: a contact ellipse under a discrete piece's foot. */
function contact(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number): void {
  ctx.fillStyle = CONTACT;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

// ---- the run frame (ruinWalls.ts:172-245, the tumble machinery gone) --

/** Own-kind connectivity: a course reaches only for COURSE_TILES. */
function courseKin(game: ClientGame, x: number, y: number): boolean {
  const t = game.world.groundAt(x, y);
  return t !== undefined && COURSE_TILES.has(t as Tile);
}

/** The WALL alone: what a stile's tall stubs reach toward. */
function wallKin(game: ClientGame, x: number, y: number): boolean {
  return game.world.groundAt(x, y) === Tile.CourseWall;
}

/** Mint-time frame shared by the wall and the stile: the projected
 *  tile datum and its own-kind connectivity. */
interface RunFrame {
  readonly tx: number;
  readonly ty: number;
  readonly s: number;
  readonly syT: number;
  readonly px: number;
  readonly baseY: number;
  readonly h: number;
  /** Course kin (wall or stile) on each side: the run's AXIS. */
  readonly cn: boolean;
  readonly ce: boolean;
  readonly cs: boolean;
  readonly cw: boolean;
  /** WALL kin on each side: what a stile's tall stubs reach toward. */
  readonly wn: boolean;
  readonly we: boolean;
  readonly ws: boolean;
  readonly ww: boolean;
  /** E-W span, screen x (equal when the tile carries no E-W course). */
  readonly xw: number;
  readonly xe: number;
  readonly ewAny: boolean;
  readonly nsAny: boolean;
  /** A corner, tee, cross, or a run turning into a run: the tile heart
   *  anchors on one wide header (a through-run needs none). */
  readonly anchor: boolean;
  /** The E-W course's ends stand in the open (no kin, no junction). */
  readonly westFree: boolean;
  readonly eastFree: boolean;
}

function runFrame(rend: PaintHost, tile: Tile, tx: number, ty: number, game: ClientGame): RunFrame {
  const s = rend.camera.scale;
  const syT = s * rend.camera.yScale;
  const p = rend.camera.worldToScreen(tx + 0.5, ty + 0.5, rend.w, rend.h);
  p.y -= game.world.elevAt(tx, ty) * ELEV_H * s;
  if (rend.porchAt(game, tx, ty)) p.y -= DOCK_LIFT * s;
  const cn = courseKin(game, tx, ty - 1);
  const ce = courseKin(game, tx + 1, ty);
  const cs = courseKin(game, tx, ty + 1);
  const cw = courseKin(game, tx - 1, ty);
  const any = cn || ce || cs || cw;
  const isoEW = !any;
  const xw = cw || isoEW ? p.x - s * 0.5 : p.x;
  const xe = ce || isoEW ? p.x + s * 0.5 : p.x;
  const ewAny = cw || ce || isoEW;
  const nsAny = cn || cs;
  const nsThrough = cn && cs && !ewAny;
  return {
    tx,
    ty,
    s,
    syT,
    px: p.x,
    baseY: p.y + syT * 0.14,
    h: hashCoords(tile, tx, ty),
    cn,
    ce,
    cs,
    cw,
    wn: cn && wallKin(game, tx, ty - 1),
    we: ce && wallKin(game, tx + 1, ty),
    ws: cs && wallKin(game, tx, ty + 1),
    ww: cw && wallKin(game, tx - 1, ty),
    xw,
    xe,
    ewAny,
    nsAny,
    anchor: nsAny && !nsThrough,
    westFree: ewAny && !cw && !nsAny,
    eastFree: ewAny && !ce && !nsAny,
  };
}

/** Ink segments collected as the fills go down and flushed as one
 *  struct stroke at each depth step (exposed edges only, the seam
 *  never) — the fenceBroken idiom, so a piece that stands BEHIND
 *  another has its silhouette covered by the nearer face. */
interface Inker {
  readonly seg: (x0: number, y0: number, x1: number, y1: number) => void;
  readonly flush: () => void;
}

function inker(rend: PaintHost, ctx: CanvasRenderingContext2D): Inker {
  const on = rend.outlineOn;
  const segs: number[] = [];
  return {
    seg: (x0, y0, x1, y1) => { if (on) segs.push(x0, y0, x1, y1); },
    flush: () => {
      if (!on || segs.length === 0) return;
      rend.beginStructOutline();
      ctx.beginPath();
      for (let i = 0; i < segs.length; i += 4) {
        ctx.moveTo(segs[i]!, segs[i + 1]!);
        ctx.lineTo(segs[i + 2]!, segs[i + 3]!);
      }
      ctx.stroke();
      segs.length = 0;
    },
  };
}

// ---- the stone grammar the wall and the stile share --------------------

/** A run piece's standing: its crest in s and the face courses under
 *  the cope (the wall 4 + a 0.12 cope = 0.82; the stile 2 + 0.08 = 0.50). */
interface Standing {
  readonly crest: number;
  readonly courses: number;
}
const WALL_STANDING: Standing = { crest: COPE_H, courses: 4 };
const STILE_STANDING: Standing = { crest: STILE_H, courses: 2 };

/** A header block's end face: a step darker than the face (the
 *  courses read as courses at a tile's distance). */
const HEADER = shade(TH_MARL, -12);
/** A built head's long header ends: the darker note of the head
 *  column, which stands a full value step off the face on EVERY
 *  course (the short headers carry HEADER). */
const HEAD_END = shade(TH_MARL, -24);
/** The brightest note: a lit top plane's near sliver toward the sun. */
const MARL_LIT_TOP = shade(TH_MARL_LIT, 8);

interface Brush {
  readonly faceEW: (x0: number, x1: number, n: number) => void;
  readonly copeEW: (x0: number, x1: number, st: Standing) => void;
  readonly through: (x0: number, x1: number) => void;
  readonly headEW: (xEnd: number, side: -1 | 1, st: Standing) => void;
  readonly anchor: () => void;
  readonly bandSeg: (fy0: number, fy1: number, st: Standing, nextH: number) => void;
}

/** The brush: every stone here is a filled quad; joints and depth are
 *  value steps (BLOCK LAW); the top planes at syT·0.32 (TOP-PLANE);
 *  west lit, east shaded (TWO SUNS); the exposed edges go to `ink`. */
function brush(ctx: CanvasRenderingContext2D, f: RunFrame, ink: Inker): Brush {
  const { s, syT, px, baseY, h, tx, ty, cw, ce, cs } = f;
  const top = syT * 0.32;
  const c = COURSE_H * s;
  const jw = Math.max(1, s * 0.03);
  const seamW = px - s * 0.5;
  const bp0 = { x: 0, y: 0 };
  const bp1 = { x: 0, y: 0 };

  /** The footing and `n` courses over it across [x0, x1]: each course
   *  its own tone, blocks laid from the west seam to break joint, the
   *  perpends and beds as JOINT value steps, one mottle chip a course
   *  mid-span. The even courses carry a perpend AT the west seam when
   *  kin stands there (the neighbour draws none at its east edge, so
   *  the seam reads as running bond: half the courses joint there,
   *  half run through). */
  const faceEW = (x0: number, x1: number, n: number): void => {
    const w = x1 - x0;
    ctx.fillStyle = CONTACT;
    ctx.fillRect(x0, baseY - s * 0.02, w, s * 0.06);
    // The footing: half in the ground, a step darker.
    ctx.fillStyle = MARL_DOWN;
    ctx.fillRect(x0, baseY - c, w, c);
    for (let j = 0; j < n; j++) {
      const y = baseY - (j + 2) * c;
      ctx.fillStyle = j & 1 ? MARL_DOWN : MARL_UP;
      ctx.fillRect(x0, y, w, c);
      const hb = hashCoords(523 + j, tx, ty);
      let bx = seamW + (j & 1 ? s * 0.11 : 0);
      ctx.fillStyle = JOINT;
      if ((j & 1) === 0 && x0 === seamW && cw) ctx.fillRect(x0, y, jw, c);
      for (let k = 0; k < 6 && bx < x1 - s * 0.04; k++) {
        if (bx > x0 + s * 0.04) ctx.fillRect(bx - jw * 0.5, y, jw, c);
        bx += s * (0.18 + ((hb >>> (k * 3)) & 7) * 0.02);
      }
      if (w > s * 0.3) {
        const hm = hashCoords(531 + j, tx, ty);
        const mx = x0 + s * 0.08 + (((hm >>> 4) & 15) / 15) * (w - s * 0.22);
        ctx.fillStyle = MOTTLE;
        ctx.fillRect(mx, y + s * 0.03, s * 0.06, c - s * 0.06);
      }
    }
    ctx.fillStyle = JOINT;
    for (let j = 1; j <= n + 1; j++) ctx.fillRect(x0, baseY - j * c - jw * 0.5, w, jw);
  };

  /** The cope row across [x0, x1]: thin stones on edge laid from the
   *  west seam (0.08..0.14s), the last absorbing the remainder, never
   *  across a seam (a sliver under 0.03s folds into its neighbour);
   *  each a lit top, a lit west riser and a shaded east side — a comb
   *  of set slabs, DEAD LEVEL. Inks the crest line (open to the sky). */
  const copeEW = (x0: number, x1: number, st: Standing): void => {
    const hc = hashCoords(527, tx, ty);
    const crestY = baseY - st.crest * s;
    const copeT = (st.crest - (st.courses + 1) * COURSE_H) * s;
    const bounds: number[] = [seamW];
    let x = seamW;
    for (let k = 0; k < 16 && x < x1 - s * 0.03; k++) {
      x += s * (0.08 + ((hc >>> (k * 2)) & 3) * 0.02);
      if (x > x1 - s * 0.03) x = x1;
      bounds.push(x);
    }
    if (bounds[bounds.length - 1]! < x1) bounds.push(x1);
    const spans: Array<[number, number]> = [];
    let carry = -1;
    for (let i = 0; i + 1 < bounds.length; i++) {
      let a = Math.max(bounds[i]!, x0);
      const b = Math.min(bounds[i + 1]!, x1);
      if (b <= x0 + 1e-6) continue;
      if (carry >= 0) {
        a = carry;
        carry = -1;
      }
      if (b - a < s * 0.03) {
        carry = a;
        continue;
      }
      spans.push([a, b - a]);
    }
    for (let k = 0; k < spans.length; k++) {
      const [a, w] = spans[k]!;
      ctx.fillStyle = k & 1 ? MARL_DOWN : MARL_UP;
      ctx.fillRect(a, crestY, w, copeT);
      ctx.fillStyle = MARL_LIT;
      ctx.fillRect(a, crestY - top, w, top);
      ctx.fillStyle = MARL_LIT_FAR;
      ctx.fillRect(a, crestY - top, w, jw);
      ctx.fillStyle = MARL_WEST;
      ctx.fillRect(a, crestY - top, s * 0.03, top + copeT);
      ctx.fillStyle = MARL_EAST;
      ctx.fillRect(a + w - s * 0.03, crestY - top, s * 0.03, top + copeT);
    }
    ink.seg(x0, crestY - top, x1, crestY - top);
  };

  /** One through-stone a tile, mid-span, its end 0.05s proud of the
   *  face at 0.40s: the lit end, a top sliver, a dark underside step.
   *  Only a full span carries one (never near a head or a seam). */
  const through = (x0: number, x1: number): void => {
    const w = s * 0.2;
    const span = x1 - x0;
    if (span < w + s * 0.48) return;
    const cx = x0 + s * 0.24 + (((h >>> 6) & 7) / 7) * (span - w - s * 0.48) + w * 0.5;
    const y = baseY - s * 0.47;
    const lip = Math.max(s * 0.03, syT * 0.05);
    ctx.fillStyle = MARL_LIT;
    ctx.fillRect(cx - w * 0.5, y, w, c);
    ctx.fillStyle = MARL_LIT_TOP;
    ctx.fillRect(cx - w * 0.5, y - lip, w, lip);
    ctx.fillStyle = THROUGH_UNDER;
    ctx.fillRect(cx - w * 0.5, y + c, w, s * 0.03);
    ctx.fillStyle = MARL_EAST;
    ctx.fillRect(cx + w * 0.5 - s * 0.03, y - lip, s * 0.03, c + lip);
  };

  /** A BUILT HEAD at a free end: a plumb column of alternating headers
   *  over the last HEAD_W of the face, the same height as the cope
   *  (the Dolmen's wall stops because they stopped — nothing tumbles).
   *  `side` −1 west, +1 east. Inks the outer vertical, crest to foot. */
  const headEW = (xEnd: number, side: -1 | 1, st: Standing): void => {
    const hwd = HEAD_W * s;
    const x = side < 0 ? xEnd : xEnd - hwd;
    // THE QUOIN READ: odd courses the long header (HEAD_W), even the
    // short (0.65 of it), so the inner joint TOOTHS course to course,
    // and the column stands a full value step off the face on EVERY
    // course (the long ends the darker HEAD_END, the short HEADER).
    // The first cut stepped odd courses only, flush with the face,
    // and the head vanished into it at a tile's distance.
    for (let j = 0; j < st.courses; j++) {
      const w = j & 1 ? hwd : hwd * 0.65;
      const hx = side < 0 ? x : xEnd - w;
      const y = baseY - (j + 2) * c;
      ctx.fillStyle = j & 1 ? HEAD_END : HEADER;
      ctx.fillRect(hx, y, w, c);
      ctx.fillStyle = JOINT;
      ctx.fillRect(side < 0 ? hx + w - jw * 0.5 : hx - jw * 0.5, y, jw, c);
    }
    const H = st.crest * s;
    const yTop = baseY - H - top;
    if (side < 0) {
      ctx.fillStyle = MARL_WEST;
      ctx.fillRect(x, yTop, s * 0.04, H + top);
    } else {
      ctx.fillStyle = MARL_EAST;
      ctx.fillRect(xEnd - s * 0.035, yTop, s * 0.035, H + top);
    }
    ink.seg(xEnd, yTop, xEnd, baseY);
  };

  /** The junction: one wide header at the tile heart at the SAME
   *  height as the cope (the quoin never overtops: level is the
   *  virtue); it reads by width and by its one lit top. */
  const anchor = (): void => {
    const hw = ANCHOR_HW * s;
    const H = COPE_H * s;
    const yTop = baseY - H - top;
    ctx.fillStyle = CONTACT;
    ctx.fillRect(px - hw - s * 0.02, baseY - s * 0.02, hw * 2 + s * 0.04, s * 0.07);
    ctx.fillStyle = MARL;
    ctx.fillRect(px - hw, baseY - H, hw * 2, H);
    for (let j = 0; j < 5; j++) {
      ctx.fillStyle = j === 0 ? MARL_DOWN : j & 1 ? HEADER : MARL_UP;
      ctx.fillRect(px - hw, baseY - (j + 1) * c, hw * 2, c);
    }
    ctx.fillStyle = JOINT;
    for (let j = 1; j <= 5; j++) ctx.fillRect(px - hw, baseY - j * c - jw * 0.5, hw * 2, jw);
    ctx.fillStyle = MARL_UP;
    ctx.fillRect(px - hw, baseY - H, hw * 2, COPE_T * s);
    ctx.fillStyle = MARL_WEST;
    ctx.fillRect(px - hw, yTop, s * 0.045, H + top);
    ctx.fillStyle = MARL_EAST;
    ctx.fillRect(px + hw - s * 0.035, yTop, s * 0.035, H + top);
    ctx.fillStyle = MARL_LIT;
    ctx.fillRect(px - hw + s * 0.045, yTop, hw * 2 - s * 0.08, top);
    ctx.fillStyle = MARL_LIT_FAR;
    ctx.fillRect(px - hw + s * 0.045, yTop, hw * 2 - s * 0.08, jw);
    // Silhouette: the crest and both verticals — to the ground where
    // nothing runs into it (a course beside it shares the edge).
    if (!cw) ink.seg(px - hw, yTop, px - hw, baseY);
    if (!ce) ink.seg(px + hw, yTop, px + hw, baseY);
    ink.seg(px - hw, yTop, px + hw, yTop);
    if (!cs) ink.seg(px - hw, baseY, px + hw, baseY);
  };

  /** One depth segment of the N-S band from fy0 to fy1 (world-tile
   *  fractions about the centre), standing `st`, with whatever stands
   *  south of it `nextH` px tall (0 = the open ground: a built head
   *  seen end-on). Every foot projected through barrierPt (at q=0 the
   *  points collapse to the axis rects). The crest is the lit plane
   *  running in depth, its west edge raked brighter, its east edge
   *  shaded; the cope joints cross it at the cope's own pitch. */
  const bandSeg = (fy0: number, fy1: number, st: Standing, nextH: number): void => {
    const H = st.crest * s;
    const a = barrierPt(px, s, baseY, syT, 0, fy0, bp0);
    const ax = a.x;
    const ay = a.y;
    const b = barrierPt(px, s, baseY, syT, 0, fy1, bp1);
    const bx = b.x;
    const by = b.y;
    const hw = BAND_HW * s;
    if (nextH < H) {
      // The riser: the built head end-on — footing, courses and the
      // cope, only what stands above whatever is south of it.
      const faceH = H - nextH;
      ctx.fillStyle = MARL;
      ctx.fillRect(bx - hw, by - H, hw * 2, faceH);
      for (let j = 0; j <= st.courses; j++) {
        const y0 = j * c;
        const y1 = Math.min((j + 1) * c, H);
        if (y1 <= nextH) continue;
        ctx.fillStyle = j === 0 ? MARL_DOWN : j & 1 ? HEADER : MARL_UP;
        ctx.fillRect(bx - hw, by - y1, hw * 2, y1 - Math.max(y0, nextH));
      }
      ctx.fillStyle = JOINT;
      for (let j = 1; j <= st.courses + 1; j++) {
        if (j * c > nextH) ctx.fillRect(bx - hw, by - j * c - jw * 0.5, hw * 2, jw);
      }
      ctx.fillStyle = MARL_WEST;
      ctx.fillRect(bx - hw, by - H, s * 0.04, faceH);
      ctx.fillStyle = MARL_EAST;
      ctx.fillRect(bx + hw - s * 0.03, by - H, s * 0.03, faceH);
    }
    ctx.fillStyle = MARL_LIT;
    quad(ctx, ax - hw, ay - H, ax + hw, ay - H, bx + hw, by - H, bx - hw, by - H);
    ctx.fillStyle = MARL_LIT_TOP;
    quad(ctx, ax - hw, ay - H, ax - hw + s * 0.04, ay - H, bx - hw + s * 0.04, by - H, bx - hw, by - H);
    ctx.fillStyle = MARL_LIT_FAR;
    quad(ctx, ax + hw - s * 0.04, ay - H, ax + hw, ay - H, bx + hw, by - H, bx + hw - s * 0.04, by - H);
    // The cope joints crossing the crest in depth, laid from the north
    // seam on the tile's own deal (0.08..0.14 tiles), mid-segment only.
    const hc = hashCoords(529, tx, ty);
    let fy = -0.5;
    ctx.fillStyle = JOINT;
    for (let k = 0; k < 16 && fy < fy1 - 0.02; k++) {
      fy += 0.08 + ((hc >>> (k * 2)) & 3) * 0.02;
      if (fy > fy0 + 0.02 && fy < fy1 - 0.02) {
        const jp = barrierPt(px, s, baseY, syT, 0, fy, bp0);
        ctx.fillRect(jp.x - hw + s * 0.04, jp.y - H - jw * 0.5, hw * 2 - s * 0.08, jw);
      }
    }
    // Silhouette: the two crest edges, the riser's verticals where it
    // steps down, the foot where it meets the open ground.
    ink.seg(ax - hw, ay - H, bx - hw, by - H);
    ink.seg(ax + hw, ay - H, bx + hw, by - H);
    if (nextH < H) {
      ink.seg(bx - hw, by - H, bx - hw, by - nextH);
      ink.seg(bx + hw, by - H, bx + hw, by - nextH);
      if (nextH === 0) ink.seg(bx - hw, by, bx + hw, by);
    }
  };

  return { faceEW, copeEW, through, headEW, anchor, bandSeg };
}

// ---- 549 CourseWall ---------------------------------------------------

/**
 * THE COURSE: a double-skin dry-stone field wall with through-stones
 * and a cope set on edge, DEAD LEVEL from end to end. RIG: the cope at
 * COPE_H 0.82s (chest); the built head and the junction header stand
 * at the same height. Solid, cover, stone ×3. No body (the exposed
 * silhouette strokes live); castEdgeQuad per frame; no clock.
 */
export function courseWallItem(rend: PaintHost, tx: number, ty: number, game: ClientGame): DrawItem {
  const f = runFrame(rend, Tile.CourseWall, tx, ty, game);
  const { s, syT, px, baseY, cn, cs, xw, xe, ewAny } = f;
  const hw = BAND_HW * s;
  return {
    sortY: ty + 0.8,
    drawShadow: () => {
      // SHADOWS NEVER BAKE. The living wall's law: a prism casts from
      // its SOUTH foot edge, E-W, at its plan width — a N-S band cast
      // from its zero-width centre line extrudes to a hairline spike
      // under a near-noon sun (the ruin walls' lesson).
      if (ewAny) rend.castEdgeQuad(xw, baseY, xe, baseY, COPE_H);
      else if (cn) rend.castEdgeQuad(px - hw, baseY, px + hw, baseY, COPE_H);
      if (cs) rend.castEdgeQuad(px - hw, baseY + syT * 0.5, px + hw, baseY + syT * 0.5, COPE_H);
    },
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      const ink = inker(rend, ctx);
      const b = brush(ctx, f, ink);
      const H = COPE_H * s;
      // Back-to-front: the north band, the course, the header, the
      // south band; the ink flushes at each depth step so a nearer
      // face covers a farther silhouette.
      if (cn) {
        b.bandSeg(-0.5, -0.25, WALL_STANDING, H);
        b.bandSeg(-0.25, 0, WALL_STANDING, cs ? H : 0);
        ink.flush();
      }
      if (ewAny) {
        b.faceEW(xw, xe, 4);
        b.through(xw, xe);
        if (f.westFree) b.headEW(xw, -1, WALL_STANDING);
        if (f.eastFree) b.headEW(xe, 1, WALL_STANDING);
        b.copeEW(xw, xe, WALL_STANDING);
        ink.seg(xw, baseY, xe, baseY);
        ink.flush();
      }
      if (f.anchor) {
        b.anchor();
        ink.flush();
      }
      if (cs) {
        b.bandSeg(0, 0.25, WALL_STANDING, H);
        b.bandSeg(0.25, 0.5, WALL_STANDING, H);
        ink.flush();
      }
      // ---- re-read: contact → footing → four courses (two tones,
      // joints as steps, one mottle a course) → the through-stone →
      // built heads → the cope comb (lit tops, west risers, east
      // shade) → the header → the bands. Every rect ≥ 0.03s; no
      // stroke but the struct ring; nothing tumbles, nothing glows.
    },
  };
}

// ---- 550 CourseStile --------------------------------------------------

/**
 * VORL'S LAW, set one stone to pass: the same wall, the same stone,
 * the same datum, the crest dropped to the hip over this one tile and
 * STILL coped and STILL level — a built drop, not a breach. RIG: the
 * dropped cope at STILE_H 0.50s (hip); the step stone's lit top at
 * STEP_H 0.34s (knee), 0.16s wide, 0.10s thick, 0.10s proud; Vorl's
 * stone 0.12s wide and 0.50s tall, plumb, beside the step on the
 * camera side. Passable BY STATE (solid:false, no collider, no door).
 *
 * THE KIN READ (the fenceBroken rule, states.ts:207-231): the AXIS
 * comes from any COURSE_TILES kin (wall or stile); the TALL STUBS —
 * the neighbouring wall's cope carried STUB into this tile and then
 * dropped by a plumb riser — reach only toward WALL kin, never toward
 * another stile (two adjacent stiles read as one open two-tile low
 * place and never join stubs). Lone: an E-W stile with a built head
 * each side at its own height. The rig walking through it sorts
 * behind the lowered band (sortY ty + 0.8) so the read is a body
 * stepping OVER. No body; the exposed silhouette strokes live.
 */
export function courseStileItem(rend: PaintHost, tx: number, ty: number, game: ClientGame): DrawItem {
  const f = runFrame(rend, Tile.CourseStile, tx, ty, game);
  const { s, syT, px, baseY, h, cn, cs, cw, ce, wn, ws, ww, we, xw, xe, ewAny } = f;
  const hw = BAND_HW * s;
  const stub = STUB * s;
  // The deal: where the step sits along the low place, which side of
  // it Vorl's stone stands.
  const side = ((h >>> 9) & 1) === 0 ? -1 : 1;
  const stepJog = (((h >>> 11) & 3) - 1.5) * s * 0.04;
  // ---- E-W: the low wall between the tall stubs, the step on the
  // south face, Vorl's stone on the ground before it.
  const xLow0 = ww ? xw + stub : xw;
  const xLow1 = we ? xe - stub : xe;
  const stepW = s * 0.16;
  const stepX = Math.min(xLow1 - s * 0.14, Math.max(xLow0 + s * 0.14, (xLow0 + xLow1) * 0.5 + stepJog)) - stepW * 0.5;
  const vorlW = s * 0.12;
  const vorlX = Math.min(xLow1 - s * 0.08, Math.max(xLow0 + s * 0.08, stepX + stepW * 0.5 + side * s * 0.2));
  const vorlFootEW = baseY + syT * 0.18;
  // ---- N-S: the band from the north seam (or the heart) to the south
  // seam (or the heart), the tall stubs at the wall seams, the steps at
  // both flanks about the low band's middle, Vorl's stone east of it.
  const fyStart = cn ? -0.5 : 0;
  const fyEnd = cs ? 0.5 : 0;
  const fyLow0 = wn ? fyStart + STUB : fyStart;
  const fyLow1 = ws ? fyEnd - STUB : fyEnd;
  const fyStep = (fyLow0 + fyLow1) * 0.5 + (((h >>> 11) & 3) - 1.5) * 0.03;
  const stepDepth = Math.max(s * 0.03, syT * 0.16);
  const vorlFootNS = baseY + (fyStep + 0.2) * syT;
  const vorlXNS = px + hw + s * 0.18;

  return {
    sortY: ty + 0.8,
    drawShadow: () => {
      // SHADOWS NEVER BAKE: the run at the hip, one short edge per
      // step stone, Vorl's stone its own.
      if (ewAny) {
        rend.castEdgeQuad(xw, baseY, xe, baseY, STILE_H);
        rend.castEdgeQuad(stepX, baseY + syT * 0.1, stepX + stepW, baseY + syT * 0.1, STEP_H);
        rend.castEdgeQuad(vorlX - vorlW * 0.5, vorlFootEW, vorlX + vorlW * 0.5, vorlFootEW, STILE_H);
      } else {
        if (cn) rend.castEdgeQuad(px - hw, baseY, px + hw, baseY, STILE_H);
        if (cs) rend.castEdgeQuad(px - hw, baseY + syT * 0.5, px + hw, baseY + syT * 0.5, STILE_H);
        const sy = baseY + (fyStep + 0.08) * syT;
        rend.castEdgeQuad(px - hw - s * 0.1, sy, px - hw, sy, STEP_H);
        rend.castEdgeQuad(px + hw, sy, px + hw + s * 0.1, sy, STEP_H);
        rend.castEdgeQuad(vorlXNS - vorlW * 0.5, vorlFootNS, vorlXNS + vorlW * 0.5, vorlFootNS, STILE_H);
      }
    },
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      const ink = inker(rend, ctx);
      const b = brush(ctx, f, ink);
      const top = syT * 0.32;
      const H = STILE_H * s;
      const HC = COPE_H * s;
      const jw = Math.max(1, s * 0.03);

      /** Vorl's stone: one squared upright on the ground, plumb, its
       *  lit top, west riser and east arris; its seat a contact step.
       *  It stands apart, so all four edges ink. */
      const vorl = (vx: number, foot: number) => {
        const hwv = vorlW * 0.5;
        const vTop = foot - STILE_H * s;
        const cap = Math.max(s * 0.03, vorlW * rend.camera.yScale);
        ctx.fillStyle = CONTACT;
        ctx.fillRect(vx - hwv - s * 0.015, foot - s * 0.012, vorlW + s * 0.03, s * 0.03);
        ctx.fillStyle = MARL;
        ctx.fillRect(vx - hwv, vTop, vorlW, STILE_H * s);
        ctx.fillStyle = MARL_WEST;
        ctx.fillRect(vx - hwv, vTop, s * 0.03, STILE_H * s);
        ctx.fillStyle = MARL_EAST;
        ctx.fillRect(vx + hwv - s * 0.03, vTop, s * 0.03, STILE_H * s);
        ctx.fillStyle = MARL_LIT;
        ctx.fillRect(vx - hwv, vTop - cap, vorlW, cap);
        ctx.fillStyle = MARL_LIT_FAR;
        ctx.fillRect(vx - hwv, vTop - cap, vorlW, jw);
        ink.seg(vx - hwv, foot, vx - hwv, vTop - cap);
        ink.seg(vx - hwv, vTop - cap, vx + hwv, vTop - cap);
        ink.seg(vx + hwv, vTop - cap, vx + hwv, foot);
        ink.seg(vx - hwv, foot, vx + hwv, foot);
      };

      if (ewAny) {
        // ---- pass 1: the wall through the low place. The tall stubs
        // carry the neighbour's cope STUB into the tile at COPE_H and
        // drop by a plumb riser; the low wall runs between at STILE_H;
        // a free end is a built head at the stile's own height.
        if (ww) {
          b.faceEW(xw, xw + stub, 4);
          b.copeEW(xw, xw + stub, WALL_STANDING);
        }
        if (we) {
          b.faceEW(xe - stub, xe, 4);
          b.copeEW(xe - stub, xe, WALL_STANDING);
        }
        b.faceEW(xLow0, xLow1, 2);
        if (!cw) b.headEW(xw, -1, STILE_STANDING);
        if (!ce) b.headEW(xe, 1, STILE_STANDING);
        b.copeEW(xLow0, xLow1, STILE_STANDING);
        // The drops: the stub's inner side above the low crest — east
        // side shaded on the west stub, west riser lit on the east.
        if (ww) {
          ctx.fillStyle = MARL_EAST;
          ctx.fillRect(xw + stub - s * 0.03, baseY - HC - top, s * 0.03, HC - H);
          ink.seg(xw + stub, baseY - HC - top, xw + stub, baseY - H - top);
        }
        if (we) {
          ctx.fillStyle = MARL_WEST;
          ctx.fillRect(xe - stub, baseY - HC - top, s * 0.04, HC - H);
          ink.seg(xe - stub, baseY - HC - top, xe - stub, baseY - H - top);
        }
        ink.seg(xw, baseY, xe, baseY);
        ink.flush();
        // ---- pass 2: the step stone, proud of the south face at the
        // knee, in the through-stone's own grammar (the one proud stone
        // that reads): a pale 0.10s slab (MARL_LIT, two steps over the
        // wall's courses), its lit top plane the brightest note
        // (TOP-PLANE), ONE 0.03s dark underside, its east arris. NO
        // ring of its own: it lies against the face, an internal
        // feature (the fenceBroken shared-edge rule) — the first cut
        // inked a bracket round a 0.06s slab and read as a dark hook.
        const proud = Math.max(s * 0.03, syT * 0.1);
        const sTop = baseY - STEP_H * s;
        const slab = s * 0.1;
        ctx.fillStyle = THROUGH_UNDER;
        ctx.fillRect(stepX, sTop + proud + slab, stepW, s * 0.03);
        ctx.fillStyle = MARL_LIT;
        ctx.fillRect(stepX, sTop, stepW, proud + slab);
        ctx.fillStyle = MARL_LIT_TOP;
        ctx.fillRect(stepX, sTop, stepW, proud);
        ctx.fillStyle = MARL_EAST;
        ctx.fillRect(stepX + stepW - s * 0.03, sTop, s * 0.03, proud + slab);
        // ---- pass 3: Vorl's stone, on the ground before the wall.
        vorl(vorlX, vorlFootEW);
        ink.flush();
      } else {
        // ---- N-S: back to front. The north stub (if a wall stands
        // north), the low band, the south stub, then the steps at the
        // flanks and Vorl's stone.
        if (wn) b.bandSeg(fyStart, fyStart + STUB, WALL_STANDING, H);
        const lowNext = ws ? HC : cs ? H : 0;
        b.bandSeg(fyLow0, fyLow1, STILE_STANDING, lowNext);
        if (ws) b.bandSeg(fyEnd - STUB, fyEnd, WALL_STANDING, HC);
        ink.flush();
        // The steps: a slab off each flank at the knee, its top plane
        // lit (0.10s proud, 0.16 deep), its south face under it.
        const sy = baseY + fyStep * syT - STEP_H * s;
        for (const dir of [-1, 1] as const) {
          const x0 = dir < 0 ? px - hw - s * 0.1 : px + hw;
          ctx.fillStyle = MARL_LIT;
          ctx.fillRect(x0, sy - stepDepth * 0.5, s * 0.1, stepDepth);
          ctx.fillStyle = MARL_LIT_FAR;
          ctx.fillRect(x0, sy - stepDepth * 0.5, s * 0.1, jw);
          ctx.fillStyle = MARL_DOWN;
          ctx.fillRect(x0, sy + stepDepth * 0.5, s * 0.1, s * 0.06);
          ctx.fillStyle = dir < 0 ? MARL_WEST : MARL_EAST;
          ctx.fillRect(dir < 0 ? x0 : x0 + s * 0.07, sy - stepDepth * 0.5, s * 0.03, stepDepth + s * 0.06);
          const xo = dir < 0 ? x0 : x0 + s * 0.1;
          ink.seg(xo, sy - stepDepth * 0.5, xo, sy + stepDepth * 0.5 + s * 0.06);
          ink.seg(x0, sy - stepDepth * 0.5, x0 + s * 0.1, sy - stepDepth * 0.5);
          ink.seg(x0, sy + stepDepth * 0.5 + s * 0.06, x0 + s * 0.1, sy + stepDepth * 0.5 + s * 0.06);
        }
        ink.flush();
        vorl(vorlXNS, vorlFootNS);
        ink.flush();
      }
      // ---- re-read: stubs (the wall's own four courses and cope) →
      // the low wall (two courses, a thinner cope, still level) →
      // built heads → the drops as value steps → the step stone (lit
      // top, face, arris, under-shade) → Vorl's stone. No stroke but
      // the struct ring; every rect ≥ 0.03s; nothing on the ground
      // but what was set there.
    },
  };
}

// ---- 551 CorbelCell ---------------------------------------------------

/** The cell's profile, BULLET then BEEHIVE (the 9b fix pass): the
 *  lower two fifths of the flank stand near plumb (1.0 → 0.95 of the
 *  foot; the rings there step in a hair and the stair read is carried
 *  by the under-steps and the treads showing at the flanks), and only
 *  above the lintel does the corbel close — on a quarter circle, so
 *  every ring up there steps in visibly and the crown comes round to
 *  the capstone's quarter. The first cut tapered from ring one and
 *  read as a stepped cone (1.8:1 beside the walker) against the
 *  card's squat hut. Half-width as a fraction of CELL_RX at height
 *  fraction `hf`. */
function cellProfile(hf: number): number {
  if (hf < 0.4) return 1 - 0.05 * (hf / 0.4);
  const u = (hf - 0.4) / 0.6;
  return 0.25 + 0.7 * Math.sqrt(Math.max(0, 1 - u * u));
}

/**
 * A band between two front arcs of one ring (half-width `W` about
 * `cx`): the lower arc at `yLo` dipping `dLo` toward the viewer at its
 * centre, the upper at `yHi` dipping `dHi`, from `u0` to `u1` of the
 * width. Seven points an arc: a filled polygon, never a stroke, never
 * an ellipse — the ring's face, its lit tread, its under-step and its
 * two sun strips are all this one band.
 */
function arcBand(
  ctx: CanvasRenderingContext2D,
  cx: number, W: number,
  yLo: number, dLo: number, yHi: number, dHi: number,
  u0: number, u1: number,
): void {
  const N = 6;
  ctx.beginPath();
  for (let k = 0; k <= N; k++) {
    const u = u0 + ((u1 - u0) * k) / N;
    const dip = Math.sqrt(Math.max(0, 1 - u * u));
    const x = cx + u * W;
    const y = yLo + dLo * dip;
    if (k === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  for (let k = N; k >= 0; k--) {
    const u = u0 + ((u1 - u0) * k) / N;
    const dip = Math.sqrt(Math.max(0, 1 - u * u));
    ctx.lineTo(cx + u * W, yHi + dHi * dip);
  }
  ctx.closePath();
  ctx.fill();
}

/**
 * THE BEEHIVE HUT: a corbelled dry-stone dome, eight or nine rings of
 * squared stone each set a step in from the one under it, so the
 * flank reads as a stair of lit ring-tops (depth as value steps,
 * never a smooth mound); one flat capstone closes it; the door hole
 * low and SOUTH (the ground north of a roof is dead ground). RIG: the
 * crown at CELL_H 1.75s over a foot line CELL_FOOT_DY 0.18 south of
 * the centre, CELL_RX 0.6s at the foot — a body and a half, wider at
 * the foot than a body is tall; the lintel at 0.85s (the rig's chest,
 * so a Dolmen enters stooped). Solid, full block, light-blocking,
 * FADE_TALL. THE ONE RING: body via stationBody; CACHED and STATIC
 * both (truly still — no clock, no light, no smoke). SHADOWS NEVER
 * BAKE: a dome throws a blob, cast per frame.
 */
function paintCorbelCell(rend: PropHost, env: PropFrame): DrawItem {
  const { p, s, h, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const footY = p.y + syT * CELL_FOOT_DY;
  const rx = CELL_RX * s;
  const hgt = CELL_H * s;
  const footRy = syT * 0.3;
  const rings = 8 + (h & 1);
  const ringH = hgt / rings;
  const jw = Math.max(1, s * 0.03);
  const top = syT * 0.32;
  /** Ring i's half-width: the profile at its mid-height, wobbled a
   *  hair by the deal (never enough to un-step the stair). */
  const widthOf = (i: number): number =>
    rx * cellProfile((i + 0.5) / rings) * (0.98 + ((h >>> ((i * 2) & 31)) & 3) * 0.0067);
  const dipOf = (W: number): number => footRy * (W / rx);
  const up = CELL_H + 0.15;
  return {
    sortY: ty + 0.7,
    body: stationBody(0.75, up, 0.4),
    // SHADOWS NEVER BAKE: a dome throws a blob, cast per frame.
    drawShadow: () => rend.castBlob(p.x, footY, CELL_H, s * 0.55, h ^ 0x5a, s * 0.25),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      // ---- pass 1: the seat.
      contact(ctx, p.x, footY + s * 0.03, rx * 1.02, footRy * 1.05);
      // ---- pass 2: the rings, foot up. Each ring is a band between
      // its foot arc and its top arc (the front of a horizontal circle
      // dips toward the viewer); its tone alternates; a dark under-step
      // at its foot; perpends staggered ring to ring; one mottle chip
      // every second ring; the west flank lit, the east in shade; then
      // its TREAD — the lit top plane — which the narrower ring above
      // covers at the middle and leaves showing at the flanks: the
      // stair. TWO SUNS on every ring.
      for (let i = 0; i < rings; i++) {
        const W = widthOf(i);
        const d = dipOf(W);
        const y0 = footY - i * ringH;
        const y1 = y0 - ringH;
        const hr = hashCoords(541 + i, env.tx, env.ty) ^ h;
        ctx.fillStyle = i & 1 ? MARL_DOWN : MARL_UP;
        arcBand(ctx, p.x, W, y0, d, y1, d, -1, 1);
        ctx.fillStyle = RING_UNDER;
        arcBand(ctx, p.x, W, y0, d, y0 - s * 0.03, d, -0.92, 0.92);
        // Perpends: two to four a ring, the deal jogged a half block on
        // odd rings so no joint lines up with the one under it.
        const nJ = 2 + ((hr >>> 3) & 1) + (W > s * 0.35 ? 1 : 0);
        ctx.fillStyle = JOINT;
        for (let k = 0; k < nJ; k++) {
          const u = -0.78 + ((k + (i & 1 ? 0.5 : 0)) / nJ) * 1.56 + (((hr >>> (6 + k * 2)) & 3) - 1.5) * 0.06;
          if (u < -0.85 || u > 0.85) continue;
          const dip = d * Math.sqrt(1 - u * u);
          ctx.fillRect(p.x + u * W - jw * 0.5, y1 + dip, jw, ringH);
        }
        if ((i & 1) === 0 && W > s * 0.3) {
          const u = -0.5 + ((hr >>> 12) & 7) * 0.12;
          const dip = d * Math.sqrt(1 - u * u);
          ctx.fillStyle = MOTTLE;
          ctx.fillRect(p.x + u * W - s * 0.025, y1 + dip + ringH * 0.3, s * 0.05, s * 0.05);
        }
        const strip = Math.max(s * 0.03, W * 0.12) / W;
        ctx.fillStyle = MARL_WEST;
        arcBand(ctx, p.x, W, y0, d, y1, d, -1, -1 + strip);
        ctx.fillStyle = MARL_EAST;
        arcBand(ctx, p.x, W, y0, d, y1, d, 1 - strip, 1);
        // The tread: the ring's lit top plane, its east third a step
        // farther from the sun.
        ctx.fillStyle = MARL_LIT;
        arcBand(ctx, p.x, W, y1, d, y1 - s * 0.04, d, -1, 1);
        ctx.fillStyle = MARL_LIT_FAR;
        arcBand(ctx, p.x, W, y1, d, y1 - s * 0.04, d, 0.35, 1);
      }
      // ---- pass 3: the capstone. TOP-PLANE: one flat lit stone 0.30s
      // wide closing the crown (0.24 in the first cut: the wider stone
      // flattens the crown, the skep's opposite), a shaded east side,
      // its syT·0.32 top.
      {
        const Wt = widthOf(rings - 1);
        const crownY = footY - hgt + dipOf(Wt) * 0.6;
        const cw2 = s * 0.15;
        const thick = s * 0.06;
        ctx.fillStyle = MARL_UP;
        ctx.fillRect(p.x - cw2, crownY - thick, cw2 * 2, thick);
        ctx.fillStyle = MARL_LIT;
        ctx.fillRect(p.x - cw2, crownY - thick - top, cw2 * 2, top);
        ctx.fillStyle = MARL_LIT_FAR;
        ctx.fillRect(p.x - cw2, crownY - thick - top, cw2 * 2, jw);
        ctx.fillStyle = MARL_WEST;
        ctx.fillRect(p.x - cw2, crownY - thick - top, s * 0.03, top + thick);
        ctx.fillStyle = MARL_EAST;
        ctx.fillRect(p.x + cw2 - s * 0.03, crownY - thick - top, s * 0.03, top + thick);
      }
      // ---- pass 4: the door. A black squared hole low in the south
      // face, the lintel stone over it with its lit top, the west
      // reveal catching the sun inside, the threshold at the foot. No
      // door leaf (a Dolmen hangs nothing), no light inside.
      {
        const dw = s * 0.3;
        const lintelY = footY - s * 0.85;
        const sillY = footY + dipOf(widthOf(0)) * 0.7;
        ctx.fillStyle = DOOR;
        ctx.fillRect(p.x - dw * 0.5, lintelY, dw, sillY - lintelY);
        ctx.fillStyle = MOTTLE;
        ctx.fillRect(p.x - dw * 0.5, lintelY, s * 0.03, sillY - lintelY - s * 0.04);
        ctx.fillStyle = MARL_DOWN;
        ctx.fillRect(p.x - dw * 0.5, sillY - s * 0.04, dw, s * 0.04);
        ctx.fillStyle = MARL_UP;
        ctx.fillRect(p.x - dw * 0.5 - s * 0.04, lintelY - s * 0.08, dw + s * 0.08, s * 0.08);
        ctx.fillStyle = MARL_LIT;
        ctx.fillRect(p.x - dw * 0.5 - s * 0.04, lintelY - s * 0.08, dw + s * 0.08, s * 0.03);
        ctx.fillStyle = MARL_EAST;
        ctx.fillRect(p.x + dw * 0.5 + s * 0.01, lintelY - s * 0.08, s * 0.03, s * 0.08);
      }
      // ---- re-read: seat → rings (face, under-step, perpends, mottle,
      // west lit, east shade, tread) → capstone (face, top, sun strips)
      // → door (hole, reveal, threshold, lintel). No stroke, no
      // transform, no ellipse but the seat, every rect ≥ 0.03s; no
      // turf, no vent, no soot, no window, no smoke, no light.
    },
  };
}

// ---- 552 PlumbStone ---------------------------------------------------

/**
 * THE CLAIM MARK: a knee-high set stone on its footing with one groove
 * across the top, a bone cord pinched in the groove and a chalk-white
 * bob hanging down the face dead true — a plumb that hangs true says
 * the ground under it is set, the only claim a people with no flag can
 * make. RIG: the stone's top at PLUMB_H 0.40s over baseY (the knee),
 * 0.34s wide (a hair taller than wide: a set stone, not a seat), its
 * footing 0.44s × 0.06s set flush in the ground; the bob 0.09s × 0.12s
 * with its point 0.15s over the ground, ON the face (nothing rings
 * alone as a wheel). Solid r.3; stone ×3. No lean (the TallyStone
 * leans; this one is plumb, that is the point), no tally, no post, no
 * brass, no arch, no face.
 *
 * ONE BREEZE: the cord and bob sample rend.breezeAt ONCE per draw
 * through breeze(), clamped to BOB_AMP 0.03s; the cord's top is fixed
 * in the slot and the sway moves its lower end and the bob together;
 * the cord is a quad by moveTo/lineTo, never ctx.rotate. So it rides
 * CACHED_RING_TILES but never STATIC (it reads the clock: the
 * WardThread posture). SHADOWS NEVER BAKE: castEdgeQuad per frame.
 */
function paintPlumbStone(rend: PropHost, env: PropFrame): DrawItem {
  const { p, s, h, t, tx, ty, stationBody } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.18;
  const hw = s * 0.17;
  const H = PLUMB_H * s;
  const topY = baseY - H;
  const top = syT * 0.32;
  const jw = Math.max(1, s * 0.03);
  const footW = s * 0.44;
  const footH = s * 0.06;
  // The bob 0.09s × 0.12s (the brief's own fallback: at 1.3 the 0.07s
  // bob was a three-pixel dot and the silhouette could pass for a
  // small headstone); its point still 0.15s over the ground.
  const bobW = s * 0.09;
  const bobBody = s * 0.07;
  const bobPoint = s * 0.05;
  /** The bob's point, still: 0.15s over the ground, on the face. */
  const pointY = baseY - s * 0.15;
  const bobTop = pointY - bobPoint - bobBody;
  const slotY = topY - top * 0.5;
  const ph = breezePhase(h, 6);
  // The deal: where the grey lies in the face, which way the cord
  // sits in the groove.
  const mottleX = p.x + s * (0.02 + ((h >>> 4) & 3) * 0.02);
  const mottleY = topY + s * (0.08 + ((h >>> 7) & 3) * 0.05);
  const cordLean = (((h >>> 10) & 1) === 0 ? -1 : 1) * s * 0.006;
  return {
    sortY: ty + 0.62,
    // Painted extent: footing ±0.22s, the top plane 0.63s over baseY
    // (0.5s over p), the footing's face 0.06s under the ground line.
    body: stationBody(0.42, 0.75, 0.35),
    drawShadow: () => rend.castEdgeQuad(p.x - hw, baseY, p.x + hw, baseY, PLUMB_H),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      // ONE BREEZE, held to the bob's law (BOB_AMP).
      const { sw, lg } = breeze(rend, tx, ty, t, ph, s, BOB_AMP);
      const swayY = lg * 0.35;
      // ---- pass 1: the seat and the footing — a slab set flush, its
      // front face proud of the ground line, its lit top showing each
      // side of the stone that stands on it.
      contact(ctx, p.x, baseY + footH, footW * 0.56, syT * 0.09);
      ctx.fillStyle = MARL_DOWN;
      ctx.fillRect(p.x - footW * 0.5, baseY, footW, footH);
      ctx.fillStyle = MARL_LIT;
      ctx.fillRect(p.x - footW * 0.5, baseY - jw, footW, jw);
      ctx.fillStyle = MARL_EAST;
      ctx.fillRect(p.x + footW * 0.5 - s * 0.03, baseY - jw, s * 0.03, footH + jw);
      // ---- pass 2: the stone, primary mass: the face, one grey
      // mottle, the lit west riser, the shaded east arris; plumb.
      ctx.fillStyle = MARL;
      ctx.fillRect(p.x - hw, topY, hw * 2, H);
      ctx.fillStyle = MOTTLE;
      ctx.fillRect(mottleX, mottleY, s * 0.06, s * 0.05);
      ctx.fillStyle = MARL_WEST;
      ctx.fillRect(p.x - hw, topY, s * 0.04, H);
      ctx.fillStyle = MARL_EAST;
      ctx.fillRect(p.x + hw - s * 0.03, topY, s * 0.03, H);
      // ---- pass 3: TOP-PLANE. The lit top at syT·0.32, its far edge
      // a step down, cut by ONE dark slot running E-W.
      ctx.fillStyle = MARL_LIT;
      ctx.fillRect(p.x - hw, topY - top, hw * 2, top);
      ctx.fillStyle = MARL_LIT_FAR;
      ctx.fillRect(p.x - hw, topY - top, hw * 2, jw);
      ctx.fillStyle = SLOT;
      ctx.fillRect(p.x - hw + s * 0.03, slotY - s * 0.02, hw * 2 - s * 0.06, s * 0.04);
      // ---- pass 4: the cord and the bob. The cord is pinched in the
      // slot (fixed), comes over the south arris (fixed), and hangs
      // down the face to the bob — the hanging run and the bob ride
      // the one breeze together.
      ctx.fillStyle = CORD;
      cord(ctx, p.x + cordLean, slotY, p.x, topY, s * 0.03);
      const bx = p.x + sw;
      const by = bobTop + swayY;
      cord(ctx, p.x, topY, bx, by, s * 0.03);
      ctx.fillStyle = BOB;
      quad(ctx, bx - bobW * 0.5, by, bx + bobW * 0.5, by, bx + bobW * 0.5, by + bobBody, bx - bobW * 0.5, by + bobBody);
      tri(ctx, bx - bobW * 0.5, by + bobBody, bx + bobW * 0.5, by + bobBody, bx, by + bobBody + bobPoint);
      ctx.fillStyle = BOB_SHADE;
      ctx.fillRect(bx + bobW * 0.5 - s * 0.03, by, s * 0.03, bobBody);
      // ---- re-read: seat → footing (face, lit top, east arris) →
      // stone (face, mottle, west, east) → top plane, far edge, slot
      // → cord (two quads) → bob (square, point, shade). Breeze
      // sampled once and clamped to 0.03s; every rect ≥ 0.03s; no
      // stroke, no transform; no lean, no light.
    },
  };
}

// ---- the hall ---------------------------------------------------------

/** The two discrete pieces (the run pair is called from the renderer's
 *  switch beside ruinWallItem). */
export const COURSE_PROPS: PropEntries = [
  [[Tile.CorbelCell], paintCorbelCell],
  [[Tile.PlumbStone], paintPlumbStone],
];
