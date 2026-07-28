import { type InvSlot, type ItemRoll, type SkillXp, type StationType } from '@arx/shared';
export declare class StationPanels {
    private readonly onCraft;
    private readonly onBank;
    private readonly onShop;
    private readonly onPickBuildable;
    /** The live pack — feeds every have/need figure. */
    private readonly getInventory;
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
    private readonly buildPanel;
    private readonly buildList;
    /** dressPanel handles for the Workshop head — set from main. */
    private craftDressHandles;
    private lastBank;
    /** Rolled gear instances stored in the vault (withdraw by row id). */
    private lastBankGear;
    /** The vault's selected pile — the detail strip's subject. */
    private bankSel;
    /** How the vault wall is ordered. */
    private bankSort;
    /** How the Workshop ledger is ordered. */
    private craftSort;
    /** World tile center the open panel is bound to (null = untethered). */
    private anchor;
    /** Which shop's shelf is on screen — echoed on every buy. */
    private shopId;
    /** What the open maker screen is showing — refreshOpen re-renders it. */
    private showing;
    constructor(onCraft: (recipe: string, qty: number) => void, onBank: (op: 'deposit' | 'withdraw', item: string, qty: number, gearId?: number) => void, onShop: (op: 'buy' | 'sell', item: string, qty: number, shop?: string) => void, onPickBuildable: (id: string) => void, 
    /** The live pack — feeds every have/need figure. */
    getInventory?: () => InvSlot[]);
    /** Main hands over the Workshop head's dress handles once, at boot. */
    setCraftDress(handles: {
        setHint: (t: string) => void;
        setIcon: (u: string) => void;
    }): void;
    get bankOpen(): boolean;
    get shopOpen(): boolean;
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
     * Called every frame with the player's position: an anchored panel
     * closes once its station is out of reach (a little past the 2.2
     * interaction radius, so standing at the edge doesn't flicker it).
     */
    enforceAnchor(px: number, py: number): void;
    /** The pack changed — keep the open maker screen's figures honest. */
    refreshOpen(): void;
    /** Total of an item across the pack — the "have" in have/need. */
    private countOf;
    openBuild(skills: SkillXp): void;
    /**
     * The Builder's Table: every blueprint is a CARD laid on the table —
     * portrait, name, the level it asks, the material story, and one
     * Place button. Locked plans stay visible; ambition needs a map.
     */
    private renderBuild;
    /** Set by main: sends the plant intent for a chosen seed. */
    onPlant: ((tx: number, ty: number, seed: string) => void) | null;
    /** Seed picker for a tilled plot: lists the seeds you carry. */
    openPlant(tx: number, ty: number, inventory: InvSlot[], skills: SkillXp, at?: {
        tx: number;
        ty: number;
    }): void;
    /** Dress the Workshop head for whoever owns it right now. */
    private dressCraft;
    /**
     * A row of sort chips — the ordering controls every list screen
     * shares. Chips are pad stops; the active one wears the gold.
     */
    private sortBar;
    /** One ledger row (Workshop master list). */
    private ledgerRow;
    /** One material row in the Workshop detail: the full story of a need. */
    private materialRow;
    private renderPlant;
    openCraft(station: StationType | null, skills: SkillXp, known: ReadonlySet<string>, at?: {
        tx: number;
        ty: number;
    }): void;
    /** How many of a recipe the pack can cover right now. */
    private makeable;
    /**
     * The Workshop: recipe ledger on the left — each row telling you at
     * a glance whether it's within reach — and the chosen work laid out
     * large on the right with the full material story and make buttons.
     */
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
    /**
     * The Vault: stored goods as a WALL OF SOCKETS you read like your
     * own pack — pick a pile and the counter beneath offers Take 1/5/
     * All. Rolled gear hangs apart on the armory rack, tinted by tier,
     * each piece taken back with one press. Hover or focus any socket
     * for the full item card, exactly like the pack.
     */
    private renderBank;
    /**
     * The Store: goods SHELVED in a grid — big portrait, name, an honest
     * coin price tag, and the buy buttons right on the shelf. Your pack
     * stands beside the counter; tap items there to sell them.
     */
    openShop(shopId?: string, at?: {
        tx: number;
        ty: number;
    }): void;
}
//# sourceMappingURL=stationPanels.d.ts.map