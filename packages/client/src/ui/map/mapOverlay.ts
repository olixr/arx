import type { ClientGame } from '../../game/clientGame.js';
import { MapView } from './mapView.js';

/**
 * THE TRAVELER'S GLASS — the Diablo-style overlay chart (Tab).
 *
 * A translucent canvas over the whole play view, player-centered at a
 * fixed cartographic scale, pointer-events none: the world stays fully
 * playable underneath. No parchment here — unexplored ground is simply
 * absent, so only the charted world ghosts over the scene. Repaints at
 * half the frame rate (the chart doesn't fight the renderer's budget)
 * and hides itself whenever a real screen is open.
 */
const OVERLAY_SCALE = 2.6;
const REPAINT_MS = 33;

export class MapOverlay {
  visible = false;
  private readonly canvas: HTMLCanvasElement;
  private readonly view: MapView;
  private lastPaint = 0;

  constructor(private readonly game: ClientGame) {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'map-overlay';
    this.canvas.classList.add('hidden');
    document.getElementById('hud')!.appendChild(this.canvas);
    this.view = new MapView(this.canvas, game);
    this.view.parchment = false;
    this.view.overlay = true;
  }

  toggle(): void {
    this.visible = !this.visible;
  }

  hide(): void {
    this.visible = false;
  }

  /** THE CROSSING: forward the plane switch to the owned view. */
  onPlaneSwitch(): void {
    this.view.onPlaneSwitch();
  }

  /** Per-frame from the main loop; suppressed while any screen is up. */
  update(now: number, suppressed: boolean): void {
    const show = this.visible && !suppressed && this.game.ownEid !== null;
    this.canvas.classList.toggle('hidden', !show);
    if (!show) return;
    if (now - this.lastPaint < REPAINT_MS) return;
    this.lastPaint = now;
    const pos = this.game.predictor.pos;
    this.view.centerOn(pos.x, pos.y, OVERLAY_SCALE);
    this.view.render(now);
  }
}
