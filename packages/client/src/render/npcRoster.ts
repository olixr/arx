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
export const HUMANOID_PREFIXES: readonly string[] = [
  'goblin',
  'skeleton',
  'kobold',
  'brigand',
  'gnoll',
  'ogre',
  'skral',
  'hobgoblin',
];
export const HUMANOID_SUFFIXES: readonly string[] = ['_golem'];
export const HUMANOID_EXACT: readonly string[] = ['troll'];

/** True for a def that paints as a humanoid monster. */
export function isHumanoidMonster(defId: string): boolean {
  for (const p of HUMANOID_PREFIXES) if (defId.startsWith(p)) return true;
  for (const s of HUMANOID_SUFFIXES) if (defId.endsWith(s)) return true;
  return HUMANOID_EXACT.includes(defId);
}

/** Rough stature per family (1 = a townsperson) until the dialect looks are ported. */
export function humanoidMonsterSize(defId: string): number {
  if (defId === 'troll') return 1.4;
  if (defId.startsWith('ogre')) return 1.35;
  if (defId.endsWith('_golem')) return 1.2;
  if (defId.startsWith('hobgoblin') || defId.startsWith('brigand')) return 1;
  return 0.85;
}
