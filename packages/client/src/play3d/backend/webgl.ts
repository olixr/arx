/**
 * THE WEBGL BACKEND (play3d S3) — the one realisation of stageBackend.ts
 * that is wired: three's WebGLRenderer on a WebGL2 context.
 *
 * Laws realised here:
 *  - sRGB output, no tone mapping (the painters are the grade; the
 *    post stack's OutputPass owns the encode when it is on).
 *  - PCF shadow map (PCFSoft is deprecated in r185 and collapses to
 *    PCF; `shadow.radius` is the soft edge now).
 *  - `info.autoReset = false`: the engine resets the ledger at frame
 *    start so a multi-pass frame (shadow map + scene + post) confesses
 *    its whole cost, not the last pass.
 *  - THE SUB-RECT UPLOAD: `blit` lands a painted canvas on a resident
 *    atlas page with `copyTextureToTexture` (texSubImage2D under the
 *    hood — r185 regenerates the mip chain itself when the copy hits
 *    level 0 of a mipmapped texture), so an atlas page is uploaded in
 *    full exactly once (`prepareTexture`) and never again.
 *  - Context loss is an event pair on the canvas; the engine hears it
 *    through `watchContext` and never names the event itself.
 */
import * as THREE from 'three';
import type { Backend, BackendOpts, PostStage } from '../stageBackend.js';
import { webglBillboards } from './webglBillboard.js';
import { PostStack } from './webglPost.js';

class WebGLBackend implements Backend {
  readonly kind = 'webgl' as const;
  readonly renderer: THREE.WebGLRenderer;
  readonly billboards = webglBillboards;
  private readonly srcTex: THREE.CanvasTexture;
  private readonly dstPos = new THREE.Vector2();

  constructor(
    private readonly canvas: HTMLCanvasElement,
    opts: BackendOpts,
  ) {
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: opts.antialias ?? false,
      powerPreference: 'high-performance',
      stencil: false,
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.info.autoReset = false;
    this.renderer = renderer;
    // One CanvasTexture wrapper is re-pointed at each source canvas;
    // it is never uploaded itself (copyTextureToTexture reads its image
    // straight into texSubImage2D), so it holds no GPU bytes.
    this.srcTex = new THREE.CanvasTexture(document.createElement('canvas'));
    this.srcTex.colorSpace = THREE.SRGBColorSpace;
  }

  createPost(scene: THREE.Scene, camera: THREE.PerspectiveCamera): PostStage {
    return new PostStack(this.renderer, scene, camera);
  }

  prepareTexture(tex: THREE.Texture): void {
    this.renderer.initTexture(tex);
  }

  blit(src: HTMLCanvasElement, dst: THREE.Texture, x: number, y: number, finish: boolean): void {
    this.srcTex.image = src;
    this.srcTex.flipY = dst.flipY;
    this.srcTex.premultiplyAlpha = dst.premultiplyAlpha;
    // Texture rows run bottom-up under flipY: canvas-space y lands at
    // row (pageHeight - y - srcHeight).
    const pageH = (dst.image as { height: number }).height;
    this.dstPos.set(x, dst.flipY ? pageH - y - src.height : y);
    const mips = dst.generateMipmaps;
    dst.generateMipmaps = mips && finish;
    this.renderer.copyTextureToTexture(this.srcTex, dst, null, this.dstPos);
    dst.generateMipmaps = mips;
  }

  watchContext(onLost: () => void, onRestored: () => void): () => void {
    const lost = (e: Event): void => {
      e.preventDefault();
      onLost();
    };
    const restored = (): void => onRestored();
    this.canvas.addEventListener('webglcontextlost', lost);
    this.canvas.addEventListener('webglcontextrestored', restored);
    return () => {
      this.canvas.removeEventListener('webglcontextlost', lost);
      this.canvas.removeEventListener('webglcontextrestored', restored);
    };
  }

  dispose(): void {
    this.srcTex.dispose();
    this.renderer.dispose();
  }
}

export function createWebGLBackend(canvas: HTMLCanvasElement, opts: BackendOpts): Backend {
  return new WebGLBackend(canvas, opts);
}
