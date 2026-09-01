/**
 * Tint math shared by every painter. Lives alone so leaf modules (fxSigs
 * rosters, armor, species files) don't have to import the whole rig engine
 * for one color helper.
 */
/** Darken/lighten a hex color by a flat amount — flat-art shading. */
export declare function shade(hex: string, amount: number): string;
//# sourceMappingURL=tint.d.ts.map