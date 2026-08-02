/**
 * The one panel system. Every menu in the game — pack, skills, craft,
 * bank, shop, build, loot, sound, and every dialog still to come — is
 * dressed by `dressPanel`, so they all share one anatomy:
 *
 *   ┌─ head ─────────────────────────────┐
 *   │ [icon plaque]  TITLE        [✕]    │
 *   │ hint — one quiet line of guidance  │
 *   ├─ body (the caller's own content) ──┤
 *
 * Laws:
 * - ONE ANATOMY, MANY FACES. A panel differs by icon, title and body —
 *   never by structure. New UI = new body, everything else is free.
 * - EVERY PANEL TEACHES ITSELF. The hint line states the panel's core
 *   gesture in one sentence; device-specific verbs live in the pad
 *   action strip, so hints stay device-neutral.
 * - PAD-FIRST. The close chip is a `[data-nav]` stop like everything
 *   else; helpers stamp nav keys on whatever they build.
 *
 * The helpers below (`bigButton`, `iconTile`, `needChip`, `meter`) are
 * the shared vocabulary of the redesigned menus — flat vector pieces
 * sized for a couch and a controller.
 */

import { attachAmbient } from './kit/ambient.js';

/** Dress a panel: icon plaque + existing h3 title + hint + close chip. */
export function dressPanel(
  panel: HTMLElement,
  opts: { icon?: string; hint?: string; onClose?: () => void },
): { setHint: (text: string) => void; setIcon: (url: string) => void } {
  // THE ROOM BREATHES: every dressed screen carries the ambient ember
  // layer behind its content — a whisper, gated by Interface motion.
  attachAmbient(panel);
  const h3 = panel.querySelector('h3');
  const head = document.createElement('div');
  head.className = 'panel-head';
  if (h3) panel.insertBefore(head, h3);

  let plaque: HTMLImageElement | null = null;
  if (opts.icon) {
    const wrap = document.createElement('span');
    wrap.className = 'panel-icon';
    plaque = document.createElement('img');
    plaque.src = opts.icon;
    plaque.draggable = false;
    wrap.appendChild(plaque);
    head.appendChild(wrap);
  }
  if (h3) head.appendChild(h3);

  if (opts.onClose) {
    const btn = document.createElement('button');
    btn.className = 'panel-close';
    btn.textContent = '✕';
    btn.title = 'Close (Esc)';
    btn.dataset.nav = '';
    btn.dataset.navkey = `close:${panel.id}`;
    btn.dataset.acta = 'Close';
    btn.addEventListener('click', () => opts.onClose!());
    head.appendChild(btn);
  }

  const hint = document.createElement('div');
  hint.className = 'panel-hint';
  if (opts.hint) hint.textContent = opts.hint;
  else hint.classList.add('hidden');
  head.insertAdjacentElement('afterend', hint);

  return {
    setHint: (text: string) => {
      hint.textContent = text;
      hint.classList.toggle('hidden', text === '');
    },
    setIcon: (url: string) => {
      if (plaque) plaque.src = url;
    },
  };
}

/** A primary action button — flat gold, couch-sized, pad-navigable. */
export function bigButton(
  label: string,
  navkey: string,
  onClick: () => void,
  opts: { acta?: string; minor?: boolean } = {},
): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.className = opts.minor ? 'act-btn minor' : 'act-btn';
  btn.textContent = label;
  btn.dataset.nav = '';
  btn.dataset.navkey = navkey;
  btn.dataset.acta = opts.acta ?? label;
  btn.addEventListener('click', onClick);
  return btn;
}

/** A framed icon well — the standard item/recipe portrait. An empty
 * url leaves the img unset for a caller filling it through the
 * budgeted icon lane (an empty-string src would resolve to the page
 * URL and flash a broken-image glyph). */
export function iconTile(url: string, cls = ''): HTMLElement {
  const tile = document.createElement('div');
  tile.className = `icon-tile ${cls}`.trim();
  const img = document.createElement('img');
  if (url !== '') img.src = url;
  img.draggable = false;
  tile.appendChild(img);
  return tile;
}

/**
 * A requirement chip: icon + "have/need" count, green when satisfied,
 * ember-red when short — the maker menus' whole material story.
 */
export function needChip(iconUrl: string, have: number, need: number, title: string): HTMLElement {
  const chip = document.createElement('span');
  chip.className = have >= need ? 'need-chip ok' : 'need-chip short';
  chip.title = title;
  const img = document.createElement('img');
  img.src = iconUrl;
  img.draggable = false;
  const count = document.createElement('span');
  count.textContent = need > 1 || have < need ? `${Math.min(have, 999)}/${need}` : `${need}`;
  chip.append(img, count);
  return chip;
}

/** A flat progress meter with a hard leading edge. Returns the fill. */
export function meter(frac: number, cls = ''): { root: HTMLElement; fill: HTMLElement } {
  const root = document.createElement('div');
  root.className = `ui-meter ${cls}`.trim();
  const fill = document.createElement('div');
  fill.className = 'ui-meter-fill';
  fill.style.width = `${Math.round(Math.max(0, Math.min(1, frac)) * 100)}%`;
  root.appendChild(fill);
  return { root, fill };
}

/** A small flat level-requirement badge ("lvl 30 smithing"). */
export function levelBadge(level: number, skill: string, met: boolean): HTMLElement {
  const b = document.createElement('span');
  b.className = met ? 'lvl-badge' : 'lvl-badge unmet';
  b.textContent = `lvl ${level} ${skill}`;
  return b;
}

/**
 * A section headline inside a screen body: small serif capitals riding
 * a ruled line — the way the hall names its wings.
 */
export function sectionHead(label: string): HTMLElement {
  const head = document.createElement('div');
  head.className = 'screen-section';
  const text = document.createElement('span');
  text.textContent = label;
  head.appendChild(text);
  return head;
}

/**
 * A stat plaque: one number told big, its meaning under it — the
 * ledger language of the character screen. `tone` tints the value.
 */
export function statPlaque(value: string, label: string, tone?: string): HTMLElement {
  const p = document.createElement('div');
  p.className = 'stat-plaque';
  const v = document.createElement('div');
  v.className = 'stat-plaque-value';
  v.textContent = value;
  if (tone) v.style.color = tone;
  const l = document.createElement('div');
  l.className = 'stat-plaque-label';
  l.textContent = label;
  p.append(v, l);
  return p;
}
