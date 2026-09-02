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

/** Max simultaneous disturbers (walkers/entities pressing the grass). */
const MAX_DISTURB = 8;

const VERT_SRC = `#version 300 es
layout(location=0) in vec2 aTmpl;   // x = side [-1,1], y = up [0,1]
layout(location=1) in vec2 iRoot;   // world root
layout(location=2) in vec4 iShape;  // height, halfWidth, lean, phase
layout(location=3) in vec2 iTone;   // tone index, seg2
uniform mat3 uView;   // world -> clip (xy)
uniform float uTime;
uniform vec2 uWindGain; // x = wind shear gain, y = reserved
uniform vec4 uDisturb[${MAX_DISTURB}]; // xy = world pos, z = radius, w = strength
uniform int uDisturbN;
out float vUp;
out float vSide;
out float vTone;
out float vShimmer;
out float vPress;
${grassWindGlsl()}
void main() {
  float up = aTmpl.y;
  float side = aTmpl.x;
  // A BLOCKY COLUMN: a tall, narrow, straight-sided rectangular prism with
  // a FLAT top and no taper — the vertical-slab grass of our low-poly
  // brand, not a leaf.
  float wj = 0.82 + 0.26 * fract(iShape.w * 7.31);
  vec4 wind = grassWind(iRoot, uTime + iShape.w * 6.2831853);
  vec2 root = iRoot;
  float height = iShape.x * 1.55;       // TALL
  float hw = iShape.y * 1.42 * wj;      // chunky bars, not hairlines

  // WIND — a whole-blade SHEAR, linear in height: the blade leans as a
  // clean parallelogram with straight edges and a flat top. No per-vertex
  // kink, no nudged tip — one cohesive blade of grass.
  float lean = wind.x * uWindGain.x;

  // TRAMPLING — entities pressing through splay the blades outward and
  // press them over; the field springs back as they pass. Summed over
  // nearby disturbers with a smoothstep falloff. A per-blade lay JITTER
  // rotates each blade's push a little off pure-radial, so a stepped-on
  // patch bends over naturally instead of skewering into a starburst.
  float jit = (fract(iShape.w * 17.13) - 0.5) * 0.8; // ±0.4 rad per blade
  float cj = cos(jit), sj = sin(jit);
  vec2 push = vec2(0.0);
  float press = 0.0;
  for (int i = 0; i < ${MAX_DISTURB}; i++) {
    if (i >= uDisturbN) break;
    vec2 d = root - uDisturb[i].xy;
    float r = max(uDisturb[i].z, 1e-3);
    float f = 1.0 - clamp(length(d) / r, 0.0, 1.0);
    f = f * f * (3.0 - 2.0 * f);                    // smoothstep falloff
    float s = f * uDisturb[i].w;
    vec2 dir = length(d) > 1e-4 ? normalize(d) : vec2(0.0, 1.0);
    dir = vec2(dir.x * cj - dir.y * sj, dir.x * sj + dir.y * cj); // jittered
    push += dir * s;
    press = max(press, s);
  }
  // Cap the press: a trodden patch LAYS OVER but is never a bare hole —
  // the grass keeps ~20% of its height, still present, just flattened.
  press = clamp(press, 0.0, 0.8);

  vec2 world = root;
  world.x += side * hw;                            // straight column width
  world.x += up * lean;                            // wind shear
  world.x += up * push.x * height;                 // trampled lay-over (x)
  world.y -= up * height * (1.0 - press);          // grow up; flattened when pressed
  world.y += up * push.y * height;                 // trampled lay-over (y)
  world.y += wind.y * up * uWindGain.x * 0.15;     // slight sway
  vec3 p = uView * vec3(world, 1.0);
  gl_Position = vec4(p.xy, 0.0, 1.0);
  vUp = up;
  vSide = side;
  vTone = iTone.x;
  vShimmer = wind.w;
  vPress = press;
}`;

const FRAG_SRC = `#version 300 es
precision mediump float;
in float vUp;
in float vSide;
in float vTone;
in float vShimmer;
in float vPress;
uniform sampler2D uPalette;  // ${PAL_LIGHTS} lights × ${PAL_TONES} tones
uniform float uOutline;      // 0 = none, 1 = brand self-contour
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
  // Trampled blades sink a step into shadow (pressed under the walker).
  float lightF = bandLight + vShimmer * 0.14 - faceShade - vPress * 0.22;
  float step = clamp(floor(lightF * float(${PAL_LIGHTS - 1}) + 0.5),
                     0.0, float(${PAL_LIGHTS - 1}));
  float u = (step + 0.5) / float(${PAL_LIGHTS});
  float v = (vTone + 0.5) / float(${PAL_TONES});
  vec3 col = texture(uPalette, vec2(u, v)).rgb;

  // BRAND OUTLINE (optional) — a dark contour on the blade's OWN
  // silhouette (its side edges and flat top), echoing the black-outline
  // shader our entities wear, at a weight that reads without muddying a
  // field of thousands. Off by default: grass is ground-cover, and every
  // blade stroked reads as noise; the flat-step prism shading is the
  // depth. This exists so the choice is a look, not a guess.
  if (uOutline > 0.5) {
    float sideEdge = smoothstep(0.80, 0.98, abs(vSide));
    float topEdge = smoothstep(0.90, 1.0, vUp);
    float rim = max(sideEdge, topEdge);
    col = mix(col, vec3(0.05, 0.06, 0.04), rim * 0.85);
  }
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
  private readonly uDisturb: WebGLUniformLocation;
  private readonly uDisturbN: WebGLUniformLocation;
  private readonly uOutline: WebGLUniformLocation;
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
    this.uDisturb = gl.getUniformLocation(program, 'uDisturb')!;
    this.uDisturbN = gl.getUniformLocation(program, 'uDisturbN')!;
    this.uOutline = gl.getUniformLocation(program, 'uOutline')!;
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

  /**
   * Draw the field. `view` is a 3×3 world→clip matrix (column-major, 9
   * floats). Options:
   *   · windGain — scales the whole-blade wind shear (default 0.12).
   *   · disturb  — walkers pressing the grass, packed 4 floats each
   *     [worldX, worldY, radius, strength], up to MAX_DISTURB; the scene
   *     feeds the nearby players/entities here each frame.
   *   · outline  — draw the brand self-contour on each blade (default off).
   */
  draw(
    view: Float32Array,
    timeSec: number,
    opts: { windGain?: number; disturb?: Float32Array; outline?: boolean } = {},
  ): void {
    const gl = this.gl;
    if (this.instanceCount === 0) return;
    gl.useProgram(this.program);
    gl.uniformMatrix3fv(this.uView, false, view);
    gl.uniform1f(this.uTime, timeSec);
    gl.uniform2f(this.uWindGain, opts.windGain ?? 0.12, 0);
    const disturb = opts.disturb;
    const n = disturb ? Math.min(MAX_DISTURB, Math.floor(disturb.length / 4)) : 0;
    gl.uniform1i(this.uDisturbN, n);
    if (n > 0) gl.uniform4fv(this.uDisturb, disturb!.subarray(0, n * 4));
    gl.uniform1f(this.uOutline, opts.outline ? 1 : 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.palTex);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.bindVertexArray(this.vao);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, BLADE_VERTS, this.instanceCount);
    gl.bindVertexArray(null);
  }
}
