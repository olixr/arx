/**
 * THE PAD SPEAKS MANY DIALECTS — one translator.
 *
 * The Gamepad API only promises the tidy sixteen-button / four-axis
 * "standard" layout when the browser recognises the device. A DualSense
 * on Chrome gets that recognition; an 8BitDo paired over Bluetooth in
 * Switch / D-input / macOS mode very often does NOT — it arrives with
 * `mapping: ''`, its d-pad folded into a single hat AXIS, its right
 * stick shoved down the axis list, and its face buttons in Nintendo
 * order. The old code read `pad.axes[2]` and `buttons[12]` straight,
 * so those pads did nothing at all.
 *
 * Everything above this file keeps reading the standard layout. This
 * module is the one place that knows a pad might not speak it.
 *
 * Laws:
 * - ONE TRANSLATOR. No consumer touches a raw Gamepad; InputManager
 *   hands out normalized views only.
 * - STANDARD PASSES THROUGH UNTOUCHED. A pad the browser already
 *   mapped is never second-guessed.
 * - THE HAT IS A D-PAD. A hat axis becomes buttons 12-15, always.
 * - GUESS, THEN SAY SO. An unknown pad gets the heuristic layout and
 *   the diagnostics row names it, so a player can see what we assumed
 *   and rebind past it.
 */

/** Standard-layout button slots, by name, for readability below. */
export const PAD_SLOTS = 16;

/** Chrome parks an idle hat axis at 3.2857; sticks never leave [-1,1]. */
const HAT_REST_MIN = 1.05;

export interface PadLayout {
  /** Shown in the diagnostics readout. */
  name: string;
  /**
   * Raw button index feeding each standard slot 0-15; -1 means the
   * device has no such button (or a hat supplies it).
   */
  buttons: readonly number[];
  /** Raw axis indexes for [leftX, leftY, rightX, rightY]; -1 if absent. */
  axes: readonly [number, number, number, number];
  /** Raw axis carrying an 8-way d-pad hat, filling slots 12-15. */
  hatAxis?: number;
  /** Raw axes carrying analog [LT, RT] when they are not buttons. */
  triggerAxes?: readonly [number, number];
}

const IDENTITY_BUTTONS = Array.from({ length: PAD_SLOTS }, (_, i) => i);

export const STANDARD_LAYOUT: PadLayout = {
  name: 'standard',
  buttons: IDENTITY_BUTTONS,
  axes: [0, 1, 2, 3],
};

/**
 * Nintendo face order (B A Y X in slots 0-3) reaches the standard
 * layout with a single 0/1 swap: Nintendo's Y already sits where
 * standard X lives (west), and its X where standard Y lives (north).
 */
const NINTENDO_FACE = [1, 0, 2, 3, ...IDENTITY_BUTTONS.slice(4)];

/**
 * Known dialects, matched against `Gamepad.id` (lowercased). First hit
 * wins, so put the specific before the general.
 *
 * `test` sees the lowercased id; `layout` may inspect the live pad to
 * size itself to what the device actually exposes.
 */
interface PadProfile {
  name: string;
  test: (id: string) => boolean;
  layout: (pad: Gamepad) => PadLayout;
}

/** Pull `vendor: xxxx` / `product: xxxx` out of a Chrome-style id. */
export function padVendorProduct(id: string): { vendor: string; product: string } | null {
  const m = /vendor:\s*([0-9a-f]{4}).*?product:\s*([0-9a-f]{4})/i.exec(id);
  if (m?.[1] && m[2]) return { vendor: m[1].toLowerCase(), product: m[2].toLowerCase() };
  // Firefox uses "vvvv-pppp-Name".
  const f = /^([0-9a-f]{4})-([0-9a-f]{4})-/i.exec(id);
  return f?.[1] && f[2] ? { vendor: f[1].toLowerCase(), product: f[2].toLowerCase() } : null;
}

const PROFILES: readonly PadProfile[] = [
  {
    // Switch Pro Controller, and every 8BitDo pad pairing in Switch
    // mode (they announce themselves as 057e:2009). Non-standard on
    // Chrome/macOS: Nintendo face order, d-pad on a hat.
    name: 'switch-pro',
    test: (id) => {
      const vp = padVendorProduct(id);
      if (vp?.vendor === '057e') return true;
      return id.includes('pro controller') || id.includes('switch');
    },
    layout: (pad) => ({
      name: 'switch-pro',
      buttons: NINTENDO_FACE,
      axes: [0, 1, 2, 3],
      hatAxis: findHatAxis(pad) ?? (pad.axes.length > 9 ? 9 : undefined),
    }),
  },
  {
    // 8BitDo's own vendor id, seen in D-input and macOS modes. Sticks
    // and face buttons land in the usual places; the d-pad is a hat
    // and the axis list is longer than four.
    name: '8bitdo',
    test: (id) => padVendorProduct(id)?.vendor === '2dc8' || id.includes('8bitdo'),
    layout: (pad) => genericLayout(pad, '8bitdo'),
  },
  {
    // DualShock 4 / DualSense when Chrome declines to map them.
    name: 'dualshock',
    test: (id) => {
      const vp = padVendorProduct(id);
      return vp?.vendor === '054c' || id.includes('dualshock') || id.includes('dualsense');
    },
    layout: (pad) => genericLayout(pad, 'dualshock'),
  },
];

/**
 * An axis that has ever read outside [-1, 1] is a hat, not a stick —
 * Chrome rests idle hats at 3.2857. Scan from 4 up: the first four
 * axes are the sticks on every layout we have ever seen.
 */
function findHatAxis(pad: Gamepad): number | undefined {
  for (let i = 4; i < pad.axes.length; i++) {
    if (Math.abs(pad.axes[i] ?? 0) > HAT_REST_MIN) return i;
  }
  return undefined;
}

/**
 * The last-resort layout for a pad nobody recognises: sticks on the
 * first four axes (skipping any hat), buttons straight through, d-pad
 * from a hat when one is found. This is the shape the overwhelming
 * majority of HID pads report, so it is a good guess — and the
 * diagnostics row says it was a guess.
 */
export function genericLayout(
  pad: Gamepad,
  name = 'generic',
  hatAxis = findHatAxis(pad),
): PadLayout {
  const sticks: number[] = [];
  for (let i = 0; i < pad.axes.length && sticks.length < 4; i++) {
    if (i === hatAxis) continue;
    sticks.push(i);
  }
  while (sticks.length < 4) sticks.push(-1);
  return {
    name,
    buttons: IDENTITY_BUTTONS,
    axes: [sticks[0] ?? -1, sticks[1] ?? -1, sticks[2] ?? -1, sticks[3] ?? -1],
    hatAxis,
  };
}

/**
 * Which dialect a pad speaks. Standard-mapped pads short-circuit; a
 * pad the browser did not map gets its profile, or the heuristic.
 */
export function resolveLayout(pad: Gamepad): PadLayout {
  if (pad.mapping === 'standard') return STANDARD_LAYOUT;
  const id = pad.id.toLowerCase();
  for (const p of PROFILES) {
    if (p.test(id)) return p.layout(pad);
  }
  return genericLayout(pad);
}

/**
 * Hat value → the four d-pad slots. Chrome encodes the eight compass
 * points as -1 (up) stepping by 2/7 clockwise to 1 (up-left); an idle
 * hat parks outside [-1, 1], so anything out of range is centred.
 */
export function hatToDpad(v: number): [boolean, boolean, boolean, boolean] {
  // [up, down, left, right]
  if (!Number.isFinite(v) || Math.abs(v) > 1.001) return [false, false, false, false];
  // -1 → 0 (up), stepping by 2/7 → 7 (up-left).
  const step = Math.round(((v + 1) / 2) * 7);
  switch (step) {
    case 0:
      return [true, false, false, false];
    case 1:
      return [true, false, false, true];
    case 2:
      return [false, false, false, true];
    case 3:
      return [false, true, false, true];
    case 4:
      return [false, true, false, false];
    case 5:
      return [false, true, true, false];
    case 6:
      return [false, false, true, false];
    case 7:
      return [true, false, true, false];
    default:
      return [false, false, false, false];
  }
}

/** A pad rendered in the standard layout, whatever it actually speaks. */
export interface PadView {
  id: string;
  index: number;
  /** Which dialect the translator used — for the diagnostics row. */
  profile: string;
  /** True when the browser mapped it and no translation was needed. */
  native: boolean;
  buttons: readonly GamepadButton[];
  /** Exactly four: leftX, leftY, rightX, rightY. */
  axes: readonly number[];
  raw: Gamepad;
}

const FLAT: GamepadButton = { pressed: false, touched: false, value: 0 };

function btn(pressed: boolean, value = pressed ? 1 : 0): GamepadButton {
  return { pressed, touched: pressed, value };
}

/** Translate a live Gamepad into the standard layout. */
export function normalizePad(pad: Gamepad, layout = resolveLayout(pad)): PadView {
  if (layout === STANDARD_LAYOUT) {
    return {
      id: pad.id,
      index: pad.index,
      profile: 'standard',
      native: true,
      buttons: pad.buttons,
      axes: [pad.axes[0] ?? 0, pad.axes[1] ?? 0, pad.axes[2] ?? 0, pad.axes[3] ?? 0],
      raw: pad,
    };
  }

  const buttons: GamepadButton[] = [];
  for (let slot = 0; slot < PAD_SLOTS; slot++) {
    const raw = layout.buttons[slot] ?? -1;
    buttons.push(raw >= 0 ? (pad.buttons[raw] ?? FLAT) : FLAT);
  }

  // A hat OVERWRITES slots 12-15 — a pad with a hat has no d-pad
  // buttons, and whatever sat at those raw indexes means something
  // else (Home / Capture on Nintendo layouts).
  if (layout.hatAxis !== undefined) {
    const [up, down, left, right] = hatToDpad(pad.axes[layout.hatAxis] ?? 2);
    buttons[12] = btn(up);
    buttons[13] = btn(down);
    buttons[14] = btn(left);
    buttons[15] = btn(right);
  }

  // Analog triggers reported as axes rest at -1 and travel to +1.
  if (layout.triggerAxes) {
    const [lt, rt] = layout.triggerAxes;
    if (lt >= 0) {
      const v = ((pad.axes[lt] ?? -1) + 1) / 2;
      buttons[6] = btn(v > 0.25, v);
    }
    if (rt >= 0) {
      const v = ((pad.axes[rt] ?? -1) + 1) / 2;
      buttons[7] = btn(v > 0.25, v);
    }
  }

  const ax = (i: number): number => (i >= 0 ? (pad.axes[i] ?? 0) : 0);
  return {
    id: pad.id,
    index: pad.index,
    profile: layout.name,
    native: false,
    buttons,
    axes: [ax(layout.axes[0]), ax(layout.axes[1]), ax(layout.axes[2]), ax(layout.axes[3])],
    raw: pad,
  };
}

/**
 * THE TRANSLATOR REMEMBERS. A hat axis only betrays itself while it is
 * IDLE (it rests outside [-1, 1]); held, it reads like a stick. So the
 * layout is resolved once per device and cached, and every frame keeps
 * watching for an out-of-range axis — the first time one appears, the
 * layout is rebuilt with the hat known. A pad whose d-pad was held
 * during the very first poll therefore heals on release instead of
 * spending the session with a phantom third stick.
 */
export class PadTranslator {
  private cache = new Map<string, PadLayout>();
  /** Axis indexes proven to be hats, per device. */
  private hats = new Map<string, number>();

  private key(pad: Gamepad): string {
    return `${pad.index}|${pad.id}`;
  }

  /** Forget a device's layout — call on gamepaddisconnected. */
  forget(pad: Gamepad | string): void {
    const k = typeof pad === 'string' ? pad : this.key(pad);
    this.cache.delete(k);
    this.hats.delete(k);
    this.memoKey = '';
    this.memo = null;
  }

  forgetAll(): void {
    this.cache.clear();
    this.hats.clear();
    this.memoKey = '';
    this.memo = null;
  }

  layoutFor(pad: Gamepad): PadLayout {
    if (pad.mapping === 'standard') return STANDARD_LAYOUT;
    const k = this.key(pad);
    const seen = findHatAxis(pad);
    if (seen !== undefined && this.hats.get(k) !== seen) {
      this.hats.set(k, seen);
      this.cache.delete(k); // a newly proven hat invalidates the guess
    }
    let layout = this.cache.get(k);
    if (!layout) {
      layout = resolveLayout(pad);
      const hat = this.hats.get(k);
      if (hat !== undefined && layout.hatAxis !== hat) {
        // Re-derive the sticks with the hat excluded, keeping the
        // profile's button map and name.
        const base = genericLayout(pad, layout.name, hat);
        layout = { ...layout, axes: base.axes, hatAxis: hat };
      }
      this.cache.set(k, layout);
    }
    return layout;
  }

  /**
   * A translated view, memoized on the device's own timestamp — the
   * pad is read a dozen times a frame (movement, buttons, the UI
   * layer, the aim stick) and only one of those reads should pay for
   * rebuilding sixteen button objects.
   */
  view(pad: Gamepad): PadView {
    const k = `${this.key(pad)}|${pad.timestamp}`;
    if (this.memoKey === k && this.memo) return this.memo;
    const v = normalizePad(pad, this.layoutFor(pad));
    this.memoKey = k;
    this.memo = v;
    return v;
  }

  private memoKey = '';
  private memo: PadView | null = null;
}

/**
 * THE CORPSE HOLDS NO SWAY. Chrome ships its own Switch-Pro driver and
 * runs a Nintendo handshake a couple of seconds after a Bluetooth
 * connect; a pad that emulates the protocol imperfectly (8BitDo in
 * Switch mode) goes silent right there — the OS keeps the device, but
 * the browser's gamepad entry freezes at its last state, sometimes
 * while a second entry re-registers. An entry frozen MID-PRESS (stick
 * deflected the instant it died) would read as "being touched" forever
 * and swallow the live pad. So a pad may claim the active slot only
 * while its state has changed recently; a quiet entry can still be
 * held or be the slot-order fallback — an untouched healthy pad is
 * also quiet, and must stay reachable.
 */
export const PAD_FROZEN_MS = 1500;

export interface PadCandidate {
  pad: Gamepad;
  /** Wall ms since the entry's timestamp last advanced. */
  quietMs: number;
}

/**
 * THE LIVE PAD, decided in one place: whichever pad is actually being
 * touched (and not a frozen corpse) wins and sticks; the previously
 * chosen pad is next; slot order is the tie-break of last resort.
 */
export function pickLivePad(
  pads: readonly PadCandidate[],
  heldIndex: number | null,
): { pad: Gamepad | null; touched: boolean } {
  let first: Gamepad | null = null;
  let held: Gamepad | null = null;
  let touched: Gamepad | null = null;
  for (const { pad, quietMs } of pads) {
    if (!first) first = pad;
    if (pad.index === heldIndex) held = pad;
    if (!touched && quietMs < PAD_FROZEN_MS && padIsActive(pad)) touched = pad;
  }
  if (touched) return { pad: touched, touched: true };
  return { pad: held ?? first, touched: false };
}

/** Any button pressed or stick deflected — "this pad is the live one". */
export function padIsActive(pad: Gamepad): boolean {
  for (const b of pad.buttons) {
    if (b.pressed || b.value > 0.5) return true;
  }
  // Only the first four axes: a resting hat reads 3.2857, and triggers
  // that live on axes rest at -1. Neither is a sign of life.
  for (let i = 0; i < 4 && i < pad.axes.length; i++) {
    if (Math.abs(pad.axes[i] ?? 0) > 0.5) return true;
  }
  return false;
}
