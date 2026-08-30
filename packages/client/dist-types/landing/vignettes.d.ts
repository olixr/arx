interface Voice {
    id: string;
    name: string;
    core: string;
    mid: string;
    deep: string;
    glow: string;
    pts: number;
    jag: number;
    speed: number;
    dash?: boolean;
    star?: boolean;
    bolt?: boolean;
}
/** The FX family palettes, straight from abilityFx.ts. */
export declare const VOICES: Voice[];
/** Reduced-motion mode: every stage paints once and holds. */
export declare function setVignettesReduced(v: boolean): void;
/** One school's sigil: a seeded ring turning on the ground plane. */
export declare function initSchoolChip(canvas: HTMLCanvasElement, voiceId: string): void;
/**
 * THE RIFTGATE — keys turn, places answer. A rift-cut key floating in
 * its arcane ring; the vignette for the Long Dark section.
 */
export declare function initRiftgate(canvas: HTMLCanvasElement): void;
/** THE DREAD CROWN — the world learns to crown its foes. */
export declare function initCrown(canvas: HTMLCanvasElement): void;
export {};
//# sourceMappingURL=vignettes.d.ts.map