import { DUNGEON_TIER_LAWS, RARITY_COLORS, RARITY_TIERS, dungeonModifiers } from '@arx/shared';
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
  fileLore,
  filterKeys,
  filterLore,
  orderKeys,
  orderLore,
  type FiledKey,
  type FiledLore,
  type KeySort,
  type KeyTierFilter,
} from './keyOrder.js';
import { keyForgePrice, sanitizeKeyLabel } from '@arx/shared';

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
  /** Which wing stands open: the ring (keys held) or the ledger (doors known). */
  private wing: 'ring' | 'lore' = 'ring';
  /** The ledger wing's own selection, by seed. */
  private selectedLore: number | null = null;
  /**
   * THE FORGE IS LIT only for the visit the Keywright opened — walking
   * off and reopening the screen asks her again (the server gates the
   * verb by her presence regardless; this is the honest chrome).
   */
  private forgeLit = false;
  /** The margin-note pen, present only while the bench offers it. */
  private renameInput: HTMLInputElement | null = null;

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

    // THE TWO WINGS: the ring (keys held) and the ledger (doors known).
    const wings = document.createElement('div');
    wings.className = 'keyring-wings';
    for (const [id, label] of [
      ['ring', 'The Ring'],
      ['lore', 'The Ledger'],
    ] as const) {
      const chip = document.createElement('button');
      chip.className = 'keyring-wing';
      chip.dataset.wing = id;
      chip.textContent = label;
      chip.dataset.nav = '';
      chip.dataset.navkey = `keywing:${id}`;
      chip.dataset.acta = 'Open';
      chip.addEventListener('click', () => {
        if (this.wing === id) return;
        this.wing = id;
        this.leaf = 0;
        this.render();
      });
      wings.appendChild(chip);
    }
    head.appendChild(wings);

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

    // Ⓨ on a ledger row: inspect, and the forge verb when it is lit.
    registerSheetProvider('lorerow', (el) => {
      const seed = Number(el.dataset.navkey?.slice('lorerow:'.length) ?? 'NaN');
      const r = this.filedLore().find((f) => f.seed === seed);
      if (!r) return [];
      const verbs: SheetVerb[] = [{ label: 'Inspect', act: () => this.inspectLore(seed) }];
      if (this.forgeLit && !r.held) {
        verbs.push({
          label: `Cut again · ${keyForgePrice(r.spec.tier)}c`,
          act: () => this.game.keyForgeSend(seed),
        });
      }
      return verbs;
    });

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

  /** True while the search line or the margin-note pen holds the keyboard. */
  get isTyping(): boolean {
    return (
      document.activeElement === this.searchInput ||
      (this.renameInput !== null && document.activeElement === this.renameInput)
    );
  }

  open(): void {
    this.panel.classList.remove('hidden');
    this.render();
  }

  /** The Keywright's door: the ledger wing raised with the forge lit. */
  openForge(): void {
    this.wing = 'lore';
    this.forgeLit = true;
    this.leaf = 0;
    this.open();
  }

  close(): void {
    this.panel.classList.add('hidden');
    this.confirmDrop = null;
    this.forgeLit = false; // the fire is per-visit
    this.searchInput.blur();
    this.renameInput?.blur();
  }

  /** Ring/ledger-mirror hook: repaint only while the room is open. */
  refresh(): void {
    if (!this.isOpen) return;
    if (this.isTyping) return; // never yank the pen mid-word
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
    this.panel
      .querySelectorAll<HTMLElement>('.keyring-wing')
      .forEach((c) => c.classList.toggle('active', c.dataset.wing === this.wing));
    this.panel.classList.toggle('forge-lit', this.forgeLit);

    if (this.wing === 'lore') {
      this.renderLoreShelf();
      this.renderBench();
      return;
    }

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

  private filedLore(): FiledLore[] {
    return fileLore(this.game.keyLore, new Set(this.game.keyRing.map((k) => k.roll.seed >>> 0)));
  }

  /** The ledger wing's shelf: every door ever held, margin notes first. */
  private renderLoreShelf(): void {
    const all = this.filedLore();
    const shown = orderLore(filterLore(all, this.tier, this.theme, this.search), this.sort);

    if (this.selectedLore === null || !all.some((r) => r.seed === this.selectedLore)) {
      this.selectedLore = shown[0]?.seed ?? all[0]?.seed ?? null;
    }

    this.listHost.innerHTML = '';
    if (all.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'keyring-empty';
      empty.textContent =
        'The ledger is blank — no door held yet. Every key that ever touches your ring writes itself here, and stays written after the key is gone.';
      this.listHost.appendChild(empty);
    } else if (shown.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'keyring-empty';
      empty.textContent = 'No remembered door answers that — loosen the search or the rail.';
      this.listHost.appendChild(empty);
    } else {
      const ledger = createLedger<FiledLore>({
        renderRow: (r) => this.loreRow(r),
        seedRows: 8,
        initialLeaf: this.leaf,
        onLeaf: (leaf) => {
          this.leaf = leaf;
        },
      });
      this.listHost.appendChild(ledger.root);
      ledger.setItems(shown);
    }

    const held = all.filter((r) => r.held).length;
    this.sumLine.textContent =
      all.length === 0
        ? ''
        : `${all.length} door${all.length === 1 ? '' : 's'} known · ${held} on your ring · ${all.length - held} lost to time`;
  }

  private loreRow(r: FiledLore): HTMLElement {
    const tint = RARITY_COLORS[r.spec.tier];
    const row = document.createElement('button');
    row.className = `key-row lore-row${this.selectedLore === r.seed ? ' sel' : ''}${r.held ? '' : ' lost'}`;
    if (tint) row.style.setProperty('--key-tint', tint);
    row.dataset.nav = '';
    row.dataset.navkey = `lorerow:${r.seed}`;
    row.dataset.acta = 'Inspect';
    row.dataset.tipname = r.label ?? `${r.spec.name} (${r.spec.sigil})`;

    row.appendChild(iconTile(itemIconUrl('dungeon_key', 40), 'sm'));

    const mid = document.createElement('div');
    mid.className = 'key-mid';
    const name = document.createElement('div');
    name.className = 'key-name';
    // The margin note leads when the reader has written one — this is
    // THEIR ledger; the world's name drops to the fine print.
    name.textContent = r.label ?? r.spec.name;
    if (tint) name.style.color = tint;
    const sub = document.createElement('div');
    sub.className = 'key-sub';
    const sigil = document.createElement('span');
    sigil.className = 'key-sigil';
    sigil.textContent = r.spec.sigil;
    const tierWord = document.createElement('span');
    tierWord.textContent = r.spec.tier;
    if (tint) tierWord.style.color = tint;
    const themeWord = document.createElement('span');
    themeWord.textContent = r.spec.theme;
    sub.append(sigil, ' · ', tierWord, ' · ', themeWord);
    if (r.label) {
      const trueName = document.createElement('span');
      trueName.className = 'lore-truename';
      trueName.textContent = r.spec.name;
      sub.append(' · ', trueName);
    }
    mid.append(name, sub);
    row.appendChild(mid);

    const right = document.createElement('div');
    right.className = 'key-right';
    const power = document.createElement('div');
    power.className = 'key-power';
    const num = document.createElement('strong');
    num.textContent = String(r.spec.power);
    const lab = document.createElement('span');
    lab.textContent = 'power';
    power.append(num, lab);
    const status = document.createElement('span');
    status.className = `lore-status${r.held ? ' held' : ''}`;
    status.textContent = r.held ? 'on your ring' : 'lost';
    right.append(power, status);
    row.appendChild(right);

    row.addEventListener('click', () => this.inspectLore(r.seed));
    return row;
  }

  /** Light the bench for one remembered door without redealing. */
  inspectLore(seed: number): void {
    if (!this.game.keyLore.some((l) => (l.seed >>> 0) === seed)) return;
    if (this.selectedLore === seed) return;
    this.selectedLore = seed;
    this.listHost.querySelectorAll('.key-row.sel').forEach((r) => r.classList.remove('sel'));
    this.listHost
      .querySelector(`[data-navkey="${CSS.escape(`lorerow:${seed}`)}"]`)
      ?.classList.add('sel');
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
    this.renameInput = null;
    if (this.wing === 'lore') {
      this.renderLoreBench();
      return;
    }
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

    // THE TURNED SEED, told plainly: what this particular cut of the
    // door does differently — the words that make one rare key worth
    // more at market than another.
    const mods = dungeonModifiers(k.spec.seed, k.spec.tier);
    if (mods.length > 0) {
      const turned = document.createElement('div');
      turned.className = 'keybench-mods';
      for (const mod of mods) {
        const line = document.createElement('div');
        line.className = 'keybench-mod';
        const modName = document.createElement('strong');
        modName.textContent = mod.name;
        const modBlurb = document.createElement('span');
        modBlurb.textContent = ` — ${mod.blurb}`;
        line.append(modName, modBlurb);
        turned.appendChild(line);
      }
      this.bench.appendChild(turned);
    }

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

  /** One remembered door's page: the note, the story, and the forge. */
  private renderLoreBench(): void {
    const r = this.filedLore().find((f) => f.seed === this.selectedLore);
    if (!r) {
      const ghost = document.createElement('div');
      ghost.className = 'keyring-bench-ghost';
      ghost.textContent = 'Pick a remembered door to read its page.';
      this.bench.appendChild(ghost);
      return;
    }
    const tint = RARITY_COLORS[r.spec.tier];

    const head = document.createElement('div');
    head.className = 'keybench-head';
    if (tint) head.style.setProperty('--key-tint', tint);
    const seal = document.createElement('div');
    seal.className = `keybench-seal tier-${r.spec.tier}`;
    seal.textContent = tierWord(r.spec.tier);
    const name = document.createElement('div');
    name.className = 'keybench-name';
    name.textContent = r.label ?? r.spec.name;
    if (tint) name.style.color = tint;
    head.append(seal, name);
    if (r.label) {
      const trueName = document.createElement('div');
      trueName.className = 'keybench-sigil';
      trueName.textContent = `${r.spec.name} — the world's own name for it.`;
      head.appendChild(trueName);
    }
    const sigil = document.createElement('div');
    sigil.className = 'keybench-sigil';
    sigil.textContent = `Sigil ${r.spec.sigil} — speak it and any hand knows the door.`;
    head.appendChild(sigil);
    this.bench.appendChild(head);

    const plaques = document.createElement('div');
    plaques.className = 'keybench-stats';
    plaques.appendChild(statPlaque(String(r.spec.power), 'power · suggested level', tint ?? undefined));
    plaques.appendChild(statPlaque(themeWordOf(r.spec.theme), 'the halls', undefined));
    plaques.appendChild(
      statPlaque(String(keyForgePrice(r.spec.tier)), 'to cut again · coins', undefined),
    );
    this.bench.appendChild(plaques);

    // The standing of this door: held, or lost to time.
    const standing = document.createElement('div');
    standing.className = `keybench-ward${r.held ? '' : ' spent'}`;
    const word = document.createElement('span');
    word.className = 'keybench-ward-word';
    word.textContent = r.held
      ? 'A copy of this key hangs on your ring now.'
      : 'The key is gone — crumbled or traded away. The door is still yours to remember.';
    standing.appendChild(word);
    this.bench.appendChild(standing);

    // THE MARGIN NOTE — the reader's own pen, saved on Enter or blur.
    const penRow = document.createElement('div');
    penRow.className = 'keybench-pen';
    const pen = document.createElement('input');
    pen.type = 'text';
    pen.maxLength = 24;
    pen.placeholder = 'Write your own name for it…';
    pen.value = r.label ?? '';
    pen.className = 'keyring-search keybench-pen-line';
    pen.dataset.nav = '';
    pen.dataset.navkey = 'keyring:penline';
    pen.dataset.acta = 'Write';
    const savePen = (): void => {
      const raw = pen.value.trim();
      const current = r.label ?? '';
      if (raw === current) return;
      if (raw !== '' && sanitizeKeyLabel(raw) === null) {
        pen.classList.add('refused');
        window.setTimeout(() => pen.classList.remove('refused'), 600);
        return;
      }
      this.game.keyLabelSend(r.seed, raw === '' ? undefined : raw);
    };
    pen.addEventListener('keydown', (e) => {
      e.stopPropagation(); // nothing leaks to movement/hotkeys
      if (e.key === 'Enter') pen.blur();
      if (e.key === 'Escape') {
        pen.value = r.label ?? '';
        pen.blur();
      }
    });
    pen.addEventListener('blur', savePen);
    this.renameInput = pen;
    penRow.appendChild(pen);
    this.bench.appendChild(penRow);

    // THE FORGE: lit only at the Keywright's bench; elsewhere the page
    // honestly says where the fire is.
    if (this.forgeLit) {
      if (r.held) {
        const teach = document.createElement('div');
        teach.className = 'keybench-teach';
        teach.textContent =
          'The Keywright will not cut a copy — that key still hangs on your ring. The forge is for lost doors.';
        this.bench.appendChild(teach);
      } else {
        const actions = document.createElement('div');
        actions.className = 'keybench-actions';
        actions.appendChild(
          bigButton(`Cut it again — ${keyForgePrice(r.spec.tier)} coins`, 'keyring:forge', () => {
            this.game.keyForgeSend(r.seed);
          }, { acta: 'Forge' }),
        );
        this.bench.appendChild(actions);
        const teach = document.createElement('div');
        teach.className = 'keybench-trade';
        teach.textContent =
          'The re-cut key hangs on your ring whole — a full ward of fresh turns, the same halls to the last stalagmite.';
        this.bench.appendChild(teach);
      }
    } else {
      const teach = document.createElement('div');
      teach.className = 'keybench-teach';
      teach.textContent =
        'Orla the Keywright keeps her bench in Kingsdelf, among the delvers. She can cut any remembered door again — for a price that respects the rock.';
      this.bench.appendChild(teach);
    }
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
