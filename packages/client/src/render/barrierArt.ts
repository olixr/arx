/**
 * THE FOUR BARRIER FAMILIES — fence, palisade, iron fence, hedge: posts,
 * rails, gates and their *ish membership predicates, one coupling grammar.
 * Moved verbatim off the Renderer class (foundations F2 wave A); the
 * painters reach the engine through the shared PaintHost slice.
 */
import { ClientGame } from '../game/clientGame.js';
import { ELEV_H } from './elevPick.js';
import { windAtInto } from './grass.js';
import { FENCE_POST, FENCE_RAIL, GY_MOSS, GY_STONE, GY_STONE_LIT, PALI_BONE, PALI_LOG, PALI_ROPE, PALI_ROPE_DARK, WIND_TMP } from './paintVocab.js';
import { shade } from './tint.js';
import { facetBlob, facetCircle } from './shapes.js';
import { DOCK_LIFT } from './terrain.js';
import { FENCE_TILES, HEDGE_TILES, IRON_FENCE_TILES, PALISADE_TILES, Tile, doorInfo, hashCoords } from '@arx/shared';
import type { DrawItem } from './renderer.js';
import type { PaintHost } from './paintHost.js';

// THE IRON REST — the graveyard kit's palette: wrought iron gone
// blue-black with age (never bright steel — this metal drinks the
// light), the granite curb and piers it is set into, and the rust
// that blooms where bar meets stone. The moss is the crypt kit's own
// damp green, so the yard and the dark beneath it read as one place.
const IRON_DARK = '#26232f';
const IRON_MID = '#3c3849';
const IRON_LIT = '#635d76';
const IRON_RUST = '#5e4030';
// THE CLIPPED GREEN: garden foliage in the berry bush's leaf lineage
// (the one wild green the world already speaks), clipped formal — a
// half-step deeper and cooler than the meadow so a drawn hedgerow
// reads as gardener's work against wild growth. Three tones roll the
// mass; the wood is stem brown; the bloom borrows the berry's madder
// pinks so garden color stays one family with the wilds'.
const HEDGE_DARK = '#24512c';
const HEDGE_LEAF = '#376e37';
const HEDGE_LIT = '#4f8f44';
const HEDGE_BLOOM = '#b04a72';
const HEDGE_BLOOM_LIT = '#ef9ec0';

/** Fence-family connectivity: rails reach toward these neighbours. */
export function fenceish(rend: PaintHost, game: ClientGame, x: number, y: number): boolean {
  const t = game.world.groundAt(x, y);
  return (
    t !== undefined &&
    (FENCE_TILES.has(t as Tile) ||
      t === Tile.WallWood ||
      t === Tile.WallStone ||
      t === Tile.WallWoodWindow ||
      t === Tile.WallStoneWindow)
  );
}

/**
 * A square-hewn fence post wearing a foreshortened cap plane — the
 * 2.5D anchor every fence mass hangs from (crate-lid grammar: lit
 * plane, shaded far edge, sunlit front arris). Paints its own brand
 * outline; call it AFTER the rails so the post face covers their
 * run-through seams and every joint reads carpentered.
 */
export function drawFencePost(rend: PaintHost, x: number, baseY: number, w: number, hTot: number, ds = 1): void {
  const ctx = rend.ctx;
  // Epic B (FW): caller's w/hTot already foreshorten by the tile's depthScale;
  // ds recedes this helper's own detail with them. ds=1 → byte-identical.
  const s = rend.camera.scale * ds;
  const syT = s * rend.camera.yScale;
  const capD = 0.15 * syT;
  const hw = w / 2;
  const top = baseY - hTot;
  // Contact shade roots it to the turf.
  ctx.fillStyle = 'rgba(18, 12, 26, 0.18)';
  ctx.beginPath();
  ctx.ellipse(x, baseY + s * 0.012, hw * 1.7, s * 0.05, 0, 0, Math.PI * 2);
  ctx.fill();
  // Face, with a sunlit west arris and a shaded east fall-off — a
  // turned square timber, not a flat card.
  ctx.fillStyle = FENCE_POST;
  ctx.fillRect(x - hw, top + capD, w, hTot - capD);
  ctx.fillStyle = shade(FENCE_POST, 12);
  ctx.fillRect(x - hw, top + capD, s * 0.03, hTot - capD);
  ctx.fillStyle = shade(FENCE_POST, -14);
  ctx.fillRect(x + hw - s * 0.03, top + capD, s * 0.03, hTot - capD);
  // The cap: tilted bird's-eye top plane.
  ctx.fillStyle = shade(FENCE_POST, 24);
  ctx.fillRect(x - hw, top, w, capD);
  ctx.fillStyle = shade(FENCE_POST, 2);
  ctx.fillRect(x - hw, top, w, s * 0.018);
  ctx.fillStyle = shade(FENCE_POST, 38);
  ctx.fillRect(x - hw, top + capD - s * 0.016, w, s * 0.016);
  if (rend.outlineOn) {
    rend.beginStructOutline();
    ctx.strokeRect(x - hw, top, w, hTot);
  }
}

/**
 * THE FENCE REBUILD — post-and-rail stock fencing in the game's
 * 2.5D dialect. One capped post per tile; two rails with REAL board
 * thickness (a lit top plane over a front face) reach half a tile
 * toward every fence-family neighbour, so a run reads as one
 * carpentered line. N-S runs are the honest edge-on projection:
 * each rail shows only its top plane, a narrow strip marching
 * up-screen — the sunlit upper strip overlays the shaded lower one,
 * and the two-board step surfaces only where a run dies south into
 * a post (never mid-run: the south neighbour repaints it). 45°
 * tiles stride corner-to-corner with sheared boards; straight tiles
 * grow a matching stub toward any 45° neighbour whose line points
 * back at them, so turns are continuous rail, not butted ends.
 * Every mass strokes its own structural outline live (the wall law:
 * exposed edges only, shared edges never) — estate-length runs ring
 * seamlessly with no bake cap, and the post, drawn last, covers
 * every joint.
 */
export function fenceItem(rend: PaintHost, tile: Tile, tx: number, ty: number, game: ClientGame): DrawItem {
  const ds = rend.camera.depthScale(ty + 0.5); // Epic B (FW): billboard foreshortens by tile depth; ds=1 at q=0 → byte-identical
  const s = rend.camera.scale * ds;
  const syT = s * rend.camera.yScale;
  const p = rend.camera.worldToScreen(tx + 0.5, ty + 0.5, rend.w, rend.h);
  p.y -= game.world.elevAt(tx, ty) * ELEV_H * s;
  // A prop on the porch stands ON the boards (the carried-deck
  // rule): its whole painter rides the same lift the feet do.
  if (rend.porchAt(game, tx, ty)) p.y -= DOCK_LIFT * s;
  const h = hashCoords(41, tx, ty);
  const baseY = p.y + syT * 0.14;
  const straight = tile === Tile.Fence;
  const gAt = (dx: number, dy: number) => game.world.groundAt(tx + dx, ty + dy);
  const cn = straight && fenceish(rend, game, tx, ty - 1);
  const ce = straight && fenceish(rend, game, tx + 1, ty);
  const cs = straight && fenceish(rend, game, tx, ty + 1);
  const cw = straight && fenceish(rend, game, tx - 1, ty);
  // Diagonal joins: a 45° tile joins any fence-family diagonal on
  // its own line; a straight tile only stubs toward a 45° tile
  // whose rail line points back at this post.
  const dNE =
    tile === Tile.FenceDiagNE
      ? fenceish(rend, game, tx + 1, ty - 1)
      : straight && gAt(1, -1) === Tile.FenceDiagNE;
  const dSW =
    tile === Tile.FenceDiagNE
      ? fenceish(rend, game, tx - 1, ty + 1)
      : straight && gAt(-1, 1) === Tile.FenceDiagNE;
  const dNW =
    tile === Tile.FenceDiagNW
      ? fenceish(rend, game, tx - 1, ty - 1)
      : straight && gAt(-1, -1) === Tile.FenceDiagNW;
  const dSE =
    tile === Tile.FenceDiagNW
      ? fenceish(rend, game, tx + 1, ty + 1)
      : straight && gAt(1, 1) === Tile.FenceDiagNW;
  const any = cn || ce || cs || cw || dNE || dSW || dNW || dSE;
  // An isolated piece still shows its build: a straight post keeps
  // a full rail panel, a 45° turn its full diagonal stride.
  const isoEW = straight && !any;
  const isoNE = tile === Tile.FenceDiagNE && !any;
  const isoNW = tile === Tile.FenceDiagNW && !any;
  // Rail metrics as tile fractions: silhouette top of the lit plane
  // for the upper/lower board, plane depth, and board-face height.
  const RT = 0.75;
  const RB = 0.45;
  const PLANE = 0.05;
  const FACE = 0.11;
  const THICK = (PLANE + FACE) * s;
  const xw = cw || isoEW ? p.x - s * 0.5 : p.x;
  const xe = ce || isoEW ? p.x + s * 0.5 : p.x;
  return {
    sortY: ty + 0.8,
    drawShadow: () => {
      // The rails' cast line follows every connected direction; the
      // post always drops its own short anchor line.
      if (cw || ce || isoEW) rend.castEdgeQuad(xw, baseY, xe, baseY, 0.6);
      if (cn) rend.castEdgeQuad(p.x, baseY - syT * 0.5, p.x, baseY, 0.6);
      if (cs) rend.castEdgeQuad(p.x, baseY, p.x, baseY + syT * 0.5, 0.6);
      if (dNE || isoNE) rend.castEdgeQuad(p.x, baseY, p.x + s * 0.5, baseY - syT * 0.5, 0.6);
      if (dSW || isoNE) rend.castEdgeQuad(p.x - s * 0.5, baseY + syT * 0.5, p.x, baseY, 0.6);
      if (dNW || isoNW) rend.castEdgeQuad(p.x - s * 0.5, baseY - syT * 0.5, p.x, baseY, 0.6);
      if (dSE || isoNW) rend.castEdgeQuad(p.x, baseY, p.x + s * 0.5, baseY + syT * 0.5, 0.6);
      rend.castEdgeQuad(p.x - s * 0.085, baseY, p.x + s * 0.085, baseY, 0.85);
    },
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;

      // E-W boards: lit top plane over a front face, an under-edge
      // shadow seating each board. End grain only at exposed ends
      // (isolated panels) — run ends die into posts.
      const railEW = () => {
        for (const T of [RB, RT]) {
          const yPlane = baseY - T * s;
          const yFace = yPlane + PLANE * s;
          const yBot = yFace + FACE * s;
          ctx.fillStyle = shade(FENCE_RAIL, 20);
          ctx.fillRect(xw, yPlane, xe - xw, PLANE * s);
          ctx.fillStyle = T === RT ? FENCE_RAIL : shade(FENCE_RAIL, -6);
          ctx.fillRect(xw, yFace, xe - xw, FACE * s);
          ctx.fillStyle = shade(FENCE_RAIL, -20);
          ctx.fillRect(xw, yBot - s * 0.02, xe - xw, s * 0.02);
          if (isoEW) {
            ctx.fillStyle = shade(FENCE_RAIL, -16);
            ctx.fillRect(xw, yPlane, s * 0.03, yBot - yPlane);
            ctx.fillRect(xe - s * 0.03, yPlane, s * 0.03, yBot - yPlane);
          }
          if (rend.outlineOn) {
            rend.beginStructOutline();
            ctx.beginPath();
            ctx.moveTo(xw, yPlane);
            ctx.lineTo(xe, yPlane);
            ctx.moveTo(xw, yBot);
            ctx.lineTo(xe, yBot);
            if (isoEW) {
              ctx.moveTo(xw, yPlane);
              ctx.lineTo(xw, yBot);
              ctx.moveTo(xe, yPlane);
              ctx.lineTo(xe, yBot);
            }
            ctx.stroke();
          }
        }
        // A rare knot keeps long runs hand-made (mid-span only —
        // edges must stay identical across tiles).
        if (((h >> 6) & 7) === 1 && xe - xw > s * 0.6) {
          ctx.fillStyle = shade(FENCE_RAIL, -24);
          ctx.beginPath();
          ctx.ellipse(
            p.x + (((h >> 9) & 15) / 15 - 0.5) * s * 0.5,
            baseY - (RT - PLANE - 0.05) * s,
            s * 0.022,
            s * 0.016,
            0,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
      };

      // N-S half-strips: the two rails' top planes, edge-on.
      const railNS = (yN: number, yS: number) => {
        const hw2 = s * 0.05;
        ctx.fillStyle = shade(FENCE_RAIL, -12);
        ctx.fillRect(p.x - hw2, yN - RB * s, hw2 * 2, yS - yN + THICK);
        ctx.fillStyle = shade(FENCE_RAIL, 14);
        ctx.fillRect(p.x - hw2, yN - RT * s, hw2 * 2, yS - yN + THICK);
        ctx.fillStyle = shade(FENCE_RAIL, 30);
        ctx.fillRect(p.x - hw2, yN - RT * s, s * 0.016, yS - yN + THICK);
        if (rend.outlineOn) {
          // Verticals only: both strip ends always die under posts.
          rend.beginStructOutline();
          ctx.beginPath();
          ctx.moveTo(p.x - hw2, yN - RT * s);
          ctx.lineTo(p.x - hw2, yS - RB * s + THICK);
          ctx.moveTo(p.x + hw2, yN - RT * s);
          ctx.lineTo(p.x + hw2, yS - RB * s + THICK);
          ctx.stroke();
        }
      };

      // 45° half-strides: sheared boards, corner-overlapped a hair
      // when a partner continues (no antialias hairline at joins),
      // end-grain capped when the stride ends mid-air.
      const railDiag = (dx: number, dy: number, joined: boolean) => {
        const k = joined ? 1.04 : 1;
        const x1 = p.x + dx * k;
        const y1b = baseY + dy * k;
        for (const T of [RB, RT]) {
          const y0 = baseY - T * s;
          const y1 = y1b - T * s;
          const quad = (a: number, b: number, fill: string) => {
            ctx.fillStyle = fill;
            ctx.beginPath();
            ctx.moveTo(p.x, y0 + a);
            ctx.lineTo(x1, y1 + a);
            ctx.lineTo(x1, y1 + b);
            ctx.lineTo(p.x, y0 + b);
            ctx.closePath();
            ctx.fill();
          };
          quad(0, PLANE * s, shade(FENCE_RAIL, 20));
          quad(PLANE * s, THICK, T === RT ? FENCE_RAIL : shade(FENCE_RAIL, -6));
          quad(THICK - s * 0.02, THICK, shade(FENCE_RAIL, -20));
          if (!joined) {
            ctx.fillStyle = shade(FENCE_RAIL, -16);
            ctx.fillRect(x1 - (dx > 0 ? s * 0.03 : 0), y1, s * 0.03, THICK);
          }
          if (rend.outlineOn) {
            rend.beginStructOutline();
            ctx.beginPath();
            ctx.moveTo(p.x, y0);
            ctx.lineTo(x1, y1);
            ctx.moveTo(p.x, y0 + THICK);
            ctx.lineTo(x1, y1 + THICK);
            if (!joined) {
              ctx.moveTo(x1, y1);
              ctx.lineTo(x1, y1 + THICK);
            }
            ctx.stroke();
          }
        }
      };

      // Back-to-front: up-screen masses, the E-W panel, the post
      // (covering every joint), then down-screen masses.
      if (cn) railNS(baseY - syT * 0.5, baseY);
      if (dNE || isoNE) railDiag(s * 0.5, -syT * 0.5, dNE);
      if (dNW || isoNW) railDiag(-s * 0.5, -syT * 0.5, dNW);
      if (cw || ce || isoEW) railEW();
      drawFencePost(rend, p.x, baseY, s * 0.17, s * 0.92);
      if (cs) railNS(baseY, baseY + syT * 0.5);
      if (dSW || isoNE) railDiag(-s * 0.5, syT * 0.5, dSW);
      if (dSE || isoNW) railDiag(s * 0.5, syT * 0.5, dSE);
    },
  };
}

/**
 * THE FENCE GATE — a waist-high five-bar field gate hung between
 * two stout capped hinge posts, riding the door law wholesale (the
 * tile is the state; doorOpenness eases the swing, a locked rattle
 * shudders it). E-W gates swing the leaf flat against the west
 * hinge (the door-leaf law: width compresses toward the hinge,
 * edge-on shade deepens, detail collapses to a slab). N-S gates
 * read edge-on when shut — a framed strip barring the gap — and
 * throw ONE leaf front-on into the east column when open (the
 * side-door law: never a pair).
 */
export function fenceGateItem(rend: PaintHost, tile: Tile, tx: number, ty: number, game: ClientGame): DrawItem {
  const ds = rend.camera.depthScale(ty + 0.5); // Epic B (FW): billboard foreshortens by tile depth; ds=1 at q=0 → byte-identical
  const s = rend.camera.scale * ds;
  const syT = s * rend.camera.yScale;
  const p = rend.camera.worldToScreen(tx + 0.5, ty + 0.5, rend.w, rend.h);
  p.y -= game.world.elevAt(tx, ty) * ELEV_H * s;
  const baseY = p.y + syT * 0.14;
  const open = doorInfo(tile)!.open;
  const IRON = '#3a3444';
  // Orientation follows the fence line the gate is hung in.
  const vertical =
    (fenceish(rend, game, tx, ty - 1) || fenceish(rend, game, tx, ty + 1)) &&
    !(fenceish(rend, game, tx + 1, ty) || fenceish(rend, game, tx - 1, ty));
  return {
    sortY: ty + (vertical ? 0.75 : 0.8),
    drawShadow: () => {
      if (vertical) rend.castEdgeQuad(p.x, baseY - syT * 0.5, p.x, baseY + syT * 0.5, 0.7);
      else rend.castEdgeQuad(p.x - s * 0.5, baseY, p.x + s * 0.5, baseY, 0.7);
    },
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      const o = Math.min(1, rend.doorOpenness(tx, ty, open));
      const shakeX = rend.doorShakeAt(tx, ty) * s * 0.03;
      if (shakeX !== 0) {
        ctx.save();
        ctx.translate(shakeX, 0);
      }

      // The leaf, shared by both hangs: five-bar frame with real
      // daylight between the bars, the signature Z-brace, iron
      // straps at the heel and a latch tongue at the head. `dim`
      // deepens as the swing turns the boards edge-on.
      const drawLeaf = (hx: number, X: number, base: number, dim: number) => {
        const w2 = X - hx;
        if (w2 < s * 0.05) return;
        const yTop = base - 0.72 * s;
        const yBot = base - 0.1 * s;
        const rc = (k: number) => shade(FENCE_RAIL, k + dim);
        if (w2 < s * 0.32) {
          // Edge-on: detail collapses to one turned slab.
          ctx.fillStyle = rc(-10);
          ctx.fillRect(hx, yTop, w2, yBot - yTop);
          if (rend.outlineOn) {
            rend.beginStructOutline();
            ctx.strokeRect(hx, yTop, w2, yBot - yTop);
          }
          return;
        }
        const stW = 0.09 * s;
        // Bars first — they tenon INTO the stiles. Top bar heavy,
        // boot bar flush with the stile feet so the silhouette (and
        // its ring) closes as one honest rectangle.
        const bars: ReadonlyArray<readonly [number, number, number]> = [
          [yTop, 0.1 * s, 14],
          [base - 0.5 * s, 0.06 * s, 4],
          [base - 0.335 * s, 0.06 * s, -4],
          [yBot - 0.055 * s, 0.055 * s, -10],
        ];
        for (const [by, bh, tone] of bars) {
          ctx.fillStyle = rc(tone);
          ctx.fillRect(hx, by, w2, bh);
          ctx.fillStyle = rc(tone + 16);
          ctx.fillRect(hx, by, w2, s * 0.02);
        }
        // THE Z-BRACE: heel-bottom to head-top, the field-gate
        // signature, riding proud of the bars.
        ctx.fillStyle = rc(-20);
        ctx.beginPath();
        ctx.moveTo(hx + stW, yBot - 0.12 * s);
        ctx.lineTo(X - stW, yTop + 0.06 * s);
        ctx.lineTo(X - stW, yTop + 0.13 * s);
        ctx.lineTo(hx + stW, yBot - 0.05 * s);
        ctx.closePath();
        ctx.fill();
        // Stiles cap the bar ends; lit west arris + top plane each.
        for (const sx of [hx, X - stW]) {
          ctx.fillStyle = rc(0);
          ctx.fillRect(sx, yTop, stW, yBot - yTop);
          ctx.fillStyle = rc(14);
          ctx.fillRect(sx, yTop, s * 0.022, yBot - yTop);
          ctx.fillStyle = rc(28);
          ctx.fillRect(sx, yTop, stW, s * 0.035);
        }
        // Ironmongery: hinge straps reach in from the heel, the
        // latch tongue waits at the head.
        ctx.fillStyle = IRON;
        ctx.fillRect(hx - 0.02 * s, yTop + 0.035 * s, 0.2 * s, 0.045 * s);
        ctx.fillRect(hx - 0.02 * s, yBot - 0.1 * s, 0.2 * s, 0.045 * s);
        ctx.fillRect(X - 0.045 * s, base - 0.47 * s, 0.09 * s, 0.05 * s);
        ctx.fillStyle = '#565064';
        ctx.fillRect(hx - 0.02 * s, yTop + 0.035 * s, 0.2 * s, 0.014 * s);
        if (rend.outlineOn) {
          rend.beginStructOutline();
          ctx.strokeRect(hx, yTop, w2, yBot - yTop);
        }
      };

      if (!vertical) {
        const hx = p.x - 0.4 * s;
        const X0 = p.x + 0.4 * s;
        drawLeaf(hx, hx + (X0 - hx) * (1 - o * 0.93), baseY, Math.round(-24 * o));
        drawFencePost(rend, p.x - 0.5 * s, baseY, s * 0.19, s * 0.98);
        drawFencePost(rend, p.x + 0.5 * s, baseY, s * 0.19, s * 0.98);
      } else {
        const yN = baseY - syT * 0.5;
        const yS = baseY + syT * 0.5;
        drawFencePost(rend, p.x, yN, s * 0.19, s * 0.98);
        if (o < 0.98) {
          // Shut: the leaf edge-on, a framed strip barring the gap.
          // Slit shadows hint the daylight between the bars; the
          // strip retracts toward its north hinge as it swings.
          const hw2 = 0.06 * s;
          const top = yN - 0.72 * s;
          const bot = top + (yS - 0.1 * s - top) * (1 - o);
          ctx.fillStyle = shade(FENCE_RAIL, -2);
          ctx.fillRect(p.x - hw2, top, hw2 * 2, bot - top);
          ctx.fillStyle = shade(FENCE_RAIL, 22);
          ctx.fillRect(p.x - hw2, top, s * 0.02, bot - top);
          if (o < 0.35) {
            ctx.fillStyle = 'rgba(20, 14, 26, 0.3)';
            for (const fy of [0.3, 0.52, 0.74]) {
              ctx.fillRect(p.x - hw2, top + (bot - top) * fy, hw2 * 2, s * 0.02);
            }
            ctx.fillStyle = IRON;
            ctx.fillRect(p.x - hw2 - 0.01 * s, top + 0.06 * s, hw2 * 2 + 0.02 * s, 0.045 * s);
            ctx.fillRect(p.x + hw2 - 0.008 * s, bot - 0.34 * s, 0.065 * s, 0.05 * s);
          }
          if (rend.outlineOn) {
            rend.beginStructOutline();
            ctx.strokeRect(p.x - hw2, top, hw2 * 2, bot - top);
          }
        }
        if (o > 0.02) {
          // Open: ONE leaf thrown front-on into the east column,
          // hung from the north post — never a pair.
          const oo = Math.sin((o * Math.PI) / 2);
          drawLeaf(p.x + 0.06 * s, p.x + 0.06 * s + 0.86 * s * oo, yN, 0);
        }
        drawFencePost(rend, p.x, yS, s * 0.19, s * 0.98);
      }
      if (shakeX !== 0) ctx.restore();
    },
  };
}

/**
 * ONE GIANT CARVED LOG — the unit the whole wall is built from. A
 * quarter-tile round hewn from a whole trunk: four value bands roll
 * the cylinder (FLAT FORGE — planes, never strokes), one or two
 * axe-notch carvings bite the face, and the crown is a big two-facet
 * chisel cut with an undercut shadow seating it on the body. Each
 * log wears its OWN brand ring — a palisade is a row of monuments,
 * not a fence panel — and overlapping logs occlude each other's ink
 * honestly because fill and ink land together, log by log.
 */
export function giantLog(rend: PaintHost, 
  x: number,
  baseY: number,
  w: number,
  shoulder: number,
  seed: number,
  ink: boolean,
  ds = 1,
): void {
  const ctx = rend.ctx;
  const s = rend.camera.scale * ds; // Epic B (FW): spike/detail recede with the trunk
  const tone = ((seed >> 2) & 7) - 4;
  const apexX = x + w * (0.42 + ((seed >> 5) & 7) * 0.02);
  const spikeH = s * (0.24 + ((seed >> 8) & 3) * 0.035);
  const apexY = shoulder - spikeH;
  // THE ROUND: four bands turn the trunk. West catches the light a
  // hair in from the edge — the highlight sits ON the curve.
  const bands: ReadonlyArray<readonly [number, number, number]> = [
    [0, 0.13, 5],
    [0.13, 0.4, 18],
    [0.4, 0.74, 0],
    [0.74, 1, -20],
  ];
  for (const [f0, f1, t] of bands) {
    ctx.fillStyle = shade(PALI_LOG, tone + t);
    ctx.fillRect(x + w * f0, shoulder - s * 0.01, w * (f1 - f0), baseY - shoulder + s * 0.01);
  }
  // THE CUT: two facets meet on the ridge — bright fresh axe work
  // west, the shadowed fall east; both READ at distance.
  ctx.fillStyle = shade(PALI_LOG, tone + 34);
  ctx.beginPath();
  ctx.moveTo(x, shoulder);
  ctx.lineTo(apexX, apexY);
  ctx.lineTo(apexX, shoulder);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = shade(PALI_LOG, tone - 10);
  ctx.beginPath();
  ctx.moveTo(apexX, apexY);
  ctx.lineTo(x + w, shoulder);
  ctx.lineTo(apexX, shoulder);
  ctx.closePath();
  ctx.fill();
  // The undercut: the point sits ON the trunk, not painted on it.
  ctx.fillStyle = shade(PALI_LOG, tone - 24);
  ctx.fillRect(x + w * 0.06, shoulder, w * 0.88, s * 0.024);
  // CARVED, NOT MILLED: axe notches bite the face — a dark chip
  // wedge with a sunlit lower lip.
  const notches = 1 + ((seed >> 10) & 1);
  for (let i = 0; i < notches; i++) {
    const nf = 0.3 + (((seed >> (11 + i * 3)) & 7) / 7) * 0.42;
    const ny = shoulder + (baseY - shoulder) * nf;
    const nx = x + w * 0.16;
    const nw = w * 0.55;
    ctx.fillStyle = shade(PALI_LOG, tone - 16);
    ctx.beginPath();
    ctx.moveTo(nx, ny);
    ctx.lineTo(nx + nw, ny + s * 0.008);
    ctx.lineTo(nx + nw * 0.82, ny + s * 0.036);
    ctx.lineTo(nx + nw * 0.12, ny + s * 0.03);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = shade(PALI_LOG, tone + 12);
    ctx.fillRect(nx + nw * 0.08, ny + s * 0.032, nw * 0.72, s * 0.014);
  }
  // The foot sinks into trampled ground.
  ctx.fillStyle = 'rgba(20, 14, 26, 0.28)';
  ctx.fillRect(x, baseY - s * 0.032, w, s * 0.032);
  if (ink && rend.outlineOn) {
    rend.beginStructOutline();
    ctx.beginPath();
    ctx.moveTo(x, baseY);
    ctx.lineTo(x, shoulder);
    ctx.lineTo(apexX, apexY);
    ctx.lineTo(x + w, shoulder);
    ctx.lineTo(x + w, baseY);
    ctx.stroke();
  }
}

/** Shoulder height for log k of a tile — big and uneven (1.3 to
 *  1.62 tiles over the 1.15-tile body: the wall MEANS it). */
export function logShoulder(rend: PaintHost, tx: number, ty: number, k: number): number {
  return 1.3 + ((hashCoords(43, tx * 8 + k, ty) >> 3) & 7) * 0.046;
}

/**
 * THE HEAVY LASH: a thick rope course bound across a span of logs —
 * dark wrap band, two lit strands, a shadowed wrap tick where it
 * rounds each log seam, and a knot with a dangling end at one
 * hash-picked log. Fill-only value work (the logs own the ink).
 */
export function palisadeRope(rend: PaintHost, 
  xw: number,
  xe: number,
  y: number,
  seams: readonly number[],
  knotSeed: number,
  ds = 1,
): void {
  const ctx = rend.ctx;
  const s = rend.camera.scale * ds; // Epic B (FW): recede with the logs it laces
  ctx.fillStyle = PALI_ROPE_DARK;
  ctx.fillRect(xw, y, xe - xw, s * 0.085);
  ctx.fillStyle = PALI_ROPE;
  ctx.fillRect(xw, y + s * 0.016, xe - xw, s * 0.02);
  ctx.fillRect(xw, y + s * 0.052, xe - xw, s * 0.016);
  ctx.fillStyle = 'rgba(24, 16, 30, 0.4)';
  for (const sx of seams) {
    ctx.fillRect(sx - s * 0.011, y, s * 0.022, s * 0.085);
  }
  if (seams.length > 0 && ((knotSeed >> 4) & 3) === 1) {
    const kx = seams[(knotSeed >> 6) % seams.length]!;
    ctx.fillStyle = PALI_ROPE;
    ctx.beginPath();
    facetCircle(ctx, kx, y + s * 0.042, s * 0.038, 5, 0.3, 0.8);
    ctx.fill();
    ctx.fillStyle = PALI_ROPE_DARK;
    ctx.fillRect(kx - s * 0.012, y + s * 0.07, s * 0.024, s * 0.09);
  }
}

/**
 * A GATE POST: the fattest log in the wall, with a rope hinge
 * collar and — on one side of every gate — the camp's skull staring
 * down the road.
 */
export function drawPalisadePost(rend: PaintHost, x: number, baseY: number, w: number, hTot: number, skull: boolean, ds = 1): void {
  const ctx = rend.ctx;
  const s = rend.camera.scale * ds; // Epic B (FW): recede with the gate it hangs on
  const hw = w / 2;
  const shoulder = baseY - hTot;
  ctx.fillStyle = 'rgba(18, 12, 26, 0.2)';
  ctx.beginPath();
  ctx.ellipse(x, baseY + s * 0.012, hw * 1.5, s * 0.05, 0, 0, Math.PI * 2);
  ctx.fill();
  giantLog(rend, x - hw, baseY, w, shoulder, hashCoords(61, Math.round(x), Math.round(baseY)), true, ds);
  // The rope hinge collar, doubled — a gate hangs real weight.
  ctx.fillStyle = PALI_ROPE_DARK;
  ctx.fillRect(x - hw - s * 0.014, baseY - hTot * 0.6, w + s * 0.028, s * 0.09);
  ctx.fillStyle = PALI_ROPE;
  ctx.fillRect(x - hw - s * 0.014, baseY - hTot * 0.6 + s * 0.02, w + s * 0.028, s * 0.022);
  ctx.fillRect(x - hw - s * 0.014, baseY - hTot * 0.6 + s * 0.056, w + s * 0.028, s * 0.018);
  if (skull) {
    const sy = baseY - hTot * 0.84;
    ctx.fillStyle = PALI_ROPE_DARK;
    ctx.fillRect(x - s * 0.012, sy - s * 0.17, s * 0.024, s * 0.1);
    ctx.fillStyle = PALI_BONE;
    ctx.beginPath();
    facetCircle(ctx, x, sy, s * 0.095, 7, 0.4, 0.8);
    ctx.fill();
    ctx.fillStyle = shade(PALI_BONE, -12);
    ctx.fillRect(x - s * 0.055, sy + s * 0.05, s * 0.11, s * 0.05);
    ctx.fillStyle = '#241a2e';
    ctx.fillRect(x - s * 0.058, sy - s * 0.022, s * 0.04, s * 0.04);
    ctx.fillRect(x + s * 0.018, sy - s * 0.022, s * 0.04, s * 0.04);
  }
}

/**
 * THE SPIKED WALL, rebuilt — GIANT CARVED LOGS, not a fence. Four
 * whole trunks to the tile (each its own monument: rolled value
 * bands, axe notches, a big two-facet point, its own black ring),
 * bound by heavy rope courses. Every direction speaks the same
 * vocabulary of STANDING logs:
 *  - E-W runs: logs shoulder to shoulder, widths hash-split so no
 *    two neighbors match, half-tile pitch so runs meet log-true.
 *  - N-S runs: logs MARCH UP-SCREEN in depth — each drawn whole,
 *    the next-south overlapping it, leaving a ridge of crowned
 *    points climbing the screen (never an extruded strip).
 *  - 45° strides: the same marching logs stepping corner-to-corner
 *    — vertical giants on a diagonal line, never sheared planks.
 * A fat junction log anchors every corner, tee, and run end.
 */
export function palisadeItem(rend: PaintHost, tile: Tile, tx: number, ty: number, game: ClientGame): DrawItem {
  const ds = rend.camera.depthScale(ty + 0.5); // Epic B (FW): billboard foreshortens by tile depth; ds=1 at q=0 → byte-identical
  const s = rend.camera.scale * ds;
  const syT = s * rend.camera.yScale;
  const p = rend.camera.worldToScreen(tx + 0.5, ty + 0.5, rend.w, rend.h);
  p.y -= game.world.elevAt(tx, ty) * ELEV_H * s;
  const h = hashCoords(41, tx, ty);
  const baseY = p.y + syT * 0.14;
  const straight = tile === Tile.Palisade;
  const gAt = (dx: number, dy: number) => game.world.groundAt(tx + dx, ty + dy);
  const cn = straight && palisadeish(rend, game, tx, ty - 1);
  const ce = straight && palisadeish(rend, game, tx + 1, ty);
  const cs = straight && palisadeish(rend, game, tx, ty + 1);
  const cw = straight && palisadeish(rend, game, tx - 1, ty);
  const dNE =
    tile === Tile.PalisadeDiagNE
      ? palisadeish(rend, game, tx + 1, ty - 1)
      : straight && gAt(1, -1) === Tile.PalisadeDiagNE;
  const dSW =
    tile === Tile.PalisadeDiagNE
      ? palisadeish(rend, game, tx - 1, ty + 1)
      : straight && gAt(-1, 1) === Tile.PalisadeDiagNE;
  const dNW =
    tile === Tile.PalisadeDiagNW
      ? palisadeish(rend, game, tx - 1, ty - 1)
      : straight && gAt(-1, -1) === Tile.PalisadeDiagNW;
  const dSE =
    tile === Tile.PalisadeDiagNW
      ? palisadeish(rend, game, tx + 1, ty + 1)
      : straight && gAt(1, 1) === Tile.PalisadeDiagNW;
  const anyDiag = dNE || dSW || dNW || dSE;
  const any = cn || ce || cs || cw || anyDiag;
  const isoEW = straight && !any;
  const isoNE = tile === Tile.PalisadeDiagNE && !any;
  const isoNW = tile === Tile.PalisadeDiagNW && !any;
  const xw = cw || isoEW ? p.x - s * 0.5 : p.x;
  const xe = ce || isoEW ? p.x + s * 0.5 : p.x;
  // A fat junction log anchors corners, tees, and run ends — a
  // through-run needs none (its courses are continuous).
  const dirCount =
    (cw ? 1 : 0) + (ce ? 1 : 0) + (cn ? 1 : 0) + (cs ? 1 : 0) + (anyDiag ? 1 : 0);
  const ewAny = cw || ce || isoEW;
  const nsAny = cn || cs;
  const ewThrough = cw && ce && !nsAny && !anyDiag;
  const nsThrough = cn && cs && !ewAny && !anyDiag;
  const needAnchor =
    (straight && !ewThrough && !nsThrough && !isoEW && dirCount > 0) || anyDiag || isoNE || isoNW;
  return {
    sortY: ty + 0.8,
    drawShadow: () => {
      if (ewAny) rend.castEdgeQuad(xw, baseY, xe, baseY, 0.95);
      if (cn) rend.castEdgeQuad(p.x, baseY - syT * 0.5, p.x, baseY, 0.95);
      if (cs) rend.castEdgeQuad(p.x, baseY, p.x, baseY + syT * 0.5, 0.95);
      if (dNE || isoNE) rend.castEdgeQuad(p.x, baseY, p.x + s * 0.5, baseY - syT * 0.5, 0.95);
      if (dSW || isoNE) rend.castEdgeQuad(p.x - s * 0.5, baseY + syT * 0.5, p.x, baseY, 0.95);
      if (dNW || isoNW) rend.castEdgeQuad(p.x - s * 0.5, baseY - syT * 0.5, p.x, baseY, 0.95);
      if (dSE || isoNW) rend.castEdgeQuad(p.x, baseY, p.x + s * 0.5, baseY + syT * 0.5, 0.95);
    },
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;

      // A marching log: one whole giant at a world offset from the
      // tile center — the vocabulary every non-E-W course speaks.
      const marchLog = (fx: number, fy: number, k: number) => {
        const seed = hashCoords(47, tx * 8 + k, ty * 8 + Math.round(fy * 8));
        const w = s * (0.24 + ((seed >> 3) & 3) * 0.014);
        const lx = p.x + fx * s - w / 2 + (((seed >> 6) & 3) - 1.5) * s * 0.012;
        const ly = baseY + fy * syT;
        const shoulder = ly - logShoulder(rend, tx, ty, k) * s;
        giantLog(rend, lx, ly, w, shoulder, seed, true, ds);
      };

      // The E-W course: four giants to the tile, widths hash-split
      // at each half so no two neighbors match, pitch locked to the
      // half-tile so runs join log-true at every seam.
      const courseEW = () => {
        const seams: number[] = [];
        const halves: Array<[number, number]> = [];
        if (xw < p.x) halves.push([p.x - s * 0.5, 0]);
        if (xe > p.x) halves.push([p.x, 1]);
        for (const [hx, hi] of halves) {
          const split = 0.42 + ((hashCoords(59, tx * 2 + hi, ty) >> 2) & 7) * 0.02;
          const w0 = s * 0.5 * split;
          const k0 = hi * 2;
          const sh0 = baseY - logShoulder(rend, tx, ty, k0) * s;
          const sh1 = baseY - logShoulder(rend, tx, ty, k0 + 1) * s;
          giantLog(rend, hx, baseY, w0, sh0, hashCoords(47, tx * 8 + k0, ty), true, ds);
          giantLog(rend, hx + w0, baseY, s * 0.5 - w0, sh1, hashCoords(47, tx * 8 + k0 + 1, ty), true, ds);
          seams.push(hx + w0);
          if (hi === 1 && xw < p.x) seams.push(p.x);
        }
        // THE HEAVY LASH: two thick rope courses bind the giants.
        palisadeRope(rend, xw, xe, baseY - s * 1.02, seams, h, ds);
        palisadeRope(rend, xw, xe, baseY - s * 0.52, seams, h >> 3, ds);
        // The trophy: one weathered skull lashed mid-run, sized to
        // be a WARNING, never a knot in the wood.
        if (((h >> 5) & 7) === 2 && xe - xw > s * 0.9) {
          const kx = p.x + (((h >> 8) & 1) ? -1 : 1) * s * 0.22;
          const ky = baseY - 0.86 * s;
          ctx.fillStyle = PALI_ROPE_DARK;
          ctx.fillRect(kx - s * 0.013, ky - s * 0.2, s * 0.026, s * 0.13);
          ctx.fillStyle = PALI_BONE;
          ctx.beginPath();
          facetCircle(ctx, kx, ky, s * 0.095, 7, 0.2, 0.8);
          ctx.fill();
          ctx.fillStyle = shade(PALI_BONE, -12);
          ctx.fillRect(kx - s * 0.056, ky + s * 0.052, s * 0.112, s * 0.05);
          ctx.fillStyle = '#241a2e';
          ctx.fillRect(kx - s * 0.058, ky - s * 0.022, s * 0.04, s * 0.04);
          ctx.fillRect(kx + s * 0.018, ky - s * 0.022, s * 0.04, s * 0.04);
        }
      };

      // N-S: the giants march up-screen in depth, STAGGERED into a
      // double row — dead-vertical stacking swallows every crown in
      // the ink of the log in front; the half-log sidestep lets
      // each point clear its neighbor and read as carved wood.
      const courseNS = (half: 'n' | 's') => {
        const fr = half === 'n' ? [-0.37, -0.13] : [0.13, 0.37];
        for (let i = 0; i < fr.length; i++) {
          const k = (half === 'n' ? 4 : 6) + i;
          marchLog(k % 2 === 0 ? -0.075 : 0.075, fr[i]!, k);
        }
      };

      // 45°: the same marching giants stepping corner-to-corner —
      // collected and depth-sorted so every overlap reads honestly.
      const diagLogs: Array<[number, number, number]> = [];
      const strideInto = (sx: number, sy: number, kBase: number) => {
        for (let i = 0; i < 2; i++) {
          const f = (i + 1) / 3;
          diagLogs.push([sx * f * 0.5, sy * f * 0.5, kBase + i]);
        }
      };

      if (dNE || isoNE) strideInto(1, -1, 8);
      if (dNW || isoNW) strideInto(-1, -1, 10);
      if (dSW || isoNE) strideInto(-1, 1, 12);
      if (dSE || isoNW) strideInto(1, 1, 14);
      diagLogs.sort((a, b) => a[1] - b[1]);

      // Back-to-front: north masses, the E-W wall, the junction
      // anchor, then south masses over its foot.
      if (cn) courseNS('n');
      for (const [fx, fy, k] of diagLogs) if (fy < 0) marchLog(fx, fy, k);
      if (needAnchor && !ewAny) {
        // A pure junction (diag corner, N-S end): the anchor IS the
        // course here — one extra-fat giant at the tile heart.
        const seed = hashCoords(53, tx, ty);
        const w = s * 0.3;
        giantLog(rend, p.x - w / 2, baseY, w, baseY - s * (1.42 + ((seed >> 4) & 3) * 0.04), seed, true, ds);
      }
      if (ewAny) {
        courseEW();
        if (needAnchor) {
          const seed = hashCoords(53, tx, ty);
          const w = s * 0.3;
          giantLog(rend, p.x - w / 2, baseY, w, baseY - s * (1.46 + ((seed >> 4) & 3) * 0.04), seed, true, ds);
        }
      }
      if (cs) courseNS('s');
      for (const [fx, fy, k] of diagLogs) if (fy >= 0) marchLog(fx, fy, k);
    },
  };
}

/**
 * THE GREAT GATE — the camp's one piece of architecture. Two
 * towering gate posts (the fattest logs in the wall, rope hinge
 * collars, the skull watching the road) carry a squared lintel beam
 * overhead: a true top plane for the bird's eye, three carved
 * spikes standing on it, lashed to the posts at both ends. Below
 * swing DOUBLE doors of lashed half-logs that meet at a rope-bound
 * center seam — open, each leaf folds flat against its own post.
 * N-S gates keep the posts-and-leaf grammar edge-on (a lintel seen
 * end-on is a sliver, so the vertical gate lets its posts carry the
 * height instead).
 */
export function palisadeGateItem(rend: PaintHost, tile: Tile, tx: number, ty: number, game: ClientGame): DrawItem {
  const ds = rend.camera.depthScale(ty + 0.5); // Epic B (FW): billboard foreshortens by tile depth; ds=1 at q=0 → byte-identical
  const s = rend.camera.scale * ds;
  const syT = s * rend.camera.yScale;
  const p = rend.camera.worldToScreen(tx + 0.5, ty + 0.5, rend.w, rend.h);
  p.y -= game.world.elevAt(tx, ty) * ELEV_H * s;
  const baseY = p.y + syT * 0.14;
  const open = doorInfo(tile)!.open;
  const h = hashCoords(41, tx, ty);
  const vertical =
    (palisadeish(rend, game, tx, ty - 1) || palisadeish(rend, game, tx, ty + 1)) &&
    !(palisadeish(rend, game, tx + 1, ty) || palisadeish(rend, game, tx - 1, ty));
  const POST_W = s * 0.3;
  const POST_H = s * 1.72;
  return {
    sortY: ty + (vertical ? 0.75 : 0.8),
    drawShadow: () => {
      if (vertical) rend.castEdgeQuad(p.x, baseY - syT * 0.5, p.x, baseY + syT * 0.5, 1.0);
      else rend.castEdgeQuad(p.x - s * 0.5, baseY, p.x + s * 0.5, baseY, 1.0);
    },
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      const o = Math.min(1, rend.doorOpenness(tx, ty, open));
      const shakeX = rend.doorShakeAt(tx, ty) * s * 0.03;
      if (shakeX !== 0) {
        ctx.save();
        ctx.translate(shakeX, 0);
      }

      // One door leaf: lashed half-logs on two rope-bound braces.
      // `hinge` is the x the leaf folds toward; `dir` +1 opens east.
      const drawLeaf = (hingeX: number, dir: number, width: number, dim: number) => {
        const w2 = width;
        if (w2 < s * 0.045) return;
        const x0 = dir > 0 ? hingeX : hingeX - w2;
        const yBot = baseY - 0.04 * s;
        const yTop = baseY - 1.12 * s;
        if (w2 < s * 0.3) {
          // Edge-on: the turned leaf collapses to a crowned slab.
          ctx.fillStyle = shade(PALI_LOG, -12 + dim);
          ctx.fillRect(x0, yTop, w2, yBot - yTop);
          ctx.fillStyle = shade(PALI_LOG, 14 + dim);
          ctx.beginPath();
          ctx.moveTo(x0, yTop);
          ctx.lineTo(x0 + w2 / 2, yTop - 0.1 * s);
          ctx.lineTo(x0 + w2, yTop);
          ctx.closePath();
          ctx.fill();
          if (rend.outlineOn) {
            rend.beginStructOutline();
            ctx.beginPath();
            ctx.moveTo(x0, yBot);
            ctx.lineTo(x0, yTop);
            ctx.lineTo(x0 + w2 / 2, yTop - 0.1 * s);
            ctx.lineTo(x0 + w2, yTop);
            ctx.lineTo(x0 + w2, yBot);
            ctx.stroke();
          }
          return;
        }
        const n = 3;
        const glw = w2 / n;
        const spike = s * 0.12;
        const shoulders: number[] = [];
        for (let i = 0; i < n; i++) {
          const gh = 0.9 + (((h >> (i * 3)) & 3) * 0.035);
          const sh = yBot - (yBot - yTop) * gh;
          shoulders.push(sh);
          const seed = hashCoords(67, tx * 4 + i, ty + dir);
          // Slimmer rounds than the wall — a door must read lighter
          // than the wall it pierces.
          const lx = x0 + i * glw;
          ctx.fillStyle = shade(PALI_LOG, ((seed >> 2) & 5) - 2 + dim);
          ctx.fillRect(lx, sh, glw, yBot - sh);
          ctx.fillStyle = shade(PALI_LOG, 14 + dim);
          ctx.fillRect(lx + glw * 0.12, sh, glw * 0.26, yBot - sh);
          ctx.fillStyle = shade(PALI_LOG, -16 + dim);
          ctx.fillRect(lx + glw * 0.78, sh, glw * 0.22, yBot - sh);
          const ax = lx + glw * 0.48;
          ctx.fillStyle = shade(PALI_LOG, 30 + dim);
          ctx.beginPath();
          ctx.moveTo(lx, sh);
          ctx.lineTo(ax, sh - spike);
          ctx.lineTo(ax, sh);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = shade(PALI_LOG, -8 + dim);
          ctx.beginPath();
          ctx.moveTo(ax, sh - spike);
          ctx.lineTo(lx + glw, sh);
          ctx.lineTo(ax, sh);
          ctx.closePath();
          ctx.fill();
        }
        // Two rope-bound cross-braces hold the leaf square.
        for (const by of [yBot - 0.78 * s, yBot - 0.26 * s]) {
          ctx.fillStyle = shade(PALI_LOG, -14 + dim);
          ctx.fillRect(x0 - 0.015 * s, by, w2 + 0.03 * s, 0.08 * s);
          ctx.fillStyle = shade(PALI_LOG, 2 + dim);
          ctx.fillRect(x0 - 0.015 * s, by, w2 + 0.03 * s, 0.024 * s);
          ctx.fillStyle = PALI_ROPE;
          const hx2 = dir > 0 ? x0 : x0 + w2 - 0.05 * s;
          ctx.fillRect(hx2, by - 0.012 * s, 0.05 * s, 0.104 * s);
        }
        if (rend.outlineOn) {
          // The leaf's TRUE silhouette: crowned head, plumb sides.
          rend.beginStructOutline();
          ctx.beginPath();
          ctx.moveTo(x0, yBot);
          ctx.lineTo(x0, shoulders[0]!);
          for (let i = 0; i < n; i++) {
            const lx = x0 + i * glw;
            ctx.lineTo(lx, shoulders[i]!);
            ctx.lineTo(lx + glw * 0.48, shoulders[i]! - spike);
            ctx.lineTo(lx + glw, shoulders[i]!);
          }
          ctx.lineTo(x0 + w2, yBot);
          ctx.stroke();
        }
      };

      if (!vertical) {
        const postL = p.x - 0.44 * s;
        const postR = p.x + 0.44 * s;
        // THE DOUBLE DOORS: each leaf folds toward its own post.
        const leafFull = 0.36 * s;
        const wNow = leafFull * (1 - o * 0.9);
        drawLeaf(postL + POST_W * 0.3, 1, wNow, Math.round(-22 * o));
        drawLeaf(postR - POST_W * 0.3, -1, wNow, Math.round(-22 * o));
        // The rope-bound center seam when the doors stand shut.
        if (o < 0.15) {
          ctx.fillStyle = PALI_ROPE_DARK;
          ctx.fillRect(p.x - s * 0.05, baseY - s * 0.72, s * 0.1, s * 0.14);
          ctx.fillStyle = PALI_ROPE;
          ctx.fillRect(p.x - s * 0.032, baseY - s * 0.69, s * 0.064, s * 0.08);
        }
        // The towering posts flank the opening.
        drawPalisadePost(rend, postL, baseY, POST_W, POST_H, ((h >> 4) & 1) === 1, ds);
        drawPalisadePost(rend, postR, baseY, POST_W, POST_H, ((h >> 4) & 1) === 0, ds);
        // THE LINTEL: a squared beam spanning overhead — dark front
        // face, a TRUE lit top plane for the bird's eye, lashed to
        // both post crowns, three carved spikes standing on it.
        const ly = baseY - POST_H - s * 0.12;
        const lx0 = postL - POST_W * 0.62;
        const lx1 = postR + POST_W * 0.62;
        const faceH = s * 0.13;
        const capD = 0.1 * syT;
        ctx.fillStyle = shade(PALI_LOG, -8);
        ctx.fillRect(lx0, ly, lx1 - lx0, faceH);
        ctx.fillStyle = shade(PALI_LOG, -22);
        ctx.fillRect(lx0, ly + faceH - s * 0.024, lx1 - lx0, s * 0.024);
        ctx.fillStyle = shade(PALI_LOG, 20);
        ctx.fillRect(lx0, ly - capD, lx1 - lx0, capD);
        ctx.fillStyle = shade(PALI_LOG, 34);
        ctx.fillRect(lx0, ly - capD, lx1 - lx0, s * 0.016);
        // End grain shows at both beam ends.
        ctx.fillStyle = shade(PALI_LOG, 12);
        ctx.fillRect(lx0, ly - capD, s * 0.03, faceH + capD);
        ctx.fillRect(lx1 - s * 0.03, ly - capD, s * 0.03, faceH + capD);
        // The lashings marry beam to posts.
        ctx.fillStyle = PALI_ROPE_DARK;
        ctx.fillRect(postL - s * 0.055, ly - capD - s * 0.01, s * 0.11, faceH + capD + s * 0.02);
        ctx.fillRect(postR - s * 0.055, ly - capD - s * 0.01, s * 0.11, faceH + capD + s * 0.02);
        ctx.fillStyle = PALI_ROPE;
        ctx.fillRect(postL - s * 0.055, ly - capD + s * 0.02, s * 0.11, s * 0.018);
        ctx.fillRect(postR - s * 0.055, ly - capD + s * 0.02, s * 0.11, s * 0.018);
        // Three carved spikes stand ON the beam's top plane.
        for (const [fx, hgt] of [
          [0.5, 0.24],
          [0.28, 0.17],
          [0.72, 0.18],
        ] as const) {
          const sx2 = lx0 + (lx1 - lx0) * fx;
          const sw2 = s * 0.075;
          const sb = ly - capD + s * 0.008;
          ctx.fillStyle = shade(PALI_LOG, 2);
          ctx.fillRect(sx2 - sw2 / 2, sb - hgt * s * 0.62, sw2, hgt * s * 0.62);
          ctx.fillStyle = shade(PALI_LOG, 30);
          ctx.beginPath();
          ctx.moveTo(sx2 - sw2 / 2, sb - hgt * s * 0.62);
          ctx.lineTo(sx2, sb - hgt * s);
          ctx.lineTo(sx2, sb - hgt * s * 0.62);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = shade(PALI_LOG, -12);
          ctx.beginPath();
          ctx.moveTo(sx2, sb - hgt * s);
          ctx.lineTo(sx2 + sw2 / 2, sb - hgt * s * 0.62);
          ctx.lineTo(sx2, sb - hgt * s * 0.62);
          ctx.closePath();
          ctx.fill();
        }
        if (rend.outlineOn) {
          // The arch's ink: one selective ring — beam ends, top
          // line broken by the standing spikes, underside always.
          rend.beginStructOutline();
          ctx.beginPath();
          ctx.moveTo(lx0, ly + faceH);
          ctx.lineTo(lx0, ly - capD);
          ctx.lineTo(lx1, ly - capD);
          ctx.moveTo(lx1, ly - capD);
          ctx.lineTo(lx1, ly + faceH);
          ctx.moveTo(lx0, ly + faceH);
          ctx.lineTo(lx1, ly + faceH);
          for (const [fx, hgt] of [
            [0.5, 0.24],
            [0.28, 0.17],
            [0.72, 0.18],
          ] as const) {
            const sx2 = lx0 + (lx1 - lx0) * fx;
            const sw2 = s * 0.075;
            const sb = ly - capD + s * 0.008;
            ctx.moveTo(sx2 - sw2 / 2, sb);
            ctx.lineTo(sx2 - sw2 / 2, sb - hgt * s * 0.62);
            ctx.lineTo(sx2, sb - hgt * s);
            ctx.lineTo(sx2 + sw2 / 2, sb - hgt * s * 0.62);
            ctx.lineTo(sx2 + sw2 / 2, sb);
          }
          ctx.stroke();
        }
      } else {
        const yN = baseY - syT * 0.5;
        const yS = baseY + syT * 0.5;
        drawPalisadePost(rend, p.x, yN, POST_W, POST_H, ((h >> 4) & 1) === 1, ds);
        if (o < 0.98) {
          // Shut: the leaf edge-on, a crowned strip barring the
          // gap, retracting toward its north hinge as it swings.
          const hw2 = 0.075 * s;
          const top = yN - 1.12 * s;
          const bot = top + (yS - 0.04 * s - top) * (1 - o);
          ctx.fillStyle = shade(PALI_LOG, -8);
          ctx.fillRect(p.x - hw2, top, hw2 * 2, bot - top);
          ctx.fillStyle = shade(PALI_LOG, 14);
          ctx.fillRect(p.x - hw2, top, s * 0.026, bot - top);
          if (o < 0.35) {
            ctx.fillStyle = 'rgba(20, 14, 26, 0.3)';
            for (const fy of [0.3, 0.55, 0.8]) {
              ctx.fillRect(p.x - hw2, top + (bot - top) * fy, hw2 * 2, s * 0.02);
            }
            ctx.fillStyle = PALI_ROPE;
            ctx.fillRect(p.x - hw2 - 0.008 * s, top + 0.1 * s, hw2 * 2 + 0.016 * s, 0.04 * s);
          }
          if (rend.outlineOn) {
            rend.beginStructOutline();
            ctx.strokeRect(p.x - hw2, top, hw2 * 2, bot - top);
          }
        }
        if (o > 0.02) {
          const oo = Math.sin((o * Math.PI) / 2);
          drawLeaf(p.x + 0.08 * s, 1, 0.72 * s * oo, 0);
        }
        drawPalisadePost(rend, p.x, yS, POST_W, POST_H, false, ds);
      }
      if (shakeX !== 0) ctx.restore();
    },
  };
}

/**
 * ONE WROUGHT BAR — the unit the whole railing is forged from. A
 * slim square bar, blue-black (this iron drinks the light), one
 * cool lit arris down the west edge, crowned by a two-facet spear
 * leaf above the top rail. The smith's work was true; the years
 * were not: a rare bar stands bent at the shoulder, and a rarer
 * one is gone at the root with only a rust bloom to say so. The
 * gaps are the POINT — a graveyard rail is drawn so the eye passes
 * between the bars and finds the stones it keeps.
 */
export function ironBar(rend: PaintHost, 
  x: number,
  footY: number,
  tipY: number,
  seed: number,
  dim: number,
  ds = 1,
): void {
  const ctx = rend.ctx;
  const s = rend.camera.scale * ds; // Epic B (FW): the bar's spearhead recedes with the run
  const bw = s * 0.036;
  const spearH = s * 0.2;
  const spearW = s * 0.075;
  const shoulder = tipY + spearH;
  // The gone bar: a snapped stub at the curb, rust weeping from it.
  if ((seed & 127) === 9) {
    ctx.fillStyle = shade(IRON_DARK, dim);
    ctx.fillRect(x - bw / 2, footY - s * 0.09, bw, s * 0.09);
    ctx.fillStyle = IRON_RUST;
    ctx.fillRect(x - bw * 0.7, footY - s * 0.035, bw * 1.4, s * 0.035);
    return;
  }
  // The bent bar leans from a wound at the shoulder — the shaft
  // breaks into two honest segments, never a curve painted on.
  const bent = (seed & 63) === 21;
  const lean = bent ? (((seed >> 6) & 1) ? 1 : -1) * s * 0.055 : 0;
  const elbowY = footY - (footY - shoulder) * 0.62;
  ctx.fillStyle = shade(IRON_MID, dim);
  if (bent) {
    ctx.beginPath();
    ctx.moveTo(x - bw / 2, footY);
    ctx.lineTo(x - bw / 2, elbowY);
    ctx.lineTo(x + lean - bw / 2, shoulder);
    ctx.lineTo(x + lean + bw / 2, shoulder);
    ctx.lineTo(x + bw / 2, elbowY);
    ctx.lineTo(x + bw / 2, footY);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillRect(x - bw / 2, shoulder, bw, footY - shoulder);
  }
  // The one moonlit arris — a thread, not a stripe.
  ctx.fillStyle = shade(IRON_LIT, dim);
  ctx.fillRect(x - bw / 2, bent ? elbowY : shoulder, Math.max(1, bw * 0.3), footY - (bent ? elbowY : shoulder));
  // THE SPEAR LEAF: two facets meeting on a ridge — lit west, the
  // shadowed fall east — with a waist collar seating it on the bar.
  const sx = x + lean;
  ctx.fillStyle = shade(IRON_MID, dim + 10);
  ctx.beginPath();
  ctx.moveTo(sx - spearW / 2, shoulder - spearH * 0.34);
  ctx.lineTo(sx, tipY);
  ctx.lineTo(sx, shoulder);
  ctx.lineTo(sx - spearW / 2, shoulder - spearH * 0.12);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = shade(IRON_DARK, dim);
  ctx.beginPath();
  ctx.moveTo(sx, tipY);
  ctx.lineTo(sx + spearW / 2, shoulder - spearH * 0.34);
  ctx.lineTo(sx + spearW / 2, shoulder - spearH * 0.12);
  ctx.lineTo(sx, shoulder);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = shade(IRON_DARK, dim);
  ctx.fillRect(sx - bw * 0.9, shoulder - s * 0.012, bw * 1.8, s * 0.024);
  // Rust blooms where some bars meet the stone.
  if ((seed & 31) === 5) {
    ctx.fillStyle = IRON_RUST;
    ctx.fillRect(x - bw * 0.8, footY - s * 0.05, bw * 1.6, s * 0.05);
  }
}

/**
 * THE CURB — the granite course the railing is leaded into. A low
 * coursed-stone footing with a TRUE foreshortened top plane (the
 * bird's eye sees stone, never a paint stripe), joint ticks on the
 * half-tile, and the yard's damp green creeping up the shaded
 * spots. Every run stands on this; iron never touches soil.
 */
export function ironCurbEW(rend: PaintHost, xw: number, xe: number, baseY: number, tx: number, ty: number): void {
  const ctx = rend.ctx;
  const s = rend.camera.scale * rend.camera.depthScale(ty + 0.5); // Epic B (FW)
  const syT = s * rend.camera.yScale;
  const faceH = s * 0.15;
  const capD = syT * 0.09;
  // Contact shade pools at the foot.
  ctx.fillStyle = 'rgba(12, 8, 20, 0.26)';
  ctx.fillRect(xw - s * 0.02, baseY - s * 0.012, xe - xw + s * 0.04, s * 0.05);
  // The south face, a step darker than the cap it carries.
  ctx.fillStyle = shade(GY_STONE, -14);
  ctx.fillRect(xw, baseY - faceH, xe - xw, faceH);
  ctx.fillStyle = 'rgba(18, 12, 26, 0.28)';
  ctx.fillRect(xw, baseY - s * 0.045, xe - xw, s * 0.045);
  // The lit top plane, far edge shaded (the crate-lid treatment).
  ctx.fillStyle = GY_STONE_LIT;
  ctx.fillRect(xw, baseY - faceH - capD, xe - xw, capD);
  ctx.fillStyle = shade(GY_STONE_LIT, -16);
  ctx.fillRect(xw, baseY - faceH - capD, xe - xw, Math.max(1, s * 0.02));
  // Joint ticks on the half-tile pitch; a mason laid this in blocks.
  ctx.fillStyle = 'rgba(24, 18, 34, 0.4)';
  for (let jx = Math.ceil((xw - s * 0.001) / (s * 0.5)) * s * 0.5; jx < xe; jx += s * 0.5) {
    ctx.fillRect(jx - Math.max(0.5, s * 0.01), baseY - faceH - capD, Math.max(1, s * 0.02), faceH + capD);
  }
  // Moss takes the shaded joints, hash-dealt, never everywhere.
  const h = hashCoords(151, tx, ty);
  if ((h & 7) < 3) {
    const mx = xw + (xe - xw) * (0.2 + ((h >> 3) & 7) * 0.08);
    ctx.fillStyle = GY_MOSS;
    ctx.beginPath();
    facetBlob(ctx, mx, baseY - s * 0.05, s * 0.06, h ^ 0x5c, 5, 0.7);
    ctx.fill();
  }
}

/**
 * A GRAVE PIER — the masonry that anchors every corner, tee, run
 * end, and gate. Stepped plinth, coursed granite shaft, a molded
 * cap with a TRUE top plane for the bird's eye, and a dark iron
 * finial standing on it: an urn on the piers that keep the yard,
 * an orb-and-spike on the piers that carry the gate.
 */
export function drawGravePier(rend: PaintHost, 
  x: number,
  baseY: number,
  w: number,
  hTot: number,
  finial: 'urn' | 'orb',
  ds = 1,
): void {
  const ctx = rend.ctx;
  const s = rend.camera.scale * ds; // Epic B (FW): the pier's finial recedes with the run
  const syT = s * rend.camera.yScale;
  const hw = w / 2;
  const capY = baseY - hTot;
  const seed = hashCoords(157, Math.round(x), Math.round(baseY));
  ctx.fillStyle = 'rgba(18, 12, 26, 0.22)';
  ctx.beginPath();
  ctx.ellipse(x, baseY + s * 0.012, hw * 1.7, s * 0.055, 0, 0, Math.PI * 2);
  ctx.fill();
  // The stepped plinth grips the ground.
  const plinthH = s * 0.16;
  ctx.fillStyle = shade(GY_STONE, -18);
  ctx.fillRect(x - hw * 1.24, baseY - plinthH, w * 1.24, plinthH);
  ctx.fillStyle = shade(GY_STONE_LIT, -6);
  ctx.fillRect(x - hw * 1.24, baseY - plinthH, w * 1.24, Math.max(1, s * 0.022));
  // The shaft: coursed granite, lit west band, shaded east band.
  ctx.fillStyle = GY_STONE;
  ctx.fillRect(x - hw, capY, w, baseY - plinthH - capY);
  ctx.fillStyle = shade(GY_STONE, 12);
  ctx.fillRect(x - hw, capY, w * 0.24, baseY - plinthH - capY);
  ctx.fillStyle = shade(GY_STONE, -16);
  ctx.fillRect(x + hw - w * 0.2, capY, w * 0.2, baseY - plinthH - capY);
  // Course lines — two, hash-shifted; a pier is built, not poured.
  ctx.fillStyle = 'rgba(24, 18, 34, 0.35)';
  for (let i = 0; i < 2; i++) {
    const cy = capY + (baseY - plinthH - capY) * (0.3 + i * 0.34 + ((seed >> (i * 3)) & 3) * 0.02);
    ctx.fillRect(x - hw, cy, w, Math.max(1, s * 0.014));
  }
  // THE CAP: a molded slab wider than the shaft — dark drip edge,
  // lit face, and the foreshortened top plane the camera owns.
  const capW = w * 1.42;
  const capFace = s * 0.075;
  const capD = syT * 0.1;
  ctx.fillStyle = shade(GY_STONE, -20);
  ctx.fillRect(x - capW / 2, capY, capW, Math.max(1, s * 0.02));
  ctx.fillStyle = shade(GY_STONE, 4);
  ctx.fillRect(x - capW / 2, capY - capFace, capW, capFace);
  ctx.fillStyle = GY_STONE_LIT;
  ctx.fillRect(x - capW / 2, capY - capFace - capD, capW, capD);
  ctx.fillStyle = shade(GY_STONE_LIT, -16);
  ctx.fillRect(x - capW / 2, capY - capFace - capD, capW, Math.max(1, s * 0.018));
  // The finial in dead iron, one lit sliver.
  const fy = capY - capFace - capD;
  if (finial === 'urn') {
    // The urn: foot, swelling belly, narrow neck, a small flame tip
    // of stone — the old sign for a life burned down.
    ctx.fillStyle = IRON_DARK;
    ctx.fillRect(x - s * 0.045, fy - s * 0.03, s * 0.09, s * 0.03);
    ctx.beginPath();
    ctx.ellipse(x, fy - s * 0.115, s * 0.075, s * 0.09, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(x - s * 0.026, fy - s * 0.24, s * 0.052, s * 0.05);
    ctx.beginPath();
    ctx.moveTo(x - s * 0.03, fy - s * 0.24);
    ctx.lineTo(x, fy - s * 0.34);
    ctx.lineTo(x + s * 0.03, fy - s * 0.24);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = shade(IRON_LIT, -8);
    ctx.fillRect(x - s * 0.05, fy - s * 0.135, s * 0.022, s * 0.09);
  } else {
    // The orb-and-spike: a sphere seated in a collar, the gate's
    // own point standing over it.
    ctx.fillStyle = IRON_DARK;
    ctx.fillRect(x - s * 0.04, fy - s * 0.026, s * 0.08, s * 0.026);
    ctx.beginPath();
    facetCircle(ctx, x, fy - s * 0.1, s * 0.075, 7, 0.4, 0.8);
    ctx.fill();
    ctx.fillRect(x - s * 0.014, fy - s * 0.3, s * 0.028, s * 0.14);
    ctx.beginPath();
    ctx.moveTo(x - s * 0.032, fy - s * 0.3);
    ctx.lineTo(x, fy - s * 0.4);
    ctx.lineTo(x + s * 0.032, fy - s * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = shade(IRON_LIT, -8);
    ctx.beginPath();
    facetCircle(ctx, x - s * 0.025, fy - s * 0.12, s * 0.026, 5, 0.2);
    ctx.fill();
  }
  // Damp climbs the shaded foot.
  ctx.fillStyle = GY_MOSS;
  ctx.beginPath();
  facetBlob(ctx, x + hw * 0.7, baseY - s * 0.07, s * 0.055, seed ^ 0x2f, 5, 0.7);
  ctx.fill();
  if (rend.outlineOn) {
    rend.beginStructOutline();
    ctx.beginPath();
    ctx.moveTo(x - hw * 1.24, baseY);
    ctx.lineTo(x - hw * 1.24, baseY - plinthH);
    ctx.lineTo(x - hw, baseY - plinthH);
    ctx.lineTo(x - hw, capY);
    ctx.lineTo(x - capW / 2, capY);
    ctx.lineTo(x - capW / 2, capY - capFace - capD);
    ctx.lineTo(x + capW / 2, capY - capFace - capD);
    ctx.lineTo(x + capW / 2, capY);
    ctx.lineTo(x + hw, capY);
    ctx.lineTo(x + hw, baseY - plinthH);
    ctx.lineTo(x + hw * 1.24, baseY - plinthH);
    ctx.lineTo(x + hw * 1.24, baseY);
    ctx.stroke();
  }
}

/** A rail band: dark iron with one lit top thread, drawn OVER the
 *  bars so every bar reads as pierced through, never glued on. */
export function ironRail(rend: PaintHost, x0: number, x1: number, y: number, t: number, dim: number): void {
  const ctx = rend.ctx;
  ctx.fillStyle = shade(IRON_DARK, dim);
  ctx.fillRect(x0, y - t / 2, x1 - x0, t);
  ctx.fillStyle = shade(IRON_LIT, dim - 10);
  ctx.fillRect(x0, y - t / 2, x1 - x0, Math.max(1, t * 0.26));
}

/**
 * THE ORNAMENT BAND: what the smith did between the second rail
 * and the top one. Hash-dealt per half-tile panel — a ring, a
 * facing pair of C-scrolls, or honest plain bars — so no two
 * panels down a long run repeat, and the whole run still reads as
 * one commission.
 */
export function ironOrnament(rend: PaintHost, cx: number, yTop: number, yBot: number, seed: number, dim: number, ds = 1): void {
  const ctx = rend.ctx;
  const s = rend.camera.scale * ds; // Epic B (FW): scrollwork recedes with the rail
  const midY = (yTop + yBot) / 2;
  const kind = seed & 3;
  if (kind === 3) return; // the plain panel breathes
  ctx.strokeStyle = shade(IRON_MID, dim + 6);
  ctx.lineWidth = Math.max(1, s * 0.024);
  if (kind === 0) {
    // The ring, seated on both rails.
    ctx.beginPath();
    ctx.arc(cx, midY, (yBot - yTop) * 0.44, 0, Math.PI * 2);
    ctx.stroke();
  } else if (kind === 1) {
    // The S-scroll: one serpentine of two half-turns — the smith's
    // signature curl, laid on its side between the rails. (The
    // first cut's facing C-pair read as an X at play distance and
    // was retired on the audit's verdict.)
    const r = (yBot - yTop) * 0.24;
    ctx.beginPath();
    ctx.arc(cx - r, midY - r * 0.5, r, Math.PI, Math.PI * 2.5);
    ctx.arc(cx + r, midY + r * 0.5, r, Math.PI * 1.5, Math.PI * 3);
    ctx.stroke();
  } else {
    // The diamond: a small turned lozenge echoing the spear leaf.
    const r = (yBot - yTop) * 0.34;
    ctx.beginPath();
    ctx.moveTo(cx, midY - r);
    ctx.lineTo(cx + r * 0.7, midY);
    ctx.lineTo(cx, midY + r);
    ctx.lineTo(cx - r * 0.7, midY);
    ctx.closePath();
    ctx.stroke();
  }
}

/**
 * THE IRON REST — the graveyard's wall. Wrought spear-topped bars
 * leaded into a granite curb, three rails, an ornament band, and a
 * masonry pier at every corner, tee, and run end. The gaps between
 * the bars are the design: the yard shows through its own wall.
 * Every direction speaks the same vocabulary of STANDING bars:
 *  - E-W runs: the full panel faces the camera — curb, bars,
 *    rails over them, the smith's ornament in its band.
 *  - N-S runs: the bars march up-screen in depth on the curb's
 *    strip, a dense comb with a ridge of spear leaves climbing.
 *  - 45° strides: vertical bars stationed corner-to-corner under
 *    honestly slanted rails — never a sheared panel.
 */
export function ironFenceItem(rend: PaintHost, tile: Tile, tx: number, ty: number, game: ClientGame): DrawItem {
  const ds = rend.camera.depthScale(ty + 0.5); // Epic B (FW): billboard foreshortens by tile depth; ds=1 at q=0 → byte-identical
  const s = rend.camera.scale * ds;
  const syT = s * rend.camera.yScale;
  const p = rend.camera.worldToScreen(tx + 0.5, ty + 0.5, rend.w, rend.h);
  p.y -= game.world.elevAt(tx, ty) * ELEV_H * s;
  const baseY = p.y + syT * 0.14;
  const straight = tile === Tile.IronFence;
  const gAt = (dx: number, dy: number) => game.world.groundAt(tx + dx, ty + dy);
  const cn = straight && ironish(rend, game, tx, ty - 1);
  const ce = straight && ironish(rend, game, tx + 1, ty);
  const cs = straight && ironish(rend, game, tx, ty + 1);
  const cw = straight && ironish(rend, game, tx - 1, ty);
  const dNE =
    tile === Tile.IronFenceDiagNE
      ? ironish(rend, game, tx + 1, ty - 1)
      : straight && gAt(1, -1) === Tile.IronFenceDiagNE;
  const dSW =
    tile === Tile.IronFenceDiagNE
      ? ironish(rend, game, tx - 1, ty + 1)
      : straight && gAt(-1, 1) === Tile.IronFenceDiagNE;
  const dNW =
    tile === Tile.IronFenceDiagNW
      ? ironish(rend, game, tx - 1, ty - 1)
      : straight && gAt(-1, -1) === Tile.IronFenceDiagNW;
  const dSE =
    tile === Tile.IronFenceDiagNW
      ? ironish(rend, game, tx + 1, ty + 1)
      : straight && gAt(1, 1) === Tile.IronFenceDiagNW;
  const anyDiag = dNE || dSW || dNW || dSE;
  const any = cn || ce || cs || cw || anyDiag;
  const isoEW = straight && !any;
  const isoNE = tile === Tile.IronFenceDiagNE && !any;
  const isoNW = tile === Tile.IronFenceDiagNW && !any;
  const xw = cw || isoEW ? p.x - s * 0.5 : p.x;
  const xe = ce || isoEW ? p.x + s * 0.5 : p.x;
  const dirCount =
    (cw ? 1 : 0) + (ce ? 1 : 0) + (cn ? 1 : 0) + (cs ? 1 : 0) + (anyDiag ? 1 : 0);
  const ewAny = cw || ce || isoEW;
  const nsAny = cn || cs;
  const ewThrough = cw && ce && !nsAny && !anyDiag;
  const nsThrough = cn && cs && !ewAny && !anyDiag;
  const needAnchor =
    (straight && !ewThrough && !nsThrough && !isoEW && dirCount > 0) || anyDiag || isoNE || isoNW;
  // The railing's proportions, measured against the 1.15-tile body:
  // spear tips clear the head, piers clear the spears. A graveyard
  // wall MEANS it without leaning on garrison bulk — the menace is
  // in the points, not the mass.
  const CURB_H = s * 0.15;
  const RAIL_LO = baseY - s * 0.3;
  const RAIL_MID = baseY - s * 0.78;
  const RAIL_HI = baseY - s * 1.0;
  const railT = s * 0.048;
  const PITCH = 0.125;
  const tipAt = (k: number): number =>
    baseY - s * (1.28 + ((hashCoords(163, tx * 16 + k, ty) >> 2) & 3) * 0.045);
  return {
    sortY: ty + 0.8,
    drawShadow: () => {
      // An open railing throws a lighter shadow than a log wall.
      if (ewAny) rend.castEdgeQuad(xw, baseY, xe, baseY, 0.6);
      if (cn) rend.castEdgeQuad(p.x, baseY - syT * 0.5, p.x, baseY, 0.6);
      if (cs) rend.castEdgeQuad(p.x, baseY, p.x, baseY + syT * 0.5, 0.6);
      if (dNE || isoNE) rend.castEdgeQuad(p.x, baseY, p.x + s * 0.5, baseY - syT * 0.5, 0.6);
      if (dSW || isoNE) rend.castEdgeQuad(p.x - s * 0.5, baseY + syT * 0.5, p.x, baseY, 0.6);
      if (dNW || isoNW) rend.castEdgeQuad(p.x - s * 0.5, baseY - syT * 0.5, p.x, baseY, 0.6);
      if (dSE || isoNW) rend.castEdgeQuad(p.x, baseY, p.x + s * 0.5, baseY + syT * 0.5, 0.6);
    },
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;

      // A marching bar: one wrought bar at a world offset from the
      // tile center — the vocabulary every non-E-W course speaks.
      const marchBar = (fx: number, fy: number, k: number) => {
        const seed = hashCoords(167, tx * 16 + k, ty * 16 + Math.round(fy * 16));
        const bx = p.x + fx * s + (((seed >> 8) & 3) - 1.5) * s * 0.008;
        const by = baseY + fy * syT;
        ironBar(rend, bx, by - CURB_H * 0.5, tipAt(k) + fy * syT, seed, 0, ds);
      };

      // The E-W course: the full panel faces the camera.
      const courseEW = () => {
        ironCurbEW(rend, xw, xe, baseY, tx, ty);
        const foot = baseY - CURB_H * 0.6;
        const n = Math.round((xe - xw) / (s * PITCH));
        for (let i = 0; i <= n; i++) {
          const bx = xw + i * s * PITCH;
          // Seam bars land where runs join — the neighbor draws the
          // same bar at the same x, so the double paint is idempotent.
          const k = Math.round((bx - (p.x - s * 0.5)) / (s * PITCH));
          ironBar(rend, bx, foot, tipAt(k), hashCoords(167, tx * 16 + k, ty), 0, ds);
        }
        ironRail(rend, xw, xe, RAIL_LO, railT, 0);
        ironRail(rend, xw, xe, RAIL_MID, railT * 0.8, 0);
        ironRail(rend, xw, xe, RAIL_HI, railT, 0);
        // The smith's hand, one thought per half-tile panel.
        const halves: Array<[number, number]> = [];
        if (xw < p.x) halves.push([p.x - s * 0.25, 0]);
        if (xe > p.x) halves.push([p.x + s * 0.25, 1]);
        for (const [hx, hi] of halves) {
          ironOrnament(rend, hx, RAIL_HI + railT / 2, RAIL_MID - railT / 2, hashCoords(173, tx * 2 + hi, ty), 0, ds);
        }
        // THE STANDARD: a heavier forged upright at every second
        // tile seam — collar rings over the rails, a taller spear —
        // the rhythm that keeps a long run from reading as
        // wallpaper. Parity-dealt so both neighbors agree on it.
        if (tx % 2 === 0 && cw) drawStandard(p.x - s * 0.5, baseY);
      };

      // One forged standard: the heavier upright with its own
      // taller spear and the collar rings that marry it to the
      // rails — shared by the E-W seam rhythm and the N-S joints.
      const drawStandard = (sx: number, footBase: number) => {
        const bw = s * 0.062;
        const foot = footBase - CURB_H * 0.5;
        const stTip = footBase - s * 1.48;
        const stShoulder = stTip + s * 0.24;
        ctx.fillStyle = IRON_MID;
        ctx.fillRect(sx - bw / 2, stShoulder, bw, foot - stShoulder);
        ctx.fillStyle = IRON_LIT;
        ctx.fillRect(sx - bw / 2, stShoulder, Math.max(1, bw * 0.28), foot - stShoulder);
        ctx.fillStyle = shade(IRON_MID, 10);
        ctx.beginPath();
        ctx.moveTo(sx - s * 0.052, stShoulder - s * 0.075);
        ctx.lineTo(sx, stTip);
        ctx.lineTo(sx, stShoulder);
        ctx.lineTo(sx - s * 0.052, stShoulder - s * 0.02);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = IRON_DARK;
        ctx.beginPath();
        ctx.moveTo(sx, stTip);
        ctx.lineTo(sx + s * 0.052, stShoulder - s * 0.075);
        ctx.lineTo(sx + s * 0.052, stShoulder - s * 0.02);
        ctx.lineTo(sx, stShoulder);
        ctx.closePath();
        ctx.fill();
        // The collars marry the standard to the rail heights.
        ctx.fillStyle = IRON_DARK;
        for (const cy of [footBase - s * 0.3, footBase - s * 1.0]) {
          ctx.fillRect(sx - bw * 0.95, cy - railT * 0.85, bw * 1.9, railT * 1.7);
        }
        ctx.fillStyle = shade(IRON_LIT, -6);
        for (const cy of [footBase - s * 0.3, footBase - s * 1.0]) {
          ctx.fillRect(sx - bw * 0.95, cy - railT * 0.85, bw * 1.9, Math.max(1, s * 0.014));
        }
      };

      // N-S: the run seen edge-on. Overlapping bars CONDENSE — the
      // honest projection of a thin panel in depth is one dark
      // band, so that is what is drawn: the massed ironwork over
      // the curb strip, a lit west thread, hairline bar seams, and
      // the per-tile STANDARD covering every joint (the wood
      // fence's own N-S law, spoken in iron — the first cut gave
      // every bar its spearhead in depth and the stack read as a
      // hanging chain; the audit retired it).
      const courseNS = (half: 'n' | 's') => {
        const y0 = half === 'n' ? -0.5 : 0;
        const y1 = half === 'n' ? 0 : 0.5;
        const yTop = baseY + y0 * syT;
        const yBot = baseY + y1 * syT;
        // The curb strip in depth: lit top plane, dark east edge.
        ctx.fillStyle = shade(GY_STONE_LIT, -6);
        ctx.fillRect(p.x - s * 0.085, yTop - CURB_H, s * 0.17, yBot - yTop);
        ctx.fillStyle = shade(GY_STONE_LIT, 8);
        ctx.fillRect(p.x - s * 0.085, yTop - CURB_H, Math.max(1, s * 0.022), yBot - yTop);
        ctx.fillStyle = 'rgba(24, 18, 34, 0.4)';
        ctx.fillRect(p.x + s * 0.065, yTop - CURB_H, Math.max(1, s * 0.02), yBot - yTop);
        if (half === 's') {
          // The south cap: the one place the strip shows its face.
          ctx.fillStyle = shade(GY_STONE, -14);
          ctx.fillRect(p.x - s * 0.085, yBot - CURB_H, s * 0.17, CURB_H);
        }
        // The massed panel: bars in depth, condensed to a band.
        const bw2 = s * 0.052;
        const bandTop = yTop - s * 1.3;
        const bandBot = yBot - CURB_H * 0.5;
        ctx.fillStyle = shade(IRON_MID, -4);
        ctx.fillRect(p.x - bw2, bandTop, bw2 * 2, bandBot - bandTop);
        ctx.fillStyle = shade(IRON_LIT, -4);
        ctx.fillRect(p.x - bw2, bandTop, Math.max(1, s * 0.018), bandBot - bandTop);
        ctx.fillStyle = shade(IRON_DARK, 0);
        for (const fx of [-0.012, 0.022]) {
          ctx.fillRect(p.x + fx * s, bandTop, Math.max(1, s * 0.012), bandBot - bandTop);
        }
        // The band's own head: one spear leaf where the run walks
        // away north — the tip the eye tracks down the line.
        if (half === 'n') {
          ctx.fillStyle = shade(IRON_MID, 8);
          ctx.beginPath();
          ctx.moveTo(p.x - bw2, bandTop);
          ctx.lineTo(p.x, bandTop - s * 0.14);
          ctx.lineTo(p.x + bw2, bandTop);
          ctx.closePath();
          ctx.fill();
        }
      };

      // 45°: vertical bars stationed corner-to-corner beneath
      // honestly slanted rails — collected and depth-sorted so the
      // overlaps read true.
      const diagBars: Array<[number, number, number]> = [];
      const diagRails: Array<[number, number]> = [];
      const strideInto = (sx: number, sy: number, kBase: number) => {
        for (let i = 1; i <= 3; i++) {
          const f = i / 4;
          diagBars.push([sx * f * 0.5, sy * f * 0.5, kBase + i]);
        }
        diagRails.push([sx, sy]);
      };
      if (dNE || isoNE) strideInto(1, -1, 16);
      if (dNW || isoNW) strideInto(-1, -1, 20);
      if (dSW || isoNE) strideInto(-1, 1, 24);
      if (dSE || isoNW) strideInto(1, 1, 28);
      diagBars.sort((a, b) => a[1] - b[1]);

      // The slanted courses: curb ribbon and rails following the
      // diagonal line — drawn between the bar ranks so northern
      // bars stand behind them and southern bars before.
      const diagCourses = () => {
        for (const [sx, sy] of diagRails) {
          const x1 = p.x + sx * s * 0.5;
          const yTip = baseY + sy * syT * 0.5;
          // The curb ribbon.
          ctx.fillStyle = shade(GY_STONE_LIT, -6);
          ctx.beginPath();
          ctx.moveTo(p.x - s * 0.09, baseY - CURB_H);
          ctx.lineTo(x1 - s * 0.09, yTip - CURB_H);
          ctx.lineTo(x1 + s * 0.09, yTip - CURB_H);
          ctx.lineTo(p.x + s * 0.09, baseY - CURB_H);
          ctx.closePath();
          ctx.fill();
          // Slanted rails at the panel heights.
          for (const [ry, rt] of [
            [RAIL_LO, railT],
            [RAIL_MID, railT * 0.8],
            [RAIL_HI, railT],
          ] as const) {
            const off = ry - baseY;
            ctx.fillStyle = IRON_DARK;
            ctx.beginPath();
            ctx.moveTo(p.x, ry - rt / 2);
            ctx.lineTo(x1, yTip + off - rt / 2);
            ctx.lineTo(x1, yTip + off + rt / 2);
            ctx.lineTo(p.x, ry + rt / 2);
            ctx.closePath();
            ctx.fill();
          }
        }
      };

      // Back-to-front: north masses, the E-W panel, the junction
      // pier, then south masses over its foot.
      if (cn) courseNS('n');
      for (const [fx, fy, k] of diagBars) if (fy < 0) marchBar(fx, fy, k);
      if (anyDiag || isoNE || isoNW) diagCourses();
      if (ewAny) courseEW();
      if (needAnchor) {
        drawGravePier(rend, p.x, baseY + s * 0.02, s * 0.26, s * 1.52, 'urn', ds);
      } else if (nsAny) {
        // The joint of a through N-S run: the standard covers it
        // (the wood fence's post law), one per tile.
        drawStandard(p.x, baseY);
      }
      if (cs) courseNS('s');
      for (const [fx, fy, k] of diagBars) if (fy >= 0) marchBar(fx, fy, k);

      // The ink: the curb's silhouette carries the ring — the bars
      // and rails are blue-black and ink themselves.
      if (rend.outlineOn && ewAny) {
        rend.beginStructOutline();
        ctx.beginPath();
        ctx.moveTo(xw, baseY);
        ctx.lineTo(xe, baseY);
        ctx.moveTo(xw, baseY - CURB_H - syT * 0.09);
        ctx.lineTo(xe, baseY - CURB_H - syT * 0.09);
        ctx.stroke();
      }
    },
  };
}

/**
 * THE GRAVEYARD GATE — the yard's one piece of ceremony. Twin
 * granite piers under orb-and-spike finials carry a wrought
 * OVERTHROW: an arched iron band sweeping pier to pier, scroll
 * curls at its springings, a spear finial at its crown — and, some
 * nights, a crow that will not move. Below swing double leaves of
 * barred iron, each top rail sweeping down from its pier toward
 * the meeting stiles, spear leaves riding the curve; open, each
 * leaf folds back against its own pier. N-S gates keep the
 * pier-and-leaf grammar edge-on (an overthrow seen end-on is a
 * sliver, so the vertical gate lets its piers carry the ceremony).
 */
export function ironGateItem(rend: PaintHost, tile: Tile, tx: number, ty: number, game: ClientGame): DrawItem {
  const ds = rend.camera.depthScale(ty + 0.5); // Epic B (FW): billboard foreshortens by tile depth; ds=1 at q=0 → byte-identical
  const s = rend.camera.scale * ds;
  const syT = s * rend.camera.yScale;
  const p = rend.camera.worldToScreen(tx + 0.5, ty + 0.5, rend.w, rend.h);
  p.y -= game.world.elevAt(tx, ty) * ELEV_H * s;
  const baseY = p.y + syT * 0.14;
  const open = doorInfo(tile)!.open;
  const h = hashCoords(179, tx, ty);
  const vertical =
    (ironish(rend, game, tx, ty - 1) || ironish(rend, game, tx, ty + 1)) &&
    !(ironish(rend, game, tx + 1, ty) || ironish(rend, game, tx - 1, ty));
  const PIER_W = s * 0.3;
  const PIER_H = s * 1.66;
  return {
    sortY: ty + (vertical ? 0.75 : 0.8),
    drawShadow: () => {
      if (vertical) rend.castEdgeQuad(p.x, baseY - syT * 0.5, p.x, baseY + syT * 0.5, 0.8);
      else rend.castEdgeQuad(p.x - s * 0.5, baseY, p.x + s * 0.5, baseY, 0.8);
    },
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      const o = Math.min(1, rend.doorOpenness(tx, ty, open));
      const shakeX = rend.doorShakeAt(tx, ty) * s * 0.03;
      if (shakeX !== 0) {
        ctx.save();
        ctx.translate(shakeX, 0);
      }

      // One gate leaf: barred iron under a swept top rail — tall
      // at the hinge, dipping toward the meeting stile, spear
      // leaves riding the curve. `hingeX` is the stile the leaf
      // folds toward; `dir` +1 opens east.
      const drawLeaf = (hingeX: number, dir: number, width: number, dim: number) => {
        const w2 = width;
        if (w2 < s * 0.045) return;
        const x0 = dir > 0 ? hingeX : hingeX - w2;
        const yBot = baseY - 0.05 * s;
        const hingeTop = baseY - 1.12 * s;
        const meetTop = baseY - 0.86 * s;
        if (w2 < s * 0.16) {
          // Edge-on: the turned leaf collapses to a dark stile
          // with its spear ridge.
          ctx.fillStyle = shade(IRON_DARK, dim);
          ctx.fillRect(x0, hingeTop, w2, yBot - hingeTop);
          ctx.fillStyle = shade(IRON_MID, dim + 8);
          ctx.beginPath();
          ctx.moveTo(x0, hingeTop);
          ctx.lineTo(x0 + w2 / 2, hingeTop - 0.14 * s);
          ctx.lineTo(x0 + w2, hingeTop);
          ctx.closePath();
          ctx.fill();
          return;
        }
        const topAt = (fx: number): number => {
          const f = dir > 0 ? fx : 1 - fx;
          return hingeTop + (meetTop - hingeTop) * f * f;
        };
        const nb = 5;
        // Bars first — the rails and stiles pin them after.
        for (let i = 0; i <= nb; i++) {
          const fx = i / nb;
          const bx = x0 + w2 * fx;
          // A gate leaf keeps every bar it was hung with: the seed's
          // low bits are pinned so the decay variants never deal here.
          const seed = hashCoords(181, tx * 8 + i, ty + dir * 3);
          ironBar(rend, bx, yBot, topAt(fx) - 0.2 * s, (seed & ~127) | 1, dim, ds);
        }
        // The bottom rail and the swept top rail.
        ctx.fillStyle = shade(IRON_DARK, dim);
        ctx.fillRect(x0, yBot - 0.16 * s, w2, s * 0.045);
        ctx.beginPath();
        ctx.moveTo(x0, topAt(0) - s * 0.024);
        ctx.quadraticCurveTo(x0 + w2 / 2, topAt(0.5) - s * 0.06, x0 + w2, topAt(1) - s * 0.024);
        ctx.lineTo(x0 + w2, topAt(1) + s * 0.024);
        ctx.quadraticCurveTo(x0 + w2 / 2, topAt(0.5) - s * 0.012, x0, topAt(0) + s * 0.024);
        ctx.closePath();
        ctx.fill();
        // The scroll heart under the sweep — the smith signs every
        // leaf with one curl, turned toward the hinge.
        ctx.strokeStyle = shade(IRON_MID, dim + 6);
        ctx.lineWidth = Math.max(1, s * 0.024);
        ctx.beginPath();
        ctx.arc(x0 + w2 * (dir > 0 ? 0.32 : 0.68), yBot - 0.52 * s, w2 * 0.17, dir > 0 ? -Math.PI * 0.2 : Math.PI * 0.8, dir > 0 ? Math.PI * 0.9 : Math.PI * 1.9);
        ctx.stroke();
        // The hinge stile, a hair heavier than its bars.
        const hx2 = dir > 0 ? x0 : x0 + w2 - s * 0.06;
        ctx.fillStyle = shade(IRON_DARK, dim);
        ctx.fillRect(hx2, topAt(dir > 0 ? 0 : 1) - s * 0.02, s * 0.06, yBot - topAt(dir > 0 ? 0 : 1) + s * 0.02);
        ctx.fillStyle = shade(IRON_LIT, dim - 8);
        ctx.fillRect(hx2, topAt(dir > 0 ? 0 : 1) - s * 0.02, Math.max(1, s * 0.018), yBot - topAt(dir > 0 ? 0 : 1) + s * 0.02);
      };

      if (!vertical) {
        const pierL = p.x - 0.44 * s;
        const pierR = p.x + 0.44 * s;
        // THE DOUBLE LEAVES: each folds toward its own pier.
        const leafFull = 0.37 * s;
        const wNow = leafFull * (1 - o * 0.9);
        drawLeaf(pierL + PIER_W * 0.32, 1, wNow, Math.round(-20 * o));
        drawLeaf(pierR - PIER_W * 0.32, -1, wNow, Math.round(-20 * o));
        // The latch: an old lock plate where the stiles meet — a
        // shield-shaped escutcheon under a hanging ring pull.
        if (o < 0.15) {
          ctx.fillStyle = IRON_DARK;
          ctx.beginPath();
          ctx.moveTo(p.x - s * 0.065, baseY - s * 0.68);
          ctx.lineTo(p.x + s * 0.065, baseY - s * 0.68);
          ctx.lineTo(p.x + s * 0.065, baseY - s * 0.55);
          ctx.lineTo(p.x, baseY - s * 0.49);
          ctx.lineTo(p.x - s * 0.065, baseY - s * 0.55);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = shade(IRON_LIT, -4);
          ctx.fillRect(p.x - s * 0.065, baseY - s * 0.68, s * 0.13, Math.max(1, s * 0.016));
          ctx.strokeStyle = shade(IRON_LIT, -6);
          ctx.lineWidth = Math.max(1, s * 0.02);
          ctx.beginPath();
          ctx.arc(p.x, baseY - s * 0.52, s * 0.04, Math.PI * 0.15, Math.PI * 0.85);
          ctx.stroke();
        }
        // The piers flank the opening.
        drawGravePier(rend, pierL, baseY, PIER_W, PIER_H, 'orb', ds);
        drawGravePier(rend, pierR, baseY, PIER_W, PIER_H, 'orb', ds);
        // THE OVERTHROW: the wrought band arching pier to pier —
        // this is the silhouette the whole yard is known by. The
        // band springs from the pier CAPS (iron seats on masonry,
        // never floats over it) and carries real thickness.
        const spring = baseY - PIER_H + s * 0.04;
        const crown = baseY - PIER_H - s * 0.46;
        const bandT = s * 0.075;
        ctx.fillStyle = IRON_DARK;
        ctx.beginPath();
        ctx.moveTo(pierL, spring);
        ctx.quadraticCurveTo(p.x, crown - s * 0.12, pierR, spring);
        ctx.lineTo(pierR, spring + bandT);
        ctx.quadraticCurveTo(p.x, crown - s * 0.12 + bandT * 1.7, pierL, spring + bandT);
        ctx.closePath();
        ctx.fill();
        // The lit thread rides the band's upper sweep.
        ctx.strokeStyle = shade(IRON_LIT, -6);
        ctx.lineWidth = Math.max(1, s * 0.018);
        ctx.beginPath();
        ctx.moveTo(pierL + s * 0.04, spring + s * 0.012);
        ctx.quadraticCurveTo(p.x, crown - s * 0.1, pierR - s * 0.04, spring + s * 0.012);
        ctx.stroke();
        // The springing spirals hang FROM the band — an outer curl
        // rolling into a tighter turn, one under each shoulder.
        ctx.strokeStyle = IRON_MID;
        ctx.lineWidth = Math.max(1, s * 0.026);
        for (const [sx3, sweep] of [
          [pierL + s * 0.17, 1],
          [pierR - s * 0.17, -1],
        ] as const) {
          const sy3 = spring + bandT + s * 0.055;
          ctx.beginPath();
          ctx.arc(sx3, sy3, s * 0.06, Math.PI * 1.5, Math.PI * (1.5 + sweep * 1.5), sweep < 0);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(sx3 + sweep * s * 0.02, sy3, s * 0.028, Math.PI * 1.5, Math.PI * (1.5 + sweep * 1.6), sweep < 0);
          ctx.stroke();
        }
        // The crown cluster: the center spear flanked by two small
        // curls — the yard's sign, read against the sky.
        const cx2 = p.x;
        const cy2 = crown - s * 0.06;
        ctx.fillStyle = IRON_DARK;
        ctx.fillRect(cx2 - s * 0.015, cy2 - s * 0.1, s * 0.03, s * 0.14);
        ctx.beginPath();
        ctx.moveTo(cx2 - s * 0.04, cy2 - s * 0.1);
        ctx.lineTo(cx2, cy2 - s * 0.22);
        ctx.lineTo(cx2 + s * 0.04, cy2 - s * 0.1);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = IRON_MID;
        ctx.lineWidth = Math.max(1, s * 0.022);
        ctx.beginPath();
        ctx.arc(cx2 - s * 0.085, cy2 + s * 0.015, s * 0.042, Math.PI * 1.6, Math.PI * 2.9);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx2 + s * 0.085, cy2 + s * 0.015, s * 0.042, Math.PI * 0.1, Math.PI * 1.4, true);
        ctx.stroke();
        // Some nights, the watcher. It came with the iron; it
        // leaves with nobody.
        if ((h & 7) === 3) {
          const bx = p.x + (((h >> 3) & 1) ? -1 : 1) * s * 0.24;
          const by = spring - s * 0.012;
          ctx.fillStyle = '#16131d';
          ctx.beginPath();
          ctx.ellipse(bx, by - s * 0.05, s * 0.052, s * 0.042, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          facetCircle(ctx, bx + s * 0.04, by - s * 0.1, s * 0.026, 5, 0.3);
          ctx.fill();
          // The tail tick and the beak.
          ctx.beginPath();
          ctx.moveTo(bx - s * 0.04, by - s * 0.05);
          ctx.lineTo(bx - s * 0.11, by - s * 0.02);
          ctx.lineTo(bx - s * 0.045, by - s * 0.022);
          ctx.closePath();
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(bx + s * 0.062, by - s * 0.1);
          ctx.lineTo(bx + s * 0.095, by - s * 0.088);
          ctx.lineTo(bx + s * 0.06, by - s * 0.078);
          ctx.closePath();
          ctx.fill();
        }
        if (rend.outlineOn) {
          // The arch's ink: the overthrow's outer sweep only — the
          // leaves and bars are blue-black and ink themselves.
          rend.beginStructOutline();
          ctx.beginPath();
          ctx.moveTo(pierL, spring);
          ctx.quadraticCurveTo(p.x, crown - s * 0.1, pierR, spring);
          ctx.stroke();
        }
      } else {
        const yN = baseY - syT * 0.5;
        const yS = baseY + syT * 0.5;
        drawGravePier(rend, p.x, yN, PIER_W, PIER_H, 'orb', ds);
        if (o < 0.98) {
          // Shut: the leaf edge-on — a dark comb barring the gap,
          // spear ridge cascading, retracting toward its north
          // hinge as it swings.
          const top = yN - 1.02 * s;
          const bot = top + (yS - 0.05 * s - top) * (1 - o);
          ctx.fillStyle = IRON_DARK;
          ctx.fillRect(p.x - s * 0.032, top, s * 0.064, bot - top);
          ctx.fillStyle = shade(IRON_LIT, -8);
          ctx.fillRect(p.x - s * 0.032, top, Math.max(1, s * 0.018), bot - top);
          // The comb: spear tips marching down the strip.
          ctx.fillStyle = shade(IRON_MID, 6);
          for (let fy = 0.06; fy < 0.94; fy += 0.16) {
            const ty2 = top + (bot - top) * fy;
            ctx.beginPath();
            ctx.moveTo(p.x - s * 0.05, ty2 + s * 0.05);
            ctx.lineTo(p.x, ty2);
            ctx.lineTo(p.x + s * 0.05, ty2 + s * 0.05);
            ctx.closePath();
            ctx.fill();
          }
          if (rend.outlineOn) {
            rend.beginStructOutline();
            ctx.strokeRect(p.x - s * 0.032, top, s * 0.064, bot - top);
          }
        }
        if (o > 0.02) {
          const oo = Math.sin((o * Math.PI) / 2);
          drawLeaf(p.x + 0.07 * s, 1, 0.7 * s * oo, 0);
        }
        drawGravePier(rend, p.x, yS, PIER_W, PIER_H, 'orb', ds);
      }
      if (shakeX !== 0) ctx.restore();
    },
  };
}

/** Half-tile crown-lobe amplitude, WORLD-keyed (channel per axis)
 *  so run-mates agree at every shared seam. */
export function hedgeLobe(rend: PaintHost, ch: number, a: number, b: number): number {
  return 0.05 + ((hashCoords(ch, a, b) >> 2) & 7) * 0.0075;
}

/**
 * ONE MASS, ONE SILHOUETTE — the hedge's bespoke unit painter (the
 * round-three verdict: composing slabs, strips, knuckles, and piers
 * per tile left interior ink crossing every junction and gates
 * reading as bollards beside gaps — wall-family thinking; a hedge
 * is not a wall). The caller hands a closed clockwise PLAN loop of
 * typed segments (crown = north-facing free edge, skirt = south-
 * facing free edge wearing the face, sideW/sideE = west/east free
 * edges, cut = a shared tile seam where a neighbor's mass
 * continues) plus the crown texture cells and pillow-parting
 * creases; this paints the WHOLE mass as one truth: the crown
 * plane filled from a single decorated outline (crown lobes on
 * north edges, pinch-and-bulge caterpillar sides keyed so both
 * tiles at any seam agree, gently bellied skirts, rounded convex
 * corners, filleted concave junctions), the south faces hung from
 * the skirt edges with the full face kit, and ONE ink pass that
 * strokes the outer silhouette only — cuts never take ink, so
 * merged runs, corners, tees, and gate stubs read as one clipped
 * body across any number of tiles.
 */
export function hedgeMassPaint(rend: PaintHost, 
  px: number,
  py: number,
  tx: number,
  ty: number,
  parts: ReadonlyArray<{ au: number; av: number; bu: number; bv: number; k: number }>,
  h: number,
  wind: { l: number; s: number; bx: number },
  salt: number,
  cells: ReadonlyArray<{ u: number; v: number; ku: number; kv: number }>,
  vcreases: ReadonlyArray<{ u: number; v0: number; v1: number; key: number }>,
  hcreases: ReadonlyArray<{ v: number; u0: number; u1: number; key: number }>,
  inkSides = true,
): void {
  const ctx = rend.ctx;
  const s = rend.camera.scale * rend.camera.depthScale(ty + 0.5); // Epic B (FW)
  const syT = s * rend.camera.yScale;
  const X = (u: number) => px + u * s;
  const Y = (v: number) => py + v * syT - h * s;
  const YG = (v: number) => py + v * syT;
  const n = parts.length;
  // Corner radii per joint: rounded where convex (keyed, the
  // gardener's squared-off shoulders), a small fillet where
  // concave (the inner turn of an L or tee), NONE beside a cut —
  // a rounded seam would notch the neighbor's continuation.
  // THE SHOULDER LAW (round four — the user's 90° verdict): a side
  // meeting the FACE is the biggest turn on the whole body, and it
  // gets the biggest radius — the crown plane rolls over into the
  // face through a full clipped shoulder, and the face below picks
  // the curve up with a bellied cheek (see the face pass), so the
  // silhouette never breaks square where plan view becomes
  // elevation. Round three's "radius 0 beside skirts" — a patch
  // for an ink gap — is what printed the boxy corner; the gap is
  // now closed the right way, by curving the face itself.
  const radii: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = parts[i]!;
    const b = parts[(i + 1) % n]!;
    const cross =
      Math.sign(a.bu - a.au) * Math.sign(b.bv - b.av) -
      Math.sign(a.bv - a.av) * Math.sign(b.bu - b.au);
    // Cuts must meet the neighbor edge-true; the concave seat where
    // a face runs into a south arm's flank stays plumb.
    if (a.k === 0 || b.k === 0) {
      radii.push(0);
      continue;
    }
    if (a.k === 2 || b.k === 2) {
      if (cross > 0) {
        const sseed = hashCoords(173, Math.round((tx + a.bu) * 4), Math.round((ty + a.bv) * 4) + salt);
        radii.push(0.13 + ((sseed >>> 4) & 3) * 0.018);
      } else radii.push(0);
      continue;
    }
    if (cross > 0) {
      const cseed = hashCoords(173, Math.round((tx + a.bu) * 4), Math.round((ty + a.bv) * 4) + salt);
      radii.push(0.08 + ((cseed >>> 4) & 3) * 0.015);
    } else if (cross < 0) radii.push(0.05);
    else radii.push(0);
  }
  // --- the decorated edge emitters (fill and ink share these) ---
  const crownTo = (t: Path2D | CanvasRenderingContext2D, u0: number, v: number, u1: number) => {
    const dir = Math.sign(u1 - u0);
    let cur = u0;
    let guard = 0;
    while (guard++ < 8 && Math.abs(u1 - cur) > 0.005) {
      const st = dir > 0 ? Math.floor(cur * 2 + 1e-4) / 2 + 0.5 : Math.ceil(cur * 2 - 1e-4) / 2 - 0.5;
      const next = dir > 0 ? Math.min(u1, st) : Math.max(u1, st);
      const w = next - cur;
      const col = tx * 2 + Math.round(((cur + next) / 2 + 0.5) * 2 - 0.5);
      const amp = hedgeLobe(rend, 71, col, ty * 3 + salt) * s * Math.min(1, Math.abs(w) / 0.42);
      t.quadraticCurveTo(X(cur + w * 0.24), Y(v) - amp * 2.1, X(cur + w * 0.5), Y(v) - amp * 0.55);
      t.quadraticCurveTo(X(cur + w * 0.76), Y(v) - amp * 1.8, X(next), Y(v));
      cur = next;
    }
  };
  const skirtTo = (t: Path2D | CanvasRenderingContext2D, u0: number, v: number, u1: number) => {
    const kseed = hashCoords(171, tx * 4 + Math.round(u0 + u1) + salt, ty * 4);
    const mo = (((kseed >>> 8) % 20) - 10) / 400;
    const bow = (0.02 + ((kseed >>> 5) & 3) * 0.012) * Math.min(1, Math.abs(u1 - u0) / 0.5);
    t.quadraticCurveTo(X((u0 + u1) / 2 + mo), Y(v) + bow * syT, X(u1), Y(v));
  };
  // THE ROOTLINE (round five — the user's cut-off verdict): the
  // face's ground edge is not a ruled line, it is where foliage
  // meets turf — per half-tile drooping lobes hanging just below
  // the ground line, world-keyed like the crown's so both tiles at
  // any seam agree (lobes return to baseline at every station).
  // Fill, seat shadow (via the face clip), and the struct ink all
  // ride this one curve — the outline finally CLOSES around the
  // mass the way every tree and bush in this style closes.
  const rootTo = (t: Path2D | CanvasRenderingContext2D, u0: number, v: number, u1: number) => {
    const dir = Math.sign(u1 - u0);
    let cur = u0;
    let guard = 0;
    const yG0 = YG(v);
    while (guard++ < 8 && Math.abs(u1 - cur) > 0.005) {
      const st = dir > 0 ? Math.floor(cur * 2 + 1e-4) / 2 + 0.5 : Math.ceil(cur * 2 - 1e-4) / 2 - 0.5;
      const next = dir > 0 ? Math.min(u1, st) : Math.max(u1, st);
      const w = next - cur;
      const col = tx * 2 + Math.round(((cur + next) / 2 + 0.5) * 2 - 0.5);
      const rseed = hashCoords(193, col, ty * 3 + salt);
      const amp = (0.03 + ((rseed >>> 3) & 7) * 0.004) * s * Math.min(1, Math.abs(w) / 0.42);
      const mo = (((rseed >>> 7) % 14) - 7) / 100;
      t.quadraticCurveTo(X(cur + w * (0.3 + mo)), yG0 + amp * 1.8, X(cur + w * 0.55), yG0 + amp * 0.6);
      t.quadraticCurveTo(X(cur + w * 0.78), yG0 + amp * 1.5, X(next), yG0);
      cur = next;
    }
  };
  const pinchOf = (vi: number, ch: number) =>
    0.045 + ((hashCoords(ch, tx * 3 + salt, vi) >>> 3) & 7) * 0.0055;
  const sideTo = (
    t: Path2D | CanvasRenderingContext2D,
    baseU: number,
    v0: number,
    v1: number,
    inward: number,
    uEnd: number,
  ) => {
    const dir = Math.sign(v1 - v0);
    let cur = v0;
    let guard = 0;
    while (guard++ < 8 && Math.abs(v1 - cur) > 0.005) {
      const st = dir > 0 ? Math.floor(cur * 2 + 1e-4) / 2 + 0.5 : Math.ceil(cur * 2 - 1e-4) / 2 - 0.5;
      const next = dir > 0 ? Math.min(v1, st) : Math.max(v1, st);
      const last = Math.abs(next - v1) < 0.004;
      const row = ty * 2 + Math.round(((cur + next) / 2 + 0.5) * 2 - 0.5);
      const aseed = hashCoords(inward > 0 ? 107 : 109, tx * 3 + salt, row);
      const ax = baseU - inward * (0.006 + ((aseed >>> 2) & 3) * 0.007);
      const at = 0.34 + ((aseed >>> 6) % 32) / 100;
      const vi = ty * 2 + Math.round((next + 0.5) * 2);
      const nu = last ? uEnd : baseU + inward * pinchOf(vi, inward > 0 ? 157 : 163);
      t.quadraticCurveTo(X(ax), Y(cur + (next - cur) * at), X(nu), Y(next));
      cur = next;
    }
  };
  const segStart = (i: number) => {
    const g = parts[i]!;
    const r = radii[(i + n - 1) % n]!;
    return g.av === g.bv
      ? { u: g.au + Math.sign(g.bu - g.au) * r, v: g.av }
      : { u: g.au, v: g.av + Math.sign(g.bv - g.av) * r };
  };
  const emitLoop = (t: Path2D | CanvasRenderingContext2D, ink: boolean) => {
    let pen = false;
    for (let i = 0; i < n; i++) {
      const g = parts[i]!;
      // Ink is the OUTER silhouette only: cuts are interior seams
      // and the skirt line is the arris (lit stroke, never struct
      // ink) — the true lower silhouette is the face's ground
      // line, which never inks by the wall law.
      if (ink && (g.k === 0 || g.k === 2 || (!inkSides && g.k !== 1))) {
        // Crown-only mode serves the diagonal stride's corner
        // cushions — a full ring on every overlapped step printed
        // the tombstone row two sheets back.
        pen = false;
        continue;
      }
      const rB = radii[i]!;
      const sA = segStart(i);
      const sB =
        g.av === g.bv
          ? { u: g.bu - Math.sign(g.bu - g.au) * rB, v: g.bv }
          : { u: g.bu, v: g.bv - Math.sign(g.bv - g.av) * rB };
      if (!pen) {
        t.moveTo(X(sA.u), Y(sA.v));
        pen = true;
      }
      switch (g.k) {
        case 0:
          t.lineTo(X(sB.u), Y(sB.v));
          break;
        case 1:
          crownTo(t, sA.u, g.av, sB.u);
          break;
        case 2:
          skirtTo(t, sA.u, g.av, sB.u);
          break;
        case 3:
          // The shoulder base is the RAW westmost edge — a pinched
          // cut endpoint must not shift the whole side's line.
          sideTo(t, Math.min(g.au, g.bu), sA.v, sB.v, 1, sB.u);
          break;
        case 4:
          sideTo(t, Math.max(g.au, g.bu), sA.v, sB.v, -1, sB.u);
          break;
      }
      if (rB > 0) {
        const nx = (i + 1) % n;
        const ns = segStart(nx);
        if (!ink || (parts[nx]!.k !== 0 && parts[nx]!.k !== 2))
          t.quadraticCurveTo(X(g.bu), Y(g.bv), X(ns.u), Y(ns.v));
      }
    }
  };
  // --- FACES first (the crown covers their top edge) ---
  // THE CHEEK (round four): the face is no longer a rectangle. At
  // every free shoulder its side edge continues the crown side's
  // line — swelling gently past the plan edge through the upper
  // face, tucking back in at the roots — one unbroken S from the
  // last caterpillar waist to the turf. The keyed measures ride
  // the same corner stations as the shoulder radii, so ink and
  // fill agree stroke for stroke.
  const cheekOf = (uCorner: number, vCorner: number) => {
    const kseed = hashCoords(177, Math.round((tx + uCorner) * 4) + salt, Math.round((ty + vCorner) * 4));
    return {
      swell: 0.022 + ((kseed >>> 3) & 3) * 0.009,
      tuck: 0.03 + ((kseed >>> 6) & 3) * 0.009,
    };
  };
  const cheekDown = (
    t: Path2D | CanvasRenderingContext2D,
    uEdge: number,
    v: number,
    out: number,
  ) => {
    // From the shoulder start (on the side, r above the skirt) the
    // cheek swells outward through the upper face and roots with a
    // tucked foot — drawn top-down.
    const ck = cheekOf(uEdge, v);
    const yTop = Y(v);
    const yG = YG(v);
    t.quadraticCurveTo(
      X(uEdge + out * ck.swell),
      yTop + (yG - yTop) * 0.16,
      X(uEdge + out * ck.swell * 0.85),
      yTop + (yG - yTop) * 0.55,
    );
    t.quadraticCurveTo(X(uEdge + out * ck.swell * 0.35), yG - (yG - yTop) * 0.12, X(uEdge - out * ck.tuck), yG);
  };
  const cheekUp = (
    t: Path2D | CanvasRenderingContext2D,
    uEdge: number,
    v: number,
    out: number,
    r: number,
  ) => {
    const ck = cheekOf(uEdge, v);
    const yTop = Y(v);
    const yG = YG(v);
    t.quadraticCurveTo(
      X(uEdge + out * ck.swell * 0.35),
      yG - (yG - yTop) * 0.12,
      X(uEdge + out * ck.swell * 0.85),
      yTop + (yG - yTop) * 0.55,
    );
    t.quadraticCurveTo(X(uEdge + out * ck.swell), yTop + (yG - yTop) * 0.16, X(uEdge), Y(v - r));
  };
  for (let i = 0; i < n; i++) {
    const g = parts[i]!;
    if (g.k !== 2) continue;
    const du = Math.sign(g.bu - g.au);
    const jA = radii[(i + n - 1) % n]!;
    const jB = radii[i]!;
    const gy = YG(g.av);
    const footA = jA > 0 ? g.au + du * cheekOf(g.au, g.av).tuck : g.au;
    const footB = jB > 0 ? g.bu - du * cheekOf(g.bu, g.bv).tuck : g.bu;
    const face = new Path2D();
    if (jA > 0) {
      face.moveTo(X(g.au), Y(g.av - jA));
      cheekDown(face, g.au, g.av, -du);
    } else {
      face.moveTo(X(g.au), Y(g.av));
      face.lineTo(X(g.au), gy);
    }
    rootTo(face, footA, g.av, footB);
    if (jB > 0) {
      cheekUp(face, g.bu, g.bv, du, jB);
    } else {
      face.lineTo(X(g.bu), Y(g.bv));
    }
    face.lineTo(X(g.au), Y(g.av - jA));
    face.closePath();
    ctx.fillStyle = HEDGE_LEAF;
    ctx.fill(face);
    const fx0 = Math.min(X(g.au), X(g.bu));
    const fw = Math.abs(X(g.bu) - X(g.au));
    // The shade band and seat shadow live INSIDE the cheeked
    // silhouette (a fillRect past a tucked foot printed square
    // corners right back), and the band's top edge rolls — two
    // keyed lobes, never a ruled line across the face.
    ctx.save();
    ctx.clip(face);
    const bseed2 = hashCoords(181, tx * 4 + Math.round(g.au + g.bu) + salt, ty * 4);
    const bh = h * s * (0.42 + ((bseed2 >>> 9) & 3) * 0.02);
    const wob = s * (0.035 + ((bseed2 >>> 4) & 3) * 0.012);
    ctx.fillStyle = shade(HEDGE_LEAF, -8);
    ctx.beginPath();
    ctx.moveTo(fx0 - s * 0.1, gy);
    ctx.lineTo(fx0 - s * 0.1, gy - bh);
    ctx.quadraticCurveTo(fx0 + fw * 0.25, gy - bh - wob, fx0 + fw * 0.5, gy - bh + wob * 0.4);
    ctx.quadraticCurveTo(fx0 + fw * 0.75, gy - bh + wob, fx0 + fw + s * 0.1, gy - bh - wob * 0.5);
    ctx.lineTo(fx0 + fw + s * 0.1, gy);
    ctx.closePath();
    ctx.fill();
    // The seat shadow reaches BELOW the ground line so the
    // rootline's hanging lobes render dark — shadowed roots
    // seating the mass into the turf, never leaf-lit fringe.
    ctx.fillStyle = 'rgba(20, 14, 26, 0.28)';
    ctx.fillRect(fx0 - s * 0.1, gy - s * 0.04, fw + s * 0.2, s * 0.18);
    // Clipped clusters break the face; tufts break the ground line.
    const nCl = Math.max(1, Math.round(fw / (s * 0.24)));
    for (let j = 0; j < nCl; j++) {
      const cseed = hashCoords(89, Math.round(fx0 / s) * 8 + j + salt, ty);
      const cx = fx0 + s * 0.06 + (((cseed >>> 4) % 100) / 100) * Math.max(0, fw - s * 0.12);
      const fh = 0.2 + ((cseed >>> 8) % 60) / 100;
      ctx.fillStyle = fh > 0.55 ? shade(HEDGE_LEAF, 7) : HEDGE_DARK;
      ctx.beginPath();
      facetBlob(ctx, cx, gy - h * s * fh, s * (0.038 + ((cseed >>> 11) & 3) * 0.011), cseed, 6, 0.85);
      ctx.fill();
    }
    ctx.restore();
    // Ground tufts sit BELOW the rootline now (round five) — little
    // clumps at the foot of the hedge, softening the seat without
    // breaking the closed silhouette ring above them.
    for (let j = 0; j < nCl; j++) {
      const tseed = hashCoords(151, Math.round(fx0 / s) * 8 + j + salt, ty);
      const tx3 = fx0 + s * 0.05 + (((tseed >>> 5) % 100) / 100) * Math.max(0, fw - s * 0.1);
      const tr = s * (0.04 + ((tseed >>> 9) & 3) * 0.013);
      ctx.fillStyle = (tseed & 4) === 0 ? HEDGE_DARK : shade(HEDGE_LEAF, -4);
      ctx.beginPath();
      facetBlob(ctx, tx3, gy + s * 0.05 + tr * 0.4, tr, tseed, 5, 0.8);
      ctx.fill();
    }
  }
  // --- the crown plane: ONE filled loop ---
  const crown = new Path2D();
  emitLoop(crown, false);
  crown.closePath();
  ctx.fillStyle = shade(HEDGE_LIT, 10);
  ctx.fill(crown);
  if (wind.l > 0.05) {
    ctx.fillStyle = `rgba(214, 236, 176, ${(0.16 * wind.l).toFixed(3)})`;
    ctx.fill(crown);
  }
  // The sunlit arris rides every skirt edge — the break where the
  // plane rolls over into the face — insetting at each shoulder so
  // the lit line dies into the roll instead of poking past it.
  ctx.strokeStyle = shade(HEDGE_LIT, 24);
  ctx.lineWidth = Math.max(1, s * 0.02);
  for (let i = 0; i < n; i++) {
    const g = parts[i]!;
    if (g.k !== 2) continue;
    const du = Math.sign(g.bu - g.au);
    const aIn = radii[(i + n - 1) % n]! * 0.8;
    const bIn = radii[i]! * 0.8;
    ctx.beginPath();
    ctx.moveTo(X(g.au + du * aIn), Y(g.av));
    skirtTo(ctx, g.au + du * aIn, g.av, g.bu - du * bIn);
    ctx.stroke();
  }
  // --- crown life, per half-tile cell: dome sheen, clump, flecks,
  // and one pillow in six flowering (all world-keyed) ---
  for (const c of cells) {
    const dseed = hashCoords(139, c.ku + salt, c.kv);
    ctx.fillStyle = 'rgba(214, 236, 176, 0.15)';
    ctx.beginPath();
    ctx.ellipse(
      X(c.u + ((((dseed >>> 3) % 24) - 12) / 100)),
      Y(c.v + ((((dseed >>> 7) % 16) - 8) / 100)),
      s * 0.15,
      syT * 0.11,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    const cseed = hashCoords(113, c.ku + salt, c.kv);
    ctx.fillStyle = (cseed & 4) === 0 ? HEDGE_DARK : shade(HEDGE_LEAF, 6);
    ctx.beginPath();
    facetBlob(
      ctx,
      X(c.u + ((((cseed >>> 4) % 30) - 15) / 100)),
      Y(c.v + ((((cseed >>> 9) % 24) - 12) / 100)),
      s * (0.045 + ((cseed >>> 12) & 3) * 0.009),
      cseed,
      6,
      0.85,
    );
    ctx.fill();
    for (let k = 0; k < 2; k++) {
      const gseed = hashCoords(97, c.ku * 4 + k + salt, c.kv);
      ctx.fillStyle = (gseed & 8) === 0 ? shade(HEDGE_LIT, 18) : shade(HEDGE_LEAF, -5);
      ctx.fillRect(
        X(c.u + ((((gseed >>> 3) % 34) - 17) / 100)),
        Y(c.v + ((((gseed >>> 8) % 26) - 13) / 100)),
        s * 0.032,
        s * 0.026,
      );
    }
    if (((hashCoords(103, c.ku + salt, c.kv) >>> 7) & 7) < 1) {
      const b0 = hashCoords(103, c.ku + salt, c.kv);
      const bu = c.u + ((((b0 >>> 10) % 20) - 10) / 100);
      const bv = c.v + ((((b0 >>> 13) % 16) - 8) / 100);
      for (let k = 0; k < 4; k++) {
        const bseed = hashCoords(103, c.ku * 8 + k + 1 + salt, c.kv);
        ctx.fillStyle = k === 3 ? HEDGE_BLOOM_LIT : HEDGE_BLOOM;
        ctx.beginPath();
        facetCircle(
          ctx,
          X(bu) + ((((bseed >>> 2) % 30) - 15) / 100) * s,
          Y(bv) + ((((bseed >>> 7) % 24) - 12) / 100) * s,
          s * (k === 3 ? 0.02 : 0.028),
          5,
          0.4,
          0.8,
        );
        ctx.fill();
      }
    }
  }
  // The shears' partings — creases along interior pillow
  // boundaries, riding the same stations the silhouette pinches.
  ctx.strokeStyle = 'rgba(24, 50, 28, 0.32)';
  ctx.lineWidth = Math.max(1, s * 0.022);
  for (const cr of vcreases) {
    const bow = ((((hashCoords(149, cr.key + salt, ty * 2) >>> 4) % 12) - 6) / 100) * s;
    ctx.beginPath();
    ctx.moveTo(X(cr.u), Y(cr.v0) + s * 0.02);
    ctx.quadraticCurveTo(X(cr.u) + bow, Y((cr.v0 + cr.v1) / 2), X(cr.u), Y(cr.v1) - s * 0.012);
    ctx.stroke();
  }
  for (const cr of hcreases) {
    const bow = ((((hashCoords(149, tx * 2 + salt, cr.key) >>> 4) % 12) - 4) / 100) * s;
    ctx.beginPath();
    ctx.moveTo(X(cr.u0) + s * 0.02, Y(cr.v));
    ctx.quadraticCurveTo(X((cr.u0 + cr.u1) / 2) + bow, Y(cr.v) + syT * 0.08, X(cr.u1) - s * 0.02, Y(cr.v));
    ctx.stroke();
  }
  // --- ONE ink pass: the outer silhouette only. Cuts never take
  // ink; face side edges drop plumb where the silhouette truly
  // turns down; the base line never inks.
  if (rend.outlineOn) {
    rend.beginStructOutline();
    ctx.beginPath();
    emitLoop(ctx, true);
    if (inkSides) {
      // The face's ink is ONE continuous stroke per face (round
      // five — the cut-off verdict): it picks up exactly where the
      // crown side's stroke stopped (r above the skirt), rolls
      // down the cheek, runs the ROOTLINE along the turf, and
      // rises up the far cheek — the silhouette ring finally
      // CLOSES around the mass. At a cut seam the root lands on
      // the station baseline, so neighboring tiles' root strokes
      // meet point-true and a merged run wears one unbroken ring.
      for (let i = 0; i < n; i++) {
        const g = parts[i]!;
        if (g.k !== 2) continue;
        const du = Math.sign(g.bu - g.au);
        const jA = radii[(i + n - 1) % n]!;
        const jB = radii[i]!;
        const footA = jA > 0 ? g.au + du * cheekOf(g.au, g.av).tuck : g.au;
        const footB = jB > 0 ? g.bu - du * cheekOf(g.bu, g.bv).tuck : g.bu;
        if (parts[(i + n - 1) % n]!.k !== 0) {
          ctx.moveTo(X(g.au), Y(g.av - jA));
          if (jA > 0) cheekDown(ctx, g.au, g.av, -du);
          else ctx.lineTo(X(g.au), YG(g.av));
        } else {
          ctx.moveTo(X(footA), YG(g.av));
        }
        rootTo(ctx, footA, g.av, footB);
        if (parts[(i + 1) % n]!.k !== 0) {
          if (jB > 0) cheekUp(ctx, g.bu, g.bv, du, jB);
          else ctx.lineTo(X(g.bu), Y(g.bv));
        }
      }
    }
    ctx.stroke();
  }
}

/**
 * THE CLIPPED GREEN, AT THE WAIST — a hedgerow, not a wall. The
 * unit is the CUSHION RUN: a hip-high bed of clipped pillows whose
 * sunlit top plane is the DOMINANT surface under the bird's-eye
 * camera (a low hedge is seen mostly from above), riding a short
 * shaded south face that seats into the turf through a tufted
 * skirt. The mass FILLS its tile in plan — skirt near the south
 * edge, crown back near the north — so a hedgerow laid against a
 * building reads as planted against it, never a fence floating in
 * grass. World-keyed half-tile lobes billow the crown so runs fold
 * seamlessly; pillow creases part the plane at those same
 * boundaries (each tile owns its west/north seam crease — one
 * crease per boundary, never doubled) and a soft dome sheen rounds
 * every cushion. E-W runs are one continuous pillowed bed; N-S
 * runs march the near-full-width crown plane up-screen; corners,
 * tees, N-S run ends, and 45° strides are anchored by fuller
 * junction cushions in the same vocabulary. THE BODY HOLDS STILL
 * (per-tile wind bend would print seam kinks a run must never
 * show); the LIFE is layered on: the wind field's long luminance
 * swell rolls light across the crowns, stray sprigs the shears
 * missed flutter above the silhouette, leaf glints breathe on the
 * plane, and one tile in six flowers on its crown. Ink is the wall
 * law live-stroked: crown silhouette always, plumb sides only at
 * true free ends, seams never — estate-length hedgerows ring
 * seamlessly.
 */
export function hedgeItem(rend: PaintHost, tile: Tile, tx: number, ty: number, game: ClientGame): DrawItem {
  const ds = rend.camera.depthScale(ty + 0.5); // Epic B (FW): billboard foreshortens by tile depth; ds=1 at q=0 → byte-identical
  const s = rend.camera.scale * ds;
  const syT = s * rend.camera.yScale;
  const p = rend.camera.worldToScreen(tx + 0.5, ty + 0.5, rend.w, rend.h);
  p.y -= game.world.elevAt(tx, ty) * ELEV_H * s;
  const h = hashCoords(41, tx, ty);
  // The skirt line sits near the tile's SOUTH edge (not the wall
  // family's +0.14 center line): with the deep crown plane above,
  // the mass fills its tile in plan and abuts whatever it dresses.
  const baseY = p.y + syT * 0.4;
  const straight = tile === Tile.Hedge;
  const gAt = (dx: number, dy: number) => game.world.groundAt(tx + dx, ty + dy);
  const cn = straight && hedgeish(rend, game, tx, ty - 1);
  const ce = straight && hedgeish(rend, game, tx + 1, ty);
  const cs = straight && hedgeish(rend, game, tx, ty + 1);
  const cw = straight && hedgeish(rend, game, tx - 1, ty);
  const dNE =
    tile === Tile.HedgeDiagNE
      ? hedgeish(rend, game, tx + 1, ty - 1)
      : straight && gAt(1, -1) === Tile.HedgeDiagNE;
  const dSW =
    tile === Tile.HedgeDiagNE
      ? hedgeish(rend, game, tx - 1, ty + 1)
      : straight && gAt(-1, 1) === Tile.HedgeDiagNE;
  const dNW =
    tile === Tile.HedgeDiagNW
      ? hedgeish(rend, game, tx - 1, ty - 1)
      : straight && gAt(-1, -1) === Tile.HedgeDiagNW;
  const dSE =
    tile === Tile.HedgeDiagNW
      ? hedgeish(rend, game, tx + 1, ty + 1)
      : straight && gAt(1, 1) === Tile.HedgeDiagNW;
  const anyDiag = dNE || dSW || dNW || dSE;
  const any = cn || ce || cs || cw || anyDiag;
  const isoEW = straight && !any;
  const isoNE = tile === Tile.HedgeDiagNE && !any;
  const isoNW = tile === Tile.HedgeDiagNW && !any;
  const xw = cw || isoEW ? p.x - s * 0.5 : p.x;
  const xe = ce || isoEW ? p.x + s * 0.5 : p.x;
  // The junction knuckle anchors corners, tees, and every diagonal —
  // a through-run needs none (its slab or strip is continuous), an
  // E-W run END needs none (the slab's clean inked free edge IS the
  // finished end, the pass-4 verdict), and a pure N-S run END now
  // CAPS ITSELF (this round's verdict: a knuckle under a strip end
  // printed a hard horizontal ink break — two objects, not one
  // hedge): the strip closes its own terminal pillow, rounded at a
  // free north end, faced and skirted at a free south end.
  const dirCount =
    (cw ? 1 : 0) + (ce ? 1 : 0) + (cn ? 1 : 0) + (cs ? 1 : 0) + (anyDiag ? 1 : 0);
  const ewAny = cw || ce || isoEW;
  const nsEnd = dirCount === 1 && (cn || cs);
  // The clipped measures — THE WAIST LAW: the face breaks at 0.5
  // tiles (the table anchor's hip band — a villager rests a hand on
  // it, the 1.15-tile body sees clean over it) and the crown plane
  // goes DEEP: 0.72 tiles in plan, so the bird's eye reads a bed of
  // pillows, not the top edge of a wall.
  const HED_H = 0.5;
  const DEEP = 0.72 * syT;
  return {
    sortY: ty + 0.8,
    drawShadow: () => {
      if (ewAny) rend.castEdgeQuad(xw, baseY, xe, baseY, 0.5);
      if (cn || nsEnd) rend.castEdgeQuad(p.x, baseY - syT * 0.5, p.x, baseY, 0.5);
      if (cs || nsEnd) rend.castEdgeQuad(p.x, baseY, p.x, baseY + syT * 0.5, 0.5);
      if (dNE || isoNE) rend.castEdgeQuad(p.x, baseY, p.x + s * 0.5, baseY - syT * 0.5, 0.5);
      if (dSW || isoNE) rend.castEdgeQuad(p.x - s * 0.5, baseY + syT * 0.5, p.x, baseY, 0.5);
      if (dNW || isoNW) rend.castEdgeQuad(p.x - s * 0.5, baseY - syT * 0.5, p.x, baseY, 0.5);
      if (dSE || isoNW) rend.castEdgeQuad(p.x, baseY, p.x + s * 0.5, baseY + syT * 0.5, 0.5);
    },
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      const tSec = performance.now() / 1000;
      // ONE WIND: one field sample serves the whole tile — bend and
      // flutter amplitude from the vector, the crown's rolling
      // light from the long luminance swell.
      const wind = windAtInto(WIND_TMP, tx + 0.5, ty + 0.5, tSec);

      // THE FUSED FOOTPRINT (round three — the hedge stops being
      // composed like a wall): this tile's whole contribution is
      // ONE plan blob — a center block with arms reaching every
      // connected seam — walked clockwise into a single typed loop
      // and handed to hedgeMassPaint. A corner, tee, or cross is a
      // SHAPE, not a pile of slabs and knuckles, so no interior
      // ink line can ever cross the mass again. Cut endpoints on
      // N/S seams carry the caterpillar pinch keyed by the shared
      // boundary index, so both tiles narrow to the identical
      // waist and the run reads as one body through every tile.
      const CU = 0.44;
      const VN = -0.32;
      const VS = 0.4;
      const KCUT = 0;
      const KCROWN = 1;
      const KSKIRT = 2;
      const KSW = 3;
      const KSE = 4;
      type MSeg = { au: number; av: number; bu: number; bv: number; k: number };
      const pinch = (vi: number, ch: number) =>
        0.045 + ((hashCoords(ch, tx * 3, vi) >>> 3) & 7) * 0.0055;
      const blobParts = (): MSeg[] => {
        const out: MSeg[] = [];
        const add = (au: number, av: number, bu: number, bv: number, k: number) =>
          out.push({ au, av, bu, bv, k });
        const pNW = -CU + pinch(ty * 2, 157);
        const pNE = CU - pinch(ty * 2, 163);
        const pSW = -CU + pinch(ty * 2 + 2, 157);
        const pSE = CU - pinch(ty * 2 + 2, 163);
        // NORTH side, west to east.
        if (cn) {
          if (cw) add(-0.5, VN, -CU, VN, KCROWN);
          add(-CU, VN, pNW, -0.5, KSW);
          add(pNW, -0.5, pNE, -0.5, KCUT);
          add(pNE, -0.5, CU, VN, KSE);
          if (ce) add(CU, VN, 0.5, VN, KCROWN);
        } else {
          add(cw ? -0.5 : -CU, VN, ce ? 0.5 : CU, VN, KCROWN);
        }
        // EAST side, north to south.
        if (ce) add(0.5, VN, 0.5, VS, KCUT);
        else add(CU, VN, CU, VS, KSE);
        // SOUTH side, east to west.
        if (cs) {
          if (ce) add(0.5, VS, CU, VS, KSKIRT);
          add(CU, VS, pSE, 0.5, KSE);
          add(pSE, 0.5, pSW, 0.5, KCUT);
          add(pSW, 0.5, -CU, VS, KSW);
          if (cw) add(-CU, VS, -0.5, VS, KSKIRT);
        } else {
          add(ce ? 0.5 : CU, VS, cw ? -0.5 : -CU, VS, KSKIRT);
        }
        // WEST side, south to north.
        if (cw) add(-0.5, VS, -0.5, VN, KCUT);
        else add(-CU, VS, -CU, VN, KSW);
        return out;
      };
      // Crown texture cells (2x2 world-keyed pillow quarters) and
      // the pillow partings: E-W-ish beds part vertically, N-S-ish
      // runs part horizontally, junctions part both ways; each
      // tile owns its west/north seam crease.
      const blobCells = () => {
        const cells: Array<{ u: number; v: number; ku: number; kv: number }> = [];
        for (let ci = 0; ci < 2; ci++)
          for (let ri = 0; ri < 2; ri++)
            cells.push({
              u: ci === 0 ? -0.25 : 0.25,
              v: ri === 0 ? -0.12 : 0.2,
              ku: tx * 2 + ci,
              kv: ty * 2 + ri,
            });
        return cells;
      };
      const blobCreases = () => {
        const vc: Array<{ u: number; v0: number; v1: number; key: number }> = [];
        const hc: Array<{ v: number; u0: number; u1: number; key: number }> = [];
        if (cw || ce || (!cn && !cs)) {
          vc.push({ u: 0, v0: VN + 0.04, v1: VS - 0.03, key: tx * 2 + 1 });
          if (cw) vc.push({ u: -0.5, v0: VN + 0.04, v1: VS - 0.03, key: tx * 2 });
        }
        if (cn || cs) {
          hc.push({ v: 0.03, u0: -CU + 0.06, u1: CU - 0.06, key: ty * 2 + 1 });
          if (cn) hc.push({ v: -0.47, u0: -CU + 0.06, u1: CU - 0.06, key: ty * 2 });
        }
        return { vc, hc };
      };
      // A lone rounded cushion in the same voice — the diagonal
      // stride's hearts and shared corner steps, and the terminal
      // read of an isolated planting.
      const cushion = (cx: number, cyv: number, halfU: number, hgt: number, saltC: number, sidesInk: boolean) => {
        const prts: MSeg[] = [
          { au: cx - halfU, av: cyv + VN, bu: cx + halfU, bv: cyv + VN, k: KCROWN },
          { au: cx + halfU, av: cyv + VN, bu: cx + halfU, bv: cyv + VS, k: KSE },
          { au: cx + halfU, av: cyv + VS, bu: cx - halfU, bv: cyv + VS, k: KSKIRT },
          { au: cx - halfU, av: cyv + VS, bu: cx - halfU, bv: cyv + VN, k: KSW },
        ];
        hedgeMassPaint(rend, 
          p.x,
          p.y,
          tx,
          ty,
          prts,
          hgt,
          wind,
          saltC,
          [{ u: cx, v: cyv + 0.04, ku: tx * 2 + saltC, kv: ty * 2 + saltC }],
          [],
          [],
          sidesInk,
        );
      };
      // Back-to-front: north diagonal cushions, the fused blob (or
      // the diagonal tile's heart cushion), then south cushions.
      const diagC: Array<[number, number, number]> = [];
      if (dNE || isoNE) diagC.push([0.5, -0.5, 8]);
      if (dNW || isoNW) diagC.push([-0.5, -0.5, 10]);
      if (isoNE) diagC.push([-0.5, 0.5, 12]);
      if (isoNW) diagC.push([0.5, 0.5, 14]);
      diagC.sort((a, b) => a[1] - b[1]);
      for (const [fx, fy, k] of diagC) {
        if (fy < 0) cushion(fx, fy, 0.34, 0.46, k, false);
      }
      if (straight) {
        const { vc, hc } = blobCreases();
        hedgeMassPaint(rend, p.x, p.y, tx, ty, blobParts(), HED_H, wind, 0, blobCells(), vc, hc);
      } else {
        cushion(0, 0, 0.48, 0.52, 7, true);
      }
      for (const [fx, fy, k] of diagC) {
        if (fy >= 0) cushion(fx, fy, 0.34, 0.46, k, false);
      }

      // THE SHEARS MISSED A FEW: stray sprigs above the crown, the
      // one part of the body free to ride the wind — each a short
      // upright shoot with leaf ticks, bending on the field plus
      // its own flutter voice (never a shared clock). The tip lean
      // is CAPPED to a fraction of the shoot's own length — an
      // uncapped field bend laid pass-2's sprigs flat, reading as
      // rust scratches across the crowns.
      const nSpr = 2 + (h & 1);
      for (let i = 0; i < nSpr; i++) {
        const sseed = hashCoords(127, tx * 8 + i, ty);
        const sx2 = p.x + ((((sseed >>> 3) % 84) - 42) / 100) * s;
        // Sprigs stand ON the crown plane now — rooted between the
        // cushions, poking above the back silhouette.
        const sy2 = baseY - HED_H * s - DEEP * (0.3 + (((sseed >>> 9) % 55) / 100));
        const len = s * (0.09 + ((sseed >>> 6) & 3) * 0.02);
        const flut =
          Math.sin(tSec * (1.9 + (sseed % 5) * 0.16) + (sseed % 100) * 0.4) *
          (0.4 + Math.min(1, Math.abs(wind.s)));
        const lean = Math.max(-0.45, Math.min(0.45, wind.bx * 0.22 + flut * 0.2)) * len;
        const tipX = sx2 + lean;
        ctx.strokeStyle = shade(HEDGE_LEAF, -4);
        ctx.lineWidth = Math.max(1, s * 0.018);
        ctx.beginPath();
        ctx.moveTo(sx2, sy2 + len);
        ctx.quadraticCurveTo(sx2 + lean * 0.35, sy2 + len * 0.45, tipX, sy2);
        ctx.stroke();
        ctx.fillStyle = (sseed & 8) === 0 ? HEDGE_LIT : shade(HEDGE_LEAF, 10);
        ctx.fillRect(tipX - s * 0.022, sy2 - s * 0.018, s * 0.044, s * 0.036);
      }
    },
  };
}

/**
 * THE GARDEN WICKET — the hedge gate, round four. The living arch
 * DIED here: a 1.42-tile trained span over a 0.5-tile hedgerow was
 * nearly three times the mass it bridged — the out-of-scale tower
 * the user called out. What a hip-high garden actually gates its
 * path with is a hip-high gate: the hedgerow itself runs up to two
 * post cushions AT ITS OWN HEIGHT AND PLAN (their outer edges are
 * CUTS, so the neighbor runs fuse in seamlessly — the gate is the
 * hedge, thickened at the gap), a waist-high timber wicket swings
 * in the opening (the one piece of carpentry the garden allows,
 * riding the door law wholesale — doorOpenness eases the swing, a
 * locked rattle shakes it), and a clipped FINIAL BALL on each post
 * crown says "gatepost" in the topiary's own voice instead of with
 * height. N-S gates keep the same body edge-on: two run-width
 * stubs with cut seams, the wicket a paled bar between them.
 */
export function hedgeGateItem(rend: PaintHost, tile: Tile, tx: number, ty: number, game: ClientGame): DrawItem {
  const ds = rend.camera.depthScale(ty + 0.5); // Epic B (FW): billboard foreshortens by tile depth; ds=1 at q=0 → byte-identical
  const s = rend.camera.scale * ds;
  const syT = s * rend.camera.yScale;
  const p = rend.camera.worldToScreen(tx + 0.5, ty + 0.5, rend.w, rend.h);
  p.y -= game.world.elevAt(tx, ty) * ELEV_H * s;
  // The arch stands on the hedgerow's own ground line (the south-
  // skirt law) so piers and run meet foot-true, and its trained
  // span carries the same deep plan as the runs it bridges.
  const baseY = p.y + syT * 0.4;
  const open = doorInfo(tile)!.open;
  const vertical =
    (hedgeish(rend, game, tx, ty - 1) || hedgeish(rend, game, tx, ty + 1)) &&
    !(hedgeish(rend, game, tx + 1, ty) || hedgeish(rend, game, tx - 1, ty));
  return {
    sortY: ty + (vertical ? 0.75 : 0.8),
    drawShadow: () => {
      if (vertical) rend.castEdgeQuad(p.x, baseY - syT * 0.5, p.x, baseY + syT * 0.5, 0.6);
      else rend.castEdgeQuad(p.x - s * 0.5, baseY, p.x + s * 0.5, baseY, 0.6);
    },
    draw: () => {
      // Draw-time ctx capture: the outline pass swaps rend.ctx.
      const ctx = rend.ctx;
      const tSec = performance.now() / 1000;
      const wind = windAtInto(WIND_TMP, tx + 0.5, ty + 0.5, tSec);
      const o = Math.min(1, rend.doorOpenness(tx, ty, open));
      const shakeX = rend.doorShakeAt(tx, ty) * s * 0.03;
      if (shakeX !== 0) {
        ctx.save();
        ctx.translate(shakeX, 0);
      }

      // THE GATE IS THE HEDGE, THICKENED AT THE GAP (round four —
      // the towering arch and its inked pillar towers died as out
      // of scale): each post is a cushion at the RUN'S OWN height
      // and plan, and the edge that meets a continuing neighbor is
      // a CUT — no ink, no profile break — so the hedgerow flows
      // straight into its gateposts. Only the wicket's timber and
      // the finial balls say "gate".
      const VN = -0.32;
      const VS = 0.4;
      const HIP = 0.5;
      const pillar = (
        u0: number,
        v0: number,
        u1: number,
        v1: number,
        hgt: number,
        saltC: number,
        cutSide: 'n' | 's' | 'w' | 'e' | 'none',
      ) => {
        const parts: Array<{ au: number; av: number; bu: number; bv: number; k: number }> = [
          { au: u0, av: v0, bu: u1, bv: v0, k: cutSide === 'n' ? 0 : 1 },
          { au: u1, av: v0, bu: u1, bv: v1, k: cutSide === 'e' ? 0 : 4 },
          { au: u1, av: v1, bu: u0, bv: v1, k: cutSide === 's' ? 0 : 2 },
          { au: u0, av: v1, bu: u0, bv: v0, k: cutSide === 'w' ? 0 : 3 },
        ];
        hedgeMassPaint(rend, 
          p.x,
          p.y,
          tx,
          ty,
          parts,
          hgt,
          wind,
          saltC,
          [{ u: (u0 + u1) / 2, v: (v0 + v1) / 2 - 0.06, ku: tx * 2 + saltC, kv: ty * 2 + saltC }],
          [],
          [],
        );
      };
      // The gatepost's clipped ball — a topiary finial seated on
      // the post crown. At finial scale (~10px) a rough faceted
      // blob plus ink ring read as a snarled curl on the first
      // sheet, so the ball is a CLEAN circle: seat shadow, globe,
      // one lit crescent, its own thin ink ring — the gardener's
      // most-clipped shape on the whole hedgerow.
      const finial = (fu: number, fv: number, saltC: number) => {
        const fseed = hashCoords(191, tx * 8 + saltC, ty * 8 + Math.round(fv * 4));
        const r0 = s * (0.12 + ((fseed >>> 3) & 3) * 0.008);
        const bx = p.x + fu * s;
        const cy0 = p.y + fv * syT - HIP * s;
        const by = cy0 - r0 * 0.7;
        ctx.fillStyle = 'rgba(24, 50, 28, 0.3)';
        ctx.beginPath();
        ctx.ellipse(bx, cy0 + r0 * 0.12, r0 * 0.8, r0 * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = HEDGE_LEAF;
        ctx.beginPath();
        ctx.arc(bx, by, r0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = shade(HEDGE_LIT, 14);
        ctx.beginPath();
        ctx.arc(bx - r0 * 0.24, by - r0 * 0.26, r0 * 0.52, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = HEDGE_DARK;
        ctx.beginPath();
        ctx.arc(bx + r0 * 0.3, by + r0 * 0.32, r0 * 0.2, 0, Math.PI * 2);
        ctx.fill();
        if (rend.outlineOn) {
          rend.beginStructOutline();
          ctx.beginPath();
          ctx.arc(bx, by, r0, 0, Math.PI * 2);
          ctx.stroke();
        }
      };

      // The timber wicket: three pales under a capped top rail,
      // one diagonal brace — waist-high, light against the green.
      const wicket = (hingeX: number, dir: number, width: number, dim: number) => {
        if (width < s * 0.05) return;
        const x0 = dir > 0 ? hingeX : hingeX - width;
        const yBot = baseY - 0.03 * s;
        const yTop = baseY - 0.58 * s;
        const paleW = Math.min(s * 0.05, width * 0.22);
        for (let i = 0; i < 3; i++) {
          const px2 = x0 + (width - paleW) * (i / 2);
          ctx.fillStyle = shade(FENCE_POST, 4 + dim);
          ctx.fillRect(px2, yTop + s * 0.05, paleW, yBot - yTop - s * 0.05);
          ctx.fillStyle = shade(FENCE_POST, 18 + dim);
          ctx.beginPath();
          ctx.moveTo(px2, yTop + s * 0.05);
          ctx.lineTo(px2 + paleW / 2, yTop);
          ctx.lineTo(px2 + paleW, yTop + s * 0.05);
          ctx.closePath();
          ctx.fill();
        }
        for (const ry of [yTop + s * 0.14, yBot - s * 0.16]) {
          ctx.fillStyle = shade(FENCE_RAIL, 8 + dim);
          ctx.fillRect(x0, ry, width, s * 0.05);
          ctx.fillStyle = shade(FENCE_RAIL, 22 + dim);
          ctx.fillRect(x0, ry, width, s * 0.016);
        }
        ctx.strokeStyle = shade(FENCE_RAIL, -6 + dim);
        ctx.lineWidth = Math.max(1, s * 0.032);
        ctx.beginPath();
        ctx.moveTo(x0 + s * 0.01, yBot - s * 0.14);
        ctx.lineTo(x0 + width - s * 0.01, yTop + s * 0.16);
        ctx.stroke();
        if (rend.outlineOn) {
          rend.beginStructOutline();
          ctx.strokeRect(x0, yTop, width, yBot - yTop);
        }
      };

      if (!vertical) {
        // THE WICKET swings in the post-framed gap; the posts go
        // down after so the leaves hinge behind their inner faces,
        // and the finials crown the posts last.
        const leafFull = 0.2 * s;
        const wNow = leafFull * (1 - o * 0.9);
        wicket(p.x - s * 0.2, 1, wNow, Math.round(-20 * o));
        wicket(p.x + s * 0.2, -1, wNow, Math.round(-20 * o));
        const westH = hedgeish(rend, game, tx - 1, ty);
        const eastH = hedgeish(rend, game, tx + 1, ty);
        pillar(-0.5, VN, -0.2, VS, HIP, 21, westH ? 'w' : 'none');
        pillar(0.2, VN, 0.5, VS, HIP, 22, eastH ? 'e' : 'none');
        finial(-0.35, 0.0, 21);
        finial(0.35, 0.0, 22);
      } else {
        // The vertical gateway: two run-width STUBS cut from the
        // hedge itself — their seam edges are cuts (the neighbor
        // strips fuse in without a line), their gap faces wear the
        // full face kit, and the paled bar bars the space between.
        // Edge-on the notch and the timber bar carry the gate read
        // alone — a finial on the column axis stacked over the bar
        // printed a lollipop, so the vertical stubs go bare.
        pillar(-0.44, -0.5, 0.44, -0.18, HIP, 21, 'n');
        if (o < 0.98) {
          // Shut: the wicket edge-on, a paled strip barring the
          // gap, retracting toward its north hinge as it swings.
          const hw2 = 0.055 * s;
          const top = p.y - 0.18 * syT - 0.56 * s;
          const bot = top + (p.y + 0.18 * syT - 0.02 * s - top) * (1 - o);
          ctx.fillStyle = shade(FENCE_POST, 2);
          ctx.fillRect(p.x - hw2, top, hw2 * 2, bot - top);
          ctx.fillStyle = shade(FENCE_POST, 16);
          ctx.fillRect(p.x - hw2, top, s * 0.022, bot - top);
          if (rend.outlineOn) {
            rend.beginStructOutline();
            ctx.strokeRect(p.x - hw2, top, hw2 * 2, bot - top);
          }
        }
        if (o > 0.02) {
          const oo = Math.sin((o * Math.PI) / 2);
          wicket(p.x + 0.06 * s, 1, 0.6 * s * oo, 0);
        }
        pillar(-0.44, 0.18, 0.44, 0.5, HIP, 22, 's');
      }
      if (shakeX !== 0) ctx.restore();
    },
  };
}

/**
 * Palisade connectivity: the war camp's wall merges ONLY with its
 * own kind (the separate-masonry law, third family) — a goblin
 * stockade dying into a town fence or house wall would read as one
 * builder's work, and they are not.
 */
export function palisadeish(rend: PaintHost, game: ClientGame, x: number, y: number): boolean {
  const t = game.world.groundAt(x, y);
  return t !== undefined && PALISADE_TILES.has(t as Tile);
}

/**
 * Iron-fence connectivity: the graveyard's wall merges ONLY with
 * its own kind (the separate-masonry law, FIFTH family) — a
 * smith's railing dying into a timber fence or clipped green would
 * read as one builder's work, and a smith is neither carpenter nor
 * gardener.
 */
export function ironish(rend: PaintHost, game: ClientGame, x: number, y: number): boolean {
  const t = game.world.groundAt(x, y);
  return t !== undefined && IRON_FENCE_TILES.has(t as Tile);
}

/**
 * Hedge connectivity: the garden's wall merges ONLY with its own
 * kind (the separate-masonry law, FOURTH family) — clipped green
 * dying into a timber fence or house wall would read as one
 * builder's work, and a gardener is not a carpenter.
 */
export function hedgeish(rend: PaintHost, game: ClientGame, x: number, y: number): boolean {
  const t = game.world.groundAt(x, y);
  return t !== undefined && HEDGE_TILES.has(t as Tile);
}
