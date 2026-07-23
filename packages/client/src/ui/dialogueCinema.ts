import { itemDef, parseDialogueMarkup } from '@devcraft/content';
import type { Sfx } from '../audio/sfx.js';
import { itemIconUrl } from '../render/icons.js';

/**
 * THE DIALOGUE CINEMA — the screen-space half of a conversation (the
 * renderer plays the world half: the camera glides to frame both
 * speakers past the player's zoom ceiling, breathing).
 *
 * Anatomy: letterbox bars ease in top and bottom (the bottom bar
 * carries the key legend), a masked backdrop blur and a warm vignette
 * grade soften the world's edges while the speakers stay sharp, and a
 * lower-third stage rises — a brass name banner over a parchment
 * speech sheet. NPC beats speak from the parchment in ink; player
 * beats flip the sheet to the iron tray ("You" takes the banner with
 * a quick swap flourish).
 *
 * THE TYPEWRITER LAW: text is never pasted, it arrives — per-glyph
 * rise-and-fade at reading pace, punctuation holding a breath, a
 * quill scratch at the edge of hearing. Markup acts: *emphasis*
 * lands warm and bold, _foreboding_ slows the hand and drops the
 * scratch an octave, {item:...} sets the item itself — icon and
 * name — into the sentence as one revealed beat. The FIRST advance
 * press completes the line instantly; the next one turns the page.
 * Questions slide their choice plates in only after the line lands,
 * and are answered — never skipped. Gifts granted by a beat are
 * staged the moment its line completes: a socket chip and a chime.
 *
 * The server owns the conversation: this class renders exactly what
 * it was sent and reports back (advance / choose index / excuse me).
 */

interface CinemaNode {
  speaker: 'npc' | 'player';
  text: string;
  choices?: string[];
  last?: boolean;
  gifts?: Array<{ item: string; qty: number }>;
}

/** One reveal beat: an element to light, how long to rest after it. */
interface RevealStep {
  el: HTMLElement;
  hold: number;
  /** Which scratch the quill makes here (null = silent, e.g. chips). */
  scratch: 'norm' | 'grim' | null;
}

/** Reading pace: base seconds per glyph, with punctuation holds. */
const CHAR_SEC = 1 / 52;
/** Foreboding is read slowly — the temperature drop needs room. */
const GRIM_MULT = 1.75;

function charHold(ch: string, grim: boolean): number {
  let hold = CHAR_SEC;
  if ('.!?…'.includes(ch)) hold += 0.22;
  else if (',;:—'.includes(ch)) hold += 0.09;
  return grim ? hold * GRIM_MULT : hold;
}

export class DialogueCinema {
  open = false;

  private readonly root: HTMLElement;
  private readonly stage: HTMLElement;
  private readonly nameWrap: HTMLElement;
  private readonly nameEl: HTMLElement;
  private readonly titleEl: HTMLElement;
  private readonly sheet: HTMLElement;
  private readonly textEl: HTMLElement;
  private readonly moreEl: HTMLElement;
  private readonly giftsEl: HTMLElement;
  private readonly choicesEl: HTMLElement;
  private readonly hintsEl: HTMLElement;

  private npcName = '';
  private npcTitle: string | undefined;
  private node: CinemaNode | null = null;
  private lastSpeaker: 'npc' | 'player' | null = null;

  /** Typewriter state: beats still dark, and the rAF clock. */
  private steps: RevealStep[] = [];
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
    this.hintsEl = document.createElement('div');
    this.hintsEl.className = 'dlg-hints';
    barBot.appendChild(this.hintsEl);
    const depth = document.createElement('div');
    depth.className = 'dlg-depth';
    const grade = document.createElement('div');
    grade.className = 'dlg-grade';
    this.root.append(barTop, barBot, depth, grade);

    this.stage = document.createElement('div');
    this.stage.className = 'dlg-stage';

    this.nameWrap = document.createElement('div');
    this.nameWrap.className = 'dlg-name';
    this.nameEl = document.createElement('span');
    this.nameEl.className = 'dlg-name-text';
    this.titleEl = document.createElement('span');
    this.titleEl.className = 'dlg-name-title';
    this.nameWrap.append(this.nameEl, this.titleEl);

    this.sheet = document.createElement('div');
    this.sheet.className = 'dlg-sheet';
    this.textEl = document.createElement('div');
    this.textEl.className = 'dlg-text';
    this.moreEl = document.createElement('div');
    this.moreEl.className = 'dlg-more';
    this.giftsEl = document.createElement('div');
    this.giftsEl.className = 'dlg-gifts';
    this.sheet.append(this.textEl, this.moreEl);

    this.choicesEl = document.createElement('div');
    this.choicesEl.className = 'dlg-choices';

    this.stage.append(this.nameWrap, this.giftsEl, this.sheet, this.choicesEl);
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
    this.lastSpeaker = null;
    this.textEl.textContent = '';
    this.choicesEl.textContent = '';
    this.giftsEl.textContent = '';
    this.moreEl.classList.remove('show');
    this.setHints('reading');
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
    this.giftsEl.textContent = '';
    this.moreEl.classList.remove('show');
    this.setHints('reading');

    const player = node.speaker === 'player';
    this.stage.classList.toggle('player', player);
    this.nameEl.textContent = player ? 'You' : this.npcName;
    this.titleEl.textContent = !player && this.npcTitle ? this.npcTitle : '';
    // The banner flips hands with a quick flourish when the voice does.
    if (this.lastSpeaker !== null && this.lastSpeaker !== node.speaker) {
      this.nameWrap.classList.remove('swap');
      void this.nameWrap.offsetWidth;
      this.nameWrap.classList.add('swap');
    }
    this.lastSpeaker = node.speaker;

    // Each beat turns the page: the sheet takes a soft settle.
    this.sheet.classList.remove('turn');
    void this.sheet.offsetWidth;
    this.sheet.classList.add('turn');

    this.buildSteps(node.text);
    this.revealed = 0;
    this.typing = true;
    this.holdSec = 0.12; // a beat before the first glyph
    this.scratchGap = 0;
    this.lastT = performance.now();
    this.raf = requestAnimationFrame(this.tick);
  }

  /**
   * Lay the line out from the ONE markup parser's token stream.
   * Glyphs nest in per-word wrappers so words wrap as units — and a
   * word keeps its wrapper across tone changes ("*gate*." never
   * strands its period on the next line). Item tokens become a single
   * inline chip, revealed as one beat.
   */
  private buildSteps(text: string): void {
    this.textEl.textContent = '';
    this.steps = [];
    const { tokens } = parseDialogueMarkup(text);
    let word: HTMLElement | null = null;
    const closeWord = (): void => {
      word = null;
    };
    const openWord = (): HTMLElement => {
      if (!word) {
        word = document.createElement('span');
        word.className = 'dlg-word';
        this.textEl.appendChild(word);
      }
      return word;
    };
    for (const tok of tokens) {
      if (tok.kind === 'item') {
        closeWord();
        const def = itemDef(tok.item);
        const chip = document.createElement('span');
        chip.className = 'dlg-item-chip';
        const img = document.createElement('img');
        img.src = itemIconUrl(tok.item, 32);
        img.draggable = false;
        const label = document.createElement('span');
        label.textContent = def?.name ?? tok.item;
        chip.append(img, label);
        this.textEl.appendChild(chip);
        this.steps.push({ el: chip, hold: 0.3, scratch: null });
        continue;
      }
      const grim = tok.kind === 'grim';
      const tone = tok.kind === 'text' ? '' : tok.kind === 'em' ? ' dlg-em' : ' dlg-grim';
      for (const ch of tok.text) {
        if (ch === ' ') {
          closeWord();
          this.textEl.appendChild(document.createTextNode(' '));
          continue;
        }
        const s = document.createElement('span');
        s.className = `dlg-ch${tone}`;
        s.textContent = ch;
        openWord().appendChild(s);
        this.steps.push({ el: s, hold: charHold(ch, grim), scratch: grim ? 'grim' : 'norm' });
      }
      closeWord();
    }
  }

  private readonly tick = (t: number): void => {
    if (!this.typing) return;
    let dt = Math.min(0.1, (t - this.lastT) / 1000);
    this.lastT = t;
    while (dt > 0 && this.revealed < this.steps.length) {
      if (this.holdSec > dt) {
        this.holdSec -= dt;
        break;
      }
      dt -= this.holdSec;
      const step = this.steps[this.revealed++]!;
      step.el.classList.add('lit');
      this.holdSec = step.hold;
      if (step.scratch === null) {
        this.sfx.uiTap(); // an item chip lands with a soft tap
      } else if (++this.scratchGap >= 3) {
        this.scratchGap = 0;
        if (step.scratch === 'grim') this.sfx.dialogueScratchGrim();
        else this.sfx.dialogueScratch();
      }
    }
    if (this.revealed >= this.steps.length) this.finishReveal();
    else this.raf = requestAnimationFrame(this.tick);
  };

  private stopReveal(): void {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.typing = false;
  }

  /** The line has fully landed: gifts, then the answer or page-turn. */
  private finishReveal(): void {
    this.stopReveal();
    for (const s of this.steps) s.el.classList.add('lit');
    const node = this.node;
    if (!node) return;
    if (node.gifts && node.gifts.length > 0) this.stageGifts(node.gifts);
    if (node.choices && node.choices.length > 0) {
      this.buildChoices(node.choices);
      this.setHints('question');
    } else {
      this.moreEl.classList.add('show');
      this.setHints(node.last ? 'farewell' : 'reading');
    }
  }

  /** A gift is a MOMENT: socket chip, name, count, chime. */
  private stageGifts(gifts: Array<{ item: string; qty: number }>): void {
    this.giftsEl.textContent = '';
    gifts.forEach((g, i) => {
      const chip = document.createElement('div');
      chip.className = 'dlg-gift';
      chip.style.animationDelay = `${i * 120}ms`;
      const well = document.createElement('span');
      well.className = 'dlg-gift-well';
      const img = document.createElement('img');
      img.src = itemIconUrl(g.item, 48);
      img.draggable = false;
      well.appendChild(img);
      const label = document.createElement('span');
      label.className = 'dlg-gift-label';
      label.textContent = `${itemDef(g.item)?.name ?? g.item}${g.qty > 1 ? ` × ${g.qty}` : ''}`;
      chip.append(well, label);
      this.giftsEl.appendChild(chip);
    });
    this.sfx.dialogueGift();
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
      label.className = 'dlg-choice-label';
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

  /** The key legend in the bottom bar — always honest about the verbs. */
  private setHints(state: 'reading' | 'question' | 'farewell'): void {
    this.hintsEl.textContent = '';
    const pair = (key: string, verb: string): void => {
      const k = document.createElement('span');
      k.className = 'dlg-key';
      k.textContent = key;
      const v = document.createElement('span');
      v.className = 'dlg-verb';
      v.textContent = verb;
      this.hintsEl.append(k, v);
    };
    if (state === 'question') pair('1–4', 'Choose');
    else pair('Space', state === 'farewell' ? 'Farewell' : 'Continue');
    pair('Esc', 'Leave');
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
