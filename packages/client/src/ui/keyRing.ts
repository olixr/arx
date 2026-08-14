import { DUNGEON_TIER_LAWS, RARITY_COLORS, RARITY_TIERS } from '@arx/shared';
import type { DungeonTheme, RarityTier } from '@arx/shared';
import type { ClientGame } from '../game/clientGame.js';
import { dockGlyphUrl, itemIconUrl } from '../render/icons.js';
import { bigButton, dressPanel, iconTile, statPlaque } from './panel.js';
import { createLedger } from './kit/ledger.js';
import { tabRail } from './kit/tabs.js';
import { registerSheetProvider, type SheetVerb } from './kit/contextSheet.js';
import {
  KEY_SORTS,
  fileKeys,
  filterKeys,
  orderKeys,
  type FiledKey,
  type KeySort,
  type KeyTierFilter,
} from './keyOrder.js';

/**
 * THE KEY RING — every dungeon key, on its own ring (K).
 *
 * Keys left the pack and the bank for good: the ring is uncapped,
 * death-safe, and semantic — a shelf of DOORS, not a bag of things.
 * The screen is built around the question the ring is actually asked:
 * "what can I run?" — so POWER leads the default order, the tier rail
 * walks the ladder, the search line answers the words a player knows
 * a key by (name, sigil, theme, tier), and every row carries THE WORN
 * WARD's pips so a nearly-spent heirloom reads at a glance.
 *
 * Shelf left, bench right (the journal's two-room grammar). The bench
 * tells one key's whole story — seal, sigil, theme, power, worth,
 * turns left — and holds the verbs: turning happens AT A RIFTGATE
 * (the bench says so rather than growing a dead button), dropping is
 * the trade verb, armed-then-confirmed because a key on the ground
 * belongs to whoever lifts it.
 *
 * Everything on this screen derives pure from the ring mirror
 * (dungeonSpecFromRoll / keyUsesLeft) — no second source of truth.
 */
export class KeyRingPanel {
  private readonly panel = document.getElementById('keyring-panel')!;
  private readonly shelf: HTMLElement;
  private readonly bench: HTMLElement;
  private readonly searchInput: HTMLInputElement;
  private readonly listHost: HTMLElement;
  private readonly sumLine: HTMLElement;
  private readonly sortRow: HTMLElement;
  private readonly rail: ReturnType<typeof tabRail>;

  private tier: KeyTierFilter = 'all';
  private theme: DungeonTheme | 'all' = 'all';
  private sort: KeySort;
  private search = '';
  private selected: number | null = null;
  private confirmDrop: number | null = null;
  /** The reader's leaf in the shelf ledger, kept across repaints. */
  private leaf = 0;

  constructor(private readonly game: ClientGame) {
    this.sort = (localStorage.getItem('arx.keysort') as KeySort | null) ?? 'power';
    if (!KEY_SORTS.some(([k]) => k === this.sort)) this.sort = 'power';

    dressPanel(this.panel, {
      icon: itemIconUrl('dungeon_key', 44),
      hint: 'Every rift-cut key you hold, on one ring — power tells you where you can stand.',
      onClose: () => this.close(),
    });

    const main = document.createElement('div');
    main.className = 'keyring-main';

    // THE SHELF — head band (tier rail / search / sort), the dealt
    // list, and the tally foot. Its own pad region.
    this.shelf = document.createElement('div');
    this.shelf.className = 'keyring-shelf';
    this.shelf.dataset.region = '';

    const head = document.createElement('div');
    head.className = 'keyring-head';

    // The tier rail walks the ladder; LB/RB step it (data-tabs).
    this.rail = tabRail(
      [
        { id: 'all', label: 'All' },
        ...RARITY_TIERS.map((t) => ({ id: t, label: tierWord(t) })),
      ],
      (id) => {
        this.tier = id as KeyTierFilter;
        this.leaf = 0;
        this.render();
      },
      'keytier',
    );
    head.appendChild(this.rail.root);

    const line = document.createElement('div');
    line.className = 'keyring-line';

    // The search line: the first thing a trader does with forty keys.
    this.searchInput = document.createElement('input');
    this.searchInput.type = 'text';
    this.searchInput.maxLength = 24;
    this.searchInput.placeholder = 'Name or sigil…';
    this.searchInput.className = 'keyring-search';
    // A pad can land here: Ⓐ takes the pen (a keyboard types), Ⓑ puts it down.
    this.searchInput.dataset.nav = '';
    this.searchInput.dataset.navkey = 'keyring:searchline';
    this.searchInput.dataset.acta = 'Write';
    this.searchInput.addEventListener('keydown', (e) => {
      e.stopPropagation(); // nothing leaks to movement/hotkeys
      if (e.key === 'Enter' || e.key === 'Escape') this.searchInput.blur();
    });
    this.searchInput.addEventListener('input', () => {
      this.search = this.searchInput.value;
      this.leaf = 0;
      this.render();
    });
    line.appendChild(this.searchInput);

    this.sortRow = document.createElement('div');
    this.sortRow.className = 'keyring-sorts';
    line.appendChild(this.sortRow);
    head.appendChild(line);
    this.shelf.appendChild(head);

    this.listHost = document.createElement('div');
    this.listHost.className = 'keyring-list';
    this.shelf.appendChild(this.listHost);

    this.sumLine = document.createElement('div');
    this.sumLine.className = 'keyring-sum';
    this.shelf.appendChild(this.sumLine);

    // THE BENCH — one key's whole story, its own pad region.
    this.bench = document.createElement('div');
    this.bench.className = 'keyring-bench';
    this.bench.dataset.region = '';

    main.append(this.shelf, this.bench);
    this.panel.appendChild(main);

    // Ⓨ on a key row: the sheet offers the same verbs the bench holds.
    registerSheetProvider('keyrow', (el) => {
      const id = Number(el.dataset.keyid ?? 'NaN');
      const k = this.filed().find((f) => f.id === id);
      if (!k) return [];
      const verbs: SheetVerb[] = [
        { label: 'Inspect', act: () => this.inspectKey(id) },
        {
          label: 'Set down',
          danger: true,
          act: () => {
            this.game.keyDropSend(id);
          },
        },
      ];
      return verbs;
    });
  }

  get isOpen(): boolean {
    return !this.panel.classList.contains('hidden');
  }

  /** True while the search line holds the keyboard (gates WASD/hotkeys). */
  get isTyping(): boolean {
    return document.activeElement === this.searchInput;
  }

  open(): void {
    this.panel.classList.remove('hidden');
    this.render();
  }

  close(): void {
    this.panel.classList.add('hidden');
    this.confirmDrop = null;
    this.searchInput.blur();
  }

  /** Ring-mirror hook: repaint only while the room is open. */
  refresh(): void {
    if (!this.isOpen) return;
    this.confirmDrop = null;
    this.render();
  }

  private filed(): FiledKey[] {
    return fileKeys(this.game.keyRing);
  }

  private render(): void {
    // Sort chips re-cut every paint (cheap; the active one moves).
    this.sortRow.innerHTML = '';
    for (const [k, label] of KEY_SORTS) {
      const chip = document.createElement('button');
      chip.className = `sort-chip${this.sort === k ? ' active' : ''}`;
      chip.textContent = label;
      chip.dataset.nav = '';
      chip.dataset.navkey = `keysort:${k}`;
      chip.dataset.acta = 'Sort';
      chip.addEventListener('click', () => {
        this.sort = k;
        localStorage.setItem('arx.keysort', k);
        this.leaf = 0;
        this.render();
      });
      this.sortRow.appendChild(chip);
    }
    this.rail.setActive(this.tier);

    const all = this.filed();
    const shown = orderKeys(filterKeys(all, this.tier, this.theme, this.search), this.sort);

    // A vanished selection (dropped, crumbled) falls to the top row.
    if (this.selected === null || !all.some((k) => k.id === this.selected)) {
      this.selected = shown[0]?.id ?? all[0]?.id ?? null;
    }

    this.listHost.innerHTML = '';
    if (all.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'keyring-empty';
      empty.textContent =
        'The ring hangs empty. The deep places and their keepers drop rift-cut keys — and every one you find clips on here, never in your pack.';
      this.listHost.appendChild(empty);
    } else if (shown.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'keyring-empty';
      empty.textContent = 'No key on the ring answers that — loosen the search or the rail.';
      this.listHost.appendChild(empty);
    } else {
      const ledger = createLedger<FiledKey>({
        renderRow: (k) => this.keyRow(k),
        seedRows: 8,
        initialLeaf: this.leaf,
        onLeaf: (leaf) => {
          this.leaf = leaf;
        },
      });
      this.listHost.appendChild(ledger.root);
      ledger.setItems(shown);
    }

    // The tally foot: the ring told as one line.
    const worth = all.reduce((sum, k) => sum + DUNGEON_TIER_LAWS[k.spec.tier].value, 0);
    const strongest = all.reduce((m, k) => Math.max(m, k.spec.power), 0);
    this.sumLine.textContent =
      all.length === 0
        ? ''
        : `${all.length} key${all.length === 1 ? '' : 's'} · strongest door power ${strongest} · worth ~${worth} coins`;

    this.renderBench();
  }

  private keyRow(k: FiledKey): HTMLElement {
    const tint = RARITY_COLORS[k.spec.tier];
    const row = document.createElement('button');
    row.className = `key-row${this.selected === k.id ? ' sel' : ''}${k.usesLeft <= 0 ? ' spent' : ''}`;
    if (tint) row.style.setProperty('--key-tint', tint);
    row.dataset.nav = '';
    row.dataset.navkey = `keyrow:${k.id}`;
    row.dataset.keyid = String(k.id);
    row.dataset.acta = 'Inspect';
    row.dataset.tipname = `${k.spec.name} (${k.spec.sigil})`;

    row.appendChild(iconTile(itemIconUrl('dungeon_key', 40), 'sm'));

    const mid = document.createElement('div');
    mid.className = 'key-mid';
    const name = document.createElement('div');
    name.className = 'key-name';
    name.textContent = k.spec.name;
    if (tint) name.style.color = tint;
    const sub = document.createElement('div');
    sub.className = 'key-sub';
    const sigil = document.createElement('span');
    sigil.className = 'key-sigil';
    sigil.textContent = k.spec.sigil;
    const tierWord = document.createElement('span');
    tierWord.textContent = k.spec.tier;
    if (tint) tierWord.style.color = tint;
    const themeWord = document.createElement('span');
    themeWord.textContent = k.spec.theme;
    sub.append(sigil, ' · ', tierWord, ' · ', themeWord);
    mid.append(name, sub);
    row.appendChild(mid);

    const right = document.createElement('div');
    right.className = 'key-right';
    const power = document.createElement('div');
    power.className = 'key-power';
    const num = document.createElement('strong');
    num.textContent = String(k.spec.power);
    const lab = document.createElement('span');
    lab.textContent = 'power';
    power.append(num, lab);
    right.append(power, usesPips(k));
    row.appendChild(right);

    row.addEventListener('click', () => this.inspectKey(k.id));
    return row;
  }

  /** Light the bench for one key without redealing the shelf. */
  inspectKey(id: number): void {
    if (!this.game.keyRing.some((k) => k.id === id)) return;
    if (this.selected === id) return;
    this.selected = id;
    this.confirmDrop = null;
    this.listHost.querySelectorAll('.key-row.sel').forEach((r) => r.classList.remove('sel'));
    this.listHost
      .querySelector(`[data-navkey="${CSS.escape(`keyrow:${id}`)}"]`)
      ?.classList.add('sel');
    this.renderBench();
  }

  private renderBench(): void {
    this.bench.innerHTML = '';
    const k = this.filed().find((f) => f.id === this.selected);
    if (!k) {
      const ghost = document.createElement('div');
      ghost.className = 'keyring-bench-ghost';
      ghost.textContent = 'Pick a key to read its door.';
      this.bench.appendChild(ghost);
      return;
    }
    const tint = RARITY_COLORS[k.spec.tier];

    const head = document.createElement('div');
    head.className = 'keybench-head';
    if (tint) head.style.setProperty('--key-tint', tint);
    const seal = document.createElement('div');
    seal.className = `keybench-seal tier-${k.spec.tier}`;
    seal.textContent = tierWord(k.spec.tier);
    const name = document.createElement('div');
    name.className = 'keybench-name';
    name.textContent = k.spec.name;
    if (tint) name.style.color = tint;
    const sigil = document.createElement('div');
    sigil.className = 'keybench-sigil';
    sigil.textContent = `Sigil ${k.spec.sigil} — its trade name; speak it and any hand knows the door.`;
    head.append(seal, name, sigil);
    this.bench.appendChild(head);

    const plaques = document.createElement('div');
    plaques.className = 'keybench-stats';
    plaques.appendChild(statPlaque(String(k.spec.power), 'power · suggested level', tint ?? undefined));
    plaques.appendChild(statPlaque(themeWordOf(k.spec.theme), 'the halls', undefined));
    plaques.appendChild(
      statPlaque(`${DUNGEON_TIER_LAWS[k.spec.tier].value}`, 'worth · coins', undefined),
    );
    this.bench.appendChild(plaques);

    // THE WORN WARD, told plainly.
    const ward = document.createElement('div');
    ward.className = `keybench-ward${k.usesLeft <= 0 ? ' spent' : ''}`;
    ward.appendChild(usesPips(k));
    const word = document.createElement('span');
    word.className = 'keybench-ward-word';
    word.textContent =
      k.usesLeft <= 0
        ? 'Worn through — it will crumble when its last door closes.'
        : k.usesLeft === 1
          ? 'One turn left in the ward. The next cut is its last.'
          : `${k.usesLeft} of ${k.usesMax} turns left in the ward.`;
    ward.appendChild(word);
    this.bench.appendChild(ward);

    // The way it is USED lives at a Riftgate, and the bench says so
    // honestly instead of growing a dead button.
    const teach = document.createElement('div');
    teach.className = 'keybench-teach';
    teach.textContent =
      'Turn it at any Riftgate — the arches are one network. Each fresh cut spends one turn; walking back into a standing run is free.';
    this.bench.appendChild(teach);

    const actions = document.createElement('div');
    actions.className = 'keybench-actions';
    const dropLabel = this.confirmDrop === k.id ? 'Set down, sure?' : 'Set down';
    actions.appendChild(
      bigButton(dropLabel, 'keyring:drop', () => {
        if (this.confirmDrop === k.id) {
          this.confirmDrop = null;
          this.game.keyDropSend(k.id);
        } else {
          this.confirmDrop = k.id;
          this.renderBench();
        }
      }, { acta: 'Set down', minor: true }),
    );
    this.bench.appendChild(actions);

    const trade = document.createElement('div');
    trade.className = 'keybench-trade';
    trade.textContent =
      'A key set down is an ordinary ground item — worn turns ride with it, and whoever lifts it rings it.';
    this.bench.appendChild(trade);
  }
}

/** THE WORN WARD read at a glance: ◆ for turns left, ◇ for spent. */
export function usesPips(k: FiledKey): HTMLElement {
  const pips = document.createElement('div');
  pips.className = 'key-uses';
  pips.title = `${k.usesLeft} of ${k.usesMax} turns left`;
  for (let i = 0; i < k.usesMax; i++) {
    const pip = document.createElement('span');
    pip.className = `key-pip${i < k.usesLeft ? ' lit' : ''}`;
    pip.textContent = i < k.usesLeft ? '◆' : '◇';
    pips.appendChild(pip);
  }
  return pips;
}

function tierWord(t: RarityTier): string {
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function themeWordOf(t: DungeonTheme): string {
  return t.charAt(0).toUpperCase() + t.slice(1);
}
