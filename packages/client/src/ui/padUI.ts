import type { InputManager } from '../input/inputManager.js';
import { ACTIONS, bindings, type ActionId } from '../input/bindings.js';
import {
  closeSheet,
  openSheetFor,
  sheetOpen,
  sheetPadVerb,
  sheetRadialCount,
  hasSheetVerbs,
} from './kit/contextSheet.js';

/**
 * Gamepad-first UI navigation — the console layer over the DOM UI.
 *
 * Design laws:
 * - ONE FOCUS, ALWAYS VISIBLE. In pad mode with a panel open, a gold
 *   focus ring glides between `[data-nav]` elements; every navigable
 *   thing is reachable by stick/d-pad spatial movement. Focus survives
 *   panel re-renders by KEY (`data-navkey`), never by element.
 * - MENUS CAPTURE THE PAD. While navigating, sticks and buttons are
 *   invisible to gameplay (input.uiCapture) — browsing the bank never
 *   swings a sword. Closing the last panel hands the pad straight back.
 * - SAME WIRES AS THE MOUSE. Ⓐ activates by dispatching a real click
 *   on the focused element, so pad and mouse run identical code paths
 *   and can never drift apart in behavior.
 * - EVERY SCREEN TEACHES ITSELF. A contextual action strip (Ⓐ Use ·
 *   Ⓧ Move · Ⓑ Close) rides with the UI, and the world shows a glyph
 *   prompt over whatever the Interact button would use.
 */

/** Standard-gamepad button indexes. */
const BTN = {
  a: 0,
  b: 1,
  x: 2,
  y: 3,
  lb: 4,
  rb: 5,
  lt: 6,
  rt: 7,
  select: 8,
  start: 9,
  up: 12,
  down: 13,
  left: 14,
  right: 15,
} as const;

/** How long Start must be held before the Screen Ring fans open. */
const RING_HOLD_MS = 220;
/** Stick throw that counts as pointing at a ring sector. */
const RING_PICK_THRESHOLD = 0.45;
/** The same read for the verb wheel — a hair firmer, it sits denser. */
const SHEET_PICK_THRESHOLD = 0.55;

/**
 * THE STICK HAS A THROTTLE. The first repeat waits out the delay; after
 * that the rate reads how hard the stick is thrown (a d-pad counts as a
 * full throw) and keeps shortening while the direction is held, down to
 * the floor. A tap still lands exactly one step.
 */
const REPEAT_DELAY_MS = 260;
const REPEAT_RATE_MS = 132;
const REPEAT_RATE_FLOOR_MS = 52;
/** How long a direction must be held to reach the floor rate. */
const REPEAT_RAMP_MS = 900;
const STICK_NAV_THRESHOLD = 0.5;
/** Deflection at which the stick is asking for the fastest walk. */
const STICK_FULL_THROW = 0.92;

/**
 * How long a pending `data-navnext` keeps looking for its target. A
 * panel usually rebuilds inside the same frame, but anything waiting on
 * the wire lands later — the advance must survive that without ever
 * pouncing on a frame the player has already taken over.
 */
const ADVANCE_WINDOW_MS = 700;

/**
 * Buttons the MENU grammar owns while navigating: faces, bumpers,
 * triggers (they page since the Grand Refit), and the d-pad. A screen
 * shortcut (rebindable) only fires inside menus when it lives on a
 * button outside this set (Select/L3/R3), so navigation never doubles
 * as a shortcut. Start belongs to the Screen Ring and is handled by
 * its own state machine, never by the shortcut loops.
 */
const NAV_RESERVED = new Set([0, 1, 2, 3, 4, 5, 6, 7, 12, 13, 14, 15]);

/** The rebindable screen-opening actions the pad can fire directly. */
const SCREEN_ACTIONS: readonly ActionId[] = ACTIONS.filter(
  (a) => a.id.startsWith('screen') || a.id === 'mapGlass',
).map((a) => a.id);

export interface UiNavHooks {
  /** Swap two pack slots (pad carry mode). */
  onInvMove: (from: number, to: number) => void;
  /** Drop the carried pack slot onto the ground (Ⓨ while carrying). */
  onDropToWorld: (slot: number) => void;
  /**
   * Focus landed on an element — show the item inspect card for it if
   * it's an item cell. Return true when a card is showing (the small
   * tooltip stands down). Called with null when pad UI ends.
   */
  onInspect?: (el: HTMLElement | null) => boolean;
  /** Ⓨ on a focused item cell: open its verb menu. */
  onItemMenu?: (el: HTMLElement) => void;
  /** Close an open verb menu; true if one was open (Ⓑ eats the press). */
  closeItemMenu?: () => boolean;
  /** Close all station panels + side panels (the Ⓑ backstop). */
  onCloseAll: () => void;
  /**
   * A rebindable screen shortcut fired on its pad button — Start Pack,
   * Select Chart by default. Same wire as the keyboard hotkeys.
   */
  onScreenAction: (id: ActionId) => void;
  /** LB / RB with a screen open: step to the prev / next screen. */
  onCycleScreen: (dir: -1 | 1) => void;
  /** Contextual Ⓐ label for pack items (Deposit at bank, Sell in shop). */
  packActionLabel?: () => string | null;
  /** Focus stepped to a new control — the barely-there cursor tick. */
  onFocusMove?: () => void;
  /** The device changed hands — screens re-render their glyphs. */
  onModeChange?: (mode: 'kb' | 'pad') => void;
  /** The Screen Ring chose a room. */
  onRingPick?: (id: string) => void;
  /** The rooms the ring fans out — id, name, painted crest. */
  ringItems?: () => Array<{ id: string; label: string; icon: string }>;
}

export class UiNav {
  /** 'kb' or 'pad' — mirrored onto <body> as .pad-mode for CSS glyphs. */
  mode: 'kb' | 'pad' = 'kb';

  /** True while the Controls menu is capturing a new binding. */
  suspended = false;

  /**
   * A screen may claim the left stick for itself (the Chart pans with
   * it); while claimed, spatial focus walks on the d-pad alone.
   */
  claimStick: (() => boolean) | null = null;

  private focusKey: string | null = null;
  /** Pack slot index currently carried (pad move mode), or null. */
  private carrying: number | null = null;

  private readonly ring: HTMLElement;
  private readonly strip: HTMLElement;
  private readonly tooltip: HTMLElement;
  private readonly prompt: HTMLElement;
  /** The Screen Ring overlay (hold Start). */
  private readonly screenRing: HTMLElement;
  private ringShown = false;
  private ringStartAt = 0;
  private ringSel: string | null = null;
  private ringButtons: Array<{ id: string; el: HTMLElement }> = [];

  private prevPressed = new Set<number>();
  private wasUiActive = false;
  /** Where focus returns when the item verb menu closes. */
  private menuReturnKey: string | null = null;
  /**
   * THE HAND LANDS ON THE WORK: a `data-navnext` target still looking
   * for its element. `from` is where the cursor stood, so Ⓑ can walk
   * back; `until` bounds the search so a target that never renders
   * cannot ambush a later frame.
   */
  private advance: { sel: string; from: string | null; until: number } | null = null;
  /** Where Ⓑ retraces to — set the moment an advance actually lands. */
  private retraceKey: string | null = null;
  /**
   * Where the cursor physically was, so a wholesale re-render recovers
   * to the nearest surviving control instead of the panel's first row.
   */
  private lastRect: { x: number; y: number } | null = null;
  /** Each screen's last stop, so LB/RB come back to where you were. */
  private readonly placeByScreen = new Map<string, string>();
  /** Direction held when UI capture began — inert until released. */
  private swallowDir: 'up' | 'down' | 'left' | 'right' | null = null;
  private navHeldSince = 0;
  private navLastStep = 0;
  private navHeldDir: string | null = null;
  private stripKey = '';
  /** A gameplay MODE's action strip (build mode) — overrides focus strip. */
  private modeStrip: { key: string; items: Array<[cls: string, glyph: string, label: string]> } | null =
    null;
  private promptKey = '';
  /** When the current prompt target first appeared — drives .settled. */
  private promptSince = 0;
  /** Which side panels are open — focus re-lands when this changes. */
  private panelSig = '';
  /** Ring layout reads are throttled — forced layout every frame tanks fps. */
  private ringKey: string | null = null;
  private ringCarry = false;
  private ringAt = 0;

  constructor(
    private readonly input: InputManager,
    private readonly hooks: UiNavHooks,
  ) {
    this.ring = this.el('ui-focus-ring');
    this.strip = this.el('ui-action-strip');
    this.tooltip = this.el('ui-tooltip');
    this.prompt = this.el('ui-interact-prompt');
    this.screenRing = this.el('screen-ring');
    // A rebind redraws the cached chips (prompt glyph, action strip).
    bindings.onChange(() => {
      this.promptKey = '';
      this.stripKey = '';
    });
  }

  private el(id: string): HTMLElement {
    const div = document.createElement('div');
    div.id = id;
    div.className = 'hidden';
    document.body.appendChild(div);
    return div;
  }

  get isCarrying(): boolean {
    return this.carrying !== null;
  }

  /** All currently-visible navigable elements. */
  private navigables(): HTMLElement[] {
    // An open verb sheet or item menu is MODAL: focus stays inside it
    // until it closes — spatial nav must never wander back into the
    // grid behind it. Character creation and the pet naming are modal
    // the same way.
    const visible = (id: string): HTMLElement | null => {
      const el = document.getElementById(id);
      return el && !el.classList.contains('hidden') ? el : null;
    };
    const scope =
      visible('ctx-sheet') ??
      visible('item-menu') ??
      visible('petname-stage') ??
      visible('look-panel') ??
      document;
    const out: HTMLElement[] = [];
    for (const el of scope.querySelectorAll<HTMLElement>('[data-nav]')) {
      if (el.closest('.hidden')) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      out.push(el);
    }
    return out;
  }

  private focused(): HTMLElement | null {
    if (this.focusKey === null) return null;
    const el = document.querySelector<HTMLElement>(
      `[data-navkey="${CSS.escape(this.focusKey)}"]`,
    );
    if (!el || el.closest('.hidden')) return null;
    return el;
  }

  /**
   * Spatial move: best candidate in the pressed direction — but THE
   * REGION HOLDS THE RING first. Candidates sharing the focused
   * element's `[data-region]` container win outright; only when the
   * region offers nothing in that direction does the ring hop out.
   * A list column can never bleed focus into its neighbor mid-walk.
   */
  private moveFocus(dir: 'up' | 'down' | 'left' | 'right'): void {
    const items = this.navigables();
    if (items.length === 0) {
      this.focusKey = null;
      return;
    }
    const cur = this.focused();
    if (!cur) {
      // Land on the first item of the most recently opened panel.
      this.setFocus(items[0]!);
      return;
    }
    const cr = cur.getBoundingClientRect();
    const cx = cr.x + cr.width / 2;
    const cy = cr.y + cr.height / 2;
    const dx = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
    const dy = dir === 'up' ? -1 : dir === 'down' ? 1 : 0;
    const region = cur.closest('[data-region]');
    const pick = (pool: HTMLElement[]): HTMLElement | null => {
      let best: HTMLElement | null = null;
      let bestScore = Infinity;
      for (const el of pool) {
        if (el === cur) continue;
        const r = el.getBoundingClientRect();
        const ex = r.x + r.width / 2 - cx;
        const ey = r.y + r.height / 2 - cy;
        const along = ex * dx + ey * dy;
        if (along <= 4) continue; // must actually lie in that direction
        const perp = Math.abs(ex * dy) + Math.abs(ey * dx);
        const score = along + perp * 2.2;
        if (score < bestScore) {
          bestScore = score;
          best = el;
        }
      }
      return best;
    };
    const best = region
      ? (pick(items.filter((el) => el.closest('[data-region]') === region)) ?? pick(items))
      : pick(items);
    if (best) {
      this.setFocus(best);
      this.hooks.onFocusMove?.();
    }
  }

  private setFocus(el: HTMLElement): void {
    this.focusKey = el.dataset.navkey ?? null;
    const box = el.getBoundingClientRect();
    this.lastRect = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    // THE LIST FOLLOWS THE RING: every scrolling ledger (pack, bank,
    // shop, skills, look options…) keeps the focused row in view, so
    // spatial nav can never wander onto an invisible element.
    el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  /**
   * One directional step: a focused slider consumes ◀ ▶ as value
   * nudges (the audio menu's volumes, any future range row); everything
   * else moves the focus ring spatially.
   */
  private navStep(dir: 'up' | 'down' | 'left' | 'right'): void {
    if (dir === 'left' || dir === 'right') {
      const el = this.focused();
      if (el instanceof HTMLInputElement && el.type === 'range') {
        const min = Number(el.min || 0);
        const max = Number(el.max || 100);
        const nudge = Math.max(Number(el.step) || 1, (max - min) / 20);
        const next = Math.max(min, Math.min(max, Number(el.value) + (dir === 'right' ? nudge : -nudge)));
        el.value = String(next);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        this.hooks.onFocusMove?.();
        return;
      }
    }
    this.moveFocus(dir);
  }

  /**
   * THE HAND LANDS ON THE WORK. `data-navnext` names where the cursor
   * goes once this control has been used. Three dialects:
   *   `key:<navkey>`   an exact control
   *   `pfx:<prefix>`   the first control whose key starts with prefix
   *   a CSS selector   the first usable control inside that container
   * An enabled control always wins over a disabled one — a Make button
   * greyed for want of ore must not swallow the cursor.
   */
  private advanceTarget(sel: string): HTMLElement | null {
    const items = this.navigables();
    if (sel.startsWith('key:')) {
      const key = sel.slice(4);
      return items.find((el) => el.dataset.navkey === key) ?? null;
    }
    if (sel.startsWith('pfx:')) {
      const pfx = sel.slice(4);
      return items.find((el) => (el.dataset.navkey ?? '').startsWith(pfx)) ?? null;
    }
    const host = document.querySelector<HTMLElement>(sel);
    if (!host || host.closest('.hidden')) return null;
    const inside = items.filter((el) => host.contains(el));
    return inside.find((el) => !(el as HTMLButtonElement).disabled) ?? inside[0] ?? null;
  }

  /** Arm the advance declared on the control just activated. */
  private armAdvance(el: HTMLElement, nowMs: number): void {
    const sel = el.dataset.navnext;
    if (!sel) return;
    this.advance = { sel, from: this.focusKey, until: nowMs + ADVANCE_WINDOW_MS };
  }

  /**
   * Try to land a pending advance. The target usually appears in the
   * same frame the panel re-rendered; a wire round-trip can take a few
   * more, and the window expires quietly rather than landing late.
   */
  private resolveAdvance(nowMs: number): void {
    if (!this.advance) return;
    if (nowMs > this.advance.until) {
      this.advance = null;
      return;
    }
    const target = this.advanceTarget(this.advance.sel);
    if (!target || target.dataset.navkey === this.focusKey) return;
    this.retraceKey = this.advance.from;
    this.advance = null;
    this.setFocus(target);
    this.hooks.onFocusMove?.();
  }

  /**
   * One step back up the trail an advance made. True when the cursor
   * moved, so Ⓑ eats the press instead of shutting the room.
   */
  private retraceStep(): boolean {
    const key = this.retraceKey;
    if (key === null || key === this.focusKey) return false;
    this.retraceKey = null;
    const el = this.navigables().find((e) => e.dataset.navkey === key);
    if (!el) return false;
    this.setFocus(el);
    this.hooks.onFocusMove?.();
    return true;
  }

  /**
   * THE RING HOLDS ITS GROUND. Focus went missing — a wholesale
   * re-render dropped the element under our key. Land on whatever now
   * stands nearest to where the cursor physically was; only a fresh
   * room (no remembered place, no last position) starts at the top.
   */
  private landFocus(remembered: string | null): void {
    const items = this.navigables();
    if (items.length === 0) {
      this.focusKey = null;
      return;
    }
    if (remembered !== null) {
      const kept = items.find((el) => el.dataset.navkey === remembered);
      if (kept) {
        this.setFocus(kept);
        return;
      }
    }
    const inPanel = items.filter((el) => el.closest('.ui-screen, .ui-tray'));
    const pool = inPanel.length > 0 ? inPanel : items;
    const at = this.lastRect;
    if (at) {
      let best: HTMLElement | null = null;
      let bestDist = Infinity;
      for (const el of pool) {
        const r = el.getBoundingClientRect();
        const d = Math.hypot(r.x + r.width / 2 - at.x, r.y + r.height / 2 - at.y);
        if (d < bestDist) {
          bestDist = d;
          best = el;
        }
      }
      if (best) {
        this.setFocus(best);
        return;
      }
    }
    const first = pool.find((el) => !el.classList.contains('panel-close')) ?? pool[0]!;
    this.setFocus(first);
  }

  /** Pick up / place the focused pack slot (Ⓧ). */
  private handleCarry(): void {
    const el = this.focused();
    const slotAttr = el?.dataset.invslot;
    if (slotAttr === undefined) return;
    const idx = Number(slotAttr);
    if (this.carrying === null) {
      // Only a filled slot can be picked up.
      if (el?.dataset.filled === '1') this.carrying = idx;
    } else {
      if (idx !== this.carrying) this.hooks.onInvMove(this.carrying, idx);
      this.carrying = null;
    }
  }

  /** Per-frame drive. Call after input.pollGamepad(). */
  update(nowMs: number, uiOpen: boolean, buildActive = false): void {
    const snap = this.input.padSnapshot();

    // Device mode: any pad button/stick flips to pad; the mouse flips
    // back via InputManager's own mousemove hook (padPrimary()).
    if (snap) {
      const anyPressed = snap.buttons.some((b) => b.pressed);
      const anyStick = Math.hypot(snap.axes[0] ?? 0, snap.axes[1] ?? 0) > 0.4;
      if (anyPressed || anyStick) this.input.notePadActivity();
    }
    const newMode: 'kb' | 'pad' = this.input.padPrimary() ? 'pad' : 'kb';
    if (newMode !== this.mode) {
      this.mode = newMode;
      document.body.classList.toggle('pad-mode', newMode === 'pad');
      // Screens that write glyphs into sentences re-render for the
      // new device — the codex may not keep yesterday's letters.
      this.hooks.onModeChange?.(newMode);
    }

    const uiActive = uiOpen && this.mode === 'pad' && snap !== null;
    this.input.uiCapture = uiActive;

    // The Controls menu's rebind overlay suspends the whole grammar:
    // the next press must become a binding, never an action — and
    // never a sword swing, whatever mode the HUD was in.
    if (this.suspended) {
      this.input.uiCapture = true;
      this.prevPressed = snap
        ? new Set(snap.buttons.map((b, i) => (b.pressed ? i : -1)).filter((i) => i >= 0))
        : new Set();
      return;
    }

    // THE SCREEN RING: Start belongs to the ring's state machine on a
    // pad — hold fans the rooms open, a tap keeps its old shortcut.
    // While the ring owns the frame, every other grammar stands down.
    if (snap && this.mode === 'pad' && this.handleRing(snap, nowMs)) {
      this.prevPressed = new Set(
        snap.buttons.map((b, i) => (b.pressed ? i : -1)).filter((i) => i >= 0),
      );
      return;
    }

    if (!uiActive) {
      this.carrying = null;
      this.swallowDir = null;
      this.ring.classList.add('hidden');
      // Hide pad-driven UI once, on the TRANSITION out — hiding every
      // frame would also kill the mouse's hover tooltip and card.
      if (this.wasUiActive) {
        this.hideTooltip();
        this.hooks.onInspect?.(null);
        this.hooks.closeItemMenu?.();
      }
      this.wasUiActive = false;
      // A gameplay mode (building) may pin its own action strip; it is
      // modal, so the global panel shortcuts stand down while it runs.
      if (this.modeStrip) this.renderStrip(this.modeStrip.key, this.modeStrip.items);
      else this.hideStrip();
      if (snap && !buildActive) this.handleGlobalButtons(snap);
      this.prevPressed = snap
        ? new Set(snap.buttons.map((b, i) => (b.pressed ? i : -1)).filter((i) => i >= 0))
        : new Set();
      return;
    }

    // ---- edges
    const pressed = new Set<number>();
    snap!.buttons.forEach((b, i) => {
      if (b.pressed) pressed.add(i);
    });
    const edge = (i: number): boolean => pressed.has(i) && !this.prevPressed.has(i);

    // ---- directional nav with initial delay + repeat
    const stickClaimed = this.claimStick?.() ?? false;
    const ax = stickClaimed ? 0 : (snap!.axes[0] ?? 0);
    const ay = stickClaimed ? 0 : (snap!.axes[1] ?? 0);
    let dir: 'up' | 'down' | 'left' | 'right' | null = null;
    if (pressed.has(BTN.up) || ay < -STICK_NAV_THRESHOLD) dir = 'up';
    else if (pressed.has(BTN.down) || ay > STICK_NAV_THRESHOLD) dir = 'down';
    else if (pressed.has(BTN.left) || ax < -STICK_NAV_THRESHOLD) dir = 'left';
    else if (pressed.has(BTN.right) || ax > STICK_NAV_THRESHOLD) dir = 'right';

    // The press that OPENED this panel (a d-pad shortcut) is still
    // held on the first UI frame — swallow it until released, so
    // opening Build with d-pad ▶ doesn't also navigate right.
    if (!this.wasUiActive) {
      this.wasUiActive = true;
      this.swallowDir = dir;
    }
    if (this.swallowDir !== null) {
      if (dir === this.swallowDir) dir = null;
      else this.swallowDir = null;
    }
    if (dir === null) {
      this.navHeldDir = null;
    } else if (dir !== this.navHeldDir) {
      this.navHeldDir = dir;
      this.navHeldSince = nowMs;
      this.navLastStep = nowMs;
      // The player took the wheel — a pending advance stands down
      // rather than yanking the cursor out from under them.
      this.advance = null;
      this.navStep(dir);
    } else if (nowMs - this.navHeldSince > REPEAT_DELAY_MS) {
      // Throw and hold-time both shorten the step; a d-pad reads as a
      // full throw, so it ramps on hold-time alone.
      const onDpad =
        pressed.has(BTN.up) ||
        pressed.has(BTN.down) ||
        pressed.has(BTN.left) ||
        pressed.has(BTN.right);
      const thrown = Math.min(1, Math.max(Math.abs(ax), Math.abs(ay), onDpad ? 1 : 0));
      const eager = Math.min(1, thrown / STICK_FULL_THROW);
      const ramp = Math.min(1, (nowMs - this.navHeldSince - REPEAT_DELAY_MS) / REPEAT_RAMP_MS);
      const rate =
        REPEAT_RATE_MS - (REPEAT_RATE_MS - REPEAT_RATE_FLOOR_MS) * (0.45 * eager + 0.55 * ramp);
      if (nowMs - this.navLastStep > rate) {
        this.navLastStep = nowMs;
        this.navStep(dir);
      }
    }

    // A declared advance lands as soon as its target exists — the
    // cursor follows the work instead of walking to it.
    this.resolveAdvance(nowMs);

    // A freshly opened panel owns the cursor. A NEW room lands on its
    // remembered stop, else its first ROW — never the dock, never the
    // ✕ chip. A re-render INSIDE a room recovers to whatever now
    // stands where the cursor physically was.
    const sig = Array.from(document.querySelectorAll('.ui-screen:not(.hidden), .ui-tray:not(.hidden)'))
      .map((p) => p.id)
      .join('|');
    const roomChanged = sig !== this.panelSig;
    if (roomChanged) {
      // Leaving: remember the place, so LB/RB come back to it.
      if (this.panelSig !== '' && this.focusKey !== null) {
        this.placeByScreen.set(this.panelSig, this.focusKey);
      }
      this.panelSig = sig;
      this.retraceKey = null;
      this.advance = null;
      this.lastRect = null;
    }
    if (!this.focused()) {
      this.landFocus(roomChanged ? (this.placeByScreen.get(sig) ?? null) : null);
    }

    // ---- typing: a text field the pad focused owns the stage until
    // Ⓑ hands it back — every other verb stands down while it types.
    const typingEl = document.activeElement;
    if (
      typingEl instanceof HTMLInputElement &&
      (typingEl.type === 'text' || typingEl.type === 'password')
    ) {
      if (edge(BTN.b)) typingEl.blur();
      this.prevPressed = pressed;
      this.positionRing(nowMs);
      return;
    }

    // ---- the verb sheet is modal, and THE SEAT ANSWERS ITS OWN
    // BUTTON: while it stands, a verb wearing a pad button takes that
    // button's press directly; Ⓐ presses the focused verb; Ⓑ folds
    // the sheet and walks focus home. Nothing else fires.
    if (sheetOpen()) {
      for (const i of pressed) {
        if (!edge(i) || i === BTN.a || i === BTN.b) continue;
        const verb = sheetPadVerb(i);
        if (verb) {
          verb.click();
          this.focusKey = this.menuReturnKey ?? this.focusKey;
        }
      }
      // VERBS FAN OUT: on the wheel, the stick's angle IS the choice —
      // one flick reaches any verb, and the d-pad still steps.
      const spokes = sheetRadialCount();
      if (spokes > 0 && !stickClaimed) {
        const sx = snap!.axes[0] ?? 0;
        const sy = snap!.axes[1] ?? 0;
        if (Math.hypot(sx, sy) > SHEET_PICK_THRESHOLD) {
          const step = 360 / spokes;
          const deg = (Math.atan2(sy, sx) * 180) / Math.PI; // 0° = east
          const idx = Math.round(((deg + 90 + 360) % 360) / step) % spokes;
          const key = `ctx:${idx}`;
          if (key !== this.focusKey) {
            const spoke = this.navigables().find((el) => el.dataset.navkey === key);
            if (spoke) {
              this.setFocus(spoke);
              this.hooks.onFocusMove?.();
            }
          }
        }
      }
      if (edge(BTN.a)) this.focused()?.click();
      if (edge(BTN.b)) closeSheet();
      if (!sheetOpen() && this.focusKey?.startsWith('ctx:')) {
        this.focusKey = this.menuReturnKey ?? null;
      }
      this.prevPressed = pressed;
      this.positionRing(nowMs);
      if (this.focusKey !== this.ringKey) {
        this.updateStrip();
        this.updateTooltip();
      }
      return;
    }

    // ---- actions
    if (edge(BTN.a)) {
      const el = this.focused();
      if (this.carrying !== null && el?.dataset.invslot !== undefined) {
        this.handleCarry(); // Ⓐ also places while carrying
      } else if (el instanceof HTMLInputElement && (el.type === 'text' || el.type === 'password')) {
        // Ⓐ on a writing line: take the pen (a hardware keyboard types;
        // Ⓑ puts it down).
        el.focus();
      } else if (el) {
        // Read the advance BEFORE the click: activating a row usually
        // rebuilds the panel, and this element is about to be garbage.
        const advancing = el.dataset.navnext ? el : null;
        el.click();
        // The click may have raised a verb sheet at the element (the
        // codex's seat sheet) — the ring steps inside it.
        if (sheetOpen()) {
          this.menuReturnKey = this.focusKey;
          this.focusKey = 'ctx:0';
        } else if (advancing) {
          this.armAdvance(advancing, nowMs);
          this.resolveAdvance(nowMs); // a same-frame re-render lands now
        }
      }
    }
    if (edge(BTN.x)) this.handleCarry();
    if (edge(BTN.y)) {
      if (this.carrying !== null) {
        // Carrying + Ⓨ: let it go — the item lands at your feet.
        this.hooks.onDropToWorld(this.carrying);
        this.carrying = null;
      } else {
        // Ⓨ on an item: its verb menu, focus jumping inside. Anything
        // else with a registered provider raises the one verb sheet.
        const el = this.focused();
        if (el?.dataset.filled === '1') {
          this.hooks.onItemMenu?.(el);
          // The item's verbs ride the shared sheet in pad mode (the
          // legacy list only serves the pointer) — whichever surface
          // rose, the ring steps inside: an opened menu owns the cursor.
          const menu = document.getElementById('item-menu');
          if (menu && !menu.classList.contains('hidden')) {
            this.menuReturnKey = this.focusKey;
            this.focusKey = 'menu:0';
          } else if (sheetOpen()) {
            this.menuReturnKey = this.focusKey;
            this.focusKey = 'ctx:0';
          }
        } else if (el && openSheetFor(el)) {
          this.menuReturnKey = this.focusKey;
          this.focusKey = 'ctx:0';
        }
      }
    }
    if (edge(BTN.b)) {
      if (this.hooks.closeItemMenu?.()) {
        // Menu eaten — focus walks back to the item it came from.
        this.focusKey = this.menuReturnKey ?? this.focusKey;
      } else if (this.carrying !== null) {
        this.carrying = null;
      } else if (this.retraceStep()) {
        // Ⓑ WALKS BACK BEFORE IT SHUTS THE DOOR: an advanced cursor
        // retreats to the row it came from, and the door waits.
      } else {
        this.hooks.onCloseAll();
      }
    }
    // Any close path (Ⓐ on an entry, outside click): when the menu is
    // gone but focus still points into it, walk focus home.
    if (this.focusKey?.startsWith('menu:')) {
      const menu = document.getElementById('item-menu');
      if (!menu || menu.classList.contains('hidden')) {
        this.focusKey = this.menuReturnKey ?? null;
      }
    }
    // LB / RB: walk the shelf of screens — every screen is one bumper
    // away, so the pad reaches Social, the Chart, and Settings without
    // a dock click.
    if (edge(BTN.lb)) this.hooks.onCycleScreen(-1);
    if (edge(BTN.rb)) this.hooks.onCycleScreen(1);

    // LT / RT: the room's own pager — tab rails step, ledgers turn
    // leaves. Only rooms that declare a pager listen; the Chart keeps
    // its trigger zoom because it declares none.
    if (edge(BTN.lt)) this.dispatchPage(-1);
    if (edge(BTN.rt)) this.dispatchPage(1);

    // Rebindable screen shortcuts still land inside menus — but only
    // from buttons the menu grammar doesn't own, and never Start:
    // that press belongs to the ring's own tap-or-hold machine.
    for (const id of SCREEN_ACTIONS) {
      for (const btn of bindings.pad(id)) {
        if (btn === BTN.start) continue;
        if (!NAV_RESERVED.has(btn) && edge(btn)) this.hooks.onScreenAction(id);
      }
    }

    this.prevPressed = pressed;

    // ---- visuals (ring throttles its own layout reads)
    this.positionRing(nowMs);
    if (this.focusKey !== this.ringKey || nowMs === this.ringAt) {
      this.updateStrip();
      this.updateTooltip();
    }
  }

  /**
   * Screen shortcuts work OUTSIDE menus too — that's how pads get in:
   * Start Pack, Select Chart, d-pad ▶ the glass (all rebindable in
   * Controls). Gameplay buttons never appear here: the one keymap
   * guarantees no button serves both a screen and a swing.
   */
  private handleGlobalButtons(snap: {
    buttons: readonly GamepadButton[];
  }): void {
    const edge = (i: number): boolean =>
      (snap.buttons[i]?.pressed ?? false) && !this.prevPressed.has(i);
    if (this.mode !== 'pad') return;
    for (const id of SCREEN_ACTIONS) {
      for (const btn of bindings.pad(id)) {
        if (btn === BTN.start) continue; // the ring's tap machine fires it
        if (edge(btn)) this.hooks.onScreenAction(id);
      }
    }
  }

  /** LT/RT: hand the press to the open room's declared pager. */
  private dispatchPage(dir: -1 | 1): void {
    const pager = document.querySelector<HTMLElement>(
      '.ui-screen:not(.hidden) [data-pager], .ui-tray:not(.hidden) [data-pager]',
    );
    pager?.dispatchEvent(new CustomEvent('kit-page', { detail: dir }));
  }

  // ---- THE SCREEN RING ---------------------------------------------

  /**
   * Start's tap-or-hold machine. Hold past the threshold and the ten
   * rooms fan around the stick; flick, release, the room opens. A tap
   * shorter than the threshold fires whatever screen action Start is
   * bound to — the shipped default (open the Pack) survives intact.
   * Returns true while it owns the frame.
   */
  private handleRing(
    snap: { buttons: readonly GamepadButton[]; axes: readonly number[] },
    nowMs: number,
  ): boolean {
    const down = snap.buttons[BTN.start]?.pressed ?? false;
    const was = this.prevPressed.has(BTN.start);
    if (down && !was) this.ringStartAt = nowMs;
    if (down && !this.ringShown && nowMs - this.ringStartAt > RING_HOLD_MS) this.showScreenRing();

    if (this.ringShown) {
      this.input.uiCapture = true;
      const ax = snap.axes[0] ?? 0;
      const ay = snap.axes[1] ?? 0;
      let sel: string | null = null;
      if (Math.hypot(ax, ay) > RING_PICK_THRESHOLD && this.ringButtons.length > 0) {
        const step = 360 / this.ringButtons.length;
        const deg = (Math.atan2(ay, ax) * 180) / Math.PI; // 0° = east
        const idx = Math.round(((deg + 90 + 360) % 360) / step) % this.ringButtons.length;
        sel = this.ringButtons[idx]?.id ?? null;
      }
      if (sel !== this.ringSel) {
        this.ringSel = sel;
        for (const item of this.ringButtons) {
          item.el.classList.toggle('sel', item.id === sel);
        }
        const name = this.screenRing.querySelector('.ring-name');
        if (name) name.textContent = this.ringButtons.find((i) => i.id === sel)?.el.dataset.label ?? '';
      }
    }

    if (!down && was) {
      if (this.ringShown) {
        const pick = this.ringSel;
        this.hideScreenRing();
        if (pick) this.hooks.onRingPick?.(pick);
        return true;
      }
      // A clean tap: fire the screen actions riding Start.
      for (const id of SCREEN_ACTIONS) {
        if (bindings.pad(id).includes(BTN.start)) this.hooks.onScreenAction(id);
      }
      return false;
    }
    return down || this.ringShown;
  }

  private showScreenRing(): void {
    const items = this.hooks.ringItems?.() ?? [];
    if (items.length === 0) return;
    this.ringShown = true;
    this.ringSel = null;
    this.screenRing.classList.remove('hidden');
    this.screenRing.innerHTML = '';
    const name = document.createElement('div');
    name.className = 'ring-name';
    this.screenRing.appendChild(name);
    this.ringButtons = items.map((item, i) => {
      const el = document.createElement('div');
      el.className = 'ring-item';
      el.dataset.label = item.label;
      el.style.setProperty('--ring-angle', `${(i * 360) / items.length}deg`);
      const img = document.createElement('img');
      img.src = item.icon;
      img.draggable = false;
      const lab = document.createElement('span');
      lab.textContent = item.label;
      el.append(img, lab);
      this.screenRing.appendChild(el);
      return { id: item.id, el };
    });
  }

  private hideScreenRing(): void {
    this.ringShown = false;
    this.ringSel = null;
    this.ringButtons = [];
    this.screenRing.classList.add('hidden');
  }

  private positionRing(nowMs: number): void {
    // Reposition only when focus/carry changed, plus a slow heartbeat
    // for re-renders that move the element under a stable key.
    const carryNow = this.carrying !== null;
    if (
      this.focusKey === this.ringKey &&
      carryNow === this.ringCarry &&
      nowMs - this.ringAt < 180
    ) {
      return;
    }
    this.ringAt = nowMs;
    const carryChanged = carryNow !== this.ringCarry;
    this.ringKey = this.focusKey;
    this.ringCarry = carryNow;
    const el = this.focused();
    if (!el) {
      this.ring.classList.add('hidden');
      return;
    }
    const r = el.getBoundingClientRect();
    this.ring.classList.remove('hidden');
    this.ring.classList.toggle('carrying', carryNow);
    this.ring.style.transform = `translate(${r.x - 3}px, ${r.y - 3}px)`;
    this.ring.style.width = `${r.width + 6}px`;
    this.ring.style.height = `${r.height + 6}px`;
    // Carried slot stays marked while focus roams.
    if (carryChanged) {
      document.querySelectorAll('.inv-slot.carry-src').forEach((s) => s.classList.remove('carry-src'));
      if (carryNow) {
        document
          .querySelector(`[data-invslot="${this.carrying}"]`)
          ?.classList.add('carry-src');
      }
    }
  }

  // ---- contextual action strip -------------------------------------

  private updateStrip(): void {
    const el = this.focused();
    const actions: Array<[string, string]> = [];
    // Ⓑ says what it will actually do: retreat up the trail an advance
    // made, or shut the room when there is no trail left.
    const back = this.retraceKey !== null && this.retraceKey !== this.focusKey ? 'Back' : 'Close';
    if (this.carrying !== null) {
      actions.push(['a', 'Place'], ['x', 'Place'], ['y', 'Drop'], ['b', 'Cancel']);
    } else if (el?.dataset.invslot !== undefined) {
      const ctx = this.hooks.packActionLabel?.() ?? null;
      actions.push(['a', ctx ?? el.dataset.acta ?? 'Use']);
      if (el.dataset.filled === '1') {
        actions.push(['x', 'Move']);
        actions.push(['y', 'Options']);
      }
      actions.push(['b', back]);
    } else if (el?.dataset.equipslot !== undefined && el.dataset.filled === '1') {
      actions.push(['a', 'Remove'], ['y', 'Options'], ['b', back]);
    } else {
      if (el) {
        actions.push(['a', el.dataset.acta ?? 'Select']);
        // The strip tells the truth: anything holding a verb sheet
        // says so.
        if (hasSheetVerbs(el)) actions.push(['y', 'Options']);
      }
      actions.push(['b', back]);
    }
    const items: Array<[string, string, string]> = actions.map(([btn, label]) => [
      `pad-glyph ${btn}`,
      btn.toUpperCase(),
      label,
    ]);
    // The standing bumper affordance: every screen is one LB/RB away.
    items.push(['pad-glyph lb', 'LB', ''], ['pad-glyph rb', 'RB', 'Screens']);
    this.renderStrip(actions.map((a) => a.join(':')).join('|') + '|cycle', items);
  }

  /**
   * Pin the strip to a gameplay mode's verbs (build mode) — shown on
   * BOTH devices, with the caller picking glyph chips per device.
   * Cleared when the mode ends; while set it outranks the focus strip.
   */
  showModeStrip(key: string, items: Array<[cls: string, glyph: string, label: string]>): void {
    this.modeStrip = { key, items };
  }

  clearModeStrip(): void {
    this.modeStrip = null;
  }

  private renderStrip(key: string, items: Array<[cls: string, glyph: string, label: string]>): void {
    if (key === this.stripKey) return;
    this.stripKey = key;
    this.strip.classList.remove('hidden');
    this.strip.innerHTML = '';
    for (const [cls, glyphText, label] of items) {
      const item = document.createElement('span');
      item.className = 'strip-item';
      const glyph = document.createElement('span');
      glyph.className = cls;
      glyph.textContent = glyphText;
      const text = document.createElement('span');
      text.textContent = label;
      item.append(glyph, text);
      this.strip.appendChild(item);
    }
  }

  private hideStrip(): void {
    if (this.stripKey !== '') {
      this.stripKey = '';
      this.strip.classList.add('hidden');
    }
  }

  // ---- tooltip ------------------------------------------------------

  /** Show the shared tooltip for an element (mouse hover path). */
  showTooltipFor(el: HTMLElement): void {
    const name = el.dataset.tipname;
    if (!name) {
      this.hideTooltip();
      return;
    }
    const r = el.getBoundingClientRect();
    this.tooltip.classList.remove('hidden');
    this.tooltip.innerHTML = '';
    const title = document.createElement('div');
    title.className = 'tip-name';
    title.textContent = name;
    this.tooltip.appendChild(title);
    if (el.dataset.tipsub) {
      const sub = document.createElement('div');
      sub.className = 'tip-sub';
      sub.textContent = el.dataset.tipsub;
      this.tooltip.appendChild(sub);
    }
    // Above the element, clamped on-screen.
    const tw = this.tooltip.offsetWidth;
    const x = Math.max(8, Math.min(window.innerWidth - tw - 8, r.x + r.width / 2 - tw / 2));
    const y = Math.max(8, r.y - this.tooltip.offsetHeight - 8);
    this.tooltip.style.transform = `translate(${x}px, ${y}px)`;
  }

  hideTooltip(): void {
    this.tooltip.classList.add('hidden');
  }

  private updateTooltip(): void {
    const el = this.focused();
    // Item cells get the full inspect card; the small tooltip serves
    // everything else (dock buttons, technique chips, empty sockets).
    if (el && this.hooks.onInspect?.(el)) {
      this.hideTooltip();
      return;
    }
    if (el?.dataset.tipname) this.showTooltipFor(el);
    else this.hideTooltip();
  }

  // ---- world interact prompt ---------------------------------------

  /**
   * Glyph prompt floating over the tile the Interact button would use:
   * `Ⓧ Open Bank` on pad, `F Open Bank` on keyboard. After a few
   * seconds parked on the same target the label folds away and only
   * the dim key cap stays — a new target brings the verb back.
   */
  setPrompt(at: { sx: number; sy: number; label: string } | null): void {
    if (!at) {
      if (this.promptKey !== '') {
        this.promptKey = '';
        this.prompt.classList.add('hidden');
      }
      return;
    }
    const key = at.label;
    if (key !== this.promptKey) {
      this.promptKey = key;
      this.promptSince = performance.now();
      this.prompt.classList.remove('hidden', 'settled');
      this.prompt.innerHTML = '';
      const glyph = document.createElement('span');
      if (this.mode === 'pad') {
        const g = bindings.padBadge('interact') ?? { cls: 'a', text: 'A' };
        glyph.className = `pad-glyph ${g.cls}`;
        glyph.textContent = g.text;
      } else {
        glyph.className = 'kb-glyph';
        glyph.textContent = bindings.kbBadge('interact') || 'F';
      }
      const text = document.createElement('span');
      text.className = 'prompt-label';
      text.textContent = at.label;
      this.prompt.append(glyph, text);
    }
    this.prompt.classList.toggle('settled', performance.now() - this.promptSince > 4000);
    this.prompt.style.transform = `translate(calc(${Math.round(at.sx)}px - 50%), ${Math.round(at.sy)}px)`;
  }
}
