import { type EquipSlot, type EquippedItem, type InvSlot, type SkillXp } from '@devcraft/shared';
/**
 * Every skill's face: an item that embodies the craft, and an accent
 * the card's plaque and meter wear. Pure data — a new skill is a row.
 */
export declare const SKILL_FACE: Record<string, {
    icon: string;
    color: string;
}>;
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
export declare class Panels {
    private readonly onUseSlot;
    private readonly onUnequip;
    private readonly onTechnique;
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
    /** The case's owner: the adventurer name on the identity line. */
    private readonly identityInfo;
    /** Opens the Techniques codex (skill cards link into it). */
    private readonly onOpenArts;
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
    private readonly skillsList;
    private readonly artsPanel;
    private readonly artsLoadout;
    private readonly artsSchools;
    private readonly artsDetail;
    /** The technique the codex bench is laying out (null = auto-pick). */
    private artsSel;
    /** Unlocked techniques the player has inspected — the NEW-pip ledger. */
    private readonly seenTech;
    private readonly gearStrip;
    private readonly card;
    private readonly menu;
    /** The chosen technique per style, mirrored from the server. */
    private techniques;
    private lastSkills;
    private lastSlots;
    private lastEquipment;
    /** What the inspect card currently shows (to refresh on re-render). */
    private cardSource;
    /** The cell the card is pinned beside (repositions on refresh). */
    private cardAnchor;
    private drag;
    constructor(onUseSlot: (slot: number) => void, onUnequip: (slot: EquipSlot) => void, onTechnique?: (style: string, ability: string) => void, onInvMove?: (from: number, to: number) => void, onDropToWorld?: (slot: number) => void, onSlotAction?: (slot: number, action: SlotAction) => void, 
    /** Which station conversation is open — labels the menu verbs. */
    stationContext?: () => 'bank' | 'shop' | null, 
    /** Active input device — the card's action hints speak its glyphs. */
    deviceMode?: () => 'kb' | 'pad', 
    /** Cosmetic per-hand grip preference: read current + set. */
    carryStyle?: (hand: 'main' | 'off') => 'normal' | 'rogue', onCarryStyle?: (style: 'normal' | 'rogue', hand: 'main' | 'off') => void, 
    /** The case's owner: the adventurer name on the identity line. */
    identityInfo?: () => {
        name?: string;
    }, 
    /** Opens the Techniques codex (skill cards link into it). */
    onOpenArts?: () => void);
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
    /** True when the pointer floats over the game canvas, not any UI. */
    private overWorld;
    private dragEnd;
    private slotUnder;
    /**
     * Show the detail card for a pack/equipment cell. One path serves
     * both devices: the mouse calls it from hover, the pad from focus.
     * Returns false when the element isn't an inspectable item.
     */
    showCardFor(el: HTMLElement | null): boolean;
    hideCard(): void;
    /** Close every transient inspect element (menu + card). */
    closeInspect(): void;
    /** A speed word beats raw ticks for at-a-glance weapon reads. */
    private static speedWord;
    private static categoryLine;
    private renderCard;
    /** Open the verb menu for a pack slot or a worn equipment slot. */
    openMenuFor(el: HTMLElement, at?: {
        x: number;
        y: number;
    }): boolean;
    /** Close the verb menu. Returns true if one was open (Ⓑ backstop). */
    closeMenu(): boolean;
    get menuOpen(): boolean;
    /** Which filter family an item belongs to. */
    private static packFamily;
    /** Re-apply the pack lens to the rendered grid (no rebuild). */
    private applyPackFilter;
    renderInventory(slots: InvSlot[]): void;
    /** Build one equipment socket, hung at its grid-area on the stand. */
    private equipCell;
    renderEquipment(equipment: Partial<Record<string, EquippedItem>>): void;
    /**
     * The gear ledger: everything the worn kit adds up to, told as stat
     * plaques under the stage — a big honest number over a plain label.
     */
    private renderGearStrip;
    /**
     * The identity line: adventurer name + total level. The character
     * itself is not duplicated here — the camera frames the LIVE rig in
     * the world beside the case, wearing every change as it lands.
     */
    private renderIdentity;
    /** Server-confirmed technique choices; re-renders whoever shows them. */
    setTechniques(chosen: Record<string, string>): void;
    /** Build one skill card for the hall. */
    private skillCard;
    /**
     * The hall of deeds: disciplines grouped into named wings — Combat
     * Arts as wide hero cards with their technique ladders, Fieldcraft
     * and Maker's Arts as galleries, Secret Arts appearing only once
     * discovered. A total-level crown plaque presides over the hall.
     */
    renderSkills(xp: SkillXp): void;
    /** Roman numerals for the four rungs of every school's ladder. */
    private static readonly RANKS;
    /** Combat schools owning a technique ladder, hidden law honored. */
    private artsSchoolIds;
    /** The ladder the R key channels right now (bare hands = melee). */
    private wieldingStyle;
    /** A technique's rung state against the player's skill level. */
    private techState;
    /** Record that an unlocked art has been laid eyes on. */
    private markTechSeen;
    /** The dock button's glint: any unlocked art not yet inspected. */
    private updateArtsPip;
    /** The codex, whole: loadout strip, school ladders, the bench. */
    renderArts(): void;
    /** The live Q/E/R/T strip: every slot, its source, its ability. */
    private renderArtsLoadout;
    /** One school: its face, level, and the four-rung ladder. */
    private artsSchool;
    /** The bench: the chosen art laid out large, stats told honestly. */
    private renderArtsBench;
}
//# sourceMappingURL=panels.d.ts.map