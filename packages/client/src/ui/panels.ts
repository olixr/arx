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
  honedAbility,
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
  describeEffect,
  effectiveReq,
  enchantDef,
  bondedEffects,
  qualityWord,
  instanceName,
  isTwoHanded,
  itemDef,
  rolledStats,
  secretArtsFor,
  techniquePoolDef,
  techniquesFor,
  trinketPowerMult,
  type CallingDef,
  type ItemDef,
} from '@arx/content';
import { itemIconUrl, slotGlyphUrl } from '../render/icons.js';
import { abilityIconUrl, passiveIconUrl, queueAbilityIcon } from '../render/abilityIcons.js';
import { bigButton, sectionHead, statPlaque } from './panel.js';
import { bindings, type ActionId } from '../input/bindings.js';
import { RARITY_COLORS, rarityOfInstance } from './rarity.js';
import { seatChip, glyphLine } from './kit/glyphs.js';
import {
  closeSheet,
  openSheet,
  registerSheetProvider,
  type SheetVerb,
} from './kit/contextSheet.js';
import { ringGauge } from './kit/ring.js';
import { socket } from './kit/plates.js';
import { attachAmbient } from './kit/ambient.js';

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
    skills: ['vitality', 'combat', 'onehand', 'twohand', 'defence', 'archery', 'arx'],
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
];

/** Explicit verbs the item context menu can dispatch. */
export type SlotAction = 'use' | 'deposit' | 'sell' | 'drop';

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
  /** The technique the codex bench is laying out (null = auto-pick). */
  private artsSel: string | null = null;
  /** The school standing on the stage (the rail's choice). */
  private artsSchoolSel: SkillId | null = null;
  /** Which wing of the codex is open: the actives or the passives. */
  private artsWing: 'arts' | 'callings' = 'arts';
  /** The Calling the bench is laying out (callings wing). */
  private callingSel: string | null = null;
  /** Answered Callings, mirrored from the server. */
  private callings: string[] = [];
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
    private readonly onInvMove: (from: number, to: number) => void = () => {},
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
    private readonly onCalling: (calling: string, on: boolean) => void = () => {},
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

    // A rebind redraws every seat chip the codex is showing.
    bindings.onChange(() => this.refreshDevice());
  }

  /**
   * The device changed hands (or the keymap changed): any open screen
   * that writes glyphs into sentences redraws for the new truth.
   */
  refreshDevice(): void {
    if (this.artsOpen) this.renderArts();
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
    // Highlight the slot under the pointer.
    this.invGrid
      .querySelectorAll('.drop-hover')
      .forEach((el) => el.classList.remove('drop-hover'));
    this.slotUnder(e)?.classList.add('drop-hover');
    // Over open world the ghost arms itself: release here drops the
    // item on the ground at your feet.
    d.ghost!.classList.toggle('drop-armed', this.overWorld(e));
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
    this.invGrid.querySelectorAll('.drag-src, .drop-hover').forEach((el) => {
      el.classList.remove('drag-src');
      el.classList.remove('drop-hover');
    });
    const target = this.slotUnder(e);
    if (target) {
      const to = Number(target.dataset.invslot);
      if (to !== d.from) this.onInvMove(d.from, to);
    } else if (this.overWorld(e)) {
      // Dragged out of the pack onto the world: let it go.
      this.onDropToWorld(d.from);
    }
  }

  private slotUnder(e: PointerEvent): HTMLElement | null {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    return (el?.closest('[data-invslot]') as HTMLElement | null) ?? null;
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

  /** The bench speaks when the case is open and no station is paired. */
  private benchActive(): boolean {
    return !this.invPanel.classList.contains('hidden') && this.stationContext() === null;
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
    const verbs: Array<{ label: string; act: () => void; danger?: boolean }> = [];
    const src = this.benchSource;
    if (src?.kind === 'inv') {
      const idx = src.slot;
      const slot = this.lastSlots[idx];
      if (slot) {
        const def = itemDef(slot.item);
        if (def?.equipSlot) verbs.push({ label: 'Equip', act: () => this.onSlotAction(idx, 'use') });
        else if (def?.heals) verbs.push({ label: 'Eat', act: () => this.onSlotAction(idx, 'use') });
        verbs.push({ label: 'Drop', act: () => this.onSlotAction(idx, 'drop'), danger: true });
      }
    } else if (src?.kind === 'equip') {
      const worn = this.lastEquipment[src.slot];
      if (worn) verbs.push({ label: 'Remove', act: () => this.onUnequip(src.slot as EquipSlot) });
    }
    for (const v of verbs) {
      const b = document.createElement('button');
      b.className = v.danger ? 'act-btn minor bench-danger' : 'act-btn';
      b.textContent = v.label;
      b.addEventListener('click', v.act);
      this.benchActs.appendChild(b);
    }
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

    // The key's fine print: the trade name, then what kind of halls
    // wait behind the veil. (Power already leads the headline.)
    if (dungeon) {
      stat('Sigil', dungeon.sigil, '#8f7bd9');
      stat('Theme', dungeon.theme.charAt(0).toUpperCase() + dungeon.theme.slice(1), '#c4b590');
    }

    const w = def.weapon;
    if (w) {
      // Damage already leads the headline; the fine print starts here.
      stat(w.style === 'onehand' || w.style === 'twohand' ? 'Reach' : 'Range', `${w.range} tiles`, '#c9a23c');
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
    if (rolled) {
      for (const a of rolled.affixes) {
        stat(affixName(a.stat), `+${a.value}`, '#7dc46a');
      }
      // Native traits — what the def itself DOES beyond stats.
      if (def.gear?.effects?.length) {
        stat('Trait', def.gear.effects.map(describeEffect).join(' · '), '#e8c04c');
      }
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
      // The gate is the INSTANCE's: a power-45 heirloom demands 45.
      const req = effectiveReq(itemId, roll);
      if (req) {
        const own = levelForXp(this.lastSkills[req.skill] ?? 0);
        const met = own >= req.level;
        stat(
          'Requires',
          `${affixName(req.skill)} ${req.level}`,
          met ? '#8a7a5f' : '#d95763',
        );
      }
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
      if (primary) hint('A', 'pad-glyph a', primary);
      hint('Y', 'pad-glyph y', 'Options');
      if (!wornSlot) hint('X', 'pad-glyph x', 'Move');
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
    const entries: Array<{ label: string; act: () => void; danger?: boolean }> = [];

    if (el.dataset.invslot !== undefined) {
      const idx = Number(el.dataset.invslot);
      const slot = this.lastSlots[idx];
      if (!slot) return false;
      const def = itemDef(slot.item);
      const station = this.stationContext();
      if (def?.equipSlot) entries.push({ label: 'Equip', act: () => this.onSlotAction(idx, 'use') });
      else if (def?.heals) entries.push({ label: 'Eat', act: () => this.onSlotAction(idx, 'use') });
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
    cell.style.gridArea = slot;
    cell.dataset.equipslot = slot;
    const worn = equipment[slot];
    if (worn) {
      cell.classList.add('clickable', 'equipped');
      const tier = rarityOfInstance(worn.id, worn.roll);
      if (tier !== 'common') cell.classList.add(`rarity-${tier}`);
      cell.dataset.filled = '1';
      cell.dataset.nav = '';
      cell.dataset.navkey = `equip:${slot}`;
      cell.dataset.tipname = instanceName(worn.id, worn.roll);
      cell.dataset.acta = 'Remove';
      cell.addEventListener('click', () => this.onUnequip(slot));
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
      cell.dataset.tipname = slot.charAt(0).toUpperCase() + slot.slice(1);
      const ghost = document.createElement('img');
      ghost.className = 'slot-ghost';
      ghost.src = slotGlyphUrl(slot, 64);
      ghost.draggable = false;
      cell.appendChild(ghost);
    }
    // Every socket wears its name — full or empty, you know the place.
    const label = document.createElement('span');
    label.className = 'slot-label';
    label.textContent = slot;
    cell.appendChild(label);
    return cell;
  }

  renderEquipment(equipment: Partial<Record<string, EquippedItem>>): void {
    this.lastEquipment = equipment;
    // The armor stand: every socket hung at its body place.
    this.equipAnatomy.innerHTML = '';
    for (const slot of EQUIP_SLOTS) {
      this.equipAnatomy.appendChild(this.equipCell(slot, equipment));
    }

    this.renderGearStrip(equipment);
    this.renderWornManifest(equipment);

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
      // The headline: the piece's one most honest figure.
      const note = document.createElement('span');
      note.className = 'worn-row-note';
      const relicArt = def.relic ? abilityDef(def.relic)?.name : undefined;
      const sigilArt = def.sigil ? abilityDef(def.sigil)?.name : undefined;
      const passive = def.passive ? PASSIVES[def.passive]?.name : undefined;
      note.textContent =
        stats?.damage !== undefined && stats.damage > 0
          ? `${Math.floor(stats.damage)} dmg${stats.affixes.length > 0 ? ` · ${stats.affixes.length}✦` : ''}`
          : stats && stats.armor > 0
            ? `${stats.armor} armor${stats.affixes.length > 0 ? ` · ${stats.affixes.length}✦` : ''}`
            : (relicArt ?? sigilArt ?? passive ?? (def.armor ? `${def.armor} armor` : slot));
      row.append(img, name, note);
      rows.push(row);
    }
    this.wornManifest.classList.toggle('hidden', rows.length === 0);
    if (rows.length === 0) return;
    this.wornManifest.appendChild(sectionHead('The kit'));
    for (const row of rows) this.wornManifest.appendChild(row);
  }

  /**
   * The gear ledger: everything the worn kit adds up to, told as stat
   * plaques under the stage — a big honest number over a plain label.
   */
  private renderGearStrip(equipment: Partial<Record<string, EquippedItem>>): void {
    const gear = aggregateGearStats(equipment as Parameters<typeof aggregateGearStats>[0]);
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
   * THE UNWRITTEN PAGE's codex law: a hidden art simply does not exist
   * here until its deed is done — no veiled plate, no rumor to
   * min-max. THE QUIET SHELF extends it to the secrets: a secret art
   * shows only while a weapon in hand teaches it, while it holds a
   * seat, or once it is mastered — 114 arts stay a world of rumors,
   * never a spreadsheet.
   */
  private visibleTechniques(style: SkillId): TechniqueDef[] {
    const inHand = this.equippedArtIds();
    const secrets = secretArtsFor(style as TechniqueDef['style']).filter(
      (s) =>
        this.ownsArt(s.ability) || inHand.has(s.ability) || this.seatOf(s.ability) !== null,
    );
    return [
      ...techniquesFor(style).filter((t) => !t.hidden || this.earnedArts.includes(t.ability)),
      ...secrets,
    ];
  }

  /** Server-confirmed answered Callings; re-renders whoever shows them. */
  setCallings(answered: string[]): void {
    this.callings = answered;
    this.renderSkills(this.lastSkills);
    if (this.artsOpen) this.renderArts();
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
      const label = document.createElement('span');
      label.className = answered.length > 0 ? 'tech-link-name' : 'tech-link-none';
      label.textContent =
        answered.length > 0 ? answered.map((d) => d.name).join(' · ') : 'None answered';
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
        this.callingSel = defs[0]?.id ?? null;
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
    if (tech.secret && !this.ownsArt(tech.ability)) return 1;
    return techniqueRankFor(tech, levelForXp(this.lastSkills[style] ?? 0));
  }

  /** A technique's rung state against the player's skill level. */
  private techState(
    style: SkillId,
    tech: { ability: string; unlockLevel: number },
  ): 'equipped' | 'unlocked' | 'locked' | 'veiled' {
    const level = levelForXp(this.lastSkills[style] ?? 0);
    if (level >= tech.unlockLevel) {
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
    const stops: Array<SkillId | 'callings'> = [...schools, 'callings'];
    if (!this.artsRail.dataset.pagerWired) {
      this.artsRail.dataset.pagerWired = '1';
      this.artsRail.addEventListener('kit-page', (e) => {
        const dir = (e as CustomEvent<-1 | 1>).detail;
        const current: SkillId | 'callings' =
          this.artsWing === 'callings' ? 'callings' : (this.artsSchoolSel ?? 'callings');
        const order = [...this.artsSchoolIds(), 'callings' as const];
        const i = order.indexOf(current);
        const next = order[Math.max(0, Math.min(order.length - 1, i + dir))];
        if (next !== undefined && next !== current) this.pickRailStop(next);
      });
    }
    for (const stop of stops) {
      const isCallings = stop === 'callings';
      const active = isCallings ? this.artsWing === 'callings' : this.artsWing === 'arts' && this.artsSchoolSel === stop;
      const face = isCallings
        ? { icon: 'arcane_dust', color: '#b49af0' }
        : (SKILL_FACE[stop] ?? { icon: 'bread', color: '#d9a441' });
      const btn = document.createElement('button');
      btn.className = 'rail-stop' + (active ? ' active' : '');
      btn.style.setProperty('--skill-accent', face.color);
      btn.dataset.nav = '';
      btn.dataset.navkey = `rail:${stop}`;
      btn.dataset.acta = 'Open';
      btn.dataset.navnext = '#arts-schools';
      // The crest: the school's mark ringed by its climb.
      let frac: number;
      let sub: string;
      if (isCallings) {
        const budget = focusBudget(this.lastSkills);
        const used = this.focusUsed();
        frac = budget > 0 ? used / budget : 0;
        sub = `${used} of ${budget}`;
      } else {
        const level = levelForXp(this.lastSkills[stop] ?? 0);
        frac = level / 99;
        sub = `Lv ${level}`;
      }
      const ring = ringGauge(frac, { tone: face.color });
      const img = document.createElement('img');
      img.src = itemIconUrl(face.icon, 26);
      img.draggable = false;
      ring.center.appendChild(img);
      const text = document.createElement('span');
      text.className = 'rail-text';
      const name = document.createElement('span');
      name.className = 'rail-name';
      name.textContent = isCallings ? 'Callings' : skillName(stop);
      const lv = document.createElement('span');
      lv.className = 'rail-sub';
      lv.textContent = sub;
      text.append(name, lv);
      btn.append(ring.root, text);
      const unseenHere = isCallings
        ? this.unseenCallings() > 0
        : this.visibleTechniques(stop).some((t) => {
            const s = this.techState(stop, t);
            return (s === 'unlocked' || s === 'equipped') && !this.seenTech.has(t.ability);
          });
      if (unseenHere) btn.classList.add('has-pip');
      // A school holding a seated art wears its quiet in-hand mark.
      if (
        !isCallings &&
        this.techniques.some((a) => techniquePoolDef(a ?? '')?.style === stop)
      ) {
        btn.classList.add('in-hand-stop');
      }
      btn.addEventListener('click', () => this.pickRailStop(stop));
      this.artsRail.appendChild(btn);
    }
  }

  /** Step or click to a rail stop: a school onto the stage, or Callings. */
  private pickRailStop(stop: SkillId | 'callings'): void {
    if (stop === 'callings') {
      this.artsWing = 'callings';
    } else {
      this.artsWing = 'arts';
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
    this.renderArtsRail(schools);

    if (this.artsWing === 'callings') {
      this.renderCallingsWing();
      return;
    }

    this.renderArtsLoadout();
    this.artsSchools.innerHTML = '';
    if (this.artsSchoolSel) this.artsSchools.appendChild(this.artsSchool(this.artsSchoolSel));
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
    for (const id of this.callings) used += callingDef(id)?.focusCost ?? 0;
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
   * THE FOCUS LAW's meter: what the milestones have earned, what the
   * answered set is holding — rendered where the loadout strip lives.
   */
  private renderFocusMeter(): void {
    const budget = focusBudget(this.lastSkills);
    const used = this.focusUsed();
    this.artsLoadout.innerHTML = '';
    const title = document.createElement('span');
    title.className = 'load-title';
    title.textContent = 'Focus';
    const nums = document.createElement('span');
    nums.className = 'focus-nums';
    nums.textContent = `${used} / ${budget}`;
    const bar = document.createElement('div');
    bar.className = 'focus-bar';
    const fill = document.createElement('div');
    fill.className = 'focus-fill' + (used >= budget ? ' full' : '');
    fill.style.width = `${budget > 0 ? Math.min(100, (used / budget) * 100) : 0}%`;
    bar.appendChild(fill);
    const teach = document.createElement('span');
    teach.className = 'focus-teach';
    teach.textContent =
      used >= budget
        ? 'Focus spent. Milestones at skill 50 and 99 deepen it.'
        : 'Answered Callings hold Focus. Skills at 50 and 99 deepen it.';
    this.artsLoadout.append(title, nums, bar, teach);
  }

  /** The passives wing: the meter, every skill's two Callings, the bench. */
  private renderCallingsWing(): void {
    const skills = this.callingSkillIds();
    // Resolve the bench subject: keep the pick while it exists.
    const allDefs = skills.flatMap((s) => callingsFor(s));
    if (!this.callingSel || !allDefs.some((d) => d.id === this.callingSel)) {
      this.callingSel =
        allDefs.find((d) => this.callingState(d) === 'answered')?.id ??
        allDefs.find((d) => this.callingState(d) === 'unlocked')?.id ??
        allDefs[0]?.id ??
        null;
    }
    this.markCallingSeen(this.callingSel);
    this.renderFocusMeter();

    this.artsSchools.innerHTML = '';
    for (const skill of skills) {
      const row = document.createElement('div');
      row.className = 'calling-row';
      const head = document.createElement('div');
      head.className = 'calling-row-head';
      const name = document.createElement('span');
      name.className = 'calling-skill-name';
      const hidden = HIDDEN_SKILLS[skill];
      name.textContent = skillName(skill);
      if (hidden) name.classList.add('secret');
      const lv = document.createElement('span');
      lv.className = 'calling-skill-lv';
      lv.textContent = `Lv ${levelForXp(this.lastSkills[skill] ?? 0)}`;
      head.append(name, lv);
      row.appendChild(head);
      const chips = document.createElement('div');
      chips.className = 'calling-chips';
      for (const def of callingsFor(skill)) {
        chips.appendChild(this.callingChip(def));
      }
      row.appendChild(chips);
      this.artsSchools.appendChild(row);
    }
    this.renderCallingBench();
    this.updateArtsPip();
  }

  /** One Calling as a chip: gem, name, and where it stands. */
  private callingChip(def: CallingDef): HTMLElement {
    const st = this.callingState(def);
    const chip = document.createElement('button');
    chip.className = `call-chip ${st}`;
    if (this.callingSel === def.id) chip.classList.add('selected');
    chip.dataset.nav = '';
    chip.dataset.navkey = `call:${def.id}`;
    chip.dataset.acta = 'Inspect';
    const gem = document.createElement('span');
    gem.className = 'call-gem';
    gem.style.setProperty('--gem', def.color);
    const name = document.createElement('span');
    name.className = 'call-name';
    name.textContent = def.name;
    const sub = document.createElement('span');
    sub.className = 'call-sub';
    sub.textContent =
      st === 'answered'
        ? 'Answered'
        : st === 'unlocked'
          ? `${def.focusCost} Focus`
          : `Lv ${def.unlockLevel}`;
    chip.append(gem, name, sub);
    if (st !== 'locked' && !this.seenCallings.has(def.id)) {
      const pip = document.createElement('span');
      pip.className = 'new-pip';
      pip.textContent = 'NEW';
      chip.appendChild(pip);
    }
    chip.addEventListener('click', () => {
      this.callingSel = def.id;
      this.renderArts();
    });
    return chip;
  }

  /** The bench: the chosen Calling laid out large, the answer button. */
  private renderCallingBench(): void {
    this.artsDetail.innerHTML = '';
    const def = this.callingSel ? callingDef(this.callingSel) : undefined;
    if (!def) {
      const note = document.createElement('div');
      note.className = 'bench-empty';
      note.textContent = 'Raise a skill to 20 and its first Calling will gather here.';
      this.artsDetail.appendChild(note);
      return;
    }
    const st = this.callingState(def);
    const callingSkill = skillName(def.skill);

    const head = document.createElement('div');
    head.className = 'bench-head';
    const well = document.createElement('div');
    well.className = 'bench-plate call-plate';
    const gem = document.createElement('span');
    gem.className = 'call-gem lg';
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
    this.artsDetail.appendChild(head);

    const state = document.createElement('div');
    state.className = `art-state ${st === 'answered' ? 'equipped' : st}`;
    state.textContent =
      st === 'answered'
        ? `Answered — holding ${def.focusCost} Focus`
        : st === 'unlocked'
          ? `Ready to answer — holds ${def.focusCost} Focus`
          : `Answers at ${callingSkill} level ${def.unlockLevel}`;
    this.artsDetail.appendChild(state);

    const desc = document.createElement('p');
    desc.className = 'bench-desc';
    desc.textContent = def.desc;
    this.artsDetail.appendChild(desc);

    const budget = focusBudget(this.lastSkills);
    const used = this.focusUsed();
    if (st === 'answered') {
      this.artsDetail.appendChild(
        bigButton('Set down', `calloff:${def.id}`, () => this.onCalling(def.id, false)),
      );
    } else if (st === 'unlocked') {
      const btn = bigButton(
        `Answer — ${def.focusCost} Focus`,
        `callon:${def.id}`,
        () => this.onCalling(def.id, true),
      );
      if (used + def.focusCost > budget) btn.classList.add('cant');
      this.artsDetail.appendChild(btn);
    }
    const teach = document.createElement('div');
    teach.className = 'bench-teach';
    teach.textContent =
      used + def.focusCost > budget && st === 'unlocked'
        ? `Your Focus is ${used}/${budget}. Set another Calling down, or deepen it at skill 50 and 99.`
        : 'Answering is always free to change. The budget is the only law.';
    this.artsDetail.appendChild(teach);
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
        act: () => this.onTechnique(ability, seat === 0 ? 0 : 2),
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
    const title = document.createElement('span');
    title.className = 'load-title';
    title.textContent = 'Battle loadout';
    this.artsLoadout.appendChild(title);
    for (const row of [
      { action: 'ability1', src: 'First art', ab: this.techniques[0] ?? undefined, empty: 'Choose below', art: true },
      { action: 'ability3', src: 'Second art', ab: this.techniques[1] ?? undefined, empty: 'Choose below', art: true },
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
      if (dormant) seat.root.classList.add('dormant');
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
  }

  /** One school: its face, level, and the four-rung ladder. */
  private artsSchool(style: SkillId): HTMLElement {
    const face = SKILL_FACE[style] ?? { icon: 'bread', color: '#d9a441' };
    const hidden = HIDDEN_SKILLS[style];
    const level = levelForXp(this.lastSkills[style] ?? 0);
    const block = document.createElement('div');
    block.className = 'arts-school' + (hidden ? ' secret-skill' : '');
    block.id = `arts-school-${style}`;
    block.style.setProperty('--skill-accent', face.color);

    const head = document.createElement('div');
    head.className = 'arts-school-head';
    const plaque = document.createElement('span');
    plaque.className = 'skill-plaque sm';
    plaque.style.borderColor = face.color;
    const img = document.createElement('img');
    img.src = itemIconUrl(face.icon, 30);
    img.draggable = false;
    plaque.appendChild(img);
    const name = document.createElement('span');
    name.className = 'arts-school-name';
    name.textContent = skillName(style);
    const lv = document.createElement('span');
    lv.className = 'arts-school-lv';
    lv.textContent = `Lv ${level}`;
    head.append(plaque, name, lv);
    // How much of the ladder this hand has climbed (pages and secrets
    // ride outside it — the count is the RUNG count, nothing else).
    const rungs = this.visibleTechniques(style).filter((t) => !t.hidden && !t.secret);
    const climbed = rungs.filter((t) => {
      const s = this.techState(style, t);
      return s === 'unlocked' || s === 'equipped';
    }).length;
    const count = document.createElement('span');
    count.className = 'arts-school-count';
    count.textContent = `${climbed} of ${rungs.length}`;
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
    block.appendChild(head);

    const visible = this.visibleTechniques(style);
    const ladder = visible.filter((t) => !t.secret);
    const secrets = visible.filter((t) => t.secret);
    const rail = document.createElement('div');
    rail.className = 'tech-rail';
    ladder.forEach((tech, i) => {
      // The link back to the previous rung — earned pages sit outside
      // the ladder, so no link touches them on either side.
      const prev = ladder[i - 1];
      const linked = i % 5 !== 0 && !tech.hidden && !!prev && !prev.hidden;
      rail.appendChild(this.techPlate(style, tech, linked));
    });
    block.appendChild(rail);
    // THE QUIET SHELF: the school's secret arts — only the ones this
    // hand has met. No shelf renders until a secret is worth showing.
    if (secrets.length > 0) {
      const shelfHead = document.createElement('div');
      shelfHead.className = 'secret-shelf-head';
      shelfHead.textContent = 'Secret arts';
      shelfHead.dataset.tipname = 'The secret shelf';
      shelfHead.dataset.tipsub =
        'Arts that weapons teach. Fight with the teacher and its art becomes yours for good.';
      block.appendChild(shelfHead);
      const shelf = document.createElement('div');
      shelf.className = 'tech-rail secret-shelf';
      for (const tech of secrets) shelf.appendChild(this.techPlate(style, tech, false));
      block.appendChild(shelf);
    }
    return block;
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
    btn.dataset.navnext = '#arts-detail';
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
    if (tech.secret && !this.ownsArt(tech.ability)) {
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
    this.artsSchools
      .querySelectorAll('.tech-plate-btn.selected')
      .forEach((p) => p.classList.remove('selected'));
    this.artsSchools
      .querySelector(`[data-navkey="${CSS.escape(`art:${ability}`)}"]`)
      ?.classList.add('selected');
    this.renderArtsBench();
    this.updateArtsPip();
  }

  /** The bench: the chosen art laid out large, stats told honestly. */
  private renderArtsBench(all?: Array<{ style: SkillId; t: TechniqueDef }>): void {
    all ??= this.artsSchoolIds().flatMap((s) =>
      this.visibleTechniques(s).map((t) => ({ style: s, t })),
    );
    this.artsDetail.innerHTML = '';
    const entry = all.find((e) => e.t.ability === this.artsSel);
    if (!entry) {
      const note = document.createElement('div');
      note.className = 'bench-empty';
      note.textContent = 'Raise a combat skill and its arts will gather here.';
      this.artsDetail.appendChild(note);
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
    const state = document.createElement('div');
    state.className = `art-state ${st}`;
    if (st === 'equipped') {
      if (t.secret && !this.ownsArt(t.ability)) {
        if (this.equippedArtIds().has(t.ability)) {
          state.appendChild(glyphLine('Riding your • seat, lent by the weapon in your hand', benchChip()));
        } else {
          state.appendChild(glyphLine('Seated on •, asleep. Hold a weapon that teaches it.', benchChip()));
        }
      } else {
        state.appendChild(glyphLine('Riding your • seat', benchChip()));
      }
    } else {
      state.textContent =
        st === 'unlocked'
          ? t.secret && !this.ownsArt(t.ability)
            ? 'Lent while its weapon is in your hand. Fight with it and the art will stay.'
            : 'Unlocked — ready to seat'
          : st === 'locked'
            ? `Unlocks at ${styleName} level ${t.unlockLevel}`
            : `A secret of ${styleName} — still veiled`;
    }
    this.artsDetail.appendChild(state);

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
      const stats = document.createElement('div');
      stats.className = 'bench-stats';
      const add = (value: string, label: string, tone?: string): void => {
        stats.appendChild(statPlaque(value, label, tone));
      };
      const secs = (ticks: number): string => {
        const s = ticks / 20;
        return `${s % 1 === 0 ? s : s.toFixed(1)}s`;
      };
      const channeled = (ab.channelTicks ?? 0) > 0 && ab.shape !== 'tame';
      if (ab.damage > 0) add(String(ab.damage), channeled ? 'Per Beat' : 'Damage', '#d95763');
      if (ab.cooldownTicks > 0) add(secs(ab.cooldownTicks), 'Cooldown', '#b49af0');
      // THE DRAWN BREATH / THE HELD NOTE wear words: the planted
      // figure reads the same ONE ruler the accrual does.
      if (ab.castTicks) {
        add(`${secs(ab.castTicks)} (${secs(ab.castTicks / CAST_STILL_FACTOR)} planted)`, 'Cast', '#d2e0f6');
      }
      if (ab.channelTicks) add(secs(ab.channelTicks), 'Channel', '#f6e2b2');
      if (ab.range) add(`${ab.range}`, 'Range', '#7dc46a');
      if (ab.radius) add(`${ab.radius}`, 'Radius', '#8ac4e8');
      if ((ab.projectiles ?? 0) > 1) add(`×${ab.projectiles}`, 'Shots', '#e8b64c');
      if (ab.chainTargets) add(`×${ab.chainTargets}`, 'Chains', '#ffe86a');
      if (ab.dashTiles) add(`${Math.abs(ab.dashTiles)}`, 'Dash', '#e8b64c');
      if (ab.knockback) {
        if (ab.knockback < 0) add('Pulls', 'Vortex', '#8a6ac8');
        else add(String(ab.knockback), 'Knockback', '#9aa2ac');
      }
      if (ab.status) {
        const statusName =
          ab.status.status.charAt(0).toUpperCase() + ab.status.status.slice(1);
        add(statusName, `for ${secs(ab.status.durationTicks)}`, '#7ac46a');
      }
      this.artsDetail.appendChild(stats);
    }

    // THE HONED-ART LAW's ledger: four seals, one per rank. Attained
    // seals tell what they honed; waiting seals tell when they wake.
    if ((st === 'unlocked' || st === 'equipped') && t.ranks?.length) {
      const ledger = document.createElement('div');
      ledger.className = 'rank-ledger';
      for (let r = 1; r <= TECHNIQUE_MAX_RANK; r++) {
        const seal = document.createElement('span');
        seal.className =
          'rank-seal' + (r <= rank ? ' attained' : '') + (r === rank ? ' current' : '');
        seal.textContent = RANK_ROMAN[r] ?? '?';
        const note = r === 1 ? base.desc : (t.ranks[r - 2]?.note ?? '');
        if (r <= rank) {
          seal.dataset.tipname = `Rank ${RANK_ROMAN[r]}`;
          seal.dataset.tipsub = note;
        } else {
          seal.dataset.tipname = `Rank ${RANK_ROMAN[r]} — ${styleName} Lv ${rankLevel(techniqueAnchor(t), r)}`;
          seal.dataset.tipsub = 'Train on, and the art will sharpen itself.';
        }
        ledger.appendChild(seal);
      }
      this.artsDetail.appendChild(ledger);
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
        const btn = bigButton('Seat', s === 0 ? `artequip:${t.ability}` : `artequipr:${t.ability}`, () =>
          this.onTechnique(t.ability, s === 0 ? 0 : 2),
        );
        btn.textContent = '';
        btn.appendChild(glyphLine('Seat on •', seatChip(this.seatAction(s))));
        seats.appendChild(btn);
      }
      this.artsDetail.appendChild(seats);
    }
    const teach = document.createElement('div');
    teach.className = 'bench-teach';
    teach.appendChild(
      glyphLine(
        'The • and • seats both carry any learned art, whatever you wield. Two seats, two arts. Swapping is always free.',
        seatChip(this.seatAction(0)),
        seatChip(this.seatAction(1)),
      ),
    );
    this.artsDetail.appendChild(teach);
  }
}
