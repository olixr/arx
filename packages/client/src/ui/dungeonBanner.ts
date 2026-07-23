/**
 * THE DUNGEON ENTRY BANNER — the threshold announcement.
 *
 * The moment the veil sets you down, a chrome tray slams in top-center
 * naming where you now stand: the dungeon's title large, its sigil and
 * power beneath, the whole card keyed to the key's tier. It is a toast,
 * not a screen — no interaction, pointer-events none, gone on its own
 * in ~3s — so it overlays like the level-up card and never touches the
 * one-screen gate. Like that card, it wears its OWN copy of the tray
 * chrome (never .ui-tray: that class doubles as the "a panel is open"
 * input-gate selector).
 */
import { RARITY_COLORS, isRarityTier } from '@devcraft/shared';
import { itemIconUrl } from '../render/icons.js';

let stage: HTMLElement | null = null;
let exitTimer = 0;
let killTimer = 0;

/** Enter + hold before the bow-out begins — brief; the halls await. */
const HOLD_MS = 2600;
/** The bow-out itself (matches the lvl-exit keyframes it borrows). */
const EXIT_MS = 650;

export function showDungeonEntry(o: {
  name: string;
  sigil: string;
  tier: string;
  theme: string;
  power: number;
}): void {
  dismissDungeonEntry();

  const tint = (isRarityTier(o.tier) ? RARITY_COLORS[o.tier] : null) ?? 'var(--gold)';

  const el = document.createElement('div');
  el.id = 'dungeon-stage';
  el.style.setProperty('--rift-accent', tint);

  const card = document.createElement('div');
  card.className = 'rift-card';

  // The key's plaque: the thing that brought you, ringed in its tier.
  const plaque = document.createElement('div');
  plaque.className = 'rift-plaque';
  const img = document.createElement('img');
  img.src = itemIconUrl('dungeon_key', 64);
  img.draggable = false;
  plaque.appendChild(img);
  card.appendChild(plaque);

  const text = document.createElement('div');
  text.className = 'rift-text';
  const kicker = document.createElement('div');
  kicker.className = 'rift-kicker';
  kicker.textContent = `${o.tier} ${o.theme}`;
  kicker.style.color = tint;
  const name = document.createElement('div');
  name.className = 'rift-title';
  name.textContent = o.name;
  const sub = document.createElement('div');
  sub.className = 'rift-fact';
  sub.textContent = `sigil ${o.sigil} · power ${o.power}`;
  text.append(kicker, name, sub);
  card.appendChild(text);

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

/** Clear any showing banner (a fresh crossing restarts the show). */
export function dismissDungeonEntry(): void {
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
