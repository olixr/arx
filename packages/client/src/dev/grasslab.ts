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
for (let ty = 0; ty < NY; ty++) {
  for (let tx = 0; tx < NX; tx++) {
    const tileId = 1; // a grass ground tile
    const detailId = (tx * 7 + ty * 3) % 11 === 0 ? 3 : 0; // scatter tufts (DETAIL_TUFT=3-ish)
    const g = generateGrassTile(tx, ty, tileId, detailId);
    for (const b of g.under) blades.push(b);
    for (const b of g.north) blades.push(b);
    for (const b of g.south) blades.push(b);
  }
}
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
