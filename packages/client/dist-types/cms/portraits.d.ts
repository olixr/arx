import type { Look } from '@arx/shared';
import type { NpcActorDef } from '@arx/content';
type Equipment = Partial<Record<string, string>>;
/** A ringed three-quarter bust of a raw look (plus optional gear). */
export declare function lookBust(look: Look, size?: number, equipment?: Equipment): HTMLCanvasElement | null;
/** The whole body standing square to the camera, ring and all. */
export declare function lookFigure(look: Look, size?: number, equipment?: Equipment): HTMLCanvasElement | null;
/** A humanoid actor's ringed bust; null for creature-bodied actors. */
export declare function actorBust(def: NpcActorDef, size?: number): HTMLCanvasElement | null;
/** A humanoid actor's full standing figure; null for creature bodies. */
export declare function actorFigure(def: NpcActorDef, size?: number): HTMLCanvasElement | null;
export {};
//# sourceMappingURL=portraits.d.ts.map