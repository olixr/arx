import type { ClientGame } from '../../game/clientGame.js';
import { dressPanel } from '../panel.js';
import { dockGlyphUrl } from '../../render/icons.js';
import { MapView } from './mapView.js';

/**
 * THE CHART TABLE — the fullscreen map (M). One canvas wearing the
 * expedition case, driven by its own rAF loop only while open (the
 * game renderer never pays for a closed map). Drag pans, wheel zooms,
 * a click plants the one waypoint, a click on the flag lifts it.
 */
export class MapScreen {
  private readonly panel = document.getElementById('map-panel')!;
  private readonly canvas: HTMLCanvasElement;
  readonly view: MapView;
  private raf = 0;
  private dragging = false;
  private dragMoved = 0;
  private lastX = 0;
  private lastY = 0;
  private centered = false;
  private lastBand = 'surface';
  private readonly coordsEl: HTMLElement;
  private readonly hintDefault = 'Click to plant your waypoint · click the flag to lift it · drag to pan · wheel to zoom';

  constructor(private readonly game: ClientGame) {
    dressPanel(this.panel, {
      icon: dockGlyphUrl('map', 44),
      hint: this.hintDefault,
      onClose: () => this.close(),
    });

    const stage = document.createElement('div');
    stage.className = 'map-stage';
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'map-canvas';
    stage.appendChild(this.canvas);

    // The chart's rail: lenses left, whereabouts right.
    const rail = document.createElement('div');
    rail.className = 'map-rail';
    const dangerChip = document.createElement('button');
    dangerChip.className = 'sort-chip';
    dangerChip.textContent = 'Danger';
    dangerChip.title = 'Tint the chart by the danger field';
    dangerChip.addEventListener('click', () => {
      this.view.showDanger = !this.view.showDanger;
      dangerChip.classList.toggle('active', this.view.showDanger);
    });
    const centerChip = document.createElement('button');
    centerChip.className = 'sort-chip';
    centerChip.textContent = 'On me';
    centerChip.title = 'Center the chart on where you stand';
    centerChip.addEventListener('click', () => this.centerOnPlayer());
    this.coordsEl = document.createElement('span');
    this.coordsEl.className = 'map-coords';
    rail.append(dangerChip, centerChip, this.coordsEl);
    stage.appendChild(rail);
    this.panel.appendChild(stage);

    this.view = new MapView(this.canvas, game);
    this.wireInput();
  }

  get isOpen(): boolean {
    return !this.panel.classList.contains('hidden');
  }

  open(): void {
    this.panel.classList.remove('hidden');
    // First open (or a band crossing — dungeon in, dungeon out)
    // frames the reader; later opens keep the chart where they left
    // it — a map remembers its fold.
    if (!this.centered || this.view.band() !== this.lastBand) {
      this.centerOnPlayer();
      this.centered = true;
      this.lastBand = this.view.band();
    }
    const loop = (now: number): void => {
      if (!this.isOpen) return;
      if (this.view.band() !== this.lastBand) {
        this.lastBand = this.view.band();
        this.centerOnPlayer();
      }
      this.view.render(now);
      const pos = this.game.predictor.pos;
      this.coordsEl.textContent = `${Math.round(pos.x)}, ${Math.round(pos.y)}`;
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  close(): void {
    this.panel.classList.add('hidden');
    cancelAnimationFrame(this.raf);
  }

  private centerOnPlayer(): void {
    const pos = this.game.predictor.pos;
    this.view.centerOn(pos.x, pos.y, Math.max(this.view.scale, 3));
  }

  private wireInput(): void {
    this.canvas.addEventListener('pointerdown', (e) => {
      this.dragging = true;
      this.dragMoved = 0;
      this.lastX = e.offsetX;
      this.lastY = e.offsetY;
      this.canvas.setPointerCapture(e.pointerId);
    });
    this.canvas.addEventListener('pointermove', (e) => {
      if (this.dragging) {
        const dx = e.offsetX - this.lastX;
        const dy = e.offsetY - this.lastY;
        this.dragMoved += Math.abs(dx) + Math.abs(dy);
        this.view.panX += dx;
        this.view.panY += dy;
        this.lastX = e.offsetX;
        this.lastY = e.offsetY;
      } else {
        const hit = this.view.pick(e.offsetX, e.offsetY);
        this.view.hover = hit?.kind === 'discovery' ? (hit.d ?? null) : null;
        this.canvas.style.cursor = hit ? 'pointer' : 'crosshair';
      }
    });
    this.canvas.addEventListener('pointerup', (e) => {
      if (!this.dragging) return;
      this.dragging = false;
      this.canvas.releasePointerCapture(e.pointerId);
      // A true click (no drag) speaks: lift the flag, or plant it.
      if (this.dragMoved > 5) return;
      const hit = this.view.pick(e.offsetX, e.offsetY);
      if (hit?.kind === 'waypoint') {
        this.game.clearWaypoint();
        return;
      }
      if (this.view.band() !== 'surface') return;
      const t = this.view.tileAtFloat(e.offsetX, e.offsetY);
      this.game.setWaypoint(Math.floor(t.x), Math.floor(t.y));
    });
    this.canvas.addEventListener('pointerleave', () => {
      this.view.hover = null;
    });
    this.canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        this.view.zoomAt(e.offsetX, e.offsetY, Math.exp(-e.deltaY * 0.0016));
      },
      { passive: false },
    );
  }
}
