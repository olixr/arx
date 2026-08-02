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