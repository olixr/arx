import { type BodyStyle } from './armorStyles.js';
export declare function drawPauldron(ctx: CanvasRenderingContext2D, st: BodyStyle, x: number, y: number, side: number, s: number, squashK: number, hurt: boolean, near: boolean, nowMs?: number, 
/** THE SHOULDER GLOBE's depth channel, -1 (far) .. +1 (near): the
 *  caller projects the shoulder bar through the tilted camera and
 *  this cap's place on it sizes the whole assembly — perspective as
 *  size, before the shading says a word. 0 = the level flank read. */
depthK?: number, 
/** Outward lean, radians: the cap rotates toward its own outward
 *  screen direction as the body turns — worn on the deltoid, not
 *  gimbaled upright at every heading. */
tilt?: number): void;
//# sourceMappingURL=armorPauldron.d.ts.map