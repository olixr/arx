/**
 * The Controls table — the Settings screen's third wing. Every action
 * in the one keymap is a row: its name, its key, its pad button. Tap a
 * chip (Ⓐ on it from the couch) and the next press becomes the new
 * binding; a key already in service is taken from its old action and
 * the change is said out loud in the chat log. Esc always keeps things
 * as they are. One button restores the shipped layout.
 */

import { ACTIONS, bindings, kbLabel, padGlyph, type ActionId } from '../input/bindings.js';
import type { InputManager } from '../input/inputManager.js';
import type { UiNav } from './padUI.js';
import { bigButton, sectionHead } from './panel.js';

interface ControlsDeps {
  nav: UiNav;
  input: InputManager;
  /** One quiet system line — the quartermaster's voice. */
  notice: (text: string) => void;
}

const label = (id: ActionId): string => ACTIONS.find((a) => a.id === id)?.label ?? id;

export function installControlsMenu(deps: ControlsDeps): void {
  const rows = document.getElementById('controls-rows');
  if (!rows) return;

  // The capture plate: floats over everything while a binding listens.
  const plate = document.createElement('div');
  plate.id = 'bind-capture';
  plate.className = 'hidden';
  document.body.appendChild(plate);

  let cancelCapture: (() => void) | null = null;

  function endCapture(): void {
    plate.classList.add('hidden');
    deps.nav.suspended = false;
    cancelCapture = null;
  }

  /** Listen for one key; Esc keeps the old binding. */
  function captureKb(id: ActionId): void {
    cancelCapture?.();
    plate.textContent = `Press a key for ${label(id)} — Esc keeps the old one.`;
    plate.classList.remove('hidden');
    deps.nav.suspended = true;
    const onKey = (e: KeyboardEvent): void => {
      e.preventDefault();
      e.stopImmediatePropagation();
      window.removeEventListener('keydown', onKey, true);
      if (e.code === 'Escape') {
        endCapture();
        return;
      }
      const res = bindings.bindKb(id, e.code);
      if (res === 'reserved') {
        deps.notice(`${kbLabel(e.code)} belongs to the menus. Pick another key.`);
      } else {
        deps.notice(
          res.stolenFrom
            ? `${label(id)} answers to ${kbLabel(e.code)} now. ${label(res.stolenFrom)} gave it up.`
            : `${label(id)} answers to ${kbLabel(e.code)} now.`,
        );
      }
      endCapture();
    };
    window.addEventListener('keydown', onKey, true);
    cancelCapture = (): void => {
      window.removeEventListener('keydown', onKey, true);
      endCapture();
    };
  }

  /** Listen for one pad button; Esc keeps the old binding. */
  function capturePad(id: ActionId): void {
    cancelCapture?.();
    plate.textContent = `Press a pad button for ${label(id)} — Esc keeps the old one.`;
    plate.classList.remove('hidden');
    deps.nav.suspended = true;
    // Buttons held when the plate opens (the Ⓐ that opened it) don't
    // count until released.
    const held = new Set<number>();
    deps.input.padSnapshot()?.buttons.forEach((b, i) => {
      if (b.pressed) held.add(i);
    });
    let raf = 0;
    const deadline = performance.now() + 8000;
    const onEsc = (e: KeyboardEvent): void => {
      if (e.code !== 'Escape') return;
      e.preventDefault();
      e.stopImmediatePropagation();
      stop();
    };
    const stop = (): void => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onEsc, true);
      endCapture();
    };
    const poll = (): void => {
      if (performance.now() > deadline) {
        stop();
        return;
      }
      const snap = deps.input.padSnapshot();
      if (snap) {
        for (let i = 0; i < snap.buttons.length && i < 17; i++) {
          const pressed = snap.buttons[i]?.pressed ?? false;
          if (!pressed) {
            held.delete(i);
            continue;
          }
          if (held.has(i)) continue;
          const res = bindings.bindPad(id, i);
          const g = padGlyph(i);
          deps.notice(
            res.stolenFrom
              ? `${label(id)} answers to ${g.text} now. ${label(res.stolenFrom)} gave it up.`
              : `${label(id)} answers to ${g.text} now.`,
          );
          stop();
          return;
        }
      }
      raf = requestAnimationFrame(poll);
    };
    window.addEventListener('keydown', onEsc, true);
    raf = requestAnimationFrame(poll);
    cancelCapture = stop;
  }

  function chip(
    id: ActionId,
    device: 'kb' | 'pad',
  ): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = 'bind-chip';
    btn.dataset.nav = '';
    btn.dataset.navkey = `bind:${device}:${id}`;
    btn.dataset.acta = 'Rebind';
    if (device === 'kb') {
      const key = bindings.kbBadge(id);
      const glyph = document.createElement('span');
      glyph.className = 'kb-glyph';
      glyph.textContent = key || '—';
      if (!key) glyph.classList.add('unbound');
      btn.appendChild(glyph);
      btn.addEventListener('click', () => captureKb(id));
    } else {
      const g = bindings.padBadge(id);
      const glyph = document.createElement('span');
      glyph.className = g ? `pad-glyph ${g.cls}` : 'kb-glyph unbound';
      glyph.textContent = g ? g.text : '—';
      btn.appendChild(glyph);
      btn.addEventListener('click', () => capturePad(id));
    }
    return btn;
  }

  function render(): void {
    rows!.innerHTML = '';
    let group = '';
    for (const a of ACTIONS) {
      if (a.group !== group) {
        group = a.group;
        rows!.appendChild(sectionHead(group));
      }
      const row = document.createElement('div');
      row.className = 'bind-row';
      const name = document.createElement('span');
      name.className = 'bind-name';
      name.textContent = a.label;
      row.append(name, chip(a.id, 'kb'), chip(a.id, 'pad'));
      rows!.appendChild(row);
    }
    const foot = document.createElement('div');
    foot.className = 'bind-foot';
    foot.appendChild(
      bigButton('Restore the standard layout', 'bind:reset', () => {
        bindings.resetAll();
        deps.notice('The standard layout is back.');
      }, { minor: true }),
    );
    rows!.appendChild(foot);
  }

  render();
  // Any change — a rebind here, a reset — redraws the whole table.
  // (Chips are keyed nav stops, so the pad's focus survives.)
  bindings.onChange(render);
}
