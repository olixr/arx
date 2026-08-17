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
  describeEffect,
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
import { bigButton, sectionHead, statPlaque } from './panel.js';
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
/** The when clause's word for each weapon style in hand. */
const WIELD_WORD: Record<string, string> = {
  onehand: 'a one-hand blade',
  twohand: 'a two-hander',
  polearm: 'a polearm',
  archery: 'a bow',
  arx: 'a staff',
};

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
 * Every skill's face: an item that embodies the craft, and an accent
 * the card's plaque and meter wear. Pure data — a new skill is a row.
 */
export const SKILL_FACE: Record<string, { icon: string; color: string }> = {
  vitality: { icon: 'bread', color: '#d95763' },
  combat: { icon: 'iron_helm', color: '#b0623c' },
  onehand: { icon: 'bronze_sword', color: '#c4553d' },
  defence: { icon: 'oak_kiteshield', color: '#8ac4e8' },
  archery: { icon: 'stickbow', color: '#7dc46a' },
  arx: { icon: 'apprentice_staff', color: '#b49af0' },
  mining: { icon: 'bronze_pickaxe', color: '#9aa2ac' },
  woodcutting: { icon: 'bronze_axe', color: '#b08a5c' },
  fishing: { icon: 'fishing_rod', color: '#7fb2d9' },
  smithing: { icon: 'bronze_bar', color: '#e8944a' },
  woodworking: { icon: 'oak_log', color: '#a8794a' },
  leatherworking: { icon: 'leather', color: '#b08a5c' },
  tailoring: { icon: 'cloth', color: '#c9a8e8' },
  cooking: { icon: 'trout', color: '#e8b64c' },
  construction: { icon: 'log', color: '#c98d4b' },
  farming: { icon: 'carrot', color: '#7ac46a' },
  foraging: { icon: 'berries', color: '#9ac46a' },
  herbalism: { icon: 'sagewort', color: '#7ac4a0' },
  enchanting: { icon: 'arcane_dust', color: '#b49af0' },
  beastcraft: { icon: 'bones', color: '#c4b590' },
  sneak: { icon: 'bronze_dagger', color: '#8a7fae' },
  twohand: { icon: 'iron_greatblade', color: '#c47a3d' },
  // The reaching school's coin wears the CREST (the head half zoomed
  // to the box), not the item icon — a full-length spear at coin size
  // reads as a hairline.
  polearm: { icon: 'polearm_crest', color: '#9a8560' },
  dualwield: { icon: 'bronze_dagger', color: '#d9a441' },
  shield: { icon: 'tower_shield', color: '#9db6cc' },
};

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
const EQUIP_SLOTS: EquipSlot[] = [
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
];

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
  private readonly artsPanel = document.getElementById('arts-panel')!;
  private readonly artsRail = document.getElementById('arts-rail')!;
  private readonly artsLoadout = document.getElementById('arts-loadout')!;
  private readonly artsSchools = document.getElementById('arts-schools')!;
  private readonly artsDetail = document.getElementById('arts-detail')!;
  /** THE PROVING GROUND: the live diagram pane of the chosen art. */
  private readonly artsGroundHost = document.getElementById('arts-ground')!;
  private readonly ground: ProvingGround = provingGround();
  /** The Hand's two art seats, kept for the seat-flight landing flash. */
  private altarSockets: Socket[] = [];
  /** The technique the codex bench is laying out (null = auto-pick). */
  private artsSel: string | null = null;
  /** The school standing on the stage (the rail's choice). */
  private artsSchoolSel: SkillId | null = null;
  /** Which wing of the codex is open: the actives or the passives. */
  private artsWing: 'arts' | 'callings' = 'arts';
  /** THE OPEN HALL: the skill whose calling ladder stands on the stage. */
  private callingSkillSel: SkillId | null = null;
  /** The Calling the bench is laying out (callings wing). */
  private callingSel: string | null = null;
  /** Answered Callings, mirrored from the server. */
  private callings: string[] = [];
  /** APPLIED ranks past I by id (absent = Rank I). */
  private callingRanks: Record<string, number> = {};
  /** Unlocked techniques the player has inspected — the NEW-pip ledger. */
  private readonly seenTech = new Set<string>(
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
  private readonly seenCallings = new Set<string>(
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
  private readonly wornManifest = document.getElementById('worn-manifest')!;
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
  private techniques: [string | null, string | null] = [null, null];
  /** THE LESSON LAW's banks (server truth; cost derives from the dial). */
  private lessons: Record<string, number> = {};
  /** Hidden arts earned by deed, mirrored from the server. */
  private earnedArts: string[] = [];
  private lastSkills: SkillXp = {};
  private lastSlots: InvSlot[] = [];
  private lastEquipment: Partial<Record<string, EquippedItem>> = {};
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
    private readonly onTechnique: (ability: string, slot: 0 | 2) => void = () => {},
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
    /** The case's owner: the adventurer name on the identity line. */
    private readonly identityInfo: () => { name?: string } = () => ({}),
    /** Opens the Techniques codex (skill cards link into it). */
    private readonly onOpenArts: () => void = () => {},
    /** Answer or set down a Calling (server enforces THE FOCUS LAW). */
    private readonly onCalling: (calling: string, on: boolean, rank?: number) => void = () => {},
    /** THE SECOND GRIP: fire the swap verb (the rack's Draw/Trade). */
    private readonly onSwapSets: () => void = () => {},
  ) {
    // Dock buttons are wired in main through the one screen-exclusivity
    // gate — no panel opens itself anymore.
    // The pack's filter lens: All / Gear / Food / Mats chips.
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
      this.packFilters.appendChild(chip);
    }
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
      const st = this.techState(def.style, def);
      if (st !== 'unlocked' && st !== 'equipped') return [];
      return this.seatVerbs(ability, st);
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
    if (this.artsOpen) this.renderArts();
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
    this.renderArts();
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
      this.inspectArt(artKey.slice('art:'.length));
      return false;
    }
    // The veil cap inspects like a plate: the mist tells its size.
    if (artKey?.startsWith('artveil:')) {
      this.inspectArt(`veil:${artKey.slice('artveil:'.length)}`);
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
    // The armor stand: every socket hung at its body place.
    this.equipAnatomy.innerHTML = '';
    for (const slot of EQUIP_SLOTS) {
      this.equipAnatomy.appendChild(this.equipCell(slot, equipment));
    }
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
    this.renderWornManifest(equipment);
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
    if (this.artsOpen) this.renderArts();
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
   * THE KIT SPEAKS: the stand's manifest — every worn piece named in
   * its rarity ink with its headline figure beside it. The anatomy
   * shows WHERE things hang; this tells WHAT they are and WHAT they
   * give, with no hover required. Rows carry the loot-card dataset,
   * so resting the eye on one lays the full story out on the bench.
   */
  private renderWornManifest(equipment: Partial<Record<string, EquippedItem>>): void {
    this.wornManifest.innerHTML = '';
    const rows: HTMLElement[] = [];
    for (const slot of EQUIP_SLOTS) {
      const worn = equipment[slot];
      if (!worn) continue;
      const def = itemDef(worn.id);
      if (!def) continue;
      const stats = rolledStats(worn.id, worn.roll);
      const row = document.createElement('div');
      row.className = 'worn-row';
      row.dataset.nav = '';
      row.dataset.navkey = `wornrow:${slot}`;
      row.dataset.acta = 'Inspect';
      // The loot-card dataset: hover and pad focus raise the full
      // item story on the bench — the same wire the vault speaks.
      row.dataset.lootitem = worn.id;
      row.dataset.lootqty = '1';
      if (worn.roll) row.dataset.lootroll = JSON.stringify(worn.roll);
      const img = document.createElement('img');
      img.src = itemIconUrl(worn.id, 36);
      img.draggable = false;
      const name = document.createElement('span');
      name.className = 'worn-row-name';
      name.textContent = instanceName(worn.id, worn.roll);
      // Common wears no treatment — parchment, like every plain word.
      const ink = RARITY_COLORS[rarityOfInstance(worn.id, worn.roll)];
      if (ink) name.style.color = ink;
      // A piece of a lit family carries the court's gold tick.
      const rowSet = def.gear?.set;
      if (rowSet && this.setCount(rowSet) >= 2) {
        const tick = document.createElement('span');
        tick.className = 'house-tick';
        tick.textContent = '◆';
        name.appendChild(tick);
      }
      // The headline: the piece's one most honest figure. A RACK piece
      // says only where it stands — THE SLEEPING STEEL grants nothing,
      // so its row must promise nothing (a damage figure here would be
      // the manifest lying about the fold).
      const note = document.createElement('span');
      note.className = 'worn-row-note';
      if (isStowedSlot(slot)) {
        row.classList.add('rack-row');
        note.textContent = 'at the ready';
      } else {
        const relicArt = def.relic ? abilityDef(def.relic)?.name : undefined;
        const sigilArt = def.sigil ? abilityDef(def.sigil)?.name : undefined;
        const passive = def.passive ? PASSIVES[def.passive]?.name : undefined;
        note.textContent =
          stats?.damage !== undefined && stats.damage > 0
            ? `${Math.floor(stats.damage)} dmg${stats.affixes.length > 0 ? ` · ${stats.affixes.length}✦` : ''}`
            : stats && stats.armor > 0
              ? `${stats.armor} armor${stats.affixes.length > 0 ? ` · ${stats.affixes.length}✦` : ''}`
              : (relicArt ?? sigilArt ?? passive ?? (def.armor ? `${def.armor} armor` : slot));
      }
      row.append(img, name, note);
      rows.push(row);
    }
    this.wornManifest.classList.toggle('hidden', rows.length === 0);
    if (rows.length === 0) return;
    // THE HOUSE LEADS THE KIT: every worn family holds court at the
    // manifest's head — most pieces first — then the pieces themselves.
    // No furniture when no family is worn.
    const families = Object.entries(this.lastGearStats?.setCounts ?? {})
      .filter(([, n]) => n >= 1)
      .sort((a, b) => b[1] - a[1]);
    if (families.length > 0) {
      this.wornManifest.appendChild(sectionHead(families.length === 1 ? 'The house' : 'The houses'));
      for (const [setId] of families) {
        const court = this.houseCourt(setId);
        if (court) this.wornManifest.appendChild(court);
      }
    }
    this.wornManifest.appendChild(sectionHead('The kit'));
    for (const row of rows) this.wornManifest.appendChild(row);
  }

  /**
   * The gear ledger: everything the worn kit adds up to, told as stat
   * plaques under the stage — a big honest number over a plain label.
   */
  private renderGearStrip(): void {
    const gear = this.lastGearStats;
    if (!gear) return;
    this.gearStrip.innerHTML = '';
    const add = (value: string, label: string, tone: string): void => {
      this.gearStrip.appendChild(statPlaque(value, label, tone));
    };
    if (gear.armor > 0) add(String(gear.armor), 'Armor', '#8ac4e8');
    if (gear.maxHp > 0) add(`+${gear.maxHp}`, 'Max HP', '#d95763');
    if (gear.regenPer4s > 0) add(`+${gear.regenPer4s}`, 'Regen /4s', '#7ac47a');
    for (const [skill, bonus] of Object.entries(gear.skillBonus)) {
      if (bonus) add(`+${bonus}`, affixName(skill), '#7dc46a');
    }
    for (const [style, mult] of Object.entries(gear.styleDmgMult)) {
      if (Math.abs(mult - 1) > 0.001) {
        const pct = Math.round((mult - 1) * 100);
        add(`${pct > 0 ? '+' : ''}${pct}%`, `${affixName(style)} dmg`, pct > 0 ? '#e8b64c' : '#d95763');
      }
    }
    if (Math.abs(gear.speedMult - 1) > 0.001) {
      const pct = Math.round((gear.speedMult - 1) * 100);
      add(`${pct > 0 ? '+' : ''}${pct}%`, 'Move speed', pct > 0 ? '#7ac47a' : '#d9a441');
    }
    if (Math.abs(gear.cooldownMult - 1) > 0.001) {
      const pct = Math.round((1 - gear.cooldownMult) * 100);
      add(`−${pct}%`, 'Cooldowns', '#b49af0');
    }
    this.gearStrip.classList.toggle('hidden', this.gearStrip.childElementCount === 0);
  }

  /**
   * The identity line: adventurer name + total level. The character
   * itself is not duplicated here — the camera frames the LIVE rig in
   * the world beside the case, wearing every change as it lands.
   */
  private renderIdentity(): void {
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
    if (this.artsOpen) this.renderArts();
  }

  /** The seat an ability occupies (0 = Q, 1 = R), or null. */
  private seatOf(ability: string): 0 | 1 | null {
    if (this.techniques[0] === ability) return 0;
    if (this.techniques[1] === ability) return 1;
    return null;
  }

  /** THE LOAN LAW's teaching hands, read off the worn weapons. */
  private equippedArtIds(): Set<string> {
    const out = new Set<string>();
    const main = itemDef(this.lastEquipment.weapon?.id ?? '')?.weapon?.art;
    if (main) out.add(main);
    const off = itemDef(this.lastEquipment.offhand?.id ?? '')?.weapon?.art;
    if (off) out.add(off);
    return out;
  }

  /** An art owned outright: a deed page or a mastered secret. */
  private ownsArt(ability: string): boolean {
    return this.earnedArts.includes(ability);
  }

  /**
   * THE MASTER'S LICENSE, derived here from the answered set exactly
   * as recomputeGear derives it (THE QUIET WIRE: no new field —
   * both ends read the same packages at the same applied ranks):
   * ability → the deepest licensing calling's rank.
   */
  private licensedArts(): Map<string, number> {
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
  private licensingCalling(ability: string): CallingDef | undefined {
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
  private visibleTechniques(style: SkillId): TechniqueDef[] {
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
    if (this.artsOpen) this.renderArts();
  }

  /** The APPLIED rank an answered Calling is held at (Rank I when unlisted). */
  private appliedRank(id: string): number {
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
      const open = defs.filter((d) => this.callingState(d) !== 'locked').length;
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
          defs.find((d) => this.callingState(d) === 'answered')?.id ??
          defs.find((d) => this.callingState(d) === 'unlocked')?.id ??
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
    this.updateArtsPip();
    if (this.artsOpen) this.renderArts();
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
  /** Combat schools owning a technique ladder, hidden law honored. */
  private artsSchoolIds(): SkillId[] {
    return SKILL_IDS.filter(
      (s) =>
        techniquesFor(s).length > 0 && !(HIDDEN_SKILLS[s] && this.lastSkills[s] === undefined),
    );
  }

  /**
   * THE HONED-ART LAW, mirrored: the rank the BASE level has earned.
   * THE LOAN LAW holds an unmastered secret at Rank I — the borrowed
   * motion is correct but not yet yours.
   */
  private techRank(style: SkillId, tech: TechniqueDef): number {
    const license = this.licensedArts().get(tech.ability) ?? 0;
    const natural =
      tech.secret && !this.ownsArt(tech.ability)
        ? 1
        : techniqueRankFor(tech, levelForXp(this.lastSkills[style] ?? 0));
    return Math.max(1, natural, license);
  }

  /** A technique's rung state against the player's skill level. */
  private techState(
    style: SkillId,
    tech: { ability: string; unlockLevel: number },
  ): 'equipped' | 'unlocked' | 'locked' | 'veiled' {
    const level = levelForXp(this.lastSkills[style] ?? 0);
    if (level >= tech.unlockLevel || this.licensedArts().has(tech.ability)) {
      return this.seatOf(tech.ability) !== null ? 'equipped' : 'unlocked';
    }
    const firstLocked = techniquesFor(style)
      .filter((t) => !t.hidden && level < t.unlockLevel)
      .reduce((m, t) => Math.min(m, t.unlockLevel), Infinity);
    return tech.unlockLevel > firstLocked ? 'veiled' : 'locked';
  }

  /** Record that an unlocked art has been laid eyes on. */
  private markTechSeen(ability: string | null): void {
    if (!ability || this.seenTech.has(ability)) return;
    const entry = this.artsSchoolIds()
      .flatMap((s) => this.visibleTechniques(s).map((t) => ({ style: s, t })))
      .find((e) => e.t.ability === ability);
    if (!entry) return;
    const st = this.techState(entry.style, entry.t);
    if (st !== 'unlocked' && st !== 'equipped') return;
    this.seenTech.add(ability);
    localStorage.setItem('arx.techSeen', JSON.stringify([...this.seenTech]));
  }

  /** The dock button's glint: any unlocked art or Calling not yet inspected. */
  private updateArtsPip(): void {
    const unseen =
      this.artsSchoolIds().some((s) =>
        this.visibleTechniques(s).some((t) => {
          const st = this.techState(s, t);
          return (st === 'unlocked' || st === 'equipped') && !this.seenTech.has(t.ability);
        }),
      ) || this.unseenCallings() > 0;
    document.getElementById('btn-arts')?.classList.toggle('has-new', unseen);
  }

  /**
   * THE SCHOOL RAIL — one crest per school, the Callings last, LT/RT
   * stepping the stops. It replaced the wing tabs AND the jump strip:
   * one school stands on the stage at a time, so the eight-ladder
   * scroll is gone and nothing lives below the fold.
   */
  private renderArtsRail(schools: SkillId[]): void {
    this.artsRail.innerHTML = '';
    this.artsRail.dataset.pager = '';
    // The rail is the codex's SECTIONS — the bumpers step it now
    // (THE BUMPER SERVES THE ROOM); LT/RT still reach it as pager.
    this.artsRail.dataset.tabs = '';
    // THE OPEN HALL (callings-v2 Phase 5): both wings ride ONE rail.
    // The arts wing stops at the technique schools; the callings wing
    // stops at every visible skill (every skill owns a ladder of
    // seats). The wing toggle lives in the stage head, so the rail
    // never carries a foreign stop.
    const stops: SkillId[] = this.artsWing === 'callings' ? this.callingSkillIds() : schools;
    if (!this.artsRail.dataset.pagerWired) {
      this.artsRail.dataset.pagerWired = '1';
      this.artsRail.addEventListener('kit-page', (e) => {
        const dir = (e as CustomEvent<-1 | 1>).detail;
        const order = this.artsWing === 'callings' ? this.callingSkillIds() : this.artsSchoolIds();
        const current = this.artsWing === 'callings' ? this.callingSkillSel : this.artsSchoolSel;
        const i = current ? order.indexOf(current) : -1;
        const next = order[Math.max(0, Math.min(order.length - 1, i + dir))];
        if (next !== undefined && next !== current) this.pickRailStop(next);
      });
    }
    for (const stop of stops) {
      const active =
        this.artsWing === 'callings' ? this.callingSkillSel === stop : this.artsSchoolSel === stop;
      const face = SKILL_FACE[stop] ?? { icon: 'bread', color: '#d9a441' };
      const btn = document.createElement('button');
      btn.className = 'rail-stop' + (active ? ' active' : '');
      btn.style.setProperty('--skill-accent', face.color);
      btn.dataset.nav = '';
      btn.dataset.navkey = `rail:${stop}`;
      btn.dataset.acta = 'Open';
      btn.dataset.navnext = '#arts-schools';
      // The crest: the school's mark ringed by its climb.
      const level = levelForXp(this.lastSkills[stop] ?? 0);
      const ring = ringGauge(level / 99, { tone: face.color });
      const img = document.createElement('img');
      img.src = itemIconUrl(face.icon, 26);
      img.draggable = false;
      ring.center.appendChild(img);
      const text = document.createElement('span');
      text.className = 'rail-text';
      const name = document.createElement('span');
      name.className = 'rail-name';
      name.textContent = skillName(stop);
      const lv = document.createElement('span');
      lv.className = 'rail-sub';
      if (this.artsWing === 'callings') {
        // The callings rail speaks the ladder: answered of unlocked.
        const defs = callingsFor(stop);
        const answered = defs.filter((d) => this.callingState(d) === 'answered').length;
        const open = defs.filter((d) => this.callingState(d) !== 'locked').length;
        lv.textContent = open > 0 ? `${answered} of ${open}` : `Lv ${level}`;
      } else {
        lv.textContent = `Lv ${level}`;
      }
      text.append(name, lv);
      btn.append(ring.root, text);
      const unseenHere =
        this.artsWing === 'callings'
          ? callingsFor(stop).some((d) => this.callingState(d) !== 'locked' && !this.seenCallings.has(d.id))
          : this.visibleTechniques(stop).some((t) => {
              const s = this.techState(stop, t);
              return (s === 'unlocked' || s === 'equipped') && !this.seenTech.has(t.ability);
            });
      if (unseenHere) btn.classList.add('has-pip');
      // A school holding a seated art wears its quiet in-hand mark; a
      // skill holding an answered calling wears the same mark.
      if (
        this.artsWing === 'callings'
          ? callingsFor(stop).some((d) => this.callings.includes(d.id))
          : this.techniques.some((a) => techniquePoolDef(a ?? '')?.style === stop)
      ) {
        btn.classList.add('in-hand-stop');
      }
      btn.dataset.tipname = skillName(stop);
      btn.dataset.tipsub =
        this.artsWing === 'callings' ? `Level ${level} · ${lv.textContent}` : `Level ${level}`;
      btn.addEventListener('click', () => this.pickRailStop(stop));
      this.artsRail.appendChild(btn);
    }
  }

  /** Step or click to a rail stop: a school (or a skill's ladder) onto the stage. */
  private pickRailStop(stop: SkillId): void {
    if (this.artsWing === 'callings') {
      this.callingSkillSel = stop;
      // The bench follows the stage: keep the pick if it lives here,
      // else lift the skill's best seat onto the bench.
      const here = callingsFor(stop);
      if (!here.some((d) => d.id === this.callingSel)) {
        this.callingSel =
          here.find((d) => this.callingState(d) === 'answered')?.id ??
          here.find((d) => this.callingState(d) === 'unlocked')?.id ??
          here[0]?.id ??
          this.callingSel;
      }
    } else {
      this.artsSchoolSel = stop;
      // The bench follows the stage: keep the pick if it lives here,
      // else lift the school's best face onto the bench.
      const here = this.visibleTechniques(stop);
      if (!here.some((t) => t.ability === this.artsSel)) {
        this.artsSel =
          here.find((t) => this.techState(stop, t) === 'equipped')?.ability ??
          here.find((t) => this.techState(stop, t) === 'unlocked')?.ability ??
          here[0]?.ability ??
          this.artsSel;
      }
    }
    this.renderArts();
  }

  /** THE OPEN HALL's door: swap the wing, keeping the skill on the stage when both wings own it. */
  private setArtsWing(wing: 'arts' | 'callings'): void {
    if (this.artsWing === wing) return;
    this.artsWing = wing;
    if (wing === 'callings') {
      const skills = this.callingSkillIds();
      if (this.artsSchoolSel && skills.includes(this.artsSchoolSel)) this.callingSkillSel = this.artsSchoolSel;
    } else if (this.callingSkillSel && this.artsSchoolIds().includes(this.callingSkillSel)) {
      this.artsSchoolSel = this.callingSkillSel;
    }
    this.renderArts();
  }

  /** The codex, whole: altar, rail, the standing stop, the bench. */
  renderArts(): void {
    const schools = this.artsSchoolIds();
    const all = schools.flatMap((s) => this.visibleTechniques(s).map((t) => ({ style: s, t })));

    // Resolve the bench's subject: keep the player's pick if it still
    // exists, else default to a seated art (first seat first).
    if (!this.artsSel || !all.some((e) => e.t.ability === this.artsSel)) {
      this.artsSel =
        this.techniques[0] ??
        this.techniques[1] ??
        all.find((e) => this.techState(e.style, e.t) === 'unlocked')?.t.ability ??
        all.find((e) => this.techState(e.style, e.t) !== 'veiled')?.t.ability ??
        all[0]?.t.ability ??
        null;
    }
    // The stage follows the bench's subject on first open.
    if (this.artsWing === 'arts' && (!this.artsSchoolSel || !schools.includes(this.artsSchoolSel))) {
      this.artsSchoolSel =
        all.find((e) => e.t.ability === this.artsSel)?.style ?? schools[0] ?? null;
    }
    this.markTechSeen(this.artsSel);
    // THE OPEN HALL: the callings stage follows the bench's subject on
    // first open — resolved BEFORE the rail renders, so the rail lights
    // its active stop on the very first paint.
    if (this.artsWing === 'callings') {
      const skills = this.callingSkillIds();
      if (!this.callingSkillSel || !skills.includes(this.callingSkillSel)) {
        this.callingSkillSel =
          (this.callingSel ? callingDef(this.callingSel)?.skill : undefined) ??
          skills.find((sk) => callingsFor(sk).some((d) => this.callingState(d) === 'answered')) ??
          (this.artsSchoolSel && skills.includes(this.artsSchoolSel) ? this.artsSchoolSel : undefined) ??
          skills[0] ??
          null;
      }
    }
    this.renderArtsRail(schools);

    // The room wears its wing: the callings wing folds the proving
    // ground away and hands the stage to the passives (CSS keys on it).
    this.artsPanel.classList.toggle('wing-callings', this.artsWing === 'callings');
    // The hall names itself for the wing it is showing.
    const title = this.artsPanel.querySelector('h3');
    if (title) title.textContent = this.artsWing === 'callings' ? 'Callings' : 'Techniques';

    if (this.artsWing === 'callings') {
      this.ground.show(null);
      this.renderCallingsWing();
      return;
    }

    this.renderArtsLoadout();
    this.artsSchools.innerHTML = '';
    if (this.artsSchoolSel) this.artsSchools.appendChild(this.artsStage(this.artsSchoolSel));
    this.recenterRibbon();
    this.renderArtsBench(all);
    this.updateArtsPip();
  }

  // ---------------------------------------------- the Callings wing

  /** Skills whose Callings may show — the hidden-skill law honored. */
  private callingSkillIds(): SkillId[] {
    return SKILL_IDS.filter((s) => !(HIDDEN_SKILLS[s] && this.lastSkills[s] === undefined));
  }

  private callingState(def: CallingDef): 'answered' | 'unlocked' | 'locked' {
    if (this.callings.includes(def.id)) return 'answered';
    const level = levelForXp(this.lastSkills[def.skill] ?? 0);
    return level >= def.unlockLevel ? 'unlocked' : 'locked';
  }

  private focusUsed(): number {
    let used = 0;
    for (const id of this.callings) {
      const def = callingDef(id);
      if (def) used += callingCost(def.focusCost, this.appliedRank(id));
    }
    return used;
  }

  /** Unlocked-but-never-inspected Callings (the NEW-pip ledger). */
  private unseenCallings(): number {
    let n = 0;
    for (const skill of this.callingSkillIds()) {
      for (const def of callingsFor(skill)) {
        if (this.callingState(def) !== 'locked' && !this.seenCallings.has(def.id)) n++;
      }
    }
    return n;
  }

  private markCallingSeen(id: string | null): void {
    if (!id || this.seenCallings.has(id)) return;
    const def = callingDef(id);
    if (!def || this.callingState(def) === 'locked') return;
    this.seenCallings.add(id);
    localStorage.setItem('arx.callSeen', JSON.stringify([...this.seenCallings]));
  }

  /**
   * THE ANSWERED LIFE — the callings wing's foot band, the build in
   * one look: the Focus instrument, the roster of every answered
   * Calling worn as its gem, and THE SUM of what the whole answered
   * set gives, told in engraved chips.
   */
  private renderAnsweredLife(): void {
    const budget = focusBudget(this.lastSkills);
    const used = this.focusUsed();
    this.artsLoadout.innerHTML = '';

    const focus = document.createElement('div');
    focus.className = 'life-focus';
    const ftitle = document.createElement('span');
    ftitle.className = 'load-title';
    ftitle.textContent = 'Focus';
    const nums = document.createElement('span');
    nums.className = 'focus-nums' + (used > budget ? ' over' : '');
    nums.textContent = `${used} / ${budget}`;
    const bar = document.createElement('div');
    bar.className = 'focus-forge';
    const fill = document.createElement('div');
    fill.className = 'focus-fill' + (used >= budget ? ' full' : '');
    fill.style.width = `${budget > 0 ? Math.min(100, (used / budget) * 100) : 0}%`;
    bar.appendChild(fill);
    const teach = document.createElement('span');
    teach.className = 'focus-teach';
    teach.textContent = 'Every skill at 25, 50, 75, and 99 deepens it.';
    focus.append(ftitle, nums, bar, teach);

    const roster = document.createElement('div');
    roster.className = 'life-roster';
    const rtitle = document.createElement('span');
    rtitle.className = 'load-title';
    rtitle.textContent = 'The Answered Life';
    const strip = document.createElement('div');
    strip.className = 'life-strip';
    const answeredDefs = this.callings
      .map((id) => callingDef(id))
      .filter((d): d is CallingDef => !!d)
      .sort((a, b) =>
        a.skill === b.skill ? a.unlockLevel - b.unlockLevel : a.skill < b.skill ? -1 : 1,
      );
    if (answeredDefs.length === 0) {
      const empty = document.createElement('span');
      empty.className = 'life-empty';
      empty.textContent = 'Nothing answered yet. The ladders wait.';
      strip.appendChild(empty);
    }
    for (const def of answeredDefs) {
      const held = this.appliedRank(def.id);
      const b = document.createElement('button');
      b.className = 'life-gem' + (this.callingSel === def.id ? ' selected' : '');
      b.dataset.nav = '';
      b.dataset.navkey = `life:${def.id}`;
      b.dataset.acta = 'Visit';
      b.dataset.tipname = def.name;
      b.dataset.tipsub = `${skillName(def.skill)} · Rank ${RANK_ROMAN[held]} · ${callingCost(def.focusCost, held)} Focus`;
      const gem = document.createElement('span');
      gem.className = 'call-gem';
      gem.style.setProperty('--gem', def.color);
      const rank = document.createElement('span');
      rank.className = 'life-rank';
      rank.textContent = RANK_ROMAN[held] ?? 'I';
      b.append(gem, rank);
      b.addEventListener('click', () => this.jumpToCalling(def.id));
      strip.appendChild(b);
    }
    roster.append(rtitle, strip);

    const sum = document.createElement('div');
    sum.className = 'life-sum';
    const stitle = document.createElement('span');
    stitle.className = 'load-title';
    stitle.textContent = 'The Sum';
    const chips = document.createElement('div');
    chips.className = 'sum-chips';
    const lines = this.answeredSums(answeredDefs);
    if (lines.length === 0) {
      const c = document.createElement('span');
      c.className = 'sum-chip dim';
      c.textContent = 'No sums yet';
      chips.appendChild(c);
    }
    for (const line of lines) {
      const c = document.createElement('span');
      c.className = 'sum-chip';
      c.textContent = line;
      chips.appendChild(c);
    }
    sum.append(stitle, chips);

    this.artsLoadout.append(focus, roster, sum);
  }

  /**
   * The always-on aggregates of the answered set summed honestly, and
   * its verbs counted — conditional edges are never folded into flat
   * sums (a vsState clause is a clause, not armor).
   */
  private answeredSums(defs: CallingDef[]): string[] {
    const flat = { armor: 0, maxHp: 0, regen: 0, speed: 0, crit: 0, cooldown: 0, thorns: 0, skill: 0 };
    let procs = 0;
    let whens = 0;
    let arts = 0;
    let trades = 0;
    let edges = 0;
    let pieces = 0;
    let knacks = 0;
    for (const def of defs) {
      for (const fx of honedCalling(def, this.appliedRank(def.id))) {
        switch (fx.kind) {
          case 'gear': {
            const e = fx.effect;
            if (e.kind === 'armor') flat.armor += e.amount;
            else if (e.kind === 'maxHp') flat.maxHp += e.amount;
            else if (e.kind === 'regen') flat.regen += e.amount;
            else if (e.kind === 'speed') flat.speed += e.pct;
            else if (e.kind === 'crit') flat.crit += e.pct;
            else if (e.kind === 'cooldown') flat.cooldown += e.pct;
            else if (e.kind === 'thorns') flat.thorns += e.amount;
            else if (e.kind === 'skill') flat.skill += e.amount;
            else if (e.kind === 'styleDmg' || e.kind === 'elementDmg' || e.kind === 'vsState') edges++;
            else if (e.kind === 'proc') procs++;
            break;
          }
          case 'proc':
            procs++;
            break;
          case 'when':
            whens++;
            break;
          case 'art':
            arts++;
            break;
          case 'perPiece':
            pieces++;
            break;
          case 'perk':
            knacks++;
            break;
          case 'doubleGather':
          case 'gatherSpeed':
          case 'materialSave':
          case 'craftSpeed':
            trades++;
            break;
        }
      }
    }
    const out: string[] = [];
    if (flat.armor) out.push(`+${flat.armor} armor`);
    if (flat.maxHp) out.push(`+${flat.maxHp} health`);
    if (flat.regen) out.push(`+${flat.regen} mending`);
    if (flat.speed) out.push(`+${flat.speed}% speed`);
    if (flat.crit) out.push(`+${flat.crit}% crit`);
    if (flat.cooldown) out.push(`arts ${flat.cooldown}% sooner`);
    if (flat.thorns) out.push(`+${flat.thorns} thorns`);
    if (flat.skill) out.push(`+${flat.skill} skill`);
    if (edges) out.push(`${edges} edge${edges === 1 ? '' : 's'}`);
    if (procs) out.push(`${procs} working${procs === 1 ? '' : 's'}`);
    if (whens) out.push(`${whens} clause${whens === 1 ? '' : 's'}`);
    if (trades) out.push(`${trades} trade gift${trades === 1 ? '' : 's'}`);
    if (pieces) out.push(`${pieces} worn gift${pieces === 1 ? '' : 's'}`);
    if (knacks) out.push(`${knacks} knack${knacks === 1 ? '' : 's'}`);
    if (arts) out.push(`${arts} licensed art${arts === 1 ? '' : 's'}`);
    return out;
  }

  /** A gem in the foot band pressed: walk the hall to its own seat. */
  private jumpToCalling(id: string): void {
    const def = callingDef(id);
    if (!def) return;
    this.callingSkillSel = def.skill;
    this.callingSel = id;
    this.markCallingSeen(id);
    this.renderArts();
  }

  /**
   * THE OPEN HALL (callings-v2 Phase 5): the passives wing rebuilt for
   * a ten-seat world. ONE skill's ladder stands on the stage at a time
   * (the rail picks it — never 250 chips in one scroll, pad nav stays
   * key-true); the ladder is a path ribbon of seat plates in the arts
   * stage's own vocabulary; the Focus meter rides the loadout strip;
   * the bench reads the package.
   */
  private renderCallingsWing(): void {
    const skill = this.callingSkillSel;
    const here = skill ? callingsFor(skill) : [];
    // Resolve the bench subject: keep the pick while it lives on this
    // ladder, else lift the ladder's best seat.
    if (!this.callingSel || !here.some((d) => d.id === this.callingSel)) {
      this.callingSel =
        here.find((d) => this.callingState(d) === 'answered')?.id ??
        here.find((d) => this.callingState(d) === 'unlocked')?.id ??
        here[0]?.id ??
        null;
    }
    this.markCallingSeen(this.callingSel);
    this.renderAnsweredLife();
    this.artsSchools.innerHTML = '';
    if (skill) this.artsSchools.appendChild(this.callingStage(skill));
    this.renderCallingBench();
    this.updateArtsPip();
  }

  /** The wing toggle that sits in every stage head: Arts ◇ Callings. */
  private wingToggle(): HTMLElement {
    const wrap = document.createElement('span');
    wrap.className = 'wing-toggle';
    wrap.dataset.tipname = 'The two wings';
    wrap.dataset.tipsub = 'Arts are what you cast. Callings are what you are.';
    for (const wing of ['arts', 'callings'] as const) {
      const b = document.createElement('button');
      b.className = 'wing-tab' + (this.artsWing === wing ? ' active' : '');
      b.dataset.nav = '';
      b.dataset.navkey = `wing:${wing}`;
      b.dataset.acta = 'Open';
      b.textContent = wing === 'arts' ? 'Arts' : 'Callings';
      if (wing === 'callings' && this.unseenCallings() > 0) b.classList.add('has-pip');
      b.addEventListener('click', () => this.setArtsWing(wing));
      wrap.appendChild(b);
    }
    return wrap;
  }

  /**
   * THE ROAD (the callings wing rebuilt): one skill's sixteen seats
   * as a serpentine tree — two runs of eight, the second walking
   * back, joined by a forged turn — so the whole ladder stands on the
   * stage at once, every seat a large plaque the hand can press. The
   * pad's down press lands on the true ladder neighbor by geometry.
   */
  private callingStage(skill: SkillId): HTMLElement {
    const face = SKILL_FACE[skill] ?? { icon: 'bread', color: '#d9a441' };
    const hidden = HIDDEN_SKILLS[skill];
    const level = levelForXp(this.lastSkills[skill] ?? 0);
    const block = document.createElement('div');
    block.className = 'arts-stage calling-stage' + (hidden ? ' secret-skill' : '');
    block.style.setProperty('--skill-accent', face.color);

    const head = document.createElement('div');
    head.className = 'stage-head';
    const crest = document.createElement('span');
    crest.className = 'stage-crest';
    const crestImg = document.createElement('img');
    crestImg.src = itemIconUrl(face.icon, 30);
    crestImg.draggable = false;
    crest.appendChild(crestImg);
    const name = document.createElement('span');
    name.className = 'stage-school';
    name.textContent = skillName(skill);
    const gem = document.createElement('span');
    gem.className = 'stage-gem';
    gem.dataset.tipname = 'Skill level';
    gem.dataset.tipsub = `${skillName(skill)} stands at level ${level}.`;
    const gn = document.createElement('span');
    gn.className = 'stage-gem-num';
    gn.textContent = String(level);
    gem.appendChild(gn);
    head.append(crest, name, gem);

    const seats = callingsFor(skill).slice().sort((a, b) => a.unlockLevel - b.unlockLevel);
    let answered = 0;
    const pips = document.createElement('span');
    pips.className = 'ladder-pips';
    for (const d of seats) {
      const st = this.callingState(d);
      if (st === 'answered') answered++;
      const p = document.createElement('i');
      p.className = st;
      pips.appendChild(p);
    }
    pips.dataset.tipname = 'The ladder';
    pips.dataset.tipsub = `${seats.length} Callings on this ladder; ${answered} answer to you now.`;
    const count = document.createElement('span');
    count.className = 'stage-count';
    count.textContent = `${answered} answered`;
    head.append(pips, count, this.wingToggle());
    block.appendChild(head);

    const tree = document.createElement('div');
    tree.className = 'calling-tree';
    const runs = [seats.slice(0, 8), seats.slice(8).reverse()].filter((r) => r.length > 0);
    runs.forEach((run, r) => {
      const row = document.createElement('div');
      row.className = 'tree-row' + (r === 1 ? ' rev' : '');
      run.forEach((def, i) => {
        if (i > 0) {
          // The link belongs to the pair's LATER seat on the ladder —
          // it lights once that seat's rung is climbed.
          const later = r === 0 ? def : run[i - 1]!;
          const link = document.createElement('span');
          link.className = 'tree-link' + (this.callingState(later) !== 'locked' ? ' lit' : '');
          row.appendChild(link);
        }
        row.appendChild(this.seatPlaque(def));
      });
      tree.appendChild(row);
    });
    if (runs.length === 2) {
      // The turn at the road's far edge, down from seat eight to nine.
      const ninth = seats[8]!;
      const turn = document.createElement('span');
      turn.className = 'tree-turn' + (this.callingState(ninth) !== 'locked' ? ' lit' : '');
      tree.appendChild(turn);
      // Pin the bend to the two well lines once layout stands — the
      // rows' heights breathe with their names, so the road measures
      // itself rather than trusting arithmetic.
      requestAnimationFrame(() => {
        const rows = tree.querySelectorAll<HTMLElement>('.tree-row');
        const wellA = rows[0]?.querySelector<HTMLElement>('.seat-plaque:last-child .plaque-well');
        const wellB = rows[1]?.querySelector<HTMLElement>('.seat-plaque:last-child .plaque-well');
        if (!wellA || !wellB) return;
        const t = tree.getBoundingClientRect();
        const a = wellA.getBoundingClientRect();
        const b = wellB.getBoundingClientRect();
        turn.style.top = `${Math.round(a.top + a.height / 2 - t.top)}px`;
        turn.style.height = `${Math.round(b.top + b.height / 2 - (a.top + a.height / 2))}px`;
        turn.style.left = `${Math.round(Math.max(a.right, b.right) - t.left + 10)}px`;
        turn.style.right = 'auto';
      });
    }
    tree.addEventListener(
      'wheel',
      (e) => {
        const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        if (d === 0) return;
        e.preventDefault();
        this.stepCallingLadder(d > 0 ? 1 : -1);
      },
      { passive: false },
    );
    block.appendChild(tree);
    return block;
  }

  /** The wheel walks the ladder in seat order, whatever the road's bends. */
  private stepCallingLadder(dir: -1 | 1): void {
    const skill = this.callingSkillSel;
    if (!skill) return;
    const seats = callingsFor(skill).slice().sort((a, b) => a.unlockLevel - b.unlockLevel);
    const i = seats.findIndex((d) => d.id === this.callingSel);
    const next = seats[Math.max(0, Math.min(seats.length - 1, (i < 0 ? 0 : i) + dir))];
    if (next && next.id !== this.callingSel) this.inspectCalling(next.id);
  }

  /**
   * One seat as a PLAQUE: the painted well holding the calling's gem,
   * the seat level cut into a corner shield, THE RANK PIPS beneath,
   * and the name on the plate. States are drawn, never labeled:
   * answered floods the gem's own color, an open seat sits lit and
   * waiting, a locked seat is a dark socket with its level engraved.
   */
  private seatPlaque(def: CallingDef): HTMLElement {
    const st = this.callingState(def);
    const level = levelForXp(this.lastSkills[def.skill] ?? 0);
    const cap = st === 'locked' ? 0 : Math.max(1, callingRank(def, level));
    const held = st === 'answered' ? this.appliedRank(def.id) : 0;
    const btn = document.createElement('button');
    btn.className = `seat-plaque ${st}`;
    if (this.callingSel === def.id) btn.classList.add('selected');
    btn.dataset.nav = '';
    btn.dataset.navkey = `call:${def.id}`;
    btn.dataset.acta = 'Inspect';
    btn.style.setProperty('--gem', def.color);
    const well = document.createElement('span');
    well.className = 'plaque-well';
    const gem = document.createElement('span');
    gem.className = 'call-gem xl';
    gem.style.setProperty('--gem', def.color);
    well.appendChild(gem);
    const seat = document.createElement('span');
    seat.className = 'seat-lv';
    const sn = document.createElement('span');
    sn.className = 'seat-lv-num';
    sn.textContent = String(def.unlockLevel);
    seat.appendChild(sn);
    seat.dataset.tipname = 'The seat';
    seat.dataset.tipsub =
      st === 'locked'
        ? `Answers at ${skillName(def.skill)} level ${def.unlockLevel}.`
        : `Seated at ${skillName(def.skill)} level ${def.unlockLevel}.`;
    well.appendChild(seat);
    if (st !== 'locked' && !this.seenCallings.has(def.id)) {
      const pip = document.createElement('span');
      pip.className = 'new-pip';
      pip.textContent = 'NEW';
      well.appendChild(pip);
    }
    if (st !== 'locked') {
      const pips = document.createElement('span');
      pips.className = 'rank-pips';
      pips.dataset.tipname = 'Rank';
      pips.dataset.tipsub =
        held > 0
          ? `Answered at Rank ${RANK_ROMAN[held]}; honed to Rank ${RANK_ROMAN[cap]}.`
          : `Honed to Rank ${RANK_ROMAN[cap]}.`;
      for (let r = 1; r <= CALLING_MAX_RANK; r++) {
        const dot = document.createElement('i');
        dot.className = r <= held ? 'applied' : r <= cap ? 'earned' : '';
        pips.appendChild(dot);
      }
      well.appendChild(pips);
    }
    const nameEl = document.createElement('span');
    nameEl.className = 'plaque-name';
    nameEl.textContent = def.name;
    const sub = document.createElement('span');
    sub.className = 'plaque-sub';
    // The corner shield already speaks the seat; the sub never repeats it.
    sub.textContent =
      st === 'answered'
        ? `Rank ${RANK_ROMAN[held]} · ${callingCost(def.focusCost, held)} Focus`
        : `${def.focusCost} Focus`;
    btn.append(well, nameEl, sub);
    btn.addEventListener('click', () => this.inspectCalling(def.id));
    return btn;
  }

  /**
   * Light the bench for one calling without rebuilding the stage:
   * focus and hover ride this, so reading is free and the ring never
   * loses the plate it stands on.
   */
  private inspectCalling(id: string): void {
    if (this.callingSel === id) return;
    this.callingSel = id;
    this.markCallingSeen(id);
    const key = `call:${id}`;
    this.artsSchools
      .querySelectorAll('.seat-plaque.selected')
      .forEach((p) => p.classList.remove('selected'));
    this.artsSchools.querySelector(`[data-navkey="${CSS.escape(key)}"]`)?.classList.add('selected');
    // The foot band's roster mirrors the choice.
    this.artsLoadout
      .querySelectorAll('.life-gem.selected')
      .forEach((p) => p.classList.remove('selected'));
    this.artsLoadout
      .querySelector(`[data-navkey="${CSS.escape(`life:${id}`)}"]`)
      ?.classList.add('selected');
    this.renderCallingBench();
    // The rail's pip and the plaque's own pip may have just cleared.
    this.artsSchools.querySelector(`[data-navkey="${CSS.escape(key)}"] .new-pip`)?.remove();
    this.updateArtsPip();
  }

  /**
   * THE PACKAGE, spoken: one plain line per entry. Gear entries ride
   * the enchant vocabulary's own reader (one truth for cards and
   * benches); procs speak trigger and action; a when clause speaks
   * its condition and its grant; the trade dials and perks speak in
   * their own units.
   */
  private describeCallingEffect(fx: CallingEffect): string {
    switch (fx.kind) {
      case 'gear':
        return describeEffect(fx.effect);
      case 'proc':
        return describeEffect(fx.proc);
      case 'perPiece': {
        const parts: string[] = [];
        if (fx.speedPct) parts.push(`+${fx.speedPct}% speed`);
        if (fx.maxHp) parts.push(`+${fx.maxHp} max HP`);
        if (fx.armor) parts.push(`+${fx.armor} armor`);
        return `${parts.join(', ')} per worn ${fx.armorClass} piece`;
      }
      case 'perk':
        return this.describePerk(fx.perk, fx.magnitude);
      case 'doubleGather':
        return `${Math.round(fx.chance * 100)}% chance ${skillName(fx.skill)} yields double`;
      case 'gatherSpeed':
        return `${skillName(fx.skill)} ${Math.round((fx.mult - 1) * 100)}% faster`;
      case 'materialSave':
        return `${Math.round(fx.chance * 100)}% chance ${skillName(fx.skill)} saves its materials`;
      case 'craftSpeed':
        return `${skillName(fx.skill)} works ${Math.round((1 - fx.mult) * 100)}% faster`;
      case 'when':
        return `While ${this.describeCondition(fx.cond)}: ${this.describeGrant(fx.grant)}`;
      case 'art':
        return `Licenses the art ${abilityDef(fx.ability)?.name ?? fx.ability}`;
    }
  }

  private describeCondition(c: CallingCondition): string {
    switch (c.when) {
      case 'hpBelow':
        return `below ${Math.round(c.frac * 100)}% health`;
      case 'hpAbove':
        return `above ${Math.round(c.frac * 100)}% health`;
      case 'still':
        return 'standing firm';
      case 'moving':
        return 'on the move';
      case 'shieldRaised':
        return 'a shield is raised';
      case 'underground':
        return 'underground';
      case 'night':
        return 'night holds';
      case 'stateRiding':
        return `${c.status} rides you`;
      case 'wellFed':
        return 'well fed';
      case 'day':
        return 'day holds';
      case 'sneaking':
        return 'sneaking';
      case 'mounted':
        return 'in the saddle';
      case 'wielding':
        return `${WIELD_WORD[c.style]} is in hand`;
      case 'dualWielding':
        return 'a blade in each hand';
      case 'petOut':
        return 'your companion is out';
      case 'inCombat':
        return 'in the fight';
      case 'outOfCombat':
        return 'the fight is over';
      case 'outnumbered':
        return `${c.count} or more foes press you`;
    }
  }

  private describeGrant(g: CallingGrant): string {
    const parts: string[] = [];
    if (g.armor) parts.push(`+${g.armor} armor`);
    if (g.speedMult && g.speedMult !== 1) parts.push(`${g.speedMult > 1 ? '+' : ''}${Math.round((g.speedMult - 1) * 100)}% speed`);
    if (g.attackSpeedMult && g.attackSpeedMult !== 1) parts.push(`+${Math.round((g.attackSpeedMult - 1) * 100)}% swing speed`);
    if (g.critPct) parts.push(`+${g.critPct}% crit`);
    if (g.dmgMult && g.dmgMult !== 1) parts.push(`+${Math.round((g.dmgMult - 1) * 100)}% damage`);
    if (g.regenPer4s) parts.push(`mends ${g.regenPer4s} every four breaths`);
    if (g.reflectFrac) parts.push(`returns ${Math.round(g.reflectFrac * 100)}% of blows`);
    if (g.meleeLifesteal) parts.push(`blows drink ${Math.round(g.meleeLifesteal * 100)}%`);
    if (g.gatherSpeed && g.gatherSpeed !== 1) parts.push(`gathers ${Math.round((g.gatherSpeed - 1) * 100)}% faster`);
    return parts.length > 0 ? `${g.name} (${parts.join(', ')})` : g.name;
  }

  /** The one-site dials in plain words — the map PERK_DIALS documents, spoken. */
  private describePerk(perk: PerkId, m: number): string {
    const pct = (x: number): string => `${Math.round(Math.abs(x - 1) * 100)}%`;
    switch (perk) {
      case 'foodHealMult': return `food heals ${pct(m)} more`;
      case 'foodBuffDurMult': return `food buffs last ${pct(m)} longer`;
      case 'tonicBuffDurMult': return `tonics last ${pct(m)} longer`;
      case 'finisherBonusMult': return `finishers hit ${pct(m)} harder`;
      case 'stillArmor': return `+${m} armor while standing firm`;
      case 'shieldMult': return `wards are ${pct(m)} thicker`;
      case 'snapShotMult': return `snap shots hit ${pct(m)} harder`;
      case 'drawMoveFactor': return `walk your aim at ${Math.round(m * 100)}% pace`;
      case 'sneakFactorBonus': return `${Math.round(m * 100)}% quieter steps`;
      case 'backstabBonus': return `+${Math.round(m * 100)}% backstab`;
      case 'offhandDelayTicks': return `the off hand echoes in ${m} ticks`;
      case 'offhandFactorBonus': return `the echo strikes +${Math.round(m * 100)}% harder`;
      case 'undergroundGatherMult': return `gathers ${pct(m)} faster underground`;
      case 'nightGatherMult': return `gathers ${pct(m)} faster after dusk`;
      case 'burnChanceMult': return `${pct(m)} fewer meals burn`;
      case 'dotResistMult': return `poison and burning grip ${pct(m)} weaker`;
      case 'seedRefundChance': return `${Math.round(m * 100)}% chance seeds return`;
      case 'doubleHarvestChance': return `${Math.round(m * 100)}% chance harvests double`;
      case 'doubleProduceChance': return `${Math.round(m * 100)}% chance produce doubles`;
      case 'produceRestMult': return `beasts recover their gifts ${pct(m)} sooner`;
      case 'buildSpeedMult': return `builds ${pct(m)} faster`;
      case 'shieldArm': return `+${m} armor while a shield is raised`;
      case 'shieldThorns': return `+${m} thorns while a shield is raised`;
      case 'greatReach': return `+${m} tiles greatweapon reach`;
      case 'greatExecute': return `+${Math.round(m * 100)}% greatblow damage under 25% health`;
      case 'poleReach': return `+${m} tiles polearm reach`;
      case 'warGripBonus': return `+${Math.round(m * 100)}% war-grip damage`;
      case 'marchArmor': return `+${m} armor while moving`;
      case 'warSchooling': return `weapon schools fight ${m} levels higher`;
      case 'inscribeQuality': return `+${m} quality on every inscription`;
      case 'compostDiscount': return `compost closes ${m} worth sooner`;
      case 'brushRestMult': return `the brush window opens ${pct(m)} sooner`;
      case 'larderSellMult': return `larder orders pay ${pct(m)} more`;
    }
  }

  /** The bench: the chosen Calling laid out large, the answer button. */
  /**
   * THE BENCH of the callings wing, rebuilt as its own furniture: the
   * gem in a painted well, the state worn as a forged SEAL (never a
   * labeled box), the package as illuminated VERSES each led by its
   * kind's glyph, THE RANK SPINE instrument for the four depths, and
   * the verbs on brass. Everything drawn, nothing web.
   */
  private renderCallingBench(): void {
    this.artsDetail.innerHTML = '';
    const def = this.callingSel ? callingDef(this.callingSel) : undefined;
    const bench = document.createElement('div');
    bench.className = 'call-bench';
    this.artsDetail.appendChild(bench);
    if (!def) {
      const note = document.createElement('div');
      note.className = 'bench-empty';
      note.textContent = 'Raise a skill to 5 and its first Calling will gather here.';
      bench.appendChild(note);
      return;
    }
    const st = this.callingState(def);
    const callingSkill = skillName(def.skill);

    const head = document.createElement('div');
    head.className = 'bench-head';
    const well = document.createElement('div');
    well.className = 'bench-plate call-plate';
    well.style.setProperty('--gem', def.color);
    const gem = document.createElement('span');
    gem.className = 'call-gem xl';
    gem.style.setProperty('--gem', def.color);
    well.appendChild(gem);
    const names = document.createElement('div');
    names.className = 'bench-names';
    const name = document.createElement('div');
    name.className = 'bench-name';
    name.textContent = def.name;
    const line = document.createElement('div');
    line.className = 'bench-line';
    line.textContent = `${callingSkill} · Calling`;
    names.append(name, line);
    head.append(well, names);
    bench.appendChild(head);

    const level = levelForXp(this.lastSkills[def.skill] ?? 0);
    const cap = st === 'locked' ? 0 : Math.max(1, callingRank(def, level));
    const held = st === 'answered' ? this.appliedRank(def.id) : 0;
    const budget = focusBudget(this.lastSkills);
    const used = this.focusUsed();
    const heldCost = held > 0 ? callingCost(def.focusCost, held) : 0;

    // The state, worn as a seal — a cut banner, not a bordered label.
    const seal = document.createElement('div');
    seal.className = `call-seal ${st}`;
    seal.textContent =
      st === 'answered'
        ? `Answered at Rank ${RANK_ROMAN[held]} · holding ${heldCost} Focus`
        : st === 'unlocked'
          ? `Ready to answer · ${def.focusCost} Focus at Rank I`
          : `Answers at ${callingSkill} level ${def.unlockLevel}`;
    bench.appendChild(seal);

    const desc = document.createElement('p');
    desc.className = 'bench-desc';
    desc.textContent = def.desc;
    bench.appendChild(desc);

    // EVERY ANSWER IS SEEN: the package as verses, each led by the
    // glyph of its kind (steel, spark, moon, trade, knack, sigil).
    const readAt = held > 0 ? held : 1;
    const verses = document.createElement('div');
    verses.className = 'bench-verses';
    for (const fx of honedCalling(def, readAt)) {
      const row = document.createElement('div');
      row.className = 'verse';
      const glyph = document.createElement('span');
      glyph.className = `verse-glyph ${this.callingKindOf(fx)}`;
      const text = document.createElement('span');
      text.className = 'verse-text';
      text.textContent = this.describeCallingEffect(fx);
      row.append(glyph, text);
      verses.appendChild(row);
    }
    bench.appendChild(verses);

    // THE RANK SPINE: four studs, the walked depth lit, the earned
    // depth ringed, each stud pricing its step.
    const spine = document.createElement('div');
    spine.className = 'rank-spine call-spine';
    spine.style.setProperty('--walked-n', String(held > 1 ? (held - 1) / (CALLING_MAX_RANK - 1) : 0));
    for (let r = 1; r <= CALLING_MAX_RANK; r++) {
      const stud = document.createElement('span');
      stud.className =
        'spine-stud' +
        (r <= held ? ' attained' : r <= cap ? ' earned' : '') +
        (held > 0 && r === held ? ' current' : '');
      stud.dataset.tipname = `Rank ${RANK_ROMAN[r]}`;
      stud.dataset.tipsub =
        r <= cap
          ? `Earned. Holds ${callingCost(def.focusCost, r)} Focus when answered at this depth.`
          : st === 'locked'
            ? `Waits on the seat itself.`
            : `Waits on ${callingSkill} level ${rankLevel(def.unlockLevel, r)}.`;
      const num = document.createElement('span');
      num.className = 'stud-numeral';
      num.textContent = RANK_ROMAN[r] ?? String(r);
      stud.appendChild(num);
      const under = document.createElement('span');
      under.className = 'stud-under';
      under.textContent = `${callingCost(def.focusCost, r)}`;
      stud.appendChild(under);
      spine.appendChild(stud);
    }
    bench.appendChild(spine);

    // The next depth's own note, previewed as a verse of its own.
    if (def.ranks && readAt < CALLING_MAX_RANK) {
      const next = def.ranks[readAt - 1];
      if (next) {
        const nextLine = document.createElement('div');
        nextLine.className = 'bench-next-rank';
        const glyph = document.createElement('span');
        glyph.className = 'next-rank-glyph';
        glyph.textContent = RANK_ROMAN[readAt + 1] ?? '';
        const text = document.createElement('span');
        text.textContent = next.note;
        nextLine.append(glyph, text);
        bench.appendChild(nextLine);
      }
    }

    if (st !== 'locked') {
      const honed = document.createElement('div');
      honed.className = 'bench-line bench-honed';
      honed.textContent =
        cap >= CALLING_MAX_RANK
          ? `Honed to Rank ${RANK_ROMAN[cap]}, the deepest.`
          : `Honed to Rank ${RANK_ROMAN[cap]}. Rank ${RANK_ROMAN[cap + 1]} at ${callingSkill} level ${rankLevel(def.unlockLevel, cap + 1)}.`;
      bench.appendChild(honed);
    }

    const verbs = document.createElement('div');
    verbs.className = 'bench-verbs';
    bench.appendChild(verbs);
    let cant = false;
    if (st === 'answered') {
      if (held < cap) {
        const next = held + 1;
        const nextCost = callingCost(def.focusCost, next);
        const btn = bigButton(
          `Deepen to Rank ${RANK_ROMAN[next]} · ${nextCost} Focus`,
          `callrank:${def.id}:${next}`,
          () => this.onCalling(def.id, true, next),
        );
        if (used - heldCost + nextCost > budget) {
          btn.classList.add('cant');
          cant = true;
        }
        verbs.appendChild(btn);
      }
      if (held > 1) {
        verbs.appendChild(
          bigButton(
            `Lighten to Rank ${RANK_ROMAN[held - 1]} · ${callingCost(def.focusCost, held - 1)} Focus`,
            `callrank:${def.id}:${held - 1}`,
            () => this.onCalling(def.id, true, held - 1),
            { minor: true },
          ),
        );
      }
      verbs.appendChild(
        bigButton('Set down', `calloff:${def.id}`, () => this.onCalling(def.id, false), {
          minor: true,
        }),
      );
    } else if (st === 'unlocked') {
      const btn = bigButton(
        `Answer · ${def.focusCost} Focus`,
        `callon:${def.id}`,
        () => this.onCalling(def.id, true, 1),
      );
      if (used + def.focusCost > budget) {
        btn.classList.add('cant');
        cant = true;
      }
      verbs.appendChild(btn);
    }
    const teach = document.createElement('div');
    teach.className = 'bench-teach';
    teach.textContent = cant
      ? `Your Focus is ${used}/${budget}. Set another Calling down, or deepen a skill past 25, 50, 75, or 99.`
      : st === 'locked'
        ? `Climb ${callingSkill} and this seat will open on its own.`
        : 'Answering is always free to change. The budget is the only law; depth is yours to afford.';
    bench.appendChild(teach);
  }

  /** The glyph family a package entry belongs to, for the verse lead. */
  private callingKindOf(fx: CallingEffect): string {
    switch (fx.kind) {
      case 'gear':
        return fx.effect.kind === 'proc' ? 'proc' : 'gear';
      case 'perPiece':
        return 'gear';
      case 'doubleGather':
      case 'gatherSpeed':
      case 'materialSave':
      case 'craftSpeed':
        return 'trade';
      case 'perk':
        return 'knack';
      default:
        return fx.kind; // proc | when | art
    }
  }

  /**
   * The action a technique seat answers to (seat 0 casts ability1,
   * seat 1 ability3). EVERY GLYPH KNOWS ITS DEVICE: the seat is only
   * ever NAMED by a seatChip built from this action — never by a bare
   * letter baked into a sentence. `seatKey` died here in the Grand
   * Refit, Phase 3.
   */
  private seatAction(seat: 0 | 1): ActionId {
    return seat === 0 ? 'ability1' : 'ability3';
  }

  /** The raw pad button a seat rides — THE SEAT ANSWERS ITS OWN BUTTON. */
  private seatPadButton(seat: 0 | 1): number | undefined {
    return bindings.pad(this.seatAction(seat))[0];
  }

  /**
   * The seat sheet: the verbs a technique plate offers, seat chips
   * set into them. Seating an art is one press at the plate — the
   * two-column trip to the bench buttons is over.
   */
  private seatVerbs(ability: string, st: 'unlocked' | 'equipped'): SheetVerb[] {
    const verbs: SheetVerb[] = [];
    const seatOf = this.seatOf(ability);
    for (const seat of [0, 1] as const) {
      if (st === 'equipped' && seatOf === seat) continue;
      const label =
        st === 'equipped'
          ? glyphLine('Move to the • seat', seatChip(this.seatAction(seat)))
          : glyphLine('Seat on •', seatChip(this.seatAction(seat)));
      verbs.push({
        label,
        act: () => {
          this.seatFlight(ability, seat);
          this.onTechnique(ability, seat === 0 ? 0 : 2);
        },
        padButton: this.seatPadButton(seat),
      });
    }
    return verbs;
  }

  /**
   * THE LOADOUT ALTAR — four painted seats, always visible: the two
   * art seats side by side, then the trinkets, THE PAIRED HAND's
   * order matching the hotbar exactly. Each seat is a kit socket
   * wearing its live chip; a filled art seat presses through to its
   * plate on the stage.
   */
  private renderArtsLoadout(): void {
    const relic = itemDef(this.lastEquipment.relic?.id ?? '');
    const sigil = itemDef(this.lastEquipment.sigil?.id ?? '');
    this.artsLoadout.innerHTML = '';
    this.artsLoadout.dataset.region = '';
    this.altarSockets = [];
    const title = document.createElement('span');
    title.className = 'load-title';
    title.textContent = 'The Hand';
    this.artsLoadout.appendChild(title);
    for (const row of [
      { action: 'ability1', src: 'First art', ab: this.techniques[0] ?? undefined, empty: 'Choose above', art: true },
      { action: 'ability3', src: 'Second art', ab: this.techniques[1] ?? undefined, empty: 'Choose above', art: true },
      { action: 'ability2', src: 'Relic', ab: relic?.relic, empty: 'Wear a relic', art: false },
      { action: 'ability4', src: 'Sigil', ab: sigil?.sigil, empty: 'Fell a boss', art: false },
    ] as const) {
      const ab = row.ab ? abilityDef(row.ab) : undefined;
      // THE LOAN LAW at the altar: a seated secret with its teacher
      // away reads asleep here too — the altar never overpromises.
      const tdef = row.ab ? techniquePoolDef(row.ab) : undefined;
      const dormant = !!tdef && this.secretDormant(tdef);
      const seat = socket({ action: row.action, label: row.src });
      seat.root.classList.add('altar-seat');
      if (row.art) this.altarSockets.push(seat);
      if (dormant) seat.root.classList.add('dormant');
      // The seat holding the art on the reading wears the choice glow —
      // the eye finds where the chosen art already lives.
      if (row.art && ab && this.artsSel === ab.id) seat.root.classList.add('holds-choice');
      if (ab) seat.fill(abilityIconUrl(ab.id, 44), ab.name);
      const name = document.createElement('span');
      name.className = 'load-name' + (ab ? '' : ' empty');
      name.textContent = ab
        ? dormant
          ? `${ab.name} (asleep)`
          : ab.name
        : row.empty;
      seat.root.appendChild(name);
      if (dormant && ab) seat.root.title = `${ab.name} sleeps. Hold a weapon that teaches it.`;
      // A filled art seat is a door to its plate on the stage.
      if (row.art && ab) {
        seat.root.dataset.nav = '';
        seat.root.dataset.navkey = `load:${row.action}`;
        seat.root.dataset.acta = 'Inspect';
        seat.root.addEventListener('click', () => {
          const style = techniquePoolDef(ab.id)?.style;
          if (style) {
            this.artsWing = 'arts';
            this.artsSchoolSel = style;
            this.artsSel = ab.id;
            this.renderArts();
          }
        });
      }
      this.artsLoadout.appendChild(seat.root);
    }
    // The seats' law, told beside them — the hand explains itself.
    const teach = document.createElement('div');
    teach.className = 'hand-teach';
    teach.appendChild(
      glyphLine(
        'The • and • seats both carry any learned art, whatever you wield. Swapping is always free.',
        seatChip(this.seatAction(0)),
        seatChip(this.seatAction(1)),
      ),
    );
    this.artsLoadout.appendChild(teach);
  }

  /**
   * THE PATH — one school's arts as a single center-staged ribbon.
   * Everything unlocked stands linked on a forged spine; the FIRST
   * locked rung shows its name and level; every deeper rung condenses
   * into ONE veil cap ("✦ N more wait past Lv X") — the mist at the
   * ladder's end, not a row of question marks. Secrets ride the same
   * ribbon past a forged seam (THE QUIET SHELF still holds: only
   * secrets this hand has met). The track slides so the chosen art
   * stands center stage; `overflow: clip` on the ribbon keeps
   * scrollIntoView from ever fighting the slide.
   */
  private artsStage(style: SkillId): HTMLElement {
    const face = SKILL_FACE[style] ?? { icon: 'bread', color: '#d9a441' };
    const hidden = HIDDEN_SKILLS[style];
    const level = levelForXp(this.lastSkills[style] ?? 0);
    const block = document.createElement('div');
    block.className = 'arts-stage' + (hidden ? ' secret-skill' : '');
    block.style.setProperty('--skill-accent', face.color);

    // The stage head: the school named once, its climb told in rungs.
    const head = document.createElement('div');
    head.className = 'stage-head';
    const name = document.createElement('span');
    name.className = 'stage-school';
    name.textContent = skillName(style);
    const lv = document.createElement('span');
    lv.className = 'stage-gem';
    lv.dataset.tipname = 'Skill level';
    lv.dataset.tipsub = `${skillName(style)} stands at level ${level}.`;
    const lvNum = document.createElement('span');
    lvNum.className = 'stage-gem-num';
    lvNum.textContent = String(level);
    lv.appendChild(lvNum);
    head.append(name, lv);
    const rungs = this.visibleTechniques(style).filter((t) => !t.hidden && !t.secret);
    const climbed = rungs.filter((t) => {
      const s = this.techState(style, t);
      return s === 'unlocked' || s === 'equipped';
    }).length;
    const count = document.createElement('span');
    count.className = 'stage-count';
    count.textContent = `${climbed} of ${rungs.length} arts`;
    count.dataset.tipname = 'The ladder';
    count.dataset.tipsub = `${climbed} of ${rungs.length} arts answer to this school so far.`;
    head.appendChild(count);
    for (const seat of [0, 1] as const) {
      if (techniquePoolDef(this.techniques[seat] ?? '')?.style !== style) continue;
      const hand = document.createElement('span');
      hand.className = 'in-hand';
      hand.appendChild(glyphLine('On •', seatChip(this.seatAction(seat))));
      hand.dataset.tipname = 'In hand';
      hand.dataset.tipsub = 'This school owns an art riding one of your seats.';
      head.appendChild(hand);
    }
    // THE OPEN HALL: the door to the other wing stands in every head.
    head.appendChild(this.wingToggle());
    block.appendChild(head);

    const visible = this.visibleTechniques(style);
    const ladder = visible.filter((t) => !t.secret);
    const secrets = visible.filter((t) => t.secret);
    // The shown rungs: everything up to the first locked; the veil
    // condenses. Earned pages (hidden) always show — they sit at the
    // ribbon's head end, outside the spine.
    const shown = ladder.filter((t) => this.techState(style, t) !== 'veiled');
    const veiled = ladder.filter((t) => this.techState(style, t) === 'veiled');

    const ribbon = document.createElement('div');
    ribbon.className = 'path-ribbon';
    const track = document.createElement('div');
    track.className = 'path-track';
    shown.forEach((tech, i) => {
      const prev = shown[i - 1];
      const linked = !tech.hidden && !!prev && !prev.hidden;
      track.appendChild(this.techPlate(style, tech, linked));
    });
    if (veiled.length > 0) {
      const minLv = veiled.reduce((m, t) => Math.min(m, t.unlockLevel), Infinity);
      track.appendChild(this.veilCap(style, veiled.length, minLv));
    }
    if (secrets.length > 0) {
      // The forged seam: where the ladder ends and the shelf begins.
      const seam = document.createElement('div');
      seam.className = 'path-seam';
      const mark = document.createElement('span');
      mark.className = 'seam-mark';
      mark.textContent = '◈';
      const word = document.createElement('span');
      word.className = 'seam-word';
      word.textContent = 'Secrets';
      seam.append(mark, word);
      seam.dataset.tipname = 'The secret shelf';
      seam.dataset.tipsub =
        'Arts that weapons teach. Fight with the teacher and its art becomes yours for good.';
      track.appendChild(seam);
      for (const tech of secrets) track.appendChild(this.techPlate(style, tech, false));
    }
    ribbon.appendChild(track);
    // The pointer's way along a slid ribbon: the wheel steps the
    // choice, and a chevron waits at either edge on hover. (The pad
    // never needs them — spatial nav walks clipped plates natively.)
    ribbon.addEventListener(
      'wheel',
      (e) => {
        const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        if (d === 0) return;
        e.preventDefault();
        this.stepRibbon(d > 0 ? 1 : -1);
      },
      { passive: false },
    );
    for (const dir of [-1, 1] as const) {
      const nudge = document.createElement('button');
      nudge.className = 'ribbon-nudge ' + (dir < 0 ? 'prev' : 'next');
      nudge.textContent = dir < 0 ? '‹' : '›';
      nudge.setAttribute('aria-label', dir < 0 ? 'Previous art' : 'Next art');
      nudge.addEventListener('click', () => this.stepRibbon(dir));
      ribbon.appendChild(nudge);
    }
    block.appendChild(ribbon);
    return block;
  }

  /** Step the ribbon's choice to the neighboring plate. */
  private stepRibbon(dir: -1 | 1): void {
    const track = this.artsSchools.querySelector<HTMLElement>('.path-track');
    if (!track) return;
    const keys = Array.from(track.querySelectorAll<HTMLElement>('[data-navkey]'))
      .map((el) => el.dataset.navkey ?? '')
      .filter((k) => k.startsWith('art:') || k.startsWith('artveil:'));
    const currentKey = this.artsSel?.startsWith('veil:')
      ? `artveil:${this.artsSel.slice('veil:'.length)}`
      : `art:${this.artsSel}`;
    const i = keys.indexOf(currentKey);
    const next = keys[Math.max(0, Math.min(keys.length - 1, (i < 0 ? 0 : i) + dir))];
    if (!next || next === currentKey) return;
    this.inspectArt(
      next.startsWith('artveil:') ? `veil:${next.slice('artveil:'.length)}` : next.slice('art:'.length),
    );
  }

  /**
   * The ladder's mist: one plate standing for every rung past the
   * next — it admits how much waits without spelling any of it.
   */
  private veilCap(style: SkillId, count: number, minLevel: number): HTMLElement {
    const btn = document.createElement('button');
    btn.className = 'tech-plate-btn veiled veil-cap';
    if (this.artsSel === `veil:${style}`) btn.classList.add('selected');
    btn.dataset.nav = '';
    btn.dataset.navkey = `artveil:${style}`;
    btn.dataset.acta = 'Peer';
    const wellEl = document.createElement('span');
    wellEl.className = 'tech-plate-well';
    const q = document.createElement('span');
    q.className = 'tech-mystery';
    q.textContent = '✦';
    wellEl.appendChild(q);
    const nameEl = document.createElement('span');
    nameEl.className = 'tech-plate-name';
    nameEl.textContent = `${count} more`;
    const sub = document.createElement('span');
    sub.className = 'tech-plate-sub';
    sub.textContent = `past Lv ${minLevel}`;
    btn.append(wellEl, nameEl, sub);
    btn.addEventListener('click', () => this.inspectArt(`veil:${style}`));
    return btn;
  }

  /**
   * Slide the ribbon so the chosen plate stands center stage. The
   * track rides the `translate` channel (compositor-only), clamped so
   * the ribbon never shows void past either end.
   */
  private recenterRibbon(): void {
    const ribbon = this.artsSchools.querySelector<HTMLElement>('.path-ribbon');
    const track = this.artsSchools.querySelector<HTMLElement>('.path-track');
    if (!ribbon || !track) return;
    // Both wings ride one ribbon: recenter on whichever wing's pick.
    const sel = this.artsWing === 'callings' ? this.callingSel : this.artsSel;
    const veilPrefix = this.artsWing === 'callings' ? 'callveil:' : 'artveil:';
    const plainPrefix = this.artsWing === 'callings' ? 'call:' : 'art:';
    const key = sel?.startsWith('veil:')
      ? `${veilPrefix}${sel.slice('veil:'.length)}`
      : `${plainPrefix}${sel}`;
    const plate = track.querySelector<HTMLElement>(`[data-navkey="${CSS.escape(key)}"]`);
    // Measure in track-local space (offsetLeft is translate-immune,
    // so a mid-slide recenter still lands true).
    const ribbonW = ribbon.clientWidth;
    const trackW = track.scrollWidth;
    if (trackW <= ribbonW || !plate) {
      track.style.translate = '0 0';
      return;
    }
    const center = plate.offsetLeft + plate.offsetWidth / 2;
    const tx = Math.max(ribbonW - trackW, Math.min(0, ribbonW / 2 - center));
    track.style.translate = `${Math.round(tx)}px 0`;
  }

  /**
   * THE LOAN LAW's dormancy, mirrored for the codex: a seated secret
   * whose teaching weapon left the hands sleeps until it returns.
   */
  private secretDormant(tech: TechniqueDef): boolean {
    return (
      !!tech.secret &&
      this.seatOf(tech.ability) !== null &&
      !this.ownsArt(tech.ability) &&
      !this.licensedArts().has(tech.ability) &&
      !this.equippedArtIds().has(tech.ability)
    );
  }

  /** One plate on a rail — rung, page, and secret speak the same shape. */
  private techPlate(style: SkillId, tech: TechniqueDef, linked: boolean): HTMLElement {
    const ab = abilityDef(tech.ability)!;
    const st = this.techState(style, tech);
    const btn = document.createElement('button');
    btn.className = `tech-plate-btn ${st}`;
    if (linked) {
      btn.classList.add('rail-link');
      if (st === 'unlocked' || st === 'equipped') btn.classList.add('rail-lit');
    }
    if (this.secretDormant(tech)) btn.classList.add('dormant');
    if (this.artsSel === tech.ability) btn.classList.add('selected');
    btn.dataset.nav = '';
    btn.dataset.navkey = `art:${tech.ability}`;
    btn.dataset.acta = 'Inspect';
    const wellEl = document.createElement('span');
    wellEl.className = 'tech-plate-well';
    if (st === 'veiled') {
      const q = document.createElement('span');
      q.className = 'tech-mystery';
      q.textContent = '?';
      wellEl.appendChild(q);
    } else {
      const plate = document.createElement('img');
      // The codex grid is a first-open burst (one plate per known
      // technique) — plates fill through the BUDGETED LANE; cached
      // plates still land synchronously, so reopen never flickers.
      queueAbilityIcon(plate, tech.ability, 44);
      plate.draggable = false;
      wellEl.appendChild(plate);
      if ((st === 'unlocked' || st === 'equipped') && !this.seenTech.has(tech.ability)) {
        const pip = document.createElement('span');
        pip.className = 'new-pip';
        pip.textContent = 'NEW';
        wellEl.appendChild(pip);
      }
      if (st === 'equipped') {
        const rBadge = document.createElement('span');
        rBadge.className = 'r-badge';
        rBadge.appendChild(
          seatChip(this.seatAction(this.seatOf(tech.ability) === 0 ? 0 : 1)),
        );
        wellEl.appendChild(rBadge);
      }
      if (tech.hidden) {
        const seal = document.createElement('span');
        seal.className = 'earned-seal';
        seal.textContent = '❖';
        seal.dataset.tipname = 'An unwritten page';
        seal.dataset.tipsub = 'Earned by deed — no rung of the ladder holds it.';
        wellEl.appendChild(seal);
      }
      if (tech.secret) {
        const pctOf = (banked: number): number =>
          Math.min(99, Math.floor(Math.min(1, banked / masteryXp(tech.secret!.anchorLevel)) * 100));
        const bankedNow = this.lessons[tech.ability] ?? 0;
        const seal = document.createElement('span');
        seal.className = 'earned-seal';
        seal.textContent = this.ownsArt(tech.ability) ? '❖' : '◈';
        seal.dataset.tipname = 'A secret art';
        seal.dataset.tipsub = this.ownsArt(tech.ability)
          ? 'Mastered — yours from any hand, forever.'
          : bankedNow > 0
            ? `Lent by the weapon that teaches it. Mastery ${pctOf(bankedNow) < 1 ? 'under 1' : pctOf(bankedNow)}% — fight on, and it will stay.`
            : this.seatOf(tech.ability) === null
              ? 'Lent by the weapon that teaches it. Seat it and fight, and the art will stay.'
              : 'Lent by the weapon that teaches it. Fight on, and it will stay.';
        wellEl.appendChild(seal);
        // THE LESSON's fill at plate scale: how far the blade has
        // carried you, told without a number.
        const banked = this.lessons[tech.ability] ?? 0;
        if (!this.ownsArt(tech.ability) && banked > 0 && tech.secret) {
          const meter = document.createElement('span');
          meter.className = 'plate-lesson';
          const fill = document.createElement('span');
          fill.className = 'plate-lesson-fill';
          const frac = Math.min(1, banked / masteryXp(tech.secret.anchorLevel));
          fill.style.width = `${Math.round(frac * 100)}%`;
          meter.appendChild(fill);
          wellEl.appendChild(meter);
        }
      }
    }
    const nameEl = document.createElement('span');
    nameEl.className = 'tech-plate-name';
    nameEl.textContent = st === 'veiled' ? '???' : ab.name;
    const sub = document.createElement('span');
    sub.className = 'tech-plate-sub';
    const rank = this.techRank(style, tech);
    const seat = this.seatOf(tech.ability);
    const chip = (): HTMLElement => seatChip(this.seatAction(seat === 0 ? 0 : 1));
    const licensedHere = this.licensedArts().has(tech.ability) && !this.ownsArt(tech.ability);
    if (licensedHere) {
      // THE MASTER'S LICENSE speaks its citizenship and its rank.
      if (st === 'equipped') sub.appendChild(glyphLine(`On • · ${RANK_ROMAN[rank]} · licensed`, chip()));
      else sub.textContent = `Licensed · ${RANK_ROMAN[rank]}`;
    } else if (tech.secret && !this.ownsArt(tech.ability)) {
      // A lent secret speaks its citizenship, not a rank it cannot climb.
      if (st === 'equipped') {
        sub.appendChild(glyphLine(`On • · ${this.secretDormant(tech) ? 'asleep' : 'lent'}`, chip()));
      } else {
        sub.textContent = 'Lent';
      }
    } else if (st === 'equipped') {
      sub.appendChild(glyphLine(`On • · ${RANK_ROMAN[rank]}`, chip()));
    } else {
      sub.textContent = st === 'unlocked' ? `Rank ${RANK_ROMAN[rank]}` : `Lv ${tech.unlockLevel}`;
    }
    btn.append(wellEl, nameEl, sub);
    btn.addEventListener('click', () => {
      this.inspectArt(tech.ability);
      // THE VERB COMES TO THE HAND: a seatable art raises its seat
      // sheet AT the plate — mouse and pad ride the same wire. The
      // inspect is bench-only, so the plate under the sheet stands.
      if (st === 'unlocked' || st === 'equipped') {
        openSheet(btn, this.seatVerbs(tech.ability, st));
      }
    });
    return btn;
  }

  /**
   * Light the bench for one art without rebuilding the stage: focus
   * and hover ride this, so reading is free and the ring never loses
   * the plate it stands on.
   */
  private inspectArt(ability: string): void {
    if (this.artsSel === ability) return;
    this.artsSel = ability;
    this.markTechSeen(ability);
    const key = ability.startsWith('veil:')
      ? `artveil:${ability.slice('veil:'.length)}`
      : `art:${ability}`;
    this.artsSchools
      .querySelectorAll('.tech-plate-btn.selected')
      .forEach((p) => p.classList.remove('selected'));
    this.artsSchools
      .querySelector(`[data-navkey="${CSS.escape(key)}"]`)
      ?.classList.add('selected');
    for (const s of [0, 1] as const) {
      this.altarSockets[s]?.root.classList.toggle('holds-choice', this.techniques[s] === ability);
    }
    this.recenterRibbon();
    this.renderArtsBench();
    this.updateArtsPip();
  }

  /**
   * THE SEAT FLIGHT — the chosen plate's face flies from the ribbon
   * into its seat, so seating an art is a thing you SEE land. Pure
   * grace note: gated by the Interface-motion setting, and the server
   * echo (setTechniques) repaints the truth under it either way.
   */
  private seatFlight(ability: string, seat: 0 | 1): void {
    if (document.body.classList.contains('no-ui-motion')) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const from = this.artsSchools
      .querySelector<HTMLElement>(`[data-navkey="${CSS.escape(`art:${ability}`)}"] .tech-plate-well img`);
    const target = this.altarSockets[seat]?.root.querySelector<HTMLElement>('.socket-well');
    if (!from || !target) return;
    const a = from.getBoundingClientRect();
    const b = target.getBoundingClientRect();
    if (a.width === 0 || b.width === 0) return;
    const ghost = from.cloneNode(true) as HTMLElement;
    ghost.className = 'seat-flight';
    ghost.style.width = `${a.width}px`;
    ghost.style.height = `${a.height}px`;
    ghost.style.left = `${a.x}px`;
    ghost.style.top = `${a.y}px`;
    document.body.appendChild(ghost);
    const dx = b.x + b.width / 2 - (a.x + a.width / 2);
    const dy = b.y + b.height / 2 - (a.y + a.height / 2);
    const scale = (b.width * 0.72) / a.width;
    const flight = ghost.animate(
      [
        { transform: 'translate(0, 0) scale(1)', opacity: 1 },
        {
          transform: `translate(${dx * 0.55}px, ${dy * 0.55 - 28}px) scale(${(1 + scale) / 2})`,
          opacity: 1,
          offset: 0.55,
        },
        { transform: `translate(${dx}px, ${dy}px) scale(${scale})`, opacity: 0.4 },
      ],
      { duration: 430, easing: 'cubic-bezier(0.3, 0.6, 0.25, 1)' },
    );
    flight.onfinish = () => {
      ghost.remove();
      this.altarSockets[seat]?.flash();
    };
  }

  /**
   * THE SCHOOL ENVELOPE — the maxima the reading's gauges measure
   * against, so every bar is a COMPARISON, not a lone number: a
   * damage bar filled halfway means half the hardest hit this school
   * knows. Veiled rungs stay out of the envelope (no spoilers in the
   * scale).
   */
  private schoolEnvelope(style: SkillId): {
    damage: number;
    cooldown: number;
    range: number;
    radius: number;
  } {
    const out = { damage: 1, cooldown: 1, range: 1, radius: 1 };
    for (const t of this.visibleTechniques(style)) {
      if (this.techState(style, t) === 'veiled') continue;
      const base = abilityDef(t.ability);
      if (!base) continue;
      const ab = honedAbility(base, t.ranks, Math.max(this.techRank(style, t), 1));
      out.damage = Math.max(out.damage, ab.damage);
      out.cooldown = Math.max(out.cooldown, ab.cooldownTicks / 20);
      out.range = Math.max(out.range, ab.range ?? 0);
      out.radius = Math.max(out.radius, Math.max(ab.radius ?? 0, ab.splashRadius ?? 0));
    }
    return out;
  }

  /**
   * One gauge of the reading: a forged channel with the fill measured
   * against the school envelope, faceted by ticks when the unit is
   * countable (tiles), the numeral standing at the end. The stat
   * cards died here — a measure is an instrument, not a plaque.
   */
  private measureRow(opts: {
    label: string;
    value: string;
    frac: number;
    tone: string;
    ticks?: number;
    tip?: string;
  }): HTMLElement {
    const row = document.createElement('div');
    row.className = 'measure';
    row.style.setProperty('--m-tone', opts.tone);
    if (opts.tip) {
      row.dataset.tipname = opts.label;
      row.dataset.tipsub = opts.tip;
    }
    const label = document.createElement('span');
    label.className = 'm-label';
    label.textContent = opts.label;
    const channel = document.createElement('span');
    channel.className = 'm-channel';
    const fill = document.createElement('span');
    fill.className = 'm-fill';
    fill.style.width = `${Math.round(Math.max(0, Math.min(1, opts.frac)) * 100)}%`;
    channel.appendChild(fill);
    if (opts.ticks && opts.ticks > 1 && opts.ticks <= 24) {
      for (let i = 1; i < opts.ticks; i++) {
        const tick = document.createElement('span');
        tick.className = 'm-tick';
        tick.style.left = `${(i / opts.ticks) * 100}%`;
        channel.appendChild(tick);
      }
    }
    const value = document.createElement('span');
    value.className = 'm-value';
    value.textContent = opts.value;
    row.append(label, channel, value);
    return row;
  }

  /** One small forged seal in the marks row — a fact, worn not listed. */
  private markSeal(text: string, tone: string, tip?: string): HTMLElement {
    const seal = document.createElement('span');
    seal.className = 'mark-seal';
    seal.style.setProperty('--m-tone', tone);
    seal.textContent = text;
    if (tip) {
      seal.dataset.tipname = text;
      seal.dataset.tipsub = tip;
    }
    return seal;
  }

  /** THE READING: the chosen art laid out as instruments, not cards. */
  private renderArtsBench(all?: Array<{ style: SkillId; t: TechniqueDef }>): void {
    all ??= this.artsSchoolIds().flatMap((s) =>
      this.visibleTechniques(s).map((t) => ({ style: s, t })),
    );
    this.artsDetail.innerHTML = '';
    // The veil cap's reading: how much the mist is holding, no more.
    if (this.artsSel?.startsWith('veil:')) {
      const style = this.artsSel.slice('veil:'.length) as SkillId;
      const veiled = this.visibleTechniques(style).filter(
        (t) => !t.secret && this.techState(style, t) === 'veiled',
      );
      const minLv = veiled.reduce((m, t) => Math.min(m, t.unlockLevel), Infinity);
      const hiddenSkill = HIDDEN_SKILLS[style];
      const styleName = hiddenSkill ? hiddenSkill.name : style;
      const head = document.createElement('div');
      head.className = 'bench-head';
      const well = document.createElement('div');
      well.className = 'bench-plate veiled';
      const q = document.createElement('span');
      q.className = 'tech-mystery lg';
      q.textContent = '✦';
      well.appendChild(q);
      const names = document.createElement('div');
      names.className = 'bench-names';
      const name = document.createElement('div');
      name.className = 'bench-name';
      name.textContent = 'The mist holds more';
      const line = document.createElement('div');
      line.className = 'bench-line';
      line.textContent = styleName;
      names.append(name, line);
      head.append(well, names);
      this.artsDetail.appendChild(head);
      const desc = document.createElement('p');
      desc.className = 'bench-desc';
      desc.textContent =
        veiled.length === 1
          ? `One more art waits past ${styleName} level ${minLv}. Train on, and it will show its face.`
          : `${veiled.length} arts wait in this school's mist. The next shows its face at ${styleName} level ${minLv}.`;
      this.artsDetail.appendChild(desc);
      this.ground.show(null);
      return;
    }
    const entry = all.find((e) => e.t.ability === this.artsSel);
    if (!entry) {
      const note = document.createElement('div');
      note.className = 'bench-empty';
      note.textContent = 'Raise a combat skill and its arts will gather here.';
      this.artsDetail.appendChild(note);
      this.ground.show(null);
      return;
    }
    const { style, t } = entry;
    const base = abilityDef(t.ability)!;
    const st = this.techState(style, t);
    const rank = this.techRank(style, t);
    // Stats speak at the rank the hand has earned — the same resolver
    // the server casts through, so the bench can never overpromise.
    const ab = honedAbility(base, t.ranks, Math.max(rank, 1));
    const hidden = HIDDEN_SKILLS[style];
    const styleName = hidden ? hidden.name : style;

    const head = document.createElement('div');
    head.className = 'bench-head';
    const well = document.createElement('div');
    well.className = 'bench-plate' + (st === 'veiled' ? ' veiled' : '');
    if (st === 'veiled') {
      const q = document.createElement('span');
      q.className = 'tech-mystery lg';
      q.textContent = '?';
      well.appendChild(q);
    } else {
      const img = document.createElement('img');
      img.src = abilityIconUrl(t.ability, 72);
      img.draggable = false;
      well.appendChild(img);
    }
    const names = document.createElement('div');
    names.className = 'bench-names';
    const name = document.createElement('div');
    name.className = 'bench-name';
    name.textContent = st === 'veiled' ? 'An unwritten page' : ab.name;
    const line = document.createElement('div');
    line.className = 'bench-line';
    line.textContent =
      st === 'unlocked' || st === 'equipped'
        ? `${styleName} · Rank ${RANK_ROMAN[rank]}${
            t.hidden ? ' · Earned' : t.secret ? (this.ownsArt(t.ability) ? ' · Mastered' : ' · Lent') : ''
          }`
        : styleName;
    names.append(name, line);
    head.append(well, names);
    this.artsDetail.appendChild(head);

    const seat = this.seatOf(t.ability);
    const benchChip = (): HTMLElement => seatChip(this.seatAction(seat === 0 ? 0 : 1));
    // The state chip rides the head row — identity and standing on one
    // line, the reading's height spent on instruments instead.
    const state = document.createElement('div');
    state.className = `art-state ${st}`;
    if (st === 'equipped') {
      if (t.secret && !this.ownsArt(t.ability)) {
        const licensor = this.licensingCalling(t.ability);
        if (licensor) {
          // THE MASTER'S LICENSE keeps the seat awake — say who holds it.
          state.appendChild(glyphLine(`Riding your • seat, licensed by ${licensor.name}`, benchChip()));
        } else if (this.equippedArtIds().has(t.ability)) {
          state.appendChild(glyphLine('Riding your • seat, lent by the weapon in your hand', benchChip()));
        } else {
          state.appendChild(glyphLine('Seated on •, asleep. Hold a weapon that teaches it.', benchChip()));
        }
      } else {
        state.appendChild(glyphLine('Riding your • seat', benchChip()));
      }
    } else {
      const licensor = this.licensingCalling(t.ability);
      state.textContent =
        st === 'unlocked'
          ? licensor && !this.ownsArt(t.ability)
            ? `Licensed by ${licensor.name}. Yours while that calling stays answered.`
            : t.secret && !this.ownsArt(t.ability)
              ? 'Lent while its weapon is in your hand. Fight with it and the art will stay.'
              : 'Unlocked — ready to seat'
          : st === 'locked'
            ? `Unlocks at ${styleName} level ${t.unlockLevel}`
            : `A secret of ${styleName} — still veiled`;
    }
    head.appendChild(state);

    // THE LESSON LAW's meter — the courtship told PLAINLY (user
    // mandate 2026-07-31, supersedes the launch quiet-fill: the player
    // must know how close the art is to staying). The bar carries its
    // percent, and the label under it says what the number means.
    if (t.secret && !this.ownsArt(t.ability)) {
      const banked = this.lessons[t.ability] ?? 0;
      const frac = Math.min(1, banked / masteryXp(t.secret.anchorLevel));
      const pct = Math.min(99, Math.floor(frac * 100));
      // The lesson has two doors: the art must HOLD a seat, and its
      // teacher must be in hand. A meter that stands still without
      // saying which door is shut reads as broken — name the door.
      const seated = this.seatOf(t.ability) !== null;
      const taught = this.equippedArtIds().has(t.ability);
      const row = document.createElement('div');
      row.className = 'lesson-row';
      row.dataset.tipname = 'The lesson';
      row.dataset.tipsub = !seated
        ? 'The lesson only counts while this art holds one of your two seats. Seat it, take up its weapon, and fight.'
        : !taught
          ? 'The seat is set, but the teacher is away. Hold a weapon that teaches this art, and every fight counts.'
          : pct <= 0
            ? 'Fight with the weapon that teaches this art, and the art will begin to stay.'
            : pct < 50
              ? 'The blade still has things to teach. Every fight with it counts.'
              : pct < 90
                ? 'More than half yours. Keep fighting with the teacher.'
                : 'The lesson is nearly yours.';
      const meter = document.createElement('div');
      meter.className = 'lesson-meter';
      const fill = document.createElement('div');
      fill.className = 'lesson-fill';
      fill.style.width = `${Math.round(frac * 100)}%`;
      meter.appendChild(fill);
      const label = document.createElement('span');
      label.className = 'lesson-label';
      label.textContent =
        banked > 0 && pct < 1
          ? 'Mastery: under 1%'
          : pct >= 1
            ? `Mastery: ${pct}%`
            : !seated
              ? 'Mastery: seat this art to begin'
              : !taught
                ? 'Mastery: waiting on its weapon'
                : 'Mastery: not yet begun';
      row.append(meter, label);
      this.artsDetail.appendChild(row);
    }

    const desc = document.createElement('p');
    desc.className = 'bench-desc';
    desc.textContent =
      st === 'veiled'
        ? `Something waits at ${styleName} level ${t.unlockLevel}. Train on, and it will show its face.`
        : ab.desc;
    this.artsDetail.appendChild(desc);

    if (st !== 'veiled') {
      // THE MEASURES: every figure told against the school envelope —
      // a bar half full IS the comparison, no second art needed.
      const env = this.schoolEnvelope(style);
      const measures = document.createElement('div');
      measures.className = 'measures';
      const secs = (ticks: number): string => {
        const s = ticks / 20;
        return `${s % 1 === 0 ? s : s.toFixed(1)}s`;
      };
      const channeled = (ab.channelTicks ?? 0) > 0 && ab.shape !== 'tame';
      if (ab.damage > 0) {
        measures.appendChild(
          this.measureRow({
            label: channeled ? 'Per beat' : 'Damage',
            value: String(ab.damage),
            frac: ab.damage / env.damage,
            tone: '#d95763',
            tip: `Measured against the hardest hit this school knows (${env.damage}).`,
          }),
        );
      }
      if (ab.cooldownTicks > 0) {
        measures.appendChild(
          this.measureRow({
            label: 'Cooldown',
            value: secs(ab.cooldownTicks),
            frac: ab.cooldownTicks / 20 / env.cooldown,
            tone: '#b49af0',
            tip: `The wait between casts — the school's longest is ${env.cooldown % 1 === 0 ? env.cooldown : env.cooldown.toFixed(1)}s.`,
          }),
        );
      }
      // THE DRAWN BREATH / THE HELD NOTE wear words: the planted
      // figure reads the same ONE ruler the accrual does.
      if (ab.castTicks) {
        measures.appendChild(
          this.measureRow({
            label: 'Cast',
            value: `${secs(ab.castTicks)} · ${secs(ab.castTicks / CAST_STILL_FACTOR)} planted`,
            frac: ab.castTicks / 20 / Math.max(env.cooldown, 3),
            tone: '#d2e0f6',
            tip: 'The breath drawn before the art fires. Standing still breathes faster.',
          }),
        );
      }
      if (ab.channelTicks) {
        measures.appendChild(
          this.measureRow({
            label: 'Channel',
            value: secs(ab.channelTicks),
            frac: ab.channelTicks / 20 / Math.max(env.cooldown, 3),
            tone: '#f6e2b2',
            tip: 'Held while the working runs its course.',
          }),
        );
      }
      if (ab.range) {
        measures.appendChild(
          this.measureRow({
            label: 'Range',
            value: `${ab.range} tiles`,
            frac: ab.range / env.range,
            tone: '#7dc46a',
            ticks: Math.ceil(env.range),
            tip: `Each notch is one tile; the channel runs to the school's longest reach (${env.range}).`,
          }),
        );
      }
      const blast = Math.max(ab.radius ?? 0, ab.splashRadius ?? 0);
      if (blast > 0) {
        measures.appendChild(
          this.measureRow({
            label: ab.radius ? 'Radius' : 'Splash',
            value: `${blast} tiles`,
            frac: blast / env.radius,
            tone: '#8ac4e8',
            ticks: Math.ceil(env.radius),
            tip: `How far the blast claims, in tiles — the school's widest is ${env.radius}.`,
          }),
        );
      }
      this.artsDetail.appendChild(measures);

      // THE MARKS: the art's remaining facts worn as forged seals.
      const marks = document.createElement('div');
      marks.className = 'mark-row';
      if ((ab.projectiles ?? 0) > 1) {
        marks.appendChild(this.markSeal(`×${ab.projectiles} shots`, '#e8b64c', 'A fan of projectiles across the aim.'));
      }
      if (ab.chainTargets) {
        marks.appendChild(this.markSeal(`chains ×${ab.chainTargets}`, '#ffe86a', 'Arcs on to more foes after the first.'));
      }
      if (ab.dashTiles) {
        marks.appendChild(
          this.markSeal(
            (ab.dashTiles < 0 ? 'leaps back ' : 'dash ') + Math.abs(ab.dashTiles),
            '#e8b64c',
            ab.dashTiles < 0 ? 'Carries you away from the aim.' : 'Carries you through everything on the way.',
          ),
        );
      }
      if (ab.pierce) marks.appendChild(this.markSeal('pierces', '#d2e0f6', 'Shots punch through instead of stopping.'));
      if (ab.homing) marks.appendChild(this.markSeal('seeking', '#b49af0', 'Shots bend toward their mark.'));
      if (ab.knockback) {
        marks.appendChild(
          ab.knockback < 0
            ? this.markSeal('pulls in', '#8a6ac8', 'Drags foes toward the center.')
            : this.markSeal('knocks back', '#9aa2ac', 'Shoves foes away from the blow.'),
        );
      }
      if (ab.status) {
        const statusName = ab.status.status.charAt(0).toUpperCase() + ab.status.status.slice(1);
        marks.appendChild(
          this.markSeal(
            `${statusName} ${secs(ab.status.durationTicks)}`,
            '#7ac46a',
            `Leaves ${statusName} riding the target.`,
          ),
        );
      }
      if (ab.vs) {
        // THE READING EDGE tooltip law: every payoff clause prints.
        const vsName = ab.vs.status.charAt(0).toUpperCase() + ab.vs.status.slice(1);
        marks.appendChild(
          this.markSeal(
            `×${ab.vs.mult} ${ab.vs.consume ? 'spends' : 'vs'} ${vsName}`,
            '#e8b64c',
            ab.vs.consume
              ? `Bodies wearing ${vsName} take ×${ab.vs.mult} — and the state is spent for it.`
              : `Bodies wearing ${vsName} take ×${ab.vs.mult}.`,
          ),
        );
      }
      if (marks.childElementCount > 0) this.artsDetail.appendChild(marks);
    }

    // THE PROVING GROUND reads the same honed figures the measures do.
    this.ground.show(st === 'veiled' ? null : ab);

    // THE HONED-ART LAW's spine: the four ranks as studs on one forged
    // bar — the walked length lit brass, the current stud crowned,
    // waiting studs naming their level. A progression you READ as a
    // road, not four little cards.
    if ((st === 'unlocked' || st === 'equipped') && t.ranks?.length) {
      const spine = document.createElement('div');
      spine.className = 'rank-spine';
      const walked = (rank - 1) / (TECHNIQUE_MAX_RANK - 1);
      spine.style.setProperty('--walked-n', walked.toFixed(3));
      for (let r = 1; r <= TECHNIQUE_MAX_RANK; r++) {
        const stud = document.createElement('span');
        stud.className =
          'spine-stud' + (r <= rank ? ' attained' : '') + (r === rank ? ' current' : '');
        const num = document.createElement('span');
        num.className = 'stud-numeral';
        num.textContent = RANK_ROMAN[r] ?? '?';
        stud.appendChild(num);
        const under = document.createElement('span');
        under.className = 'stud-under';
        under.textContent = r <= rank ? '' : `Lv ${rankLevel(techniqueAnchor(t), r)}`;
        stud.appendChild(under);
        const note = r === 1 ? base.desc : (t.ranks[r - 2]?.note ?? '');
        if (r <= rank) {
          stud.dataset.tipname = `Rank ${RANK_ROMAN[r]}`;
          stud.dataset.tipsub = note;
        } else {
          stud.dataset.tipname = `Rank ${RANK_ROMAN[r]} — ${styleName} Lv ${rankLevel(techniqueAnchor(t), r)}`;
          stud.dataset.tipsub = 'Train on, and the art will sharpen itself.';
        }
        spine.appendChild(stud);
      }
      this.artsDetail.appendChild(spine);
      if (rank < TECHNIQUE_MAX_RANK) {
        const nextNote = t.ranks[rank - 1]?.note;
        if (nextNote) {
          const next = document.createElement('div');
          next.className = 'bench-next';
          next.textContent = `Rank ${RANK_ROMAN[rank + 1]} at ${styleName} ${rankLevel(techniqueAnchor(t), rank + 1)} — ${nextNote}`;
          this.artsDetail.appendChild(next);
        }
      }
    }

    if (st === 'unlocked') {
      const seats = document.createElement('div');
      seats.className = 'bench-seats';
      for (const s of [0, 1] as const) {
        const btn = bigButton('Seat', s === 0 ? `artequip:${t.ability}` : `artequipr:${t.ability}`, () => {
          this.seatFlight(t.ability, s);
          this.onTechnique(t.ability, s === 0 ? 0 : 2);
        });
        btn.textContent = '';
        btn.appendChild(glyphLine('Seat on •', seatChip(this.seatAction(s))));
        seats.appendChild(btn);
      }
      this.artsDetail.appendChild(seats);
    }
  }
}
