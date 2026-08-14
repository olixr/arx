/**
 * The sheathe vocabulary — where stowed weapons live on the body, and
 * how a hand travels to put them there.
 *
 * Blades (swords, daggers, axes, picks) ride the BELT: the main weapon
 * on the near hip, a dual-wielded off blade on the far hip, both tips
 * raked down-back like scabbards on a war belt. Bows and staffs sling
 * diagonally across the BACK, sharing the quiver's depth law. All of
 * it is pure — no ctx, no rig internals — so both the rig and the
 * tests read from one law source (the carriage.ts pattern).
 *
 * Frame conventions match carriage.ts: screen radians with +y DOWN,
 * `angle` points grip→tip (π/2 = straight down), offsets in units of
 * the rig scale `s` with dx pre-squash (the caller multiplies by
 * wScale). `side` is the SMOOTHED facing sign (±1, easing through 0
 * over ~240ms via depthMemory) and `rake` is the facing WEIGHT
 * (sideW: sign = forward, magnitude = how profile the facing is) — the
 * same two channels the rest carriage runs on, so a stowed blade
 * sweeps around the body exactly as smoothly as a held one.
 */

/** The moment of handoff: below this the weapon rides the hand toward
 * its anchor; at or above it the weapon is body-anchored and the hand
 * travels home empty. One number, shared by the rig and the tests. */
export const STOW_HANDOFF = 0.5;

export interface StowSpot {
  /** Anchor offset from the body center line, units of s, pre-squash. */
  dx: number;
  /** Anchor offset from the reference line (hip for blades, shoulder for back slings), units of s. */
  dy: number;
  /** Weapon angle at the anchor, grip→tip, screen radians. */
  angle: number;
}

function smooth(t: number): number {
  const u = Math.max(0, Math.min(1, t));
  return u * u * (3 - 2 * u);
}

/** Full-strength side sign recovered from a smoothed channel: ±1 almost
 * everywhere, but still CONTINUOUS through the flip — a raw Math.sign
 * here would teleport the scabbard across the body mid-turn. */
function firmSide(side: number): number {
  return Math.max(-1, Math.min(1, side * 3));
}

/**
 * The two phases of one sheathe, from a single 0..1 blend.
 * t < STOW_HANDOFF: `grabK` carries the hand (weapon and all) from its
 * carriage to the stow anchor — reaching 1 exactly AT the anchor, so
 * the handoff can never pop. t ≥ STOW_HANDOFF: the weapon is on the
 * body and `homeK` walks the empty hand back to its resting hang.
 * Played in reverse (t falling) the same curves read as reach → grab →
 * pull free — the draw is the stow, backwards, for free.
 */
export function sheathePhases(t: number): { grabK: number; homeK: number } {
  return {
    grabK: smooth(t / STOW_HANDOFF),
    homeK: smooth((t - STOW_HANDOFF) / (1 - STOW_HANDOFF)),
  };
}

/**
 * Where a stowed blade rides the belt. The main weapon takes the NEAR
 * hip (the side facing the camera — the screen-side depth law's near
 * side, which is opposite the facing sign) and paints over the torso;
 * the off blade takes the FAR hip and paints behind it. Both tips rake
 * down-BACK — a war belt, not a display rack — relaxing toward a
 * vertical hang as the facing turns to the camera (the facing-weight
 * law: there is no screen-backward to rake along front-on).
 *
 * Seated (`sit` 0..1) the belt line is at the ground, so the scabbard
 * lies down with the body — easing toward horizontal so the tip rests
 * along the ground instead of stabbing into it.
 */
export function stowBlade(hand: 'main' | 'off', side: number, rake: number, sit = 0): StowSpot {
  const hipSide = firmSide(side) * (hand === 'main' ? -1 : 1);
  const layBack = smooth(sit);
  // Standing: tip down-back off the belt. The off scabbard rakes a
  // touch shallower so a profile view shows two hilts, not one.
  const standRake = hand === 'main' ? 0.62 : 0.48;
  const standAngle = Math.PI / 2 + rake * standRake;
  // Seated: the blade lies back along the ground on its own side.
  const seatAngle = Math.PI / 2 + firmSide(rake) * 1.22;
  return {
    dx: hipSide * (hand === 'main' ? 0.15 : 0.13),
    dy: (hand === 'main' ? 0.03 : 0.05) - 0.04 * layBack,
    angle: standAngle + (seatAngle - standAngle) * layBack,
  };
}

/**
 * Where a bow or staff slings across the back: anchored behind the
 * torso (the caller adds the quiver's −fx·0.14 back offset), long
 * axis running the diagonal from the trailing hip to the leading
 * shoulder.
 *
 * STAFF: `angle` is the direction grip→crown (drawStaff's local +X),
 * leaning with the smoothed side so the crown always rides up behind
 * the leading shoulder.
 *
 * BOW: `angle` is the finished PAINTER angle (the bow keeps its long
 * axis on local ±Y). THE MIRROR LAW: a bow is not symmetric across
 * its long axis — the belly hangs on one side, the string on the
 * other — so the left-lean sling is the MIRROR of the right-lean one
 * (π − base), never a π rotation. Rotating it instead turns the
 * string toward the camera and it reads as crossing the chest.
 *
 * GREAT: `angle` is grip→tip like the staff, but HILT UP — the grip
 * and pommel ride above the shoulder beside the head (where a hand
 * can reach them) and the blade runs down the back past the hip, the
 * classic greatsword back-carry. Blade-up read as the weapon aimed at
 * its own bearer's skull (user verdict) — never point the tip at the
 * head again.
 */
export function stowBack(kind: 'bow' | 'staff' | 'great', side: number): StowSpot {
  const sd = firmSide(side);
  if (kind === 'staff') {
    return { dx: -sd * 0.05, dy: 0.3, angle: -Math.PI / 2 + sd * 0.5 };
  }
  if (kind === 'great') {
    return { dx: -sd * 0.04, dy: 0.38, angle: Math.PI / 2 + sd * 0.38 };
  }
  const lean = Math.abs(sd) * 0.42;
  return {
    dx: -sd * 0.05,
    dy: 0.24,
    // Right lean: (−π/2 + lean) − π/2 = −π + lean. Left lean: its
    // mirror across vertical, normalized — which lands at −lean.
    angle: sd >= 0 ? -Math.PI + lean : -lean,
  };
}
