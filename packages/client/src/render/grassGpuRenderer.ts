/**
 * THE LIVING MEADOW GOES TO THE GPU (grass proposal, G-1) — the
 * instanced blade renderer.
 *
 * One WebGL2 program draws a whole field of painterly blades from a
 * single instance buffer. Each blade is a tapered triangle-strip the
 * vertex shader builds from its instance record (root, height, width,
 * lean, phase, tone), curves, and bends to THE ONE WIND (grassWindGlsl —
 * the exact CPU wind); the fragment shader colours it flat from the
 * shade→base→lit shimmer ramp (BLADE_FILLS) exactly as the baked meadow
 * does, so the art is ours, not approximated — no texture atlas needed,
 * because our blades are graded flat shapes, not textured detail.
 *
 * This is the renderer in isolation (fed instances, a view matrix, and
 * time). Scene integration — the camera homography, depth-LOD, the
 * y-sort slot, the ?grass=gpu flag — rides on top (proposal §A / G-2).
 */
import { grassWindGlsl, GRASS_INSTANCE_FLOATS } from './grassGpu.js';

/** Up-segments in a blade's triangle strip — enough to read the curve
 *  without over-tessellating a sub-inch blade. Verts = (SEG+1)·2. */
const BLADE_SEGMENTS = 6;
const BLADE_VERTS = (BLADE_SEGMENTS + 1) * 2;

/** Palette dimensions (must match ALL_TONES × LIGHTS in grass.ts). */
const PAL_TONES = 8;
const PAL_LIGHTS = 7;

const VERT_SRC = `#version 300 es
layout(location=0) in vec2 aTmpl;   // x = side [-1,1], y = up [0,1]
layout(location=1) in vec2 iRoot;   // world root
layout(location=2) in vec4 iShape;  // height, halfWidth, lean, phase
layout(location=3) in vec2 iTone;   // tone index, seg2
uniform mat3 uView;   // world -> clip (xy)
uniform float uTime;
uniform vec2 uWindGain; // x = bend gain, y = lean gain
out float vUp;
out float vTone;
out float vShimmer;
${grassWindGlsl()}
void main() {
  float up = aTmpl.y;
  float side = aTmpl.x;
  // Taper to a point at the tip — a blade, not a ribbon.
  float taper = pow(1.0 - up, 0.7);
  vec4 wind = grassWind(iRoot, uTime + iShape.w * 6.2831853);
  // Tip bends most (up^2): static lean + live wind, along the wind bend.
  float k = (iShape.z * uWindGain.y + wind.x * uWindGain.x) * up * up;
  vec2 world = iRoot;
  world.x += k + side * iShape.y * taper;
  world.y -= up * iShape.x;          // grow up-screen
  world.y += wind.y * up * up * uWindGain.x * 0.4; // a little forward sway
  vec3 p = uView * vec3(world, 1.0);
  gl_Position = vec4(p.xy, 0.0, 1.0);
  vUp = up;
  vTone = iTone.x;
  vShimmer = wind.w;
}`;

const FRAG_SRC = `#version 300 es
precision mediump float;
in float vUp;
in float vTone;
in float vShimmer;
uniform sampler2D uPalette;  // ${PAL_LIGHTS} lights × ${PAL_TONES} tones
out vec4 o;
void main() {
  // Flat blade colour from the shimmer ramp, exactly as the baked meadow:
  // the shimmer wave lifts the light step; the base darkens toward root.
  float light = clamp(0.25 + vShimmer * 0.5, 0.0, 1.0);
  float u = (light * float(${PAL_LIGHTS - 1}) + 0.5) / float(${PAL_LIGHTS});
  float v = (vTone + 0.5) / float(${PAL_TONES});
  vec3 col = texture(uPalette, vec2(u, v)).rgb;
  // Root shade: the lowest sliver sits a touch darker (rooted, not floating).
  col *= mix(0.82, 1.0, clamp(vUp * 3.0, 0.0, 1.0));
  o = vec4(col, 1.0);
}`;

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error(`grass shader compile failed: ${log}`);
  }
  return sh;
}

/** Parse `#rrggbb` → [r,g,b] bytes. */
function hexRgb(h: string): [number, number, number] {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export class GrassGpuRenderer {
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly vao: WebGLVertexArrayObject;
  private readonly instanceBuf: WebGLBuffer;
  private readonly palTex: WebGLTexture;
  private readonly uView: WebGLUniformLocation;
  private readonly uTime: WebGLUniformLocation;
  private readonly uWindGain: WebGLUniformLocation;
  private instanceCount = 0;

  /** `paletteFills` is BLADE_FILLS (PAL_TONES·PAL_LIGHTS `#rrggbb`, tone-
   *  major) — passed in so the renderer shares the meadow's exact ramp
   *  without importing the whole grass module's generation side. */
  constructor(gl: WebGL2RenderingContext, paletteFills: readonly string[]) {
    this.gl = gl;
    const program = gl.createProgram()!;
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT_SRC));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAG_SRC));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`grass program link failed: ${gl.getProgramInfoLog(program)}`);
    }
    this.program = program;
    this.uView = gl.getUniformLocation(program, 'uView')!;
    this.uTime = gl.getUniformLocation(program, 'uTime')!;
    this.uWindGain = gl.getUniformLocation(program, 'uWindGain')!;
    gl.useProgram(program);
    gl.uniform1i(gl.getUniformLocation(program, 'uPalette'), 0);

    // The blade template — a tapered triangle strip up the blade.
    const tmpl = new Float32Array(BLADE_VERTS * 2);
    for (let i = 0; i <= BLADE_SEGMENTS; i++) {
      const up = i / BLADE_SEGMENTS;
      tmpl[i * 4] = -1; // left side
      tmpl[i * 4 + 1] = up;
      tmpl[i * 4 + 2] = 1; // right side
      tmpl[i * 4 + 3] = up;
    }

    this.vao = gl.createVertexArray()!;
    gl.bindVertexArray(this.vao);
    const tmplBuf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, tmplBuf);
    gl.bufferData(gl.ARRAY_BUFFER, tmpl, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8, 0);

    this.instanceBuf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuf);
    const stride = GRASS_INSTANCE_FLOATS * 4;
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, stride, 0); // root
    gl.vertexAttribDivisor(1, 1);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 4, gl.FLOAT, false, stride, 8); // height,hw,lean,phase
    gl.vertexAttribDivisor(2, 1);
    gl.enableVertexAttribArray(3);
    gl.vertexAttribPointer(3, 2, gl.FLOAT, false, stride, 24); // tone, seg2
    gl.vertexAttribDivisor(3, 1);
    gl.bindVertexArray(null);

    // Palette texture: PAL_LIGHTS × PAL_TONES from the shimmer ramp.
    this.palTex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.palTex);
    const px = new Uint8Array(PAL_TONES * PAL_LIGHTS * 4);
    for (let tone = 0; tone < PAL_TONES; tone++) {
      for (let light = 0; light < PAL_LIGHTS; light++) {
        const fill = paletteFills[tone * PAL_LIGHTS + light] ?? '#659245';
        const [r, g, b] = hexRgb(fill);
        const o = (tone * PAL_LIGHTS + light) * 4;
        px[o] = r;
        px[o + 1] = g;
        px[o + 2] = b;
        px[o + 3] = 255;
      }
    }
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, PAL_LIGHTS, PAL_TONES, 0, gl.RGBA, gl.UNSIGNED_BYTE, px);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  /** Upload the packed instance buffer for this frame's blades. */
  upload(instances: Float32Array, count: number): void {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuf);
    gl.bufferData(gl.ARRAY_BUFFER, instances.subarray(0, count * GRASS_INSTANCE_FLOATS), gl.DYNAMIC_DRAW);
    this.instanceCount = count;
  }

  /** Draw the field. `view` is a 3×3 world→clip matrix (column-major, 9
   *  floats); `bendGain`/`leanGain` scale the live wind and static lean. */
  draw(view: Float32Array, timeSec: number, bendGain = 0.5, leanGain = 1): void {
    const gl = this.gl;
    if (this.instanceCount === 0) return;
    gl.useProgram(this.program);
    gl.uniformMatrix3fv(this.uView, false, view);
    gl.uniform1f(this.uTime, timeSec);
    gl.uniform2f(this.uWindGain, bendGain, leanGain);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.palTex);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.bindVertexArray(this.vao);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, BLADE_VERTS, this.instanceCount);
    gl.bindVertexArray(null);
  }
}
