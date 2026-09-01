/**
 * THE GARRISON'S MASONRY — the curtain wall's stone, merlons, wall and
 * diagonal runs, and the gates.
 * Moved verbatim off the Renderer class (foundations F2 wave B); the
 * painters reach the engine through the shared PaintHost slice.
 */
import { ClientGame } from '../game/clientGame.js';
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
export declare function garrisonWallItem(rend: PaintHost, tile: Tile, tx: number, ty: number, game: ClientGame, whT: number): DrawItem;
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