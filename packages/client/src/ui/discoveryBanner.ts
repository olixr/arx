/**
 * THE DISCOVERY CEREMONY — "you found a place worth naming."
 *
 * A chrome tray slams in top-center under slow-wheeling gold rays:
 * DISCOVERED as the kicker, the place's name huge in serif, its kind
 * beneath, the ledger sigil on a socket plaque. A toast, not a screen
 * (pointer-events none, own chrome copy — never .ui-tray, that class
 * doubles as the input gate). Fires ONLY on a live S2CDiscovery — the
 * server sends one per place per lifetime, so suppression is
 * structural. Dungeon-kind entries never splash here: the riftgate's
 * threshold banner is their ceremony.
 */
import type { DiscoveryWire } from '@arx/shared';
import { drawDiscoveryMarker } from './map/markers.js';

let stage: HTMLElement | null = null;
let exitTimer = 0;
let killTimer = 0;

/** Longer than the dungeon threshold (2600), shy of the level-up (4700). */
const HOLD_MS = 3400;
const EXIT_MS = 650;

const KIND_WORD: Record<DiscoveryWire['kind'], string> = {
  town: 'A settlement stands here',
  poi: 'A place of note',
  dungeon: 'A delve mouth',
  landmark: 'A landmark of the wilds',
};

const KIND_ACCENT: Record<DiscoveryWire['kind'], string> = {
  town: '#f2c94c',
  poi: '#d9b06c',
  dungeon: '#7ec8e3',
  landmark: '#a8c8a0',
};

function sigilUrl(d: DiscoveryWire): string {
  const S = 96;
  const cnv = document.createElement('canvas');
  cnv.width = S;
  cnv.height = S;
  const ctx = cnv.getContext('2d')!;
  drawDiscoveryMarker(ctx, { ...d, faded: undefined }, S / 2, S / 2, S * 0.34);
  return cnv.toDataURL();
}

export function showDiscovery(d: DiscoveryWire): void {
  dismissDiscovery();
  const accent = KIND_ACCENT[d.kind];

  const el = document.createElement('div');
  el.id = 'discovery-stage';
  el.style.setProperty('--disc-accent', accent);

  // The slow gold rays behind the card — the level-toast's wheel, a
  // size down (CSS-only; compositor transforms).
  const rays = document.createElement('div');
  rays.className = 'disc-rays';
  el.appendChild(rays);

  const card = document.createElement('div');
  card.className = 'rift-card disc-card';

  const plaque = document.createElement('div');
  plaque.className = 'rift-plaque';
  const img = document.createElement('img');
  img.src = sigilUrl(d);
  img.draggable = false;
  plaque.appendChild(img);
  card.appendChild(plaque);

  const text = document.createElement('div');
  text.className = 'rift-text';
  const kicker = document.createElement('div');
  kicker.className = 'rift-kicker disc-kicker';
  kicker.textContent = 'Discovered';
  const name = document.createElement('div');
  name.className = 'rift-title';
  name.textContent = d.name;
  const sub = document.createElement('div');
  sub.className = 'rift-fact';
  sub.textContent = d.tier !== undefined ? `${KIND_WORD[d.kind]} · tier ${d.tier}` : KIND_WORD[d.kind];
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

export function dismissDiscovery(): void {
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
