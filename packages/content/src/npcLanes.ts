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

/** The full lane roster as a value (validators check membership here). */
export const DAMAGE_LANES: readonly DamageLane[] = ['onehand', 'twohand', 'archery', 'arx'];

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
const GIANT: NpcLanes = { resist: ['onehand'], weak: ['archery'] };
// Slick hide sheds the shaft; the working bites the wet. (Same pair
// the formless speak, but the skral EARN it differently — an arrow
// skates off angled slime-coated scale where a slime swallows it.)
const SLICK: NpcLanes = { resist: ['archery'], weak: ['arx'] };
// The raised shield catches the shaft; the great blade caves the
// wall. (Same pair the bones speak, but the legion EARNS it
// differently — flesh stays fair, and the hobgoblin's flesh IS fair:
// it is the drilled kiteshield that turns the arrow, and the crushing
// two-hander that no shield rim can answer. The unshielded ranks —
// the longbowman, the warcaster — keep no lanes at all.)
const PHALANX: NpcLanes = { resist: ['archery'], weak: ['twohand'] };

export const NPC_LANES: Record<string, NpcLanes> = {
  // Bones turn arrows; the great blade cracks them.
  skeleton: BONES,
  skeleton_guard: BONES,
  skeleton_archer: BONES,
  skeleton_chanter: BONES,
  skeleton_champion: BONES,
  skeleton_kingsman: BONES,
  skeleton_crownsguard: BONES,
  // Stone turns the edge; the working unbinds the binding.
  rock_golem: STONE,
  iron_golem: STONE,
  fire_golem: STONE,
  ice_golem: STONE,
  // The formless swallow shafts whole and fear the working — the
  // whole ooze family speaks it (docs/ooze-family-plan.md).
  slime: FORMLESS,
  slime_small: FORMLESS,
  giant_slime: FORMLESS,
  gray_ooze: FORMLESS,
  frost_slime: FORMLESS,
  tar_slime: FORMLESS,
  gelatinous_cube: FORMLESS,
  // Carapace turns the edge and cracks under crush.
  giant_beetle: CARAPACE,
  mudcrab: CARAPACE,
  giant_crab: CARAPACE,
  // Dracolisk scute is grown plate: the edge skates, the crushing
  // blow cracks it. The fen cousin's keeled leather stays fair.
  basilisk: CARAPACE,
  elder_basilisk: CARAPACE,
  // A hand of fat and hide shrugs the short edge; a body that big
  // cannot dodge the aimed shaft.
  ogre: GIANT,
  ogre_hurler: GIANT,
  ogre_bellower: GIANT,
  ogre_champion: GIANT,
  // The brine-folk: slick scale turns the shaft, the storm finds the wet.
  skral: SLICK,
  skral_harpooner: SLICK,
  skral_tidecaller: SLICK,
  skral_champion: SLICK,
  // ...and the lane rides the race's crowns whole (THE BRINE CROWNS).
  skral_tidelord: SLICK,
  skral_deepmaw: SLICK,
  // The legion's shield-bearers: the wall turns the shaft, the crush
  // caves the wall. Only the ranks that CARRY the kiteshield (or the
  // juggernaut's plate) earn the lane — the bow and the staff ranks
  // fight fair.
  hobgoblin: PHALANX,
  hobgoblin_champion: PHALANX,
  hobgoblin_juggernaut: PHALANX,
};
