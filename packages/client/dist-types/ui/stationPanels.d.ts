import { type InvSlot, type ItemRoll, type SkillXp, type StationType } from '@devcraft/shared';
/**
 * Craft / bank / shop / build panels. Opened by interacting with the
 * matching world tile; every action is validated server-side — these
 * are views.
 *
 * Design laws:
 * - EVERY RECIPE IS A CARD. Output portrait, name, level badge, then
 *   the material story as have/need chips — green when your pack
 *   covers it, ember when short. No more mystery ingredient prose.
 * - COUNTS ARE LIVE. The pack feeds the chips through `getInventory`;
 *   `refreshOpen` re-renders the open maker panel whenever the pack
 *   changes, so crafting five arrows watches the feather chip fall.
 *   Focus survives the re-render by nav key (the pad law).
 * - A world-anchored panel (bank chest, station, shop counter) belongs
 *   to its tile: walk out of reach and it closes itself, exactly when
 *   the server would start refusing its actions. Every panel also
 *   closes from its ✕ chip and from clicking the world.
 */
export declare class StationPanels {
    private readonly onCraft;
    private readonly onBank;
    private readonly onShop;
    private readonly onPickBuildable;
    /** The live pack — feeds every have/need chip. */
    private readonly getInventory;
    private readonly craftPanel;
    private readonly craftTitle;
    private readonly craftList;
    private readonly bankPanel;
    private readonly bankList;
    private readonly shopPanel;
    private readonly shopList;
    private readonly buildPanel;
    private readonly buildList;
    private lastBank;
    /** Rolled gear instances stored in the vault (withdraw by row id). */
    private lastBankGear;
    /** World tile center the open panel is bound to (null = untethered). */
    private anchor;
    /** What the open maker panel is showing — refreshOpen re-renders it. */
    private showing;
    constructor(onCraft: (recipe: string, qty: number) => void, onBank: (op: 'deposit' | 'withdraw', item: string, qty: number, gearId?: number) => void, onShop: (op: 'buy' | 'sell', item: string, qty: number) => void, onPickBuildable: (id: string) => void, 
    /** The live pack — feeds every have/need chip. */
    getInventory?: () => InvSlot[]);
    get bankOpen(): boolean;
    get shopOpen(): boolean;
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
    /** The pack changed — keep the open maker panel's chips honest. */
    refreshOpen(): void;
    /** Total of an item across the pack — the "have" in have/need. */
    private countOf;
    /** The card every maker row shares: portrait · name+badge · chips. */
    private makeCard;
    private static actionsOf;
    openBuild(skills: SkillXp): void;
    private renderBuild;
    /** Set by main: sends the plant intent for a chosen seed. */
    onPlant: ((tx: number, ty: number, seed: string) => void) | null;
    /** Seed picker for a tilled plot: lists the seeds you carry. */
    openPlant(tx: number, ty: number, inventory: InvSlot[], skills: SkillXp, at?: {
        tx: number;
        ty: number;
    }): void;
    private renderPlant;
    openCraft(station: StationType | null, skills: SkillXp, at?: {
        tx: number;
        ty: number;
    }): void;
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
    private renderBank;
    openShop(at?: {
        tx: number;
        ty: number;
    }): void;
}
//# sourceMappingURL=stationPanels.d.ts.map