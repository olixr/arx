import type { ClientGame } from '../../game/clientGame.js';
import { MapView } from './mapView.js';
/**
 * THE CHART TABLE — the fullscreen map (M). One canvas wearing the
 * expedition case, driven by its own rAF loop only while open (the
 * game renderer never pays for a closed map). Drag pans, wheel zooms,
 * a click plants the one waypoint, a click on the flag lifts it.
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
    private readonly hintDefault;
    constructor(game: ClientGame);
    get isOpen(): boolean;
    open(): void;
    close(): void;
    private centerOnPlayer;
    private wireInput;
}
//# sourceMappingURL=mapScreen.d.ts.map