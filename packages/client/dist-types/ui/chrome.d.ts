/**
 * The HUD's chrome, painted in code at boot — v2, THE FLAT SLATE.
 *
 * Design laws (the whole HUD obeys these):
 * - CUT FROM THE WORLD'S CLOTH. The panel field is the game's dusk-ink
 *   family, the accents are its gold — flat fills only. No gloss, no
 *   bevels, no woven texture: the world is flat vector shapes with hard
 *   shadows, and so is its interface.
 * - THE CHAMFER IS THE SIGNATURE. Panels are chamfered blocks exactly
 *   like the game's `chamferRect` primitive — 45° corner cuts, drawn
 *   here once and 9-sliced by CSS border-image. Small interactive
 *   elements soften to a 4px radius; big architecture stays sharp.
 * - SHADOWS ARE SHAPES. A panel throws one hard offset drop-shadow of
 *   its true silhouette (chamfers included) — never a blur.
 *
 * Everything lands in CSS custom properties (`--ui-frame`,
 * `--frame-border`, `--frame-slice`) so the stylesheet dresses every
 * panel from one source of truth — no image assets, crisp at any DPI.
 */
/** Display-space border width the frame is designed for (CSS px). */
export declare const FRAME_BORDER = 14;
/** 9-slice inset in source pixels. */
export declare const FRAME_SLICE: number;
/** The one panel field color — the stylesheet's --panel must match. */
export declare const PANEL_FILL = "#201936";
/** Paint the chrome and hand it to the stylesheet. Call once at boot. */
export declare function installChrome(): void;
//# sourceMappingURL=chrome.d.ts.map