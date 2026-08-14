/**
 * THE MARKED WORLD — combat-lane temperaments (buildcraft Phase 6).
 *
 * The anti-convergence engine: "best build" must have no answer
 * without "against what." A family that turns arrows or cracks under
 * the great blade makes gear choice a PER-TARGET question, which
 * multiplies viable builds with zero balance passes — the classless
 * lesson (bring the right tool) done with categorical lanes instead
 * of spreadsheet percentages.
 *
 * The laws:
 * - lanes are CATEGORICAL: a body is weak to a lane or turns it,
 *   at one fixed pair of multipliers game-wide. Legibility beats
 *   granularity — a player learns "bones shrug arrows" once and owns
 *   it forever.
 * - lanes fold at the ONE SEAM (damageNpc), after the state bucket,
 *   and the world TEACHES them in play: a turned or bitten lane
 *   floats its word, throttled per body, so the lesson costs no
 *   codex dive.
 * - DoT drips stay unlaned — the wound is already inside the armor,
 *   the same law mitigation follows.
 * - element lanes are a FUTURE DOOR: the seam only knows the style
 *   today; wiring the hit's school through would let "the fen fears
 *   fire" — deferred until an authored family needs it.
 *
 * Authored on the families whose bodies argue for it and no further:
 * bones turn arrows and crack under crush; stone turns the edge and
 * yields to the working; the formless swallow shafts and fear the
 * working; carapace turns the edge and cracks under crush. Flesh
 * stays fair — wolves, brigands, and everything warm keep no lanes.
 */
import type { SkillId } from '@arx/shared';

export type DamageLane = 'onehand' | 'twohand' | 'archery' | 'arx';

/** A weak lane bites this much harder. Categorical, game-wide. */
export const LANE_WEAK_MULT = 1.25;
/** A turned lane lands this much softer. Categorical, game-wide. */
export const LANE_RESIST_MULT = 0.8;

export interface NpcLanes {
  weak?: readonly DamageLane[];
  resist?: readonly DamageLane[];
}

/**
 * The style a blow rode in on, folded to its lane. The knife arts and
 * the off blade are blade work (onehand); the shield and the bare
 * schools carry no lane.
 */
export function laneOf(style: SkillId): DamageLane | null {
  switch (style) {
    case 'onehand':
    case 'dualwield':
    case 'sneak':
      return 'onehand';
    case 'twohand':
      return 'twohand';
    case 'archery':
      return 'archery';
    case 'arx':
      return 'arx';
    default:
      return null;
  }
}

const BONES: NpcLanes = { resist: ['archery'], weak: ['twohand'] };
const STONE: NpcLanes = { resist: ['onehand'], weak: ['arx'] };
const FORMLESS: NpcLanes = { resist: ['archery'], weak: ['arx'] };
const CARAPACE: NpcLanes = { resist: ['onehand'], weak: ['twohand'] };

export const NPC_LANES: Record<string, NpcLanes> = {
  // Bones turn arrows; the great blade cracks them.
  skeleton: BONES,
  skeleton_guard: BONES,
  skeleton_archer: BONES,
  skeleton_chanter: BONES,
  skeleton_champion: BONES,
  // Stone turns the edge; the working unbinds the binding.
  rock_golem: STONE,
  iron_golem: STONE,
  fire_golem: STONE,
  ice_golem: STONE,
  // The formless swallow shafts whole and fear the working.
  slime: FORMLESS,
  slime_small: FORMLESS,
  // Carapace turns the edge and cracks under crush.
  giant_beetle: CARAPACE,
  mudcrab: CARAPACE,
};
