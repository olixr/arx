import { InputButton, SNEAK_FACTOR, WALK_FACTOR } from '@arx/shared';
import { bindings } from './bindings.js';
import { PadTranslator, padIsActive, type PadView } from './padProfiles.js';

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
  private padSneakWasDown = false;
  /**
   * One queued mount-toggle press (P; pad unbound by default) — the
   * sit protocol again: one frame carries the bit, the server owns
   * the saddle and every dismount law.
   */
  private mountQueued = false;
  private padMountWasDown = false;

  /**
   * The dialect translator — turns a pad the browser never mapped
   * (8BitDo in Switch / D-input / macOS mode, and friends) into the
   * standard layout everything above this class reads.
   */
  private translator = new PadTranslator();
  /** Slot of the pad the player last actually touched. */
  private activePadIndex: number | null = null;

  constructor(target: HTMLElement) {
    // A pad that leaves takes its cached layout with it — the next
    // device in that slot must be sniffed fresh, never inherit a
    // stranger's hat axis.
    window.addEventListener('gamepaddisconnected', (e) => {
      const gp = (e as GamepadEvent).gamepad;
      if (gp) {
        this.translator.forget(gp);
        if (this.activePadIndex === gp.index) this.activePadIndex = null;
      }
    });
    // Chrome only reveals a pad after it sends input while the page has
    // focus; the connect event is the earliest honest moment to drop a
    // stale guess and re-sniff.
    window.addEventListener('gamepadconnected', (e) => {
      const gp = (e as GamepadEvent).gamepad;
      if (gp) this.translator.forget(gp);
    });
    window.addEventListener('keydown', (e) => {
      if (this.typingCheck()) return;
      // The stance latches (walk / sneak) and the one-frame queues
      // (sit / sheathe) — all read from the one keymap. Build mode
      // arms none of the queues; it owns the hands.
      if (!e.repeat && !this.cinemaCapture) {
        if (bindings.kbMatches('walkToggle', e.code)) this.walkMode = !this.walkMode;
        if (bindings.kbMatches('sneakToggle', e.code)) this.sneakMode = !this.sneakMode;
        if (!this.buildCapture) {
          if (bindings.kbMatches('sit', e.code)) this.sitQueued = true;
          if (bindings.kbMatches('sheathe', e.code)) this.sheatheQueued = true;
          if (bindings.kbMatches('mount', e.code)) this.mountQueued = true;
        }
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

  /**
   * THE LIVE PAD. Two things go wrong with taking slot 0 blindly:
   * a pad can announce itself in a later slot (an 8BitDo that leaves a
   * ghost behind after a mode switch, a second receiver, a phantom the
   * OS never reaps), and a silent pad in slot 0 then swallows every
   * frame. So: whichever pad is ACTUALLY being touched wins, that
   * choice sticks until another pad speaks, and slot order is only the
   * tie-break of last resort.
   */
  private pickPad(): Gamepad | null {
    if (typeof navigator.getGamepads !== 'function') return null;
    let first: Gamepad | null = null;
    let held: Gamepad | null = null;
    let active: Gamepad | null = null;
    for (const pad of navigator.getGamepads()) {
      if (!pad || !pad.connected) continue;
      if (!first) first = pad;
      if (pad.index === this.activePadIndex) held = pad;
      if (!active && padIsActive(pad)) active = pad;
    }
    if (active) {
      this.activePadIndex = active.index;
      return active;
    }
    return held ?? first;
  }

  /** The live pad, translated into the standard layout. */
  private pad(): PadView | null {
    const raw = this.pickPad();
    return raw ? this.translator.view(raw) : null;
  }

  /**
   * Every connected pad, translated — the Controls screen's readout
   * shows all of them so a player can see which one the game hears.
   */
  padDiagnostics(): { views: PadView[]; activeIndex: number | null } {
    const views: PadView[] = [];
    if (typeof navigator.getGamepads === 'function') {
      for (const pad of navigator.getGamepads()) {
        if (pad && pad.connected) views.push(this.translator.view(pad));
      }
    }
    const live = this.pad();
    return { views, activeIndex: live ? live.index : null };
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
    if (bindings.kbDown('moveLeft', this.keys)) mx -= 1;
    if (bindings.kbDown('moveRight', this.keys)) mx += 1;
    if (bindings.kbDown('moveUp', this.keys)) my -= 1;
    if (bindings.kbDown('moveDown', this.keys)) my += 1;

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
      this.mountQueued = false;
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
      this.mountQueued = false;
      if (bindings.kbDown('dodge', this.keys)) b |= InputButton.Dodge;
      if (this.sneakMode) b |= InputButton.Sneak;
      return b;
    }
    const pad = this.uiCapture ? null : this.pad();
    const snap = pad ? { buttons: pad.buttons } : null;
    // Every pad read below goes through the one keymap — RT/Ⓧ attack,
    // LB/RB/Ⓨ/▲ abilities, Ⓑ dodge by default, all rebindable.
    const padAttack = bindings.padHeld('attack', snap);
    const padAb1 = bindings.padHeld('ability1', snap);
    const padAb2 = bindings.padHeld('ability2', snap);
    const padAb3 = bindings.padHeld('ability3', snap);
    const padAb4 = bindings.padHeld('ability4', snap);
    const padDodge = bindings.padHeld('dodge', snap);
    if (padAttack || padAb1 || padAb2 || padAb3 || padAb4 || padDodge) this.padUsed = true;
    if (this.mouseDown || bindings.kbDown('attack', this.keys) || padAttack || this.touchAttack) {
      b |= InputButton.Attack;
    }
    // Q/E/R/T — Art, relic, technique, sigil: the fun row.
    if (bindings.kbDown('ability1', this.keys) || padAb1 || this.touchAbility1) b |= InputButton.Ability1;
    if (bindings.kbDown('ability2', this.keys) || padAb2 || this.touchAbility2) b |= InputButton.Ability2;
    if (bindings.kbDown('ability3', this.keys) || padAb3 || this.touchAbility3) b |= InputButton.Ability3;
    if (bindings.kbDown('ability4', this.keys) || padAb4 || this.touchAbility4) b |= InputButton.Ability4;
    if (bindings.kbDown('interact', this.keys)) b |= InputButton.Interact;
    if (bindings.kbDown('dodge', this.keys) || padDodge) b |= InputButton.Dodge;
    if (this.sneakMode) b |= InputButton.Sneak;
    // Sneak: press edge on the pad's toggle button (L3 by default)
    // flips the same latch the keyboard's toggle drives.
    const padSneak = bindings.padHeld('sneakToggle', snap);
    if (padSneak && !this.padSneakWasDown) {
      this.sneakMode = !this.sneakMode;
      this.padUsed = true;
    }
    this.padSneakWasDown = padSneak;
    // Sit: pad edge (d-pad ▼ default) or the queued key press — one
    // frame carries the bit, the server flips the seat.
    const padSit = bindings.padHeld('sit', snap);
    if (padSit && !this.padSitWasDown) {
      this.sitQueued = true;
      this.padUsed = true;
    }
    this.padSitWasDown = padSit;
    if (this.sitQueued) {
      b |= InputButton.Sit;
      this.sitQueued = false;
    }
    // Sheathe: pad edge (d-pad ◀ default) or the queued key press.
    const padSheathe = bindings.padHeld('sheathe', snap);
    if (padSheathe && !this.padSheatheWasDown) {
      this.sheatheQueued = true;
      this.padUsed = true;
    }
    this.padSheatheWasDown = padSheathe;
    if (this.sheatheQueued) {
      b |= InputButton.Sheathe;
      this.sheatheQueued = false;
    }
    // Mount: unbound on pads by default, but the edge path is wired so
    // a rebind Just Works; the key press queues like sit.
    const padMount = bindings.padHeld('mount', snap);
    if (padMount && !this.padMountWasDown) {
      this.mountQueued = true;
      this.padUsed = true;
    }
    this.padMountWasDown = padMount;
    if (this.mountQueued) {
      b |= InputButton.Mount;
      this.mountQueued = false;
    }
    return b;
  }

  /**
   * Ability bits currently driven by the touch/hotbar buttons — the
   * hold-to-aim layer skips these (a thumb tap keeps its smart cast).
   */
  touchAbilityBits(): number {
    let b = 0;
    if (this.touchAbility1) b |= InputButton.Ability1;
    if (this.touchAbility2) b |= InputButton.Ability2;
    if (this.touchAbility3) b |= InputButton.Ability3;
    if (this.touchAbility4) b |= InputButton.Ability4;
    return b;
  }

  /** The pad's Interact button (Ⓐ default) — polled for edge detection. */
  padInteractPressed(): boolean {
    if (this.uiCapture || this.buildCapture) return false;
    const pad = this.pad();
    return pad !== null && bindings.padHeld('interact', { buttons: pad.buttons });
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
    const pad = this.pad()?.raw ?? null;
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
