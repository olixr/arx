/**
 * THE DOCK'S ROSTER — the one table behind the screen rail: button id,
 * glyph, tooltip, rebindable action, and the screen it toggles. The
 * badge renderer reads the live keymap so a rebind reteaches every key.
 * Moved verbatim from main.ts (foundations F5.1).
 */
import { bindings } from '../input/bindings.js';
import { dockGlyphUrl } from '../render/icons.js';

export const DOCK_BUTTONS = [
  ['btn-inventory', 'pack', 'Pack', 'screenPack', 'inv'],
  ['btn-skills', 'skills', 'Skills', 'screenSkills', 'skills'],
  ['btn-arts', 'arts', 'Techniques', 'screenArts', 'arts'],
  ['btn-beasts', 'beast', 'Beasts', 'screenBeasts', 'beasts'],
  ['btn-companions', 'companion', 'Companions', 'screenCompanions', 'companions'],
  ['btn-craft', 'handiwork', 'Handiwork', 'screenCraft', 'craft'],
  ['btn-build', 'build', 'Build', 'screenBuild', 'build'],
  ['btn-social', 'social', 'Social', 'screenSocial', 'social'],
  ['btn-quests', 'quest', 'Journal', 'screenQuests', 'quests'],
  ['btn-rep', 'rep', 'Standing', 'screenRep', 'rep'],
  ['btn-keys', 'keys', 'Key Ring', 'screenKeys', 'keys'],
  ['btn-map', 'map', 'Map', 'screenMap', 'map'],
  ['btn-audio', 'sound', 'Settings', 'screenSettings', 'audio'],
] as const;

/* THE RAIL RESTS QUIET: the keys wear no permanent shortcut chips —
   eleven overhanging tokens were most of the old keypad's noise. The
   binding lives in the one tooltip instead (tipname + tipsub), read
   LIVE from the keymap so a rebind in Controls reteaches every key. */
export function renderDockBadges(): void {
  for (const [id, , tip, action] of DOCK_BUTTONS) {
    const btn = document.getElementById(id);
    if (!btn) continue;
    // The tooltip carries the name; a native title would double it.
    btn.removeAttribute('title');
    btn.setAttribute('aria-label', tip);
    const kbKey = bindings.kbBadge(action);
    btn.dataset.tipsub = kbKey ? `Press ${kbKey}` : '';
  }
}

export function initDock(): void {
  for (const [id, kind, tip] of [
  ...DOCK_BUTTONS.map(([i, k, t]) => [i, k, t] as const),
  ['touch-attack', 'attack', ''] as const,
]) {
  const btn = document.getElementById(id);
  if (btn) {
    const img = document.createElement('img');
    // Painted at double the resting display size so the sigils stay
    // crisp under the root scale's 4K stretch.
    img.src = dockGlyphUrl(kind, 48);
    img.draggable = false;
    btn.appendChild(img);
    if (tip) {
      btn.dataset.nav = '';
      btn.dataset.navkey = `dock:${id}`;
      btn.dataset.tipname = tip;
      btn.dataset.acta = 'Open';
    }
  }
}
  renderDockBadges();
  bindings.onChange(renderDockBadges);
}

