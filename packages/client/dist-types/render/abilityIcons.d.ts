export interface PlateAudit {
    id: string;
    /** Ink share of the optical box AFTER fitting, 0..1. */
    coverage: number;
    /** Alpha-weighted mean luminance of the ink, 0..1 — the dark-on-dark flag. */
    luminance: number;
    /** Disconnected ink islands (8-connected, small specks ignored) — the scatter flag. */
    fragments: number;
    /** Ink share lost to a one-pixel erode at analysis scale — the thin-line flag. */
    thinness: number;
    /** Fit scale that was needed — far from 1 means the raw plate missed the grid. */
    fitScale: number;
}
/**
 * Measure every bespoke plate through the fitting pass and report the
 * numbers the eye argues about: coverage, luminance, fragmentation,
 * stroke thinness. Dev-only (the gallery and the console call it); this
 * is the ranked worklist for bespoke recuts, so a judgment is a number
 * before it is a feeling.
 */
export declare function auditAbilityPlates(): PlateAudit[];
/** Data URL for an ability's spell-plate at `size`. */
export declare function abilityIconUrl(id: string, size?: number): string;
/**
 * Fill `el` with an ability spell-plate through the BUDGETED LANE
 * (see icons.ts): cached plates apply synchronously, cold ones bake at
 * ~3ms per frame. For burst sites only (the codex's per-technique
 * grid) — single-plate sites keep calling `abilityIconUrl` so the
 * focused art never flashes empty.
 */
export declare function queueAbilityIcon(el: HTMLImageElement | HTMLElement, id: string, size?: number): void;
/** Data URL for a gear passive's chip icon. */
export declare function passiveIconUrl(id: string, size?: number): string;
/** Every ability id with a bespoke plate — the dev gallery walks this. */
export declare function allAbilityIconIds(): string[];
/** Every passive id — the dev gallery walks this. */
export declare function allPassiveIconIds(): string[];
//# sourceMappingURL=abilityIcons.d.ts.map