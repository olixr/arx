import {
  BEARD_STYLES,
  CLOTH_COLORS,
  HAIR_COLORS,
  HAIR_STYLES,
  PoseState,
  SKIN_TONES,
  randomLook,
  type Look,
} from '@devcraft/shared';
import { drawHumanoid } from '../render/rig.js';

/**
 * Character creation: the RuneScape mirror. A live preview of the
 * actual in-game rig (same drawHumanoid, poster scale) turns slowly
 * through its facings while the player picks skin, hair, beard, and
 * base cloth dyes from the shared palettes. Confirm sends the look to
 * the server, where it locks — the client never enforces anything.
 *
 * Controls are plain [data-nav] elements, so the gamepad's spatial
 * focus walks them like any other panel; the panel is modal to the
 * navigator while open (see UiNav.navigables).
 */
export class LookCreator {
  private readonly panel: HTMLElement;
  private readonly preview: HTMLCanvasElement;
  private look: Look = randomLook();
  private dirIx = 0;
  private spinTimer: number | null = null;
  open = false;

  private static readonly DIRS = [Math.PI / 2, 0, -Math.PI / 2, Math.PI];

  constructor(private readonly onConfirm: (look: Look) => void) {
    this.panel = document.createElement('div');
    this.panel.id = 'look-panel';
    this.panel.classList.add('hidden');
    this.preview = document.createElement('canvas');
    this.preview.width = 250;
    this.preview.height = 250;
    this.preview.id = 'look-preview';
    document.body.appendChild(this.panel);
    this.build();
  }

  show(): void {
    this.look = randomLook();
    this.open = true;
    this.panel.classList.remove('hidden');
    this.build();
    this.drawPreview();
    this.spinTimer = window.setInterval(() => {
      this.dirIx = (this.dirIx + 1) % LookCreator.DIRS.length;
      this.drawPreview();
    }, 1100);
  }

  hide(): void {
    this.open = false;
    this.panel.classList.add('hidden');
    if (this.spinTimer !== null) {
      clearInterval(this.spinTimer);
      this.spinTimer = null;
    }
  }

  /** Rebuild the whole control column (small DOM, clarity wins). */
  private build(): void {
    this.panel.innerHTML = '';
    const card = document.createElement('div');
    card.id = 'look-card';
    const h = document.createElement('h3');
    h.textContent = 'Create your look';
    card.appendChild(h);
    card.appendChild(this.preview);

    card.appendChild(this.swatchRow('Skin', SKIN_TONES, this.look.skin, (i) => (this.look.skin = i)));
    card.appendChild(
      this.stepperRow('Hair', HAIR_STYLES, this.look.hair, (i) => (this.look.hair = i)),
    );
    card.appendChild(
      this.swatchRow('Hair color', HAIR_COLORS, this.look.hairColor, (i) => (this.look.hairColor = i)),
    );
    card.appendChild(
      this.stepperRow('Face', BEARD_STYLES, this.look.beard, (i) => (this.look.beard = i)),
    );
    card.appendChild(this.swatchRow('Shirt', CLOTH_COLORS, this.look.shirt, (i) => (this.look.shirt = i)));
    card.appendChild(
      this.swatchRow('Trousers', CLOTH_COLORS, this.look.pants, (i) => (this.look.pants = i)),
    );

    const note = document.createElement('p');
    note.className = 'look-note';
    note.textContent = 'Your look is set in stone once you begin — choose well.';
    card.appendChild(note);

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
      this.build();
      this.drawPreview();
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
  }

  private swatchRow(
    label: string,
    palette: readonly string[],
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
      b.style.background = color;
      b.title = `${label} ${i + 1}`;
      b.addEventListener('click', () => {
        set(i);
        this.build();
        this.drawPreview();
      });
      grid.appendChild(b);
    });
    row.appendChild(grid);
    return row;
  }

  private stepperRow(
    label: string,
    names: readonly string[],
    selected: number,
    set: (i: number) => void,
  ): HTMLElement {
    const row = document.createElement('div');
    row.className = 'look-row';
    const l = document.createElement('span');
    l.className = 'look-label';
    l.textContent = label;
    row.appendChild(l);
    const stepper = document.createElement('div');
    stepper.className = 'look-stepper';
    const mk = (glyph: string, delta: number): HTMLButtonElement => {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.nav = '';
      b.dataset.navkey = `look:${label}:${glyph}`;
      b.textContent = glyph;
      b.addEventListener('click', () => {
        set((selected + delta + names.length) % names.length);
        this.build();
        this.drawPreview();
      });
      return b;
    };
    const name = document.createElement('span');
    name.className = 'look-value';
    name.textContent = names[selected]!;
    stepper.appendChild(mk('◀', -1));
    stepper.appendChild(name);
    stepper.appendChild(mk('▶', 1));
    row.appendChild(stepper);
    return row;
  }

  private drawPreview(): void {
    const ctx = this.preview.getContext('2d');
    if (!ctx) return;
    const w = this.preview.width;
    const h = this.preview.height;
    ctx.clearRect(0, 0, w, h);
    // A quiet pedestal so every skin tone reads against it.
    ctx.fillStyle = '#3a3145';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#2c2536';
    ctx.beginPath();
    ctx.ellipse(w / 2, h * 0.86, w * 0.3, h * 0.05, 0, 0, Math.PI * 2);
    ctx.fill();
    const S = 150;
    const x = w / 2;
    const y = h * 0.86;
    const dir = LookCreator.DIRS[this.dirIx]!;
    const hip = 0.1 * S;
    drawHumanoid(ctx, {
      x,
      y,
      scale: S,
      dir,
      pose: PoseState.Idle,
      poseT: 1,
      drawT: 0,
      restT: 1,
      nowMs: performance.now(),
      feet: [
        { x: x - hip, y, lift: 0 },
        { x: x + hip, y, lift: 0 },
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
      bodyColor: CLOTH_COLORS[this.look.shirt]!,
      hurt: false,
      isOwn: true,
      look: { ...this.look },
      gatherPhase: 0,
      craftKind: null,
    });
  }
}
