import { type EquippedItem, type EquipSlot, type InvSlot, type ItemRoll, type PetInfo, type SkillXp, type StationType } from '@arx/shared';
import { type WorkStation, type BuildableDef, type RecipeDef } from '@arx/content';
import { type VaultSort } from './vaultOrder.js';
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
export declare const STATION_FACE: Record<string, {
    label: string;
    icon: string | null;
    accent: string;
    verb: string;
    hint: string;
}>;
export declare const HANDIWORK_FACE: {
    label: string;
    icon: string | null;
    accent: string;
    verb: string;
    hint: string;
};
/** The station's face (label, icon, accent, verb) — the work card wears it too. */
export declare function craftStationFace(station: StationType | null): {
    label: string;
    icon: string | null;
    accent: string;
    verb: string;
    hint: string;
};
export declare class StationPanels {
    readonly onCraft: (recipe: string, qty: number) => void;
    readonly onBank: (op: 'deposit' | 'withdraw', item: string, qty: number, gearId?: number) => void;
    private readonly onShop;
    readonly onPickBuildable: (id: string) => void;
    /** THE UNMAKING: break the gear in this pack slot down for dust. */
    readonly onUnmake: (slot: number) => void;
    /** SUNDERING: draw the working out of this slot, keep the piece. */
    readonly onSunder: (slot: number, worn?: EquipSlot, seat?: 'ward' | 'art') => void;
    /** The live pack — feeds every have/need figure. */
    readonly getInventory: () => InvSlot[];
    /** The worn kit — the unmaking bench sunders straight off the body. */
    readonly getEquipment: () => Partial<Record<EquipSlot, EquippedItem>>;
    /** The character's skills — vault sockets judge equip gates live. */
    readonly getSkills: () => SkillXp;
    private readonly craftPanel;
    private readonly craftTitle;
    readonly craftTools: HTMLElement;
    readonly craftList: HTMLElement;
    readonly craftDetail: HTMLElement;
    private readonly bankPanel;
    readonly bankTools: HTMLElement;
    readonly bankList: HTMLElement;
    readonly bankArmory: HTMLElement;
    readonly bankDetail: HTMLElement;
    private readonly shopPanel;
    private readonly shopList;
    private readonly stablePanel;
    readonly stableList: HTMLElement;
    private readonly buildPanel;
    readonly buildTools: HTMLElement;
    readonly buildList: HTMLElement;
    readonly buildDetail: HTMLElement;
    /** How the Builder's Table ledger is ordered. */
    buildSort: 'reach' | 'level' | 'az';
    /** dressPanel handles for the Workshop head — set from main. */
    private craftDressHandles;
    lastBank: Record<string, number>;
    /** Rolled gear instances stored in the vault (withdraw by row id). */
    lastBankGear: Array<{
        id: number;
        item: string;
        roll: ItemRoll;
    }>;
    /** The vault's selected pile — the detail strip's subject. */
    bankSel: string | null;
    /** The vault's standing tab (armory shows only when gear hangs). */
    bankTab: 'armory' | 'all' | 'gear' | 'food' | 'mats';
    /** The reader's place in each paged ledger, kept across re-renders. */
    leafAt: Record<string, number>;
    /** How the vault wall is ordered — remembered across visits. */
    bankSort: VaultSort;
    /** How the Workshop ledger is ordered. */
    craftSort: 'reach' | 'level' | 'az';
    /**
     * THE UNMAKING's bench mode. The enchanting table does two opposite
     * jobs — it makes workings and it takes things apart — and they share
     * one screen because they are one trade and they feed each other.
     */
    craftMode: 'make' | 'unmake';
    /** The pack slot the unmaking bench is laying out (-1 = a worn piece). */
    unmakeSel: number | null;
    /** Set when the bench's subject is on the body instead of in the pack. */
    unmakeWorn: EquipSlot | undefined;
    /**
     * The slot the player has asked to break and not yet confirmed.
     * Destroying gear is irreversible, so it takes two presses and the
     * second one says what it is about to destroy.
     */
    unmakeArmed: number | null;
    /**
     * THE MARKED BATCH: pack slots set aside for one bulk breaking.
     * Each mark remembers the piece it named, so a pack that shifts
     * underneath drops the stale mark instead of breaking a stranger.
     */
    readonly unmakeMarked: Map<number, string>;
    /** The batch's own two-press confirm, held apart from the single's. */
    unmakeBatchArmed: boolean;
    /**
     * THE RECOVERED RIBBON: what the last breaking said it would pay.
     * Preview and payout are the same pure function, so the bench may
     * celebrate with its own figures — but only once the pack proves the
     * pieces really left (a refusal never earns a ribbon), and only for
     * a breath.
     */
    pendingBreak: {
        checks: Array<{
            index: number;
            item: string;
        }>;
        yields: Array<{
            item: string;
            qty: number;
        }>;
        count: number;
        at: number;
        /** The let-go clock is wound once, not once per re-render. */
        timed?: boolean;
    } | null;
    /** World tile center the open panel is bound to (null = untethered). */
    private anchor;
    /** Which shop's shelf is on screen — echoed on every buy. */
    private shopId;
    /** What the open maker screen is showing — refreshOpen re-renders it. */
    showing: {
        kind: 'craft';
        station: StationType | null;
        skills: SkillXp;
        known: ReadonlySet<string>;
        sel: string | null;
    } | {
        kind: 'plant';
        tx: number;
        ty: number;
        skills: SkillXp;
        sel: string | null;
        bed: 'tilled' | 'frame' | 'log';
    } | {
        kind: 'compost';
        tx: number;
        ty: number;
        sel: string | null;
    } | {
        kind: 'trough';
        tx: number;
        ty: number;
        sel: string | null;
    } | {
        kind: 'work';
        tx: number;
        ty: number;
        work: WorkStation;
        sel: string | null;
    } | {
        kind: 'build';
        skills: SkillXp;
        sel: string | null;
    } | null;
    constructor(onCraft: (recipe: string, qty: number) => void, onBank: (op: 'deposit' | 'withdraw', item: string, qty: number, gearId?: number) => void, onShop: (op: 'buy' | 'sell', item: string, qty: number, shop?: string) => void, onPickBuildable: (id: string) => void, 
    /** THE UNMAKING: break the gear in this pack slot down for dust. */
    onUnmake?: (slot: number) => void, 
    /** SUNDERING: draw the working out of this slot, keep the piece. */
    onSunder?: (slot: number, worn?: EquipSlot, seat?: 'ward' | 'art') => void, 
    /** The live pack — feeds every have/need figure. */
    getInventory?: () => InvSlot[], 
    /** The worn kit — the unmaking bench sunders straight off the body. */
    getEquipment?: () => Partial<Record<EquipSlot, EquippedItem>>, 
    /** The character's skills — vault sockets judge equip gates live. */
    getSkills?: () => SkillXp);
    /** Main hands over the Workshop head's dress handles once, at boot. */
    setCraftDress(handles: {
        setHint: (t: string) => void;
        setIcon: (u: string) => void;
    }): void;
    get bankOpen(): boolean;
    get stableOpen(): boolean;
    get shopOpen(): boolean;
    /**
     * THE COUNTER YOU STAND AT: which shelf is open, for the pack side of
     * the trade. Sales MUST name it — the server's reach gate looks for
     * that keeper, and an unnamed sale falls back to the general store's
     * counter tile, which no trainer or stallholder stands on. Null when
     * no shelf is up.
     */
    get openShopId(): string | null;
    get craftOpen(): boolean;
    get buildOpen(): boolean;
    get anyOpen(): boolean;
    /**
     * The open panel's anchor tile — the station being talked to. The
     * renderer heats that station's interaction choreography off this
     * (chest lid open, furnace stoked) for exactly as long as the
     * conversation lasts.
     */
    get anchorTile(): {
        tx: number;
        ty: number;
    } | null;
    closeAll(): void;
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
    private syncBodyClass;
    /** The household as last mirrored — openStable/refreshStable feed it. */
    lastPets: PetInfo[];
    /**
     * The slot the keeper has asked to release and not yet confirmed.
     * A bond is irreversible to break, so it takes two presses and the
     * second one says whose collar it is about to slip (the unmaking
     * bench's own arming discipline).
     */
    releaseArmed: number | null;
    /** THE THREE STALLS' acts — wired from main once at boot. */
    onStable: (op: 'heel' | 'stable' | 'release', slot: number) => void;
    onStableRename: (slot: number, current: string) => void;
    setStableHooks(onOp: (op: 'heel' | 'stable' | 'release', slot: number) => void, onRename: (slot: number, current: string) => void): void;
    openStable(at: {
        tx: number;
        ty: number;
    }, pets: PetInfo[]): void;
    /** The household mirror moved — re-render if the stalls are open. */
    refreshStable(pets: PetInfo[]): void;
    /**
     * Called every frame with the player's position: an anchored panel
     * closes once its station is out of reach (a little past the 2.2
     * interaction radius, so standing at the edge doesn't flicker it).
     */
    /** Dev-only (`?room=` audit lever): stand a room without a station. */
    releaseAnchor(): void;
    enforceAnchor(px: number, py: number): void;
    /** The pack changed — keep the open maker screen's figures honest. */
    refreshOpen(): void;
    /** Total of an item across the pack — the "have" in have/need. */
    private countOf;
    openBuild(skills: SkillXp, sel?: string | null): void;
    /** How many of a buildable the pack covers right now. */
    placeable(def: BuildableDef): number;
    /** The footing rule in world-words — where a piece agrees to stand. */
    footingWords(def: BuildableDef): string;
    /** Set by main: THE BULK BREAKING — the marked batch, as one send. */
    onUnmakeMany: ((slots: number[]) => void) | null;
    /** Set by main: sends the plant intent for a chosen seed. */
    onPlant: ((tx: number, ty: number, seed: string) => void) | null;
    /** Seed picker for a tilled plot: lists the seeds you carry. */
    openPlant(tx: number, ty: number, inventory: InvSlot[], skills: SkillXp, at?: {
        tx: number;
        ty: number;
    }, bed?: 'tilled' | 'frame' | 'log'): void;
    /** Dress the Workshop head for whoever owns it right now. */
    private dressCraft;
    /**
     * A row of sort chips — the ordering controls every list screen
     * shares. Chips are pad stops; the active one wears the gold.
     */
    sortBar<K extends string>(host: HTMLElement, scope: string, options: Array<[K, string]>, current: K, onPick: (key: K) => void, 
    /**
     * `label` renames the row (the enchanting table's bench switch is
     * not a sort). `keep` appends instead of replacing, so two rows can
     * share one tool strip — without it the second call silently wipes
     * the first, which is exactly the bug the bench mode hit.
     */
    opts?: {
        label?: string;
        keep?: boolean;
        next?: string;
    }): void;
    /**
     * One YIELD row — what an unmaking pays out. A gain, never a need:
     * materialRow's have/need framing painted a 5-dust payout as a red
     * "1 / 5" shortfall, which is the opposite of what is happening.
     */
    yieldRow(item: string, qty: number): HTMLElement;
    /** One material row in the Workshop detail: the full story of a need. */
    materialRow(item: string, need: number): HTMLElement;
    /** Set by main: feeds one pack slot's item into the bin. */
    onCompost: ((tx: number, ty: number, slot: number) => void) | null;
    /**
     * THE LIVING SOIL: the bin's deposit screen. Opens off the local
     * care mirror (the vault law — no server reply needed); every
     * deposit re-proves the tile server-side on its way in.
     */
    openCompost(tx: number, ty: number, at?: {
        tx: number;
        ty: number;
    }): void;
    /** Set by main: loads one pack slot's feed into the manger. */
    onTrough: ((tx: number, ty: number, slot: number) => void) | null;
    /** THE ANIMALS OF THE YARD: the manger's feed screen. */
    openTrough(tx: number, ty: number, at?: {
        tx: number;
        ty: number;
    }): void;
    /** Set by main: loads a wall-clock batch into a yard station. */
    onWork: ((tx: number, ty: number, recipe: string, qty: number) => void) | null;
    /** THE WORKING YARD: a station's load screen (the vault law). */
    openWork(tx: number, ty: number, work: WorkStation, at?: {
        tx: number;
        ty: number;
    }): void;
    /** Set by main: stops the running craft batch (the busy strip's Stop). */
    onCraftStop: (() => void) | null;
    /** Set by main: the live running action — feeds the busy strip. */
    getAction: () => {
        recipe?: string;
        made?: number;
        total?: number;
    } | null;
    openCraft(station: StationType | null, skills: SkillXp, known: ReadonlySet<string>, at?: {
        tx: number;
        ty: number;
    }, 
    /** Re-seat a remembered recipe (THE BENCH CALLS YOU BACK). */
    sel?: string | null): void;
    /**
     * The bench the open craft screen speaks for — station, chosen
     * recipe, anchor tile. THE BENCH CALLS YOU BACK reads this the
     * moment a batch starts (before closeAll wipes it), so a finished
     * batch can reopen the same bench on the same recipe.
     */
    get craftBench(): {
        station: StationType | null;
        sel: string | null;
        at: {
            tx: number;
            ty: number;
        } | null;
    } | null;
    /** How many of a recipe the pack can cover right now. */
    makeable(recipe: RecipeDef): number;
    /**
     * The Workshop: recipe ledger on the left — each row telling you at
     * a glance whether it's within reach — and the chosen work laid out
     * large on the right with the full material story and make buttons.
     */
    /** The enchanting table's two jobs, as one pair of chips. */
    modeBar(): void;
    /**
     * THE RECOVERED RIBBON — the bench's own answer to a breaking. The
     * preview and the payout are the same pure function, so the bench
     * may celebrate with its own figures; the pack is still asked to
     * prove the pieces left first, because a refusal (a hot piece, a
     * full pack) must never wear a celebration. Lives for a breath,
     * then lets itself go.
     */
    renderBreakRibbon(): void;
    craftRumor(all: readonly RecipeDef[], known: ReadonlySet<string>): string | null;
    openBank(items: Record<string, number>, at?: {
        tx: number;
        ty: number;
    }, gear?: Array<{
        id: number;
        item: string;
        roll: ItemRoll;
    }>): void;
    refreshBank(items: Record<string, number>, gear?: Array<{
        id: number;
        item: string;
        roll: ItemRoll;
    }>): void;
    /** The vault's shelving law: what family a stored good belongs to. */
    familyOf(item: string): 'gear' | 'food' | 'mats';
    /**
     * Deal prebuilt rows into a paged ledger — NOTHING LIVES BELOW THE
     * FOLD for every maker's list. The reader's place survives the
     * wholesale re-renders the pack mirror forces.
     */
    dealIntoLedger(host: HTMLElement, key: string, rows: HTMLElement[], seedRows: number, emptyLine?: string): void;
    /**
     * The Store (Grand Refit Ph5): goods shelved as PLATES — portrait,
     * name, an honest coin tag. THE VERB COMES TO THE HAND: pressing a
     * shelf buys one; Ⓨ or right-click offers Buy one / Buy five on
     * the sheet. Your pack stands beside the counter; tap items there
     * to sell them. Standing pricing is told once, on the hint line.
     */
    openShop(shopId?: string, at?: {
        tx: number;
        ty: number;
    }, priceMult?: number): void;
}
//# sourceMappingURL=stationPanels.d.ts.map