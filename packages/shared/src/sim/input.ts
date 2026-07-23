import { SNEAK_FACTOR } from './sneak.js';

/** One tick of player intent. Client-numbered for reconciliation. */
export interface InputFrame {
  seq: number;
  /** Movement axes, each in [-1, 1] (analog-friendly). */
  mx: number;
  my: number;
  /** Aim angle in radians (mouse/right-stick). */
  aim: number;
  /** Bitfield of InputButton. */
  buttons: number;
}

export enum InputButton {
  Attack = 1 << 0,
  Interact = 1 << 1,
  Dodge = 1 << 2,
  /** Weapon Art (Q) — fires on press edge, not hold. */
  Ability1 = 1 << 3,
  /** Relic active (E) — fires on press edge, not hold. */
  Ability2 = 1 << 4,
  /** Learned Technique (R) — fires on press edge. */
  Ability3 = 1 << 5,
  /** Sigil ultimate (T) — fires on press edge. */
  Ability4 = 1 << 6,
  /** Crouch-walk latch — HELD while the client's sneak toggle is on, not an edge. */
  Sneak = 1 << 7,
  /** Sit toggle (X / pad D-down) — press edge flips the seated rest. */
  Sit = 1 << 8,
  /** Sheathe toggle (H / pad D-left) — press edge stows/draws the weapons. */
  Sheathe = 1 << 9,
}

export function hasButton(buttons: number, b: InputButton): boolean {
  return (buttons & b) !== 0;
}

/** Clamp a raw client-supplied frame into legal ranges (server-side). */
export function sanitizeInputFrame(f: InputFrame): InputFrame {
  let { mx, my } = f;
  if (!Number.isFinite(mx)) mx = 0;
  if (!Number.isFinite(my)) my = 0;
  const len = Math.hypot(mx, my);
  if (len > 1) {
    mx /= len;
    my /= len;
  }
  // Sneaking caps movement speed: honest clients already scaled their axes,
  // so this only bites a client claiming stealth at full tilt.
  if ((f.buttons & InputButton.Sneak) !== 0 && len > SNEAK_FACTOR) {
    mx = (mx / len) * SNEAK_FACTOR;
    my = (my / len) * SNEAK_FACTOR;
  }
  return {
    seq: f.seq >>> 0,
    mx,
    my,
    aim: Number.isFinite(f.aim) ? f.aim : 0,
    buttons: f.buttons >>> 0,
  };
}
