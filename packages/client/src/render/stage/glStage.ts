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
import { GPU_COST_SEED_MS_PER_MB, admitUpload, nextUploadCost, uploadEstMs } from './gpuBudget.js';
import type { StageBackend, StageItem, StageTexture } from './stageTypes.js';

const VERT_SRC = `#version 300 es
layout(location=0) in vec2 aPos;
layout(location=1) in vec2 aUV;
layout(location=2) in vec4 aCol;
uniform vec2 uRes;
out vec2 vUV;
out vec4 vCol;
void main() {
  vec2 c = (aPos / uRes) * 2.0 - 1.0;
  gl_Position = vec4(c.x, -c.y, 0.0, 1.0);
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

/** Bytes per vertex: pos 2f (8) + uv 2f (8) + color 4×u8 (4). */
const VERTEX_BYTES = 20;
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
}

export class GlStage implements StageBackend {
  readonly kind = 'gl' as const;
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
  private frameNo = 0;
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
  private bw = 0;
  private bh = 0;
  /** Interleaved vertex scratch, grown geometrically, reused. */
  private buf = new ArrayBuffer(4096 * VERTEX_BYTES);
  private f32 = new Float32Array(this.buf);
  private u8 = new Uint8Array(this.buf);

  /** Alpha stage: the world layer composites OVER the 2d ground, so
   *  it needs a real alpha channel; the main/ground stage stays
   *  opaque so the page can never bleed through. The two refuse each
   *  other's illegal ops symmetrically (see begin/draw). */
  readonly isAlpha: boolean;

  constructor(readonly canvas: HTMLCanvasElement, opts?: { alpha?: boolean }) {
    this.isAlpha = opts?.alpha === true;
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
      this.onContextLost?.();
    });
    canvas.addEventListener('webglcontextrestored', () => {
      // Records die with the context; revs force lazy re-upload on
      // the next frame that references each handle (ONE LIFECYCLE —
      // the canvases, the truth, never went anywhere).
      this.records.clear();
      this.textureBytes = 0;
      this.scratch.clear();
      this.scratchBytes = 0;
      this.sheets.length = 0;
      this.layerFbo = null;
      this.layerTex = null;
      this.layerW = 0;
      this.layerH = 0;
      this.initGL();
      this.contextLost = false;
    });
    this.initGL();
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
      rec = { glTex: gl.createTexture()!, uploadedRev: -1, w: 0, h: 0, bytes: 0, filter: tex.filter, used: this.frameNo };
      this.records.set(tex, rec);
    }
    rec.used = this.frameNo;
    if (rec.uploadedRev !== tex.rev || rec.filter !== tex.filter) {
      const c = tex.canvas;
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
  ensure(tex: StageTexture, msLeft: number): { state: 'current' | 'stale' | 'absent'; spentMs: number } {
    const rec = this.records.get(tex);
    if (rec && rec.uploadedRev === tex.rev && rec.filter === tex.filter) {
      return { state: 'current', spentMs: 0 };
    }
    const bytes = tex.canvas.width * tex.canvas.height * 4;
    const est = uploadEstMs(bytes, this.uploadCostMsPerMb);
    if (!admitUpload(msLeft, est, !this.uploadedThisFrame)) {
      return { state: rec && rec.uploadedRev >= 0 ? 'stale' : 'absent', spentMs: 0 };
    }
    this.uploadedThisFrame = true;
    const t0 = performance.now();
    this.sync(tex);
    const spentMs = performance.now() - t0;
    this.uploadCostMsPerMb = nextUploadCost(this.uploadCostMsPerMb, spentMs, bytes);
    return { state: 'current', spentMs };
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

  statsReset(): void {
    this.uploadedBytes = 0;
    this.uploads = 0;
    this.drawCalls = 0;
    this.uploadedThisFrame = false;
    this.scratchPaints = 0;
    this.scratchUploadBytes = 0;
    this.sheetUploads = 0;
  }

  begin(w: number, h: number, dpr: number, clear: string | null): void {
    const gl = this.gl;
    this.dpr = dpr;
    this.bw = Math.round(w * dpr);
    this.bh = Math.round(h * dpr);
    if (this.canvas.width !== this.bw || this.canvas.height !== this.bh) {
      this.canvas.width = this.bw;
      this.canvas.height = this.bh;
    }
    gl.viewport(0, 0, this.bw, this.bh);
    gl.useProgram(this.program);
    gl.uniform2f(this.uRes, this.bw, this.bh);
    if (clear === null) {
      if (!this.isAlpha) throw new Error('stage: transparent clear on the opaque main target');
      gl.clearColor(0, 0, 0, 0);
    } else {
      const c = parseInt(clear.slice(1), 16);
      gl.clearColor(((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255, 1);
    }
    gl.clear(gl.COLOR_BUFFER_BIT);
    // Scratch hygiene: retire class pairs nothing has touched lately.
    if (++this.frameNo % 600 === 0) {
      for (const [cls, sc] of this.scratch) {
        if (sc.used < this.frameNo - 600) {
          gl.deleteTexture(sc.glTex);
          this.scratchBytes -= sc.bytes;
          this.scratch.delete(cls);
        }
      }
      // THE ORPHAN SWEEP: sprite-lane handles (WeakMap-owned, no
      // explicit evictor hook until part 2's atlas) reclaim here once
      // nothing has drawn them for ~15s. Chunks and bands still go
      // through their explicit release doors — this is the safety
      // net, not the lifecycle.
      for (const [tex, rec] of this.records) {
        if (rec.used < this.frameNo - 900) {
          gl.deleteTexture(rec.glTex);
          this.textureBytes -= rec.bytes;
          this.records.delete(tex);
        }
      }
    }
  }

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
      }
    }
    for (const sh of this.sheets) {
      if (!sh.dirty) continue;
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, sh.glTex);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sh.cv);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      sh.dirty = false;
      this.sheetUploads++;
      this.scratchUploadBytes += GlStage.SHEET_W * GlStage.SHEET_H * 4;
    }
    // Fill vertices in stream order; record per-run vertex offsets.
    const f32 = this.f32;
    const u8 = this.u8;
    let v = 0; // vertex index
    const runFirst: number[] = new Array(runs.length);
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
        } else {
          const cw = Math.ceil(pwDev / 64) * 64;
          const ch = Math.ceil(phDev / 64) * 64;
          u1 = pwDev / cw;
          v1 = phDev / ch;
        }
        const emitP = (px: number, py: number, uu: number, vv: number): void => {
          const fo = v * 5;
          f32[fo] = px;
          f32[fo + 1] = py;
          f32[fo + 2] = uu;
          f32[fo + 3] = vv;
          const bo = v * VERTEX_BYTES + 16;
          u8[bo] = 255;
          u8[bo + 1] = 255;
          u8[bo + 2] = 255;
          u8[bo + 3] = 255;
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
      const rec = run.tex ? this.sync(run.tex) : null;
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
          const fo = v * 5; // 5 floats of stride, last float aliased by u8 color
          f32[fo] = px;
          f32[fo + 1] = py;
          f32[fo + 2] = uu;
          f32[fo + 3] = vv;
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
        this.paintScratch(it, runFirst[ri]!);
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
      this.sheets.push({ cv, ctx, glTex, dirty: false });
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
      const cv = document.createElement('canvas');
      cv.width = cw;
      cv.height = ch;
      const ctx = cv.getContext('2d')!;
      sc = { cv, ctx, glTex: gl.createTexture()!, w: cw, h: ch, bytes: cw * ch * 4, used: this.frameNo };
      this.scratchBytes += sc.bytes;
      this.scratch.set(cls, sc);
    }
    sc.used = this.frameNo;
    const ctx = sc.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cw, ch);
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
      const fo = v * 5;
      f32[fo] = px;
      f32[fo + 1] = py;
      f32[fo + 2] = uu;
      f32[fo + 3] = vv;
      const bo = v * VERTEX_BYTES + 16;
      u8[bo] = pa;
      u8[bo + 1] = pa;
      u8[bo + 2] = pa;
      u8[bo + 3] = pa;
      v++;
    };
    emitC(0, 0, 0, 1);
    emitC(this.bw, 0, 1, 1);
    emitC(0, this.bh, 0, 0);
    emitC(0, this.bh, 0, 0);
    emitC(this.bw, 0, 1, 1);
    emitC(this.bw, this.bh, 1, 0);
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
