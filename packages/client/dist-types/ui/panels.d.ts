import { type EquipSlot, type InvSlot, type SkillXp } from '@devcraft/shared';
/** Inventory + skills side panels (DOM overlay UI). */
export declare class Panels {
    private readonly onUseSlot;
    private readonly onUnequip;
    private readonly invPanel;
    private readonly invGrid;
    private readonly equipRow;
    private readonly skillsPanel;
    private readonly skillsList;
    constructor(onUseSlot: (slot: number) => void, onUnequip: (slot: EquipSlot) => void);
    toggleInventory(): void;
    showInventory(): void;
    toggleSkills(): void;
    renderInventory(slots: InvSlot[]): void;
    renderEquipment(equipment: Partial<Record<string, string>>): void;
    renderSkills(xp: SkillXp): void;
}
//# sourceMappingURL=panels.d.ts.map