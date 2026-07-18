import { type SkillXp, type StationType } from '@devcraft/shared';
/**
 * Craft / bank / shop panels. Opened by interacting with the matching
 * world tile; every action is validated server-side — these are views.
 *
 * A world-anchored panel (bank chest, station, shop counter) belongs
 * to its tile: walk out of reach and it closes itself, exactly when
 * the server would start refusing its actions — a panel must never
 * outlive the interaction it fronts. Every panel also closes from a
 * ✕ button and from clicking the world.
 */
export declare class StationPanels {
    private readonly onCraft;
    private readonly onBank;
    private readonly onShop;
    private readonly onPickBuildable;
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
    /** World tile center the open panel is bound to (null = untethered). */
    private anchor;
    constructor(onCraft: (recipe: string, qty: number) => void, onBank: (op: 'deposit' | 'withdraw', item: string, qty: number) => void, onShop: (op: 'buy' | 'sell', item: string, qty: number) => void, onPickBuildable: (id: string) => void);
    get bankOpen(): boolean;
    get shopOpen(): boolean;
    get anyOpen(): boolean;
    closeAll(): void;
    /**
     * Called every frame with the player's position: an anchored panel
     * closes once its station is out of reach (a little past the 2.2
     * interaction radius, so standing at the edge doesn't flicker it).
     */
    enforceAnchor(px: number, py: number): void;
    openBuild(skills: SkillXp): void;
    openCraft(station: StationType | null, skills: SkillXp, at?: {
        tx: number;
        ty: number;
    }): void;
    openBank(items: Record<string, number>, at?: {
        tx: number;
        ty: number;
    }): void;
    refreshBank(items: Record<string, number>): void;
    private renderBank;
    openShop(at?: {
        tx: number;
        ty: number;
    }): void;
}
//# sourceMappingURL=stationPanels.d.ts.map