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
  buildableGround,
  canUnmake,
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
import { registerSheetProvider } from './kit/contextSheet.js';

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
  private readonly stablePanel = document.getElementById('stable-panel')!;
  private readonly stableList = document.getElementById('stable-list')!;
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
  /** The vault's standing tab (armory shows only when gear hangs). */
  private bankTab: 'armory' | 'all' | 'gear' | 'food' | 'mats' = 'all';
  /** The reader's place in each paged ledger, kept across re-renders. */
  private leafAt: Record<string, number> = {};
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
    | { kind: 'plant'; tx: number; ty: number; skills: SkillXp; sel: string | null; bed: 'tilled' | 'frame' | 'log' }
    | { kind: 'compost'; tx: number; ty: number; sel: string | null }
    | { kind: 'trough'; tx: number; ty: number; sel: string | null }
    | { kind: 'work'; tx: number; ty: number; work: WorkStation; sel: string | null }
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
  }

  // ------------------------------------------------- THE THREE STALLS

  /** The household as last mirrored — openStable/refreshStable feed it. */
  private lastPets: PetInfo[] = [];
  /**
   * The slot the keeper has asked to release and not yet confirmed.
   * A bond is irreversible to break, so it takes two presses and the
   * second one says whose collar it is about to slip (the unmaking
   * bench's own arming discipline).
   */
  private releaseArmed: number | null = null;
  /** THE THREE STALLS' acts — wired from main once at boot. */
  private onStable: (op: 'heel' | 'stable' | 'release', slot: number) => void = () => {};
  private onStableRename: (slot: number, current: string) => void = () => {};

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
    this.renderStable();
  }

  /** The household mirror moved — re-render if the stalls are open. */
  refreshStable(pets: PetInfo[]): void {
    this.lastPets = pets;
    if (this.stableOpen) this.renderStable();
  }

  private renderStable(): void {
    this.stableList.innerHTML = '';
    const bySlot = new Map(this.lastPets.map((p) => [p.slot, p]));
    for (let slot = 0; slot < PET_CAP; slot++) {
      const card = document.createElement('div');
      card.className = 'stall-card';
      const p = bySlot.get(slot);
      if (!p) {
        card.classList.add('stall-empty');
        const empty = document.createElement('div');
        empty.className = 'stall-empty-note';
        empty.textContent = 'An empty stall. The wild is wide.';
        card.appendChild(empty);
        this.stableList.appendChild(card);
        continue;
      }
      const head = document.createElement('div');
      head.className = 'stall-head';
      const img = document.createElement('img');
      img.className = 'stall-portrait';
      img.src = petPortraitUrl(p.species);
      img.draggable = false;
      head.appendChild(img);
      const id = document.createElement('div');
      id.className = 'stall-id';
      const nameEl = document.createElement('div');
      nameEl.className = 'stall-name';
      nameEl.textContent = p.name;
      const kindEl = document.createElement('div');
      kindEl.className = 'stall-kind';
      kindEl.textContent = `${npcDef(p.species)?.name ?? p.species}, level ${p.level}`;
      const stateEl = document.createElement('div');
      stateEl.className = `stall-state stall-state-${p.state}`;
      stateEl.textContent =
        p.state === 'heel'
          ? 'At your heel'
          : p.state === 'trailing'
            ? 'At your heel, catching up'
            : p.state === 'downed'
              ? 'Down in the field'
              : p.state === 'resting'
                ? `Resting. On its feet in ${Math.max(1, p.restSec ?? 0)}s`
                : 'Waiting in its stall';
      id.appendChild(nameEl);
      id.appendChild(kindEl);
      id.appendChild(stateEl);
      head.appendChild(id);
      card.appendChild(head);
      // The health sliver: the same truth the nameplate carries.
      const bar = document.createElement('div');
      bar.className = 'stall-hp';
      const fill = document.createElement('div');
      fill.className = 'stall-hp-fill';
      fill.style.width = `${Math.round((100 * p.hp) / Math.max(1, p.maxHp))}%`;
      bar.appendChild(fill);
      card.appendChild(bar);

      const acts = document.createElement('div');
      acts.className = 'stall-acts';
      const armed = this.releaseArmed === slot;
      if (p.state === 'stabled') {
        acts.appendChild(
          bigButton('Take to heel', `stable:heel:${slot}`, () => {
            this.releaseArmed = null;
            this.onStable('heel', slot);
          }, { acta: 'Heel' }),
        );
      } else if (p.state === 'heel' || p.state === 'trailing') {
        acts.appendChild(
          bigButton('Rest in the stall', `stable:rest:${slot}`, () => {
            this.releaseArmed = null;
            this.onStable('stable', slot);
          }, { acta: 'Rest' }),
        );
      }
      acts.appendChild(
        bigButton('Rename', `stable:rename:${slot}`, () => {
          this.releaseArmed = null;
          this.onStableRename(slot, p.name);
        }, { acta: 'Rename', minor: true }),
      );
      acts.appendChild(
        bigButton(
          armed ? `Release ${p.name}, truly?` : 'Release',
          `stable:release:${slot}`,
          () => {
            if (this.releaseArmed === slot) {
              this.releaseArmed = null;
              this.onStable('release', slot);
            } else {
              this.releaseArmed = slot;
              this.renderStable();
            }
          },
          { acta: armed ? 'Release' : 'Arm', minor: !armed },
        ),
      );
      card.appendChild(acts);
      this.stableList.appendChild(card);
    }
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
    if (this.showing.kind === 'craft') this.renderCraft();
    else if (this.showing.kind === 'plant') this.renderPlant();
    else if (this.showing.kind === 'compost') this.renderCompost();
    else if (this.showing.kind === 'trough') this.renderTrough();
    else if (this.showing.kind === 'work') this.renderWork();
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
    // Unhide before the render — the plans ledger's first measure must
    // see an honest height (same law as openCraft).
    this.buildPanel.classList.remove('hidden');
    this.renderBuild();
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
    // Hangings aim at the wall itself, not the ground before it.
    if (def.detail !== undefined) return 'a bare wall face';
    const ground = buildableGround(def);
    const outdoor = ground.includes(Tile.Grass);
    const floors = ground.includes(Tile.WoodFloor);
    if (outdoor && floors) return 'open ground, or a laid floor';
    if (floors) return 'a laid floor';
    return 'open ground: grass, dirt, or sand';
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
        ['az', 'A-Z'],
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
    const dealtPlans: HTMLElement[] = [];
    for (const cat of BUILD_CATEGORIES) {
      const shelf = defs.filter((d) => d.cat === cat.id);
      if (shelf.length === 0) continue;
      const head = document.createElement('div');
      head.className = 'build-shelf';
      head.textContent = cat.label;
      dealtPlans.push(head);
      for (const def of ordered(shelf)) {
        const locked = lockedOf(def);
        const count = this.placeable(def);
        dealtPlans.push(
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
    this.dealIntoLedger(this.buildList, 'build', dealtPlans, 8);

    // ---- the chosen plan, laid out large
    const def = BUILDABLES.get(showing.sel)!;
    const skill = def.skill ?? 'construction';
    const level = levelOf(def);
    const locked = lockedOf(def);
    const count = this.placeable(def);
    const turnable =
      def.tile !== undefined &&
      (diagWallInfo(def.tile) !== null || def.tile === Tile.FenceDiagNE);

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
      locked ? '·' : `× ${count}`,
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
    this.renderPlant();
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

  /** One ledger row (Workshop master list). A string `iconUrl` sets
   * the portrait synchronously; a function fills it through the
   * BUDGETED LANE (icons.ts) so a first-open burst never hitches. */
  private ledgerRow(opts: {
    key: string;
    iconUrl: string | ((img: HTMLImageElement) => void);
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
    if (typeof opts.iconUrl === 'string') img.src = opts.iconUrl;
    else opts.iconUrl(img);
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

    // Tally the seed pouches in the pack — the BED decides which
    // pouches answer: spores for a log, annuals for a frame (a tree
    // wants open sky), everything tilled for the open plot.
    const bedTakes = (seed: string): boolean => {
      const crop = CROP_BY_SEED.get(seed);
      if (showing.bed === 'log') return crop?.bed === 'log';
      if (crop?.bed === 'log') return false;
      if (showing.bed === 'frame') return crop !== undefined && crop.recurring === undefined;
      return crop !== undefined || GROWTH_SEEDS.has(seed);
    };
    const held = new Map<string, number>();
    for (const slot of this.getInventory()) {
      if (slot && bedTakes(slot.item)) {
        held.set(slot.item, (held.get(slot.item) ?? 0) + slot.qty);
      }
    }
    if (held.size === 0) {
      const empty = document.createElement('div');
      empty.className = 'make-empty';
      empty.textContent =
        showing.bed === 'log'
          ? 'No spores in your pack. Jorel keeps them, out in the fields.'
          : 'No seeds in your pack. Buy some at the shop, or forage wild herbs.';
      this.craftList.appendChild(empty);
      return;
    }
    const seeds = [...held.keys()];
    if (!showing.sel || !held.has(showing.sel)) showing.sel = seeds[0]!;

    this.dealIntoLedger(
      this.craftList,
      'plant',
      seeds.map((seed) => {
        // THE SOWN LINE: tree and bush seeds share the picker with
        // crops but carry no crop def — the wild owns their clock.
        const crop = CROP_BY_SEED.get(seed);
        const locked = crop !== undefined && level < crop.levelReq;
        return this.ledgerRow({
          key: `plantrow:${seed}`,
          iconUrl: itemIconUrl(seed, 40),
          name: crop?.name ?? itemDef(seed)?.name ?? seed,
          note: locked ? `lvl ${crop!.levelReq}` : `× ${held.get(seed)!.toLocaleString()}`,
          noteTone: locked ? 'lock' : 'ok',
          selected: showing.sel === seed,
          onPick: () => {
            showing.sel = seed;
            this.renderPlant();
          },
        });
      }),
      8,
    );

    // The chosen seed, laid out large.
    const seed = showing.sel;
    const crop = CROP_BY_SEED.get(seed);
    const sown = GROWTH_SEEDS.has(seed);
    const locked = crop !== undefined && level < crop.levelReq;
    const head = document.createElement('div');
    head.className = 'work-head';
    head.appendChild(iconTile(itemIconUrl(seed, 64)));
    const titles = document.createElement('div');
    const name = document.createElement('div');
    name.className = 'work-name';
    name.textContent = crop?.name ?? itemDef(seed)?.name ?? seed;
    const sub = document.createElement('div');
    sub.className = 'work-sub';
    sub.textContent = crop ? `farming · level ${crop.levelReq}` : 'planting · wild ground';
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
    fact('to grow', crop ? `~${crop.growMinutes} min` : 'the world decides');
    fact('seeds held', held.get(seed)!.toLocaleString());
    this.craftDetail.appendChild(facts);

    this.craftDetail.appendChild(sectionHead(sown ? 'Into wild earth' : 'In the furrow'));
    this.craftDetail.appendChild(this.materialRow(seed, 1));

    const actions = document.createElement('div');
    actions.className = 'work-actions';
    if (locked) {
      const lockNote = document.createElement('span');
      lockNote.className = 'lock-note';
      lockNote.textContent = `Reach farming ${crop!.levelReq} to plant this`;
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
    this.renderCompost();
  }

  private renderCompost(): void {
    if (this.showing?.kind !== 'compost') return;
    const showing = this.showing;
    const { tx, ty } = showing;
    this.craftTools.innerHTML = '';
    this.craftList.innerHTML = '';
    this.craftDetail.innerHTML = '';
    const bin = farmBins.get(farmKey(tx, ty)) ?? { fill: 0, graded: 0, readyAt: 0 };
    const working = bin.readyAt !== 0 && Date.now() < bin.readyAt;
    const ready = bin.readyAt !== 0 && Date.now() >= bin.readyAt;

    // Tally what the pack can feed the heap (honest goods only —
    // stolen slots are refused at the server door and never listed).
    const held = new Map<string, { qty: number; worth: number; graded: number }>();
    for (const slot of this.getInventory()) {
      if (!slot || slot.stolen) continue;
      const worth = compostWorthOf(slot.item, itemDef(slot.item));
      if (!worth) continue;
      const row = held.get(slot.item) ?? { qty: 0, ...worth };
      row.qty += slot.qty;
      held.set(slot.item, row);
    }

    if (working || ready) {
      const note = document.createElement('div');
      note.className = 'make-empty';
      note.textContent = ready
        ? 'The batch is done. Close this and turn the bin out.'
        : `The heap is working. About ${Math.max(1, Math.ceil((bin.readyAt - Date.now()) / 60_000))} min.`;
      this.craftList.appendChild(note);
    } else if (held.size === 0) {
      const empty = document.createElement('div');
      empty.className = 'make-empty';
      empty.textContent = 'Nothing in your pack would feed the heap. Spare produce, seeds, and spoiled cooking all serve.';
      this.craftList.appendChild(empty);
    } else {
      const items = [...held.keys()];
      if (!showing.sel || !held.has(showing.sel)) showing.sel = items[0]!;
      this.dealIntoLedger(
        this.craftList,
        'compost',
        items.map((item) => {
          const row = held.get(item)!;
          return this.ledgerRow({
            key: `compostrow:${item}`,
            iconUrl: itemIconUrl(item, 40),
            name: itemDef(item)?.name ?? item,
            note: `× ${row.qty.toLocaleString()}`,
            noteTone: 'ok',
            selected: showing.sel === item,
            onPick: () => {
              showing.sel = item;
              this.renderCompost();
            },
          });
        }),
        8,
      );
    }

    // The bin itself, laid out large: the fill meter is the story.
    const head = document.createElement('div');
    head.className = 'work-head';
    head.appendChild(iconTile(itemIconUrl(bin.graded >= COMPOST_PRIME_WORTH ? 'prime_compost' : 'compost', 64)));
    const titles = document.createElement('div');
    const name = document.createElement('div');
    name.className = 'work-name';
    name.textContent = working ? 'The heap works' : ready ? 'Ready to turn out' : 'Feeding the heap';
    const sub = document.createElement('div');
    sub.className = 'work-sub';
    sub.textContent = 'farming · the station works while you wander';
    titles.append(name, sub);
    head.appendChild(titles);
    this.craftDetail.appendChild(head);

    const facts = document.createElement('div');
    facts.className = 'work-facts';
    const fact = (label: string, value: string): void => {
      const f = document.createElement('div');
      f.className = 'work-fact';
      const v = document.createElement('strong');
      v.textContent = value;
      const l = document.createElement('span');
      l.textContent = label;
      f.append(v, l);
      facts.appendChild(f);
    };
    fact('the heap', `${Math.min(bin.fill, COMPOST_BATCH_WORTH)} of ${COMPOST_BATCH_WORTH}`);
    fact('good measures', `${bin.graded} of ${COMPOST_PRIME_WORTH} for prime`);
    this.craftDetail.appendChild(facts);

    if (!working && !ready && showing.sel) {
      const sel = showing.sel;
      const worth = held.get(sel);
      if (worth) {
        this.craftDetail.appendChild(sectionHead('Into the heap'));
        this.craftDetail.appendChild(this.materialRow(sel, 1));
        const actions = document.createElement('div');
        actions.className = 'work-actions';
        actions.appendChild(
          bigButton(worth.worth > 1 ? `Add (+${worth.worth})` : 'Add', `compost:${sel}`, () => {
            // Slot-addressed at send time: the first honest slot
            // holding the chosen item speaks for it.
            const slots = this.getInventory();
            for (let i = 0; i < slots.length; i++) {
              const s = slots[i];
              if (s && s.item === sel && !s.stolen) {
                this.onCompost?.(tx, ty, i);
                return;
              }
            }
          }),
        );
        this.craftDetail.appendChild(actions);
      }
    }
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
    this.renderTrough();
  }

  private renderTrough(): void {
    if (this.showing?.kind !== 'trough') return;
    const showing = this.showing;
    const { tx, ty } = showing;
    this.craftTools.innerHTML = '';
    this.craftList.innerHTML = '';
    this.craftDetail.innerHTML = '';
    const feed = farmTroughs.get(farmKey(tx, ty))?.feed ?? 0;

    const held = new Map<string, { qty: number; worth: number }>();
    for (const slot of this.getInventory()) {
      if (!slot || slot.stolen) continue;
      const worth = feedWorthOf(slot.item, gradeOf, (base) => GRADED_PRODUCE.has(base));
      if (worth === null) continue;
      const row = held.get(slot.item) ?? { qty: 0, worth };
      row.qty += slot.qty;
      held.set(slot.item, row);
    }

    if (feed >= TROUGH_FEED_CAP) {
      const note = document.createElement('div');
      note.className = 'make-empty';
      note.textContent = 'The manger is heaped full. The herd approves.';
      this.craftList.appendChild(note);
    } else if (held.size === 0) {
      const empty = document.createElement('div');
      empty.className = 'make-empty';
      empty.textContent = 'Nothing in your pack would feed the herd. Barley and spare produce serve.';
      this.craftList.appendChild(empty);
    } else {
      const items = [...held.keys()];
      if (!showing.sel || !held.has(showing.sel)) showing.sel = items[0]!;
      this.dealIntoLedger(
        this.craftList,
        'trough',
        items.map((item) => {
          const row = held.get(item)!;
          return this.ledgerRow({
            key: `troughrow:${item}`,
            iconUrl: itemIconUrl(item, 40),
            name: itemDef(item)?.name ?? item,
            note: `× ${row.qty.toLocaleString()}`,
            noteTone: 'ok',
            selected: showing.sel === item,
            onPick: () => {
              showing.sel = item;
              this.renderTrough();
            },
          });
        }),
        8,
      );
    }

    const head = document.createElement('div');
    head.className = 'work-head';
    head.appendChild(iconTile(itemIconUrl('barley', 64)));
    const titles = document.createElement('div');
    const name = document.createElement('div');
    name.className = 'work-name';
    name.textContent = feed > 0 ? 'The herd eats well' : 'An empty manger';
    const sub = document.createElement('div');
    sub.className = 'work-sub';
    sub.textContent = 'beastcraft · a fed animal gives its best';
    titles.append(name, sub);
    head.appendChild(titles);
    this.craftDetail.appendChild(head);

    const facts = document.createElement('div');
    facts.className = 'work-facts';
    const fact = (label: string, value: string): void => {
      const f = document.createElement('div');
      f.className = 'work-fact';
      const v = document.createElement('strong');
      v.textContent = value;
      const l = document.createElement('span');
      l.textContent = label;
      f.append(v, l);
      facts.appendChild(f);
    };
    fact('the manger', `${feed} of ${TROUGH_FEED_CAP}`);
    fact('each collect', 'eats one measure');
    this.craftDetail.appendChild(facts);

    if (feed < TROUGH_FEED_CAP && showing.sel) {
      const sel = showing.sel;
      const worth = held.get(sel);
      if (worth) {
        this.craftDetail.appendChild(sectionHead('Into the manger'));
        this.craftDetail.appendChild(this.materialRow(sel, 1));
        const actions = document.createElement('div');
        actions.className = 'work-actions';
        actions.appendChild(
          bigButton(worth.worth > 1 ? `Feed (+${worth.worth})` : 'Feed', `trough:${sel}`, () => {
            const slots = this.getInventory();
            for (let i = 0; i < slots.length; i++) {
              const s = slots[i];
              if (s && s.item === sel && !s.stolen) {
                this.onTrough?.(tx, ty, i);
                return;
              }
            }
          }),
        );
        this.craftDetail.appendChild(actions);
      }
    }
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
    this.renderWork();
  }

  private renderWork(): void {
    if (this.showing?.kind !== 'work') return;
    const showing = this.showing;
    const { tx, ty, work } = showing;
    this.craftTools.innerHTML = '';
    this.craftList.innerHTML = '';
    this.craftDetail.innerHTML = '';
    const job = farmJobs.get(farmKey(tx, ty));
    const running = job && job.qty > 0 ? WORK_RECIPES.get(job.recipe) : undefined;

    // How many units of a recipe the pack covers (any grade serves).
    const familyCount = (base: string): number => {
      let n = 0;
      for (const s of this.getInventory()) {
        if (s && !s.stolen && gradeOf(s.item).base === base) n += s.qty;
      }
      return n;
    };
    const canLoad = (r: WorkRecipeDef): number => {
      let n = WORK_BATCH_CAP;
      for (const i of r.inputs) n = Math.min(n, Math.floor(familyCount(i.item) / i.qty));
      return n;
    };

    if (running && job) {
      const done = workDone(running, job.startedAt, job.qty, Date.now());
      const note = document.createElement('div');
      note.className = 'make-empty';
      note.textContent =
        done > 0
          ? `${done} measure${done > 1 ? 's' : ''} ready. Close this and collect.`
          : `${running.name} runs: ${job.qty} queued, about ${Math.max(1, Math.ceil((job.startedAt + running.minutes * 60_000 - Date.now()) / 60_000))} min to the next.`;
      this.craftList.appendChild(note);
    } else {
      const recipes = workRecipesFor(work);
      if (!showing.sel || !WORK_RECIPES.has(showing.sel)) showing.sel = recipes[0]?.id ?? null;
      this.dealIntoLedger(
        this.craftList,
        'work',
        recipes.map((r) =>
          this.ledgerRow({
            key: `workrow:${r.id}`,
            iconUrl: itemIconUrl(r.output.item, 40),
            name: r.name,
            note: canLoad(r) > 0 ? `× ${canLoad(r)}` : `lvl ${r.levelReq}`,
            noteTone: canLoad(r) > 0 ? 'ok' : 'lock',
            selected: showing.sel === r.id,
            onPick: () => {
              showing.sel = r.id;
              this.renderWork();
            },
          }),
        ),
        8,
      );
    }

    const sel = !running && showing.sel ? WORK_RECIPES.get(showing.sel) : running;
    if (!sel) return;
    const head = document.createElement('div');
    head.className = 'work-head';
    head.appendChild(iconTile(itemIconUrl(sel.output.item, 64)));
    const titles = document.createElement('div');
    const name = document.createElement('div');
    name.className = 'work-name';
    name.textContent = sel.name;
    const sub = document.createElement('div');
    sub.className = 'work-sub';
    sub.textContent = `${sel.skill} · level ${sel.levelReq} · ${sel.minutes} min a measure`;
    titles.append(name, sub);
    head.appendChild(titles);
    this.craftDetail.appendChild(head);

    const facts = document.createElement('div');
    facts.className = 'work-facts';
    const fact = (label: string, value: string): void => {
      const f = document.createElement('div');
      f.className = 'work-fact';
      const v = document.createElement('strong');
      v.textContent = value;
      const l = document.createElement('span');
      l.textContent = label;
      f.append(v, l);
      facts.appendChild(f);
    };
    fact('the batch', 'as good as its weakest measure');
    fact('xp at collect', `${sel.xp} a measure`);
    this.craftDetail.appendChild(facts);

    if (!running) {
      this.craftDetail.appendChild(sectionHead('Into the station'));
      for (const input of sel.inputs) this.craftDetail.appendChild(this.materialRow(input.item, input.qty));
      const n = canLoad(sel);
      const actions = document.createElement('div');
      actions.className = 'work-actions';
      for (const qty of [1, 5, WORK_BATCH_CAP]) {
        if (qty > 1 && n < qty) continue;
        const btn = bigButton(qty === 1 ? 'Load 1' : `Load ${qty}`, `work:${sel.id}:${qty}`, () => {
          this.onWork?.(tx, ty, sel.id, qty);
          this.closeAll();
        });
        if (n < 1) btn.disabled = true;
        actions.appendChild(btn);
      }
      this.craftDetail.appendChild(actions);
    }
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
    // Unhide BEFORE the render: the ledger's first measure must see an
    // honest height, so the first deal is the only deal (no visible
    // re-deal from the ResizeObserver a frame later).
    this.craftPanel.classList.remove('hidden');
    this.renderCraft();
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

    this.dealIntoLedger(
      this.craftList,
      'unmake',
      rows.map((row) => {
        const result = unmakingOf(row.item, row.roll);
        const dust = result?.yields.find((y) => y.item === 'arcane_dust')?.qty ?? 0;
        return this.ledgerRow({
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
        });
      }),
      8,
    );

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

  // THE BENCH NAMES ITS TEACHERS: the rumor line points at a real
  // door. Taught lore names its teacher and town (TRAINER_DIRECTORY);
  // found lore stays a rumor of the wilds. Returns null when this
  // station keeps no secrets from the character.
  private craftRumor(all: readonly RecipeDef[], known: ReadonlySet<string>): string | null {
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
    const rumor = this.craftRumor(all, known);
    if (recipes.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'make-empty';
      empty.textContent = rumor
        ? `You know no recipes for this station yet. ${rumor}`
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
        ['az', 'A-Z'],
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

    const dealt: HTMLElement[] = rows.map((recipe) => {
      const level = levelForXp(skills[recipe.skill] ?? 0);
      const locked = level < recipe.levelReq;
      const count = this.makeable(recipe);
      return this.ledgerRow({
        key: `recipe:${recipe.id}`,
        iconUrl: (img) => queueItemIcon(img, recipe.output.item, 40),
        name: recipe.name,
        note: locked ? `lvl ${recipe.levelReq}` : count > 0 ? `× ${count}` : 'short',
        noteTone: locked ? 'lock' : count > 0 ? 'ok' : 'short',
        selected: showing.sel === recipe.id,
        onPick: () => {
          showing.sel = recipe.id;
          this.renderCraft();
        },
      });
    });
    // The rumor line: how much this station still keeps from you.
    if (undiscovered > 0 && rumor) {
      const hint = document.createElement('div');
      hint.className = 'make-undiscovered';
      hint.textContent = rumor;
      dealt.push(hint);
    }
    this.dealIntoLedger(this.craftList, `craft:${station ?? 'handiwork'}`, dealt, 8);

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
    fact(locked ? '·' : `× ${count}`, 'you can make', locked ? undefined : count > 0 ? 'var(--green)' : 'var(--red-soft)');
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
    // Unhide before the render — the vault ledger's first measure must
    // see an honest height (same law as openCraft).
    this.bankPanel.classList.remove('hidden');
    this.syncBodyClass();
    this.renderBank();
  }

  refreshBank(
    items: Record<string, number>,
    gear?: Array<{ id: number; item: string; roll: ItemRoll }>,
  ): void {
    this.lastBank = items;
    if (gear) this.lastBankGear = gear;
    if (this.bankOpen) this.renderBank();
  }

  /** The vault's shelving law: what family a stored good belongs to. */
  private familyOf(item: string): 'gear' | 'food' | 'mats' {
    const def = itemDef(item);
    return def?.equipSlot ? 'gear' : def?.heals ? 'food' : 'mats';
  }

  /**
   * Deal prebuilt rows into a paged ledger — NOTHING LIVES BELOW THE
   * FOLD for every maker's list. The reader's place survives the
   * wholesale re-renders the pack mirror forces.
   */
  private dealIntoLedger(
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

  /** One vault socket — goods pile or rolled armory piece. */
  private vaultCell(opts: {
    navkey: string;
    acta: string;
    item: string;
    qty?: number;
    roll?: ItemRoll;
    selected?: boolean;
    onPick: () => void;
  }): HTMLElement {
    const cell = document.createElement('div');
    cell.className =
      'inv-slot vault-slot clickable' + (opts.roll ? ` rarity-${opts.roll.rar}` : '');
    if (opts.selected) cell.classList.add('selected');
    cell.dataset.nav = '';
    cell.dataset.navkey = opts.navkey;
    cell.dataset.acta = opts.acta;
    cell.dataset.tipname = opts.roll
      ? instanceName(opts.item, opts.roll)
      : (itemDef(opts.item)?.name ?? opts.item);
    cell.dataset.lootitem = opts.item;
    cell.dataset.lootqty = String(opts.qty ?? 1);
    if (opts.roll) cell.dataset.lootroll = JSON.stringify(opts.roll);
    const img = document.createElement('img');
    img.className = 'inv-item';
    // A full vault is a first-open burst — the sockets fill through
    // the budgeted lane (cached piles still land synchronously).
    queueItemIcon(img, opts.item, 48);
    img.draggable = false;
    cell.appendChild(img);
    if (opts.qty !== undefined && opts.qty > 1) {
      const q = document.createElement('span');
      q.className = 'inv-qty';
      q.textContent = opts.qty > 9999 ? `${Math.floor(opts.qty / 1000)}k` : opts.qty.toLocaleString();
      cell.appendChild(q);
    }
    cell.addEventListener('click', opts.onPick);
    return cell;
  }

  /**
   * The Vault (Grand Refit Ph5): stored goods dealt onto paged
   * LEAVES of sockets — family tabs shelve them, the armory hangs on
   * its own tab when rolled gear exists, and nothing hides behind a
   * scrollbar. Pick a pile and the counter beneath offers Take 1/5/
   * All. Hover or focus any socket for the full item card.
   */
  private renderBank(): void {
    this.bankList.innerHTML = '';
    this.bankArmory.innerHTML = '';
    this.bankDetail.innerHTML = '';
    this.bankTools.innerHTML = '';
    this.bankArmory.classList.add('hidden');
    if (this.bankSel && !this.lastBank[this.bankSel]) this.bankSel = null;
    if (this.bankTab === 'armory' && this.lastBankGear.length === 0) this.bankTab = 'all';

    const entries = Object.entries(this.lastBank).sort(([a, an], [b, bn]) =>
      this.bankSort === 'qty'
        ? bn - an || a.localeCompare(b)
        : (itemDef(a)?.name ?? a).localeCompare(itemDef(b)?.name ?? b),
    );

    if (entries.length === 0 && this.lastBankGear.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'make-empty';
      empty.textContent = 'Your vault is empty. Deposit from the pack beside you.';
      this.bankList.appendChild(empty);
      this.bankDetail.classList.add('hidden');
      return;
    }

    // ---- the shelving tabs: families, armory last when it hangs.
    const tabs: Array<{ id: string; label: string }> = [
      { id: 'all', label: 'All' },
      { id: 'gear', label: 'Gear' },
      { id: 'food', label: 'Food' },
      { id: 'mats', label: 'Mats' },
    ];
    if (this.lastBankGear.length > 0) tabs.push({ id: 'armory', label: 'Armory' });
    const rail = tabRail(
      tabs,
      (id) => {
        this.bankTab = id as typeof this.bankTab;
        this.leafAt['bank'] = 0;
        this.renderBank();
      },
      'banktab',
    );
    rail.setActive(this.bankTab);
    this.bankTools.appendChild(rail.root);
    if (this.bankTab !== 'armory' && entries.length > 1) {
      this.sortBar(
        this.bankTools,
        'bank',
        [
          ['az', 'A-Z'],
          ['qty', 'Most stored'],
        ],
        this.bankSort,
        (k) => {
          this.bankSort = k;
          this.renderBank();
        },
        // The family tabs already stand in this strip — keep them.
        { keep: true },
      );
    }

    // ---- the wall, dealt onto leaves: rows of eight sockets.
    const PER_ROW = 8;
    const cells: HTMLElement[] =
      this.bankTab === 'armory'
        ? this.lastBankGear.map((g) =>
            this.vaultCell({
              navkey: `bankgear:${g.id}`,
              acta: 'Take',
              item: g.item,
              roll: g.roll,
              onPick: () => this.onBank('withdraw', g.item, 1, g.id),
            }),
          )
        : entries
            .filter(([item]) => this.bankTab === 'all' || this.familyOf(item) === this.bankTab)
            .map(([item, qty]) =>
              this.vaultCell({
                navkey: `bank:${item}`,
                acta: 'Choose',
                item,
                qty,
                selected: this.bankSel === item,
                onPick: () => {
                  this.bankSel = item;
                  this.renderBank();
                },
              }),
            );
    const rows: HTMLElement[] = [];
    for (let i = 0; i < cells.length; i += PER_ROW) {
      const row = document.createElement('div');
      row.className = 'vault-row';
      row.append(...cells.slice(i, i + PER_ROW));
      rows.push(row);
    }
    this.dealIntoLedger(
      this.bankList,
      'bank',
      rows,
      4,
      this.bankTab === 'armory' ? undefined : 'Nothing shelved here yet.',
    );

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
