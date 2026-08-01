/**
 * THE NAMING — the gentling's last beat (beastcraft v2, THE OPEN
 * HAND). The server just tamed a beast into a stall and asked, once,
 * for its collar tag; this card is that single question. It is a
 * MODAL moment on purpose (the only one outside character creation's
 * look picker): the bond deserves a held breath, and a name typed
 * half-into the chat box deserves nobody.
 *
 * The shared sanitizer runs live on every keystroke, so the confirm
 * only ever sends a name the server will accept — the wire never
 * carries a doomed ask from here. Closing without confirming keeps
 * the species name the server already wrote; nothing is lost, and
 * the stalls can rename later (Phase 4 gives that its own door).
 */
import { sanitizePetName } from '@arx/shared';

export class PetNamingCard {
  private root: HTMLElement | null = null;

  /** Gates the game's keymap while the pen is up (main.ts typing check). */
  get isTyping(): boolean {
    return this.root !== null;
  }

  open(slot: number, currentName: string, submit: (name: string) => void): void {
    this.close();

    const stage = document.createElement('div');
    stage.id = 'petname-stage';

    const card = document.createElement('div');
    card.className = 'petname-card';

    const kicker = document.createElement('div');
    kicker.className = 'petname-kicker';
    kicker.textContent = 'A NEW COMPANION';
    card.appendChild(kicker);

    const lede = document.createElement('div');
    lede.className = 'petname-lede';
    lede.textContent = 'It watches you, waiting on a name.';
    card.appendChild(lede);

    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 16;
    input.spellcheck = false;
    input.value = currentName;
    input.className = 'petname-input';
    // The naming is modal to the pad too: the ring walks the card.
    input.dataset.nav = '';
    input.dataset.navkey = 'petname:input';
    input.dataset.acta = 'Write';
    card.appendChild(input);

    const hint = document.createElement('div');
    hint.className = 'petname-hint';
    hint.textContent = 'Two to sixteen letters.';
    card.appendChild(hint);

    const row = document.createElement('div');
    row.className = 'petname-acts';
    const keep = document.createElement('button');
    keep.className = 'act-btn';
    keep.textContent = 'Keep its name';
    keep.dataset.nav = '';
    keep.dataset.navkey = 'petname:keep';
    keep.dataset.acta = 'Keep';
    const confirm = document.createElement('button');
    confirm.className = 'act-btn petname-confirm';
    confirm.textContent = 'So be it';
    confirm.dataset.nav = '';
    confirm.dataset.navkey = 'petname:confirm';
    confirm.dataset.acta = 'Name it';
    row.appendChild(keep);
    row.appendChild(confirm);
    card.appendChild(row);

    const judge = () => {
      const clean = sanitizePetName(input.value);
      confirm.disabled = clean === null;
      return clean;
    };
    input.addEventListener('input', judge);

    const done = () => {
      const clean = judge();
      // Sending the unchanged species name is a harmless no-op, but
      // a deliberate confirm should still feel answered — close it.
      if (clean !== null && clean !== currentName) submit(clean);
      this.close();
    };
    confirm.addEventListener('click', done);
    keep.addEventListener('click', () => this.close());
    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter' && !confirm.disabled) done();
      if (e.key === 'Escape') this.close();
    });

    stage.appendChild(card);
    document.body.appendChild(stage);
    this.root = stage;
    judge();
    // Focus after the opening keypress has fully passed (the sign
    // sheet's own lesson: no 'f' nobody typed).
    setTimeout(() => {
      input.focus();
      input.select();
    }, 0);
    void slot; // identity travels in the submit closure; kept for symmetry
  }

  close(): void {
    this.root?.remove();
    this.root = null;
  }
}
