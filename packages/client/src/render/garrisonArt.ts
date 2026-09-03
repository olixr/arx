/**
 * THE GARRISON'S MASONRY — the curtain wall's stone, merlons, wall and
 * diagonal runs, and the gates.
 * Moved verbatim off the Renderer class (foundations F2 wave B); the
 * painters reach the engine through the shared PaintHost slice.
 */
import { ClientGame } from '../game/clientGame.js';
import { ELEV_H } from './elevPick.js';
import { packTile } from './interiors.js';
import { GARRISON_H, GAR_LEAF, MERLON_H, WALL_STUB, stone01 } from './paintVocab.js';
import { shade } from './rig.js';
import { faceBand, faceFill, faceSeam } from './structureFace.js';
import { Tile, diagWallInfo, doorInfo, hashCoords } from '@arx/shared';
import type { DrawItem } from './renderer.js';
import { wallHangings } from './wallHungArt.js';
import type { PaintHost } from './paintHost.js';

/** Rampart ashlar — cooler and deeper than house stone on purpose. */
const GAR_FACE = '#544e61';

/** Portcullis and strap iron. */
const GAR_IRON = '#2b2735';

/** Sun-catching merlon caps — the lightest stone in the kit. */
const GAR_MERLON_TOP = '#847e91';

/** The battered talus footing the curtain flares into. */
const GAR_PLINTH = '#3d3849';

/** The wall-walk flags between the parapets. */
const GAR_TOP = '#655f72';

/** Dressed trim for gate piers, thresholds, and side-gate landings. */
const GAR_TRIM = '#7b7590';


/**
 * Great-ashlar face masonry, drawn in the CURRENT frame with the
 * base line at y = 0 and the face rising to -hs (callers set up
 * plain or sheared frames — a diagonal's courses land parallel to
 * its hypotenuse exactly like paintFaceBands). The block grid is
 * WORLD-ANCHORED: joints and per-block tints key off world-space
 * block indices, so a course runs unbroken across every tile of a
 * run and two neighbours can never disagree about a joint.
 */
export function paintGarrisonMasonry(rend: PaintHost, 
  x0: number,
  w2: number,
  hs: number,
  s: number,
  worldX: number,
  tilesW: number,
  tx: number,
  ty: number,
  whT: number,
  loops: boolean,
): void {
  const ctx = rend.ctx;
  ctx.fillStyle = GAR_FACE;
  ctx.fillRect(x0, -hs, w2, hs);
  // The battered talus: a flared footing read in flat vector — a
  // darker base mass, a half-tone batter band, and one sun-caught
  // chamfer arris where the slope meets the face.
  const plinthH = Math.min(s * 0.55, hs * 0.42);
  ctx.fillStyle = GAR_PLINTH;
  ctx.fillRect(x0, -plinthH, w2, plinthH);
  ctx.fillStyle = shade(GAR_PLINTH, 10);
  ctx.fillRect(x0, -plinthH, w2, plinthH * 0.4);
  ctx.fillStyle = 'rgba(255, 236, 200, 0.12)';
  ctx.fillRect(x0, -plinthH, w2, s * 0.05);
  // Great ashlar courses above the talus, at absolute stone height —
  // a taller rampart lays MORE courses, never stretched ones. Blocks
  // half again the house bond: siege masonry, cut big.
  const cp = s * 0.5;
  const bwW = 0.68; // block width in world tiles
  const ppt = w2 / tilesW; // px per world tile along the base
  const jw = Math.max(1, s * 0.03);
  const topLimit = hs * 0.99;
  const jointCol = 'rgba(20, 14, 28, 0.4)';
  for (let ci = 0; ; ci++) {
    const yb = -plinthH - ci * cp;
    if (-yb >= topLimit) break;
    const yt = Math.max(yb - cp, -topLimit);
    const off = (ci % 2) * (bwW / 2);
    const first = Math.floor((worldX - off) / bwW);
    for (let bi = first; ; bi++) {
      const wx0 = bi * bwW + off;
      const px0 = x0 + (wx0 - worldX) * ppt;
      if (px0 >= x0 + w2) break;
      const px1 = Math.min(x0 + w2, px0 + bwW * ppt);
      const cx0 = Math.max(x0, px0);
      if (px1 <= cx0) continue;
      // Per-block tone whisper, dealt by the world-keyed stone hash
      // — the same deterministic masonry law as the grand stairs.
      const t01 = stone01(bi, ci, 733);
      ctx.fillStyle = shade(GAR_FACE, Math.round((t01 - 0.5) * 15));
      ctx.fillRect(cx0, yt, px1 - cx0, yb - yt);
      // Head joint on the block's west edge, inside the face only.
      if (px0 > x0 + 0.5) {
        ctx.fillStyle = jointCol;
        ctx.fillRect(px0 - jw / 2, yt, jw, yb - yt);
      }
    }
    // Bed joint under the course, full span — a mortar bed never
    // breaks at a tile seam.
    ctx.fillStyle = jointCol;
    ctx.fillRect(x0, yb - jw, w2, jw);
  }
  // The string course: one projecting dressed band at shoulder
  // height — the classic curtain-wall line. Only a full-standing
  // face carries it; a veil-cut stub sheds it with the parapet.
  if (hs > s * 2.5) {
    const sy = -s * 2.2;
    ctx.fillStyle = shade(GAR_FACE, 20);
    ctx.fillRect(x0, sy - s * 0.13, w2, s * 0.13);
    ctx.fillStyle = 'rgba(255, 236, 200, 0.14)';
    ctx.fillRect(x0, sy - s * 0.13, w2, s * 0.03);
    ctx.fillStyle = 'rgba(18, 12, 26, 0.32)';
    ctx.fillRect(x0, sy, w2, s * 0.045);
  }
  // Arrow loops, dealt sparsely by hash on straight curtain tiles —
  // a garrison watches its approaches. Vertical slit + short cross
  // arm in a dressed surround, set above the string course.
  if (loops && hs > s * 2.9) {
    const hl = hashCoords(419, tx, ty);
    if (hl % 10 < 4) {
      const lxc = x0 + w2 * (0.34 + ((hl >>> 4) % 33) / 100);
      ctx.fillStyle = shade(GAR_FACE, 12);
      ctx.fillRect(lxc - s * 0.1, -s * 2.95, s * 0.2, s * 0.74);
      ctx.fillStyle = 'rgba(10, 8, 16, 0.88)';
      ctx.fillRect(lxc - s * 0.032, -s * 2.9, s * 0.064, s * 0.62);
      ctx.fillRect(lxc - s * 0.11, -s * 2.66, s * 0.22, s * 0.055);
      ctx.fillStyle = 'rgba(255, 236, 200, 0.14)';
      ctx.fillRect(lxc - s * 0.09, -s * 2.28, s * 0.18, s * 0.035);
    }
  }
  // Weather: a rain streak off the parapet drainage, and the damp
  // line where the talus holds the ground's moisture.
  const hw2 = hashCoords(431, tx, ty);
  if ((hw2 & 3) === 1) {
    ctx.fillStyle = 'rgba(20, 14, 28, 0.1)';
    ctx.fillRect(x0 + w2 * ((10 + ((hw2 >>> 3) % 70)) / 100), -hs, s * 0.07, s * 0.9);
  }
  // Ambient-occlusion seam where the face meets the ground.
  ctx.fillStyle = 'rgba(18, 12, 26, 0.3)';
  ctx.fillRect(x0, -s * 0.07, w2, s * 0.07);
}

/**
 * One parapet merlon — a square-hewn tooth standing mh above the
 * wall-walk. Drawn inside the crown's height layer in plan coords:
 * (mx0, my0) is the tooth's plan footprint (mw × md); the outward
 * face rises from the footprint's south edge and the cap plane
 * lifts by mh, so the 2.5D top-plane law holds at parapet scale.
 */
export function merlonBox(rend: PaintHost, 
  mx0: number,
  my0: number,
  mw: number,
  md: number,
  mh: number,
  faceTone: string,
): void {
  const ctx = rend.ctx;
  const my1 = my0 + md;
  // The tooth's face — the height read.
  ctx.fillStyle = faceTone;
  ctx.fillRect(mx0, my1 - mh, mw, mh);
  // Contact shade where the face stands on the walk.
  ctx.fillStyle = 'rgba(18, 12, 26, 0.22)';
  ctx.fillRect(mx0, my1 - Math.max(1, mh * 0.14), mw, Math.max(1, mh * 0.14));
  // Cap plane, lifted by the tooth's own height: lit near arris,
  // shaded far edge — the crate-lid treatment at parapet scale.
  ctx.fillStyle = GAR_MERLON_TOP;
  ctx.fillRect(mx0, my0 - mh, mw, md);
  ctx.fillStyle = 'rgba(18, 12, 26, 0.2)';
  ctx.fillRect(mx0, my0 - mh, mw, md * 0.24);
  ctx.fillStyle = 'rgba(255, 236, 200, 0.18)';
  ctx.fillRect(mx0, my1 - mh - md * 0.18, mw, md * 0.18);
}

/**
 * A straight curtain-wall tile. Same structural skeleton as
 * wallItem (shared-edge snapping, rear riser, one crown layer) with
 * the garrison dialect throughout — and the crenellated struct
 * outline: the crown silhouette steps over every parapet tooth, so
 * even at far zoom the black edge itself reads castellated.
 */
export function garrisonWallItem(rend: PaintHost, 
  tile: Tile,
  tx: number,
  ty: number,
  game: ClientGame,
  whT: number,
): DrawItem {
  const ctx = rend.ctx;
  const s = rend.camera.scale * rend.camera.depthScale(ty); // B-3 depth thread
  const p = rend.camera.worldToScreen(tx, ty, rend.w, rend.h);
  const elevLift = game.world.elevAt(tx, ty) * ELEV_H * s;
  p.y -= elevLift;
  const n = rend.garrisonish(game, tx, ty - 1);
  const e = rend.garrisonish(game, tx + 1, ty);
  const sw = rend.garrisonish(game, tx, ty + 1);
  const w = rend.garrisonish(game, tx - 1, ty);
  const syT = s * rend.camera.yScale;
  // B-FW WALL TRAPEZOID (mirrors renderer.wallItem / cliffArt): a curtain
  // tile is a real box, not a single-depth billboard. Its NORTH (far)
  // edge rides row `ty`; its SOUTH (near/face) edge — the face you walk
  // behind — rides row `ty+1`, which under the lean projects to a
  // DIFFERENT screen y (row spacing is nonlinear in depth) and a WIDER
  // screen x (near rows spread from the vanishing centre). Project that
  // south row for real so tile(ty)'s south edge lands exactly where
  // tile(ty+1)'s north edge does (same world corner ⇒ same projection ⇒
  // no gap). The far edge lifts by ITS OWN depthScale (whT·s = hsN), the
  // near edge by the south row's (whT·sS = hs), so the crown seats on the
  // leaned face top. At q=0 worldToScreen is exact-affine, sS === s, the
  // south row projects to p.x / p.y+syT, and every value below collapses
  // to today's single-depthScale rect — byte-identical (pinned on the
  // q===0 branch, no reassociated arithmetic).
  const q = rend.camera.q;
  const sS = q === 0 ? s : rend.camera.scale * rend.camera.depthScale(ty + 1);
  const hsN = whT * s; // NORTH (far) edge lift — today's `hs`
  const hs = whT * sS; // SOUTH (near/face) edge lift
  let swx: number;
  let sex: number;
  let southBaseY: number;
  if (q === 0) {
    swx = p.x;
    sex = p.x + s;
    southBaseY = p.y + syT;
  } else {
    const pS = rend.camera.worldToScreen(tx, ty + 1, rend.w, rend.h);
    swx = pS.x; // world x = tx  at row ty+1
    sex = pS.x + sS; // world x = tx+1 at row ty+1
    southBaseY = pS.y - elevLift; // same elevation basis as p.y
  }
  // THE SHARED-EDGE LAW: run-mates meet on one pixel-snapped edge
  // (the wallItem seam lesson — a bleed on a joined side prints a
  // pale AA column up the face at every joint). Snapped on THE
  // DEVICE GRID, never in CSS space (fractional-dpr seam lesson).
  // Band-bake stretch ends underlap their outer joined edge exactly
  // like wallItem (THE UNDERLAP, bakeBleedW).
  const gKey = packTile(tx, ty);
  const gBleedW = rend.bakeBleedW === gKey;
  const gBleedE = rend.bakeBleedE === gKey;
  // NORTH footprint edges (crown far side) — the old x0/x1/y0 basis.
  const xN0 = w ? (gBleedW ? p.x - rend.bakeBleedPx : rend.camera.snapPx(p.x)) : p.x - 0.25;
  const xN1 = e ? (gBleedE ? p.x + s + rend.bakeBleedPx : rend.camera.snapPx(p.x + s)) : p.x + s + 0.25;
  // SOUTH footprint edges (crown near side / face foot). A south corner
  // here is the SAME projected world corner the tile one row south uses
  // for its north corner ⇒ the snapped edges coincide.
  const x0 = w ? (gBleedW ? swx - rend.bakeBleedPx : rend.camera.snapPx(swx)) : swx - 0.25;
  const x1 = e ? (gBleedE ? sex + rend.bakeBleedPx : rend.camera.snapPx(sex)) : sex + 0.25;
  const y0 = n ? rend.camera.snapPx(p.y) : p.y - 0.25;
  const y1 = sw ? rend.camera.snapPx(southBaseY) : southBaseY + 0.25;
  const nH = n ? rend.garrisonHeightAt(game, tx, ty - 1) : whT;
  // Parapet teeth melt with the veil: full at standing height, gone
  // at the stub, easing between on the same continuous cut.
  const mkK = Math.max(0, Math.min(1, (whT - WALL_STUB) / (GARRISON_H - WALL_STUB)));
  const mh = MERLON_H * s * mkK;
  const md = syT * 0.34;
  const mw = s * 0.34;
  const cs = [0.25, 0.75]; // world-phase tooth centers, 2 per tile
  // Crown top edges: north lifts by hsN, south by hs (== the face top).
  const cNy = y0 - hsN;
  const cSy = y1 - hs;
  // Lift of the crown plane at depth fraction v (0 = north .. 1 = south);
  // used to seat the flank teeth and their ink on the leaned plane. At
  // q=0 hs === hsN so liftAt(v) === whT·s for every v (byte-identical).
  const liftAt = (v: number): number => hsN + (hs - hsN) * v;

  return {
    sortY: ty + 1,
    drawShadow: sw
      ? undefined
      : () => rend.castEdgeQuad(x0, southBaseY, x1, southBaseY, whT),
    draw: () => {
      // South face: the great ashlar curtain, on the projected south
      // plane (x0..x1 at southBaseY, rising by the near lift hs).
      if (!sw) {
        ctx.save();
        ctx.translate(0, southBaseY);
        paintGarrisonMasonry(rend,
          x0,
          x1 - x0,
          hs,
          sS,
          tx + (x0 - p.x) / s,
          (x1 - x0) / s,
          tx,
          ty,
          whT,
          true,
        );
        // The curtain flies the crown's cloth: banners on the keep.
        wallHangings(rend, game, tx, ty, p.x, s, whT, true);
        ctx.restore();
      }
      // REAR RISER: the interior back face exposed when the curtain
      // ahead sinks lower — rides the crown's FAR (north) edge.
      if (n && nH < whT - 0.04) {
        const yRTop = p.y - hsN;
        const yRBot = p.y - syT - nH * s;
        if (yRBot > yRTop + 0.5) {
          ctx.fillStyle = shade(GAR_FACE, -14);
          ctx.fillRect(xN0, yRTop, xN1 - xN0, yRBot - yRTop);
        }
      }
      // TRUE SIDE FACES (B-FW side walls): a receding vertical face on
      // every EXPOSED footprint edge with no south face — the deck model
      // (deckStandFace). A N–S curtain run is a column of tiles each with
      // a wall to its south, so the south-face block above never runs and,
      // at q>0, the wall-walk crown caps foreshorten and lift up-screen,
      // leaving a SEE-THROUGH band under each crown where the side of the
      // rampart should be. Fill it with a real trapezoid down each exposed
      // edge, from the crown's matching slanted edge to the ground, so the
      // curtain reads solid. Spans the crown's own snapped corners (xN*/x*
      // at hsN/hs) ⇒ consecutive tiles' faces meet seam-free and seat under
      // the crown. Height honours the live whT (the veil sink). GUARDED
      // behind q>0: at q=0 the crowns tile the column and cover it, so
      // nothing new is emitted — byte-identical to today.
      if (q > 0) {
        const cp = s * 0.5; // ashlar course pitch (matches paintGarrisonMasonry)
        const jw = Math.max(1, s * 0.03);
        const jointCol = 'rgba(20, 14, 28, 0.4)';
        const sideFace = (
          ax: number,
          ay: number,
          aLift: number,
          bx: number,
          by: number,
          bLift: number,
          litD: number,
        ): void => {
          // THE STRUCTURE FACE (screen-space shape): corners are already
          // projected + snapped and the lifts pre-foreshortened, so the
          // shared trapezoid/band/seam helpers draw them verbatim.
          faceFill(ctx, ax, ay, aLift, bx, by, bLift, shade(GAR_FACE, litD));
          const band = (f0: number, f1: number, col: string): void =>
            faceBand(ctx, ax, ay, aLift, bx, by, bLift, f0, f1, col);
          const hline = (f: number, wpx: number, col: string): void =>
            faceSeam(ctx, ax, ay, aLift, bx, by, bLift, f, wpx, col);
          // The battered talus footing wraps the corner.
          const plinthH = Math.min(s * 0.55, hs * 0.42);
          band(0, plinthH / hs, shade(GAR_PLINTH, litD));
          // Great ashlar bed joints at absolute stone pitch above the talus.
          for (let ci = 1; ; ci++) {
            const lift = plinthH + ci * cp;
            if (lift >= hs * 0.99) break;
            hline(lift / hs, jw, jointCol);
          }
          // The string course band, only on a full-standing face.
          if (hs > s * 2.5) band((hs - s * 2.2) / hs, (hs - s * 2.07) / hs, shade(GAR_FACE, litD + 20));
        };
        // West edge — SW→NW, exposed with no wall west. Sunlit.
        if (!w) sideFace(xN0, y0, hsN, x0, y1, hs, 6);
        // East edge — SE→NE, exposed with no wall east. Shaded.
        if (!e) sideFace(xN1, y0, hsN, x1, y1, hs, -12);
        // North back face — the curtain's outward back (flat rectangle,
        // both corners on row ty). Mostly hidden by the crown under lean;
        // skipped where the REAR RISER already anchors a sunk neighbour.
        if (!n) sideFace(xN0, y0, hsN, xN1, y0, hsN, -6);
      }
      // CROWN: the wall-walk as a TRUE trapezoid drawn in absolute screen
      // coords — its NORTH edge (xN0..xN1 at cNy, lifted by the far
      // depthScale) joins its SOUTH edge (x0..x1 at cSy, the near
      // depthScale == the face top). Because each edge is the projected
      // shared world corner, tile(ty)'s south crown edge coincides with
      // tile(ty+1)'s north edge (and E–W via the snapped footprint), so
      // no gap is representable. At q=0 hsN===hs, the rows project to the
      // same width, and the trapezoid collapses to today's lifted rect
      // vertex-for-vertex (byte-identical).
      ctx.fillStyle = GAR_TOP;
      ctx.beginPath();
      ctx.moveTo(xN0, cNy);
      ctx.lineTo(xN1, cNy);
      ctx.lineTo(x1, cSy);
      ctx.lineTo(x0, cSy);
      ctx.closePath();
      ctx.fill();
      // Sparse walk flags — world-hashed so the paving never grids. Each
      // rides the crown plane: a seam leans N→S (a thin quad between the
      // projected edges), a bed line spans the width at its own depth.
      // At q=0 both collapse to today's lifted fillRects.
      const hf = hashCoords(457, tx, ty);
      ctx.fillStyle = 'rgba(20, 14, 28, 0.16)';
      if ((hf & 3) !== 0) {
        const fx = 0.2 + (hf % 60) / 100;
        const fw = Math.max(1, s * 0.03);
        const nx = p.x + s * fx;
        const sx = swx + sS * fx;
        ctx.beginPath();
        ctx.moveTo(nx, y0 - hsN);
        ctx.lineTo(nx + fw, y0 - hsN);
        ctx.lineTo(sx + fw, y1 - hs);
        ctx.lineTo(sx, y1 - hs);
        ctx.closePath();
        ctx.fill();
      }
      if ((hf & 4) === 0) {
        const fy = 0.3 + ((hf >>> 6) % 40) / 100;
        const ly = p.y + syT * fy - liftAt(fy);
        const lxW = xN0 + (x0 - xN0) * fy;
        const lxE = xN1 + (x1 - xN1) * fy;
        ctx.fillRect(lxW, ly, lxE - lxW, Math.max(1, s * 0.028));
      }
      // Sun-lit south lip: the embrasure sill between the teeth, on the
      // near crown edge.
      if (!sw) {
        ctx.fillStyle = shade(GAR_TOP, 16);
        ctx.fillRect(x0, cSy - s * 0.08, x1 - x0, s * 0.08);
      }
      // Parapet teeth on every EXPOSED crown edge, up-screen edges first
      // so southern teeth overdraw honestly. North teeth ride the far
      // edge (cNy, x from p.x+s·c); south teeth ride the near edge (y1−hs,
      // x spread to the south row swx+sS·c); flank teeth march the depth,
      // each seated on the crown plane at its own depth (lift interpolated
      // N→S). All collapse to today's lifted positions at q=0.
      if (mh > s * 0.05) {
        if (!n)
          for (const c of cs)
            merlonBox(rend, p.x + s * c - mw / 2, y0 - hsN, mw, md, mh, shade(GAR_FACE, -16));
        if (!w)
          for (const c of cs)
            merlonBox(rend,
              xN0 + (x0 - xN0) * c,
              p.y + syT * c - md / 2 - liftAt(c),
              mw,
              md,
              mh,
              shade(GAR_FACE, 2),
            );
        if (!e)
          for (const c of cs)
            merlonBox(rend,
              xN1 + (x1 - xN1) * c - mw,
              p.y + syT * c - md / 2 - liftAt(c),
              mw,
              md,
              mh,
              shade(GAR_FACE, -8),
            );
        if (!sw)
          for (const c of cs)
            merlonBox(rend,
              swx + sS * c - mw / 2,
              y1 - md - hs,
              mw,
              md,
              mh,
              shade(GAR_FACE, 8),
            );
      }
      // THE CASTELLATED OUTLINE: exposed perimeter only (the run
      // reads as one mass), with the crown lines STEPPING over each
      // parapet tooth — the silhouette is the signature. Traced along
      // the trapezoid edges so the ink meets neighbours seamlessly.
      if (rend.outlineOn) {
        const sideBot = sw ? cSy : southBaseY;
        const o = new Path2D();
        const crenel = (xa: number, xb: number, y: number, centers: number[], rise: number): void => {
          const teeth = rise > 0.5 ? centers : [];
          o.moveTo(xa, y);
          for (const cx of teeth) {
            o.lineTo(cx - mw / 2, y);
            o.lineTo(cx - mw / 2, y - rise);
            o.lineTo(cx + mw / 2, y - rise);
            o.lineTo(cx + mw / 2, y);
          }
          o.lineTo(xb, y);
        };
        if (!n) crenel(xN0, xN1, cNy, cs.map((c) => p.x + s * c), mh);
        if (!sw) crenel(x0, x1, cSy, cs.map((c) => swx + sS * c), mh + md);
        if (!w) {
          o.moveTo(xN0, cNy);
          o.lineTo(x0, sideBot);
          // Flank teeth ring their own boxes AT CROWN HEIGHT, each on the
          // leaned plane (an unlifted ring prints phantom rectangles down
          // the face).
          if (mh > s * 0.05)
            for (const c of cs)
              o.rect(xN0 + (x0 - xN0) * c, p.y + syT * c - md / 2 - liftAt(c) - mh, mw, md + mh);
        }
        if (!e) {
          o.moveTo(xN1, cNy);
          o.lineTo(x1, sideBot);
          if (mh > s * 0.05)
            for (const c of cs)
              o.rect(xN1 + (x1 - xN1) * c - mw, p.y + syT * c - md / 2 - liftAt(c) - mh, mw, md + mh);
        }
        if (!sw) {
          o.moveTo(x0, southBaseY);
          o.lineTo(x1, southBaseY);
        }
        rend.beginStructOutline();
        ctx.stroke(o);
      }
    },
  };
}

/**
 * A 45° curtain turn. Same geometry laws as diagWallItem (near-row
 * sort for camera-facing masses, sheared face frame so courses land
 * parallel to the hypotenuse) with garrison masonry, and parapet
 * teeth marching along the hyp — square-hewn blocks stepping the
 * diagonal, which is exactly how real crenellation turns a corner.
 */
export function garrisonDiagItem(rend: PaintHost, 
  tile: Tile,
  tx: number,
  ty: number,
  game: ClientGame,
  whT: number,
): DrawItem {
  const info = diagWallInfo(tile)!;
  const ctx = rend.ctx;
  const s = rend.camera.scale * rend.camera.depthScale(ty); // B-3 depth thread
  const syT = s * rend.camera.yScale;
  const p = rend.camera.worldToScreen(tx, ty, rend.w, rend.h);
  const elevLift = game.world.elevAt(tx, ty) * ELEV_H * s;
  p.y -= elevLift;
  const hs = whT * s; // face-height lift (north depthScale); used by the masonry
  const nE = rend.garrisonish(game, tx + 1, ty);
  const nS = rend.garrisonish(game, tx, ty + 1);
  const nW = rend.garrisonish(game, tx - 1, ty);
  // B-FW: project the SOUTH row so a diagonal turn's corners land on the
  // same projected world corners the straight runs it joins now use — the
  // hyp meets its neighbours seam-true. Each corner carries its OWN crown
  // lift (north edge whT·s, south edge whT·sS) so the wall-walk seats on
  // the leaned face top. At q=0 sS===s, the south row projects to
  // p.x/p.y+syT, and every corner collapses to today's values (byte-
  // identical — pinned on the q===0 branch).
  const q = rend.camera.q;
  const sS = q === 0 ? s : rend.camera.scale * rend.camera.depthScale(ty + 1);
  const hsS = whT * sS; // south-corner crown lift
  let swx: number;
  let sex: number;
  let southY: number;
  if (q === 0) {
    swx = p.x;
    sex = p.x + s;
    southY = p.y + syT;
  } else {
    const pS = rend.camera.worldToScreen(tx, ty + 1, rend.w, rend.h);
    swx = pS.x;
    sex = pS.x + sS;
    southY = pS.y - elevLift;
  }
  const yN = p.y;
  const yS = southY;
  // Corner = [screen x, GROUND screen y, crown lift]. North corners ride
  // row ty at the north x; south corners row ty+1 at the projected south x.
  const NWc: [number, number, number] = [p.x - 0.25, yN, hs];
  const NEc: [number, number, number] = [p.x + s + 0.25, yN, hs];
  const SWc: [number, number, number] = [swx - 0.25, yS, hsS];
  const SEc: [number, number, number] = [sex + 0.25, yS, hsS];
  const mass = info.mass;
  const hypW: [number, number, number] = mass === 'NE' || mass === 'SW' ? NWc : SWc;
  const hypE: [number, number, number] = mass === 'NE' || mass === 'SW' ? SEc : NEc;
  const tri: Array<[number, number, number]> =
    mass === 'NE'
      ? [NWc, NEc, SEc]
      : mass === 'NW'
        ? [NWc, NEc, SWc]
        : mass === 'SE'
          ? [NEc, SEc, SWc]
          : [NWc, SEc, SWc];
  const front = mass === 'NE' || mass === 'NW';
  const mkK = Math.max(0, Math.min(1, (whT - WALL_STUB) / (GARRISON_H - WALL_STUB)));
  const mh = MERLON_H * s * mkK;
  const md = syT * 0.34;
  const mw = s * 0.34;
  // Lifted (crown-plane) screen y of a corner.
  const cyOf = (c: [number, number, number]): number => c[1] - c[2];

  return {
    sortY: front ? ty + 0.001 : ty + 1,
    drawShadow: front
      ? () => rend.castEdgeQuad(hypW[0], hypW[1], hypE[0], hypE[1], whT)
      : nS
        ? undefined
        : () => rend.castEdgeQuad(SWc[0], yS, SEc[0], yS, whT),
    draw: () => {
      // The visible face: sheared masonry along the hyp for front
      // corners, the straight south edge for exposed back corners. Both
      // now ride the PROJECTED corners so the turn meets its runs.
      if (front) {
        const w2 = hypE[0] - hypW[0];
        const k = (hypE[1] - hypW[1]) / w2;
        ctx.save();
        ctx.translate(hypW[0], hypW[1]);
        ctx.transform(1, k, 0, 1, 0, 0);
        paintGarrisonMasonry(rend, 0, w2, hs, s, tx, 1, tx, ty, whT, false);
        ctx.restore();
      } else if (!nS) {
        ctx.save();
        ctx.translate(0, yS);
        paintGarrisonMasonry(rend, SWc[0], SEc[0] - SWc[0], hs, s, tx, 1, tx, ty, whT, false);
        ctx.restore();
      }
      // Crown: the mass triangle as wall-walk, drawn in ABSOLUTE coords
      // with each corner lifted by ITS OWN depthScale so the wall-walk
      // seats on the leaned face top and the turn's crown edges meet the
      // straight runs' trapezoids. At q=0 every lift === whT·s, so this
      // is the old uniform-lift triangle vertex-for-vertex.
      const triPath = new Path2D();
      triPath.moveTo(tri[0]![0], cyOf(tri[0]!));
      triPath.lineTo(tri[1]![0], cyOf(tri[1]!));
      triPath.lineTo(tri[2]![0], cyOf(tri[2]!));
      triPath.closePath();
      ctx.fillStyle = GAR_TOP;
      ctx.fill(triPath);
      ctx.save();
      ctx.clip(triPath);
      // Sun-lit lip on the camera-side arris grounds the height.
      ctx.strokeStyle = shade(GAR_TOP, 16);
      ctx.lineWidth = s * 0.14;
      ctx.beginPath();
      if (front) {
        ctx.moveTo(hypW[0], cyOf(hypW));
        ctx.lineTo(hypE[0], cyOf(hypE));
      } else {
        ctx.moveTo(SWc[0], yS - hsS);
        ctx.lineTo(SEc[0], yS - hsS);
      }
      ctx.stroke();
      ctx.restore();
      // Parapet teeth stepping the diagonal — interpolated along the hyp
      // (position AND lift) so they seat on the leaned arris.
      if (mh > s * 0.05) {
        for (const u of [0.25, 0.75]) {
          const cx = hypW[0] + (hypE[0] - hypW[0]) * u;
          const cyg = hypW[1] + (hypE[1] - hypW[1]) * u;
          const cl = hypW[2] + (hypE[2] - hypW[2]) * u;
          merlonBox(rend,
            cx - mw / 2,
            cyg - cl - md / 2,
            mw,
            md,
            mh,
            shade(GAR_FACE, front ? 8 : -14),
          );
        }
      }
      // Castellated outline along the lifted arris + face contact +
      // exposed end verticals, teeth ringed as their own boxes.
      if (rend.outlineOn) {
        const o = new Path2D();
        // Lifted arris y at a given x — interpolates position AND lift.
        const yAt = (x: number): number => {
          const f = (x - hypW[0]) / (hypE[0] - hypW[0]);
          const cyg = hypW[1] + f * (hypE[1] - hypW[1]);
          const cl = hypW[2] + f * (hypE[2] - hypW[2]);
          return cyg - cl;
        };
        const cuts: Array<[number, number]> =
          mh > s * 0.05
            ? [0.25, 0.75].map((u) => {
                const cx = hypW[0] + (hypE[0] - hypW[0]) * u;
                return [cx - mw / 2, cx + mw / 2];
              })
            : [];
        let segX = hypW[0];
        for (const [c0, c1] of cuts) {
          o.moveTo(segX, yAt(segX));
          o.lineTo(c0, yAt(c0));
          segX = c1;
        }
        o.moveTo(segX, yAt(segX));
        o.lineTo(hypE[0], yAt(hypE[0]));
        if (mh > s * 0.05) {
          for (const u of [0.25, 0.75]) {
            const cx = hypW[0] + (hypE[0] - hypW[0]) * u;
            const cyg = hypW[1] + (hypE[1] - hypW[1]) * u;
            const cl = hypW[2] + (hypE[2] - hypW[2]) * u;
            o.rect(cx - mw / 2, cyg - cl - md / 2 - mh, mw, md + mh);
          }
        }
        if (front) {
          o.moveTo(hypW[0], hypW[1]);
          o.lineTo(hypE[0], hypE[1]);
          if (!nW) {
            o.moveTo(hypW[0], hypW[1]);
            o.lineTo(hypW[0], cyOf(hypW));
          }
          if (!nE) {
            o.moveTo(hypE[0], hypE[1]);
            o.lineTo(hypE[0], cyOf(hypE));
          }
        } else if (!nS) {
          o.moveTo(SWc[0], yS);
          o.lineTo(SEc[0], yS);
          if (!nW) {
            o.moveTo(SWc[0], yS);
            o.lineTo(SWc[0], yS - hsS);
          }
          if (!nE) {
            o.moveTo(SEc[0], yS);
            o.lineTo(SEc[0], yS - hsS);
          }
        }
        rend.beginStructOutline();
        ctx.stroke(o);
      }
    },
  };
}

/**
 * THE GATEHOUSE — a merged E-W garrison gate run as ONE arched
 * passage through the curtain. (tx,ty) is the run's west anchor.
 * The composition, ground up: worn threshold flags; a pair of
 * iron-bound leaves to the spring line (doorOpenness swings them,
 * a locked refusal shudders them); the raised portcullis showing
 * its teeth in the arch head; a dressed voussoir arch with a proud
 * keystone; garrison ashlar above; a machicolation band under the
 * parapet; flanking piers with quoined edges wearing raised caps —
 * and the curtain's crenellation marching unbroken over the whole
 * gate. Every element rides the same veil height as the runs it
 * joins, so a revealed gate sinks with its wall.
 */
export function garrisonGateItem(rend: PaintHost, 
  tile: Tile,
  tx: number,
  ty: number,
  game: ClientGame,
  whT: number,
  runLen: number,
): DrawItem {
  const ctx = rend.ctx;
  const s = rend.camera.scale * rend.camera.depthScale(ty); // B-3 depth thread
  const p = rend.camera.worldToScreen(tx, ty, rend.w, rend.h);
  p.y -= game.world.elevAt(tx, ty) * ELEV_H * s;
  const syT = s * rend.camera.yScale;
  const hs = whT * s;
  const rw = s * runLen;
  const x0 = p.x - 0.25;
  const x1 = p.x + rw + 0.25;
  const w2 = x1 - x0;
  // Flanking piers: chunky at a true multi-tile gate, slimmer on a
  // single-tile postern so the passage still reads.
  const pw = Math.min(s * 0.34, rw * 0.18);
  const ox0 = x0 + pw;
  const ox1 = x1 - pw;
  const ow = ox1 - ox0;
  const springH = s * 1.75; // leaf head / arch spring line
  // A SHALLOW SEGMENTAL ARCH — a gatehouse is a tall passage under a
  // gently dressed head, never a dome: a half-round rise on a wide
  // opening ballooned into "a big weird circle" (user verdict). The
  // rise stays a fraction of the span, so the opening reads as gate
  // at any width.
  const rise = Math.min(ow * 0.22, s * 0.42);
  // THE GATE STAYS A GATE: the passage is carved out of the masonry
  // at EVERY veil height — a cut gatehouse is two pier stubs
  // flanking an open gap with the road running through, never a
  // sealed slab (the old binary archOn slab read as a wall you
  // could not walk through, exactly at the moment the reveal was
  // inviting you in). archK keys everything that only exists while
  // mass stands above the arch — tunnel shade, portcullis, voussoir
  // ring, machicolations, the wall-walk over the passage — and
  // fades it continuously as the crown melts toward the arch head,
  // so nothing pops on the ease.
  const archK = Math.max(
    0,
    Math.min(1, (hs - (springH + rise + s * 0.15)) / (s * 0.6)),
  );
  const y0 = p.y - 0.25;
  const y1 = p.y + syT + 0.25;
  const mkK = Math.max(0, Math.min(1, (whT - WALL_STUB) / (GARRISON_H - WALL_STUB)));
  const mh = MERLON_H * s * mkK;
  const md = syT * 0.34;
  const mw = s * 0.34;
  const dinfo = doorInfo(tile)!;

  // The arch opening as a path in the door frame (y = 0 at base).
  const archPath = (): Path2D => {
    const a = new Path2D();
    a.moveTo(ox0, 0);
    a.lineTo(ox0, -springH);
    a.ellipse((ox0 + ox1) / 2, -springH, ow / 2, rise, 0, Math.PI, Math.PI * 2);
    a.lineTo(ox1, 0);
    a.closePath();
    return a;
  };

  return {
    sortY: ty + 1,
    drawShadow: () => {
      // Only the piers cast — daylight pours through the passage.
      const yB = p.y + syT;
      rend.castEdgeQuad(x0, yB, x0 + pw, yB, whT);
      rend.castEdgeQuad(x1 - pw, yB, x1, yB, whT);
    },
    draw: () => {
      const yBase = p.y + syT;
      ctx.save();
      ctx.translate(0, yBase);
      // The curtain's ashlar carries across the whole gatehouse —
      // with the passage CARVED THROUGH it (the true-glass law: an
      // opening is a hole in the face, never paint over stone), so
      // the baked road genuinely runs under the arch.
      ctx.save();
      const guard = new Path2D();
      guard.rect(x0 - s, -hs - s, w2 + s * 2, hs + s * 2);
      guard.addPath(archPath());
      ctx.clip(guard, 'evenodd');
      paintGarrisonMasonry(rend, 
        x0,
        w2,
        hs,
        s,
        tx + (x0 - p.x) / s,
        w2 / s,
        tx,
        ty,
        whT,
        false,
      );
      ctx.restore();
      if (archK > 0.001) {
        ctx.save();
        ctx.globalAlpha *= archK;
        const arch = archPath();
        // The passage: gatehouse depth holds real shadow, and the
        // dark melts as anyone nears the threshold (the door-veil
        // law) to show the road running through.
        const veil = rend.doorVeil(game, tx + runLen / 2, ty + 0.5);
        // PASSAGE DEPTH: the tunnel holds shadow up under its vault
        // and opens toward the daylight at the threshold — one
        // vertical grade, never a flat wash, melting as bodies near.
        const tunnel = ctx.createLinearGradient(0, -springH - rise, 0, 0);
        tunnel.addColorStop(0, `rgba(10, 8, 16, ${0.62 + 0.26 * veil})`);
        tunnel.addColorStop(0.55, `rgba(12, 9, 18, ${0.3 + 0.38 * veil})`);
        tunnel.addColorStop(1, `rgba(14, 10, 22, ${0.1 + 0.28 * veil})`);
        ctx.fillStyle = tunnel;
        ctx.fill(arch);
        // Deep reveal shadows down the inner pier edges.
        ctx.fillStyle = 'rgba(10, 8, 16, 0.4)';
        ctx.fillRect(ox0, -springH, s * 0.05, springH);
        ctx.fillRect(ox1 - s * 0.05, -springH, s * 0.05, springH);
        // THE PORTCULLIS, raised: iron teeth hanging in the arch
        // head with one binding rail — the promise of the drop.
        // Lighter than strap iron so the grate reads against both
        // the shadowed passage and the road showing through it.
        ctx.save();
        ctx.clip(arch);
        // Teeth hang just past the spring line into the passage —
        // the raised grate reads over open air, and shut leaves
        // (painted after, reaching the spring) tuck under it.
        const tipY = -springH + s * 0.18;
        const barW = Math.max(1.5, s * 0.065);
        for (let bx = ox0 + s * 0.14; bx < ox1 - s * 0.08; bx += s * 0.23) {
          ctx.fillStyle = '#3d3950';
          ctx.fillRect(bx, -hs, barW, hs + tipY);
          ctx.beginPath();
          ctx.moveTo(bx, tipY);
          ctx.lineTo(bx + barW, tipY);
          ctx.lineTo(bx + barW / 2, tipY + s * 0.12);
          ctx.closePath();
          ctx.fill();
          // Each bar catches a west-side edge light.
          ctx.fillStyle = 'rgba(170, 178, 200, 0.28)';
          ctx.fillRect(bx, -hs, Math.max(1, barW * 0.35), hs + tipY);
        }
        ctx.fillStyle = '#3d3950';
        ctx.fillRect(ox0, tipY - s * 0.18, ow, Math.max(1.5, s * 0.06));
        // A cold glint along the rail — iron, not timber.
        ctx.fillStyle = 'rgba(170, 178, 200, 0.3)';
        ctx.fillRect(ox0, tipY - s * 0.18, ow, Math.max(1, s * 0.022));
        ctx.restore();
        // THE VOUSSOIR ARCH: a dressed ring following the curve,
        // radial joints, and a proud keystone at the apex. The
        // annulus needs CLOSED full-ellipse subpaths (half arcs
        // chain into one subpath and evenodd fills the whole
        // lunette) intersected with an above-the-spring rect.
        const cxA = (ox0 + ox1) / 2;
        const ringW = s * 0.16;
        ctx.save();
        ctx.beginPath();
        ctx.rect(x0, -hs, w2, hs - springH);
        ctx.clip();
        ctx.beginPath();
        ctx.ellipse(cxA, -springH, ow / 2 + ringW, rise + ringW, 0, 0, Math.PI * 2);
        ctx.ellipse(cxA, -springH, ow / 2, rise, 0, 0, Math.PI * 2, true);
        ctx.clip('evenodd');
        ctx.fillStyle = shade(GAR_FACE, 14);
        ctx.fillRect(x0, -hs, w2, hs);
        ctx.strokeStyle = 'rgba(20, 14, 28, 0.45)';
        ctx.lineWidth = Math.max(1, s * 0.03);
        for (let a = Math.PI + 0.28; a < Math.PI * 2 - 0.2; a += 0.34) {
          ctx.beginPath();
          ctx.moveTo(cxA + Math.cos(a) * (ow / 2), -springH + Math.sin(a) * rise);
          ctx.lineTo(
            cxA + Math.cos(a) * (ow / 2 + ringW * 1.1),
            -springH + Math.sin(a) * (rise + ringW * 1.1),
          );
          ctx.stroke();
        }
        ctx.restore();
        // Keystone, proud of the ring — sized to the shallow band.
        ctx.fillStyle = shade(GAR_FACE, 26);
        ctx.beginPath();
        ctx.moveTo(cxA - s * 0.11, -springH - rise + s * 0.02);
        ctx.lineTo(cxA + s * 0.11, -springH - rise + s * 0.02);
        ctx.lineTo(cxA + s * 0.075, -springH - rise - ringW - s * 0.03);
        ctx.lineTo(cxA - s * 0.075, -springH - rise - ringW - s * 0.03);
        ctx.closePath();
        ctx.fill();
        // Impost blocks where the arch springs from its jambs — the
        // dressed shoulder every honest arch stands on.
        ctx.fillStyle = shade(GAR_FACE, 20);
        ctx.fillRect(ox0 - s * 0.1, -springH - s * 0.06, s * 0.18, s * 0.13);
        ctx.fillRect(ox1 - s * 0.08, -springH - s * 0.06, s * 0.18, s * 0.13);
        ctx.fillStyle = 'rgba(18, 12, 26, 0.3)';
        ctx.fillRect(ox0 - s * 0.1, -springH + s * 0.07, s * 0.18, s * 0.035);
        ctx.fillRect(ox1 - s * 0.08, -springH + s * 0.07, s * 0.18, s * 0.035);
        // MACHICOLATIONS: the corbelled drop-band under the parapet
        // — dark slots between stout corbel teeth, a defended gate's
        // brow. Only a full-standing gatehouse carries it, and it
        // fades on its own key so mid-ease crowns never pop it.
        const machK = Math.max(0, Math.min(1, (hs - s * 3.0) / (s * 0.4)));
        if (machK > 0.001) {
          ctx.save();
          ctx.globalAlpha *= machK;
          const bandT = -hs + s * 0.3;
          ctx.fillStyle = 'rgba(12, 9, 18, 0.42)';
          ctx.fillRect(x0 + s * 0.06, bandT, w2 - s * 0.12, s * 0.2);
          ctx.fillStyle = shade(GAR_FACE, 4);
          for (let cxb = x0 + s * 0.1; cxb < x1 - s * 0.2; cxb += s * 0.28) {
            ctx.fillRect(cxb, bandT, s * 0.15, s * 0.22);
          }
          ctx.fillStyle = 'rgba(255, 236, 200, 0.1)';
          ctx.fillRect(x0 + s * 0.06, bandT + s * 0.2, w2 - s * 0.12, s * 0.04);
          ctx.restore();
        }
        ctx.restore();
      }
      // THE LEAVES, at every veil height — never faded with the
      // dressing: the tile is the state, the swing eases through
      // doorOpenness, and a locked refusal shudders both leaves in
      // the frame. A SHUT gate cut by the veil keeps a low
      // iron-bound pair barring the notch — wood, straps, and a
      // drawbar say "gate, closed" where the old bare-masonry stub
      // said "wall" — and the leaf head always ducks under the
      // sinking crown.
      const leafH = Math.min(springH, hs * 0.94);
      const oc = Math.min(1, rend.doorOpenness(tx, ty, dinfo.open));
      const shakeDx = rend.doorShakeAt(tx, ty) * s * 0.035;
      const half = ow / 2;
      const wLeaf = Math.max(half * 0.09, half * (1 - 0.91 * oc));
      rend.paintGarrisonLeaf(ox0 + shakeDx, 1, wLeaf, -leafH, leafH, oc, s);
      rend.paintGarrisonLeaf(ox1 + shakeDx, -1, wLeaf, -leafH, leafH, oc, s);
      if (oc < 0.12) {
        // The meeting seam, and the drawbar that says "barred".
        ctx.fillStyle = 'rgba(18, 11, 5, 0.6)';
        ctx.fillRect(ox0 + half - s * 0.018 + shakeDx, -leafH, s * 0.036, leafH);
        ctx.fillStyle = GAR_IRON;
        ctx.fillRect(ox0 + ow * 0.08 + shakeDx, -leafH * 0.42, ow * 0.84, s * 0.085);
        ctx.fillStyle = 'rgba(170, 178, 200, 0.22)';
        ctx.fillRect(ox0 + ow * 0.08 + shakeDx, -leafH * 0.42, ow * 0.84, s * 0.022);
      }
      // FLANKING PIERS, proud of the wall plane: quoined edges over
      // the ashlar, a talus base block, and honest AO at the foot.
      for (const [px0, inner] of [
        [x0, ox0],
        [ox1, x1],
      ] as const) {
        const pwid = inner - px0 > 0 ? inner - px0 : 0;
        if (pwid <= 0) continue;
        ctx.fillStyle = shade(GAR_FACE, 5);
        ctx.fillRect(px0, -hs, pwid, hs);
        // Quoin blocks alternating long and short up the pier.
        let qi = 0;
        for (let qy = -s * 0.55; qy > -hs + s * 0.2; qy -= s * 0.34, qi++) {
          ctx.fillStyle = shade(GAR_FACE, qi % 2 === 0 ? 16 : 6);
          ctx.fillRect(px0, qy - s * 0.3, pwid, s * 0.3);
          ctx.fillStyle = 'rgba(20, 14, 28, 0.35)';
          ctx.fillRect(px0, qy - Math.max(1, s * 0.026), pwid, Math.max(1, s * 0.026));
        }
        ctx.fillStyle = GAR_PLINTH;
        ctx.fillRect(px0 - s * 0.02, -s * 0.55, pwid + s * 0.04, s * 0.55);
        ctx.fillStyle = 'rgba(255, 236, 200, 0.12)';
        ctx.fillRect(px0 - s * 0.02, -s * 0.55, pwid + s * 0.04, s * 0.05);
        ctx.fillStyle = 'rgba(18, 12, 26, 0.3)';
        ctx.fillRect(px0 - s * 0.02, -s * 0.07, pwid + s * 0.04, s * 0.07);
      }
      // Worn threshold flags with two cart-wheel ruts — at EVERY
      // veil height: the threshold is the road's own promise that
      // the gap between the pier stubs is walked through.
      ctx.fillStyle = shade(GAR_TRIM, 12);
      ctx.fillRect(ox0, -s * 0.07, ow, s * 0.07);
      ctx.fillStyle = 'rgba(26, 20, 36, 0.3)';
      ctx.fillRect(ox0 + ow * 0.3, -s * 0.06, s * 0.05, s * 0.05);
      ctx.fillRect(ox0 + ow * 0.66, -s * 0.06, s * 0.05, s * 0.05);
      ctx.restore();
      // CROWN: the pier caps always stand, but the wall-walk over
      // the passage only exists while there is mass above the arch
      // to carry it — it narrows away northward on the same archK
      // that fades the dressing. At the stub the crown is two pier
      // tops with open sky between them: the gap IS the gate.
      // Epic B (FW): lift the crown by the DEPTH-SCALED wall height so the
      // wall-walk and teeth seat on the face top instead of floating above
      // it — beginHeightLayer lifts by raw camera.scale, which detaches the
      // crown from the depth-scaled face (hs = whT*s) under lean. At q=0
      // s === camera.scale and there is no horizontal lean (PERSP_LEAN=0),
      // so this is byte-identical to beginHeightLayer(whT).
      ctx.save();
      ctx.translate(0, -whT * s);
      const cd = y1 - y0;
      ctx.fillStyle = GAR_TOP;
      ctx.fillRect(x0, y0, ox0 - x0, cd);
      ctx.fillRect(ox1, y0, x1 - ox1, cd);
      if (archK > 0.001) ctx.fillRect(ox0, y1 - cd * archK, ow, cd * archK);
      ctx.fillStyle = shade(GAR_TOP, 16);
      ctx.fillRect(x0, y1 - s * 0.08, ox0 - x0, s * 0.08);
      ctx.fillRect(ox1, y1 - s * 0.08, x1 - ox1, s * 0.08);
      if (archK > 0.001) ctx.fillRect(ox0, y1 - s * 0.08 * archK, ow, s * 0.08 * archK);
      if (mh > s * 0.05) {
        for (let i = 0; i < runLen; i++) {
          for (const c of [0.25, 0.75]) {
            // Teeth over the passage melt with the walk that
            // carries them; teeth over the piers ride the piers.
            const mx = p.x + s * (i + c);
            const mhh = mx > ox0 && mx < ox1 ? mh * archK : mh;
            if (mhh <= s * 0.02) continue;
            merlonBox(rend, mx - mw / 2, y1 - md, mw, md, mhh, shade(GAR_FACE, 8));
          }
        }
        // Pier caps: taller corner teeth anchoring the gate front.
        merlonBox(rend, x0, y1 - md * 1.15, pw, md * 1.15, mh * 1.45, shade(GAR_FACE, 12));
        merlonBox(rend, x1 - pw, y1 - md * 1.15, pw, md * 1.15, mh * 1.45, shade(GAR_FACE, 12));
      }
      ctx.restore();
      // Outline: castellated crown, pier verticals, and the arch
      // opening ringed while the gatehouse stands — but once the
      // veil cuts through the arch, each pier is its own stub box
      // and NO line crosses the passage: the silhouette itself
      // says "opening", never "wall".
      if (rend.outlineOn) {
        const cBot = y1 - hs;
        const fBot = p.y + syT;
        const openThrough = archK <= 0.04;
        const o = new Path2D();
        if (mh > s * 0.05) {
          // Pier caps ring at both ends, at every height.
          o.moveTo(x0, cBot);
          o.lineTo(x0, cBot - md * 1.15 - mh * 1.45);
          o.lineTo(x0 + pw, cBot - md * 1.15 - mh * 1.45);
          o.lineTo(x0 + pw, cBot);
          if (!openThrough) {
            // Teeth march the span while the walk over the arch
            // stands; their heights melt on the same archK as the
            // painted teeth, so line and paint always agree.
            for (let i = 0; i < runLen; i++) {
              for (const c of [0.25, 0.75]) {
                const m0 = p.x + s * (i + c) - mw / 2;
                const m1 = m0 + mw;
                if (m0 < x0 + pw || m1 > x1 - pw) continue;
                const mhh = mh * archK;
                if (mhh <= s * 0.02) continue;
                o.lineTo(m0, cBot);
                o.lineTo(m0, cBot - md - mhh);
                o.lineTo(m1, cBot - md - mhh);
                o.lineTo(m1, cBot);
              }
            }
            o.lineTo(x1 - pw, cBot);
          } else {
            o.moveTo(x1 - pw, cBot);
          }
          o.lineTo(x1 - pw, cBot - md * 1.15 - mh * 1.45);
          o.lineTo(x1, cBot - md * 1.15 - mh * 1.45);
          o.lineTo(x1, cBot);
        } else if (!openThrough) {
          o.moveTo(x0, cBot);
          o.lineTo(x1, cBot);
        } else {
          o.moveTo(x0, cBot);
          o.lineTo(x0 + pw, cBot);
          o.moveTo(x1 - pw, cBot);
          o.lineTo(x1, cBot);
        }
        // Pier verticals to the ground.
        o.moveTo(x0, cBot);
        o.lineTo(x0, fBot);
        o.moveTo(x1, cBot);
        o.lineTo(x1, fBot);
        // Ground contact either side of the passage.
        o.moveTo(x0, fBot);
        o.lineTo(ox0, fBot);
        o.moveTo(ox1, fBot);
        o.lineTo(x1, fBot);
        if (!openThrough) {
          // The opening: up the reveals and over the arch curve.
          o.moveTo(ox0, fBot);
          o.lineTo(ox0, fBot - springH);
          o.ellipse(
            (ox0 + ox1) / 2,
            fBot - springH,
            ow / 2,
            rise,
            0,
            Math.PI,
            Math.PI * 2,
          );
          o.lineTo(ox1, fBot);
        } else {
          // Cut through: the inner pier verticals frame the gap so
          // the two stubs read as jambs of a passage.
          o.moveTo(ox0, cBot);
          o.lineTo(ox0, fBot);
          o.moveTo(ox1, cBot);
          o.lineTo(ox1, fBot);
        }
        rend.beginStructOutline();
        ctx.stroke(o);
      }
    },
  };
}

/**
 * A garrison gate in a N-S curtain — the edge-on passage, in the
 * side-doorway grammar at fortification scale: the curtain run ENDS
 * at the opening (honest notch), worn passage flags with landing
 * slabs poking out both approaches, and ONE tall iron-bound leaf —
 * thrown open it stands outside the wall line in the neighbour
 * column; shut it reads as the edge-on slab barring the notch.
 */
export function garrisonSideGateItems(rend: PaintHost, 
  tile: Tile,
  tx: number,
  ty: number,
  game: ClientGame,
  runLen: number,
  items: DrawItem[],
): void {
  const s = rend.camera.scale * rend.camera.depthScale(ty); // B-3 depth thread
  const p = rend.camera.worldToScreen(tx, ty, rend.w, rend.h);
  p.y -= game.world.elevAt(tx, ty) * ELEV_H * s;
  const elevated = game.world.elevAt(tx, ty) !== 0;
  const syT = s * rend.camera.yScale;
  const x0 = p.x - 0.25;
  const x1 = p.x + s + 0.25;
  const gapH = syT * runLen;
  const cy = p.y + gapH / 2;
  const trim = GAR_TRIM;
  const push = (item: DrawItem): void => {
    if (elevated) item.elevated = true;
    items.push(item);
  };

  // Passage flags + landing slabs: the ground-level affordance that
  // survives any run length (neighbour columns are never buried).
  push({
    sortY: ty,
    draw: () => {
      const ctx = rend.ctx;
      ctx.fillStyle = shade(trim, 14);
      ctx.fillRect(p.x + s * 0.07, p.y + syT * 0.05, s * 0.86, gapH - syT * 0.1);
      ctx.fillStyle = 'rgba(26, 20, 36, 0.16)';
      ctx.fillRect(p.x + s * 0.07, cy - syT * 0.26, s * 0.86, syT * 0.13);
      ctx.fillRect(p.x + s * 0.07, cy + syT * 0.13, s * 0.86, syT * 0.13);
      const landH = gapH + syT * 0.26;
      for (const [sx0, sx1] of [
        [p.x - s * 0.42, p.x + s * 0.05],
        [p.x + s * 0.95, p.x + s * 1.42],
      ] as const) {
        ctx.fillStyle = shade(trim, 4);
        ctx.fillRect(sx0, cy - landH / 2, sx1 - sx0, landH);
        ctx.fillStyle = 'rgba(255, 236, 200, 0.14)';
        ctx.fillRect(sx0, cy - landH / 2, sx1 - sx0, syT * 0.12);
        ctx.fillStyle = 'rgba(26, 20, 36, 0.3)';
        ctx.fillRect(sx0, cy + landH / 2 - syT * 0.12, sx1 - sx0, syT * 0.12);
        ctx.fillStyle = 'rgba(26, 20, 36, 0.18)';
        ctx.fillRect(sx0, cy - Math.max(1, s * 0.015), sx1 - sx0, Math.max(1, s * 0.03));
        if (rend.outlineOn) {
          rend.beginStructOutline();
          ctx.strokeRect(sx0, cy - landH / 2, sx1 - sx0, landH);
        }
      }
    },
  });

  // THE LEAF — the tile is the state, the side-door open/shut/swing
  // grammar at garrison weight.
  const lw = s * (runLen > 1 ? 0.95 : 0.8);
  const doorH = s * 1.9;
  const side: -1 | 1 = -1; // the leaf hangs on the east column
  const leafX0 = side < 0 ? x0 - lw : x1;
  const dinfo = doorInfo(tile)!;
  const oNow = Math.min(1, rend.doorOpenness(tx, ty, dinfo.open));
  push({
    sortY: oNow > 0.5 ? ty + 0.05 : ty + 0.6,
    drawShadow: () => {
      const o = Math.min(1, rend.doorOpenness(tx, ty, dinfo.open));
      if (o > 0.5) {
        const baseY = p.y + syT * 0.1;
        rend.castEdgeQuad(leafX0, baseY, leafX0 + lw, baseY, 1.9);
      } else {
        const xc = p.x + s * 0.5;
        rend.castEdgeQuad(xc, p.y + syT * 0.08, xc, p.y + gapH - syT * 0.08, 1.9);
      }
    },
    draw: () => {
      const ctx = rend.ctx;
      const o = Math.min(1, rend.doorOpenness(tx, ty, dinfo.open));
      const shake = rend.doorShakeAt(tx, ty);
      if (o >= 0.98) {
        // FULLY OPEN: the iron-bound leaf face-on, grounded by its
        // own contact shade.
        const baseY = p.y + syT * 0.1;
        ctx.fillStyle = 'rgba(18, 12, 26, 0.22)';
        ctx.fillRect(leafX0 + s * 0.02, baseY - s * 0.025, lw - s * 0.04, s * 0.06);
        rend.paintGarrisonLeaf(leafX0 + lw, -1, lw, baseY - doorH, doorH, 0, s);
        return;
      }
      if (o <= 0.02) {
        // SHUT: the slab in the wall plane, edge-on — a lifted top
        // ribbon spanning the notch plus the south end face, with
        // one iron strap tail visible on the end grain.
        const xc = p.x + s * 0.5 + shake * s * 0.035;
        const slabW = s * 0.2;
        ctx.fillStyle = shade(GAR_LEAF, -10);
        ctx.fillRect(xc - slabW / 2, p.y + gapH - doorH, slabW, doorH);
        ctx.fillStyle = GAR_IRON;
        ctx.fillRect(xc - slabW / 2, p.y + gapH - doorH * 0.55, slabW, s * 0.06);
        ctx.fillStyle = shade(GAR_LEAF, 18);
        ctx.fillRect(xc - slabW / 2, p.y - doorH, slabW, gapH);
        ctx.fillStyle = 'rgba(255, 224, 170, 0.12)';
        ctx.fillRect(xc - slabW / 2, p.y + gapH - doorH - syT * 0.1, slabW, syT * 0.1);
        ctx.fillStyle = 'rgba(18, 12, 26, 0.22)';
        ctx.fillRect(xc - slabW / 2 - s * 0.02, p.y + gapH - s * 0.03, slabW + s * 0.04, s * 0.05);
        if (rend.outlineOn) {
          rend.beginStructOutline();
          ctx.strokeRect(xc - slabW / 2, p.y - doorH, slabW, gapH + doorH);
        }
        return;
      }
      // MID-SWING: one honest quad sweeping hinge-anchored from the
      // wall plane out to the neighbour column.
      const th = (o * Math.PI) / 2;
      const hx = (side < 0 ? x0 : x1) + shake * s * 0.02;
      const hyB = p.y + syT * 0.1;
      const fxB = hx + side * lw * Math.sin(th);
      const fyB = hyB + lw * 0.95 * Math.cos(th) * (syT / s);
      const quad = new Path2D();
      quad.moveTo(hx, hyB);
      quad.lineTo(fxB, fyB);
      quad.lineTo(fxB, fyB - doorH);
      quad.lineTo(hx, hyB - doorH);
      quad.closePath();
      ctx.fillStyle = shade(GAR_LEAF, -Math.round((1 - Math.sin(th)) * 24));
      ctx.fill(quad);
      ctx.beginPath();
      ctx.moveTo(hx, hyB - doorH);
      ctx.lineTo(fxB, fyB - doorH);
      ctx.lineTo(fxB, fyB - doorH + s * 0.06);
      ctx.lineTo(hx, hyB - doorH + s * 0.06);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255, 224, 170, 0.14)';
      ctx.fill();
      if (rend.outlineOn) {
        rend.beginStructOutline();
        ctx.stroke(quad);
      }
    },
  });
}
