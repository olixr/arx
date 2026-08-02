/**
 * THE MINIMAP INSTRUMENT — the zone at a glance, ported from v1: a
 * flat tile-color bitmap rebuilt at most every 350ms, the gold
 * viewport window, click-jump and drag-pan.
 */

import { tileDef } from '@arx/shared';
import type { EditorView } from '../editor/render.js';
import type { EditorState } from '../editor/state.js';

const MM_SIZE = 168;

export class Minimap {
  private bitmap: HTMLCanvasElement | null = null;
  dirty = true;
  private lastBuild = 0;
  private dragging = false;
  private readonly colors = new Map<number, [number, number, number]>();

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly viewCanvas: HTMLCanvasElement,
    private readonly state: EditorState,
    private readonly view: EditorView,
    private readonly onJump: () => void,
  ) {
    canvas.addEventListener('mousedown', (e) => {
      this.dragging = true;
      this.jump(e);
    });
    window.addEventListener('mousemove', (e) => {
      if (this.dragging) this.jump(e);
    });
    window.addEventListener('mouseup', () => {
      this.dragging = false;
    });
  }

  private color(t: number): [number, number, number] {
    let c = this.colors.get(t);
    if (!c) {
      const hex = tileDef(t).color;
      const n = parseInt(hex.slice(1), 16);
      c = [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
      this.colors.set(t, c);
    }
    return c;
  }

  private rebuild(): void {
    const z = this.state.zone;
    const bmp = document.createElement('canvas');
    bmp.width = z.width;
    bmp.height = z.height;
    const ctx = bmp.getContext('2d')!;
    const img = ctx.createImageData(z.width, z.height);
    for (let i = 0; i < z.ground.length; i++) {
      const [r, g, b] = this.color(z.ground[i]!);
      img.data[i * 4] = r;
      img.data[i * 4 + 1] = g;
      img.data[i * 4 + 2] = b;
      img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    this.bitmap = bmp;
  }

  private layout(): { x: number; y: number; w: number; h: number; s: number } {
    const z = this.state.zone;
    const s = Math.min(MM_SIZE / z.width, MM_SIZE / z.height);
    const w = z.width * s;
    const h = z.height * s;
    return { x: (MM_SIZE - w) / 2, y: (MM_SIZE - h) / 2, w, h, s };
  }

  draw(nowMs: number): void {
    if (this.dirty && nowMs - this.lastBuild > 350) {
      this.rebuild();
      this.dirty = false;
      this.lastBuild = nowMs;
    }
    if (!this.bitmap) return;
    const dpr = window.devicePixelRatio || 1;
    if (this.canvas.width !== MM_SIZE * dpr) {
      this.canvas.width = MM_SIZE * dpr;
      this.canvas.height = MM_SIZE * dpr;
    }
    const ctx = this.canvas.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, MM_SIZE, MM_SIZE);
    const box = this.layout();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.bitmap, box.x, box.y, box.w, box.h);
    // The viewport window.
    const z = this.state.zone;
    const vx0 = -this.view.panX / this.view.scale;
    const vy0 = -this.view.panY / this.view.scale;
    const vw = this.viewCanvas.clientWidth / this.view.scale;
    const vh = this.viewCanvas.clientHeight / this.view.scale;
    ctx.strokeStyle = '#d8b36a';
    ctx.lineWidth = 1.25;
    ctx.strokeRect(
      box.x + Math.max(0, vx0) * box.s,
      box.y + Math.max(0, vy0) * box.s,
      Math.min(vw, z.width - Math.max(0, vx0)) * box.s,
      Math.min(vh, z.height - Math.max(0, vy0)) * box.s,
    );
  }

  private jump(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const box = this.layout();
    const tx = (e.clientX - rect.left - box.x) / box.s;
    const ty = (e.clientY - rect.top - box.y) / box.s;
    this.view.centerOn(tx, ty);
    this.onJump();
  }
}
