/**
 * THE FOUR BARRIER FAMILIES — fence, palisade, iron fence, hedge: posts,
 * rails, gates and their *ish membership predicates, one coupling grammar.
 * Moved verbatim off the Renderer class (foundations F2 wave A); the
 * painters reach the engine through the shared PaintHost slice.
 */
import { ClientGame } from '../game/clientGame.js';
import { Tile } from '@arx/shared';
import type { DrawItem } from './renderer.js';
import type { PaintHost } from './paintHost.js';
/**
 * Epic B (FW) BARRIER SPAN — project a point at tile fractions (fx east,
 * fy south of the tile-centre BASE row) to leaned screen space, so the
 * members that SPAN a tile's depth (N-S rails, hedge mass, palisade /
 * iron marching courses, diagonal strides) meet their run-mates on the
 * SAME projected world corner, seam-true under the lean — the two-corner
 * trapezoid law of wallItem / cliffArt, spoken for billboards.
 *
 * A barrier tile anchors at world (tx+0.5, ty+0.5) but its members hang
 * off `baseY = p.y + syT·0.14` (world row ty+0.64), so a member at screen
 * `baseY + fy·syT`, `p.x + fx·s` is world (tx+0.5+fx, ty+0.64+fy). `lift`
 * is the elevation + porch lift already subtracted from `p.y`.
 *
 * THE INVARIANT: at q=0 this returns the exact billboard arithmetic
 * (`p.x + fx·s`, `baseY + fy·syT`) — no worldToScreen round-trip, no
 * reassociation — so every caller stays byte-identical until the lean is
 * on. Fills `out` alloc-free.
 */
export declare function barrierPt(rend: PaintHost, tx: number, ty: number, px: number, s: number, baseY: number, syT: number, lift: number, fx: number, fy: number, out: {
    x: number;
    y: number;
}): {
    x: number;
    y: number;
};
/** Fence-family connectivity: rails reach toward these neighbours. */
export declare function fenceish(rend: PaintHost, game: ClientGame, x: number, y: number): boolean;
/**
 * A square-hewn fence post wearing a foreshortened cap plane — the
 * 2.5D anchor every fence mass hangs from (crate-lid grammar: lit
 * plane, shaded far edge, sunlit front arris). Paints its own brand
 * outline; call it AFTER the rails so the post face covers their
 * run-through seams and every joint reads carpentered.
 */
export declare function drawFencePost(rend: PaintHost, x: number, baseY: number, w: number, hTot: number, ds?: number): void;
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
export declare function fenceItem(rend: PaintHost, tile: Tile, tx: number, ty: number, game: ClientGame): DrawItem;
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
export declare function fenceGateItem(rend: PaintHost, tile: Tile, tx: number, ty: number, game: ClientGame): DrawItem;
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
export declare function giantLog(rend: PaintHost, x: number, baseY: number, w: number, shoulder: number, seed: number, ink: boolean, ds?: number): void;
/** Shoulder height for log k of a tile — big and uneven (1.3 to
 *  1.62 tiles over the 1.15-tile body: the wall MEANS it). */
export declare function logShoulder(rend: PaintHost, tx: number, ty: number, k: number): number;
/**
 * THE HEAVY LASH: a thick rope course bound across a span of logs —
 * dark wrap band, two lit strands, a shadowed wrap tick where it
 * rounds each log seam, and a knot with a dangling end at one
 * hash-picked log. Fill-only value work (the logs own the ink).
 */
export declare function palisadeRope(rend: PaintHost, xw: number, xe: number, y: number, seams: readonly number[], knotSeed: number, ds?: number): void;
/**
 * A GATE POST: the fattest log in the wall, with a rope hinge
 * collar and — on one side of every gate — the camp's skull staring
 * down the road.
 */
export declare function drawPalisadePost(rend: PaintHost, x: number, baseY: number, w: number, hTot: number, skull: boolean, ds?: number): void;
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
export declare function palisadeItem(rend: PaintHost, tile: Tile, tx: number, ty: number, game: ClientGame): DrawItem;
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
export declare function palisadeGateItem(rend: PaintHost, tile: Tile, tx: number, ty: number, game: ClientGame): DrawItem;
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
export declare function ironBar(rend: PaintHost, x: number, footY: number, tipY: number, seed: number, dim: number, ds?: number): void;
/**
 * THE CURB — the granite course the railing is leaded into. A low
 * coursed-stone footing with a TRUE foreshortened top plane (the
 * bird's eye sees stone, never a paint stripe), joint ticks on the
 * half-tile, and the yard's damp green creeping up the shaded
 * spots. Every run stands on this; iron never touches soil.
 */
export declare function ironCurbEW(rend: PaintHost, xw: number, xe: number, baseY: number, tx: number, ty: number): void;
/**
 * A GRAVE PIER — the masonry that anchors every corner, tee, run
 * end, and gate. Stepped plinth, coursed granite shaft, a molded
 * cap with a TRUE top plane for the bird's eye, and a dark iron
 * finial standing on it: an urn on the piers that keep the yard,
 * an orb-and-spike on the piers that carry the gate.
 */
export declare function drawGravePier(rend: PaintHost, x: number, baseY: number, w: number, hTot: number, finial: 'urn' | 'orb', ds?: number): void;
/** A rail band: dark iron with one lit top thread, drawn OVER the
 *  bars so every bar reads as pierced through, never glued on. */
export declare function ironRail(rend: PaintHost, x0: number, x1: number, y: number, t: number, dim: number): void;
/**
 * THE ORNAMENT BAND: what the smith did between the second rail
 * and the top one. Hash-dealt per half-tile panel — a ring, a
 * facing pair of C-scrolls, or honest plain bars — so no two
 * panels down a long run repeat, and the whole run still reads as
 * one commission.
 */
export declare function ironOrnament(rend: PaintHost, cx: number, yTop: number, yBot: number, seed: number, dim: number, ds?: number): void;
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
export declare function ironFenceItem(rend: PaintHost, tile: Tile, tx: number, ty: number, game: ClientGame): DrawItem;
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
export declare function ironGateItem(rend: PaintHost, tile: Tile, tx: number, ty: number, game: ClientGame): DrawItem;
/** Half-tile crown-lobe amplitude, WORLD-keyed (channel per axis)
 *  so run-mates agree at every shared seam. */
export declare function hedgeLobe(rend: PaintHost, ch: number, a: number, b: number): number;
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
export declare function hedgeMassPaint(rend: PaintHost, px: number, py: number, tx: number, ty: number, parts: ReadonlyArray<{
    au: number;
    av: number;
    bu: number;
    bv: number;
    k: number;
}>, h: number, wind: {
    l: number;
    s: number;
    bx: number;
}, salt: number, cells: ReadonlyArray<{
    u: number;
    v: number;
    ku: number;
    kv: number;
}>, vcreases: ReadonlyArray<{
    u: number;
    v0: number;
    v1: number;
    key: number;
}>, hcreases: ReadonlyArray<{
    v: number;
    u0: number;
    u1: number;
    key: number;
}>, inkSides?: boolean): void;
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
export declare function hedgeItem(rend: PaintHost, tile: Tile, tx: number, ty: number, game: ClientGame): DrawItem;
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
export declare function hedgeGateItem(rend: PaintHost, tile: Tile, tx: number, ty: number, game: ClientGame): DrawItem;
/**
 * Palisade connectivity: the war camp's wall merges ONLY with its
 * own kind (the separate-masonry law, third family) — a goblin
 * stockade dying into a town fence or house wall would read as one
 * builder's work, and they are not.
 */
export declare function palisadeish(rend: PaintHost, game: ClientGame, x: number, y: number): boolean;
/**
 * Iron-fence connectivity: the graveyard's wall merges ONLY with
 * its own kind (the separate-masonry law, FIFTH family) — a
 * smith's railing dying into a timber fence or clipped green would
 * read as one builder's work, and a smith is neither carpenter nor
 * gardener.
 */
export declare function ironish(rend: PaintHost, game: ClientGame, x: number, y: number): boolean;
/**
 * Hedge connectivity: the garden's wall merges ONLY with its own
 * kind (the separate-masonry law, FOURTH family) — clipped green
 * dying into a timber fence or house wall would read as one
 * builder's work, and a gardener is not a carpenter.
 */
export declare function hedgeish(rend: PaintHost, game: ClientGame, x: number, y: number): boolean;
/**
 * THE ONE RENDER — A4: the hedge as an UPRIGHT, SEAMLESS hedge-wall
 * VOLUME (invariants #2/#3). A hedge run is a thin world-geometry
 * volume like A2's thin wall runs: `collectVolume` yields its exposed
 * perimeter once, `faceStrip` hangs its receding side faces and
 * `topPlane` lays its whole-run crown — every world corner projected
 * exactly once, so a run/corner/tee reads as ONE clipped body with no
 * per-tile seam or double-ink. Retires `hedgeMassPaint`'s per-tile
 * affine stand-up hack (with its SE-corner approximation) on this
 * path: the height is a pure screen-space lift (`height·scale·
 * depthScale`) folded into the primitives, not a sheared ground affine.
 *
 * These two painters carry only the hedge's MATERIAL DRESSING (the
 * clipped-green tones, pillow bed, partings, occasional bloom) in the
 * face/crown UV space the primitives hand them — the renderer owns the
 * projection. Colours stay in this module (the barrier palette).
 */
/** The hedge volume's WORLD height (tiles) — a hip-high garden hedge,
 *  far shorter than a wall's 2.8. At q=0 the volume path is never taken
 *  (the golden gate keeps the flat pillow-bed look), so this height only
 *  ever expresses under lean. */
export declare const HEDGE_VOL_H = 0.62;
/** One receding SIDE FACE of a hedge run (a `faceStrip` trapezoid
 *  segment). Green body, a slightly darker rooted skirt band and a lit
 *  upper lip — the clipped-green face standing plumb from turf to crown. */
export declare function paintHedgeFace(rend: PaintHost, seg: FaceGeomLike): void;
/**
 * The whole-run CROWN (a `topPlane`). Fills the projected crown loop,
 * then — for a rectangular run (a straight run or a thin corner arm) —
 * lays the bed of clipped pillows in the plane's own UV so it tiles
 * continuously across the run instead of per tile: half-tile pillow
 * quarters rolled through the three clipped-green tones and keyed to the
 * ABSOLUTE world half-tile grid (so run-mates and neighbours agree at
 * every seam), pillow partings, and a sparse madder bloom. An L/tee/ring
 * loop keeps the plain crown fill (its bbox UV would overspill — the same
 * restraint A2's crown uses), still upright and seamless.
 *
 * `wx0,wy0`–`wx1,wy1` are the run's WORLD corner extents (the loop bbox),
 * so the cell grid keys to world coords rather than to the plane.
 */
export declare function paintHedgeCrown(rend: PaintHost, plane: TopPlaneGeomLike, wx0: number, wy0: number, wx1: number, wy1: number): void;
/** The `structureFace` geom slices the two hedge painters read — kept
 *  as local structural types so this module need not import the whole
 *  face API surface. */
export interface FaceGeomLike {
    ax: number;
    ay: number;
    bx: number;
    by: number;
    yTopA: number;
    yTopB: number;
}
export interface TopPlaneGeomLike {
    poly: ReadonlyArray<{
        x: number;
        y: number;
    }>;
    uv: (u: number, v: number, out?: {
        x: number;
        y: number;
    }) => {
        x: number;
        y: number;
    };
}
//# sourceMappingURL=barrierArt.d.ts.map