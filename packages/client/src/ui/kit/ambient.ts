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
 * - BEHIND EVERYTHING. The layer rides z-index -1 inside the host's
 *   own stacking context (`.ui-screen` and `.char-tray` isolate),
 *   between the leather field and the content. It can never sit on a
 *   word.
 * - A BREATH, NOT A SHOW. ≤ ~0.22 opacity at peak, slow rise, long
 *   periods — dust in a sunbeam, soothing at the edge of notice.
 * - FREE. No layout reads, no rAF, no timers — pure CSS animation on
 *   compositor properties (translate + opacity only).
 */

export function attachAmbient(room: HTMLElement, count = 9): void {
  if (room.querySelector(':scope > .kit-ambient')) return;
  const layer = document.createElement('div');
  layer.className = 'kit-ambient';
  layer.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < count; i++) {
    const mote = document.createElement('span');
    mote.className = 'ambient-mote';
    /* Each mote draws its own lot: berth, drift, tempo, phase. Every
       third is parchment-pale instead of ember — mixed dust reads as
       air, one color reads as sparks. */
    if (i % 3 === 2) mote.classList.add('pale');
    mote.style.setProperty('--mote-x', `${(4 + Math.random() * 92).toFixed(1)}%`);
    mote.style.setProperty('--mote-drift', `${(Math.random() * 3 - 1.5).toFixed(2)}rem`);
    mote.style.setProperty('--mote-dur', `${(14 + Math.random() * 12).toFixed(1)}s`);
    mote.style.setProperty('--mote-delay', `${(-Math.random() * 26).toFixed(1)}s`);
    mote.style.setProperty('--mote-size', `${(0.14 + Math.random() * 0.2).toFixed(3)}rem`);
    layer.appendChild(mote);
  }
  room.insertBefore(layer, room.firstChild);
}
