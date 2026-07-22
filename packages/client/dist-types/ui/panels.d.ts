import { type EquipSlot, type EquippedItem, type InvSlot, type Look, type SkillXp } from '@devcraft/shared';
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
    /** The mirror's model: the player's chosen look + adventurer name. */
    private readonly portraitInfo;
    private readonly invPanel;
    private readonly invGrid;
    private readonly equipLeft;
    private readonly equipRight;
    private readonly coinReadout;
    private readonly packFill;
    private readonly packFilters;
    /** The pack's lens: dims sockets outside the chosen family. */
    private packFilter;
    private readonly namePlate;
    private readonly skillsPanel;
    private readonly skillsList;
    /** The mirror: your actual rig wearing your actual gear, on a stage. */
    private readonly figWell;
    private readonly figCanvas;
    private readonly gearStrip;
    /** Which way the figure faces — the player turns it by hand. */
    private figDir;
    private static readonly FIG_DIRS;
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
    /** The mirror's model: the player's chosen look + adventurer name. */
    portraitInfo?: () => {
        look: Look | null;
        name?: string;
    });
    toggleInventory(): void;
    showInventory(): void;
    toggleSkills(): void;
    showSkills(): void;
    get invOpen(): boolean;
    get skillsOpen(): boolean;
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
    /** Build one equipment socket (either flank of the stage). */
    private equipCell;
    renderEquipment(equipment: Partial<Record<string, EquippedItem>>): void;
    /**
     * The gear ledger: everything the worn kit adds up to, told as stat
     * plaques under the stage — a big honest number over a plain label.
     */
    private renderGearStrip;
    /**
     * The mirror: the player's ACTUAL rig — same drawHumanoid as the
     * world, wearing the equipment record live — facing the glass until
     * the player turns it by hand. (The cape rides the world cloth sim,
     * so the mirror shows the kit beneath it.)
     */
    private drawPortrait;
    /** Server-confirmed technique choices; re-renders the picker. */
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
}
//# sourceMappingURL=panels.d.ts.map