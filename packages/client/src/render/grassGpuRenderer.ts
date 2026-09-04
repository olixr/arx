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
import {
  grassWindGlsl,
  grassProjectGlsl,
  grassDisturbGlsl,
  GRASS_INSTANCE_FLOATS,
  MAX_DISTURB,
  type GrassProj,
} from './grassGpu.js';

// Re-export so the shadow renderer + scene feed keep importing MAX_DISTURB
// from the blade renderer (its historical home) even though the constant now
// lives with the shared disturbance substrate in grassGpu.ts.
export { MAX_DISTURB };

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
uniform float uTime;
uniform vec2 uWindGain; // x = wind shear gain, y = reserved
// G1 ATLAS REMAP: retarget the real-screen NDC into a band's atlas slot
// (xy = scale, zw = bias). (1,1,0,0) = identity = the whole real screen
// (the short-coat / ornament path, byte-identical to before).
uniform vec4 uNdcRemap;
out float vUp;
out float vTone;
out float vShimmer;
out float vPress;
${grassProjectGlsl()}
${grassWindGlsl()}
${grassDisturbGlsl()}
void main() {
  float up = aTmpl.y;
  float side = aTmpl.x;
  // A BLOCKY COLUMN: a tall, narrow, straight-sided rectangular prism with
  // a FLAT top and no taper — the vertical-slab grass of our low-poly
  // brand, not a leaf.
  float wj = 0.68 + 0.48 * fract(iShape.w * 7.31);
  vec4 wind = grassWind(iRoot, uTime + iShape.w * 6.2831853);
  vec2 root = iRoot;
  // A LAYERED MEADOW, NOT ONE HEIGHT (grass-elevate pass): a stable per-blade
  // height multiplier keyed on the root position gives every blade its own
  // stature, so the field reads as a natural mix of short ground blades,
  // medium stands and taller tufts — ankle-to-knee coat, thickets to the
  // waist — instead of a single mown level. The blades were left too SHORT by
  // the width-halving pass; this lifts the whole register and spreads it.
  float hvar = 0.86 + 0.34 * fract(sin(dot(iRoot, vec2(12.9898, 78.233))) * 43758.5453);
  float height = iShape.x * 1.66 * hvar;  // ankle→knee coat, waist-high thickets
  float hw = iShape.y * 0.78 * wj;        // keep the fine width from last pass
  // Taller blades read a hair fuller at the base so a knee-high stand does not
  // vanish to a thread — the fine width stays, the tallest just aren't wisps.
  hw *= 0.94 + 0.12 * clamp(height * 0.9, 0.0, 1.0);

  // WIND — a whole-blade SHEAR, linear in height: the blade leans as a
  // clean parallelogram with straight edges and a flat top. No per-vertex
  // kink, no nudged tip — one cohesive blade of grass.
  float lean = wind.x * uWindGain.x;

  // G-INTERACT — THE MEADOW PARTS. A body pressing through peels the blades
  // radially outward (a pocket opens around the feet), combs them down in
  // its direction of travel, and flattens the tight foot tile so the feet
  // read on top; the field springs back as the body passes. One shared law
  // (grassDisturb) the coat, the tall bands and the cast all obey.
  float jit = (fract(iShape.w * 17.13) - 0.5) * 0.8; // ±0.4 rad per blade
  vec2 push;
  float press;
  grassDisturb(root, jit, push, press);

  vec2 world = root;
  world.x += side * hw;                            // straight column width
  world.x += up * lean;                            // wind shear
  world.x += up * push.x * height;                 // parted lay-over (x)
  world.y -= up * height * (1.0 - press);          // grow up; flattened in the pocket
  world.y += up * push.y * height;                 // parted lay-over (y)
  world.y += wind.y * up * uWindGain.x * 0.15;     // slight sway
  // ONE PROJECTION: the full projectWorld homography (perspective divide in
  // the shader), so the whole blade — root through leaned/trampled tip —
  // recedes with the world at exactly the player's parallax rate.
  // ONE PROJECTION then the atlas remap: a pure NDC→NDC affine applied
  // AFTER the perspective divide, so it is correct at q=0 and q>0 alike.
  vec4 c = grassProject(world, root);
  gl_Position = vec4(c.xy * uNdcRemap.xy + uNdcRemap.zw, 0.0, 1.0);
  vUp = up;
  vTone = iTone.x;
  vShimmer = wind.w;
  vPress = press;
}`;

const FRAG_SRC = `#version 300 es
precision mediump float;
in float vUp;
in float vTone;
in float vShimmer;
in float vPress;
uniform sampler2D uPalette;  // ${PAL_LIGHTS} lights × ${PAL_TONES} tones
out vec4 o;
void main() {
  // FLAT-VECTORIZED, TOP-LIT depth — NOT a 3D pillar. The sun is overhead,
  // so each blade is a flat shape lit at the TIP and sinking to SHADOW at
  // the ROOT: a two-point vertical tone ramp resolved into a few HARD flat
  // steps (NEAREST palette). No side/face shading (we're flat-vectorized,
  // not volumetric), no gradient smear, no dark cap — light comes from
  // above, so the top is brightest and the base holds the shadow.
  float lightF = 0.18 + vUp * 0.48;      // root shadow → tip light
  lightF += vShimmer * 0.12;             // the gust lifts the blade a touch
  lightF -= vPress * 0.20;               // trampled blades sink into shadow
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
  private readonly tmplBuf: WebGLBuffer;
  private readonly instanceBuf: WebGLBuffer;
  private readonly palTex: WebGLTexture;
  private readonly uScale: WebGLUniformLocation;
  private readonly uYScale: WebGLUniformLocation;
  private readonly uOrigin: WebGLUniformLocation;
  private readonly uQ: WebGLUniformLocation;
  private readonly uViewport: WebGLUniformLocation;
  private readonly uTime: WebGLUniformLocation;
  private readonly uWindGain: WebGLUniformLocation;
  private readonly uDisturb: WebGLUniformLocation;
  private readonly uDisturbVel: WebGLUniformLocation;
  private readonly uDisturbN: WebGLUniformLocation;
  private readonly uNdcRemap: WebGLUniformLocation;
  private readonly uElev: WebGLUniformLocation;
  private instanceCount = 0;
  private disposed = false;

  /** `paletteFills` is BLADE_FILLS (PAL_TONES·PAL_LIGHTS `#rrggbb`, tone-
   *  major) — passed in so the renderer shares the meadow's exact ramp
   *  without importing the whole grass module's generation side. */
  constructor(gl: WebGL2RenderingContext, paletteFills: readonly string[]) {
    this.gl = gl;
    if (paletteFills.length < PAL_TONES * PAL_LIGHTS) {
      // The palette drives every blade's colour; a short one would silently
      // fall back tone-by-tone and mis-shade the field. Fail loud instead.
      throw new Error(
        `grass palette must be ${PAL_TONES}×${PAL_LIGHTS}=${PAL_TONES * PAL_LIGHTS} fills, got ${paletteFills.length}`,
      );
    }
    const program = gl.createProgram()!;
    // Shaders are retained by the program once linked; delete our handles so
    // they don't outlive the link (the program owns them thereafter).
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
      throw new Error(`grass program link failed: ${log}`);
    }
    this.program = program;
    this.uScale = gl.getUniformLocation(program, 'uScale')!;
    this.uYScale = gl.getUniformLocation(program, 'uYScale')!;
    this.uOrigin = gl.getUniformLocation(program, 'uOrigin')!;
    this.uQ = gl.getUniformLocation(program, 'uQ')!;
    this.uViewport = gl.getUniformLocation(program, 'uViewport')!;
    this.uTime = gl.getUniformLocation(program, 'uTime')!;
    this.uWindGain = gl.getUniformLocation(program, 'uWindGain')!;
    this.uDisturb = gl.getUniformLocation(program, 'uDisturb')!;
    this.uDisturbVel = gl.getUniformLocation(program, 'uDisturbVel')!;
    this.uDisturbN = gl.getUniformLocation(program, 'uDisturbN')!;
    this.uNdcRemap = gl.getUniformLocation(program, 'uNdcRemap')!;
    this.uElev = gl.getUniformLocation(program, 'uElev')!;
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
    this.tmplBuf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.tmplBuf);
    gl.bufferData(gl.ARRAY_BUFFER, tmpl, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8, 0);

    this.instanceBuf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuf);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribDivisor(1, 1);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribDivisor(2, 1);
    gl.enableVertexAttribArray(3);
    gl.vertexAttribDivisor(3, 1);
    this.bindInstanceAttribs(0);
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

  /** Set the trample uniforms from a frame's packed disturbers: POSITION
   *  `[x,y,r,strength]×n` and the parallel VELOCITY lay-vector `[vx,vy]×n`.
   *  A missing velocity array leaves the wake at zero (pure radial part). */
  private setDisturb(opts: { disturb?: Float32Array; disturbVel?: Float32Array }): void {
    const gl = this.gl;
    const disturb = opts.disturb;
    const n = disturb ? Math.min(MAX_DISTURB, Math.floor(disturb.length / 4)) : 0;
    gl.uniform1i(this.uDisturbN, n);
    if (n > 0) {
      gl.uniform4fv(this.uDisturb, disturb!.subarray(0, n * 4));
      const vel = opts.disturbVel;
      if (vel && vel.length >= n * 2) gl.uniform2fv(this.uDisturbVel, vel.subarray(0, n * 2));
      else gl.uniform2fv(this.uDisturbVel, new Float32Array(n * 2));
    }
  }

  /** (Re)point the interleaved instance attributes so instance 0 reads
   *  from blade `baseFloats/GRASS_INSTANCE_FLOATS` — used to draw a
   *  contiguous band slice (WebGL2 has no baseInstance). Assumes the VAO
   *  and instance buffer are bound. */
  private bindInstanceAttribs(baseFloats: number): void {
    const gl = this.gl;
    const stride = GRASS_INSTANCE_FLOATS * 4;
    const base = baseFloats * 4;
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, stride, base + 0); // root
    gl.vertexAttribPointer(2, 4, gl.FLOAT, false, stride, base + 8); // height,hw,lean,phase
    gl.vertexAttribPointer(3, 2, gl.FLOAT, false, stride, base + 24); // tone, seg2
  }

  /** Upload the packed instance buffer for this frame's blades. */
  upload(instances: Float32Array, count: number): void {
    if (this.disposed) return;
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuf);
    gl.bufferData(gl.ARRAY_BUFFER, instances.subarray(0, count * GRASS_INSTANCE_FLOATS), gl.DYNAMIC_DRAW);
    this.instanceCount = count;
  }

  /**
   * Draw the field. `proj` carries the frame's projectWorld homography
   * inputs (the whole meadow rides one projection). Options:
   *   · windGain — scales the whole-blade wind shear (default 0.12).
   *   · disturb  — walkers pressing the grass, packed 4 floats each
   *     [worldX, worldY, radius, strength], up to MAX_DISTURB; the scene
   *     feeds the nearby players/entities here each frame.
   */
  draw(
    proj: GrassProj,
    timeSec: number,
    opts: { windGain?: number; disturb?: Float32Array; disturbVel?: Float32Array } = {},
  ): void {
    const gl = this.gl;
    if (this.disposed || this.instanceCount === 0) return;
    gl.useProgram(this.program);
    gl.uniform1f(this.uScale, proj.scale);
    gl.uniform1f(this.uYScale, proj.yScale);
    gl.uniform2f(this.uOrigin, proj.ox, proj.oy);
    gl.uniform1f(this.uQ, proj.q);
    gl.uniform2f(this.uViewport, proj.wCss, proj.hCss);
    gl.uniform1f(this.uTime, timeSec);
    gl.uniform2f(this.uWindGain, opts.windGain ?? 0.12, 0);
    this.setDisturb(opts);
    // Identity remap: the short coat / whole field targets the real screen.
    gl.uniform4f(this.uNdcRemap, 1, 1, 0, 0);
    // Flat ground: no terrace lift (the elevated bands set this per band).
    gl.uniform1f(this.uElev, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.palTex);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.bindVertexArray(this.vao);
    this.bindInstanceAttribs(0);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, BLADE_VERTS, this.instanceCount);
    gl.bindVertexArray(null);
  }

  /**
   * G1 — THE TALL BLADE INTERLEAVES. Set the shared per-frame uniforms
   * (projection, wind, time, disturbers) ONCE for a run of band sub-draws.
   * `count` blades are uploaded (the whole by-sorted tall array); each
   * band is then a `drawBand` slice into its own atlas slot. Call before
   * a sequence of drawBand, then drawBandEnd.
   */
  beginBands(
    instances: Float32Array,
    count: number,
    proj: GrassProj,
    timeSec: number,
    opts: { windGain?: number; disturb?: Float32Array; disturbVel?: Float32Array } = {},
  ): void {
    if (this.disposed) return;
    const gl = this.gl;
    this.upload(instances, count);
    gl.useProgram(this.program);
    gl.uniform1f(this.uScale, proj.scale);
    gl.uniform1f(this.uYScale, proj.yScale);
    gl.uniform2f(this.uOrigin, proj.ox, proj.oy);
    gl.uniform1f(this.uQ, proj.q);
    gl.uniform2f(this.uViewport, proj.wCss, proj.hCss);
    gl.uniform1f(this.uTime, timeSec);
    gl.uniform2f(this.uWindGain, opts.windGain ?? 0.12, 0);
    this.setDisturb(opts);
    // Bands default to flat; the elevated-coat bands raise it per drawBand.
    gl.uniform1f(this.uElev, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.palTex);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.bindVertexArray(this.vao);
  }

  /** Draw one band slice [i0, i0+count) with its atlas NDC remap. The
   *  caller has set the atlas viewport/scissor for this band's slot. `elev`
   *  (WORLD height, level·ELEV_H) lifts the whole band onto its terrace
   *  shelf (G-ELEVATED); 0 = flat (tall + skirt bands). */
  drawBand(
    i0: number,
    count: number,
    remap: { sx: number; sy: number; bx: number; by: number },
    elev = 0,
  ): void {
    if (this.disposed || count <= 0) return;
    const gl = this.gl;
    gl.uniform4f(this.uNdcRemap, remap.sx, remap.sy, remap.bx, remap.by);
    gl.uniform1f(this.uElev, elev);
    this.bindInstanceAttribs(i0 * GRASS_INSTANCE_FLOATS);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, BLADE_VERTS, count);
  }

  /** End a band run: unbind the VAO and restore the base attrib offset so
   *  a subsequent whole-field `draw` starts at instance 0. */
  drawBandEnd(): void {
    if (this.disposed) return;
    const gl = this.gl;
    this.bindInstanceAttribs(0);
    gl.bindVertexArray(null);
  }

  /**
   * Free every GL object this renderer owns. Call when swapping the flag
   * off, changing maps, or before re-creating on context restore — a
   * long-lived game must not leak programs/buffers/textures. Idempotent.
   */
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
