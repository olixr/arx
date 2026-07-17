import { type SkillXp, type StationType } from '@devcraft/shared';
/**
 * Craft / bank / shop panels. Opened by interacting with the matching
 * world tile; every action is validated server-side — these are views.
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
    constructor(onCraft: (recipe: string, qty: number) => void, onBank: (op: 'deposit' | 'withdraw', item: string, qty: number) => void, onShop: (op: 'buy' | 'sell', item: string, qty: number) => void, onPickBuildable: (id: string) => void);
    get bankOpen(): boolean;
    get shopOpen(): boolean;
    closeAll(): void;
    openBuild(skills: SkillXp): void;
    openCraft(station: StationType | null, skills: SkillXp): void;
    openBank(items: Record<string, number>): void;
    refreshBank(items: Record<string, number>): void;
    private renderBank;
    openShop(): void;
}
//# sourceMappingURL=stationPanels.d.ts.map