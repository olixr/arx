/**
 * THE POST STACK ON WEBGL (play3d S1; backend/ since S3) — the HD-2D
 * unifier, on EffectComposer. Reached only through
 * `Backend.createPost` (stageBackend.ts).
 *
 *   RenderPass (scene → linear half-float target with a DEPTH texture)
 *   → InkPass (ONE fullscreen pass: depth-edge INK ring, tilt-shift,
 *     warm/cool grade, vignette)
 *   → OutputPass (linear → sRGB encode + tone mapping, the standard way)
 *
 * The July spike's post shader did its own `pow(1/2.2)` because a raw
 * ShaderMaterial sampling an sRGB target must re-encode or the frame
 * drops a stop. Modern Three.js makes that a non-problem: the composer
 * runs in LINEAR half-float and OutputPass owns the encode. The ink
 * pass reads the scene DEPTH texture off the composer's read buffer
 * (both ping-pong targets carry one — clone() copies the depth
 * texture), so the ring lands on every silhouette that has depth —
 * cliff lips, billboards against sky, bodies against ground — without
 * a normal buffer or a second geometry pass.
 *
 * The composer target is MULTISAMPLED (4×): the canvas itself carries
 * no MSAA (backend/webgl.ts), so the scene's edges — cliff lips,
 * terrain silhouettes — resolve here, and the depth texture the ink
 * pass reads is the resolved one. The target is built at the
 * renderer's DRAWING-BUFFER size and the composer is never told a
 * pixel ratio twice (EffectComposer multiplies a passed target's size
 * by the ratio again on setPixelRatio — the dpr² allocation).
 *
 * Toggleable: `enabled = false` renders the scene straight to the
 * canvas. Each stage has its own strength uniform for A/B.
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { FullScreenQuad, Pass } from 'three/examples/jsm/postprocessing/Pass.js';
import type { PostStage } from '../stageBackend.js';

/** The composer target's MSAA sample count. */
const SAMPLES = 4;

const INK_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const INK_FRAG = /* glsl */ `
#include <packing>
uniform sampler2D tDiffuse;
uniform sampler2D tDepth;
uniform vec2 texel;
uniform float cameraNear;
uniform float cameraFar;
uniform float nightK;
uniform float inkK;
uniform float tiltK;
uniform float gradeK;
uniform float focus;
varying vec2 vUv;

float viewZ(vec2 uv) {
  float d = texture2D(tDepth, uv).x;
  return -perspectiveDepthToViewZ(d, cameraNear, cameraFar);
}

vec3 blurred(vec2 uv, float amt) {
  if (amt < 0.001) return texture2D(tDiffuse, uv).rgb;
  vec3 acc = texture2D(tDiffuse, uv).rgb * 0.30;
  vec2 o1 = texel * amt * 1.5;
  vec2 o2 = texel * amt * 3.5;
  acc += texture2D(tDiffuse, uv + vec2(o1.x, 0.0)).rgb * 0.11;
  acc += texture2D(tDiffuse, uv - vec2(o1.x, 0.0)).rgb * 0.11;
  acc += texture2D(tDiffuse, uv + vec2(0.0, o1.y)).rgb * 0.11;
  acc += texture2D(tDiffuse, uv - vec2(0.0, o1.y)).rgb * 0.11;
  acc += texture2D(tDiffuse, uv + o2 * vec2(0.7, 0.7)).rgb * 0.065;
  acc += texture2D(tDiffuse, uv + o2 * vec2(-0.7, 0.7)).rgb * 0.065;
  acc += texture2D(tDiffuse, uv + o2 * vec2(0.7, -0.7)).rgb * 0.065;
  acc += texture2D(tDiffuse, uv + o2 * vec2(-0.7, -0.7)).rgb * 0.065;
  return acc;
}

void main() {
  // Tilt-shift: a crisp band around the action line, miniature blur
  // toward the top and bottom of the frame.
  float band = 0.16;
  float amt = smoothstep(band, 0.5, abs(vUv.y - focus)) * 5.0 * tiltK;
  vec3 col = blurred(vUv, amt);

  // THE INK RING: a depth discontinuity is a silhouette. Compare the
  // pixel's view depth with its 4 neighbours; a jump larger than a
  // depth-relative threshold is an edge. The ring darkens, never
  // paints — it is the dilate ring of the 2D art, found by depth.
  float z0 = viewZ(vUv);
  float zl = viewZ(vUv - vec2(texel.x, 0.0));
  float zr = viewZ(vUv + vec2(texel.x, 0.0));
  float zu = viewZ(vUv - vec2(0.0, texel.y));
  float zd = viewZ(vUv + vec2(0.0, texel.y));
  float jump = max(max(abs(zl - z0), abs(zr - z0)), max(abs(zu - z0), abs(zd - z0)));
  float thresh = 0.035 * z0 + 0.15;
  float edge = smoothstep(thresh, thresh * 2.5, jump);
  // Only the NEAR side of a silhouette inks (its depth is the smaller
  // one) so the ring hugs the body, not the ground behind it.
  float nearSide = step(z0, min(min(zl, zr), min(zu, zd)) + thresh * 0.5);
  col *= 1.0 - edge * nearSide * 0.72 * inkK;

  // Grade: warm day, cool night, gentle saturation, soft knee.
  vec3 warm = vec3(1.04, 1.0, 0.95);
  vec3 cool = vec3(0.9, 0.96, 1.14);
  vec3 g = mix(vec3(1.0), mix(warm, cool, nightK), gradeK);
  col *= g;
  float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(col, mix(vec3(luma), col, 1.08), gradeK);
  col = mix(col, col / (1.0 + 0.05 * col), gradeK);

  // Vignette.
  vec2 dv = vUv - vec2(0.5, 0.46);
  float vig = 1.0 - smoothstep(0.6, 1.1, length(dv) * 1.35);
  col *= mix(1.0, mix(0.84, 1.0, vig), gradeK);

  gl_FragColor = vec4(col, 1.0);
}
`;

class InkPass extends Pass {
  readonly material: THREE.ShaderMaterial;
  private readonly quad: FullScreenQuad;

  constructor(private readonly camera: THREE.PerspectiveCamera) {
    super();
    this.material = new THREE.ShaderMaterial({
      name: 'play3d-ink',
      vertexShader: INK_VERT,
      fragmentShader: INK_FRAG,
      uniforms: {
        tDiffuse: { value: null },
        tDepth: { value: null },
        texel: { value: new THREE.Vector2(1 / 1024, 1 / 1024) },
        cameraNear: { value: 0.5 },
        cameraFar: { value: 300 },
        nightK: { value: 0 },
        inkK: { value: 1 },
        tiltK: { value: 1 },
        gradeK: { value: 1 },
        focus: { value: 0.46 },
      },
      depthTest: false,
      depthWrite: false,
    });
    this.quad = new FullScreenQuad(this.material);
    this.needsSwap = true;
  }

  override render(
    renderer: THREE.WebGLRenderer,
    writeBuffer: THREE.WebGLRenderTarget,
    readBuffer: THREE.WebGLRenderTarget,
  ): void {
    const u = this.material.uniforms;
    u.tDiffuse!.value = readBuffer.texture;
    u.tDepth!.value = readBuffer.depthTexture;
    u.cameraNear!.value = this.camera.near;
    u.cameraFar!.value = this.camera.far;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    if (this.clear) renderer.clear();
    this.quad.render(renderer);
  }

  override setSize(width: number, height: number): void {
    (this.material.uniforms.texel!.value as THREE.Vector2).set(1 / width, 1 / height);
  }

  override dispose(): void {
    this.material.dispose();
    this.quad.dispose();
  }
}

export class PostStack implements PostStage {
  enabled = true;
  private readonly composer: EffectComposer;
  private readonly target: THREE.WebGLRenderTarget;
  private readonly scenePass: RenderPass;
  private readonly ink: InkPass;
  private readonly output: OutputPass;

  constructor(
    private readonly renderer: THREE.WebGLRenderer,
    private readonly scene: THREE.Scene,
    private readonly camera: THREE.PerspectiveCamera,
  ) {
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    const depth = new THREE.DepthTexture(size.x, size.y, THREE.UnsignedIntType);
    this.target = new THREE.WebGLRenderTarget(size.x, size.y, {
      type: THREE.HalfFloatType,
      depthTexture: depth,
      samples: SAMPLES,
    });
    // The composer reads the renderer's pixel ratio itself; `resize`
    // below is the only sizing path after construction.
    this.composer = new EffectComposer(renderer, this.target);
    this.scenePass = new RenderPass(scene, camera);
    this.composer.addPass(this.scenePass);
    this.ink = new InkPass(camera);
    this.composer.addPass(this.ink);
    this.output = new OutputPass();
    this.composer.addPass(this.output);
  }

  /** Strengths 0..1 for A/B: ink ring, tilt-shift, grade. */
  set(opts: { ink?: number; tilt?: number; grade?: number; night?: number }): void {
    const u = this.ink.material.uniforms;
    if (opts.ink !== undefined) u.inkK!.value = opts.ink;
    if (opts.tilt !== undefined) u.tiltK!.value = opts.tilt;
    if (opts.grade !== undefined) u.gradeK!.value = opts.grade;
    if (opts.night !== undefined) u.nightK!.value = opts.night;
  }

  /** CSS pixels + the renderer's pixel ratio (the composer scales). */
  resize(cssW: number, cssH: number, dpr: number): void {
    this.composer.setPixelRatio(dpr);
    this.composer.setSize(cssW, cssH);
  }

  render(): void {
    if (this.enabled) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    // EffectComposer.dispose releases its two targets and the copy pass
    // only; the passes we added own materials and quads of their own.
    this.composer.dispose();
    this.scenePass.dispose();
    this.ink.dispose();
    this.output.dispose();
    this.target.dispose();
  }
}
