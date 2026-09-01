/**
 * STAGE LAB — the phase-A0 parity harness (docs/painted-stage-plan.md
 * §3-A0, law 6: PARITY OR IT DIDN'T HAPPEN).
 *
 * Every case builds ONE item stream and composites it through BOTH
 * backends — GlStage and the CanvasStage oracle — then diffs the
 * frames pixel-for-pixel through the same readback path (both copied
 * onto plain 2d canvases first, so encode/decode is identical). Each
 * case carries its own verdict policy, because "identical" has three
 * honest tiers:
 *
 *  - exact:   snapped, axis-aligned, opaque work — the DEVICE GRID
 *             world — must match to the bit. Any nonzero diff fails.
 *  - le1:     alpha blending crosses one premultiply round-trip per
 *             backend; ±1 per channel is arithmetic, not error.
 *  - sampled: resampling paths (shear, non-integer scale) where GL
 *             bilinear and canvas2d bilinear may round differently on
 *             interpolated texels; the policy bounds the population
 *             (>2-per-channel pixels under 1%) instead of the worst
 *             texel. The REAL pipeline snaps to the lattice, so these
 *             paths carry animated content where ±LSB is unseeable.
 *
 * Headless drivers read window.__stagelab; humans read the page.
 */
import { CanvasStage } from '../render/stage/canvasStage.js';
import { GlStage } from '../render/stage/glStage.js';
import {
  StageBlend,
  stageAt,
  type StageItem,
  type StageMatrix,
  type StageTexture,
} from '../render/stage/stageTypes.js';

const W = 160;
const H = 120;
const CLEAR = '#141020';

interface CaseResult {
  name: string;
  policy: 'exact' | 'le1' | 'sampled' | 'info';
  max: number;
  mean: number;
  over1: number;
  over2: number;
  pixels: number;
  pass: boolean;
  note?: string;
}

const results: CaseResult[] = [];
const lab = ((window as unknown as Record<string, unknown>).__stagelab = {
  done: false,
  results,
});

/** Deterministic PRNG — the batch-order case must be reproducible. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/** Source art A: opaque checker + diagonal gradient (hard edges AND
 *  smooth ramps — the two failure surfaces of any sampler). */
function paintChecker(): HTMLCanvasElement {
  const c = makeCanvas(64, 64);
  const g = c.getContext('2d')!;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      g.fillStyle = (x + y) & 1 ? '#4e8f3a' : '#2c5a7a';
      g.fillRect(x * 8, y * 8, 8, 8);
    }
  }
  const grad = g.createLinearGradient(0, 0, 64, 64);
  grad.addColorStop(0, 'rgba(255,200,60,0.85)');
  grad.addColorStop(1, 'rgba(60,20,120,0.15)');
  g.fillStyle = grad;
  g.fillRect(12, 12, 40, 40);
  return c;
}

/** Source art B: an alpha sprite with transparent margins — the shape
 *  every tree/prop sprite has. */
function paintSprite(): HTMLCanvasElement {
  const c = makeCanvas(48, 48);
  const g = c.getContext('2d')!;
  const r = g.createRadialGradient(24, 24, 2, 24, 24, 20);
  r.addColorStop(0, 'rgba(220,240,190,1)');
  r.addColorStop(0.7, 'rgba(90,150,70,0.9)');
  r.addColorStop(1, 'rgba(90,150,70,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, 48, 48);
  g.fillStyle = '#241a2e';
  g.fillRect(21, 26, 6, 18);
  return c;
}

/** Source art C: a full alpha ramp — premultiply round-trip probe. */
function paintRamp(): HTMLCanvasElement {
  const c = makeCanvas(32, 32);
  const g = c.getContext('2d')!;
  for (let x = 0; x < 32; x++) {
    g.fillStyle = `rgba(200,80,140,${(x / 31).toFixed(3)})`;
    g.fillRect(x, 0, 1, 32);
  }
  return c;
}

function tex(canvas: HTMLCanvasElement, filter: 'linear' | 'nearest' = 'linear'): StageTexture {
  return { canvas, rev: 0, filter };
}

const srcChecker = paintChecker();
const srcSprite = paintSprite();
const srcRamp = paintRamp();

/** Read a backend's canvas through a fresh 2d canvas so BOTH sides
 *  decode through the identical path. */
function readback(c: HTMLCanvasElement): ImageData {
  const rb = makeCanvas(c.width, c.height);
  const g = rb.getContext('2d')!;
  g.drawImage(c, 0, 0);
  return g.getImageData(0, 0, c.width, c.height);
}

function diffImages(a: ImageData, b: ImageData): { max: number; mean: number; over1: number; over2: number; px: number; diff: ImageData } {
  const out = new ImageData(a.width, a.height);
  let max = 0;
  let sum = 0;
  let over1 = 0;
  let over2 = 0;
  const n = a.width * a.height;
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    let pmax = 0;
    for (let ch = 0; ch < 4; ch++) {
      const d = Math.abs(a.data[o + ch]! - b.data[o + ch]!);
      if (d > pmax) pmax = d;
    }
    if (pmax > max) max = pmax;
    sum += pmax;
    if (pmax > 1) over1++;
    if (pmax > 2) over2++;
    // Amplified diff for the eyeball row.
    const v = Math.min(255, pmax * 32);
    out.data[o] = v;
    out.data[o + 1] = pmax > 0 ? 40 : 0;
    out.data[o + 2] = 0;
    out.data[o + 3] = 255;
  }
  return { max, mean: sum / n, over1, over2, px: n, diff: out };
}

interface StageCase {
  name: string;
  policy: CaseResult['policy'];
  dpr?: number;
  items: () => StageItem[];
  note?: string;
}

function quad(
  t: StageTexture,
  m: StageMatrix,
  o: Partial<{ sx: number; sy: number; sw: number; sh: number; dw: number; dh: number; alpha: number; blend: StageBlend }> = {},
): StageItem {
  const sw = o.sw ?? t.canvas.width;
  const sh = o.sh ?? t.canvas.height;
  return {
    kind: 'quad',
    tex: t,
    sx: o.sx ?? 0,
    sy: o.sy ?? 0,
    sw,
    sh,
    dw: o.dw ?? sw,
    dh: o.dh ?? sh,
    m,
    alpha: o.alpha ?? 1,
    blend: o.blend ?? StageBlend.SourceOver,
  };
}

const CASES: StageCase[] = [
  {
    name: 'opaque-aligned',
    policy: 'exact',
    items: () => [quad(tex(srcChecker, 'nearest'), stageAt(8, 8))],
  },
  {
    name: 'subrect-gutter',
    policy: 'exact',
    items: () => [quad(tex(srcChecker, 'nearest'), stageAt(20, 12), { sx: 8, sy: 8, sw: 48, sh: 48 })],
  },
  {
    name: 'dpr-2-lattice',
    policy: 'exact',
    dpr: 2,
    items: () => [quad(tex(srcChecker, 'nearest'), stageAt(9, 7))],
  },
  {
    name: 'alpha-sprite-over',
    policy: 'le1',
    items: () => [
      { kind: 'fill', color: 0x6a4a2a, dw: 100, dh: 80, m: stageAt(10, 10), alpha: 1, blend: StageBlend.SourceOver },
      quad(tex(srcSprite, 'nearest'), stageAt(24, 18)),
      quad(tex(srcRamp, 'nearest'), stageAt(70, 30), { alpha: 0.5 }),
    ],
  },
  {
    name: 'blend-lighter',
    policy: 'le1',
    items: () => [
      { kind: 'fill', color: 0x304050, dw: W, dh: H, m: stageAt(0, 0), alpha: 1, blend: StageBlend.SourceOver },
      { kind: 'fill', color: 0x402818, dw: 80, dh: 60, m: stageAt(20, 20), alpha: 1, blend: StageBlend.Lighter },
      quad(tex(srcSprite, 'nearest'), stageAt(60, 30), { blend: StageBlend.Lighter, alpha: 0.7 }),
    ],
  },
  {
    name: 'blend-multiply',
    policy: 'le1',
    items: () => [
      { kind: 'fill', color: 0xc8b088, dw: W, dh: H, m: stageAt(0, 0), alpha: 1, blend: StageBlend.SourceOver },
      // The lightmap's own shape: a colored quad multiplied over an
      // opaque frame, plus a half-alpha multiply (dusk edges).
      { kind: 'fill', color: 0x8090ff, dw: 100, dh: 70, m: stageAt(15, 15), alpha: 1, blend: StageBlend.Multiply },
      { kind: 'fill', color: 0xff8060, dw: 60, dh: 40, m: stageAt(70, 50), alpha: 0.5, blend: StageBlend.Multiply },
    ],
  },
  {
    name: 'blend-screen',
    policy: 'le1',
    items: () => [
      { kind: 'fill', color: 0x243048, dw: W, dh: H, m: stageAt(0, 0), alpha: 1, blend: StageBlend.SourceOver },
      { kind: 'fill', color: 0x503820, dw: 90, dh: 60, m: stageAt(30, 25), alpha: 1, blend: StageBlend.Screen },
    ],
  },
  // destination-out (the interior punch) is deliberately ABSENT from
  // the composite cases: it is an alpha-target blend, refused by
  // contract on the opaque main frame by BOTH backends — the
  // contract-refusal case at the end of the battery proves it. Phase
  // A3's alpha FBO layer is where it composites for real.
  {
    name: 'blend-destover',
    policy: 'le1',
    items: () => [
      quad(tex(srcSprite, 'nearest'), stageAt(30, 20)),
      { kind: 'fill', color: 0x225533, dw: 80, dh: 60, m: stageAt(20, 15), alpha: 1, blend: StageBlend.DestinationOver },
    ],
  },
  {
    name: 'shear-tree',
    policy: 'sampled',
    items: () => {
      const k = 0.12;
      const gy = 90;
      const dx0 = 40;
      const dy0 = 30;
      // The tree lane's exact composition: ctx.transform(1,0,-k,1,k·gy,0)
      // around drawImage at (dx0,dy0) → local (x,y) lands at
      // (x + dx0 − k·(y + dy0) + k·gy, y + dy0).
      const m: StageMatrix = [1, 0, -k, 1, dx0 + k * (gy - dy0), dy0];
      return [quad(tex(srcSprite), m, { dw: 48, dh: 60 })];
    },
  },
  {
    name: 'scale-up-linear',
    policy: 'sampled',
    items: () => [quad(tex(srcSprite), stageAt(12, 8), { dw: 96, dh: 96 })],
  },
  {
    name: 'scale-down-linear',
    policy: 'info',
    note: 'downscale filtering differs by design (canvas2d quality tiers); real pipeline blits near 1:1',
    items: () => [quad(tex(srcChecker), stageAt(30, 30), { dw: 40, dh: 40 })],
  },
  {
    name: 'fractional-dest',
    policy: 'info',
    note: 'unsnapped dest — the DEVICE GRID law forbids this on the real lattice; informational',
    items: () => [quad(tex(srcSprite), stageAt(20.5, 14.25))],
  },
  {
    // ORDER is what this case proves: any reorder misplaces whole
    // quads and lights up hundreds of >2 pixels. The population
    // policy (not le1) because 300 stacked alpha composites can
    // accumulate a legitimate ±1-per-op rounding drift.
    name: 'batch-order-300',
    policy: 'sampled',
    items: () => {
      const rnd = mulberry32(0x5eed);
      const texes = [tex(srcChecker, 'nearest'), tex(srcSprite, 'nearest'), tex(srcRamp, 'nearest')];
      const items: StageItem[] = [];
      for (let i = 0; i < 300; i++) {
        const t = texes[i % 3]!;
        const x = Math.floor(rnd() * (W - 30));
        const y = Math.floor(rnd() * (H - 30));
        if (i % 7 === 3) {
          items.push({
            kind: 'fill',
            color: (Math.floor(rnd() * 0xffffff)) | 0,
            dw: 12,
            dh: 9,
            m: stageAt(x, y),
            alpha: 1,
            blend: StageBlend.SourceOver,
          });
        } else {
          // 1:1 subrect blits — sampling stays exact, so any diff
          // this case shows is ORDER, the thing it exists to prove.
          const cw = t.canvas.width;
          const ch = t.canvas.height;
          const sx = Math.floor(rnd() * (cw - 24));
          const sy = Math.floor(rnd() * (ch - 24));
          items.push(quad(t, stageAt(x, y), { sx, sy, sw: 24, sh: 24, dw: 24, dh: 24 }));
        }
      }
      return items;
    },
  },
];

const PAINT_CASES: StageCase[] = [
  {
    // THE SCRATCH LANE: a live brush between quads, painting art that
    // deliberately CROSSES its declared bounds — both backends must
    // clip at the same edge, so the overflow is equally absent.
    name: 'paint-scratch-clip',
    policy: 'le1',
    items: () => [
      quad(tex(srcChecker, 'nearest'), stageAt(6, 6)),
      {
        kind: 'paint',
        px: 30,
        py: 20,
        pw: 40,
        ph: 30,
        paint: (ctx) => {
          ctx.fillStyle = '#d04870';
          ctx.fillRect(34, 24, 20, 14);
          ctx.strokeStyle = '#f0e0a0';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(50, 35, 11, 0, Math.PI * 2);
          ctx.stroke();
          // The overflow: a slab reaching well past the bounds.
          ctx.fillStyle = '#3070c0';
          ctx.fillRect(60, 15, 40, 50);
        },
      },
      quad(tex(srcSprite, 'nearest'), stageAt(52, 28)),
    ],
  },
  {
    // Two paint items of different size classes plus a same-class
    // reuse — the pooled pair must serve them sequentially.
    name: 'paint-scratch-reuse',
    policy: 'le1',
    items: () => [
      { kind: 'paint', px: 4, py: 4, pw: 30, ph: 20, paint: (ctx) => { ctx.fillStyle = '#405030'; ctx.fillRect(4, 4, 30, 20); } },
      { kind: 'paint', px: 40, py: 4, pw: 30, ph: 20, paint: (ctx) => { ctx.fillStyle = '#807030'; ctx.fillRect(40, 4, 28, 18); } },
      { kind: 'paint', px: 76, py: 4, pw: 70, ph: 60, paint: (ctx) => { ctx.fillStyle = '#306070'; ctx.fillRect(78, 8, 60, 50); } },
    ],
  },
];

function runCase(c: StageCase, gl: GlStage, oracle: CanvasStage): { res: CaseResult; glImg: ImageData; cvImg: ImageData; diff: ImageData } {
  const dpr = c.dpr ?? 1;
  const items = c.items();
  gl.begin(W, H, dpr, CLEAR);
  gl.draw(items);
  gl.end();
  oracle.begin(W, H, dpr, CLEAR);
  oracle.draw(items);
  oracle.end();
  const glImg = readback(gl.canvas);
  const cvImg = readback(oracle.canvas);
  const d = diffImages(glImg, cvImg);
  let pass: boolean;
  switch (c.policy) {
    case 'exact':
      pass = d.max === 0;
      break;
    case 'le1':
      pass = d.max <= 1;
      break;
    case 'sampled':
      pass = d.over2 / d.px < 0.01;
      break;
    default:
      pass = true;
  }
  return {
    res: { name: c.name, policy: c.policy, max: d.max, mean: d.mean, over1: d.over1, over2: d.over2, pixels: d.px, pass, note: c.note },
    glImg,
    cvImg,
    diff: d.diff,
  };
}

function show(name: string, res: CaseResult, glImg: ImageData, cvImg: ImageData, diff: ImageData): void {
  const host = document.getElementById('cases')!;
  const div = document.createElement('div');
  div.className = 'case';
  const cls = res.policy === 'info' ? 'info' : res.pass ? 'pass' : 'fail';
  const h = document.createElement('h2');
  h.innerHTML = `<span class="${cls}">${res.pass ? (res.policy === 'info' ? 'INFO' : 'PASS') : 'FAIL'}</span> ${name} — max ${res.max} mean ${res.mean.toFixed(3)} >1:${res.over1} >2:${res.over2} (${res.policy})${res.note ? ` — ${res.note}` : ''}`;
  div.appendChild(h);
  const row = document.createElement('div');
  row.className = 'row';
  for (const [cap, img] of [['gl', glImg], ['oracle', cvImg], ['diff ×32', diff]] as const) {
    const fig = document.createElement('figure');
    const cv = makeCanvas(img.width, img.height);
    cv.getContext('2d')!.putImageData(img, 0, 0);
    cv.style.width = `${img.width}px`;
    const capEl = document.createElement('figcaption');
    capEl.textContent = cap;
    fig.appendChild(cv);
    fig.appendChild(capEl);
    row.appendChild(fig);
  }
  div.appendChild(row);
  host.appendChild(div);
}

async function main(): Promise<void> {
  const gl = new GlStage(makeCanvas(W, H));
  const oracle = new CanvasStage(makeCanvas(W, H));
  for (const c of CASES) {
    const { res, glImg, cvImg, diff } = runCase(c, gl, oracle);
    results.push(res);
    show(c.name, res, glImg, cvImg, diff);
  }

  for (const c of PAINT_CASES) {
    const { res, glImg, cvImg, diff } = runCase(c, gl, oracle);
    results.push(res);
    show(c.name, res, glImg, cvImg, diff);
  }

  // THE ALPHA STAGE: the world layer's contract — transparent clear,
  // quads + a paint over it, diffed WITH the alpha channel (the
  // readback compares straight RGBA, so layer transparency is part
  // of the parity claim, not flattened away).
  {
    const aGl = new GlStage(makeCanvas(W, H), { alpha: true });
    const aOracle = new CanvasStage(makeCanvas(W, H), { alpha: true });
    const items: StageItem[] = [
      quad(tex(srcSprite, 'nearest'), stageAt(20, 12)),
      { kind: 'fill', color: 0x902020, dw: 50, dh: 30, m: stageAt(60, 40), alpha: 0.6, blend: StageBlend.Lighter },
      { kind: 'paint', px: 90, py: 60, pw: 50, ph: 40, paint: (ctx) => { ctx.fillStyle = 'rgba(40,160,90,0.8)'; ctx.fillRect(92, 62, 40, 30); } },
    ];
    aGl.begin(W, H, 1, null);
    aGl.draw(items);
    aGl.end();
    aOracle.begin(W, H, 1, null);
    aOracle.draw(items);
    aOracle.end();
    const glImg = readback(aGl.canvas);
    const cvImg = readback(aOracle.canvas);
    const d = diffImages(glImg, cvImg);
    const res: CaseResult = { name: 'alpha-stage-layer', policy: 'le1', max: d.max, mean: d.mean, over1: d.over1, over2: d.over2, pixels: d.px, pass: d.max <= 1 };
    results.push(res);
    show('alpha-stage-layer', res, glImg, cvImg, d.diff);

    // The mirrored refusals: multiply on the alpha stage; transparent
    // clear on the opaque one. Same words on both backends.
    const threw2 = (fn: () => void): string | null => {
      try {
        fn();
        return null;
      } catch (e) {
        return (e as Error).message;
      }
    };
    const mulItems: StageItem[] = [
      { kind: 'fill', color: 0x808080, dw: 10, dh: 10, m: stageAt(2, 2), alpha: 1, blend: StageBlend.Multiply },
    ];
    aGl.begin(W, H, 1, null);
    const gm = threw2(() => aGl.draw(mulItems));
    aGl.end();
    aOracle.begin(W, H, 1, null);
    const cm = threw2(() => aOracle.draw(mulItems));
    aOracle.end();
    const gc = threw2(() => gl.begin(W, H, 1, null));
    const cc = threw2(() => oracle.begin(W, H, 1, null));
    // THE SHADOW LAYER RIDES THE STAGE (A3): drawLayer renders a
    // stream into an offscreen alpha layer — where the interior punch
    // (destination-out) is LEGAL even over the opaque main stage —
    // and composites once at the layer alpha. Pins the FBO's Y
    // orientation, the punch, and the composite in one image.
    {
      const layerItems: StageItem[] = [
        { kind: 'fill', color: 0x181020, dw: 90, dh: 60, m: stageAt(15, 20), alpha: 1, blend: StageBlend.SourceOver },
        quad(tex(srcSprite, 'linear'), stageAt(70, 30)),
        { kind: 'fill', color: 0x000000, dw: 30, dh: 22, m: stageAt(40, 35), alpha: 1, blend: StageBlend.DestinationOut },
      ];
      const worldItems: StageItem[] = [
        { kind: 'fill', color: 0x3a7a3a, dw: 40, dh: 26, m: stageAt(90, 70), alpha: 1, blend: StageBlend.SourceOver },
      ];
      gl.begin(W, H, 1, '#6a8a5a');
      gl.drawLayer(layerItems, 0.42);
      gl.draw(worldItems);
      gl.end();
      oracle.begin(W, H, 1, '#6a8a5a');
      oracle.drawLayer(layerItems, 0.42);
      oracle.draw(worldItems);
      oracle.end();
      const gImg = readback(gl.canvas);
      const cImg = readback(oracle.canvas);
      const d2 = diffImages(gImg, cImg);
      const res2: CaseResult = { name: 'shadow-layer-punch', policy: 'le1', max: d2.max, mean: d2.mean, over1: d2.over1, over2: d2.over2, pixels: d2.px, pass: d2.max <= 1 };
      results.push(res2);
      show('shadow-layer-punch', res2, gImg, cImg, d2.diff);
    }

    const ok = gm !== null && gm === cm && gc !== null && gc === cc;
    results.push({
      name: 'contract-alpha-symmetry',
      policy: 'exact',
      max: 0,
      mean: 0,
      over1: 0,
      over2: 0,
      pixels: 0,
      pass: ok,
      note: ok ? `refused: "${gm}" / "${gc}"` : `gl:${gm} cv:${cm} | gl:${gc} cv:${cc}`,
    });
  }

  // The contract-refusal case: destination-out on the opaque main
  // target must be refused by BOTH backends, with the same words —
  // a contract error may never depend on which backend caught it.
  {
    const punch: StageItem[] = [
      { kind: 'fill', color: 0x000000, dw: 10, dh: 10, m: stageAt(5, 5), alpha: 0.5, blend: StageBlend.DestinationOut },
    ];
    const threw = (fn: () => void): string | null => {
      try {
        fn();
        return null;
      } catch (e) {
        return (e as Error).message;
      }
    };
    gl.begin(W, H, 1, CLEAR);
    const glMsg = threw(() => gl.draw(punch));
    gl.end();
    oracle.begin(W, H, 1, CLEAR);
    const cvMsg = threw(() => oracle.draw(punch));
    oracle.end();
    const pass = glMsg !== null && glMsg === cvMsg;
    results.push({
      name: 'contract-alpha-target-refused',
      policy: 'exact',
      max: 0,
      mean: 0,
      over1: 0,
      over2: 0,
      pixels: 0,
      pass,
      note: pass ? `both refused: "${glMsg}"` : `gl: ${glMsg ?? 'ACCEPTED'} / oracle: ${cvMsg ?? 'ACCEPTED'}`,
    });
  }

  // THE TOGGLE IS THE PRODUCT'S SAFETY — the context-loss drill.
  // Lose the context mid-session, confirm the flag trips (the game
  // flips to the canvas backend on it), restore, and confirm the GL
  // stage comes back with lazily re-uploaded textures.
  {
    const glc = gl.canvas.getContext('webgl2') as WebGL2RenderingContext;
    const ext = glc.getExtension('WEBGL_lose_context');
    let res: CaseResult;
    if (!ext) {
      res = { name: 'context-loss-drill', policy: 'info', max: 0, mean: 0, over1: 0, over2: 0, pixels: 0, pass: true, note: 'WEBGL_lose_context unavailable' };
      results.push(res);
    } else {
      const lost = new Promise<void>((r) => {
        const prev = gl.onContextLost;
        gl.onContextLost = () => {
          prev?.();
          r();
        };
      });
      ext.loseContext();
      await lost;
      const flagged = gl.contextLost === true;
      const restored = new Promise<boolean>((r) => {
        gl.canvas.addEventListener('webglcontextrestored', () => r(true), { once: true });
        setTimeout(() => r(false), 3000);
      });
      // restoreContext() is refused while the loss event is still
      // dispatching — the awaited microtask above resolves INSIDE the
      // handler. Step out to a macrotask first.
      await new Promise((r) => setTimeout(r, 0));
      ext.restoreContext();
      const cameBack = await restored;
      // Give the restore handler its turn, then re-render case 0.
      await new Promise((r) => setTimeout(r, 50));
      if (!cameBack) {
        results.push({ name: 'context-loss-drill', policy: 'exact', max: 0, mean: 0, over1: 0, over2: 0, pixels: 0, pass: false, note: 'restore never fired' });
        lab.done = true;
        return;
      }
      const { res: rerun, glImg, cvImg, diff } = runCase(CASES[0]!, gl, oracle);
      res = {
        name: 'context-loss-drill',
        policy: 'exact',
        max: rerun.max,
        mean: rerun.mean,
        over1: rerun.over1,
        over2: rerun.over2,
        pixels: rerun.pixels,
        pass: flagged && !gl.contextLost && rerun.pass,
        note: flagged ? 'lost→flagged→restored→re-rendered' : 'contextLost flag NEVER tripped',
      };
      results.push(res);
      show('context-loss-drill', res, glImg, cvImg, diff);
    }
  }

  const failed = results.filter((r) => !r.pass);
  const h = document.createElement('h1');
  h.textContent = failed.length === 0 ? `ALL ${results.length} CASES PASS` : `${failed.length}/${results.length} FAILED`;
  h.className = failed.length === 0 ? 'pass' : 'fail';
  document.body.prepend(h);
  lab.done = true;
}

void main();
