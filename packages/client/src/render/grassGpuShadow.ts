/**
 * THE MEADOW CASTS ITS OWN SHADE ON THE GPU (grass proposal, G-2) — the
 * instanced grass CAST renderer.
 *
 * The CPU meadow's shade is a frozen baked monolith EXCEPT a rectangle
 * swept LIVE around each moving body — a hard box edge that tracks the
 * player (the #2 "shadow radius" artifact). This renderer replaces that
 * whole scheme on the GPU path: every blade (short coat + tall bands)
 * projects a sheared GROUND shadow quad in the shader, thrown from the
 * blade's crown along the light ray, and bent by the SAME per-vertex wind
 * term the blades use (grassWindGlsl). So the whole field's shade sways
 * uniformly at frame rate — no baked monolith, no player-centred region,
 * no radius edge — and it is perspective-correct for free (both quad ends
 * are ground points run through the full projectWorld homography).
 *
 * The casts render OPAQUE (a flat shade colour) into a private offscreen
 * canvas as UNION coverage — overlapping quads overwrite, they do not
 * darken twice — exactly the CPU trick of baking casts opaque on one
 * canvas then compositing the whole layer at a single alpha. The renderer
 * then blits that canvas UNDER the blade coat at the frame's shade alpha:
 * THE CAST LIES UNDER THE COAT, one density with the world's shade.
 */
import {
  grassWindGlsl,
  grassProjectGlsl,
  grassDisturbGlsl,
  GRASS_INSTANCE_FLOATS,
  MAX_DISTURB,
  type GrassProj,
} from './grassGpu.js';

/** A cast quad is a 4-vertex strip: base pair (t=0) → tip pair (t=1). The
 *  vertex shader gives it its width and throw from the instance record. */
const SHADOW_VERTS = 4;

/** Parse `#rrggbb` → [r,g,b] in 0..1. */
function hexRgb01(h: string): [number, number, number] {
  const n = parseInt(h.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

const VERT_SRC = `#version 300 es
layout(location=0) in vec2 aTmpl;   // x = side [-1,1], y = t [0 base .. 1 tip]
layout(location=1) in vec2 iRoot;   // world root
layout(location=2) in vec4 iShape;  // height, halfWidth, lean, phase
uniform float uTime;
uniform float uWindGain;
// World-ground shadow throw PER UNIT world-height (x,y): the light ray's
// ground projection, folded with the camera's vertical squash so the cast
// lands where the CPU shade did. Tuned in the renderer from the sky.
uniform vec2 uShadow;
${grassProjectGlsl()}
${grassWindGlsl()}
${grassDisturbGlsl()}
void main() {
  float t = aTmpl.y;
  float side = aTmpl.x;
  // The blade's WORLD height (mirrors the blade shader's ×1.55) and its
  // wind lean (the SAME whole-blade shear the coat wears — grassWind ·
  // gain), so the shadow tip gusts exactly with the crown that casts it.
  float H = iShape.x * 1.55;
  vec4 wind = grassWind(iRoot, uTime + iShape.w * 6.2831853);
  float lean = wind.x * uWindGain;

  // G-INTERACT — the cast follows the parted coat: the SAME shared law the
  // blades use (grassDisturb) peels the shade over and shortens it in the
  // foot pocket, so the shade tracks the trampled blades exactly (a smooth,
  // per-body dimple — never the old hard swept box).
  float jit = (fract(iShape.w * 17.13) - 0.5) * 0.8;
  vec2 push;
  float press;
  grassDisturb(iRoot, jit, push, press);
  H *= (1.0 - press);                    // pocket blades cast a shorter shade

  // The cast on the GROUND PLANE: base rooted at the blade, tip thrown from
  // the (wind-bent, trampled) crown along the light ray. Both ends are
  // ground points → the full homography makes the shade recede correctly
  // at q>0 with no extra work.
  vec2 baseC = iRoot;
  vec2 tipC = iRoot + vec2(lean + push.x * H, push.y * H) + uShadow * H;
  // The GPU casts EVERY blade (the CPU cast only half, by bin parity, drawn
  // wider); a narrower quad keeps the summed shade density reading like the
  // CPU meadow's rather than a heavier blanket.
  float baseHW = iShape.y * 1.42 * 0.95;
  float tipHW = baseHW * 0.5;
  vec2 c = mix(baseC, tipC, t);
  float hw = mix(baseHW, tipHW, t);
  vec2 world = c + vec2(side * hw, 0.0);
  // Casts stay on flat ground for now (uElev defaults 0); the elevated coat
  // rides its shelf via the blade renderer. Root passed for the shared sig.
  gl_Position = grassProject(world, iRoot);
}`;

const FRAG_SRC = `#version 300 es
precision mediump float;
uniform vec3 uShade;    // flat cast colour (SHADOW_SUN / SHADOW_MOON)
out vec4 o;
void main() {
  // OPAQUE union coverage — overlapping casts overwrite (blend disabled),
  // never darken twice; the renderer composites the whole layer at the
  // frame's shade alpha, exactly as the CPU bakes-then-composites.
  o = vec4(uShade, 1.0);
}`;

/** The cast vertex shader source — exported so the parity test can assert
 *  it rides the shared wind + projection (no private copy that could drift). */
export function grassShadowVertSrc(): string {
  return VERT_SRC;
}

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error(`grass shadow shader compile failed: ${log}`);
  }
  return sh;
}

/**
 * Instanced grass-cast renderer. One WebGL2 program throws a sheared
 * ground quad from every blade; the short coat and the tall bands both
 * feed it (as two instanced draws into one canvas), so the entire visible
 * meadow's shade is one uniform, wind-animated layer with no radius.
 */
export class GrassShadowRenderer {
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly vao: WebGLVertexArrayObject;
  private readonly tmplBuf: WebGLBuffer;
  private readonly instanceBuf: WebGLBuffer;
  private readonly uTime: WebGLUniformLocation;
  private readonly uWindGain: WebGLUniformLocation;
  private readonly uShadow: WebGLUniformLocation;
  private readonly uShade: WebGLUniformLocation;
  private readonly uScale: WebGLUniformLocation;
  private readonly uYScale: WebGLUniformLocation;
  private readonly uOrigin: WebGLUniformLocation;
  private readonly uQ: WebGLUniformLocation;
  private readonly uViewport: WebGLUniformLocation;
  private readonly uDisturb: WebGLUniformLocation;
  private readonly uDisturbVel: WebGLUniformLocation;
  private readonly uDisturbN: WebGLUniformLocation;
  private disposed = false;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
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
      throw new Error(`grass shadow program link failed: ${log}`);
    }
    this.program = program;
    this.uTime = gl.getUniformLocation(program, 'uTime')!;
    this.uWindGain = gl.getUniformLocation(program, 'uWindGain')!;
    this.uShadow = gl.getUniformLocation(program, 'uShadow')!;
    this.uShade = gl.getUniformLocation(program, 'uShade')!;
    this.uScale = gl.getUniformLocation(program, 'uScale')!;
    this.uYScale = gl.getUniformLocation(program, 'uYScale')!;
    this.uOrigin = gl.getUniformLocation(program, 'uOrigin')!;
    this.uQ = gl.getUniformLocation(program, 'uQ')!;
    this.uViewport = gl.getUniformLocation(program, 'uViewport')!;
    this.uDisturb = gl.getUniformLocation(program, 'uDisturb')!;
    this.uDisturbVel = gl.getUniformLocation(program, 'uDisturbVel')!;
    this.uDisturbN = gl.getUniformLocation(program, 'uDisturbN')!;

    // The cast template: base pair (t=0) → tip pair (t=1), a 4-vertex strip.
    const tmpl = new Float32Array([-1, 0, 1, 0, -1, 1, 1, 1]);
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
    this.bindInstanceAttribs();
    gl.bindVertexArray(null);
  }

  private bindInstanceAttribs(): void {
    const gl = this.gl;
    const stride = GRASS_INSTANCE_FLOATS * 4;
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, stride, 0);  // root
    gl.vertexAttribPointer(2, 4, gl.FLOAT, false, stride, 8);  // height,hw,lean,phase
  }

  /** Upload the packed blade instances (same layout as the blade renderer;
   *  the cast reads only root + shape). */
  upload(instances: Float32Array, count: number): void {
    if (this.disposed) return;
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuf);
    gl.bufferData(gl.ARRAY_BUFFER, instances.subarray(0, count * GRASS_INSTANCE_FLOATS), gl.DYNAMIC_DRAW);
  }

  /**
   * Draw `count` casts. `shade` is [r,g,b] in 0..1 (opaque union coverage;
   * the layer alpha applies at blit). `uShadow` is the world-ground throw
   * per unit world-height. Blend is DISABLED so overlaps overwrite (no
   * double darkening); MSAA still softens the silhouette edges.
   */
  draw(
    proj: GrassProj,
    timeSec: number,
    count: number,
    shade: readonly [number, number, number],
    shadowX: number,
    shadowY: number,
    opts: { windGain?: number; disturb?: Float32Array; disturbVel?: Float32Array } = {},
  ): void {
    if (this.disposed || count === 0) return;
    const gl = this.gl;
    gl.useProgram(this.program);
    gl.uniform1f(this.uScale, proj.scale);
    gl.uniform1f(this.uYScale, proj.yScale);
    gl.uniform2f(this.uOrigin, proj.ox, proj.oy);
    gl.uniform1f(this.uQ, proj.q);
    gl.uniform2f(this.uViewport, proj.wCss, proj.hCss);
    gl.uniform1f(this.uTime, timeSec);
    gl.uniform1f(this.uWindGain, opts.windGain ?? 0.12);
    gl.uniform2f(this.uShadow, shadowX, shadowY);
    gl.uniform3f(this.uShade, shade[0], shade[1], shade[2]);
    const disturb = opts.disturb;
    const n = disturb ? Math.min(MAX_DISTURB, Math.floor(disturb.length / 4)) : 0;
    gl.uniform1i(this.uDisturbN, n);
    if (n > 0) {
      gl.uniform4fv(this.uDisturb, disturb!.subarray(0, n * 4));
      const vel = opts.disturbVel;
      if (vel && vel.length >= n * 2) gl.uniform2fv(this.uDisturbVel, vel.subarray(0, n * 2));
      else gl.uniform2fv(this.uDisturbVel, new Float32Array(n * 2));
    }
    gl.disable(gl.BLEND);
    gl.bindVertexArray(this.vao);
    this.bindInstanceAttribs();
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, SHADOW_VERTS, count);
    gl.bindVertexArray(null);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    const gl = this.gl;
    gl.deleteBuffer(this.tmplBuf);
    gl.deleteBuffer(this.instanceBuf);
    gl.deleteVertexArray(this.vao);
    gl.deleteProgram(this.program);
  }
}

/** Convert a `#rrggbb` shade colour to the [r,g,b] 0..1 the shader wants. */
export function shadeRgb01(hex: string): [number, number, number] {
  return hexRgb01(hex);
}

/**
 * THE ONE SHEAR, on the ground. The world-ground shadow throw per unit
 * world-height, derived from the sky's shear (shadowX/Y · shadowLen, the
 * SAME inputs the CPU `setShadow` uses). The CPU cast throws its tip a
 * screen offset of `dir·shadowLen·hpx` (hpx = the blade's screen height =
 * H·scale); our quad's tip is a WORLD ground point run through the SAME
 * projectWorld homography as the blades, which applies scale (and scale·
 * yScale on y). Equating the two screen offsets, the scale (and yScale)
 * factors cancel, leaving this pure world vector — so the GPU cast lands
 * exactly where the CPU shade did, at q=0 and (perspective-correct) q>0.
 * Pure + tested.
 */
export function grassShadowOffset(
  shadowX: number,
  shadowY: number,
  shadowLen: number,
): { x: number; y: number } {
  return { x: shadowX * shadowLen, y: shadowY * shadowLen };
}
