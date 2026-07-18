import { InputButton } from '@devcraft/shared';

const STICK_DEADZONE = 0.22;

/**
 * Action-mapping input layer: keyboard/mouse, Gamepad API, and touch
 * (virtual joystick) all write into one shared action state that the
 * game samples once per network tick.
 */
export class InputManager {
  private keys = new Set<string>();
  mouseX = 0;
  mouseY = 0;
  private mouseDown = false;

  /** Virtual joystick axes (touch UI writes these). */
  touchMoveX = 0;
  touchMoveY = 0;
  /** Held state of on-screen touch buttons. */
  touchAttack = false;
  touchAbility1 = false;
  touchAbility2 = false;
  touchAbility3 = false;
  touchAbility4 = false;

  /** Gamepad right-stick aim, radians; null when the stick is idle. */
  gamepadAim: number | null = null;
  /** True when a gamepad supplied the most recent input. */
  private padUsed = false;

  /** While a DOM field (chat) has focus, movement keys are ignored. */
  private typingCheck: () => boolean = () => false;

  constructor(target: HTMLElement) {
    window.addEventListener('keydown', (e) => {
      if (this.typingCheck()) return;
      this.keys.add(e.code);
      // Keep the page from scrolling on space/arrows.
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
    target.addEventListener('mousemove', (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
      this.padUsed = false; // the mouse reclaims aiming
    });
    target.addEventListener('mousedown', () => (this.mouseDown = true));
    window.addEventListener('mouseup', () => (this.mouseDown = false));
  }

  setTypingCheck(fn: () => boolean): void {
    this.typingCheck = fn;
  }

  isDown(code: string): boolean {
    return this.keys.has(code);
  }

  private pad(): Gamepad | null {
    if (typeof navigator.getGamepads !== 'function') return null;
    for (const pad of navigator.getGamepads()) {
      if (pad && pad.connected) return pad;
    }
    return null;
  }

  /** Poll gamepad sticks; call once per frame before sampling. */
  pollGamepad(): void {
    const pad = this.pad();
    this.gamepadAim = null;
    if (!pad) return;
    const ax = pad.axes[2] ?? 0;
    const ay = pad.axes[3] ?? 0;
    if (Math.hypot(ax, ay) > 0.35) {
      this.gamepadAim = Math.atan2(ay, ax);
      this.padUsed = true;
    }
  }

  /** Movement axes in [-1, 1] — keyboard, gamepad, or touch stick. */
  moveAxes(): { mx: number; my: number } {
    let mx = 0;
    let my = 0;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) mx -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) mx += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) my -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) my += 1;

    if (mx === 0 && my === 0) {
      const pad = this.pad();
      if (pad) {
        const px = pad.axes[0] ?? 0;
        const py = pad.axes[1] ?? 0;
        if (Math.hypot(px, py) > STICK_DEADZONE) {
          mx = px;
          my = py;
          this.padUsed = true;
        }
      }
    }
    if (mx === 0 && my === 0 && (this.touchMoveX !== 0 || this.touchMoveY !== 0)) {
      mx = this.touchMoveX;
      my = this.touchMoveY;
    }

    const len = Math.hypot(mx, my);
    if (len > 1) {
      mx /= len;
      my /= len;
    }
    return { mx, my };
  }

  buttons(): number {
    let b = 0;
    const pad = this.pad();
    // RT / A hold to attack on pads; LB/RB/Y/D-up fire the abilities.
    const padAttack =
      pad !== null &&
      ((pad.buttons[7]?.pressed ?? false) || (pad.buttons[0]?.pressed ?? false));
    const padAb1 = pad !== null && (pad.buttons[4]?.pressed ?? false);
    const padAb2 = pad !== null && (pad.buttons[5]?.pressed ?? false);
    const padAb3 = pad !== null && (pad.buttons[3]?.pressed ?? false);
    const padAb4 = pad !== null && (pad.buttons[12]?.pressed ?? false);
    if (padAttack || padAb1 || padAb2 || padAb3 || padAb4) this.padUsed = true;
    if (this.mouseDown || this.keys.has('Space') || padAttack || this.touchAttack) {
      b |= InputButton.Attack;
    }
    // Q/E/R/T — Art, relic, technique, sigil: the fun row.
    if (this.keys.has('KeyQ') || padAb1 || this.touchAbility1) b |= InputButton.Ability1;
    if (this.keys.has('KeyE') || padAb2 || this.touchAbility2) b |= InputButton.Ability2;
    if (this.keys.has('KeyR') || padAb3 || this.touchAbility3) b |= InputButton.Ability3;
    if (this.keys.has('KeyT') || padAb4 || this.touchAbility4) b |= InputButton.Ability4;
    if (this.keys.has('KeyF')) b |= InputButton.Interact;
    if (this.keys.has('ShiftLeft')) b |= InputButton.Dodge;
    return b;
  }

  /** X button (west) on the pad — polled for interact edge detection. */
  padInteractPressed(): boolean {
    const pad = this.pad();
    return pad !== null && (pad.buttons[2]?.pressed ?? false);
  }

  /** True when a connected gamepad is the player's active input device. */
  padPrimary(): boolean {
    return this.padUsed && this.pad() !== null;
  }

  /**
   * Haptic feedback (dual-rumble) — combat impact travels through the
   * hands on gamepads. Silently a no-op without actuator support.
   */
  rumble(strong: number, weak: number, durationMs: number): void {
    const pad = this.pad();
    const actuator = (
      pad as unknown as {
        vibrationActuator?: {
          playEffect?: (
            type: string,
            params: { duration: number; strongMagnitude: number; weakMagnitude: number },
          ) => Promise<unknown>;
        };
      } | null
    )?.vibrationActuator;
    actuator?.playEffect?.('dual-rumble', {
      duration: durationMs,
      strongMagnitude: Math.min(1, strong),
      weakMagnitude: Math.min(1, weak),
    })?.catch(() => {});
  }
}
