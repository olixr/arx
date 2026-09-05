/**
 * THE SCARRED LAND — G. THE STATES OF THE STANDING WORLD: living
 * props in their broken posture. TILE IS THE STATE (plan §1.8), so
 * every posture is its own id; the ART is the living prop's,
 * re-voiced — each painter here keeps the living piece's datum,
 * measure and grammar and paints only the state's DIFFERENCE, and
 * the living tile's own pixels are never touched (parity).
 *
 *  539 FenceBroken     — the Fence run family's broken length: a
 *                        leaning post, one rail hanging from its last
 *                        nail, the other rail on the ground, a splinter
 *                        square where it tore. Joins the Fence run mask
 *                        (FENCE_TILES): the living neighbours' rails
 *                        reach the seam and die into short splintered
 *                        stubs here, so a break reads as ONE built line
 *                        with a broken length. Non-solid: passability is
 *                        the state. Live-stroked with the run family —
 *                        exposed edges only, the seam never.
 *  540 SignpostBurnt   — the Signpost's post in SCAR_CHAR over a
 *                        silvered lower half, the board hanging from one
 *                        nail as a ROTATED QUAD (never ctx.rotate), blank,
 *                        ember checks hashed on the sun face.
 *  541 WellFouled      — the Well painter's own silhouette (a true thin
 *                        wrapper: the living draw runs first, verbatim),
 *                        then the shaft mouth near-black under a
 *                        SCAR_GLOOM wash, a heap of pulled reeds on the
 *                        rim where the living pail stood (the pail went
 *                        down with the rope's end), two dead reeds out
 *                        of the throat, the rope cut above the water,
 *                        and a rag knot on the gantry whose colour is
 *                        dealt from the four-colour field set — who
 *                        fouled it stays open (§1.3).
 *  542 HedgeDead       — the hedge run's clipped volume (same footprint
 *                        loop, cuts, pinch stations and lift as the living
 *                        hedge, so it coalesces seam-true under
 *                        HEDGE_TILES) with the leaf plates gone: a shorn
 *                        grey-brown mass, 6-9 twig quads in SCAR_CHAR /
 *                        SCAR_ASH, ember checks one tile in five. NO SWAY
 *                        — the living hedge beside it sways; the contrast
 *                        is the point. Live-stroked like the hedge.
 *  543 LampPostDark    — the LampPost fixture with the pane replaced by
 *                        a dark socket and two or three glass shards,
 *                        one shard on the ground. No light row, no glow,
 *                        no clock — on purpose. FADE_TALL.
 *  544 SluiceGate      — a board gate on two posts across the tile:
 *                        squared board quads with one lit facet each,
 *                        iron strap squares, a lifting bar through the
 *                        headstock.
 *  545 SluiceGateStrung — the same with a skral kelp-string knotted on
 *                        the near post: three or four dark green-brown
 *                        strand quads sampling rend.breezeAt at ≤0.03s.
 *
 * The laws, in the order the brush meets them: BODY-RULER (every
 * extent in `s`; the rig stands 1.15s), TOP-PLANE (every standing
 * piece shows its lit top), FLAT FORGE / BLOCK LAW (squared filled
 * quads, one lit facet toward the fixed west art sun, depth as value
 * steps, minimum feature 0.03s, never a stroked line — diagonals are
 * QUADS, never ctx.rotate, so the canvas oracle and the GL stage agree),
 * THE ONE RING (silhouette only: the hall pieces ring through the
 * cached eight-tap pass and every loose piece shares a silhouette or
 * sits in a contact shade; the two run members stroke their exposed
 * silhouette live with their families), ONE BREEZE (the kelp and the
 * rag sample rend.breezeAt with amplitude ≤0.03s — it survives the
 * ring-cache cadence, under 4Hz), collect-time light (no light rows
 * here, never queueGlow, no smoke), draw-time `const ctx = rend.ctx`,
 * hash deals by `h >>> k`, SHADOWS NEVER BAKE (cast per frame).
 */
import { Tile, hashCoords } from '@arx/shared';
import { fenceish, hedgeish } from '../../barrierArt.js';
import { ELEV_H } from '../../elevPick.js';
import { FENCE_POST, FENCE_RAIL, TWN_IRON, TWN_ROPE } from '../../paintVocab.js';
import { chamferRect, facetBlob, facetCircle } from '../../shapes.js';
import { DOCK_LIFT } from '../../terrain.js';
import { shade } from '../../tint.js';
import { CHARTER_BRASS, LEGION_CRIMSON, SCAR_ASH, SCAR_CHAR, SCAR_GLOOM, SCAR_RAG_RED } from '../palette.js';
import { STATIONS_PROPS } from '../stations.js';
import type { ClientGame } from '../../../game/clientGame.js';
import type { PaintHost } from '../../paintHost.js';
import type { DrawItem } from '../../renderer.js';
import type { PropEntries, PropFrame, PropHost, PropPainter } from '../types.js';

// ---- inks ---------------------------------------------------------------

/** THE FOUR-COLOUR FIELD SET: the war's four field dyes, one per party
 *  that flies cloth on the contested ground — the Company's rag red,
 *  the Legion's crimson, the Charter's brass, the Crown's ochre pennant
 *  (plan §2, the Mark column). Any rag, banner or knot in the kit that
 *  says "somebody's" without saying whose deals ONE of these by hash
 *  and never a dye band; FallenBanner (515) shares this set. */
export const CROWN_OCHRE = '#b8862e';
export const FIELD_SET: readonly string[] = [SCAR_RAG_RED, LEGION_CRIMSON, CHARTER_BRASS, CROWN_OCHRE];

/** Char, stepped: one lit facet, a dark east arris, the alligator
 *  checks a cold lifted grey (warmth is a light row, never paint). */
const CH_LIT = shade(SCAR_CHAR, 22);
const CH_EAST = shade(SCAR_CHAR, -8);
const CH_CHECK = shade(SCAR_CHAR, 40);
const CH_CRACK = shade(SCAR_CHAR, -12);
/** A burnt-through top: ash-grey, the plane the fire left. */
const CH_TOP = shade(SCAR_ASH, -22);
/** Weathered wood gone silver: the ash family, a half step warmer. */
const SILVER = shade(SCAR_ASH, -6);
const SILVER_LIT = shade(SCAR_ASH, 14);
const SILVER_EAST = shade(SCAR_ASH, -26);
/** Fresh split wood where a rail tore off its nail: pale, dry. */
const SPLIT = shade(FENCE_RAIL, 40);
const NAIL = '#141016';
const CONTACT = 'rgba(12, 8, 20, 0.24)';
/** A scorched board: browned, not black — the fire licked it. */
const BOARD_SCORCH = '#6a5238';
/** The dead hedge: the tile's own two inks (tilesDefs color/topColor)
 *  stepped — a shorn grey-brown crown over a darker tangle face. */
const DEAD_CROWN = '#6a5c44';
const DEAD_CROWN_LIT = shade(DEAD_CROWN, 12);
const DEAD_CROWN_HOLLOW = shade(DEAD_CROWN, -16);
const DEAD_FACE = '#4a4030';
const DEAD_FACE_LOW = shade(DEAD_FACE, -12);
const DEAD_FACE_LIT = shade(DEAD_FACE, 16);
/** The lamp's iron and the glass it held (the living fixture's inks). */
const LAMP_IRON = '#2c2836';
const LAMP_FOOT = '#5b5566';
const GLASS = '#7d84a0';
const GLASS_LIT = shade(GLASS, 24);
const GLASS_DARK = shade(GLASS, -30);
const SOCKET = '#100e16';
/** The sluice: the tile's oak, boards a step paler, iron the town's. */
const POST_OAK = '#5a4226';
const BOARD = shade(POST_OAK, 14);
const IRON_LIT = shade(TWN_IRON, 22);
const CHANNEL = '#1b2028';
/** Kelp: dark green-brown, the lit strand the strung tile's own top ink. */
const KELP_DARK = '#2e3a24';
const KELP_MID = '#3d4a2c';
const KELP_LIT = '#4c6a58';
/** Dead reeds and the fouled water's scum. */
const REED = '#7a6a4a';
const REED_DARK = '#5c5038';
const REED_HEAD = '#4e4230';
const MOUTH_BLACK = '#0c0a10';
const SCUM = '#28302a';

/** `rgba()` of SCAR_GLOOM at an alpha — the wash the gloom family lays. */
function gloomWash(alpha: number): string {
  const n = parseInt(SCAR_GLOOM.slice(1), 16);
  return `rgba(${n >> 16}, ${(n >> 8) & 0xff}, ${n & 0xff}, ${alpha})`;
}

// ---- the diagonal grammar ---------------------------------------------

/** A filled four-corner quad (never ctx.rotate). */
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

/**
 * A bar along an axis a→b with half-width vector n, lifted by `lift`
 * (screen up). Corners a−n, b−n, b+n, a+n.
 */
function bar(
  ctx: CanvasRenderingContext2D,
  ax: number, ay: number, bx: number, by: number,
  nx: number, ny: number, lift: number,
): void {
  quad(ctx, ax - nx, ay - ny - lift, bx - nx, by - ny - lift, bx + nx, by + ny - lift, ax + nx, ay + ny - lift);
}

/** A strip of a bar between two fractions of its half-width vector. */
function strip(
  ctx: CanvasRenderingContext2D,
  ax: number, ay: number, bx: number, by: number,
  nx: number, ny: number, f0: number, f1: number,
): void {
  quad(ctx, ax + nx * f0, ay + ny * f0, bx + nx * f0, by + ny * f0, bx + nx * f1, by + ny * f1, ax + nx * f1, ay + ny * f1);
}

/** Find a living prop's painter in its family roster (build-time: a
 *  missing painter is a defect, not a silent blank). */
function painterOf(roster: PropEntries, tile: Tile): PropPainter {
  for (const [tiles, painter] of roster) if (tiles.includes(tile)) return painter;
  throw new Error(`no living painter for tile ${Tile[tile]} to wrap`);
}

const paintWell = painterOf(STATIONS_PROPS, Tile.Well);

// ============================================================ 539 FenceBroken
/**
 * THE BROKEN LENGTH. RIG: the post leans at 0.88s (the living stands
 * 0.92s — chest-high to the 1.15s rig either way); the hanging rail's
 * nail is the living upper rail's height (0.75s); everything else lies
 * on the ground. The living Fence's datum (baseY = p.y + syT·0.14),
 * rail heights (RT 0.75 / RB 0.45), board section (0.05 plane over a
 * 0.11 face) and inks are the fence's own — a broken fence is the same
 * fence. Non-solid, no `body` (the exposed silhouette strokes live).
 */
export function fenceBrokenItem(rend: PaintHost, tx: number, ty: number, game: ClientGame): DrawItem {
  const s = rend.camera.scale;
  const ys = rend.camera.yScale;
  const syT = s * ys;
  const p = rend.camera.worldToScreen(tx + 0.5, ty + 0.5, rend.w, rend.h);
  p.y -= game.world.elevAt(tx, ty) * ELEV_H * s;
  // A prop on the porch stands ON the boards (the carried-deck rule).
  if (rend.porchAt(game, tx, ty)) p.y -= DOCK_LIFT * s;
  const h = hashCoords(41, tx, ty);
  const baseY = p.y + syT * 0.14;
  const gAt = (dx: number, dy: number) => game.world.groundAt(tx + dx, ty + dy);
  // The run mask: kin on each side (the run's AXIS — a break in an
  // east-west line still lies east-west), and the LIVING kin among
  // them, whose rails reach for this tile through FENCE_TILES so the
  // stubs reach back to meet them. Never toward another break: two
  // adjacent breaks would otherwise join their stubs into one torn
  // rail floating at the seam, held by nothing (K2 review).
  const kinN = fenceish(rend, game, tx, ty - 1);
  const kinE = fenceish(rend, game, tx + 1, ty);
  const kinS = fenceish(rend, game, tx, ty + 1);
  const kinW = fenceish(rend, game, tx - 1, ty);
  const cn = kinN && gAt(0, -1) !== Tile.FenceBroken;
  const ce = kinE && gAt(1, 0) !== Tile.FenceBroken;
  const cs = kinS && gAt(0, 1) !== Tile.FenceBroken;
  const cw = kinW && gAt(-1, 0) !== Tile.FenceBroken;
  const dNE = gAt(1, -1) === Tile.FenceDiagNE;
  const dSW = gAt(-1, 1) === Tile.FenceDiagNE;
  const dNW = gAt(-1, -1) === Tile.FenceDiagNW;
  const dSE = gAt(1, 1) === Tile.FenceDiagNW;
  const ewRun = kinW || kinE || (!kinN && !kinS);
  // The deal: which way the post leans, which way the rails came down
  // (toward the run they belonged to when only one side is built).
  const leanDir = ((h >>> 3) & 1) === 0 ? 1 : -1;
  const lean = leanDir * s * (0.1 + ((h >>> 5) & 3) * 0.02);
  const dealt = ((h >>> 7) & 1) === 0 ? 1 : -1;
  const fall = ewRun ? (kinW && !kinE ? -1 : kinE && !kinW ? 1 : dealt) : kinN && !kinS ? -1 : kinS && !kinN ? 1 : dealt;
  const fx = ewRun ? fall : 0;
  const fy = ewRun ? 0 : fall;
  // The fence's own measures.
  const RT = 0.75;
  const RB = 0.45;
  const PLANE = 0.05;
  const FACE = 0.11;
  const THICK = (PLANE + FACE) * s;
  const STUB = 0.16;
  const POST_W = s * 0.17;
  const POST_HW = POST_W * 0.5;
  const POST_H = s * 0.88;
  const capD = 0.15 * syT;
  /** The leaning post's centre x at a screen height. */
  const postX = (y: number) => p.x + (lean * (baseY - y)) / POST_H;
  // The nail the upper rail still hangs from, and where its far end
  // lies; the lower rail's lie on the ground.
  const yN = baseY - RT * s;
  const nailX = postX(yN) + (ewRun ? fx * POST_HW : s * 0.02);
  // Every fallen piece keeps inside the tile's own ground (the seam
  // south of the datum is 0.36·syT away; nothing lies past 0.3).
  const gX = p.x + fx * s * 0.46 + fy * s * 0.12 * leanDir;
  const gY = baseY + fy * syT * 0.24 + syT * 0.06;
  const aX = p.x + fx * s * 0.1 + fy * s * 0.14;
  const aY = baseY + fy * syT * 0.08 + fx * syT * 0.09;
  const bX = p.x + fx * s * 0.47 - fy * s * 0.02;
  const bY = baseY + fy * syT * 0.3 + fx * syT * 0.16;
  const xw = p.x - s * 0.5;
  const xe = p.x + s * 0.5;
  return {
    sortY: ty + 0.8,
    drawShadow: () => {
      // Every stub throws its short line; the post its anchor; the
      // hanging rail its ground run; the lying rail barely a shadow.
      if (cw) rend.castEdgeQuad(xw, baseY, xw + STUB * s, baseY, 0.6);
      if (ce) rend.castEdgeQuad(xe - STUB * s, baseY, xe, baseY, 0.6);
      if (cn) rend.castEdgeQuad(p.x, baseY - syT * 0.5, p.x, baseY - syT * (0.5 - STUB), 0.6);
      if (cs) rend.castEdgeQuad(p.x, baseY + syT * (0.5 - STUB), p.x, baseY + syT * 0.5, 0.6);
      rend.castEdgeQuad(p.x - s * 0.085, baseY, p.x + s * 0.085, baseY, 0.8);
      rend.castEdgeQuad(p.x, baseY, gX, gY, 0.42);
      rend.castEdgeQuad(aX, aY, bX, bY, 0.06);
    },
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      const inkOn = rend.outlineOn;
      /** Ink segments collected as the fills go down and flushed as
       *  one struct stroke at each depth step (exposed edges only, the
       *  seam never) — so a piece that lies BEHIND the post has its
       *  silhouette covered by the post face, as the living fence's
       *  post covers every joint. */
      const inkSegs: number[] = [];
      const seg = (x0: number, y0: number, x1: number, y1: number) => { if (inkOn) inkSegs.push(x0, y0, x1, y1); };
      const flush = () => {
        if (!inkOn || inkSegs.length === 0) return;
        rend.beginStructOutline();
        ctx.beginPath();
        for (let i = 0; i < inkSegs.length; i += 4) {
          ctx.moveTo(inkSegs[i]!, inkSegs[i + 1]!);
          ctx.lineTo(inkSegs[i + 2]!, inkSegs[i + 3]!);
        }
        ctx.stroke();
        inkSegs.length = 0;
      };

      // ---- pass 1: the stubs. Every built neighbour's rails reach the
      // seam at full section; here they run STUB into the tile and end
      // in splintered end grain — the break is inside this tile, and
      // the seam edge belongs to the run (never inked).
      const stubEW = (x0: number, x1: number, breakX: number) => {
        for (const T of [RB, RT]) {
          const yPlane = baseY - T * s;
          const yFace = yPlane + PLANE * s;
          const yBot = yFace + FACE * s;
          ctx.fillStyle = shade(FENCE_RAIL, 20);
          ctx.fillRect(x0, yPlane, x1 - x0, PLANE * s);
          ctx.fillStyle = T === RT ? FENCE_RAIL : shade(FENCE_RAIL, -6);
          ctx.fillRect(x0, yFace, x1 - x0, FACE * s);
          ctx.fillStyle = shade(FENCE_RAIL, -20);
          ctx.fillRect(x0, yBot - s * 0.03, x1 - x0, s * 0.03);
          // The torn end: dark end grain, and a split square on the
          // upper rail where the board tore up its own grain.
          ctx.fillStyle = shade(FENCE_RAIL, -16);
          ctx.fillRect(breakX < p.x ? breakX - s * 0.03 : breakX, yPlane, s * 0.03, THICK);
          if (T === RT) {
            ctx.fillStyle = SPLIT;
            ctx.fillRect(breakX < p.x ? breakX - s * 0.07 : breakX + s * 0.03, yPlane - s * 0.012, s * 0.04, s * 0.04);
          }
          seg(x0, yPlane, x1, yPlane);
          seg(x0, yBot, x1, yBot);
          seg(breakX, yPlane, breakX, yBot);
        }
      };
      const stubNS = (fyA: number, fyB: number, breakFy: number) => {
        const hw2 = s * 0.05;
        const yA = baseY + fyA * syT;
        const yB = baseY + fyB * syT;
        const stripNS = (H: number, wide: number, fill: string) => {
          ctx.fillStyle = fill;
          quad(ctx, p.x - hw2, yA - H, p.x - hw2 + wide, yA - H, p.x - hw2 + wide, yB - H + THICK, p.x - hw2, yB - H + THICK);
        };
        stripNS(RB * s, hw2 * 2, shade(FENCE_RAIL, -12));
        stripNS(RT * s, hw2 * 2, shade(FENCE_RAIL, 14));
        stripNS(RT * s, s * 0.03, shade(FENCE_RAIL, 30));
        // The torn end across the strip.
        const yBreak = baseY + breakFy * syT;
        ctx.fillStyle = shade(FENCE_RAIL, -16);
        ctx.fillRect(p.x - hw2, yBreak - RT * s - (breakFy < 0 ? s * 0.03 : 0), hw2 * 2, s * 0.03);
        seg(p.x - hw2, yA - RT * s, p.x - hw2, yB - RB * s + THICK);
        seg(p.x + hw2, yA - RT * s, p.x + hw2, yB - RB * s + THICK);
        seg(p.x - hw2, yBreak - RT * s, p.x + hw2, yBreak - RT * s);
      };
      const stubDiag = (fxd: number, fyd: number) => {
        // From the shared corner STUB·2 of the half stride inward.
        const cx0 = p.x + fxd * s;
        const cy0 = baseY + fyd * syT;
        const ex = p.x + fxd * (1 - STUB * 2) * s;
        const ey = baseY + fyd * (1 - STUB * 2) * syT;
        for (const T of [RB, RT]) {
          const y0 = cy0 - T * s;
          const y1 = ey - T * s;
          ctx.fillStyle = shade(FENCE_RAIL, 20);
          quad(ctx, cx0, y0, ex, y1, ex, y1 + PLANE * s, cx0, y0 + PLANE * s);
          ctx.fillStyle = T === RT ? FENCE_RAIL : shade(FENCE_RAIL, -6);
          quad(ctx, cx0, y0 + PLANE * s, ex, y1 + PLANE * s, ex, y1 + THICK, cx0, y0 + THICK);
          ctx.fillStyle = shade(FENCE_RAIL, -16);
          ctx.fillRect(ex - (fxd > 0 ? 0 : s * 0.03), y1, s * 0.03, THICK);
          seg(cx0, y0, ex, y1);
          seg(cx0, y0 + THICK, ex, y1 + THICK);
          seg(ex, y1, ex, y1 + THICK);
        }
      };
      // Back-to-front: up-screen stubs, then the pieces, then down-screen.
      if (cn) stubNS(-0.5, -0.5 + STUB, -0.5 + STUB);
      if (dNE) stubDiag(0.5, -0.5);
      if (dNW) stubDiag(-0.5, -0.5);
      if (cw) stubEW(xw, xw + STUB * s, xw + STUB * s);
      if (ce) stubEW(xe - STUB * s, xe, xe - STUB * s);

      // ---- pass 2: the loose pieces that lie BEHIND the post (a rail
      // that fell north), then the post, then what lies in front.
      const groundRail = () => {
        // A board lying flat: its broad face is the lit top plane, its
        // thickness the south edge, its far end the dark grain. The
        // ground-plane perpendicular is foreshortened in y.
        const dx = bX - aX;
        const gy = (bY - aY) / ys;
        const L = Math.hypot(dx, gy);
        const ux = dx / L;
        const uy = gy / L;
        const W = s * 0.08;
        const nx = -uy * W;
        const ny = ux * W * ys;
        const T = s * 0.05;
        ctx.fillStyle = CONTACT;
        bar(ctx, aX - ux * s * 0.03, aY - uy * s * 0.03 * ys, bX + ux * s * 0.04, bY + uy * s * 0.04 * ys, nx * 1.4, ny * 1.4 + s * 0.02, -s * 0.01);
        ctx.fillStyle = shade(FENCE_RAIL, -20);
        quad(ctx, aX + nx, aY + ny - T, bX + nx, bY + ny - T, bX + nx, bY + ny, aX + nx, aY + ny);
        ctx.fillStyle = shade(FENCE_RAIL, -16);
        quad(ctx, bX - nx, bY - ny - T, bX + nx, bY + ny - T, bX + nx, bY + ny, bX - nx, bY - ny);
        ctx.fillStyle = shade(FENCE_RAIL, 14);
        bar(ctx, aX, aY, bX, bY, nx, ny, T);
        // The grain: one darker board-line down the middle (a value step).
        ctx.fillStyle = shade(FENCE_RAIL, -4);
        strip(ctx, aX + ux * s * 0.04, aY + uy * s * 0.04 * ys - T, bX - ux * s * 0.04, bY - uy * s * 0.04 * ys - T, nx, ny, -0.2, 0.2);
        // The splinter where it tore off the post.
        ctx.fillStyle = SPLIT;
        ctx.fillRect(aX + nx * 0.2 - s * 0.02, aY + ny * 0.2 - T - s * 0.02, s * 0.04, s * 0.04);
        // Silhouette: the lifted top's far edge, the far end, the near
        // edge at the ground, the near end.
        seg(aX - nx, aY - ny - T, bX - nx, bY - ny - T);
        seg(bX - nx, bY - ny - T, bX + nx, bY + ny - T);
        seg(bX + nx, bY + ny - T, bX + nx, bY + ny);
        seg(bX + nx, bY + ny, aX + nx, aY + ny);
        seg(aX + nx, aY + ny, aX + nx, aY + ny - T);
        seg(aX + nx, aY + ny - T, aX - nx, aY - ny - T);
      };
      const hangingRail = () => {
        // From the nail to the ground: the board's broad face to the
        // camera, a lit strip on whichever long edge faces west, the
        // dark grain at the ground end, the nail head over the top.
        const dx = gX - nailX;
        const dy = gY - yN;
        const L = Math.hypot(dx, dy);
        const ux = dx / L;
        const uy = dy / L;
        const W = s * 0.08;
        const nx = -uy * W;
        const ny = ux * W;
        // The long edge that faces the west sun: +n when it lies west.
        const wSign = nx < 0 ? 1 : -1;
        ctx.fillStyle = FENCE_RAIL;
        strip(ctx, nailX, yN, gX, gY, nx, ny, -1, 1);
        ctx.fillStyle = shade(FENCE_RAIL, 20);
        strip(ctx, nailX, yN, gX, gY, nx, ny, wSign, wSign * 0.62);
        ctx.fillStyle = shade(FENCE_RAIL, -20);
        strip(ctx, nailX, yN, gX, gY, nx, ny, -wSign, -wSign * 0.62);
        ctx.fillStyle = shade(FENCE_RAIL, -16);
        quad(ctx, gX - nx, gY - ny, gX + nx, gY + ny, gX + nx - ux * s * 0.03, gY + ny - uy * s * 0.03, gX - nx - ux * s * 0.03, gY - ny - uy * s * 0.03);
        // The split beside the nail where the other nail tore through.
        ctx.fillStyle = SPLIT;
        ctx.fillRect(nailX + ux * s * 0.09 - s * 0.02, yN + uy * s * 0.09 - s * 0.02, s * 0.04, s * 0.04);
        ctx.fillStyle = NAIL;
        ctx.fillRect(nailX - s * 0.015, yN - s * 0.015, s * 0.03, s * 0.03);
        seg(nailX - nx, yN - ny, gX - nx, gY - ny);
        seg(gX - nx, gY - ny, gX + nx, gY + ny);
        seg(gX + nx, gY + ny, nailX + nx, yN + ny);
        seg(nailX + nx, yN + ny, nailX - nx, yN - ny);
      };
      const post = () => {
        const top = baseY - POST_H;
        const tlx = p.x + lean - POST_HW;
        const trx = p.x + lean + POST_HW;
        // Contact shade roots it to the turf.
        ctx.fillStyle = 'rgba(18, 12, 26, 0.18)';
        ctx.beginPath();
        ctx.ellipse(p.x, baseY + s * 0.012, POST_HW * 1.7, s * 0.05, 0, 0, Math.PI * 2);
        ctx.fill();
        // Face, sunlit west arris, shaded east fall-off — the same
        // turned timber, leaning.
        ctx.fillStyle = FENCE_POST;
        quad(ctx, tlx, top + capD, trx, top + capD, p.x + POST_HW, baseY, p.x - POST_HW, baseY);
        ctx.fillStyle = shade(FENCE_POST, 12);
        quad(ctx, tlx, top + capD, tlx + s * 0.03, top + capD, p.x - POST_HW + s * 0.03, baseY, p.x - POST_HW, baseY);
        ctx.fillStyle = shade(FENCE_POST, -14);
        quad(ctx, trx - s * 0.03, top + capD, trx, top + capD, p.x + POST_HW, baseY, p.x + POST_HW - s * 0.03, baseY);
        // The cap: the tilted top plane rides the leaning top.
        ctx.fillStyle = shade(FENCE_POST, 24);
        ctx.fillRect(tlx, top, POST_W, capD);
        ctx.fillStyle = shade(FENCE_POST, 2);
        ctx.fillRect(tlx, top, POST_W, s * 0.03);
        ctx.fillStyle = shade(FENCE_POST, 38);
        ctx.fillRect(tlx, top + capD - s * 0.03, POST_W, s * 0.03);
        // The nail hole the lower rail tore out of: split wood.
        const yRB = baseY - RB * s;
        ctx.fillStyle = SPLIT;
        ctx.fillRect(postX(yRB) + (ewRun ? fx : leanDir) * POST_HW * 0.3 - s * 0.02, yRB - s * 0.02, s * 0.04, s * 0.04);
        seg(tlx, top, trx, top);
        seg(trx, top, p.x + POST_HW, baseY);
        seg(p.x + POST_HW, baseY, p.x - POST_HW, baseY);
        seg(p.x - POST_HW, baseY, tlx, top);
      };
      const behind = gY < baseY; // the hanging rail fell north
      const railBehind = aY < baseY;
      if (railBehind) groundRail();
      if (behind) hangingRail();
      // The wall law, staged: what stands behind the post inks now,
      // so the post face covers it; the post inks; what lies in front
      // inks last, over the post.
      flush();
      post();
      flush();
      if (!behind) hangingRail();
      if (!railBehind) groundRail();

      // ---- pass 3: down-screen stubs over everything.
      if (cs) stubNS(0.5 - STUB, 0.5, 0.5 - STUB);
      if (dSW) stubDiag(-0.5, 0.5);
      if (dSE) stubDiag(0.5, 0.5);

      // ---- pass 4: the last ink — every exposed edge collected since
      // the post; the seam edges were never collected.
      flush();
    },
  };
}

// ============================================================ 542 HedgeDead
/**
 * THE DEAD HEDGE. RIG: the same 0.95s clipped volume the living hedge
 * stands (the rig sees over it), on the same footprint — CU 0.44,
 * crown north edge VN −0.16, skirt VS 0.4, the cut seams pinched by
 * the SAME keyed stations (hashCoords 157/163 by tx·3 and the seam's
 * boundary index) — so a dead length in a living run meets its
 * green neighbours edge-true and the run reads as one body with a
 * dead stretch. What changed: every leaf plate is gone. The crown is
 * a shorn grey-brown plane with dark hollows, the face a darker
 * tangle, twig quads poke up through the crown and lean on the face,
 * and one tile in five wears cold ember checks (the fire came this
 * way). Nothing here reads the clock: the living hedge beside it
 * sways — the contrast is the point.
 */
type MSeg = { au: number; av: number; bu: number; bv: number; k: number };
const KCUT = 0;
const KCROWN = 1;
const KSKIRT = 2;
const KSW = 3;
const KSE = 4;
const CU = 0.44;
const VN = -0.16;
const VS = 0.4;
const HED_H = 0.95;

/** The living hedge's seam pinch, exactly (barrierArt.hedgeItem). */
function hedgePinch(tx: number, vi: number, ch: number): number {
  return 0.045 + ((hashCoords(ch, tx * 3, vi) >>> 3) & 7) * 0.0055;
}

/**
 * One dead mass: a closed clockwise PLAN loop of typed segments (the
 * living hedge's own grammar) painted as a shorn volume — faces hung
 * from every skirt edge, the crown plane filled from the loop with
 * 45° chamfers at every free convex corner (never beside a cut),
 * hollows, a sun-side drift, twigs, checks — and ONE struct stroke of
 * the outer silhouette: cuts never take ink; the face's plumb sides and
 * ground line close the ring the way the living hedge's rootline does.
 */
function deadMass(
  rend: PaintHost,
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  tx: number,
  ty: number,
  h: number,
  parts: readonly MSeg[],
  lift: number,
  salt: number,
  inkSides: boolean,
  twigs: number,
  centreU: number,
  spreadU: number,
  checks: boolean,
): void {
  const s = rend.camera.scale;
  const syT = s * rend.camera.yScale;
  const X = (u: number) => px + u * s;
  const Y = (v: number) => py + v * syT - lift;
  const YG = (v: number) => py + v * syT;
  const n = parts.length;
  const C = s * 0.06;
  // A corner chamfers when it is convex and free: cuts must meet the
  // neighbour edge-true; a concave seat (the inner turn of a tee) stays
  // plumb.
  const cornerC = (i: number): number => {
    const a = parts[(i + n - 1) % n]!;
    const b = parts[i]!;
    if (a.k === KCUT || b.k === KCUT) return 0;
    const cross =
      Math.sign(a.bu - a.au) * Math.sign(b.bv - b.av) -
      Math.sign(a.bv - a.av) * Math.sign(b.bu - b.au);
    return cross > 0 ? C : 0;
  };
  const ends = (i: number) => {
    const g = parts[i]!;
    const ax = X(g.au);
    const ay = Y(g.av);
    const bx = X(g.bu);
    const by = Y(g.bv);
    const L = Math.hypot(bx - ax, by - ay) || 1;
    const ux = (bx - ax) / L;
    const uy = (by - ay) / L;
    const cA = Math.min(cornerC(i), L * 0.4);
    const cB = Math.min(cornerC((i + 1) % n), L * 0.4);
    return { sx: ax + ux * cA, sy: ay + uy * cA, ex: bx - ux * cB, ey: by - uy * cB, cA, cB };
  };

  // ---- pass 1: the faces, hung from every skirt edge (the crown
  // covers their top). A tangle face under a foot band, the west
  // arris the one lit facet where the end is free, a contact shade
  // seating it.
  let faceX0 = 0;
  let faceX1 = 0;
  let faceTop = 0;
  let faceBot = 0;
  let hasFace = false;
  for (let i = 0; i < n; i++) {
    const g = parts[i]!;
    if (g.k !== KSKIRT) continue;
    const e = ends(i);
    const xE = X(g.au);
    const xW = X(g.bu);
    const yT = Y(g.av);
    const yG = YG(g.av);
    ctx.fillStyle = CONTACT;
    ctx.fillRect(xW - s * 0.02, yG - s * 0.02, xE - xW + s * 0.04, s * 0.06);
    ctx.fillStyle = DEAD_FACE;
    ctx.beginPath();
    ctx.moveTo(xE - e.cA, yT);
    ctx.lineTo(xE, yT + e.cA);
    ctx.lineTo(xE, yG);
    ctx.lineTo(xW, yG);
    ctx.lineTo(xW, yT + e.cB);
    ctx.lineTo(xW + e.cB, yT);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = DEAD_FACE_LOW;
    ctx.fillRect(xW, yG - (yG - yT) * 0.3, xE - xW, (yG - yT) * 0.3);
    if (e.cB > 0) {
      ctx.fillStyle = DEAD_FACE_LIT;
      ctx.fillRect(xW, yT + e.cB, s * 0.04, yG - yT - e.cB);
    }
    if (e.cA > 0) {
      ctx.fillStyle = DEAD_FACE_LOW;
      ctx.fillRect(xE - s * 0.03, yT + e.cA, s * 0.03, yG - yT - e.cA);
    }
    if (!hasFace || xE - xW > faceX1 - faceX0) {
      hasFace = true;
      faceX0 = xW;
      faceX1 = xE;
      faceTop = yT;
      faceBot = yG;
    }
  }

  // ---- pass 2: the crown plane — ONE filled loop, chamfered — then
  // the hollows where the shears cut deepest, and the sun-side drift
  // where what is left of the bark catches the west light.
  ctx.fillStyle = DEAD_CROWN;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const e = ends(i);
    if (i === 0) ctx.moveTo(e.sx, e.sy);
    else ctx.lineTo(e.sx, e.sy);
    ctx.lineTo(e.ex, e.ey);
  }
  ctx.closePath();
  ctx.fill();
  const hollows = 2 + ((h >>> 11) & 1);
  for (let i = 0; i < hollows; i++) {
    const hi = (h >>> (14 + i * 5)) ^ (salt * 0x9e37);
    const u = centreU + (((hi & 7) / 7) * 2 - 1) * spreadU * 0.93;
    const v = VN + 0.12 + ((hi >>> 3) & 3) * 0.09;
    ctx.fillStyle = DEAD_CROWN_HOLLOW;
    ctx.beginPath();
    facetBlob(ctx, X(u), Y(v), s * (0.07 + ((hi >>> 5) & 3) * 0.012), h ^ (i * 0x51), 6, 0.6);
    ctx.fill();
  }
  ctx.fillStyle = DEAD_CROWN_LIT;
  ctx.beginPath();
  facetBlob(ctx, X(centreU - spreadU * 0.55), Y(VN + 0.26), s * 0.11 * Math.min(1, spreadU / 0.3 + 0.4), h ^ 0x7a ^ salt, 6, 0.55);
  ctx.fill();

  // ---- pass 3: the twigs. Dark char and silvered ash sticks the
  // shears left, rooted in the crown and leaning every way; the last
  // two lean on the face. Every root lies inside the tile's core and
  // every tip within a stride of it — nothing crosses a seam.
  const nTw = twigs;
  const twig = (x0: number, y0: number, dx: number, len: number, w: number, fill: string) => {
    const x1 = x0 + dx;
    const y1 = y0 - len;
    const L = Math.hypot(dx, len) || 1;
    const nx = (len / L) * w * 0.5;
    const ny = (dx / L) * w * 0.5;
    ctx.fillStyle = fill;
    quad(ctx, x0 - nx, y0 - ny, x1 - nx, y1 - ny, x1 + nx, y1 + ny, x0 + nx, y0 + ny);
  };
  for (let i = 0; i < nTw; i++) {
    const hi = (h >>> ((i * 3) & 31)) ^ (salt * 0x2b7 + i * 0x9e3779b1);
    const onFace = hasFace && i >= nTw - 2;
    const u = centreU + (((hi & 7) / 7) * 2 - 1) * spreadU;
    const dx = (((hi >>> 5) & 3) - 1.5) * s * 0.05;
    const len = s * (0.14 + ((hi >>> 7) & 3) * 0.045);
    const w = s * (0.03 + ((hi >>> 9) & 1) * 0.01);
    const ink = ((hi >>> 10) & 3) === 0 ? SCAR_ASH : SCAR_CHAR;
    if (onFace) {
      const fx = Math.min(faceX1 - s * 0.08, Math.max(faceX0 + s * 0.08, X(u)));
      twig(fx, faceBot - s * 0.02, dx * 0.6, Math.min(len, (faceBot - faceTop) * 0.8), w, ink);
    } else {
      const v = VN + 0.08 + ((hi >>> 3) & 3) * 0.09;
      twig(X(u), Y(v), dx, len, w, ink);
      if (((hi >>> 12) & 1) === 1) {
        // A fork two-thirds up, leaning the other way.
        twig(X(u) + dx * 0.62, Y(v) - len * 0.62, -dx * 0.8 - (dx === 0 ? s * 0.03 : 0), len * 0.4, w, ink);
      }
    }
  }

  // ---- pass 4: the ember checks — one tile in five. Cold lifted
  // squares on the sun half of the face (TWO SUNS) and one on the
  // crown; the shape of a fire that has been, not one that is.
  if (checks) {
    ctx.fillStyle = CH_CHECK;
    const q = s * 0.035;
    if (hasFace) {
      const x0 = faceX0 + s * 0.06;
      const span = Math.max(0, (faceX1 - faceX0) * 0.5 - s * 0.1);
      for (let i = 0; i < 3; i++) {
        const cx = x0 + span * (0.15 + i * 0.35) + (((h >>> (20 + i)) & 1) * s * 0.02);
        const cy = faceTop + (faceBot - faceTop) * (0.22 + i * 0.2);
        ctx.fillRect(cx, cy, q, q);
        ctx.fillStyle = CH_CRACK;
        ctx.fillRect(cx + q + s * 0.01, cy - s * 0.01, s * 0.03, q + s * 0.02);
        ctx.fillStyle = CH_CHECK;
      }
    }
    ctx.fillRect(X(centreU - spreadU * 0.5) - q * 0.5, Y(VN + 0.2), q, q);
  }

  // ---- pass 5: THE ONE RING, live. The outer silhouette only.
  if (rend.outlineOn) {
    rend.beginStructOutline();
    ctx.beginPath();
    let pen = false;
    for (let i = 0; i < n; i++) {
      const g = parts[i]!;
      const prev = parts[(i + n - 1) % n]!;
      const next = parts[(i + 1) % n]!;
      const e = ends(i);
      if (g.k === KCUT) { pen = false; continue; }
      if (g.k === KSKIRT) {
        if (!inkSides) { pen = false; continue; }
        // The face outline stands in for the arris: down the east
        // cheek (unless that edge is a seam), along the ground, up
        // the west cheek to the crown's chamfer.
        const yG = YG(g.av);
        if (prev.k === KCUT) {
          ctx.moveTo(X(g.au), yG);
        } else {
          if (!pen) ctx.moveTo(e.sx, e.sy);
          ctx.lineTo(X(g.au), Y(g.av) + e.cA);
          ctx.lineTo(X(g.au), yG);
        }
        ctx.lineTo(X(g.bu), yG);
        if (next.k === KCUT) { pen = false; continue; }
        ctx.lineTo(X(g.bu), Y(g.bv) + e.cB);
        ctx.lineTo(e.ex, e.ey);
        pen = true;
      } else {
        if (!pen) { ctx.moveTo(e.sx, e.sy); pen = true; }
        ctx.lineTo(e.ex, e.ey);
      }
      if (e.cB > 0 && next.k !== KCUT && !(next.k === KSKIRT && !inkSides)) {
        const ne = ends((i + 1) % n);
        ctx.lineTo(ne.sx, ne.sy);
      }
    }
    ctx.stroke();
  }
}

export function hedgeDeadItem(rend: PaintHost, tx: number, ty: number, game: ClientGame): DrawItem {
  const s = rend.camera.scale;
  const syT = s * rend.camera.yScale;
  const p = rend.camera.worldToScreen(tx + 0.5, ty + 0.5, rend.w, rend.h);
  p.y -= game.world.elevAt(tx, ty) * ELEV_H * s;
  const h = hashCoords(41, tx, ty);
  // The skirt line near the tile's south edge — the living hedge's datum.
  const baseY = p.y + syT * 0.4;
  const gAt = (dx: number, dy: number) => game.world.groundAt(tx + dx, ty + dy);
  const cn = hedgeish(rend, game, tx, ty - 1);
  const ce = hedgeish(rend, game, tx + 1, ty);
  const cs = hedgeish(rend, game, tx, ty + 1);
  const cw = hedgeish(rend, game, tx - 1, ty);
  const dNE = gAt(1, -1) === Tile.HedgeDiagNE;
  const dSW = gAt(-1, 1) === Tile.HedgeDiagNE;
  const dNW = gAt(-1, -1) === Tile.HedgeDiagNW;
  const dSE = gAt(1, 1) === Tile.HedgeDiagNW;
  const anyDiag = dNE || dSW || dNW || dSE;
  const any = cn || ce || cs || cw || anyDiag;
  const isoEW = !any;
  const xw = cw || isoEW ? p.x - s * 0.5 : p.x;
  const xe = ce || isoEW ? p.x + s * 0.5 : p.x;
  const dirCount = (cw ? 1 : 0) + (ce ? 1 : 0) + (cn ? 1 : 0) + (cs ? 1 : 0) + (anyDiag ? 1 : 0);
  const ewAny = cw || ce || isoEW;
  const nsEnd = dirCount === 1 && (cn || cs);
  const hMul = HED_H / 0.5;
  // The deal: 6..9 twigs; one tile in five burnt.
  const twigs = 6 + ((h >>> 9) & 3);
  const burnt = (h >>> 13) % 5 === 0;
  /** THE FUSED FOOTPRINT — the living hedge's loop, verbatim: one plan
   *  blob with arms reaching every connected seam, cut endpoints
   *  pinched by the shared boundary index. */
  const blobParts = (): MSeg[] => {
    const out: MSeg[] = [];
    const add = (au: number, av: number, bu: number, bv: number, k: number) => out.push({ au, av, bu, bv, k });
    const pNW = -CU + hedgePinch(tx, ty * 2, 157);
    const pNE = CU - hedgePinch(tx, ty * 2, 163);
    const pSW = -CU + hedgePinch(tx, ty * 2 + 2, 157);
    const pSE = CU - hedgePinch(tx, ty * 2 + 2, 163);
    if (cn) {
      if (cw) add(-0.5, VN, -CU, VN, KCROWN);
      add(-CU, VN, pNW, -0.5, KSW);
      add(pNW, -0.5, pNE, -0.5, KCUT);
      add(pNE, -0.5, CU, VN, KSE);
      if (ce) add(CU, VN, 0.5, VN, KCROWN);
    } else {
      add(cw ? -0.5 : -CU, VN, ce ? 0.5 : CU, VN, KCROWN);
    }
    if (ce) add(0.5, VN, 0.5, VS, KCUT);
    else add(CU, VN, CU, VS, KSE);
    if (cs) {
      if (ce) add(0.5, VS, CU, VS, KSKIRT);
      add(CU, VS, pSE, 0.5, KSE);
      add(pSE, 0.5, pSW, 0.5, KCUT);
      add(pSW, 0.5, -CU, VS, KSW);
      if (cw) add(-CU, VS, -0.5, VS, KSKIRT);
    } else {
      add(ce ? 0.5 : CU, VS, cw ? -0.5 : -CU, VS, KSKIRT);
    }
    if (cw) add(-0.5, VS, -0.5, VN, KCUT);
    else add(-CU, VS, -CU, VN, KSW);
    return out;
  };
  const cushionParts = (cx: number, cyv: number, halfU: number): MSeg[] => [
    { au: cx - halfU, av: cyv + VN, bu: cx + halfU, bv: cyv + VN, k: KCROWN },
    { au: cx + halfU, av: cyv + VN, bu: cx + halfU, bv: cyv + VS, k: KSE },
    { au: cx + halfU, av: cyv + VS, bu: cx - halfU, bv: cyv + VS, k: KSKIRT },
    { au: cx - halfU, av: cyv + VS, bu: cx - halfU, bv: cyv + VN, k: KSW },
  ];
  return {
    sortY: ty + 1,
    // Foot-anchored volume depth — the wall law: a body north of the
    // hedge sorts behind it; a body at its south base wins the tie.
    nearRow: rend.occlusionOn ? ty + 1 : undefined,
    drawShadow: () => {
      if (ewAny) rend.castEdgeQuad(xw, baseY, xe, baseY, 0.5);
      if (cn || nsEnd) rend.castEdgeQuad(p.x, baseY - syT * 0.5, p.x, baseY, 0.5);
      if (cs || nsEnd) rend.castEdgeQuad(p.x, baseY, p.x, baseY + syT * 0.5, 0.5);
      if (dNE) rend.castEdgeQuad(p.x, baseY, p.x + s * 0.5, baseY - syT * 0.5, 0.5);
      if (dSW) rend.castEdgeQuad(p.x - s * 0.5, baseY + syT * 0.5, p.x, baseY, 0.5);
      if (dNW) rend.castEdgeQuad(p.x - s * 0.5, baseY - syT * 0.5, p.x, baseY, 0.5);
      if (dSE) rend.castEdgeQuad(p.x, baseY, p.x + s * 0.5, baseY + syT * 0.5, 0.5);
    },
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      // Back-to-front: north diagonal cushions, the fused blob, south
      // cushions — each a dead mass in the same voice (the cushions
      // crown-only inked, as the living strides are).
      const diagC: Array<[number, number, number]> = [];
      if (dNE) diagC.push([0.5, -0.5, 8]);
      if (dNW) diagC.push([-0.5, -0.5, 10]);
      if (dSW) diagC.push([-0.5, 0.5, 12]);
      if (dSE) diagC.push([0.5, 0.5, 14]);
      diagC.sort((a, b) => a[1] - b[1]);
      const cushion = (fx: number, fy: number, k: number) =>
        deadMass(rend, ctx, p.x, p.y, tx, ty, h, cushionParts(fx, fy, 0.34), 0.46 * hMul * s, k, false, 3, fx, 0.2, false);
      for (const [fx, fy, k] of diagC) if (fy < 0) cushion(fx, fy, k);
      deadMass(rend, ctx, p.x, p.y, tx, ty, h, blobParts(), HED_H * s, 0, true, twigs, 0, 0.3, burnt);
      for (const [fx, fy, k] of diagC) if (fy >= 0) cushion(fx, fy, k);
    },
  };
}

// ============================================================ 540 SignpostBurnt
/**
 * THE BURNT POST. RIG: the post stands 1.06s (the living 1.18s burnt
 * back to a split top — the rig's eye line), the board hangs from one
 * nail to a hand off the ground. The living Signpost's datum
 * (baseY = p.y + syT·0.2), post width (0.11s) and board (0.84 × 0.36s)
 * are kept; the sign read returns a scorched notice server-side, so
 * the board is BLANK. Solid; post ×2.
 */
function paintSignpostBurnt(rend: PropHost, env: PropFrame): DrawItem {
  const { p, s, h, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.2;
  const PH = s * 1.06;
  const PW = s * 0.11;
  const HW = PW * 0.5;
  const side = ((h >>> 4) & 1) === 0 ? 1 : -1;
  const checks = 3 + ((h >>> 10) & 1) + ((h >>> 11) & 1); // 3..5
  const slatDown = ((h >>> 8) & 1) === 0;
  // The hanging board: one corner on the nail, its diagonal near
  // plumb (it hangs from a single point), the whole tipped TILT toward
  // the post's far side. The hang is worked out for the east side and
  // MIRRORED about the nail for the west — so a corner sits on the
  // nail whichever way the hash dealt it.
  const BL = s * 0.84;
  const BW = s * 0.36;
  const TILT = 0.1;
  const nailX = p.x + side * s * 0.04;
  const nailY = baseY - PH + s * 0.22;
  const alpha = Math.atan2(BW, BL);
  // Board-local: l along the length, w across; the hung corner is
  // (−BL/2, −BW/2) and the centre lies halfDiag from it at angle
  // alpha; on screen that diagonal must point DOWN, tipped by TILT.
  const phi = Math.PI / 2 - TILT - alpha;
  const cph = Math.cos(phi);
  const sph = Math.sin(phi);
  const halfDiag = 0.5 * Math.hypot(BL, BW);
  const bcxRel = Math.sin(TILT) * halfDiag;
  const bcy = nailY + Math.cos(TILT) * halfDiag;
  /** Board-local to screen (x mirrored about the nail for side < 0). */
  const bpt = (l: number, w: number) => ({
    x: nailX + side * (bcxRel + l * cph - w * sph),
    y: bcy + l * sph + w * cph,
  });
  return {
    sortY: ty + 0.62,
    // Painted extent: the board's far corner ±0.56s, the post's split
    // top at −1.16s, the fallen slat at +0.2s.
    body: stationBody(0.6, 1.3, 0.4),
    drawShadow: () => rend.castEdgeQuad(p.x - s * 0.06, baseY, p.x + s * 0.06, baseY, 1.06),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      // ---- pass 1: the ground. Contact shade and the ash the fire
      // left round the foot where the earth heap was.
      ctx.fillStyle = 'rgba(18, 12, 26, 0.2)';
      ctx.beginPath();
      ctx.ellipse(p.x, baseY + s * 0.01, s * 0.15, s * 0.06, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = shade(SCAR_ASH, -16);
      ctx.beginPath();
      ctx.ellipse(p.x, baseY - s * 0.01, s * 0.13, s * 0.045, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = SCAR_ASH;
      ctx.fillRect(p.x - s * 0.08 + ((h >>> 6) & 3) * s * 0.03, baseY - s * 0.04, s * 0.03, s * 0.03);
      // The fallen slat, when it fell: char on the far side of the foot.
      if (slatDown) {
        const ax = p.x - side * s * 0.1;
        const ay = baseY + syT * 0.1;
        const bx = p.x - side * s * 0.42;
        const by = baseY + syT * 0.17;
        const dx = bx - ax;
        const dy = by - ay;
        const L = Math.hypot(dx, dy);
        const nx = (-dy / L) * s * 0.05;
        const ny = (dx / L) * s * 0.05;
        ctx.fillStyle = CONTACT;
        bar(ctx, ax, ay, bx, by, nx * 1.4, ny * 1.4 + s * 0.02, -s * 0.01);
        ctx.fillStyle = CH_EAST;
        quad(ctx, ax + nx, ay + ny - s * 0.03, bx + nx, by + ny - s * 0.03, bx + nx, by + ny, ax + nx, ay + ny);
        ctx.fillStyle = CH_TOP;
        bar(ctx, ax, ay, bx, by, nx, ny, s * 0.03);
        ctx.fillStyle = CH_CRACK;
        bar(ctx, ax + dx * 0.45, ay + dy * 0.45, ax + dx * 0.55, ay + dy * 0.55, nx * 0.8, ny * 0.8, s * 0.03);
      }
      // ---- pass 2: the post. Silvered below (weather bleached it),
      // char above (the fire took it): one lit west facet each, a
      // dark east arris, the char boundary jagged, the top burnt to a
      // split with its ash plane and one char spike.
      const yMid = baseY - PH * 0.5;
      const top = baseY - PH;
      ctx.fillStyle = SILVER;
      ctx.fillRect(p.x - HW, yMid, PW, PH * 0.5);
      ctx.fillStyle = SILVER_LIT;
      ctx.fillRect(p.x - HW, yMid, s * 0.035, PH * 0.5);
      ctx.fillStyle = SILVER_EAST;
      ctx.fillRect(p.x + HW - s * 0.03, yMid, s * 0.03, PH * 0.5);
      ctx.fillStyle = SCAR_CHAR;
      ctx.fillRect(p.x - HW, top, PW, PH * 0.5);
      // The char tongue running down the east side of the silver.
      ctx.fillRect(p.x + HW - s * 0.045, yMid, s * 0.045, s * 0.13);
      ctx.fillStyle = CH_LIT;
      ctx.fillRect(p.x - HW, top, s * 0.035, PH * 0.5);
      ctx.fillStyle = CH_EAST;
      ctx.fillRect(p.x + HW - s * 0.03, top, s * 0.03, PH * 0.5 + s * 0.13);
      // The split top: the ash plane, the spike on the sun side.
      ctx.fillStyle = CH_TOP;
      ctx.fillRect(p.x - HW, top - s * 0.035, PW, s * 0.035);
      ctx.fillStyle = SCAR_CHAR;
      quad(ctx, p.x - HW, top - s * 0.035, p.x - HW + s * 0.04, top - s * 0.035, p.x - HW + s * 0.03, top - s * 0.12, p.x - HW, top - s * 0.1);
      ctx.fillStyle = CH_LIT;
      ctx.fillRect(p.x - HW, top - s * 0.1, s * 0.03, s * 0.065);
      // THE ALLIGATOR CHAR on the sun face: lifted cold checks between
      // crack grooves, hashed down the char half — nowhere else.
      const q = s * 0.035;
      for (let i = 0; i < checks; i++) {
        const cy = top + s * 0.08 + ((PH * 0.5 - s * 0.16) * i) / Math.max(1, checks - 1) + (((h >>> (12 + i)) & 1) * s * 0.02);
        ctx.fillStyle = CH_CHECK;
        ctx.fillRect(p.x - HW, cy, q, q);
        ctx.fillStyle = CH_CRACK;
        ctx.fillRect(p.x - HW + q, cy - s * 0.01, s * 0.03, q + s * 0.02);
      }
      // The empty nail hole where the board's other nail tore out.
      ctx.fillStyle = CH_CRACK;
      ctx.fillRect(p.x - side * s * 0.04 - s * 0.015, nailY - s * 0.015, s * 0.03, s * 0.03);
      // The slat that stayed: charred, nailed by both its nails.
      if (!slatDown) {
        const cy = baseY - PH + s * 0.56;
        ctx.fillStyle = CH_TOP;
        ctx.fillRect(p.x - s * 0.3, cy - s * 0.13, s * 0.6, s * 0.03);
        ctx.fillStyle = SCAR_CHAR;
        ctx.fillRect(p.x - s * 0.3, cy - s * 0.1, s * 0.6, s * 0.2);
        ctx.fillStyle = CH_LIT;
        ctx.fillRect(p.x - s * 0.3, cy - s * 0.1, s * 0.03, s * 0.2);
        ctx.fillStyle = CH_CHECK;
        ctx.fillRect(p.x - s * 0.18, cy - s * 0.04, q, q);
        ctx.fillRect(p.x + s * 0.06, cy - s * 0.02, q, q);
        ctx.fillStyle = NAIL;
        ctx.fillRect(p.x - s * 0.23, cy - s * 0.015, s * 0.03, s * 0.03);
        ctx.fillRect(p.x + s * 0.2, cy - s * 0.015, s * 0.03, s * 0.03);
      }
      // ---- pass 3: the board, hanging from its one nail. A ROTATED
      // QUAD: face, the char band along the long edge the fire ran,
      // the lit strip on the other long edge (its top plane, tipped
      // to the sun), the nail head over the hanging corner. Blank.
      const c0 = bpt(-BL * 0.5, -BW * 0.5);
      const c1 = bpt(BL * 0.5, -BW * 0.5);
      const c2 = bpt(BL * 0.5, BW * 0.5);
      const c3 = bpt(-BL * 0.5, BW * 0.5);
      ctx.fillStyle = BOARD_SCORCH;
      quad(ctx, c0.x, c0.y, c1.x, c1.y, c2.x, c2.y, c3.x, c3.y);
      // Which long edge hangs lower carries the char band.
      const lowerIsC2 = (c2.y + c3.y) > (c0.y + c1.y);
      const e0 = lowerIsC2 ? bpt(-BL * 0.5, BW * 0.5 - s * 0.05) : bpt(-BL * 0.5, -BW * 0.5 + s * 0.05);
      const e1 = lowerIsC2 ? bpt(BL * 0.5, BW * 0.5 - s * 0.05) : bpt(BL * 0.5, -BW * 0.5 + s * 0.05);
      ctx.fillStyle = SCAR_CHAR;
      if (lowerIsC2) quad(ctx, e0.x, e0.y, e1.x, e1.y, c2.x, c2.y, c3.x, c3.y);
      else quad(ctx, c0.x, c0.y, c1.x, c1.y, e1.x, e1.y, e0.x, e0.y);
      const l0 = lowerIsC2 ? bpt(-BL * 0.5, -BW * 0.5 + s * 0.03) : bpt(-BL * 0.5, BW * 0.5 - s * 0.03);
      const l1 = lowerIsC2 ? bpt(BL * 0.5, -BW * 0.5 + s * 0.03) : bpt(BL * 0.5, BW * 0.5 - s * 0.03);
      ctx.fillStyle = shade(BOARD_SCORCH, 24);
      if (lowerIsC2) quad(ctx, c0.x, c0.y, c1.x, c1.y, l1.x, l1.y, l0.x, l0.y);
      else quad(ctx, l0.x, l0.y, l1.x, l1.y, c2.x, c2.y, c3.x, c3.y);
      // The scorch creeping up from the char band: a value step.
      ctx.fillStyle = shade(BOARD_SCORCH, -12);
      const m0 = lowerIsC2 ? bpt(-BL * 0.5, BW * 0.5 - s * 0.12) : bpt(-BL * 0.5, -BW * 0.5 + s * 0.12);
      const m1 = lowerIsC2 ? bpt(BL * 0.2, BW * 0.5 - s * 0.12) : bpt(BL * 0.2, -BW * 0.5 + s * 0.12);
      const m2 = lowerIsC2 ? bpt(BL * 0.2, BW * 0.5 - s * 0.05) : bpt(BL * 0.2, -BW * 0.5 + s * 0.05);
      const m3 = lowerIsC2 ? bpt(-BL * 0.5, BW * 0.5 - s * 0.05) : bpt(-BL * 0.5, -BW * 0.5 + s * 0.05);
      quad(ctx, m0.x, m0.y, m1.x, m1.y, m2.x, m2.y, m3.x, m3.y);
      ctx.fillStyle = NAIL;
      ctx.fillRect(nailX - s * 0.015, nailY - s * 0.015, s * 0.03, s * 0.03);
      // ---- pass 4: re-read — char at four values (face/lit/east/
      // check) + crack, silver at three, one lit facet west, the board
      // a quad with a lit top edge, every feature ≥0.03s, no strokes,
      // no rotates, no light, no smoke, nothing written.
    },
  };
}

// ============================================================ 541 WellFouled
/**
 * THE FOULED WELL: the Well painter's own draw runs first, untouched,
 * then the state paints over it. The living hash deals three tops;
 * the fouled well is held to the bare windlass (a roller to cut a
 * rope from) by flipping only the two hash bits that pick the top —
 * the ring's masonry-or-crib, spill side and depth stay the tile's own.
 * The windlass parks its pail on the west rim; the state buries that
 * spot under the reed heap (a cut rope and a parked pail cannot both
 * be true), so every living pixel the state contradicts is covered
 * and every one it agrees with shows through.
 */
export function foulHash(h: number): number {
  for (let k = 0; k < 4; k++) {
    const c = (h ^ (k << 2)) >>> 0;
    if ((c >>> 2) % 3 === 1) return c;
  }
  return h;
}

function paintWellFouled(rend: PropHost, env: PropFrame): DrawItem {
  const { p, s, h, t, tx, ty } = env;
  const hw = foulHash(h);
  const inner = paintWell(rend, { ...env, tile: Tile.Well, h: hw });
  const syT = s * rend.camera.yScale;
  // The living well's own measures, so every overpaint lands where the
  // living paint put the thing it fouls.
  const yB = p.y + syT * 0.42;
  const ringR = s * 0.46;
  const ery = ringR * 0.36;
  const wallH = s * 0.55;
  const ringTop = yB - wallH;
  const tcx = p.x;
  const tcy = ringTop + s * 0.012;
  const postT = ringTop - s * 1.0;
  const rollY = postT + s * 0.16;
  const dropX = p.x - s * 0.037;
  const field = FIELD_SET[(hw >>> 17) & 3]!;
  const innerDraw = inner.draw;
  return {
    ...inner,
    draw: () => {
      innerDraw?.();
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      // ---- pass 1: the mouth. The water gone near-black, a scum
      // ring a value step above it, and the gloom family's wash laid
      // over the throat and the cap — sick water, not a black hole
      // (the lip ring the living painted still steps down into it).
      ctx.fillStyle = MOUTH_BLACK;
      ctx.beginPath();
      ctx.ellipse(tcx, tcy, ringR * 0.68, ery * 0.68, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = SCUM;
      ctx.beginPath();
      ctx.ellipse(tcx, tcy, ringR * 0.6, ery * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = MOUTH_BLACK;
      ctx.beginPath();
      ctx.ellipse(tcx + s * 0.02, tcy + s * 0.006, ringR * 0.48, ery * 0.46, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = gloomWash(0.2);
      ctx.beginPath();
      ctx.ellipse(tcx, tcy, ringR * 0.8, ery * 0.82, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = gloomWash(0.16);
      ctx.beginPath();
      ctx.ellipse(tcx, tcy, ringR * 0.5, ery * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      // ---- pass 2: the pail went down with the rope's end. Where the
      // living windlass parks it on the west rim (p.x − 0.44·ringR,
      // ringTop − 0.1·ery, a 0.17s pail under a 0.08s bail) lies the
      // heap of dead reeds somebody pulled from the mouth: a mound
      // that covers the pail's whole extent, its lit top to the sky,
      // stalks lying across it, the seat shade stepping it onto the
      // cap.
      const hx = p.x - ringR * 0.44;
      const hy = ringTop - ery * 0.1;
      // The heap's foot spreads down the cap to ringTop + 0.11s: it
      // buries the living windlass's coiled slack (an ellipse at
      // p.x − 0.42·ringR, ringTop + 0.42·ery, 0.055s × 0.024s) — a
      // well whose pail went down with the rope has no slack to coil.
      ctx.fillStyle = shade(REED_DARK, -14);
      ctx.beginPath();
      ctx.ellipse(hx, hy + s * 0.075, s * 0.12, s * 0.05, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(hx - s * 0.1, hy + s * 0.02, s * 0.2, s * 0.03);
      ctx.fillStyle = REED_DARK;
      ctx.fillRect(hx - s * 0.1, hy - s * 0.17, s * 0.2, s * 0.21);
      ctx.beginPath();
      ctx.ellipse(hx, hy - s * 0.17, s * 0.1, s * 0.055, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = REED;
      ctx.beginPath();
      ctx.ellipse(hx - s * 0.015, hy - s * 0.18, s * 0.07, s * 0.035, 0, 0, Math.PI * 2);
      ctx.fill();
      const stalk = (x0: number, y0: number, x1: number, y1: number, fill: string) => {
        const dx = x1 - x0;
        const dy = y1 - y0;
        const L = Math.hypot(dx, dy);
        const nx = (-dy / L) * s * 0.015;
        const ny = (dx / L) * s * 0.015;
        ctx.fillStyle = fill;
        quad(ctx, x0 - nx, y0 - ny, x1 - nx, y1 - ny, x1 + nx, y1 + ny, x0 + nx, y0 + ny);
      };
      stalk(hx - s * 0.12, hy - s * 0.06, hx + s * 0.11, hy - s * 0.13, shade(REED, 10));
      stalk(hx - s * 0.1, hy - s * 0.1, hx + s * 0.13, hy - s * 0.02, REED);
      stalk(hx - s * 0.13, hy + s * 0.01, hx + s * 0.09, hy - s * 0.09, shade(REED, -6));
      // A stalk lying across the foot, over where the coil was.
      stalk(hx - s * 0.14, hy + s * 0.09, hx + s * 0.1, hy + s * 0.05, shade(REED, -10));
      ctx.fillStyle = REED_HEAD;
      ctx.fillRect(hx + s * 0.09, hy - s * 0.16, s * 0.04, s * 0.06);
      ctx.fillRect(hx - s * 0.15, hy - s * 0.02, s * 0.04, s * 0.06);
      // The longest reed pulled from the mouth leans from the heap up
      // against the roller — and its line IS the living windlass's
      // run-out rope (dropX, rollY + 0.05s → dropX − 0.32·ringR,
      // ringTop − 0.02s; a 0.018s stroke): a 0.045s stalk laid along
      // it covers the rope that the cut one replaces, so ONE rope
      // leaves the roller, and it ends in the fray over the water.
      {
        const lx0 = dropX - ringR * 0.32;
        const ly0 = ringTop - s * 0.02;
        const lx1 = dropX;
        const ly1 = rollY + s * 0.05;
        const dx = lx1 - lx0;
        const dy = ly1 - ly0;
        const L = Math.hypot(dx, dy);
        const nx = (-dy / L) * s * 0.0225;
        const ny = (dx / L) * s * 0.0225;
        ctx.fillStyle = REED_DARK;
        quad(ctx, lx0 - nx, ly0 - ny, lx1 - nx, ly1 - ny, lx1 + nx, ly1 + ny, lx0 + nx, ly0 + ny);
        // Its lit west edge, and the seed head resting on the roller.
        ctx.fillStyle = shade(REED, 6);
        quad(ctx, lx0 - nx, ly0 - ny, lx1 - nx, ly1 - ny, lx1 - nx * 0.2, ly1 - ny * 0.2, lx0 - nx * 0.2, ly0 - ny * 0.2);
        ctx.fillStyle = REED_HEAD;
        ctx.fillRect(lx1 - s * 0.03, ly1 - s * 0.04, s * 0.04, s * 0.07);
      }
      // ---- pass 3: two dead reeds standing out of the throat, one
      // each side of the rope's drop, their heads gone to seed.
      const reed = (x0: number, y0: number, x1: number, y1: number, fill: string) => {
        stalk(x0, y0, x1, y1, fill);
        ctx.fillStyle = REED_HEAD;
        ctx.fillRect(x1 - s * 0.02, y1 - s * 0.03, s * 0.04, s * 0.07);
      };
      reed(tcx - ringR * 0.36, tcy + ery * 0.1, tcx - ringR * 0.5, tcy - s * 0.5, REED);
      reed(tcx + ringR * 0.22, tcy + ery * 0.2, tcx + ringR * 0.3, tcy - s * 0.42, REED_DARK);
      // ---- pass 4: the rope, cut. It hangs from the roller into the
      // mouth and ends in a fray a hand above the water — the pail
      // went down with the rest of it.
      const rx0 = dropX + s * 0.006;
      const ry0 = rollY + s * 0.055;
      const rx1 = p.x - s * 0.03;
      const ry1 = tcy - ery * 0.35;
      ctx.fillStyle = TWN_ROPE;
      quad(ctx, rx0 - s * 0.015, ry0, rx1 - s * 0.015, ry1, rx1 + s * 0.015, ry1, rx0 + s * 0.015, ry0);
      ctx.fillStyle = shade(TWN_ROPE, -18);
      quad(ctx, rx0 + s * 0.005, ry0, rx1 + s * 0.005, ry1, rx1 + s * 0.015, ry1, rx0 + s * 0.015, ry0);
      ctx.fillStyle = shade(TWN_ROPE, 26);
      ctx.fillRect(rx1 - s * 0.035, ry1 - s * 0.01, s * 0.03, s * 0.03);
      ctx.fillRect(rx1 + s * 0.005, ry1 + s * 0.004, s * 0.03, s * 0.03);
      // ---- pass 5: the rag knot on the west gantry post — somebody's
      // colour, dealt from the four; the two tails breathe ONE BREEZE
      // at ≤0.03s so the sample survives the ring cadence.
      const kx = p.x - ringR * 0.84;
      const ky = postT + s * 0.38;
      const { sway, lag } = rend.breezeAt(tx, ty, t, tx * 2.3 + ty * 1.7, s, 0.02, 0.03);
      ctx.fillStyle = field;
      ctx.fillRect(kx - s * 0.035, ky - s * 0.035, s * 0.07, s * 0.07);
      ctx.fillStyle = shade(field, -24);
      ctx.fillRect(kx - s * 0.015, ky - s * 0.015, s * 0.03, s * 0.03);
      const tail = (x0: number, len: number, off: number, fill: string) => {
        ctx.fillStyle = fill;
        quad(ctx, x0 - s * 0.0175, ky + s * 0.03, x0 + s * 0.0175, ky + s * 0.03, x0 + off + s * 0.0175, ky + s * 0.03 + len, x0 + off - s * 0.0175, ky + s * 0.03 + len);
      };
      tail(kx - s * 0.02, s * 0.16, sway, field);
      tail(kx + s * 0.02, s * 0.12, lag, shade(field, -12));
      // ---- pass 6: re-read — the living well verbatim underneath;
      // over it only fills (the reeds and rope are quads, the heap a
      // mound), the living rope and its coil buried under reeds so
      // one rope leaves the roller, the water black under a gloom
      // wash, the rag's colour
      // one of four, the only motion the rag at ≤0.03s; no light, no
      // smoke, no clock but the breeze.
    },
  };
}

// ============================================================ 543 LampPostDark
/**
 * THE DARK LAMP. RIG: the same fixture as the LampPost case — a stone
 * foot, a tapered iron post to 1.32s, the cage at 1.52s under its
 * peaked cap (the cage sits over the rig's head: FADE_TALL). The pane
 * is gone: a dark socket holds two or three shards, one more lies on
 * the ground in its own contact shade. No light row, no glow, no
 * clock — dark on purpose (the Returners' lamps that would not hold).
 */
function paintLampPostDark(rend: PropHost, env: PropFrame): DrawItem {
  const { p, s, h, stationBody, ty } = env;
  const syT = s * rend.camera.yScale;
  const baseY = p.y + syT * 0.12;
  const shards = 2 + ((h >>> 4) & 1);
  const side = ((h >>> 7) & 1) === 0 ? 1 : -1;
  return {
    sortY: ty + 0.8,
    // Painted extent: the cap's peak at −1.64s, the ground shard at
    // ±0.24s, the foot at +0.1s.
    body: stationBody(0.3, 1.8, 0.4),
    drawShadow: () => rend.castEdgeQuad(p.x - s * 0.05, baseY, p.x + s * 0.05, baseY, 1.55),
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      // ---- pass 1: the fixture, as the living lamp stands it. Stone
      // foot (a shaded east half steps it round), the tapered post.
      ctx.fillStyle = LAMP_FOOT;
      ctx.beginPath();
      facetCircle(ctx, p.x, baseY, s * 0.13, 6, 0.2, 0.6);
      ctx.fill();
      ctx.fillStyle = shade(LAMP_FOOT, -14);
      ctx.fillRect(p.x + s * 0.03, baseY - s * 0.05, s * 0.08, s * 0.1);
      ctx.fillStyle = LAMP_IRON;
      quad(ctx, p.x - s * 0.045, baseY, p.x + s * 0.045, baseY, p.x + s * 0.03, baseY - s * 1.32, p.x - s * 0.03, baseY - s * 1.32);
      // The one lit facet: the post's west arris.
      ctx.fillStyle = shade(LAMP_IRON, 16);
      quad(ctx, p.x - s * 0.045, baseY, p.x - s * 0.015, baseY, p.x - s * 0.0, baseY - s * 1.32, p.x - s * 0.03, baseY - s * 1.32);
      // ---- pass 2: the cage. The dark socket where the pane was, the
      // shards still in the frame, the dead wick, the bars and the cap.
      const ly = baseY - s * 1.52;
      ctx.fillStyle = SOCKET;
      ctx.beginPath();
      chamferRect(ctx, p.x - s * 0.11, ly, s * 0.22, s * 0.24, s * 0.03);
      ctx.fill();
      // Soot up the socket's back wall, a value step.
      ctx.fillStyle = shade(SOCKET, 8);
      ctx.fillRect(p.x - s * 0.08, ly + s * 0.13, s * 0.16, s * 0.08);
      const shard = (x: number, y: number, w: number, hh: number) => {
        ctx.fillStyle = GLASS;
        ctx.fillRect(x, y, w, hh);
        ctx.fillStyle = GLASS_LIT;
        ctx.fillRect(x, y, s * 0.03, hh);
      };
      shard(p.x - s * 0.1, ly + s * 0.17, s * 0.05, s * 0.06);
      shard(p.x + s * 0.05, ly + s * 0.02, s * 0.045, s * 0.05);
      if (shards === 3) shard(p.x + s * 0.06, ly + s * 0.18, s * 0.04, s * 0.04);
      ctx.fillStyle = shade(SCAR_ASH, -20);
      ctx.fillRect(p.x + s * 0.03, ly + s * 0.195, s * 0.035, s * 0.035);
      ctx.fillStyle = LAMP_IRON;
      ctx.fillRect(p.x - s * 0.02, ly, s * 0.04, s * 0.24);
      ctx.beginPath();
      ctx.moveTo(p.x - s * 0.15, ly);
      ctx.lineTo(p.x + s * 0.15, ly);
      ctx.lineTo(p.x, ly - s * 0.12);
      ctx.closePath();
      ctx.fill();
      // The cap's lit west pitch (TOP-PLANE: the one plane the sun reaches).
      ctx.fillStyle = shade(LAMP_IRON, 14);
      quad(ctx, p.x - s * 0.15, ly, p.x - s * 0.06, ly, p.x - s * 0.02, ly - s * 0.1, p.x, ly - s * 0.12);
      // ---- pass 3: the shard on the ground, in its contact shade —
      // a lying square of glass, dark under, lit face up.
      const gx = p.x + side * s * 0.19;
      const gy = baseY + syT * 0.1;
      ctx.fillStyle = CONTACT;
      ctx.beginPath();
      ctx.ellipse(gx + s * 0.02, gy + s * 0.02, s * 0.05, s * 0.025, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = GLASS_DARK;
      ctx.fillRect(gx, gy, s * 0.05, s * 0.035);
      ctx.fillStyle = GLASS_LIT;
      ctx.fillRect(gx - s * 0.008, gy - s * 0.01, s * 0.045, s * 0.03);
      // ---- pass 4: re-read — iron at three values, glass at three,
      // the socket black, one lit facet west, no rgba flame, no
      // clock, no glow.
    },
  };
}

// ============================================================ 544/545 SluiceGate
/**
 * THE SLUICE. RIG: two posts a head high (1.0s) either side of the
 * tile, a waist-high board gate between them (0.52..0.65s), a
 * headstock across the post caps and the lifting bar rising through
 * it to 1.4s — the rig can reach the bar. Boards are squared quads
 * with ONE lit facet (the top sliver), iron strap squares bind them,
 * the water shows dark under a raised gate. Solid; post ×2.
 *
 * STRUNG: the skral's kelp-string knotted to the lifting bar — five
 * strand quads hung down the gate face, crossing the boards, sampling
 * rend.breezeAt at ≤0.03s. (The K2b proof read the old post-side
 * strands as nothing at zoom 1.3; the kelp now hangs where the eye
 * already is, over the boards, and leads with its lit strand.)
 */
function paintSluice(strung: boolean): PropPainter {
  return (rend: PropHost, env: PropFrame): DrawItem => {
    const { p, s, h, t, tx, ty, stationBody } = env;
    const syT = s * rend.camera.yScale;
    const baseY = p.y + syT * 0.2;
    const PW = s * 0.15;
    const PHW = PW * 0.5;
    const PH = s * 1.0;
    const capD = 0.12 * syT;
    const xL = p.x - s * 0.42;
    const xR = p.x + s * 0.42;
    const boards = 4 + ((h >>> 4) & 1);
    const BH = s * 0.13;
    const raise = ((h >>> 6) & 1) === 0 ? 0 : s * 0.08;
    const beamTop = baseY - PH - capD - s * 0.09;
    return {
      sortY: ty + 0.64,
      // Painted extent: posts ±0.5s, the lifting bar's knob at −1.48s,
      // the channel's dark at +0.06s.
      body: stationBody(0.56, 1.56, 0.3),
      drawShadow: () => {
        rend.castEdgeQuad(xL, baseY, xR, baseY, 0.62);
        rend.castEdgeQuad(xL - PHW, baseY, xL + PHW, baseY, 1.0);
        rend.castEdgeQuad(xR - PHW, baseY, xR + PHW, baseY, 1.0);
      },
      draw: () => {
        // Draw-time ctx capture: the outline pass swaps rend.ctx.
        const ctx = rend.ctx;
        // ---- pass 1: the ground and the gate panel (it runs in the
        // posts' grooves, so it is painted first and the posts cover
        // its ends). The channel's water shows dark under the boards.
        ctx.fillStyle = CONTACT;
        ctx.fillRect(xL - PHW, baseY - s * 0.02, xR - xL + PW, s * 0.07);
        ctx.fillStyle = CHANNEL;
        ctx.fillRect(xL, baseY - raise - s * 0.03, xR - xL, raise + s * 0.06);
        const px0 = xL + PHW - s * 0.03;
        const px1 = xR - PHW + s * 0.03;
        const yBot = baseY - raise;
        for (let i = 0; i < boards; i++) {
          const y1 = yBot - i * BH;
          const y0 = y1 - BH;
          ctx.fillStyle = shade(BOARD, (i & 1) === 0 ? 4 : -5);
          ctx.fillRect(px0, y0, px1 - px0, BH);
          // The one lit facet: the board's top sliver to the sky.
          ctx.fillStyle = shade(BOARD, 22);
          ctx.fillRect(px0, y0, px1 - px0, s * 0.03);
          // The under-edge seats it on the board below (depth as value).
          ctx.fillStyle = shade(BOARD, -18);
          ctx.fillRect(px0, y1 - s * 0.03, px1 - px0, s * 0.03);
        }
        const yTop = yBot - boards * BH;
        // Iron straps: two bands across the panel with their strap
        // squares — the rivet heads catching the west light.
        for (const f of [0.28, 0.72]) {
          const sy = yBot - (yBot - yTop) * f - s * 0.02;
          ctx.fillStyle = shade(TWN_IRON, -8);
          ctx.fillRect(px0 + s * 0.02, sy, px1 - px0 - s * 0.04, s * 0.04);
          ctx.fillStyle = IRON_LIT;
          for (let x = px0 + s * 0.05; x < px1 - s * 0.06; x += s * 0.14) {
            ctx.fillRect(x, sy + s * 0.0025, s * 0.035, s * 0.035);
          }
        }
        // ---- pass 2: the lifting bar rising from the panel's top
        // through the headstock, its peg above the beam, its knob.
        const barW = s * 0.06;
        const barTop = beamTop - s * 0.3;
        ctx.fillStyle = shade(POST_OAK, -6);
        ctx.fillRect(p.x - barW * 0.5, barTop, barW, yTop - barTop + s * 0.02);
        ctx.fillStyle = shade(POST_OAK, 14);
        ctx.fillRect(p.x - barW * 0.5, barTop, s * 0.03, yTop - barTop + s * 0.02);
        ctx.fillStyle = shade(POST_OAK, 26);
        ctx.fillRect(p.x - barW * 0.5, barTop - s * 0.03, barW, s * 0.03);
        // ---- pass 3: the posts. Face, lit west arris, dark east
        // fall-off, the cap plane, the groove irons.
        for (const x of [xL, xR]) {
          const top = baseY - PH;
          ctx.fillStyle = 'rgba(18, 12, 26, 0.18)';
          ctx.beginPath();
          ctx.ellipse(x, baseY + s * 0.012, PHW * 1.7, s * 0.05, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = POST_OAK;
          ctx.fillRect(x - PHW, top, PW, PH);
          ctx.fillStyle = shade(POST_OAK, 14);
          ctx.fillRect(x - PHW, top, s * 0.035, PH);
          ctx.fillStyle = shade(POST_OAK, -14);
          ctx.fillRect(x + PHW - s * 0.03, top, s * 0.03, PH);
          ctx.fillStyle = shade(POST_OAK, 26);
          ctx.fillRect(x - PHW, top - capD, PW, capD);
          ctx.fillStyle = shade(POST_OAK, 4);
          ctx.fillRect(x - PHW, top - capD, PW, s * 0.03);
          ctx.fillStyle = shade(TWN_IRON, -4);
          ctx.fillRect(x - s * 0.025, baseY - PH * 0.3, s * 0.05, s * 0.05);
          ctx.fillRect(x - s * 0.025, baseY - PH * 0.62, s * 0.05, s * 0.05);
          ctx.fillStyle = IRON_LIT;
          ctx.fillRect(x - s * 0.025, baseY - PH * 0.3, s * 0.03, s * 0.05);
          ctx.fillRect(x - s * 0.025, baseY - PH * 0.62, s * 0.03, s * 0.05);
        }
        // The headstock across both caps: face, lit top, dark under —
        // and the iron peg through the lifting bar above it.
        ctx.fillStyle = shade(POST_OAK, -2);
        ctx.fillRect(xL - PHW, beamTop, xR - xL + PW, s * 0.09);
        ctx.fillStyle = shade(POST_OAK, 22);
        ctx.fillRect(xL - PHW, beamTop, xR - xL + PW, s * 0.03);
        ctx.fillStyle = shade(POST_OAK, -16);
        ctx.fillRect(xL - PHW, beamTop + s * 0.06, xR - xL + PW, s * 0.03);
        ctx.fillStyle = TWN_IRON;
        ctx.fillRect(p.x - s * 0.07, beamTop - s * 0.12, s * 0.14, s * 0.035);
        ctx.fillStyle = IRON_LIT;
        ctx.fillRect(p.x - s * 0.07, beamTop - s * 0.12, s * 0.03, s * 0.035);
        // ---- pass 4: the kelp-string hung from the lifting bar — the
        // paid variant. A 0.1s knot at the bar just over the panel's
        // top, then five strands 0.06s wide fanned across the gate
        // face and hanging 0.45–0.6s down over the boards, each its
        // own length and breathing ONE BREEZE at ≤0.03s (alternating
        // the primary swing and the lagged beat — the two-beat law).
        // The LIT strand leads (west) so the mass separates from the
        // oak behind it instead of reading as one more dark board.
        if (strung) {
          const ky = yTop - s * 0.07;
          const { sway, lag } = rend.breezeAt(tx, ty, t, tx * 1.7 + ty * 2.1, s, 0.02, 0.03);
          ctx.fillStyle = KELP_DARK;
          ctx.fillRect(p.x - s * 0.05, ky - s * 0.05, s * 0.1, s * 0.1);
          ctx.fillStyle = KELP_MID;
          ctx.fillRect(p.x - s * 0.05, ky - s * 0.05, s * 0.04, s * 0.04);
          const inks = [KELP_LIT, KELP_DARK, KELP_MID, KELP_DARK, KELP_MID];
          const w = s * 0.06;
          for (let k = 0; k < 5; k++) {
            const x0 = p.x + (k - 2) * s * 0.07;
            const y0 = ky + s * 0.04;
            const len = s * (0.45 + ((h >>> (10 + k * 2)) & 3) * 0.05);
            const off = (k & 1) === 0 ? sway : lag;
            ctx.fillStyle = inks[k]!;
            quad(ctx, x0 - w * 0.5, y0, x0 + w * 0.5, y0, x0 + off + w * 0.5, y0 + len, x0 + off - w * 0.5, y0 + len);
          }
        }
        // ---- pass 5: re-read — oak at five values, iron at two, one
        // lit facet per board and per post (west), every feature
        // ≥0.03s, no strokes, no rotates; the kelp is the only thing
        // that moves and it moves under 0.03s.
      },
    };
  };
}

export const STATES_PROPS: PropEntries = [
  [[Tile.SignpostBurnt], paintSignpostBurnt],
  [[Tile.WellFouled], paintWellFouled],
  [[Tile.LampPostDark], paintLampPostDark],
  [[Tile.SluiceGate], paintSluice(false)],
  [[Tile.SluiceGateStrung], paintSluice(true)],
];
