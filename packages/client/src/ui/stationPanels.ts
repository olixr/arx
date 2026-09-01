import * as stationArt from './stationScreens.js';
import {
  Tile,
  PET_CAP,
  diagWallInfo,
  levelForXp,
  type EquippedItem,
  type EquipSlot,
  type InvSlot,
  type ItemRoll,
  type PetInfo,
  type SkillXp,
  type StationType,
} from '@arx/shared';
import {
  BUILDABLES,
  BUILD_CATEGORIES,
  COMPOST_BATCH_WORTH,
  COMPOST_PRIME_WORTH,
  CROP_BY_SEED,
  GRADED_PRODUCE,
  GROWTH_SEEDS,
  TROUGH_FEED_CAP,
  WORK_BATCH_CAP,
  WORK_RECIPES,
  WORK_VERBS,
  compostWorthOf,
  feedWorthOf,
  gradeOf,
  workDone,
  workRecipesFor,
  larderEpoch,
  larderHost,
  larderOrder,
  type WorkRecipeDef,
  type WorkStation,
  aggregateGearStats,
  buildableGround,
  canUnmake,
  effectiveReq,
  enchantDef,
  inscriptionQuality,
  qualityWord,
  unmakingOf,
  shopDef,
  instanceName,
  itemDef,
  npcDef,
  RECIPES,
  recipesForStation,
  trainerPostFor,
  type BuildableDef,
  type RecipeDef,
  type TrainerPost,
} from '@arx/content';
import { buildableIconUrl, itemIconUrl, queueItemIcon, uiIconUrl } from '../render/icons.js';
import { farmBins, farmJobs, farmKey, farmTroughs, larderFills } from '../game/farmCare.js';
import { bigButton, iconTile, sectionHead } from './panel.js';
import { petPortraitUrl } from '../render/petPortrait.js';
import { createLedger } from './kit/ledger.js';
import { tabRail } from './kit/tabs.js';
import { orderVault, pileWorth, VAULT_SORTS, type VaultSort } from './vaultOrder.js';
import { registerSheetProvider, type SheetVerb } from './kit/contextSheet.js';

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
export const STATION_FACE: Record<
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

export const HANDIWORK_FACE = STATION_FACE.workbench!;

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
  readonly craftTools = document.getElementById('craft-tools')!;
  readonly craftList = document.getElementById('craft-list')!;
  readonly craftDetail = document.getElementById('craft-detail')!;
  private readonly bankPanel = document.getElementById('bank-panel')!;
  readonly bankTools = document.getElementById('bank-tools')!;
  readonly bankList = document.getElementById('bank-list')!;
  readonly bankArmory = document.getElementById('bank-armory')!;
  readonly bankDetail = document.getElementById('bank-detail')!;
  private readonly shopPanel = document.getElementById('shop-panel')!;
  private readonly shopList = document.getElementById('shop-list')!;
  private readonly stablePanel = document.getElementById('stable-panel')!;
  readonly stableList = document.getElementById('stable-list')!;
  private readonly buildPanel = document.getElementById('build-panel')!;
  readonly buildTools = document.getElementById('build-tools')!;
  readonly buildList = document.getElementById('build-list')!;
  readonly buildDetail = document.getElementById('build-detail')!;
  /** How the Builder's Table ledger is ordered. */
  buildSort: 'reach' | 'level' | 'az' = 'reach';

  /** dressPanel handles for the Workshop head — set from main. */
  private craftDressHandles: { setHint: (t: string) => void; setIcon: (u: string) => void } | null =
    null;

  lastBank: Record<string, number> = {};
  /** Rolled gear instances stored in the vault (withdraw by row id). */
  lastBankGear: Array<{ id: number; item: string; roll: ItemRoll }> = [];
  /** The vault's selected pile — the detail strip's subject. */
  bankSel: string | null = null;
  /** The vault's standing tab (armory shows only when gear hangs). */
  bankTab: 'armory' | 'all' | 'gear' | 'food' | 'mats' = 'all';
  /** The reader's place in each paged ledger, kept across re-renders. */
  leafAt: Record<string, number> = {};
  /** How the vault wall is ordered — remembered across visits. */
  bankSort: VaultSort = ((): VaultSort => {
    const kept = localStorage.getItem('arx.vaultsort');
    return kept === 'kind' || kept === 'worth' || kept === 'az' || kept === 'qty' ? kept : 'kind';
  })();
  /** How the Workshop ledger is ordered. */
  craftSort: 'reach' | 'level' | 'az' = 'reach';
  /**
   * THE UNMAKING's bench mode. The enchanting table does two opposite
   * jobs — it makes workings and it takes things apart — and they share
   * one screen because they are one trade and they feed each other.
   */
  craftMode: 'make' | 'unmake' = 'make';
  /** The pack slot the unmaking bench is laying out (-1 = a worn piece). */
  unmakeSel: number | null = null;
  /** Set when the bench's subject is on the body instead of in the pack. */
  unmakeWorn: EquipSlot | undefined = undefined;
  /**
   * The slot the player has asked to break and not yet confirmed.
   * Destroying gear is irreversible, so it takes two presses and the
   * second one says what it is about to destroy.
   */
  unmakeArmed: number | null = null;
  /**
   * THE MARKED BATCH: pack slots set aside for one bulk breaking.
   * Each mark remembers the piece it named, so a pack that shifts
   * underneath drops the stale mark instead of breaking a stranger.
   */
  readonly unmakeMarked = new Map<number, string>();
  /** The batch's own two-press confirm, held apart from the single's. */
  unmakeBatchArmed = false;
  /**
   * THE RECOVERED RIBBON: what the last breaking said it would pay.
   * Preview and payout are the same pure function, so the bench may
   * celebrate with its own figures — but only once the pack proves the
   * pieces really left (a refusal never earns a ribbon), and only for
   * a breath.
   */
  pendingBreak: {
    checks: Array<{ index: number; item: string }>;
    yields: Array<{ item: string; qty: number }>;
    count: number;
    at: number;
    /** The let-go clock is wound once, not once per re-render. */
    timed?: boolean;
  } | null = null;
  /** World tile center the open panel is bound to (null = untethered). */
  private anchor: { x: number; y: number } | null = null;
  /** Which shop's shelf is on screen — echoed on every buy. */
  private shopId = 'general_store';
  /** What the open maker screen is showing — refreshOpen re-renders it. */
  showing:
    | { kind: 'craft'; station: StationType | null; skills: SkillXp; known: ReadonlySet<string>; sel: string | null }
    | { kind: 'plant'; tx: number; ty: number; skills: SkillXp; sel: string | null; bed: 'tilled' | 'frame' | 'log' }
    | { kind: 'compost'; tx: number; ty: number; sel: string | null }
    | { kind: 'trough'; tx: number; ty: number; sel: string | null }
    | { kind: 'work'; tx: number; ty: number; work: WorkStation; sel: string | null }
    | { kind: 'build'; skills: SkillXp; sel: string | null }
    | null = null;

  constructor(
    readonly onCraft: (recipe: string, qty: number) => void,
    readonly onBank: (
      op: 'deposit' | 'withdraw',
      item: string,
      qty: number,
      gearId?: number,
    ) => void,
    private readonly onShop: (op: 'buy' | 'sell', item: string, qty: number, shop?: string) => void,
    readonly onPickBuildable: (id: string) => void,
    /** THE UNMAKING: break the gear in this pack slot down for dust. */
    readonly onUnmake: (slot: number) => void = () => {},
    /** SUNDERING: draw the working out of this slot, keep the piece. */
    readonly onSunder: (
      slot: number,
      worn?: EquipSlot,
      seat?: 'ward' | 'art',
    ) => void = () => {},
    /** The live pack — feeds every have/need figure. */
    readonly getInventory: () => InvSlot[] = () => [],
    /** The worn kit — the unmaking bench sunders straight off the body. */
    readonly getEquipment: () => Partial<Record<EquipSlot, EquippedItem>> = () => ({}),
    /** The character's skills — vault sockets judge equip gates live. */
    readonly getSkills: () => SkillXp = () => ({}),
  ) {
    // Ⓨ on a shelf plate offers the counting-house verbs.
    registerSheetProvider('shopcard', (el) => {
      const item = (el.dataset.navkey ?? '').slice('shopcard:'.length);
      if (!item) return [];
      return [
        { label: 'Buy one', act: () => this.onShop('buy', item, 1, this.shopId) },
        { label: 'Buy five', act: () => this.onShop('buy', item, 5, this.shopId) },
      ];
    });
    // THE WORK ANSWERS FROM THE ROW: Ⓨ on a recipe fans its whole
    // quantity question around the row itself — the detail pane is a
    // READING, never a toll booth on the way to the Make button. The
    // verbs are the same clicks the buttons over there make.
    registerSheetProvider('recipe', (el) => {
      const id = (el.dataset.navkey ?? '').slice('recipe:'.length);
      const recipe = RECIPES.get(id);
      if (!recipe) return [];
      const verb =
        this.showing?.kind === 'craft' ? craftStationFace(this.showing.station).verb : 'Make';
      const most = Math.min(this.makeable(recipe), 1000);
      const make = (qty: number): SheetVerb => ({
        label: qty === 1 ? `${verb} 1` : qty === most ? `${verb} all (${most})` : `× ${qty}`,
        disabled: most === 0,
        act: () => {
          this.onCraft(recipe.id, qty);
          this.closeAll();
        },
      });
      const verbs: SheetVerb[] = [make(1)];
      if (most > 5) verbs.push(make(5));
      if (most > 1) verbs.push(make(most));
      return verbs;
    });
    // Ⓨ on an unmaking row fans the row's own verbs — mark it for the
    // batch, arm the breaking, draw a working out — so the pad never
    // has to cross to the detail pane at all. Worn rows keep their
    // pane (sundering the armor on your body deserves the full read).
    registerSheetProvider('unrow', (el) => {
      const slot = Number((el.dataset.navkey ?? '').slice('unrow:'.length));
      if (!Number.isInteger(slot) || slot < 0) return [];
      const s = this.getInventory()[slot];
      if (!s || s.stolen) return [];
      const marked = this.unmakeMarked.get(slot) === s.item;
      const verbs: SheetVerb[] = [
        {
          label: marked ? 'Unmark' : 'Mark for the batch',
          act: () => {
            if (marked) this.unmakeMarked.delete(slot);
            else this.unmakeMarked.set(slot, s.item);
            this.unmakeBatchArmed = false;
            stationArt.renderCraft(this);
          },
        },
        {
          // The ellipsis is honest: this arms the two-press confirm on
          // the bench; nothing breaks from inside the sheet.
          label: 'Unmake…',
          act: () => {
            this.unmakeSel = slot;
            this.unmakeWorn = undefined;
            this.unmakeArmed = slot;
            this.unmakeBatchArmed = false;
            stationArt.renderCraft(this);
          },
        },
      ];
      if (s.roll?.ench) {
        verbs.push({ label: 'Sunder', act: () => this.onSunder(slot, undefined, 'ward') });
      }
      return verbs;
    });
  }
  // Close chips + header dressing come from ui/panel.ts (dressPanel),
  // wired in main — one anatomy for every screen in the game.

  /** Main hands over the Workshop head's dress handles once, at boot. */
  setCraftDress(handles: { setHint: (t: string) => void; setIcon: (u: string) => void }): void {
    this.craftDressHandles = handles;
  }

  get bankOpen(): boolean {
    return !this.bankPanel.classList.contains('hidden');
  }

  get stableOpen(): boolean {
    return !this.stablePanel.classList.contains('hidden');
  }

  get shopOpen(): boolean {
    return !this.shopPanel.classList.contains('hidden');
  }

  /**
   * THE COUNTER YOU STAND AT: which shelf is open, for the pack side of
   * the trade. Sales MUST name it — the server's reach gate looks for
   * that keeper, and an unnamed sale falls back to the general store's
   * counter tile, which no trainer or stallholder stands on. Null when
   * no shelf is up.
   */
  get openShopId(): string | null {
    return this.shopOpen ? this.shopId : null;
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
      this.stableOpen ||
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
    this.stablePanel.classList.add('hidden');
    this.syncBodyClass();
    this.anchor = null;
    this.showing = null;
    this.bankSel = null;
    this.releaseArmed = null;
    // The bench remembers nothing between visits: a mode, an armed
    // confirm, or a marked batch that persisted would eventually greet
    // somebody with a wall of their own gear and a Break button.
    this.craftMode = 'make';
    this.unmakeArmed = null;
    this.unmakeBatchArmed = false;
    this.unmakeMarked.clear();
    this.pendingBreak = null;
  }

  /**
   * Mirror the bank/shop panels' open state onto body classes. The
   * station-pairing CSS (character.css) used to read these panels
   * through document-scoped `body:has(...)` selectors, which the
   * engine re-matches on EVERY `.hidden` toggle anywhere in the
   * document — a standing style-recalc tax. A plain body class costs
   * only the toggle itself. Called from every path that shows or
   * hides these panels (openBank/openShop/closeAll — every open goes
   * through closeAll first, and every close lands in closeAll), so
   * the class can never leak past its panel.
   */
  private syncBodyClass(): void {
    document.body.classList.toggle('bank-open', this.bankOpen);
    document.body.classList.toggle('shop-open', this.shopOpen);
    // THE BUMPER YIELDS TO THE COUNTER: the pack's filter rail is the
    // character room's section rail (data-tabs, so LB/RB step it),
    // but the paired pack column stands BEFORE the vault in document
    // order and would steal the bumpers from the vault's family tabs.
    // While a counter is open the rail sheds both pad markers; the
    // same chokepoint that stamps the pairing class restores them.
    const filters = document.getElementById('pack-filters');
    if (filters) {
      const paired = this.bankOpen || this.shopOpen;
      filters.toggleAttribute('data-tabs', !paired);
      filters.toggleAttribute('data-pager', !paired);
    }
  }

  // ------------------------------------------------- THE THREE STALLS

  /** The household as last mirrored — openStable/refreshStable feed it. */
  lastPets: PetInfo[] = [];
  /**
   * The slot the keeper has asked to release and not yet confirmed.
   * A bond is irreversible to break, so it takes two presses and the
   * second one says whose collar it is about to slip (the unmaking
   * bench's own arming discipline).
   */
  releaseArmed: number | null = null;
  /** THE THREE STALLS' acts — wired from main once at boot. */
  onStable: (op: 'heel' | 'stable' | 'release', slot: number) => void = () => {};
  onStableRename: (slot: number, current: string) => void = () => {};

  setStableHooks(
    onOp: (op: 'heel' | 'stable' | 'release', slot: number) => void,
    onRename: (slot: number, current: string) => void,
  ): void {
    this.onStable = onOp;
    this.onStableRename = onRename;
  }

  openStable(at: { tx: number; ty: number }, pets: PetInfo[]): void {
    this.closeAll();
    this.anchor = { x: at.tx + 0.5, y: at.ty + 0.5 };
    this.lastPets = pets;
    // Unhide before the render (same law as openCraft — any measuring
    // render sees an honest height on its first pass).
    this.stablePanel.classList.remove('hidden');
    stationArt.renderStable(this);
  }

  /** The household mirror moved — re-render if the stalls are open. */
  refreshStable(pets: PetInfo[]): void {
    this.lastPets = pets;
    if (this.stableOpen) stationArt.renderStable(this);
  }


  /**
   * Called every frame with the player's position: an anchored panel
   * closes once its station is out of reach (a little past the 2.2
   * interaction radius, so standing at the edge doesn't flicker it).
   */
  /** Dev-only (`?room=` audit lever): stand a room without a station. */
  releaseAnchor(): void {
    this.anchor = null;
  }

  enforceAnchor(px: number, py: number): void {
    if (!this.anchor || !this.anyOpen) return;
    const dx = this.anchor.x - px;
    const dy = this.anchor.y - py;
    if (dx * dx + dy * dy > 3 * 3) this.closeAll();
  }

  /** The pack changed — keep the open maker screen's figures honest. */
  refreshOpen(): void {
    if (!this.showing) return;
    if (this.showing.kind === 'craft') stationArt.renderCraft(this);
    else if (this.showing.kind === 'plant') stationArt.renderPlant(this);
    else if (this.showing.kind === 'compost') stationArt.renderCompost(this);
    else if (this.showing.kind === 'trough') stationArt.renderTrough(this);
    else if (this.showing.kind === 'work') stationArt.renderWork(this);
    else stationArt.renderBuild(this);
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
    // Unhide before the render — the plans ledger's first measure must
    // see an honest height (same law as openCraft).
    this.buildPanel.classList.remove('hidden');
    stationArt.renderBuild(this);
  }

  /** How many of a buildable the pack covers right now. */
  placeable(def: BuildableDef): number {
    if (def.materials.length === 0) return 99;
    let n = Infinity;
    for (const m of def.materials) n = Math.min(n, Math.floor(this.countOf(m.item) / m.qty));
    return Number.isFinite(n) ? n : 0;
  }

  /** The footing rule in world-words — where a piece agrees to stand. */
  footingWords(def: BuildableDef): string {
    // Hangings aim at the wall itself, not the ground before it.
    if (def.detail !== undefined) return 'a bare wall face';
    const ground = buildableGround(def);
    const outdoor = ground.includes(Tile.Grass);
    const floors = ground.includes(Tile.WoodFloor);
    if (outdoor && floors) return 'open ground, or a laid floor';
    if (floors) return 'a laid floor';
    return 'open ground: grass, dirt, or sand';
  }


  // ------------------------------------------------------------ plant

  /** Set by main: THE BULK BREAKING — the marked batch, as one send. */
  onUnmakeMany: ((slots: number[]) => void) | null = null;

  /** Set by main: sends the plant intent for a chosen seed. */
  onPlant: ((tx: number, ty: number, seed: string) => void) | null = null;

  /** Seed picker for a tilled plot: lists the seeds you carry. */
  openPlant(
    tx: number,
    ty: number,
    inventory: InvSlot[],
    skills: SkillXp,
    at?: { tx: number; ty: number },
    bed: 'tilled' | 'frame' | 'log' = 'tilled',
  ): void {
    void inventory; // counts come live from getInventory now
    this.closeAll();
    this.anchor = at ? { x: at.tx + 0.5, y: at.ty + 0.5 } : { x: tx + 0.5, y: ty + 0.5 };
    this.showing = { kind: 'plant', tx, ty, skills, sel: null, bed };
    this.dressCraft('Planting', itemIconUrl(bed === 'log' ? 'palegill_spores' : 'carrot', 34), '#7ac46a',
      bed === 'log'
        ? 'The log lies in shade. Choose what haunts it.'
        : 'The furrow is cut. Choose what grows in it.');
    // Unhide before the render — the seed ledger's first measure must
    // see an honest height (same law as openCraft).
    this.craftPanel.classList.remove('hidden');
    stationArt.renderPlant(this);
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
  sortBar<K extends string>(
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
    opts: { label?: string; keep?: boolean; next?: string } = {},
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
      // THE HAND LANDS ON THE WORK: a chip that re-deals the list may
      // hand the cursor to it (the bench mode switch does), so picking
      // a mode is one press and the next press is already on a row.
      if (opts.next !== undefined) chip.dataset.navnext = opts.next;
      chip.addEventListener('click', () => onPick(key));
      row.appendChild(chip);
    }
    host.appendChild(row);
  }


  /**
   * One YIELD row — what an unmaking pays out. A gain, never a need:
   * materialRow's have/need framing painted a 5-dust payout as a red
   * "1 / 5" shortfall, which is the opposite of what is happening.
   */
  yieldRow(item: string, qty: number): HTMLElement {
    const def = itemDef(item);
    const row = document.createElement('div');
    row.className = 'mat-row ok';
    const img = document.createElement('img');
    img.src = itemIconUrl(item, 36);
    img.draggable = false;
    const name = document.createElement('span');
    name.className = 'mat-name';
    name.textContent = def?.name ?? item;
    const count = document.createElement('span');
    count.className = 'mat-count';
    count.textContent = `+${qty}`;
    row.append(img, name, count);
    return row;
  }

  /** One material row in the Workshop detail: the full story of a need. */
  materialRow(item: string, need: number): HTMLElement {
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


  // ------------------------------------------------------------ compost

  /** Set by main: feeds one pack slot's item into the bin. */
  onCompost: ((tx: number, ty: number, slot: number) => void) | null = null;

  /**
   * THE LIVING SOIL: the bin's deposit screen. Opens off the local
   * care mirror (the vault law — no server reply needed); every
   * deposit re-proves the tile server-side on its way in.
   */
  openCompost(tx: number, ty: number, at?: { tx: number; ty: number }): void {
    this.closeAll();
    this.anchor = at ? { x: at.tx + 0.5, y: at.ty + 0.5 } : { x: tx + 0.5, y: ty + 0.5 };
    this.showing = { kind: 'compost', tx, ty, sel: null };
    this.dressCraft('Compost bin', itemIconUrl('compost', 34), '#8a6a45',
      'Scraps in, rich ground out. The heap works while you wander.');
    this.craftPanel.classList.remove('hidden');
    stationArt.renderCompost(this);
  }


  // ------------------------------------------------------------ trough

  /** Set by main: loads one pack slot's feed into the manger. */
  onTrough: ((tx: number, ty: number, slot: number) => void) | null = null;

  /** THE ANIMALS OF THE YARD: the manger's feed screen. */
  openTrough(tx: number, ty: number, at?: { tx: number; ty: number }): void {
    this.closeAll();
    this.anchor = at ? { x: at.tx + 0.5, y: at.ty + 0.5 } : { x: tx + 0.5, y: ty + 0.5 };
    this.showing = { kind: 'trough', tx, ty, sel: null };
    this.dressCraft('Feed trough', itemIconUrl('barley', 34), '#96703f',
      'A full manger grades the yard. Barley is the herd\'s favorite.');
    this.craftPanel.classList.remove('hidden');
    stationArt.renderTrough(this);
  }


  // ------------------------------------------------------------ work

  /** Set by main: loads a wall-clock batch into a yard station. */
  onWork: ((tx: number, ty: number, recipe: string, qty: number) => void) | null = null;

  /** THE WORKING YARD: a station's load screen (the vault law). */
  openWork(tx: number, ty: number, work: WorkStation, at?: { tx: number; ty: number }): void {
    this.closeAll();
    this.anchor = at ? { x: at.tx + 0.5, y: at.ty + 0.5 } : { x: tx + 0.5, y: ty + 0.5 };
    this.showing = { kind: 'work', tx, ty, work, sel: null };
    this.dressCraft(
      WORK_VERBS[work] + 'ing',
      itemIconUrl(workRecipesFor(work)[0]?.output.item ?? 'flour', 34),
      '#96703f',
      'Load it and walk away. The station works while you wander.',
    );
    this.craftPanel.classList.remove('hidden');
    stationArt.renderWork(this);
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
    /** Re-seat a remembered recipe (THE BENCH CALLS YOU BACK). */
    sel: string | null = null,
  ): void {
    this.closeAll();
    if (at) this.anchor = { x: at.tx + 0.5, y: at.ty + 0.5 };
    this.showing = { kind: 'craft', station, skills, known, sel };
    const face = (station && STATION_FACE[station]) || HANDIWORK_FACE;
    this.dressCraft(
      face.label,
      face.icon ? itemIconUrl(face.icon, 34) : uiIconUrl('hammer', 34),
      face.accent,
      face.hint,
    );
    // Unhide BEFORE the render: the ledger's first measure must see an
    // honest height, so the first deal is the only deal (no visible
    // re-deal from the ResizeObserver a frame later).
    this.craftPanel.classList.remove('hidden');
    stationArt.renderCraft(this);
  }

  /**
   * The bench the open craft screen speaks for — station, chosen
   * recipe, anchor tile. THE BENCH CALLS YOU BACK reads this the
   * moment a batch starts (before closeAll wipes it), so a finished
   * batch can reopen the same bench on the same recipe.
   */
  get craftBench(): {
    station: StationType | null;
    sel: string | null;
    at: { tx: number; ty: number } | null;
  } | null {
    if (this.showing?.kind !== 'craft') return null;
    return { station: this.showing.station, sel: this.showing.sel, at: this.anchorTile };
  }

  /** How many of a recipe the pack can cover right now. */
  makeable(recipe: RecipeDef): number {
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
  modeBar(): void {
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
        this.unmakeBatchArmed = false;
        stationArt.renderCraft(this);
      },
      { label: 'Bench', next: '#craft-list' },
    );
  }


  /**
   * THE RECOVERED RIBBON — the bench's own answer to a breaking. The
   * preview and the payout are the same pure function, so the bench
   * may celebrate with its own figures; the pack is still asked to
   * prove the pieces left first, because a refusal (a hot piece, a
   * full pack) must never wear a celebration. Lives for a breath,
   * then lets itself go.
   */
  renderBreakRibbon(): void {
    const p = this.pendingBreak;
    if (!p) return;
    if (Date.now() - p.at > 4000) {
      this.pendingBreak = null;
      return;
    }
    const inv = this.getInventory();
    if (!p.checks.every((c) => inv[c.index]?.item !== c.item)) return;
    const rib = document.createElement('div');
    rib.className = 'unmake-ribbon';
    const title = document.createElement('div');
    title.className = 'unmake-ribbon-title';
    title.textContent = p.count === 1 ? 'It comes apart.' : `${p.count} pieces come apart.`;
    rib.appendChild(title);
    const chips = document.createElement('div');
    chips.className = 'unmake-ribbon-yields';
    for (const y of p.yields) {
      const chip = document.createElement('span');
      chip.className = 'rib-chip';
      chip.title = itemDef(y.item)?.name ?? y.item;
      const img = document.createElement('img');
      img.src = itemIconUrl(y.item, 28);
      img.draggable = false;
      const qty = document.createElement('strong');
      qty.textContent = `+${y.qty}`;
      chip.append(img, qty);
      chips.appendChild(chip);
    }
    rib.appendChild(chips);
    this.craftDetail.appendChild(rib);
    if (!p.timed) {
      p.timed = true;
      window.setTimeout(() => {
        if (this.pendingBreak === p) {
          this.pendingBreak = null;
          this.refreshOpen();
        }
      }, 3200);
    }
  }


  // THE BENCH NAMES ITS TEACHERS: the rumor line points at a real
  // door. Taught lore names its teacher and town (TRAINER_DIRECTORY);
  // found lore stays a rumor of the wilds. Returns null when this
  // station keeps no secrets from the character.
  craftRumor(all: readonly RecipeDef[], known: ReadonlySet<string>): string | null {
    const hidden = all.filter((r) => r.unlock !== 'core' && !known.has(r.id));
    if (hidden.length === 0) return null;
    const byDoor = new Map<string, { post: TrainerPost; count: number }>();
    let wild = 0;
    for (const r of hidden) {
      const post = r.unlock === 'trainer' ? trainerPostFor(r.skill) : undefined;
      if (post) {
        const key = `${post.teacher}|${post.town}`;
        const entry = byDoor.get(key) ?? { post, count: 0 };
        entry.count += 1;
        byDoor.set(key, entry);
      } else {
        wild += 1;
      }
    }
    const n = hidden.length;
    const lead = `${n} ${n === 1 ? 'recipe waits' : 'recipes wait'} to be discovered.`;
    if (byDoor.size === 0) return `${lead} The wilds hide ${n === 1 ? 'it' : 'them'}.`;
    if (byDoor.size === 1 && wild === 0) {
      const { post } = [...byDoor.values()][0]!;
      return `${lead} ${post.teacher} in ${post.town} sells ${n === 1 ? 'it' : 'them all'}.`;
    }
    const doors = [...byDoor.values()]
      .map(({ post, count }) => `${post.teacher} in ${post.town} sells ${count}`)
      .join(', ');
    return wild > 0 ? `${lead} ${doors}; the wilds hide the rest.` : `${lead} ${doors}.`;
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
    // Unhide before the render — the vault ledger's first measure must
    // see an honest height (same law as openCraft).
    this.bankPanel.classList.remove('hidden');
    this.syncBodyClass();
    stationArt.renderBank(this);
  }

  refreshBank(
    items: Record<string, number>,
    gear?: Array<{ id: number; item: string; roll: ItemRoll }>,
  ): void {
    this.lastBank = items;
    if (gear) this.lastBankGear = gear;
    if (this.bankOpen) stationArt.renderBank(this);
  }

  /** The vault's shelving law: what family a stored good belongs to. */
  familyOf(item: string): 'gear' | 'food' | 'mats' {
    const def = itemDef(item);
    return def?.equipSlot ? 'gear' : def?.heals ? 'food' : 'mats';
  }

  /**
   * Deal prebuilt rows into a paged ledger — NOTHING LIVES BELOW THE
   * FOLD for every maker's list. The reader's place survives the
   * wholesale re-renders the pack mirror forces.
   */
  dealIntoLedger(
    host: HTMLElement,
    key: string,
    rows: HTMLElement[],
    seedRows: number,
    emptyLine?: string,
  ): void {
    const ledger = createLedger<HTMLElement>({
      renderRow: (el) => el,
      seedRows,
      emptyLine,
      initialLeaf: this.leafAt[key] ?? 0,
      onLeaf: (leaf) => {
        this.leafAt[key] = leaf;
      },
    });
    host.appendChild(ledger.root);
    ledger.setItems(rows);
  }



  // ------------------------------------------------------------- shop

  /**
   * The Store (Grand Refit Ph5): goods shelved as PLATES — portrait,
   * name, an honest coin tag. THE VERB COMES TO THE HAND: pressing a
   * shelf buys one; Ⓨ or right-click offers Buy one / Buy five on
   * the sheet. Your pack stands beside the counter; tap items there
   * to sell them. Standing pricing is told once, on the hint line.
   */
  openShop(shopId = 'general_store', at?: { tx: number; ty: number }, priceMult = 1): void {
    const shop = shopDef(shopId);
    if (!shop) return;
    this.closeAll();
    this.shopId = shopId;
    if (at) this.anchor = { x: at.tx + 0.5, y: at.ty + 0.5 };
    // Unhide before the shelves build — same law as openCraft: any
    // measuring render sees an honest height on its first pass.
    this.shopPanel.classList.remove('hidden');
    this.syncBodyClass();
    const head = this.shopPanel.querySelector('h3');
    if (head) head.textContent = shop.name;
    // THE PRICE OF A NAME: the server pushed the viewer's live band
    // multiplier with the open — the tags below show what will
    // actually be charged (same pure function, never a disagreement).
    const priceOf = (base: number): number => Math.max(1, Math.round(base * priceMult));
    this.shopList.innerHTML = '';
    // THE LARDER BOARD: the town's standing order, said at the top.
    // The order derives from the world clock (pure content); only the
    // filled count came over the wire. The sell door pays the premium
    // and speaks the countdown — this banner is the invitation.
    {
      const host = larderHost(shopId);
      if (host) {
        const epoch = larderEpoch(Date.now());
        const order = larderOrder(host, epoch);
        const fill = larderFills.get(shopId);
        const filled = fill && fill.epoch === epoch ? fill.filled : 0;
        const left = order.qty - filled;
        const board = document.createElement('div');
        board.className = 'shop-standing' + (left > 0 ? ' fair' : '');
        const orderDef = itemDef(order.item);
        board.textContent =
          left > 0
            ? `The larder asks: ${order.qty} ${orderDef?.name.toLowerCase() ?? order.item} at ${Math.max(1, Math.floor((orderDef?.value ?? 1) * order.mult))} coins each. ${left} still wanted.`
            : 'The larder order is filled. A new one posts with the next bell.';
        this.shopList.appendChild(board);
      }
    }
    // The standing's word, said once at the top, quartermaster-plain.
    if (priceMult !== 1) {
      const word = document.createElement('div');
      word.className = 'shop-standing' + (priceMult < 1 ? ' fair' : ' dear');
      word.textContent =
        priceMult < 1
          ? 'Your name is good here. The prices show it.'
          : 'Your name costs you here. The prices show it.';
      this.shopList.appendChild(word);
    }
    for (const entry of shop.stock) {
      const def = itemDef(entry.item);
      const card = document.createElement('button');
      card.className = 'shelf-card';
      // Hover / pad focus raises the full item card for shop goods.
      card.dataset.lootitem = entry.item;
      card.dataset.lootqty = '1';
      card.dataset.nav = '';
      card.dataset.navkey = `shopcard:${entry.item}`;
      card.dataset.acta = 'Buy one';
      // Shelf portraits fill through the budgeted lane — a stocked
      // store is a first-open burst (cached goods still land sync).
      const tile = iconTile('', 'sm');
      queueItemIcon(tile.querySelector('img')!, entry.item, 48);
      card.appendChild(tile);
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
        amount.style.color = priceMult < 1 ? '#e8b64c' : '#c8a36a';
      }
      tag.append(coin, amount);
      mid.append(name, tag);
      card.appendChild(mid);
      card.addEventListener('click', () => this.onShop('buy', entry.item, 1, this.shopId));
      this.shopList.appendChild(card);
    }
  }
}
