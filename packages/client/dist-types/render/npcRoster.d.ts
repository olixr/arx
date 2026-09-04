/**
 * THE HUMANOID ROSTER — which NPC families stand on the full IK rig
 * (drawHumanoid on a LegSolver) instead of the universal four-legged
 * rig, and their rough stature. ONE table, read by both doors: the 2D
 * renderer's npcItem carries the same predicate inline (renderer.ts —
 * it moves onto this import the day that file is open for edits; until
 * then `npcRoster.test.ts` holds the two in lock-step), and the 3D
 * client's bodies.ts reads it here.
 */
/** Prefix / suffix / exact matches, in the 2D renderer's order. */
export declare const HUMANOID_PREFIXES: readonly string[];
export declare const HUMANOID_SUFFIXES: readonly string[];
export declare const HUMANOID_EXACT: readonly string[];
/** True for a def that paints as a humanoid monster. */
export declare function isHumanoidMonster(defId: string): boolean;
/** Rough stature per family (1 = a townsperson) until the dialect looks are ported. */
export declare function humanoidMonsterSize(defId: string): number;
//# sourceMappingURL=npcRoster.d.ts.map