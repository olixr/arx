import { type BodyStyle, type BootStyle, type GloveStyle, type HelmStyle, type LegStyle, type OffhandStyle } from './armor.js';
/**
 * Equipment product shots: every armor icon renders FROM the same
 * style record that dresses the rig — the piece in the pack is the
 * piece on the body, zero art drift. Helms and torsos go through the
 * actual world painters (drawHelmet / drawTorsoGarment + pauldrons)
 * on a synthetic mannequin frame; legs, boots, gloves and shields get
 * bespoke product-shot painters that consume the style fields, since
 * their world painters are woven through the limb solvers.
 *
 * All painters draw inside the 0..1 unit box (the icon pipeline adds
 * the outline-shader ring, shadow, and supersampling).
 */
type Painter = (ctx: CanvasRenderingContext2D) => void;
export declare function helmIconPainter(st: HelmStyle): Painter;
export declare function bodyIconPainter(st: BodyStyle): Painter;
export declare function legsIconPainter(st: LegStyle, fallback: string, id?: string): Painter;
export declare function bootsIconPainter(st: BootStyle): Painter;
export declare function glovesIconPainter(st: GloveStyle): Painter;
/**
 * THE PRODUCT SHOT IS THE WORLD ART. A shield icon is the same painter
 * the body wears, turned three-quarters on and lit by the same sun —
 * so what a player studies in the pack is exactly what they see on
 * their own arm. Nothing here is re-authored.
 *
 * Shields only: the caller gates tomes, orbs and quivers out to their
 * own bespoke object painters before ever reaching this.
 */
export declare function offhandIconPainter(st: OffhandStyle, id?: string): Painter;
export {};
//# sourceMappingURL=armorIcons.d.ts.map