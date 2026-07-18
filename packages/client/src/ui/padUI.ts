import type { InputManager } from '../input/inputManager.js';

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
  select: 8,
  start: 9,
  up: 12,
  down: 13,
  left: 14,
  right: 15,
} as const;

const REPEAT_DELAY_MS = 300;
const REPEAT_RATE_MS = 125;
const STICK_NAV_THRESHOLD = 0.55;

export interface UiNavHooks {
  /** Swap two pack slots (pad carry mode). */
  onInvMove: (from: number, to: number) => void;
  /** Close all station panels + side panels (the Ⓑ backstop). */
  onCloseAll: () => void;
  /** Toggle the inventory / skills panels (Start / Select). */
  onToggleInventory: () => void;
  onToggleSkills: () => void;
  /** Open the Handiwork / Build panels (d-pad down / right). */
  onOpenCraft: () => void;
  onOpenBuild: () => void;
  /** Contextual Ⓐ label for pack items (Deposit at bank, Sell in shop). */
  packActionLabel?: () => string | null;
}

export class UiNav {
  /** 'kb' or 'pad' — mirrored onto <body> as .pad-mode for CSS glyphs. */
  mode: 'kb' | 'pad' = 'kb';

  private focusKey: string | null = null;
  /** Pack slot index currently carried (pad move mode), or null. */
  private carrying: number | null = null;

  private readonly ring: HTMLElement;
  private readonly strip: HTMLElement;
  private readonly tooltip: HTMLElement;
  private readonly prompt: HTMLElement;

  private prevPressed = new Set<number>();
  private wasUiActive = false;
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
    const out: HTMLElement[] = [];
    for (const el of document.querySelectorAll<HTMLElement>('[data-nav]')) {
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

  /** Spatial move: best candidate in the pressed direction. */
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
    let best: HTMLElement | null = null;
    let bestScore = Infinity;
    for (const el of items) {
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
    if (best) this.setFocus(best);
  }

  private setFocus(el: HTMLElement): void {
    this.focusKey = el.dataset.navkey ?? null;
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
    }

    const uiActive = uiOpen && this.mode === 'pad' && snap !== null;
    this.input.uiCapture = uiActive;

    if (!uiActive) {
      this.carrying = null;
      this.wasUiActive = false;
      this.swallowDir = null;
      this.ring.classList.add('hidden');
      this.hideTooltip();
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
    const ax = snap!.axes[0] ?? 0;
    const ay = snap!.axes[1] ?? 0;
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
      this.moveFocus(dir);
    } else if (
      nowMs - this.navHeldSince > REPEAT_DELAY_MS &&
      nowMs - this.navLastStep > REPEAT_RATE_MS
    ) {
      this.navLastStep = nowMs;
      this.moveFocus(dir);
    }

    // A freshly opened panel owns the cursor: whenever the set of open
    // panels changes (or nothing is focused), land on the new panel's
    // first ROW — never the dock, never the ✕ chip.
    const sig = Array.from(document.querySelectorAll('.side-panel:not(.hidden)'))
      .map((p) => p.id)
      .join('|');
    if (sig !== this.panelSig || !this.focused()) {
      this.panelSig = sig;
      const items = this.navigables();
      const inPanel = items.filter((el) => el.closest('.side-panel'));
      const first = inPanel.find((el) => !el.classList.contains('panel-close')) ?? inPanel[0] ?? items[0];
      if (first) this.setFocus(first);
    }

    // ---- actions
    if (edge(BTN.a)) {
      const el = this.focused();
      if (this.carrying !== null && el?.dataset.invslot !== undefined) {
        this.handleCarry(); // Ⓐ also places while carrying
      } else {
        el?.click();
      }
    }
    if (edge(BTN.x)) this.handleCarry();
    if (edge(BTN.b)) {
      if (this.carrying !== null) this.carrying = null;
      else this.hooks.onCloseAll();
    }
    if (edge(BTN.start)) this.hooks.onToggleInventory();
    if (edge(BTN.select)) this.hooks.onToggleSkills();

    this.prevPressed = pressed;

    // ---- visuals (ring throttles its own layout reads)
    this.positionRing(nowMs);
    if (this.focusKey !== this.ringKey || nowMs === this.ringAt) {
      this.updateStrip();
      this.updateTooltip();
    }
  }

  /**
   * Start/Select/d-pad work OUTSIDE menus too — that's how pads get
   * in: Start Pack, Select Skills, d-pad ▼ Handiwork, d-pad ▶ Build.
   * (D-pad ▲ stays an ability; down/right are free in gameplay.)
   */
  private handleGlobalButtons(snap: {
    buttons: readonly GamepadButton[];
  }): void {
    const edge = (i: number): boolean =>
      (snap.buttons[i]?.pressed ?? false) && !this.prevPressed.has(i);
    if (this.mode !== 'pad') return;
    if (edge(BTN.start)) this.hooks.onToggleInventory();
    if (edge(BTN.select)) this.hooks.onToggleSkills();
    if (edge(BTN.down)) this.hooks.onOpenCraft();
    if (edge(BTN.right)) this.hooks.onOpenBuild();
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
    if (this.carrying !== null) {
      actions.push(['a', 'Place'], ['x', 'Place'], ['b', 'Cancel']);
    } else if (el?.dataset.invslot !== undefined) {
      const ctx = this.hooks.packActionLabel?.() ?? null;
      actions.push(['a', ctx ?? el.dataset.acta ?? 'Use']);
      if (el.dataset.filled === '1') actions.push(['x', 'Move']);
      actions.push(['b', 'Close']);
    } else {
      if (el) actions.push(['a', el.dataset.acta ?? 'Select']);
      actions.push(['b', 'Close']);
    }
    this.renderStrip(
      actions.map((a) => a.join(':')).join('|'),
      actions.map(([btn, label]) => [`pad-glyph ${btn}`, btn.toUpperCase(), label]),
    );
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
    if (el?.dataset.tipname) this.showTooltipFor(el);
    else this.hideTooltip();
  }

  // ---- world interact prompt ---------------------------------------

  /**
   * Glyph prompt floating over the tile the Interact button would use:
   * `Ⓧ Open Bank` on pad, `F Open Bank` on keyboard.
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
      this.prompt.classList.remove('hidden');
      this.prompt.innerHTML = '';
      const glyph = document.createElement('span');
      if (this.mode === 'pad') {
        glyph.className = 'pad-glyph x';
        glyph.textContent = 'X';
      } else {
        glyph.className = 'kb-glyph';
        glyph.textContent = 'F';
      }
      const text = document.createElement('span');
      text.textContent = at.label;
      this.prompt.append(glyph, text);
    }
    this.prompt.style.transform = `translate(calc(${Math.round(at.sx)}px - 50%), ${Math.round(at.sy)}px)`;
  }
}
