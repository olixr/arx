import { SWAP_BEAT_MS } from '@arx/shared';
import { itemDef } from '@arx/content';
import type { ClientGame } from '../game/clientGame.js';
import { itemIconUrl } from '../render/icons.js';
import { bindings } from '../input/bindings.js';

/**
 * THE SWAP WELL — the hotbar's window onto the waiting weapon set
 * (THE SECOND GRIP). Since THE QUIET BACK, the body shows only the
 * active set, so this well and the character room's rack are the
 * waiting pair's whole visible life: the well shows WHAT a press
 * gives you (the waiting mainhand large, its offhand tucked at the
 * corner), dimmed to the dormant register, wearing the live trade
 * key. Pressing it is the same as pressing the key; through the
 * beat the well wears `.trading` and the icons breathe once.
 *
 * Laws:
 * - THE WELL SHOWS THE OTHER HAND. Never the active set (your hands
 *   already show that) — always what WAITS.
 * - PROMISE NOTHING: no damage figures, no stats — the tooltip names
 *   both sets in plain words and stops there (THE SLEEPING STEEL).
 * - EMPTY IS QUIET: a ghost well and one honest sentence.
 */

const EMPTY_HINT = 'Nothing waits at your back. Stow a weapon from your pack.';

export class SwapSlot {
  private readonly root: HTMLButtonElement;
  private readonly icon: HTMLElement;
  private readonly offIcon: HTMLElement;
  private renderedKey = '';
  private trading = false;

  constructor(onSwap: () => void) {
    const bar = document.getElementById('hotbar')!;
    this.root = document.createElement('button');
    this.root.className = 'hotbar-slot swap-slot empty';
    this.root.type = 'button';
    this.root.title = EMPTY_HINT;

    this.icon = document.createElement('div');
    this.icon.className = 'hotbar-icon';
    this.root.appendChild(this.icon);

    this.offIcon = document.createElement('div');
    this.offIcon.className = 'swap-off';
    this.root.appendChild(this.offIcon);

    // Device-aware key badge, redrawn on every rebind and pad-family
    // change — the belt well's discipline exactly.
    const key = document.createElement('span');
    key.className = 'hotbar-key';
    const renderBadge = (): void => {
      key.innerHTML = '';
      const kbText = bindings.kbBadge('swapSets');
      if (kbText) {
        const kb = document.createElement('span');
        kb.className = 'kb-glyph small';
        kb.textContent = kbText;
        key.appendChild(kb);
      }
      const g = bindings.padBadge('swapSets');
      if (g) {
        const pad = document.createElement('span');
        pad.className = `pad-glyph ${g.cls}`;
        pad.textContent = g.text;
        key.appendChild(pad);
      }
    };
    renderBadge();
    bindings.onChange(renderBadge);
    this.root.appendChild(key);

    this.root.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      onSwap();
    });

    bar.appendChild(this.root);
  }

  /** Called once per frame — DOM writes only when the state changes. */
  update(game: ClientGame): void {
    // The beat's breath: cheap class toggle, motion lives in CSS
    // (and dies with body.no-ui-motion like every UI motion).
    const trading = game.ownSwapAt > 0 && performance.now() < game.ownSwapAt + SWAP_BEAT_MS;
    if (trading !== this.trading) {
      this.trading = trading;
      this.root.classList.toggle('trading', trading);
    }

    const stowW = game.equipment.stowWeapon;
    const stowO = game.equipment.stowOffhand;
    const activeW = game.equipment.weapon;
    const k = `${stowW?.id ?? ''}:${stowO?.id ?? ''}:${activeW?.id ?? ''}`;
    if (k === this.renderedKey) return;
    this.renderedKey = k;
    if (!stowW && !stowO) {
      this.root.classList.add('empty');
      this.icon.replaceChildren();
      this.offIcon.replaceChildren();
      this.root.title = EMPTY_HINT;
      return;
    }
    this.root.classList.remove('empty');
    // The waiting mainhand leads the well; a lone waiting offhand
    // (a shield kept for the trade) takes the stage alone.
    const lead = stowW ?? stowO!;
    const img = document.createElement('img');
    img.src = itemIconUrl(lead.id, 60);
    img.draggable = false;
    this.icon.replaceChildren(img);
    if (stowW && stowO) {
      const mini = document.createElement('img');
      mini.src = itemIconUrl(stowO.id, 36);
      mini.draggable = false;
      this.offIcon.replaceChildren(mini);
    } else {
      this.offIcon.replaceChildren();
    }
    const name = (id: string): string => itemDef(id)?.name ?? id;
    const waiting =
      stowW && stowO
        ? `${name(stowW.id)} with ${name(stowO.id).toLowerCase()}`
        : name((stowW ?? stowO)!.id);
    const held = activeW ? name(activeW.id).toLowerCase() : 'bare hands';
    this.root.title = `At the ready: ${waiting}. Trades with your ${held}. Press to trade.`;
  }
}
