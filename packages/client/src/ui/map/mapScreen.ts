import type { ClientGame } from '../../game/clientGame.js';
import { dressPanel } from '../panel.js';
import { dockGlyphUrl } from '../../render/icons.js';
import { MapView } from './mapView.js';

/**
 * THE CHART TABLE — the fullscreen map (M). One canvas wearing the
 * expedition case, driven by its own rAF loop only while open (the
 * game renderer never pays for a closed map). Drag pans, wheel zooms,
 * a click plants the one waypoint, a click on the flag lifts it.
 *
 * The pad reads the same chart: left stick pans (UiNav lends the
 * stick), LT/RT zoom, Ⓨ plants or lifts the waypoint under the
 * reticle, Ⓧ centers on you; the rail chips stay d-pad + Ⓐ stops.
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
  private readonly reticle: HTMLElement;
  private readonly setHint: (text: string) => void;
  private hintMode: 'kb' | 'pad' | '' = '';
  private padPrev = new Set<number>();
  private readonly hintDefault = 'Click to plant your waypoint · click the flag to lift it · drag to pan · wheel to zoom';
  private readonly hintPad = 'Stick pans · LT / RT zoom · Ⓨ plants or lifts the waypoint · Ⓧ centers on you';

  constructor(
    private readonly game: ClientGame,
    /** The game renderer's adaptive dpr, threaded down to the view. */
    effectiveDpr?: () => number,
  ) {
    const dress = dressPanel(this.panel, {
      icon: dockGlyphUrl('map', 44),
      hint: this.hintDefault,
      onClose: () => this.close(),
    });
    this.setHint = dress.setHint;

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
    dangerChip.dataset.nav = '';
    dangerChip.dataset.navkey = 'map:danger';
    dangerChip.dataset.acta = 'Toggle';
    dangerChip.addEventListener('click', () => {
      this.view.showDanger = !this.view.showDanger;
      dangerChip.classList.toggle('active', this.view.showDanger);
    });
    const centerChip = document.createElement('button');
    centerChip.className = 'sort-chip';
    centerChip.textContent = 'On me';
    centerChip.title = 'Center the chart on where you stand';
    centerChip.dataset.nav = '';
    centerChip.dataset.navkey = 'map:center';
    centerChip.dataset.acta = 'Center';
    centerChip.addEventListener('click', () => this.centerOnPlayer());
    this.coordsEl = document.createElement('span');
    this.coordsEl.className = 'map-coords';
    rail.append(dangerChip, centerChip, this.coordsEl);
    // The pad's reading spot: a quiet reticle at the chart's center —
    // where Ⓨ plants the flag. CSS shows it in pad mode only.
    this.reticle = document.createElement('div');
    this.reticle.className = 'map-reticle';
    stage.appendChild(this.reticle);
    stage.appendChild(rail);
    this.panel.appendChild(stage);

    this.view = new MapView(this.canvas, game, effectiveDpr);
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

  /**
   * Per-frame pad drive while the chart is open in pad mode. UiNav
   * lends the left stick (claimStick); LT/RT zoom about the center;
   * Ⓨ plants or lifts the waypoint at the reticle; Ⓧ centers on you.
   */
  padUpdate(snap: { buttons: readonly GamepadButton[]; axes: readonly number[] } | null): void {
    if (this.hintMode !== 'pad') {
      this.hintMode = 'pad';
      this.setHint(this.hintPad);
    }
    if (!snap) return;
    const pressed = new Set<number>();
    snap.buttons.forEach((b, i) => {
      if (b.pressed) pressed.add(i);
    });
    const edge = (i: number): boolean => pressed.has(i) && !this.padPrev.has(i);

    // Stick pan — deflection depth sets the reading speed.
    const ax = snap.axes[0] ?? 0;
    const ay = snap.axes[1] ?? 0;
    if (Math.hypot(ax, ay) > 0.25) {
      this.view.panX -= ax * 14;
      this.view.panY -= ay * 14;
    }
    const cx = this.canvas.clientWidth / 2;
    const cy = this.canvas.clientHeight / 2;
    // Park the reticle exactly where Ⓨ will plant: the canvas center.
    this.reticle.style.left = `${this.canvas.offsetLeft + cx}px`;
    this.reticle.style.top = `${this.canvas.offsetTop + cy}px`;
    // Triggers zoom: analog value where available, held-button as 1.
    const lt = snap.buttons[6]?.value ?? (snap.buttons[6]?.pressed ? 1 : 0);
    const rt = snap.buttons[7]?.value ?? (snap.buttons[7]?.pressed ? 1 : 0);
    if (rt > 0.05) this.view.zoomAt(cx, cy, 1 + rt * 0.045);
    if (lt > 0.05) this.view.zoomAt(cx, cy, 1 - lt * 0.043);

    if (edge(3)) {
      // Ⓨ at the reticle: lift a flag standing there, else plant one.
      const hit = this.view.pick(cx, cy);
      if (hit?.kind === 'waypoint') {
        this.game.clearWaypoint();
      } else if (this.view.band() === 'surface') {
        const t = this.view.tileAtFloat(cx, cy);
        this.game.setWaypoint(Math.floor(t.x), Math.floor(t.y));
      }
    }
    if (edge(2)) this.centerOnPlayer(); // Ⓧ — same wire as the chip

    this.padPrev = pressed;
  }

  /** The mouse took the chart back — restore the pointer hint. */
  kbHint(): void {
    if (this.hintMode !== 'kb') {
      this.hintMode = 'kb';
      this.setHint(this.hintDefault);
    }
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
