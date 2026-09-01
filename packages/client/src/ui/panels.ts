import { SKILL_FACE, WIELD_WORD } from './panelFaces.js';
export { SKILL_FACE, WIELD_WORD } from './panelFaces.js';
import * as artsWing from './panelsArts.js';
import {
  CAST_STILL_FACTOR,
  QUALITY_BASE,
  DUNGEON_TIER_LAWS,
  PASSIVES,
  HIDDEN_SKILLS,
  RANK_ROMAN,
  SKILL_IDS,
  TECHNIQUE_MAX_RANK,
  dungeonSpecFromRoll,
  focusBudget,
  callingCost,
  honedAbility,
  isStowedSlot,
  keyUsesForTier,
  keyUsesLeft,
  levelForXp,
  rankLevel,
  masteryXp,
  skillName,
  techniqueAnchor,
  techniqueRankFor,
  xpForLevel,
  type EquipSlot,
  type EquippedItem,
  type InvSlot,
  type ItemRoll,
  type Look,
  type SkillId,
  type SkillXp,
  type TechniqueDef,
} from '@arx/shared';
import {
  ARMOR_CLASS_BLURB,
  ELEMENT_COLORS,
  abilityDef,
  aggregateGearStats,
  callingDef,
  callingsFor,
  callingRank,
  CALLING_MAX_RANK,
  honedCalling,
  type CallingCondition,
  type CallingEffect,
  type CallingGrant,
  type PerkId,
  describeAction,
  describeEffect,
  describeTrigger,
  effectiveReq,
  enchantDef,
  bondedEffects,
  qualityWord,
  setWordsFor,
  instanceName,
  isTwoHanded,
  itemDef,
  movesetFor,
  rolledStats,
  secretArtsFor,
  setName,
  techniquePoolDef,
  techniquesFor,
  trinketPowerMult,
  type CallingDef,
  type GearStats,
  type ItemDef,
} from '@arx/content';
import { itemIconUrl, slotGlyphUrl } from '../render/icons.js';
import { abilityIconUrl, passiveIconUrl, queueAbilityIcon } from '../render/abilityIcons.js';
import { bigButton, sectionHead } from './panel.js';
import { lookFigure } from '../cms/portraits.js';
import { bindings, padGlyph, type ActionId } from '../input/bindings.js';
import { RARITY_COLORS, rarityOfInstance } from './rarity.js';
import { seatChip, glyphLine } from './kit/glyphs.js';
import { beltEligible, beltPin, setBeltPin } from './beltSlot.js';
import {
  closeSheet,
  openSheet,
  registerSheetProvider,
  type SheetVerb,
} from './kit/contextSheet.js';
import { ringGauge } from './kit/ring.js';
import { socket, type Socket } from './kit/plates.js';
import { attachAmbient } from './kit/ambient.js';
import { provingGround, type ProvingGround } from './artDiagram.js';

/** Card display colors for the three armor weight classes. */

const CLASS_COLORS: Record<string, string> = {
  cloth: '#c9a8e8',
  leather: '#b08a5c',
  plate: '#9aa2ac',
};

/** Card chip tints for a staff's Arx school — matched to its bolts. */
const ELEMENT_CHIPS: Record<string, string> = {
  arcane: '#b49af0',
  ember: '#ff8a4a',
  frost: '#8ac4e8',
  storm: '#ffe86a',
  verdant: '#7ac46a',
  void: '#8a6ac8',
  radiant: '#ffd98a',
  blood: '#d95763',
  astral: '#9ae8de',
};

/** Human name for an affix stat ('arx' → 'Arx', 'maxHp' → 'Max HP'). */
function affixName(stat: string): string {
  if (stat === 'maxHp') return 'Max HP';
  if (stat === 'regen') return 'Regen /4s';
  return stat.charAt(0).toUpperCase() + stat.slice(1);
}


/**
 * One quiet line under each skill's name — what the craft IS. Shared
 * with the level-up plaque, which says it once as the citation line.
 */
export const SKILL_STORY: Record<string, string> = {
  vitality: 'Health and the will to keep it',
  combat: 'Every fight, whatever the hand holds',
  onehand: 'Blades, bludgeons and closed distance',
  defence: 'Standing where the blow lands',
  archery: 'The long shot and the quick draw',
  arx: 'Eight schools, one focused mind',
  mining: 'Ore called out of the rock',
  woodcutting: 'Timber felled clean',
  fishing: 'Patience at the water',
  smithing: 'Metal made useful',
  woodworking: 'Lumber shaped to purpose',
  leatherworking: 'Hide cured into armor',
  tailoring: 'Thread, cloth and cut',
  cooking: 'Fire turned into meals',
  construction: 'Walls raised by hand',
  farming: 'Seeds seen through to harvest',
  foraging: 'The wild pantry, read closely',
  herbalism: 'Leaf and root distilled',
  enchanting: 'Power bound into gear',
  beastcraft: 'The wild answers a gentle hand',
  sneak: 'Unseen, unheard, unhurried',
  twohand: 'Both hands, one argument',
  polearm: 'The point that gets there first',
  dualwield: 'A blade in each fist',
  shield: 'What the wall stops, the wall learns',
};

/**
 * The hall's wings: every discipline shown in its own gallery. Hidden
 * skills only ever surface in the Secret Arts wing, by row-presence.
 */
const SKILL_WINGS: Array<{ title: string; skills: SkillId[] }> = [
  {
    title: 'Combat Arts',
    skills: ['vitality', 'combat', 'onehand', 'twohand', 'polearm', 'defence', 'archery', 'arx'],
  },
  {
    title: 'Fieldcraft',
    skills: ['mining', 'woodcutting', 'fishing', 'farming', 'foraging', 'herbalism'],
  },
  {
    title: "Maker's Arts",
    skills: [
      'smithing',
      'woodworking',
      'leatherworking',
      'tailoring',
      'cooking',
      'construction',
      'enchanting',
      'beastcraft',
    ],
  },
  { title: 'Secret Arts', skills: ['sneak', 'dualwield', 'shield'] },
];

/**
 * The armor stand's sockets, in pad-walk order. Each hangs at its
 * body place via a CSS grid-area named after the slot itself
 * (#equip-anatomy's grid-template-areas is the single map).
 */
const EQUIP_SLOTS = [
  'cape',
  'head',
  'sigil',
  'weapon',
  'body',
  'offhand',
  'gloves',
  'legs',
  'relic',
  'tool',
  'boots',
  // THE RACK (THE SECOND GRIP): the waiting pair hangs a quiet band
  // under the stand — the feature's home now that the body shows only
  // the active set (THE QUIET BACK).
  'stowWeapon',
  'stowOffhand',
] as const satisfies readonly EquipSlot[];
/** Compile-time roll call: a slot added to the shared EquipSlot union
 *  fails HERE until it is given a place on the stand. */
type MissingEquipSlot = Exclude<EquipSlot, (typeof EQUIP_SLOTS)[number]>;
const equipSlotsComplete: [MissingEquipSlot] extends [never] ? true : { missing: MissingEquipSlot } = true;
void equipSlotsComplete;

/** The rack's sockets speak plain names, never their wire ids. */
const SLOT_NAMES: Partial<Record<EquipSlot, string>> = {
  stowWeapon: 'ready weapon',
  stowOffhand: 'ready off hand',
};

/**
 * Explicit verbs the item context menu can dispatch. 'offhand' and
 * 'stowOffhand' are THE DELIBERATE PAIR: a one-handed blade aimed at
 * the off hand by name (the hands, or the ready row).
 */
export type SlotAction = 'use' | 'stow' | 'offhand' | 'stowOffhand' | 'deposit' | 'sell' | 'drop';

/**
 * The character screen + skills hall (DOM overlay UI), plus the two
 * pieces of the item-inspection layer that ride with them:
 * - the INSPECT CARD: a detail card raised beside whatever item cell
 *   the mouse hovers or the pad focuses — stats, granted abilities,
 *   passives, flavor, value;
 * - the CONTEXT MENU: right-click (or Ⓨ on pad) opens the item's verb
 *   list — Equip/Eat, Deposit/Sell in a station, Drop.
 */
export class Panels {
  private readonly invPanel = document.getElementById('inventory-panel')!;
  private readonly invGrid = document.getElementById('inventory-grid')!;
  private readonly equipAnatomy = document.getElementById('equip-anatomy')!;
  private readonly coinReadout = document.getElementById('coin-readout')!;
  private readonly packFill = document.getElementById('pack-fill')!;
  private readonly packFilters = document.getElementById('pack-filters')!;
  /** The pack's lens: dims sockets outside the chosen family. */
  private packFilter: 'all' | 'gear' | 'food' | 'mats' = 'all';
  private readonly identName = document.getElementById('char-name')!;
  private readonly identDeed = document.getElementById('char-deed')!;
  private readonly skillsPanel = document.getElementById('skills-panel')!;
  private readonly skillsWall = document.getElementById('skills-wall')!;
  private readonly skillsHero = document.getElementById('skills-hero')!;
  /** The skill standing on the hero pane. */
  private skillSel: SkillId | null = null;
  readonly artsPanel = document.getElementById('arts-panel')!;
  readonly artsRail = document.getElementById('arts-rail')!;
  readonly artsLoadout = document.getElementById('arts-loadout')!;
  readonly artsSchools = document.getElementById('arts-schools')!;
  readonly artsDetail = document.getElementById('arts-detail')!;
  /** THE PROVING GROUND: the live diagram pane of the chosen art. */
  private readonly artsGroundHost = document.getElementById('arts-ground')!;
  readonly ground: ProvingGround = provingGround();
  /** The Hand's two art seats, kept for the seat-flight landing flash. */
  altarSockets: Socket[] = [];
  /** The technique the codex bench is laying out (null = auto-pick). */
  artsSel: string | null = null;
  /** The school standing on the stage (the rail's choice). */
  artsSchoolSel: SkillId | null = null;
  /** Which wing of the codex is open: the actives or the passives. */
  artsWing: 'arts' | 'callings' = 'arts';
  /** THE OPEN HALL: the skill whose calling ladder stands on the stage. */
  callingSkillSel: SkillId | null = null;
  /** The Calling the bench is laying out (callings wing). */
  callingSel: string | null = null;
  /** Answered Callings, mirrored from the server. */
  callings: string[] = [];
  /** APPLIED ranks past I by id (absent = Rank I). */
  private callingRanks: Record<string, number> = {};
  /** Unlocked techniques the player has inspected — the NEW-pip ledger. */
  readonly seenTech = new Set<string>(
    (() => {
      try {
        const raw = JSON.parse(localStorage.getItem('arx.techSeen') ?? '[]');
        return Array.isArray(raw) ? (raw as string[]) : [];
      } catch {
        return [];
      }
    })(),
  );
  /** Unlocked Callings the player has inspected — the NEW-pip ledger. */
  readonly seenCallings = new Set<string>(
    (() => {
      try {
        const raw = JSON.parse(localStorage.getItem('arx.callSeen') ?? '[]');
        return Array.isArray(raw) ? (raw as string[]) : [];
      } catch {
        return [];
      }
    })(),
  );
  private readonly gearStrip = document.getElementById('gear-strip')!;
  /**
   * THE HERO'S ALCOVE: the arched niche at the stand's heart where the
   * player's LIVE rig stands, painted by the world's own hand
   * (cms/portraits lookFigure) wearing every worn piece. Persistent
   * nodes — renderEquipment re-appends them after each rebuild so the
   * figure never flickers through an innerHTML wipe.
   */
  private readonly figureAlcove = document.createElement('div');
  private readonly alcoveFigure = document.createElement('div');
  /** The worn-kit signature of the standing figure (bloom on change). */
  private figureSig: string | null = null;
  /** THE BENCH: the open case's standing inspector tray. */
  private readonly benchCard = document.getElementById('bench-card')!;
  private readonly benchEmpty = document.getElementById('bench-empty')!;
  private readonly benchActs = document.getElementById('bench-acts')!;
  /** What lies on the bench (survives hover leaving the cell). */
  private benchSource:
    | { kind: 'inv'; slot: number }
    | { kind: 'equip'; slot: string }
    | null = null;
  private readonly card: HTMLElement;
  private readonly menu: HTMLElement;
  /** THE FREE HAND: the one slotted technique, mirrored from the server. */
  /** THE SECOND HAND: the seated techniques, [Q, R] (server truth). */
  techniques: [string | null, string | null] = [null, null];
  /** THE LESSON LAW's banks (server truth; cost derives from the dial). */
  lessons: Record<string, number> = {};
  /** Hidden arts earned by deed, mirrored from the server. */
  private earnedArts: string[] = [];
  lastSkills: SkillXp = {};
  private lastSlots: InvSlot[] = [];
  lastEquipment: Partial<Record<string, EquippedItem>> = {};
  /**
   * ONE TRUTH FOR THE COUNT (visible-buildcraft V3): the aggregate of
   * the worn kit, computed ONCE per equipment push by the shared
   * aggregator. Every House surface (court, card, anatomy pips, pack
   * marks, compare) reads `setCounts` from here — the hand-rolled
   * per-card counter is dead.
   */
  private lastGearStats: GearStats | null = null;
  /** What the inspect card currently shows (to refresh on re-render). */
  private cardSource: { kind: 'inv'; slot: number } | { kind: 'equip'; slot: string } | null = null;
  /** The cell the card is pinned beside (repositions on refresh). */
  private cardAnchor: HTMLElement | null = null;

  // ---- pointer drag state (mouse drag & drop between pack slots).
  private drag: {
    from: number;
    startX: number;
    startY: number;
    active: boolean;
    ghost: HTMLElement | null;
  } | null = null;

  constructor(
    private readonly onUseSlot: (slot: number) => void,
    private readonly onUnequip: (slot: EquipSlot) => void,
    readonly onTechnique: (ability: string, slot: 0 | 2) => void = () => {},
    private readonly onInvMove: (from: number, to: number, merge?: boolean) => void = () => {},
    private readonly onDropToWorld: (slot: number) => void = () => {},
    private readonly onSlotAction: (slot: number, action: SlotAction) => void = () => {},
    /** Which station conversation is open — labels the menu verbs. */
    private readonly stationContext: () => 'bank' | 'shop' | null = () => null,
    /** Active input device — the card's action hints speak its glyphs. */
    private readonly deviceMode: () => 'kb' | 'pad' = () => 'kb',
    /** Cosmetic per-hand grip preference: read current + set. */
    private readonly carryStyle: (hand: 'main' | 'off') => 'normal' | 'rogue' = () => 'normal',
    private readonly onCarryStyle: (style: 'normal' | 'rogue', hand: 'main' | 'off') => void =
      () => {},
    /** The case's owner: the name on the identity line and the look
     * the alcove's standing figure is painted from. */
    private readonly identityInfo: () => { name?: string; look?: Look | null } = () => ({}),
    /** Opens the Techniques codex (skill cards link into it). */
    private readonly onOpenArts: () => void = () => {},
    /** Answer or set down a Calling (server enforces THE FOCUS LAW). */
    readonly onCalling: (calling: string, on: boolean, rank?: number) => void = () => {},
    /** THE SECOND GRIP: fire the swap verb (the rack's Draw/Trade). */
    private readonly onSwapSets: () => void = () => {},
  ) {
    // Dock buttons are wired in main through the one screen-exclusivity
    // gate — no panel opens itself anymore.
    // The pack's filter lens: All / Gear / Food / Mats chips.
    const filterChips = new Map<'all' | 'gear' | 'food' | 'mats', HTMLButtonElement>();
    const FILTER_ORDER = ['all', 'gear', 'food', 'mats'] as const;
    for (const [key, label] of [
      ['all', 'All'],
      ['gear', 'Gear'],
      ['food', 'Food'],
      ['mats', 'Mats'],
    ] as const) {
      const chip = document.createElement('button');
      chip.className = 'sort-chip' + (key === this.packFilter ? ' active' : '');
      chip.textContent = label;
      chip.dataset.nav = '';
      chip.dataset.navkey = `packfilter:${key}`;
      chip.dataset.acta = 'Filter';
      chip.addEventListener('click', () => {
        this.packFilter = key;
        this.packFilters
          .querySelectorAll('.sort-chip')
          .forEach((el) => el.classList.toggle('active', el === chip));
        this.applyPackFilter();
      });
      filterChips.set(key, chip);
      this.packFilters.appendChild(chip);
    }
    // THE BUMPER TURNS THE LENS: the filter rail is the room's section
    // rail, so LB/RB (and LT/RT through the pager fallback) step it —
    // All to Mats without the ring ever leaving the pack. The rail
    // yields both markers while a bank or shop counter is open
    // (stationPanels.syncBodyClass), so the vault's family tabs keep
    // the bumpers there.
    this.packFilters.dataset.tabs = '';
    this.packFilters.dataset.pager = '';
    this.packFilters.addEventListener('kit-page', (e) => {
      const dir = (e as CustomEvent<-1 | 1>).detail;
      const i = FILTER_ORDER.indexOf(this.packFilter);
      const next = FILTER_ORDER[Math.max(0, Math.min(FILTER_ORDER.length - 1, i + dir))];
      if (next !== undefined && next !== this.packFilter) filterChips.get(next)?.click();
    });

    // THE HERO'S ALCOVE: built once, re-seated by every equipment
    // render. Glow behind, figure on the plinth, arch overhead.
    this.figureAlcove.id = 'figure-alcove';
    const alcoveGlow = document.createElement('div');
    alcoveGlow.className = 'alcove-glow';
    this.alcoveFigure.className = 'alcove-figure';
    this.figureAlcove.append(alcoveGlow, this.alcoveFigure);
    // THE TIDY HAND: one press sorts the whole pack server-true — by
    // kind (coins, gear, food, mats, each a-z) or by worth. Built on
    // the same invmove swaps a drag makes; no new wire.
    const tidyHost = document.getElementById('pack-tidy')!;
    const tidyLabel = document.createElement('span');
    tidyLabel.className = 'sort-label';
    tidyLabel.textContent = 'Tidy';
    tidyHost.appendChild(tidyLabel);
    for (const [mode, label] of [
      ['kind', 'Kind'],
      ['worth', 'Worth'],
    ] as const) {
      const chip = document.createElement('button');
      chip.className = 'sort-chip';
      chip.textContent = label;
      chip.dataset.nav = '';
      chip.dataset.navkey = `tidy:${mode}`;
      chip.dataset.acta = 'Tidy';
      chip.addEventListener('click', () => this.tidyPack(mode));
      tidyHost.appendChild(chip);
    }
    window.addEventListener('pointermove', (e) => this.dragMove(e));
    window.addEventListener('pointerup', (e) => this.dragEnd(e));

    this.card = document.createElement('div');
    this.card.id = 'item-card';
    this.card.className = 'hidden';
    document.body.appendChild(this.card);
    this.menu = document.createElement('div');
    this.menu.id = 'item-menu';
    this.menu.className = 'hidden';
    document.body.appendChild(this.menu);
    // A click anywhere outside the menu dismisses it.
    document.addEventListener('pointerdown', (e) => {
      if (!this.menu.classList.contains('hidden') && !this.menu.contains(e.target as Node)) {
        this.closeMenu();
      }
    });

    // Each tray of the open case breathes its own dust — the ambient
    // layer fills the flat leather behind the content (compositor-only,
    // gated by the Interface motion setting like every room's).
    for (const tray of Array.from(
      document.querySelectorAll<HTMLElement>('#inventory-panel .char-tray'),
    )) {
      attachAmbient(tray, 6);
    }

    // Ⓨ on a technique plate offers the seat sheet — the same verbs
    // the plate's own press raises.
    registerSheetProvider('art', (el) => {
      const ability = (el.dataset.navkey ?? '').slice('art:'.length);
      const def = techniquePoolDef(ability);
      if (!def) return [];
      const st = artsWing.techState(this, def.style, def);
      if (st !== 'unlocked' && st !== 'equipped') return [];
      return artsWing.seatVerbs(this, ability, st);
    });

    // THE PROVING GROUND mounts once; renderArtsBench feeds it.
    this.artsGroundHost.appendChild(this.ground.root);

    // A rebind redraws every seat chip the codex is showing.
    bindings.onChange(() => this.refreshDevice());
  }

  /**
   * The device changed hands (or the keymap changed): any open screen
   * that writes glyphs into sentences redraws for the new truth —
   * including the bench card's verb hints (a controller swap mid-
   * inspection must re-letter Equip/Options/Move).
   */
  refreshDevice(): void {
    if (this.artsOpen) artsWing.renderArts(this);
    this.refreshBench();
  }

  /**
   * Mirror the character screen's open state onto `body.inventory-open`.
   * The station-pairing CSS (character.css) used to read this panel
   * through document-scoped `body:has(...)` selectors, which re-match
   * on EVERY `.hidden` toggle anywhere in the document; a body class
   * costs only the toggle. Called from every path that shows or hides
   * the pack (the toggle/show trio and closeAll), so it never leaks.
   */
  private syncBodyClass(): void {
    document.body.classList.toggle('inventory-open', this.invOpen);
  }

  toggleInventory(): void {
    this.invPanel.classList.toggle('hidden');
    this.skillsPanel.classList.add('hidden');
    this.artsPanel.classList.add('hidden');
    this.syncBodyClass();
    if (this.invPanel.classList.contains('hidden')) this.closeInspect();
    else {
      this.renderIdentity();
      this.refreshBench();
    }
  }

  showInventory(): void {
    this.invPanel.classList.remove('hidden');
    this.skillsPanel.classList.add('hidden');
    this.artsPanel.classList.add('hidden');
    this.syncBodyClass();
    this.renderIdentity();
    this.refreshBench();
  }

  toggleSkills(): void {
    this.skillsPanel.classList.toggle('hidden');
    this.invPanel.classList.add('hidden');
    this.artsPanel.classList.add('hidden');
    this.syncBodyClass();
    this.closeInspect();
  }

  showSkills(): void {
    this.skillsPanel.classList.remove('hidden');
    this.invPanel.classList.add('hidden');
    this.artsPanel.classList.add('hidden');
    this.syncBodyClass();
    this.closeInspect();
  }

  showArts(): void {
    this.artsPanel.classList.remove('hidden');
    this.invPanel.classList.add('hidden');
    this.skillsPanel.classList.add('hidden');
    this.syncBodyClass();
    this.closeInspect();
    artsWing.renderArts(this);
  }

  get invOpen(): boolean {
    return !this.invPanel.classList.contains('hidden');
  }

  get skillsOpen(): boolean {
    return !this.skillsPanel.classList.contains('hidden');
  }

  get artsOpen(): boolean {
    return !this.artsPanel.classList.contains('hidden');
  }

  closeAll(): void {
    this.invPanel.classList.add('hidden');
    this.skillsPanel.classList.add('hidden');
    this.artsPanel.classList.add('hidden');
    this.syncBodyClass();
    this.closeInspect();
  }

  get anyOpen(): boolean {
    return (
      !this.invPanel.classList.contains('hidden') ||
      !this.skillsPanel.classList.contains('hidden') ||
      !this.artsPanel.classList.contains('hidden')
    );
  }

  // ---- drag & drop --------------------------------------------------

  private dragMove(e: PointerEvent): void {
    const d = this.drag;
    if (!d) return;
    if (!d.active) {
      if (Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < 7) return;
      // Threshold crossed: this press is a DRAG, not a click.
      d.active = true;
      this.closeMenu();
      this.hideCard();
      const src = this.invGrid.querySelector<HTMLElement>(`[data-invslot="${d.from}"]`);
      const img = src?.querySelector('img');
      src?.classList.add('drag-src');
      const ghost = document.createElement('div');
      ghost.id = 'drag-ghost';
      if (img) {
        const copy = img.cloneNode(true) as HTMLImageElement;
        ghost.appendChild(copy);
      }
      document.body.appendChild(ghost);
      d.ghost = ghost;
    }
    d.ghost!.style.transform = `translate(${e.clientX - 26}px, ${e.clientY - 26}px)`;
    // Highlight the slot under the pointer. Equipment sockets light
    // only when the carried piece can truly land there — the hover
    // never promises what the drop would refuse.
    document
      .querySelectorAll('.drop-hover')
      .forEach((el) => el.classList.remove('drop-hover'));
    const over = this.slotUnder(e);
    if (over) {
      const equip = over.dataset.equipslot as EquipSlot | undefined;
      if (equip === undefined || this.canPlaceToEquip(d.from, equip)) {
        over.classList.add('drop-hover');
      }
    }
    // THE OPEN GROUND: hovering the ground tray lights a lay-down.
    const ground = this.groundUnder(e);
    if (ground) ground.classList.add('drop-hover');
    // Over open world (or the ground tray) the ghost arms itself:
    // release here drops the item on the ground at your feet.
    d.ghost!.classList.toggle('drop-armed', this.overWorld(e) || ground !== null);
  }

  /** The inventory's ground tray under the pointer, if it stands. */
  private groundUnder(e: PointerEvent): HTMLElement | null {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    return (el?.closest('.char-ground') as HTMLElement | null) ?? null;
  }

  /** True when the pointer floats over the game canvas, not any UI. */
  private overWorld(e: PointerEvent): boolean {
    return (document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null)?.id === 'game';
  }

  private dragEnd(e: PointerEvent): void {
    const d = this.drag;
    this.drag = null;
    if (!d) return;
    if (!d.active) {
      // A plain click: the contextual use/deposit/sell action.
      this.onUseSlot(d.from);
      return;
    }
    d.ghost?.remove();
    document.querySelectorAll('.drag-src, .drop-hover').forEach((el) => {
      el.classList.remove('drag-src');
      el.classList.remove('drop-hover');
    });
    const target = this.slotUnder(e);
    if (target?.dataset.equipslot !== undefined) {
      // Dropped on an equipment socket: the manual equip, same law as
      // the pad's carry-place (THE DELIBERATE PAIR included).
      this.placeToEquip(d.from, target.dataset.equipslot as EquipSlot);
    } else if (target) {
      const to = Number(target.dataset.invslot);
      // A drag onto a slot is deliberate — same-kind stacks pour
      // together (THE MEASURED STACK's hand-merge) instead of swapping.
      if (to !== d.from) this.onInvMove(d.from, to, true);
    } else if (this.groundUnder(e)) {
      // THE OPEN GROUND: laid on the ground tray — it goes down at
      // your feet and folds into the pile by the merge law.
      this.onDropToWorld(d.from);
    } else if (this.overWorld(e)) {
      // Dragged out of the pack onto the world: let it go.
      this.onDropToWorld(d.from);
    }
  }

  private slotUnder(e: PointerEvent): HTMLElement | null {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    return (el?.closest('[data-invslot], [data-equipslot]') as HTMLElement | null) ?? null;
  }

  // ---- manual equip: pack slot onto an equipment socket -------------

  /**
   * The verb a pack slot fires when placed on an equipment socket, or
   * null when the piece can never live there. One judgment for every
   * surface that moves an item onto the anatomy stand — the pad's
   * carry-place, the mouse drag, and the drop-hover's honesty all read
   * it. A piece lands on its own socket with the plain equip; a
   * one-handed weapon aimed at the off hand rides THE DELIBERATE PAIR
   * (the server holds the dual-wield gates and refuses with words).
   * The ready row obeys the same grammar a shelf lower.
   */
  private equipActionFor(from: number, slot: EquipSlot): SlotAction | null {
    const s = this.lastSlots[from];
    if (!s) return null;
    const def = itemDef(s.item);
    if (!def?.equipSlot) return null;
    const rack = isStowedSlot(slot);
    const base: EquipSlot = slot === 'stowWeapon' ? 'weapon' : slot === 'stowOffhand' ? 'offhand' : slot;
    if (def.equipSlot === base) return rack ? 'stow' : 'use';
    if (base === 'offhand' && def.equipSlot === 'weapon' && def.weapon?.style === 'onehand') {
      return rack ? 'stowOffhand' : 'offhand';
    }
    return null;
  }

  /** True when the pack slot's piece can land on this socket. */
  canPlaceToEquip(from: number, slot: EquipSlot): boolean {
    return this.equipActionFor(from, slot) !== null;
  }

  /**
   * The socket's honest verb word for a carried pack slot — what the
   * pad's action strip may promise. Null when the piece won't fit.
   */
  placeToEquipLabel(from: number, slot: EquipSlot): string | null {
    const action = this.equipActionFor(from, slot);
    if (action === null) return null;
    return action === 'stow' || action === 'stowOffhand' ? 'Stow' : 'Equip';
  }

  /**
   * Place a pack slot onto an equipment socket. True when the verb
   * fired (the server still holds every gate); false when the piece
   * can never live there and the carry should stand.
   */
  placeToEquip(from: number, slot: EquipSlot): boolean {
    const action = this.equipActionFor(from, slot);
    if (action === null) return false;
    this.onSlotAction(from, action);
    return true;
  }

  // ---- inspect card -------------------------------------------------

  /**
   * Show the detail card for a pack/equipment cell. One path serves
   * both devices: the mouse calls it from hover, the pad from focus.
   * Returns false when the element isn't an inspectable item.
   */
  showCardFor(el: HTMLElement | null): boolean {
    // THE BENCH IS THE INSPECTOR: focus landing on a technique plate
    // renders that art on the bench in place — inspection costs no
    // press and no travel. (No card floats; the bench is the card.)
    const artKey = el?.dataset.navkey;
    if (artKey?.startsWith('art:')) {
      artsWing.inspectArt(this, artKey.slice('art:'.length));
      return false;
    }
    // The veil cap inspects like a plate: the mist tells its size.
    if (artKey?.startsWith('artveil:')) {
      artsWing.inspectArt(this, `veil:${artKey.slice('artveil:'.length)}`);
      return false;
    }
    // The hall's emblems inspect the same way: focus lights the hero.
    if (artKey?.startsWith('skill:')) {
      this.inspectSkill(artKey.slice('skill:'.length) as SkillId);
      return false;
    }
    // Ground loot rows (loot panel) and vault sockets inspect like pack
    // cells — the same full card, for gear not in your hands yet.
    const lootEl = el?.closest?.('[data-lootitem]') as HTMLElement | null;
    if (lootEl?.dataset.lootitem) {
      const roll = lootEl.dataset.lootroll
        ? (JSON.parse(lootEl.dataset.lootroll) as ItemRoll)
        : undefined;
      this.cardSource = null;
      this.cardAnchor = lootEl;
      this.renderCard(lootEl.dataset.lootitem, Number(lootEl.dataset.lootqty ?? '1'), null, roll);
      return true;
    }
    if (!el || el.dataset.filled !== '1') {
      this.hideCard();
      return false;
    }
    if (el.dataset.invslot !== undefined) {
      const idx = Number(el.dataset.invslot);
      const slot = this.lastSlots[idx];
      if (!slot) {
        this.hideCard();
        return false;
      }
      this.cardSource = { kind: 'inv', slot: idx };
      this.cardAnchor = el;
      this.renderCard(slot.item, slot.qty, null, slot.roll);
      return true;
    }
    if (el.dataset.equipslot !== undefined) {
      const worn = this.lastEquipment[el.dataset.equipslot];
      if (!worn) {
        this.hideCard();
        return false;
      }
      this.cardSource = { kind: 'equip', slot: el.dataset.equipslot };
      this.cardAnchor = el;
      this.renderCard(worn.id, 1, el.dataset.equipslot, worn.roll);
      return true;
    }
    this.hideCard();
    return false;
  }

  hideCard(): void {
    this.cardSource = null;
    this.cardAnchor = null;
    this.card.classList.add('hidden');
  }

  /** Close every transient inspect element (menu + card). */
  closeInspect(): void {
    this.hideCard();
    this.closeMenu();
  }

  // ---- the bench (the open case's standing inspector) ---------------

  /** The bench speaks when the case is open and no station is paired.
   * THE OPEN GROUND takes the bench's seat the same way a paired
   * station does — while loot lies in reach, the middle tray is the
   * ground ledger's and inspection rides the floating card. */
  private benchActive(): boolean {
    return (
      !this.invPanel.classList.contains('hidden') &&
      this.stationContext() === null &&
      !this.invPanel.classList.contains('with-ground')
    );
  }

  /**
   * Re-lay the bench from its remembered source after a state push —
   * the benched item keeps its numbers honest through equips, eats,
   * and tidies. A vanished source re-seeds.
   */
  private refreshBench(): void {
    if (!this.benchActive()) return;
    const b = this.benchSource;
    if (b?.kind === 'inv') {
      const s = this.lastSlots[b.slot];
      if (s) {
        this.cardSource = b;
        this.renderCard(s.item, s.qty, null, s.roll);
        return;
      }
    } else if (b?.kind === 'equip') {
      const w = this.lastEquipment[b.slot];
      if (w) {
        this.cardSource = b;
        this.renderCard(w.id, 1, b.slot, w.roll);
        return;
      }
    }
    this.benchSeed();
  }

  /** First lay: the worn weapon, else the first thing in the pack. */
  private benchSeed(): void {
    if (!this.benchActive()) return;
    const weapon = this.lastEquipment['weapon'];
    if (weapon) {
      this.benchSource = { kind: 'equip', slot: 'weapon' };
      this.cardSource = this.benchSource;
      this.renderCard(weapon.id, 1, 'weapon', weapon.roll);
      return;
    }
    const idx = this.lastSlots.findIndex(Boolean);
    if (idx >= 0) {
      const s = this.lastSlots[idx]!;
      this.benchSource = { kind: 'inv', slot: idx };
      this.cardSource = this.benchSource;
      this.renderCard(s.item, s.qty, null, s.roll);
      return;
    }
    this.benchSource = null;
    this.benchCard.replaceChildren();
    this.benchActs.replaceChildren();
    this.benchEmpty.classList.remove('hidden');
  }

  /** The benched item's verbs, as standing buttons under the card. */
  private renderBenchActs(): void {
    this.benchActs.replaceChildren();
    const verbs: Array<{ label: string; act: () => void; danger?: boolean; gated?: boolean }> = [];
    const src = this.benchSource;
    if (src?.kind === 'inv') {
      const idx = src.slot;
      const slot = this.lastSlots[idx];
      if (slot) {
        const def = itemDef(slot.item);
        if (def?.equipSlot) {
          // THE VERB TELLS THE GATE: an Equip the server would refuse
          // wears ember and names the bar — the button never promises
          // what the body cannot do. Short words: the band above the
          // verbs already tells the whole story.
          const gate = this.slotGate(slot);
          verbs.push({
            label: gate ? `Needs ${affixName(gate.skill)} ${gate.level}` : 'Equip',
            act: () => this.onSlotAction(idx, 'use'),
            gated: gate !== null,
          });
          // THE DELIBERATE PAIR: a one-handed blade offers the off
          // hand by name — the server holds the pairing gates.
          if (!gate && def.equipSlot === 'weapon' && def.weapon?.style === 'onehand') {
            verbs.push({ label: 'Off hand', act: () => this.onSlotAction(idx, 'offhand') });
          }
          // THE SECOND GRIP: the bench offers the ready row too. Short
          // word — the gate band above already tells the story.
          if (!gate && (def.equipSlot === 'weapon' || def.equipSlot === 'offhand')) {
            verbs.push({ label: 'Stow', act: () => this.onSlotAction(idx, 'stow') });
          }
        } else if (def?.heals) verbs.push({ label: 'Eat', act: () => this.onSlotAction(idx, 'use') });
        verbs.push({ label: 'Drop', act: () => this.onSlotAction(idx, 'drop'), danger: true });
      }
    } else if (src?.kind === 'equip') {
      const worn = this.lastEquipment[src.slot];
      if (worn && isStowedSlot(src.slot as EquipSlot)) {
        // The rack's bench: Draw trades the sets; Remove sends the
        // piece back to the pack.
        verbs.push({ label: 'Draw', act: () => this.onSwapSets() });
        verbs.push({ label: 'Remove', act: () => this.onUnequip(src.slot as EquipSlot) });
      } else if (worn) {
        verbs.push({ label: 'Remove', act: () => this.onUnequip(src.slot as EquipSlot) });
      }
    }
    for (const v of verbs) {
      const b = document.createElement('button');
      b.className = v.danger ? 'act-btn minor bench-danger' : v.gated ? 'act-btn gated' : 'act-btn';
      b.textContent = v.label;
      b.addEventListener('click', v.act);
      this.benchActs.appendChild(b);
    }
  }

  /**
   * The unmet equip gate for a pack slot, or null when the piece goes
   * on freely — the one judgment every gated surface shares.
   */
  private slotGate(slot: NonNullable<InvSlot>): { skill: SkillId; level: number } | null {
    const req = effectiveReq(slot.item, slot.roll);
    if (!req) return null;
    return levelForXp(this.lastSkills[req.skill] ?? 0) < req.level ? req : null;
  }

  /**
   * THE TIDY HAND: sort the whole pack with one press. Computes the
   * wanted order from the last server truth, then walks there as a
   * minimal chain of the same `invmove` swaps a drag makes — server-
   * true, rate-limit-friendly (staggered), no new protocol.
   */
  private tidyPack(mode: 'kind' | 'worth'): void {
    const n = Math.max(28, this.lastSlots.length);
    const slots: Array<NonNullable<InvSlot> | null> = Array.from(
      { length: n },
      (_, i) => this.lastSlots[i] ?? null,
    );
    const rank = (s: NonNullable<InvSlot>): number => {
      if (s.item === 'coins') return 0;
      const d = itemDef(s.item);
      return d?.equipSlot ? 1 : d?.heals ? 2 : 3;
    };
    const filled = slots
      .map((s, i) => ({ s, i }))
      .filter((x): x is { s: NonNullable<InvSlot>; i: number } => x.s !== null);
    filled.sort((a, b) => {
      if (mode === 'kind') {
        const r = rank(a.s) - rank(b.s);
        if (r !== 0) return r;
        const an = itemDef(a.s.item)?.name ?? a.s.item;
        const bn = itemDef(b.s.item)?.name ?? b.s.item;
        if (an !== bn) return an.localeCompare(bn);
        return b.s.qty - a.s.qty;
      }
      const av = (itemDef(a.s.item)?.value ?? 0) * a.s.qty;
      const bv = (itemDef(b.s.item)?.value ?? 0) * b.s.qty;
      if (bv !== av) return bv - av;
      return (itemDef(a.s.item)?.name ?? a.s.item).localeCompare(itemDef(b.s.item)?.name ?? b.s.item);
    });
    // Walk the permutation as swaps on a working copy: each position
    // takes its wanted occupant from wherever it currently sits.
    const cur: Array<number | null> = slots.map((s, i) => (s !== null ? i : null));
    const want: Array<number | null> = filled.map((x) => x.i);
    while (want.length < n) want.push(null);
    const swaps: Array<[number, number]> = [];
    for (let pos = 0; pos < n; pos++) {
      if (cur[pos] === want[pos]) continue;
      let j = -1;
      if (want[pos] === null) {
        for (let k = pos + 1; k < n; k++) {
          if (cur[k] === null) {
            j = k;
            break;
          }
        }
      } else {
        j = cur.indexOf(want[pos]!);
      }
      if (j < 0 || j === pos) continue;
      [cur[pos], cur[j]] = [cur[j]!, cur[pos]!];
      swaps.push([pos, j]);
    }
    // Staggered under the misc bucket (10/s, burst 20) — a full-pack
    // tidy is at most 27 swaps and lands in about two seconds.
    swaps.forEach((sw, k) => window.setTimeout(() => this.onInvMove(sw[0], sw[1]), k * 80));
  }

  /** A speed word beats raw ticks for at-a-glance weapon reads. */
  private static speedWord(cooldownTicks: number): string {
    if (cooldownTicks <= 7) return 'Quick';
    if (cooldownTicks <= 8) return 'Steady';
    return 'Deliberate';
  }

  private static categoryLine(def: ItemDef): string {
    if (def.id === 'coins') return 'Currency';
    if (def.dungeonKey) return 'Dungeon Key';
    if (def.weapon) {
      const style = def.weapon.style;
      return `Weapon · ${style.charAt(0).toUpperCase()}${style.slice(1)}`;
    }
    if (def.tool) return `Tool · ${def.tool.type.charAt(0).toUpperCase()}${def.tool.type.slice(1)}`;
    if (def.equipSlot === 'cape') return 'Cape';
    if (def.equipSlot === 'relic') return 'Relic';
    if (def.equipSlot === 'sigil') return 'Boss Sigil';
    if (def.equipSlot === 'offhand') return 'Offhand';
    if (def.equipSlot) return 'Armor';
    if (def.heals) return 'Food';
    return 'Material';
  }

  private renderCard(itemId: string, qty: number, wornSlot: string | null, roll?: ItemRoll): void {
    const def = itemDef(itemId);
    if (!def) {
      this.hideCard();
      return;
    }
    // Rolled gear derives its true numbers from the instance roll.
    const rolled = rolledStats(itemId, roll);
    // A dungeon key IS its dungeon (the seed-is-the-dungeon law): the
    // card reads the same pure spec the server generates from.
    const dungeon = def.dungeonKey ? dungeonSpecFromRoll(roll) : null;
    this.card.innerHTML = '';

    const head = document.createElement('div');
    head.className = 'card-head';
    const icon = document.createElement('img');
    icon.src = itemIconUrl(itemId, 64);
    icon.draggable = false;
    const title = document.createElement('div');
    const name = document.createElement('div');
    name.className = 'card-name';
    // A rolled instance is named by its dominant affix — "of Strength";
    // a dungeon key is named by where it leads — "The Ashen Barrow".
    name.textContent = dungeon ? dungeon.name : instanceName(itemId, roll);
    // Rarity speaks through the nameplate; legendary keeps the molten
    // gold treatment from the stylesheet.
    const tier = rarityOfInstance(itemId, roll);
    const rc = RARITY_COLORS[tier];
    // The icon well wears the tier too — quality reads at a glance.
    if (tier !== 'common' && rc) icon.style.borderColor = rc;
    if (tier !== 'legendary' && rc) {
      name.classList.add('rarity-name');
      name.style.color = rc;
    } else if (tier === 'common') {
      name.classList.add('rarity-name');
      name.style.color = 'var(--parchment)';
    }
    const cat = document.createElement('div');
    cat.className = 'card-cat';
    cat.textContent = wornSlot
      ? `${Panels.categoryLine(def)} · worn (${wornSlot})`
      : Panels.categoryLine(def);
    title.append(name, cat);
    head.append(icon, title);
    // The tier speaks for itself: a stamped seal in the head's corner.
    const seal = document.createElement('span');
    seal.className = `card-tier tier-${tier}`;
    seal.textContent = tier;
    if (rc && tier !== 'common') {
      seal.style.color = rc;
      seal.style.borderColor = rc;
    }
    head.appendChild(seal);
    this.card.appendChild(head);

    // The HEADLINE: the item's defining numbers, told huge — what you
    // read first, before any fine print.
    const headline: Array<{ v: string; l: string; c: string }> = [];
    const rolledDmg = rolled?.damage !== undefined ? rolled.damage : def.weapon?.damage;
    if (def.weapon && rolledDmg !== undefined) {
      const dmgText = Number.isInteger(rolledDmg) ? `${rolledDmg}` : rolledDmg.toFixed(1);
      headline.push({
        v: dmgText,
        l: `damage · ${Panels.speedWord(def.weapon.cooldownTicks).toLowerCase()}`,
        c: '#ff9b8a',
      });
    }
    const headArmor = rolled ? rolled.armor : def.armor ?? 0;
    if (headArmor > 0) headline.push({ v: `+${headArmor}`, l: 'armor', c: '#8ac4e8' });
    if (def.heals) headline.push({ v: `+${def.heals}`, l: 'heals HP', c: '#7dc46a' });
    if (def.tool) headline.push({ v: `${def.tool.power}`, l: 'tool power', c: '#e8b64c' });
    // A key's defining number is the level its garrison is scaled to.
    if (dungeon) {
      headline.push({
        v: `${dungeon.power}`,
        l: 'power · suggested level',
        c: RARITY_COLORS[dungeon.tier] ?? '#e8b64c',
      });
    }
    if (headline.length > 0) {
      const strip = document.createElement('div');
      strip.className = 'card-headline';
      for (const fact of headline.slice(0, 2)) {
        const plaque = document.createElement('div');
        plaque.className = 'headline-fact';
        const v = document.createElement('strong');
        v.textContent = fact.v;
        v.style.color = fact.c;
        const l = document.createElement('span');
        l.textContent = fact.l;
        plaque.append(v, l);
        strip.appendChild(plaque);
      }
      this.card.appendChild(strip);
    }

    // THE GATE BAND: whether this piece will go on the body at all,
    // answered before any number is worth reading. A met gate is one
    // quiet brass line; a shortfall is an ember band that names the
    // bar, names where you stand, and shows the climb left — the one
    // fact that decides the equip conversation never hides in fine
    // print again.
    const gateReq = effectiveReq(itemId, roll);
    if (gateReq) {
      const own = levelForXp(this.lastSkills[gateReq.skill] ?? 0);
      const met = own >= gateReq.level;
      const gate = document.createElement('div');
      gate.className = `card-gate ${met ? 'met' : 'short'}`;
      const line = document.createElement('div');
      line.className = 'gate-line';
      const need = document.createElement('span');
      need.className = 'gate-need';
      need.textContent = met
        ? `◆ ${affixName(gateReq.skill)} ${gateReq.level} — met`
        : `Requires ${affixName(gateReq.skill)} ${gateReq.level}`;
      const yours = document.createElement('span');
      yours.className = 'gate-yours';
      yours.textContent = `yours ${own}`;
      line.append(need, yours);
      gate.appendChild(line);
      if (!met) {
        // The climb: a real meter of your level against the bar, so a
        // near-miss reads different from a far-off trophy.
        const row = document.createElement('div');
        row.className = 'gate-meter-row';
        const channel = document.createElement('span');
        channel.className = 'gate-meter';
        channel.style.setProperty(
          '--gate',
          String(Math.max(0.05, Math.min(1, own / gateReq.level))),
        );
        const togo = document.createElement('span');
        togo.className = 'gate-togo';
        const shortBy = gateReq.level - own;
        togo.textContent = shortBy === 1 ? '1 level to go' : `${shortBy} levels to go`;
        row.append(channel, togo);
        gate.appendChild(row);
      }
      this.card.appendChild(gate);
    }

    // THE COMPARISON: a pack piece measures itself against what is
    // worn in its slot — the whole equip-or-not read in one line.
    if (!wornSlot && def.equipSlot) {
      const worn = this.lastEquipment[def.equipSlot];
      if (worn && worn.id !== itemId) {
        const wDef = itemDef(worn.id);
        const wRolled = rolledStats(worn.id, worn.roll);
        let mine: number | undefined;
        let theirs: number | undefined;
        let word = '';
        if (def.weapon) {
          mine = rolled?.damage ?? def.weapon.damage;
          theirs = wRolled?.damage ?? wDef?.weapon?.damage;
          word = 'damage';
        } else if (def.tool && wDef?.tool) {
          mine = def.tool.power;
          theirs = wDef.tool.power;
          word = 'tool power';
        } else {
          mine = rolled ? rolled.armor : def.armor ?? 0;
          theirs = wRolled ? wRolled.armor : wDef?.armor ?? 0;
          word = 'armor';
        }
        if (mine !== undefined && theirs !== undefined) {
          const delta = Math.round((mine - theirs) * 10) / 10;
          const line = document.createElement('div');
          line.className = 'card-compare';
          const wornName = wDef?.name ?? def.equipSlot;
          line.textContent =
            delta === 0
              ? `Even with your worn ${wornName}.`
              : delta > 0
                ? `+${delta} ${word} over your worn ${wornName}.`
                : `${delta} ${word} under your worn ${wornName}.`;
          line.style.color =
            delta > 0 ? 'var(--green)' : delta < 0 ? 'var(--red-soft)' : 'var(--parchment-dim)';
          this.card.appendChild(line);
        }
        // THE COMPARE STOPS LYING ABOUT THE HOUSE: a swap that would
        // put a live word to sleep says so in ember; one that would
        // wake a word says so in gold. Silent when the swap stays
        // inside one family or touches no threshold.
        const wornSet = wDef?.gear?.set;
        const mySet = def.gear?.set;
        if (wornSet !== mySet) {
          const houseLine = (text: string, wakes: boolean): void => {
            const l = document.createElement('div');
            l.className = 'card-compare house-word-line';
            l.textContent = text;
            l.style.color = wakes ? 'var(--gold-bright)' : 'var(--red-soft)';
            this.card.appendChild(l);
          };
          if (wornSet) {
            const n = this.setCount(wornSet);
            for (const word of setWordsFor(wornSet)) {
              if (n >= word.pieces && n - 1 < word.pieces) {
                houseLine(`Puts ${word.name} to sleep.`, false);
              }
            }
          }
          if (mySet) {
            const n = this.setCount(mySet);
            for (const word of setWordsFor(mySet)) {
              if (n < word.pieces && n + 1 >= word.pieces) {
                houseLine(`Wakes ${word.name}.`, true);
              }
            }
          }
        }
      }
    }

    const stat = (label: string, text: string, color?: string, iconUrl?: string): void => {
      const row = document.createElement('div');
      row.className = 'card-stat';
      const chip = document.createElement('span');
      chip.className = 'stat-chip';
      if (iconUrl) {
        // Ability rows carry their spell-plate in miniature instead of
        // a bare color square — the same icon the hotbar will show.
        chip.classList.add('icon');
        chip.style.background = `center / contain no-repeat url("${iconUrl}")`;
      } else {
        chip.style.background = color ?? 'var(--gold)';
      }
      const lab = document.createElement('span');
      lab.className = 'stat-label';
      lab.textContent = label;
      const val = document.createElement('span');
      val.textContent = text;
      row.append(chip, lab, val);
      this.card.appendChild(row);
    };

    // The key's fine print: the trade name, what kind of halls wait
    // behind the veil, and THE WORN WARD — a ground-drop key tells its
    // remaining turns before anyone stoops for it. (Power already
    // leads the headline; a picked-up key lands on the ring.)
    if (dungeon) {
      stat('Sigil', dungeon.sigil, '#8f7bd9');
      stat('Theme', dungeon.theme.charAt(0).toUpperCase() + dungeon.theme.slice(1), '#c4b590');
      const left = keyUsesLeft(roll);
      stat(
        'Turns left',
        `${left} of ${keyUsesForTier(dungeon.tier)}`,
        left <= 0 ? '#ff9b8a' : left === 1 ? '#e8b64c' : '#9db7d6',
      );
    }

    const w = def.weapon;
    if (w) {
      // Damage already leads the headline; the fine print starts here.
      // The reaching school reads as Reach beside the other melee
      // hands — a pike's 3.2 tiles is measured in arm, not in flight.
      stat(
        w.style === 'onehand' || w.style === 'twohand' || w.style === 'polearm' ? 'Reach' : 'Range',
        `${w.range} tiles`,
        '#c9a23c',
      );
      // THE WEAPON'S OWN HAND: the card names the fight this weapon
      // teaches the body — its page in the moveset book.
      const page = movesetFor(w, def.id);
      if (page) stat('Fights as', page.name, '#c98f4a');
      // The two-hands law, stated where you'd look before equipping.
      if (isTwoHanded(def)) stat('Hands', 'Two-handed', '#8d9299');
      if (w.ammo) stat('Ammo', itemDef(w.ammo)?.name ?? w.ammo, '#c4b590');
      // Staves declare their school — the color matches their bolts.
      if (w.element) {
        stat(
          'School',
          w.element.charAt(0).toUpperCase() + w.element.slice(1),
          ELEMENT_CHIPS[w.element] ?? '#b49af0',
        );
      }
      // THE SECRET LEDGER: the weapon names the art it teaches — the
      // card is the discovery surface for secrets not yet met, and it
      // tells the courtship's state in a word.
      const art = w.art ? abilityDef(w.art) : undefined;
      if (art) {
        const secretSeat = techniquePoolDef(art.id);
        const banked = this.lessons[art.id] ?? 0;
        const state = this.ownsArt(art.id)
          ? ' · mastered'
          : banked > 0 && secretSeat?.secret
            ? ` · ${Math.min(99, Math.floor(Math.min(1, banked / masteryXp(secretSeat.secret.anchorLevel)) * 100))}% learned`
            : '';
        stat('Secret Art', `${art.name}${state}`, '#9a7ae0', abilityIconUrl(art.id, 40));
      }
      // The instance's oil — poison lives ON the weapon, so the card
      // is where you check which blade carries what.
      const coat = roll?.coat;
      if (coat && coat.until > Date.now()) {
        const oil = itemDef(coat.id)?.coating;
        const left = Math.max(0, Math.round((coat.until - Date.now()) / 1000));
        const time = left >= 60 ? `${Math.floor(left / 60)}m ${left % 60}s` : `${left}s`;
        const effect =
          oil?.status.status === 'venom'
            ? 'venom'
            : oil?.status.status === 'chill'
              ? 'crippling chill'
              : oil?.status.status ?? 'poison';
        stat('Poisoned', `${oil?.name ?? coat.id} · ${time}`, oil?.status.status === 'venom' ? '#a0c050' : '#8f9ed6');
        const pd = document.createElement('div');
        pd.className = 'card-passive-desc';
        pd.textContent = `Every landed basic applies ${effect} while the oil lasts.`;
        this.card.appendChild(pd);
      }
    }
    // Armor class + requirement + rolled numbers — the gear block.
    // (Armor and tool power already lead the headline strip.)
    const cls = def.gear?.armorClass;
    if (cls) stat('Class', cls.charAt(0).toUpperCase() + cls.slice(1), CLASS_COLORS[cls]);
    // THE HOUSE COURT: the family holds court on the card — the same
    // structure the stand shows, one builder, one grammar. The family
    // is the def's, not the roll's, so it is not gated on rolled.
    const houseSet = def.gear?.set;
    if (houseSet) {
      const court = this.houseCourt(houseSet);
      if (court) this.card.appendChild(court);
    }
    if (rolled) {
      for (const a of rolled.affixes) {
        stat(affixName(a.stat), `+${a.value}`, '#7dc46a');
      }
      // Native traits — what the def itself DOES beyond stats.
      if (def.gear?.effects?.length) {
        stat('Trait', def.gear.effects.map(describeEffect).join(' · '), '#e8c04c');
      }
      // (The House holds court above, outside the rolled gate — the
      // old prose block that lived here is dead.)
      // The bonded enchantment — permanent, tier-colored, spelled out.
      // THE ENCHANTER'S HAND and THE DEEPENING: a piece may carry a
      // ward and an art, each with its own quality, and both are part
      // of what this object IS.
      const seatRow = (label: string, id: string | undefined, q0: number | undefined): void => {
        const e = enchantDef(id);
        if (!e) return;
        const q = q0 ?? QUALITY_BASE;
        stat(
          label,
          q === QUALITY_BASE ? e.name : `${e.name} · ${qualityWord(q)} (${q}%)`,
          ELEMENT_COLORS[e.element],
        );
        const ed = document.createElement('div');
        ed.className = 'card-passive-desc';
        // Scaled, so the numbers on the card are the numbers in the
        // fight. A card that showed the authored strength while the
        // body felt a scaled one would be lying about the item.
        ed.textContent = bondedEffects(e.id, q).map(describeEffect).join(' · ');
        this.card.appendChild(ed);
      };
      // An undeepened piece has one working and calls it what it always
      // was; a deepened one names its two seats, because which seat a
      // working sits in is the whole rule of the feature.
      if (roll?.deep) {
        stat('Deepened', 'opened to a second working', '#e8d8a8');
        seatRow('Ward', roll.ench, roll.q);
        seatRow('Art', roll.ench2, roll.q2);
      } else {
        seatRow('Enchant', roll?.ench, roll?.q);
      }
      // A re-issued instance wears its power openly — the heirloom row.
      const native = def.gear?.levelReq?.level ?? 1;
      if (roll?.pwr !== undefined && roll.pwr > native) {
        stat('Item power', `${roll.pwr}`, '#ffb347');
      }
      // (The requirement itself leads the card as THE GATE BAND.)
      if (cls) {
        const blurb = document.createElement('div');
        blurb.className = 'card-passive-desc';
        blurb.textContent = ARMOR_CLASS_BLURB[cls];
        this.card.appendChild(blurb);
      }
    }
    if (def.coating) {
      const st = def.coating.status;
      const effect = st.status === 'venom' ? 'Venom' : st.status === 'chill' ? 'Crippling chill' : st.status;
      const mins = Math.round(def.coating.durationSec / 60);
      stat('Weapon oil', `${effect} · ${mins} min`, st.status === 'venom' ? '#a0c050' : '#8f9ed6');
      const cd = document.createElement('div');
      cd.className = 'card-passive-desc';
      cd.textContent =
        'Coats your equipped bladed weapon or bow — every landed basic applies it. Arx takes no oil.';
      this.card.appendChild(cd);
    }
    // Scroll cards spell out the enchantment they carry.
    if (def.enchant) {
      const se = enchantDef(def.enchant);
      if (se) {
        const q = roll?.q ?? QUALITY_BASE;
        stat('Enchant', `${se.name} · tier ${se.tier}`, ELEMENT_COLORS[se.element]);
        // The maker's mark. This is the whole reason one Keen Edge
        // scroll is worth more than another, so it reads before the
        // slot line rather than buried under the effects.
        stat(
          'Inscription',
          `${qualityWord(q)} · ${q}%`,
          q >= 105 ? '#7ac47a' : q < QUALITY_BASE ? '#c4a35a' : '#c4b590',
        );
        stat('Applies to', se.slot === 'weapon' ? 'weapons' : `${se.slot} gear`, '#c4b590');
        const sd = document.createElement('div');
        sd.className = 'card-passive-desc';
        sd.textContent = bondedEffects(se.id, q).map(describeEffect).join(' · ');
        this.card.appendChild(sd);
      }
    }
    const relicAb = def.relic ? abilityDef(def.relic) : undefined;
    if (relicAb) stat('Relic (E)', relicAb.name, '#7ac47a', abilityIconUrl(relicAb.id, 40));
    const sigilAb = def.sigil ? abilityDef(def.sigil) : undefined;
    if (sigilAb) stat('Sigil (T)', sigilAb.name, '#e8e2d0', abilityIconUrl(sigilAb.id, 40));
    // A rolled trinket declares how much its instance amplifies the
    // active — the reason a power-50 legendary stone is worth the hunt.
    if ((relicAb || sigilAb) && roll) {
      if (roll.pwr !== undefined) stat('Item power', `${roll.pwr}`, '#ffb347');
      const mult = trinketPowerMult(roll.rar, roll.pwr);
      if (mult > 1.001) stat('Potency', `×${mult.toFixed(2)}`, '#e8b64c');
    }
    if (def.passive) {
      const p = PASSIVES[def.passive];
      stat('Passive', p.name, p.color, passiveIconUrl(def.passive, 40));
      const pd = document.createElement('div');
      pd.className = 'card-passive-desc';
      pd.textContent = p.desc;
      this.card.appendChild(pd);
    }

    if (def.desc) {
      const flavor = document.createElement('div');
      flavor.className = 'card-flavor';
      flavor.textContent = def.desc;
      this.card.appendChild(flavor);
    }

    const foot = document.createElement('div');
    foot.className = 'card-foot';
    const value = document.createElement('span');
    value.className = 'card-value';
    // A key's worth follows its tier's economy floor, not the base def.
    const worth = dungeon ? DUNGEON_TIER_LAWS[dungeon.tier].value : rolled?.value ?? def.value;
    const coinImg = document.createElement('img');
    coinImg.src = itemIconUrl('coins', 20);
    coinImg.draggable = false;
    const valueText = document.createElement('span');
    valueText.textContent =
      qty > 1
        ? `${worth.toLocaleString()} each · ${qty.toLocaleString()} in pack`
        : `${worth.toLocaleString()}`;
    value.append(coinImg, valueText);
    foot.appendChild(value);
    this.card.appendChild(foot);

    // Device-aware action hints — the card teaches its own controls.
    const hints = document.createElement('div');
    hints.className = 'card-hints';
    const pad = this.deviceMode() === 'pad';
    const hint = (glyph: string, cls: string, label: string): void => {
      const item = document.createElement('span');
      item.className = 'hint-item';
      const g = document.createElement('span');
      g.className = cls;
      g.textContent = glyph;
      const t = document.createElement('span');
      t.textContent = label;
      item.append(g, t);
      hints.appendChild(item);
    };
    const primary = wornSlot ? 'Remove' : def.equipSlot ? 'Equip' : def.heals ? 'Eat' : null;
    if (pad) {
      if (primary) hint(padGlyph(0).text, 'pad-glyph a', primary);
      hint(padGlyph(3).text, 'pad-glyph y', 'Options');
      if (!wornSlot) hint(padGlyph(2).text, 'pad-glyph x', 'Move');
    } else {
      if (primary) hint('Click', 'kb-glyph', primary);
      hint('R-Click', 'kb-glyph', 'Options');
      if (!wornSlot) hint('Drag', 'kb-glyph', 'Move / drop out');
    }
    this.card.appendChild(hints);

    // THE BENCH ROUTE: with the open case up and no station pairing,
    // pack and stand inspections lay out on the bench tray — big,
    // standing, verbs beneath — instead of floating. The floating
    // card remains the voice for loot rows, vault sockets, and the
    // paired pack column.
    if (
      (this.cardSource?.kind === 'inv' || this.cardSource?.kind === 'equip') &&
      this.benchActive()
    ) {
      this.benchSource = this.cardSource;
      this.card.classList.add('hidden');
      this.benchCard.replaceChildren(...Array.from(this.card.childNodes));
      this.benchEmpty.classList.add('hidden');
      this.renderBenchActs();
      return;
    }

    // Pin where the case stays readable: with the character case docked
    // at the right edge, the card stands in the OPEN WORLD at the case's
    // left, riding the hovered row. In a station pairing (bank/shop) it
    // pins beside the cell like a game tooltip — transient overlap there
    // beats covering the world conversation. Clamped on-screen always.
    this.card.classList.remove('hidden');
    const anchor = this.cardAnchor?.getBoundingClientRect();
    const cw = this.card.offsetWidth;
    const chh = this.card.offsetHeight;
    let x: number;
    let y: number;
    if (anchor && this.stationContext() === null && !this.invPanel.classList.contains('hidden')) {
      const pr = this.invPanel.getBoundingClientRect();
      x = Math.max(8, pr.left - cw - 12);
      y = Math.min(Math.max(10, anchor.top - 24), window.innerHeight - chh - 10);
    } else if (anchor) {
      x = anchor.left - cw - 14;
      if (x < 8) x = Math.min(window.innerWidth - cw - 8, anchor.right + 14);
      y = Math.min(Math.max(10, anchor.top - 24), window.innerHeight - chh - 10);
    } else {
      const pr = this.invPanel.getBoundingClientRect();
      x = Math.max(8, pr.left - cw - 12);
      y = Math.min(Math.max(8, pr.top), window.innerHeight - chh - 8);
    }
    this.card.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  }

  // ---- context menu -------------------------------------------------

  /** Open the verb menu for a pack slot or a worn equipment slot. */
  openMenuFor(el: HTMLElement, at?: { x: number; y: number }): boolean {
    if (el.dataset.filled !== '1') return false;
    const entries: Array<{ label: string; act: () => void; danger?: boolean; gated?: boolean }> = [];

    if (el.dataset.invslot !== undefined) {
      const idx = Number(el.dataset.invslot);
      const slot = this.lastSlots[idx];
      if (!slot) return false;
      const def = itemDef(slot.item);
      const station = this.stationContext();
      if (def?.equipSlot) {
        // The menu tells the gate too — same words as the bench verb.
        const gate = this.slotGate(slot);
        entries.push({
          label: gate ? `Equip · needs ${affixName(gate.skill)} ${gate.level}` : 'Equip',
          act: () => this.onSlotAction(idx, 'use'),
          gated: gate !== null,
        });
        // THE DELIBERATE PAIR: a one-handed blade offers the off hand
        // by name — the manual road to dual wield. The verb shows for
        // every one-hander; the server holds the pairing gates and
        // teaches with words (the discovery stays the act itself).
        if (def.equipSlot === 'weapon' && def.weapon?.style === 'onehand') {
          entries.push({
            label: gate
              ? `Equip off hand · needs ${affixName(gate.skill)} ${gate.level}`
              : 'Equip off hand',
            act: () => this.onSlotAction(idx, 'offhand'),
            gated: gate !== null,
          });
        }
        // THE SECOND GRIP: hand gear can wait at the ready instead —
        // same gate, same words (what waits must be yours to wield).
        if (def.equipSlot === 'weapon' || def.equipSlot === 'offhand') {
          entries.push({
            label: gate ? `Stow at the ready · needs ${affixName(gate.skill)} ${gate.level}` : 'Stow at the ready',
            act: () => this.onSlotAction(idx, 'stow'),
            gated: gate !== null,
          });
        }
      } else if (def?.heals) entries.push({ label: 'Eat', act: () => this.onSlotAction(idx, 'use') });
      else if (def?.buff) entries.push({ label: 'Drink', act: () => this.onSlotAction(idx, 'use') });
      // THE BELT: any consumable can be pinned as the quick-use pick.
      if (beltEligible(slot.item)) {
        const pinned = beltPin() === slot.item;
        entries.push({
          label: pinned ? 'Take off belt' : 'Set on belt',
          act: () => setBeltPin(pinned ? null : slot.item),
        });
      }
      if (station === 'bank') {
        entries.push({ label: `Deposit ${slot.qty > 1 ? 'all' : ''}`.trim(), act: () => this.onSlotAction(idx, 'deposit') });
      } else if (station === 'shop') {
        entries.push({ label: 'Sell one', act: () => this.onSlotAction(idx, 'sell') });
      }
      entries.push({ label: 'Drop', act: () => this.onSlotAction(idx, 'drop'), danger: true });
    } else if (el.dataset.equipslot !== undefined) {
      const slot = el.dataset.equipslot as EquipSlot;
      const worn = this.lastEquipment[slot];
      if (!worn) return false;
      // THE RACK: a waiting piece leads with the trade; a grip belongs
      // to a HAND, so the rack offers none.
      if (isStowedSlot(slot)) entries.push({ label: 'Draw · trade sets', act: () => this.onSwapSets() });
      entries.push({ label: 'Remove', act: () => this.onUnequip(slot) });
      // Every melee blade rides the blade carriage (daggers included),
      // so they all earn the grip preference — id substrings can't keep
      // up with the rosters. The grip belongs to the HAND, not the
      // weapon: the mainhand and offhand slots each set their own fist,
      // so a dual wielder can run standard main / reverse off.
      const hand: 'main' | 'off' | null =
        slot === 'weapon' ? 'main' : slot === 'offhand' ? 'off' : null;
      if (hand && itemDef(worn.id)?.weapon?.style === 'onehand') {
        const rogue = this.carryStyle(hand) === 'rogue';
        entries.push({
          label: rogue ? 'Grip: standard' : 'Grip: rogue (reversed)',
          act: () => this.onCarryStyle(rogue ? 'normal' : 'rogue', hand),
        });
      }
    } else {
      return false;
    }

    // ON A PAD THE VERBS FAN OUT: the same entries, handed to the one
    // context sheet, which wheels them around the cell. The mouse keeps
    // the column at the cursor — a list is the right shape for a
    // pointer, and both press the very same buttons.
    if (this.deviceMode() === 'pad' && at === undefined) {
      this.closeMenu();
      this.itemSheet = true;
      openSheet(
        el,
        entries.map((entry) => ({ label: entry.label, act: entry.act, danger: entry.danger })),
        { onClose: () => { this.itemSheet = false; } },
      );
      return true;
    }

    this.menu.innerHTML = '';
    entries.forEach((entry, i) => {
      const btn = document.createElement('button');
      btn.className = 'menu-item';
      if (entry.danger) btn.classList.add('danger');
      if (entry.gated) btn.classList.add('gated');
      btn.textContent = entry.label;
      btn.dataset.nav = '';
      btn.dataset.navkey = `menu:${i}`;
      btn.dataset.acta = entry.label;
      btn.addEventListener('click', () => {
        this.closeMenu();
        entry.act();
      });
      this.menu.appendChild(btn);
    });
    this.menu.classList.remove('hidden');
    const r = el.getBoundingClientRect();
    const x = at?.x ?? r.left - this.menu.offsetWidth - 6;
    const y = at?.y ?? r.top;
    const cx = Math.max(6, Math.min(window.innerWidth - this.menu.offsetWidth - 6, x));
    const cy = Math.max(6, Math.min(window.innerHeight - this.menu.offsetHeight - 6, y));
    this.menu.style.transform = `translate(${Math.round(cx)}px, ${Math.round(cy)}px)`;
    return true;
  }

  /** True while the pad's item verbs are riding the shared sheet. */
  private itemSheet = false;

  /** Close the verb menu. Returns true if one was open (Ⓑ backstop). */
  closeMenu(): boolean {
    // The pad's item verbs live on the shared sheet — the same backstop
    // has to reach them, or Ⓑ would fall through to closing the room.
    if (this.itemSheet && closeSheet()) {
      this.itemSheet = false;
      return true;
    }
    if (this.menu.classList.contains('hidden')) return false;
    this.menu.classList.add('hidden');
    return true;
  }

  get menuOpen(): boolean {
    return !this.menu.classList.contains('hidden');
  }

  // ---- rendering ----------------------------------------------------

  /** Which filter family an item belongs to. */
  private static packFamily(def: ItemDef | undefined): 'gear' | 'food' | 'mats' {
    if (def?.equipSlot || def?.weapon || def?.tool) return 'gear';
    if (def?.heals) return 'food';
    return 'mats';
  }

  /** Re-apply the pack lens to the rendered grid (no rebuild). */
  private applyPackFilter(): void {
    for (const cell of this.invGrid.querySelectorAll<HTMLElement>('[data-invslot]')) {
      const fam = cell.dataset.family;
      cell.classList.toggle(
        'filtered-out',
        this.packFilter !== 'all' && fam !== undefined && fam !== this.packFilter,
      );
    }
  }

  /**
   * THE GATE ON THE SLOT: re-judge every pack well against the current
   * skills. A piece the body cannot yet wear is barred in ember across
   * the whole grid — the shortfall reads at pack scale, not one hover
   * at a time — and its seal names the level it waits on. Idempotent
   * class/seal toggles, so a level-up mid-session flips wells live
   * without rebuilding the grid.
   */
  private applyReqGate(): void {
    for (const cell of this.invGrid.querySelectorAll<HTMLElement>('[data-invslot]')) {
      const slot = this.lastSlots[Number(cell.dataset.invslot)];
      const def = slot ? itemDef(slot.item) : undefined;
      const req = slot && def?.equipSlot ? this.slotGate(slot) : null;
      const locked = req !== null;
      cell.classList.toggle('req-locked', locked);
      let seal = cell.querySelector<HTMLElement>('.req-seal');
      if (req) {
        if (!seal) {
          seal = document.createElement('span');
          seal.className = 'req-seal';
          cell.appendChild(seal);
        }
        seal.textContent = String(req.level);
      } else {
        seal?.remove();
      }
    }
  }

  /**
   * THE PACK KNOWS THE HOUSE (visible-buildcraft V3): an idempotent
   * pass in the applyReqGate mold — a pack piece whose family you
   * already wear, where wearing IT would raise the count, gets a
   * small gold house pip. The pack tells you what advances a build
   * without a single hover.
   */
  private applyHouseMarks(): void {
    for (const cell of this.invGrid.querySelectorAll<HTMLElement>('[data-invslot]')) {
      const slot = this.lastSlots[Number(cell.dataset.invslot)];
      const def = slot ? itemDef(slot.item) : undefined;
      const set = def?.gear?.set;
      let advances = false;
      if (set && def?.equipSlot) {
        const count = this.setCount(set);
        const worn = this.lastEquipment[def.equipSlot];
        const wornSet = worn ? itemDef(worn.id)?.gear?.set : undefined;
        advances = count >= 1 && count < 5 && wornSet !== set;
      }
      cell.classList.toggle('house-callin', advances);
      let pip = cell.querySelector<HTMLElement>('.house-pip');
      if (advances) {
        if (!pip) {
          pip = document.createElement('span');
          pip.className = 'house-pip';
          pip.textContent = '◆';
          cell.appendChild(pip);
        }
      } else {
        pip?.remove();
      }
    }
  }

  renderInventory(slots: InvSlot[]): void {
    this.lastSlots = slots;
    this.invGrid.innerHTML = '';
    const count = Math.max(28, slots.length);
    let coins = 0;
    let filled = 0;
    for (let i = 0; i < count; i++) {
      const cell = document.createElement('div');
      cell.className = 'inv-slot';
      cell.dataset.nav = '';
      cell.dataset.navkey = `inv:${i}`;
      cell.dataset.invslot = String(i);
      const slot = slots[i];
      if (slot) {
        filled++;
        const def = itemDef(slot.item);
        if (slot.item === 'coins') coins += slot.qty;
        cell.classList.add('clickable');
        const tier = rarityOfInstance(slot.item, slot.roll);
        if (tier !== 'common') cell.classList.add(`rarity-${tier}`);
        cell.dataset.filled = '1';
        cell.dataset.family = Panels.packFamily(def);
        cell.dataset.tipname = slot.stolen
          ? `${instanceName(slot.item, slot.roll)} (stolen)`
          : instanceName(slot.item, slot.roll);
        // THE STOLEN TAG (factions Phase 5): goods with a history wear
        // a small red corner tick — no honest counter will touch them.
        if (slot.stolen) cell.classList.add('inv-stolen');
        cell.dataset.acta = def?.equipSlot ? 'Equip' : def?.heals ? 'Eat' : 'Use';
        // Click (no drag) fires in dragEnd; pointerdown arms both paths.
        cell.addEventListener('pointerdown', (e) => {
          if (e.button !== 0) return;
          e.preventDefault();
          this.drag = { from: i, startX: e.clientX, startY: e.clientY, active: false, ghost: null };
        });
        // Right-click: the item's verb menu, at the pointer.
        cell.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          this.openMenuFor(cell, { x: e.clientX, y: e.clientY });
        });
        const item = document.createElement('img');
        item.className = 'inv-item';
        // Rastered at ~2x the big socket's art box so retina stays crisp.
        item.src = itemIconUrl(slot.item, 96);
        item.draggable = false;
        cell.appendChild(item);
        if (slot.qty > 1) {
          const qty = document.createElement('span');
          qty.className = 'inv-qty';
          qty.textContent = slot.qty > 9999 ? `${Math.floor(slot.qty / 1000)}k` : String(slot.qty);
          cell.appendChild(qty);
        }
        // Pad Ⓐ path: a real click event lands here.
        cell.addEventListener('click', (e) => {
          // Pointer-driven clicks are handled by dragEnd; synthetic
          // (pad) clicks carry no pointer state.
          if (e.detail === 0) this.onUseSlot(i);
        });
      }
      this.invGrid.appendChild(cell);
    }
    this.coinReadout.innerHTML = '';
    const coinIcon = document.createElement('img');
    coinIcon.src = itemIconUrl('coins', 20);
    coinIcon.draggable = false;
    const coinText = document.createElement('span');
    coinText.textContent = coins.toLocaleString();
    this.coinReadout.append(coinIcon, coinText);
    // The room left in the bag: a real gauge, read at a glance, the
    // count beside it for the exact answer.
    this.packFill.style.setProperty('--fill', String(count === 0 ? 0 : filled / count));
    this.packFill.innerHTML = '';
    const meter = document.createElement('span');
    meter.className = 'fill-meter';
    const fillCount = document.createElement('span');
    fillCount.className = 'fill-count';
    fillCount.textContent = `${filled} / ${count}`;
    this.packFill.append(meter, fillCount);
    this.packFill.classList.toggle('full', filled >= count);
    this.applyPackFilter();
    this.applyReqGate();
    this.applyHouseMarks();

    // The card may be describing a slot that just changed — refresh it;
    // the bench re-lays or re-seeds the same way.
    if (this.cardSource?.kind === 'inv') {
      const src = this.lastSlots[this.cardSource.slot];
      if (src) this.renderCard(src.item, src.qty, null, src.roll);
      else {
        this.hideCard();
        this.refreshBench();
      }
    } else if (this.benchSource?.kind === 'inv') {
      this.refreshBench();
    }
  }

  /** Build one equipment socket, hung at its grid-area on the stand. */
  private equipCell(slot: EquipSlot, equipment: Partial<Record<string, EquippedItem>>): HTMLElement {
    const cell = document.createElement('div');
    cell.className = 'inv-slot equip-cell';
    // THE RACK: the waiting pair's sockets ride one register quieter —
    // the same stand, a shelf below, never mistaken for the hands.
    const rack = isStowedSlot(slot);
    if (rack) cell.classList.add('rack-cell');
    cell.style.gridArea = slot;
    cell.dataset.equipslot = slot;
    const worn = equipment[slot];
    const plainName = SLOT_NAMES[slot] ?? slot;
    if (worn) {
      cell.classList.add('clickable', 'equipped');
      const tier = rarityOfInstance(worn.id, worn.roll);
      if (tier !== 'common') cell.classList.add(`rarity-${tier}`);
      // THE ANATOMY SPEAKS: sockets of a family with a word lit (two
      // or more worn) wear a shared gold pip — kin reads at a glance.
      const kinSet = itemDef(worn.id)?.gear?.set;
      if (kinSet) {
        cell.dataset.set = kinSet;
        if (this.setCount(kinSet) >= 2) {
          cell.classList.add('house-kin');
          const pip = document.createElement('span');
          pip.className = 'house-pip';
          pip.textContent = '◆';
          cell.appendChild(pip);
        }
      }
      cell.dataset.filled = '1';
      cell.dataset.nav = '';
      cell.dataset.navkey = `equip:${slot}`;
      cell.dataset.tipname = rack
        ? `${instanceName(worn.id, worn.roll)} · at the ready`
        : instanceName(worn.id, worn.roll);
      // A rack socket's press DRAWS — the trade is the point of the
      // row; Remove waits on the verb menu, never one mispress away.
      cell.dataset.acta = rack ? 'Draw' : 'Remove';
      cell.addEventListener('click', () => (rack ? this.onSwapSets() : this.onUnequip(slot)));
      cell.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this.openMenuFor(cell, { x: e.clientX, y: e.clientY });
      });
      const item = document.createElement('img');
      item.className = 'inv-item';
      item.src = itemIconUrl(worn.id, 96);
      item.draggable = false;
      cell.appendChild(item);
    } else {
      // An empty socket shows its purpose: a dim glyph and its name.
      // It is still a nav stop — the pad's focus can read every place
      // on the stand, worn or waiting.
      cell.dataset.nav = '';
      cell.dataset.navkey = `equip:${slot}`;
      cell.dataset.tipname = plainName.charAt(0).toUpperCase() + plainName.slice(1);
      const ghost = document.createElement('img');
      ghost.className = 'slot-ghost';
      ghost.src = slotGlyphUrl(slot, 64);
      ghost.draggable = false;
      cell.appendChild(ghost);
    }
    // Every socket wears its name — full or empty, you know the place.
    const label = document.createElement('span');
    label.className = 'slot-label';
    label.textContent = plainName;
    cell.appendChild(label);
    return cell;
  }

  renderEquipment(equipment: Partial<Record<string, EquippedItem>>): void {
    this.lastEquipment = equipment;
    // ONE TRUTH: aggregate once; every surface below reads this.
    this.lastGearStats = aggregateGearStats(
      equipment as Parameters<typeof aggregateGearStats>[0],
    );
    // The armor stand: the alcove at its heart, every socket hung at
    // its body place around the standing figure.
    this.equipAnatomy.innerHTML = '';
    this.equipAnatomy.appendChild(this.figureAlcove);
    for (const slot of EQUIP_SLOTS) {
      this.equipAnatomy.appendChild(this.equipCell(slot, equipment));
    }
    this.paintFigure();
    // THE RACK's trade button sits between the waiting pair, wearing
    // the live key chip — dim when nothing waits (still pressable; the
    // server speaks the refusal, the honest teacher).
    const trade = document.createElement('button');
    trade.id = 'rack-swap';
    trade.className = 'act-btn';
    trade.type = 'button';
    trade.style.gridArea = 'rackSwap';
    const hasWaiting =
      equipment.stowWeapon !== undefined || equipment.stowOffhand !== undefined;
    if (!hasWaiting) trade.classList.add('cant');
    trade.dataset.nav = '';
    trade.dataset.navkey = 'rack:trade';
    trade.dataset.acta = 'Trade';
    trade.title = hasWaiting
      ? 'Trade weapon sets. The waiting pair comes to your hands.'
      : 'Nothing waits at the ready. Stow a weapon from your pack.';
    const word = document.createElement('span');
    word.className = 'rack-word';
    word.textContent = 'Trade';
    trade.appendChild(word);
    trade.appendChild(seatChip('swapSets'));
    trade.addEventListener('click', () => this.onSwapSets());
    this.equipAnatomy.appendChild(trade);

    this.renderGearStrip();
    // Worn houses changed — the pack's advance marks follow.
    this.applyHouseMarks();

    if (this.cardSource?.kind === 'equip') {
      const worn = this.lastEquipment[this.cardSource.slot];
      if (worn) this.renderCard(worn.id, 1, this.cardSource.slot, worn.roll);
      else {
        this.hideCard();
        this.refreshBench();
      }
    } else if (this.benchSource?.kind === 'equip') {
      this.refreshBench();
    }

    // A weapon swap can re-aim the R key at another school's ladder —
    // the open codex follows the hand.
    if (this.artsOpen) artsWing.renderArts(this);
  }

  /** Worn pieces of a family — the ONE TRUTH cache, zero when clean. */
  private setCount(setId: string): number {
    return this.lastGearStats?.setCounts[setId] ?? 0;
  }

  /**
   * THE HOUSE COURT (visible-buildcraft V3): the ONE way a House is
   * shown, everywhere it appears — the stand, the item card, and (by
   * the card's re-parenting) the bench. A crest ring carries the worn
   * count toward five; each word stands as a row, lit gold when its
   * threshold is met, ghosted with its price in plain words when not.
   * Replaces the bolted-on prose block of the first HOUSE WORD pass.
   */
  private houseCourt(setId: string): HTMLElement | null {
    const words = setWordsFor(setId);
    if (words.length === 0) return null;
    const count = this.setCount(setId);
    const court = document.createElement('div');
    court.className = 'house-court';
    const head = document.createElement('div');
    head.className = 'court-head';
    const ring = ringGauge(count / 5, { tone: 'var(--gold)' });
    const num = document.createElement('span');
    num.className = 'court-num';
    num.textContent = String(count);
    ring.center.appendChild(num);
    const title = document.createElement('div');
    title.className = 'court-title';
    const nm = document.createElement('div');
    nm.className = 'court-name';
    nm.textContent = setName(setId);
    const sub = document.createElement('div');
    sub.className = 'court-sub';
    sub.textContent =
      count === 0
        ? 'none worn'
        : count === 1
          ? 'one of five worn'
          : `${count} of five worn`;
    title.append(nm, sub);
    head.append(ring.root, title);
    court.appendChild(head);
    for (const word of words) {
      const lit = count >= word.pieces;
      const row = document.createElement('div');
      row.className = `court-word${lit ? ' lit' : ''}`;
      const pip = document.createElement('span');
      pip.className = 'word-pip';
      pip.textContent = '◆';
      const body = document.createElement('div');
      body.className = 'word-body';
      const line = document.createElement('div');
      line.className = 'word-name';
      line.textContent = word.name;
      const gate = document.createElement('span');
      gate.className = 'word-gate';
      gate.textContent = lit ? 'woken' : word.pieces === 2 ? 'at two pieces' : 'at four pieces';
      line.appendChild(gate);
      const desc = document.createElement('div');
      desc.className = 'word-desc';
      desc.textContent = word.desc;
      body.append(line, desc);
      row.append(pip, body);
      court.appendChild(row);
    }
    return court;
  }

  /**
   * THE HERO STANDS IN THE CASE: paint the player's live rig into the
   * alcove — the same drawHumanoid the world uses, wearing every worn
   * piece, finished with the world's outline ring. Repainted on every
   * equipment push (the portrait cache makes an unchanged kit free);
   * a CHANGED kit blooms the alcove's candle glow for one breath.
   */
  private paintFigure(): void {
    const look = this.identityInfo().look;
    if (!look) {
      // No look yet (a fresh account mid-creation): the niche stands
      // empty and quiet. The next equipment push repaints.
      this.alcoveFigure.replaceChildren();
      this.figureSig = null;
      return;
    }
    const equip: Record<string, string> = {};
    for (const [slot, worn] of Object.entries(this.lastEquipment)) {
      // The rack's waiting pair is stowed away, never on the body.
      if (worn && !isStowedSlot(slot as EquipSlot)) equip[slot] = worn.id;
    }
    const sig = JSON.stringify(equip);
    if (sig === this.figureSig && this.alcoveFigure.childElementCount > 0) return;
    const changed = this.figureSig !== null && this.figureSig !== sig;
    this.figureSig = sig;
    // Painted at 768: the alcove shows the figure near 700 device
    // pixels on a 4K case, and the portrait cache makes it one-time.
    const fig = lookFigure(look, 768, equip);
    if (!fig) return;
    fig.className = 'alcove-canvas';
    this.alcoveFigure.replaceChildren(fig);
    if (changed) {
      // The landing bloom: restart the glow's one-breath swell.
      this.figureAlcove.classList.remove('bloom');
      void this.figureAlcove.offsetWidth;
      this.figureAlcove.classList.add('bloom');
    }
  }

  /**
   * THE SUM AS INSTRUMENTS: everything the worn kit adds up to, told
   * as a bank of gauges — each stat a sunk chamfered plate wearing its
   * family's material glyph, a serif numeral, and its word engraved
   * beneath. Every gauge explains itself in plain words on its
   * tooltip, and every worn house holds a compact court beside them.
   */
  private renderGearStrip(): void {
    const gear = this.lastGearStats;
    if (!gear) return;
    this.gearStrip.innerHTML = '';
    const add = (value: string, word: string, kind: string, meaning: string, down = false): void => {
      const cell = document.createElement('div');
      cell.className = 'gs-cell' + (down ? ' down' : '');
      cell.dataset.tipname = word;
      cell.dataset.tipsub = meaning;
      const stage = document.createElement('span');
      stage.className = 'gs-stage';
      const glyph = document.createElement('span');
      glyph.className = `gs-glyph ${kind}`;
      stage.appendChild(glyph);
      const col = document.createElement('span');
      col.className = 'gs-col';
      const num = document.createElement('span');
      num.className = 'gs-num';
      num.textContent = value;
      const label = document.createElement('span');
      label.className = 'gs-word';
      label.textContent = word;
      col.append(num, label);
      cell.append(stage, col);
      this.gearStrip.appendChild(cell);
    };
    // THE HOUSE LEADS THE SUM: each worn family a compact
    // seal — crest ring counting toward five, the family's name, and
    // every word of its court as a pip, gold when woken.
    const families = Object.entries(gear.setCounts)
      .filter(([, n]) => n >= 1)
      .sort((a, b) => b[1] - a[1]);
    for (const [setId, count] of families) {
      const words = setWordsFor(setId);
      if (words.length === 0) continue;
      const seal = document.createElement('div');
      seal.className = 'gs-house';
      seal.dataset.tipname = setName(setId);
      seal.dataset.tipsub =
        count === 1 ? 'One of five pieces worn.' : `${count} of five pieces worn.`;
      const ring = ringGauge(count / 5, { tone: 'var(--gold)' });
      const num = document.createElement('span');
      num.className = 'gs-house-num';
      num.textContent = String(count);
      ring.center.appendChild(num);
      const col = document.createElement('div');
      col.className = 'gs-house-col';
      const nm = document.createElement('div');
      nm.className = 'gs-house-name';
      nm.textContent = setName(setId);
      const wordsRow = document.createElement('div');
      wordsRow.className = 'gs-house-words';
      for (const word of words) {
        const lit = count >= word.pieces;
        const w = document.createElement('span');
        w.className = `gs-house-word${lit ? ' lit' : ''}`;
        w.textContent = `◆ ${word.name}`;
        wordsRow.appendChild(w);
      }
      col.append(nm, wordsRow);
      seal.append(ring.root, col);
      this.gearStrip.appendChild(seal);
    }
    if (gear.armor > 0)
      add(String(gear.armor), 'Armor', 'armor', 'Blunts every blow the world lands on you.');
    if (gear.maxHp > 0)
      add(`+${gear.maxHp}`, 'Max health', 'health', 'More life in the body before it falls.');
    if (gear.regenPer4s > 0)
      add(`+${gear.regenPer4s}`, 'Health per 4s', 'mending', 'Health returning every four breaths.');
    for (const [skill, bonus] of Object.entries(gear.skillBonus)) {
      if (bonus)
        add(
          `+${bonus}`,
          affixName(skill),
          'skill',
          `Your ${affixName(skill).toLowerCase()} counts ${bonus} higher while this kit is worn.`,
        );
    }
    for (const [style, mult] of Object.entries(gear.styleDmgMult)) {
      if (Math.abs(mult - 1) > 0.001) {
        const pct = Math.round((mult - 1) * 100);
        add(
          `${pct > 0 ? '+' : ''}${pct}%`,
          `${affixName(style)} dmg`,
          'edge',
          pct > 0
            ? `Every ${affixName(style).toLowerCase()} blow lands ${pct}% harder.`
            : `${affixName(style)} blows land ${-pct}% softer in this kit.`,
          pct < 0,
        );
      }
    }
    if (Math.abs(gear.speedMult - 1) > 0.001) {
      const pct = Math.round((gear.speedMult - 1) * 100);
      add(
        `${pct > 0 ? '+' : ''}${pct}%`,
        'Move speed',
        'speed',
        pct > 0 ? 'Quicker on your feet in this kit.' : 'This kit weighs on your stride.',
        pct < 0,
      );
    }
    if (Math.abs(gear.cooldownMult - 1) > 0.001) {
      const pct = Math.round((1 - gear.cooldownMult) * 100);
      add(`−${pct}%`, 'Quicker arts', 'arts', 'Your arts return to hand sooner.');
    }
    this.gearStrip.classList.toggle('hidden', this.gearStrip.childElementCount === 0);
  }

  /**
   * The identity line: adventurer name + total level. The hero
   * HIMSELF stands in the alcove below, painted by paintFigure —
   * called here too so a case opened before the first equipment push
   * still shows its owner.
   */
  private renderIdentity(): void {
    this.paintFigure();
    const total = SKILL_IDS.reduce((n, s) => {
      if (HIDDEN_SKILLS[s] && this.lastSkills[s] === undefined) return n;
      return n + levelForXp(this.lastSkills[s] ?? 0);
    }, 0);
    this.identName.textContent = this.identityInfo().name || 'Adventurer';
    // The level seal: the total worn as a faceted gem beside the name
    // (the same trophy grammar the skills wall speaks).
    this.identDeed.innerHTML = '';
    const word = document.createElement('span');
    word.className = 'seal-word';
    word.textContent = 'Total level';
    const gem = document.createElement('span');
    gem.className = 'seal-gem';
    gem.textContent = total.toLocaleString();
    this.identDeed.append(word, gem);
  }

  /** Server-confirmed technique seats; re-renders whoever shows them. */
  setTechniques(
    chosen: [string | null, string | null],
    earned: string[] = [],
    lessons: Record<string, number> = {},
  ): void {
    this.techniques = chosen;
    this.earnedArts = earned;
    this.lessons = lessons;
    this.renderSkills(this.lastSkills);
    if (this.artsOpen) artsWing.renderArts(this);
  }

  /** The seat an ability occupies (0 = Q, 1 = R), or null. */
  seatOf(ability: string): 0 | 1 | null {
    if (this.techniques[0] === ability) return 0;
    if (this.techniques[1] === ability) return 1;
    return null;
  }

  /** THE LOAN LAW's teaching hands, read off the worn weapons. */
  equippedArtIds(): Set<string> {
    const out = new Set<string>();
    const main = itemDef(this.lastEquipment.weapon?.id ?? '')?.weapon?.art;
    if (main) out.add(main);
    const off = itemDef(this.lastEquipment.offhand?.id ?? '')?.weapon?.art;
    if (off) out.add(off);
    return out;
  }

  /** An art owned outright: a deed page or a mastered secret. */
  ownsArt(ability: string): boolean {
    return this.earnedArts.includes(ability);
  }

  /**
   * THE MASTER'S LICENSE, derived here from the answered set exactly
   * as recomputeGear derives it (THE QUIET WIRE: no new field —
   * both ends read the same packages at the same applied ranks):
   * ability → the deepest licensing calling's rank.
   */
  licensedArts(): Map<string, number> {
    const out = new Map<string, number>();
    for (const id of this.callings) {
      const def = callingDef(id);
      if (!def) continue;
      const rank = this.appliedRank(id);
      for (const fx of honedCalling(def, rank)) {
        if (fx.kind === 'art') out.set(fx.ability, Math.max(out.get(fx.ability) ?? 0, rank));
      }
    }
    return out;
  }

  /** The calling licensing this art (the deepest, if several), for the bench's word. */
  licensingCalling(ability: string): CallingDef | undefined {
    let best: CallingDef | undefined;
    let bestRank = 0;
    for (const id of this.callings) {
      const def = callingDef(id);
      if (!def) continue;
      const rank = this.appliedRank(id);
      if (rank > bestRank && honedCalling(def, rank).some((fx) => fx.kind === 'art' && fx.ability === ability)) {
        best = def;
        bestRank = rank;
      }
    }
    return best;
  }

  /**
   * THE UNWRITTEN PAGE's codex law: a hidden art simply does not exist
   * here until its deed is done — no veiled plate, no rumor to
   * min-max. THE QUIET SHELF extends it to the secrets: a secret art
   * shows only while a weapon in hand teaches it, while it holds a
   * seat, or once it is mastered — 114 arts stay a world of rumors,
   * never a spreadsheet.
   */
  visibleTechniques(style: SkillId): TechniqueDef[] {
    const inHand = this.equippedArtIds();
    const licensed = this.licensedArts();
    const secrets = secretArtsFor(style as TechniqueDef['style']).filter(
      (s) =>
        this.ownsArt(s.ability) ||
        inHand.has(s.ability) ||
        licensed.has(s.ability) ||
        this.seatOf(s.ability) !== null,
    );
    return [
      ...techniquesFor(style).filter(
        (t) => !t.hidden || this.earnedArts.includes(t.ability) || licensed.has(t.ability),
      ),
      ...secrets,
    ];
  }

  /** Server-confirmed answered Callings + applied ranks; re-renders whoever shows them. */
  setCallings(answered: string[], ranks: Record<string, number> = {}): void {
    this.callings = answered;
    this.callingRanks = ranks;
    this.renderSkills(this.lastSkills);
    if (this.artsOpen) artsWing.renderArts(this);
  }

  /** The APPLIED rank an answered Calling is held at (Rank I when unlisted). */
  appliedRank(id: string): number {
    return this.callingRanks[id] ?? 1;
  }

  /** Build one skill card for the hall. */
  /**
   * One emblem on the wall: the skill's mark ringed by its climb to
   * the next level, the level told as the trophy numeral. Focus or
   * hover raises the hero pane; the emblem itself stays quiet.
   */
  private skillEmblem(skill: SkillId, xp: SkillXp): HTMLElement {
    const hidden = HIDDEN_SKILLS[skill];
    const value = xp[skill] ?? 0;
    const level = levelForXp(value);
    const floor = xpForLevel(level);
    const ceil = xpForLevel(level + 1);
    const frac = level >= 99 ? 1 : (value - floor) / Math.max(1, ceil - floor);
    const face = SKILL_FACE[skill] ?? { icon: 'bread', color: '#d9a441' };

    const btn = document.createElement('button');
    btn.className = 'skill-emblem';
    if (level >= 99) btn.classList.add('maxed');
    if (hidden) btn.classList.add('secret-skill');
    if (this.skillSel === skill) btn.classList.add('selected');
    btn.style.setProperty('--skill-accent', face.color);
    btn.dataset.nav = '';
    btn.dataset.navkey = `skill:${skill}`;
    btn.dataset.acta = 'Read';
    btn.dataset.navnext = '#skills-hero';

    const ring = ringGauge(frac, { tone: face.color });
    ring.root.classList.add('emblem-ring');
    const img = document.createElement('img');
    img.src = itemIconUrl(face.icon, 30);
    img.draggable = false;
    ring.center.appendChild(img);
    const gem = document.createElement('span');
    gem.className = 'emblem-gem';
    gem.textContent = String(level);
    ring.root.appendChild(gem);
    const name = document.createElement('span');
    name.className = 'emblem-name';
    name.textContent = skillName(skill);
    btn.append(ring.root, name);
    btn.addEventListener('click', () => this.inspectSkill(skill));
    return btn;
  }

  /** Light the hero pane for one skill without rebuilding the wall. */
  private inspectSkill(skill: SkillId): void {
    if (this.skillSel === skill) return;
    this.skillSel = skill;
    this.skillsWall
      .querySelectorAll('.skill-emblem.selected')
      .forEach((e) => e.classList.remove('selected'));
    this.skillsWall
      .querySelector(`[data-navkey="${CSS.escape(`skill:${skill}`)}"]`)
      ?.classList.add('selected');
    this.renderSkillHero();
  }

  /**
   * THE HERO PANE — the chosen deed told whole: the crown of totals
   * presiding, then the skill's face, its climb, and its doors into
   * the codex. Renders on focus; travel costs nothing.
   */
  private renderSkillHero(): void {
    const xp = this.lastSkills;
    this.skillsHero.innerHTML = '';

    let total = 0;
    let mastered = 0;
    for (const s of SKILL_IDS) {
      if (HIDDEN_SKILLS[s] && xp[s] === undefined) continue;
      const lv = levelForXp(xp[s] ?? 0);
      total += lv;
      if (lv >= 99) mastered++;
    }
    const crown = document.createElement('div');
    crown.className = 'skills-total';
    const crownLeft = document.createElement('div');
    crownLeft.className = 'skills-total-label';
    crownLeft.textContent = 'Total level';
    const crownValue = document.createElement('strong');
    crownValue.textContent = total.toLocaleString();
    const crownRight = document.createElement('div');
    crownRight.className = 'skills-total-note';
    crownRight.textContent =
      mastered > 0
        ? `${mastered} ${mastered === 1 ? 'skill' : 'skills'} mastered`
        : 'Deeds raise levels — go do';
    crown.append(crownLeft, crownValue, crownRight);
    this.skillsHero.appendChild(crown);

    const skill = this.skillSel;
    if (!skill) return;
    const hidden = HIDDEN_SKILLS[skill];
    const value = xp[skill] ?? 0;
    const level = levelForXp(value);
    const floor = xpForLevel(level);
    const ceil = xpForLevel(level + 1);
    const frac = level >= 99 ? 1 : (value - floor) / Math.max(1, ceil - floor);
    const face = SKILL_FACE[skill] ?? { icon: 'bread', color: '#d9a441' };

    const head = document.createElement('div');
    head.className = 'hero-head';
    head.style.setProperty('--skill-accent', face.color);
    const plaque = document.createElement('span');
    plaque.className = 'skill-plaque';
    plaque.style.borderColor = face.color;
    const img = document.createElement('img');
    img.src = itemIconUrl(face.icon, 34);
    img.draggable = false;
    plaque.appendChild(img);
    const names = document.createElement('span');
    names.className = 'skill-names';
    const name = document.createElement('span');
    name.className = 'skill-name';
    name.textContent = skillName(skill);
    const tale = document.createElement('span');
    tale.className = 'skill-tale';
    tale.textContent = hidden ? 'A secret art — you earned knowing it' : (SKILL_STORY[skill] ?? '');
    names.append(name, tale);
    const gem = document.createElement('span');
    gem.className = 'lvl-gem';
    const gemNum = document.createElement('span');
    gemNum.className = 'lvl-gem-num';
    gemNum.textContent = String(level);
    gem.appendChild(gemNum);
    head.append(plaque, names, gem);
    this.skillsHero.appendChild(head);

    const bar = document.createElement('div');
    bar.className = 'ui-meter skill-meter';
    const fill = document.createElement('div');
    fill.className = 'ui-meter-fill';
    fill.style.width = `${Math.round(frac * 100)}%`;
    if (level < 99) fill.style.background = face.color;
    bar.appendChild(fill);
    this.skillsHero.appendChild(bar);

    const story = document.createElement('div');
    story.className = 'skill-story';
    story.textContent =
      level >= 99
        ? `${value.toLocaleString()} xp · mastered`
        : `${value.toLocaleString()} xp · ${(ceil - value).toLocaleString()} to level ${level + 1}`;
    this.skillsHero.appendChild(story);

    // A combat school opens into the codex: the seat riding this
    // school today, and the door through.
    const techs = techniquesFor(skill);
    if (techs.length > 0) {
      const row = document.createElement('div');
      row.className = 'tech-link-row';
      const title = document.createElement('span');
      title.className = 'technique-title';
      title.textContent = 'Technique';
      row.appendChild(title);
      const chosen =
        this.techniques.find((a) => techniquePoolDef(a ?? '')?.style === skill) ?? null;
      const ab = chosen ? abilityDef(chosen) : undefined;
      if (ab) {
        const plate = document.createElement('img');
        plate.className = 'technique-plate';
        plate.src = abilityIconUrl(ab.id, 34);
        plate.draggable = false;
        row.appendChild(plate);
        const chosenName = document.createElement('span');
        chosenName.className = 'tech-link-name';
        chosenName.textContent = ab.name;
        row.appendChild(chosenName);
      } else {
        const none = document.createElement('span');
        none.className = 'tech-link-none';
        none.textContent = 'None chosen';
        row.appendChild(none);
      }
      const go = document.createElement('button');
      go.className = 'act-btn minor tech-link-go';
      go.textContent = 'Open Techniques';
      go.dataset.nav = '';
      go.dataset.navkey = `techgo:${skill}`;
      go.dataset.acta = 'Open';
      go.dataset.tipname = 'Techniques';
      go.dataset.tipsub = `Every ${hidden ? hidden.name : skill} art — inspect them, and seat two at your hand.`;
      go.addEventListener('click', () => {
        this.artsWing = 'arts';
        this.artsSchoolSel = skill;
        this.onOpenArts();
      });
      row.appendChild(go);
      this.skillsHero.appendChild(row);
    }

    // Every skill points at its Callings — the quiet half of the build.
    const defs = callingsFor(skill);
    if (defs.length > 0) {
      const row = document.createElement('div');
      row.className = 'tech-link-row calling-link-row';
      const title = document.createElement('span');
      title.className = 'technique-title';
      title.textContent = 'Callings';
      row.appendChild(title);
      const answered = defs.filter((d) => this.callings.includes(d.id));
      const open = defs.filter((d) => artsWing.callingState(this, d) !== 'locked').length;
      const label = document.createElement('span');
      label.className = answered.length > 0 ? 'tech-link-name' : 'tech-link-none';
      // THE OPEN HALL: a ten-seat ladder does not fit a name join —
      // the row summarizes (answered of unlocked, the first two by
      // name) and the door opens the skill's own ladder.
      const named = answered
        .slice(0, 2)
        .map((d) => `${d.name}${this.appliedRank(d.id) > 1 ? ` ${RANK_ROMAN[this.appliedRank(d.id)]}` : ''}`)
        .join(' · ');
      label.textContent =
        answered.length > 0
          ? `${answered.length} of ${open} answered${named ? ` · ${named}` : ''}${answered.length > 2 ? ' …' : ''}`
          : open > 0
            ? `None answered · ${open} open`
            : 'None answered';
      row.appendChild(label);
      const go = document.createElement('button');
      go.className = 'act-btn minor tech-link-go';
      go.textContent = 'Open Callings';
      go.dataset.nav = '';
      go.dataset.navkey = `callgo:${skill}`;
      go.dataset.acta = 'Open';
      go.dataset.tipname = 'Callings';
      go.dataset.tipsub = `The ${hidden ? hidden.name : skill} passives — answer them within your Focus.`;
      go.addEventListener('click', () => {
        this.artsWing = 'callings';
        this.callingSkillSel = skill;
        this.callingSel =
          defs.find((d) => artsWing.callingState(this, d) === 'answered')?.id ??
          defs.find((d) => artsWing.callingState(this, d) === 'unlocked')?.id ??
          defs[0]?.id ??
          null;
        this.onOpenArts();
      });
      row.appendChild(go);
      this.skillsHero.appendChild(row);
    }
  }

  /**
   * The hall of deeds: every discipline an emblem ringed by its
   * climb, grouped into named wings, all of it visible at once —
   * the chosen skill reads whole on the hero pane to the right.
   */
  renderSkills(xp: SkillXp): void {
    this.lastSkills = xp;
    // A level gained re-judges every gate in view: the pack's barred
    // wells and the open card's gate band both tell the new truth the
    // moment the skill lands — no reopen required.
    this.applyReqGate();
    if (this.cardSource?.kind === 'inv') {
      const src = this.lastSlots[this.cardSource.slot];
      if (src) this.renderCard(src.item, src.qty, null, src.roll);
    }
    this.renderIdentity();
    this.skillsWall.innerHTML = '';

    // The hero pane's default subject: the highest deed in the house.
    const present = SKILL_IDS.filter((s) => !(HIDDEN_SKILLS[s] && xp[s] === undefined));
    if (!this.skillSel || !present.includes(this.skillSel)) {
      this.skillSel = present.reduce(
        (best, s) =>
          best === null || levelForXp(xp[s] ?? 0) > levelForXp(xp[best] ?? 0) ? s : best,
        null as SkillId | null,
      );
    }

    for (const wing of SKILL_WINGS) {
      // Hidden-skill law: a secret skill simply does not exist in this
      // panel until the character's skill record carries its key — the
      // server writes the row only at the moment of discovery. A wing
      // with nothing to show is not built at all.
      const here = wing.skills.filter((s) => !(HIDDEN_SKILLS[s] && xp[s] === undefined));
      if (here.length === 0) continue;
      this.skillsWall.appendChild(sectionHead(wing.title));
      const grid = document.createElement('div');
      grid.className = 'skill-wall';
      for (const skill of here) grid.appendChild(this.skillEmblem(skill, xp));
      this.skillsWall.appendChild(grid);
    }
    this.renderSkillHero();

    // Leveling can unveil a new rung — keep the codex pip honest.
    artsWing.updateArtsPip(this);
    if (this.artsOpen) artsWing.renderArts(this);
  }

  // ==================================================================
  // THE TECHNIQUES CODEX — the dedicated home of the combat arts.
  // Laws:
  // - THE LOADOUT TELLS THE STORY: the strip up top shows the live
  //   Q/E/R/T abilities with their sources, so the R slot's place in
  //   the kit is never a secret again.
  // - THE NEXT RUNG SHOWS ITS FACE: within a ladder, everything you've
  //   unlocked plus the next locked rank is named; deeper ranks stay
  //   VEILED — a mystery plate that admits something exists without
  //   telling what. Hidden-skill ladders obey row-presence entirely.
  // - SEEN IS A LEDGER: a freshly unlocked art wears a NEW pip (and
  //   the dock button a glint) until it's been inspected once —
  //   localStorage, purely cosmetic.
  // ==================================================================

  /** Roman numerals for the four rungs of every school's ladder. */









  // ---------------------------------------------- the Callings wing




















  /** The bench: the chosen Calling laid out large, the answer button. */


















}
