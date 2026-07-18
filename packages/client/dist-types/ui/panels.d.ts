import { type EquipSlot, type InvSlot, type SkillXp } from '@devcraft/shared';
/** Inventory + skills side panels (DOM overlay UI). */
export declare class Panels {
    private readonly onUseSlot;
    private readonly onUnequip;
    private readonly onTechnique;
    private readonly onInvMove;
    private readonly onDropToWorld;
    private readonly invPanel;
    private readonly invGrid;
    private readonly equipRow;
    private readonly skillsPanel;
    private readonly skillsList;
    /** The chosen technique per style, mirrored from the server. */
    private techniques;
    private lastSkills;
    private drag;
    constructor(onUseSlot: (slot: number) => void, onUnequip: (slot: EquipSlot) => void, onTechnique?: (style: string, ability: string) => void, onInvMove?: (from: number, to: number) => void, onDropToWorld?: (slot: number) => void);
    toggleInventory(): void;
    showInventory(): void;
    toggleSkills(): void;
    closeAll(): void;
    get anyOpen(): boolean;
    private dragMove;
    /** True when the pointer floats over the game canvas, not any UI. */
    private overWorld;
    private dragEnd;
    private slotUnder;
    renderInventory(slots: InvSlot[]): void;
    renderEquipment(equipment: Partial<Record<string, string>>): void;
    /** Server-confirmed technique choices; re-renders the picker. */
    setTechniques(chosen: Record<string, string>): void;
    renderSkills(xp: SkillXp): void;
}
//# sourceMappingURL=panels.d.ts.map