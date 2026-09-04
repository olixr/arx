/**
 * THE BILLBOARD LAW ON WEBGL (play3d S3, split out of billboardMaterial.ts)
 * — the GLSL realisation of billboard.ts: yaw-only turn in the vertex
 * shader from the shared clock uniforms, alpha CUT in the fragment
 * (opaque, depth-tested, depth-written), the shadow proxy as the same
 * quad turned by `uSunYaw`, unlit with the sky rig's `uTint`, fogged
 * by the scene's depth fog through the standard chunks.
 *
 * Nothing outside backend/ imports this file: the lanes take a
 * `BillboardFactory` (billboard.ts) from the backend (stageBackend.ts).
 */
import * as THREE from 'three';
import type { BillboardClock, BillboardFactory, BillboardMaterialOpts } from '../billboard.js';

const VERT = /* glsl */ `
attribute vec3 iOrigin;
attribute vec2 iSize;
attribute vec4 iUv;
attribute vec2 iAnchor;
attribute float iPhase;
uniform float uYaw;
uniform float uTime;
uniform float uSway;
uniform float uSwayOn;
varying vec2 vUv;
#include <common>
#include <fog_pars_vertex>
void main() {
  vec2 q = position.xy;
  float c = cos(uYaw);
  float s = sin(uYaw);
  vec3 right = vec3(c, 0.0, -s);
  float lift = (q.y - iAnchor.y) * iSize.y;
  vec3 wpos = iOrigin + right * ((q.x - iAnchor.x) * iSize.x) + vec3(0.0, lift, 0.0);
  // Crown sway: grows with the square of height above the feet so the
  // trunk base stays planted (a tree, not a metronome).
  float hf = max(0.0, q.y - iAnchor.y);
  float sw = sin(uTime * 1.15 + iPhase) * uSway * uSwayOn * hf * hf * iSize.y;
  wpos += right * sw;
  vUv = mix(iUv.xy, iUv.zw, q);
  vec4 mvPosition = viewMatrix * vec4(wpos, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

const FRAG = /* glsl */ `
uniform sampler2D map;
uniform vec3 uTint;
uniform float uAlphaCut;
varying vec2 vUv;
#include <common>
#include <fog_pars_fragment>
void main() {
  vec4 c = texture2D(map, vUv);
  if (c.a < uAlphaCut) discard;
  gl_FragColor = vec4(c.rgb * uTint, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

const DEPTH_FRAG = /* glsl */ `
uniform sampler2D map;
uniform float uAlphaCut;
varying vec2 vUv;
void main() {
  if (texture2D(map, vUv).a < uAlphaCut) discard;
  gl_FragColor = vec4(1.0);
}
`;

function material(map: THREE.Texture, clock: BillboardClock, opts: BillboardMaterialOpts = {}): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    name: 'play3d-billboard',
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: {
      ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
      map: { value: map },
      uAlphaCut: { value: opts.alphaTest ?? 0.4 },
      uSwayOn: { value: opts.sway ? 1 : 0 },
      uYaw: clock.uYaw,
      uTime: clock.uTime,
      uSway: clock.uSway,
      uTint: clock.uTint,
    },
    fog: true,
    transparent: false,
    depthTest: true,
    depthWrite: true,
    side: THREE.DoubleSide,
  });
}

function depthMaterial(map: THREE.Texture, clock: BillboardClock, opts: BillboardMaterialOpts = {}): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    name: 'play3d-billboard-depth',
    vertexShader: VERT,
    fragmentShader: DEPTH_FRAG,
    uniforms: {
      ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
      map: { value: map },
      uAlphaCut: { value: opts.alphaTest ?? 0.4 },
      uSwayOn: { value: opts.sway ? 1 : 0 },
      uYaw: clock.uSunYaw,
      uTime: clock.uTime,
      uSway: clock.uSway,
      uTint: clock.uTint,
    },
    fog: false,
    side: THREE.DoubleSide,
  });
}

/** The WebGL billboard factory. */
export const webglBillboards: BillboardFactory = { material, depthMaterial };
