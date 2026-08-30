import type { ClientGame } from '../../game/clientGame.js';
import { MapView } from './mapView.js';
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
    private readonly legend;
    private readonly questPane;
    private readonly questList;
    private readonly allChip;
    /** Errands the reader has waved off the chart — persisted per soul. */
    private readonly hidden;
    private hiddenLoaded;
    private paneVersion;
    private paneFocus;
    private lastDistBeat;
    /** The followed errand (the tracker's own), wired by main. */
    getFollowed: (() => string | null) | null;
    private readonly setHint;
    private hintMode;
    private padPrev;
    private readonly keys;
    private zoomHold;
    private zoomHeldSince;
    private readonly hintDefault;
    /** Built fresh each show — the letters follow the live pad's markings. */
    private get hintPad();
    constructor(game: ClientGame, 
    /** The game renderer's adaptive dpr, threaded down to the view. */
    effectiveDpr?: () => number);
    /** A held zoom stop: tap steps, holding glides. */
    private zoomChip;
    private stepZoom;
    /**
     * THE DANGER LEGEND — the lens explained in one strip: a swatch per
     * tier wearing the wash's true ink, each naming its creature levels,
     * bookended by the plain words. Hidden until the lens is on.
     */
    private buildLegend;
    /** Per-frame: apply the held reading keys and the held zoom stops. */
    private drive;
    get isOpen(): boolean;
    open(): void;
    close(): void;
    private centerOnPlayer;
    private get hideKey();
    private saveHidden;
    private loadHidden;
    /** The view draws active-minus-hidden; the pane owns the set. */
    private syncShown;
    /**
     * THE FINGER LANDS: focus one errand — show it, breathe its
     * grounds, and frame the chart around them (or around the one
     * ground passed in, when a journal row pointed at a single ask).
     * Call open() first; the chart must be standing before it can be
     * framed.
     */
    focusQuest(quest: string, ground?: {
        x: number;
        y: number;
        r: number;
        plane?: string;
    }): void;
    /** Frame a set of grounds with air around them, never wall to wall. */
    private frameGrounds;
    /** One unmet ask's whereabouts for the pane's distance foot. */
    private paneTarget;
    /**
     * THE ERRAND RAIL — dealt from the ledger: the followed errand
     * first, then work ready to hand in, then the rest by name. Each
     * row wears its chart ink, tells its asks and their distances, and
     * carries its own Hide/Show chip; the row itself frames the chart.
     * Structure repaints only when the ledger clock turns (or a verb
     * here forces it); the distance feet breathe on their own beat.
     */
    private renderPane;
    /** The distance feet: "420 paces NE", "hereabouts", "another realm". */
    private updateDistances;
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