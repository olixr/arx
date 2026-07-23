import type { Sfx } from '../audio/sfx.js';

/**
 * THE DIALOGUE CINEMA — the screen-space half of a conversation (the
 * renderer plays the world half: the camera glides to frame both
 * speakers at a breathing close-up).
 *
 * Anatomy: letterbox bars ease in top and bottom, a masked backdrop
 * blur softens the world's edges while the speakers stay sharp, and
 * a lower-third stage rises — a brass name banner over a parchment
 * speech sheet. NPC beats speak from the parchment in ink; player
 * beats flip the sheet to the iron tray ("You" takes the banner).
 *
 * THE TYPEWRITER LAW: text is never pasted, it arrives — per-glyph
 * reveal at reading pace with punctuation holding a breath, a quill
 * scratch at the edge of hearing. The FIRST advance press completes
 * the line instantly (readers are never held hostage); the next one
 * turns the page. Questions slide their choice plates in only after
 * the line lands, and are answered — never skipped past.
 *
 * The server owns the conversation: this class renders exactly what
 * it was sent and reports back (advance / choose index / excuse me).
 */

interface CinemaNode {
  speaker: 'npc' | 'player';
  text: string;
  choices?: string[];
  last?: boolean;
}

/** Reading pace: base seconds per glyph, with punctuation holds. */
const CHAR_SEC = 1 / 52;
function charHold(ch: string): number {
  if ('.!?…'.includes(ch)) return CHAR_SEC + 0.22;
  if (',;:—'.includes(ch)) return CHAR_SEC + 0.09;
  return CHAR_SEC;
}

export class DialogueCinema {
  open = false;

  private readonly root: HTMLElement;
  private readonly stage: HTMLElement;
  private readonly nameEl: HTMLElement;
  private readonly titleEl: HTMLElement;
  private readonly textEl: HTMLElement;
  private readonly moreEl: HTMLElement;
  private readonly choicesEl: HTMLElement;

  private npcName = '';
  private npcTitle: string | undefined;
  private node: CinemaNode | null = null;

  /** Typewriter state: glyph spans still dark, and the rAF clock. */
  private spans: HTMLElement[] = [];
  private revealed = 0;
  private typing = false;
  private raf = 0;
  private lastT = 0;
  private holdSec = 0;
  private scratchGap = 0;
  private choicesShown = false;
  private selIdx = 0;
  private closeTimer = 0;

  constructor(
    private readonly sfx: Sfx,
    private readonly hooks: {
      onAdvance: () => void;
      onChoose: (idx: number) => void;
      onEnd: () => void;
    },
  ) {
    this.root = document.createElement('div');
    this.root.id = 'dlg-cinema';
    this.root.classList.add('hidden');

    const barTop = document.createElement('div');
    barTop.className = 'dlg-bar top';
    const barBot = document.createElement('div');
    barBot.className = 'dlg-bar bot';
    const depth = document.createElement('div');
    depth.className = 'dlg-depth';
    this.root.append(barTop, barBot, depth);

    this.stage = document.createElement('div');
    this.stage.className = 'dlg-stage';

    const name = document.createElement('div');
    name.className = 'dlg-name';
    this.nameEl = document.createElement('span');
    this.nameEl.className = 'dlg-name-text';
    this.titleEl = document.createElement('span');
    this.titleEl.className = 'dlg-name-title';
    name.append(this.nameEl, this.titleEl);

    const sheet = document.createElement('div');
    sheet.className = 'dlg-sheet';
    this.textEl = document.createElement('div');
    this.textEl.className = 'dlg-text';
    this.moreEl = document.createElement('div');
    this.moreEl.className = 'dlg-more';
    this.moreEl.textContent = '▼';
    sheet.append(this.textEl, this.moreEl);

    this.choicesEl = document.createElement('div');
    this.choicesEl.className = 'dlg-choices';

    this.stage.append(name, sheet, this.choicesEl);
    this.root.appendChild(this.stage);
    document.body.appendChild(this.root);

    // A click anywhere in the frame turns the page (choice plates
    // catch their own clicks first and stop the bubble).
    this.root.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.advance();
    });
  }

  /** Raise the frame. Beats arrive separately via showNode. */
  show(o: { name: string; title?: string }): void {
    if (this.closeTimer) {
      clearTimeout(this.closeTimer);
      this.closeTimer = 0;
    }
    this.open = true;
    this.npcName = o.name;
    this.npcTitle = o.title;
    this.node = null;
    this.textEl.textContent = '';
    this.choicesEl.textContent = '';
    this.moreEl.classList.remove('show');
    this.root.classList.remove('hidden', 'closing');
    // Reflow so the bars/stage transition from their resting spots.
    void this.root.offsetHeight;
    this.root.classList.add('open');
    this.sfx.dialogueOpen();
  }

  /** Lower the frame (server said the conversation is over). */
  close(): void {
    if (!this.open) return;
    this.open = false;
    this.stopReveal();
    this.node = null;
    this.root.classList.remove('open');
    this.root.classList.add('closing');
    this.sfx.dialogueClose();
    this.closeTimer = window.setTimeout(() => {
      this.root.classList.add('hidden');
      this.root.classList.remove('closing');
      this.closeTimer = 0;
    }, 340);
  }

  /** One beat of conversation: banner, sheet, typewriter, question. */
  showNode(node: CinemaNode): void {
    if (!this.open) return;
    this.node = node;
    this.stopReveal();
    this.choicesShown = false;
    this.selIdx = 0;
    this.choicesEl.textContent = '';
    this.moreEl.classList.remove('show');

    const player = node.speaker === 'player';
    this.stage.classList.toggle('player', player);
    this.nameEl.textContent = player ? 'You' : this.npcName;
    this.titleEl.textContent = !player && this.npcTitle ? this.npcTitle : '';

    // Per-glyph spans inside per-word wrappers: words wrap as units,
    // so the reveal never reflows a line mid-sentence.
    this.textEl.textContent = '';
    this.spans = [];
    for (const [i, word] of node.text.split(' ').entries()) {
      if (i > 0) this.textEl.appendChild(document.createTextNode(' '));
      const w = document.createElement('span');
      w.className = 'dlg-word';
      for (const ch of word) {
        const s = document.createElement('span');
        s.className = 'dlg-ch';
        s.textContent = ch;
        w.appendChild(s);
        this.spans.push(s);
      }
      this.textEl.appendChild(w);
    }

    this.revealed = 0;
    this.typing = true;
    this.holdSec = 0.12; // a beat before the first glyph
    this.scratchGap = 0;
    this.lastT = performance.now();
    this.raf = requestAnimationFrame(this.tick);
  }

  private readonly tick = (t: number): void => {
    if (!this.typing) return;
    let dt = Math.min(0.1, (t - this.lastT) / 1000);
    this.lastT = t;
    while (dt > 0 && this.revealed < this.spans.length) {
      if (this.holdSec > dt) {
        this.holdSec -= dt;
        break;
      }
      dt -= this.holdSec;
      const span = this.spans[this.revealed++]!;
      span.classList.add('lit');
      const ch = span.textContent ?? '';
      this.holdSec = charHold(ch);
      if (++this.scratchGap >= 3) {
        this.scratchGap = 0;
        this.sfx.dialogueScratch();
      }
    }
    if (this.revealed >= this.spans.length) this.finishReveal();
    else this.raf = requestAnimationFrame(this.tick);
  };

  private stopReveal(): void {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.typing = false;
  }

  /** The line has fully landed: invite the answer or the page-turn. */
  private finishReveal(): void {
    this.stopReveal();
    for (const s of this.spans) s.classList.add('lit');
    const node = this.node;
    if (!node) return;
    if (node.choices && node.choices.length > 0) {
      this.buildChoices(node.choices);
    } else {
      this.moreEl.classList.add('show');
    }
  }

  private buildChoices(choices: string[]): void {
    this.choicesShown = true;
    this.choicesEl.textContent = '';
    choices.forEach((text, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'dlg-choice';
      btn.style.animationDelay = `${i * 80}ms`;
      const num = document.createElement('span');
      num.className = 'dlg-choice-num';
      num.textContent = String(i + 1);
      const label = document.createElement('span');
      label.textContent = text;
      btn.append(num, label);
      btn.addEventListener('mouseenter', () => this.select(i));
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.choose(i);
      });
      this.choicesEl.appendChild(btn);
      window.setTimeout(() => this.sfx.dialogueChoiceIn(), i * 80);
    });
    this.select(0);
  }

  private select(i: number): void {
    if (!this.choicesShown) return;
    this.selIdx = i;
    const plates = this.choicesEl.children;
    for (let j = 0; j < plates.length; j++) plates[j]!.classList.toggle('sel', j === i);
  }

  private choose(i: number): void {
    if (!this.choicesShown) return;
    this.choicesShown = false;
    this.sfx.uiTap();
    this.hooks.onChoose(i);
  }

  /**
   * The one verb the player needs: finish the line if it's still
   * arriving, otherwise turn the page (questions wait for an answer).
   */
  advance(): void {
    if (!this.open || !this.node) return;
    if (this.typing) {
      this.finishReveal();
      return;
    }
    if (this.choicesShown) {
      this.choose(this.selIdx);
      return;
    }
    this.sfx.uiTick();
    this.hooks.onAdvance();
  }

  /** Keyboard driving; returns true when the key was consumed. */
  handleKey(code: string): boolean {
    if (!this.open) return false;
    if (code === 'Escape') {
      this.hooks.onEnd();
      return true;
    }
    if (code === 'Space' || code === 'Enter' || code === 'NumpadEnter' || code === 'KeyF') {
      this.advance();
      return true;
    }
    if (this.choicesShown && !this.typing) {
      if (code.startsWith('Digit')) {
        const n = Number(code.slice(5)) - 1;
        if (n >= 0 && n < this.choicesEl.children.length) {
          this.select(n);
          this.choose(n);
          return true;
        }
      }
      if (code === 'ArrowUp' || code === 'KeyW') {
        this.select((this.selIdx + this.choicesEl.children.length - 1) % this.choicesEl.children.length);
        this.sfx.uiTick();
        return true;
      }
      if (code === 'ArrowDown' || code === 'KeyS') {
        this.select((this.selIdx + 1) % this.choicesEl.children.length);
        this.sfx.uiTick();
        return true;
      }
    }
    // Swallow everything else — a cinematic owns the keyboard.
    return true;
  }
}
