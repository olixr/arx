import { type DiscoveryWire } from '@arx/shared';
import type { ClientGame } from '../../game/clientGame.js';
/** Danger tier → overlay wash (index = tier) — the studio's palette.
 *  Exported for the chart rail's legend, which must speak the same ink. */
export declare const TIER_WASH: string[];
/**
 * THE WORLDS APART: the chart's three postures — the surface (the full
 * instrument: procgen fill, danger wash, markers), the underworld (a
 * persistent chart of carved rock — what you've walked is remembered,
 * the unstreamed dark reads as stone), and a rift (the per-run scratch
 * chart, forgotten when the run ends).
 */
export type MapBand = 'surface' | 'underworld' | 'dungeon';
export interface MapPick {
    kind: 'discovery' | 'waypoint' | 'questground';
    d?: DiscoveryWire;
    /** questground: the errand and the ground under the finger. */
    quest?: string;
    ground?: {
        x: number;
        y: number;
        r: number;
        label: string;
    };
}
export declare class MapView {
    private readonly canvas;
    private readonly game;
    /** The game renderer's adaptive-resolution dpr — the chart must
     *  not out-render a main view that has already stepped down. */
    private readonly effectiveDpr;
    panX: number;
    panY: number;
    /** Pixels per world tile. */
    scale: number;
    showDanger: boolean;
    hover: DiscoveryWire | null;
    /** Uncharted ground wears the vellum (fullscreen) or nothing (overlay). */
    parchment: boolean;
    /** Overlay mode: quieter marks, no hover, town labels only. */
    overlay: boolean;
    /**
     * THE FINGER ON THE CHART — which errands paint their grounds. The
     * quest pane owns this set (and persists it); the view only draws.
     * `questFocus` is the pane's selected errand: it breathes, wears its
     * labels, and points from the sheet's edge when its grounds are off
     * it. The traveler's glass ignores the set and draws only the
     * followed errand, quietly.
     */
    readonly questShown: Set<string>;
    questFocus: string | null;
    /** The followed errand (the tracker's own) — wired by main. */
    getFollowed: (() => string | null) | null;
    /** The ground under the pointer, set by the screen from pick(). */
    questHover: {
        quest: string;
        ground: {
            x: number;
            y: number;
            r: number;
            label: string;
        };
    } | null;
    private questDisplay;
    private questDisplayStamp;
    /** Fine (1px/tile) blocks — big canvases, tight cap. */
    private fineBlocks;
    /** Coarse + super blocks — small canvases, roomy cap. */
    private coarseBlocks;
    private dangerBlocks;
    /** Probe-fill colors for blocks the budget hasn't baked yet — pure
     *  worldgen, safe to memoize for the session. */
    private probeColors;
    private dangerRev;
    private lastAnchors;
    private lastWorldVersion;
    /** Camera/world fingerprint of the last terrain+fog composite. */
    private lastStamp;
    /** Whether that composite had every visible block baked. */
    private lastAllBaked;
    private readonly fog;
    private readonly dungeonFog;
    private layer;
    private fogCnv;
    /** Reusable block-resolution sheet for the sampled LODs — coarse and
     *  super blocks compose here unsmoothed (32px each), then reach the
     *  layer in ONE smoothed blit. Scaling each 32px block up on its own
     *  bled edges against transparent: a faint seam grid at far zoom. */
    private sheet;
    constructor(canvas: HTMLCanvasElement, game: ClientGame, 
    /** The game renderer's adaptive-resolution dpr — the chart must
     *  not out-render a main view that has already stepped down. */
    effectiveDpr?: () => number);
    tileAtFloat(mx: number, my: number): {
        x: number;
        y: number;
    };
    private sx;
    private sy;
    zoomAt(mx: number, my: number, factor: number): void;
    centerOn(tx: number, ty: number, scale?: number): void;
    /** The band the reader is charting right now — the plane's law. */
    band(): MapBand;
    /**
     * THE ERRAND'S INK — stable per quest id (the hash), probed apart
     * across the ACTIVE ledger so no two errands share a color while
     * six or fewer are underway. Assignment reads the whole ledger, not
     * the shown set, so toggling one errand never recolors another.
     */
    private questInks;
    /** The ink an errand wears everywhere (chart, pane, pointers). */
    questInk(quest: string): readonly [number, number, number];
    /**
     * Deal the drawable grounds from the quest wire — rebuilt only when
     * the ledger clock, the shown set, or the focus moves. A finished
     * errand leaves the chart by construction: it leaves the ledger,
     * questVersion turns, and the stamp re-deals.
     */
    private buildQuestDisplay;
    /**
     * THE CROSSING: every block, probe, and fog canvas is keyed by
     * coordinates that just changed worlds — drop them all. Called from
     * the onPlane event (main.ts wires it).
     */
    onPlaneSwitch(): void;
    /** Live chunks moved — drop the fine blocks near the player (the
     * only place streamed data ever changes). */
    private refreshLiveBlocks;
    private probeFill;
    /** Sampled bake — coarse (span 128, step 4) and super (span 512,
     *  step 16) share the loop; both land on a 32×32 canvas. */
    private bakeSampled;
    /**
     * Fine block: one pixel per tile. LIVE chunks are the session's
     * truth and always win; worldgen fills the rest (never in the
     * instance band — a dungeon the stream hasn't shown stays rock).
     */
    private bakeFine;
    /** Danger wash for one block, 16×16 samples whatever the span. The
     *  render loop owns the cache check and the per-frame bake budget —
     *  an over-budget block simply waits its turn (the wash fills in
     *  over a few frames) instead of the whole visible sheet baking in
     *  one frame, which at far zoom was thousands of canvases at once. */
    private bakeDanger;
    /** THE STILL SHEET fingerprint — everything the terrain+fog
     *  composite depends on. While it holds (and every visible block is
     *  baked), the layer from last frame is still the truth and the
     *  whole bake/fog pass is skipped; marks re-draw on top each frame
     *  regardless. Live-chunk versions only matter to the fine LOD —
     *  coarse and super bakes never read streamed chunks. */
    private layerStamp;
    render(nowMs: number): void;
    pick(mx: number, my: number): MapPick | null;
}
//# sourceMappingURL=mapView.d.ts.map