/**
 * GRASS LAB (GPU grass, G-1) — proves the instanced blade renderer: a
 * live field of painterly blades bending to the ONE WIND, drawn by one
 * instanced draw call. Not a parity oracle (that's the canvas-side work);
 * a visual proof the renderer, the wind, and the tone ramp read as our
 * meadow.
 */
import { generateGrassTile, BLADE_FILLS, type Blade } from '../render/grass.js';
import { GrassGpuRenderer } from '../render/grassGpuRenderer.js';
import { packBladeInstances, GRASS_INSTANCE_FLOATS } from '../render/grassGpu.js';

const canvas = document.getElementById('gl') as HTMLCanvasElement;
const gl = canvas.getContext('webgl2', { alpha: false, antialias: true })!;
if (!gl) throw new Error('webgl2 unavailable');

const renderer = new GrassGpuRenderer(gl, BLADE_FILLS);

// A field of tiles → blades. Varied tile/detail ids for strand/stand/
// clump/flower variety, exactly as the meadow deals them.
const NX = 20;
const NY = 13;
const blades: Blade[] = [];
// A cheap hash for the dense coat scatter (deterministic per tile+i).
const h2 = (a: number, b: number): number => {
  let n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return n - Math.floor(n);
};
for (let ty = 0; ty < NY; ty++) {
  for (let tx = 0; tx < NX; tx++) {
    const tileId = 1; // a grass ground tile
    const detailId = (tx * 7 + ty * 3) % 11 === 0 ? 3 : 0; // scatter tufts
    const g = generateGrassTile(tx, ty, tileId, detailId);
    for (const b of g.under) blades.push(b);
    for (const b of g.north) blades.push(b);
    for (const b of g.south) blades.push(b);
    // THE COAT (density): the GPU affords a lush carpet the baked meadow
    // paints — scatter short nap blades to close the ground. ~26/tile.
    const COAT = 26;
    for (let i = 0; i < COAT; i++) {
      const rx = h2(tx * 13 + i, ty * 7 + i * 3);
      const ry = h2(ty * 17 + i * 5, tx * 11 + i);
      const rh = h2(i * 2 + tx, i * 3 + ty);
      blades.push({
        bx: tx + rx,
        by: ty + ry,
        h: 0.16 + rh * 0.32, // short coat blades
        w: 0.022 + rh * 0.01,
        lean: (h2(i, tx + ty) - 0.5) * 0.18,
        phase: h2(i * 4 + tx, i + ty * 2),
        bin: 0,
        lumJit: 0,
        tone: Math.floor(h2(tx + i, ty - i) * 8), // full tone range incl. nap
        seg2: false,
      });
    }
  }
}
// Root-up sort so nearer (larger by) blades draw over farther ones.
blades.sort((a, b) => a.by - b.by);
const instances = new Float32Array(blades.length * GRASS_INSTANCE_FLOATS);
packBladeInstances(blades, instances);
renderer.upload(instances, blades.length);
(document.getElementById('count') as HTMLElement).textContent =
  `${blades.length.toLocaleString()} blades · 1 instanced draw`;

// World→clip: fit the NX×NY field with margin, y flipped (world-y down =
// screen down). Column-major 3×3.
function viewMatrix(): Float32Array {
  const cx = NX / 2;
  const cy = NY / 2 + 2; // bias so blades (which grow up) sit lower
  const sx = (2 * 0.92) / NX;
  const sy = (2 * 0.92) / NY;
  const m = new Float32Array(9);
  m[0] = sx; m[1] = 0; m[2] = 0;
  m[3] = 0; m[4] = -sy; m[5] = 0;
  m[6] = -cx * sx; m[7] = cy * sy; m[8] = 1;
  return m;
}
const view = viewMatrix();

function resize(): void {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(canvas.clientWidth * dpr);
  canvas.height = Math.round(canvas.clientHeight * dpr);
}
resize();
window.addEventListener('resize', resize);

const start = performance.now();
function frame(): void {
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0.39, 0.53, 0.33, 1); // meadow ground green
  gl.clear(gl.COLOR_BUFFER_BIT);
  renderer.draw(view, (performance.now() - start) / 1000, 0.6, 1);
  requestAnimationFrame(frame);
}
frame();
// A stable flag the screenshot probe can wait on.
(window as unknown as { grassLabReady?: boolean }).grassLabReady = true;
