import { dockGlyphUrl } from '../render/icons.js';

/**
 * THE STANDING CEREMONY (factions Phase 3) — a band crossed hands.
 * Rising to an earned band gets the completed-quest treatment (rays,
 * gold); any fall gets a quiet cold card — losing a name is a fact,
 * not a fanfare. A toast, not a screen (pointer-events none, never
 * .ui-tray), fired ONLY on a live S2CRepEvent — quiet repupd patches
 * never celebrate. Reuses the quest ceremony's chrome classes whole.
 */
let killTimer = 0;
let exitTimer = 0;

const HOLD_MS = 3600;
const EXIT_MS = 650;

const BAND_INK: Record<string, string> = {
  hunted: '#f0655a',
  outlaw: '#e08a52',
  suspect: '#c8a36a',
  neutral: '#9a8f78',
  known: '#d8c08c',
  trusted: '#e8b64c',
  champion: '#f2c94c',
};

export function showRepBanner(faction: string, band: string, rose: boolean): void {
  dismissRepBanner();
  const bright = rose && (band === 'known' || band === 'trusted' || band === 'champion');

  const el = document.createElement('div');
  el.id = 'rep-stage';
  el.style.setProperty('--quest-accent', BAND_INK[band] ?? '#d8c08c');

  if (bright) {
    const rays = document.createElement('div');
    rays.className = 'disc-rays';
    el.appendChild(rays);
  }

  const card = document.createElement('div');
  card.className = 'rift-card quest-card';

  const plaque = document.createElement('div');
  plaque.className = 'rift-plaque';
  const img = document.createElement('img');
  img.src = dockGlyphUrl('rep', 72);
  img.draggable = false;
  plaque.appendChild(img);
  card.appendChild(plaque);

  const text = document.createElement('div');
  text.className = 'rift-text';
  const kicker = document.createElement('div');
  kicker.className = 'rift-kicker quest-kicker';
  kicker.textContent = rose ? 'Your name rises' : 'Your name falls';
  const title = document.createElement('div');
  title.className = 'rift-name quest-name';
  title.textContent = faction;
  const sub = document.createElement('div');
  sub.className = 'quest-banner-sub';
  sub.textContent = band.length === 0 ? band : band[0]!.toUpperCase() + band.slice(1);
  sub.style.color = BAND_INK[band] ?? '#d8c08c';
  text.append(kicker, title, sub);
  card.appendChild(text);

  el.appendChild(card);
  document.body.appendChild(el);
  stageEl = el;

  exitTimer = window.setTimeout(() => el.classList.add('leaving'), HOLD_MS);
  killTimer = window.setTimeout(() => dismissRepBanner(), HOLD_MS + EXIT_MS);
}

let stageEl: HTMLElement | null = null;

export function dismissRepBanner(): void {
  window.clearTimeout(exitTimer);
  window.clearTimeout(killTimer);
  stageEl?.remove();
  stageEl = null;
}
