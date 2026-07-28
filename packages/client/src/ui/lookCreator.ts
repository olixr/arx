import {
  BEARD_STYLES,
  CLOTH_COLORS,
  EAR_STYLES,
  EYE_STYLES,
  FACE_FEATURES,
  HAIR_COLORS,
  HAIR_COLOR_NAMES,
  HAIR_STYLES,
  HERITAGES,
  PoseState,
  SKIN_TONES,
  SKIN_TONE_NAMES,
  applyHeritage,
  randomLook,
  type Look,
} from '@arx/shared';
import { drawHumanoid } from '../render/rig.js';

/**
 * Character creation: the hero's mirror. A live turntable of the
 * actual in-game rig (same drawHumanoid, poster scale) spins slowly
 * while the player shapes their identity through tabbed categories —
 * heritage presets, skin and ears and features, hairdos, faces, and
 * starting cloth. Every option is shown as a rendered BUST of the
 * real head art, never a text stepper: what you click is what walks
 * out of the mirror. Confirm sends the look to the server, where it
 * locks — the client never enforces anything.
 *
 * Controls are plain [data-nav] elements, so the gamepad's spatial
 * focus walks them like any other panel; the panel is modal to the
 * navigator while open (see UiNav.navigables).
 */

type Tab = 'heritage' | 'head' | 'hair' | 'face' | 'attire';

const TABS: readonly { key: Tab; label: string }[] = [
  { key: 'heritage', label: 'Heritage' },
  { key: 'head', label: 'Head' },
  { key: 'hair', label: 'Hair' },
  { key: 'face', label: 'Face' },
  { key: 'attire', label: 'Attire' },
];

/** The eight compass facings of the turntable studs. */
const DIR_STUDS: readonly { glyph: string; dir: number }[] = [
  { glyph: '↓', dir: Math.PI / 2 },
  { glyph: '↘', dir: Math.PI / 4 },
  { glyph: '→', dir: 0 },
  { glyph: '↗', dir: -Math.PI / 4 },
  { glyph: '↑', dir: -Math.PI / 2 },
  { glyph: '↖', dir: (-3 * Math.PI) / 4 },
  { glyph: '←', dir: Math.PI },
  { glyph: '↙', dir: (3 * Math.PI) / 4 },
];

/**
 * Style thumbs whose identity lives on the back of the head face away;
 * the surviving styles all read best from the front. (Kept as a table:
 * new ring styles will want back-of-head thumbs again.)
 */
const HAIR_THUMB_DIR: Partial<Record<number, number>> = {};

export class LookCreator {
  private readonly panel: HTMLElement;
  private preview!: HTMLCanvasElement;
  private crest!: HTMLCanvasElement;
  private tabPanel!: HTMLElement;
  private look: Look = randomLook();
  private tab: Tab = 'heritage';
  private dir = Math.PI / 2;
  private auto = true;
  private bust = false;
  private summary!: HTMLElement;
  private raf: number | null = null;
  open = false;

  constructor(private readonly onConfirm: (look: Look) => void) {
    this.panel = document.createElement('div');
    this.panel.id = 'look-panel';
    this.panel.classList.add('hidden');
    document.body.appendChild(this.panel);
    this.build();
  }

  show(): void {
    this.look = randomLook();
    this.tab = 'heritage';
    this.dir = Math.PI / 2;
    this.auto = true;
    this.open = true;
    this.panel.classList.remove('hidden');
    this.build();
    let last = performance.now();
    const tick = (now: number): void => {
      if (!this.open) return;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      // The turntable: a slow, steady quarter-turn every ~2.4s. Any
      // manual facing choice pauses it (the ⟳ stud resumes).
      if (this.auto) this.dir += dt * 0.65;
      this.drawPreview();
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  hide(): void {
    this.open = false;
    this.panel.classList.add('hidden');
    if (this.raf !== null) {
      cancelAnimationFrame(this.raf);
      this.raf = null;
    }
  }

  // ---- structure ------------------------------------------------------

  /** Build the full card once per show(); look changes only touch the
   *  tab body and selection classes via rebuildTab(). */
  private build(): void {
    this.panel.innerHTML = '';
    const card = document.createElement('div');
    card.id = 'look-card';

    // The banner: the mirror names itself, and the crest medallion
    // wears YOUR face — it updates live as the look changes.
    const head = document.createElement('div');
    head.className = 'look-head';
    this.crest = document.createElement('canvas');
    this.crest.className = 'look-crest';
    this.sizeCanvas(this.crest, 74, 74);
    head.appendChild(this.crest);
    const h = document.createElement('h3');
    h.textContent = 'The Hero’s Mirror';
    head.appendChild(h);
    const sub = document.createElement('span');
    sub.className = 'look-sub';
    sub.textContent = 'Shape the face the world will know';
    head.appendChild(sub);
    card.appendChild(head);

    const body = document.createElement('div');
    body.id = 'look-body';

    // Left column: the turntable stage.
    const stage = document.createElement('div');
    stage.id = 'look-stage';
    this.preview = document.createElement('canvas');
    this.preview.id = 'look-preview';
    this.sizeCanvas(this.preview, 300, 386);
    this.bindDrag(this.preview);
    stage.appendChild(this.preview);

    const turn = document.createElement('div');
    turn.id = 'look-turn';
    for (const stud of DIR_STUDS) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'turn-stud';
      b.dataset.nav = '';
      b.dataset.navkey = `look:turn:${stud.glyph}`;
      b.textContent = stud.glyph;
      b.title = 'Face this way';
      b.addEventListener('click', () => {
        this.auto = false;
        this.dir = stud.dir;
        this.refreshTurn();
      });
      turn.appendChild(b);
    }
    const spin = document.createElement('button');
    spin.type = 'button';
    spin.className = 'turn-stud turn-spin';
    spin.dataset.nav = '';
    spin.dataset.navkey = 'look:turn:spin';
    spin.textContent = '⟳';
    spin.title = 'Turntable';
    spin.addEventListener('click', () => {
      this.auto = !this.auto;
      this.refreshTurn();
    });
    turn.appendChild(spin);
    const zoom = document.createElement('button');
    zoom.type = 'button';
    zoom.className = 'turn-stud turn-zoom';
    zoom.dataset.nav = '';
    zoom.dataset.navkey = 'look:turn:zoom';
    zoom.textContent = '🔍';
    zoom.title = 'Lean into the mirror';
    zoom.addEventListener('click', () => {
      this.bust = !this.bust;
      zoom.classList.toggle('active', this.bust);
    });
    turn.appendChild(zoom);
    stage.appendChild(turn);

    // The mirror reads your choices back: one living line of identity.
    this.summary = document.createElement('p');
    this.summary.className = 'look-summary';
    stage.appendChild(this.summary);

    const note = document.createElement('p');
    note.className = 'look-note';
    note.textContent = 'Your look is set in stone once you begin — choose well.';
    stage.appendChild(note);
    body.appendChild(stage);

    // Right column: category tabs over the option shelf.
    const controls = document.createElement('div');
    controls.id = 'look-controls';
    const tabs = document.createElement('div');
    tabs.id = 'look-tabs';
    for (const t of TABS) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'look-tab' + (t.key === this.tab ? ' active' : '');
      b.dataset.nav = '';
      b.dataset.navkey = `look:tab:${t.key}`;
      b.dataset.tab = t.key;
      b.textContent = t.label;
      b.addEventListener('click', () => {
        this.tab = t.key;
        for (const el of tabs.querySelectorAll('.look-tab')) {
          el.classList.toggle('active', (el as HTMLElement).dataset.tab === t.key);
        }
        this.rebuildTab();
      });
      tabs.appendChild(b);
    }
    controls.appendChild(tabs);
    this.tabPanel = document.createElement('div');
    this.tabPanel.id = 'look-tabpanel';
    controls.appendChild(this.tabPanel);
    body.appendChild(controls);
    card.appendChild(body);

    const row = document.createElement('div');
    row.className = 'look-actions';
    const dice = document.createElement('button');
    dice.type = 'button';
    dice.className = 'look-dice';
    dice.dataset.nav = '';
    dice.dataset.navkey = 'look:dice';
    dice.textContent = '🎲 Surprise me';
    dice.addEventListener('click', () => {
      this.look = randomLook();
      this.rebuildTab();
    });
    const go = document.createElement('button');
    go.type = 'button';
    go.id = 'look-confirm';
    go.dataset.nav = '';
    go.dataset.navkey = 'look:confirm';
    go.textContent = 'Begin your story';
    go.addEventListener('click', () => {
      this.hide();
      this.onConfirm({ ...this.look });
    });
    row.appendChild(dice);
    row.appendChild(go);
    card.appendChild(row);
    this.panel.appendChild(card);
    this.rebuildTab();
  }

  /** Drag across the stage spins the hero by hand. */
  private bindDrag(canvas: HTMLCanvasElement): void {
    let dragging = false;
    let lastX = 0;
    canvas.addEventListener('pointerdown', (e) => {
      dragging = true;
      lastX = e.clientX;
      this.auto = false;
      this.refreshTurn();
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      this.dir += (e.clientX - lastX) * 0.02;
      lastX = e.clientX;
    });
    canvas.addEventListener('pointerup', () => (dragging = false));
    canvas.addEventListener('pointercancel', () => (dragging = false));
  }

  private refreshTurn(): void {
    const spin = this.panel.querySelector('.turn-spin');
    spin?.classList.toggle('active', this.auto);
  }

  // ---- the option shelf ----------------------------------------------

  /** One living line reading the current identity back to the player. */
  private updateSummary(): void {
    const l = this.look;
    const parts: string[] = [SKIN_TONE_NAMES[l.skin]!];
    parts.push(
      l.hair === 1
        ? 'bald'
        : `${HAIR_COLOR_NAMES[l.hairColor]!.toLowerCase()} ${HAIR_STYLES[l.hair]!.toLowerCase()}`,
    );
    parts.push(`${EYE_STYLES[l.eyes]!.toLowerCase()} eyes`);
    if (l.ears > 0) parts.push(`${EAR_STYLES[l.ears]!.toLowerCase()} ears`);
    if (l.beard > 0) parts.push(BEARD_STYLES[l.beard]!.toLowerCase());
    if (l.feature > 0) parts.push(FACE_FEATURES[l.feature]!.toLowerCase());
    this.summary.textContent = parts.join(' · ');
  }

  private rebuildTab(): void {
    this.updateSummary();
    const scroll = this.tabPanel.scrollTop;
    this.tabPanel.innerHTML = '';
    switch (this.tab) {
      case 'heritage':
        this.buildHeritage();
        break;
      case 'head':
        this.tabPanel.appendChild(
          this.swatchRow('Skin', SKIN_TONES, SKIN_TONE_NAMES, this.look.skin, (i) => {
            this.look.skin = i;
          }),
        );
        this.tabPanel.appendChild(
          this.tileRow('Ears', EAR_STYLES, this.look.ears, (i) => (this.look.ears = i), {
            scale: 118,
            mutate: (l, i) => ({ ...l, ears: i }),
          }),
        );
        this.tabPanel.appendChild(
          this.tileRow(
            'Feature',
            FACE_FEATURES,
            this.look.feature,
            (i) => (this.look.feature = i),
            { scale: 118, mutate: (l, i) => ({ ...l, feature: i }) },
          ),
        );
        break;
      case 'hair':
        this.tabPanel.appendChild(
          this.tileRow('Style', HAIR_STYLES, this.look.hair, (i) => (this.look.hair = i), {
            scale: 104,
            mutate: (l, i) => ({ ...l, hair: i }),
            dirFor: (i) => HAIR_THUMB_DIR[i] ?? Math.PI / 2,
          }),
        );
        this.tabPanel.appendChild(
          this.swatchRow(
            'Color',
            HAIR_COLORS,
            HAIR_COLOR_NAMES,
            this.look.hairColor,
            (i) => {
              this.look.hairColor = i;
            },
          ),
        );
        break;
      case 'face':
        this.tabPanel.appendChild(
          this.tileRow('Eyes', EYE_STYLES, this.look.eyes, (i) => (this.look.eyes = i), {
            scale: 150,
            mutate: (l, i) => ({ ...l, eyes: i }),
          }),
        );
        this.tabPanel.appendChild(
          this.tileRow('Beard', BEARD_STYLES, this.look.beard, (i) => (this.look.beard = i), {
            scale: 122,
            mutate: (l, i) => ({ ...l, beard: i }),
          }),
        );
        break;
      case 'attire':
        this.tabPanel.appendChild(
          this.swatchRow('Tunic', CLOTH_COLORS, null, this.look.shirt, (i) => {
            this.look.shirt = i;
          }),
        );
        this.tabPanel.appendChild(
          this.swatchRow('Trousers', CLOTH_COLORS, null, this.look.pants, (i) => {
            this.look.pants = i;
          }),
        );
        break;
    }
    this.tabPanel.scrollTop = scroll;
  }

  /** Heritage: parchment cards, each wearing a live bust of the folk. */
  private buildHeritage(): void {
    const intro = document.createElement('p');
    intro.className = 'look-blurb';
    intro.textContent =
      'A starting point, not a cage — every trait stays yours to reshape.';
    this.tabPanel.appendChild(intro);
    const grid = document.createElement('div');
    grid.className = 'heritage-grid';
    HERITAGES.forEach((her, ix) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'heritage-card';
      b.dataset.nav = '';
      b.dataset.navkey = `look:her:${her.name}`;
      const bust = document.createElement('canvas');
      this.sizeCanvas(bust, 84, 84);
      const sample = applyHeritage(her, this.look, () => 0.001 + ix * 0.13);
      this.drawBust(bust, sample, Math.PI / 2, 118);
      b.appendChild(bust);
      const name = document.createElement('span');
      name.className = 'heritage-name';
      name.textContent = her.name;
      b.appendChild(name);
      const blurb = document.createElement('span');
      blurb.className = 'heritage-blurb';
      blurb.textContent = her.blurb;
      b.appendChild(blurb);
      b.addEventListener('click', () => {
        this.look = applyHeritage(her, this.look);
        this.rebuildTab();
      });
      grid.appendChild(b);
    });
    this.tabPanel.appendChild(grid);
  }

  /** A labeled grid of rendered-bust option tiles. */
  private tileRow(
    label: string,
    names: readonly string[],
    selected: number,
    set: (i: number) => void,
    opts: {
      scale: number;
      mutate: (l: Look, i: number) => Look;
      dirFor?: (i: number) => number;
    },
  ): HTMLElement {
    const row = document.createElement('div');
    row.className = 'look-row';
    const l = document.createElement('span');
    l.className = 'look-label';
    l.textContent = label;
    row.appendChild(l);
    const grid = document.createElement('div');
    grid.className = 'look-tiles';
    names.forEach((name, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'look-tile' + (i === selected ? ' selected' : '');
      b.dataset.nav = '';
      b.dataset.navkey = `look:${label}:${i}`;
      b.title = name;
      const c = document.createElement('canvas');
      this.sizeCanvas(c, 66, 66);
      this.drawBust(
        c,
        opts.mutate({ ...this.look }, i),
        opts.dirFor ? opts.dirFor(i) : Math.PI / 2,
        opts.scale,
      );
      b.appendChild(c);
      const cap = document.createElement('span');
      cap.className = 'tile-name';
      cap.textContent = name;
      b.appendChild(cap);
      b.addEventListener('click', () => {
        set(i);
        this.rebuildTab();
      });
      grid.appendChild(b);
    });
    row.appendChild(grid);
    return row;
  }

  private swatchRow(
    label: string,
    palette: readonly string[],
    names: readonly string[] | null,
    selected: number,
    set: (i: number) => void,
  ): HTMLElement {
    const row = document.createElement('div');
    row.className = 'look-row';
    const l = document.createElement('span');
    l.className = 'look-label';
    l.textContent = label;
    row.appendChild(l);
    const grid = document.createElement('div');
    grid.className = 'look-swatches';
    palette.forEach((color, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'look-swatch' + (i === selected ? ' selected' : '');
      b.dataset.nav = '';
      b.dataset.navkey = `look:${label}:${i}`;
      b.title = names ? names[i]! : `${label} ${i + 1}`;
      const chip = document.createElement('i');
      chip.style.background = color;
      b.appendChild(chip);
      b.addEventListener('click', () => {
        set(i);
        this.rebuildTab();
      });
      grid.appendChild(b);
    });
    row.appendChild(grid);
    return row;
  }

  // ---- rendering ------------------------------------------------------

  /** Retina-backed canvas: crisp vector art at any zoom. */
  private sizeCanvas(c: HTMLCanvasElement, w: number, h: number): void {
    c.width = w * 2;
    c.height = h * 2;
    c.style.width = `${w}px`;
    c.style.height = `${h}px`;
  }

  /** One rig pose, shared by the stage, busts, and the crest. */
  private paintFigure(
    ctx: CanvasRenderingContext2D,
    look: Look,
    x: number,
    yFeet: number,
    S: number,
    dir: number,
  ): void {
    const hip = 0.1 * S;
    drawHumanoid(ctx, {
      x,
      y: yFeet,
      scale: S,
      dir,
      pose: PoseState.Idle,
      poseT: 1,
      drawT: 0,
      restT: 1,
      nowMs: performance.now(),
      feet: [
        { x: x - hip, y: yFeet, lift: 0 },
        { x: x + hip, y: yFeet, lift: 0 },
      ],
      bob: 0,
      rise: 0.414,
      wScale: Math.abs(Math.cos(dir)) > 0.7 ? 0.91 : 1.05,
      poleX: 0,
      poleY: 0,
      poleStrength: 0,
      runF: 0,
      align: 1,
      kneeMemory: [0, 0],
      bodyColor: CLOTH_COLORS[look.shirt]!,
      hurt: false,
      isOwn: true,
      look: { ...look },
      gatherPhase: 0,
      craftKind: null,
    });
  }

  /** A head-and-shoulders portrait: the head centered high, cropped
   *  tight — the true art, not an icon of it. */
  private drawBust(c: HTMLCanvasElement, look: Look, dir: number, S: number): void {
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(2, 0, 0, 2, 0, 0);
    const w = c.width / 2;
    const h = c.height / 2;
    ctx.clearRect(0, 0, w, h);
    // The head rides ~0.98·S above the feet (rise + torso + skull).
    const headCY = h * 0.44;
    this.paintFigure(ctx, look, w / 2, headCY + 0.98 * S, S, dir);
  }

  private drawPreview(): void {
    const ctx = this.preview.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(2, 0, 0, 2, 0, 0);
    const w = this.preview.width / 2;
    const h = this.preview.height / 2;
    ctx.clearRect(0, 0, w, h);
    if (this.bust) {
      // Leaned in: the mirror fills with the face — every ear point,
      // strand notch, and tusk glint at inspection scale.
      const S = 470;
      this.paintFigure(ctx, this.look, w / 2, h * 0.42 + 0.98 * S, S, this.dir);
    } else {
      // The socle: a stone turntable disc the hero stands on.
      const yFeet = h * 0.88;
      ctx.fillStyle = 'rgba(10, 6, 16, 0.5)';
      ctx.beginPath();
      ctx.ellipse(w / 2, yFeet + 12, w * 0.36, h * 0.05, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#453b56';
      ctx.beginPath();
      ctx.ellipse(w / 2, yFeet + 7, w * 0.33, h * 0.048, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#544868';
      ctx.beginPath();
      ctx.ellipse(w / 2, yFeet + 3, w * 0.33, h * 0.048, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#615377';
      ctx.beginPath();
      ctx.ellipse(w / 2, yFeet + 2, w * 0.25, h * 0.034, 0, 0, Math.PI * 2);
      ctx.fill();
      const S = 225;
      this.paintFigure(ctx, this.look, w / 2, yFeet, S, this.dir);
    }

    // The crest medallion wears the current face, front-on.
    const cctx = this.crest.getContext('2d');
    if (cctx) {
      cctx.setTransform(2, 0, 0, 2, 0, 0);
      const cw = this.crest.width / 2;
      const ch = this.crest.height / 2;
      cctx.clearRect(0, 0, cw, ch);
      this.paintFigure(cctx, this.look, cw / 2, ch * 0.46 + 0.98 * 92, 92, Math.PI / 2);
    }
  }
}
