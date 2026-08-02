import { type EquipSlot, type EquippedItem, type InvSlot, type SkillXp } from '@arx/shared';
/**
 * Every skill's face: an item that embodies the craft, and an accent
 * the card's plaque and meter wear. Pure data — a new skill is a row.
 */
export declare const SKILL_FACE: Record<string, {
    icon: string;
    color: string;
}>;
/**
 * One quiet line under each skill's name — what the craft IS. Shared
 * with the level-up plaque, which says it once as the citation line.
 */
export declare const SKILL_STORY: Record<string, string>;
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
    /** Answer or set down a Calling (server enforces THE FOCUS LAW). */
    private readonly onCalling;
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
    private readonly artsPanel;
    private readonly artsRail;
    private readonly artsLoadout;
    private readonly artsSchools;
    private readonly artsDetail;
    /** The technique the codex bench is laying out (null = auto-pick). */
    private artsSel;
    /** The school standing on the stage (the rail's choice). */
    private artsSchoolSel;
    /** Which wing of the codex is open: the actives or the passives. */
    private artsWing;
    /** The Calling the bench is laying out (callings wing). */
    private callingSel;
    /** Answered Callings, mirrored from the server. */
    private callings;
    /** Unlocked techniques the player has inspected — the NEW-pip ledger. */
    private readonly seenTech;
    /** Unlocked Callings the player has inspected — the NEW-pip ledger. */
    private readonly seenCallings;
    private readonly gearStrip;
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
    private techniques;
    /** THE LESSON LAW's banks (server truth; cost derives from the dial). */
    private lessons;
    /** Hidden arts earned by deed, mirrored from the server. */
    private earnedArts;
    private lastSkills;
    private lastSlots;
    private lastEquipment;
    /** What the inspect card currently shows (to refresh on re-render). */
    private cardSource;
    /** The cell the card is pinned beside (repositions on refresh). */
    private cardAnchor;
    private drag;
    constructor(onUseSlot: (slot: number) => void, onUnequip: (slot: EquipSlot) => void, onTechnique?: (ability: string, slot: 0 | 2) => void, onInvMove?: (from: number, to: number) => void, onDropToWorld?: (slot: number) => void, onSlotAction?: (slot: number, action: SlotAction) => void, 
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
    onOpenArts?: () => void, 
    /** Answer or set down a Calling (server enforces THE FOCUS LAW). */
    onCalling?: (calling: string, on: boolean) => void);
    /**
     * The device changed hands (or the keymap changed): any open screen
     * that writes glyphs into sentences redraws for the new truth.
     */
    refreshDevice(): void;
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
    /** The bench speaks when the case is open and no station is paired. */
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
    /** Server-confirmed technique seats; re-renders whoever shows them. */
    setTechniques(chosen: [string | null, string | null], earned?: string[], lessons?: Record<string, number>): void;
    /** The seat an ability occupies (0 = Q, 1 = R), or null. */
    private seatOf;
    /** THE LOAN LAW's teaching hands, read off the worn weapons. */
    private equippedArtIds;
    /** An art owned outright: a deed page or a mastered secret. */
    private ownsArt;
    /**
     * THE UNWRITTEN PAGE's codex law: a hidden art simply does not exist
     * here until its deed is done — no veiled plate, no rumor to
     * min-max. THE QUIET SHELF extends it to the secrets: a secret art
     * shows only while a weapon in hand teaches it, while it holds a
     * seat, or once it is mastered — 114 arts stay a world of rumors,
     * never a spreadsheet.
     */
    private visibleTechniques;
    /** Server-confirmed answered Callings; re-renders whoever shows them. */
    setCallings(answered: string[]): void;
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
    /** Roman numerals for the four rungs of every school's ladder. */
    /** Combat schools owning a technique ladder, hidden law honored. */
    private artsSchoolIds;
    /**
     * THE HONED-ART LAW, mirrored: the rank the BASE level has earned.
     * THE LOAN LAW holds an unmastered secret at Rank I — the borrowed
     * motion is correct but not yet yours.
     */
    private techRank;
    /** A technique's rung state against the player's skill level. */
    private techState;
    /** Record that an unlocked art has been laid eyes on. */
    private markTechSeen;
    /** The dock button's glint: any unlocked art or Calling not yet inspected. */
    private updateArtsPip;
    /**
     * THE SCHOOL RAIL — one crest per school, the Callings last, LT/RT
     * stepping the stops. It replaced the wing tabs AND the jump strip:
     * one school stands on the stage at a time, so the eight-ladder
     * scroll is gone and nothing lives below the fold.
     */
    private renderArtsRail;
    /** Step or click to a rail stop: a school onto the stage, or Callings. */
    private pickRailStop;
    /** The codex, whole: altar, rail, the standing stop, the bench. */
    renderArts(): void;
    /** Skills whose Callings may show — the hidden-skill law honored. */
    private callingSkillIds;
    private callingState;
    private focusUsed;
    /** Unlocked-but-never-inspected Callings (the NEW-pip ledger). */
    private unseenCallings;
    private markCallingSeen;
    /**
     * THE FOCUS LAW's meter: what the milestones have earned, what the
     * answered set is holding — rendered where the loadout strip lives.
     */
    private renderFocusMeter;
    /** The passives wing: the meter, every skill's two Callings, the bench. */
    private renderCallingsWing;
    /** One Calling as a chip: gem, name, and where it stands. */
    private callingChip;
    /** The bench: the chosen Calling laid out large, the answer button. */
    private renderCallingBench;
    /**
     * The action a technique seat answers to (seat 0 casts ability1,
     * seat 1 ability3). EVERY GLYPH KNOWS ITS DEVICE: the seat is only
     * ever NAMED by a seatChip built from this action — never by a bare
     * letter baked into a sentence. `seatKey` died here in the Grand
     * Refit, Phase 3.
     */
    private seatAction;
    /** The raw pad button a seat rides — THE SEAT ANSWERS ITS OWN BUTTON. */
    private seatPadButton;
    /**
     * The seat sheet: the verbs a technique plate offers, seat chips
     * set into them. Seating an art is one press at the plate — the
     * two-column trip to the bench buttons is over.
     */
    private seatVerbs;
    /**
     * THE LOADOUT ALTAR — four painted seats, always visible: the two
     * art seats side by side, then the trinkets, THE PAIRED HAND's
     * order matching the hotbar exactly. Each seat is a kit socket
     * wearing its live chip; a filled art seat presses through to its
     * plate on the stage.
     */
    private renderArtsLoadout;
    /** One school: its face, level, and the four-rung ladder. */
    private artsSchool;
    /**
     * THE LOAN LAW's dormancy, mirrored for the codex: a seated secret
     * whose teaching weapon left the hands sleeps until it returns.
     */
    private secretDormant;
    /** One plate on a rail — rung, page, and secret speak the same shape. */
    private techPlate;
    /**
     * Light the bench for one art without rebuilding the stage: focus
     * and hover ride this, so reading is free and the ring never loses
     * the plate it stands on.
     */
    private inspectArt;
    /** The bench: the chosen art laid out large, stats told honestly. */
    private renderArtsBench;
}
//# sourceMappingURL=panels.d.ts.map