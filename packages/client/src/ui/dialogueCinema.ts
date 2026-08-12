import { itemDef, parseDialogueMarkup } from '@arx/content';
import type { Sfx } from '../audio/sfx.js';
import { voicePaceScale } from '../audio/voice.js';
import { bindings, padGlyph } from '../input/bindings.js';
import { dockGlyphUrl, itemIconUrl } from '../render/icons.js';

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
 * and are answered — never skipped. THE TWO-VERB LAW: on keyboard
 * the skim verb (Space / the interact key) can never answer a
 * question — answering rides its own keys (Enter, the digits, a
 * click on the plate) — and every confirm bounces for a beat after
 * the plates land (CHOICE_ARM_MS), so a hand racing through pages
 * can never swear to something it hasn't read. Gifts granted by a
 * beat are staged the moment its line completes: a socket chip and
 * a chime.
 *
 * The server owns the conversation: this class renders exactly what
 * it was sent and reports back (advance / choose index / excuse me).
 */

interface CinemaNode {
  speaker: 'npc' | 'player';
  text: string;
  choices?: string[];
  last?: boolean;
  /** The beat's spoken audio (played by main.ts; paces the reveal here). */
  voice?: { url: string; durMs: number; kind: 'line' | 'quip' };
  gifts?: Array<{ item: string; qty: number }>;
  quest?: {
    id: string;
    name: string;
    rewards?: {
      xp?: Array<{ skill: string; amount: number }>;
      items?: Array<{ item: string; qty: number }>;
      coins?: number;
    };
  };
  /**
   * Choices with quest weight, by index: picking an 'accept' plate
   * swears a quest, a 'turnin' plate hands one in. The plates wear
   * the overhead mark's own grammar — gold ! and gold ? — so a
   * consequential answer never dresses like small talk.
   */
  questChoices?: Array<{ idx: number; kind: 'accept' | 'turnin' }>;
  /**
   * Choices that open a shop, by index: the plate wears the coin
   * chip so the counter reads apart from small talk, exactly as
   * quest weight does.
   */
  shopChoices?: number[];
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
/**
 * THE ARMED QUESTION: for a beat after the choice plates land, every
 * confirm is swallowed — the press that was skimming the line must
 * never be the press that answers it. Longer than any key-mash
 * cadence, shorter than the time it takes to read one plate.
 */
const CHOICE_ARM_MS = 450;

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
  /**
   * THE PACED WORD: a voiced line stretches every hold so the text
   * lands with the audio, and the quill's scratch goes quiet — a
   * voice and a scratching quill fight for the same ear.
   */
  private paceScale = 1;
  private voiced = false;
  private raf = 0;
  private lastT = 0;
  private holdSec = 0;
  private scratchGap = 0;
  private choicesShown = false;
  private selIdx = 0;
  /** When the plates landed — confirms inside CHOICE_ARM_MS bounce. */
  private choicesAt = 0;
  private closeTimer = 0;

  /**
   * Gamepad state — the cinema drives the pad itself (it is not a
   * .ui-screen, so UiNav's capture never claims it). Edge-detected
   * against the previous frame; everything held at open (the Ⓧ that
   * started the talk) is swallowed until released.
   */
  private padPrev = new Set<number>();
  private padArmed = false;
  private padDir: 'up' | 'down' | null = null;
  private padDirSince = 0;
  private padDirLast = 0;
  /** Current legend state + device, so a mid-talk device swap re-renders. */
  private hintState: 'reading' | 'question' | 'farewell' = 'reading';
  private hintMode: 'kb' | 'pad' = 'kb';

  constructor(
    private readonly sfx: Sfx,
    private readonly hooks: {
      onAdvance: () => void;
      onChoose: (idx: number) => void;
      onEnd: () => void;
      /** A gift landed — a soft pulse through pad hands. */
      onGift?: () => void;
      /** The player skipped a voiced line mid-speech — fade the clip. */
      onVoiceSkip?: () => void;
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
    this.padArmed = false;
    this.padDir = null;
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
    this.voiced = node.voice?.kind === 'line';
    this.paceScale = this.voiced
      ? voicePaceScale(
          this.steps.reduce((a, s) => a + s.hold, 0),
          node.voice!.durMs,
        )
      : 1;
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
      this.holdSec = step.hold * this.paceScale;
      if (step.scratch === null) {
        this.sfx.uiTap(); // an item chip lands with a soft tap
      } else if (!this.voiced && ++this.scratchGap >= 3) {
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
    if (node.quest) this.stageQuestOffer(node.quest);
    if (node.choices && node.choices.length > 0) {
      this.buildChoices(node.choices, node.questChoices, node.shopChoices);
      this.setHints('question');
    } else {
      this.moreEl.classList.add('show');
      this.setHints(node.last ? 'farewell' : 'reading');
    }
  }

  /**
   * Drive the conversation from the pad — called every frame by main
   * with the raw snapshot. The vocabulary mirrors the whole game's:
   * Ⓐ turns the page / confirms (Ⓧ, the talk button, does too — the
   * finger that started the conversation continues it), Ⓑ excuses
   * you, and the d-pad or left stick walks the choice plates with the
   * same initial-delay-then-repeat cadence every menu uses.
   */
  tickPad(
    snap: { buttons: readonly GamepadButton[]; axes: readonly number[] } | null,
    nowMs: number,
  ): void {
    if (!this.open) {
      this.padArmed = false;
      return;
    }
    // The legend follows the player's hands: UiNav stamps pad-mode on
    // <body>, and a mid-conversation device swap re-letters the verbs.
    const mode: 'kb' | 'pad' = document.body.classList.contains('pad-mode') ? 'pad' : 'kb';
    if (mode !== this.hintMode) {
      this.hintMode = mode;
      this.renderHints();
    }
    if (!snap) {
      this.padPrev.clear();
      return;
    }
    const pressed = new Set<number>();
    snap.buttons.forEach((b, i) => {
      if (b.pressed) pressed.add(i);
    });
    if (!this.padArmed) {
      // First frame: whatever is already down (the Ⓧ that opened the
      // talk) is old news — swallow it until released.
      this.padArmed = true;
      this.padPrev = pressed;
      return;
    }
    const edge = (i: number): boolean => pressed.has(i) && !this.padPrev.has(i);
    // Ⓐ / Ⓧ: the pad keeps its one-button vocabulary — the same
    // finger skims AND answers — so the arm window inside choose()
    // is the whole accident guard on this device.
    if (edge(0) || edge(2)) {
      if (this.choicesShown && !this.typing) this.confirmSelected();
      else this.advance();
    }
    if (edge(1)) this.hooks.onEnd(); // Ⓑ

    // Choice walking: d-pad or stick, UiNav's exact repeat cadence.
    const ay = snap.axes[1] ?? 0;
    const dir: 'up' | 'down' | null =
      pressed.has(12) || ay < -0.55 ? 'up' : pressed.has(13) || ay > 0.55 ? 'down' : null;
    if (dir === null) {
      this.padDir = null;
    } else if (this.choicesShown && !this.typing) {
      const len = this.choicesEl.children.length;
      const step = (): void => {
        this.select((this.selIdx + (dir === 'up' ? len - 1 : 1)) % len);
        this.sfx.uiTick();
      };
      if (dir !== this.padDir) {
        this.padDir = dir;
        this.padDirSince = nowMs;
        this.padDirLast = nowMs;
        step();
      } else if (nowMs - this.padDirSince > 300 && nowMs - this.padDirLast > 125) {
        this.padDirLast = nowMs;
        step();
      }
    }
    this.padPrev = pressed;
  }

  /**
   * A quest offer is a CONTRACT read aloud: the scroll chip descends
   * beside the line — the quest's name and its pay — so the player
   * reads what they'd be swearing to BEFORE the choice plates appear.
   * The accept itself is an ordinary choice; this is the paper.
   */
  private stageQuestOffer(quest: NonNullable<CinemaNode['quest']>): void {
    const chip = document.createElement('div');
    chip.className = 'dlg-gift dlg-quest-offer';
    const well = document.createElement('span');
    well.className = 'dlg-gift-well';
    const img = document.createElement('img');
    img.src = dockGlyphUrl('quest', 48);
    img.draggable = false;
    well.appendChild(img);
    const text = document.createElement('span');
    text.className = 'dlg-quest-text';
    const kicker = document.createElement('span');
    kicker.className = 'dlg-quest-kicker';
    kicker.textContent = 'New quest';
    const name = document.createElement('span');
    name.className = 'dlg-gift-label';
    name.textContent = quest.name;
    text.append(kicker, name);
    const r = quest.rewards;
    if (r) {
      const pay: string[] = [];
      if (r.coins) pay.push(`${r.coins} coins`);
      for (const e of r.items ?? []) pay.push(e.qty > 1 ? `${e.qty} × ${itemDef(e.item)?.name ?? e.item}` : itemDef(e.item)?.name ?? e.item);
      for (const e of r.xp ?? []) pay.push(`${e.skill} xp`);
      if (pay.length > 0) {
        const payEl = document.createElement('span');
        payEl.className = 'dlg-quest-pay';
        payEl.textContent = pay.join(' · ');
        text.appendChild(payEl);
      }
    }
    chip.append(well, text);
    this.giftsEl.appendChild(chip);
    this.sfx.uiTap();
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
    this.hooks.onGift?.();
  }

  private buildChoices(
    choices: string[],
    marks?: CinemaNode['questChoices'],
    shopMarks?: number[],
  ): void {
    this.choicesShown = true;
    this.choicesAt = performance.now();
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
      // A quest-weighted answer wears the overhead mark's grammar:
      // gold ! swears the work, gold ? hands it in. Small talk stays
      // unbadged, so consequence is legible before the press.
      const mark = marks?.find((m) => m.idx === i);
      if (mark) {
        btn.classList.add('quest');
        const badge = document.createElement('span');
        badge.className = 'dlg-choice-quest';
        badge.textContent = mark.kind === 'turnin' ? '?' : '!';
        btn.appendChild(badge);
      }
      // A trade-weighted answer wears the counter's coin — the purse
      // readout's own icon on the same iron chip, so "this opens the
      // shop" reads before the press.
      if (shopMarks?.includes(i)) {
        btn.classList.add('shop');
        const badge = document.createElement('span');
        badge.className = 'dlg-choice-shop';
        const coin = document.createElement('img');
        coin.src = itemIconUrl('coins', 20);
        coin.alt = '';
        coin.draggable = false;
        badge.appendChild(coin);
        btn.appendChild(badge);
      }
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
    if (!this.choicesShown || this.typing) return;
    // Freshly-landed plates bounce the press: a confirm inside the
    // arm window is the tail of a skim, not a read answer.
    if (performance.now() - this.choicesAt < CHOICE_ARM_MS) {
      this.insist();
      return;
    }
    this.choicesShown = false;
    this.sfx.uiTap();
    this.hooks.onChoose(i);
  }

  /**
   * A press that cannot answer (the skim key on a question, or a
   * confirm still inside the arm window) gets a gentle refusal: the
   * selected plate nudges and the quiet tick stays silent — the
   * question visibly waits to be read.
   */
  private insist(): void {
    const sel = this.choicesEl.querySelector('.dlg-choice.sel');
    if (!sel) return;
    sel.classList.remove('insist');
    void (sel as HTMLElement).offsetWidth;
    sel.classList.add('insist');
  }

  /** The key legend in the bottom bar — always honest about the verbs. */
  private setHints(state: 'reading' | 'question' | 'farewell'): void {
    this.hintState = state;
    this.renderHints();
  }

  /**
   * Render the legend in the player's own language: keyboard chips or
   * the console's colored face-button glyphs — parity of experience,
   * down to the letters on the buttons.
   */
  private renderHints(): void {
    this.hintsEl.textContent = '';
    const state = this.hintState;
    const pad = this.hintMode === 'pad';
    const chip = (cls: string, glyph: string, verb: string): void => {
      const k = document.createElement('span');
      k.className = cls;
      k.textContent = glyph;
      const v = document.createElement('span');
      v.className = 'dlg-verb';
      v.textContent = verb;
      this.hintsEl.append(k, v);
    };
    if (state === 'question') {
      if (pad) {
        chip('dlg-key', '↑↓', 'Select');
        chip('pad-glyph a', padGlyph(0).text, 'Choose');
      } else {
        // The plates carry their own numbers — the legend teaches the
        // deliberate path: walk, then answer on its own key.
        chip('dlg-key', '↑↓', 'Select');
        chip('dlg-key', 'Enter', 'Choose');
      }
    } else {
      const verb = state === 'farewell' ? 'Farewell' : 'Continue';
      if (pad) chip('pad-glyph a', padGlyph(0).text, verb);
      else chip('dlg-key', 'Space', verb);
    }
    if (pad) chip('pad-glyph b', padGlyph(1).text, 'Leave');
    else chip('dlg-key', 'Esc', 'Leave');
  }

  /**
   * The skim verb: finish the line if it's still arriving, otherwise
   * turn the page. On a question it only insists — answering belongs
   * to confirmSelected/choose (THE TWO-VERB LAW), so the hand racing
   * through pages can never pick a plate by accident.
   */
  advance(): void {
    if (!this.open || !this.node) return;
    if (this.typing) {
      // Skip's first press completes the text AND fades the voice —
      // the two-press contract holds for voiced and silent lines alike.
      if (this.voiced) this.hooks.onVoiceSkip?.();
      this.finishReveal();
      return;
    }
    if (this.choicesShown) {
      this.insist();
      return;
    }
    this.sfx.uiTick();
    this.hooks.onAdvance();
  }

  /** The answer verb: confirm the selected plate (arm-window gated). */
  private confirmSelected(): void {
    if (!this.choicesShown || this.typing) return;
    this.choose(this.selIdx);
  }

  /**
   * Keyboard driving; returns true when the key was consumed.
   * Movement/interact verbs come from the ONE KEYMAP (a rebound hand
   * keeps its habits mid-conversation); Space/Enter/Escape are the
   * UI's fixed grammar (RESERVED_KB — unbindable). Held-key repeats
   * never turn a page or answer: every beat costs a fresh press.
   */
  handleKey(code: string, repeat = false): boolean {
    if (!this.open) return false;
    if (code === 'Escape') {
      this.hooks.onEnd();
      return true;
    }
    if (repeat) return true;
    const skimKey = code === 'Space' || bindings.kbMatches('interact', code);
    const answerKey = code === 'Enter' || code === 'NumpadEnter';
    if (this.choicesShown && !this.typing) {
      if (answerKey) {
        this.confirmSelected();
        return true;
      }
      if (skimKey) {
        // The skim key never answers — the question insists instead.
        this.insist();
        return true;
      }
      if (code.startsWith('Digit')) {
        const n = Number(code.slice(5)) - 1;
        if (n >= 0 && n < this.choicesEl.children.length) {
          this.select(n);
          this.choose(n);
          return true;
        }
      }
      if (code === 'ArrowUp' || bindings.kbMatches('moveUp', code)) {
        this.select((this.selIdx + this.choicesEl.children.length - 1) % this.choicesEl.children.length);
        this.sfx.uiTick();
        return true;
      }
      if (code === 'ArrowDown' || bindings.kbMatches('moveDown', code)) {
        this.select((this.selIdx + 1) % this.choicesEl.children.length);
        this.sfx.uiTick();
        return true;
      }
      return true;
    }
    if (skimKey || answerKey) {
      this.advance();
      return true;
    }
    // Swallow everything else — a cinematic owns the keyboard.
    return true;
  }
}
