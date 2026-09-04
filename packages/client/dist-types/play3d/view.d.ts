import type { Vec2 } from '@arx/shared';
import type { ViewAdapter, ViewCamera } from '../ui/viewAdapter.js';
import type { Engine } from './engine.js';
import { type PickRay } from './pick.js';
export declare class Play3DView implements ViewAdapter {
    private readonly engine;
    private readonly heightAt;
    readonly camera: ViewCamera;
    private readonly v;
    private readonly ray;
    private readonly hit;
    private readonly out;
    constructor(engine: Engine, heightAt: (wx: number, wy: number) => number);
    screenAnchor(wx: number, wy: number, w: number, h: number): {
        x: number;
        y: number;
    };
    /** The camera ray through a CSS pixel, written into `ray`. */
    rayThrough(sx: number, sy: number): PickRay;
    pickWorld(sx: number, sy: number): Vec2;
}
//# sourceMappingURL=view.d.ts.map