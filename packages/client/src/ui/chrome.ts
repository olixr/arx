/**
 * The HUD's bespoke chrome, painted in code at boot: a woven linen
 * texture tile and an ornate gold 9-slice frame. Both land in CSS
 * custom properties (`--tex-linen`, `--ui-frame`) so the stylesheet
 * dresses every panel in real art instead of flat borders — no image
 * assets, no network, crisp at any DPI.
 */

/** Display-space border width the frame is designed for (CSS px). */
export const FRAME_BORDER = 22;
/** Source-space pixels per display pixel — drawn oversized for retina. */
const K = 5;
/** 9-slice inset in source pixels. */
export const FRAME_SLICE = FRAME_BORDER * K;

/**
 * Dark woven linen: the cloth every panel is cut from. Two thread
 * directions with alternating tension plus grain noise — quiet enough
 * to read text over, alive enough to not be a flat brown rectangle.
 */
function linenTile(): string {
  const S = 96;
  const c = document.createElement('canvas');
  c.width = S;
  c.height = S;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(S, S);
  const d = img.data;
  // Deterministic grain — the tile must seam with itself.
  const rnd = (x: number, y: number): number => {
    const v = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return v - Math.floor(v);
  };
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      let r = 34;
      let g = 22;
      let b = 13;
      // Warp and weft: 3px thread bands, offset phases.
      const warp = [3, -2, 0][x % 3]!;
      const weft = [2, 0, -3][y % 3]!;
      const cross = (x + y) % 6 < 3 ? 1 : -1;
      const grain = (rnd(x, y) - 0.5) * 7;
      const v = warp + weft + cross + grain;
      r += v;
      g += v * 0.8;
      b += v * 0.6;
      const i = (y * S + x) * 4;
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c.toDataURL();
}

/**
 * The ornate frame, drawn once and 9-sliced by CSS border-image:
 * near-black rim, beveled aged-gold band, dark seam, stitched leather
 * inset, inner gold hairline — with layered corner plates, rivets and
 * a diamond stud where the rails meet. Edge strips are uniform along
 * their run so border-image stretching is invisible.
 */
function frameArt(): string {
  const S = FRAME_SLICE * 3.2; // corners + a stretchable middle run
  const c = document.createElement('canvas');
  c.width = S;
  c.height = S;
  const ctx = c.getContext('2d')!;

  const px = (v: number): number => v * K; // design in display px

  // ---- edge bands: draw the TOP edge, then rotate around center ×4.
  const drawEdge = (): void => {
    // Rim.
    ctx.fillStyle = '#0d0805';
    ctx.fillRect(0, 0, S, px(1.6));
    // Aged gold band, beveled: lit crown, shaded base.
    const gold = ctx.createLinearGradient(0, px(1.6), 0, px(6.2));
    gold.addColorStop(0, '#f0cd74');
    gold.addColorStop(0.35, '#d9a441');
    gold.addColorStop(1, '#8a5f1c');
    ctx.fillStyle = gold;
    ctx.fillRect(0, px(1.6), S, px(4.6));
    // Seam.
    ctx.fillStyle = '#140c07';
    ctx.fillRect(0, px(6.2), S, px(1.4));
    // Leather inset with a running stitch.
    const leather = ctx.createLinearGradient(0, px(7.6), 0, px(17));
    leather.addColorStop(0, '#332015');
    leather.addColorStop(1, '#241610');
    ctx.fillStyle = leather;
    ctx.fillRect(0, px(7.6), S, px(9.4));
    ctx.strokeStyle = 'rgba(217, 164, 65, 0.22)';
    ctx.lineWidth = px(0.9);
    ctx.setLineDash([px(3.2), px(2.6)]);
    ctx.beginPath();
    ctx.moveTo(0, px(12.3));
    ctx.lineTo(S, px(12.3));
    ctx.stroke();
    ctx.setLineDash([]);
    // Inner gold hairline, then a soft shadow fading into the panel.
    ctx.fillStyle = 'rgba(217, 164, 65, 0.85)';
    ctx.fillRect(0, px(17), S, px(1.3));
    const fade = ctx.createLinearGradient(0, px(18.3), 0, px(FRAME_BORDER));
    fade.addColorStop(0, 'rgba(10, 6, 4, 0.55)');
    fade.addColorStop(1, 'rgba(10, 6, 4, 0)');
    ctx.fillStyle = fade;
    ctx.fillRect(0, px(18.3), S, px(FRAME_BORDER - 18.3));
  };
  for (let i = 0; i < 4; i++) {
    ctx.save();
    ctx.translate(S / 2, S / 2);
    ctx.rotate((Math.PI / 2) * i);
    ctx.translate(-S / 2, -S / 2);
    drawEdge();
    ctx.restore();
  }

  // ---- corner plates: draw top-left, mirror ×4.
  const drawCorner = (): void => {
    const plate = px(14.5);
    const notch = px(4.5);
    // Chamfered gold plate over both rails.
    const grad = ctx.createLinearGradient(0, 0, plate, plate);
    grad.addColorStop(0, '#f0cd74');
    grad.addColorStop(0.5, '#d9a441');
    grad.addColorStop(1, '#8a5f1c');
    ctx.fillStyle = grad;
    ctx.strokeStyle = '#0d0805';
    ctx.lineWidth = px(0.9);
    ctx.beginPath();
    ctx.moveTo(px(0.6), px(0.6));
    ctx.lineTo(plate - notch, px(0.6));
    ctx.lineTo(plate, notch);
    ctx.lineTo(plate, px(7));
    ctx.lineTo(px(7), px(7));
    ctx.lineTo(px(7), plate);
    ctx.lineTo(notch, plate);
    ctx.lineTo(px(0.6), plate - notch);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Engraved inner line follows the plate.
    ctx.strokeStyle = 'rgba(13, 8, 5, 0.5)';
    ctx.lineWidth = px(0.7);
    ctx.beginPath();
    ctx.moveTo(px(2.6), px(2.6));
    ctx.lineTo(plate - notch - px(1), px(2.6));
    ctx.moveTo(px(2.6), px(2.6));
    ctx.lineTo(px(2.6), plate - notch - px(1));
    ctx.stroke();
    // Rivet: dark well, gold dome, spark of light.
    ctx.fillStyle = '#3a2410';
    ctx.beginPath();
    ctx.arc(px(4.9), px(4.9), px(1.7), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8c268';
    ctx.beginPath();
    ctx.arc(px(4.7), px(4.7), px(1.1), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff2cc';
    ctx.beginPath();
    ctx.arc(px(4.3), px(4.3), px(0.45), 0, Math.PI * 2);
    ctx.fill();
    // Diamond stud where the rails hand off to the panel field.
    ctx.save();
    ctx.translate(px(11.6), px(11.6));
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#d9a441';
    ctx.strokeStyle = '#0d0805';
    ctx.lineWidth = px(0.8);
    const dr = px(2.2);
    ctx.fillRect(-dr, -dr, dr * 2, dr * 2);
    ctx.strokeRect(-dr, -dr, dr * 2, dr * 2);
    ctx.fillStyle = '#f0cd74';
    ctx.fillRect(-dr, -dr, dr, dr);
    ctx.restore();
  };
  const corner = (flipX: boolean, flipY: boolean): void => {
    ctx.save();
    ctx.translate(flipX ? S : 0, flipY ? S : 0);
    ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
    drawCorner();
    ctx.restore();
  };
  corner(false, false);
  corner(true, false);
  corner(false, true);
  corner(true, true);

  return c.toDataURL();
}

/** Paint the chrome and hand it to the stylesheet. Call once at boot. */
export function installChrome(): void {
  const root = document.documentElement.style;
  root.setProperty('--tex-linen', `url(${linenTile()})`);
  root.setProperty('--ui-frame', `url(${frameArt()})`);
  root.setProperty('--frame-slice', String(FRAME_SLICE));
  root.setProperty('--frame-border', `${FRAME_BORDER}px`);
}
