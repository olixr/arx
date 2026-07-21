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
export const FRAME_BORDER = 14;
/** Source-space pixels per display pixel — drawn oversized for retina. */
const K = 5;
/** 9-slice inset in source pixels. */
export const FRAME_SLICE = FRAME_BORDER * K;

/** The one panel field color — the stylesheet's --panel must match. */
export const PANEL_FILL = '#201936';
/** Corner cut size in display px (mirrors the game's chamferRect). */
const CHAMFER = 11;

/**
 * The flat chamfered frame, drawn once and 9-sliced by border-image:
 * near-black rim, one clean gold line, flat ink field flooding inward
 * to merge seamlessly with the panel background, a quiet engraved echo
 * line, and a single diamond stud on each corner cut. Edge runs are
 * uniform so border-image stretching is invisible.
 */
function frameArt(): string {
  const S = Math.round(FRAME_SLICE * 3.2); // corners + stretchable middle
  const c = document.createElement('canvas');
  c.width = S;
  c.height = S;
  const ctx = c.getContext('2d')!;
  const px = (v: number): number => v * K;

  /** Chamfered-rect path inset by `d` display px from the canvas edge. */
  const chamferPath = (d: number): void => {
    const a = px(d);
    const ch = px(CHAMFER) - a * 0.35; // cuts converge as we inset
    const s = S - a;
    ctx.beginPath();
    ctx.moveTo(a + ch, a);
    ctx.lineTo(s - ch, a);
    ctx.lineTo(s, a + ch);
    ctx.lineTo(s, s - ch);
    ctx.lineTo(s - ch, s);
    ctx.lineTo(a + ch, s);
    ctx.lineTo(a, s - ch);
    ctx.lineTo(a, a + ch);
    ctx.closePath();
  };

  // Flat ink field first — floods the whole frame so it merges with the
  // panel background behind it (background-clip: padding-box).
  chamferPath(1.2);
  ctx.fillStyle = PANEL_FILL;
  ctx.fill();
  // Near-black rim separating panel from world…
  chamferPath(1.2);
  ctx.strokeStyle = '#0c0714';
  ctx.lineWidth = px(2.4);
  ctx.stroke();
  // …carrying one clean flat gold line.
  chamferPath(1.2);
  ctx.strokeStyle = '#b08c42';
  ctx.lineWidth = px(1.3);
  ctx.stroke();
  // Quiet engraved echo, a few px inside — the only ornament the rails
  // allow themselves.
  chamferPath(5.2);
  ctx.strokeStyle = 'rgba(217, 164, 65, 0.22)';
  ctx.lineWidth = px(1);
  ctx.stroke();

  // One flat diamond stud riding each corner cut.
  const stud = (cx: number, cy: number): void => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.PI / 4);
    const r = px(2.4);
    ctx.fillStyle = '#d9a441';
    ctx.strokeStyle = '#0c0714';
    ctx.lineWidth = px(0.8);
    ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.strokeRect(-r, -r, r * 2, r * 2);
    // Lit half — the game's hard-shade facet read, one triangle.
    ctx.fillStyle = '#f0cd74';
    ctx.beginPath();
    ctx.moveTo(-r, -r);
    ctx.lineTo(r, -r);
    ctx.lineTo(-r, r);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };
  const mid = px(CHAMFER * 0.62);
  stud(mid, mid);
  stud(S - mid, mid);
  stud(mid, S - mid);
  stud(S - mid, S - mid);

  return c.toDataURL();
}

/** Paint the chrome and hand it to the stylesheet. Call once at boot. */
export function installChrome(): void {
  const root = document.documentElement.style;
  root.setProperty('--ui-frame', `url(${frameArt()})`);
  root.setProperty('--frame-slice', String(FRAME_SLICE));
  root.setProperty('--frame-border', `${FRAME_BORDER}px`);
}
