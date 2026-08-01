/**
 * THE AMBIENT LAYER — the room's quiet life (The Grand Refit, Ph 2).
 *
 * A handful of ember motes drift up through the case shadow behind a
 * room's content: barely-there, transform-and-opacity only, gone the
 * moment the room closes (display:none pauses the animations) and
 * standing down entirely under reduced motion or the Interface
 * motion setting.
 *
 * Laws:
 * - BEHIND EVERYTHING. The layer rides z-index -1 inside the room's
 *   own stacking context (`.ui-screen` isolates), between the leather
 *   field and the content. It can never sit on a word.
 * - A WHISPER. ≤ 0.14 opacity at peak, few motes, slow. If a player
 *   points at it, it is too loud.
 * - FREE. No layout reads, no rAF, no timers — pure CSS animation on
 *   compositor properties.
 */

export function attachAmbient(room: HTMLElement, count = 7): void {
  if (room.querySelector(':scope > .kit-ambient')) return;
  const layer = document.createElement('div');
  layer.className = 'kit-ambient';
  layer.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < count; i++) {
    const mote = document.createElement('span');
    mote.className = 'ambient-mote';
    /* Each mote draws its own lot: berth, drift, tempo, phase. */
    mote.style.setProperty('--mote-x', `${(5 + Math.random() * 90).toFixed(1)}%`);
    mote.style.setProperty('--mote-drift', `${(Math.random() * 2 - 1).toFixed(2)}rem`);
    mote.style.setProperty('--mote-dur', `${(9 + Math.random() * 8).toFixed(1)}s`);
    mote.style.setProperty('--mote-delay', `${(-Math.random() * 16).toFixed(1)}s`);
    mote.style.setProperty('--mote-size', `${(0.15 + Math.random() * 0.16).toFixed(3)}rem`);
    layer.appendChild(mote);
  }
  room.insertBefore(layer, room.firstChild);
}
