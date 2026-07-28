import type { ClientGame } from '../game/clientGame.js';
import type { Renderer } from '../render/renderer.js';
/**
 * THE WAYFINDER — the one waypoint's live compass on the HUD.
 *
 * Smoked-glass tier (v4.3: the live HUD only whispers): a small pill
 * with a rotating arrow and the distance in tiles. When the flag's
 * spot is on screen the pill floats OVER it (arrow tucked away); when
 * it's off screen the pill rides the screen edge, arrow aimed along
 * the bearing. Within a few tiles it dims — you have arrived, the
 * chart can rest.
 */
export declare class WaypointHud {
    private readonly el;
    private readonly arrowWrap;
    private readonly dist;
    constructor();
    /** Per-frame from the main loop. Pass hidden=true to suppress (screens, cinema, build). */
    update(game: ClientGame, renderer: Renderer, hidden: boolean): void;
}
//# sourceMappingURL=waypointHud.d.ts.map