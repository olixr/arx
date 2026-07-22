/**
 * The HUD's chrome, painted in code at boot — v4, THE EXPEDITION CASE.
 *
 * The interface is no longer styled boxes: it is a KIT of painted
 * artifacts, drawn here by the same flat-facet hand that paints the
 * world, and handed to the stylesheet as 9-slice images. Materials:
 *
 * - IRON   — the structure. Case frames, console trays, key buttons:
 *            riveted dark bands with one hard lit facet.
 * - BRASS  — the touchable. Action buttons, corner brackets, crests,
 *            fillet lines: warm metal that says "press me".
 * - OAK/LEATHER — the field. Panel interiors are the dark oiled case
 *            bottom everything else sits in.
 * - PARCHMENT — the documents. Blueprint sheets and title banners.
 *
 * Design laws:
 * - FLAT FACETS ONLY. Every material is 2–3 flat tones meeting on a
 *   hard line — no gradients, no blur, exactly like the world's art.
 * - THE CHAMFER IS THE SIGNATURE. Outer silhouettes wear 45° corner
 *   cuts; sockets and buttons carry the same cut baked into their art.
 * - RIVETS ARE STRUCTURE, NOT NOISE. They sit on the iron band at a
 *   fixed rhythm (border-image-repeat: round keeps them honest).
 *
 * Everything lands in CSS custom properties so the stylesheet dresses
 * every element from one source of truth — no image assets, crisp at
 * any DPI.
 */
/** The case-bottom field color — the stylesheet's --panel must match. */
export declare const PANEL_FILL = "#262019";
/** Display-space border width of the grand case frame. */
export declare const FRAME_BORDER = 24;
export declare const FRAME_SLICE: number;
/** Lighter tray frame (loot tray, cards, menus, prompts). */
export declare const TRAY_BORDER = 12;
export declare const TRAY_SLICE: number;
/** The parchment's ink color, exported for the stylesheet. */
export declare const SHEET_INK: string;
/** Paint the kit and hand it to the stylesheet. Call once at boot. */
export declare function installChrome(): void;
//# sourceMappingURL=chrome.d.ts.map