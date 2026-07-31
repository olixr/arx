import {
  Tile,
  diagWallInfo,
  levelForXp,
  type EquippedItem,
  type EquipSlot,
  type InvSlot,
  type ItemRoll,
  type SkillXp,
  type StationType,
} from '@arx/shared';
import {
  BUILDABLES,
  BUILD_CATEGORIES,
  CROP_BY_SEED,
  buildableGround,
  canUnmake,
  enchantDef,
  inscriptionQuality,
  qualityWord,
  unmakingOf,
  shopDef,
  instanceName,
  itemDef,
  RECIPES,
  recipesForStation,
  type BuildableDef,
  type RecipeDef,
} from '@arx/content';
import { buildableIconUrl, itemIconUrl, uiIconUrl } from '../render/icons.js';
import { bigButton, iconTile, sectionHead } from './panel.js';

/**
 * The station screens: Workshop (craft), Vault (bank), Store (shop)
 * and the Builder's Table. Opened by interacting with the matching
 * world tile; every action is validated server-side — these are views.
 *
 * Design laws:
 * - EVERY STATION HAS A FACE. The Workshop wears the station's own
 *   name, icon, accent color and craft VERB ("Smelt", "Weave") — the
 *   screen tells you where you're standing without reading a word.
 * - LEDGER LEFT, WORK RIGHT. The Workshop is master–detail: a recipe
 *   ledger you run your eye down, and the chosen work laid out large —
 *   portrait, level, xp, the material story in full rows, and the
 *   make buttons. No more squinting at chip strips.
 * - COUNTS ARE LIVE. The pack feeds every have/need figure through
 *   `getInventory`; `refreshOpen` re-renders the open screen whenever
 *   the pack changes. Focus survives re-renders by nav key (pad law).
 * - A world-anchored screen (bank chest, station, shop counter)
 *   belongs to its tile: walk out of reach and it closes itself,
 *   exactly when the server would start refusing its actions.
 */

/** Every crafting station's face: name, icon, accent, and craft verb. */
const STATION_FACE: Record<
  string,
  { label: string; icon: string | null; accent: string; verb: string; hint: string }
> = {
  fire: {
    label: 'Cooking',
    icon: 'trout',
    accent: '#e8944a',
    verb: 'Cook',
    hint: 'The fire is lit. Raw makings come straight from your pack.',
  },
  furnace: {
    label: 'Smelting',
    icon: 'bronze_bar',
    accent: '#ff8a4a',
    verb: 'Smelt',
    hint: 'Ore in, bars out. The furnace does not negotiate.',
  },
  anvil: {
    label: 'Smithing',
    icon: 'bronze_sword',
    accent: '#9aa2ac',
    verb: 'Forge',
    hint: 'Bars become blades here. Bring metal and intent.',
  },
  workbench: {
    label: 'Handiwork',
    icon: null,
    accent: '#d9a441',
    verb: 'Make',
    hint: 'Work that needs only your two hands.',
  },
  alembic: {
    label: 'Herbalism',
    icon: 'sagewort',
    accent: '#7ac4a0',
    verb: 'Brew',
    hint: 'Leaf and root, distilled to their useful truth.',
  },
  tanning_rack: {
    label: 'Leatherworking',
    icon: 'leather',
    accent: '#b08a5c',
    verb: 'Cure',
    hint: 'Hides cure into armor under patient hands.',
  },
  loom: {
    label: 'Tailoring',
    icon: 'cloth',
    accent: '#c9a8e8',
    verb: 'Weave',
    hint: 'Thread crosses thread until it counts as cloth.',
  },
  carving_bench: {
    label: 'Woodworking',
    icon: 'oak_log',
    accent: '#a8794a',
    verb: 'Carve',
    hint: 'Lumber shaped to purpose, one pass at a time.',
  },
  enchanting_table: {
    label: 'Enchanting',
    icon: 'arcane_dust',
    accent: '#b49af0',
    verb: 'Bind',
    hint: 'Power pressed into gear, for good.',
  },
  sawhorse: {
    label: 'Sawing',
    icon: 'board',
    accent: '#c98d4b',
    verb: 'Saw',
    hint: 'One log, three boards. The saw keeps an honest count.',
  },
};

const HANDIWORK_FACE = STATION_FACE.workbench!;

/** The station's face (label, icon, accent, verb) — the work card wears it too. */
export function craftStationFace(station: StationType | null): {
  label: string;
  icon: string | null;
  accent: string;
  verb: string;
  hint: string;
} {
  return (station && STATION_FACE[station]) || HANDIWORK_FACE;
}

export class StationPanels {
  private readonly craftPanel = document.getElementById('craft-panel')!;
  private readonly craftTitle = document.getElementById('craft-title')!;
  private readonly craftTools = document.getElementById('craft-tools')!;
  private readonly craftList = document.getElementById('craft-list')!;
  private readonly craftDetail = document.getElementById('craft-detail')!;
  private readonly bankPanel = document.getElementById('bank-panel')!;
  private readonly bankTools = document.getElementById('bank-tools')!;
  private readonly bankList = document.getElementById('bank-list')!;
  private readonly bankArmory = document.getElementById('bank-armory')!;
  private readonly bankDetail = document.getElementById('bank-detail')!;
  private readonly shopPanel = document.getElementById('shop-panel')!;
  private readonly shopList = document.getElementById('shop-list')!;
  private readonly buildPanel = document.getElementById('build-panel')!;
  private readonly buildTools = document.getElementById('build-tools')!;
  private readonly buildList = document.getElementById('build-list')!;
  private readonly buildDetail = document.getElementById('build-detail')!;
  /** How the Builder's Table ledger is ordered. */
  private buildSort: 'reach' | 'level' | 'az' = 'reach';

  /** dressPanel handles for the Workshop head — set from main. */
  private craftDressHandles: { setHint: (t: string) => void; setIcon: (u: string) => void } | null =
    null;

  private lastBank: Record<string, number> = {};
  /** Rolled gear instances stored in the vault (withdraw by row id). */
  private lastBankGear: Array<{ id: number; item: string; roll: ItemRoll }> = [];
  /** The vault's selected pile — the detail strip's subject. */
  private bankSel: string | null = null;
  /** How the vault wall is ordered. */
  private bankSort: 'az' | 'qty' = 'az';
  /** How the Workshop ledger is ordered. */
  private craftSort: 'reach' | 'level' | 'az' = 'reach';
  /**
   * THE UNMAKING's bench mode. The enchanting table does two opposite
   * jobs — it makes workings and it takes things apart — and they share
   * one screen because they are one trade and they feed each other.
   */
  private craftMode: 'make' | 'unmake' = 'make';
  /** The pack slot the unmaking bench is laying out (-1 = a worn piece). */
  private unmakeSel: number | null = null;
  /** Set when the bench's subject is on the body instead of in the pack. */
  private unmakeWorn: EquipSlot | undefined = undefined;
  /**
   * The slot the player has asked to break and not yet confirmed.
   * Destroying gear is irreversible, so it takes two presses and the
   * second one says what it is about to destroy.
   */
  private unmakeArmed: number | null = null;
  /** World tile center the open panel is bound to (null = untethered). */
  private anchor: { x: number; y: number } | null = null;
  /** Which shop's shelf is on screen — echoed on every buy. */
  private shopId = 'general_store';
  /** What the open maker screen is showing — refreshOpen re-renders it. */
  private showing:
    | { kind: 'craft'; station: StationType | null; skills: SkillXp; known: ReadonlySet<string>; sel: string | null }
    | { kind: 'plant'; tx: number; ty: number; skills: SkillXp; sel: string | null }
    | { kind: 'build'; skills: SkillXp; sel: string | null }
    | null = null;

  constructor(
    private readonly onCraft: (recipe: string, qty: number) => void,
    private readonly onBank: (
      op: 'deposit' | 'withdraw',
      item: string,
      qty: number,
      gearId?: number,
    ) => void,
    private readonly onShop: (op: 'buy' | 'sell', item: string, qty: number, shop?: string) => void,
    private readonly onPickBuildable: (id: string) => void,
    /** THE UNMAKING: break the gear in this pack slot down for dust. */
    private readonly onUnmake: (slot: number) => void = () => {},
    /** SUNDERING: draw the working out of this slot, keep the piece. */
    private readonly onSunder: (
      slot: number,
      worn?: EquipSlot,
      seat?: 'ward' | 'art',
    ) => void = () => {},
    /** The live pack — feeds every have/need figure. */
    private readonly getInventory: () => InvSlot[] = () => [],
    /** The worn kit — the unmaking bench sunders straight off the body. */
    private readonly getEquipment: () => Partial<Record<EquipSlot, EquippedItem>> = () => ({}),
  ) {}
  // Close chips + header dressing come from ui/panel.ts (dressPanel),
  // wired in main — one anatomy for every screen in the game.

  /** Main hands over the Workshop head's dress handles once, at boot. */
  setCraftDress(handles: { setHint: (t: string) => void; setIcon: (u: string) => void }): void {
    this.craftDressHandles = handles;
  }

  get bankOpen(): boolean {
    return !this.bankPanel.classList.contains('hidden');
  }

  get shopOpen(): boolean {
    return !this.shopPanel.classList.contains('hidden');
  }

  get craftOpen(): boolean {
    return !this.craftPanel.classList.contains('hidden');
  }

  get buildOpen(): boolean {
    return !this.buildPanel.classList.contains('hidden');
  }

  get anyOpen(): boolean {
    return (
      this.bankOpen ||
      this.shopOpen ||
      !this.craftPanel.classList.contains('hidden') ||
      !this.buildPanel.classList.contains('hidden')
    );
  }

  /**
   * The open panel's anchor tile — the station being talked to. The
   * renderer heats that station's interaction choreography off this
   * (chest lid open, furnace stoked) for exactly as long as the
   * conversation lasts.
   */
  get anchorTile(): { tx: number; ty: number } | null {
    if (!this.anchor || !this.anyOpen) return null;
    return { tx: Math.floor(this.anchor.x), ty: Math.floor(this.anchor.y) };
  }

  closeAll(): void {
    this.craftPanel.classList.add('hidden');
    this.bankPanel.classList.add('hidden');
    this.shopPanel.classList.add('hidden');
    this.buildPanel.classList.add('hidden');
    this.anchor = null;
    this.showing = null;
    this.bankSel = null;
  }

  /**
   * Called every frame with the player's position: an anchored panel
   * closes once its station is out of reach (a little past the 2.2
   * interaction radius, so standing at the edge doesn't flicker it).
   */
  enforceAnchor(px: number, py: number): void {
    if (!this.anchor || !this.anyOpen) return;
    const dx = this.anchor.x - px;
    const dy = this.anchor.y - py;
    if (dx * dx + dy * dy > 3 * 3) this.closeAll();
  }

  /** The pack changed — keep the open maker screen's figures honest. */
  refreshOpen(): void {
    if (!this.showing) return;
    if (this.showing.kind === 'craft') this.renderCraft();
    else if (this.showing.kind === 'plant') this.renderPlant();
    else this.renderBuild();
  }

  /** Total of an item across the pack — the "have" in have/need. */
  private countOf(item: string): number {
    let n = 0;
    for (const slot of this.getInventory()) {
      if (slot && slot.item === item) n += slot.qty;
    }
    return n;
  }

  // ------------------------------------------------------------ build

  openBuild(skills: SkillXp, sel: string | null = null): void {
    this.closeAll();
    this.showing = { kind: 'build', skills, sel };
    this.renderBuild();
    this.buildPanel.classList.remove('hidden');
  }

  /** How many of a buildable the pack covers right now. */
  private placeable(def: BuildableDef): number {
    if (def.materials.length === 0) return 99;
    let n = Infinity;
    for (const m of def.materials) n = Math.min(n, Math.floor(this.countOf(m.item) / m.qty));
    return Number.isFinite(n) ? n : 0;
  }

  /** The footing rule in world-words — where a piece agrees to stand. */
  private footingWords(def: BuildableDef): string {
    const ground = buildableGround(def);
    const outdoor = ground.includes(Tile.Grass);
    const floors = ground.includes(Tile.WoodFloor);
    if (outdoor && floors) return 'open ground, or a laid floor';
    if (floors) return 'a laid floor';
    return 'open ground — grass, dirt, or sand';
  }

  /**
   * The Builder's Table on the Workshop anatomy (LEDGER LEFT, WORK
   * RIGHT): blueprints shelved by category with an in-reach sort, and
   * the chosen piece laid out large — costs against the pack, build
   * time, footing in world-words, the dial note for corners, and one
   * Place button. Locked plans stay visible; ambition needs a map.
   */
  private renderBuild(): void {
    if (this.showing?.kind !== 'build') return;
    const showing = this.showing;
    const { skills } = showing;
    this.buildList.innerHTML = '';
    this.buildDetail.innerHTML = '';

    const defs = [...BUILDABLES.values()];
    const levelOf = (d: BuildableDef): number => levelForXp(skills[d.skill ?? 'construction'] ?? 0);
    const lockedOf = (d: BuildableDef): boolean => levelOf(d) < d.levelReq;
    if (!showing.sel || !BUILDABLES.has(showing.sel)) {
      const canDo = defs.find((d) => !lockedOf(d) && this.placeable(d) > 0);
      const unlocked = defs.find((d) => !lockedOf(d));
      showing.sel = (canDo ?? unlocked ?? defs[0]!).id;
    }

    this.sortBar(
      this.buildTools,
      'build',
      [
        ['reach', 'In reach'],
        ['level', 'By level'],
        ['az', 'A–Z'],
      ],
      this.buildSort,
      (k) => {
        this.buildSort = k;
        this.renderBuild();
      },
    );
    const reachScore = (d: BuildableDef): number =>
      (lockedOf(d) ? 0 : 2) + (!lockedOf(d) && this.placeable(d) > 0 ? 1 : 0);
    const ordered = (list: BuildableDef[]): BuildableDef[] => {
      const rows = [...list];
      if (this.buildSort === 'az') rows.sort((a, b) => a.name.localeCompare(b.name));
      else if (this.buildSort === 'level')
        rows.sort((a, b) => a.levelReq - b.levelReq || a.name.localeCompare(b.name));
      else
        rows.sort(
          (a, b) =>
            reachScore(b) - reachScore(a) ||
            a.levelReq - b.levelReq ||
            a.name.localeCompare(b.name),
        );
      return rows;
    };

    // The shelves: every category in its fixed order, each sorted
    // the player's way inside.
    for (const cat of BUILD_CATEGORIES) {
      const shelf = defs.filter((d) => d.cat === cat.id);
      if (shelf.length === 0) continue;
      const head = document.createElement('div');
      head.className = 'build-shelf';
      head.textContent = cat.label;
      this.buildList.appendChild(head);
      for (const def of ordered(shelf)) {
        const locked = lockedOf(def);
        const count = this.placeable(def);
        this.buildList.appendChild(
          this.ledgerRow({
            key: `plan:${def.id}`,
            iconUrl: buildableIconUrl(def.id, 40) ?? itemIconUrl('log', 40),
            name: def.name,
            note: locked ? `lvl ${def.levelReq}` : count > 0 ? `× ${count}` : 'short',
            noteTone: locked ? 'lock' : count > 0 ? 'ok' : 'short',
            selected: showing.sel === def.id,
            onPick: () => {
              showing.sel = def.id;
              this.renderBuild();
            },
          }),
        );
      }
    }

    // ---- the chosen plan, laid out large
    const def = BUILDABLES.get(showing.sel)!;
    const skill = def.skill ?? 'construction';
    const level = levelOf(def);
    const locked = lockedOf(def);
    const count = this.placeable(def);
    const turnable = diagWallInfo(def.tile) !== null || def.tile === Tile.FenceDiagNE;

    const head = document.createElement('div');
    head.className = 'work-head';
    head.appendChild(iconTile(buildableIconUrl(def.id, 64) ?? itemIconUrl('log', 64)));
    const titles = document.createElement('div');
    const name = document.createElement('div');
    name.className = 'work-name';
    name.textContent = def.name;
    const sub = document.createElement('div');
    sub.className = 'work-sub';
    sub.textContent = `${skill} · level ${def.levelReq} · +${def.xp} xp`;
    titles.append(name, sub);
    head.appendChild(titles);
    this.buildDetail.appendChild(head);

    const facts = document.createElement('div');
    facts.className = 'work-facts';
    const fact = (value: string, label: string, tone?: string): void => {
      const f = document.createElement('div');
      f.className = 'work-fact';
      const v = document.createElement('strong');
      v.textContent = value;
      if (tone) v.style.color = tone;
      const l = document.createElement('span');
      l.textContent = label;
      f.append(v, l);
      facts.appendChild(f);
    };
    fact(
      locked ? '—' : `× ${count}`,
      'you can place',
      locked ? undefined : count > 0 ? 'var(--green)' : 'var(--red-soft)',
    );
    fact(`${level}`, `your ${skill}`, locked ? 'var(--red-soft)' : undefined);
    fact(`${(def.ticks / 20).toFixed(1)}s`, 'to raise');
    this.buildDetail.appendChild(facts);

    if (def.materials.length > 0) {
      this.buildDetail.appendChild(sectionHead('Materials'));
      for (const m of def.materials) {
        this.buildDetail.appendChild(this.materialRow(m.item, m.qty));
      }
    }

    this.buildDetail.appendChild(sectionHead('Where it stands'));
    const footing = document.createElement('div');
    footing.className = 'work-result';
    const footLine = document.createElement('div');
    footLine.className = 'work-result-facts';
    footLine.textContent = `Wants ${this.footingWords(def)}.`;
    footing.appendChild(footLine);
    if (turnable) {
      const turnLine = document.createElement('div');
      turnLine.className = 'work-result-flavor';
      turnLine.textContent =
        'A corner piece: it reads its neighbours on its own, or turns under the wheel while you aim.';
      footing.appendChild(turnLine);
    }
    this.buildDetail.appendChild(footing);

    const actions = document.createElement('div');
    actions.className = 'work-actions';
    if (locked) {
      const lockNote = document.createElement('span');
      lockNote.className = 'lock-note';
      lockNote.textContent = `Reach ${skill} ${def.levelReq} to place this`;
      actions.appendChild(lockNote);
    } else {
      const btn = bigButton('Place', `build:${def.id}`, () => this.onPickBuildable(def.id), {
        acta: 'Place',
      });
      if (count === 0 && def.materials.length > 0) btn.disabled = true;
      actions.appendChild(btn);
    }
    this.buildDetail.appendChild(actions);
  }

  // ------------------------------------------------------------ plant

  /** Set by main: sends the plant intent for a chosen seed. */
  onPlant: ((tx: number, ty: number, seed: string) => void) | null = null;

  /** Seed picker for a tilled plot: lists the seeds you carry. */
  openPlant(
    tx: number,
    ty: number,
    inventory: InvSlot[],
    skills: SkillXp,
    at?: { tx: number; ty: number },
  ): void {
    void inventory; // counts come live from getInventory now
    this.closeAll();
    this.anchor = at ? { x: at.tx + 0.5, y: at.ty + 0.5 } : { x: tx + 0.5, y: ty + 0.5 };
    this.showing = { kind: 'plant', tx, ty, skills, sel: null };
    this.dressCraft('Planting', itemIconUrl('carrot', 34), '#7ac46a',
      'The furrow is cut — choose what grows in it.');
    this.renderPlant();
    this.craftPanel.classList.remove('hidden');
  }

  /** Dress the Workshop head for whoever owns it right now. */
  private dressCraft(title: string, iconUrl: string, accent: string, hint: string): void {
    this.craftTitle.textContent = title;
    this.craftPanel.style.setProperty('--screen-accent', accent);
    this.craftDressHandles?.setIcon(iconUrl);
    this.craftDressHandles?.setHint(hint);
  }

  /**
   * A row of sort chips — the ordering controls every list screen
   * shares. Chips are pad stops; the active one wears the gold.
   */
  private sortBar<K extends string>(
    host: HTMLElement,
    scope: string,
    options: Array<[K, string]>,
    current: K,
    onPick: (key: K) => void,
    /**
     * `label` renames the row (the enchanting table's bench switch is
     * not a sort). `keep` appends instead of replacing, so two rows can
     * share one tool strip — without it the second call silently wipes
     * the first, which is exactly the bug the bench mode hit.
     */
    opts: { label?: string; keep?: boolean } = {},
  ): void {
    if (!opts.keep) host.innerHTML = '';
    const row = document.createElement('div');
    row.className = 'sort-row';
    const label = document.createElement('span');
    label.className = 'sort-label';
    label.textContent = opts.label ?? 'Sort';
    row.appendChild(label);
    for (const [key, text] of options) {
      const chip = document.createElement('button');
      chip.className = 'sort-chip' + (key === current ? ' active' : '');
      chip.textContent = text;
      chip.dataset.nav = '';
      chip.dataset.navkey = `sort:${scope}:${key}`;
      chip.dataset.acta = 'Sort';
      chip.addEventListener('click', () => onPick(key));
      row.appendChild(chip);
    }
    host.appendChild(row);
  }

  /** One ledger row (Workshop master list). */
  private ledgerRow(opts: {
    key: string;
    iconUrl: string;
    name: string;
    note: string;
    noteTone?: 'ok' | 'short' | 'lock';
    selected: boolean;
    onPick: () => void;
  }): HTMLElement {
    const row = document.createElement('div');
    row.className = 'ledger-row' + (opts.selected ? ' selected' : '');
    row.dataset.nav = '';
    row.dataset.navkey = opts.key;
    row.dataset.acta = 'View';
    const img = document.createElement('img');
    img.src = opts.iconUrl;
    img.draggable = false;
    const name = document.createElement('span');
    name.className = 'ledger-name';
    name.textContent = opts.name;
    const note = document.createElement('span');
    note.className = `ledger-note ${opts.noteTone ?? ''}`.trim();
    note.textContent = opts.note;
    row.append(img, name, note);
    row.addEventListener('click', opts.onPick);
    return row;
  }

  /** One material row in the Workshop detail: the full story of a need. */
  private materialRow(item: string, need: number): HTMLElement {
    const have = this.countOf(item);
    const def = itemDef(item);
    const row = document.createElement('div');
    row.className = 'mat-row' + (have >= need ? ' ok' : ' short');
    const img = document.createElement('img');
    img.src = itemIconUrl(item, 36);
    img.draggable = false;
    const name = document.createElement('span');
    name.className = 'mat-name';
    name.textContent = def?.name ?? item;
    const count = document.createElement('span');
    count.className = 'mat-count';
    count.textContent = `${Math.min(have, 9999).toLocaleString()} / ${need}`;
    row.append(img, name, count);
    return row;
  }

  private renderPlant(): void {
    if (this.showing?.kind !== 'plant') return;
    const showing = this.showing;
    const { tx, ty, skills } = showing;
    this.craftTools.innerHTML = ''; // a seed pouch needs no sorting
    this.craftList.innerHTML = '';
    this.craftDetail.innerHTML = '';
    const level = levelForXp(skills.farming ?? 0);

    // Tally the seed pouches in the pack.
    const held = new Map<string, number>();
    for (const slot of this.getInventory()) {
      if (slot && CROP_BY_SEED.has(slot.item)) {
        held.set(slot.item, (held.get(slot.item) ?? 0) + slot.qty);
      }
    }
    if (held.size === 0) {
      const empty = document.createElement('div');
      empty.className = 'make-empty';
      empty.textContent = 'No seeds in your pack — buy some at the shop, or forage wild herbs.';
      this.craftList.appendChild(empty);
      return;
    }
    const seeds = [...held.keys()];
    if (!showing.sel || !held.has(showing.sel)) showing.sel = seeds[0]!;

    for (const seed of seeds) {
      const crop = CROP_BY_SEED.get(seed)!;
      const locked = level < crop.levelReq;
      this.craftList.appendChild(
        this.ledgerRow({
          key: `plantrow:${seed}`,
          iconUrl: itemIconUrl(seed, 40),
          name: crop.name,
          note: locked ? `lvl ${crop.levelReq}` : `× ${held.get(seed)!.toLocaleString()}`,
          noteTone: locked ? 'lock' : 'ok',
          selected: showing.sel === seed,
          onPick: () => {
            showing.sel = seed;
            this.renderPlant();
          },
        }),
      );
    }

    // The chosen seed, laid out large.
    const seed = showing.sel;
    const crop = CROP_BY_SEED.get(seed)!;
    const locked = level < crop.levelReq;
    const head = document.createElement('div');
    head.className = 'work-head';
    head.appendChild(iconTile(itemIconUrl(seed, 64)));
    const titles = document.createElement('div');
    const name = document.createElement('div');
    name.className = 'work-name';
    name.textContent = crop.name;
    const sub = document.createElement('div');
    sub.className = 'work-sub';
    sub.textContent = `farming · level ${crop.levelReq}`;
    titles.append(name, sub);
    head.appendChild(titles);
    this.craftDetail.appendChild(head);

    const facts = document.createElement('div');
    facts.className = 'work-facts';
    const fact = (label: string, value: string): void => {
      const f = document.createElement('div');
      f.className = 'work-fact';
      f.innerHTML = '';
      const v = document.createElement('strong');
      v.textContent = value;
      const l = document.createElement('span');
      l.textContent = label;
      f.append(v, l);
      facts.appendChild(f);
    };
    fact('to grow', `~${crop.growMinutes} min`);
    fact('seeds held', held.get(seed)!.toLocaleString());
    this.craftDetail.appendChild(facts);

    this.craftDetail.appendChild(sectionHead('In the furrow'));
    this.craftDetail.appendChild(this.materialRow(seed, 1));

    const actions = document.createElement('div');
    actions.className = 'work-actions';
    if (locked) {
      const lockNote = document.createElement('span');
      lockNote.className = 'lock-note';
      lockNote.textContent = `Reach farming ${crop.levelReq} to plant this`;
      actions.appendChild(lockNote);
    } else {
      actions.appendChild(
        bigButton('Plant', `plant:${seed}`, () => {
          this.onPlant?.(tx, ty, seed);
          this.closeAll();
        }),
      );
    }
    this.craftDetail.appendChild(actions);
  }

  // ------------------------------------------------------------ craft

  /** Set by main: stops the running craft batch (the busy strip's Stop). */
  onCraftStop: (() => void) | null = null;

  /** Set by main: the live running action — feeds the busy strip. */
  getAction: () => { recipe?: string; made?: number; total?: number } | null = () => null;

  openCraft(
    station: StationType | null,
    skills: SkillXp,
    known: ReadonlySet<string>,
    at?: { tx: number; ty: number },
  ): void {
    this.closeAll();
    if (at) this.anchor = { x: at.tx + 0.5, y: at.ty + 0.5 };
    this.showing = { kind: 'craft', station, skills, known, sel: null };
    const face = (station && STATION_FACE[station]) || HANDIWORK_FACE;
    this.dressCraft(
      face.label,
      face.icon ? itemIconUrl(face.icon, 34) : uiIconUrl('hammer', 34),
      face.accent,
      face.hint,
    );
    this.renderCraft();
    this.craftPanel.classList.remove('hidden');
  }

  /** How many of a recipe the pack can cover right now. */
  private makeable(recipe: RecipeDef): number {
    let n = Infinity;
    for (const input of recipe.inputs) {
      n = Math.min(n, Math.floor(this.countOf(input.item) / input.qty));
    }
    return Number.isFinite(n) ? n : 0;
  }

  /**
   * The Workshop: recipe ledger on the left — each row telling you at
   * a glance whether it's within reach — and the chosen work laid out
   * large on the right with the full material story and make buttons.
   */
  /** The enchanting table's two jobs, as one pair of chips. */
  private modeBar(): void {
    this.sortBar(
      this.craftTools,
      'craftmode',
      [
        ['make', 'Inscribe'],
        ['unmake', 'Unmake'],
      ],
      this.craftMode,
      (k) => {
        this.craftMode = k as 'make' | 'unmake';
        this.unmakeArmed = null;
        this.renderCraft();
      },
      { label: 'Bench' },
    );
  }

  /**
   * THE UNMAKING bench: the pack, filtered to what has Arx in it, and
   * an honest account of what each piece comes apart into.
   *
   * The yield is computed by the SAME pure function the server pays
   * out from, so the preview and the payout can never disagree. On a
   * destructive action that would be the worst bug in the system.
   */
  private renderUnmake(skills: SkillXp): void {
    const inv = this.getInventory();
    const rows: Array<{
      slot: number;
      item: string;
      roll?: ItemRoll;
      stolen?: true;
      /** Set when the piece is on the body rather than in the pack. */
      worn?: EquipSlot;
    }> = [];
    inv.forEach((s, i) => {
      if (s && canUnmake(s.item)) rows.push({ slot: i, item: s.item, roll: s.roll, stolen: s.stolen });
    });
    // Worn pieces that carry a working are listed too, so a player who
    // wants to change a school does not have to guess that the bench
    // only sees their pack. They can be SUNDERED but never unmade: a
    // Destroy button aimed at the armor you are wearing is a footgun,
    // not a feature.
    for (const [wslot, w] of Object.entries(this.getEquipment())) {
      if (w?.roll?.ench || w?.roll?.ench2) {
        rows.push({ slot: -1, item: w.id, roll: w.roll, worn: wslot as EquipSlot });
      }
    }

    if (rows.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'make-empty';
      empty.textContent =
        'Nothing in your pack has Arx to recover. Worn-out armor and weapons come apart here.';
      this.craftList.appendChild(empty);
      return;
    }
    if (
      this.unmakeSel === null ||
      !rows.some((r) => (r.worn ? -1 : r.slot) === this.unmakeSel && r.worn === this.unmakeWorn)
    ) {
      this.unmakeSel = rows[0]!.worn ? -1 : rows[0]!.slot;
      this.unmakeWorn = rows[0]!.worn;
    }

    for (const row of rows) {
      const result = unmakingOf(row.item, row.roll);
      const dust = result?.yields.find((y) => y.item === 'arcane_dust')?.qty ?? 0;
      this.craftList.appendChild(
        this.ledgerRow({
          key: `unmake:${row.worn ?? row.slot}`,
          iconUrl: itemIconUrl(row.item, 40),
          name: instanceName(row.item, row.roll),
          note: row.worn
            ? 'worn'
            : row.stolen
              ? 'hot'
              : row.roll?.deep
                ? 'deepened'
                : enchantDef(row.roll?.ench)
                  ? 'worked'
                  : `${dust} dust`,
          noteTone: row.stolen ? 'lock' : 'ok',
          selected: this.unmakeSel === (row.worn ? -1 : row.slot) && this.unmakeWorn === row.worn,
          onPick: () => {
            this.unmakeSel = row.worn ? -1 : row.slot;
            this.unmakeWorn = row.worn;
            this.unmakeArmed = null;
            this.renderCraft();
          },
        }),
      );
    }

    const picked = rows.find(
      (r) => (r.worn ? -1 : r.slot) === this.unmakeSel && r.worn === this.unmakeWorn,
    )!;
    const result = unmakingOf(picked.item, picked.roll);
    if (!result) return;
    const pickedName = instanceName(picked.item, picked.roll);

    const head = document.createElement('div');
    head.className = 'work-head';
    head.appendChild(iconTile(itemIconUrl(picked.item, 64)));
    const titles = document.createElement('div');
    const name = document.createElement('div');
    name.className = 'work-name';
    name.textContent = pickedName;
    const sub = document.createElement('div');
    sub.className = 'work-sub';
    sub.textContent = `enchanting · +${result.xp} xp`;
    titles.append(name, sub);
    head.appendChild(titles);
    this.craftDetail.appendChild(head);

    const facts = document.createElement('div');
    facts.className = 'work-facts';
    const fact = (value: string, label: string, tone?: string): void => {
      const f = document.createElement('div');
      f.className = 'work-fact';
      const v = document.createElement('strong');
      v.textContent = value;
      if (tone) v.style.color = tone;
      const l = document.createElement('span');
      l.textContent = label;
      f.append(v, l);
      facts.appendChild(f);
    };
    fact(`${levelForXp(skills.enchanting ?? 0)}`, 'your enchanting');
    fact(`+${result.xp}`, 'xp for the work');
    this.craftDetail.appendChild(facts);

    this.craftDetail.appendChild(sectionHead('What comes out'));
    for (const y of result.yields) {
      this.craftDetail.appendChild(this.materialRow(y.item, y.qty));
    }

    const warn = document.createElement('div');
    warn.className = 'work-result';
    const flavor = document.createElement('div');
    flavor.className = 'work-result-flavor';
    flavor.textContent = picked.stolen
      ? 'This one is stolen. No honest bench will take it apart for you.'
      : 'The piece is destroyed. Whatever is bound into it comes back as dust; the rest is gone.';
    warn.appendChild(flavor);
    this.craftDetail.appendChild(warn);

    // SUNDERING is offered first and framed as the gentler answer: most
    // players opening this bench with an enchanted piece want the
    // working gone, not the piece gone.
    const ward = enchantDef(picked.roll?.ench);
    const art = enchantDef(picked.roll?.ench2);
    if (ward || art) {
      this.craftDetail.appendChild(sectionHead('Or draw a working out'));
      const note = document.createElement('div');
      note.className = 'work-result';
      const nf = document.createElement('div');
      nf.className = 'work-result-flavor';
      nf.textContent = art
        ? 'Sundering strips one working and leaves the piece whole. The opened seat stays open, so a sundered art can be replaced without another sigil.'
        : `Sundering strips the ${ward!.name} and leaves the piece whole. Bare steel takes the next working cleanly; worked steel of another school fights it.`;
      note.appendChild(nf);
      this.craftDetail.appendChild(note);
      const sunderRow = document.createElement('div');
      sunderRow.className = 'work-actions';
      // A deepened piece names its seats, because which one you are
      // about to lose is the only thing that matters here.
      if (ward) {
        sunderRow.appendChild(
          bigButton(
            art ? `Sunder ward (${ward.name})` : 'Sunder',
            `sunder:ward:${picked.worn ?? picked.slot}`,
            () => this.onSunder(picked.slot, picked.worn, 'ward'),
            { minor: true, acta: 'Sunder' },
          ),
        );
      }
      if (art) {
        sunderRow.appendChild(
          bigButton(
            `Sunder art (${art.name})`,
            `sunder:art:${picked.worn ?? picked.slot}`,
            () => this.onSunder(picked.slot, picked.worn, 'art'),
            { minor: true, acta: 'Sunder' },
          ),
        );
      }
      this.craftDetail.appendChild(sunderRow);
    }

    // A worn piece is offered for sundering and nothing else. A Destroy
    // button aimed at the armor you are currently wearing is a footgun.
    if (picked.worn) return;

    const actions = document.createElement('div');
    actions.className = 'work-actions';
    if (picked.stolen) {
      const no = bigButton('Cannot unmake', `unmake:${picked.slot}`, () => {}, { minor: true });
      no.disabled = true;
      actions.appendChild(no);
    } else if (this.unmakeArmed === picked.slot) {
      // THE SECOND PRESS NAMES ITS VICTIM. One click between a player
      // and a destroyed legendary is not a bench, it is a trap, and the
      // confirm has to say WHICH piece or it protects nobody.
      actions.append(
        bigButton(`Destroy ${pickedName}`, `unmake:${picked.slot}`, () => {
          this.unmakeArmed = null;
          this.onUnmake(picked.slot);
        }, { acta: 'Destroy' }),
        bigButton('Keep it', `unmake:cancel`, () => {
          this.unmakeArmed = null;
          this.renderCraft();
        }, { minor: true, acta: 'Cancel' }),
      );
    } else {
      actions.appendChild(
        bigButton('Unmake', `unmake:${picked.slot}`, () => {
          this.unmakeArmed = picked.slot;
          this.renderCraft();
        }, { acta: 'Unmake' }),
      );
    }
    this.craftDetail.appendChild(actions);
  }

  private renderCraft(): void {
    if (this.showing?.kind !== 'craft') return;
    const showing = this.showing;
    const { station, skills, known } = showing;
    const face = (station && STATION_FACE[station]) || HANDIWORK_FACE;
    this.craftList.innerHTML = '';
    this.craftDetail.innerHTML = '';
    // THE UNMAKING lives only at the enchanting table, and the bench
    // remembers nothing between visits: a mode that persisted would
    // eventually greet somebody with a wall of their own gear and a
    // Break button, which is not what anyone opens a table for.
    const canUnmakeHere = station === 'enchanting_table';
    if (!canUnmakeHere) this.craftMode = 'make';
    if (canUnmakeHere) {
      this.modeBar();
      if (this.craftMode === 'unmake') {
        this.renderUnmake(skills);
        return;
      }
    }
    // The ledger lists only what this character KNOWS: core recipes
    // plus learned scrolls. What's undiscovered stays a rumor — a
    // count in the footer, never an endless list of futures.
    const all = recipesForStation(station);
    const recipes = all.filter((r) => r.unlock === 'core' || known.has(r.id));
    const undiscovered = all.length - recipes.length;
    if (recipes.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'make-empty';
      empty.textContent =
        undiscovered > 0
          ? `You know no recipes for this station yet — ${undiscovered} await discovery.`
          : 'Nothing can be made here yet.';
      this.craftList.appendChild(empty);
      return;
    }
    if (!showing.sel || !recipes.some((r) => r.id === showing.sel)) {
      // First choice: the first recipe you can actually make right
      // now; failing that, the first you have the level for.
      const canDo = recipes.find(
        (r) => levelForXp(skills[r.skill] ?? 0) >= r.levelReq && this.makeable(r) > 0,
      );
      const unlocked = recipes.find((r) => levelForXp(skills[r.skill] ?? 0) >= r.levelReq);
      showing.sel = (canDo ?? unlocked ?? recipes[0]!).id;
    }

    // The ledger's order is the player's to choose.
    this.sortBar(
      this.craftTools,
      'craft',
      [
        ['reach', 'In reach'],
        ['level', 'By level'],
        ['az', 'A–Z'],
      ],
      this.craftSort,
      (k) => {
        this.craftSort = k;
        this.renderCraft();
      },
      { keep: station === 'enchanting_table' },
    );
    const reachScore = (r: RecipeDef): number => {
      const unlocked = levelForXp(skills[r.skill] ?? 0) >= r.levelReq;
      return (unlocked ? 2 : 0) + (unlocked && this.makeable(r) > 0 ? 1 : 0);
    };
    const rows = [...recipes];
    if (this.craftSort === 'az') rows.sort((a, b) => a.name.localeCompare(b.name));
    else if (this.craftSort === 'level')
      rows.sort((a, b) => a.levelReq - b.levelReq || a.name.localeCompare(b.name));
    else rows.sort((a, b) => reachScore(b) - reachScore(a));

    for (const recipe of rows) {
      const level = levelForXp(skills[recipe.skill] ?? 0);
      const locked = level < recipe.levelReq;
      const count = this.makeable(recipe);
      this.craftList.appendChild(
        this.ledgerRow({
          key: `recipe:${recipe.id}`,
          iconUrl: itemIconUrl(recipe.output.item, 40),
          name: recipe.name,
          note: locked ? `lvl ${recipe.levelReq}` : count > 0 ? `× ${count}` : 'short',
          noteTone: locked ? 'lock' : count > 0 ? 'ok' : 'short',
          selected: showing.sel === recipe.id,
          onPick: () => {
            showing.sel = recipe.id;
            this.renderCraft();
          },
        }),
      );
    }

    // The rumor line: how much this station still keeps from you.
    if (undiscovered > 0) {
      const hint = document.createElement('div');
      hint.className = 'make-undiscovered';
      hint.textContent = `${undiscovered} more ${undiscovered === 1 ? 'recipe waits' : 'recipes wait'} to be discovered — trainers sell some, the wilds hide the rest.`;
      this.craftList.appendChild(hint);
    }

    // ---- the chosen work, laid out large
    const recipe = recipes.find((r) => r.id === showing.sel)!;
    const level = levelForXp(skills[recipe.skill] ?? 0);
    const locked = level < recipe.levelReq;
    const count = this.makeable(recipe);
    const outIsInscription = itemDef(recipe.output.item)?.enchant !== undefined;

    const head = document.createElement('div');
    head.className = 'work-head';
    const tile = iconTile(itemIconUrl(recipe.output.item, 64));
    if (recipe.output.qty > 1) {
      const q = document.createElement('span');
      q.className = 'out-qty';
      q.textContent = `×${recipe.output.qty}`;
      tile.appendChild(q);
    }
    head.appendChild(tile);
    const titles = document.createElement('div');
    const name = document.createElement('div');
    name.className = 'work-name';
    name.textContent = recipe.name;
    const sub = document.createElement('div');
    sub.className = 'work-sub';
    sub.textContent = `${recipe.skill} · level ${recipe.levelReq} · +${recipe.xp} xp each`;
    titles.append(name, sub);
    head.appendChild(titles);
    this.craftDetail.appendChild(head);

    const facts = document.createElement('div');
    facts.className = 'work-facts';
    const fact = (value: string, label: string, tone?: string): void => {
      const f = document.createElement('div');
      f.className = 'work-fact';
      const v = document.createElement('strong');
      v.textContent = value;
      if (tone) v.style.color = tone;
      const l = document.createElement('span');
      l.textContent = label;
      f.append(v, l);
      facts.appendChild(f);
    };
    fact(locked ? '—' : `× ${count}`, 'you can make', locked ? undefined : count > 0 ? 'var(--green)' : 'var(--red-soft)');
    fact(`${level}`, `your ${recipe.skill}`, locked ? 'var(--red-soft)' : undefined);
    if (recipe.output.qty > 1) fact(`× ${recipe.output.qty}`, 'per make');
    // THE ENCHANTER'S HAND: an inscription carries the mark of the hand
    // that made it, so the bench says what YOUR hand will make before
    // you spend the reagents. Shown without the Calling bonus, which
    // the panel cannot see — so the figure is a floor, never a promise
    // the craft then fails to keep.
    if (!locked && outIsInscription) {
      const q = inscriptionQuality(level, recipe.levelReq);
      fact(`${q}%`, `a ${qualityWord(q)} inscription`, q >= 105 ? 'var(--green)' : undefined);
    }
    this.craftDetail.appendChild(facts);

    this.craftDetail.appendChild(sectionHead('Materials'));
    for (const input of recipe.inputs) {
      this.craftDetail.appendChild(this.materialRow(input.item, input.qty));
    }

    // The result's own story — what you're actually making and why.
    const outDef = itemDef(recipe.output.item);
    if (outDef) {
      const facts: string[] = [];
      if (outDef.heals) facts.push(`Heals ${outDef.heals} HP`);
      if (outDef.weapon) facts.push(`${outDef.weapon.damage} damage`);
      if (outDef.armor) facts.push(`+${outDef.armor} armor`);
      if (outDef.value) facts.push(`worth ${outDef.value.toLocaleString()}c each`);
      if (facts.length > 0 || outDef.desc) {
        this.craftDetail.appendChild(sectionHead('The result'));
        const result = document.createElement('div');
        result.className = 'work-result';
        if (facts.length > 0) {
          const line = document.createElement('div');
          line.className = 'work-result-facts';
          line.textContent = facts.join(' · ');
          result.appendChild(line);
        }
        if (outDef.desc) {
          const flavor = document.createElement('div');
          flavor.className = 'work-result-flavor';
          flavor.textContent = outDef.desc;
          result.appendChild(flavor);
        }
        this.craftDetail.appendChild(result);
      }
    }

    const actions = document.createElement('div');
    actions.className = 'work-actions';
    const running = this.getAction();
    if (running?.recipe) {
      // THE HANDS ARE BUSY. A running batch owns the bench: show its
      // live tally and one Stop — never a second Make button that
      // would silently swallow the rest of the batch.
      const busy = document.createElement('span');
      busy.className = 'work-busy';
      const busyName = RECIPES.get(running.recipe)?.name ?? running.recipe;
      const total = running.total ?? 1;
      const at = Math.min((running.made ?? 0) + 1, total);
      busy.textContent =
        total > 1 ? `At work: ${busyName}, ${at} of ${total}` : `At work: ${busyName}`;
      actions.appendChild(busy);
      actions.appendChild(
        bigButton('Stop', 'craft:stop', () => this.onCraftStop?.(), { acta: 'Stop' }),
      );
    } else if (locked) {
      const lockNote = document.createElement('span');
      lockNote.className = 'lock-note';
      lockNote.textContent = `Reach ${recipe.skill} ${recipe.levelReq} to ${face.verb.toLowerCase()} this`;
      actions.appendChild(lockNote);
    } else {
      // MAKE, THEN WATCH: the buttons hand the moment to the world —
      // the panel closes and the work card takes over. "All" means
      // all the pack can cover, not a fixed number.
      const most = Math.min(count, 1000);
      const quantities = [1];
      if (most > 5) quantities.push(5);
      if (most > 1) quantities.push(most);
      for (const qty of quantities) {
        const label =
          qty === 1 ? `${face.verb} 1` : qty === most ? `${face.verb} all` : `× ${qty}`;
        const btn = bigButton(
          label,
          `craft:${recipe.id}:${qty === most && qty !== 1 ? 'all' : qty}`,
          () => {
            this.onCraft(recipe.id, qty);
            this.closeAll();
          },
          {
            acta: face.verb,
            minor: qty !== 1,
          },
        );
        if (count === 0) btn.disabled = true;
        actions.appendChild(btn);
      }
    }
    this.craftDetail.appendChild(actions);
  }

  // ------------------------------------------------------------- bank

  openBank(
    items: Record<string, number>,
    at?: { tx: number; ty: number },
    gear?: Array<{ id: number; item: string; roll: ItemRoll }>,
  ): void {
    this.lastBank = items;
    if (gear) this.lastBankGear = gear;
    this.closeAll();
    if (at) this.anchor = { x: at.tx + 0.5, y: at.ty + 0.5 };
    this.renderBank();
    this.bankPanel.classList.remove('hidden');
  }

  refreshBank(
    items: Record<string, number>,
    gear?: Array<{ id: number; item: string; roll: ItemRoll }>,
  ): void {
    this.lastBank = items;
    if (gear) this.lastBankGear = gear;
    if (this.bankOpen) this.renderBank();
  }

  /**
   * The Vault: stored goods as a WALL OF SOCKETS you read like your
   * own pack — pick a pile and the counter beneath offers Take 1/5/
   * All. Rolled gear hangs apart on the armory rack, tinted by tier,
   * each piece taken back with one press. Hover or focus any socket
   * for the full item card, exactly like the pack.
   */
  private renderBank(): void {
    this.bankList.innerHTML = '';
    this.bankArmory.innerHTML = '';
    this.bankDetail.innerHTML = '';
    this.bankTools.innerHTML = '';
    const entries = Object.entries(this.lastBank).sort(([a, an], [b, bn]) =>
      this.bankSort === 'qty'
        ? bn - an || a.localeCompare(b)
        : (itemDef(a)?.name ?? a).localeCompare(itemDef(b)?.name ?? b),
    );
    if (this.bankSel && !this.lastBank[this.bankSel]) this.bankSel = null;
    if (entries.length > 1) {
      this.sortBar(
        this.bankTools,
        'bank',
        [
          ['az', 'A–Z'],
          ['qty', 'Most stored'],
        ],
        this.bankSort,
        (k) => {
          this.bankSort = k;
          this.renderBank();
        },
      );
    }

    if (entries.length === 0 && this.lastBankGear.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'make-empty';
      empty.textContent = 'Your vault is empty — deposit from the pack beside you.';
      this.bankList.appendChild(empty);
      this.bankArmory.classList.add('hidden');
      this.bankDetail.classList.add('hidden');
      return;
    }

    // ---- armory rack: one socket per rolled instance.
    if (this.lastBankGear.length > 0) {
      this.bankArmory.classList.remove('hidden');
      this.bankArmory.appendChild(sectionHead('Armory — rolled gear'));
      const rack = document.createElement('div');
      rack.className = 'vault-grid';
      for (const g of this.lastBankGear) {
        const cell = document.createElement('div');
        cell.className = `inv-slot vault-slot clickable rarity-${g.roll.rar}`;
        cell.dataset.nav = '';
        cell.dataset.navkey = `bankgear:${g.id}`;
        cell.dataset.acta = 'Take';
        cell.dataset.tipname = instanceName(g.item, g.roll);
        // The full inspect card serves vault gear like pack gear.
        cell.dataset.lootitem = g.item;
        cell.dataset.lootqty = '1';
        cell.dataset.lootroll = JSON.stringify(g.roll);
        const img = document.createElement('img');
        img.className = 'inv-item';
        img.src = itemIconUrl(g.item, 48);
        img.draggable = false;
        cell.appendChild(img);
        cell.addEventListener('click', () => this.onBank('withdraw', g.item, 1, g.id));
        rack.appendChild(cell);
      }
      this.bankArmory.appendChild(rack);
    } else {
      this.bankArmory.classList.add('hidden');
    }

    // ---- the goods wall.
    if (entries.length > 0) {
      const grid = document.createElement('div');
      grid.className = 'vault-grid';
      for (const [item, qty] of entries) {
        const cell = document.createElement('div');
        cell.className = 'inv-slot vault-slot clickable';
        if (this.bankSel === item) cell.classList.add('selected');
        cell.dataset.nav = '';
        cell.dataset.navkey = `bank:${item}`;
        cell.dataset.acta = 'Choose';
        cell.dataset.tipname = itemDef(item)?.name ?? item;
        cell.dataset.lootitem = item;
        cell.dataset.lootqty = String(qty);
        const img = document.createElement('img');
        img.className = 'inv-item';
        img.src = itemIconUrl(item, 48);
        img.draggable = false;
        cell.appendChild(img);
        const q = document.createElement('span');
        q.className = 'inv-qty';
        q.textContent = qty > 9999 ? `${Math.floor(qty / 1000)}k` : qty.toLocaleString();
        cell.appendChild(q);
        cell.addEventListener('click', () => {
          this.bankSel = item;
          this.renderBank();
        });
        grid.appendChild(cell);
      }
      this.bankList.appendChild(grid);
    }

    // ---- the counter: the chosen pile's take actions.
    if (this.bankSel) {
      const item = this.bankSel;
      const qty = this.lastBank[item]!;
      const def = itemDef(item);
      this.bankDetail.classList.remove('hidden');
      const face = document.createElement('div');
      face.className = 'counter-face';
      const img = document.createElement('img');
      img.src = itemIconUrl(item, 44);
      img.draggable = false;
      const names = document.createElement('div');
      const name = document.createElement('div');
      name.className = 'counter-name';
      name.textContent = def?.name ?? item;
      const sub = document.createElement('div');
      sub.className = 'counter-sub';
      sub.textContent = `${qty.toLocaleString()} stored`;
      names.append(name, sub);
      face.append(img, names);
      this.bankDetail.appendChild(face);
      const actions = document.createElement('div');
      actions.className = 'counter-actions';
      for (const [label, n] of [
        ['Take 1', 1],
        ['Take 5', 5],
        ['Take all', qty],
      ] as const) {
        actions.appendChild(
          bigButton(label, `bank:${item}:${label}`, () => this.onBank('withdraw', item, n), {
            acta: 'Withdraw',
            minor: label !== 'Take 1',
          }),
        );
      }
      this.bankDetail.appendChild(actions);
    } else {
      this.bankDetail.classList.add('hidden');
    }
  }

  // ------------------------------------------------------------- shop

  /**
   * The Store: goods SHELVED in a grid — big portrait, name, an honest
   * coin price tag, and the buy buttons right on the shelf. Your pack
   * stands beside the counter; tap items there to sell them.
   */
  openShop(shopId = 'general_store', at?: { tx: number; ty: number }, priceMult = 1): void {
    const shop = shopDef(shopId);
    if (!shop) return;
    this.closeAll();
    this.shopId = shopId;
    if (at) this.anchor = { x: at.tx + 0.5, y: at.ty + 0.5 };
    const head = this.shopPanel.querySelector('h3');
    if (head) head.textContent = shop.name;
    // THE PRICE OF A NAME: the server pushed the viewer's live band
    // multiplier with the open — the tags below show what will
    // actually be charged (same pure function, never a disagreement).
    const priceOf = (base: number): number => Math.max(1, Math.round(base * priceMult));
    this.shopList.innerHTML = '';
    for (const entry of shop.stock) {
      const def = itemDef(entry.item);
      const card = document.createElement('div');
      card.className = 'shelf-card';
      // Hover / pad focus raises the full item card for shop goods.
      card.dataset.lootitem = entry.item;
      card.dataset.lootqty = '1';
      card.appendChild(iconTile(itemIconUrl(entry.item, 48), 'sm'));
      const mid = document.createElement('div');
      mid.className = 'shelf-mid';
      const name = document.createElement('div');
      name.className = 'shelf-name';
      name.textContent = def?.name ?? entry.item;
      const tag = document.createElement('span');
      tag.className = 'price-tag';
      const coin = document.createElement('img');
      coin.src = itemIconUrl('coins', 18);
      coin.draggable = false;
      const amount = document.createElement('span');
      amount.textContent = priceOf(entry.price).toLocaleString();
      if (priceMult !== 1) {
        tag.title = priceMult < 1 ? 'Your standing earns a better price.' : 'Your standing costs you here.';
        amount.style.color = priceMult < 1 ? '#e8b64c' : '#c8a36a';
      }
      tag.append(coin, amount);
      mid.append(name, tag);
      card.appendChild(mid);
      const actions = document.createElement('div');
      actions.className = 'shelf-actions';
      for (const [label, n] of [
        ['Buy 1', 1],
        ['Buy 5', 5],
      ] as const) {
        actions.appendChild(
          bigButton(label, `shop:${entry.item}:${n}`, () => this.onShop('buy', entry.item, n, this.shopId), {
            acta: 'Buy',
            minor: n !== 1,
          }),
        );
      }
      card.appendChild(actions);
      this.shopList.appendChild(card);
    }
    this.shopPanel.classList.remove('hidden');
  }
}
