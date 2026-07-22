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

/** Source-space pixels per display pixel — drawn oversized for retina. */
const K = 5;

/** The case-bottom field color — the stylesheet's --panel must match. */
export const PANEL_FILL = '#262019';
/** The recessed well color — must match the stylesheet's --sunk. */
const SUNK_FILL = '#191510';

/* The kit's material swatches. */
const IRON = { rim: '#0f0c08', base: '#3b4048', lit: '#5a626d', dark: '#22262b' };
const BRASS = { rim: '#22150a', base: '#c99a3e', lit: '#eec66e', dark: '#8a6420' };
const LEATHER = { seam: '#171208', echo: '#4a3f2e' };
const PAPER = { field: '#e9dcba', edge: '#c3b189', rim: '#6b5c3d', ink: '#3a2f1d' };

/** Display-space border width of the grand case frame. */
export const FRAME_BORDER = 24;
export const FRAME_SLICE = FRAME_BORDER * K;
/** Lighter tray frame (loot tray, cards, menus, prompts). */
export const TRAY_BORDER = 12;
export const TRAY_SLICE = TRAY_BORDER * K;

type Ctx = CanvasRenderingContext2D;

function makeCanvas(size: number): { c: HTMLCanvasElement; ctx: Ctx } {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  return { c, ctx: c.getContext('2d')! };
}

/** Chamfered-rect path inset by `d` display px on a square canvas. */
function chamferPath(ctx: Ctx, S: number, d: number, cut: number): void {
  const a = d * K;
  const ch = Math.max(0, cut * K - a * 0.4);
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
}

/** A round iron rivet: flat stud, dark rim, one lit crescent facet. */
function rivet(ctx: Ctx, x: number, y: number, r: number, lit = '#99a1ad', base = '#6a7280'): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = base;
  ctx.fill();
  ctx.lineWidth = K * 0.6;
  ctx.strokeStyle = '#14120e';
  ctx.stroke();
  // The lit facet: a hard crescent on the upper-left.
  ctx.beginPath();
  ctx.arc(x, y, r * 0.62, Math.PI * 0.75, Math.PI * 1.75);
  ctx.lineWidth = r * 0.5;
  ctx.strokeStyle = lit;
  ctx.stroke();
}

/**
 * THE CASE FRAME — the grand screen's border: dark outline, riveted
 * iron band with a lit outer facet, a dark seam, one brass fillet
 * line, then the leather field flooding inward. Brass corner brackets
 * clamp each corner. Edge tiles carry one rivet each; border-image-
 * repeat:round keeps the rhythm even at any panel size.
 */
function caseFrame(): string {
  const S = FRAME_SLICE * 3;
  const { c, ctx } = makeCanvas(S);
  const px = (v: number): number => v * K;

  // Leather field floods the whole silhouette (merges with --panel).
  chamferPath(ctx, S, 1, 15);
  ctx.fillStyle = PANEL_FILL;
  ctx.fill();

  // The iron band: base, lit outer facet, dark inner ridge.
  chamferPath(ctx, S, 5.6, 15);
  ctx.strokeStyle = IRON.base;
  ctx.lineWidth = px(9.2);
  ctx.stroke();
  chamferPath(ctx, S, 2.2, 15);
  ctx.strokeStyle = IRON.lit;
  ctx.lineWidth = px(1.8);
  ctx.stroke();
  chamferPath(ctx, S, 9.4, 15);
  ctx.strokeStyle = IRON.dark;
  ctx.lineWidth = px(1.5);
  ctx.stroke();
  // Hard outline against the world.
  chamferPath(ctx, S, 1, 15);
  ctx.strokeStyle = IRON.rim;
  ctx.lineWidth = px(2.2);
  ctx.stroke();
  // Dark seam between iron and brass.
  chamferPath(ctx, S, 11, 15);
  ctx.strokeStyle = LEATHER.seam;
  ctx.lineWidth = px(1.6);
  ctx.stroke();
  // The one brass fillet line.
  chamferPath(ctx, S, 12.8, 15);
  ctx.strokeStyle = BRASS.base;
  ctx.lineWidth = px(1.8);
  ctx.stroke();
  // Quiet engraved echo inside the leather margin.
  chamferPath(ctx, S, 17.6, 15);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.lineWidth = px(1);
  ctx.stroke();

  // One rivet per edge tile, riding the iron band's center line.
  const mid = px(5.6);
  const cen = S / 2;
  for (const [x, y] of [
    [cen, mid],
    [cen, S - mid],
    [mid, cen],
    [S - mid, cen],
  ] as const) {
    rivet(ctx, x, y, px(3.3));
  }

  // Brass corner brackets: an L-plate clamped over the iron band with
  // chamfered arm ends and a dark screw at each tip. Fully contained
  // in the corner slice so edge tiling never repeats them.
  const bracket = (cx: number, cy: number, sx: number, sy: number): void => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(sx, sy);
    const arm = px(21);
    const w = px(10.4);
    const cut = px(3.6);
    const off = px(0.6);
    ctx.beginPath();
    ctx.moveTo(off, off);
    ctx.lineTo(arm - cut, off);
    ctx.lineTo(arm, off + cut);
    ctx.lineTo(arm, off + w);
    ctx.lineTo(off + w, off + w);
    ctx.lineTo(off + w, arm);
    ctx.lineTo(off + cut, arm);
    ctx.lineTo(off, arm - cut);
    ctx.closePath();
    ctx.fillStyle = BRASS.base;
    ctx.fill();
    ctx.lineWidth = px(1.1);
    ctx.strokeStyle = BRASS.rim;
    ctx.stroke();
    // Lit facet along the outer arms — one hard line.
    ctx.beginPath();
    ctx.moveTo(off + px(1.4), off + px(1.4));
    ctx.lineTo(arm - cut, off + px(1.4));
    ctx.moveTo(off + px(1.4), off + px(1.4));
    ctx.lineTo(off + px(1.4), arm - cut);
    ctx.strokeStyle = BRASS.lit;
    ctx.lineWidth = px(1.3);
    ctx.stroke();
    // Screws at the arm tips.
    const screw = (x: number, y: number): void => {
      ctx.beginPath();
      ctx.arc(x, y, px(1.5), 0, Math.PI * 2);
      ctx.fillStyle = BRASS.dark;
      ctx.fill();
      ctx.lineWidth = px(0.5);
      ctx.strokeStyle = BRASS.rim;
      ctx.stroke();
    };
    screw(arm - px(5), off + w / 2 + px(0.3));
    screw(off + w / 2 + px(0.3), arm - px(5));
    ctx.restore();
  };
  bracket(0, 0, 1, 1);
  bracket(S, 0, -1, 1);
  bracket(0, S, 1, -1);
  bracket(S, S, -1, -1);

  return c.toDataURL();
}

/**
 * THE TRAY FRAME — lighter chrome for quick furniture: item cards,
 * menus, tooltips, the loot tray. Thin iron band, brass fillet, no
 * brackets — same family, less ceremony.
 */
function trayFrame(): string {
  const S = TRAY_SLICE * 3;
  const { c, ctx } = makeCanvas(S);
  const px = (v: number): number => v * K;

  chamferPath(ctx, S, 0.8, 8);
  ctx.fillStyle = PANEL_FILL;
  ctx.fill();
  chamferPath(ctx, S, 3.2, 8);
  ctx.strokeStyle = IRON.base;
  ctx.lineWidth = px(4.4);
  ctx.stroke();
  chamferPath(ctx, S, 1.5, 8);
  ctx.strokeStyle = IRON.lit;
  ctx.lineWidth = px(1.1);
  ctx.stroke();
  chamferPath(ctx, S, 0.8, 8);
  ctx.strokeStyle = IRON.rim;
  ctx.lineWidth = px(1.6);
  ctx.stroke();
  chamferPath(ctx, S, 5.6, 8);
  ctx.strokeStyle = LEATHER.seam;
  ctx.lineWidth = px(1.1);
  ctx.stroke();
  chamferPath(ctx, S, 6.9, 8);
  ctx.strokeStyle = BRASS.base;
  ctx.lineWidth = px(1.2);
  ctx.stroke();
  return c.toDataURL();
}

/**
 * THE CONSOLE TRAY — the always-on-screen chrome the hotbar and dock
 * ride in: a low iron tray, riveted, chamfered, leather-bottomed.
 */
function consoleTray(): string {
  const B = 13;
  const S = B * K * 3;
  const { c, ctx } = makeCanvas(S);
  const px = (v: number): number => v * K;

  chamferPath(ctx, S, 0.8, 10);
  ctx.fillStyle = '#211b14';
  ctx.fill();
  chamferPath(ctx, S, 3.4, 10);
  ctx.strokeStyle = IRON.base;
  ctx.lineWidth = px(5);
  ctx.stroke();
  chamferPath(ctx, S, 1.4, 10);
  ctx.strokeStyle = IRON.lit;
  ctx.lineWidth = px(1.2);
  ctx.stroke();
  chamferPath(ctx, S, 0.8, 10);
  ctx.strokeStyle = IRON.rim;
  ctx.lineWidth = px(1.8);
  ctx.stroke();
  chamferPath(ctx, S, 6.2, 10);
  ctx.strokeStyle = LEATHER.seam;
  ctx.lineWidth = px(1.2);
  ctx.stroke();
  const mid = px(3.4);
  const cen = S / 2;
  for (const [x, y] of [
    [cen, mid],
    [cen, S - mid],
    [mid, cen],
    [S - mid, cen],
  ] as const) {
    rivet(ctx, x, y, px(2.2));
  }
  // Corner rivets instead of brackets — the tray is working chrome.
  const cm = px(6);
  rivet(ctx, cm, cm, px(2.2));
  rivet(ctx, S - cm, cm, px(2.2));
  rivet(ctx, cm, S - cm, px(2.2));
  rivet(ctx, S - cm, S - cm, px(2.2));
  return c.toDataURL();
}

/**
 * A BUTTON INGOT — the pressable object. Flat metal face with one lit
 * top facet and one dark bottom facet, hard rim, chamfered corners
 * baked into the art (transparent outside the cut, so a drop-shadow
 * follows the true silhouette).
 */
function buttonIngot(face: string, lit: string, dark: string, rim: string): string {
  const B = 12;
  const S = B * K * 3;
  const { c, ctx } = makeCanvas(S);
  const px = (v: number): number => v * K;
  const cut = 7;

  chamferPath(ctx, S, 1, cut);
  ctx.fillStyle = face;
  ctx.fill();
  // Facets: lit shelf along the top, dark shelf along the bottom.
  ctx.save();
  chamferPath(ctx, S, 1, cut);
  ctx.clip();
  ctx.fillStyle = lit;
  ctx.fillRect(0, px(1), S, px(3.4));
  ctx.fillStyle = dark;
  ctx.fillRect(0, S - px(4.4), S, px(4.4));
  ctx.restore();
  chamferPath(ctx, S, 1, cut);
  ctx.strokeStyle = rim;
  ctx.lineWidth = px(2);
  ctx.stroke();
  return c.toDataURL();
}

/**
 * THE SOCKET WELL — every item cell: a recessed leather-bottomed well
 * with an inset bevel (dark upper lip where the light stops, lit lower
 * lip where it lands) and the signature corner cuts.
 */
function socketWell(): string {
  const B = 7;
  const S = B * K * 3;
  const { c, ctx } = makeCanvas(S);
  const px = (v: number): number => v * K;
  const cut = 5;

  chamferPath(ctx, S, 0.6, cut);
  ctx.fillStyle = SUNK_FILL;
  ctx.fill();
  // Outer rim: the metal lip of the well.
  chamferPath(ctx, S, 0.6, cut);
  ctx.strokeStyle = '#31291d';
  ctx.lineWidth = px(1.6);
  ctx.stroke();
  // Inset bevel — dark shadow band under the top lip…
  ctx.save();
  chamferPath(ctx, S, 1.4, cut);
  ctx.clip();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(0, px(1.4), S, px(2.2));
  ctx.fillRect(px(1.4), 0, px(2.2), S);
  // …and a lit floor edge at the bottom.
  ctx.fillStyle = 'rgba(122, 103, 74, 0.34)';
  ctx.fillRect(0, S - px(3.2), S, px(1.6));
  ctx.restore();
  return c.toDataURL();
}

/**
 * THE GAUGE CHANNEL — meters run inside this: a dark channel with an
 * iron rim and a shadow band under the top edge.
 */
function gaugeChannel(): string {
  const B = 5;
  const S = B * K * 3;
  const { c, ctx } = makeCanvas(S);
  const px = (v: number): number => v * K;

  chamferPath(ctx, S, 0.5, 3);
  ctx.fillStyle = '#120e09';
  ctx.fill();
  chamferPath(ctx, S, 0.5, 3);
  ctx.strokeStyle = '#0d0a06';
  ctx.lineWidth = px(1.8);
  ctx.stroke();
  chamferPath(ctx, S, 1.6, 3);
  ctx.strokeStyle = LEATHER.echo;
  ctx.lineWidth = px(0.9);
  ctx.stroke();
  return c.toDataURL();
}

/**
 * THE TITLE BANNER — the plaque a screen's name is stamped on: dark
 * leather strip bound top and bottom in brass, ends cut at 45°.
 */
function titleBanner(): string {
  const B = 11;
  const S = B * K * 3;
  const { c, ctx } = makeCanvas(S);
  const px = (v: number): number => v * K;
  const cut = 9;

  chamferPath(ctx, S, 0.8, cut);
  ctx.fillStyle = '#1d1710';
  ctx.fill();
  chamferPath(ctx, S, 0.8, cut);
  ctx.strokeStyle = '#0e0b07';
  ctx.lineWidth = px(1.6);
  ctx.stroke();
  // Brass binding rails top and bottom (clipped to the plaque).
  ctx.save();
  chamferPath(ctx, S, 1.4, cut);
  ctx.clip();
  ctx.fillStyle = BRASS.base;
  ctx.fillRect(0, px(2), S, px(1.6));
  ctx.fillRect(0, S - px(3.6), S, px(1.6));
  ctx.fillStyle = BRASS.lit;
  ctx.fillRect(0, px(2), S, px(0.7));
  ctx.restore();
  return c.toDataURL();
}

/**
 * THE CREST MEDALLION — the brass roundel a screen's emblem rides in:
 * eight hard facet segments alternating two brass tones, a dark well
 * at the center, and a bold rim. The screen's own painted icon sits
 * inside; the ring is what makes it a crest.
 */
function crestMedallion(): string {
  const D = 76 * K;
  const { c, ctx } = makeCanvas(D);
  const cx = D / 2;
  const r = D / 2 - 2 * K;

  // Outer dark ring.
  ctx.beginPath();
  ctx.arc(cx, cx, r, 0, Math.PI * 2);
  ctx.fillStyle = '#14100a';
  ctx.fill();
  // Faceted brass ring: eight flat segments, two alternating tones,
  // the top-left quadrant running one tone lighter (the light side).
  const R0 = r - 1.6 * K;
  const R1 = r * 0.66;
  for (let i = 0; i < 8; i++) {
    const a0 = (i / 8) * Math.PI * 2 - Math.PI / 8;
    const a1 = ((i + 1) / 8) * Math.PI * 2 - Math.PI / 8;
    const litSide = i >= 4 && i <= 6;
    ctx.beginPath();
    ctx.arc(cx, cx, R0, a0, a1);
    ctx.arc(cx, cx, R1, a1, a0, true);
    ctx.closePath();
    ctx.fillStyle = litSide ? BRASS.lit : i % 2 === 0 ? BRASS.base : '#b3852f';
    ctx.fill();
    ctx.strokeStyle = BRASS.rim;
    ctx.lineWidth = 0.9 * K;
    ctx.stroke();
  }
  // The dark well the emblem sits in.
  ctx.beginPath();
  ctx.arc(cx, cx, R1, 0, Math.PI * 2);
  ctx.fillStyle = SUNK_FILL;
  ctx.fill();
  ctx.strokeStyle = '#0d0a06';
  ctx.lineWidth = 1.4 * K;
  ctx.stroke();
  // Four rivets at the compass points of the ring.
  const rr = (R0 + R1) / 2;
  for (const a of [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4]) {
    rivet(ctx, cx + Math.cos(a) * rr, cx + Math.sin(a) * rr, 1.7 * K, '#f2d894', BRASS.dark);
  }
  return c.toDataURL();
}

/**
 * THE PARCHMENT SHEET — the document material: blueprint cards lie on
 * this. Light field, worn darker edges, a hard rim — text on it flips
 * to ink.
 */
function parchmentSheet(): string {
  const B = 9;
  const S = B * K * 3;
  const { c, ctx } = makeCanvas(S);
  const px = (v: number): number => v * K;
  const cut = 4;

  chamferPath(ctx, S, 0.8, cut);
  ctx.fillStyle = PAPER.field;
  ctx.fill();
  // Worn edge band — the sheet has been handled.
  chamferPath(ctx, S, 2, cut);
  ctx.strokeStyle = PAPER.edge;
  ctx.lineWidth = px(2.6);
  ctx.stroke();
  chamferPath(ctx, S, 0.8, cut);
  ctx.strokeStyle = PAPER.rim;
  ctx.lineWidth = px(1.3);
  ctx.stroke();
  // One engraved rule inside the worn band.
  chamferPath(ctx, S, 4.4, cut);
  ctx.strokeStyle = 'rgba(107, 92, 61, 0.4)';
  ctx.lineWidth = px(0.8);
  ctx.stroke();
  return c.toDataURL();
}

/** The parchment's ink color, exported for the stylesheet. */
export const SHEET_INK = PAPER.ink;

/** Paint the kit and hand it to the stylesheet. Call once at boot. */
export function installChrome(): void {
  const root = document.documentElement.style;
  root.setProperty('--ui-frame', `url(${caseFrame()})`);
  root.setProperty('--frame-slice', String(FRAME_SLICE));
  root.setProperty('--frame-border', `${FRAME_BORDER}px`);
  root.setProperty('--ui-tray-frame', `url(${trayFrame()})`);
  root.setProperty('--tray-slice', String(TRAY_SLICE));
  root.setProperty('--tray-border', `${TRAY_BORDER}px`);
  root.setProperty('--ui-console', `url(${consoleTray()})`);
  root.setProperty('--ui-banner', `url(${titleBanner()})`);
  root.setProperty('--ui-crest', `url(${crestMedallion()})`);
  root.setProperty('--ui-socket', `url(${socketWell()})`);
  root.setProperty('--ui-gauge', `url(${gaugeChannel()})`);
  root.setProperty('--ui-sheet', `url(${parchmentSheet()})`);
  root.setProperty(
    '--btn-brass',
    `url(${buttonIngot(BRASS.base, BRASS.lit, BRASS.dark, BRASS.rim)})`,
  );
  root.setProperty(
    '--btn-iron',
    `url(${buttonIngot('#3d434b', IRON.lit, '#272c32', IRON.rim)})`,
  );
}
