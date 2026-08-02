/**
 * Bespoke tool sigils for Map Studio — hand-drawn monoline glyphs in
 * the one-ink dock-sigil dialect the game HUD uses. Never emoji, never
 * font glyphs: every icon is authored strokes on a canvas, served as a
 * data URL so buttons can clone them freely.
 */

// STUDIO2 metrics: the glyph geometry is authored in the same 24-box
// dialect, rendered at 3x supersample with the v2 instrument ink and a
// finer 1.6px stroke — the sigils keep their hand, the chrome gets its
// precision (Map Studio v2 plan §3.3).
const SIZE = 44;
const INK = '#e9ecf3';
const STROKE = 1.6;

type Painter = (ctx: CanvasRenderingContext2D) => void;

function draw(painter: Painter): string {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE * 3;
  canvas.height = SIZE * 3;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(3, 3);
  // Authored in a 24x24 box, centered in the 44px tile.
  ctx.translate((SIZE - 24) / 2, (SIZE - 24) / 2);
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
  ctx.lineWidth = STROKE;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  painter(ctx);
  return canvas.toDataURL();
}

const path = (ctx: CanvasRenderingContext2D, pts: Array<[number, number]>, close = false): void => {
  ctx.beginPath();
  ctx.moveTo(pts[0]![0], pts[0]![1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i]![0], pts[i]![1]);
  if (close) ctx.closePath();
};

/** A round-tipped painter's brush, loaded, at working angle. */
const brush: Painter = (ctx) => {
  // Handle.
  path(ctx, [[19.5, 2.5], [11.5, 10.5]]);
  ctx.stroke();
  // Ferrule.
  path(ctx, [[12.8, 9.2], [14.8, 11.2]]);
  ctx.lineWidth = 3.2;
  ctx.stroke();
  ctx.lineWidth = STROKE;
  // Bristle body sweeping to the tip.
  ctx.beginPath();
  ctx.moveTo(11.6, 10.4);
  ctx.quadraticCurveTo(7.5, 12.5, 5.8, 16.2);
  ctx.quadraticCurveTo(4.8, 18.6, 3.2, 20.8);
  ctx.quadraticCurveTo(6.8, 20.9, 9.2, 19.2);
  ctx.quadraticCurveTo(12.4, 17, 13.6, 12.4);
  ctx.closePath();
  ctx.fill();
};

/** A block eraser mid-swipe, crumbs trailing. */
const eraser: Painter = (ctx) => {
  ctx.save();
  ctx.translate(12, 10);
  ctx.rotate(-0.6);
  ctx.strokeRect(-6.5, -4.5, 13, 9);
  // The sleeve band.
  path(ctx, [[-1.5, -4.5], [-1.5, 4.5]]);
  ctx.stroke();
  ctx.restore();
  // Swipe crumbs.
  for (const [x, y, r] of [[5, 19.5, 1.1], [10, 21, 0.9], [15, 20, 1.2]] as const) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
};

/** A ruled segment with endpoint anchors. */
const line: Painter = (ctx) => {
  path(ctx, [[4.5, 19.5], [19.5, 4.5]]);
  ctx.stroke();
  for (const [x, y] of [[4.5, 19.5], [19.5, 4.5]] as const) {
    ctx.beginPath();
    ctx.arc(x, y, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
};

/** Rectangle with drafting handles. */
const rect: Painter = (ctx) => {
  ctx.strokeRect(4, 6, 16, 12);
  for (const [x, y] of [[4, 6], [20, 6], [4, 18], [20, 18]] as const) {
    ctx.fillRect(x - 1.7, y - 1.7, 3.4, 3.4);
  }
};

/** Ellipse with two handles on the cardinal points. */
const ellipse: Painter = (ctx) => {
  ctx.beginPath();
  ctx.ellipse(12, 12, 8.5, 6, 0, 0, Math.PI * 2);
  ctx.stroke();
  for (const [x, y] of [[12, 6], [12, 18]] as const) {
    ctx.fillRect(x - 1.6, y - 1.6, 3.2, 3.2);
  }
};

/** A tipped bucket, paint committing to the ground. */
const fill: Painter = (ctx) => {
  ctx.save();
  ctx.translate(11, 10);
  ctx.rotate(0.5);
  // Bucket body.
  path(ctx, [[-4.5, -3], [-3.5, 5], [3.5, 5], [4.5, -3]], true);
  ctx.stroke();
  // Rim.
  ctx.beginPath();
  ctx.ellipse(0, -3, 4.5, 1.6, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  // The poured wave.
  ctx.beginPath();
  ctx.moveTo(3.5, 18.5);
  ctx.quadraticCurveTo(8, 16, 12, 18);
  ctx.quadraticCurveTo(16.5, 20.2, 21, 18.2);
  ctx.stroke();
};

/** A road receding: two edges and its center dashes. */
const road: Painter = (ctx) => {
  path(ctx, [[7, 21], [10.2, 3]]);
  ctx.stroke();
  path(ctx, [[17, 21], [13.8, 3]]);
  ctx.stroke();
  ctx.lineWidth = 1.6;
  for (const [y0, y1] of [[19, 16.4], [13.5, 11.4], [8.6, 7]] as const) {
    path(ctx, [[12, y0], [12, y1]]);
    ctx.stroke();
  }
};

/** Marching-ants marquee. */
const select: Painter = (ctx) => {
  ctx.setLineDash([3.2, 2.6]);
  ctx.strokeRect(4.5, 5.5, 15, 13);
  ctx.setLineDash([]);
};

/** A dropper taking its sample. */
const picker: Painter = (ctx) => {
  // Bulb + stem.
  ctx.save();
  ctx.translate(15.5, 8.5);
  ctx.rotate(Math.PI / 4);
  ctx.beginPath();
  ctx.arc(0, -4.6, 3, Math.PI, 0);
  ctx.lineTo(1.6, 3.5);
  ctx.lineTo(0, 6.5);
  ctx.lineTo(-1.6, 3.5);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
  // The sampled drop.
  ctx.beginPath();
  ctx.arc(6.5, 18.5, 2, 0, Math.PI * 2);
  ctx.fill();
};

/** The spawn banner: a pennant planted at the starting point. */
const spawn: Painter = (ctx) => {
  path(ctx, [[8.5, 21], [8.5, 3.5]]);
  ctx.stroke();
  path(ctx, [[8.5, 4.5], [18.5, 7], [8.5, 9.5]], true);
  ctx.fill();
  // Ground tick.
  path(ctx, [[5, 21], [12, 21]]);
  ctx.stroke();
};

/** A gabled hall — the structure stamp. */
const structure: Painter = (ctx) => {
  path(ctx, [[3.5, 11.5], [12, 4], [20.5, 11.5]]);
  ctx.stroke();
  path(ctx, [[5.5, 10.5], [5.5, 20], [18.5, 20], [18.5, 10.5]]);
  ctx.stroke();
  // Doorway.
  path(ctx, [[10.2, 20], [10.2, 14.5], [13.8, 14.5], [13.8, 20]]);
  ctx.stroke();
};

/** A rubber stamp mid-press — the prefab. */
const prefab: Painter = (ctx) => {
  // Knob + neck.
  ctx.beginPath();
  ctx.arc(12, 5, 2.6, 0, Math.PI * 2);
  ctx.stroke();
  path(ctx, [[12, 7.6], [12, 10.5]]);
  ctx.stroke();
  // Base block.
  path(ctx, [[6, 10.5], [18, 10.5], [18, 14], [6, 14]], true);
  ctx.stroke();
  // The impression it leaves.
  ctx.lineWidth = 1.6;
  path(ctx, [[5, 19], [19, 19]]);
  ctx.setLineDash([2.6, 2.2]);
  ctx.stroke();
  ctx.setLineDash([]);
};

/** A standing arch with the swirl inside — the portal. */
const portal: Painter = (ctx) => {
  ctx.beginPath();
  ctx.moveTo(6, 20.5);
  ctx.lineTo(6, 10.5);
  ctx.arc(12, 10.5, 6, Math.PI, 0);
  ctx.lineTo(18, 20.5);
  ctx.stroke();
  // Inner swirl.
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(12, 13, 2.8, -0.4, Math.PI * 1.35);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(12, 13, 1.1, Math.PI * 0.7, Math.PI * 2.1);
  ctx.stroke();
};

/** Three heads inside the wander ring — an NPC cluster. */
const cluster: Painter = (ctx) => {
  ctx.setLineDash([2.8, 2.4]);
  ctx.beginPath();
  ctx.arc(12, 13, 9, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  for (const [x, y] of [[12, 8.5], [8.2, 15.5], [15.8, 15.5]] as const) {
    ctx.beginPath();
    ctx.arc(x, y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
};

/** One named body: head and shoulders. */
const actor: Painter = (ctx) => {
  ctx.beginPath();
  ctx.arc(12, 8, 3.6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(5.5, 20.5);
  ctx.quadraticCurveTo(6, 14.2, 12, 14.2);
  ctx.quadraticCurveTo(18, 14.2, 18.5, 20.5);
  ctx.stroke();
};

/** A signpost: a board on a driven post, two lines of writing on it. */
const signIcon: Painter = (ctx) => {
  ctx.strokeRect(4.5, 4.5, 15, 10);
  path(ctx, [[12, 14.5], [12, 21]]);
  ctx.stroke();
  path(ctx, [[7.5, 8], [16.5, 8]]);
  ctx.stroke();
  path(ctx, [[7.5, 11], [14, 11]]);
  ctx.stroke();
};

/** Mirror arrows for the flip control. */
const flip: Painter = (ctx) => {
  ctx.setLineDash([2.4, 2]);
  path(ctx, [[12, 3], [12, 21]]);
  ctx.stroke();
  ctx.setLineDash([]);
  path(ctx, [[9, 8], [4, 12], [9, 16]], true);
  ctx.fill();
  path(ctx, [[15, 8], [20, 12], [15, 16]], true);
  ctx.fill();
};

/** A lidded bin for destructive row actions. */
const trash: Painter = (ctx) => {
  path(ctx, [[6, 8], [7.2, 20], [16.8, 20], [18, 8]]);
  ctx.stroke();
  path(ctx, [[4.5, 7.5], [19.5, 7.5]]);
  ctx.stroke();
  path(ctx, [[9.5, 7.5], [10, 5], [14, 5], [14.5, 7.5]]);
  ctx.stroke();
  ctx.lineWidth = 1.5;
  path(ctx, [[9.7, 10.5], [10.2, 17.5]]);
  ctx.stroke();
  path(ctx, [[14.3, 10.5], [13.8, 17.5]]);
  ctx.stroke();
};

/** Two slates in conversation — the dialogue section. */
const speech: Painter = (ctx) => {
  // The leading bubble, tail dropping toward its speaker.
  ctx.beginPath();
  ctx.moveTo(5.5, 4.5);
  ctx.lineTo(16.5, 4.5);
  ctx.quadraticCurveTo(18.5, 4.5, 18.5, 6.5);
  ctx.lineTo(18.5, 9.5);
  ctx.quadraticCurveTo(18.5, 11.5, 16.5, 11.5);
  ctx.lineTo(9.5, 11.5);
  ctx.lineTo(6.2, 14.4);
  ctx.lineTo(7, 11.5);
  ctx.quadraticCurveTo(3.5, 11.3, 3.5, 8.5);
  ctx.lineTo(3.5, 6.5);
  ctx.quadraticCurveTo(3.5, 4.5, 5.5, 4.5);
  ctx.closePath();
  ctx.stroke();
  // The answering bubble, filled — the other voice.
  ctx.beginPath();
  ctx.moveTo(11.5, 14.5);
  ctx.lineTo(18.8, 14.5);
  ctx.quadraticCurveTo(20.5, 14.5, 20.5, 16.2);
  ctx.lineTo(20.5, 17.8);
  ctx.quadraticCurveTo(20.5, 19.5, 18.8, 19.5);
  ctx.lineTo(17.5, 19.5);
  ctx.lineTo(18.6, 21.8);
  ctx.lineTo(15.4, 19.5);
  ctx.lineTo(13.2, 19.5);
  ctx.quadraticCurveTo(11.5, 19.5, 11.5, 17.8);
  ctx.lineTo(11.5, 16.2);
  ctx.quadraticCurveTo(11.5, 14.5, 13.2, 14.5);
  ctx.closePath();
  ctx.fill();
};

/** A planted pennant marking that something happened — the flag ledger. */
const flagSigil: Painter = (ctx) => {
  path(ctx, [[7.5, 21], [7.5, 3.5]]);
  ctx.stroke();
  // The waving cloth.
  ctx.beginPath();
  ctx.moveTo(7.5, 4.5);
  ctx.quadraticCurveTo(11.5, 2.8, 14, 4.6);
  ctx.quadraticCurveTo(16.2, 6.2, 19, 5.2);
  ctx.lineTo(19, 10.8);
  ctx.quadraticCurveTo(16.2, 11.8, 14, 10.2);
  ctx.quadraticCurveTo(11.5, 8.4, 7.5, 10.1);
  ctx.closePath();
  ctx.fill();
  // Ground tick.
  path(ctx, [[4.5, 21], [11, 21]]);
  ctx.stroke();
};

/** Crosshair reticle — focus a placement on the map. */
const focus: Painter = (ctx) => {
  ctx.beginPath();
  ctx.arc(12, 12, 5.5, 0, Math.PI * 2);
  ctx.stroke();
  for (const [x0, y0, x1, y1] of [
    [12, 3, 12, 6.5], [12, 17.5, 12, 21], [3, 12, 6.5, 12], [17.5, 12, 21, 12],
  ] as const) {
    path(ctx, [[x0, y0], [x1, y1]]);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(12, 12, 1.2, 0, Math.PI * 2);
  ctx.fill();
};

// ------------------------------------------------- the world's sigils

/** A small globe: meridian, equator, and the standing ring. */
const world: Painter = (ctx) => {
  ctx.beginPath();
  ctx.arc(12, 12, 8.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(12, 12, 3.6, 8.5, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(12, 12, 8.5, 3.2, 0, 0, Math.PI * 2);
  ctx.stroke();
};

/** An arrow cursor over a waypoint dot — the world's chooser. */
const wselect: Painter = (ctx) => {
  path(ctx, [[6, 3], [6, 17], [10.2, 13.6], [13.4, 20], [15.8, 18.8], [12.6, 12.6], [17.5, 12.2]], true);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(18.5, 5.5, 2.2, 0, Math.PI * 2);
  ctx.stroke();
};

/** A road winding between two waypoint rings. */
const wroute: Painter = (ctx) => {
  ctx.beginPath();
  ctx.moveTo(4.5, 19.5);
  ctx.quadraticCurveTo(9, 15, 8, 11);
  ctx.quadraticCurveTo(7.2, 7, 12.5, 5.5);
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.lineWidth = STROKE;
  ctx.beginPath();
  ctx.arc(4.5, 19.5, 2.4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(17.5, 5.5, 3, 0, Math.PI * 2);
  ctx.stroke();
};

/** A hunter's trail — the same wander, cut to scuffs. */
const wtrail: Painter = (ctx) => {
  for (const [x, y] of [
    [5, 20], [7.5, 16.5], [7, 12.5], [9.5, 9], [13, 7], [17, 5],
  ] as const) {
    ctx.beginPath();
    ctx.arc(x, y, 1.25, 0, Math.PI * 2);
    ctx.fill();
  }
  // Two hoof-scuffs beside the line.
  path(ctx, [[11, 13.5], [12.8, 12.4]]);
  ctx.stroke();
  path(ctx, [[13.5, 16.5], [15.3, 15.4]]);
  ctx.stroke();
};

/** A road lamp on its post — the authored landmark. */
const wsite: Painter = (ctx) => {
  path(ctx, [[12, 21], [12, 9]]);
  ctx.stroke();
  path(ctx, [[8.5, 21], [15.5, 21]]);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(12, 6, 3.2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(12, 6, 1.1, 0, Math.PI * 2);
  ctx.fill();
  // The light, thrown.
  for (const [x0, y0, x1, y1] of [
    [6.8, 6, 4.2, 6], [17.2, 6, 19.8, 6], [12, 0.8, 12, 1.8],
  ] as const) {
    path(ctx, [[x0, y0], [x1, y1]]);
    ctx.stroke();
  }
};

/** A hearth ring: the safe ground and its fire. */
const wanchor: Painter = (ctx) => {
  ctx.setLineDash([3.2, 2.6]);
  ctx.beginPath();
  ctx.arc(12, 13, 8.2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  // The flame.
  ctx.beginPath();
  ctx.moveTo(12, 8.6);
  ctx.quadraticCurveTo(14.8, 11.2, 13.4, 13.6);
  ctx.quadraticCurveTo(12.8, 14.8, 12, 15.4);
  ctx.quadraticCurveTo(11.2, 14.8, 10.6, 13.6);
  ctx.quadraticCurveTo(9.2, 11.2, 12, 8.6);
  ctx.fill();
  path(ctx, [[9, 17.4], [15, 17.4]]);
  ctx.stroke();
};

/** Planned ground: a dashed claim with survey pegs. */
const wplanned: Painter = (ctx) => {
  ctx.setLineDash([3.4, 2.8]);
  ctx.strokeRect(4.5, 6, 15, 12);
  ctx.setLineDash([]);
  for (const [x, y] of [[4.5, 6], [19.5, 6], [19.5, 18], [4.5, 18]] as const) {
    ctx.beginPath();
    ctx.arc(x, y, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
};

// -------------------------------------------- the bench's own sigils
// (v2 chrome: topbar verbs and the command lens, same hand as the rest)

/** A fresh sheet, corner folded — New. */
const docNew: Painter = (ctx) => {
  path(ctx, [[6, 21], [6, 3], [14.5, 3], [18, 6.5], [18, 21]], true);
  ctx.stroke();
  path(ctx, [[14.5, 3], [14.5, 6.5], [18, 6.5]]);
  ctx.stroke();
  path(ctx, [[9.5, 13.5], [14.5, 13.5]]);
  ctx.stroke();
  path(ctx, [[12, 11], [12, 16]]);
  ctx.stroke();
};

/** A drawer of maps, one sliding out — Open. */
const folderOpen: Painter = (ctx) => {
  path(ctx, [[3.5, 8], [3.5, 5], [9.5, 5], [11.5, 7.5], [20.5, 7.5]]);
  ctx.stroke();
  path(ctx, [[3.5, 8], [20.5, 8], [18.8, 19], [5.2, 19]], true);
  ctx.stroke();
};

/** The sheet descending into the world tray — Save to live. */
const saveLive: Painter = (ctx) => {
  path(ctx, [[12, 3], [12, 13.5]]);
  ctx.stroke();
  path(ctx, [[8, 10], [12, 14.5], [16, 10]]);
  ctx.stroke();
  path(ctx, [[4, 15.5], [4, 20], [20, 20], [20, 15.5]]);
  ctx.stroke();
};

/** An arrow entering the case — Import. */
const importIn: Painter = (ctx) => {
  path(ctx, [[13.5, 3.5], [20.5, 3.5], [20.5, 20.5], [13.5, 20.5]]);
  ctx.stroke();
  path(ctx, [[3.5, 12], [15.5, 12]]);
  ctx.stroke();
  path(ctx, [[11, 8], [15.5, 12], [11, 16]]);
  ctx.stroke();
};

/** An arrow leaving the case — Export. */
const exportOut: Painter = (ctx) => {
  path(ctx, [[10.5, 3.5], [3.5, 3.5], [3.5, 20.5], [10.5, 20.5]]);
  ctx.stroke();
  path(ctx, [[8.5, 12], [20.5, 12]]);
  ctx.stroke();
  path(ctx, [[16, 8], [20.5, 12], [16, 16]]);
  ctx.stroke();
};

/** The surveyor's tick in its ring — Validate. */
const checkRing: Painter = (ctx) => {
  ctx.beginPath();
  ctx.arc(12, 12, 8.5, 0, Math.PI * 2);
  ctx.stroke();
  path(ctx, [[8, 12.2], [11, 15.2], [16.2, 8.8]]);
  ctx.stroke();
};

/** A quiet question in the round — Help. */
const helpRing: Painter = (ctx) => {
  ctx.beginPath();
  ctx.arc(12, 12, 8.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(9.4, 9.6);
  ctx.quadraticCurveTo(9.4, 7, 12, 7);
  ctx.quadraticCurveTo(14.6, 7, 14.6, 9.3);
  ctx.quadraticCurveTo(14.6, 11.2, 12, 11.8);
  ctx.lineTo(12, 13.6);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(12, 16.8, 1.15, 0, Math.PI * 2);
  ctx.fill();
};

/** The command lens — search everything, run anything (⌘K). */
const lens: Painter = (ctx) => {
  ctx.beginPath();
  ctx.arc(10.5, 10.5, 6.5, 0, Math.PI * 2);
  ctx.stroke();
  path(ctx, [[15.4, 15.4], [20.5, 20.5]]);
  ctx.lineWidth = 2.2;
  ctx.stroke();
  ctx.lineWidth = STROKE;
  // The spark inside: a found thing.
  ctx.beginPath();
  ctx.arc(10.5, 10.5, 1.1, 0, Math.PI * 2);
  ctx.fill();
};

export const EDITOR_ICONS: Record<string, string> = {
  docnew: draw(docNew),
  folder: draw(folderOpen),
  save: draw(saveLive),
  importin: draw(importIn),
  exportout: draw(exportOut),
  check: draw(checkRing),
  help: draw(helpRing),
  lens: draw(lens),
  paint: draw(brush),
  erase: draw(eraser),
  line: draw(line),
  rect: draw(rect),
  ellipse: draw(ellipse),
  fill: draw(fill),
  road: draw(road),
  select: draw(select),
  picker: draw(picker),
  spawn: draw(spawn),
  structure: draw(structure),
  prefab: draw(prefab),
  portal: draw(portal),
  cluster: draw(cluster),
  actor: draw(actor),
  sign: draw(signIcon),
  flip: draw(flip),
  trash: draw(trash),
  focus: draw(focus),
  speech: draw(speech),
  flag: draw(flagSigil),
  world: draw(world),
  wselect: draw(wselect),
  wroute: draw(wroute),
  wtrail: draw(wtrail),
  wsite: draw(wsite),
  wanchor: draw(wanchor),
  wplanned: draw(wplanned),
};

/** An <img> for a sigil, sized for toolbar/button use. */
export function iconImg(name: string, size = 22): HTMLImageElement {
  const img = document.createElement('img');
  img.src = EDITOR_ICONS[name] ?? EDITOR_ICONS.paint!;
  img.width = size;
  img.height = size;
  img.draggable = false;
  img.alt = '';
  return img;
}
