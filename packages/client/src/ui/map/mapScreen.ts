import { DANGER_LAWS } from '@arx/content';
import type { ClientGame } from '../../game/clientGame.js';
import { padGlyph, padGlyphInline } from '../../input/bindings.js';
import { dressPanel } from '../panel.js';
import { dockGlyphUrl } from '../../render/icons.js';
import { MapView, TIER_WASH } from './mapView.js';

/**
 * THE CHART TABLE — the fullscreen map (M). One canvas wearing the
 * expedition case, driven by its own rAF loop only while open (the
 * game renderer never pays for a closed map). Drag pans, wheel zooms,
 * a click plants the one waypoint, a click on the flag lifts it.
 *
 * THE TABLE TAKES THE HAND: while the chart is open the whole hand
 * adapts to reading — WASD and the arrows pan, + and − zoom, the rail
 * carries a Find me stop and a held zoom cluster, and the danger lens
 * unfolds a level-band legend. The pad reads the same chart: left
 * stick pans (UiNav lends the stick), LT/RT zoom, Ⓨ plants or lifts
 * the waypoint under the reticle, Ⓧ centers on you; the rail chips
 * stay d-pad + Ⓐ stops.
 */

/** Reading-hand keys while the chart is open (screen grammar, not
 *  gameplay bindings — gameplay keys are swallowed by any open screen). */
const PAN_KEYS: Record<string, readonly [number, number]> = {
  KeyW: [0, 1],
  ArrowUp: [0, 1],
  KeyS: [0, -1],
  ArrowDown: [0, -1],
  KeyA: [1, 0],
  ArrowLeft: [1, 0],
  KeyD: [-1, 0],
  ArrowRight: [-1, 0],
};
const ZOOM_KEYS: Record<string, number> = {
  Equal: 1,
  NumpadAdd: 1,
  Minus: -1,
  NumpadSubtract: -1,
};

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
  private readonly legend: HTMLElement;
  private readonly setHint: (text: string) => void;
  private hintMode: 'kb' | 'pad' | '' = '';
  private padPrev = new Set<number>();
  private readonly keys = new Set<string>();
  private zoomHold = 0;
  private zoomHeldSince = 0;
  private readonly hintDefault =
    'Click plants your waypoint · click the flag lifts it · drag or WASD pans · wheel or + − zooms';
  /** Built fresh each show — the letters follow the live pad's markings. */
  private get hintPad(): string {
    return `Stick pans · ${padGlyph(6).text} / ${padGlyph(7).text} zoom · ${padGlyphInline(3)} plants or lifts the waypoint · ${padGlyphInline(2)} centers on you`;
  }

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

    // The chart's rail: the reader's verbs left, whereabouts right.
    const rail = document.createElement('div');
    rail.className = 'map-rail';
    const centerChip = document.createElement('button');
    centerChip.className = 'sort-chip map-find';
    centerChip.textContent = 'Find me';
    centerChip.title = 'Center the chart on where you stand';
    centerChip.dataset.nav = '';
    centerChip.dataset.navkey = 'map:center';
    centerChip.dataset.acta = 'Center';
    centerChip.addEventListener('click', () => this.centerOnPlayer());
    const zoomOut = this.zoomChip('−', 'map:zoomout', -1, 'Zoom out');
    const zoomIn = this.zoomChip('+', 'map:zoomin', 1, 'Zoom in');
    this.legend = this.buildLegend();
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
      this.legend.classList.toggle('hidden', !this.view.showDanger);
    });
    this.coordsEl = document.createElement('span');
    this.coordsEl.className = 'map-coords';
    rail.append(centerChip, zoomOut, zoomIn, dangerChip, this.legend, this.coordsEl);
    // The pad's reading spot: a quiet reticle at the chart's center —
    // where Ⓨ plants the flag. CSS shows it in pad mode only.
    this.reticle = document.createElement('div');
    this.reticle.className = 'map-reticle';
    stage.appendChild(this.reticle);
    stage.appendChild(rail);
    this.panel.appendChild(stage);

    this.view = new MapView(this.canvas, game, effectiveDpr);
    this.wireInput();

    // THE READING HAND: chart-local keys. Down-guards keep them off
    // text inputs; keyup always releases so a key never sticks after
    // the chart folds mid-press.
    window.addEventListener('keydown', (e) => {
      if (!this.isOpen || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t.isContentEditable)) return;
      if (!(e.code in PAN_KEYS) && !(e.code in ZOOM_KEYS)) return;
      e.preventDefault();
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
  }

  /** A held zoom stop: tap steps, holding glides. */
  private zoomChip(glyph: string, navkey: string, dir: number, title: string): HTMLButtonElement {
    const b = document.createElement('button');
    b.className = 'sort-chip map-zoom';
    b.textContent = glyph;
    b.title = title;
    b.dataset.nav = '';
    b.dataset.navkey = navkey;
    b.dataset.acta = title;
    let downAt = -1;
    b.addEventListener('pointerdown', () => {
      downAt = performance.now();
      this.zoomHold = dir;
      this.zoomHeldSince = downAt;
    });
    const release = (): void => {
      this.zoomHold = 0;
    };
    b.addEventListener('pointerup', release);
    b.addEventListener('pointerleave', release);
    b.addEventListener('click', () => {
      // A quick tap (or a pad/keyboard press) steps; a long hold
      // already glided in the loop and owes no extra jump.
      if (downAt < 0 || performance.now() - downAt < 260) this.stepZoom(dir);
    });
    return b;
  }

  private stepZoom(dir: number): void {
    const cx = this.canvas.clientWidth / 2;
    const cy = this.canvas.clientHeight / 2;
    this.view.zoomAt(cx, cy, dir > 0 ? 1.45 : 1 / 1.45);
  }

  /**
   * THE DANGER LEGEND — the lens explained in one strip: a swatch per
   * tier wearing the wash's true ink, each naming its creature levels,
   * bookended by the plain words. Hidden until the lens is on.
   */
  private buildLegend(): HTMLElement {
    const el = document.createElement('span');
    el.className = 'map-legend hidden';
    const safe = document.createElement('span');
    safe.textContent = 'Safe';
    el.appendChild(safe);
    const cells = document.createElement('span');
    cells.className = 'map-legend-cells';
    TIER_WASH.forEach((wash, i) => {
      const cell = document.createElement('span');
      cell.className = 'map-legend-cell';
      // The wash is translucent over parchment on the chart; the chip
      // pre-blends the same pair so the legend tells no second color.
      const m = /rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/.exec(wash);
      if (m) {
        const a = parseFloat(m[4]!) * 2.2;
        const mix = (c: number, p: number): number => Math.round(c * a + p * (1 - a));
        cell.style.background = `rgb(${mix(+m[1]!, 205)}, ${mix(+m[2]!, 188)}, ${mix(+m[3]!, 148)})`;
      }
      const law = DANGER_LAWS[Math.min(i, DANGER_LAWS.length - 1)]!;
      cell.title = `Creatures around level ${law.npcLevel[0]} to ${law.npcLevel[1]}`;
      cells.appendChild(cell);
    });
    el.appendChild(cells);
    const deadly = document.createElement('span');
    deadly.textContent = 'Deadly';
    el.appendChild(deadly);
    return el;
  }

  /** Per-frame: apply the held reading keys and the held zoom stops. */
  private drive(now: number): void {
    let dx = 0;
    let dy = 0;
    let zk = 0;
    for (const code of this.keys) {
      const pan = PAN_KEYS[code];
      if (pan) {
        dx += pan[0];
        dy += pan[1];
      }
      zk += ZOOM_KEYS[code] ?? 0;
    }
    if (dx !== 0 || dy !== 0) {
      this.view.panX += dx * 13;
      this.view.panY += dy * 13;
    }
    const cx = this.canvas.clientWidth / 2;
    const cy = this.canvas.clientHeight / 2;
    if (zk !== 0) this.view.zoomAt(cx, cy, zk > 0 ? 1.03 : 1 / 1.03);
    if (this.zoomHold !== 0 && now - this.zoomHeldSince > 260) {
      this.view.zoomAt(cx, cy, this.zoomHold > 0 ? 1.025 : 1 / 1.025);
    }
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
      this.drive(now);
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
    this.keys.clear();
    this.zoomHold = 0;
  }

  private centerOnPlayer(): void {
    const pos = this.game.predictor.pos;
    this.view.centerOn(pos.x, pos.y, Math.max(this.view.scale, 3));
  }

  /**
   * THE ERRAND POINTS AT THE CHART: lay an errand's search ring on
   * the table and frame the view around it (call open() first — the
   * chart must be standing before it can be framed). The ring stays
   * across folds until its errand leaves the ledger or another call
   * re-points it.
   */
  frameSearchRing(ring: NonNullable<MapView['searchRing']>): void {
    this.view.searchRing = ring;
    const cw = this.canvas.clientWidth || 1;
    const ch = this.canvas.clientHeight || 1;
    // Frame the neighborhood with air around it, never wall to wall.
    const scale = Math.min(6, Math.max(0.5, (Math.min(cw, ch) * 0.3) / Math.max(1, ring.r)));
    this.view.centerOn(ring.x, ring.y, scale);
    this.centered = true;
    this.lastBand = this.view.band();
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
