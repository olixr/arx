export { SKILL_FACE, WIELD_WORD } from './panelFaces.js';
import { type EquipSlot, type EquippedItem, type InvSlot, type Look, type SkillId, type SkillXp, type TechniqueDef } from '@arx/shared';
import { type CallingDef } from '@arx/content';
import { type Socket } from './kit/plates.js';
import { type ProvingGround } from './artDiagram.js';
/**
 * One quiet line under each skill's name — what the craft IS. Shared
 * with the level-up plaque, which says it once as the citation line.
 */
export declare const SKILL_STORY: Record<string, string>;
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
export declare class Panels {
    private readonly onUseSlot;
    private readonly onUnequip;
    readonly onTechnique: (ability: string, slot: 0 | 2) => void;
    private readonly onInvMove;
    private readonly onDropToWorld;
    private readonly onSlotAction;
    /** Which station conversation is open — labels the menu verbs. */
    private readonly stationContext;
    /** Active input device — the card's action hints speak its glyphs. */
    private readonly deviceMode;
    /** Cosmetic per-hand grip preference: read current + set. */
    private readonly carryStyle;
    private readonly onCarryStyle;
    /** The case's owner: the name on the identity line and the look
     * the alcove's standing figure is painted from. */
    private readonly identityInfo;
    /** Opens the Techniques codex (skill cards link into it). */
    private readonly onOpenArts;
    /** Answer or set down a Calling (server enforces THE FOCUS LAW). */
    readonly onCalling: (calling: string, on: boolean, rank?: number) => void;
    /** THE SECOND GRIP: fire the swap verb (the rack's Draw/Trade). */
    private readonly onSwapSets;
    private readonly invPanel;
    private readonly invGrid;
    private readonly equipAnatomy;
    private readonly coinReadout;
    private readonly packFill;
    private readonly packFilters;
    /** The pack's lens: dims sockets outside the chosen family. */
    private packFilter;
    private readonly identName;
    private readonly identDeed;
    private readonly skillsPanel;
    private readonly skillsWall;
    private readonly skillsHero;
    /** The skill standing on the hero pane. */
    private skillSel;
    readonly artsPanel: HTMLElement;
    readonly artsRail: HTMLElement;
    readonly artsLoadout: HTMLElement;
    readonly artsSchools: HTMLElement;
    readonly artsDetail: HTMLElement;
    /** THE PROVING GROUND: the live diagram pane of the chosen art. */
    private readonly artsGroundHost;
    readonly ground: ProvingGround;
    /** The Hand's two art seats, kept for the seat-flight landing flash. */
    altarSockets: Socket[];
    /** The technique the codex bench is laying out (null = auto-pick). */
    artsSel: string | null;
    /** The school standing on the stage (the rail's choice). */
    artsSchoolSel: SkillId | null;
    /** Which wing of the codex is open: the actives or the passives. */
    artsWing: 'arts' | 'callings';
    /** THE OPEN HALL: the skill whose calling ladder stands on the stage. */
    callingSkillSel: SkillId | null;
    /** The Calling the bench is laying out (callings wing). */
    callingSel: string | null;
    /** Answered Callings, mirrored from the server. */
    callings: string[];
    /** APPLIED ranks past I by id (absent = Rank I). */
    private callingRanks;
    /** Unlocked techniques the player has inspected — the NEW-pip ledger. */
    readonly seenTech: Set<string>;
    /** Unlocked Callings the player has inspected — the NEW-pip ledger. */
    readonly seenCallings: Set<string>;
    private readonly gearStrip;
    /**
     * THE HERO'S ALCOVE: the arched niche at the stand's heart where the
     * player's LIVE rig stands, painted by the world's own hand
     * (cms/portraits lookFigure) wearing every worn piece. Persistent
     * nodes — renderEquipment re-appends them after each rebuild so the
     * figure never flickers through an innerHTML wipe.
     */
    private readonly figureAlcove;
    private readonly alcoveFigure;
    /** The worn-kit signature of the standing figure (bloom on change). */
    private figureSig;
    /** THE BENCH: the open case's standing inspector tray. */
    private readonly benchCard;
    private readonly benchEmpty;
    private readonly benchActs;
    /** What lies on the bench (survives hover leaving the cell). */
    private benchSource;
    private readonly card;
    private readonly menu;
    /** THE FREE HAND: the one slotted technique, mirrored from the server. */
    /** THE SECOND HAND: the seated techniques, [Q, R] (server truth). */
    techniques: [string | null, string | null];
    /** THE LESSON LAW's banks (server truth; cost derives from the dial). */
    lessons: Record<string, number>;
    /** Hidden arts earned by deed, mirrored from the server. */
    private earnedArts;
    lastSkills: SkillXp;
    private lastSlots;
    lastEquipment: Partial<Record<string, EquippedItem>>;
    /**
     * ONE TRUTH FOR THE COUNT (visible-buildcraft V3): the aggregate of
     * the worn kit, computed ONCE per equipment push by the shared
     * aggregator. Every House surface (court, card, anatomy pips, pack
     * marks, compare) reads `setCounts` from here — the hand-rolled
     * per-card counter is dead.
     */
    private lastGearStats;
    /** What the inspect card currently shows (to refresh on re-render). */
    private cardSource;
    /** The cell the card is pinned beside (repositions on refresh). */
    private cardAnchor;
    private drag;
    constructor(onUseSlot: (slot: number) => void, onUnequip: (slot: EquipSlot) => void, onTechnique?: (ability: string, slot: 0 | 2) => void, onInvMove?: (from: number, to: number, merge?: boolean) => void, onDropToWorld?: (slot: number) => void, onSlotAction?: (slot: number, action: SlotAction) => void, 
    /** Which station conversation is open — labels the menu verbs. */
    stationContext?: () => 'bank' | 'shop' | null, 
    /** Active input device — the card's action hints speak its glyphs. */
    deviceMode?: () => 'kb' | 'pad', 
    /** Cosmetic per-hand grip preference: read current + set. */
    carryStyle?: (hand: 'main' | 'off') => 'normal' | 'rogue', onCarryStyle?: (style: 'normal' | 'rogue', hand: 'main' | 'off') => void, 
    /** The case's owner: the name on the identity line and the look
     * the alcove's standing figure is painted from. */
    identityInfo?: () => {
        name?: string;
        look?: Look | null;
    }, 
    /** Opens the Techniques codex (skill cards link into it). */
    onOpenArts?: () => void, 
    /** Answer or set down a Calling (server enforces THE FOCUS LAW). */
    onCalling?: (calling: string, on: boolean, rank?: number) => void, 
    /** THE SECOND GRIP: fire the swap verb (the rack's Draw/Trade). */
    onSwapSets?: () => void);
    /**
     * The device changed hands (or the keymap changed): any open screen
     * that writes glyphs into sentences redraws for the new truth —
     * including the bench card's verb hints (a controller swap mid-
     * inspection must re-letter Equip/Options/Move).
     */
    refreshDevice(): void;
    /**
     * Mirror the character screen's open state onto `body.inventory-open`.
     * The station-pairing CSS (character.css) used to read this panel
     * through document-scoped `body:has(...)` selectors, which re-match
     * on EVERY `.hidden` toggle anywhere in the document; a body class
     * costs only the toggle. Called from every path that shows or hides
     * the pack (the toggle/show trio and closeAll), so it never leaks.
     */
    private syncBodyClass;
    toggleInventory(): void;
    showInventory(): void;
    toggleSkills(): void;
    showSkills(): void;
    showArts(): void;
    get invOpen(): boolean;
    get skillsOpen(): boolean;
    get artsOpen(): boolean;
    closeAll(): void;
    get anyOpen(): boolean;
    private dragMove;
    /** The inventory's ground tray under the pointer, if it stands. */
    private groundUnder;
    /** True when the pointer floats over the game canvas, not any UI. */
    private overWorld;
    private dragEnd;
    private slotUnder;
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
    private equipActionFor;
    /** True when the pack slot's piece can land on this socket. */
    canPlaceToEquip(from: number, slot: EquipSlot): boolean;
    /**
     * The socket's honest verb word for a carried pack slot — what the
     * pad's action strip may promise. Null when the piece won't fit.
     */
    placeToEquipLabel(from: number, slot: EquipSlot): string | null;
    /**
     * Place a pack slot onto an equipment socket. True when the verb
     * fired (the server still holds every gate); false when the piece
     * can never live there and the carry should stand.
     */
    placeToEquip(from: number, slot: EquipSlot): boolean;
    /**
     * Show the detail card for a pack/equipment cell. One path serves
     * both devices: the mouse calls it from hover, the pad from focus.
     * Returns false when the element isn't an inspectable item.
     */
    showCardFor(el: HTMLElement | null): boolean;
    hideCard(): void;
    /** Close every transient inspect element (menu + card). */
    closeInspect(): void;
    /** The bench speaks when the case is open and no station is paired.
     * THE OPEN GROUND takes the bench's seat the same way a paired
     * station does — while loot lies in reach, the middle tray is the
     * ground ledger's and inspection rides the floating card. */
    private benchActive;
    /**
     * Re-lay the bench from its remembered source after a state push —
     * the benched item keeps its numbers honest through equips, eats,
     * and tidies. A vanished source re-seeds.
     */
    private refreshBench;
    /** First lay: the worn weapon, else the first thing in the pack. */
    private benchSeed;
    /** The benched item's verbs, as standing buttons under the card. */
    private renderBenchActs;
    /**
     * The unmet equip gate for a pack slot, or null when the piece goes
     * on freely — the one judgment every gated surface shares.
     */
    private slotGate;
    /**
     * THE TIDY HAND: sort the whole pack with one press. Computes the
     * wanted order from the last server truth, then walks there as a
     * minimal chain of the same `invmove` swaps a drag makes — server-
     * true, rate-limit-friendly (staggered), no new protocol.
     */
    private tidyPack;
    /** A speed word beats raw ticks for at-a-glance weapon reads. */
    private static speedWord;
    private static categoryLine;
    private renderCard;
    /** Open the verb menu for a pack slot or a worn equipment slot. */
    openMenuFor(el: HTMLElement, at?: {
        x: number;
        y: number;
    }): boolean;
    /** True while the pad's item verbs are riding the shared sheet. */
    private itemSheet;
    /** Close the verb menu. Returns true if one was open (Ⓑ backstop). */
    closeMenu(): boolean;
    get menuOpen(): boolean;
    /** Which filter family an item belongs to. */
    private static packFamily;
    /** Re-apply the pack lens to the rendered grid (no rebuild). */
    private applyPackFilter;
    /**
     * THE GATE ON THE SLOT: re-judge every pack well against the current
     * skills. A piece the body cannot yet wear is barred in ember across
     * the whole grid — the shortfall reads at pack scale, not one hover
     * at a time — and its seal names the level it waits on. Idempotent
     * class/seal toggles, so a level-up mid-session flips wells live
     * without rebuilding the grid.
     */
    private applyReqGate;
    /**
     * THE PACK KNOWS THE HOUSE (visible-buildcraft V3): an idempotent
     * pass in the applyReqGate mold — a pack piece whose family you
     * already wear, where wearing IT would raise the count, gets a
     * small gold house pip. The pack tells you what advances a build
     * without a single hover.
     */
    private applyHouseMarks;
    renderInventory(slots: InvSlot[]): void;
    /** Build one equipment socket, hung at its grid-area on the stand. */
    private equipCell;
    renderEquipment(equipment: Partial<Record<string, EquippedItem>>): void;
    /** Worn pieces of a family — the ONE TRUTH cache, zero when clean. */
    private setCount;
    /**
     * THE HOUSE COURT (visible-buildcraft V3): the ONE way a House is
     * shown, everywhere it appears — the stand, the item card, and (by
     * the card's re-parenting) the bench. A crest ring carries the worn
     * count toward five; each word stands as a row, lit gold when its
     * threshold is met, ghosted with its price in plain words when not.
     * Replaces the bolted-on prose block of the first HOUSE WORD pass.
     */
    private houseCourt;
    /**
     * THE HERO STANDS IN THE CASE: paint the player's live rig into the
     * alcove — the same drawHumanoid the world uses, wearing every worn
     * piece, finished with the world's outline ring. Repainted on every
     * equipment push (the portrait cache makes an unchanged kit free);
     * a CHANGED kit blooms the alcove's candle glow for one breath.
     */
    private paintFigure;
    /**
     * THE SUM AS INSTRUMENTS: everything the worn kit adds up to, told
     * as a bank of gauges — each stat a sunk chamfered plate wearing its
     * family's material glyph, a serif numeral, and its word engraved
     * beneath. Every gauge explains itself in plain words on its
     * tooltip, and every worn house holds a compact court beside them.
     */
    private renderGearStrip;
    /**
     * The identity line: adventurer name + total level. The hero
     * HIMSELF stands in the alcove below, painted by paintFigure —
     * called here too so a case opened before the first equipment push
     * still shows its owner.
     */
    private renderIdentity;
    /** Server-confirmed technique seats; re-renders whoever shows them. */
    setTechniques(chosen: [string | null, string | null], earned?: string[], lessons?: Record<string, number>): void;
    /** The seat an ability occupies (0 = Q, 1 = R), or null. */
    seatOf(ability: string): 0 | 1 | null;
    /** THE LOAN LAW's teaching hands, read off the worn weapons. */
    equippedArtIds(): Set<string>;
    /** An art owned outright: a deed page or a mastered secret. */
    ownsArt(ability: string): boolean;
    /**
     * THE MASTER'S LICENSE, derived here from the answered set exactly
     * as recomputeGear derives it (THE QUIET WIRE: no new field —
     * both ends read the same packages at the same applied ranks):
     * ability → the deepest licensing calling's rank.
     */
    licensedArts(): Map<string, number>;
    /** The calling licensing this art (the deepest, if several), for the bench's word. */
    licensingCalling(ability: string): CallingDef | undefined;
    /**
     * THE UNWRITTEN PAGE's codex law: a hidden art simply does not exist
     * here until its deed is done — no veiled plate, no rumor to
     * min-max. THE QUIET SHELF extends it to the secrets: a secret art
     * shows only while a weapon in hand teaches it, while it holds a
     * seat, or once it is mastered — 114 arts stay a world of rumors,
     * never a spreadsheet.
     */
    visibleTechniques(style: SkillId): TechniqueDef[];
    /** Server-confirmed answered Callings + applied ranks; re-renders whoever shows them. */
    setCallings(answered: string[], ranks?: Record<string, number>): void;
    /** The APPLIED rank an answered Calling is held at (Rank I when unlisted). */
    appliedRank(id: string): number;
    /** Build one skill card for the hall. */
    /**
     * One emblem on the wall: the skill's mark ringed by its climb to
     * the next level, the level told as the trophy numeral. Focus or
     * hover raises the hero pane; the emblem itself stays quiet.
     */
    private skillEmblem;
    /** Light the hero pane for one skill without rebuilding the wall. */
    private inspectSkill;
    /**
     * THE HERO PANE — the chosen deed told whole: the crown of totals
     * presiding, then the skill's face, its climb, and its doors into
     * the codex. Renders on focus; travel costs nothing.
     */
    private renderSkillHero;
    /**
     * The hall of deeds: every discipline an emblem ringed by its
     * climb, grouped into named wings, all of it visible at once —
     * the chosen skill reads whole on the hero pane to the right.
     */
    renderSkills(xp: SkillXp): void;
}
//# sourceMappingURL=panels.d.ts.map