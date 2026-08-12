/**
 * The Controls table — the Settings screen's third wing. Every action
 * in the one keymap is a row: its name, its key, its pad button. Tap a
 * chip (Ⓐ on it from the couch) and the next press becomes the new
 * binding; a key already in service is taken from its old action and
 * the change is said out loud in the chat log. Esc always keeps things
 * as they are. One button restores the shipped layout.
 */

import { ACTIONS, bindings, kbLabel, padGlyph, type ActionId } from '../input/bindings.js';
import { padFaces, padFamily } from '../input/padProfiles.js';
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

  /**
   * THE PAD SAYS ITS NAME. A controller the browser refuses to map is
   * the single hardest input problem to diagnose from a chair: nothing
   * happens, and nothing says why. This block names every connected
   * pad, the dialect the translator chose for it, and lights the
   * standard-layout slots live as they are pressed — so a player can
   * see at a glance whether the game hears the pad at all, and which
   * slot each button reaches before rebinding it.
   */
  function padReadout(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'pad-readout';
    const warn = document.createElement('div');
    warn.className = 'pad-warn hidden';
    warn.textContent =
      'This window does not hold focus, so the browser has frozen every controller. Click once on the game to wake it.';
    const body = document.createElement('div');
    body.className = 'pad-readout-body';
    wrap.append(warn, body);

    let raf = 0;
    const draw = (): void => {
      // Only burn frames while the Controls wing is actually on screen.
      if (!wrap.isConnected) {
        cancelAnimationFrame(raf);
        return;
      }
      // Hidden wing: keep the loop alive, do no work.
      if (wrap.offsetParent === null) {
        raf = requestAnimationFrame(draw);
        return;
      }
      const { views, activeIndex, pageFocused, quietMs } = deps.input.padDiagnostics();
      // THE FULLSCREEN TRAP, said out loud. Browsers freeze every pad
      // the instant the page loses focus, and a fullscreen toggle is
      // the commonest way to lose it without noticing — the window
      // still looks live, the controller simply goes dead.
      warn.classList.toggle('hidden', pageFocused);
      if (views.length === 0) {
        body.textContent =
          'No controller seen yet. Press a button on the pad with this window in front. Browsers stay deaf to a pad until it speaks first.';
      } else {
        body.innerHTML = '';
        for (const v of views) {
          const card = document.createElement('div');
          card.className = 'pad-card';
          if (v.index === activeIndex) card.classList.add('live');
          const name = document.createElement('div');
          name.className = 'pad-card-name';
          name.textContent = `${v.index === activeIndex ? '▸ ' : ''}${v.id}`;
          // Each card letters its lights in ITS pad's own markings —
          // a DualSense and an Xbox pad side by side each read true.
          const fam = padFamily(v.id);
          const faces = padFaces(fam, v.profile);
          const FAMILY_WORD: Record<typeof fam, string> = {
            xbox: 'Xbox',
            ps: 'PlayStation',
            ns: 'Nintendo',
          };
          const how = document.createElement('div');
          how.className = 'pad-card-how';
          how.textContent =
            (v.native
              ? 'Mapped by the browser (standard layout). '
              : `Not mapped by the browser. Read as "${v.profile}". `) +
            `Shown with ${FAMILY_WORD[fam]} markings.`;
          const lights = document.createElement('div');
          lights.className = 'pad-lights';
          for (let i = 0; i < 16; i++) {
            const g = padGlyph(i, faces, fam);
            const dot = document.createElement('span');
            dot.className = 'pad-light';
            if (v.buttons[i]?.pressed) dot.classList.add('on');
            dot.textContent = g.text;
            lights.appendChild(dot);
          }
          const sticks = document.createElement('div');
          sticks.className = 'pad-card-how';
          const f = (n: number): string => (Math.abs(n) < 0.08 ? '0' : n.toFixed(2));
          sticks.textContent = `Left ${f(v.axes[0] ?? 0)}, ${f(v.axes[1] ?? 0)}   Right ${f(v.axes[2] ?? 0)}, ${f(v.axes[3] ?? 0)}`;
          // Liveness: a pad the browser has stopped reading looks
          // exactly like a pad nobody is touching, so say which.
          const quiet = quietMs[v.index] ?? 0;
          const live = document.createElement('div');
          live.className = 'pad-card-how';
          live.textContent = pageFocused
            ? quiet < 1500
              ? 'Reading live.'
              : `Quiet for ${(quiet / 1000).toFixed(0)}s. Press a button to check.`
            : 'Frozen: the page does not hold focus.';
          card.append(name, how, lights, sticks, live);
          body.appendChild(card);
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return wrap;
  }

  function render(): void {
    rows!.innerHTML = '';
    rows!.appendChild(sectionHead('Controller'));
    rows!.appendChild(padReadout());
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
