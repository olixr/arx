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
import { BLEND_GL_FUNC, blendNeedsAlphaTarget } from './stageBlend.js';
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

  constructor(readonly canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl2', {
      alpha: false,
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
      rec = { glTex: gl.createTexture()!, uploadedRev: -1, w: 0, h: 0, bytes: 0, filter: tex.filter };
      this.records.set(tex, rec);
    }
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

  /** ONE LIFECYCLE's release door — call from the cache evictors. */
  release(tex: StageTexture): void {
    const rec = this.records.get(tex);
    if (!rec) return;
    this.gl.deleteTexture(rec.glTex);
    this.textureBytes -= rec.bytes;
    this.records.delete(tex);
  }

  statsReset(): void {
    this.uploadedBytes = 0;
    this.uploads = 0;
    this.drawCalls = 0;
  }

  begin(w: number, h: number, dpr: number, clear: string): void {
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
    const c = parseInt(clear.slice(1), 16);
    gl.clearColor(((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  draw(items: readonly StageItem[]): void {
    if (items.length === 0) return;
    const gl = this.gl;
    const runs = computeRuns(items);
    // Size the scratch for the frame's quads, grow geometrically.
    let quadCount = 0;
    for (const r of runs) quadCount += r.quads;
    const need = quadCount * VERTS_PER_QUAD * VERTEX_BYTES;
    if (need > this.buf.byteLength) {
      let cap = this.buf.byteLength;
      while (cap < need) cap *= 2;
      this.buf = new ArrayBuffer(cap);
      this.f32 = new Float32Array(this.buf);
      this.u8 = new Uint8Array(this.buf);
    }
    // Fill vertices in stream order; record per-run vertex offsets.
    const f32 = this.f32;
    const u8 = this.u8;
    const dpr = this.dpr;
    let v = 0; // vertex index
    const runFirst: number[] = new Array(runs.length);
    for (let ri = 0; ri < runs.length; ri++) {
      const run = runs[ri]!;
      runFirst[ri] = v;
      if (run.quads === 0) continue;
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
        // A paint item reached the GL stage: not legal until A2.
        throw new Error('glStage: StagePaint requires the scratch-quad lane (phase A2)');
      }
      if (blendNeedsAlphaTarget(run.blend)) {
        // Same refusal, same words, as the canvas oracle: a contract
        // error must not depend on which backend caught it.
        throw new Error('stage: alpha-target blend on the opaque main target');
      }
      const rec = run.tex ? this.records.get(run.tex)! : null;
      gl.bindTexture(gl.TEXTURE_2D, rec ? rec.glTex : this.white);
      const [sf, df] = BLEND_GL_FUNC[run.blend]!;
      gl.blendFunc(sf, df);
      gl.drawArrays(gl.TRIANGLES, runFirst[ri]!, run.quads * VERTS_PER_QUAD);
      this.drawCalls++;
    }
  }

  end(): void {
    this.gl.flush();
  }
}
