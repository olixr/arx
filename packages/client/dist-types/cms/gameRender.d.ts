import type { NpcDef } from '@arx/content';
/**
 * Paint through the world's outline shader: art at 3× supersample on
 * a transparent stage, 8-tap ring in the world ink, shadow cast from
 * the ringed silhouette, one high-quality downscale.
 */
declare function ringComposite(size: number, paint: (ctx: CanvasRenderingContext2D, px: number) => void): HTMLCanvasElement;
/**
 * A creature exactly as the game draws it: its own body painter,
 * standing, facing the camera, wearing the world's outline ring.
 */
export declare function creatureRender(def: NpcDef, size?: number): HTMLCanvasElement;
export { ringComposite };
//# sourceMappingURL=gameRender.d.ts.map