/**
 * THE ANSWERED LIFE — the book of Callings (callings-v2-plan.md).
 *
 * A Calling is the character axis of the build: answered under THE
 * FOCUS LAW's budget (shared/skills.ts), free to toggle any time,
 * unlocked by BASE level up its skill's ladder. What you hold
 * answered under a budget that cannot hold everything IS your class.
 *
 * THE CALLING IS A PACKAGE: `effects` is a list, one to several
 * licensed shapes per Calling. ONE GRAMMAR binds every shape — a
 * Calling speaks the same vocabulary the equipment axis speaks
 * (EnchantEffect aggregates, the proc grammar, the buff forge's
 * folds, the status book's pages) plus the one-site perk dials:
 *  - gear:        an EnchantEffect aggregate folded into GearStats by
 *                 the same foldEffect law enchants use (recomputeGear).
 *  - perPiece:    an aggregate scaled by worn armor-class piece count,
 *                 applied after the gear fold reads classCounts.
 *  - perk:        a named dial read at exactly one server hook site —
 *                 the PERK_DIALS registry below documents each site,
 *                 and PERK_FOLD declares each dial's composition law.
 *  - doubleGather / gatherSpeed / materialSave / craftSpeed: trade
 *                 dials keyed by skill, read at the gather/craft
 *                 sites — self-keyed by law (the trade's own thrift
 *                 points at its own trade).
 *  - proc:        the waking hand — trigger x action x icd through
 *                 the fighter's one meter map (Phase 2 opens the
 *                 door; TYPED-UNREAD until then, test-pinned).
 *  - when:        the when clause — a conditional grant riding the
 *                 buff forge (Phase 3 opens the door; TYPED-UNREAD).
 *  - art:         the master's license — RESERVED for the content
 *                 epoch (the master smith's brief lives here).
 *
 * RANK IS DEPTH; THE APPLIED RANK IS A CHOICE YOU AFFORD: rank
 * entitlement I-IV derives from BASE surplus over the seat by the
 * honed-art clocks (never stored, never bought); the rank a player
 * ANSWERS at is chosen up to that entitlement and priced by the
 * focus law (Phase 4 wires the choice; until then everything answers
 * at rank I). A rank step REPLACES the package whole and speaks its
 * note at the ceremony — the absolute-override law honedAbility
 * taught.
 *
 * THEME IS THE ROOT, NOT THE FENCE: a Calling belongs to its skill
 * by story, seat, and ceremony — its benefits may land anywhere
 * (the smith's calling may sharpen her sword arm). Only the trade
 * dials stay self-keyed.
 *
 * Never fold a strike-kind enchant effect into a Calling's gear
 * entry (the aggregate/strike split is test-locked in
 * callings.test.ts; strike identity belongs to a landed weapon).
 */
import { TECHNIQUE_MAX_RANK, techniqueRank } from '@arx/shared';
import { STRIKE_EFFECT_KINDS } from './equipment/enchants.js';
import type { CallingDef, CallingEffect, CallingLicense } from './callingTypes.js';
import { VITALITY_CALLINGS, VITALITY_LICENSES } from './callings/vitality.js';
import { COMBAT_CALLINGS, COMBAT_LICENSES } from './callings/combat.js';
import { ONEHAND_CALLINGS, ONEHAND_LICENSES } from './callings/onehand.js';
import { DEFENCE_CALLINGS, DEFENCE_LICENSES } from './callings/defence.js';
import { ARCHERY_CALLINGS, ARCHERY_LICENSES } from './callings/archery.js';
import { ARX_CALLINGS, ARX_LICENSES } from './callings/arx.js';
import { SNEAK_CALLINGS, SNEAK_LICENSES } from './callings/sneak.js';
import { TWOHAND_CALLINGS, TWOHAND_LICENSES } from './callings/twohand.js';
import { POLEARM_CALLINGS, POLEARM_LICENSES } from './callings/polearm.js';
import { DUALWIELD_CALLINGS, DUALWIELD_LICENSES } from './callings/dualwield.js';
import { SHIELD_CALLINGS, SHIELD_LICENSES } from './callings/shield.js';
import { MINING_CALLINGS, MINING_LICENSES } from './callings/mining.js';
import { WOODCUTTING_CALLINGS, WOODCUTTING_LICENSES } from './callings/woodcutting.js';
import { FISHING_CALLINGS, FISHING_LICENSES } from './callings/fishing.js';
import { FORAGING_CALLINGS, FORAGING_LICENSES } from './callings/foraging.js';
import { FARMING_CALLINGS, FARMING_LICENSES } from './callings/farming.js';
import { COOKING_CALLINGS, COOKING_LICENSES } from './callings/cooking.js';
import { SMITHING_CALLINGS, SMITHING_LICENSES } from './callings/smithing.js';
import { WOODWORKING_CALLINGS, WOODWORKING_LICENSES } from './callings/woodworking.js';
import { LEATHERWORKING_CALLINGS, LEATHERWORKING_LICENSES } from './callings/leatherworking.js';
import { TAILORING_CALLINGS, TAILORING_LICENSES } from './callings/tailoring.js';
import { CONSTRUCTION_CALLINGS, CONSTRUCTION_LICENSES } from './callings/construction.js';
import { HERBALISM_CALLINGS, HERBALISM_LICENSES } from './callings/herbalism.js';
import { ENCHANTING_CALLINGS, ENCHANTING_LICENSES } from './callings/enchanting.js';
import { BEASTCRAFT_CALLINGS, BEASTCRAFT_LICENSES } from './callings/beastcraft.js';

export * from './callingTypes.js';

// ------------------------------------------------ the honed clocks

/** Callings climb the honed-art ladder: I-IV, the same clocks. */
export const CALLING_MAX_RANK = TECHNIQUE_MAX_RANK;

/**
 * RANK IS DEPTH, NEVER A PURCHASE: the rank ENTITLEMENT this base
 * level has earned at this seat — 0 below the seat, I at it, then
 * the honed-art surplus clocks verbatim (RANK_SURPLUS strides, THE
 * SHORTENED CLIMB past 54). What rank a player ANSWERS at is their
 * choice up to this, priced by the focus law (Phase 4).
 */
export function callingRank(def: CallingDef, baseLevel: number): number {
  return techniqueRank(def.unlockLevel, baseLevel);
}

/**
 * The package at an applied rank: rank I (or an unranked def) is the
 * base package; each step past I replaces it whole. Ranks past the
 * authored steps hold the deepest step (the honedAbility clamp).
 */
export function honedCalling(def: CallingDef, rank: number): readonly CallingEffect[] {
  if (!def.ranks || rank <= 1) return def.effects;
  const step = Math.min(rank - 1, def.ranks.length);
  return def.ranks[step - 1]!.effects;
}

/**
 * THE FILLED HALL: twenty-five ladders, one file each under
 * ./callings/, in SKILL_IDS order. A ladder file owns its skill's
 * sixteen seats and its register column; the book only binds them.
 */
const LADDERS: ReadonlyArray<readonly CallingDef[]> = [
  VITALITY_CALLINGS,
  COMBAT_CALLINGS,
  ONEHAND_CALLINGS,
  DEFENCE_CALLINGS,
  ARCHERY_CALLINGS,
  ARX_CALLINGS,
  SNEAK_CALLINGS,
  TWOHAND_CALLINGS,
  POLEARM_CALLINGS,
  DUALWIELD_CALLINGS,
  SHIELD_CALLINGS,
  MINING_CALLINGS,
  WOODCUTTING_CALLINGS,
  FISHING_CALLINGS,
  FORAGING_CALLINGS,
  FARMING_CALLINGS,
  COOKING_CALLINGS,
  SMITHING_CALLINGS,
  WOODWORKING_CALLINGS,
  LEATHERWORKING_CALLINGS,
  TAILORING_CALLINGS,
  CONSTRUCTION_CALLINGS,
  HERBALISM_CALLINGS,
  ENCHANTING_CALLINGS,
  BEASTCRAFT_CALLINGS,
];

const defs: CallingDef[] = LADDERS.flat();

/** Every ladder's license rows, bound into one register column. */
export const CALLING_LICENSES: readonly CallingLicense[] = [
  VITALITY_LICENSES,
  COMBAT_LICENSES,
  ONEHAND_LICENSES,
  DEFENCE_LICENSES,
  ARCHERY_LICENSES,
  ARX_LICENSES,
  SNEAK_LICENSES,
  TWOHAND_LICENSES,
  POLEARM_LICENSES,
  DUALWIELD_LICENSES,
  SHIELD_LICENSES,
  MINING_LICENSES,
  WOODCUTTING_LICENSES,
  FISHING_LICENSES,
  FORAGING_LICENSES,
  FARMING_LICENSES,
  COOKING_LICENSES,
  SMITHING_LICENSES,
  WOODWORKING_LICENSES,
  LEATHERWORKING_LICENSES,
  TAILORING_LICENSES,
  CONSTRUCTION_LICENSES,
  HERBALISM_LICENSES,
  ENCHANTING_LICENSES,
  BEASTCRAFT_LICENSES,
].flat();

export const CALLINGS: ReadonlyMap<string, CallingDef> = new Map(defs.map((d) => [d.id, d]));

export function callingDef(id: string): CallingDef | undefined {
  return CALLINGS.get(id);
}

export function callingsFor(skill: string): CallingDef[] {
  return defs.filter((d) => d.skill === skill);
}

/** Guard used by tests and the server fold: no strike kinds in gear effects. */
export function isAggregateCallingEffect(fx: CallingEffect): boolean {
  return fx.kind !== 'gear' || !STRIKE_EFFECT_KINDS.includes(fx.effect.kind);
}
