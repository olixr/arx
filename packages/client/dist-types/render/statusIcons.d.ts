/**
 * THE ICON IS THE PAINTER, FOR STATES TOO (statusBook Phase 4).
 * Twelve status glyphs, one per page, each ONE SUBJECT in the page's
 * own ink (STATUS_INK — which derives from the book, so a page's
 * color and its glyph can never drift apart). Painters draw DIRECT
 * into a live 2D context inside a (x, y, size) box — the wound row
 * and any canvas HUD read them per-frame with no async image round
 * trip — and `statusIconUrl` bakes the same painter through the
 * shared outlined-sprite pipeline for DOM surfaces (chips, tooltips,
 * the codex) the day they ask.
 *
 * Grammar (THE PLATE LAW at thumbnail scale): hard edges, solid
 * masses over wire, a single dominant silhouette per glyph, the ink
 * at full alpha with one darker facet tone — readable at 12 px, the
 * wound row's floor.
 */
import { type StatusId } from '@arx/shared';
type Ctx = CanvasRenderingContext2D;
/** One glyph painter: draws inside the (x, y, s) box, s = side. */
export type StatusGlyph = (ctx: Ctx, x: number, y: number, s: number) => void;
export declare const STATUS_GLYPHS: Readonly<Record<StatusId, StatusGlyph>>;
/**
 * Draw one status glyph into a live context, plate-and-ink: the dark
 * inset plate the nameplate blocks already wear, then the glyph.
 */
export declare function drawStatusGlyph(ctx: Ctx, id: StatusId, x: number, y: number, size: number): void;
/**
 * The DOM door: the same painter baked through the shared outlined
 * sprite pipeline (chips, tooltips, codex). Painters take the 0..1
 * unit box the pipeline expects.
 */
export declare function statusIconUrl(id: StatusId, size?: number): string;
export {};
//# sourceMappingURL=statusIcons.d.ts.map