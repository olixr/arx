import { SIGN_MAX_LINE, SIGN_MAX_LINES, SIGN_MAX_TITLE, type SignInfo } from '@arx/shared';
import type { ClientGame } from '../game/clientGame.js';

/**
 * THE BOARD SPEAKS — reading signs, and writing your own.
 *
 * Two pieces, deliberately unequal in weight:
 *
 * - THE PLAQUE is the whole feature 95% of the time. Walk near a board
 *   and a parchment card fades in over it carrying the words; keep
 *   walking and it fades out behind you. It is a READ, not a screen:
 *   pointer-events none, no focus stolen, no input gated, and it never
 *   survives long enough to become scenery — after DWELL_MS parked at
 *   the same board it bows out on its own, so a sign nailed beside a
 *   door stops covering the door. Stepping away and coming back
 *   re-arms it; that is the ONLY re-arm, because re-showing on every
 *   twitch of movement is exactly the clutter this law exists to stop.
 *
 * - THE SHEET is the deliberate act: press Interact at a board and the
 *   full text opens as a tray you can sit with — and if the board is
 *   yours, the same sheet turns into the pen. Only the hand that
 *   raised a post may write on it; the client hides the affordance and
 *   the server enforces it, in that order of politeness.
 *
 * The words themselves already arrived with the chunk (S2CSigns), so
 * neither piece ever waits on the network to show what a sign says.
 */

/** Fade-in of the approach plaque. Matches the prompt chip's feel. */
const FADE_MS = 180;
/**
 * How long a plaque stays up before bowing out. Long enough to read
 * four short lines twice; short enough that a board you're standing
 * beside stops being furniture in front of your door.
 */
const DWELL_MS = 5200;

export class SignHud {
  private readonly plaque = document.createElement('div');
  private readonly panel = document.getElementById('sign-panel')!;
  private readonly body = document.getElementById('sign-body')!;

  /** Which board the plaque is currently showing (key), if any. */
  private shownKey = '';
  /** When the current plaque first appeared — the dwell clock's zero. */
  private shownAt = 0;
  /** True once the dwell elapsed: stays retired until the player leaves. */
  private retired = false;

  /** The board the sheet is open on. */
  private openAt: { tx: number; ty: number } | null = null;
  private editing = false;

  constructor(private readonly game: ClientGame) {
    this.plaque.id = 'sign-plaque';
    this.plaque.className = 'hidden';
    document.body.appendChild(this.plaque);
  }

  get isOpen(): boolean {
    return !this.panel.classList.contains('hidden');
  }

  /**
   * Per-frame: show the plaque over `sign` at screen point (sx, sy), or
   * pass null when no board is near. The caller owns proximity — this
   * owns the fade, the dwell, and the re-arm.
   */
  update(sign: SignInfo | null, sx = 0, sy = 0): void {
    if (!sign) {
      // Left the board's company: forget everything, so walking back
      // reads as a fresh approach.
      if (this.shownKey !== '') {
        this.shownKey = '';
        this.retired = false;
        this.plaque.classList.add('hidden');
      }
      return;
    }
    // The sheet is the fuller read of the same words — no double show.
    if (this.isOpen && this.openAt?.tx === sign.tx && this.openAt?.ty === sign.ty) {
      this.plaque.classList.add('hidden');
      return;
    }
    const key = `${sign.tx},${sign.ty}:${sign.title}:${sign.lines.join('|')}`;
    if (key !== this.shownKey) {
      // A different board — or the same one, rewritten under our eyes.
      this.shownKey = key;
      this.shownAt = performance.now();
      this.retired = false;
      this.paintPlaque(sign);
      this.plaque.classList.remove('hidden');
    }
    const age = performance.now() - this.shownAt;
    if (!this.retired && age > DWELL_MS) {
      this.retired = true;
      this.plaque.classList.add('bowed');
    }
    this.plaque.style.opacity = this.retired ? '' : String(Math.min(1, age / FADE_MS));
    // Anchored bottom-center over the board, but never off the edge:
    // zoomed in, a board near the top of the view would push its own
    // plaque past the ceiling and read as "signs stopped working".
    // A clamped card drops its tail — it no longer points at anything.
    const w = this.plaque.offsetWidth;
    const h = this.plaque.offsetHeight;
    const x = Math.max(w / 2 + 8, Math.min(window.innerWidth - w / 2 - 8, sx));
    const yWanted = sy;
    const y = Math.max(h + 10, Math.min(window.innerHeight - 10, yWanted));
    this.plaque.classList.toggle('clamped', Math.abs(y - yWanted) > 1 || Math.abs(x - sx) > 1);
    this.plaque.style.transform = `translate(calc(${Math.round(x)}px - 50%), calc(${Math.round(y)}px - 100%))`;
  }

  private paintPlaque(sign: SignInfo): void {
    this.plaque.innerHTML = '';
    this.plaque.classList.remove('bowed');
    if (sign.title !== '') {
      const title = document.createElement('div');
      title.className = 'sign-title';
      title.textContent = sign.title;
      this.plaque.appendChild(title);
    }
    for (const line of sign.lines) {
      if (line === '') continue;
      const row = document.createElement('div');
      row.className = 'sign-line';
      row.textContent = line;
      this.plaque.appendChild(row);
    }
    if (sign.title === '' && sign.lines.every((l) => l === '')) {
      const row = document.createElement('div');
      row.className = 'sign-line sign-blank';
      row.textContent = sign.mine ? 'Blank — yours to write' : 'Blank';
      this.plaque.appendChild(row);
    }
    if (sign.by) {
      const by = document.createElement('div');
      by.className = 'sign-by';
      by.textContent = `raised by ${sign.by}`;
      this.plaque.appendChild(by);
    }
    // The tail that points down at the board it belongs to.
    const tail = document.createElement('div');
    tail.className = 'sign-tail';
    this.plaque.appendChild(tail);
  }

  // ------------------------------------------------------- the sheet

  /** Open the full read (and, on your own board, the pen). */
  open(tx: number, ty: number): void {
    this.openAt = { tx, ty };
    const sign = this.game.signAt(tx, ty);
    // A blank board of your own opens straight into writing: there is
    // nothing to read, and the only reason to press F is to write.
    this.editing = sign?.mine === true && (sign.title === '' && sign.lines.length === 0);
    this.render();
    this.panel.classList.remove('hidden');
    this.plaque.classList.add('hidden');
    if (this.editing) this.focusFirstField();
  }

  close(): void {
    this.panel.classList.add('hidden');
    this.openAt = null;
    this.editing = false;
    // Don't let the plaque pop back over the board we just closed.
    this.shownKey = '';
    this.retired = false;
  }

  private focusFirstField(): void {
    // Deferred by a task on purpose: this often runs INSIDE the F
    // keydown that opened the sheet, and focusing synchronously would
    // let that key's own keypress land in the field — the board would
    // open pre-filled with an 'f' nobody typed.
    setTimeout(() => {
      (this.body.querySelector('input') as HTMLInputElement | null)?.focus();
    }, 0);
  }

  private render(): void {
    const at = this.openAt;
    if (!at) return;
    const sign = this.game.signAt(at.tx, at.ty);
    this.body.innerHTML = '';
    if (this.editing) this.renderEditor(sign);
    else this.renderRead(sign);
  }

  private renderRead(sign: SignInfo | undefined): void {
    const sheet = document.createElement('div');
    sheet.className = 'sign-sheet';
    const title = document.createElement('div');
    title.className = 'sign-sheet-title';
    title.textContent = sign?.title || '(no heading)';
    sheet.appendChild(title);
    const lines = (sign?.lines ?? []).filter((l) => l !== '');
    if (lines.length === 0 && !sign?.title) {
      const empty = document.createElement('div');
      empty.className = 'sign-sheet-line sign-blank';
      empty.textContent = 'Nothing is written here.';
      sheet.appendChild(empty);
    }
    for (const line of lines) {
      const row = document.createElement('div');
      row.className = 'sign-sheet-line';
      row.textContent = line;
      sheet.appendChild(row);
    }
    if (sign?.by) {
      const by = document.createElement('div');
      by.className = 'sign-sheet-by';
      by.textContent = `raised by ${sign.by}`;
      sheet.appendChild(by);
    }
    this.body.appendChild(sheet);

    if (sign?.mine) {
      const act = document.createElement('button');
      act.className = 'act-btn sign-act';
      act.textContent = 'Write on it';
      act.dataset.nav = '';
      act.dataset.navkey = 'sign:edit';
      act.dataset.acta = 'Write';
      act.addEventListener('click', () => {
        this.editing = true;
        this.render();
        this.focusFirstField();
      });
      this.body.appendChild(act);
    }
  }

  private renderEditor(sign: SignInfo | undefined): void {
    const form = document.createElement('div');
    form.className = 'sign-form';

    const fields: HTMLInputElement[] = [];
    /** One labelled, counted field — the board's own width is the cap. */
    const field = (label: string, value: string, max: number): HTMLInputElement => {
      const wrap = document.createElement('label');
      wrap.className = 'sign-field';
      const cap = document.createElement('span');
      cap.className = 'sign-field-label';
      cap.textContent = label;
      const input = document.createElement('input');
      input.type = 'text';
      input.value = value;
      input.maxLength = max;
      input.spellcheck = false;
      const count = document.createElement('span');
      count.className = 'sign-count';
      const tick = (): void => {
        count.textContent = `${input.value.length}/${max}`;
      };
      tick();
      input.addEventListener('input', tick);
      wrap.append(cap, input, count);
      form.appendChild(wrap);
      fields.push(input);
      return input;
    };

    const title = field('Heading', sign?.title ?? '', SIGN_MAX_TITLE);
    for (let i = 0; i < SIGN_MAX_LINES; i++) {
      field(`Line ${i + 1}`, sign?.lines[i] ?? '', SIGN_MAX_LINE);
    }

    const save = document.createElement('button');
    save.className = 'act-btn sign-act';
    save.textContent = 'Carve it';
    save.dataset.nav = '';
    save.dataset.navkey = 'sign:save';
    save.dataset.acta = 'Carve';
    save.addEventListener('click', () => {
      const at = this.openAt;
      if (!at) return;
      this.game.editSign(
        at.tx,
        at.ty,
        title.value,
        fields.slice(1).map((f) => f.value),
      );
      this.editing = false;
      // The server echoes the stored text back; close on the act so
      // the player sees their own board, not a form, when it lands.
      this.close();
    });

    const cancel = document.createElement('button');
    cancel.className = 'act-btn minor sign-act';
    cancel.textContent = 'Leave it';
    cancel.dataset.nav = '';
    cancel.dataset.navkey = 'sign:cancel';
    cancel.addEventListener('click', () => {
      this.editing = false;
      this.render();
    });

    const acts = document.createElement('div');
    acts.className = 'sign-acts';
    acts.append(save, cancel);
    this.body.append(form, acts);

    // Enter carves from any field — a four-line note shouldn't need
    // the mouse.
    for (const f of fields) {
      f.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          save.click();
        }
      });
    }
  }

  /** A sign we're showing was rewritten (by us or anyone) — repaint. */
  onSignChanged(tx: number, ty: number): void {
    if (this.isOpen && this.openAt?.tx === tx && this.openAt?.ty === ty) this.render();
  }

  /** True while a text field owns the keyboard (movement must not eat keys). */
  get isTyping(): boolean {
    return this.isOpen && document.activeElement?.tagName === 'INPUT';
  }
}
