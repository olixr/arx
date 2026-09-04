/**
 * The WebGL2 stage — the compositor (plan §3-A0).
 *
 * One program, one interleaved dynamic vertex buffer, textures that
 * are shadows of paint-factory canvases, draw calls batched over
 * ADJACENT same-state items only. Deliberately raw WebGL2: the frame
 * is a sorted 2D stream, and a scene graph would be a second opinion
 * about order that nothing is allowed to hold.
 *
 * What this phase does NOT do, on purpose:
 *  - StagePaint items are refused loudly (phase A2 brings the
 *    scratch-quad lane); a silent skip would be round 7's
 *    invisibility bug reborn.
 *  - Uploads are immediate (phase A1 brings the budget/pacing
 *    economy); the ledger is already exact so A1 only adds pacing.
 *  - No FBOs, no scissor/stencil clips (phase A3's shadow layer
 *    introduces them against their real consumers).
 *
 * Premultiplied alpha everywhere: canvases upload through
 * UNPACK_PREMULTIPLY_ALPHA_WEBGL, vertex colors are premultiplied at
 * write time, and the context is created premultipliedAlpha:true so
 * the presented frame composites with the page identically to a 2d
 * canvas. Blend derivations live in stageBlend.ts.
 */
import { computeRuns } from './stageBatch.js';
import { BLEND_GL_FUNC, blendNeedsAlphaTarget, blendNeedsOpaqueTarget } from './stageBlend.js';
import { GPU_COST_SEED_MS_PER_MB, GPU_URGENT_MS, admitUpload, nextUploadCost, uploadEstMs } from './gpuBudget.js';
import type { GpuStageBackend, GpuStageOpts, StageItem, StagePaint, StageTexture } from './stageTypes.js';
import { StageVram } from './stageVram.js';
import type { EvictCandidate, VramLanes } from './stageVram.js';

/** Wall-clock ms, with a monotonic-free fallback for hosts (some test
 *  shims) that lack performance.now(). */
const nowMs = (): number =>
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();

const VERT_SRC = `#version 300 es
layout(location=0) in vec2 aPos;
layout(location=1) in vec2 aUV;
layout(location=2) in vec4 aCol;
layout(location=3) in float aW;
uniform vec2 uRes;
out vec2 vUV;
out vec4 vCol;
void main() {
  // Per-vertex homogeneous w (kept from Epic B, harmless): every quad
  // passes aW=1, so this is exactly the orthographic map. A non-affine
  // effect could hand each corner its own weight and the hardware would
  // interpolate perspective-correct across the quad.
  vec2 c = (aPos / uRes) * 2.0 - 1.0;
  gl_Position = vec4(c.x * aW, -c.y * aW, 0.0, aW);
  vUV = aUV;
  vCol = aCol;
}`;

const FRAG_SRC = `#version 300 es
precision mediump float;
uniform sampler2D uTex;
in vec2 vUV;
in vec4 vCol;
out vec4 outColor;
void main() {
  outColor = texture(uTex, vUV) * vCol;
}`;

/** Bytes per vertex: pos 2f (8) + uv 2f (8) + color 4×u8 (4) + w 1f (4)
 *  = 6 float slots. Every emit writes w=1 (the affine map), so the
 *  attribute is inert on screen output; it is kept as the harmless hook
 *  a non-affine effect could hand per-corner weights through. */
const VERTEX_BYTES = 24;
const VERTS_PER_QUAD = 6;

interface TexRecord {
  glTex: WebGLTexture;
  uploadedRev: number;
  w: number;
  h: number;
  bytes: number;
  filter: 'linear' | 'nearest';
  /** Frame stamp of the last ensure/draw — the orphan sweep's clock. */
  used: number;
  /** Wall-clock ms of the last touch — the cross-stage governor sorts
   *  candidates from stages with independent frame clocks by this. */
  usedMs: number;
}

/** THE SCRATCH LEDGER's cell: one keyed paint's exact-size
 *  canvas+texture pair (see paintKeyed). */
interface KeyedEntry {
  cv: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  glTex: WebGLTexture;
  w: number;
  h: number;
  rev: number;
  bytes: number;
  used: number;
}

export class GlStage implements GpuStageBackend {
  readonly kind = 'gl' as const;
  /** THE VRAM CEILING (A1): this stage's name in the cross-stage
   *  governor's ledger and confession ('world' / 'ground'). */
  readonly vramLabel: string;
  private gl: WebGL2RenderingContext;
  private program!: WebGLProgram;
  private uRes!: WebGLUniformLocation;
  private vbo!: WebGLBuffer;
  private vao!: WebGLVertexArrayObject;
  private white!: WebGLTexture;

  /** THE TEXTURE IS THE CANVAS'S SHADOW: records keyed by handle;
   *  release is explicit and the ledger is symmetric. */
  private readonly records = new Map<StageTexture, TexRecord>();
  /** Exact resident texture bytes (the `?perf` gpu line's source). */
  textureBytes = 0;
  /** The texture store's ceiling — ~2x a settled town's working set.
   *  Per-instance since the foundation audit: the renderer runs TWO
   *  stages, and two full 512MB stores plus the keyed/scratch/sheet
   *  classes stacked past a gigabyte of budget-legal worst case. The
   *  GROUND stage carries only chunk quads (~200MB measured working
   *  set) and takes the smaller store at construction. */
  private readonly texBudgetBytes: number;
  /** Bytes uploaded since the last statsReset — the jitter signal. */
  uploadedBytes = 0;
  uploads = 0;
  drawCalls = 0;
  /** Measured submission cost, ms per MB (gpuBudget EMA). */
  uploadCostMsPerMb = GPU_COST_SEED_MS_PER_MB;
  /** True once a budgeted ensure() admitted this frame (the floor). */
  private uploadedThisFrame = false;

  /**
   * THE SCRATCH LANE (phase A2): pooled canvas+texture pairs, one per
   * 64px size class, that live-paint closures run through. GL reads a
   * texture's content as of the draw CALL, so one pair per class
   * serves every paint item of a frame sequentially — zero per-item
   * allocation, uploads being the only recurring cost (GPU-to-GPU on
   * accelerated canvases). Stats feed the ?perf confession.
   */
  private readonly scratch = new Map<number, {
    cv: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    glTex: WebGLTexture;
    w: number;
    h: number;
    bytes: number;
    used: number;
  }>();
  private scratchBytes = 0;
  /**
   * THE SCRATCH POOL KEEPS A BUDGET (field fix, 2026-09-02). The
   * class pool was bounded only by a 600-frame IDLE sweep — so on a
   * large (maximized Retina) window, where wall runs and bodies mint
   * a wide spread of size classes, it ballooned to 2.3GB resident
   * across 300+ classes (measured), and with the keyed/record/sheet
   * lanes the world stage held 3.2GB of GPU memory. That overflows a
   * browser's per-tab GPU budget on ordinary machines (Mac Chrome on
   * prod, reported) and the driver silently reclaims textures — the
   * "sprites vanish under accelerated display" defect. A byte cap
   * with coldest-first LRU (the keyed evictor's exact shape) bounds
   * it; the frame's own working set (~15-20 distinct classes) is far
   * under the cap, so nothing thrashes. */
  private static readonly SCRATCH_BUDGET = 320 * 1024 * 1024;
  /** THE SCRATCH LEDGER: keyed paints keep their own exact-size
   *  canvas+texture and repaint/re-upload ONLY on a rev change — the
   *  wall-run lane's cure (~48MB/frame of identical wall strips
   *  re-uploaded at the crown). Bounded by the LRU sweep + byte cap. */
  private readonly keyed = new Map<number, KeyedEntry>();
  private keyedBytes = 0;
  private static readonly KEYED_BUDGET = 128 * 1024 * 1024;
  scratchCachedHits = 0;
  private frameNo = 0;
  /** Staging canvas for dirty-rect subuploads (grown, never shrunk). */
  private staging: { cv: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null = null;

  private stagingFor(w: number, h: number): { cv: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
    // GROW-ONLY (foundation audit): the 9-arg texSubImage2D overload
    // names its source region explicitly, so an oversized staging
    // canvas never leaks stale texels into the page — and a canvas
    // width/height assignment REALLOCATES AND CLEARS the bitmap, a
    // cost the old exact-size discipline paid once per dirty rect,
    // every frame. Callers clearRect their own region before the
    // copy and pass (w, h) to the subupload.
    let st = this.staging;
    if (!st) {
      st = this.staging = { cv: document.createElement('canvas'), ctx: null! };
    }
    if (st.cv.width < w || st.cv.height < h) {
      st.cv.width = Math.max(w, st.cv.width);
      st.cv.height = Math.max(h, st.cv.height);
      st.ctx = st.cv.getContext('2d')!;
    } else if (st.ctx === null) {
      st.ctx = st.cv.getContext('2d')!;
    }
    return st;
  }
  scratchPaints = 0;
  scratchUploadBytes = 0;

  /**
   * THE SCRATCH SHEET (A2 part 9). The per-pass scratch round-trip —
   * paint a pooled canvas, texImage2D it, draw, repeat — serializes
   * the 2d raster backend against GL once per pass; at ~74 passes a
   * frame that sync ping-pong was the measured fps floor (hoargate
   * 60fps with a 1.9ms world phase — the cost lived off the CPU
   * clock). The sheet batches the lane: a pre-pass shelf-packs every
   * ELIGIBLE pass box into a few large pooled canvases, paints them
   * all while the raster pipeline stays on one target, uploads each
   * touched sheet ONCE, and the paint sentinels become plain quad
   * draws sampling their cells. Order never changes — the sentinels
   * draw exactly where they always did. Boxes past the eligibility
   * cut (and any overflow past the pool cap) keep the legacy
   * per-pass lane; 2px gutters keep linear sampling out of the
   * neighbors. The pool is BOUNDED (3 × 2048×1024 ≈ 25MB) and dies
   * with the context like every scratch resource.
   */
  private readonly sheets: Array<{
    cv: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    glTex: WebGLTexture;
    dirty: boolean;
    /** Rows the current frame's pack actually reached — the upload
     *  stops there (UVs only address this frame's cells, so stale
     *  rows below are never sampled). */
    usedH: number;
  }> = [];
  private static readonly SHEET_W = 2048;
  private static readonly SHEET_H = 1024;
  private static readonly SHEET_MAX = 3;
  private static readonly SHEET_GUT = 2;
  /** Eligibility cut: the many-small go to the sheet, the few-big
   *  keep their own upload (a 2MB box batched saves one call but
   *  wastes a third of a sheet). Device px. */
  private static readonly SHEET_CELL_W = 768;
  private static readonly SHEET_CELL_H = 512;
  sheetUploads = 0;

  /** THE SHADOW LAYER RIDES THE STAGE (A3): one pooled FBO+texture
   *  pair; drawLayer renders a stream into it and composites once at
   *  layer alpha. Inside it alpha-target blends are legal on either
   *  stage (the punch), opaque-only blends stay refused. */
  private layerFbo: WebGLFramebuffer | null = null;
  private layerTex: WebGLTexture | null = null;
  private layerW = 0;
  private layerH = 0;
  private inLayer = false;

  /** True after webglcontextlost; the caller flips to the canvas
   *  backend the same frame (THE TOGGLE IS THE PRODUCT'S SAFETY). */
  contextLost = false;
  onContextLost: (() => void) | null = null;

  private dpr = 1;
  /** THE RENDER SCALE (A2): the backbuffer/viewport/layer-FBO size in
   *  device px — the RESOLUTION the stage rasterizes at. */
  private bw = 0;
  private bh = 0;
  /** The GEOMETRY space in device px (uRes) — the coordinate frame the
   *  quad positions live in, always at FULL dpr. When bw/bh < uw/uh
   *  (render scale < 1) the shader still maps aPos/uRes correctly and
   *  the smaller viewport rasterizes the same geometry at lower
   *  resolution; the composite drawImage upsamples it. Equal when the
   *  render scale is 1, so a full-scale frame is byte-identical. */
  private uw = 0;
  private uh = 0;
  /** Interleaved vertex scratch, grown geometrically, reused. */
  private buf = new ArrayBuffer(4096 * VERTEX_BYTES);
  private f32 = new Float32Array(this.buf);
  private u8 = new Uint8Array(this.buf);

  /** Alpha stage: the world layer composites OVER the 2d ground, so
   *  it needs a real alpha channel; the main/ground stage stays
   *  opaque so the page can never bleed through. The two refuse each
   *  other's illegal ops symmetrically (see begin/draw). */
  readonly isAlpha: boolean;

  constructor(
    readonly canvas: HTMLCanvasElement,
    opts?: GpuStageOpts,
  ) {
    this.isAlpha = opts?.alpha === true;
    this.texBudgetBytes = opts?.texBudgetBytes ?? 512 * 1024 * 1024;
    this.vramLabel = opts?.label ?? 'stage';
    const gl = canvas.getContext('webgl2', {
      alpha: this.isAlpha,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: true,
      preserveDrawingBuffer: false,
    });
    if (!gl) throw new Error('webgl2 unavailable');
    this.gl = gl;
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.contextLost = true;
      // THE LEDGER FOLLOWS THE HARDWARE (A1): the driver frees every
      // texture on loss, so drop our now-dangling handles and ZERO the
      // byte ledgers HERE, not only on restore. The two stages hold
      // separate GL contexts and the cross-stage governor sums
      // residentBytes every frame regardless of stage liveness — a lost
      // stage that kept its ~1GB ledger until a much-later (or never)
      // restore would inflate the combined total by memory that is
      // already free, and could make enforce() evict the HEALTHY
      // stage's cold records to chase a phantom ceiling.
      this.forgetGpuResources();
      this.onContextLost?.();
    });
    canvas.addEventListener('webglcontextrestored', () => {
      // Records die with the context; revs force lazy re-upload on
      // the next frame that references each handle (ONE LIFECYCLE —
      // the canvases, the truth, never went anywhere). The ledger was
      // already zeroed at loss; clear again for the (spec-permitted)
      // case of a restore without a preceding loss event.
      this.forgetGpuResources();
      this.initGL();
      this.contextLost = false;
    });
    this.initGL();
    StageVram.register(this);
  }

  /** Drop every GPU-resident handle this stage tracks and zero the byte
   *  ledgers. The GL textures themselves are already gone (context loss)
   *  or about to be re-created (restore/initGL), so this only forgets
   *  our bookkeeping — the paint-factory canvases (the truth) are
   *  untouched and re-upload lazily. Shared by both context handlers so
   *  the governor's cross-stage sum never counts freed memory. */
  private forgetGpuResources(): void {
    this.records.clear();
    this.textureBytes = 0;
    this.scratch.clear();
    this.scratchBytes = 0;
    this.keyed.clear();
    this.keyedBytes = 0;
    this.sheets.length = 0;
    this.layerFbo = null;
    this.layerTex = null;
    this.layerW = 0;
    this.layerH = 0;
  }

  private initGL(): void {
    const gl = this.gl;
    const compile = (type: number, src: string): WebGLShader => {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        throw new Error(`stage shader: ${gl.getShaderInfoLog(sh) ?? 'compile failed'}`);
      }
      return sh;
    };
    const program = gl.createProgram()!;
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERT_SRC));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAG_SRC));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`stage link: ${gl.getProgramInfoLog(program) ?? 'link failed'}`);
    }
    this.program = program;
    this.uRes = gl.getUniformLocation(program, 'uRes')!;
    gl.useProgram(program);
    gl.uniform1i(gl.getUniformLocation(program, 'uTex'), 0);

    this.vao = gl.createVertexArray()!;
    gl.bindVertexArray(this.vao);
    this.vbo = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, VERTEX_BYTES, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, VERTEX_BYTES, 8);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 4, gl.UNSIGNED_BYTE, true, VERTEX_BYTES, 16);
    gl.enableVertexAttribArray(3);
    gl.vertexAttribPointer(3, 1, gl.FLOAT, false, VERTEX_BYTES, 20); // aW (B-1b)

    // The white texel: fills sample it, so fill and textured quads
    // share one program and batch across each other.
    this.white = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.white);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    gl.enable(gl.BLEND);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.disable(gl.SCISSOR_TEST);
    gl.clearColor(0, 0, 0, 1);
  }

  /** Create-or-get the shadow record and sync it to the handle's rev.
   *  Phase A0 uploads immediately; A1 threads the budget through here. */
  private sync(tex: StageTexture): TexRecord {
    const gl = this.gl;
    let rec = this.records.get(tex);
    if (!rec) {
      rec = { glTex: gl.createTexture()!, uploadedRev: -1, w: 0, h: 0, bytes: 0, filter: tex.filter, used: this.frameNo, usedMs: nowMs() };
    } else {
      // THE LEDGER IS AN LRU: a Map iterates in insertion order, so
      // re-inserting on every touch keeps the coldest record first —
      // what the byte budget below evicts from.
      this.records.delete(tex);
    }
    this.records.set(tex, rec);
    rec.used = this.frameNo;
    rec.usedMs = nowMs();
    if (rec.uploadedRev !== tex.rev || rec.filter !== tex.filter) {
      const c = tex.canvas;
      // THE DIRT LIST: an atlas page whose size and filter stand can
      // re-upload only its repainted rects — the cadence economy that
      // turns a 4MB page upload into a few kilobytes of sprite.
      const dirty = tex.dirty;
      if (
        dirty !== undefined &&
        dirty.length > 0 &&
        rec.uploadedRev >= 0 &&
        rec.w === c.width &&
        rec.h === c.height &&
        rec.filter === tex.filter
      ) {
        gl.bindTexture(gl.TEXTURE_2D, rec.glTex);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
        // Coalesce overlapping/adjacent rects first: an arrival burst
        // pushes one rect per sprite mint, and neighbors on a shelf
        // merge into one copy + one subupload instead of N.
        const merged: Array<[number, number, number, number]> = [];
        for (const r of dirty) {
          let cur: [number, number, number, number] = [r[0], r[1], r[2], r[3]];
          for (let i = merged.length - 1; i >= 0; i--) {
            const m2 = merged[i]!;
            if (
              cur[0] <= m2[0] + m2[2] + 2 &&
              m2[0] <= cur[0] + cur[2] + 2 &&
              cur[1] <= m2[1] + m2[3] + 2 &&
              m2[1] <= cur[1] + cur[3] + 2
            ) {
              const x0 = Math.min(cur[0], m2[0]);
              const y0 = Math.min(cur[1], m2[1]);
              const x1 = Math.max(cur[0] + cur[2], m2[0] + m2[2]);
              const y1 = Math.max(cur[1] + cur[3], m2[1] + m2[3]);
              cur = [x0, y0, x1 - x0, y1 - y0];
              merged.splice(i, 1);
            }
          }
          merged.push(cur);
        }
        for (const [dx, dy, dw, dh] of merged) {
          const st = this.stagingFor(dw, dh);
          st.ctx.clearRect(0, 0, dw, dh);
          st.ctx.drawImage(c, dx, dy, dw, dh, 0, 0, dw, dh);
          gl.texSubImage2D(gl.TEXTURE_2D, 0, dx, dy, dw, dh, gl.RGBA, gl.UNSIGNED_BYTE, st.cv);
          this.uploadedBytes += dw * dh * 4;
          this.uploads++;
        }
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        tex.dirty = [];
        rec.uploadedRev = tex.rev;
        return rec;
      }
      if (dirty !== undefined) tex.dirty = [];
      gl.bindTexture(gl.TEXTURE_2D, rec.glTex);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      const f = tex.filter === 'linear' ? gl.LINEAR : gl.NEAREST;
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, f);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, f);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      const bytes = c.width * c.height * 4;
      this.textureBytes += bytes - rec.bytes;
      // THE STORE KEEPS A BUDGET (the orphan sweep's missing half):
      // eight fresh-map hops can stack gigabytes of retired world in
      // the 30s the periodic sweep tolerates — enough to take a weak
      // GPU process down. Over budget, the coldest records go NOW;
      // the current frame's working set (used === frameNo) is never
      // touched, so nothing on screen can evict itself.
      if (this.textureBytes > this.texBudgetBytes) {
        for (const [t2, r2] of this.records) {
          if (this.textureBytes <= this.texBudgetBytes) break;
          if (r2.used >= this.frameNo) break; // insertion order: all hotter beyond
          gl.deleteTexture(r2.glTex);
          this.textureBytes -= r2.bytes;
          this.records.delete(t2);
        }
      }
      this.uploadedBytes += bytes;
      this.uploads++;
      rec.bytes = bytes;
      rec.w = c.width;
      rec.h = c.height;
      rec.uploadedRev = tex.rev;
      rec.filter = tex.filter;
    }
    return rec;
  }

  /**
   * THE UPLOAD IS A BAKE — the budgeted lane for emitters that can
   * fall back (the ground pass paints an un-uploadable chunk through
   * the canvas lane instead; THE STILL-WORLD BARGAIN at the right
   * layer). Returns the handle's drawable state:
   *
   *  'current' — texture matches rev (uploaded now or already fresh);
   *  'stale'   — an older upload exists and may blit while the budget
   *              catches up (a stale bake still serves — the band
   *              layer's own law);
   *  'absent'  — nothing uploaded and the guard declined: the caller
   *              MUST paint this item through its live lane.
   *
   * `msLeft` is the frame's remaining lane budget as the caller
   * tracks it; the return includes the ms actually spent so the
   * caller can decrement. draw() itself still uploads unconditionally
   * whatever it meets un-synced — a forgotten ensure() may cost a
   * hitch, never a hole.
   */
  ensure(
    tex: StageTexture,
    msLeft: number,
    floor = true,
  ): { state: 'current' | 'stale' | 'absent'; spentMs: number } {
    const rec = this.records.get(tex);
    if (rec && rec.uploadedRev === tex.rev && rec.filter === tex.filter) {
      return { state: 'current', spentMs: 0 };
    }
    const bytes = this.pendingUploadBytes(tex, rec);
    const est = uploadEstMs(bytes, this.uploadCostMsPerMb);
    // Admission consults the caller's lane AND the shared per-frame
    // pool — independent lanes can no longer stack full budgets into
    // one frame (the audit's cross-lane governor, at the one place
    // every upload passes). `floor = false` waives the guaranteed
    // first admission: PREFETCH lanes (the ring prepay) must never
    // force a multi-MB submission a weak machine cannot afford —
    // measured at 20×, the floor turned the 2ms steady lane into a
    // forced ~full-chunk upload per moving frame (world phase
    // 33→48ms). Visible work keeps the floor; a prefetch that does
    // not fit simply waits for the urgent lane at scroll-in, which
    // is exactly the pre-prepay behavior.
    if (!admitUpload(Math.min(msLeft, this.uploadMsLeft), est, floor && !this.uploadedThisFrame)) {
      return { state: rec && rec.uploadedRev >= 0 ? 'stale' : 'absent', spentMs: 0 };
    }
    this.uploadedThisFrame = true;
    const t0 = performance.now();
    this.sync(tex);
    const spentMs = performance.now() - t0;
    this.uploadMsLeft -= spentMs;
    this.uploadCostMsPerMb = nextUploadCost(this.uploadCostMsPerMb, spentMs, bytes);
    return { state: 'current', spentMs };
  }

  /** Honest refresh pricing: a dirty-rect refresh costs its RECTS,
   *  not the whole canvas (ensure once priced an atlas page's few-KB
   *  cadence dirt at 16.8MB and declined it for nothing). */
  private pendingUploadBytes(tex: StageTexture, rec: TexRecord | undefined): number {
    const c = tex.canvas;
    const dirty = tex.dirty;
    if (
      dirty !== undefined &&
      dirty.length > 0 &&
      rec !== undefined &&
      rec.uploadedRev >= 0 &&
      rec.w === c.width &&
      rec.h === c.height &&
      rec.filter === tex.filter
    ) {
      let b = 0;
      for (const [, , dw, dh] of dirty) b += dw * dh * 4;
      return Math.min(b, c.width * c.height * 4);
    }
    return c.width * c.height * 4;
  }

  /**
   * Draw-time sync with the stale-bake escape (foundation audit):
   * draw() must never meet a missing texture (never a hole), but a
   * REFRESH of content already uploaded may defer under budget
   * pressure when the handle says stale content still serves
   * (staleOk — chunk grounds, band bakes). The old unconditional
   * sync was the recorded safety net turned main road: every
   * declined ensure() re-uploaded at draw anyway, unmetered, which
   * made the whole upload economy advisory.
   */
  private syncForDraw(tex: StageTexture): TexRecord {
    const rec = this.records.get(tex);
    if (
      rec !== undefined &&
      rec.uploadedRev >= 0 &&
      tex.staleOk === true &&
      // Same dims only: quads compute UVs against the CURRENT canvas
      // shape — serving old texels through a resized mapping would
      // stretch the ground for a frame (tier flips upload now).
      rec.w === tex.canvas.width &&
      rec.h === tex.canvas.height &&
      (rec.uploadedRev !== tex.rev || rec.filter !== tex.filter)
    ) {
      const bytes = this.pendingUploadBytes(tex, rec);
      const est = uploadEstMs(bytes, this.uploadCostMsPerMb);
      if (!admitUpload(this.uploadMsLeft, est, !this.uploadedThisFrame)) {
        // Serve the stale texels; keep the record hot in the LRU.
        this.records.delete(tex);
        this.records.set(tex, rec);
        rec.used = this.frameNo;
        rec.usedMs = nowMs();
        this.drawDeferred++;
        return rec;
      }
      this.uploadedThisFrame = true;
      const t0 = performance.now();
      const r = this.sync(tex);
      const spent = performance.now() - t0;
      this.uploadMsLeft -= spent;
      this.uploadCostMsPerMb = nextUploadCost(this.uploadCostMsPerMb, spent, bytes);
      return r;
    }
    return this.sync(tex);
  }

  /** ONE LIFECYCLE's release door — call from the cache evictors. */
  release(tex: StageTexture): void {
    const rec = this.records.get(tex);
    if (!rec) return;
    this.gl.deleteTexture(rec.glTex);
    this.textureBytes -= rec.bytes;
    this.records.delete(tex);
  }

  /** Live texture records — the ledger's companion count. */
  get textureCount(): number {
    return this.records.size;
  }

  /** THE WHOLE COMMIT CONFESSES (foundation audit): every byte this
   *  stage holds resident on the GPU — records, keyed cells, scratch
   *  classes, sheets, the layer FBO. The per-class ledgers were each
   *  honest and none of them summed. */
  get residentBytes(): number {
    return (
      this.textureBytes +
      this.keyedBytes +
      this.scratchBytes +
      this.sheets.length * GlStage.SHEET_W * GlStage.SHEET_H * 4 +
      (this.layerTex ? this.layerW * this.layerH * 4 : 0)
    );
  }

  /** Resident keyed-cell bytes (probe/confession). */
  get keyedResidentBytes(): number {
    return this.keyedBytes;
  }

  /** THE VRAM CEILING (A1): this stage's resident bytes broken out by
   *  lane — the standing diagnostic the cross-stage governor sums and
   *  ?perf/probes read (the band-21 hunt computed this by hand). */
  residentBreakdown(): VramLanes {
    return {
      records: this.textureBytes,
      keyed: this.keyedBytes,
      scratch: this.scratchBytes,
      sheets: this.sheets.length * GlStage.SHEET_W * GlStage.SHEET_H * 4,
      layer: this.layerTex ? this.layerW * this.layerH * 4 : 0,
    };
  }

  /** THE VRAM CEILING (A1): offer this stage's cold records to the
   *  cross-stage governor. Only records NOT drawn this frame and NOT
   *  pinned (atlas pages) are evictable — an evicted record re-uploads
   *  the next frame its quad draws (syncForDraw), so this sheds only
   *  genuinely-cold off-screen mass, never the working set. Scratch and
   *  keyed stay under their own per-instance caps and are not offered:
   *  they are hot, re-paint (not re-upload) to restore, and the record
   *  mass is where a big window's surplus actually lives. */
  collectEvictable(out: EvictCandidate[]): void {
    for (const [tex, rec] of this.records) {
      if (rec.used < this.frameNo && tex.pinned !== true) {
        out.push({
          stamp: rec.usedMs,
          bytes: rec.bytes,
          evict: () => {
            // Guard on record IDENTITY, not just key presence: enforce()
            // gathers then evicts synchronously with no sync() between,
            // so today a handle cannot be re-keyed mid-pass — but if a
            // future change ever interleaved an upload, a `tex` deleted
            // and re-inserted with a fresh record must not be evicted
            // against this stale closure. Identity survives that.
            if (this.records.get(tex) !== rec) return 0;
            const b = rec.bytes;
            this.gl.deleteTexture(rec.glTex);
            this.textureBytes -= b;
            this.records.delete(tex);
            return b;
          },
        });
      }
    }
  }

  statsReset(): void {
    this.uploadedBytes = 0;
    this.uploads = 0;
    this.drawCalls = 0;
    this.uploadedThisFrame = false;
    this.scratchPaints = 0;
    this.scratchUploadBytes = 0;
    this.scratchCachedHits = 0;
    this.sheetUploads = 0;
    this.drawDeferred = 0;
  }

  begin(w: number, h: number, dpr: number, clear: string | null, renderScale = 1): void {
    const gl = this.gl;
    this.dpr = dpr;
    // Geometry space is ALWAYS full dpr (the quads arrive in full-dpr
    // device px); the backbuffer/viewport shrink by the render scale.
    this.uw = Math.round(w * dpr);
    this.uh = Math.round(h * dpr);
    const s = renderScale >= 1 ? 1 : Math.max(0.1, renderScale);
    this.bw = s === 1 ? this.uw : Math.max(1, Math.round(this.uw * s));
    this.bh = s === 1 ? this.uh : Math.max(1, Math.round(this.uh * s));
    if (this.canvas.width !== this.bw || this.canvas.height !== this.bh) {
      this.canvas.width = this.bw;
      this.canvas.height = this.bh;
    }
    gl.viewport(0, 0, this.bw, this.bh);
    gl.useProgram(this.program);
    // uRes is the GEOMETRY space (full dpr), not the reduced backbuffer.
    gl.uniform2f(this.uRes, this.uw, this.uh);
    if (clear === null) {
      if (!this.isAlpha) throw new Error('stage: transparent clear on the opaque main target');
      gl.clearColor(0, 0, 0, 0);
    } else {
      const c = parseInt(clear.slice(1), 16);
      gl.clearColor(((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255, 1);
    }
    gl.clear(gl.COLOR_BUFFER_BIT);
    // THE CLOCK IS A FRAME, NOT A FLUSH (foundation audit): aging
    // used to tick here, but the world stage begins once per FLUSH
    // and the split path flushes mid-frame — sweeps ran early and
    // the "never evict this frame's working set" guards treated an
    // earlier flush of the SAME frame as evictable. The renderer now
    // pumps frame() once per real frame; a host that never calls it
    // (the lab, tests) keeps the legacy per-begin tick.
    if (!this.externalClock) this.tickFrame();
  }

  /** True once the host ever called frame() — the authoritative
   *  per-real-frame clock; begin() stops ticking on its own then. */
  private externalClock = false;

  /** Advance the frame clock: aging, sweeps, and the per-frame
   *  upload allowance. Call ONCE per rendered frame, before any
   *  ensure()/draw() of that frame. */
  frame(): void {
    this.externalClock = true;
    this.tickFrame();
  }

  private tickFrame(): void {
    const gl = this.gl;
    this.uploadMsLeft = GPU_URGENT_MS;
    // THE STORE HOLDS ITS CEILING EVEN WHEN IDLE (field fix): record
    // eviction lived only in the upload path, so a STATIC big-window
    // scene (nothing re-uploading) kept records parked above budget
    // — measured 800MB against a 512MB store on a maximized Retina
    // window. Sweep proactively here too: coldest-first, never a
    // record drawn this frame, never a PINNED page (atlas). An
    // evicted record re-uploads the next frame its quad is drawn
    // (syncForDraw), so this only sheds genuinely-cold off-screen
    // textures — the working set stays resident.
    if (this.textureBytes > this.texBudgetBytes) {
      const cold: Array<[StageTexture, TexRecord]> = [];
      for (const e of this.records) if (e[1].used < this.frameNo && e[0].pinned !== true) cold.push(e);
      cold.sort((a, b) => a[1].used - b[1].used);
      for (const [tex, rec] of cold) {
        if (this.textureBytes <= this.texBudgetBytes) break;
        gl.deleteTexture(rec.glTex);
        this.textureBytes -= rec.bytes;
        this.records.delete(tex);
      }
    }
    // Scratch hygiene: retire class pairs nothing has touched lately.
    if (++this.frameNo % 600 === 0) {
      for (const [cls, sc] of this.scratch) {
        if (sc.used < this.frameNo - 600) {
          gl.deleteTexture(sc.glTex);
          this.scratchBytes -= sc.bytes;
          this.scratch.delete(cls);
        }
      }
      // The keyed ledger retires on the same cadence — a run that
      // left the viewport keeps its texture ~10s, then lets go.
      for (const [k, e] of this.keyed) {
        if (e.used < this.frameNo - 600) {
          gl.deleteTexture(e.glTex);
          this.keyedBytes -= e.bytes;
          this.keyed.delete(k);
        }
      }
      // THE ORPHAN SWEEP — the SOLO sprite lane's permanent
      // lifecycle (oversized sprites ride WeakMap-owned handles with
      // no explicit evictor; the atlas owns only the packable ones).
      // Chunks and bands still go through their explicit release
      // doors. PINNED handles (atlas pages) are exempt: sweeping an
      // undrawn page while the player was indoors made the return
      // frame pay a full 16.8MB re-upload per page, unmetered —
      // exactly an arrival frame.
      for (const [tex, rec] of this.records) {
        if (tex.pinned !== true && rec.used < this.frameNo - 900) {
          gl.deleteTexture(rec.glTex);
          this.textureBytes -= rec.bytes;
          this.records.delete(tex);
        }
      }
    }
  }

  /** The shared per-frame upload allowance (THE UPLOAD IS A BAKE):
   *  ensure() and draw-time refreshes spend from ONE pool, so N
   *  independent lanes can no longer each claim a full budget in the
   *  same frame. */
  private uploadMsLeft = GPU_URGENT_MS;
  /** Draw-time refreshes deferred to a stale bind this frame (probe). */
  drawDeferred = 0;

  draw(items: readonly StageItem[]): void {
    if (items.length === 0) return;
    const gl = this.gl;
    const runs = computeRuns(items);
    // Size the scratch for the frame's quads, grow geometrically.
    let quadCount = 0;
    for (const r of runs) quadCount += r.quads === 0 ? 1 : r.quads;
    const need = quadCount * VERTS_PER_QUAD * VERTEX_BYTES;
    if (need > this.buf.byteLength) {
      let cap = this.buf.byteLength;
      while (cap < need) cap *= 2;
      this.buf = new ArrayBuffer(cap);
      this.f32 = new Float32Array(this.buf);
      this.u8 = new Uint8Array(this.buf);
    }
    // ---- THE SCRATCH SHEET pre-pass: pack, paint, upload once ----
    const dpr = this.dpr;
    const GUT = GlStage.SHEET_GUT;
    /** Per-run cell: undefined = not a paint; null = legacy lane. */
    const cells: Array<{ s: number; gx: number; gy: number } | null | undefined> = new Array(
      runs.length,
    );
    {
      let si = -1;
      let sx = GUT;
      let sy = GUT;
      let rowH = 0;
      for (let ri = 0; ri < runs.length; ri++) {
        const run = runs[ri]!;
        if (run.quads !== 0) continue;
        const it = items[run.i0]!;
        if (it.kind !== 'paint') continue;
        // Keyed paints own a cached texture — never sheet material.
        if (it.key !== undefined && it.rev !== undefined) {
          cells[ri] = null;
          continue;
        }
        const pwDev = Math.ceil(it.pw * dpr);
        const phDev = Math.ceil(it.ph * dpr);
        if (pwDev > GlStage.SHEET_CELL_W || phDev > GlStage.SHEET_CELL_H) {
          cells[ri] = null;
          continue;
        }
        if (si < 0) {
          si = this.openSheet(0);
          sx = GUT;
          sy = GUT;
          rowH = 0;
        }
        if (sx + pwDev + GUT > GlStage.SHEET_W) {
          sx = GUT;
          sy += rowH + GUT;
          rowH = 0;
        }
        if (sy + phDev + GUT > GlStage.SHEET_H) {
          if (si + 1 >= GlStage.SHEET_MAX) {
            cells[ri] = null; // pool full — the legacy lane absorbs it
            continue;
          }
          si = this.openSheet(si + 1);
          sx = GUT;
          sy = GUT;
          rowH = 0;
        }
        const sh = this.sheets[si]!;
        const ctx = sh.ctx;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(sx - 1, sy - 1, pwDev + 2, phDev + 2);
        ctx.save();
        ctx.beginPath();
        ctx.rect(sx, sy, pwDev, phDev);
        // The clip IS the old canvas edge: the legacy pair's border
        // never showed past [pw, ph] because the sentinel's UVs stop
        // there — the cell clip reproduces exactly that boundary.
        ctx.clip();
        ctx.setTransform(dpr, 0, 0, dpr, sx - it.px * dpr, sy - it.py * dpr);
        it.paint(ctx);
        ctx.restore();
        sh.dirty = true;
        cells[ri] = { s: si, gx: sx, gy: sy };
        this.scratchPaints++;
        sx += pwDev + GUT;
        if (phDev > rowH) rowH = phDev;
        if (sy + phDev + GUT > sh.usedH) sh.usedH = sy + phDev + GUT;
      }
    }
    for (const sh of this.sheets) {
      if (!sh.dirty) continue;
      // THE USED ROWS: the pack rarely fills a page — upload only the
      // rows it reached (storage was allocated whole at openSheet).
      // The 9-arg WebGL2 subupload names the source region, so the
      // rows come straight off the sheet canvas — the old exact-size
      // staging hop (a realloc + a raster copy per sheet per frame)
      // is gone.
      const uh = Math.min(GlStage.SHEET_H, sh.usedH);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, sh.glTex);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      if (uh >= GlStage.SHEET_H - 1) {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sh.cv);
      } else {
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, GlStage.SHEET_W, uh, gl.RGBA, gl.UNSIGNED_BYTE, sh.cv);
      }
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      sh.dirty = false;
      sh.usedH = 0;
      this.sheetUploads++;
      this.scratchUploadBytes += GlStage.SHEET_W * Math.max(1, uh) * 4;
    }
    // Fill vertices in stream order; record per-run vertex offsets.
    const f32 = this.f32;
    const u8 = this.u8;
    let v = 0; // vertex index
    const runFirst: number[] = new Array(runs.length);
    /** Keyed cells reserved (or refused) in this pass — the UV choice
     *  and the run walk must agree on where each paint lands. */
    const keyedEntries: Array<KeyedEntry | null | undefined> = new Array(runs.length);
    for (let ri = 0; ri < runs.length; ri++) {
      const run = runs[ri]!;
      runFirst[ri] = v;
      if (run.quads === 0) {
        // A paint sentinel: one axis-aligned quad over its bounds.
        // UVs address the class-rounded scratch pair the run walk
        // will paint into — the class dims are a pure function of
        // the bounds, so vertex fill and paint agree by arithmetic.
        const it = items[run.i0]!;
        if (it.kind !== 'paint') continue;
        const pwDev = Math.ceil(it.pw * dpr);
        const phDev = Math.ceil(it.ph * dpr);
        const x0 = dpr * it.px;
        const y0 = dpr * it.py;
        const x1 = x0 + pwDev;
        const y1 = y0 + phDev;
        // Packed: UVs address the cell in its sheet. Legacy: the
        // class-rounded pair (dims a pure function of the bounds, so
        // vertex fill and paint agree by arithmetic).
        const cell = cells[ri];
        let u0 = 0;
        let v0 = 0;
        let u1 = 0;
        let v1 = 0;
        if (cell) {
          u0 = cell.gx / GlStage.SHEET_W;
          v0 = cell.gy / GlStage.SHEET_H;
          u1 = (cell.gx + pwDev) / GlStage.SHEET_W;
          v1 = (cell.gy + phDev) / GlStage.SHEET_H;
        } else if (
          it.key !== undefined &&
          it.rev !== undefined &&
          (keyedEntries[ri] = this.ensureKeyedEntry(it as StagePaint & { key: number; rev: number }))
        ) {
          // Keyed: the cached canvas is EXACT-size — full UV span.
          // (Reserved HERE because a hard-cap refusal must fall back
          // to the scratch class's UV mapping below.)
          u1 = 1;
          v1 = 1;
        } else {
          // The class-rounded scratch pair: the UV span addresses the
          // cell's own extent inside it.
          const cw = Math.ceil(pwDev / 64) * 64;
          const ch = Math.ceil(phDev / 64) * 64;
          u1 = pwDev / cw;
          v1 = phDev / ch;
        }
        const emitP = (px: number, py: number, uu: number, vv: number): void => {
          const fo = v * 6;
          f32[fo] = px;
          f32[fo + 1] = py;
          f32[fo + 2] = uu;
          f32[fo + 3] = vv;
          const bo = v * VERTEX_BYTES + 16;
          u8[bo] = 255;
          u8[bo + 1] = 255;
          u8[bo + 2] = 255;
          u8[bo + 3] = 255;
          f32[fo + 5] = 1; // aW: this lane is always screen-space (B-1b)
          v++;
        };
        emitP(x0, y0, u0, v0);
        emitP(x1, y0, u1, v0);
        emitP(x0, y1, u0, v1);
        emitP(x0, y1, u0, v1);
        emitP(x1, y0, u1, v0);
        emitP(x1, y1, u1, v1);
        continue;
      }
      // Texel scale for the run's texture (fills use the white texel).
      // Budget-aware: a staleOk refresh may bind older texels under
      // upload pressure (syncForDraw); a missing record still uploads
      // unconditionally — never a hole.
      const rec = run.tex ? this.syncForDraw(run.tex) : null;
      const tw = rec ? rec.w : 1;
      const th = rec ? rec.h : 1;
      for (let i = run.i0; i <= run.i1; i++) {
        const it = items[i]!;
        if (it.kind === 'paint') continue;
        const m = it.m;
        // device = dpr · (m · local) — the same composition, in the
        // same multiplication order, as CanvasStage's setTransform.
        const a = dpr * m[0];
        const b = dpr * m[1];
        const cM = dpr * m[2];
        const d = dpr * m[3];
        const e = dpr * m[4];
        const f = dpr * m[5];
        const x1 = it.dw;
        const y1 = it.dh;
        // Corners: (0,0) (dw,0) (0,dh) (dw,dh) through the matrix.
        const p0x = e;
        const p0y = f;
        const p1x = a * x1 + e;
        const p1y = b * x1 + f;
        const p2x = cM * y1 + e;
        const p2y = d * y1 + f;
        const p3x = a * x1 + cM * y1 + e;
        const p3y = b * x1 + d * y1 + f;
        let u0 = 0;
        let v0 = 0;
        let u1 = 1;
        let v1 = 1;
        let cr = 255;
        let cg = 255;
        let cb = 255;
        if (it.kind === 'quad') {
          u0 = it.sx / tw;
          v0 = it.sy / th;
          u1 = (it.sx + it.sw) / tw;
          v1 = (it.sy + it.sh) / th;
        } else {
          cr = (it.color >> 16) & 255;
          cg = (it.color >> 8) & 255;
          cb = it.color & 255;
        }
        // Premultiplied vertex color: texel × (r·α, g·α, b·α, α).
        const al = it.alpha;
        const pr = Math.round(cr * al);
        const pg = Math.round(cg * al);
        const pb = Math.round(cb * al);
        const pa = Math.round(255 * al);
        const emit = (px: number, py: number, uu: number, vv: number): void => {
          const fo = v * 6; // 6 floats: pos.xy, uv.xy, color(float 4, u8-aliased), w
          f32[fo] = px;
          f32[fo + 1] = py;
          f32[fo + 2] = uu;
          f32[fo + 3] = vv;
          f32[fo + 5] = 1; // aW: the per-vertex homogeneous weight, always 1 (screen quads)
          const bo = v * VERTEX_BYTES + 16;
          u8[bo] = pr;
          u8[bo + 1] = pg;
          u8[bo + 2] = pb;
          u8[bo + 3] = pa;
          v++;
        };
        emit(p0x, p0y, u0, v0);
        emit(p1x, p1y, u1, v0);
        emit(p2x, p2y, u0, v1);
        emit(p2x, p2y, u0, v1);
        emit(p1x, p1y, u1, v0);
        emit(p3x, p3y, u1, v1);
      }
    }
    // One upload, then one draw per run.
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, this.u8.subarray(0, v * VERTEX_BYTES), gl.STREAM_DRAW);
    gl.activeTexture(gl.TEXTURE0);
    for (let ri = 0; ri < runs.length; ri++) {
      const run = runs[ri]!;
      if (run.quads === 0) {
        const it = items[run.i0]!;
        if (it.kind !== 'paint') continue;
        const cell = cells[ri];
        if (cell) {
          // Painted and uploaded in the pre-pass — a plain quad now.
          gl.bindTexture(gl.TEXTURE_2D, this.sheets[cell.s]!.glTex);
          const [sf, df] = BLEND_GL_FUNC[0]!; // paints composite source-over
          gl.blendFunc(sf, df);
          gl.drawArrays(gl.TRIANGLES, runFirst[ri]!, VERTS_PER_QUAD);
          this.drawCalls++;
          continue;
        }
        const ke = keyedEntries[ri];
        if (it.key !== undefined && it.rev !== undefined && ke) {
          this.paintKeyed(ke, it as StagePaint & { key: number; rev: number }, runFirst[ri]!);
        } else {
          // Unkeyed — or a keyed mint the hard cap refused in the
          // vertex pass (the quad already wears scratch-class UVs).
          this.paintScratch(it, runFirst[ri]!);
        }
        continue;
      }
      if (!this.isAlpha && !this.inLayer && blendNeedsAlphaTarget(run.blend)) {
        // Same refusal, same words, as the canvas oracle: a contract
        // error must not depend on which backend caught it.
        throw new Error('stage: alpha-target blend on the opaque main target');
      }
      if ((this.isAlpha || this.inLayer) && blendNeedsOpaqueTarget(run.blend)) {
        // The mirror half of the symmetry: multiply/screen's fixed-
        // function forms assume Da = 1 and lie quietly on an alpha
        // layer. They belong to the lighting/post passes, which
        // composite on the opaque frame.
        throw new Error('stage: opaque-target blend on an alpha stage');
      }
      const rec = run.tex ? this.records.get(run.tex)! : null;
      gl.bindTexture(gl.TEXTURE_2D, rec ? rec.glTex : this.white);
      const [sf, df] = BLEND_GL_FUNC[run.blend]!;
      gl.blendFunc(sf, df);
      gl.drawArrays(gl.TRIANGLES, runFirst[ri]!, run.quads * VERTS_PER_QUAD);
      this.drawCalls++;
    }
  }

  /** Stand sheet `i` up (pooled; filters set once at creation). */
  private openSheet(i: number): number {
    const gl = this.gl;
    while (this.sheets.length <= i) {
      const cv = document.createElement('canvas');
      cv.width = GlStage.SHEET_W;
      cv.height = GlStage.SHEET_H;
      const ctx = cv.getContext('2d')!;
      const glTex = gl.createTexture()!;
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, glTex);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        GlStage.SHEET_W,
        GlStage.SHEET_H,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        null,
      );
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      this.sheets.push({ cv, ctx, glTex, dirty: false, usedH: 0 });
    }
    return i;
  }

  /**
   * One paint item through the scratch lane: run the closure against
   * the class pair's 2d canvas (screen coordinates preserved by the
   * translate), upload, draw its pre-filled quad. The pair is reused
   * by the very next paint item — GL snapshots texture content at the
   * draw call, so sequential reuse is sound by spec.
   */
  private paintScratch(it: { px: number; py: number; pw: number; ph: number; paint: (ctx: CanvasRenderingContext2D) => void }, firstVert: number): void {
    const gl = this.gl;
    const dpr = this.dpr;
    const pwDev = Math.ceil(it.pw * dpr);
    const phDev = Math.ceil(it.ph * dpr);
    const cw = Math.ceil(pwDev / 64) * 64;
    const ch = Math.ceil(phDev / 64) * 64;
    const cls = (cw / 64) * 4096 + ch / 64;
    let sc = this.scratch.get(cls);
    if (!sc) {
      // THE SCRATCH POOL KEEPS A BUDGET: evict coldest classes (never
      // one drawn THIS frame) before minting past the cap — the keyed
      // evictor's shape. Bounds the pool that otherwise reached 2.3GB
      // on a large window (see SCRATCH_BUDGET).
      const bytes = cw * ch * 4;
      while (this.scratchBytes + bytes > GlStage.SCRATCH_BUDGET && this.scratch.size > 0) {
        let coldK = -1;
        let coldUsed = Infinity;
        for (const [k, v2] of this.scratch) {
          if (v2.used < coldUsed) {
            coldUsed = v2.used;
            coldK = k;
          }
        }
        const cold = this.scratch.get(coldK);
        if (!cold || cold.used >= this.frameNo) break;
        gl.deleteTexture(cold.glTex);
        this.scratchBytes -= cold.bytes;
        this.scratch.delete(coldK);
      }
      const cv = document.createElement('canvas');
      cv.width = cw;
      cv.height = ch;
      const ctx = cv.getContext('2d')!;
      sc = { cv, ctx, glTex: gl.createTexture()!, w: cw, h: ch, bytes, used: this.frameNo };
      this.scratchBytes += sc.bytes;
      this.scratch.set(cls, sc);
    }
    sc.used = this.frameNo;
    const ctx = sc.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cw, ch);
    // The paint draws in screen space; the device transform lands its
    // content at the cell origin.
    ctx.setTransform(dpr, 0, 0, dpr, -it.px * dpr, -it.py * dpr);
    it.paint(ctx);
    gl.bindTexture(gl.TEXTURE_2D, sc.glTex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sc.cv);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.scratchPaints++;
    this.scratchUploadBytes += cw * ch * 4;
    const [sf, df] = BLEND_GL_FUNC[0]!; // paints composite source-over
    gl.blendFunc(sf, df);
    gl.drawArrays(gl.TRIANGLES, firstVert, VERTS_PER_QUAD);
    this.drawCalls++;
  }

  /**
   * THE SCRATCH LEDGER's draw: a keyed paint owns an exact-size
   * canvas+texture pair; the closure runs and the texture uploads
   * ONLY when the item's rev (or its box size) changed. A cache hit
   * is a bind and a drawArrays — the wall strips that measured
   * ~48MB/frame of identical uploads at the crown become, in effect,
   * quads that repaint on world/zoom/cadence edges alone.
   */
  /**
   * Reserve (or refuse) a keyed cell for this item — get, size-check,
   * evict, mint; NO GL painting. Runs in the VERTEX pass, because the
   * refusal decides the quad's UV mapping (keyed cells span [0,1];
   * the scratch fallback samples a class-rounded pair) and vertices
   * are written before the run walk paints anything.
   */
  private ensureKeyedEntry(it: StagePaint & { key: number; rev: number }): KeyedEntry | null {
    const gl = this.gl;
    const dpr = this.dpr;
    const pwDev = Math.ceil(it.pw * dpr);
    const phDev = Math.ceil(it.ph * dpr);
    let e = this.keyed.get(it.key);
    if (e && (e.w !== pwDev || e.h !== phDev)) {
      gl.deleteTexture(e.glTex);
      this.keyedBytes -= e.bytes;
      this.keyed.delete(it.key);
      e = undefined;
    }
    if (!e) {
      // Byte cap: evict the coldest entries before minting past the
      // budget; never an entry drawn THIS frame.
      const bytes = pwDev * phDev * 4;
      while (this.keyedBytes + bytes > GlStage.KEYED_BUDGET && this.keyed.size > 0) {
        let coldK = -1;
        let coldUsed = Infinity;
        for (const [k, v2] of this.keyed) {
          if (v2.used < coldUsed) {
            coldUsed = v2.used;
            coldK = k;
          }
        }
        const cold = this.keyed.get(coldK);
        if (!cold || cold.used >= this.frameNo) break;
        gl.deleteTexture(cold.glTex);
        this.keyedBytes -= cold.bytes;
        this.keyed.delete(coldK);
      }
      // THE CAP IS HARD (foundation audit): same-frame entries are
      // rightly unevictable, so a mint storm could once overshoot
      // the budget without bound — N new runs in one frame allocated
      // N textures past the cap on exactly the machines the cap
      // exists for. Refuse instead; the scratch lane paints this
      // frame and the run caches when pressure eases.
      if (this.keyedBytes + bytes > GlStage.KEYED_BUDGET) return null;
      const cv = document.createElement('canvas');
      cv.width = pwDev;
      cv.height = phDev;
      e = {
        cv,
        ctx: cv.getContext('2d')!,
        glTex: gl.createTexture()!,
        w: pwDev,
        h: phDev,
        rev: it.rev - 1, // force the first paint
        bytes,
        used: this.frameNo,
      };
      this.keyedBytes += bytes;
      this.keyed.set(it.key, e);
      gl.bindTexture(gl.TEXTURE_2D, e.glTex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }
    e.used = this.frameNo;
    return e;
  }

  private paintKeyed(e: KeyedEntry, it: StagePaint & { key: number; rev: number }, firstVert: number): void {
    const gl = this.gl;
    const dpr = this.dpr;
    gl.bindTexture(gl.TEXTURE_2D, e.glTex);
    if (e.rev !== it.rev) {
      const ctx = e.ctx;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, e.w, e.h);
      ctx.setTransform(dpr, 0, 0, dpr, -it.px * dpr, -it.py * dpr);
      it.paint(ctx);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, e.cv);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      e.rev = it.rev;
      this.scratchPaints++;
      this.scratchUploadBytes += e.bytes;
    } else {
      this.scratchCachedHits++;
    }
    const [sf, df] = BLEND_GL_FUNC[0]!; // paints composite source-over
    gl.blendFunc(sf, df);
    gl.drawArrays(gl.TRIANGLES, firstVert, VERTS_PER_QUAD);
    this.drawCalls++;
  }

  drawLayer(items: readonly StageItem[], alpha: number): void {
    if (items.length === 0 || alpha <= 0) return;
    const gl = this.gl;
    if (!this.layerFbo) {
      this.layerFbo = gl.createFramebuffer()!;
      this.layerTex = gl.createTexture()!;
    }
    if (this.layerW !== this.bw || this.layerH !== this.bh) {
      gl.bindTexture(gl.TEXTURE_2D, this.layerTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.bw, this.bh, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.layerFbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.layerTex, 0);
      this.layerW = this.bw;
      this.layerH = this.bh;
    } else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.layerFbo);
    }
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    this.inLayer = true;
    try {
      // The full pipeline — batching, sheets, uploads — against the
      // layer target; uRes/viewport already match (same dimensions).
      this.draw(items);
    } finally {
      this.inLayer = false;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    // Composite: one full-target quad at layer alpha. The vertex
    // shader flips Y for the backbuffer, so FBO content sits flipped
    // in its texture — V flips back here (top samples v=1).
    const a = Math.min(1, alpha);
    const pa = Math.round(255 * a);
    const f32 = this.f32;
    const u8 = this.u8;
    let v = 0;
    const emitC = (px: number, py: number, uu: number, vv: number): void => {
      const fo = v * 6;
      f32[fo] = px;
      f32[fo + 1] = py;
      f32[fo + 2] = uu;
      f32[fo + 3] = vv;
      f32[fo + 5] = 1; // aW: the layer composite is screen-space (B-1b)
      const bo = v * VERTEX_BYTES + 16;
      u8[bo] = pa;
      u8[bo + 1] = pa;
      u8[bo + 2] = pa;
      u8[bo + 3] = pa;
      v++;
    };
    // Positions span the GEOMETRY space (uRes/full dpr), not the reduced
    // backbuffer — the shader maps aPos/uRes and the smaller viewport
    // scales the full-screen quad down to cover the whole backbuffer.
    emitC(0, 0, 0, 1);
    emitC(this.uw, 0, 1, 1);
    emitC(0, this.uh, 0, 0);
    emitC(0, this.uh, 0, 0);
    emitC(this.uw, 0, 1, 1);
    emitC(this.uw, this.uh, 1, 0);
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, this.u8.subarray(0, v * VERTEX_BYTES), gl.STREAM_DRAW);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.layerTex);
    const [sf, df] = BLEND_GL_FUNC[0]!; // premultiplied source-over
    gl.blendFunc(sf, df);
    gl.drawArrays(gl.TRIANGLES, 0, VERTS_PER_QUAD);
    this.drawCalls++;
  }

  end(): void {
    this.gl.flush();
  }
}
