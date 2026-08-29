/**
 * The companion's face, painted once per species by the same rig
 * that walks the body through the world — a portrait, never a
 * placeholder glyph. Shared by the stalls panel and the HUD chip so
 * both surfaces show the same animal.
 */
import { npcDef } from '@arx/content';
import { beastSpec, drawBeast } from './rig.js';
import { LegRig } from './legs.js';
import { BED_FILL } from '../ui/kit/tokens.js';

const cache = new Map<string, string>();

/** Settle a species' rig at its home stance and return the pose. */
function settledPose(species: string, radius: number, speed: number) {
  const spec = beastSpec(species, radius, speed);
  const rig = new LegRig(spec.rig);
  let pose = rig.update(0, 0, Math.PI, 1 / 20);
  for (let i = 0; i < 8; i++) pose = rig.update(0, 0, Math.PI, 1 / 20);
  return { spec, pose };
}

/**
 * THE PLAQUE PORTRAIT — the companion's face for the HUD medallion.
 * Unlike the bare stall portrait, this one arrives with its ground:
 * a round warm-suede bed (THE BED LAW — the rig's dark outline ring
 * only cuts against ground lighter than itself), a standing shadow
 * under the feet, and a quiet vignette that seats the animal in the
 * medallion's well instead of floating it. Painted once per species
 * and size, at double density so the crest never shows a soft pixel.
 *
 * THE COAT OUTLIVES THE BODY: a friend courted since the ledgers
 * carries its wild body's look seed — the portrait dresses the SAME
 * coat cluster the world body wears (a frost fox's medallion is a
 * frost fox). Elder friends without a seed keep the home coat.
 */
export function petPlaquePortraitUrl(species: string, size = 96, lookSeed?: number): string {
  const seed = lookSeed ?? 7;
  const key = `plaque:${species}|${seed}@${size}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const S = size * 2; /* double-density backing store */
  const def = npcDef(species);
  const cnv = document.createElement('canvas');
  cnv.width = S;
  cnv.height = S;
  const ctx = cnv.getContext('2d')!;
  const cx = S / 2;

  // Everything lives inside the medallion circle.
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cx, cx, 0, Math.PI * 2);
  ctx.clip();

  // The suede bed: lit heart, honest mid, worn edge — flat steps of
  // one material, not a glow.
  const bed = ctx.createRadialGradient(cx, cx * 0.82, S * 0.08, cx, cx, cx);
  bed.addColorStop(0, '#7f6c47');
  bed.addColorStop(0.55, BED_FILL);
  bed.addColorStop(1, '#4e422b');
  ctx.fillStyle = bed;
  ctx.fillRect(0, 0, S, S);

  // The ground the friend stands on: a darker earth band low in the
  // circle, its top edge softened by one lighter seam line.
  ctx.fillStyle = 'rgba(52, 42, 26, 0.5)';
  ctx.beginPath();
  ctx.ellipse(cx, S * 0.86, S * 0.62, S * 0.24, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(146, 124, 84, 0.4)';
  ctx.lineWidth = S * 0.012;
  ctx.beginPath();
  ctx.ellipse(cx, S * 0.86, S * 0.62, S * 0.24, 0, Math.PI * 1.05, Math.PI * 1.95);
  ctx.stroke();

  try {
    const radius = def?.radius ?? 0.3;
    const { spec, pose } = settledPose(species, radius, def?.speed ?? 2);
    const paint = (c2: CanvasRenderingContext2D, ax: number, ay: number, scale: number): void => {
      const feet = pose.feet.map((f: { x: number; y: number; lift: number }) => ({
        x: ax + f.x * scale,
        y: ay + f.y * scale * 0.55,
        lift: f.lift,
      }));
      drawBeast(c2, {
        x: ax,
        y: ay,
        scale,
        dir: pose.dir,
        radius,
        color: def?.color ?? '#999',
        defId: species,
        spec,
        pose,
        feet,
        yScale: 0.55,
        walkPhase: 0,
        hurt: false,
        kneeMemory: [],
        attackT: 0,
        seed,
        nowMs: 0,
        // The portrait wears the bond: strap and brass, like the body.
        collar: '#6e4a26',
      });
    };

    // EVERY FRIEND FILLS ITS FRAME: the rig draws species at world
    // proportions, so a beetle would rattle around in a well a bear
    // fills. First paint at a scout scale on scratch, measure the
    // true ink bounds, then refit so every animal stands the same
    // proud size in its medallion, feet on the same ground line.
    const scout = document.createElement('canvas');
    scout.width = S * 2;
    scout.height = S * 2;
    const sctx = scout.getContext('2d', { willReadFrequently: true })!;
    const scale0 = S * 0.4;
    paint(sctx, S, S, scale0);
    const img = sctx.getImageData(0, 0, S * 2, S * 2).data;
    let x0 = S * 2;
    let y0 = S * 2;
    let x1 = 0;
    let y1 = 0;
    for (let y = 0; y < S * 2; y++) {
      for (let x = 0; x < S * 2; x++) {
        if (img[(y * S * 2 + x) * 4 + 3]! > 8) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
      }
    }
    const bw = Math.max(1, x1 - x0);
    const bh = Math.max(1, y1 - y0);
    const k = Math.min((S * 0.68) / bw, (S * 0.58) / bh);
    const scale = scale0 * k;
    // Map the measured bottom-center onto the medallion's ground line.
    const gx = S * 0.5;
    const gy = S * 0.79;
    const ax = gx - ((x0 + x1) / 2 - S) * k;
    const ay = gy - (y1 - S) * k;
    // The standing shadow — under the body, before the body.
    ctx.fillStyle = 'rgba(20, 14, 8, 0.38)';
    ctx.beginPath();
    ctx.ellipse(gx, gy, (bw * k) / 2 + S * 0.05, S * 0.075, 0, 0, Math.PI * 2);
    ctx.fill();
    paint(ctx, ax, ay, scale);
  } catch {
    // A species the rig cannot pose still gets an honest medallion.
    ctx.fillStyle = def?.color ?? '#8a6234';
    ctx.beginPath();
    ctx.arc(cx, cx, S * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Seat the scene: a shade ring where the well's lip overhangs, and
  // one thin lit arc up on the light side. Hard steps, no bloom.
  ctx.strokeStyle = 'rgba(14, 10, 5, 0.4)';
  ctx.lineWidth = S * 0.075;
  ctx.beginPath();
  ctx.arc(cx, cx, cx - S * 0.03, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 236, 190, 0.14)';
  ctx.lineWidth = S * 0.02;
  ctx.beginPath();
  ctx.arc(cx, cx, cx - S * 0.055, Math.PI * 1.05, Math.PI * 1.6);
  ctx.stroke();
  ctx.restore();

  const url = cnv.toDataURL();
  cache.set(key, url);
  return url;
}

export function petPortraitUrl(species: string, size = 92, lookSeed?: number): string {
  const seed = lookSeed ?? 7;
  const key = `${species}|${seed}@${size}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const def = npcDef(species);
  const cnv = document.createElement('canvas');
  cnv.width = size;
  cnv.height = size;
  const ctx = cnv.getContext('2d')!;
  try {
    const radius = def?.radius ?? 0.3;
    // A few settled beats plant the feet at their home stance.
    const { spec, pose } = settledPose(species, radius, def?.speed ?? 2);
    const scale = size * 0.44;
    const ax = size * 0.5;
    const ay = size * 0.66;
    const feet = pose.feet.map((f: { x: number; y: number; lift: number }) => ({
      x: ax + f.x * scale,
      y: ay + f.y * scale * 0.55,
      lift: f.lift,
    }));
    drawBeast(ctx, {
      x: ax,
      y: ay,
      scale,
      dir: pose.dir,
      radius,
      color: def?.color ?? '#999',
      defId: species,
      spec,
      pose,
      feet,
      yScale: 0.55,
      walkPhase: 0,
      hurt: false,
      kneeMemory: [],
      attackT: 0,
      seed,
      nowMs: 0,
      // The portrait wears the bond: strap and brass, like the body.
      collar: '#6e4a26',
    });
  } catch {
    // A species the rig cannot pose still gets an honest medallion.
    ctx.fillStyle = def?.color ?? '#8a6234';
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size * 0.34, 0, Math.PI * 2);
    ctx.fill();
  }
  const url = cnv.toDataURL();
  cache.set(key, url);
  return url;
}
