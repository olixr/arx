/**
 * THE GARRISON'S MASONRY — the curtain wall's stone, merlons, wall and
 * diagonal runs, and the gates.
 * Moved verbatim off the Renderer class (foundations F2 wave B); the
 * painters reach the engine through the shared PaintHost slice.
 */
import { ClientGame } from '../game/clientGame.js';
import type { Silhouette } from './structureFace.js';
import { Tile } from '@arx/shared';
import type { DrawItem } from './renderer.js';
import type { PaintHost } from './paintHost.js';
/**
 * Great-ashlar face masonry, drawn in the CURRENT frame with the
 * base line at y = 0 and the face rising to -hs (callers set up
 * plain or sheared frames — a diagonal's courses land parallel to
 * its hypotenuse exactly like paintFaceBands). The block grid is
 * WORLD-ANCHORED: joints and per-block tints key off world-space
 * block indices, so a course runs unbroken across every tile of a
 * run and two neighbours can never disagree about a joint.
 */
export declare function paintGarrisonMasonry(rend: PaintHost, x0: number, w2: number, hs: number, s: number, worldX: number, tilesW: number, tx: number, ty: number, whT: number, loops: boolean): void;
/**
 * One parapet merlon — a square-hewn tooth standing mh above the
 * wall-walk. Drawn inside the crown's height layer in plan coords:
 * (mx0, my0) is the tooth's plan footprint (mw × md); the outward
 * face rises from the footprint's south edge and the cap plane
 * lifts by mh, so the 2.5D top-plane law holds at parapet scale.
 */
export declare function merlonBox(rend: PaintHost, mx0: number, my0: number, mw: number, md: number, mh: number, faceTone: string): void;
/**
 * A straight curtain-wall tile. Same structural skeleton as
 * wallItem (shared-edge snapping, rear riser, one crown layer) with
 * the garrison dialect throughout — and the crenellated struct
 * outline: the crown silhouette steps over every parapet tooth, so
 * even at far zoom the black edge itself reads castellated.
 */
export declare function garrisonWallItem(rend: PaintHost, tile: Tile, tx: number, ty: number, game: ClientGame, whT: number, suppressTop?: boolean): DrawItem;
/**
 * THE ONE RENDER — A2c: paint ONE straight span of a coalesced curtain
 * run's crenellated crown, in ABSOLUTE screen coords projected off the
 * span's WORLD corners so adjacent spans (and neighbouring runs) meet
 * seam-free. This is the garrison twin of `Renderer.paintWallCrown` + the
 * wall crown span's outline, drawn by `crownSpanItem` when the volume's
 * kind is 'garrison':
 *
 *   1. the wall-walk (great-ashlar GAR_TOP plane over the span rect);
 *   2. the CRENELLATION — parapet teeth (merlons) on every EXPOSED crown
 *      edge, at world-phase centres (0.25, 0.75 per tile), so the toothed
 *      top runs UNBROKEN across the whole run and the teeth never double
 *      up or gap at a span join (they key off the world grid);
 *   3. the CASTELLATED OUTLINE — the crown edge STEPPING over each tooth
 *      (the silhouette that reads "castle"), stroked only on exposed edges
 *      (tested against the run member set) so internal seams never ink.
 *
 * `members` is the run's packed member set; `crownH`/`footH` are WORLD
 * heights (tiles, elevation folded in). Every point is projected through
 * the SAME rounded-corner + `height·scale·depthScale` law the wall crown
 * uses, so garrison and wall crowns seat on identical device pixels.
 */
export declare function garrisonCrownSpan(rend: PaintHost, span: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
}, crownH: number, footH: number, whT: number, members: ReadonlySet<number>, sil?: Silhouette): void;
/**
 * A 45° curtain turn. Same geometry laws as diagWallItem (near-row
 * sort for camera-facing masses, sheared face frame so courses land
 * parallel to the hypotenuse) with garrison masonry, and parapet
 * teeth marching along the hyp — square-hewn blocks stepping the
 * diagonal, which is exactly how real crenellation turns a corner.
 */
export declare function garrisonDiagItem(rend: PaintHost, tile: Tile, tx: number, ty: number, game: ClientGame, whT: number): DrawItem;
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
export declare function garrisonGateItem(rend: PaintHost, tile: Tile, tx: number, ty: number, game: ClientGame, whT: number, runLen: number): DrawItem;
/**
 * A garrison gate in a N-S curtain — the edge-on passage, in the
 * side-doorway grammar at fortification scale: the curtain run ENDS
 * at the opening (honest notch), worn passage flags with landing
 * slabs poking out both approaches, and ONE tall iron-bound leaf —
 * thrown open it stands outside the wall line in the neighbour
 * column; shut it reads as the edge-on slab barring the notch.
 */
export declare function garrisonSideGateItems(rend: PaintHost, tile: Tile, tx: number, ty: number, game: ClientGame, runLen: number, items: DrawItem[]): void;
//# sourceMappingURL=garrisonArt.d.ts.map