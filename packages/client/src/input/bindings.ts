/**
 * THE ONE KEYMAP — every keyboard key and pad button the game answers
 * to is declared here, once. InputManager, the panel hotkeys, the dock
 * badges, the hotbar, and the Controls menu all read this table, so a
 * binding can never drift between what a key DOES and what the UI SAYS.
 *
 * Laws:
 * - ONE ACTION PER KEY. Within a device, no code/button may serve two
 *   actions. `assertNoConflicts` is the contract; the test enforces it
 *   on the shipped defaults, `bind*` enforces it on player edits by
 *   stealing the key from its old owner (and saying so).
 * - MENU GRAMMAR IS FIXED. Ⓐ confirm / Ⓑ close / Ⓧ move / Ⓨ options
 *   and LB/RB screen-cycling are the console dialect — they belong to
 *   the UI layer, not this table, and cannot be rebound away.
 * - PLAYER'S TABLE WINS. Custom bindings persist in localStorage and
 *   load before the first frame; resetting restores this file exactly.
 */

export type ActionId =
  | 'moveUp'
  | 'moveDown'
  | 'moveLeft'
  | 'moveRight'
  | 'attack'
  | 'ability1'
  | 'ability2'
  | 'ability3'
  | 'ability4'
  | 'dodge'
  | 'interact'
  | 'lootReveal'
  | 'sit'
  | 'sheathe'
  | 'walkToggle'
  | 'sneakToggle'
  | 'screenPack'
  | 'screenSkills'
  | 'screenArts'
  | 'screenCraft'
  | 'screenBuild'
  | 'screenSocial'
  | 'screenMap'
  | 'screenQuests'
  | 'screenSettings'
  | 'screenLoot'
  | 'mapGlass'
  | 'zoomIn'
  | 'zoomOut'
  | 'zoomCycle';

export interface ActionDef {
  id: ActionId;
  /** Player-facing name — quiet quartermaster diction. */
  label: string;
  group: 'Movement' | 'Combat' | 'World' | 'Screens' | 'Camera';
  /** Default KeyboardEvent.code list (first entry is the shown badge). */
  kb: readonly string[];
  /** Default standard-gamepad button indexes. */
  pad: readonly number[];
}

/**
 * The shipped layout. Keyboard: WASD moves, Space attacks, QERT casts,
 * F uses, Shift dodges; the stance row is Z walk / X sit / C sneak;
 * screens live on I K V N B U M O G. Pad: RT (or Ⓧ) attacks, Ⓐ uses,
 * Ⓑ dodges, LB/RB/Ⓨ/▲ cast; d-pad ▼ sits, ◀ sheathes, ▶ raises the
 * glass; L3 sneaks, R3 steps the camera; Start is the pack, Select the
 * chart.
 */
export const ACTIONS: readonly ActionDef[] = [
  { id: 'moveUp', label: 'Move north', group: 'Movement', kb: ['KeyW', 'ArrowUp'], pad: [] },
  { id: 'moveDown', label: 'Move south', group: 'Movement', kb: ['KeyS', 'ArrowDown'], pad: [] },
  { id: 'moveLeft', label: 'Move west', group: 'Movement', kb: ['KeyA', 'ArrowLeft'], pad: [] },
  { id: 'moveRight', label: 'Move east', group: 'Movement', kb: ['KeyD', 'ArrowRight'], pad: [] },
  { id: 'walkToggle', label: 'Walk / run', group: 'Movement', kb: ['KeyZ'], pad: [] },
  { id: 'sneakToggle', label: 'Sneak', group: 'Movement', kb: ['KeyC'], pad: [10] },
  { id: 'sit', label: 'Sit / stand', group: 'Movement', kb: ['KeyX'], pad: [13] },

  { id: 'attack', label: 'Attack', group: 'Combat', kb: ['Space'], pad: [7, 2] },
  { id: 'ability1', label: 'Weapon Art', group: 'Combat', kb: ['KeyQ'], pad: [4] },
  { id: 'ability2', label: 'Relic', group: 'Combat', kb: ['KeyE'], pad: [5] },
  { id: 'ability3', label: 'Technique', group: 'Combat', kb: ['KeyR'], pad: [3] },
  { id: 'ability4', label: 'Sigil', group: 'Combat', kb: ['KeyT'], pad: [12] },
  { id: 'dodge', label: 'Dodge', group: 'Combat', kb: ['ShiftLeft'], pad: [1] },
  { id: 'sheathe', label: 'Sheathe weapons', group: 'Combat', kb: ['KeyH'], pad: [14] },

  { id: 'interact', label: 'Use / talk', group: 'World', kb: ['KeyF'], pad: [0] },
  { id: 'lootReveal', label: 'Name the loot', group: 'World', kb: ['AltLeft', 'AltRight'], pad: [6] },
  { id: 'screenLoot', label: 'On the ground', group: 'World', kb: ['KeyG'], pad: [] },

  { id: 'screenPack', label: 'Character', group: 'Screens', kb: ['KeyI'], pad: [9] },
  { id: 'screenSkills', label: 'Skills', group: 'Screens', kb: ['KeyK'], pad: [] },
  { id: 'screenArts', label: 'Techniques', group: 'Screens', kb: ['KeyV'], pad: [] },
  { id: 'screenCraft', label: 'Handiwork', group: 'Screens', kb: ['KeyN'], pad: [] },
  { id: 'screenBuild', label: 'Build', group: 'Screens', kb: ['KeyB'], pad: [] },
  { id: 'screenSocial', label: 'Social', group: 'Screens', kb: ['KeyU'], pad: [] },
  { id: 'screenMap', label: 'The Chart', group: 'Screens', kb: ['KeyM'], pad: [8] },
  { id: 'screenQuests', label: 'Journal', group: 'Screens', kb: ['KeyJ'], pad: [] },
  { id: 'screenSettings', label: 'Settings', group: 'Screens', kb: ['KeyO'], pad: [] },
  { id: 'mapGlass', label: "Traveler's glass", group: 'Screens', kb: ['Tab'], pad: [15] },

  { id: 'zoomIn', label: 'Camera closer', group: 'Camera', kb: ['Equal', 'NumpadAdd'], pad: [] },
  { id: 'zoomOut', label: 'Camera wider', group: 'Camera', kb: ['Minus', 'NumpadSubtract'], pad: [] },
  { id: 'zoomCycle', label: 'Camera step', group: 'Camera', kb: [], pad: [11] },
] as const;

const STORE_KEY = 'arx.controls.v1';

/** Codes the player may not bind — the fixed grammar of the UI. */
const RESERVED_KB = new Set(['Escape', 'Enter', 'NumpadEnter']);

/** KeyboardEvent.code → short badge text. */
export function kbLabel(code: string): string {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  const MAP: Record<string, string> = {
    Space: 'Space',
    ShiftLeft: 'Shift',
    ShiftRight: 'R-Shift',
    ControlLeft: 'Ctrl',
    ControlRight: 'R-Ctrl',
    AltLeft: 'Alt',
    AltRight: 'R-Alt',
    Tab: 'Tab',
    Equal: '+',
    Minus: '−',
    NumpadAdd: 'Num +',
    NumpadSubtract: 'Num −',
    ArrowUp: '↑',
    ArrowDown: '↓',
    ArrowLeft: '←',
    ArrowRight: '→',
    Backquote: '`',
    Backslash: '\\',
    BracketLeft: '[',
    BracketRight: ']',
    Semicolon: ';',
    Quote: "'",
    Comma: ',',
    Period: '.',
    Slash: '/',
    Backspace: 'Bksp',
    CapsLock: 'Caps',
  };
  if (MAP[code]) return MAP[code];
  if (code.startsWith('Numpad')) return `Num ${code.slice(6)}`;
  return code;
}

/** Standard-gamepad button index → glyph chip class + text. */
export function padGlyph(btn: number): { cls: string; text: string } {
  const MAP: Record<number, { cls: string; text: string }> = {
    0: { cls: 'a', text: 'A' },
    1: { cls: 'b', text: 'B' },
    2: { cls: 'x', text: 'X' },
    3: { cls: 'y', text: 'Y' },
    4: { cls: 'lb', text: 'LB' },
    5: { cls: 'rb', text: 'RB' },
    6: { cls: 'lt', text: 'LT' },
    7: { cls: 'rt', text: 'RT' },
    8: { cls: 'select', text: '⧉' },
    9: { cls: 'start', text: '☰' },
    10: { cls: 'l3', text: 'L3' },
    11: { cls: 'r3', text: 'R3' },
    12: { cls: 'dup', text: '▲' },
    13: { cls: 'ddown', text: '▼' },
    14: { cls: 'dleft', text: '◀' },
    15: { cls: 'dright', text: '▶' },
  };
  return MAP[btn] ?? { cls: '', text: `B${btn}` };
}

type Table = Record<ActionId, { kb: string[]; pad: number[] }>;

function defaultsTable(): Table {
  const t = {} as Table;
  for (const a of ACTIONS) t[a.id] = { kb: [...a.kb], pad: [...a.pad] };
  return t;
}

/**
 * Throws when two actions claim the same key or button — the standing
 * contract on the defaults, exercised by the unit test.
 */
export function assertNoConflicts(table: Table): void {
  const kbOwner = new Map<string, ActionId>();
  const padOwner = new Map<number, ActionId>();
  for (const a of ACTIONS) {
    for (const code of table[a.id].kb) {
      const prev = kbOwner.get(code);
      if (prev !== undefined) throw new Error(`key ${code}: ${prev} vs ${a.id}`);
      kbOwner.set(code, a.id);
    }
    for (const btn of table[a.id].pad) {
      const prev = padOwner.get(btn);
      if (prev !== undefined) throw new Error(`pad ${btn}: ${prev} vs ${a.id}`);
      padOwner.set(btn, a.id);
    }
  }
}

export class Bindings {
  private table: Table = defaultsTable();
  private listeners = new Set<() => void>();

  constructor() {
    this.load();
  }

  /** Re-read the player's saved table (no-op without storage). */
  private load(): void {
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(STORE_KEY);
    } catch {
      return; // tests / storage-less contexts run the defaults
    }
    if (!raw) return;
    try {
      const saved = JSON.parse(raw) as Partial<Record<ActionId, { kb?: unknown; pad?: unknown }>>;
      for (const a of ACTIONS) {
        const s = saved[a.id];
        if (!s) continue;
        if (Array.isArray(s.kb) && s.kb.every((c) => typeof c === 'string')) {
          this.table[a.id].kb = s.kb as string[];
        }
        if (
          Array.isArray(s.pad) &&
          s.pad.every((b) => typeof b === 'number' && Number.isInteger(b) && b >= 0 && b <= 16)
        ) {
          this.table[a.id].pad = s.pad as number[];
        }
      }
      // A corrupted or hand-edited table must never ship a conflict —
      // fall back to the standard layout rather than guess.
      assertNoConflicts(this.table);
    } catch {
      this.table = defaultsTable();
    }
  }

  private save(): void {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(this.table));
    } catch {
      /* storage-less context */
    }
  }

  /** Redraw hook for badges/hotbar/menu — fired after any change. */
  onChange(fn: () => void): void {
    this.listeners.add(fn);
  }

  private emit(): void {
    for (const fn of this.listeners) fn();
  }

  kb(id: ActionId): readonly string[] {
    return this.table[id].kb;
  }

  pad(id: ActionId): readonly number[] {
    return this.table[id].pad;
  }

  /** Badge text for the action's first key ('' when unbound). */
  kbBadge(id: ActionId): string {
    const code = this.table[id].kb[0];
    return code ? kbLabel(code) : '';
  }

  /** Glyph chip for the action's first pad button (null when unbound). */
  padBadge(id: ActionId): { cls: string; text: string } | null {
    const btn = this.table[id].pad[0];
    return btn === undefined ? null : padGlyph(btn);
  }

  kbMatches(id: ActionId, code: string): boolean {
    return this.table[id].kb.includes(code);
  }

  /** Any of the action's keys currently in the held-keys set. */
  kbDown(id: ActionId, keys: ReadonlySet<string>): boolean {
    return this.table[id].kb.some((c) => keys.has(c));
  }

  /** Any of the action's pad buttons pressed in a snapshot. */
  padHeld(
    id: ActionId,
    snap: { buttons: readonly { pressed: boolean }[] } | null,
  ): boolean {
    if (!snap) return false;
    return this.table[id].pad.some((b) => snap.buttons[b]?.pressed ?? false);
  }

  /**
   * Bind a key to an action, stealing it from any current owner.
   * Returns the action that lost the key, if one did. Reserved keys
   * (Esc, Enter) are refused — they are the UI's own grammar.
   */
  bindKb(id: ActionId, code: string): { stolenFrom: ActionId | null } | 'reserved' {
    if (RESERVED_KB.has(code)) return 'reserved';
    let stolenFrom: ActionId | null = null;
    for (const a of ACTIONS) {
      if (a.id === id) continue;
      const idx = this.table[a.id].kb.indexOf(code);
      if (idx >= 0) {
        this.table[a.id].kb.splice(idx, 1);
        stolenFrom = a.id;
      }
    }
    this.table[id].kb = [code];
    this.save();
    this.emit();
    return { stolenFrom };
  }

  /** Bind a pad button to an action, stealing it from any owner. */
  bindPad(id: ActionId, btn: number): { stolenFrom: ActionId | null } {
    let stolenFrom: ActionId | null = null;
    for (const a of ACTIONS) {
      if (a.id === id) continue;
      const idx = this.table[a.id].pad.indexOf(btn);
      if (idx >= 0) {
        this.table[a.id].pad.splice(idx, 1);
        stolenFrom = a.id;
      }
    }
    this.table[id].pad = [btn];
    this.save();
    this.emit();
    return { stolenFrom };
  }

  /** True when any binding differs from the shipped layout. */
  isCustomized(): boolean {
    const d = defaultsTable();
    return ACTIONS.some(
      (a) =>
        d[a.id].kb.join('|') !== this.table[a.id].kb.join('|') ||
        d[a.id].pad.join('|') !== this.table[a.id].pad.join('|'),
    );
  }

  /** The standard layout, back exactly. */
  resetAll(): void {
    this.table = defaultsTable();
    try {
      localStorage.removeItem(STORE_KEY);
    } catch {
      /* storage-less context */
    }
    this.emit();
  }
}

/** The game's one bindings table. */
export const bindings = new Bindings();
