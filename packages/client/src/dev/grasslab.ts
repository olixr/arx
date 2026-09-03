/**
 * GRASS LAB (GPU grass, G-1) — proves the instanced blade renderer: a
 * live field of painterly blades bending to the ONE WIND, drawn by one
 * instanced draw call. Not a parity oracle (that's the canvas-side work);
 * a visual proof the renderer, the wind, and the tone ramp read as our
 * meadow.
 */
import { generateGrassTile, BLADE_FILLS, type Blade } from '../render/grass.js';
import { GrassGpuRenderer } from '../render/grassGpuRenderer.js';
import { packBladeInstances, GRASS_INSTANCE_FLOATS, type GrassProj } from '../render/grassGpu.js';

const canvas = document.getElementById('gl') as HTMLCanvasElement;
const gl = canvas.getContext('webgl2', { alpha: false, antialias: true })!;
if (!gl) throw new Error('webgl2 unavailable');

const renderer = new GrassGpuRenderer(gl, BLADE_FILLS);

// A field of tiles → blades. Varied tile/detail ids for strand/stand/
// clump/flower variety, exactly as the meadow deals them.
// A CLOSE hero window (few tiles, big blades) so the blocky blade shape
// and flat tone facets read at a judgeable size — the game-zoom profile,
// not a top-down carpet.
const NX = 9;
const NY = 6;
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
    // paints — scatter short nap blades to close the ground. ~36/tile.
    const COAT = 36;
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

// World→screen: fit the NX×NY field with margin, in the projectWorld terms
// the shader now consumes (GrassProj). Ortho (q=0). The lab has separate
// x/y fits, folded into scale (x px/world) + yScale (y/x ratio). The centre
// (NX/2, NY/2+2 — a bias so blades, which grow up, sit lower) lands mid-view.
function viewProj(): GrassProj {
  const vw = canvas.width;
  const vh = canvas.height;
  const cx = NX / 2;
  const cy = NY / 2 + 2;
  const xPx = (0.92 * vw) / NX; // world unit → px along x
  const yPx = (0.92 * vh) / NY;
  const scale = xPx;
  const yScale = yPx / xPx;
  return {
    scale,
    yScale,
    ox: vw / 2 - cx * scale,
    oy: vh / 2 - cy * scale * yScale,
    q: 0,
    wCss: vw,
    hCss: vh,
  };
}

function resize(): void {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(canvas.clientWidth * dpr);
  canvas.height = Math.round(canvas.clientHeight * dpr);
}
resize();
window.addEventListener('resize', resize);

// `#still` parks the walker mid-field for a clean trampling screenshot.
const STILL = location.hash.includes('still');
// One walker crossing the field — proves trampling: blades splay outward
// and press flat around it, springing back as it passes. The scene feeds
// real player/entity positions into this same array.
const disturb = new Float32Array(4);

const start = performance.now();
function frame(): void {
  const t = (performance.now() - start) / 1000;
  const wx = STILL ? NX * 0.5 : NX * 0.5 + Math.cos(t * 0.5) * NX * 0.3;
  const wy = STILL ? NY * 0.52 : NY * 0.5 + Math.sin(t * 0.5) * NY * 0.28;
  disturb[0] = wx;
  disturb[1] = wy;
  disturb[2] = 1.5; // radius (tiles) ≈ a character's footprint — the scene
  disturb[3] = 1.0; // sizes this per entity (a boar treads wider than a fox)
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0.39, 0.53, 0.33, 1); // meadow ground green
  gl.clear(gl.COLOR_BUFFER_BIT);
  renderer.draw(viewProj(), t, { windGain: 0.12, disturb });
  requestAnimationFrame(frame);
}
frame();
// A stable flag the screenshot probe can wait on.
(window as unknown as { grassLabReady?: boolean }).grassLabReady = true;
