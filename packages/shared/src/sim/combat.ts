import type { InputFrame } from './input.js';
import { InputButton, hasButton } from './input.js';

/**
 * Charged bow draw + melee combo rules, shared verbatim by server
 * (authoritative) and client (prediction/animation) so both sides always
 * agree on charge, movement slow-down, and combo stage.
 */

/** Ticks of holding Attack to reach a full draw (20 Hz). */
export const DRAW_FULL_TICKS = 14; // 0.7s
/** Below this the release is a SNAP SHOT, not a charged arrow. */
export const DRAW_MIN_TICKS = 3;
/** Movement speed multiplier while drawing a bow. */
export const DRAW_MOVE_FACTOR = 0.55;

// ------------------------------------------------------- drawn breath

/**
 * THE DRAWN BREATH: while a casted art winds up, a tick with no
 * resolved movement accrues this much wind-up instead of 1 — planting
 * your feet is a read the world can see, and this is what it pays.
 * ONE ruler: server accrual, the client's own bar, and the bench copy
 * all read this constant; it is never authored per art.
 */
export const CAST_STILL_FACTOR = 1.25;

// ---------------------------------------------------------- snap shots

/**
 * Tap-fire: releasing under DRAW_MIN_TICKS looses an instant weak
 * arrow from the hip. Tap-tap-tap IS rapid fire — mobile, scrappy,
 * ~70% of a charge cycle's damage but you never stop moving.
 */
export const SNAP_RECOVERY_TICKS = 6; // 0.3 s between snaps
/** Snap shots in the rhythm chain; the third fires a two-arrow fan. */
export const SNAP_CHAIN = 3;
/** Grace after recovery to continue the snap rhythm. */
export const SNAP_GRACE_TICKS = 10;

export function snapShot(
  maxHit: number,
  speed: number,
  range: number,
): { maxHit: number; speed: number; range: number } {
  return {
    maxHit: Math.max(1, Math.round(maxHit * 0.3)),
    speed: speed * 0.85,
    range: range * 0.55,
  };
}

// (The snap chain advances through the ONE rhythm engine — see ComboTrack.)

// ---------------------------------------------------------- wand rhythm

/**
 * Staff basics are a 1-2-HEAVY rhythm: two quick bolts, then a slow
 * fat orb that splashes and shoves. Same chain law as the melee combo.
 */
export const HEAVY_BOLT_MULT = 3.0;
export const HEAVY_BOLT_RECOVERY_MULT = 2.25;
export const HEAVY_BOLT_SPLASH = 1.2; // tiles around the impact
export const HEAVY_BOLT_KNOCKBACK = 1.6;

/** 0..1 charge from ticks spent drawing. */
export function drawCharge(ticks: number): number {
  return Math.max(0, Math.min(1, ticks / DRAW_FULL_TICKS));
}

/**
 * Charge scaling: a snap shot is weak and slow, a full draw hits hard,
 * flies fast, and carries the bow's whole range. Damage never scales to
 * zero — a loosed arrow always threatens.
 */
export function chargedShot(
  charge: number,
  maxHit: number,
  speed: number,
  range: number,
): { maxHit: number; speed: number; range: number } {
  const c = Math.max(0, Math.min(1, charge));
  return {
    maxHit: Math.max(1, Math.round(maxHit * (0.4 + 0.6 * c))),
    speed: speed * (0.7 + 0.5 * c),
    range: range * (0.55 + 0.45 * c),
  };
}

// ---------------------------------------------------------- overcharge

/**
 * THE OVERCHARGE VOLLEY (combat v2, Phase 4): holding past the full
 * draw keeps pulling — at DRAW_FULL + OVERCHARGE ticks the release
 * looses a three-arrow fan instead of one shaft. Cycle-honest: 1.5x
 * payload over the extra half-second of standing brace works out to
 * ~+2% per-tick against the plain charge cycle, paid for in exposure.
 * The old drawTicks cap (FULL + 10) IS the overcharge threshold.
 */
export const OVERCHARGE_TICKS = 10;
export const VOLLEY_ARROWS = 3;
export const VOLLEY_DMG_FACTOR = 0.5;
/** Fan half-spread between volley shafts, radians. */
export const VOLLEY_SPREAD = 0.12;

/** True when this many held draw ticks has reached the volley. */
export function isOvercharged(drawTicks: number): boolean {
  return drawTicks >= DRAW_FULL_TICKS + OVERCHARGE_TICKS;
}

// -------------------------------------------------------- knife's hunger

/**
 * THE KNIFE'S HUNGER (combat v2, Phase 4): a landed dagger basic
 * quickens the feet — refresh-not-stack (the momentum buff channel),
 * so the knife fighter stays glued to the mark. Movement identity,
 * never damage: the cadence contract does not blink.
 */
export const KNIFE_HUNGER_SPEED = 1.1;
export const KNIFE_HUNGER_TICKS = 20;

// ---------------------------------------------------------- guard sweep

/**
 * THE GUARD SWEEP (combat v2, Phase 4): a wand basic pressed with a
 * foe inside this reach becomes a pole strike — the moulinet the
 * staff choreography always knew — instead of spawning a bolt inside
 * the enemy's chest. Same beat, same damage, same rhythm stage; only
 * the delivery answers the range.
 */
export const GUARD_SWEEP_RANGE = 1.7;
export const GUARD_SWEEP_KNOCKBACK = 1.4;
/** The pole strike's windup — the moulinet's coil (steel clock). */
export const GUARD_SWEEP_WINDUP = 2;

/**
 * True when this input frame slows movement: drawing a bow is a braced,
 * deliberate stance. Purely a function of the frame + equipped style so
 * client prediction and the server derive it identically.
 */
export function isDrawSlowed(frame: Pick<InputFrame, 'buttons'>, style: string | null): boolean {
  return style === 'archery' && hasButton(frame.buttons, InputButton.Attack);
}

// ---------------------------------------------------------------- combo

/** Number of stages in the melee chain (last one is the finisher). */
export const COMBO_STAGES = 3;
/** Ticks after an attack's cooldown ends during which the chain holds. */
export const COMBO_GRACE_TICKS = 14; // 0.7s to continue the string
/**
 * Hack-and-slash cadence: the string flows fast — swing, swing,
 * FINISHER, breath. Each swing chips small; the finisher is the
 * payoff, and its longer recovery is the rhythm's rest note.
 */
export const FINISHER_DAMAGE_MULT = 2.5;
export const FINISHER_KNOCKBACK_MULT = 1.8;
export const FINISHER_RECOVERY_MULT = 2.0;

/**
 * Next combo stage given the stage of the previous swing and whether the
 * new swing landed inside the grace window. The finisher always resets.
 */
export function nextComboStage(prevStage: number, withinGrace: boolean): number {
  if (!withinGrace) return 0;
  return (prevStage + 1) % COMBO_STAGES;
}

// ------------------------------------------------- the one rhythm engine

/**
 * THE ONE RHYTHM ENGINE (combat v2, Phase 1): every basic-attack chain
 * in the game — the sword string, the great string, the wand's
 * bolt-bolt-HEAVY, the bow's snap chain — advances through this ONE
 * track. A body carries exactly one; the lanes never coexist because a
 * hand holds exactly one weapon, and THE STRING BELONGS TO THE WEAPON
 * THAT STARTED IT: a different weapon id resets the stage by
 * construction (no swapped-in finishers, ever). Grace/stage units are
 * the caller's clock — server ticks on the sim, input seq on the
 * client mirror — the law never cares which.
 */
export interface ComboTrack {
  /** Stage of the last swing on this track (0-based). */
  stage: number;
  /** Swinging again at-or-before this instant continues the string. */
  graceUntilTick: number;
  /** The weapon id that owns the live string; null = no string. */
  weaponId: string | null;
  /**
   * THE RUN: consecutive swings in unbroken rhythm, across string
   * wraps (a finisher that flows into the next opener keeps the run).
   * Pure feedback in Phase 2 (the beat UI's streak); Phase 3's windup
   * axis gives it teeth.
   */
  run: number;
}

export function freshCombo(): ComboTrack {
  return { stage: 0, graceUntilTick: 0, weaponId: null, run: 0 };
}

/**
 * Advance the track for a swing landing at `now` from weapon
 * `weaponId`, returning the stage this swing plays at. The caller
 * stamps `graceUntilTick` afterward (the window opens after a
 * recovery the stage itself decides). `stages` is the chain length —
 * COMBO_STAGES for every current lane; the moveset book (Phase 3)
 * will author it per string.
 */
export function advanceCombo(
  track: ComboTrack,
  weaponId: string,
  now: number,
  stages = COMBO_STAGES,
): number {
  const withinGrace = track.weaponId === weaponId && now <= track.graceUntilTick;
  const stage = withinGrace ? (track.stage + 1) % stages : 0;
  track.stage = stage;
  track.weaponId = weaponId;
  track.run = withinGrace ? track.run + 1 : 1;
  return stage;
}

/**
 * Drop the string. Called at every honest break — sheathe, death,
 * mounting up, a drawn bow shot superseding the snap rhythm. Dodge
 * deliberately does NOT reset: the dodge-weave is a combo verb, not a
 * retreat from the string.
 */
export function resetCombo(track: ComboTrack): void {
  track.stage = 0;
  track.graceUntilTick = 0;
  track.weaponId = null;
  track.run = 0;
}

// ------------------------------------------------------- the spoken beat

/**
 * THE HELD INTENT (combat v2, Phase 2): a press that lands in the tail
 * of a recovery buffers ONE swing that fires the moment the hand is
 * ready — taps in rhythm stop being eaten by the cooldown gate. One
 * law, both sides: the server arms in ticks, the client mirror in
 * input seq (same units by construction).
 */
/** A press this close to ready arms the buffer (ticks). */
export const ATTACK_BUFFER_TICKS = 8;
/** A buffered press fires within this of ready, or dies unspent. */
export const BUFFER_FIRE_SLACK_TICKS = 2;

/**
 * Arm the one-deep buffer: returns the instant the buffered press
 * expires (fire-by), or 0 when the press is too early to buffer (or
 * the hand is already free — no buffer needed, the swing just goes).
 */
export function armBuffer(remainingCooldown: number, now: number): number {
  if (remainingCooldown <= 0 || remainingCooldown > ATTACK_BUFFER_TICKS) return 0;
  return now + remainingCooldown + BUFFER_FIRE_SLACK_TICKS;
}

/**
 * THE DODGE-WEAVE: a dodge that FIRES cuts the rest of the swing
 * recovery to this floor — the string stays alive (grace untouched,
 * the track never resets on a dodge) and the next cut follows the
 * slide. The floor keeps one honest beat of commitment; the dodge's
 * own seq cooldown (1.2s) and its movement requirement bound the
 * cadence gain, and the baseline hold-flow cadence is unchanged.
 */
export const DODGE_CANCEL_FLOOR_TICKS = 3;

// (Per-lane recovery/grace numbers live in THE MOVESET BOOK now —
// content/src/movesets.ts derives every default from the constants
// above, and the byte-law test there pins the agreement.)

// ------------------------------------------------------ the strike clock

/**
 * THE STRIKE CLOCK — the one authored table twinning the server's pose
 * hold (ticks, what the wire carries) to the client's choreography
 * length (ms, what the arms play). These pairs used to live twinned by
 * COMMENT across two packages; now the pose provably outlives its
 * choreography (holdTicks × TICK_MS ≥ ms, pinned by test). The `arx`
 * row clocks the wand's bolt/HEAVY poses; bow draw/loose keep their
 * own charge clock (drawTicks) and never read this table.
 */
export interface StrikeClock {
  /** Client choreography length, ms. */
  ms: number;
  /** Server pose hold, ticks — must outlive the choreography. */
  holdTicks: number;
}

export const STRIKE_CLOCKS: Record<
  'onehand' | 'twohand' | 'arx',
  { swing: StrikeClock; finisher: StrikeClock }
> = {
  onehand: { swing: { ms: 280, holdTicks: 6 }, finisher: { ms: 400, holdTicks: 8 } },
  // THE GREAT SCHOOL owns a longer clock entirely: mass never moves
  // on a sword's time.
  twohand: { swing: { ms: 460, holdTicks: 10 }, finisher: { ms: 640, holdTicks: 14 } },
  arx: { swing: { ms: 280, holdTicks: 6 }, finisher: { ms: 400, holdTicks: 8 } },
};

// ------------------------------------------------------------ twohand

/**
 * THE GREAT SCHOOL — two-handed weapons. A greatweapon trades the
 * sword's patter for weight: the die is huge, the beat is slow, and
 * THE CLEAVE LAW makes every swing a sweep — every enemy in the arc
 * eats its own independent roll (what was the melee finisher's crowd-
 * clear privilege is a twohand BASIC). Balance lives in the cadence:
 * per-swing impact towers while the long recovery keeps sustained
 * single-target damage honest against the melee string. The style
 * trains its own skill (`twohand`) and shares nothing with the off
 * hand — both fists belong to the haft.
 */
/** Half-angle of the greatweapon sweep: ±75° (the sword cone is ±60°). */
export const TWOHAND_ARC_HALF = 1.31;
/** Even a basic greatblow shoves — mass arrives with the edge. */
export const TWOHAND_KNOCKBACK_MULT = 1.25;
/** The rising follow-through (stage 2) carries the turn's momentum. */
export const TWOHAND_STAGE2_DAMAGE_MULT = 1.15;
/** The finisher is the mountain falling — bigger payoff than a sword's. */
export const TWOHAND_FINISHER_DAMAGE_MULT = 3.0;
export const TWOHAND_FINISHER_KNOCKBACK_MULT = 2.2;
/** The beat is already slow; the rest note stays proportionate. */
export const TWOHAND_FINISHER_RECOVERY_MULT = 1.6;
/** A heavy string breathes — longer grace to continue the chain. */
export const TWOHAND_COMBO_GRACE_TICKS = 20;

// ---------------------------------------------------------- dual wield

/**
 * Dual wielding — the hidden skill. Discovered by trying the thing:
 * equip a second one-handed weapon (onehand level 10+) and the off
 * hand takes it instead of swapping. Every mainhand swing is echoed a
 * half-beat later by an offhand strike at a damage fraction that climbs
 * with the dualwield skill — clumsy at first, near-mirrored at mastery.
 * The price is structural: that hand held your shield.
 */
export const DUALWIELD_UNLOCK_ONEHAND = 10;
/**
 * Offhand echo lands this many ticks after the mainhand swing —
 * matched to the rig's echo choreography (the off blade's cut lands
 * ~0.6 of the 280ms swing beat), so the damage tick and the visible
 * cut arrive together.
 */
export const OFFHAND_DELAY_TICKS = 4;
/** Damage fraction at dualwield level 1. */
export const OFFHAND_DMG_BASE = 0.35;
/** Damage fraction gained per dualwield level past 1. */
export const OFFHAND_DMG_PER_LEVEL = 0.005;

/** The offhand strike's damage fraction for a dualwield level. */
export function offhandDamageFactor(dualwieldLevel: number): number {
  return Math.min(0.85, OFFHAND_DMG_BASE + (Math.max(1, dualwieldLevel) - 1) * OFFHAND_DMG_PER_LEVEL);
}

// ---------------------------------------------------- the second grip

/**
 * THE HONEST TRADE: the swap verb's beat. The server locks attacks and
 * casts for the tick count; the client plays the stow-and-draw and
 * clamps its mirror clocks on the ms twin. TWIN LAW (the STRIKE_CLOCKS
 * precedent): these two must stay byte-equal through TICK_MS = 50 —
 * the outlives-law test pins it, change both or neither.
 */
export const SWAP_BEAT_TICKS = 12;
export const SWAP_BEAT_MS = 600;
