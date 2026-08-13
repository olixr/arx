import type { ClientGame } from '../../game/clientGame.js';
import { MapView } from './mapView.js';
/**
 * THE CHART TABLE — the fullscreen map (M). One canvas wearing the
 * expedition case, driven by its own rAF loop only while open (the
 * game renderer never pays for a closed map). Drag pans, wheel zooms,
 * a click plants the one waypoint, a click on the flag lifts it.
 *
 * The pad reads the same chart: left stick pans (UiNav lends the
 * stick), LT/RT zoom, Ⓨ plants or lifts the waypoint under the
 * reticle, Ⓧ centers on you; the rail chips stay d-pad + Ⓐ stops.
 */
export declare class MapScreen {
    private readonly game;
    private readonly panel;
    private readonly canvas;
    readonly view: MapView;
    private raf;
    private dragging;
    private dragMoved;
    private lastX;
    private lastY;
    private centered;
    private lastBand;
    private readonly coordsEl;
    private readonly reticle;
    private readonly setHint;
    private hintMode;
    private padPrev;
    private readonly hintDefault;
    /** Built fresh each show — the letters follow the live pad's markings. */
    private get hintPad();
    constructor(game: ClientGame, 
    /** The game renderer's adaptive dpr, threaded down to the view. */
    effectiveDpr?: () => number);
    get isOpen(): boolean;
    open(): void;
    close(): void;
    private centerOnPlayer;
    /**
     * THE ERRAND POINTS AT THE CHART: lay an errand's search ring on
     * the table and frame the view around it (call open() first — the
     * chart must be standing before it can be framed). The ring stays
     * across folds until its errand leaves the ledger or another call
     * re-points it.
     */
    frameSearchRing(ring: NonNullable<MapView['searchRing']>): void;
    /**
     * Per-frame pad drive while the chart is open in pad mode. UiNav
     * lends the left stick (claimStick); LT/RT zoom about the center;
     * Ⓨ plants or lifts the waypoint at the reticle; Ⓧ centers on you.
     */
    padUpdate(snap: {
        buttons: readonly GamepadButton[];
        axes: readonly number[];
    } | null): void;
    /** The mouse took the chart back — restore the pointer hint. */
    kbHint(): void;
    private wireInput;
}
//# sourceMappingURL=mapScreen.d.ts.map