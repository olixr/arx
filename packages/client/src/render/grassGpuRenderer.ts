/**
 * THE LIVING MEADOW GOES TO THE GPU (grass proposal, G-1) — the
 * instanced blade renderer.
 *
 * One WebGL2 program draws a whole field of blocky, low-poly blades from
 * a single instance buffer. Each blade is a near-rectangular strip (a
 * blunt chisel top, not a spike) the vertex shader builds from its
 * instance record (root, height, width, lean, phase, tone) and leans to
 * THE ONE WIND (grassWindGlsl — the exact CPU wind); the fragment shader
 * shades it in FLAT tone bands — shaded root (AO) → body → lit cap, hard
 * steps off the shimmer ramp (BLADE_FILLS), never a gradient — so the
 * blade reads as our vectorized, faceted brand, not a soft smear. No
 * texture atlas: the blades are flat graded facets, not textured detail.
 *
 * This is the renderer in isolation (fed instances, a view matrix, and
 * time). Scene integration — the camera homography, depth-LOD, the
 * y-sort slot, the ?grass=gpu flag — rides on top (proposal §A / G-2).
 */
import { grassWindGlsl, GRASS_INSTANCE_FLOATS } from './grassGpu.js';

/** Up-segments in a blade's strip — a blocky blade leans as a gentle arc,
 *  so a few segments suffice (fewer = crisper, blockier). Verts=(SEG+1)·2. */
const BLADE_SEGMENTS = 5;
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
out float vSide;
out float vTone;
out float vShimmer;
${grassWindGlsl()}
void main() {
  float up = aTmpl.y;
  float side = aTmpl.x;
  // A BLOCKY COLUMN: a tall, narrow, straight-sided rectangular prism —
  // FLAT top, no taper (just a hair off the razor top edge). The blade
  // stands bolt upright; only its very tip drifts with the wind. This is
  // the vertical-slab grass of our low-poly brand, not a leaf.
  float taper = 1.0 - smoothstep(0.94, 1.0, up) * 0.10;
  float wj = 0.82 + 0.26 * fract(iShape.w * 7.31);
  vec4 wind = grassWind(iRoot, uTime + iShape.w * 6.2831853);
  // DEAD STRAIGHT: the column ignores the source blade's lean entirely
  // (that's the soft-meadow art); only the very TOP (up^6) drifts a hair
  // in the wind, so the bars stay vertical and blocky.
  float tipDrift = pow(up, 8.0);        // only the very crown drifts
  float k = wind.x * uWindGain.x * tipDrift;
  vec2 world = iRoot;
  float hw = iShape.y * 1.42 * wj;      // chunky bars (not hairlines)
  world.x += k + side * hw * taper;
  world.y -= up * iShape.x * 1.55;      // TALL columns (grow up-screen)
  world.y += wind.y * tipDrift * uWindGain.x * 0.2;
  vec3 p = uView * vec3(world, 1.0);
  gl_Position = vec4(p.xy, 0.0, 1.0);
  vUp = up;
  vSide = side;
  vTone = iTone.x;
  vShimmer = wind.w;
}`;

const FRAG_SRC = `#version 300 es
precision mediump float;
in float vUp;
in float vSide;
in float vTone;
in float vShimmer;
uniform sampler2D uPalette;  // ${PAL_LIGHTS} lights × ${PAL_TONES} tones
out vec4 o;
void main() {
  // FLAT LOW-POLY PRISM SHADING — the column reads as a 3D slab from a
  // few HARD tone steps, never a gradient:
  //   · a LIT TOP CAP (the flat top catches the overhead light),
  //   · a shadowed vertical FACE (one half a step darker → the column's
  //     turned side, meeting the lit half at a central 3D edge),
  //   · a body, and an AO base where it roots into the ground.
  // The wind shifts the whole blade's step as one. This is the faceted,
  // vectorized depth of our brand.
  float bandLight = vUp > 0.82 ? 0.74   // lit top cap (flat top to the sun)
                  : vUp < 0.16 ? 0.04   // AO base (rooted in shadow)
                               : 0.40;  // body
  // The column's two vertical faces: one lit, one turned into shadow,
  // meeting at a central 3D edge — the strongest low-poly block cue.
  float faceShade = vSide < 0.0 ? 0.18 : -0.05;
  float lightF = bandLight + vShimmer * 0.14 - faceShade;
  float step = clamp(floor(lightF * float(${PAL_LIGHTS - 1}) + 0.5),
                     0.0, float(${PAL_LIGHTS - 1}));
  float u = (step + 0.5) / float(${PAL_LIGHTS});
  float v = (vTone + 0.5) / float(${PAL_TONES});
  vec3 col = texture(uPalette, vec2(u, v)).rgb;
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

    // The blade template — a strip of side pairs up the blade; the vertex
    // shader gives it its rectangular width and lean.
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
    // NEAREST: the palette is a set of discrete flat tones — no blending
    // between steps, so the banded facet shading stays crisp and vectored.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
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
