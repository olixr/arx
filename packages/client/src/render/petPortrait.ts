/**
 * The companion's face, painted once per species by the same rig
 * that walks the body through the world — a portrait, never a
 * placeholder glyph. Shared by the stalls panel and the HUD chip so
 * both surfaces show the same animal.
 */
import { npcDef } from '@arx/content';
import { beastSpec, drawBeast } from './rig.js';
import { LegRig } from './legs.js';

const cache = new Map<string, string>();

export function petPortraitUrl(species: string, size = 92): string {
  const key = `${species}@${size}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const def = npcDef(species);
  const cnv = document.createElement('canvas');
  cnv.width = size;
  cnv.height = size;
  const ctx = cnv.getContext('2d')!;
  try {
    const radius = def?.radius ?? 0.3;
    const spec = beastSpec(species, radius, def?.speed ?? 2);
    const rig = new LegRig(spec.rig);
    // A few settled beats plant the feet at their home stance.
    let pose = rig.update(0, 0, Math.PI, 1 / 20);
    for (let i = 0; i < 8; i++) pose = rig.update(0, 0, Math.PI, 1 / 20);
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
      seed: 7,
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
