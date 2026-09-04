import type { WoodSkin } from './woodSkins.js';
/**
 * ORGANIC terrain rendering. Tiles are authored on a grid but the grid
 * must disappear on screen: material regions are contoured on the dual
 * grid (marching squares over tile corners), then every edge crossing
 * slides along its edge by a deterministic world-keyed hash and every
 * boundary run bows into a quadratic curve. Nature never cuts a 45°
 * chamfer — roads wander, meadows bite into sand, shorelines meander.
 * Masonry still may: layers with wobble 0 keep ruler-straight cuts
 * (stone plazas, wood floors), so man-made ground reads deliberate
 * while wild ground flows.
 *
 * Where two materials meet they BLEND, the way hand-drawn transition
 * tiles do: a worn shade band just inside the edge, grass tufts
 * overhanging the boundary, and crumbs of the material scattered out
 * onto the turf. Ground shading comes from low-frequency noise — big
 * soft meadows, no checkerboard.
 *
 * All jitter is keyed on WORLD tile coordinates, so the same curve
 * falls out of every chunk bake, every resolution tier, and the live
 * shoreline pass — geometry agrees everywhere by construction.
 */
export type GroundSampler = (tx: number, ty: number) => number | undefined;
export type DetailSampler = (tx: number, ty: number) => number;
export type ElevSampler = (tx: number, ty: number) => number;
/**
 * The soil family: a tilled plot and every crop growth stage share ONE
 * ground material, so a field contours as a single dug bed — no seams
 * between a plot and the plant standing in it.
 */
export declare const SOIL_TILES: Set<number>;
/**
 * GUTTER LAW: chunk bakes carry a margin of real neighbor content on
 * every side, and the renderer blits from the inset source rect.
 * Scaled drawImage filtering samples beyond the source rect at its
 * edges — against a bare canvas edge that blend pulls in TRANSPARENT
 * pixels and paints a hairline dark seam along every chunk boundary.
 * With a gutter the kernel lands on true world content instead. The
 * painters already draw world-keyed content past the chunk bounds
 * (the canvas merely clipped it), so the gutter costs only pixels.
 */
export declare function bakeGutter(px: number): number;
/**
 * TIME-SLICED CHUNK BAKING. A full chunk bake costs 10-40ms — far past
 * any 120fps frame budget, so it must never run whole inside a frame.
 * startChunkBake paints the cheap meadow base synchronously (~0.1ms, a
 * usable placeholder) and returns a job whose remaining steps — one
 * material layer per step, the elev mask + planks, the per-tile detail
 * pass in row bands, docks last — each fit a small slice of a frame.
 * The renderer advances jobs against a per-frame time budget and blits
 * the canvas at whatever completeness it has: brand-new ground sweeps
 * its detail in over a few frames instead of hitching one.
 *
 * Step ORDER is the paint order of the old monolithic bake, so a
 * finished job is pixel-identical to bakeChunk's output. Partial
 * states are always "lower passes complete, higher passes absent" —
 * never residue that a later pass fails to cover.
 */
export interface ChunkBakeJob {
    canvas: HTMLCanvasElement;
    /** Remaining paint steps; each sized to fit a slice of frame budget. */
    steps: Array<() => void>;
    next: number;
    /** THE STRIP PAINTS ASIDE's scratch canvas (fringe jobs only) —
     *  the caller pools it when the job completes or dies. */
    fringeScratch?: HTMLCanvasElement;
}
/** Advance a sliced bake by one step; true when the bake is complete. */
export declare function stepChunkBake(job: ChunkBakeJob): boolean;
/**
 * THE FRINGE RE-BAKE (foundation audit's charted lever). A neighbor
 * arrival can only change a chunk's painted pixels within a border
 * fringe — the blob halo reaches 2 rings, the detail pass 1 tile,
 * deck lookahead a hair more — yet a fringe bump used to re-run all
 * ~29 sliced steps over the whole canvas, and one arrival bumps up
 * to 8 neighbors. A fringe job instead COPIES the prior bake whole,
 * CLEARS the affected border strips, and re-runs every step CLIPPED
 * to them (loops narrowed where they dominate). Determinism makes
 * this pixel-exact: the strip is wide enough (FRINGE_TILES = reach 3
 * + 1 paint bleed) that every pixel at a strip boundary depends only
 * on unchanged data, strips sit on tile boundaries (integer px — the
 * clip edge is crisp, no partial coverage), and the cleared strip
 * recomposes from the base up in the full bake's own step order.
 * scripts/probes/fringe-seam.mjs is the proof, and its gate is
 * STRUCTURAL — the measured truth about this GPU canvas, in order
 * of discovery: (1) identical op streams on identical canvases are
 * BYTE-EXACT (the null cases pin it; a no-narrowing fringe measured
 * zero differing bytes). (2) clip() re-rounds AA coverage on
 * interior pixels — which is why the strips paint ASIDE, never
 * under a clip. (3) ANY op-stream change re-rolls scattered AA edge
 * pixels across the whole canvas, magnitude scaling with the stream
 * delta (one mutated tile ±14; the narrowed meadow's absent
 * thousands of fills ±27) — but every such pixel is a legitimate
 * roll of the same content, landing as SINGLES and short boundary
 * chains. A real defect is a CONTIGUOUS region. The gate therefore
 * bounds the largest 4-connected cluster of >8-delta pixels (24)
 * plus a hard per-channel cap (48); measured: honest clusters 0-17,
 * canaries 28-2507.
 */
export interface FringeSpec {
    /** Edge mask: 1 = N, 2 = S, 4 = W, 8 = E — the sides changed
     *  neighbor data reaches in from. */
    mask: number;
    /** The prior COMPLETE bake of the same data at the same tier —
     *  copied whole; the strips are overwritten at completion. */
    copyFrom: HTMLCanvasElement;
    /** Pooled canvas for the strip scratch (see THE STRIP PAINTS
     *  ASIDE), or null to mint one. The job returns it via
     *  ChunkBakeJob.fringeScratch for the caller to recycle. */
    scratch?: HTMLCanvasElement | null;
}
/** Strip depth in tiles: neighbor-data reach (3 — THE BUMP IS
 *  EARNED's own constant) + 1 tile of paint bleed, so clip-boundary
 *  pixels depend only on unchanged data. */
export declare const FRINGE_TILES = 4;
/**
 * The affected strips as DISJOINT rects in bake-ctx coordinates
 * (post gutter-translate: the chunk spans [0, CHUNK*px), the gutter
 * [-G, 0) and [CHUNK*px, CHUNK*px+G)). Disjointness is load-bearing:
 * strips clear once and every repaint pass visits a pixel once —
 * translucent content (detail flecks, skin crumbs) is not
 * double-composited at corners. N/S strips take the full width;
 * W/E strips take only the rows between them.
 */
export declare function fringeStrips(mask: number, px: number, G: number): Array<[number, number, number, number]>;
export declare function startChunkBake(ground: GroundSampler, detail: DetailSampler, elev: ElevSampler, cx: number, cy: number, px: number, woodSkin?: WoodSkinSampler, live?: boolean, reuse?: HTMLCanvasElement | null, fringe?: FringeSpec): ChunkBakeJob;
export declare function bakeChunk(ground: GroundSampler, detail: DetailSampler, elev: ElevSampler, cx: number, cy: number, px: number, woodSkin?: WoodSkinSampler): HTMLCanvasElement;
/** The world's outline ink — MUST equal Renderer.STRUCT_OUTLINE. The
 *  decks wear the same bold dark edge as walls, props and entities
 *  (the outline "shader"), stroked at BAKE time on exposed silhouette
 *  edges only, so the ring costs nothing per frame. */
/**
 * THE PORCH (exterior decor Phase 3): a lifted deck on dry land — the
 * dock's stance without the water gate. THE CARRIED DECK rule: porch
 * furniture (rails, posts, lamps, and the prop family) laid ON the
 * deck replaces the tile, but the boards must run beneath it — any
 * such tile with a PorchDeck cardinal neighbour keeps its decking and
 * its lift. The renderer's porchAt mirrors this exactly.
 */
export declare function porchCarries(t: number | undefined): boolean;
export declare function isPorchSurface(ground: GroundSampler, tx: number, ty: number): boolean;
/**
 * Bake the LIFTED terrain surface of one chunk at one elevation level:
 * every tile at `level` or higher (ramps excluded — they get bespoke
 * stair props) painted with the full material-skin pipeline, clipped to
 * a marching-squares contour so the plateau top has the same crisp
 * 45°-cut coastline as every other material — then finished with a
 * sunlit brink line along the rim. The renderer draws this canvas
 * shifted UP by level·ELEV_H and y-sorted, which is what makes the
 * plateau a solid mass you can walk behind.
 */
export interface ElevatedBake {
    canvas: HTMLCanvasElement;
    /** Chunk rows (local ly) containing any lifted content at this level. */
    rows: boolean[];
    /** THE LIFTED LAYER PAYS FOR ITS ROWS (B2): the tight canvas covers
     *  only [rowOrigin ..], with painting shifted up by rowOrigin·px — a
     *  consumer must sample row r at `sy = gut + (r - rowOrigin)·px`, not
     *  the pre-B2 `gut + r·px`. Carried here so the one-shot bake can
     *  never hand back a shifted canvas without the offset to read it. */
    rowOrigin: number;
}
/**
 * A sliced elevated-level bake: same shape as ChunkBakeJob so the
 * renderer's budget loop advances it with stepChunkBake. One level
 * used to bake atomically (10-40ms — a guaranteed hitch on any
 * terraced chunk); now the silhouette, each material layer, each
 * detail band, the rim, and the erase pass are separate steps.
 */
export interface ElevatedBakeJob extends ChunkBakeJob {
    rows: boolean[];
    /** THE LIFTED LAYER PAYS FOR ITS ROWS (B2): the chunk row this
     *  level's tight canvas begins at. The canvas covers only the
     *  occupied (±1-padded) row span, and every paint was shifted up by
     *  rowOrigin·px, so the draw samples `sy = gut + (r - rowOrigin)·px`. */
    rowOrigin: number;
}
/** How tall a lifted level's tight canvas must be (B2), and where it
 *  begins, given the per-row occupancy scan.
 *
 *  The renderer draws each band ±1-padded and clamped to [0, CHUNK-1]
 *  (advanceChunkPending), so the canvas must cover [firstRow-1 ..
 *  lastRow+1]. The height is then bucketed UP to a multiple of `bucket`
 *  rows so the byte-bounded chunk pool sees only a handful of lifted
 *  shapes and retired canvases still find reuse — the extra rows sit
 *  unused below the sampled span (the draw only reads rowOrigin..lastRow
 *  +1). Returns a full-height span if the level somehow has no rows
 *  (defensive; callers gate on `any`). */
export declare function liftedRowSpan(rows: readonly boolean[], chunkSize?: number, bucket?: number): {
    rowOrigin: number;
    rowCount: number;
};
export declare function startElevatedBake(ground: GroundSampler, detail: DetailSampler, elev: ElevSampler, cx: number, cy: number, px: number, level: number, takeCanvas?: (rows: number) => HTMLCanvasElement | null | undefined): ElevatedBakeJob | null;
/** The one-shot elevated bake: start + run every step. Output is
 *  identical to the sliced path — this IS the sliced path, run whole. */
export declare function bakeElevated(ground: GroundSampler, detail: DetailSampler, elev: ElevSampler, cx: number, cy: number, px: number, level: number): ElevatedBake | null;
/** Resolves the wood skin a building floor tile is cut from. */
export type WoodSkinSampler = (tx: number, ty: number) => WoodSkin;
/**
 * Live-water options, threaded from the renderer each frame. `full`
 * gates the ENHANCEMENT layer (swells, caustics, rolling foam) — the
 * base water (baked skins, waterline, glints, fishing rings) never
 * turns off, so switching to basic only quiets the surface, it never
 * breaks it. `moonlit` silvers and dims the glitter after dark.
 */
export interface WaterFx {
    full: boolean;
    moonlit: boolean;
}
/**
 * RAISED DECKS. Two structures stride over the water, and they are
 * NOT the same build:
 *
 *   DOCK (Tile.Dock) — the exposed jetty: a plank deck suspended on
 *   driven wooden piles, deliberately reading as "placed over" the
 *   water. Painted by drawDocks.
 *
 *   BRIDGE (Tile.Bridge) — the seated crossing: the same raised walk,
 *   but SEATED INTO both banks — stone abutment steps at every land
 *   threshold, chunky stone piers with an arched fascia over the
 *   water, kerbed board edges, and hip-height rails along every edge
 *   that faces water (the rails are live renderer items so bodies
 *   sort against them). Painted by drawBridges.
 *
 * Both share the deck mechanics: the ground under them is painted as
 * real water (skin, contours and depth all run beneath the boards)
 * and the deck rides DOCK_LIFT tiles of SCREEN height above the
 * surface — renderLift lifts every body standing on one by the same
 * amount, so feet and boards agree by construction. Bake-space
 * vertical offsets must divide by FLAT (the bake squashes at blit
 * time; screen height does not).
 */
export declare const DOCK_LIFT = 0.22;
/** Deck-family ground: the two raised-walk tiles. */
export declare function isDeckGround(t: number | undefined): boolean;
/** Dock tile of a water-touching structure — a raised jetty deck. */
export declare function isDockTile(ground: GroundSampler, tx: number, ty: number): boolean;
/** Bridge tile of a water-touching structure — a raised, seated crossing. */
export declare function isBridgeTile(ground: GroundSampler, tx: number, ty: number): boolean;
/** Either raised deck — everything the water must flow quietly under. */
export declare function isDeckTile(ground: GroundSampler, tx: number, ty: number): boolean;
/** A notch fill's orientation: which two adjacent tile edges the
 *  half-tile deck triangle spans (the diag-wall suffix convention —
 *  the named corner is the SOLID one, the hypotenuse faces away). */
export type DeckFillLegs = 'NE' | 'NW' | 'SE' | 'SW';
export interface DeckFill {
    legs: DeckFillLegs;
    /** Which painter owns the fill — bridge wins a mixed junction. */
    family: 'bridge' | 'dock';
    /** True when the notch is walkable BANK, not water: the crossing's
     *  corner chamfers onto the land — same triangle, land dressing
     *  (contact shade instead of water AO, no pile, no rail). */
    bank: boolean;
}
/**
 * THE 45° NOTCH-FILL LAW. A stair-stepped span (a diagonal worldgen
 * road crossing, an angled jetty) exposes inner corners: water tiles
 * hugged by deck on exactly two ADJACENT sides. Each such notch grows
 * a lifted half-tile deck TRIANGLE spanning those two edges, so the
 * staircase reads as a clean 45° crossing — the same chamfer language
 * as the diagonal walls, with no new tiles and no data changes (the
 * notch tile stays water: solid, unwalkable, pure visual). The gate
 * is deliberately narrow: three deck sides is an authored inlet (a
 * boat slip must not seal over), opposite sides are a deliberate gap,
 * a FishingSpot must never be boarded over, and fills never chain off
 * other fills (legs demand real deck tiles).
 */
export declare function deckFillAt(ground: GroundSampler, tx: number, ty: number): DeckFill | null;
/**
 * THE FILL IS REAL GROUND (bridge rework round 7). A notch fill's
 * triangle is a standing surface, not paint: anything with feet — the
 * player wading a shallow notch, a pet, a drop — that stands INSIDE
 * the triangle stands ON the deck (renderLift lifts it, the wade
 * dressing stays off, footsteps sound wood). The fill's cell can be
 * WALKABLE (WaterShallow, or bare land under a bank chamfer), so the
 * old "pure visual" reading left bodies sunk to the shins in painted
 * boards. Point-in-triangle by the legs' named solid corner; the
 * hypotenuse itself counts as deck (feet on the arris stand proud).
 */
export declare function fillContains(legs: DeckFillLegs, tx: number, ty: number, x: number, y: number): boolean;
/**
 * THE MIRROR STOPS AT THE STRUCTURE (round 7). The reflection pass
 * clips to the raw water region — but the lifted decks PAINT into
 * water cells: a fill's triangle and fascia live on a water tile, and
 * every deck tile's lifted boards reach DOCK_LIFT/FLAT world-rows into
 * the cell north of it (plus the organic water contour can wobble into
 * the deck cell's own fascia). Reflections composited over those
 * pixels lay a ghost body across planks and rim joists. This returns
 * the deck-COVERED area as disjoint world-space rects (one shape per
 * cell column, bands tiled so vertically adjacent decks never
 * overlap — the renderer subtracts them from the clip with an
 * even-odd path, where any overlap would flip back to a leak).
 */
export declare function deckCoverRects(ground: GroundSampler, bounds: {
    minTx: number;
    maxTx: number;
    minTy: number;
    maxTy: number;
}): Array<{
    x: number;
    y: number;
    w: number;
    h: number;
}>;
/** Does a notch fill at (x,y) cover that tile's given edge? The two
 *  leg edges are interior deck — every painter treats them exactly
 *  like a deck neighbor (no fascia, no kerb, no stroke, no rail, no
 *  lap line), so the fill welds seamlessly into the span. */
export declare function fillCoversEdge(ground: GroundSampler, x: number, y: number, edge: 'N' | 'S' | 'E' | 'W'): boolean;
/**
 * The walk axis of a whole connected deck span, decided ONCE for the
 * span so every member tile lays its boards, kerbs and rails the same
 * way (a per-tile guess splits a wobbly-banked crossing into mixed
 * directions): flood the deck region (4-way, capped), count exposed
 * edges that meet water on each axis — a river runs past the SIDES —
 * and fall back to the region's long axis when the water reads
 * ambiguous. Returns true when the walk runs N-S. `out` collects the
 * verdict for every member tile so callers memoize one flood per span.
 */
export declare function deckWalkIsVertical(ground: GroundSampler, tx: number, ty: number, out?: Map<number, boolean>): boolean;
/**
 * THE ARM LAW (deck platform rework). Board JOINT RHYTHM follows the
 * ARM a tile sits in, measured on the spot: the contiguous deck run
 * through the tile along each axis (capped). A long N-S arm breaks
 * its boards in the brick bond, a long E-W arm runs long planks —
 * and an L- or T-shaped complex resolves ARM BY ARM instead of
 * flipping per tile (the old per-tile guess butted the two rhythms
 * mid-run with no seam at all). Where two arms genuinely meet, the
 * rhythm verdicts disagree across one shared edge — and that edge is
 * exactly where the painters lay a HEADER BEAM, so every rhythm
 * change in the world is carpentry, never an accident.
 *
 * This is the APPEARANCE axis only. The WALK axis (aprons, kerbs,
 * thresholds, rails) stays with deckWalkIsVertical's span flood —
 * a span keeps one walk even where its board rhythm turns a corner.
 */
export declare function deckArmVertical(ground: GroundSampler, tx: number, ty: number): boolean;
/** Which way a bridge tile ramps: the LAND side of an apron, or
 *  'none' for a full-height tile. */
export type BridgeApron = 'none' | 'W' | 'E' | 'N' | 'S';
/**
 * THE APRON LAW. An apron is the span's last tile before a walk-end
 * bank: its deck RAMPS from grade at the land edge up to DOCK_LIFT at
 * the deck side, exactly like the Ramp tile's flight — the road pours
 * onto the bridge with no step, no floating threshold, no water
 * peeking out under a hovering end. The bake shears the apron's deck
 * kit along this slope and renderLift interpolates the same slope
 * under every body, so feet and boards agree by construction.
 *
 * THE RUN LAW: a candidate only ramps if its ENTIRE cross-axis run of
 * deck tiles carries the SAME candidacy — one row sloping beside a
 * row still at full height tears the deck open along their shared
 * edge (the exact seam artifact on ragged spans). Any run member with
 * a different verdict — a row that continues further, a dock tile
 * that can never slope, a row ending over water — flattens the whole
 * run, and those ends wear the flat threshold kit instead. Seams are
 * impossible by construction: lift profile is uniform per run.
 */
export declare function bridgeApronAt(ground: GroundSampler, tx: number, ty: number, walkVert: boolean): BridgeApron;
/**
 * The breeze layer: drifting water glints, swell bands, shallow-water
 * caustics, the surf shoreline and portal swirls. Drawn every frame
 * over the baked ground. (Grass and flowers live in grass.ts.)
 */
/**
 * THE WET LEDGER — the live-water pass, compiled. The breeze layer only
 * ever dresses the water family and the decks it laps against, yet the
 * scan paid sampler calls for every meadow tile in view (and the
 * shoreline march paid four corner reads per dual cell). A caller that
 * already holds a tile snapshot (the renderer's frame grid) compiles
 * these lists in one linear typed-array pass and hands them in; the
 * passes then visit only tiles that can possibly speak. The lists are
 * BUILT FRESH each frame from the same snapshot the samplers read, so
 * there is nothing to invalidate — and every caller without lists (the
 * elevated bands' single-row calls, the editor, bakes) keeps the plain
 * scan, which remains the always-correct fallback.
 *
 * Packing: (tx + 0x8000) << 16 | (ty + 0x8000), row-major append — the
 * exact visit order of the scans they replace, so bucket insertion
 * order (draw order) is preserved by construction.
 */
export interface WetLists {
    /** Wet tiles (water family or deck) inside the pass bounds. */
    tiles: number[];
    /** Dual cells with at least one water-family corner (bounds+1 grid). */
    cells: number[];
}
export declare function wetClassOf(t: number): number;
export declare function drawLiveGround(ctx: CanvasRenderingContext2D, ground: GroundSampler, bounds: {
    minTx: number;
    maxTx: number;
    minTy: number;
    maxTy: number;
}, worldToScreen: (wx: number, wy: number) => {
    x: number;
    y: number;
}, s: number, timeMs: number, fx?: WaterFx, wet?: WetLists): void;
/**
 * The visible water region as ONE Path2D in WORLD tile coordinates:
 * interior dual cells as rects, boundary cells through the same organic
 * contour geometry as the baked skin — so a reflection clipped by this
 * path ends exactly at the painted meander, never at a tile edge. The
 * renderer's reflection pass applies it under the camera's affine
 * transform. Returns null when no water is in view.
 */
export declare function waterRegionPath(ground: GroundSampler, bounds: {
    minTx: number;
    maxTx: number;
    minTy: number;
    maxTy: number;
}, cells?: number[], project?: (wx: number, wy: number) => {
    x: number;
    y: number;
}): Path2D | null;
/** Water tiles that share a shoreline (no foam between each other). */
export declare function isWaterTile(t: number | undefined): boolean;
//# sourceMappingURL=terrain.d.ts.map