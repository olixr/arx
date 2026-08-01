export declare class PetNamingCard {
    private root;
    /** Gates the game's keymap while the pen is up (main.ts typing check). */
    get isTyping(): boolean;
    open(slot: number, currentName: string, submit: (name: string) => void): void;
    close(): void;
}
//# sourceMappingURL=petNaming.d.ts.map