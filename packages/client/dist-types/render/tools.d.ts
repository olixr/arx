/**
 * The gatherer's roster: every axe, pickaxe, and rod resolves a style
 * — bespoke head silhouette, haft furniture, collar lashing, and (for
 * starsteel) a living fx channel — exactly the SwordStyle law. One
 * painter dresses the working hand AND the pack icon, so a tool in
 * the world and its glyph in the pack are the same object.
 *
 * Draw space: hand at the origin, +x toward the business end, the
 * haft lying along the x axis. `s` is body scale, the same unit every
 * weapon painter thinks in. The head mounts ACROSS the haft the way
 * heads mount — bit/spurs spanning −y, the honed edge facing away
 * from the wielder — so a downward chop leads with the edge.
 */
export type ToolKind = 'axe' | 'pickaxe' | 'rod';
export interface ToolStyle {
    kind: ToolKind;
    /** Head metal. Edge defaults to shade(+34), cheek to shade(−22). */
    color: string;
    edge?: string;
    cheek?: string;
    /** Haft wood + its grain line. */
    haft: string;
    haftDark?: string;
    /** Eye collar where the head grips the haft, and its lash strokes. */
    collar: string;
    lash?: string;
    /** Butt cap on the haft's near end — the high-ladder flourish. */
    butt?: string;
    /** Grip wrap bands near the hand. */
    wrap?: string;
    /** Rivet/stud accent on the cheek. */
    stud?: string;
    /** Head size multiplier — the ladder swells as the metal climbs. */
    headScale?: number;
    /** The living channel: starsteel hums. */
    fx?: 'star';
    fxColor?: string;
}
/**
 * Palette law: each metal tier speaks the SAME identity colors its
 * sword line and ore deposit speak — bronze warm, iron gunmetal,
 * steel bright, mithril sky, adamant deep green, starsteel violet
 * (the only tier that earns an fx). Furniture climbs with the tier:
 * bronze is lashed leather on plain wood; steel earns a butt cap and
 * wrap; the high ladder carves and studs.
 */
export declare const TOOL_STYLES: Record<string, ToolStyle>;
/** Resolve a tool style; unknown '*_axe'/'*_pickaxe' ids get a color-
 * derived fallback so a new ladder rung never renders as nothing. */
export declare function toolStyle(itemId: string | undefined, color?: string): ToolStyle | null;
export declare function drawTool(ctx: CanvasRenderingContext2D, st: ToolStyle, s: number, nowMs: number, hurt?: boolean): void;
//# sourceMappingURL=tools.d.ts.map