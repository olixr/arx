/**
 * THE LIVING MEADOW GOES TO THE GPU (grass proposal, G-2) — the ornament
 * pass: flowers and seed-heads as a SECOND instanced program, drawn over
 * the blades.
 *
 * These carry the meadow's colour — the blue/yellow/cream/lavender blooms
 * and the golden grain ears the baked field deals sparsely. They are
 * rendered PROCEDURALLY (no atlas), faithful to the baked art:
 *   · a flower = a thin stem + a "pixel-flower plus" (four petal chips of
 *     the flower's palette around a cream core), exactly as buildFlower;
 *   · a seed-head = a thin stem + four gold chips tapering up an ear,
 *     alternating off the axis, exactly as buildSeed.
 * Both bend to THE ONE WIND (grassWindGlsl) — the same gust as the blades
 * and the CPU field. One instanced draw paints every bloom on screen.
 *
 * The instance record packs both kinds; `kind` (0 flower, 1 seed) selects
 * the head layout in the vertex shader. Colours come from ORNAMENT_FILLS
 * (grass.ts) so the blooms match the baked meadow to the byte.
 */
import { grassWindGlsl, grassProjectGlsl, type GrassProj } from './grassGpu.js';
import type { Flower, SeedHead } from './grass.js';

/** Floats per ornament instance:
 *  [rootX, rootY, height, size, kind, pal, phase, lean]. */
export const ORNAMENT_INSTANCE_FLOATS = 8;

/** Ornament palette size (ORNAMENT_FILLS: petal0..3, core, gold, stem). */
const PAL_N = 7;

/** Quad slots per ornament: stem + 4 head chips + core (flowers use all;
 *  seeds leave the core slot degenerate). Each slot = 2 triangles. */
const SLOTS = 6;
const VERTS = SLOTS * 6;

/**
 * Pack flowers then seed-heads into one interleaved instance buffer.
 * Flowers get kind=0 and their palette index; seeds get kind=1, their
 * static lean, and pal=0 (unused). Reuses `out` when it fits (pooled).
 * Returns the buffer and the instance count via `out` length semantics —
 * callers pass the count (flowers.length + seeds.length) alongside.
 */
export function packOrnamentInstances(
  flowers: readonly Flower[],
  seeds: readonly SeedHead[],
  out?: Float32Array,
): Float32Array {
  const n = flowers.length + seeds.length;
  const need = n * ORNAMENT_INSTANCE_FLOATS;
  const buf = out && out.length >= need ? out : new Float32Array(need);
  let o = 0;
  for (let i = 0; i < flowers.length; i++) {
    const f = flowers[i]!;
    buf[o] = f.bx;
    buf[o + 1] = f.by;
    buf[o + 2] = f.h;
    buf[o + 3] = f.size;
    buf[o + 4] = 0; // kind = flower
    buf[o + 5] = f.pal;
    buf[o + 6] = f.phase;
    buf[o + 7] = 0; // lean (flowers don't lean)
    o += ORNAMENT_INSTANCE_FLOATS;
  }
  for (let i = 0; i < seeds.length; i++) {
    const s = seeds[i]!;
    buf[o] = s.bx;
    buf[o + 1] = s.by;
    buf[o + 2] = s.h;
    buf[o + 3] = s.size;
    buf[o + 4] = 1; // kind = seed
    buf[o + 5] = 0;
    buf[o + 6] = s.phase;
    buf[o + 7] = s.lean;
    o += ORNAMENT_INSTANCE_FLOATS;
  }
  return buf;
}

const VERT_SRC = `#version 300 es
layout(location=0) in vec3 aVert;  // slot, cu(0/1), cv(0/1)
layout(location=1) in vec4 iA;     // rootX, rootY, height, size
layout(location=2) in vec4 iB;     // kind, pal, phase, lean
uniform float uTime;
uniform float uBobGain;
out float vPart;  // 0 stem, 1 petal, 2 core, 3 gold
out float vPal;
${grassProjectGlsl()}
${grassWindGlsl()}
void main() {
  float slot = aVert.x;
  vec2 root = iA.xy;
  float height = iA.z;
  float size = iA.w;
  float kind = iB.x;
  float pal = iB.y;
  float phase = iB.z;
  float lean = iB.w;

  // THE ONE WIND bob — flowers nod (·0.5·h), seed ears stream more
  // (·0.85·h + static lean), matching buildFlower / buildSeed.
  vec4 wind = grassWind(root, uTime + phase * 6.2831853);
  float bobK = kind < 0.5 ? 0.5 : 0.85;
  float bob = ((wind.x + wind.y * 0.35) * height * bobK + (kind < 0.5 ? 0.0 : lean)) * uBobGain;
  vec2 head = vec2(root.x + bob, root.y - height);   // up = -y (as blades)

  vec2 pos;
  float part;
  if (slot < 0.5) {
    // STEM — a thin quad root→head. cv picks root(0)/head(1); cu the width.
    part = 0.0;
    vec2 along = head - root;
    float len = max(1e-4, length(along));
    vec2 perp = vec2(-along.y, along.x) / len * 0.018;
    pos = mix(root, head, aVert.z) + perp * (aVert.y * 2.0 - 1.0);
  } else {
    vec2 center;
    vec2 hf;   // quad half-extent
    if (kind < 0.5) {
      if (slot < 4.5) {
        // Four petals in a plus, one tile-size arm out from the head.
        vec2 off = slot < 1.5 ? vec2(-1.0, 0.0)
                 : slot < 2.5 ? vec2(1.0, 0.0)
                 : slot < 3.5 ? vec2(0.0, -1.0)
                              : vec2(0.0, 1.0);
        center = head + off * size;
        hf = vec2(size * 0.5);
        part = 1.0;
      } else {
        center = head;             // cream core
        hf = vec2(size * 0.45);
        part = 2.0;
      }
    } else {
      if (slot < 4.5) {
        // Ear: gold chips stepping down from the tip, tapering, alternating.
        float i = slot - 1.0;
        float t = 1.0 - i * 0.13;
        float taper = i < 0.5 ? 0.55 : i < 1.5 ? 0.9 : i < 2.5 ? 1.0 : 0.75;
        float k = taper * size;
        float side = mod(i, 2.0) < 0.5 ? 1.0 : -1.0;
        center = root + (head - root) * t + vec2(side * size * 0.4, 0.0);
        hf = vec2(k * 0.7, k * 0.55);
        part = 3.0;
      } else {
        center = head;
        hf = vec2(0.0);            // seeds have no core — degenerate slot
        part = 3.0;
      }
    }
    vec2 corner = vec2(aVert.y * 2.0 - 1.0, aVert.z * 2.0 - 1.0);
    pos = center + corner * hf;
  }
  gl_Position = grassProject(pos);   // ONE PROJECTION (the camera affine)
  vPart = part;
  vPal = pal;
}`;

const FRAG_SRC = `#version 300 es
precision mediump float;
in float vPart;
in float vPal;
uniform sampler2D uPal;   // ${PAL_N}×1: petal0..3, core, gold, stem
out vec4 o;
void main() {
  // Flat colour by part — the ornament palette, no shading ramp (blooms
  // read as flat vector chips, like the baked pixel-flowers).
  float idx = vPart < 0.5 ? 6.0        // stem
            : vPart < 1.5 ? vPal       // petal 0..3
            : vPart < 2.5 ? 4.0        // core
                          : 5.0;       // gold
  o = vec4(texture(uPal, vec2((idx + 0.5) / float(${PAL_N}), 0.5)).rgb, 1.0);
}`;

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error(`ornament shader compile failed: ${log}`);
  }
  return sh;
}

function hexRgb(h: string): [number, number, number] {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export class GrassOrnamentRenderer {
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly vao: WebGLVertexArrayObject;
  private readonly tmplBuf: WebGLBuffer;
  private readonly instanceBuf: WebGLBuffer;
  private readonly palTex: WebGLTexture;
  private readonly uScale: WebGLUniformLocation;
  private readonly uYScale: WebGLUniformLocation;
  private readonly uOrigin: WebGLUniformLocation;
  private readonly uViewport: WebGLUniformLocation;
  private readonly uTime: WebGLUniformLocation;
  private readonly uBobGain: WebGLUniformLocation;
  private instanceCount = 0;
  private disposed = false;

  /** `palette` is ORNAMENT_FILLS ([petal0..3, core, gold, stem]). */
  constructor(gl: WebGL2RenderingContext, palette: readonly string[]) {
    this.gl = gl;
    if (palette.length < PAL_N) {
      throw new Error(`ornament palette must be ${PAL_N} fills, got ${palette.length}`);
    }
    const program = gl.createProgram()!;
    const vs = compile(gl, gl.VERTEX_SHADER, VERT_SRC);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG_SRC);
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    const linked = gl.getProgramParameter(program, gl.LINK_STATUS);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!linked) {
      const log = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error(`ornament program link failed: ${log}`);
    }
    this.program = program;
    this.uScale = gl.getUniformLocation(program, 'uScale')!;
    this.uYScale = gl.getUniformLocation(program, 'uYScale')!;
    this.uOrigin = gl.getUniformLocation(program, 'uOrigin')!;
    this.uViewport = gl.getUniformLocation(program, 'uViewport')!;
    this.uTime = gl.getUniformLocation(program, 'uTime')!;
    this.uBobGain = gl.getUniformLocation(program, 'uBobGain')!;
    gl.useProgram(program);
    gl.uniform1i(gl.getUniformLocation(program, 'uPal'), 0);

    // Template: SLOTS quads, each two triangles, verts carry (slot, cu, cv).
    const tmpl = new Float32Array(VERTS * 3);
    const corners = [
      [0, 0], [1, 0], [0, 1],
      [1, 0], [1, 1], [0, 1],
    ];
    let w = 0;
    for (let slot = 0; slot < SLOTS; slot++) {
      for (const [cu, cv] of corners) {
        tmpl[w++] = slot;
        tmpl[w++] = cu!;
        tmpl[w++] = cv!;
      }
    }

    this.vao = gl.createVertexArray()!;
    gl.bindVertexArray(this.vao);
    this.tmplBuf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.tmplBuf);
    gl.bufferData(gl.ARRAY_BUFFER, tmpl, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 12, 0);

    this.instanceBuf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuf);
    const stride = ORNAMENT_INSTANCE_FLOATS * 4;
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, stride, 0); // rootXY, height, size
    gl.vertexAttribDivisor(1, 1);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 4, gl.FLOAT, false, stride, 16); // kind, pal, phase, lean
    gl.vertexAttribDivisor(2, 1);
    gl.bindVertexArray(null);

    this.palTex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.palTex);
    const px = new Uint8Array(PAL_N * 4);
    for (let i = 0; i < PAL_N; i++) {
      const [r, g, b] = hexRgb(palette[i]!);
      px[i * 4] = r;
      px[i * 4 + 1] = g;
      px[i * 4 + 2] = b;
      px[i * 4 + 3] = 255;
    }
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, PAL_N, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, px);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  upload(instances: Float32Array, count: number): void {
    if (this.disposed) return;
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuf);
    gl.bufferData(gl.ARRAY_BUFFER, instances.subarray(0, count * ORNAMENT_INSTANCE_FLOATS), gl.DYNAMIC_DRAW);
    this.instanceCount = count;
  }

  /** Draw every ornament. `proj` is the same camera projection the
   *  blades use; `bobGain` scales the wind nod (1 = the baked meadow's sway). */
  draw(proj: GrassProj, timeSec: number, bobGain = 1): void {
    const gl = this.gl;
    if (this.disposed || this.instanceCount === 0) return;
    gl.useProgram(this.program);
    gl.uniform1f(this.uScale, proj.scale);
    gl.uniform1f(this.uYScale, proj.yScale);
    gl.uniform2f(this.uOrigin, proj.ox, proj.oy);
    gl.uniform2f(this.uViewport, proj.wCss, proj.hCss);
    gl.uniform1f(this.uTime, timeSec);
    gl.uniform1f(this.uBobGain, bobGain);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.palTex);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.bindVertexArray(this.vao);
    gl.drawArraysInstanced(gl.TRIANGLES, 0, VERTS, this.instanceCount);
    gl.bindVertexArray(null);
  }

  /** Free every GL object. Idempotent. */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    const gl = this.gl;
    gl.deleteBuffer(this.tmplBuf);
    gl.deleteBuffer(this.instanceBuf);
    gl.deleteVertexArray(this.vao);
    gl.deleteTexture(this.palTex);
    gl.deleteProgram(this.program);
    this.instanceCount = 0;
  }
}
