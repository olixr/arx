import { type EquipSlot, type EquippedItem, type InvSlot, type Look, type SkillXp } from '@arx/shared';
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
    /** The case's owner: the name on the identity line and the look
     * the alcove's standing figure is painted from. */
    private readonly identityInfo;
    /** Opens the Techniques codex (skill cards link into it). */
    private readonly onOpenArts;
    /** Answer or set down a Calling (server enforces THE FOCUS LAW). */
    private readonly onCalling;
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
    private readonly artsPanel;
    private readonly artsRail;
    private readonly artsLoadout;
    private readonly artsSchools;
    private readonly artsDetail;
    /** THE PROVING GROUND: the live diagram pane of the chosen art. */
    private readonly artsGroundHost;
    private readonly ground;
    /** The Hand's two art seats, kept for the seat-flight landing flash. */
    private altarSockets;
    /** The technique the codex bench is laying out (null = auto-pick). */
    private artsSel;
    /** The school standing on the stage (the rail's choice). */
    private artsSchoolSel;
    /** Which wing of the codex is open: the actives or the passives. */
    private artsWing;
    /** THE OPEN HALL: the skill whose calling ladder stands on the stage. */
    private callingSkillSel;
    /** The Calling the bench is laying out (callings wing). */
    private callingSel;
    /** Answered Callings, mirrored from the server. */
    private callings;
    /** APPLIED ranks past I by id (absent = Rank I). */
    private callingRanks;
    /** Unlocked techniques the player has inspected — the NEW-pip ledger. */
    private readonly seenTech;
    /** Unlocked Callings the player has inspected — the NEW-pip ledger. */
    private readonly seenCallings;
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
    private techniques;
    /** THE LESSON LAW's banks (server truth; cost derives from the dial). */
    private lessons;
    /** Hidden arts earned by deed, mirrored from the server. */
    private earnedArts;
    private lastSkills;
    private lastSlots;
    private lastEquipment;
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
    private seatOf;
    /** THE LOAN LAW's teaching hands, read off the worn weapons. */
    private equippedArtIds;
    /** An art owned outright: a deed page or a mastered secret. */
    private ownsArt;
    /**
     * THE MASTER'S LICENSE, derived here from the answered set exactly
     * as recomputeGear derives it (THE QUIET WIRE: no new field —
     * both ends read the same packages at the same applied ranks):
     * ability → the deepest licensing calling's rank.
     */
    private licensedArts;
    /** The calling licensing this art (the deepest, if several), for the bench's word. */
    private licensingCalling;
    /**
     * THE UNWRITTEN PAGE's codex law: a hidden art simply does not exist
     * here until its deed is done — no veiled plate, no rumor to
     * min-max. THE QUIET SHELF extends it to the secrets: a secret art
     * shows only while a weapon in hand teaches it, while it holds a
     * seat, or once it is mastered — 114 arts stay a world of rumors,
     * never a spreadsheet.
     */
    private visibleTechniques;
    /** Server-confirmed answered Callings + applied ranks; re-renders whoever shows them. */
    setCallings(answered: string[], ranks?: Record<string, number>): void;
    /** The APPLIED rank an answered Calling is held at (Rank I when unlisted). */
    private appliedRank;
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
    /** Step or click to a rail stop: a school (or a skill's ladder) onto the stage. */
    private pickRailStop;
    /** THE OPEN HALL's door: swap the wing, keeping the skill on the stage when both wings own it. */
    private setArtsWing;
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
     * THE ANSWERED LIFE — the callings wing's foot band, the build in
     * one look: the Focus instrument, the roster of every answered
     * Calling worn as its gem, and THE SUM of what the whole answered
     * set gives, told in engraved chips.
     */
    private renderAnsweredLife;
    /**
     * THE SUM's gauges: the always-on aggregates summed honestly, the
     * verbs counted, and EVERY gauge carrying the names of the
     * Callings that feed it — so the tooltip answers "where is this
     * from?" without a spreadsheet. Conditional edges are never folded
     * into flat sums (a vs-state clause is a clause, not armor).
     */
    private answeredSums;
    /** A gem in the foot band pressed: walk the hall to its own seat. */
    private jumpToCalling;
    /**
     * THE OPEN HALL (callings-v2 Phase 5): the passives wing rebuilt for
     * a ten-seat world. ONE skill's ladder stands on the stage at a time
     * (the rail picks it — never 250 chips in one scroll, pad nav stays
     * key-true); the ladder is a path ribbon of seat plates in the arts
     * stage's own vocabulary; the Focus meter rides the loadout strip;
     * the bench reads the package.
     */
    private renderCallingsWing;
    /** The wing toggle that sits in every stage head: Arts ◇ Callings. */
    private wingToggle;
    /**
     * THE ROAD (the callings wing rebuilt): one skill's sixteen seats
     * as a serpentine tree — two runs of eight, the second walking
     * back, joined by a forged turn — so the whole ladder stands on the
     * stage at once, every seat a large plaque the hand can press. The
     * pad's down press lands on the true ladder neighbor by geometry.
     */
    private callingStage;
    /** The wheel walks the ladder in seat order, whatever the road's bends. */
    private stepCallingLadder;
    /**
     * One seat as a PLAQUE: the painted well holding the calling's gem,
     * the seat level cut into a corner shield, THE RANK PIPS beneath,
     * and the name on the plate. States are drawn, never labeled:
     * answered floods the gem's own color, an open seat sits lit and
     * waiting, a locked seat is a dark socket with its level engraved.
     */
    private seatPlaque;
    /**
     * Light the bench for one calling without rebuilding the stage:
     * focus and hover ride this, so reading is free and the ring never
     * loses the plate it stands on.
     */
    private inspectCalling;
    /**
     * THE PACKAGE, spoken: one plain line per entry. Gear entries ride
     * the enchant vocabulary's own reader (one truth for cards and
     * benches); procs speak trigger and action; a when clause speaks
     * its condition and its grant; the trade dials and perks speak in
     * their own units.
     */
    private describeCallingEffect;
    private describeCondition;
    private describeGrant;
    /** The grant's dials alone, no chip name — the working plate's head. */
    private grantParts;
    /** The one-site dials in plain words — the map PERK_DIALS documents, spoken. */
    private describePerk;
    /** The bench: the chosen Calling laid out large, the answer button. */
    /**
     * THE BENCH of the callings wing, rebuilt as its own furniture: the
     * gem in a painted well, the state worn as a forged SEAL (never a
     * labeled box), the package as illuminated VERSES each led by its
     * kind's glyph, THE RANK SPINE instrument for the four depths, and
     * the verbs on brass. Everything drawn, nothing web.
     */
    private renderCallingBench;
    /**
     * THE WORKING, split for its plate: the MECHANIC as the bold head
     * (what actually happens, numbers first) and the condition as the
     * line beneath it (when it happens). The star is the effect.
     */
    private callingWorking;
    /** The glyph family a package entry belongs to, for the verse lead. */
    private callingKindOf;
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
    private artsStage;
    /** Step the ribbon's choice to the neighboring plate. */
    private stepRibbon;
    /**
     * The ladder's mist: one plate standing for every rung past the
     * next — it admits how much waits without spelling any of it.
     */
    private veilCap;
    /**
     * Slide the ribbon so the chosen plate stands center stage. The
     * track rides the `translate` channel (compositor-only), clamped so
     * the ribbon never shows void past either end.
     */
    private recenterRibbon;
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
    /**
     * THE SEAT FLIGHT — the chosen plate's face flies from the ribbon
     * into its seat, so seating an art is a thing you SEE land. Pure
     * grace note: gated by the Interface-motion setting, and the server
     * echo (setTechniques) repaints the truth under it either way.
     */
    private seatFlight;
    /**
     * THE SCHOOL ENVELOPE — the maxima the reading's gauges measure
     * against, so every bar is a COMPARISON, not a lone number: a
     * damage bar filled halfway means half the hardest hit this school
     * knows. Veiled rungs stay out of the envelope (no spoilers in the
     * scale).
     */
    private schoolEnvelope;
    /**
     * One gauge of the reading: a forged channel with the fill measured
     * against the school envelope, faceted by ticks when the unit is
     * countable (tiles), the numeral standing at the end. The stat
     * cards died here — a measure is an instrument, not a plaque.
     */
    private measureRow;
    /** One small forged seal in the marks row — a fact, worn not listed. */
    private markSeal;
    /** THE READING: the chosen art laid out as instruments, not cards. */
    private renderArtsBench;
}
//# sourceMappingURL=panels.d.ts.map