import { DANGER_LAWS } from '@arx/content';
import type { QuestWire } from '@arx/shared';
import type { ClientGame } from '../../game/clientGame.js';
import { padGlyph, padGlyphInline } from '../../input/bindings.js';
import { dressPanel } from '../panel.js';
import { dockGlyphUrl } from '../../render/icons.js';
import { inkCss } from './markers.js';
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
  private readonly questPane: HTMLElement;
  private readonly questList: HTMLElement;
  private readonly allChip: HTMLButtonElement;
  /** Errands the reader has waved off the chart — persisted per soul. */
  private readonly hidden = new Set<string>();
  private hiddenLoaded = false;
  private paneVersion = -1;
  private paneFocus: string | null = null;
  private lastDistBeat = 0;
  /** The followed errand (the tracker's own), wired by main. */
  getFollowed: (() => string | null) | null = null;
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
    // THE ERRAND RAIL — the quest pane on the chart's left, the map's
    // own legend of what is being sought and where. Built empty here;
    // dealt from the ledger while the chart is open.
    this.questPane = document.createElement('div');
    this.questPane.className = 'map-quests';
    this.questPane.dataset.region = '';
    const mqHead = document.createElement('div');
    mqHead.className = 'mq-head';
    const mqTitle = document.createElement('span');
    mqTitle.className = 'mq-title';
    mqTitle.textContent = 'Errands';
    this.allChip = document.createElement('button');
    this.allChip.className = 'sort-chip mq-all';
    this.allChip.dataset.nav = '';
    this.allChip.dataset.navkey = 'chartq:all';
    this.allChip.dataset.acta = 'Toggle';
    this.allChip.addEventListener('click', () => {
      if (this.hidden.size > 0) this.hidden.clear();
      else for (const id of this.game.quests.keys()) this.hidden.add(id);
      this.saveHidden();
      this.renderPane(true);
    });
    mqHead.append(mqTitle, this.allChip);
    this.questList = document.createElement('div');
    this.questList.className = 'mq-list';
    this.questPane.append(mqHead, this.questList);
    stage.appendChild(this.questPane);

    const main = document.createElement('div');
    main.className = 'map-main';
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'map-canvas';
    main.appendChild(this.canvas);

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
    main.appendChild(rail);
    stage.appendChild(main);
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
    this.renderPane(true);
    const loop = (now: number): void => {
      if (!this.isOpen) return;
      if (this.view.band() !== this.lastBand) {
        this.lastBand = this.view.band();
        this.centerOnPlayer();
      }
      this.drive(now);
      this.renderPane();
      this.updateDistances();
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

  // ------------------------------------------------- the errand rail

  private get hideKey(): string {
    return 'arx.chartHidden.' + this.game.ownName;
  }

  private saveHidden(): void {
    try {
      localStorage.setItem(this.hideKey, JSON.stringify([...this.hidden]));
    } catch {
      /* a full jar loses nothing but a preference */
    }
  }

  private loadHidden(): void {
    if (this.hiddenLoaded) return;
    this.hiddenLoaded = true;
    try {
      const raw = localStorage.getItem(this.hideKey);
      if (raw) for (const id of JSON.parse(raw) as string[]) this.hidden.add(id);
    } catch {
      /* an unreadable preference is an empty one */
    }
  }

  /** The view draws active-minus-hidden; the pane owns the set. */
  private syncShown(): void {
    this.view.questShown.clear();
    for (const id of this.game.quests.keys()) {
      if (!this.hidden.has(id)) this.view.questShown.add(id);
    }
  }

  /**
   * THE FINGER LANDS: focus one errand — show it, breathe its
   * grounds, and frame the chart around them (or around the one
   * ground passed in, when a journal row pointed at a single ask).
   * Call open() first; the chart must be standing before it can be
   * framed.
   */
  focusQuest(quest: string, ground?: { x: number; y: number; r: number; plane?: string }): void {
    this.loadHidden();
    if (this.hidden.delete(quest)) this.saveHidden();
    this.view.questFocus = quest;
    this.syncShown();
    const q = this.game.quests.get(quest);
    let grounds: Array<{ x: number; y: number; r: number; plane?: string }> = [];
    if (ground) grounds = [ground];
    else if (q) {
      if (q.status === 'ready') {
        if (q.turnInHint) grounds = [q.turnInHint];
      } else {
        for (const o of q.objectives) {
          if (o.have >= o.need) continue;
          grounds.push(...(o.hints ?? (o.hint ? [o.hint] : [])));
        }
      }
    }
    grounds = grounds.filter((g) => (g.plane ?? 'surface') === this.game.plane.id);
    if (grounds.length > 0) this.frameGrounds(grounds);
    this.renderPane(true);
  }

  /** Frame a set of grounds with air around them, never wall to wall. */
  private frameGrounds(gs: Array<{ x: number; y: number; r: number }>): void {
    const cw = this.canvas.clientWidth || 1;
    const ch = this.canvas.clientHeight || 1;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const g of gs) {
      minX = Math.min(minX, g.x - g.r);
      minY = Math.min(minY, g.y - g.r);
      maxX = Math.max(maxX, g.x + g.r);
      maxY = Math.max(maxY, g.y + g.r);
    }
    const span = Math.max(maxX - minX, maxY - minY, 24);
    const scale = Math.min(6, Math.max(0.45, (Math.min(cw, ch) * 0.72) / span));
    this.view.centerOn((minX + maxX) / 2, (minY + maxY) / 2, scale);
    this.centered = true;
    this.lastBand = this.view.band();
  }

  /** One unmet ask's whereabouts for the pane's distance foot. */
  private paneTarget(q: QuestWire): { x: number; y: number; r: number; plane?: string } | null {
    if (q.status === 'ready') return q.turnInHint ?? null;
    for (const o of q.objectives) {
      if (o.have < o.need && o.hint) return o.hint;
    }
    return null;
  }

  /**
   * THE ERRAND RAIL — dealt from the ledger: the followed errand
   * first, then work ready to hand in, then the rest by name. Each
   * row wears its chart ink, tells its asks and their distances, and
   * carries its own Hide/Show chip; the row itself frames the chart.
   * Structure repaints only when the ledger clock turns (or a verb
   * here forces it); the distance feet breathe on their own beat.
   */
  private renderPane(force = false): void {
    if (!force && this.paneVersion === this.game.questVersion && this.paneFocus === this.view.questFocus) return;
    this.loadHidden();
    this.paneVersion = this.game.questVersion;
    // A finished errand takes its focus with it.
    if (this.view.questFocus !== null && !this.game.quests.has(this.view.questFocus)) {
      this.view.questFocus = null;
    }
    this.paneFocus = this.view.questFocus;
    this.syncShown();
    this.questList.replaceChildren();
    this.allChip.textContent = this.hidden.size > 0 ? 'Show all' : 'Hide all';
    this.allChip.title =
      this.hidden.size > 0 ? 'Paint every errand on the chart' : 'Clear the chart of errand grounds';
    const quests = [...this.game.quests.values()];
    if (quests.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'mq-empty';
      empty.textContent = 'No errands underway. The chart keeps its quiet.';
      this.questList.appendChild(empty);
      return;
    }
    const followed = this.getFollowed?.() ?? null;
    quests.sort((a, b) => {
      const fa = a.id === followed ? 0 : 1;
      const fb = b.id === followed ? 0 : 1;
      if (fa !== fb) return fa - fb;
      const ra = a.status === 'ready' ? 0 : 1;
      const rb = b.status === 'ready' ? 0 : 1;
      if (ra !== rb) return ra - rb;
      return a.name < b.name ? -1 : 1;
    });
    for (const q of quests) {
      const hidden = this.hidden.has(q.id);
      const row = document.createElement('div');
      row.className = 'mq-row';
      if (this.view.questFocus === q.id) row.classList.add('sel');
      if (hidden) row.classList.add('off');

      const main = document.createElement('button');
      main.className = 'mq-main';
      main.dataset.nav = '';
      main.dataset.navkey = 'chartq:' + q.id;
      main.dataset.acta = 'Frame';
      main.title = 'Frame this errand on the chart';
      main.addEventListener('click', () => this.focusQuest(q.id));

      const swatch = document.createElement('span');
      swatch.className = 'mq-swatch';
      const ink = this.view.questInk(q.id);
      swatch.style.background = inkCss(ink, hidden ? 0.28 : 0.95);
      swatch.style.borderColor = inkCss(ink, hidden ? 0.4 : 1);

      const body = document.createElement('div');
      body.className = 'mq-body';
      const nameEl = document.createElement('div');
      nameEl.className = 'mq-name';
      nameEl.textContent = q.name;
      if (q.stages > 1) {
        const part = document.createElement('span');
        part.className = 'mq-part';
        part.textContent = `${q.stage + 1} of ${q.stages}`;
        nameEl.appendChild(part);
      }
      body.appendChild(nameEl);

      const dist = (target: { x: number; y: number; r: number; plane?: string } | null): HTMLElement => {
        const el = document.createElement('span');
        el.className = 'mq-dist';
        if (target) {
          el.dataset.tx = String(target.x);
          el.dataset.ty = String(target.y);
          el.dataset.tr = String(target.r);
          el.dataset.tplane = target.plane ?? 'surface';
        }
        return el;
      };
      if (q.status === 'ready') {
        const obj = document.createElement('div');
        obj.className = 'mq-obj mq-return';
        const word = document.createElement('span');
        word.textContent = `Return to ${q.turnInName}`;
        obj.append(word, dist(q.turnInHint ?? null));
        body.appendChild(obj);
      } else {
        for (const o of q.objectives) {
          const obj = document.createElement('div');
          obj.className = 'mq-obj';
          if (o.have >= o.need) obj.classList.add('met');
          const word = document.createElement('span');
          word.textContent = o.need > 1 ? `${o.label} · ${o.have}/${o.need}` : o.label;
          obj.appendChild(word);
          if (o.have < o.need) obj.appendChild(dist(o.hint ?? null));
          body.appendChild(obj);
        }
      }
      main.append(swatch, body);

      const eye = document.createElement('button');
      eye.className = 'mq-eye';
      eye.dataset.nav = '';
      eye.dataset.navkey = 'chartq:eye:' + q.id;
      eye.dataset.acta = hidden ? 'Show' : 'Hide';
      eye.textContent = hidden ? 'Show' : 'Hide';
      eye.title = hidden ? 'Paint this errand back on the chart' : 'Wave this errand off the chart';
      eye.addEventListener('click', () => {
        if (!this.hidden.delete(q.id)) this.hidden.add(q.id);
        this.saveHidden();
        this.renderPane(true);
      });

      row.append(main, eye);
      this.questList.appendChild(row);
    }
    this.updateDistances(true);
  }

  /** The distance feet: "420 paces NE", "hereabouts", "another realm". */
  private updateDistances(force = false): void {
    const now = performance.now();
    if (!force && now - this.lastDistBeat < 500) return;
    this.lastDistBeat = now;
    const pos = this.game.predictor.pos;
    const winds = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];
    for (const el of this.questList.querySelectorAll<HTMLElement>('.mq-dist')) {
      const txt = el.dataset.tx;
      if (txt === undefined) {
        el.textContent = '';
        continue;
      }
      if (el.dataset.tplane !== this.game.plane.id) {
        el.textContent = 'another realm';
        continue;
      }
      const dx = Number(txt) - pos.x;
      const dy = Number(el.dataset.ty) - pos.y;
      const d = Math.hypot(dx, dy);
      if (d <= Number(el.dataset.tr)) {
        el.textContent = 'hereabouts';
      } else {
        const oct = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) & 7;
        el.textContent = `${Math.round(d)} ${winds[oct]}`;
      }
    }
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
        this.view.questHover =
          hit?.kind === 'questground' && hit.quest !== undefined && hit.ground !== undefined
            ? { quest: hit.quest, ground: hit.ground }
            : null;
        // A broad ground never turns the planting hand into a finger.
        this.canvas.style.cursor = hit && hit.kind !== 'questground' ? 'pointer' : 'crosshair';
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
      this.view.questHover = null;
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
