/**
 * THE VIEW ADAPTER — the one seam between the DOM chrome and whatever
 * draws the world. The HUD pieces that pin themselves to world points
 * (speech bubbles, the waypoint pill, party pointers) and the Display
 * bench used to take the concrete 2D `Renderer`; now they take THIS,
 * the minimal surface they actually read. The 2D Renderer satisfies it
 * structurally (main.ts still hands the Renderer over, unchanged); the
 * 3D client (src/play3d) hands over its own view. Type-only: no
 * runtime lives here.
 */
import type { Vec2 } from '@arx/shared';
import type { StageResTier } from '../render/stage/renderScale.js';
/** The camera facts the chrome reads: px per tile, and the zoom dial. */
export interface ViewCamera {
    /** Screen pixels per world tile at the look-at point. */
    readonly scale: number;
    /** The live zoom (glides toward targetZoom). */
    zoom: number;
    targetZoom: number;
    setZoom(z: number): void;
    stepZoom(factor: number): void;
}
/** The Display bench's switches (inert on a view that has no such lane). */
export interface ViewDisplayFlags {
    stageGround: boolean;
    stageWorld: boolean;
    leanTarget: number;
    stageResTier: StageResTier;
    reflectionsOn: boolean;
    waterFxFull: boolean;
    /** Drop backend-specific caches after a stage/lean switch. */
    onBackendSwitch(): void;
}
export interface ViewAdapter extends ViewDisplayFlags {
    readonly camera: ViewCamera;
    /**
     * Screen position (CSS px, viewport w×h) of a world ground point,
     * terrain lift applied — where a label's foot should sit.
     */
    screenAnchor(wx: number, wy: number, w: number, h: number): {
        x: number;
        y: number;
    };
    /** The world ground point under a screen pixel. */
    pickWorld(sx: number, sy: number): Vec2;
}
//# sourceMappingURL=viewAdapter.d.ts.map