/**
 * The HUD's bespoke chrome, painted in code at boot: a woven linen
 * texture tile and an ornate gold 9-slice frame. Both land in CSS
 * custom properties (`--tex-linen`, `--ui-frame`) so the stylesheet
 * dresses every panel in real art instead of flat borders — no image
 * assets, no network, crisp at any DPI.
 */
/** Display-space border width the frame is designed for (CSS px). */
export declare const FRAME_BORDER = 22;
/** 9-slice inset in source pixels. */
export declare const FRAME_SLICE: number;
/** Paint the chrome and hand it to the stylesheet. Call once at boot. */
export declare function installChrome(): void;
//# sourceMappingURL=chrome.d.ts.map