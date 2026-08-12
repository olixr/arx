/**
 * THE MINIMAP INSTRUMENT — the zone at a glance, ported from v1: a
 * flat tile-color bitmap rebuilt at most every 350ms, the gold
 * viewport window, click-jump and drag-pan.
 */
import type { EditorState } from '../editor/state.js';
import type { Viewport } from './viewport.js';
export declare class Minimap {
    private readonly canvas;
    private readonly state;
    private readonly view;
    private readonly onJump;
    private bitmap;
    dirty: boolean;
    private lastBuild;
    private dragging;
    private readonly colors;
    constructor(canvas: HTMLCanvasElement, state: EditorState, view: Viewport, onJump: () => void);
    private color;
    private rebuild;
    private layout;
    draw(nowMs: number): void;
    private jump;
}
//# sourceMappingURL=minimap.d.ts.map