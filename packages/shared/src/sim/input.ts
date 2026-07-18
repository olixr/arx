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
  return {
    seq: f.seq >>> 0,
    mx,
    my,
    aim: Number.isFinite(f.aim) ? f.aim : 0,
    buttons: f.buttons >>> 0,
  };
}
