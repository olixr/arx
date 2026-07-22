/**
 * THE LEVEL-UP CEREMONY CARD — the screen-space half of the reward
 * show (the renderer paints the world half: pillar, rings, fountain).
 *
 * A painted-chrome tray slams in beneath rotating gold rays, wearing
 * the skill's plaque icon, its name, and the new level stamped on a
 * brass crest medallion. Everything animates in CSS on transform and
 * opacity only — compositor work, zero per-frame JS — and the card
 * holds long enough to be read and admired before bowing out on its
 * own (~5.4s total, matched to the world ceremony).
 */
import { itemIconUrl } from '../render/icons.js';

let stage: HTMLElement | null = null;
let exitTimer = 0;
let killTimer = 0;

/** Enter + hold before the bow-out begins. */
const HOLD_MS = 4700;
/** The bow-out itself (matches the lvl-exit keyframes). */
const EXIT_MS = 650;

export function showLevelUp(o: {
  name: string;
  level: number;
  icon: string;
  color: string;
}): void {
  dismissLevelUp();

  const el = document.createElement('div');
  el.id = 'levelup-stage';
  el.style.setProperty('--lvl-accent', o.color);

  const rays = document.createElement('div');
  rays.className = 'lvl-rays';
  el.appendChild(rays);

  const card = document.createElement('div');
  card.className = 'lvl-card ui-tray';

  const plaque = document.createElement('div');
  plaque.className = 'lvl-plaque';
  const img = document.createElement('img');
  img.src = itemIconUrl(o.icon, 64);
  img.draggable = false;
  plaque.appendChild(img);
  card.appendChild(plaque);

  const text = document.createElement('div');
  text.className = 'lvl-text';
  const kicker = document.createElement('div');
  kicker.className = 'lvl-kicker';
  kicker.textContent = 'Level up!';
  const name = document.createElement('div');
  name.className = 'lvl-skill';
  name.textContent = o.name;
  text.append(kicker, name);
  card.appendChild(text);

  // The new level rides a brass crest that breaks the tray's
  // silhouette — the number IS the trophy.
  const medal = document.createElement('div');
  medal.className = 'lvl-medal';
  const num = document.createElement('span');
  num.textContent = String(o.level);
  medal.appendChild(num);
  card.appendChild(medal);

  const shine = document.createElement('div');
  shine.className = 'lvl-shine';
  card.appendChild(shine);

  el.appendChild(card);
  document.body.appendChild(el);
  stage = el;

  exitTimer = window.setTimeout(() => {
    el.classList.add('leaving');
    killTimer = window.setTimeout(() => {
      if (stage === el) {
        el.remove();
        stage = null;
      }
    }, EXIT_MS + 80);
  }, HOLD_MS);
}

/** Clear any showing card (a fresh level-up restarts the show). */
export function dismissLevelUp(): void {
  if (exitTimer) {
    clearTimeout(exitTimer);
    exitTimer = 0;
  }
  if (killTimer) {
    clearTimeout(killTimer);
    killTimer = 0;
  }
  stage?.remove();
  stage = null;
}
