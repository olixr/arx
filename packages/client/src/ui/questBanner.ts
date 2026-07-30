import { itemDef } from '@arx/content';
import type { QuestRewardsWire } from '@arx/shared';
import { dockGlyphUrl, itemIconUrl } from '../render/icons.js';

/**
 * THE QUEST CEREMONIES — "you swore it" and "you saw it through."
 *
 * Accepted: a quiet card (no rays) a size under the discovery splash —
 * swearing an errand is a beginning, not a triumph. Completed: the
 * level-up tier with the wheeling rays and the pay laid out in chips —
 * finishing IS a feat. Both are toasts, not screens (pointer-events
 * none, own chrome copy — never .ui-tray, that class doubles as the
 * input gate), and both fire ONLY on a live S2CQuestEvent.
 */
let stage: HTMLElement | null = null;
let exitTimer = 0;
let killTimer = 0;

const HOLD_ACCEPT_MS = 2400;
const HOLD_COMPLETE_MS = 4400;
const EXIT_MS = 650;

function sigilUrl(): string {
  return dockGlyphUrl('quest', 72);
}

export function showQuestBanner(
  kind: 'accepted' | 'completed',
  name: string,
  rewards?: QuestRewardsWire,
): void {
  dismissQuestBanner();
  const completed = kind === 'completed';

  const el = document.createElement('div');
  el.id = 'quest-stage';
  el.style.setProperty('--quest-accent', completed ? '#f2c94c' : '#d8c08c');

  if (completed) {
    const rays = document.createElement('div');
    rays.className = 'disc-rays';
    el.appendChild(rays);
  }

  const card = document.createElement('div');
  card.className = 'rift-card quest-card';

  const plaque = document.createElement('div');
  plaque.className = 'rift-plaque';
  const img = document.createElement('img');
  img.src = sigilUrl();
  img.draggable = false;
  plaque.appendChild(img);
  card.appendChild(plaque);

  const text = document.createElement('div');
  text.className = 'rift-text';
  const kicker = document.createElement('div');
  kicker.className = 'rift-kicker quest-kicker';
  kicker.textContent = completed ? 'Quest complete' : 'Quest accepted';
  const title = document.createElement('div');
  title.className = 'rift-title';
  title.textContent = name;
  text.append(kicker, title);

  // The pay, laid out in chips — completion only; an accepted quest
  // keeps its promise in the journal, not on the marquee.
  if (completed && rewards) {
    const row = document.createElement('div');
    row.className = 'quest-reward-row';
    const chip = (iconUrl: string | null, label: string): void => {
      const c = document.createElement('span');
      c.className = 'quest-reward-chip';
      if (iconUrl) {
        const i = document.createElement('img');
        i.src = iconUrl;
        i.draggable = false;
        c.appendChild(i);
      }
      const s = document.createElement('span');
      s.textContent = label;
      c.appendChild(s);
      row.appendChild(c);
    };
    if (rewards.coins) chip(itemIconUrl('coins', 28), `${rewards.coins}`);
    for (const e of rewards.items ?? []) {
      chip(itemIconUrl(e.item, 28), e.qty > 1 ? `${itemDef(e.item)?.name ?? e.item} × ${e.qty}` : itemDef(e.item)?.name ?? e.item);
    }
    for (const e of rewards.xp ?? []) chip(null, `+${e.amount} ${e.skill} xp`);
    text.appendChild(row);
  } else {
    const sub = document.createElement('div');
    sub.className = 'rift-fact';
    sub.textContent = completed ? '' : 'The details are in your journal.';
    text.appendChild(sub);
  }
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
  }, completed ? HOLD_COMPLETE_MS : HOLD_ACCEPT_MS);
}

export function dismissQuestBanner(): void {
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
