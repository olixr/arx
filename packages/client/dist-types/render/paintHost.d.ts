/**
 * THE PAINTER'S GRIP — the one slice of the Renderer every extracted
 * painter family holds (foundations F2). One shared type keeps
 * cross-family calls assignable; it only ever shrinks as machinery
 * moves out of the class.
 */
import type { Renderer } from './renderer.js';
export type PaintHost = Pick<Renderer, 'bakingMask' | 'beginStructOutline' | 'breezeAt' | 'camera' | 'castEdgeQuad' | 'ctx' | 'doorOpenness' | 'doorShakeAt' | 'garrisonish' | 'h' | 'outlineOn' | 'pickWorld' | 'porchAt' | 'queueGlow' | 'w' | 'wallish'>;
//# sourceMappingURL=paintHost.d.ts.map