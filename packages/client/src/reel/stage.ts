import type { HudMode } from './types.js';

/**
 * THE STAGE — what the frame is allowed to contain.
 *
 * Three dress states, and the difference between them is the whole
 * argument a shot is making:
 *
 *  `clean` — the world alone. Landscapes, homesteads, the road. Any
 *    chrome here is litter.
 *  `drama` — the world plus the game's own ceremonies: the crown's
 *    banner dropping, the herald naming a place, damage rising off a
 *    body, a villager's words standing in the air. These are not UI in
 *    the dashboard sense; they are the game speaking, and a trailer
 *    that cuts them is a trailer that cuts the best writing.
 *  `play` — everything. The proof shot: this is a real session.
 *
 * The dashboard list is explicit rather than a blanket `#hud { hidden }`
 * because the ceremonies live inside `#hud` too. One list, named, so a
 * new panel that appears in a reel is a one-line fix here.
 */

/** The dashboard: shown to a player, never to a judge. */
const DASHBOARD = [
  '#chat',
  '#debug',
  '#hotbar',
  '#passive-tray',
  '#buff-tray',
  '#panel-buttons',
  '#touch-controls',
  '#hud-northwest',
  '#danger-gauge',
  '#objective-tracker',
  '#waypoint-hud',
  '#map-overlay',
  '#arena-hud',
  '#companion-plaque',
  '#party-hud',
  '#swap-slot',
  '#belt-slot',
  '#item-card',
  '#item-menu',
  '#work-card',
  '#sign-plaque',
  '#ui-interact-prompt',
  '#crossing-veil',
  '.ui-screen',
  '.tip',
];

/** The ceremonies: the game's own theatre, kept in `drama`. */
const CEREMONY = [
  '#boss-banner',
  '#herald-stage',
  '#quest-stage',
  '#levelup-stage',
  '#speech-layer',
  '#trophy-plaque',
  '#rep-stage',
  '#dlg-cinema',
];

const STYLE_ID = 'reel-stage-style';

export function dressStage(mode: HudMode): void {
  document.getElementById(STYLE_ID)?.remove();
  const css: string[] = [
    // The cursor is not part of the world.
    'html, body { cursor: none !important; }',
    // Nothing the page can scroll; a capture is a fixed frame.
    'html, body { overflow: hidden !important; }',
  ];
  if (mode === 'clean') {
    css.push(`${[...DASHBOARD, ...CEREMONY].join(',')} { display: none !important; }`);
  } else if (mode === 'drama') {
    css.push(`${DASHBOARD.join(',')} { display: none !important; }`);
  }
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = css.join('\n');
  document.head.appendChild(el);
  document.body.classList.add('reel-live');
  document.body.classList.toggle('reel-clean', mode === 'clean');
  document.body.classList.toggle('reel-drama', mode === 'drama');
}

export function undressStage(): void {
  document.getElementById(STYLE_ID)?.remove();
  document.body.classList.remove('reel-live', 'reel-clean', 'reel-drama');
}
