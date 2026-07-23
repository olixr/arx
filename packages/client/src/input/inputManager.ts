import { InputButton, SNEAK_FACTOR, WALK_FACTOR } from '@devcraft/shared';

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
  /**
   * While the pad is driving MENUS, its sticks and buttons must not
   * leak into gameplay — navigating a bank must never swing a sword.
   * The UI layer (UiNav) owns this flag.
   */
  uiCapture = false;
  /**
   * Build mode claims the pad's combat buttons (A/X/Y become place /
   * place / demolish) but keeps movement and the aim stick — you walk
   * and steer the ghost while you build. main.ts owns this flag.
   */
  buildCapture = false;

  /**
   * A cinematic (dialogue) owns the stage: movement and every combat
   * button go quiet so a Space-to-advance never swings a sword and a
   * WASD twitch never walks you out of the frame. main.ts owns this.
   */
  cinemaCapture = false;

  /** While a DOM field (chat) has focus, movement keys are ignored. */
  private typingCheck: () => boolean = () => false;

  /**
   * Walk mode: keyboards have no analog stick, so Z toggles a scaled
   * input vector instead — the stick's half-tilt, as a latch.
   */
  walkMode = false;

  /**
   * Sneak mode: the crouch-walk latch. Scales the input vector like walk
   * AND raises the held Sneak bit so the server tracks stealth state.
   */
  sneakMode = false;

  /**
   * One queued sit-toggle press (X / pad D-down). Consumed into exactly
   * one input frame's Sit bit — the server owns the seated state and
   * edge-detects the flip, so the client keeps no latch to desync.
   */
  private sitQueued = false;
  private padSitWasDown = false;
  /**
   * One queued sheathe-toggle press (H / pad D-left) — same protocol
   * as sit: one frame carries the bit, the server owns the state.
   */
  private sheatheQueued = false;
  private padSheatheWasDown = false;

  constructor(target: HTMLElement) {
    window.addEventListener('keydown', (e) => {
      if (this.typingCheck()) return;
      if (e.code === 'KeyZ' && !e.repeat && !this.cinemaCapture) this.walkMode = !this.walkMode;
      if (e.code === 'KeyC' && !e.repeat && !this.cinemaCapture) this.sneakMode = !this.sneakMode;
      // The stance row: Z walk, X sit, C sneak. Build mode owns X
      // (demolish), so the queue only arms in open play.
      if (e.code === 'KeyX' && !e.repeat && !this.cinemaCapture && !this.buildCapture) {
        this.sitQueued = true;
      }
      // H holsters: stow the weapons on the body / pull them back out.
      if (e.code === 'KeyH' && !e.repeat && !this.cinemaCapture && !this.buildCapture) {
        this.sheatheQueued = true;
      }
      this.keys.add(e.code);
      // Keep the page from scrolling on space/arrows; Alt is the loot
      // reveal, so it must not focus the browser's menu bar.
      if (
        ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'AltLeft', 'AltRight'].includes(
          e.code,
        )
      ) {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
    // Window-level so moving the mouse over UI panels also reclaims
    // the device (glyphs flip back to keyboard immediately).
    window.addEventListener('mousemove', (e) => {
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
    // A cinematic freezes the aim too — the speaker must not spin on
    // an idle right-stick brush mid-conversation.
    if (!pad || this.uiCapture || this.cinemaCapture) return;
    const ax = pad.axes[2] ?? 0;
    const ay = pad.axes[3] ?? 0;
    if (Math.hypot(ax, ay) > 0.35) {
      this.gamepadAim = Math.atan2(ay, ax);
      this.padUsed = true;
    }
  }

  /** Raw pad state for the UI navigation layer (edge-detects itself). */
  padSnapshot(): { buttons: readonly GamepadButton[]; axes: readonly number[] } | null {
    const pad = this.pad();
    if (!pad) return null;
    return { buttons: pad.buttons, axes: pad.axes };
  }

  /** Any pad activity at all — flips the HUD into pad mode. */
  notePadActivity(): void {
    this.padUsed = true;
  }

  /** Movement axes in [-1, 1] — keyboard, gamepad, or touch stick. */
  moveAxes(): { mx: number; my: number } {
    if (this.cinemaCapture) return { mx: 0, my: 0 };
    let mx = 0;
    let my = 0;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) mx -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) mx += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) my -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) my += 1;

    if (mx === 0 && my === 0 && !this.uiCapture) {
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
    // Walk/sneak latches: same wire format, smaller vector — prediction
    // never needs to know a mode exists. Sneak wins when both are on.
    if (this.sneakMode) {
      const cur = Math.min(len, 1); // magnitude after the unit clamp above
      if (cur > SNEAK_FACTOR) {
        mx = (mx / cur) * SNEAK_FACTOR;
        my = (my / cur) * SNEAK_FACTOR;
      }
    } else if (this.walkMode) {
      mx *= WALK_FACTOR;
      my *= WALK_FACTOR;
    }
    return { mx, my };
  }

  buttons(): number {
    if (this.cinemaCapture) {
      this.sitQueued = false;
      this.sheatheQueued = false;
      return 0;
    }
    let b = 0;
    // Build mode holsters the weapons on EVERY device: the click (or
    // Space, or Q/E/R/T) that places a wall must never double as an
    // attack or a cast. Only movement-adjacent bits survive — you can
    // still dodge and sneak around your own site while the ghost is up.
    if (this.buildCapture) {
      this.sitQueued = false;
      this.sheatheQueued = false;
      if (this.keys.has('ShiftLeft')) b |= InputButton.Dodge;
      if (this.sneakMode) b |= InputButton.Sneak;
      return b;
    }
    const pad = this.uiCapture ? null : this.pad();
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
    if (this.sneakMode) b |= InputButton.Sneak;
    // Sit: D-pad down edge on pads, or the queued X press — one frame
    // carries the bit, the server flips the seat.
    const padSit = !this.uiCapture && pad !== null && (pad.buttons[13]?.pressed ?? false);
    if (padSit && !this.padSitWasDown) {
      this.sitQueued = true;
      this.padUsed = true;
    }
    this.padSitWasDown = padSit;
    if (this.sitQueued) {
      b |= InputButton.Sit;
      this.sitQueued = false;
    }
    // Sheathe: D-pad left edge on pads, or the queued H press.
    const padSheathe = !this.uiCapture && pad !== null && (pad.buttons[14]?.pressed ?? false);
    if (padSheathe && !this.padSheatheWasDown) {
      this.sheatheQueued = true;
      this.padUsed = true;
    }
    this.padSheatheWasDown = padSheathe;
    if (this.sheatheQueued) {
      b |= InputButton.Sheathe;
      this.sheatheQueued = false;
    }
    return b;
  }

  /** X button (west) on the pad — polled for interact edge detection. */
  padInteractPressed(): boolean {
    if (this.uiCapture || this.buildCapture) return false;
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
