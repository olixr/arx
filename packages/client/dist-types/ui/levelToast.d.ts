interface LevelShow {
    name: string;
    level: number;
    icon: string;
    color: string;
    /** One quiet line under the name — what the craft IS. */
    story?: string;
}
export declare function showLevelUp(o: LevelShow): void;
/** Clear the current card AND the waiting line (scene changes). */
export declare function dismissLevelUp(): void;
export {};
//# sourceMappingURL=levelToast.d.ts.map