import { type EquippedItem, type EquipSlot, type InvSlot, type ItemRoll, type PetInfo, type SkillXp, type StationType } from '@arx/shared';
import { type WorkStation } from '@arx/content';
/** The station's face (label, icon, accent, verb) — the work card wears it too. */
export declare function craftStationFace(station: StationType | null): {
    label: string;
    icon: string | null;
    accent: string;
    verb: string;
    hint: string;
};
export declare class StationPanels {
    private readonly onCraft;
    private readonly onBank;
    private readonly onShop;
    private readonly onPickBuildable;
    /** THE UNMAKING: break the gear in this pack slot down for dust. */
    private readonly onUnmake;
    /** SUNDERING: draw the working out of this slot, keep the piece. */
    private readonly onSunder;
    /** The live pack — feeds every have/need figure. */
    private readonly getInventory;
    /** The worn kit — the unmaking bench sunders straight off the body. */
    private readonly getEquipment;
    private readonly craftPanel;
    private readonly craftTitle;
    private readonly craftTools;
    private readonly craftList;
    private readonly craftDetail;
    private readonly bankPanel;
    private readonly bankTools;
    private readonly bankList;
    private readonly bankArmory;
    private readonly bankDetail;
    private readonly shopPanel;
    private readonly shopList;
    private readonly stablePanel;
    private readonly stableList;
    private readonly buildPanel;
    private readonly buildTools;
    private readonly buildList;
    private readonly buildDetail;
    /** How the Builder's Table ledger is ordered. */
    private buildSort;
    /** dressPanel handles for the Workshop head — set from main. */
    private craftDressHandles;
    private lastBank;
    /** Rolled gear instances stored in the vault (withdraw by row id). */
    private lastBankGear;
    /** The vault's selected pile — the detail strip's subject. */
    private bankSel;
    /** The vault's standing tab (armory shows only when gear hangs). */
    private bankTab;
    /** The reader's place in each paged ledger, kept across re-renders. */
    private leafAt;
    /** How the vault wall is ordered — remembered across visits. */
    private bankSort;
    /** How the Workshop ledger is ordered. */
    private craftSort;
    /**
     * THE UNMAKING's bench mode. The enchanting table does two opposite
     * jobs — it makes workings and it takes things apart — and they share
     * one screen because they are one trade and they feed each other.
     */
    private craftMode;
    /** The pack slot the unmaking bench is laying out (-1 = a worn piece). */
    private unmakeSel;
    /** Set when the bench's subject is on the body instead of in the pack. */
    private unmakeWorn;
    /**
     * The slot the player has asked to break and not yet confirmed.
     * Destroying gear is irreversible, so it takes two presses and the
     * second one says what it is about to destroy.
     */
    private unmakeArmed;
    /** World tile center the open panel is bound to (null = untethered). */
    private anchor;
    /** Which shop's shelf is on screen — echoed on every buy. */
    private shopId;
    /** What the open maker screen is showing — refreshOpen re-renders it. */
    private showing;
    constructor(onCraft: (recipe: string, qty: number) => void, onBank: (op: 'deposit' | 'withdraw', item: string, qty: number, gearId?: number) => void, onShop: (op: 'buy' | 'sell', item: string, qty: number, shop?: string) => void, onPickBuildable: (id: string) => void, 
    /** THE UNMAKING: break the gear in this pack slot down for dust. */
    onUnmake?: (slot: number) => void, 
    /** SUNDERING: draw the working out of this slot, keep the piece. */
    onSunder?: (slot: number, worn?: EquipSlot, seat?: 'ward' | 'art') => void, 
    /** The live pack — feeds every have/need figure. */
    getInventory?: () => InvSlot[], 
    /** The worn kit — the unmaking bench sunders straight off the body. */
    getEquipment?: () => Partial<Record<EquipSlot, EquippedItem>>);
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
    private lastPets;
    /**
     * The slot the keeper has asked to release and not yet confirmed.
     * A bond is irreversible to break, so it takes two presses and the
     * second one says whose collar it is about to slip (the unmaking
     * bench's own arming discipline).
     */
    private releaseArmed;
    /** THE THREE STALLS' acts — wired from main once at boot. */
    private onStable;
    private onStableRename;
    setStableHooks(onOp: (op: 'heel' | 'stable' | 'release', slot: number) => void, onRename: (slot: number, current: string) => void): void;
    openStable(at: {
        tx: number;
        ty: number;
    }, pets: PetInfo[]): void;
    /** The household mirror moved — re-render if the stalls are open. */
    refreshStable(pets: PetInfo[]): void;
    private renderStable;
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
    private placeable;
    /** The footing rule in world-words — where a piece agrees to stand. */
    private footingWords;
    /**
     * The Builder's Table on the Workshop anatomy (LEDGER LEFT, WORK
     * RIGHT): blueprints shelved by category with an in-reach sort, and
     * the chosen piece laid out large — costs against the pack, build
     * time, footing in world-words, the dial note for corners, and one
     * Place button. Locked plans stay visible; ambition needs a map.
     */
    private renderBuild;
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
    private sortBar;
    /** One ledger row (Workshop master list). A string `iconUrl` sets
     * the portrait synchronously; a function fills it through the
     * BUDGETED LANE (icons.ts) so a first-open burst never hitches. */
    private ledgerRow;
    /** One material row in the Workshop detail: the full story of a need. */
    private materialRow;
    private renderPlant;
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
    private renderCompost;
    /** Set by main: loads one pack slot's feed into the manger. */
    onTrough: ((tx: number, ty: number, slot: number) => void) | null;
    /** THE ANIMALS OF THE YARD: the manger's feed screen. */
    openTrough(tx: number, ty: number, at?: {
        tx: number;
        ty: number;
    }): void;
    private renderTrough;
    /** Set by main: loads a wall-clock batch into a yard station. */
    onWork: ((tx: number, ty: number, recipe: string, qty: number) => void) | null;
    /** THE WORKING YARD: a station's load screen (the vault law). */
    openWork(tx: number, ty: number, work: WorkStation, at?: {
        tx: number;
        ty: number;
    }): void;
    private renderWork;
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
    private makeable;
    /**
     * The Workshop: recipe ledger on the left — each row telling you at
     * a glance whether it's within reach — and the chosen work laid out
     * large on the right with the full material story and make buttons.
     */
    /** The enchanting table's two jobs, as one pair of chips. */
    private modeBar;
    /**
     * THE UNMAKING bench: the pack, filtered to what has Arx in it, and
     * an honest account of what each piece comes apart into.
     *
     * The yield is computed by the SAME pure function the server pays
     * out from, so the preview and the payout can never disagree. On a
     * destructive action that would be the worst bug in the system.
     */
    private renderUnmake;
    private craftRumor;
    private renderCraft;
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
    private familyOf;
    /**
     * Deal prebuilt rows into a paged ledger — NOTHING LIVES BELOW THE
     * FOLD for every maker's list. The reader's place survives the
     * wholesale re-renders the pack mirror forces.
     */
    private dealIntoLedger;
    /** One vault socket — goods pile or rolled armory piece. */
    private vaultCell;
    /**
     * The Vault (Grand Refit Ph5): stored goods dealt onto paged
     * LEAVES of sockets — family tabs shelve them, the armory hangs on
     * its own tab when rolled gear exists, and nothing hides behind a
     * scrollbar. Pick a pile and the counter beneath offers Take 1/5/
     * All. Hover or focus any socket for the full item card.
     */
    private renderBank;
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