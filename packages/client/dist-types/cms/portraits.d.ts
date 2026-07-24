import type { NpcActorDef, NpcDef } from '@devcraft/content';
/** A humanoid actor's bust, cached per definition content. */
export declare function actorBust(def: NpcActorDef, size?: number): HTMLCanvasElement | null;
/**
 * A creature crest: the def's color as a beast-shaped emblem with the
 * level struck into it — an honest, consistent identity card.
 */
export declare function creatureCrest(def: NpcDef, size?: number): HTMLCanvasElement;
//# sourceMappingURL=portraits.d.ts.map